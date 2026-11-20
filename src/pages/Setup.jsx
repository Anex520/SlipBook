import { useState } from 'react'
import { APP_NAME } from '../config'
import PoweredBy from '../components/PoweredBy'
import { useApp } from '../lib/store'
import { go } from '../lib/route'

// The first-run guide for new accounts. profile.setup says where they are:
// 'welcome' -> 'bank' -> 'prices' -> 'done'. It is saved on the phone, so closing the app
// part-way picks up at the same step. Every step can be skipped.
export default function Setup() {
  const { profile, saveProfile } = useApp()
  const step = profile.setup

  if (step === 'bank') return <BankStep profile={profile} saveProfile={saveProfile} />
  if (step === 'prices') return <PricesStep saveProfile={saveProfile} />
  return <Welcome profile={profile} saveProfile={saveProfile} />
}

function Dots({ at }) {
  return (
    <p className="stepdots" aria-label={`Step ${at} of 2`}>
      <span className={at >= 1 ? 'on' : ''} />
      <span className={at >= 2 ? 'on' : ''} />
      <span className="stepdots-text">Step {at} of 2</span>
    </p>
  )
}

function Welcome({ profile, saveProfile }) {
  const [busy, setBusy] = useState(false)
  const next = async (setup) => {
    setBusy(true)
    await saveProfile({ setup })
  }
  return (
    <div className="shell narrow-shell">
      <p className="wordmark">{APP_NAME}</p>

      <section className="welcome" aria-label="Welcome">
        <p className="welcome-kicker">Andex Concepts</p>
        <h1>Welcome, {profile.businessName}!</h1>
        <p className="welcome-text">
          We're glad you're here. Slipbook helps you send invoices, give receipts and always know who has paid.
          Let's get you set up. It only takes a minute.
        </p>
      </section>

      <ul className="promises">
        <li>
          <strong>Your records stay on your phone.</strong>
          <span>No account, no one else can see your sales.</span>
        </li>
        <li>
          <strong>It works without internet.</strong>
          <span>You only need data to send something on WhatsApp.</span>
        </li>
        <li>
          <strong>Back up now and then.</strong>
          <span>One file in Google Drive keeps your records safe if you lose your phone.</span>
        </li>
      </ul>

      <p className="muted">Setup takes about a minute. There are two quick steps, and you can skip either one.</p>
      <div className="actions-stack">
        <button type="button" className="btn btn-primary btn-block" disabled={busy} onClick={() => next('bank')}>
          Let's set up
        </button>
        <button type="button" className="btn btn-quiet btn-block" disabled={busy} onClick={() => next('done')}>
          Skip setup
        </button>
      </div>
      <PoweredBy />
    </div>
  )
}

function BankStep({ profile, saveProfile }) {
  const [values, setValues] = useState({
    bankName: profile.bankName || '',
    accountName: profile.accountName || profile.businessName || '',
    accountNumber: profile.accountNumber || '',
  })
  const [busy, setBusy] = useState(false)
  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }))

  async function save(e) {
    e.preventDefault()
    setBusy(true)
    await saveProfile({
      bankName: values.bankName.trim(),
      accountName: values.accountName.trim(),
      accountNumber: values.accountNumber.trim(),
      setup: 'prices',
    })
  }
  async function skip() {
    setBusy(true)
    await saveProfile({ setup: 'prices' })
  }

  return (
    <div className="shell narrow-shell">
      <p className="wordmark">{APP_NAME}</p>
      <Dots at={1} />
      <h1>Where should customers pay you?</h1>
      <p className="lead">
        These details are printed on every invoice and sent in the WhatsApp message, so customers know where to
        send the transfer.
      </p>
      <form onSubmit={save}>
        <fieldset className="group">
          <legend>Your account</legend>
          <label className="field">
            <span>Bank</span>
            <input autoFocus value={values.bankName} onChange={set('bankName')} placeholder="GTBank" autoComplete="off" />
          </label>
          <label className="field">
            <span>Account name</span>
            <input value={values.accountName} onChange={set('accountName')} autoComplete="off" />
          </label>
          <label className="field">
            <span>Account number</span>
            <input
              inputMode="numeric"
              value={values.accountNumber}
              onChange={set('accountNumber')}
              placeholder="0123456789"
              autoComplete="off"
            />
          </label>
        </fieldset>
        <div className="actions-stack">
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            Save and continue
          </button>
          <button type="button" className="btn btn-quiet btn-block" disabled={busy} onClick={skip}>
            Skip for now
          </button>
        </div>
      </form>
      <p className="muted small center">You can change these any time in Settings.</p>
      <PoweredBy />
    </div>
  )
}

function PricesStep({ saveProfile }) {
  const [busy, setBusy] = useState(false)
  async function finish(destination) {
    setBusy(true)
    await saveProfile({ setup: 'done' })
    go(destination, { replace: true })
  }
  return (
    <div className="shell narrow-shell">
      <p className="wordmark">{APP_NAME}</p>
      <Dots at={2} />
      <h1>Add the things you sell?</h1>
      <p className="lead">
        Save your products and prices once, then tap them to add to any invoice. It saves a lot of typing. You can
        also do this later from the Price list tab.
      </p>
      <div className="actions-stack">
        <button type="button" className="btn btn-primary btn-block" disabled={busy} onClick={() => finish('/items')}>
          Add my price list
        </button>
        <button type="button" className="btn btn-quiet btn-block" disabled={busy} onClick={() => finish('/')}>
          Skip, take me to the app
        </button>
      </div>
      <PoweredBy />
    </div>
  )
}
