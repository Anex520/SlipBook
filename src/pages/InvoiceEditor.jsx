import { useState } from 'react'
import { useApp } from '../lib/store'
import { Link, go } from '../lib/route'
import Slip from '../components/Slip'
import { addDays, isoDate, newId, sumItems } from '../lib/format'

function blankRow() {
  return { id: newId(), description: '', qty: '1', price: '' }
}

function Form({ existing }) {
  const { profile, items: priceList, invoices, saveInvoice } = useApp()
  const [name, setName] = useState(existing?.customer?.name || '')
  const [phone, setPhone] = useState(existing?.customer?.phone || '')
  const [address, setAddress] = useState(existing?.customer?.address || '')
  const [rows, setRows] = useState(
    existing
      ? existing.items.map((i) => ({ id: newId(), description: i.description, qty: String(i.qty), price: String(i.price) }))
      : [blankRow()],
  )
  const [dueDate, setDueDate] = useState(existing ? existing.dueDate : isoDate(addDays(new Date(), 7)))
  const [notes, setNotes] = useState(existing?.notes || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Past customers, so a returning customer's phone and address fill in.
  const known = {}
  invoices.forEach((i) => {
    const key = (i.customer?.name || '').trim().toLowerCase()
    if (key && !known[key]) known[key] = i.customer
  })

  function handleName(value) {
    setName(value)
    const match = known[value.trim().toLowerCase()]
    if (match) {
      if (!phone) setPhone(match.phone || '')
      if (!address) setAddress(match.address || '')
    }
  }

  const parsed = rows.map((r) => ({
    id: r.id,
    description: r.description.trim(),
    qty: Number(r.qty) || 0,
    price: Number(r.price) || 0,
  }))
  const total = sumItems(parsed)

  function patchRow(id, patch) {
    setRows((list) => list.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  function addFromList(item) {
    setRows((list) => {
      const row = { id: newId(), description: item.name, qty: '1', price: String(item.price) }
      const first = list[0]
      if (list.length === 1 && !first.description && !first.price) return [row]
      return [...list, row]
    })
  }

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    const real = parsed.filter((r) => r.description && r.qty > 0)
    if (!name.trim()) return setError("Add the customer's name.")
    if (real.length === 0) return setError('Add at least one item with a quantity.')
    if (total <= 0) return setError('The total must be more than ₦0.')
    setBusy(true)
    try {
      const id = await saveInvoice({
        id: existing?.id,
        customer: { name: name.trim(), phone: phone.trim(), address: address.trim() },
        items: real.map(({ id: rid, description, qty, price }) => ({ id: rid, description, qty, price })),
        notes: notes.trim(),
        dueDate,
      })
      go(`/invoice/${id}`, { replace: true })
    } catch {
      setError("The invoice couldn't be saved. Try again.")
      setBusy(false)
    }
  }

  const draft = {
    number: existing?.number || profile.nextInvoiceNumber || 1,
    status: 'unpaid',
    businessName: profile.businessName,
    businessPhone: profile.phone,
    businessAddress: profile.address,
    bank: { bankName: profile.bankName, accountName: profile.accountName, accountNumber: profile.accountNumber },
    customer: { name, phone, address },
    items: parsed.filter((r) => r.description || r.price),
    notes,
    dueDate,
    total,
    createdAt: existing?.createdAt || Date.now(),
  }

  return (
    <>
      <p>
        <Link to={existing ? `/invoice/${existing.id}` : '/'} className="link">
          Cancel
        </Link>
      </p>
      <h1>{existing ? 'Edit invoice' : 'New invoice'}</h1>

      <form onSubmit={handleSave} className="editor">
        <fieldset className="group">
          <legend>Customer</legend>
          <label className="field">
            <span>Name</span>
            <input list="known-customers" value={name} onChange={(e) => handleName(e.target.value)} required autoComplete="off" />
            <datalist id="known-customers">
              {Object.values(known).map((c) => (
                <option key={c.name} value={c.name} />
              ))}
            </datalist>
          </label>
          <label className="field">
            <span>
              Phone number <em>(for WhatsApp)</em>
            </span>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label className="field">
            <span>
              Address <em>(optional)</em>
            </span>
            <input value={address} onChange={(e) => setAddress(e.target.value)} />
          </label>
        </fieldset>

        <fieldset className="group">
          <legend>What they want</legend>
          {priceList.length > 0 && (
            <div className="chips" aria-label="Add from your price list">
              {priceList.map((p) => (
                <button type="button" key={p.id} className="chip" onClick={() => addFromList(p)}>
                  {p.name}
                </button>
              ))}
            </div>
          )}
          {rows.map((r, idx) => (
            <div className="item-row" key={r.id}>
              <label className="field item-desc">
                <span>{idx === 0 ? 'Item' : `Item ${idx + 1}`}</span>
                <input value={r.description} onChange={(e) => patchRow(r.id, { description: e.target.value })} />
              </label>
              <label className="field item-qty">
                <span>Qty</span>
                <input type="number" min="0" inputMode="decimal" value={r.qty} onChange={(e) => patchRow(r.id, { qty: e.target.value })} />
              </label>
              <label className="field item-price">
                <span>Price (₦)</span>
                <input type="number" min="0" inputMode="decimal" value={r.price} onChange={(e) => patchRow(r.id, { price: e.target.value })} />
              </label>
              {rows.length > 1 && (
                <button type="button" className="link danger item-remove" onClick={() => setRows((l) => l.filter((x) => x.id !== r.id))}>
                  Remove
                </button>
              )}
            </div>
          ))}
          <button type="button" className="btn btn-quiet btn-small" onClick={() => setRows((l) => [...l, blankRow()])}>
            Add another item
          </button>
        </fieldset>

        <fieldset className="group">
          <legend>Details</legend>
          <label className="field">
            <span>
              Pay by <em>(optional)</em>
            </span>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </label>
          <label className="field">
            <span>
              Note to customer <em>(optional)</em>
            </span>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </fieldset>

        <div className="preview-block">
          <p className="muted small">How it will look</p>
          <Slip invoice={draft} />
        </div>

        {error && (
          <p className="notice notice-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Saving' : existing ? 'Save changes' : 'Create invoice'}
        </button>
      </form>
    </>
  )
}

export default function InvoiceEditor({ id }) {
  const { invoices } = useApp()
  if (!id) return <Form key="new" />
  const existing = invoices.find((i) => i.id === id)
  if (!existing) {
    return (
      <>
        <h1>Invoice not found</h1>
        <Link to="/" className="btn btn-quiet">
          Back to sales
        </Link>
      </>
    )
  }
  if (existing.status === 'paid') {
    return (
      <>
        <h1>This invoice is paid</h1>
        <p className="lead">To change it, open it and undo the payment first.</p>
        <Link to={`/invoice/${id}`} className="btn btn-quiet">
          Back to invoice
        </Link>
      </>
    )
  }
  return <Form key={id} existing={existing} />
}
