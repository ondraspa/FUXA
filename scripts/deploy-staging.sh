#!/bin/bash
set -e

STAGING_DIR="${STAGING_DIR:-./staging}"
STAGING_PORT="${STAGING_PORT:-1882}"

echo "=== FUXA Staging Deployment ==="
echo "Staging directory: $STAGING_DIR"
echo "Staging port: $STAGING_PORT"

# Create staging directories
mkdir -p "$STAGING_DIR"/{server/_db,server/_appdata,server/_logs,server/_images,server/_widgets}

# Copy server files (excluding node_modules)
echo "Copying server files..."
rsync -a --exclude=node_modules --exclude=.git server/ "$STAGING_DIR/server/"

# Copy client dist
echo "Building client..."
cd client
npm run build -- --configuration production 2>/dev/null || echo "Client build skipped (using existing dist)"
cd ..
cp -r client/dist "$STAGING_DIR/client/" 2>/dev/null || true

# Copy widgets
echo "Copying widgets..."
cp -r server/_widgets "$STAGING_DIR/server/" 2>/dev/null || true

# Create staging config
cat > "$STAGING_DIR/server/staging.js" << 'JSEOF'
const path = require('path');
module.exports = {
    port: 1882,
    userDir: path.resolve(__dirname, '_appdata'),
    dbPath: path.resolve(__dirname, '_db'),
    logPath: path.resolve(__dirname, '_logs'),
    imagesPath: path.resolve(__dirname, '_images'),
    widgetsFileDir: path.resolve(__dirname, '_widgets'),
    secureEnabled: false,
    httpEnabled: true,
    httpsEnabled: false
};
JSEOF

echo ""
echo "=== Deployment Complete ==="
echo "To start staging:"
echo "  cd $STAGING_DIR/server && node main.js -p $STAGING_PORT"
echo ""
echo "Staging URL: http://localhost:$STAGING_PORT"
