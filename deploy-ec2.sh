#!/bin/bash
set -e

echo "=========================================================="
echo "🏥 HIMS Backend — EC2 Docker Compose + Caddy SSL Deployment"
echo "=========================================================="

# 1. Install Docker & Docker Compose Plugin if missing
if ! command -v docker &> /dev/null; then
    echo "📦 Installing Docker and Docker Compose Plugin..."
    sudo apt-get update
    sudo apt-get install -y ca-certificates curl gnupg lsb-release
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    sudo usermod -aG docker "$USER"
    echo "✅ Docker installed successfully."
fi

# 2. Detect EC2 Public IP
EC2_IP=$(curl -s http://checkip.amazonaws.com || curl -s ifconfig.me || echo "")
echo "🌐 Detected EC2 Public IP: ${EC2_IP:-'<unable to auto-detect>'}"

# 3. Check for .env file
if [ ! -f .env ]; then
    echo "📝 Creating .env from .env.example..."
    cp .env.example .env

    if [ -n "$EC2_IP" ]; then
        sed -i "s/DOMAIN=.*/DOMAIN=${EC2_IP}.nip.io/" .env
    fi

    echo "⚠️  PLEASE UPDATE .env WITH YOUR REAL SUPABASE CREDENTIALS:"
    echo "    nano .env"
    echo "Then re-run this script: ./deploy-ec2.sh"
    exit 1
fi

# 4. Build and start containers with Docker Compose
echo "🚀 Building and starting containers (hims-backend + Caddy SSL)..."
docker compose down || true
docker compose up -d --build

echo "=========================================================="
echo "✅ Backend successfully deployed!"
echo "----------------------------------------------------------"
echo "📊 Check Status:      docker compose ps"
echo "📜 View Logs:         docker compose logs -f"
echo ""
echo "🔗 Access Endpoints:"
if [ -n "$EC2_IP" ]; then
    echo "  • Direct HTTP:      http://${EC2_IP}:3000/health"
    echo "  • Standard HTTP:    http://${EC2_IP}/health"
    echo "  • Automatic HTTPS:  https://${EC2_IP}.nip.io/health"
else
    echo "  • Localhost:        http://localhost:3000/health"
fi
echo "=========================================================="
