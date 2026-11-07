/* 复习系统：手动添加 / 到期排序 / 上次与下次复习时间 / 间隔重复 / 掌握标记 */
(function (root) {
  'use strict';
  var App = root.App = root.App || {};
  var U = App.U, State = App.State, G = App.Grading, T = App.Taxonomy, UI = App.UI;
  var view = { scope: 'due', type: 'all' };
  var TYPE_LABEL = { course: '课程', kp: '知识点', wrong: '错题', custom: '自定义' };

  function statusOf(r) {
    if (r.status === 'mastered') return { cls: 'mastered', label: '已掌握', chip: 'success' };
    if (r.nextReviewAt <= Date.now()) return { cls: 'due', label: '已到期', chip: 'danger' };
    if (U.dayDiff(r.nextReviewAt, Date.now()) <= 1) return { cls: 'today', label: '即将到期', chip: 'warning' };
    return { cls: '', label: '复习中', chip: '' };
  }
  function itemHtml(r) {
    var s = statusOf(r);
    return '<div class="entry review-item ' + s.cls + '" data-rkey="' + U.esc(r.key) + '">' +
      '<div class="e-head"><span class="chip ' + s.chip + '">' + s.label + '</span>' +
        '<span class="chip">' + U.esc(TYPE_LABEL[r.type] || r.type) + '</span>' +
        '<span class="chip">' + U.esc(T.chapterShort(r.chapter)) + '</span>' +
        (r.kp ? '<span class="chip">' + U.esc(T.kpName(r.kp)) + '</span>' : '') +
        '<span class="tiny dim">间隔阶段 ' + (r.stage || 0) + '/' + G.INTERVALS.length + '</span></div>' +
      '<div class="bold" style="font-size:var(--fs-md)">' + U.esc(r.title) + '</div>' +
      (r.note ? '<div class="small muted mt-2">📝 ' + U.esc(r.note) + '</div>' : '') +
      '<div class="row wrap small muted mt-3"><span>上次复习：' + (r.lastReviewAt ? U.esc(U.fmtDateTime(r.lastReviewAt)) : '尚未复习') + '</span>' +
        '<span>下次复习：<b>' + U.esc(U.fmtDate(r.nextReviewAt)) + '</b></span></div>' +
      '<div class="e-foot">' +
        (r.status !== 'mastered' ? '<button class="btn btn-sm btn-success" data-rok="' + U.esc(r.key) + '">✓ 已掌握</button>' +
          '<button class="btn btn-sm" data-rno="' + U.esc(r.key) + '">仍需复习</button>' : '<button class="btn btn-sm" data-rreset="' + U.esc(r.key) + '">重新学习</button>') +
        '<button class="btn btn-sm" data-rnote="' + U.esc(r.key) + '">编辑备注</button>' +
        '<button class="btn btn-sm btn-danger" data-rdel="' + U.esc(r.key) + '">移出计划</button>' +
        (r.type === 'course' ? '<a class="btn btn-sm" href="#/course/' + U.esc(r.refId) + '">去课程</a>' : '') +
        (r.type === 'wrong' ? '<a class="btn btn-sm" href="#/wrong">去错题本</a>' : '') +
      '</div></div>';
  }
  function addModal(el) {
    U.openModal(
      '<h2>添加复习知识点</h2>' +
      '<div class="stack">' +
        '<div class="field"><label>复习来源</label><div class="pill-choices" id="rv-type">' +
          '<button data-t="kp" class="on">从知识点选择</button><button data-t="custom">自定义标题</button></div></div>' +
        '<div id="rv-from-kp"><div class="grid grid-2 tight">' +
          '<div class="field"><label>章节</label>' + UI.chapterSelect('rv-ch', 'all', '请选择章节') + '</div>' +
          '<div class="field"><label>知识点</label>' + UI.kpSelect('rv-kp', 'all', 'all') + '</div></div></div>' +
        '<div id="rv-custom" class="hidden"><div class="field"><label>标题</label><input class="input" id="rv-title" placeholder="例如：韦达定理与对称式"></div></div>' +
        '<div class="field"><label>备注（可选）</label><input class="input" id="rv-note" placeholder="记下要重点回看的内容"></div>' +
        '<div class="field"><label>下次复习日期</label><input class="input" type="date" id="rv-date" value="' + U.dateKey() + '"></div>' +
      '</div>' +
      '<div class="modal-foot"><button class="btn" data-close-modal>取消</button><button class="btn btn-primary" id="rv-save">加入计划</button></div>',
      function (host) {
        var mode = 'kp';
        U.qsa('[data-t]', host).forEach(function (b) {
          b.onclick = function () {
            mode = b.getAttribute('data-t');
            U.qsa('[data-t]', host).forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on');
            host.querySelector('#rv-from-kp').classList.toggle('hidden', mode !== 'kp');
            host.querySelector('#rv-custom').classList.toggle('hidden', mode !== 'custom');
          };
        });
        host.querySelector('#rv-ch').onchange = function () {
          host.querySelector('#rv-kp').outerHTML = UI.kpSelect('rv-kp', host.querySelector('#rv-ch').value, 'all');
        };
        host.querySelector('#rv-save').onclick = function () {
          var ch = host.querySelector('#rv-ch').value;
          var kp = host.querySelector('#rv-kp') ? host.querySelector('#rv-kp').value : 'all';
          var note = host.querySelector('#rv-note').value.trim();
          var date = host.querySelector('#rv-date').value || U.dateKey();
          var title, type, refId, chapter = ch === 'all' ? '' : ch, kpId = kp === 'all' ? '' : kp;
          if (mode === 'kp') {
            if (kp === 'all') { U.toast('请选择一个具体知识点', 'err'); return; }
            title = T.kpName(kp); type = 'kp'; refId = kp;
          } else {
            title = host.querySelector('#rv-title').value.trim();
            if (!title) { U.toast('请填写标题', 'err'); return; }
            type = 'custom'; refId = U.uid('custom');
          }
          var key = G.upsertReview({ type: type, refId: refId, title: title, chapter: chapter, kp: kpId, note: note });
          var ts = new Date(date + 'T00:00:00').getTime();
          State.mutate(function (st) { if (st.review[key]) { st.review[key].nextReviewAt = ts || Date.now(); st.review[key].status = 'due'; } });
          State.log('review', '添加复习项：' + title, '#/review');
          U.closeModal(); U.toast('已加入复习计划', 'ok'); App.refresh();
        };
      }
    );
  }

  App.Views.review = {
    render: function (el) {
      var all = G.reviewList({}), due = G.reviewList({ onlyDue: true });
      var mastered = all.filter(function (r) { return r.status === 'mastered'; }).length;
      var arr = view.scope === 'due' ? due : view.scope === 'mastered' ? all.filter(function (r) { return r.status === 'mastered'; }) : G.reviewList({ hideMastered: false });
      if (view.type !== 'all') arr = arr.filter(function (r) { return r.type === view.type; });
      arr.sort(function (a, b) { return a.nextReviewAt - b.nextReviewAt; });

      el.innerHTML = UI.head('复习计划', '课程、错题和知识点都能加入；按到期时间排序，标记掌握后自动拉长间隔',
        '<button class="btn btn-primary btn-sm" id="rv-add">＋ 手动添加</button>') +
        '<div class="grid grid-4 mb-4">' +
          '<div class="stat danger"><div class="num">' + due.length + '</div><div class="lbl">今日待复习</div></div>' +
          '<div class="stat brand"><div class="num">' + all.length + '</div><div class="lbl">计划总数</div></div>' +
          '<div class="stat success"><div class="num">' + mastered + '</div><div class="lbl">已掌握</div></div>' +
          '<div class="stat"><div class="num">' + Object.keys(State.get().review).length + '</div><div class="lbl">记录条数</div></div>' +
        '</div>' +
        '<div class="card mb-4"><div class="row-between wrap"><div class="segmented" id="rv-scope">' +
          [['due', '到期优先'], ['all', '全部计划'], ['mastered', '已掌握']].map(function (x) {
            return '<button data-s="' + x[0] + '" class="' + (view.scope === x[0] ? 'on' : '') + '">' + x[1] + '</button>';
          }).join('') + '</div>' +
          '<select class="select" id="rv-type-filter" style="max-width:180px">' +
            [['all', '全部来源'], ['course', '课程'], ['kp', '知识点'], ['wrong', '错题'], ['custom', '自定义']].map(function (x) {
              return '<option value="' + x[0] + '"' + (view.type === x[0] ? ' selected' : '') + '>' + x[1] + '</option>';
            }).join('') + '</select></div></div>' +
        '<div id="rv-list">' + (arr.length ? arr.map(itemHtml).join('') :
          UI.empty('🗓️', view.scope === 'due' ? '今天没有到期的复习项' : '还没有复习项',
            '可以在课程详情点「加入复习计划」，在错题本点「加入复习」，或手动添加知识点。',
            '<button class="btn btn-primary" id="rv-add2">＋ 手动添加</button>')) + '</div>' +
        '<div class="notice mt-4">间隔规则：标记「已掌握」后按 1 → 2 → 4 → 7 → 15 天逐次拉长间隔，连过 5 关记为已掌握；标记「仍需复习」则回到第 1 档、次日再来。所有时间都保存在本机。</div>';

      function bind() {
        U.qsa('[data-rok]', el).forEach(function (b) { b.onclick = function () { G.markReview(b.getAttribute('data-rok'), true); U.toast('已记录掌握，间隔已拉长', 'ok'); App.refresh(); }; });
        U.qsa('[data-rno]', el).forEach(function (b) { b.onclick = function () { G.markReview(b.getAttribute('data-rno'), false); U.toast('明天再复习一次'); App.refresh(); }; });
        U.qsa('[data-rreset]', el).forEach(function (b) { b.onclick = function () {
          var k = b.getAttribute('data-rreset');
          State.mutate(function (st) { if (st.review[k]) { st.review[k].stage = 0; st.review[k].status = 'due'; st.review[k].nextReviewAt = Date.now(); } });
          App.refresh();
        }; });
        U.qsa('[data-rdel]', el).forEach(function (b) { b.onclick = function () {
          U.confirmBox({ title: '移出复习计划', message: '只删除这条复习安排，不影响课程与错题记录。', okText: '移出', danger: true })
            .then(function (ok) { if (ok) { G.removeReview(b.getAttribute('data-rdel')); App.refresh(); } });
        }; });
        U.qsa('[data-rnote]', el).forEach(function (b) { b.onclick = function () {
          var k = b.getAttribute('data-rnote'), cur = State.get().review[k] || {};
          U.openModal('<h2>编辑备注</h2><textarea class="textarea" id="rn-text" placeholder="写下要重点回看的内容">' + U.esc(cur.note || '') + '</textarea>' +
            '<div class="modal-foot"><button class="btn" data-close-modal>取消</button><button class="btn btn-primary" id="rn-save">保存</button></div>',
            function (host) {
              host.querySelector('#rn-save').onclick = function () {
                var v = host.querySelector('#rn-text').value;
                State.mutate(function (st) { if (st.review[k]) st.review[k].note = v; });
                U.closeModal(); U.toast('备注已保存', 'ok'); App.refresh();
              };
            });
        }; });
      }
      bind();
      U.qsa('[data-s]', el).forEach(function (b) { b.onclick = function () { view.scope = b.getAttribute('data-s'); App.refresh(); }; });
      el.querySelector('#rv-type-filter').onchange = function () { view.type = this.value; App.refresh(); };
      el.querySelector('#rv-add').onclick = function () { addModal(el); };
      if (el.querySelector('#rv-add2')) el.querySelector('#rv-add2').onclick = function () { addModal(el); };
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
