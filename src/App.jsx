import { useEffect, useState } from 'react'
import Yearbook from './Yearbook.jsx'
import Admin from './Admin.jsx'
import { loadBook } from './supabase.js'

export default function App() {
  const [route, setRoute] = useState(location.hash)
  const [book, setBook] = useState(null)

  useEffect(() => {
    const h = () => setRoute(location.hash)
    window.addEventListener('hashchange', h)
    return () => window.removeEventListener('hashchange', h)
  }, [])
  useEffect(() => { if (route !== '#/admin') loadBook().then(setBook) }, [route])

  const admin = route === '#/admin'
  const bgStyle = !admin && book?.bg
    ? { backgroundImage: `url("${encodeURI(book.bg)}")`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }
    : undefined

  return (
    <div className="min-h-screen bg-card" style={bgStyle}>
      <nav className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-hair bg-white px-5">
        <a href="#/" className="heading text-xl no-underline">Yearbook</a>
        {admin
          ? <a href="#/" className="btn btn-gray no-underline">Lihat buku</a>
          : <a href="#/admin" className="btn btn-red no-underline"><span className="icon !text-lg">edit</span>Admin</a>}
      </nav>
      <main className="py-8">
        {admin ? <Admin /> : book ? <Yearbook pages={book.pages} /> : <p className="text-center text-mute">Memuat buku…</p>}
      </main>
    </div>
  )
}
