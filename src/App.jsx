import { useEffect, useMemo, useState } from 'react'
import './App.css'

const allowedTags = ['painting', 'wall art', 'digital', 'sketch']
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const AUTH_STORAGE_KEY = 'orange-summer-challenge-auth-token'

const emptyArtworkForm = {
  title: '',
  imageURL: '',
  tags: [],
  startingPrice: '',
}

const emptyAuthForm = {
  username: '',
  email: '',
  password: '',
}

function getOwnerInfo(owner) {
  if (!owner) {
    return {
      id: '',
      label: 'Unknown owner',
      searchText: '',
    }
  }

  if (typeof owner === 'string') {
    return {
      id: owner,
      label: owner,
      searchText: owner.toLowerCase(),
    }
  }

  const id = owner._id || owner.id || ''
  const label = owner.username || owner.email || 'Unknown owner'
  const searchText = [owner.username, owner.email].filter(Boolean).join(' ').toLowerCase()

  return {
    id: id.toString(),
    label,
    searchText,
  }
}

function App() {
  const [artworks, setArtworks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sessionLoading, setSessionLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState('all')
  const [maxPrice, setMaxPrice] = useState('')
  const [currentUser, setCurrentUser] = useState(null)
  const [authToken, setAuthToken] = useState('')
  const [authMode, setAuthMode] = useState('login')
  const [authError, setAuthError] = useState('')
  const [authStatus, setAuthStatus] = useState('')
  const [authForm, setAuthForm] = useState(emptyAuthForm)
  const [form, setForm] = useState(emptyArtworkForm)
  const [selectedArtwork, setSelectedArtwork] = useState(null)
  const [currentView, setCurrentView] = useState('gallery')

  const isAuthenticated = Boolean(currentUser && authToken)

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

  useEffect(() => {
    const storedToken = localStorage.getItem(AUTH_STORAGE_KEY)

    if (!storedToken) {
      setSessionLoading(false)
      return
    }

    async function restoreSession() {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || 'Session expired')
        }

        setAuthToken(storedToken)
        setCurrentUser(data.user)
        setAuthError('')
      } catch (sessionError) {
        localStorage.removeItem(AUTH_STORAGE_KEY)
        setAuthToken('')
        setCurrentUser(null)
        setAuthError('Your session expired. Please log in again.')
      } finally {
        setSessionLoading(false)
      }
    }

    restoreSession()
  }, [])

  const filteredArtworks = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()
    const maxPriceValue = maxPrice === '' ? null : Number(maxPrice)

    return artworks.filter((artwork) => {
      const ownerInfo = getOwnerInfo(artwork.ownerId)

      const titleMatches = normalizedQuery
        ? artwork.title.toLowerCase().includes(normalizedQuery) || ownerInfo.searchText.includes(normalizedQuery)
        : true

      const tagMatches = selectedTag === 'all' ? true : artwork.tags?.includes(selectedTag)

      const priceMatches = maxPriceValue === null ? true : Number(artwork.startingPrice) <= maxPriceValue

      return titleMatches && tagMatches && priceMatches
    })
  }, [artworks, searchQuery, selectedTag, maxPrice])

  function updateArtworkField(field, value) {
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

  function updateAuthField(field, value) {
    setAuthForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function clearAuthSession() {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    setAuthToken('')
    setCurrentUser(null)
  }

  function getAuthHeaders() {
    return authToken ? { Authorization: `Bearer ${authToken}` } : {}
  }

  function isArtworkOwnedByCurrentUser(artwork) {
    if (!currentUser) {
      return false
    }

    const ownerInfo = getOwnerInfo(artwork.ownerId)

    return ownerInfo.id === currentUser.id
  }

  async function handleAuthSubmit(event) {
    event.preventDefault()
    setAuthError('')
    setAuthStatus('')

    const endpoint = authMode === 'register' ? '/auth/register' : '/auth/login'
    const payload =
      authMode === 'register'
        ? {
            username: authForm.username,
            email: authForm.email,
            password: authForm.password,
          }
        : {
            email: authForm.email,
            password: authForm.password,
          }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed')
      }

      localStorage.setItem(AUTH_STORAGE_KEY, data.token)
      setAuthToken(data.token)
      setCurrentUser(data.user)
      setAuthStatus(
        authMode === 'register'
          ? `Account created. You now have ${data.user.coins} coins.`
          : `Welcome back, ${data.user.username}.`,
      )
      setAuthForm(emptyAuthForm)
    } catch (authSubmitError) {
      setAuthError(authSubmitError.message)
    }
  }

  async function handleLogout() {
    setAuthError('')
    setAuthStatus('')

    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
        },
      })
    } catch (logoutError) {
      // Clearing the local session still guarantees the client logs out.
    } finally {
      clearAuthSession()
      setIsFormOpen(false)
      setAuthMode('login')
      setAuthStatus('You have been logged out.')
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!isAuthenticated) {
      setError('Please log in to upload artworks.')
      return
    }

    const payload = {
      title: form.title,
      imageURL: form.imageURL,
      tags: form.tags,
      startingPrice: Number(form.startingPrice),
    }

    try {
      const response = await fetch(`${API_BASE_URL}/artworks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          clearAuthSession()
          setAuthError(data.message || 'Your session expired. Please log in again.')
        }

        throw new Error(data.message || 'Failed to create artwork')
      }

      setArtworks((current) => [data, ...current])
      setIsFormOpen(false)
      setForm(emptyArtworkForm)
    } catch (submitError) {
      setError(submitError.message)
    }
  }

  async function handleDelete(id) {
    setError('')

    try {
      const response = await fetch(`${API_BASE_URL}/artworks/${id}`, {
        method: 'DELETE',
        headers: {
          ...getAuthHeaders(),
        },
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          clearAuthSession()
          setAuthError(data.message || 'Your session expired. Please log in again.')
        }

        throw new Error(data.message || 'Failed to delete artwork')
      }

      setArtworks((current) => current.filter((artwork) => artwork._id !== id))
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

  function resetFilters() {
    setSearchQuery('')
    setSelectedTag('all')
    setMaxPrice('')
  }

  function openArtworkForm() {
    if (!isAuthenticated) {
      setAuthMode('login')
      setAuthError('Log in or register to add artworks.')
      return
    }

    setIsFormOpen(true)
  }

  const topbarSubtitle = isAuthenticated
    ? `Signed in as ${currentUser.username}. Wallet: ${currentUser.coins} coins.`
    : 'Register or log in to upload, edit, and delete your artworks.'

  // Show a full-screen loading state while restoring session
  if (sessionLoading) {
    return (
      <div className="auth-gate">
        <div className="auth-gate-card">
          <div className="auth-gate-logo">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="24" fill="#FF7900"/>
              <path d="M24 12C17.373 12 12 17.373 12 24C12 30.627 17.373 36 24 36C30.627 36 36 30.627 36 24C36 17.373 30.627 12 24 12ZM24 32C19.582 32 16 28.418 16 24C16 19.582 19.582 16 24 16C28.418 16 32 19.582 32 24C32 28.418 28.418 32 24 32Z" fill="white"/>
            </svg>
          </div>
          <p className="auth-gate-loading-text">Restoring your session…</p>
          <div className="auth-gate-spinner"></div>
        </div>
      </div>
    )
  }

  // Show a full-screen auth page if the user is not logged in
  if (!isAuthenticated) {
    return (
      <div className="auth-gate">
        <div className="auth-gate-card">
          <div className="auth-gate-logo">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="24" fill="#FF7900"/>
              <path d="M24 12C17.373 12 12 17.373 12 24C12 30.627 17.373 36 24 36C30.627 36 36 30.627 36 24C36 17.373 30.627 12 24 12ZM24 32C19.582 32 16 28.418 16 24C16 19.582 19.582 16 24 16C28.418 16 32 19.582 32 24C32 28.418 28.418 32 24 32Z" fill="white"/>
            </svg>
          </div>

          <h1 className="auth-gate-title">Artwork Gallery</h1>
          <p className="auth-gate-sub">Sign in or create an account to explore and manage artworks.</p>

          <div className="auth-mode-toggle auth-gate-tabs">
            <button
              className={authMode === 'login' ? 'auth-tab active' : 'auth-tab'}
              type="button"
              onClick={() => { setAuthMode('login'); setAuthError(''); setAuthStatus(''); }}
            >
              Sign In
            </button>
            <button
              className={authMode === 'register' ? 'auth-tab active' : 'auth-tab'}
              type="button"
              onClick={() => { setAuthMode('register'); setAuthError(''); setAuthStatus(''); }}
            >
              Register
            </button>
          </div>

          {authMode === 'register' && (
            <p className="auth-gate-note">✦ New accounts start with <strong>100 coins</strong>.</p>
          )}

          {authStatus ? <div className="auth-status success">{authStatus}</div> : null}
          {authError ? <div className="auth-status error">{authError}</div> : null}

          <form className="auth-gate-form" onSubmit={handleAuthSubmit}>
            {authMode === 'register' ? (
              <label>
                Username
                <input
                  value={authForm.username}
                  onChange={(event) => updateAuthField('username', event.target.value)}
                  placeholder="e.g. Amina"
                  required
                  autoFocus
                />
              </label>
            ) : null}

            <label>
              Email
              <input
                type="email"
                value={authForm.email}
                onChange={(event) => updateAuthField('email', event.target.value)}
                placeholder="amina@example.com"
                required
                autoFocus={authMode === 'login'}
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={authForm.password}
                onChange={(event) => updateAuthField('password', event.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </label>

            <button className="primary-button auth-gate-submit" type="submit">
              {authMode === 'register' ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <p className="auth-gate-switch">
            {authMode === 'login' ? (
              <>Don&apos;t have an account?{' '}
                <button type="button" className="link-button" onClick={() => { setAuthMode('register'); setAuthError(''); setAuthStatus(''); }}>Register here</button>
              </>
            ) : (
              <>Already have an account?{' '}
                <button type="button" className="link-button" onClick={() => { setAuthMode('login'); setAuthError(''); setAuthStatus(''); }}>Sign in</button>
              </>
            )}
          </p>
        </div>
      </div>
    )
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="topbar-title">
          <h1>Artwork gallery</h1>
          <p className="topbar-subtitle">{topbarSubtitle}</p>
        </div>

        <div className="topbar-actions">
          {currentView === 'gallery' ? (
            <button className="secondary-button" type="button" onClick={() => setCurrentView('account')}>
              My Account
            </button>
          ) : (
            <button className="secondary-button" type="button" onClick={() => setCurrentView('gallery')}>
              Back to Gallery
            </button>
          )}
          <button className="primary-button nav-button" type="button" onClick={openArtworkForm}>
            Add artwork
          </button>
        </div>
      </header>

      {currentView === 'account' && (
        <section className="panel auth-panel">
          <div className="auth-header">
            <div>
              <h2>Account</h2>
              <p>Your session is active. You can upload and manage artworks you own.</p>
            </div>
            <span className="wallet-pill">{currentUser.coins} coins</span>
          </div>
          <div className="session-summary">
            <div>
              <p className="session-label">Signed in as</p>
              <h3>{currentUser.username}</h3>
              <p>{currentUser.email}</p>
            </div>
            <button className="secondary-button" type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </section>
      )}

      {currentView === 'gallery' && (
        <>
          <section className="panel filter-panel">
            <div className="filter-grid">
              <label className="filter-field filter-field-search">
                Search
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search title or owner"
                />
              </label>

              <label className="filter-field">
                Tag
                <select value={selectedTag} onChange={(event) => setSelectedTag(event.target.value)}>
                  <option value="all">All tags</option>
                  {allowedTags.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
              </label>

              <label className="filter-field">
                Max price
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={maxPrice}
                  onChange={(event) => setMaxPrice(event.target.value)}
                  placeholder="50"
                />
              </label>

              <button className="secondary-button filter-button" type="button" onClick={resetFilters}>
                Clear filters
              </button>
            </div>

            <p className="status-text">
              Showing {filteredArtworks.length} of {artworks.length} artworks.
            </p>
          </section>

          <section className="panel list-panel">
            <div className="panel-header">
              <div>
                <h2>Artwork list</h2>
                <p>Only the owner can edit or delete an artwork.</p>
              </div>
              <button className="secondary-button" type="button" onClick={loadArtworks}>
                Refresh
              </button>
            </div>

            {error ? <div className="alert">{error}</div> : null}

            {loading ? <p className="status-text">Loading artworks...</p> : null}

            {!loading && artworks.length === 0 ? (
              <p className="status-text">No artworks yet. Register and add the first one.</p>
            ) : null}

            {!loading && artworks.length > 0 && filteredArtworks.length === 0 ? (
              <p className="status-text">No artworks match the current filters.</p>
            ) : null}

            <div className="artwork-grid">
              {filteredArtworks.map((artwork) => {
                const ownerInfo = getOwnerInfo(artwork.ownerId)
                const canManageArtwork = isArtworkOwnedByCurrentUser(artwork)

                return (
                  <article key={artwork._id} className="artwork-card clickable" onClick={() => setSelectedArtwork(artwork)}>
                    <div className="artwork-image-container">
                      <img src={artwork.imageURL} alt={artwork.title} />
                    </div>
                    <div className="artwork-body">
                      <h3 className="artwork-title">{artwork.title}</h3>
                      <p className="artwork-price">${Number(artwork.startingPrice).toFixed(2)}</p>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        </>
      )}

      {selectedArtwork ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setSelectedArtwork(null)}>
          <div className="modal-panel artwork-details-modal" onClick={(event) => event.stopPropagation()}>
            <div className="panel-header">
              <div>
                <h2>{selectedArtwork.title}</h2>
                <p>Added on {new Date(selectedArtwork.createdAt).toLocaleDateString()}</p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                {isArtworkOwnedByCurrentUser(selectedArtwork) && (
                  <button 
                    className="danger-button" 
                    type="button" 
                    onClick={() => {
                      handleDelete(selectedArtwork._id);
                      setSelectedArtwork(null);
                    }}
                  >
                    Delete
                  </button>
                )}
                <button className="secondary-button" type="button" onClick={() => setSelectedArtwork(null)}>
                  Close
                </button>
              </div>
            </div>
            
            <img 
              src={selectedArtwork.imageURL} 
              alt={selectedArtwork.title} 
              className="details-image" 
            />
            
            <div className="details-info">
              <p><strong>Starting Price:</strong> ${Number(selectedArtwork.startingPrice).toFixed(2)}</p>
              <p><strong>Owner:</strong> {getOwnerInfo(selectedArtwork.ownerId).label}</p>
              
              <div className="chip-row" style={{ marginTop: '12px' }}>
                {selectedArtwork.tags?.length > 0 ? (
                  selectedArtwork.tags.map((tag) => (
                    <span className="tag-chip readonly" key={tag}>
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="empty-chip">No tags</span>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isFormOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setIsFormOpen(false)}>
          <form className="modal-panel" onSubmit={handleSubmit} onClick={(event) => event.stopPropagation()}>
            <div className="panel-header">
              <div>
                <h2>Add artwork</h2>
                <p>
                  The artwork will be owned by <strong>{currentUser.username}</strong> and can only be edited or
                  deleted by you.
                </p>
              </div>
              <button className="secondary-button" type="button" onClick={() => setIsFormOpen(false)}>
                Close
              </button>
            </div>

            <label>
              Title
              <input
                value={form.title}
                onChange={(event) => updateArtworkField('title', event.target.value)}
                placeholder="Sunset Study"
                required
              />
            </label>

            <label>
              Image URL
              <input
                value={form.imageURL}
                onChange={(event) => updateArtworkField('imageURL', event.target.value)}
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
                onChange={(event) => updateArtworkField('startingPrice', event.target.value)}
                placeholder="250"
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