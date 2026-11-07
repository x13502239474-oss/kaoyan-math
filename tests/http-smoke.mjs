/* 本地服务器 HTTP 冒烟测试：先启动 python server.py --port 8099 --no-browser，
   再运行 node tests/http-smoke.mjs [baseUrl] */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.argv[2] || 'http://127.0.0.1:8099/';
let pass = 0, fail = 0;
function ok(c, n) { if (c) pass++; else { fail++; console.log('  ✗ ' + n); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const refs = [...html.matchAll(/(?:src|href)="([^"#:]+)"/g)].map(m => m[1]).filter(x => !x.startsWith('http'));
const extra = ['manifest.webmanifest', 'sw.js', 'assets/icon-192.png', 'assets/icon-512.png', 'assets/icon.svg', 'README.md'];
const urls = [...new Set(['index.html'].concat(refs, extra))];

console.log('  Base URL: ' + BASE);
for (const u of urls) {
  try {
    const r = await fetch(new URL(u, BASE));
    ok(r.status === 200, u + ' -> HTTP ' + r.status);
    if (u.endsWith('.js')) ok(/javascript/.test(r.headers.get('content-type') || ''), u + ' MIME 为 JS');
    if (u.endsWith('.css')) ok(/css/.test(r.headers.get('content-type') || ''), u + ' MIME 为 CSS');
    if (u.endsWith('.webmanifest')) ok(/manifest/.test(r.headers.get('content-type') || ''), u + ' MIME 为 manifest');
    if (u.endsWith('.png')) ok(/image\/png/.test(r.headers.get('content-type') || ''), u + ' MIME 为 PNG');
  } catch (e) { ok(false, u + ' -> ' + e.message); }
}
try {
  const mf = await (await fetch(new URL('manifest.webmanifest', BASE))).json();
  ok(mf.name && mf.icons && mf.icons.length >= 2 && mf.display === 'standalone', 'PWA manifest 字段完整');
  ok(mf.start_url === './index.html', 'PWA start_url 正确');
} catch (e) { ok(false, 'manifest JSON 解析失败: ' + e.message); }
try {
  const r = await fetch(new URL('index.html', BASE));
  ok((r.headers.get('cache-control') || '').includes('no-store'), '开发期禁用缓存，刷新即生效');
} catch (e) { ok(false, 'header 检查失败'); }
try {
  const r = await fetch(new URL('does-not-exist-404', BASE));
  ok(r.status === 404, '不存在资源返回 404');
} catch (e) { ok(false, '404 检查失败'); }

console.log('\n' + '='.repeat(56));
console.log(`  HTTP 冒烟测试：${pass} 通过 / ${fail} 失败（检查 ${urls.length} 个资源）`);
if (fail) process.exit(1);
console.log('  结论：全部通过 ✅');
console.log('='.repeat(56));
