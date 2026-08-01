import { Component } from "react";
import { getLogger } from "../../lib/monitoring/Logger.js";
import { getMetricsCollector } from "../../lib/monitoring/MetricsCollector.js";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    getMetricsCollector().incrementCounter("application_errors_total", 1, { boundary: "root" });
    getLogger().error("Unhandled application error", {
      error_name: error?.name,
      error_message: error?.message,
      component_stack: info?.componentStack,
    });
    if (this.props.onError) {
      this.props.onError(error, info);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{ padding: 40 }}>
          <h2 style={{ marginTop: 0 }}>Something went wrong</h2>
          <p>Please refresh the page or return to the dashboard.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
