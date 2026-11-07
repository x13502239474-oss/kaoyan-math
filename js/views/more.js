/* 手机端「更多」入口：把次级功能集中收纳，底部 Tab 保持清爽 */
(function (root) {
  'use strict';
  var App = root.App = root.App || {};
  var U = App.U, State = App.State, G = App.Grading, UI = App.UI, Data = App.Data;

  App.Views.more = {
    render: function (el) {
      var st = State.get(), s = G.stats();
      var courses = Data.courses().length;
      var items = [
        { icon: '📐', title: '公式库', desc: Data.formulas().length + ' 条 · 收藏与自测', go: '/formulas', badge: '' },
        { icon: '🔁', title: '复习计划', desc: '按到期时间安排回看', go: '/review', badge: s.dueReviews ? String(s.dueReviews) : '' },
        { icon: '📝', title: '模拟考试', desc: '倒计时 · 自动评分', go: '/exam', badge: st.examDraft ? '进行中' : '' },
        { icon: '🗂️', title: '考试记录', desc: st.exams.length + ' 场历史考试', go: '/exam/history', badge: '' },
        { icon: '📊', title: '学习统计', desc: '正确率 · 薄弱知识点', go: '/stats', badge: '' },
        { icon: '⚙️', title: '设置与备份', desc: '导出 JSON · 批量导入', go: '/settings', badge: '' }
      ];
      el.innerHTML = UI.head('更多功能', '手机端把次级入口集中在这里，桌面端可直接用左侧导航') +
        '<div class="card mb-4"><div class="row" style="gap:20px;align-items:center">' +
          '<div class="ring" style="--p:' + U.pct(s.completedCourses, courses) + '"><span>' + U.pct(s.completedCourses, courses) + '%</span></div>' +
          '<div class="grow"><b style="font-size:var(--fs-md)">课程总进度</b>' +
            '<div class="small muted mt-2">已完成 ' + s.completedCourses + ' / ' + courses + ' 课　·　累计答题 ' + s.totalAnswered + ' 道</div>' +
            '<div class="small muted">正确率 ' + s.accuracy + '%　·　未掌握错题 ' + s.wrongCount + ' 道</div>' +
            '<a class="btn btn-sm btn-soft mt-3" href="#/stats">查看完整统计 →</a></div></div></div>' +
        '<div class="more-grid mb-4">' + items.map(function (x) {
          return '<a class="more-card" href="#' + x.go + '"><span class="mi">' + x.icon + '</span>' +
            '<span class="grow"><b>' + U.esc(x.title) + (x.badge ? ' <span class="chip danger">' + U.esc(x.badge) + '</span>' : '') + '</b>' +
            '<small>' + U.esc(x.desc) + '</small></span><span class="dim">›</span></a>';
        }).join('') + '</div>' +
        '<div class="card"><div class="section-title"><span class="bar"></span>内容速览</div>' +
          '<div class="grid grid-4">' +
            '<div class="stat"><div class="num">' + courses + '</div><div class="lbl">课程</div></div>' +
            '<div class="stat"><div class="num">' + Data.formulas().length + '</div><div class="lbl">公式</div></div>' +
            '<div class="stat"><div class="num">' + Data.questions().length + '</div><div class="lbl">题目</div></div>' +
            '<div class="stat"><div class="num">' + App.Taxonomy.allKpIds().length + '</div><div class="lbl">知识点</div></div>' +
          '</div></div>' +
        '<div class="notice mt-4">本站为个人自学工具，不联网上传任何学习数据。题目均为演示题 / AI 生成练习题，<b>不是真题</b>；教材内容请通过设置页批量导入。</div>';
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
