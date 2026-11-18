const ascii = value => String(value ?? '—').normalize('NFKD').replace(/\p{Mark}/gu, '').replace(/[^\x20-\x7e]/g, '-')
const literal = value => '(' + ascii(value).replace(/[\\()]/g, '\\$&') + ')'

export function folioPdf({ title, summary, lines, total }) {
  const pageCount = Math.max(1, Math.ceil(lines.length / 29))
  const pageIds = Array.from({ length: pageCount }, (_, index) => 4 + index * 2)
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [' + pageIds.map(id => id + ' 0 R').join(' ') + '] /Count ' + pageCount + ' >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>',
  ]
  function text(value, y, size = 10) {
    return 'BT /F1 ' + size + ' Tf 42 ' + y + ' Td ' + literal(value) + ' Tj ET\n'
  }
  for (let index = 0; index < pageCount; index++) {
    const pageId = pageIds[index]
    const group = lines.slice(index * 29, (index + 1) * 29)
    let stream = text('Marriott Bonvoy', 742, 19) + text(title, 716, 14)
    summary.forEach((line, row) => { stream += text(line, 690 - row * 16) })
    stream += text('Date        Description                        Qty    Unit amount     Amount', 598)
    group.forEach((line, row) => { stream += text(line, 577 - row * 17) })
    if (index === pageCount - 1) stream += text(total, 577 - group.length * 17 - 12, 12)
    stream += text('Page ' + (index + 1) + ' of ' + pageCount, 40)
    objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ' + (pageId + 1) + ' 0 R >>')
    objects.push('<< /Length ' + stream.length + ' >>\nstream\n' + stream + 'endstream')
  }
  let pdf = '%PDF-1.4\n'
  const offsets = ['0000000000 65535 f \n']
  objects.forEach((object, index) => {
    offsets.push(String(pdf.length).padStart(10, '0') + ' 00000 n \n')
    pdf += (index + 1) + ' 0 obj\n' + object + '\nendobj\n'
  })
  const xref = pdf.length
  pdf += 'xref\n0 ' + (objects.length + 1) + '\n' + offsets.join('')
  pdf += 'trailer\n<< /Size ' + (objects.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n'
  return new Blob([pdf], { type: 'application/pdf' })
}

export function chargeLines(item) {
  const description = ascii(item.description || 'Charge').match(/.{1,33}/g)
  const moneyCell = number => number == null || !Number.isFinite(Number(number)) ? '-' : Number(number).toFixed(2)
  return description.map((part, index) => index
    ? ' '.repeat(12) + part
    : ascii(item.date || '-').slice(0, 10).padEnd(12) + part.padEnd(33) +
      ascii(item.quantity ?? '-').padStart(5) + moneyCell(item.unitAmount).padStart(15) + moneyCell(item.amount).padStart(11))
}

export function downloadBlob(blob, filename) {
  const href = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = href
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(href), 30_000)
}
