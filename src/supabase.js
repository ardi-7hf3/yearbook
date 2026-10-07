import { createClient } from '@supabase/supabase-js'
import { DEFAULT_PAGES } from './defaultPages.js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY
export const supabase = url && key ? createClient(url, key) : null

// Ambil halaman yearbook; jika Supabase belum diset / tabel kosong, pakai contoh bawaan.
export async function loadPages() {
  if (!supabase) return DEFAULT_PAGES
  const { data, error } = await supabase.from('yearbook_pages').select('*').order('sort')
  if (error || !data?.length) return DEFAULT_PAGES
  return data
}
