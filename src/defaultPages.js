const img = (s, w = 800, h = 1000) => `https://picsum.photos/seed/${s}/${w}/${h}`

export const DEFAULT_PAGES = [
  { id: 'd1', kind: 'cover', title: 'Kelas XII IPA 2', body: 'Yearbook 2025/2026', image_url: '' },
  { id: 'd2', kind: 'text', title: 'Selamat datang', body: 'Tiga tahun berlalu begitu cepat. Buku ini menyimpan wajah, tawa, dan cerita kita. Geser halaman untuk mulai membaca.', image_url: '' },
  { id: 'd3', kind: 'photo', title: 'Study tour Yogyakarta', body: '', image_url: img('trip') },
  { id: 'd4', kind: 'quote', title: 'Kita mulai dari bangku yang sama.', body: 'Wali kelas', image_url: '' },
  { id: 'd5', kind: 'photo', title: 'Hari terakhir ujian', body: '', image_url: img('exam') },
  { id: 'd6', kind: 'text', title: 'Pesan untuk adik kelas', body: 'Nikmati prosesnya. Nilai akan lewat, teman akan tinggal.', image_url: '' },
  { id: 'd7', kind: 'cover', title: 'Sampai jumpa', body: 'Terima kasih sudah jadi bagian ceritanya.', image_url: '' },
]
