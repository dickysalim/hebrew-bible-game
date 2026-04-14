import { useState, useEffect } from 'react'
import GamePanel from './components/GamePanel'
import LexiconPanel from './components/LexiconPanel'
import ProgressPanel from './components/ProgressPanel'
import TabBar from './components/TabBar'

export default function App() {
  const [activeTab, setActiveTab] = useState('main')

  // Handle keyboard shortcuts for tab switching
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+1, Ctrl+2, Ctrl+3 for tab switching
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '1') {
          e.preventDefault()
          setActiveTab('main')
        } else if (e.key === '2') {
          e.preventDefault()
          setActiveTab('lexicon')
        } else if (e.key === '3') {
          e.preventDefault()
          setActiveTab('progress')
        }
      }
      
      // Arrow key navigation for tab cycling (when not in GamePanel typing mode)
      // Only activate when not typing Hebrew letters (no modifier keys)
      if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault()
          const tabs = ['main', 'lexicon', 'progress']
          const currentIndex = tabs.indexOf(activeTab)
          const nextIndex = (currentIndex + 1) % tabs.length
          setActiveTab(tabs[nextIndex])
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault()
          const tabs = ['main', 'lexicon', 'progress']
          const currentIndex = tabs.indexOf(activeTab)
          const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length
          setActiveTab(tabs[prevIndex])
        }
      }
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
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="tab-content">
        {renderActiveTab()}
      </div>
    </div>
  )
}
