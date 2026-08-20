# Nginx & SSL Setup Guide for AWS EC2

This guide explains how to configure Nginx as a reverse proxy with SSL (Let's Encrypt / Certbot) for the FastAPI backend on your Ubuntu EC2 instance.

---

## 1. Prerequisites on EC2

* Ports **80 (HTTP)** and **443 (HTTPS)** must be open in your **AWS EC2 Security Group** inbound rules.
* Port **8000** must **NOT** be exposed publicly (it is bound locally to `127.0.0.1:8000`).
* Your domain DNS A-record (e.g. `api.yourdomain.com`) should point to the EC2 Public IP address.

---

## 2. Install Nginx & Certbot on Ubuntu

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

---

## 3. Configure Nginx

1. Copy the configuration file:
   ```bash
   sudo cp nginx/picksy.conf /etc/nginx/sites-available/picksy.conf
   ```

2. Replace `YOUR_DOMAIN` with your actual domain (e.g. `api.yourdomain.com`):
   ```bash
   sudo sed -i 's/YOUR_DOMAIN/api.yourdomain.com/g' /etc/nginx/sites-available/picksy.conf
   ```

3. Enable the site and remove the default site:
   ```bash
   sudo ln -sf /etc/nginx/sites-available/picksy.conf /etc/nginx/sites-enabled/
   sudo rm -f /etc/nginx/sites-enabled/default
   ```

4. Test Nginx configuration syntax:
   ```bash
   sudo nginx -t
   ```

---

## 4. Obtain SSL Certificate with Certbot

Run Certbot to generate the Let's Encrypt SSL certificate and automatically verify your domain:

```bash
sudo certbot --nginx -d api.yourdomain.com
```

Certbot will automatically verify the challenge, place the certificates in `/etc/letsencrypt/live/api.yourdomain.com/`, and reload Nginx.

---

## 5. Verify the Setup

1. Start your backend container using Docker Compose:
   ```bash
   docker compose up -d --build
   ```

2. Check the health endpoint from outside:
   ```bash
   curl https://api.yourdomain.com/health
   ```
   You should receive:
   ```json
   {"status":"ok","products_indexed":...}
   ```
