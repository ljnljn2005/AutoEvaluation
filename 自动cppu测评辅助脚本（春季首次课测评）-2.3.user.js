// ==UserScript==
// @name         cppu 测评辅助（按题目匹配选项）
// @namespace    http://tampermonkey.net/
// @version      2.3
// @description  按题目和选项文本精确匹配，全部匹配后自动提交
// @author       ljnljn
// @match        *://*.cppu.edu.cn/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const SUBMIT_DELAY = 600;
  const AUTO_SUBMIT = true; // 仅在全部单选题唯一匹配成功后才会提交
  let isSubmitting = false;

  /*
   * 按真实情况配置：
   * question：题干中稳定存在的一段文字；answer：目标选项中稳定存在的一段文字。
   * 未配置的题目不会自动选择。
   */
  const RULES = [
    { question: '老师是否按时到课？', answer: '按时到课' },
    { question: '你对老师的上课方式是否适应？', answer: '适应' },
    { question: '老师是否向你讲清楚了本课程的考核方式、成绩构成、分值比例？', answer: '讲得很清楚' },
    { question: '老师是否在学在警大平台为你开通了本课程学习空间？', answer: '已经开通并进入' },
    { question: '你认为，学在警大平台上本课程学习资源是否丰富？', answer: '比较丰富' },
    { question: '老师是否在学在警大平台上传了本课程标准？', answer: '已经上传，我已经看过' },
    { question: '老师是否在学在警大平台上传了本课程教学总体设计方案？', answer: '已经上传，我已经看过' },
    { question: '老师是否向你告知了联系方式或课下交流方式？', answer: '已经告知，有问题能联系到老师' },
    { question: '坚持马克思主义基本观点', answer: '做的非常好' },
    { question: '课程思政的方法是否得当', answer: '课程思政恰到好处' },
    { question: '自主训练等提供了丰富高质的辅助学习资源', answer: '学习、训练资源数量丰富、质量高' },
    { question: '提供了丰富高质的辅助学习资源', answer: '学习资源数量丰富、质量高' },
    { question: '学习资源利用情况', answer: '利用率高' },
    { question: '学习、训练资源利用情况', answer: '利用率高' },
    { question: '人才培养中的定位以及本门课程的教学目标', answer: '讲得很清楚，我十分理解' },
    { question: '本课程开设的必要性', answer: '非常必要' },
    { question: '教学内容科学性、严谨性', answer: '教学内容正确，十分科学严谨' },
    { question: '教学内容难度', answer: '有一定难度，对我一定挑战，但我能接受' },
    { question: '体现学科前沿和行业发展动态', answer: '紧跟学科前沿和行业发展动态' },
    { question: '课程内容有实用性吗', answer: '内容针对性强、实用性强' },
    { question: '课程在本专业中的性质、地位和课程教学目标', answer: '讲得很清楚' },
    { question: '考核形式、成绩构成、分值比例', answer: '讲得很清楚' },
    { question: '各考核环节的评分标准', answer: '详细说明或已经提供，非常清楚具体' },
    { question: '警容风纪如何', answer: '老师着装规范，警容严整，举止谈吐文明' },
    { question: '实训装备器材等领取完毕', answer: '一般在课前就准备完毕，不占上课时间' },
    { question: '个人防护装备都进行安全检查', answer: '设备设施完好，每次课前老师都对我个人防护装备进行全面检查' },
    { question: '是否对你开展了安全教育', answer: '安全措施、安全操作规程、安全注意事项等讲得很清楚' },
    { question: '是否督导安全措施落实到位', answer: '严格督导' },
    { question: '是否全程在岗在位，认真履职', answer: '老师全程在岗在位，认真履职' },
    { question: '训练分组是否科学合理', answer: '分组科学合理，教学训练效率高' },
    { question: '训练标准严格、讲解示范、组织规范、指导耐心', answer: '老师能做到全程训练标准严格、讲解示范、组织规范、指导耐心' },
    { question: '教学主要采用什么教学方法', answer: '研究型、项目式学习在课程教学中所占比重较大' },
    { question: '引入除教材之外', answer: '引入的比较多' },
    { question: '课后给你布置', answer: '基本每次课后都布置' },
    { question: '完成老师布置的课后学习任务', answer: '每次花费1-2小时' },
    { question: '完成老师布置的课后学习或训练任务', answer: '每次花费1-2小时' },
    { question: '查阅除教材以外', answer: '经常需要查阅' },
    { question: '作业的批改情况', answer: '80%以上的作业都进行了批改' },
    { question: '作业的讲评情况', answer: '经常进行讲评' },
    { question: '学习或训练任务落实检查或讲评情况', answer: '80%以上的学习或训练任务落实情况进行检查或讲评' },
    { question: '课后辅导答疑或研讨交流', answer: '经常与学生开展' },
    { question: '老师是否及时进行了解答', answer: '都能够及时解答' },
    { question: '学业要求是否严格', answer: '学业要求非常严格' },
    { question: '课堂教学管理是否严格', answer: '管理非常严格，课堂教学秩序非常好' },
    // 第 25 题请按实际征求意见的次数修改或删除。
    { question: '面向学生征求过意见建议', answer: '在课程结束后进行过1次，我认为调查的内容针对性比较强' },
    { question: '通过本门课程学习，你的收获', answer: '收获非常大' }
  ];

  // 归一化：去空白，去中英文标点（含顿号、冒号、破折号），保证两侧口径一致
  const normalize = (text) => (text || '')
    .replace(/\s+/g, '')
    .replace(/[；;，,。！？!?（）()、：:.·\-—_－—]/g, '')
    .trim();

  /*
   * 题干匹配：取"最长命中"的那条规则。
   * 原来按数组顺序 find，一旦短规则排在长规则前面就会抢走题目；
   * 改成最长优先后，RULES 的顺序不再影响结果。
   */
  function findRule(questionText) {
    let best = null;
    let bestLength = 0;

    for (const rule of RULES) {
      const key = normalize(rule.question);
      if (!key || !questionText.includes(key)) continue;
      if (key.length > bestLength) {
        best = rule;
        bestLength = key.length;
      }
    }

    return best;
  }

  /*
   * 选项匹配：三级降级，避免 "适应" 命中 "不太适应 / 非常不适应"。
   *   ① 完全相等 —— 最可靠，直接消歧
   *   ② 唯一包含 —— 用于 answer 只是选项一部分的长文本
   *   ③ 最短包含 —— 多个包含时取最短的那项（长的选项通常是把短选项包了进去）
   */
  function pickOption(radios, answer) {
    const target = normalize(answer);
    if (!target) return [];

    // ① 完全相等
    const exact = radios.filter((radio) => normalize(radio.innerText) === target);
    if (exact.length) return exact;

    // ② 包含匹配
    const hits = radios.filter((radio) => normalize(radio.innerText).includes(target));
    if (hits.length <= 1) return hits;

    // ③ 剔除"被更短命中项包住"的长选项
    const minimal = hits.filter((radio) => {
      const self = normalize(radio.innerText);
      return !hits.some((other) => {
        if (other === radio) return false;
        const text = normalize(other.innerText);
        return self.includes(text) && self !== text;
      });
    });

    return minimal.length ? minimal : hits;
  }

  window.addEventListener('load', () => setTimeout(checkCurrentPage, 1000));
  window.addEventListener('message', (event) => {
    let sourceHost = '';
    try {
      sourceHost = new URL(event.origin).hostname;
    } catch (e) {
      return;
    }
    if (!sourceHost.endsWith('.cppu.edu.cn') || event.data?.type !== 'cppu-survey-ready') return;
    if (!AUTO_SUBMIT || !event.data.complete || isSubmitting) return;

    const submitButton = document.querySelector('.layui-layer-btn0');
    if (!submitButton) return;
    isSubmitting = true;
    console.log(`问卷已完整匹配（${event.data.selected} 题），正在提交。`);
    setTimeout(() => submitButton.click(), SUBMIT_DELAY);
  });

  function checkCurrentPage() {
    if (location.href.includes('cpTaskDetail/tbList')) autoProcessList();
    else if (location.href.includes('survey/index.html')) fillSurvey();
  }

  function autoProcessList() {
    const rows = document.querySelectorAll('#contentTable tbody tr');

    for (const row of rows) {
      if (!row.innerText.includes('否')) continue;
      const fillBtn = [...row.querySelectorAll('a')].find((a) => a.innerText.includes('填报'));
      if (!fillBtn) continue;

      console.log('发现未填报任务，打开问卷。');
      fillBtn.click();

      return;
    }

    console.log('当前列表没有未填报任务。');
  }

  function fillSurvey() {
    const questions = document.querySelectorAll('.el-form-item.answer');
    if (!questions.length) {
      setTimeout(fillSurvey, 500);
      return;
    }

    let selected = 0;
    const skipped = [];

    questions.forEach((item) => {
      const titleElement = item.querySelector('.el-form-item__label');
      const rawTitle = titleElement?.innerText?.trim() || '';
      const questionText = normalize(rawTitle);
      const radios = [...item.querySelectorAll('label.el-radio')];
      if (!radios.length) return; // 文本题不自动填写

      const rule = findRule(questionText);
      if (!rule) {
        skipped.push(`${rawTitle}（未配置规则）`);
        item.style.outline = '3px solid #e6a23c';
        return;
      }

      const matched = pickOption(radios, rule.answer);
      if (matched.length !== 1) {
        const candidates = matched.map((r) => normalize(r.innerText)).slice(0, 4).join(' / ');
        skipped.push(`${rawTitle}（选项匹配到 ${matched.length} 项：${candidates || '无'}）`);
        item.style.outline = '3px solid #f56c6c';
        return;
      }

      const radio = matched[0];
      const input = radio.querySelector('input[type="radio"]');
      if (!input?.checked) {
        radio.click();
        if (input && !input.checked) input.click(); // 兜底：某些版本只响应原生 input
      }

      item.style.outline = '3px solid #67c23a';
      selected++;
      console.log(`已选择：${rawTitle} → ${radio.innerText.trim()}`);
    });

    console.log(`完成：自动选择 ${selected} 题；待人工核对 ${skipped.length} 题。`);
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'cppu-survey-ready',
        selected,
        complete: skipped.length === 0
      }, '*');
    }
    if (skipped.length) {
      console.warn('未自动选择的题目：', skipped);
      alert(`已自动选择 ${selected} 题，仍有 ${skipped.length} 题需核对。\n橙框：未配置；红框：匹配异常。`);
    }
  }
})();
