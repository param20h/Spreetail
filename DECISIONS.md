# DECISIONS.md — Architecture & Design Decisions

This document records the key architecture and design decisions made during the development of FlatMate, with alternatives considered and rationale for each choice.

---

## 1. Why PostgreSQL over MongoDB

**Options Considered:**
- **PostgreSQL** (relational, SQL)
- **MongoDB** (document-oriented, NoSQL)
- **SQLite** (file-based, simple)

**Chosen: PostgreSQL**

**Rationale:**
- The data model is inherently relational: users belong to groups, expenses have splits, splits reference users. Foreign key constraints enforce referential integrity — we can never have an expense_split pointing to a nonexistent expense.
- Financial data demands ACID transactions. When importing 43 CSV rows, either ALL rows succeed or NONE do. PostgreSQL guarantees this; MongoDB's multi-document transactions are a bolt-on feature with caveats.
- Complex balance calculations require JOINs across 4+ tables (expenses, expense_splits, group_members, fx_rates). SQL handles this natively; MongoDB would require multiple application-level lookups or aggregation pipelines.
- The `split_type` ENUM, `UNIQUE` constraints on `(group_id, user_id)`, and `CHECK` constraints on amounts are first-class PostgreSQL features.
- Railway (our deploy target) offers managed PostgreSQL with zero configuration.

---

## 2. How to Handle USD Expenses (At-Import Conversion vs Store-in-Currency)

**Options Considered:**
- **Option A: Convert to INR at import time**, store only INR amounts
- **Option B: Store in original currency**, convert at query time using latest rate
- **Option C: Store in original currency + store the FX rate used** (hybrid)

**Chosen: Option C — Store original currency + FX rate**

**Rationale:**
- Rohan requested full traceability: "I want to know exactly what rate was used for each expense." Storing `fx_rate_used` in `expense_splits` satisfies this.
- Converting at import time (Option A) would lose the original USD amount — if rates are corrected later, we can't recalculate.
- Converting at query time (Option B) would mean balances change every time the exchange rate fluctuates, making them unpredictable.
- Our hybrid approach: the `expenses` table stores the original amount and currency (e.g., $540 USD). The `expense_splits` table stores `fx_rate_used`. The balance engine converts to INR using the stored rate, giving deterministic and auditable results.

---

## 3. Time-Scoped Membership: How We Scoped Sam and Meera's Balances

**Options Considered:**
- **Option A: Simple boolean `is_active`** — members are either in or out
- **Option B: `joined_at` and `left_at` date fields** on `group_members`
- **Option C: Separate membership history table** with date ranges

**Chosen: Option B — `joined_at` + `left_at` on `group_members`**

**Rationale:**
- The requirement is straightforward: Sam joined April 8, Meera left March 28. We need date-level granularity, not just a flag.
- The check `joined_at <= expense.date <= left_at` is evaluated in both the import parser (to catch row 36: Meera in an April split) and the balance engine (to exclude out-of-scope expenses from balance calculations).
- A separate history table (Option C) would add complexity for a feature that doesn't need to track multiple join/leave cycles per user per group.
- `left_at = NULL` means "still active" — simple and intuitive.

**Example:**
- Sam's balance only includes expenses from April 8 onward (rows 38–43)
- Meera's balance excludes all April expenses (rows 35–43)

---

## 4. Duplicate Detection Strategy: Exact Match vs Fuzzy

**Options Considered:**
- **Option A: Exact match** on all fields (date, description, amount, payer)
- **Option B: Fuzzy match** on description + exact match on date/amount/payer
- **Option C: Hash-based deduplication** (hash all fields, compare hashes)

**Chosen: Option B — Fuzzy match on description + exact match on date/amount/payer**

**Rationale:**
- Rows 5 and 6 demonstrate why exact match isn't enough: "Dinner at Marina Bites" vs "dinner - marina bites" — different casing, different punctuation, but clearly the same expense.
- Our fuzzy matching normalizes descriptions (lowercase, remove punctuation, trim) before comparing. Two rows are flagged as duplicates when:
  1. Same date
  2. Normalized description matches (Levenshtein distance ≤ 3 OR substring containment)
  3. Same amount
  4. Same payer
- Rows 24 and 25 (Thalassa dinner) are a harder case: same date, similar description, but different amounts (₹2400 vs ₹2450) and different payers. These are flagged as `DUPLICATE_DINNER` — a separate anomaly type — because we can't automatically determine which is correct.
- Hash-based dedup (Option C) would miss the fuzzy cases entirely.

---

## 5. Settlement vs Expense Distinction

**Options Considered:**
- **Option A: Store settlements as expenses** with `is_settlement=true`
- **Option B: Separate `settlements` table** with different schema
- **Option C: Settlement field in expenses** (one table, optional fields)

**Chosen: Option B — Separate `settlements` table**

**Rationale:**
- Settlements and expenses have fundamentally different semantics:
  - An expense has a payer, multiple participants, a split type, and split amounts
  - A settlement has a payer, a single payee, and an amount
- Row 14 ("Rohan paid Aisha back") has no split_type, no split_with (just Aisha), and notes saying "this is a settlement not an expense??" — it doesn't fit the expense schema naturally.
- Row 38 ("Sam deposit share") is another settlement-like transaction.
- In the balance engine, settlements are processed differently: they directly credit the receiver and debit the payer, without any split calculation.
- A separate table makes the data model honest about what each record represents.

---

## 6. Debt Simplification Algorithm

**Options Considered:**
- **Option A: Pairwise debts** — show every A→B debt individually
- **Option B: Greedy matching** — sort by net balance, pair largest debtor with largest creditor
- **Option C: Min-cost flow** — optimal solution using network flow algorithms

**Chosen: Option B — Greedy matching**

**Rationale:**
- Aisha's request was clear: "I want one number per person" — meaning the fewest possible transactions to settle all debts.
- The greedy algorithm is simple to implement and produces near-optimal results for small groups:
  1. Calculate net balance per user (positive = owed money, negative = owes money)
  2. Sort by absolute balance
  3. Match the person who owes the most with the person owed the most
  4. Transfer `min(abs(debit), abs(credit))`
  5. Repeat until all balances are zero
- For 4–5 flatmates, the greedy approach produces the mathematically optimal minimum number of transactions in nearly all cases.
- Min-cost flow (Option C) is overkill for groups under 10 people and harder to explain in a code review.
- Pairwise debts (Option A) could result in circular payments (A pays B, B pays C, C pays A) — unacceptable.

---

## 7. Percentage Mismatch Policy (Reject vs Auto-Normalize)

**Options Considered:**
- **Option A: Reject** — block import until user fixes the percentages
- **Option B: Auto-normalize** — scale all percentages to sum to 100%
- **Option C: Import with warning** — import as-is but warn about the over/under-allocation

**Chosen: Option A — Reject until fixed**

**Rationale:**
- Row 15 has percentages summing to 110% (30+30+30+20). Auto-normalizing would change everyone's shares silently — Aisha might expect to pay 30% but actually pay 27.3%.
- The notes say "percentages might be off" — confirming the data is unreliable. We should not guess which percentage is wrong.
- Financial accuracy is paramount. An 10% over-allocation means ₹144 extra is being charged across all members. This is a real money discrepancy that the user must resolve.
- The import wizard surfaces this with a clear message: "Percentages sum to 110%, not 100%. Please fix before importing."

---

## 8. Negative Amount Policy (Error vs Refund)

**Options Considered:**
- **Option A: Treat as error** — reject negative amounts
- **Option B: Treat as refund/credit** — import with negative amount, flag as refund
- **Option C: Convert to absolute** — flip sign, import as regular expense

**Chosen: Option B — Treat as refund/credit**

**Rationale:**
- Row 26 is a clear refund: -30 USD for a parasailing slot cancellation. The notes confirm "one slot got cancelled."
- In the balance engine, a negative expense *credits* each participant rather than debiting them. This correctly reduces what they owe. If Dev paid -$30 split among 5 people, each person's obligation decreases by $6.
- Rejecting negative amounts (Option A) would force users to create a separate corrective expense, which is confusing.
- Flipping the sign (Option C) would turn a refund into a charge — the opposite of what happened.
- We flag `is_refund=true` so the UI can display refunds distinctively (different color, refund icon).

---

## 9. Missing Payer Policy (Block Import vs Assign Later)

**Options Considered:**
- **Option A: Block import** — require user to assign payer before the row can be imported
- **Option B: Assign later** — import with NULL payer, let user fix afterward
- **Option C: Distribute equally** — assume all participants paid an equal share

**Chosen: Option A — Block import until payer is assigned**

**Rationale:**
- Row 13 (House cleaning supplies, ₹780) has no payer. Notes: "can't remember who paid."
- Without a payer, we cannot credit anyone for this expense. The entire balance calculation depends on knowing who paid — the payer gets credited the full amount, while participants get debited their shares.
- Importing with NULL payer (Option B) would leave the balance engine in an inconsistent state. We'd need special NULL-handling throughout the codebase.
- Distributing equally (Option C) is a guess — and guessing with real money is unacceptable.
- The import wizard presents this as a required decision: "Who paid for 'House cleaning supplies' (₹780)?" with a dropdown of group members.

---

## 10. Two-Step Import (Preview + Confirm) Rationale

**Options Considered:**
- **Option A: One-step import** — parse CSV and write to DB immediately
- **Option B: Two-step import** — preview anomalies first, then confirm with resolutions
- **Option C: Three-step import** — upload → preview → edit → confirm

**Chosen: Option B — Two-step (preview + confirm)**

**Rationale:**
- Meera's explicit request: "I want to approve before anything is deleted or changed." A one-step import would silently fix anomalies or reject rows without user knowledge.
- The preview step (`POST /import/preview`) parses the entire CSV, runs all 19 anomaly detectors, and returns a structured report — WITHOUT writing anything to the database. This is safe and reversible.
- The confirm step (`POST /import/confirm`) takes the user's resolutions (accept, reject, or corrected values) and performs the actual database writes in a single transaction.
- This separation of concerns means:
  - Users can upload the same CSV multiple times to preview without side effects
  - All anomalies are surfaced at once, not one-by-one
  - The import is atomic: if any resolution fails, nothing is written
- We extended this to a 5-step wizard in the UI (Upload → Review → FX Rate → Confirm → Report) but the backend API remains two endpoints.
