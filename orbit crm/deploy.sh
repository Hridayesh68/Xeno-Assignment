#!/bin/bash
# Xeno CRM - AWS EC2 Bootstrapping and Deployment Automation Script
# Supported OS: Ubuntu 24.04 LTS

set -e

# Configuration variables
DOMAIN_API="api.yourdomain.com"
DOMAIN_CHANNEL="channel.yourdomain.com"
EMAIL_ADMIN="admin@yourdomain.com"

echo "====================================================================="
echo "  🚀 STARTING XENO CRM PRODUCTION DEPLOYMENT BOOTSTRAP"
echo "====================================================================="

# 1. Update OS package list
echo "🔄 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# 2. Configure UFW Firewall
echo "🔒 Configuring Firewall (UFW)..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw --force enable
sudo ufw status verbose

# 3. Install Docker & Docker Compose
echo "🐳 Installing Docker & Docker Compose..."
sudo apt install -y docker.io docker-compose-v2 curl
sudo systemctl enable --now docker

# Add ubuntu user to docker group (requires logout/re-login to take effect, or sudo fallback)
sudo usermod -aG docker ubuntu || true

# 4. Install Certbot (Let's Encrypt client)
echo "🔑 Installing Certbot..."
sudo apt install -y certbot

# 5. Acquire SSL Certificates
# Stop Nginx if it's already running to free port 80 for stand-alone mode
echo "🛡️ Stopping any port 80 servers..."
sudo systemctl stop nginx 2>/dev/null || true
docker compose down || true

echo "📜 Acquiring Let's Encrypt SSL Certificates via Certbot Standalone..."
# Request certificates for both subdomains
sudo certbot certonly --standalone \
  -d "$DOMAIN_API" \
  -d "$DOMAIN_CHANNEL" \
  --non-interactive \
  --agree-tos \
  -m "$EMAIL_ADMIN" \
  --preferred-challenges http

# Set up local symlink paths if needed, or docker-compose volume mounts:
# Docker Compose volume mounts: ./certs -> /etc/letsencrypt
# We'll copy or link the certificates to the ./certs folder in orbit-crm
echo "🔗 Mapping Let's Encrypt certificates into Docker directory..."
mkdir -p certs certs-data
sudo cp -rL /etc/letsencrypt/* ./certs/
sudo chown -R ubuntu:ubuntu certs/

# 6. Configure Environment variables
if [ ! -f .env ]; then
  echo "📄 Creating default .env file from .env.example..."
  cp .env.example .env
  echo "⚠️  CRITICAL: Please edit the .env file with your production secrets/Supabase credentials!"
  echo "Example command: nano .env"
fi

# 7. Start Containers
echo "🚢 Launching Docker Containers..."
docker compose up -d --build

# Wait for database availability and container startup
echo "🕒 Waiting 15 seconds for containers to initialize..."
sleep 15

# 8. Run Alembic Migrations
echo "📦 Running Alembic Database Migrations..."
docker compose exec -T crm-api alembic upgrade head

# 9. Seed database with realistic mock data (if needed)
echo "🌱 Seeding Database with dummy customers & orders..."
docker compose exec -T crm-api python seed.py

# 10. Verification
echo "✅ DEPLOYMENT SYSTEM READY! Verifying health..."
docker compose ps

echo "CRM API Health Status:"
curl -fs http://localhost:8000/health || echo "❌ CRM API Health Check Failed"

echo "Channel Service Health Status:"
curl -fs http://localhost:8001/health || echo "❌ Channel Service Health Check Failed"

echo "====================================================================="
echo "  🎉 SUCCESS: Deployment Complete! Verify public domains:"
echo "  API: https://$DOMAIN_API/health"
echo "  Simulator: https://$DOMAIN_CHANNEL/health"
echo "====================================================================="
