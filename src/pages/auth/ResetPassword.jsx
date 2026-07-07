function ResetPassword() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>VARDHAN ERP</h1>
        <h2>Reset Password</h2>

        <input type="password" placeholder="New Password" />
        <input type="password" placeholder="Confirm Password" />
        <button>Update Password</button>
      </div>
    </div>
  );
}

export default ResetPassword;
