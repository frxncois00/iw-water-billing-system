import { useCallback, useEffect, useState } from 'react'
import { getAdminData } from '../lib/api.js'

export function useAdminData() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try { setData(await getAdminData()) }
    catch (err) { setError(err.message || 'Could not load dashboard data.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { refresh() }, [refresh])
  return { data, loading, error, refresh }
}
