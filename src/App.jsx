import { useEffect, useState } from 'react'
import './App.css'

const allowedTags = ['painting', 'wall art', 'digital', 'sketch']
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function App() {
  const [artworks, setArtworks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [form, setForm] = useState({
    title: '',
    imageURL: '',
    tags: [],
    startingPrice: '',
    ownerId: '',
  })

  async function loadArtworks() {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${API_BASE_URL}/artworks`)

      if (!response.ok) {
        throw new Error('Failed to load artworks')
      }

      const data = await response.json()
      setArtworks(data)
    } catch (fetchError) {
      setError(fetchError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadArtworks()
  }, [])

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function toggleTag(tag) {
    setForm((current) => ({
      ...current,
      tags: current.tags.includes(tag)
        ? current.tags.filter((item) => item !== tag)
        : [...current.tags, tag],
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    const payload = {
      ...form,
      startingPrice: Number(form.startingPrice),
      tags: form.tags,
    }

    try {
      const response = await fetch(`${API_BASE_URL}/artworks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create artwork')
      }

      setArtworks((current) => [data, ...current])
      setIsFormOpen(false)
      setForm({
        title: '',
        imageURL: '',
        tags: [],
        startingPrice: '',
        ownerId: '',
      })
    } catch (submitError) {
      setError(submitError.message)
    }
  }

  async function handleDelete(id) {
    setError('')

    try {
      const response = await fetch(`${API_BASE_URL}/artworks/${id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete artwork')
      }

      setArtworks((current) => current.filter((artwork) => artwork._id !== id))
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>Artwork gallery</h1>
        </div>

        <button className="primary-button nav-button" type="button" onClick={() => setIsFormOpen(true)}>
          Add artwork
        </button>
      </header>

      <section className="intro-panel">
        <p className="intro-copy">
          Explore the current artwork list below. Use the add button in the navigation bar to upload new pieces.
        </p>
        <div className="hero-stats">
          <span>{artworks.length} artworks</span>
        </div>
      </section>

      <section className="panel list-panel">
        <div className="panel-header">
          <div>
            <h2>Artwork list</h2>
            <p>Click delete on any card to remove that artwork from the database.</p>
          </div>
          <button className="secondary-button" type="button" onClick={loadArtworks}>
            Refresh
          </button>
        </div>

        {error ? <div className="alert">{error}</div> : null}

        {loading ? <p className="status-text">Loading artworks...</p> : null}

        {!loading && artworks.length === 0 ? (
          <p className="status-text">No artworks yet. Use Add artwork to create the first one.</p>
        ) : null}

        <div className="artwork-grid">
          {artworks.map((artwork) => (
            <article key={artwork._id} className="artwork-card">
              <img src={artwork.imageURL} alt={artwork.title} />
              <div className="artwork-body">
                <div className="card-top">
                  <div>
                    <h3>{artwork.title}</h3>
                    <p>${Number(artwork.startingPrice).toFixed(2)}</p>
                  </div>
                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => handleDelete(artwork._id)}
                  >
                    Delete
                  </button>
                </div>

                <div className="chip-row">
                  {artwork.tags?.length > 0 ? (
                    artwork.tags.map((tag) => (
                      <span className="tag-chip readonly" key={tag}>
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="empty-chip">No tags</span>
                  )}
                </div>

                <small>Owner: {artwork.ownerId}</small>
              </div>
            </article>
          ))}
        </div>
      </section>

      {isFormOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setIsFormOpen(false)}>
          <form className="modal-panel" onSubmit={handleSubmit} onClick={(event) => event.stopPropagation()}>
            <div className="panel-header">
              <div>
                <h2>Add artwork</h2>
                <p>Use any combination of the allowed tags and keep the square-edged layout.</p>
              </div>
              <button className="secondary-button" type="button" onClick={() => setIsFormOpen(false)}>
                Close
              </button>
            </div>

            <label>
              Title
              <input
                value={form.title}
                onChange={(event) => updateField('title', event.target.value)}
                placeholder="Sunset Study"
                required
              />
            </label>

            <label>
              Image URL
              <input
                value={form.imageURL}
                onChange={(event) => updateField('imageURL', event.target.value)}
                placeholder="https://example.com/artwork.jpg"
                required
              />
            </label>

            <label>
              Starting price
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.startingPrice}
                onChange={(event) => updateField('startingPrice', event.target.value)}
                placeholder="250"
                required
              />
            </label>

            <label>
              Owner ID
              <input
                value={form.ownerId}
                onChange={(event) => updateField('ownerId', event.target.value)}
                placeholder="artist-001"
                required
              />
            </label>

            <fieldset className="tag-group">
              <legend>Tags</legend>
              <div className="tag-list">
                {allowedTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={form.tags.includes(tag) ? 'tag-chip active' : 'tag-chip'}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </fieldset>

            <button className="primary-button" type="submit">
              Save artwork
            </button>
          </form>
        </div>
      ) : null}
    </main>
  )
}

export default App