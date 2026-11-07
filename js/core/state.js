/* 状态层：全部学习数据 + 内容访问层（内置内容与导入内容合并）
   数据分表：progress / notes / formulaState / practice / favorites / wrongBook /
            review / exams / examDraft / activity / daily / imported / settings
   内容分表：Courses（讲义）、Questions（题干）、Answers（答案解析）、Formulas（公式）
   —— 满足「课程、题目、答案和解析分开存储」与「支持后续批量导入」。 */
(function (root) {
  'use strict';
  var App = root.App = root.App || {};
  var U = App.U, S = App.Storage;
  var VERSION = 2;
  var state = null, listeners = [];

  function defaults() {
    return {
      version: VERSION,
      createdAt: Date.now(),
      profile: { dailyCourses: 1, dailyQuestions: 10, examMinutes: 60, examCount: 25 },
      progress: { completedCourses: {}, lastCourseId: null },
      notes: {},                 // courseId -> {text, updatedAt}
      formulaState: {},          // formulaId -> {favorite, mastery:0..3, lastCheckAt}
      practice: { records: [] }, // {qid, correct, userAnswer, rightAnswer, at, durationMs, mode, examId}
      favorites: {},             // qid -> timestamp
      wrongBook: {},             // qid -> wrong item（同一题只保留一条，反复做错更新次数）
      review: {},                // key -> review item
      exams: [],                 // 已交卷的考试
      examDraft: null,           // 进行中的考试（刷新可恢复）
      activity: [],              // 最近学习记录
      daily: {},                 // YYYY-MM-DD -> {questions, courses, minutes}
      imported: { courses: [], questions: [], answers: {}, formulas: [], examples: {} },
      settings: { hideFormulaOnQuiz: true, showSourceBadge: true }
    };
  }

  /* 结构补齐式迁移：老备份缺字段时补默认值，不丢已有记录 */
  function migrate(raw) {
    var d = defaults();
    if (!raw || typeof raw !== 'object') return d;
    var out = d;
    Object.keys(d).forEach(function (k) {
      if (raw[k] == null) return;
      if (k === 'profile' || k === 'settings' || k === 'progress' || k === 'practice' || k === 'imported') {
        out[k] = Object.assign({}, d[k], raw[k]);
        if (k === 'imported') {
          ['courses', 'questions', 'formulas'].forEach(function (a) { if (!Array.isArray(out.imported[a])) out.imported[a] = []; });
          ['answers', 'examples'].forEach(function (a) { if (!out.imported[a] || typeof out.imported[a] !== 'object') out.imported[a] = {}; });
        }
        if (k === 'practice' && !Array.isArray(out.practice.records)) out.practice.records = [];
      } else if (Array.isArray(d[k])) {
        out[k] = Array.isArray(raw[k]) ? raw[k] : d[k];
      } else {
        out[k] = raw[k];
      }
    });
    out.version = VERSION;
    return out;
  }

  function init() {
    var raw = S.read();
    state = migrate(raw);
    if (!raw) save();
    return state;
  }
  function get() { return state || init(); }
  function save() { var ok = S.write(get()); listeners.forEach(function (f) { try { f(get()); } catch (e) {} }); return ok; }
  function mutate(fn) { var r = fn(get()); save(); return r; }
  function subscribe(fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; }
  function reset() { S.clearAll(); state = defaults(); save(); return state; }

  function today() {
    var k = U.dateKey();
    var st = get();
    if (!st.daily[k]) st.daily[k] = { questions: 0, courses: 0, minutes: 0 };
    return st.daily[k];
  }
  function bump(field, n) { mutate(function (st) { var t = today(); t[field] = (t[field] || 0) + (n || 1); }); }
  function log(type, text, href) {
    mutate(function (st) {
      st.activity.unshift({ at: Date.now(), type: type, text: text, href: href || '' });
      if (st.activity.length > 120) st.activity.length = 120;
    });
  }

  /* ---- 备份 / 恢复 ---- */
  function exportText() { return S.exportPayload(get()); }
  function exportFile() {
    var name = '数学自学台-备份-' + U.dateKey() + '-' + U.pad(new Date().getHours()) + U.pad(new Date().getMinutes()) + '.json';
    return U.download(name, exportText());
  }
  function restore(input, mode) {
    var p = S.parsePayload(input);
    if (!p.ok) return p;
    var incoming = migrate(p.state);
    if (mode === 'merge') {
      var st = get();
      // 合并策略：对象表按键合并，数组按 id/时间去重追加
      Object.keys(incoming).forEach(function (k) {
        var v = incoming[k];
        if (k === 'version' || k === 'createdAt') return;
        if (Array.isArray(v) && Array.isArray(st[k])) {
          var seen = {};
          st[k].forEach(function (x) { seen[JSON.stringify(x)] = 1; });
          v.forEach(function (x) { if (!seen[JSON.stringify(x)]) st[k].push(x); });
        } else if (v && typeof v === 'object' && st[k] && typeof st[k] === 'object') {
          st[k] = Object.assign({}, v, st[k]);   // 本机现有记录优先
        }
      });
      save();
    } else {
      state = incoming; save();
    }
    return { ok: true, exportedAt: p.exportedAt, mode: mode || 'replace' };
  }

  /* ---- 批量导入课程 / 题目 / 公式（内容与答案分离） ---- */
  var VALID_TYPES = ['single', 'multi', 'judge', 'blank', 'essay'];
  function importBundle(payload) {
    var result = { ok: true, added: { courses: 0, questions: 0, answers: 0, formulas: 0, examples: 0 }, errors: [] };
    var items = null, kind = payload && payload.type;
    if (Array.isArray(payload)) { items = payload; kind = guessKind(payload); }
    else if (payload && payload.items && (Array.isArray(payload.items) || typeof payload.items === 'object')) { items = payload.items; }
    else { return { ok: false, errors: ['无法识别导入格式：需要 {type, items:[...]}、{type, items:{...}} 或一个数组'] }; }
    if (!kind) return { ok: false, errors: ['无法判断导入内容类型，请在 JSON 里写明 type（courses/questions/answers/formulas/examples）'] };

    mutate(function (st) {
      var imp = st.imported;
      if (kind === 'answers' || kind === 'examples') {
        var obj = Array.isArray(payload) ? null : payload.items;
        if (obj && !Array.isArray(obj) && typeof obj === 'object') {
          Object.keys(obj).forEach(function (k) {
            if (!obj[k] || typeof obj[k] !== 'object') { result.errors.push(k + ' 的答案不是对象'); return; }
            imp[kind][k] = obj[k]; result.added[kind === 'answers' ? 'answers' : 'examples']++;
          });
        } else { result.errors.push('answers/examples 需要 {id: {...}} 形式的对象'); }
        return;
      }
      var bucket = { courses: 'courses', questions: 'questions', formulas: 'formulas' }[kind];
      if (!bucket) { result.errors.push('不支持的 type：' + kind); return; }
      items.forEach(function (it, i) {
        if (!it || typeof it !== 'object') { result.errors.push('第 ' + (i + 1) + ' 项不是对象'); return; }
        if (!it.id) { result.errors.push('第 ' + (i + 1) + ' 项缺少 id'); return; }
        if (kind === 'questions') {
          if (!it.stem || !VALID_TYPES.includes(it.qtype)) { result.errors.push(it.id + '：缺少 stem 或 qtype 不合法（' + VALID_TYPES.join('/') + '）'); return; }
          if (!it.chapter) { result.errors.push(it.id + '：缺少 chapter'); return; }
          if ((it.qtype === 'single' || it.qtype === 'multi') && !Array.isArray(it.options)) { result.errors.push(it.id + '：选择题需要 options 数组'); return; }
          it.sourceType = it.sourceType || 'imported';
          // 题目里若带了答案/解析，自动拆到 answers 表，保证「题干与答案分离」
          if (it.answer != null || it.explanation || it.keywords || it.steps) {
            var a = {};
            ['answer', 'accepted', 'keywords', 'idea', 'steps', 'trap', 'explanation'].forEach(function (f) { if (it[f] != null) a[f] = it[f]; });
            imp.answers[it.id] = a; result.added.answers++;
            ['answer', 'accepted', 'keywords', 'idea', 'steps', 'trap', 'explanation'].forEach(function (f) { delete it[f]; });
          }
        }
        if (kind === 'formulas' && (!it.name || !it.tex)) { result.errors.push(it.id + '：公式需要 name 与 tex'); return; }
        if (kind === 'courses' && (!it.title || !it.chapter)) { result.errors.push(it.id + '：课程需要 title 与 chapter'); return; }
        var idx = imp[bucket].findIndex(function (x) { return x.id === it.id; });
        if (idx >= 0) imp[bucket][idx] = it; else imp[bucket].push(it);
        result.added[bucket]++;
      });
    });
    if (result.errors.length) result.ok = result.added.courses + result.added.questions + result.added.answers + result.added.formulas + result.added.examples > 0;
    if (result.ok) log('import', '批量导入内容：课程 ' + result.added.courses + ' / 题目 ' + result.added.questions + ' / 公式 ' + result.added.formulas);
    return result;
  }
  function guessKind(arr) {
    if (!arr.length) return null;
    var f = arr[0];
    if (f.qtype) return 'questions';
    if (f.tex) return 'formulas';
    if (f.title && f.chapter) return 'courses';
    return null;
  }
  function clearImported(kind) {
    mutate(function (st) {
      if (!kind) st.imported = defaults().imported;
      else if (kind === 'answers' || kind === 'examples') st.imported[kind] = {};
      else st.imported[kind] = [];
    });
  }

  /* ---- 内容访问层：内置 + 导入 ---- */
  var Data = {
    courses: function () { return App.Courses.concat(get().imported.courses); },
    questions: function () { return App.Questions.concat(get().imported.questions); },
    answers: function () { return Object.assign({}, App.Answers.map, get().imported.answers); },
    examples: function () { return Object.assign({}, App.Answers.exampleMap, get().imported.examples); },
    formulas: function () { return App.Formulas.concat(get().imported.formulas); },
    findCourse: function (id) { return Data.courses().find(function (x) { return x.id === id; }) || null; },
    findQuestion: function (id) { return Data.questions().find(function (x) { return x.id === id; }) || null; },
    findFormula: function (id) { return Data.formulas().find(function (x) { return x.id === id; }) || null; },
    answerOf: function (id) { return Data.answers()[id] || null; },
    exampleOf: function (id) { return Data.examples()[id] || null; },
    /* 只返回有答案的题（避免导入后题目无答案导致判题异常） */
    validQuestions: function () { var a = Data.answers(); return Data.questions().filter(function (q) { return !!a[q.id]; }); },
    importedCount: function () { var i = get().imported; return { courses: i.courses.length, questions: i.questions.length, formulas: i.formulas.length, answers: Object.keys(i.answers).length }; }
  };

  App.State = {
    VERSION: VERSION, defaults: defaults, init: init, get: get, save: save, mutate: mutate,
    subscribe: subscribe, reset: reset, today: today, bump: bump, log: log,
    exportText: exportText, exportFile: exportFile, restore: restore,
    importBundle: importBundle, clearImported: clearImported
  };
  App.Data = Data;
})(typeof window !== 'undefined' ? window : globalThis);
