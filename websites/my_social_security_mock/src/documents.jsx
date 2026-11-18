import React, { useState } from 'react'
import { BackLink, Facts, Icon } from './ui.jsx'

const sample = 'Sample · Synthetic data'

export function DocumentView({ doc, backTo, backText, filename, onAction, extraAction }) {
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

  async function download() {
    setDownloading(true)
    setError('')
    try {
      const { downloadPdf } = await import('./pdf.js')
      downloadPdf(doc, filename, sample)
      onAction('downloaded')
    } catch {
      setError('The PDF could not be downloaded. Try again.')
    } finally {
      setDownloading(false)
    }
  }

  function print() {
    onAction('print_requested')
    window.print()
  }

  return <div className="document-layout">
    <div className="document-toolbar">
      <BackLink to={backTo}>{backText}</BackLink>
      <div className="button-row">
        {extraAction}
        <button className="button secondary" type="button" onClick={print}><Icon name="print" />Print</button>
        <button className="button primary" type="button" onClick={download} disabled={downloading}>
          <Icon name="download" />{downloading ? 'Preparing PDF…' : 'Download PDF'}
        </button>
      </div>
      {error && <p role="alert" className="error-text">{error}</p>}
    </div>
    <article className="panel document">
      <p className="eyebrow">my Social Security</p>
      <h1>{doc.title}</h1>
      <p className="muted document-date">{doc.date}</p>
      <p className="sample-mark">{sample}</p>
      {!!doc.facts?.length && <Facts items={doc.facts} />}
      {doc.paragraphs?.map((paragraph, index) => <p className="document-paragraph" key={index}>{paragraph}</p>)}
      {doc.tables?.map(({ heading, columns, rows }) => <section key={heading}>
        <h2>{heading}</h2>
        {rows.length ? <div className="table-scroll" tabIndex="0" role="region" aria-label={heading}>
          <table className="money-table" aria-label={heading}>
            <thead><tr>{columns.map(column => <th key={column} scope="col">{column}</th>)}</tr></thead>
            <tbody>{rows.map((row, index) => <tr key={index}>{row.map((value, column) => column === 0
              ? <th key={column} scope="row">{value}</th>
              : <td key={column}>{value}</td>)}</tr>)}</tbody>
          </table>
        </div> : <p className="empty">No records are available.</p>}
      </section>)}
    </article>
  </div>
}
