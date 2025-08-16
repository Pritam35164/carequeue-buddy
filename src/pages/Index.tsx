import { useState } from "react";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { GoogleMap } from "@/components/GoogleMap";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

const Index = () => {
  const [showMap, setShowMap] = useState(false);

  if (!showMap) {
    return <WelcomeScreen onGetStarted={() => setShowMap(true)} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="ghost" 
            onClick={() => setShowMap(false)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Find Clinics Near You</h1>
          <div></div> {/* Spacer */}
        </div>

        {/* Map Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Nearby Clinics</CardTitle>
          </CardHeader>
          <CardContent>
            <GoogleMap 
              className="w-full h-96"
              onMapLoad={(map) => {
                // Add sample clinic markers
                new google.maps.Marker({
                  position: { lat: 40.7128, lng: -74.0060 },
                  map,
                  title: "City Health Clinic",
                  icon: {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M9 11V9a3 3 0 0 1 6 0v2"/>
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 2v20"/>
                        <path d="M2 12h20"/>
                      </svg>
                    `),
                    scaledSize: new google.maps.Size(32, 32)
                  }
                });
              }}
            />
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">12</div>
              <div className="text-sm text-muted-foreground">Clinics Found</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-secondary">8</div>
              <div className="text-sm text-muted-foreground">Available Now</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">~15min</div>
              <div className="text-sm text-muted-foreground">Avg Wait Time</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
