import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, 'dist');
const port = 5173;
const backendTarget = 'http://127.0.0.1:8000';

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // 1. API Reverse Proxy to FastAPI Backend
  if (pathname.startsWith('/api') || pathname === '/predict_and_consult' || pathname === '/chat') {
    const targetUrl = new URL(req.url, backendTarget);
    const proxyReq = http.request(targetUrl, {
      method: req.method,
      headers: { ...req.headers, host: '127.0.0.1:8000' }
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    proxyReq.on('error', (err) => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Backend unreachable', details: err.message }));
    });
    req.pipe(proxyReq);
    return;
  }

  // 2. Static Asset Resolution in distDir
  let filePath = path.join(distDir, pathname);
  let isIndexFallback = false;

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(distDir, 'index.html');
    isIndexFallback = true;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500);
      res.end('Server Error reading file');
      return;
    }

    const acceptEncoding = req.headers['accept-encoding'] || '';
    const shouldGzip = /gzip/i.test(acceptEncoding) && (
      contentType.includes('text') ||
      contentType.includes('javascript') ||
      contentType.includes('json') ||
      contentType.includes('svg')
    );

    const headers = {
      'Content-Type': contentType,
      'Vary': 'Accept-Encoding, Origin',
      'Access-Control-Allow-Origin': '*'
    };

    if (pathname.startsWith('/assets/')) {
      headers['Cache-Control'] = 'public, max-age=31536000, immutable';
    } else {
      headers['Cache-Control'] = 'no-cache';
    }

    if (req.method === 'HEAD') {
      res.writeHead(200, headers);
      res.end();
      return;
    }

    if (shouldGzip) {
      zlib.gzip(content, (gzipErr, gzipped) => {
        if (!gzipErr && gzipped) {
          headers['Content-Encoding'] = 'gzip';
          headers['Content-Length'] = gzipped.length;
          res.writeHead(200, headers);
          res.end(gzipped);
        } else {
          headers['Content-Length'] = content.length;
          res.writeHead(200, headers);
          res.end(content);
        }
      });
    } else {
      headers['Content-Length'] = content.length;
      res.writeHead(200, headers);
      res.end(content);
    }
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`[MindPulse Production Server] Listening on http://0.0.0.0:${port} with GZIP enabled`);
});
