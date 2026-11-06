import { useApp } from './lib/store'
import { useRoute } from './lib/route'
import TabBar from './components/TabBar'
import Onboarding from './pages/Onboarding'
import Home from './pages/Home'
import InvoiceEditor from './pages/InvoiceEditor'
import InvoiceDetail from './pages/InvoiceDetail'
import Items from './pages/Items'
import Settings from './pages/Settings'

export default function App() {
  const { ready, error, profile } = useApp()
  const [section, id] = useRoute()

  if (!ready) {
    return (
      <p className="loading" role="status">
        Opening
      </p>
    )
  }
  if (error) {
    return (
      <div className="shell narrow-shell">
        <h1>Something's blocking storage</h1>
        <p className="lead">{error}</p>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          Try again
        </button>
      </div>
    )
  }
  if (!profile) return <Onboarding />

  let page
  let active = 'home'
  if (section === 'new') {
    page = <InvoiceEditor />
    active = 'new'
  } else if (section === 'edit') {
    page = <InvoiceEditor id={id} />
    active = 'new'
  } else if (section === 'invoice') {
    page = <InvoiceDetail key={id} id={id} />
  } else if (section === 'items') {
    page = <Items />
    active = 'items'
  } else if (section === 'settings') {
    page = <Settings />
    active = 'settings'
  } else {
    page = <Home />
  }

  return (
    <div className="shell">
      <main>{page}</main>
      <TabBar active={active} />
    </div>
  )
}
