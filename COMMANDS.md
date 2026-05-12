# ETI Educom - Quick Commands Reference

## CLEAR OLD PROJECT
```bash
sudo systemctl stop bms && sudo systemctl disable bms
sudo rm -f /etc/systemd/system/bms.service
sudo rm -rf /var/www/bms
sudo rm -f /etc/nginx/sites-enabled/bms /etc/nginx/sites-available/bms
sudo systemctl daemon-reload
```

## INSTALL DEPENDENCIES
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y software-properties-common
sudo add-apt-repository ppa:deadsnakes/ppa -y
sudo apt install -y python3.11 python3.11-venv python3.11-dev nginx certbot python3-certbot-nginx git curl unzip

# MongoDB
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update && sudo apt install -y mongodb-org
sudo systemctl start mongod && sudo systemctl enable mongod

# Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash -
sudo apt install -y nodejs
sudo npm install -g yarn
```

## DEPLOY CODE
```bash
cd /var/www
sudo git clone YOUR_REPO_URL etieducom
# OR
sudo unzip /path/to/code.zip -d etieducom
```

## BACKEND SETUP
```bash
cd /var/www/etieducom/backend
sudo python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt gunicorn
pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/
```

## BACKEND .env
```bash
cat > .env << 'EOF'
MONGO_URL=mongodb://localhost:27017
DB_NAME=etieducom_db
SECRET_KEY=CHANGE_THIS_64_CHAR_SECRET
FRONTEND_URL=https://yourdomain.com
CORS_ORIGINS=https://yourdomain.com
EMERGENT_LLM_KEY=sk-emergent-your-key
EOF
```

## CREATE SERVICE
```bash
sudo tee /etc/systemd/system/etieducom.service << 'EOF'
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
EOF

sudo chown -R www-data:www-data /var/www/etieducom
sudo systemctl daemon-reload
sudo systemctl enable etieducom
sudo systemctl start etieducom
```

## FRONTEND SETUP
```bash
cd /var/www/etieducom/frontend
echo "REACT_APP_BACKEND_URL=https://yourdomain.com" > .env.production
yarn install && yarn build
sudo mkdir -p /var/www/html/etieducom
sudo cp -r build/* /var/www/html/etieducom/
sudo chown -R www-data:www-data /var/www/html/etieducom
```

## NGINX CONFIG
```bash
sudo tee /etc/nginx/sites-available/etieducom << 'EOF'
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
    location / { try_files $uri $uri/ /index.html; }
    location /api/ {
        proxy_pass http://127.0.0.1:8001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 50M;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/etieducom /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## CREATE ADMIN USER
```bash
cd /var/www/etieducom/backend && source venv/bin/activate
python3 -c "
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
pwd = CryptContext(schemes=['bcrypt'])
async def create():
    db = AsyncIOMotorClient('mongodb://localhost:27017')['etieducom_db']
    await db.users.update_one({'email':'admin@etieducom.com'},{'\\$set':{'id':'admin-001','email':'admin@etieducom.com','name':'Super Admin','role':'Admin','hashed_password':pwd.hash('admin@123'),'is_active':True,'branch_id':None}},upsert=True)
    print('Created: admin@etieducom.com / admin@123')
asyncio.run(create())
"
```

## VERIFY
```bash
curl https://yourdomain.com/api/health
```

## TROUBLESHOOTING
```bash
sudo journalctl -u etieducom -f          # Backend logs
sudo systemctl status mongod              # MongoDB status
sudo tail -f /var/log/nginx/error.log     # Nginx logs
sudo systemctl restart mongod etieducom nginx  # Restart all
```

## MAINTENANCE
```bash
# Update code
cd /var/www/etieducom && sudo git pull
cd frontend && yarn build && sudo cp -r build/* /var/www/html/etieducom/
sudo systemctl restart etieducom

# Backup database
mongodump --db etieducom_db --out /backup/$(date +%Y%m%d)
```
