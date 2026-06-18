# Task 03A-12：Apps Script 與 CRM 新增欄位影響檢查

## 一、檢查目的

確認 `leads_潛在會員名單` 在既有最後欄位 `BA：內部備註` 右側新增 `BB:BX` CRM 欄位後，是否影響：

- 名單建立與更新
- 推薦事件寫入
- 顧問業務大廳
- Google Sheet 資料讀寫
- 既有 Apps Script 功能

本階段只進行影響檢查，尚未修改、執行或部署 Apps Script。

## 二、已檢查檔案

本次已檢查線上 Apps Script：

- `SheetService.gs`
- `LeadService.gs`
- `ReferralService.gs`
- `EventService.gs`
- `ConsultantLeadService.gs`

前端專案已確認：

- `index.html`
- `referral.js`

## 三、SheetService 檢查結果

`SheetService.gs` 主要採用欄位名稱對應資料：

- `getHeaderMap()` 依標題列建立欄位對照
- `getAllRecords()` 依實際最後欄讀取整張表
- `appendObjectToSheet()` 依欄位名稱寫入資料
- `updateObjectInSheet()` 先讀取整列，再更新指定欄位
- 寫入範圍會依 `sheet.getLastColumn()` 自動調整

因此新增 `BB:BX` 後：

- 不會改變既有欄位位置
- 不會因新增欄位造成固定欄數不一致
- 不會造成既有欄位寫入錯位
- 更新既有名單時不會清除其他 CRM 欄位
- `setValues()` 寫入欄數會配合 Sheet 實際欄數

整體判斷：低風險。

## 四、新名單建立落差

`LeadService.gs` 的 `createLead()` 目前會建立舊版名單資料，但尚未寫入新的 CRM 欄位。

因此未來由系統自動建立的新名單，可能出現：

- `CRM階段` 空白
- `CRM階段需人工確認` 空白
- 其他 CRM 管理欄位未帶入預設值

目前第 2～7 列手動填入的預設值，只適用既有名單，不會自動套用到未來新名單。

後續修改 Apps Script 時，建議新名單至少自動寫入：

- `CRM階段`：`01 新名單`
- `CRM階段需人工確認`：`否`
- CRM 更新時間：建立名單當下時間
- CRM 更新人：`system`

實際寫入欄位仍須以 Google Sheet 正式標題名稱為準。

## 五、既有名單更新結果

`updateExistingLead()` 只更新指定欄位，並透過 `updateObjectInSheet()` 保留整列其他資料。

因此既有名單再次互動時：

- 不會清除已填入的 CRM 階段
- 不會清除人工確認結果
- 不會清除其他新增 CRM 欄位

整體判斷：低風險。

## 六、顧問業務大廳落差

`ConsultantLeadService.gs` 的 `formatLeadRecordForPortal()` 目前仍使用：

```text
名單狀態
```

並回傳：

```text
leadStatus
```

目前尚未讀取：

```text
CRM階段
```

因此：

- 新增 CRM 欄位不會造成顧問業務大廳故障
- 顧問業務大廳目前仍顯示舊版名單狀態
- 新的正式 11 階段尚不會顯示在顧問業務大廳
- 後續需調整 API 回傳與前端顯示規則

另發現 `LeadService.gs` 與 `ConsultantLeadService.gs` 各有一套名單格式化邏輯，後續修改時必須同步檢查，避免兩處顯示結果不一致。

## 七、推薦事件影響

`EventService.gs` 的 `createReferralEvent()` 只寫入：

```text
referral_events_推薦事件紀錄
```

不直接操作 `leads_潛在會員名單` 的 CRM 欄位。

`referral.js` 只負責建立推薦事件 payload 並傳送至 Apps Script，不直接依賴 Google Sheet 欄位順序。

因此：

- 新增 `BB:BX` 不會直接影響推薦事件寫入
- 推薦事件仍可依既有方式新增到底部
- 推薦事件建立名單後，CRM 預設值是否完整，取決於 `LeadService.gs` 的 `createLead()`

## 八、既有函式名稱衝突風險

本次檢查發現：

- `LeadService.gs` 定義 `applyReferralProtection()`
- `ReferralService.gs` 也定義 `applyReferralProtection()`
- 兩個函式的參數數量與處理邏輯不同

Apps Script 各 `.gs` 檔案共用全域函式空間，因此同名函式可能造成覆蓋或呼叫錯誤。

此問題不是新增 CRM 欄位造成，但屬於既有程式風險。

後續修改時應：

1. 分別重新命名兩個函式
2. 確認所有呼叫位置
3. 完成推薦保護期測試
4. 確認既有名單更新沒有異常

## 九、整體影響判斷

| 項目 | 判斷 |
|---|---|
| 原有欄位位置 | 安全，未搬移、刪除或改名 |
| Sheet 整列讀寫 | 安全，會依實際最後欄自動調整 |
| 新增名單 | 不會故障，但 CRM 預設值尚未自動寫入 |
| 更新既有名單 | 安全，不會清除 CRM 欄位 |
| 顧問業務大廳 | 不會故障，但仍顯示舊版名單狀態 |
| 推薦事件寫入 | 不受 CRM 新增欄位直接影響 |
| 顧問資源中心 | 不受影響 |
| 函式名稱衝突 | 發現既有風險，後續需修正 |

## 十、後續建議順序

1. 先建立 Apps Script 正式修改規格。
2. 處理兩個 `applyReferralProtection()` 同名函式。
3. 在 `createLead()` 加入新名單 CRM 預設值。
4. 調整顧問業務大廳回傳 `CRM階段`。
5. 保留舊 `名單狀態` 作為過渡資料，不立即刪除。
6. 建立小量測試名單。
7. 驗證推薦事件、名單建立、既有名單更新及顧問大廳。
8. 測試正常後再部署新版 Apps Script。

## 十一、本階段結論

第一批 CRM 欄位新增在既有欄位最右側，未破壞現有 Apps Script 的欄位對應與整列讀寫機制。

目前主要問題不是既有功能遭到破壞，而是新 CRM 欄位尚未正式接入 Apps Script 與顧問業務大廳。

本階段未修改任何 Apps Script、前端程式或 Google Sheet，也未執行或部署程式。