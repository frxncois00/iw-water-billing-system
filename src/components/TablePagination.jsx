import { useEffect, useMemo, useState } from 'react'

export function useTablePagination(rows, pageSize = 10, resetKeys = []) {
  const [page, setPage] = useState(1)
  const pages = Math.max(1, Math.ceil(rows.length / pageSize))
  useEffect(() => { setPage(1) }, resetKeys)
  useEffect(() => { if (page > pages) setPage(pages) }, [page, pages])
  const visibleRows = useMemo(() => rows.slice((page - 1) * pageSize, page * pageSize), [rows, page, pageSize])
  return { page, pages, setPage, visibleRows, from: rows.length ? (page - 1) * pageSize + 1 : 0, to: Math.min(page * pageSize, rows.length) }
}

export default function TablePagination({ page, pages, setPage, from, to, total }) {
  return <footer className="table-pagination"><p>Showing <strong>{from}–{to}</strong> of <strong>{total}</strong></p><div><button type="button" className="button button-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} of {pages}</span><button type="button" className="button button-ghost" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button></div></footer>
}
