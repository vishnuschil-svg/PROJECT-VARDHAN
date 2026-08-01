import { HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function HelpButton({ feature, variant = "default" }) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/chits/ai?help=${feature}`);
  };

  return (
    <button
      onClick={handleClick}
      className={`help-button help-button-${variant}`}
      title="Get AI help for this feature"
      aria-label={`Get help for ${feature}`}
    >
      <HelpCircle size={16} />
      <span>Help</span>
    </button>
  );
}
