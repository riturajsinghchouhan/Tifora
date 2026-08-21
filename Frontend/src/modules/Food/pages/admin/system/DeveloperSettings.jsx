import { useState } from "react";
import { adminAPI } from "../../../../../services/api/index.js";

const RESET_CONFIRMATION = "DELETE ALL PAYMENT DATA";
const CLEAR_ORDERS_CONFIRMATION = "DELETE ALL ORDERS";

export default function DeveloperSettings() {
  const [paymentConfirmation, setPaymentConfirmation] = useState("");
  const [orderConfirmation, setOrderConfirmation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [resetSummary, setResetSummary] = useState(null);
  const [summaryTitle, setSummaryTitle] = useState("");

  const cards = [
    {
      title: "Environment Controls",
      description:
        "Use this area for runtime env overrides, secret rotation notes, and deployment-safe config toggles.",
    },
    {
      title: "Debug Tooling",
      description:
        "Keep internal diagnostics, queue checks, webhook replay helpers, and one-off maintenance links here.",
    },
    {
      title: "Release Safety",
      description:
        "Track migrations, feature flags, repair scripts, and verification steps before production changes go live.",
    },
  ];

  const isPaymentConfirmationValid =
    paymentConfirmation.trim() === RESET_CONFIRMATION;
  const isOrderConfirmationValid =
    orderConfirmation.trim() === CLEAR_ORDERS_CONFIRMATION;

  const handleResetPaymentData = async () => {
    if (!isPaymentConfirmationValid || isSubmitting) return;

    const shouldContinue = window.confirm(
      "This will clear only order-linked payment and finance data. Commission settings and fee settings will stay untouched. Continue?",
    );
    if (!shouldContinue) return;

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await adminAPI.resetPaymentFinanceData(paymentConfirmation);
      const data = response?.data?.data ?? null;

      setResetSummary(data);
      setSummaryTitle("Order-Linked Finance Reset Summary");
      setSuccessMessage(
        response?.data?.message ||
          "Order-linked finance data reset completed successfully.",
      );
      setPaymentConfirmation("");
    } catch (error) {
      setErrorMessage(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to reset payment data right now.",
      );
      setResetSummary(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearAllOrders = async () => {
    if (!isOrderConfirmationValid || isSubmitting) return;

    const shouldContinue = window.confirm(
      "This will delete all orders and remove linked order payment traces. Continue?",
    );
    if (!shouldContinue) return;

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await adminAPI.clearAllOrdersData(orderConfirmation);
      const data = response?.data?.data ?? null;

      setResetSummary(data);
      setSummaryTitle("Order Clear Summary");
      setSuccessMessage(
        response?.data?.message || "All orders cleared successfully.",
      );
      setOrderConfirmation("");
    } catch (error) {
      setErrorMessage(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to clear orders right now.",
      );
      setResetSummary(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderSummaryGroup = (title, values = {}) => {
    const entries = Object.entries(values || {});
    if (!entries.length) return null;

    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-700">
          {title}
        </h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {entries.map(([key, value]) => (
            <div
              key={key}
              className="rounded-xl border border-white bg-white px-4 py-3 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {key.replace(/([A-Z])/g, " $1")}
              </p>
              <p className="mt-2 text-2xl font-black text-slate-950">
                {Number(value || 0)}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSummaryList = (title, items = [], tone = "slate") => {
    if (!Array.isArray(items) || !items.length) return null;

    const toneClasses =
      tone === "rose"
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : "border-slate-200 bg-white text-slate-700";

    return (
      <div className={`rounded-2xl border p-5 shadow-sm ${toneClasses}`}>
        <h3 className="text-sm font-bold uppercase tracking-[0.2em]">
          {title}
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              key={item}
              className="rounded-full border border-current/15 bg-white/70 px-3 py-1 text-xs font-semibold"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-8 text-white shadow-xl">
        <div className="max-w-3xl">
          <p className="mb-3 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-200">
            Internal Console
          </p>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Developer Settings
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">
            Admin-only workspace for developer-facing configuration, diagnostics,
            and rollout safety tools.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.title}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h2 className="text-lg font-bold text-slate-900">{card.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {card.description}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-3xl border border-rose-200 bg-gradient-to-br from-rose-50 via-white to-orange-50 p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="inline-flex rounded-full border border-rose-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-rose-600">
              Danger Zone
            </p>
            <h2 className="mt-4 text-2xl font-black text-slate-950">
              Developer reset tools
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Use these only when you want to wipe order-generated financial
              data or completely reset the order system back to a fresh state.
            </p>
          </div>

          <div className="w-full max-w-2xl space-y-4">
            <div className="rounded-2xl border border-rose-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-black text-slate-950">
                Clear order-linked finance data
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Clears only finance data generated from food orders: payment
                records, refunds, payment food transactions, gateway events,
                order-linked settlement rows, and derived admin, restaurant,
                and delivery wallet balances. Commission settings and fee
                settings stay exactly as they are.
              </p>
              <p className="mt-3 text-sm font-semibold text-rose-700">
                Type <span className="font-black">{RESET_CONFIRMATION}</span>
              </p>
              <input
                id="payment-reset-confirmation"
                type="text"
                value={paymentConfirmation}
                onChange={(event) => setPaymentConfirmation(event.target.value)}
                placeholder={RESET_CONFIRMATION}
                className="mt-3 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-rose-400 focus:bg-white"
              />
              <button
                type="button"
                onClick={handleResetPaymentData}
                disabled={!isPaymentConfirmationValid || isSubmitting}
                className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-rose-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
              >
                {isSubmitting
                  ? "Processing reset..."
                  : "Clear Order-Linked Finance Data"}
              </button>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-black text-slate-950">
                Clear all orders
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Deletes all orders and removes linked order payment traces so
                the next order starts from a clean default state.
              </p>
              <p className="mt-3 text-sm font-semibold text-amber-700">
                Type <span className="font-black">{CLEAR_ORDERS_CONFIRMATION}</span>
              </p>
              <input
                id="order-reset-confirmation"
                type="text"
                value={orderConfirmation}
                onChange={(event) => setOrderConfirmation(event.target.value)}
                placeholder={CLEAR_ORDERS_CONFIRMATION}
                className="mt-3 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-amber-400 focus:bg-white"
              />
              <button
                type="button"
                onClick={handleClearAllOrders}
                disabled={!isOrderConfirmationValid || isSubmitting}
                className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-amber-500 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-amber-200"
              >
                {isSubmitting ? "Processing reset..." : "Clear All Orders"}
              </button>
            </div>
          </div>
        </div>

        {errorMessage ? (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {successMessage}
          </div>
        ) : null}
      </div>

      {resetSummary ? (
        <div className="mt-6 space-y-4">
          {summaryTitle ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <h3 className="text-lg font-black text-slate-950">
                {summaryTitle}
              </h3>
            </div>
          ) : null}
          {renderSummaryGroup("Deleted", resetSummary.deleted)}
          {renderSummaryGroup("Reset", resetSummary.reset)}
          {renderSummaryList("This Action Cleared", resetSummary.clears, "rose")}

          {Array.isArray(resetSummary.untouched) && resetSummary.untouched.length ? (
            renderSummaryList("Left Untouched", resetSummary.untouched)
          ) : null}

          {resetSummary.nextOrderState ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-700">
                Next Order State
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {resetSummary.nextOrderState}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
