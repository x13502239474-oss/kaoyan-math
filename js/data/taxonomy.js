/* 章节—知识点体系（骨架）
   依据管理类联考综合能力「数学基础」公开通行的知识板块划分整理，用于组织课程/题库/公式/统计。
   说明：用户提供的 10 份陈剑、朱曦系列资料为影印扫描版，本站不转录其正文、不复制其题目。
   这里只采用公开通行的章节名称与知识点名称作为组织框架，具体内容均为学习整理与自编示例。 */
(function (root) {
  'use strict';
  var App = root.App = root.App || {};

  var chapters = [
    {
      id: 'ch1', name: '算术与数的运算', short: '算术', icon: '🔢',
      desc: '整数、分数、比与比例、绝对值——所有计算的地基',
      kps: [
        { id: 'k11', name: '数的概念与四则运算', desc: '整数、小数、分数、百分数互化与运算律' },
        { id: 'k12', name: '整除、倍数与余数', desc: '奇偶性、质合数、公约数公倍数、带余除法' },
        { id: 'k13', name: '比与比例', desc: '比例分配、连比、正反比例' },
        { id: 'k14', name: '绝对值', desc: '绝对值的定义、几何意义与化简' },
        { id: 'k15', name: '数轴与实数', desc: '实数分类、数轴、无理数与估算' }
      ]
    },
    {
      id: 'ch2', name: '代数、函数与数列', short: '代数', icon: '∑',
      desc: '整式分式、二次函数、指数对数、数列与均值不等式',
      kps: [
        { id: 'k21', name: '整式与因式分解', desc: '乘法公式、提取公因式、十字相乘' },
        { id: 'k22', name: '分式与根式', desc: '分式化简、分母有理化、根式运算' },
        { id: 'k23', name: '二次函数', desc: '图像、顶点、单调性与最值' },
        { id: 'k24', name: '指数与对数', desc: '幂运算、对数恒等式与换底' },
        { id: 'k25', name: '等差数列与等比数列', desc: '通项、前 n 项和、中项性质' },
        { id: 'k26', name: '均值不等式', desc: '算术—几何平均不等式与和定积最大' }
      ]
    },
    {
      id: 'ch3', name: '方程与不等式', short: '方程', icon: '⚖️',
      desc: '一元二次方程、韦达定理、不等式与绝对值不等式',
      kps: [
        { id: 'k31', name: '一元一次与一元二次方程', desc: '解法、判别式、根的讨论' },
        { id: 'k32', name: '韦达定理与根的分布', desc: '两根和积、对称式求值' },
        { id: 'k33', name: '不等式解法', desc: '一次、二次不等式的解集写法' },
        { id: 'k34', name: '绝对值不等式', desc: '零点分段与几何意义法' },
        { id: 'k35', name: '列方程解应用题', desc: '设未知数、找等量关系、检验' }
      ]
    },
    {
      id: 'ch4', name: '几何', short: '几何', icon: '📐',
      desc: '平面几何、解析几何与立体几何的常用公式',
      kps: [
        { id: 'k41', name: '三角形与相似', desc: '内角和、面积、全等与相似' },
        { id: 'k42', name: '四边形与多边形', desc: '平行四边形、矩形、菱形、梯形' },
        { id: 'k43', name: '圆与扇形', desc: '周长面积、弧长、扇形面积、切线' },
        { id: 'k44', name: '平面直角坐标系与直线', desc: '两点距离、斜率、直线方程' },
        { id: 'k45', name: '立体几何', desc: '长方体、圆柱、球的表面积与体积' }
      ]
    },
    {
      id: 'ch5', name: '数据分析与概率', short: '数据', icon: '🎲',
      desc: '计数原理、排列组合、概率与数据描述',
      kps: [
        { id: 'k51', name: '计数原理与排列组合', desc: '加法乘法原理、排列数、组合数、捆绑插空' },
        { id: 'k52', name: '古典概型', desc: '等可能事件、概率的基本计算' },
        { id: 'k53', name: '独立事件与伯努利试验', desc: '互斥、对立、独立、重复试验' },
        { id: 'k54', name: '数据描述', desc: '平均数、中位数、众数、方差与标准差' }
      ]
    },
    {
      id: 'ch6', name: '应用题专题', short: '应用', icon: '🧩',
      desc: '把文字翻译成式子：行程、工程、浓度、利润、容斥与最值',
      kps: [
        { id: 'k61', name: '行程问题', desc: '相遇、追及、流水、往返' },
        { id: 'k62', name: '工程问题', desc: '工作总量设为 1、效率叠加' },
        { id: 'k63', name: '浓度与配比', desc: '溶质守恒、十字交叉' },
        { id: 'k64', name: '利润与折扣', desc: '进价、标价、售价、利润率' },
        { id: 'k65', name: '容斥与最值', desc: '集合的并与交、最值型应用题' }
      ]
    }
  ];

  var kpIndex = {}, chapterIndex = {};
  chapters.forEach(function (c) {
    chapterIndex[c.id] = c;
    c.kps.forEach(function (k) { kpIndex[k.id] = { id: k.id, name: k.name, desc: k.desc, chapter: c.id, chapterName: c.name, short: c.short }; });
  });

  App.Taxonomy = {
    chapters: chapters,
    kpIndex: kpIndex,
    chapterIndex: chapterIndex,
    chapterName: function (id) { return chapterIndex[id] ? chapterIndex[id].name : '未分类'; },
    chapterShort: function (id) { return chapterIndex[id] ? chapterIndex[id].short : '其他'; },
    kpName: function (id) { return kpIndex[id] ? kpIndex[id].name : '未分类'; },
    chapterOf: function (kpId) { return kpIndex[kpId] ? kpIndex[kpId].chapter : ''; },
    allKpIds: function () { return Object.keys(kpIndex); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
