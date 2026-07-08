import { useState } from "react";
import { Link } from "react-router-dom";
import { sendPasswordReset } from "../../services/authService";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleResetRequest(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      await sendPasswordReset(email);
      setMessage("Password reset link sent. Please check your email.");
      setEmail("");
    } catch (error) {
      setMessage(error.message || "Unable to send reset link. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleResetRequest}>
        <h1>VARDHAN ERP</h1>
        <h2>Forgot Password</h2>

        {message && <div className="alert">{message}</div>}

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="Enter registered email"
          required
        />
        <button disabled={loading}>
          {loading ? "Sending..." : "Send Reset Link"}
        </button>

        <div className="auth-links">
          <Link to="/login">Back to Login</Link>
        </div>
      </form>
    </div>
  );
}

export default ForgotPassword;
