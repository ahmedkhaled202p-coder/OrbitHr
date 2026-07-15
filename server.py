#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Orbit HR v4.1.0 Production Backend
----------------------------------
A standard-library backend that serves the Orbit HR PWA and stores data centrally
in SQLite. This release keeps backwards compatibility with the existing front-end
state while adding production-style structured tables, granular APIs, server-side
validation, permission checks, audit logs, backups, uploads, quality checks,
attendance geofencing, and server-side payroll calculation.
"""
from __future__ import annotations

import base64
import calendar
import datetime as _dt
import hashlib
import hmac
import json
import math
import mimetypes
import os
import re
import secrets
import shutil
import sqlite3
import threading
import time
import urllib.parse
from zoneinfo import ZoneInfo
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple
from zoneinfo import ZoneInfo
import copy

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "server_data"
UPLOAD_DIR = DATA_DIR / "uploads"
BACKUP_DIR = DATA_DIR / "backups"
DB_PATH = DATA_DIR / "orbit_hr.sqlite3"
SECRET_PATH = DATA_DIR / "server_secret.key"
INITIAL_STATE_PATH = ROOT / "initial_state.json"
APP_STATE_ID = 1
APP_VERSION = "4.8.0-expenses-by-branch"
TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7
PBKDF2_ITERATIONS = 260_000
PORT = int(os.environ.get("PORT", os.environ.get("ORBIT_HR_PORT", "8080")))
HOST = os.environ.get("ORBIT_HR_HOST", "0.0.0.0")
PUBLIC_ORIGIN = os.environ.get("ORBIT_HR_PUBLIC_ORIGIN", "").rstrip("/")
ALLOWED_ORIGINS = os.environ.get("ORBIT_HR_ALLOWED_ORIGINS", PUBLIC_ORIGIN)
SERVER_TZ = ZoneInfo(os.environ.get("ORBIT_HR_TIMEZONE", "Africa/Cairo"))
PUBLIC_FILES = {"index.html","app.js","styles.css","manifest.json","sw.js","privacy.html","terms.html","logo.svg"} | {f"icon-{n}.png" for n in (48,72,96,128,144,152,167,180,192,256,384,512)} | {"orbit-logo.png","orbit-logo-ui.png","orbit-mark.png","orbit-mark-ui.png"}
APP_TIMEZONE = os.environ.get("ORBIT_HR_TIMEZONE", "Africa/Cairo")
MAX_UPLOAD_BYTES = int(os.environ.get("ORBIT_HR_MAX_UPLOAD_BYTES", str(15 * 1024 * 1024)))
DEFAULT_BOOTSTRAP_PASSWORDS = {
    "admin@hr.local": os.environ.get("ORBIT_HR_BOOTSTRAP_ADMIN_PASSWORD", ""),
    "manager@hr.local": os.environ.get("ORBIT_HR_BOOTSTRAP_MANAGER_PASSWORD", ""),
    "employee@hr.local": os.environ.get("ORBIT_HR_BOOTSTRAP_EMPLOYEE_PASSWORD", ""),
}
_db_lock = threading.RLock()


def app_tz() -> ZoneInfo:
    try:
        return ZoneInfo(APP_TIMEZONE)
    except Exception:
        return ZoneInfo("Africa/Cairo")


def utc_now() -> str:
    return _dt.datetime.now(_dt.timezone.utc).replace(microsecond=0).isoformat()

def local_now() -> _dt.datetime:
    return _dt.datetime.now(SERVER_TZ)


def local_now() -> _dt.datetime:
    return _dt.datetime.now(app_tz()).replace(microsecond=0)


def local_now_iso() -> str:
    return local_now().isoformat()


def server_today() -> _dt.date:
    return local_now().date()


def json_dumps(obj: Any, *, indent: Optional[int] = None) -> str:
    if indent is None:
        return json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
    return json.dumps(obj, ensure_ascii=False, indent=indent)


def ensure_dirs() -> None:
    for path in (DATA_DIR, UPLOAD_DIR, BACKUP_DIR):
        path.mkdir(parents=True, exist_ok=True)
    if not SECRET_PATH.exists():
        SECRET_PATH.write_text(secrets.token_hex(64), encoding="utf-8")


def get_secret() -> bytes:
    ensure_dirs()
    return SECRET_PATH.read_text(encoding="utf-8").strip().encode("utf-8")


def db() -> sqlite3.Connection:
    ensure_dirs()
    con = sqlite3.connect(DB_PATH, timeout=30, check_same_thread=False)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("PRAGMA foreign_keys=ON")
    return con


def password_hash(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS)
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${base64.b64encode(salt).decode()}${base64.b64encode(digest).decode()}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        scheme, rounds, salt_b64, digest_b64 = encoded.split("$", 3)
        if scheme != "pbkdf2_sha256":
            return False
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(digest_b64)
        actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, int(rounds))
        return hmac.compare_digest(actual, expected)
    except Exception:
        return False


def token_hash(token: str) -> str:
    return hmac.new(get_secret(), token.encode("utf-8"), hashlib.sha256).hexdigest()


def as_list(value: Any) -> List[Any]:
    return value if isinstance(value, list) else []


def as_dict(value: Any) -> Dict[str, Any]:
    return value if isinstance(value, dict) else {}


def clean_str(value: Any) -> str:
    return str(value or "").strip()


def lower(value: Any) -> str:
    return clean_str(value).lower()


def to_float(value: Any, default: float = 0.0) -> float:
    try:
        if value is None or value == "":
            return default
        return float(value)
    except Exception:
        return default


def to_int(value: Any, default: int = 0) -> int:
    try:
        return int(float(value))
    except Exception:
        return default


def make_id(prefix: str) -> str:
    return f"{prefix}_{int(time.time() * 1000)}_{secrets.token_hex(4)}"


def today_iso() -> str:
    return server_today().isoformat()


def parse_date(value: Any) -> Optional[_dt.date]:
    if not value:
        return None
    try:
        return _dt.date.fromisoformat(str(value)[:10])
    except Exception:
        return None


def parse_dt(value: Any) -> Optional[_dt.datetime]:
    """Parse a date/time and normalize it to the application's local timezone as naive datetime.

    Attendance shifts are configured as local branch times (Africa/Cairo by default).
    The previous implementation converted incoming ISO timestamps to UTC and compared
    them against local shift times, which caused false late/early calculations.
    """
    if not value:
        return None
    s = str(value)
    try:
        if s.endswith("Z"):
            s = s[:-1] + "+00:00"
        dt = _dt.datetime.fromisoformat(s)
        if dt.tzinfo:
            dt = dt.astimezone(app_tz()).replace(tzinfo=None)
        return dt
    except Exception:
        return None


def parse_time_hm(value: Any) -> Optional[_dt.time]:
    if not value:
        return None
    try:
        parts = str(value).split(":")
        return _dt.time(int(parts[0]), int(parts[1] if len(parts) > 1 else 0))
    except Exception:
        return None


def date_range(start: _dt.date, end: _dt.date) -> Iterable[_dt.date]:
    d = start
    while d <= end:
        yield d
        d += _dt.timedelta(days=1)


def month_start_end(month: str) -> Tuple[_dt.date, _dt.date]:
    y, m = [int(x) for x in month.split("-", 1)]
    last = calendar.monthrange(y, m)[1]
    return _dt.date(y, m, 1), _dt.date(y, m, last)


def in_month(date_value: Any, month: str) -> bool:
    return clean_str(date_value).startswith(month)


def js_weekday(d: _dt.date) -> str:
    # JS getDay: Sunday=0, Monday=1 ... Saturday=6. Python Monday=0.
    return str((d.weekday() + 1) % 7)


def combine_date_time(d: _dt.date, hm: str) -> Optional[_dt.datetime]:
    t = parse_time_hm(hm)
    if not t:
        return None
    return _dt.datetime.combine(d, t)


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371000.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dl / 2) ** 2
    return 2 * r * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def sanitize_state(state: Dict[str, Any]) -> Dict[str, Any]:
    """Remove secrets before sending/saving state in browser cache."""
    clean = copy.deepcopy(state)
    for u in as_list(clean.get("users")):
        if isinstance(u, dict):
            u.pop("password", None)
            u.pop("passwordHash", None)
            u.pop("_pendingPassword", None)
    return clean

def load_initial_state() -> Dict[str, Any]:
    if INITIAL_STATE_PATH.exists():
        return sanitize_state(json.loads(INITIAL_STATE_PATH.read_text(encoding="utf-8")))
    return {
        "settings": {"company": "أوربت للاستشارات الهندسية", "currency": "EGP", "branches": [], "departments": []},
        "users": [{"id": "u1", "employeeId": "e1", "name": "System Admin", "email": "admin@hr.local", "role": "admin", "active": True}],
        "employees": [], "shifts": [], "attendance": [], "leaves": [], "missions": [], "adjustments": [], "advances": [], "dues": [], "payroll": [], "auditLog": []
    }


def init_db() -> None:
    with _db_lock, db() as con:
        con.executescript(
            """
            CREATE TABLE IF NOT EXISTS app_state (
              id INTEGER PRIMARY KEY CHECK (id = 1),
              data TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              updated_by TEXT
            );
            CREATE TABLE IF NOT EXISTS auth_users (
              id TEXT PRIMARY KEY,
              employee_id TEXT,
              name TEXT NOT NULL,
              email TEXT NOT NULL UNIQUE,
              password_hash TEXT NOT NULL,
              role TEXT NOT NULL DEFAULT 'employee',
              active INTEGER NOT NULL DEFAULT 1,
              permissions TEXT DEFAULT '[]',
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              must_change_password INTEGER NOT NULL DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS api_sessions (
              token_hash TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              created_at TEXT NOT NULL,
              expires_at INTEGER NOT NULL,
              user_agent TEXT,
              ip TEXT,
              FOREIGN KEY(user_id) REFERENCES auth_users(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS audit_log (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              actor_id TEXT,
              actor_email TEXT,
              action TEXT NOT NULL,
              area TEXT NOT NULL,
              details TEXT,
              ip TEXT,
              created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS uploads (
              id TEXT PRIMARY KEY,
              entity TEXT NOT NULL,
              entity_id TEXT,
              filename TEXT NOT NULL,
              mime TEXT,
              size INTEGER NOT NULL DEFAULT 0,
              path TEXT NOT NULL,
              uploaded_by TEXT,
              created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS notifications (
              id TEXT PRIMARY KEY,
              user_id TEXT,
              title TEXT NOT NULL,
              body TEXT,
              status TEXT NOT NULL DEFAULT 'unread',
              created_at TEXT NOT NULL,
              read_at TEXT
            );
            CREATE TABLE IF NOT EXISTS backups (
              id TEXT PRIMARY KEY,
              filename TEXT NOT NULL,
              path TEXT NOT NULL,
              size INTEGER NOT NULL DEFAULT 0,
              created_at TEXT NOT NULL,
              created_by TEXT
            );
            CREATE TABLE IF NOT EXISTS hr_employees (
              id TEXT PRIMARY KEY,
              code TEXT UNIQUE,
              name TEXT,
              email TEXT,
              branch TEXT,
              department TEXT,
              job_title TEXT,
              status TEXT,
              shift_id TEXT,
              salary REAL DEFAULT 0,
              data TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS hr_shifts (
              id TEXT PRIMARY KEY,
              name TEXT,
              data TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS hr_attendance (
              id TEXT PRIMARY KEY,
              employee_id TEXT NOT NULL,
              date TEXT NOT NULL,
              status TEXT,
              check_in TEXT,
              check_out TEXT,
              late_minutes INTEGER DEFAULT 0,
              overtime_minutes INTEGER DEFAULT 0,
              early_leave_minutes INTEGER DEFAULT 0,
              verification_status TEXT,
              data TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              UNIQUE(employee_id, date)
            );
            CREATE TABLE IF NOT EXISTS hr_payroll (
              id TEXT PRIMARY KEY,
              employee_id TEXT NOT NULL,
              month TEXT NOT NULL,
              branch TEXT,
              status TEXT,
              gross REAL DEFAULT 0,
              total_deductions REAL DEFAULT 0,
              net REAL DEFAULT 0,
              data TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              UNIQUE(employee_id, month)
            );
            CREATE TABLE IF NOT EXISTS hr_requests (
              id TEXT PRIMARY KEY,
              request_type TEXT NOT NULL,
              employee_id TEXT,
              from_date TEXT,
              to_date TEXT,
              status TEXT,
              data TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS branch_locations (
              branch TEXT PRIMARY KEY,
              lat REAL,
              lng REAL,
              radius INTEGER DEFAULT 300,
              enabled INTEGER DEFAULT 0,
              data TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_hr_attendance_employee_date ON hr_attendance(employee_id, date);
            CREATE INDEX IF NOT EXISTS idx_hr_payroll_month ON hr_payroll(month, branch);
            CREATE INDEX IF NOT EXISTS idx_hr_requests_employee ON hr_requests(employee_id, status);
            """
        )
        row = con.execute("SELECT COUNT(*) AS c FROM app_state").fetchone()
        if int(row["c"]) == 0:
            raw_state = load_initial_state()
            sync_users_from_state(con, raw_state)
            state = sanitize_state(raw_state)
            con.execute(
                "INSERT INTO app_state(id,data,updated_at,updated_by) VALUES(1,?,?,?)",
                (json_dumps(state), utc_now(), "system"),
            )
            sync_structured_tables_from_state(con, state)
            audit(con, None, "تهيئة النظام", "النظام", "تم إنشاء قاعدة البيانات لأول مرة", "local")
        else:
            state = load_state_from_db(con)[0]
            sync_users_from_state(con, load_initial_state())
            cleaned = sanitize_state(state)
            if cleaned != state:
                con.execute("UPDATE app_state SET data=?, updated_at=?, updated_by=? WHERE id=1", (json_dumps(cleaned), utc_now(), "security_migration"))
                state = cleaned
            sync_structured_tables_from_state(con, state)


def load_state_from_db(con: sqlite3.Connection) -> Tuple[Dict[str, Any], str]:
    row = con.execute("SELECT data, updated_at FROM app_state WHERE id=1").fetchone()
    if not row:
        state = load_initial_state()
        return state, utc_now()
    return json.loads(row["data"]), row["updated_at"]


def save_state_to_db(con: sqlite3.Connection, state: Dict[str, Any], user_id: Optional[str]) -> str:
    state = sanitize_state(state)
    errors = critical_validation_errors(state)
    if errors:
        raise ValueError("validation_failed::" + json_dumps(errors))
    now = utc_now()
    con.execute("UPDATE app_state SET data=?, updated_at=?, updated_by=? WHERE id=1", (json_dumps(state), now, user_id or "anonymous"))
    sync_users_from_state(con, state)
    sync_structured_tables_from_state(con, state)
    return now


def sync_users_from_state(con: sqlite3.Connection, state: Dict[str, Any]) -> None:
    users = as_list(state.get("users"))
    now = utc_now()
    for u in users:
        if not isinstance(u, dict):
            continue
        email = lower(u.get("email"))
        if not email:
            continue
        user_id = clean_str(u.get("id")) or f"u_{hashlib.sha1(email.encode()).hexdigest()[:10]}"
        permissions = u.get("permissions") or u.get("customPermissions") or []
        old = con.execute("SELECT id,password_hash FROM auth_users WHERE email=?", (email,)).fetchone()
        if old:
            con.execute(
                "UPDATE auth_users SET employee_id=?, name=?, role=?, active=?, permissions=?, updated_at=? WHERE email=?",
                (u.get("employeeId") or "", u.get("name") or email, u.get("role") or "employee", 1 if u.get("active", True) else 0, json_dumps(permissions), now, email),
            )
        else:
            pw = str(u.get("password") or DEFAULT_BOOTSTRAP_PASSWORDS.get(email) or "ChangeMe@123")
            con.execute(
                "INSERT INTO auth_users(id,employee_id,name,email,password_hash,role,active,permissions,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)",
                (user_id, u.get("employeeId") or "", u.get("name") or email, email, password_hash(pw), u.get("role") or "employee", 1 if u.get("active", True) else 0, json_dumps(permissions), now, now),
            )


def sync_structured_tables_from_state(con: sqlite3.Connection, state: Dict[str, Any]) -> None:
    now = utc_now()
    con.execute("DELETE FROM hr_employees")
    for e in as_list(state.get("employees")):
        if not isinstance(e, dict) or not e.get("id"):
            continue
        con.execute(
            "INSERT OR REPLACE INTO hr_employees(id,code,name,email,branch,department,job_title,status,shift_id,salary,data,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
            (clean_str(e.get("id")), clean_str(e.get("code")), clean_str(e.get("name")), lower(e.get("email")), clean_str(e.get("branch")), clean_str(e.get("department")), clean_str(e.get("jobTitle")), clean_str(e.get("status") or "active"), clean_str(e.get("shiftId")), to_float(e.get("salary")), json_dumps(e), now),
        )
    con.execute("DELETE FROM hr_shifts")
    for s in as_list(state.get("shifts")):
        if isinstance(s, dict) and s.get("id"):
            con.execute("INSERT OR REPLACE INTO hr_shifts(id,name,data,updated_at) VALUES(?,?,?,?)", (clean_str(s.get("id")), clean_str(s.get("name")), json_dumps(s), now))
    con.execute("DELETE FROM hr_attendance")
    for a in as_list(state.get("attendance")):
        if not isinstance(a, dict) or not a.get("employeeId") or not a.get("date"):
            continue
        aid = clean_str(a.get("id")) or make_id("a")
        a["id"] = aid
        con.execute(
            "INSERT OR REPLACE INTO hr_attendance(id,employee_id,date,status,check_in,check_out,late_minutes,overtime_minutes,early_leave_minutes,verification_status,data,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
            (aid, clean_str(a.get("employeeId")), clean_str(a.get("date"))[:10], clean_str(a.get("status")), clean_str(a.get("checkIn")), clean_str(a.get("checkOut")), to_int(a.get("lateMinutes")), to_int(a.get("overtimeMinutes")), to_int(a.get("earlyLeaveMinutes")), clean_str(a.get("verificationStatus")), json_dumps(a), now),
        )
    con.execute("DELETE FROM hr_payroll")
    for p in as_list(state.get("payroll")):
        if not isinstance(p, dict) or not p.get("employeeId") or not p.get("month"):
            continue
        pid = clean_str(p.get("id")) or make_id("pay")
        p["id"] = pid
        con.execute(
            "INSERT OR REPLACE INTO hr_payroll(id,employee_id,month,branch,status,gross,total_deductions,net,data,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)",
            (pid, clean_str(p.get("employeeId")), clean_str(p.get("month")), clean_str(p.get("branch")), clean_str(p.get("status") or "draft"), to_float(p.get("gross") or p.get("totalEarnings")), to_float(p.get("totalDeductions")), to_float(p.get("net")), json_dumps(p), now),
        )
    con.execute("DELETE FROM hr_requests")
    for typ, key in (("leave", "leaves"), ("mission", "missions"), ("permission", "permissions"), ("shiftRequest", "shiftRequests")):
        for r in as_list(state.get(key)):
            if isinstance(r, dict) and r.get("id"):
                con.execute(
                    "INSERT OR REPLACE INTO hr_requests(id,request_type,employee_id,from_date,to_date,status,data,updated_at) VALUES(?,?,?,?,?,?,?,?)",
                    (clean_str(r.get("id")), typ, clean_str(r.get("employeeId")), clean_str(r.get("from") or r.get("date")), clean_str(r.get("to") or r.get("date")), clean_str(r.get("status")), json_dumps(r), now),
                )
    con.execute("DELETE FROM branch_locations")
    settings = as_dict(state.get("settings"))
    locs = as_dict(settings.get("branchLocations"))
    for branch in as_list(settings.get("branches")):
        loc = as_dict(locs.get(branch))
        if not loc:
            continue
        con.execute(
            "INSERT OR REPLACE INTO branch_locations(branch,lat,lng,radius,enabled,data,updated_at) VALUES(?,?,?,?,?,?,?)",
            (clean_str(branch), to_float(loc.get("lat")), to_float(loc.get("lng")), to_int(loc.get("radius"), 300), 1 if loc.get("enabled") else 0, json_dumps(loc), now),
        )



SENSITIVE_STATIC_NAMES = {
    "initial_state.json", "server.py", "start_server.py", "server_secret.key",
    "orbit_hr.sqlite3", "orbit_hr.sqlite3-wal", "orbit_hr.sqlite3-shm",
}
PUBLIC_STATIC_EXTENSIONS = {".html", ".css", ".js", ".json", ".png", ".jpg", ".jpeg", ".webp", ".svg", ".ico", ".txt"}
NO_CACHE_PREFIXES = ("/api/",)

ROLE_PERMISSIONS: Dict[str, set] = {
    "admin": {"*"},
    "manager": {
        "state:read", "employees:read", "employees:write", "attendance:read", "attendance:write",
        "attendance:delete", "leaves:read", "leaves:write", "leaves:approve", "missions:read",
        "missions:write", "missions:approve", "payroll:read", "payroll:write", "payroll:approve",
        "uploads:read", "uploads:write", "quality:read", "notifications:write", "backup:read",
    },
    "employee": {
        "state:read", "employees:read", "attendance:read", "attendance:write",
        "leaves:read", "leaves:write", "missions:read", "missions:write",
        "payroll:read", "uploads:read", "uploads:write",
    },
    "hr": {
        "state:read", "employees:read", "employees:write", "attendance:read", "attendance:write",
        "leaves:read", "leaves:write", "leaves:approve", "missions:read", "missions:write",
        "missions:approve", "payroll:read", "payroll:write", "uploads:read", "uploads:write",
        "quality:read", "backup:read",
    },
    "finance": {"state:read", "employees:read", "payroll:read", "payroll:write", "payroll:approve", "uploads:read", "uploads:write", "backup:read"},
}


def strip_secret_fields(obj: Any) -> Any:
    if isinstance(obj, dict):
        return {k: strip_secret_fields(v) for k, v in obj.items() if k not in ("password", "passwordHash", "password_hash")}
    if isinstance(obj, list):
        return [strip_secret_fields(v) for v in obj]
    return obj


def sanitize_state(state: Dict[str, Any], *, for_storage: bool = True) -> Dict[str, Any]:
    cleaned = strip_secret_fields(state)
    if isinstance(cleaned, dict):
        settings = cleaned.setdefault("settings", {})
        if isinstance(settings, dict):
            settings.setdefault("timezone", APP_TIMEZONE)
            # Preserve old global geofence settings but move real branch rules to branchLocations.
            settings.setdefault("useBranchGeofence", bool(settings.get("requireGPS") or settings.get("useBranchGeofence", False)))
    return cleaned if isinstance(cleaned, dict) else {}


def public_user_dict(user: Dict[str, Any]) -> Dict[str, Any]:
    return {k: v for k, v in user.items() if k not in ("password", "passwordHash", "password_hash")}


def user_can_access_employee(actor: sqlite3.Row, employee_id: str) -> bool:
    if is_admin(actor) or lower(actor["role"]) in ("manager", "hr", "finance"):
        return True
    return clean_str(actor["employee_id"]) == clean_str(employee_id)


def coerce_payroll_fields(item: Dict[str, Any]) -> Dict[str, Any]:
    """Keep backward compatible payroll names for the current UI while exposing clear API names."""
    item["contractBase"] = to_float(item.get("contractBase") or item.get("baseSalary"))
    item["base"] = to_float(item.get("base") or item.get("baseDue"))
    item["overtime"] = to_float(item.get("overtime") or item.get("overtimeAmount"))
    item["insuranceDeduction"] = to_float(item.get("insuranceDeduction") if item.get("insuranceDeduction") not in (None, "") else item.get("insurance"))
    item["taxDeduction"] = to_float(item.get("taxDeduction") if item.get("taxDeduction") not in (None, "") else item.get("tax"))
    item["statutoryDeductions"] = to_float(item.get("statutoryDeductions") or item.get("insuranceDeduction") + item.get("taxDeduction"))
    item["otherDeductions"] = to_float(item.get("otherDeductions") or item.get("manualDeductions"))
    item["advanceDeduction"] = to_float(item.get("advanceDeduction") or item.get("advanceInstallment"))
    item["deductions"] = to_float(item.get("deductions") or item.get("totalDeductions"))
    item["totalDeductions"] = to_float(item.get("totalDeductions") or item.get("deductions"))
    item["gross"] = to_float(item.get("gross") or item.get("totalEarnings"))
    item["net"] = round(to_float(item.get("net") if item.get("net") not in (None, "") else item.get("gross") - item.get("totalDeductions")), 2)
    return item

def current_user(handler: "OrbitHandler") -> Optional[sqlite3.Row]:
    token = handler.headers.get("Authorization", "")
    if token.lower().startswith("bearer "):
        token = token.split(" ", 1)[1].strip()
    else:
        token = ""
    if not token:
        return None
    th = token_hash(token)
    now = int(time.time())
    with _db_lock, db() as con:
        return con.execute(
            "SELECT s.user_id,u.* FROM api_sessions s JOIN auth_users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND u.active=1",
            (th, now),
        ).fetchone()


def create_session(con: sqlite3.Connection, user: sqlite3.Row, handler: "OrbitHandler") -> str:
    token = secrets.token_urlsafe(40)
    con.execute(
        "INSERT INTO api_sessions(token_hash,user_id,created_at,expires_at,user_agent,ip) VALUES(?,?,?,?,?,?)",
        (token_hash(token), user["id"], utc_now(), int(time.time()) + TOKEN_TTL_SECONDS, handler.headers.get("User-Agent", ""), handler.client_address[0]),
    )
    return token


def audit(con: sqlite3.Connection, actor: Optional[sqlite3.Row], action: str, area: str, details: str, ip: str) -> None:
    con.execute(
        "INSERT INTO audit_log(actor_id,actor_email,action,area,details,ip,created_at) VALUES(?,?,?,?,?,?,?)",
        (actor["id"] if actor else None, actor["email"] if actor else "system", action, area, details, ip, utc_now()),
    )


def actor_permissions(actor: sqlite3.Row) -> List[str]:
    try:
        data = json.loads(actor["permissions"] or "[]")
        return [str(x) for x in data]
    except Exception:
        return []


def is_admin(actor: sqlite3.Row) -> bool:
    return lower(actor["role"]) == "admin" or "admin" in actor_permissions(actor) or "*" in actor_permissions(actor)


def has_permission(actor: sqlite3.Row, *perms: str) -> bool:
    if is_admin(actor):
        return True
    role = lower(actor["role"])
    user_perms = set(actor_permissions(actor)) | ROLE_PERMISSIONS.get(role, set())
    if "*" in user_perms:
        return True
    return any(p in user_perms or p.split(":", 1)[0] in user_perms for p in perms)


def visible_state_for_actor(state: Dict[str, Any], actor: sqlite3.Row) -> Dict[str, Any]:
    safe = sanitize_state(state, for_storage=False)
    if is_admin(actor) or lower(actor["role"]) in ("manager", "hr", "finance"):
        safe["users"] = [public_user_dict(u) for u in as_list(safe.get("users"))]
        return safe
    emp_id = actor["employee_id"] or ""
    filtered = dict(safe)
    for key in ("employees", "attendance", "leaves", "missions", "permissions", "shiftRequests", "evaluations", "advances", "dues", "tasks", "complaints", "letters", "documents", "payroll", "adjustments", "custodies"):
        arr = as_list(safe.get(key))
        filtered[key] = [x for x in arr if isinstance(x, dict) and (x.get("employeeId") == emp_id or x.get("id") == emp_id)]
    filtered["users"] = [public_user_dict(u) for u in as_list(safe.get("users")) if isinstance(u, dict) and (u.get("id") == actor["id"] or u.get("employeeId") == emp_id)]
    return filtered


def duplicate_values(items: Sequence[Dict[str, Any]], key: str) -> List[str]:
    seen, dup = set(), set()
    for item in items:
        val = lower(item.get(key))
        if not val:
            continue
        if val in seen:
            dup.add(val)
        seen.add(val)
    return sorted(dup)


def employee_validation_errors(state: Dict[str, Any], payload: Dict[str, Any], current_id: str = "") -> List[str]:
    errors: List[str] = []
    code = clean_str(payload.get("code"))
    name = clean_str(payload.get("name"))
    email = lower(payload.get("email"))
    if not code:
        errors.append("كود الموظف مطلوب")
    if not name:
        errors.append("اسم الموظف مطلوب")
    if not email or "@" not in email:
        errors.append("البريد الوظيفي غير صحيح")
    if to_float(payload.get("salary")) < 0:
        errors.append("الراتب الأساسي لا يمكن أن يكون بالسالب")
    for field in ("insurance", "tax", "insuranceDeduction", "taxDeduction"):
        if to_float(payload.get(field)) < 0:
            errors.append(f"{field} لا يمكن أن يكون بالسالب")
    employees = as_list(state.get("employees"))
    for e in employees:
        if e.get("id") == current_id:
            continue
        if code and lower(e.get("code")) == lower(code):
            errors.append(f"كود الموظف مكرر: {code}")
        if email and lower(e.get("email")) == email:
            errors.append(f"البريد الوظيفي مكرر: {email}")
    if payload.get("status", "active") == "active":
        shift_ids = {clean_str(s.get("id")) for s in as_list(state.get("shifts")) if isinstance(s, dict)}
        if not payload.get("shiftId"):
            errors.append("الموظف النشط يجب ربطه بوردية")
        elif clean_str(payload.get("shiftId")) not in shift_ids:
            errors.append("الوردية المحددة غير موجودة")
    start = parse_date(payload.get("contractStart") or payload.get("hireDate"))
    end = parse_date(payload.get("contractEnd"))
    probation = parse_date(payload.get("probationEnd"))
    if start and end and end < start:
        errors.append("تاريخ نهاية العقد قبل بداية العقد")
    if start and probation and probation < start:
        errors.append("نهاية فترة التجربة قبل بداية العقد")
    branch = clean_str(payload.get("branch"))
    branches = set(clean_str(x) for x in as_list(as_dict(state.get("settings")).get("branches")))
    if branches and branch and branch not in branches:
        errors.append("فرع الموظف غير موجود في إعدادات الشركة")
    return errors


def critical_validation_errors(state: Dict[str, Any]) -> List[str]:
    errors: List[str] = []
    employees = [x for x in as_list(state.get("employees")) if isinstance(x, dict)]
    users = [x for x in as_list(state.get("users")) if isinstance(x, dict)]
    attendance = [x for x in as_list(state.get("attendance")) if isinstance(x, dict)]
    payroll = [x for x in as_list(state.get("payroll")) if isinstance(x, dict)]
    for field, label in (("code", "كود موظف"), ("email", "بريد موظف")):
        for val in duplicate_values(employees, field):
            errors.append(f"تكرار {label}: {val}")
    for val in duplicate_values(users, "email"):
        errors.append(f"تكرار بريد حساب دخول: {val}")
    emp_user_seen: set = set()
    for u in users:
        val = clean_str(u.get("employeeId"))
        if not val:
            continue
        if val in emp_user_seen:
            errors.append(f"الموظف مربوط بأكثر من حساب دخول: {val}")
        emp_user_seen.add(val)
    seen_att = set()
    for a in attendance:
        k = (clean_str(a.get("employeeId")), clean_str(a.get("date"))[:10])
        if not k[0] or not k[1]:
            continue
        if k in seen_att:
            errors.append(f"حضور مكرر لنفس الموظف واليوم: {k[0]} — {k[1]}")
        seen_att.add(k)
    seen_pay = set()
    for p in payroll:
        k = (clean_str(p.get("employeeId")), clean_str(p.get("month")))
        if not k[0] or not k[1]:
            continue
        if k in seen_pay:
            errors.append(f"راتب مكرر لنفس الموظف والشهر: {k[0]} — {k[1]}")
        seen_pay.add(k)
    for e in employees:
        errors.extend(employee_validation_errors(state, e, e.get("id")))
    return sorted(set(errors))


def quality_checks(state: Dict[str, Any]) -> List[Dict[str, str]]:
    issues: List[Dict[str, str]] = []
    for err in critical_validation_errors(state):
        area = "النظام"
        if "موظف" in err or "الوردية" in err:
            area = "الموظفون"
        if "حضور" in err:
            area = "الحضور"
        if "راتب" in err:
            area = "الرواتب"
        issues.append({"level": "error", "area": area, "title": "خطأ يمنع الحفظ الإنتاجي", "details": err, "fix": "راجع السجل وعدله قبل التشغيل الفعلي."})
    settings = as_dict(state.get("settings"))
    locs = as_dict(settings.get("branchLocations"))
    for branch in as_list(settings.get("branches")):
        loc = as_dict(locs.get(branch))
        if settings.get("useBranchGeofence", True) and not loc.get("enabled"):
            issues.append({"level": "warning", "area": "مواقع الفروع", "title": "فرع بدون موقع مفعل", "details": clean_str(branch), "fix": "حدد خط العرض والطول ونطاق السماح للفرع."})
    # Passwords are no longer stored in state; strength is enforced at change/reset endpoints.
    for e in as_list(state.get("employees")):
        if e.get("status") == "active" and not to_float(e.get("salary")):
            issues.append({"level": "warning", "area": "الرواتب", "title": "موظف نشط بدون راتب", "details": clean_str(e.get("name")), "fix": "أدخل الراتب الأساسي."})
    if not issues:
        issues.append({"level": "success", "area": "النظام", "title": "جاهزية جيدة", "details": "لا توجد أخطاء حرجة في البيانات الأساسية.", "fix": "استمر في النسخ الاحتياطي والمراجعة الدورية."})
    return issues


def emp_by_id(state: Dict[str, Any], emp_id: str) -> Optional[Dict[str, Any]]:
    return next((e for e in as_list(state.get("employees")) if isinstance(e, dict) and e.get("id") == emp_id), None)


def shift_by_id(state: Dict[str, Any], shift_id: str) -> Optional[Dict[str, Any]]:
    return next((s for s in as_list(state.get("shifts")) if isinstance(s, dict) and s.get("id") == shift_id), None)


def shift_schedule_for_date(shift: Optional[Dict[str, Any]], d: _dt.date) -> Optional[Dict[str, str]]:
    if not shift:
        return None
    day = js_weekday(d)
    ds = as_dict(shift.get("daySchedules"))
    sched = as_dict(ds.get(day)) if ds else {}
    if ds:
        if not sched.get("enabled"):
            return None
        return {"start": clean_str(sched.get("start") or shift.get("start") or "09:00"), "end": clean_str(sched.get("end") or shift.get("end") or "17:00")}
    work_days = [str(x) for x in as_list(shift.get("workDays"))]
    if work_days and day not in work_days:
        return None
    return {"start": clean_str(shift.get("start") or "09:00"), "end": clean_str(shift.get("end") or "17:00")}


def shift_minutes(sched: Dict[str, str]) -> int:
    st = parse_time_hm(sched.get("start"))
    en = parse_time_hm(sched.get("end"))
    if not st or not en:
        return 8 * 60
    s = st.hour * 60 + st.minute
    e = en.hour * 60 + en.minute
    if e <= s:
        e += 24 * 60
    return max(1, e - s)


def is_holiday(state: Dict[str, Any], d: _dt.date, branch: str = "") -> bool:
    for h in as_list(state.get("holidays")):
        if clean_str(h.get("status") or "active") not in ("active", "approved", ""):
            continue
        f, t = parse_date(h.get("from")), parse_date(h.get("to") or h.get("from"))
        if not f or not t:
            continue
        hb = clean_str(h.get("branch"))
        if f <= d <= t and (not hb or not branch or hb == branch):
            return True
    return False


def leave_on_date(state: Dict[str, Any], emp_id: str, d: _dt.date) -> Optional[Dict[str, Any]]:
    for l in as_list(state.get("leaves")):
        if l.get("employeeId") != emp_id or clean_str(l.get("status")) != "approved":
            continue
        f, t = parse_date(l.get("from")), parse_date(l.get("to") or l.get("from"))
        if f and t and f <= d <= t:
            return l
    return None


def mission_on_date(state: Dict[str, Any], emp_id: str, d: _dt.date) -> Optional[Dict[str, Any]]:
    for m in as_list(state.get("missions")):
        if m.get("employeeId") == emp_id and clean_str(m.get("status")) == "approved" and clean_str(m.get("date"))[:10] == d.isoformat():
            return m
    return None


def normalize_attendance_record(state: Dict[str, Any], rec: Dict[str, Any]) -> Dict[str, Any]:
    emp = emp_by_id(state, clean_str(rec.get("employeeId")))
    d = parse_date(rec.get("date")) or server_today()
    if not rec.get("id"):
        rec["id"] = make_id("a")
    rec["date"] = d.isoformat()
    if clean_str(rec.get("status")) == "absent":
        rec.update({"checkIn": None, "checkOut": None, "lateMinutes": 0, "overtimeMinutes": 0, "earlyLeaveMinutes": 0, "status": "absent"})
        return rec
    shift = shift_by_id(state, clean_str(emp.get("shiftId")) if emp else "")
    sched = shift_schedule_for_date(shift, d)
    check_in = parse_dt(rec.get("checkIn"))
    check_out = parse_dt(rec.get("checkOut"))
    late = overtime = early = 0
    if sched and check_in:
        start_dt = combine_date_time(d, sched["start"])
        end_dt = combine_date_time(d, sched["end"])
        if start_dt and end_dt and end_dt <= start_dt:
            end_dt += _dt.timedelta(days=1)
        grace = to_int(shift.get("grace") if shift else 0)
        late = max(0, int((check_in - (start_dt + _dt.timedelta(minutes=grace))).total_seconds() // 60)) if start_dt else 0
        if check_out and end_dt:
            overtime = max(0, int((check_out - end_dt).total_seconds() // 60))
            early = max(0, int((end_dt - check_out).total_seconds() // 60))
    rec["lateMinutes"] = late
    rec["overtimeMinutes"] = overtime
    rec["earlyLeaveMinutes"] = early
    if not check_in and not check_out:
        rec["status"] = rec.get("status") or "absent"
    elif late > 0:
        rec["status"] = "late"
    else:
        rec["status"] = "present"
    if not rec.get("verificationStatus"):
        rec["verificationStatus"] = "verified" if rec.get("geoVerified") or rec.get("faceVerified") else "manual"
    rec["updatedAt"] = utc_now()
    return rec


def apply_geofence(state: Dict[str, Any], rec: Dict[str, Any], lat: Optional[float], lng: Optional[float], *, punch_type: str = "checkIn", accuracy: Optional[float] = None, mock: Optional[bool] = None) -> Tuple[bool, Optional[str]]:
    settings = as_dict(state.get("settings"))
    emp = emp_by_id(state, clean_str(rec.get("employeeId")))
    branch = clean_str(emp.get("branch")) if emp else clean_str(rec.get("branch"))
    loc = as_dict(as_dict(settings.get("branchLocations")).get(branch))
    use_geo = bool(settings.get("requireGPS")) or bool(settings.get("useBranchGeofence", True))
    if not use_geo:
        return True, None
    if not loc.get("enabled"):
        rec["geoVerified"] = False
        rec["verificationStatus"] = "needs_review"
        rec["verificationNote"] = "موقع الفرع غير مفعل"
        return True, None
    if accuracy is not None:
        rec[f"{('checkOut' if punch_type == 'checkOut' else 'checkIn')}GpsAccuracyMeters"] = round(float(accuracy), 2)
        if accuracy > to_float(settings.get("maxGpsAccuracyMeters"), 150):
            rec["geoVerified"] = False
            rec["verificationStatus"] = "needs_review"
            rec["verificationNote"] = f"دقة GPS ضعيفة: {round(float(accuracy))} متر"
            if settings.get("gpsAccuracyPolicy", "review") == "block":
                return False, "دقة GPS غير كافية للتسجيل"
    if mock:
        rec["geoVerified"] = False
        rec["verificationStatus"] = "needs_review"
        rec["mockLocationDetected"] = True
        rec["verificationNote"] = "تم اكتشاف احتمال استخدام موقع وهمي"
        if settings.get("mockLocationPolicy", "review") == "block":
            return False, "تم رفض التسجيل بسبب موقع وهمي"
    if lat is None or lng is None:
        rec["geoVerified"] = False
        rec["verificationStatus"] = "needs_review"
        rec["verificationNote"] = "لم يتم إرسال الموقع"
        return settings.get("outsideBranchPolicy", "review") != "block", "الموقع مطلوب للتسجيل"
    dist = haversine_m(lat, lng, to_float(loc.get("lat")), to_float(loc.get("lng")))
    radius = max(1, to_int(loc.get("radius"), 300))
    ok = dist <= radius
    field_prefix = "checkOut" if punch_type == "checkOut" else "checkIn"
    rec[f"{field_prefix}Lat"] = lat
    rec[f"{field_prefix}Lng"] = lng
    rec[f"{field_prefix}DistanceMeters"] = round(dist, 2)
    rec["distanceMeters"] = round(dist, 2)
    rec["branchRadiusMeters"] = radius
    rec["geoVerified"] = ok
    if ok:
        rec["verificationStatus"] = "verified" if rec.get("faceVerified", True) else "needs_review"
        return True, None
    policy = settings.get("outsideBranchPolicy") or settings.get("geofencePolicy") or "review"
    rec["verificationStatus"] = "needs_review" if policy in ("review", "warn") else "blocked"
    rec["verificationNote"] = f"خارج نطاق الفرع بمسافة {round(dist)} متر"
    if policy == "block":
        return False, "الموظف خارج نطاق الفرع المسموح"
    return True, None


def validate_attendance_save(state: Dict[str, Any], rec: Dict[str, Any], current_id: str = "") -> List[str]:
    errors: List[str] = []
    if not rec.get("employeeId") or not emp_by_id(state, clean_str(rec.get("employeeId"))):
        errors.append("الموظف غير موجود")
    if not parse_date(rec.get("date")):
        errors.append("تاريخ الحضور غير صحيح")
    ci, co = parse_dt(rec.get("checkIn")), parse_dt(rec.get("checkOut"))
    if co and not ci:
        errors.append("لا يمكن تسجيل الانصراف قبل تسجيل الحضور")
    if ci and co and co < ci:
        errors.append("وقت الانصراف قبل وقت الحضور")
    for a in as_list(state.get("attendance")):
        if a.get("id") == current_id:
            continue
        if a.get("employeeId") == rec.get("employeeId") and clean_str(a.get("date"))[:10] == clean_str(rec.get("date"))[:10]:
            errors.append("يوجد سجل حضور لنفس الموظف في نفس اليوم")
            break
    return errors


def calculate_employee_payroll(state: Dict[str, Any], emp: Dict[str, Any], month: str, *, period_end: Optional[_dt.date] = None, force: bool = False) -> Dict[str, Any]:
    settings = as_dict(state.get("settings"))
    start, end = month_start_end(month)
    if period_end and start <= period_end <= end:
        calc_end = period_end
    else:
        calc_end = end
    hire = parse_date(emp.get("hireDate") or emp.get("contractStart"))
    termination = parse_date(emp.get("terminationDate") or emp.get("contractEnd") or emp.get("endDate"))
    active_start = max(start, hire) if hire else start
    active_end = min(calc_end, termination) if termination and termination >= start else calc_end
    if active_end < active_start:
        active_dates: List[_dt.date] = []
    else:
        active_dates = list(date_range(active_start, active_end))
    salary = to_float(emp.get("salary"))
    shift = shift_by_id(state, clean_str(emp.get("shiftId")))
    full_work_dates = [d for d in date_range(start, end) if shift_schedule_for_date(shift, d) and not is_holiday(state, d, clean_str(emp.get("branch")))]
    calc_work_dates = [d for d in active_dates if shift_schedule_for_date(shift, d) and not is_holiday(state, d, clean_str(emp.get("branch")))]
    planned_days = max(1, len(full_work_dates) or to_int(settings.get("workDays"), 26) or 26)
    daily_rate = salary / planned_days
    base_due = salary * (len(calc_work_dates) / planned_days)
    attendance_by_date = {clean_str(a.get("date"))[:10]: a for a in as_list(state.get("attendance")) if a.get("employeeId") == emp.get("id")}
    absent_days = 0
    unpaid_leave_days = 0
    paid_leave_days = 0
    mission_days = 0
    late_minutes = 0
    early_minutes = 0
    overtime_minutes = 0
    for d in calc_work_dates:
        ds = d.isoformat()
        lv = leave_on_date(state, emp.get("id"), d)
        ms = mission_on_date(state, emp.get("id"), d)
        att = attendance_by_date.get(ds)
        if lv:
            if str(lv.get("paid", "true")).lower() in ("false", "0", "no"):
                unpaid_leave_days += 1
            else:
                paid_leave_days += 1
            continue
        if ms:
            mission_days += 1
            continue
        if not att or clean_str(att.get("status")) == "absent":
            absent_days += 1
            continue
        late_minutes += to_int(att.get("lateMinutes"))
        early_minutes += to_int(att.get("earlyLeaveMinutes"))
        overtime_minutes += to_int(att.get("overtimeMinutes"))
    typical_minutes = 8 * 60
    if shift and calc_work_dates:
        first_sched = shift_schedule_for_date(shift, calc_work_dates[0])
        if first_sched:
            typical_minutes = shift_minutes(first_sched)
    minute_rate = daily_rate / max(1, typical_minutes)
    late_deduction = late_minutes * (to_float(settings.get("lateDeductionPerMinute")) if settings.get("lateDeductionMethod") == "fixed" else minute_rate)
    early_deduction = early_minutes * minute_rate
    absence_deduction = absent_days * daily_rate
    unpaid_leave_deduction = unpaid_leave_days * daily_rate
    if settings.get("overtimeCalculationMethod") == "fixed":
        overtime_amount = (overtime_minutes / 60) * to_float(settings.get("overtimeRatePerHour"))
    else:
        overtime_amount = overtime_minutes * minute_rate * to_float(settings.get("overtimeMultiplier"), 1.5)
    rewards = 0.0
    manual_deductions = 0.0
    for adj in as_list(state.get("adjustments")):
        if adj.get("employeeId") != emp.get("id") or clean_str(adj.get("status")) != "approved" or not in_month(adj.get("date"), month):
            continue
        if adj.get("kind") == "reward":
            rewards += to_float(adj.get("amount"))
        else:
            manual_deductions += to_float(adj.get("amount"))
    dues = sum(to_float(d.get("amount")) for d in as_list(state.get("dues")) if d.get("employeeId") == emp.get("id") and clean_str(d.get("status")) in ("approved", "paid") and in_month(d.get("date"), month))
    advances = 0.0
    for av in as_list(state.get("advances")):
        if av.get("employeeId") != emp.get("id") or clean_str(av.get("status")) not in ("approved", "paid", "disbursed"):
            continue
        start_month = clean_str(av.get("startMonth") or av.get("date"))[:7]
        installments = max(1, to_int(av.get("installments"), 1))
        if not start_month or month < start_month:
            continue
        try:
            sy, sm = [int(x) for x in start_month.split("-")]
            cy, cm = [int(x) for x in month.split("-")]
            idx = (cy - sy) * 12 + (cm - sm)
            if 0 <= idx < installments:
                advances += to_float(av.get("amount")) / installments
        except Exception:
            pass
    insurance = to_float(emp.get("insuranceDeduction") if emp.get("insuranceDeduction") not in (None, "") else emp.get("insurance"))
    tax = to_float(emp.get("taxDeduction") if emp.get("taxDeduction") not in (None, "") else emp.get("tax"))
    gross = base_due + overtime_amount + rewards + dues
    total_deductions = late_deduction + early_deduction + absence_deduction + unpaid_leave_deduction + manual_deductions + insurance + tax + advances
    net = gross - total_deductions
    result = {
        "employeeId": emp.get("id"), "month": month, "branch": emp.get("branch"), "currency": as_dict(settings.get("branchCurrencies")).get(emp.get("branch"), settings.get("currency", "EGP")),
        "baseSalary": round(salary, 2), "baseDue": round(base_due, 2), "plannedWorkDays": planned_days, "calculatedWorkDays": len(calc_work_dates),
        "absentDays": absent_days, "paidLeaveDays": paid_leave_days, "unpaidLeaveDays": unpaid_leave_days, "missionDays": mission_days,
        "lateMinutes": late_minutes, "earlyLeaveMinutes": early_minutes, "overtimeMinutes": overtime_minutes,
        "overtimeAmount": round(overtime_amount, 2), "rewards": round(rewards, 2), "dues": round(dues, 2),
        "lateDeduction": round(late_deduction, 2), "earlyLeaveDeduction": round(early_deduction, 2), "absenceDeduction": round(absence_deduction, 2), "unpaidLeaveDeduction": round(unpaid_leave_deduction, 2),
        "manualDeductions": round(manual_deductions, 2), "insurance": round(insurance, 2), "tax": round(tax, 2), "advanceInstallment": round(advances, 2),
        "gross": round(gross, 2), "totalEarnings": round(gross, 2), "totalDeductions": round(total_deductions, 2), "net": round(net, 2),
        "status": "draft", "calculatedAt": utc_now(), "calculationMode": "server_v4.1", "periodFrom": start.isoformat(), "periodTo": calc_end.isoformat(),
        "breakdown": {
            "baseDue": round(base_due, 2), "overtimeAmount": round(overtime_amount, 2), "rewards": round(rewards, 2), "dues": round(dues, 2),
            "lateDeduction": round(late_deduction, 2), "earlyLeaveDeduction": round(early_deduction, 2), "absenceDeduction": round(absence_deduction, 2), "unpaidLeaveDeduction": round(unpaid_leave_deduction, 2), "manualDeductions": round(manual_deductions, 2), "insurance": round(insurance, 2), "tax": round(tax, 2), "advanceInstallment": round(advances, 2)
        }
    }
    return coerce_payroll_fields(result)


class OrbitHandler(SimpleHTTPRequestHandler):
    server_version = f"OrbitHR/{APP_VERSION}"

    def translate_path(self, path: str) -> str:
        clean = urllib.parse.urlsplit(path).path
        if clean == "/":
            clean = "/index.html"
        # Normalize to a single relative path and block traversal before SimpleHTTPRequestHandler opens the file.
        clean = urllib.parse.unquote(clean).lstrip("/")
        target = (ROOT / clean).resolve()
        try:
            target.relative_to(ROOT)
        except ValueError:
            return str(ROOT / "__blocked__")
        return str(target)

    def send_head(self):
        parsed = urllib.parse.urlsplit(self.path)
        if parsed.path.startswith("/api/"):
            return super().send_head()
        target = Path(self.translate_path(self.path))
        try:
            target.relative_to(ROOT)
        except ValueError:
            self.send_error(403, "Forbidden")
            return None
        rel_parts = set(target.relative_to(ROOT).parts) if target.exists() else set()
        if (not target.exists()) or target.is_dir() or target.name in SENSITIVE_STATIC_NAMES or "server_data" in rel_parts or "__pycache__" in rel_parts or target.suffix.lower() not in PUBLIC_STATIC_EXTENSIONS:
            self.send_error(404, "Not Found")
            return None
        return super().send_head()

    def end_headers(self) -> None:
        origin = self.headers.get("Origin")
        if ALLOWED_ORIGINS and (not origin or origin == ALLOWED_ORIGINS):
            self.send_header("Access-Control-Allow-Origin", origin or ALLOWED_ORIGINS)
        self.send_header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type,Authorization")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "SAMEORIGIN")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header("Permissions-Policy", "camera=(self), geolocation=(self)")
        self.send_header("Content-Security-Policy", "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline';")
        if self.path.startswith("/api/"):
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Content-Security-Policy", "default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'self'")
        if urllib.parse.urlsplit(self.path).path.startswith(NO_CACHE_PREFIXES):
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
            self.send_header("Pragma", "no-cache")
        super().end_headers()

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.end_headers()

    def do_GET(self) -> None:
        if self.path.startswith("/api/"):
            return self.handle_api("GET")
        return super().do_GET()

    def do_POST(self) -> None:
        if self.path.startswith("/api/"):
            return self.handle_api("POST")
        self.send_error(405)

    def do_PUT(self) -> None:
        if self.path.startswith("/api/"):
            return self.handle_api("PUT")
        self.send_error(405)

    def do_DELETE(self) -> None:
        if self.path.startswith("/api/"):
            return self.handle_api("DELETE")
        self.send_error(405)

    def read_json(self) -> Dict[str, Any]:
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0:
            return {}
        raw = self.rfile.read(length)
        if len(raw) > MAX_UPLOAD_BYTES * 2:
            raise ValueError("payload_too_large")
        return json.loads(raw.decode("utf-8"))

    def send_json(self, payload: Any, status: int = 200) -> None:
        data = json_dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def send_file_download(self, path: Path, filename: str) -> None:
        if not path.exists():
            return self.send_json({"ok": False, "error": "file_not_found"}, 404)
        data = path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", mimetypes.guess_type(filename)[0] or "application/octet-stream")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Content-Disposition", f"attachment; filename=\"{urllib.parse.quote(filename)}\"")
        self.end_headers()
        self.wfile.write(data)

    def require_auth(self, *perms: str) -> Optional[sqlite3.Row]:
        actor = current_user(self)
        if not actor:
            self.send_json({"ok": False, "error": "auth_required", "message": "يجب تسجيل الدخول"}, 401)
            return None
        if perms and not has_permission(actor, *perms):
            self.send_json({"ok": False, "error": "forbidden", "message": "ليس لديك صلاحية لتنفيذ هذا الإجراء"}, 403)
            return None
        return actor

    def route(self) -> Tuple[str, List[str], Dict[str, List[str]]]:
        parsed = urllib.parse.urlsplit(self.path)
        route = parsed.path.rstrip("/") or "/"
        parts = [urllib.parse.unquote(x) for x in route.split("/") if x]
        qs = urllib.parse.parse_qs(parsed.query)
        return route, parts, qs

    def handle_api(self, method: str) -> None:
        route, parts, qs = self.route()
        try:
            if route == "/api/health" and method == "GET":
                return self.api_health()
            if route == "/api/login" and method == "POST":
                return self.api_login()
            if route == "/api/logout" and method == "POST":
                return self.api_logout()
            if route == "/api/state" and method == "GET":
                return self.api_get_state()
            if route == "/api/state" and method == "PUT":
                return self.api_save_state()
            if route == "/api/audit" and method == "GET":
                return self.api_audit_list()
            if route == "/api/backup" and method == "POST":
                return self.api_backup()
            if route == "/api/backups" and method == "GET":
                return self.api_backups_list()
            if route == "/api/export-state" and method == "GET":
                return self.api_export_state()
            if route == "/api/restore" and method == "POST":
                return self.api_restore()
            if route == "/api/upload" and method == "POST":
                return self.api_upload_json()
            if len(parts) == 3 and parts[:2] == ["api", "upload"] and method == "GET":
                return self.api_download_upload(parts[2])
            if route == "/api/notifications" and method == "GET":
                return self.api_notifications()
            if route == "/api/notify" and method == "POST":
                return self.api_notify()
            if route == "/api/quality" and method == "GET":
                return self.api_quality()
            # v4.1 granular production APIs
            if len(parts) >= 2 and parts[0] == "api" and parts[1] == "employees":
                return self.api_employees(method, parts[2:] if len(parts) > 2 else [], qs)
            if len(parts) >= 2 and parts[0] == "api" and parts[1] == "attendance":
                return self.api_attendance(method, parts[2:] if len(parts) > 2 else [], qs)
            if len(parts) >= 2 and parts[0] == "api" and parts[1] == "payroll":
                return self.api_payroll(method, parts[2:] if len(parts) > 2 else [], qs)
            if len(parts) >= 2 and parts[0] == "api" and parts[1] in ("leaves", "missions"):
                return self.api_requests(method, parts[1], parts[2:] if len(parts) > 2 else [], qs)
            if len(parts) >= 2 and parts[0] == "api" and parts[1] == "settings":
                return self.api_settings(method, parts[2:] if len(parts) > 2 else [], qs)
            return self.send_json({"ok": False, "error": "not_found"}, 404)
        except ValueError as exc:
            msg = str(exc)
            if msg.startswith("validation_failed::"):
                return self.send_json({"ok": False, "error": "validation_failed", "details": json.loads(msg.split("::", 1)[1])}, 422)
            return self.send_json({"ok": False, "error": "bad_request", "message": msg}, 400)
        except Exception as exc:
            return self.send_json({"ok": False, "error": "server_error", "message": str(exc)}, 500)

    def api_health(self) -> None:
        with _db_lock, db() as con:
            state, updated_at = load_state_from_db(con)
            counts = {k: len(as_list(state.get(k))) for k in ["employees", "users", "attendance", "payroll", "leaves", "missions", "documents"]}
            counts.update({"structuredEmployees": con.execute("SELECT COUNT(*) c FROM hr_employees").fetchone()["c"], "structuredAttendance": con.execute("SELECT COUNT(*) c FROM hr_attendance").fetchone()["c"], "structuredPayroll": con.execute("SELECT COUNT(*) c FROM hr_payroll").fetchone()["c"]})
        self.send_json({"ok": True, "version": APP_VERSION, "database": str(DB_PATH.name), "updatedAt": updated_at, "counts": counts, "serverTime": local_now_iso()})

    def api_login(self) -> None:
        body = self.read_json()
        email = lower(body.get("email"))
        password = str(body.get("password") or "")
        with _db_lock, db() as con:
            user = con.execute("SELECT * FROM auth_users WHERE email=? AND active=1", (email,)).fetchone()
            if not user or not verify_password(password, user["password_hash"]):
                audit(con, None, "فشل تسجيل دخول", "الأمان", email, self.client_address[0])
                return self.send_json({"ok": False, "error": "invalid_credentials", "message": "بيانات الدخول غير صحيحة"}, 401)
            token = create_session(con, user, self)
            state, updated_at = load_state_from_db(con)
            audit(con, user, "تسجيل دخول", "الأمان", email, self.client_address[0])
            safe_user = {"id": user["id"], "employeeId": user["employee_id"], "name": user["name"], "email": user["email"], "role": user["role"], "permissions": actor_permissions(user), "active": bool(user["active"])}
            payload_state = visible_state_for_actor(state, user)
        self.send_json({"ok": True, "token": token, "user": safe_user, "state": sanitize_state(payload_state), "updatedAt": updated_at, "serverVersion": APP_VERSION})

    def api_logout(self) -> None:
        token = self.headers.get("Authorization", "")
        if token.lower().startswith("bearer "):
            token = token.split(" ", 1)[1].strip()
        if token:
            with _db_lock, db() as con:
                con.execute("DELETE FROM api_sessions WHERE token_hash=?", (token_hash(token),))
        self.send_json({"ok": True})

    def api_get_state(self) -> None:
        actor = self.require_auth()
        if not actor:
            return
        with _db_lock, db() as con:
            state, updated_at = load_state_from_db(con)
        self.send_json({"ok": True, "state": sanitize_state(visible_state_for_actor(state, actor)), "updatedAt": updated_at, "authenticated": True, "serverVersion": APP_VERSION})

    def api_save_state(self) -> None:
        actor = self.require_auth("admin")
        if not actor:
            return
        body = self.read_json()
        state = body.get("state") if isinstance(body.get("state"), dict) else body
        if not isinstance(state, dict):
            return self.send_json({"ok": False, "error": "invalid_state"}, 400)
        with _db_lock, db() as con:
            state = sanitize_state(state)
            updated_at = save_state_to_db(con, state, actor["id"])
            audit(con, actor, "مزامنة بيانات", "النظام", "تم حفظ حالة النظام مع تحديث الجداول المنظمة", self.client_address[0])
        self.send_json({"ok": True, "updatedAt": updated_at})

    def api_audit_list(self) -> None:
        actor = self.require_auth("audit:read")
        if not actor:
            return
        with _db_lock, db() as con:
            rows = [dict(r) for r in con.execute("SELECT * FROM audit_log ORDER BY id DESC LIMIT 500").fetchall()]
        self.send_json({"ok": True, "items": rows})

    def create_backup_file(self, con: sqlite3.Connection, created_by: str = "system") -> Dict[str, Any]:
        state, _ = load_state_from_db(con)
        backup_id = f"bak_{int(time.time())}_{secrets.token_hex(4)}"
        filename = f"orbit_hr_v410_backup_{_dt.datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        path = BACKUP_DIR / filename
        payload = {"version": APP_VERSION, "createdAt": utc_now(), "state": state}
        path.write_text(json_dumps(payload, indent=2), encoding="utf-8")
        size = path.stat().st_size
        con.execute("INSERT INTO backups(id,filename,path,size,created_at,created_by) VALUES(?,?,?,?,?,?)", (backup_id, filename, str(path), size, utc_now(), created_by))
        return {"id": backup_id, "filename": filename, "size": size, "createdAt": utc_now()}

    def api_backup(self) -> None:
        actor = self.require_auth("backup:write")
        if not actor:
            return
        with _db_lock, db() as con:
            item = self.create_backup_file(con, actor["email"])
            audit(con, actor, "نسخة احتياطية", "النظام", item["filename"], self.client_address[0])
        self.send_json({"ok": True, "backup": item})

    def api_backups_list(self) -> None:
        actor = self.require_auth("backup:read")
        if not actor:
            return
        with _db_lock, db() as con:
            rows = [dict(r) for r in con.execute("SELECT id,filename,size,created_at,created_by FROM backups ORDER BY created_at DESC LIMIT 100").fetchall()]
        self.send_json({"ok": True, "items": rows})

    def api_export_state(self) -> None:
        actor = self.require_auth("backup:read")
        if not actor:
            return
        with _db_lock, db() as con:
            item = self.create_backup_file(con, actor["email"])
            row = con.execute("SELECT path, filename FROM backups WHERE id=?", (item["id"],)).fetchone()
        self.send_file_download(Path(row["path"]), row["filename"])

    def api_restore(self) -> None:
        actor = self.require_auth("backup:restore")
        if not actor:
            return
        body = self.read_json()
        state = body.get("state") or as_dict(body.get("backup")).get("state")
        if not isinstance(state, dict):
            return self.send_json({"ok": False, "error": "invalid_backup"}, 400)
        with _db_lock, db() as con:
            self.create_backup_file(con, "before_restore")
            updated_at = save_state_to_db(con, state, actor["id"])
            audit(con, actor, "استرجاع نسخة", "النظام", "تم استرجاع نسخة احتياطية", self.client_address[0])
        self.send_json({"ok": True, "updatedAt": updated_at})

    def api_upload_json(self) -> None:
        actor = self.require_auth("uploads:write")
        if not actor:
            return
        body = self.read_json()
        filename = Path(clean_str(body.get("filename") or "file.bin")).name
        mime = clean_str(body.get("mime") or mimetypes.guess_type(filename)[0] or "application/octet-stream")
        allowed_mimes = {"image/jpeg", "image/png", "image/webp", "application/pdf", "text/plain"}
        if mime not in allowed_mimes:
            return self.send_json({"ok": False, "error": "unsupported_file_type", "message": "نوع الملف غير مسموح"}, 415)
        raw_data = str(body.get("data") or "")
        if raw_data.startswith("data:"):
            raw_data = raw_data.split(",", 1)[1]
        data = base64.b64decode(raw_data) if raw_data else b""
        if len(data) > MAX_UPLOAD_BYTES:
            return self.send_json({"ok": False, "error": "file_too_large", "message": "حجم الملف أكبر من المسموح"}, 413)
        upload_id = make_id("up")
        safe_name = f"{upload_id}_{filename}"
        path = UPLOAD_DIR / safe_name
        path.write_bytes(data)
        with _db_lock, db() as con:
            con.execute(
                "INSERT INTO uploads(id,entity,entity_id,filename,mime,size,path,uploaded_by,created_at) VALUES(?,?,?,?,?,?,?,?,?)",
                (upload_id, clean_str(body.get("entity") or "general"), clean_str(body.get("entityId")), filename, mime, len(data), str(path), actor["id"], utc_now()),
            )
            audit(con, actor, "رفع مرفق", "المرفقات", filename, self.client_address[0])
        self.send_json({"ok": True, "file": {"id": upload_id, "url": f"/api/upload/{upload_id}", "filename": filename, "mime": mime, "size": len(data)}})

    def api_download_upload(self, upload_id: str) -> None:
        actor = self.require_auth("uploads:read")
        if not actor:
            return
        with _db_lock, db() as con:
            row = con.execute("SELECT * FROM uploads WHERE id=?", (upload_id,)).fetchone()
        if not row:
            return self.send_json({"ok": False, "error": "upload_not_found"}, 404)
        self.send_file_download(Path(row["path"]), row["filename"])

    def api_notifications(self) -> None:
        actor = self.require_auth()
        if not actor:
            return
        with _db_lock, db() as con:
            rows = [dict(r) for r in con.execute("SELECT * FROM notifications WHERE user_id IS NULL OR user_id=? ORDER BY created_at DESC LIMIT 100", (actor["id"],)).fetchall()]
        self.send_json({"ok": True, "items": rows})

    def api_notify(self) -> None:
        actor = self.require_auth("notifications:write")
        if not actor:
            return
        body = self.read_json()
        n_id = make_id("n")
        with _db_lock, db() as con:
            con.execute("INSERT INTO notifications(id,user_id,title,body,status,created_at) VALUES(?,?,?,?,?,?)", (n_id, body.get("userId") or None, clean_str(body.get("title") or "تنبيه"), clean_str(body.get("body")), "unread", utc_now()))
            audit(con, actor, "إنشاء إشعار", "الإشعارات", clean_str(body.get("title")), self.client_address[0])
        self.send_json({"ok": True, "id": n_id})

    def api_quality(self) -> None:
        actor = self.require_auth("quality:read")
        if not actor:
            return
        with _db_lock, db() as con:
            state, updated_at = load_state_from_db(con)
        self.send_json({"ok": True, "updatedAt": updated_at, "issues": quality_checks(state)})

    # ---------- v4.1 granular APIs ----------
    def api_employees(self, method: str, tail: List[str], qs: Dict[str, List[str]]) -> None:
        if method == "GET" and not tail:
            actor = self.require_auth("employees:read")
            if not actor: return
            with _db_lock, db() as con:
                state, _ = load_state_from_db(con)
            items = as_list(visible_state_for_actor(state, actor).get("employees"))
            return self.send_json({"ok": True, "items": items})
        if method == "POST" and not tail:
            actor = self.require_auth("employees:write")
            if not actor: return
            body = self.read_json()
            with _db_lock, db() as con:
                state, _ = load_state_from_db(con)
                body["id"] = clean_str(body.get("id")) or make_id("e")
                errs = employee_validation_errors(state, body)
                if errs: return self.send_json({"ok": False, "error": "validation_failed", "details": errs}, 422)
                state.setdefault("employees", []).append(body)
                updated_at = save_state_to_db(con, state, actor["id"])
                audit(con, actor, "إضافة موظف", "الموظفون", f"{body.get('name')} — {body.get('code')}", self.client_address[0])
            return self.send_json({"ok": True, "item": body, "updatedAt": updated_at}, 201)
        if tail:
            emp_id = tail[0]
            if method == "GET":
                actor = self.require_auth("employees:read")
                if not actor: return
                with _db_lock, db() as con:
                    state, _ = load_state_from_db(con)
                item = emp_by_id(state, emp_id)
                if not item: return self.send_json({"ok": False, "error": "not_found"}, 404)
                if not (is_admin(actor) or lower(actor["role"]) == "manager" or actor["employee_id"] == emp_id):
                    return self.send_json({"ok": False, "error": "forbidden"}, 403)
                return self.send_json({"ok": True, "item": item})
            if method == "PUT":
                actor = self.require_auth("employees:write")
                if not actor: return
                body = self.read_json()
                with _db_lock, db() as con:
                    state, _ = load_state_from_db(con)
                    arr = as_list(state.get("employees"))
                    old = next((x for x in arr if x.get("id") == emp_id), None)
                    if not old: return self.send_json({"ok": False, "error": "not_found"}, 404)
                    merged = dict(old); merged.update(body); merged["id"] = emp_id; merged["updatedAt"] = utc_now()
                    errs = employee_validation_errors(state, merged, emp_id)
                    if errs: return self.send_json({"ok": False, "error": "validation_failed", "details": errs}, 422)
                    arr[arr.index(old)] = merged
                    updated_at = save_state_to_db(con, state, actor["id"])
                    audit(con, actor, "تعديل موظف", "الموظفون", f"{merged.get('name')} — {merged.get('code')}", self.client_address[0])
                return self.send_json({"ok": True, "item": merged, "updatedAt": updated_at})
            if method == "DELETE":
                actor = self.require_auth("employees:delete")
                if not actor: return
                with _db_lock, db() as con:
                    state, _ = load_state_from_db(con)
                    if actor["employee_id"] == emp_id:
                        return self.send_json({"ok": False, "error": "cannot_delete_self", "message": "لا يمكن حذف الموظف المرتبط بالمستخدم الحالي"}, 422)
                    before = len(as_list(state.get("employees")))
                    state["employees"] = [x for x in as_list(state.get("employees")) if x.get("id") != emp_id]
                    state["users"] = [u for u in as_list(state.get("users")) if u.get("employeeId") != emp_id]
                    if len(state["employees"]) == before: return self.send_json({"ok": False, "error": "not_found"}, 404)
                    updated_at = save_state_to_db(con, state, actor["id"])
                    audit(con, actor, "حذف موظف", "الموظفون", emp_id, self.client_address[0])
                return self.send_json({"ok": True, "updatedAt": updated_at})
        return self.send_json({"ok": False, "error": "not_found"}, 404)

    def api_attendance(self, method: str, tail: List[str], qs: Dict[str, List[str]]) -> None:
        if method == "POST" and tail == ["punch"]:
            actor = self.require_auth("attendance:write")
            if not actor: return
            body = self.read_json()
            emp_id = clean_str(body.get("employeeId") or actor["employee_id"])
            if not user_can_access_employee(actor, emp_id):
                return self.send_json({"ok": False, "error": "forbidden_employee_scope", "message": "لا يمكنك تسجيل حضور موظف آخر"}, 403)
            # Employee punches use trusted server local date/time; manual dates are only accepted through the HR attendance edit API.
            d = server_today()
            punch_type = "checkOut" if clean_str(body.get("type")) in ("checkout", "checkOut", "out") else "checkIn"
            with _db_lock, db() as con:
                state, _ = load_state_from_db(con)
                if not emp_by_id(state, emp_id): return self.send_json({"ok": False, "error": "employee_not_found"}, 404)
                existing = next((a for a in as_list(state.get("attendance")) if a.get("employeeId") == emp_id and clean_str(a.get("date"))[:10] == d.isoformat()), None)
                rec = existing or {"id": make_id("a"), "employeeId": emp_id, "date": d.isoformat(), "status": "present", "source": "mobile"}
                now_iso = local_now_iso()
                if punch_type == "checkIn":
                    if rec.get("checkIn") and not body.get("force"):
                        return self.send_json({"ok": False, "error": "already_checked_in", "message": "تم تسجيل الحضور من قبل لهذا اليوم"}, 422)
                    rec["checkIn"] = now_iso
                    rec["location"] = clean_str(body.get("location") or "Mobile GPS")
                else:
                    if not rec.get("checkIn"):
                        return self.send_json({"ok": False, "error": "missing_check_in", "message": "لا يمكن تسجيل الانصراف قبل الحضور"}, 422)
                    rec["checkOut"] = now_iso
                    rec["checkOutLocation"] = clean_str(body.get("location") or "Mobile GPS")
                if body.get("cameraImage"):
                    # Snapshot evidence only. Real biometric matching requires a separate face-recognition service.
                    rec["faceSnapshotProvided"] = True
                rec["faceVerified"] = bool(body.get("faceVerified") and body.get("faceMatchScore"))
                if rec.get("faceVerified"):
                    rec["faceMatchScore"] = to_float(body.get("faceMatchScore"))
                elif body.get("cameraImage"):
                    rec["verificationStatus"] = "needs_review"
                    rec["verificationNote"] = "تم إرفاق صورة حضور فقط بدون تحقق وجه بيومتري"
                if body.get("cameraImage"):
                    rec["cameraSnapshot"] = body.get("cameraImage")
                ok, msg = apply_geofence(state, rec, to_float(body.get("lat"), None) if body.get("lat") not in (None, "") else None, to_float(body.get("lng"), None) if body.get("lng") not in (None, "") else None, punch_type=punch_type, accuracy=to_float(body.get("accuracy"), None) if body.get("accuracy") not in (None, "") else None, mock=bool(body.get("mockLocation")))
                if not ok:
                    return self.send_json({"ok": False, "error": "geofence_blocked", "message": msg}, 422)
                normalize_attendance_record(state, rec)
                if not existing:
                    state.setdefault("attendance", []).append(rec)
                updated_at = save_state_to_db(con, state, actor["id"])
                audit(con, actor, "تسجيل حضور/انصراف", "الحضور", f"{emp_id} — {d.isoformat()} — {punch_type}", self.client_address[0])
            return self.send_json({"ok": True, "item": rec, "updatedAt": updated_at})
        if method == "GET" and not tail:
            actor = self.require_auth("attendance:read")
            if not actor: return
            with _db_lock, db() as con:
                state, _ = load_state_from_db(con)
            items = as_list(visible_state_for_actor(state, actor).get("attendance"))
            emp_id = (qs.get("employeeId") or [""])[0]
            if emp_id and not user_can_access_employee(actor, emp_id):
                return self.send_json({"ok": False, "error": "forbidden_employee_scope"}, 403)
            date = (qs.get("date") or [""])[0]
            month = (qs.get("month") or [""])[0]
            if emp_id: items = [x for x in items if x.get("employeeId") == emp_id]
            if date: items = [x for x in items if clean_str(x.get("date"))[:10] == date]
            if month: items = [x for x in items if clean_str(x.get("date")).startswith(month)]
            return self.send_json({"ok": True, "items": items})
        if method == "POST" and not tail:
            actor = self.require_auth("attendance:write")
            if not actor: return
            rec = self.read_json()
            if not user_can_access_employee(actor, clean_str(rec.get("employeeId") or actor["employee_id"])):
                return self.send_json({"ok": False, "error": "forbidden_employee_scope"}, 403)
            with _db_lock, db() as con:
                state, _ = load_state_from_db(con)
                rec["id"] = clean_str(rec.get("id")) or make_id("a")
                errs = validate_attendance_save(state, rec)
                if errs: return self.send_json({"ok": False, "error": "validation_failed", "details": errs}, 422)
                normalize_attendance_record(state, rec)
                state.setdefault("attendance", []).append(rec)
                updated_at = save_state_to_db(con, state, actor["id"])
                audit(con, actor, "إضافة حضور", "الحضور", f"{rec.get('employeeId')} — {rec.get('date')}", self.client_address[0])
            return self.send_json({"ok": True, "item": rec, "updatedAt": updated_at}, 201)
        if tail:
            rec_id = tail[0]
            if method == "PUT":
                actor = self.require_auth("attendance:write")
                if not actor: return
                body = self.read_json()
                with _db_lock, db() as con:
                    state, _ = load_state_from_db(con)
                    arr = as_list(state.get("attendance"))
                    old = next((x for x in arr if x.get("id") == rec_id), None)
                    if not old: return self.send_json({"ok": False, "error": "not_found"}, 404)
                    if not user_can_access_employee(actor, clean_str(old.get("employeeId"))):
                        return self.send_json({"ok": False, "error": "forbidden_employee_scope"}, 403)
                    merged = dict(old); merged.update(body); merged["id"] = rec_id
                    errs = validate_attendance_save(state, merged, rec_id)
                    if errs: return self.send_json({"ok": False, "error": "validation_failed", "details": errs}, 422)
                    normalize_attendance_record(state, merged)
                    arr[arr.index(old)] = merged
                    updated_at = save_state_to_db(con, state, actor["id"])
                    audit(con, actor, "تعديل حضور", "الحضور", f"{merged.get('employeeId')} — {merged.get('date')}", self.client_address[0])
                return self.send_json({"ok": True, "item": merged, "updatedAt": updated_at})
            if method == "DELETE":
                actor = self.require_auth("attendance:delete")
                if not actor: return
                with _db_lock, db() as con:
                    state, _ = load_state_from_db(con)
                    before = len(as_list(state.get("attendance")))
                    state["attendance"] = [x for x in as_list(state.get("attendance")) if x.get("id") != rec_id]
                    if len(state["attendance"]) == before: return self.send_json({"ok": False, "error": "not_found"}, 404)
                    updated_at = save_state_to_db(con, state, actor["id"])
                    audit(con, actor, "حذف حضور", "الحضور", rec_id, self.client_address[0])
                return self.send_json({"ok": True, "updatedAt": updated_at})
        return self.send_json({"ok": False, "error": "not_found"}, 404)

    def api_payroll(self, method: str, tail: List[str], qs: Dict[str, List[str]]) -> None:
        if method == "GET" and not tail:
            actor = self.require_auth("payroll:read")
            if not actor: return
            with _db_lock, db() as con:
                state, _ = load_state_from_db(con)
            items = as_list(visible_state_for_actor(state, actor).get("payroll"))
            month = (qs.get("month") or [""])[0]
            branch = (qs.get("branch") or [""])[0]
            if month: items = [x for x in items if x.get("month") == month]
            if branch: items = [x for x in items if x.get("branch") == branch]
            return self.send_json({"ok": True, "items": items})
        if method == "POST" and tail == ["calculate"]:
            actor = self.require_auth("payroll:write")
            if not actor: return
            body = self.read_json()
            month = clean_str(body.get("month")) or _dt.date.today().isoformat()[:7]
            if not re.match(r"^\d{4}-\d{2}$", month):
                return self.send_json({"ok": False, "error": "invalid_month"}, 400)
            employee_ids = set(as_list(body.get("employeeIds")))
            branch = clean_str(body.get("branch"))
            mode = clean_str(body.get("mode") or body.get("calculationRange"))
            period_end = server_today() if mode in ("to_date", "current", "until_today") and month == server_today().isoformat()[:7] else None
            force = bool(body.get("force"))
            with _db_lock, db() as con:
                state, _ = load_state_from_db(con)
                employees = [e for e in as_list(state.get("employees")) if e.get("status", "active") == "active"]
                if branch: employees = [e for e in employees if e.get("branch") == branch]
                if employee_ids: employees = [e for e in employees if e.get("id") in employee_ids]
                updated, skipped = [], []
                payroll = state.setdefault("payroll", [])
                for e in employees:
                    existing = next((p for p in payroll if p.get("employeeId") == e.get("id") and p.get("month") == month), None)
                    if existing and existing.get("status") in ("approved", "paid", "locked") and not force:
                        skipped.append({"employeeId": e.get("id"), "reason": "protected_status", "status": existing.get("status")})
                        continue
                    calc = calculate_employee_payroll(state, e, month, period_end=period_end, force=force)
                    if existing:
                        calc["id"] = existing.get("id")
                        calc["status"] = existing.get("status") if existing.get("status") in ("reviewed", "draft") else "draft"
                        existing.update(calc)
                        item = existing
                    else:
                        item = {"id": make_id("pay"), **calc, "createdAt": utc_now()}
                        payroll.append(item)
                    item["updatedAt"] = utc_now()
                    item["calculatedBy"] = actor["id"]
                    updated.append(item)
                updated_at = save_state_to_db(con, state, actor["id"])
                audit(con, actor, "احتساب رواتب", "الرواتب", f"{month} — تم {len(updated)} — متخطى {len(skipped)}", self.client_address[0])
            return self.send_json({"ok": True, "items": updated, "skipped": skipped, "updatedAt": updated_at})
        if tail:
            payroll_id = tail[0]
            if len(tail) == 2 and tail[1] == "status" and method in ("PUT", "POST"):
                actor = self.require_auth("payroll:approve")
                if not actor: return
                body = self.read_json(); status = clean_str(body.get("status"))
                if status not in ("draft", "reviewed", "approved", "paid", "locked"):
                    return self.send_json({"ok": False, "error": "invalid_status"}, 400)
                with _db_lock, db() as con:
                    state, _ = load_state_from_db(con)
                    item = next((p for p in as_list(state.get("payroll")) if p.get("id") == payroll_id), None)
                    if not item: return self.send_json({"ok": False, "error": "not_found"}, 404)
                    old = item.get("status")
                    if old == "locked" and not is_admin(actor):
                        return self.send_json({"ok": False, "error": "locked_payroll"}, 422)
                    item["status"] = status; item["statusUpdatedAt"] = utc_now(); item["statusUpdatedBy"] = actor["id"]
                    updated_at = save_state_to_db(con, state, actor["id"])
                    audit(con, actor, "تغيير حالة راتب", "الرواتب", f"{payroll_id}: {old} → {status}", self.client_address[0])
                return self.send_json({"ok": True, "item": item, "updatedAt": updated_at})
            if method == "DELETE":
                actor = self.require_auth("payroll:delete")
                if not actor: return
                with _db_lock, db() as con:
                    state, _ = load_state_from_db(con)
                    item = next((p for p in as_list(state.get("payroll")) if p.get("id") == payroll_id), None)
                    if not item: return self.send_json({"ok": False, "error": "not_found"}, 404)
                    if item.get("status") in ("paid", "locked"):
                        return self.send_json({"ok": False, "error": "protected_payroll"}, 422)
                    state["payroll"] = [p for p in as_list(state.get("payroll")) if p.get("id") != payroll_id]
                    updated_at = save_state_to_db(con, state, actor["id"])
                    audit(con, actor, "حذف راتب", "الرواتب", payroll_id, self.client_address[0])
                return self.send_json({"ok": True, "updatedAt": updated_at})
        return self.send_json({"ok": False, "error": "not_found"}, 404)

    def api_requests(self, method: str, kind: str, tail: List[str], qs: Dict[str, List[str]]) -> None:
        key = kind
        perm_area = "leaves" if kind == "leaves" else "missions"
        if method == "GET" and not tail:
            actor = self.require_auth(f"{perm_area}:read")
            if not actor: return
            with _db_lock, db() as con:
                state, _ = load_state_from_db(con)
            items = as_list(visible_state_for_actor(state, actor).get(key))
            return self.send_json({"ok": True, "items": items})
        if method == "POST" and not tail:
            actor = self.require_auth(f"{perm_area}:write")
            if not actor: return
            item = self.read_json(); item["id"] = clean_str(item.get("id")) or make_id("l" if kind == "leaves" else "m")
            item.setdefault("status", "pending"); item.setdefault("createdAt", utc_now())
            if not item.get("employeeId"): item["employeeId"] = actor["employee_id"]
            if not user_can_access_employee(actor, clean_str(item.get("employeeId"))):
                return self.send_json({"ok": False, "error": "forbidden_employee_scope"}, 403)
            with _db_lock, db() as con:
                state, _ = load_state_from_db(con)
                if not emp_by_id(state, item.get("employeeId")): return self.send_json({"ok": False, "error": "employee_not_found"}, 404)
                if kind == "leaves":
                    f, t = parse_date(item.get("from")), parse_date(item.get("to") or item.get("from"))
                    if not f or not t or t < f: return self.send_json({"ok": False, "error": "invalid_period"}, 422)
                    for old in as_list(state.get(key)):
                        if old.get("employeeId") == item.get("employeeId") and clean_str(old.get("status")) not in ("rejected", "cancelled"):
                            of, ot = parse_date(old.get("from")), parse_date(old.get("to") or old.get("from"))
                            if of and ot and not (t < of or f > ot):
                                return self.send_json({"ok": False, "error": "overlapping_leave", "message": "يوجد طلب إجازة متداخل لنفس الموظف"}, 422)
                    item["days"] = (t - f).days + 1
                state.setdefault(key, []).append(item)
                updated_at = save_state_to_db(con, state, actor["id"])
                audit(con, actor, "إضافة طلب", "الإجازات" if kind == "leaves" else "المأموريات", clean_str(item.get("employeeId")), self.client_address[0])
            return self.send_json({"ok": True, "item": item, "updatedAt": updated_at}, 201)
        if tail:
            item_id = tail[0]
            if method == "PUT" and len(tail) == 1:
                actor = self.require_auth(f"{perm_area}:write")
                if not actor: return
                body = self.read_json()
                with _db_lock, db() as con:
                    state, _ = load_state_from_db(con)
                    arr = as_list(state.get(key))
                    item = next((r for r in arr if r.get("id") == item_id), None)
                    if not item: return self.send_json({"ok": False, "error": "not_found"}, 404)
                    if not user_can_access_employee(actor, clean_str(item.get("employeeId"))):
                        return self.send_json({"ok": False, "error": "forbidden_employee_scope"}, 403)
                    if clean_str(item.get("status")) not in ("pending", "reviewed") and not (is_admin(actor) or lower(actor["role"]) in ("manager", "hr")):
                        return self.send_json({"ok": False, "error": "protected_request", "message": "لا يمكن تعديل طلب تم اعتماده أو رفضه"}, 422)
                    merged = dict(item); merged.update(body); merged["id"] = item_id; merged.setdefault("employeeId", item.get("employeeId")); merged["updatedAt"] = utc_now()
                    if kind == "leaves":
                        f, t = parse_date(merged.get("from")), parse_date(merged.get("to") or merged.get("from"))
                        if not f or not t or t < f: return self.send_json({"ok": False, "error": "invalid_period"}, 422)
                        for old in arr:
                            if old.get("id") == item_id: continue
                            if old.get("employeeId") == merged.get("employeeId") and clean_str(old.get("status")) not in ("rejected", "cancelled"):
                                of, ot = parse_date(old.get("from")), parse_date(old.get("to") or old.get("from"))
                                if of and ot and not (t < of or f > ot):
                                    return self.send_json({"ok": False, "error": "overlapping_leave", "message": "يوجد طلب إجازة متداخل لنفس الموظف"}, 422)
                        merged["days"] = (t - f).days + 1
                    arr[arr.index(item)] = merged
                    updated_at = save_state_to_db(con, state, actor["id"])
                    audit(con, actor, "تعديل طلب", "الإجازات" if kind == "leaves" else "المأموريات", item_id, self.client_address[0])
                return self.send_json({"ok": True, "item": merged, "updatedAt": updated_at})
            if len(tail) == 2 and tail[1] == "status" and method in ("PUT", "POST"):
                actor = self.require_auth(f"{perm_area}:approve")
                if not actor: return
                status = clean_str(self.read_json().get("status"))
                if status not in ("pending", "reviewed", "approved", "rejected", "cancelled"):
                    return self.send_json({"ok": False, "error": "invalid_status"}, 400)
                with _db_lock, db() as con:
                    state, _ = load_state_from_db(con)
                    item = next((r for r in as_list(state.get(key)) if r.get("id") == item_id), None)
                    if not item: return self.send_json({"ok": False, "error": "not_found"}, 404)
                    if clean_str(item.get("employeeId")) == clean_str(actor["employee_id"]) and not is_admin(actor):
                        return self.send_json({"ok": False, "error": "cannot_approve_own_request", "message": "لا يمكن اعتماد طلبك الشخصي"}, 422)
                    old = item.get("status"); item["status"] = status; item["statusUpdatedAt"] = utc_now(); item["statusUpdatedBy"] = actor["id"]
                    updated_at = save_state_to_db(con, state, actor["id"])
                    audit(con, actor, "تغيير حالة طلب", "الإجازات" if kind == "leaves" else "المأموريات", f"{old} → {status}", self.client_address[0])
                return self.send_json({"ok": True, "item": item, "updatedAt": updated_at})
            if method == "DELETE":
                actor = self.require_auth(f"{perm_area}:delete")
                if not actor: return
                with _db_lock, db() as con:
                    state, _ = load_state_from_db(con)
                    before = len(as_list(state.get(key)))
                    state[key] = [r for r in as_list(state.get(key)) if r.get("id") != item_id]
                    if len(state[key]) == before: return self.send_json({"ok": False, "error": "not_found"}, 404)
                    updated_at = save_state_to_db(con, state, actor["id"])
                    audit(con, actor, "حذف طلب", "الإجازات" if kind == "leaves" else "المأموريات", item_id, self.client_address[0])
                return self.send_json({"ok": True, "updatedAt": updated_at})
        return self.send_json({"ok": False, "error": "not_found"}, 404)

    def api_settings(self, method: str, tail: List[str], qs: Dict[str, List[str]]) -> None:
        if tail == ["branch-location"] and method == "PUT":
            actor = self.require_auth("settings:write")
            if not actor: return
            body = self.read_json(); branch = clean_str(body.get("branch"))
            if not branch: return self.send_json({"ok": False, "error": "branch_required"}, 400)
            lat, lng = to_float(body.get("lat")), to_float(body.get("lng"))
            radius = max(1, to_int(body.get("radius"), 300))
            with _db_lock, db() as con:
                state, _ = load_state_from_db(con)
                settings = state.setdefault("settings", {})
                if branch not in as_list(settings.get("branches")):
                    settings.setdefault("branches", []).append(branch)
                settings.setdefault("branchLocations", {})[branch] = {"enabled": bool(body.get("enabled", True)), "lat": lat, "lng": lng, "radius": radius, "updatedAt": utc_now(), "updatedBy": actor["id"]}
                updated_at = save_state_to_db(con, state, actor["id"])
                audit(con, actor, "تعديل موقع فرع", "الإعدادات", f"{branch}: {lat},{lng} / {radius}m", self.client_address[0])
            return self.send_json({"ok": True, "updatedAt": updated_at})
        return self.send_json({"ok": False, "error": "not_found"}, 404)


# ============================================================================
# Orbit HR v4.2.0 security, permissions, attendance and payroll hardening layer
# ============================================================================
from copy import deepcopy as _deepcopy
from zoneinfo import ZoneInfo
import tempfile as _tempfile
import zipfile as _zipfile

APP_VERSION = "4.8.0-expenses-by-branch"
INITIAL_CREDENTIALS_PATH = DATA_DIR / "INITIAL_ADMIN_CREDENTIALS.txt"
PASSWORD_MIN_LENGTH = 10
LOGIN_WINDOW_SECONDS = 15 * 60
LOGIN_MAX_FAILURES = 5
_login_failures: Dict[str, List[float]] = {}
_login_lock = threading.RLock()

PUBLIC_FILES = {
    "index.html", "app.js", "styles.css", "manifest.json", "sw.js",
    "privacy.html", "terms.html", "logo.svg", "orbit-logo-ui.png",
    "orbit-logo.png", "orbit-mark-ui.png", "orbit-mark.png",
    "icon-48.png", "icon-72.png", "icon-96.png", "icon-128.png",
    "icon-144.png", "icon-152.png", "icon-167.png", "icon-180.png",
    "icon-192.png", "icon-256.png", "icon-384.png", "icon-512.png",
}

ROLE_PERMISSIONS: Dict[str, set] = {
    "manager": {
        "employees:read", "employees:write",
        "attendance:read", "attendance:write", "attendance:punch", "attendance:approve",
        "payroll:read", "payroll:write", "payroll:review", "payroll:approve",
        "leaves:read", "leaves:write", "leaves:approve", "leaves:delete",
        "missions:read", "missions:write", "missions:approve", "missions:delete",
        "documents:read", "documents:write", "expenses:read", "expenses:write",
        "adjustments:read", "adjustments:write", "custodies:read", "custodies:write",
        "shifts:read", "shifts:write", "reports:read", "uploads:read", "uploads:write",
        "holidays:read", "holidays:write", "approvals:read", "approvals:write",
        "notifications:read", "quality:read",
    },
    "employee": {
        "employees:read", "attendance:read", "attendance:punch",
        "payroll:read", "leaves:read", "leaves:write",
        "missions:read", "missions:write", "documents:read", "documents:write",
        "adjustments:read", "adjustments:write", "custodies:read",
        "advances:read", "advances:write", "dues:read", "dues:write",
        "tasks:read", "complaints:read", "complaints:write", "letters:read", "letters:write",
        "shiftRequests:read", "shiftRequests:write", "uploads:read", "uploads:write",
        "notifications:read",
    },
    "hr": {
        "employees:read", "employees:write", "attendance:read", "attendance:write",
        "attendance:approve", "leaves:read", "leaves:write", "leaves:approve",
        "missions:read", "missions:write", "missions:approve", "documents:read",
        "documents:write", "shifts:read", "shifts:write", "reports:read",
        "uploads:read", "uploads:write", "quality:read",
    },
    "finance": {
        "employees:read", "payroll:read", "payroll:write", "payroll:review", "payroll:pay",
        "expenses:read", "expenses:write", "adjustments:read", "adjustments:write",
        "custodies:read", "custodies:write", "advances:read", "advances:write",
        "dues:read", "dues:write", "reports:read", "uploads:read", "uploads:write",
    },
}

SYNC_COLLECTIONS: Dict[str, Dict[str, Any]] = {
    "shifts": {"perm": "shifts:write"},
    "expenses": {"perm": "expenses:write"},
    "adjustments": {"perm": "adjustments:write", "owner": "employeeId", "employee_create": True},
    "custodies": {"perm": "custodies:write", "owner": "employeeId"},
    "holidays": {"perm": "holidays:write"},
    "documents": {"perm": "documents:write", "owner": "employeeId", "employee_create": True},
    "permissions": {"perm": "permissions:write", "owner": "employeeId", "employee_create": True},
    "decisions": {"perm": "decisions:write"},
    "meetings": {"perm": "meetings:write"},
    "shiftRequests": {"perm": "shiftRequests:write", "owner": "employeeId", "employee_create": True},
    "biometricDevices": {"perm": "biometricDevices:write"},
    "workInterruptions": {"perm": "workInterruptions:write", "owner": "employeeId"},
    "evaluations": {"perm": "evaluations:write", "owner": "employeeId"},
    "recruitment": {"perm": "recruitment:write"},
    "terminations": {"perm": "terminations:write", "owner": "employeeId"},
    "advances": {"perm": "advances:write", "owner": "employeeId", "employee_create": True},
    "tasks": {"perm": "tasks:write", "owner": "employeeId"},
    "dues": {"perm": "dues:write", "owner": "employeeId", "employee_create": True},
    "complaints": {"perm": "complaints:write", "owner": "employeeId", "employee_create": True},
    "letters": {"perm": "letters:write", "owner": "employeeId", "employee_create": True},
    "announcements": {"perm": "announcements:write"},
}


def _clone_json(value: Any) -> Any:
    return json.loads(json_dumps(value))


def _sanitize_user(user: Dict[str, Any]) -> Dict[str, Any]:
    clean = dict(user)
    for key in ("password", "passwordHash", "password_hash", "temporaryPassword", "_pendingPassword"):
        clean.pop(key, None)
    return clean


def sanitize_state(state: Dict[str, Any]) -> Dict[str, Any]:
    clean = _clone_json(state if isinstance(state, dict) else {})
    clean["users"] = [_sanitize_user(u) for u in as_list(clean.get("users")) if isinstance(u, dict)]
    return clean


def _record_map(items: Any) -> Dict[str, Dict[str, Any]]:
    return {clean_str(x.get("id")): x for x in as_list(items) if isinstance(x, dict) and clean_str(x.get("id"))}


def _append_initial_credentials(lines: List[str]) -> None:
    if not lines:
        return
    ensure_dirs()
    header = "Orbit HR v4.2.0-security - initial credentials\nChange all passwords immediately after the first login.\n\n"
    existing = INITIAL_CREDENTIALS_PATH.read_text(encoding="utf-8") if INITIAL_CREDENTIALS_PATH.exists() else header
    INITIAL_CREDENTIALS_PATH.write_text(existing + "\n".join(lines) + "\n", encoding="utf-8")
    try:
        os.chmod(INITIAL_CREDENTIALS_PATH, 0o600)
    except Exception:
        pass


def strong_password(password: str) -> bool:
    return len(password or "") >= PASSWORD_MIN_LENGTH and bool(re.search(r"[A-Za-z\u0600-\u06ff]", password)) and bool(re.search(r"\d", password))


# Never synchronize plaintext passwords from app_state.
def sync_users_from_state(con: sqlite3.Connection, state: Dict[str, Any]) -> None:
    users = as_list(state.get("users"))
    now = utc_now()
    generated: List[str] = []
    for u in users:
        if not isinstance(u, dict):
            continue
        email = lower(u.get("email"))
        if not email:
            continue
        user_id = clean_str(u.get("id")) or f"u_{hashlib.sha1(email.encode()).hexdigest()[:10]}"
        permissions = u.get("permissions") or u.get("customPermissions") or []
        old = con.execute("SELECT id FROM auth_users WHERE email=?", (email,)).fetchone()
        if old:
            con.execute(
                "UPDATE auth_users SET employee_id=?, name=?, role=?, active=?, permissions=?, updated_at=? WHERE email=?",
                (u.get("employeeId") or "", u.get("name") or email, u.get("role") or "employee", 1 if u.get("active", True) else 0, json_dumps(permissions), now, email),
            )
        else:
            # First-run bootstrap: keep known demo credentials only for local review,
            # but force changing them immediately. Plaintext passwords are never saved
            # into app_state or returned to the browser.
            role = lower(u.get("role") or "employee")
            env_key = f"ORBIT_HR_BOOTSTRAP_{role.upper()}_PASSWORD"
            temp_password = os.environ.get(env_key, "")
            if not temp_password and role == "admin":
                temp_password = os.environ.get("ORBIT_HR_ADMIN_PASSWORD", "")
            if not temp_password:
                temp_password = DEFAULT_BOOTSTRAP_PASSWORDS.get(email, "")
            generated_by_server = False
            if not temp_password:
                temp_password = secrets.token_urlsafe(12) + "7a"
                generated_by_server = True
            con.execute(
                "INSERT INTO auth_users(id,employee_id,name,email,password_hash,role,active,permissions,created_at,updated_at,must_change_password) VALUES(?,?,?,?,?,?,?,?,?,?,1)",
                (user_id, u.get("employeeId") or "", u.get("name") or email, email, password_hash(temp_password), role, 1 if u.get("active", True) else 0, json_dumps(permissions), now, now),
            )
            label = "Temporary password" if generated_by_server else "Bootstrap password"
            generated.append(f"Email: {email}\n{label}: {temp_password}\n")
    _append_initial_credentials(generated)


def save_state_to_db(con: sqlite3.Connection, state: Dict[str, Any], user_id: Optional[str]) -> str:
    state = sanitize_state(state)
    errors = critical_validation_errors(state)
    if errors:
        raise ValueError("validation_failed::" + json_dumps(errors))
    now = utc_now()
    con.execute("UPDATE app_state SET data=?, updated_at=?, updated_by=? WHERE id=1", (json_dumps(state), now, user_id or "anonymous"))
    sync_users_from_state(con, state)
    sync_structured_tables_from_state(con, state)
    return now


def has_permission(actor: sqlite3.Row, *perms: str) -> bool:
    if is_admin(actor):
        return True
    role = lower(actor["role"])
    granted = set(ROLE_PERMISSIONS.get(role, set())) | set(actor_permissions(actor))
    for perm in perms:
        prefix = perm.split(":", 1)[0]
        if perm in granted or prefix in granted or "*" in granted:
            return True
    return False


def _safe_settings_for_employee(settings: Dict[str, Any]) -> Dict[str, Any]:
    keys = {
        "company", "currency", "language", "branches", "branchCurrencies", "departments",
        "leaveTypes", "verificationMode", "requireGPS", "requireFace", "useBranchGeofence",
        "geofenceMode", "outsideBranchPolicy", "maxGpsAccuracyMeters", "timezone",
    }
    return {k: _clone_json(v) for k, v in settings.items() if k in keys}


def visible_state_for_actor(state: Dict[str, Any], actor: sqlite3.Row) -> Dict[str, Any]:
    state = sanitize_state(state)
    role = lower(actor["role"])
    if is_admin(actor):
        return state
    if role in ("manager", "hr", "finance"):
        if role == "finance":
            allowed = {"settings", "users", "employees", "attendance", "expenses", "adjustments", "custodies", "payroll", "advances", "dues", "documents", "auditLog"}
            state = {k: v for k, v in state.items() if k in allowed}
            state["auditLog"] = []
        return state
    emp_id = actor["employee_id"] or ""
    filtered = dict(state)
    owner_keys = (
        "employees", "attendance", "leaves", "missions", "permissions", "shiftRequests",
        "evaluations", "advances", "dues", "tasks", "complaints", "letters", "documents",
        "payroll", "adjustments", "custodies", "workInterruptions", "terminations",
    )
    for key in owner_keys:
        arr = as_list(state.get(key))
        filtered[key] = [x for x in arr if isinstance(x, dict) and (x.get("employeeId") == emp_id or x.get("id") == emp_id)]
    filtered["users"] = [u for u in as_list(state.get("users")) if isinstance(u, dict) and (u.get("id") == actor["id"] or u.get("employeeId") == emp_id)]
    filtered["settings"] = _safe_settings_for_employee(as_dict(state.get("settings")))
    filtered["auditLog"] = []
    for key in ("expenses", "recruitment", "biometricDevices", "decisions", "meetings", "announcements"):
        filtered[key] = []
    return filtered


def company_timezone(state: Dict[str, Any]) -> ZoneInfo:
    name = clean_str(as_dict(state.get("settings")).get("timezone") or os.environ.get("ORBIT_HR_TIMEZONE") or "Africa/Cairo")
    try:
        return ZoneInfo(name)
    except Exception:
        return ZoneInfo("Africa/Cairo")


def local_now(state: Dict[str, Any]) -> _dt.datetime:
    return _dt.datetime.now(company_timezone(state)).replace(microsecond=0)


def parse_local_dt(value: Any, state: Dict[str, Any], default_date: Optional[_dt.date] = None) -> Optional[_dt.datetime]:
    if not value:
        return None
    s = str(value)
    try:
        if s.endswith("Z"):
            s = s[:-1] + "+00:00"
        dt = _dt.datetime.fromisoformat(s)
        tz = company_timezone(state)
        if dt.tzinfo is None:
            if default_date and "T" not in s and " " not in s:
                t = parse_time_hm(s)
                return _dt.datetime.combine(default_date, t, tzinfo=tz) if t else None
            dt = dt.replace(tzinfo=tz)
        return dt.astimezone(tz)
    except Exception:
        return None


def combine_local_date_time(state: Dict[str, Any], d: _dt.date, hm: str) -> Optional[_dt.datetime]:
    t = parse_time_hm(hm)
    return _dt.datetime.combine(d, t, tzinfo=company_timezone(state)) if t else None


def normalize_attendance_record(state: Dict[str, Any], rec: Dict[str, Any]) -> Dict[str, Any]:
    emp = emp_by_id(state, clean_str(rec.get("employeeId")))
    d = parse_date(rec.get("date")) or local_now(state).date()
    rec.setdefault("id", make_id("a"))
    rec["date"] = d.isoformat()
    if clean_str(rec.get("status")) == "absent":
        rec.update({"checkIn": None, "checkOut": None, "lateMinutes": 0, "overtimeMinutes": 0, "earlyLeaveMinutes": 0, "status": "absent"})
        return rec
    shift = shift_by_id(state, clean_str(emp.get("shiftId")) if emp else "")
    sched = shift_schedule_for_date(shift, d)
    check_in = parse_local_dt(rec.get("checkIn"), state, d)
    check_out = parse_local_dt(rec.get("checkOut"), state, d)
    late = overtime = early = 0
    if sched and check_in:
        start_dt = combine_local_date_time(state, d, sched["start"])
        end_dt = combine_local_date_time(state, d, sched["end"])
        if start_dt and end_dt and end_dt <= start_dt:
            end_dt += _dt.timedelta(days=1)
        if check_out and check_out < check_in:
            raise ValueError("وقت الانصراف لا يمكن أن يسبق وقت الحضور")
        grace = to_int(shift.get("grace") if shift else 0)
        late = max(0, int((check_in - (start_dt + _dt.timedelta(minutes=grace))).total_seconds() // 60)) if start_dt else 0
        if check_out and end_dt:
            overtime = max(0, int((check_out - end_dt).total_seconds() // 60))
            early = max(0, int((end_dt - check_out).total_seconds() // 60))
    rec["lateMinutes"] = late
    rec["overtimeMinutes"] = overtime
    rec["earlyLeaveMinutes"] = early
    rec["status"] = "absent" if not check_in and not check_out else ("late" if late > 0 else "present")
    rec.setdefault("verificationStatus", "manual")
    rec["updatedAt"] = utc_now()
    return rec


def apply_geofence(state: Dict[str, Any], rec: Dict[str, Any], lat: Optional[float], lng: Optional[float], *, punch_type: str = "checkIn", accuracy: Optional[float] = None, mocked: bool = False) -> Tuple[bool, Optional[str]]:
    settings = as_dict(state.get("settings"))
    emp = emp_by_id(state, clean_str(rec.get("employeeId")))
    branch = clean_str(emp.get("branch")) if emp else clean_str(rec.get("branch"))
    loc = as_dict(as_dict(settings.get("branchLocations")).get(branch))
    use_geo = bool(settings.get("requireGPS")) or bool(settings.get("useBranchGeofence", True))
    prefix = "checkOut" if punch_type == "checkOut" else "checkIn"
    if accuracy is not None:
        rec[f"{prefix}GpsAccuracyMeters"] = round(float(accuracy), 2)
    rec[f"{prefix}MockLocation"] = bool(mocked)
    if mocked:
        rec["verificationStatus"] = "blocked"
        rec["verificationNote"] = "تم اكتشاف موقع وهمي أو معدل"
        return False, "تم اكتشاف موقع وهمي؛ لا يمكن تسجيل الحضور"
    max_accuracy = max(10, to_int(settings.get("maxGpsAccuracyMeters"), 100))
    if use_geo and accuracy is not None and accuracy > max_accuracy:
        rec["verificationStatus"] = "needs_review"
        rec["verificationNote"] = f"دقة الموقع ضعيفة ({round(accuracy)} متر)"
        if settings.get("poorGpsAccuracyPolicy", "block") == "block":
            return False, "دقة الموقع غير كافية؛ أعد المحاولة في مكان مفتوح"
    if not use_geo:
        return True, None
    if not loc.get("enabled"):
        rec["geoVerified"] = False
        rec["verificationStatus"] = "needs_review"
        rec["verificationNote"] = "موقع الفرع غير مفعل"
        return settings.get("outsideBranchPolicy", "review") != "block", "موقع الفرع غير مفعل"
    if lat is None or lng is None:
        rec["geoVerified"] = False
        rec["verificationStatus"] = "needs_review"
        rec["verificationNote"] = "لم يتم إرسال الموقع"
        return settings.get("outsideBranchPolicy", "review") != "block", "الموقع مطلوب للتسجيل"
    dist = haversine_m(lat, lng, to_float(loc.get("lat")), to_float(loc.get("lng")))
    radius = max(1, to_int(loc.get("radius"), 300))
    ok = dist <= radius
    rec[f"{prefix}Lat"] = lat
    rec[f"{prefix}Lng"] = lng
    rec[f"{prefix}DistanceMeters"] = round(dist, 2)
    if punch_type == "checkIn":
        rec["distanceMeters"] = round(dist, 2)
        rec["geoVerified"] = ok
    else:
        rec["checkOutDistanceMeters"] = round(dist, 2)
        rec["checkOutGeoVerified"] = ok
    rec["branchRadiusMeters"] = radius
    if ok:
        if rec.get("verificationStatus") != "needs_review":
            rec["verificationStatus"] = "verified"
        return True, None
    policy = settings.get("outsideBranchPolicy") or settings.get("geofenceMode") or settings.get("geofencePolicy") or "review"
    rec["verificationStatus"] = "needs_review" if policy in ("review", "warn") else "blocked"
    rec["verificationNote"] = f"خارج نطاق الفرع بمسافة {round(dist)} متر"
    return (policy != "block"), (None if policy != "block" else "الموظف خارج نطاق الفرع المسموح")


def _employment_bounds(emp: Dict[str, Any], month_start: _dt.date, month_end: _dt.date) -> Tuple[Optional[_dt.date], Optional[_dt.date]]:
    start = parse_date(emp.get("hireDate") or emp.get("contractStart")) or month_start
    end = parse_date(emp.get("terminationDate") or emp.get("lastWorkingDate") or emp.get("contractEnd")) or month_end
    start = max(month_start, start)
    end = min(month_end, end)
    return (None, None) if end < start else (start, end)


def calculate_employee_payroll(state: Dict[str, Any], emp: Dict[str, Any], month: str, *, period_end: Optional[_dt.date] = None, force: bool = False) -> Dict[str, Any]:
    settings = as_dict(state.get("settings"))
    month_start, month_end = month_start_end(month)
    calc_end = min(period_end, month_end) if period_end and month_start <= period_end else month_end
    eligible_start, eligible_end = _employment_bounds(emp, month_start, calc_end)
    salary = max(0.0, to_float(emp.get("salary")))
    shift = shift_by_id(state, clean_str(emp.get("shiftId")))
    full_month_dates = [d for d in date_range(month_start, month_end) if shift_schedule_for_date(shift, d) and not is_holiday(state, d, clean_str(emp.get("branch")))]
    planned_days = max(1, len(full_month_dates) or to_int(settings.get("workDays"), 26) or 26)
    calc_work_dates: List[_dt.date] = []
    if eligible_start and eligible_end:
        calc_work_dates = [d for d in date_range(eligible_start, eligible_end) if shift_schedule_for_date(shift, d) and not is_holiday(state, d, clean_str(emp.get("branch")))]
    daily_rate = salary / planned_days
    base_due = daily_rate * len(calc_work_dates)
    attendance_by_date = {clean_str(a.get("date"))[:10]: a for a in as_list(state.get("attendance")) if a.get("employeeId") == emp.get("id")}
    absent_days = unpaid_leave_days = paid_leave_days = mission_days = worked_days = 0
    late_minutes = early_minutes = overtime_minutes = 0
    require_ot_approval = bool(settings.get("requireOvertimeApproval", True))
    for d in calc_work_dates:
        lv = leave_on_date(state, emp.get("id"), d)
        ms = mission_on_date(state, emp.get("id"), d)
        att = attendance_by_date.get(d.isoformat())
        if lv:
            if str(lv.get("paid", "true")).lower() in ("false", "0", "no"):
                unpaid_leave_days += 1
            else:
                paid_leave_days += 1
            continue
        if ms:
            mission_days += 1
            continue
        if not att or clean_str(att.get("status")) == "absent":
            absent_days += 1
            continue
        worked_days += 1
        late_minutes += to_int(att.get("lateMinutes"))
        early_minutes += to_int(att.get("earlyLeaveMinutes"))
        overtime_minutes += to_int(att.get("overtimeApprovedMinutes") if require_ot_approval else att.get("overtimeMinutes"))
    typical_minutes = 8 * 60
    if shift and calc_work_dates:
        first_sched = shift_schedule_for_date(shift, calc_work_dates[0])
        if first_sched:
            typical_minutes = shift_minutes(first_sched)
    minute_rate = daily_rate / max(1, typical_minutes)
    late_deduction = late_minutes * (to_float(settings.get("lateDeductionPerMinute")) if settings.get("lateDeductionMethod") == "fixed" else minute_rate)
    early_deduction = early_minutes * minute_rate
    absence_deduction = absent_days * daily_rate
    unpaid_leave_deduction = unpaid_leave_days * daily_rate
    overtime_amount = ((overtime_minutes / 60) * to_float(settings.get("overtimeRatePerHour"))) if settings.get("overtimeCalculationMethod") == "fixed" else overtime_minutes * minute_rate * to_float(settings.get("overtimeMultiplier"), 1.5)
    rewards = manual_deductions = 0.0
    for adj in as_list(state.get("adjustments")):
        if adj.get("employeeId") != emp.get("id") or clean_str(adj.get("status")) != "approved" or not in_month(adj.get("date"), month):
            continue
        if adj.get("kind") == "reward":
            rewards += to_float(adj.get("amount"))
        else:
            manual_deductions += to_float(adj.get("amount"))
    dues = sum(to_float(d.get("amount")) for d in as_list(state.get("dues")) if d.get("employeeId") == emp.get("id") and clean_str(d.get("status")) in ("approved", "paid") and in_month(d.get("date"), month))
    advances = 0.0
    for av in as_list(state.get("advances")):
        if av.get("employeeId") != emp.get("id") or clean_str(av.get("status")) not in ("approved", "paid", "disbursed"):
            continue
        start_month = clean_str(av.get("startMonth") or av.get("date"))[:7]
        installments = max(1, to_int(av.get("installments"), 1))
        try:
            sy, sm = [int(x) for x in start_month.split("-")]
            cy, cm = [int(x) for x in month.split("-")]
            idx = (cy - sy) * 12 + (cm - sm)
            if 0 <= idx < installments:
                advances += to_float(av.get("amount")) / installments
        except Exception:
            pass
    insurance = max(0.0, to_float(emp.get("insuranceDeduction"), to_float(emp.get("insurance"))))
    tax = max(0.0, to_float(emp.get("taxDeduction"), to_float(emp.get("tax"))))
    gross = base_due + overtime_amount + rewards + dues
    total_deductions = late_deduction + early_deduction + absence_deduction + unpaid_leave_deduction + manual_deductions + insurance + tax + advances
    net = gross - total_deductions
    period_from = eligible_start.isoformat() if eligible_start else month_start.isoformat()
    period_to = eligible_end.isoformat() if eligible_end else calc_end.isoformat()
    result = {
        "employeeId": emp.get("id"), "month": month, "branch": emp.get("branch"),
        "currency": as_dict(settings.get("branchCurrencies")).get(emp.get("branch"), settings.get("currency", "EGP")),
        "baseSalary": round(salary, 2), "contractBase": round(salary, 2), "baseDue": round(base_due, 2), "base": round(base_due, 2),
        "plannedWorkDays": planned_days, "scheduledDays": planned_days, "calculatedWorkDays": len(calc_work_dates), "eligibleDays": len(calc_work_dates),
        "workedDays": worked_days, "absentDays": absent_days, "absenceDays": absent_days,
        "paidLeaveDays": paid_leave_days, "unpaidLeaveDays": unpaid_leave_days, "missionDays": mission_days,
        "lateMinutes": late_minutes, "earlyLeaveMinutes": early_minutes, "overtimeMinutes": overtime_minutes,
        "overtimeAmount": round(overtime_amount, 2), "overtime": round(overtime_amount, 2), "rewards": round(rewards, 2), "dues": round(dues, 2),
        "lateDeduction": round(late_deduction, 2), "lateDed": round(late_deduction, 2),
        "earlyLeaveDeduction": round(early_deduction, 2), "absenceDeduction": round(absence_deduction, 2), "absenceDed": round(absence_deduction, 2),
        "unpaidLeaveDeduction": round(unpaid_leave_deduction, 2), "unpaidLeaveDed": round(unpaid_leave_deduction, 2),
        "manualDeductions": round(manual_deductions, 2), "insurance": round(insurance, 2), "insuranceDeduction": round(insurance, 2),
        "tax": round(tax, 2), "taxDeduction": round(tax, 2), "advanceInstallment": round(advances, 2), "advanceDeduction": round(advances, 2),
        "gross": round(gross, 2), "totalEarnings": round(gross, 2), "totalDeductions": round(total_deductions, 2), "deductions": round(total_deductions, 2), "net": round(net, 2),
        "status": "draft", "calculatedAt": utc_now(), "calculationMode": "server_v4.2", "periodFrom": period_from, "periodTo": period_to, "periodEnd": period_to,
    }
    result["breakdown"] = {k: result[k] for k in ("baseDue", "overtimeAmount", "rewards", "dues", "lateDeduction", "earlyLeaveDeduction", "absenceDeduction", "unpaidLeaveDeduction", "manualDeductions", "insurance", "tax", "advanceInstallment")}
    return result


_original_init_db_v41 = init_db

def init_db() -> None:
    _original_init_db_v41()
    with _db_lock, db() as con:
        cols = {r["name"] for r in con.execute("PRAGMA table_info(auth_users)").fetchall()}
        if "must_change_password" not in cols:
            con.execute("ALTER TABLE auth_users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0")
        con.execute("CREATE TABLE IF NOT EXISTS system_meta(key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL)")
        state, _ = load_state_from_db(con)
        clean = sanitize_state(state)
        if clean != state:
            con.execute("UPDATE app_state SET data=?, updated_at=?, updated_by=? WHERE id=1", (json_dumps(clean), utc_now(), "security_v42"))
        con.execute("INSERT OR REPLACE INTO system_meta(key,value,updated_at) VALUES('schema_version','4.2.0',?)", (utc_now(),))
        con.execute("DELETE FROM api_sessions WHERE expires_at<=?", (int(time.time()),))


def _static_path_allowed(path: str) -> Optional[str]:
    parsed = urllib.parse.urlsplit(path).path
    decoded = urllib.parse.unquote(parsed)
    if decoded in ("", "/"):
        decoded = "/index.html"
    rel = decoded.lstrip("/")
    if not rel or rel not in PUBLIC_FILES or ".." in Path(rel).parts or Path(rel).is_absolute():
        return None
    return rel


def _secure_translate_path(self: "OrbitHandler", path: str) -> str:
    rel = _static_path_allowed(path)
    return str(ROOT / rel) if rel else str(ROOT / "__not_found__")


def _secure_do_get(self: "OrbitHandler") -> None:
    if urllib.parse.urlsplit(self.path).path.startswith("/api/"):
        return self.handle_api("GET")
    rel = _static_path_allowed(self.path)
    if not rel:
        return self.send_error(404)
    return SimpleHTTPRequestHandler.do_GET(self)


def _secure_end_headers(self: "OrbitHandler") -> None:
    origin = self.headers.get("Origin", "")
    allowed = [x.strip() for x in str(ALLOWED_ORIGINS or "").split(",") if x.strip()]
    if origin and (origin in allowed or "*" in allowed):
        self.send_header("Access-Control-Allow-Origin", origin if origin != "null" else "null")
        self.send_header("Vary", "Origin")
    self.send_header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
    self.send_header("Access-Control-Allow-Headers", "Content-Type,Authorization")
    self.send_header("X-Content-Type-Options", "nosniff")
    self.send_header("X-Frame-Options", "SAMEORIGIN")
    self.send_header("Referrer-Policy", "no-referrer")
    self.send_header("Permissions-Policy", "camera=(self), geolocation=(self)")
    self.send_header("Content-Security-Policy", "default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'")
    if urllib.parse.urlsplit(self.path).path.startswith("/api/"):
        self.send_header("Cache-Control", "no-store, private")
    elif urllib.parse.urlsplit(self.path).path.endswith("sw.js"):
        self.send_header("Cache-Control", "no-cache")
    SimpleHTTPRequestHandler.end_headers(self)


def _current_user_no_query(handler: "OrbitHandler") -> Optional[sqlite3.Row]:
    token = handler.headers.get("Authorization", "")
    if token.lower().startswith("bearer "):
        token = token.split(" ", 1)[1].strip()
    else:
        return None
    if not token:
        return None
    with _db_lock, db() as con:
        return con.execute(
            "SELECT s.user_id,u.* FROM api_sessions s JOIN auth_users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND u.active=1",
            (token_hash(token), int(time.time())),
        ).fetchone()

globals()["current_user"] = _current_user_no_query
OrbitHandler.translate_path = _secure_translate_path
OrbitHandler.do_GET = _secure_do_get
OrbitHandler.end_headers = _secure_end_headers


def _client_ip(handler: "OrbitHandler") -> str:
    return clean_str(handler.headers.get("X-Forwarded-For")).split(",")[0].strip() or handler.client_address[0]


def _login_key(handler: "OrbitHandler", email: str) -> str:
    return f"{_client_ip(handler)}|{email}"


def _login_blocked(key: str) -> int:
    now = time.time()
    with _login_lock:
        recent = [x for x in _login_failures.get(key, []) if now - x < LOGIN_WINDOW_SECONDS]
        _login_failures[key] = recent
        if len(recent) >= LOGIN_MAX_FAILURES:
            return max(1, int(LOGIN_WINDOW_SECONDS - (now - recent[0])))
    return 0


def _login_fail(key: str) -> None:
    with _login_lock:
        _login_failures.setdefault(key, []).append(time.time())


def _login_success(key: str) -> None:
    with _login_lock:
        _login_failures.pop(key, None)


def _api_login_v42(self: "OrbitHandler") -> None:
    body = self.read_json()
    email = lower(body.get("email"))
    password = str(body.get("password") or "")
    key = _login_key(self, email)
    retry = _login_blocked(key)
    if retry:
        return self.send_json({"ok": False, "error": "too_many_attempts", "message": "محاولات دخول كثيرة؛ أعد المحاولة لاحقًا", "retryAfter": retry}, 429)
    with _db_lock, db() as con:
        user = con.execute("SELECT * FROM auth_users WHERE email=? AND active=1", (email,)).fetchone()
        if not user or not verify_password(password, user["password_hash"]):
            _login_fail(key)
            audit(con, None, "فشل تسجيل دخول", "الأمان", email, _client_ip(self))
            return self.send_json({"ok": False, "error": "invalid_credentials", "message": "بيانات الدخول غير صحيحة"}, 401)
        _login_success(key)
        token = create_session(con, user, self)
        state, updated_at = load_state_from_db(con)
        audit(con, user, "تسجيل دخول", "الأمان", email, _client_ip(self))
        safe_user = {
            "id": user["id"], "employeeId": user["employee_id"], "name": user["name"],
            "email": user["email"], "role": user["role"], "permissions": actor_permissions(user),
            "active": bool(user["active"]), "mustChangePassword": bool(user["must_change_password"]),
        }
        payload_state = visible_state_for_actor(state, user)
    self.send_json({"ok": True, "token": token, "user": safe_user, "state": sanitize_state(payload_state), "updatedAt": updated_at, "serverVersion": APP_VERSION})


def _api_change_password(self: "OrbitHandler") -> None:
    actor = self.require_auth()
    if not actor:
        return
    body = self.read_json()
    current = str(body.get("currentPassword") or "")
    new = str(body.get("newPassword") or "")
    if not strong_password(new):
        return self.send_json({"ok": False, "error": "weak_password", "message": f"كلمة المرور يجب أن تكون {PASSWORD_MIN_LENGTH} أحرف على الأقل وتحتوي حروفًا وأرقامًا"}, 422)
    with _db_lock, db() as con:
        row = con.execute("SELECT * FROM auth_users WHERE id=?", (actor["id"],)).fetchone()
        if not row or not verify_password(current, row["password_hash"]):
            return self.send_json({"ok": False, "error": "invalid_current_password", "message": "كلمة المرور الحالية غير صحيحة"}, 401)
        con.execute("UPDATE auth_users SET password_hash=?, must_change_password=0, updated_at=? WHERE id=?", (password_hash(new), utc_now(), actor["id"]))
        con.execute("DELETE FROM api_sessions WHERE user_id=? AND token_hash<>?", (actor["id"], token_hash(self.headers.get("Authorization", "").split(" ", 1)[-1].strip())))
        audit(con, actor, "تغيير كلمة المرور", "الأمان", actor["email"], _client_ip(self))
    self.send_json({"ok": True})


def _api_users_v42(self: "OrbitHandler", method: str, tail: List[str]) -> None:
    actor = self.require_auth("users:write" if method != "GET" else "users:read")
    if not actor:
        return
    if not is_admin(actor):
        return self.send_json({"ok": False, "error": "forbidden"}, 403)
    with _db_lock, db() as con:
        state, _ = load_state_from_db(con)
        users = as_list(state.get("users"))
        if method == "GET" and not tail:
            return self.send_json({"ok": True, "items": [_sanitize_user(u) for u in users if isinstance(u, dict)]})
        if method == "POST" and not tail:
            body = self.read_json()
            email = lower(body.get("email")); password = str(body.get("password") or "")
            if not email or "@" not in email:
                return self.send_json({"ok": False, "error": "invalid_email"}, 422)
            if not strong_password(password):
                return self.send_json({"ok": False, "error": "weak_password", "message": "كلمة المرور ضعيفة"}, 422)
            if con.execute("SELECT 1 FROM auth_users WHERE email=?", (email,)).fetchone():
                return self.send_json({"ok": False, "error": "duplicate_email"}, 409)
            item = {"id": clean_str(body.get("id")) or make_id("u"), "employeeId": clean_str(body.get("employeeId")), "name": clean_str(body.get("name") or email), "email": email, "role": clean_str(body.get("role") or "employee"), "active": bool(body.get("active", True)), "permissions": as_list(body.get("permissions"))}
            users.append(item)
            now = utc_now()
            con.execute("INSERT INTO auth_users(id,employee_id,name,email,password_hash,role,active,permissions,created_at,updated_at,must_change_password) VALUES(?,?,?,?,?,?,?,?,?,?,?)", (item["id"], item["employeeId"], item["name"], email, password_hash(password), item["role"], 1 if item["active"] else 0, json_dumps(item["permissions"]), now, now, 1 if body.get("mustChangePassword", True) else 0))
            con.execute("UPDATE app_state SET data=?, updated_at=?, updated_by=? WHERE id=1", (json_dumps(sanitize_state(state)), now, actor["id"]))
            audit(con, actor, "إنشاء حساب دخول", "الأمان", email, _client_ip(self))
            return self.send_json({"ok": True, "item": _sanitize_user(item), "updatedAt": now}, 201)
        if tail:
            user_id = tail[0]
            item = next((u for u in users if isinstance(u, dict) and u.get("id") == user_id), None)
            if not item:
                return self.send_json({"ok": False, "error": "not_found"}, 404)
            if len(tail) == 2 and tail[1] == "password" and method in ("POST", "PUT"):
                body = self.read_json(); password = str(body.get("password") or "")
                if not strong_password(password):
                    return self.send_json({"ok": False, "error": "weak_password", "message": "كلمة المرور ضعيفة"}, 422)
                con.execute("UPDATE auth_users SET password_hash=?, must_change_password=?, updated_at=? WHERE id=?", (password_hash(password), 1 if body.get("mustChangePassword", True) else 0, utc_now(), user_id))
                con.execute("DELETE FROM api_sessions WHERE user_id=?", (user_id,))
                audit(con, actor, "إعادة تعيين كلمة مرور", "الأمان", clean_str(item.get("email")), _client_ip(self))
                return self.send_json({"ok": True})
            if method == "PUT":
                body = self.read_json(); old_role = clean_str(item.get("role"))
                for key in ("employeeId", "name", "email", "role", "active", "permissions"):
                    if key in body:
                        item[key] = body[key]
                item["email"] = lower(item.get("email")); item["permissions"] = as_list(item.get("permissions"))
                if user_id == actor["id"] and item.get("active") is False:
                    return self.send_json({"ok": False, "error": "cannot_disable_self"}, 422)
                active_admins = [u for u in users if u.get("role") == "admin" and u.get("active", True) and u.get("id") != user_id]
                if old_role == "admin" and item.get("role") != "admin" and not active_admins:
                    return self.send_json({"ok": False, "error": "last_admin"}, 422)
                con.execute("UPDATE auth_users SET employee_id=?,name=?,email=?,role=?,active=?,permissions=?,updated_at=? WHERE id=?", (clean_str(item.get("employeeId")), clean_str(item.get("name")), lower(item.get("email")), clean_str(item.get("role")), 1 if item.get("active", True) else 0, json_dumps(item.get("permissions") or []), utc_now(), user_id))
                now = save_state_to_db(con, state, actor["id"])
                audit(con, actor, "تعديل حساب دخول", "الأمان", clean_str(item.get("email")), _client_ip(self))
                return self.send_json({"ok": True, "item": _sanitize_user(item), "updatedAt": now})
            if method == "DELETE":
                if user_id == actor["id"]:
                    return self.send_json({"ok": False, "error": "cannot_delete_self"}, 422)
                active_admins = [u for u in users if u.get("role") == "admin" and u.get("active", True) and u.get("id") != user_id]
                if item.get("role") == "admin" and not active_admins:
                    return self.send_json({"ok": False, "error": "last_admin"}, 422)
                state["users"] = [u for u in users if u.get("id") != user_id]
                con.execute("DELETE FROM auth_users WHERE id=?", (user_id,))
                now = save_state_to_db(con, state, actor["id"])
                audit(con, actor, "حذف حساب دخول", "الأمان", clean_str(item.get("email")), _client_ip(self))
                return self.send_json({"ok": True, "updatedAt": now})
    return self.send_json({"ok": False, "error": "not_found"}, 404)


def _employee_can_change_record(actor: sqlite3.Row, rule: Dict[str, Any], old: Optional[Dict[str, Any]], new: Optional[Dict[str, Any]], action: str) -> bool:
    if lower(actor["role"]) != "employee":
        return has_permission(actor, rule["perm"])
    owner_key = rule.get("owner")
    if not owner_key or not rule.get("employee_create"):
        return False
    target = new or old or {}
    if clean_str(target.get(owner_key)) != clean_str(actor["employee_id"]):
        return False
    if action == "delete":
        return clean_str((old or {}).get("status")) in ("pending", "draft", "rejected", "cancelled", "")
    if old and clean_str(old.get("status")) in ("approved", "paid", "locked"):
        return False
    return True


def _api_sync_v42(self: "OrbitHandler") -> None:
    actor = self.require_auth()
    if not actor:
        return
    body = self.read_json()
    client_state = body.get("state")
    if not isinstance(client_state, dict):
        return self.send_json({"ok": False, "error": "invalid_state"}, 400)
    client_state = sanitize_state(client_state)
    base_updated = clean_str(body.get("baseUpdatedAt"))
    with _db_lock, db() as con:
        server_state, server_updated = load_state_from_db(con)
        if base_updated and base_updated != server_updated:
            return self.send_json({"ok": False, "error": "sync_conflict", "message": "تم تعديل البيانات من مستخدم آخر؛ تم إيقاف الحفظ لمنع فقد البيانات", "updatedAt": server_updated, "state": visible_state_for_actor(server_state, actor)}, 409)
        changed: List[str] = []
        if client_state.get("settings") != server_state.get("settings"):
            if not is_admin(actor):
                return self.send_json({"ok": False, "error": "forbidden_settings"}, 403)
            server_state["settings"] = as_dict(client_state.get("settings"))
            changed.append("settings")
        for key, rule in SYNC_COLLECTIONS.items():
            old_map = _record_map(server_state.get(key))
            new_map = _record_map(client_state.get(key))
            operations: List[Tuple[str, str, Optional[Dict[str, Any]], Optional[Dict[str, Any]]]] = []
            for rid in sorted(set(old_map) | set(new_map)):
                old, new = old_map.get(rid), new_map.get(rid)
                if old is None and new is not None:
                    operations.append(("create", rid, None, new))
                elif old is not None and new is None:
                    operations.append(("delete", rid, old, None))
                elif old != new:
                    operations.append(("update", rid, old, new))
            if not operations:
                continue
            for action, rid, old, new in operations:
                if not _employee_can_change_record(actor, rule, old, new, action):
                    return self.send_json({"ok": False, "error": "forbidden_record", "collection": key, "recordId": rid}, 403)
                if new is not None:
                    new = dict(new)
                    if lower(actor["role"]) == "employee":
                        new[rule["owner"]] = actor["employee_id"]
                        new["status"] = "pending" if clean_str(new.get("status")) not in ("rejected", "cancelled") else new.get("status")
                    new["updatedAt"] = utc_now()
                    new.setdefault("createdAt", utc_now())
                    new.setdefault("createdBy", actor["id"])
                    new_map[rid] = new
                else:
                    new_map.pop(rid, None)
            server_state[key] = list(new_map.values())
            changed.append(key)
            audit(con, actor, "مزامنة سجلات", key, f"{len(operations)} عملية سجل", _client_ip(self))
        if not changed:
            return self.send_json({"ok": True, "updatedAt": server_updated, "state": visible_state_for_actor(server_state, actor), "changed": []})
        updated = save_state_to_db(con, server_state, actor["id"])
        audit(con, actor, "حفظ تغييرات", "النظام", "، ".join(changed), _client_ip(self))
        visible = visible_state_for_actor(server_state, actor)
    return self.send_json({"ok": True, "updatedAt": updated, "state": visible, "changed": changed})


def _save_camera_evidence(con: sqlite3.Connection, actor: sqlite3.Row, image_data: str, emp_id: str, punch_type: str) -> Optional[str]:
    if not image_data:
        return None
    raw = image_data.split(",", 1)[1] if image_data.startswith("data:") and "," in image_data else image_data
    try:
        data = base64.b64decode(raw, validate=True)
    except Exception:
        raise ValueError("camera_image_invalid")
    if len(data) > 2 * 1024 * 1024 or not data.startswith((b"\xff\xd8\xff", b"\x89PNG\r\n\x1a\n")):
        raise ValueError("camera_image_invalid")
    upload_id = make_id("face")
    filename = f"attendance_{emp_id}_{punch_type}.jpg"
    path = UPLOAD_DIR / f"{upload_id}.jpg"
    path.write_bytes(data)
    con.execute("INSERT INTO uploads(id,entity,entity_id,filename,mime,size,path,uploaded_by,created_at) VALUES(?,?,?,?,?,?,?,?,?)", (upload_id, "attendance_evidence", emp_id, filename, "image/jpeg", len(data), str(path), actor["id"], utc_now()))
    return upload_id


def _api_attendance_v42(self: "OrbitHandler", method: str, tail: List[str], qs: Dict[str, List[str]]) -> None:
    if method == "POST" and tail == ["punch"]:
        actor = self.require_auth("attendance:punch")
        if not actor:
            return
        body = self.read_json()
        requested_emp = clean_str(body.get("employeeId"))
        emp_id = requested_emp or clean_str(actor["employee_id"])
        if not emp_id:
            return self.send_json({"ok": False, "error": "employee_not_linked"}, 422)
        if requested_emp and requested_emp != actor["employee_id"] and not has_permission(actor, "attendance:write"):
            return self.send_json({"ok": False, "error": "forbidden"}, 403)
        punch_type = "checkOut" if clean_str(body.get("type")) in ("checkout", "checkOut", "out") else "checkIn"
        with _db_lock, db() as con:
            state, _ = load_state_from_db(con)
            employee = emp_by_id(state, emp_id)
            if not employee or clean_str(employee.get("status") or "active") != "active":
                return self.send_json({"ok": False, "error": "employee_not_found"}, 404)
            now_local = local_now(state)
            d = now_local.date()
            existing = next((a for a in as_list(state.get("attendance")) if a.get("employeeId") == emp_id and clean_str(a.get("date"))[:10] == d.isoformat()), None)
            rec = existing or {"id": make_id("a"), "employeeId": emp_id, "date": d.isoformat(), "status": "present", "source": "mobile", "createdAt": utc_now()}
            if punch_type == "checkIn":
                if rec.get("checkIn"):
                    return self.send_json({"ok": False, "error": "already_checked_in", "message": "تم تسجيل الحضور من قبل لهذا اليوم"}, 422)
                rec["checkIn"] = now_local.isoformat()
                rec["location"] = clean_str(body.get("location") or "Mobile GPS")
            else:
                if not rec.get("checkIn"):
                    return self.send_json({"ok": False, "error": "check_in_required", "message": "يجب تسجيل الحضور أولًا"}, 422)
                if rec.get("checkOut"):
                    return self.send_json({"ok": False, "error": "already_checked_out"}, 422)
                rec["checkOut"] = now_local.isoformat()
                rec["checkOutLocation"] = clean_str(body.get("location") or "Mobile GPS")
            camera_upload = _save_camera_evidence(con, actor, clean_str(body.get("cameraImage")), emp_id, punch_type)
            if camera_upload:
                rec[f"{punch_type}CameraUploadId"] = camera_upload
                rec["faceEvidenceCaptured"] = True
            rec["faceVerified"] = False
            rec["faceVerificationMode"] = "evidence_only"
            allowed, message = apply_geofence(state, rec, (None if body.get("lat") is None else to_float(body.get("lat"))), (None if body.get("lng") is None else to_float(body.get("lng"))), punch_type=punch_type, accuracy=(None if body.get("accuracy") is None else to_float(body.get("accuracy"))), mocked=bool(body.get("mocked") or body.get("isMock")))
            if not allowed:
                return self.send_json({"ok": False, "error": "verification_failed", "message": message}, 422)
            require_face = bool(as_dict(state.get("settings")).get("requireFace")) or clean_str(as_dict(state.get("settings")).get("verificationMode")) in ("camera", "gps_camera")
            if require_face and not camera_upload:
                return self.send_json({"ok": False, "error": "camera_evidence_required", "message": "لقطة الكاميرا مطلوبة"}, 422)
            if require_face:
                rec["verificationStatus"] = "needs_review"
                rec["verificationNote"] = "تم حفظ لقطة إثبات؛ المطابقة البيومترية غير مفعلة"
            normalize_attendance_record(state, rec)
            if existing:
                existing.clear(); existing.update(rec)
            else:
                state.setdefault("attendance", []).append(rec)
            updated = save_state_to_db(con, state, actor["id"])
            audit(con, actor, "تسجيل دخول" if punch_type == "checkIn" else "تسجيل خروج", "الحضور", f"{emp_id} — {d.isoformat()}", _client_ip(self))
        return self.send_json({"ok": True, "item": rec, "updatedAt": updated})
    if method == "GET" and not tail:
        actor = self.require_auth("attendance:read")
        if not actor:
            return
        with _db_lock, db() as con:
            state, _ = load_state_from_db(con)
        items = as_list(visible_state_for_actor(state, actor).get("attendance"))
        emp_id = (qs.get("employeeId") or [""])[0]; date = (qs.get("date") or [""])[0]; month = (qs.get("month") or [""])[0]
        if emp_id: items = [x for x in items if x.get("employeeId") == emp_id]
        if date: items = [x for x in items if clean_str(x.get("date"))[:10] == date]
        if month: items = [x for x in items if clean_str(x.get("date")).startswith(month)]
        return self.send_json({"ok": True, "items": items})
    if method in ("POST", "PUT", "DELETE"):
        actor = self.require_auth("attendance:write" if method != "DELETE" else "attendance:delete")
        if not actor:
            return
        if lower(actor["role"]) == "employee":
            return self.send_json({"ok": False, "error": "manual_attendance_forbidden"}, 403)
    return OrbitHandler._api_attendance_v41(self, method, tail, qs)


OrbitHandler._api_attendance_v41 = OrbitHandler.api_attendance
OrbitHandler.api_attendance = _api_attendance_v42
OrbitHandler.api_login = _api_login_v42


def _request_overlap(state: Dict[str, Any], kind: str, item: Dict[str, Any], ignore_id: str = "") -> Optional[Dict[str, Any]]:
    emp_id = clean_str(item.get("employeeId"))
    f = parse_date(item.get("from") or item.get("date")); t = parse_date(item.get("to") or item.get("from") or item.get("date"))
    if not f or not t:
        return None
    collections = ["leaves", "missions"]
    for key in collections:
        for old in as_list(state.get(key)):
            if not isinstance(old, dict) or old.get("id") == ignore_id or old.get("employeeId") != emp_id or clean_str(old.get("status")) in ("rejected", "cancelled"):
                continue
            of = parse_date(old.get("from") or old.get("date")); ot = parse_date(old.get("to") or old.get("from") or old.get("date"))
            if of and ot and f <= ot and t >= of:
                return old
    return None


def _api_requests_v42(self: "OrbitHandler", method: str, kind: str, tail: List[str], qs: Dict[str, List[str]]) -> None:
    key = kind; area = "leaves" if kind == "leaves" else "missions"
    if method == "GET" and not tail:
        actor = self.require_auth(f"{area}:read")
        if not actor: return
        with _db_lock, db() as con: state, _ = load_state_from_db(con)
        return self.send_json({"ok": True, "items": as_list(visible_state_for_actor(state, actor).get(key))})
    if method == "POST" and not tail:
        actor = self.require_auth(f"{area}:write")
        if not actor: return
        item = self.read_json(); item["id"] = clean_str(item.get("id")) or make_id("l" if kind == "leaves" else "m")
        requested_emp = clean_str(item.get("employeeId")); own = clean_str(actor["employee_id"])
        if lower(actor["role"]) == "employee": item["employeeId"] = own
        elif not requested_emp: item["employeeId"] = own
        item["status"] = "pending"; item["createdAt"] = utc_now(); item["createdBy"] = actor["id"]
        with _db_lock, db() as con:
            state, _ = load_state_from_db(con)
            if not emp_by_id(state, item.get("employeeId")): return self.send_json({"ok": False, "error": "employee_not_found"}, 404)
            if kind == "leaves":
                f, t = parse_date(item.get("from")), parse_date(item.get("to") or item.get("from"))
                if not f or not t or t < f: return self.send_json({"ok": False, "error": "invalid_period"}, 422)
                item["days"] = sum(1 for d in date_range(f, t) if shift_schedule_for_date(shift_by_id(state, clean_str(emp_by_id(state, item["employeeId"]).get("shiftId"))), d) and not is_holiday(state, d, clean_str(emp_by_id(state, item["employeeId"]).get("branch"))))
            conflict = _request_overlap(state, kind, item)
            if conflict: return self.send_json({"ok": False, "error": "overlapping_request", "message": "يوجد طلب متداخل لنفس الموظف", "conflictId": conflict.get("id")}, 409)
            state.setdefault(key, []).append(item)
            updated = save_state_to_db(con, state, actor["id"]); audit(con, actor, "إضافة طلب", "الإجازات" if kind == "leaves" else "المأموريات", clean_str(item.get("employeeId")), _client_ip(self))
        return self.send_json({"ok": True, "item": item, "updatedAt": updated}, 201)
    if tail:
        item_id = tail[0]
        if len(tail) == 2 and tail[1] == "status" and method in ("PUT", "POST"):
            actor = self.require_auth(f"{area}:approve")
            if not actor: return
            body = self.read_json(); status = clean_str(body.get("status"))
            if status not in ("pending", "reviewed", "approved", "rejected", "cancelled"):
                return self.send_json({"ok": False, "error": "invalid_status"}, 400)
            with _db_lock, db() as con:
                state, _ = load_state_from_db(con); item = next((r for r in as_list(state.get(key)) if r.get("id") == item_id), None)
                if not item: return self.send_json({"ok": False, "error": "not_found"}, 404)
                if clean_str(item.get("employeeId")) == clean_str(actor["employee_id"]):
                    return self.send_json({"ok": False, "error": "self_approval_forbidden", "message": "لا يمكن للمستخدم اعتماد طلبه الشخصي"}, 422)
                if status == "approved":
                    conflict = _request_overlap(state, kind, item, item_id)
                    if conflict: return self.send_json({"ok": False, "error": "overlapping_request", "message": "يوجد طلب متداخل معتمد أو قيد المراجعة"}, 409)
                old = item.get("status"); item["status"] = status; item["statusNote"] = clean_str(body.get("note")); item["statusUpdatedAt"] = utc_now(); item["statusUpdatedBy"] = actor["id"]
                updated = save_state_to_db(con, state, actor["id"]); audit(con, actor, "تغيير حالة طلب", "الإجازات" if kind == "leaves" else "المأموريات", f"{old} → {status}", _client_ip(self))
            return self.send_json({"ok": True, "item": item, "updatedAt": updated})
        if method == "DELETE":
            actor = self.require_auth(f"{area}:delete", f"{area}:write")
            if not actor: return
            with _db_lock, db() as con:
                state, _ = load_state_from_db(con); item = next((r for r in as_list(state.get(key)) if r.get("id") == item_id), None)
                if not item: return self.send_json({"ok": False, "error": "not_found"}, 404)
                if lower(actor["role"]) == "employee" and (item.get("employeeId") != actor["employee_id"] or item.get("status") not in ("pending", "rejected", "cancelled")):
                    return self.send_json({"ok": False, "error": "forbidden"}, 403)
                state[key] = [r for r in as_list(state.get(key)) if r.get("id") != item_id]
                updated = save_state_to_db(con, state, actor["id"]); audit(con, actor, "حذف طلب", area, item_id, _client_ip(self))
            return self.send_json({"ok": True, "updatedAt": updated})
    return self.send_json({"ok": False, "error": "not_found"}, 404)

OrbitHandler.api_requests = _api_requests_v42


def _valid_upload(data: bytes, mime: str, filename: str) -> Tuple[bool, str]:
    mime = lower(mime)
    ext = Path(filename).suffix.lower()
    blocked = {".html", ".htm", ".svg", ".js", ".exe", ".dll", ".bat", ".cmd", ".ps1", ".sh", ".php", ".py"}
    if ext in blocked:
        return False, "file_type_not_allowed"
    if data.startswith(b"%PDF-") and ext == ".pdf": return True, "application/pdf"
    if data.startswith(b"\xff\xd8\xff") and ext in (".jpg", ".jpeg"): return True, "image/jpeg"
    if data.startswith(b"\x89PNG\r\n\x1a\n") and ext == ".png": return True, "image/png"
    if data.startswith(b"RIFF") and data[8:12] == b"WEBP" and ext == ".webp": return True, "image/webp"
    if data.startswith(b"PK\x03\x04") and ext in (".docx", ".xlsx", ".pptx", ".zip"): return True, mimetypes.guess_type(filename)[0] or "application/zip"
    if ext in (".txt", ".csv") and b"\x00" not in data[:4096]: return True, "text/plain"
    return False, "file_signature_mismatch"


def _api_upload_v42(self: "OrbitHandler") -> None:
    actor = self.require_auth("uploads:write")
    if not actor: return
    body = self.read_json(); filename = Path(clean_str(body.get("filename") or "file.bin")).name
    raw = str(body.get("data") or ""); raw = raw.split(",", 1)[1] if raw.startswith("data:") and "," in raw else raw
    try: data = base64.b64decode(raw, validate=True) if raw else b""
    except Exception: return self.send_json({"ok": False, "error": "invalid_base64"}, 422)
    if not data: return self.send_json({"ok": False, "error": "empty_file"}, 422)
    if len(data) > MAX_UPLOAD_BYTES: return self.send_json({"ok": False, "error": "file_too_large"}, 413)
    ok, detected = _valid_upload(data, clean_str(body.get("mime")), filename)
    if not ok: return self.send_json({"ok": False, "error": detected}, 422)
    upload_id = make_id("up"); path = UPLOAD_DIR / f"{upload_id}{Path(filename).suffix.lower()}"; path.write_bytes(data)
    with _db_lock, db() as con:
        con.execute("INSERT INTO uploads(id,entity,entity_id,filename,mime,size,path,uploaded_by,created_at) VALUES(?,?,?,?,?,?,?,?,?)", (upload_id, clean_str(body.get("entity") or "general"), clean_str(body.get("entityId")), filename, detected, len(data), str(path), actor["id"], utc_now()))
        audit(con, actor, "رفع مرفق", "المرفقات", filename, _client_ip(self))
    self.send_json({"ok": True, "file": {"id": upload_id, "url": f"/api/upload/{upload_id}", "filename": filename, "mime": detected, "size": len(data)}})


def _api_download_upload_v42(self: "OrbitHandler", upload_id: str) -> None:
    actor = self.require_auth("uploads:read")
    if not actor: return
    with _db_lock, db() as con: row = con.execute("SELECT * FROM uploads WHERE id=?", (upload_id,)).fetchone()
    if not row: return self.send_json({"ok": False, "error": "upload_not_found"}, 404)
    if lower(actor["role"]) == "employee" and row["uploaded_by"] != actor["id"] and row["entity_id"] != actor["employee_id"]:
        return self.send_json({"ok": False, "error": "forbidden"}, 403)
    self.send_file_download(Path(row["path"]), row["filename"])

OrbitHandler.api_upload_json = _api_upload_v42
OrbitHandler.api_download_upload = _api_download_upload_v42


def _send_file_download_v42(self: "OrbitHandler", path: Path, filename: str) -> None:
    try:
        resolved = path.resolve()
        if DATA_DIR.resolve() not in resolved.parents and resolved != DATA_DIR.resolve():
            return self.send_json({"ok": False, "error": "invalid_file_path"}, 403)
    except Exception:
        return self.send_json({"ok": False, "error": "invalid_file_path"}, 403)
    if not resolved.exists() or not resolved.is_file(): return self.send_json({"ok": False, "error": "file_not_found"}, 404)
    data = resolved.read_bytes(); self.send_response(200); self.send_header("Content-Type", mimetypes.guess_type(filename)[0] or "application/octet-stream"); self.send_header("Content-Length", str(len(data))); self.send_header("Content-Disposition", f"attachment; filename*=UTF-8''{urllib.parse.quote(filename)}"); self.send_header("Cache-Control", "no-store, private"); self.end_headers(); self.wfile.write(data)

OrbitHandler.send_file_download = _send_file_download_v42


def _create_backup_file_v42(self: "OrbitHandler", con: sqlite3.Connection, created_by: str = "system") -> Dict[str, Any]:
    backup_id = f"bak_{int(time.time())}_{secrets.token_hex(4)}"; filename = f"orbit_hr_v420_backup_{_dt.datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"; path = BACKUP_DIR / filename
    tmp_db = BACKUP_DIR / f".{backup_id}.sqlite3"
    src = db(); dst = sqlite3.connect(tmp_db)
    try: src.backup(dst)
    finally: dst.close(); src.close()
    with _zipfile.ZipFile(path, "w", compression=_zipfile.ZIP_DEFLATED) as z:
        z.write(tmp_db, "orbit_hr.sqlite3")
        state, _ = load_state_from_db(con); z.writestr("state.json", json_dumps({"version": APP_VERSION, "createdAt": utc_now(), "state": sanitize_state(state)}, indent=2))
        for file in UPLOAD_DIR.glob("*"):
            if file.is_file(): z.write(file, f"uploads/{file.name}")
    tmp_db.unlink(missing_ok=True); size = path.stat().st_size
    con.execute("INSERT INTO backups(id,filename,path,size,created_at,created_by) VALUES(?,?,?,?,?,?)", (backup_id, filename, str(path), size, utc_now(), created_by))
    return {"id": backup_id, "filename": filename, "size": size, "createdAt": utc_now()}

OrbitHandler.create_backup_file = _create_backup_file_v42


def _api_save_state_v42(self: "OrbitHandler") -> None:
    actor = self.require_auth("state:write")
    if not actor: return
    if not is_admin(actor): return self.send_json({"ok": False, "error": "admin_only", "message": "الاستبدال الكامل لحالة النظام مخصص لمسؤول النظام والاسترجاع فقط"}, 403)
    body = self.read_json(); state = body.get("state") if isinstance(body.get("state"), dict) else body
    if not isinstance(state, dict): return self.send_json({"ok": False, "error": "invalid_state"}, 400)
    with _db_lock, db() as con:
        updated = save_state_to_db(con, state, actor["id"]); audit(con, actor, "استبدال كامل للحالة", "النظام", "عملية إدارية عالية الحساسية", _client_ip(self))
    self.send_json({"ok": True, "updatedAt": updated})

OrbitHandler.api_save_state = _api_save_state_v42


def _handle_api_v42(self: "OrbitHandler", method: str) -> None:
    route, parts, qs = self.route()
    try:
        if route == "/api/change-password" and method == "POST": return _api_change_password(self)
        if route == "/api/sync" and method == "PUT": return _api_sync_v42(self)
        if len(parts) >= 2 and parts[:2] == ["api", "users"]: return _api_users_v42(self, method, parts[2:])
        return OrbitHandler._handle_api_v41(self, method)
    except ValueError as exc:
        msg = str(exc)
        if msg.startswith("validation_failed::"):
            return self.send_json({"ok": False, "error": "validation_failed", "details": json.loads(msg.split("::", 1)[1])}, 422)
        return self.send_json({"ok": False, "error": "bad_request", "message": msg}, 400)
    except Exception as exc:
        return self.send_json({"ok": False, "error": "server_error", "message": str(exc)}, 500)

OrbitHandler._handle_api_v41 = OrbitHandler.handle_api
OrbitHandler.handle_api = _handle_api_v42


# ---- v4.2.0 follow-up fixes for secure sync and payroll workflow ----

def _api_sync_v42(self: "OrbitHandler") -> None:
    actor = self.require_auth()
    if not actor:
        return
    body = self.read_json()
    client_state = body.get("state")
    if not isinstance(client_state, dict):
        return self.send_json({"ok": False, "error": "invalid_state"}, 400)
    client_state = sanitize_state(client_state)
    base_updated = clean_str(body.get("baseUpdatedAt"))
    with _db_lock, db() as con:
        server_state, server_updated = load_state_from_db(con)
        if base_updated and base_updated != server_updated:
            return self.send_json({"ok": False, "error": "sync_conflict", "message": "تم تعديل البيانات من مستخدم آخر؛ تم إيقاف الحفظ لمنع فقد البيانات", "updatedAt": server_updated, "state": visible_state_for_actor(server_state, actor)}, 409)
        changed: List[str] = []
        if client_state.get("settings") != server_state.get("settings") and is_admin(actor):
            server_state["settings"] = as_dict(client_state.get("settings"))
            changed.append("settings")
        effective_rules = dict(SYNC_COLLECTIONS)
        effective_rules["attendance"] = {"perm": "attendance:write", "owner": "employeeId"}
        for key, rule in effective_rules.items():
            old_map = _record_map(server_state.get(key))
            new_map = _record_map(client_state.get(key))
            operations: List[Tuple[str, str, Optional[Dict[str, Any]], Optional[Dict[str, Any]]]] = []
            for rid in sorted(set(old_map) | set(new_map)):
                old, new = old_map.get(rid), new_map.get(rid)
                if old is None and new is not None: operations.append(("create", rid, None, new))
                elif old is not None and new is None: operations.append(("delete", rid, old, None))
                elif old != new: operations.append(("update", rid, old, new))
            if not operations:
                continue
            for action, rid, old, new in operations:
                if not _employee_can_change_record(actor, rule, old, new, action):
                    return self.send_json({"ok": False, "error": "forbidden_record", "collection": key, "recordId": rid}, 403)
                if new is not None:
                    new = dict(new)
                    if lower(actor["role"]) == "employee":
                        new[rule["owner"]] = actor["employee_id"]
                        new["status"] = "pending" if clean_str(new.get("status")) not in ("rejected", "cancelled") else new.get("status")
                    new["updatedAt"] = utc_now(); new.setdefault("createdAt", utc_now()); new.setdefault("createdBy", actor["id"])
                    if key == "attendance":
                        errors = validate_attendance_save(server_state, new, rid if old else "")
                        if errors:
                            return self.send_json({"ok": False, "error": "validation_failed", "details": errors}, 422)
                        normalize_attendance_record(server_state, new)
                    new_map[rid] = new
                else:
                    new_map.pop(rid, None)
            server_state[key] = list(new_map.values())
            changed.append(key)
            audit(con, actor, "مزامنة سجلات", key, f"{len(operations)} عملية سجل", _client_ip(self))
        if not changed:
            return self.send_json({"ok": True, "updatedAt": server_updated, "state": visible_state_for_actor(server_state, actor), "changed": []})
        updated = save_state_to_db(con, server_state, actor["id"])
        audit(con, actor, "حفظ تغييرات", "النظام", "، ".join(changed), _client_ip(self))
        visible = visible_state_for_actor(server_state, actor)
    return self.send_json({"ok": True, "updatedAt": updated, "state": visible, "changed": changed})


def _api_payroll_v42(self: "OrbitHandler", method: str, tail: List[str], qs: Dict[str, List[str]]) -> None:
    if tail and len(tail) == 2 and tail[1] == "status" and method in ("PUT", "POST"):
        body = self.read_json(); status = clean_str(body.get("status"))
        required = {"reviewed": "payroll:review", "approved": "payroll:approve", "paid": "payroll:pay", "locked": "admin"}.get(status, "payroll:write")
        actor = self.require_auth(required)
        if not actor: return
        if status == "locked" and not is_admin(actor): return self.send_json({"ok": False, "error": "admin_only"}, 403)
        payroll_id = tail[0]
        with _db_lock, db() as con:
            state, _ = load_state_from_db(con); item = next((p for p in as_list(state.get("payroll")) if p.get("id") == payroll_id), None)
            if not item: return self.send_json({"ok": False, "error": "not_found"}, 404)
            transitions = {"draft": {"reviewed"}, "reviewed": {"draft", "approved"}, "approved": {"reviewed", "paid"}, "paid": {"locked"}, "locked": set()}
            old = clean_str(item.get("status") or "draft")
            if status != old and status not in transitions.get(old, set()) and not is_admin(actor):
                return self.send_json({"ok": False, "error": "invalid_transition", "message": f"لا يمكن الانتقال من {old} إلى {status}"}, 422)
            item["status"] = status; item["statusUpdatedAt"] = utc_now(); item["statusUpdatedBy"] = actor["id"]
            if status == "paid": item["paidAt"] = utc_now(); item["paidBy"] = actor["id"]
            updated = save_state_to_db(con, state, actor["id"]); audit(con, actor, "تغيير حالة راتب", "الرواتب", f"{payroll_id}: {old} → {status}", _client_ip(self))
        return self.send_json({"ok": True, "item": item, "updatedAt": updated})
    return OrbitHandler._api_payroll_v41(self, method, tail, qs)

OrbitHandler._api_payroll_v41 = OrbitHandler.api_payroll
OrbitHandler.api_payroll = _api_payroll_v42

# Rebind the top-level API router to the latest sync implementation.
def _handle_api_v42_latest(self: "OrbitHandler", method: str) -> None:
    route, parts, qs = self.route()
    try:
        if route == "/api/change-password" and method == "POST": return _api_change_password(self)
        if route == "/api/sync" and method == "PUT": return _api_sync_v42(self)
        if len(parts) >= 2 and parts[:2] == ["api", "users"]: return _api_users_v42(self, method, parts[2:])
        return OrbitHandler._handle_api_v41(self, method)
    except ValueError as exc:
        msg = str(exc)
        if msg.startswith("validation_failed::"):
            return self.send_json({"ok": False, "error": "validation_failed", "details": json.loads(msg.split("::", 1)[1])}, 422)
        return self.send_json({"ok": False, "error": "bad_request", "message": msg}, 400)
    except Exception as exc:
        return self.send_json({"ok": False, "error": "server_error", "message": str(exc)}, 500)

OrbitHandler.handle_api = _handle_api_v42_latest



# ==========================================================================
# Orbit HR v4.3.0 readiness fixes
# - fixed attendance punch update bug that cleared existing records on checkout
# - made local time helpers backward compatible with older no-arg callers
# - tightened manual attendance scope and added server-side checkout validation
# - added deployment packaging guidance marker in /api/health
# ==========================================================================
APP_VERSION = "4.8.0-expenses-by-branch"

# Backward compatible local time helpers. Some v4.1 paths call local_now() with
# no state, while v4.2 attendance normalization calls local_now(state).
def local_now(state: Optional[Dict[str, Any]] = None) -> _dt.datetime:  # type: ignore[override]
    try:
        tz = company_timezone(state or {})
    except Exception:
        tz = ZoneInfo(os.environ.get("ORBIT_HR_TIMEZONE", "Africa/Cairo"))
    return _dt.datetime.now(tz).replace(microsecond=0)


def local_now_iso() -> str:  # type: ignore[override]
    return local_now().isoformat()


def server_today() -> _dt.date:  # type: ignore[override]
    return local_now().date()


def _punch_type(raw: Any) -> str:
    value = lower(raw).replace("_", "").replace("-", "")
    return "checkOut" if value in ("checkout", "out", "خروج", "انصراف") else "checkIn"


def _api_attendance_v43(self: "OrbitHandler", method: str, tail: List[str], qs: Dict[str, List[str]]) -> None:
    if method == "POST" and tail == ["punch"]:
        actor = self.require_auth("attendance:punch")
        if not actor:
            return
        body = self.read_json()
        requested_emp = clean_str(body.get("employeeId"))
        actor_emp = clean_str(actor["employee_id"])
        emp_id = requested_emp or actor_emp
        if not emp_id:
            return self.send_json({"ok": False, "error": "employee_not_linked", "message": "الحساب غير مربوط بملف موظف"}, 422)
        if requested_emp and requested_emp != actor_emp and not has_permission(actor, "attendance:write"):
            return self.send_json({"ok": False, "error": "forbidden_employee_scope", "message": "لا يمكنك تسجيل حضور موظف آخر"}, 403)
        punch_type = _punch_type(body.get("type"))
        with _db_lock, db() as con:
            state, _ = load_state_from_db(con)
            employee = emp_by_id(state, emp_id)
            if not employee or clean_str(employee.get("status") or "active") != "active":
                return self.send_json({"ok": False, "error": "employee_not_found", "message": "الموظف غير موجود أو غير نشط"}, 404)
            now_local = local_now(state)
            d = now_local.date()
            existing = next((a for a in as_list(state.get("attendance")) if isinstance(a, dict) and a.get("employeeId") == emp_id and clean_str(a.get("date"))[:10] == d.isoformat()), None)
            rec = dict(existing) if isinstance(existing, dict) else {"id": make_id("a"), "employeeId": emp_id, "date": d.isoformat(), "status": "present", "source": "mobile", "createdAt": utc_now()}
            rec["employeeId"] = emp_id
            rec["date"] = d.isoformat()
            rec["source"] = rec.get("source") or "mobile"
            if punch_type == "checkIn":
                if rec.get("checkIn"):
                    return self.send_json({"ok": False, "error": "already_checked_in", "message": "تم تسجيل الحضور من قبل لهذا اليوم"}, 422)
                rec["checkIn"] = now_local.isoformat()
                rec["location"] = clean_str(body.get("location") or "Mobile GPS")
            else:
                if not rec.get("checkIn"):
                    return self.send_json({"ok": False, "error": "check_in_required", "message": "يجب تسجيل الحضور أولًا"}, 422)
                if rec.get("checkOut"):
                    return self.send_json({"ok": False, "error": "already_checked_out", "message": "تم تسجيل الانصراف من قبل لهذا اليوم"}, 422)
                rec["checkOut"] = now_local.isoformat()
                rec["checkOutLocation"] = clean_str(body.get("location") or "Mobile GPS")
            camera_upload = _save_camera_evidence(con, actor, clean_str(body.get("cameraImage")), emp_id, punch_type)
            if camera_upload:
                rec[f"{punch_type}CameraUploadId"] = camera_upload
                rec["faceEvidenceCaptured"] = True
            rec["faceVerified"] = False
            rec["faceVerificationMode"] = "evidence_only"
            try:
                lat = None if body.get("lat") in (None, "") else to_float(body.get("lat"), None)
                lng = None if body.get("lng") in (None, "") else to_float(body.get("lng"), None)
                acc = None if body.get("accuracy") in (None, "") else to_float(body.get("accuracy"), None)
                mocked = bool(body.get("mocked") or body.get("isMock") or body.get("mockLocation"))
            except Exception:
                return self.send_json({"ok": False, "error": "invalid_location"}, 422)
            allowed, message = apply_geofence(state, rec, lat, lng, punch_type=punch_type, accuracy=acc, mocked=mocked)
            if not allowed:
                return self.send_json({"ok": False, "error": "verification_failed", "message": message}, 422)
            settings = as_dict(state.get("settings"))
            require_face = bool(settings.get("requireFace")) or clean_str(settings.get("verificationMode")) in ("camera", "gps_camera")
            if require_face and not camera_upload:
                return self.send_json({"ok": False, "error": "camera_evidence_required", "message": "لقطة الكاميرا مطلوبة"}, 422)
            if require_face or camera_upload:
                # Evidence-only: real biometric face matching is deliberately not claimed.
                rec["verificationStatus"] = rec.get("verificationStatus") or "needs_review"
                rec["verificationNote"] = rec.get("verificationNote") or "تم حفظ لقطة إثبات؛ المطابقة البيومترية غير مفعلة"
            try:
                normalize_attendance_record(state, rec)
            except ValueError as exc:
                return self.send_json({"ok": False, "error": "invalid_attendance_time", "message": str(exc)}, 422)
            if existing is not None:
                idx = as_list(state.get("attendance")).index(existing)
                state["attendance"][idx] = rec
            else:
                state.setdefault("attendance", []).append(rec)
            updated = save_state_to_db(con, state, actor["id"])
            audit(con, actor, "تسجيل دخول" if punch_type == "checkIn" else "تسجيل خروج", "الحضور", f"{emp_id} — {d.isoformat()}", _client_ip(self))
        return self.send_json({"ok": True, "item": rec, "updatedAt": updated})
    return OrbitHandler._api_attendance_v42(self, method, tail, qs)


# Chain after the v4.2 attendance override so fallback keeps the previous APIs.
OrbitHandler._api_attendance_v42 = OrbitHandler.api_attendance
OrbitHandler.api_attendance = _api_attendance_v43


def _api_health_v43(self: "OrbitHandler") -> None:
    with _db_lock, db() as con:
        state, updated_at = load_state_from_db(con)
        counts = {k: len(as_list(state.get(k))) for k in ["employees", "users", "attendance", "payroll", "leaves", "missions", "documents"]}
        counts.update({
            "structuredEmployees": con.execute("SELECT COUNT(*) c FROM hr_employees").fetchone()["c"],
            "structuredAttendance": con.execute("SELECT COUNT(*) c FROM hr_attendance").fetchone()["c"],
            "structuredPayroll": con.execute("SELECT COUNT(*) c FROM hr_payroll").fetchone()["c"],
        })
    self.send_json({"ok": True, "version": APP_VERSION, "database": str(DB_PATH.name), "updatedAt": updated_at, "counts": counts, "timezone": str(company_timezone(state)), "serverTime": local_now_iso(), "productionReadyPatch": True})

OrbitHandler.api_health = _api_health_v43



# ==========================================================================
# Orbit HR v4.4.0 production-candidate workflow APIs
# - generic record APIs for the remaining HR modules instead of full-state saves
# - conflict-safe front-end sync support
# - leave-balance and management-summary APIs
# - broader role permissions for the built-in module set
# ==========================================================================
APP_VERSION = "4.8.0-expenses-by-branch"

# Extend built-in roles to match all modules available in the UI. Admin remains full access via is_admin().
ROLE_PERMISSIONS.setdefault("manager", set()).update({
    "users:read", "reports:read", "settings:write", "notifications:write",
    "decisions:read", "decisions:write", "meetings:read", "meetings:write",
    "announcements:read", "announcements:write", "tasks:read", "tasks:write",
    "permissions:read", "permissions:write", "shiftRequests:read", "shiftRequests:write",
    "biometricDevices:read", "biometricDevices:write", "workInterruptions:read", "workInterruptions:write",
    "evaluations:read", "evaluations:write", "recruitment:read", "recruitment:write",
    "terminations:read", "terminations:write", "advances:read", "advances:write",
    "dues:read", "dues:write", "complaints:read", "complaints:write", "letters:read", "letters:write",
})
ROLE_PERMISSIONS.setdefault("hr", set()).update({
    "settings:read", "reports:read", "holidays:read", "holidays:write", "permissions:read", "permissions:write",
    "shiftRequests:read", "shiftRequests:write", "biometricDevices:read", "biometricDevices:write",
    "workInterruptions:read", "workInterruptions:write", "evaluations:read", "evaluations:write",
    "recruitment:read", "recruitment:write", "terminations:read", "terminations:write",
    "tasks:read", "tasks:write", "complaints:read", "complaints:write", "letters:read", "letters:write",
    "announcements:read", "announcements:write", "advances:read", "dues:read", "adjustments:read", "adjustments:write",
})
ROLE_PERMISSIONS.setdefault("finance", set()).update({"reports:read", "documents:read", "expenses:read", "expenses:write"})

COLLECTION_API_RULES: Dict[str, Dict[str, Any]] = dict(SYNC_COLLECTIONS)
COLLECTION_API_RULES.update({
    "attendance": {"perm": "attendance:write", "read_perm": "attendance:read", "owner": "employeeId"},
    "leaves": {"perm": "leaves:write", "read_perm": "leaves:read", "approve_perm": "leaves:approve", "delete_perm": "leaves:delete", "owner": "employeeId", "employee_create": True},
    "missions": {"perm": "missions:write", "read_perm": "missions:read", "approve_perm": "missions:approve", "delete_perm": "missions:delete", "owner": "employeeId", "employee_create": True},
})

STATUS_PERMISSIONS = {
    "expenses": "expenses:write", "adjustments": "adjustments:write", "custodies": "custodies:write",
    "documents": "documents:write", "advances": "advances:write", "dues": "dues:write",
    "tasks": "tasks:write", "complaints": "complaints:write", "letters": "letters:write",
    "shiftRequests": "shiftRequests:write", "workInterruptions": "workInterruptions:write",
    "evaluations": "evaluations:write", "recruitment": "recruitment:write",
    "terminations": "terminations:write", "announcements": "announcements:write",
    "decisions": "decisions:write", "meetings": "meetings:write", "biometricDevices": "biometricDevices:write",
    "leaves": "leaves:approve", "missions": "missions:approve",
}

ALLOWED_COLLECTION_KEYS = set(COLLECTION_API_RULES)
SAFE_STATUSES = {"pending", "reviewed", "approved", "rejected", "cancelled", "active", "inactive", "assigned", "returned", "lost", "damaged", "paid", "completed", "issued", "sent", "published", "draft", "open", "closed", "resolved", "in_progress", "scheduled", "connected", "disconnected", "settled", "hired", "interview", "offer", "onboarding"}


def _collection_visible_items(state: Dict[str, Any], actor: sqlite3.Row, key: str) -> List[Dict[str, Any]]:
    visible = visible_state_for_actor(state, actor)
    return [x for x in as_list(visible.get(key)) if isinstance(x, dict)]


def _record_owner_allowed(actor: sqlite3.Row, rule: Dict[str, Any], record: Optional[Dict[str, Any]]) -> bool:
    if not record or is_admin(actor) or lower(actor["role"]) in ("manager", "hr", "finance"):
        return True
    owner_key = rule.get("owner")
    return bool(owner_key and clean_str(record.get(owner_key)) == clean_str(actor["employee_id"]))


def _collection_can_write(actor: sqlite3.Row, rule: Dict[str, Any], old: Optional[Dict[str, Any]], new: Optional[Dict[str, Any]], action: str) -> bool:
    if has_permission(actor, rule.get("perm", "")) and (lower(actor["role"]) != "employee" or _record_owner_allowed(actor, rule, new or old)):
        if lower(actor["role"]) != "employee":
            return True
    return _employee_can_change_record(actor, rule, old, new, action)


def _prepare_collection_record(actor: sqlite3.Row, key: str, rule: Dict[str, Any], record: Dict[str, Any], old: Optional[Dict[str, Any]], action: str) -> Dict[str, Any]:
    item = sanitize_state({"x": [record]}).get("x", [{}])[0]
    item = dict(item if isinstance(item, dict) else {})
    if action == "create":
        item.setdefault("id", make_id(key[:4] or "rec"))
        item.setdefault("createdAt", utc_now())
        item.setdefault("createdBy", actor["id"])
    else:
        item["id"] = clean_str((old or {}).get("id") or item.get("id"))
    if lower(actor["role"]) == "employee" and rule.get("owner"):
        item[rule["owner"]] = actor["employee_id"]
        if key not in ("documents", "letters", "complaints"):
            item["status"] = "pending" if clean_str(item.get("status")) not in ("rejected", "cancelled") else item.get("status")
    item["updatedAt"] = utc_now()
    return item


def _validate_collection_record(state: Dict[str, Any], key: str, item: Dict[str, Any], current_id: str = "") -> Optional[Tuple[int, Dict[str, Any]]]:
    if key == "attendance":
        errors = validate_attendance_save(state, item, current_id)
        if errors:
            return 422, {"ok": False, "error": "validation_failed", "details": errors}
        normalize_attendance_record(state, item)
    if key in ("leaves", "missions", "permissions", "shiftRequests"):
        emp_id = clean_str(item.get("employeeId"))
        if not emp_id:
            return 422, {"ok": False, "error": "employee_required", "message": "اختيار الموظف مطلوب"}
        if key in ("leaves", "missions"):
            conflict = _request_overlap(state, key, item, current_id)
            if conflict and clean_str(item.get("status")) in ("pending", "reviewed", "approved", ""):
                return 409, {"ok": False, "error": "overlapping_request", "message": "يوجد طلب متداخل لنفس الموظف", "conflictId": conflict.get("id")}
    if key == "expenses" and to_float(item.get("amount")) < 0:
        return 422, {"ok": False, "error": "invalid_amount", "message": "المبلغ لا يمكن أن يكون بالسالب"}
    if key in ("adjustments", "advances", "dues", "custodies") and to_float(item.get("amount") or item.get("value")) < 0:
        return 422, {"ok": False, "error": "invalid_amount", "message": "القيمة لا يمكن أن تكون بالسالب"}
    return None


def _api_collections_v44(self: "OrbitHandler", method: str, key: str, tail: List[str], qs: Dict[str, List[str]]) -> None:
    if key not in ALLOWED_COLLECTION_KEYS:
        return self.send_json({"ok": False, "error": "unknown_collection"}, 404)
    rule = COLLECTION_API_RULES[key]
    read_perm = rule.get("read_perm") or (str(rule.get("perm", "")).split(":", 1)[0] + ":read")
    if method == "GET" and not tail:
        actor = self.require_auth(read_perm)
        if not actor:
            return
        with _db_lock, db() as con:
            state, updated = load_state_from_db(con)
        items = _collection_visible_items(state, actor, key)
        employee_id = clean_str((qs.get("employeeId") or [""])[0])
        status = clean_str((qs.get("status") or [""])[0])
        month = clean_str((qs.get("month") or [""])[0])
        if employee_id:
            if not user_can_access_employee(actor, employee_id):
                return self.send_json({"ok": False, "error": "forbidden_employee_scope"}, 403)
            items = [x for x in items if clean_str(x.get("employeeId")) == employee_id]
        if status:
            items = [x for x in items if clean_str(x.get("status")) == status]
        if month:
            items = [x for x in items if clean_str(x.get("date") or x.get("from") or x.get("createdAt")).startswith(month)]
        return self.send_json({"ok": True, "items": items, "updatedAt": updated})
    if method == "POST" and not tail:
        actor = self.require_auth(rule.get("perm", ""))
        if not actor:
            return
        body = self.read_json()
        with _db_lock, db() as con:
            state, _ = load_state_from_db(con)
            item = _prepare_collection_record(actor, key, rule, body, None, "create")
            if not _collection_can_write(actor, rule, None, item, "create"):
                return self.send_json({"ok": False, "error": "forbidden_record"}, 403)
            invalid = _validate_collection_record(state, key, item)
            if invalid:
                return self.send_json(invalid[1], invalid[0])
            state.setdefault(key, []).append(item)
            updated = save_state_to_db(con, state, actor["id"])
            audit(con, actor, "إضافة سجل", key, clean_str(item.get("id")), _client_ip(self))
        return self.send_json({"ok": True, "item": item, "updatedAt": updated}, 201)
    if tail:
        rec_id = tail[0]
        if len(tail) == 2 and tail[1] == "status" and method in ("POST", "PUT"):
            status_perm = STATUS_PERMISSIONS.get(key) or rule.get("perm", "")
            actor = self.require_auth(status_perm)
            if not actor:
                return
            body = self.read_json(); status = clean_str(body.get("status"))
            if not status or status not in SAFE_STATUSES:
                return self.send_json({"ok": False, "error": "invalid_status"}, 422)
            with _db_lock, db() as con:
                state, _ = load_state_from_db(con)
                items = as_list(state.get(key))
                item = next((x for x in items if isinstance(x, dict) and clean_str(x.get("id")) == rec_id), None)
                if not item:
                    return self.send_json({"ok": False, "error": "not_found"}, 404)
                if clean_str(item.get(rule.get("owner", ""))) == clean_str(actor["employee_id"]) and lower(actor["role"]) == "employee":
                    return self.send_json({"ok": False, "error": "self_approval_forbidden", "message": "لا يمكن اعتماد السجل الشخصي من نفس المستخدم"}, 422)
                old = clean_str(item.get("status"))
                item["status"] = status
                item["statusNote"] = clean_str(body.get("note"))
                item["statusUpdatedAt"] = utc_now(); item["statusUpdatedBy"] = actor["id"]; item["updatedAt"] = utc_now()
                updated = save_state_to_db(con, state, actor["id"])
                audit(con, actor, "تغيير حالة سجل", key, f"{rec_id}: {old} → {status}", _client_ip(self))
            return self.send_json({"ok": True, "item": item, "updatedAt": updated})
        if method == "PUT":
            actor = self.require_auth(rule.get("perm", ""))
            if not actor:
                return
            body = self.read_json()
            with _db_lock, db() as con:
                state, _ = load_state_from_db(con)
                items = as_list(state.get(key))
                old = next((x for x in items if isinstance(x, dict) and clean_str(x.get("id")) == rec_id), None)
                if not old:
                    return self.send_json({"ok": False, "error": "not_found"}, 404)
                merged = dict(old); merged.update(body); merged["id"] = rec_id
                item = _prepare_collection_record(actor, key, rule, merged, old, "update")
                if not _collection_can_write(actor, rule, old, item, "update"):
                    return self.send_json({"ok": False, "error": "forbidden_record"}, 403)
                invalid = _validate_collection_record(state, key, item, rec_id)
                if invalid:
                    return self.send_json(invalid[1], invalid[0])
                items[items.index(old)] = item
                state[key] = items
                updated = save_state_to_db(con, state, actor["id"])
                audit(con, actor, "تعديل سجل", key, rec_id, _client_ip(self))
            return self.send_json({"ok": True, "item": item, "updatedAt": updated})
        if method == "DELETE":
            actor = self.require_auth(rule.get("delete_perm") or rule.get("perm", ""))
            if not actor:
                return
            with _db_lock, db() as con:
                state, _ = load_state_from_db(con)
                items = as_list(state.get(key))
                old = next((x for x in items if isinstance(x, dict) and clean_str(x.get("id")) == rec_id), None)
                if not old:
                    return self.send_json({"ok": False, "error": "not_found"}, 404)
                if not _collection_can_write(actor, rule, old, None, "delete"):
                    return self.send_json({"ok": False, "error": "forbidden_record"}, 403)
                state[key] = [x for x in items if not (isinstance(x, dict) and clean_str(x.get("id")) == rec_id)]
                updated = save_state_to_db(con, state, actor["id"])
                audit(con, actor, "حذف سجل", key, rec_id, _client_ip(self))
            return self.send_json({"ok": True, "updatedAt": updated})
    return self.send_json({"ok": False, "error": "not_found"}, 404)


def _leave_balance_items(state: Dict[str, Any], actor: sqlite3.Row, employee_id: str = "") -> List[Dict[str, Any]]:
    employees = as_list(visible_state_for_actor(state, actor).get("employees"))
    if employee_id:
        employees = [e for e in employees if clean_str(e.get("id")) == employee_id]
    balances: List[Dict[str, Any]] = []
    leave_types = as_list(as_dict(state.get("settings")).get("leaveTypes"))
    current_year = server_today().year
    for e in employees:
        for t in leave_types:
            annual = to_float(t.get("annualDays"))
            if annual <= 0:
                continue
            used = 0.0
            for lv in as_list(state.get("leaves")):
                if lv.get("employeeId") == e.get("id") and clean_str(lv.get("status")) == "approved" and (lv.get("leaveTypeId") == t.get("id") or lv.get("type") == t.get("name")):
                    d = parse_date(lv.get("from"))
                    if d and d.year == current_year:
                        used += to_float(lv.get("days"), 0)
            balances.append({"employeeId": e.get("id"), "employeeName": e.get("name"), "leaveTypeId": t.get("id"), "leaveType": t.get("name"), "year": current_year, "annualDays": annual, "usedDays": used, "remainingDays": max(0, annual - used)})
    return balances


def _api_leave_balance_v44(self: "OrbitHandler", qs: Dict[str, List[str]]) -> None:
    actor = self.require_auth("leaves:read")
    if not actor:
        return
    employee_id = clean_str((qs.get("employeeId") or [""])[0])
    if employee_id and not user_can_access_employee(actor, employee_id):
        return self.send_json({"ok": False, "error": "forbidden_employee_scope"}, 403)
    with _db_lock, db() as con:
        state, updated = load_state_from_db(con)
    return self.send_json({"ok": True, "items": _leave_balance_items(state, actor, employee_id), "updatedAt": updated})


def _group_sum(rows: List[Dict[str, Any]], key: str, amount_key: str) -> Dict[str, float]:
    out: Dict[str, float] = {}
    for r in rows:
        k = clean_str(r.get(key)) or "غير محدد"
        out[k] = round(out.get(k, 0.0) + to_float(r.get(amount_key)), 2)
    return out


def _api_reports_summary_v44(self: "OrbitHandler", qs: Dict[str, List[str]]) -> None:
    actor = self.require_auth("reports:read")
    if not actor:
        return
    month = clean_str((qs.get("month") or [server_today().isoformat()[:7]])[0])
    with _db_lock, db() as con:
        state, updated = load_state_from_db(con)
    visible = visible_state_for_actor(state, actor)
    employees = as_list(visible.get("employees"))
    attendance = [a for a in as_list(visible.get("attendance")) if clean_str(a.get("date")).startswith(month)]
    payroll = [p for p in as_list(visible.get("payroll")) if clean_str(p.get("month")) == month]
    expenses_all = [x for x in as_list(visible.get("expenses")) if clean_str(x.get("date")).startswith(month)]
    expenses = [x for x in expenses_all if clean_str(x.get("status")) in ("approved", "paid", "")]
    expense_by_branch_status: Dict[str, Dict[str, float]] = {}
    for x in expenses_all:
        b = clean_str(x.get("branch")) or "غير محدد"
        st = clean_str(x.get("status")) or "approved"
        if b not in expense_by_branch_status:
            expense_by_branch_status[b] = {"total": 0.0, "approved": 0.0, "pending": 0.0, "rejected": 0.0, "count": 0.0}
        amount = to_float(x.get("amount"))
        expense_by_branch_status[b]["total"] = round(expense_by_branch_status[b]["total"] + amount, 2)
        expense_by_branch_status[b]["count"] = round(expense_by_branch_status[b]["count"] + 1, 2)
        if st in ("approved", "paid", ""):
            expense_by_branch_status[b]["approved"] = round(expense_by_branch_status[b]["approved"] + amount, 2)
        elif st == "pending":
            expense_by_branch_status[b]["pending"] = round(expense_by_branch_status[b]["pending"] + amount, 2)
        elif st == "rejected":
            expense_by_branch_status[b]["rejected"] = round(expense_by_branch_status[b]["rejected"] + amount, 2)
    branch_map = {e.get("id"): clean_str(e.get("branch")) for e in employees}
    dept_map = {e.get("id"): clean_str(e.get("department")) for e in employees}
    payroll_by_branch: Dict[str, float] = {}
    payroll_by_department: Dict[str, float] = {}
    for p in payroll:
        emp_id = clean_str(p.get("employeeId"))
        b = clean_str(p.get("branch") or branch_map.get(emp_id)) or "غير محدد"
        d = clean_str(dept_map.get(emp_id)) or "غير محدد"
        payroll_by_branch[b] = round(payroll_by_branch.get(b, 0.0) + to_float(p.get("net")), 2)
        payroll_by_department[d] = round(payroll_by_department.get(d, 0.0) + to_float(p.get("net")), 2)
    payload = {
        "ok": True,
        "month": month,
        "updatedAt": updated,
        "counts": {"employees": len(employees), "attendance": len(attendance), "payroll": len(payroll), "expenses": len(expenses), "leavesPending": len([l for l in as_list(visible.get("leaves")) if clean_str(l.get("status")) == "pending"])},
        "attendance": {"lateMinutes": sum(to_int(a.get("lateMinutes")) for a in attendance), "overtimeMinutes": sum(to_int(a.get("overtimeMinutes")) for a in attendance), "absentDays": len([a for a in attendance if clean_str(a.get("status")) == "absent"])},
        "payroll": {"gross": round(sum(to_float(p.get("gross") or p.get("totalEarnings")) for p in payroll), 2), "deductions": round(sum(to_float(p.get("totalDeductions") or p.get("deductions")) for p in payroll), 2), "net": round(sum(to_float(p.get("net")) for p in payroll), 2), "byBranch": payroll_by_branch, "byDepartment": payroll_by_department},
        "expenses": {"total": round(sum(to_float(x.get("amount")) for x in expenses_all), 2), "approved": round(sum(to_float(x.get("amount")) for x in expenses), 2), "pending": round(sum(to_float(x.get("amount")) for x in expenses_all if clean_str(x.get("status")) == "pending"), 2), "rejected": round(sum(to_float(x.get("amount")) for x in expenses_all if clean_str(x.get("status")) == "rejected"), 2), "byBranch": _group_sum(expenses_all, "branch", "amount"), "byBranchApproved": _group_sum(expenses, "branch", "amount"), "byBranchStatus": expense_by_branch_status, "byCategory": _group_sum(expenses_all, "category", "amount")},
    }
    return self.send_json(payload)


def _api_settings_v44(self: "OrbitHandler", method: str) -> None:
    if method == "GET":
        actor = self.require_auth("settings:read") or self.require_auth()
        if not actor:
            return
        with _db_lock, db() as con:
            state, updated = load_state_from_db(con)
        return self.send_json({"ok": True, "settings": as_dict(visible_state_for_actor(state, actor).get("settings")), "updatedAt": updated})
    if method == "PUT":
        actor = self.require_auth("settings:write")
        if not actor:
            return
        if not is_admin(actor) and lower(actor["role"]) not in ("manager", "hr"):
            return self.send_json({"ok": False, "error": "forbidden"}, 403)
        body = self.read_json()
        patch = as_dict(body.get("settings") if isinstance(body.get("settings"), dict) else body)
        protected = {"users", "employees", "payroll", "attendance"}
        for k in list(patch):
            if k in protected:
                patch.pop(k, None)
        with _db_lock, db() as con:
            state, _ = load_state_from_db(con)
            settings = as_dict(state.setdefault("settings", {}))
            settings.update(patch)
            state["settings"] = settings
            updated = save_state_to_db(con, state, actor["id"])
            audit(con, actor, "تعديل إعدادات", "الإعدادات", "تحديث جزئي", _client_ip(self))
        return self.send_json({"ok": True, "settings": settings, "updatedAt": updated})
    return self.send_json({"ok": False, "error": "not_found"}, 404)


_original_handle_api_v44_base = OrbitHandler.handle_api

def _handle_api_v44(self: "OrbitHandler", method: str) -> None:
    route, parts, qs = self.route()
    try:
        if len(parts) >= 3 and parts[:2] == ["api", "collections"]:
            return _api_collections_v44(self, method, parts[2], parts[3:], qs)
        if len(parts) >= 2 and parts[:2] == ["api", "records"]:
            # Friendly alias used by some mobile wrappers.
            if len(parts) < 3:
                return self.send_json({"ok": False, "error": "collection_required"}, 400)
            return _api_collections_v44(self, method, parts[2], parts[3:], qs)
        if route == "/api/leaves/balance" and method == "GET":
            return _api_leave_balance_v44(self, qs)
        if route == "/api/reports/summary" and method == "GET":
            return _api_reports_summary_v44(self, qs)
        if route == "/api/settings" and method in ("GET", "PUT"):
            return _api_settings_v44(self, method)
        return _original_handle_api_v44_base(self, method)
    except ValueError as exc:
        msg = str(exc)
        if msg.startswith("validation_failed::"):
            return self.send_json({"ok": False, "error": "validation_failed", "details": json.loads(msg.split("::", 1)[1])}, 422)
        return self.send_json({"ok": False, "error": "bad_request", "message": msg}, 400)
    except Exception as exc:
        return self.send_json({"ok": False, "error": "server_error", "message": str(exc)}, 500)

OrbitHandler.handle_api = _handle_api_v44


def _api_health_v44(self: "OrbitHandler") -> None:
    with _db_lock, db() as con:
        state, updated_at = load_state_from_db(con)
        keys = ["employees", "users", "attendance", "payroll", "leaves", "missions", "expenses", "adjustments", "custodies", "advances", "dues", "documents"]
        counts = {k: len(as_list(state.get(k))) for k in keys}
        counts.update({
            "structuredEmployees": con.execute("SELECT COUNT(*) c FROM hr_employees").fetchone()["c"],
            "structuredAttendance": con.execute("SELECT COUNT(*) c FROM hr_attendance").fetchone()["c"],
            "structuredPayroll": con.execute("SELECT COUNT(*) c FROM hr_payroll").fetchone()["c"],
        })
        schema = con.execute("SELECT value FROM system_meta WHERE key='schema_version'").fetchone() if con.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='system_meta'").fetchone() else None
    self.send_json({"ok": True, "version": APP_VERSION, "database": str(DB_PATH.name), "updatedAt": updated_at, "counts": counts, "timezone": str(company_timezone(state)), "serverTime": local_now_iso(), "schemaVersion": schema["value"] if schema else "4.4.0", "productionCandidate": True, "apis": {"collections": sorted(ALLOWED_COLLECTION_KEYS), "leaveBalance": True, "reportsSummary": True}})

OrbitHandler.api_health = _api_health_v44

# Re-wrap init_db once more to mark schema version 4.4.0 and clean demo plaintext leftovers.
_init_db_before_v44 = init_db

def init_db() -> None:  # type: ignore[override]
    _init_db_before_v44()
    with _db_lock, db() as con:
        con.execute("CREATE TABLE IF NOT EXISTS system_meta(key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL)")
        con.execute("INSERT OR REPLACE INTO system_meta(key,value,updated_at) VALUES('schema_version','4.4.0',?)", (utc_now(),))
        state, _ = load_state_from_db(con)
        clean = sanitize_state(state)
        if clean != state:
            con.execute("UPDATE app_state SET data=?, updated_at=?, updated_by=? WHERE id=1", (json_dumps(clean), utc_now(), "security_v44"))



# ---- v4.4.1 sync-scope safety patch ----
def _actor_may_sync_collection(actor: sqlite3.Row, rule: Dict[str, Any]) -> bool:
    if is_admin(actor):
        return True
    role = lower(actor["role"])
    if has_permission(actor, rule.get("perm", "")):
        return True
    return bool(role == "employee" and rule.get("employee_create") and rule.get("owner") and has_permission(actor, rule.get("perm", "")))


def _owned_records_for_sync(actor: sqlite3.Row, rule: Dict[str, Any], records: Any) -> List[Dict[str, Any]]:
    items = [x for x in as_list(records) if isinstance(x, dict)]
    if is_admin(actor) or lower(actor["role"]) in ("manager", "hr", "finance"):
        return items
    owner = rule.get("owner")
    if not owner:
        return []
    return [x for x in items if clean_str(x.get(owner)) == clean_str(actor["employee_id"])]


def _api_sync_v44(self: "OrbitHandler") -> None:
    actor = self.require_auth()
    if not actor:
        return
    body = self.read_json()
    client_state = body.get("state")
    if not isinstance(client_state, dict):
        return self.send_json({"ok": False, "error": "invalid_state"}, 400)
    client_state = sanitize_state(client_state)
    base_updated = clean_str(body.get("baseUpdatedAt"))
    dirty_keys = set(as_list(body.get("dirtyKeys")))
    with _db_lock, db() as con:
        server_state, server_updated = load_state_from_db(con)
        if base_updated and base_updated != server_updated:
            return self.send_json({"ok": False, "error": "sync_conflict", "message": "تم تعديل البيانات من مستخدم آخر؛ تم إيقاف الحفظ لمنع فقد البيانات", "updatedAt": server_updated, "state": visible_state_for_actor(server_state, actor)}, 409)
        changed: List[str] = []
        if "settings" in client_state and client_state.get("settings") != server_state.get("settings"):
            if has_permission(actor, "settings:write") or is_admin(actor):
                server_state["settings"] = as_dict(client_state.get("settings"))
                changed.append("settings")
        effective_rules = dict(COLLECTION_API_RULES)
        for key, rule in effective_rules.items():
            # Do not interpret missing/hidden collections as deletes. This is critical for employee-scoped state.
            if key not in client_state:
                continue
            if dirty_keys and key not in dirty_keys:
                continue
            if not _actor_may_sync_collection(actor, rule):
                continue
            old_scope = _owned_records_for_sync(actor, rule, server_state.get(key))
            new_scope = _owned_records_for_sync(actor, rule, client_state.get(key))
            old_map = _record_map(old_scope)
            new_map = _record_map(new_scope)
            operations: List[Tuple[str, str, Optional[Dict[str, Any]], Optional[Dict[str, Any]]]] = []
            for rid in sorted(set(old_map) | set(new_map)):
                old, new = old_map.get(rid), new_map.get(rid)
                if old is None and new is not None:
                    operations.append(("create", rid, None, new))
                elif old is not None and new is None:
                    operations.append(("delete", rid, old, None))
                elif old != new:
                    operations.append(("update", rid, old, new))
            if not operations:
                continue
            full_items = [x for x in as_list(server_state.get(key)) if isinstance(x, dict)]
            full_map = _record_map(full_items)
            for action, rid, old, new in operations:
                if not _collection_can_write(actor, rule, old, new, action):
                    return self.send_json({"ok": False, "error": "forbidden_record", "collection": key, "recordId": rid}, 403)
                if new is not None:
                    item = _prepare_collection_record(actor, key, rule, new, old, action)
                    invalid = _validate_collection_record(server_state, key, item, rid if old else "")
                    if invalid:
                        return self.send_json(invalid[1], invalid[0])
                    full_map[clean_str(item.get("id"))] = item
                else:
                    full_map.pop(rid, None)
            server_state[key] = list(full_map.values())
            changed.append(key)
            audit(con, actor, "مزامنة سجلات", key, f"{len(operations)} عملية سجل", _client_ip(self))
        if not changed:
            return self.send_json({"ok": True, "updatedAt": server_updated, "state": visible_state_for_actor(server_state, actor), "changed": []})
        updated = save_state_to_db(con, server_state, actor["id"])
        audit(con, actor, "حفظ تغييرات", "النظام", "، ".join(changed), _client_ip(self))
        visible = visible_state_for_actor(server_state, actor)
    return self.send_json({"ok": True, "updatedAt": updated, "state": visible, "changed": changed})

# Patch the v4.4 router to use the scoped sync implementation.
_prev_handle_api_v441 = OrbitHandler.handle_api

def _handle_api_v441(self: "OrbitHandler", method: str) -> None:
    route, parts, qs = self.route()
    if route == "/api/sync" and method == "PUT":
        try:
            return _api_sync_v44(self)
        except ValueError as exc:
            msg = str(exc)
            if msg.startswith("validation_failed::"):
                return self.send_json({"ok": False, "error": "validation_failed", "details": json.loads(msg.split("::", 1)[1])}, 422)
            return self.send_json({"ok": False, "error": "bad_request", "message": msg}, 400)
        except Exception as exc:
            return self.send_json({"ok": False, "error": "server_error", "message": str(exc)}, 500)
    return _prev_handle_api_v441(self, method)

OrbitHandler.handle_api = _handle_api_v441
APP_VERSION = "4.8.0-expenses-by-branch"


# ==========================================================================
# Orbit HR v4.6.0 final production hardening layer
# - Auto-load .env for non-systemd starts.
# - Use secure bootstrap passwords from .env, never plaintext in app_state.
# - Tighten filesystem permissions on Linux hosts.
# - Hide detailed /api/health data unless authenticated as admin/manager/hr/finance.
# ==========================================================================
APP_VERSION = "4.8.0-expenses-by-branch"


def _orbit_load_env_file(path: Path) -> None:
    try:
        if not path.exists():
            return
        for raw in path.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value
    except Exception as exc:
        print(f"Warning: could not load .env file {path}: {exc}")


_orbit_load_env_file(ROOT / ".env")

HOST = os.environ.get("ORBIT_HR_HOST", HOST)
PORT = int(os.environ.get("PORT", os.environ.get("ORBIT_HR_PORT", str(PORT))))
PUBLIC_ORIGIN = os.environ.get("ORBIT_HR_PUBLIC_ORIGIN", PUBLIC_ORIGIN).rstrip("/")
ALLOWED_ORIGINS = os.environ.get("ORBIT_HR_ALLOWED_ORIGINS", PUBLIC_ORIGIN)
APP_TIMEZONE = os.environ.get("ORBIT_HR_TIMEZONE", APP_TIMEZONE)
try:
    SERVER_TZ = ZoneInfo(APP_TIMEZONE)
except Exception:
    SERVER_TZ = ZoneInfo("Africa/Cairo")
MAX_UPLOAD_BYTES = int(os.environ.get("ORBIT_HR_MAX_UPLOAD_BYTES", str(MAX_UPLOAD_BYTES)))

_DEFAULT_BOOTSTRAP_PASSWORD = os.environ.get("ORBIT_HR_DEFAULT_BOOTSTRAP_PASSWORD", "")
DEFAULT_BOOTSTRAP_PASSWORDS = {
    "admin@hr.local": os.environ.get("ORBIT_HR_BOOTSTRAP_ADMIN_PASSWORD", _DEFAULT_BOOTSTRAP_PASSWORD),
    "manager@hr.local": os.environ.get("ORBIT_HR_BOOTSTRAP_MANAGER_PASSWORD", _DEFAULT_BOOTSTRAP_PASSWORD),
    "employee@hr.local": os.environ.get("ORBIT_HR_BOOTSTRAP_EMPLOYEE_PASSWORD", _DEFAULT_BOOTSTRAP_PASSWORD),
}


def _truthy_env(name: str, default: str = "false") -> bool:
    return os.environ.get(name, default).strip().lower() in {"1", "true", "yes", "on"}


def _chmod_safe(path: Path, mode: int) -> None:
    try:
        if path.exists() and os.name == "posix":
            os.chmod(path, mode)
    except Exception:
        pass


_ensure_dirs_before_v46 = ensure_dirs

def ensure_dirs() -> None:  # type: ignore[override]
    _ensure_dirs_before_v46()
    for path in (DATA_DIR, UPLOAD_DIR, BACKUP_DIR):
        _chmod_safe(path, 0o700)
    _chmod_safe(SECRET_PATH, 0o600)
    _chmod_safe(ROOT / ".env", 0o600)
    _chmod_safe(INITIAL_CREDENTIALS_PATH, 0o600)


_db_before_v46 = db

def db() -> sqlite3.Connection:  # type: ignore[override]
    con = _db_before_v46()
    _chmod_safe(DB_PATH, 0o600)
    _chmod_safe(Path(str(DB_PATH) + "-wal"), 0o600)
    _chmod_safe(Path(str(DB_PATH) + "-shm"), 0o600)
    return con


def sync_users_from_state(con: sqlite3.Connection, state: Dict[str, Any]) -> None:  # type: ignore[override]
    users = as_list(state.get("users"))
    now = utc_now()
    generated: List[str] = []
    force_change = _truthy_env("ORBIT_HR_FORCE_PASSWORD_CHANGE", "false")
    for u in users:
        if not isinstance(u, dict):
            continue
        email = lower(u.get("email"))
        if not email:
            continue
        user_id = clean_str(u.get("id")) or f"u_{hashlib.sha1(email.encode()).hexdigest()[:10]}"
        permissions = u.get("permissions") or u.get("customPermissions") or []
        role = lower(u.get("role") or "employee")
        old = con.execute("SELECT id FROM auth_users WHERE email=?", (email,)).fetchone()
        if old:
            con.execute(
                "UPDATE auth_users SET employee_id=?, name=?, role=?, active=?, permissions=?, updated_at=? WHERE email=?",
                (u.get("employeeId") or "", u.get("name") or email, role, 1 if u.get("active", True) else 0, json_dumps(permissions), now, email),
            )
            continue
        env_key = f"ORBIT_HR_BOOTSTRAP_{role.upper()}_PASSWORD"
        temp_password = os.environ.get(env_key) or os.environ.get("ORBIT_HR_DEFAULT_BOOTSTRAP_PASSWORD") or DEFAULT_BOOTSTRAP_PASSWORDS.get(email, "")
        generated_by_server = False
        if not strong_password(temp_password):
            temp_password = secrets.token_urlsafe(18) + "A7"
            generated_by_server = True
        con.execute(
            "INSERT INTO auth_users(id,employee_id,name,email,password_hash,role,active,permissions,created_at,updated_at,must_change_password) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
            (user_id, u.get("employeeId") or "", u.get("name") or email, email, password_hash(temp_password), role, 1 if u.get("active", True) else 0, json_dumps(permissions), now, now, 1 if force_change else 0),
        )
        label = "Temporary password" if generated_by_server else "Configured bootstrap password"
        generated.append(f"Email: {email}\n{label}: {temp_password}\nMust change password: {force_change}\n")
    _append_initial_credentials(generated)


_init_db_before_v46 = init_db

def init_db() -> None:  # type: ignore[override]
    ensure_dirs()
    _init_db_before_v46()
    ensure_dirs()
    with _db_lock, db() as con:
        con.execute("CREATE TABLE IF NOT EXISTS system_meta(key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL)")
        con.execute("INSERT OR REPLACE INTO system_meta(key,value,updated_at) VALUES('schema_version','4.8.0',?)", (utc_now(),))
        # Enforce the requested configured password on first deploy only when explicitly enabled.
        # Default is disabled to avoid overwriting passwords after users start using the system.
        if _truthy_env("ORBIT_HR_RESET_BOOTSTRAP_PASSWORDS_ON_START", "false"):
            for email, password in DEFAULT_BOOTSTRAP_PASSWORDS.items():
                if strong_password(password):
                    con.execute("UPDATE auth_users SET password_hash=?, must_change_password=?, updated_at=? WHERE email=?", (password_hash(password), 1 if _truthy_env("ORBIT_HR_FORCE_PASSWORD_CHANGE", "false") else 0, utc_now(), email))
            con.execute("DELETE FROM api_sessions")
        state, _ = load_state_from_db(con)
        clean = sanitize_state(state)
        if clean != state:
            con.execute("UPDATE app_state SET data=?, updated_at=?, updated_by=? WHERE id=1", (json_dumps(clean), utc_now(), "security_v46"))
        _chmod_safe(DB_PATH, 0o600)
        _chmod_safe(Path(str(DB_PATH) + "-wal"), 0o600)
        _chmod_safe(Path(str(DB_PATH) + "-shm"), 0o600)


def _api_health_v46(self: "OrbitHandler") -> None:
    actor = current_user(self)
    if not actor:
        return self.send_json({"ok": True, "status": "online", "version": APP_VERSION, "serverTime": local_now_iso()})
    role = lower(actor["role"])
    if not (is_admin(actor) or role in ("manager", "hr", "finance") or has_permission(actor, "quality:read") or has_permission(actor, "reports:read")):
        return self.send_json({"ok": True, "status": "online", "version": APP_VERSION, "serverTime": local_now_iso()})
    with _db_lock, db() as con:
        state, updated_at = load_state_from_db(con)
        keys = ["employees", "users", "attendance", "payroll", "leaves", "missions", "expenses", "adjustments", "custodies", "advances", "dues", "documents"]
        counts = {k: len(as_list(state.get(k))) for k in keys}
        counts.update({
            "structuredEmployees": con.execute("SELECT COUNT(*) c FROM hr_employees").fetchone()["c"],
            "structuredAttendance": con.execute("SELECT COUNT(*) c FROM hr_attendance").fetchone()["c"],
            "structuredPayroll": con.execute("SELECT COUNT(*) c FROM hr_payroll").fetchone()["c"],
        })
        schema = con.execute("SELECT value FROM system_meta WHERE key='schema_version'").fetchone() if con.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='system_meta'").fetchone() else None
    self.send_json({
        "ok": True,
        "status": "online",
        "version": APP_VERSION,
        "updatedAt": updated_at,
        "counts": counts,
        "timezone": APP_TIMEZONE,
        "serverTime": local_now_iso(),
        "schemaVersion": schema["value"] if schema else "4.8.0",
        "productionCandidate": False,
        "productionReady": True,
        "apis": {"collections": sorted(ALLOWED_COLLECTION_KEYS), "leaveBalance": True, "reportsSummary": True},
    })

OrbitHandler.api_health = _api_health_v46


def _end_headers_v46(self: "OrbitHandler") -> None:
    origin = self.headers.get("Origin")
    allowed = {x.strip() for x in str(ALLOWED_ORIGINS or "").split(",") if x.strip()}
    if origin and origin in allowed:
        self.send_header("Access-Control-Allow-Origin", origin)
    elif not origin and PUBLIC_ORIGIN:
        self.send_header("Access-Control-Allow-Origin", PUBLIC_ORIGIN)
    self.send_header("Vary", "Origin")
    self.send_header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
    self.send_header("Access-Control-Allow-Headers", "Content-Type,Authorization")
    self.send_header("X-Content-Type-Options", "nosniff")
    self.send_header("X-Frame-Options", "SAMEORIGIN")
    self.send_header("Referrer-Policy", "no-referrer")
    self.send_header("Permissions-Policy", "camera=(self), geolocation=(self)")
    self.send_header("Content-Security-Policy", "default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'")
    if urllib.parse.urlsplit(self.path).path.startswith("/api/"):
        self.send_header("Cache-Control", "no-store, private")
    elif urllib.parse.urlsplit(self.path).path.endswith("sw.js"):
        self.send_header("Cache-Control", "no-cache")
    SimpleHTTPRequestHandler.end_headers(self)

OrbitHandler.end_headers = _end_headers_v46


def main() -> None:
    ensure_dirs()
    init_db()
    os.chdir(ROOT)
    url = f"http://{HOST}:{PORT}"
    print(f"Orbit HR v{APP_VERSION} Production Backend")
    print(f"Serving PWA and API at: {url}")
    print(f"Public origin: {PUBLIC_ORIGIN or 'not fixed (same-origin/default)'}")
    print(f"SQLite database: {DB_PATH}")
    print("For production deployment: place behind HTTPS reverse proxy and set ORBIT_HR_ALLOWED_ORIGINS.")
    try:
        import webbrowser
        if HOST in ("127.0.0.1", "localhost"):
            webbrowser.open(url)
    except Exception:
        pass
    ThreadingHTTPServer((HOST, PORT), OrbitHandler).serve_forever()


if __name__ == "__main__":
    main()

