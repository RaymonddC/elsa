#!/bin/bash
# ============================================
# ELSA VM Setup Script
# Run this once on a fresh Google Compute Engine VM
# ============================================

set -e

echo "==> Installing Docker..."
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

echo "==> Installing Docker Compose plugin..."
sudo apt-get install -y docker-compose-plugin

echo "==> Cloning ELSA repo..."
git clone https://github.com/RaymonddC/elsa.git
cd elsa

echo "==> Starting Elasticsearch + Kibana..."
docker compose -f docker-compose.prod.yml up -d

echo "==> Setting up auto-start on reboot..."
(crontab -l 2>/dev/null; echo "@reboot cd /home/$(whoami)/elsa && docker compose -f docker-compose.prod.yml up -d") | crontab -

echo "==> Done! Services starting..."
echo "Elasticsearch: http://localhost:9200"
echo "Kibana:        http://localhost:5601"

docker compose -f docker-compose.prod.yml ps
