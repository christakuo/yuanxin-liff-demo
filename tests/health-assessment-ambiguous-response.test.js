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

async function invokeProxy(upstreamResponse) {
  const originalFetch = global.fetch;
  const response = createResponse();

  global.fetch = async () => upstreamResponse;

  try {
    await handler({
      method: 'POST',
      body: {
        action: 'submit_health_assessment',
        isTestData: true
      }
    }, response);
  } finally {
    global.fetch = originalFetch;
  }

  return response;
}

function loadFrontendTestApi() {
  const sourcePath = path.join(__dirname, '..', 'health-assessment.js');
  const source = fs.readFileSync(sourcePath, 'utf8');
  const context = {
    URLSearchParams,
    console,
    document: {
      referrer: '',
      addEventListener() {},
      getElementById() {
        return null;
      }
    },
    window: {
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
    source
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
