const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const handler = require('../api/submit-health-assessment');

function createResponse() {
  return {
    headers: {},
    statusCode: 0,
    body: null,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return body;
    }
  };
}

function createUpstreamResponse(body, options = {}) {
  return {
    status: options.status || 200,
    redirected: options.redirected === true,
    headers: {
      get(name) {
        return name.toLowerCase() === 'content-type'
          ? options.contentType || ''
          : '';
      }
    },
    async text() {
      return body;
    }
  };
}

async function invokeProxy(upstreamResponse, body = {}) {
  const originalFetch = global.fetch;
  const response = createResponse();
  let forwardedRequest = null;

  global.fetch = async (url, options) => {
    forwardedRequest = { url, options };
    return upstreamResponse;
  };

  try {
    await handler({
      method: 'POST',
      body: {
        action: 'submit_health_assessment',
        submissionId: 'HASUB-20260701-k7f3x9q2m4',
        isTestData: true,
        ...body
      }
    }, response);
  } finally {
    global.fetch = originalFetch;
  }

  response.forwardedRequest = forwardedRequest;

  return response;
}

function loadFrontendTestApi(options = {}) {
  const sourcePath = path.join(__dirname, '..', 'health-assessment.js');
  const source = fs.readFileSync(sourcePath, 'utf8');
  const storageValues = new Map();
  const sessionStorage = {
    getItem(key) {
      return storageValues.has(key) ? storageValues.get(key) : null;
    },
    setItem(key, value) {
      storageValues.set(key, String(value));
    },
    removeItem(key) {
      storageValues.delete(key);
    }
  };
  const context = {
    URLSearchParams,
    Uint8Array,
    Math,
    Date,
    console,
    navigator: {
      userAgent: 'health-assessment-local-test'
    },
    document: {
      referrer: '',
      addEventListener() {},
      getElementById() {
        return null;
      }
    },
    window: {
      sessionStorage: options.storageUnavailable ? null : sessionStorage,
      crypto: require('crypto').webcrypto,
      location: {
        href: 'https://example.invalid/health-assessment.html',
        search: ''
      }
    }
  };

  vm.runInNewContext(source, context, {
    filename: 'health-assessment.js'
  });

  return {
    api: context.window.YuanxinHealthAssessmentMock,
    source,
    storageValues
  };
}

async function run() {
  const successfulPayload = {
    status: 'success',
    success: true,
    assessmentId: 'HA_TEST_ONLY'
  };
  const successResponse = await invokeProxy(
    createUpstreamResponse(JSON.stringify(successfulPayload), {
      contentType: 'application/json; charset=utf-8'
    })
  );

  assert.strictEqual(successResponse.statusCode, 200);
  assert.deepStrictEqual(successResponse.body, successfulPayload);
  assert.strictEqual(
    JSON.parse(successResponse.forwardedRequest.options.body).submissionId,
    'HASUB-20260701-k7f3x9q2m4'
  );

  const rawBodySentinel = '<html>RAW_BODY_SENTINEL</html>';
  const htmlResponse = await invokeProxy(
    createUpstreamResponse(rawBodySentinel, {
      contentType: 'text/html; charset=utf-8',
      redirected: true
    })
  );

  assert.strictEqual(htmlResponse.statusCode, 502);
  assert.strictEqual(
    htmlResponse.body.code,
    'APP_SCRIPT_NON_JSON_RESPONSE'
  );
  assert.strictEqual(htmlResponse.body.ambiguousSuccess, true);
  assert.strictEqual(htmlResponse.body.diagnostics.upstreamBodyKind, 'html');
  assert.strictEqual(htmlResponse.body.diagnostics.upstreamRedirected, true);
  assert.ok(htmlResponse.body.diagnostics.correlationId);
  assert.ok(
    !JSON.stringify(htmlResponse.body).includes('RAW_BODY_SENTINEL')
  );

  const emptyResponse = await invokeProxy(
    createUpstreamResponse('', {
      contentType: 'text/plain'
    })
  );

  assert.strictEqual(emptyResponse.statusCode, 502);
  assert.strictEqual(
    emptyResponse.body.code,
    'APP_SCRIPT_EMPTY_RESPONSE'
  );
  assert.strictEqual(emptyResponse.body.ambiguousSuccess, true);
  assert.strictEqual(emptyResponse.body.diagnostics.upstreamBodyLength, 0);
  assert.strictEqual(emptyResponse.body.diagnostics.upstreamBodyKind, 'empty');

  const missingSubmissionResponse = await invokeProxy(
    createUpstreamResponse('{}'),
    { submissionId: '' }
  );
  assert.strictEqual(missingSubmissionResponse.statusCode, 400);
  assert.strictEqual(missingSubmissionResponse.body.code, 'SUBMISSION_ID_REQUIRED');

  const invalidSubmissionResponse = await invokeProxy(
    createUpstreamResponse('{}'),
    {
      submissionId: 'HASUB-invalid-person@example.com-0912345678',
      userName: '敏感姓名',
      phone: '0912345678',
      email: 'person@example.com',
      lineUserId: 'LINE_SECRET',
      token: 'TOKEN_SECRET'
    }
  );
  assert.strictEqual(invalidSubmissionResponse.statusCode, 400);
  assert.strictEqual(invalidSubmissionResponse.body.code, 'INVALID_SUBMISSION_ID');
  const invalidBodyText = JSON.stringify(invalidSubmissionResponse.body);
  ['敏感姓名', '0912345678', 'person@example.com', 'LINE_SECRET', 'TOKEN_SECRET']
    .forEach(secret => assert.ok(!invalidBodyText.includes(secret)));

  const whitespaceSubmissionResponse = await invokeProxy(
    createUpstreamResponse('{}'),
    { submissionId: ' HASUB-20260701-k7f3x9q2m4 ' }
  );
  assert.strictEqual(whitespaceSubmissionResponse.statusCode, 400);
  assert.strictEqual(whitespaceSubmissionResponse.body.code, 'INVALID_SUBMISSION_ID');

  const { api, source } = loadFrontendTestApi();

  assert.strictEqual(
    api.isAmbiguousSubmissionResponse({ ambiguousSuccess: true }),
    true
  );
  assert.strictEqual(
    api.isAmbiguousSubmissionResponse({
      code: 'APP_SCRIPT_NON_JSON_RESPONSE'
    }),
    true
  );
  assert.strictEqual(
    api.isAmbiguousSubmissionResponse({
      code: 'APP_SCRIPT_EMPTY_RESPONSE'
    }),
    true
  );
  assert.strictEqual(
    api.isAmbiguousSubmissionResponse({ status: 'success' }),
    false
  );
  assert.strictEqual(api.state.submission.ambiguousSubmitted, false);

  const firstSubmissionId = api.getOrCreateSubmissionId();
  const repeatedSubmissionId = api.getOrCreateSubmissionId();
  assert.match(firstSubmissionId, /^HASUB-\d{8}-[a-z0-9]{10}$/);
  assert.strictEqual(repeatedSubmissionId, firstSubmissionId);

  api.state.result = {
    level: 'L1',
    total: 0,
    focusAreas: [],
    consultationIntent: ''
  };
  const frontendPayload = api.buildHealthAssessmentPayload(
    '2026-07-01T00:00:00.000Z',
    {
      userName: '本機測試',
      phone: '0900000000',
      email: ''
    }
  );
  assert.strictEqual(frontendPayload.submissionId, firstSubmissionId);

  api.saveSubmissionStatus('ambiguous', '');
  const restoredAmbiguousState = api.buildInitialSubmissionState();
  assert.strictEqual(restoredAmbiguousState.ambiguousSubmitted, true);
  assert.strictEqual(restoredAmbiguousState.submissionId, firstSubmissionId);

  api.clearStoredSubmission();
  const restartedSubmissionId = api.getOrCreateSubmissionId();
  assert.notStrictEqual(restartedSubmissionId, firstSubmissionId);

  const { api: memoryApi } = loadFrontendTestApi({
    storageUnavailable: true
  });
  const memorySubmissionId = memoryApi.getOrCreateSubmissionId();
  assert.strictEqual(
    memoryApi.getOrCreateSubmissionId(),
    memorySubmissionId
  );
  memoryApi.saveSubmissionStatus('ambiguous', '');
  assert.strictEqual(
    memoryApi.buildInitialSubmissionState().ambiguousSubmitted,
    true
  );
  memoryApi.clearStoredSubmission();
  assert.notStrictEqual(
    memoryApi.getOrCreateSubmissionId(),
    memorySubmissionId
  );

  const ambiguousUiSource = source.slice(
    source.indexOf('function showAmbiguousSubmissionState()'),
    source.indexOf('function showSecondaryMock()')
  );

  assert.ok(ambiguousUiSource.includes('ambiguousSubmitted = true'));
  assert.ok(ambiguousUiSource.includes('contactSubmitButton.disabled = true'));
  assert.ok(ambiguousUiSource.includes('送出狀態待確認'));
  assert.ok(ambiguousUiSource.includes('請勿重複送出'));
  assert.ok(source.includes("contactSubmitButton.textContent = '重新送出'"));
  assert.ok(source.includes('state.submission.submitted = true'));
  assert.ok(source.includes('CRM 內部驗收資料已送出'));
  assert.ok(source.includes("action: 'submit_health_assessment'"));
  assert.ok(source.includes('submissionId: getOrCreateSubmissionId()'));
  assert.ok(source.includes('clearStoredSubmission();'));
  const ordinaryFailureSource = source.slice(
    source.indexOf('} catch (error) {', source.indexOf('async function submitPrimaryCta()')),
    source.indexOf('function showContactFormError')
  );
  assert.ok(!ordinaryFailureSource.includes('clearStoredSubmission'));
  assert.ok(source.includes("payload.crmValidationMode = 'internal_small_batch'"));
  assert.ok(source.includes('payload.allowCrmWriteTestRun = true'));
  assert.ok(source.includes('payload.internalValidationRequested = true'));

  const proxySource = fs.readFileSync(
    path.join(__dirname, '..', 'api', 'submit-health-assessment.js'),
    'utf8'
  );

  assert.ok(!proxySource.includes('console.log'));
  assert.ok(!proxySource.includes('console.error'));
  assert.ok(!proxySource.includes('upstreamBody:'));
  assert.ok(!proxySource.includes('payload:'));

  console.log('health assessment ambiguous response tests: passed');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
