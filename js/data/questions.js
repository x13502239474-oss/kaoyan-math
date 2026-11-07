/* 题库（只有题干与选项，不含答案与解析）
   重要声明：本站所有题目均为「演示题」或「AI 生成练习题」，
   不是历年真题、不是任何教材原题，也不代表官方答案。
   sourceType: demo=演示题（功能验证用） / ai=AI 生成练习题 / imported=用户批量导入
   后续批量导入请按 templates/导入模板-题目.json 的字段组织。 */
(function (root) {
  'use strict';
  var App = root.App = root.App || {};
  function O(a, b, c, d, e) {
    return [{ key: 'A', text: a }, { key: 'B', text: b }, { key: 'C', text: c }, { key: 'D', text: d }, { key: 'E', text: e }]
      .filter(function (o) { return o.text != null; });
  }
  var questions = [
    /* ===== ch1 算术 ===== */
    { id: 'q001', sourceType: 'demo', chapter: 'ch1', kp: 'k11', qtype: 'single', difficulty: 1, est: 45, stem: '计算 $12\\div0.25+3\\times4=$（　）', options: O('24', '48', '60', '72', '84'), tags: ['四则运算'] },
    { id: 'q002', sourceType: 'ai', chapter: 'ch1', kp: 'k13', qtype: 'single', difficulty: 1, est: 50, stem: '甲、乙两数之比为 $3:5$，两数之和为 64，则甲数是（　）', options: O('18', '24', '30', '36', '40'), tags: ['按比分配'] },
    { id: 'q003', sourceType: 'demo', chapter: 'ch1', kp: 'k11', qtype: 'blank', difficulty: 1, est: 40, stem: '把 $0.125$ 化成最简分数（写成 1/8 这样的形式）。', tags: ['分数'] },
    { id: 'q004', sourceType: 'ai', chapter: 'ch1', kp: 'k12', qtype: 'judge', difficulty: 1, est: 35, stem: '判断：所有的质数都是奇数。', tags: ['质数'] },
    { id: 'q005', sourceType: 'demo', chapter: 'ch1', kp: 'k14', qtype: 'single', difficulty: 2, est: 45, stem: '$|3-7|+|-2|=$（　）', options: O('2', '4', '6', '8', '10'), tags: ['绝对值'] },
    { id: 'q006', sourceType: 'ai', chapter: 'ch1', kp: 'k12', qtype: 'single', difficulty: 2, est: 90, stem: '一个正整数除以 7 余 3，除以 5 余 2，满足条件的最小正整数是（　）', options: O('10', '17', '24', '31', '38'), tags: ['余数'] },
    { id: 'q007', sourceType: 'ai', chapter: 'ch1', kp: 'k11', qtype: 'multi', difficulty: 2, est: 60, stem: '下列数中，是完全平方数的有（　）', options: O('36', '50', '81', '100', '121'), tags: ['平方数'] },
    { id: 'q008', sourceType: 'demo', chapter: 'ch1', kp: 'k11', qtype: 'single', difficulty: 2, est: 60, stem: '$(\\frac{1}{2}+\\frac{1}{3})\\times\\frac{6}{5}=$（　）', options: O('1', '$\\frac{5}{6}$', '$\\frac{6}{5}$', '$\\frac{5}{12}$', '2'), tags: ['分数运算'] },
    { id: 'q009', sourceType: 'ai', chapter: 'ch1', kp: 'k14', qtype: 'essay', difficulty: 3, est: 180, stem: '用自己的话说明 $|a|$ 的几何意义，并求出 $|x-3|=2$ 中 $x$ 的所有取值。', tags: ['绝对值', '简答'] },

    /* ===== ch2 代数 ===== */
    { id: 'q010', sourceType: 'demo', chapter: 'ch2', kp: 'k21', qtype: 'single', difficulty: 1, est: 40, stem: '$x^2-9$ 因式分解的结果是（　）', options: O('$(x-3)^2$', '$(x+3)(x-3)$', '$(x+9)(x-1)$', '$(x-9)(x+1)$', '$x(x-9)$'), tags: ['因式分解'] },
    { id: 'q011', sourceType: 'ai', chapter: 'ch2', kp: 'k21', qtype: 'single', difficulty: 1, est: 50, stem: '已知 $a=2$，$b=-1$，则 $a^2-2ab=$（　）', options: O('4', '6', '8', '10', '12'), tags: ['代入求值'] },
    { id: 'q012', sourceType: 'demo', chapter: 'ch2', kp: 'k25', qtype: 'blank', difficulty: 2, est: 60, stem: '等差数列 3、7、11、…… 的第 10 项是（　）。', tags: ['等差数列'] },
    { id: 'q013', sourceType: 'ai', chapter: 'ch2', kp: 'k25', qtype: 'single', difficulty: 2, est: 70, stem: '等比数列 2、6、18、…… 的前 4 项和是（　）', options: O('26', '54', '78', '80', '162'), tags: ['等比数列'] },
    { id: 'q014', sourceType: 'demo', chapter: 'ch2', kp: 'k23', qtype: 'single', difficulty: 2, est: 70, stem: '二次函数 $y=x^2-4x+3$ 的最小值是（　）', options: O('-1', '0', '1', '3', '4'), tags: ['最值'] },
    { id: 'q015', sourceType: 'ai', chapter: 'ch2', kp: 'k26', qtype: 'judge', difficulty: 2, est: 45, stem: '判断：对任意实数 $a,b$，$a+b\\ge2\\sqrt{ab}$ 恒成立。', tags: ['均值不等式'] },
    { id: 'q016', sourceType: 'ai', chapter: 'ch2', kp: 'k21', qtype: 'single', difficulty: 3, est: 90, stem: '已知 $x+\\frac{1}{x}=3$，则 $x^2+\\frac{1}{x^2}=$（　）', options: O('5', '6', '7', '8', '9'), tags: ['对称式'] },
    { id: 'q017', sourceType: 'demo', chapter: 'ch2', kp: 'k22', qtype: 'single', difficulty: 2, est: 50, stem: '当 $x\\ne1$ 时，$\\frac{x^2-1}{x-1}=$（　）', options: O('$x-1$', '$x+1$', '$x^2+1$', '1', '$x$'), tags: ['分式化简'] },

    /* ===== ch3 方程与不等式 ===== */
    { id: 'q018', sourceType: 'demo', chapter: 'ch3', kp: 'k31', qtype: 'single', difficulty: 1, est: 30, stem: '方程 $2x+6=0$ 的解是（　）', options: O('-3', '-2', '2', '3', '6'), tags: ['一元一次方程'] },
    { id: 'q019', sourceType: 'ai', chapter: 'ch3', kp: 'k32', qtype: 'single', difficulty: 1, est: 40, stem: '$x^2-5x+6=0$ 的两根之和是（　）', options: O('-5', '5', '6', '-6', '1'), tags: ['韦达定理'] },
    { id: 'q020', sourceType: 'demo', chapter: 'ch3', kp: 'k33', qtype: 'single', difficulty: 2, est: 40, stem: '不等式 $2x-4>0$ 的解集是（　）', options: O('$x>2$', '$x<2$', '$x>4$', '$x<-2$', '$x>0$'), tags: ['一元一次不等式'] },
    { id: 'q021', sourceType: 'ai', chapter: 'ch3', kp: 'k31', qtype: 'blank', difficulty: 2, est: 50, stem: '方程 $x^2-3x+2=0$ 中较大的根是（　）。', tags: ['解方程'] },
    { id: 'q022', sourceType: 'demo', chapter: 'ch3', kp: 'k31', qtype: 'judge', difficulty: 2, est: 40, stem: '判断：方程 $x^2+1=0$ 在实数范围内没有解。', tags: ['判别式'] },
    { id: 'q023', sourceType: 'ai', chapter: 'ch3', kp: 'k34', qtype: 'single', difficulty: 2, est: 60, stem: '$|x-1|<2$ 的解集是（　）', options: O('$-1<x<3$', '$-2<x<2$', '$x<3$', '$x>-1$', '$-3<x<1$'), tags: ['绝对值不等式'] },
    { id: 'q024', sourceType: 'ai', chapter: 'ch3', kp: 'k31', qtype: 'single', difficulty: 3, est: 80, stem: '若 $x^2-mx+4=0$ 有两个相等的实根，则 $m$ 的值是（　）', options: O('4', '-4', '$\\pm4$', '2', '$\\pm2$'), tags: ['判别式'] },
    { id: 'q025', sourceType: 'demo', chapter: 'ch3', kp: 'k35', qtype: 'single', difficulty: 2, est: 45, stem: '某数的一半加上 3 等于 8，这个数是（　）', options: O('5', '10', '11', '16', '22'), tags: ['列方程'] },

    /* ===== ch4 几何 ===== */
    { id: 'q026', sourceType: 'demo', chapter: 'ch4', kp: 'k43', qtype: 'single', difficulty: 1, est: 35, stem: '半径为 3 的圆的面积是（　）', options: O('$3\\pi$', '$6\\pi$', '$9\\pi$', '$12\\pi$', '$18\\pi$'), tags: ['圆面积'] },
    { id: 'q027', sourceType: 'ai', chapter: 'ch4', kp: 'k41', qtype: 'single', difficulty: 1, est: 35, stem: '直角三角形两条直角边长为 3 和 4，斜边长是（　）', options: O('5', '6', '7', '12', '25'), tags: ['勾股定理'] },
    { id: 'q028', sourceType: 'demo', chapter: 'ch4', kp: 'k42', qtype: 'blank', difficulty: 2, est: 60, stem: '边长为 4 的正方形，对角线长为（　）（用根号表示，如 2√2）。', tags: ['勾股定理'] },
    { id: 'q029', sourceType: 'ai', chapter: 'ch4', kp: 'k43', qtype: 'single', difficulty: 2, est: 65, stem: '半径为 6 的圆中，圆心角为 60° 的扇形面积是（　）', options: O('$3\\pi$', '$6\\pi$', '$9\\pi$', '$12\\pi$', '$36\\pi$'), tags: ['扇形'] },
    { id: 'q030', sourceType: 'demo', chapter: 'ch4', kp: 'k41', qtype: 'judge', difficulty: 2, est: 40, stem: '判断：任意三角形中，任意两边之和都大于第三边。', tags: ['三角形'] },
    { id: 'q031', sourceType: 'ai', chapter: 'ch4', kp: 'k44', qtype: 'single', difficulty: 2, est: 60, stem: '点 $(1,2)$ 与 $(3,6)$ 连线的斜率是（　）', options: O('$\\frac{1}{2}$', '1', '2', '3', '4'), tags: ['斜率'] },
    { id: 'q032', sourceType: 'ai', chapter: 'ch4', kp: 'k41', qtype: 'single', difficulty: 3, est: 70, stem: '两个相似三角形的面积比为 $1:4$，则对应边长之比是（　）', options: O('$1:2$', '$1:4$', '$1:8$', '$1:16$', '$2:1$'), tags: ['相似'] },
    { id: 'q033', sourceType: 'demo', chapter: 'ch4', kp: 'k45', qtype: 'single', difficulty: 2, est: 40, stem: '长、宽、高分别为 2、3、4 的长方体体积是（　）', options: O('9', '12', '24', '26', '52'), tags: ['体积'] },

    /* ===== ch5 数据分析 ===== */
    { id: 'q034', sourceType: 'demo', chapter: 'ch5', kp: 'k51', qtype: 'single', difficulty: 1, est: 40, stem: '从 5 个人中任选 2 人，不同的选法共有（　）', options: O('5', '10', '15', '20', '25'), tags: ['组合数'] },
    { id: 'q035', sourceType: 'ai', chapter: 'ch5', kp: 'k52', qtype: 'single', difficulty: 1, est: 35, stem: '掷一枚均匀骰子，出现偶数点的概率是（　）', options: O('$\\frac{1}{6}$', '$\\frac{1}{3}$', '$\\frac{1}{2}$', '$\\frac{2}{3}$', '$\\frac{5}{6}$'), tags: ['古典概型'] },
    { id: 'q036', sourceType: 'demo', chapter: 'ch5', kp: 'k54', qtype: 'blank', difficulty: 2, est: 40, stem: '数据 1、2、3、4、5 的平均数是（　）。', tags: ['平均数'] },
    { id: 'q037', sourceType: 'ai', chapter: 'ch5', kp: 'k51', qtype: 'single', difficulty: 2, est: 70, stem: '把 3 封不同的信任意投入 4 个不同的邮筒（每封信任选一个），共有（　）种投法', options: O('12', '24', '34', '64', '81'), tags: ['分步乘法'] },
    { id: 'q038', sourceType: 'demo', chapter: 'ch5', kp: 'k52', qtype: 'judge', difficulty: 2, est: 40, stem: '判断：同时掷两枚骰子，点数之和等于 13 的概率为 0。', tags: ['古典概型'] },
    { id: 'q039', sourceType: 'ai', chapter: 'ch5', kp: 'k53', qtype: 'single', difficulty: 2, est: 55, stem: '甲、乙独立射击，命中率分别为 0.8 与 0.7，两人都命中的概率是（　）', options: O('0.15', '0.5', '0.56', '0.75', '0.94'), tags: ['独立事件'] },
    { id: 'q040', sourceType: 'demo', chapter: 'ch5', kp: 'k54', qtype: 'single', difficulty: 2, est: 65, stem: '数据 1、1、3、3 的方差是（　）', options: O('0', '1', '2', '3', '4'), tags: ['方差'] },
    { id: 'q041', sourceType: 'ai', chapter: 'ch5', kp: 'k51', qtype: 'single', difficulty: 3, est: 90, stem: '5 个人排成一排，其中甲、乙必须相邻，共有（　）种排法', options: O('24', '48', '60', '72', '120'), tags: ['捆绑法'] },

    /* ===== ch6 应用题 ===== */
    { id: 'q042', sourceType: 'demo', chapter: 'ch6', kp: 'k64', qtype: 'single', difficulty: 1, est: 35, stem: '一件原价 200 元的商品打八折，售价是（　）', options: O('120 元', '140 元', '160 元', '180 元', '190 元'), tags: ['折扣'] },
    { id: 'q043', sourceType: 'ai', chapter: 'ch6', kp: 'k61', qtype: 'single', difficulty: 1, est: 45, stem: '甲乙两地相距 100 km，两人相向而行，速度分别为 60 km/h 与 40 km/h，（　）小时后相遇', options: O('0.5', '1', '1.5', '2', '2.5'), tags: ['相遇'] },
    { id: 'q044', sourceType: 'demo', chapter: 'ch6', kp: 'k62', qtype: 'single', difficulty: 2, est: 70, stem: '一项工程甲单独做 10 天完成，乙单独做 15 天完成，两人合作需要（　）天', options: O('5', '6', '7', '8', '12.5'), tags: ['工程'] },
    { id: 'q045', sourceType: 'ai', chapter: 'ch6', kp: 'k63', qtype: 'single', difficulty: 2, est: 70, stem: '浓度为 20% 的盐水 200 g，加入 200 g 水后，浓度变为（　）', options: O('5%', '10%', '15%', '20%', '25%'), tags: ['浓度'] },
    { id: 'q046', sourceType: 'demo', chapter: 'ch6', kp: 'k65', qtype: 'blank', difficulty: 2, est: 80, stem: '某班 40 人，参加数学组 25 人，参加英语组 20 人，两组都参加 10 人，两组都不参加的有（　）人。', tags: ['容斥'] },
    { id: 'q047', sourceType: 'ai', chapter: 'ch6', kp: 'k64', qtype: 'judge', difficulty: 2, est: 50, stem: '判断：商品先涨价 10%，再降价 10%，最终价格等于原价。', tags: ['百分比'] },
    { id: 'q048', sourceType: 'ai', chapter: 'ch6', kp: 'k64', qtype: 'single', difficulty: 3, est: 90, stem: '某商品进价 100 元、标价 150 元，打八折售出，利润率为（　）', options: O('10%', '15%', '20%', '25%', '50%'), tags: ['利润率'] },
    { id: 'q049', sourceType: 'demo', chapter: 'ch6', kp: 'k61', qtype: 'single', difficulty: 2, est: 40, stem: '汽车以 60 km/h 行驶 2.5 小时，行驶路程为（　）km', options: O('120', '150', '180', '200', '240'), tags: ['行程'] },
    { id: 'q050', sourceType: 'ai', chapter: 'ch6', kp: 'k61', qtype: 'essay', difficulty: 3, est: 180, stem: '简述解行程问题的基本步骤，并说明相遇问题中应如何列式。', tags: ['行程', '简答'] },
    { id: 'q051', sourceType: 'ai', chapter: 'ch6', kp: 'k61', qtype: 'single', difficulty: 2, est: 50, stem: '甲 3 分钟走 180 米，按此速度 10 分钟可走（　）米', options: O('400', '500', '540', '600', '720'), tags: ['行程'] },
    { id: 'q052', sourceType: 'demo', chapter: 'ch6', kp: 'k64', qtype: 'single', difficulty: 3, est: 65, stem: '某数增加 20% 后等于 60，原数是（　）', options: O('40', '48', '50', '52', '72'), tags: ['百分比'] }
  ];

  App.Questions = questions;
})(typeof window !== 'undefined' ? window : globalThis);
