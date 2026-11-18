import { useState } from 'react'
import { calculateTable, emptyAdjustment, items } from './pricing.js'
import { id } from './model.js'
import { Dialog, Notice, Search, includesText, money, nameOf } from './ui.jsx'

function PriceTotals({ table, currency }) {
  return <dl className="totals">
    <div><dt>Subtotal</dt><dd>{money(table.subtotal, currency)}</dd></div>
    <div><dt>Discount</dt><dd>{table.discountAmount ? '−' : ''}{money(table.discountAmount, currency)}</dd></div>
    <div><dt>Tax</dt><dd>{money(table.taxAmount, currency)}</dd></div>
    <div><dt>Total</dt><dd>{money(table.total, currency)}</dd></div>
  </dl>
}

export function PricingDisplay({ table, currency, canChoose = false, choices = {}, onChoice }) {
  const preview = canChoose ? calculateTable({
    ...table, lineItems: items(table.lineItems).map(row => ({ ...row, ...choices[row.id] })),
  }) : table
  return <div className="pricing-display">
    <div className="table-scroll"><table>
      <thead><tr><th scope="col">Item</th><th scope="col">Qty</th><th scope="col" className="amount">Unit price</th>
        <th scope="col" className="amount">Total</th></tr></thead>
      <tbody>{items(preview.lineItems).map(row => <tr key={row.id}>
        <td><strong>{row.name || 'Unnamed item'}</strong>{row.description && <small className="table-note">{row.description}</small>}
          {row.optional && (canChoose ? <label className="check"><input type="checkbox" checked={row.selected !== false}
            onChange={event => onChoice(row.id, { selected: event.target.checked })} />Include {row.name}</label>
            : <small className="table-note">{row.selected === false ? 'Optional · excluded' : 'Optional · included'}</small>)}
        </td>
        <td>{canChoose && row.quantityEditable ? <input className="short-input" aria-label={'Quantity for ' + row.name} type="number" min="1" step="1"
          value={row.quantity ?? ''} onChange={event => onChoice(row.id, { quantity: event.target.value })} /> : row.quantity ?? '—'}</td>
        <td className="amount">{money(row.unitPrice, currency)}</td><td className="amount">{money(row.lineTotal, currency)}</td>
      </tr>)}</tbody>
    </table></div>
    <PriceTotals table={preview} currency={currency} />
  </div>
}

const newLine = product => ({
  id: id('li'), ...(product ? { catalogItemId: product.id } : {}), name: product?.name || '',
  description: product?.description || '', unitPrice: product?.unitPrice ?? 0,
  quantity: 1, optional: false, selected: true, quantityEditable: false,
})

function AdjustmentInput({ label, adjustment, onChange }) {
  return <fieldset className="adjustment">
    <legend>{label}</legend>
    <select aria-label={label + ' type'} value={adjustment.type} onChange={event => onChange({ ...adjustment, type: event.target.value })}>
      <option value="percent">Percent</option><option value="fixed">Fixed amount</option>
    </select>
    <input aria-label={label + ' value'} type="number" min="0" step="any" value={adjustment.value}
      onChange={event => onChange({ ...adjustment, value: event.target.value })} />
  </fieldset>
}

export function PricingDialog({ table, currency, catalog, onClose, onSave, onRemove }) {
  const [data, setData] = useState(() => ({
    ...table, id: table?.id || id('pt'), name: table?.name || 'Pricing table', currency,
    discount: { ...emptyAdjustment(), ...table?.discount }, tax: { ...emptyAdjustment(), ...table?.tax }, lineItems: items(table?.lineItems),
  }))
  const [query, setQuery] = useState('')
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [remove, setRemove] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const catalogMatches = items(catalog).filter(product => (!product.currency || product.currency === currency)
    && includesText(query, product.name, product.sku, product.category))

  function changeRow(key, changes) {
    setData(current => ({ ...current, lineItems: current.lineItems.map(row => row.id === key ? { ...row, ...changes } : row) }))
  }
  function addRow(product) {
    setData(current => ({ ...current, lineItems: [...current.lineItems, newLine(product)] }))
    setCatalogOpen(false)
  }
  function move(index, direction) {
    setData(current => {
      const rows = [...current.lineItems]
      const target = index + direction
      if (target < 0 || target >= rows.length) return current
      ;[rows[index], rows[target]] = [rows[target], rows[index]]
      return { ...current, lineItems: rows }
    })
  }
  async function submit(action) {
    if (pending) return
    setPending(true)
    setError('')
    try {
      await action(data)
      onClose()
    } catch (failure) {
      setError(failure.message)
    } finally {
      setPending(false)
    }
  }

  const preview = calculateTable(data)
  return <Dialog title={table ? 'Edit pricing table' : 'Add pricing table'} wide onClose={pending ? () => {} : onClose}>
    <form className="stacked" noValidate onSubmit={event => { event.preventDefault(); submit(onSave) }}>
      <label>Table name<input value={data.name} onChange={event => setData({ ...data, name: event.target.value })} /></label>
      <div className="actions">
        <button type="button" onClick={() => addRow()}>Add custom item</button>
        <button type="button" onClick={() => setCatalogOpen(!catalogOpen)} aria-expanded={catalogOpen}>Add from catalog</button>
      </div>
      {catalogOpen && <div className="catalog-picker stacked">
        <Search value={query} onChange={setQuery} label="Search catalog items" placeholder="Search name, SKU or category" />
        <ul>{catalogMatches.slice(0, 30).map(product => <li key={product.id}>
          <button type="button" onClick={() => addRow(product)}><strong>{nameOf(product)}</strong><span>{product.sku || '—'} · {money(product.unitPrice, currency)}</span></button>
        </li>)}</ul>
        {!catalogMatches.length && <p>No products match this search and currency.</p>}
        {catalogMatches.length > 30 && <p>Showing 30 of {catalogMatches.length} products. Narrow your search to see more.</p>}
      </div>}
      {data.lineItems.length === 0 && <p className="muted">Add a custom item or choose a product from the catalog.</p>}
      {data.lineItems.map((row, index) => <fieldset className="price-line" key={row.id}>
        <legend>Item {index + 1}</legend>
        <div className="price-inputs">
          <label>Item name<input value={row.name || ''} onChange={event => changeRow(row.id, { name: event.target.value })} /></label>
          <label>Unit price<input type="number" min="0" step="0.01" value={row.unitPrice ?? ''} onChange={event => changeRow(row.id, { unitPrice: event.target.value })} /></label>
          <label>Quantity<input type="number" min="1" step="1" value={row.quantity ?? ''} onChange={event => changeRow(row.id, { quantity: event.target.value })} /></label>
          <div className="line-total"><span>Line total</span><strong>{money(preview.lineItems[index].lineTotal, currency)}</strong></div>
        </div>
        <label>Description<input value={row.description || ''} onChange={event => changeRow(row.id, { description: event.target.value })} /></label>
        <div className="actions line-options">
          <label className="check"><input type="checkbox" checked={!!row.optional} onChange={event => changeRow(row.id, { optional: event.target.checked, selected: true })} />Optional item</label>
          {row.optional && <label className="check"><input type="checkbox" checked={row.selected !== false} onChange={event => changeRow(row.id, { selected: event.target.checked })} />Selected by default</label>}
          <label className="check"><input type="checkbox" checked={!!row.quantityEditable} onChange={event => changeRow(row.id, { quantityEditable: event.target.checked })} />Recipient can edit quantity</label>
        </div>
        <div className="actions"><button type="button" disabled={!index} onClick={() => move(index, -1)}>Move up</button>
          <button type="button" disabled={index === data.lineItems.length - 1} onClick={() => move(index, 1)}>Move down</button>
          <button type="button" onClick={() => setData({ ...data, lineItems: data.lineItems.filter(item => item.id !== row.id) })}>Remove item</button></div>
      </fieldset>)}
      <div className="adjustments">
        <AdjustmentInput label="Discount" adjustment={data.discount} onChange={discount => setData({ ...data, discount })} />
        <AdjustmentInput label="Tax" adjustment={data.tax} onChange={tax => setData({ ...data, tax })} />
      </div>
      <PriceTotals table={preview} currency={currency} />
      <Notice error={error} />
      {remove && <div className="notice error" role="group" aria-label="Remove pricing table confirmation">
        <p>Remove this pricing table and its items from the proposal?</p>
        <div className="actions"><button type="button" onClick={() => setRemove(false)}>Keep table</button>
          <button type="button" disabled={pending} onClick={() => submit(onRemove)}>Confirm removal</button></div>
      </div>}
      <div className="actions end">
        {table && !remove && <button type="button" className="push-left" onClick={() => setRemove(true)}>Remove table</button>}
        <button type="button" disabled={pending} onClick={onClose}>Cancel</button>
        <button className="primary" disabled={pending || remove}>Save pricing table</button>
      </div>
    </form>
  </Dialog>
}
