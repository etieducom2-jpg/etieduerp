#!/bin/bash
# MongoDB Diagnostic Script for Hostinger VPS
# Run this script on your VPS to check MongoDB setup

echo "============================================"
echo "   MongoDB Diagnostic Report"
echo "============================================"
echo ""

# 1. Check if MongoDB is installed
echo "1. CHECKING MONGODB INSTALLATION"
echo "--------------------------------"
if command -v mongod &> /dev/null; then
    echo "✅ MongoDB is installed"
    mongod --version | head -1
else
    echo "❌ MongoDB is NOT installed"
    echo "   To install: sudo apt install mongodb-org -y"
fi
echo ""

# 2. Check MongoDB service status
echo "2. MONGODB SERVICE STATUS"
echo "-------------------------"
if systemctl is-active --quiet mongod; then
    echo "✅ MongoDB service is RUNNING"
elif systemctl is-active --quiet mongodb; then
    echo "✅ MongoDB service is RUNNING (as 'mongodb')"
else
    echo "❌ MongoDB service is NOT running"
    echo "   To start: sudo systemctl start mongod"
fi
echo ""

# 3. Check MongoDB port
echo "3. MONGODB PORT CHECK"
echo "---------------------"
if netstat -tuln 2>/dev/null | grep -q ":27017"; then
    echo "✅ MongoDB is listening on port 27017"
elif ss -tuln | grep -q ":27017"; then
    echo "✅ MongoDB is listening on port 27017"
else
    echo "❌ MongoDB is NOT listening on port 27017"
fi
echo ""

# 4. MongoDB configuration file location
echo "4. MONGODB CONFIGURATION"
echo "------------------------"
if [ -f /etc/mongod.conf ]; then
    echo "✅ Config file: /etc/mongod.conf"
    echo "   Data directory: $(grep -E "^\s*dbPath:" /etc/mongod.conf | awk '{print $2}')"
    echo "   Log file: $(grep -E "^\s*path:" /etc/mongod.conf | head -1 | awk '{print $2}')"
    echo "   Bind IP: $(grep -E "^\s*bindIp:" /etc/mongod.conf | awk '{print $2}')"
elif [ -f /etc/mongodb.conf ]; then
    echo "✅ Config file: /etc/mongodb.conf"
else
    echo "⚠️  Config file not found in default locations"
fi
echo ""

# 5. List all databases
echo "5. LIST OF DATABASES"
echo "--------------------"
echo "Connecting to MongoDB..."
mongosh --quiet --eval "
    db.adminCommand('listDatabases').databases.forEach(function(d) {
        print('📁 ' + d.name + ' - Size: ' + (d.sizeOnDisk / 1024 / 1024).toFixed(2) + ' MB');
    });
" 2>/dev/null || mongo --quiet --eval "
    db.adminCommand('listDatabases').databases.forEach(function(d) {
        print('📁 ' + d.name + ' - Size: ' + (d.sizeOnDisk / 1024 / 1024).toFixed(2) + ' MB');
    });
" 2>/dev/null || echo "❌ Could not connect to MongoDB"
echo ""

# 6. Detailed database info
echo "6. DETAILED DATABASE INFO"
echo "-------------------------"
mongosh --quiet --eval "
    var dbs = db.adminCommand('listDatabases').databases;
    dbs.forEach(function(database) {
        print('\n📂 DATABASE: ' + database.name);
        print('   Size: ' + (database.sizeOnDisk / 1024 / 1024).toFixed(2) + ' MB');
        
        var dbInstance = db.getSiblingDB(database.name);
        var collections = dbInstance.getCollectionNames();
        print('   Collections (' + collections.length + '):');
        
        collections.forEach(function(coll) {
            var stats = dbInstance.getCollection(coll).stats();
            var count = dbInstance.getCollection(coll).countDocuments();
            print('      - ' + coll + ': ' + count + ' documents');
        });
    });
" 2>/dev/null || mongo --quiet --eval "
    var dbs = db.adminCommand('listDatabases').databases;
    dbs.forEach(function(database) {
        print('\n📂 DATABASE: ' + database.name);
        print('   Size: ' + (database.sizeOnDisk / 1024 / 1024).toFixed(2) + ' MB');
        
        var dbInstance = db.getSiblingDB(database.name);
        var collections = dbInstance.getCollectionNames();
        print('   Collections (' + collections.length + '):');
        
        collections.forEach(function(coll) {
            var count = dbInstance.getCollection(coll).count();
            print('      - ' + coll + ': ' + count + ' documents');
        });
    });
" 2>/dev/null || echo "❌ Could not get detailed info"
echo ""

# 7. Disk usage
echo "7. DISK USAGE"
echo "-------------"
if [ -d /var/lib/mongodb ]; then
    du -sh /var/lib/mongodb 2>/dev/null && echo "   Location: /var/lib/mongodb"
elif [ -d /var/lib/mongo ]; then
    du -sh /var/lib/mongo 2>/dev/null && echo "   Location: /var/lib/mongo"
fi
echo ""

# 8. Memory usage
echo "8. MEMORY USAGE"
echo "---------------"
ps aux | grep mongod | grep -v grep | awk '{print "   MongoDB Memory: " $6/1024 " MB"}'
echo ""

echo "============================================"
echo "   End of Diagnostic Report"
echo "============================================"
