import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css';

export default function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('choice');

  return (
    <div className="ww-auth-shell">
      <div className="ww-mobile-card">
        <div className="ww-mobile-brand">
          <div className="ww-logo">🛡️</div>
          <span>WanderWise!</span>
        </div>

        {mode === 'choice' ? (
          <>
            <h1>Let's get you in</h1>
            <button className="ww-mobile-button" onClick={() => alert('Third-party login not implemented yet')}>
              Continue with Google
            </button>
            <button className="ww-mobile-button" onClick={() => alert('Third-party login not implemented yet')}>
              Continue with Facebook
            </button>
            <button className="ww-mobile-button" onClick={() => alert('Third-party login not implemented yet')}>
              Continue with Apple
            </button>
            <div className="ww-separator">or</div>
            <button className="ww-mobile-button ww-solid" onClick={() => setMode('login')}>
              Log in with a password
            </button>
            <p className="ww-switch-copy">
              Don't have an account? <button onClick={() => setMode('signup')}>Sign up</button>
            </p>
          </>
        ) : mode === 'login' ? (
          <LoginForm onSuccess={() => navigate('/app/home')} onBack={() => setMode('choice')} />
        ) : (
          <SignupForm onSuccess={() => navigate('/app/home')} onBack={() => setMode('choice')} />
        )}
      </div>
    </div>
  );
}

function LoginForm({ onSuccess, onBack }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const login = async () => {
    setError(null);
    const res = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const body = await res.json();
    if (!res.ok) return setError(body.error || 'Login failed');
    localStorage.setItem('wanderwise_token', body.token);
    onSuccess();
  };

  return (
    <>
      <button className="ww-back-button" onClick={onBack}>←</button>
      <h1>Let's get you in</h1>
      <div className="ww-field-group">
        <label>Username</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username or email" />
      </div>
      <div className="ww-field-group">
        <label>Password</label>
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" />
      </div>
      {error && <div className="ww-error">{error}</div>}
      <button className="ww-mobile-button ww-solid" onClick={login}>Log in</button>
      <button className="ww-link-button" onClick={() => alert('Reset password flow not implemented yet')}>Forgot Password</button>
    </>
  );
}

function SignupForm({ onSuccess, onBack }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const signup = async () => {
    setError(null);
    const res = await fetch('http://localhost:4000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });
    const body = await res.json();
    if (!res.ok) return setError(body.error || 'Sign up failed');
    localStorage.setItem('wanderwise_token', body.token);
    onSuccess();
  };

  return (
    <>
      <button className="ww-back-button" onClick={onBack}>←</button>
      <h1>Let's get you in</h1>
      <div className="ww-field-group">
        <label>Username</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
      </div>
      <div className="ww-field-group">
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
      </div>
      <div className="ww-field-group">
        <label>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
      </div>
      {error && <div className="ww-error">{error}</div>}
      <button className="ww-mobile-button ww-solid" onClick={signup}>Sign in</button>
    </>
  );
}
