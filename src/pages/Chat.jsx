import { useEffect, useRef, useState } from 'react'
import { ShieldCheck, Send, AlertCircle } from 'lucide-react'
import api from '../api'

// Session ID persisted in sessionStorage so it survives page refreshes
// within the same browser tab, but a new tab starts a fresh conversation.
function getOrCreateSessionId() {
  const key = 'compliance_chat_session_id'
  let id = sessionStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(key, id)
  }
  return id
}

function BotAvatar() {
  return (
    <div className="bot-avatar">
      <ShieldCheck size={14} />
    </div>
  )
}

function ControlChip({ controlId }) {
  return <span className="control-chip">{controlId}</span>
}

function TypingIndicator() {
  return (
    <div className="message-row message-bot">
      <BotAvatar />
      <div className="message-bubble bot-bubble typing-bubble">
        <span className="dot" /><span className="dot" /><span className="dot" />
      </div>
    </div>
  )
}

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`message-row ${isUser ? 'message-user' : 'message-bot'}`}>
      {!isUser && <BotAvatar />}
      <div className={`message-bubble ${isUser ? 'user-bubble' : 'bot-bubble'}`}>
        <div className="message-text">{msg.content}</div>
        {msg.citedControlIds?.length > 0 && (
          <div className="control-chips">
            {msg.citedControlIds.map(id => <ControlChip key={id} controlId={id} />)}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Chat() {
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      content: 'Ask me anything about your compliance posture — NIST 800-53, CIS AWS Benchmark, SOC2, or current violations.',
      citedControlIds: [],
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const sessionId = useRef(getOrCreateSessionId())
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  // Scroll to the latest message whenever messages or loading state changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage() {
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    setError(null)
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setLoading(true)

    try {
      const res = await api.post('/api/chat', { message: text }, {
        headers: { 'X-Session-Id': sessionId.current },
      })
      setMessages(prev => [...prev, {
        role: 'bot',
        content: res.data.answer,
        citedControlIds: res.data.citedControlIds ?? [],
      }])
    } catch {
      setError('Could not reach the backend — is Spring Boot running?')
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function clearSession() {
    sessionStorage.removeItem('compliance_chat_session_id')
    sessionId.current = getOrCreateSessionId()
    setMessages([{
      role: 'bot',
      content: 'New session started. Ask me anything about your compliance posture.',
      citedControlIds: [],
    }])
    setError(null)
  }

  return (
    <div className="chat-layout">
      <div className="chat-header">
        <h1 className="page-title">Compliance Chat</h1>
        <button className="btn-ghost" onClick={clearSession} title="Start a new session">
          New session
        </button>
      </div>

      <div className="chat-messages">
        {messages.map((msg, i) => <Message key={i} msg={msg} />)}
        {loading && <TypingIndicator />}
        {error && (
          <div className="chat-error">
            <AlertCircle size={14} /> {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-row">
        <textarea
          ref={inputRef}
          className="chat-input"
          rows={1}
          placeholder="Ask a compliance question… (Enter to send, Shift+Enter for newline)"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button
          className="send-btn"
          onClick={sendMessage}
          disabled={!input.trim() || loading}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}
