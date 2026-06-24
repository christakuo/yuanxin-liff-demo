# Task 03B-4A：健康評估與 CRM 名單銜接規格

更新日期：2026-06-24

## 1. 任務定位

本任務負責定義健康評估完成後，如何依訪客身分、聯絡資料、同意狀態、既有名單、推薦碼及 90 天保護規則，安全建立或更新 `leads_潛在會員名單`。

本文件只建立規格，不直接修改前端、Apps Script、Google Sheet、Vercel、LINE LIFF 或 LINE Rich Menu。

## 2. 正式分工

- Task 03B-4A：建立 CRM 銜接完整規格與決策表。
- Task 03B-4B：核對並設計後端身分解析、名單比對及衝突判定。
- Task 03B-4C：實作健康評估專用 lead 建立與摘要更新。
- Task 03B-4D：實作前端聯絡資料、LINE 身分及分項聯絡同意流程。
- Task 03B-4E：實作推薦碼、顧問歸屬及 90 天保護整合。
- Task 03B-4F：實作 referral_events、測試模式、正式模式及完整驗收。

## 3. 已確認的身分與建單原則

### 3.1 外部訪客

外部訪客建立或更新 CRM 名單的最低必要資料：

- 姓名：必填。
- 手機號碼：必填。
- Email：選填。

只有姓名、只有手機或只有 Email，均不足以建立或更新 CRM 名單。

資料不足時：

- 仍可保存 `health_assessments_健康評估紀錄`。
- 不建立 leads。
- 不更新 leads。
- 健康評估紀錄保留 `anonymous` 或 `incomplete_identity` 身分狀態。

### 3.2 已驗證 LINE 訪客

已驗證 LINE 訪客可依後端驗證取得的 LINE 使用者ID建立或更新 CRM 名單，不強制先填姓名與手機。

規則：

- LINE 使用者ID必須由可信任的 LINE 驗證流程取得。
- 不得信任前端任意傳入的 LINE 使用者ID。
- LINE 顯示名稱可保存。
- 後續可再引導補齊姓名、手機及 Email。
- 未完成 LINE 驗證者不得宣稱為 `line_identified`。

### 3.3 Email

- Email 為選填。
- Email 不作為第一版唯一建單依據。
- Email 不作為自動合併名單的唯一依據。

### 3.4 測試資料

只要 `isTestData = true`：

- 只允許寫入 health_assessments。
- 禁止建立 leads。
- 禁止更新 leads。
- 禁止改變顧問歸屬。
- 第一階段不寫正式 referral_events。
- 後端規則必須優先於前端值，前端不可自行開啟正式模式。

## 4. 健康評估紀錄與 CRM 的關係

`health_assessments_健康評估紀錄` 是每次評估的完整歷史紀錄，採 append-only。

`leads_潛在會員名單` 是 CRM 主表，只保存最近一次健康評估摘要。

建立或更新名單成功後，health_assessments 應回寫：

- 名單ID
- 最後更新時間
- 最後更新人
- 實際身分狀態
- 是否有效推薦碼
- 歸屬顧問ID
- 歸屬顧問姓名
- 事件處理狀態
- 異常原因或人工審核原因

不得覆蓋原始題目答案及原始評估結果。

## 5. leads 健康摘要同步欄位

允許同步：

- 是否已填健康評估 = 是
- 健康評估ID = 最近一次成功評估ID
- 初步風險等級
- 主要健康關注
- 健康評估摘要
- 顧問跟進重點
- 是否建議優先諮詢
- 最近互動時間
- 最後更新時間
- 最後更新人

只有在使用者明確提供且符合規則時，才可補入：

- 潛在會員姓名
- 手機號碼
- 電子信箱
- LINE使用者ID
- LINE顯示名稱

不得因健康評估重設或覆蓋：

- CRM階段
- 原名單狀態
- 名單狀態
- 既有顧問歸屬
- 停止聯繫狀態
- 人工備註
- 顧問跟進備註
- 成交、付款、簽約或預約狀態
- 其他非健康評估流程負責的 CRM 欄位

## 6. 聯絡同意與 CRM 建單分離

建立或更新 CRM 名單，不等於使用者同意接受聯絡或行銷。

必須分別保存：

- 是否允許LINE訊息
- 是否允許電話聯繫
- 是否允許行銷訊息

未勾選者保存為「否」，不得推定為「是」。

開始評估的個資蒐集同意、健康資料使用同意及健康建議同意，不得直接等同上述三項聯絡權限。

若既有名單已標記「是否停止聯繫 = 是」：

- 可以保存新的健康評估紀錄。
- 可以更新健康評估摘要。
- 不得自動恢復聯絡權限。
- 不得清除停止聯繫狀態。
- 不得因新同意直接恢復主動聯絡，必須另有正式恢復流程。

## 7. 名單辨識優先順序

### 7.1 LINE 訪客

1. 先以已驗證 LINE 使用者ID查找名單。
2. 若同時取得手機，再以正規化手機查找。
3. LINE與手機指向同一筆名單：更新該筆名單。
4. LINE與手機指向不同名單：不得自動合併，也不得更新兩筆；保存評估紀錄並標記人工審核。
5. LINE ID沒有名單、手機已有名單時：不得直接新增另一筆；需依安全規則決定是否將已驗證 LINE ID補入手機名單，第一版建議標記人工確認。
6. LINE ID已有名單、手機沒有名單時：更新 LINE 名單，手機僅在欄位為空且資料通過驗證時補入。

### 7.2 外部訪客

1. 必須同時具備姓名與手機。
2. 手機必須先正規化後比對。
3. 手機已有名單：更新既有名單，不新增重複名單。
4. 手機沒有名單：建立新名單。
5. 姓名不同但手機相同：不自動覆蓋既有姓名，標記人工確認。
6. Email 不參與第一順位自動合併。

## 8. 手機正規化

所有查找、建立及更新前，手機應使用一致的 `normalizePhone` 規則。

至少移除：

- 空白
- 連字號
- 括號
- 其他非數字字元

第一版應驗證台灣手機格式是否為 10 位數且以 `09` 開頭。

不符合格式時：

- 健康評估紀錄仍可保存。
- 不建立或更新 CRM 名單。
- 回傳可理解的資料不完整狀態。
- 不得以未正規化手機直接比對。

## 9. 建立新名單規則

新名單預設：

- CRM階段 = 01 新名單
- 名單狀態 = 新名單
- 原名單狀態 = 新名單
- 名單有效性 = 有效
- 是否停止聯繫 = 否
- 是否已填健康評估 = 是
- 是否已預約諮詢 = 否
- 是否已簽會員合約 = 否
- 是否已付款 = 否
- 健康評估摘要欄位於建立時一併寫入
- 是否測試資料 = 否，因測試資料禁止建立 leads

入口資料不得固定寫成 LINE，需依實際入口分別設定：

- LINE 訪客
- 顧問推薦入口
- 官方網站
- 廣告或外部活動
- 自行加入
- 其他

建議新增健康評估專用函式，不直接使用現有 `createLead()`：

- `resolveHealthAssessmentLead()`
- `createLeadFromHealthAssessment()`
- `updateLeadFromHealthAssessment()`
- `buildHealthAssessmentLeadUpdates()`

不得破壞既有 `referral_event` 或 `bind_line_referral` 流程。

## 10. 更新既有名單規則

更新既有名單時：

- 不重設 CRM階段。
- 不自動改變既有顧問歸屬。
- 不自動清除歸屬爭議。
- 不覆蓋既有非空白姓名、手機、Email。
- 不自動把外部訪客標記為已加入 LINE。
- 只更新健康評估白名單欄位及必要的互動時間。
- 所有更新使用欄位名稱，不使用固定欄號。

## 11. 推薦碼及顧問歸屬

所有推薦碼及顧問資料由後端重新驗證，不信任前端傳入的顧問ID或顧問姓名。

### 11.1 新名單

- 有效推薦碼：歸屬有效顧問。
- 無推薦碼或無效推薦碼：歸屬 `HC0000`。
- 啟動 `CONFIG.REFERRAL_PROTECTION_DAYS` 定義的保護期。
- 不得在函式內寫死 90 天。

### 11.2 既有名單

- 已有顧問歸屬：原則上保留。
- 沒有顧問歸屬：有效推薦碼可補入顧問；否則補入 `HC0000`。
- 保護期內收到不同推薦碼：保留原顧問，不改派。
- 保護期後收到不同推薦碼：不自動改派，標記待審核。
- 無效推薦碼不得改變既有名單歸屬。
- 必須分別記錄原始提交推薦碼、是否有效及實際歸屬結果。

## 12. 特殊衝突處理

以下情況不得自動合併或自動改派：

- LINE ID與手機命中不同名單。
- 同手機但姓名明顯不同。
- 同一手機存在多筆有效名單。
- 保護期後收到不同顧問推薦。
- 已有歸屬爭議尚未處理。
- 身分資訊來源未經驗證。
- 停止聯繫狀態與新聯絡授權發生衝突。

處理原則：

- 先保存健康評估紀錄。
- 不修改有衝突的 leads。
- 在 health_assessments 保存事件處理狀態與異常原因。
- 後續 referral_events 可記錄衝突事件。
- 由人工審核，不得自動刪除或合併名單。

## 13. 健康評估完成事件

預計於 Task 03B-4F 新增：

- `health_assessment_complete`
- `health_assessment_lead_created`
- `health_assessment_lead_updated`
- `health_assessment_identity_conflict`
- `health_assessment_referral_review`

事件只保存必要摘要，不保存 Q01～Q12 完整健康答案。完整答案只存 health_assessments。

測試事件必須可辨識為測試資料；正式規格確認前，測試模式可先不寫 referral_events。

## 14. 後端正式模式控制

正式或測試模式必須由後端設定控制。

前端送出的 `isTestData` 不可作為唯一信任來源。

正式開關建議放在 `Config.gs` 或部署版本設定中，並由後端決定：

- 是否允許建立或更新 leads
- 是否寫 referral_events
- 是否允許正式資料
- 是否允許顧問歸屬處理

切換正式模式前必須完成完整驗收。

## 15. 既有程式核對結果

本節記錄既有程式盤點中已確認的內容；實作前仍須再次核對線上 Apps Script 最新版本。

### 15.1 HealthAssessmentService.gs

已確認：

- 目前只寫 health_assessments。
- 身分資料目前皆為選填保存。
- 缺少姓名或手機仍可保存匿名評估。
- 尚未建立或更新 leads。
- 尚未寫 referral_events。

### 15.2 LeadService.gs

已確認：

- `createLead()` 固定寫入 LINE選單、LINE、已加入LINE，不適用所有健康評估入口。
- `createLead()` 固定寫入是否已填健康評估 = 否。
- `updateExistingLead()` 尚未同步健康評估摘要欄位。
- `updateExistingLead()` 可能把外部訪客誤設為已加入LINE。
- 手機查找目前未統一使用 `normalizePhone`。
- `createLead()` 的保護天數目前寫死 90 天。

建議規則：

- 新增健康評估專用建立及更新函式。
- 既有 `createLead()` 保留給原流程，避免影響 `referral_event` 與 `bind_line_referral`。

### 15.3 ReferralService.gs

可沿用：

- `validateReferralCode()`
- `findConsultantByReferralCode()`
- `resolveReferralConsultant()`

`evaluateReferralCodeProtection()` 不宜直接套用，因為：

- 目前主要比較推薦碼，而非完整顧問歸屬狀態。
- 日期解析未統一使用 `parseSheetDate`。
- `shouldChangeOwner` 永遠為 false。
- 尚未完整處理既有名單無歸屬的補入規則。
- 前端顧問資料不得直接信任。

## 16. API payload 預計新增欄位

後續 payload 規格至少包含：

```text
identity.identityStatus
identity.lineUserId
identity.lineDisplayName
identity.userName
identity.phone
identity.email
identity.lineIdentityVerified
leadLinkingIntent
contactConsent.allowLineMessages
contactConsent.allowPhoneContact
contactConsent.allowMarketingMessages
contactConsent.version
contactConsent.consentedAt
sourceContext.referralCode
sourceContext.entryType
sourceContext.pageUrl
sourceContext.referrer
sourceContext.utmSource
sourceContext.utmMedium
sourceContext.utmCampaign
sourceContext.eventCode
sourceContext.campaignCode
sourceContext.portal
sourceContext.source
```

不得接收或保存：

- lineAccessToken
- URL hash
- 身分證字號
- 未經規格確認的詳細病史自由文字
- 前端自行指定的顧問歸屬結果

## 17. 驗收案例

事件欄位中的「否」代表第一階段不寫正式 referral_events；「是」代表正式模式啟用後寫入必要摘要。

| # | 案例 | 保存評估 | 建立／更新 lead | 摘要同步 | 顧問與 CRM | 聯絡權限／審核／事件 | API 預期 |
|---|---|---|---|---|---|---|---|
| 1 | 完全匿名 | 是 | 否／否 | 否 | 無歸屬；CRM不變 | 無權限；免審；事件否 | success，`anonymous` |
| 2 | 外部僅姓名 | 是 | 否／否 | 否 | 無歸屬；CRM不變 | 依勾選保存於評估；免審；事件否 | success，`incomplete_identity` |
| 3 | 外部僅手機 | 是 | 否／否 | 否 | 無歸屬；CRM不變 | 依勾選保存於評估；免審；事件否 | success，`incomplete_identity` |
| 4 | 外部姓名＋合法手機 | 是 | 手機無名單則建／有名單則更新 | 是 | 新名單依ref或HC0000，CRM=01；既有不改階段 | 分項保存；無衝突免審；事件是 | success，回傳 lead action |
| 5 | 外部姓名＋手機＋Email | 是 | 同案例4 | 是 | 同案例4 | 分項保存；無衝突免審；事件是 | success |
| 6 | 手機已有名單 | 是 | 否／是 | 是 | 保留既有顧問與CRM | 分項保存但不解除停止聯繫；事件是 | success，`lead_updated` |
| 7 | 手機已有名單但姓名不同 | 是 | 否／否 | 否 | 不改顧問與CRM | 人工審核；事件衝突 | success，`review_required` |
| 8 | 已驗證 LINE ID已有名單 | 是 | 否／是 | 是 | 保留既有顧問與CRM | 分項保存；事件是 | success，`lead_updated` |
| 9 | 已驗證 LINE ID無名單 | 是 | 是／否 | 是 | 有效ref或HC0000；CRM=01 | 分項保存；事件是 | success，`lead_created` |
| 10 | 未驗證 LINE ID | 是 | 否／否 | 否 | 不信任前端LINE資料 | 人工或補驗證；事件衝突 | success，`identity_unverified` |
| 11 | LINE與手機同一名單 | 是 | 否／是 | 是 | 保留既有顧問與CRM | 分項保存；免審；事件是 | success，`lead_updated` |
| 12 | LINE與手機不同名單 | 是 | 否／否 | 否 | 兩筆皆不改 | 必須人工審核；事件衝突 | success，`review_required` |
| 13 | 新名單＋有效ref | 是 | 是／否 | 是 | 歸屬有效顧問；CRM=01；啟動保護期 | 分項保存；事件是 | success，`lead_created` |
| 14 | 新名單無ref | 是 | 是／否 | 是 | 歸屬HC0000；CRM=01 | 分項保存；事件是 | success |
| 15 | 新名單無效ref | 是 | 是／否 | 是 | 歸屬HC0000，記錄ref無效；CRM=01 | 分項保存；事件是 | success，附referral結果 |
| 16 | 既有名單保護期內不同ref | 是 | 否／是 | 是 | 保留原顧問與CRM | 免改派；事件是 | success，`owner_protected` |
| 17 | 既有名單保護期後不同ref | 是 | 否／僅無衝突摘要 | 視衝突規則 | 不自動改派；CRM不變 | 人工審核；事件審核 | success，`review_required` |
| 18 | 既有名單已停止聯繫 | 是 | 否／僅摘要 | 是 | 顧問與CRM不變 | 不恢復權限；事件是 | success，`contact_blocked` |
| 19 | 不同意三項聯絡 | 是 | 依身分規則 | 是 | 依一般歸屬；CRM依新舊規則 | 三項皆否；事件是 | success |
| 20 | `isTestData=true` | 是 | 否／否 | 否 | 不改顧問與CRM | 測試模式；事件否 | success，`test_only` |
| 21 | 前端傳 lineAccessToken | 否 | 否／否 | 否 | 不處理 | 不處理；事件否 | 400，`forbidden_field` |
| 22 | 前端指定顧問ID | 是 | 依身分規則 | 視結果 | 忽略前端顧問ID，由後端ref驗證 | 可記安全異常；事件視模式 | 400 或 success附忽略警告，實作前定案 |
| 23 | 手機格式不合法 | 是 | 否／否 | 否 | 無歸屬；CRM不變 | 依評估同意保存；事件否 | success，`invalid_phone` |
| 24 | 同手機多筆有效名單 | 是 | 否／否 | 否 | 全部不改 | 必須人工審核；事件衝突 | success，`review_required` |

## 18. 第一版納入與不納入

### 18.1 第一版納入

- 匿名評估保存
- 外部訪客姓名＋手機建單
- 已驗證 LINE ID建單或更新
- 健康摘要同步
- CRM階段保護
- 推薦碼與顧問歸屬
- 90天保護
- 分項聯絡同意
- 身分衝突人工審核
- 測試／正式模式控制

### 18.2 第一版不納入

- 自動合併重複名單
- 自動改派既有顧問
- Email單獨建單
- 完整行銷自動化
- 自動恢復停止聯繫
- 自動醫療診斷
- 儲存LINE access token
- 多層獎金結算
- 未經確認修改既有 Sheet 欄位

## 19. 後續執行順序

1. Task 03B-4B：後端身分解析與衝突判定設計。
2. Task 03B-4C：健康評估專用 lead 建立與摘要更新。
3. Task 03B-4D：前端聯絡資料與分項同意流程。
4. Task 03B-4E：推薦碼、顧問歸屬及 90 天保護。
5. Task 03B-4F：事件紀錄、測試模式、正式驗收與上線。

## 20. 規格狀態說明

### 已確認規則

- health_assessments 採 append-only，leads 只保存最近摘要。
- 外部訪客需姓名與合法手機才可建立或更新 lead。
- 已驗證 LINE ID可作為建單或查找依據。
- 測試資料不得建立或更新 leads。
- 既有名單不得因健康評估重設 CRM 階段或自動改派顧問。
- 停止聯繫狀態不得由健康評估流程自動解除。

### 建議規則

- 使用健康評估專用 lead 建立與更新函式。
- 後端控制測試／正式模式。
- 衝突情境統一回傳 `review_required`，不自動合併。
- 健康評估事件只保存必要摘要。

### 後續待實作

- 線上 Apps Script 最新程式再次核對。
- 身分解析、手機正規化與衝突判定。
- 健康摘要白名單更新。
- 前端聯絡資料與分項同意。
- 推薦保護及事件寫入。
- 測試模式、正式模式與完整驗收。

本階段未完成任何程式、正式資料、部署或第三方服務設定修改。
