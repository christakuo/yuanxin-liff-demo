const APPS_SCRIPT_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzH9C8aAoKTe84HxVATJMdjbCcPu8iaadSEVdLXe_JuxLl4oVE6o6RoizKHgbl5EnyO/exec';

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
    let upstreamJson;

    try {
      upstreamJson = upstreamText ? JSON.parse(upstreamText) : {};
    } catch (error) {
      return sendJson(res, 502, {
        status: 'error',
        message: 'Apps Script returned non-JSON response'
      });
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
