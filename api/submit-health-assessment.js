const APPS_SCRIPT_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzH9C8aAoKTe84HxVATJMdjbCcPu8iaadSEVdLXe_JuxLl4oVE6o6RoizKHgbl5EnyO/exec';
const { randomUUID } = require('crypto');

const AMBIGUOUS_RESPONSE_MESSAGE =
  '資料可能已送出，但系統未收到完整確認。請勿重複送出，請聯繫管理員確認。';

function sendJson(res, statusCode, body) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(statusCode).json(body);
}

function parseBody(body) {
  if (!body) {
    return {};
  }

  if (typeof body === 'string') {
    return JSON.parse(body);
  }

  return body;
}

function isInternalCrmValidationRequest(payload) {
  return (
    payload &&
    payload.isTestData === false &&
    payload.crmValidationMode === 'internal_small_batch' &&
    payload.allowCrmWriteTestRun === true &&
    payload.internalValidationRequested === true
  );
}

function classifyUpstreamBody(body) {
  if (typeof body !== 'string') {
    return 'unknown';
  }

  const trimmedBody = body.trim();

  if (!trimmedBody) {
    return 'empty';
  }

  if (/^(?:<!doctype\s+html|<html|<head|<body)\b/i.test(trimmedBody)) {
    return 'html';
  }

  if (/^[\[{]/.test(trimmedBody)) {
    return 'json_like_invalid';
  }

  return 'text';
}

function buildUpstreamDiagnostics(upstreamResponse, upstreamText) {
  const contentType = upstreamResponse.headers &&
    typeof upstreamResponse.headers.get === 'function'
    ? upstreamResponse.headers.get('content-type') || ''
    : '';

  return {
    upstreamStatus: Number(upstreamResponse.status) || 0,
    upstreamContentType: String(contentType).slice(0, 160),
    upstreamRedirected: upstreamResponse.redirected === true,
    upstreamBodyLength: Buffer.byteLength(String(upstreamText || ''), 'utf8'),
    upstreamBodyKind: classifyUpstreamBody(upstreamText),
    correlationId: randomUUID()
  };
}

function buildAmbiguousResponse(upstreamResponse, upstreamText) {
  const diagnostics = buildUpstreamDiagnostics(
    upstreamResponse,
    upstreamText
  );
  const code = diagnostics.upstreamBodyKind === 'empty'
    ? 'APP_SCRIPT_EMPTY_RESPONSE'
    : 'APP_SCRIPT_NON_JSON_RESPONSE';

  return {
    ok: false,
    status: 'error',
    success: false,
    code,
    ambiguousSuccess: true,
    message: AMBIGUOUS_RESPONSE_MESSAGE,
    diagnostics
  };
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { status: 'error', message: 'Method not allowed' });
  }

  let payload;

  try {
    payload = parseBody(req.body);
  } catch (error) {
    return sendJson(res, 400, { status: 'error', message: 'Invalid JSON body' });
  }

  if (!payload || payload.action !== 'submit_health_assessment') {
    return sendJson(res, 400, { status: 'error', message: 'Invalid action' });
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'lineAccessToken')) {
    return sendJson(res, 400, { status: 'error', message: 'lineAccessToken is not allowed' });
  }

  if (payload.isTestData !== true) {
    if (!isInternalCrmValidationRequest(payload)) {
      return sendJson(res, 400, {
        status: 'error',
        decisionCode: 'CRM_INTERNAL_MODE_REQUIRED',
        message: 'CRM internal validation mode is required'
      });
    }

    const internalValidationToken = process.env.HEALTH_ASSESSMENT_INTERNAL_VALIDATION_TOKEN || '';

    if (!internalValidationToken) {
      return sendJson(res, 500, {
        status: 'error',
        decisionCode: 'INTERNAL_VALIDATION_TOKEN_NOT_CONFIGURED',
        message: 'Internal validation token is not configured'
      });
    }

    payload = {
      ...payload,
      internalValidationToken
    };
  }

  try {
    const upstreamResponse = await fetch(APPS_SCRIPT_WEB_APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    const upstreamText = await upstreamResponse.text();

    if (!upstreamText.trim()) {
      return sendJson(
        res,
        502,
        buildAmbiguousResponse(upstreamResponse, upstreamText)
      );
    }

    let upstreamJson;

    try {
      upstreamJson = upstreamText ? JSON.parse(upstreamText) : {};
    } catch (error) {
      return sendJson(
        res,
        502,
        buildAmbiguousResponse(upstreamResponse, upstreamText)
      );
    }

    return sendJson(res, upstreamResponse.status, upstreamJson);
  } catch (error) {
    return sendJson(res, 502, {
      status: 'error',
      message: 'Failed to forward request to Apps Script'
    });
  }
}

module.exports = handler;
module.exports._test = {
  buildAmbiguousResponse,
  classifyUpstreamBody
};
