import { useEffect, useRef, useState } from 'react'
import { useApp } from '../lib/store'
import { Link, go } from '../lib/route'
import Slip from '../components/Slip'
import { compressImage } from '../lib/image'
import { savePdf, shareInvoice } from '../lib/share'
import { invoiceNo } from '../lib/format'

export default function InvoiceDetail({ id }) {
  const { invoices, setPaid, removeInvoice, saveProof, getProof } = useApp()
  const inv = invoices.find((i) => i.id === id)
  const [proofUrl, setProofUrl] = useState(null)
  const [stamping, setStamping] = useState(false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const fileRef = useRef(null)
  const hasProof = Boolean(inv?.hasProof)

  useEffect(() => {
    let off = false
    if (hasProof) getProof(id).then((u) => !off && setProofUrl(u))
    else setProofUrl(null)
    return () => {
      off = true
    }
  }, [id, hasProof, getProof])

  useEffect(() => {
    if (!stamping) return undefined
    const t = setTimeout(() => setStamping(false), 1500)
    return () => clearTimeout(t)
  }, [stamping])

  if (!inv) {
    return (
      <>
        <h1>Invoice not found</h1>
        <p className="lead">It may have been deleted.</p>
        <Link to="/" className="btn btn-quiet">
          Back to sales
        </Link>
      </>
    )
  }

  const paid = inv.status === 'paid'

  async function handleShare() {
    setNote('')
    setError('')
    const result = await shareInvoice(inv)
    if (result === 'failed') {
      setError("The share sheet couldn't open. Try \"Save as PDF\" instead.")
    } else if (result === 'saved') {
      setNote('The PDF is saved on your phone. Attach it in WhatsApp (a chat has been opened if the customer has a phone number).')
    }
  }

  async function handlePaid(value) {
    setBusy(true)
    setError('')
    try {
      await setPaid(inv, value)
      if (value) setStamping(true)
    } catch {
      setError("That didn't save. Try again.")
    } finally {
      setBusy(false)
    }
  }

  async function handlePick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    try {
      await saveProof(inv, await compressImage(file))
    } catch {
      setError("That picture couldn't be read. Try a screenshot saved as a JPG or PNG.")
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete invoice No. ${invoiceNo(inv.number)}? This can't be undone.`)) return
    await removeInvoice(inv.id)
    go('/', { replace: true })
  }

  return (
    <>
      <p>
        <Link to="/" className="link">
          Back
        </Link>
      </p>

      <Slip invoice={inv} animateStamp={stamping} />

      <div className="actions-stack">
        {!paid ? (
          <>
            <button type="button" className="btn btn-primary btn-block" onClick={handleShare}>
              Send invoice
            </button>
            <button type="button" className="btn btn-quiet btn-block" disabled={busy} onClick={() => handlePaid(true)}>
              Confirm payment received
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn btn-primary btn-block" onClick={handleShare}>
              Send receipt
            </button>
            <p className="muted small center">Payment confirmed. The invoice is now a receipt.</p>
          </>
        )}
        <button type="button" className="btn btn-quiet btn-block" onClick={() => savePdf(inv)}>
          Save {paid ? 'receipt' : 'invoice'} as PDF
        </button>
      </div>

      {note && (
        <p className="notice" role="status">
          {note}
        </p>
      )}
      {error && (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}

      <section className="block">
        <h2>Payment proof</h2>
        <p className="muted small">
          Optional. Keep the customer's transfer screenshot with this invoice. It is stored on this phone only.
        </p>
        {proofUrl ? (
          <>
            <img className="proof" src={proofUrl} alt="Customer's payment screenshot" />
            <div className="actions">
              <button type="button" className="btn btn-quiet btn-small" onClick={() => fileRef.current?.click()}>
                Replace
              </button>
              <button type="button" className="link danger" onClick={() => saveProof(inv, null)}>
                Remove
              </button>
            </div>
          </>
        ) : (
          <button type="button" className="btn btn-quiet btn-small" onClick={() => fileRef.current?.click()}>
            Add screenshot
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={handlePick} />
      </section>

      <div className="actions">
        {!paid && (
          <Link to={`/edit/${inv.id}`} className="btn btn-quiet btn-small">
            Edit invoice
          </Link>
        )}
        {paid && (
          <button type="button" className="link" disabled={busy} onClick={() => handlePaid(false)}>
            Undo payment
          </button>
        )}
        <button type="button" className="link danger" onClick={handleDelete}>
          Delete invoice
        </button>
      </div>
    </>
  )
}
