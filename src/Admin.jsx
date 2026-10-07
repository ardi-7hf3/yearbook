import { useEffect, useState } from 'react'
import { supabase, loadPages } from './supabase.js'

const KINDS = { cover: 'Cover', text: 'Teks', photo: 'Foto', quote: 'Kutipan' }
const newPage = () => ({ id: crypto.randomUUID(), kind: 'text', title: '', body: '', image_url: '' })

export default function Admin() {
  const [session, setSession] = useState(null)
  const [ready, setReady] = useState(false)
  const [pages, setPages] = useState([])
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])
  useEffect(() => {
    if (session) loadPages().then((d) => setPages(d.map((p) => (String(p.id).startsWith('d') ? { ...p, id: crypto.randomUUID() } : p))))
  }, [session])

  if (!supabase) return <Box><p>Supabase belum diatur. Isi <b>.env</b> (lihat .env.example), lalu jalankan ulang.</p></Box>
  if (!ready) return null
  if (!session) return <Login />

  const set = (i, patch) => setPages(pages.map((p, j) => (j === i ? { ...p, ...patch } : p)))
  const move = (i, d) => {
    const j = i + d
    if (j < 0 || j >= pages.length) return
    const a = [...pages]; [a[i], a[j]] = [a[j], a[i]]; setPages(a)
  }
  const upload = async (i, file) => {
    if (!file) return
    setMsg('Mengunggah gambar…')
    const path = `${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`
    const { error } = await supabase.storage.from('yearbook').upload(path, file)
    if (error) return setMsg('Gagal unggah: ' + error.message)
    set(i, { image_url: supabase.storage.from('yearbook').getPublicUrl(path).data.publicUrl })
    setMsg('Gambar terunggah. Klik Simpan perubahan.')
  }
  const save = async () => {
    setMsg('Menyimpan…')
    const rows = pages.map((p, i) => ({ ...p, sort: i }))
    const { data: old } = await supabase.from('yearbook_pages').select('id')
    const gone = (old || []).map((o) => o.id).filter((id) => !rows.some((r) => r.id === id))
    if (gone.length) await supabase.from('yearbook_pages').delete().in('id', gone)
    const { error } = await supabase.from('yearbook_pages').upsert(rows)
    setMsg(error ? 'Gagal simpan: ' + error.message : 'Tersimpan.')
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="heading text-3xl">Edit yearbook</h1>
        <div className="flex gap-2">
          <button className="btn btn-gray" onClick={() => supabase.auth.signOut()}>Keluar</button>
          <button className="btn btn-red" onClick={save}><span className="icon !text-lg">save</span>Simpan perubahan</button>
        </div>
      </div>
      {msg && <p className="text-sm font-semibold text-mute" role="status">{msg}</p>}
      {pages.map((p, i) => (
        <section key={p.id} className="flex flex-col gap-3 rounded-[32px] bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-black">Halaman {i + 1}</h2>
            <div className="flex gap-1">
              <IconBtn icon="arrow_upward" label="Naikkan" onClick={() => move(i, -1)} />
              <IconBtn icon="arrow_downward" label="Turunkan" onClick={() => move(i, 1)} />
              <IconBtn icon="delete" label="Hapus" onClick={() => setPages(pages.filter((_, j) => j !== i))} />
            </div>
          </div>
          <select className="field" value={p.kind} onChange={(e) => set(i, { kind: e.target.value })} aria-label="Jenis halaman">
            {Object.entries(KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input className="field" placeholder="Judul" value={p.title || ''} onChange={(e) => set(i, { title: e.target.value })} />
          <textarea className="field" rows={3} placeholder="Teks" value={p.body || ''} onChange={(e) => set(i, { body: e.target.value })} />
          {p.kind === 'photo' && (
            <div className="flex flex-wrap items-center gap-3">
              {p.image_url && <img src={p.image_url} alt="" className="h-20 w-16 rounded-2xl object-cover" />}
              <input className="field flex-1" placeholder="URL gambar" value={p.image_url || ''} onChange={(e) => set(i, { image_url: e.target.value })} />
              <label className="btn btn-gray"><span className="icon !text-lg">upload</span>Unggah<input type="file" accept="image/*" hidden onChange={(e) => upload(i, e.target.files[0])} /></label>
            </div>
          )}
        </section>
      ))}
      <button className="btn btn-gray self-start" onClick={() => setPages([...pages, newPage()])}><span className="icon !text-lg">add</span>Tambah halaman</button>
    </div>
  )
}

const Box = ({ children }) => <div className="mx-auto max-w-md rounded-[32px] bg-white p-8">{children}</div>
const IconBtn = ({ icon, label, onClick }) => (
  <button aria-label={label} onClick={onClick} className="btn btn-gray !h-10 !w-10 !justify-center !rounded-full !p-0"><span className="icon">{icon}</span></button>
)

function Login() {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const go = async (e) => {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw })
    if (error) setErr('Email atau kata sandi salah.')
  }
  return (
    <Box>
      <form onSubmit={go} className="flex flex-col gap-3">
        <h1 className="heading text-2xl">Masuk admin</h1>
        <input className="field" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="field" type="password" placeholder="Kata sandi" value={pw} onChange={(e) => setPw(e.target.value)} required />
        {err && <p className="text-sm font-semibold text-[#9e0a0a]">{err}</p>}
        <button className="btn btn-red justify-center">Masuk</button>
      </form>
    </Box>
  )
}
