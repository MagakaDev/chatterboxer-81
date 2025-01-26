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

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;

    const initializeMap = async (center: [number, number] = [2.3522, 48.8566]) => {
      try {
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: center,
          zoom: 13
        });

        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

        // Wait for map to load before getting location
        map.current.on('load', () => {
          getCurrentLocation();
        });

        return () => {
          if (marker.current) {
            marker.current.remove();
          }
          map.current?.remove();
        };
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
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            setUserLocation({ lat: latitude, lng: longitude });

            if (!map.current) return;

            try {
              map.current.flyTo({
                center: [longitude, latitude],
                zoom: 14,
                essential: true
              });

              if (marker.current) {
                marker.current.remove();
              }

              marker.current = new mapboxgl.Marker({
                color: '#10B981',
                draggable: true
              })
                .setLngLat([longitude, latitude])
                .addTo(map.current);

              marker.current.on('dragend', () => {
                const lngLat = marker.current?.getLngLat();
                if (lngLat && onLocationSelect) {
                  onLocationSelect({ lat: lngLat.lat, lng: lngLat.lng });
                }
              });

              new mapboxgl.Popup({ closeButton: false })
                .setLngLat([longitude, latitude])
                .setHTML('<h3 class="text-sm font-semibold">Vous êtes ici</h3>')
                .addTo(map.current);

              if (onLocationSelect) {
                onLocationSelect({ lat: latitude, lng: longitude });
              }

              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                await supabase
                  .from('users')
                  .update({
                    location: `POINT(${longitude} ${latitude})`
                  })
                  .eq('id', user.id);
              }
            } catch (error) {
              console.error('Error updating map:', error);
              toast({
                title: "Erreur",
                description: "Impossible de mettre à jour la carte",
                variant: "destructive"
              });
            }
          },
          (error) => {
            console.error('Geolocation error:', error);
            toast({
              title: "Erreur de géolocalisation",
              description: "Veuillez autoriser l'accès à votre position",
              variant: "destructive"
            });
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      }
    };

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