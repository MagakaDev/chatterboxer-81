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
    if (!mapContainer.current) return;

    const getCurrentLocation = () => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            setUserLocation({ lat: latitude, lng: longitude });

            // Update user's location in Supabase
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              const { error } = await supabase
                .from('users')
                .update({
                  location: `POINT(${longitude} ${latitude})`
                })
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

            // Initialize map with user's location
            if (!map.current) {
              map.current = new mapboxgl.Map({
                container: mapContainer.current,
                style: 'mapbox://styles/mapbox/streets-v12',
                center: [longitude, latitude],
                zoom: 13
              });

              // Add navigation controls
              map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

              // Add user marker
              marker.current = new mapboxgl.Marker({ color: '#10B981' })
                .setLngLat([longitude, latitude])
                .addTo(map.current);

              // Add popup to show "You are here"
              new mapboxgl.Popup()
                .setLngLat([longitude, latitude])
                .setHTML('<h3>Vous êtes ici</h3>')
                .addTo(map.current);

              // Notify parent component
              if (onLocationSelect) {
                onLocationSelect({ lat: latitude, lng: longitude });
              }
            }
          },
          (error) => {
            console.error('Geolocation error:', error);
            toast({
              title: "Erreur de géolocalisation",
              description: "Impossible d'obtenir votre position. " + error.message,
              variant: "destructive"
            });
          },
          {
            enableHighAccuracy: true,
            timeout: 5000,
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

    getCurrentLocation();

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [onLocationSelect, toast]);

  return (
    <div className="w-full h-[400px] rounded-lg overflow-hidden shadow-lg">
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
};

export default LocationMap;