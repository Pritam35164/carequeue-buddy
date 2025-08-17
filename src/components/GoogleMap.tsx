import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

// Declare global google types
declare global {
  interface Window {
    google: typeof google;
  }
}

interface GoogleMapProps {
  center?: google.maps.LatLngLiteral;
  zoom?: number;
  onMapLoad?: (map: google.maps.Map) => void;
  className?: string;
}

const GOOGLE_MAPS_API_KEY = 'AIzaSyCBD4KiuDP6Dj6n7Z_fMtGNcEsSYzA2KnQ';

export const GoogleMap = ({ 
  center = { lat: 19.0760, lng: 72.8777 }, // Default to Mumbai, India
  zoom = 13,
  onMapLoad,
  className = "w-full h-96"
}: GoogleMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initMap = async () => {
      try {
        const loader = new Loader({
          apiKey: GOOGLE_MAPS_API_KEY,
          version: 'weekly',
          libraries: ['places', 'geometry']
        });

        await loader.load();

        if (!mapRef.current) return;

        const mapInstance = new google.maps.Map(mapRef.current, {
          center,
          zoom,
          styles: [
            {
              featureType: 'poi.medical',
              elementType: 'geometry.fill',
              stylers: [{ color: '#4ade80' }] // Green for medical POIs
            },
            {
              featureType: 'poi.medical',
              elementType: 'labels.text.fill',
              stylers: [{ color: '#15803d' }]
            }
          ]
        });

        setMap(mapInstance);
        onMapLoad?.(mapInstance);
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading Google Maps:', err);
        setError('Failed to load Google Maps');
        setIsLoading(false);
      }
    };

    initMap();
  }, [center.lat, center.lng, zoom, onMapLoad]);

  if (error) {
    return (
      <div className={`${className} flex items-center justify-center bg-muted rounded-lg`}>
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className={`${className} relative`}>
      <div ref={mapRef} className="w-full h-full rounded-lg" />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}
    </div>
  );
};