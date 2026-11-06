import { useCallback, useEffect, useState } from 'react'
import { getAdminData } from '../lib/api.js'

let cachedData = null
let pendingRequest = null

function loadAdminData(force = false) {
  if (!force && cachedData) return Promise.resolve(cachedData)
  if (!force && pendingRequest) return pendingRequest
  pendingRequest = getAdminData()
    .then((data) => {
      cachedData = data
      return data
    })
    .finally(() => { pendingRequest = null })
  return pendingRequest
}

export function useAdminData() {
  const [data, setData] = useState(cachedData)
  const [loading, setLoading] = useState(!cachedData)
  const [error, setError] = useState('')
  const refresh = useCallback(async (force = true) => {
    if (!cachedData) setLoading(true)
    setError('')
    try { setData(await loadAdminData(force)) }
    catch (err) { setError(err.message || 'Could not load dashboard data.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { refresh(false) }, [refresh])
  return { data, loading, error, refresh }
}
