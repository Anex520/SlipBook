import { exportAll } from './db'
import { downloadBlob } from './share'
import { isCancel, isNative, shareFileNative } from './native'
import { invoiceNo, isoDate, toDate } from './format'

const APP_TAG = 'slipbook'

// Saves everything on the phone into one file the owner can keep in Google Drive,
// WhatsApp or Files. Returns 'shared', 'cancelled' or 'saved'.
export async function exportBackup() {
  const data = await exportAll()
  const json = JSON.stringify({ app: APP_TAG, version: 1, exportedAt: Date.now(), ...data })
  const filename = `slipbook-backup-${isoDate()}.json`
  const blob = new Blob([json], { type: 'application/json' })
  const file = new File([blob], filename, { type: 'application/json' })

  if (isNative()) {
    try {
      await shareFileNative({ blob, filename, title: filename })
      return 'shared'
    } catch (err) {
      if (isCancel(err)) return 'cancelled'
      throw err
    }
  }

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename })
      return 'shared'
    } catch (err) {
      if (err && err.name === 'AbortError') return 'cancelled'
    }
  }
  downloadBlob(blob, filename)
  return 'saved'
}

// Reads a backup file and checks it looks right. Returns the data to restore.
export async function readBackup(file) {
  let parsed
  try {
    parsed = JSON.parse(await file.text())
  } catch {
    throw new Error("That file isn't a Slipbook backup.")
  }
  if (!parsed || parsed.app !== APP_TAG || !Array.isArray(parsed.invoices) || !Array.isArray(parsed.kv)) {
    throw new Error("That file isn't a Slipbook backup.")
  }
  return {
    kv: parsed.kv,
    items: Array.isArray(parsed.items) ? parsed.items : [],
    invoices: parsed.invoices,
    proofs: Array.isArray(parsed.proofs) ? parsed.proofs : [],
  }
}

const csvCell = (v) => {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export async function exportCsv(invoices) {
  const rows = [['Invoice no', 'Date', 'Customer', 'Phone', 'Items', 'Total (NGN)', 'Status', 'Paid on']]
  invoices
    .slice()
    .sort((a, b) => a.number - b.number)
    .forEach((inv) => {
      const d = toDate(inv.createdAt)
      const paidOn = toDate(inv.paidAt)
      rows.push([
        invoiceNo(inv.number),
        d ? isoDate(d) : '',
        inv.customer?.name,
        inv.customer?.phone,
        (inv.items || []).map((i) => `${i.qty} x ${i.description}`).join('; '),
        inv.total,
        inv.status === 'paid' ? 'Paid' : 'Unpaid',
        paidOn ? isoDate(paidOn) : '',
      ])
    })
  const csv = rows.map((r) => r.map(csvCell).join(',')).join('\n')
  await downloadBlob(new Blob([csv], { type: 'text/csv' }), `slipbook-sales-${isoDate()}.csv`)
}

