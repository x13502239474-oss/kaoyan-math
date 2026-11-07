/* 逻辑单元测试（零依赖，Node 直接运行：node tests/run-tests.mjs）
   用 vm 把浏览器端的核心模块加载进一个模拟 window，覆盖：
   数据完整性 / 公式渲染 / 判题引擎 / 持久化与导出恢复 / 错题去重 /
   复习调度 / 模拟考试 / 统计 / 批量导入。 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
const failures = [];
function ok(cond, name) { if (cond) { pass++; } else { fail++; failures.push(name); console.log('  ✗ ' + name); } }
function eq(a, b, name) { ok(JSON.stringify(a) === JSON.stringify(b), name + (JSON.stringify(a) === JSON.stringify(b) ? '' : ` (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`)); }
function group(n) { console.log('\n▶ ' + n); }

/* ---------- 搭建浏览器环境模拟 ---------- */
class LS {
  constructor() { this.m = new Map(); }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
  clear() { this.m.clear(); }
}
const sandbox = { console, localStorage: new LS() };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
const FILES = [
  'js/core/utils.js', 'js/core/math.js', 'js/core/storage.js',
  'js/data/taxonomy.js', 'js/data/courses.js', 'js/data/formulas.js',
  'js/data/questions.js', 'js/data/answers.js',
  'js/core/state.js', 'js/core/grading.js'
];
for (const f of FILES) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f });
}
const App = sandbox.App;
const { U, Math: M, State, Grading: G, Data, Taxonomy: T, Storage } = App;

/* ---------- 1. 数据完整性 ---------- */
group('1. 内容数据完整性（课程 / 题目 / 答案 / 公式分离且可互相引用）');
const qs = App.Questions, ans = App.Answers.map, cs = App.Courses, fsx = App.Formulas;
ok(qs.length >= 50, `题库不少于 50 题（实际 ${qs.length}）`);
ok(cs.length >= 14, `课程不少于 14 节（实际 ${cs.length}）`);
ok(fsx.length >= 50, `公式不少于 50 条（实际 ${fsx.length}）`);
ok(Object.keys(ans).length === qs.length, '每道题都有对应答案');
ok(Object.keys(App.Answers.exampleMap).length === cs.reduce((n, c) => n + (c.examples || []).length, 0), '每个课程例题都有四段式解析');
let idOk = true, kpOk = true, optOk = true, formulaOk = true, exampleOk = true;
const qids = new Set(), cids = new Set(), fids = new Set();
for (const q of qs) {
  if (qids.has(q.id)) idOk = false; qids.add(q.id);
  if (!T.chapterIndex[q.chapter] || !T.kpIndex[q.kp]) kpOk = false;
  const a = ans[q.id];
  if (!a) continue;
  if (q.qtype === 'single' || q.qtype === 'multi') {
    const keys = (q.options || []).map(o => o.key);
    if (!keys.length || String(a.answer).split('').some(k => keys.indexOf(k) < 0)) optOk = false;
    if (q.qtype === 'multi' && String(a.answer).length < 2) optOk = false;
  }
  if (q.qtype === 'judge' && ['对', '错'].indexOf(a.answer) < 0) optOk = false;
  if (q.qtype === 'blank' && !a.answer) optOk = false;
  if (q.qtype === 'essay' && (!a.keywords || !a.keywords.length)) optOk = false;
  if (['single', 'multi', 'judge', 'blank', 'essay'].indexOf(q.qtype) < 0) optOk = false;
}
for (const c of cs) {
  if (cids.has(c.id)) idOk = false; cids.add(c.id);
  if (!c.title || !T.chapterIndex[c.chapter]) idOk = false;
  (c.formulaIds || []).forEach(id => { if (!fsx.find(f => f.id === id)) formulaOk = false; });
  (c.examples || []).forEach(e => { if (!App.Answers.exampleMap[e.id]) formulaOk = false; });
  (c.kps || []).forEach(k => { if (!T.kpIndex[k]) exampleOk = false; });
}
for (const f of fsx) {
  if (fids.has(f.id)) idOk = false; fids.add(f.id);
  if (!f.tex || !T.chapterIndex[f.chapter] || !T.kpIndex[f.kp]) formulaOk = false;
}
ok(idOk, '所有 id 唯一且必填字段齐全');
ok(kpOk, '题目引用的章节/知识点都在体系表内');
ok(optOk, '选项 key 与答案匹配，题型字段合法');
ok(formulaOk, '课程引用的公式/例题解析都存在，公式字段合法');
ok(exampleOk, '课程引用的知识点都存在');
ok(qs.every(q => q.sourceType === 'demo' || q.sourceType === 'ai'), '全部题目标注为演示题或 AI 生成（不含冒充真题）');
ok(qs.every(q => !/\b真题\b/.test(q.stem)), '题干中没有自称真题');

/* ---------- 2. 公式渲染 ---------- */
group('2. 离线公式渲染与 HTML 转义');
ok(M.formula('\\frac{1}{2}').includes('<span class="frac">'), '分数渲染为 frac 结构');
ok(M.formula('x^2+a_1').includes('<sup>2</sup>') && M.formula('x^2+a_1').includes('<sub>1</sub>'), '上下标渲染');
ok(M.formula('\\sqrt{2}').includes('radicand'), '根号渲染');
ok(M.formula('a\\times b\\le c').includes('×') && M.formula('a\\times b\\le c').includes('≤'), '常用符号映射');
ok(M.text('速度 $v=\\frac{s}{t}$ 与时间').includes('frac') && M.text('速度 $v=\\frac{s}{t}$ 与时间').includes('与时间'), '混合文本中 $...$ 被渲染');
ok(!M.text('<img src=x onerror=alert(1)>').includes('<img'), '外部文本被转义（防注入）');
ok(!M.text('<script>alert(1)</script>').includes('<script>'), 'script 标签被转义');
let renderOk = true;
for (const f of fsx) { try { const h = M.formula(f.tex); if (/\\begin|\\left|\\right|undefined/.test(h)) renderOk = false; } catch (e) { renderOk = false; } }
ok(renderOk, '全部公式都能渲染且无不支持的命令残留');
ok(M.plain('$\\frac{1}{2}$').includes('1'), '纯文本降级可用');

/* ---------- 3. 判题引擎 ---------- */
group('3. 判题引擎（单选/多选/判断/填空/简答 + 归一化 + 未作答）');
State.init();
const q = id => Data.findQuestion(id);
ok(G.check(q('q001'), 'C').correct, '单选：正确答案');
ok(G.check(q('q001'), ' c ').correct, '单选：小写与空格归一化');
ok(!G.check(q('q001'), 'D').correct, '单选：错误答案');
ok(!G.check(q('q001'), '').correct, '单选：未作答判错');
ok(G.check(q('q007'), ['A', 'C', 'D', 'E']).correct, '多选：数组形式全选对');
ok(G.check(q('q007'), 'EDCA').correct, '多选：乱序字符串');
ok(!G.check(q('q007'), 'ACD').correct, '多选：漏选判错');
ok(G.check(q('q004'), '错').correct && G.check(q('q004'), '×').correct && G.check(q('q004'), 'false').correct, '判断：宽口径识别「错」');
ok(G.check(q('q022'), '√').correct && G.check(q('q022'), '正确').correct, '判断：宽口径识别「对」');
ok(!G.check(q('q004'), '对').correct, '判断：反向判错');
ok(G.check(q('q003'), '1/8').correct, '填空：标准写法');
ok(G.check(q('q003'), ' １／８ ').correct, '填空：全角与空格归一化');
ok(G.check(q('q003'), '0.125').correct, '填空：accepted 变体');
ok(!G.check(q('q003'), '1/4').correct, '填空：错误值');
ok(G.check(q('q012'), '39').correct, '填空：数值答案');
const essayFull = '绝对值表示数轴上一个数到原点的距离，结果恒为非负数。|x-3|=2 表示 x 到 3 的距离为 2，所以 x=1 或 x=5，在左右两侧各有一个点。';
const er = G.check(q('q009'), essayFull);
ok(er.correct, '简答：命中 70% 以上要点判对（命中率 ' + Math.round(er.hitRatio * 100) + '%）');
const er2 = G.check(q('q009'), '我不会做');
ok(!er2.correct && er2.missed.length > 0, '简答：要点不足判错并返回未覆盖要点');
ok(G.displayAnswer(q('q001'), ans.q001).includes('C'), '答案显示包含选项字母');
ok(G.check({ id: 'no_answer', qtype: 'single', stem: 'x' }, 'A').noAnswer === true, '缺答案数据时不崩溃并标记');

/* ---------- 4. 持久化 / 导出 / 恢复 ---------- */
group('4. 数据保存、刷新后不丢失、JSON 导出与恢复');
State.reset();
State.mutate(s => { s.progress.completedCourses.c01 = 123456; s.notes.c01 = { text: '我的笔记', updatedAt: 1 }; });
State.init(); // 模拟重新打开页面
eq(State.get().progress.completedCourses.c01, 123456, '刷新后课程进度仍在');
eq(State.get().notes.c01.text, '我的笔记', '刷新后笔记仍在');
const backup = State.exportText();
ok(backup.includes('"app": "kaoyan-math"'), '导出载荷带应用标识');
ok(Storage.parsePayload(backup).ok, '本站备份可被识别');
State.mutate(s => { s.notes.c01 = { text: '被改坏了', updatedAt: 2 }; s.wrongBook.q001 = { qid: 'q001', wrongCount: 1 }; });
let rr = State.restore(backup, 'replace');
ok(rr.ok, '恢复（覆盖）成功');
eq(State.get().notes.c01.text, '我的笔记', '恢复后笔记回到备份版本');
eq(Object.keys(State.get().wrongBook).length, 0, '恢复后新增的错误记录被清除');
ok(!Storage.parsePayload('{not json').ok, '损坏 JSON 被拒绝');
ok(!Storage.parsePayload('{"app":"other-app","state":{"version":2,"progress":{},"wrongBook":{}}}').ok, '其他应用的备份被拒绝');
ok(!Storage.parsePayload('{"hello":1}').ok, '结构不完整的对象被拒绝');
State.mutate(s => { s.notes.c02 = { text: '新笔记', updatedAt: 3 }; });
rr = State.restore(backup, 'merge');
ok(rr.ok && State.get().notes.c02 && State.get().notes.c01.text === '我的笔记', '合并模式保留本机新记录并补回备份');

/* ---------- 5. 答题记录与错题去重 ---------- */
group('5. 答题记录、错题本去重累加、自动掌握');
State.reset();
for (let i = 0; i < 3; i++) G.submit(q('q001'), 'D', { mode: 'practice', durationMs: 1000 });
const wb = State.get().wrongBook;
eq(Object.keys(wb).length, 1, '同一题连错 3 次只保留 1 条记录');
eq(wb.q001.wrongCount, 3, '错误次数累加到 3');
eq(wb.q001.lastUserAnswer, 'D', '记录最后一次错误答案');
eq(State.get().practice.records.length, 3, '答题记录写入 3 条');
eq(State.today().questions, 3, '今日答题目标计数为 3');
G.submit(q('q001'), 'C', { mode: 'wrong-retry', autoResolve: true });
ok(State.get().wrongBook.q001.mastered === true, '重做答对自动标记掌握');
eq(State.get().wrongBook.q001.wrongCount, 3, '答对不会重复创建或清零错误次数');
G.submit(q('q002'), 'A', { mode: 'practice' });
eq(Object.keys(State.get().wrongBook).length, 2, '新错题新增独立记录');
ok(G.wrongList({ status: 'active' }).length === 1, '筛选未掌握错题');
G.markWrong('q002', true);
eq(G.wrongList({ status: 'mastered' }).length, 2, '标记掌握后进入已掌握列表');
G.removeWrong('q002');
ok(!State.get().wrongBook.q002, '移出错题本生效');

/* ---------- 6. 复习调度 ---------- */
group('6. 复习计划：到期排序、间隔拉长、仍需复习重置');
State.reset();
const k1 = G.upsertReview({ type: 'kp', refId: 'k25', title: '等差数列', chapter: 'ch2', kp: 'k25' });
const k2 = G.upsertReview({ type: 'course', refId: 'c01', title: '数与运算', chapter: 'ch1', kp: 'k11' });
eq(Object.keys(State.get().review).length, 2, '添加两条复习项');
eq(G.reviewList({ onlyDue: true }).length, 2, '新建项立即到期');
G.upsertReview({ type: 'kp', refId: 'k25', title: '等差数列' });
eq(Object.keys(State.get().review).length, 2, '重复添加同一项不产生重复记录');
G.markReview(k1, true);
let r1 = State.get().review[k1];
eq(r1.stage, 1, '掌握一次后阶段 +1');
ok(r1.nextReviewAt > Date.now(), '下次复习时间推到未来');
ok(r1.lastReviewAt != null, '记录上次复习时间');
eq(G.reviewList({ onlyDue: true }).length, 1, '已推后的项不再到期');
for (let i = 0; i < 4; i++) G.markReview(k1, true);
eq(State.get().review[k1].status, 'mastered', '连续 5 关后标记已掌握');
G.markReview(k2, false);
eq(State.get().review[k2].stage, 0, '「仍需复习」回到第 1 档');
eq(State.get().review[k2].status, 'due', '「仍需复习」状态为到期');
G.removeReview(k2);
ok(!State.get().review[k2], '移出复习计划生效');

/* ---------- 7. 模拟考试 ---------- */
group('7. 模拟考试：抽题、暂存、刷新恢复、倒计时、自动评分、错题汇总');
State.reset();
const draft = G.startExam({ count: 8, minutes: 5, chapter: 'all', difficulty: 'all' });
ok(draft && draft.questionIds.length === 8, '按自定义题量抽取 8 题');
ok(State.get().examDraft != null, '考试草稿写入持久化状态');
const firstQ = Data.findQuestion(draft.questionIds[0]);
const right = Data.answerOf(firstQ.id).answer;
G.saveExamAnswer(firstQ.id, firstQ.qtype === 'judge' ? (right === '对' ? '对' : '错') : right);
G.saveExamAnswer(draft.questionIds[1], undefined, true);
State.init(); // 模拟刷新
const d2 = State.get().examDraft;
ok(d2 && d2.answers[firstQ.id] !== undefined, '刷新后暂存答案仍在');
ok(d2.flags[draft.questionIds[1]] === true, '刷新后标记状态仍在');
const rem = G.examRemaining(d2);
ok(rem > 0 && rem <= 300, '剩余时间在合理范围（' + rem + 's）');
const recBefore = State.get().practice.records.length;
const exam = G.submitExam('manual');
ok(exam && exam.total === 8, '交卷生成 8 题成绩单');
ok(exam.correct >= 1, '至少答对暂存的那一题（答对 ' + exam.correct + ' 题）');
ok(exam.score === Math.round(exam.correct * 1000 / exam.total) / 10, '百分制评分计算正确');
ok(exam.results.length === 8 && exam.results.every(r => typeof r.correct === 'boolean'), '逐题结果齐全');
eq(State.get().examDraft, null, '交卷后清空草稿');
eq(State.get().exams.length, 1, '写入历史考试记录');
eq(State.get().practice.records.length, recBefore + 8, '考试答题写入统计记录');
ok(Object.keys(State.get().wrongBook).length > 0, '考试错题自动进入错题本');
const d3 = G.startExam({ count: 3, minutes: 1 });
ok(d3 && d3.durationSec === 60, '自定义时长生效');
const ex2 = G.submitExam('timeout');
ok(ex2 && ex2.submittedBy === 'timeout', '超时自动交卷被正确记录');
eq(State.get().exams.length, 2, '两场考试都在历史里');

/* ---------- 8. 学习统计 ---------- */
group('8. 学习统计：章节掌握度 / 知识点正确率 / 平均用时 / 高频错误 / 成绩');
const s = G.stats();
ok(s.totalAnswered > 0 && s.totalCorrect >= 0, '累计答题与答对数有值');
ok(s.accuracy >= 0 && s.accuracy <= 100, '正确率在 0-100');
ok(s.avgDurationMs >= 0, '平均答题时间可计算');
ok(Object.keys(s.byChapter).length > 0 && Object.keys(s.byKp).length > 0, '章节与知识点维度都有数据');
ok(Object.keys(s.wrongByKp).length > 0, '高频错误知识点统计有数据');
eq(s.recent7.length, 7, '最近 7 天序列长度为 7');
eq(s.exams.length, 2, '历史成绩进入统计');
ok(Object.keys(s.mastery).length === T.chapters.length, '每个章节都有掌握度');
ok(Object.values(s.mastery).every(v => v >= 0 && v <= 100), '掌握度取值合法');

/* ---------- 9. 批量导入 ---------- */
group('9. 批量导入课程 / 题目 / 答案 / 公式（题干与答案自动分离）');
State.reset();
let r = State.importBundle({ type: 'questions', items: [
  { id: 'my_q01', chapter: 'ch1', kp: 'k11', qtype: 'single', difficulty: 2, stem: '1+1=?', options: [{ key: 'A', text: '1' }, { key: 'B', text: '2' }], answer: 'B', idea: '心算', steps: ['1+1=2'], trap: '别选 A' }
] });
ok(r.ok && r.added.questions === 1 && r.added.answers === 1, '导入题目并把答案自动拆到 answers 表');
ok(Data.findQuestion('my_q01') && !Data.findQuestion('my_q01').answer, '题干对象里不含答案（物理分离）');
ok(Data.answerOf('my_q01').answer === 'B', '答案可通过 id 查到');
ok(G.check(Data.findQuestion('my_q01'), 'B').correct, '导入题目可被正常判题');
r = State.importBundle({ type: 'formulas', items: [{ id: 'my_f01', chapter: 'ch1', kp: 'k11', name: '测试公式', tex: 'a+b=c' }] });
ok(r.ok && Data.findFormula('my_f01'), '导入公式可被查询');
r = State.importBundle({ type: 'courses', items: [{ id: 'my_c01', no: 99, chapter: 'ch2', title: '测试课', kps: [], summary: 'x' }] });
ok(r.ok && Data.findCourse('my_c01'), '导入课程可被查询');
r = State.importBundle({ type: 'questions', items: [{ id: 'bad1', qtype: 'weird', stem: 'x' }] });
ok(!r.ok && r.errors.length > 0, '非法题型被拒绝并给出错误信息');
r = State.importBundle({ type: 'questions', items: [{ id: '' }] });
ok(r.errors.length > 0, '缺 id 被拒绝');
r = State.importBundle({ type: 'answers', items: { my_q01: { answer: 'A', idea: '改答案' } } });
ok(r.ok && Data.answerOf('my_q01').answer === 'A', '单独导入答案可覆盖');
State.clearImported();
ok(!Data.findQuestion('my_q01') && !Data.findFormula('my_f01') && qs.length === Data.questions().length, '清空导入内容后恢复为内置数据');

/* ---------- 10. 公式收藏与掌握度 ---------- */
group('10. 公式收藏与掌握程度状态');
State.reset();
State.mutate(st => { st.formulaState.f001 = { favorite: true, mastery: 3, lastCheckAt: Date.now() }; });
State.init();
ok(State.get().formulaState.f001.favorite === true && State.get().formulaState.f001.mastery === 3, '公式收藏与掌握度持久化');

/* ---------- 汇总 ---------- */
console.log('\n' + '='.repeat(56));
console.log(`  逻辑单元测试：${pass} 通过 / ${fail} 失败（共 ${pass + fail} 项）`);
if (fail) { console.log('  失败项：\n   - ' + failures.join('\n   - ')); process.exit(1); }
console.log('  结论：全部通过 ✅');
console.log('='.repeat(56));
