# Task 03A-14：Apps Script CRM 串接實作與測試完成紀錄

## 一、任務目的

本任務將 `leads_潛在會員名單` 新增的 CRM 欄位正式串接至 Apps Script 與顧問業務大廳。

本次完成：

- Apps Script 正式備份
- 推薦保護期同名函式修正
- 新名單 CRM 預設值寫入
- 顧問業務大廳優先顯示 CRM 階段
- 舊名單狀態備援
- 測試資料標記
- 顧問大廳排除測試資料
- Apps Script 測試
- 正式部署
- LINE LIFF 顧問大廳驗收

## 二、實作前備份

實作前已建立 Google Sheet 備份副本，並確認副本完整包含 Apps Script 檔案：

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

備份 Apps Script 已改名為：

```text
元馨醫管家_中央推薦碼Webhook_v1_BACKUP_20260618
```

備份專案只供回復使用，不得執行或部署。

## 三、同名函式修正

原本發現：

- `LeadService.gs` 定義 `applyReferralProtection()`
- `ReferralService.gs` 也定義 `applyReferralProtection()`
- 兩個函式參數與用途不同

因 Apps Script 各 `.gs` 檔案共用全域函式空間，存在同名函式覆蓋風險。

本次已重新命名：

```text
LeadService.gs
evaluateExistingLeadReferralProtection()
```

```text
ReferralService.gs
evaluateReferralCodeProtection()
```

`LeadService.gs` 的呼叫位置已同步修改。

已確認：

- `LeadService.gs` 找不到舊名稱 `applyReferralProtection`
- `ReferralService.gs` 找不到舊名稱 `applyReferralProtection`
- `Test.gs` 原本沒有呼叫舊名稱
- `程式碼.gs` 沒有直接呼叫舊名稱

## 四、同名函式測試

已在 `Test.gs` 建立：

```text
testReferralProtectionFunctionNames
```

測試結果：

- `evaluateExistingLeadReferralProtection()` 正常執行
- `evaluateReferralCodeProtection()` 正常執行
- 保護期內不同推薦碼仍維持既有規則
- 沒有寫入或修改 Google Sheet
- 執行完畢，無錯誤

## 五、新名單 CRM 預設值

`LeadService.gs` 的完整 `createLead()` 已加入 CRM 新名單預設值。

新名單會自動寫入：

```text
名單狀態：新名單
原名單狀態：新名單
CRM階段：01 新名單
CRM階段需人工確認：否
CRM階段更新時間：建立名單當下時間
CRM階段更新人：system
名單有效性：有效
是否重複資料：依手機號碼重複檢查結果
是否停止聯繫：否
```

舊 `名單狀態` 暫時保留，以維持既有程式、前端及報表相容性。

## 六、測試資料標記

`createLead()` 已支援：

```javascript
payload.isTestData === true
```

若為測試資料，Google Sheet 會寫入：

```text
是否測試資料：是
```

一般正式名單則寫入：

```text
是否測試資料：否
```

LINE、電話及行銷訊息授權欄位未自動填入，以避免在沒有客戶明確同意資料時代替客戶授權。

## 七、顧問業務大廳 CRM 階段

`ConsultantLeadService.gs` 的：

```text
formatLeadRecordForPortal()
```

已調整為：

- 新增回傳 `crmStage`
- `leadStatus` 優先使用 `CRM階段`
- `CRM階段` 空白時退回舊 `名單狀態`
- 新增回傳 `legacyLeadStatus`
- 新增回傳 CRM 人工確認與更新資訊
- 保留既有 `leadStatus`，避免前端中斷

正式回傳規則：

```text
crmStage：CRM階段
leadStatus：CRM階段優先，空白時使用名單狀態
legacyLeadStatus：舊名單狀態
```

## 八、舊版名單查詢相容

`LeadService.gs` 的：

```text
listConsultantLeads()
```

已同步調整為：

- 回傳 `crmStage`
- `leadStatus` 優先使用 `CRM階段`
- CRM 階段空白時使用舊 `名單狀態`
- 回傳 `legacyLeadStatus`
- 回傳 CRM 更新資訊
- 排除 `是否測試資料＝是` 的名單

新版與舊版查詢使用一致的 CRM 階段規則。

## 九、CRM 顯示測試

已在 `Test.gs` 建立：

```text
testCrmStagePortalFormatting
```

測試內容：

1. 有 CRM 階段時，`leadStatus` 優先顯示 CRM 階段。
2. CRM 階段空白時，退回舊名單狀態。
3. 舊名單狀態仍可透過 `legacyLeadStatus` 取得。

測試結果：

```text
CRM階段：03 已聯繫
leadStatus：03 已聯繫
legacyLeadStatus：新名單
```

備援測試結果：

```text
CRM階段：空白
leadStatus：培育中
legacyLeadStatus：培育中
```

執行完畢，無錯誤。

## 十、實際建立測試名單

已在 `Test.gs` 建立：

```text
testCreateLeadWithCrmDefaults
```

本次實際建立測試名單：

```text
名單ID：LD000007
LINE使用者ID：TEST_CRM_20260618_1443
LINE顯示名稱：Task03A CRM測試
潛在會員姓名：Task03A CRM測試名單
歸屬顧問ID：HC0000
歸屬顧問姓名：元馨醫管家官方
```

Google Sheet CRM 欄位驗收結果：

| 欄位 | 結果 |
|---|---|
| 原名單狀態 | 新名單 |
| CRM階段 | 01 新名單 |
| CRM階段需人工確認 | 否 |
| CRM階段更新時間 | 已自動寫入 |
| CRM階段更新人 | system |
| 名單有效性 | 有效 |
| 是否測試資料 | 是 |
| 是否重複資料 | 否 |
| 是否停止聯繫 | 否 |

測試名單保留於 Google Sheet 作為測試證據，不刪除。

## 十一、實際資料讀回測試

已在 `Test.gs` 建立：

```text
testReadCreatedLeadCrmDefaults
```

測試結果：

- 成功讀取 `LD000007`
- Sheet CRM 階段為 `01 新名單`
- 是否測試資料為 `是`
- 顧問大廳 `crmStage` 為 `01 新名單`
- 顧問大廳 `leadStatus` 為 `01 新名單`
- 舊名單狀態保留為 `新名單`
- 手機號碼已遮罩
- 顧問歸屬與推薦碼正確

執行完畢，無錯誤。

## 十二、排除測試資料

測試名單建立後，顧問大廳的推薦名單由 4 筆增加為 5 筆。

為避免測試資料污染正式顧問統計，本次已調整：

```text
listConsultantLeadsForPortal()
listTeamLeadsForPortal()
listConsultantLeads()
```

以上函式均會排除：

```text
是否測試資料＝是
```

排除規則只影響顧問大廳與 API 顯示，不會刪除 Google Sheet 原始測試資料。

## 十三、排除測試資料驗證

已在 `Test.gs` 建立：

```text
testExcludeTestLeadsFromPortal
```

測試結果：

```text
portalLeadCount：4
legacyLeadCount：4
excludedTestLeadId：LD000007
portalHasTestLead：false
legacyHasTestLead：false
```

執行完畢，無錯誤。

正式部署後再次開啟 LINE LIFF 顧問大廳，確認：

- 我的推薦名單恢復為 4 筆
- `Task03A CRM測試名單` 不再出現在顧問大廳
- Google Sheet 仍保留 `LD000007`
- 測試資料不計入正式顧問名單統計

## 十四、正式部署紀錄

實作前正式部署版本：

```text
版本 14
```

第一批 CRM 串接部署：

```text
版本 15
```

版本 15 說明：

```text
Task 03A-14：CRM新名單預設值、CRM階段顯示與推薦保護函式修正
```

排除測試資料部署：

```text
版本 16
```

版本 16 說明：

```text
Task 03A-14：排除測試名單，不計入顧問與團隊名單
```

本次採更新既有 Web App 部署，原 Web App 網址維持不變，因此不需更換前端、LIFF 或既有串接網址。

## 十五、Web App 健康檢查

部署後已開啟正式 Web App 網址。

回傳結果包含：

```text
status：success
message：元馨醫管家中央推薦碼Webhook正常運作
service：元馨醫管家_中央推薦碼Webhook_v1
```

健康檢查正常。

## 十六、LINE LIFF 顧問大廳驗收

正式測試網址：

```text
https://liff.line.me/2009597152-9nSswjnk?portal=consultant
```

驗收結果：

- 顧問身分正常辨識
- 顧問資料正常顯示
- 官方帳號 HC0000 正常登入
- 顧問權限正常
- 我的推薦名單可正常載入
- CRM 階段顯示為 `01 新名單`
- 不再只顯示舊版 `新名單`
- 顧問資源中心正常顯示
- 顧問限定資源正常顯示
- 公開連結資源正常顯示
- Google Drive 顧問專用資料夾可正常開啟
- 測試資料排除後，推薦名單恢復為 4 筆

## 十七、推薦事件觀察

重新開啟顧問大廳時，`referral_events_推薦事件紀錄` 新增：

```text
EV000084
EV000085
```

兩筆事件均為進入頁面事件：

- 未建立名單
- 未更新既有名單
- 未覆蓋既有推薦事件
- 未破壞 CRM 資料

目前前端進入顧問大廳仍會寫入一般推薦事件。

此行為不是本次 CRM 串接造成，但會使顧問內部操作混入客戶推薦事件統計，後續應另案調整：

```text
portal=consultant 時，不寫入一般客戶推薦事件
```

## 十八、載入效能觀察

LINE LIFF 從網址進入顧問大廳約需：

```text
6～8 秒
```

目前 MVP 可正常使用，但正式擴大使用前仍需優化。

已知可能原因：

- LINE LIFF 初始化
- Apps Script 冷啟動
- 顧問資料重複讀取
- 名單資料重複讀取
- 顧問資源中心另行查詢
- Google Sheet 整表讀取
- 多位使用者同時查詢時可能增加等待時間

後續應另建效能優化任務，處理：

- 共用一次批次讀取結果
- 減少重複讀取顧問表
- 減少重複讀取名單表
- 加入短時間快取
- 記錄前端與 Apps Script 各階段耗時
- 進行多人同時使用測試

目標載入時間：

```text
約 2～4 秒
```

## 十九、本次修改檔案

線上 Apps Script 已修改：

- `LeadService.gs`
- `ReferralService.gs`
- `ConsultantLeadService.gs`
- `Test.gs`

未修改：

- `Config.gs`
- `SheetService.gs`
- `EventService.gs`
- `LineAuthService.gs`
- `ConsultantResourceService.gs`
- 前端 `index.html`
- 前端 `referral.js`

Google Sheet 除新增一筆正式標記的測試名單外，未刪除、搬移或改名既有欄位。

## 二十、本階段結論

Task 03A-14 已完成：

- Apps Script 備份
- 推薦保護期同名函式修正
- 新名單 CRM 預設值
- 測試資料標記
- 顧問大廳 CRM 階段顯示
- 舊名單狀態備援
- 測試名單排除
- 單元測試
- 實際 Sheet 寫入與讀回測試
- 正式 Web App 部署
- LINE LIFF 顧問大廳驗收

目前正式顧問大廳已可顯示新版 CRM 階段，並維持舊資料相容性。

後續優先任務：

1. 顧問大廳不寫入一般推薦事件。
2. 顧問大廳載入效能優化。
3. CRM 階段編輯與聯繫管理功能。

## 二十一、Task 03A-15：排除顧問入口 page_view 推薦事件

完成日期：2026-06-22

### 1. 問題背景

顧問大廳每次開啟時，也會被 referral.js 當成一般會員入口，向 referral_events_推薦事件紀錄寫入「進入頁面」事件。

顧問大廳查詢本身使用 getConsultantDashboard、getConsultantResources 等顧問專用 action，不應被計入一般推薦 page_view。

### 2. 修正內容

- referral.js 新增 getPortalMode()。
- referral.js 新增 isConsultantPortal()。
- portal=consultant 時，initializeReferralTracking() 跳過 page_view。
- window.YuanxinReferral 對外公開 getPortalMode 與 isConsultantPortal。
- queryConsultantPortal()、推薦碼、LINE 綁定及其他追蹤功能不變。

### 3. 檢查與初次驗證

- JavaScript 語法檢查通過。
- git diff --check 通過。
- 修改檔案只有 referral.js。
- 程式已合併至 main 並部署至 Vercel Production。
- 顧問資料、推薦名單及顧問資源中心仍正常。
- 正式測試仍產生 EV000088。
- 後續確認不是顧問 API 寫入，而是顧問入口第一次載入仍送出 page_view。

### 4. 階段結論

Task 03A-15 完成直接 portal=consultant 的事件排除，但 LINE LIFF 的實際重導流程仍需進一步處理。

## 二十二、Task 03A-16：固定顧問入口初始判斷

完成日期：2026-06-22

### 1. 問題背景

referral.js 原本在 DOMContentLoaded 時重新讀取 window.location.search。若 LIFF 或重導過程改變網址，可能失去最初的 portal=consultant 判斷。

### 2. 修正內容

- referral.js 載入時立即保存初始顧問入口狀態。
- 優先使用 window.YUANXIN_INITIAL_VIEW.isConsultantPortal。
- 若沒有既有初始判斷，再讀取初始網址 portal。
- isConsultantPortal() 改為回傳固定初始狀態。
- 後續網址變動不再影響顧問入口判斷。
- 一般會員入口、queryConsultantPortal、推薦碼及 LINE 綁定流程不變。

### 3. 檢查與正式驗證

- JavaScript 語法檢查通過。
- git diff --check 通過。
- 修改檔案只有 referral.js。
- 程式已合併至 main 並部署至 Vercel Production。
- 線上 referral.js 已確認包含 initialIsConsultantPortal。
- 實際測試仍產生 EV000089。
- EV000089 的頁面網址只有 https://yuanxin-liff-demo.vercel.app/，沒有 portal=consultant。

### 4. 階段結論

Task 03A-16 排除了 DOMContentLoaded 前後網址變動的影響，並進一步確認真正原因是 LINE LIFF 第一次載入時將 portal 參數包入 liff.state。

## 二十三、Task 03A-17：支援 LIFF liff.state 顧問入口判斷

完成日期：2026-06-22

### 1. 正式入口與根因

正式顧問入口：

https://liff.line.me/2009597152-9nSswjnk?portal=consultant

LINE LIFF 第一次載入 Endpoint URL 時，會將 portal=consultant 包入 liff.state。原本 index.html 與 referral.js 只讀取直接的 portal，因此第一次載入時被誤判為一般會員入口並送出 page_view。

### 2. 修正內容

- index.html 最早期 YUANXIN_INITIAL_VIEW 判斷支援 liff.state。
- referral.js 初始顧問入口判斷支援 liff.state。
- 直接 portal 參數仍具有優先權。
- 支援 liff.state 中的 ?portal=consultant、portal=consultant、/?portal=consultant。
- portal 比對忽略前後空白及英文大小寫。
- liff.state 不加入追蹤網址白名單，也不寫入 referral_events。
- 一般會員入口 page_view、queryConsultantPortal、推薦碼及 LINE 綁定流程不變。

### 3. 程式檢查

- JavaScript 語法檢查通過。
- index.html 內嵌 JavaScript 語法檢查通過。
- git diff --check 通過。
- 六項 portal 與 liff.state 情境測試全部通過。
- 修改檔案只有 index.html 與 referral.js。

### 4. 正式環境驗收

- 程式已合併至 main。
- Vercel Production 已完成部署。
- 使用正式 LIFF 顧問入口重複開啟測試。
- 顧問大廳功能正常。
- referral_events_推薦事件紀錄沒有新增。
- leads_潛在會員名單沒有誤新增。

### 5. 最終結論

Task 03A-17 正式驗收通過。顧問入口不再被誤計為一般推薦 page_view，也不會誤建立潛在會員名單。
