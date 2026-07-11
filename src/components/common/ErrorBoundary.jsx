import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
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
