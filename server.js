import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const distDir = resolve(__dirname, 'dist');
const port = Number(process.env.PORT || 4173);

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function sendFile(response, filePath) {
  const extension = extname(filePath).toLowerCase();
  response.writeHead(200, {
    'Content-Type': mimeTypes[extension] || 'application/octet-stream'
  });
  createReadStream(filePath).pipe(response);
}

const server = createServer((request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host}`);
  const requestedPath = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  const staticPath = join(distDir, requestedPath);

  if (staticPath.startsWith(distDir) && existsSync(staticPath) && statSync(staticPath).isFile()) {
    sendFile(response, staticPath);
    return;
  }

  const indexPath = join(distDir, 'index.html');
  if (existsSync(indexPath)) {
    sendFile(response, indexPath);
    return;
  }

  response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end('Production build is missing. Run npm run build first.');
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on port ${port}`);
});
