(function (window) {
    'use strict';

    const STORAGE_KEY = 'yuanxin_referral_code';
    const REFERRAL_PATTERN = /^HC\d{4,}$/;
    const TRACKING_QUERY_ALLOWLIST = new Set([
        'ref',
        'portal',
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'event_code',
        'campaign_code'
    ]);
    let debugEnabled = false;
    const initialIsConsultantPortal = readInitialConsultantPortal();

    function debugLog(...args) {
        if (debugEnabled) {
            console.log('[Yuanxin Referral]', ...args);
        }
    }

    function normalizeReferralCode(ref) {
        return String(ref || '').trim().toUpperCase();
    }

    function getLineAccessTokenString(value) {
        return typeof value === 'string' ? value : '';
    }

    function readReferralFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return normalizeReferralCode(params.get('ref'));
    }

    function isValidReferralCode(ref) {
        return REFERRAL_PATTERN.test(normalizeReferralCode(ref));
    }

    function saveReferralCode(ref) {
        const code = normalizeReferralCode(ref);

        if (!isValidReferralCode(code)) {
            return false;
        }

        localStorage.setItem(STORAGE_KEY, code);
        debugLog('Referral code saved:', code);
        return true;
    }

    function getReferralCode() {
        const urlCode = readReferralFromUrl();

        if (isValidReferralCode(urlCode)) {
            saveReferralCode(urlCode);
            return urlCode;
        }

        const storedCode = normalizeReferralCode(
            localStorage.getItem(STORAGE_KEY)
        );

        return isValidReferralCode(storedCode) ? storedCode : '';
    }

    function clearReferralCode() {
        localStorage.removeItem(STORAGE_KEY);
        debugLog('Referral code cleared');
    }

    function getQueryParameter(name) {
        return new URLSearchParams(window.location.search).get(name) || '';
    }

    function normalizePortalMode(portal) {
        return String(portal || '')
            .trim()
            .toLowerCase();
    }

    function getPortalMode() {
        const params = new URLSearchParams(window.location.search);

        return readPortalModeFromParams(params);
    }

    function readPortalFromLiffState(liffState) {
        const state = String(liffState || '').trim();

        if (!state) {
            return '';
        }

        const queryStart = state.indexOf('?');
        const queryString = queryStart >= 0
            ? state.slice(queryStart + 1)
            : state;
        const stateParams = new URLSearchParams(queryString);

        return normalizePortalMode(stateParams.get('portal'));
    }

    function readPortalModeFromParams(params) {
        const directPortal = params.get('portal');

        if (directPortal !== null) {
            return normalizePortalMode(directPortal);
        }

        return readPortalFromLiffState(params.get('liff.state'));
    }

    function readInitialConsultantPortal() {
        const initialView = window.YUANXIN_INITIAL_VIEW || {};

        if (typeof initialView.isConsultantPortal === 'boolean') {
            return initialView.isConsultantPortal;
        }

        const params = new URLSearchParams(window.location.search);

        return readPortalModeFromParams(params) === 'consultant';
    }

    function isConsultantPortal() {
        return initialIsConsultantPortal;
    }

    function sanitizeTrackingUrl(rawUrl) {
        try {
            const parsedUrl = new URL(String(rawUrl || '').trim());

            if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
                return '';
            }

            const sanitizedUrl = new URL(
                `${parsedUrl.origin}${parsedUrl.pathname}`
            );

            parsedUrl.searchParams.forEach((value, key) => {
                if (TRACKING_QUERY_ALLOWLIST.has(key)) {
                    sanitizedUrl.searchParams.append(key, value);
                }
            });

            return sanitizedUrl.toString();
        } catch (error) {
            return '';
        }
    }

    function buildReferralPayload(data = {}) {
        return {
            action: data.action || 'referral_event',
            eventType: data.eventType || 'page_view',
            referralCode: getReferralCode(),
            lineUserId: data.lineUserId || '',
            lineDisplayName: data.lineDisplayName || '',
            lineAccessToken: getLineAccessTokenString(data.lineAccessToken),
            userName: data.userName || '',
            phone: data.phone || '',
            email: data.email || '',
            pageName: data.pageName || 'yuanxin-liff-demo-index',
            pageUrl: sanitizeTrackingUrl(window.location.href),
            referrer: sanitizeTrackingUrl(document.referrer),
            sourceChannel: data.sourceChannel || 'LINE_LIFF',
            utmSource: getQueryParameter('utm_source'),
            utmMedium: getQueryParameter('utm_medium'),
            utmCampaign: getQueryParameter('utm_campaign'),
            userAgent: navigator.userAgent || '',
            createdAt: new Date().toISOString()
        };
    }

    async function sendReferralEvent(data = {}) {
        const config = window.YUANXIN_REFERRAL_CONFIG || {};

        if (!config.webhookUrl) {
            throw new Error('尚未設定中央 Apps Script Web App URL');
        }

        const payload = buildReferralPayload(data);

        debugLog('Sending payload:', {
            ...payload,
            lineUserId: payload.lineUserId ? '[REDACTED]' : '',
            lineAccessToken: payload.lineAccessToken ? '[REDACTED]' : ''
        });

        const response = await fetch(config.webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8'
            },
            body: JSON.stringify(payload),
            redirect: 'follow'
        });

        if (!response.ok) {
            throw new Error(`Webhook HTTP error: ${response.status}`);
        }

        const result = await response.json();

        if (result.status !== 'success') {
            const error = new Error('Webhook processing failed');
            const authCode = typeof result.authCode === 'string'
                ? result.authCode.trim()
                : '';

            if (/^[A-Z][A-Z0-9_]*$/.test(authCode)) {
                error.authCode = authCode;
            }

            throw error;
        }

        return result;
    }

    /**
     * Task 02B：
     * 顧問業務大廳專用查詢。
     *
     * action 可用：
     * - getConsultantDashboard
     * - getMyLeads
     * - getMyConsultants
     * - getTeamLeads
     *
     * 正式 LIFF 前端會優先傳 lineAccessToken，
     * 後端會用 LINE access token 驗證身份。
     */
    async function queryConsultantPortal(data = {}) {
        const config = window.YUANXIN_REFERRAL_CONFIG || {};

        if (!config.webhookUrl) {
            throw new Error('尚未設定中央 Apps Script Web App URL');
        }

        const payload = {
            action: data.action || 'getConsultantDashboard',
            lineUserId: data.lineUserId || '',
            lineDisplayName: data.lineDisplayName || '',
            lineAccessToken: getLineAccessTokenString(data.lineAccessToken),
            pageName: data.pageName || 'yuanxin-consultant-portal',
            sourceChannel: data.sourceChannel || 'LINE_LIFF',
            userAgent: navigator.userAgent || '',
            createdAt: new Date().toISOString()
        };

        debugLog('Query consultant portal:', {
            ...payload,
            lineUserId: payload.lineUserId ? '[REDACTED]' : '',
            lineAccessToken: payload.lineAccessToken ? '[REDACTED]' : ''
        });

        const response = await fetch(config.webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8'
            },
            body: JSON.stringify(payload),
            redirect: 'follow'
        });

        if (!response.ok) {
            throw new Error(
                `Consultant portal HTTP error: ${response.status}`
            );
        }

        const result = await response.json();

        if (result && (result.success === false || result.authorized === false)) {
            return result;
        }

        if (result.status !== 'success' && result.success !== true) {
            throw new Error(
                result.message || 'Consultant portal query failed'
            );
        }

        return result;
    }

    function setReferralDebug(enabled) {
        debugEnabled = Boolean(enabled);
    }

    function initializeReferralTracking() {
        getReferralCode();

        if (isConsultantPortal()) {
            debugLog(
                'Consultant portal detected. Page-view referral event skipped.'
            );
            return;
        }

        sendReferralEvent({
            action: 'referral_event',
            eventType: 'page_view',
            pageName: 'yuanxin-liff-demo-index',
            sourceChannel: 'LINE_LIFF'
        }).catch(function (error) {
            debugLog('Page-view event failed:', error.message);
        });
    }

    window.YuanxinReferral = {
        readReferralFromUrl,
        isValidReferralCode,
        saveReferralCode,
        getReferralCode,
        clearReferralCode,
        buildReferralPayload,
        sendReferralEvent,

        // Task 02B
        queryConsultantPortal,

        // Task 03A
        getPortalMode,
        isConsultantPortal,

        setReferralDebug,
        initializeReferralTracking
    };

    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            initializeReferralTracking
        );
    } else {
        initializeReferralTracking();
    }
})(window);
