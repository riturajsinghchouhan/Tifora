import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { MapPin, Plus, Search, Edit, Trash2, Eye, Map, Bike, UtensilsCrossed } from "lucide-react"
import { adminAPI } from "@food/api"
const debugLog = (...args) => {}
const debugWarn = (...args) => {}
const debugError = (...args) => {}

// Restaurant delivery zones and tiffin service zones are two independent
// polygon sets. The tab only switches which set this page reads and writes.
const TABS = [
  {
    key: "restaurant",
    label: "Zone Setup Restaurant",
    subtitle: "Manage delivery zones for restaurants",
    icon: MapPin,
    basePath: "/admin/food/zone-setup",
    list: (params) => adminAPI.getZones(params),
    remove: (id) => adminAPI.deleteZone(id),
  },
  {
    key: "tiffin",
    label: "Zone Setup for Tiffin",
    subtitle: "Manage service zones for tiffin plans",
    icon: UtensilsCrossed,
    basePath: "/admin/food/zone-setup/tiffin",
    list: (params) => adminAPI.getTiffinZones(params),
    remove: (id) => adminAPI.deleteTiffinZone(id),
  },
]

export default function ZoneSetup() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTabKey = searchParams.get("tab") === "tiffin" ? "tiffin" : "restaurant"
  const activeTab = TABS.find((t) => t.key === activeTabKey) || TABS[0]
  const isTiffin = activeTabKey === "tiffin"

  const [zones, setZones] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    fetchZones()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabKey])

  const handleTabChange = (key) => {
    if (key === activeTabKey) return
    setSearchQuery("")
    setZones([])
    const next = new URLSearchParams(searchParams)
    if (key === "restaurant") next.delete("tab")
    else next.set("tab", key)
    setSearchParams(next, { replace: true })
  }

  const fetchZones = async () => {
    try {
      setLoading(true)
      const response = await activeTab.list()
      if (response.data?.success && response.data.data?.zones) {
        setZones(response.data.data.zones)
      } else {
        setZones([])
      }
    } catch (error) {
      debugError("Error fetching zones:", error)
      setZones([])
    } finally {
      setLoading(false)
    }
  }


  const handleDeleteZone = async (zoneId) => {
    if (!window.confirm("Are you sure you want to delete this zone?")) {
      return
    }
    try {
      await activeTab.remove(zoneId)
      alert("Zone deleted successfully!")
      fetchZones()
    } catch (error) {
      debugError("Error deleting zone:", error)
      alert(error.response?.data?.message || "Failed to delete zone")
    }
  }

  const filteredZones = zones.filter(zone =>
    zone.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    zone.serviceLocation?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="p-2 lg:p-3 bg-slate-50 min-h-screen">
      <div className="w-full mx-auto max-w-7xl">
        {/* Tabs */}
        <div className="flex items-center gap-1 mb-5 border-b border-slate-200 overflow-x-auto">
          {TABS.map((tab) => {
            const TabIcon = tab.icon
            const selected = tab.key === activeTabKey
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  selected
                    ? "border-red-500 text-red-600"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <TabIcon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div className="flex items-center gap-3 mb-4 md:mb-0">
            <div className="w-10 h-10 rounded-lg bg-red-500 flex items-center justify-center">
              <activeTab.icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{activeTab.label}</h1>
              <p className="text-sm text-slate-600">{activeTab.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isTiffin && (
              <>
                <button
                  onClick={() => navigate("/admin/food/zone-setup/delivery-boy-view")}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Bike className="w-5 h-5" />
                  <span>Delivery Boy View</span>
                </button>
                <button
                  onClick={() => navigate("/admin/food/zone-setup/map")}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Map className="w-5 h-5" />
                  <span>View Map</span>
                </button>
              </>
            )}
            <button
              onClick={() => navigate(`${activeTab.basePath}/add`)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>{isTiffin ? "Add Tiffin Zone" : "Add Zone"}</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder={isTiffin ? "Search tiffin zones by name or location..." : "Search zones by name or location..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Zones List */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading zones...</p>
          </div>
        ) : filteredZones.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
            <MapPin className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No zones found</h3>
            <p className="text-slate-600 mb-6">
              {searchQuery
                ? "Try adjusting your search query"
                : isTiffin
                  ? "Create your first tiffin service zone to get started"
                  : "Create your first delivery zone to get started"}
            </p>
            {!searchQuery && (
              <button
                onClick={() => navigate(`${activeTab.basePath}/add`)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>{isTiffin ? "Add Tiffin Zone" : "Add Zone"}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredZones.map((zone) => (
              <div
                key={zone._id || zone.id}
                className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">{zone.name || "Unnamed Zone"}</h3>
                    <p className="text-sm text-slate-600">{zone.serviceLocation || "N/A"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`${activeTab.basePath}/view/${zone._id || zone.id}`)}
                      className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => navigate(`${activeTab.basePath}/edit/${zone._id || zone.id}`)}
                      className="p-2 text-slate-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteZone(zone._id || zone.id)}
                      className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Unit:</span>
                    <span className="font-medium text-slate-900">{zone.unit || "km"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Status:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      zone.isActive ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-800"
                    }`}>
                      {zone.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {isTiffin && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Restaurants:</span>
                      {(zone.kitchenCount || 0) === 0 ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          None added
                        </span>
                      ) : (
                        <span className="font-medium text-slate-900">{zone.kitchenCount}</span>
                      )}
                    </div>
                  )}
                  {zone.coordinates && zone.coordinates.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Points:</span>
                      <span className="font-medium text-slate-900">{zone.coordinates.length}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

