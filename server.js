const express = require('express');
const path = require('path');
const https = require('https');
const http = require('http');
const fs = require('fs');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Function to validate and return allowed origin matching current domain/host
function getAllowedOrigin(req) {
    const origin = req.headers.origin || req.headers.referer;
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    if (origin) {
        try {
            const originUrl = new URL(origin);
            if (host && originUrl.host === host) {
                return originUrl.origin;
            } else {
                return null;
            }
        } catch (e) {
            return null;
        }
    }
    if (host) {
        const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
        return `${proto}://${host}`;
    }
    return null;
}

// CORS middleware: same-origin for production, permissive for local development
app.use((req, res, next) => {
    const origin = req.headers.origin || req.headers.referer;
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const isLocalDev = !host || host.includes('localhost') || host.includes('127.0.0.1');

    if (!isLocalDev && origin && host && req.path.startsWith('/api/')) {
        try {
            const originUrl = new URL(origin);
            if (originUrl.host !== host) {
                if (req.method === 'OPTIONS') {
                    return res.status(403).end();
                }
                return res.status(403).json({
                    status: false,
                    message: 'Access denied: Cross-origin requests from external domains are disabled.'
                });
            }
        } catch (e) {}
    }

    const allowedOrigin = isLocalDev && origin ? origin : getAllowedOrigin(req);
    if (allowedOrigin) {
        res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
        res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Expose-Headers', '*');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// API Routes
app.all('/api/search', require('./api/search.js'));
app.all('/api/lyrics', require('./api/lyrics.js'));
app.all('/api/lyrics1', require('./api/lyrics1.js'));
app.all('/api/lyrics2', require('./api/lyrics2.js'));
app.all('/api/artist', require('./api/artist.js'));
app.all('/api/album', require('./api/album.js'));
app.all('/api/suggest', require('./api/suggest.js'));
app.all('/api/ytplay', require('./api/ytplay.js'));
app.all('/api/translate', require('./api/translate.js'));
app.all('/api/transcribe', require('./api/transcribe.js'));

// Proxy audio needs to stream in node, bypassing edge function
app.get('/api/proxy-audio', (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('Missing url parameter');
    
    let parsed;
    try {
        parsed = new URL(targetUrl);
    } catch (e) {
        return res.status(400).send('Invalid url parameter');
    }

    const options = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/149.0.0.0 Safari/537.36'
        }
    };
    if (req.headers.range) {
        options.headers['Range'] = req.headers.range;
    }

    const client = parsed.protocol === 'https:' ? https : http;
    const proxyReq = client.get(targetUrl, options, (proxyRes) => {
        // Handle potential redirects
        if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
            req.query.url = proxyRes.headers.location;
            return app._router.handle(req, res);
        }

        res.status(proxyRes.statusCode);
        const allowedOrigin = getAllowedOrigin(req);
        if (allowedOrigin) {
            res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
            res.setHeader('Vary', 'Origin');
        }
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        res.setHeader('Access-Control-Expose-Headers', '*');
        const passthrough = ['content-type', 'content-length', 'accept-ranges', 'content-range'];
        passthrough.forEach(h => {
            if (proxyRes.headers[h]) res.setHeader(h, proxyRes.headers[h]);
        });
        if (!res.getHeader('accept-ranges')) res.setHeader('Accept-Ranges', 'bytes');
        
        proxyRes.pipe(res);
    });
    
    proxyReq.on('error', (err) => {
        if (!res.headersSent) {
            res.status(500).send('Proxy error: ' + err.message);
        }
    });
});

// Static files: prefer built dist folder, fallback to public for local dev
const publicDir = path.join(__dirname, 'public');
const distDir = path.join(__dirname, 'dist');
const staticDir = fs.existsSync(distDir) ? distDir : publicDir;

app.use(express.static(staticDir));

// Fallback for SPA routing
app.use((req, res) => {
    const filePath = path.join(staticDir, 'index.html');
    
    if (req.path.startsWith('/play/')) {
        const videoId = req.path.split('/play/')[1];
        if (videoId) {
            const cleanVideoId = videoId.split('?')[0].split('/')[0];
            const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
            const qTitle = reqUrl.searchParams.get('title');
            const qArtist = reqUrl.searchParams.get('artist');
            const qCover = reqUrl.searchParams.get('cover') || reqUrl.searchParams.get('thumb');

            const coverUrl = qCover || `https://i.ytimg.com/vi/${cleanVideoId}/hqdefault.jpg`;
            const playTitle = qTitle ? (qArtist ? `${qTitle} - ${qArtist}` : qTitle) : `Dengarkan Musik - Persona Musify`;
            const playDesc = `Dengarkan ${qTitle || 'lagu favoritmu'} di Persona Musify`;

            return fs.readFile(filePath, 'utf8', (err, html) => {
                if (err) return res.sendFile(filePath);
                
                let updatedHtml = html
                    .replace(/<title>.*?<\/title>/gi, `<title>${playTitle}</title>`)
                    .replace(/<meta property="og:title" content=".*?"\s*\/?>/gi, `<meta property="og:title" content="${playTitle}">`)
                    .replace(/<meta property="og:description" content=".*?"\s*\/?>/gi, `<meta property="og:description" content="${playDesc}">`)
                    .replace(/<meta property="og:image" content=".*?"\s*\/?>/gi, `<meta property="og:image" content="${coverUrl}">`)
                    .replace(/<meta property="og:url" content=".*?"\s*\/?>/gi, `<meta property="og:url" content="${req.protocol}://${req.get('host')}${req.originalUrl}">`);

                res.setHeader('Content-Type', 'text/html');
                return res.send(updatedHtml);
            });
        }
    }

    // Default HTML response
    fs.readFile(filePath, 'utf8', (err, html) => {
        if (err) return res.sendFile(filePath);
        res.setHeader('Content-Type', 'text/html');
        return res.send(html);
    });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`[Persona-Musify] Server is running on port ${port}`);
});
