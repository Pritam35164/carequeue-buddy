import { WelcomeScreen } from "@/components/WelcomeScreen";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <WelcomeScreen onGetStarted={() => navigate('/auth')} />
  );
};

export default Index;