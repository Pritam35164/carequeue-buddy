import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, Clock, MessageCircle, Settings, Send, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface Appointment {
  id: string;
  patient_id: string;
  token_number: number;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  queue_position: number | null;
  estimated_time: string | null;
  created_at: string;
  profiles: {
    full_name: string;
    phone: string;
  };
}

interface ChatMessage {
  id: string;
  message: string;
  sender_id: string;
  created_at: string;
  profiles: {
    full_name: string;
  };
}

export const AdminDashboard = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [clinicStatus, setClinicStatus] = useState<'open' | 'busy' | 'closed'>('open');
  const [loading, setLoading] = useState(true);
  const [hasClinic, setHasClinic] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAppointments();
    fetchClinicInfo();
    
    // Set up real-time subscription for appointments
    const appointmentsChannel = supabase
      .channel('appointments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments'
        },
        () => {
          fetchAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(appointmentsChannel);
    };
  }, []);

  const fetchAppointments = async () => {
    // First get admin's clinic
    const { data: clinic } = await supabase
      .from('clinics')
      .select('id')
      .eq('admin_id', profile?.id)
      .single();

    if (clinic) {
      const { data } = await supabase
        .from('appointments')
        .select(`
          *,
          profiles!appointments_patient_id_fkey(full_name, phone)
        `)
        .eq('clinic_id', clinic.id)
        .order('created_at', { ascending: false });
      
      if (data) setAppointments(data);
    }
    setLoading(false);
  };

  const fetchClinicInfo = async () => {
    const { data: clinic } = await supabase
      .from('clinics')
      .select('status')
      .eq('admin_id', profile?.id)
      .single();

    if (clinic) {
      setClinicStatus(clinic.status);
      setHasClinic(true);
    } else {
      setHasClinic(false);
    }
  };

  const updateAppointmentStatus = async (appointmentId: string, newStatus: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled') => {
    const { error } = await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', appointmentId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message
      });
    } else {
      toast({
        title: "Status Updated",
        description: `Appointment status changed to ${newStatus}`
      });
      fetchAppointments();
    }
  };

  const updateClinicStatus = async (newStatus: 'open' | 'busy' | 'closed') => {
    const { error } = await supabase
      .from('clinics')
      .update({ status: newStatus })
      .eq('admin_id', profile?.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message
      });
    } else {
      setClinicStatus(newStatus);
      toast({
        title: "Clinic Status Updated",
        description: `Clinic is now ${newStatus}`
      });
    }
  };

  const fetchChatMessages = async (appointmentId: string) => {
    const { data } = await supabase
      .from('chat_messages')
      .select(`
        *,
        profiles!chat_messages_sender_id_fkey(full_name)
      `)
      .eq('appointment_id', appointmentId)
      .order('created_at', { ascending: true });

    if (data) setChatMessages(data);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedAppointment) return;

    const { error } = await supabase
      .from('chat_messages')
      .insert({
        appointment_id: selectedAppointment.id,
        sender_id: profile?.id,
        message: newMessage.trim()
      });

    if (error) {
      toast({
        variant: "destructive",
        title: "Message Failed",
        description: error.message
      });
    } else {
      setNewMessage("");
      fetchChatMessages(selectedAppointment.id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500 text-white';
      case 'confirmed': return 'bg-blue-500 text-white';
      case 'in_progress': return 'bg-orange-500 text-white';
      case 'completed': return 'bg-secondary text-secondary-foreground';
      case 'cancelled': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getClinicStatusColor = (status: string) => {
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

  const pendingAppointments = appointments.filter(apt => apt.status === 'pending' || apt.status === 'confirmed');
  const todayAppointments = appointments.filter(apt => 
    new Date(apt.created_at).toDateString() === new Date().toDateString()
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">Manage your clinic queue and appointments</p>
          </div>
          <div className="flex items-center gap-4">
            {hasClinic ? (
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="text-sm">Clinic Status:</span>
                <Select value={clinicStatus} onValueChange={(value: 'open' | 'busy' | 'closed') => updateClinicStatus(value)}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="busy">Busy</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <Button onClick={() => navigate('/clinic-setup')}>
                <MapPin className="h-4 w-4 mr-2" />
                Set Up Clinic
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate('/clinic-setup')}>
              <Settings className="h-4 w-4 mr-2" />
              Clinic Settings
            </Button>
            <Button variant="outline" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{pendingAppointments.length}</p>
                  <p className="text-sm text-muted-foreground">In Queue</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-secondary" />
                <div>
                  <p className="text-2xl font-bold">{todayAppointments.length}</p>
                  <p className="text-sm text-muted-foreground">Today's Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Badge className={getClinicStatusColor(clinicStatus)}>
                  {clinicStatus.toUpperCase()}
                </Badge>
                <div>
                  <p className="text-sm text-muted-foreground">Current Status</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {appointments.filter(apt => apt.status === 'in_progress').length}
                  </p>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Queue Management */}
        <Card>
          <CardHeader>
            <CardTitle>Current Queue</CardTitle>
            <CardDescription>Manage patient appointments and queue status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {appointments.map((appointment) => (
                <div key={appointment.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <div className="bg-primary text-primary-foreground rounded-full w-10 h-10 flex items-center justify-center font-bold">
                        #{appointment.token_number}
                      </div>
                      <div>
                        <h3 className="font-semibold">{appointment.profiles.full_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {appointment.profiles.phone}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Booked: {new Date(appointment.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <Badge className={getStatusColor(appointment.status)}>
                        {appointment.status}
                      </Badge>
                      {appointment.queue_position && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Position: {appointment.queue_position}
                        </p>
                      )}
                    </div>
                    
                    <Select
                      value={appointment.status}
                      onValueChange={(value: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled') => 
                        updateAppointmentStatus(appointment.id, value)
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedAppointment(appointment);
                            fetchChatMessages(appointment.id);
                          }}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Chat with {appointment.profiles.full_name}</DialogTitle>
                          <DialogDescription>
                            Token #{appointment.token_number}
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                          <div className="h-64 overflow-y-auto space-y-2 p-2 border rounded">
                            {chatMessages.map((message) => (
                              <div
                                key={message.id}
                                className={`p-2 rounded ${
                                  message.sender_id === profile?.id
                                    ? 'bg-primary text-primary-foreground ml-8'
                                    : 'bg-muted mr-8'
                                }`}
                              >
                                <p className="text-sm">{message.message}</p>
                                <p className="text-xs opacity-70">
                                  {message.profiles.full_name} • {new Date(message.created_at).toLocaleTimeString()}
                                </p>
                              </div>
                            ))}
                          </div>
                          
                          <div className="flex gap-2">
                            <Input
                              placeholder="Type your message..."
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                            />
                            <Button onClick={sendMessage} size="sm">
                              <Send className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))}
              
              {appointments.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No appointments yet. Patients can book appointments through the app.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};