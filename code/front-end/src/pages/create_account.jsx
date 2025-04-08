import React, { useState } from 'react';
import '/src/components/create_account.css';

const CreateAccount = () => {
  const [playerName, setPlayerName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleCreateAccount = async () => {
    const response = await fetch('http://localhost:5000/api/create_player', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_name: playerName, username, password })
    });

    const result = await response.json();
    alert(result.message);
  };

  return (
    <div>
      <h2>Create Account</h2>
      <div>
        <label>
          Player Name:
          <input 
            type="text" 
            placeholder="Enter your player name" 
            value={playerName} 
            onChange={(e) => setPlayerName(e.target.value)} 
          />
        </label>
      </div>
      <div>
        <label>
          Username:
          <input 
            type="text" 
            placeholder="Enter your username" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
          />
        </label>
      </div>
      <div>
        <label>
          Password:
          <input 
            type="password" 
            placeholder="Enter your password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
          />
        </label>
      </div>
      <button onClick={handleCreateAccount}>Create Account</button>
    </div>
  );
};

export default CreateAccount;
