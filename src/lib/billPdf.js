const ascii = (value = '') => String(value).normalize('NFKD').replace(/[^\x20-\x7E]/g, '')
const escapePdf = (value) => ascii(value).replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)')
const money = (value = 0) => `PHP ${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const shortDate = (value) => value ? new Intl.DateTimeFormat('en-PH', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${String(value).slice(0, 10)}T12:00:00Z`)) : '-'
const month = (value) => value ? new Intl.DateTimeFormat('en-PH', { year: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${String(value).slice(0, 10)}T12:00:00Z`)) : '-'

function pdfDocument(stream) {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R 7 0 R] /Count 2 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
    ...['Office Copy', 'Customer Copy'].flatMap((label, index) => {
      const content = `${stream}\n0.05 0.22 0.36 rg\nBT /F2 10 Tf 44 818 Td (${label}) Tj ET`
      const streamObject = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`
      return index === 0 ? [streamObject] : ['<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 8 0 R >>', streamObject]
    }),
  ]
  let output = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets.push(output.length)
    output += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xref = output.length
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  output += offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return new Blob([output], { type: 'application/pdf' })
}

export function downloadBillPdf(bill) {
  const commands = []
  const text = (x, y, value, size = 10, bold = false) => commands.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${x} ${y} Td (${escapePdf(value)}) Tj ET`)
  const line = (x1, y1, x2, y2, width = 0.7) => commands.push(`${width} w ${x1} ${y1} m ${x2} ${y2} l S`)
  const customer = bill.customer || {}
  const items = bill.items || []

  commands.push('0.05 0.22 0.36 rg')
  text(44, 792, 'ISABEL WATERS', 18, true)
  text(44, 775, 'Billing & Collection', 9)
  text(390, 792, 'MONTHLY WATER BILL', 9, true)
  text(390, 773, bill.bill_no || '-', 15, true)
  commands.push('0.65 0.78 0.86 RG')
  line(44, 752, 551, 752, 1.2)

  commands.push('0.05 0.22 0.36 rg')
  text(44, 720, 'STATEMENT PERIOD', 8, true)
  text(44, 696, month(bill.billing_month), 20, true)
  text(420, 704, `STATUS: ${String(bill.status || 'unpaid').toUpperCase()}`, 9, true)

  commands.push('0.35 0.43 0.50 rg')
  text(44, 656, 'BILLED TO', 8, true)
  text(315, 656, 'BILL DETAILS', 8, true)
  commands.push('0.05 0.15 0.23 rg')
  text(44, 635, customer.full_name || 'Customer', 12, true)
  text(44, 617, customer.address || '-', 9)
  text(44, 601, `CAN ${customer.can || 'Pending assignment'}`, 9)
  text(44, 585, `Meter no. ${customer.meter_no || '-'}`, 9)
  text(315, 635, `Bill date: ${shortDate(bill.bill_date)}`, 9)
  text(315, 617, `Due date: ${shortDate(bill.due_date)}`, 9)
  text(315, 599, `Bill no.: ${bill.bill_no || '-'}`, 9)
  commands.push('0.78 0.84 0.88 RG')
  line(44, 566, 551, 566)

  commands.push('0.93 0.96 0.98 rg')
  commands.push('44 532 507 26 re f')
  commands.push('0.30 0.40 0.48 rg')
  text(54, 541, 'DESCRIPTION', 8, true)
  text(335, 541, 'READING / QUANTITY', 8, true)
  text(492, 541, 'AMOUNT', 8, true)
  commands.push('0.05 0.15 0.23 rg')
  let y = 510
  text(54, y, 'Monthly water service', 10, true)
  text(335, y, `Previous ${Number(bill.previous_reading || 0).toFixed(2)} m3`, 8)
  text(335, y - 14, `Current ${Number(bill.current_reading || 0).toFixed(2)} m3`, 8)
  text(335, y - 28, `Used ${Number(bill.water_used || 0).toFixed(2)} m3`, 8)
  if (!items.length) text(478, y, money(bill.amount), 9, true)
  y -= 52
  items.slice(0, 8).forEach((item) => {
    line(54, y + 13, 541, y + 13, 0.35)
    text(54, y, item.description, 8)
    text(335, y, item.quantity == null ? '-' : `${Number(item.quantity).toFixed(2)} m3`, 8)
    text(478, y, money(item.amount), 8, true)
    y -= 24
  })

  const totalsY = Math.min(y - 10, 360)
  const totals = [
    ['Water charge', bill.water_charge ?? bill.amount],
    ['Penalty', bill.penalty_amount ?? 0],
    ['Previous unpaid balance', bill.previous_balance ?? 0],
    ['Amount paid', -Number(bill.amount_paid || 0)],
  ]
  let ty = totalsY
  totals.forEach(([label, value]) => { text(325, ty, label, 9); text(470, ty, money(value), 9, true); ty -= 20 })
  line(315, ty + 10, 551, ty + 10, 1)
  text(325, ty - 8, 'TOTAL DUE AT ISSUE', 9, true)
  text(455, ty - 8, money(bill.total_amount ?? bill.amount), 13, true)
  ty -= 36
  text(325, ty, 'CURRENT BILL BALANCE', 9, true)
  text(455, ty, money(bill.balance), 13, true)

  commands.push('0.35 0.43 0.50 rg')
  text(44, 72, 'Keep your bill number when paying or asking about this statement.', 8)
  text(44, 54, 'Generated by Isabel Waters Billing & Collection.', 8)

  const blob = pdfDocument(commands.join('\n'))
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${bill.bill_no || 'water-bill'}-${String(bill.billing_month || '').slice(0, 7)}.pdf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
