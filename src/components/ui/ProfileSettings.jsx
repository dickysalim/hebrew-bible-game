import { useState } from 'react'
import { supabase } from '../../lib/supabase'

// ─── Re-authenticate helper ───────────────────────────────────────────────────
// Verifies the current password by re-signing in. Returns an error string or null.
async function verifyCurrentPassword(email, currentPassword) {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  })
  if (error) return 'Current password is incorrect.'
  return null
}

// ─── Individual form: Change Email ───────────────────────────────────────────
function ChangeEmailForm({ currentEmail }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newEmail, setNewEmail]               = useState('')
  const [status, setStatus]                   = useState(null)   // null | 'loading' | 'success' | 'error'
  const [message, setMessage]                 = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!newEmail || newEmail === currentEmail) {
      setStatus('error')
      setMessage('Please enter a different email address.')
      return
    }
    if (!currentPassword) {
      setStatus('error')
      setMessage('Please enter your current password to continue.')
      return
    }

    setStatus('loading')
    setMessage('')

    // Step 1 — verify current password
    const authError = await verifyCurrentPassword(currentEmail, currentPassword)
    if (authError) {
      setStatus('error')
      setMessage(authError)
      return
    }

    // Step 2 — update email
    const { error } = await supabase.auth.updateUser({ email: newEmail })

    if (error) {
      setStatus('error')
      setMessage(error.message || 'Failed to update email.')
    } else {
      setStatus('success')
      setMessage(`A confirmation link has been sent to ${newEmail}. Check your inbox to complete the change.`)
      setCurrentPassword('')
      setNewEmail('')
    }
  }

  return (
    <form className="profile-form" onSubmit={handleSubmit}>
      {/* Current email — read-only */}
      <div className="profile-form-group">
        <label className="profile-label">Current email</label>
        <div className="profile-readonly-field">{currentEmail}</div>
      </div>

      {/* Current password — required for verification */}
      <div className="profile-form-group">
        <label className="profile-label" htmlFor="email-current-password">
          Current password
        </label>
        <input
          id="email-current-password"
          className="profile-input"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Enter your current password"
          autoComplete="current-password"
          disabled={status === 'loading'}
          required
        />
      </div>

      {/* New email */}
      <div className="profile-form-group">
        <label className="profile-label" htmlFor="profile-new-email">New email</label>
        <input
          id="profile-new-email"
          className="profile-input"
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="new@email.com"
          autoComplete="email"
          disabled={status === 'loading'}
          required
        />
      </div>

      {message && (
        <div className={`profile-message profile-message--${status}`}>
          {message}
        </div>
      )}

      <button
        id="btn-save-email"
        className="profile-save-btn"
        type="submit"
        disabled={status === 'loading'}
      >
        {status === 'loading' ? 'Verifying…' : 'Update Email'}
      </button>
    </form>
  )
}

// ─── Individual form: Change Password ────────────────────────────────────────
function ChangePasswordForm({ currentEmail }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword]         = useState('')
  const [confirm, setConfirm]                 = useState('')
  const [status, setStatus]                   = useState(null)
  const [message, setMessage]                 = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!currentPassword) {
      setStatus('error')
      setMessage('Please enter your current password to continue.')
      return
    }
    if (newPassword.length < 6) {
      setStatus('error')
      setMessage('New password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirm) {
      setStatus('error')
      setMessage('Passwords do not match.')
      return
    }
    if (newPassword === currentPassword) {
      setStatus('error')
      setMessage('New password must be different from your current password.')
      return
    }

    setStatus('loading')
    setMessage('')

    // Step 1 — verify current password
    const authError = await verifyCurrentPassword(currentEmail, currentPassword)
    if (authError) {
      setStatus('error')
      setMessage(authError)
      return
    }

    // Step 2 — update password
    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      setStatus('error')
      setMessage(error.message || 'Failed to update password.')
    } else {
      setStatus('success')
      setMessage('Password updated successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirm('')
    }
  }

  return (
    <form className="profile-form" onSubmit={handleSubmit}>
      {/* Current password — required for verification */}
      <div className="profile-form-group">
        <label className="profile-label" htmlFor="pw-current-password">
          Current password
        </label>
        <input
          id="pw-current-password"
          className="profile-input"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Enter your current password"
          autoComplete="current-password"
          disabled={status === 'loading'}
          required
        />
      </div>

      <div className="profile-form-divider" aria-hidden="true" />

      {/* New password */}
      <div className="profile-form-group">
        <label className="profile-label" htmlFor="profile-new-password">New password</label>
        <input
          id="profile-new-password"
          className="profile-input"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="At least 6 characters"
          autoComplete="new-password"
          disabled={status === 'loading'}
          minLength={6}
          required
        />
      </div>

      {/* Confirm new password */}
      <div className="profile-form-group">
        <label className="profile-label" htmlFor="profile-confirm-password">
          Confirm new password
        </label>
        <input
          id="profile-confirm-password"
          className="profile-input"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repeat your new password"
          autoComplete="new-password"
          disabled={status === 'loading'}
          required
        />
      </div>

      {message && (
        <div className={`profile-message profile-message--${status}`}>
          {message}
        </div>
      )}

      <button
        id="btn-save-password"
        className="profile-save-btn"
        type="submit"
        disabled={status === 'loading'}
      >
        {status === 'loading' ? 'Verifying…' : 'Update Password'}
      </button>
    </form>
  )
}

// ─── Root component ───────────────────────────────────────────────────────────
export default function ProfileSettings({ session, onClose }) {
  const [activeSection, setActiveSection] = useState('email')  // 'email' | 'password'

  return (
    // Backdrop — click outside to close
    <div
      className="profile-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Profile Settings"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="profile-panel">
        {/* Header */}
        <div className="profile-header">
          <div className="profile-header-left">
            <div className="profile-avatar" aria-hidden="true">
              {session?.user?.email?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div>
              <h2 className="profile-title">Profile Settings</h2>
              <p className="profile-subtitle">{session?.user?.email}</p>
            </div>
          </div>
          <button
            id="btn-close-profile"
            className="profile-close-btn"
            onClick={onClose}
            aria-label="Close profile settings"
          >
            ✕
          </button>
        </div>

        {/* Section tabs */}
        <div className="profile-tabs" role="tablist">
          <button
            id="tab-change-email"
            className={`profile-tab${activeSection === 'email' ? ' profile-tab--active' : ''}`}
            role="tab"
            aria-selected={activeSection === 'email'}
            onClick={() => setActiveSection('email')}
          >
            Change Email
          </button>
          <button
            id="tab-change-password"
            className={`profile-tab${activeSection === 'password' ? ' profile-tab--active' : ''}`}
            role="tab"
            aria-selected={activeSection === 'password'}
            onClick={() => setActiveSection('password')}
          >
            Change Password
          </button>
        </div>

        {/* Form area */}
        <div className="profile-body">
          {activeSection === 'email' ? (
            <ChangeEmailForm currentEmail={session?.user?.email ?? ''} />
          ) : (
            <ChangePasswordForm currentEmail={session?.user?.email ?? ''} />
          )}
        </div>
      </div>
    </div>
  )
}
