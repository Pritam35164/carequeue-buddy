import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, MessageCircle, Clock, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface Appointment {
  id: string;
  clinic_id: string;
  token_number: number;
  status: string;
  queue_position: number | null;
  clinic: {
    name: string;
    address: string;
    admin_id: string;
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

export const ChatPage = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAppointments();
  }, []);

  useEffect(() => {
    if (selectedAppointment) {
      fetchChatMessages(selectedAppointment.id);
      
      // Set up real-time subscription for messages with immediate updates
      const messagesChannel = supabase
        .channel(`chat-${selectedAppointment.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `appointment_id=eq.${selectedAppointment.id}`
          },
          (payload) => {
            // Add the new message immediately without refetching
            const newMessage = payload.new as ChatMessage;
            setChatMessages(prev => [...prev, newMessage]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(messagesChannel);
      };
    }
  }, [selectedAppointment]);

  const fetchAppointments = async () => {
    const { data } = await supabase
      .from('appointments')
      .select(`
        *,
        clinic:clinics(name, address, admin_id)
      `)
      .eq('patient_id', profile?.id)
      .in('status', ['pending', 'confirmed', 'in_progress'])
      .order('created_at', { ascending: false });
    
    if (data) {
      setAppointments(data);
      if (data.length > 0 && !selectedAppointment) {
        setSelectedAppointment(data[0]);
      }
    }
    setLoading(false);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center mb-6">
            <Button variant="ghost" onClick={() => navigate('/')} className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold">Chat</h1>
          </div>
          
          <Card className="text-center py-12">
            <CardContent>
              <MessageCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No Active Appointments</h3>
              <p className="text-muted-foreground">
                You need to have an active appointment to start chatting with clinic staff.
              </p>
              <Button onClick={() => navigate('/')} className="mt-4">
                Book an Appointment
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={() => navigate('/')} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold">Chat with Clinic</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Appointments List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Your Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {appointments.map((appointment) => (
                   <div
                     key={appointment.id}
                     className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                       selectedAppointment?.id === appointment.id
                         ? 'bg-primary text-primary-foreground'
                         : 'hover:bg-muted'
                     }`}
                     onClick={() => setSelectedAppointment(appointment)}
                   >
                     <div className="flex-1">
                       <h4 className="font-medium flex items-center gap-2">
                         {appointment.clinic.name}
                         <Badge 
                           variant={selectedAppointment?.id === appointment.id ? "secondary" : "outline"}
                           className="text-xs"
                         >
                           #{appointment.token_number}
                         </Badge>
                       </h4>
                       <p className="text-sm opacity-80 flex items-center gap-4 mt-1">
                         <span className="flex items-center gap-1">
                           <MapPin className="h-3 w-3" />
                           {appointment.clinic.address}
                         </span>
                         <span className="flex items-center gap-1">
                           <Clock className="h-3 w-3" />
                           {appointment.status}
                         </span>
                       </p>
                       {appointment.queue_position && (
                         <p className="text-xs text-muted-foreground mt-1">
                           Queue Position: {appointment.queue_position}
                         </p>
                       )}
                     </div>
                     <MessageCircle className="h-4 w-4 text-muted-foreground" />
                   </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                {selectedAppointment ? `Chat - ${selectedAppointment.clinic.name}` : 'Select an Appointment'}
              </CardTitle>
              {selectedAppointment && (
                <CardDescription className="flex items-center gap-4">
                  <span>Token #{selectedAppointment.token_number}</span>
                  <Badge variant={selectedAppointment.status === 'pending' ? 'default' : 'secondary'}>
                    {selectedAppointment.status}
                  </Badge>
                  {selectedAppointment.queue_position && (
                    <span className="text-sm">Queue Position: {selectedAppointment.queue_position}</span>
                  )}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {selectedAppointment ? (
                <div className="space-y-4">
                  {/* Messages */}
                  <div className="h-96 overflow-y-auto space-y-3 p-4 border rounded-lg bg-muted/50">
                    {chatMessages.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No messages yet. Start the conversation!</p>
                      </div>
                    ) : (
                      chatMessages.map((message) => (
                        <div
                          key={message.id}
                          className={`p-3 rounded-lg max-w-xs ${
                            message.sender_id === profile?.id
                              ? 'bg-primary text-primary-foreground ml-auto'
                              : 'bg-background border'
                          }`}
                        >
                          <p className="text-sm">{message.message}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {message.profiles.full_name} • {new Date(message.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                  
                  {/* Message Input */}
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
              ) : (
                <div className="text-center text-muted-foreground py-12">
                  <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Select an appointment to start chatting</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};