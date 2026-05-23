import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Send, Sparkles, Sword, Shield, Cpu } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import api from '../utils/api'
import Layout from '../components/Layout'
import Topbar from '../components/Topbar'

const SUGGESTIONS = [
  'How do I detect SQL injection in my logs?',
  'Give me a ransomware mitigation checklist.',
  "What's the best recon order for a black-box pentest?",
  'Explain XSS with mitigations.',
  'Tell me about DDoS detection.',
  'Privilege escalation tips on Linux',
]

export default function AIAnalyst() {
  const [msgs, setMsgs] = useState([
    { role: 'ai', mode: 'builtin', content: { summary: "I'm SENTINEL-X AI Analyst. Ask me about specific threats, recon strategy, hardening, or detection rules. Try the suggestions below." } },
  ])
  const [input, setInput] = useState('')
  const [context, setContext] = useState('general')
  const [busy, setBusy] = useState(false)
  const [provider, setProvider] = useState(null)
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])
  useEffect(() => {
    api.get('/api/ai/provider').then(r => setProvider(r.data)).catch(() => {})
  }, [])

  const send = async (text) => {
    const q = text || input
    if (!q.trim()) return
    const newMsgs = [...msgs, { role: 'user', content: q }]
    setMsgs(newMsgs); setInput(''); setBusy(true)
    try {
      // Build LLM history from prior messages
      const history = newMsgs.slice(-12).filter(m => typeof m.content === 'string' || (m.content && m.content.summary)).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: typeof m.content === 'string' ? m.content : (m.content?.summary || ''),
      }))
      const { data } = await api.post('/api/ai/chat', { message: q, context, history: history.slice(0, -1) })
      setMsgs(m => [...m, {
        role: 'ai',
        mode: data.mode,
        provider: data.provider,
        model: data.model,
        content: data.mode === 'llm' ? data.answer : data.answer_structured,
        usage: data.usage,
      }])
    } catch (e) {
      setMsgs(m => [...m, { role: 'ai', mode: 'builtin', content: { summary: 'Failed to reach AI analyst.' } }])
    } finally { setBusy(false) }
  }

  return (
    <Layout>
      <Topbar title="AI Security Analyst" subtitle="Real Claude / ChatGPT or built-in expert · runbooks · MITRE ATT&CK · detection rules" />

      {provider && (
        <div className="glass p-3 mb-4 flex items-center gap-3 flex-wrap">
          <Cpu size={16} className="text-cyber-neon" />
          <span className="text-sm text-white/65">Powered by:</span>
          <span className="font-mono font-bold text-sm" style={{
            color: provider.active === 'anthropic' ? '#d97757' : provider.active === 'openai' ? '#10a37f' : '#9ca3af'
          }}>
            {provider.active === 'anthropic' ? `Claude (${provider.anthropic_model})` :
             provider.active === 'openai' ? `ChatGPT (${provider.openai_model})` :
             'Built-in Knowledge Base'}
          </span>
          {provider.active === 'builtin' && (
            <span className="ml-auto text-[11px] text-cyber-amber">
              Set <code className="px-1 bg-white/10 rounded">ANTHROPIC_API_KEY</code> or <code className="px-1 bg-white/10 rounded">OPENAI_API_KEY</code> in .env to upgrade
            </span>
          )}
        </div>
      )}

      <div className="glass p-3 mb-4 flex gap-2">
        {[
          { id: 'general', label: 'General', icon: Brain },
          { id: 'offensive', label: 'Offensive', icon: Sword },
          { id: 'defensive', label: 'Defensive', icon: Shield },
        ].map(c => (
          <button key={c.id} onClick={() => setContext(c.id)}
            className={`px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition ${
              context === c.id ? 'bg-gradient-to-r from-cyber-neon/20 to-cyber-violet/20 border border-cyber-neon/40 text-white' : 'text-white/65 hover:bg-white/5'
            }`}>
            <c.icon size={14}/> {c.label}
          </button>
        ))}
      </div>

      <div className="glass p-5 flex flex-col h-[calc(100vh-260px)]">
        <div className="flex-1 overflow-auto space-y-4 pr-2">
          <AnimatePresence>
            {msgs.map((m, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
                  m.role === 'user' ? 'bg-cyber-violet/30' : 'bg-gradient-to-br from-cyber-neon to-cyber-violet text-cyber-bg'
                }`}>
                  {m.role === 'user' ? '👤' : <Brain size={18} />}
                </div>
                <div className={`max-w-[82%] ${m.role === 'user' ? 'glass-dark' : 'glass-strong'} p-4 rounded-xl`}>
                  {m.role === 'user' ? (
                    <div className="text-sm whitespace-pre-wrap">{m.content}</div>
                  ) : m.mode === 'llm' ? (
                    <LLMBubble c={m.content} provider={m.provider} model={m.model} usage={m.usage} />
                  ) : (
                    <BuiltinBubble c={m.content} />
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {busy && (
            <div className="flex items-center gap-2 text-white/55 text-sm">
              <span className="spinner" /> {provider?.active === 'builtin' ? 'searching knowledge base…' : 'thinking…'}
            </div>
          )}
          <div ref={endRef} />
        </div>

        {msgs.length <= 1 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {SUGGESTIONS.map((s, i) => (
              <button key={i} onClick={() => send(s)}
                className="text-xs px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/75">
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-3 border-t border-white/10">
          <input className="cyber-input flex-1" placeholder="Ask anything cybersec…"
            value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()} />
          <button onClick={() => send()} disabled={busy} className="btn-primary flex items-center gap-2">
            <Send size={16}/> Send
          </button>
        </div>
      </div>
    </Layout>
  )
}

function LLMBubble({ c, provider, model, usage }) {
  return (
    <div>
      <div className="prose prose-sm prose-invert max-w-none text-sm">
        <ReactMarkdown
          components={{
            code: ({ inline, children }) => inline
              ? <code className="px-1.5 py-0.5 rounded bg-white/10 text-cyber-neon font-mono text-[0.9em]">{children}</code>
              : <pre className="terminal whitespace-pre-wrap break-all text-xs"><code>{children}</code></pre>,
            h1: ({ children }) => <h1 className="text-lg font-bold mt-3 mb-2">{children}</h1>,
            h2: ({ children }) => <h2 className="text-base font-bold mt-3 mb-1.5">{children}</h2>,
            h3: ({ children }) => <h3 className="text-sm font-bold mt-2 mb-1 text-cyber-neon">{children}</h3>,
            ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 my-2">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 my-2">{children}</ol>,
            a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" className="text-cyber-neon underline">{children}</a>,
          }}
        >{c}</ReactMarkdown>
      </div>
      <div className="mt-2 pt-2 border-t border-white/10 flex items-center gap-2 text-[10px] text-white/45 font-mono">
        <span style={{ color: provider === 'anthropic' ? '#d97757' : '#10a37f' }}>● {provider}</span>
        <span>·</span>
        <span>{model}</span>
        {usage && (
          <>
            <span>·</span>
            <span>↓{usage.input_tokens} ↑{usage.output_tokens} tok</span>
          </>
        )}
      </div>
    </div>
  )
}

function BuiltinBubble({ c }) {
  if (!c) return null
  if (typeof c === 'string') return <div className="text-sm whitespace-pre-wrap">{c}</div>

  if (c.summary && !c.detection && !c.mitigation) {
    return (
      <div>
        <div className="text-sm">{c.summary}</div>
        {c.suggestions && (
          <ul className="mt-3 space-y-1">
            {c.suggestions.map((s, i) => <li key={i} className="text-xs text-white/65">▸ {s}</li>)}
          </ul>
        )}
        {c.advice && (
          <ul className="mt-3 space-y-1">
            {c.advice.map((s, i) => <li key={i} className="text-xs text-white/80 flex items-start gap-2"><Sparkles size={12} className="text-cyber-neon mt-0.5"/> {s}</li>)}
          </ul>
        )}
      </div>
    )
  }
  return (
    <div className="space-y-3">
      {c.summary && <div className="text-sm">{c.summary}</div>}
      {c.detection && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-cyber-neon mb-1">Detection</div>
          <ul className="space-y-1 text-xs text-white/80">{c.detection.map((d, i) => <li key={i}>▸ {d}</li>)}</ul>
        </div>
      )}
      {c.mitigation && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-cyber-violet mb-1">Mitigation</div>
          <ul className="space-y-1 text-xs text-white/80">{c.mitigation.map((d, i) => <li key={i}>▸ {d}</li>)}</ul>
        </div>
      )}
      {c.recommended_tools && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-cyber-rose mb-1">Tools</div>
          <div className="flex flex-wrap gap-1.5">
            {c.recommended_tools.map((t, i) => <span key={i} className="badge badge-info">{t}</span>)}
          </div>
        </div>
      )}
      {c.follow_up && <div className="text-xs text-cyber-neon/80 italic">{c.follow_up}</div>}
    </div>
  )
}
