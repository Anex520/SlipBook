import { buildInvoicePdf } from './pdf'
import { invoiceNo, naira, waLink } from './format'
import { isCancel, isNative, shareFileNative } from './native'

export async function downloadBlob(blob, filename) {
  // In the Android app there is no download bar, so saving goes through the share sheet
  // (pick "Drive", "Files" or WhatsApp there).
  if (isNative()) {
    try {
      await shareFileNative({ blob, filename, title: filename })
    } catch {
      // Closed without choosing, nothing to do.
    }
    return
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

function messageFor(inv) {
  const name = inv.customer?.name || 'there'
  const no = invoiceNo(inv.number)
  if (inv.status === 'paid') {
    return `Hello ${name}, thank you for your payment. Here is your receipt No. ${no} from ${inv.businessName}.`
  }
  const bank = inv.bank || {}
  const pay = [bank.accountNumber, bank.accountName, bank.bankName].filter(Boolean).join(', ')
  return (
    `Hello ${name}, here is your invoice No. ${no} from ${inv.businessName} for ${naira(inv.total)}.` +
    (pay ? ` Please pay to: ${pay}.` : '') +
    ' Send me the transfer screenshot when you have paid.'
  )
}

// Opens the phone's share sheet with the PDF attached, so it can go straight to WhatsApp.
// Where that isn't supported, the PDF is saved and a WhatsApp chat is opened with the message.
// Returns 'shared', 'cancelled', 'saved' or 'failed'.
export async function shareInvoice(inv) {
  const { blob, filename } = buildInvoicePdf(inv)
  const text = messageFor(inv)

  if (isNative()) {
    try {
      await shareFileNative({ blob, filename, text, title: filename })
      return 'shared'
    } catch (err) {
      return isCancel(err) ? 'cancelled' : 'failed'
    }
  }

  const file = new File([blob], filename, { type: 'application/pdf' })

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text, title: filename })
      return 'shared'
    } catch (err) {
      if (err && err.name === 'AbortError') return 'cancelled'
    }
  }

  downloadBlob(blob, filename)
  if (inv.customer?.phone) window.open(waLink(inv.customer.phone, text), '_blank')
  return 'saved'
}

export function savePdf(inv) {
  const { blob, filename } = buildInvoicePdf(inv)
  return downloadBlob(blob, filename)
}
