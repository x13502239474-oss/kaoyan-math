/* 公式库：只收录公共数学领域通用公式（不含任何教材原文）
   字段：id / chapter / kp / name / tex(受限 LaTeX，用 $ 包裹亦可) / note / tags
   mastery 与 favorite 属于学习者状态，保存在 state.formulaState，不写在这里。 */
(function (root) {
  'use strict';
  var App = root.App = root.App || {};

  var formulas = [
    /* ---- ch1 算术 ---- */
    { id: 'f001', chapter: 'ch1', kp: 'k11', name: '分数加减', tex: '\\frac{a}{b}\\pm\\frac{c}{d}=\\frac{ad\\pm bc}{bd}', note: '先通分，再对分子做加减；结果要约成最简分数。', tags: ['基础'] },
    { id: 'f002', chapter: 'ch1', kp: 'k11', name: '百分数与小数互化', tex: 'x\\%=x\\div100', note: '例如 25% = 0.25 = 1/4。折扣「八折」即原价乘 0.8。', tags: ['基础'] },
    { id: 'f003', chapter: 'ch1', kp: 'k12', name: '带余除法', tex: 'a=bq+r,\\quad 0\\le r<b', note: '被除数 = 除数 × 商 + 余数，余数必须小于除数且非负。', tags: ['余数'] },
    { id: 'f004', chapter: 'ch1', kp: 'k12', name: '最大公约数与最小公倍数', tex: '\\gcd(a,b)\\times\\mathrm{lcm}(a,b)=ab', note: '仅对正整数成立，常用于「最少分几组」「每隔多少天再相遇」。', tags: ['整除'] },
    { id: 'f005', chapter: 'ch1', kp: 'k13', name: '比例的基本性质', tex: '\\frac{a}{b}=\\frac{c}{d}\\Rightarrow ad=bc', note: '内项之积等于外项之积，也叫交叉相乘。', tags: ['比例'] },
    { id: 'f006', chapter: 'ch1', kp: 'k13', name: '按比分配', tex: 'A=S\\times\\frac{m}{m+n}', note: '总量 S 按 m:n 分成两份，第一份占 m/(m+n)。', tags: ['比例'] },
    { id: 'f007', chapter: 'ch1', kp: 'k14', name: '绝对值定义', tex: '|a|=a\\ (a\\ge0),\\quad |a|=-a\\ (a<0)', note: '绝对值就是数轴上这个数到原点的距离，结果恒非负；分正负两种情况去掉绝对值符号。', tags: ['基础'] },
    { id: 'f008', chapter: 'ch1', kp: 'k14', name: '绝对值三角不等式', tex: '|a|-|b|\\le|a\\pm b|\\le|a|+|b|', note: '用于绝对值的最值与范围估计。', tags: ['进阶'] },
    { id: 'f009', chapter: 'ch1', kp: 'k15', name: '分母有理化', tex: '\\frac{1}{\\sqrt{a}}=\\frac{\\sqrt{a}}{a}', note: '分子分母同乘根式，把分母里的根号消掉。', tags: ['根式'] },

    /* ---- ch2 代数 ---- */
    { id: 'f010', chapter: 'ch2', kp: 'k21', name: '平方差公式', tex: 'a^2-b^2=(a+b)(a-b)', note: '看到两个平方相减，先想它。', tags: ['因式分解'] },
    { id: 'f011', chapter: 'ch2', kp: 'k21', name: '完全平方公式', tex: '(a\\pm b)^2=a^2\\pm2ab+b^2', note: '配方法与求最值的核心工具。', tags: ['因式分解'] },
    { id: 'f012', chapter: 'ch2', kp: 'k21', name: '立方和差', tex: 'a^3\\pm b^3=(a\\pm b)(a^2\\mp ab+b^2)', note: '符号规律：第一个括号同号，第二个括号中间项反号。', tags: ['进阶'] },
    { id: 'f013', chapter: 'ch2', kp: 'k22', name: '分式基本性质', tex: '\\frac{a}{b}=\\frac{am}{bm}\\quad(m\\ne0)', note: '约分前先因式分解；分母不能为 0。', tags: ['基础'] },
    { id: 'f014', chapter: 'ch2', kp: 'k23', name: '二次函数顶点式', tex: 'y=a(x-h)^2+k,\\quad(h,k)', note: 'a>0 时顶点是最低点（最小值 k），a<0 时是最高点。', tags: ['函数'] },
    { id: 'f015', chapter: 'ch2', kp: 'k23', name: '二次函数顶点坐标', tex: 'h=-\\frac{b}{2a},\\quad k=\\frac{4ac-b^2}{4a}', note: '由 y=ax²+bx+c 直接求顶点。', tags: ['函数'] },
    { id: 'f016', chapter: 'ch2', kp: 'k24', name: '同底数幂相乘', tex: 'a^m\\cdot a^n=a^{m+n}', note: '底数相同才能指数相加。', tags: ['指数'] },
    { id: 'f017', chapter: 'ch2', kp: 'k24', name: '对数基本恒等式', tex: '\\log_a(MN)=\\log_a M+\\log_a N', note: '要求 a>0、a≠1 且 M、N>0。', tags: ['对数'] },
    { id: 'f018', chapter: 'ch2', kp: 'k25', name: '等差数列通项', tex: 'a_n=a_1+(n-1)d', note: 'd 是公差；第 n 项比第 1 项多 (n−1) 个 d。', tags: ['数列'] },
    { id: 'f019', chapter: 'ch2', kp: 'k25', name: '等差数列前 n 项和', tex: 'S_n=\\frac{n(a_1+a_n)}{2}=na_1+\\frac{n(n-1)}{2}d', note: '「首项加末项乘项数除以 2」，也叫梯形公式。', tags: ['数列'] },
    { id: 'f020', chapter: 'ch2', kp: 'k25', name: '等比数列通项与求和', tex: 'a_n=a_1q^{n-1},\\quad S_n=\\frac{a_1(1-q^n)}{1-q}', note: 'q≠1；q=1 时 S_n=na₁。', tags: ['数列'] },
    { id: 'f021', chapter: 'ch2', kp: 'k25', name: '等差中项', tex: '2a_n=a_{n-1}+a_{n+1}', note: '相邻三项，中间项是两边的算术平均。', tags: ['数列'] },
    { id: 'f022', chapter: 'ch2', kp: 'k26', name: '均值不等式', tex: '\\frac{a+b}{2}\\ge\\sqrt{ab}\\quad(a,b>0)', note: '当且仅当 a=b 时取等号；「和定积最大、积定和最小」。', tags: ['最值'] },

    /* ---- ch3 方程与不等式 ---- */
    { id: 'f023', chapter: 'ch3', kp: 'k31', name: '一元二次方程求根公式', tex: 'x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}', note: '判别式 Δ=b²−4ac 决定根的个数。', tags: ['方程'] },
    { id: 'f024', chapter: 'ch3', kp: 'k32', name: '韦达定理', tex: 'x_1+x_2=-\\frac{b}{a},\\quad x_1x_2=\\frac{c}{a}', note: '不必解出两根，直接求两根的和与积。', tags: ['方程'] },
    { id: 'f025', chapter: 'ch3', kp: 'k32', name: '对称式求值', tex: 'x_1^2+x_2^2=(x_1+x_2)^2-2x_1x_2', note: '把高次式换成「和」与「积」的组合。', tags: ['技巧'] },
    { id: 'f026', chapter: 'ch3', kp: 'k33', name: '二次不等式解集', tex: 'ax^2+bx+c>0\\ (a>0)\\Rightarrow x<x_1\\ \\text{或}\\ x>x_2', note: '抛物线开口向上，大于 0 取两根之外，小于 0 取两根之间。', tags: ['不等式'] },
    { id: 'f027', chapter: 'ch3', kp: 'k34', name: '绝对值不等式', tex: '|x|<a\\Leftrightarrow -a<x<a', note: 'a>0；|x|>a 则取两边：x<−a 或 x>a。', tags: ['不等式'] },
    { id: 'f028', chapter: 'ch3', kp: 'k35', name: '利润率', tex: '\\text{利润率}=\\frac{\\text{售价}-\\text{进价}}{\\text{进价}}\\times100\\%', note: '分母是进价（成本），不是售价。', tags: ['应用题'] },

    /* ---- ch4 几何 ---- */
    { id: 'f029', chapter: 'ch4', kp: 'k41', name: '勾股定理', tex: 'a^2+b^2=c^2', note: '直角三角形两直角边平方和等于斜边平方。', tags: ['几何'] },
    { id: 'f030', chapter: 'ch4', kp: 'k41', name: '三角形面积', tex: 'S=\\frac{1}{2}ah', note: '底乘高除以 2；相似三角形面积比等于相似比的平方。', tags: ['几何'] },
    { id: 'f031', chapter: 'ch4', kp: 'k42', name: '梯形面积', tex: 'S=\\frac{(a+b)h}{2}', note: '上底加下底，乘高除以 2。', tags: ['几何'] },
    { id: 'f032', chapter: 'ch4', kp: 'k43', name: '圆的周长与面积', tex: 'C=2\\pi r,\\quad S=\\pi r^2', note: '直径 d=2r；半圆周长要加上直径。', tags: ['几何'] },
    { id: 'f033', chapter: 'ch4', kp: 'k43', name: '弧长与扇形面积', tex: 'l=\\frac{n}{360}\\cdot2\\pi r,\\quad S=\\frac{n}{360}\\pi r^2', note: 'n 是圆心角度数；也可用 S=lr/2。', tags: ['几何'] },
    { id: 'f034', chapter: 'ch4', kp: 'k44', name: '两点间距离与斜率', tex: 'd=\\sqrt{(x_2-x_1)^2+(y_2-y_1)^2},\\quad k=\\frac{y_2-y_1}{x_2-x_1}', note: 'x₁=x₂ 时直线竖直，斜率不存在。', tags: ['解析几何'] },
    { id: 'f035', chapter: 'ch4', kp: 'k44', name: '点到直线距离', tex: 'd=\\frac{|Ax_0+By_0+C|}{\\sqrt{A^2+B^2}}', note: '直线写成一般式 Ax+By+C=0。', tags: ['解析几何'] },
    { id: 'f036', chapter: 'ch4', kp: 'k45', name: '长方体与圆柱体积', tex: 'V=abc,\\quad V=\\pi r^2h', note: '柱体体积通用：底面积 × 高。', tags: ['立体'] },
    { id: 'f037', chapter: 'ch4', kp: 'k45', name: '球的表面积与体积', tex: 'S=4\\pi r^2,\\quad V=\\frac{4}{3}\\pi r^3', note: '注意表面积是 4πr²，体积带 4/3。', tags: ['立体'] },

    /* ---- ch5 数据 ---- */
    { id: 'f038', chapter: 'ch5', kp: 'k51', name: '排列数与组合数', tex: 'A_n^m=\\frac{n!}{(n-m)!},\\quad C_n^m=\\frac{n!}{m!(n-m)!}', note: '讲顺序用排列，不讲顺序用组合。', tags: ['计数'] },
    { id: 'f039', chapter: 'ch5', kp: 'k51', name: '组合数对称性与互补', tex: 'C_n^m=C_n^{n-m},\\quad C_n^0=1', note: '从 n 个里选 m 个，等价于留下 n−m 个。', tags: ['计数'] },
    { id: 'f040', chapter: 'ch5', kp: 'k52', name: '古典概型', tex: 'P(A)=\\frac{\\text{事件}A\\text{包含的基本事件数}}{\\text{样本空间总数}}', note: '前提是每个基本结果等可能。', tags: ['概率'] },
    { id: 'f041', chapter: 'ch5', kp: 'k53', name: '独立事件同时发生', tex: 'P(AB)=P(A)P(B)', note: '仅在 A、B 相互独立时成立。', tags: ['概率'] },
    { id: 'f042', chapter: 'ch5', kp: 'k53', name: '对立事件与加法公式', tex: 'P(\\bar A)=1-P(A),\\quad P(A\\cup B)=P(A)+P(B)-P(AB)', note: '「至少有一个」常改用对立事件算。', tags: ['概率'] },
    { id: 'f043', chapter: 'ch5', kp: 'k53', name: 'n 次独立重复试验', tex: 'P(k)=C_n^kp^k(1-p)^{n-k}', note: '恰好成功 k 次的概率。', tags: ['概率'] },
    { id: 'f044', chapter: 'ch5', kp: 'k54', name: '平均数', tex: '\\bar x=\\frac{x_1+x_2+\\cdots+x_n}{n}', note: '所有数据之和除以个数。', tags: ['统计'] },
    { id: 'f045', chapter: 'ch5', kp: 'k54', name: '方差与标准差', tex: 's^2=\\frac{1}{n}\\sum_{i=1}^{n}(x_i-\\bar x)^2,\\quad s=\\sqrt{s^2}', note: '方差衡量离散程度；每个数同时加同一常数，方差不变。', tags: ['统计'] },

    /* ---- ch6 应用题 ---- */
    { id: 'f046', chapter: 'ch6', kp: 'k61', name: '行程基本关系', tex: 's=vt', note: '相遇：路程和 = 速度和 × 时间；追及：路程差 = 速度差 × 时间。', tags: ['应用题'] },
    { id: 'f047', chapter: 'ch6', kp: 'k62', name: '工程问题', tex: '\\text{工作量}=\\text{效率}\\times\\text{时间}', note: '把总工作量设为 1，则效率是完成天数的倒数。', tags: ['应用题'] },
    { id: 'f048', chapter: 'ch6', kp: 'k63', name: '浓度公式', tex: '\\text{浓度}=\\frac{\\text{溶质}}{\\text{溶液}}\\times100\\%', note: '加水时溶质不变，加盐时溶剂不变，抓住不变量。', tags: ['应用题'] },
    { id: 'f049', chapter: 'ch6', kp: 'k64', name: '售价与折扣', tex: '\\text{售价}=\\text{标价}\\times\\text{折扣}', note: '「打 n 折」就是乘 n/10。', tags: ['应用题'] },
    { id: 'f050', chapter: 'ch6', kp: 'k65', name: '两集合容斥', tex: '|A\\cup B|=|A|+|B|-|A\\cap B|', note: '总数 = 至少参加一个 + 两个都不参加。', tags: ['应用题'] }
  ];

  App.Formulas = formulas;
})(typeof window !== 'undefined' ? window : globalThis);
