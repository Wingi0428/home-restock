# 家用補貨提醒

一個可直接部署至 GitHub Pages、使用 Supabase 保存與同步資料的家用補貨網站。

## 功能

- 任意 ID 無密碼登入；手機與電腦輸入相同 ID 即可讀取同一份資料
- 內建「貓咪用品」與「消耗品」分類及範例項目
- 分類管理：新增自訂分類、選擇圖示與顏色、修改名稱、刪除空分類
- 新增、修改、刪除補貨項目
- 自訂補貨週期與下次購買日
- 一鍵 Reset，從今天重新開始倒數
- 保存 Coupang、Costco、全聯、蝦皮等常用購買連結
- 到期狀態、網站內提醒與瀏覽器通知
- 手機／平板／桌面響應式介面，可加入手機主畫面
- 本機立即保存、Supabase 雲端自動同步；離線編輯會在恢復網路後補同步

> 此版本依照需求採「只有 ID、沒有密碼」。知道或猜到 ID 的人可以讀取、修改及刪除該 ID 的資料。請不要在清單內儲存敏感個資。

## 首次設定 Supabase（必要）

1. 開啟 Supabase 專案的 **SQL Editor**。
2. 點 **New query**，貼上根目錄 `supabase-setup.sql` 的全部內容。
3. 點 **Run**；看到 `Success. No rows returned` 即完成。
4. `cloud-config.js` 已設定 Project URL 與 publishable key。此檔只能使用 publishable/anon key，絕對不可放入 secret 或 `service_role` key。

資料表放在未公開的 `private` schema；網站只能透過三個指定函式按完整 ID 讀取、儲存或刪除，不能直接列出所有 ID。

## 舊版資料相容

升級部署不會清除既有 ID 或補貨清單。新版沿用原本的品項儲存鍵；當雲端還沒有該 ID 時，第一次登入會把目前瀏覽器仍存在的舊資料上傳到 Supabase。雲端已有該 ID 時則以雲端資料為準。

## GitHub Pages 部署

1. 在 GitHub 建立新的 repository。
2. 將此資料夾內的所有檔案（包含 `.github`）上傳至 repository 的 `main` 分支。
3. 到 repository 的 **Settings → Pages**。
4. 在 **Build and deployment** 的 Source 選擇 **GitHub Actions**。
5. 等待 `Deploy static site to Pages` workflow 完成，即可從 Pages 顯示的網址開啟。

也可以選擇 **Deploy from a branch**，指定 `main` 與 `/(root)`，本專案同樣可以直接運作。

## 本機預覽

不可直接雙擊測試通知與離線功能，請在此資料夾啟動任一靜態伺服器，例如：

```bash
python -m http.server 8080
```

再開啟 `http://localhost:8080`。
