# Task 03B-3｜Google Sheet 與 Apps Script 健康評估 API 規格

更新日期：2026-06-23

## 1. 任務目標

Task 03B-3 的目標是建立「2 分鐘健康關注評估」前端 mock 完成後，進入正式資料寫入前的 API 與 Google Sheet 規格。

本任務承接：

- Task 03B-1：2 分鐘健康關注評估重新設計規格
- Task 03B-2：前端健康評估頁面與結果頁 mock 第一版

Task 03B-3 只定義並實作健康評估紀錄寫入 API 的規格，不建立或更新 CRM 名單，不處理推薦碼 90 天保護的正式歸屬邏輯。CRM 名單建立、更新與推薦保護正式串接，留待 Task 03B-4。

## 2. Task 03B-3 與 Task 03B-4 分工

### 2.1 Task 03B-3 範圍

Task 03B-3 包含：

1. 建立 Google Sheet 分頁 `health_assessments_健康評估紀錄` 欄位規格。
2. 新增 Apps Script action：`submit_health_assessment`。
3. 新增健康評估 ID，格式建議為 `HA000001`。
4. 將健康評估答案與結果寫入健康評估紀錄分頁。
5. 支援測試資料寫入。
6. 支援 URL 來源、推薦碼、UTM 與入口來源等 `sourceContext` 欄位。
7. 可選擇寫入一筆健康評估完成事件至 `referral_events_推薦追蹤事件紀錄`。
8. 測試資料必須使用 `isTestData = true`。
9. 不得在 response 或紀錄中回傳敏感 payload。
10. 不得儲存 LINE access token、URL hash 或其他不必要敏感資料。

### 2.2 Task 03B-3 不包含

Task 03B-3 不包含：

1. 不新增 `leads_潛在會員名單`。
2. 不更新 `leads_潛在會員名單`。
3. 不因匿名健康評估建立 leads。
4. 不處理 LINE 綁定。
5. 不使用 LINE 使用者 ID 作為名單歸戶。
6. 不判斷顧問正式歸屬。
7. 不處理推薦碼 90 天保護規則。
8. 不更新 CRM 階段。
9. 不修改前端畫面或前端流程。
10. 不修改 Vercel、LINE LIFF、LINE Rich Menu。

以上項目留待 Task 03B-4。

## 3. 既有系統狀態

目前已知 Google Sheet 既有分頁包含：

1. `leads_潛在會員名單`
2. `referral_events_推薦追蹤事件紀錄`
3. `consultants_顧問主檔`

目前已知 Apps Script 既有檔案包含：

- `程式碼.gs`
- `Config.gs`
- `SheetService.gs`
- `ReferralService.gs`
- `LeadService.gs`
- `EventService.gs`
- `Test.gs`
- `LineAuthService.gs`
- `ConsultantLeadService.gs`
- `ConsultantResourceService.gs`

目前已知既有 route action 包含：

- `referral_event`
- `bind_line_referral`
- `consultant_leads_query`
- `getConsultantDashboard`
- `getMyLeads`
- `getMyConsultants`
- `getTeamLeads`
- `getConsultantResources`

Task 03B-3 需新增或擴充：

- `submit_health_assessment`
- `CONFIG.SHEETS.HEALTH_ASSESSMENTS`
- `CONFIG.IDS.HEALTH_ASSESSMENT_PREFIX`
- `HealthAssessmentService.gs`
- `HA` ID 產生規則

## 4. health_assessments_健康評估紀錄分頁

Task 03B-3 建議新增 Google Sheet 分頁：

`health_assessments_健康評估紀錄`

此分頁採 append-only 原則：每次送出健康評估就新增一筆紀錄，不覆蓋既有紀錄。

### 4.1 設計原則

1. 保存完整健康評估答案、結果與來源。
2. 支援匿名、留資料、LINE identified 等不同入口狀態。
3. 不直接建立 CRM 名單。
4. 不直接更新 leads。
5. 保留 Task 03B-4 後續串接 CRM 的必要欄位。
6. 不儲存 token、URL hash、完整敏感身分資料以外的不必要資訊。
7. 測試資料必須可被辨識與篩選。

## 5. 欄位規格

### 5.1 基本識別欄位

| 欄位名稱 | Task 03B-3 | 說明 |
|---|---|---|
| 健康評估ID | 必填 | HA 開頭流水號，例如 HA000001 |
| 身分狀態 | 必填 | anonymous / line_identified / contact_provided / linked_to_lead |
| 名單ID | 選填 | Task 03B-4 串接 leads 後回填 |
| LINE使用者ID | 選填 | Task 03B-4 串接 LINE 後使用 |
| LINE顯示名稱 | 選填 | Task 03B-4 串接 LINE 後使用 |
| 使用者姓名 | 選填 | 使用者自行填寫時保存 |
| 手機號碼 | 選填 | 使用者自行填寫時保存 |
| 電子信箱 | 選填 | 使用者自行填寫時保存 |

Task 03B-3 建議身分狀態：

- 匿名評估：`anonymous`
- 留下姓名、手機或 Email，但尚未建立 leads：`contact_provided`
- LINE identified payload 已存在：`line_identified`，但 Task 03B-3 不因此建立 leads

### 5.2 來源與推薦欄位

| 欄位名稱 | Task 03B-3 | 說明 |
|---|---|---|
| 入口類型 | 必填 | official_line / consultant_referral / external_anonymous / website / campaign |
| 推薦碼 | 選填 | URL ref 或 sourceContext |
| 是否有效推薦碼 | 選填 | Task 03B-4 查 consultants 後判斷 |
| 歸屬顧問ID | 選填 | Task 03B-4 判斷 |
| 歸屬顧問姓名 | 選填 | Task 03B-4 判斷 |
| 來源頁面 | 選填 | Referrer 或前端帶入 |
| 來源管道 | 選填 | LINE / website / facebook / instagram / forum / campaign / other |
| UTM來源 | 選填 | utm_source |
| UTM媒介 | 選填 | utm_medium |
| UTM活動 | 選填 | utm_campaign |
| 活動代碼 | 選填 | event_code |
| campaign代碼 | 選填 | campaign_code |
| portal參數 | 選填 | portal |
| source參數 | 選填 | source |
| 頁面網址 | 必填 | 不保存 hash |
| Referrer | 選填 | 不保存 hash |
| User Agent | 選填 | 做為除錯與裝置判讀參考 |

Task 03B-3 不查詢顧問主檔，也不做正式顧問歸屬，只保存來源資料。

### 5.3 題目答案欄位

| 欄位名稱 | Task 03B-3 | 說明 |
|---|---|---|
| Q01_年齡區間 | 必填 | 單選 |
| Q02_主要健康目標 | 必填 | 單選 |
| Q03_健檢或健康檢查頻率 | 必填 | 單選 |
| Q04_報告異常理解程度 | 必填 | 單選 |
| Q05_主要健康關注 | 必填 | 多選 JSON 字串 |
| Q06_是否有待追蹤異常 | 必填 | 單選 |
| Q07_家族健康風險 | 必填 | 單選 |
| Q08_睡眠狀態 | 必填 | 單選 |
| Q09_壓力狀態 | 必填 | 單選 |
| Q10_運動習慣 | 必填 | 單選 |
| Q11_生活型態 | 必填 | 多選 JSON 字串 |
| Q12_下一步需求 | 必填 | 單選 |

Q05 / Q11 多選題建議以 JSON 字串保存。

範例：

```json
[{"value":"metabolic","label":"血糖、血脂、血壓或代謝相關","score":1}]
```

保存 JSON 字串的原因：

1. 保留原始選項資料與分數。
2. 方便後續重新計算結果。
3. 避免多選資料被拆散後失真。
4. 前端選項文字調整時仍可保留當次作答內容。

可另外增加「主要健康關注」文字摘要欄位，方便人工閱讀與顧問跟進。

### 5.4 結果欄位

| 欄位名稱 | Task 03B-3 | 說明 |
|---|---|---|
| 健康關注總分 | 必填 | Q02 至 Q11 計分 |
| 健康關注等級 | 必填 | L1 / L2 / L3 / L4 |
| 結果分級代碼 | 必填 | L1 / L2 / L3 / L4 |
| 結果頁標題 | 必填 | 結果頁主標題 |
| 主要健康關注 | 必填 | 文字摘要 |
| 主要關注說明 | 必填 | JSON 或文字 |
| 次要關注說明 | 選填 | JSON 或文字 |
| 健康評估摘要 | 必填 | 結果摘要 |
| 顧問跟進重點 | 選填 | Task 03B-4 可同步到 leads |
| 是否建議優先諮詢 | 必填 | 是 / 否 |
| 諮詢優先等級 | 必填 | 低 / 中 / 高 / 緊急 |
| 結果頁主CTA文字 | 選填 | 前端顯示用 |
| 結果頁次CTA文字 | 選填 | 前端顯示用 |

### 5.5 同意與權限欄位

| 欄位名稱 | Task 03B-3 | 說明 |
|---|---|---|
| 個資蒐集同意 | 必填 | 是 / 否 |
| 個資蒐集同意版本 | 必填 | 建議 2026-06-23-v1 |
| 個資蒐集同意時間 | 必填 | 前端送出時間或伺服器時間 |
| 健康資料使用同意 | 必填 | 是 / 否 |
| 健康資料使用同意版本 | 必填 | 建議 2026-06-23-v1 |
| 健康資料使用同意時間 | 必填 | 前端送出時間或伺服器時間 |
| 健康諮詢同意 | 選填 | 主要 CTA 同意後使用 |
| 健康諮詢同意版本 | 選填 | 建議 2026-06-23-v1 |
| 健康諮詢同意時間 | 選填 | 主要 CTA 同意後使用 |
| 是否允許LINE訊息 | 預留 | Task 03B-4 判斷 |
| 是否允許電話聯繫 | 預留 | Task 03B-4 判斷 |
| 是否允許行銷訊息 | 預留 | Task 03B-4 判斷 |
| 是否停止聯繫 | 預留 | Task 03B-4 判斷 |

Task 03B-3 不處理 LINE、電話或行銷聯繫權限的正式 CRM 欄位同步。

### 5.6 系統欄位

| 欄位名稱 | Task 03B-3 | 說明 |
|---|---|---|
| 處理狀態 | 必填 | completed / invalid / error |
| 是否測試資料 | 必填 | 是 / 否 |
| 事件處理狀態 | 必填 | 已處理 / 有錯誤 |
| 異常原因 | 選填 | 驗證失敗或寫入失敗原因 |
| 建立時間 | 必填 | 伺服器時間 |
| 最後更新時間 | 選填 | append-only 原則下通常等於建立時間 |
| 建立者 | 必填 | system |
| 最後更新者 | 選填 | system |
| 除錯備註 | 選填 | 測試階段可使用，不保存敏感資訊 |

## 6. submit_health_assessment API

### 6.1 Action

```text
submit_health_assessment
```

### 6.2 Payload 範例

```json
{
  "action": "submit_health_assessment",
  "assessmentId": "",
  "identity": {
    "identityStatus": "anonymous",
    "lineUserId": "",
    "lineDisplayName": "",
    "userName": "",
    "phone": "",
    "email": ""
  },
  "answers": {
    "q01": {"value": "40to49", "label": "40至49歲"},
    "q02": {"value": "improve", "label": "想改善健康狀態", "score": 2},
    "q03": {"value": "over2years", "label": "超過2年未檢查", "score": 2},
    "q04": {"value": "unclear", "label": "不太清楚異常代表什麼", "score": 2},
    "q05": [
      {"value": "metabolic", "label": "血糖、血脂、血壓或代謝相關", "score": 1}
    ],
    "q06": {"value": "onePending", "label": "有一項待追蹤異常", "score": 2},
    "q07": {"value": "familyOne", "label": "家族有一項相關病史", "score": 2},
    "q08": {"value": "sometimes", "label": "有時睡不好", "score": 1},
    "q09": {"value": "stressSometimes", "label": "有時壓力偏高", "score": 1},
    "q10": {"value": "lowActivity", "label": "運動量偏低", "score": 1},
    "q11": [
      {"value": "eatOut", "label": "常外食或飲食不固定", "score": 1}
    ],
    "q12": {"value": "personalAdvice", "label": "想取得個人化建議", "intentLevel": "中"}
  },
  "result": {
    "score": 12,
    "level": "L2",
    "resultCode": "L2",
    "resultTitle": "目前健康狀態有幾個需要留意的訊號，建議開始建立追蹤計畫",
    "primaryConcernAreas": ["代謝風險", "生活型態"],
    "secondaryConcernAreas": ["健檢追蹤"],
    "mainHealthConcerns": "代謝與生活型態",
    "summary": "健康評估摘要文字",
    "followUpFocus": "建議顧問優先了解健檢異常、生活型態與追蹤需求",
    "priorityConsultationRecommended": false,
    "consultationIntentLevel": "中",
    "primaryCta": "取得個人化健康建議",
    "secondaryCta": "查看健康管理資源"
  },
  "consent": {
    "dataCollectionConsent": true,
    "dataCollectionConsentVersion": "2026-06-23-v1",
    "dataCollectionConsentAt": "2026-06-23T10:00:00+08:00",
    "healthDataUseConsent": true,
    "healthDataUseConsentVersion": "2026-06-23-v1",
    "healthDataUseConsentAt": "2026-06-23T10:00:00+08:00",
    "healthAdviceConsent": false,
    "healthAdviceConsentVersion": "",
    "healthAdviceConsentAt": ""
  },
  "sourceContext": {
    "entryType": "external_anonymous",
    "referralCode": "HC0000",
    "utmSource": "test",
    "utmMedium": "",
    "utmCampaign": "",
    "eventCode": "",
    "campaignCode": "",
    "portal": "",
    "source": "",
    "pageUrl": "https://yuanxin-liff-demo.vercel.app/health-assessment.html?ref=HC0000&utm_source=test",
    "referrer": ""
  },
  "client": {
    "userAgent": "",
    "deviceType": "",
    "operatingSystem": "",
    "browser": ""
  },
  "isTestData": true
}
```

### 6.3 Task 03B-3 必填欄位

必填：

- `action`
- `answers.q01` 至 `answers.q12`
- `result.score`
- `result.level`
- `result.resultTitle`
- `result.summary`
- `consent.dataCollectionConsent`
- `consent.healthDataUseConsent`
- `sourceContext.pageUrl`
- `client.userAgent`
- `isTestData`

### 6.4 Task 03B-3 選填欄位

選填：

- `assessmentId`
- `identity.userName`
- `identity.phone`
- `identity.email`
- `identity.lineUserId`
- `identity.lineDisplayName`
- `result.followUpFocus`
- `sourceContext.referrer`
- `client.deviceType`
- `client.operatingSystem`
- `client.browser`

### 6.5 驗證規則

API 應檢查：

1. `action` 必須是 `submit_health_assessment`。
2. Q01 至 Q12 必須存在。
3. Q05 / Q11 必須是陣列。
4. `result.level` 必須是 L1 / L2 / L3 / L4。
5. `result.score` 必須是數字。
6. `consent.dataCollectionConsent` 必須是 `true`。
7. `consent.healthDataUseConsent` 必須是 `true`。
8. `isTestData` 必須明確傳入 `true` 或 `false`。
9. Task 03B-3 測試階段建議前端送出的 payload 固定帶 `isTestData = true`。
10. 不得接受或保存 `lineAccessToken`。
11. `pageUrl` 與 `referrer` 若包含 hash，必須移除 hash 後再保存。

## 7. Apps Script 修改規格

### 7.1 新增服務檔案

建議新增：

`HealthAssessmentService.gs`

建議包含函式：

- `handleSubmitHealthAssessment(payload)`
- `validateHealthAssessmentPayload(payload)`
- `createHealthAssessment(payload)`
- `buildHealthAssessmentRecord(payload, assessmentId)`
- `createHealthAssessmentEvent(payload, result)`
- `sanitizeHealthAssessmentUrl(value)`
- `jsonStringifySafe(value)`

### 7.2 Config.gs 修改

建議新增：

```javascript
SHEETS.HEALTH_ASSESSMENTS = 'health_assessments_健康評估紀錄'
```

實際寫法需依現有 `CONFIG.SHEETS` 結構調整。

建議新增：

```javascript
IDS.HEALTH_ASSESSMENT_PREFIX = 'HA'
```

實際寫法需依現有 `CONFIG.IDS` 結構調整。

建議新增 event type：

```text
health_assessment_complete: '完成健康評估'
```

### 7.3 SheetService.gs 修改

若既有 `generateId` 支援指定 ID 欄位，需新增：

- `HA` 對應欄位：`健康評估ID`
- 使用 `CONFIG.IDS.HEALTH_ASSESSMENT_PREFIX`
- ID 格式：`HA000001`

`health_assessments_健康評估紀錄` 只做 append-only 寫入，不在 Task 03B-3 更新既有列。

### 7.4 程式碼.gs 修改

`routeRequest(payload)` 增加：

```javascript
case 'submit_health_assessment':
  return withScriptLock(function () {
    return handleSubmitHealthAssessment(payload);
  });
```

不得改變既有 action 的行為：

- `referral_event`
- `bind_line_referral`
- `consultant_leads_query`
- `getConsultantDashboard`
- `getMyLeads`
- `getMyConsultants`
- `getTeamLeads`
- `getConsultantResources`

### 7.5 EventService.gs 修改

Task 03B-3 可在完成健康評估後，寫入一筆 referral event，作為健康評估完成事件。

建議寫入 referral_events 欄位：

- 健康評估ID
- 事件類型 = 完成健康評估
- 頁面名稱 = 2 分鐘健康關注評估
- 頁面網址
- 來源頁面
- 來源管道
- UTM來源 / UTM媒介 / UTM活動
- 推薦碼
- 事件處理狀態
- 異常原因
- 除錯備註：可標記 Task03B-3

不得寫入：

- Q01 至 Q12 完整答案
- lineAccessToken
- URL hash
- 過度敏感的個人資料

## 8. 測試規格

### 8.1 測試原則

Task 03B-3 測試必須避免污染 CRM。

測試要求：

1. 測試 payload 必須帶 `isTestData = true`。
2. 測試不得新增 leads。
3. 測試不得更新 leads。
4. 測試不得改變 CRM 階段。
5. 測試不得產生正式顧問歸屬。
6. 測試不得觸發正式 CRM 通知。
7. 測試不得保存 LINE access token。
8. 測試不得保存 URL hash。

### 8.2 建議測試函式

建議新增測試函式：

- `testSubmitHealthAssessmentValidPayload()`
- `testSubmitHealthAssessmentMissingConsent()`
- `testSubmitHealthAssessmentMissingAnswers()`
- `testSubmitHealthAssessmentInvalidLevel()`
- `testSubmitHealthAssessmentMultipleChoiceJson()`
- `testSubmitHealthAssessmentDoesNotCreateLead()`

### 8.3 驗收清單

Task 03B-3 完成後需驗收：

1. 是否能產生 `HA000001` 格式 ID。
2. 是否 append-only 寫入 health_assessments。
3. Q01 至 Q12 是否完整保存。
4. Q05 / Q11 JSON 字串是否正確。
5. 同意欄位是否完整保存。
6. sourceContext 是否完整保存。
7. pageUrl / referrer 不包含 hash。
8. 測試資料是否可辨識。
9. response 不回傳敏感 payload。
10. leads 筆數不增加。
11. 顧問歸屬不變更。
12. referral_events 可寫入健康評估完成事件，且不影響既有事件。
13. 既有 referral_event / bind_line_referral 行為不變。

## 9. 前端串接邊界

Task 03B-3 若要讓 `health-assessment.js` 呼叫 API，必須遵守：

1. 只送出健康評估答案、結果、同意與來源資料。
2. 不建立 CRM 名單。
3. 不要求 LINE 登入。
4. 不傳送 LIFF token。
5. 不寫入 leads。
6. 不跳轉到正式諮詢流程。
7. 不修改既有入口與推薦碼追蹤流程。
8. 送出成功後仍可保留 mock 結果頁體驗。
9. 測試階段 payload 預設 `isTestData = true`。

前端串接是否納入 Task 03B-3A 或 03B-3B，需在實作前再次確認。本規格文件只定義 Apps Script 與 Sheet 的資料合約。

## 10. 隱私與資安限制

不得保存：

- LINE access token
- URL hash
- LIFF 內部驗證資訊
- 使用者密碼
- 過度敏感個資
- 未經同意的健康資料

結果 response 不得包含：

- 完整原始 payload
- 系統內部錯誤堆疊
- Apps Script 內部細節
- 管理者除錯資訊

可保存資訊：

- 健康關注分級
- 顧問跟進建議
- 顧問可讀健康摘要
- 顧問可讀風險提醒
- 顧問可讀生活型態資訊

## 11. 實作前確認事項

Task 03B-3 實作前需確認：

1. 是否正式新增 `health_assessments_健康評估紀錄` 分頁。
2. 是否採用本文件欄位名稱。
3. Q05 / Q11 多選題是否保存為 JSON 字串。
4. Task 03B-3 是否完全不寫入 leads。
5. Task 03B-3 是否寫入 `referral_events`。
6. 是否新增 `health_assessment_complete` 事件類型。
7. 是否所有測試都必須使用 `isTestData = true`。
8. 是否接受 LINE identified payload，但不建立名單。
9. 測試資料是否寫入正式 Sheet，並以 `isTestData = true` 標記。
10. Apps Script 是否先用測試函式驗證，再更新 Web App。

## 12. 後續任務拆分

### Task 03B-3A：Sheet 欄位與 Apps Script API 實作

範圍：

- 新增 `health_assessments_健康評估紀錄` 分頁。
- 新增 `HealthAssessmentService.gs`。
- 新增 `submit_health_assessment`。
- 新增 HA ID。
- 測試寫入健康評估紀錄。
- 不寫入 leads。

### Task 03B-3B：前端 API 串接測試

範圍：

- `health-assessment.js` 串接 `submit_health_assessment`。
- 測試 payload。
- 測試成功與失敗狀態。
- 確認不建立 CRM 名單。

### Task 03B-4：CRM 名單建立、更新與推薦碼保護規則

範圍：

- LINE 綁定後將健康評估與 leads 串接。
- 留下姓名與電話後可建立或更新 leads。
- 同步健康評估摘要到 leads。
- 套用顧問推薦碼與 90 天保護規則。
- 顧問大廳顯示會員健康評估摘要。

## 13. 本文件完成標準

本文件完成代表：

1. 已明確定義 Task 03B-3 / 03B-4 分工。
2. 已明確定義 `health_assessments_健康評估紀錄` 欄位。
3. 已明確定義 `submit_health_assessment` payload。
4. 已明確定義 HA ID 規則。
5. 已明確定義 Apps Script 修改檔案。
6. 已明確定義不寫入 leads 的限制。
7. 已明確定義 referral_events 寫入邊界。
8. 已明確定義測試資料規則。
9. 已明確定義隱私與資安限制。
10. 尚未修改 Apps Script、Google Sheet 或前端實作。
