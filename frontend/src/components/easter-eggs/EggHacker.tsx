import { useEffect, useRef, useState } from 'react'

// ── Hacker Terminal screen ────────────────────────────────────────────────────
function HackerScreen({ onClose }: { onClose: () => void }) {
  const [lines, setLines] = useState<string[]>([
    'root@each:~$ whoami',
    'root — Sistemas de Informação EACH-USP',
    'root@each:~$ ls /disciplinas',
    'ACH2001  ACH2002  ACH2003  ACH2004  ACH2005',
    'ACH2006  ACH2007  ACH2008  ACH2009  ACH2010',
    'root@each:~$ cat /etc/motto',
    '"Computação a serviço da sociedade"',
    'root@each:~$ hack usp',
    '[!] Iniciando sequência de infiltração...',
    '[!] Conectando ao mainframe da Reitoria...',
    '[✓] Acesso concedido. Bem-vindo ao sistema.',
    '[✓] Segredo encontrado: você tem +99 créditos.',
    'root@each:~$ _',
  ])
  const [input, setInput] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView() }, [lines])

  const handleCmd = (cmd: string) => {
    const trimmed = cmd.trim().toLowerCase()
    const responses: Record<string, string[]> = {
      'ls':        ['DaSIboard  kanban  grades  calendar  entities  profile'],
      'whoami':    ['estudante@si.each.usp.br'],
      'pwd':       ['/home/estudante/dasiboard'],
      'date':      [new Date().toString()],
      'clear':     [],
      'exit':      ['Saindo...'],
      'hack usp':  ['[!] Não foi dessa vez. Tente `hack matrix`'],
      'hack matrix':['[✓] Whoa — você encontrou o nível secreto. Parabéns!'],
      'help':      ['ls  whoami  pwd  date  clear  exit  hack <alvo>'],
      'sudo':      ['[sudo] senha para estudante: *** — Permissão negada.'],
    }
    const out = responses[trimmed]
    if (trimmed === 'clear') { setLines(['root@each:~$ _']); return }
    if (trimmed === 'exit') { onClose(); return }
    const newLines = [
      ...lines.slice(0,-1),
      `root@each:~$ ${cmd}`,
      ...(out ?? [`bash: ${cmd}: command not found`]),
      'root@each:~$ _',
    ]
    setLines(newLines)
  }

  return (
    <div className="fixed inset-0 z-[999] flex flex-col"
         style={{ background: '#0a0f0a', fontFamily: '"JetBrains Mono", monospace' }}>
      {/* Terminal header */}
      <div className="flex items-center gap-2 px-4 py-2.5 shrink-0"
           style={{ background: '#1a241a', borderBottom: '1px solid #00ff4133' }}>
        <div className="flex gap-1.5">
          <button onClick={onClose} className="w-3 h-3 rounded-full" style={{ background: '#ff5f57' }}/>
          <div className="w-3 h-3 rounded-full" style={{ background: '#febc2e' }}/>
          <div className="w-3 h-3 rounded-full" style={{ background: '#28c840' }}/>
        </div>
        <p style={{ color: '#00ff41', fontSize: 12, marginLeft: 8, opacity: 0.8 }}>
          Terminal — root@each — 80×24
        </p>
      </div>
      {/* Output */}
      <div className="flex-1 overflow-y-auto px-5 py-4" style={{ color: '#00ff41', fontSize: 13, lineHeight: 2 }}>
        {lines.map((l, i) => (
          <p key={i} style={{ opacity: l.startsWith('[!]') ? 0.7 : l.startsWith('[✓]') ? 1 : 0.85,
            color: l.startsWith('[✓]') ? '#44ff88' : l.startsWith('[!]') ? '#ffcc00' : '#00ff41' }}>
            {l}
          </p>
        ))}
        <div ref={endRef}/>
      </div>
      {/* Input */}
      <div className="flex items-center gap-2 px-5 py-3 shrink-0" style={{ borderTop: '1px solid #00ff4133' }}>
        <span style={{ color: '#00ff41', fontSize: 13 }}>root@each:~$</span>
        <input
          autoFocus
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: '#00ff41', fontFamily: '"JetBrains Mono", monospace', caretColor: '#00ff41' }}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { handleCmd(input); setInput('') }
            if (e.key === 'Escape') onClose()
          }}
          placeholder="digite um comando..."
          spellCheck={false}
        />
      </div>
    </div>
  )
}

export default HackerScreen
