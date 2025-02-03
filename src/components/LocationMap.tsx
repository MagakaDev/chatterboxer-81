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
  const popup = useRef<mapboxgl.Popup | null>(null);
  const { toast } = useToast();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const mountedRef = useRef(true);

  // Cleanup effect
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (marker.current) {
        marker.current.remove();
      }
      if (popup.current) {
        popup.current.remove();
      }
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    const initializeMap = async (center: [number, number] = [2.3522, 48.8566]) => {
      if (!mapContainer.current || !mountedRef.current) return;

      try {
        if (map.current) {
          map.current.remove();
        }

        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: center,
          zoom: 13
        });

        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

        map.current.on('load', () => {
          if (mountedRef.current) {
            getCurrentLocation();
          }
        });
      } catch (error) {
        console.error('Error initializing map:', error);
        if (mountedRef.current) {
          toast({
            title: "Erreur",
            description: "Impossible d'initialiser la carte",
            variant: "destructive"
          });
        }
      }
    };

    const handleGeolocationError = (error: GeolocationPositionError) => {
      console.error('Geolocation error:', error);
      let errorMessage = "Une erreur est survenue lors de la géolocalisation";
      
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = "Veuillez autoriser l'accès à votre position dans les paramètres de votre navigateur";
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = "Votre position est actuellement indisponible";
          break;
        case error.TIMEOUT:
          errorMessage = "La demande de géolocalisation a expiré";
          break;
      }
      
      if (mountedRef.current) {
        toast({
          title: "Erreur de géolocalisation",
          description: errorMessage,
          variant: "destructive"
        });
      }
    };

    const getCurrentLocation = () => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            if (!mountedRef.current || !map.current) return;

            const { latitude, longitude } = position.coords;
            setUserLocation({ lat: latitude, lng: longitude });

            try {
              map.current.flyTo({
                center: [longitude, latitude],
                zoom: 14,
                essential: true
              });

              if (marker.current) {
                marker.current.remove();
              }
              if (popup.current) {
                popup.current.remove();
              }

              marker.current = new mapboxgl.Marker({
                color: '#10B981',
                draggable: true
              })
                .setLngLat([longitude, latitude])
                .addTo(map.current);

              marker.current.on('dragend', () => {
                if (!mountedRef.current) return;
                const lngLat = marker.current?.getLngLat();
                if (lngLat && onLocationSelect) {
                  onLocationSelect({ lat: lngLat.lat, lng: lngLat.lng });
                }
              });

              popup.current = new mapboxgl.Popup({ closeButton: false })
                .setLngLat([longitude, latitude])
                .setHTML('<h3 class="text-sm font-semibold">Vous êtes ici</h3>')
                .addTo(map.current);

              if (onLocationSelect) {
                onLocationSelect({ lat: latitude, lng: longitude });
              }

              const { data: { user } } = await supabase.auth.getUser();
              if (user && mountedRef.current) {
                await supabase
                  .from('users')
                  .update({
                    location: `POINT(${longitude} ${latitude})`
                  })
                  .eq('id', user.id);

                toast({
                  title: "Succès",
                  description: "Votre position a été mise à jour avec succès",
                });
              }
            } catch (error) {
              console.error('Error updating map:', error);
              if (mountedRef.current) {
                toast({
                  title: "Erreur",
                  description: "Impossible de mettre à jour la carte",
                  variant: "destructive"
                });
              }
            }
          },
          handleGeolocationError,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      } else {
        toast({
          title: "Erreur",
          description: "La géolocalisation n'est pas supportée par votre navigateur",
          variant: "destructive"
        });
      }
    };

    initializeMap();
  }, [onLocationSelect, toast]);

  return (
    <div className="relative w-full h-[500px] overflow-hidden rounded-lg border border-border shadow-sm">
      <div ref={mapContainer} className="absolute inset-0" />
    </div>
  );
};

export default LocationMap;