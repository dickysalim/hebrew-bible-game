import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
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

// Tab id ↔ URL segment mapping
const TAB_PATHS = {
  main:         '/game',
  full_chapter: '/game/chapter',
  lexicon:      '/game/lexicon',
  progress:     '/game/progress',
}

const PATH_TO_TAB = Object.fromEntries(
  Object.entries(TAB_PATHS).map(([tab, path]) => [path, tab])
)

// Derive active tab from current pathname
function tabFromPath(pathname) {
  return PATH_TO_TAB[pathname] ?? 'main'
}

// ─── Game layout with TabBar ────────────────────────────────────────────────
function GameLayout({ session, jumpToStageIndex, onBackToMenu }) {
  const { newRoots } = useRootDiscovery()
  const { cacheStatus } = useProgressCache()
  const navigate = useNavigate()
  const location = useLocation()

  const activeTab = tabFromPath(location.pathname)

  const handleTabChange = (tabId) => {
    navigate(TAB_PATHS[tabId] ?? '/game')
  }

  if (cacheStatus === 'loading') {
    return (
      <div className="app-container">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Loading your progress...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app-container">
      <TabBar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        newRootsCount={newRoots.length}
        onBackToMenu={onBackToMenu}
      />
      <div className="tab-content">
        <Routes>
          {/* Paths here are relative to the /game/* parent route */}
          <Route index element={<GamePanel userId={session?.user?.id} jumpToStageIndex={jumpToStageIndex} />} />
          <Route path="chapter"  element={<FullChapter />} />
          <Route path="lexicon"  element={<LexiconPanel />} />
          <Route path="progress" element={<ProgressPanel />} />
          {/* Fallback to reading tab */}
          <Route path="*" element={<Navigate to="/game" replace />} />
        </Routes>
      </div>
    </div>
  )
}

// ─── Root app ────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  // stageIndex to jump GamePanel to (from chapter-select), or null (continue from saved)
  const [jumpToStageIndex, setJumpToStageIndex] = useState(null)

  const navigate = useNavigate()

  // Auth bootstrapping
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

  // Keyboard shortcuts: Ctrl/Cmd + 1-4 for tab switching
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        const shortcuts = { '1': '/game', '2': '/game/chapter', '3': '/game/lexicon', '4': '/game/progress' }
        if (shortcuts[e.key]) {
          e.preventDefault()
          navigate(shortcuts[e.key])
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate])

  const handleEnterMidrash = () => {
    setJumpToStageIndex(null)
    navigate('/game')
  }

  const handleSelectChapter = (chapter) => {
    const si = stageIndexFromId(chapter.id)
    setJumpToStageIndex(si)
    navigate('/game')
  }

  const handleLearnAlphabet = () => {
    navigate('/alphabet')
  }

  const handleBackToMenu = () => {
    navigate('/')
  }

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
                  onLearnAlphabet={handleLearnAlphabet}
                  onSignOut={() => supabase.auth.signOut()}
                />
              </div>
            }
          />

          {/* Alphabet Hub + Levels */}
          <Route
            path="/alphabet/*"
            element={
              <div className="app-container">
                <AlphabetHub onBack={handleBackToMenu} />
              </div>
            }
          />

          {/* Game (Reading, Chapter, Lexicon, Progress tabs) */}
          <Route
            path="/game/*"
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
