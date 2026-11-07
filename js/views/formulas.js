/* 公式库：分类 / 收藏 / 掌握程度 / 隐藏自测 / 随机抽查 */
(function (root) {
  'use strict';
  var App = root.App = root.App || {};
  var U = App.U, M = App.Math, State = App.State, G = App.Grading, T = App.Taxonomy, UI = App.UI, Data = App.Data;
  var view = { chapter: 'all', kp: 'all', scope: 'all', kw: '', hiddenAll: false };
  var MASTERY = ['未学', '模糊', '熟悉', '掌握'];

  function fs(id) {
    var st = State.get();
    return st.formulaState[id] || (st.formulaState[id] = { favorite: false, mastery: 0, lastCheckAt: null });
  }
  function list() {
    return Data.formulas().filter(function (f) {
      if (view.chapter !== 'all' && f.chapter !== view.chapter) return false;
      if (view.kp !== 'all' && f.kp !== view.kp) return false;
      var s = State.get().formulaState[f.id] || { favorite: false, mastery: 0 };
      if (view.scope === 'fav' && !s.favorite) return false;
      if (view.scope === 'weak' && (s.mastery || 0) >= 2) return false;
      if (view.kw) {
        var hay = U.normalize(f.name + ' ' + M.plain(f.tex) + ' ' + (f.note || '') + ' ' + T.kpName(f.kp));
        if (hay.indexOf(U.normalize(view.kw)) < 0) return false;
      }
      return true;
    });
  }
  function card(f) {
    var s = State.get().formulaState[f.id] || { favorite: false, mastery: 0 };
    var hidden = view.hiddenAll;
    return '<div class="formula-card" data-fid="' + U.esc(f.id) + '">' +
      '<div class="fc-head"><h3>' + U.esc(f.name) + '</h3>' +
        '<button class="icon-btn ' + (s.favorite ? 'on' : '') + '" data-fav="' + U.esc(f.id) + '" title="收藏">' + (s.favorite ? '★' : '☆') + '</button>' +
        '<button class="icon-btn" data-hide="' + U.esc(f.id) + '" title="隐藏/显示公式">' + (hidden ? '👁' : '🙈') + '</button></div>' +
      '<div class="row wrap"><span class="chip">' + U.esc(T.chapterShort(f.chapter)) + '</span><span class="chip">' + U.esc(T.kpName(f.kp)) + '</span></div>' +
      '<div class="fc-body ' + (hidden ? 'blurred' : '') + '"><div class="formula-body">' + M.formula(f.tex) + '</div></div>' +
      '<div class="fc-note">' + M.text(f.note || '') + '</div>' +
      '<div class="row-between wrap"><span class="tiny dim">掌握程度</span><div class="mastery-dots">' +
        MASTERY.map(function (m, i) { return '<button class="' + ((s.mastery || 0) === i ? 'on' : '') + '" data-mastery="' + U.esc(f.id) + ':' + i + '" title="' + m + '">' + (i + 1) + '</button>'; }).join('') +
        '</div></div></div>';
  }
  function renderCards(el) {
    var arr = list(), box = el.querySelector('#formula-list');
    box.innerHTML = arr.length
      ? '<div class="grid grid-2 tight">' + arr.map(card).join('') + '</div>'
      : UI.empty('🔎', '没有匹配的公式', '换个章节、知识点或关键词试试。');
    el.querySelector('#formula-count').textContent = '共 ' + arr.length + ' 条';
    bindCards(el);
  }
  function bindCards(el) {
    U.qsa('[data-fav]', el).forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-fav');
        State.mutate(function (st) {
          var s = st.formulaState[id] || (st.formulaState[id] = { favorite: false, mastery: 0 });
          s.favorite = !s.favorite;
        });
        renderCards(el);
      });
    });
    U.qsa('[data-hide]', el).forEach(function (b) {
      b.addEventListener('click', function () {
        var c = b.closest('.formula-card').querySelector('.fc-body');
        c.classList.toggle('blurred'); b.textContent = c.classList.contains('blurred') ? '👁' : '🙈';
      });
    });
    U.qsa('[data-mastery]', el).forEach(function (b) {
      b.addEventListener('click', function () {
        var p = b.getAttribute('data-mastery').split(':');
        State.mutate(function (st) {
          var s = st.formulaState[p[0]] || (st.formulaState[p[0]] = { favorite: false, mastery: 0 });
          s.mastery = Number(p[1]); s.lastCheckAt = Date.now();
        });
        U.toast('已标记为「' + MASTERY[Number(p[1])] + '」', 'ok'); renderCards(el);
      });
    });
  }
  function quiz(el) {
    var pool = Data.formulas();
    if (!pool.length) { U.toast('公式库为空'); return; }
    function one() {
      var f = U.sample(pool, 1)[0];
      U.openModal(
        '<div class="row-between"><h2>🎲 随机公式抽查</h2><span class="chip brand">' + U.esc(T.chapterShort(f.chapter)) + '</span></div>' +
        '<p class="muted small mb-3">先自己回忆这条公式，再点开对照。</p>' +
        '<div class="card flat" style="background:var(--surface-2)"><b>' + U.esc(f.name) + '</b>' +
          '<div class="small muted mt-2">' + U.esc(T.kpName(f.kp)) + '：' + M.text(f.note || '') + '</div></div>' +
        '<div class="formula-box blurred mt-3" id="quiz-box"><div class="formula-body" style="text-align:center;font-size:18px">' + M.formula(f.tex) + '</div></div>' +
        '<div class="btn-group mt-4" id="quiz-actions"><button class="btn btn-primary grow" id="quiz-reveal">显示公式</button></div>' +
        '<div class="btn-group mt-2"><button class="btn grow" data-close-modal>结束抽查</button><button class="btn grow" id="quiz-next">换一条</button></div>',
        function (host) {
          host.querySelector('#quiz-reveal').onclick = function () {
            host.querySelector('#quiz-box').classList.remove('blurred');
            host.querySelector('#quiz-actions').innerHTML =
              '<button class="btn btn-danger grow" data-q="weak">仍需复习</button><button class="btn btn-success grow" data-q="ok">已掌握</button>';
            U.qsa('[data-q]', host).forEach(function (b) {
              b.onclick = function () {
                var ok = b.getAttribute('data-q') === 'ok';
                State.mutate(function (st) {
                  var s = st.formulaState[f.id] || (st.formulaState[f.id] = { favorite: false, mastery: 0 });
                  s.mastery = ok ? 3 : 1; s.lastCheckAt = Date.now();
                });
                if (!ok) G.upsertReview({ type: 'kp', refId: f.kp, title: '公式：' + f.name, chapter: f.chapter, kp: f.kp });
                State.log('formula', '公式抽查：' + f.name + (ok ? '（已掌握）' : '（加入复习）'), '#/formulas');
                one();
              };
            });
          };
          host.querySelector('#quiz-next').onclick = one;
        }
      );
    }
    one();
  }

  App.Views.formulas = {
    render: function (el) {
      el.innerHTML = UI.head('公式库', '按章节与知识点分类，可收藏、隐藏自测、标记掌握程度',
        '<div class="btn-group"><button class="btn btn-sm" id="toggle-hide">' + (view.hiddenAll ? '显示全部' : '隐藏全部自测') + '</button>' +
        '<button class="btn btn-primary btn-sm" id="random-quiz">🎲 随机抽查</button></div>') +
        '<div class="card mb-4"><div class="filter-bar">' +
          '<div class="field"><label>章节</label>' + UI.chapterSelect('f-ch', view.chapter) + '</div>' +
          '<div class="field"><label>知识点</label>' + UI.kpSelect('f-kp', view.chapter, view.kp) + '</div>' +
          '<div class="field"><label>搜索</label><div class="search-box"><input class="input" id="f-kw" placeholder="公式名称 / 内容" value="' + U.esc(view.kw) + '"></div></div>' +
        '</div><div class="row-between wrap mt-3"><div class="segmented" id="f-scope">' +
          [['all', '全部'], ['fav', '★ 已收藏'], ['weak', '待巩固']].map(function (x) {
            return '<button data-scope="' + x[0] + '" class="' + (view.scope === x[0] ? 'on' : '') + '">' + x[1] + '</button>';
          }).join('') + '</div><span class="tiny dim" id="formula-count"></span></div></div>' +
        '<div id="formula-list"></div>' +
        '<div class="notice mt-4">公式均为公共数学领域通用公式。<b>隐藏全部自测</b>会把公式内容模糊掉，点击卡片上的眼睛图标可单独揭示；<b>随机抽查</b>按「回忆 → 对照 → 自评」进行，选「仍需复习」会自动加入复习计划。</div>';
      renderCards(el);

      el.querySelector('#f-ch').addEventListener('change', function () { view.chapter = this.value; view.kp = 'all'; App.refresh(); });
      el.querySelector('#f-kp').addEventListener('change', function () { view.kp = this.value; renderCards(el); });
      el.querySelector('#f-kw').addEventListener('input', function () { view.kw = this.value; renderCards(el); });
      U.qsa('[data-scope]', el).forEach(function (b) {
        b.addEventListener('click', function () { view.scope = b.getAttribute('data-scope'); App.refresh(); });
      });
      el.querySelector('#toggle-hide').addEventListener('click', function () { view.hiddenAll = !view.hiddenAll; App.refresh(); });
      el.querySelector('#random-quiz').addEventListener('click', function () { quiz(el); });
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
