// ── MiniMarkdown — lightweight inline markdown renderer (no deps) ─────────────
// Supports: **bold**, *italic*, [link](url), ![img](url), # headings,
//           > blockquote, - lists, `code`, ---

interface Props { text: string; className?: string; style?: React.CSSProperties }

function renderInline(raw: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  let i = 0, key = 0

  while (i < raw.length) {
    // Bold **text**
    if (raw[i] === '*' && raw[i+1] === '*') {
      const end = raw.indexOf('**', i+2)
      if (end !== -1) {
        parts.push(<strong key={key++}>{raw.slice(i+2, end)}</strong>)
        i = end + 2; continue
      }
    }
    // Italic *text*
    if (raw[i] === '*' && raw[i+1] !== '*') {
      const end = raw.indexOf('*', i+1)
      if (end !== -1) {
        parts.push(<em key={key++}>{raw.slice(i+1, end)}</em>)
        i = end + 1; continue
      }
    }
    // Inline code `code`
    if (raw[i] === '`') {
      const end = raw.indexOf('`', i+1)
      if (end !== -1) {
        parts.push(
          <code key={key++} style={{ fontFamily: 'monospace', fontSize: '0.88em',
            background: 'var(--bg-elevated)', padding: '1px 5px', borderRadius: 4,
            border: '1px solid var(--border)' }}>
            {raw.slice(i+1, end)}
          </code>
        )
        i = end + 1; continue
      }
    }
    // Image ![alt](url)
    if (raw[i] === '!' && raw[i+1] === '[') {
      const altEnd = raw.indexOf(']', i+2)
      const urlStart = raw.indexOf('(', altEnd)
      const urlEnd   = raw.indexOf(')', urlStart)
      if (altEnd !== -1 && urlStart === altEnd+1 && urlEnd !== -1) {
        const alt = raw.slice(i+2, altEnd)
        const url = raw.slice(urlStart+1, urlEnd)
        parts.push(
          <img key={key++} src={url} alt={alt}
               style={{ maxWidth: '100%', borderRadius: 8, margin: '6px 0', display: 'block' }} />
        )
        i = urlEnd + 1; continue
      }
    }
    // Link [text](url)
    if (raw[i] === '[') {
      const textEnd  = raw.indexOf(']', i+1)
      const urlStart = raw.indexOf('(', textEnd)
      const urlEnd   = raw.indexOf(')', urlStart)
      if (textEnd !== -1 && urlStart === textEnd+1 && urlEnd !== -1) {
        const txt = raw.slice(i+1, textEnd)
        const url = raw.slice(urlStart+1, urlEnd)
        parts.push(
          <a key={key++} href={url} target="_blank" rel="noopener noreferrer"
             style={{ color: 'var(--accent-3)', textDecoration: 'underline' }}>
            {txt}
          </a>
        )
        i = urlEnd + 1; continue
      }
    }
    // Accumulate plain text
    const next = Math.min(
      ...[raw.indexOf('**',i+1), raw.indexOf('*',i+1), raw.indexOf('`',i+1),
          raw.indexOf('[',i+1), raw.indexOf('![',i+1)].filter(p => p > i)
    )
    const end = next === Infinity ? raw.length : next
    parts.push(<span key={key++}>{raw.slice(i, end)}</span>)
    i = end
  }
  return parts
}

export function MiniMarkdown({ text, className, style }: Props) {
  const lines = text.split('\n')
  const nodes: React.ReactNode[] = []
  let k = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Horizontal rule ---
    if (/^---+$/.test(line.trim())) {
      nodes.push(<hr key={k++} style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '10px 0' }} />)
      continue
    }
    // Headings # / ## / ###
    const hMatch = line.match(/^(#{1,3})\s+(.+)/)
    if (hMatch) {
      const level = hMatch[1].length
      const sizes = ['1.2em','1.05em','0.95em']
      nodes.push(
        <p key={k++} style={{ fontWeight: 700, fontSize: sizes[level-1], marginTop: 10, marginBottom: 2,
          color: 'var(--text-primary)' }}>
          {renderInline(hMatch[2])}
        </p>
      )
      continue
    }
    // Blockquote >
    if (line.startsWith('> ')) {
      nodes.push(
        <div key={k++} style={{ borderLeft: '3px solid var(--accent-1)', paddingLeft: 10,
          margin: '4px 0', color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.93em' }}>
          {renderInline(line.slice(2))}
        </div>
      )
      continue
    }
    // Unordered list - or *
    if (/^[-*]\s/.test(line)) {
      nodes.push(
        <div key={k++} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 2 }}>
          <span style={{ color: 'var(--accent-3)', marginTop: 2, flexShrink: 0 }}>•</span>
          <span>{renderInline(line.slice(2))}</span>
        </div>
      )
      continue
    }
    // Image on own line
    const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/)
    if (imgMatch) {
      nodes.push(
        <img key={k++} src={imgMatch[2]} alt={imgMatch[1]}
             style={{ maxWidth: '100%', borderRadius: 10, margin: '8px 0', display: 'block',
               border: '1px solid var(--border)' }} />
      )
      continue
    }
    // Empty line → spacing
    if (!line.trim()) {
      nodes.push(<div key={k++} style={{ height: 6 }} />)
      continue
    }
    // Normal paragraph
    nodes.push(
      <p key={k++} style={{ marginBottom: 2 }}>{renderInline(line)}</p>
    )
  }

  return (
    <div className={className}
         style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-primary)', ...style }}>
      {nodes}
    </div>
  )
}
