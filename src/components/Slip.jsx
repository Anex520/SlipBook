import { fmtDate, fmtDay, invoiceNo, lineTotal, naira } from '../lib/format'

// The invoice, drawn as a ruled receipt-book slip. It becomes a receipt once paid.
export default function Slip({ invoice, animateStamp = false }) {
  const inv = invoice
  const paid = inv.status === 'paid'
  const items = inv.items || []
  const customer = inv.customer || {}
  const bank = inv.bank || {}
  const total = inv.total ?? items.reduce((sum, i) => sum + lineTotal(i), 0)
  const hasBank = Boolean(bank.bankName || bank.accountNumber || bank.accountName)

  return (
    <article className={paid ? 'slip slip-paid' : 'slip'} aria-label={paid ? 'Receipt' : 'Invoice'}>
      <header className="slip-head">
        <div>
          <h2 className="slip-biz">{inv.businessName || 'Your business'}</h2>
          {inv.businessPhone && <p className="slip-line">{inv.businessPhone}</p>}
          {inv.businessAddress && <p className="slip-line">{inv.businessAddress}</p>}
        </div>
        <div className="slip-id">
          <p className="slip-kind">{paid ? 'Receipt' : 'Invoice'}</p>
          <p className="slip-serial">No. {invoiceNo(inv.number)}</p>
        </div>
      </header>

      <div className="slip-meta">
        <div>
          <p className="slip-label">Billed to</p>
          <p className="slip-strong">{customer.name || 'Customer name'}</p>
          {customer.phone && <p className="slip-line">{customer.phone}</p>}
          {customer.address && <p className="slip-line">{customer.address}</p>}
        </div>
        <div className="slip-dates">
          <p className="slip-label">Issued</p>
          <p className="slip-strong">{fmtDate(inv.createdAt || new Date())}</p>
          {paid ? (
            <>
              <p className="slip-label">Paid on</p>
              <p className="slip-strong">{fmtDate(inv.paidAt || new Date())}</p>
            </>
          ) : (
            inv.dueDate && (
              <>
                <p className="slip-label">Due</p>
                <p className="slip-strong">{fmtDay(inv.dueDate)}</p>
              </>
            )
          )}
        </div>
      </div>

      <div className="slip-scroll">
        <table className="slip-table">
          <thead>
            <tr>
              <th>Item</th>
              <th className="num">Qty</th>
              <th className="num">Price</th>
              <th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="slip-empty">
                  Items you add will show here.
                </td>
              </tr>
            )}
            {items.map((item, i) => (
              <tr key={item.id || i}>
                <td>{item.description || 'Item'}</td>
                <td className="num">{item.qty}</td>
                <td className="num">{naira(item.price)}</td>
                <td className="num">{naira(lineTotal(item))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="slip-total">
        <span>{paid ? 'Paid in full' : 'Total due'}</span>
        <strong>{naira(total)}</strong>
      </div>

      {!paid && hasBank && (
        <div className="slip-pay">
          <p className="slip-label">Pay to</p>
          {bank.accountNumber && <p className="slip-strong slip-acct">{bank.accountNumber}</p>}
          {bank.accountName && <p className="slip-line">{bank.accountName}</p>}
          {bank.bankName && <p className="slip-line">{bank.bankName}</p>}
        </div>
      )}

      {inv.notes && (
        <div className="slip-notes">
          <p className="slip-label">Notes</p>
          <p className="slip-line">{inv.notes}</p>
        </div>
      )}

      {paid && (
        <div className={animateStamp ? 'stamp stamp-in' : 'stamp'} aria-hidden="true">
          <span>Paid</span>
          <small>{fmtDate(inv.paidAt || new Date())}</small>
        </div>
      )}
    </article>
  )
}
