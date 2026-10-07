const img = (s, w = 800, h = 1000) => `https://picsum.photos/seed/${s}/${w}/${h}`
const siswa = (n, quote) => ({ id: `d-s${n}`, kind: 'student', title: `Nama Siswa ${n}`, body: quote, image_url: img(`siswa${n}`) })

// Urutan: cover, lalu halaman siswa berpasangan (kiri + kanan), lalu cover belakang.
export const DEFAULT_PAGES = [
  { id: 'd1', kind: 'cover', title: 'Kelas XII IPA 1', body: 'Yearbook 2026/2027', image_url: '' },
  siswa(1, 'Cara terbaik untuk memprediksi masa depan adalah dengan menciptakannya.'),
  siswa(2, 'Tulis kata-kata siswa di sini.'),
  siswa(3, 'Tulis kata-kata siswa di sini.'),
  siswa(4, 'Tulis kata-kata siswa di sini.'),
  siswa(5, 'Tulis kata-kata siswa di sini.'),
  siswa(6, 'Tulis kata-kata siswa di sini.'),
  { id: 'd9', kind: 'cover', title: 'Sampai jumpa', body: 'Terima kasih sudah jadi bagian ceritanya.', image_url: '' },
]
