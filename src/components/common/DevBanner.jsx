import { DEV_AUTH_BYPASS } from "../../config/devAccess";
import "./DevBanner.css";

function DevBanner() {
  if (!DEV_AUTH_BYPASS) {
    return null;
  }

  return (
    <div className="dev-banner">
      <div className="dev-banner-content">
        <span className="dev-banner-icon">⚠️</span>
        <span className="dev-banner-text">
          Development Mode: Login bypass enabled - Mock authentication active
        </span>
      </div>
    </div>
  );
}

export default DevBanner;
