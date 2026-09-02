# Splitly

A self-hostable Splitwise alternative: groups, shared expenses with equal / exact / percentage / share splits, running balances, "simplify debts", and settle-up payments.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind
- Drizzle ORM on SQLite via libsql: a local file in dev, [Turso](https://turso.tech) (free tier) in production
- Cookie sessions (JWT via `jose`) and bcrypt passwords, no third-party auth
- JSON API under `/api/*` that also accepts `Authorization: Bearer <token>` so a mobile client can reuse it later

## Run locally

```bash
npm install
cp .env.example .env
npm run dev        # runs migrations, then starts on http://localhost:3000
npm test           # split + balance math unit tests
```

## Deploy free (Vercel + Turso)

1. Create a Turso database and copy its `libsql://…` URL and auth token.
2. Import this repo into Vercel and set env vars: `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, `AUTH_SECRET`.
3. Deploy. The build step runs `npm run db:migrate` against the Turso database.

## API

All endpoints return JSON. Errors are `{ "error": string }` with a 4xx/5xx status.

| Method | Path | Body |
| --- | --- | --- |
| POST | `/api/auth/signup` | `{name,email,password}` → `{user,token}` |
| POST | `/api/auth/login` | `{email,password}` → `{user,token}` |
| POST | `/api/auth/logout` | |
| GET | `/api/auth/me` | |
| GET/POST | `/api/groups` | `{name,currency}` |
| POST | `/api/groups/join` | `{code}` |
| GET/PATCH/DELETE | `/api/groups/:id` | `{name?,currency?,simplifyDebts?}` |
| POST/DELETE | `/api/groups/:id/members` | `{email}` / `{userId}` |
| GET/POST | `/api/groups/:id/expenses` | see below |
| GET | `/api/groups/:id/balances` | → `{net, pairwise, simplified}` |
| GET/POST | `/api/groups/:id/settlements` | `{fromUserId,toUserId,amountCents,date,note?}` |
| GET/PATCH/DELETE | `/api/expenses/:id` | expense body |
| DELETE | `/api/settlements/:id` | |
| GET | `/api/balances` | overall, per currency, per counterparty |

Expense body:

```json
{
  "description": "Dinner",
  "amountCents": 4500,
  "paidBy": "<userId>",
  "splitType": "equal | exact | percent | shares",
  "date": "2026-09-02",
  "notes": null,
  "participants": [{ "userId": "<id>", "value": 50 }]
}
```

`value` is ignored for `equal`, whole cents for `exact`, a percentage for `percent`, and a weight for `shares`. All money is stored as integer cents; rounding remainders are apportioned by largest remainder so shares always sum to the total.

## Not in v1

Multi-currency within one group, recurring expenses, receipts, comments, activity feed, email notifications.
