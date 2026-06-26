(function () {
    'use strict';

    const HEALTH_ASSESSMENT_API_ENDPOINT = '/api/submit-health-assessment';
    const CONSENT_VERSION = '2026-06-23-v1';
    const CONTACT_CONSENT_VERSION = '2026-06-25-v1';
    const EXCLUSIVE_OPTIONS = new Set(['none', 'good']);
    const MAX_Q05_SELECTIONS = 3;

    const questions = [
        {
            id: 'q01',
            category: '家族史與預防需求',
            type: 'single',
            title: '您的年齡區間？',
            scoring: false,
            options: [
                { id: 'under29', label: '29 歲以下', score: 0 },
                { id: '30to39', label: '30～39 歲', score: 0 },
                { id: '40to49', label: '40～49 歲', score: 0 },
                { id: '50to59', label: '50～59 歲', score: 0 },
                { id: 'over60', label: '60 歲以上', score: 0 }
            ]
        },
        {
            id: 'q02',
            category: '整體健康狀態',
            type: 'single',
            title: '您如何看待自己目前的整體健康狀態？',
            options: [
                { id: 'good', label: '良好', score: 0 },
                { id: 'stable', label: '大致穩定', score: 1 },
                { id: 'improve', label: '有些問題想改善', score: 2 },
                { id: 'worry', label: '已有狀況影響生活或令我擔心', score: 3 }
            ]
        },
        {
            id: 'q03',
            category: '健檢與追蹤',
            type: 'single',
            title: '最近一次健康檢查是什麼時候？',
            options: [
                { id: 'within1y', label: '一年內', score: 0 },
                { id: 'within2y', label: '1～2 年內', score: 1 },
                { id: 'over2y', label: '超過 2 年', score: 2 },
                { id: 'never', label: '從未做過或不確定', score: 3 }
            ]
        },
        {
            id: 'q04',
            category: '健檢與追蹤',
            type: 'single',
            title: '最近的健檢結果是否有需要追蹤的項目？',
            options: [
                { id: 'none', label: '沒有', score: 0 },
                { id: 'done', label: '有，但已完成追蹤', score: 1 },
                { id: 'unclear', label: '不清楚報告內容', score: 2 },
                { id: 'pending', label: '曾被建議追蹤但尚未完成', score: 3 }
            ]
        },
        {
            id: 'q05',
            category: '健康關注',
            type: 'multi',
            title: '目前最關注哪些健康問題？',
            hint: '可複選，最多 3 項。「無特別關注」會排除其他選項。',
            maxSelections: MAX_Q05_SELECTIONS,
            options: [
                { id: 'none', label: '無特別關注', score: 0, exclusive: true },
                { id: 'metabolic', label: '體重、血糖、血脂等代謝問題', score: 1, facet: '生活與代謝' },
                { id: 'cardio', label: '血壓、心血管或循環問題', score: 1, facet: '生活與代謝' },
                { id: 'digestive', label: '肝腎、腸胃或消化問題', score: 1, facet: '健檢與追蹤' },
                { id: 'sleepFatigue', label: '睡眠、疲勞或精神狀況', score: 1, facet: '睡眠與壓力' },
                { id: 'stress', label: '壓力、情緒或心理健康', score: 1, facet: '睡眠與壓力' },
                { id: 'familyPrevention', label: '家族病史、癌症預防或健檢規劃', score: 1, facet: '家族史與預防需求' },
                { id: 'other', label: '其他健康問題', score: 1, facet: '健康關注' }
            ],
            scoreCap: 3
        },
        {
            id: 'q06',
            category: '健檢與追蹤',
            type: 'single',
            title: '是否有醫師建議持續管理或追蹤的健康狀況？',
            options: [
                { id: 'none', label: '沒有', score: 0 },
                { id: 'stable', label: '有一項，且穩定追蹤', score: 1 },
                { id: 'pending', label: '有一項，尚待追蹤', score: 2 },
                { id: 'multiple', label: '有多項，或未規律追蹤', score: 3 }
            ]
        },
        {
            id: 'q07',
            category: '家族史與預防需求',
            type: 'single',
            title: '家族中是否有需要特別留意的健康病史？',
            options: [
                { id: 'none', label: '沒有已知病史', score: 0 },
                { id: 'unknown', label: '不清楚', score: 1 },
                { id: 'one', label: '近親有一項重要病史', score: 2 },
                { id: 'multiple', label: '多位近親有相似病史或較早發病', score: 3 }
            ]
        },
        {
            id: 'q08',
            category: '睡眠與壓力',
            type: 'single',
            title: '最近一個月的睡眠與疲勞情況？',
            options: [
                { id: 'good', label: '大致良好', score: 0 },
                { id: 'sometimes', label: '偶爾睡不好或疲倦', score: 1 },
                { id: 'often', label: '經常影響白天精神', score: 2 },
                { id: 'daily', label: '幾乎每天影響生活', score: 3 }
            ]
        },
        {
            id: 'q09',
            category: '睡眠與壓力',
            type: 'single',
            title: '最近一個月的壓力或情緒狀況？',
            options: [
                { id: 'normal', label: '可正常調適', score: 0 },
                { id: 'sometimes', label: '偶爾感到壓力', score: 1 },
                { id: 'often', label: '經常影響睡眠或情緒', score: 2 },
                { id: 'daily', label: '已明顯影響日常生活', score: 3 }
            ]
        },
        {
            id: 'q10',
            category: '生活與代謝',
            type: 'single',
            title: '您目前的運動與日常活動量？',
            options: [
                { id: 'regular', label: '規律活動', score: 0 },
                { id: 'notEnough', label: '活動量稍嫌不足', score: 1 },
                { id: 'rarely', label: '很少運動', score: 2 },
                { id: 'sedentary', label: '長期缺乏運動或久坐', score: 3 }
            ]
        },
        {
            id: 'q11',
            category: '生活與代謝',
            type: 'multi',
            title: '目前有哪些生活習慣值得改善？',
            hint: '可複選。「目前大致良好」會排除其他選項，合計最高 3 分。',
            options: [
                { id: 'good', label: '目前大致良好', score: 0, exclusive: true },
                { id: 'diet', label: '飲食不均衡或經常外食', score: 1 },
                { id: 'sugarSalt', label: '常喝含糖飲料、常吃高油高鹽食物', score: 1 },
                { id: 'lateMeal', label: '用餐時間不規律或經常吃宵夜', score: 1 },
                { id: 'smoking', label: '目前有吸菸或使用菸品', score: 3 },
                { id: 'alcohol', label: '飲酒較頻繁或飲酒量較多', score: 2 }
            ],
            scoreCap: 3
        },
        {
            id: 'q12',
            category: '諮詢意願',
            type: 'single',
            title: '完成評估後，希望獲得哪一種協助？',
            scoring: false,
            options: [
                { id: 'resultOnly', label: '只看結果', score: 0, intent: '低' },
                { id: 'healthInfo', label: '接收健康資訊', score: 0, intent: '中低' },
                { id: 'personalAdvice', label: '取得個人化建議', score: 0, intent: '中高' },
                { id: 'consultation', label: '安排健康諮詢或健檢規劃', score: 0, intent: '高' }
            ]
        }
    ];

    const resultCopy = {
        L1: {
            label: 'L1 一般健康關注',
            title: '目前狀態大致穩定，適合開始建立自己的健康基準',
            summary: '從您的回答來看，目前沒有明顯需要立即處理的健康警訊。不過，健康管理最有價值的時機，通常不是等到身體出現明顯不適，而是在狀態還算穩定時，先建立自己的健康基準，了解哪些指標值得持續觀察。',
            detail: '許多人在忙碌生活中，只有在不舒服或健檢紅字出現時才開始關心健康。但真正有效的健康管理，是把健康狀態變成可以被理解、被追蹤、被調整的資訊。若您近期已有健檢資料，建議可以先整理報告中的關鍵數字；若距離上次健檢已有一段時間，也可以開始規劃下一次檢查，讓未來的健康決策更有依據。',
            nextStep: '您可以先接收健康資訊，了解健檢報告怎麼看、哪些生活習慣最值得優先調整，以及如何建立自己的年度健康追蹤節奏。',
            primaryCta: '取得個人化健康建議',
            secondaryCta: '先看看健康資訊'
        },
        L2: {
            label: 'L2 建議持續關注',
            title: '有幾個健康訊號值得持續關注，建議先整理方向',
            summary: '您的回答顯示，目前可能已有一些健康狀況、生活習慣或健檢資訊值得進一步整理。這不代表您已經有疾病問題，但代表現在很適合開始把健康狀態看清楚，避免小問題長期累積。',
            detail: '健康風險通常不是突然出現，而是由生活型態、壓力、睡眠、代謝狀態與健檢指標逐步累積而來。若能在這個階段先釐清主要關注方向，通常比日後處理複雜問題更有效。建議您先從目前最在意的 1～2 個面向開始，例如健檢追蹤、睡眠疲勞、壓力調適、體重血糖血脂管理，或家族病史相關的預防規劃。',
            nextStep: '您可以取得一份依本次回答整理的健康建議，協助您知道應該先看哪些資料、先問哪些問題，以及是否需要安排進一步諮詢。',
            primaryCta: '取得個人化健康建議',
            secondaryCta: '先看看健康資訊'
        },
        L3: {
            label: 'L3 建議預約健康諮詢',
            title: '建議安排健康諮詢，先釐清目前最需要處理的順序',
            summary: '您的回答顯示，目前已有多個健康面向值得進一步了解，例如健檢追蹤、生活習慣、睡眠壓力或家族病史等。這不代表可以直接判斷疾病，但代表您可能需要有人協助整理資訊，找出最應該優先處理的方向。',
            detail: '很多人在健康管理上遇到的問題，不是不重視健康，而是不知道該從哪裡開始。健檢報告可能有許多數字，生活習慣也可能有多個需要調整的地方；若全部同時處理，反而容易失去方向。健康諮詢的價值，是協助您把目前的健康資訊整理成可執行的下一步，判斷哪些項目需要先追蹤、哪些可以先從生活調整開始，哪些則適合安排更完整的健檢或專業評估。',
            nextStep: '建議您安排一次健康諮詢，由元馨醫管家協助您整理目前狀況、健檢資料與後續規劃方向。',
            primaryCta: '預約健康諮詢',
            secondaryCta: '先看看健康資訊'
        },
        L4: {
            label: 'L4 建議優先健康諮詢',
            title: '建議優先安排健康諮詢，協助您盡快整理關鍵健康資訊',
            summary: '您的回答顯示，目前可能已有較明顯的健康關注或尚未完成的追蹤事項。這不代表本評估可以判斷疾病，但代表您不適合只停留在一般健康資訊階段，建議優先把相關資料整理清楚，必要時安排進一步檢查或專業協助。',
            detail: '當健檢追蹤、睡眠疲勞、壓力、生活習慣或既有健康狀況同時出現時，最重要的不是先擔心，而是先建立清楚的處理順序。哪些項目需要補充資料？哪些健檢結果需要回頭確認？哪些生活習慣調整最值得先做？哪些情況應該盡快尋求醫療或專業協助？這些都需要有系統地整理，而不是靠零散資訊自行判斷。',
            nextStep: '建議您優先安排健康諮詢，由元馨醫管家依本次評估結果協助整理健康關注重點，並視需要提供健檢規劃或後續專業諮詢建議。',
            primaryCta: '安排優先健康諮詢',
            secondaryCta: '先看看健康資訊'
        }
    };

    const sourceContext = readSourceContext();
    const state = {
        currentIndex: 0,
        answers: {},
        result: null,
        sourceContext,
        assessmentConsentAt: '',
        healthAdviceConsentAt: '',
        contact: {
            userName: '',
            phone: '',
            email: '',
            allowLineMessages: false,
            allowPhoneContact: false,
            allowMarketingMessages: false
        },
        submission: {
            inFlight: false,
            submitted: false,
            assessmentId: ''
        }
    };

    const els = {};

    document.addEventListener('DOMContentLoaded', init);

    function init() {
        cacheElements();
        bindEvents();
        renderQuestion();
    }

    function cacheElements() {
        [
            'startScreen',
            'questionScreen',
            'resultScreen',
            'mockCompleteScreen',
            'consentCheckbox',
            'startButton',
            'questionCounter',
            'questionTypeLabel',
            'progressBar',
            'questionTitle',
            'questionHint',
            'optionsList',
            'validationMessage',
            'prevButton',
            'nextButton',
            'resultLevel',
            'resultTitle',
            'resultSummary',
            'focusAreas',
            'resultDetail',
            'resultNextStep',
            'primaryCtaButton',
            'secondaryCtaButton',
            'restartButton',
            'ctaModal',
            'ctaIntroStep',
            'ctaContactStep',
            'modalCancelButton',
            'modalContinueButton',
            'contactName',
            'contactNameError',
            'contactPhone',
            'contactPhoneError',
            'contactEmail',
            'contactEmailError',
            'allowLineMessages',
            'allowPhoneContact',
            'allowMarketingMessages',
            'contactFormStatus',
            'contactBackButton',
            'contactSubmitButton',
            'mockCompleteTitle',
            'mockCompleteText',
            'backToResultButton'
        ].forEach(id => {
            els[id] = document.getElementById(id);
        });

    }

    function bindEvents() {
        els.consentCheckbox.addEventListener('change', () => {
            els.startButton.disabled = !els.consentCheckbox.checked;
        });
        els.startButton.addEventListener('click', startAssessment);
        els.prevButton.addEventListener('click', goPrev);
        els.nextButton.addEventListener('click', goNext);
        els.primaryCtaButton.addEventListener('click', openModal);
        els.secondaryCtaButton.addEventListener('click', showSecondaryMock);
        els.restartButton.addEventListener('click', restart);
        els.modalCancelButton.addEventListener('click', closeModal);
        els.modalContinueButton.addEventListener('click', showContactStep);
        els.contactBackButton.addEventListener('click', showIntroStep);
        els.contactSubmitButton.addEventListener('click', submitPrimaryCta);
        els.contactName.addEventListener('input', syncContactState);
        els.contactPhone.addEventListener('input', syncContactState);
        els.contactEmail.addEventListener('input', syncContactState);
        els.allowLineMessages.addEventListener('change', syncContactState);
        els.allowPhoneContact.addEventListener('change', syncContactState);
        els.allowMarketingMessages.addEventListener('change', syncContactState);
        els.backToResultButton.addEventListener('click', () => showScreen('result'));
    }

    function startAssessment() {
        if (!els.consentCheckbox.checked) {
            return;
        }

        state.assessmentConsentAt = new Date().toISOString();
        showScreen('question');
    }

    function readSourceContext() {
        const params = new URLSearchParams(window.location.search);
        const pageUrl = stripHash(window.location.href);

        return {
            entryType: inferEntryType(params),
            referralCode: normalizeReferralCode(params.get('ref')),
            crmInternalTestRequested: isCrmInternalTestMode(params),
            utmSource: params.get('utm_source') || '',
            utmMedium: params.get('utm_medium') || '',
            utmCampaign: params.get('utm_campaign') || '',
            eventCode: params.get('event_code') || '',
            campaignCode: params.get('campaign_code') || '',
            portal: params.get('portal') || '',
            source: params.get('source') || '',
            pageUrl,
            referrer: stripHash(document.referrer || '')
        };
    }

    function inferEntryType(params) {
        const portal = params.get('portal') || '';
        const source = params.get('source') || '';
        const ref = params.get('ref') || '';

        if (portal === 'consultant' || ref) {
            return 'consultant_referral';
        }

        if (source === 'line' || source === 'official_line') {
            return 'official_line';
        }

        if (params.get('utm_source') || params.get('campaign_code') || params.get('event_code')) {
            return 'campaign';
        }

        return 'external_anonymous';
    }

    function isCrmInternalTestMode(params) {
        const mode = params.get('mode') || '';
        const crmTest = params.get('crm_test') || '';

        return mode === 'crm_internal_test' || crmTest === '1';
    }

    function stripHash(value) {
        return String(value || '').split('#')[0];
    }

    function normalizeReferralCode(value) {
        return String(value || '').trim().toUpperCase();
    }

    function showScreen(screenName) {
        els.startScreen.classList.toggle('hidden', screenName !== 'start');
        els.questionScreen.classList.toggle('hidden', screenName !== 'question');
        els.resultScreen.classList.toggle('hidden', screenName !== 'result');
        els.mockCompleteScreen.classList.toggle('hidden', screenName !== 'mock');
        window.scrollTo(0, 0);
    }

    function renderQuestion() {
        const question = questions[state.currentIndex];
        const answer = state.answers[question.id] || [];
        const isMulti = question.type === 'multi';
        const progress = ((state.currentIndex + 1) / questions.length) * 100;

        els.questionCounter.textContent = `${state.currentIndex + 1} / ${questions.length}`;
        els.questionTypeLabel.textContent = isMulti ? '多選' : '單選';
        els.progressBar.style.width = `${progress}%`;
        els.questionTitle.textContent = question.title;
        els.questionHint.textContent = question.hint || '';
        els.questionHint.classList.toggle('hidden', !question.hint);
        els.prevButton.disabled = state.currentIndex === 0;
        els.prevButton.classList.toggle('opacity-50', state.currentIndex === 0);
        els.nextButton.textContent = state.currentIndex === questions.length - 1 ? '查看結果' : '下一題';
        els.validationMessage.classList.add('hidden');
        els.validationMessage.textContent = '';

        els.optionsList.replaceChildren();
        question.options.forEach(option => {
            const button = document.createElement('button');
            const selected = answer.includes(option.id);
            button.type = 'button';
            button.className = [
                'yx-choice',
                'w-full',
                'rounded-xl',
                'px-4',
                'py-3',
                'text-left',
                'text-sm',
                'font-bold',
                'leading-6',
                'text-[#173F3A]',
                selected ? 'is-selected' : ''
            ].filter(Boolean).join(' ');
            button.textContent = option.label;
            button.setAttribute('aria-pressed', selected ? 'true' : 'false');
            button.addEventListener('click', () => selectOption(question, option));
            els.optionsList.appendChild(button);
        });
    }

    function selectOption(question, option) {
        const current = state.answers[question.id] || [];

        if (question.type === 'single') {
            state.answers[question.id] = [option.id];
            renderQuestion();
            return;
        }

        let next = current.slice();
        const isExclusive = option.exclusive || EXCLUSIVE_OPTIONS.has(option.id);

        if (isExclusive) {
            next = current.includes(option.id) ? [] : [option.id];
        } else {
            next = next.filter(id => !isExclusiveOption(question, id));
            if (next.includes(option.id)) {
                next = next.filter(id => id !== option.id);
            } else {
                const limit = question.maxSelections || Number.POSITIVE_INFINITY;
                if (next.length >= limit) {
                    showValidation(`本題最多選 ${limit} 項。`);
                    return;
                }
                next.push(option.id);
            }
        }

        state.answers[question.id] = next;
        renderQuestion();
    }

    function isExclusiveOption(question, optionId) {
        const option = question.options.find(item => item.id === optionId);
        return Boolean(option && (option.exclusive || EXCLUSIVE_OPTIONS.has(option.id)));
    }

    function goPrev() {
        if (state.currentIndex === 0) {
            return;
        }
        state.currentIndex -= 1;
        renderQuestion();
    }

    function goNext() {
        const question = questions[state.currentIndex];
        const answer = state.answers[question.id] || [];

        if (answer.length === 0) {
            showValidation('請先選擇一個答案。');
            return;
        }

        if (state.currentIndex < questions.length - 1) {
            state.currentIndex += 1;
            renderQuestion();
            return;
        }

        state.result = calculateResult();
        renderResult();
        showScreen('result');
    }

    function showValidation(message) {
        els.validationMessage.textContent = message;
        els.validationMessage.classList.remove('hidden');
    }

    function calculateResult() {
        const questionScores = {};
        let total = 0;

        questions.forEach(question => {
            const score = getQuestionScore(question);
            questionScores[question.id] = score;

            if (question.scoring !== false) {
                total += score;
            }
        });

        let level = getBaseLevel(total);

        if (questionScores.q04 === 3 && questionScores.q06 === 3) {
            level = maxLevel(level, 'L4');
        } else if (questionScores.q04 === 3 || questionScores.q06 === 3) {
            level = maxLevel(level, 'L3');
        }

        if (questionScores.q08 === 3 || questionScores.q09 === 3) {
            level = maxLevel(level, 'L3');
        }

        return {
            total,
            level,
            questionScores,
            consultationIntent: getConsultationIntent(),
            focusAreas: getTopFocusAreas(questionScores)
        };
    }

    function getQuestionScore(question) {
        const answer = state.answers[question.id] || [];
        const selectedOptions = question.options.filter(option => answer.includes(option.id));
        const rawScore = selectedOptions.reduce((sum, option) => sum + Number(option.score || 0), 0);

        if (typeof question.scoreCap === 'number') {
            return Math.min(rawScore, question.scoreCap);
        }

        return rawScore;
    }

    function getBaseLevel(total) {
        if (total >= 22) return 'L4';
        if (total >= 15) return 'L3';
        if (total >= 8) return 'L2';
        return 'L1';
    }

    function maxLevel(current, candidate) {
        const rank = { L1: 1, L2: 2, L3: 3, L4: 4 };
        return rank[candidate] > rank[current] ? candidate : current;
    }

    function getConsultationIntent() {
        const q12 = questions.find(question => question.id === 'q12');
        const answer = state.answers.q12 || [];
        const option = q12.options.find(item => item.id === answer[0]);
        return option ? option.intent : '';
    }

    function getTopFocusAreas(questionScores) {
        const areas = {
            '健檢與追蹤': questionScores.q03 + questionScores.q04 + questionScores.q06,
            '生活與代謝': questionScores.q10 + questionScores.q11,
            '睡眠與壓力': questionScores.q08 + questionScores.q09,
            '家族史與預防需求': questionScores.q07
        };

        addQ05FacetScores(areas);

        return Object.entries(areas)
            .sort((left, right) => right[1] - left[1])
            .filter(([, score]) => score > 0)
            .slice(0, 3)
            .map(([name, score]) => ({ name, score }));
    }

    function addQ05FacetScores(areas) {
        const q05 = questions.find(question => question.id === 'q05');
        const answer = state.answers.q05 || [];

        q05.options.forEach(option => {
            if (!answer.includes(option.id) || !option.facet) {
                return;
            }

            areas[option.facet] = (areas[option.facet] || 0) + 1;
        });
    }

    function renderResult() {
        const result = state.result;
        const copy = resultCopy[result.level];

        els.resultLevel.textContent = `${copy.label}｜總分 ${result.total} 分`;
        els.resultTitle.textContent = copy.title;
        els.resultSummary.textContent = copy.summary;
        els.resultDetail.textContent = copy.detail;
        els.resultNextStep.textContent = copy.nextStep;
        els.primaryCtaButton.textContent = copy.primaryCta;
        els.secondaryCtaButton.textContent = copy.secondaryCta;

        els.focusAreas.replaceChildren();
        const focusAreas = result.focusAreas.length > 0
            ? result.focusAreas
            : [{ name: '建立年度健康基準', score: 0 }];

        focusAreas.forEach(area => {
            const chip = document.createElement('span');
            chip.className = 'rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#176B5B]';
            chip.textContent = area.score > 0 ? `${area.name} ${area.score}` : area.name;
            els.focusAreas.appendChild(chip);
        });
    }

    function openModal() {
        resetModalState();
        showIntroStep();
        els.ctaModal.classList.remove('hidden');
        els.ctaModal.classList.add('flex');
    }

    function closeModal() {
        if (state.submission.inFlight) {
            return;
        }

        els.ctaModal.classList.add('hidden');
        els.ctaModal.classList.remove('flex');
    }

    function resetModalState() {
        syncContactInputsFromState();
        clearContactErrors();
        els.modalContinueButton.disabled = state.submission.submitted || state.submission.inFlight;
        els.modalCancelButton.disabled = state.submission.inFlight;
        els.contactBackButton.disabled = state.submission.inFlight;
        els.contactSubmitButton.disabled = state.submission.submitted || state.submission.inFlight;
        els.contactSubmitButton.textContent = state.submission.submitted ? '已完成測試送出' : '送出並取得建議';
    }

    function showIntroStep() {
        if (state.submission.inFlight) {
            return;
        }

        els.ctaIntroStep.classList.remove('hidden');
        els.ctaContactStep.classList.add('hidden');
    }

    function showContactStep() {
        if (state.submission.inFlight || state.submission.submitted) {
            return;
        }

        if (!state.healthAdviceConsentAt) {
            state.healthAdviceConsentAt = new Date().toISOString();
        }

        els.ctaIntroStep.classList.add('hidden');
        els.ctaContactStep.classList.remove('hidden');
        window.setTimeout(() => els.contactName.focus(), 0);
    }

    function syncContactState() {
        state.contact.userName = els.contactName.value;
        state.contact.phone = els.contactPhone.value;
        state.contact.email = els.contactEmail.value;
        state.contact.allowLineMessages = els.allowLineMessages.checked;
        state.contact.allowPhoneContact = els.allowPhoneContact.checked;
        state.contact.allowMarketingMessages = els.allowMarketingMessages.checked;
    }

    function syncContactInputsFromState() {
        els.contactName.value = state.contact.userName;
        els.contactPhone.value = state.contact.phone;
        els.contactEmail.value = state.contact.email;
        els.allowLineMessages.checked = state.contact.allowLineMessages;
        els.allowPhoneContact.checked = state.contact.allowPhoneContact;
        els.allowMarketingMessages.checked = state.contact.allowMarketingMessages;
    }

    function clearContactErrors() {
        [
            els.contactNameError,
            els.contactPhoneError,
            els.contactEmailError,
            els.contactFormStatus
        ].forEach(element => {
            element.textContent = '';
            element.classList.add('hidden');
        });
    }

    function setFieldError(element, message) {
        element.textContent = message;
        element.classList.remove('hidden');
    }

    function normalizePhone(value) {
        return String(value || '').replace(/\D/g, '');
    }

    function validateContactForm() {
        syncContactState();
        clearContactErrors();

        const userName = state.contact.userName.trim();
        const normalizedPhone = normalizePhone(state.contact.phone);
        const email = state.contact.email.trim();
        let valid = true;

        if (!userName) {
            setFieldError(els.contactNameError, '請填寫姓名。');
            valid = false;
        }

        if (!normalizedPhone) {
            setFieldError(els.contactPhoneError, '請填寫手機號碼。');
            valid = false;
        } else if (!/^09\d{8}$/.test(normalizedPhone)) {
            setFieldError(els.contactPhoneError, '請輸入09開頭的10位數台灣手機號碼。');
            valid = false;
        }

        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setFieldError(els.contactEmailError, '請輸入有效的電子信箱格式。');
            valid = false;
        }

        if (!valid) {
            return null;
        }

        state.contact.userName = userName;
        state.contact.phone = normalizedPhone;
        state.contact.email = email;
        syncContactInputsFromState();

        return {
            userName,
            phone: normalizedPhone,
            email
        };
    }

    async function submitPrimaryCta() {
        if (state.submission.inFlight || state.submission.submitted) {
            return;
        }

        if (!state.result) {
            showModalError('尚未完成評估，請先完成 12 題後再送出。');
            return;
        }

        const validatedContact = validateContactForm();

        if (!validatedContact) {
            return;
        }

        const contactConsentAt = new Date().toISOString();
        const payload = buildHealthAssessmentPayload(contactConsentAt, validatedContact);

        state.submission.inFlight = true;
        els.modalContinueButton.disabled = true;
        els.modalCancelButton.disabled = true;
        els.contactBackButton.disabled = true;
        els.contactSubmitButton.disabled = true;
        els.contactSubmitButton.textContent = '送出中...';
        els.contactFormStatus.textContent = '正在安全保存健康評估測試資料，請稍候。';
        els.contactFormStatus.classList.remove('hidden');

        try {
            const response = await fetch(HEALTH_ASSESSMENT_API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=utf-8'
                },
                body: JSON.stringify(payload)
            });

            const responseText = await response.text();
            let data = {};

            try {
                data = responseText ? JSON.parse(responseText) : {};
            } catch (parseError) {
                throw new Error('API 回傳內容不是有效 JSON。');
            }

            if (!response.ok || !['success', 'partial_success'].includes(data.status)) {
                throw new Error(data.message || data.error || `API 回傳失敗狀態：${response.status}`);
            }

            state.submission.submitted = true;
            state.submission.inFlight = false;
            state.submission.assessmentId = data.assessmentId || '';
            closeModal();
            showMockComplete(
                '健康評估測試資料已送出',
                `資料已以測試資料保存於健康評估紀錄，目前尚未建立或更新CRM名單。健康評估ID：${state.submission.assessmentId || '未回傳'}`
            );
            if (payload.isTestData === false) {
                showMockComplete(
                    'CRM 內部驗收資料已送出',
                    `此筆資料已以 CRM 內部小流量驗收模式送出。請依驗收 SOP 檢查 health_assessments 與 leads。健康評估ID：${state.submission.assessmentId || '未回傳'}`
                );
            }
        } catch (error) {
            state.submission.inFlight = false;
            els.modalContinueButton.disabled = false;
            els.modalCancelButton.disabled = false;
            els.contactBackButton.disabled = false;
            els.contactSubmitButton.disabled = false;
            els.contactSubmitButton.textContent = '重新送出';
            showContactFormError(`送出失敗：${error.message || '請稍後再試'}。作答與聯絡資料均已保留。`);
        }
    }

    function showContactFormError(message) {
        els.contactFormStatus.textContent = message;
        els.contactFormStatus.classList.remove('hidden');
    }

    function showSecondaryMock() {
        showMockComplete(
            '健康資訊功能準備中',
            '健康資訊入口將於後續版本正式串接，目前不會跳轉至其他服務。'
        );
    }

    function buildHealthAssessmentPayload(contactConsentAt, identity) {
        const copy = resultCopy[state.result.level];
        const focusAreaNames = state.result.focusAreas.map(area => area.name);
        const assessmentConsentAt = state.assessmentConsentAt || contactConsentAt;
        const healthAdviceConsentAt = state.healthAdviceConsentAt || contactConsentAt;
        const isInternalCrmTest = Boolean(state.sourceContext.crmInternalTestRequested);

        const payload = {
            action: 'submit_health_assessment',
            assessmentId: '',
            identity: {
                identityStatus: 'external_identified',
                lineUserId: '',
                lineDisplayName: '',
                lineIdentityVerified: false,
                userName: identity.userName,
                phone: identity.phone,
                email: identity.email
            },
            answers: buildAnswersPayload(),
            result: {
                score: state.result.total,
                level: state.result.level,
                resultCode: state.result.level,
                resultTitle: copy.title,
                primaryConcernAreas: focusAreaNames.slice(0, 2),
                secondaryConcernAreas: focusAreaNames.slice(2),
                mainHealthConcerns: focusAreaNames.join('、') || '建立年度健康基準',
                summary: copy.summary,
                followUpFocus: buildFollowUpFocus(focusAreaNames),
                priorityConsultationRecommended: ['L3', 'L4'].includes(state.result.level),
                consultationIntentLevel: state.result.consultationIntent,
                primaryCta: copy.primaryCta,
                secondaryCta: copy.secondaryCta
            },
            consent: {
                dataCollectionConsent: true,
                dataCollectionConsentVersion: CONSENT_VERSION,
                dataCollectionConsentAt: assessmentConsentAt,
                healthDataUseConsent: true,
                healthDataUseConsentVersion: CONSENT_VERSION,
                healthDataUseConsentAt: assessmentConsentAt,
                healthAdviceConsent: true,
                healthAdviceConsentVersion: CONSENT_VERSION,
                healthAdviceConsentAt
            },
            contactConsent: {
                allowLineMessages: Boolean(state.contact.allowLineMessages),
                allowPhoneContact: Boolean(state.contact.allowPhoneContact),
                allowMarketingMessages: Boolean(state.contact.allowMarketingMessages),
                version: CONTACT_CONSENT_VERSION,
                consentedAt: contactConsentAt
            },
            sourceContext: {
                entryType: state.sourceContext.entryType,
                referralCode: state.sourceContext.referralCode,
                utmSource: state.sourceContext.utmSource,
                utmMedium: state.sourceContext.utmMedium,
                utmCampaign: state.sourceContext.utmCampaign,
                eventCode: state.sourceContext.eventCode,
                campaignCode: state.sourceContext.campaignCode,
                portal: state.sourceContext.portal,
                source: state.sourceContext.source,
                pageUrl: state.sourceContext.pageUrl,
                referrer: state.sourceContext.referrer
            },
            client: {
                userAgent: navigator.userAgent || '',
                deviceType: '',
                operatingSystem: '',
                browser: ''
            },
            isTestData: !isInternalCrmTest
        };

        if (isInternalCrmTest) {
            payload.crmValidationMode = 'internal_small_batch';
            payload.allowCrmWriteTestRun = true;
            payload.internalValidationRequested = true;
        }

        return payload;
    }

    function buildAnswersPayload() {
        return questions.reduce((payload, question) => {
            const selectedOptions = getSelectedOptions(question);
            payload[question.id] = question.type === 'multi'
                ? selectedOptions.map(optionToPayload)
                : optionToPayload(selectedOptions[0]);
            return payload;
        }, {});
    }

    function getSelectedOptions(question) {
        const answer = state.answers[question.id] || [];
        return question.options.filter(option => answer.includes(option.id));
    }

    function optionToPayload(option) {
        if (!option) {
            return { value: '', label: '', score: 0 };
        }

        const payload = {
            value: option.id,
            label: option.label,
            score: Number(option.score || 0)
        };

        if (option.intent) {
            payload.intentLevel = option.intent;
        }

        return payload;
    }

    function buildFollowUpFocus(focusAreaNames) {
        if (focusAreaNames.length === 0) {
            return '建議協助會員建立年度健康追蹤基準。';
        }

        return `建議優先整理${focusAreaNames.join('、')}相關問題。`;
    }

    function showMockComplete(title, text) {
        els.mockCompleteTitle.textContent = title;
        els.mockCompleteText.textContent = text;
        showScreen('mock');
    }

    function restart() {
        state.currentIndex = 0;
        state.answers = {};
        state.result = null;
        state.assessmentConsentAt = '';
        state.healthAdviceConsentAt = '';
        state.contact = {
            userName: '',
            phone: '',
            email: '',
            allowLineMessages: false,
            allowPhoneContact: false,
            allowMarketingMessages: false
        };
        state.submission = {
            inFlight: false,
            submitted: false,
            assessmentId: ''
        };
        els.consentCheckbox.checked = false;
        els.startButton.disabled = true;
        resetModalState();
        renderQuestion();
        showScreen('start');
    }

    window.YuanxinHealthAssessmentMock = {
        questions,
        state,
        calculateResult,
        sourceContext
    };
})();
