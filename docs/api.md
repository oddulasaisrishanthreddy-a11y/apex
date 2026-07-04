# API Reference (summary)

See `docs/openapi.yaml` for a machine-readable OpenAPI 3.0 summary of the primary endpoints. Below is a short human-friendly list of important routes:

- `POST /api/auth/register` — register a new user (returns temp OTP response)
- `POST /api/auth/login` — login with email/password (returns token stub)
- `GET /api/products` — list products (filters: `category`, `search`, `sortBy`, `sellerId`)
- `GET /api/products/{id}` — get single product with reviews
- `POST /api/products` — create product (admin/seller)
- `PUT /api/products/{id}` — update product
- `DELETE /api/products/{id}` — delete product
- `GET /api/cart/{userId}` — view cart
- `POST /api/cart/{userId}` — add item to cart
- `POST /api/orders` — create order (checkout)
- `POST /api/payments/lock-inventory` — lock inventory for checkout

For full paths and basic request/response shapes, see `docs/openapi.yaml`.
