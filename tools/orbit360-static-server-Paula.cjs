const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const root = path.resolve(process.argv[2]);
const port = Number(process.argv[3] || 5178);
const defaultFile = process.argv[4] || "index.html";

function send(res, code, body, type) {
  res.writeHead(code, {
    "Content-Type": type || "text/plain; charset=utf-8",
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0"
  });
  res.end(body);
}

function ctype(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".js") return "application/javascript; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".svg") return "image/svg+xml";
  return "application/octet-stream";
}

const server = http.createServer((req, res) => {
  let pathname = decodeURIComponent(url.parse(req.url).pathname || "/");
  if (pathname === "/") pathname = "/" + defaultFile;
  const safe = path.normalize(path.join(root, pathname));
  if (!safe.startsWith(root)) return send(res, 403, "Forbidden");
  fs.readFile(safe, (err, data) => {
    if (err) return send(res, 404, "Not found: " + pathname);
    send(res, 200, data, ctype(safe));
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log("Orbit server http://127.0.0.1:" + port + "/" + defaultFile);
});
