/* 设置与备份：学习目标、JSON 导出/恢复、批量导入模板、PWA、存储状态、重置 */
(function (root) {
  'use strict';
  var App = root.App = root.App || {};
  var U = App.U, State = App.State, G = App.Grading, UI = App.UI, Data = App.Data;

  var TEMPLATES = {
    courses: {
      type: 'courses', items: [{
        id: 'my_c01', no: 101, chapter: 'ch1', kps: ['k11'], title: '（示例）我的课程标题', minutes: 15,
        goals: ['学完能做到的一件事'], summary: '用自己的话写知识点说明，公式用 $...$ 包裹。',
        keyPoints: ['重点 1'], hardPoints: ['难点 1'], formulaIds: ['f001'],
        methods: [{ title: '方法名称', steps: ['第一步', '第二步'] }],
        examples: [{ id: 'my_e01', stem: '例题题干', hint: '给一句提示' }], tip: '一句学习提示'
      }]
    },
    questions: {
      type: 'questions', items: [
        { id: 'my_q01', sourceType: 'imported', source: '我的教材 P12', chapter: 'ch1', kp: 'k11', qtype: 'single', difficulty: 2, est: 60, stem: '题干，可含 $\\frac{1}{2}$ 这样的公式', options: [{ key: 'A', text: '选项 A' }, { key: 'B', text: '选项 B' }], tags: ['自编'] },
        { id: 'my_q02', sourceType: 'imported', chapter: 'ch2', kp: 'k25', qtype: 'blank', difficulty: 1, stem: '填空题题干', tags: [] }
      ]
    },
    answers: {
      type: 'answers', items: {
        my_q01: { answer: 'B', idea: '解题思路', steps: ['第一步', '第二步'], trap: '易错提醒', accepted: [] },
        my_q02: { answer: '42', accepted: ['42', '四十二'], idea: '解题思路', steps: ['计算过程'], trap: '易错提醒' }
      }
    },
    formulas: {
      type: 'formulas', items: [{ id: 'my_f01', chapter: 'ch1', kp: 'k11', name: '（示例）公式名称', tex: 'a^2+b^2=c^2', note: '适用条件与说明', tags: ['自定义'] }]
    },
    examples: {
      type: 'examples', items: { my_e01: { answer: '例题答案', idea: '解题思路', steps: ['演示步骤'], trap: '易错提醒' } }
    }
  };

  function filePicker(inputId, textareaId) {
    var inp = root.document.getElementById(inputId), ta = root.document.getElementById(textareaId);
    inp.addEventListener('change', function () {
      var f = inp.files && inp.files[0]; if (!f) return;
      if (!root.FileReader) { U.toast('当前环境不支持读取本地文件，请直接粘贴 JSON 文本', 'err'); return; }
      var fr = new root.FileReader();
      fr.onload = function () { ta.value = String(fr.result); U.toast('文件已读入，点击下方按钮执行', 'ok'); };
      fr.onerror = function () { U.toast('文件读取失败', 'err'); };
      fr.readAsText(f, 'utf-8');
    });
  }
  function sizeKB() {
    try {
      var txt = State.exportText();
      return (new Blob([txt]).size / 1024).toFixed(1);
    } catch (e) { return (State.exportText().length / 1024).toFixed(1); }
  }

  App.Views.settings = {
    render: function (el) {
      var st = State.get(), imp = Data.importedCount();
      el.innerHTML = UI.head('设置与备份', '数据全部保存在本机浏览器；定期导出 JSON 是最可靠的备份方式') +

        '<div class="setting-section card"><h2>🎯 学习目标</h2>' +
          '<div class="filter-bar">' +
            numField('g-courses', '每日课程数（节）', st.profile.dailyCourses, 1, 20) +
            numField('g-questions', '每日练习题（道）', st.profile.dailyQuestions, 1, 200) +
            numField('g-exam-count', '默认考试题量', st.profile.examCount, 1, 200) +
            numField('g-exam-min', '默认考试时长（分）', st.profile.examMinutes, 1, 300) +
          '</div><div class="mt-3"><button class="btn btn-primary btn-sm" id="g-save">保存目标</button></div></div>' +

        '<div class="setting-section card"><h2>💾 数据备份与恢复</h2>' +
          '<div class="setting-row"><div><div class="sr-t">导出全部学习数据</div><div class="sr-d">包含进度、笔记、错题、收藏、复习、考试与已导入内容；文件名带日期时间。</div></div>' +
            '<button class="btn btn-primary btn-sm" id="bk-export">导出 JSON 备份</button></div>' +
          '<div class="setting-row"><div><div class="sr-t">恢复备份</div><div class="sr-d">「覆盖」用备份替换当前数据；「合并」把备份里缺的记录补进来，本机现有记录优先。</div></div>' +
            '<div class="row"><label class="chip"><input type="radio" name="bk-mode" value="replace" checked> 覆盖</label>' +
            '<label class="chip"><input type="radio" name="bk-mode" value="merge"> 合并</label></div></div>' +
          '<div class="field mt-3"><label>选择备份文件，或直接粘贴 JSON 文本</label>' +
            '<input class="input" type="file" id="bk-file" accept=".json,application/json"></div>' +
          '<textarea class="textarea mt-3" id="bk-text" placeholder="在此粘贴备份 JSON 内容…" style="min-height:110px"></textarea>' +
          '<div class="btn-group mt-3"><button class="btn btn-primary btn-sm" id="bk-restore">执行恢复</button>' +
            '<button class="btn btn-sm" id="bk-clear-text">清空输入框</button></div>' +
          '<div class="notice mt-3">每次写入前系统会自动保留上一版快照到本机（键名 <code>kaoyan_math_state_v2_prev</code>），误操作后仍可尝试取回。更换浏览器或清理浏览器数据会丢失本机数据，请务必导出备份。</div></div>' +

        '<div class="setting-section card"><h2>📥 批量导入教材内容</h2>' +
          '<p class="small muted mb-3">课程、题目、答案与解析、公式分开存储。导入的题会标注为你填写的来源，导入内容随时可一键清空，不影响内置演示数据。</p>' +
          '<div class="row wrap mb-3">' + Object.keys(TEMPLATES).map(function (k) {
            return '<button class="btn btn-sm" data-tpl="' + k + '">下载 ' + k + ' 模板</button>';
          }).join('') + '</div>' +
          '<div class="field"><label>选择 JSON 文件，或粘贴内容</label><input class="input" type="file" id="im-file" accept=".json,application/json"></div>' +
          '<textarea class="textarea mt-3" id="im-text" placeholder=\'粘贴 {"type":"questions","items":[...]} 这样的 JSON\' style="min-height:110px"></textarea>' +
          '<div class="btn-group mt-3"><button class="btn btn-primary btn-sm" id="im-run">校验并导入</button>' +
            '<button class="btn btn-sm" id="im-clear-text">清空输入框</button></div>' +
          '<div class="divider"></div>' +
          '<div class="row-between wrap"><div class="small">已导入：课程 <b>' + imp.courses + '</b> · 题目 <b>' + imp.questions + '</b> · 答案 <b>' + imp.answers + '</b> · 公式 <b>' + imp.formulas + '</b></div>' +
            '<button class="btn btn-sm btn-danger" id="im-clear">清空全部导入内容</button></div>' +
          '<div id="im-result" class="mt-3"></div></div>' +

        '<div class="setting-section card"><h2>📱 存储与安装</h2>' +
          '<div class="setting-row"><div><div class="sr-t">本地存储状态</div><div class="sr-d">' +
            (App.Storage.available() ? '✅ 可用（localStorage）' : '⚠️ 不可用，本次数据仅存内存') +
            '　·　当前数据约 ' + sizeKB() + ' KB　·　数据版本 v' + State.VERSION + '</div></div></div>' +
          '<div class="setting-row"><div><div class="sr-t">添加到手机主屏幕（PWA）</div><div class="sr-d">用手机浏览器打开本站，通过浏览器菜单「添加到主屏幕」即可全屏使用；在 https 或 localhost 下会自动启用离线缓存。</div></div>' +
            '<button class="btn btn-sm" id="pwa-install" ' + (App.deferredPrompt ? '' : 'disabled') + '>' + (App.deferredPrompt ? '立即安装' : '浏览器菜单添加') + '</button></div>' +
          '<div class="setting-row"><div><div class="sr-t">跨设备数据</div><div class="sr-d">手机与电脑的数据各自独立保存。想迁移，请在原设备导出 JSON，在新设备的「恢复备份」里导入。</div></div></div></div>' +

        '<div class="setting-section card"><h2>⚠️ 危险操作</h2>' +
          '<div class="setting-row"><div><div class="sr-t">重置全部学习数据</div><div class="sr-d">清空进度、笔记、错题、复习、考试与导入内容，恢复成初始状态。此操作不可撤销。</div></div>' +
            '<button class="btn btn-sm btn-danger" id="reset-all">重置数据</button></div></div>' +

        '<div class="notice"><b>内容与版权声明：</b>本站不收录、不转录任何考研真题、教材原文或官方答案。内置课程为学习整理，题目全部标注「演示题」或「AI 生成练习题」。<b>请只导入你有权使用的资料</b>，引用原文请自行标注出处且避免大段照抄。用户提供的陈剑、朱曦系列 PDF 为影印扫描版，本站未复制其内容，仅参考公开通行的章节体系组织学习路径。</div>';

      function num(id, label, v, min, max) { return [id, label, v, min, max]; }
      function numField(id, label, v, min, max) {
        return '<div class="field"><label>' + U.esc(label) + '</label><input class="input" id="' + id + '" type="number" min="' + min + '" max="' + max + '" value="' + Number(v) + '"></div>';
      }
      /* 目标保存 */
      el.querySelector('#g-save').onclick = function () {
        State.mutate(function (s) {
          s.profile.dailyCourses = U.clamp(Number(el.querySelector('#g-courses').value) || 1, 1, 20);
          s.profile.dailyQuestions = U.clamp(Number(el.querySelector('#g-questions').value) || 1, 1, 200);
          s.profile.examCount = U.clamp(Number(el.querySelector('#g-exam-count').value) || 1, 1, 200);
          s.profile.examMinutes = U.clamp(Number(el.querySelector('#g-exam-min').value) || 1, 1, 300);
        });
        U.toast('学习目标已保存', 'ok');
      };
      /* 备份 */
      el.querySelector('#bk-export').onclick = function () {
        if (State.exportFile()) { State.log('backup', '导出 JSON 备份', '#/settings'); U.toast('备份文件已下载', 'ok'); }
        else U.toast('导出失败，请检查浏览器下载权限', 'err');
      };
      filePicker('bk-file', 'bk-text');
      el.querySelector('#bk-clear-text').onclick = function () { el.querySelector('#bk-text').value = ''; el.querySelector('#bk-file').value = ''; };
      el.querySelector('#bk-restore').onclick = function () {
        var txt = el.querySelector('#bk-text').value.trim();
        if (!txt) { U.toast('请先选择备份文件或粘贴 JSON', 'err'); return; }
        var mode = el.querySelector('input[name="bk-mode"]:checked').value;
        U.confirmBox({ title: '确认恢复备份？', okText: '确认恢复', danger: mode === 'replace',
          message: mode === 'replace' ? '当前所有学习数据将被备份文件覆盖，无法撤销。' : '将合并备份中本机缺少的记录，现有记录保持不变。' })
          .then(function (ok) {
            if (!ok) return;
            var r = State.restore(txt, mode);
            if (!r.ok) { U.toast('恢复失败：' + r.error, 'err'); return; }
            U.toast('恢复成功，正在刷新…', 'ok');
            setTimeout(function () { App.go('/home'); App.refresh(); }, 350);
          });
      };
      /* 导入 */
      U.qsa('[data-tpl]', el).forEach(function (b) {
        b.onclick = function () {
          var k = b.getAttribute('data-tpl');
          U.download('导入模板-' + k + '.json', JSON.stringify(TEMPLATES[k], null, 2));
          U.toast('模板已下载', 'ok');
        };
      });
      filePicker('im-file', 'im-text');
      el.querySelector('#im-clear-text').onclick = function () { el.querySelector('#im-text').value = ''; el.querySelector('#im-file').value = ''; };
      el.querySelector('#im-run').onclick = function () {
        var txt = el.querySelector('#im-text').value.trim(), box = el.querySelector('#im-result');
        if (!txt) { U.toast('请先选择文件或粘贴 JSON', 'err'); return; }
        var payload;
        try { payload = JSON.parse(txt); } catch (e) { box.innerHTML = '<div class="notice warn">JSON 格式错误：' + U.esc(e.message) + '</div>'; return; }
        var r = State.importBundle(payload);
        var a = r.added;
        box.innerHTML = '<div class="notice ' + (r.errors.length ? 'warn' : '') + '">' +
          (r.ok ? '✅ 导入完成：课程 ' + a.courses + ' · 题目 ' + a.questions + ' · 答案 ' + a.answers + ' · 公式 ' + a.formulas + ' · 例题解析 ' + a.examples : '⚠️ 部分内容未导入') +
          (r.errors.length ? '<br>问题：<br>' + r.errors.slice(0, 8).map(U.esc).join('<br>') : '') + '</div>';
        if (r.ok) { U.toast('导入成功', 'ok'); setTimeout(App.refresh, 900); }
      };
      el.querySelector('#im-clear').onclick = function () {
        U.confirmBox({ title: '清空导入内容', message: '将删除全部自行导入的课程、题目、答案、公式与例题解析；内置演示数据和学习记录不受影响。', okText: '确认清空', danger: true })
          .then(function (ok) { if (ok) { State.clearImported(); U.toast('已清空导入内容'); App.refresh(); } });
      };
      /* PWA */
      el.querySelector('#pwa-install').onclick = function () {
        if (!App.deferredPrompt) { U.toast('请用浏览器菜单「添加到主屏幕」'); return; }
        App.deferredPrompt.prompt();
        App.deferredPrompt.userChoice.then(function () { App.deferredPrompt = null; App.refresh(); });
      };
      /* 重置 */
      el.querySelector('#reset-all').onclick = function () {
        U.confirmBox({ title: '重置全部数据？', okText: '确认重置', danger: true,
          message: '这会清空所有学习进度、笔记、错题、收藏、复习计划、考试记录与导入内容，且无法撤销。强烈建议先导出 JSON 备份。' })
          .then(function (ok) {
            if (!ok) return;
            U.confirmBox({ title: '再次确认', okText: '我已备份，重置', danger: true, message: '真的要继续吗？此操作不可恢复。' })
              .then(function (ok2) {
                if (!ok2) return;
                State.reset(); U.toast('数据已重置', 'ok'); App.go('/home'); App.refresh();
              });
          });
      };
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
