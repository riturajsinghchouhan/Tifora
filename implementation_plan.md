# Tiffin Service (Subscription Orders) Implementation Plan

This plan outlines the architecture and tasks required to build the Tiffin Service feature in the Tifora project. 

> [!IMPORTANT]
> **Zero Disruption Rule:** The existing standard food ordering flow, cart, and dispatch system will remain completely untouched. The Tiffin Service will be built as a parallel, independent module (`TiffinSubscription` and `TiffinDelivery`) so it does not interfere with the current live system.

## User Review Required

> [!WARNING]
> Please review these new Open Questions regarding the additional Edge Cases:
> 
> 1. **User Cancellation:** If a user cancels a 1-month plan after 10 days, do we provide a pro-rated refund to their wallet, or is cancellation non-refundable?
> 2. **Restaurant Holidays:** If there is a festival (e.g., Diwali), should the restaurant have a button to "Mark Holiday", which automatically pauses all user subscriptions for that day and extends them by 1 day?
> 3. **Delivery Boy Rejection:** Since the restaurant manually assigns 10-20 tiffins to a delivery boy, what happens if the delivery boy rejects the assignment or doesn't accept within 5 minutes? (Assume it reverts to unassigned and alerts the restaurant).
> 4. **Delivery Earnings:** Admin will handle delivery boy payouts separately for Tiffins. Should we log a fixed "Tiffin Earning Amount" per drop, or will the Admin just calculate it manually later?

---

## Proposed Changes

### 1. Database Schema (Backend)

We will create isolated collections to ensure the current `FoodOrder` flow is untouched.

#### [NEW] `tiffinPlan.model.js` (Restaurant side)
- `restaurantId`, `name`, `durationDays` (7, 30), `mealType` (Morning, Evening, Both), `price`, `contents`.

#### [NEW] `tiffinSubscription.model.js` (User side)
- `userId`, `restaurantId`, `planId`
- `startDate`, `endDate`
- `deliveryAddress`
- `status` (active, expired, cancelled, paused)
- `paymentId` (Full payment upfront)

#### [NEW] `tiffinDelivery.model.js` (Daily Tasks)
- `subscriptionId`, `restaurantId`, `userId`, `deliveryAddress`
- `type` (Morning, Evening), `date`
- `status` (pending, assigned, out_for_delivery, delivered, failed)
- `assignedTo` (Delivery Partner ID)
- `verification` (OTP or Picture URL)
- `deliveryEarning` (Amount for delivery boy, managed by Admin)

### 2. Backend APIs & Logic

- **Restaurant APIs:** CRUD for Plans, Daily Prep Dashboard (count of morning/evening tiffins), Manual Bulk Assignment to Delivery Boy.
- **User APIs:** Browse Plans, **Upfront Payment Checkout** (using Razorpay/Wallet), My Subscriptions, Pause/Resume Subscription.
- **Delivery APIs:** Fetch assigned Tiffins (sorted by proximity), Update Delivery State (OTP/Picture).
- **Admin APIs:** Dashboard to view Tiffin deliveries and calculate/manage separate payouts for delivery boys.
- **Cron Job:** `tiffinScheduler.js` runs at midnight to generate `tiffinDelivery` records for the day.

### 3. Frontend App Updates (Isolated UI)

- **User App:** Add a distinct "Tiffin Services" tab/button on the home screen. Dedicated plan selection and upfront payment checkout flow.
- **Restaurant Dashboard:** New "Tiffins" tab. Prep dashboard showing daily counts, and a manual assignment panel grouped by zone.
- **Delivery App:** New "Tiffin Route" tab. Shows a proximity-sorted list. Click to open Map -> Call User -> Verify OTP or Upload Picture.
- **Admin Panel:** Add a section to manage and view Tiffin earnings for delivery boys.

---

## Edge Cases & Solutions

> [!CAUTION]
> 1. **User Wants to Pause Subscription (e.g., out of town):** 
>    - **Solution:** Add a "Pause Plan" feature. The midnight cron job skips generating deliveries for paused users, and extends the `endDate`.
> 
> 2. **User is Unreachable:** 
>    - **Solution:** Delivery boy calls. If no answer, they leave the tiffin at the door, upload a picture as proof, and mark as "delivered (unattended)".
> 
> 3. **Delivery Boy Vehicle Breaks Down:**
>    - **Solution:** Restaurant can "revoke" assigned tiffins from one delivery boy and bulk re-assign them to another.
> 
> 4. **User Changes Delivery Address Mid-Subscription:**
>    - **Solution:** Only allow new addresses within the same restaurant's zone. Otherwise, block the change.
> 
> 5. **Restaurant Runs Out of Food/Emergency Close:**
>    - **Solution:** Restaurant cancels a specific day's batch. Users are notified, and their subscription is extended by 1 day.
>
> 6. **Plan Modification (e.g., Veg to Non-Veg):**
>    - **Solution:** Do not allow mid-plan changes. User must cancel the current plan and purchase a new one, or wait for expiry. (Simplifies logic).
>
> 7. **Delayed Delivery (SLA Breach):**
>    - **Solution:** If a morning tiffin is not delivered by 1:00 PM, flag it red in the Admin and Restaurant dashboards for immediate escalation.

---

## Verification Plan
1. **Regression Testing:** Verify normal food ordering and auto-dispatch still works perfectly.
2. **Subscription Flow:** Purchase a plan upfront, verify subscription creation.
3. **Daily Generation:** Manually trigger the cron job and verify daily deliveries are created.
4. **Assignment & Delivery:** Restaurant manually assigns -> Delivery boy sees proximity-sorted list -> Completes delivery with OTP/Picture.
