import { useEffect, useMemo, useState } from "react";
import { Clock3, Loader2, Search, Store, Truck } from "lucide-react";
import { adminAPI } from "@food/api";

const STATUS_LABELS = {
  REGISTERED: "Registered",
  IN_PROGRESS: "In progress",
  SUBMITTED: "Submitted",
};

const STATUS_STYLES = {
  REGISTERED: "bg-amber-100 text-amber-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  SUBMITTED: "bg-emerald-100 text-emerald-800",
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
};

export default function OnboardingRegistrations({ userType }) {
  const isRestaurant = userType === "RESTAURANT";
  const title = isRestaurant ? "Restaurant Registrations" : "Delivery Partner Registrations";
  const Icon = isRestaurant ? Store : Truck;
  const [registrations, setRegistrations] = useState([]);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await adminAPI.getOnboardingRegistrations({ userType, status });
        if (active) setRegistrations(response?.data?.data?.registrations || []);
      } catch (requestError) {
        if (active) setError(requestError?.response?.data?.message || "Unable to load registrations.");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [userType, status]);

  const visibleRegistrations = useMemo(() => {
    const query = search.replace(/\D/g, "");
    if (!query) return registrations;
    return registrations.filter((registration) => registration.phone?.includes(query));
  }, [registrations, search]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-6">
      <div className="mx-auto max-w-7xl rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-6 flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            <p className="mt-1 text-sm text-slate-600">
              OTP-verified users, including profiles that have not completed onboarding.
            </p>
          </div>
        </div>

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {["", "REGISTERED", "SUBMITTED"].map((value) => (
              <button
                key={value || "ALL"}
                type="button"
                onClick={() => setStatus(value)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  status === value ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {value ? STATUS_LABELS[value] : "All"}
              </button>
            ))}
          </div>
          <label className="relative block w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              inputMode="numeric"
              placeholder="Search mobile number"
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
        </div>

        {loading ? (
          <div className="flex min-h-48 items-center justify-center gap-2 text-slate-600"><Loader2 className="h-5 w-5 animate-spin" /> Loading registrations…</div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : visibleRegistrations.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 py-12 text-center text-sm text-slate-500">No registrations found.</div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr><th className="px-4 py-3">Mobile number</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Pending step</th><th className="px-4 py-3">Registered at</th><th className="px-4 py-3">Last active</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                {visibleRegistrations.map((registration) => (
                  <tr key={registration._id}>
                    <td className="px-4 py-3 font-medium">{registration.phone}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[registration.onboardingStatus] || "bg-slate-100 text-slate-700"}`}>{STATUS_LABELS[registration.onboardingStatus] || registration.onboardingStatus}</span></td>
                    <td className="px-4 py-3">{registration.pendingStep}</td>
                    <td className="px-4 py-3">{formatDate(registration.createdAt)}</td>
                    <td className="px-4 py-3"><span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5 text-slate-400" />{formatDate(registration.lastActiveAt)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
