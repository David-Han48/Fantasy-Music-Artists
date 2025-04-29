import React, { useState, useEffect } from 'react';
import '../App.css';

const LeagueManagement = ({ userId, username }) => {
  const [leagues, setLeagues] = useState([]);
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [newLeagueName, setNewLeagueName] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [leagueStandings, setLeagueStandings] = useState([]);
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchLeagues();
  }, [userId]);

  const fetchLeagues = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('http://localhost:5000/api/leagues');
      
      if (!response.ok) {
        throw new Error('Failed to fetch leagues');
      }
      
      const data = await response.json();
      setLeagues(data);
    } catch (err) {
      setError('Error fetching leagues: ' + err.message);
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeagueStandings = async (leagueId) => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/standings/${leagueId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch league standings');
      }
      
      const data = await response.json();
      setLeagueStandings(data);
    } catch (err) {
      setError('Error fetching league standings: ' + err.message);
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLeagueSelect = (league) => {
    setSelectedLeague(league);
    fetchLeagueStandings(league.leagueId);
  };

  const handleCreateLeague = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!newLeagueName) {
      setError('League name is required');
      return;
    }

    try {
      setIsCreating(true);
      const response = await fetch('http://localhost:5000/api/leagues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leagueName: newLeagueName,
          ownerId: userId
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create league');
      }
      
      setMessage(`League "${newLeagueName}" created successfully!`);
      setNewLeagueName('');
      fetchLeagues();
    } catch (err) {
      setError(err.message || 'Failed to create league');
      console.error('Error:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinLeague = async (leagueId, e) => {
    e.stopPropagation();
    
    try {
      setIsJoining(true);
      setError('');
      const response = await fetch(`http://localhost:5000/api/leagues/${leagueId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId: userId
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to join league');
      }
      
      setMessage(data.message || 'You have joined the league successfully!');
      fetchLeagues();
      
      // Refresh standings if this is the selected league
      if (selectedLeague && selectedLeague.leagueId === leagueId) {
        fetchLeagueStandings(leagueId);
      }
    } catch (err) {
      setError(err.message || 'Failed to join league');
      console.error('Error:', err);
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveLeague = async (leagueId, e) => {
    e.stopPropagation();
    
    if (!window.confirm('Are you sure you want to leave this league?')) {
      return;
    }

    try {
      setIsLeaving(true);
      setError('');
      const response = await fetch(`http://localhost:5000/api/leagues/${leagueId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId: userId
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to leave league');
      }
      
      setMessage(data.message || 'You have left the league successfully!');
      fetchLeagues();
      
      // Clear selected league if it was the one left
      if (selectedLeague && selectedLeague.leagueId === leagueId) {
        setSelectedLeague(null);
        setLeagueStandings([]);
      }
    } catch (err) {
      setError(err.message || 'Failed to leave league');
      console.error('Error:', err);
    } finally {
      setIsLeaving(false);
    }
  };

  const isLeagueOwner = (league) => {
    return league.ownerId === userId;
  };

  const isInLeague = (league) => {
    return league.playerCount > 0 && 
           (league.ownerId === userId || 
            league.players?.some(p => p.playerId === userId));
  };

  return (
    <div className="league-management-container">
      <h2>League Management</h2>
      
      {message && (
        <div className="alert success">
          {message}
          <button onClick={() => setMessage('')} className="close-btn">×</button>
        </div>
      )}
      {error && (
        <div className="alert error">
          {error}
          <button onClick={() => setError('')} className="close-btn">×</button>
        </div>
      )}
      
      <div className="league-management-grid">
        <div className="leagues-panel">
          <h3>Available Leagues</h3>
          {loading ? (
            <div className="loading">Loading leagues...</div>
          ) : leagues.length === 0 ? (
            <p>No leagues available</p>
          ) : (
            <ul className="leagues-list">
              {leagues.map((league) => (
                <li 
                  key={league.leagueId}
                  className={`league-item ${
                    selectedLeague?.leagueId === league.leagueId ? 'selected' : ''
                  } ${
                    isLeagueOwner(league) ? 'owner' : ''
                  }`}
                  onClick={() => handleLeagueSelect(league)}
                >
                  <div className="league-info">
                    <span className="league-name">{league.leagueName}</span>
                    <span className="league-meta">
                      {league.playerCount} player{league.playerCount !== 1 ? 's' : ''}
                      {league.ownerName && ` • Owner: ${league.ownerName}`}
                    </span>
                  </div>
                  <div className="league-actions">
                    {!isInLeague(league) ? (
                      <button 
                        onClick={(e) => handleJoinLeague(league.leagueId, e)}
                        disabled={isJoining}
                        className="btn join"
                      >
                        {isJoining ? 'Joining...' : 'Join'}
                      </button>
                    ) : (
                      <button 
                        onClick={(e) => handleLeaveLeague(league.leagueId, e)}
                        disabled={isLeaving || isLeagueOwner(league)}
                        className="btn leave"
                        title={isLeagueOwner(league) ? "Owners can't leave, must transfer ownership first" : ""}
                      >
                        {isLeaving ? 'Leaving...' : 'Leave'}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          
          <div className="create-league-form">
            <h3>Create New League</h3>
            <form onSubmit={handleCreateLeague}>
              <div className="form-group">
                <label htmlFor="leagueName">League Name</label>
                <input
                  type="text"
                  id="leagueName"
                  value={newLeagueName}
                  onChange={(e) => setNewLeagueName(e.target.value)}
                  placeholder="Enter league name"
                  required
                  minLength="3"
                />
              </div>
              
              <button 
                type="submit" 
                disabled={isCreating}
                className="btn submit"
              >
                {isCreating ? 'Creating...' : 'Create League'}
              </button>
            </form>
          </div>
        </div>
        
        {selectedLeague && (
          <div className="league-details">
            <div className="league-header">
              <h3>
                {selectedLeague.leagueName}
                {isLeagueOwner(selectedLeague) && (
                  <span className="owner-badge">You are the owner</span>
                )}
              </h3>
              <p className="league-meta">
                {selectedLeague.playerCount} player{selectedLeague.playerCount !== 1 ? 's' : ''} • 
                Owner: {selectedLeague.ownerName || 'Unknown'}
              </p>
            </div>
            
            <h4>Current Standings</h4>
            {leagueStandings.length > 0 ? (
              <table className="standings-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Player</th>
                    <th>Points</th>
                  </tr>
                </thead>
                <tbody>
                  {leagueStandings.map((player, index) => (
                    <tr 
                      key={player.playerId}
                      className={player.playerId === userId ? 'current-user' : ''}
                    >
                      <td>{index + 1}</td>
                      <td>
                        {player.playerName}
                        {player.playerId === userId && ' (You)'}
                      </td>
                      <td>{player.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No standings data available</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeagueManagement;