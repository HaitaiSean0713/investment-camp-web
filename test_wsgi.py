"""Minimal WSGI adapter smoke test."""
import io
import json
import os
import tempfile
import uuid
from pathlib import Path
from wsgiref.util import setup_testing_defaults

test_dir = tempfile.TemporaryDirectory()
os.environ["CAMP_DB"] = str(Path(test_dir.name) / "camp-wsgi.db")
os.environ["CAMP_ADMIN_PASSWORD"] = "TestAdmin!2026"

from wsgi import application


def call(path, method="GET", data=None, cookie=None):
    env = {}
    setup_testing_defaults(env)
    payload = json.dumps(data).encode() if data is not None else b""
    env.update({"REQUEST_METHOD": method, "PATH_INFO": path,
                "CONTENT_TYPE": "application/json", "CONTENT_LENGTH": str(len(payload)),
                "wsgi.input": io.BytesIO(payload), "HTTP_HOST": "example.com"})
    if cookie:
        env["HTTP_COOKIE"] = cookie
    result = {}
    def start(status, headers):
        result["status"], result["headers"] = status, dict(headers)
    result["body"] = b"".join(application(env, start))
    return result


assert call("/api/auth/me")["status"].startswith("200")
login = call("/api/auth/login", "POST", {"password":"TestAdmin!2026"})
assert login["status"].startswith("200")
cookie = login["headers"]["Set-Cookie"].split(";", 1)[0]
assert json.loads(call("/api/admin/activities", cookie=cookie)["body"]) == []
assert call("/")["headers"]["Content-Type"].startswith("text/html")
print("WSGI TEST PASSED")
test_dir.cleanup()
