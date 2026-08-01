import { AlertTriangle, Settings, Video, Mic } from "lucide-react";

export default function ProviderUnavailable({ type = "video" }) {
  const isVideo = type === "video";
  const Icon = isVideo ? Video : Mic;

  return (
    <div className="academy-provider-unavailable">
      <div className="academy-provider-icon">
        <AlertTriangle size={24} />
      </div>
      <div className="academy-provider-content">
        <h4>{isVideo ? "Video Provider Not Configured" : "Voice Provider Not Configured"}</h4>
        <p>
          {isVideo
            ? "Video content requires a hosted media provider. Contact your administrator to configure video hosting and CDN services."
            : "Voice features require a speech synthesis provider. Contact your administrator to configure text-to-speech services."
          }
        </p>
        <div className="academy-provider-actions">
          <button className="academy-provider-action">
            <Settings size={14} />
            <span>Configure Provider</span>
          </button>
          <button className="academy-provider-action academy-provider-secondary">
            <Icon size={14} />
            <span>View Requirements</span>
          </button>
        </div>
      </div>
    </div>
  );
}
