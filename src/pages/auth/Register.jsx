import { useState } from "react";
import { Link } from "react-router-dom";
import { registerCustomer } from "../../services/authService";

function Register() {
  const [form, setForm] = useState({
    businessName: "",
    ownerName: "",
    mobile: "",
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function updateField(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleRegister(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      await registerCustomer(form);
      setMessage("Registration submitted successfully. Please verify email and wait for admin approval.");
      setForm({ businessName: "", ownerName: "", mobile: "", email: "", password: "" });
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleRegister}>
        <h1>VARDHAN ERP</h1>
        <p>Customer Registration</p>
        <h2>Create Account</h2>

        {message && <div className="alert">{message}</div>}

        <input name="businessName" value={form.businessName} onChange={updateField} type="text" placeholder="Business / Company Name" required />
        <input name="ownerName" value={form.ownerName} onChange={updateField} type="text" placeholder="Owner Name" required />
        <input name="mobile" value={form.mobile} onChange={updateField} type="text" placeholder="Mobile Number" required />
        <input name="email" value={form.email} onChange={updateField} type="email" placeholder="Email address" required />
        <input name="password" value={form.password} onChange={updateField} type="password" placeholder="Password" required />

        <button disabled={loading}>{loading ? "Please wait..." : "Create Account"}</button>

        <div className="auth-links">
          <Link to="/login">Already have an account? Login</Link>
        </div>
      </form>
    </div>
  );
}

export default Register;
