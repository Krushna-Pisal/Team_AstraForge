"""Bounded Yahoo cache with explicit stale provenance; never silently uses the CSV."""
from collections import OrderedDict
from threading import RLock
from time import monotonic
from app.domain import DomainError

_cache = OrderedDict()
_lock = RLock()
TTL = 900

def online_prices(ticker, period, refresh=False):
    from app.phase3_market_data import _fetch_fx
    key = (ticker, period)
    with _lock:
        previous = _cache.get(key)
        if previous and not refresh and monotonic() - previous[0] < TTL:
            result = previous[1].copy()
            result.attrs["cache_status"] = "cached"
            return result
    try:
        # _fetch_fx may be directly patched in tests or wrapped by lru_cache; both forms should work.
        fetcher = getattr(_fetch_fx, "__wrapped__", _fetch_fx)
        result = fetcher(ticker, period, 0)
        result.attrs["cache_status"] = "fresh"
        with _lock:
            _cache[key] = (monotonic(), result.copy())
            _cache.move_to_end(key)
            while len(_cache) > 32:
                _cache.popitem(last=False)
        return result
    except DomainError:
        if not previous:
            raise
        result = previous[1].copy()
        result.attrs["cache_status"] = "stale"
        return result
