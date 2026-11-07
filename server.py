#!/usr/bin/env python3
"""Local static server for the math self-study site.

Usage:
    python server.py            # listen on 127.0.0.1 only (default, safest)
    python server.py --lan      # listen on 0.0.0.0 and print the LAN address
    python server.py --port 9000
No third-party packages required (Python 3.7+).
"""
import argparse
import http.server
import os
import socket
import sys
import threading
import webbrowser

ROOT = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = dict(http.server.SimpleHTTPRequestHandler.extensions_map)
    extensions_map.update({
        '.js': 'application/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.webmanifest': 'application/manifest+json; charset=utf-8',
        '.svg': 'image/svg+xml',
        '.html': 'text/html; charset=utf-8',
    })

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        # Always serve fresh files while developing / updating content.
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Service-Worker-Allowed', '/')
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write('  ' + (fmt % args) + '\n')


def lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '127.0.0.1'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--lan', action='store_true', help='allow access from phones on the same Wi-Fi')
    ap.add_argument('--port', type=int, default=8080)
    ap.add_argument('--no-browser', action='store_true')
    a = ap.parse_args()
    host = '0.0.0.0' if a.lan else '127.0.0.1'
    url = 'http://127.0.0.1:%d/' % a.port

    print('=' * 58)
    print('  Math Self-Study Site')
    print('  Open in browser : %s' % url)
    if a.lan:
        print('  From your phone: http://%s:%d/' % (lan_ip(), a.port))
        print('  (phone must be on the same Wi-Fi; press Ctrl+C to stop)')
    print('  Project directory: %s' % ROOT)
    print('=' * 58)

    if not a.no_browser:
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try:
        with http.server.ThreadingHTTPServer((host, a.port), Handler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print('\nStopped.')
    except OSError as e:
        print('Could not start server: %s' % e)
        print('Try another port: python server.py --port 9000')
        sys.exit(1)


if __name__ == '__main__':
    main()
