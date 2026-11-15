import { useRef, useState } from 'react'
import { BACKUP_REMINDER_DAYS } from '../config'
import { useApp } from '../lib/store'
import { Link, go } from '../lib/route'
import { exportBackup } from '../lib/backup'
import PoweredBy from '../components/PoweredBy'
import { invoiceNo, isoDate, monthKey, monthLabel, naira, plural, toDate } from '../lib/format'

const FILTERS = [
  ['all', 'All'],
  ['unpaid', 'Unpaid'],
  ['paid', 'Paid'],
]

function initials(name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return 'S'
  const letters = words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0]
  return letters.toUpperCase()
}

// "14 Nov", with the year only when it is not this year.
function shortDate(v) {
  const d = toDate(v)
  if (!d) return ''
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return d.toLocaleDateString('en-NG', sameYear ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: '2-digit' })
}

const sumOf = (list) => list.reduce((s, i) => s + (Number(i.total) || 0), 0)

export default function Home() {
  const { profile, invoices, markBackedUp } = useApp()
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [backupBusy, setBackupBusy] = useState(false)
  const recordsRef = useRef(null)

  const today = isoDate()
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const unpaid = invoices.filter((i) => i.status !== 'paid')
  const paid = invoices.filter((i) => i.status === 'paid')
  const owed = sumOf(unpaid)
  const invoicedAll = sumOf(invoices)
  const collectedAll = sumOf(paid)
  const collectedMonth = sumOf(paid.filter((i) => (toDate(i.paidAt) || 0) >= monthStart))

  const q = query.trim().toLowerCase()
  const list = invoices
    .filter((i) => filter === 'all' || i.status === filter)
    .filter(
      (i) =>
        !q ||
        (i.customer?.name || '').toLowerCase().includes(q) ||
        invoiceNo(i.number).includes(q.replace(/^no\.?\s*/, '')),
    )
  const listPaid = sumOf(list.filter((i) => i.status === 'paid'))
  const listUnpaid = sumOf(list.filter((i) => i.status !== 'paid'))

  // Unpaid invoices grouped by customer: who owes you, how much, and since when.
  const owing = {}
  unpaid.forEach((i) => {
    const name = (i.customer?.name || 'No name').trim()
    const key = name.toLowerCase()
    const g = (owing[key] = owing[key] || { name, count: 0, sum: 0, oldest: null, late: false })
    g.count += 1
    g.sum += Number(i.total) || 0
    const made = toDate(i.createdAt)
    if (made && (!g.oldest || made < g.oldest)) g.oldest = made
    if (i.dueDate && i.dueDate < today) g.late = true
  })
  const owingList = Object.values(owing).sort((a, b) => b.sum - a.sum)

  const months = {}
  paid.forEach((i) => {
    const k = monthKey(i.paidAt)
    if (!k) return
    months[k] = months[k] || { sum: 0, count: 0 }
    months[k].sum += Number(i.total) || 0
    months[k].count += 1
  })
  const monthRows = Object.keys(months).sort().reverse()
  const monthMax = Math.max(1, ...monthRows.map((k) => months[k].sum))

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

  function showPerson(name) {
    setQuery(name)
    setFilter('unpaid')
    recordsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      <header className="homehead">
        <span className="avatar" aria-hidden="true">
          {initials(profile.businessName)}
        </span>
        <div className="homehead-text">
          <p className="muted small">Sales record</p>
          <h1>{profile.businessName}</h1>
        </div>
      </header>

      <section className="hero" aria-label="Total money made">
        <p className="hero-label">Total money made</p>
        <p className="hero-figure">{naira(collectedAll)}</p>
        <div className="hero-foot">
          <div>
            <p className="hero-sub">This month</p>
            <p className="hero-val">{naira(collectedMonth)}</p>
          </div>
          <div>
            <p className="hero-sub">Paid sales</p>
            <p className="hero-val">{paid.length}</p>
          </div>
        </div>
      </section>

      <section className="pair" aria-label="Summary">
        <div className="stat">
          <p className="stat-label">Owed to you</p>
          <p className="stat-figure">{naira(owed)}</p>
          <p className="stat-note">{unpaid.length === 0 ? 'Nothing unpaid' : plural(unpaid.length, 'unpaid invoice')}</p>
        </div>
        <div className="stat">
          <p className="stat-label">Total invoiced</p>
          <p className="stat-figure">{naira(invoicedAll)}</p>
          <p className="stat-note">{plural(invoices.length, 'invoice')}</p>
        </div>
      </section>

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
          {owingList.length > 0 && (
            <section className="block" aria-label="Who owes you">
              <div className="block-head">
                <h2>Who owes you</h2>
                <p className="muted small">{(owingList.length === 1 ? "1 person" : owingList.length + " people")}</p>
              </div>
              <ul className="people">
                {owingList.map((g) => (
                  <li key={g.name}>
                    <button type="button" className="person" onClick={() => showPerson(g.name)}>
                      <span className="avatar avatar-sm" aria-hidden="true">
                        {initials(g.name)}
                      </span>
                      <span className="person-main">
                        <span className="person-name">{g.name}</span>
                        <span className={g.late ? 'person-sub late' : 'person-sub'}>
                          {plural(g.count, 'invoice')}
                          {g.late ? ' · Overdue' : g.oldest ? ` · since ${shortDate(g.oldest)}` : ''}
                        </span>
                      </span>
                      <span className="person-amount">{naira(g.sum)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="block" aria-label="Records" ref={recordsRef}>
            <div className="block-head">
              <h2>Records</h2>
              <p className="muted small">{plural(list.length, 'invoice')}</p>
            </div>
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
              <div className="sheet">
                <table className="sheet-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Customer</th>
                      <th className="num">Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((inv) => {
                      const isPaid = inv.status === 'paid'
                      const late = !isPaid && inv.dueDate && inv.dueDate < today
                      return (
                        <tr key={inv.id} className="sheet-row" onClick={() => go(`/invoice/${inv.id}`)}>
                          <td className="sheet-date">{shortDate(inv.createdAt)}</td>
                          <td>
                            <Link to={`/invoice/${inv.id}`} className="sheet-name" onClick={(e) => e.stopPropagation()}>
                              {inv.customer?.name}
                            </Link>
                            <span className="sheet-no">No. {invoiceNo(inv.number)}</span>
                          </td>
                          <td className="num sheet-amount">{naira(inv.total)}</td>
                          <td>
                            <span className={`tag tag-${isPaid ? 'paid' : late ? 'late' : 'unpaid'}`}>
                              {isPaid ? 'Paid' : late ? 'Overdue' : 'Unpaid'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th colSpan={2} scope="row">
                        Total
                      </th>
                      <td className="num">{naira(listPaid + listUnpaid)}</td>
                      <td className="sheet-count">{plural(list.length, 'invoice')}</td>
                    </tr>
                    <tr>
                      <th colSpan={2} scope="row">
                        Paid
                      </th>
                      <td className="num">{naira(listPaid)}</td>
                      <td />
                    </tr>
                    <tr>
                      <th colSpan={2} scope="row">
                        Not yet paid
                      </th>
                      <td className="num">{naira(listUnpaid)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>

          {monthRows.length > 0 && (
            <section className="block" aria-label="Money collected by month">
              <div className="block-head">
                <h2>Money collected by month</h2>
              </div>
              <ul className="monthlist">
                {monthRows.map((k) => (
                  <li key={k}>
                    <div className="month-line">
                      <span className="month-name">{monthLabel(k)}</span>
                      <span className="month-sales">{plural(months[k].count, 'sale')}</span>
                      <span className="month-sum">{naira(months[k].sum)}</span>
                    </div>
                    <div className="month-bar" aria-hidden="true">
                      <span style={{ width: `${Math.max(4, Math.round((months[k].sum / monthMax) * 100))}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <PoweredBy />
    </>
  )
}
