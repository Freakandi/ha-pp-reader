import bisect
import time
from datetime import date, timedelta


def current_impl(entries, target_date):
    selected_price = None
    selected_date = None
    selected_raw = None

    for price_date, price_value, raw_date in reversed(entries):
        if price_date <= target_date:
            selected_price = price_value
            selected_date = price_date
            selected_raw = raw_date
            break

    if selected_price is None:
        return None, None, False

    stale = selected_date != target_date
    return selected_price, selected_raw, stale


def optimized_impl(entries, target_date):
    if not entries:
        return None, None, False

    idx = bisect.bisect_right(entries, target_date, key=lambda x: x[0])

    if idx == 0:
        return None, None, False

    selected_date, selected_price, selected_raw = entries[idx - 1]

    stale = selected_date != target_date
    return selected_price, selected_raw, stale


def run_benchmark():
    # Setup data
    start_date = date(2010, 1, 1)
    entries = []
    # 10 years of daily prices ~ 3650 entries
    for i in range(3650):
        d = start_date + timedelta(days=i)
        entries.append((d, float(i), d.isoformat()))

    # Query dates: simulating backdating from year 3 to year 10
    # 7 years * 365 = 2555 queries
    query_dates = []
    query_start = start_date + timedelta(days=1000)
    for i in range(2555):
        query_dates.append(query_start + timedelta(days=i))

    print(f"Data size: {len(entries)} entries")
    print(f"Query count: {len(query_dates)} queries")

    # Warmup
    for d in query_dates[:10]:
        current_impl(entries, d)
        optimized_impl(entries, d)

    # Measure Current
    start_time = time.perf_counter()
    for d in query_dates:
        current_impl(entries, d)
    end_time = time.perf_counter()
    current_duration = end_time - start_time
    print(f"Current implementation: {current_duration:.6f} seconds")

    # Measure Optimized
    start_time = time.perf_counter()
    for d in query_dates:
        optimized_impl(entries, d)
    end_time = time.perf_counter()
    optimized_duration = end_time - start_time
    print(f"Optimized implementation: {optimized_duration:.6f} seconds")

    ratio = current_duration / optimized_duration if optimized_duration > 0 else 0
    print(f"Speedup: {ratio:.2f}x")

    # Verify correctness
    for d in query_dates:
        res1 = current_impl(entries, d)
        res2 = optimized_impl(entries, d)
        assert res1 == res2, f"Mismatch for {d}: {res1} != {res2}"
    print("Verification passed!")


if __name__ == "__main__":
    run_benchmark()
