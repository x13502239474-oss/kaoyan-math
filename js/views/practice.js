/* 专项练习：多维筛选 / 题量 / 不限时与限时 / 自动判题 / 四段式解析 / 收藏 / 结果 */
(function (root) {
  'use strict';
  var App = root.App = root.App || {};
  var U = App.U, State = App.State, G = App.Grading, T = App.Taxonomy, UI = App.UI, Data = App.Data;
  var session = null, timer = null;

  function savedFilter() {
    return Object.assign({ chapter: 'all', kp: 'all', qtype: 'all', difficulty: 'all', sourceType: 'all', count: 10, timed: false, minutes: 10 },
      State.get().settings.practiceFilter || {});
  }
  function queryFilter() {
    var h = (root.location && root.location.hash) || '', q = h.indexOf('?') >= 0 ? h.split('?')[1] : '';
    var out = {};
    q.split('&').forEach(function (p) { var kv = p.split('='); if (kv[0]) out[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || ''); });
    return out;
  }
  function poolCount(f) { return G.filterQuestions(f).length; }

  /* ---------------- 配置页 ---------------- */
  function renderConfig(el) {
    var f = savedFilter(), q = queryFilter();
    if (q.chapter) f.chapter = q.chapter;
    if (q.kp) f.kp = q.kp;
    el.innerHTML = UI.head('专项练习', '按章节、知识点、题型、难度自由组卷；支持不限时与限时两种模式') +
      '<div class="card mb-4"><div class="section-title"><span class="bar"></span>选题条件</div>' +
        '<div class="filter-bar">' +
          '<div class="field"><label>章节</label>' + UI.chapterSelect('p-ch', f.chapter) + '</div>' +
          '<div class="field"><label>知识点</label>' + UI.kpSelect('p-kp', f.chapter, f.kp) + '</div>' +
          '<div class="field"><label>题型</label><select class="select" id="p-qtype">' + opt([['all', '全部题型'], ['single', '单选题'], ['multi', '多选题'], ['judge', '判断题'], ['blank', '填空题'], ['essay', '简答/推演']], f.qtype) + '</select></div>' +
          '<div class="field"><label>难度</label><select class="select" id="p-diff">' + opt([['all', '全部难度'], ['1', '基础'], ['2', '进阶'], ['3', '挑战']], String(f.difficulty)) + '</select></div>' +
          '<div class="field"><label>题目来源</label><select class="select" id="p-src">' + opt([['all', '全部'], ['demo', '演示题'], ['ai', 'AI 生成'], ['imported', '自行导入']], f.sourceType) + '</select></div>' +
          '<div class="field"><label>题量</label><select class="select" id="p-count">' + opt([['5', '5 题'], ['10', '10 题'], ['20', '20 题'], ['0', '全部符合条件']], String(f.count)) + '</select></div>' +
        '</div>' +
        '<div class="divider"></div>' +
        '<div class="section-title"><span class="bar"></span>练习模式</div>' +
        '<div class="pill-choices" id="p-timed"><button data-timed="0" class="' + (!f.timed ? 'on' : '') + '">不限时练习</button>' +
          '<button data-timed="1" class="' + (f.timed ? 'on' : '') + '">限时练习</button></div>' +
        '<div class="field mt-3 ' + (f.timed ? '' : 'hidden') + '" id="minutes-field" style="max-width:220px"><label>限时总时长（分钟）</label>' +
          '<input class="input" id="p-minutes" type="number" min="1" max="180" value="' + Number(f.minutes || 10) + '"></div>' +
        '<div class="notice mt-4" id="pool-info"></div>' +
        '<button class="btn btn-primary btn-lg btn-block mt-4" id="start-practice">开始练习</button>' +
      '</div>' +
      '<div class="notice warn"><b>内容声明：</b>题库中的题目全部标注为「演示题」或「AI 生成练习题」，<b>不含历年真题、教材原题与官方答案</b>。判题、解析、错题记录仅用于验证学习流程。</div>';

    function readForm() {
      return {
        chapter: el.querySelector('#p-ch').value,
        kp: el.querySelector('#p-kp').value,
        qtype: el.querySelector('#p-qtype').value,
        difficulty: el.querySelector('#p-diff').value,
        sourceType: el.querySelector('#p-src').value,
        count: Number(el.querySelector('#p-count').value),
        timed: !!Number(el.querySelector('#p-timed .on').getAttribute('data-timed')),
        minutes: Number(el.querySelector('#p-minutes').value) || 10
      };
    }
    function updateInfo() {
      var ff = readForm(), n = poolCount(ff);
      var box = el.querySelector('#pool-info');
      box.innerHTML = n
        ? '当前条件下可用 <b>' + n + '</b> 道题' + (ff.count ? '，本次抽取 <b>' + Math.min(ff.count, n) + '</b> 道' : '，本次将全部练习') +
          (ff.timed ? '；限时 <b>' + ff.minutes + '</b> 分钟，时间到自动交卷，未作答按错题记录。' : '；不限时，逐题提交后即时显示解析。')
        : '<b>当前条件下没有可用题目</b>，请放宽筛选条件。';
      el.querySelector('#start-practice').disabled = n === 0;
    }
    ['#p-ch', '#p-kp', '#p-qtype', '#p-diff', '#p-src', '#p-count', '#p-minutes'].forEach(function (s) {
      el.querySelector(s).addEventListener('change', function () {
        if (s === '#p-ch') { el.querySelector('#p-kp').outerHTML = UI.kpSelect('p-kp', el.querySelector('#p-ch').value, 'all'); el.querySelector('#p-kp').addEventListener('change', updateInfo); }
        updateInfo();
      });
    });
    U.qsa('[data-timed]', el).forEach(function (b) {
      b.addEventListener('click', function () {
        U.qsa('[data-timed]', el).forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        el.querySelector('#minutes-field').classList.toggle('hidden', b.getAttribute('data-timed') === '0');
        updateInfo();
      });
    });
    el.querySelector('#start-practice').addEventListener('click', function () {
      var f2 = readForm();
      State.mutate(function (st) { st.settings.practiceFilter = f2; });
      start(f2); App.refresh();
    });
    updateInfo();
  }
  function opt(pairs, val) {
    return pairs.map(function (p) { return '<option value="' + p[0] + '"' + (String(val) === p[0] ? ' selected' : '') + '>' + U.esc(p[1]) + '</option>'; }).join('');
  }

  /* ---------------- 会话 ---------------- */
  function start(f) {
    var qs = G.filterQuestions(f);
    if (!qs.length) return;
    session = {
      questions: qs, idx: 0, results: [], startedAt: Date.now(), qStartAt: Date.now(),
      timed: !!f.timed, limitSec: (Number(f.minutes) || 10) * 60, finished: false, filter: f
    };
    State.log('practice', '开始专项练习：' + qs.length + ' 题' + (f.timed ? '（限时 ' + f.minutes + ' 分钟）' : ''), '#/practice');
  }
  function elapsed() { return Math.floor((Date.now() - session.startedAt) / 1000); }
  function remaining() { return Math.max(0, session.limitSec - elapsed()); }

  function renderSession(el) {
    var q = session.questions[session.idx], n = session.questions.length;
    App.setTitle('专项练习 · 第 ' + (session.idx + 1) + '/' + n + ' 题', session.timed ? '限时模式' : '不限时模式');
    var dots = session.questions.map(function (_, i) {
      var r = session.results[i];
      return '<i class="' + (i === session.idx ? 'cur' : r ? (r.correct ? 'ok' : 'no') : '') + '"></i>';
    }).join('');
    el.innerHTML =
      '<div class="session-top"><div class="row wrap"><span class="chip brand">第 ' + (session.idx + 1) + ' / ' + n + ' 题</span>' +
        '<span class="chip">' + (session.timed ? '限时 ' + session.limitSec / 60 + ' 分钟' : '不限时') + '</span></div>' +
        '<div class="row"><span class="timer" id="p-timer">' + (session.timed ? U.fmtDuration(remaining()) : U.fmtDuration(elapsed())) + '</span>' +
        '<button class="btn btn-sm" id="p-exit">退出</button></div></div>' +
      '<div class="q-progress mb-4">' + dots + '</div>' +
      '<div id="p-card-wrap">' + UI.questionHtml(q, { no: session.idx + 1 }) + '</div>' +
      '<div class="session-nav"><button class="btn btn-primary btn-lg grow" id="p-submit">提交本题</button>' +
        (session.idx > 0 ? '<button class="btn" id="p-prev">上一题</button>' : '') + '</div>' +
      '<p class="tiny dim mt-3">' + U.esc(UI.sourceNote(q)) + '　·　答错会自动进入错题本（同一题只累加次数）</p>';

    var card = el.querySelector('.q-card');
    UI.bindInput(card, q, function () {});

    function tick() {
      var t = el.querySelector('#p-timer'); if (!t) { clearInterval(timer); return; }
      t.textContent = session.timed ? U.fmtDuration(remaining()) : U.fmtDuration(elapsed());
      if (session.timed) t.classList.toggle('urgent', remaining() < 60);
      if (session.timed && remaining() <= 0) { clearInterval(timer); autoFinish(); }
    }
    timer = setInterval(tick, 1000);
    App.Router.beforeLeave(function () { clearInterval(timer); });

    el.querySelector('#p-exit').addEventListener('click', function () {
      U.confirmBox({ title: '结束本次练习？', message: '已提交的题目会保留答题记录，未提交的题目不会计入。', okText: '结束练习', danger: true })
        .then(function (ok) { if (ok) { session = null; App.go('/practice'); } });
    });
    var prev = el.querySelector('#p-prev');
    if (prev) prev.addEventListener('click', function () { session.idx--; App.refresh(); });
    el.querySelector('#p-submit').addEventListener('click', function () {
      var raw = UI.readInput(q, card);
      if (!raw) {
        U.confirmBox({ title: '还没有作答', message: '直接提交会按「未作答」判错并进入错题本，确定继续吗？', okText: '仍然提交', danger: true })
          .then(function (ok) { if (ok) doSubmit(q, card, raw); });
        return;
      }
      doSubmit(q, card, raw);
    });
    // 已提交过的题：回到上一题时显示原结果与解析
    var old = session.results[session.idx];
    if (old) { showResult(el, q, card, old.q, old.r, old.ans); }
  }
  function doSubmit(q, card, raw) {
    var dur = Date.now() - session.qStartAt;
    var r = G.submit(q, raw, { mode: 'practice', durationMs: dur });
    var ans = Data.answerOf(q.id);
    session.results[session.idx] = { qid: q.id, raw: raw, r: r, ans: ans, q: q, durationMs: dur };
    showResult(elRef(), q, card, q, r, ans);
  }
  function elRef() { return root.document.getElementById('view'); }
  function showResult(el, q, card, q2, r, ans) {
    UI.lockInput(card, q, r, ans);
    var fav = !!State.get().favorites[q.id];
    var extra =
      '<button class="btn btn-sm" data-pfav="' + U.esc(q.id) + '">' + (fav ? '★ 已收藏' : '☆ 收藏本题') + '</button>' +
      (!r.correct ? '<button class="btn btn-sm btn-soft" data-pwrong="1">已加入错题本 ›</button>' : '') +
      '<button class="btn btn-sm btn-primary" data-pnext="1">' + (session.idx + 1 >= session.questions.length ? '查看本次结果' : '下一题 →') + '</button>';
    card.querySelector('.q-result').innerHTML = UI.answerHtml(q, r, ans, extra);
    var btn = el.querySelector('#p-submit'); if (btn) { btn.disabled = true; btn.textContent = '本题已提交'; }
    U.qsa('[data-pfav]', card).forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-pfav');
        State.mutate(function (st) { if (st.favorites[id]) delete st.favorites[id]; else st.favorites[id] = Date.now(); });
        U.toast(State.get().favorites[id] ? '已收藏本题' : '已取消收藏', 'ok');
        b.textContent = State.get().favorites[id] ? '★ 已收藏' : '☆ 收藏本题';
      });
    });
    U.qsa('[data-pwrong]', card).forEach(function (b) { b.addEventListener('click', function () { App.go('/wrong'); }); });
    U.qsa('[data-pnext]', card).forEach(function (b) {
      b.addEventListener('click', function () {
        if (session.idx + 1 >= session.questions.length) finish();
        else { session.idx++; session.qStartAt = Date.now(); App.refresh(); }
      });
    });
  }
  function autoFinish() {
    // 未提交的题按「未作答」记录，保证限时练习数据完整
    for (var i = 0; i < session.questions.length; i++) {
      if (session.results[i]) continue;
      var q = session.questions[i];
      var r = G.submit(q, '', { mode: 'practice', durationMs: 0 });
      session.results[i] = { qid: q.id, raw: '', r: r, ans: Data.answerOf(q.id), q: q, durationMs: 0, timeout: true };
    }
    U.toast('时间到，已自动交卷', 'err');
    finish();
  }
  function finish() {
    session.finished = true;
    var ok = session.results.filter(function (r) { return r.r.correct; }).length;
    State.log('practice', '完成练习：' + ok + '/' + session.results.length + ' 题正确', '#/practice');
    App.refresh();
  }

  /* ---------------- 结果页 ---------------- */
  function renderResult(el) {
    var rs = session.results, ok = rs.filter(function (x) { return x.r.correct; }).length;
    var rate = U.pct(ok, rs.length);
    var dur = U.fmtDuration(elapsed());
    App.setTitle('练习结果', ok + '/' + rs.length + ' 题正确');
    el.innerHTML = UI.head('本次练习结果', session.timed ? '限时模式 · 用时 ' + dur : '不限时模式 · 用时 ' + dur,
      '<div class="btn-group"><button class="btn btn-sm" id="r-again">再来一组</button><button class="btn btn-sm" id="r-config">重新配置</button></div>') +
      '<div class="result-hero mb-4"><div class="score">' + rate + '<small>%</small></div>' +
        '<div class="sub">答对 ' + ok + ' / ' + rs.length + ' 题　·　错题 ' + (rs.length - ok) + ' 道　·　用时 ' + dur + '</div>' +
        '<div class="row wrap" style="justify-content:center;margin-top:14px"><a class="btn btn-sm btn-primary" href="#/wrong">查看错题本</a>' +
        '<a class="btn btn-sm" href="#/stats">查看学习统计</a></div></div>' +
      '<div class="card"><div class="section-title"><span class="bar"></span>逐题回顾</div>' +
        rs.map(function (x, i) {
          return '<div class="entry" style="padding:12px 0;border:0;border-bottom:1px solid var(--border)">' +
            '<div class="row-between wrap"><div class="row"><span class="chip ' + (x.r.correct ? 'success' : 'danger') + '">' + (x.r.correct ? '✓ 正确' : '✗ 错误') + '</span>' +
              '<b>第 ' + (i + 1) + ' 题</b><span class="tiny dim">' + U.esc(T.kpName(x.q.kp)) + '</span>' +
              (x.timeout ? '<span class="chip warning">超时未答</span>' : '') + '</div>' +
              '<button class="btn btn-sm" data-review="' + i + '">查看解析</button></div>' +
            '<div class="small muted mt-2">你的答案：' + U.esc(x.r.user) + '　｜　正确答案：' + U.esc(x.r.expected) + '</div>' +
            '<div class="review-body hidden" data-body="' + i + '"></div></div>';
        }).join('') + '</div>';

    U.qsa('[data-review]', el).forEach(function (b) {
      b.addEventListener('click', function () {
        var i = Number(b.getAttribute('data-review')), box = el.querySelector('[data-body="' + i + '"]');
        if (!box.classList.contains('hidden')) { box.classList.add('hidden'); b.textContent = '查看解析'; return; }
        var x = rs[i];
        box.innerHTML = '<div class="q-stem" style="margin:12px 0 0">' + App.Math.text(x.q.stem) + '</div>' +
          UI.answerHtml(x.q, x.r, x.ans, '<a class="btn btn-sm" href="#/wrong">去错题本重做</a>');
        box.classList.remove('hidden'); b.textContent = '收起解析';
      });
    });
    el.querySelector('#r-again').addEventListener('click', function () { start(session.filter); App.refresh(); });
    el.querySelector('#r-config').addEventListener('click', function () { session = null; App.refresh(); });
  }

  App.Views.practice = {
    render: function (el) {
      if (session && session.finished) renderResult(el);
      else if (session) renderSession(el);
      else renderConfig(el);
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
