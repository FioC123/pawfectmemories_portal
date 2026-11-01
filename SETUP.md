# 管理員登入同 Security Rules

呢個 portal 用 Firebase Authentication 嘅 Email/Password。登入頁只顯示密碼。程式寫死一個佔位電郵 `admin@pawfect-portal.invalid`，佢係帳戶識別名，唔係私人信箱，亦唔係秘密。`.invalid` 收唔到驗證信，所以唔好靠「寄驗證電郵」。

舊 PIN 仍然留喺 git 歷史。而家嘅登入已經唔會再讀佢。請當佢已經作廢，唔好再使用。

## 1. 開管理員帳戶（Firebase Console）

1. 打開專案 `pawfect-memories-2c8a0` → Authentication。
2. Sign-in method 啟用 **Email/Password**。唔使開 Email link。
3. Users → Add user：
   - Email：`admin@pawfect-portal.invalid`
   - Password：你自己嘅密碼（唔好寫入 git）
4. 啟用提供者之後盡快建立呢個用戶。提供者一開，客戶端理論上可以自己註冊；呢個電郵一旦存在，其他人就註冊唔到同一個帳戶。頁面本身冇註冊功能。
5. 唔使驗證呢個電郵。Rules 只核對電郵同 `password` 登入方式。

## 2. 部署 Rules（唔包括網頁）

喺 repo 根目錄、已登入 Firebase CLI 嘅情況下：

```bash
firebase deploy --only firestore:rules,storage:rules --project pawfect-memories-2c8a0
```

`firebase.json` 的 Storage 用陣列，並寫明 bucket `pawfect-memories-2c8a0.firebasestorage.app`，規則檔係 `storage.rules`。唔好改回只有 `"rules"` 的物件格式，否則 CLI 會搵一個叫 `rules` 的 target 而失敗。呢個檔冇 hosting。唔好跑冇 `--only` 嘅 `firebase deploy`。

部署之後：

- 未登入唔可以讀寫 `Orders`、`Clients`、`Settings`，亦唔可以列出 `portalByPhone`。
- 客人頁只可以 `get` 一個已知電話嘅 `portalByPhone/{電話}`。
- Storage 嘅 `receipts/` 同 `avatars/` 只限管理員讀寫，而且新上傳必須係 8MB 以下嘅圖片。舊有下載網址（帶 token）仍然可以由 `<img>` 開啟；token 就係把鎖。

## 3. 建立客人查詢索引

Rules 部署同員工登入之後，打開 **系統設定**，撳 **重建客人查詢索引**。呢步會按電話寫入 `portalByPhone`。未重建之前，客人用電話會搵唔到舊單。之後每次儲存、改進度、改相簿或刪單都會更新索引。

複製俾客人嘅連結而家係 `tracker.html?phone=…&id=…`。舊式淨係 `?id=` 嘅連結會要求再輸入電話。

## 取捨

客人仍然可以用一個電話讀到該電話底下、原本進度頁會顯示嘅資料（寵物、檔期、收費摘要、備註、相簿連結）。8 位香港號碼理論上可以被逐個試。Rules 禁止嘅係一次過下載成個 `Orders` / `Clients`。要再限速，就要另加 Cloud Function，呢次冇加。
