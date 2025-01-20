import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Temporary token - should be moved to environment variables
mapboxgl.accessToken = 'pk.eyJ1IjoibG92YWJsZSIsImEiOiJjbHRqbXBxYmowMDFqMmlvNjZ5ZWV1ZnZqIn0.a4WBZ2bmxwBqCuJHQoVwkg';

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

    // Initialize map with default location (Paris) in case geolocation fails
    if (!map.current) {
      console.log('Initializing map with default location');
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [2.3522, 48.8566], // Paris coordinates
        zoom: 13
      });

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    }

    const getCurrentLocation = () => {
      if ("geolocation" in navigator) {
        console.log('Requesting user location...');
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            console.log('Got user location:', position);
            const { latitude, longitude } = position.coords;
            setUserLocation({ lat: latitude, lng: longitude });

            if (!map.current) return;

            // Update map center
            map.current.flyTo({
              center: [longitude, latitude],
              zoom: 14
            });

            // Update or create marker
            if (marker.current) {
              marker.current.setLngLat([longitude, latitude]);
            } else {
              marker.current = new mapboxgl.Marker({ color: '#10B981' })
                .setLngLat([longitude, latitude])
                .addTo(map.current);
            }

            // Add or update popup
            new mapboxgl.Popup()
              .setLngLat([longitude, latitude])
              .setHTML('<h3 class="text-sm font-semibold">Vous êtes ici</h3>')
              .addTo(map.current);

            // Update user's location in Supabase
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                const { error } = await supabase
                  .from('users')
                  .update({
                    location: `POINT(${longitude} ${latitude})`
                  } as { location: string })
                  .eq('id', user.id);

                if (error) {
                  console.error('Error updating location:', error);
                  toast({
                    title: "Erreur",
                    description: "Impossible de mettre à jour votre position",
                    variant: "destructive"
                  });
                }
              }
            } catch (error) {
              console.error('Error updating user location:', error);
            }

            // Notify parent component
            if (onLocationSelect) {
              onLocationSelect({ lat: latitude, lng: longitude });
            }
          },
          (error) => {
            console.error('Geolocation error:', error);
            toast({
              title: "Erreur de géolocalisation",
              description: "Impossible d'obtenir votre position. Veuillez autoriser l'accès à votre position dans les paramètres de votre navigateur.",
              variant: "destructive"
            });
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
      }
    };

    getCurrentLocation();

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [onLocationSelect, toast]);

  return (
    <div className="relative w-full h-[500px] rounded-lg overflow-hidden">
      <div ref={mapContainer} className="absolute inset-0 border border-gray-200 shadow-lg" />
    </div>
  );
};

export default LocationMap;