# Multi Order Flow - Implementation Plan

## Overview
This feature introduces a "Multi-Order" flow designed to optimize deliveries when multiple orders originate from the same restaurant. An admin can group these orders and assign them to a single delivery boy. The delivery boy can then pick up all orders in the batch using a **Single OTP** at the restaurant, and subsequently deliver them one by one using the normal delivery navigation flow.

## 1. Database & Schema Changes
*   **Order Grouping:** Introduce a way to link grouped orders together. This could be adding a `batchId` (UUID or unique string) or `multiGroupId` field to the Order schema. When an admin assigns multiple orders together, they all get the same `batchId`.
*   **Status Management:** Ensure the state machine for an order can handle being updated in bulk (e.g., changing status of 4 orders from 'Assigned' to 'Picked Up' simultaneously).

## 2. Backend APIs
### Admin APIs
*   **`GET /admin/orders/restaurant-wise`**: Fetch pending/accepted orders grouped by the restaurant ID. This response should highlight delivery addresses (coordinates/text) for easy grouping by the admin.
*   **`GET /admin/delivery-boys/active`**: Fetch a list of currently online and available delivery boys.
*   **`POST /admin/orders/assign-multi`**: Endpoint that takes an array of `orderIds` and a `deliveryBoyId`. It will:
    *   Validate that all orders are from the same restaurant (optional, based on final business logic, but highly recommended for single OTP).
    *   Generate a `batchId`.
    *   Assign the delivery boy to all these orders and save the `batchId` on them.
    *   Send a single notification to the delivery boy about the multi-order batch.

### Delivery Boy APIs
*   **`GET /delivery/multi-orders`**: Fetch all active "grouped" orders assigned to the delivery boy, grouped by `batchId` or restaurant.
*   **`POST /delivery/multi-orders/verify-pickup`**: Endpoint to verify the single OTP at the restaurant. It accepts a `batchId` (or array of orderIds) and the `otp`. Upon successful validation, it updates the status of *all* orders in that batch to 'Picked Up' (or equivalent status).

## 3. Admin Panel UI (Frontend)
*   **New Page (`/multi-order-management`)**: 
    *   **Main View:** A list/grid of orders, visually grouped by Restaurant Name. Each order card should prominently display the Delivery Address/Area.
    *   **Selection Logic:** Checkboxes next to each order to select multiple.
    *   **Sidebar/Panel:** A sticky sidebar showing online delivery boys.
    *   **Action:** A button "Assign Selected to Delivery Boy". When clicked with orders selected and a delivery boy chosen, it triggers the `assign-multi` API.

## 4. Delivery Boy App (Frontend)
*   **New Section/Tab (`Multi Orders`)**:
    *   Displays a list of assigned batches.
    *   **Expandable Cards (Dropdown):** Clicking a batch reveals a slide-down/accordion view showing individual order details (User info, Address, Order Items) identical to the normal order popup.
*   **Single OTP Action**:
    *   A prominent button for the batch: "Verify Restaurant Pickup".
    *   Opens an OTP input modal. On success, the UI updates to show the batch is picked up.
*   **Integration with Normal Flow**:
    *   Once the batch is verified (picked up), each individual order in the expanded list will show a **"Go to Navigate"** button.
    *   Clicking this button must trigger a route change or state update that pushes the delivery boy into the **existing Normal Order Delivery Flow**.
    *   **Crucial Condition:** The app must pass a flag or state (e.g., `isMultiOrderPickupDone: true`) to the normal flow component so that it *skips* the "Navigate to Restaurant" and "Verify Restaurant OTP" steps, and jumps directly to "Navigate to Customer" and "Deliver Order".

## 5. Execution Steps (Checklist)
- [ ] Define and implement Database Schema changes (`batchId`).
- [ ] Develop Admin Backend APIs (Fetch grouped orders, Assign batch).
- [ ] Develop Delivery Backend APIs (Fetch batch, Verify single OTP).
- [ ] Build Admin Panel "Multi Order Management" UI.
- [ ] Build Delivery App "Multi Orders" screen and dropdown UI.
- [ ] Implement Delivery App Single OTP Verification UI & integration.
- [ ] Connect Delivery App Multi-Order screen to Normal Order Flow (skipping pickup phase).
- [ ] End-to-End Testing of the flow.
