import React, { useState, useEffect } from 'react';
import '../App.css';

const ArtistSearch = ({ onAddArtist, onCancel, budget }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchArtists();
    } else {
      setArtists([]);
    }
  }, [searchTerm]);

  const searchArtists = async () => {
    if (searchTerm.length < 2) {
      setArtists([]);
      return;
    }
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`http://localhost:5000/api/artists/search?term=${encodeURIComponent(searchTerm)}`);
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || res.statusText);
      }
      const data = await res.json();
      setArtists(data);
    } catch (err) {
      setError('Error searching artists: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.length >= 2) {
      searchArtists();
    }
  };

  return (
    <div className="artist-search-container">
      <div className="artist-search-header">
        <h3>Search Artists</h3>
        <div className="budget-display">
          Available Budget: <span className="budget-amount">${budget}</span>
        </div>
        <button onClick={onCancel} className="close-button">×</button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="search-form">
        <div className="search-input-group">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by artist name..."
            className="search-input"
          />
          <button type="submit" className="search-button">Search</button>
        </div>
      </form>

      <div className="search-results">
        {loading ? (
          <div className="loading">Searching...</div>
        ) : artists.length === 0 ? (
          searchTerm.length >= 2 ? (
            <p>No artists found</p>
          ) : (
            <p>Enter at least 2 characters to search</p>
          )
        ) : (
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
              {artists.map((artist) => (
                <tr key={artist.artistId}>
                  <td>{artist.artistName}</td>
                  <td>${artist.price}</td>
                  <td>{artist.listeners.toLocaleString()}</td>
                  <td>{artist.popularity}</td>
                  <td>
                    <button
                      onClick={() => onAddArtist(artist)}
                      disabled={artist.price > budget}
                      className={`add-button ${artist.price > budget ? 'disabled' : ''}`}
                    >
                      {artist.price > budget ? 'Too Expensive' : 'Add'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ArtistSearch;