import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { restaurantAPI } from "@food/api";

const debugError = (...args) => {};

export default function ResendNotificationButton({ orderId, mongoId, onSuccess, className }) {
  const [loading, setLoading] = useState(false);

  const handleResend = async (e) => {
    // Check if e exists before accessing stopPropagation
    if (e && typeof e.stopPropagation === "function") {
      e.stopPropagation(); // Prevent card click
    }
    
    if (loading) return;

    try {
      setLoading(true);
      const id = mongoId || orderId;
      const response = await restaurantAPI.resendDeliveryNotification(id);

      if (response.data?.success) {
        const notifiedCount = Number(response.data.data?.notifiedCount || 0);
        const shortlistedCount = Number(response.data.data?.shortlistedCount || 0);
        const connectedSocketCount = response.data.data?.connectedSocketCount;
        const searchRadiusKm = response.data.data?.searchRadiusKm;
        const stats = response.data.data?.resendSearchStats;
        const radiusLabel = searchRadiusKm ? ` within ${searchRadiusKm} km` : '';
        const busyLabel = stats?.busy ? ` (${stats.busy} busy skipped)` : '';
        if (notifiedCount > 0) {
          toast.success(
            `Notification sent to ${notifiedCount} delivery partner${notifiedCount === 1 ? '' : 's'}${radiusLabel}${busyLabel}${connectedSocketCount != null ? ` (live sockets: ${connectedSocketCount})` : ''}`,
          );
        } else {
          toast.warning(
            shortlistedCount > 0
              ? `No delivery partners received the alert${radiusLabel}. Shortlisted: ${shortlistedCount}${busyLabel}${connectedSocketCount != null ? `, live sockets: ${connectedSocketCount}` : ''}.`
              : `No free online delivery partners found in this zone${radiusLabel}${stats?.online ? ` (${stats.online} online, ${stats.busy || 0} busy)` : ''}.`,
          );
        }
        // Refresh orders if onSuccess callback is provided
        if (onSuccess) {
           onSuccess();
        }
      } else {
        toast.error(response.data?.message || "Failed to send notification");
      }
    } catch (error) {
      debugError("Error resending notification:", error);
      toast.error(
        error.response?.data?.message ||
          "Failed to send notification. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleResend}
      disabled={loading}
      className={className || "inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-bold bg-white text-red-600 border border-red-500 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors h-10"}
      title="Resend notification to delivery partners">
      {loading ? (
        <>
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Sending...</span>
        </>
      ) : (
        <>
          <Send className="w-4 h-4" />
          <span className="uppercase tracking-wider">Resend</span>
        </>
      )}
    </button>
  );
}
