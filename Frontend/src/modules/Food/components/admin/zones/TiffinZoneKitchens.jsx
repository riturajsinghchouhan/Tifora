import { useCallback, useEffect, useState } from "react"
import { Plus, Search, Trash2, Store, X, Loader2 } from "lucide-react"
import { adminAPI } from "@food/api"

/**
 * Restaurants an admin has added to a tiffin zone.
 *
 * Membership is explicit: only restaurants listed here can sell tiffin plans in
 * this zone. A restaurant sitting inside the polygon is NOT included until it is
 * added, and removing one here only stops new subscriptions - existing
 * subscriptions, plans and deliveries are untouched.
 */
export default function TiffinZoneKitchens({ zoneId }) {
  const [kitchens, setKitchens] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [pickerOpen, setPickerOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [candidates, setCandidates] = useState([])
  const [candidatesLoading, setCandidatesLoading] = useState(false)
  const [selected, setSelected] = useState({})
  const [saving, setSaving] = useState(false)

  const kitchenName = (k) => k?.restaurantName || k?.name || "Unnamed restaurant"
  const kitchenArea = (k) => [k?.area, k?.city].filter(Boolean).join(", ")

  const fetchKitchens = useCallback(async () => {
    if (!zoneId) return
    try {
      setLoading(true)
      setError("")
      const res = await adminAPI.getTiffinZoneKitchens(zoneId)
      setKitchens(res.data?.data?.kitchens || [])
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load restaurants for this zone")
      setKitchens([])
    } finally {
      setLoading(false)
    }
  }, [zoneId])

  useEffect(() => {
    fetchKitchens()
  }, [fetchKitchens])

  // Debounced candidate search, only while the picker is open.
  useEffect(() => {
    if (!pickerOpen || !zoneId) return undefined
    let cancelled = false
    setCandidatesLoading(true)
    const timer = setTimeout(async () => {
      try {
        const res = await adminAPI.getAssignableTiffinKitchens(zoneId, {
          search: search.trim(),
          limit: 50,
        })
        if (!cancelled) setCandidates(res.data?.data?.kitchens || [])
      } catch {
        if (!cancelled) setCandidates([])
      } finally {
        if (!cancelled) setCandidatesLoading(false)
      }
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [pickerOpen, search, zoneId])

  const openPicker = () => {
    setSelected({})
    setSearch("")
    setPickerOpen(true)
  }

  const toggleSelected = (id) => {
    setSelected((prev) => {
      const next = { ...prev }
      if (next[id]) delete next[id]
      else next[id] = true
      return next
    })
  }

  const selectedIds = Object.keys(selected)

  const handleAdd = async () => {
    if (selectedIds.length === 0) return
    try {
      setSaving(true)
      await adminAPI.addTiffinZoneKitchens(zoneId, selectedIds)
      setPickerOpen(false)
      setSelected({})
      await fetchKitchens()
    } catch (err) {
      alert(err.response?.data?.message || "Failed to add restaurants to this zone")
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (kitchen) => {
    const name = kitchenName(kitchen)
    if (
      !window.confirm(
        `Remove "${name}" from this tiffin zone?\n\nNew subscriptions in this zone will stop. Existing subscriptions, plans and deliveries are not affected.`
      )
    ) {
      return
    }
    try {
      await adminAPI.removeTiffinZoneKitchen(zoneId, kitchen._id || kitchen.id)
      await fetchKitchens()
    } catch (err) {
      alert(err.response?.data?.message || "Failed to remove restaurant from this zone")
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Restaurants in this tiffin zone</h2>
          <p className="text-sm text-slate-600">
            Only these restaurants can sell tiffin plans in this zone.
          </p>
        </div>
        <button
          type="button"
          onClick={openPicker}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Add Restaurant</span>
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-10 text-center">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-600">Loading restaurants...</p>
        </div>
      ) : kitchens.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 py-10 text-center">
          <Store className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-700">No restaurant added yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Tiffin plans will not show to users in this zone until you add at least one restaurant.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {kitchens.map((k) => (
            <li key={k._id || k.id} className="flex items-center justify-between gap-3 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <Store className="w-4 h-4 text-slate-500" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 truncate">{kitchenName(k)}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {kitchenArea(k) || "Location not set"}
                    {k.status ? ` · ${k.status}` : ""}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(k)}
                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                title="Remove from this zone"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900">Add restaurants to this zone</h3>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-3 border-b border-slate-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, area, city or phone..."
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-2">
              {candidatesLoading ? (
                <div className="py-10 text-center">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin mx-auto" />
                </div>
              ) : candidates.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-500">
                  {search.trim()
                    ? "No matching restaurant found."
                    : "Every restaurant is already in this zone."}
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {candidates.map((k) => {
                    const kid = k._id || k.id
                    return (
                      <li key={kid}>
                        <label className="flex items-center gap-3 py-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(selected[kid])}
                            onChange={() => toggleSelected(kid)}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">
                              {kitchenName(k)}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              {kitchenArea(k) || "Location not set"}
                            </p>
                          </div>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-slate-200">
              <span className="text-sm text-slate-600">
                {selectedIds.length} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPickerOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={selectedIds.length === 0 || saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-sm"
                >
                  {saving ? "Adding..." : "Add to zone"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
