import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 8080;

const server = createServer(async (req, res) => {
    try {
        // Serve the HTML file
        const filePath = join(__dirname, 'search-tester.html');
        const content = await readFile(filePath, 'utf-8');
        
        res.writeHead(200, {
            'Content-Type': 'text/html',
            'Cache-Control': 'no-cache'
        });
        res.end(content);
    } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error loading page: ' + err.message);
    }
});

server.listen(PORT, () => {
    console.log(`🌐 Test server running at https://localhost:${PORT}`);
    console.log(`📝 Open this URL in your browser to test the search functionality`);
    console.log(`Press Ctrl+C to stop`);
});
