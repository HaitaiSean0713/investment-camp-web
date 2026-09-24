#!/usr/bin/env python3
"""Camp Investment Simulation Platform. Python standard library only."""
from __future__ import annotations

import csv
import base64
import hashlib
import hmac
import io
import json
import os
import re
import secrets
import sqlite3
import sys
import threading
from contextlib import contextmanager
import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse
from qrcodegen import QrCode

ROOT = Path(__file__).resolve().parent
DB_PATH = Path(os.environ.get("CAMP_DB", ROOT / "camp.db"))
HOST = os.environ.get("CAMP_HOST", "127.0.0.1")
PORT = int(os.environ.get("CAMP_PORT", "8000"))
SESSION_DAYS = 30
STAGES = {"PREPARING", "INFORMATION", "DISCUSSION", "TRADING", "CLOSED", "RESULT", "BREAK", "FINISHED"}
DISPLAY_LEVELS = {"A", "B", "C"}


def now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def money(value):
    try:
        amount = Decimal(str(value))
        if not amount.is_finite() or amount < 0:
            raise ValueError()
        return int((amount * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
    except (InvalidOperation, ValueError, TypeError):
        raise AppError(400, "金額必須是非負數")


def amount(value):
    return f"{Decimal(value) / 100:.2f}"


def integer(value, name, minimum=0):
    try:
        number = int(value)
        if str(value).strip() != str(number) or number < minimum:
            raise ValueError()
        return number
    except (TypeError, ValueError):
        raise AppError(400, f"{name} 必須是大於或等於 {minimum} 的整數")


def required(value, name, limit=500):
    value = str(value or "").strip()
    if not value or len(value) > limit:
        raise AppError(400, f"{name} 不可為空且不可超過 {limit} 字")
    return value


class AppError(Exception):
    def __init__(self, status, message):
        self.status, self.message = status, message


@contextmanager
def connect():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(DB_PATH, timeout=30, isolation_level=None)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys=ON")
    db.execute("PRAGMA busy_timeout=30000")
    db.execute("PRAGMA journal_mode=WAL")
    try:
        yield db
        if db.in_transaction:
            db.commit()
    except Exception:
        if db.in_transaction:
            db.rollback()
        raise
    finally:
        db.close()


def one(db, sql, args=()):
    return db.execute(sql, args).fetchone()


def rows(db, sql, args=()):
    return [dict(x) for x in db.execute(sql, args).fetchall()]


def activity(db, aid):
    result = one(db, "SELECT * FROM activities WHERE id=?", (aid,))
    if not result:
        raise AppError(404, "找不到活動")
    return result


def owned(db, table, item_id, aid):
    if table == "stocks":
        query = "SELECT * FROM stocks WHERE id=? AND activity_id=?"
    elif table == "rounds":
        query = "SELECT * FROM rounds WHERE id=? AND activity_id=?"
    elif table == "teams":
        query = "SELECT * FROM teams WHERE id=? AND activity_id=?"
    elif table == "news":
        query = "SELECT * FROM news WHERE id=? AND activity_id=?"
    elif table == "snapshots":
        query = "SELECT * FROM snapshots WHERE id=? AND activity_id=?"
    else:
        raise AppError(500, "無效資料表")
    result = one(db, query, (item_id, aid))
    if not result:
        raise AppError(404, "找不到資料")
    return result


def init_db():
    with connect() as db:
        db.executescript("""
        CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY, role TEXT NOT NULL,
          team_id INTEGER, expires_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS activities(
          id INTEGER PRIMARY KEY, name TEXT NOT NULL, code TEXT NOT NULL UNIQUE,
          initial_cash INTEGER NOT NULL, current_round INTEGER NOT NULL DEFAULT 0,
          stage TEXT NOT NULL DEFAULT 'PREPARING', status TEXT NOT NULL DEFAULT 'ACTIVE',
          performance_report_visible INTEGER NOT NULL DEFAULT 0,
          review_visible INTEGER NOT NULL DEFAULT 0,
          timer_remaining INTEGER NOT NULL DEFAULT 0, timer_ends_at TEXT,
          timer_mode TEXT NOT NULL DEFAULT 'MANUAL', created_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS teams(
          id INTEGER PRIMARY KEY, activity_id INTEGER NOT NULL REFERENCES activities(id),
          name TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE, cash INTEGER NOT NULL,
          created_at TEXT NOT NULL, UNIQUE(activity_id,name));
        CREATE TABLE IF NOT EXISTS stocks(
          id INTEGER PRIMARY KEY, activity_id INTEGER NOT NULL REFERENCES activities(id),
          symbol TEXT NOT NULL, name TEXT NOT NULL, industry TEXT NOT NULL DEFAULT '',
          description TEXT NOT NULL DEFAULT '', logo TEXT NOT NULL DEFAULT '',
          financials TEXT NOT NULL DEFAULT '', UNIQUE(activity_id,symbol));
        CREATE TABLE IF NOT EXISTS stock_fields(
          id INTEGER PRIMARY KEY, stock_id INTEGER NOT NULL REFERENCES stocks(id),
          field_name TEXT NOT NULL, field_value TEXT NOT NULL, display_order INTEGER NOT NULL DEFAULT 0);
        CREATE TABLE IF NOT EXISTS rounds(
          id INTEGER PRIMARY KEY, activity_id INTEGER NOT NULL REFERENCES activities(id),
          round_number INTEGER NOT NULL, stage TEXT NOT NULL DEFAULT 'PREPARING',
          status TEXT NOT NULL DEFAULT 'PENDING',
          started_at TEXT, ended_at TEXT, UNIQUE(activity_id,round_number));
        CREATE TABLE IF NOT EXISTS prices(
          stock_id INTEGER NOT NULL REFERENCES stocks(id), round_id INTEGER NOT NULL REFERENCES rounds(id),
          price INTEGER NOT NULL CHECK(price > 0), PRIMARY KEY(stock_id,round_id));
        CREATE TABLE IF NOT EXISTS news(
          id INTEGER PRIMARY KEY, activity_id INTEGER NOT NULL REFERENCES activities(id),
          round_id INTEGER NOT NULL REFERENCES rounds(id), title TEXT NOT NULL,
          content TEXT NOT NULL, image TEXT NOT NULL DEFAULT '', category TEXT NOT NULL DEFAULT '',
          type TEXT NOT NULL CHECK(type IN ('PRIVATE','GROUP','PUBLIC')),
          created_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS news_assignments(
          news_id INTEGER NOT NULL REFERENCES news(id), team_id INTEGER NOT NULL REFERENCES teams(id),
          released INTEGER NOT NULL DEFAULT 0, released_at TEXT,
          original_recipient INTEGER NOT NULL DEFAULT 1,
          PRIMARY KEY(news_id,team_id));
        CREATE TABLE IF NOT EXISTS holdings(
          team_id INTEGER NOT NULL REFERENCES teams(id), stock_id INTEGER NOT NULL REFERENCES stocks(id),
          quantity INTEGER NOT NULL CHECK(quantity>=0), average_cost INTEGER NOT NULL,
          PRIMARY KEY(team_id,stock_id));
        CREATE TABLE IF NOT EXISTS transactions(
          id INTEGER PRIMARY KEY, team_id INTEGER NOT NULL REFERENCES teams(id),
          stock_id INTEGER NOT NULL REFERENCES stocks(id), round_id INTEGER NOT NULL REFERENCES rounds(id),
          type TEXT NOT NULL CHECK(type IN ('BUY','SELL')), quantity INTEGER NOT NULL CHECK(quantity>0),
          price INTEGER NOT NULL, total_amount INTEGER NOT NULL, created_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS snapshots(
          id INTEGER PRIMARY KEY, activity_id INTEGER NOT NULL REFERENCES activities(id),
          round_id INTEGER REFERENCES rounds(id), created_at TEXT NOT NULL,
          published_at TEXT, is_published INTEGER NOT NULL DEFAULT 0,
          display_level TEXT NOT NULL DEFAULT 'C', is_final INTEGER NOT NULL DEFAULT 0);
        CREATE TABLE IF NOT EXISTS snapshot_entries(
          snapshot_id INTEGER NOT NULL REFERENCES snapshots(id), team_id INTEGER NOT NULL REFERENCES teams(id),
          team_name TEXT NOT NULL, rank INTEGER NOT NULL, cash INTEGER NOT NULL,
          stock_value INTEGER NOT NULL, total_asset INTEGER NOT NULL,
          return_rate TEXT NOT NULL, report_json TEXT NOT NULL,
          PRIMARY KEY(snapshot_id,team_id));
        CREATE INDEX IF NOT EXISTS idx_session_expiry ON sessions(expires_at);
        CREATE INDEX IF NOT EXISTS idx_news_round ON news(round_id);
        CREATE INDEX IF NOT EXISTS idx_tx_team ON transactions(team_id,created_at);
        """)
        if "review_visible" not in [x[1] for x in db.execute("PRAGMA table_info(activities)")]:
            db.execute("ALTER TABLE activities ADD COLUMN review_visible INTEGER NOT NULL DEFAULT 0")
        if "original_recipient" not in [x[1] for x in db.execute("PRAGMA table_info(news_assignments)")]:
            db.execute("ALTER TABLE news_assignments ADD COLUMN original_recipient INTEGER NOT NULL DEFAULT 1")
        if "stage" not in [x[1] for x in db.execute("PRAGMA table_info(rounds)")]:
            db.execute("ALTER TABLE rounds ADD COLUMN stage TEXT NOT NULL DEFAULT 'PREPARING'")
        if not one(db, "SELECT value FROM settings WHERE key='admin_password'"):
            password = os.environ.get("CAMP_ADMIN_PASSWORD") or secrets.token_urlsafe(18)
            salt = secrets.token_hex(16)
            digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), 200_000).hex()
            db.execute("INSERT INTO settings VALUES('admin_password',?)", (salt + ":" + digest,))
            print("\n首次啟動管理員密碼 / Admin password:", password, "\n", flush=True)


def session_hash(token):
    return hashlib.sha256(token.encode()).hexdigest()


def new_session(db, role, team_id=None):
    token = secrets.token_urlsafe(32)
    expiry = (datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS)).isoformat(timespec="seconds")
    db.execute("INSERT INTO sessions VALUES(?,?,?,?)", (session_hash(token), role, team_id, expiry))
    return token


def check_password(db, password):
    saved = one(db, "SELECT value FROM settings WHERE key='admin_password'")[0]
    salt, digest = saved.split(":")
    actual = hashlib.pbkdf2_hmac("sha256", str(password).encode(), bytes.fromhex(salt), 200_000).hex()
    return hmac.compare_digest(actual, digest)


def public_snapshot(db, aid):
    snap = one(db, "SELECT * FROM snapshots WHERE activity_id=? AND is_published=1 ORDER BY published_at DESC,id DESC LIMIT 1", (aid,))
    if not snap:
        return None
    result = {k: snap[k] for k in ("id", "created_at", "published_at", "display_level", "is_final")}
    rnd = one(db, "SELECT round_number FROM rounds WHERE id=?", (snap["round_id"],)) if snap["round_id"] else None
    result["round_number"] = rnd[0] if rnd else 0
    fields = "rank,team_name"
    if snap["display_level"] in ("B", "C"):
        fields += ",total_asset"
    if snap["display_level"] == "C":
        fields += ",return_rate"
    entries = rows(db, f"SELECT {fields} FROM snapshot_entries WHERE snapshot_id=? ORDER BY rank,team_name", (snap["id"],))
    for x in entries:
        if "total_asset" in x:
            x["total_asset"] = amount(x["total_asset"])
    result["entries"] = entries
    return result


def market(db, aid, current_round):
    stocks = rows(db, "SELECT * FROM stocks WHERE activity_id=? ORDER BY symbol", (aid,))
    for stock in stocks:
        history = rows(db, """SELECT r.round_number,p.price FROM prices p JOIN rounds r ON r.id=p.round_id
          WHERE p.stock_id=? AND r.round_number<=? ORDER BY r.round_number""", (stock["id"], current_round))
        stock["history"] = [{"round": x["round_number"], "price": amount(x["price"])} for x in history]
        stock["price"] = stock["history"][-1]["price"] if history else None
        stock["previous_price"] = stock["history"][-2]["price"] if len(history) > 1 else None
        stock["change_percent"] = str(round((history[-1]["price"] / history[-2]["price"] - 1) * 100, 2)) if len(history) > 1 else None
        stock["fields"] = rows(db, "SELECT field_name,field_value FROM stock_fields WHERE stock_id=? ORDER BY display_order,id", (stock["id"],))
    return stocks


def portfolio(db, team):
    a = activity(db, team["activity_id"])
    holdings = rows(db, """SELECT h.stock_id,h.quantity,h.average_cost,s.symbol,s.name,p.price
      FROM holdings h JOIN stocks s ON s.id=h.stock_id
      LEFT JOIN rounds r ON r.activity_id=s.activity_id AND r.round_number=?
      LEFT JOIN prices p ON p.stock_id=s.id AND p.round_id=r.id
      WHERE h.team_id=? AND h.quantity>0 ORDER BY s.symbol""", (a["current_round"], team["id"]))
    value = 0
    for h in holdings:
        current = h["price"] or 0
        h["market_value"] = amount(h["quantity"] * current)
        h["unrealized_profit"] = amount(h["quantity"] * (current - h["average_cost"]))
        h["average_cost"] = amount(h["average_cost"])
        h["price"] = amount(current)
        value += h["quantity"] * current
    return {"team_name": team["name"], "cash": amount(team["cash"]),
            "stock_value": amount(value), "total_asset": amount(team["cash"] + value),
            "holdings": holdings}


def stage_timer(db, a):
    remaining = a["timer_remaining"]
    if a["timer_ends_at"]:
        end = datetime.fromisoformat(a["timer_ends_at"])
        remaining = max(0, int((end - datetime.now(timezone.utc)).total_seconds()))
        if remaining == 0 and a["timer_mode"] == "AUTOMATIC" and a["stage"] == "TRADING":
            db.execute("UPDATE activities SET stage='CLOSED',timer_ends_at=NULL,timer_remaining=0 WHERE id=? AND stage='TRADING'", (a["id"],))
            db.execute("UPDATE rounds SET stage='CLOSED' WHERE activity_id=? AND round_number=?", (a["id"],a["current_round"]))
            a = activity(db, a["id"])
    return a, remaining


def snapshot_create(db, aid, level, final):
    a = activity(db, aid)
    if a["current_round"] < 1:
        raise AppError(400, "尚未開始任何回合")
    if a["status"] == "FINISHED":
        raise AppError(409, "活動已結束")
    rnd = one(db, "SELECT id FROM rounds WHERE activity_id=? AND round_number=?", (aid, a["current_round"]))
    cursor = db.execute("INSERT INTO snapshots(activity_id,round_id,created_at,display_level,is_final) VALUES(?,?,?,?,?)",
                        (aid, rnd["id"], now(), level, int(final)))
    sid = cursor.lastrowid
    all_teams = rows(db, "SELECT * FROM teams WHERE activity_id=? ORDER BY id", (aid,))
    calculated = []
    for team in all_teams:
        p = portfolio(db, team)
        total = money(p["total_asset"])
        tx = rows(db, """SELECT t.id,s.symbol,s.name,t.type,t.quantity,t.price,t.total_amount,t.created_at,r.round_number
          FROM transactions t JOIN stocks s ON s.id=t.stock_id JOIN rounds r ON r.id=t.round_id
          WHERE t.team_id=? ORDER BY t.id""", (team["id"],))
        for t in tx:
            t["price"], t["total_amount"] = amount(t["price"]), amount(t["total_amount"])
        report = {"initial_cash": amount(a["initial_cash"]), "holdings": p["holdings"],
                  "transactions": tx, "transaction_count": len(tx)}
        ledger = {}
        for t in tx:
            line = ledger.setdefault(t["symbol"], {"symbol":t["symbol"],"name":t["name"],"quantity":0,
              "cost_basis":0,"realized":0,"unrealized":0})
            q = t["quantity"]
            price_cents = money(t["price"])
            if t["type"] == "BUY":
                line["quantity"] += q
                line["cost_basis"] += q * price_cents
            elif line["quantity"] >= q:
                sold_basis = (line["cost_basis"] * q + line["quantity"]//2) // line["quantity"]
                line["quantity"] -= q
                line["cost_basis"] -= sold_basis
                line["realized"] += q * price_cents - sold_basis
        current_prices = {x["symbol"]:money(x["price"]) for x in p["holdings"]}
        for symbol,line in ledger.items():
            line["unrealized"] = line["quantity"] * current_prices.get(symbol,0) - line["cost_basis"]
            line["total_profit"] = line["realized"] + line["unrealized"]
        profit_sorted = sorted(ledger.values(), key=lambda x:x["total_profit"])
        report["best_stock"] = profit_sorted[-1]["symbol"] if profit_sorted else None
        report["worst_stock"] = profit_sorted[0]["symbol"] if profit_sorted else None
        report["stock_results"] = [{**x,"cost_basis":amount(x["cost_basis"]),"realized":amount(x["realized"]),
          "unrealized":amount(x["unrealized"]),"total_profit":amount(x["total_profit"])} for x in ledger.values()]
        calculated.append((team, p, total, report))
    calculated.sort(key=lambda x: (-x[2], x[0]["name"]))
    previous = None
    rank = 0
    for position, (team, p, total, report) in enumerate(calculated, 1):
        if total != previous:
            rank = position
        previous = total
        rate = ((Decimal(total - a["initial_cash"]) / Decimal(a["initial_cash"])) * 100).quantize(Decimal("0.01"))
        db.execute("""INSERT INTO snapshot_entries VALUES(?,?,?,?,?,?,?,?,?)""",
                   (sid, team["id"], team["name"], rank, money(p["cash"]), money(p["stock_value"]),
                    total, str(rate), json.dumps(report, ensure_ascii=False)))
    if final:
        db.execute("UPDATE activities SET status='FINISHED',stage='FINISHED',timer_ends_at=NULL WHERE id=?", (aid,))
        db.execute("UPDATE rounds SET status='CLOSED',stage='FINISHED',ended_at=? WHERE id=?", (now(), rnd["id"]))
    return sid


def admin_dashboard(db, aid):
    a = dict(activity(db, aid))
    a, remaining = stage_timer(db, a)
    a = dict(a)
    a["initial_cash"] = amount(a["initial_cash"])
    a["timer_remaining_live"] = remaining
    a["teams"] = rows(db, "SELECT id,name,created_at FROM teams WHERE activity_id=? ORDER BY id", (aid,))
    a["stocks"] = market(db, aid, a["current_round"])
    a["rounds"] = rows(db, "SELECT * FROM rounds WHERE activity_id=? ORDER BY round_number", (aid,))
    for r in a["rounds"]:
        r["prices"] = rows(db, "SELECT p.stock_id,s.symbol,p.price FROM prices p JOIN stocks s ON s.id=p.stock_id WHERE p.round_id=? ORDER BY s.symbol", (r["id"],))
        for x in r["prices"]:
            x["price"] = amount(x["price"])
    a["news"] = rows(db, """SELECT n.*,r.round_number FROM news n JOIN rounds r ON r.id=n.round_id
      WHERE n.activity_id=? ORDER BY r.round_number,n.id""", (aid,))
    for n in a["news"]:
        n["assignments"] = rows(db, """SELECT na.team_id,t.name AS team_name,na.released,na.released_at
          FROM news_assignments na JOIN teams t ON t.id=na.team_id WHERE na.news_id=? ORDER BY t.id""", (n["id"],))
    a["snapshots"] = rows(db, "SELECT * FROM snapshots WHERE activity_id=? ORDER BY id DESC", (aid,))
    a["published_snapshot"] = public_snapshot(db, aid)
    a["transaction_count"] = one(db, "SELECT COUNT(*) FROM transactions t JOIN teams tm ON tm.id=t.team_id WHERE tm.activity_id=?", (aid,))[0]
    return a


def public_data(db, code):
    a = one(db, "SELECT * FROM activities WHERE code=?", (code,))
    if not a:
        raise AppError(404, "找不到活動")
    a, remaining = stage_timer(db, a)
    info = {"id": a["id"], "name": a["name"], "code": a["code"], "round": a["current_round"],
            "stage": a["stage"], "status": a["status"], "timer_remaining": remaining,
            "timer_running": bool(a["timer_ends_at"]), "stocks": market(db, a["id"], a["current_round"]),
            "snapshot": public_snapshot(db, a["id"])}
    info["news"] = rows(db, """SELECT n.id,n.title,n.content,n.image,n.category,r.round_number
      FROM news n JOIN rounds r ON r.id=n.round_id WHERE n.activity_id=? AND n.type='PUBLIC'
      AND EXISTS (SELECT 1 FROM news_assignments na WHERE na.news_id=n.id AND na.released=1)
      AND r.round_number<=? ORDER BY r.round_number DESC,n.id DESC""", (a["id"], a["current_round"]))
    return info


def review_data(db, aid):
    return rows(db, """SELECT r.round_number,t.name AS team_name,n.title,n.content,n.category,n.image
      FROM news_assignments na JOIN news n ON n.id=na.news_id
      JOIN rounds r ON r.id=n.round_id JOIN teams t ON t.id=na.team_id
      WHERE n.activity_id=? AND na.released=1 AND na.original_recipient=1
      ORDER BY r.round_number,t.id,n.id""", (aid,))


def xlsx_rows(encoded):
    try:
        binary = base64.b64decode(encoded, validate=True)
        if len(binary) > 2_000_000:
            raise AppError(413, "Excel 檔案太大")
        with zipfile.ZipFile(io.BytesIO(binary)) as z:
            if sum(info.file_size for info in z.infolist()) > 10_000_000:
                raise AppError(413, "Excel 解壓後資料太大")
            ns = {"m":"http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
            shared = []
            if "xl/sharedStrings.xml" in z.namelist():
                root = ET.fromstring(z.read("xl/sharedStrings.xml"))
                shared = ["".join(t.text or "" for t in si.findall(".//m:t",ns)) for si in root.findall("m:si",ns)]
            sheet = ET.fromstring(z.read("xl/worksheets/sheet1.xml"))
            grid=[]
            for row in sheet.findall(".//m:sheetData/m:row",ns):
                cells={}
                for cell in row.findall("m:c",ns):
                    ref=cell.attrib.get("r","")
                    letters=re.match(r"[A-Z]+",ref)
                    if not letters: continue
                    index=0
                    for char in letters.group(): index=index*26+ord(char)-64
                    val=cell.find("m:v",ns)
                    textval=val.text if val is not None and val.text else ""
                    if cell.attrib.get("t")=="s" and textval: textval=shared[int(textval)]
                    if cell.attrib.get("t")=="inlineStr":
                        textval="".join(x.text or "" for x in cell.findall(".//m:t",ns))
                    cells[index-1]=textval
                if cells: grid.append([cells.get(i,"") for i in range(max(cells)+1)])
            if len(grid)<2: raise AppError(400,"Excel 沒有資料")
            header=[str(x).strip() for x in grid[0]]
            return [dict(zip(header, row+[""]*(len(header)-len(row)))) for row in grid[1:]]
    except (zipfile.BadZipFile,KeyError,ET.ParseError,ValueError,IndexError,TypeError):
        raise AppError(400,"無法讀取 XLSX；請確認格式或改用 CSV")


class Handler(BaseHTTPRequestHandler):
    server_version = "CampInvestment/1.0"

    def log_message(self, fmt, *args):
        # QR entry URLs contain a secret, so do not write request paths to logs.
        print(f"{self.address_string()} {args[1] if len(args)>1 else ''}", flush=True)

    def headers_common(self, content_type, size=None):
        self.send_header("Content-Type", content_type)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Content-Security-Policy", "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; script-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'")
        if size is not None:
            self.send_header("Content-Length", str(size))

    def json(self, status, obj, cookie=None):
        data = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.headers_common("application/json; charset=utf-8", len(data))
        if cookie:
            self.send_header("Set-Cookie", cookie)
        self.end_headers()
        self.wfile.write(data)

    def redirect(self, location, cookie=None):
        self.send_response(303)
        self.send_header("Location", location)
        self.headers_common("text/plain; charset=utf-8", 0)
        if cookie:
            self.send_header("Set-Cookie", cookie)
        self.end_headers()

    def cookie(self, token):
        secure = "; Secure" if self.headers.get("X-Forwarded-Proto") == "https" else ""
        return f"camp_session={token}; Path=/; HttpOnly; SameSite=Strict; Max-Age={SESSION_DAYS*86400}{secure}"

    def session(self, db):
        raw = self.headers.get("Cookie", "")
        c = SimpleCookie()
        try:
            c.load(raw)
            token = c["camp_session"].value if "camp_session" in c else None
        except Exception:
            token = None
        if not token:
            return None
        return one(db, "SELECT * FROM sessions WHERE token_hash=? AND expires_at>?", (session_hash(token), now()))

    def require(self, db, role):
        sess = self.session(db)
        if not sess or sess["role"] != role:
            raise AppError(401, "請先登入")
        return sess

    def body(self):
        if "application/json" not in self.headers.get("Content-Type", ""):
            raise AppError(415, "請使用 JSON")
        length = integer(self.headers.get("Content-Length", "0"), "內容長度")
        if length > 4_000_000:
            raise AppError(413, "資料太大")
        try:
            value = json.loads(self.rfile.read(length))
            if not isinstance(value, dict):
                raise ValueError()
            return value
        except (json.JSONDecodeError, UnicodeDecodeError, ValueError):
            raise AppError(400, "JSON 格式錯誤")

    def handle_request(self, method):
        parsed = urlparse(self.path)
        path = unquote(parsed.path)
        parts = [x for x in path.split("/") if x]
        try:
            if method == "POST":
                origin = self.headers.get("Origin")
                if origin and urlparse(origin).netloc != self.headers.get("Host"):
                    raise AppError(403, "來源不符")
            if parts and parts[0] == "api":
                with connect() as db:
                    result = self.api(db, method, parts[1:], parse_qs(parsed.query))
                    if result is not None:
                        self.json(200, result)
                return
            if method == "GET" and len(parts) == 3 and parts[0] == "join":
                code, token = parts[1], parts[2]
                with connect() as db:
                    team = one(db, """SELECT t.* FROM teams t JOIN activities a ON a.id=t.activity_id
                      WHERE a.code=? AND t.token_hash=?""", (code, session_hash(token)))
                    if not team:
                        raise AppError(403, "隊伍連結無效")
                    session = new_session(db, "team", team["id"])
                self.redirect("/team", self.cookie(session))
                return
            if method == "GET":
                self.static(path)
                return
            raise AppError(404, "找不到路徑")
        except AppError as e:
            self.json(e.status, {"error": e.message})
        except sqlite3.IntegrityError:
            self.json(409, {"error": "資料重複或關聯不正確"})
        except Exception as e:
            print("Server error:", repr(e), file=sys.stderr, flush=True)
            self.json(500, {"error": "伺服器發生錯誤"})

    def static(self, path):
        if path in ("/", "/admin", "/team") or path.startswith("/presenter/") or path.startswith("/team/"):
            path = "/index.html"
        if path not in ("/index.html", "/app.js", "/style.css"):
            raise AppError(404, "找不到頁面")
        file = ROOT / path.lstrip("/")
        data = file.read_bytes()
        types = {".html": "text/html", ".js": "application/javascript", ".css": "text/css"}
        self.send_response(200)
        self.headers_common(types[file.suffix] + "; charset=utf-8", len(data))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self): self.handle_request("GET")
    def do_POST(self): self.handle_request("POST")

    def api(self, db, method, p, query):
        if not p:
            raise AppError(404, "找不到 API")
        if p[0] == "auth":
            if method == "POST" and p[1:] == ["login"]:
                data = self.body()
                if not check_password(db, data.get("password", "")):
                    raise AppError(401, "密碼錯誤")
                token = new_session(db, "admin")
                self.json(200, {"ok": True}, self.cookie(token))
                return None
            if method == "POST" and p[1:] == ["logout"]:
                sess = self.session(db)
                if sess:
                    db.execute("DELETE FROM sessions WHERE token_hash=?", (sess["token_hash"],))
                self.json(200, {"ok": True}, "camp_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0")
                return None
            if method == "GET" and p[1:] == ["me"]:
                sess = self.session(db)
                return {"role": sess["role"] if sess else None}
        if p[0] == "public" and method == "GET" and len(p) == 2:
            return public_data(db, p[1])
        if p[0] == "qr" and method == "GET":
            self.require(db, "admin")
            value = query.get("text", [""])[0]
            if not value or len(value) > 512:
                raise AppError(400, "QR Code 內容無效")
            qr = QrCode.encode_text(value, QrCode.Ecc.MEDIUM)
            size = qr.get_size()
            cells = "".join(f"M{x+4},{y+4}h1v1h-1z" for y in range(size) for x in range(size) if qr.get_module(x,y))
            return {"svg": f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size+8} {size+8}" width="220" height="220" role="img" aria-label="隊伍加入 QR Code" style="background:#091321;border-radius:10px;padding:6px;image-rendering:pixelated"><path d="{cells}" fill="#fff"/></svg>'}
        if p[0] == "team":
            sess = self.require(db, "team")
            team = one(db, "SELECT * FROM teams WHERE id=?", (sess["team_id"],))
            if not team:
                raise AppError(401, "隊伍不存在")
            a = activity(db, team["activity_id"])
            if method == "GET" and p[1:] == ["me"]:
                result = public_data(db, a["code"])
                result["team"] = {"id": team["id"], "name": team["name"]}
                result["portfolio"] = portfolio(db, team)
                result["review_visible"] = bool(a["review_visible"])
                result["performance_report_visible"] = bool(a["performance_report_visible"])
                return result
            if method == "GET" and p[1:] == ["intelligence"]:
                return rows(db, """SELECT n.id,n.title,n.content,n.image,n.category,n.type,r.round_number,
                  na.released_at FROM news_assignments na JOIN news n ON n.id=na.news_id
                  JOIN rounds r ON r.id=n.round_id WHERE na.team_id=? AND na.released=1
                  AND r.round_number<=? ORDER BY r.round_number DESC,n.id DESC""", (team["id"], a["current_round"]))
            if method == "GET" and p[1:] == ["transactions"]:
                result = rows(db, """SELECT t.id,t.type,t.quantity,t.price,t.total_amount,t.created_at,
                  s.symbol,s.name,r.round_number FROM transactions t JOIN stocks s ON s.id=t.stock_id
                  JOIN rounds r ON r.id=t.round_id WHERE t.team_id=? ORDER BY t.id DESC""", (team["id"],))
                for x in result:
                    x["price"], x["total_amount"] = amount(x["price"]), amount(x["total_amount"])
                return result
            if method == "GET" and p[1:] == ["ranking"]:
                return {"snapshot": public_snapshot(db, a["id"])}
            if method == "GET" and p[1:] == ["review"]:
                if not a["review_visible"]:
                    raise AppError(403, "情報復盤尚未開放")
                return review_data(db, a["id"])
            if method == "GET" and p[1:] == ["performance"]:
                if not a["performance_report_visible"]:
                    raise AppError(403, "最終報告尚未開放")
                snap = one(db, "SELECT * FROM snapshots WHERE activity_id=? AND is_final=1 AND is_published=1", (a["id"],))
                if not snap:
                    raise AppError(404, "尚無最終結果")
                entry = one(db, "SELECT * FROM snapshot_entries WHERE snapshot_id=? AND team_id=?", (snap["id"], team["id"]))
                result = dict(entry)
                result["report"] = json.loads(result.pop("report_json"))
                for key in ("cash", "stock_value", "total_asset"):
                    result[key] = amount(result[key])
                return result
            if method == "POST" and p[1:] == ["trade"]:
                data = self.body()
                side = data.get("type")
                if side not in ("BUY", "SELL"):
                    raise AppError(400, "交易方向無效")
                qty = integer(data.get("quantity"), "股數", 1)
                stock_id = integer(data.get("stock_id"), "股票", 1)
                db.execute("BEGIN IMMEDIATE")
                a = activity(db, team["activity_id"])
                a, _ = stage_timer(db, a)
                if a["status"] != "ACTIVE" or a["stage"] != "TRADING":
                    raise AppError(409, "目前未開放交易")
                stock = owned(db, "stocks", stock_id, a["id"])
                rnd = one(db, "SELECT * FROM rounds WHERE activity_id=? AND round_number=?", (a["id"], a["current_round"]))
                price = one(db, "SELECT price FROM prices WHERE stock_id=? AND round_id=?", (stock_id, rnd["id"]))
                if not price:
                    raise AppError(409, "此股票沒有本回合價格")
                cost = qty * price["price"]
                team = one(db, "SELECT * FROM teams WHERE id=?", (team["id"],))
                holding = one(db, "SELECT * FROM holdings WHERE team_id=? AND stock_id=?", (team["id"], stock_id))
                if side == "BUY":
                    if cost > team["cash"]:
                        raise AppError(409, "現金不足")
                    old_qty = holding["quantity"] if holding else 0
                    old_avg = holding["average_cost"] if holding else 0
                    new_avg = (old_qty * old_avg + cost + (old_qty + qty)//2) // (old_qty + qty)
                    db.execute("UPDATE teams SET cash=cash-? WHERE id=?", (cost, team["id"]))
                    db.execute("""INSERT INTO holdings(team_id,stock_id,quantity,average_cost) VALUES(?,?,?,?)
                      ON CONFLICT(team_id,stock_id) DO UPDATE SET quantity=?,average_cost=?""",
                      (team["id"], stock_id, qty, new_avg, old_qty + qty, new_avg))
                else:
                    if not holding or holding["quantity"] < qty:
                        raise AppError(409, "持股不足")
                    db.execute("UPDATE teams SET cash=cash+? WHERE id=?", (cost, team["id"]))
                    db.execute("UPDATE holdings SET quantity=quantity-? WHERE team_id=? AND stock_id=?", (qty, team["id"], stock_id))
                cursor = db.execute("""INSERT INTO transactions(team_id,stock_id,round_id,type,quantity,price,total_amount,created_at)
                  VALUES(?,?,?,?,?,?,?,?)""", (team["id"], stock_id, rnd["id"], side, qty, price["price"], cost, now()))
                db.execute("COMMIT")
                return {"id": cursor.lastrowid, "symbol": stock["symbol"], "quantity": qty,
                        "price": amount(price["price"]), "total": amount(cost), "portfolio": portfolio(db, one(db,"SELECT * FROM teams WHERE id=?",(team["id"],)))}
        if p[0] == "admin":
            self.require(db, "admin")
            return self.admin_api(db, method, p[1:], query)
        raise AppError(404, "找不到 API")

    def admin_api(self, db, method, p, query):
        if method == "GET" and p == ["activities"]:
            result = rows(db, "SELECT * FROM activities ORDER BY id DESC")
            for a in result: a["initial_cash"] = amount(a["initial_cash"])
            return result
        if method == "POST" and p == ["activities"]:
            d = self.body()
            name = required(d.get("name"), "活動名稱", 100)
            code = required(d.get("code"), "活動代碼", 30).upper()
            if not re.fullmatch(r"[A-Z0-9_-]+", code):
                raise AppError(400, "活動代碼只能使用英數字、- 和 _")
            cash = money(d.get("initial_cash"))
            if cash <= 0: raise AppError(400, "初始資金必須大於零")
            cursor = db.execute("INSERT INTO activities(name,code,initial_cash,created_at) VALUES(?,?,?,?)", (name, code, cash, now()))
            return {"id": cursor.lastrowid}
        if len(p) < 2 or p[0] != "activity":
            raise AppError(404, "找不到管理 API")
        aid = integer(p[1], "活動 ID", 1)
        a = activity(db, aid)
        rest = p[2:]
        if method == "GET" and not rest:
            return admin_dashboard(db, aid)
        if method == "POST" and rest == ["delete"]:
            d = self.body()
            if d.get("code") != a["code"]:
                raise AppError(400, "活動代碼不符，未刪除活動")
            db.execute("BEGIN IMMEDIATE")
            activity(db, aid)
            db.execute("DELETE FROM sessions WHERE team_id IN (SELECT id FROM teams WHERE activity_id=?)", (aid,))
            db.execute("DELETE FROM snapshot_entries WHERE snapshot_id IN (SELECT id FROM snapshots WHERE activity_id=?)", (aid,))
            db.execute("DELETE FROM snapshots WHERE activity_id=?", (aid,))
            db.execute("DELETE FROM transactions WHERE team_id IN (SELECT id FROM teams WHERE activity_id=?)", (aid,))
            db.execute("DELETE FROM holdings WHERE team_id IN (SELECT id FROM teams WHERE activity_id=?)", (aid,))
            db.execute("DELETE FROM news_assignments WHERE news_id IN (SELECT id FROM news WHERE activity_id=?)", (aid,))
            db.execute("DELETE FROM news WHERE activity_id=?", (aid,))
            db.execute("DELETE FROM prices WHERE round_id IN (SELECT id FROM rounds WHERE activity_id=?)", (aid,))
            db.execute("DELETE FROM rounds WHERE activity_id=?", (aid,))
            db.execute("DELETE FROM stock_fields WHERE stock_id IN (SELECT id FROM stocks WHERE activity_id=?)", (aid,))
            db.execute("DELETE FROM stocks WHERE activity_id=?", (aid,))
            db.execute("DELETE FROM teams WHERE activity_id=?", (aid,))
            db.execute("DELETE FROM activities WHERE id=?", (aid,))
            db.execute("COMMIT")
            return {"ok": True}
        if method == "POST" and rest == ["settings"]:
            d = self.body()
            db.execute("UPDATE activities SET name=?,performance_report_visible=?,review_visible=?,timer_mode=? WHERE id=?",
              (required(d.get("name", a["name"]), "活動名稱", 100),
               int(bool(d.get("performance_report_visible", a["performance_report_visible"]))),
               int(bool(d.get("review_visible", a["review_visible"]))),
               d.get("timer_mode") if d.get("timer_mode") in ("MANUAL", "AUTOMATIC") else a["timer_mode"], aid))
            return {"ok": True}
        if method == "POST" and rest == ["teams"]:
            d = self.body()
            token = secrets.token_urlsafe(32)
            db.execute("BEGIN IMMEDIATE")
            cursor = db.execute("INSERT INTO teams(activity_id,name,token_hash,cash,created_at) VALUES(?,?,?,?,?)",
              (aid, required(d.get("name"), "隊名", 60), session_hash(token), a["initial_cash"], now()))
            for n in rows(db,"SELECT id FROM news WHERE activity_id=? AND type='PUBLIC'",(aid,)):
                released = one(db,"SELECT released FROM news_assignments WHERE news_id=? LIMIT 1",(n["id"],))
                db.execute("INSERT INTO news_assignments(news_id,team_id,released,released_at,original_recipient) VALUES(?,?,?,?,0)",
                  (n["id"],cursor.lastrowid,int(bool(released and released["released"])),now() if released and released["released"] else None))
            db.execute("COMMIT")
            return {"id": cursor.lastrowid, "token": token, "join_url": f"/join/{a['code']}/{token}"}
        if method == "GET" and rest == ["transactions"]:
            result = rows(db,"""SELECT t.id,t.type,t.quantity,t.price,t.total_amount,t.created_at,
              tm.name AS team_name,s.symbol,r.round_number FROM transactions t JOIN teams tm ON tm.id=t.team_id
              JOIN stocks s ON s.id=t.stock_id JOIN rounds r ON r.id=t.round_id
              WHERE tm.activity_id=? ORDER BY t.id DESC""",(aid,))
            for x in result:
                x["price"],x["total_amount"]=amount(x["price"]),amount(x["total_amount"])
            return result
        if method == "GET" and len(rest)==2 and rest[0]=="snapshots":
            snap=owned(db,"snapshots",integer(rest[1],"快照 ID",1),aid)
            entries=rows(db,"SELECT * FROM snapshot_entries WHERE snapshot_id=? ORDER BY rank,team_name",(snap["id"],))
            for e in entries:
                e["report"]=json.loads(e.pop("report_json"))
                for key in ("cash","stock_value","total_asset"): e[key]=amount(e[key])
            return {"snapshot":dict(snap),"entries":entries}
        if method == "POST" and len(rest) == 3 and rest[0] == "teams" and rest[2] == "token":
            team = owned(db, "teams", integer(rest[1], "隊伍 ID", 1), aid)
            token = secrets.token_urlsafe(32)
            db.execute("UPDATE teams SET token_hash=? WHERE id=?", (session_hash(token), team["id"]))
            db.execute("DELETE FROM sessions WHERE team_id=?", (team["id"],))
            return {"token": token, "join_url": f"/join/{a['code']}/{token}"}
        if method == "POST" and rest == ["stocks"]:
            d = self.body()
            symbol = required(d.get("symbol"), "股票代號", 16).upper()
            if not re.fullmatch(r"[A-Z0-9_-]+", symbol): raise AppError(400, "股票代號格式不正確")
            db.execute("BEGIN IMMEDIATE")
            cursor = db.execute("""INSERT INTO stocks(activity_id,symbol,name,industry,description,logo,financials)
              VALUES(?,?,?,?,?,?,?)""", (aid,symbol,required(d.get("name"),"公司名稱",100),
              str(d.get("industry", ""))[:100],str(d.get("description", ""))[:5000],
              str(d.get("logo", ""))[:1000],str(d.get("financials", ""))[:5000]))
            self.set_fields(db, cursor.lastrowid, d.get("fields", []))
            db.execute("COMMIT")
            return {"id": cursor.lastrowid}
        if method == "POST" and len(rest) == 2 and rest[0] == "stocks":
            stock = owned(db, "stocks", integer(rest[1], "股票 ID", 1), aid)
            d = self.body()
            db.execute("BEGIN IMMEDIATE")
            db.execute("UPDATE stocks SET name=?,industry=?,description=?,logo=?,financials=? WHERE id=?",
              (required(d.get("name",stock["name"]),"公司名稱",100),str(d.get("industry",stock["industry"]))[:100],
               str(d.get("description",stock["description"]))[:5000],str(d.get("logo",stock["logo"]))[:1000],
               str(d.get("financials",stock["financials"]))[:5000],stock["id"]))
            if "fields" in d: self.set_fields(db, stock["id"], d["fields"])
            db.execute("COMMIT")
            return {"ok": True}
        if method == "POST" and rest == ["rounds"]:
            d = self.body()
            num = integer(d.get("round_number"), "回合", 1)
            if num <= a["current_round"]: raise AppError(409, "不能新增過去回合")
            cursor = db.execute("INSERT INTO rounds(activity_id,round_number) VALUES(?,?)", (aid,num))
            return {"id": cursor.lastrowid}
        if method == "POST" and rest == ["prices"]:
            d = self.body()
            rnd = owned(db, "rounds", integer(d.get("round_id"), "回合 ID", 1), aid)
            stock = owned(db, "stocks", integer(d.get("stock_id"), "股票 ID", 1), aid)
            if rnd["round_number"] <= a["current_round"]: raise AppError(409, "已開始的回合價格不可修改")
            value = money(d.get("price"))
            if value <= 0: raise AppError(400, "價格必須大於零")
            db.execute("""INSERT INTO prices(stock_id,round_id,price) VALUES(?,?,?)
              ON CONFLICT(stock_id,round_id) DO UPDATE SET price=excluded.price""", (stock["id"],rnd["id"],value))
            return {"ok": True}
        if method == "POST" and rest == ["next"]:
            db.execute("BEGIN IMMEDIATE")
            a = activity(db, aid)
            if a["status"] != "ACTIVE": raise AppError(409, "活動已結束")
            target = a["current_round"]+1
            rnd = one(db, "SELECT * FROM rounds WHERE activity_id=? AND round_number=?", (aid,target))
            if not rnd: raise AppError(409, "請先建立下一回合")
            missing = one(db, """SELECT COUNT(*) FROM stocks s WHERE s.activity_id=? AND NOT EXISTS
              (SELECT 1 FROM prices p WHERE p.stock_id=s.id AND p.round_id=?)""", (aid,rnd["id"]))[0]
            total = one(db, "SELECT COUNT(*) FROM stocks WHERE activity_id=?", (aid,))[0]
            if total == 0 or missing: raise AppError(409, "下一回合的股票價格尚未全部設定")
            if a["current_round"]:
                db.execute("UPDATE rounds SET status='CLOSED',ended_at=? WHERE activity_id=? AND round_number=?",
                  (now(),aid,a["current_round"]))
            db.execute("UPDATE rounds SET status='ACTIVE',stage='INFORMATION',started_at=? WHERE id=?", (now(),rnd["id"]))
            db.execute("UPDATE activities SET current_round=?,stage='INFORMATION',timer_ends_at=NULL,timer_remaining=0 WHERE id=?", (target,aid))
            db.execute("COMMIT")
            return {"round": target}
        if method == "POST" and rest == ["stage"]:
            d = self.body()
            stage = d.get("stage")
            if stage not in STAGES or stage == "FINISHED": raise AppError(400, "階段無效")
            if a["status"] != "ACTIVE" or a["current_round"] == 0: raise AppError(409, "活動尚未開始或已結束")
            db.execute("UPDATE activities SET stage=?,timer_ends_at=NULL,timer_remaining=0 WHERE id=?", (stage,aid))
            db.execute("UPDATE rounds SET stage=? WHERE activity_id=? AND round_number=?", (stage,aid,a["current_round"]))
            return {"stage": stage}
        if method == "POST" and rest == ["timer"]:
            d = self.body(); action = d.get("action")
            if a["status"] != "ACTIVE": raise AppError(409, "活動已結束")
            if action in ("start", "reset"):
                seconds = integer(d.get("seconds", a["timer_remaining"]), "秒數", 0)
                end = (datetime.now(timezone.utc)+timedelta(seconds=seconds)).isoformat(timespec="seconds") if action == "start" else None
                db.execute("UPDATE activities SET timer_remaining=?,timer_ends_at=? WHERE id=?", (seconds,end,aid))
            elif action == "pause":
                _, seconds = stage_timer(db,a)
                db.execute("UPDATE activities SET timer_remaining=?,timer_ends_at=NULL WHERE id=?", (seconds,aid))
            elif action == "resume":
                end = (datetime.now(timezone.utc)+timedelta(seconds=a["timer_remaining"])).isoformat(timespec="seconds")
                db.execute("UPDATE activities SET timer_ends_at=? WHERE id=?", (end,aid))
            elif action == "skip":
                db.execute("UPDATE activities SET timer_remaining=0,timer_ends_at=NULL WHERE id=?", (aid,))
            else: raise AppError(400, "計時器操作無效")
            return {"ok": True}
        if method == "POST" and rest == ["news"]:
            d = self.body()
            rnd = owned(db,"rounds",integer(d.get("round_id"),"回合 ID",1),aid)
            if rnd["round_number"] < a["current_round"]: raise AppError(409,"不能建立過去回合情報")
            typ = d.get("type", "PRIVATE")
            if typ not in ("PRIVATE","GROUP","PUBLIC"): raise AppError(400,"情報類型無效")
            db.execute("BEGIN IMMEDIATE")
            cursor = db.execute("""INSERT INTO news(activity_id,round_id,title,content,image,category,type,created_at)
              VALUES(?,?,?,?,?,?,?,?)""", (aid,rnd["id"],required(d.get("title"),"標題",150),
              required(d.get("content"),"內容",10000),str(d.get("image", ""))[:1000],
              str(d.get("category", ""))[:100],typ,now()))
            self.set_assignments(db, aid, cursor.lastrowid,
              [x["id"] for x in rows(db,"SELECT id FROM teams WHERE activity_id=?",(aid,))] if typ=="PUBLIC" else d.get("team_ids", []))
            db.execute("COMMIT")
            return {"id":cursor.lastrowid}
        if method == "POST" and len(rest) == 2 and rest[0] == "news":
            n = owned(db,"news",integer(rest[1],"情報 ID",1),aid)
            d = self.body()
            released = one(db,"SELECT COUNT(*) FROM news_assignments WHERE news_id=? AND released=1",(n["id"],))[0]
            if released and ("team_ids" in d or any(k in d for k in ("title","content","image","category"))):
                raise AppError(409,"已發布情報不可修改內容或接收隊伍；請新增更正情報")
            typ = d.get("type", n["type"])
            if typ not in ("PRIVATE","GROUP","PUBLIC"): raise AppError(400,"情報類型無效")
            db.execute("BEGIN IMMEDIATE")
            db.execute("UPDATE news SET title=?,content=?,image=?,category=?,type=? WHERE id=?",
              (required(d.get("title",n["title"]),"標題",150),required(d.get("content",n["content"]),"內容",10000),
               str(d.get("image",n["image"]))[:1000],str(d.get("category",n["category"]))[:100],typ,n["id"]))
            if typ=="PUBLIC":
                existing={x["team_id"] for x in rows(db,"SELECT team_id FROM news_assignments WHERE news_id=?",(n["id"],))}
                for t in rows(db,"SELECT id FROM teams WHERE activity_id=?",(aid,)):
                    if t["id"] not in existing:
                        db.execute("INSERT INTO news_assignments(news_id,team_id,released,released_at,original_recipient) VALUES(?,?,?,?,0)",
                          (n["id"],t["id"],int(bool(released)),now() if released else None))
            elif "team_ids" in d: self.set_assignments(db,aid,n["id"],d["team_ids"])
            db.execute("COMMIT")
            return {"ok":True}
        if method == "GET" and rest == ["release-preview"]:
            rnd = one(db,"SELECT id FROM rounds WHERE activity_id=? AND round_number=?",(aid,a["current_round"]))
            if not rnd: raise AppError(409,"尚未開始回合")
            return self.release_preview(db,aid,rnd["id"])
        if method == "POST" and rest == ["release"]:
            db.execute("BEGIN IMMEDIATE")
            a = activity(db,aid)
            if a["status"] != "ACTIVE" or a["current_round"] == 0: raise AppError(409,"活動未進行")
            rnd = one(db,"SELECT id FROM rounds WHERE activity_id=? AND round_number=?",(aid,a["current_round"]))
            preview = self.release_preview(db,aid,rnd["id"])
            db.execute("""UPDATE news_assignments SET released=1,released_at=? WHERE released=0
              AND news_id IN (SELECT id FROM news WHERE round_id=?)""",(now(),rnd["id"]))
            db.execute("COMMIT")
            return {"released":preview}
        if method == "POST" and rest == ["random-assign"]:
            d = self.body(); rnd = owned(db,"rounds",integer(d.get("round_id"),"回合 ID",1),aid)
            count = integer(d.get("count"),"每隊情報數",1)
            pool = rows(db,"SELECT id FROM news WHERE round_id=? AND type!='PUBLIC' ORDER BY id",(rnd["id"],))
            if count > len(pool): raise AppError(400,"新聞池數量不足")
            teams = rows(db,"SELECT id FROM teams WHERE activity_id=?",(aid,))
            if one(db,"""SELECT COUNT(*) FROM news_assignments na JOIN news n ON n.id=na.news_id
              WHERE n.round_id=? AND na.released=1""",(rnd["id"],))[0]:
                raise AppError(409,"已發布情報不可重新隨機分配")
            db.execute("BEGIN IMMEDIATE")
            db.execute("DELETE FROM news_assignments WHERE news_id IN (SELECT id FROM news WHERE round_id=?)",(rnd["id"],))
            for team in teams:
                for news in secrets.SystemRandom().sample(pool,count):
                    db.execute("INSERT INTO news_assignments(news_id,team_id) VALUES(?,?)",(news["id"],team["id"]))
            db.execute("COMMIT")
            return {"preview":self.release_preview(db,aid,rnd["id"])}
        if method == "POST" and rest == ["snapshots"]:
            d = self.body(); level = d.get("display_level","C")
            if level not in DISPLAY_LEVELS: raise AppError(400,"公布層級無效")
            db.execute("BEGIN IMMEDIATE")
            sid = snapshot_create(db,aid,level,bool(d.get("is_final",False)))
            db.execute("COMMIT")
            return {"id":sid}
        if method == "POST" and len(rest) == 3 and rest[0] == "snapshots" and rest[2] == "publish":
            snap = owned(db,"snapshots",integer(rest[1],"快照 ID",1),aid)
            db.execute("UPDATE snapshots SET is_published=1,published_at=COALESCE(published_at,?) WHERE id=?",(now(),snap["id"]))
            return {"ok":True}
        if method == "POST" and rest == ["duplicate"]:
            return self.duplicate(db,aid)
        if method == "POST" and rest == ["import"]:
            return self.import_csv(db,aid,self.body())
        raise AppError(404,"找不到管理 API")

    def set_fields(self,db,stock_id,fields):
        if not isinstance(fields,list) or len(fields)>50: raise AppError(400,"自訂欄位格式錯誤")
        db.execute("DELETE FROM stock_fields WHERE stock_id=?",(stock_id,))
        for i,f in enumerate(fields):
            db.execute("INSERT INTO stock_fields(stock_id,field_name,field_value,display_order) VALUES(?,?,?,?)",
              (stock_id,required(f.get("field_name"),"欄位名",100),str(f.get("field_value",""))[:500],i))

    def set_assignments(self,db,aid,nid,team_ids):
        if not isinstance(team_ids,list): raise AppError(400,"隊伍清單格式錯誤")
        ids = set(integer(x,"隊伍 ID",1) for x in team_ids)
        for tid in ids: owned(db,"teams",tid,aid)
        db.execute("DELETE FROM news_assignments WHERE news_id=?",(nid,))
        for tid in ids: db.execute("INSERT INTO news_assignments(news_id,team_id) VALUES(?,?)",(nid,tid))

    def release_preview(self,db,aid,rid):
        teams = rows(db,"SELECT id,name FROM teams WHERE activity_id=? ORDER BY id",(aid,))
        return [{"team_id":t["id"],"team_name":t["name"],"news":rows(db,"""SELECT n.id,n.title
          FROM news n JOIN news_assignments na ON na.news_id=n.id WHERE na.team_id=?
          AND n.round_id=? AND na.released=0 ORDER BY n.id""",(t["id"],rid))} for t in teams]

    def duplicate(self,db,aid):
        source = activity(db,aid)
        code = source["code"] + "-COPY-" + secrets.token_hex(2).upper()
        db.execute("BEGIN IMMEDIATE")
        new_id = db.execute("INSERT INTO activities(name,code,initial_cash,created_at) VALUES(?,?,?,?)",
          (source["name"]+"（複製）",code,source["initial_cash"],now())).lastrowid
        smap,rmap,tmap={}, {}, {}
        for s in rows(db,"SELECT * FROM stocks WHERE activity_id=?",(aid,)):
            new = db.execute("INSERT INTO stocks(activity_id,symbol,name,industry,description,logo,financials) VALUES(?,?,?,?,?,?,?)",
              (new_id,s["symbol"],s["name"],s["industry"],s["description"],s["logo"],s["financials"])).lastrowid
            smap[s["id"]]=new
            for f in rows(db,"SELECT * FROM stock_fields WHERE stock_id=?",(s["id"],)):
                db.execute("INSERT INTO stock_fields(stock_id,field_name,field_value,display_order) VALUES(?,?,?,?)",
                  (new,f["field_name"],f["field_value"],f["display_order"]))
        for t in rows(db,"SELECT * FROM teams WHERE activity_id=?",(aid,)):
            token=secrets.token_urlsafe(32)
            tmap[t["id"]]=db.execute("INSERT INTO teams(activity_id,name,token_hash,cash,created_at) VALUES(?,?,?,?,?)",
              (new_id,t["name"],session_hash(token),source["initial_cash"],now())).lastrowid
        for r in rows(db,"SELECT * FROM rounds WHERE activity_id=?",(aid,)):
            rmap[r["id"]]=db.execute("INSERT INTO rounds(activity_id,round_number) VALUES(?,?)",(new_id,r["round_number"])).lastrowid
        for x in rows(db,"""SELECT p.* FROM prices p JOIN rounds r ON r.id=p.round_id WHERE r.activity_id=?""",(aid,)):
            db.execute("INSERT INTO prices VALUES(?,?,?)",(smap[x["stock_id"]],rmap[x["round_id"]],x["price"]))
        for n in rows(db,"SELECT * FROM news WHERE activity_id=?",(aid,)):
            nn=db.execute("INSERT INTO news(activity_id,round_id,title,content,image,category,type,created_at) VALUES(?,?,?,?,?,?,?,?)",
              (new_id,rmap[n["round_id"]],n["title"],n["content"],n["image"],n["category"],n["type"],now())).lastrowid
            for x in rows(db,"SELECT * FROM news_assignments WHERE news_id=?",(n["id"],)):
                db.execute("INSERT INTO news_assignments(news_id,team_id,original_recipient) VALUES(?,?,?)",
                  (nn,tmap[x["team_id"]],x["original_recipient"]))
        db.execute("COMMIT")
        return {"id":new_id,"code":code}

    def import_csv(self,db,aid,d):
        kind = d.get("kind")
        if "xlsx_base64" in d:
            parsed=xlsx_rows(d["xlsx_base64"])
        else:
            content = str(d.get("csv", ""))
            if len(content)>1_000_000: raise AppError(413,"CSV 太大")
            parsed=list(csv.DictReader(io.StringIO(content.lstrip("\ufeff"))))
        if not parsed: raise AppError(400,"CSV 沒有資料")
        db.execute("BEGIN IMMEDIATE")
        count=0
        if kind == "prices":
            a=activity(db,aid)
            for row in parsed:
                num=integer(row.get("Round"),"Round",1)
                rnd=one(db,"SELECT * FROM rounds WHERE activity_id=? AND round_number=?",(aid,num))
                if not rnd or num<=a["current_round"]: raise AppError(409,f"Round {num} 不存在或已開始")
                for symbol,value in row.items():
                    if symbol=="Round" or not value or not value.strip(): continue
                    stock=one(db,"SELECT id FROM stocks WHERE activity_id=? AND symbol=?",(aid,symbol.strip().upper()))
                    if not stock: raise AppError(400,f"找不到股票 {symbol}")
                    price=money(value)
                    if price<=0: raise AppError(400,"價格必須大於零")
                    db.execute("INSERT INTO prices VALUES(?,?,?) ON CONFLICT(stock_id,round_id) DO UPDATE SET price=excluded.price",
                      (stock["id"],rnd["id"],price)); count+=1
        elif kind == "news":
            for row in parsed:
                num=integer(row.get("Round"),"Round",1)
                rnd=one(db,"SELECT * FROM rounds WHERE activity_id=? AND round_number=?",(aid,num))
                if not rnd or num<activity(db,aid)["current_round"]: raise AppError(409,f"Round {num} 不存在或已結束")
                name=required(row.get("Team"),"Team",60)
                team=one(db,"SELECT id FROM teams WHERE activity_id=? AND name=?",(aid,name))
                if not team: raise AppError(400,f"找不到隊伍 {name}")
                title=required(row.get("News"),"News",150)
                content_text=required(row.get("Content") or title,"Content",10000)
                news_id=db.execute("INSERT INTO news(activity_id,round_id,title,content,type,created_at) VALUES(?,?,?,?,?,?)",
                  (aid,rnd["id"],title,content_text,"PRIVATE",now())).lastrowid
                db.execute("INSERT INTO news_assignments(news_id,team_id) VALUES(?,?)",(news_id,team["id"])); count+=1
        else: raise AppError(400,"匯入類型無效")
        db.execute("COMMIT")
        return {"imported":count}


if __name__ == "__main__":
    init_db()
    print(f"Camp Investment Platform: http://{HOST}:{PORT}", flush=True)
    ThreadingHTTPServer((HOST,PORT),Handler).serve_forever()
