/* 学习统计：章节掌握度 / 知识点正确率 / 平均答题时间 / 高频错误 / 历史成绩 */
(function (root) {
  'use strict';
  var App = root.App = root.App || {};
  var U = App.U, G = App.Grading, T = App.Taxonomy, UI = App.UI;
  var showAllKp = false;

  function bar(label, val, max, suffix, cls) {
    var w = U.clamp(U.pct(val, max || 100), 0, 100);
    return '<div class="hbar-row"><span class="truncate" title="' + U.esc(label) + '">' + U.esc(label) + '</span>' +
      '<div class="hbar-track"><div class="hbar-fill ' + (cls || '') + '" style="width:' + w + '%"></div></div>' +
      '<span class="hbar-val">' + U.esc(suffix != null ? suffix : val + '%') + '</span></div>';
  }
  function levelClass(v) { return v >= 80 ? 'high' : v >= 60 ? '' : v >= 40 ? 'mid' : 'low'; }

  App.Views.stats = {
    render: function (el) {
      var s = G.stats();
      var kpEntries = Object.entries(s.byKp).sort(function (a, b) { return a[1].rate - b[1].rate || b[1].total - a[1].total; });
      var shown = showAllKp ? kpEntries : kpEntries.slice(0, 10);
      var wrongEntries = Object.entries(s.wrongByKp).sort(function (a, b) { return b[1].times - a[1].times; }).slice(0, 8);
      var maxWrong = wrongEntries.length ? wrongEntries[0][1].times : 1;
      var maxDay = Math.max.apply(null, [1].concat(s.recent7.map(function (x) { return x.count; })));
      var avgExam = s.exams.length ? Math.round(s.exams.reduce(function (a, x) { return a + x.score; }, 0) / s.exams.length * 10) / 10 : 0;

      el.innerHTML = UI.head('学习统计', '所有指标由本机答题记录实时计算，不涉及任何云端上传',
        '<div class="btn-group"><a class="btn btn-sm" href="#/exam/history">考试成绩</a><a class="btn btn-sm" href="#/settings">数据备份</a></div>') +
        '<div class="grid grid-4 mb-4">' +
          '<div class="stat brand"><div class="num">' + s.totalAnswered + '</div><div class="lbl">累计答题</div></div>' +
          '<div class="stat success"><div class="num">' + s.accuracy + '%</div><div class="lbl">总正确率</div></div>' +
          '<div class="stat"><div class="num">' + (s.avgDurationMs ? (s.avgDurationMs / 1000).toFixed(1) : '0') + '<small style="font-size:14px">s</small></div><div class="lbl">平均答题时间</div></div>' +
          '<div class="stat danger"><div class="num">' + s.wrongCount + '</div><div class="lbl">未掌握错题</div></div>' +
        '</div>' +

        (s.totalAnswered === 0 ? '<div class="card mb-4">' + UI.empty('📊', '还没有答题数据', '完成一组专项练习或一场模拟考试后，这里会自动生成统计。', '<a class="btn btn-primary" href="#/practice">去做练习</a>') + '</div>' : '') +

        '<div class="card mb-4"><div class="section-title"><span class="bar"></span>各章节掌握程度</div>' +
          T.chapters.map(function (c) {
            var v = s.mastery[c.id] || 0;
            return bar(c.short + ' · ' + c.name, v, 100, v + '%', levelClass(v));
          }).join('') +
          '<p class="tiny dim mt-3">计算口径：该章答题正确率 × 60% + 该章课程完成率 × 40%；没有答题记录时只显示课程完成率。</p>' +
        '</div>' +

        '<div class="card mb-4"><div class="section-title"><span class="bar"></span>各知识点正确率<span class="more"><button class="btn btn-sm btn-ghost" id="kp-toggle">' + (showAllKp ? '收起' : '显示全部') + '</button></span></div>' +
          (kpEntries.length ? shown.map(function (e) {
            return bar(T.kpName(e[0]), e[1].rate, 100, e[1].rate + '% (' + e[1].correct + '/' + e[1].total + ')', levelClass(e[1].rate));
          }).join('') + '<p class="tiny dim mt-3">按正确率从低到高排列，先补最薄弱的。</p>' :
            '<p class="muted small">暂无答题数据。</p>') +
        '</div>' +

        '<div class="grid grid-2 tight mb-4">' +
          '<div class="card"><div class="section-title"><span class="bar"></span>高频错误知识点</div>' +
            (wrongEntries.length ? wrongEntries.map(function (e) {
              return bar(T.kpName(e[0]), e[1].times, maxWrong, e[1].times + ' 次', 'low');
            }).join('') : '<p class="muted small">太好了，暂时没有高频错误。</p>') + '</div>' +
          '<div class="card"><div class="section-title"><span class="bar"></span>最近 7 天答题量</div>' +
            '<div class="spark">' + s.recent7.map(function (d) {
              var h = Math.max(3, Math.round(d.count / maxDay * 100));
              return '<div class="col" style="height:100%"><i style="height:' + h + '%"></i><small>' + d.date.slice(5) + '</small></div>';
            }).join('') + '</div><div style="height:20px"></div>' +
            '<p class="tiny dim">柱高按单日最大答题量归一化。</p></div>' +
        '</div>' +

        '<div class="card"><div class="section-title"><span class="bar"></span>历史考试成绩<span class="more">平均 ' + avgExam + ' 分 / ' + s.exams.length + ' 场</span></div>' +
          (s.exams.length ? s.exams.slice(0, 8).map(function (x) {
            return '<a class="task-row" href="#/exam/result/' + U.esc(x.id) + '"><span class="grow"><span class="t">' +
              U.esc(U.fmtDateTime(x.startedAt)) + '　·　<b>' + x.score + ' 分</b></span>' +
              '<div class="tiny dim">答对 ' + x.correct + '/' + x.total + ' 题 · ' + U.fmtDuration(x.usedSec) + '</div></span>' +
              '<span class="chip ' + (x.score >= 60 ? 'success' : 'warning') + '">' + U.pct(x.correct, x.total) + '%</span><span class="dim">›</span></a>';
          }).join('') : '<p class="muted small">还没有考试记录。<a href="#/exam">去考一场</a></p>') +
        '</div>';

      if (el.querySelector('#kp-toggle')) el.querySelector('#kp-toggle').onclick = function () { showAllKp = !showAllKp; App.refresh(); };
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
