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
import { supabase } from './lib/supabase'
import { stageIndexFromId } from './utils/useChapterLoader'

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

  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
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

  return (
    <ProgressCacheProvider userId={session?.user?.id}>
      <RootDiscoveryProvider userId={session?.user?.id}>
        <Routes>
          {/* Main Menu */}
          <Route
            path="/"
            element={
              <div className="app-container">
                <MainMenu
                  session={session}
                  onEnterMidrash={handleEnterMidrash}
                  onSelectChapter={handleSelectChapter}
                  onLearnAlphabet={() => navigate('/alphabet')}
                  onSignOut={() => supabase.auth.signOut()}
                />
              </div>
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
    </ProgressCacheProvider>
  )
}
