/* 业务核心：判题引擎 / 答题记录 / 错题去重 / 复习调度 / 考试评分 / 学习统计
   这里全部是纯逻辑（只操作 App.State 传入的对象），便于用 Node 做单元测试。 */
(function (root) {
  'use strict';
  var App = root.App = root.App || {};
  var U = App.U, Data = App.Data, State = App.State;
  var INTERVALS = [1, 2, 4, 7, 15];   // 掌握后间隔天数（简化间隔重复）

  /* ---------- 判题 ---------- */
  function normByType(qtype, raw) {
    if (raw == null) return '';
    if (qtype === 'single') {
      return U.normalize(raw).replace(/[^a-z]/g, '').slice(0, 1).toUpperCase();
    }
    if (qtype === 'multi') {
      var src = Array.isArray(raw) ? raw.join('') : String(raw);
      var letters = src.toUpperCase().replace(/[^A-E]/g, '').split('');
      return U.unique(letters).sort().join('');
    }
    if (qtype === 'judge') {
      if (U.truthy(raw)) return '对';
      if (U.falsy(raw)) return '错';
      return U.normalize(raw);
    }
    return U.normalize(raw);
  }
  function displayAnswer(q, ans) {
    if (!ans) return '（本题暂无答案，请先导入答案数据）';
    if (q.qtype === 'judge') return ans.answer === '对' ? '对（正确）' : '错（错误）';
    if (q.qtype === 'single' || q.qtype === 'multi') {
      var keys = String(ans.answer).split('');
      var texts = keys.map(function (k) {
        var o = (q.options || []).find(function (x) { return x.key === k; });
        return k + (o ? '. ' + App.Math.plain(o.text) : '');
      });
      return texts.join('　');
    }
    return String(ans.answer);
  }
  function userDisplay(qtype, raw) {
    if (raw == null || raw === '') return '（未作答）';
    if (Array.isArray(raw)) return raw.join('、');
    if (qtype === 'judge') return U.truthy(raw) ? '对' : (U.falsy(raw) ? '错' : String(raw));
    return String(raw);
  }

  /* check(q, raw, ans?) -> {correct, user, expected, missed, hitRatio} */
  function check(q, raw, ans) {
    ans = ans || Data.answerOf(q.id);
    if (!ans) return { correct: false, user: userDisplay(q.qtype, raw), expected: '暂无答案', missed: [], hitRatio: 0, noAnswer: true };
    var user = normByType(q.qtype, raw);
    var expected = normByType(q.qtype, ans.answer);
    var correct = false, missed = [], hitRatio = 1;

    if (q.qtype === 'blank') {
      var accepted = (ans.accepted || []).concat([ans.answer]);
      var ok = accepted.some(function (a) { return U.normalize(a) === user; });
      // 数值容差只用于「纯数字」写法（0.5 / 39.0 / .5）。
      // 不能对 1/4、4√2 这类表达式用 parseFloat，否则 1/4 会被当成 1 而误判。
      function numeric(s) { return /^-?\d+(\.\d+)?$|^-?\.\d+$/.test(String(s).trim()) ? parseFloat(s) : NaN; }
      if (!ok) {
        var un = numeric(user), en = numeric(expected);
        if (!isNaN(un) && !isNaN(en) && Math.abs(un - en) < 1e-6) ok = true;
        if (!ok && !isNaN(un)) {
          accepted.forEach(function (a) {
            var an = numeric(U.normalize(a));
            if (!isNaN(an) && Math.abs(un - an) < 1e-6) ok = true;
          });
        }
      }
      correct = !!user && ok;
    } else if (q.qtype === 'essay') {
      var groups = ans.keywords || [];
      if (!groups.length) {
        correct = user.length >= 8;   // 没给要点组时，写满 8 个字视为完成（宽松）
      } else {
        var hit = 0;
        groups.forEach(function (g, i) {
          var yes = g.some(function (kw) { return user.indexOf(U.normalize(kw)) >= 0; });
          if (yes) hit++; else missed.push(i);
        });
        hitRatio = groups.length ? hit / groups.length : 0;
        correct = hitRatio >= 0.7;
      }
    } else {
      correct = !!user && user === expected;
    }
    return {
      correct: correct, user: userDisplay(q.qtype, raw),
      expected: displayAnswer(q, ans), missed: missed, hitRatio: hitRatio, noAnswer: false
    };
  }

  /* ---------- 答题记录 & 错题本 ---------- */
  /* 纯函数：把一次答题写入 st（不触发 save），供练习与考试共用 */
  function record(st, q, r, opts) {
    opts = opts || {};
    var now = Date.now();
    st.practice.records.push({
      qid: q.id, correct: r.correct, userAnswer: r.user, rightAnswer: (Data.answerOf(q.id) || {}).answer || '',
      at: now, durationMs: opts.durationMs || 0, mode: opts.mode || 'practice',
      examId: opts.examId || null, chapter: q.chapter, kp: q.kp, sourceType: q.sourceType || 'demo'
    });
    if (st.practice.records.length > 5000) st.practice.records.splice(0, st.practice.records.length - 5000);
    if (!r.correct) {
      upsertWrong(st, q, r);
    } else if (opts.autoResolve && st.wrongBook[q.id]) {
      st.wrongBook[q.id].mastered = true;
      st.wrongBook[q.id].masteredAt = now;
    }
    return r;
  }
  function upsertWrong(st, q, r) {
    var now = Date.now();
    var w = st.wrongBook[q.id];
    if (!w) {
      w = {
        qid: q.id, chapter: q.chapter, kp: q.kp, qtype: q.qtype,
        difficulty: q.difficulty, stem: q.stem, sourceType: q.sourceType || 'demo',
        firstWrongAt: now, wrongCount: 0, mastered: false, inReview: false
      };
      st.wrongBook[q.id] = w;
    }
    w.wrongCount += 1;
    w.lastWrongAt = now;
    w.lastUserAnswer = r.user;
    w.rightAnswer = (Data.answerOf(q.id) || {}).answer || '';
    w.mastered = false;
    w.masteredAt = null;
    return w;
  }
  function submit(q, raw, opts) {
    opts = opts || {};
    var r = check(q, raw);
    State.mutate(function (st) { record(st, q, r, opts); });
    if (opts.mode !== 'exam') State.bump('questions', 1);
    return r;
  }
  function wrongList(filter) {
    filter = filter || {};
    var arr = Object.values(State.get().wrongBook);
    // 'all' 表示不筛选，不能当成真实章节/知识点值去比对
    if (filter.chapter && filter.chapter !== 'all') arr = arr.filter(function (w) { return w.chapter === filter.chapter; });
    if (filter.kp && filter.kp !== 'all') arr = arr.filter(function (w) { return w.kp === filter.kp; });
    if (filter.status === 'active') arr = arr.filter(function (w) { return !w.mastered; });
    if (filter.status === 'mastered') arr = arr.filter(function (w) { return w.mastered; });
    var key = filter.sort || 'recent';
    arr.sort(function (a, b) {
      if (key === 'count') return b.wrongCount - a.wrongCount || b.lastWrongAt - a.lastWrongAt;
      if (key === 'oldest') return a.firstWrongAt - b.firstWrongAt;
      return b.lastWrongAt - a.lastWrongAt;
    });
    return arr;
  }
  function markWrong(qid, mastered) {
    State.mutate(function (st) {
      var w = st.wrongBook[qid]; if (!w) return;
      w.mastered = !!mastered; w.masteredAt = mastered ? Date.now() : null;
      if (mastered) {
        var k = reviewKey('wrong', qid);
        if (st.review[k]) { st.review[k].status = 'mastered'; st.review[k].lastReviewAt = Date.now(); }
      }
    });
  }
  function removeWrong(qid) {
    State.mutate(function (st) { delete st.wrongBook[qid]; delete st.review[reviewKey('wrong', qid)]; });
  }

  /* ---------- 复习计划（简化间隔重复） ---------- */
  function reviewKey(type, refId) { return type + ':' + refId; }
  function upsertReview(item) {
    var key = reviewKey(item.type, item.refId);
    var now = Date.now();
    State.mutate(function (st) {
      var r = st.review[key];
      if (r) {
        if (item.title) r.title = item.title;
        if (item.note) r.note = item.note;
        return;
      }
      st.review[key] = {
        key: key, type: item.type, refId: item.refId,
        title: item.title || '未命名复习项', chapter: item.chapter || '', kp: item.kp || '',
        note: item.note || '', stage: 0, createdAt: now,
        lastReviewAt: null, nextReviewAt: now, status: 'due'
      };
      if (item.type === 'wrong' && st.wrongBook[item.refId]) st.wrongBook[item.refId].inReview = true;
    });
    return key;
  }
  function markReview(key, mastered) {
    var now = Date.now();
    State.mutate(function (st) {
      var r = st.review[key]; if (!r) return;
      r.lastReviewAt = now;
      if (mastered) {
        r.stage = Math.min((r.stage || 0) + 1, INTERVALS.length);
        r.status = r.stage >= INTERVALS.length ? 'mastered' : 'learning';
        var days = INTERVALS[Math.min(r.stage - 1, INTERVALS.length - 1)];
        r.nextReviewAt = U.addDays(now, days);
        if (r.status === 'mastered' && r.type === 'wrong' && st.wrongBook[r.refId]) st.wrongBook[r.refId].mastered = true;
      } else {
        r.stage = 0; r.status = 'due'; r.nextReviewAt = U.addDays(now, 1);
      }
    });
    State.log(mastered ? 'review' : 'review', (mastered ? '复习完成：' : '标记仍需复习：') + (State.get().review[key] || {}).title, '#/review');
  }
  function removeReview(key) {
    State.mutate(function (st) {
      var r = st.review[key]; if (!r) return;
      if (r.type === 'wrong' && st.wrongBook[r.refId]) st.wrongBook[r.refId].inReview = false;
      delete st.review[key];
    });
  }
  function reviewList(opt) {
    opt = opt || {};
    var now = Date.now(), arr = Object.values(State.get().review);
    if (opt.onlyDue) arr = arr.filter(function (r) { return r.status !== 'mastered' && r.nextReviewAt <= now; });
    if (opt.hideMastered && !opt.onlyDue) arr = arr.filter(function (r) { return r.status !== 'mastered'; });
    if (opt.type) arr = arr.filter(function (r) { return r.type === opt.type; });
    arr.sort(function (a, b) { return a.nextReviewAt - b.nextReviewAt; });
    return arr;
  }

  /* ---------- 筛选抽题 ---------- */
  function filterQuestions(f) {
    f = f || {};
    var arr = Data.validQuestions();
    if (f.chapter && f.chapter !== 'all') arr = arr.filter(function (q) { return q.chapter === f.chapter; });
    if (f.kp && f.kp !== 'all') arr = arr.filter(function (q) { return q.kp === f.kp; });
    if (f.qtype && f.qtype !== 'all') arr = arr.filter(function (q) { return q.qtype === f.qtype; });
    if (f.difficulty && f.difficulty !== 'all') arr = arr.filter(function (q) { return Number(q.difficulty) === Number(f.difficulty); });
    if (f.sourceType && f.sourceType !== 'all') arr = arr.filter(function (q) { return q.sourceType === f.sourceType; });
    if (f.excludeIds && f.excludeIds.length) arr = arr.filter(function (q) { return f.excludeIds.indexOf(q.id) < 0; });
    if (f.shuffle !== false) arr = U.shuffle(arr);
    if (f.count && f.count > 0) arr = arr.slice(0, f.count);
    return arr;
  }

  /* ---------- 模拟考试 ---------- */
  function startExam(cfg) {
    cfg = cfg || {};
    var st = State.get();
    var count = U.clamp(Number(cfg.count) || st.profile.examCount || 25, 1, 200);
    var minutes = U.clamp(Number(cfg.minutes) || st.profile.examMinutes || 60, 1, 300);
    var pool = filterQuestions({ chapter: cfg.chapter || 'all', difficulty: cfg.difficulty || 'all', count: count, shuffle: true });
    if (!pool.length) return null;
    var draft = {
      id: U.uid('exam'), startedAt: Date.now(), durationSec: minutes * 60,
      minutes: minutes, questionIds: pool.map(function (q) { return q.id; }),
      answers: {}, flags: {}, current: 0, config: cfg
    };
    State.mutate(function (s) { s.examDraft = draft; });
    State.log('exam', '开始模拟考试（' + pool.length + ' 题 / ' + minutes + ' 分钟）', '#/exam');
    return draft;
  }
  function saveExamAnswer(qid, raw, flag) {
    State.mutate(function (st) {
      var d = st.examDraft; if (!d) return;
      if (raw !== undefined) d.answers[qid] = raw;
      if (flag !== undefined) d.flags[qid] = !!flag;
    });
  }
  function examRemaining(draft, now) {
    if (!draft) return 0;
    return Math.max(0, draft.durationSec - Math.floor(((now || Date.now()) - draft.startedAt) / 1000));
  }
  function submitExam(reason) {
    var st = State.get(), draft = st.examDraft;
    if (!draft) return null;
    var results = [], correct = 0;
    var now = Date.now();
    draft.questionIds.forEach(function (qid) {
      var q = Data.findQuestion(qid);
      if (!q) return;
      var r = check(q, draft.answers[qid]);
      if (r.correct) correct++;
      results.push({ qid: qid, correct: r.correct, userAnswer: r.user, rightAnswer: r.expected, missed: r.missed, hitRatio: r.hitRatio });
    });
    var total = results.length;
    var exam = {
      id: draft.id, startedAt: draft.startedAt, endedAt: now,
      durationSec: draft.durationSec, usedSec: Math.floor((now - draft.startedAt) / 1000),
      questionIds: draft.questionIds.slice(), answers: Object.assign({}, draft.answers),
      flags: Object.assign({}, draft.flags), results: results,
      correct: correct, total: total, score: total ? Math.round(correct * 1000 / total) / 10 : 0,
      submittedBy: reason === 'timeout' ? 'timeout' : 'manual', config: draft.config || {}
    };
    State.mutate(function (s) {
      draft.questionIds.forEach(function (qid) {
        var q = Data.findQuestion(qid); if (!q) return;
        var rr = results.find(function (x) { return x.qid === qid; });
        record(s, q, { correct: rr.correct, user: rr.userAnswer }, { mode: 'exam', examId: exam.id });
      });
      s.exams.unshift(exam);
      if (s.exams.length > 200) s.exams.length = 200;
      s.examDraft = null;
    });
    State.bump('questions', total);
    State.log('exam', '交卷：' + correct + '/' + total + ' 题正确，得分 ' + exam.score + (reason === 'timeout' ? '（时间到自动交卷）' : ''), '#/exam/history');
    return exam;
  }

  /* ---------- 统计 ---------- */
  function stats() {
    var st = State.get(), recs = st.practice.records;
    var byChapter = {}, byKp = {}, durations = [], correctCount = 0;
    recs.forEach(function (r) {
      var ch = byChapter[r.chapter] || (byChapter[r.chapter] = { total: 0, correct: 0 });
      ch.total++; if (r.correct) { ch.correct++; correctCount++; }
      var kp = byKp[r.kp] || (byKp[r.kp] = { total: 0, correct: 0 });
      kp.total++; if (r.correct) kp.correct++;
      if (r.durationMs > 0) durations.push(r.durationMs);
    });
    var wrongByKp = {};
    Object.values(st.wrongBook).forEach(function (w) {
      var k = wrongByKp[w.kp] || (wrongByKp[w.kp] = { count: 0, times: 0 });
      k.count++; k.times += w.wrongCount || 1;
    });
    Object.keys(byKp).forEach(function (k) { byKp[k].rate = U.pct(byKp[k].correct, byKp[k].total); });
    Object.keys(byChapter).forEach(function (k) { byChapter[k].rate = U.pct(byChapter[k].correct, byChapter[k].total); });
    var days = {}, k7 = [];
    for (var i = 6; i >= 0; i--) { var d = U.dateKey(U.addDays(Date.now(), -i)); k7.push(d); days[d] = 0; }
    recs.forEach(function (r) { var k = U.dateKey(r.at); if (days[k] != null) days[k]++; });

    // 章节掌握度：答题正确率（60%）+ 该章课程完成率（40%）；无答题时只看课程完成率
    var mastery = {};
    App.Taxonomy.chapters.forEach(function (c) {
      var lessons = Data.courses().filter(function (x) { return x.chapter === c.id; });
      var done = lessons.filter(function (x) { return st.progress.completedCourses[x.id]; }).length;
      var cRate = lessons.length ? U.pct(done, lessons.length) : 0;
      var q = byChapter[c.id];
      mastery[c.id] = q ? Math.round(0.6 * q.rate + 0.4 * cRate) : cRate;
    });
    return {
      totalAnswered: recs.length, totalCorrect: correctCount,
      accuracy: U.pct(correctCount, recs.length),
      avgDurationMs: durations.length ? Math.round(durations.reduce(function (a, b) { return a + b; }, 0) / durations.length) : 0,
      byChapter: byChapter, byKp: byKp, wrongByKp: wrongByKp, mastery: mastery,
      recent7: k7.map(function (d) { return { date: d, count: days[d] }; }),
      exams: st.exams.slice(),
      wrongCount: Object.values(st.wrongBook).filter(function (w) { return !w.mastered; }).length,
      completedCourses: Object.keys(st.progress.completedCourses).length,
      dueReviews: reviewList({ onlyDue: true }).length
    };
  }

  App.Grading = {
    INTERVALS: INTERVALS, normByType: normByType, displayAnswer: displayAnswer, check: check,
    record: record, submit: submit, wrongList: wrongList, markWrong: markWrong, removeWrong: removeWrong,
    reviewKey: reviewKey, upsertReview: upsertReview, markReview: markReview, removeReview: removeReview, reviewList: reviewList,
    filterQuestions: filterQuestions, startExam: startExam, saveExamAnswer: saveExamAnswer,
    examRemaining: examRemaining, submitExam: submitExam, stats: stats
  };
})(typeof window !== 'undefined' ? window : globalThis);
