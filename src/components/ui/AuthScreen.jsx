import { useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'

export default function AuthScreen({ onAuthSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')
  
  // Rate limiting state
  const lastAttemptTime = useRef(0)
  const attemptCount = useRef(0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    // Client-side rate limiting
    const now = Date.now()
    const timeSinceLastAttempt = now - lastAttemptTime.current
    
    // Reset attempt count if it's been more than 5 minutes
    if (timeSinceLastAttempt > 5 * 60 * 1000) {
      attemptCount.current = 0
    }
    
    // Check if user is trying too fast
    if (timeSinceLastAttempt < 10000) { // 10 seconds between attempts
      setError('Please wait 10 seconds between attempts')
      return
    }
    
    // Check if too many attempts
    if (attemptCount.current >= 5) {
      setError('Too many attempts. Please wait 5 minutes and try again.')
      return
    }
    
    // Update rate limiting counters
    lastAttemptTime.current = now
    attemptCount.current += 1
    
    setLoading(true)

    try {
      if (isSignUp) {
        // Sign up
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          }
        })
        
        if (error) {
          // Handle specific Supabase errors
          if (error.message.includes('rate limit') ||
              error.message.includes('too many requests') ||
              error.message.includes('429')) {
            throw new Error('Email rate limit exceeded. Please wait a few minutes and try again.')
          }
          throw error
        }
        
        if (data.user) {
          // Show confirmation message instead of calling onAuthSuccess()
          setShowConfirmation(true)
          setRegisteredEmail(email)
          // Clear form fields
          setEmail('')
          setPassword('')
          // Reset attempt count on successful registration
          attemptCount.current = 0
        }
      } else {
        // Sign in
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        
        if (error) {
          // Check for email confirmation error
          if (error.message.includes('Email not confirmed') || error.message.includes('confirm')) {
            throw new Error('Please confirm your email before logging in. Check your inbox for the confirmation link.')
          }
          // Handle rate limit errors for login too
          if (error.message.includes('rate limit') ||
              error.message.includes('too many requests') ||
              error.message.includes('429')) {
            throw new Error('Too many login attempts. Please wait a few minutes and try again.')
          }
          throw error
        }
        
        if (data.user) {
          onAuthSuccess()
          // Reset attempt count on successful login
          attemptCount.current = 0
        }
      }
    } catch (err) {
      // Format error message for better user experience
      let errorMessage = err.message || 'Authentication failed'
      
      // Handle specific error types
      if (errorMessage.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please try again.'
      } else if (errorMessage.includes('User already registered')) {
        errorMessage = 'An account with this email already exists. Please sign in instead.'
      } else if (errorMessage.includes('Password should be at least 6 characters')) {
        errorMessage = 'Password must be at least 6 characters long.'
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      })
      if (error) throw error
      setResetEmail(email)
      setResetSent(true)
      setEmail('')
    } catch (err) {
      setError(err.message || 'Failed to send reset email. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-container">
        
        {/* ── Forgot password: email sent confirmation ── */}
        {isForgotPassword && resetSent ? (
          <div className="confirmation-message">
            <h2 className="auth-title">Check Your Email</h2>
            <p className="auth-subtitle">
              We've sent a password reset link to <strong>{resetEmail}</strong>
            </p>
            <p>
              Click the link in the email to choose a new password.
              The link expires in 1 hour.
            </p>
            <div className="confirmation-hints">
              <p className="confirmation-hint">
                <small><strong>Didn't receive the email?</strong></small>
              </p>
              <ul className="confirmation-hint-list">
                <li><small>Check your spam or junk folder</small></li>
                <li><small>Make sure you entered the correct email address</small></li>
                <li><small>Wait a few minutes — emails can sometimes be delayed</small></li>
              </ul>
            </div>
            <button
              type="button"
              className="auth-button"
              onClick={() => {
                setIsForgotPassword(false)
                setResetSent(false)
              }}
            >
              Back to Sign In
            </button>
          </div>

        ) : isForgotPassword ? (
          /* ── Forgot password: email input form ── */
          <>
            <h2 className="auth-title">Reset Password</h2>
            <p className="auth-subtitle">
              Enter your email and we'll send you a link to reset your password.
            </p>
            <form onSubmit={handleForgotPassword} className="auth-form">
              <div className="form-group">
                <label htmlFor="reset-email">Email</label>
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  disabled={loading}
                />
              </div>
              {error && <div className="auth-error">{error}</div>}
              <button type="submit" className="auth-button" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
            <div className="auth-toggle">
              <p>
                Remember your password?
                <button
                  type="button"
                  className="toggle-button"
                  onClick={() => { setIsForgotPassword(false); setError('') }}
                  disabled={loading}
                >
                  Back to Sign In
                </button>
              </p>
            </div>
          </>

        ) : showConfirmation ? (
          /* ── Sign-up email confirmation ── */
          <div className="confirmation-message">
            <h2 className="auth-title">Check Your Email</h2>
            <p className="auth-subtitle">
              We've sent a confirmation email to <strong>{registeredEmail}</strong>
            </p>
            <p>
              Please check your inbox and click the confirmation link to activate your account.
              Once confirmed, you can sign in to access the game.
            </p>
            <div className="confirmation-hints">
              <p className="confirmation-hint">
                <small>
                  <strong>Didn't receive the email?</strong>
                </small>
              </p>
              <ul className="confirmation-hint-list">
                <li>
                  <small>Check your spam or junk folder</small>
                </li>
                <li>
                  <small>Make sure you entered the correct email address</small>
                </li>
                <li>
                  <small>Wait a few minutes - emails can sometimes be delayed</small>
                </li>
                <li>
                  <small>If you still don't see it, you can try again in 10 minutes</small>
                </li>
              </ul>
            </div>
            <button
              type="button"
              className="auth-button"
              onClick={() => {
                setShowConfirmation(false)
                setIsSignUp(false)
              }}
            >
              Go back to login
            </button>
          </div>
        ) : (
          <>
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
                {!isSignUp && (
                  <button
                    type="button"
                    className="forgot-password-link"
                    onClick={() => { setIsForgotPassword(true); setError('') }}
                    disabled={loading}
                  >
                    Forgot password?
                  </button>
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
          </>
        )}
      </div>
    </div>
  )
}