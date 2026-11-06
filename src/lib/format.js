export function naira(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return '₦0'
  return '₦' + v.toLocaleString('en-NG', { maximumFractionDigits: 2 })
}

// jsPDF's built-in fonts can't draw the ₦ sign, so PDFs use "NGN".
export function nairaPdf(n) {
  const v = Number(n) || 0
  return (
    'NGN ' +
    v.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  )
}

export function invoiceNo(n) {
  return String(n || 0).padStart(4, '0')
}

export function lineTotal(item) {
  return (Number(item.qty) || 0) * (Number(item.price) || 0)
}

export function sumItems(items) {
  return (items || []).reduce((sum, item) => sum + lineTotal(item), 0)
}

export function toDate(v) {
  if (!v) return null
  if (v instanceof Date) return v
  if (typeof v.toDate === 'function') return v.toDate()
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

export function fmtDate(v) {
  const d = toDate(v)
  return d
    ? d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
    : ''
}

// Dates typed into inputs are stored as "YYYY-MM-DD" strings.
export function fmtDay(str) {
  if (!str) return ''
  const d = new Date(str + 'T00:00:00')
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function isoDate(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

export function newest(a, b) {
  const at = (toDate(a.createdAt) || new Date()).getTime()
  const bt = (toDate(b.createdAt) || new Date()).getTime()
  return bt - at
}

export function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

export function newId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function monthKey(v) {
  const d = toDate(v)
  if (!d) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function monthLabel(key) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })
}

export function slugify(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

// Nigerian numbers: 0803... becomes 234803...
export function waNumber(phone) {
  const digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('234')) return digits
  if (digits.startsWith('0')) return '234' + digits.slice(1)
  if (digits.length === 10) return '234' + digits
  return digits
}

export function waLink(phone, text) {
  const n = waNumber(phone)
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
