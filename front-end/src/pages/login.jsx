
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css';

const API_BASE = 'http://localhost:5000/api';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Username and password are required');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || res.statusText);
      }
      const { player } = await res.json();

      localStorage.setItem('user', JSON.stringify({
        username: player.username,
        playerId: player.playerId,
        playerName: player.playerName
      }));
      
      navigate('/actions');
    } catch (err) {
      setError('Login failed: ' + err.message);
      console.error(err);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Login to Your Fantasy Music League</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter your username"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </div>
          <button type="submit" className="submit-button">Login</button>
        </form>
        <div className="create-account-link">
          Don't have an account? <span onClick={() => navigate('/')}>Create Account</span>
        </div>
      </div>
    </div>
  );
};

export default Login;