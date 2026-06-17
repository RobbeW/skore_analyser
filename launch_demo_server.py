#!/usr/bin/env python3
"""Launch a local demo server for the built Skore Analyser app."""

from __future__ import annotations

import argparse
import http.server
import socketserver
from pathlib import Path


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve the built Skore Analyser app on localhost for demo use.")
    parser.add_argument("--port", type=int, default=8766, help="Local port to serve on. Default: 8766")
    parser.add_argument("--host", default="127.0.0.1", help="Bind host. Default: 127.0.0.1")
    parser.add_argument(
        "--no-fallback",
        action="store_true",
        help="Fail instead of trying nearby ports when the requested port is unavailable.",
    )
    args = parser.parse_args()

    project_root = Path(__file__).resolve().parent
    dist_root = project_root / "dist"
    root = dist_root if (dist_root / "index.html").exists() else project_root
    handler = lambda *handler_args, **handler_kwargs: QuietHandler(
        *handler_args,
        directory=str(root),
        **handler_kwargs,
    )

    server = open_server(args.host, args.port, handler, fallback=not args.no_fallback)
    with server:
        host, port = server.server_address
        print(f"Skore Analyser demo server")
        print(f"Serving: {root}")
        if root == project_root:
            print("Note: dist/index.html was not found. Run the Vite build before a production-style demo.")
        if port != args.port:
            print(f"Requested port {args.port} was unavailable; using {port} instead.")
        print(f"Open: http://{host}:{port}/")
        print("Press Ctrl+C to stop.")
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")


def open_server(host: str, port: int, handler, fallback: bool) -> ReusableTCPServer:
    ports = [port]
    if fallback and port != 0:
        ports.extend(range(port + 1, port + 26))
        ports.append(0)

    errors: list[str] = []
    for candidate in ports:
        try:
            return ReusableTCPServer((host, candidate), handler)
        except OSError as exc:
            errors.append(f"{candidate}: {exc}")

    message = (
        f"Could not start a local server on {host}. Tried ports: "
        + ", ".join(str(candidate) for candidate in ports)
    )
    if errors:
        message += "\nLast errors:\n" + "\n".join(errors[-5:])
    raise SystemExit(message)


if __name__ == "__main__":
    main()
