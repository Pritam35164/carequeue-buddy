import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { GoogleMap } from "@/components/GoogleMap";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, Clock, Users, Phone, Calendar, Navigation } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Clinic {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  specialties: string[];
  average_wait_time: number;
  status: 'open' | 'busy' | 'closed';
}

interface Appointment {
  id: string;
  clinic_id: string;
  token_number: number;
  status: string;
  queue_position: number | null;
  estimated_time: string | null;
  clinic: Clinic;
}

export const PatientDashboard = () => {
  const { profile, signOut } = useAuth();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchClinics();
    fetchAppointments();
  }, []);

  const fetchClinics = async () => {
    const { data } = await supabase
      .from('clinics')
      .select('*')
      .order('name');
    
    if (data) setClinics(data);
    setLoading(false);
  };

  const fetchAppointments = async () => {
    const { data } = await supabase
      .from('appointments')
      .select(`
        *,
        clinic:clinics(*)
      `)
      .eq('patient_id', profile?.id)
      .order('created_at', { ascending: false });
    
    if (data) setAppointments(data);
  };

  const handleMapLoad = (map: google.maps.Map) => {
    // Add clinic markers
    clinics.forEach(clinic => {
      const marker = new google.maps.Marker({
        position: { lat: Number(clinic.latitude), lng: Number(clinic.longitude) },
        map,
        title: clinic.name,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="${clinic.status === 'open' ? '#16a34a' : clinic.status === 'busy' ? '#f59e0b' : '#dc2626'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          `)}`,
          scaledSize: new google.maps.Size(32, 32)
        }
      });

      marker.addListener('click', () => {
        setSelectedClinic(clinic);
      });
    });
  };

  const bookAppointment = async () => {
    if (!selectedClinic) return;
    
    setBookingLoading(true);
    
    // Get next token number for this clinic
    const { data: lastAppointment } = await supabase
      .from('appointments')
      .select('token_number')
      .eq('clinic_id', selectedClinic.id)
      .order('token_number', { ascending: false })
      .limit(1)
      .single();
    
    const nextToken = (lastAppointment?.token_number || 0) + 1;
    
    // Get current queue count
    const { count } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', selectedClinic.id)
      .in('status', ['pending', 'confirmed']);
    
    const queuePosition = (count || 0) + 1;
    const estimatedTime = new Date();
    estimatedTime.setMinutes(estimatedTime.getMinutes() + (selectedClinic.average_wait_time * queuePosition));
    
    const { error } = await supabase
      .from('appointments')
      .insert({
        patient_id: profile?.id,
        clinic_id: selectedClinic.id,
        token_number: nextToken,
        queue_position: queuePosition,
        estimated_time: estimatedTime.toISOString(),
        status: 'pending'
      });
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Booking Failed",
        description: error.message
      });
    } else {
      toast({
        title: "Appointment Booked!",
        description: `Your token number is ${nextToken}. You are position ${queuePosition} in the queue.`
      });
      
      // Show route to clinic
      const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedClinic.address)}`;
      window.open(directionsUrl, '_blank');
      
      setSelectedClinic(null);
      fetchAppointments();
    }
    
    setBookingLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-secondary text-secondary-foreground';
      case 'busy': return 'bg-yellow-500 text-white';
      case 'closed': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
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
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Welcome, {profile?.full_name}
            </h1>
            <p className="text-muted-foreground">Find and book appointments at nearby clinics</p>
          </div>
          <Button variant="outline" onClick={signOut}>
            Sign Out
          </Button>
        </div>

        {/* Current Appointments */}
        {appointments.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Your Current Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {appointments.map((appointment) => (
                  <div key={appointment.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-semibold">{appointment.clinic.name}</h3>
                      <p className="text-sm text-muted-foreground">Token: #{appointment.token_number}</p>
                      <p className="text-sm text-muted-foreground">
                        Position: {appointment.queue_position} in queue
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">{appointment.status}</Badge>
                      {appointment.estimated_time && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Est: {new Date(appointment.estimated_time).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Map Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Nearby Clinics</CardTitle>
            <CardDescription>Click on a clinic marker to book an appointment</CardDescription>
          </CardHeader>
          <CardContent>
            <GoogleMap 
              className="w-full h-96"
              center={{ lat: 40.7128, lng: -74.0060 }}
              zoom={13}
              onMapLoad={handleMapLoad}
            />
          </CardContent>
        </Card>

        {/* Clinic List */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clinics.map((clinic) => (
            <Card key={clinic.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedClinic(clinic)}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{clinic.name}</CardTitle>
                  <Badge className={getStatusColor(clinic.status)}>
                    {clinic.status}
                  </Badge>
                </div>
                <CardDescription className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {clinic.address}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4" />
                    <span>~{clinic.average_wait_time} min wait</span>
                  </div>
                  {clinic.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4" />
                      <span>{clinic.phone}</span>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {clinic.specialties.slice(0, 2).map((specialty) => (
                      <Badge key={specialty} variant="outline" className="text-xs">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Booking Dialog */}
        <Dialog open={!!selectedClinic} onOpenChange={() => setSelectedClinic(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Book Appointment</DialogTitle>
              <DialogDescription>
                {selectedClinic?.name}
              </DialogDescription>
            </DialogHeader>
            
            {selectedClinic && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{selectedClinic.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">~{selectedClinic.average_wait_time} min wait</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Queue status: {selectedClinic.status}</span>
                  </div>
                  {selectedClinic.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{selectedClinic.phone}</span>
                    </div>
                  )}
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Specialties</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedClinic.specialties.map((specialty) => (
                      <Badge key={specialty} variant="outline">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={bookAppointment} 
                    disabled={bookingLoading || selectedClinic.status === 'closed'}
                    className="flex-1"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    {bookingLoading ? "Booking..." : "Confirm Booking"}
                  </Button>
                  <Button variant="outline" onClick={() => {
                    const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedClinic.address)}`;
                    window.open(directionsUrl, '_blank');
                  }}>
                    <Navigation className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};