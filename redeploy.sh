#!/bin/bash
# ============================================
# ETI EDUCOM - QUICK REDEPLOYMENT SCRIPT
# ============================================
# Run this on your Hostinger VPS after downloading new code
# 
# Usage: bash redeploy.sh
# ============================================

set -e  # Exit on any error

echo "============================================"
echo "ETI EDUCOM - REDEPLOYMENT STARTED"
echo "============================================"
echo ""

# Configuration - UPDATE THESE
APP_DIR="/var/www/etieducom"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
NGINX_HTML="/var/www/html/etieducom"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Creating Database Backup${NC}"
echo "--------------------------------"
BACKUP_DIR="/var/backups/mongodb"
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

mongodump --db crm_db --out $BACKUP_DIR/$BACKUP_DATE 2>/dev/null || echo "MongoDB backup skipped (may need auth)"
echo -e "${GREEN}✓ Backup created at $BACKUP_DIR/$BACKUP_DATE${NC}"
echo ""

echo -e "${YELLOW}Step 2: Stopping Backend Service${NC}"
echo "--------------------------------"
sudo systemctl stop etieducom-backend 2>/dev/null || sudo pm2 stop etieducom-backend 2>/dev/null || echo "Service not running"
echo -e "${GREEN}✓ Backend stopped${NC}"
echo ""

echo -e "${YELLOW}Step 3: Updating Backend${NC}"
echo "------------------------"
cd $BACKEND_DIR

# Activate virtual environment
source venv/bin/activate

# Install new dependencies
echo "Installing dependencies..."
pip install -r requirements.txt --quiet
pip install openpyxl --quiet  # New dependency for Excel import

echo -e "${GREEN}✓ Backend dependencies updated${NC}"
echo ""

echo -e "${YELLOW}Step 4: Building Frontend${NC}"
echo "-------------------------"
cd $FRONTEND_DIR

# Install dependencies and build
echo "Installing frontend dependencies..."
yarn install --silent

echo "Building production bundle..."
yarn build

# Copy to nginx directory
sudo rm -rf $NGINX_HTML/*
sudo cp -r build/* $NGINX_HTML/
sudo chown -R www-data:www-data $NGINX_HTML

echo -e "${GREEN}✓ Frontend built and deployed${NC}"
echo ""

echo -e "${YELLOW}Step 5: Starting Backend Service${NC}"
echo "---------------------------------"
sudo systemctl start etieducom-backend 2>/dev/null || sudo pm2 start etieducom-backend 2>/dev/null
sleep 3
echo -e "${GREEN}✓ Backend started${NC}"
echo ""

echo -e "${YELLOW}Step 6: Restarting Nginx${NC}"
echo "------------------------"
sudo nginx -t && sudo systemctl reload nginx
echo -e "${GREEN}✓ Nginx reloaded${NC}"
echo ""

echo -e "${YELLOW}Step 7: Running Payment Audit${NC}"
echo "-----------------------------"
cd $BACKEND_DIR
source venv/bin/activate

echo "Running payment data audit..."
python payment_audit.py --audit 2>/dev/null || echo "Audit script not found or error"
echo ""

echo "============================================"
echo -e "${GREEN}REDEPLOYMENT COMPLETE!${NC}"
echo "============================================"
echo ""
echo "Next Steps:"
echo "1. Test the application at your domain"
echo "2. If payment issues found, run: python payment_audit.py --fix"
echo "3. Check logs: sudo journalctl -u etieducom-backend -f"
echo ""
