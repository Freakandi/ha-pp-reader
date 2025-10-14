#!/usr/bin/env python3
"""Utility to verify the pp_reader security history WebSocket handshake."""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from contextlib import AsyncExitStack
from typing import Any
from urllib.parse import urlsplit, urlunsplit

import aiohttp


class WebSocketProbeError(RuntimeError):
    """Raised when probing the pp_reader WebSocket handshake fails."""

    def __init__(self, reason: str, details: Any | None = None) -> None:
        """Initialise the probe error with optional context details."""
        message = reason if details is None else f"{reason}: {details}"
        super().__init__(message)


def _normalize_websocket_url(raw_url: str) -> str:
    """Return a WebSocket URL for the Home Assistant API endpoint."""
    parsed = urlsplit(raw_url)
    scheme = parsed.scheme or "http"
    if scheme not in {"http", "https", "ws", "wss"}:
        message = f"Unsupported URL scheme: {scheme}"
        raise ValueError(message)

    if scheme == "http":
        ws_scheme = "ws"
    elif scheme == "https":
        ws_scheme = "wss"
    else:
        ws_scheme = scheme

    netloc = parsed.netloc or parsed.path
    path = parsed.path if parsed.netloc else ""
    base = urlunsplit((ws_scheme, netloc, path, "", ""))

    if base.endswith("/api/websocket"):
        return base

    if base.endswith("/"):
        return f"{base}api/websocket"

    return f"{base}/api/websocket"


async def _send_history_request(
    ws_url: str,
    token: str,
    *,
    history_params: dict[str, Any],
    response_timeout: float,
    verify_ssl: bool,
) -> dict[str, Any]:
    """Perform the WebSocket handshake and request security history."""
    connector = aiohttp.TCPConnector(ssl=verify_ssl)
    async with AsyncExitStack() as stack:
        session = await stack.enter_async_context(
            aiohttp.ClientSession(connector=connector)
        )
        websocket = await stack.enter_async_context(
            session.ws_connect(ws_url, heartbeat=30)
        )
        message = await websocket.receive_json(timeout=response_timeout)
        if message.get("type") != "auth_required":
            reason = "Unexpected handshake response"
            raise WebSocketProbeError(reason, message)

        await websocket.send_json({"type": "auth", "access_token": token})
        message = await websocket.receive_json(timeout=response_timeout)
        if message.get("type") != "auth_ok":
            reason = "Authentication failed"
            raise WebSocketProbeError(reason, message)

        request_id = 1
        payload: dict[str, Any] = {
            "id": request_id,
            "type": "pp_reader/get_security_history",
            **history_params,
        }

        await websocket.send_json(payload)

        while True:
            message = await websocket.receive_json(timeout=response_timeout)
            if message.get("type") == "result" and message.get("id") == request_id:
                return message

            if message.get("type") == "event":
                continue

            reason = "Unexpected message"
            raise WebSocketProbeError(reason, message)


def _parse_args() -> argparse.Namespace:
    """Return parsed command line arguments."""
    parser = argparse.ArgumentParser(
        description=(
            "Send a pp_reader/get_security_history WebSocket request to verify the "
            "daily close series handshake."
        )
    )
    parser.add_argument(
        "--url",
        default="http://127.0.0.1:8123",
        help="Base URL of the Home Assistant instance (default: http://127.0.0.1:8123)",
    )
    parser.add_argument(
        "--token",
        required=True,
        help="Home Assistant long-lived access token",
    )
    parser.add_argument(
        "--entry-id",
        required=True,
        help="Config entry ID for the pp_reader instance",
    )
    parser.add_argument(
        "--security-uuid",
        required=True,
        help="Security UUID to request historical prices for",
    )
    parser.add_argument(
        "--start-date",
        type=int,
        default=None,
        help="Optional inclusive start date (YYYYMMDD)",
    )
    parser.add_argument(
        "--end-date",
        type=int,
        default=None,
        help="Optional inclusive end date (YYYYMMDD)",
    )
    parser.add_argument(
        "--timeout",
        dest="response_timeout",
        type=float,
        default=10.0,
        help="Seconds to wait for WebSocket responses (default: 10.0)",
    )
    parser.add_argument(
        "--no-ssl-verify",
        action="store_true",
        help="Disable TLS certificate verification for self-signed setups",
    )
    parser.add_argument(
        "--pretty",
        action="store_true",
        help="Pretty-print the resulting JSON payload",
    )

    return parser.parse_args()


def main() -> None:
    """Entry point for the command line utility."""
    args = _parse_args()
    ws_url = _normalize_websocket_url(args.url)
    history_params: dict[str, Any] = {
        "entry_id": args.entry_id,
        "security_uuid": args.security_uuid,
    }
    if args.start_date is not None:
        history_params["start_date"] = args.start_date
    if args.end_date is not None:
        history_params["end_date"] = args.end_date

    try:
        result = asyncio.run(
            _send_history_request(
                ws_url,
                args.token,
                history_params=history_params,
                response_timeout=args.response_timeout,
                verify_ssl=not args.no_ssl_verify,
            )
        )
    except (TimeoutError, aiohttp.ClientError, WebSocketProbeError, ValueError) as err:
        message = f"WebSocket probe failed: {err}"
        raise SystemExit(message) from err

    payload = result.get("result", result)
    if args.pretty:
        sys.stdout.write(json.dumps(payload, indent=2, sort_keys=True) + "\n")
    else:
        sys.stdout.write(f"{payload}\n")


if __name__ == "__main__":
    main()
