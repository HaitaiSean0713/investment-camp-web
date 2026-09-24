"""WSGI entrypoint for hosts with persistent storage (for example PythonAnywhere)."""
from __future__ import annotations

from email.message import Message
from http import HTTPStatus
from io import BytesIO

from server import Handler, init_db

init_db()


class WSGIHandler(Handler):
    def __init__(self, environ):
        self.path = environ.get("PATH_INFO", "/")
        if environ.get("QUERY_STRING"):
            self.path += "?" + environ["QUERY_STRING"]
        self.command = environ.get("REQUEST_METHOD", "GET")
        self.client_address = (environ.get("REMOTE_ADDR", ""), 0)
        self.headers = Message()
        for key, value in environ.items():
            if key.startswith("HTTP_"):
                self.headers[key[5:].replace("_", "-").title()] = str(value)
        if environ.get("CONTENT_TYPE"):
            self.headers["Content-Type"] = str(environ["CONTENT_TYPE"])
        if environ.get("CONTENT_LENGTH"):
            self.headers["Content-Length"] = str(environ["CONTENT_LENGTH"])
        self.rfile = environ["wsgi.input"]
        self.wfile = BytesIO()
        self.status_code = 200
        self.response_headers = []

    def send_response(self, code, message=None):
        self.status_code = code

    def send_header(self, keyword, value):
        self.response_headers.append((keyword, str(value)))

    def end_headers(self):
        pass

    def log_message(self, fmt, *args):
        # The team token may be part of the URL, so avoid request-path logging.
        pass


def application(environ, start_response):
    handler = WSGIHandler(environ)
    handler.handle_request(handler.command)
    start_response(f"{handler.status_code} {HTTPStatus(handler.status_code).phrase}",
                   handler.response_headers)
    return [handler.wfile.getvalue()]
