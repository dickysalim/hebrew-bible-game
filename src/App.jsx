import { useState, useEffect } from 'react'
import GamePanel from './components/main/GamePanel'
import LexiconPanel from './components/lexicon/LexiconPanel'
import ProgressPanel from './components/progress/ProgressPanel'
import FullChapter from './components/full_chapter/FullChapter'
import TabBar from './components/TabBar'
import AuthScreen from './components/ui/AuthScreen'
import MainMenu from './components/ui/MainMenu'
import AlphabetHub from './components/alphabet/AlphabetHub'
import { RootDiscoveryProvider, useRootDiscovery } from './contexts/RootDiscoveryContext'
import { supabase } from './lib/supabase'

// Component for authenticated app content
function AuthenticatedApp({ session, activeTab, onTabChange, renderActiveTab, onBackToMenu }) {
  const { newRoots } = useRootDiscovery()
  
  return (
    <div className="app-container">
      <div className="auth-header">
        <div className="user-info">
          <span className="user-email">{session.user.email}</span>
          <button
            className="sign-out-button"
            onClick={() => supabase.auth.signOut()}
          >
            Sign Out
          </button>
        </div>
      </div>
      <TabBar
        activeTab={activeTab}
        onTabChange={onTabChange}
        newRootsCount={newRoots.length}
        onBackToMenu={onBackToMenu}
      />
      <div className="tab-content">
        {renderActiveTab()}
      </div>
    </div>
  )
}

export default function App() {
  const [activeTab, setActiveTab] = useState('main')
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  // 'mainMenu' | 'game' | 'alphabet'
  const [screen, setScreen] = useState('mainMenu')
  // chapter to start GamePanel on: { id, chapter } or null (continue)
  const [startChapter, setStartChapter] = useState(null)

  // Check for existing session on mount and listen for auth changes
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Handle tab change — badge is cleared by LexiconPanel on mount
  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
  }

  // Handle keyboard shortcuts for tab switching
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+1, Ctrl+2, Ctrl+3 for tab switching
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '1') {
          e.preventDefault()
          handleTabChange('main')
        } else if (e.key === '2') {
          e.preventDefault()
          handleTabChange('lexicon')
        } else if (e.key === '3') {
          e.preventDefault()
          handleTabChange('progress')
        }
      }
      // Arrow keys are handled by GamePanel for verse navigation
      // TabBar navigation is mouse-only as per requirements
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeTab])

  const handleAuthSuccess = () => {
    // Auth successful, session will be updated via onAuthStateChange
  }

  const handleEnterMidrash = () => {
    setStartChapter(null) // continue from saved progress
    setScreen('game')
  }

  const handleSelectChapter = (chapter) => {
    setStartChapter(chapter)
    setScreen('game')
  }

  const handleLearnAlphabet = () => {
    setScreen('alphabet')
  }

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'main':
        return <GamePanel userId={session?.user?.id} startChapter={startChapter} />
      case 'full_chapter':
        return <FullChapter />
      case 'lexicon':
        return <LexiconPanel />
      case 'progress':
        return <ProgressPanel />
      default:
        return <GamePanel userId={session?.user?.id} startChapter={startChapter} />
    }
  }

  // Wrap everything in RootDiscoveryProvider
  return (
    <RootDiscoveryProvider userId={session?.user?.id}>
      {loading ? (
        <div className="app-container">
          <div className="loading-screen">
            <div className="loading-spinner"></div>
            <p>Loading Hebrew Bible Game...</p>
          </div>
        </div>
      ) : !session ? (
        <div className="app-container">
          <AuthScreen onAuthSuccess={handleAuthSuccess} />
        </div>
      ) : screen === 'mainMenu' ? (
        <div className="app-container">
          <MainMenu
            session={session}
            onEnterMidrash={handleEnterMidrash}
            onSelectChapter={handleSelectChapter}
            onLearnAlphabet={handleLearnAlphabet}
          />
        </div>
      ) : screen === 'alphabet' ? (
        <div className="app-container">
          <AlphabetHub onBack={() => setScreen('mainMenu')} />
        </div>
      ) : (
        <AuthenticatedApp
          session={session}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          renderActiveTab={renderActiveTab}
          onBackToMenu={() => setScreen('mainMenu')}
        />
      )}
    </RootDiscoveryProvider>
  )
}
