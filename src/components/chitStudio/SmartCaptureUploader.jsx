import SmartChitCapture from "../ai/SmartChitCapture";

function SmartCaptureUploader({ activeTenantContext }) {
  return <SmartChitCapture activeTenantContext={activeTenantContext} intent="image" />;
}

export default SmartCaptureUploader;
