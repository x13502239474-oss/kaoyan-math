/* 学习首页 */
(function (root) {
  'use strict';
  var App = root.App = root.App || {};
  var U = App.U, State = App.State, G = App.Grading, T = App.Taxonomy, UI = App.UI;

  function nextCourse() {
    var st = State.get(), list = App.Data.courses().slice().sort(function (a, b) { return (a.no || 0) - (b.no || 0); });
    var last = st.progress.lastCourseId && App.Data.findCourse(st.progress.lastCourseId);
    if (last && !st.progress.completedCourses[last.id]) return last;
    return list.find(function (c) { return !st.progress.completedCourses[c.id]; }) || list[0] || null;
  }
  function greet() {
    var h = new Date().getHours();
    if (h < 6) return '夜深了，注意休息';
    if (h < 11) return '早上好，开始今天的学习';
    if (h < 14) return '中午好，来一组练习';
    if (h < 18) return '下午好，保持节奏';
    return '晚上好，复盘一下今天';
  }

  App.Views.home = {
    render: function (el) {
      var st = State.get(), s = G.stats();
      var key = U.dateKey(), t = st.daily[key] || { questions: 0, courses: 0, minutes: 0 };
      var goalQ = st.profile.dailyQuestions || 10, goalC = st.profile.dailyCourses || 1;
      var qDone = Math.min(t.questions || 0, goalQ), cDone = Math.min(t.courses || 0, goalC);
      var dayPct = U.pct(qDone / goalQ + cDone / goalC, 2);
      var nc = nextCourse();
      var dueList = G.reviewList({ onlyDue: true });

      var tasks = [
        { done: (t.courses || 0) >= goalC, text: '完成 ' + goalC + ' 节课程学习', sub: '今日已完成 ' + (t.courses || 0) + ' 节', go: '/courses' },
        { done: (t.questions || 0) >= goalQ, text: '完成 ' + goalQ + ' 道练习', sub: '今日已答 ' + (t.questions || 0) + ' 道', go: '/practice' },
        { done: dueList.length === 0, text: dueList.length ? '复习 ' + dueList.length + ' 个到期知识点' : '今日复习任务已清空', sub: dueList.length ? '按到期时间排序，先复习最早的' : '可以在复习计划里手动添加', go: '/review' },
        { done: s.wrongCount === 0, text: s.wrongCount ? '重做 ' + s.wrongCount + ' 道未掌握错题' : '错题本暂时没有待攻克题目', sub: '同一题反复做错会自动累加次数', go: '/wrong' }
      ];

      var acts = st.activity.slice(0, 6);

      el.innerHTML =
        '<div class="hero mb-4">' +
          '<div class="date">' + U.esc(new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })) + '</div>' +
          '<h1>' + U.esc(greet()) + '</h1>' +
          '<div class="hero-stats"><div><b>' + (t.questions || 0) + '</b><small>今日答题</small></div>' +
            '<div><b>' + (t.courses || 0) + '</b><small>今日课程</small></div>' +
            '<div><b>' + s.accuracy + '%</b><small>累计正确率</small></div>' +
            '<div><b>' + s.dueReviews + '</b><small>待复习</small></div></div>' +
          '<div class="hero-bar"><i style="width:' + dayPct + '%"></i></div>' +
          '<p class="tiny" style="opacity:.85;margin-top:8px;position:relative">今日目标完成度 ' + dayPct + '%（课程 ' + cDone + '/' + goalC + ' · 练习 ' + qDone + '/' + goalQ + '）</p>' +
        '</div>' +

        '<div class="card mb-4"><div class="section-title"><span class="bar"></span>今日学习任务<span class="more"><a href="#/settings">调整目标</a></span></div>' +
          tasks.map(function (x) {
            return '<a class="task-row ' + (x.done ? 'done' : '') + '" href="#' + x.go + '">' +
              '<span class="tick">' + (x.done ? '✓' : '') + '</span><span class="grow"><span class="t">' + U.esc(x.text) + '</span>' +
              '<div class="tiny dim">' + U.esc(x.sub) + '</div></span><span class="dim">›</span></a>';
          }).join('') + '</div>' +

        '<div class="grid grid-4 mb-4">' +
          '<div class="stat brand"><div class="num">' + s.completedCourses + '</div><div class="lbl">已完成课程</div></div>' +
          '<div class="stat warning"><div class="num">' + s.dueReviews + '</div><div class="lbl">待复习知识点</div></div>' +
          '<div class="stat"><div class="num">' + Math.max(0, goalQ - (t.questions || 0)) + '</div><div class="lbl">待完成练习</div></div>' +
          '<div class="stat danger"><div class="num">' + s.wrongCount + '</div><div class="lbl">错题数量</div></div>' +
        '</div>' +

        '<div class="card mb-4"><div class="section-title"><span class="bar"></span>快速进入</div>' +
          '<div class="quick-grid">' +
            '<a class="quick" href="#/course/' + U.esc(nc ? nc.id : 'c01') + '"><span class="qi">📖</span><span>' + (nc ? '继续学习' : '课程') + '</span></a>' +
            '<a class="quick" href="#/practice"><span class="qi">✏️</span><span>开始练习</span></a>' +
            '<a class="quick" href="#/exam"><span class="qi">📝</span><span>模拟考试</span></a>' +
            '<a class="quick" href="#/formulas"><span class="qi">📐</span><span>公式速查</span></a>' +
          '</div>' +
          (nc ? '<p class="tiny dim mt-3">下一课：<a href="#/course/' + U.esc(nc.id) + '">' + U.esc(nc.title) + '</a>（' + U.esc(T.chapterName(nc.chapter)) + '）</p>' : '') +
        '</div>' +

        '<div class="card mb-4"><div class="section-title"><span class="bar"></span>最近学习记录<span class="more"><a href="#/stats">查看统计</a></span></div>' +
          (acts.length ? '<div class="timeline">' + acts.map(function (a) {
            return '<div class="tl-item"><div class="t">' + (a.href ? '<a href="' + U.esc(a.href) + '">' + U.esc(a.text) + '</a>' : U.esc(a.text)) + '</div>' +
              '<div class="d">' + U.esc(U.fmtRelative(a.at)) + '</div></div>';
          }).join('') + '</div>' : '<div class="empty" style="padding:24px"><div class="ico">🌱</div><h3>还没有学习记录</h3><p>从上面选一门课开始，学习轨迹会自动记录在这里。</p></div>') +
        '</div>' +

        '<div class="notice"><b>内容说明：</b>本站课程为学习整理，题目均为「演示题」或「AI 生成练习题」，<b>不是历年真题，也不是任何教材原题或官方答案</b>。教材内容请通过「设置与备份 → 批量导入」自行添加。所有学习数据只保存在本机浏览器。</div>';
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
