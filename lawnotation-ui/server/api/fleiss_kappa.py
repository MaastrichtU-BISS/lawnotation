from http.server import BaseHTTPRequestHandler
import json


class handler(BaseHTTPRequestHandler):

    def do_POST(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        content_len = int(self.headers.get('content-length', 0))
        data = self.rfile.read(content_len).decode()
        print(data)
        self.wfile.write(json.dumps({"hello": "world"}).encode())
        return
