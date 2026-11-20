# ShopSmart Release Note

## Version and date

- Version: ShopSmart 1.0.0, Week 6 local release candidate
- Date: 2026-11-16 (local tests run on 2026-11-13; live Gemini test on 2026-11-16)
- Code version: `main` branch of `Wendy-Calma/eCommerce_ShopSmart`, Week 6 submission commit `eca02d6`.
- Deployment status: **local release candidate only.** No private staging or live site was deployed. The AWS deployment (Amplify, EC2 and RDS) is planned in `DEPLOYMENT_PLAN.md` and will be carried out in the separate deployment assignment.

## Working features (verified 2026-11-13)

Details and evidence are in `TEST_RECORD.md`.

- Product catalog: six products load from PostgreSQL; server-side search with a no-results message; category filter; sort.
- Product details page with stock and add to cart.
- Cart: add, increase, decrease, typed quantity, remove; totals correct after each action; quantity above stock refused.
- Simulated checkout: valid fictional details create exactly one order with a server-calculated total and reduce stock; invalid details are refused and the customer is told which field to correct.
- Stock rule: enforced in the cart and again in a database transaction; a stock change after adding to cart returns a clear 409 message and leaves the cart and stock unchanged.
- Product assistant: answers from current catalog records with linked product sources; live Gemini drafting verified against the catalog (TC-19); honest no-match answers; on AI provider outage or timeout it returns a rule-based answer with a notice.
- Error handling: API failures end loading states and show a useful message; malformed JSON returns `INVALID_JSON` with a trace id.
- Health endpoint: `GET /api/health` returns `{"status":"ok"}`.

## Fixes in this release

| ID | Fix |
| --- | --- |
| D1 | AI provider timeout now fires reliably; `npm run check` no longer fails with 4 cancelled tests |
| D2 | README database setup grants `CREATEDB` so `npm run db:migrate` works; new `npm run db:deploy` for committed migrations |
| D3 | Checkout names the field the server rejected (for example the email address) |
| D4 | Malformed or oversized request bodies return `INVALID_JSON` / `PAYLOAD_TOO_LARGE` with a trace id |

## Final check result

- `npm run check`: **pass** (lint for both workspaces, frontend 8/8 tests, backend 49/49 tests, production build).
- Local smoke test (health, products, cart, simulated checkout, assistant): **pass**. Orders were kept: 4 before, 5 after; no reseed.
- Secrets: no `.env` file is committed; no database URL, password or provider key is in `frontend/dist`.

## Known limitations

- No authentication or roles. Anyone with access can place a simulated order. There is no order history route, so no customer record can be read back. Do not expose the app publicly or use real personal data.
- Live AI drafting (Gemini) was verified with one model, `gemini-3.5-flash-lite`, on 2026-11-16 (TC-19). The key is kept only in the gitignored `backend/.env`. Without a key the assistant uses rule-based answers.
- The cart is in memory and empties on browser refresh.
- The cart keeps the stock value from when an item was added; the server re-checks stock at checkout.
- `npm run db:seed` deletes all orders and products. Do not run it on a database with work to keep.
- Before hosting behind a platform proxy, `trust proxy` must be configured so the assistant rate limit works per visitor (see `DEPLOYMENT_PLAN.md`).

## Local startup

Follow `README.md` from the project root. Changes from the original instructions:

1. The PostgreSQL user is created with `CREATEDB`:
   `CREATE USER shopsmart_user WITH PASSWORD 'shopsmart_dev' CREATEDB;`
   For an existing user: `ALTER USER shopsmart_user CREATEDB;`
2. If `CREATEDB` cannot be granted, use `npm run db:deploy` instead of `npm run db:migrate`.

Short sequence for an evaluator:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run check
npm run dev
```

Then open http://localhost:5173 and http://localhost:3000/api/health.

Optional AI configuration: the assistant works without any key, using rule-based answers. To turn on Gemini drafting, set these in `backend/.env` (never commit this file) and restart `npm run dev`:

```env
GEMINI_API_KEY=<your own key from Google AI Studio>
GEMINI_MODEL=gemini-3.5-flash-lite
```

## Team record

Each member completes one row.

| Member | Test they ran | Contribution | Issue they can explain |
| --- | --- | --- | --- |
|Wendy | | | |
|Justine | | | |
|Harman | | | |
