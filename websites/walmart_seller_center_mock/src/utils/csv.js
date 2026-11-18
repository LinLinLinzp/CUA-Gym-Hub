export function exportCsv(filename, headers, rows) {
  const encode = (value) => {
    const raw = String(value ?? '')
    const safe = typeof value === 'string' && /^[\s]*[=+\-@\t\r\n]/.test(raw) ? "'" + raw : raw
    return '"' + safe.replaceAll('"', '""') + '"'
  }
  const contents = [headers, ...rows].map((row) => row.map(encode).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([contents], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
