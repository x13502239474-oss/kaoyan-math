/* 通用工具：DOM / 日期 / 字符串 / 交互反馈
   注意：本文件为普通 script，浏览器与 Node 测试环境均可加载（IIFE 挂到全局 App）。 */
(function (root) {
  'use strict';
  var App = root.App = root.App || {};

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function qs(sel, ctx) { return (ctx || root.document).querySelector(sel); }
  function qsa(sel, ctx) { return Array.prototype.slice.call((ctx || root.document).querySelectorAll(sel)); }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function dateKey(ts) { var d = ts == null ? new Date() : new Date(ts); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function fmtDate(ts) { var d = new Date(ts); return (d.getMonth() + 1) + '月' + d.getDate() + '日'; }
  function fmtDateTime(ts) {
    var d = new Date(ts);
    return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function fmtFull(ts) {
    var d = new Date(ts);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function fmtRelative(ts) {
    var diff = Date.now() - ts;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前';
    if (diff < 7 * 86400000) return Math.floor(diff / 86400000) + ' 天前';
    return fmtDateTime(ts);
  }
  function addDays(ts, n) { return ts + n * 86400000; }
  function dayDiff(a, b) { return Math.round((new Date(dateKey(a)) - new Date(dateKey(b))) / 86400000); }
  function fmtDuration(sec) {
    sec = Math.max(0, Math.floor(sec));
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return (h ? pad(h) + ':' : '') + pad(m) + ':' + pad(s);
  }
  function uid(prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function pct(a, b) { return b > 0 ? Math.round(a * 100 / b) : 0; }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function sample(arr, n) { return shuffle(arr).slice(0, Math.max(0, n)); }
  function unique(arr) { return arr.filter(function (v, i) { return arr.indexOf(v) === i; }); }

  /* 归一化：全角转半角、去空白与常见标点、统一小写，用于填空判题 */
  function normalize(s) {
    if (s == null) return '';
    var t = String(s);
    t = t.replace(/[\uFF01-\uFF5E]/g, function (ch) { return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0); });
    t = t.replace(/\u3000/g, ' ');
    return t.replace(/[\s\u3000,，、；;。.:：'"`~!！?？()（）\[\]【】{}]/g, '').toLowerCase();
  }
  function truthy(s) { return /^(对|正确|是|真|√|✓|t|true|y|yes|1)$/i.test(normalize(s)); }
  function falsy(s) { return /^(错|错误|否|假|×|x|f|false|n|no|0|不对)$/i.test(normalize(s)); }

  function download(filename, text, mime) {
    try {
      var blob = new Blob([text], { type: (mime || 'application/json') + ';charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = root.document.createElement('a');
      a.href = url; a.download = filename; root.document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
      return true;
    } catch (e) { return false; }
  }

  /* Toast */
  function toast(msg, type) {
    if (!root.document) { return; }
    var host = root.document.getElementById('toast-host');
    if (!host) return;
    var d = root.document.createElement('div');
    d.className = 'toast' + (type ? ' ' + type : '');
    d.textContent = msg;
    host.appendChild(d);
    setTimeout(function () { d.style.opacity = '0'; d.style.transition = 'opacity .25s'; }, 2200);
    setTimeout(function () { d.remove(); }, 2500);
  }

  /* Modal：openModal(html) / closeModal() / confirmBox(opts): Promise<bool> */
  function openModal(html, onReady) {
    if (!root.document) return;
    var host = root.document.getElementById('modal-host');
    if (!host) return;
    host.innerHTML = '<div class="modal-mask" data-mask="1"><div class="modal" role="dialog" aria-modal="true">' + html + '</div></div>';
    host.querySelector('[data-mask]').addEventListener('click', function (e) {
      if (e.target === this) closeModal();
    });
    if (onReady) onReady(host);
  }
  function closeModal() { var h = root.document && root.document.getElementById('modal-host'); if (h) h.innerHTML = ''; }
  function confirmBox(opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      if (!root.document) { resolve(!!root.confirm && root.confirm(opts.message || '')); return; }
      openModal(
        '<h2>' + esc(opts.title || '请确认') + '</h2>' +
        '<p class="muted small" style="line-height:1.8">' + esc(opts.message || '') + '</p>' +
        '<div class="modal-foot"><button class="btn" data-act="cancel">' + esc(opts.cancelText || '取消') + '</button>' +
        '<button class="btn ' + (opts.danger ? 'btn-danger' : 'btn-primary') + '" data-act="ok">' + esc(opts.okText || '确定') + '</button></div>',
        function (host) {
          host.querySelector('[data-act="cancel"]').onclick = function () { closeModal(); resolve(false); };
          host.querySelector('[data-act="ok"]').onclick = function () { closeModal(); resolve(true); };
        }
      );
    });
  }

  App.U = {
    esc: esc, qs: qs, qsa: qsa, pad: pad, dateKey: dateKey, fmtDate: fmtDate,
    fmtDateTime: fmtDateTime, fmtFull: fmtFull, fmtRelative: fmtRelative,
    addDays: addDays, dayDiff: dayDiff, fmtDuration: fmtDuration, uid: uid,
    clamp: clamp, pct: pct, shuffle: shuffle, sample: sample, unique: unique,
    normalize: normalize, truthy: truthy, falsy: falsy,
    download: download, toast: toast, openModal: openModal, closeModal: closeModal, confirmBox: confirmBox
  };
})(typeof window !== 'undefined' ? window : globalThis);
