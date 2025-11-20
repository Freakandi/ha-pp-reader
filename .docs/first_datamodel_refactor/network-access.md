# Development Environment Network Access

The Cdex development containers ship with outbound network access, but HTTP
traffic must pass through the platform proxy (`http://proxy:8080`). This means
standard blocking libraries such as `requests` work out-of-the-box because they
respect the `HTTP_PROXY`/`HTTPS_PROXY` variables. Async clients such as
`aiohttp` ignore these environment variables unless `trust_env=True` is passed
when constructing the session. Without that flag, the Home Assistant runtime
fails to reach public APIs and logs `Network is unreachable` errors while
attempting to download weather data, exchange rates, or other integration data.

To verify the setup end-to-end:

1. `curl https://example.com` should succeed, proving the proxy connection is
   available.
2. `python -c "import requests; print(requests.get('https://api.github.com').status_code)"`
   should return `200`, confirming synchronous clients respect the proxy.
3. Running `python - <<'PY'` with an `aiohttp.ClientSession()` without
   `trust_env=True` reproduces `Cannot connect to host ... [Network is
   unreachable]` errors.
4. Starting Home Assistant via `./scripts/develop` shows the Portfolio
   Performance Reader integration logging an initial FX failure if the async
   client ignores the proxy. With the patched `_fetch_exchange_rates`
   implementation—which enables `trust_env=True`, injects Home Assistant's SSL
   context, and clears `VERIFY_X509_STRICT`—the FX fetch finishes successfully.
   You can assert this manually from the virtual environment with
   ``python - <<'PY'`` and calling `_fetch_exchange_rates(...)`.
5. The share-price fetcher (`custom_components.pp_reader.prices.price_service`)
   calls into `yahooquery`, which uses `requests` internally and therefore
   honours the proxy automatically. Launch Home Assistant with
   `./scripts/develop` and wait for a log entry such as
   `prices_cycle symbols=95 batches=10 returned=93 ...`. That line confirms the
   yahooquery client retrieved quotes successfully inside the dev instance. For
   an isolated check, run ``python - <<'PY'`` with `from yahooquery import
   Ticker; print(Ticker('AAPL').price)` while the virtual environment is active.

With these steps you validate both FX and share-price lookups against the proxy
requirements in Cdex.
