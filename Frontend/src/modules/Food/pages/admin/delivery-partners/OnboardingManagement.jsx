import { useEffect, useState } from "react"
import { CreditCard, IndianRupee, Loader2, Save } from "lucide-react"
import { adminAPI } from "@food/api"
import { Button } from "@food/components/ui/button"
import { toast } from "sonner"

const getInitialState = () => ({
  deliveryOnboardingFeeEnabled: false,
  deliveryOnboardingFeeAmount: "",
})

export default function OnboardingManagement() {
  const [settings, setSettings] = useState(getInitialState())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true)
        const response = await adminAPI.getFeeSettings()
        const feeSettings = response?.data?.data?.feeSettings || null

        if (feeSettings) {
          setSettings({
            deliveryOnboardingFeeEnabled: feeSettings.deliveryOnboardingFeeEnabled === true,
            deliveryOnboardingFeeAmount:
              feeSettings.deliveryOnboardingFeeAmount != null
                ? String(feeSettings.deliveryOnboardingFeeAmount)
                : "",
          })
        } else {
          setSettings(getInitialState())
        }
      } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to load onboarding settings")
      } finally {
        setLoading(false)
      }
    }

    fetchSettings()
  }, [])

  const handleSave = async () => {
    const amount = Number(settings.deliveryOnboardingFeeAmount)

    if (settings.deliveryOnboardingFeeEnabled) {
      if (!Number.isFinite(amount) || amount <= 0) {
        toast.error("Please enter a valid onboarding fee amount")
        return
      }
    }

    try {
      setSaving(true)
      const response = await adminAPI.createOrUpdateFeeSettings({
        deliveryOnboardingFeeEnabled: settings.deliveryOnboardingFeeEnabled,
        deliveryOnboardingFeeAmount: settings.deliveryOnboardingFeeEnabled
          ? amount
          : 0,
        isActive: true,
      })

      const saved = response?.data?.data?.feeSettings
      setSettings({
        deliveryOnboardingFeeEnabled: saved?.deliveryOnboardingFeeEnabled === true,
        deliveryOnboardingFeeAmount:
          saved?.deliveryOnboardingFeeAmount != null
            ? String(saved.deliveryOnboardingFeeAmount)
            : "",
      })
      toast.success("Delivery onboarding settings saved successfully")
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save onboarding settings")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Onboarding Management</h1>
          </div>
          <p className="text-sm text-slate-600">
            Control whether new delivery partners must pay a one-time onboarding fee before their join request is submitted.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Delivery Onboarding Fee</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    When enabled, delivery partner signup will require payment before the request moves to admin approval.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setSettings((prev) => ({
                      ...prev,
                      deliveryOnboardingFeeEnabled: !prev.deliveryOnboardingFeeEnabled,
                    }))
                  }
                  className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                    settings.deliveryOnboardingFeeEnabled ? "bg-emerald-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                      settings.deliveryOnboardingFeeEnabled ? "translate-x-8" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Onboarding Fee Amount
                  </label>
                  <div className="relative">
                    <IndianRupee className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={settings.deliveryOnboardingFeeAmount}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          deliveryOnboardingFeeAmount: e.target.value,
                        }))
                      }
                      disabled={!settings.deliveryOnboardingFeeEnabled}
                      placeholder="Enter amount"
                      className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    This amount will be charged once during new delivery partner signup.
                  </p>
                </div>

                <div className="rounded-xl border border-dashed border-slate-300 p-4 bg-slate-50">
                  <p className="text-sm font-semibold text-slate-700 mb-2">Current Behavior</p>
                  <p className="text-sm text-slate-600 leading-6">
                    {settings.deliveryOnboardingFeeEnabled
                      ? `New delivery partners must pay ₹${Number(settings.deliveryOnboardingFeeAmount || 0).toLocaleString("en-IN")} before their onboarding request is submitted.`
                      : "Delivery partner onboarding fee is disabled. New join requests will be submitted without payment."}
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Settings
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
