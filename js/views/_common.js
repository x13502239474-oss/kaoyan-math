/* 视图公共渲染件：题卡、答案四段式、来源徽标、筛选控件 */
(function (root) {
  'use strict';
  var App = root.App = root.App || {};
  var U = App.U, M = App.Math, T = App.Taxonomy;
  var UI = {};

  UI.head = function (title, desc, actions) {
    return '<div class="page-head row-between wrap"><div class="grow"><h1>' + U.esc(title) + '</h1>' +
      (desc ? '<p>' + U.esc(desc) + '</p>' : '') + '</div>' + (actions || '') + '</div>';
  };
  UI.empty = function (icon, title, desc, actions) {
    return '<div class="empty card"><div class="ico">' + icon + '</div><h3>' + U.esc(title) + '</h3>' +
      '<p>' + U.esc(desc) + '</p>' + (actions || '') + '</div>';
  };
  UI.sourceBadge = function (q) {
    var s = q.sourceType || 'demo';
    if (s === 'ai') return '<span class="chip ai" title="AI 生成练习题，非真题">AI 生成</span>';
    if (s === 'imported' || s === 'user') return '<span class="chip brand" title="由使用者批量导入">' + U.esc(q.source || '自行导入') + '</span>';
    return '<span class="chip demo" title="演示题，仅用于验证功能，非真题">演示题</span>';
  };
  UI.sourceNote = function (q) {
    var s = q.sourceType || 'demo';
    if (s === 'ai') return 'AI 生成练习题（非真题、非官方题目）';
    if (s === 'imported' || s === 'user') return '使用者导入内容，答案以导入数据为准';
    return '演示题（仅用于功能验证，非真题、非官方题目）';
  };
  UI.qtypeLabel = function (t) {
    return ({ single: '单选题', multi: '多选题', judge: '判断题', blank: '填空题', essay: '简答/推演' })[t] || t;
  };
  UI.difficultyLabel = function (d) { return ['', '基础', '进阶', '挑战'][Number(d) || 1] || '基础'; };

  UI.chapterSelect = function (id, value, allLabel) {
    return '<select class="select" id="' + id + '"><option value="all">' + U.esc(allLabel || '全部章节') + '</option>' +
      T.chapters.map(function (c) {
        return '<option value="' + c.id + '"' + (value === c.id ? ' selected' : '') + '>' + U.esc(c.name) + '</option>';
      }).join('') + '</select>';
  };
  UI.kpSelect = function (id, chapter, value) {
    var list = chapter && chapter !== 'all' ? (T.chapterIndex[chapter] || { kps: [] }).kps
      : T.allKpIds().map(function (k) { return T.kpIndex[k]; });
    return '<select class="select" id="' + id + '"><option value="all">全部知识点</option>' +
      list.map(function (k) {
        return '<option value="' + k.id + '"' + (value === k.id ? ' selected' : '') + '>' + U.esc(k.name) + '</option>';
      }).join('') + '</select>';
  };

  /* 题干与输入区 */
  UI.inputHtml = function (q) {
    if (q.qtype === 'single' || q.qtype === 'multi') {
      return '<div class="options">' + (q.options || []).map(function (o) {
        return '<button type="button" class="option" data-opt="' + U.esc(o.key) + '">' +
          '<span class="key">' + U.esc(o.key) + '</span><span>' + M.text(o.text) + '</span></button>';
      }).join('') + '</div>' + (q.qtype === 'multi' ? '<p class="tiny dim mt-2">多选题：可点选多个选项，再提交。</p>' : '');
    }
    if (q.qtype === 'judge') {
      return '<div class="options"><button type="button" class="option" data-opt="对"><span class="key">√</span><span>对（正确）</span></button>' +
        '<button type="button" class="option" data-opt="错"><span class="key">×</span><span>错（错误）</span></button></div>';
    }
    if (q.qtype === 'blank') {
      return '<input class="input" data-blank autocomplete="off" placeholder="在此输入答案，然后提交">' +
        '<p class="tiny dim mt-2">支持分数（如 1/8）、根号（如 4√2）等写法，会自动做格式归一化。</p>';
    }
    return '<textarea class="textarea" data-essay placeholder="写下你的思路与结论，提交后按要点自动判分"></textarea>' +
      '<p class="tiny dim mt-2">按判分要点组自动批改，覆盖 70% 及以上要点判为正确。</p>';
  };
  UI.questionHtml = function (q, opts) {
    opts = opts || {};
    var no = opts.no != null ? '<span class="q-no">' + opts.no + '.</span>' : '';
    return '<div class="q-card" data-qid="' + U.esc(q.id) + '">' +
      '<div class="q-meta">' + (opts.no != null ? '<span class="chip brand">第 ' + opts.no + ' 题</span>' : '') +
      UI.sourceBadge(q) + '<span class="chip">' + U.esc(T.chapterShort(q.chapter)) + '</span>' +
      '<span class="chip">' + U.esc(T.kpName(q.kp)) + '</span>' +
      '<span class="chip">' + UI.qtypeLabel(q.qtype) + '</span>' +
      '<span class="chip ' + (q.difficulty >= 3 ? 'danger' : q.difficulty === 2 ? 'warning' : 'success') + '">' + UI.difficultyLabel(q.difficulty) + '</span>' +
      (opts.tag || '') + '</div>' +
      '<div class="q-stem">' + no + M.text(q.stem) + '</div>' +
      '<div class="q-answer-area">' + UI.inputHtml(q) + '</div>' +
      '<div class="q-result"></div></div>';
  };
  UI.readInput = function (q, card) {
    if (q.qtype === 'single' || q.qtype === 'judge') {
      var s = card.querySelector('.option.sel'); return s ? s.getAttribute('data-opt') : '';
    }
    if (q.qtype === 'multi') {
      return U.qsa('.option.sel', card).map(function (b) { return b.getAttribute('data-opt'); }).join('');
    }
    var i = card.querySelector('[data-blank]'); if (i) return i.value.trim();
    var t = card.querySelector('[data-essay]'); if (t) return t.value.trim();
    return '';
  };
  UI.bindInput = function (card, q, onChange) {
    U.qsa('.option', card).forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.disabled) return;
        if (q.qtype === 'multi') b.classList.toggle('sel');
        else { U.qsa('.option', card).forEach(function (x) { x.classList.remove('sel'); }); b.classList.add('sel'); }
        if (onChange) onChange(UI.readInput(q, card));
      });
    });
    var i = card.querySelector('[data-blank]') || card.querySelector('[data-essay]');
    if (i && onChange) i.addEventListener('input', function () { onChange(i.value); });
  };
  UI.lockInput = function (card, q, r, ans) {
    U.qsa('.option', card).forEach(function (b) {
      b.disabled = true;
      var k = b.getAttribute('data-opt');
      var correctKeys = String((ans || {}).answer || '').split('');
      if (correctKeys.indexOf(k) >= 0) b.classList.add('correct');
      else if (b.classList.contains('sel')) b.classList.add('wrong');
    });
    var inp = card.querySelector('[data-blank]') || card.querySelector('[data-essay]');
    if (inp) inp.disabled = true;
  };

  /* 四段式详解：答案 → 解题思路 → 逐步演示 → 易错提醒 */
  UI.answerHtml = function (q, r, ans, extra) {
    var steps = (ans && ans.steps) || [];
    var stepHtml = steps.length
      ? steps.map(function (s, i) { return (i + 1) + '. ' + U.esc(s); }).join('<br>')
      : U.esc((ans && (ans.explanation || ans.idea)) || '（本题未提供逐步演示，请参考答案与导入的解析。）');
    var missed = '';
    if (q.qtype === 'essay' && r.missed && r.missed.length && ans && ans.keywords) {
      missed = '<div class="note-box mt-3"><b>未覆盖的要点：</b>' +
        r.missed.map(function (i) { return U.esc((ans.keywords[i] || []).join(' / ')); }).join('；') +
        '　（要点覆盖率 ' + Math.round((r.hitRatio || 0) * 100) + '%）</div>';
    }
    return '<div class="answer-panel">' +
      '<div class="verdict ' + (r.correct ? 'ok' : 'no') + '">' + (r.correct ? '✓ 回答正确' : '✗ 回答错误') + '</div>' +
      '<div class="row wrap small muted mb-3"><span>你的答案：<b>' + U.esc(r.user || '未作答') + '</b></span>' +
      '<span>正确答案：<b>' + U.esc(r.expected || '') + '</b></span></div>' +
      '<div class="explain">' +
        '<h4>① 答案</h4><div>' + U.esc((ans && ans.answer) || '') + '</div>' +
        '<h4>② 解题思路</h4><div>' + U.esc((ans && ans.idea) || '见下方演示') + '</div>' +
        '<h4>③ 逐步演示</h4><div>' + stepHtml + '</div>' +
        '<h4>④ 易错提醒</h4><div>' + U.esc((ans && ans.trap) || '注意审题与单位统一。') + '</div>' +
      '</div>' + missed +
      '<p class="tiny dim mt-2">' + U.esc(UI.sourceNote(q)) + '</p>' +
      (extra ? '<div class="btn-group mt-3">' + extra + '</div>' : '') +
      '</div>';
  };

  /* 讲义例题：解析默认折叠（先自己想，再展开看） */
  UI.exampleHtml = function (ex, idx) {
    var a = App.Data.exampleOf(ex.id) || {};
    return '<div class="example" data-ex="' + U.esc(ex.id) + '">' +
      '<div class="ex-head"><span class="chip brand">例题 ' + idx + '</span><span>典型例题</span></div>' +
      '<p style="line-height:1.8">' + M.text(ex.stem) + '</p>' +
      (ex.hint ? '<p class="small muted mt-2">💡 提示：' + M.text(ex.hint) + '</p>' : '') +
      '<div class="mt-3"><button class="btn btn-sm btn-soft" data-toggle-ex="' + U.esc(ex.id) + '">查看详细解析</button></div>' +
      '<div class="ex-body hidden mt-3"></div></div>';
  };
  UI.exampleAnswerHtml = function (a) {
    if (!a || !a.answer) return '<div class="note-box">本题暂无解析，可在「设置与备份」里导入例题解析数据。</div>';
    var steps = (a.steps || []).map(function (s, i) { return (i + 1) + '. ' + U.esc(s); }).join('<br>');
    return '<div class="explain">' +
      '<h4>① 答案</h4><div>' + M.text(a.answer) + '</div>' +
      '<h4>② 解题思路</h4><div>' + M.text(a.idea || '见下方演示') + '</div>' +
      '<h4>③ 逐步演示</h4><div>' + (steps || '—') + '</div>' +
      '<h4>④ 易错提醒</h4><div>' + M.text(a.trap || '注意审题与单位统一。') + '</div></div>';
  };

  UI.formulaBox = function (tex) { return '<div class="formula-box math">' + M.formula(tex) + '</div>'; };
  App.UI = UI;
})(typeof window !== 'undefined' ? window : globalThis);
