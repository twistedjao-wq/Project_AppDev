import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, CircleUserRound, FileText, Grid2X2, HelpCircle, LayoutDashboard, LogOut,
  Menu, Search, ShieldCheck, UploadCloud, UserRound, X
} from 'lucide-react'
import './App.css'
import './connected.css'
import { api, imageUrl } from './api'
import { AuthProvider, useAuth } from './auth'
import { CATEGORIES, LOCATIONS } from './constants'

const REASON_LABELS = {
  owner_deleted: 'Deleted by reporter',
  admin_deleted: 'Deleted by admin',
  auto_purged: 'Purged (stale report)',
}
const ADMIN_STATUS_OPTIONS = ['Open', 'Returned', 'Archived']
const EMPTY_REPORT = { title: '', type: 'lost', category: '', location: '', locationDetail: '', dateOccurred: '', description: '' }

const capitalize = (text = '') => text.charAt(0).toUpperCase() + text.slice(1)
const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
const initials = (name, email = '') =>
  (name || email).split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('') || 'U'

// Loads data for a component and gives it loading, error, and reload state.
function useApi(fn, deps) {
  const [state, setState] = useState({ data: null, loading: true, error: '' })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let active = true
    setState((prev) => ({ ...prev, loading: true, error: '' }))
    fn()
      .then((data) => active && setState({ data, loading: false, error: '' }))
      .catch((err) => active && setState({ data: null, loading: false, error: err.message }))
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, ...deps])

  return { ...state, reload: () => setVersion((v) => v + 1) }
}

function Notice({ loading, error, empty, emptyText = 'Nothing to show yet.' }) {
  if (loading) return <div className="state-box">Loading...</div>
  if (error) return <div className="state-box state-error">{error}</div>
  if (empty) return <div className="state-box">{emptyText}</div>
  return null
}

function Logo({ compact = false }) {
  return (
    <Link className="logo" to="/">
      <span className="logo-mark"><ShieldCheck size={22} strokeWidth={2.5} /></span>
      {!compact && <span><b>FindMate</b><small>CVSU LOST AND FOUND</small></span>}
    </Link>
  )
}

function Header() {
  const [open, setOpen] = useState(false)
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const close = () => setOpen(false)

  function handleSignOut() {
    signOut()
    close()
    navigate('/')
  }

  return (
    <header className="site-header">
      <div className="header-inner">
        <Logo />
        <button className="menu-button" onClick={() => setOpen(!open)} aria-label="Toggle navigation">
          {open ? <X /> : <Menu />}
        </button>
        <nav className={open ? 'nav open' : 'nav'}>
          <NavLink to="/" onClick={close}>Home</NavLink>
          <NavLink to="/browse" onClick={close}>Browse Items</NavLink>
          <NavLink to="/report" onClick={close}>Report Item</NavLink>
          {user?.role === 'admin' && <NavLink to="/admin" onClick={close}>Admin</NavLink>}
        </nav>
        <div className="header-actions">
          {user ? (
            <>
              <Link className="login-button" to="/profile" onClick={close}>{user.name || user.email}</Link>
              <button className="button button-small" onClick={handleSignOut}>Log Out</button>
            </>
          ) : (
            <Link className="button button-small" to="/login" onClick={close}>Sign In</Link>
          )}
        </div>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer>
      <div className="footer-inner">
        <Logo />
        <div><b>Quick Links</b><Link to="/browse">Browse Items</Link><Link to="/report">Report Item</Link></div>
        <div><b>Account</b><Link to="/login">Sign In</Link><Link to="/profile">My Profile</Link></div>
        <div><b>Contact</b><span>Campus Lost and Found</span><span>CVSU Indang, Cavite</span></div>
      </div>
      <div className="footer-bottom">© 2026 FindMate — CvSU Lost and Found. All rights reserved.</div>
    </footer>
  )
}

function ItemCard({ item }) {
  return (
    <Link className="item-card" to={`/items/${item.id}`}>
      <div className="item-image">
        <img src={imageUrl(item.image)} alt={item.title} />
        <span className={`type-badge ${item.type}`}>{capitalize(item.type)}</span>
      </div>
      <div className="item-card-body">
        <h3>{item.title}</h3>
        <p>{item.location}</p>
        <div className="item-meta"><span>{item.category}</span><span>{formatDate(item.dateReported)}</span></div>
      </div>
    </Link>
  )
}

function Home() {
  const { data, loading, error } = useApi(() => api.listItems({ limit: 3 }), [])
  const items = data?.items ?? []

  return (
    <>
      <section className="hero-section">
        <div className="hero-inner">
          <div className="hero-copy">
            <span className="eyebrow">CVSU CAMPUS COMMUNITY</span>
            <h1>Lost and Found<br />Management System</h1>
            <p>Helping the Cavite State University community reunite with their belongings.</p>
            <div className="hero-buttons">
              <Link className="button" to="/browse">Browse Items</Link>
              <Link className="button button-outline" to="/report">Report an Item</Link>
            </div>
          </div>
          <div className="hero-art">
            <div className="art-circle">
              <img src="https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=650&q=85" alt="Found backpack" />
            </div>
          </div>
        </div>
        <div className="hero-stats">
          <div><b>{data?.total ?? '—'}</b><span>Active Reports</span></div>
        </div>
      </section>

      <section className="section recent-section">
        <div className="section-heading">
          <div><span className="section-kicker">Recently reported</span><h2>Lost &amp; Found Items</h2></div>
          <Link to="/browse" className="text-link">View all items →</Link>
        </div>
        <Notice loading={loading} error={error} empty={!loading && !error && items.length === 0} emptyText="No items have been reported yet." />
        {items.length > 0 && <div className="item-grid">{items.map((item) => <ItemCard key={item.id} item={item} />)}</div>}
      </section>

      <section className="how-section">
        <div className="section-heading centered">
          <span className="section-kicker">Simple and reliable</span>
          <h2>A simpler way back to your belongings</h2>
        </div>
        <div className="steps">
          <div><span>01</span><HelpCircle /><h3>Report</h3><p>Submit a lost or found item report with a photo.</p></div>
          <div><span>02</span><Search /><h3>Search</h3><p>Browse and filter listings by category, type, or location.</p></div>
          <div><span>03</span><ShieldCheck /><h3>Claim</h3><p>Request a claim and let administrators verify your ownership.</p></div>
        </div>
      </section>
    </>
  )
}

const EMPTY_FILTERS = { q: '', category: '', type: '', status: '', page: 1 }

function Browse() {
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''))
  const query = new URLSearchParams(params).toString()
  const { data, loading, error } = useApi(() => api.listItems(params), [query])
  const items = data?.items ?? []

  const setFilter = (field) => (e) => setFilters((f) => ({ ...f, [field]: e.target.value, page: 1 }))
  const goToPage = (page) => setFilters((f) => ({ ...f, page }))

  return (
    <main className="page-shell">
      <div className="page-heading">
        <span className="section-kicker">Community listings</span>
        <h1>Browse Lost and Found Items</h1>
        <p>Find reported items from around the CvSU campus.</p>
      </div>
      <div className="browse-layout">
        <aside className="filters">
          <h3>Filters</h3>
          <label>Search<input value={filters.q} onChange={setFilter('q')} placeholder="Item name or description..." /></label>
          <label>Category
            <select value={filters.category} onChange={setFilter('category')}>
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label>Type
            <select value={filters.type} onChange={setFilter('type')}>
              <option value="">Lost and Found</option>
              <option value="lost">Lost</option>
              <option value="found">Found</option>
            </select>
          </label>
          <label>Status
            <select value={filters.status} onChange={setFilter('status')}>
              <option value="">Active (default)</option>
              <option value="Open">Open</option>
              <option value="Claim Pending">Claim Pending</option>
              <option value="Returned">Returned</option>
            </select>
          </label>
        </aside>

        <section className="browse-results">
          <div className="results-bar"><b>{data ? `${data.total} items found` : 'Searching...'}</b></div>
          <Notice loading={loading} error={error} empty={!loading && !error && items.length === 0} emptyText="No items match your filters." />
          {items.length > 0 && <div className="item-grid browse-grid">{items.map((item) => <ItemCard key={item.id} item={item} />)}</div>}
          {data && data.totalPages > 1 && (
            <div className="pager">
              <button className="button button-small" disabled={filters.page <= 1} onClick={() => goToPage(filters.page - 1)}>Previous</button>
              <span>Page {data.page} of {data.totalPages}</span>
              <button className="button button-small" disabled={filters.page >= data.totalPages} onClick={() => goToPage(filters.page + 1)}>Next</button>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

function ItemDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { data, loading, error, reload } = useApi(() => api.getItem(id), [id])
  const [proof, setProof] = useState('')
  const [claimBusy, setClaimBusy] = useState(false)
  const [claimResult, setClaimResult] = useState(null)
  const [actionError, setActionError] = useState('')

  if (loading) return <main className="page-shell"><Notice loading /></main>
  if (error) {
    return (
      <main className="page-shell">
        <div className="state-box state-error">{error} <Link to="/browse">Back to browse</Link></div>
      </main>
    )
  }

  const { item, myClaim } = data
  const isFound = item.type === 'found'
  const closed = item.status === 'Returned' || item.status === 'Archived'

  async function handleClaim(e) {
    e.preventDefault()
    setClaimBusy(true)
    setActionError('')
    try {
      const result = await api.claimItem(item.id, proof)
      setClaimResult(result)
      setProof('')
      reload()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setClaimBusy(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this report? This cannot be undone.')) return
    try {
      await api.deleteItem(item.id)
      navigate('/browse')
    } catch (err) {
      setActionError(err.message)
    }
  }

  function renderClaimArea() {
    if (!isFound) return <p className="muted">Lost reports can't be claimed. If you found this item, submit a found report instead.</p>
    if (!user) return <Link className="button full-button" to="/login">Sign in to claim this item</Link>
    if (item.isOwner) return <p className="muted">This is your report.</p>
    if (myClaim?.status === 'approved') return <div className="claim-success"><ShieldCheck /> Your claim was approved. Coordinate with the reporter at the claim location.</div>
    if (closed) return <p className="muted">This item is no longer open for claims.</p>
    if (myClaim?.status === 'pending') return <div className="claim-success"><ShieldCheck /> Your claim is pending review.</div>
    if (!user.profileComplete) {
      return <p className="muted">Add your name and student number in your <Link to="/profile">profile</Link> before claiming.</p>
    }
    return (
      <form className="claim-form" onSubmit={handleClaim}>
        <label>Proof of ownership
          <textarea required minLength={10} rows={4} value={proof} onChange={(e) => setProof(e.target.value)}
            placeholder="Describe details only the owner would know: contents, marks, serial number..." />
        </label>
        <button className="button full-button" type="submit" disabled={claimBusy}>
          {claimBusy ? 'Submitting...' : 'Submit Claim Request'}
        </button>
      </form>
    )
  }

  return (
    <main className="page-shell detail-shell">
      <button className="back-button" onClick={() => navigate(-1)}><ArrowLeft size={18} /> Back to items</button>
      {location.state?.justReported && <div className="form-success">Report submitted. Thank you for helping the community.</div>}
      {actionError && <div className="form-error">{actionError}</div>}

      <div className="detail-layout">
        <div className="detail-image"><img src={imageUrl(item.image)} alt={item.title} /></div>
        <div className="detail-content">
          <span className={`type-badge ${item.type}`}>{capitalize(item.type)} Item</span>
          <h1>{item.title}</h1>
          <p className="detail-description">{item.description}</p>
          <dl>
            <div><dt>Category</dt><dd>{item.category}</dd></div>
            <div><dt>Location</dt><dd>{item.location}{item.locationDetail ? ` — ${item.locationDetail}` : ''}</dd></div>
            <div><dt>Date reported</dt><dd>{formatDate(item.dateReported)}</dd></div>
            <div><dt>{isFound ? 'Date found' : 'Date lost'}</dt><dd>{formatDate(item.dateOccurred)}</dd></div>
            <div><dt>Status</dt><dd><span className="status-dot" /> {item.status}</dd></div>
            {item.reporter && (
              <div><dt>Reported by</dt><dd>{item.reporter.name} ({item.reporter.studentNumber})</dd></div>
            )}
          </dl>

          {claimResult && (
            <div className="claim-success">
              <ShieldCheck /> {claimResult.message}
              {claimResult.otherClaimants.length > 0 && (
                <> Other claimants: {claimResult.otherClaimants.map((c) => `${c.name} (${c.studentNumber})`).join(', ')}</>
              )}
            </div>
          )}

          {renderClaimArea()}

          {item.isOwner && item.status === 'Open' && (
            <button className="button button-outline full-button" onClick={handleDelete}>Delete this report</button>
          )}
        </div>
      </div>
    </main>
  )
}

function Report() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const [form, setForm] = useState(EMPTY_REPORT)
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (loading) return <main className="page-shell"><Notice loading /></main>
  if (!user) {
    return (
      <main className="page-shell">
        <div className="state-box">Sign in with your CvSU email to report an item. <Link to="/login">Sign in</Link></div>
      </main>
    )
  }
  if (!user.profileComplete) {
    return (
      <main className="page-shell">
        <div className="state-box">Add your name and student number first. <Link to="/profile">Go to profile</Link></div>
      </main>
    )
  }

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  function handlePhoto(e) {
    const file = e.target.files[0] ?? null
    setPhoto(file)
    setPreview(file ? URL.createObjectURL(file) : '')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!photo) {
      setError('Please add a photo of the item.')
      return
    }

    const body = new FormData()
    Object.entries(form).forEach(([key, value]) => {
      if (value) body.append(key, value)
    })
    body.append('image', photo)

    setSubmitting(true)
    try {
      const { item } = await api.createItem(body)
      navigate(`/items/${item.id}`, { state: { justReported: true } })
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <main className="page-shell form-shell">
      <div className="form-heading">
        <span className="section-kicker">Community report</span>
        <h1>Report an Item</h1>
        <p>Provide clear details to help the community identify the item.</p>
      </div>
      {error && <div className="form-error">{error}</div>}

      <form className="report-form" onSubmit={handleSubmit}>
        <section>
          <h2>Item information</h2>
          <div className="form-grid">
            <label>Item title
              <input required minLength={3} maxLength={120} value={form.title} onChange={update('title')} placeholder="e.g. Black backpack" />
            </label>
            <label>Report type
              <select value={form.type} onChange={update('type')}>
                <option value="lost">Lost</option>
                <option value="found">Found</option>
              </select>
            </label>
            <label>Category
              <select required value={form.category} onChange={update('category')}>
                <option value="">Select a category</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label>Date found or lost (optional)
              <input type="date" value={form.dateOccurred} onChange={update('dateOccurred')} />
            </label>
          </div>
          <label>Location
            <select required value={form.location} onChange={update('location')}>
              <option value="">Select a location</option>
              {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>
          {form.location === 'Other' && (
            <label>Specific place
              <input required minLength={3} maxLength={200} value={form.locationDetail} onChange={update('locationDetail')} placeholder="e.g. Near the vending machine" />
            </label>
          )}
          <label>Description
            <textarea required minLength={10} maxLength={1000} rows={5} value={form.description} onChange={update('description')}
              placeholder="Describe the item, color, brand, and other identifying details..." />
          </label>
        </section>

        <section>
          <h2>Item photo</h2>
          <label className="upload-box">
            <UploadCloud size={34} />
            <b>{photo ? photo.name : 'Upload a photo'}</b>
            <span>JPG, PNG, or WEBP up to 5MB</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhoto} />
          </label>
          {preview && <img className="photo-preview" src={preview} alt="Selected item" />}
        </section>

        <button className="button full-button" type="submit" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Report'}
        </button>
      </form>
    </main>
  )
}

function Login() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSending(true)
    try {
      await api.requestLink(email.trim())
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-brand">
        <Logo />
        <div><h1>Welcome back.</h1><p>Sign in with your CvSU email. No password needed.</p></div>
      </div>

      {sent ? (
        <div className="auth-card">
          <h2>Check your inbox</h2>
          <p>If <b>{email}</b> is a CvSU email, a sign-in link is on its way. The link expires in 15 minutes and works once.</p>
          <button className="button full-button" onClick={() => setSent(false)}>Use a different email</button>
        </div>
      ) : (
        <form className="auth-card" onSubmit={handleSubmit}>
          <h2>Sign in to FindMate</h2>
          {error && <div className="form-error">{error}</div>}
          <label>CvSU email address
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@cvsu.edu.ph" />
          </label>
          <button className="button full-button" type="submit" disabled={sending}>
            {sending ? 'Sending...' : 'Send sign-in link'}
          </button>
        </form>
      )}
    </main>
  )
}

function Verify() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const [error, setError] = useState('')
  const started = useRef(false)

  useEffect(() => {
    // React runs effects twice in development. A sign-in link works only once, so run this once.
    if (started.current) return
    started.current = true

    const token = params.get('token')
    if (!token) {
      setError('This sign-in link is missing its token.')
      return
    }

    api.verifyLink(token)
      .then(({ token: sessionToken, user }) => {
        signIn(sessionToken, user)
        navigate(user.profileComplete ? '/' : '/profile', { replace: true })
      })
      .catch((err) => setError(err.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <main className="auth-shell">
      <div className="auth-card">
        {error ? (
          <>
            <h2>Sign-in failed</h2>
            <div className="form-error">{error}</div>
            <Link className="button full-button" to="/login">Request a new link</Link>
          </>
        ) : (
          <h2>Signing you in...</h2>
        )}
      </div>
    </main>
  )
}

function Profile() {
  const { user, loading, setUser, signOut } = useAuth()
  const navigate = useNavigate()
  const claims = useApi(() => (user ? api.myClaims() : Promise.resolve({ claims: [] })), [user?.id])
  const [name, setName] = useState('')
  const [studentNumber, setStudentNumber] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) {
      setName(user.name)
      setStudentNumber(user.studentNumber)
    }
  }, [user])

  if (loading) return <main className="page-shell"><Notice loading /></main>
  if (!user) {
    return (
      <main className="page-shell">
        <div className="state-box">Please <Link to="/login">sign in</Link> to view your profile.</div>
      </main>
    )
  }

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    try {
      const { user: updated } = await api.updateMe({ name, studentNumber })
      setUser(updated)
      setMessage('Profile saved.')
    } catch (err) {
      setError(err.message)
    }
  }

  function handleSignOut() {
    signOut()
    navigate('/')
  }

  const claimList = claims.data?.claims ?? []

  return (
    <main className="page-shell compact-shell">
      <div className="profile-card">
        <div className="profile-top">
          <div className="profile-avatar">{initials(user.name, user.email)}</div>
          <div><h1>{user.name || 'Add your name'}</h1><p>{user.email}</p></div>
        </div>

        <form className="profile-form" onSubmit={handleSave}>
          <label>Full name
            <input required minLength={2} maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>Student number
            <input required pattern="\d{7,12}" title="7 to 12 digits" value={studentNumber} onChange={(e) => setStudentNumber(e.target.value)} />
          </label>
          {error && <div className="form-error">{error}</div>}
          {message && <div className="form-success">{message}</div>}
          <button className="button" type="submit">Save profile</button>
        </form>

        <h2>My claims</h2>
        <Notice
          loading={claims.loading}
          error={claims.error}
          empty={!claims.loading && !claims.error && claimList.length === 0}
          emptyText="You have not submitted any claims."
        />
        {claimList.length > 0 && (
          <ul className="claim-list">
            {claimList.map((claim) => (
              <li key={claim.id}>
                <Link to={`/items/${claim.item?.id ?? claim.itemId}`}>{claim.item?.title ?? 'Item'}</Link>
                <span className="table-status">{claim.status}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="profile-menu">
          <button onClick={handleSignOut}><LogOut /> Log Out <span>›</span></button>
        </div>
      </div>
    </main>
  )
}

function AdminDashboard() {
  const dashboard = useApi(() => api.dashboard(), [])
  const pending = useApi(() => api.listClaims('pending'), [])
  const [actionError, setActionError] = useState('')

  async function review(claimId, status) {
    setActionError('')
    try {
      await api.reviewClaim(claimId, status)
      dashboard.reload()
      pending.reload()
    } catch (err) {
      setActionError(err.message)
    }
  }

  if (dashboard.loading) return <Notice loading />
  if (dashboard.error) return <Notice error={dashboard.error} />

  const { stats } = dashboard.data
  const pendingClaims = pending.data?.claims ?? []

  return (
    <>
      <div className="admin-heading"><div><span>Administrator</span><h1>Dashboard</h1></div></div>
      <div className="admin-stats">
        <div><span>Active items</span><b>{stats.totalItems}</b><small>{stats.lostItems} lost · {stats.foundItems} found</small></div>
        <div><span>Pending claims</span><b>{stats.pendingClaims}</b><small>Need review</small></div>
        <div><span>Returned</span><b>{stats.returnedItems}</b><small>Successfully returned</small></div>
        <div><span>Students</span><b>{stats.registeredUsers}</b><small>Registered accounts</small></div>
      </div>

      {actionError && <div className="form-error">{actionError}</div>}

      <div className="admin-table-card">
        <div className="table-heading"><h2>Pending claims</h2></div>
        {pending.loading && <Notice loading />}
        {!pending.loading && pendingClaims.length === 0 && <div className="state-box">No pending claims.</div>}
        {pendingClaims.length > 0 && (
          <table>
            <thead><tr><th>Claimant</th><th>Item</th><th>Proof</th><th>Action</th></tr></thead>
            <tbody>
              {pendingClaims.map((claim) => (
                <tr key={claim.id}>
                  <td><b>{claim.claimant?.name}</b><br /><small>{claim.claimant?.studentNumber}</small></td>
                  <td>{claim.item?.title}</td>
                  <td className="proof-cell">{claim.proofDescription}</td>
                  <td className="action-cell">
                    <button onClick={() => review(claim.id, 'approved')}>Approve</button>
                    <button onClick={() => review(claim.id, 'rejected')}>Reject</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

function AdminItems() {
  const { data, loading, error, reload } = useApi(() => api.listItems({ includeArchived: 'true', limit: 50 }), [])
  const [actionError, setActionError] = useState('')
  const items = data?.items ?? []

  async function changeStatus(id, status) {
    setActionError('')
    try {
      await api.updateItem(id, { status })
      reload()
    } catch (err) {
      setActionError(err.message)
    }
  }

  async function remove(id) {
    if (!window.confirm('Delete this item permanently? It will be recorded in the deletion log.')) return
    setActionError('')
    try {
      await api.deleteItem(id)
      reload()
    } catch (err) {
      setActionError(err.message)
    }
  }

  return (
    <>
      <div className="admin-heading"><div><span>Administrator</span><h1>Items</h1></div></div>
      {actionError && <div className="form-error">{actionError}</div>}
      <Notice loading={loading} error={error} empty={!loading && !error && items.length === 0} emptyText="No items yet." />
      {items.length > 0 && (
        <div className="admin-table-card">
          <table>
            <thead><tr><th>Item</th><th>Type</th><th>Reporter</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {items.map((item) => {
                const options = ADMIN_STATUS_OPTIONS.includes(item.status) ? ADMIN_STATUS_OPTIONS : [...ADMIN_STATUS_OPTIONS, item.status]
                return (
                  <tr key={item.id}>
                    <td><img src={imageUrl(item.image)} alt="" /><b>{item.title}</b></td>
                    <td>{capitalize(item.type)}</td>
                    <td>{item.reporter ? `${item.reporter.name} (${item.reporter.studentNumber})` : '—'}</td>
                    <td>
                      <select value={item.status} onChange={(e) => changeStatus(item.id, e.target.value)}>
                        {options.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="action-cell"><button onClick={() => remove(item.id)}>Delete</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

function AdminLogs() {
  const { data, loading, error } = useApi(() => api.deletionLogs(), [])
  const logs = data?.logs ?? []

  return (
    <>
      <div className="admin-heading"><div><span>Administrator</span><h1>Deletion log</h1></div></div>
      <Notice loading={loading} error={error} empty={!loading && !error && logs.length === 0} emptyText="No deletions recorded." />
      {logs.length > 0 && (
        <div className="admin-table-card">
          <table>
            <thead><tr><th>Item</th><th>Status when deleted</th><th>Deleted by</th><th>Reason</th><th>When</th></tr></thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td><b>{log.itemTitle}</b> <small>({capitalize(log.itemType)})</small></td>
                  <td>{log.itemStatus}</td>
                  <td>{log.deletedByEmail} <small>({log.deletedByRole})</small></td>
                  <td>{REASON_LABELS[log.reason] ?? log.reason}</td>
                  <td>{formatDate(log.deletedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

function AdminInvites() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    try {
      const result = await api.inviteAdmin(email.trim())
      setMessage(result.message)
      setEmail('')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <>
      <div className="admin-heading"><div><span>Main admin only</span><h1>Invite an admin</h1></div></div>
      <form className="profile-form admin-invite" onSubmit={handleSubmit}>
        <label>CvSU email address
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@cvsu.edu.ph" />
        </label>
        {error && <div className="form-error">{error}</div>}
        {message && <div className="form-success">{message}</div>}
        <button className="button" type="submit">Send invitation</button>
      </form>
    </>
  )
}

function Admin() {
  const { user, loading } = useAuth()
  const [view, setView] = useState('dashboard')

  if (loading) return <main className="page-shell"><Notice loading /></main>
  if (!user || user.role !== 'admin') {
    return (
      <main className="page-shell compact-shell">
        <div className="state-box">Admins only. <Link to="/login">Sign in with an admin account</Link>.</div>
      </main>
    )
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard /> },
    { id: 'items', label: 'Items', icon: <Grid2X2 /> },
    { id: 'logs', label: 'Deletion log', icon: <FileText /> },
    ...(user.isSuperAdmin ? [{ id: 'invites', label: 'Invite admin', icon: <UserRound /> }] : []),
  ]

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <Logo />
        <nav>
          {tabs.map((tab) => (
            <button key={tab.id} className={view === tab.id ? 'active' : ''} onClick={() => setView(tab.id)}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>
        <div className="admin-profile">
          <CircleUserRound />
          <span><b>{user.name || user.email}</b><small>{user.isSuperAdmin ? 'Main admin' : 'Administrator'}</small></span>
        </div>
      </aside>
      <section className="admin-content">
        {view === 'dashboard' && <AdminDashboard />}
        {view === 'items' && <AdminItems />}
        {view === 'logs' && <AdminLogs />}
        {view === 'invites' && <AdminInvites />}
      </section>
    </main>
  )
}

function NotFound() {
  return (
    <main className="page-shell compact-shell">
      <div className="state-box"><h1>Page not found</h1><Link to="/">Back to home</Link></div>
    </main>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/items/:id" element={<ItemDetails />} />
          <Route path="/report" element={<Report />} />
          <Route path="/login" element={<Login />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Footer />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
