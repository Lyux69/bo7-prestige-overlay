from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import os


ROOT = Path(__file__).resolve().parent
DATA_FILE = ROOT / "data.json"
IMAGE_DIR = ROOT / "images"
ALLOWED_LOGO_EXTENSIONS = {
    ".gif": "image/gif",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
}


class OverlayHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        if self.path == "/api/data":
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(DATA_FILE.read_bytes())
            return

        if self.path == "/":
            self.path = "/index.html"

        return super().do_GET()

    def do_POST(self):
        if self.path == "/api/logo":
            self.save_logo()
            return

        if self.path != "/api/data":
            self.send_error(404)
            return

        length = int(self.headers.get("Content-Length", "0"))
        raw_body = self.rfile.read(length)

        try:
            data = json.loads(raw_body.decode("utf-8"))
        except json.JSONDecodeError:
            self.send_error(400, "Invalid JSON")
            return

        DATA_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(b'{"ok":true}')

    def save_logo(self):
        original_name = Path(self.headers.get("X-File-Name", "logo.png")).name
        extension = Path(original_name).suffix.lower()
        content_type = self.headers.get("Content-Type", "").split(";")[0].lower()

        if extension not in ALLOWED_LOGO_EXTENSIONS:
            self.send_error(400, "Unsupported image format")
            return
        if content_type and content_type != ALLOWED_LOGO_EXTENSIONS[extension]:
            self.send_error(400, "Invalid image content type")
            return

        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0 or length > 5 * 1024 * 1024:
            self.send_error(400, "Invalid image size")
            return

        IMAGE_DIR.mkdir(exist_ok=True)
        logo_file = IMAGE_DIR / f"logo{extension}"
        logo_file.write_bytes(self.rfile.read(length))

        payload = json.dumps({"logoUrl": f"images/{logo_file.name}?v={int(logo_file.stat().st_mtime)}"}).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(payload)

    def do_DELETE(self):
        if self.path != "/api/logo":
            self.send_error(404)
            return

        for extension in ALLOWED_LOGO_EXTENSIONS:
            logo_file = IMAGE_DIR / f"logo{extension}"
            if logo_file.exists():
                logo_file.unlink()

        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(b'{"ok":true}')


if __name__ == "__main__":
    os.chdir(ROOT)
    server = ThreadingHTTPServer(("0.0.0.0", 8765), OverlayHandler)
    print("BO7 overlay server running at http://localhost:8765")
    print("Admin panel: http://localhost:8765/admin.html")
    server.serve_forever()
