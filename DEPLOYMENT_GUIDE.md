# ETI Educom - Deployment Guide (Local MongoDB)

## Server Requirements
- **OS**: Ubuntu 22.04 LTS
- **RAM**: 2GB minimum (4GB recommended)
- **CPU**: 2 vCPU
- **Storage**: 40GB SSD

---

## Step 1: Clear Old Project

```bash
# Stop old services
sudo systemctl stop bms 2>/dev/null
sudo systemctl disable bms 2>/dev/null
sudo rm -f /etc/systemd/system/bms.service

# Remove old project
sudo rm -rf /var/www/bms

# Remove old nginx config
sudo rm -f /etc/nginx/sites-enabled/bms
sudo rm -f /etc/nginx/sites-available/bms
```

---

## Step 2: Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python 3.11
sudo apt install -y software-properties-common
sudo add-apt-repository ppa:deadsnakes/ppa -y
sudo apt update
sudo apt install -y python3.11 python3.11-venv python3.11-dev

# Install MongoDB (Local)
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Install Nginx and Certbot
sudo apt install -y nginx certbot python3-certbot-nginx git curl unzip

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash -
sudo apt install -y nodejs

# Install Yarn
sudo npm install -g yarn
```

---

## Step 3: Deploy Code

### Option A: From GitHub
```bash
cd /var/www
sudo git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git etieducom
```

### Option B: Upload ZIP
```bash
# Upload code.zip to server, then:
cd /var/www
sudo unzip /path/to/code.zip -d etieducom
```

---

## Step 4: Backend Setup

```bash
cd /var/www/etieducom/backend

# Create virtual environment
sudo python3.11 -m venv venv
sudo chown -R $USER:$USER venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn
pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/
```

### Configure Environment
```bash
sudo nano .env
```

**Paste this (edit as needed):**
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=etieducom_db
SECRET_KEY=your-64-character-secret-key-change-this
FRONTEND_URL=https://yourdomain.com
CORS_ORIGINS=https://yourdomain.com
EMERGENT_LLM_KEY=sk-emergent-your-key-here
```

Generate secret key:
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### Create Service
```bash
sudo nano /etc/systemd/system/etieducom.service
```

**Paste:**
```ini
[Unit]
Description=ETI Educom Backend
After=network.target mongod.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/etieducom/backend
Environment="PATH=/var/www/etieducom/backend/venv/bin"
ExecStart=/var/www/etieducom/backend/venv/bin/gunicorn server:app -w 4 -k uvicorn.workers.UvicornWorker -b 127.0.0.1:8001 --timeout 120
Restart=always

[Install]
WantedBy=multi-user.target
```

### Start Backend
```bash
sudo chown -R www-data:www-data /var/www/etieducom
sudo systemctl daemon-reload
sudo systemctl enable etieducom
sudo systemctl start etieducom
sudo systemctl status etieducom
```

---

## Step 5: Frontend Setup

```bash
cd /var/www/etieducom/frontend

# Create production env
echo "REACT_APP_BACKEND_URL=https://yourdomain.com" | sudo tee .env.production

# Install and build
yarn install
yarn build

# Deploy
sudo mkdir -p /var/www/html/etieducom
sudo cp -r build/* /var/www/html/etieducom/
sudo chown -R www-data:www-data /var/www/html/etieducom
```

---

## Step 6: Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/etieducom
```

**Paste (replace yourdomain.com):**
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    root /var/www/html/etieducom;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        client_max_body_size 50M;
    }
}
```

### Enable Site & SSL
```bash
sudo ln -sf /etc/nginx/sites-available/etieducom /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## Step 7: Create Admin User

```bash
cd /var/www/etieducom/backend
source venv/bin/activate

python3 << 'EOF'
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')

async def create_admin():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['etieducom_db']
    
    admin = {
        'id': 'admin-001',
        'email': 'admin@etieducom.com',
        'name': 'Super Admin',
        'role': 'Admin',
        'hashed_password': pwd_context.hash('admin@123'),
        'is_active': True,
        'branch_id': None
    }
    
    await db.users.update_one({'email': admin['email']}, {'$set': admin}, upsert=True)
    print('Admin user created: admin@etieducom.com / admin@123')

asyncio.run(create_admin())
EOF
```

---

## Verification

```bash
# Test backend
curl https://yourdomain.com/api/health

# Test login
curl -X POST https://yourdomain.com/api/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@etieducom.com&password=admin@123&session=2025-26"
```

---

## Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@etieducom.com | admin@123 |

**Change password after first login!**

---

## Troubleshooting

```bash
# Check backend logs
sudo journalctl -u etieducom -f

# Check MongoDB
sudo systemctl status mongod

# Check Nginx
sudo nginx -t
sudo tail -f /var/log/nginx/error.log

# Restart services
sudo systemctl restart mongod etieducom nginx
```
