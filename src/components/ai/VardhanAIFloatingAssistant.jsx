import { Bot } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./VardhanAIFloatingAssistant.css";
function VardhanAIFloatingAssistant(){const navigate=useNavigate();return <div className="vardhan-floating-ai"><button type="button" className="vardhan-floating-ai-button" onClick={()=>navigate("/chits/ai")}><Bot size={20}/>Ask VARDHAN AI</button></div>}
export default VardhanAIFloatingAssistant;
