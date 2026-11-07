/* 轻量数学公式渲染器（零依赖、完全离线、手机友好）
   支持受限 LaTeX 子集：\frac \sqrt \text \overline、^ _ 上下标、{} 分组、常用符号。
   用法：App.Math.text('速度 $v=\\frac{s}{t}$')  /  App.Math.formula('\\frac{1}{2}')
   内容里用 $...$ 包住公式；不在 $ 内的文本一律 HTML 转义，防止导入内容注入。 */
(function (root) {
  'use strict';
  var App = root.App = root.App || {};
  var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  var SYM = {
    times: '×', cdot: '·', div: '÷', pm: '±', mp: '∓', le: '≤', ge: '≥', ne: '≠',
    approx: '≈', equiv: '≡', sim: '∼', infty: '∞', sum: '∑', prod: '∏', int: '∫',
    pi: 'π', alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', theta: 'θ', lambda: 'λ',
    mu: 'μ', sigma: 'σ', omega: 'ω', Delta: 'Δ', Sigma: 'Σ', Omega: 'Ω',
    angle: '∠', triangle: '△', perp: '⊥', parallel: '∥', degree: '°',
    in: '∈', notin: '∉', subset: '⊂', supset: '⊃', cup: '∪', cap: '∩',
    emptyset: '∅', Rightarrow: '⇒', Leftrightarrow: '⇔', rightarrow: '→',
    ldots: '…', cdots: '⋯', quad: '　', qquad: '　　', ',': ' ', ';': ' ',
    ' ': ' ', '\\': '\\', percent: '%', log: 'log', ln: 'ln', lg: 'lg',
    max: 'max', min: 'min', sin: 'sin', cos: 'cos', tan: 'tan', cot: 'cot'
  };

  /* 从 pos 处的 { 读取一个分组，返回 {content, end}；兼容嵌套 */
  function readGroup(s, pos) {
    if (s[pos] !== '{') return { content: s[pos] || '', end: pos + 1 };
    var depth = 1, i = pos + 1, out = '';
    while (i < s.length && depth > 0) {
      var c = s[i];
      if (c === '\\' && i + 1 < s.length) { out += c + s[i + 1]; i += 2; continue; }
      if (c === '{') { depth++; out += c; i++; continue; }
      if (c === '}') { depth--; if (depth === 0) { i++; break; } out += c; i++; continue; }
      out += c; i++;
    }
    return { content: out, end: i };
  }
  /* 读取一个"参数"：分组 / 命令 / 单字符 */
  function readArg(s, pos) {
    if (pos >= s.length) return { content: '', end: pos };
    if (s[pos] === '{') return readGroup(s, pos);
    if (s[pos] === '\\') {
      var m = /^\\([A-Za-z]+|.)/.exec(s.slice(pos));
      if (m) return { content: m[0], end: pos + m[0].length };
    }
    return { content: s[pos], end: pos + 1 };
  }

  function parse(s, depth) {
    depth = depth || 0;
    if (depth > 12) return esc(s);
    var out = '', i = 0;
    while (i < s.length) {
      var c = s[i];
      if (c === '\\') {
        var m = /^\\([A-Za-z]+|.)/.exec(s.slice(i));
        if (!m) { out += '\\'; i++; continue; }
        var cmd = m[1]; i += m[0].length;
        if (cmd === 'frac' || cmd === 'dfrac' || cmd === 'tfrac') {
          var a = readArg(s, i), b = readArg(s, a.end); i = b.end;
          out += '<span class="frac"><span>' + parse(a.content, depth + 1) + '</span><span>' + parse(b.content, depth + 1) + '</span></span>';
          continue;
        }
        if (cmd === 'sqrt') {
          var g = readArg(s, i); i = g.end;
          out += '<span class="sqrt">√<span class="radicand">' + parse(g.content, depth + 1) + '</span></span>';
          continue;
        }
        if (cmd === 'text' || cmd === 'mathrm' || cmd === 'operatorname') {
          var t = readArg(s, i); i = t.end; out += esc(t.content); continue;
        }
        if (cmd === 'overline' || cmd === 'bar') {
          var o = readArg(s, i); i = o.end; out += '<span style="text-decoration:overline">' + parse(o.content, depth + 1) + '</span>'; continue;
        }
        out += Object.prototype.hasOwnProperty.call(SYM, cmd) ? SYM[cmd] : esc(cmd);
        continue;
      }
      if (c === '{') { var grp = readGroup(s, i); out += parse(grp.content, depth + 1); i = grp.end; continue; }
      if (c === '^' || c === '_') {
        var arg = readArg(s, i + 1); i = arg.end;
        out += '<' + (c === '^' ? 'sup' : 'sub') + '>' + parse(arg.content, depth + 1) + '</' + (c === '^' ? 'sup' : 'sub') + '>';
        continue;
      }
      if (c === '&' || c === '<' || c === '>') { out += esc(c); i++; continue; }
      out += esc(c); i++;
    }
    return out;
  }

  function formula(src) { return '<span class="math">' + parse(String(src == null ? '' : src)) + '</span>'; }

  /* 混合文本：把 $...$ 段渲染成公式，其余转义后保留换行 */
  function text(src) {
    var s = String(src == null ? '' : src);
    var parts = s.split('$'), out = '';
    for (var i = 0; i < parts.length; i++) {
      if (i % 2 === 1) out += formula(parts[i]);
      else out += esc(parts[i]).replace(/\n/g, '<br>');
    }
    return out;
  }

  /* 纯文本（用于列表预览 / 导出），去掉公式标记 */
  function plain(src) {
    return String(src == null ? '' : src).replace(/\$([^$]*)\$/g, '$1')
      .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)')
      .replace(/\\sqrt\{([^{}]*)\}/g, '√($1)')
      .replace(/\\([A-Za-z]+)/g, function (m, k) { return SYM[k] != null ? SYM[k] : k; })
      .replace(/[{}]/g, '').replace(/\^/g, '^').replace(/_/g, '_');
  }

  App.Math = { formula: formula, text: text, plain: plain, parse: parse, SYM: SYM };
})(typeof window !== 'undefined' ? window : globalThis);
