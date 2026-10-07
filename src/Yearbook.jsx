import { forwardRef, useEffect, useRef, useState } from 'react'
import HTMLFlipBook from 'react-pageflip'

/* Elemen polos buatan Claude. Cari komentar "SLOT" untuk menaruh elemen Anda sendiri. */
const Pita = ({ className }) => (
  <img src={`${import.meta.env.BASE_URL}pita.png`} alt="" draggable={false} className={`pointer-events-none absolute left-1/2 -translate-x-1/2 ${className}`} />
)
const Circle = ({ className }) => <div className={`absolute rounded-full ${className}`} />

const Page = forwardRef(({ p, n }, ref) => {
  const base = 'relative h-full w-full overflow-hidden bg-white'
  let body
  if (p.kind === 'cover') {
    body = (
      <div className={`${base} bg-card flex flex-col justify-end p-8`}>
        {/* SLOT: dekorasi cover */}
        <Circle className="-right-16 -top-16 h-64 w-64 bg-brand" />
        <Circle className="left-8 top-24 h-20 w-20 bg-black" />
        <div className="absolute left-8 top-8 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-black">Yearbook</div>
        <h1 className="display text-4xl sm:text-5xl">{p.title}</h1>
        <p className="mt-3 text-base font-semibold text-mute">{p.body}</p>
      </div>
    )
  } else if (p.kind === 'student') {
    body = (
      <div className={`${base} flex items-center justify-center bg-card p-5`}>
        {/* SLOT: dekorasi halaman siswa */}
        <figure className={`relative m-0 w-full max-w-[340px] bg-white p-3 pb-5 shadow-[0_6px_20px_rgba(0,0,0,0.12)] ${n % 2 ? '-rotate-1' : 'rotate-1'}`}>
          <Pita className="-top-6 z-10 w-16" />
          <div className="aspect-square w-full overflow-hidden bg-soft">
            {p.image_url && <img src={p.image_url} alt={p.title} className="h-full w-full object-cover" loading="lazy" draggable={false} />}
          </div>
          <figcaption className="px-1 pt-4">
            <h2 className="heading text-xl">{p.title}</h2>
            <p className="mt-1.5 line-clamp-4 text-sm leading-[1.45] text-body">“{p.body}”</p>
          </figcaption>
        </figure>
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
      {p.kind !== 'cover' && <span className="absolute bottom-3 right-4 text-xs font-medium text-ash">{n}</span>}
    </div>
  )
})

export default function Yearbook({ pages }) {
  const book = useRef()
  const wrap = useRef()
  const [cur, setCur] = useState(0)
  const flip = (d) => {
    wrap.current.dataset.dir = d > 0 ? 'next' : 'prev'
    book.current?.pageFlip()[d > 0 ? 'flipNext' : 'flipPrev']()
  }
  // arah geser (klik/tarik sudut) ditentukan dari sisi buku yang disentuh
  const onDown = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    wrap.current.dataset.dir = e.clientX > r.left + r.width / 2 ? 'next' : 'prev'
  }
  // belakang kertas dibuat putih polos hanya selama animasi (lihat index.css)
  const onState = (e) => { wrap.current.dataset.flip = e.data === 'flipping' || e.data === 'user_fold' ? 'on' : 'off' }

  useEffect(() => {
    const k = (e) => { if (e.key === 'ArrowRight') flip(1); if (e.key === 'ArrowLeft') flip(-1) }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])

  return (
    <div className="flex flex-col items-center gap-6">
      <div ref={wrap} onPointerDownCapture={onDown} className="w-full max-w-[920px] px-4">
        <HTMLFlipBook
          ref={book} width={420} height={560} size="stretch"
          minWidth={260} maxWidth={460} minHeight={360} maxHeight={640}
          showCover maxShadowOpacity={0.35} drawShadow flippingTime={800}
          mobileScrollSupport onFlip={(e) => setCur(e.data)} onChangeState={onState}
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
