import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../lib/supabase'
import './HaberPanel.css'

// ── Thinking animation ────────────────────────────────────────────────────────

const ALL_PHRASES = [
  'Transliterating...', 'Rootfinding...', 'Consonant-diving...', 'Nikud-reading...',
  'Etymologizing...', 'Lexiconing...', 'Shoreshing...', 'Talmudizing...',
  'Concordancing...', 'Midrashing...', 'Babylonianizing...', 'Ancient-Nearing...',
  'Scrollsearching...', 'Grappling...', 'Prevailing...', 'Jabbokking...',
  'Yadadaating...', 'Deepdiving...', 'Textanchoring...', 'Abyssgazing...',
  'Chevrutaing...', 'Partnering...', 'Companioning...', 'Habering...',
  'Pilpulling...', 'Qushyaing...', 'Hiddushing...', 'Hovering...',
  'Tohu-ing...', 'Vavohu-ing...', 'Faceofthedeeping...', 'Formlessnessing...',
  'Voidconsidering...', 'Tehomstaring...', 'Consonanting...', 'Vowelpointguessing...',
  'Masoreticizing...', 'Septuaginting...', 'Leningradding...', 'Scrollunrolling...',
  'Ancientwhispering...',
]

const SCRAMBLE_POOL = 'abcdefghijklmnopqrstuvwxyz-.'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function randChar() {
  return SCRAMBLE_POOL[Math.floor(Math.random() * SCRAMBLE_POOL.length)]
}

// Animation phases:
//   typing   — type out first word char by char
//   holding  — word fully shown, wait, then set up next morph
//   morphing — scramble from rightmost position leftward into next word
function useThinkingAnimation(active) {
  const [display, setDisplay] = useState('')
  const animRef = useRef(null)

  useEffect(() => {
    if (!active) {
      setDisplay('')
      animRef.current = null
      return
    }

    const words = shuffle(ALL_PHRASES)
    animRef.current = {
      words,
      wordIdx: 0,
      phase: 'typing',
      typingPos: 0,
      morphPos: -1,
      scrambleStep: 0,
      chars: [],
    }

    let timer

    const tick = () => {
      const a = animRef.current
      if (!a) return

      const cur = a.words[a.wordIdx]
      const nxt = a.words[(a.wordIdx + 1) % a.words.length]

      // ── TYPING: reveal current word char by char ──
      if (a.phase === 'typing') {
        a.chars = cur.slice(0, a.typingPos + 1).split('')
        setDisplay(a.chars.join(''))
        a.typingPos++
        if (a.typingPos >= cur.length) {
          a.phase = 'holding'
          timer = setTimeout(tick, 750)
        } else {
          timer = setTimeout(tick, 65)
        }
        return
      }

      // ── HOLDING: brief pause then set up morph ──
      if (a.phase === 'holding') {
        a.phase = 'morphing'
        a.morphPos = 0
        a.morphMax = Math.max(cur.length, nxt.length)
        a.scrambleStep = 0
        timer = setTimeout(tick, 50)
        return
      }

      // ── MORPHING: replace chars left→right into next word ──
      if (a.phase === 'morphing') {
        if (a.morphPos >= a.morphMax) {
          // Morph done — advance to next word and hold
          a.wordIdx = (a.wordIdx + 1) % a.words.length
          a.phase = 'holding'
          timer = setTimeout(tick, 750)
          return
        }

        if (a.scrambleStep < 3) {
          // Scramble frame: random char at this position
          const chars = [...a.chars]
          while (chars.length <= a.morphPos) chars.push('')
          chars[a.morphPos] = randChar()
          a.chars = chars
          setDisplay(chars.join(''))
          a.scrambleStep++
          timer = setTimeout(tick, 26)
        } else {
          // Settle on target char (empty string if new word is shorter)
          const target = nxt[a.morphPos] ?? ''
          const chars = [...a.chars]
          while (chars.length <= a.morphPos) chars.push('')
          chars[a.morphPos] = target
          // Trim trailing empty positions
          while (chars.length > 0 && chars[chars.length - 1] === '') chars.pop()
          a.chars = chars
          setDisplay(chars.join(''))
          a.morphPos++
          a.scrambleStep = 0
          timer = setTimeout(tick, 38)
        }
      }
    }

    timer = setTimeout(tick, 65)
    return () => {
      clearTimeout(timer)
      animRef.current = null
    }
  }, [active])

  return display
}

// ── Message typeout speed ─────────────────────────────────────────────────────

const MSG_TYPE_SPEED = 11

// ── Component ─────────────────────────────────────────────────────────────────

export default function HaberPanel({ currentWordContext, haberSessions, setHaberSessions, onClose }) {
  const [haberLoading, setHaberLoading] = useState(false)
  const [inputText, setInputText] = useState('')
  const [haberError, setHaberError] = useState(null)
  const [animatingMsgIdx, setAnimatingMsgIdx] = useState(-1)
  const [animatedCharCount, setAnimatedCharCount] = useState(0)
  const prevMsgCountRef = useRef(0)
  const messagesEndRef = useRef(null)

  const wordId = currentWordContext?.id
  const messages = haberSessions[wordId] || []
  const thinkingText = useThinkingAnimation(haberLoading)

  // Auto-scroll on new content
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, animatedCharCount])

  // Kick off typewriter when a new assistant message arrives
  useEffect(() => {
    if (messages.length > prevMsgCountRef.current) {
      const last = messages[messages.length - 1]
      if (last?.role === 'assistant') {
        setAnimatingMsgIdx(messages.length - 1)
        setAnimatedCharCount(0)
      }
      prevMsgCountRef.current = messages.length
    }
  }, [messages])

  // Typewriter tick
  useEffect(() => {
    if (animatingMsgIdx === -1) return
    const target = messages[animatingMsgIdx]
    if (!target) return
    if (animatedCharCount < target.content.length) {
      const t = setTimeout(() => setAnimatedCharCount(c => c + 1), MSG_TYPE_SPEED)
      return () => clearTimeout(t)
    } else {
      setAnimatingMsgIdx(-1)
    }
  }, [animatingMsgIdx, animatedCharCount, messages])

  const getDisplayText = (msg, idx) =>
    idx === animatingMsgIdx ? msg.content.slice(0, animatedCharCount) : msg.content

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
      setHaberSessions(prev => ({
        ...prev,
        [wordCtx.id]: [...msgs, { role: 'assistant', content: data.message }]
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
    await callHaber([], { ...currentWordContext, isRevisit: false }, user.id)
  }

  const sendMessage = async (text) => {
    if (!text.trim() || haberLoading) return
    const { data: { user } } = await supabase.auth.getUser()
    const userMessage = { role: 'user', content: text.trim() }
    const currentHistory = haberSessions[wordId] || []
    const updatedMessages = [...currentHistory, userMessage]
    setHaberSessions(prev => ({ ...prev, [wordId]: updatedMessages }))
    setInputText('')
    await callHaber(updatedMessages, { ...currentWordContext, isRevisit: true }, user.id)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(inputText)
    }
  }

  const closeBtn = onClose ? (
    <button className="haber-close-btn" onClick={onClose} aria-label="Close Haber">×</button>
  ) : null

  // State 1 — invite screen
  if (messages.length === 0 && !haberLoading) {
    return (
      <div className="haber-panel haber-invite">
        {closeBtn}
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

  // State 2 — initial loading (no messages yet)
  if (messages.length === 0 && haberLoading) {
    return (
      <div className="haber-panel haber-loading-initial">
        {closeBtn}
        <div className="haber-thinking-text">
          {thinkingText}
          <span className="haber-cursor">|</span>
        </div>
      </div>
    )
  }

  // State 3 — conversation active
  return (
    <div className="haber-panel haber-conversation">
      <div className="haber-panel-header">
        <div className="haber-name-label">Haber</div>
        {closeBtn}
      </div>

      <div className="haber-messages">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`haber-message ${msg.role === 'assistant' ? 'haber-msg-assistant' : 'haber-msg-user'}`}
          >
            <p className="haber-msg-text">
              {getDisplayText(msg, idx)}
              {idx === animatingMsgIdx && <span className="haber-cursor">|</span>}
            </p>
          </div>
        ))}

        {haberLoading && (
          <div className="haber-message haber-msg-assistant">
            <p className="haber-msg-text haber-thinking-text">
              {thinkingText}
              <span className="haber-cursor">|</span>
            </p>
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
