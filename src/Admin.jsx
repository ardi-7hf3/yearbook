import { useEffect, useState } from 'react'
import { supabase, loadBook, SETTINGS_ID } from './supabase.js'

const blank = (kind) => ({ id: crypto.randomUUID(), kind, title: '', body: '', image_url: '' })
const reid = (r) => (String(r.id).startsWith('d') ? { ...r, id: crypto.randomUUID() } : r)

// Baris database -> cover depan, cover belakang, dan daftar kertas (siswa berpasangan, Canva, atau halaman lama)
function toState(rows) {
  const covers = rows.filter((r) => r.kind === 'cover').map(reid)
  const mid = rows.filter((r) => r.kind !== 'cover').map(reid)
  const papers = []
  for (let i = 0; i < mid.length; i++) {
    const r = mid[i]
    if (r.kind === 'student') {
      const nx = mid[i + 1]
      if (nx && nx.kind === 'student') { papers.push({ id: r.id, type: 'students', rows: [r, nx] }); i++ }
      else papers.push({ id: r.id, type: 'students', rows: [r] })
    } else papers.push({ id: r.id, type: r.kind === 'canva' ? 'canva' : 'old', rows: [r] })
  }
  covers.slice(1, -1).forEach((r) => papers.push({ id: r.id, type: 'old', rows: [r] }))
  return {
    front: covers[0] || blank('cover'),
    back: covers.length > 1 ? covers[covers.length - 1] : blank('cover'),
    papers,
  }
}

export default function Admin() {
  const [session, setSession] = useState(null)
  const [ready, setReady] = useState(false)
  const [front, setFront] = useState(null)
  const [back, setBack] = useState(null)
  const [papers, setPapers] = useState([])
  const [bg, setBg] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])
  useEffect(() => {
    if (!session) return
    loadBook().then(({ pages, bg: b }) => {
      const s = toState(pages)
      setFront(s.front); setBack(s.back); setPapers(s.papers); setBg(b)
    })
  }, [session])

  if (!supabase) return <Box><p>Supabase belum diatur. Isi <b>.env</b> (lihat .env.example), lalu jalankan ulang.</p></Box>
  if (!ready) return null
  if (!session) return <Login />
  if (!front) return <p className="text-center text-mute">Memuat…</p>

  const uploadFile = async (file) => {
    if (!file) return null
    setMsg('Mengunggah gambar…')
    const path = `${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`
    const { error } = await supabase.storage.from('yearbook').upload(path, file)
    if (error) { setMsg('Gagal unggah: ' + error.message); return null }
    setMsg('Gambar terunggah. Klik Simpan perubahan.')
    return supabase.storage.from('yearbook').getPublicUrl(path).data.publicUrl
  }
  const imgHandler = (apply) => async (f) => { const u = await uploadFile(f); if (u) apply(u) }

  const move = (i, d) => {
    const j = i + d
    if (j < 0 || j >= papers.length) return
    const a = [...papers]; [a[i], a[j]] = [a[j], a[i]]; setPapers(a)
  }
  const editRow = (pi, ri, patch) =>
    setPapers(papers.map((p, i) => (i === pi ? { ...p, rows: p.rows.map((r, j) => (j === ri ? { ...r, ...patch } : r)) } : p)))
  const addStudents = () => { const a = blank('student'), b = blank('student'); setPapers([...papers, { id: a.id, type: 'students', rows: [a, b] }]) }
  const addCanva = () => { const r = blank('canva'); setPapers([...papers, { id: r.id, type: 'canva', rows: [r] }]) }

  const save = async () => {
    setMsg('Menyimpan…')
    const rows = [{ ...front, kind: 'cover' }, ...papers.flatMap((p) => p.rows), { ...back, kind: 'cover' }].map((r, i) => ({ ...r, sort: i }))
    rows.push({ id: SETTINGS_ID, sort: -1, kind: 'settings', title: '', body: '', image_url: bg })
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

      <Card title="Background website">
        <p className="text-sm text-mute">Gambar di belakang buku. Isi URL, atau unggah dari perangkat (mis. hasil Canva).</p>
        <ImageField url={bg} onUrl={setBg} onFile={imgHandler(setBg)} />
      </Card>

      <CoverEditor label="Cover depan" c={front} onChange={(p) => setFront({ ...front, ...p })} onFile={imgHandler} />

      <h2 className="heading mt-2 text-2xl">Kertas siswa</h2>
      <p className="-mt-2 text-sm text-mute">Satu kertas berisi 2 siswa (foto + kata-kata), atau satu gambar jadi dari Canva.</p>
      {papers.map((p, pi) => (
        <Card key={p.id} title={`Kertas ${pi + 1} · ${p.type === 'students' ? 'Siswa' : p.type === 'canva' ? 'Gambar Canva' : 'Halaman lama'}`}
          actions={<>
            <IconBtn icon="arrow_upward" label="Naikkan" onClick={() => move(pi, -1)} />
            <IconBtn icon="arrow_downward" label="Turunkan" onClick={() => move(pi, 1)} />
            <IconBtn icon="delete" label="Hapus" onClick={() => setPapers(papers.filter((_, i) => i !== pi))} />
          </>}>
          {p.type === 'students' && p.rows.map((r, ri) => (
            <div key={r.id} className="flex flex-col gap-3 rounded-3xl bg-card p-4">
              <h3 className="font-semibold text-black">Siswa {ri + 1}</h3>
              <input className="field" placeholder="Nama siswa" value={r.title || ''} onChange={(e) => editRow(pi, ri, { title: e.target.value })} />
              <textarea className="field" rows={2} placeholder="Kata-kata siswa" value={r.body || ''} onChange={(e) => editRow(pi, ri, { body: e.target.value })} />
              <ImageField url={r.image_url} onUrl={(u) => editRow(pi, ri, { image_url: u })} onFile={imgHandler((u) => editRow(pi, ri, { image_url: u }))} />
            </div>
          ))}
          {p.type === 'canva' && (
            <>
              <p className="text-sm text-mute">Gambar rasio 3:4 (mis. 1260×1680 px) dari Canva. Tampil penuh satu kertas.</p>
              <ImageField url={p.rows[0].image_url} onUrl={(u) => editRow(pi, 0, { image_url: u })} onFile={imgHandler((u) => editRow(pi, 0, { image_url: u }))} />
            </>
          )}
          {p.type === 'old' && <p className="text-sm text-mute">Halaman lama ({p.rows[0].kind}{p.rows[0].title ? `: ${p.rows[0].title}` : ''}). Tetap tampil; hapus jika tidak dipakai.</p>}
        </Card>
      ))}
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-gray" onClick={addStudents}><span className="icon !text-lg">group_add</span>Tambah kertas siswa</button>
        <button className="btn btn-gray" onClick={addCanva}><span className="icon !text-lg">image</span>Tambah kertas Canva</button>
      </div>

      <CoverEditor label="Cover belakang" c={back} onChange={(p) => setBack({ ...back, ...p })} onFile={imgHandler} />
    </div>
  )
}

function CoverEditor({ label, c, onChange, onFile }) {
  const [mode, setMode] = useState(c.image_url && !c.title && !c.body ? 'canva' : 'manual')
  const pick = (m) => { setMode(m); if (m === 'canva') onChange({ title: '', body: '' }) }
  return (
    <Card title={label}>
      <div className="flex gap-2">
        <button className={`btn ${mode === 'manual' ? 'btn-red' : 'btn-gray'}`} onClick={() => pick('manual')}>Manual (dari website)</button>
        <button className={`btn ${mode === 'canva' ? 'btn-red' : 'btn-gray'}`} onClick={() => pick('canva')}>Gambar Canva</button>
      </div>
      {mode === 'manual' ? (
        <>
          <input className="field" placeholder="Judul" value={c.title || ''} onChange={(e) => onChange({ title: e.target.value })} />
          <textarea className="field" rows={2} placeholder="Teks" value={c.body || ''} onChange={(e) => onChange({ body: e.target.value })} />
          <p className="text-sm text-mute">Background cover (opsional). Kosongkan untuk desain polos bawaan.</p>
        </>
      ) : (
        <p className="text-sm text-mute">Buat di Canva rasio 3:4 (mis. 1260×1680 px), unduh PNG/JPG, lalu unggah. Tampil penuh satu halaman.</p>
      )}
      <ImageField url={c.image_url} onUrl={(u) => onChange({ image_url: u })} onFile={onFile((u) => onChange({ image_url: u }))} />
    </Card>
  )
}

const Box = ({ children }) => <div className="mx-auto max-w-md rounded-[32px] bg-white p-8">{children}</div>
const Card = ({ title, actions, children }) => (
  <section className="flex flex-col gap-3 rounded-[32px] bg-white p-6">
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-lg font-semibold text-black">{title}</h2>
      {actions && <div className="flex gap-1">{actions}</div>}
    </div>
    {children}
  </section>
)
const IconBtn = ({ icon, label, onClick }) => (
  <button aria-label={label} onClick={onClick} className="btn btn-gray !h-10 !w-10 !justify-center !rounded-full !p-0"><span className="icon">{icon}</span></button>
)

function ImageField({ url, onUrl, onFile }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {url && <img src={url} alt="" className="h-20 w-16 rounded-2xl object-cover" />}
      <input className="field min-w-0 flex-1" placeholder="URL gambar" value={url || ''} onChange={(e) => onUrl(e.target.value)} />
      <label className="btn btn-gray"><span className="icon !text-lg">upload</span>Unggah<input type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files[0])} /></label>
      {url && <button className="btn btn-gray" onClick={() => onUrl('')}><span className="icon !text-lg">close</span>Hapus</button>}
    </div>
  )
}

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
