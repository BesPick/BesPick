# EC2 Setup Guide (Holocron)

This is a simple, step-by-step guide to run the BESPIN Holocron app on an AWS EC2
Ubuntu server.

You will set up:

1) The app (Node, npm, git, systemd, deploy command)
2) Nginx + Cloudflare SSL (so the site works on your domain)

---

## 0) You need these first

- An AWS account
- A domain name (example: `holocron.aodom.dev`)
- An EC2 instance running **Ubuntu 22.04**
- The repo URL for this project

---

## 1) Create the EC2 instance

1. Open AWS Console -> EC2 -> Instances -> Launch Instance.
2. Choose **Ubuntu 22.04**.
3. Choose a small instance (t2.micro or t3.micro is fine).
4. Create or select a key pair (you will use this to log in).

### Security Group rules (very important)

Add these inbound rules:

- SSH (22) from **My IP**
- HTTP (80) from **0.0.0.0/0**
- HTTPS (443) from **0.0.0.0/0**

If you want to run dev server on port 3001, add:

- Custom TCP (3001) from **My IP**

---

## 2) Connect to the server

From your computer:

```bash
ssh -i /path/to/your-key.pem ubuntu@<EC2_PUBLIC_IP>
```

---

## 3) Install system tools + Node

```bash
sudo apt update
sudo apt install -y git build-essential python3 curl nginx

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20.11.1
nvm use 20.11.1
node -v
```

---

## 4) Clone the repo and install dependencies

```bash
git clone <repo-url> holocron
cd holocron/bespick
npm install
```

---

## 5) Create the .env file

```bash
nano /home/ubuntu/holocron/bespick/.env
```

Paste your real keys:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in

NEXT_PUBLIC_PAYPAL_CLIENT_ID=...
NEXT_PUBLIC_PAYPAL_CURRENCY=USD
NEXT_PUBLIC_PAYPAL_BUYER_COUNTRY=US
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_ENVIRONMENT=sandbox
PAYPAL_BRAND_NAME=Morale
```

Save and exit (Ctrl+O, Enter, Ctrl+X).

---

## 6) Create the systemd service

```bash
sudo tee /etc/systemd/system/holocron.service >/dev/null <<'EOF'
[Unit]
Description=Holocron Next.js App
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/holocron/bespick
Environment=NODE_ENV=production
Environment=PATH=/home/ubuntu/.nvm/versions/node/v20.11.1/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ExecStart=/home/ubuntu/.nvm/versions/node/v20.11.1/bin/npm start
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable holocron
```

Note: this project uses Next.js standalone output, so `npm start` runs the
`.next/standalone/server.js` build (the deploy script copies `public`
and `.next/static` into the standalone folder).

---

## 7) Make the deploy command work

```bash
cd /home/ubuntu/holocron/bespick
chmod +x scripts/deploy.sh
```

Now you can deploy with:

```bash
npm run deploy
```

This script:

- Updates systemd env vars with the app version + git SHA
- Builds the app
- Restarts the service

---

## 8) Build and start the app

```bash
cd /home/ubuntu/holocron/bespick
npm run build
sudo systemctl start holocron
```

Check if it is running:

```bash
sudo systemctl status holocron
```

---

## 9) Set up Nginx (reverse proxy)

```bash
sudo tee /etc/nginx/sites-available/holocron >/dev/null <<'EOF'
server {
  listen 80;
  server_name holocron.aodom.dev;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
EOF

sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -s /etc/nginx/sites-available/holocron /etc/nginx/sites-enabled/holocron
sudo nginx -t
sudo systemctl restart nginx
```

Test:

```bash
curl -I http://127.0.0.1:3000
curl -I http://127.0.0.1
```

---

## 10) Cloudflare + SSL (recommended)

### Cloudflare DNS

1. Add an **A record** for `holocron.aodom.dev` -> your EC2 public IP.
2. Set it to **Proxied** (orange cloud).
3. In Cloudflare SSL/TLS, choose **Full (strict)**.

### Create an Origin Certificate

1. Cloudflare -> SSL/TLS -> Origin Server -> Create Certificate.
2. Save the certificate + key on the server:

```bash
sudo mkdir -p /etc/ssl/cloudflare
sudo tee /etc/ssl/cloudflare/holocron.aodom.dev.pem >/dev/null <<'EOF'
# PASTE ORIGIN CERT HERE
EOF
sudo tee /etc/ssl/cloudflare/holocron.aodom.dev.key >/dev/null <<'EOF'
# PASTE PRIVATE KEY HERE
EOF
sudo chmod 600 /etc/ssl/cloudflare/holocron.aodom.dev.key
```

### Update Nginx for HTTPS

```bash
sudo tee /etc/nginx/sites-available/holocron >/dev/null <<'EOF'
server {
  listen 80;
  server_name holocron.aodom.dev;
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl;
  server_name holocron.aodom.dev;

  ssl_certificate /etc/ssl/cloudflare/holocron.aodom.dev.pem;
  ssl_certificate_key /etc/ssl/cloudflare/holocron.aodom.dev.key;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
EOF

sudo nginx -t
sudo systemctl restart nginx
```

---

## 11) Normal updates (deploy new code)

```bash
cd /home/ubuntu/holocron/bespick
git pull
npm run deploy
```

---

## Troubleshooting

- **Site down**: `sudo systemctl status holocron` and `sudo journalctl -u holocron -n 200 --no-pager`
- **Nginx error**: `sudo nginx -t` then `sudo systemctl restart nginx`
- **Build crashes**: add swap on tiny instances:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```
