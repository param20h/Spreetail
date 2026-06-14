# FlatMate — Shared Expenses App Implementation Plan

> **Spreetail Placement Assignment** — Full-stack shared expenses app with CSV import, anomaly detection, balance calculation, and time-scoped membership.

## Project Structure

```
/Users/param/placements/spreetail/
├── backend/
│   ├── package.json
│   ├── knexfile.js
│   ├── server.js
│   ├── .env.example
│   ├── railway.toml
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js
│   │   ├── middleware/
│   │   │   ├── auth.js              # JWT verification middleware
│   │   │   ├── errorHandler.js      # Centralized error handler
│   │   │   └── validate.js          # express-validator wrapper
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── groups.js
│   │   │   ├── expenses.js
│   │   │   ├── balances.js
│   │   │   ├── settlements.js
│   │   │   ├── import.js
│   │   │   └── fxRates.js
│   │   ├── services/
│   │   │   ├── importParser.js       # CSV anomaly detection engine
│   │   │   ├── balanceEngine.js      # Balance calculation + debt simplification
│   │   │   └── fxService.js          # Currency conversion logic
│   │   └── utils/
│   │       ├── fuzzyMatch.js         # Name matching (Priya vs Priya S)
│   │       ├── dateParser.js         # Multi-format date parsing
│   │       └── splitCalculator.js    # Split type calculations
│   ├── migrations/
│   │   ├── 001_create_users.js
│   │   ├── 002_create_groups.js
│   │   ├── 003_create_group_members.js
│   │   ├── 004_create_expenses.js
│   │   ├── 005_create_expense_splits.js
│   │   ├── 006_create_settlements.js
│   │   ├── 007_create_import_sessions.js
│   │   ├── 008_create_import_anomalies.js
│   │   └── 009_create_fx_rates.js
│   ├── seeds/
│   │   ├── 001_users.js
│   │   └── 002_sample_group.js
│   └── tests/
│       ├── importParser.test.js
│       ├── balanceEngine.test.js
│       ├── splitCalculator.test.js
│       └── api/
│           ├── auth.test.js
│           ├── groups.test.js
│           └── expenses.test.js
├── frontend/
│   ├── package.json
│   ├── vercel.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   ├── public/
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css                 # Tailwind + custom design tokens
│       ├── api/
│       │   └── client.js             # Axios instance with JWT interceptor
│       ├── context/
│       │   └── AuthContext.jsx
│       ├── hooks/
│       │   ├── useAuth.js
│       │   ├── useGroups.js
│       │   ├── useExpenses.js
│       │   └── useBalances.js
│       ├── pages/
│       │   ├── Login.jsx
│       │   ├── Register.jsx
│       │   ├── Dashboard.jsx
│       │   ├── Expenses.jsx
│       │   ├── BalanceDetail.jsx
│       │   ├── Members.jsx
│       │   └── Import.jsx
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Navbar.jsx
│       │   │   ├── Sidebar.jsx
│       │   │   └── Layout.jsx
│       │   ├── expenses/
│       │   │   ├── ExpenseList.jsx
│       │   │   ├── ExpenseRow.jsx
│       │   │   ├── ExpenseDetailModal.jsx
│       │   │   ├── AddExpenseModal.jsx
│       │   │   └── SplitInputs.jsx   # Dynamic split section for all 4 types
│       │   ├── balance/
│       │   │   ├── BalanceCard.jsx
│       │   │   ├── SettleUpModal.jsx
│       │   │   └── BreakdownTable.jsx
│       │   ├── import/
│       │   │   ├── ImportWizard.jsx
│       │   │   ├── UploadStep.jsx
│       │   │   ├── AnomalyReview.jsx
│       │   │   ├── FxRateStep.jsx
│       │   │   ├── ConfirmStep.jsx
│       │   │   └── ImportReport.jsx
│       │   ├── members/
│       │   │   ├── MemberList.jsx
│       │   │   └── AddMemberModal.jsx
│       │   └── ui/
│       │       ├── Button.jsx
│       │       ├── Card.jsx
│       │       ├── Modal.jsx
│       │       ├── Badge.jsx
│       │       ├── Input.jsx
│       │       ├── Select.jsx
│       │       ├── Table.jsx
│       │       ├── Spinner.jsx
│       │       └── DropZone.jsx
│       └── utils/
│           └── formatters.js         # Currency, date formatting
├── README.md
├── SCOPE.md
├── DECISIONS.md
├── AI_USAGE.md
└── Expenses Export.csv               # (already exists)
```

---

## Phase 1: Project Scaffold & Database Schema

### Backend Initialization

#### [NEW] [package.json](file:///Users/param/placements/spreetail/backend/package.json)
- Dependencies: `express`, `knex`, `pg`, `bcryptjs`, `jsonwebtoken`, `cors`, `multer`, `csv-parse`, `express-validator`, `dotenv`, `helmet`, `morgan`
- Dev: `jest`, `supertest`, `nodemon`
- Scripts: `dev`, `start`, `test`, `migrate`, `seed`

#### [NEW] [knexfile.js](file:///Users/param/placements/spreetail/backend/knexfile.js)
- Development: local PostgreSQL
- Production: `DATABASE_URL` from env (Railway)

#### [NEW] [server.js](file:///Users/param/placements/spreetail/backend/server.js)
- Express app setup with CORS, helmet, morgan, JSON body parser
- Route mounting
- Error handler middleware

### Database Migrations

#### [NEW] migrations/001–009

**users** table:
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default gen_random_uuid() |
| name | varchar(255) | NOT NULL |
| email | varchar(255) | UNIQUE, NOT NULL |
| password_hash | varchar(255) | NOT NULL |
| is_guest | boolean | DEFAULT false (for Dev, Kabir) |
| created_at | timestamp | DEFAULT now() |

**groups** table:
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| name | varchar(255) | NOT NULL |
| created_at | timestamp | DEFAULT now() |

**group_members** table:
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| group_id | uuid | FK → groups.id ON DELETE CASCADE |
| user_id | uuid | FK → users.id ON DELETE CASCADE |
| joined_at | date | NOT NULL |
| left_at | date | NULLABLE |
| UNIQUE | | (group_id, user_id) |

> [!IMPORTANT]
> `left_at` is the key field for time-scoped membership. Meera's `left_at = 2026-03-28` and Sam's `joined_at = 2026-04-08` gate their balance calculations.

**expenses** table:
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| group_id | uuid | FK → groups.id |
| description | varchar(500) | NOT NULL |
| amount | decimal(12,2) | NOT NULL |
| currency | varchar(3) | NOT NULL, DEFAULT 'INR' |
| paid_by_user_id | uuid | FK → users.id |
| date | date | NOT NULL |
| split_type | enum | 'equal','unequal','percentage','share' |
| notes | text | NULLABLE |
| is_settlement | boolean | DEFAULT false |
| is_refund | boolean | DEFAULT false |
| import_row_ref | integer | NULLABLE |
| import_session_id | uuid | FK → import_sessions.id NULLABLE |
| created_at | timestamp | DEFAULT now() |

**expense_splits** table:
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| expense_id | uuid | FK → expenses.id ON DELETE CASCADE |
| user_id | uuid | FK → users.id |
| amount | decimal(12,2) | NOT NULL |
| percentage | decimal(5,2) | NULLABLE |
| shares | integer | NULLABLE |
| fx_rate_used | decimal(12,6) | NULLABLE (Rohan's traceability request) |

**settlements** table:
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| group_id | uuid | FK → groups.id |
| paid_by | uuid | FK → users.id |
| paid_to | uuid | FK → users.id |
| amount | decimal(12,2) | NOT NULL |
| currency | varchar(3) | DEFAULT 'INR' |
| date | date | NOT NULL |
| notes | text | NULLABLE |
| import_row_ref | integer | NULLABLE |
| created_at | timestamp | DEFAULT now() |

**import_sessions** table:
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| filename | varchar(255) | NOT NULL |
| imported_at | timestamp | DEFAULT now() |
| status | varchar(50) | 'preview','confirmed','failed' |
| total_rows | integer | |
| imported_rows | integer | |
| skipped_rows | integer | |
| fx_rate_used | decimal(12,6) | NULLABLE |

**import_anomalies** table:
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| import_session_id | uuid | FK → import_sessions.id |
| row_number | integer | NOT NULL |
| field | varchar(100) | |
| issue_type | varchar(100) | NOT NULL |
| description | text | |
| raw_value | text | |
| detected_value | text | |
| action_taken | varchar(100) | |
| requires_approval | boolean | DEFAULT false |
| approved_by | uuid | FK → users.id NULLABLE |
| approved_at | timestamp | NULLABLE |

**fx_rates** table:
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| from_currency | varchar(3) | NOT NULL |
| to_currency | varchar(3) | NOT NULL |
| rate | decimal(12,6) | NOT NULL |
| effective_date | date | NOT NULL |
| UNIQUE | | (from_currency, to_currency, effective_date) |

### Seeds

#### [NEW] seeds/001_users.js
Create 6 users: Aisha, Rohan, Priya, Meera, Sam, Dev (guest), Kabir (guest)

#### [NEW] seeds/002_sample_group.js
Create "Flat 4B" group with time-scoped memberships:
- Aisha: joined 2026-01-01, left_at NULL
- Rohan: joined 2026-01-01, left_at NULL
- Priya: joined 2026-01-01, left_at NULL
- Meera: joined 2026-01-01, left_at 2026-03-28
- Sam: joined 2026-04-08, left_at NULL
- Dev: guest, joined 2026-02-08, left_at NULL (guest users)

---

## Phase 2: CSV Anomaly Detection Engine

### [NEW] [importParser.js](file:///Users/param/placements/spreetail/backend/src/services/importParser.js)

The parser processes the CSV in a single pass and returns a structured report. All 19 anomalies are detected — **nothing is silently fixed or dropped**.

#### Architecture
```
CSV Text → csv-parse → Row Normalization → Anomaly Detection Pipeline → Report
```

Each row goes through a pipeline of detectors:

```javascript
const DETECTORS = [
  detectCommaInAmount,        // #3: Row 7 "1,200"
  detectExcessPrecision,      // #19: Row 10 899.995
  detectZeroAmount,           // #10: Row 31 amount=0
  detectNegativeAmount,       // #11: Row 26 -30
  detectMissingPayer,         // #4: Row 13 empty paid_by
  detectCaseInconsistency,    // #6: Row 9 "priya", Row 27 "rohan "
  detectInconsistentName,     // #5: Row 11 "Priya S"
  detectNonStandardDate,      // #8: Row 27 "Mar-14"
  detectAmbiguousDate,        // #7: Row 34 "04-05-2026"
  detectMissingCurrency,      // #9: Row 28 empty currency
  detectSettlementAsExpense,  // #2: Row 14 "paid back"
  detectSettlementAsDeposit,  // #17: Row 38 "deposit share"
  detectDuplicateRow,         // #1: Rows 5&6 exact match
  detectDuplicateDinner,      // #13: Rows 24&25 same event
  detectPercentageMismatch,   // #12: Row 15 110%
  detectConflictingSplitType, // #18: Row 42 equal + shares
  detectExternalParticipant,  // #14: Rows 5,23 Dev, Kabir
  detectMeeraAfterDeparture,  // #15: Row 36 Meera in April
  detectSamBeforeJoin,        // #16: Any Sam before Apr 8
];
```

#### CSV Anomaly Mapping (All 19)

| # | Issue Type | Row(s) | Detection Logic | Policy | requires_approval |
|---|-----------|--------|-----------------|--------|-------------------|
| 1 | `DUPLICATE_ROW` | 5, 6 | Same date + normalized description + amount + payer | Mark row 6 as duplicate | ✅ Yes |
| 2 | `SETTLEMENT_AS_EXPENSE` | 14 | Keywords: "paid back", "settlement" in description/notes | Move to settlements table | ✅ Yes |
| 3 | `COMMA_IN_AMOUNT` | 7 | Regex: `/[\d,]+\.\d+\|[\d,]+/` that isn't valid float | Strip commas, parse as 1200 | ❌ Auto-fix |
| 4 | `MISSING_PAYER` | 13 | `paid_by` field is empty/null | Block import of this row until user assigns payer | ✅ Yes |
| 5 | `INCONSISTENT_PAYER_NAME` | 11 | Fuzzy match: Levenshtein distance ≤ 2 or starts-with match against known users | Flag "Priya S" → "Priya" | ✅ Yes |
| 6 | `CASE_INCONSISTENCY` | 9, 27 | Lowercase/trimmed version matches a known user but casing differs | Normalize to canonical name, log | ❌ Auto-fix |
| 7 | `AMBIGUOUS_DATE` | 34 | Day ≤ 12 AND month ≤ 12 and file predominantly uses DD-MM-YYYY | Surface both interpretations to user | ✅ Yes |
| 8 | `NON_STANDARD_DATE` | 27 | Date doesn't match DD-MM-YYYY pattern; try `MMM-DD` parse | Parse "Mar-14" → 14-03-2026, log | ❌ Auto-fix |
| 9 | `MISSING_CURRENCY` | 28 | Currency field empty | Default to INR with warning | ✅ Yes |
| 10 | `ZERO_AMOUNT` | 31 | Amount = 0 | Skip import, log as informational/void | ❌ Auto-skip |
| 11 | `NEGATIVE_AMOUNT` | 26 | Amount < 0 | Flag as refund/credit, keep as negative | ❌ Auto-flag |
| 12 | `PERCENTAGE_MISMATCH` | 15 | Sum of percentages ≠ 100 (30+30+30+20=110) | Reject until user fixes | ✅ Yes |
| 13 | `DUPLICATE_DINNER` | 24, 25 | Same date + similar description (fuzzy) + different amounts/payers | Flag both, user picks one | ✅ Yes |
| 14 | `EXTERNAL_PARTICIPANT` | 5, 23 | `split_with` names not in group_members | Create as guest/external | ❌ Auto-create + log |
| 15 | `MEERA_AFTER_DEPARTURE` | 36 | Meera in split_with but expense date > Meera's left_at | Remove Meera from split, log | ❌ Auto-fix + log |
| 16 | `SAM_BEFORE_JOIN` | N/A | Sam in split_with but expense date < Sam's joined_at | Flag any found | ❌ (none found in CSV) |
| 17 | `SETTLEMENT_AS_DEPOSIT` | 38 | Keywords: "deposit", "share" + paid_to pattern | Flag for user classification | ✅ Yes |
| 18 | `CONFLICTING_SPLIT_TYPE` | 42 | split_type="equal" but split_details has share values | Warn, use "share" logic | ✅ Yes |
| 19 | `EXCESS_PRECISION` | 10 | More than 2 decimal places | Round to 2 decimals, log | ❌ Auto-fix |

#### Return Type
```typescript
{
  rows_ok: number,
  rows_total: number,
  anomalies: Array<{
    row: number,
    field: string,
    issue_type: string,
    raw_value: string,
    detected_value: string | null,
    action: string,
    requires_approval: boolean
  }>,
  requires_approval: Array</* subset of anomalies */>,
  parsed_rows: Array<NormalizedRow>,
  settlements_detected: Array<{ row: number, from: string, to: string, amount: number }>
}
```

### [NEW] [tests/importParser.test.js](file:///Users/param/placements/spreetail/backend/tests/importParser.test.js)
- Unit test per anomaly type (19 test cases)
- Test complete CSV parse returning all anomalies
- Test row count summaries
- Test that no anomaly is silently swallowed

---

## Phase 3: Balance Calculation Engine

### [NEW] [balanceEngine.js](file:///Users/param/placements/spreetail/backend/src/services/balanceEngine.js)

Pure-function module with zero side effects.

#### Core Algorithm

```
calculateBalances(expenses, settlements, members, fxRates, asOfDate?)
  → { perUserNet, settlementsNeeded, breakdown }
```

1. **Build ledger**: For each expense:
   - Credit the payer the full amount (converted to INR if USD)
   - Debit each participant their split share
   - Only include if participant was active member on expense date
   
2. **Apply settlements**: Credit receiver, debit payer

3. **Net balance**: Sum credits − debits per user

4. **Debt simplification** (greedy algorithm):
   - Sort users by net balance
   - Pair largest creditor with largest debtor
   - Transfer min(credit, debit)
   - Repeat until all settled
   - Output: minimal list of `{ from, to, amount }`

#### Split Calculators

```javascript
function calculateSplit(expense, splits) {
  switch (expense.split_type) {
    case 'equal':    return amount / participants.length;
    case 'unequal':  return splits[userId].amount;
    case 'percentage': return amount * (splits[userId].percentage / 100);
    case 'share':    return amount * (splits[userId].shares / totalShares);
  }
}
```

#### Time-Scoping Logic
```javascript
function isActiveOnDate(member, expenseDate) {
  const joined = new Date(member.joined_at);
  const left = member.left_at ? new Date(member.left_at) : Infinity;
  return expenseDate >= joined && expenseDate <= left;
}
```

- **Sam**: joined 2026-04-08 → only expenses from April 8 onward count
- **Meera**: left 2026-03-28 → no April expenses count for her

#### Currency Conversion
- Lookup `fx_rates` for USD→INR on the expense date
- If no exact match, use nearest prior rate
- Store `fx_rate_used` in `expense_splits` for audit trail (Rohan's request)

#### Audit Trail Output
Per-user breakdown returns:
```javascript
{
  user_id, user_name, net_balance,
  items: [
    { expense_id, date, description, full_amount, their_share, role: 'payer'|'participant', fx_rate_used }
  ]
}
```

### [NEW] [tests/balanceEngine.test.js](file:///Users/param/placements/spreetail/backend/tests/balanceEngine.test.js)
- Test equal split calculation
- Test unequal/percentage/share splits
- Test time-scoped membership (Sam, Meera)
- Test debt simplification produces minimal transactions
- Test USD→INR conversion
- Test settlement application
- Test full CSV scenario end-to-end

---

## Phase 4: Backend API Routes

### Auth Module

#### [NEW] [routes/auth.js](file:///Users/param/placements/spreetail/backend/src/routes/auth.js)
- `POST /auth/register` — validate name/email/password, hash with bcrypt, return JWT
- `POST /auth/login` — verify credentials, return `{ token, user }`

#### [NEW] [middleware/auth.js](file:///Users/param/placements/spreetail/backend/src/middleware/auth.js)
- JWT verification middleware using `jsonwebtoken`
- Attaches `req.user` with `{ id, email, name }`

### Groups Module

#### [NEW] [routes/groups.js](file:///Users/param/placements/spreetail/backend/src/routes/groups.js)
- `GET /groups` — list groups for current user
- `POST /groups` — create group
- `GET /groups/:id` — get group with members
- `POST /groups/:id/members` — add member with `joined_at`
- `PUT /groups/:id/members/:uid` — update `left_at`

### Expenses Module

#### [NEW] [routes/expenses.js](file:///Users/param/placements/spreetail/backend/src/routes/expenses.js)
- `GET /groups/:id/expenses` — paginated, filterable by date range, paid_by, currency
- `POST /groups/:id/expenses` — create expense with splits (validate split totals)
- `PUT /expenses/:id` — update expense
- `DELETE /expenses/:id` — delete expense

### Balance Module

#### [NEW] [routes/balances.js](file:///Users/param/placements/spreetail/backend/src/routes/balances.js)
- `GET /groups/:id/balance` — per-user net + simplified settlements
- `GET /groups/:id/balance/breakdown` — itemized per-expense breakdown (Rohan's request)

### Settlements Module

#### [NEW] [routes/settlements.js](file:///Users/param/placements/spreetail/backend/src/routes/settlements.js)
- `POST /groups/:id/settlements` — record settlement
- `GET /groups/:id/settlements` — list settlements

### Import Module

#### [NEW] [routes/import.js](file:///Users/param/placements/spreetail/backend/src/routes/import.js)
- `POST /import/preview` — multipart CSV upload → parse → return anomaly report (no DB write)
- `POST /import/confirm` — apply resolutions, write to DB, return import report
- `GET /import/:session_id/report` — download import report

### FX Rates Module

#### [NEW] [routes/fxRates.js](file:///Users/param/placements/spreetail/backend/src/routes/fxRates.js)
- `POST /fx-rates` — admin sets rate
- `GET /fx-rates/current?from=USD&to=INR` — get latest rate

### Error Handling

#### [NEW] [middleware/errorHandler.js](file:///Users/param/placements/spreetail/backend/src/middleware/errorHandler.js)
All errors return:
```json
{ "error": true, "code": "VALIDATION_ERROR", "message": "...", "details": [...] }
```

#### [NEW] [middleware/validate.js](file:///Users/param/placements/spreetail/backend/src/middleware/validate.js)
- Wraps `express-validator` for consistent validation on all POST/PUT routes

---

## Phase 5: Frontend — React + Tailwind + Vite

### Initialization
- Scaffold with `npx -y create-vite@latest ./ -- --template react`
- Install: `tailwindcss`, `@tailwindcss/vite`, `react-router-dom`, `axios`, `react-dropzone`, `lucide-react`

### Design System (via StitchMCP)
Use StitchMCP to generate premium UI screens before coding. Create a design system with:
- Dark mode with glassmorphism effects
- Color palette: deep navy (#0f172a) primary, teal (#14b8a6) accent, emerald (#10b981) for positive, rose (#f43f5e) for negative
- Inter font family
- Smooth micro-animations

### UI Pages

#### [NEW] [pages/Login.jsx](file:///Users/param/placements/spreetail/frontend/src/pages/Login.jsx) & [Register.jsx](file:///Users/param/placements/spreetail/frontend/src/pages/Register.jsx)
- Clean auth forms with email/password
- JWT stored in localStorage
- Redirect to Dashboard on success

#### [NEW] [pages/Dashboard.jsx](file:///Users/param/placements/spreetail/frontend/src/pages/Dashboard.jsx)
- Group selector in top nav
- Balance summary cards per member (green=owed, red=owes)
- "Settle Up" button → modal with minimal transactions
- Recent 10 expenses list
- Animated number transitions

#### [NEW] [pages/Expenses.jsx](file:///Users/param/placements/spreetail/frontend/src/pages/Expenses.jsx)
- Sortable table: date, description, paid by, amount, currency, split badge
- Filters: date range picker, paid_by dropdown, currency toggle
- Click row → ExpenseDetailModal with exact splits
- "Add Expense" FAB button

#### [NEW] [components/expenses/AddExpenseModal.jsx](file:///Users/param/placements/spreetail/frontend/src/components/expenses/AddExpenseModal.jsx)
- Dynamic split section based on split_type:
  - **equal**: auto-calculated, shows member list
  - **unequal**: individual amount inputs, running total validation
  - **percentage**: % inputs, total % display (warn if ≠ 100)
  - **share**: integer inputs, shows calculated amounts
- paid_by dropdown membership-aware (only members active on selected date)

#### [NEW] [pages/BalanceDetail.jsx](file:///Users/param/placements/spreetail/frontend/src/pages/BalanceDetail.jsx)
- User selector
- Net balance hero card
- Itemized table: Date, Description, Full Amount, Their Share, Role (payer/participant)
- Sum row at bottom = net balance exactly

#### [NEW] [pages/Members.jsx](file:///Users/param/placements/spreetail/frontend/src/pages/Members.jsx)
- Member cards with join/leave dates
- Add member form: name, email, joined_at
- "Mark as left" action with date picker
- Visual indicator for active vs departed members

#### [NEW] [pages/Import.jsx](file:///Users/param/placements/spreetail/frontend/src/pages/Import.jsx)
5-step wizard:

**Step 1 — Upload**: Drag-and-drop zone, "Analysing your CSV..." spinner

**Step 2 — Anomaly Review**: 
- Table: Row #, Field, Issue, Raw Value, Proposed Action, Decision
- Each row: Accept | Reject | Edit Value
- `requires_approval=true` items must be resolved
- Summary banner: "X clean, Y need decision, Z skipped"
- "Proceed" disabled until all approvals resolved

**Step 3 — FX Rate** (conditional):
- Only shown if USD rows detected
- Input for USD→INR rate
- Default fetched from exchangerate API
- User can override

**Step 4 — Confirm**: 
- Progress bar during import
- Call `POST /import/confirm`

**Step 5 — Report**:
- Total rows, imported, skipped
- Anomaly resolution log
- FX rate used
- Downloadable as text

---

## Phase 6: Deployment

### [NEW] [railway.toml](file:///Users/param/placements/spreetail/backend/railway.toml)
```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "npx knex migrate:latest && node server.js"
```

### [NEW] [vercel.json](file:///Users/param/placements/spreetail/frontend/vercel.json)
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

### Environment Variables
- Backend: `DATABASE_URL`, `JWT_SECRET`, `PORT`, `FRONTEND_URL` (for CORS)
- Frontend: `VITE_API_URL` (points to Railway URL)

---

## Phase 7: Documentation

### [NEW] [README.md](file:///Users/param/placements/spreetail/README.md)
Setup instructions, tech stack, deployed URLs

### [NEW] [SCOPE.md](file:///Users/param/placements/spreetail/SCOPE.md)
- Full schema DDL
- Complete anomaly log table (all 19 rows with row numbers, raw values, policies, rationale)

### [NEW] [DECISIONS.md](file:///Users/param/placements/spreetail/DECISIONS.md)
10 design decisions with options considered and rationale

### [NEW] [AI_USAGE.md](file:///Users/param/placements/spreetail/AI_USAGE.md)
Tools used, key prompts, 3 cases where AI was wrong


---

## Phase 8: Landing Page, Theme Toggle & Smooth Motion

### [NEW] [ThemeContext.jsx](file:///Users/param/placements/spreetail/frontend/src/context/ThemeContext.jsx)
- Implements `ThemeContext` and `ThemeProvider` to manage current theme state (`light` or `dark`).
- Synchronizes with `document.documentElement` class list (`light` vs default dark).
- Persists user preferences in `localStorage` for returning sessions.

### [NEW] [useTheme.js](file:///Users/param/placements/spreetail/frontend/src/hooks/useTheme.js)
- Custom hook wrapper to consume `ThemeContext`.

### [NEW] [Landing.jsx](file:///Users/param/placements/spreetail/frontend/src/pages/Landing.jsx)
- A highly polished, classy landing/info page featuring:
  - **Hero Header**: Styled with geometric Outfit display font, brief app description, and primary CTAs linking to `/login` and `/register`.
  - **Obsidian Preview Widget**: Floating, interactive mockup illustrating balance statements.
  - **Feature Matrix**: Showcases key features (Time-scoped membership, 19-anomaly CSV parser, greedy debt settlements, and audit trails) with micro-hover translations.
  - **Mode Toggle Integration**: A local header and switch so users can preview the theme change on the landing page itself.

### [MODIFY] [index.css](file:///Users/param/placements/spreetail/frontend/src/index.css)
- Define standard CSS custom properties for Light Mode and Dark Mode backgrounds, cards, hover overlays, borders, and text variables.
- Map custom tailwind colors (`--color-navy-950`, `--color-navy-900`, etc.) to CSS variables so backgrounds automatically transition.
- Define custom text variables (`--color-theme-primary`, `--color-theme-secondary`, `--color-theme-muted`) mapping to CSS variables to toggle body/header text colors.
- Define global transition properties on container elements for background-color, border-color, shadow, and opacity for "perfect motion" transitions.

### [MODIFY] [Navbar.jsx](file:///Users/param/placements/spreetail/frontend/src/components/layout/Navbar.jsx)
- Place the Sun/Moon toggle next to the user menu on the right.
- Bind smooth SVG rotations and scale-in animations (`rotate-90 scale-0` -> `rotate-0 scale-100`) to provide instant interactive feedback.

### [MODIFY] [App.jsx](file:///Users/param/placements/spreetail/frontend/src/App.jsx)
- Wrap root routes in `ThemeProvider` (and `main.jsx` / `App.jsx`).
- Render the `Landing` page at `/`.
- Adjust `ProtectedRoute` nesting so that Layout page wraps `/dashboard`, `/expenses`, `/balance`, `/members`, and `/import` without changing their paths.

### [MODIFY] Pages & UI Components
- Replace hardcoded text colors in headings (`text-white`) with `text-theme-primary`, slate labels (`text-slate-300`/`text-slate-400`) with `text-theme-secondary`, and muted items (`text-slate-500`) with `text-theme-muted` where dynamic color toggling is required.
- Add `transition-all duration-300` classes to card components, buttons, fields, and tables to ensure color transitions animate smoothly.

---

## Open Questions

> [!IMPORTANT]
> **PostgreSQL setup**: Do you have PostgreSQL running locally? If not, I can configure the project to use a Docker container, or we can use Railway's DB from the start with a connection string.

> [!IMPORTANT]
> **StitchMCP for UI**: You mentioned adding StitchMCP for better UI. Would you like me to generate screen mockups via StitchMCP before coding the frontend, or should I proceed directly with code using Tailwind and a premium design system I define?

> [!IMPORTANT]
> **Deploy now or later?**: The plan includes Railway + Vercel deployment. Should I set up deployment configs from the start (so you can test deployed versions early), or focus on getting everything working locally first and deploy at the end?

> [!IMPORTANT]
> **Test depth**: The plan includes Jest unit tests for importParser and balanceEngine (the two critical modules). Should I also add API integration tests with supertest, or keep tests focused on business logic only to save time?

---

## Verification Plan

### Automated Tests
```bash
# Unit tests for business logic
cd backend && npm test

# Specific test suites
npx jest tests/importParser.test.js --verbose
npx jest tests/balanceEngine.test.js --verbose
```

### Manual Verification
1. **CSV Import**: Upload the provided `Expenses Export.csv` and verify all 19 anomalies are detected
2. **Balance Trace**: Manually calculate Sam's balance (only April 8+ expenses) and verify the app matches
3. **Meera Exclusion**: Verify Meera is excluded from row 36 (April groceries)
4. **Row 14 Settlement**: Verify "Rohan paid Aisha back" goes to settlements table, not expenses
5. **Row 26 Refund**: Verify -30 USD parasailing refund flows correctly through balance calc
6. **Percentage Mismatch**: Verify row 15 (110%) blocks import until user fixes
7. **Full UI Walkthrough**: Login → Dashboard → Add Expense → Import CSV → Review anomalies → Confirm → Check balances

### Commit Sequence
```
feat: initial project scaffold and DB schema
feat: auth (register, login, JWT middleware)
feat: groups and time-scoped membership
feat: expenses CRUD with split types
feat: balance calculation engine
feat: CSV import parser with anomaly detection
feat: import wizard UI
feat: settlements
feat: balance breakdown UI
fix: handle USD/INR conversion in balance engine
docs: add README, SCOPE, DECISIONS, AI_USAGE
```
