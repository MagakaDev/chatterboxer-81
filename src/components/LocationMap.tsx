import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

mapboxgl.accessToken = 'pk.eyJ1IjoiaG9jaW5lbWFnIiwiYSI6ImNtNmN3NG0wdDBvYzAybXNvYTI2MTgxZngifQ.VZcZH5qPmzy3YlzrPdii6w';

interface LocationMapProps {
  onLocationSelect?: (location: { lat: number; lng: number }) => void;
}

const LocationMap = ({ onLocationSelect }: LocationMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const { toast } = useToast();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!mapContainer.current) {
      console.error('Map container not found');
      return;
    }

    const initializeMap = (center: [number, number] = [2.3522, 48.8566]) => {
      try {
        if (!map.current) {
          console.log('Initializing map with location:', center);
          map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: center,
            zoom: 13,
            attributionControl: true
          });

          map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
          
          map.current.on('error', (e) => {
            console.error('Map error:', e);
            toast({
              title: "Erreur de chargement de la carte",
              description: "Impossible de charger la carte. Veuillez réessayer plus tard.",
              variant: "destructive"
            });
          });
        }
      } catch (error) {
        console.error('Error initializing map:', error);
        toast({
          title: "Erreur",
          description: "Impossible d'initialiser la carte",
          variant: "destructive"
        });
      }
    };

    const getCurrentLocation = () => {
      if ("geolocation" in navigator) {
        console.log('Requesting user location...');
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            console.log('Got user location:', position);
            const { latitude, longitude } = position.coords;
            setUserLocation({ lat: latitude, lng: longitude });

            if (!map.current) {
              initializeMap([longitude, latitude]);
              return;
            }

            try {
              map.current.flyTo({
                center: [longitude, latitude],
                zoom: 14,
                essential: true
              });

              if (marker.current) {
                marker.current.remove();
              }
              
              marker.current = new mapboxgl.Marker({ color: '#10B981', draggable: true })
                .setLngLat([longitude, latitude])
                .addTo(map.current);

              marker.current.on('dragend', () => {
                const lngLat = marker.current?.getLngLat();
                if (lngLat && onLocationSelect) {
                  onLocationSelect({ lat: lngLat.lat, lng: lngLat.lng });
                }
              });

              const popup = new mapboxgl.Popup({ closeButton: false })
                .setLngLat([longitude, latitude])
                .setHTML('<h3 class="text-sm font-semibold">Vous êtes ici</h3>')
                .addTo(map.current);

              if (onLocationSelect) {
                onLocationSelect({ lat: latitude, lng: longitude });
              }

              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                const { error: updateError } = await supabase
                  .from('users')
                  .update({
                    location: `POINT(${longitude} ${latitude})`
                  })
                  .eq('id', user.id);

                if (updateError) {
                  console.error('Error updating location:', updateError);
                  toast({
                    title: "Erreur",
                    description: "Impossible de mettre à jour votre position",
                    variant: "destructive"
                  });
                }
              }
            } catch (error) {
              console.error('Error updating map with user location:', error);
              toast({
                title: "Erreur",
                description: "Impossible de mettre à jour la carte avec votre position",
                variant: "destructive"
              });
            }
          },
          (error) => {
            console.error('Geolocation error:', error);
            toast({
              title: "Erreur de géolocalisation",
              description: "Impossible d'obtenir votre position. Veuillez autoriser l'accès à votre position dans les paramètres de votre navigateur.",
              variant: "destructive"
            });
            initializeMap();
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      } else {
        console.error('Geolocation not supported');
        toast({
          title: "Erreur",
          description: "La géolocalisation n'est pas supportée par votre navigateur",
          variant: "destructive"
        });
        initializeMap();
      }
    };

    map.current?.on('load', () => {
      getCurrentLocation();
    });

    initializeMap();

    return () => {
      if (marker.current) {
        marker.current.remove();
      }
      if (map.current) {
        map.current.remove();
      }
    };
  }, [onLocationSelect, toast]);

  return (
    <div className="relative w-full h-[500px] overflow-hidden rounded-lg border border-border shadow-sm">
      <div ref={mapContainer} className="absolute inset-0" />
    </div>
  );
};

export default LocationMap;