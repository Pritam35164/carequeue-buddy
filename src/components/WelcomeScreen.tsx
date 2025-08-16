import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Clock, Users, Heart } from "lucide-react";

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

export const WelcomeScreen = ({ onGetStarted }: WelcomeScreenProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Heart className="h-8 w-8 text-primary mr-2" />
            <h1 className="text-4xl font-bold text-foreground">CareQueue</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Real-time clinic queue management for patients and healthcare providers
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="text-center">
            <CardHeader>
              <MapPin className="h-12 w-12 text-primary mx-auto mb-2" />
              <CardTitle>Find Nearby Clinics</CardTitle>
              <CardDescription>
                Discover clinics near you with real-time availability
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Clock className="h-12 w-12 text-secondary mx-auto mb-2" />
              <CardTitle>Live Wait Times</CardTitle>
              <CardDescription>
                See current queue status and estimated wait times
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Users className="h-12 w-12 text-primary mx-auto mb-2" />
              <CardTitle>Smart Queue System</CardTitle>
              <CardDescription>
                Join queues digitally and get notified when it's your turn
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Main CTA */}
        <div className="text-center">
          <Card className="max-w-lg mx-auto">
            <CardHeader>
              <CardTitle>Ready to get started?</CardTitle>
              <CardDescription>
                Join thousands of patients already using CareQueue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={onGetStarted}
                size="lg" 
                className="w-full"
              >
                Get Started
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};