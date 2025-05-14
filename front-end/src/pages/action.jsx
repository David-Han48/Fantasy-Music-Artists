import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PlayerList from '../components/PlayerList';
import LeagueManagement from '../components/LeagueManagement';
import RosterManagement from '../components/RosterManagement';
import '../App.css';

const Actions = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('players');
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/');
      return;
    }
    
    setUser(JSON.parse(userData));
    
    fetchPlayers();
  }, [navigate]);

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/get_players');
      
      if (!response.ok) {
        throw new Error('Failed to fetch players');
      }
      
      const data = await response.json();
      setPlayers(data);
    } catch (err) {
      setError('Error fetching players: ' + err.message);
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <div className="actions-container">
      <header className="actions-header">
        <h1>Fantasy Spotify</h1>
        <div className="user-info">
          {user && <span>Welcome, {user.username}!</span>}
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </header>
      
      <nav className="tab-navigation">
        <ul>
          <li 
            className={activeTab === 'players' ? 'active' : ''} 
            onClick={() => setActiveTab('players')}
          >
            Players
          </li>
          <li 
            className={activeTab === 'leagues' ? 'active' : ''} 
            onClick={() => setActiveTab('leagues')}
          >
            Leagues
          </li>
          <li 
            className={activeTab === 'rosters' ? 'active' : ''} 
            onClick={() => setActiveTab('rosters')}
          >
            Rosters
          </li>
        </ul>
      </nav>
      
      <main className="tab-content">
        {loading ? (
          <div className="loading">Loading...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : (
          <>
            {activeTab === 'players' && (
              <PlayerList 
                players={players} 
                refreshPlayers={fetchPlayers} 
              />
            )}
            
            {activeTab === 'leagues' && (
              <LeagueManagement 
                userId={user?.playerId} 
                username={user?.username} 
              />
            )}
            
            {activeTab === 'rosters' && (
              <RosterManagement 
                userId={user?.playerId} 
                username={user?.username} 
              />
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Actions;