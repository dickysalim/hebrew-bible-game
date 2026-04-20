import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../lib/supabase'
import './HaberPanel.css'

export default function HaberPanel({ currentWordContext, haberSessions, setHaberSessions }) {
  const [haberLoading, setHaberLoading] = useState(false)
  const [inputText, setInputText] = useState('')
  const [haberError, setHaberError] = useState(null)
  const messagesEndRef = useRef(null)

  const wordId = currentWordContext?.id
  const messages = haberSessions[wordId] || []

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const callHaber = async (msgs, wordCtx, userId) => {
    setHaberLoading(true)
    setHaberError(null)

    try {
      const response = await fetch('http://localhost:3001/api/haber', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, currentWord: wordCtx, messages: msgs })
      })

      const data = await response.json()
      const haberMessage = { role: 'assistant', content: data.message }

      setHaberSessions(prev => ({
        ...prev,
        [wordCtx.id]: [...msgs, haberMessage]
      }))
    } catch (error) {
      console.error('Haber unavailable:', error)
      setHaberError('Haber is unavailable right now. Try again.')
    } finally {
      setHaberLoading(false)
    }
  }

  const openHaber = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const wordCtx = { ...currentWordContext, isRevisit: false }
    await callHaber([], wordCtx, user.id)
  }

  const sendMessage = async (text) => {
    if (!text.trim() || haberLoading) return

    const { data: { user } } = await supabase.auth.getUser()
    const userMessage = { role: 'user', content: text.trim() }
    const currentHistory = haberSessions[wordId] || []
    const updatedMessages = [...currentHistory, userMessage]

    setHaberSessions(prev => ({ ...prev, [wordId]: updatedMessages }))
    setInputText('')

    const wordCtx = { ...currentWordContext, isRevisit: true }
    await callHaber(updatedMessages, wordCtx, user.id)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(inputText)
    }
  }

  if (messages.length === 0 && !haberLoading) {
    return (
      <div className="haber-panel haber-invite">
        <div className="haber-invite-content">
          <div className="haber-invite-hebrew">{currentWordContext.id}</div>
          <div className="haber-invite-sbl">{currentWordContext.sbl}</div>
          <p className="haber-invite-text">Invite Haber to wrestle this word with you</p>
          {haberError && <p className="haber-error">{haberError}</p>}
          <button className="haber-begin-btn" onClick={openHaber}>Begin</button>
        </div>
      </div>
    )
  }

  if (messages.length === 0 && haberLoading) {
    return (
      <div className="haber-panel haber-loading-initial">
        <div className="haber-thinking">
          <span className="haber-thinking-dot"></span>
          <span className="haber-thinking-dot"></span>
          <span className="haber-thinking-dot"></span>
        </div>
      </div>
    )
  }

  return (
    <div className="haber-panel haber-conversation">
      <div className="haber-name-label">Haber</div>

      <div className="haber-messages">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`haber-message ${msg.role === 'assistant' ? 'haber-msg-assistant' : 'haber-msg-user'}`}
          >
            <p className="haber-msg-text">{msg.content}</p>
          </div>
        ))}
        {haberLoading && (
          <div className="haber-message haber-msg-assistant">
            <div className="haber-thinking-inline">
              <span className="haber-thinking-dot"></span>
              <span className="haber-thinking-dot"></span>
              <span className="haber-thinking-dot"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {haberError && <p className="haber-error">{haberError}</p>}

      <div className="haber-input-area">
        <input
          type="text"
          className="haber-input"
          placeholder="Wrestle with it..."
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={haberLoading}
        />
        <button
          className="haber-send-btn"
          onClick={() => sendMessage(inputText)}
          disabled={haberLoading || !inputText.trim()}
        >
          →
        </button>
      </div>
    </div>
  )
}
