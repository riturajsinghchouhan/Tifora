import React from "react"
import { useNavigate } from "react-router-dom"
import { Users, UserCheck, Plus, FileCheck, ArrowLeft } from "lucide-react"

/**
 * Reusable top navigation header for Deliveryman management pages.
 * Provides unified tabs between Deliveryman List, New Joining Request, and Registrations,
 * plus quick action buttons to Add Deliveryman or review Join Requests.
 */
export default function DeliverymanNavTabs({
  activeTab = "list",
  count = null,
  pendingCount = null,
}) {
  const navigate = useNavigate()

  const tabs = [
    {
      id: "list",
      label: "Deliveryman List",
      icon: Users,
      path: "/admin/food/delivery-partners",
    },
    {
      id: "join-request",
      label: "New Joining Request",
      icon: UserCheck,
      path: "/admin/food/delivery-partners/join-request",
      accent: "text-amber-600",
    },
    {
      id: "registrations",
      label: "Registrations",
      icon: FileCheck,
      path: "/admin/food/delivery-partner-registrations",
      accent: "text-indigo-600",
    },
  ]

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4 mb-6">
      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                if (!isActive) navigate(tab.path)
              }}
              className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-all shrink-0 ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm font-semibold"
                  : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-white" : tab.accent || "text-slate-500"}`} />
              <span>{tab.label}</span>
              {isActive && count !== null && count !== undefined && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white">
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Quick Action Buttons */}
      <div className="flex items-center gap-2 shrink-0">
        {activeTab !== "join-request" && (
          <button
            type="button"
            onClick={() => navigate("/admin/food/delivery-partners/join-request")}
            className="px-3.5 py-2 text-sm font-medium rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 flex items-center gap-2 transition-all shadow-xs"
          >
            <UserCheck className="w-4 h-4 text-amber-600" />
            <span>Join Requests</span>
            {pendingCount ? (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-200 text-amber-900">
                {pendingCount}
              </span>
            ) : null}
          </button>
        )}

        {activeTab !== "add" ? (
          <button
            type="button"
            onClick={() => navigate("/admin/food/delivery-partners/add")}
            className="px-3.5 py-2 text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Deliveryman</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => navigate("/admin/food/delivery-partners")}
            className="px-3.5 py-2 text-sm font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-2 transition-all shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to List</span>
          </button>
        )}
      </div>
    </div>
  )
}
