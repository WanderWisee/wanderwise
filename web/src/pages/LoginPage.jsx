import React, { useState } from "react";
import "../App.css";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="ww-login-page">
      <div className="ww-login-card">
        <div className="ww-login-header">
          <span className="ww-lock-icon">🔒</span>
          <h1 className="ww-login-heading">User Login</h1>
        </div>
        <hr className="ww-login-hr" />

        <div className="ww-form-group">
          <label className="ww-form-label">Username:</label>
          <input
            type="text"
            className="ww-form-input"
            placeholder="Type Username or Student Number"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div className="ww-form-group">
          <label className="ww-form-label">Password:</label>
          <input
            type="password"
            className="ww-form-input"
            placeholder="Type Password here"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button className="ww-login-button">Login</button>

        <p className="ww-student-account">Student Account</p>
        <p className="ww-login-links">
          <a href="/reset-password" className="ww-link">↻ Reset Password</a>
          <span className="ww-link-divider"> | </span>
          <a href="/register" className="ww-link">✎ Register Account</a>
        </p>
      </div>
    </div>
  );
}