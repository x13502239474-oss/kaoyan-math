/* Hash 路由：无服务端 rewrite 需求，静态托管 / file:// 都能工作 */
(function (root) {
  'use strict';
  var App = root.App = root.App || {};
  App.Views = App.Views || {};
  var U = App.U;

  var ROUTES = [
    { re: /^\/home$/, view: 'home', title: '学习首页', nav: 'home' },
    { re: /^\/courses$/, view: 'courses', title: '课程学习', nav: 'courses' },
    { re: /^\/course\/([\w-]+)$/, view: 'course', title: '课程详情', nav: 'courses' },
    { re: /^\/formulas$/, view: 'formulas', title: '公式库', nav: 'more' },
    { re: /^\/practice$/, view: 'practice', title: '专项练习', nav: 'practice' },
    { re: /^\/review$/, view: 'review', title: '复习计划', nav: 'more' },
    { re: /^\/wrong$/, view: 'wrong', title: '错题本', nav: 'wrong' },
    { re: /^\/exam$/, view: 'exam', title: '模拟考试', nav: 'more' },
    { re: /^\/exam\/history$/, view: 'examHistory', title: '考试记录', nav: 'more' },
    { re: /^\/exam\/result\/([\w-]+)$/, view: 'examResult', title: '考试结果', nav: 'more' },
    { re: /^\/stats$/, view: 'stats', title: '学习统计', nav: 'more' },
    { re: /^\/settings$/, view: 'settings', title: '设置与备份', nav: 'more' },
    { re: /^\/more$/, view: 'more', title: '更多功能', nav: 'more' }
  ];
  var leaveHooks = [];

  function path() {
    var h = (root.location && root.location.hash || '').replace(/^#/, '');
    var i = h.indexOf('?');                 // 去掉查询串，如 #/practice?chapter=ch1
    if (i >= 0) h = h.slice(0, i);
    return h || '/home';
  }
  function go(p) {
    var target = p.charAt(0) === '#' ? p : '#' + (p.charAt(0) === '/' ? p : '/' + p);
    if (root.location) {
      if (root.location.hash === target) render(); else root.location.hash = target;
    }
  }
  function setTitle(title, sub, actionsHtml) {
    var bar = root.document && root.document.getElementById('topbar');
    if (!bar) return;
    bar.innerHTML = '<div class="grow" style="min-width:0"><div class="top-title truncate">' + U.esc(title) + '</div>' +
      (sub ? '<div class="top-sub truncate">' + U.esc(sub) + '</div>' : '') + '</div>' +
      (actionsHtml || '');
  }
  function beforeLeave(fn) { leaveHooks.push(fn); }
  function runLeaveHooks() {
    leaveHooks.forEach(function (f) { try { f(); } catch (e) {} });
    leaveHooks = [];
  }

  function render() {
    if (!root.document) return;
    runLeaveHooks();
    var p = path(), route = null, m = null;
    for (var i = 0; i < ROUTES.length; i++) {
      var mm = ROUTES[i].re.exec(p);
      if (mm) { route = ROUTES[i]; m = mm.slice(1); break; }
    }
    if (!route) route = ROUTES[0];
    var view = App.Views[route.view];
    var el = root.document.getElementById('view');
    if (!el) return;
    setTitle(route.title, '考研数学 · 个人自学台');
    if (!view) {
      el.innerHTML = '<div class="card"><h2>页面未就绪</h2><p class="muted">视图 ' + U.esc(route.view) + ' 尚未加载。</p></div>';
      return;
    }
    try { view.render(el, m || [], route); }
    catch (e) {
      el.innerHTML = '<div class="card"><h2>页面渲染出错</h2><p class="muted">' + U.esc(e && e.message) + '</p><p class="small dim">可尝试 <a href="#/home">返回首页</a> 或重置数据。</p></div>';
      if (root.console) root.console.error(e);
    }
    highlight(route.nav);
    try { if (root.scrollTo) root.scrollTo(0, 0); if (el.scrollIntoView) el.focus({ preventScroll: true }); } catch (e) {}
  }
  function highlight(nav) {
    U.qsa('[data-nav]').forEach(function (n) { n.classList.toggle('on', n.getAttribute('data-nav') === nav); });
  }
  function start() {
    if (!root.addEventListener) return;
    root.addEventListener('hashchange', render);
    render();
  }

  App.Router = { ROUTES: ROUTES, path: path, go: go, start: start, render: render, setTitle: setTitle, beforeLeave: beforeLeave, highlight: highlight };
})(typeof window !== 'undefined' ? window : globalThis);
