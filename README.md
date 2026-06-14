# FlatMate — Shared Expenses App

> A full-stack shared expenses tracker for flatmates with CSV import, anomaly detection, multi-currency support, and time-scoped membership.

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Backend Setup
```bash
cd backend
cp .env.example .env
# Fill in DATABASE_URL, JWT_SECRET in .env
npm install
npx knex migrate:latest
npx knex seed:run
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173` (frontend) and `http://localhost:5000` (API).

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Tailwind CSS v4, Vite |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| Query Builder | Knex.js |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| CSV Parsing | csv-parse |
| Validation | express-validator |
| Testing | Jest + Supertest |

## 📦 Project Structure

```
├── backend/
│   ├── src/
│   │   ├── config/         # Database configuration
│   │   ├── middleware/      # Auth, error handling, validation
│   │   ├── routes/          # Express route handlers
│   │   ├── services/        # Business logic (importParser, balanceEngine)
│   │   └── utils/           # Helpers (fuzzyMatch, dateParser, splitCalculator)
│   ├── migrations/          # Knex database migrations
│   ├── seeds/               # Seed data
│   └── tests/               # Jest test suites
├── frontend/
│   └── src/
│       ├── components/      # Reusable UI components
│       ├── pages/           # Route pages
│       ├── context/         # React context (Auth)
│       ├── hooks/           # Custom hooks
│       └── api/             # API client
├── SCOPE.md                 # Schema & anomaly documentation
├── DECISIONS.md             # Architecture decisions
└── AI_USAGE.md              # AI tool usage log
```

## 🌐 Deployed URLs

| Service | URL |
|---------|-----|
| Frontend (Vercel) | *TBD after deployment* |
| Backend API (Railway) | *TBD after deployment* |

## ✨ Key Features

- **CSV Import with Anomaly Detection** — 19 distinct anomaly types detected, reviewed, and resolved via a 5-step import wizard
- **4 Split Types** — Equal, Unequal, Percentage, and Share-based expense splitting
- **Time-Scoped Membership** — Members who join late or leave early only participate in expenses during their active period
- **Multi-Currency Support** — USD expenses converted to INR at configurable FX rates with full traceability
- **Debt Simplification** — Greedy algorithm reduces complex debts to minimal transactions
- **Audit Trail** — Every balance can be traced back to individual expense splits (per Rohan's request)
- **Settlement Tracking** — Settlements are distinguished from expenses and properly credited

## 📄 License

MIT
