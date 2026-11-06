import { useRef, useState } from 'react'
import { APP_NAME } from '../config'
import { useApp } from '../lib/store'
import { readBackup } from '../lib/backup'
import { go } from '../lib/route'

export default function Onboarding() {
  const { createProfile, restore } = useApp()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  async function handleStart(e) {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    await createProfile(name.trim(), phone.trim())
    go('/', { replace: true })
  }

  async function handleRestore(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    try {
      await restore(await readBackup(file))
      go('/', { replace: true })
    } catch (err) {
      setError(err.message || "That backup couldn't be restored.")
    }
  }

  return (
    <div className="shell narrow-shell">
      <p className="wordmark">{APP_NAME}</p>
      <h1>What is your business called?</h1>
      <p className="lead">
        This goes at the top of every invoice and receipt. There's no account to make. Your records stay on
        this phone.
      </p>
      <form onSubmit={handleStart}>
        <label className="field">
          <span>Business name</span>
          <input
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Mama Chidi Provisions"
            autoComplete="organization"
          />
        </label>
        <label className="field">
          <span>
            Phone number <em>(optional)</em>
          </span>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
        </label>
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          Start
        </button>
      </form>

      <hr className="rule" />
      <p className="muted small">Already used {APP_NAME} on another phone, or reinstalled it?</p>
      <button type="button" className="btn btn-quiet" onClick={() => fileRef.current?.click()}>
        Restore from a backup file
      </button>
      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={handleRestore} />
      {error && (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
