# ShopSmart AWS Deployment Record

This record shows what I actually did on AWS, step by step, with redacted evidence. `DEPLOYMENT_PLAN.md` explains the design and the reasons behind it.

| Item | Value |
| --- | --- |
| Code version | `main` of `Wendy-Calma/eCommerce_ShopSmart`, commit `4483dc9` "Add EC2 setup script and Amplify build settings" |
| AWS plan | Free plan, US$49.40 in credits remaining on 2026-11-20, free access ends 2027-03-21 |
| Region | `us-east-1` (US East, N. Virginia) |
| Frontend URL | https://main.d11z4ftrtpat7n.amplifyapp.com |
| API URL | https://54-81-129-203.sslip.io/api |
| Release status | **Hosted**, deployed and tested on 2026-11-20 |

Private details (account ID, customer session tokens, passwords, `DATABASE_URL`, `GEMINI_API_KEY`) do not appear in any screenshot. The account ID and the session tokens are blacked out where the console or API showed them.

## 1. Account setup (2026-11-20)

### 1.1 First account: locked to Sydney

| Step | What I did | Result | Evidence |
| --- | --- | --- | --- |
| Plan and credits | Checked Billing and Cost Management before creating anything | Free plan, US$100.00 in credits, 182 days remaining (until May 20, 2027), US$0.00 spent this month | `screenshots/aws/26-aws-free-plan-credits.png` |
| Sign-in protection | Registered an authenticator app as an MFA device on my AWS Builder ID and added a recovery email | MFA device listed with type TOTP, registered Nov 20, 2026 | `screenshots/aws/27-aws-builder-id-mfa.png` |
| Spending alert | Created a zero-spend budget from the Billing template | `My Zero-Spend Budget` created, threshold OK, US$0.00 used | `screenshots/aws/28-aws-zero-spend-budget.png` |
| Alert email | Added my email as the budget recipient | AWS now requires recipients to verify their address; status Pending until I open the verification email | `screenshots/aws/29-aws-budget-email-verification.png` |
| Region | Tried to open RDS in N. Virginia (`us-east-1`), the Region in my first plan | Blocked: "Your project is assigned to Asia Pacific (Sydney) ap-southeast-2 … To access other commercial AWS Regions, upgrade your plan first." | `screenshots/aws/30-aws-region-locked-to-sydney.png` |

### 1.2 Account used for the deployment: N. Virginia

I deployed ShopSmart in a Free plan account whose project is in `us-east-1`, so I could use N. Virginia without upgrading to a Paid plan. I created no resources in the Sydney account.

| Step | What I did | Result | Evidence |
| --- | --- | --- | --- |
| Plan and credits | Checked the plan before creating anything | Free plan, US$49.40 in credits remaining, 122 days remaining (until March 21, 2027). When the credits run out, AWS stops the services instead of charging | `screenshots/aws/77-aws-us-east-1-free-plan-credits.png` |
| Other resources in the account | Checked the EC2 instance list | One unrelated instance, `askrizza-prod` (`c7i-flex.large`), was running and using the same credits. It is not part of ShopSmart and is kept stopped while my demo runs | `screenshots/aws/33-ec2-instances.png` |

### What I learned

- On the Free plan, AWS sign-in uses an AWS Builder ID, so MFA is set up on the Builder ID security page, not on an IAM user. IAM users are now meant only for programmatic access.
- A Free plan project is tied to one Region. Upgrading to reach another Region would also remove the Free plan's protection against charges once credits run out, so I used an account that was already in the Region I needed instead of upgrading.
- Every resource in an account uses the same credits. An unrelated instance that runs all day can use up the credits faster than my whole ShopSmart setup.

## 2. Resources created

Every ShopSmart resource is in `us-east-1`. I add each one here when I create it, so cleanup cannot miss anything.

| Service | Resource | Created | Notes |
| --- | --- | --- | --- |
| Billing | `My Zero-Spend Budget` (Sydney account) | 2026-11-20 | Free |
| RDS | `calma-w-shopsmart-db`: PostgreSQL, `db.t4g.micro`, `us-east-1c`, database `shopsmart`, master user `shopsmart_admin`, not publicly accessible | 2026-11-20 | Uses credits while it exists |
| EC2 | `calma.w-shopsmart-api` (`i-030f6ce780eff48b2`): `t3.micro`, Amazon Linux 2023, `us-east-1c`, with its EBS volume | 2026-11-20 | Uses credits while it exists |
| EC2 | Elastic IP `calma.w-shopsmart-ip`: `54.81.129.203`, associated with `i-030f6ce780eff48b2` | 2026-11-20 | Public IPv4 is charged per hour |
| EC2 | Security group `calma.w-shopsmart-api-sg` (`sg-0b856de7db312af77`) | 2026-11-20 | Free |
| EC2 | Security group `calma.w-shopsmart-db-sg` (`sg-0d42b4662eff83947`) | 2026-11-20 | Free |
| Amplify | `eCommerce_ShopSmart` (App ID `d11z4ftrtpat7n`), branch `main` | 2026-11-20 | Build minutes and hosting use credits |

## 3. AWS resources

| Step | What I did | Result | Evidence |
| --- | --- | --- | --- |
| Database | Created the PostgreSQL database on RDS | `calma-w-shopsmart-db` Available, `db.t4g.micro`, `us-east-1c` | `screenshots/aws/31-rds-database.png` |
| Database access | Checked the connectivity settings | Publicly accessible: No; security group `calma.w-shopsmart-db-sg`; port 5432 | `screenshots/aws/32-rds-connectivity.png` |
| API instance | Launched the EC2 instance | `calma.w-shopsmart-api`, `t3.micro`, Running | `screenshots/aws/33-ec2-instances.png` |
| Stable address | Allocated an Elastic IP and associated it with the instance | `54.81.129.203` associated with `i-030f6ce780eff48b2` | `screenshots/aws/34-ec2-elastic-ip.png` |
| Before setup | Opened `54.81.129.203` in a browser | Connection refused, as expected, because no web server was running yet | `screenshots/aws/35-ec2-refused-before-setup.png` |
| Database firewall | Allowed PostgreSQL only from the API security group | One inbound rule: PostgreSQL, TCP 5432, source `sg-0b856de7db312af77` | `screenshots/aws/36-db-security-group.png` |
| API firewall | Opened web traffic and limited SSH | HTTPS 443 and HTTP 80 from `0.0.0.0/0`; SSH 22 from my IP and from the EC2 Instance Connect prefix list; port 3000 not opened | `screenshots/aws/37-api-security-group.png` |

## 4. API server setup

I connected with EC2 Instance Connect and ran `deploy/ec2-setup.sh` (section 4 of the plan).

| Step | What I did | Result | Evidence |
| --- | --- | --- | --- |
| Packages | `sudo dnf install -y git nginx nodejs22` | Git 2.50.1, Nginx 1.30.7 and Node.js 22.23.5 installed | `screenshots/aws/38-ec2-install-packages.png` |
| Clone | `API_HOST=54-81-129-203.sslip.io bash ec2-setup.sh` | Repository cloned into `/opt/shopsmart`, then Git stopped with "detected dubious ownership" (problem P2) | `screenshots/aws/39-ec2-git-dubious-ownership.png` |
| Settings file | Marked `/opt/shopsmart` as a safe directory and ran the script again | Commit `4483dc9` deployed; `/etc/shopsmart/api.env` created for me to fill in | `screenshots/aws/40-ec2-api-env-created.png` |
| Secrets | Entered `DATABASE_URL` and `GEMINI_API_KEY` in `/etc/shopsmart/api.env` with `sudo nano` | File owned by root, mode 600; not shown in any screenshot | None, on purpose |
| Install, migrate, start | Ran the script again | `prisma migrate deploy` applied the committed migrations; `shopsmart-api` enabled and started; local readiness check `{"status":"ok","database":"ok"}`; Nginx configuration valid; Let's Encrypt certificate for `54-81-129-203.sslip.io`, expiring 2027-02-18, with automatic renewal | `screenshots/aws/41-ec2-setup-complete.png` |
| Products | Ran the seed script once on the empty database | "Seeded 6 ShopSmart products." I will not run it again, because it deletes all orders | `screenshots/aws/42-ec2-seed.png` |
| API from my browser | Opened `/api/products` and `/api/health/ready` | Six products over HTTPS; `{"status":"ok","database":"ok"}` | `screenshots/aws/43-api-products.png`, `44-api-health-ready.png` |
| Frontend | Created the Amplify app from GitHub `main`, with `VITE_API_URL=https://54-81-129-203.sslip.io/api` and the SPA rewrite rule | Build uses `amplify.yml` from the repository root; site at `https://main.d11z4ftrtpat7n.amplifyapp.com` | `screenshots/aws/45-amplify-app.png` |
| CORS | Set `FRONTEND_URL=https://main.d11z4ftrtpat7n.amplifyapp.com` and ran `sudo systemctl restart shopsmart-api` | Service active (running), enabled at boot, listening on `127.0.0.1:3000`; readiness check 200 | `screenshots/aws/46-api-service-status.png` |

### Migration history on RDS

| Migration | Applied by |
| --- | --- |
| `20260924093739_initial_schema` | `npm run db:deploy` (`prisma migrate deploy`) on 2026-11-20 |
| `20261119112252_add_users_and_sessions` | `npm run db:deploy` (`prisma migrate deploy`) on 2026-11-20 |

Data decision: RDS started empty, so I seeded it once. From now on, only `db:deploy` touches the schema, and I never run `db:migrate` or `db:seed` against RDS.

## 5. Hosted tests (2026-11-20)

I ran every test against the real URLs, in a browser or with Bruno, using fictional customers and simulated checkout. For each one I wrote the expected result first.

### 5.1 Customer journey in the browser

| # | Check | Expected | Observed | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| H1 | Catalog | Six products load from the API | All six products with current prices and stock | Pass | `47-hosted-catalog.png` |
| H2 | Direct route | Refreshing `/cart` still shows the app | The cart page loaded after a refresh | Pass | Observed in the browser |
| H3 | Account creation | A customer can create an account and is signed in | Account created; navigation shows My orders and Sign out | Pass | `48-hosted-create-account.png`, `49-hosted-signed-in.png` |
| H4 | Cart | Items are added and the total is correct | Wireless Mouse ₱650 + Compact Mechanical Keyboard ₱1,850 = ₱2,500 | Pass | `50-hosted-added-to-cart.png`, `51-hosted-cart.png` |
| H5 | Simulated checkout | A valid order is saved | Order #1 received, total ₱2,500.00 | Pass | `52-hosted-checkout.png`, `53-hosted-order-received.png` |
| H6 | My orders | The customer sees their own order | Order #1, status PENDING, no payment collected | Pass | `54-hosted-my-orders.png` |
| H7 | Assistant match | "Which keyboard is below 2,000" finds product 2 at its current price | Compact Mechanical Keyboard, ₱1,850, 7 in stock, labeled "AI-drafted, verified against the catalog", source Product #2 | Pass | `55-hosted-assistant-match.png` |
| H8 | Assistant no match | "do you have gaming chair?" gets an honest answer | "I could not find an in-stock product matching 'gaming chair'", labeled "Answered from catalog data", 0 sources | Pass | `56-hosted-assistant-no-match.png` |
| H9 | Incorrect sign-in | Sign-in is refused | "The email or password is incorrect." | Pass | `57-hosted-sign-in-refused.png` |
| H10 | Cart after refresh | The cart empties, because it is kept in memory only (TC-05) | The cart emptied after a refresh | Pass, by design | Observed in the browser |

### 5.2 Access control by direct API request (Bruno)

Base URL `https://54-81-129-203.sslip.io/api`. Ana Reyes (`ana.test@example.com`) and Ben Cruz (`ben.test@example.com`) are fictional customers. Their tokens are blacked out.

| # | Request | Token | Expected | Observed | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| A1 | `GET /orders` | None | 401 | 401 `AUTH_REQUIRED` | Pass | `58-api-guest-list-401.png` |
| A2 | `GET /orders/1` | None | 401 | 401 `AUTH_REQUIRED` | Pass | `59-api-guest-read-401.png` |
| A3 | `POST /orders` | None | 401 | 401 `AUTH_REQUIRED` | Pass | `60-api-guest-create-401.png` |
| A4 | `POST /auth/register` (Ana Reyes) | None | 201 | 201, user id 2 | Pass | `61-api-register-ana.png` |
| A5 | `POST /auth/register` (Ben Cruz) | None | 201 | 201, user id 3 | Pass | `62-api-register-ben.png` |
| A6 | `POST /orders`, 1 × Wireless Mouse | Ana | 201 owned by Ana | 201, order #2, `userId: 2`, total 650 | Pass | `63-api-ana-order-201.png` |
| A7 | `GET /orders/2` | Ana (owner) | 200 | 200, order #2 | Pass | `64-api-ana-reads-own-order-200.png` |
| A8 | `GET /orders/2` | Ben | 404 | 404 `ORDER_NOT_FOUND` | Pass | `65-api-ben-reads-ana-order-404.png` |
| A9 | `GET /orders` | Ben | 200, empty list | 200 `{"orders":[]}` | Pass | `66-api-ben-order-list-empty.png` |
| A10 | `GET /orders/1` | Ben | 404 | 404 `ORDER_NOT_FOUND` | Pass | `67-api-ben-reads-order1-404.png` |

### 5.3 Checkout validation

| # | Check | Expected | Observed | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| V1 | Browser checkout as Ana with email `ana.test@example` | Order refused; the page names the field | "Check the customer and cart information. Please correct: email address." Cart still holds the Laptop Stand | Pass | `68-hosted-checkout-invalid-email-form.png`, `69-hosted-checkout-invalid-email-refused.png` |
| V2 | Add to cart on 1080p Webcam more times than its stock of 6 | Cart stops at 6 | Quantity 6, + button disabled, total ₱8,700 | Pass | `70-hosted-cart-stock-limit.png` |
| V3 | `POST /orders`, 7 × 1080p Webcam, Ana's token | 409 | 409 `INSUFFICIENT_STOCK`, "Only 6 unit(s) of 1080p Webcam are available." | Pass | `71-api-over-stock-409.png` |
| V4 | `POST /orders` with `"email": "bad"`, Ana's token | 422 | 422 `INVALID_ORDER`, `fieldErrors.email: "Invalid email address"` | Pass | `72-api-invalid-email-422.png` |
| V5 | `GET /products/4` after V3 and V4 | Stock unchanged | `"stock": 6` | Pass | `73-api-stock-unchanged.png` |

### 5.4 Restart

| # | Check | Expected | Observed | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| R1 | `sudo systemctl restart shopsmart-api` | Service comes back; readiness 200 | Active (running); `GET /api/health/ready 200` in the log | Pass | `46-api-service-status.png` |
| R2 | `sudo reboot` of the instance | The API starts by itself; products and orders remain | After the reboot the catalog loaded and order #1 was still listed | Pass | `74-ec2-reboot.png`, `75-hosted-catalog-after-reboot.png`, `76-hosted-my-orders-after-reboot.png` |

## 6. Problems I met and how I fixed them

| # | Problem | Cause | Fix |
| --- | --- | --- | --- |
| P1 | EC2 Instance Connect: "Error establishing SSH connection to your instance" | SSH was allowed only from my own IP, but Instance Connect connects from AWS addresses | Added an SSH rule from the prefix list `com.amazonaws.us-east-1.ec2-instance-connect` |
| P2 | Git: "detected dubious ownership in repository at '/opt/shopsmart'" | The folder owner did not match the user running Git through `sudo` | Ran `sudo git config --system --add safe.directory /opt/shopsmart`; the script now does this itself |
| P3 | My edits to `/etc/shopsmart/api.env` were replaced by the blank template | The script checked whether the file existed without `sudo`, could not see inside the root-only folder, and created the file again | Changed the check to `sudo test -f` and entered the settings again |
| P4 | `prisma migrate deploy`: "The environment variable `DATABASE_URL` resolved to an empty string" | The shell read the `&` in `...schema=public&sslmode=require` as "run in the background" when it loaded the settings file | Put the value in single quotes; the script now reads the line without running it as shell code |
| P5 | I sent an order body to `/api/auth/register` by mistake in Bruno | Wrong URL | 422 `INVALID_ACCOUNT`, nothing created; resent to `/api/orders` |

The fixed `deploy/ec2-setup.sh` is committed with this record.

## 7. Still to do

- Remove every resource in section 2 after grading, as listed in section 10 of the plan, and check Billing afterwards.
