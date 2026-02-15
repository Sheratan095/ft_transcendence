#!/bin/bash

# Simple HTTPS server for testing the charts client
# This is needed because the backend uses secure HTTP-only cookies

cd "$(dirname "$0")"

echo "🔐 Charts Test Server - HTTPS"
echo "=============================="
echo ""

# Check if certificates exist
if [ ! -f "key.pem" ] || [ ! -f "cert.pem" ]; then
    echo "📜 Generating self-signed certificates..."
    openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/CN=localhost" 2>/dev/null
    echo "✅ Certificates generated"
    echo ""
fi

echo "🚀 Starting HTTPS server on https://localhost:8443"
echo "📝 Note: You may need to accept the self-signed certificate in your browser"
echo ""

npx serve . -l 8443 --ssl-cert cert.pem --ssl-key key.pem