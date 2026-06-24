# Task 03B-4B：後端身分解析與衝突判定設計

更新日期：2026-06-24

## 文件定位

本階段只完成技術設計：

- 不建立或更新 leads。
- 不修改 health_assessments。
- 不寫 referral_events。
- 不修改正式程式或資料。
- 實作留待 Task 03B-4C 以後。

本文中的函式、物件與回傳代碼均為後續實作規格，不代表目前正式 Apps Script 已具備這些功能。

## 1. 設計目標

設計一個健康評估專用、可獨立測試的後端身分解析層，用來判斷：

- 是否只保存健康評估。
- 是否可以建立 CRM 名單。
- 是否可以更新既有名單。
- 是否需要人工審核。
- 是否存在 LINE、手機、姓名或多筆名單衝突。
- 哪一筆 lead 可作為後續更新目標。

此層只接收資料、查找候選名單並產生判定結果，不直接寫入 Google Sheet。

## 2. 已確認規則

本設計沿用 Task 03B-4A 已確認規則：

- 外部訪客必須同時具備姓名及合法手機，才具有建立或更新 CRM 名單資格。
- Email 選填，不可單獨建單或自動合併。
- 已驗證 LINE 訪客可依可信任的 LINE 使用者ID建立或更新名單，不強制先填姓名與手機。
- 未驗證 LINE 使用者ID不得作為建單依據。
- `isTestData = true` 時禁止建立或更新 leads。
- 身分資料不足時只保存 health_assessments。
- LINE與手機命中不同名單時，不得自動合併或更新。
- 同手機多筆有效名單時，必須人工審核。
- 手機相同但姓名不同時，不得覆蓋既有姓名。
- 既有名單再次評估不得重設 CRM 階段。

## 3. 建議純判斷函式

### 3.1 呼叫順序

```text
normalizeHealthAssessmentIdentity(input)
  -> validateTaiwanMobilePhone(phone)
  -> findHealthAssessmentLeadCandidates(identity)
  -> detectHealthAssessmentIdentityConflict(context)
  -> resolveHealthAssessmentIdentity(context)
  -> buildHealthAssessmentLeadDecision(context)
```

推薦碼與顧問歸屬不在此流程內判定，留待 Task 03B-4E。

### 3.2 normalizeHealthAssessmentIdentity(input)

責任：

- 將原始 identity、驗證結果及測試標記整理為標準化身分物件。
- 去除姓名首尾空白。
- 正規化手機。
- 不信任前端自行宣告的 LINE 驗證狀態。
- 不接收或保存 lineAccessToken。

輸入：

```javascript
{
  identity: {},
  trustedLineIdentity: null,
  isTestData: true
}
```

輸出：第 4 節定義的標準化 identity 物件。

### 3.3 validateTaiwanMobilePhone(phone)

責任：

- 檢查正規化後手機是否為 10 位數。
- 檢查是否以 `09` 開頭。
- 回傳純判斷結果，不查 Sheet。

建議輸出：

```javascript
{
  valid: true,
  normalizedPhone: "0912345678",
  reason: ""
}
```

### 3.4 findHealthAssessmentLeadCandidates(identity)

責任：

- 唯讀查找所有符合可信任 LINE 使用者ID的有效名單。
- 唯讀查找所有符合 normalizedPhone 的有效名單。
- 不只回傳第一筆。
- 不建立、更新、合併或刪除名單。

輸出：第 6 節定義的候選查找結果。

### 3.5 detectHealthAssessmentIdentityConflict(context)

責任：

- 判斷多筆 LINE 命中。
- 判斷多筆手機命中。
- 判斷 LINE與手機是否命中不同名單。
- 判斷同手機姓名不一致。
- 判斷既有名單是否已有歸屬爭議。
- 判斷候選是否為無效、已合併或重複資料。

輸出：

```javascript
{
  hasConflict: true,
  conflictType: "LINE_PHONE_CONFLICT",
  candidateLeadIds: ["LD000001", "LD000002"],
  message: "LINE與手機指向不同名單，需人工審核。"
}
```

### 3.6 resolveHealthAssessmentIdentity(context)

責任：

- 依固定優先順序解析身分。
- 決定身分狀態。
- 決定是否有單一安全更新目標。
- 不處理推薦碼與顧問歸屬。

### 3.7 buildHealthAssessmentLeadDecision(context)

責任：

- 將身分、候選名單及衝突結果轉成統一 decision 物件。
- 列出後續允許考慮的安全更新。
- 不執行任何 Sheet 寫入。

### 3.8 既有查找函式沿用原則

本階段不得修改：

- `findLeadByLineUserId()`
- `findLeadByPhone()`
- `createLead()`
- `updateExistingLead()`

後續可沿用既有查找函式的正規化或欄位名稱邏輯，但若函式只回傳第一筆，不可直接用於衝突判定。Task 03B-4C 應新增可回傳全部候選資料的唯讀查找函式。

所有手機查找必須先使用同一套 `normalizePhone` 規則，再以 normalizedPhone 比對；不得混用原始手機字串。

## 4. 標準化身分物件

建議格式：

```javascript
{
  identityStatus: "anonymous",
  lineUserId: "",
  lineDisplayName: "",
  lineIdentityVerified: false,
  userName: "",
  normalizedUserName: "",
  phone: "",
  normalizedPhone: "",
  phoneValid: false,
  email: "",
  hasExternalMinimumIdentity: false,
  hasTrustedLineIdentity: false,
  isTestData: true
}
```

規則：

- 姓名只去除首尾空白，不可任意改寫。
- `normalizedUserName` 第一版等於去除首尾空白後的姓名，不轉換字形或大小寫。
- 手機比對只使用 `normalizedPhone`。
- 第一版合法台灣手機為 10 位數且以 `09` 開頭。
- Email只保存，不作為第一順位比對。
- `hasExternalMinimumIdentity` 只有姓名非空白且手機合法時才為 true。
- `hasTrustedLineIdentity` 只有後端可信任驗證成功時才為 true。
- 不得保存 lineAccessToken。

建議 identityStatus：

- `anonymous`
- `incomplete_identity`
- `external_identified`
- `line_identified`
- `identity_conflict`
- `linked_to_lead`

## 5. LINE 身分可信任來源

### 5.1 目前架構落差

- `health-assessment.js` 目前送出 anonymous identity。
- Vercel proxy 目前拒絕 lineAccessToken。
- 前端自行傳入 lineUserId 或 lineIdentityVerified 不可信任。
- 現有 Apps Script 有 LINE access token 驗證能力，但健康評估流程尚未接入。

### 5.2 方案比較

| 方案 | 作法 | 優點 | 風險／限制 |
|---|---|---|---|
| A | 健康評估送出前，透過既有可信任 LINE 驗證流程取得後端確認的身分結果 | 可重用既有驗證能力；身分來源一致 | 需確認既有流程能否安全回傳短期身分結果，且不讓前端偽造 |
| B | 新增健康評估專用 LINE 身分驗證端點，由伺服器驗證 token但不保存 | 邊界清楚，可針對健康評估設計 | 增加端點、token傳輸與安全測試範圍 |
| C | 第一版只支援外部姓名＋手機建單，LINE 自動建單延後 | 範圍最小，較容易安全上線 | LINE 使用者體驗較差，無法直接依 LINE ID 銜接 |

### 5.3 已確認方案

採分階段方案：

1. Task 03B-4C 第一階段只完成外部姓名＋手機的身分解析、名單建立資格、候選名單查找及衝突判定，不啟用 LINE 自動建單。
2. Task 03B-4D 再處理 LINE 身分驗證及自動建單，優先評估方案 A；若既有流程無法安全提供健康評估使用，才評估方案 B。

理由：

- 目前健康評估流程完全沒有可信任 LINE 身分。
- 不應為了加快建單而信任前端布林值或 LINE ID。
- 先完成外部身分流程可縮小第一批正式資料風險。
- LINE 驗證應獨立完成安全評估與無 token 落地驗收。

所有方案必須符合：

- access token 不寫入 Sheet。
- access token 不寫入 log。
- access token 不寫入 referral_events。
- 不信任前端布林值。
- 驗證失敗時退回 anonymous 或 incomplete identity，不建立 LINE 名單。

## 6. 名單候選查找

### 6.1 查找結果物件

```javascript
{
  lineLeadCandidates: [],
  phoneLeadCandidates: [],
  sameLeadMatched: false,
  multipleLineMatches: false,
  multiplePhoneMatches: false,
  linePhoneConflict: false,
  nameMismatch: false,
  existingLead: null,
  candidateLeadIds: []
}
```

### 6.2 查找要求

不得只使用只回傳第一筆的 `findRecordByField()` 判定多筆衝突。

後續實作應能找出：

- 同一 LINE 使用者ID的所有有效名單。
- 同一正規化手機的所有有效名單。
- 是否為測試資料。
- 是否為無效、已合併或重複名單。
- 是否已有歸屬爭議。

### 6.3 可參與自動比對的有效名單

建議同時符合：

- 名單ID非空白。
- `名單有效性` 必須為「有效」。
- `是否測試資料` 不為「是」。
- `合併至名單ID` 為空白。
- `是否重複資料` 不為「是」。
- 不屬於已刪除或資料錯誤狀態。

停止聯繫名單仍可參與身分比對，但後續聯絡權限必須受保護。

若同一識別值存在多筆可參與比對的有效名單，直接進入人工審核，不選第一筆。

第一版不沿 `合併至名單ID` 自動尋找主名單。若候選只命中無效、重複或已合併資料：

- 不建立第二筆名單。
- 不自動更新任何 leads。
- 保存健康評估紀錄。
- 標記人工審核。

## 7. 決策結果物件

建議格式：

```javascript
{
  decisionCode: "ANONYMOUS_ASSESSMENT_ONLY",
  identityStatus: "anonymous",
  assessmentId: "HA000001",
  shouldCreateLead: false,
  shouldUpdateLead: false,
  shouldUpdateAssessmentLink: false,
  targetLeadId: "",
  targetLeadRowNumber: null,
  requiresManualReview: false,
  conflictType: "",
  candidateLeadIds: [],
  message: "已保存匿名健康評估，不建立CRM名單。",
  safeIdentityUpdates: {},
  healthSummaryUpdatesAllowed: false,
  contactConsentUpdatesAllowed: false,
  referralEvaluationRequired: false,
  eventTypeSuggested: "health_assessment_complete"
}
```

限制：

- decision 只描述後續可執行事項。
- 不直接包含或執行 Sheet 寫入。
- `targetLeadRowNumber` 只供後端內部使用，不回傳一般前端。
- 發生衝突時 `targetLeadId` 必須為空白。

## 8. 判定代碼

| decisionCode | 觸發條件 | 建立 | 更新 | 人工審核 | API建議 | 同步摘要 |
|---|---|---:|---:|---:|---|---:|
| TEST_DATA_ASSESSMENT_ONLY | `isTestData=true` | 否 | 否 | 否 | success / test_only | 否 |
| ANONYMOUS_ASSESSMENT_ONLY | 無可信任LINE、無姓名手機 | 否 | 否 | 否 | success / assessment_only | 否 |
| INCOMPLETE_EXTERNAL_IDENTITY | 姓名或手機缺一 | 否 | 否 | 否 | success / incomplete_identity | 否 |
| INVALID_PHONE | 有手機但格式不合法 | 否 | 否 | 否 | success / invalid_phone | 否 |
| EXTERNAL_CREATE_ALLOWED | 姓名＋合法手機，無候選 | 是 | 否 | 否 | success / create_allowed | 是 |
| EXTERNAL_UPDATE_ALLOWED | 姓名＋合法手機，唯一手機候選且姓名相符 | 否 | 是 | 否 | success / update_allowed | 是 |
| TRUSTED_LINE_CREATE_ALLOWED | 可信任LINE，無候選 | 是 | 否 | 否 | success / create_allowed | 是 |
| TRUSTED_LINE_UPDATE_ALLOWED | 可信任LINE，唯一LINE候選 | 否 | 是 | 否 | success / update_allowed | 是 |
| LINE_PHONE_SAME_LEAD | LINE與手機命中同一筆 | 否 | 是 | 否 | success / update_allowed | 是 |
| LINE_PHONE_CONFLICT | LINE與手機命中不同筆 | 否 | 否 | 是 | success / review_required | 否 |
| MULTIPLE_LINE_LEADS | 同LINE命中多筆有效名單 | 否 | 否 | 是 | success / review_required | 否 |
| MULTIPLE_PHONE_LEADS | 同手機命中多筆有效名單 | 否 | 否 | 是 | success / review_required | 否 |
| PHONE_NAME_MISMATCH | 手機唯一命中但姓名不同 | 否 | 否 | 是 | success / review_required | 否 |
| UNVERIFIED_LINE_IDENTITY | 前端有LINE ID但後端未驗證 | 否 | 否 | 視外部資料 | success / identity_unverified | 否 |
| EXISTING_LEAD_REVIEW_REQUIRED | 既有名單有身分、歸屬、重複或合併衝突 | 否 | 否 | 是 | HTTP 200 / review_required | 否 |
| CRM_STAGE_REVIEW_SUMMARY_ALLOWED | 身分唯一且無衝突，但CRM階段需人工確認=是 | 否 | 是 | 保留既有標記 | HTTP 200 / update_allowed | 是 |
| STOP_CONTACT_LEAD_FOUND | 唯一候選已停止聯繫 | 否 | 是 | 否 | success / contact_blocked | 是 |

`CRM_STAGE_REVIEW_SUMMARY_ALLOWED` 只允許同步健康摘要白名單及 health_assessments 名單連結，不得變更 CRM階段、顧問歸屬、人工確認狀態或人工欄位。

`STOP_CONTACT_LEAD_FOUND` 的更新只限健康摘要、評估連結及 health_assessments 處理結果；不更新 leads 的最近互動時間，也不允許恢復任何聯絡權限。

## 9. 判定優先順序

固定依序執行：

1. 檢查 `isTestData`。
2. 標準化身分資料。
3. 判斷 LINE 身分是否可信任。
4. 驗證手機格式。
5. 判斷外部訪客是否具備姓名＋手機。
6. 查找 LINE 與手機候選名單。
7. 先檢查多筆命中。
8. 再檢查 LINE與手機是否指向不同名單。
9. 再檢查手機相同但姓名不同。
10. 檢查既有名單是否已有人工審核狀態。
11. 產生建立、更新、只保存評估或人工審核決策。
12. 推薦碼與顧問歸屬留給後續專用步驟，不混入身分比對。

任何前序高風險條件成立後即停止後續自動建立／更新判定。

## 10. 主要場景決策表

| # | 場景 | decisionCode | 建立 | 更新 | targetLead | 摘要 | 聯絡權限 | 審核 | API建議 |
|---|---|---|---:|---:|---|---:|---|---:|---|
| 1 | 測試資料 | TEST_DATA_ASSESSMENT_ONLY | 否 | 否 | 無 | 否 | 不更新 | 否 | success / test_only |
| 2 | 完全匿名 | ANONYMOUS_ASSESSMENT_ONLY | 否 | 否 | 無 | 否 | 不更新 | 否 | success / assessment_only |
| 3 | 外部只有姓名 | INCOMPLETE_EXTERNAL_IDENTITY | 否 | 否 | 無 | 否 | 不更新 | 否 | success / incomplete_identity |
| 4 | 外部只有手機 | INCOMPLETE_EXTERNAL_IDENTITY | 否 | 否 | 無 | 否 | 不更新 | 否 | success / incomplete_identity |
| 5 | 外部手機格式錯誤 | INVALID_PHONE | 否 | 否 | 無 | 否 | 不更新 | 否 | success / invalid_phone |
| 6 | 姓名＋合法手機，無名單 | EXTERNAL_CREATE_ALLOWED | 是 | 否 | 新名單 | 是 | 後續分項保存 | 否 | success / create_allowed |
| 7 | 姓名＋合法手機，一筆名單 | EXTERNAL_UPDATE_ALLOWED | 否 | 是 | 唯一手機名單 | 是 | 後續分項保存 | 否 | success / update_allowed |
| 8 | 手機相同、姓名不同 | PHONE_NAME_MISMATCH | 否 | 否 | 無 | 否 | 不更新 | 是 | success / review_required |
| 9 | 同手機多筆有效名單 | MULTIPLE_PHONE_LEADS | 否 | 否 | 無 | 否 | 不更新 | 是 | success / review_required |
| 10 | 已驗證LINE，無名單 | TRUSTED_LINE_CREATE_ALLOWED | 是 | 否 | 新名單 | 是 | 後續分項保存 | 否 | success / create_allowed |
| 11 | 已驗證LINE，一筆名單 | TRUSTED_LINE_UPDATE_ALLOWED | 否 | 是 | 唯一LINE名單 | 是 | 後續分項保存 | 否 | success / update_allowed |
| 12 | 未驗證LINE ID | UNVERIFIED_LINE_IDENTITY | 否 | 否 | 無 | 否 | 不更新 | 視外部資料 | success / identity_unverified |
| 13 | LINE與手機同一名單 | LINE_PHONE_SAME_LEAD | 否 | 是 | 同一名單 | 是 | 後續分項保存 | 否 | success / update_allowed |
| 14 | LINE與手機不同名單 | LINE_PHONE_CONFLICT | 否 | 否 | 無 | 否 | 不更新 | 是 | success / review_required |
| 15 | LINE一筆、手機無 | TRUSTED_LINE_UPDATE_ALLOWED | 否 | 是 | LINE名單 | 是 | 安全補空白手機 | 否 | success / update_allowed |
| 16 | LINE無、手機一筆 | EXISTING_LEAD_REVIEW_REQUIRED | 否 | 否 | 無 | 否 | 不更新 | 是 | HTTP 200 / review_required |
| 17 | 同LINE多筆名單 | MULTIPLE_LINE_LEADS | 否 | 否 | 無 | 否 | 不更新 | 是 | success / review_required |
| 18 | 既有名單停止聯繫 | STOP_CONTACT_LEAD_FOUND | 否 | 是 | 唯一既有名單 | 是 | 不恢復 | 否 | success / contact_blocked |
| 19 | 既有名單有歸屬爭議 | EXISTING_LEAD_REVIEW_REQUIRED | 否 | 否 | 無 | 否 | 不更新 | 是 | success / review_required |
| 20 | 候選為無效或已合併資料 | EXISTING_LEAD_REVIEW_REQUIRED | 否 | 否 | 無 | 否 | 不更新 | 是 | success / review_required |

場景 16 第一版採人工確認：雖手機已找到名單，但新取得的 LINE ID 尚未與該名單建立可信任關聯，不直接補入。

姓名比對第一版只去除首尾空白後進行完全相同比對，不移除「先生」、「小姐」、「媽媽」等稱謂，不做模糊、同音或自動改寫。手機相同但姓名不同時，使用 `PHONE_NAME_MISMATCH`。

候選只命中無效、重複或已合併資料時，不沿 `合併至名單ID` 追蹤主名單，也不建立第二筆名單。

既有名單若 `CRM階段需人工確認 = 是`，但身分唯一且沒有 LINE、手機或姓名衝突，使用 `CRM_STAGE_REVIEW_SUMMARY_ALLOWED`：可以同步健康摘要及評估連結，但保留所有 CRM 人工判斷欄位。

## 11. 安全更新白名單

`safeIdentityUpdates` 只允許後續實作考慮：

- 空白的潛在會員姓名
- 空白的手機號碼
- 空白的電子信箱
- 經後端驗證且欄位為空的 LINE使用者ID
- 經後端驗證的 LINE顯示名稱

不得自動覆蓋既有非空白姓名、手機或 LINE使用者ID。

姓名不同、手機不同或 LINE ID不同時，必須產生衝突結果。

建議格式：

```javascript
{
  "潛在會員姓名": "王小明",
  "手機號碼": "0912345678"
}
```

物件只能包含已通過規則的欄位，不可包含 CRM階段、顧問歸屬或停止聯繫欄位。

## 12. 停止聯繫規則

找到 `是否停止聯繫 = 是` 的既有名單時：

- 可以將健康評估連結至該名單。
- 可以同步健康摘要。
- 可以更新 health_assessments 的處理結果。
- 不得更新 leads 的最近互動時間。
- 不得恢復LINE、電話或行銷權限。
- 不得清除停止聯繫狀態。
- 不得清除停止聯繫原因。
- 不得建立自動跟進工作。
- 不得觸發主動聯絡或行銷流程。
- decisionCode 使用 `STOP_CONTACT_LEAD_FOUND`。
- 後續事件不得被解讀為允許主動聯絡。
- `contactConsentUpdatesAllowed` 必須為 false。

在所有自動化流程都確認會優先檢查「是否停止聯繫」以前，不得放寬此規則。

## 13. API 回傳設計

### 13.1 一般使用者回傳

```json
{
  "status": "success",
  "success": true,
  "assessmentId": "HA000001",
  "leadLinkStatus": "review_required",
  "requiresManualReview": true,
  "userMessage": "健康評估已保存，名單資料將由服務人員確認。"
}
```

一般使用者只應看到：

- status
- success
- assessmentId
- leadLinkStatus
- requiresManualReview
- userMessage

若 health_assessments 已成功保存，但 CRM 因衝突無法自動建立或更新：

- HTTP 狀態使用 200。
- `status` 可使用 `success` 或 `partial_success`。
- `success` 只代表健康評估保存成功，不代表 CRM 銜接完成。
- `leadLinkStatus = review_required`。
- `requiresManualReview = true`。
- 建議訊息：「您的評估結果已安全保存，聯絡資料將由系統進一步確認。」

只有健康評估本身未成功保存時，才回傳真正的 request 錯誤狀態。

不得回傳：

- 其他候選名單姓名
- 其他候選名單手機
- 其他候選名單 LINE ID
- Sheet row number
- 內部顧問歸屬爭議細節

若前端 payload 出現自行指定的顧問ID、顧問姓名或顧問歸屬結果：

- 不接受為歸屬依據。
- 不因這些欄位單獨拒絕整筆健康評估。
- 忽略所有未列入 payload 白名單的顧問欄位。
- 顧問歸屬由後端依推薦碼及顧問主檔重新判定。
- 可在內部 decision 保留不含個資的安全警告代碼。
- 第一版不新增 Google Sheet 欄位保存安全警告。
- 不記錄前端提交的顧問資料內容。
- 不將 access token 或其他授權資訊寫入 log。

### 13.2 內部測試結果

內部無寫入測試可額外檢查 decisionCode、conflictType、candidateLeadIds，但不得輸出真實個資或 access token。

## 14. 無寫入測試設計

### 14.1 原則

- 使用假的 lead records。
- 使用假的 identity payload。
- 不呼叫 `appendObjectToSheet()`。
- 不呼叫 `updateObjectInSheet()`。
- 不呼叫 `createLead()`。
- 不呼叫 `updateExistingLead()`。
- 覆蓋第 10 節全部主要場景。

### 14.2 測試資料建構函式

建議：

```text
buildFakeHealthAssessmentIdentity(overrides)
buildFakeLeadRecord(overrides)
buildFakeCandidateLookupResult(overrides)
buildIdentityResolutionTestContext(overrides)
```

所有測試資料使用明顯虛構值及 `TEST_` 前綴，不讀正式 Sheet。

### 14.3 assertion 方法

建議：

```text
assertDecisionCode(actual, expected)
assertBooleanField(actual, fieldName, expected)
assertTargetLead(actual, expectedLeadId)
assertNoSensitiveFields(actual)
assertNoSheetWriteCalls(spies)
```

每個案例至少檢查：

- decisionCode
- shouldCreateLead
- shouldUpdateLead
- targetLeadId
- requiresManualReview
- healthSummaryUpdatesAllowed
- contactConsentUpdatesAllowed

### 14.4 確認沒有 Sheet 寫入

後續測試應以依賴注入或 spy 代替 Sheet 寫入函式：

```javascript
const spies = {
  appendObjectToSheet: createFailIfCalledSpy(),
  updateObjectInSheet: createFailIfCalledSpy(),
  createLead: createFailIfCalledSpy(),
  updateExistingLead: createFailIfCalledSpy()
};
```

任何 spy 被呼叫即測試失敗。純判斷函式不應接收 Spreadsheet、Sheet 或 row range 物件。

## 15. 後續實作邊界

### Task 03B-4C 才可實作

- 外部訪客姓名＋手機的身分解析純函式
- 手機正規化與格式驗證
- 外部身分候選名單查找
- 衝突判定
- 健康評估專用 lead 建立與更新
- health_assessments 回寫名單ID與處理狀態
- 不啟用 LINE 自動建單

### Task 03B-4D 才處理

- 前端姓名、手機、Email
- 分項聯絡同意
- LINE 身分驗證及自動建單流程

### Task 03B-4E 才處理

- 推薦碼
- 顧問歸屬
- 90天保護

### Task 03B-4F 才處理

- referral_events
- 正式／測試模式
- 完整驗收及正式上線

## 16. 已確認實作決策

以下決策已由使用者確認，Task 03B-4C 及後續實作必須遵守。

### 16.1 Task 03B-4C 第一階段身分範圍

Task 03B-4C 第一階段只實作外部訪客「姓名＋手機」的身分解析、名單建立資格及既有名單比對。

- LINE 自動建單不納入 Task 03B-4C。
- LINE 身分驗證及自動建單延至 Task 03B-4D。
- 未完成可信任 LINE 驗證前，前端傳入的 LINE 使用者ID不得作為建單或更新依據。

### 16.2 LINE ID無名單但手機已有名單

已驗證 LINE 使用者ID未找到名單，但手機命中一筆既有名單時：

- 第一版不得自動將 LINE 使用者ID補入手機名單。
- 不得自動建立第二筆名單。
- 健康評估紀錄可以保存。
- CRM 銜接結果標記為人工審核。
- 在完成手機所有權驗證機制前，不得自動綁定 LINE 與手機名單。

### 16.3 姓名比對規則

姓名比對第一版採：

- 去除首尾空白後完全相同。
- 不自動移除「先生」、「小姐」、「媽媽」或其他稱謂。
- 不進行模糊比對、同音比對或自動改寫。
- 手機相同但姓名不同時，不覆蓋既有姓名，標記人工審核。

### 16.4 無效、重複或已合併名單

第一版將以下資料排除於自動比對及自動更新：

- 名單有效性不是「有效」
- 是否重複資料為「是」
- 已填寫合併至名單ID
- 其他已標記無效、重複或已合併的名單

第一版不沿「合併至名單ID」自動尋找主名單。

若候選結果只命中上述排除資料：

- 不建立第二筆名單。
- 不自動更新任何 leads。
- 保存健康評估紀錄。
- 標記人工審核。

待合併資料品質與主名單規則另行驗證後，才評估支援安全的單層主名單追蹤。

### 16.5 CRM階段需人工確認

既有名單若為：

```text
CRM階段需人工確認 = 是
```

且身分比對結果本身明確、沒有 LINE／手機／姓名衝突時：

- 可以同步健康評估摘要白名單欄位。
- 可以更新 health_assessments 的名單連結與處理結果。
- 不得變更 CRM階段。
- 不得變更顧問歸屬。
- 不得修改 CRM階段需人工確認。
- 不得覆蓋人工備註、顧問跟進備註或其他人工欄位。

若同時存在身分衝突，仍不得更新 leads。

### 16.6 人工審核 API 狀態

若 health_assessments 已成功保存，但 CRM 因衝突無法自動建立或更新：

- HTTP 狀態使用 200。
- status 可使用 success 或 partial_success。
- success 代表健康評估保存成功，不代表 CRM 已完成。
- `leadLinkStatus = review_required`。
- `requiresManualReview = true`。
- 回傳使用者可理解的訊息，例如：「您的評估結果已安全保存，聯絡資料將由系統進一步確認。」
- 不得向一般使用者揭露其他候選名單或內部衝突資料。

只有健康評估本身未成功保存時，才回傳真正的 request 錯誤狀態。

### 16.7 前端自行指定顧問資料

若前端 payload 出現自行指定的顧問ID、顧問姓名或顧問歸屬結果：

- 不接受這些欄位作為歸屬依據。
- 不因這些欄位單獨拒絕整筆健康評估。
- 忽略所有未列入 payload 白名單的顧問欄位。
- 健康評估仍可依其他合法資料保存。
- 顧問歸屬必須由後端依推薦碼及顧問主檔重新判定。
- 可在內部 decision 結果保留不含個資的安全警告代碼。
- 第一版不新增 Google Sheet 欄位保存此安全警告。
- 不得記錄前端提交的顧問資料內容。
- 不得將 access token 或其他授權資訊寫入 log。

### 16.8 停止聯繫名單的更新範圍

既有名單若為：

```text
是否停止聯繫 = 是
```

第一版只允許：

- 將健康評估紀錄連結至該名單。
- 同步健康評估摘要白名單欄位。
- 更新 health_assessments 的處理結果。

第一版不得：

- 更新 leads 的最近互動時間。
- 恢復 LINE、電話或行銷聯絡權限。
- 清除停止聯繫狀態或原因。
- 建立自動跟進工作。
- 觸發任何主動聯絡或行銷流程。

在所有自動化流程都確認會優先檢查「是否停止聯繫」以前，不得放寬此規則。

## 17. 規格狀態

### 已確認規則

- 測試資料不建立或更新 leads。
- 外部訪客需姓名與合法手機。
- 可信任 LINE ID必須由後端驗證。
- 多筆命中及跨識別衝突不自動處理。
- LINE無名單但手機命中名單時，第一版人工審核。
- 姓名只去除首尾空白後完全相同比對。
- 無效、重複及已合併名單排除自動比對，不沿合併鏈找主名單。
- CRM階段需人工確認但身分無衝突時，可同步健康摘要白名單。
- 人工審核情境在評估已保存時回 HTTP 200 與 `review_required`。
- 前端指定顧問資料一律忽略，由後端重新判定。
- 停止聯繫狀態不得由健康評估流程解除。
- 停止聯繫名單不更新最近互動時間。
- 身分判定與推薦歸屬分離。

### 技術建議

- 新增健康評估專用純判斷函式。
- 候選查找必須回傳全部有效名單。
- decision 物件作為後續寫入層唯一輸入。
- 純函式測試以假的 records 與 fail-if-called spy 驗證無寫入。

### 待後續實作

- 純判斷函式與候選查找。
- 健康評估專用 lead 建立與更新。
- health_assessments 回寫。
- 前端聯絡資料、同意與 LINE 驗證。
- 推薦保護、事件及正式模式。

本階段未完成任何程式、資料寫入或正式服務修改。
