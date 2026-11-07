/* 课程学习：章节列表 + 课程详情（讲义 / 笔记 / 完成 / 复习 / 例题解析） */
(function (root) {
  'use strict';
  var App = root.App = root.App || {};
  var U = App.U, M = App.Math, State = App.State, G = App.Grading, T = App.Taxonomy, UI = App.UI, Data = App.Data;

  function sortedCourses() { return Data.courses().slice().sort(function (a, b) { return (a.no || 0) - (b.no || 0); }); }

  /* ---------------- 列表 ---------------- */
  App.Views.courses = {
    render: function (el) {
      var st = State.get(), all = sortedCourses();
      var done = Object.keys(st.progress.completedCourses).length;
      var firstUndone = all.find(function (c) { return !st.progress.completedCourses[c.id]; });
      var openChapter = (st.progress.lastCourseId && Data.findCourse(st.progress.lastCourseId) || firstUndone || all[0] || {}).chapter;

      el.innerHTML = UI.head('课程学习', '按章节与知识点组织，共 ' + all.length + ' 课 · 已完成 ' + done + ' 课',
        '<div class="row"><span class="chip brand">总进度 ' + U.pct(done, all.length) + '%</span></div>') +
        '<div class="card mb-4"><div class="bar-track"><div class="bar-fill" style="width:' + U.pct(done, all.length) + '%"></div></div>' +
          '<p class="tiny dim mt-2">课程内容为学习整理（非教材原文）；例题解析点开可见，先自己想再看。</p></div>' +
        '<div class="search-box mb-4"><input class="input" id="course-search" placeholder="搜索课程标题或知识点…"></div>' +
        '<div id="chapter-list">' + T.chapters.map(function (c) {
          var lessons = all.filter(function (x) { return x.chapter === c.id; });
          if (!lessons.length) return '';
          var cDone = lessons.filter(function (x) { return st.progress.completedCourses[x.id]; }).length;
          return '<div class="chapter-block ' + (c.id === openChapter ? 'open' : '') + '" data-chapter="' + c.id + '">' +
            '<button class="chapter-head" data-toggle-chapter="' + c.id + '"><span class="idx">' + c.icon + '</span>' +
              '<span class="grow"><span class="bold">' + U.esc(c.name) + '</span>' +
              '<div class="tiny dim">' + U.esc(c.desc) + ' · ' + cDone + '/' + lessons.length + ' 课</div></span>' +
              '<span class="arrow">›</span></button>' +
            '<div class="chapter-body ' + (c.id === openChapter ? '' : 'hidden') + '">' +
              lessons.map(function (x) {
                var ok = !!st.progress.completedCourses[x.id];
                return '<a class="lesson-row" data-lesson="' + U.esc(x.id) + '" data-text="' + U.esc((x.title + ' ' + (x.kps || []).map(T.kpName).join(' ')).toLowerCase()) + '" href="#/course/' + U.esc(x.id) + '">' +
                  '<span class="ln">' + U.pad(x.no || 0) + '</span>' +
                  '<span class="check">' + (ok ? '✓' : '○') + '</span>' +
                  '<span class="grow"><span class="li-title">' + U.esc(x.title) + '</span>' +
                  '<div class="li-sub">' + (x.kps || []).map(function (k) { return U.esc(T.kpName(k)); }).join(' · ') + '</div></span>' +
                  '<span class="tiny dim nowrap">' + (x.minutes || 15) + ' 分钟</span></a>';
              }).join('') + '</div></div>';
        }).join('') + '</div>';

      U.qsa('[data-toggle-chapter]', el).forEach(function (b) {
        b.addEventListener('click', function () {
          var block = b.closest('.chapter-block'), body = block.querySelector('.chapter-body');
          block.classList.toggle('open'); body.classList.toggle('hidden');
        });
      });
      var search = el.querySelector('#course-search');
      search.addEventListener('input', function () {
        var kw = U.normalize(search.value);
        U.qsa('[data-chapter]', el).forEach(function (block) {
          var visible = 0;
          U.qsa('[data-lesson]', block).forEach(function (a) {
            var hit = !kw || a.getAttribute('data-text').indexOf(kw) >= 0;
            a.classList.toggle('hidden', !hit); if (hit) visible++;
          });
          block.classList.toggle('hidden', visible === 0);
          if (kw && visible) { block.classList.add('open'); block.querySelector('.chapter-body').classList.remove('hidden'); }
        });
      });
    }
  };

  /* ---------------- 详情 ---------------- */
  App.Views.course = {
    render: function (el, params) {
      var id = params[0], c = Data.findCourse(id);
      if (!c) { el.innerHTML = UI.empty('🔍', '课程不存在', '可能已被移除，返回课程列表看看。', '<a class="btn btn-primary" href="#/courses">返回课程列表</a>'); return; }
      var st = State.get(), done = !!st.progress.completedCourses[c.id];
      var note = st.notes[c.id] || { text: '', updatedAt: null };
      var inReview = !!st.review[G.reviewKey('course', c.id)];
      var all = sortedCourses(), idx = all.findIndex(function (x) { return x.id === c.id; });
      var prev = idx > 0 ? all[idx - 1] : null, next = idx < all.length - 1 ? all[idx + 1] : null;

      State.mutate(function (s) { s.progress.lastCourseId = c.id; });
      App.setTitle(c.title, T.chapterName(c.chapter) + ' · 第 ' + (c.no || idx + 1) + ' 课');

      var fHtml = (c.formulaIds || []).map(function (fid) {
        var f = Data.findFormula(fid); if (!f) return '';
        return '<div class="formula-box mb-2"><div class="small muted mb-2">' + U.esc(f.name) + '</div>' +
          '<div class="math" style="font-size:17px;text-align:center;overflow-x:auto">' + M.formula(f.tex) + '</div>' +
          '<div class="tiny dim mt-2">' + M.text(f.note) + '</div></div>';
      }).join('') || '<p class="muted small">本课暂无关联公式，可在公式库按章节查看。</p>';

      var methodHtml = (c.methods || []).map(function (m, i) {
        return '<h3>方法 ' + (i + 1) + '：' + M.text(m.title) + '</h3>' +
          '<ol class="steps">' + (m.steps || []).map(function (s) { return '<li>' + M.text(s) + '</li>'; }).join('') + '</ol>';
      }).join('');

      el.innerHTML =
        '<div class="row-between wrap mb-3"><a class="btn btn-sm" href="#/courses">← 课程列表</a>' +
          '<div class="row"><span class="chip">' + U.esc(T.chapterName(c.chapter)) + '</span><span class="chip">约 ' + (c.minutes || 15) + ' 分钟</span>' +
          (done ? '<span class="chip success">已完成</span>' : '') + '</div></div>' +

        '<div class="article">' +
          '<h1 style="font-size:var(--fs-xl);line-height:1.35;margin-bottom:8px">' + U.esc(c.title) + '</h1>' +
          '<div class="row wrap mb-4">' + (c.kps || []).map(function (k) { return '<a class="chip brand" href="#/practice?kp=' + U.esc(k) + '">' + U.esc(T.kpName(k)) + '</a>'; }).join('') + '</div>' +

          '<div class="key-box mb-4"><b>学完你能：</b><ul class="bullets mt-2">' +
            (c.goals || []).map(function (g) { return '<li>' + M.text(g) + '</li>'; }).join('') + '</ul></div>' +

          '<h2 class="sec">一、知识点说明</h2><p>' + M.text(c.summary || '') + '</p>' +

          '<h2 class="sec">二、重点与难点</h2>' +
          '<div class="grid grid-2 tight"><div class="key-box"><b>✅ 重点</b><ul class="bullets mt-2">' +
            (c.keyPoints || []).map(function (k) { return '<li>' + M.text(k) + '</li>'; }).join('') + '</ul></div>' +
            '<div class="note-box"><b>⚠️ 难点</b><ul class="bullets mt-2">' +
            (c.hardPoints || []).map(function (k) { return '<li>' + M.text(k) + '</li>'; }).join('') + '</ul></div></div>' +

          '<h2 class="sec">三、公式、定义与性质</h2>' + fHtml +

          '<h2 class="sec">四、解题方法</h2>' + methodHtml +

          '<h2 class="sec">五、典型例题</h2>' +
          (c.examples || []).map(function (ex, i) { return UI.exampleHtml(ex, i + 1); }).join('') +
          '<p class="tiny dim">例题均为自编示例，解析点开后按「答案 → 思路 → 演示 → 易错」四段展示。</p>' +

          (c.tip ? '<h2 class="sec">六、学习提示</h2><div class="note-box">💡 ' + M.text(c.tip) + '</div>' : '') +

          '<h2 class="sec">学习笔记</h2>' +
          '<textarea class="textarea" id="note-area" placeholder="记下你的理解、易错点或补充公式…（自动保存）">' + U.esc(note.text) + '</textarea>' +
          '<div class="row-between wrap mt-2"><span class="tiny dim" id="note-state">' + (note.updatedAt ? '上次保存 ' + U.esc(U.fmtDateTime(note.updatedAt)) : '还没有笔记') + '</span>' +
          '<button class="btn btn-sm" id="note-save">保存笔记</button></div>' +

          '<div class="course-actions">' +
            '<button class="btn ' + (done ? '' : 'btn-primary') + '" id="btn-done">' + (done ? '✓ 已完成（点击取消）' : '标记本课已完成') + '</button>' +
            '<button class="btn ' + (inReview ? '' : 'btn-soft') + '" id="btn-review">' + (inReview ? '已在复习计划' : '加入复习计划') + '</button>' +
            '<a class="btn" href="#/practice?chapter=' + U.esc(c.chapter) + '">练本章题目</a>' +
            '<span class="grow"></span>' +
            (prev ? '<a class="btn btn-sm" href="#/course/' + U.esc(prev.id) + '">← 上一课</a>' : '') +
            (next ? '<a class="btn btn-sm" href="#/course/' + U.esc(next.id) + '">下一课 →</a>' : '') +
          '</div>' +
        '</div>';

      /* 例题解析：先练后讲，点击才展开 */
      U.qsa('[data-toggle-ex]', el).forEach(function (b) {
        b.addEventListener('click', function () {
          var box = b.closest('.example').querySelector('.ex-body');
          if (!box.classList.contains('hidden')) { box.classList.add('hidden'); b.textContent = '查看详细解析'; return; }
          box.innerHTML = UI.exampleAnswerHtml(Data.exampleOf(b.getAttribute('data-toggle-ex')));
          box.classList.remove('hidden'); b.textContent = '收起解析';
        });
      });

      /* 笔记：输入防抖自动保存 + 手动保存 */
      var area = el.querySelector('#note-area'), stateEl = el.querySelector('#note-state'), timer = null;
      function saveNote(silent) {
        var text = area.value;
        State.mutate(function (s) { s.notes[c.id] = { text: text, updatedAt: Date.now() }; });
        stateEl.textContent = '已保存 ' + U.fmtDateTime(Date.now());
        if (!silent) U.toast('笔记已保存', 'ok');
      }
      area.addEventListener('input', function () {
        clearTimeout(timer);
        timer = setTimeout(function () { saveNote(true); }, 800);
      });
      el.querySelector('#note-save').addEventListener('click', function () { clearTimeout(timer); saveNote(false); });
      App.Router.beforeLeave(function () { if (timer) { clearTimeout(timer); saveNote(true); } });

      el.querySelector('#btn-done').addEventListener('click', function () {
        var now = !State.get().progress.completedCourses[c.id];
        State.mutate(function (s) {
          if (now) s.progress.completedCourses[c.id] = Date.now();
          else delete s.progress.completedCourses[c.id];
        });
        if (now) { State.bump('courses', 1); State.log('course', '完成课程：' + c.title, '#/course/' + c.id); }
        U.toast(now ? '已标记完成，真棒！' : '已取消完成标记', 'ok');
        App.refresh();
      });
      el.querySelector('#btn-review').addEventListener('click', function () {
        var k = G.reviewKey('course', c.id);
        if (State.get().review[k]) { U.toast('这门课已经在复习计划里了'); return; }
        G.upsertReview({ type: 'course', refId: c.id, title: c.title, chapter: c.chapter, kp: (c.kps || [])[0] || '' });
        State.log('review', '加入复习计划：' + c.title, '#/review');
        U.toast('已加入复习计划', 'ok'); App.refresh();
      });
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
