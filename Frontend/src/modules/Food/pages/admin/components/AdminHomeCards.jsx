import React from "react"
import { useNavigate } from "react-router-dom"
import {
  ArrowUpRight,
  Clock,
  CheckCircle,
  XCircle,
  Store,
  Truck,
  UserCircle,
  Activity
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@food/components/ui/card"
import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar
} from "recharts"

export function MetricCard({ title, value, helper, icon, accent, path }) {
  const navigate = useNavigate()
  return (
    <Card
      className="group relative overflow-hidden border-neutral-200 bg-white p-0 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 active:scale-[0.98]"
      onClick={() => path && navigate(path)}
    >
      <CardContent className="relative flex flex-col gap-2 px-4 pb-4 pt-4 h-full">
        <div className={`absolute inset-0 opacity-40 transition-opacity duration-300 group-hover:opacity-60 ${accent}`} />
        <div className="relative flex items-center justify-between z-10">
          <div className="flex-1 min-w-0 mr-2">
            <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500 font-bold mb-1 truncate">{title}</p>
            <p className="text-xl font-bold text-neutral-900 leading-tight mb-1">{value}</p>
            <p className="text-[10px] text-neutral-500 font-medium line-clamp-1">{helper}</p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/90 ring-1 ring-neutral-200 shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 group-hover:shadow-md">
            {icon}
          </div>
        </div>
        <div className="absolute bottom-2 right-2 opacity-0 transform translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
          <ArrowUpRight className="h-3 w-3 text-neutral-400" />
        </div>
      </CardContent>
    </Card>
  )
}

export function MomentumSnapshotCard({ ordersTotal, monthlyData }) {
  return (
    <Card className="min-w-0 border-neutral-200 bg-white">
      <CardHeader className="flex items-center justify-between border-b border-neutral-200 pb-4">
        <CardTitle className="text-lg text-neutral-900">Momentum snapshot</CardTitle>
        <span className="text-xs text-neutral-500">Summary: {ordersTotal} Orders</span>
      </CardHeader>
      <CardContent className="min-w-0 pt-4">
        <div className="h-64 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart data={(monthlyData || []).slice(-6)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12 }}
                labelStyle={{ color: "#111827" }}
                itemStyle={{ color: "#111827" }}
              />
              <Legend />
              <Bar dataKey="orders" fill="#0ea5e9" radius={[8, 8, 0, 0]} name="Orders" />
              <Bar dataKey="commission" fill="#a855f7" radius={[8, 8, 0, 0]} name="Commission" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

export function LiveSignalsCard({ activityFeed = [] }) {
  const getIcon = (type) => {
    switch (type) {
      case "order_pending":
        return <Clock className="h-4 w-4 text-amber-600" />
      case "order_delivered":
        return <CheckCircle className="h-4 w-4 text-emerald-600" />
      case "order_cancelled":
        return <XCircle className="h-4 w-4 text-red-600" />
      case "restaurant":
        return <Store className="h-4 w-4 text-blue-600" />
      case "delivery":
        return <Truck className="h-4 w-4 text-purple-600" />
      case "customer":
        return <UserCircle className="h-4 w-4 text-pink-600" />
      default:
        return <Activity className="h-4 w-4 text-neutral-600" />
    }
  }

  const getBg = (type) => {
    switch (type) {
      case "order_pending":
        return "bg-amber-50"
      case "order_delivered":
        return "bg-emerald-50"
      case "order_cancelled":
        return "bg-red-50"
      case "restaurant":
        return "bg-blue-50"
      case "delivery":
        return "bg-purple-50"
      case "customer":
        return "bg-pink-50"
      default:
        return "bg-neutral-50"
    }
  }

  return (
    <Card className="border-neutral-200 bg-white">
      <CardHeader className="border-b border-neutral-200 pb-4">
        <CardTitle className="text-lg text-neutral-900">Live signals</CardTitle>
        <p className="text-sm text-neutral-500">Ops notes and service health</p>
      </CardHeader>
      <CardContent className="space-y-3 pt-4 h-[300px] overflow-y-auto custom-scrollbar">
        {activityFeed.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-10 text-neutral-400">
            <Activity className="h-10 w-10 mb-2 opacity-20" />
            <p className="text-sm">No recent signals</p>
          </div>
        ) : (
          activityFeed.map((item, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 rounded-xl border border-neutral-200 ${getBg(item.type)} px-3 py-3 hover:border-neutral-300 transition-all`}
            >
              <div className="mt-0.5">{getIcon(item.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-neutral-900 truncate">{item.title}</p>
                  <span className="text-[10px] text-neutral-400 whitespace-nowrap">{item.time}</span>
                </div>
                <p className="text-xs text-neutral-600 line-clamp-1">{item.detail}</p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

export function OrderStatesCard({ orderStats = [], selectedPeriod = "Today" }) {
  const navigate = useNavigate()
  return (
    <Card className="border-neutral-200 bg-white">
      <CardHeader className="border-b border-neutral-200 pb-4">
        <CardTitle className="text-lg text-neutral-900">Order states</CardTitle>
        <p className="text-sm text-neutral-500">Quick glance by status</p>
      </CardHeader>
      <CardContent className="grid gap-3 pt-4">
        {orderStats.map((item) => (
          <div
            key={item.label}
            onClick={() => {
              const routes = {
                'Delivered': '/admin/food/orders/delivered',
                'Cancelled': '/admin/food/orders/canceled',
                'Refunded': '/admin/food/orders/refunded',
                'Pending': '/admin/food/orders/pending'
              }
              navigate(routes[item.label] || '/admin/food/orders/all')
            }}
            className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3 cursor-pointer hover:bg-neutral-100 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold text-neutral-900 transition-transform group-hover:scale-110"
                style={{ background: `${item.color}1A`, color: item.color }}
              >
                {item.label.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <p className="text-sm text-neutral-900 group-hover:font-medium">{item.label}</p>
                <p className="text-xs text-neutral-500">Tracked in {selectedPeriod}</p>
              </div>
            </div>
            <p className="text-sm font-semibold text-neutral-900">{item.value}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
