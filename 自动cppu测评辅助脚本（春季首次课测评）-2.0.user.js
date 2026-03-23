// ==UserScript==
// @name         自动cppu测评辅助脚本（春季首次课测评）
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  全自动批量完成测评问卷（识别Element Plus表单并利用LayUI进行外部提交）
// @author       ljnljn
// @match        *://*.cppu.edu.cn/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 延迟时间（毫秒），可根据网络情况适当调大
    const LIST_DELAY = 1500;
    const WAIT_FILL_DELAY = 2500; // 点开弹窗后，等待子页面填完多少毫秒后点击“提交”

    window.addEventListener('load', () => {
        setTimeout(checkCurrentPage, 1000);
    });

    function checkCurrentPage() {
        const currentUrl = window.location.href;

        // ==========================================
        // 场景 1：当前在“任务列表”父级页面
        // ==========================================
        if (currentUrl.includes('cpTaskDetail/tbList')) {
            console.log('✅ 检测到处于测评列表页，开始自动化...');
            autoProcessList();
        }

        // ==========================================
        // 场景 2：当前在“问卷填报”子级 iframe 页面
        // ==========================================
        else if (currentUrl.includes('survey/index.html')) {
            console.log('✅ 检测到处于问卷页，开始自动答题...');
            fillSurvey();
        }
    }

    // 列表页处理逻辑
    function autoProcessList() {
        const rows = document.querySelectorAll('#contentTable tbody tr');
        let foundUnfinished = false;

        for (let row of rows) {
            // 如果还未答题
            if (row.innerText.includes('否')) {
                const fillBtn = row.querySelector('a');
                if (fillBtn && fillBtn.innerText.includes('填报')) {
                    console.log('👉 发现未填报任务，正在点击填报...');
                    fillBtn.click();
                    foundUnfinished = true;

                    // 点击填报后，会弹出一个 iframe 弹窗。
                    // 脚本会在那个 iframe 实例里单独运行填表逻辑。
                    // 因此这里父页面只需要等待几秒钟（确保子页面填完），然后找底部的“提交”按钮按下去就行。
                    setTimeout(() => {
                        // 根据您前面提供的 layui 弹窗特征，提交按钮通常是 .layui-layer-btn0
                        const submitButton = document.querySelector('.layui-layer-btn0');
                        if (submitButton) {
                            console.log('👉 正在替您点击提交按钮...');
                            submitButton.click();
                            // 提交后页面一般会自动刷新，刷新后代码重新起效，进入下一个未答任务循环。
                        } else {
                            console.log('❌ 未找到弹窗的提交按钮！');
                        }
                    }, WAIT_FILL_DELAY);

                    break; // 每次只处理1个！不要并发打开一堆弹窗。
                }
            }
        }

        if (!foundUnfinished) {
            console.log('🎉🎉🎉 太棒了，当前列表所有的测评都已经完成！ 🎉🎉🎉');
        }
    }

    // 问卷 iframe 答题逻辑
    function fillSurvey() {
        // 第一步：获取所有的题目行组件 (Element Plus 的 el-form-item)
        const questions = document.querySelectorAll('.el-form-item');

        if(questions.length === 0) {
            // 如果还没渲染出来，等500ms重试
            setTimeout(fillSurvey, 500);
            return;
        }

        // 第二步：循环所有题目，点击第一个选项（统一好评）
        questions.forEach((q, index) => {
            // 取所有的单选按钮对应的 label
            const radios = q.querySelectorAll('label.el-radio');
            if(radios && radios.length > 0) {
                // 默认选第一项
                radios[0].click();
                console.log(`已将第 ${index + 1} 题设为：${radios[0].innerText}`);
            }
        });

        // 附加功能：防止问卷底部有“主观文字建议”的 textarea 组件，如果有顺便也填了！
        const textareas = document.querySelectorAll('textarea');
        textareas.forEach(ta => {
            ta.value = "老师教学态度极好，内容充实，非常满意！";
            // 触发 Vue 的双向数据绑定更新（不触发可能会导致为空无法提交）
            ta.dispatchEvent(new Event('input', { bubbles: true }));
        });

        console.log('✅ 子页面选项已全部自动填写！');
    }

})();