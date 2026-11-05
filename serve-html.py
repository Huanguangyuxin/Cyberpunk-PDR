#!/usr/bin/env python3
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

root = Path(__file__).resolve().parent / "Deliverables"
handler = partial(SimpleHTTPRequestHandler, directory=str(root))
with ThreadingHTTPServer(("127.0.0.1", 0), handler) as server:
    print(f"打开Chrome: http://127.0.0.1:{server.server_port}/Cyberpunk-PDR.html", flush=True)
    print("点击进入场景，并保持页面在前台。Ctrl+C停止本机服务。", flush=True)
    server.serve_forever()
