import { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import HTMLFlipBook from 'react-pageflip'

/* Elemen polos buatan Claude. Cari komentar "SLOT" untuk menaruh elemen Anda sendiri. */
const Pita = ({ className }) => (
  <img src={`${import.meta.env.BASE_URL}pita.png`} alt="" draggable={false} className={`pointer-events-none absolute left-1/2 -translate-x-1/2 ${className}`} />
)
const COVERISH = ['cover', 'inner-front', 'inner-back']
const Circle = ({ className }) => <div className={`absolute rounded-full ${className}`} />

const Page = forwardRef(({ p, n }, ref) => {
  const base = 'relative h-full w-full overflow-hidden bg-white'
  let body
  if (p.kind === 'canva' || (COVERISH.includes(p.kind) && p.image_url && !p.title && !p.body)) {
    // halaman/cover dari gambar jadi (mis. dibuat di Canva): penuh satu kertas
    body = <div className={base}><img src={p.image_url} alt={p.title || ''} className="h-full w-full object-cover" draggable={false} /></div>
  } else if (p.kind === 'cover') {
    const hasImg = !!p.image_url
    body = (
      <div className={`${base} bg-card flex flex-col justify-end p-8`}>
        {/* SLOT: dekorasi cover */}
        {hasImg ? (
          <>
            <img src={p.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          </>
        ) : (
          <>
            <Circle className="-right-16 -top-16 h-64 w-64 bg-brand" />
            <Circle className="left-8 top-24 h-20 w-20 bg-black" />
          </>
        )}
        <div className="absolute left-8 top-8 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-black">Yearbook</div>
        <h1 className={`display relative text-4xl sm:text-5xl ${hasImg ? '!text-white' : ''}`}>{p.title}</h1>
        <p className={`relative mt-3 text-base font-semibold ${hasImg ? 'text-white/85' : 'text-mute'}`}>{p.body}</p>
      </div>
    )
  } else if (p.kind === 'inner-front' || p.kind === 'inner-back') {
    // bagian dalam cover (belakang kertas cover): bisa diisi teks / foto / background dari panel admin
    const hasImg = !!p.image_url
    body = (
      <div className={`${base} flex flex-col items-center justify-center bg-soft p-8 text-center`}>
        {/* SLOT: dekorasi dalam cover */}
        {hasImg && (
          <>
            <img src={p.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
            <div className="absolute inset-0 bg-black/40" />
          </>
        )}
        <h2 className={`heading relative text-3xl ${hasImg ? '!text-white' : ''}`}>{p.title}</h2>
        <p className={`relative mt-3 max-w-[30ch] text-base ${hasImg ? 'text-white/90' : 'text-body'}`}>{p.body}</p>
      </div>
    )
  } else if (p.kind === 'blank') {
    body = <div className={`${base} bg-soft`} />
  } else if (p.kind === 'students') {
    // satu kertas = 2 siswa (foto polaroid + nama + kata-kata)
    body = (
      <div className={`${base} flex flex-col justify-center gap-[3%] bg-card px-[9%] py-5 [container-type:inline-size]`}>
        {/* SLOT: dekorasi halaman siswa */}
        {p.items.map((s, k) => (
          <figure key={s.id} className={`relative m-0 flex max-h-[48%] min-h-0 w-[80%] flex-1 flex-col bg-white p-[2.4cqw] pb-[3cqw] shadow-[0_6px_20px_rgba(0,0,0,0.12)] ${k ? 'self-end rotate-1' : 'self-start -rotate-1'}`}>
            <Pita className="-top-4 z-10 w-10" />
            <div className="min-h-0 flex-1 overflow-hidden bg-soft">
              {s.image_url && <img src={s.image_url} alt={s.title} className="h-full w-full object-cover" loading="lazy" draggable={false} />}
            </div>
            <figcaption className="shrink-0 px-[1cqw] pt-[2.6cqw]">
              <h2 className="heading text-[clamp(14px,4.4cqw,20px)] leading-tight">{s.title}</h2>
              <p className="mt-1 line-clamp-2 text-[clamp(11px,3.2cqw,14px)] leading-snug text-body">“{s.body}”</p>
            </figcaption>
          </figure>
        ))}
      </div>
    )
  } else if (p.kind === 'photo') {
    body = (
      <div className={base}>
        <img src={p.image_url} alt={p.title} className="h-full w-full object-cover" loading="lazy" draggable={false} />
        {/* SLOT: pita di atas foto */}
        <Pita className="top-3 w-14" />
        {p.title && <span className="absolute bottom-5 left-5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-black">{p.title}</span>}
      </div>
    )
  } else if (p.kind === 'quote') {
    body = (
      <div className={`${base} bg-black flex flex-col justify-center p-8 text-white`}>
        {/* SLOT: dekorasi quote */}
        <Circle className="-bottom-12 -left-12 h-44 w-44 border-[14px] border-white/15" />
        <p className="heading text-3xl !text-white sm:text-4xl">“{p.title}”</p>
        <p className="mt-4 text-sm font-semibold text-white/70">{p.body}</p>
      </div>
    )
  } else {
    body = (
      <div className={`${base} flex flex-col justify-center bg-soft p-8`}>
        {/* SLOT: dekorasi halaman teks */}
        <div className="absolute right-6 top-6 h-10 w-10 rounded-2xl bg-card" />
        <h2 className="heading text-3xl">{p.title}</h2>
        <p className="mt-4 max-w-[34ch] text-base leading-[1.5] text-body">{p.body}</p>
      </div>
    )
  }
  return (
    <div ref={ref} className="page">
      {body}
      {!COVERISH.includes(p.kind) && p.kind !== 'blank' && <span className="absolute bottom-3 right-4 text-xs font-medium text-ash">{n}</span>}
    </div>
  )
})

// Susunan buku: cover depan, DALAM cover depan, kertas-kertas, DALAM cover belakang, cover belakang.
// Siswa berurutan digabung 2 per kertas. Di portrait (1 halaman) bagian dalam cover tidak ditampilkan.
function group(rows, portrait) {
  let list = [...rows]
  const lastCover = list.map((r) => r.kind).lastIndexOf('cover')
  const firstCover = list.findIndex((r) => r.kind === 'cover')
  const mk = (kind) => ({ id: kind + '-default', kind, title: '', body: '', image_url: '' })
  if (!list.some((r) => r.kind === 'inner-back')) list.splice(lastCover > firstCover ? lastCover : list.length, 0, mk('inner-back'))
  if (!list.some((r) => r.kind === 'inner-front')) list.splice(firstCover + 1, 0, mk('inner-front'))
  if (portrait) list = list.filter((r) => r.kind !== 'inner-front' && r.kind !== 'inner-back')

  const out = []
  let buf = []
  const flush = () => { if (buf.length) { out.push({ id: buf.map((b) => b.id).join('+'), kind: 'students', items: buf }); buf = [] } }
  for (const r of list) {
    if (r.kind === 'student') { buf.push(r); if (buf.length === 2) flush() }
    else { flush(); out.push(r) }
  }
  flush()
  // jumlah halaman harus genap agar cover belakang tampil sendirian di akhir (landscape)
  if (!portrait && out.length % 2 === 1) out.splice(Math.max(1, out.length - 2), 0, { id: 'blank', kind: 'blank' })
  return out
}

export default function Yearbook({ pages: rows }) {
  const [portrait, setPortrait] = useState(() => Math.min(window.innerWidth, 920) - 32 < 520)
  const pages = useMemo(() => group(rows, portrait), [rows, portrait])
  // orientasi sebenarnya dilaporkan library; jika berbeda dari dugaan awal, susun ulang buku
  const onOrient = (mode) => {
    if (mode !== 'portrait' && mode !== 'landscape') return
    const p = mode === 'portrait'
    if (p !== portrait) { setPortrait(p); setCur(0) }
  }
  const book = useRef()
  const wrap = useRef()
  const [cur, setCur] = useState(0)
  const flip = (d) => {
    wrap.current.dataset.dir = d > 0 ? 'next' : 'prev'
    book.current?.pageFlip()[d > 0 ? 'flipNext' : 'flipPrev']()
  }
  // arah saat klik/tarik langsung ke buku (aturan library di portrait: 20% sisi kiri = mundur, selebihnya = maju)
  const onDown = (e) => {
    const host = wrap.current.querySelector('.stf__parent') || wrap.current
    const r = host.getBoundingClientRect()
    wrap.current.dataset.dir = e.clientX - r.left < r.width * 0.2 ? 'prev' : 'next'
  }
  // Tandai lembar yang sedang dibalik (bagian yang terlipat) pada setiap frame animasi.
  // Dipilih lewat rotasi / z-index tertinggi, jadi berlaku sama untuk cover, kertas isi, dan cover belakang.
  const raf = useRef(0)
  const clearMark = () => wrap.current?.querySelectorAll('[data-flipper]').forEach((el) => el.removeAttribute('data-flipper'))
  const mark = () => {
    const all = [...wrap.current.querySelectorAll('.stf__item')].filter((el) => getComputedStyle(el).display !== 'none')
    const live = all.filter((el) => !el.classList.contains('--simple'))
    const c = live.length ? live : all
    const rotated = c.filter((el) => {
      const t = getComputedStyle(el).transform
      return t !== 'none' && Math.abs(new DOMMatrixReadOnly(t).b) > 1e-4
    })
    let pick = rotated.length === 1 ? rotated[0] : null
    if (!pick) pick = c.reduce((a, el) => ((parseInt(getComputedStyle(el).zIndex) || 0) >= (a ? parseInt(getComputedStyle(a).zIndex) || 0 : -1) ? el : a), null)
    clearMark()
    pick?.setAttribute('data-flipper', '')
  }
  const loop = () => {
    if (wrap.current?.dataset.flip !== 'on') { clearMark(); raf.current = 0; return }
    mark()
    raf.current = requestAnimationFrame(loop)
  }
  // belakang kertas putih polos hanya di layar portrait (HP vertikal), maju saja (lihat index.css)
  const onState = (e) => {
    wrap.current.dataset.mode = book.current?.pageFlip().getOrientation() // portrait | landscape
    const on = e.data === 'flipping' || e.data === 'user_fold'
    wrap.current.dataset.flip = on ? 'on' : 'off'
    if (on && !raf.current) raf.current = requestAnimationFrame(loop)
    if (!on) { cancelAnimationFrame(raf.current); raf.current = 0; clearMark() }
  }

  useEffect(() => {
    const k = (e) => { if (e.key === 'ArrowRight') flip(1); if (e.key === 'ArrowLeft') flip(-1) }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])

  return (
    <div className="flex flex-col items-center gap-6">
      <div ref={wrap} onPointerDownCapture={onDown} className="w-full max-w-[920px] px-4">
        <HTMLFlipBook
          key={portrait ? 'portrait' : 'landscape'} ref={book} width={420} height={560} size="stretch"
          minWidth={260} maxWidth={460} minHeight={360} maxHeight={640}
          showCover startZIndex={100} maxShadowOpacity={0.35} drawShadow flippingTime={800}
          mobileScrollSupport onFlip={(e) => setCur(e.data)} onChangeState={onState}
          onInit={(e) => onOrient(e.data?.mode)} onChangeOrientation={(e) => onOrient(e.data)}
          className="mx-auto" style={{}}
        >
          {pages.map((p, i) => <Page key={p.id} p={p} n={i + 1} />)}
        </HTMLFlipBook>
      </div>
      <div className="flex items-center gap-4">
        <button aria-label="Halaman sebelumnya" className="btn btn-gray !h-12 !w-12 !justify-center !rounded-full !p-0" onClick={() => flip(-1)}><span className="icon">arrow_back</span></button>
        <span className="min-w-20 text-center text-sm font-semibold text-mute">{cur + 1} / {pages.length}</span>
        <button aria-label="Halaman berikutnya" className="btn btn-gray !h-12 !w-12 !justify-center !rounded-full !p-0" onClick={() => flip(1)}><span className="icon">arrow_forward</span></button>
      </div>
    </div>
  )
}
