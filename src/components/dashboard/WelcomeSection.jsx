import { useAuth } from "../../hooks/useAuth";
import { PLATFORM_NAME } from "../../config/erpModules";

function WelcomeSection() {
  const { profile } = useAuth();
  const hour = new Date().getHours();
  let greeting = "Good Morning";

  if (hour >= 12 && hour < 18) greeting = "Good Afternoon";
  if (hour >= 18) greeting = "Good Evening";

  return (
    <div className="card welcome-section">
      <div className="welcome-content">
        <h1 className="welcome-title">{greeting}, {profile?.full_name}! 👋</h1>
        <p className="welcome-subtitle">
          Welcome back to your {PLATFORM_NAME} dashboard. Let's build something amazing today.
        </p>
      </div>
    </div>
  );
}

export default WelcomeSection;
