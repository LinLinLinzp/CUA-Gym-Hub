export async function downloadCertificate(certificate, date) {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const width = pdf.internal.pageSize.getWidth()
  const height = pdf.internal.pageSize.getHeight()
  pdf.setDrawColor(23, 37, 66)
  pdf.setLineWidth(2)
  pdf.rect(32, 32, width - 64, height - 64)
  pdf.setTextColor(32, 40, 62)

  let top = 85
  function line(text, font, size, gap) {
    pdf.setFont(font, 'normal')
    pdf.setFontSize(size)
    const lines = pdf.splitTextToSize(text, width - 132)
    const available = Math.max(1, Math.floor((height - 48 - top) / (size * 1.15)) + 1)
    if (lines.length > available) {
      pdf.addPage()
      top = 72
    }
    pdf.text(lines, width / 2, top, { align: 'center' })
    top += lines.length * size * 1.15 + gap
  }
  line('Coursera', 'helvetica', 21, 34)
  line('Course Certificate', 'times', 34, 18)
  line('Presented to', 'helvetica', 13, 8)
  line(certificate.learnerName || 'Learner', 'times', 32, 12)
  line('for completing', 'helvetica', 13, 8)
  line(certificate.courseTitle || 'Course', 'times', 25, 20)
  line('Issued by ' + (certificate.issuerName || 'Course provider'), 'helvetica', 15, 8)
  line(date ? 'Issued ' + date : 'Issue date unavailable', 'helvetica', 13, 8)
  line('Verification code: ' + (certificate.verificationCode || 'Unavailable'), 'courier', 11, 0)

  const slug = String(certificate.courseTitle || 'course').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 90)
  const fileName = (slug || 'course') + '-certificate.pdf'
  pdf.save(fileName)
  return fileName
}
