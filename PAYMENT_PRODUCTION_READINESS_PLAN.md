# Tifora Payment and Transaction Production Readiness Plan

## Current Verdict

Tifora is not production-ready yet for high-confidence finance.

The architecture direction is good, especially around `FoodTransaction`, queue-based processing, and Razorpay signature verification, but the current implementation still has financial integrity gaps that can cause state drift, duplicate credits, incomplete refunds, and broken settlement behavior under retries or partial failures.

## Goal

Make the payment and transaction system safe enough for production by enforcing:

- one financial source of truth
- replay-safe webhook handling
- atomic payment-critical writes
- unified refund orchestration
- reliable wallet and settlement accounting
- reconciliation and repair tooling

## Scope

This plan covers:

- food order payments
- COD to QR collection flows
- wallet debits and refunds
- Razorpay capture and refund webhooks
- rider and restaurant settlement state
- core `Payment`, `Refund`, `Transaction`, and `FoodTransaction` usage

## Main Problems Found In Tifora

### 1. Multiple financial sources of truth

Financial state is currently spread across multiple places:

- `FoodOrder.payment`
- `FoodTransaction.payment`
- core `Payment`
- core `Refund`
- core wallet transaction arrays
- core universal `Transaction`

This makes reconciliation and audit difficult and increases the chance of drift.

### 2. Payment-critical flows are not atomic

Several flows perform multiple independent writes without a Mongo session:

- order creation
- wallet deduction
- transaction creation
- payment verification
- cancellation
- refund processing
- webhook capture/refund sync
- settlement-related updates

If one step fails midway, the system can save partial state.

### 3. Webhook idempotency is not durable

Webhook signature verification exists, but there is no durable processed-event store using provider event IDs. Replayed events can still create unsafe or inconsistent behavior.

### 4. Queue wiring is incomplete

Order lifecycle events are being enqueued on the order queue, but the payment processor path does not appear to be fully wired into the live flow for events like:

- `delivery_completed`
- `order_cancelled`
- `payment_verified`

This creates risk that payout or refund processing logic exists but is not actually running in production.

### 5. Wallet mutation paths are inconsistent

Some flows use the newer atomic universal transaction ledger, while other flows still directly mutate wallet balances and embedded transaction arrays.

This breaks the intended rule that wallet balance changes should always go through one atomic path.

### 6. Refund logic is split across multiple places

Refund logic is currently spread across:

- user cancel flow
- restaurant cancel flow
- webhook refund sync
- core refund service
- wallet refund helpers

That makes refund behavior harder to reason about and increases mismatch risk.

### 7. Money values still use JavaScript `Number`

The system still stores money using floating-point-friendly types. This is acceptable for MVP behavior, but not ideal for long-term finance safety at scale.

### 8. A project-specific wallet refund double-credit risk exists

The current refund path appears to credit the same wallet through both:

- the new wallet transaction path
- the legacy wallet compatibility path

This must be treated as a P0 bug.

### 9. Existing data may already contain inconsistencies

Even after write-path hardening, production safety still requires:

- backfill
- reconciliation
- drift detection
- targeted repair scripts

## Target Architecture

### Financial source of truth

Use `FoodTransaction` as the order-level financial source of truth for food commerce.

`FoodTransaction` should own:

- payment method snapshot
- payment status
- amount breakdown
- refund status summary
- settlement flags
- payment lifecycle history
- immutable order snapshot captured at finance creation time

### Operational source of truth

Keep `FoodOrder` as the operational order document used for:

- order lifecycle
- delivery flow
- restaurant/user UI reads
- compatibility snapshot fields

`FoodOrder.payment` should remain a mirrored snapshot only, not the authoritative finance record.

### Core model ownership

Define and enforce exact ownership:

- `FoodTransaction`
  - authoritative order-finance state for food orders
- `Payment`
  - payment-attempt record and gateway interaction record
- `Refund`
  - refund request and refund processing record
- `Transaction`
  - universal money movement ledger for wallet/entity balance changes
- wallet documents
  - balance cache plus display-oriented history only

This ownership map must be documented and enforced in code.

## Mandatory State Rules

### Order snapshot rule

Add an immutable `orderSnapshot` inside `FoodTransaction`.

Purpose:

- preserve the exact order state used for financial calculation
- support audit and dispute handling
- make refund and reconciliation logic safer even if the live order changes later

Recommended snapshot contents:

- order display ID
- user ID
- restaurant ID
- delivery partner ID if assigned at that point
- ordered items summary
- delivery address summary
- pricing breakdown
- payment method at creation time
- tax, commission, fee, and discount breakdown
- order status at snapshot time
- created timestamp

Recommended guardrails:

- treat `orderSnapshot` as append-only or immutable after creation
- do not use it as live operational state
- if needed, store a `snapshotVersion` and `snapshotHash` for migration/audit support

### Allowed payment transitions

At minimum:

- `pending -> authorized -> captured -> refunded`
- `pending -> failed`
- `authorized -> failed`

For QR and mirrored UI states, define normalized equivalents but map them into a single authoritative transaction state machine.

### Write ownership rules

Define exactly which service may write each field:

- only finance orchestration may write `FoodTransaction.status`
- only finance orchestration may write `FoodTransaction.payment.*`
- only finance orchestration may mirror `FoodOrder.payment.*`
- only wallet ledger services may change wallet balances
- only refund orchestration may mark refund lifecycle states

## Implementation Plan

## Phase 0: Immediate Safety Fixes

These should be fixed before broader refactoring.

### P0.1 Fix wallet refund double-credit bug

Ensure a refund credits the user wallet exactly once.

Actions:

- remove duplicate credit behavior between new and legacy paths
- keep legacy compatibility write as history-only if still needed
- add a test proving one refund results in one balance increase

### P0.2 Fix payment queue wiring

Ensure the live system actually executes payment-related async flows.

Actions:

- verify where `delivery_completed`, `order_cancelled`, and `payment_verified` events go
- route payment events to the payment queue or a unified finance processor explicitly
- remove dead or misleading queue flows
- add observability for job enqueue, start, success, retry, and failure

### P0.3 Freeze direct wallet writes

Immediately stop introducing new direct wallet mutations outside the universal ledger path.

Actions:

- mark legacy direct-write helpers as deprecated
- prevent new code from calling them
- identify all existing direct mutation call sites

## Phase 1: Finance Model Lock

Lock the architecture before further fixes.

Actions:

- keep `FoodOrder.payment` only as a mirrored snapshot for UI compatibility
- make `FoodTransaction.payment`, `FoodTransaction.amounts`, `FoodTransaction.status`, and settlement flags authoritative
- add immutable `FoodTransaction.orderSnapshot` as the audit snapshot of the order at finance creation time
- define exact allowed status transitions
- define exact model/service ownership for every finance field
- document this in code comments and an internal architecture note

Deliverable:

- one written ownership map
- one normalized transaction state machine
- code no longer treating both order and transaction as equal truth

## Phase 2: Unified Finance Service

Create one orchestrator module for all payment-critical food finance actions.

This service should own:

- initial transaction creation
- payment capture sync
- payment failure sync
- refund initiation sync
- refund confirmation sync
- COD QR state sync
- rider settlement flags
- restaurant settlement flags
- payment mirror updates to `FoodOrder`
- creation of immutable finance-time `orderSnapshot`

Rules:

- no controller or order service should update `FoodOrder.payment` and `FoodTransaction` separately
- all such changes must go through the unified finance service

Suggested responsibilities:

- validate allowed state transition
- apply atomic DB transaction
- write authoritative finance doc
- write mirrored order snapshot
- write payment/refund attempt doc when relevant
- emit domain event after commit

## Phase 3: Idempotency Layer

### Gateway event idempotency

Add a dedicated collection for processed gateway events.

Store:

- provider
- provider event ID
- event type
- order reference
- transaction reference
- payment reference
- payload hash
- first seen time
- processed time
- processing result

Rules:

- reject duplicate event processing safely
- return success for already-processed duplicates
- log payload mismatches for same event ID

### Internal idempotency

Add idempotency keys for:

- initial transaction creation
- COD QR creation
- refund initiation
- payment capture application
- subscription meal finance creation if applicable later
- settlement marking

## Phase 4: Mongo Transaction Boundaries

Wrap all payment-critical multi-write flows in Mongo sessions.

### Must be atomic

- order creation + wallet debit if wallet payment + initial `FoodTransaction`
- order creation + initial `FoodTransaction` + mirrored `FoodOrder.payment`
- payment verification + transaction capture sync + order snapshot sync
- cancellation + refund state update + transaction update + order mirror update
- webhook capture/refund updates across order + transaction + payment/refund docs
- settlement operations
- repair/backfill operations that rewrite financial truth

If one step fails, the whole unit must roll back.

## Phase 5: Refund Hardening

Unify all refund entry points into one orchestration flow.

### Refund entry points to unify

- user cancel
- restaurant cancel
- admin/manual refund
- webhook refund confirmation
- wallet-origin refund

### Refund states to standardize

- `initiated`
- `pending`
- `processed`
- `failed`

These states should be consistently represented across:

- `Refund`
- `FoodTransaction`
- mirrored `FoodOrder.payment.refund`

### Refund rules

- a refund should not credit wallet twice
- a refund should not be re-initiated if already processed
- wallet refund and source refund paths must be explicit
- gateway-confirmed refunds must sync back to the authoritative finance doc

## Phase 6: Wallet and Ledger Standardization

Make the universal ledger the only allowed money-movement path.

Actions:

- route wallet credits/debits through atomic `Transaction` creation plus balance update
- stop directly mutating wallet balance in business flows
- keep embedded wallet history only if strictly needed for frontend compatibility
- if embedded history is retained, populate it from the authoritative ledger or through one controlled adapter

## Phase 7: Money Standardization

Introduce one money strategy across the codebase.

### Short-term safe step

Create shared money helpers for:

- parse
- normalize
- round to paise
- compare
- add
- subtract
- multiply percentage safely

Replace scattered ad-hoc rounding with these helpers.

### Preferred long-term state

Store financial values as integer paise for finance-critical fields.

If full migration is too large immediately:

- centralize rounding first
- migrate the core finance models second
- migrate dependent reporting code third

## Phase 8: Webhook Hardening

Improve webhook handling beyond signature verification.

Actions:

- persist webhook event receipt before applying business effects
- verify signature using raw body
- process inside an atomic DB transaction
- use durable idempotency checks
- log provider event ID, order ID, payment ID, and resulting transaction state
- return `200` only after durable success or safe duplicate detection

Also ensure:

- capture webhook updates `FoodTransaction`
- refund webhook updates `FoodTransaction`
- mirrored `FoodOrder.payment` stays in sync only through the finance service

## Phase 9: Reconciliation and Repair Tooling

Add admin-safe scripts and jobs to detect and fix drift.

### Detect at minimum

- paid order without `FoodTransaction`
- `FoodTransaction` without order
- order says refunded but transaction not refunded
- transaction says refunded but refund doc missing
- gateway paid but DB still pending
- wallet debit happened but order/transaction missing
- refund wallet credited twice
- restaurant settlement mismatch
- rider settlement mismatch
- payment attempt exists but was never attached properly

### Repair tooling

Add targeted scripts for:

- missing transaction backfill
- mirrored order snapshot rebuild
- duplicate refund credit detection
- orphan payment/refund detection
- status repair after known partial-failure patterns

## Phase 10: Tests

Add high-signal automated tests.

### Core scenarios

- normal Razorpay capture
- duplicate `payment.captured` webhook
- payment failure webhook
- refund processed webhook
- user cancel for online paid order
- restaurant cancel for online paid order
- wallet-paid order cancellation
- COD QR create and poll
- duplicate transaction creation attempt
- rollback on mid-flow failure
- wallet refund credits exactly once
- repeated refund event does not duplicate state or balance movement
- settlement state update does not bypass ledger rules

### Test levels

- unit tests for state transitions and money helpers
- integration tests for Mongo session rollbacks
- queue/worker tests for finance event processing
- regression tests for legacy compatibility adapters

## Phase 11: Rollout and Backfill

Do not switch to strict enforcement in one step.

### Rollout order

1. fix P0 bugs
2. lock finance model
3. build unified finance service
4. add idempotency layer
5. add transaction boundaries
6. unify refund flow
7. fix queue wiring and observability
8. add reconciliation tools
9. run backfill and repair scripts
10. enable stricter source-of-truth enforcement
11. migrate money representation if approved

### Backfill checklist

- backfill missing `FoodTransaction` rows
- reconcile existing order and transaction mismatches
- mark inconsistent legacy rows
- repair double-credit wallet refunds if found
- verify settlement flags against payout records

## Acceptance Criteria

The system can be considered production-ready only when all of the following are true:

- `FoodTransaction` is the enforced order-finance source of truth
- `FoodOrder.payment` is only a mirror and never written independently
- webhook events are durably idempotent
- payment-critical flows use Mongo sessions
- wallet balances move only through the universal ledger path
- refund processing is unified and duplicate-safe
- queue wiring is verified end-to-end
- reconciliation jobs exist and are runnable by admins
- high-signal finance tests pass
- legacy data has been reconciled or explicitly marked

## Must Fix Before Production

- single financial source of truth
- immutable order snapshot in finance record
- webhook idempotency with durable event storage
- Mongo transactions for payment-critical writes
- unified refund flow
- queue wiring verification and repair
- wallet double-credit bug fix
- removal of unsafe direct wallet mutations
- reconciliation tooling

## Can Come Slightly After

- full paise/integer money migration
- richer settlement dashboards
- detailed audit exports
- deeper admin finance analytics

## Recommended Execution Order

1. P0 bug fixes
2. finance model lock
3. unified finance service
4. idempotency layer
5. Mongo transaction boundaries
6. refund hardening
7. wallet/ledger standardization
8. queue wiring validation
9. reconciliation and repair tooling
10. test coverage
11. backfill and phased rollout
12. money storage migration if needed

## Suggested File/Module Impact Areas

The likely implementation impact will include:

- `Backend/src/modules/food/orders/services/order.service.js`
- `Backend/src/modules/food/orders/services/order-payment.service.js`
- `Backend/src/modules/food/orders/services/foodTransaction.service.js`
- `Backend/src/modules/food/orders/services/order-delivery.service.js`
- `Backend/src/core/payments/payment.service.js`
- `Backend/src/core/payments/refund.service.js`
- `Backend/src/core/payments/transaction.service.js`
- `Backend/src/core/payments/wallet.service.js`
- `Backend/src/core/payments/controllers/razorpayWebhook.controller.js`
- `Backend/src/queues/processors/order.processor.js`
- `Backend/src/queues/processors/payment.processor.js`
- `Backend/src/queues/producers/payment.producer.js`
- wallet services under `Backend/src/modules/food/user/services/`

Likely schema updates for snapshot support:

- add `orderSnapshot`
- add `snapshotVersion`
- add `snapshotHash`

Primary target:

- `Backend/src/modules/food/orders/models/foodTransaction.model.js`

## Final Recommendation

This plan is sufficient to solve the major production-readiness issues, but only if the Tifora-specific gaps are treated as first-class work items and not left as follow-up cleanup.

The biggest Tifora-specific additions beyond a generic finance plan are:

- fix the wallet refund double-credit bug
- enforce one true wallet mutation path
- repair queue wiring so finance workers actually run
- define clear ownership between `FoodTransaction`, `Payment`, `Refund`, and universal `Transaction`

Without those four additions, the broader hardening plan would still leave real production risk behind.
