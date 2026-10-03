import { useEffect, useId, useState } from "react";
import { api } from "../lib/api";
export default function UnderlyingSearch({ kind, value, onChange }) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(-1);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setBusy(true);
      setMessage("");
      setItems([]);
      setActive(-1);
      api(
        "/api/market-data/search?kind=" +
          kind +
          "&q=" +
          encodeURIComponent(query),
        { signal: controller.signal },
      )
        .then((data) => {
          if (!controller.signal.aborted) {
            setItems(data.results);
            setMessage(
              data.warning ||
                (!data.results.length
                  ? "No supported matches. Try a symbol such as AAPL, RELIANCE.NS or EURUSD=X."
                  : ""),
            );
          }
        })
        .catch((e) => {
          if (!controller.signal.aborted) setMessage(e.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setBusy(false);
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, kind, open]);
  function choose(item) {
    onChange(item);
    setQuery("");
    setOpen(false);
    setActive(-1);
  }
  return (
    <div className="field underlying-search">
      <label htmlFor={id}>Stock, index or currency pair</label>
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={id + "-list"}
        aria-autocomplete="list"
        aria-activedescendant={
          open && active >= 0 ? id + "-" + active : undefined
        }
        autoComplete="off"
        value={open ? query : value?.label || value?.ticker || ""}
        placeholder={
          kind === "fx"
            ? "Search currency pairs"
            : "Search stocks, indices or ETFs"
        }
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setItems([]);
          setActive(-1);
          setOpen(true);
        }}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(a + 1, items.length - 1));
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(0, a - 1));
          }
          if (e.key === "Escape") {
            setOpen(false);
          }
          if (e.key === "Enter" && open) {
            e.preventDefault();
            if (items[active]) choose(items[active]);
          }
        }}
      />
      {open && (
        <div className="search-popover">
          <ul id={id + "-list"} role="listbox" aria-label="Underlying matches">
            {items.map((item, i) => (
              <li
                role="option"
                id={id + "-" + i}
                key={item.ticker}
                aria-selected={active === i}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(item);
                }}
                className={active === i ? "active" : ""}
              >
                <strong>{item.label}</strong>
                <span>
                  {item.ticker} · {item.exchange || item.kind}
                </span>
              </li>
            ))}
          </ul>
          <p role="status">
            {busy
              ? "Searching Yahoo Finance…"
              : message ||
                "Type a name or symbol to search beyond these suggestions."}
          </p>
        </div>
      )}
      <small>
        {value ? "Selected: " + value.ticker + ". " : ""}Yahoo Finance search;
        supported stocks, indices, ETFs and currency pairs. Select a result to
        use it.
      </small>
    </div>
  );
}
