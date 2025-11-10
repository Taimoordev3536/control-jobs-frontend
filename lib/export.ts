// Lightweight, dependency-free export utilities.
// NOTE: This implementation avoids heavy native libraries so it works without extra installs.
// - CSV: standard comma separated file
// - XLS: simple HTML table saved with XLS mime-type (works well with Excel)
// - PDF: opens a printable window containing the table; user can choose "Save as PDF" in print dialog

type Col = { key: string; label?: string }

function normalizeColumns(data: any[], columns?: Col[]) {
  if (columns && columns.length) return columns
  const first = data && data.length ? data[0] : {}
  return Object.keys(first).map((k) => ({ key: k, label: k }))
}

function formatCell(value: any) {
  if (value == null) return ""
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

function buildRows(data: any[], columns: Col[]) {
  return data.map((row) => columns.map((c) => formatCell(row[c.key])))
}

export function exportToCSV(data: any[], columns?: Col[], fileName = "data.csv") {
  const cols = normalizeColumns(data, columns)
  const header = cols.map((c) => c.label ?? c.key)
  const rows = buildRows(data, cols)

  const escape = (cell: string) => {
    if (cell.includes(",") || cell.includes("\n") || cell.includes('"')) {
      return '"' + cell.replace(/"/g, '""') + '"'
    }
    return cell
  }

  const csv = [header.join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

export function exportToXLSX(data: any[], columns?: Col[], fileName = "data.xls") {
  // Create a simple HTML table and save as .xls — Excel will open it fine
  const cols = normalizeColumns(data, columns)
  const header = cols.map((c) => c.label ?? c.key)
  const rows = buildRows(data, cols)

  let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${fileName}</title></head><body><table border="1"><thead><tr>`
  html += header.map((h) => `<th>${h}</th>`).join("")
  html += `</tr></thead><tbody>`
  html += rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")
  html += `</tbody></table></body></html>`

  const blob = new Blob([html], { type: "application/vnd.ms-excel" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

export function exportToPDF(data: any[], columns?: Col[], fileName = "data.pdf") {
  const cols = normalizeColumns(data, columns)
  const header = cols.map((c) => c.label ?? c.key)
  const rows = buildRows(data, cols)

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${fileName}</title><style>table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:6px;text-align:left;font-size:12px}</style></head><body><h3>${fileName}</h3><table><thead><tr>${header.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`

  const w = window.open('', '_blank')
  if (!w) return
  w.document.open()
  w.document.write(html)
  w.document.close()
  // Let user print to PDF via browser print dialog
  setTimeout(() => {
    w.print()
  }, 300)
}

export default {
  exportToCSV,
  exportToXLSX,
  exportToPDF,
}
