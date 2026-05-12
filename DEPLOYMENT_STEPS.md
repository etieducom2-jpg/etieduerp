# Safe VPS Deployment Steps

## Will this impact your 500 students' data? NO.

These changes are **100% safe** for your existing data:
- Session dropdown: Only adds a UI option, zero database changes
- Incentive Mark Paid: Adds a new field (`incentive_status: "Paid"`) only when you click the button
- Performance fixes: Only changes HOW data is queried (faster), not WHAT data exists
- "Other Courses" fix: Only changes the matching logic for display, no data modification

## Step-by-Step Deployment

### 1. Push code from Emergent to GitHub
- Click **"Save to GitHub"** button in the Emergent chat input
- Select branch `main` and push

### 2. SSH into your VPS
```bash
ssh your-user@your-vps-ip
```

### 3. Take a MongoDB backup FIRST (safety net)
```bash
mongodump --db your_database_name --out /backup/$(date +%Y%m%d_%H%M%S)
```

### 4. Pull latest code
```bash
cd /path/to/your/etierpfinal
git pull origin main
```

### 5. Install any new backend dependencies (if needed)
```bash
cd backend
pip install -r requirements.txt
```

### 6. Install any new frontend dependencies (if needed)
```bash
cd frontend
yarn install
yarn build  # If you serve a production build
```

### 7. Restart services
```bash
# If using PM2:
pm2 restart backend
pm2 restart frontend

# If using systemd:
sudo systemctl restart backend
sudo systemctl restart frontend

# If using supervisor:
sudo supervisorctl restart backend frontend
```

### 8. Verify
- Open your site (bms.etieducom.com)
- Check login page shows all 3 sessions
- Check Students page loads faster
- Check International Exams → Bookings → Completed exam shows "Mark Paid" button

## Rollback (if anything goes wrong)
```bash
# Revert to previous commit
git log --oneline -5  # Find the previous commit hash
git checkout <previous-commit-hash> -- .
# Restart services again
```

## MongoDB restore (worst case)
```bash
mongorestore --db your_database_name /backup/YYYYMMDD_HHMMSS/your_database_name
```
