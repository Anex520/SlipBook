import { useRef, useState } from 'react'
import { APP_NAME } from '../config'
import { useApp } from '../lib/store'
import { exportBackup, exportCsv, readBackup } from '../lib/backup'
import { go } from '../lib/route'
import { fmtDate } from '../lib/format'

export default function Settings() {
  const { profile, invoices, saveProfile, markBackedUp, restore, eraseAll } = useApp()
  const [values, setValues] = useState({
    businessName: profile.businessName || '',
    phone: profile.phone || '',
    address: profile.address || '',
    bankName: profile.bankName || '',
    accountName: profile.accountName || '',
    accountNumber: profile.accountNumber || '',
    nextInvoiceNumber: String(profile.nextInvoiceNumber || 1),
  })
  const [status, setStatus] = useState('')
  const [backupNote, setBackupNote] = useState('')
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  const set = (key) => (e) => {
    setValues((v) => ({ ...v, [key]: e.target.value }))
    setStatus('')
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!values.businessName.trim()) return setStatus('Your business needs a name.')
    await saveProfile({
      businessName: values.businessName.trim(),
      phone: values.phone.trim(),
      address: values.address.trim(),
      bankName: values.bankName.trim(),
      accountName: values.accountName.trim(),
      accountNumber: values.accountNumber.trim(),
      nextInvoiceNumber: Math.max(1, Math.floor(Number(values.nextInvoiceNumber)) || 1),
    })
    setStatus('Saved. New invoices will use these details.')
  }

  async function handleBackup() {
    setError('')
    setBackupNote('')
    try {
      const result = await exportBackup()
      if (result === 'cancelled') return
      await markBackedUp()
      setBackupNote(
        result === 'saved'
          ? 'Backup saved to your phone. Keep a copy in Google Drive or send it to yourself on WhatsApp.'
          : 'Backup shared.',
      )
    } catch {
      setError("The backup couldn't be made. Try again.")
    }
  }

  async function handleRestore(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    setBackupNote('')
    try {
      const data = await readBackup(file)
      if (!window.confirm('Replace everything on this phone with the records in this backup?')) return
      await restore(data)
      setBackupNote('Backup restored.')
    } catch (err) {
      setError(err.message || "That backup couldn't be restored.")
    }
  }

  async function handleErase() {
    if (!window.confirm('Erase all invoices, prices and settings from this phone? This cannot be undone. Back up first if you may need them.')) return
    await eraseAll()
    go('/', { replace: true })
  }

  return (
    <>
      <header className="pagehead">
        <h1>Settings</h1>
      </header>

      <form onSubmit={handleSave} className="editor">
        <fieldset className="group">
          <legend>Your business</legend>
          <label className="field">
            <span>Business name</span>
            <input value={values.businessName} onChange={set('businessName')} />
          </label>
          <label className="field">
            <span>Phone number</span>
            <input type="tel" value={values.phone} onChange={set('phone')} />
          </label>
          <label className="field">
            <span>Address</span>
            <input value={values.address} onChange={set('address')} />
          </label>
        </fieldset>

        <fieldset className="group">
          <legend>Where customers pay you</legend>
          <label className="field">
            <span>Bank</span>
            <input value={values.bankName} onChange={set('bankName')} />
          </label>
          <label className="field">
            <span>Account name</span>
            <input value={values.accountName} onChange={set('accountName')} />
          </label>
          <label className="field">
            <span>Account number</span>
            <input inputMode="numeric" value={values.accountNumber} onChange={set('accountNumber')} />
          </label>
          <p className="muted small">Printed on each invoice and sent in the WhatsApp message.</p>
        </fieldset>

        <fieldset className="group">
          <legend>Invoice numbers</legend>
          <label className="field">
            <span>Next invoice number</span>
            <input type="number" min="1" value={values.nextInvoiceNumber} onChange={set('nextInvoiceNumber')} />
          </label>
          <p className="muted small">Moving from a paper receipt book? Start at the next number in your book.</p>
        </fieldset>

        <div className="actions">
          <button type="submit" className="btn btn-primary">
            Save settings
          </button>
          {status && (
            <span role="status" className="muted small">
              {status}
            </span>
          )}
        </div>
      </form>

      <section className="block">
        <h2>Backup and records</h2>
        <p className="muted">
          Your records are stored only on this phone. {profile.lastBackupAt ? `Last backup: ${fmtDate(profile.lastBackupAt)}.` : 'You have not backed up yet.'}
        </p>
        <div className="actions">
          <button type="button" className="btn btn-primary btn-small" onClick={handleBackup}>
            Back up everything
          </button>
          <button type="button" className="btn btn-quiet btn-small" onClick={() => fileRef.current?.click()}>
            Restore a backup
          </button>
          <button type="button" className="btn btn-quiet btn-small" disabled={invoices.length === 0} onClick={() => exportCsv(invoices)}>
            Export sales (CSV)
          </button>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={handleRestore} />
        {backupNote && (
          <p className="notice" role="status">
            {backupNote}
          </p>
        )}
        {error && (
          <p className="notice notice-error" role="alert">
            {error}
          </p>
        )}
      </section>

      <hr className="rule" />
      <p className="muted small">{APP_NAME} works without internet. It only needs data to send things on WhatsApp.</p>
      <button type="button" className="link danger" onClick={handleErase}>
        Erase all data on this phone
      </button>
    </>
  )
}
