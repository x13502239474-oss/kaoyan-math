/* 启动器：导航骨架、全局委托、PWA 注册 */
(function (root) {
  'use strict';
  var App = root.App = root.App || {};
  var U = App.U, doc = root.document;

  var NAV = [
    { key: 'home', label: '学习首页', icon: '🏠', path: '#/home', tab: true },
    { key: 'courses', label: '课程学习', icon: '📚', path: '#/courses', tab: true },
    { key: 'practice', label: '专项练习', icon: '✏️', path: '#/practice', tab: true },
    { key: 'wrong', label: '错题本', icon: '🔖', path: '#/wrong', tab: true, badge: 'wrong' },
    { key: 'formulas', label: '公式库', icon: '📐', path: '#/formulas' },
    { key: 'review', label: '复习计划', icon: '🔁', path: '#/review', badge: 'due' },
    { key: 'exam', label: '模拟考试', icon: '📝', path: '#/exam' },
    { key: 'stats', label: '学习统计', icon: '📊', path: '#/stats' },
    { key: 'settings', label: '设置与备份', icon: '⚙️', path: '#/settings' }
  ];
  var TAB_KEYS = ['home', 'courses', 'practice', 'wrong', 'more'];

  function badgeValue(kind) {
    var st = App.State.get();
    if (kind === 'wrong') return Object.values(st.wrongBook).filter(function (w) { return !w.mastered; }).length;
    if (kind === 'due') return App.Grading.reviewList({ onlyDue: true }).length;
    return 0;
  }
  function updateBadges() {
    if (!doc) return;
    U.qsa('[data-badge]').forEach(function (n) {
      var v = badgeValue(n.getAttribute('data-badge'));
      n.textContent = v > 99 ? '99+' : v;
      n.style.display = v > 0 ? '' : 'none';
    });
    U.qsa('[data-dot]').forEach(function (n) {
      n.style.display = badgeValue(n.getAttribute('data-dot')) > 0 ? '' : 'none';
    });
  }
  function buildNav() {
    var side = doc.getElementById('sidebar'), tab = doc.getElementById('tabbar');
    if (side) {
      side.innerHTML =
        '<div class="nav-brand"><div class="logo">Σ</div><div><div class="t">数学自学台</div><div class="s">考研数学 · 个人版</div></div></div>' +
        '<div class="nav-list">' + NAV.map(function (n) {
          return '<a class="nav-item" data-nav="' + n.key + '" href="' + n.path + '"><span class="ni">' + n.icon + '</span><span>' + n.label + '</span>' +
            (n.badge ? '<span class="badge" data-badge="' + n.badge + '" style="display:none">0</span>' : '') + '</a>';
        }).join('') + '</div>' +
        '<div class="nav-foot">数据仅保存在本机浏览器<br>建议定期在「设置与备份」导出 JSON</div>';
    }
    if (tab) {
      tab.innerHTML = TAB_KEYS.map(function (k) {
        var n = k === 'more' ? { key: 'more', label: '更多', icon: '⋯', path: '#/more', badge: 'due' } : NAV.find(function (x) { return x.key === k; });
        return '<a class="tab-item" data-nav="' + n.key + '" href="' + n.path + '"><span class="ti">' + n.icon + '</span><span>' + n.label + '</span>' +
          '<span class="dot" data-dot="due" style="display:none"></span></a>';
      }).join('');
    }
    updateBadges();
  }

  function installPWA() {
    if (!root.navigator || !('serviceWorker' in root.navigator)) return;
    var proto = root.location && root.location.protocol;
    if (proto !== 'http:' && proto !== 'https:') return;   // file:// 下不注册，核心功能仍可用
    root.addEventListener('load', function () {
      root.navigator.serviceWorker.register('sw.js').catch(function () {});
    });
    root.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); App.deferredPrompt = e; });
  }

  function globalEvents() {
    doc.addEventListener('click', function (e) {
      var g = e.target.closest && e.target.closest('[data-go]');
      if (g) { e.preventDefault(); App.go(g.getAttribute('data-go')); return; }
      var c = e.target.closest && e.target.closest('[data-close-modal]');
      if (c) { e.preventDefault(); U.closeModal(); return; }
      var b = e.target.closest && e.target.closest('[data-back]');
      if (b) { e.preventDefault(); if (root.history.length > 1) root.history.back(); else App.go('/home'); }
    });
  }

  function boot() {
    if (App.__booted) return;          // 幂等：避免 DOMContentLoaded 被重复派发时重复绑定
    App.__booted = true;
    App.State.init();
    if (!App.Storage.available()) {
      setTimeout(function () { U.toast('浏览器禁用了本地存储，本次数据可能无法保存', 'err'); }, 600);
    }
    buildNav();
    App.State.subscribe(function () { updateBadges(); });
    globalEvents();
    App.Router.start();
    installPWA();
  }

  /* 对外便捷 API（供各视图使用） */
  App.NAV = NAV;
  App.go = function (p) { App.Router.go(p); };
  App.refresh = function () { App.Router.render(); };
  App.setTitle = function (t, s, a) { App.Router.setTitle(t, s, a); };
  App.updateBadges = updateBadges;

  if (doc) {
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
    else boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);
