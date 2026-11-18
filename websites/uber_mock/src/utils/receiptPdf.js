import { jsPDF } from 'jspdf'
import { money, paymentLabel, records, tripLabel } from '../account.jsx'

export function downloadReceipt({ receipt, trip, issued, profile, email }) {
  const pdf = new jsPDF({ unit: 'pt', format: 'letter' })
  const left = 54
  const right = 558
  const value = (amount) => money(amount, receipt.currency)
  const title = receipt.number || receipt.id
  let y = 58

  function text(content, size = 11, weight = 'normal') {
    pdf.setFont('helvetica', weight)
    pdf.setFontSize(size)
    for (const line of pdf.splitTextToSize(String(content), right - left)) {
      if (y > 738) {
        pdf.addPage()
        y = 58
      }
      pdf.text(line, left, y)
      y += size + 6
    }
  }

  pdf.setProperties({ title: 'Uber receipt ' + title, subject: 'Itemized trip receipt' })
  pdf.setTextColor(21, 40, 64)
  text('Uber', 22, 'bold')
  text('Trip receipt ' + title, 16, 'bold')
  text('Issued ' + issued)
  text(tripLabel(trip))
  if (trip?.pickup) text('Pickup: ' + trip.pickup)
  if (profile?.name) text('Billed profile: ' + profile.name)
  text('Payment: ' + paymentLabel(receipt.payment).replaceAll('•', '*'))
  if (email) text('Receipt email: ' + email)
  y += 10
  text('Itemized charges', 13, 'bold')

  for (const line of records(receipt.lineItems)) {
    text((line.label || 'Charge') + '   |   Qty ' + (line.quantity ?? '—') + '   |   ' + value(line.amount))
  }

  y += 8
  text('Total: ' + value(receipt.total), 15, 'bold')
  pdf.save(String(title).replace(/[^a-zA-Z0-9._-]/g, '_') + '.pdf')
}
