# AI_USAGE.md — AI Tool Usage Log

## Tools Used

| Tool | Purpose |
|------|---------|
| Claude (claude.ai) via Gemini Antigravity | Primary AI assistant for code generation, architecture design, and debugging |
| GitHub Copilot | Inline code completions during implementation |

## Key Prompts

### Prompt 1 — Project Scaffold & Database Schema
Asked AI to design a PostgreSQL schema for shared expenses with time-scoped membership (joined_at/left_at), multi-currency support, and a full import audit trail. Reviewed and refined the schema to add `is_guest` flag for external participants and `fx_rate_used` in expense_splits for traceability.

### Prompt 2 — CSV Anomaly Detection Engine
Provided the full CSV and asked AI to identify anomaly types. Used AI output as a starting checklist, then manually verified each row of the CSV against the detection logic. Significantly modified the parser to handle edge cases the AI missed (see Cases Below).

### Prompt 3 — Balance Calculation Engine
Asked AI to implement the balance engine with debt simplification. Reviewed the greedy algorithm implementation and verified it against manual calculations. Caught and fixed currency conversion bugs.

### Prompt 4 — Backend API Routes
Generated route scaffolding with express-validator. Manually added authorization checks and pagination logic that the AI initially omitted.

### Prompt 5 — Import Wizard UI
Described the 5-step wizard flow and had AI generate the React components. Heavily modified the anomaly review table and state management to handle all 19 anomaly types correctly.

### Prompt 6 — Core UI Pages
Used AI for initial page layouts, then customized the design system and animations.

---

## Three Cases Where AI Was Wrong

### Case 1: Incorrect Date Parsing for Row 27

**What happened:** AI initially parsed "Mar-14" as March 14 of the *current year* (2026) using `new Date('Mar-14')`, which in some JavaScript environments parses as March 14, 2014 or returns Invalid Date.

**How I caught it:** Unit test for date parsing failed — the parsed date was `2014-03-14` instead of `2026-03-14`. I realized `new Date()` constructor behavior for partial date strings is implementation-dependent.

**What I changed:** Replaced with explicit parsing: split on `-`, map month abbreviation to number using a lookup table, and explicitly set year to 2026 (inferred from surrounding CSV rows). Added a `NON_STANDARD_DATE` anomaly flag with the parsed result.

### Case 2: Balance Engine Double-Counted Settlements

**What happened:** AI's initial balance engine treated row 14 ("Rohan paid Aisha back ₹5000") as both an expense AND a settlement. It was being parsed by the import parser and routed to the settlements table, but the balance engine was also picking it up from the expenses query because the import confirm logic had a bug that wrote it to both tables.

**How I caught it:** Manual balance verification for Rohan showed his net was off by ₹5000. I traced through the code and found the `POST /import/confirm` route was not skipping settlement-classified rows when inserting into the expenses table.

**What I changed:** Added an explicit filter in the confirm route: rows classified as `SETTLEMENT_AS_EXPENSE` or `SETTLEMENT_AS_DEPOSIT` are ONLY inserted into the `settlements` table, never into `expenses`. Added a test case that verifies row 14 appears in settlements and NOT in expenses after import.

### Case 3: Debt Simplification Ignored Currency

**What happened:** AI's debt simplification algorithm calculated net balances correctly but didn't convert USD expenses to INR before summing. This meant Dev's USD expenses (Goa villa $540, parasailing $150, etc.) were being summed with INR amounts, producing nonsensical balances like "Dev is owed ₹690" when it should have been "Dev is owed ₹56,700" (at ~₹84/USD).

**How I caught it:** Dashboard showed Dev's balance as a suspiciously small number. Cross-referencing with the CSV, Dev paid $540 + $150 + ₹3200 = should be substantial. Realized the balance engine was adding 540 + 150 + 3200 = 3890 (mixing currencies).

**What I changed:** Modified `calculateBalances()` to convert every expense amount to INR before any credit/debit calculation, using the `fx_rate_used` stored in expense_splits. Added a currency conversion step at the top of the balance loop. Added test cases that verify USD expenses are correctly converted.
