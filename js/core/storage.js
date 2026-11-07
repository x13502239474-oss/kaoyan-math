/* 本地持久化：localStorage 抽象层（含内存兜底、自动备份、导出/恢复载荷）
   未来接后端只需替换 App.Storage 的 read/write 实现，业务层无需改动。 */
(function (root) {
  'use strict';
  var App = root.App = root.App || {};
  var KEY = 'kaoyan_math_state_v2';
  var BACKUP_KEY = 'kaoyan_math_state_v2_prev';
  var EXPORT_APP = 'kaoyan-math';
  var mem = null, useMemory = false;

  function backend() {
    try {
      var ls = root.localStorage;
      if (!ls) return null;
      var probe = '__ky_probe__'; ls.setItem(probe, '1'); ls.removeItem(probe);
      return ls;
    } catch (e) { return null; }
  }
  function available() { return !!backend(); }

  function readRaw() {
    var ls = backend();
    if (ls) { useMemory = false; return ls.getItem(KEY); }
    useMemory = true; return mem;
  }
  function writeRaw(str) {
    var ls = backend();
    if (ls) {
      var prev = ls.getItem(KEY);
      if (prev && prev !== str) { try { ls.setItem(BACKUP_KEY, prev); } catch (e) {} }
      ls.setItem(KEY, str);
      useMemory = false;
    } else { mem = str; useMemory = true; }
  }
  function read() {
    var raw = readRaw();
    if (!raw) return null;
    try { var o = JSON.parse(raw); return o && typeof o === 'object' ? o : null; }
    catch (e) { return null; }
  }
  function write(obj) {
    try { writeRaw(JSON.stringify(obj)); return true; }
    catch (e) { return false; }
  }
  function readBackup() {
    var ls = backend(); if (!ls) return null;
    try { return JSON.parse(ls.getItem(BACKUP_KEY)); } catch (e) { return null; }
  }

  /* 导出载荷：带应用标识、版本、时间、校验长度，恢复时可识别 */
  function exportPayload(state) {
    return JSON.stringify({
      app: EXPORT_APP,
      schema: state && state.version,
      exportedAt: new Date().toISOString(),
      state: state
    }, null, 2);
  }
  /* 兼容三种输入：本站导出载荷 / 裸 state 对象 / JSON 字符串 */
  function parsePayload(input) {
    var obj;
    try { obj = typeof input === 'string' ? JSON.parse(input) : input; }
    catch (e) { return { ok: false, error: '文件不是合法 JSON：' + e.message }; }
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return { ok: false, error: '内容不是对象' };
    var state = obj.state && typeof obj.state === 'object' ? obj.state : obj;
    if (obj.app && obj.app !== EXPORT_APP) return { ok: false, error: '这不是数学自学台的备份文件（app=' + obj.app + '）' };
    if (!state.version || !state.progress || !state.wrongBook) {
      return { ok: false, error: '备份结构不完整，缺少 version / progress / wrongBook 字段' };
    }
    return { ok: true, state: state, exportedAt: obj.exportedAt || null };
  }
  function clearAll() {
    var ls = backend();
    if (ls) { ls.removeItem(KEY); ls.removeItem(BACKUP_KEY); }
    mem = null;
  }
  function isMemoryMode() { return useMemory; }

  App.Storage = {
    KEY: KEY, EXPORT_APP: EXPORT_APP, available: available, isMemoryMode: isMemoryMode,
    read: read, write: write, readBackup: readBackup, clearAll: clearAll,
    exportPayload: exportPayload, parsePayload: parsePayload
  };
})(typeof window !== 'undefined' ? window : globalThis);
