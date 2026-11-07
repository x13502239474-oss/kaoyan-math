/* 真实 DOM 冒烟测试（jsdom）：把 index.html 与全部脚本按原顺序加载，
   模拟真人点击，验证课程 / 公式 / 练习 / 错题 / 复习 / 考试 / 备份恢复的完整交互闭环。
   运行：node tests/ui-smoke.mjs   （依赖仅开发用，装在 .devtools/）
   若 .devtools 不存在：cd .devtools && npm init -y && npm install jsdom
*/
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
let JSDOM;
try { ({ JSDOM } = require(path.join(ROOT, '.devtools', 'node_modules', 'jsdom'))); }
catch (e) { console.error('缺少 jsdom 测试依赖，请先执行：cd .devtools && npm init -y && npm install jsdom'); process.exit(2); }

let pass = 0, fail = 0; const failures = [];
function ok(cond, name) { if (cond) pass++; else { fail++; failures.push(name); console.log('  ✗ ' + name); } }
function group(n) { console.log('\n▶ ' + n); }
const tick = (ms = 30) => new Promise(r => setTimeout(r, ms));

const RAW = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const SRCS = [...RAW.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
const HTML = RAW.replace(/<script src="[^"]*"><\/script>/g, '');
const jsErrors = [];

function makeDom(seed) {
  const dom = new JSDOM(HTML, { url: 'http://localhost:8080/index.html', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  w.scrollTo = () => {};
  w.HTMLElement.prototype.scrollIntoView = function () {};
  w.console = {
    log: () => {}, warn: () => {},
    error: (...a) => { jsErrors.push(a.map(String).join(' ')); }
  };
  if (seed) w.localStorage.setItem('kaoyan_math_state_v2', seed);
  for (const s of SRCS) {
    try { w.eval(fs.readFileSync(path.join(ROOT, s), 'utf8')); }
    catch (e) { jsErrors.push('加载 ' + s + ' 失败: ' + e.message); }
  }
  if (w.document.readyState === 'loading') w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  return { dom, w };
}
function go(w, hash) {
  w.location.hash = hash;
  w.dispatchEvent(new w.Event('hashchange'));
}
function click(w, sel, ctx) {
  const e = (ctx || w.document).querySelector(sel);
  if (!e) throw new Error('找不到元素: ' + sel);
  e.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  return e;
}
function setVal(w, sel, val, evt) {
  const e = w.document.querySelector(sel);
  if (!e) throw new Error('找不到元素: ' + sel);
  e.value = val;
  e.dispatchEvent(new w.Event(evt || 'input', { bubbles: true }));
  return e;
}
function view(w) { return w.document.getElementById('view').innerHTML; }
function st(w) { return w.App.State.get(); }
function noRenderError(w, label) { ok(!/页面渲染出错|页面未就绪/.test(view(w)), label + ' 无渲染异常'); }

/* 对任意题型填入答案（用于练习与考试） */
function answerCard(w, qid, wantCorrect) {
  const q = w.App.Data.findQuestion(qid), a = w.App.Data.answerOf(qid);
  if (!q || !a) return;
  if (q.qtype === 'single') {
    const wrong = (q.options || []).map(o => o.key).find(k => k !== a.answer) || 'A';
    click(w, '.option[data-opt="' + (wantCorrect ? a.answer : wrong) + '"]');
  } else if (q.qtype === 'judge') {
    click(w, '.option[data-opt="' + (wantCorrect === (a.answer === '对') ? '对' : '错') + '"]');
  } else if (q.qtype === 'multi') {
    if (wantCorrect) String(a.answer).split('').forEach(k => click(w, '.option[data-opt="' + k + '"]'));
    else { const wrong = (q.options || []).map(o => o.key).find(k => String(a.answer).indexOf(k) < 0); if (wrong) click(w, '.option[data-opt="' + wrong + '"]'); }
  } else if (q.qtype === 'blank') {
    setVal(w, '[data-blank]', wantCorrect ? String(a.answer) : '绝对错误的答案');
  } else {
    setVal(w, '[data-essay]', wantCorrect ? (a.keywords || []).map(g => g[0]).join('，') : '不会');
  }
}

let { dom, w } = makeDom(null);

/* ---------- 1. 启动与全路由渲染 ---------- */
group('1. 应用启动与全部页面渲染');
ok(!!w.App && !!w.App.State && !!w.App.Views.home, '全部脚本加载完成，App 就绪');
ok(/今日学习任务/.test(view(w)), '首页渲染今日任务');
ok(/快速进入/.test(view(w)), '首页渲染快捷入口');
ok(/最近学习记录/.test(view(w)), '首页渲染学习记录');
noRenderError(w, '首页');
const ROUTES = ['#/home', '#/courses', '#/course/c01', '#/formulas', '#/practice', '#/review', '#/wrong', '#/exam', '#/exam/history', '#/stats', '#/settings', '#/more'];
for (const r of ROUTES) { go(w, r); noRenderError(w, r); ok(view(w).length > 200, r + ' 有实质内容'); }

/* ---------- 2. 课程学习 ---------- */
group('2. 课程学习：完成标记 / 笔记 / 例题解析 / 加入复习');
go(w, '#/courses');
ok(/数与运算、整除与余数/.test(view(w)), '课程列表按章节展示课程');
go(w, '#/course/c01');
ok(/知识点说明/.test(view(w)) && /解题方法/.test(view(w)), '课程详情含知识点、方法、公式与例题');
click(w, '#btn-done');
ok(!!st(w).progress.completedCourses.c01, '「标记已完成」写入进度');
setVal(w, '#note-area', '这是我的测试笔记：余数必须小于除数');
click(w, '#note-save');
ok(st(w).notes.c01.text.includes('测试笔记'), '学习笔记保存到 localStorage');
click(w, '[data-toggle-ex]');
ok(!w.document.querySelector('.ex-body').classList.contains('hidden'), '例题解析点击后展开（先练后讲）');
ok(/逐步演示/.test(w.document.querySelector('.ex-body').innerHTML), '例题解析为四段式');
click(w, '#btn-review');
ok(!!st(w).review['course:c01'], '课程加入复习计划');
noRenderError(w, '课程详情');

/* ---------- 3. 公式库 ---------- */
group('3. 公式库：收藏 / 掌握度 / 隐藏自测 / 随机抽查');
go(w, '#/formulas');
const fcard = w.document.querySelector('[data-fav]');
const fid = fcard.getAttribute('data-fav');
click(w, '[data-fav="' + fid + '"]');
ok(st(w).formulaState[fid].favorite === true, '收藏公式并持久化');
click(w, '[data-mastery="' + fid + ':2"]');
ok(st(w).formulaState[fid].mastery === 2, '标记掌握程度');
click(w, '#toggle-hide');
ok(/blurred/.test(w.document.querySelector('.fc-body').className), '「隐藏全部自测」把公式模糊');
click(w, '#toggle-hide');
click(w, '#random-quiz');
ok(!!w.document.querySelector('#quiz-box'), '随机抽查弹窗打开');
ok(/blurred/.test(w.document.querySelector('#quiz-box').className), '抽查时公式默认隐藏');
click(w, '#quiz-reveal');
ok(!/blurred/.test(w.document.querySelector('#quiz-box').className), '点「显示公式」后揭示');
click(w, '[data-q="weak"]');
ok(Object.values(st(w).review).some(r => r.type === 'kp'), '「仍需复习」自动写入复习计划');
w.App.U.closeModal();
noRenderError(w, '公式库');

/* ---------- 4. 专项练习完整闭环 ---------- */
group('4. 专项练习：筛选 → 5 题作答 → 自动判题 → 解析 → 结果');
go(w, '#/practice');
setVal(w, '#p-qtype', 'single', 'change');
setVal(w, '#p-count', '5', 'change');
click(w, '#start-practice');
ok(!!w.document.querySelector('#p-submit'), '进入答题会话');
let answered = 0;
for (let i = 0; i < 5; i++) {
  const card = w.document.querySelector('.q-card');
  if (!card) break;
  const qid = card.getAttribute('data-qid');
  answerCard(w, qid, i !== 0);      // 第 1 题故意答错，制造错题
  click(w, '#p-submit');
  ok(!!w.document.querySelector('.answer-panel'), '第 ' + (i + 1) + ' 题显示四段式解析');
  answered++;
  click(w, '[data-pnext]');
}
ok(answered === 5, '完成 5 道题的逐题作答');
ok(/本次练习结果/.test(view(w)), '自动进入结果页');
ok(st(w).practice.records.length >= 5, '答题记录写入');
ok(Object.keys(st(w).wrongBook).length >= 1, '答错的题自动进入错题本');
ok(/逐题回顾/.test(view(w)), '结果页提供逐题回顾');
const reviewBtn = w.document.querySelector('[data-review]');
if (reviewBtn) { click(w, '[data-review="0"]'); ok(/易错提醒/.test(view(w)), '结果页可展开逐题解析'); }

/* ---------- 5. 错题本 ---------- */
group('5. 错题本：自动记录 / 查看解析 / 重新答题自动掌握');
go(w, '#/wrong');
ok(/错题本/.test(view(w)) && !!w.document.querySelector('[data-wq]'), '错题列表有记录');
const wrongId = w.document.querySelector('[data-wq]').getAttribute('data-wq');
click(w, '[data-wshow="' + wrongId + '"]');
ok(/解题思路/.test(w.document.querySelector('[data-wbody="' + wrongId + '"]').innerHTML), '错题详细解析可展开');
click(w, '[data-wredo="' + wrongId + '"]');
ok(!!w.document.querySelector('#wr-card'), '重新答题弹窗打开');
answerCard(w, wrongId, true);
click(w, '#wr-submit');
ok(st(w).wrongBook[wrongId].mastered === true, '重做答对自动标记为掌握');
w.App.U.closeModal();
// 重做答对后该题已标记为「已掌握」，切到「全部」筛选才能继续操作它
setVal(w, '#w-status', 'all', 'change');
click(w, '[data-wreview="' + wrongId + '"]');
ok(!!st(w).review['wrong:' + wrongId], '错题加入复习计划');
noRenderError(w, '错题本');

/* ---------- 6. 复习计划 ---------- */
group('6. 复习计划：到期列表与掌握标记');
go(w, '#/review');
ok(Object.keys(st(w).review).length >= 2, '复习计划含课程、知识点、错题多来源');
const rk = w.document.querySelector('[data-rok]').getAttribute('data-rok');
const before = st(w).review[rk].stage;
click(w, '[data-rok="' + rk + '"]');
ok(st(w).review[rk].stage === before + 1, '「已掌握」推进间隔阶段');
ok(st(w).review[rk].lastReviewAt != null, '记录上次复习时间');
noRenderError(w, '复习计划');

/* ---------- 7. 模拟考试 ---------- */
group('7. 模拟考试：组卷 → 暂存 → 刷新恢复 → 交卷 → 评分 → 结果解析');
go(w, '#/exam');
setVal(w, '#e-count', '3');
setVal(w, '#e-min', '1');
click(w, '#e-start');
ok(!!w.document.querySelector('#e-timer'), '进入考试界面并开始倒计时');
const card0 = w.document.querySelector('.q-card'), eqid = card0.getAttribute('data-qid');
answerCard(w, eqid, true);
ok(st(w).examDraft.answers[eqid] != null && st(w).examDraft.answers[eqid] !== '', '答案自动暂存');
click(w, '#e-sheet');
ok(!!w.document.querySelector('[data-jump]'), '题号导航可打开');
w.App.U.closeModal();
click(w, '#e-flag');
ok(st(w).examDraft.flags[eqid] === true, '答题状态标记生效');

// 模拟刷新浏览器：保存 localStorage，重新建 DOM
const snapshot = w.localStorage.getItem('kaoyan_math_state_v2');
dom.window.close();
({ dom, w } = makeDom(snapshot));
go(w, '#/exam');
ok(!!w.document.querySelector('#e-timer'), '刷新后仍回到未完成的考试');
ok(st(w).examDraft.answers[eqid] != null, '刷新后暂存答案恢复');
ok(!!w.document.querySelector('.option.sel') || !!w.document.querySelector('[data-blank]') || !!w.document.querySelector('[data-essay]'), '刷新后界面回填已答内容');
const examsBefore = st(w).exams.length;
click(w, '#e-submit');
ok(!!w.document.querySelector('[data-act="ok"]'), '交卷前弹出确认');
click(w, '[data-act="ok"]');
await tick(60);
ok(st(w).exams.length === examsBefore + 1, '交卷生成成绩记录');
ok(st(w).examDraft === null, '交卷后清空草稿');
const exam = st(w).exams[0];
go(w, '#/exam/result/' + exam.id);
ok(/考试结果与逐题解析/.test(view(w)), '结果页渲染');
ok(/全部题目解析/.test(view(w)), '提供逐题解析');
click(w, '[data-er="0"]');
ok(/解题思路/.test(view(w)), '逐题四段式解析可展开');
go(w, '#/exam/history');
ok(/历史考试记录/.test(view(w)) && /成绩趋势/.test(view(w)), '历史记录与成绩趋势可用');
noRenderError(w, '考试结果');

/* ---------- 8. 数据保存与恢复（UI 链路） ---------- */
group('8. 数据保存与恢复：导出载荷 / 设置页恢复 / 刷新后不丢失');
const backup = w.App.State.exportText();
w.App.State.mutate(s => { s.notes.c01 = { text: '被误改的内容', updatedAt: Date.now() }; });
go(w, '#/settings');
ok(/数据备份与恢复/.test(view(w)) && /批量导入教材内容/.test(view(w)), '设置页含备份与导入入口');
setVal(w, '#bk-text', backup);
click(w, '#bk-restore');
ok(!!w.document.querySelector('[data-act="ok"]'), '恢复前二次确认');
click(w, '[data-act="ok"]');
await tick(450);
ok(st(w).notes.c01.text.includes('测试笔记'), '设置页「恢复备份」把数据还原');
ok(!!st(w).progress.completedCourses.c01, '恢复后课程进度仍在');

const snapshot2 = w.localStorage.getItem('kaoyan_math_state_v2');
dom.window.close();
({ dom, w } = makeDom(snapshot2));
ok(st(w).progress.completedCourses.c01 && st(w).notes.c01.text.includes('测试笔记'), '重新打开页面后进度与笔记仍在');
ok(st(w).exams.length >= 1 && Object.keys(st(w).wrongBook).length >= 1, '重新打开后考试与错题记录仍在');

/* ---------- 9. 批量导入 UI 与全路由复检 ---------- */
group('9. 批量导入 UI、统计页、全路由复检');
go(w, '#/settings');
const tpl = { type: 'questions', items: [{ id: 'ui_q01', sourceType: 'imported', chapter: 'ch1', kp: 'k11', qtype: 'single', difficulty: 1, stem: 'UI 导入测试题', options: [{ key: 'A', text: '1' }, { key: 'B', text: '2' }], answer: 'B', idea: '心算', steps: ['1'], trap: '无' }] };
setVal(w, '#im-text', JSON.stringify(tpl));
click(w, '#im-run');
ok(!!w.App.Data.findQuestion('ui_q01'), '设置页批量导入题目生效');
ok(w.App.Data.answerOf('ui_q01').answer === 'B', '导入题目的答案可查询（分离存储）');
go(w, '#/stats');
ok(/各章节掌握程度/.test(view(w)) && /各知识点正确率/.test(view(w)), '统计页各模块渲染');
ok(/高频错误知识点/.test(view(w)) && /历史考试成绩/.test(view(w)), '统计页含错题与成绩模块');
go(w, '#/more');
ok(/更多功能/.test(view(w)) && /公式库/.test(view(w)), '手机端「更多」入口可用');
for (const r of ROUTES) { go(w, r); noRenderError(w, r); }

/* ---------- 10. 控制台错误 ---------- */
group('10. 运行期错误检查');
ok(jsErrors.length === 0, '全流程无 JS 运行错误' + (jsErrors.length ? '：' + jsErrors.slice(0, 3).join(' | ') : ''));

dom.window.close();
console.log('\n' + '='.repeat(56));
console.log(`  UI 交互测试：${pass} 通过 / ${fail} 失败（共 ${pass + fail} 项）`);
if (fail) { console.log('  失败项：\n   - ' + failures.join('\n   - ')); process.exit(1); }
console.log('  结论：全部通过 ✅');
console.log('='.repeat(56));
process.exit(0);
