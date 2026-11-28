import { useState, useEffect, useCallback, useRef } from 'react'
import { tiffinZoneAPI } from '@food/api'

// Mirrors useZone.jsx but against the tiffin polygon set, which is maintained
// separately in admin > Zone Setup > Tiffin Zone. Kept as its own hook (and its
// own cache/localStorage keys) so the restaurant zone flow is untouched.
const ZONE_CACHE_TTL_MS = 30 * 1000
const tiffinZoneCache = new Map() // key -> { ts, payload }
const tiffinZoneInFlight = new Map() // key -> Promise<payload>

const STORAGE_ZONE_ID = 'userTiffinZoneId'
const STORAGE_ZONE = 'userTiffinZone'
const STORAGE_ENFORCED = 'tiffinZoneEnforced'

const roundCoord = (v, digits = 5) => {
  const n = Number(v)
  if (!Number.isFinite(n)) return null
  const p = 10 ** digits
  return Math.round(n * p) / p
}

const zoneKeyFromCoords = (lat, lng) => {
  const rLat = roundCoord(lat, 5)
  const rLng = roundCoord(lng, 5)
  if (rLat === null || rLng === null) return null
  return `${rLat},${rLng}`
}

const safeGet = (key) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

const safeSet = (key, value) => {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* storage unavailable (private mode) - detection still works in memory */
  }
}

const safeRemove = (key) => {
  try {
    localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

const applyPayload = (data, { setZoneId, setZone, setZoneStatus, setEnforced }) => {
  // enforced === false means no admin has drawn a tiffin zone yet, so tiffin is
  // open everywhere - exactly how it behaved before tiffin zoning shipped.
  const enforced = data?.enforced !== false
  setEnforced(enforced)
  safeSet(STORAGE_ENFORCED, enforced ? 'true' : 'false')

  if (!enforced) {
    setZoneId(null)
    setZone(null)
    setZoneStatus('IN_SERVICE')
    safeRemove(STORAGE_ZONE_ID)
    safeRemove(STORAGE_ZONE)
    return
  }

  if (data?.status === 'IN_SERVICE' && data.zoneId) {
    setZoneId(data.zoneId)
    setZone(data.zone || null)
    setZoneStatus('IN_SERVICE')
    safeSet(STORAGE_ZONE_ID, data.zoneId)
    safeSet(STORAGE_ZONE, JSON.stringify(data.zone || null))
  } else {
    setZoneId(null)
    setZone(null)
    setZoneStatus('OUT_OF_SERVICE')
    safeRemove(STORAGE_ZONE_ID)
    safeRemove(STORAGE_ZONE)
  }
}

/**
 * Detect the user's tiffin service zone from their location.
 * Only the tiffin surfaces should consume this - the rest of the app keeps
 * using useZone() for restaurant delivery zones.
 */
export function useTiffinZone(location) {
  const [zoneId, setZoneId] = useState(() => safeGet(STORAGE_ZONE_ID) || null)
  const [enforced, setEnforced] = useState(() => safeGet(STORAGE_ENFORCED) !== 'false')
  const [zoneStatus, setZoneStatus] = useState(() => {
    if (safeGet(STORAGE_ENFORCED) === 'false') return 'IN_SERVICE'
    if (safeGet(STORAGE_ZONE_ID)) return 'IN_SERVICE'
    return 'loading'
  })
  const [zone, setZone] = useState(() => {
    const cached = safeGet(STORAGE_ZONE)
    try {
      return cached && cached !== 'undefined' ? JSON.parse(cached) : null
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const prevCoordsRef = useRef({ latitude: null, longitude: null })
  const debounceTimerRef = useRef(null)

  const detectZone = useCallback(async (lat, lng) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setZoneStatus('IDLE')
      setZoneId(null)
      setZone(null)
      return
    }

    const setters = { setZoneId, setZone, setZoneStatus, setEnforced }

    try {
      setLoading(true)
      setError(null)

      const key = zoneKeyFromCoords(lat, lng)
      const now = Date.now()
      if (key) {
        const cached = tiffinZoneCache.get(key)
        if (cached && now - cached.ts < ZONE_CACHE_TTL_MS) {
          applyPayload(cached.payload, setters)
          return
        }
      }

      const promise = (() => {
        if (key && tiffinZoneInFlight.has(key)) return tiffinZoneInFlight.get(key)
        const p = tiffinZoneAPI
          .detectTiffinZone(lat, lng)
          .then((response) => {
            if (!response?.data?.success) {
              throw new Error(response?.data?.message || 'Failed to detect tiffin zone')
            }
            return response.data.data
          })
          .finally(() => {
            if (key) tiffinZoneInFlight.delete(key)
          })
        if (key) tiffinZoneInFlight.set(key, p)
        return p
      })()

      const data = await promise
      if (key) tiffinZoneCache.set(key, { ts: now, payload: data })
      applyPayload(data, setters)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to detect tiffin zone')

      // A network/backend failure must never read as a confirmed out-of-zone,
      // otherwise a blip would hide tiffin from users who are in service.
      const cachedZoneId = safeGet(STORAGE_ZONE_ID)
      if (cachedZoneId) {
        setZoneId(cachedZoneId)
        const cachedZone = safeGet(STORAGE_ZONE)
        try {
          setZone(cachedZone && cachedZone !== 'undefined' ? JSON.parse(cachedZone) : null)
        } catch {
          setZone(null)
        }
        setZoneStatus('IN_SERVICE')
      } else {
        setZoneStatus('loading')
        setZoneId(null)
        setZone(null)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const lat = roundCoord(location?.latitude, 6)
    const lng = roundCoord(location?.longitude, 6)

    const coordThreshold = 0.0001 // ~10 meters
    const prevLat = prevCoordsRef.current.latitude
    const prevLng = prevCoordsRef.current.longitude
    const coordsChanged =
      prevLat === null ||
      prevLng === null ||
      Math.abs(prevLat - (lat || 0)) > coordThreshold ||
      Math.abs(prevLng - (lng || 0)) > coordThreshold

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      if (coordsChanged) {
        prevCoordsRef.current = { latitude: lat, longitude: lng }
        setZoneStatus('loading')
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = setTimeout(() => {
          detectZone(lat, lng)
        }, 350)
      }
    } else {
      const cachedZoneId = safeGet(STORAGE_ZONE_ID)
      if (safeGet(STORAGE_ENFORCED) === 'false') {
        setZoneStatus('IN_SERVICE')
        setZoneId(null)
        setZone(null)
      } else if (cachedZoneId) {
        setZoneId(cachedZoneId)
        const cachedZone = safeGet(STORAGE_ZONE)
        try {
          setZone(cachedZone && cachedZone !== 'undefined' ? JSON.parse(cachedZone) : null)
        } catch {
          setZone(null)
        }
        setZoneStatus('IN_SERVICE')
      } else {
        // No location picked yet - unknown, not out-of-service.
        setZoneStatus('IDLE')
        setZoneId(null)
        setZone(null)
      }
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
    }
  }, [location?.latitude, location?.longitude, detectZone])

  const refreshTiffinZone = useCallback(() => {
    const lat = location?.latitude
    const lng = location?.longitude
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      detectZone(lat, lng)
    }
  }, [location?.latitude, location?.longitude, detectZone])

  return {
    tiffinZoneId: zoneId,
    tiffinZone: zone,
    tiffinZoneStatus: zoneStatus,
    /** false until an admin draws the first tiffin zone */
    isTiffinZoningEnforced: enforced,
    loading,
    error,
    isTiffinServiceable: !enforced || zoneStatus === 'IN_SERVICE',
    isTiffinOutOfZone: enforced && zoneStatus === 'OUT_OF_SERVICE',
    refreshTiffinZone,
  }
}
