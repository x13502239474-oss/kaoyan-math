/* 模拟考试：整卷 / 自定义题量 / 倒计时 / 题号导航 / 暂存答案 / 自动交卷 / 评分 / 逐题解析 / 历史 */
(function (root) {
  'use strict';
  var App = root.App = root.App || {};
  var U = App.U, M = App.Math, State = App.State, G = App.Grading, T = App.Taxonomy, UI = App.UI, Data = App.Data;
  var timer = null;
  var cfg = { count: 0, minutes: 0, chapter: 'all', difficulty: 'all' };

  /* ---------------- 考试首页 ---------------- */
  function renderHome(el) {
    var st = State.get();
    if (!cfg.count) { cfg.count = st.profile.examCount || 25; cfg.minutes = st.profile.examMinutes || 60; }
    var recent = st.exams.slice(0, 3);
    var maxByChapter = G.filterQuestions({ chapter: cfg.chapter, difficulty: cfg.difficulty }).length;
    el.innerHTML = UI.head('模拟考试', '整卷模拟 · 倒计时 · 题号导航 · 交卷后自动评分与逐题解析',
      '<a class="btn btn-sm" href="#/exam/history">历史记录 ' + st.exams.length + ' 场</a>') +
      '<div class="card mb-4"><div class="section-title"><span class="bar"></span>组卷设置</div>' +
        '<div class="filter-bar">' +
          '<div class="field"><label>题量</label><input class="input" id="e-count" type="number" min="1" max="200" value="' + cfg.count + '"></div>' +
          '<div class="field"><label>考试时长（分钟）</label><input class="input" id="e-min" type="number" min="1" max="300" value="' + cfg.minutes + '"></div>' +
          '<div class="field"><label>章节范围</label>' + UI.chapterSelect('e-ch', cfg.chapter, '全部章节（整卷）') + '</div>' +
          '<div class="field"><label>难度</label><select class="select" id="e-diff">' +
            [['all', '全部难度'], ['1', '基础'], ['2', '进阶'], ['3', '挑战']].map(function (x) { return '<option value="' + x[0] + '"' + (cfg.difficulty === x[0] ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select></div>' +
        '</div>' +
        '<div class="notice mt-3" id="e-info">当前范围可用 ' + maxByChapter + ' 道题。</div>' +
        '<button class="btn btn-primary btn-lg btn-block mt-4" id="e-start">开始整卷模拟</button>' +
      '</div>' +
      '<div class="card mb-4"><div class="section-title"><span class="bar"></span>考试说明</div>' +
        '<ul class="bullets small">' +
          '<li>答题过程<b>自动暂存</b>，刷新或关闭浏览器后可继续，剩余时间按开始时刻计算。</li>' +
          '<li>题号导航可查看已答 / 未答 / 标记状态，点击题号直接跳转。</li>' +
          '<li>可随时主动交卷；时间结束会<b>自动交卷</b>，未作答按错题计入。</li>' +
          '<li>交卷后自动评分、汇总错题、逐题展示四段式解析，并写入历史记录。</li>' +
          '<li>题目为演示题 / AI 生成练习题，<b>不是真题</b>，成绩仅用于熟悉流程。</li>' +
        '</ul></div>' +
      '<div class="card"><div class="section-title"><span class="bar"></span>最近考试</div>' +
        (recent.length ? recent.map(function (x) {
          return '<a class="task-row" href="#/exam/result/' + U.esc(x.id) + '"><span class="grow"><span class="t">' + U.esc(U.fmtFull(x.startedAt)) + '　·　' + x.score + ' 分</span>' +
            '<div class="tiny dim">答对 ' + x.correct + '/' + x.total + ' 题 · 用时 ' + U.fmtDuration(x.usedSec) + (x.submittedBy === 'timeout' ? ' · 超时自动交卷' : '') + '</div></span><span class="dim">›</span></a>';
        }).join('') : '<p class="muted small">还没有考试记录，开始第一场吧。</p>') + '</div>';

    function update() {
      var c = U.clamp(Number(el.querySelector('#e-count').value) || 1, 1, 200);
      var m = U.clamp(Number(el.querySelector('#e-min').value) || 1, 1, 300);
      var ch = el.querySelector('#e-ch').value, d = el.querySelector('#e-diff').value;
      var n = G.filterQuestions({ chapter: ch, difficulty: d }).length;
      el.querySelector('#e-info').innerHTML = n
        ? '当前范围可用 <b>' + n + '</b> 道题，将抽取 <b>' + Math.min(c, n) + '</b> 道，时长 <b>' + m + '</b> 分钟。'
        : '<b>当前范围没有可用题目</b>，请放宽筛选条件。';
      el.querySelector('#e-start').disabled = n === 0;
      return { count: c, minutes: m, chapter: ch, difficulty: d };
    }
    ['#e-count', '#e-min', '#e-ch', '#e-diff'].forEach(function (s) { el.querySelector(s).addEventListener('change', update); });
    el.querySelector('#e-start').addEventListener('click', function () {
      cfg = update();
      State.mutate(function (s) { s.profile.examCount = cfg.count; s.profile.examMinutes = cfg.minutes; });
      if (!G.startExam(cfg)) { U.toast('没有可用题目', 'err'); return; }
      App.refresh();
    });
    update();
  }

  /* ---------------- 考试进行中 ---------------- */
  function renderRunning(el, draft) {
    var i = U.clamp(draft.current || 0, 0, draft.questionIds.length - 1);
    var qid = draft.questionIds[i], q = Data.findQuestion(qid);
    if (!q) { U.toast('题目数据缺失，已结束考试', 'err'); G.submitExam('manual'); App.go('/exam'); return; }
    var answered = draft.questionIds.filter(function (id) { var v = draft.answers[id]; return v != null && v !== ''; }).length;
    App.setTitle('模拟考试进行中', '第 ' + (i + 1) + '/' + draft.questionIds.length + ' 题 · 已答 ' + answered + ' 题');

    el.innerHTML =
      '<div class="session-top"><div class="row wrap"><span class="chip brand">第 ' + (i + 1) + ' / ' + draft.questionIds.length + ' 题</span>' +
        '<span class="chip ' + (draft.flags[qid] ? 'warning' : '') + '">' + (draft.flags[qid] ? '已标记' : UI.qtypeLabel(q.qtype)) + '</span>' +
        '<span class="chip">已答 ' + answered + '</span></div>' +
        '<div class="row"><span class="timer" id="e-timer">--:--</span></div></div>' +
      '<div class="card flat mb-3" style="padding:10px 12px"><div class="row-between"><span class="small muted">剩余时间</span>' +
        '<div class="btn-group"><button class="btn btn-sm" id="e-sheet">题号导航</button>' +
        '<button class="btn btn-sm" id="e-flag">' + (draft.flags[qid] ? '取消标记' : '标记本题') + '</button>' +
        '<button class="btn btn-sm btn-danger" id="e-submit">交卷</button></div></div></div>' +
      '<div id="e-card-wrap">' + UI.questionHtml(q, { no: i + 1, tag: '<span class="chip brand">模拟考试</span>' }) + '</div>' +
      '<div class="session-nav">' +
        '<button class="btn grow" id="e-prev" ' + (i === 0 ? 'disabled' : '') + '>← 上一题</button>' +
        '<button class="btn btn-primary grow" id="e-next">' + (i === draft.questionIds.length - 1 ? '最后一题 · 去交卷' : '下一题 →') + '</button>' +
      '</div>' +
      '<p class="tiny dim mt-3">答案已自动暂存，刷新页面不会丢失；' + U.esc(UI.sourceNote(q)) + '</p>' +
      '<div class="notice mt-3">交卷前不会判题，也不会显示答案。考试中可随时通过底部导航切到别的页面，回来继续作答。</div>';

    var card = el.querySelector('.q-card');
    // 回填已暂存答案
    var saved = draft.answers[qid];
    if (saved != null && saved !== '') {
      if (q.qtype === 'single' || q.qtype === 'judge' || q.qtype === 'multi') {
        var keys = q.qtype === 'multi' ? String(saved).split('') : [String(saved)];
        U.qsa('.option', card).forEach(function (b) { if (keys.indexOf(b.getAttribute('data-opt')) >= 0) b.classList.add('sel'); });
      } else {
        var inp = card.querySelector('[data-blank]') || card.querySelector('[data-essay]');
        if (inp) inp.value = saved;
      }
    }
    UI.bindInput(card, q, function (v) { G.saveExamAnswer(qid, v); });

    function tick() {
      var t = el.querySelector('#e-timer');
      var left = G.examRemaining(State.get().examDraft || draft);
      if (t) { t.textContent = U.fmtDuration(left); t.classList.toggle('urgent', left <= 60); }
      if (left <= 0) {
        clearInterval(timer);
        var exam = G.submitExam('timeout');
        U.toast('考试时间到，已自动交卷', 'err');
        App.go('/exam/result/' + (exam ? exam.id : ''));
      }
    }
    timer = setInterval(tick, 1000); tick();
    App.Router.beforeLeave(function () { clearInterval(timer); });

    function jump(n) {
      State.mutate(function (st) { if (st.examDraft) st.examDraft.current = n; });
      App.refresh();
    }
    el.querySelector('#e-prev').onclick = function () { jump(i - 1); };
    el.querySelector('#e-next').onclick = function () {
      if (i === draft.questionIds.length - 1) doSubmit(); else jump(i + 1);
    };
    el.querySelector('#e-flag').onclick = function () { G.saveExamAnswer(qid, undefined, !draft.flags[qid]); App.refresh(); };
    el.querySelector('#e-sheet').onclick = function () { sheet(draft, i, jump); };
    el.querySelector('#e-submit').onclick = doSubmit;

    function doSubmit() {
      var d = State.get().examDraft || draft;
      var done = d.questionIds.filter(function (id) { var v = d.answers[id]; return v != null && v !== ''; }).length;
      U.confirmBox({
        title: '确认交卷？', danger: false, okText: '确认交卷',
        message: '已答 ' + done + ' / ' + d.questionIds.length + ' 题，未答 ' + (d.questionIds.length - done) + ' 题将按错误计入。交卷后立即评分并展示逐题解析。'
      }).then(function (ok) {
        if (!ok) return;
        clearInterval(timer);
        var exam = G.submitExam('manual');
        App.go('/exam/result/' + (exam ? exam.id : ''));
      });
    }
  }
  function sheet(draft, current, jump) {
    var answered = draft.answers, flags = draft.flags;
    U.openModal('<h2>题号导航</h2><p class="small muted mb-3">已答 ' +
      draft.questionIds.filter(function (id) { return answered[id] != null && answered[id] !== ''; }).length + ' / ' + draft.questionIds.length + ' 题</p>' +
      '<div class="sheet-grid">' + draft.questionIds.map(function (id, i) {
        var cls = [];
        if (answered[id] != null && answered[id] !== '') cls.push('answered');
        if (flags[id]) cls.push('flagged');
        if (i === current) cls.push('current');
        return '<button class="' + cls.join(' ') + '" data-jump="' + i + '">' + (i + 1) + '</button>';
      }).join('') + '</div>' +
      '<div class="legend mt-4"><span><i style="background:var(--brand-weak)"></i>已答</span><span><i style="background:var(--surface);border:2px solid var(--warning)"></i>已标记</span><span><i style="background:var(--brand)"></i>当前</span></div>' +
      '<div class="modal-foot"><button class="btn" data-close-modal>继续答题</button></div>',
      function (host) {
        U.qsa('[data-jump]', host).forEach(function (b) {
          b.onclick = function () { U.closeModal(); jump(Number(b.getAttribute('data-jump'))); };
        });
      });
  }

  /* ---------------- 结果页 ---------------- */
  App.Views.examResult = {
    render: function (el, params) {
      var exam = State.get().exams.find(function (x) { return x.id === params[0]; });
      if (!exam) { el.innerHTML = UI.empty('🔍', '找不到这场考试', '可能已被清理。', '<a class="btn btn-primary" href="#/exam/history">查看历史记录</a>'); return; }
      var wrong = exam.results.filter(function (r) { return !r.correct; });
      App.setTitle('考试成绩 ' + exam.score + ' 分', U.fmtFull(exam.startedAt));
      el.innerHTML = UI.head('考试结果与逐题解析', U.fmtFull(exam.startedAt) + ' · ' + (exam.submittedBy === 'timeout' ? '时间到自动交卷' : '主动交卷'),
        '<div class="btn-group"><a class="btn btn-sm" href="#/exam/history">历史记录</a><a class="btn btn-sm btn-primary" href="#/exam">再考一场</a></div>') +
        '<div class="result-hero mb-4"><div class="score">' + exam.score + '<small> 分</small></div>' +
          '<div class="sub">答对 ' + exam.correct + ' / ' + exam.total + ' 题　·　用时 ' + U.fmtDuration(exam.usedSec) +
          ' / ' + U.fmtDuration(exam.durationSec) + '　·　错题 ' + wrong.length + ' 道</div>' +
          '<div class="row wrap" style="justify-content:center;margin-top:14px"><a class="btn btn-sm btn-primary" href="#/wrong">查看错题本</a>' +
          '<a class="btn btn-sm" href="#/stats">查看学习统计</a></div></div>' +
        '<div class="grid grid-4 mb-4"><div class="stat success"><div class="num">' + exam.correct + '</div><div class="lbl">答对题数</div></div>' +
          '<div class="stat danger"><div class="num">' + wrong.length + '</div><div class="lbl">错题数</div></div>' +
          '<div class="stat brand"><div class="num">' + U.pct(exam.correct, exam.total) + '%</div><div class="lbl">正确率</div></div>' +
          '<div class="stat"><div class="num">' + Math.round(exam.usedSec / Math.max(1, exam.total)) + 's</div><div class="lbl">平均每题用时</div></div></div>' +
        (wrong.length ? '<div class="card mb-4"><div class="section-title"><span class="bar"></span>错题汇总</div><div class="row wrap">' +
          wrong.map(function (r) { var n = exam.results.indexOf(r); return '<button class="chip danger" data-erscroll="' + n + '">第 ' + (n + 1) + ' 题</button>'; }).join('') +
          '</div></div>' : '') +
        '<div class="card"><div class="section-title"><span class="bar"></span>全部题目解析</div>' +
          exam.results.map(function (r, i) {
            var q = Data.findQuestion(r.qid), ans = Data.answerOf(r.qid);
            if (!q) return '';
            var rr = { correct: r.correct, user: r.userAnswer, expected: r.rightAnswer, missed: r.missed || [], hitRatio: r.hitRatio || 0 };
            return '<div class="entry" data-erow="' + i + '" id="er-' + i + '" style="padding:12px 0;border:0;border-bottom:1px solid var(--border)">' +
              '<div class="row-between wrap"><div class="row wrap"><span class="chip ' + (r.correct ? 'success' : 'danger') + '">' + (r.correct ? '✓' : '✗') + '</span><b>第 ' + (i + 1) + ' 题</b>' +
                '<span class="tiny dim">' + U.esc(T.kpName(q.kp)) + '</span></div>' +
                '<button class="btn btn-sm" data-er="' + i + '">查看解析</button></div>' +
              '<div class="small muted mt-2">你的答案：' + U.esc(r.userAnswer) + '　｜　正确答案：' + U.esc(r.rightAnswer) + '</div>' +
              '<div class="review-body hidden" data-erbody="' + i + '"></div></div>';
          }).join('') + '</div>';

      U.qsa('[data-erscroll]', el).forEach(function (b) {
        b.onclick = function () {
          var row = el.querySelector('#er-' + b.getAttribute('data-erscroll'));
          if (!row) return;
          row.scrollIntoView({ behavior: 'smooth', block: 'center' });
          var btn = row.querySelector('[data-er]'), box = row.querySelector('[data-erbody]');
          if (btn && box && box.classList.contains('hidden')) btn.click();
        };
      });
      U.qsa('[data-er]', el).forEach(function (b) {
        b.onclick = function () {
          var i = Number(b.getAttribute('data-er')), box = el.querySelector('[data-erbody="' + i + '"]');
          if (!box.classList.contains('hidden')) { box.classList.add('hidden'); b.textContent = '查看解析'; return; }
          var r = exam.results[i], q = Data.findQuestion(r.qid), ans = Data.answerOf(r.qid);
          var rr = { correct: r.correct, user: r.userAnswer, expected: r.rightAnswer, missed: r.missed || [], hitRatio: r.hitRatio || 0 };
          box.innerHTML = '<div class="q-stem" style="margin:12px 0 0">' + M.text(q.stem) + '</div>' + UI.answerHtml(q, rr, ans, '');
          box.classList.remove('hidden'); b.textContent = '收起解析';
        };
      });
    }
  };

  /* ---------------- 历史 ---------------- */
  App.Views.examHistory = {
    render: function (el) {
      var exams = State.get().exams;
      var max = Math.max.apply(null, [100].concat(exams.map(function (x) { return x.score; })));
      el.innerHTML = UI.head('历史考试记录', '共 ' + exams.length + ' 场 · 成绩与答题记录都保存在本机',
        '<a class="btn btn-sm btn-primary" href="#/exam">开始新考试</a>') +
        (exams.length ? '<div class="card mb-4"><div class="section-title"><span class="bar"></span>成绩趋势（最近 10 场）</div>' +
          '<div class="spark">' + exams.slice(0, 10).reverse().map(function (x) {
            var h = Math.max(4, Math.round(x.score / max * 88));
            return '<div class="col" style="height:100%"><i style="height:' + h + '%"></i><small>' + x.score + '</small></div>';
          }).join('') + '</div><div style="height:20px"></div></div>' : '') +
        '<div class="card">' + (exams.length ? exams.map(function (x) {
          return '<a class="task-row" href="#/exam/result/' + U.esc(x.id) + '"><span class="grow"><span class="t">' +
            U.esc(U.fmtFull(x.startedAt)) + '　·　<b>' + x.score + ' 分</b></span>' +
            '<div class="tiny dim">答对 ' + x.correct + '/' + x.total + ' 题 · 用时 ' + U.fmtDuration(x.usedSec) +
            ' · ' + (x.submittedBy === 'timeout' ? '超时自动交卷' : '主动交卷') + '</div></span><span class="dim">›</span></a>';
        }).join('') + '<div class="mt-4"><button class="btn btn-sm btn-danger" id="eh-clear">清空考试历史</button></div>' :
          UI.empty('📝', '还没有考试记录', '完成一场模拟考试后，成绩与逐题解析会保存在这里。', '<a class="btn btn-primary" href="#/exam">去考试</a>')) + '</div>';
      if (el.querySelector('#eh-clear')) el.querySelector('#eh-clear').onclick = function () {
        U.confirmBox({ title: '清空考试历史', message: '将删除全部 ' + exams.length + ' 场考试记录（答题统计与错题本保留），此操作不可撤销。建议先导出备份。', okText: '确认清空', danger: true })
          .then(function (ok) { if (ok) { State.mutate(function (st) { st.exams = []; }); U.toast('考试历史已清空'); App.refresh(); } });
      };
    }
  };

  /* ---------------- 主入口 ---------------- */
  App.Views.exam = {
    render: function (el) {
      var draft = State.get().examDraft;
      if (draft) renderRunning(el, draft); else renderHome(el);
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
