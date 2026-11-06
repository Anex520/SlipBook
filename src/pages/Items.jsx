import { useState } from 'react'
import { useApp } from '../lib/store'
import { naira } from '../lib/format'

function ItemRow({ item }) {
  const { saveItem, removeItem } = useApp()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(item.name)
  const [price, setPrice] = useState(String(item.price))

  async function save(e) {
    e.preventDefault()
    if (!name.trim()) return
    await saveItem({ id: item.id, name, price })
    setEditing(false)
  }

  if (editing) {
    return (
      <li>
        <form className="item-row item-row-product row-pad" onSubmit={save}>
          <label className="field item-desc">
            <span>Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field item-price">
            <span>Price (₦)</span>
            <input type="number" min="0" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
          </label>
          <div className="actions">
            <button type="submit" className="btn btn-primary btn-small">
              Save
            </button>
            <button type="button" className="link" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      </li>
    )
  }

  return (
    <li className="row">
      <div className="row-main">
        <p className="row-title">{item.name}</p>
      </div>
      <p className="row-amount">{naira(item.price)}</p>
      <button type="button" className="link" onClick={() => setEditing(true)}>
        Edit
      </button>
      <button
        type="button"
        className="link danger"
        onClick={() => window.confirm(`Remove "${item.name}" from your price list?`) && removeItem(item.id)}
      >
        Remove
      </button>
    </li>
  )
}

export default function Items() {
  const { items, saveItem } = useApp()
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')

  async function add(e) {
    e.preventDefault()
    if (!name.trim()) return
    await saveItem({ name, price })
    setName('')
    setPrice('')
  }

  return (
    <>
      <header className="pagehead">
        <h1>Price list</h1>
        <p className="lead">Save what you sell once. Then add it to an invoice with one tap.</p>
      </header>

      <form onSubmit={add} className="item-row item-row-product">
        <label className="field item-desc">
          <span>Item or service</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Bag of rice (50kg)" />
        </label>
        <label className="field item-price">
          <span>Price (₦)</span>
          <input type="number" min="0" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
        </label>
        <button type="submit" className="btn btn-primary btn-small item-add">
          Add
        </button>
      </form>

      {items.length === 0 ? (
        <p className="empty">Nothing saved yet.</p>
      ) : (
        <ul className="rows">
          {items.map((i) => (
            <ItemRow key={i.id + i.name + i.price} item={i} />
          ))}
        </ul>
      )}
    </>
  )
}
