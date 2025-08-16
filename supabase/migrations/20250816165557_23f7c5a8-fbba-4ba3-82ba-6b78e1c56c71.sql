-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('patient', 'admin');

-- Create enum for appointment status
CREATE TYPE public.appointment_status AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled');

-- Create enum for clinic status
CREATE TYPE public.clinic_status AS ENUM ('open', 'busy', 'closed');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'patient',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create clinics table
CREATE TABLE public.clinics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  phone TEXT,
  specialties TEXT[],
  average_wait_time INTEGER DEFAULT 15, -- in minutes
  status clinic_status DEFAULT 'open',
  admin_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create appointments table
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  token_number INTEGER NOT NULL,
  status appointment_status DEFAULT 'pending',
  queue_position INTEGER,
  estimated_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(clinic_id, token_number)
);

-- Create chat messages table
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- RLS Policies for clinics
CREATE POLICY "Anyone can view clinics" 
ON public.clinics FOR SELECT 
USING (true);

CREATE POLICY "Admins can update their clinics" 
ON public.clinics FOR UPDATE 
USING (admin_id = auth.uid());

-- RLS Policies for appointments
CREATE POLICY "Patients can view their appointments" 
ON public.appointments FOR SELECT 
USING (patient_id = auth.uid());

CREATE POLICY "Clinic admins can view clinic appointments" 
ON public.appointments FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.clinics 
    WHERE clinics.id = appointments.clinic_id 
    AND clinics.admin_id = auth.uid()
  )
);

CREATE POLICY "Patients can create appointments" 
ON public.appointments FOR INSERT 
WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Clinic admins can update appointments" 
ON public.appointments FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.clinics 
    WHERE clinics.id = appointments.clinic_id 
    AND clinics.admin_id = auth.uid()
  )
);

-- RLS Policies for chat messages
CREATE POLICY "Users can view messages for their appointments" 
ON public.chat_messages FOR SELECT 
USING (
  appointment_id IN (
    SELECT id FROM public.appointments 
    WHERE patient_id = auth.uid()
  ) OR
  appointment_id IN (
    SELECT a.id FROM public.appointments a
    JOIN public.clinics c ON a.clinic_id = c.id
    WHERE c.admin_id = auth.uid()
  )
);

CREATE POLICY "Users can send messages for their appointments" 
ON public.chat_messages FOR INSERT 
WITH CHECK (
  sender_id = auth.uid() AND
  (appointment_id IN (
    SELECT id FROM public.appointments 
    WHERE patient_id = auth.uid()
  ) OR
  appointment_id IN (
    SELECT a.id FROM public.appointments a
    JOIN public.clinics c ON a.clinic_id = c.id
    WHERE c.admin_id = auth.uid()
  ))
);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'patient')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clinics_updated_at
  BEFORE UPDATE ON public.clinics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample clinics
INSERT INTO public.clinics (name, address, latitude, longitude, phone, specialties, average_wait_time) VALUES
('City Health Clinic', '123 Main St, New York, NY 10001', 40.7128, -74.0060, '+1-555-0101', ARRAY['General Medicine', 'Cardiology'], 20),
('Downtown Medical Center', '456 Broadway, New York, NY 10013', 40.7182, -74.0066, '+1-555-0102', ARRAY['Pediatrics', 'Dermatology'], 15),
('West Side Family Practice', '789 West End Ave, New York, NY 10025', 40.7889, -73.9441, '+1-555-0103', ARRAY['Family Medicine', 'Internal Medicine'], 25),
('East Village Clinic', '321 E 14th St, New York, NY 10003', 40.7338, -73.9857, '+1-555-0104', ARRAY['Urgent Care', 'Orthopedics'], 18),
('Midtown Wellness Center', '567 5th Ave, New York, NY 10017', 40.7549, -73.9785, '+1-555-0105', ARRAY['Psychiatry', 'Neurology'], 30);