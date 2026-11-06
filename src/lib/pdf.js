import { jsPDF } from 'jspdf'
import { fmtDate, fmtDay, invoiceNo, lineTotal, nairaPdf, slugify } from './format'

const INK = [20, 26, 60]
const SOFT = [88, 96, 129]
const RED = [201, 48, 29]
const BLUE = [29, 60, 180]
const RULE = [203, 210, 230]

// Builds the invoice (or receipt, once paid) as an A4 PDF.
// Returns { blob, filename } so it can be shared or saved.
export function buildInvoicePdf(inv) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const M = 48
  const R = W - M
  const paid = inv.status === 'paid'
  const items = inv.items || []
  const customer = inv.customer || {}
  const total = inv.total ?? items.reduce((s, i) => s + lineTotal(i), 0)

  const color = (c) => doc.setTextColor(c[0], c[1], c[2])
  const stroke = (c) => doc.setDrawColor(c[0], c[1], c[2])
  let y = M

  function ensure(height) {
    if (y + height > H - M) {
      doc.addPage()
      y = M
      return true
    }
    return false
  }

  // ----- Header -----
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  color(INK)
  const bizLines = doc.splitTextToSize(inv.businessName || 'Business', 280)
  doc.text(bizLines, M, y + 14)

  doc.setFontSize(20)
  color(BLUE)
  doc.text(paid ? 'RECEIPT' : 'INVOICE', R, y + 14, { align: 'right' })
  doc.setFontSize(12)
  color(RED)
  doc.text(`No. ${invoiceNo(inv.number)}`, R, y + 32, { align: 'right' })

  let left = y + 14 + (bizLines.length - 1) * 24 + 16
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  color(SOFT)
  ;[inv.businessPhone, inv.businessAddress].filter(Boolean).forEach((line) => {
    const wrapped = doc.splitTextToSize(String(line), 280)
    doc.text(wrapped, M, left)
    left += wrapped.length * 13
  })
  y = Math.max(left, y + 44) + 10
  stroke(INK)
  doc.setLineWidth(1.2)
  doc.line(M, y, R, y)
  y += 28

  // ----- Billed to and dates -----
  const blockTop = y
  doc.setFontSize(9)
  color(SOFT)
  doc.text('Billed to', M, y)
  y += 16
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  color(INK)
  doc.text(String(customer.name || ''), M, y)
  y += 15
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  color(SOFT)
  ;[customer.phone, customer.address].filter(Boolean).forEach((line) => {
    const wrapped = doc.splitTextToSize(String(line), 250)
    doc.text(wrapped, M, y)
    y += wrapped.length * 13
  })
  const leftEnd = y

  let ry = blockTop
  const meta = [['Issued', fmtDate(inv.createdAt || new Date())]]
  if (paid) meta.push(['Paid on', fmtDate(inv.paidAt || new Date())])
  else if (inv.dueDate) meta.push(['Due', fmtDay(inv.dueDate)])
  meta.forEach(([label, value]) => {
    doc.setFontSize(9)
    color(SOFT)
    doc.text(label, 360, ry)
    doc.setFontSize(10)
    color(INK)
    doc.text(String(value), R, ry, { align: 'right' })
    ry += 18
  })
  y = Math.max(leftEnd, ry) + 26

  // ----- Items table -----
  const COL = { qty: 350, price: 440, amount: R }
  function tableHead() {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    color(SOFT)
    doc.text('Item', M, y)
    doc.text('Qty', COL.qty, y, { align: 'right' })
    doc.text('Price', COL.price, y, { align: 'right' })
    doc.text('Amount', COL.amount, y, { align: 'right' })
    y += 8
    stroke(INK)
    doc.setLineWidth(0.8)
    doc.line(M, y, R, y)
    y += 6
  }
  tableHead()

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10.5)
  items.forEach((item) => {
    const lines = doc.splitTextToSize(String(item.description || ''), 250)
    const rowH = lines.length * 14 + 10
    if (ensure(rowH + 20)) tableHead()
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10.5)
    color(INK)
    const textY = y + 14
    doc.text(lines, M, textY)
    doc.text(String(item.qty), COL.qty, textY, { align: 'right' })
    doc.text(nairaPdf(item.price), COL.price, textY, { align: 'right' })
    doc.text(nairaPdf(lineTotal(item)), COL.amount, textY, { align: 'right' })
    y += rowH
    stroke(RULE)
    doc.setLineWidth(0.5)
    doc.line(M, y, R, y)
  })

  // ----- Total -----
  ensure(80)
  y += 28
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  color(SOFT)
  doc.text(paid ? 'Paid in full' : 'Total due', 360, y)
  doc.setFontSize(16)
  color(INK)
  doc.text(nairaPdf(total), R, y, { align: 'right' })
  y += 12
  stroke(INK)
  doc.setLineWidth(1.2)
  doc.line(360, y, R, y)
  y += 30

  // ----- Pay to (unpaid only) -----
  const bank = inv.bank || {}
  if (!paid && (bank.bankName || bank.accountNumber)) {
    ensure(80)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    color(SOFT)
    doc.text('Pay to', M, y)
    y += 15
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    color(INK)
    ;[bank.accountNumber, bank.accountName, bank.bankName].filter(Boolean).forEach((line) => {
      doc.text(String(line), M, y)
      y += 15
    })
    y += 8
  }

  // ----- Notes -----
  if (inv.notes) {
    const lines = doc.splitTextToSize(String(inv.notes), R - M)
    ensure(30 + lines.length * 13)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    color(SOFT)
    doc.text('Notes', M, y)
    y += 15
    doc.setFontSize(10)
    color(INK)
    doc.text(lines, M, y)
    y += lines.length * 13
  }

  // ----- Paid stamp -----
  if (paid) {
    doc.setPage(doc.getNumberOfPages())
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(34)
    color(RED)
    doc.text('PAID', R - 150, Math.max(y + 40, 300), { angle: 9 })
  }

  const who = slugify(customer.name) || 'customer'
  return {
    blob: doc.output('blob'),
    filename: `${paid ? 'receipt' : 'invoice'}-${invoiceNo(inv.number)}-${who}.pdf`,
  }
}
