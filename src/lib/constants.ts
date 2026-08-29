// Konstanta aplikasi KuCuci — pusatkan branding agar gampang diubah
export const APP_NAME = 'KuCuci'
export const APP_TAGLINE = 'Cuci Bersih, Hidup Lebih Praktis'
export const APP_ICON = '🧺'

// Nomor WhatsApp admin (pakai format internasional tanpa +). Ganti di .env jika perlu.
// VITE_WA_NUMBER → contoh: '6281234567890'
export const SUPPORT_WA = (import.meta.env.VITE_WA_NUMBER as string | undefined) || '6281234567890'
export const waLink = (text: string, number?: string) => `https://wa.me/${number || SUPPORT_WA}?text=${encodeURIComponent(text)}`