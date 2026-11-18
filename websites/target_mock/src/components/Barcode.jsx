export default function Barcode({ code }) {
  if (!code) return <p className="muted">Barcode unavailable.</p>
  const bars = String(code).split('').flatMap((digit, index) => {
    const value = digit.charCodeAt(0) + index * 17
    return [1 + value % 3, 1 + (value >> 1) % 3, 1 + (value >> 3) % 3, 1 + (value >> 4) % 3]
  })
  return <div className="barcode" role="img" aria-label={`Barcode ${code}`}>
    <div className="barcode-lines" aria-hidden="true">{bars.map((width, index) => <span key={index} style={{ flexGrow: width }} />)}</div>
    <p aria-hidden="true">{code}</p>
  </div>
}
