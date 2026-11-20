#!/usr/bin/env bash
# ShopSmart API setup for one EC2 instance (Amazon Linux 2023).
# Installs Node 22 + Nginx, clones the repo, runs Prisma migrations against RDS,
# runs Express as a systemd service on 127.0.0.1:3000, and puts Nginx + a
# Let's Encrypt certificate in front of it on 443.
#
# Run it as ec2-user (EC2 Instance Connect or SSH):
#   API_HOST=54-81-129-203.sslip.io bash ec2-setup.sh
#
# Safe to run more than once. The first run stops after creating
# /etc/shopsmart/api.env so you can paste in DATABASE_URL yourself;
# secrets never go into this script or the repository.
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/Wendy-Calma/eCommerce_ShopSmart.git}"
GIT_REF="${GIT_REF:-main}"                 # pin a commit hash for the release
API_HOST="${API_HOST:?Set API_HOST, e.g. API_HOST=54-81-129-203.sslip.io}"
CERT_EMAIL="${CERT_EMAIL:-}"               # optional, for Let's Encrypt expiry notices
APP_DIR=/opt/shopsmart
ENV_FILE=/etc/shopsmart/api.env
APP_USER=shopsmart

step() { printf '\n==> %s\n' "$*"; }

# ---------------------------------------------------------------- swap
# A t3.micro has 1 GB RAM; npm ci for both workspaces can run out without swap.
step "Swap"
if ! sudo swapon --show | grep -q /swapfile; then
  sudo dd if=/dev/zero of=/swapfile bs=1M count=1024 status=none
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile >/dev/null
  sudo swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

# ---------------------------------------------------------------- packages
step "Packages: git, nginx, Node.js 22"
sudo dnf install -y git nginx nodejs22 >/dev/null
# AL2023 may install Node 22 as node-22 / npm-22; make plain node/npm/npx exist.
for b in node npm npx; do
  if ! command -v "$b" >/dev/null 2>&1 && command -v "$b-22" >/dev/null 2>&1; then
    sudo ln -sf "$(command -v "$b-22")" "/usr/local/bin/$b"
  fi
done
NODE_BIN="$(command -v node)"
node -e 'const [a,b]=process.versions.node.split(".").map(Number); if (a<20||(a===20&&b<19)) { console.error("Node "+process.versions.node+" is too old (need >=20.19)"); process.exit(1) }'
echo "node $(node --version) at $NODE_BIN, npm $(npm --version)"

# ---------------------------------------------------------------- app user + code
step "App user and code ($GIT_REF)"
id "$APP_USER" >/dev/null 2>&1 || sudo useradd --system --create-home --home-dir /var/lib/$APP_USER --shell /sbin/nologin "$APP_USER"
if [ ! -d "$APP_DIR/.git" ]; then
  sudo git clone "$REPO_URL" "$APP_DIR"
fi
sudo git -C "$APP_DIR" fetch --all --quiet
sudo git -C "$APP_DIR" checkout --quiet "$GIT_REF"
sudo git -C "$APP_DIR" pull --quiet --ff-only 2>/dev/null || true   # no-op when a commit hash is pinned
sudo chown -R "$APP_USER:$APP_USER" "$APP_DIR"
COMMIT="$(sudo git -C "$APP_DIR" rev-parse --short HEAD)"
echo "Deploying commit $COMMIT"

# ---------------------------------------------------------------- server settings
step "Server settings in $ENV_FILE"
if [ ! -f "$ENV_FILE" ]; then
  sudo install -d -m 700 /etc/shopsmart
  sudo tee "$ENV_FILE" >/dev/null <<'EOF'
NODE_ENV=production
PORT=3000
HOST=127.0.0.1
TRUST_PROXY=1
# Exact Amplify origin: scheme + host, no path, no trailing slash
FRONTEND_URL=https://main.CHANGE_ME.amplifyapp.com
# URL-encode special characters in the password (@ -> %40, # -> %23, / -> %2F, : -> %3A)
DATABASE_URL=postgresql://CHANGE_ME_USER:CHANGE_ME_PASSWORD@CHANGE_ME_RDS_ENDPOINT:5432/shopsmart?schema=public&sslmode=require
AI_PROVIDER=gemini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash-lite
AI_TIMEOUT_MS=8000
EOF
  sudo chmod 600 "$ENV_FILE"
  sudo chown root:root "$ENV_FILE"
  echo
  echo "Created $ENV_FILE. Edit it now:  sudo nano $ENV_FILE"
  echo "Fill in DATABASE_URL (and FRONTEND_URL once Amplify gives you its URL), then run this script again."
  exit 0
fi
if sudo grep -q 'CHANGE_ME_' "$ENV_FILE"; then
  echo "DATABASE_URL in $ENV_FILE still has CHANGE_ME placeholders. Edit it:  sudo nano $ENV_FILE"
  exit 1
fi

# Run a command as the app user with the server settings loaded (file stays root-only).
as_app() {
  sudo bash -c "set -a; . '$ENV_FILE'; set +a; cd '$APP_DIR' && runuser -u '$APP_USER' -- env PATH=/usr/local/bin:/usr/bin:/bin HOME=/var/lib/$APP_USER DATABASE_URL=\"\$DATABASE_URL\" $*"
}

# ---------------------------------------------------------------- install + migrate
step "npm ci (dev deps included: Prisma CLI is a dev dependency)"
as_app npm ci --include=dev --no-audit --no-fund

step "Prisma generate"
as_app npm run db:generate

step "Prisma migrate deploy (applies committed migrations only; never resets data)"
as_app npm run db:deploy
as_app npx --workspace backend prisma migrate status || true

# ---------------------------------------------------------------- systemd
step "systemd service shopsmart-api"
sudo tee /etc/systemd/system/shopsmart-api.service >/dev/null <<EOF
[Unit]
Description=ShopSmart API
After=network-online.target
Wants=network-online.target

[Service]
WorkingDirectory=$APP_DIR/backend
EnvironmentFile=$ENV_FILE
ExecStart=$NODE_BIN src/server.js
Restart=on-failure
RestartSec=3
User=$APP_USER

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable --now shopsmart-api
sudo systemctl restart shopsmart-api
sleep 3
echo "Local readiness check:"
curl -fsS http://127.0.0.1:3000/api/health/ready && echo || {
  echo "API is not ready. Logs:"; sudo journalctl -u shopsmart-api -n 40 --no-pager; exit 1; }

# ---------------------------------------------------------------- nginx
step "Nginx reverse proxy for $API_HOST"
sudo tee /etc/nginx/conf.d/shopsmart.conf >/dev/null <<EOF
server {
    listen 80;
    server_name $API_HOST;

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 30s;
    }

    location / {
        return 404;
    }
}
EOF
sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx

# ---------------------------------------------------------------- TLS
step "Let's Encrypt certificate for $API_HOST"
if ! command -v certbot >/dev/null 2>&1; then
  if ! sudo dnf install -y certbot python3-certbot-nginx >/dev/null 2>&1; then
    # Fallback: certbot's documented pip install in its own virtualenv
    sudo dnf install -y python3 augeas-libs >/dev/null
    sudo python3 -m venv /opt/certbot
    sudo /opt/certbot/bin/pip install --quiet --upgrade pip
    sudo /opt/certbot/bin/pip install --quiet certbot certbot-nginx
    sudo ln -sf /opt/certbot/bin/certbot /usr/bin/certbot
  fi
fi
if [ -n "$CERT_EMAIL" ]; then EMAIL_ARGS=(-m "$CERT_EMAIL"); else EMAIL_ARGS=(--register-unsafely-without-email); fi
sudo certbot --nginx -d "$API_HOST" --non-interactive --agree-tos --redirect "${EMAIL_ARGS[@]}"
sudo systemctl enable --now certbot-renew.timer 2>/dev/null || true

step "Done"
echo "Commit:  $COMMIT"
echo "Check from your own computer:"
echo "  curl https://$API_HOST/api/health/ready     -> {\"status\":\"ok\",\"database\":\"ok\"}"
echo "  curl https://$API_HOST/api/products"
echo
echo "First deploy only, while the database is still empty, load the 6 fictional products:"
echo "  sudo bash -c 'set -a; . $ENV_FILE; set +a; cd $APP_DIR && npm run db:seed'"
echo "Never run db:seed again after the first order exists (it deletes all orders)."
