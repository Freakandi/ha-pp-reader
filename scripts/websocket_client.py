"""Utility to verify the pp_reader security history WebSocket handshake."""

from __future__ import annotations

import argparse
import asyncio
import json
from typing import Any
from urllib.parse import urlsplit, urlunsplit

import aiohttp


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
    entry_id: str,
    security_uuid: str,
    start_date: int | None,
    end_date: int | None,
    timeout: float,
    verify_ssl: bool,
) -> dict[str, Any]:
    """Perform the WebSocket handshake and request security history."""

    connector = aiohttp.TCPConnector(ssl=verify_ssl)
    async with aiohttp.ClientSession(connector=connector) as session:
        async with session.ws_connect(ws_url, heartbeat=30) as websocket:
            message = await websocket.receive_json(timeout=timeout)
            if message.get("type") != "auth_required":
                raise RuntimeError(f"Unexpected handshake response: {message}")

            await websocket.send_json({"type": "auth", "access_token": token})
            message = await websocket.receive_json(timeout=timeout)
            if message.get("type") != "auth_ok":
                raise RuntimeError(f"Authentication failed: {message}")

            request_id = 1
            payload: dict[str, Any] = {
                "id": request_id,
                "type": "pp_reader/get_security_history",
                "entry_id": entry_id,
                "security_uuid": security_uuid,
            }
            if start_date is not None:
                payload["start_date"] = start_date
            if end_date is not None:
                payload["end_date"] = end_date

            await websocket.send_json(payload)

            while True:
                message = await websocket.receive_json(timeout=timeout)
                if message.get("type") == "result" and message.get("id") == request_id:
                    return message

                if message.get("type") == "event":
                    continue

                raise RuntimeError(f"Unexpected message: {message}")


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

    try:
        result = asyncio.run(
            _send_history_request(
                ws_url,
                args.token,
                entry_id=args.entry_id,
                security_uuid=args.security_uuid,
                start_date=args.start_date,
                end_date=args.end_date,
                timeout=args.timeout,
                verify_ssl=not args.no_ssl_verify,
            )
        )
    except (aiohttp.ClientError, asyncio.TimeoutError, RuntimeError, ValueError) as err:
        raise SystemExit(f"WebSocket probe failed: {err}") from err

    payload = result.get("result", result)
    if args.pretty:
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print(payload)


if __name__ == "__main__":
    main()
