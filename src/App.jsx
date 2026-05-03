import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import GamePanel from './components/main/GamePanel'
import LexiconPanel from './components/lexicon/LexiconPanel'
import ProgressPanel from './components/progress/ProgressPanel'
import FullChapter from './components/full_chapter/FullChapter'
import TabBar from './components/TabBar'
import AuthScreen from './components/ui/AuthScreen'
import MainMenu from './components/ui/MainMenu'
import AlphabetHub from './components/alphabet/AlphabetHub'
import { RootDiscoveryProvider, useRootDiscovery } from './contexts/RootDiscoveryContext'
import { ProgressCacheProvider, useProgressCache } from './contexts/ProgressCacheContext'
import { NotesProvider } from './contexts/NotesContext'
import { supabase } from './lib/supabase'
import { stageIndexFromId } from './utils/useChapterLoader'
import { primeLexiconCache } from './lib/lexiconCache'

// Warm up the lexicon cache immediately — data will be ready before the game loads
primeLexiconCache().catch(console.error)

// ─── Set New Password Screen (shown after user clicks reset email link) ─────
function SetNewPasswordScreen({ onDone }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setSuccess(true)
      setTimeout(onDone, 2000)
    } catch (err) {
      setError(err.message || 'Failed to update password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-container">
        {success ? (
          <div className="confirmation-message">
            <h2 className="auth-title">Password Updated!</h2>
            <p className="auth-subtitle">Your password has been changed successfully.</p>
            <p>Redirecting you to the game...</p>
          </div>
        ) : (
          <>
            <h2 className="auth-title">Set New Password</h2>
            <p className="auth-subtitle">Choose a new password for your account.</p>
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="new-password">New Password</label>
                <input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  disabled={loading}
                  minLength={6}
                />
              </div>
              <div className="form-group">
                <label htmlFor="confirm-password">Confirm Password</label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat your new password"
                  required
                  disabled={loading}
                />
              </div>
              {error && <div className="auth-error">{error}</div>}
              <button type="submit" className="auth-button" disabled={loading}>
                {loading ? 'Updating...' : 'Set New Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Main Menu wrapper — reads resetProgress from context ────────────────────
function MainMenuWrapper({ session, onEnterMidrash, onSelectChapter, onLearnAlphabet, onSignOut }) {
  const { resetProgress } = useProgressCache()
  return (
    <div className="app-container">
      <MainMenu
        session={session}
        onEnterMidrash={onEnterMidrash}
        onSelectChapter={onSelectChapter}
        onLearnAlphabet={onLearnAlphabet}
        onSignOut={onSignOut}
        onResetProgress={resetProgress}
      />
    </div>
  )
}

// ─── Game layout — tabs are internal state, URL is just /game ────────────────
function GameLayout({ session, jumpToStageIndex, onBackToMenu }) {
  const { newRoots } = useRootDiscovery()
  const { cacheStatus } = useProgressCache()
  const [activeTab, setActiveTab] = useState('main')

  // Keyboard shortcuts: Ctrl/Cmd + 1-4
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        const map = { '1': 'main', '2': 'full_chapter', '3': 'lexicon', '4': 'progress' }
        if (map[e.key]) { e.preventDefault(); setActiveTab(map[e.key]) }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (cacheStatus === 'idle' || cacheStatus === 'loading') {
    return (
      <div className="app-container">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Loading your progress...</p>
        </div>
      </div>
    )
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'main':         return <GamePanel userId={session?.user?.id} jumpToStageIndex={jumpToStageIndex} />
      case 'full_chapter': return <FullChapter />
      case 'lexicon':      return <LexiconPanel />
      case 'progress':     return <ProgressPanel />
      default:             return <GamePanel userId={session?.user?.id} jumpToStageIndex={jumpToStageIndex} />
    }
  }

  return (
    <div className="app-container">
      <TabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        newRootsCount={newRoots.length}
        onBackToMenu={onBackToMenu}
      />
      <div className="tab-content">
        {renderTab()}
      </div>
    </div>
  )
}

// ─── Root app ────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [jumpToStageIndex, setJumpToStageIndex] = useState(null)
  const [recoveryMode, setRecoveryMode] = useState(false)

  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (_event === 'PASSWORD_RECOVERY') {
        setRecoveryMode(true)
      } else if (_event === 'USER_UPDATED') {
        setRecoveryMode(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleEnterMidrash = () => {
    setJumpToStageIndex(null)
    navigate('/game')
  }

  const handleSelectChapter = (chapter) => {
    setJumpToStageIndex(stageIndexFromId(chapter.id))
    navigate('/game')
  }

  const handleBackToMenu = () => navigate('/')

  if (loading) {
    return (
      <div className="app-container">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Loading Hebrew Bible Game...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="app-container">
        <AuthScreen onAuthSuccess={() => {}} />
      </div>
    )
  }

  // User clicked reset link in email → show set new password screen
  if (recoveryMode && session) {
    return (
      <div className="app-container">
        <SetNewPasswordScreen onDone={() => setRecoveryMode(false)} />
      </div>
    )
  }

  return (
    <ProgressCacheProvider userId={session?.user?.id}>
      <NotesProvider userId={session?.user?.id}>
        <RootDiscoveryProvider userId={session?.user?.id}>
          <Routes>
            {/* Main Menu */}
            <Route
              path="/"
              element={
                <MainMenuWrapper
                  session={session}
                  onEnterMidrash={handleEnterMidrash}
                  onSelectChapter={handleSelectChapter}
                  onLearnAlphabet={() => navigate('/alphabet')}
                  onSignOut={() => supabase.auth.signOut()}
                />
              }
            />

            {/* Alphabet Hub + Levels (/alphabet, /alphabet/level/1–5) */}
            <Route
              path="/alphabet/*"
              element={
                <div className="app-container">
                  <AlphabetHub onBack={handleBackToMenu} />
                </div>
              }
            />

            {/* Game — single path, tabs are internal state */}
            <Route
              path="/game"
              element={
                <GameLayout
                  session={session}
                  jumpToStageIndex={jumpToStageIndex}
                  onBackToMenu={handleBackToMenu}
                />
              }
            />

            {/* Catch-all → Main Menu */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </RootDiscoveryProvider>
      </NotesProvider>
    </ProgressCacheProvider>
  )
}
