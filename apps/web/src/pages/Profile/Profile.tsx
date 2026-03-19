import { useState, FormEvent } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { api } from '../../api/client'
import { PageHeader, Card, Button } from '../../components/ui/index'

const TURMAS = ['2026102', '2026104', '2026194']

export default function Profile() {
  const user = useAuthStore((s) => s.user)
  const updateUser = useAuthStore((s) => s.updateUser)
  const logout = useAuthStore((s) => s.logout)
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [bio, setBio] = useState(user?.bio ?? '')
  const [turma, setTurma] = useState(user?.turma ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function handleSave(e: FormEvent) {
    e.preventDefault(); setSaving(true); setError(''); setSaved(false)
    try {
      const { data } = await api.patch('/auth/me', { displayName, bio, turma })
      updateUser(data.user); setSaved(true); setTimeout(() => setSaved(false), 3000)
    } catch { setError('Erro ao salvar. Tente novamente.') }
    finally { setSaving(false) }
  }

  if (!user) return null

  return (
    <div>
      <PageHeader eyebrow="Conta" title="Meu Perfil" />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24, maxWidth:720 }}>
        <Card>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, padding:'8px 0 16px' }}>
            <div style={{ width:72, height:72, borderRadius:'50%', background:'linear-gradient(135deg,var(--primary),var(--accent))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, fontWeight:700, color:'white' }}>
              {(user.displayName ?? user.email)[0]?.toUpperCase()}
            </div>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontWeight:700, fontSize:17, color:'var(--text)' }}>{user.displayName ?? 'Usuário'}</div>
              <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:2 }}>{user.email}</div>
              {user.turma && <div style={{ fontSize:12, color:'var(--text-dim)', marginTop:4 }}>Turma {user.turma}</div>}
            </div>
            <span style={{ fontSize:10, fontWeight:600, padding:'3px 8px', borderRadius:5, background:'rgba(124,58,237,.2)', color:'var(--primary)', letterSpacing:'.05em' }}>{user.role}</span>
          </div>
          <Button variant="danger" onClick={logout} style={{ width:'100%', justifyContent:'center' }}>Encerrar sessão</Button>
        </Card>

        <Card>
          <h2 style={{ fontSize:15, fontWeight:600, color:'var(--text)', marginBottom:16 }}>Editar perfil</h2>
          {error && <div style={{ background:'rgba(239,68,68,.12)', border:'1px solid rgba(239,68,68,.3)', color:'var(--danger)', borderRadius:8, padding:'8px 12px', fontSize:13, marginBottom:12 }}>{error}</div>}
          {saved && <div style={{ background:'rgba(34,197,94,.1)', border:'1px solid rgba(34,197,94,.3)', color:'var(--success)', borderRadius:8, padding:'8px 12px', fontSize:13, marginBottom:12 }}>Perfil atualizado!</div>}
          <form onSubmit={handleSave} style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {[['Nome', 'text', displayName, setDisplayName], ['Bio', 'text', bio, setBio]].map(([label, type, val, setter]) => (
              <div key={label as string}>
                <label style={{ fontSize:12, fontWeight:500, color:'var(--text-muted)', display:'block', marginBottom:4 }}>{label as string}</label>
                <input type={type as string} value={val as string} onChange={(e)=>(setter as (v:string)=>void)(e.target.value)}
                  style={{ width:'100%', background:'var(--glass)', border:'1px solid var(--glass-border)', borderRadius:8, padding:'8px 12px', color:'var(--text)', fontSize:13 }} />
              </div>
            ))}
            <div>
              <label style={{ fontSize:12, fontWeight:500, color:'var(--text-muted)', display:'block', marginBottom:4 }}>Turma</label>
              <select value={turma} onChange={(e)=>setTurma(e.target.value)}
                style={{ width:'100%', background:'var(--glass)', border:'1px solid var(--glass-border)', borderRadius:8, padding:'8px 12px', color:'var(--text)', fontSize:13 }}>
                <option value="">Selecionar turma</option>
                {TURMAS.map((t)=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <Button type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar alterações'}</Button>
          </form>
        </Card>
      </div>
      <style>{`@media(max-width:600px){div[style*="grid-template-columns:1fr 1fr"]{grid-template-columns:1fr!important;}}`}</style>
    </div>
  )
}
