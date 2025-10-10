# Development Environment Network Access

The Cdex development containers ship with outbound network access, but HTTP
traffic must pass through the platform proxy (`http://proxy:8080`). This means
standard blocking libraries such as `requests` work out-of-the-box because they
respect the `HTTP_PROXY`/`HTTPS_PROXY` variables. Async clients such as
`aiohttp` ignore these environment variables unless `trust_env=True` is passed
when constructing the session. Without that flag, the Home Assistant runtime
fails to reach public APIs and logs `Network is unreachable` errors while
attempting to download weather data, exchange rates, or other integration data.

To verify the setup:

1. `curl https://example.com` should succeed, proving the proxy connection is
   available.
2. `python -c "import requests; print(requests.get('https://api.github.com').status_code)"`
   should return `200`, confirming synchronous clients respect the proxy.
3. Running `python - <<'PY'` with an `aiohttp.ClientSession()` without
   `trust_env=True` reproduces `Cannot connect to host ... [Network is
   unreachable]` errors.
4. Starting Home Assistant via `./scripts/develop` shows the Portfolio
   Performance Reader integration logging FX fetch failures until the async
   client is configured to trust the proxy.

With `trust_env=True` and the Home Assistant SSL context (which disables the
`VERIFY_X509_STRICT` flag so the platform's MITM certificate validates) in the
`aiohttp` session (see `custom_components/pp_reader/currencies/fx.py`) the
integration uses the proxy and successfully retrieves foreign exchange rates
again.
