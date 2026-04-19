import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function AuthScreen({ onAuthSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isSignUp) {
        // Sign up
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        // Note: In production, you might want to handle email confirmation
        // For now, we'll treat successful signup as authentication
        if (data.user) {
          onAuthSuccess()
        }
      } else {
        // Sign in
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        if (data.user) {
          onAuthSuccess()
        }
      }
    } catch (err) {
      setError(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-container">
        <h2 className="auth-title">{isSignUp ? 'Create Account' : 'Sign In'}</h2>
        <p className="auth-subtitle">
          {isSignUp 
            ? 'Create an account to save your Hebrew learning progress across devices'
            : 'Sign in to access your saved Hebrew learning progress'}
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isSignUp ? 'Choose a secure password' : 'Enter your password'}
              required
              disabled={loading}
              minLength={isSignUp ? 6 : undefined}
            />
            {isSignUp && (
              <small className="password-hint">At least 6 characters</small>
            )}
          </div>

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="auth-button"
            disabled={loading}
          >
            {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div className="auth-toggle">
          <p>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            <button
              type="button"
              className="toggle-button"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError('')
              }}
              disabled={loading}
            >
              {isSignUp ? 'Sign In' : 'Create Account'}
            </button>
          </p>
        </div>

        <div className="auth-note">
          <p>
            <small>
              Your progress will be saved to the cloud and accessible from any device.
              You can continue playing without an account, but progress will only be saved locally.
            </small>
          </p>
        </div>
      </div>
    </div>
  )
}