import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css';

const CreateAccount = () => {
  const [playerName, setPlayerName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!playerName || !username || !password) {
      setError('All fields are required');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/create_player', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          player_name: playerName,
          username: username,
          password: password,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage(data.message);
        localStorage.setItem('user', JSON.stringify({
          username: username,
          playerId: data.playerId || null,
        }));
        
        setTimeout(() => navigate('/actions'), 1500);
      } else {
        setError(data.error || 'Failed to create account');
      }
    } catch (err) {
      setError('Network error, please try again');
      console.error('Error:', err);
    }
  };

  return (
    <div className="create-account-container">
      <div className="create-account-card">
        <h2>Create Your Fantasy Music League Account</h2>
        
        {message && <div className="success-message">{message}</div>}
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="playerName">Player Name</label>
            <input
              type="text"
              id="playerName"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
            />
          </div>
          
          <button type="submit" className="submit-button">
            Create Account
          </button>
        </form>
        
        <div className="login-link">
          Already have an account? <span onClick={() => navigate('/login')}>Login</span>
        </div>
      </div>
    </div>
  );
};

export default CreateAccount;