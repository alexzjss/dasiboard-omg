import { useState, useEffect, useRef } from 'react'
import { PageHeader } from '../../components/ui/index'

const TOOLS = [
  { id:'pomodoro',    label:'Pomodoro',            emoji:'🍅', desc:'Timer com ciclos de foco e pausa' },
  { id:'notas',       label:'Notas Rápidas',        emoji:'📝', desc:'Bloco de notas no navegador' },
  { id:'checklist',   label:'Checklist',            emoji:'✅', desc:'Lista de tarefas com progresso visual' },
  { id:'sorteio',     label:'Sorteio',              emoji:'🎲', desc:'Sorteie nomes, grupos ou qualquer lista' },
  { id:'calculadora', label:'Média de Notas',       emoji:'🧮', desc:'Calcule médias ponderadas' },
  { id:'cronometro',  label:'Cronômetro',           emoji:'⏱️', desc:'Cronômetro com voltas' },
  { id:'conversor',   label:'Conversor de Unidades',emoji:'🔄', desc:'Comprimento, massa, temperatura e mais' },
]

export default function Ferramentas() {
  const [active, setActive] = useState<string | null>(null)

  return (
    <div>
      <PageHeader eyebrow="Utilitários & Produtividade" title="Ferramentas" description="Recursos para potencializar seus estudos e organização" />

      {!active ? (
        <div className="tools-grid anim-fade-up stagger-2">
          {TOOLS.map((t) => (
            <button key={t.id} className="tool-card" onClick={() => setActive(t.id)}>
              <div className="tool-emoji">{t.emoji}</div>
              <div className="tool-name">{t.label}</div>
              <div className="tool-desc">{t.desc}</div>
            </button>
          ))}
        </div>
      ) : (
        <div className="anim-fade-up stagger-1">
          <button className="back-btn" onClick={() => setActive(null)}>← Voltar</button>
          <ToolPanel id={active} />
        </div>
      )}

      <style>{`
        .tools-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:12px; }
        .tool-card { background:var(--glass); border:1px solid var(--glass-border); border-radius:14px; padding:20px; cursor:pointer; text-align:center; transition:all .2s; display:flex; flex-direction:column; gap:8px; }
        .tool-card:hover { border-color:var(--primary); background:rgba(124,58,237,.06); }
        .tool-emoji { font-size:32px; }
        .tool-name { font-size:14px; font-weight:600; color:var(--text); }
        .tool-desc { font-size:12px; color:var(--text-dim); line-height:1.4; }
        .back-btn { background:none; border:none; color:var(--text-muted); font-size:13px; cursor:pointer; margin-bottom:20px; display:flex; align-items:center; gap:6px; }
        .back-btn:hover { color:var(--text); }
      `}</style>
    </div>
  )
}

function ToolPanel({ id }: { id: string }) {
  switch (id) {
    case 'pomodoro':    return <Pomodoro />
    case 'notas':       return <NotasRapidas />
    case 'checklist':   return <Checklist />
    case 'sorteio':     return <Sorteio />
    case 'calculadora': return <MediaNotas />
    case 'cronometro':  return <Cronometro />
    case 'conversor':   return <Conversor />
    default: return null
  }
}

// ─── Pomodoro ─────────────────────────────────────────────────────────────────
function Pomodoro() {
  const [mins, setMins] = useState(25)
  const [secs, setSecs] = useState(0)
  const [running, setRunning] = useState(false)
  const [mode, setMode] = useState<'focus'|'short'|'long'>('focus')
  const PRESETS = { focus: 25, short: 5, long: 15 }
  const ref = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => {
        setSecs((s) => {
          if (s > 0) return s - 1
          setMins((m) => {
            if (m > 0) { return m - 1 }
            setRunning(false); return 0
          })
          return s > 0 ? s - 1 : 59
        })
      }, 1000)
    }
    return () => clearInterval(ref.current)
  }, [running])

  function selectMode(m: typeof mode) {
    setMode(m); setMins(PRESETS[m]); setSecs(0); setRunning(false)
  }

  const total = PRESETS[mode] * 60
  const elapsed = total - (mins * 60 + secs)
  const progress = (elapsed / total) * 100

  return (
    <div style={{ maxWidth: 320, margin: '0 auto', textAlign: 'center' }}>
      <div style={{ display:'flex', gap:8, justifyContent:'center', marginBottom:28 }}>
        {(['focus','short','long'] as const).map((m) => (
          <button key={m} onClick={() => selectMode(m)}
            style={{ background: mode===m ? 'var(--primary)' : 'var(--glass)', border:'1px solid var(--glass-border)', borderRadius:8, padding:'6px 14px', cursor:'pointer', color: mode===m ? 'white' : 'var(--text-muted)', fontSize:12 }}>
            {m === 'focus' ? 'Foco' : m === 'short' ? 'Pausa curta' : 'Pausa longa'}
          </button>
        ))}
      </div>
      <svg viewBox="0 0 120 120" style={{ width: 180, height: 180 }}>
        <circle cx="60" cy="60" r="54" fill="none" stroke="var(--glass-border)" strokeWidth="8" />
        <circle cx="60" cy="60" r="54" fill="none" stroke="var(--primary)" strokeWidth="8"
          strokeDasharray={`${2*Math.PI*54}`}
          strokeDashoffset={`${2*Math.PI*54 * (1 - progress/100)}`}
          strokeLinecap="round" transform="rotate(-90 60 60)" style={{ transition:'stroke-dashoffset .5s' }}
        />
        <text x="60" y="68" textAnchor="middle" fill="var(--text)" fontSize="24" fontWeight="700">
          {String(mins).padStart(2,'0')}:{String(secs).padStart(2,'0')}
        </text>
      </svg>
      <div style={{ display:'flex', gap:10, justifyContent:'center', marginTop:20 }}>
        <button onClick={() => setRunning((r)=>!r)} style={{ background:'var(--primary)', color:'white', border:'none', borderRadius:10, padding:'10px 28px', fontSize:14, fontWeight:700, cursor:'pointer' }}>
          {running ? 'Pausar' : 'Iniciar'}
        </button>
        <button onClick={() => { setMins(PRESETS[mode]); setSecs(0); setRunning(false) }} style={{ background:'var(--glass)', border:'1px solid var(--glass-border)', borderRadius:10, padding:'10px 16px', cursor:'pointer', color:'var(--text-muted)', fontSize:13 }}>
          Resetar
        </button>
      </div>
    </div>
  )
}

// ─── Notas Rápidas ────────────────────────────────────────────────────────────
function NotasRapidas() {
  const [text, setText] = useState(() => localStorage.getItem('dasiboard_notas') ?? '')
  function save(val: string) { setText(val); localStorage.setItem('dasiboard_notas', val) }
  return (
    <div>
      <div style={{ fontSize:12, color:'var(--text-dim)', marginBottom:8 }}>Salvo automaticamente no navegador</div>
      <textarea value={text} onChange={(e)=>save(e.target.value)}
        style={{ width:'100%', minHeight:320, background:'var(--glass)', border:'1px solid var(--glass-border)', borderRadius:10, padding:14, color:'var(--text)', fontSize:14, lineHeight:1.7, resize:'vertical', fontFamily:'inherit' }}
        placeholder="Escreva suas notas aqui..."
      />
    </div>
  )
}

// ─── Checklist ────────────────────────────────────────────────────────────────
function Checklist() {
  const [items, setItems] = useState<{id:number;text:string;done:boolean}[]>(() => JSON.parse(localStorage.getItem('dasiboard_checklist')||'[]'))
  const [input, setInput] = useState('')
  function save(next: typeof items) { setItems(next); localStorage.setItem('dasiboard_checklist', JSON.stringify(next)) }
  function add() { if (!input.trim()) return; save([...items, {id:Date.now(),text:input.trim(),done:false}]); setInput('') }
  function toggle(id:number) { save(items.map((i)=>i.id===id?{...i,done:!i.done}:i)) }
  function remove(id:number) { save(items.filter((i)=>i.id!==id)) }
  const done = items.filter((i)=>i.done).length
  return (
    <div style={{ maxWidth:480 }}>
      <div style={{ marginBottom:16 }}>
        <div style={{ height:6, background:'var(--glass-border)', borderRadius:3, overflow:'hidden', marginBottom:6 }}>
          <div style={{ height:'100%', background:'var(--success)', borderRadius:3, width:`${items.length?done/items.length*100:0}%`, transition:'width .3s' }} />
        </div>
        <div style={{ fontSize:12, color:'var(--text-muted)' }}>{done} de {items.length} concluídos</div>
      </div>
      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        <input value={input} onChange={(e)=>setInput(e.target.value)} onKeyDown={(e)=>e.key==='Enter'&&add()}
          style={{ flex:1, background:'var(--glass)', border:'1px solid var(--glass-border)', borderRadius:8, padding:'8px 12px', color:'var(--text)', fontSize:13 }} placeholder="Adicionar item..." />
        <button onClick={add} style={{ background:'var(--primary)', color:'white', border:'none', borderRadius:8, padding:'8px 14px', cursor:'pointer', fontSize:13, fontWeight:600 }}>+</button>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {items.map((item)=>(
          <div key={item.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:'var(--glass)', border:'1px solid var(--glass-border)', borderRadius:8 }}>
            <input type="checkbox" checked={item.done} onChange={()=>toggle(item.id)} style={{ width:16, height:16, cursor:'pointer', accentColor:'var(--primary)' }} />
            <span style={{ flex:1, fontSize:13, color:item.done?'var(--text-dim)':'var(--text)', textDecoration:item.done?'line-through':'none' }}>{item.text}</span>
            <button onClick={()=>remove(item.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-dim)', fontSize:14 }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Sorteio ──────────────────────────────────────────────────────────────────
function Sorteio() {
  const [list, setList] = useState('')
  const [result, setResult] = useState<string[]>([])
  function draw() {
    const items = list.split('\n').map((s)=>s.trim()).filter(Boolean)
    if (!items.length) return
    const shuffled = [...items].sort(()=>Math.random()-.5)
    setResult(shuffled)
  }
  return (
    <div style={{ maxWidth:480 }}>
      <textarea value={list} onChange={(e)=>setList(e.target.value)}
        style={{ width:'100%', height:160, background:'var(--glass)', border:'1px solid var(--glass-border)', borderRadius:10, padding:12, color:'var(--text)', fontSize:13, resize:'vertical', fontFamily:'inherit', marginBottom:12 }}
        placeholder="Um nome por linha:&#10;Alice&#10;Bob&#10;Carlos" />
      <button onClick={draw} style={{ background:'var(--primary)', color:'white', border:'none', borderRadius:8, padding:'9px 20px', cursor:'pointer', fontSize:13, fontWeight:600, marginBottom:16 }}>Sortear</button>
      {result.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {result.map((r,i)=>(
            <div key={i} style={{ display:'flex', gap:12, alignItems:'center', padding:'8px 14px', background:'var(--glass)', border:'1px solid var(--glass-border)', borderRadius:8 }}>
              <span style={{ fontSize:12, color:'var(--primary)', fontWeight:700, minWidth:24 }}>{i+1}º</span>
              <span style={{ fontSize:13, color:'var(--text)' }}>{r}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Média de Notas ───────────────────────────────────────────────────────────
function MediaNotas() {
  const [rows, setRows] = useState([{note:0,weight:1}])
  const avg = (() => { const tw=rows.reduce((s,r)=>s+r.weight,0); if(!tw)return null; return rows.reduce((s,r)=>s+r.note*r.weight,0)/tw })()
  function update(i:number,field:string,val:number) { setRows(r=>r.map((row,j)=>j===i?{...row,[field]:val}:row)) }
  return (
    <div style={{ maxWidth:400 }}>
      {rows.map((r,i)=>(
        <div key={i} style={{ display:'flex', gap:8, marginBottom:8, alignItems:'center' }}>
          <input type="number" min={0} max={10} step={0.1} value={r.note} onChange={(e)=>update(i,'note',parseFloat(e.target.value)||0)}
            style={{ flex:2, background:'var(--glass)', border:'1px solid var(--glass-border)', borderRadius:8, padding:'7px 10px', color:'var(--text)', fontSize:13 }} placeholder="Nota" />
          <span style={{ fontSize:12, color:'var(--text-dim)' }}>×</span>
          <input type="number" min={0.1} step={0.5} value={r.weight} onChange={(e)=>update(i,'weight',parseFloat(e.target.value)||1)}
            style={{ flex:1, background:'var(--glass)', border:'1px solid var(--glass-border)', borderRadius:8, padding:'7px 10px', color:'var(--text)', fontSize:13 }} placeholder="Peso" />
          <button onClick={()=>setRows(r=>r.filter((_,j)=>j!==i))} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-dim)', fontSize:16 }}>✕</button>
        </div>
      ))}
      <div style={{ display:'flex', gap:10, marginTop:12, alignItems:'center' }}>
        <button onClick={()=>setRows(r=>[...r,{note:0,weight:1}])} style={{ background:'var(--glass)', border:'1px solid var(--glass-border)', borderRadius:8, padding:'7px 14px', cursor:'pointer', color:'var(--text-muted)', fontSize:13 }}>+ Adicionar</button>
        {avg !== null && <span style={{ fontSize:22, fontWeight:800, color: avg>=5?'var(--success)':'var(--danger)' }}>{avg.toFixed(2)}</span>}
      </div>
    </div>
  )
}

// ─── Cronômetro ───────────────────────────────────────────────────────────────
function Cronometro() {
  const [ms, setMs] = useState(0)
  const [running, setRunning] = useState(false)
  const [laps, setLaps] = useState<number[]>([])
  const ref = useRef<ReturnType<typeof setInterval>>()
  useEffect(() => {
    if (running) ref.current = setInterval(()=>setMs(m=>m+10), 10)
    else clearInterval(ref.current)
    return () => clearInterval(ref.current)
  }, [running])
  const fmt = (v:number) => { const s=Math.floor(v/1000); const m=Math.floor(s/60); return `${String(m).padStart(2,'0')}:${String(s%60).padStart(2,'0')}.${String(Math.floor((v%1000)/10)).padStart(2,'0')}` }
  return (
    <div style={{ maxWidth:320, textAlign:'center' }}>
      <div style={{ fontSize:48, fontWeight:800, color:'var(--text)', fontVariantNumeric:'tabular-nums', marginBottom:24 }}>{fmt(ms)}</div>
      <div style={{ display:'flex', gap:10, justifyContent:'center', marginBottom:20 }}>
        <button onClick={()=>setRunning(r=>!r)} style={{ background:'var(--primary)', color:'white', border:'none', borderRadius:10, padding:'10px 28px', fontSize:14, fontWeight:700, cursor:'pointer' }}>{running?'Pausar':'Iniciar'}</button>
        <button onClick={()=>setLaps(l=>[ms,...l])} disabled={!running} style={{ background:'var(--glass)', border:'1px solid var(--glass-border)', borderRadius:10, padding:'10px 16px', cursor:'pointer', color:'var(--text-muted)', fontSize:13 }}>Volta</button>
        <button onClick={()=>{setMs(0);setRunning(false);setLaps([])}} style={{ background:'var(--glass)', border:'1px solid var(--glass-border)', borderRadius:10, padding:'10px 16px', cursor:'pointer', color:'var(--text-muted)', fontSize:13 }}>Reset</button>
      </div>
      {laps.length > 0 && <div style={{ textAlign:'left', display:'flex', flexDirection:'column', gap:4 }}>
        {laps.map((l,i)=><div key={i} style={{ fontSize:13, color:'var(--text-muted)', display:'flex', justifyContent:'space-between', padding:'4px 0', borderTop:'1px solid var(--glass-border)' }}><span>Volta {laps.length-i}</span><span style={{ fontVariantNumeric:'tabular-nums' }}>{fmt(l)}</span></div>)}
      </div>}
    </div>
  )
}

// ─── Conversor ────────────────────────────────────────────────────────────────
const CONVERSIONS: Record<string, { label:string; units:{k:string;l:string;factor:number}[] }> = {
  comp: { label:'Comprimento', units:[{k:'m',l:'Metro',factor:1},{k:'km',l:'Quilômetro',factor:1000},{k:'cm',l:'Centímetro',factor:.01},{k:'mi',l:'Milha',factor:1609.34},{k:'ft',l:'Pé',factor:.3048}]},
  massa: { label:'Massa', units:[{k:'kg',l:'Quilograma',factor:1},{k:'g',l:'Grama',factor:.001},{k:'lb',l:'Libra',factor:.453592},{k:'oz',l:'Onça',factor:.0283495}]},
  temp: { label:'Temperatura', units:[{k:'C',l:'Celsius',factor:1},{k:'F',l:'Fahrenheit',factor:1},{k:'K',l:'Kelvin',factor:1}]},
}
function convertTemp(val:number, from:string, to:string) {
  let c = from==='F'?(val-32)/1.8:from==='K'?val-273.15:val
  return to==='F'?c*1.8+32:to==='K'?c+273.15:c
}
function Conversor() {
  const [cat, setCat] = useState('comp')
  const [val, setVal] = useState(1)
  const [from, setFrom] = useState('m')
  const conv = CONVERSIONS[cat]!
  const fromUnit = conv.units.find((u)=>u.k===from)!
  const convert = (to:{k:string;factor:number}) => {
    if (cat==='temp') return convertTemp(val, from, to.k).toFixed(4)
    return (val * fromUnit.factor / to.factor).toFixed(4)
  }
  return (
    <div style={{ maxWidth:400 }}>
      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        {Object.entries(CONVERSIONS).map(([k,v])=>(
          <button key={k} onClick={()=>{setCat(k);setFrom(CONVERSIONS[k]!.units[0]!.k)}} style={{ background:cat===k?'var(--primary)':'var(--glass)', color:cat===k?'white':'var(--text-muted)', border:'1px solid var(--glass-border)', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontSize:12 }}>{v.label}</button>
        ))}
      </div>
      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        <input type="number" value={val} onChange={(e)=>setVal(parseFloat(e.target.value)||0)} style={{ flex:2, background:'var(--glass)', border:'1px solid var(--glass-border)', borderRadius:8, padding:'8px 12px', color:'var(--text)', fontSize:13 }} />
        <select value={from} onChange={(e)=>setFrom(e.target.value)} style={{ flex:1, background:'var(--glass)', border:'1px solid var(--glass-border)', borderRadius:8, padding:'8px', color:'var(--text)', fontSize:13 }}>
          {conv.units.map((u)=><option key={u.k} value={u.k}>{u.l}</option>)}
        </select>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {conv.units.filter((u)=>u.k!==from).map((u)=>(
          <div key={u.k} style={{ display:'flex', justifyContent:'space-between', padding:'8px 14px', background:'var(--glass)', border:'1px solid var(--glass-border)', borderRadius:8 }}>
            <span style={{ fontSize:13, color:'var(--text-muted)' }}>{u.l}</span>
            <span style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{convert(u)} {u.k}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
