import { useEffect, useRef } from 'react'

export function InstagramEmbed({ url, name }: { url: string; name: string }) {
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Load the Instagram embed script once, then re-process on every url change
    const process = () => {
      const ig = (window as unknown as { instgrm?: { Embeds: { process: () => void } } }).instgrm
      if (ig?.Embeds) {
        ig.Embeds.process()
      }
    }

    if (!(window as unknown as { instgrm?: unknown }).instgrm) {
      const script = document.getElementById('ig-embed-script') ?? (() => {
        const s = document.createElement('script')
        s.id = 'ig-embed-script'
        s.src = 'https://www.instagram.com/embed.js'
        s.async = true
        s.onload = process
        document.body.appendChild(s)
        return s
      })()
      void script
    } else {
      process()
    }
  }, [url])

  return (
    <div ref={wrapRef} className="ent-ig-embed-wrap">
      <blockquote
        className="instagram-media"
        data-instgrm-permalink={url}
        data-instgrm-version="14"
        data-instgrm-captioned
        style={{ background: '#FFF', border: 0, borderRadius: '3px', boxShadow: '0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15)', margin: '1px', maxWidth: '540px', minWidth: '326px', padding: 0, width: 'calc(100% - 2px)' }}
      >
        <div style={{ padding: '16px' }}>
          <a href={url} target="_blank" rel="noopener noreferrer" style={{ background: '#FFFFFF', lineHeight: 0, padding: 0, textAlign: 'center', textDecoration: 'none', width: '100%' }}>
            Ver publicações de {name} no Instagram
          </a>
        </div>
      </blockquote>
    </div>
  )
}
