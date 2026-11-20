# ShopSmart API examples

Start the application with `npm run dev`, then send these requests through Bruno or another authorized API client.

## Health check

```http
GET http://localhost:3000/api/health
```

## Product list

```http
GET http://localhost:3000/api/products
```

## One product

```http
GET http://localhost:3000/api/products/1
```

## Readiness check (API and database)

```http
GET http://localhost:3000/api/health/ready
```

Returns `{"status":"ok","database":"ok"}`, or HTTP 503 `{"status":"error","database":"unreachable"}` when PostgreSQL cannot be reached.

## Create a customer account

```http
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "name": "Ana Reyes",
  "email": "ana.test@example.com",
  "password": "fictional-pass-1"
}
```

Returns HTTP 201 with `{ "token": "...", "user": { "id", "name", "email" } }`. Use fictional details only.

## Sign in

```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "ana.test@example.com",
  "password": "fictional-pass-1"
}
```

A wrong email or password returns HTTP 401 `INVALID_CREDENTIALS`. Send the returned token on protected requests as `Authorization: Bearer <token>`. Never paste a real token into a screenshot or chat.

## Current customer and sign out

```http
GET http://localhost:3000/api/auth/me
Authorization: Bearer <token>
```

```http
POST http://localhost:3000/api/auth/logout
Authorization: Bearer <token>
```

Sign out returns HTTP 204, and the token stops working.

## Create a simulated order (signed in)

```http
POST http://localhost:3000/api/orders
Content-Type: application/json
Authorization: Bearer <token>

{
  "customerName": "Ana Reyes",
  "email": "ana@example.com",
  "address": "Angeles City, Pampanga",
  "items": [
    { "productId": 1, "quantity": 1 },
    { "productId": 2, "quantity": 1 }
  ]
}
```

The server ignores prices from the browser and reads authoritative prices from PostgreSQL.

Without a token the API returns HTTP 401 `AUTH_REQUIRED`.

## List and read your own orders

```http
GET http://localhost:3000/api/orders
Authorization: Bearer <token>
```

```http
GET http://localhost:3000/api/orders/6
Authorization: Bearer <token>
```

Only the signed-in customer's orders are returned. Reading another customer's order returns HTTP 404 `ORDER_NOT_FOUND`, the same as an order that does not exist, so the API does not reveal which order numbers belong to other people.

## Ask the starter assistant

```http
POST http://localhost:3000/api/assistant/questions
Content-Type: application/json

{
  "question": "Which keyboard is below ₱2,000?"
}
```
