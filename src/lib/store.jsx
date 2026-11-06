import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { askPersist, delOne, getAll, getOne, putOne, replaceAll } from './db'
import { newId, sumItems } from './format'

export const AppContext = createContext(null)

const byName = (a, b) => a.name.localeCompare(b.name)
const newestFirst = (a, b) => (b.createdAt || 0) - (a.createdAt || 0)

const EMPTY_PROFILE = {
  phone: '',
  address: '',
  bankName: '',
  accountName: '',
  accountNumber: '',
  nextInvoiceNumber: 1,
  lastBackupAt: null,
}

export function AppProvider({ children }) {
  const [state, setState] = useState({ ready: false, error: '', profile: null, items: [], invoices: [] })
  const ref = useRef(state)
  ref.current = state

  const load = useCallback(async () => {
    try {
      const [kv, items, invoices] = await Promise.all([getAll('kv'), getAll('items'), getAll('invoices')])
      const profile = kv.find((k) => k.key === 'profile')?.value || null
      setState({
        ready: true,
        error: '',
        profile,
        items: items.sort(byName),
        invoices: invoices.sort(newestFirst),
      })
    } catch {
      setState((s) => ({
        ...s,
        ready: true,
        error: "This phone's storage couldn't be opened. Close private browsing, or free up some space, then try again.",
      }))
    }
  }, [])

  useEffect(() => {
    load()
    askPersist()
  }, [load])

  const saveProfile = useCallback(async (patch) => {
    const next = { ...EMPTY_PROFILE, ...(ref.current.profile || {}), ...patch }
    await putOne('kv', { key: 'profile', value: next })
    setState((s) => ({ ...s, profile: next }))
    return next
  }, [])

  const createProfile = useCallback((businessName, phone = '') => saveProfile({ businessName, phone, createdAt: Date.now() }), [saveProfile])

  const saveItem = useCallback(async (item) => {
    const row = { id: item.id || newId(), name: item.name.trim(), price: Number(item.price) || 0 }
    await putOne('items', row)
    setState((s) => {
      const rest = s.items.filter((i) => i.id !== row.id)
      return { ...s, items: [...rest, row].sort(byName) }
    })
  }, [])

  const removeItem = useCallback(async (id) => {
    await delOne('items', id)
    setState((s) => ({ ...s, items: s.items.filter((i) => i.id !== id) }))
  }, [])

  // Creates a new invoice (takes the next number) or updates an unpaid one.
  const saveInvoice = useCallback(
    async (draft) => {
      const { profile, invoices } = ref.current
      const existing = draft.id ? invoices.find((i) => i.id === draft.id) : null
      const snapshot = {
        businessName: profile.businessName,
        businessPhone: profile.phone || '',
        businessAddress: profile.address || '',
        bank: {
          bankName: profile.bankName || '',
          accountName: profile.accountName || '',
          accountNumber: profile.accountNumber || '',
        },
      }
      let row
      if (existing) {
        row = {
          ...existing,
          ...snapshot,
          customer: draft.customer,
          items: draft.items,
          notes: draft.notes,
          dueDate: draft.dueDate,
          total: sumItems(draft.items),
        }
      } else {
        row = {
          id: newId(),
          number: profile.nextInvoiceNumber || 1,
          ...snapshot,
          customer: draft.customer,
          items: draft.items,
          notes: draft.notes,
          dueDate: draft.dueDate,
          total: sumItems(draft.items),
          status: 'unpaid',
          createdAt: Date.now(),
          paidAt: null,
          hasProof: false,
        }
        await saveProfile({ nextInvoiceNumber: row.number + 1 })
      }
      await putOne('invoices', row)
      setState((s) => ({
        ...s,
        invoices: [...s.invoices.filter((i) => i.id !== row.id), row].sort(newestFirst),
      }))
      return row.id
    },
    [saveProfile],
  )

  const setPaid = useCallback(async (invoice, paid) => {
    const row = { ...invoice, status: paid ? 'paid' : 'unpaid', paidAt: paid ? Date.now() : null }
    await putOne('invoices', row)
    setState((s) => ({ ...s, invoices: s.invoices.map((i) => (i.id === row.id ? row : i)) }))
  }, [])

  const removeInvoice = useCallback(async (id) => {
    await delOne('invoices', id)
    await delOne('proofs', id)
    setState((s) => ({ ...s, invoices: s.invoices.filter((i) => i.id !== id) }))
  }, [])

  const saveProof = useCallback(async (invoice, dataUrl) => {
    if (dataUrl) await putOne('proofs', { id: invoice.id, dataUrl })
    else await delOne('proofs', invoice.id)
    const row = { ...invoice, hasProof: Boolean(dataUrl) }
    await putOne('invoices', row)
    setState((s) => ({ ...s, invoices: s.invoices.map((i) => (i.id === row.id ? row : i)) }))
  }, [])

  const getProof = useCallback(async (id) => (await getOne('proofs', id))?.dataUrl || null, [])

  const markBackedUp = useCallback(() => saveProfile({ lastBackupAt: Date.now() }), [saveProfile])

  const restore = useCallback(
    async (data) => {
      await replaceAll(data)
      await load()
    },
    [load],
  )

  const eraseAll = useCallback(async () => {
    await replaceAll({})
    await load()
  }, [load])

  const value = {
    ...state,
    saveProfile,
    createProfile,
    saveItem,
    removeItem,
    saveInvoice,
    setPaid,
    removeInvoice,
    saveProof,
    getProof,
    markBackedUp,
    restore,
    eraseAll,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  return useContext(AppContext)
}
