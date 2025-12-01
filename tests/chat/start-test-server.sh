#!/bin/bash

# Simple HTTPS server for testing the chat client
# This is needed because the backend uses secure HTTP-only cookies

cd "$(dirname "$0")"

echo "🔐 Chat Test Server - HTTPS"
echo "============================"
echo ""

# Check if certificates exist
if [ ! -f "key.pem" ] || [ ! -f "cert.pem" ]; then
    echo "📜 Generating self-signed certificates..."
    openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/CN=localhost" 2>/dev/null
    echo "✅ Certificates generated"
    echo ""
fi

echo "🚀 Starting HTTPS server on https://localhost:8443"
echo "📂 Serving files from: $(pwd)"
echo ""
echo "⚠️  You'll need to accept the security warning in your browser (self-signed cert)"
echo ""
echo "🌐 Open: https://localhost:8443/chat-test.html"
echo ""
echo "Press Ctrl+C to stop the server"
echo "============================"
echo ""

# Start Python HTTPS server
python3 << 'EOF'
import http.server
import ssl
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))

server_address = ('localhost', 8443)
httpd = http.server.HTTPServer(server_address, http.server.SimpleHTTPRequestHandler)

context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.load_cert_chain('cert.pem', 'key.pem')

httpd.socket = context.wrap_socket(httpd.socket, server_side=True)

print("✅ Server started successfully!")
httpd.serve_forever()
EOF
