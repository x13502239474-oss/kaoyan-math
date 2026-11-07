#!/usr/bin/env python3
"""Generate the PWA PNG icons with the Python standard library only.
Run: python tools/make_icons.py   (outputs assets/icon-192.png and icon-512.png)
"""
import os
import struct
import zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BG = (45, 91, 215)
FG = (255, 255, 255)


def dist_seg(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return ((px - ax) ** 2 + (py - ay) ** 2) ** 0.5
    t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))
    return ((px - ax - t * dx) ** 2 + (py - ay - t * dy) ** 2) ** 0.5


def make(size, path):
    s = size / 512.0
    pad, radius = 16 * s, 112 * s
    x0, y0, x1, y1 = pad, pad, size - pad, size - pad
    lw = 21 * s
    segs = [((150 * s, 150 * s), (366 * s, 150 * s)),
            ((366 * s, 150 * s), (262 * s, 256 * s)),
            ((262 * s, 256 * s), (366 * s, 362 * s)),
            ((366 * s, 362 * s), (150 * s, 362 * s))]
    dot = (392 * s, 404 * s, 26 * s)
    rows = []
    for y in range(size):
        row = bytearray()
        qy = min(max(y, y0 + radius), y1 - radius)
        for x in range(size):
            qx = min(max(x, x0 + radius), x1 - radius)
            in_round = (x - qx) ** 2 + (y - qy) ** 2 <= radius ** 2
            if not in_round:
                row += bytes((0, 0, 0, 0))
                continue
            white = any(dist_seg(x, y, a[0], a[1], b[0], b[1]) <= lw for a, b in segs)
            if (x - dot[0]) ** 2 + (y - dot[1]) ** 2 <= dot[2] ** 2:
                white = True
            c = FG if white else BG
            row += bytes((c[0], c[1], c[2], 255))
        rows.append(b'\x00' + bytes(row))
    raw = b''.join(rows)

    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)

    ihdr = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    out = (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) +
           chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))
    with open(path, 'wb') as f:
        f.write(out)
    print('wrote %s (%d bytes)' % (path, len(out)))


if __name__ == '__main__':
    for n in (192, 512):
        make(n, os.path.join(ROOT, 'assets', 'icon-%d.png' % n))
