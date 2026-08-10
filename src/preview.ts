import http from "http";
import { createReadStream, existsSync } from "node:fs";
import path from "node:path";
import { localUrlToFilePath, renderHtml } from "./build.ts";
import { Readable } from "node:stream";

const host = "localhost";
const port = 8000;

const mimeTypes = {
    ".html": "text/html",
    ".md": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".pdf": "application/pdf",
};

runServer();

function runServer() {
    const server = http.createServer(async (req, res) => {
        // You can also set using the following method
        res.setHeader(
            "Access-Control-Allow-Origin",
            "req.header.origin",
        ); /* @dev First, read about security */
        if (!req.url) return;

        try {
            const [file_path, _] = localUrlToFilePath(
                req.url as `${string}/${string}`,
            );
            const ext = path
                .extname(file_path)
                .toLowerCase() as keyof typeof mimeTypes;
            const contentType = mimeTypes[ext] || "text/html";

            if (!existsSync(file_path)) {
                res.writeHead(404, { "X-Content-Type-Options": "nosniff" });
                res.end("File not found");
                console.log("Failed to find", file_path);
                return;
            }

            res.setHeader("Content-Type", contentType);
            res.setHeader("X-Content-Type-Options", "nosniff"); // Prevents MIME sniffing attacks
            res.writeHead(200);
            if (contentType == "text/html") {
                const s = new Readable();
                renderHtml(file_path).then((html) => {
                    s.push(html);
                    s.push(null);
                    s.pipe(res);
                });
            } else {
                createReadStream(file_path).pipe(res);
            }
        } catch (e: unknown) {
            res.writeHead(500, { "X-Content-Type-Options": "nosniff" });
            res.end((e as Error).message);
            console.error(e);
        }
    });

    server.listen(port, host, () => {
        console.log(
            `Serving static files from ${process.cwd()} on http://${host}:${port.toString()}`,
        );
    });
}
