import React, { useState, useEffect } from 'react';
import ArtistSearch from './ArtistSearch';
import '../App.css';

const RosterManagement = ({ userId, username }) => {
  // Existing state
  const [rosters, setRosters] = useState([]);
  const [selectedRoster, setSelectedRoster] = useState(null);
  const [rosterArtists, setRosterArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showArtistSearch, setShowArtistSearch] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRemovingArtist, setIsRemovingArtist] = useState(false);
  
  // New state for time control
  const [currentDate, setCurrentDate] = useState({ 
    month: 1, 
    year: 2024, 
    monthName: 'January' 
  });
  const [isAdvancing, setIsAdvancing] = useState(false);

  useEffect(() => {
    fetchRosters();
    fetchCurrentDate();
  }, [userId]);

  // Fetch current game date
  const fetchCurrentDate = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/current-date');
      if (!response.ok) throw new Error('Failed to fetch current date');
      const data = await response.json();
      setCurrentDate({
        month: data.month,
        year: data.year,
        monthName: data.month_name
      });
    } catch (err) {
      console.error('Error fetching current date:', err);
    }
  };

  // Original fetchRosters function
  const fetchRosters = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`http://localhost:5000/api/rosters?playerId=${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch rosters');
      }
      
      const data = await response.json();
      setRosters(data);
    } catch (err) {
      setError('Error fetching rosters: ' + err.message);
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle advancing to next month
  const handleAdvanceMonth = async () => {
    if (!window.confirm('Advance to the next month? This will update all roster stats.')) {
      return;
    }

    try {
      setIsAdvancing(true);
      setError('');
      const response = await fetch('http://localhost:5000/api/advance-month', {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to advance month');
      }

      const data = await response.json();
      setMessage(`Advanced to ${data.month_name} ${data.year}! Rosters updated.`);
      setCurrentDate({
        month: data.month,
        year: data.year,
        monthName: data.month_name
      });
      fetchRosters();
    } catch (err) {
      setError(err.message);
      console.error('Error:', err);
    } finally {
      setIsAdvancing(false);
    }
  };

  // Original roster selection handler
  const handleRosterSelect = (roster) => {
    setSelectedRoster(roster);
    fetchRosterArtists(roster.rosterId);
    setShowArtistSearch(false);
  };

  // Original fetch roster artists
  const fetchRosterArtists = async (rosterId) => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`http://localhost:5000/api/rosters/${rosterId}/artists`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch roster artists');
      }
      
      const data = await response.json();
      setRosterArtists(data);
    } catch (err) {
      setError('Error fetching roster artists: ' + err.message);
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Original delete roster handler
  const handleDeleteRoster = async (rosterId) => {
    if (!window.confirm('Are you sure you want to delete this roster? This will remove all artists from the roster.')) {
      return;
    }

    try {
      setIsDeleting(true);
      setError('');
      const response = await fetch(`http://localhost:5000/api/rosters/${rosterId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete roster');
      }
      
      setMessage(data.message || 'Roster deleted successfully!');
      fetchRosters();
      
      if (selectedRoster && selectedRoster.rosterId === rosterId) {
        setSelectedRoster(null);
        setRosterArtists([]);
      }
    } catch (err) {
      setError(err.message || 'Failed to delete roster');
      console.error('Error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Original remove artist handler
  const handleRemoveArtist = async (artistId) => {
    if (!window.confirm('Are you sure you want to remove this artist from your roster?')) {
      return;
    }

    try {
      setIsRemovingArtist(true);
      setError('');
      const response = await fetch(
        `http://localhost:5000/api/rosters/${selectedRoster.rosterId}/artists/${artistId}`,
        { method: 'DELETE' }
      );

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove artist');
      }
      
      setMessage(data.message || 'Artist removed from roster successfully!');
      
      const artistToRemove = rosterArtists.find(a => a.artistId === artistId);
      if (artistToRemove) {
        setSelectedRoster({
          ...selectedRoster,
          budget: selectedRoster.budget + artistToRemove.price
        });
      }
      
      fetchRosterArtists(selectedRoster.rosterId);
    } catch (err) {
      setError(err.message || 'Failed to remove artist');
      console.error('Error:', err);
    } finally {
      setIsRemovingArtist(false);
    }
  };

  // Original add artist handler
  const handleAddArtistToRoster = async (artist) => {
    if (!selectedRoster) {
      setError('Please select a roster first');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await fetch(
        `http://localhost:5000/api/rosters/${selectedRoster.rosterId}/artists`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ artistId: artist.artistId })
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add artist');
      }
      
      setMessage(data.message || `Artist "${artist.artistName}" added to roster successfully!`);
      
      setSelectedRoster({
        ...selectedRoster,
        budget: selectedRoster.budget - artist.price
      });
      
      fetchRosterArtists(selectedRoster.rosterId);
      
      setShowArtistSearch(false);
    } catch (err) {
      setError(err.message || 'Failed to add artist');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="roster-management-container">
      {/* New Time Controls Section */}
      <div className="time-controls">
        <h2>Current Period: {currentDate.monthName} {currentDate.year}</h2>
        <button 
          onClick={handleAdvanceMonth}
          disabled={isAdvancing || loading}
          className="fast-forward-button"
        >
          {isAdvancing ? 'Processing...' : 'Fast Forward to Next Month'}
        </button>
      </div>

      <h2>Roster Management</h2>
      
      {/* Message and Error Display */}
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
      
      {/* Main Content Grid */}
      <div className="roster-management-grid">
        {/* Rosters Panel */}
        <div className="rosters-panel">
          <h3>Your Rosters</h3>
          {loading ? (
            <div className="loading">Loading rosters...</div>
          ) : rosters.length === 0 ? (
            <p>No rosters available. Join a league to get started!</p>
          ) : (
            <ul className="rosters-list">
              {rosters.map((roster) => (
                <li 
                  key={roster.rosterId}
                  className={`roster-item ${
                    selectedRoster?.rosterId === roster.rosterId ? 'selected' : ''
                  }`}
                  onClick={() => handleRosterSelect(roster)}
                >
                  <div className="roster-info">
                    <span className="roster-name">{roster.rosterName}</span>
                    <span className="roster-meta">
                      {roster.leagueName} • ${roster.budget} • {roster.points} pts
                    </span>
                  </div>
                  <div className="roster-actions">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRoster(roster.rosterId);
                      }}
                      disabled={isDeleting}
                      className="btn delete"
                    >
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        {/* Roster Details */}
        {selectedRoster && !showArtistSearch && (
          <div className="roster-details">
            <div className="roster-header">
              <h3>
                {selectedRoster.rosterName}
                <span className="league-name">{selectedRoster.leagueName}</span>
              </h3>
              <div className="roster-stats">
                <div className="stat">
                  <span className="stat-label">Budget:</span>
                  <span className="stat-value">${selectedRoster.budget}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Points:</span>
                  <span className="stat-value">{selectedRoster.points}</span>
                </div>
              </div>
            </div>
            
            <div className="artist-controls">
              <button 
                onClick={() => setShowArtistSearch(true)}
                className="btn add-artist"
                disabled={loading}
              >
                Add Artist
              </button>
            </div>
            
            <h4>Artists in this Roster</h4>
            {rosterArtists.length === 0 ? (
              <p className="no-artists">No artists in this roster yet</p>
            ) : (
              <div className="artists-table-container">
                <table className="artists-table">
                  <thead>
                    <tr>
                      <th>Artist</th>
                      <th>Price</th>
                      <th>Listeners</th>
                      <th>Popularity</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rosterArtists.map((artist) => (
                      <tr key={artist.artistId}>
                        <td>{artist.artistName}</td>
                        <td>${artist.price.toLocaleString()}</td>
                        <td>{artist.listeners.toLocaleString()}</td>
                        <td>{artist.popularity}</td>
                        <td>
                          <button
                            onClick={() => handleRemoveArtist(artist.artistId)}
                            disabled={isRemovingArtist || loading}
                            className="btn remove"
                          >
                            {isRemovingArtist ? 'Removing...' : 'Remove'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        
        {/* Artist Search Panel */}
        {showArtistSearch && selectedRoster && (
          <ArtistSearch 
            onAddArtist={handleAddArtistToRoster}
            onCancel={() => setShowArtistSearch(false)}
            budget={selectedRoster.budget}
          />
        )}
      </div>
    </div>
  );
};

export default RosterManagement;