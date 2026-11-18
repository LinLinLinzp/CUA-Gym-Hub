import { jsPDF } from 'jspdf'

export function downloadPdf(doc, filename, sample) {
  const pdf = new jsPDF({ unit: 'pt' })
  const left = 52
  const width = 490
  let y = 48

  function ensureSpace(height) {
    if (y + height > 790) {
      pdf.addPage()
      y = 50
    }
  }

  function write(value, size = 11, bold = false) {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal')
    pdf.setFontSize(size)
    const height = size + 5
    const lines = pdf.splitTextToSize(String(value), width)
    for (const line of lines) {
      ensureSpace(height)
      pdf.text(line, left, y)
      y += height
    }
  }

  pdf.setProperties({ title: doc.title, subject: sample })
  write('my Social Security', 12, true)
  y += 10
  write(doc.title, 21, true)
  write(doc.date)
  write(sample)
  y += 17
  for (const [label, value] of doc.facts ?? []) write(label + ': ' + value)
  for (const paragraph of doc.paragraphs ?? []) {
    y += 9
    write(paragraph)
  }
  for (const { heading, columns, rows } of doc.tables ?? []) {
    y += 16
    ensureSpace(56)
    write(heading, 14, true)
    if (!rows.length) {
      write('No records are available.')
      continue
    }
    function row(values, header = false) {
      pdf.setFont('helvetica', header ? 'bold' : 'normal')
      pdf.setFontSize(10)
      const columnWidth = width / columns.length
      const wrapped = values.map(value => pdf.splitTextToSize(String(value), columnWidth - 12))
      const height = 15 * Math.max(...wrapped.map(lines => lines.length))
      if (!header && y + height > 790) {
        ensureSpace(height)
        row(columns, true)
        pdf.setFont('helvetica', 'normal')
      }
      wrapped.forEach((lines, index) => pdf.text(lines, left + index * columnWidth, y, { lineHeightFactor: 1.5 }))
      y += height
    }
    row(columns, true)
    for (const values of rows) row(values)
  }

  pdf.save(String(filename).replace(/[^a-z0-9_-]/gi, '_') + '.pdf')
}
