import { useEffect, useState } from 'react'
import { supabase, loadBook, SETTINGS_ID } from './supabase.js'
import { Page } from './Yearbook.jsx'

const blank = (kind) => ({ id: crypto.randomUUID(), kind, title: '', body: '', image_url: '' })
const reid = (r) => (String(r.id).startsWith('d') ? { ...r, id: crypto.randomUUID() } : r)

// Baris database -> cover, dalam cover, dan daftar kertas (siswa berpasangan, Canva, atau halaman lama)
function toState(rows) {
  const covers = rows.filter((r) => r.kind === 'cover').map(reid)
  const inner = (k) => (rows.find((r) => r.kind === k) ? reid(rows.find((r) => r.kind === k)) : blank(k))
  const mid = rows.filter((r) => !['cover', 'inner-front', 'inner-back'].includes(r.kind)).map(reid)
  const papers = []
  let pendingBg = '' // baris 'paper-bg' = background untuk kertas siswa berikutnya
  for (let i = 0; i < mid.length; i++) {
    const r = mid[i]
    if (r.kind === 'paper-bg') { pendingBg = r.image_url || ''; continue }
    if (r.kind === 'student') {
      const nx = mid[i + 1]
      const bgv = pendingBg; pendingBg = ''
      if (nx && nx.kind === 'student') { papers.push({ id: r.id, type: 'students', bg: bgv, rows: [r, nx] }); i++ }
      else papers.push({ id: r.id, type: 'students', bg: bgv, rows: [r] })
    } else { pendingBg = ''; papers.push({ id: r.id, type: r.kind === 'canva' ? 'canva' : 'old', rows: [r] }) }
  }
  covers.slice(1, -1).forEach((r) => papers.push({ id: r.id, type: 'old', rows: [r] }))
  return {
    front: covers[0] || blank('cover'),
    innerF: inner('inner-front'),
    innerB: inner('inner-back'),
    back: covers.length > 1 ? covers[covers.length - 1] : blank('cover'),
    papers,
  }
}

export default function Admin() {
  const [session, setSession] = useState(null)
  const [ready, setReady] = useState(false)
  const [front, setFront] = useState(null)
  const [innerF, setInnerF] = useState(null)
  const [innerB, setInnerB] = useState(null)
  const [back, setBack] = useState(null)
  const [papers, setPapers] = useState([])
  const [bg, setBg] = useState('')
  const [sel, setSel] = useState(null)
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
      setFront(s.front); setInnerF(s.innerF); setInnerB(s.innerB); setBack(s.back); setPapers(s.papers); setBg(b)
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
  const editPaper = (pi, patch) => setPapers(papers.map((p, i) => (i === pi ? { ...p, ...patch } : p)))
  const addStudents = () => { const a = blank('student'), b = blank('student'); setPapers([...papers, { id: a.id, type: 'students', bg: '', rows: [a, b] }]); setSel(a.id) }
  const addCanva = () => { const r = blank('canva'); setPapers([...papers, { id: r.id, type: 'canva', rows: [r] }]); setSel(r.id) }

  const save = async () => {
    setMsg('Menyimpan…')
    const rows = [
      { ...front, kind: 'cover' }, { ...innerF, kind: 'inner-front' },
      ...papers.flatMap((p) => (p.type === 'students' && p.bg ? [{ id: crypto.randomUUID(), kind: 'paper-bg', title: '', body: '', image_url: p.bg }, ...p.rows] : p.rows)),
      { ...innerB, kind: 'inner-back' }, { ...back, kind: 'cover' },
    ].map((r, i) => ({ ...r, sort: i }))
    rows.push({ id: SETTINGS_ID, sort: -1, kind: 'settings', title: '', body: '', image_url: bg })
    const { data: old } = await supabase.from('yearbook_pages').select('id')
    const gone = (old || []).map((o) => o.id).filter((id) => !rows.some((r) => r.id === id))
    if (gone.length) await supabase.from('yearbook_pages').delete().in('id', gone)
    const { error } = await supabase.from('yearbook_pages').upsert(rows)
    setMsg(error ? 'Gagal simpan: ' + error.message : 'Tersimpan.')
  }

  // Daftar halaman persis seperti urutan di buku (dirender dengan komponen yang sama = pratinjau langsung)
  const tiles = [
    { key: 'front', label: 'Cover depan', page: { ...front, kind: 'cover' } },
    { key: 'innerF', label: 'Dalam cover depan', page: { ...innerF, kind: 'inner-front' } },
    ...papers.map((p, i) => ({
      key: p.id, label: `Kertas ${i + 1}`,
      page: p.type === 'students' ? { id: p.id, kind: 'students', items: p.rows, bg: p.bg } : p.rows[0],
    })),
    { key: 'innerB', label: 'Dalam cover belakang', page: { ...innerB, kind: 'inner-back' } },
    { key: 'back', label: 'Cover belakang', page: { ...back, kind: 'cover' } },
  ]
  const pi = papers.findIndex((p) => p.id === sel)
  const paper = pi >= 0 ? papers[pi] : null
  const coverMap = {
    front: [front, setFront, 'Cover depan'], innerF: [innerF, setInnerF, 'Dalam cover depan'],
    innerB: [innerB, setInnerB, 'Dalam cover belakang'], back: [back, setBack, 'Cover belakang'],
  }
  const cm = coverMap[sel]

  return (
    <div className={`mx-auto flex max-w-5xl flex-col gap-5 px-4 ${sel ? 'pb-[75vh] md:pb-8 md:pr-[440px]' : ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="heading text-3xl">Edit yearbook</h1>
        <div className="flex gap-2">
          <button className="btn btn-gray" onClick={() => supabase.auth.signOut()}>Keluar</button>
          <button className="btn btn-red" onClick={save}><span className="icon !text-lg">save</span>Simpan perubahan</button>
        </div>
      </div>
      {msg && <p className="text-sm font-semibold text-mute" role="status">{msg}</p>}
      <p className="text-sm text-mute">Pratinjau semua halaman sesuai urutan di buku. Ketuk halaman untuk mengubahnya.</p>

      <div className="grid grid-cols-[repeat(auto-fill,168px)] justify-center gap-x-4 gap-y-6">
        <Tile label="Background website" active={sel === 'bg'} onClick={() => setSel('bg')}>
          <div className="flex h-full w-full items-center justify-center bg-card bg-cover bg-center text-ash" style={bg ? { backgroundImage: `url("${encodeURI(bg)}")` } : undefined}>
            {!bg && <span className="icon !text-4xl">wallpaper</span>}
          </div>
        </Tile>
        {tiles.map((t, i) => (
          <Tile key={t.key} label={t.label} active={sel === t.key} onClick={() => setSel(t.key)}>
            <Thumb page={t.page} n={i + 1} />
          </Tile>
        ))}
        <AddTile icon="group_add" label="Tambah kertas siswa" onClick={addStudents} />
        <AddTile icon="image" label="Tambah kertas Canva" onClick={addCanva} />
      </div>

      {sel && (
        <aside className="fixed inset-x-0 bottom-0 z-30 flex max-h-[72vh] flex-col gap-3 overflow-y-auto rounded-t-[32px] bg-card p-4 shadow-[0_-8px_30px_rgba(0,0,0,0.18)] md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[420px] md:rounded-none">
          <div className="flex items-center justify-between gap-2">
            <h2 className="heading text-xl">{sel === 'bg' ? 'Background website' : cm ? cm[2] : `Kertas ${pi + 1}`}</h2>
            <div className="flex gap-1">
              {paper && <>
                <IconBtn icon="arrow_back" label="Geser maju" onClick={() => move(pi, -1)} />
                <IconBtn icon="arrow_forward" label="Geser mundur" onClick={() => move(pi, 1)} />
                <IconBtn icon="delete" label="Hapus kertas" onClick={() => { setPapers(papers.filter((_, i) => i !== pi)); setSel(null) }} />
              </>}
              <IconBtn icon="close" label="Tutup" onClick={() => setSel(null)} />
            </div>
          </div>

          {sel === 'bg' && (
            <Card title="Gambar background">
              <p className="text-sm text-mute">Gambar di belakang buku. Isi URL, atau unggah dari perangkat (mis. hasil Canva).</p>
              <ImageField url={bg} onUrl={setBg} onFile={imgHandler(setBg)} />
            </Card>
          )}
          {cm && <CoverEditor key={sel} c={cm[0]} onChange={(p) => cm[1]({ ...cm[0], ...p })} onFile={imgHandler} />}
          {paper && <PaperEditor p={paper} pi={pi} editRow={editRow} editPaper={editPaper} imgHandler={imgHandler} />}
          {msg && <p className="text-sm font-semibold text-mute" role="status">{msg}</p>}
        </aside>
      )}
    </div>
  )
}

function PaperEditor({ p, pi, editRow, editPaper, imgHandler }) {
  if (p.type === 'students') {
    return [
      <Card key="bg" title="Background kertas">
        <p className="text-sm text-mute">Gambar di belakang kedua foto siswa (opsional). Isi URL, atau unggah dari perangkat.</p>
        <ImageField url={p.bg} onUrl={(u) => editPaper(pi, { bg: u })} onFile={imgHandler((u) => editPaper(pi, { bg: u }))} />
      </Card>,
      ...p.rows.map((r, ri) => (
      <Card key={r.id} title={`Siswa ${ri + 1}`}>
        <input className="field" placeholder="Nama siswa" value={r.title || ''} onChange={(e) => editRow(pi, ri, { title: e.target.value })} />
        <textarea className="field" rows={2} placeholder="Kata-kata siswa" value={r.body || ''} onChange={(e) => editRow(pi, ri, { body: e.target.value })} />
        <ImageField url={r.image_url} onUrl={(u) => editRow(pi, ri, { image_url: u })} onFile={imgHandler((u) => editRow(pi, ri, { image_url: u }))} />
      </Card>
      )),
    ]
  }
  if (p.type === 'canva') {
    return (
      <Card title="Kertas dari Canva">
        <p className="text-sm text-mute">Gambar rasio 3:4 (mis. 1260×1680 px) dari Canva. Tampil penuh satu kertas.</p>
        <ImageField url={p.rows[0].image_url} onUrl={(u) => editRow(pi, 0, { image_url: u })} onFile={imgHandler((u) => editRow(pi, 0, { image_url: u }))} />
      </Card>
    )
  }
  return <Card title="Halaman lama"><p className="text-sm text-mute">Jenis {p.rows[0].kind}{p.rows[0].title ? `: ${p.rows[0].title}` : ''}. Tetap tampil di buku; hapus jika tidak dipakai.</p></Card>
}

function CoverEditor({ c, onChange, onFile }) {
  const [mode, setMode] = useState(c.image_url && !c.title && !c.body ? 'canva' : 'manual')
  const pick = (m) => { setMode(m); if (m === 'canva') onChange({ title: '', body: '' }) }
  return (
    <Card title="Isi halaman">
      <div className="flex gap-2">
        <button className={`btn ${mode === 'manual' ? 'btn-red' : 'btn-gray'}`} onClick={() => pick('manual')}>Manual</button>
        <button className={`btn ${mode === 'canva' ? 'btn-red' : 'btn-gray'}`} onClick={() => pick('canva')}>Gambar Canva</button>
      </div>
      {mode === 'manual' ? (
        <>
          <input className="field" placeholder="Judul" value={c.title || ''} onChange={(e) => onChange({ title: e.target.value })} />
          <textarea className="field" rows={2} placeholder="Teks" value={c.body || ''} onChange={(e) => onChange({ body: e.target.value })} />
          <p className="text-sm text-mute">Gambar background (opsional). Kosongkan untuk desain polos bawaan.</p>
        </>
      ) : (
        <p className="text-sm text-mute">Buat di Canva rasio 3:4 (mis. 1260×1680 px), unduh PNG/JPG, lalu unggah. Tampil penuh satu halaman.</p>
      )}
      <ImageField url={c.image_url} onUrl={(u) => onChange({ image_url: u })} onFile={onFile((u) => onChange({ image_url: u }))} />
    </Card>
  )
}

// Pratinjau halaman: komponen Page yang sama dengan buku, diskalakan 0.4 (420x560 -> 168x224)
const Thumb = ({ page, n }) => (
  <div style={{ width: 420, height: 560, transform: 'scale(0.4)', transformOrigin: 'top left' }} className="pointer-events-none [&>.page]:relative [&>.page]:h-full [&>.page]:w-full">
    <Page p={page} n={n} />
  </div>
)
const Tile = ({ label, active, onClick, children }) => (
  <div className="flex w-[168px] flex-col items-center gap-2">
    <div role="button" tabIndex={0} aria-label={label} onClick={onClick} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
      className={`h-[224px] w-[168px] cursor-pointer overflow-hidden rounded-xl bg-white shadow-[0_4px_14px_rgba(0,0,0,0.12)] transition ${active ? 'outline outline-4 outline-brand' : 'hover:-translate-y-0.5'}`}>
      {children}
    </div>
    <span className={`text-center text-xs font-semibold ${active ? 'text-black' : 'text-mute'}`}>{label}</span>
  </div>
)
const AddTile = ({ icon, label, onClick }) => (
  <div className="flex w-[168px] flex-col items-center gap-2">
    <button onClick={onClick} className="flex h-[224px] w-[168px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-hair bg-transparent text-mute hover:border-ash">
      <span className="icon !text-3xl">{icon}</span>
    </button>
    <span className="text-center text-xs font-semibold text-mute">{label}</span>
  </div>
)

const Box = ({ children }) => <div className="mx-auto max-w-md rounded-[32px] bg-white p-8">{children}</div>
const Card = ({ title, children }) => (
  <section className="flex flex-col gap-3 rounded-[28px] bg-white p-5">
    <h3 className="text-base font-semibold text-black">{title}</h3>
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
