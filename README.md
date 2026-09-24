# 營隊模擬投資競賽平台

可在營隊區域網路執行的回合制投資遊戲。隊伍使用專屬 QR Code 進入；主持人設定股票、固定回合價格與隊伍情報，控制交易和績效公布；投影頁面只顯示公開資料。

線上版本：<https://haitai.pythonanywhere.com>。完整操作流程請見[使用操作說明](使用操作說明.md)。

## 啟動

需要 Python 3.10 或更新版本。應用程式本身不需要安裝 Python 套件、Node 套件，也不需要付費服務。

在 PowerShell 中進入本資料夾，執行：

```powershell
python server.py
```

開啟 `http://127.0.0.1:8000/admin`。首次啟動會在終端機顯示管理員密碼；請妥善保存。資料會自動存在同資料夾的 `camp.db`，重新啟動不會清除隊伍與交易。

也可在**第一次**啟動前指定管理員密碼：

```powershell
$env:CAMP_ADMIN_PASSWORD = '請換成強密碼'
python server.py
```

密碼在資料庫建立時設定，後續更改環境變數不會覆蓋既有密碼。

### 現場多裝置使用

```powershell
$env:CAMP_HOST = '0.0.0.0'
$env:CAMP_PORT = '8000'
python server.py
```

讓主持人、投影設備和各隊手機連上同一個 Wi-Fi。主持人請用電腦的區域網路 IP（例如 `http://192.168.1.20:8000/admin`）開啟後台，這樣後台產生的隊伍 QR Code 才會指向手機可連線的網址。若 Windows 防火牆提示，允許該連線在私人網路使用。

本機服務使用 HTTP，適合可信任的營隊區域網路。若要公開到網際網路，應先加上 HTTPS 反向代理、網路存取限制及正式部署監控。

### 免費外網部署

此專案另提供 `wsgi.py`，可用於具備**持久檔案儲存空間**的 Python WSGI 主機。免費的 [PythonAnywhere](https://www.pythonanywhere.com/pricing/) 支援 SQLite 與一個網頁應用；其免費網頁應用需定期續期。部署時，將此 Git 儲存庫複製到主機，建立 Python 3 網頁應用，並在 WSGI 設定檔中加入專案路徑、匯入 `from wsgi import application`。第一次啟動前，可在主機的 Python console 於專案資料夾執行：

```python
import server
server.init_db()
```

上方會印出首次管理員密碼。WSGI 設定檔的核心內容如下（請替換帳號與路徑）：

```python
import sys
project_path = '/home/YOUR_USERNAME/camp-investment-platform'
if project_path not in sys.path:
    sys.path.insert(0, project_path)
from wsgi import application
```

完成後，重新載入網頁應用。資料庫檔 `camp.db` 應留在主機持久儲存空間，**不要提交到 GitHub**。

Vercel 的函式檔案系統不會持久保存 SQLite 資料庫，因此不能把目前的 SQLite 版本直接部署到 Vercel；若要使用 Vercel，需先改用外部持久資料庫並移植交易資料層。

## 主持人操作順序

1. 建立活動，設定每隊相同的初始資金。
2. 建立隊伍並把各自的 QR Code 或加入連結交給對應隊伍。
3. 建立虛構股票、回合，以及每檔股票在每回合的固定價格。
4. 建立情報，指定接收隊伍。可先預先安排，也可用「隨機分配」建立分配表。
5. 在總覽進入下一回合，預覽情報分配後確認發布。
6. 切換「情報交流」與「交易進行中」。交易只在 TRADING 階段開放。
7. 建立績效快照，再選擇公布。建立快照不會自動公布。
8. 最後建立「最終快照」、公布成績，並在活動設定開放最終報告或情報復盤。

投影畫面位置為 `/presenter/活動代碼`。隊伍頁面為 `/team`，但首次進入需使用該隊的專屬連結。重新產生連結會使該隊的舊連結及登入狀態失效。

## 匯入格式

支援 UTF-8 CSV 和 `.xlsx` 的第一個工作表。股票、隊伍和回合應先在後台建立。

股價表：

```csv
Round,NT01,GP01
1,100,80
2,120,75
```

情報表：

```csv
Round,News,Team,Content
2,產品突破,第一隊,內部測試結果優於預期
2,供應商罷工,第二隊,主要供應商可能延遲交貨
```

## 核心規則與資料保護

- 同回合股價固定。已開始或結束的回合價格不能改動；隊伍交易也不會影響股價。
- 交易使用 SQLite 原子交易與寫入鎖，檢查階段、現金和持股後才會寫入。
- 隊伍登入狀態由伺服器驗證；隊伍情報及持股 API 只查該隊資料。
- 排行榜只讀取最近一次**已公布**快照。快照保存建立當時的現金、市值、總資產、報酬率、排名與報告內容。
- 投影頁面為公開唯讀，只取得公開情報與已公布的績效。
- 活動複製會複製股票、隊伍名稱、回合、價格與情報劇本；不複製交易、持股、登入狀態或快照。複製後請為各隊重新產生加入連結。

## 免費開源元件

QR Code 由 [Project Nayuki 的 QR Code Generator](https://github.com/nayuki/QR-Code-generator) 在伺服器本機產生。其 `qrcodegen.py` 原始檔採 MIT License，完整授權文字保留在該檔開頭。其餘服務端只使用 Python 標準函式庫。

## 驗證

```powershell
python test_integration.py
python test_wsgi.py
```

整合測試會自行啟動隔離的測試伺服器，驗證隊伍情報隔離、交易限制、回合價格、快照公布、最終報告、CSV/XLSX 匯入，以及同隊同時下單時不會超額買入。
