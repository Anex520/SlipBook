import { useState } from 'react'
import { BACKUP_REMINDER_DAYS } from '../config'
import { useApp } from '../lib/store'
import { Link } from '../lib/route'
import { exportBackup } from '../lib/backup'
import { fmtDate, fmtDay, invoiceNo, isoDate, monthKey, monthLabel, naira, plural, toDate } from '../lib/format'

const FILTERS = [
  ['all', 'All'],
  ['unpaid', 'Unpaid'],
  ['paid', 'Paid'],
]

export default function Home() {
  const { profile, invoices, markBackedUp } = useApp()
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [backupBusy, setBackupBusy] = useState(false)

  const today = isoDate()
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const unpaid = invoices.filter((i) => i.status !== 'paid')
  const paid = invoices.filter((i) => i.status === 'paid')
  const owed = unpaid.reduce((s, i) => s + (Number(i.total) || 0), 0)
  const collectedMonth = paid
    .filter((i) => (toDate(i.paidAt) || 0) >= monthStart)
    .reduce((s, i) => s + (Number(i.total) || 0), 0)
  const collectedAll = paid.reduce((s, i) => s + (Number(i.total) || 0), 0)

  const q = query.trim().toLowerCase()
  const list = invoices
    .filter((i) => filter === 'all' || i.status === filter)
    .filter(
      (i) =>
        !q ||
        (i.customer?.name || '').toLowerCase().includes(q) ||
        invoiceNo(i.number).includes(q.replace(/^no\.?\s*/, '')),
    )

  const months = {}
  paid.forEach((i) => {
    const k = monthKey(i.paidAt)
    if (!k) return
    months[k] = months[k] || { sum: 0, count: 0 }
    months[k].sum += Number(i.total) || 0
    months[k].count += 1
  })
  const monthRows = Object.keys(months).sort().reverse()

  const daysSince = profile.lastBackupAt ? (Date.now() - profile.lastBackupAt) / 86400000 : Infinity
  const needBackup = invoices.length > 0 && daysSince > BACKUP_REMINDER_DAYS

  async function backupNow() {
    setBackupBusy(true)
    try {
      const result = await exportBackup()
      if (result !== 'cancelled') await markBackedUp()
    } finally {
      setBackupBusy(false)
    }
  }

  return (
    <>
      <header className="pagehead">
        <p className="muted small">Sales record</p>
        <h1>{profile.businessName}</h1>
      </header>

      {needBackup && (
        <div className="banner" role="status">
          <p>
            <strong>Back up your records.</strong>{' '}
            {profile.lastBackupAt
              ? `Your last backup was ${Math.floor(daysSince)} days ago.`
              : "They're only on this phone, so a lost phone means lost records."}
          </p>
          <button type="button" className="btn btn-primary btn-small" disabled={backupBusy} onClick={backupNow}>
            Back up now
          </button>
        </div>
      )}

      <section className="band" aria-label="Summary">
        <div className="band-cell">
          <p className="band-label">Owed to you</p>
          <p className="band-figure">{naira(owed)}</p>
          <p className="band-note">{unpaid.length === 0 ? 'Nothing unpaid' : plural(unpaid.length, 'unpaid invoice')}</p>
        </div>
        <div className="band-cell">
          <p className="band-label">Collected this month</p>
          <p className="band-figure">{naira(collectedMonth)}</p>
          <p className="band-note">{naira(collectedAll)} all time</p>
        </div>
      </section>

      {invoices.length === 0 ? (
        <div className="empty-state">
          <p className="lead">No invoices yet.</p>
          <p className="muted">
            When a customer tells you what they want, tap <strong>New invoice</strong>, type it in and send it on
            WhatsApp.
          </p>
          <Link to="/new" className="btn btn-primary">
            Make your first invoice
          </Link>
        </div>
      ) : (
        <>
          <div className="searchbar">
            <input
              type="search"
              placeholder="Search by customer or number"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search invoices"
            />
          </div>
          <div className="filters" role="group" aria-label="Filter invoices">
            {FILTERS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                className="filter"
                aria-pressed={filter === key}
                onClick={() => setFilter(key)}
              >
                {label}{' '}
                <span className="filter-count">
                  {key === 'all' ? invoices.length : key === 'paid' ? paid.length : unpaid.length}
                </span>
              </button>
            ))}
          </div>

          {list.length === 0 ? (
            <p className="empty">Nothing matches.</p>
          ) : (
            <ul className="rows">
              {list.map((inv) => {
                const isPaid = inv.status === 'paid'
                const late = !isPaid && inv.dueDate && inv.dueDate < today
                return (
                  <li key={inv.id}>
                    <Link to={`/invoice/${inv.id}`} className="row row-link">
                      <p className="serial">No. {invoiceNo(inv.number)}</p>
                      <div className="row-main">
                        <p className="row-title">{inv.customer?.name}</p>
                        <p className={late ? 'row-sub late' : 'row-sub'}>
                          {isPaid
                            ? `Paid ${fmtDate(inv.paidAt)}`
                            : late
                              ? `Overdue since ${fmtDay(inv.dueDate)}`
                              : `Made ${fmtDate(inv.createdAt)}`}
                        </p>
                      </div>
                      <p className="row-amount">{naira(inv.total)}</p>
                      <span className={`tag tag-${isPaid ? 'paid' : late ? 'late' : 'unpaid'}`}>
                        {isPaid ? 'Paid' : late ? 'Overdue' : 'Unpaid'}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}

          {monthRows.length > 0 && (
            <details className="months">
              <summary>Money collected by month</summary>
              <table className="mini">
                <tbody>
                  {monthRows.map((k) => (
                    <tr key={k}>
                      <td>{monthLabel(k)}</td>
                      <td className="num">{plural(months[k].count, 'sale')}</td>
                      <td className="num">{naira(months[k].sum)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          )}
        </>
      )}
    </>
  )
}
