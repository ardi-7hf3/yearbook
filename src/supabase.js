import { createClient } from '@supabase/supabase-js'
import { DEFAULT_PAGES } from './defaultPages.js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY
export const supabase = url && key ? createClient(url, key) : null

// Pengaturan buku (background website) disimpan sebagai satu baris khusus di tabel yang sama.
export const SETTINGS_ID = '00000000-0000-0000-0000-000000000001'

// Ambil { pages, bg }. Jika Supabase belum diset / tabel kosong, pakai halaman contoh bawaan.
export async function loadBook() {
  if (!supabase) return { pages: DEFAULT_PAGES, bg: '' }
  const { data, error } = await supabase.from('yearbook_pages').select('*').order('sort')
  if (error || !data) return { pages: DEFAULT_PAGES, bg: '' }
  const bg = data.find((r) => r.kind === 'settings')?.image_url || ''
  const pages = data.filter((r) => r.kind !== 'settings')
  return { pages: pages.length ? pages : DEFAULT_PAGES, bg }
}
