import React, { useState } from 'react';
import '../App.css';

const PlayerList = ({ players, refreshPlayers }) => {
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [hoveredPlayer, setHoveredPlayer] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const formattedPlayers = players.map(player => {
    if (Array.isArray(player)) {
      return {
        playerId: player[0],
        playerName: player[1],
        username: player[2]
      };
    }
    return {
      playerId: player.playerId,
      playerName: player.playerName,
      username: player.username
    };
  });

  const handleDeletePlayer = async (playerId) => {
    if (!window.confirm('Are you sure you want to delete this player?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/delete_player/${playerId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage(data.message);
        refreshPlayers();
        
        if (selectedPlayer && selectedPlayer.playerId === playerId) {
          setSelectedPlayer(null);
        }
      } else {
        setError(data.error || 'Failed to delete player');
      }
    } catch (err) {
      setError('Network error, please try again');
      console.error('Error:', err);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!newPassword) {
      setError('New password is required');
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/update_password/${selectedPlayer.playerId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          new_password: newPassword,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage(data.message);
        setNewPassword('');
      } else {
        setError(data.error || 'Failed to update password');
      }
    } catch (err) {
      setError('Network error, please try again');
      console.error('Error:', err);
    }
  };

  return (
    <div className="player-list-container">
      <h2>Players List</h2>
      
      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}

      <div className="debug-info" style={{ marginBottom: '20px' }}>
        <p>Total players: {formattedPlayers.length}</p>
        <p>Sample player data: {JSON.stringify(formattedPlayers[0] || 'No players')}</p>
      </div>
      
      <div className="player-list-grid">
        <div className="player-list">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Username</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {formattedPlayers.map((player) => (
                <tr 
                  key={player.playerId} 
                  className={selectedPlayer?.playerId === player.playerId ? 'selected' : ''}
                  onMouseEnter={() => setHoveredPlayer(player)}
                  onMouseLeave={() => setHoveredPlayer(null)}
                >
                  <td>{player.playerId}</td>
                  <td>{player.playerName || 'N/A'}</td>
                  <td>{player.username || 'N/A'}</td>
                  <td className="action-buttons">
                    <button 
                      onClick={() => setSelectedPlayer(player)}
                      className="select-button"
                    >
                      Select
                    </button>
                    <button 
                      onClick={() => handleDeletePlayer(player.playerId)}
                      className="delete-button"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {hoveredPlayer && (
          <div className="player-hover-card">
            <h3>Quick View</h3>
            <p><strong>ID:</strong> {hoveredPlayer.playerId}</p>
            <p><strong>Name:</strong> {hoveredPlayer.playerName || 'N/A'}</p>
            <p><strong>Username:</strong> {hoveredPlayer.username || 'N/A'}</p>
          </div>
        )}
        
        {selectedPlayer && (
          <div className="player-details">
            <h3>Player Details</h3>
            <p><strong>ID:</strong> {selectedPlayer.playerId}</p>
            <p><strong>Name:</strong> {selectedPlayer.playerName || 'N/A'}</p>
            <p><strong>Username:</strong> {selectedPlayer.username || 'N/A'}</p>
            
            <div className="update-password-form">
              <h4>Update Password</h4>
              <form onSubmit={handlePasswordUpdate}>
                <div className="form-group">
                  <label htmlFor="newPassword">New Password</label>
                  <input
                    type="password"
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                  />
                </div>
                <button type="submit" className="submit-button">
                  Update Password
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerList;