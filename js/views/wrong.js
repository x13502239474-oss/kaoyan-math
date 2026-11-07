/* 错题本：自动记录 / 去重累加 / 筛选排序 / 重新答题 / 标记掌握 / 加入复习 */
(function (root) {
  'use strict';
  var App = root.App = root.App || {};
  var U = App.U, M = App.Math, State = App.State, G = App.Grading, T = App.Taxonomy, UI = App.UI, Data = App.Data;
  var view = { chapter: 'all', kp: 'all', status: 'active', sort: 'recent' };

  function card(w, el) {
    var q = Data.findQuestion(w.qid);
    var ans = Data.answerOf(w.qid);
    var inReview = !!State.get().review[G.reviewKey('wrong', w.qid)];
    var stem = q ? q.stem : (w.stem || '（题目已被移除）');
    return '<div class="entry" data-wq="' + U.esc(w.qid) + '">' +
      '<div class="e-head">' + UI.sourceBadge(q || { sourceType: w.sourceType }) +
        '<span class="chip">' + U.esc(T.chapterShort(w.chapter)) + '</span>' +
        '<span class="chip">' + U.esc(T.kpName(w.kp)) + '</span>' +
        '<span class="chip danger">错 ' + (w.wrongCount || 1) + ' 次</span>' +
        (w.mastered ? '<span class="chip success">已掌握</span>' : '') +
        (inReview ? '<span class="chip warning">复习中</span>' : '') + '</div>' +
      '<div class="e-stem">' + M.text(stem) + '</div>' +
      '<div class="e-ans"><span class="bad">你的答案：' + U.esc(w.lastUserAnswer || '未作答') + '</span>' +
        '<span class="good">正确答案：' + U.esc(ans ? ans.answer : w.rightAnswer) + '</span></div>' +
      '<div class="tiny dim mt-2">最近错误：' + U.esc(U.fmtDateTime(w.lastWrongAt)) + '　·　首次：' + U.esc(U.fmtDateTime(w.firstWrongAt)) + '</div>' +
      '<div class="review-body hidden" data-wbody="' + U.esc(w.qid) + '"></div>' +
      '<div class="e-foot">' +
        (q && ans ? '<button class="btn btn-sm btn-primary" data-wredo="' + U.esc(w.qid) + '">重新答题</button>' : '') +
        (q && ans ? '<button class="btn btn-sm" data-wshow="' + U.esc(w.qid) + '">查看解析</button>' : '') +
        '<button class="btn btn-sm" data-wmaster="' + U.esc(w.qid) + '">' + (w.mastered ? '取消掌握' : '✓ 标记掌握') + '</button>' +
        '<button class="btn btn-sm ' + (inReview ? '' : 'btn-soft') + '" data-wreview="' + U.esc(w.qid) + '">' + (inReview ? '已在复习计划' : '加入复习计划') + '</button>' +
        '<button class="btn btn-sm btn-danger" data-wdel="' + U.esc(w.qid) + '">移出</button>' +
      '</div></div>';
  }
  function redo(qid, el) {
    var q = Data.findQuestion(qid), ans = Data.answerOf(qid);
    if (!q || !ans) return;
    U.openModal('<div class="row-between"><h2>重新答题</h2><span class="chip danger">已错 ' + ((State.get().wrongBook[qid] || {}).wrongCount || 1) + ' 次</span></div>' +
      '<div id="wr-card" class="mt-3">' + UI.questionHtml(q, { tag: '<span class="chip brand">错题重做</span>' }) + '</div>' +
      '<div class="btn-group mt-4"><button class="btn grow" data-close-modal>关闭</button><button class="btn btn-primary grow" id="wr-submit">提交答案</button></div>',
      function (host) {
        var card = host.querySelector('.q-card');
        UI.bindInput(card, q, function () {});
        host.querySelector('#wr-submit').onclick = function () {
          var raw = UI.readInput(q, card);
          var r = G.submit(q, raw, { mode: 'wrong-retry', autoResolve: true });
          UI.lockInput(card, q, r, ans);
          card.querySelector('.q-result').innerHTML = UI.answerHtml(q, r, ans,
            '<button class="btn btn-sm btn-primary" data-close-modal>完成</button>');
          host.querySelector('#wr-submit').disabled = true;
          U.toast(r.correct ? '答对了，已自动标记为掌握 ✓' : '又错了，错误次数已累加', r.correct ? 'ok' : 'err');
          App.refresh();
        };
      }
    );
  }

  App.Views.wrong = {
    render: function (el) {
      var arr = G.wrongList({ chapter: view.chapter, kp: view.kp, status: view.status, sort: view.sort });
      var all = Object.values(State.get().wrongBook);
      var active = all.filter(function (w) { return !w.mastered; }).length;
      el.innerHTML = UI.head('错题本', '答错自动收录；同一题反复做错只更新原记录并累加次数',
        '<a class="btn btn-sm" href="#/practice">去练习</a>') +
        '<div class="grid grid-4 mb-4">' +
          '<div class="stat danger"><div class="num">' + active + '</div><div class="lbl">未掌握错题</div></div>' +
          '<div class="stat"><div class="num">' + all.length + '</div><div class="lbl">错题总数</div></div>' +
          '<div class="stat warning"><div class="num">' + all.reduce(function (a, w) { return a + (w.wrongCount || 1); }, 0) + '</div><div class="lbl">累计错误次数</div></div>' +
          '<div class="stat success"><div class="num">' + (all.length - active) + '</div><div class="lbl">已标记掌握</div></div>' +
        '</div>' +
        '<div class="card mb-4"><div class="filter-bar">' +
          '<div class="field"><label>章节</label>' + UI.chapterSelect('w-ch', view.chapter) + '</div>' +
          '<div class="field"><label>知识点</label>' + UI.kpSelect('w-kp', view.chapter, view.kp) + '</div>' +
          '<div class="field"><label>状态</label><select class="select" id="w-status">' +
            sel([['active', '未掌握'], ['mastered', '已掌握'], ['all', '全部']], view.status) + '</select></div>' +
          '<div class="field"><label>排序</label><select class="select" id="w-sort">' +
            sel([['recent', '最近错误'], ['count', '错误次数'], ['oldest', '最早收录']], view.sort) + '</select></div>' +
        '</div></div>' +
        '<div id="w-list">' + (arr.length ? arr.map(function (w) { return card(w, el); }).join('') :
          UI.empty('🎉', '这里暂时是空的', view.status === 'active' ? '没有未掌握的错题，去练习里试试新题目吧。' : '换个筛选条件看看。',
            '<a class="btn btn-primary" href="#/practice">开始练习</a>')) + '</div>' +
        '<div class="notice mt-4">重新答题答对会<b>自动标记为已掌握</b>（记录保留，可随时取消）；答错则在原记录上累加错误次数，不会重复创建新条目。加入复习计划后，可在复习页按到期时间安排回看。</div>';

      function bindList() {
        U.qsa('[data-wredo]', el).forEach(function (b) { b.onclick = function () { redo(b.getAttribute('data-wredo'), el); }; });
        U.qsa('[data-wshow]', el).forEach(function (b) { b.onclick = function () {
          var id = b.getAttribute('data-wshow'), box = el.querySelector('[data-wbody="' + id + '"]');
          if (!box.classList.contains('hidden')) { box.classList.add('hidden'); b.textContent = '查看解析'; return; }
          var q = Data.findQuestion(id), ans = Data.answerOf(id), w = State.get().wrongBook[id];
          var r = { correct: false, user: w.lastUserAnswer, expected: G.displayAnswer(q, ans), missed: [], hitRatio: 0 };
          box.innerHTML = UI.answerHtml(q, r, ans, '');
          box.classList.remove('hidden'); b.textContent = '收起解析';
        }; });
        U.qsa('[data-wmaster]', el).forEach(function (b) { b.onclick = function () {
          var id = b.getAttribute('data-wmaster'), now = !State.get().wrongBook[id].mastered;
          G.markWrong(id, now); U.toast(now ? '已标记掌握' : '已取消掌握', 'ok'); App.refresh();
        }; });
        U.qsa('[data-wreview]', el).forEach(function (b) { b.onclick = function () {
          var id = b.getAttribute('data-wreview'), k = G.reviewKey('wrong', id);
          if (State.get().review[k]) { U.toast('已经在复习计划里了'); return; }
          var w = State.get().wrongBook[id];
          G.upsertReview({ type: 'wrong', refId: id, title: '错题：' + App.Math.plain((Data.findQuestion(id) || {}).stem || id).slice(0, 28), chapter: w.chapter, kp: w.kp });
          U.toast('已加入复习计划', 'ok'); App.refresh();
        }; });
        U.qsa('[data-wdel]', el).forEach(function (b) { b.onclick = function () {
          U.confirmBox({ title: '移出错题本', message: '这条错题记录及其复习安排会被删除，答题统计仍保留。', okText: '移出', danger: true })
            .then(function (ok) { if (ok) { G.removeWrong(b.getAttribute('data-wdel')); App.refresh(); } });
        }; });
      }
      bindList();
      el.querySelector('#w-ch').onchange = function () { view.chapter = this.value; view.kp = 'all'; App.refresh(); };
      el.querySelector('#w-kp').onchange = function () { view.kp = this.value; App.refresh(); };
      el.querySelector('#w-status').onchange = function () { view.status = this.value; App.refresh(); };
      el.querySelector('#w-sort').onchange = function () { view.sort = this.value; App.refresh(); };
    }
  };
  function sel(pairs, val) { return pairs.map(function (p) { return '<option value="' + p[0] + '"' + (val === p[0] ? ' selected' : '') + '>' + U.esc(p[1]) + '</option>'; }).join(''); }
})(typeof window !== 'undefined' ? window : globalThis);
