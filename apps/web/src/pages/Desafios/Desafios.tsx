import { useState } from 'react'
import { useChallenges, useChallengeProgress, useSubmitChallenge } from '../../api/hooks'
import { useAuthStore } from '../../stores/authStore'
import { PageHeader, Spinner, Badge } from '../../components/ui/index'

interface Challenge {
  id: string; title: string; difficulty: string; tags: string[]
  description: string; starterCode: string
}

const DIFF_COLOR: Record<string, 'success'|'warning'|'danger'> = {
  easy: 'success', medium: 'warning', hard: 'danger',
}

export default function Desafios() {
  const { data: challenges = [], isLoading } = useChallenges()
  const { data: progress = {} } = useChallengeProgress()
  const isAuth = useAuthStore((s) => s.isAuthenticated)
  const [selected, setSelected] = useState<Challenge | null>(null)
  const [code, setCode] = useState('')
  const [results, setResults] = useState<{ok:boolean;input:string;expected:string;got:string}[]|null>(null)
  const submit = useSubmitChallenge()

  function openChallenge(ch: Challenge) {
    setSelected(ch); setCode(ch.starterCode); setResults(null)
  }

  async function handleSubmit() {
    if (!selected) return
    const data = await submit.mutateAsync({ id: selected.id, lang: 'javascript', code })
    setResults(data.testResults)
  }

  const passed = Object.values(progress).filter(Boolean).length
  const total  = (challenges as Challenge[]).length

  if (selected) {
    return (
      <div>
        <button onClick={() => { setSelected(null); setResults(null) }}
          style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:13, marginBottom:20, display:'flex', alignItems:'center', gap:6 }}>
          ← Voltar aos desafios
        </button>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
          {/* Problem */}
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
              <h2 style={{ fontSize:20, fontWeight:700, color:'var(--text)', flex:1 }}>{selected.title}</h2>
              <Badge color={DIFF_COLOR[selected.difficulty] ?? 'default'}>{selected.difficulty}</Badge>
            </div>
            <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
              {selected.tags.map((t)=><Badge key={t} color="default">{t}</Badge>)}
            </div>
            <div style={{ fontSize:14, color:'var(--text-muted)', lineHeight:1.7 }}
              dangerouslySetInnerHTML={{ __html: selected.description }} />

            {/* Test results */}
            {results && (
              <div style={{ marginTop:20 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', marginBottom:10 }}>
                  Resultados: {results.filter((r)=>r.ok).length}/{results.length} passaram
                  {results.every((r)=>r.ok) && <span style={{ color:'var(--success)', marginLeft:8 }}>✓ Parabéns!</span>}
                </div>
                {results.map((r,i)=>(
                  <div key={i} style={{ padding:'8px 12px', borderRadius:8, marginBottom:6, background: r.ok?'rgba(34,197,94,.08)':'rgba(239,68,68,.08)', border:`1px solid ${r.ok?'rgba(34,197,94,.3)':'rgba(239,68,68,.3)'}` }}>
                    <div style={{ fontSize:12, color: r.ok?'var(--success)':'var(--danger)', fontWeight:600 }}>{r.ok?'✓ Passou':'✕ Falhou'}</div>
                    {!r.ok && <>
                      <div style={{ fontSize:11, color:'var(--text-dim)', marginTop:3 }}>Entrada: {r.input}</div>
                      <div style={{ fontSize:11, color:'var(--text-dim)' }}>Esperado: {r.expected}</div>
                      <div style={{ fontSize:11, color:'var(--text-dim)' }}>Obtido: {r.got}</div>
                    </>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Editor */}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ fontSize:12, color:'var(--text-dim)' }}>JavaScript</div>
            <textarea
              value={code} onChange={(e)=>setCode(e.target.value)}
              style={{ flex:1, minHeight:360, background:'var(--bg)', border:'1px solid var(--glass-border)', borderRadius:10, padding:14, color:'var(--text)', fontSize:13, fontFamily:'monospace', lineHeight:1.6, resize:'vertical' }}
            />
            <button
              onClick={handleSubmit}
              disabled={!isAuth || submit.isPending}
              style={{ background:'var(--primary)', color:'white', border:'none', borderRadius:8, padding:'10px', fontSize:14, fontWeight:700, cursor:'pointer', opacity:!isAuth?0.6:1 }}
            >
              {submit.isPending ? 'Executando…' : isAuth ? '▶ Enviar solução' : 'Faça login para enviar'}
            </button>
          </div>
        </div>

        <style>{`@media(max-width:768px){div[style*="grid-template-columns:1fr 1fr"]{grid-template-columns:1fr!important;}}`}</style>
      </div>
    )
  }

  return (
    <div>
      <PageHeader eyebrow="Prática de código" title="Desafios de Programação" description="Resolva desafios de JavaScript diretamente no navegador — com testes automáticos." />

      {isAuth && total > 0 && (
        <div style={{ background:'var(--glass)', border:'1px solid var(--glass-border)', borderRadius:12, padding:'12px 16px', marginBottom:24, display:'flex', alignItems:'center', gap:16 }} className="anim-fade-up stagger-2">
          <div style={{ flex:1, height:6, background:'var(--glass-border)', borderRadius:3, overflow:'hidden' }}>
            <div style={{ height:'100%', background:'var(--success)', borderRadius:3, width:`${(passed/total)*100}%`, transition:'width .3s' }} />
          </div>
          <span style={{ fontSize:13, color:'var(--text-muted)', whiteSpace:'nowrap' }}>{passed}/{total} resolvidos</span>
        </div>
      )}

      {isLoading ? <Spinner text="Carregando desafios..." /> : (
        <div className="ch-grid anim-fade-up stagger-3">
          {(challenges as Challenge[]).map((ch) => {
            const solved = progress[ch.id] === true
            return (
              <button key={ch.id} className="ch-card" onClick={() => openChallenge(ch)}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                  <span style={{ fontSize:16, color: solved ? 'var(--success)' : 'var(--text-dim)' }}>{solved ? '✓' : '○'}</span>
                  <Badge color={DIFF_COLOR[ch.difficulty] ?? 'default'}>{ch.difficulty}</Badge>
                </div>
                <div style={{ fontSize:14, fontWeight:600, color:'var(--text)', marginBottom:6 }}>{ch.title}</div>
                <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                  {ch.tags.map((t)=><Badge key={t} color="default">{t}</Badge>)}
                </div>
              </button>
            )
          })}
        </div>
      )}

      <style>{`
        .ch-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:12px; }
        .ch-card { background:var(--glass); border:1px solid var(--glass-border); border-radius:12px; padding:16px; cursor:pointer; text-align:left; transition:all .15s; }
        .ch-card:hover { border-color:var(--primary); }
      `}</style>
    </div>
  )
}
