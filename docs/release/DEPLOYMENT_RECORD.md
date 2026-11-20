# ShopSmart AWS Deployment Record

This record shows what I actually did on AWS, step by step, with redacted evidence. `DEPLOYMENT_PLAN.md` explains the design and the reasons behind it.

| Item | Value |
| --- | --- |
| Code version | `main` of `Wendy-Calma/eCommerce_ShopSmart`, commit `2fc9fb4` "Ready for Deployment: AWS" |
| AWS plan | Free plan |
| Region | `ap-southeast-2` (Asia Pacific, Sydney) |
| Release status | Not deployed yet: account setup done, AWS resources not created |

Private details (account ID, account name, email addresses) are blacked out in every screenshot.

## 1. Account setup (2026-11-20)

| Step | What I did | Result | Evidence |
| --- | --- | --- | --- |
| Plan and credits | Checked Billing and Cost Management before creating anything | Free plan, US$100.00 in credits, 182 days remaining (until May 20, 2027), US$0.00 spent this month | `screenshots/aws/26-aws-free-plan-credits.png` |
| Sign-in protection | Registered an authenticator app as an MFA device on my AWS Builder ID and added a recovery email | MFA device listed with type TOTP, registered Nov 20, 2026 | `screenshots/aws/27-aws-builder-id-mfa.png` |
| Spending alert | Created a zero-spend budget from the Billing template | `My Zero-Spend Budget` created, threshold OK, US$0.00 used | `screenshots/aws/28-aws-zero-spend-budget.png` |
| Alert email | Added my email as the budget recipient | AWS now requires recipients to verify their address; status Pending until I open the verification email | `screenshots/aws/29-aws-budget-email-verification.png` |
| Region | Tried to open RDS in N. Virginia (`us-east-1`), the Region in my first plan | Blocked: "Your project is assigned to Asia Pacific (Sydney) ap-southeast-2 … To access other commercial AWS Regions, upgrade your plan first." I kept the Free plan and moved my plan to Sydney | `screenshots/aws/30-aws-region-locked-to-sydney.png` |

### What I learned

- On the Free plan, AWS sign-in uses an AWS Builder ID, so MFA is set up on the Builder ID security page, not on an IAM user. IAM users are now meant only for programmatic access.
- A Free plan project is tied to one Region. Upgrading to reach another Region would also remove the Free plan's protection against charges once credits run out, so I changed my Region instead of my plan.
- Budget emails only start after the recipient verifies their address.

## 2. Resources created

Every resource is in `ap-southeast-2`. I add each one here when I create it, so cleanup cannot miss anything.

| Service | Resource | Created | Notes |
| --- | --- | --- | --- |
| Billing | `My Zero-Spend Budget` | 2026-11-20 | Free |
