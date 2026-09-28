from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import os


class KnowledgeBaseHandler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".css": "text/css",
    }


if __name__ == "__main__":
    address = ("127.0.0.1", int(os.environ.get("PORT", "4174")))
    print(f"知序已启动：http://{address[0]}:{address[1]}")
    ThreadingHTTPServer(address, KnowledgeBaseHandler).serve_forever()
