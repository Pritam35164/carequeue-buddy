import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { GoogleMap } from "@/components/GoogleMap";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Clock, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Clinic {
  id?: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  specialties: string[];
  average_wait_time: number;
}

export const ClinicSetup = () => {
  const { profile } = useAuth();
  const [clinic, setClinic] = useState<Clinic>({
    name: "",
    address: "",
    latitude: 40.7128,
    longitude: -74.0060,
    phone: "",
    specialties: [],
    average_wait_time: 15
  });
  const [newSpecialty, setNewSpecialty] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchClinic();
  }, []);

  const fetchClinic = async () => {
    const { data } = await supabase
      .from('clinics')
      .select('*')
      .eq('admin_id', profile?.id)
      .single();
    
    if (data) {
      setClinic(data);
    }
    setLoading(false);
  };

  const handleMapLoad = (map: google.maps.Map) => {
    setMapLoaded(true);
    
    // Add click listener to set clinic location
    map.addListener('click', async (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        
        // Use reverse geocoding to get address
        const geocoder = new google.maps.Geocoder();
        try {
          const response = await geocoder.geocode({ location: { lat, lng } });
          if (response.results[0]) {
            setClinic(prev => ({
              ...prev,
              latitude: lat,
              longitude: lng,
              address: response.results[0].formatted_address
            }));
          }
        } catch (error) {
          console.error('Geocoding error:', error);
          setClinic(prev => ({
            ...prev,
            latitude: lat,
            longitude: lng
          }));
        }
      }
    });

    // Add marker for current clinic location
    if (clinic.latitude && clinic.longitude) {
      new google.maps.Marker({
        position: { lat: clinic.latitude, lng: clinic.longitude },
        map,
        title: clinic.name || "Clinic Location",
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          `)}`,
          scaledSize: new google.maps.Size(32, 32)
        }
      });
    }
  };

  const addSpecialty = () => {
    if (newSpecialty.trim() && !clinic.specialties.includes(newSpecialty.trim())) {
      setClinic(prev => ({
        ...prev,
        specialties: [...prev.specialties, newSpecialty.trim()]
      }));
      setNewSpecialty("");
    }
  };

  const removeSpecialty = (specialty: string) => {
    setClinic(prev => ({
      ...prev,
      specialties: prev.specialties.filter(s => s !== specialty)
    }));
  };

  const saveClinic = async () => {
    if (!clinic.name || !clinic.address) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill in clinic name and address"
      });
      return;
    }

    setSaving(true);
    
    const clinicData = {
      ...clinic,
      admin_id: profile?.id
    };

    let error;
    if (clinic.id) {
      // Update existing clinic
      const result = await supabase
        .from('clinics')
        .update(clinicData)
        .eq('id', clinic.id);
      error = result.error;
    } else {
      // Create new clinic
      const result = await supabase
        .from('clinics')
        .insert(clinicData);
      error = result.error;
    }

    if (error) {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: error.message
      });
    } else {
      toast({
        title: "Clinic Saved",
        description: "Your clinic information has been updated successfully"
      });
      fetchClinic(); // Refresh data
    }
    
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">
            {clinic.id ? 'Update Clinic Information' : 'Set Up Your Clinic'}
          </h1>
          <p className="text-muted-foreground">
            Configure your clinic details and location
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Clinic Information Form */}
          <Card>
            <CardHeader>
              <CardTitle>Clinic Details</CardTitle>
              <CardDescription>Enter your clinic information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Clinic Name</label>
                <Input
                  placeholder="Enter clinic name"
                  value={clinic.name}
                  onChange={(e) => setClinic(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Address</label>
                <Textarea
                  placeholder="Enter clinic address"
                  value={clinic.address}
                  onChange={(e) => setClinic(prev => ({ ...prev, address: e.target.value }))}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Click on the map to set the exact location
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Phone Number</label>
                <Input
                  placeholder="Enter phone number"
                  value={clinic.phone}
                  onChange={(e) => setClinic(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Average Wait Time (minutes)</label>
                <Input
                  type="number"
                  placeholder="15"
                  value={clinic.average_wait_time}
                  onChange={(e) => setClinic(prev => ({ ...prev, average_wait_time: parseInt(e.target.value) || 15 }))}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Specialties</label>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Add specialty"
                    value={newSpecialty}
                    onChange={(e) => setNewSpecialty(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addSpecialty()}
                  />
                  <Button onClick={addSpecialty} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {clinic.specialties.map((specialty) => (
                    <Badge key={specialty} variant="secondary" className="flex items-center gap-1">
                      {specialty}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => removeSpecialty(specialty)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>

              <Button 
                onClick={saveClinic} 
                disabled={saving}
                className="w-full"
              >
                {saving ? "Saving..." : clinic.id ? "Update Clinic" : "Save Clinic"}
              </Button>
            </CardContent>
          </Card>

          {/* Map */}
          <Card>
            <CardHeader>
              <CardTitle>Clinic Location</CardTitle>
              <CardDescription>Click on the map to set your clinic's exact location</CardDescription>
            </CardHeader>
            <CardContent>
              <GoogleMap 
                className="w-full h-96"
                center={{ lat: clinic.latitude, lng: clinic.longitude }}
                zoom={15}
                onMapLoad={handleMapLoad}
              />
              
              {clinic.latitude && clinic.longitude && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4" />
                    <span>Latitude: {clinic.latitude.toFixed(6)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4" />
                    <span>Longitude: {clinic.longitude.toFixed(6)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};