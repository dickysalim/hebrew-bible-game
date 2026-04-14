import { useState, useEffect } from 'react'
import GamePanel from './components/main/GamePanel'
import LexiconPanel from './components/lexicon/LexiconPanel'
import ProgressPanel from './components/progress/ProgressPanel'
import TabBar from './components/TabBar'
import { useRootDiscovery } from './contexts/RootDiscoveryContext'

export default function App() {
  const [activeTab, setActiveTab] = useState('main')
  const { newRoots } = useRootDiscovery()

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

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'main':
        return <GamePanel />
      case 'lexicon':
        return <LexiconPanel />
      case 'progress':
        return <ProgressPanel />
      default:
        return <GamePanel />
    }
  }

  return (
    <div className="app-container">
      <TabBar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        newRootsCount={newRoots.length}
      />
      <div className="tab-content">
        {renderActiveTab()}
      </div>
    </div>
  )
}
