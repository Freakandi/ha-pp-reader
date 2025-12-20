function fn(e, t) {
  try {
    t();
  } catch (n) {
    console.warn(`addSwipeEvents: ${e} handler threw`, n);
  }
}
function Pa(e, t, n) {
  let r = null;
  const a = (l) => {
    l < -50 ? fn("left", t) : l > 50 && fn("right", n);
  }, i = (l) => {
    l.touches.length === 1 && (r = l.touches[0].clientX);
  }, o = (l) => {
    if (r === null)
      return;
    if (l.changedTouches.length === 0) {
      r = null;
      return;
    }
    const f = l.changedTouches[0];
    a(f.clientX - r), r = null;
  }, s = (l) => {
    r = l.clientX;
  }, c = (l) => {
    r !== null && (a(l.clientX - r), r = null);
  };
  e.addEventListener("touchstart", i, { passive: !0 }), e.addEventListener("touchend", o, { passive: !0 }), e.addEventListener("mousedown", s), e.addEventListener("mouseup", c);
}
function D(e) {
  return e == null ? "" : (typeof e == "string" ? e : String(e)).replace(/[&<>"']/g, (n) => {
    switch (n) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return n;
    }
  });
}
function ce(e) {
  return D(e);
}
const Yt = (e, t) => {
  if (!Number.isFinite(e) || e === 0)
    return "neutral";
  const n = 0.5 / Math.pow(10, t);
  return Math.abs(e) < n ? "neutral" : e > 0 ? "positive" : "negative";
};
function M(e, t, n = void 0, r = void 0) {
  let a = null;
  const i = (c) => {
    if (typeof c == "number")
      return c;
    if (typeof c == "string" && c.trim() !== "") {
      const l = c.replace(/\s+/g, "").replace(/[^0-9,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."), f = Number.parseFloat(l);
      return Number.isNaN(f) ? Number.NaN : f;
    }
    return Number.NaN;
  }, o = (c, l = 2, f = 2) => {
    const u = typeof c == "number" ? c : i(c);
    return Number.isFinite(u) ? u.toLocaleString("de-DE", {
      minimumFractionDigits: l,
      maximumFractionDigits: f
    }) : "";
  }, s = (c = "") => {
    const l = c || "Kein Wert verfügbar";
    return `<span class="missing-value" role="note" aria-label="${l}" title="${l}">—</span>`;
  };
  if (["gain_abs", "gain_pct", "day_change_abs", "day_change_pct"].includes(e)) {
    if (t == null && n) {
      const g = n.performance;
      if (typeof g == "object" && g !== null)
        if (e.startsWith("day_change")) {
          const d = g.day_change;
          if (d && typeof d == "object") {
            const p = e === "day_change_pct" ? d.change_pct : d.value_change_eur ?? d.price_change_eur;
            typeof p == "number" && (t = p);
          }
        } else {
          const d = g[e];
          typeof d == "number" && (t = d);
        }
    }
    const c = n?.fx_unavailable === !0 ? "Wechselkurs nicht verfügbar – EUR-Wert unbekannt" : "";
    if (t == null || r?.hasValue === !1)
      return s(c);
    const l = typeof t == "number" ? t : i(t);
    if (!Number.isFinite(l))
      return s(c);
    const f = e.endsWith("pct") ? "%" : "€";
    return a = o(l) + `&nbsp;${f}`, `<span class="${Yt(l, 2)}">${a}</span>`;
  } else if (e === "position_count") {
    const c = typeof t == "number" ? t : i(t);
    if (!Number.isFinite(c))
      return s();
    a = c.toLocaleString("de-DE");
  } else if (["balance", "current_value", "purchase_value"].includes(e)) {
    const c = typeof t == "number" ? t : i(t);
    if (!Number.isFinite(c))
      return n?.fx_unavailable ? s(
        "Wechselkurs nicht verfügbar – EUR-Wert unbekannt"
      ) : (r && r.hasValue === !1, s());
    a = o(c) + "&nbsp;€";
  } else if (e === "current_holdings") {
    const c = typeof t == "number" ? t : i(t);
    if (!Number.isFinite(c))
      return s();
    const l = Math.abs(c % 1) > 0;
    a = c.toLocaleString("de-DE", {
      minimumFractionDigits: l ? 2 : 0,
      maximumFractionDigits: 4
    });
  } else {
    let c = "";
    typeof t == "string" ? c = t : typeof t == "number" && Number.isFinite(t) ? c = t.toString() : typeof t == "boolean" ? c = t ? "true" : "false" : t instanceof Date && Number.isFinite(t.getTime()) && (c = t.toISOString()), a = c, a && (/<[a-z]/i.test(a) && /<\s*(?:script|iframe|object|embed|base|style|link|meta|form)\b|javascript:|[\s\/]on[a-z]+\s*=/i.test(a) && (a = D(a)), /<|&lt;|&gt;/.test(a) || (a.length > 60 && (a = a.slice(0, 59) + "…"), a.startsWith("Kontostand ") ? a = a.substring(11) : a.startsWith("Depotwert ") && (a = a.substring(10))));
  }
  return typeof a != "string" || a === "" ? s() : a;
}
function xe(e, t, n = [], r = {}) {
  const { sortable: a = !1, defaultSort: i, rowAttributes: o } = r, s = i?.key ?? "", c = i?.dir === "desc" ? "desc" : "asc";
  let l = "<table><thead><tr>";
  t.forEach((h) => {
    const y = h.align === "right" ? ' class="align-right"' : "";
    if (a && h.key) {
      const b = `${ce(h.label)} sortieren`;
      l += `<th${y} data-sort-key="${h.key}" role="button" tabindex="0" aria-sort="none" aria-label="${b}">${h.label}</th>`;
    } else
      l += `<th${y}>${h.label}</th>`;
  }), l += "</tr></thead><tbody>", e.forEach((h) => {
    let y = "";
    if (o) {
      const b = o(h);
      y = Object.entries(b).map(([v, P]) => ` ${v}="${ce(P)}"`).join("");
    }
    l += `<tr${y}>`, t.forEach((b) => {
      const v = b.align === "right" ? ' class="align-right"' : "";
      l += `<td${v}>${M(b.key, h[b.key], h)}</td>`;
    }), l += "</tr>";
  });
  const f = {}, u = {};
  t.forEach((h) => {
    if (n.includes(h.key)) {
      const y = e.reduce(
        (b, v) => {
          let P = v[h.key];
          if ((h.key === "gain_abs" || h.key === "gain_pct") && (typeof P != "number" || !Number.isFinite(P))) {
            const C = v.performance;
            if (typeof C == "object" && C !== null) {
              const w = C[h.key];
              typeof w == "number" && (P = w);
            }
          } else if ((h.key === "day_change_abs" || h.key === "day_change_pct") && (typeof P != "number" || !Number.isFinite(P))) {
            const C = v.performance;
            if (typeof C == "object" && C !== null) {
              const w = C.day_change;
              if (w && typeof w == "object") {
                const N = h.key === "day_change_pct" ? w.change_pct : w.value_change_eur ?? w.price_change_eur;
                typeof N == "number" && (P = N);
              }
            }
          }
          if (typeof P == "number" && Number.isFinite(P)) {
            const C = P;
            b.total += C, b.hasValue = !0;
          }
          return b;
        },
        { total: 0, hasValue: !1 }
      );
      y.hasValue ? (f[h.key] = y.total, u[h.key] = { hasValue: !0 }) : (f[h.key] = null, u[h.key] = { hasValue: !1 });
    }
  });
  const g = f.gain_abs ?? null;
  if (g != null) {
    const h = f.purchase_value ?? null;
    if (h != null && h > 0)
      f.gain_pct = g / h * 100;
    else {
      const y = f.current_value ?? null;
      y != null && y !== 0 && (f.gain_pct = g / (y - g) * 100);
    }
  }
  const d = f.day_change_abs ?? null;
  if (d != null) {
    const h = f.current_value ?? null;
    if (h != null) {
      const y = h - d;
      y && (f.day_change_pct = d / y * 100, u.day_change_pct = { hasValue: !0 });
    }
  }
  const p = Number.isFinite(f.gain_pct ?? NaN) ? f.gain_pct : null;
  let m = "", _ = "neutral";
  if (p != null && (m = `${de(p)} %`, p > 0 ? _ = "positive" : p < 0 && (_ = "negative")), l += '<tr class="footer-row">', t.forEach((h, y) => {
    const b = h.align === "right" ? ' class="align-right"' : "";
    if (y === 0) {
      l += `<td${b}>Summe</td>`;
      return;
    }
    if (f[h.key] != null) {
      let P = "";
      h.key === "gain_abs" && m && (P = ` data-gain-pct="${ce(m)}" data-gain-sign="${ce(_)}"`), l += `<td${b}${P}>${M(h.key, f[h.key], void 0, u[h.key])}</td>`;
      return;
    }
    if (h.key === "gain_pct" && f.gain_pct != null) {
      l += `<td${b}>${M("gain_pct", f.gain_pct, void 0, u[h.key])}</td>`;
      return;
    }
    const v = u[h.key] ?? { hasValue: !1 };
    l += `<td${b}>${M(h.key, null, void 0, v)}</td>`;
  }), l += "</tr>", l += "</tbody></table>", a)
    try {
      const h = document.createElement("template");
      h.innerHTML = l.trim();
      const y = h.content.querySelector("table");
      if (y)
        return y.classList.add("sortable-table"), s && (y.dataset.defaultSort = s, y.dataset.defaultDir = c), y.outerHTML;
    } catch (h) {
      console.warn("makeTable(sortable): Injection fehlgeschlagen:", h);
    }
  return l;
}
function On(e, t, n = {}) {
  const { includeMeta: r = !0 } = n, a = document.createElement("div");
  a.className = "header-card";
  const i = r ? `<div id="headerMeta" class="meta">${t}</div>` : "";
  return a.innerHTML = `
    <div class="header-content">
      <button id="nav-left" class="nav-arrow" aria-label="Vorherige Seite">
        <svg viewBox="0 0 24 24">
          <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"></path>
        </svg>
      </button>
      <h2 id="headerTitle">${e}</h2>
      <button id="nav-right" class="nav-arrow" aria-label="Nächste Seite">
        <svg viewBox="0 0 24 24">
          <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"></path>
        </svg>
      </button>
    </div>
    ${i}
  `, a;
}
function de(e, t = 2, n = 2) {
  return (Number.isNaN(e) ? 0 : e).toLocaleString("de-DE", {
    minimumFractionDigits: t,
    maximumFractionDigits: n
  });
}
function Aa(e) {
  const t = Number.isNaN(e) ? 0 : e;
  return `<span class="${Yt(t, 2)}">${de(t)}&nbsp;€</span>`;
}
function Ca(e) {
  const t = Number.isNaN(e) ? 0 : e;
  return `<span class="${Yt(t, 2)}">${de(t)}&nbsp;%</span>`;
}
function wa() {
  return `
    <svg class="spinner-icon inline" viewBox="0 0 50 50" aria-hidden="true" style="width: 1em; height: 1em; vertical-align: middle; animation: rotate 2s linear infinite;">
      <circle class="path" cx="25" cy="25" r="20" fill="none" stroke="currentColor" stroke-width="5" style="stroke-linecap: round; animation: dash 1.5s ease-in-out infinite;"></circle>
      <style>
        @keyframes rotate {
          100% { transform: rotate(360deg); }
        }
        @keyframes dash {
          0% { stroke-dasharray: 1, 150; stroke-dashoffset: 0; }
          50% { stroke-dasharray: 90, 150; stroke-dashoffset: -35; }
          100% { stroke-dasharray: 90, 150; stroke-dashoffset: -124; }
        }
      </style>
    </svg>
  `;
}
function Kt(e = "Laden...") {
  return `
    <div class="loading" role="status" aria-live="polite" style="display: flex; align-items: center; justify-content: center; gap: 0.75rem; color: var(--secondary-text-color);">
      
    <svg class="spinner-icon" viewBox="0 0 50 50" aria-hidden="true" style="width: 1.5em; height: 1.5em; vertical-align: middle; animation: rotate 2s linear infinite;">
      <circle class="path" cx="25" cy="25" r="20" fill="none" stroke="currentColor" stroke-width="5" style="stroke-linecap: round; animation: dash 1.5s ease-in-out infinite;"></circle>
      <style>
        @keyframes rotate {
          100% { transform: rotate(360deg); }
        }
        @keyframes dash {
          0% { stroke-dasharray: 1, 150; stroke-dashoffset: 0; }
          50% { stroke-dasharray: 90, 150; stroke-dashoffset: -35; }
          100% { stroke-dasharray: 90, 150; stroke-dashoffset: -124; }
        }
      </style>
    </svg>
  
      <span>${D(e || "Laden...")}</span>
    </div>
  `;
}
function Wn(e, t, n = "asc", r = !1) {
  if (!e)
    return [];
  const a = e.querySelector("tbody");
  if (!a)
    return [];
  const i = a.querySelector("tr.footer-row"), o = Array.from(
    a.querySelectorAll("tr")
  ).filter((f) => f !== i);
  let s = -1;
  if (r) {
    const u = {
      name: 0,
      current_holdings: 1,
      average_price: 2,
      purchase_value: 3,
      current_value: 4,
      day_change_abs: 5,
      day_change_pct: 6,
      gain_abs: 7,
      gain_pct: 8
    }[t];
    typeof u == "number" && (s = u);
  } else {
    const f = Array.from(
      e.querySelectorAll("thead th")
    );
    for (let u = 0; u < f.length; u++)
      if (f[u].getAttribute("data-sort-key") === t) {
        s = u;
        break;
      }
  }
  if (s < 0)
    return o;
  const c = (f) => {
    const u = f.replace(/\u00A0/g, " ").replace(/[%€]/g, "").replace(/\./g, "").replace(/,/g, ".").replace(/[^\d.-]/g, "").trim();
    if (!u) return NaN;
    const g = parseFloat(u);
    return Number.isFinite(g) ? g : NaN;
  };
  o.sort((f, u) => {
    const g = f.cells.item(s), d = u.cells.item(s), p = (g?.textContent ?? "").trim(), m = (d?.textContent ?? "").trim(), _ = c(p), h = c(m);
    let y;
    const b = /[0-9]/.test(p) || /[0-9]/.test(m);
    return !Number.isNaN(_) && !Number.isNaN(h) && b ? y = _ - h : y = p.localeCompare(m, "de", { sensitivity: "base" }), n === "asc" ? y : -y;
  }), o.forEach((f) => a.appendChild(f)), i && a.appendChild(i), e.querySelectorAll("thead th.sort-active").forEach((f) => {
    f.classList.remove("sort-active", "dir-asc", "dir-desc");
  }), e.querySelectorAll("thead th[aria-sort]").forEach((f) => {
    f.setAttribute("aria-sort", "none");
  });
  const l = e.querySelector(
    `thead th[data-sort-key="${t}"]`
  );
  return l && (l.classList.add(
    "sort-active",
    n === "asc" ? "dir-asc" : "dir-desc"
  ), l.setAttribute("aria-sort", n === "asc" ? "ascending" : "descending")), o;
}
function fe(e) {
  return typeof e == "object" && e !== null;
}
function B(e) {
  return typeof e == "string" ? e : null;
}
function Ge(e) {
  return e === null ? null : B(e);
}
function U(e) {
  if (typeof e == "number")
    return Number.isFinite(e) ? e : null;
  if (typeof e == "string") {
    const t = e.trim();
    if (t.length === 0)
      return null;
    const n = Number(t.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
function pn(e) {
  const t = U(e);
  if (t == null)
    return null;
  const n = Math.trunc(t);
  return Number.isFinite(n) ? n : null;
}
function Xe(e) {
  return fe(e) ? { ...e } : null;
}
function Bn(e) {
  return fe(e) ? { ...e } : null;
}
function jn(e) {
  return typeof e == "boolean" ? e : void 0;
}
function Na(e) {
  if (!fe(e))
    return null;
  const t = B(e.name), n = B(e.currency_code), r = U(e.orig_balance);
  if (!t || !n || r == null)
    return null;
  const a = e.balance === null ? null : U(e.balance), i = {
    uuid: B(e.uuid) ?? void 0,
    name: t,
    currency_code: n,
    orig_balance: r,
    balance: a ?? null
  }, o = U(e.fx_rate);
  o != null && (i.fx_rate = o);
  const s = B(e.fx_rate_source);
  s && (i.fx_rate_source = s);
  const c = B(e.fx_rate_timestamp);
  c && (i.fx_rate_timestamp = c);
  const l = U(e.coverage_ratio);
  l != null && (i.coverage_ratio = l);
  const f = B(e.provenance);
  f && (i.provenance = f);
  const u = Ge(e.metric_run_uuid);
  u !== null && (i.metric_run_uuid = u);
  const g = jn(e.fx_unavailable);
  return typeof g == "boolean" && (i.fx_unavailable = g), i;
}
function Yn(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = Na(n);
    r && t.push(r);
  }
  return t;
}
function Ea(e) {
  if (!fe(e))
    return null;
  const t = e.aggregation, n = B(e.security_uuid), r = B(e.name), a = U(e.current_holdings), i = U(e.purchase_value_eur) ?? (fe(t) ? U(t.purchase_value_eur) ?? U(t.purchase_total_account) ?? U(t.account_currency_total) : null) ?? U(e.purchase_value), o = U(e.current_value);
  if (!n || !r || a == null || i == null || o == null)
    return null;
  const s = {
    portfolio_uuid: B(e.portfolio_uuid) ?? void 0,
    security_uuid: n,
    name: r,
    ticker_symbol: B(e.ticker_symbol),
    currency_code: B(e.currency_code),
    current_holdings: a,
    purchase_value: i,
    current_value: o,
    average_cost: Xe(e.average_cost),
    performance: Xe(e.performance),
    aggregation: Xe(e.aggregation),
    data_state: Bn(e.data_state)
  }, c = U(e.coverage_ratio);
  c != null && (s.coverage_ratio = c);
  const l = B(e.provenance);
  l && (s.provenance = l);
  const f = Ge(e.metric_run_uuid);
  f !== null && (s.metric_run_uuid = f);
  const u = U(e.last_price_native);
  u != null && (s.last_price_native = u);
  const g = U(e.last_price_eur);
  g != null && (s.last_price_eur = g);
  const d = U(e.last_close_native);
  d != null && (s.last_close_native = d);
  const p = U(e.last_close_eur);
  return p != null && (s.last_close_eur = p), s;
}
function Kn(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = Ea(n);
    r && t.push(r);
  }
  return t;
}
function Gn(e) {
  if (!fe(e))
    return null;
  const t = B(e.name), n = U(e.current_value ?? e.value);
  if (!t || n == null)
    return null;
  const a = U(
    e.purchase_sum ?? e.purchase_value_eur ?? e.purchase_value ?? e.purchaseSum
  ) ?? 0, i = {
    uuid: B(e.uuid) ?? void 0,
    name: t,
    current_value: n,
    purchase_value: a,
    purchase_sum: a,
    day_change_abs: U(e.day_change_abs) ?? U(e.day_change_eur) ?? void 0,
    day_change_pct: U(e.day_change_pct) ?? void 0,
    position_count: pn(e.position_count ?? e.count) ?? void 0,
    missing_value_positions: pn(e.missing_value_positions) ?? void 0,
    has_current_value: jn(e.has_current_value),
    performance: Xe(e.performance),
    coverage_ratio: U(e.coverage_ratio) ?? void 0,
    provenance: B(e.provenance) ?? void 0,
    metric_run_uuid: Ge(e.metric_run_uuid) ?? void 0,
    data_state: Bn(e.data_state)
  };
  return Array.isArray(e.positions) && (i.positions = Kn(e.positions)), i;
}
function Xn(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = Gn(n);
    r && t.push(r);
  }
  return t;
}
function Zn(e) {
  if (!fe(e))
    return null;
  const t = { ...e }, n = Ge(e.metric_run_uuid);
  n !== null ? t.metric_run_uuid = n : delete t.metric_run_uuid;
  const r = U(e.coverage_ratio);
  r != null ? t.coverage_ratio = r : delete t.coverage_ratio;
  const a = B(e.provenance);
  a ? t.provenance = a : delete t.provenance;
  const i = B(e.generated_at ?? e.snapshot_generated_at);
  return i ? t.generated_at = i : delete t.generated_at, t;
}
function xa(e) {
  if (!fe(e))
    return null;
  const t = { ...e }, n = Zn(e.normalized_payload);
  return n ? t.normalized_payload = n : "normalized_payload" in t && delete t.normalized_payload, t;
}
function Jn(e) {
  if (!fe(e))
    return null;
  const t = B(e.generated_at);
  if (!t)
    return null;
  const n = Ge(e.metric_run_uuid), r = Yn(e.accounts), a = Xn(e.portfolios), i = xa(e.diagnostics), o = {
    generated_at: t,
    metric_run_uuid: n,
    accounts: r,
    portfolios: a
  };
  return i && (o.diagnostics = i), o;
}
function gn(e) {
  return typeof e == "string" ? e : null;
}
function Fa(e) {
  if (typeof e == "string")
    return e;
  if (e === null)
    return null;
}
function ka(e) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
}
function hn(e, t) {
  if (typeof e == "string")
    return e;
  throw new Error(`mapPositionSnapshotToRecord: fehlendes ${t}`);
}
function Pt(e, t) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  throw new Error(`mapPositionSnapshotToRecord: fehlendes ${t}`);
}
function Da(e) {
  const t = hn(e.security_uuid, "security_uuid"), n = hn(e.name, "name"), r = Pt(e.current_holdings, "current_holdings"), a = Pt(e.purchase_value, "purchase_value"), i = Pt(e.current_value, "current_value"), o = {
    security_uuid: t,
    name: n,
    current_holdings: r,
    purchase_value: a,
    current_value: i,
    average_cost: e.average_cost ?? null,
    performance: e.performance ?? null,
    aggregation: e.aggregation ?? null
  };
  return e.currency_code !== void 0 && (o.currency_code = e.currency_code), e.coverage_ratio != null && (o.coverage_ratio = e.coverage_ratio), e.provenance && (o.provenance = e.provenance), e.metric_run_uuid !== void 0 && (o.metric_run_uuid = e.metric_run_uuid), e.last_price_native != null && (o.last_price_native = e.last_price_native), e.last_price_eur != null && (o.last_price_eur = e.last_price_eur), e.last_close_native != null && (o.last_close_native = e.last_close_native), e.last_close_eur != null && (o.last_close_eur = e.last_close_eur), e.data_state && (o.data_state = e.data_state), e.ticker_symbol && (o.ticker_symbol = e.ticker_symbol), e.portfolio_uuid && (o.portfolio_uuid = e.portfolio_uuid), o;
}
function ye(e, t) {
  let n = t?.config?.entry_id ?? t?.entry_id ?? t?.config?._panel_custom?.config?.entry_id ?? void 0;
  if (!n && e?.panels) {
    const r = e.panels, a = r.ppreader ?? r.pp_reader ?? Object.values(r).find(
      (i) => i?.webcomponent_name === "pp-reader-panel"
    );
    n = a?.config?.entry_id ?? a?.entry_id ?? a?.config?._panel_custom?.config?.entry_id ?? void 0;
  }
  return n ?? void 0;
}
function mn(e, t) {
  return ye(e, t);
}
async function Ra(e, t) {
  if (!e)
    throw new Error("fetchAccountsWS: fehlendes hass");
  const n = ye(e, t);
  if (!n)
    throw new Error("fetchAccountsWS: fehlendes entry_id");
  const r = await e.connection.sendMessagePromise({
    type: "pp_reader/get_accounts",
    entry_id: n
  }), a = Yn(r.accounts), i = Jn(r.normalized_payload);
  return {
    accounts: a,
    normalized_payload: i
  };
}
async function Ta(e, t) {
  if (!e)
    throw new Error("fetchLastFileUpdateWS: fehlendes hass");
  const n = ye(e, t);
  if (!n)
    throw new Error("fetchLastFileUpdateWS: fehlendes entry_id");
  const r = await e.connection.sendMessagePromise({
    type: "pp_reader/get_last_file_update",
    entry_id: n
  });
  if (typeof r == "string")
    return r;
  const a = r.last_file_update;
  return typeof a == "string" ? a : "";
}
async function $a(e, t) {
  if (!e)
    throw new Error("fetchPortfoliosWS: fehlendes hass");
  const n = ye(e, t);
  if (!n)
    throw new Error("fetchPortfoliosWS: fehlendes entry_id");
  const r = await e.connection.sendMessagePromise({
    type: "pp_reader/get_portfolio_data",
    entry_id: n
  }), a = Xn(r.portfolios), i = Jn(r.normalized_payload);
  return {
    portfolios: a,
    normalized_payload: i
  };
}
async function Qn(e, t, n) {
  if (!e)
    throw new Error("fetchPortfolioPositionsWS: fehlendes hass");
  const r = ye(e, t);
  if (!r)
    throw new Error("fetchPortfolioPositionsWS: fehlendes entry_id");
  if (!n)
    throw new Error("fetchPortfolioPositionsWS: fehlendes portfolio_uuid");
  const a = await e.connection.sendMessagePromise({
    type: "pp_reader/get_portfolio_positions",
    entry_id: r,
    portfolio_uuid: n
  }), o = Kn(a.positions).map(Da), s = Zn(a.normalized_payload), c = {
    portfolio_uuid: gn(a.portfolio_uuid) ?? n,
    positions: o
  };
  typeof a.error == "string" && (c.error = a.error);
  const l = ka(a.coverage_ratio);
  l !== void 0 && (c.coverage_ratio = l);
  const f = gn(a.provenance);
  f && (c.provenance = f);
  const u = Fa(a.metric_run_uuid);
  return u !== void 0 && (c.metric_run_uuid = u), s && (c.normalized_payload = s), c;
}
async function La(e, t, n) {
  if (!e)
    throw new Error("fetchSecuritySnapshotWS: fehlendes hass");
  const r = ye(e, t);
  if (!r)
    throw new Error("fetchSecuritySnapshotWS: fehlendes entry_id");
  if (!n)
    throw new Error("fetchSecuritySnapshotWS: fehlendes securityUuid");
  return e.connection.sendMessagePromise({
    type: "pp_reader/get_security_snapshot",
    entry_id: r,
    security_uuid: n
  });
}
async function Ma(e, t) {
  if (!e)
    throw new Error("fetchNewsPromptWS: fehlendes hass");
  const n = ye(e, t);
  if (!n)
    throw new Error("fetchNewsPromptWS: fehlendes entry_id");
  return e.connection.sendMessagePromise({
    type: "pp_reader/get_news_prompt",
    entry_id: n
  });
}
async function tt(e, t, n, r = {}) {
  if (!e)
    throw new Error("fetchSecurityHistoryWS: fehlendes hass");
  const a = ye(e, t);
  if (!a)
    throw new Error("fetchSecurityHistoryWS: fehlendes entry_id");
  if (!n)
    throw new Error("fetchSecurityHistoryWS: fehlendes securityUuid");
  const i = {
    type: "pp_reader/get_security_history",
    entry_id: a,
    security_uuid: n
  }, { startDate: o, endDate: s, start_date: c, end_date: l } = r || {}, f = o ?? c;
  f != null && (i.start_date = f);
  const u = s ?? l;
  u != null && (i.end_date = u);
  const g = await e.connection.sendMessagePromise(i);
  return Array.isArray(g.prices) || (g.prices = []), Array.isArray(g.transactions) || (g.transactions = []), g;
}
const Gt = /* @__PURE__ */ new Set(), Xt = /* @__PURE__ */ new Set(), er = {}, Ha = [
  "renderPositionsTable",
  "applyGainPctMetadata",
  "attachSecurityDetailListener",
  "attachPortfolioPositionsSorting",
  "updatePortfolioFooter"
];
function Ia(e, t) {
  typeof t == "function" && (er[e] = t);
}
function As(e) {
  e && Gt.add(e);
}
function Cs(e) {
  e && Gt.delete(e);
}
function Va() {
  return Gt;
}
function ws(e) {
  e && Xt.add(e);
}
function Ns(e) {
  e && Xt.delete(e);
}
function Ua() {
  return Xt;
}
function za(e) {
  for (const t of Ha)
    Ia(t, e[t]);
}
function Zt() {
  return er;
}
const qa = 2;
function le(e) {
  if (typeof e == "number")
    return Number.isFinite(e) ? e : null;
  if (typeof e == "string") {
    const t = e.trim().replace(/\u00a0/g, "");
    if (!t)
      return null;
    const n = Number(t);
    if (Number.isFinite(n))
      return n;
    const r = t.replace(/[^0-9.,+-]/g, "");
    if (!r)
      return null;
    const a = r.lastIndexOf(","), i = r.lastIndexOf(".");
    let o = r;
    const s = a !== -1, c = i !== -1;
    if (s && (!c || a > i))
      if (c)
        o = o.replace(/\./g, "").replace(",", ".");
      else {
        const u = o.split(","), g = u[u.length - 1]?.length ?? 0, d = u.slice(0, -1).join(""), p = d.replace(/[+-]/g, "").length, m = u.length > 2, _ = /^[-+]?0$/.test(d);
        o = m || g === 0 || g === 3 && p > 0 && p <= 3 && !_ ? o.replace(/,/g, "") : o.replace(",", ".");
      }
    else c && s && i > a ? o = o.replace(/,/g, "") : c && o.length - i - 1 === 3 && /\d{4,}/.test(o.replace(/\./g, "")) && (o = o.replace(/\./g, ""));
    if (o === "-" || o === "+")
      return null;
    const l = Number.parseFloat(o);
    if (Number.isFinite(l))
      return l;
    const f = Number.parseFloat(r.replace(",", "."));
    if (Number.isFinite(f))
      return f;
  }
  return null;
}
function yt(e, { decimals: t = qa, fallback: n = null } = {}) {
  const r = le(e);
  if (r == null)
    return n ?? null;
  const a = 10 ** t, i = Math.round(r * a) / a;
  return Object.is(i, -0) ? 0 : i;
}
function yn(e, t = {}) {
  return yt(e, t);
}
function Oa(e, t = {}) {
  return yt(e, t);
}
const Wa = /^[+-]?(?:\d+\.?\d*|\d*\.?\d+)(?:[eE][+-]?\d+)?$/, ae = (e) => {
  if (typeof e == "number")
    return Number.isFinite(e) ? e : null;
  if (typeof e == "string") {
    const t = e.trim();
    if (!t || !Wa.test(t))
      return null;
    const n = Number(t);
    if (Number.isFinite(n))
      return n;
  }
  return null;
}, tr = (e) => {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t || null;
};
function Ba(e) {
  const t = e && typeof e == "object" ? e : null;
  if (!t)
    return null;
  const n = ae(t.price_change_native), r = ae(t.price_change_eur), a = ae(t.change_pct), i = ae(t.value_change_eur);
  if (n == null && r == null && a == null && i == null)
    return null;
  const o = tr(t.source) ?? "derived", s = ae(t.coverage_ratio) ?? null;
  return {
    price_change_native: n,
    price_change_eur: r,
    change_pct: a,
    value_change_eur: i ?? null,
    source: o,
    coverage_ratio: s
  };
}
function me(e) {
  const t = e && typeof e == "object" ? e : null;
  if (!t)
    return null;
  const n = ae(t.gain_abs), r = ae(t.gain_pct), a = ae(t.total_change_eur), i = ae(t.total_change_pct);
  if (n == null || r == null || a == null || i == null)
    return null;
  const o = tr(t.source) ?? "derived", s = ae(t.coverage_ratio) ?? null, c = Ba(t.day_change);
  return {
    gain_abs: n,
    gain_pct: r,
    total_change_eur: a,
    total_change_pct: i,
    source: o,
    coverage_ratio: s,
    day_change: c
  };
}
const ge = /* @__PURE__ */ new Map();
function pe(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t.length > 0 ? t : null;
}
function q(e) {
  if (e === null)
    return null;
  const t = le(e);
  return Number.isFinite(t ?? NaN) ? t : null;
}
function ja(e) {
  if (!e || typeof e != "object")
    return !1;
  const t = e;
  return typeof t.security_uuid == "string" && typeof t.name == "string" && typeof t.current_holdings == "number" && typeof t.purchase_value == "number" && typeof t.current_value == "number";
}
function Fe(e) {
  const t = { ...e };
  return e.average_cost && typeof e.average_cost == "object" && (t.average_cost = { ...e.average_cost }), e.performance && typeof e.performance == "object" && (t.performance = { ...e.performance }), e.aggregation && typeof e.aggregation == "object" && (t.aggregation = { ...e.aggregation }), e.data_state && typeof e.data_state == "object" && (t.data_state = { ...e.data_state }), t;
}
function Ya(e, t, n = []) {
  if (!t || typeof t != "object")
    return t;
  const r = {
    ...e && typeof e == "object" ? e : {},
    ...t
  };
  return n.forEach((a) => {
    const i = e?.[a];
    i != null && (r[a] = i);
  }), r;
}
function Ka(e, t) {
  const n = e ? Fe(e) : {}, r = [
    "portfolio_uuid",
    "security_uuid",
    "name",
    "ticker_symbol",
    "currency_code",
    "current_holdings",
    "purchase_value",
    "current_value",
    "coverage_ratio",
    "provenance",
    "metric_run_uuid",
    "fx_unavailable"
  ], a = (c, l, f) => {
    const u = l[f];
    u !== void 0 && (c[f] = u);
  };
  r.forEach((c) => {
    a(n, t, c);
  });
  const i = (c) => {
    const l = t[c];
    if (l && typeof l == "object") {
      const f = e && e[c] && typeof e[c] == "object" ? e[c] : {};
      n[c] = {
        ...f,
        ...l
      };
    } else l !== void 0 && (n[c] = l);
  }, o = t.performance, s = e && e.performance && typeof e.performance == "object" ? e.performance : void 0;
  return o !== void 0 && (n.performance = Ya(s, o, [
    "gain_pct",
    "total_change_pct"
  ])), i("aggregation"), i("average_cost"), i("data_state"), n;
}
function nt(e, t) {
  if (!e)
    return [];
  if (!Array.isArray(t))
    return ge.delete(e), [];
  if (t.length === 0)
    return ge.set(e, []), [];
  const n = ge.get(e) ?? [], r = new Map(
    n.filter((i) => i.security_uuid).map((i) => [i.security_uuid, i])
  ), a = t.filter((i) => !!i).map((i) => {
    const o = i.security_uuid ?? "", s = o ? r.get(o) : void 0;
    return Ka(s, i);
  }).map(Fe);
  return ge.set(e, a), a.map(Fe);
}
function _t(e) {
  return e ? ge.has(e) : !1;
}
function nr(e) {
  if (!e)
    return [];
  const t = ge.get(e);
  return t ? t.map(Fe) : [];
}
function Ga() {
  ge.clear();
}
function Xa() {
  return new Map(
    Array.from(ge.entries(), ([e, t]) => [
      e,
      t.map(Fe)
    ])
  );
}
function Re(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e, n = q(t.native), r = q(t.security), a = q(t.account), i = q(t.eur), o = q(t.coverage_ratio);
  if (n == null && r == null && a == null && i == null && o == null)
    return null;
  const s = pe(t.source);
  return {
    native: n,
    security: r,
    account: a,
    eur: i,
    source: s === "totals" || s === "eur_total" ? s : "aggregation",
    coverage_ratio: o
  };
}
function Jt(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e, n = q(t.total_holdings), r = q(t.positive_holdings), a = q(t.purchase_value_eur), i = q(t.purchase_total_security) ?? q(t.security_currency_total), o = q(t.purchase_total_account) ?? q(t.account_currency_total);
  let s = 0;
  if (typeof t.purchase_value_cents == "number")
    s = Number.isFinite(t.purchase_value_cents) ? Math.trunc(t.purchase_value_cents) : 0;
  else if (typeof t.purchase_value_cents == "string") {
    const l = Number.parseInt(t.purchase_value_cents, 10);
    Number.isFinite(l) && (s = l);
  }
  return n != null || r != null || a != null || i != null || o != null || s !== 0 ? {
    total_holdings: n ?? 0,
    positive_holdings: r ?? 0,
    purchase_value_cents: s,
    purchase_value_eur: a ?? 0,
    security_currency_total: i ?? 0,
    account_currency_total: o ?? 0,
    purchase_total_security: i ?? 0,
    purchase_total_account: o ?? 0
  } : null;
}
function Za(e) {
  if (!e || typeof e != "object")
    return null;
  const t = ja(e) ? Fe(e) : e, n = pe(t.security_uuid), r = pe(t.name), a = le(t.current_holdings), i = yn(t.current_value), o = Jt(t.aggregation), s = t.aggregation && typeof t.aggregation == "object" ? t.aggregation : null, c = q(t.purchase_value_eur) ?? q(s?.purchase_value_eur) ?? q(s?.purchase_total_account) ?? q(s?.account_currency_total) ?? yn(t.purchase_value);
  if (!n || !r || a == null || c == null || i == null)
    return null;
  const l = {
    security_uuid: n,
    name: r,
    portfolio_uuid: pe(t.portfolio_uuid) ?? pe(t.portfolioUuid) ?? void 0,
    currency_code: pe(t.currency_code),
    current_holdings: a,
    purchase_value: c,
    current_value: i
  }, f = Re(t.average_cost);
  f && (l.average_cost = f), o && (l.aggregation = o);
  const u = me(t.performance);
  if (u)
    l.performance = u, l.gain_abs = typeof u.gain_abs == "number" ? u.gain_abs : null, l.gain_pct = typeof u.gain_pct == "number" ? u.gain_pct : null;
  else {
    const b = q(t.gain_abs), v = q(t.gain_pct);
    b !== null && (l.gain_abs = b), v !== null && (l.gain_pct = v);
  }
  "coverage_ratio" in t && (l.coverage_ratio = q(t.coverage_ratio));
  const g = pe(t.provenance);
  g && (l.provenance = g);
  const d = pe(t.metric_run_uuid);
  (d || t.metric_run_uuid === null) && (l.metric_run_uuid = d ?? null);
  const p = q(t.last_price_native);
  p !== null && (l.last_price_native = p);
  const m = q(t.last_price_eur);
  m !== null && (l.last_price_eur = m);
  const _ = q(t.last_close_native);
  _ !== null && (l.last_close_native = _);
  const h = q(t.last_close_eur);
  h !== null && (l.last_close_eur = h);
  const y = t.data_state && typeof t.data_state == "object" ? { ...t.data_state } : void 0;
  return y && (l.data_state = y), l;
}
function bt(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = Za(n);
    r && t.push(r);
  }
  return t;
}
let rr = [];
const he = /* @__PURE__ */ new Map();
function Ze(e) {
  return typeof e == "string" && e.length > 0 ? e : void 0;
}
function Ja(e) {
  return e === null ? null : Ze(e);
}
function Qa(e) {
  return typeof e == "number" && Number.isFinite(e) ? e : void 0;
}
function be(e) {
  return e === null ? null : Qa(e);
}
function _n(e) {
  if (!(typeof e != "number" || !Number.isFinite(e)))
    return Math.trunc(e);
}
function ie(e) {
  if (!(!e || typeof e != "object"))
    return { ...e };
}
function Oe(e) {
  const t = { ...e };
  return t.average_cost = ie(e.average_cost), t.performance = ie(e.performance), t.aggregation = ie(e.aggregation), t.data_state = ie(e.data_state), t;
}
function Qt(e) {
  const t = { ...e };
  return t.performance = ie(e.performance), t.data_state = ie(e.data_state), Array.isArray(e.positions) && (t.positions = e.positions.map(Oe)), t;
}
function ar(e) {
  if (!e || typeof e != "object")
    return null;
  const t = Ze(e.uuid);
  if (!t)
    return null;
  const n = { uuid: t }, r = Ze(e.name);
  r && (n.name = r);
  const a = be(e.current_value);
  a !== void 0 && (n.current_value = a);
  const i = be(e.purchase_sum) ?? be(e.purchase_value_eur) ?? be(e.purchase_value);
  i !== void 0 && (n.purchase_value = i, n.purchase_sum = i);
  const o = be(e.day_change_abs);
  o !== void 0 && (n.day_change_abs = o);
  const s = be(e.day_change_pct);
  s !== void 0 && (n.day_change_pct = s);
  const c = _n(e.position_count);
  c !== void 0 && (n.position_count = c);
  const l = _n(e.missing_value_positions);
  l !== void 0 && (n.missing_value_positions = l), typeof e.has_current_value == "boolean" && (n.has_current_value = e.has_current_value);
  const f = be(e.coverage_ratio);
  f !== void 0 && (n.coverage_ratio = f);
  const u = Ze(e.provenance);
  u && (n.provenance = u), "metric_run_uuid" in e && (n.metric_run_uuid = Ja(e.metric_run_uuid));
  const g = ie(e.performance);
  g && (n.performance = g);
  const d = ie(e.data_state);
  if (d && (n.data_state = d), Array.isArray(e.positions)) {
    const p = e.positions.filter(
      (m) => !!m
    );
    p.length && (n.positions = p.map(Oe));
  }
  return n;
}
function ei(e, t) {
  const n = {
    ...e,
    ...t
  };
  return !t.performance && e.performance && (n.performance = ie(e.performance)), !t.data_state && e.data_state && (n.data_state = ie(e.data_state)), !t.positions && e.positions && (n.positions = e.positions.map(Oe)), n;
}
function ir(e) {
  rr = (e ?? []).map((n) => ({ ...n }));
}
function ti() {
  return rr.map((e) => ({ ...e }));
}
function ni(e) {
  he.clear();
  const t = e ?? [];
  for (const n of t) {
    const r = ar(n);
    r && he.set(r.uuid, Qt(r));
  }
}
function ri(e) {
  const t = e ?? [];
  for (const n of t) {
    const r = ar(n);
    if (!r)
      continue;
    const a = he.get(r.uuid), i = a ? ei(a, r) : Qt(r);
    he.set(i.uuid, i);
  }
}
function rt(e, t) {
  if (!e)
    return;
  const n = he.get(e);
  if (!n)
    return;
  if (!Array.isArray(t) || t.length === 0) {
    const c = { ...n };
    delete c.positions, he.set(e, c);
    return;
  }
  const r = (c, l) => {
    const f = c ? Oe(c) : {}, u = f;
    [
      "portfolio_uuid",
      "security_uuid",
      "name",
      "ticker_symbol",
      "currency_code",
      "current_holdings",
      "purchase_value",
      "current_value",
      "coverage_ratio",
      "provenance",
      "metric_run_uuid"
    ].forEach((p) => {
      const m = l[p];
      m != null && (u[p] = m);
    });
    const d = (p, m = []) => {
      const _ = l[p], h = c && c[p] && typeof c[p] == "object" ? c[p] : void 0;
      if (!_ || typeof _ != "object") {
        _ !== void 0 && (u[p] = _);
        return;
      }
      const y = {
        ...h ?? {},
        ..._
      };
      m.forEach((b) => {
        const v = h?.[b];
        v != null && (y[b] = v);
      }), u[p] = y;
    };
    return d("performance", ["gain_pct", "total_change_pct"]), d("aggregation"), d("average_cost"), d("data_state"), f;
  }, a = Array.isArray(n.positions) ? n.positions : [], i = new Map(
    a.filter((c) => c.security_uuid).map((c) => [c.security_uuid, c])
  ), o = t.filter((c) => !!c).map((c) => {
    const l = c.security_uuid ? i.get(c.security_uuid) : void 0;
    return r(l, c);
  }).map(Oe), s = {
    ...n,
    positions: o
  };
  he.set(e, s);
}
function ai() {
  return Array.from(he.values(), (e) => Qt(e));
}
function or() {
  return {
    accounts: ti(),
    portfolios: ai()
  };
}
const ii = "unknown-account";
function Z(e) {
  return typeof e != "number" || !Number.isFinite(e) ? null : e;
}
function bn(e) {
  const t = Z(e);
  return t == null ? 0 : Math.trunc(t);
}
function ee(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t.length > 0 ? t : null;
}
function sr(e, t) {
  return ee(e) ?? t;
}
function cr(e) {
  return e == null || !Number.isFinite(e) ? null : e < 0 ? 0 : e > 1 ? 1 : e;
}
function lr(e) {
  return e.split(/[\s_-]+/).filter(Boolean).map(
    (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
  ).join(" ");
}
function ur(e) {
  const t = oi(e);
  if (!t)
    return null;
  const n = t;
  return {
    key: `provenance-${t}`,
    label: `Quelle: ${n}`,
    tone: "neutral",
    description: "Backend-Provenance zur Nachverfolgung der Kennzahlen."
  };
}
function oi(e) {
  const t = ee(e);
  if (!t)
    return null;
  const n = si(t);
  return n || lr(t);
}
function si(e) {
  const t = e.trim();
  if (!t.startsWith("{") && !t.startsWith("["))
    return null;
  try {
    const n = JSON.parse(t), r = ci(n), a = n && typeof n == "object" ? ee(
      n.provider ?? n.source
    ) : null;
    if (r.length && a)
      return `${lr(a)} (${r.join(", ")})`;
    if (r.length)
      return `FX (${r.join(", ")})`;
  } catch {
    return null;
  }
  return null;
}
function ci(e) {
  const t = (r) => {
    if (typeof r != "string")
      return null;
    const a = r.trim();
    return a ? a.toUpperCase() : null;
  }, n = (r) => r.map(t).filter((a) => !!a);
  if (Array.isArray(e))
    return n(e);
  if (e && typeof e == "object") {
    const r = e.currencies;
    if (Array.isArray(r))
      return n(r);
  }
  return [];
}
function li(e) {
  if (!e)
    return null;
  const t = ee(e.uuid) ?? `${ii}-${e.name ?? "0"}`, n = sr(e.name, "Unbenanntes Konto"), r = ee(e.currency_code), a = Z(e.balance), i = Z(e.orig_balance), o = "coverage_ratio" in e ? cr(Z(e.coverage_ratio)) : null, s = ee(e.provenance), c = ee(e.metric_run_uuid), l = e.fx_unavailable === !0, f = Z(e.fx_rate), u = ee(e.fx_rate_source), g = ee(e.fx_rate_timestamp), d = [], p = ur(s);
  p && d.push(p);
  const m = {
    uuid: t,
    name: n,
    currency_code: r,
    balance: a,
    orig_balance: i,
    fx_unavailable: l,
    coverage_ratio: o,
    provenance: s,
    metric_run_uuid: null,
    fx_rate: f,
    fx_rate_source: u,
    fx_rate_timestamp: g,
    badges: d
  }, _ = typeof c == "string" ? c : null;
  return m.metric_run_uuid = _, m;
}
function ui(e) {
  if (!e)
    return null;
  const t = ee(e.uuid);
  if (!t)
    return null;
  const n = sr(e.name, "Unbenanntes Depot"), r = bn(e.position_count), a = bn(e.missing_value_positions), i = Z(e.current_value), o = Z(e.purchase_sum) ?? Z(e.purchase_value_eur) ?? Z(e.purchase_value) ?? 0, s = Z(e.day_change_abs) ?? null, c = Z(e.day_change_pct) ?? null, l = me(e.performance), f = l?.gain_abs ?? null, u = l?.gain_pct ?? null, g = l?.day_change ?? null;
  let d = s ?? (g?.value_change_eur != null ? Z(g.value_change_eur) : null), p = c ?? (g?.change_pct != null ? Z(g.change_pct) : null);
  if (d == null && p != null && i != null) {
    const N = i / (1 + p / 100);
    N && (d = i - N);
  }
  if (p == null && d != null && i != null) {
    const N = i - d;
    N && (p = d / N * 100);
  }
  const m = i != null, _ = e.has_current_value === !1 || !m, h = "coverage_ratio" in e ? cr(Z(e.coverage_ratio)) : null, y = ee(e.provenance), b = ee(e.metric_run_uuid), v = [], P = ur(y);
  P && v.push(P);
  const C = {
    uuid: t,
    name: n,
    position_count: r,
    current_value: i,
    purchase_sum: o,
    day_change_abs: d ?? null,
    day_change_pct: p ?? null,
    gain_abs: f,
    gain_pct: u,
    hasValue: m,
    fx_unavailable: _ || a > 0,
    missing_value_positions: a,
    performance: l,
    coverage_ratio: h,
    provenance: y,
    metric_run_uuid: null,
    badges: v
  }, w = typeof b == "string" ? b : null;
  return C.metric_run_uuid = w, C;
}
function dr() {
  const { accounts: e } = or();
  return e.map(li).filter((t) => !!t);
}
function di() {
  const { portfolios: e } = or();
  return e.map(ui).filter((t) => !!t);
}
function fr(e, t = {}) {
  if (!e || e.length === 0)
    return "";
  const n = ["meta-badges", t.containerClass].filter(Boolean).join(" "), r = e.map((a) => {
    const i = `meta-badge--${a.tone}`, o = a.description ? ` title="${D(a.description)}"` : "";
    return `<span class="meta-badge ${i}"${o}>${D(
      a.label
    )}</span>`;
  }).join("");
  return `<span class="${n}">${r}</span>`;
}
function at(e, t, n = {}) {
  const r = fr(t, n);
  if (!r)
    return D(e);
  const a = n.labelClass ?? "name-with-badges__label";
  return `<span class="${["name-with-badges", n.containerClass].filter(Boolean).join(" ")}"><span class="${a}">${D(
    e
  )}</span>${r}</span>`;
}
function pr(e, t, n, r) {
  e[t] = {
    previous: n,
    current: r
  };
}
const oe = /* @__PURE__ */ new Map(), Ue = /* @__PURE__ */ new Map();
function fi(e) {
  if (typeof e == "string") {
    const t = e.trim();
    return t.length > 0 ? t : "Unbekannter Fehler";
  }
  if (e instanceof Error) {
    const t = e.message.trim();
    return t.length > 0 ? t : "Unbekannter Fehler";
  }
  if (e != null)
    try {
      const t = JSON.stringify(e);
      if (t && t !== "{}")
        return t;
    } catch {
    }
  return "Unbekannter Fehler";
}
function Te(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t.length > 0 ? t : null;
}
function Pe(e) {
  return typeof e == "number" && Number.isFinite(e) ? e : void 0;
}
function pi(e) {
  return e === null ? null : Pe(e);
}
function gi(e) {
  return e === null ? null : Te(e);
}
function vn(e) {
  return (e ?? []).filter(
    (t) => !t.key.endsWith("-coverage") && !t.key.startsWith("provenance-")
  );
}
function Sn(e) {
  return me(e.performance);
}
const hi = 500, mi = 10, yi = "pp-reader:portfolio-positions-updated", _i = "pp-reader:diagnostics", At = /* @__PURE__ */ new Map(), gr = [
  "coverage_ratio",
  "provenance",
  "metric_run_uuid",
  "generated_at"
], $t = /* @__PURE__ */ new Map();
function bi(e, t) {
  return `${e}:${t}`;
}
function vi(e) {
  if (e === void 0)
    return;
  if (e === null)
    return null;
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  const t = pi(e);
  if (t === null)
    return null;
  if (typeof t == "number" && Number.isFinite(t))
    return t;
}
function Ct(e) {
  if (e !== void 0)
    return gi(e);
}
function en(e, t, n, r) {
  const a = {}, i = vi(e);
  i !== void 0 && (a.coverage_ratio = i);
  const o = Ct(t);
  o !== void 0 && (a.provenance = o);
  const s = Ct(n);
  s !== void 0 && (a.metric_run_uuid = s);
  const c = Ct(r);
  return c !== void 0 && (a.generated_at = c), Object.keys(a).length > 0 ? a : null;
}
function Si(e, t) {
  const n = {};
  let r = !1;
  for (const a of gr) {
    const i = e?.[a], o = t[a];
    i !== o && (pr(n, a, i, o), r = !0);
  }
  return r ? n : null;
}
function Pi(e) {
  const t = {};
  let n = !1;
  for (const r of gr) {
    const a = e[r];
    a !== void 0 && (pr(t, r, a, void 0), n = !0);
  }
  return n ? t : null;
}
function Pn(e) {
  if (Object.keys(e.changed).length) {
    try {
      console.debug("pp-reader:diagnostics", e);
    } catch {
    }
    if (!(typeof window > "u" || typeof window.dispatchEvent != "function"))
      try {
        window.dispatchEvent(new CustomEvent(_i, { detail: e }));
      } catch (t) {
        console.warn("updateConfigsWS: Diagnostics-Event konnte nicht gesendet werden", t);
      }
  }
}
function tn(e, t, n, r) {
  const a = bi(e, n), i = At.get(a);
  if (!r) {
    if (!i)
      return;
    At.delete(a);
    const s = Pi(i);
    if (!s)
      return;
    Pn({
      kind: e,
      uuid: n,
      source: t,
      changed: s,
      snapshot: {},
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    return;
  }
  const o = Si(i, r);
  o && (At.set(a, { ...r }), Pn({
    kind: e,
    uuid: n,
    source: t,
    changed: o,
    snapshot: { ...r },
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  }));
}
function Ai(e) {
  if (!(!e || e.length === 0))
    for (const t of e) {
      const n = Te(t.uuid);
      if (!n)
        continue;
      const r = en(
        t.coverage_ratio,
        t.provenance,
        t.metric_run_uuid,
        void 0
      );
      tn("account", "accounts", n, r);
    }
}
function Ci(e) {
  if (!(!e || e.length === 0))
    for (const t of e) {
      const n = Te(t.uuid);
      if (!n)
        continue;
      const r = en(
        t.coverage_ratio,
        t.provenance,
        t.metric_run_uuid,
        void 0
      );
      tn("portfolio", "portfolio_values", n, r);
    }
}
function wi(e, t) {
  if (!t)
    return;
  const n = en(
    t.coverage_ratio ?? t.normalized_payload?.coverage_ratio,
    t.provenance ?? t.normalized_payload?.provenance,
    t.metric_run_uuid ?? t.normalized_payload?.metric_run_uuid,
    t.normalized_payload?.generated_at
  );
  tn("portfolio_positions", "portfolio_positions", e, n);
}
function Ni(e, t) {
  return `<div class="error">${D(fi(e))} <button class="retry-pos" data-portfolio="${t}">Erneut laden</button></div>`;
}
function Ei(e, t, n) {
  const r = e.querySelector("table.sortable-positions");
  if (!r) return;
  const a = e.dataset.sortKey || r.dataset.defaultSort || "name", o = (e.dataset.sortDir || r.dataset.defaultDir || "asc") === "desc" ? "desc" : "asc";
  e.dataset.sortKey = a, e.dataset.sortDir = o;
  try {
    Wn(r, a, o, !0);
  } catch (l) {
    console.warn("restoreSortAndInit: sortTableRows Fehler:", l);
  }
  const { attachPortfolioPositionsSorting: s, attachSecurityDetailListener: c } = Zt();
  if (s)
    try {
      s(t, n);
    } catch (l) {
      console.warn("restoreSortAndInit: attachPortfolioPositionsSorting Fehler:", l);
    }
  if (c)
    try {
      c(t, n);
    } catch (l) {
      console.warn("restoreSortAndInit: attachSecurityDetailListener Fehler:", l);
    }
}
function hr(e, t, n, r) {
  if (!e || !t)
    return { applied: !1, reason: "invalid" };
  const a = e.querySelector(
    `.portfolio-table .portfolio-details[data-portfolio="${t}"]`
  );
  if (!a)
    return { applied: !1, reason: "missing" };
  const i = a.querySelector(".positions-container");
  if (!i)
    return { applied: !1, reason: "missing" };
  if (a.classList.contains("hidden"))
    return { applied: !1, reason: "hidden" };
  if (r)
    return i.innerHTML = Ni(r, t), { applied: !0 };
  const o = i.dataset.sortKey, s = i.dataset.sortDir;
  return i.innerHTML = yr(n), o && (i.dataset.sortKey = o), s && (i.dataset.sortDir = s), Ei(i, e, t), { applied: !0 };
}
function nn(e, t) {
  const n = oe.get(t);
  if (!n) return !1;
  const r = hr(
    e,
    t,
    n.positions,
    n.error
  );
  return r.applied && oe.delete(t), r.applied;
}
function xi(e) {
  let t = !1;
  for (const [n] of oe)
    nn(e, n) && (t = !0);
  return t;
}
function mr(e, t) {
  const n = Ue.get(t) ?? {
    attempts: 0,
    timer: null
  };
  n.timer || (n.timer = setTimeout(() => {
    n.timer = null, n.attempts += 1;
    const r = nn(e, t);
    r || n.attempts >= mi ? (Ue.delete(t), r || oe.delete(t)) : mr(e, t);
  }, hi), Ue.set(t, n));
}
function Fi(e, t) {
  console.log("updateConfigsWS: Kontodaten-Update erhalten:", e);
  const n = Array.isArray(e) ? e : [];
  if (ir(n), Ai(n), !t)
    return;
  const r = dr();
  ki(r, t);
  const a = t.querySelector(".portfolio-table table"), i = a ? Array.from(
    a.querySelectorAll("tbody tr.portfolio-row")
  ).map((o) => {
    const s = o.dataset.currentValue, c = s ? Number.parseFloat(s) : Number.NaN;
    if (Number.isFinite(c))
      return {
        current_value: c
      };
    const l = o.cells.item(3), f = Je(l?.textContent);
    return {
      current_value: Number.isFinite(f) ? f : 0
    };
  }) : [];
  _r(r, i, t);
}
function ki(e, t) {
  const n = t.querySelector(".account-table"), r = t.querySelector(".fx-account-table"), a = e.filter((o) => (o.currency_code || "EUR") === "EUR"), i = e.filter((o) => (o.currency_code || "EUR") !== "EUR");
  if (n) {
    const o = a.map((s) => ({
      name: at(s.name, vn(s.badges), {
        containerClass: "account-name",
        labelClass: "account-name__label"
      }),
      balance: s.balance ?? null
    }));
    n.innerHTML = xe(
      o,
      [
        { key: "name", label: "Name" },
        { key: "balance", label: "Kontostand (EUR)", align: "right" }
      ],
      ["balance"]
    );
  } else
    console.warn("updateAccountTable: .account-table nicht gefunden.");
  if (r) {
    const o = i.map((s) => {
      const c = s.orig_balance, l = typeof c == "number" && Number.isFinite(c), f = Te(s.currency_code), u = l ? c.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) : null, g = u ? f ? `${u} ${f}` : u : "";
      return {
        name: at(s.name, vn(s.badges), {
          containerClass: "account-name",
          labelClass: "account-name__label"
        }),
        fx_display: g,
        balance: s.balance ?? null
      };
    });
    r.innerHTML = xe(
      o,
      [
        { key: "name", label: "Name" },
        { key: "fx_display", label: "Betrag (FX)" },
        { key: "balance", label: "EUR", align: "right" }
      ],
      ["balance"]
    );
  } else i.length && console.warn("updateAccountTable: .fx-account-table nicht gefunden, obwohl FX-Konten vorhanden sind.");
}
function Di(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = Gn(n);
    r && t.push(r);
  }
  return t;
}
function Ri(e, t) {
  if (!Array.isArray(e)) {
    console.warn("handlePortfolioUpdate: Update ist kein Array:", e);
    return;
  }
  try {
    console.debug("handlePortfolioUpdate: payload=", e);
  } catch {
  }
  const n = Di(e);
  if (n.length && ri(n), Ci(n), !t)
    return;
  const r = t.querySelector(".portfolio-table table") || t.querySelector("table.expandable-portfolio-table");
  if (!r) {
    !t.querySelector(".portfolio-table") && (t.querySelector(".security-range-selector") || t.querySelector(".security-detail-placeholder")) ? console.debug(
      "handlePortfolioUpdate: Übersicht nicht aktiv – Update wird später angewendet."
    ) : console.warn("handlePortfolioUpdate: Keine Portfolio-Tabelle gefunden.");
    return;
  }
  const a = r.tBodies.item(0) ?? r.querySelector("tbody");
  if (!a) {
    console.warn("handlePortfolioUpdate: Kein <tbody> in Tabelle.");
    return;
  }
  const i = (u) => {
    if (typeof Intl < "u")
      try {
        const d = typeof navigator < "u" && navigator.language ? navigator.language : "de-DE";
        return new Intl.NumberFormat(d, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(u);
      } catch {
      }
    return (yt(u, { fallback: 0 }) ?? 0).toFixed(2).replace(".", ",");
  }, o = /* @__PURE__ */ new Map();
  a.querySelectorAll("tr.portfolio-row").forEach((u) => {
    const g = u.dataset.portfolio;
    g && o.set(g, u);
  });
  let c = 0;
  const l = (u) => {
    const g = typeof u == "number" && Number.isFinite(u) ? u : 0;
    try {
      return g.toLocaleString("de-DE");
    } catch {
      return g.toString();
    }
  }, f = /* @__PURE__ */ new Map();
  for (const u of n) {
    const g = Te(u.uuid);
    g && f.set(g, u);
  }
  for (const [u, g] of f.entries()) {
    const d = o.get(u);
    if (!d)
      continue;
    d.cells.length < 8 && console.warn("handlePortfolioUpdate: Unerwartetes Spaltenlayout", d.cells.length);
    const p = d.cells.item(1), m = d.cells.item(2), _ = d.cells.item(3), h = d.cells.item(4), y = d.cells.item(5), b = d.cells.item(6), v = d.cells.item(7);
    if (!p || !m || !_)
      continue;
    const P = typeof g.position_count == "number" && Number.isFinite(g.position_count) ? g.position_count : 0, C = typeof g.current_value == "number" && Number.isFinite(g.current_value) ? g.current_value : null, w = me(g.performance), N = typeof w?.gain_abs == "number" ? w.gain_abs : null, k = typeof w?.gain_pct == "number" ? w.gain_pct : null, I = typeof g.purchase_sum == "number" && Number.isFinite(g.purchase_sum) ? g.purchase_sum : typeof g.purchase_value == "number" && Number.isFinite(g.purchase_value) ? g.purchase_value : null, A = w?.day_change ?? null, x = Pe(g.day_change_abs) ?? Pe(A?.value_change_eur) ?? Pe(A?.price_change_eur), z = Pe(g.day_change_pct) ?? Pe(A?.change_pct);
    let E = x ?? null, R = z ?? null;
    if (E == null && R != null && C != null) {
      const G = C / (1 + R / 100);
      G && (E = C - G);
    }
    if (R == null && E != null && C != null) {
      const G = C - E;
      G && (R = E / G * 100);
    }
    const K = typeof g.missing_value_positions == "number" && Number.isFinite(g.missing_value_positions) ? g.missing_value_positions : 0, S = C !== null, F = g.has_current_value === !1 || K > 0 || !S, L = Je(_.textContent);
    Je(p.textContent) !== P && (p.textContent = l(P));
    const T = {
      fx_unavailable: F,
      current_value: C,
      performance: w
    }, V = { hasValue: S }, W = M("purchase_value", I, T, V);
    m.innerHTML !== W && (m.innerHTML = W);
    const j = M("current_value", T.current_value, T, V), X = typeof C == "number" ? C : 0;
    if ((Math.abs(L - X) >= 5e-3 || _.innerHTML !== j) && (_.innerHTML = j, d.classList.add("flash-update"), setTimeout(() => {
      d.classList.remove("flash-update");
    }, 800)), h && (h.innerHTML = M("day_change_abs", E, T, V)), y && (y.innerHTML = M("day_change_pct", R, T, V)), b) {
      const G = M("gain_abs", N, T, V);
      b.innerHTML = G;
      const _e = typeof k == "number" && Number.isFinite(k) ? k : null;
      b.dataset.gainPct = _e != null ? `${i(_e)} %` : "—", b.dataset.gainSign = _e != null ? _e > 0 ? "positive" : _e < 0 ? "negative" : "neutral" : "neutral";
    }
    v && (v.innerHTML = M("gain_pct", k, T, V)), d.dataset.positionCount = P.toString(), d.dataset.purchaseSum = I != null ? I.toString() : "", d.dataset.currentValue = S ? X.toString() : "", d.dataset.dayChange = S && E != null ? E.toString() : "", d.dataset.dayChangePct = S && R != null ? R.toString() : "", d.dataset.gainAbs = N != null ? N.toString() : "", d.dataset.gainPct = k != null ? k.toString() : "", d.dataset.hasValue = S ? "true" : "false", d.dataset.fxUnavailable = F ? "true" : "false", d.dataset.coverageRatio = typeof g.coverage_ratio == "number" && Number.isFinite(g.coverage_ratio) ? g.coverage_ratio.toString() : "", d.dataset.provenance = typeof g.provenance == "string" ? g.provenance : "", d.dataset.metricRunUuid = typeof g.metric_run_uuid == "string" ? g.metric_run_uuid : "", c += 1;
  }
  if (c === 0)
    console.debug("handlePortfolioUpdate: Keine passenden Zeilen gefunden / keine Änderungen.");
  else {
    const u = c.toLocaleString("de-DE");
    console.debug(`handlePortfolioUpdate: ${u} Zeile(n) gepatcht.`);
  }
  try {
    Mi(r);
  } catch (u) {
    console.warn("handlePortfolioUpdate: Fehler bei Summen-Neuberechnung:", u);
  }
  try {
    const u = (...h) => {
      for (const y of h) {
        if (!y) continue;
        const b = t.querySelector(y);
        if (b) return b;
      }
      return null;
    }, g = u(
      ".account-table table",
      ".accounts-eur-table table",
      ".accounts-table table"
    ), d = u(
      ".fx-account-table table",
      ".accounts-fx-table table"
    ), p = (h, y) => {
      if (!h) return [];
      const b = h.querySelectorAll("tbody tr.account-row");
      return (b.length ? Array.from(b) : Array.from(h.querySelectorAll("tbody tr:not(.footer-row)"))).map((P) => {
        const C = y ? P.cells.item(2) : P.cells.item(1);
        return { balance: Je(C?.textContent) };
      });
    }, m = [
      ...p(g, !1),
      ...p(d, !0)
    ], _ = Array.from(
      r.querySelectorAll("tbody tr.portfolio-row")
    ).map((h) => {
      const y = h.dataset.currentValue, b = h.dataset.purchaseSum, v = y ? Number.parseFloat(y) : Number.NaN, P = b ? Number.parseFloat(b) : Number.NaN;
      return {
        current_value: Number.isFinite(v) ? v : 0,
        purchase_sum: Number.isFinite(P) ? P : 0
      };
    });
    _r(m, _, t);
  } catch (u) {
    console.warn("handlePortfolioUpdate: Fehler bei Total-Neuberechnung:", u);
  }
}
function Ti(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e.portfolio_uuid;
  if (typeof t == "string" && t)
    return t;
  const n = e.portfolioUuid;
  return typeof n == "string" && n ? n : null;
}
function Lt(e) {
  $t.delete(e);
}
function An(e) {
  return typeof e != "number" || !Number.isInteger(e) || e <= 0 ? null : e;
}
function $i(e, t, n, r) {
  if (!n || n <= 1 || !t)
    return Lt(e), r;
  const a = n, i = $t.get(e) ?? { expected: a, chunks: /* @__PURE__ */ new Map() };
  if (i.expected !== a && (i.chunks.clear(), i.expected = a), i.chunks.set(t, r), $t.set(e, i), i.chunks.size < a)
    return null;
  const o = [];
  for (let s = 1; s <= a; s += 1) {
    const c = i.chunks.get(s);
    c && Array.isArray(c) && o.push(...c);
  }
  return Lt(e), o;
}
function Cn(e, t) {
  const n = Ti(e);
  if (!n)
    return console.warn("handlePortfolioPositionsUpdate: Ungültiges Update:", e), !1;
  const r = e?.error, a = An(e?.chunk_index), i = An(e?.chunk_count), o = bt(e?.positions ?? []);
  r && Lt(n);
  const s = r ? o : $i(n, a, i, o);
  if (!r && s === null)
    return !0;
  const c = r ? o : s ?? [];
  wi(n, e);
  const l = _t(n);
  let f = c;
  if (!r && l) {
    const g = nt(n, c);
    rt(n, g), f = g;
  }
  const u = hr(t, n, f, r);
  if (u.applied) {
    if (oe.delete(n), !r && !l) {
      const g = nt(n, f);
      rt(n, g);
    }
  } else
    r || u.reason !== "hidden" || l ? (oe.set(n, { positions: f, error: r }), mr(t, n)) : (oe.delete(n), Ue.delete(n));
  if (!r && o.length > 0) {
    const g = Array.from(
      new Set(
        o.map((d) => d.security_uuid).filter((d) => typeof d == "string" && d.length > 0)
      )
    );
    if (g.length && typeof window < "u")
      try {
        window.dispatchEvent(
          new CustomEvent(
            yi,
            {
              detail: {
                portfolioUuid: n,
                securityUuids: g
              }
            }
          )
        );
      } catch (d) {
        console.warn(
          "handlePortfolioPositionsUpdate: Dispatch des Portfolio-Events fehlgeschlagen",
          d
        );
      }
  }
  return !0;
}
function Li(e, t) {
  if (Array.isArray(e)) {
    let n = !1;
    for (const r of e)
      Cn(r, t) && (n = !0);
    !n && e.length && console.warn("handlePortfolioPositionsUpdate: Kein gültiges Element im Array:", e);
    return;
  }
  Cn(e, t);
}
function yr(e) {
  const { renderPositionsTable: t, applyGainPctMetadata: n } = Zt();
  try {
    if (typeof t == "function")
      return t(e);
  } catch {
  }
  if (e.length === 0)
    return '<div class="no-positions">Keine Positionen vorhanden.</div>';
  const r = e.map((i) => {
    const o = Sn(i);
    return {
      name: D(i.name),
      current_holdings: i.current_holdings,
      purchase_value: i.purchase_value,
      current_value: i.current_value,
      performance: o
    };
  }), a = xe(
    r,
    [
      { key: "name", label: "Wertpapier" },
      { key: "current_holdings", label: "Bestand", align: "right" },
      { key: "purchase_value", label: "Kaufwert", align: "right" },
      { key: "current_value", label: "Aktueller Wert", align: "right" },
      { key: "gain_abs", label: "+/-", align: "right" },
      { key: "gain_pct", label: "%", align: "right" }
    ],
    ["purchase_value", "current_value", "gain_abs"]
  );
  try {
    const i = document.createElement("template");
    i.innerHTML = a.trim();
    const o = i.content.querySelector("table");
    if (o) {
      o.classList.add("sortable-positions");
      const s = o.querySelectorAll("thead th"), c = ["name", "current_holdings", "purchase_value", "current_value", "gain_abs", "gain_pct"];
      s.forEach((u, g) => {
        const d = c[g];
        if (!d) return;
        u.setAttribute("data-sort-key", d), u.classList.add("sortable-col"), u.setAttribute("role", "button"), u.setAttribute("tabindex", "0"), u.setAttribute("aria-sort", "none");
        const p = u.textContent || "";
        u.setAttribute("aria-label", `${D(p)} sortieren`);
      }), o.querySelectorAll("tbody tr").forEach((u, g) => {
        if (u.classList.contains("footer-row"))
          return;
        const d = e[g];
        d.security_uuid && (u.dataset.security = d.security_uuid), u.classList.add("position-row");
      }), o.dataset.defaultSort = "name", o.dataset.defaultDir = "asc";
      const f = n;
      if (f)
        try {
          f(o);
        } catch (u) {
          console.warn("renderPositionsTableInline: applyGainPctMetadata failed", u);
        }
      else
        o.querySelectorAll("tbody tr").forEach((g, d) => {
          if (g.classList.contains("footer-row"))
            return;
          const p = g.cells.item(4);
          if (!p)
            return;
          const m = e[d], _ = Sn(m), h = typeof _?.gain_pct == "number" && Number.isFinite(_.gain_pct) ? _.gain_pct : null, y = h != null ? `${h.toLocaleString("de-DE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })} %` : "—", b = h == null ? "neutral" : h > 0 ? "positive" : h < 0 ? "negative" : "neutral";
          p.dataset.gainPct = y, p.dataset.gainSign = b;
        });
      return o.outerHTML;
    }
  } catch (i) {
    console.warn("renderPositionsTableInline: Sortier-Metadaten Injection fehlgeschlagen:", i);
  }
  return a;
}
function Mi(e) {
  if (!e) return;
  const { updatePortfolioFooter: t } = Zt();
  if (typeof t == "function")
    try {
      t(e);
      return;
    } catch (h) {
      console.warn("updatePortfolioFooter: helper schlug fehl:", h);
    }
  const n = Array.from(e.querySelectorAll("tbody tr.portfolio-row")), r = (h) => {
    if (h === void 0)
      return null;
    const y = Number.parseFloat(h);
    return Number.isFinite(y) ? y : null;
  }, a = n.reduce(
    (h, y) => {
      const b = r(y.dataset.positionCount);
      if (b != null && (h.sumPositions += b), y.dataset.fxUnavailable === "true" && (h.fxUnavailable = !0), y.dataset.hasValue !== "true")
        return h.incompleteRows += 1, h;
      h.valueRows += 1;
      const v = r(y.dataset.currentValue), P = r(y.dataset.gainAbs), C = r(y.dataset.purchaseSum);
      return v == null || P == null || C == null ? (h.incompleteRows += 1, h) : (h.sumCurrent += v, h.sumGainAbs += P, h.sumPurchase += C, h);
    },
    {
      sumCurrent: 0,
      sumGainAbs: 0,
      sumPurchase: 0,
      sumPositions: 0,
      valueRows: 0,
      incompleteRows: 0,
      fxUnavailable: !1
    }
  ), i = a.valueRows > 0 && a.incompleteRows === 0, o = i && a.sumPurchase > 0 ? a.sumGainAbs / a.sumPurchase * 100 : null;
  let s = e.querySelector("tr.footer-row");
  s || (s = document.createElement("tr"), s.className = "footer-row", e.querySelector("tbody")?.appendChild(s));
  const c = Math.round(a.sumPositions).toLocaleString("de-DE"), l = {
    fx_unavailable: a.fxUnavailable || !i,
    current_value: i ? a.sumCurrent : null,
    performance: i ? {
      gain_abs: a.sumGainAbs,
      gain_pct: o,
      total_change_eur: a.sumGainAbs,
      total_change_pct: o,
      source: "aggregated",
      coverage_ratio: 1
    } : null
  }, f = { hasValue: i }, u = M("current_value", l.current_value, l, f), g = i ? a.sumGainAbs : null, d = i ? o : null, p = M("gain_abs", g, l, f), m = M("gain_pct", d, l, f);
  s.innerHTML = `
    <td>Summe</td>
    <td class="align-right">${c}</td>
    <td class="align-right">${u}</td>
    <td class="align-right">${p}</td>
    <td class="align-right">${m}</td>
  `;
  const _ = s.cells.item(3);
  _ && (_.dataset.gainPct = i && typeof o == "number" ? `${Mt(o)} %` : "—", _.dataset.gainSign = i && typeof o == "number" ? o > 0 ? "positive" : o < 0 ? "negative" : "neutral" : "neutral"), s.dataset.positionCount = Math.round(a.sumPositions).toString(), s.dataset.currentValue = i ? a.sumCurrent.toString() : "", s.dataset.purchaseSum = i ? a.sumPurchase.toString() : "", s.dataset.gainAbs = i ? a.sumGainAbs.toString() : "", s.dataset.gainPct = i && typeof o == "number" ? o.toString() : "", s.dataset.hasValue = i ? "true" : "false", s.dataset.fxUnavailable = a.fxUnavailable || !i ? "true" : "false";
}
function wn(e) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  if (typeof e == "string") {
    const t = Number.parseFloat(e);
    return Number.isFinite(t) ? t : 0;
  }
  return 0;
}
function Mt(e) {
  return (yt(e, { fallback: 0 }) ?? 0).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
function _r(e, t, n) {
  const r = n ?? document, i = (Array.isArray(e) ? e : []).reduce((u, g) => {
    const d = g.balance ?? g.current_value ?? g.value, p = wn(d);
    return u + p;
  }, 0), s = (Array.isArray(t) ? t : []).reduce((u, g) => {
    const d = g.current_value ?? g.value, p = wn(d);
    return u + p;
  }, 0), c = i + s, l = r.querySelector("#headerMeta");
  if (!l) {
    console.warn("updateTotalWealth: #headerMeta nicht gefunden.");
    return;
  }
  const f = l.querySelector("strong") || l.querySelector(".total-wealth-value");
  f ? f.textContent = `${Mt(c)} €` : l.textContent = `💰 Gesamtvermögen: ${Mt(c)} €`, l.dataset.totalWealthEur = c.toString();
}
function Hi(e, t) {
  const n = typeof e == "string" ? e : e?.last_file_update, r = Te(n) ?? "";
  if (!t) {
    console.warn("handleLastFileUpdate: root fehlt");
    return;
  }
  let a = t.querySelector(".footer-card .last-file-update") || t.querySelector(".last-file-update");
  if (!a) {
    const i = t.querySelector(".footer-card .meta") || t.querySelector("#headerMeta") || t.querySelector(".header-card .meta") || t.querySelector(".header-card");
    if (!i) {
      console.warn("handleLastFileUpdate: Kein Einfügepunkt gefunden.");
      return;
    }
    a = document.createElement("div"), a.className = "last-file-update", i.appendChild(a);
  }
  a.closest(".footer-card") ? a.innerHTML = r ? `📂 Letzte Aktualisierung der Datei: <strong>${r}</strong>` : "📂 Letzte Aktualisierung der Datei: <strong>Unbekannt</strong>" : a.textContent = r ? `📂 Letzte Aktualisierung: ${r}` : "📂 Letzte Aktualisierung: Unbekannt";
}
function Es(e) {
  if (e == null)
    return;
  const t = e.querySelector("table.sortable-positions");
  if (t == null)
    return;
  const n = e.dataset.sortKey || t.dataset.defaultSort || "name", a = (e.dataset.sortDir || t.dataset.defaultDir || "asc") === "desc" ? "desc" : "asc";
  e.dataset.sortKey = n, e.dataset.sortDir = a, Wn(t, n, a, !0);
}
const xs = {
  getPortfolioPositionsCacheSnapshot: Xa,
  clearPortfolioPositionsCache: Ga,
  getPendingUpdateCount() {
    return oe.size;
  },
  queuePendingUpdate(e, t, n) {
    oe.set(e, { positions: t, error: n });
  },
  clearPendingUpdates() {
    oe.clear(), Ue.clear();
  },
  renderPositionsTableInline: yr
};
function Je(e) {
  return e == null ? 0 : parseFloat(
    e.replace(/\u00A0/g, " ").replace(/[€%]/g, "").replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "")
  ) || 0;
}
const Ii = [
  "name",
  "current_holdings",
  "average_price",
  "purchase_value",
  "current_value",
  "day_change_abs",
  "day_change_pct",
  "gain_abs",
  "gain_pct"
];
function wt(e) {
  return Ii.includes(e);
}
function Nt(e) {
  return e === "asc" || e === "desc";
}
function br(e) {
  return (e ?? []).filter((t) => !t.key.endsWith("-coverage"));
}
function Nn(e) {
  return br(e).filter(
    (t) => !t.key.startsWith("provenance-")
  );
}
let it = null, ot = null;
const En = { min: 2, max: 6 };
function Me(e) {
  return le(e);
}
function Vi(e) {
  return typeof e == "number" && Number.isFinite(e);
}
function Ui(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  if (!t)
    return null;
  const n = t.toUpperCase();
  return /^[A-Z]{3}$/.test(n) ? n : n === "€" ? "EUR" : null;
}
function xn(e, t, n = null) {
  for (const r of t) {
    const a = Ui(e[r]);
    if (a)
      return a;
  }
  return n;
}
function Fn(e, t) {
  return Vi(e) ? `${e.toLocaleString("de-DE", {
    minimumFractionDigits: En.min,
    maximumFractionDigits: En.max
  })}${t ? ` ${t}` : ""}` : null;
}
function zi(e) {
  const t = e, n = e.average_cost ?? null, r = e.aggregation ?? null, a = xn(t, [
    "security_currency_code",
    "security_currency",
    "native_currency_code",
    "native_currency"
  ], e.currency_code ?? null), i = xn(
    t,
    [
      "account_currency_code",
      "account_currency",
      "purchase_currency_code",
      "currency_code"
    ],
    a === "EUR" ? "EUR" : null
  ) ?? "EUR", o = Me(n?.native), s = Me(n?.security), c = Me(n?.account), l = Me(n?.eur), f = s ?? o, u = l ?? (i === "EUR" ? c : null), g = a ?? i, d = g === "EUR";
  let p, m;
  d ? (p = "EUR", m = u ?? f ?? c ?? null) : f != null ? (p = g, m = f) : c != null ? (p = i, m = c) : (p = "EUR", m = u ?? null);
  const _ = Fn(m, p), h = d ? null : Fn(u, "EUR"), y = !!h && h !== _, b = [], v = [];
  _ ? (b.push(
    `<span class="purchase-price purchase-price--primary">${_}</span>`
  ), v.push(_.replace(/\u00A0/g, " "))) : (b.push('<span class="missing-value" role="note" aria-label="Kein Kaufpreis verfügbar" title="Kein Kaufpreis verfügbar">—</span>'), v.push("Kein Kaufpreis verfügbar")), y && h && (b.push(
    `<span class="purchase-price purchase-price--secondary">${h}</span>`
  ), v.push(h.replace(/\u00A0/g, " ")));
  const P = b.join("<br>"), C = Me(r?.purchase_value_eur) ?? 0, w = v.join(", ");
  return { markup: P, sortValue: C, ariaLabel: w };
}
function qi(e) {
  const t = le(e.current_holdings);
  if (t == null)
    return { value: null, pct: null };
  const n = le(e.last_price_eur), r = le(e.last_close_eur);
  let a = null, i = null;
  if (n != null && r != null) {
    a = (n - r) * t;
    const u = r * t;
    u && (i = a / u * 100);
  }
  const s = me(e.performance)?.day_change ?? null;
  if (a == null && s?.price_change_eur != null && (a = s.price_change_eur * t), i == null && s?.change_pct != null && (i = s.change_pct), a == null && i != null) {
    const f = le(e.current_value);
    if (f != null) {
      const u = f / (1 + i / 100);
      u && (a = f - u);
    }
  }
  const c = a != null && Number.isFinite(a) ? Math.round(a * 100) / 100 : null, l = i != null && Number.isFinite(i) ? Math.round(i * 100) / 100 : null;
  return { value: c, pct: l };
}
const st = /* @__PURE__ */ new Set();
function vr(e) {
  if (!e)
    return;
  Array.from(e.querySelectorAll("tbody tr")).forEach((n) => {
    const r = n.cells.item(7), a = n.cells.item(8);
    if (!r || !a || r.dataset.gainPct && r.dataset.gainSign)
      return;
    const i = (a.textContent || "").trim() || "—";
    let o = "neutral";
    a.querySelector(".positive") ? o = "positive" : a.querySelector(".negative") && (o = "negative"), r.dataset.gainPct = i, r.dataset.gainSign = o;
  });
}
function We(e) {
  const t = e.filter((i) => Number(i.current_holdings) > 0);
  if (t.length === 0)
    return '<div class="no-positions">Keine Positionen vorhanden.</div>';
  const n = [
    { key: "name", label: "Wertpapier" },
    { key: "current_holdings", label: "Bestand", align: "right" },
    { key: "average_price", label: "Ø Kaufpreis", align: "right" },
    { key: "purchase_value", label: "Kaufpreis (EUR)", align: "right" },
    { key: "current_value", label: "Aktueller Wert", align: "right" },
    { key: "day_change_abs", label: "Heute +/-", align: "right" },
    { key: "day_change_pct", label: "Heute %", align: "right" },
    { key: "gain_abs", label: "Gesamt +/-", align: "right" },
    { key: "gain_pct", label: "Gesamt %", align: "right" }
  ], r = t.map((i) => {
    const o = me(i.performance), s = typeof o?.gain_abs == "number" ? o.gain_abs : null, c = typeof o?.gain_pct == "number" ? o.gain_pct : null, l = qi(i), f = typeof i.purchase_value == "number" || typeof i.purchase_value == "string" ? i.purchase_value : null;
    return {
      name: typeof i.name == "string" ? D(i.name) : typeof i.name == "number" ? String(i.name) : "",
      current_holdings: typeof i.current_holdings == "number" || typeof i.current_holdings == "string" ? i.current_holdings : null,
      average_price: typeof i.purchase_value == "number" || typeof i.purchase_value == "string" ? i.purchase_value : null,
      purchase_value: f,
      current_value: typeof i.current_value == "number" || typeof i.current_value == "string" ? i.current_value : null,
      day_change_abs: l.value,
      day_change_pct: l.pct,
      gain_abs: s,
      gain_pct: c,
      performance: o
    };
  }), a = xe(r, n, ["purchase_value", "current_value", "day_change_abs", "gain_abs"]);
  try {
    const i = document.createElement("template");
    i.innerHTML = a.trim();
    const o = i.content.querySelector("table");
    if (o) {
      o.classList.add("sortable-positions");
      const s = Array.from(o.querySelectorAll("thead th"));
      return n.forEach((l, f) => {
        const u = s.at(f);
        if (!u)
          return;
        u.setAttribute("data-sort-key", l.key), u.classList.add("sortable-col"), u.setAttribute("role", "button"), u.setAttribute("tabindex", "0"), u.setAttribute("aria-sort", "none");
        const g = u.textContent || "";
        u.setAttribute("aria-label", `${D(g)} sortieren`);
      }), o.querySelectorAll("tbody tr").forEach((l, f) => {
        if (l.classList.contains("footer-row") || f >= t.length)
          return;
        const u = t[f], g = typeof u.security_uuid == "string" ? u.security_uuid : null;
        g && (l.dataset.security = g), l.classList.add("position-row");
        const d = l.cells.item(2);
        if (d) {
          const { markup: _, sortValue: h, ariaLabel: y } = zi(u);
          d.innerHTML = _, d.dataset.sortValue = String(h), y ? d.setAttribute("aria-label", y) : d.removeAttribute("aria-label");
        }
        const p = l.cells.item(7);
        if (p) {
          const _ = me(u.performance), h = typeof _?.gain_pct == "number" && Number.isFinite(_.gain_pct) ? _.gain_pct : null, y = h != null ? `${h.toLocaleString("de-DE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })} %` : "—", b = h == null ? "neutral" : h > 0 ? "positive" : h < 0 ? "negative" : "neutral";
          p.dataset.gainPct = y, p.dataset.gainSign = b;
        }
        const m = l.cells.item(8);
        m && m.classList.add("gain-pct-cell");
      }), o.dataset.defaultSort = "name", o.dataset.defaultDir = "asc", vr(o), o.outerHTML;
    }
  } catch (i) {
    console.warn("renderPositionsTable: Konnte Sortier-Metadaten nicht injizieren:", i);
  }
  return a;
}
function Oi(e) {
  const t = bt(e ?? []);
  return We(t);
}
function Wi(e, t) {
  if (!t) return;
  const n = e.querySelector(
    `.portfolio-details[data-portfolio="${t}"]`
  );
  if (!n) return;
  const r = n.querySelector(".positions-container");
  r && (r.__ppReaderSecurityClickBound || (r.__ppReaderSecurityClickBound = !0, r.addEventListener("click", (a) => {
    const i = a.target;
    if (!(i instanceof Element))
      return;
    const o = i.closest("button, a");
    if (o && r.contains(o))
      return;
    const s = i.closest("tr[data-security]");
    if (!s || !r.contains(s))
      return;
    const c = s.getAttribute("data-security");
    if (c)
      try {
        ea(c) || console.warn("attachSecurityDetailDelegation: Detail-Tab konnte nicht geöffnet werden für", c);
      } catch (l) {
        console.error("attachSecurityDetailDelegation: Fehler beim Öffnen des Detail-Tabs", l);
      }
  })));
}
function Be(e, t) {
  Wi(e, t);
}
function Sr(e) {
  console.debug("buildExpandablePortfolioTable: render", e.length, "portfolios");
  const t = (S) => S == null || typeof S != "string" && typeof S != "number" && typeof S != "boolean" ? "" : D(S);
  let n = '<table class="expandable-portfolio-table"><thead><tr>';
  const r = [
    { key: "name", label: "Name" },
    { key: "position_count", label: "Anzahl Positionen", align: "right" },
    { key: "purchase_value", label: "Kaufwert", align: "right" },
    { key: "current_value", label: "Aktueller Wert", align: "right" },
    { key: "day_change_abs", label: "Heute +/-", align: "right" },
    { key: "day_change_pct", label: "Heute %", align: "right" },
    { key: "gain_abs", label: "Gesamt +/-", align: "right" },
    { key: "gain_pct", label: "Gesamt %", align: "right" }
  ];
  r.forEach((S) => {
    const F = S.align === "right" ? ' class="align-right"' : "";
    n += `<th${F}>${S.label}</th>`;
  }), n += "</tr></thead><tbody>", e.forEach((S) => {
    const F = Number.isFinite(S.position_count) ? S.position_count : 0, L = Number.isFinite(S.purchase_sum) ? S.purchase_sum : 0, Y = S.hasValue && typeof S.current_value == "number" && Number.isFinite(S.current_value) ? S.current_value : null, T = Y !== null, V = S.performance, W = typeof S.gain_abs == "number" ? S.gain_abs : typeof V?.gain_abs == "number" ? V.gain_abs : null, j = typeof S.gain_pct == "number" ? S.gain_pct : typeof V?.gain_pct == "number" ? V.gain_pct : null, X = V && typeof V == "object" ? V.day_change : null, G = typeof S.day_change_abs == "number" ? S.day_change_abs : X && typeof X == "object" ? X.value_change_eur ?? X.price_change_eur : null, $e = typeof S.day_change_pct == "number" ? S.day_change_pct : X && typeof X == "object" && typeof X.change_pct == "number" ? X.change_pct : null, _e = S.fx_unavailable && T, na = typeof S.coverage_ratio == "number" && Number.isFinite(S.coverage_ratio) ? S.coverage_ratio : "", ra = typeof S.provenance == "string" ? S.provenance : "", aa = typeof S.metric_run_uuid == "string" ? S.metric_run_uuid : "", Le = st.has(S.uuid), ia = Le ? "portfolio-toggle expanded" : "portfolio-toggle", un = `portfolio-details-${S.uuid}`, J = {
      fx_unavailable: S.fx_unavailable,
      purchase_value: L,
      current_value: Y,
      day_change_abs: G,
      day_change_pct: $e,
      gain_abs: W,
      gain_pct: j
    }, Se = { hasValue: T }, oa = M("purchase_value", J.purchase_value, J, Se), sa = M("current_value", J.current_value, J, Se), ca = M("day_change_abs", J.day_change_abs, J, Se), la = M("day_change_pct", J.day_change_pct, J, Se), ua = M("gain_abs", J.gain_abs, J, Se), da = M("gain_pct", J.gain_pct, J, Se), dn = T && typeof j == "number" && Number.isFinite(j) ? `${de(j)} %` : "", fa = T && typeof j == "number" && Number.isFinite(j) ? j > 0 ? "positive" : j < 0 ? "negative" : "neutral" : "", pa = T && typeof Y == "number" && Number.isFinite(Y) ? Y : "", ga = T && typeof W == "number" && Number.isFinite(W) ? W : "", ha = T && typeof j == "number" && Number.isFinite(j) ? j : "", ma = T && typeof G == "number" && Number.isFinite(G) ? G : "", ya = T && typeof $e == "number" && Number.isFinite($e) ? $e : "", _a = String(F);
    let St = "";
    dn && (St = ` data-gain-pct="${t(dn)}" data-gain-sign="${t(fa)}"`), _e && (St += ' data-partial="true"'), n += `<tr class="portfolio-row"
                  data-portfolio="${S.uuid}"
                  data-position-count="${_a}"
                  data-current-value="${t(pa)}"
                  data-purchase-sum="${t(L)}"
                  data-day-change="${t(ma)}"
                  data-day-change-pct="${t(ya)}"
                  data-gain-abs="${t(ga)}"
                data-gain-pct="${t(ha)}"
                data-has-value="${T ? "true" : "false"}"
                data-fx-unavailable="${S.fx_unavailable ? "true" : "false"}"
                data-coverage-ratio="${t(na)}"
                data-provenance="${t(ra)}"
                data-metric-run-uuid="${t(aa)}">`;
    const ba = D(S.name), va = fr(br(S.badges), {
      containerClass: "portfolio-badges"
    });
    n += `<td>
        <button type="button"
                class="${ia}"
                data-portfolio="${S.uuid}"
                aria-expanded="${Le ? "true" : "false"}"
                aria-controls="${un}">
          <span class="caret">${Le ? "▼" : "▶"}</span>
          <span class="portfolio-name">${ba}</span>${va}
        </button>
      </td>`;
    const Sa = F.toLocaleString("de-DE");
    n += `<td class="align-right">${Sa}</td>`, n += `<td class="align-right">${oa}</td>`, n += `<td class="align-right">${sa}</td>`, n += `<td class="align-right">${ca}</td>`, n += `<td class="align-right">${la}</td>`, n += `<td class="align-right"${St}>${ua}</td>`, n += `<td class="align-right gain-pct-cell">${da}</td>`, n += "</tr>", n += `<tr class="portfolio-details${Le ? "" : " hidden"}"
                data-portfolio="${S.uuid}"
                id="${un}"
                role="region"
                aria-label="Positionen für ${S.name}">
      <td colspan="${r.length.toString()}">
        <div class="positions-container">${Le ? _t(S.uuid) ? We(nr(S.uuid)) : Kt("Lade Positionen...") : ""}</div>
      </td>
    </tr>`;
  });
  const a = e.filter((S) => typeof S.current_value == "number" && Number.isFinite(S.current_value)), i = e.reduce((S, F) => S + (Number.isFinite(F.position_count) ? F.position_count : 0), 0), o = a.reduce((S, F) => typeof F.current_value == "number" && Number.isFinite(F.current_value) ? S + F.current_value : S, 0), s = a.reduce((S, F) => typeof F.purchase_sum == "number" && Number.isFinite(F.purchase_sum) ? S + F.purchase_sum : S, 0), c = a.map((S) => {
    if (typeof S.day_change_abs == "number")
      return S.day_change_abs;
    const F = S.performance && typeof S.performance == "object" ? S.performance.day_change : null;
    if (F && typeof F == "object") {
      const L = F.value_change_eur;
      if (typeof L == "number" && Number.isFinite(L))
        return L;
    }
    return null;
  }).filter((S) => typeof S == "number" && Number.isFinite(S)), l = c.reduce((S, F) => S + F, 0), f = a.reduce((S, F) => {
    if (typeof F.performance?.gain_abs == "number" && Number.isFinite(F.performance.gain_abs))
      return S + F.performance.gain_abs;
    const L = typeof F.current_value == "number" && Number.isFinite(F.current_value) ? F.current_value : 0, Y = typeof F.purchase_sum == "number" && Number.isFinite(F.purchase_sum) ? F.purchase_sum : 0;
    return S + (L - Y);
  }, 0), u = a.length > 0, g = a.length !== e.length, d = c.length > 0, p = d && u && o !== 0 ? (() => {
    const S = o - l;
    return S ? l / S * 100 : null;
  })() : null, m = u && s > 0 ? f / s * 100 : null, _ = {
    fx_unavailable: g,
    purchase_value: u ? s : null,
    current_value: u ? o : null,
    day_change_abs: d ? l : null,
    day_change_pct: d ? p : null,
    gain_abs: u ? f : null,
    gain_pct: u ? m : null
  }, h = { hasValue: u }, y = { hasValue: d }, b = M("purchase_value", _.purchase_value, _, h), v = M("current_value", _.current_value, _, h), P = M("day_change_abs", _.day_change_abs, _, y), C = M("day_change_pct", _.day_change_pct, _, y), w = M("gain_abs", _.gain_abs, _, h), N = M("gain_pct", _.gain_pct, _, h);
  let k = "";
  if (u && typeof m == "number" && Number.isFinite(m)) {
    const S = `${de(m)} %`, F = m > 0 ? "positive" : m < 0 ? "negative" : "neutral";
    k = ` data-gain-pct="${t(S)}" data-gain-sign="${t(F)}"`;
  }
  g && (k += ' data-partial="true"');
  const I = String(Math.round(i)), A = u ? String(o) : "", x = u ? String(s) : "", z = d ? String(l) : "", E = d && typeof p == "number" && Number.isFinite(p) ? String(p) : "", R = u ? String(f) : "", K = u && typeof m == "number" && Number.isFinite(m) ? String(m) : "";
  return n += `<tr class="footer-row"
      data-position-count="${I}"
      data-current-value="${t(A)}"
      data-purchase-sum="${t(x)}"
      data-day-change="${t(z)}"
      data-day-change-pct="${t(E)}"
      data-gain-abs="${t(R)}"
      data-gain-pct="${t(K)}"
      data-has-value="${u ? "true" : "false"}"
      data-fx-unavailable="${g ? "true" : "false"}">
      <td>Summe</td>
      <td class="align-right">${Math.round(i).toLocaleString("de-DE")}</td>
    <td class="align-right">${b}</td>
    <td class="align-right">${v}</td>
    <td class="align-right">${P}</td>
    <td class="align-right">${C}</td>
    <td class="align-right"${k}>${w}</td>
    <td class="align-right gain-pct-cell">${N}</td>
  </tr>`, n += "</tbody></table>", n;
}
function Bi(e) {
  if (e instanceof HTMLTableElement)
    return e;
  if (e && "querySelector" in e) {
    const t = e.querySelector("table.expandable-portfolio-table");
    if (t)
      return t;
    const n = e.querySelector(".portfolio-table table");
    if (n)
      return n;
    const r = e.querySelector("table");
    if (r)
      return r;
  }
  return document.querySelector(".portfolio-table table.expandable-portfolio-table") || document.querySelector(".portfolio-table table");
}
function He(e) {
  if (e === void 0)
    return null;
  const t = Number(e);
  return Number.isFinite(t) ? t : null;
}
function Pr(e) {
  const t = Bi(e);
  if (!t)
    return;
  const n = t.tBodies.item(0);
  if (!n)
    return;
  const r = Array.from(n.querySelectorAll("tr.portfolio-row"));
  if (!r.length)
    return;
  let a = 0, i = 0, o = 0, s = 0, c = 0, l = !1, f = !1, u = !0, g = !1;
  for (const L of r) {
    const Y = He(L.dataset.positionCount);
    Y != null && (a += Y), L.dataset.fxUnavailable === "true" && (g = !0);
    const T = L.dataset.hasValue;
    if (!!(T === "false" || T === "0" || T === "" || T == null)) {
      u = !1;
      continue;
    }
    l = !0;
    const W = He(L.dataset.currentValue), j = He(L.dataset.gainAbs), X = He(L.dataset.purchaseSum), G = He(L.dataset.dayChange);
    if (W == null || j == null || X == null) {
      u = !1;
      continue;
    }
    i += W, s += j, o += X, G != null && (c += G, f = !0);
  }
  const d = l && u, p = d && o > 0 ? s / o * 100 : null, m = f && d && i !== 0 ? (() => {
    const L = i - c;
    return L ? c / L * 100 : null;
  })() : null;
  let _ = Array.from(n.children).find(
    (L) => L instanceof HTMLTableRowElement && L.classList.contains("footer-row")
  );
  _ || (_ = document.createElement("tr"), _.classList.add("footer-row"), n.appendChild(_));
  const h = Math.round(a).toLocaleString("de-DE"), y = {
    fx_unavailable: g || !d,
    purchase_value: d ? o : null,
    current_value: d ? i : null,
    day_change_abs: f && d ? c : null,
    day_change_pct: f && d ? m : null,
    gain_abs: d ? s : null,
    gain_pct: d ? p : null
  }, b = { hasValue: d }, v = { hasValue: f && d }, P = M("purchase_value", y.purchase_value, y, b), C = M("current_value", y.current_value, y, b), w = M("day_change_abs", y.day_change_abs, y, v), N = M("day_change_pct", y.day_change_pct, y, v), k = M("gain_abs", y.gain_abs, y, b), I = M("gain_pct", y.gain_pct, y, b), A = t.tHead ? t.tHead.rows.item(0) : null, x = A ? A.cells.length : 0, z = _.cells.length, E = x || z, R = E > 0 ? E <= 5 : !1, K = d && typeof p == "number" ? `${de(p)} %` : "", S = d && typeof p == "number" ? p > 0 ? "positive" : p < 0 ? "negative" : "neutral" : "neutral";
  R ? _.innerHTML = `
      <td>Summe</td>
      <td class="align-right">${h}</td>
      <td class="align-right">${C}</td>
      <td class="align-right">${k}</td>
      <td class="align-right gain-pct-cell">${I}</td>
    ` : _.innerHTML = `
      <td>Summe</td>
      <td class="align-right">${h}</td>
      <td class="align-right">${P}</td>
      <td class="align-right">${C}</td>
      <td class="align-right">${w}</td>
      <td class="align-right">${N}</td>
      <td class="align-right">${k}</td>
      <td class="align-right">${I}</td>
    `;
  const F = _.cells.item(R ? 3 : 6);
  F && (F.dataset.gainPct = K || "—", F.dataset.gainSign = S), _.dataset.positionCount = String(Math.round(a)), _.dataset.currentValue = d ? String(i) : "", _.dataset.purchaseSum = d ? String(o) : "", _.dataset.dayChange = d && f ? String(c) : "", _.dataset.dayChangePct = d && f && typeof m == "number" ? String(m) : "", _.dataset.gainAbs = d ? String(s) : "", _.dataset.gainPct = d && typeof p == "number" ? String(p) : "", _.dataset.hasValue = d ? "true" : "false", _.dataset.fxUnavailable = g ? "true" : "false";
}
function je(e, t) {
  if (!t) return;
  const n = e.querySelector(
    `.portfolio-details[data-portfolio="${t}"]`
  );
  if (!n) return;
  const r = n.querySelector(".positions-container");
  if (!r) return;
  const a = r.querySelector("table.sortable-positions");
  if (!a || a.__ppReaderSortingBound) return;
  a.__ppReaderSortingBound = !0;
  const i = (d, p) => {
    const m = a.querySelector("tbody");
    if (!m) return;
    const _ = Array.from(m.querySelectorAll("tr")).filter((v) => !v.classList.contains("footer-row")), h = m.querySelector("tr.footer-row"), y = (v) => {
      if (v == null) return 0;
      const P = v.replace(/\u00A0/g, " ").replace(/[%€]/g, "").replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, ""), C = Number.parseFloat(P);
      return Number.isFinite(C) ? C : 0;
    };
    _.sort((v, P) => {
      const w = {
        name: 0,
        current_holdings: 1,
        average_price: 2,
        purchase_value: 3,
        current_value: 4,
        day_change_abs: 5,
        day_change_pct: 6,
        gain_abs: 7,
        gain_pct: 8
      }[d], N = v.cells.item(w), k = P.cells.item(w);
      let I = "";
      if (N) {
        const E = N.textContent;
        typeof E == "string" && (I = E.trim());
      }
      let A = "";
      if (k) {
        const E = k.textContent;
        typeof E == "string" && (A = E.trim());
      }
      const x = (E, R) => {
        const K = E ? E.dataset.sortValue : void 0;
        if (K != null && K !== "") {
          const S = Number(K);
          if (Number.isFinite(S))
            return S;
        }
        return y(R);
      };
      let z;
      if (d === "name")
        z = I.localeCompare(A, "de", { sensitivity: "base" });
      else {
        const E = x(N, I), R = x(k, A);
        z = E - R;
      }
      return p === "asc" ? z : -z;
    }), a.querySelectorAll("thead th.sort-active").forEach((v) => {
      v.classList.remove("sort-active", "dir-asc", "dir-desc");
    }), a.querySelectorAll("thead th[aria-sort]").forEach((v) => {
      v.setAttribute("aria-sort", "none");
    });
    const b = a.querySelector(`thead th[data-sort-key="${d}"]`);
    b && (b.classList.add("sort-active", p === "asc" ? "dir-asc" : "dir-desc"), b.setAttribute("aria-sort", p === "asc" ? "ascending" : "descending")), _.forEach((v) => m.appendChild(v)), h && m.appendChild(h);
  }, o = r.dataset.sortKey, s = r.dataset.sortDir, c = a.dataset.defaultSort, l = a.dataset.defaultDir, f = wt(o) ? o : wt(c) ? c : "name", u = Nt(s) ? s : Nt(l) ? l : "asc";
  i(f, u);
  const g = (d) => {
    const p = d.target;
    if (!(p instanceof Element))
      return;
    const m = p.closest("th[data-sort-key]");
    if (!m || !a.contains(m)) return;
    const _ = m.getAttribute("data-sort-key");
    if (!wt(_))
      return;
    let h = "asc";
    r.dataset.sortKey === _ && (h = (Nt(r.dataset.sortDir) ? r.dataset.sortDir : "asc") === "asc" ? "desc" : "asc"), r.dataset.sortKey = _, r.dataset.sortDir = h, i(_, h);
  };
  a.addEventListener("click", (d) => {
    g(d);
  }), a.addEventListener("keydown", (d) => {
    (d.key === "Enter" || d.key === " ") && (d.preventDefault(), g(d));
  });
}
async function ji(e, t, n) {
  if (!e || !it || !ot) return;
  const r = t || n.querySelector(
    `.portfolio-details[data-portfolio="${e}"] .positions-container`
  );
  if (!r)
    return;
  const a = r.closest(".portfolio-details");
  if (!(a && a.classList.contains("hidden"))) {
    r.innerHTML = Kt("Neu laden...");
    try {
      const i = await Qn(
        it,
        ot,
        e
      );
      if (i.error) {
        const s = typeof i.error == "string" ? i.error : String(i.error);
        r.innerHTML = `<div class="error">${D(s)} <button class="retry-pos" data-portfolio="${e}">Erneut laden</button></div>`;
        return;
      }
      const o = bt(
        Array.isArray(i.positions) ? i.positions : []
      );
      nt(e, o), rt(e, o), r.innerHTML = We(o);
      try {
        je(n, e);
      } catch (s) {
        console.warn("attachPortfolioToggleHandler: Sort-Init (Lazy) fehlgeschlagen:", s);
      }
      try {
        Be(n, e);
      } catch (s) {
        console.warn("reloadPortfolioPositions: Security-Listener konnte nicht gebunden werden:", s);
      }
    } catch (i) {
      const o = i instanceof Error ? i.message : String(i);
      r.innerHTML = `<div class="error">Fehler: ${D(o)} <button class="retry-pos" data-portfolio="${e}">Retry</button></div>`;
    }
  }
}
async function Yi(e, t, n = 3e3, r = 50) {
  const a = performance.now();
  return new Promise((i) => {
    const o = () => {
      const s = e.querySelector(t);
      if (s) {
        i(s);
        return;
      }
      if (performance.now() - a > n) {
        i(null);
        return;
      }
      setTimeout(o, r);
    };
    o();
  });
}
function rn(e) {
  const n = (typeof e.__ppReaderAttachToken == "number" ? e.__ppReaderAttachToken : 0) + 1;
  e.__ppReaderAttachToken = n, e.__ppReaderAttachInProgress = !0, (async () => {
    try {
      const r = await Yi(e, ".portfolio-table");
      if (n !== e.__ppReaderAttachToken)
        return;
      if (!r) {
        console.warn("attachPortfolioToggleHandler: .portfolio-table nicht gefunden (Timeout)");
        return;
      }
      if (r.querySelectorAll(".portfolio-toggle").length === 0 && console.debug("attachPortfolioToggleHandler: Noch keine Buttons – evtl. Recovery später"), r.__ppReaderPortfolioToggleBound)
        return;
      r.__ppReaderPortfolioToggleBound = !0, console.debug("attachPortfolioToggleHandler: Listener registriert"), r.addEventListener("click", (i) => {
        (async () => {
          try {
            const o = i.target;
            if (!(o instanceof Element))
              return;
            const s = o.closest(".retry-pos");
            if (s && r.contains(s)) {
              const d = s.getAttribute("data-portfolio");
              if (d) {
                const m = e.querySelector(
                  `.portfolio-details[data-portfolio="${d}"]`
                )?.querySelector(".positions-container");
                await ji(d, m ?? null, e);
              }
              return;
            }
            const c = o.closest(".portfolio-toggle");
            if (!c || !r.contains(c)) return;
            const l = c.getAttribute("data-portfolio");
            if (!l) return;
            const f = e.querySelector(
              `.portfolio-details[data-portfolio="${l}"]`
            );
            if (!f) return;
            const u = c.querySelector(".caret");
            if (f.classList.contains("hidden")) {
              f.classList.remove("hidden"), c.classList.add("expanded"), c.setAttribute("aria-expanded", "true"), u && (u.textContent = "▼"), st.add(l);
              try {
                nn(e, l);
              } catch (d) {
                console.warn("attachPortfolioToggleHandler: Pending-Flush fehlgeschlagen:", d);
              }
              if (_t(l)) {
                const d = f.querySelector(".positions-container");
                if (d) {
                  d.innerHTML = We(
                    nr(l)
                  ), je(e, l);
                  try {
                    Be(e, l);
                  } catch (p) {
                    console.warn("attachPortfolioToggleHandler: Security-Listener (Cache) Fehler:", p);
                  }
                }
              } else {
                const d = f.querySelector(".positions-container");
                d && (d.innerHTML = Kt("Lade Positionen..."));
                try {
                  const p = await Qn(
                    it,
                    ot,
                    l
                  );
                  if (p.error) {
                    const _ = typeof p.error == "string" ? p.error : String(p.error);
                    d && (d.innerHTML = `<div class="error">${D(_)} <button class="retry-pos" data-portfolio="${l}">Erneut laden</button></div>`);
                    return;
                  }
                  const m = bt(
                    Array.isArray(p.positions) ? p.positions : []
                  );
                  if (nt(l, m), rt(
                    l,
                    m
                  ), d) {
                    d.innerHTML = We(m);
                    try {
                      je(e, l);
                    } catch (_) {
                      console.warn("attachPortfolioToggleHandler: Sort-Init (Lazy) fehlgeschlagen:", _);
                    }
                    try {
                      Be(e, l);
                    } catch (_) {
                      console.warn("attachPortfolioToggleHandler: Security-Listener konnte nicht gebunden werden:", _);
                    }
                  }
                } catch (p) {
                  const m = p instanceof Error ? p.message : String(p), _ = f.querySelector(".positions-container");
                  _ && (_.innerHTML = `<div class="error">Fehler beim Laden: ${D(m)} <button class="retry-pos" data-portfolio="${l}">Retry</button></div>`), console.error("Fehler beim Lazy Load für", l, p);
                }
              }
            } else
              f.classList.add("hidden"), c.classList.remove("expanded"), c.setAttribute("aria-expanded", "false"), u && (u.textContent = "▶"), st.delete(l);
          } catch (o) {
            console.error("attachPortfolioToggleHandler: Ungefangener Fehler im Click-Handler", o);
          }
        })();
      });
    } finally {
      n === e.__ppReaderAttachToken && (e.__ppReaderAttachInProgress = !1);
    }
  })();
}
function Ki(e) {
  const t = e.querySelector(".expandable-portfolio-table");
  t && (t.__ppReaderPortfolioFallbackBound || (t.__ppReaderPortfolioFallbackBound = !0, t.addEventListener("click", (n) => {
    const r = n.target;
    !(r instanceof Element) || !r.closest(".portfolio-toggle") || e.querySelector(".portfolio-table")?.__ppReaderPortfolioToggleBound || (console.debug("Fallback-Listener aktiv – re-attach Hauptlistener"), rn(e));
  })));
}
async function Ar(e, t, n) {
  it = t ?? null, ot = n ?? null, console.debug(
    "renderDashboard: start – panelConfig:",
    n?.config,
    "derived entry_id?",
    n?.config?._panel_custom?.config?.entry_id
  );
  const r = await Ra(t, n);
  ir(r.accounts);
  const a = dr(), i = await $a(t, n);
  ni(i.portfolios);
  const o = di();
  let s = "";
  try {
    s = await Ta(t, n);
  } catch {
    s = "";
  }
  const c = a.reduce(
    (A, x) => A + (typeof x.balance == "number" && Number.isFinite(x.balance) ? x.balance : 0),
    0
  ), l = o.some((A) => A.fx_unavailable), f = a.some((A) => A.fx_unavailable && (A.balance == null || !Number.isFinite(A.balance))), u = o.reduce((A, x) => x.hasValue && typeof x.current_value == "number" && Number.isFinite(x.current_value) ? A + x.current_value : A, 0), g = c + u, d = "Teilw. fehlende FX-Kurse – Gesamtvermögen abweichend", m = o.some((A) => A.hasValue && typeof A.current_value == "number" && Number.isFinite(A.current_value)) || a.some((A) => typeof A.balance == "number" && Number.isFinite(A.balance)) ? `${de(g)}&nbsp;€` : `<span class="missing-value" role="note" aria-label="${d}" title="${d}">—</span>`, _ = l || f ? `<span class="total-wealth-note">${d}</span>` : "", h = `
    <div class="header-meta-row">
      💰 Gesamtvermögen: <strong class="total-wealth-value">${m}</strong>${_}
    </div>
  `, y = On("Übersicht", h), b = Sr(o), v = a.filter((A) => (A.currency_code ?? "EUR") === "EUR"), P = a.filter((A) => (A.currency_code ?? "EUR") !== "EUR"), w = P.some((A) => A.fx_unavailable) ? `
        <p class="table-note" role="note">
          <span class="table-note__icon" aria-hidden="true">⚠️</span>
          <span>Wechselkurse konnten nicht geladen werden. EUR-Werte werden derzeit nicht angezeigt.</span>
        </p>
      ` : "", N = `
    <div class="card">
      <h2>Liquidität</h2>
      <div class="scroll-container account-table">
        ${xe(
    v.map((A) => ({
      name: at(A.name, Nn(A.badges), {
        containerClass: "account-name",
        labelClass: "account-name__label"
      }),
      balance: A.balance ?? null
    })),
    [
      { key: "name", label: "Name" },
      { key: "balance", label: "Kontostand (EUR)", align: "right" }
    ],
    ["balance"]
  )}
      </div>
    </div>
    ${P.length ? `
      <div class="card">
        <h2>Fremdwährungen</h2>
        <div class="scroll-container fx-account-table">
          ${xe(
    P.map((A) => {
      const x = A.orig_balance, E = typeof x == "number" && Number.isFinite(x) ? `${x.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}&nbsp;${A.currency_code ?? ""}` : "";
      return {
        name: at(A.name, Nn(A.badges), {
          containerClass: "account-name",
          labelClass: "account-name__label"
        }),
        fx_display: E,
        balance: A.balance ?? null
      };
    }),
    [
      { key: "name", label: "Name" },
      { key: "fx_display", label: "Betrag (FX)" },
      { key: "balance", label: "EUR", align: "right" }
    ],
    ["balance"]
  )}
        </div>
        ${w}
      </div>` : ""}
  `, k = `
    <div class="card footer-card">
      <div class="meta">
        <div class="last-file-update">
          📂 Letzte Aktualisierung der Datei: <strong>${s || "Unbekannt"}</strong>
        </div>
      </div>
    </div>
  `, I = `
    ${y.outerHTML}
    <div class="card">
      <h2>Investment</h2>
      <div class="scroll-container portfolio-table">
        ${b}
      </div>
    </div>
    ${N}
    ${k}
  `;
  return Gi(e, o), I;
}
function Gi(e, t) {
  if (!e)
    return;
  const n = () => {
    try {
      const a = e, i = a.querySelector(".portfolio-table");
      i && i.querySelectorAll(".portfolio-toggle").length === 0 && (console.debug("Recovery: Tabelle ohne Buttons – erneuter Aufbau"), i.innerHTML = Sr(t)), rn(e), Ki(e), st.forEach((o) => {
        try {
          _t(o) && (je(e, o), Be(e, o));
        } catch (s) {
          console.warn("Init-Sortierung für expandiertes Depot fehlgeschlagen:", o, s);
        }
      });
      try {
        Pr(a);
      } catch (o) {
        console.warn("renderDashboard: Footer-Summe konnte nicht aktualisiert werden:", o);
      }
      try {
        xi(e);
      } catch (o) {
        console.warn("renderDashboard: Pending-Positions konnten nicht angewendet werden:", o);
      }
      console.debug("renderDashboard: portfolio-toggle Buttons:", a.querySelectorAll(".portfolio-toggle").length);
    } catch (a) {
      console.error("renderDashboard: Fehler bei Recovery/Listener", a);
    }
  }, r = typeof requestAnimationFrame == "function" ? (a) => requestAnimationFrame(a) : (a) => setTimeout(a, 0);
  r(() => r(n));
}
za({
  renderPositionsTable: (e) => Oi(e),
  applyGainPctMetadata: vr,
  attachSecurityDetailListener: Be,
  attachPortfolioPositionsSorting: je,
  updatePortfolioFooter: (e) => {
    e && Pr(e);
  }
});
const Xi = "http://www.w3.org/2000/svg", Ae = 640, Ce = 260, Ie = { top: 12, right: 16, bottom: 24, left: 16 }, Ve = "var(--pp-reader-chart-line, #3f51b5)", Ht = "var(--pp-reader-chart-area, rgba(63, 81, 181, 0.12))", kn = "0.75rem", Cr = "var(--pp-reader-chart-baseline, rgba(96, 125, 139, 0.75))", wr = "6 4", Zi = 1440 * 60 * 1e3;
function Ji(e) {
  if (e == null)
    return null;
  if (typeof e == "string")
    return e;
  if (typeof e == "number")
    return Number.isFinite(e) ? e.toString() : null;
  if (typeof e == "boolean")
    return e ? "true" : "false";
  if (e instanceof Date) {
    const t = e.getTime();
    return Number.isFinite(t) ? e.toISOString() : null;
  }
  return null;
}
function Qi(e) {
  return typeof e == "string" ? e : typeof e == "number" && Number.isFinite(e) ? e.toString() : e instanceof Date && Number.isFinite(e.getTime()) ? e.toISOString() : "";
}
function Q(e) {
  return `${String(e)}px`;
}
function ne(e, t = {}) {
  const n = document.createElementNS(Xi, e);
  return Object.entries(t).forEach(([r, a]) => {
    const i = Ji(a);
    i != null && n.setAttribute(r, i);
  }), n;
}
function ct(e, t = null) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  if (typeof e == "string" && e.trim() !== "") {
    const n = Number.parseFloat(e);
    if (Number.isFinite(n))
      return n;
  }
  return t;
}
function Nr(e, t) {
  if (e instanceof Date) {
    const n = e.getTime();
    return Number.isFinite(n) ? n : t;
  }
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  if (typeof e == "string") {
    const n = Date.parse(e);
    if (Number.isFinite(n))
      return n;
  }
  return t;
}
const Er = (e) => {
  if (e && typeof e == "object" && "date" in e)
    return e.date;
}, xr = (e) => {
  if (e && typeof e == "object" && "close" in e)
    return e.close;
}, Fr = (e, t, n) => {
  if (Number.isFinite(e)) {
    const r = new Date(e);
    if (!Number.isNaN(r.getTime()))
      return r.toLocaleDateString("de-DE");
  }
  if (t && typeof t == "object" && "date" in t) {
    const r = t.date, a = Qi(r);
    if (a)
      return a;
  }
  return Number.isFinite(e) ? e.toString() : "";
}, kr = (e, t, n) => (Number.isFinite(e) ? e : ct(e, 0) ?? 0).toLocaleString("de-DE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
}), Dr = ({ xFormatted: e, yFormatted: t }) => `
    <div class="chart-tooltip-date">${D(e)}</div>
    <div class="chart-tooltip-value">${D(t)}&nbsp;€</div>
  `, Rr = ({
  marker: e,
  xFormatted: t,
  yFormatted: n
}) => {
  const r = typeof e.label == "string" ? e.label : null;
  return `
    <div class="chart-tooltip-date">${D(r || t)}</div>
    <div class="chart-tooltip-value">${D(n)}</div>
  `;
};
function Tr(e) {
  return e.__chartState || (e.__chartState = {
    svg: null,
    areaPath: null,
    linePath: null,
    baselineLine: null,
    focusLine: null,
    focusCircle: null,
    overlay: null,
    tooltip: null,
    markerOverlay: null,
    markerLayer: null,
    markerTooltip: null,
    width: Ae,
    height: Ce,
    margin: { ...Ie },
    series: [],
    points: [],
    range: null,
    xAccessor: Er,
    yAccessor: xr,
    xFormatter: Fr,
    yFormatter: kr,
    tooltipRenderer: Dr,
    markerTooltipRenderer: Rr,
    color: Ve,
    areaColor: Ht,
    baseline: null,
    handlersAttached: !1,
    markers: [],
    markerPositions: []
  }), e.__chartState;
}
function te(e, t, n) {
  return !Number.isFinite(e) || e < t ? t : e > n ? n : e;
}
function eo(e, t) {
  if (e.length === 0)
    return "";
  const n = [];
  e.forEach((o, s) => {
    const c = s === 0 ? "M" : "L", l = o.x.toFixed(2), f = o.y.toFixed(2);
    n.push(`${c}${l} ${f}`);
  });
  const r = e[0], i = `L${e[e.length - 1].x.toFixed(2)} ${t.toFixed(2)} L${r.x.toFixed(2)} ${t.toFixed(2)} Z`;
  return `${n.join(" ")} ${i}`;
}
function to(e) {
  if (e.length === 0)
    return "";
  const t = [];
  return e.forEach((n, r) => {
    const a = r === 0 ? "M" : "L", i = n.x.toFixed(2), o = n.y.toFixed(2);
    t.push(`${a}${i} ${o}`);
  }), t.join(" ");
}
function no(e) {
  const { baselineLine: t, baseline: n } = e;
  if (!t)
    return;
  const r = n?.color ?? Cr, a = n?.dashArray ?? wr;
  t.setAttribute("stroke", r), t.setAttribute("stroke-dasharray", a);
}
function Et(e) {
  const { baselineLine: t, baseline: n, range: r, margin: a, width: i } = e;
  if (!t)
    return;
  const o = n?.value;
  if (!r || o == null || !Number.isFinite(o)) {
    t.style.opacity = "0";
    return;
  }
  const { minY: s, maxY: c, boundedHeight: l } = r, f = Number.isFinite(s) ? s : o, g = (Number.isFinite(c) ? c : f + 1) - f, d = g === 0 ? 0.5 : (o - f) / g, p = te(d, 0, 1), m = Math.max(l, 0), _ = a.top + (1 - p) * m, h = Math.max(i - a.left - a.right, 0), y = a.left, b = a.left + h;
  t.setAttribute("x1", y.toFixed(2)), t.setAttribute("x2", b.toFixed(2)), t.setAttribute("y1", _.toFixed(2)), t.setAttribute("y2", _.toFixed(2)), t.style.opacity = "1";
}
function ro(e, t, n) {
  const { width: r, height: a, margin: i } = t, { xAccessor: o, yAccessor: s } = n;
  if (e.length === 0)
    return { points: [], range: null };
  const c = e.map((E, R) => {
    const K = o(E, R), S = s(E, R), F = Nr(K, R), L = ct(S, Number.NaN);
    return Number.isFinite(L) ? {
      index: R,
      data: E,
      xValue: F,
      yValue: L
    } : null;
  }).filter((E) => !!E);
  if (c.length === 0)
    return { points: [], range: null };
  const l = c.reduce((E, R) => Math.min(E, R.xValue), c[0].xValue), f = c.reduce((E, R) => Math.max(E, R.xValue), c[0].xValue), u = c.reduce((E, R) => Math.min(E, R.yValue), c[0].yValue), g = c.reduce((E, R) => Math.max(E, R.yValue), c[0].yValue), d = Math.max(r - i.left - i.right, 1), p = Math.max(a - i.top - i.bottom, 1), m = Number.isFinite(l) ? l : 0, _ = Number.isFinite(f) ? f : m + 1, h = Number.isFinite(u) ? u : 0, y = Number.isFinite(g) ? g : h + 1, b = ct(t.baseline?.value, null), v = b != null && Number.isFinite(b) ? Math.min(h, b) : h, P = b != null && Number.isFinite(b) ? Math.max(y, b) : y, C = Math.max(
    2,
    Math.min(
      6,
      Math.round(
        Math.max(a - i.top - i.bottom, 0) / 60
      ) || 4
    )
  ), { niceMin: w, niceMax: N } = fo(
    v,
    P,
    C
  ), k = Number.isFinite(w) ? w : h, I = Number.isFinite(N) ? N : y, A = _ - m || 1, x = I - k || 1;
  return {
    points: c.map((E) => {
      const R = A === 0 ? 0.5 : (E.xValue - m) / A, K = x === 0 ? 0.5 : (E.yValue - k) / x, S = i.left + R * d, F = i.top + (1 - K) * p;
      return {
        ...E,
        x: S,
        y: F
      };
    }),
    range: {
      minX: m,
      maxX: _,
      minY: k,
      maxY: I,
      boundedWidth: d,
      boundedHeight: p
    }
  };
}
function xt(e) {
  const { markerLayer: t, markerOverlay: n, markers: r, range: a, margin: i, markerTooltip: o } = e;
  if (e.markerPositions = [], Qe(e), !t || !n)
    return;
  for (; t.firstChild; )
    t.removeChild(t.firstChild);
  for (; n.firstChild; )
    n.removeChild(n.firstChild);
  if (!a || !Array.isArray(r) || r.length === 0)
    return;
  const s = a.maxX - a.minX || 1, c = a.maxY - a.minY || 1;
  r.forEach((l, f) => {
    const u = Nr(l.x, f), g = ct(l.y, Number.NaN), d = Number(g);
    if (!Number.isFinite(u) || !Number.isFinite(d))
      return;
    const p = s === 0 ? 0.5 : te((u - a.minX) / s, 0, 1), m = c === 0 ? 0.5 : te((d - a.minY) / c, 0, 1), _ = i.left + p * a.boundedWidth, h = i.top + (1 - m) * a.boundedHeight, y = ne("g", {
      class: "line-chart-marker",
      transform: `translate(${_.toFixed(2)} ${h.toFixed(2)})`,
      "data-marker-id": l.id
    }), b = ne("circle", {
      r: 5,
      fill: l.color || e.color,
      stroke: "#fff",
      "stroke-width": 2,
      opacity: 0.95
    });
    y.appendChild(b), t.appendChild(y), e.markerPositions.push({
      marker: l,
      x: _,
      y: h
    });
  }), o && (o.style.opacity = "0", o.style.visibility = "hidden");
}
function $r(e, t, n, r) {
  e.width = Number.isFinite(t) ? Number(t) : Ae, e.height = Number.isFinite(n) ? Number(n) : Ce, e.margin = {
    top: Number.isFinite(r?.top) ? Number(r?.top) : Ie.top,
    right: Number.isFinite(r?.right) ? Number(r?.right) : Ie.right,
    bottom: Number.isFinite(r?.bottom) ? Number(r?.bottom) : Ie.bottom,
    left: Number.isFinite(r?.left) ? Number(r?.left) : Ie.left
  };
}
function ao(e, t) {
  const n = e.xFormatter(t.xValue, t.data, t.index), r = e.yFormatter(t.yValue, t.data, t.index);
  return e.tooltipRenderer({
    point: t,
    xFormatted: n,
    yFormatted: r,
    data: t.data,
    index: t.index
  });
}
function io(e, t, n, r = null) {
  const { tooltip: a, width: i, margin: o, height: s } = e;
  if (!a)
    return;
  const c = r && Number.isFinite(r.scaleX) && r.scaleX > 0 ? r.scaleX : 1, l = r && Number.isFinite(r.scaleY) && r.scaleY > 0 ? r.scaleY : 1, f = s - o.bottom;
  a.style.visibility = "visible", a.style.opacity = "1";
  const u = a.offsetWidth || 0, g = a.offsetHeight || 0, d = t.x * c, p = te(
    d - u / 2,
    o.left * c,
    (i - o.right) * c - u
  ), m = Math.max(f * l - g, 0), _ = 12, y = (Number.isFinite(n) ? te(n ?? 0, o.top, f) : t.y) * l;
  let b = y - g - _;
  b < o.top * l && (b = y + _), b = te(b, 0, m);
  const v = Q(Math.round(p)), P = Q(Math.round(b));
  a.style.transform = `translate(${v}, ${P})`;
}
function It(e) {
  const { tooltip: t, focusLine: n, focusCircle: r } = e;
  t && (t.style.opacity = "0", t.style.visibility = "hidden"), n && (n.style.opacity = "0"), r && (r.style.opacity = "0");
}
function oo(e, t) {
  const { marker: n } = t, r = e.xFormatter(t.marker.x, n, -1), a = e.yFormatter(t.marker.y, n, -1);
  return e.markerTooltipRenderer({
    marker: n,
    xFormatted: r,
    yFormatted: a
  });
}
function so(e, t, n, r = null) {
  const { markerTooltip: a, width: i, margin: o, height: s, tooltip: c } = e;
  if (!a)
    return;
  const l = r && Number.isFinite(r.scaleX) && r.scaleX > 0 ? r.scaleX : 1, f = r && Number.isFinite(r.scaleY) && r.scaleY > 0 ? r.scaleY : 1, u = s - o.bottom;
  a.style.visibility = "visible", a.style.opacity = "1";
  const g = a.offsetWidth || 0, d = a.offsetHeight || 0, p = t.x * l, m = te(
    p - g / 2,
    o.left * l,
    (i - o.right) * l - g
  ), _ = Math.max(u * f - d, 0), h = 10, y = c?.getBoundingClientRect(), b = e.svg?.getBoundingClientRect(), v = y && b ? y.top - b.top : null, P = y && b ? y.bottom - b.top : null, w = (Number.isFinite(n) ? te(n ?? t.y, o.top, u) : t.y) * f;
  let N;
  v != null && P != null ? v <= w ? N = v - d - h : N = P + h : (N = w - d - h, N < o.top * f && (N = w + h)), N = te(N, 0, _);
  const k = Q(Math.round(m)), I = Q(Math.round(N));
  a.style.transform = `translate(${k}, ${I})`;
}
function Qe(e) {
  const { markerTooltip: t } = e;
  t && (t.style.opacity = "0", t.style.visibility = "hidden");
}
function co(e, t, n) {
  let a = null, i = 576;
  for (const o of e.markerPositions) {
    const s = o.x - t, c = o.y - n, l = s * s + c * c;
    l <= i && (a = o, i = l);
  }
  return a;
}
function lo(e, t) {
  if (t.handlersAttached || !t.overlay)
    return;
  const n = (a) => {
    if (t.points.length === 0 || !t.svg) {
      It(t), Qe(t);
      return;
    }
    const i = t.svg.getBoundingClientRect(), o = t.width || Ae, s = t.height || Ce, c = i.width && Number.isFinite(i.width) && Number.isFinite(o) && o > 0 ? i.width / o : 1, l = i.height && Number.isFinite(i.height) && Number.isFinite(s) && s > 0 ? i.height / s : 1, f = c > 0 ? 1 / c : 1, u = l > 0 ? 1 / l : 1, g = (a.clientX - i.left) * f, d = (a.clientY - i.top) * u, p = {
      scaleX: c,
      scaleY: l
    };
    let m = t.points[0], _ = Math.abs(g - m.x);
    for (let y = 1; y < t.points.length; y += 1) {
      const b = t.points[y], v = Math.abs(g - b.x);
      v < _ && (_ = v, m = b);
    }
    t.focusCircle && (t.focusCircle.setAttribute("cx", m.x.toFixed(2)), t.focusCircle.setAttribute("cy", m.y.toFixed(2)), t.focusCircle.style.opacity = "1"), t.focusLine && (t.focusLine.setAttribute("x1", m.x.toFixed(2)), t.focusLine.setAttribute("x2", m.x.toFixed(2)), t.focusLine.setAttribute("y1", t.margin.top.toFixed(2)), t.focusLine.setAttribute(
      "y2",
      (t.height - t.margin.bottom).toFixed(2)
    ), t.focusLine.style.opacity = "1"), t.tooltip && (t.tooltip.innerHTML = ao(t, m), io(t, m, d, p));
    const h = co(t, g, d);
    h && t.markerTooltip ? (t.markerTooltip.innerHTML = oo(t, h), so(t, h, d, p)) : Qe(t);
  }, r = () => {
    It(t), Qe(t);
  };
  t.overlay.addEventListener("pointermove", n), t.overlay.addEventListener("pointerenter", n), t.overlay.addEventListener("pointerleave", r), t.handlersAttached = !0, t.handlePointerMove = n, t.handlePointerLeave = r, e.addEventListener("pointercancel", r);
}
function uo(e, t = {}) {
  const n = document.createElement("div");
  n.className = "line-chart-container", n.dataset.chartType = "line", n.style.position = "relative";
  const r = ne("svg", {
    width: Ae,
    height: Ce,
    viewBox: `0 0 ${String(Ae)} ${String(Ce)}`,
    role: "img",
    "aria-hidden": "true",
    focusable: "false"
  });
  r.classList.add("line-chart-svg");
  const a = ne("path", {
    class: "line-chart-area",
    fill: Ht,
    stroke: "none"
  }), i = ne("line", {
    class: "line-chart-baseline",
    stroke: Cr,
    "stroke-width": 1,
    "stroke-dasharray": wr,
    opacity: 0
  }), o = ne("path", {
    class: "line-chart-path",
    fill: "none",
    stroke: Ve,
    "stroke-width": 2,
    "stroke-linecap": "round",
    "stroke-linejoin": "round"
  }), s = ne("line", {
    class: "line-chart-focus-line",
    stroke: Ve,
    "stroke-width": 1,
    "stroke-dasharray": "4 4",
    opacity: 0
  }), c = ne("circle", {
    class: "line-chart-focus-circle",
    r: 4,
    fill: "#fff",
    stroke: Ve,
    "stroke-width": 2,
    opacity: 0
  }), l = ne("g", {
    class: "line-chart-markers"
  }), f = ne("rect", {
    class: "line-chart-overlay",
    fill: "transparent",
    x: 0,
    y: 0,
    width: Ae,
    height: Ce
  });
  r.appendChild(a), r.appendChild(i), r.appendChild(o), r.appendChild(s), r.appendChild(c), r.appendChild(l), r.appendChild(f), n.appendChild(r);
  const u = document.createElement("div");
  u.className = "chart-tooltip", u.style.position = "absolute", u.style.top = "0", u.style.left = "0", u.style.pointerEvents = "none", u.style.opacity = "0", u.style.visibility = "hidden", n.appendChild(u);
  const g = document.createElement("div");
  g.className = "line-chart-marker-overlay", g.style.position = "absolute", g.style.top = "0", g.style.left = "0", g.style.width = "100%", g.style.height = "100%", g.style.pointerEvents = "none", g.style.overflow = "visible", g.style.zIndex = "2", n.appendChild(g);
  const d = document.createElement("div");
  d.className = "chart-tooltip chart-tooltip--marker", d.style.position = "absolute", d.style.top = "0", d.style.left = "0", d.style.pointerEvents = "none", d.style.opacity = "0", d.style.visibility = "hidden", n.appendChild(d), e.appendChild(n);
  const p = Tr(n);
  if (p.svg = r, p.areaPath = a, p.linePath = o, p.baselineLine = i, p.focusLine = s, p.focusCircle = c, p.overlay = f, p.tooltip = u, p.markerOverlay = g, p.markerLayer = l, p.markerTooltip = d, p.xAccessor = t.xAccessor ?? Er, p.yAccessor = t.yAccessor ?? xr, p.xFormatter = t.xFormatter ?? Fr, p.yFormatter = t.yFormatter ?? kr, p.tooltipRenderer = t.tooltipRenderer ?? Dr, p.markerTooltipRenderer = t.markerTooltipRenderer ?? Rr, p.color = t.color ?? Ve, p.areaColor = t.areaColor ?? Ht, p.baseline = t.baseline ?? null, p.handlersAttached = !1, p.markers = Array.isArray(t.markers) ? t.markers.slice() : [], !p.xAxis) {
    const m = document.createElement("div");
    m.className = "line-chart-axis line-chart-axis-x", m.style.position = "absolute", m.style.left = "0", m.style.right = "0", m.style.bottom = "0", m.style.pointerEvents = "none", m.style.fontSize = kn, m.style.color = "var(--secondary-text-color)", m.style.display = "block", n.appendChild(m), p.xAxis = m;
  }
  if (!p.yAxis) {
    const m = document.createElement("div");
    m.className = "line-chart-axis line-chart-axis-y", m.style.position = "absolute", m.style.top = "0", m.style.bottom = "0", m.style.left = "0", m.style.pointerEvents = "none", m.style.fontSize = kn, m.style.color = "var(--secondary-text-color)", m.style.display = "block", n.appendChild(m), p.yAxis = m;
  }
  return $r(p, t.width, t.height, t.margin), o.setAttribute("stroke", p.color), s.setAttribute("stroke", p.color), c.setAttribute("stroke", p.color), a.setAttribute("fill", p.areaColor), Lr(n, t), lo(n, p), n;
}
function Lr(e, t = {}) {
  if (!e) {
    console.error("updateLineChart: container element is required");
    return;
  }
  const n = Tr(e);
  if (!n.svg || !n.linePath || !n.overlay) {
    console.error("updateLineChart: chart was not initialised with renderLineChart");
    return;
  }
  t.xAccessor && (n.xAccessor = t.xAccessor), t.yAccessor && (n.yAccessor = t.yAccessor), t.xFormatter && (n.xFormatter = t.xFormatter), t.yFormatter && (n.yFormatter = t.yFormatter), t.tooltipRenderer && (n.tooltipRenderer = t.tooltipRenderer), t.markerTooltipRenderer && (n.markerTooltipRenderer = t.markerTooltipRenderer), t.color && (n.color = t.color, n.linePath.setAttribute("stroke", n.color), n.focusLine && n.focusLine.setAttribute("stroke", n.color), n.focusCircle && n.focusCircle.setAttribute("stroke", n.color)), t.areaColor && (n.areaColor = t.areaColor, n.areaPath && n.areaPath.setAttribute("fill", n.areaColor)), Object.prototype.hasOwnProperty.call(t, "baseline") && (n.baseline = t.baseline ?? null), Array.isArray(t.markers) && (n.markers = t.markers.slice()), no(n), $r(n, t.width, t.height, t.margin);
  const { width: r, height: a } = n;
  n.svg.setAttribute("width", String(r)), n.svg.setAttribute("height", String(a)), n.svg.setAttribute("viewBox", `0 0 ${String(r)} ${String(a)}`), n.overlay.setAttribute("x", "0"), n.overlay.setAttribute("y", "0"), n.overlay.setAttribute("width", Math.max(r, 0).toFixed(2)), n.overlay.setAttribute("height", Math.max(a, 0).toFixed(2)), Array.isArray(t.series) && (n.series = Array.from(t.series));
  const { points: i, range: o } = ro(n.series, n, {
    xAccessor: n.xAccessor,
    yAccessor: n.yAccessor
  });
  if (n.points = i, n.range = o, i.length === 0) {
    n.linePath.setAttribute("d", ""), n.areaPath && n.areaPath.setAttribute("d", ""), It(n), xt(n), Ft(n), Et(n);
    return;
  }
  if (i.length === 1) {
    const c = i[0], l = Math.max(
      0.5,
      Math.min(4, Math.max(n.width - n.margin.left - n.margin.right, 1) * 0.01)
    ), f = `M${c.x.toFixed(2)} ${c.y.toFixed(2)} h${l.toFixed(2)}`;
    n.linePath.setAttribute("d", f), n.areaPath && n.areaPath.setAttribute("d", ""), n.focusCircle && (n.focusCircle.setAttribute("cx", c.x.toFixed(2)), n.focusCircle.setAttribute("cy", c.y.toFixed(2)), n.focusCircle.style.opacity = "1"), n.focusLine && (n.focusLine.style.opacity = "0"), Ft(n), Et(n), xt(n);
    return;
  }
  const s = to(i);
  if (n.linePath.setAttribute("d", s), n.areaPath && o) {
    const c = n.margin.top + o.boundedHeight, l = eo(i, c);
    n.areaPath.setAttribute("d", l);
  }
  Ft(n), Et(n), xt(n);
}
function Ft(e) {
  const { xAxis: t, yAxis: n, range: r, margin: a, height: i, yFormatter: o } = e;
  if (!t || !n)
    return;
  if (!r) {
    t.innerHTML = "", n.innerHTML = "";
    return;
  }
  const { minX: s, maxX: c, minY: l, maxY: f, boundedWidth: u, boundedHeight: g } = r, d = Number.isFinite(s) && Number.isFinite(c) && c >= s, p = Number.isFinite(l) && Number.isFinite(f) && f >= l, m = Math.max(u, 0), _ = Math.max(g, 0);
  if (t.style.left = Q(a.left), t.style.width = Q(m), t.style.top = Q(i - a.bottom + 6), t.innerHTML = "", d && m > 0) {
    const y = (c - s) / Zi, b = Math.max(2, Math.min(6, Math.round(m / 140) || 4));
    po(e, s, c, b, y).forEach(({ positionRatio: P, label: C }) => {
      const w = document.createElement("div");
      w.className = "line-chart-axis-tick line-chart-axis-tick-x", w.style.position = "absolute", w.style.bottom = "0";
      const N = te(P, 0, 1);
      w.style.left = Q(N * m);
      let k = "-50%", I = "center";
      N <= 1e-3 ? (k = "0", I = "left", w.style.marginLeft = "2px") : N >= 0.999 && (k = "-100%", I = "right", w.style.marginRight = "2px"), w.style.transform = `translateX(${k})`, w.style.textAlign = I, w.textContent = C, t.appendChild(w);
    });
  }
  n.style.top = Q(a.top), n.style.height = Q(_);
  const h = Math.max(a.left - 6, 0);
  if (n.style.left = "0", n.style.width = Q(Math.max(h, 0)), n.innerHTML = "", p && _ > 0) {
    const y = Math.max(2, Math.min(6, Math.round(_ / 60) || 4)), b = go(l, f, y), v = o;
    b.forEach(({ value: P, positionRatio: C }) => {
      const w = document.createElement("div");
      w.className = "line-chart-axis-tick line-chart-axis-tick-y", w.style.position = "absolute", w.style.left = "0";
      const k = (1 - te(C, 0, 1)) * _;
      w.style.top = Q(k), w.textContent = v(P, null, -1), n.appendChild(w);
    });
  }
}
function fo(e, t, n = 4) {
  if (!Number.isFinite(e) || !Number.isFinite(t))
    return {
      niceMin: e,
      niceMax: t
    };
  const r = Math.max(2, n);
  if (t === e) {
    const l = Vt(Math.abs(e) || 1);
    return {
      niceMin: e - l,
      niceMax: t + l
    };
  }
  const i = (t - e) / (r - 1), o = Vt(i), s = Math.floor(e / o) * o, c = Math.ceil(t / o) * o;
  return s === c ? {
    niceMin: e,
    niceMax: t + o
  } : {
    niceMin: s,
    niceMax: c
  };
}
function po(e, t, n, r, a) {
  if (!Number.isFinite(t) || !Number.isFinite(n) || n < t)
    return [];
  if (!Number.isFinite(a) || a <= 0)
    return [
      {
        positionRatio: 0.5,
        label: Dn(e, t, a || 0)
      }
    ];
  const i = Math.max(2, r), o = [], s = n - t;
  for (let c = 0; c < i; c += 1) {
    const l = i === 1 ? 0.5 : c / (i - 1), f = t + l * s;
    o.push({
      positionRatio: l,
      label: Dn(e, f, a)
    });
  }
  return o;
}
function Dn(e, t, n) {
  const r = new Date(t);
  return Number.isFinite(r.getTime()) ? n > 1095 ? String(r.getFullYear()) : n > 365 ? r.toLocaleDateString("de-DE", {
    year: "numeric",
    month: "short"
  }) : n > 90 ? r.toLocaleDateString("de-DE", {
    year: "2-digit",
    month: "short"
  }) : n > 30 ? r.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short"
  }) : r.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit"
  }) : e.xFormatter(t, null, -1);
}
function go(e, t, n) {
  if (!Number.isFinite(e) || !Number.isFinite(t))
    return [];
  if (t === e)
    return [
      {
        value: e,
        positionRatio: 0.5
      }
    ];
  const r = t - e, a = Math.max(2, n), i = r / (a - 1), o = Vt(i), s = Math.floor(e / o) * o, c = Math.ceil(t / o) * o, l = [];
  for (let f = s; f <= c + o / 2; f += o) {
    const u = (f - e) / (t - e);
    l.push({
      value: f,
      positionRatio: te(u, 0, 1)
    });
  }
  return l.length > a + 2 ? l.filter((f, u) => u % 2 === 0) : l;
}
function Vt(e) {
  if (!Number.isFinite(e) || e === 0)
    return 1;
  const t = Math.floor(Math.log10(Math.abs(e))), n = Math.abs(e) / 10 ** t;
  let r;
  return n <= 1 ? r = 1 : n <= 2 ? r = 2 : n <= 5 ? r = 5 : r = 10, r * 10 ** t;
}
function ho(e) {
  return Array.isArray(e) && e.every((t) => typeof t == "string");
}
function mo(e) {
  return typeof e == "object" && e !== null;
}
function yo(e) {
  if (!mo(e))
    return !1;
  const t = e;
  return typeof t.portfolioUuid != "string" ? !1 : ho(t.securityUuids);
}
function _o(e) {
  return e instanceof CustomEvent ? yo(e.detail) : !1;
}
const kt = { min: 0, max: 6 }, lt = { min: 2, max: 4 }, bo = "1Y", Mr = [
  "1M",
  "6M",
  "1Y",
  "5Y",
  "ALL"
], vo = {
  "1M": 30,
  "6M": 182,
  "1Y": 365,
  "5Y": 1826,
  ALL: Number.POSITIVE_INFINITY
}, So = /* @__PURE__ */ new Set([0, 2]), Po = /* @__PURE__ */ new Set([1, 3]), Ao = "var(--pp-reader-chart-marker-buy, #2e7d32)", Co = "var(--pp-reader-chart-marker-sell, #c0392b)", Rn = "{TICKER}", wo = "https://chatgpt.com/", Dt = {
  aggregation: "Aggregationsdaten",
  totals: "Kaufsummen",
  eur_total: "EUR-Kaufsumme"
}, we = /* @__PURE__ */ new Map(), et = /* @__PURE__ */ new Map(), Ye = /* @__PURE__ */ new Map(), Ne = /* @__PURE__ */ new Map(), Hr = "pp-reader:portfolio-positions-updated", ze = /* @__PURE__ */ new Map();
function No(e) {
  const { fallbackUsed: t, flaggedAsCache: n } = e, r = [];
  return t && r.push(
    "Der aktuelle Snapshot konnte nicht geladen werden. Es werden die zuletzt gespeicherten Werte angezeigt."
  ), n && !t && r.push(
    "Der Snapshot ist vom Datenanbieter als Zwischenspeicherstand markiert."
  ), `
    <div class="card warning-card stale-notice" role="status" aria-live="polite">
      <h2>Zwischengespeicherte Werte</h2>
      <p>${r.length ? r.join(" ") : "Die Daten stammen aus dem Zwischenspeicher."}</p>
      <p class="stale-notice__hint">Die angezeigten Beträge können von den aktuellen Marktwerten abweichen. Laden Sie die Ansicht erneut, sobald eine Verbindung verfügbar ist.</p>
    </div>
  `;
}
function Eo(e, t) {
  if (e) {
    if (t) {
      Ye.set(e, t);
      return;
    }
    Ye.delete(e);
  }
}
function xo(e) {
  if (!e || typeof window > "u")
    return null;
  if (Ye.has(e)) {
    const t = Ye.get(e) || null;
    if (t)
      return t;
  }
  return null;
}
function Ir(e) {
  return we.has(e) || we.set(e, /* @__PURE__ */ new Map()), we.get(e);
}
function Vr(e) {
  return Ne.has(e) || Ne.set(e, /* @__PURE__ */ new Map()), Ne.get(e);
}
function Ur(e) {
  if (e) {
    if (we.has(e)) {
      try {
        const t = we.get(e);
        t && t.clear();
      } catch (t) {
        console.warn("invalidateHistoryCache: Konnte Cache nicht leeren", e, t);
      }
      we.delete(e);
    }
    if (Ne.has(e)) {
      try {
        Ne.get(e)?.clear();
      } catch (t) {
        console.warn("invalidateHistoryCache: Konnte Marker-Cache nicht leeren", e, t);
      }
      Ne.delete(e);
    }
  }
}
function zr(e) {
  e && Ye.delete(e);
}
function Fo(e, t) {
  if (!e || !t)
    return;
  const n = t.securityUuids;
  (Array.isArray(n) ? n : []).includes(e) && (Ur(e), zr(e));
}
function ko(e) {
  if (!e || ze.has(e))
    return;
  const t = (n) => {
    _o(n) && Fo(e, n.detail);
  };
  try {
    window.addEventListener(Hr, t), ze.set(e, t);
  } catch (n) {
    console.error("ensureLiveUpdateSubscription: Registrierung fehlgeschlagen", n);
  }
}
function Do(e) {
  if (!e || !ze.has(e))
    return;
  const t = ze.get(e);
  try {
    t && window.removeEventListener(Hr, t);
  } catch (n) {
    console.error("removeLiveUpdateSubscription: Entfernen des Listeners fehlgeschlagen", n);
  }
  ze.delete(e);
}
function Ro(e) {
  e && (Do(e), Ur(e), zr(e));
}
function Tn(e, t) {
  if (!et.has(e)) {
    et.set(e, { activeRange: t });
    return;
  }
  const n = et.get(e);
  n && (n.activeRange = t);
}
function qr(e) {
  return et.get(e)?.activeRange ?? bo;
}
function Ut(e) {
  const t = Date.UTC(
    e.getUTCFullYear(),
    e.getUTCMonth(),
    e.getUTCDate()
  );
  return Math.floor(t / 864e5);
}
function ke(e) {
  const t = new Date(e.getTime());
  return t.setUTCHours(0, 0, 0, 0), t;
}
function $n(e) {
  return !(e instanceof Date) || Number.isNaN(e.getTime()) ? null : Ut(ke(e));
}
function H(e) {
  return le(e);
}
function Or(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t || null;
}
function ve(e) {
  const t = Or(e);
  return t ? t.toUpperCase() : null;
}
function To(e) {
  if (!e)
    return null;
  const t = Jt(e.aggregation), n = H(t?.purchase_total_security) ?? (t ? H(
    t.security_currency_total
  ) : null), r = H(t?.purchase_total_account) ?? (t ? H(
    t.account_currency_total
  ) : null);
  if (re(n) && re(r)) {
    const s = n / r;
    if (re(s))
      return s;
  }
  const a = Re(e.average_cost), i = H(a?.native) ?? H(a?.security), o = H(a?.account) ?? H(a?.eur);
  if (re(i) && re(o)) {
    const s = i / o;
    if (re(s))
      return s;
  }
  return null;
}
function Wr(e, t = "Unbekannter Fehler") {
  if (typeof e == "string") {
    const n = e.trim();
    return n || t;
  }
  if (e instanceof Error) {
    const n = e.message.trim();
    return n || t;
  }
  if (e != null)
    try {
      const n = JSON.stringify(e);
      if (n && n !== "{}")
        return n;
    } catch {
    }
  return t;
}
function ut(e, t) {
  const n = ke(t instanceof Date ? t : /* @__PURE__ */ new Date()), r = vo[e], a = $n(n), i = {};
  if (a != null && (i.end_date = a), Number.isFinite(r) && r > 0) {
    const o = new Date(n.getTime());
    o.setUTCDate(o.getUTCDate() - (r - 1));
    const s = $n(o);
    s != null && (i.start_date = s);
  }
  return i;
}
function an(e) {
  if (!e)
    return null;
  if (e instanceof Date)
    return Number.isNaN(e.getTime()) ? null : new Date(e.getTime());
  if (typeof e == "number" && Number.isFinite(e)) {
    const t = Math.trunc(e);
    if (t >= 1e6 && t <= 99999999) {
      const n = Math.floor(t / 1e4), r = Math.floor(t % 1e4 / 100), a = t % 100, i = new Date(Date.UTC(n, r - 1, a));
      return Number.isNaN(i.getTime()) ? null : i;
    }
    if (t >= 0 && t <= 1e5) {
      const n = new Date(t * 864e5);
      return Number.isNaN(n.getTime()) ? null : ke(n);
    }
    if (t > 1e12) {
      const n = new Date(t);
      return Number.isNaN(n.getTime()) ? null : n;
    }
    if (t > 1e9) {
      const n = new Date(t * 1e3);
      return Number.isNaN(n.getTime()) ? null : n;
    }
    return null;
  }
  if (typeof e == "string") {
    const t = e.trim();
    if (/^\d{1,6}$/.test(t)) {
      const n = Number.parseInt(t, 10);
      if (Number.isFinite(n) && n >= 0 && n <= 1e5) {
        const r = new Date(n * 864e5);
        if (!Number.isNaN(r.getTime()))
          return ke(r);
      }
    }
    if (/^\d{8}$/.test(t)) {
      const n = Number.parseInt(t.slice(0, 4), 10), r = Number.parseInt(t.slice(4, 6), 10) - 1, a = Number.parseInt(t.slice(6, 8), 10);
      if (Number.isFinite(n) && Number.isFinite(r) && Number.isFinite(a)) {
        const i = new Date(Date.UTC(n, r, a));
        if (!Number.isNaN(i.getTime()))
          return i;
      }
    }
  }
  return null;
}
function $o(e) {
  const t = an(e);
  if (t)
    return t;
  if (typeof e == "string") {
    const n = e.trim();
    if (!n)
      return null;
    const r = Date.parse(n);
    if (Number.isFinite(r)) {
      const a = new Date(r);
      return Number.isNaN(a.getTime()) ? null : a;
    }
  }
  return null;
}
function dt(e) {
  if (!e && e !== 0)
    return null;
  if (e instanceof Date && !Number.isNaN(e.getTime()))
    return e.getTime();
  if (typeof e == "number" && Number.isFinite(e)) {
    if (e > 1e12)
      return e;
    if (e > 1e9)
      return e * 1e3;
  }
  if (typeof e == "string") {
    const t = e.trim();
    if (!t)
      return null;
    const n = Date.parse(t);
    if (Number.isFinite(n))
      return n;
  }
  return null;
}
function zt(e) {
  return Array.isArray(e) ? e.map((t) => {
    let r = H(t.close);
    if (r == null) {
      const i = H(t.close_raw);
      i != null && (r = i / 1e8);
    }
    return r == null ? null : {
      date: an(t.date) ?? t.date,
      close: r
    };
  }).filter((t) => !!t) : [];
}
function ft(e, t, n = null) {
  if (!Array.isArray(e))
    return [];
  const r = [], a = ve(t), i = a || "EUR", o = To(n);
  return e.forEach((s, c) => {
    const l = typeof s.type == "number" ? s.type : Number(s.type), f = So.has(l), u = Po.has(l);
    if (!f && !u)
      return;
    const g = $o(s.date);
    let d = H(s.price);
    if (!g || d == null)
      return;
    const p = ve(s.currency_code), m = a ?? p ?? i;
    p && a && p !== a && re(o) && (d *= o);
    const _ = H(s.shares), h = H(s.net_price_eur), y = f ? "Kauf" : "Verkauf", b = _ != null ? `${cn(_)} @ ` : "", v = `${y} ${b}${ue(d)} ${m}`, P = u && h != null ? `${v} (netto ${ue(h)} EUR)` : v, C = f ? Ao : Co, w = typeof s.uuid == "string" && s.uuid.trim() || `${y}-${g.getTime().toString()}-${c.toString()}`;
    r.push({
      id: w,
      x: g.getTime(),
      y: d,
      color: C,
      label: P,
      payload: {
        type: y,
        currency: m,
        transactionCurrency: p,
        shares: _,
        price: d,
        netPriceEur: h,
        date: g.toISOString(),
        portfolio: s.portfolio
      }
    });
  }), r;
}
function on(e) {
  const t = H(e?.last_price_native) ?? H(e?.last_price?.native) ?? null;
  if ($(t))
    return t;
  if (ve(e?.currency_code) === "EUR") {
    const r = H(e?.last_price_eur);
    if ($(r))
      return r;
  }
  return null;
}
function Lo(e) {
  if (!e)
    return null;
  const n = e.last_price_fetched_at, r = dt(n);
  if (r != null)
    return r;
  const i = e.last_price?.fetched_at;
  return dt(i) ?? null;
}
function qt(e, t) {
  let n = [];
  Array.isArray(e) && (n = e.map((l) => ({
    ...l
  })));
  const r = n.slice(), a = on(t);
  if (!$(a))
    return r;
  const i = Lo(t) ?? Date.now(), o = new Date(i);
  if (Number.isNaN(o.getTime()))
    return r;
  const s = Ut(ke(o));
  let c = null;
  for (let l = r.length - 1; l >= 0; l -= 1) {
    const f = r[l], u = an(f.date);
    if (!u)
      continue;
    const g = Ut(ke(u));
    if (c == null && (c = g), g === s)
      return f.close !== a && (r[l] = { ...f, close: a }), r;
    if (g < s)
      break;
  }
  return c != null && c > s || r.push({
    date: o,
    close: a
  }), r;
}
function $(e) {
  return typeof e == "number" && Number.isFinite(e);
}
function re(e) {
  return typeof e == "number" && Number.isFinite(e) && e > 0;
}
function qe(e, t, n) {
  if (!$(e) || !$(t))
    return !1;
  const r = Math.abs(e - t), a = Math.max(Math.abs(e), Math.abs(t), 1);
  return r <= a * 1e-4;
}
function Mo(e, t) {
  return !$(t) || t === 0 || !$(e) ? null : Oa((e - t) / t * 100);
}
function Br(e, t) {
  if (e.length === 0)
    return { priceChange: null, priceChangePct: null };
  const n = e[0], r = H(n.close);
  if (!$(r) || r === 0)
    return { priceChange: null, priceChangePct: null };
  const a = e[e.length - 1], i = H(a.close), o = H(t) ?? i;
  if (!$(o))
    return { priceChange: null, priceChangePct: null };
  const s = o - r, c = Object.is(s, -0) ? 0 : s, l = Mo(o, r);
  return { priceChange: c, priceChangePct: l };
}
function sn(e, t) {
  if (!$(e) || e === 0)
    return "neutral";
  const n = 0.5 / Math.pow(10, t);
  return Math.abs(e) < n ? "neutral" : e > 0 ? "positive" : "negative";
}
function Ho(e, t) {
  if (!$(e))
    return '<span class="value neutral">—</span>';
  const n = ue(e);
  if (n === "—")
    return '<span class="value neutral">—</span>';
  const r = sn(e, lt.max), a = t ? `&nbsp;${D(t)}` : "";
  return `<span class="value ${r}">${n}${a}</span>`;
}
function Io(e) {
  return $(e) ? `<span class="value ${sn(e, 2)} value--percentage">${de(e)}&nbsp;%</span>` : '<span class="value neutral">—</span>';
}
function jr(e, t, n, r) {
  const a = e, i = a.length > 0 ? a : "Zeitraum";
  return `
    <div class="security-info-bar" data-range="${ce(a)}">
      <div class="security-info-item">
        <span class="label">Preisänderung (${D(i)})</span>
        <div class="value-row">
          ${Ho(t, r)}
          ${Io(n)}
        </div>
      </div>
    </div>
  `;
}
function Vo(e) {
  return `
    <div class="security-range-selector" role="group" aria-label="Zeitraum">
      ${Mr.map((n) => `
      <button
        type="button"
        class="security-range-button${n === e ? " active" : ""}"
        data-range="${ce(n)}"
        aria-pressed="${n === e ? "true" : "false"}"
      >
        ${D(n)}
      </button>
    `).join(`
`)}
    </div>
  `;
}
function Yr(e, t = { status: "empty" }) {
  const n = ce(e);
  switch (t.status) {
    case "loaded": {
      const r = n.length > 0 ? ` für ${n}` : "";
      return `
        <div
          class="history-chart"
          data-state="loaded"
          data-range="${n}"
          role="img"
          aria-label="Preisverlauf${r}"
        ></div>
      `;
    }
    case "error": {
      const r = Wr(
        t.message,
        "Die historischen Daten konnten nicht geladen werden."
      );
      return `
        <div class="history-placeholder" data-state="error" data-range="${n}">
          <p>${D(r)}</p>
        </div>
      `;
    }
    case "empty":
    default: {
      const r = n.length > 0 ? n : "den gewählten Zeitraum";
      return `
        <div class="history-placeholder" data-state="empty" data-range="${n}">
          <p>Für dieses Wertpapier liegen im Zeitraum ${D(r)} keine historischen Daten vor.</p>
        </div>
      `;
    }
  }
}
function cn(e) {
  const t = H(e);
  if (t == null)
    return "—";
  const n = Math.abs(t % 1) > 0, r = n ? 2 : kt.min, a = n ? kt.max : kt.min;
  return t.toLocaleString("de-DE", {
    minimumFractionDigits: r,
    maximumFractionDigits: a
  });
}
function ue(e) {
  const t = H(e);
  return t == null ? "—" : t.toLocaleString("de-DE", {
    minimumFractionDigits: lt.min,
    maximumFractionDigits: lt.max
  });
}
function Uo(e, t) {
  const n = ue(e), r = `&nbsp;${D(t)}`;
  return `<span class="${sn(e, lt.max)}">${n}${r}</span>`;
}
function zo(e, t) {
  const n = e?.ticker_symbol;
  if (typeof n == "string" && n.trim())
    return n.trim();
  const r = typeof e?.name == "string" ? e.name.trim() : "";
  return r || (typeof t == "string" ? t : "");
}
function qo(e) {
  return `
    <div class="news-prompt-container">
      <button
        type="button"
        class="news-prompt-button"
        data-symbol="${ce(e)}"
      >
        Copy prompt &amp; open ChatGPT
      </button>
    </div>
  `;
}
async function Oo(e) {
  if (typeof navigator < "u" && navigator.clipboard && typeof navigator.clipboard.writeText == "function")
    try {
      return await navigator.clipboard.writeText(e), !0;
    } catch (n) {
      console.warn("News-Prompt: Clipboard API unavailable, falling back", n);
    }
  if (typeof document > "u")
    return !1;
  const { body: t } = document;
  try {
    const n = document.createElement("textarea");
    n.value = e, n.setAttribute("readonly", ""), n.style.position = "fixed", n.style.left = "-9999px", n.style.top = "0", t.appendChild(n), n.select();
    const r = document.execCommand("copy");
    return t.removeChild(n), r;
  } catch (n) {
    console.warn("News-Prompt: Legacy clipboard copy failed", n);
  }
  return !1;
}
function Wo(e) {
  if (!(typeof window > "u")) {
    try {
      const t = window.open(e, "_blank", "noopener,noreferrer");
      if (t) {
        t.opener = null;
        return;
      }
    } catch (t) {
      console.warn("News-Prompt: Link konnte nicht geöffnet werden", t);
    }
    if (typeof document < "u")
      try {
        const t = document.createElement("a");
        t.href = e, t.rel = "noopener noreferrer", t.target = "_blank", t.style.display = "none", document.body.appendChild(t), t.click(), document.body.removeChild(t);
        return;
      } catch (t) {
        console.warn("News-Prompt: Anchor-Fallback fehlgeschlagen", t);
      }
    try {
      window.location.href = e;
    } catch (t) {
      console.warn("News-Prompt: Link-Fallback fehlgeschlagen", t);
    }
  }
}
function Bo(e, t, n) {
  const r = Re(e?.average_cost), a = r?.account ?? ($(t) ? t : H(t));
  if (!$(a))
    return null;
  const i = e?.account_currency_code ?? e?.account_currency;
  if (typeof i == "string" && i.trim())
    return i.trim().toUpperCase();
  const o = ve(e?.currency_code) ?? "", s = r?.security ?? r?.native ?? ($(n) ? n : H(n)), c = Jt(e?.aggregation);
  if (o && $(s) && qe(a, s))
    return o;
  const l = H(c?.purchase_total_security) ?? H(e?.purchase_total_security), f = H(c?.purchase_total_account) ?? H(e?.purchase_total_account);
  let u = null;
  if ($(l) && l !== 0 && $(f) && (u = f / l), r?.source === "eur_total")
    return "EUR";
  const d = r?.eur;
  if ($(d) && qe(a, d))
    return "EUR";
  const p = H(e?.purchase_value_eur);
  return $(p) ? "EUR" : u != null && qe(u, 1) ? o || null : o === "EUR" ? "EUR" : o || "EUR";
}
function Ln(e) {
  return typeof e != "number" || !Number.isFinite(e) || e <= 0 ? null : e.toLocaleString("de-DE", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
  });
}
function jo(e) {
  const t = e, n = [
    "purchase_fx_date",
    "purchase_fx_timestamp",
    "purchase_fx_rate_date",
    "purchase_fx_rate_timestamp",
    "avg_price_updated_at",
    "avg_price_timestamp",
    "purchase_updated_at",
    "purchase_updated",
    "purchase_value_updated_at",
    "purchase_value_updated",
    "last_purchase_date",
    "last_purchase_timestamp",
    "last_transaction_date",
    "last_transaction_at"
  ];
  for (const i of n) {
    const o = t?.[i], s = dt(o);
    if (s != null)
      return s;
  }
  const r = [];
  t && "last_price_fetched_at" in t && r.push(t.last_price_fetched_at);
  const a = e?.last_price;
  a && typeof a == "object" && r.push(a.fetched_at), t && "last_price_date" in t && r.push(t.last_price_date);
  for (const i of r) {
    const o = dt(i);
    if (o != null)
      return o;
  }
  return null;
}
function Yo(e) {
  if (e == null || !Number.isFinite(e))
    return null;
  const t = new Date(e);
  return Number.isNaN(t.getTime()) ? null : t.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}
function Ko(e, t) {
  if (!e)
    return null;
  const n = ve(e.currency_code) ?? "", r = Re(e.average_cost);
  if (!r || !n)
    return null;
  const a = r.native ?? r.security ?? null;
  let o = r.account ?? r.eur ?? null, s = ve(t) ?? "";
  if (re(r.eur) && (!s || s === n) && (o = r.eur, s = "EUR"), !n || !s || n === s || !re(a) || !re(o))
    return null;
  const c = o / a;
  if (!Number.isFinite(c) || c <= 0)
    return null;
  const l = Ln(c);
  if (!l)
    return null;
  let f = null;
  if (c > 0) {
    const y = 1 / c;
    Number.isFinite(y) && y > 0 && (f = Ln(y));
  }
  const u = jo(e), g = Yo(u), d = [`FX-Kurs (Kauf): 1 ${n} = ${l} ${s}`];
  f && d.push(`1 ${s} = ${f} ${n}`);
  const p = [], m = r.source, _ = m in Dt ? Dt[m] : Dt.aggregation;
  if (p.push(`Quelle: ${_}`), $(r.coverage_ratio)) {
    const y = Math.min(Math.max(r.coverage_ratio * 100, 0), 100);
    p.push(
      `Abdeckung: ${y.toLocaleString("de-DE", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      })}%`
    );
  }
  p.length && d.push(...p);
  const h = g ?? "Datum unbekannt";
  return `${d.join(" · ")} (Stand: ${h})`;
}
function Mn(e) {
  if (!e)
    return null;
  const t = Re(e.average_cost), n = t?.native ?? t?.security ?? null;
  return $(n) ? n : null;
}
function Go(e) {
  if (!e)
    return '<div class="meta-error">Keine Snapshot-Daten verfügbar.</div>';
  const t = e.currency_code || "EUR", n = e.total_holdings_precise ?? e.total_holdings, r = cn(n), a = e.last_price_native ?? e.last_price?.native ?? e.last_price_eur, i = ue(a), o = i === "—" ? null : `${i}${`&nbsp;${D(t)}`}`, s = H(e.market_value_eur) ?? H(e.current_value_eur) ?? null, c = Re(e.average_cost), l = c?.native ?? c?.security ?? null, f = c?.eur ?? null, g = c?.account ?? null ?? f, d = me(e.performance), p = d?.day_change ?? null, m = p?.price_change_native ?? null, _ = p?.price_change_eur ?? null, h = $(m) ? m : _, y = $(m) ? t : "EUR", b = (T, V = "") => {
    const W = ["value"];
    return V && W.push(...V.split(" ").filter(Boolean)), `<span class="${W.join(" ")}">${T}</span>`;
  }, v = (T = "") => {
    const V = ["value--missing"];
    return T && V.push(T), b("—", V.join(" "));
  }, P = (T, V = "") => {
    if (!$(T))
      return v(V);
    const W = ["value--gain"];
    return V && W.push(V), b(Aa(T), W.join(" "));
  }, C = (T, V = "") => {
    if (!$(T))
      return v(V);
    const W = ["value--gain-percentage"];
    return V && W.push(V), b(Ca(T), W.join(" "));
  }, w = o ? b(o, "value--price") : v("value--price"), N = r === "—" ? v("value--holdings") : b(r, "value--holdings"), k = $(s) ? b(`${de(s)}&nbsp;€`, "value--market-value") : v("value--market-value"), I = $(h) ? b(
    Uo(h, y),
    "value--gain value--absolute"
  ) : v("value--absolute"), A = C(
    p?.change_pct,
    "value--percentage"
  ), x = P(
    d?.total_change_eur,
    "value--absolute"
  ), z = C(
    d?.total_change_pct,
    "value--percentage"
  ), E = Bo(
    e,
    g,
    l
  ), R = Ko(
    e,
    E
  ), K = R ? ` title="${ce(R)}"` : "", S = [], F = $(f);
  $(l) ? S.push(
    b(
      `${ue(l)}${`&nbsp;${D(t)}`}`,
      "value--average value--average-native"
    )
  ) : S.push(
    v("value--average value--average-native")
  );
  let L = null, Y = null;
  return F && (t !== "EUR" || !$(l) || !qe(f, l)) ? (L = f, Y = "EUR") : $(g) && E && (E !== t || !qe(g, l ?? NaN)) && (L = g, Y = E), L != null && $(L) && S.push(
    b(
      `${ue(L)}${Y ? `&nbsp;${D(Y)}` : ""}`,
      "value--average value--average-eur"
    )
  ), `
    <div class="security-meta-grid security-meta-grid--expanded">
      <div class="security-meta-item security-meta-item--price">
        <span class="label">Letzter Preis</span>
        <div class="value-group">${w}</div>
      </div>
      <div class="security-meta-item security-meta-item--average">
        <span class="label">Durchschnittlicher Kaufpreis</span>
        <div class="value-group"${K}>
          ${S.join("")}
        </div>
      </div>
      <div class="security-meta-item security-meta-item--day-change">
        <span class="label">Tagesänderung</span>
        <div class="value-group">
          ${I}
          ${A}
        </div>
      </div>
      <div class="security-meta-item security-meta-item--total-change">
        <span class="label">Gesamtänderung</span>
        <div class="value-group">
          ${x}
          ${z}
        </div>
      </div>
      <div class="security-meta-item security-meta-item--holdings">
        <span class="label">Bestand</span>
        <div class="value-group">${N}</div>
      </div>
      <div class="security-meta-item security-meta-item--market-value">
        <span class="label">Marktwert (EUR)</span>
        <div class="value-group">${k}</div>
      </div>
    </div>
  `;
}
function Xo(e) {
  return `
    <div class="card security-meta-card">
      <div id="headerMeta" class="meta">
        ${Go(e)}
      </div>
    </div>
  `;
}
function Kr(e) {
  if (!e)
    return null;
  if (typeof e == "string")
    return e;
  if (e instanceof Error)
    return e.message || null;
  try {
    const t = JSON.stringify(e);
    return t && t !== "{}" ? t : null;
  } catch {
    return null;
  }
}
function Zo(e, t, {
  currency: n,
  baseline: r,
  markers: a
} = {}) {
  const i = e.clientWidth || e.offsetWidth || 0, o = i > 0 ? i : 640, s = Math.min(Math.max(Math.floor(o * 0.5), 240), 440), c = (n || "").toUpperCase() || "EUR", l = $(r) ? r : null, f = Math.max(48, Math.min(72, Math.round(o * 0.075))), u = Math.max(28, Math.min(56, Math.round(o * 0.05))), g = Math.max(40, Math.min(64, Math.round(s * 0.14)));
  return {
    width: o,
    height: s,
    margin: {
      top: 18,
      right: u,
      bottom: g,
      left: f
    },
    series: t,
    yFormatter: (p) => ue(p),
    tooltipRenderer: ({ xFormatted: p, yFormatted: m }) => `
      <div class="chart-tooltip-date">${D(p)}</div>
      <div class="chart-tooltip-value">${D(m)}&nbsp;${D(c)}</div>
    `,
    markerTooltipRenderer: ({
      marker: p,
      xFormatted: m,
      yFormatted: _
    }) => {
      const h = p.payload ?? {}, y = Or(h.type), b = H(h.shares), v = b != null ? cn(b) : null, P = ve(h.currency) ?? c, C = [];
      y && C.push(y), v && C.push(`${v} Stück`), m && C.push(`am ${m}`);
      const w = C.join(" ").trim() || (typeof p.label == "string" ? p.label : m), N = typeof _ == "string" && _.trim() ? _.trim() : ue(h.price), k = N ? `${N}${P ? `&nbsp;${D(P)}` : ""}` : D(P);
      return `
      <div class="chart-tooltip-date">${D(w)}</div>
      <div class="chart-tooltip-value">${k}</div>
    `;
    },
    baseline: l != null ? {
      value: l
    } : null,
    markers: Array.isArray(a) ? a : []
  };
}
const Hn = /* @__PURE__ */ new WeakMap();
function Jo(e, t, n = {}) {
  if (t.length === 0)
    return;
  const r = Zo(e, t, n);
  let a = Hn.get(e) ?? null;
  if (!a || !e.contains(a)) {
    e.innerHTML = "", a = uo(e, r), a && Hn.set(e, a);
    return;
  }
  Lr(a, r);
}
function In(e, t) {
  e && (e.dataset.activeRange = t, e.querySelectorAll(".security-range-button").forEach((n) => {
    const r = n.dataset.range, a = r === t;
    n.classList.toggle("active", a), n.setAttribute("aria-pressed", a ? "true" : "false"), n.disabled = !1, n.classList.remove("loading"), r && (n.textContent = r);
  }));
}
function Qo(e, t, n, r, a) {
  const i = e.querySelector(".security-info-bar");
  if (!i || !i.parentElement)
    return;
  const o = document.createElement("div");
  o.innerHTML = jr(t, n, r, a).trim();
  const s = o.firstElementChild;
  s && i.parentElement.replaceChild(s, i);
}
function Vn(e, t, n, r, a = {}) {
  const i = e.querySelector(".security-detail-placeholder");
  if (i && (i.innerHTML = `
    <h2>Historie</h2>
    ${Yr(t, n)}
  `, n.status === "loaded" && Array.isArray(r) && r.length)) {
    const o = i.querySelector(".history-chart");
    o && requestAnimationFrame(() => {
      Jo(o, r, a);
    });
  }
}
function es(e) {
  const {
    root: t,
    hass: n,
    panelConfig: r,
    securityUuid: a,
    snapshot: i,
    initialRange: o,
    initialHistory: s,
    initialHistoryState: c
  } = e;
  setTimeout(() => {
    const l = t.querySelector(".security-range-selector");
    if (!l)
      return;
    const f = Ir(a), u = Vr(a), g = Mn(i);
    Array.isArray(s) && c.status !== "error" && f.set(o, s), ko(a), Tn(a, o), In(l, o);
    const p = qt(
      s,
      i
    );
    let m = c;
    m.status !== "error" && (m = p.length ? { status: "loaded" } : { status: "empty" }), Vn(
      t,
      o,
      m,
      p,
      {
        currency: i?.currency_code,
        baseline: g,
        markers: u.get(o) ?? []
      }
    );
    const _ = async (h) => {
      if (h === qr(a))
        return;
      const y = l.querySelector(
        `.security-range-button[data-range="${h}"]`
      );
      y && (y.disabled = !0, y.classList.add("loading"), y.innerHTML = wa());
      let b = f.get(h) ?? null, v = u.get(h) ?? null, P = null, C = [];
      if (b)
        P = b.length ? { status: "loaded" } : { status: "empty" };
      else
        try {
          const x = ut(h), z = await tt(
            n,
            r,
            a,
            x
          );
          b = zt(z.prices), v = ft(
            z.transactions,
            i?.currency_code,
            i
          ), f.set(h, b), v = Array.isArray(v) ? v : [], u.set(h, v), P = b.length ? { status: "loaded" } : { status: "empty" };
        } catch (x) {
          console.error("Range-Wechsel: Historie konnte nicht geladen werden", x), b = [], v = [], P = {
            status: "error",
            message: Kr(x) || "Die historischen Daten konnten aufgrund eines Fehlers nicht geladen werden."
          };
        }
      if (!Array.isArray(v))
        try {
          const x = ut(h), z = await tt(
            n,
            r,
            a,
            x
          );
          v = ft(
            z.transactions,
            i?.currency_code,
            i
          ), v = Array.isArray(v) ? v : [], u.set(h, v);
        } catch (x) {
          console.error("Range-Wechsel: Transaktionsmarker konnten nicht geladen werden", x), v = [];
        }
      C = qt(b, i), P.status !== "error" && (P = C.length ? { status: "loaded" } : { status: "empty" });
      const w = on(i), { priceChange: N, priceChangePct: k } = Br(
        C,
        w
      ), I = Array.isArray(v) ? v : [];
      Tn(a, h), In(l, h), Qo(
        t,
        h,
        N,
        k,
        i?.currency_code
      );
      const A = Mn(i);
      Vn(
        t,
        h,
        P,
        C,
        {
          currency: i?.currency_code,
          baseline: A,
          markers: I
        }
      );
    };
    l.addEventListener("click", (h) => {
      const y = h.target?.closest(".security-range-button");
      if (!y || y.disabled)
        return;
      const { range: b } = y.dataset;
      !b || !Mr.includes(b) || _(b);
    });
  }, 0);
}
function ts(e) {
  const { root: t, hass: n, panelConfig: r, tickerSymbol: a } = e;
  let i = null, o = !1;
  const s = async () => {
    try {
      i = await Ma(n, r);
    } catch (c) {
      o = !0, console.warn("News-Prompt: Prefetch fehlgeschlagen", c);
    }
  };
  s(), setTimeout(() => {
    const c = t.querySelector(".news-prompt-button");
    if (!c)
      return;
    const l = (u) => {
      const g = (i?.placeholder || Rn).trim() || Rn, d = (i?.prompt_template || "").trim(), p = (i?.link || "").trim() || wo;
      return { body: d ? d.includes(g) ? d.split(g).join(u) : `${d}

Ticker: ${u}` : `Ticker: ${u}`, link: p };
    }, f = async () => {
      const u = (c.dataset.symbol || a || "").trim();
      if (!u) {
        console.warn("News-Prompt: Kein Ticker verfügbar");
        return;
      }
      if (c.classList.contains("loading"))
        return;
      c.disabled = !0, c.classList.add("loading");
      const g = c.textContent;
      try {
        const { body: d, link: p } = l(u), m = await Oo(d);
        m ? c.textContent = "✅ Copied! Opening..." : console.warn("News-Prompt: Clipboard unavailable – prompt could not be copied"), m && await new Promise((_) => setTimeout(_, 800)), Wo(p), !i && !o && s();
      } catch (d) {
        console.error("News-Prompt: Kopiervorgang fehlgeschlagen", d);
      } finally {
        c.classList.remove("loading"), c.disabled = !1, g && setTimeout(() => {
          c.textContent = g;
        }, 2e3);
      }
    };
    c.addEventListener("click", () => {
      f();
    });
  }, 0);
}
async function ns(e, t, n, r) {
  if (!r)
    return console.error("renderSecurityDetail: securityUuid fehlt"), '<div class="card"><h2>Fehler</h2><p>Kein Wertpapier angegeben.</p></div>';
  const a = xo(r);
  let i = null, o = null;
  try {
    const A = await La(
      t,
      n,
      r
    ), x = A.snapshot;
    i = x && typeof x == "object" ? x : A;
  } catch (A) {
    console.error("renderSecurityDetail: Snapshot konnte nicht geladen werden", A), o = Wr(A);
  }
  const s = i || a, c = !!(a && !i), l = (s?.source ?? "") === "cache";
  r && Eo(r, s ?? null);
  const f = s && (c || l) ? No({ fallbackUsed: c, flaggedAsCache: l }) : "", u = s?.name || "Wertpapierdetails", g = On(u, "", { includeMeta: !1 });
  g.classList.add("security-detail-header");
  const d = Xo(s);
  if (o)
    return `
      ${g.outerHTML}
      ${d}
      ${f}
      <div class="card error-card">
        <h2>Fehler beim Laden</h2>
        <p>${o}</p>
      </div>
    `;
  const p = qr(r), m = Ir(r), _ = Vr(r);
  let h = m.has(p) ? m.get(p) ?? null : null, y = { status: "empty" }, b = _.has(p) ? _.get(p) ?? null : null;
  if (Array.isArray(h))
    y = h.length ? { status: "loaded" } : { status: "empty" };
  else {
    h = [];
    try {
      const A = ut(p), x = await tt(
        t,
        n,
        r,
        A
      );
      h = zt(x.prices), b = ft(
        x.transactions,
        s?.currency_code,
        s
      ), m.set(p, h), b = Array.isArray(b) ? b : [], _.set(p, b), y = h.length ? { status: "loaded" } : { status: "empty" };
    } catch (A) {
      console.error(
        "renderSecurityDetail: Historie konnte nicht geladen werden",
        A
      ), y = {
        status: "error",
        message: Kr(A) || "Die historischen Daten konnten aufgrund eines Fehlers nicht geladen werden."
      };
    }
  }
  if (!Array.isArray(b))
    try {
      const A = ut(p), x = await tt(
        t,
        n,
        r,
        A
      ), z = zt(x.prices);
      b = ft(
        x.transactions,
        s?.currency_code,
        s
      ), m.set(p, z), b = Array.isArray(b) ? b : [], _.set(p, b), h = z, y = h.length ? { status: "loaded" } : { status: "empty" };
    } catch (A) {
      console.error(
        "renderSecurityDetail: Transaktionsmarker konnten nicht geladen werden",
        A
      ), b = [];
    }
  const v = qt(
    h,
    s
  );
  y.status !== "error" && (y = v.length ? { status: "loaded" } : { status: "empty" });
  const P = zo(s, r), C = qo(P), w = on(s), { priceChange: N, priceChangePct: k } = Br(
    v,
    w
  ), I = jr(
    p,
    N,
    k,
    s?.currency_code
  );
  return es({
    root: e,
    hass: t,
    panelConfig: n,
    securityUuid: r,
    snapshot: s,
    initialRange: p,
    initialHistory: h,
    initialHistoryState: y
  }), ts({
    root: e,
    hass: t,
    panelConfig: n,
    tickerSymbol: P
  }), `
    ${g.outerHTML}
    ${d}
    ${f}
    ${C}
    ${I}
    ${Vo(p)}
    <div class="card security-detail-placeholder">
      <h2>Historie</h2>
      ${Yr(p, y)}
    </div>
  `;
}
function rs(e) {
  const { setSecurityDetailTabFactory: t } = e;
  if (typeof t != "function") {
    console.error("registerSecurityDetailTab: Ungültige Factory-Funktion übergeben");
    return;
  }
  t((n) => ({
    title: "Wertpapier",
    render: (r, a, i) => ns(r, a, i, n),
    cleanup: () => {
      Ro(n);
    }
  }));
}
const as = Pa, Ot = "pp-reader-sticky-anchor", pt = "overview", Wt = "security:", is = [
  { key: pt, title: "Dashboard", render: Ar }
], De = /* @__PURE__ */ new Map(), Ke = [], gt = /* @__PURE__ */ new Map();
let Bt = null, Rt = !1, Ee = null, O = 0, Tt = null;
function ht(e) {
  return typeof e == "object" && e !== null;
}
function Gr(e) {
  return typeof e == "object" && e !== null && typeof e.then == "function";
}
function os(e) {
  if (typeof e == "string") {
    const t = e.trim();
    return t.length > 0 ? t : "Unbekannter Fehler";
  }
  if (e instanceof Error) {
    const t = e.message.trim();
    return t.length > 0 ? t : e.name;
  }
  if (e != null)
    try {
      const t = JSON.stringify(e);
      if (t && t !== "{}")
        return t;
    } catch {
    }
  return String(e);
}
function ss(e) {
  return e === "accounts" || e === "last_file_update" || e === "portfolio_values" || e === "portfolio_positions";
}
function Un(e) {
  const t = e.portfolio_uuid;
  if (typeof t == "string" && t)
    return t;
  const n = e.portfolioUuid;
  return typeof n == "string" && n ? n : null;
}
function cs(e) {
  if (!e)
    return null;
  if (Array.isArray(e)) {
    for (const t of e)
      if (ht(t)) {
        const n = Un(t);
        if (n)
          return n;
      }
    return null;
  }
  return ht(e) ? Un(e) : null;
}
function ls(e, t) {
  switch (e) {
    case "accounts":
      return {
        type: e,
        data: Array.isArray(t) ? t : null
      };
    case "last_file_update":
      return typeof t == "string" ? { type: e, data: t } : ht(t) ? { type: e, data: t } : { type: e, data: null };
    case "portfolio_values":
      return Array.isArray(t) ? { type: e, data: t } : { type: e, data: null };
    case "portfolio_positions":
      return Array.isArray(t) ? { type: e, data: t } : ht(t) ? { type: e, data: t } : { type: e, data: null };
    default:
      return null;
  }
}
function ln(e) {
  return typeof e != "string" || !e.startsWith(Wt) ? null : e.slice(Wt.length) || null;
}
function us() {
  if (!Ee)
    return !1;
  const e = ea(Ee);
  return e || (Ee = null), e;
}
function se() {
  const e = Ke.map((t) => De.get(t)).filter((t) => !!t);
  return [...is, ...e];
}
function ds(e) {
  const t = se();
  return e < 0 || e >= t.length ? null : t[e];
}
function Xr(e) {
  if (!e)
    return null;
  const t = e, n = t.ppreader ?? t.pp_reader;
  return n || (Object.values(t).find((a) => !a || typeof a != "object" ? !1 : a.webcomponent_name === "pp-reader-panel") ?? null);
}
function Zr() {
  try {
    const e = vt();
    e && typeof e.rememberScrollPosition == "function" && e.rememberScrollPosition();
  } catch (e) {
    console.warn("rememberCurrentPageScroll: konnte Scroll-Position nicht sichern", e);
  }
}
function zn(e) {
  const t = se();
  return !t.length || e < 0 ? 0 : e >= t.length ? t.length - 1 : e;
}
async function fs(e, t, n, r) {
  const a = se(), i = zn(e);
  if (i === O) {
    e > O && us();
    return;
  }
  Zr();
  const o = O >= 0 && O < a.length ? a[O] : null, s = o ? ln(o.key) : null;
  let c = i;
  if (s) {
    const l = i >= 0 && i < a.length ? a[i] : null;
    if (l && l.key === pt && ys(s, { suppressRender: !0 })) {
      const g = se().findIndex((d) => d.key === pt);
      c = g >= 0 ? g : 0;
    }
  }
  if (!Rt) {
    Rt = !0;
    try {
      O = zn(c);
      const l = O;
      await ta(t, n, r), ms(l);
    } catch (l) {
      console.error("navigateToPage: Fehler beim Rendern des Tabs", l);
    } finally {
      Rt = !1;
    }
  }
}
function mt(e, t, n, r) {
  fs(O + e, t, n, r);
}
function ps(e, t) {
  if (!e || !t || typeof t.render != "function") {
    console.error("registerDetailTab: Ungültiger Tab-Descriptor", e, t);
    return;
  }
  const n = ln(e);
  if (n) {
    const a = gt.get(n);
    a && a !== e && Jr(a);
  }
  const r = {
    ...t,
    key: e
  };
  De.set(e, r), n && gt.set(n, e), Ke.includes(e) || Ke.push(e);
}
function Jr(e) {
  if (!e)
    return;
  const t = De.get(e);
  if (t && typeof t.cleanup == "function")
    try {
      const a = t.cleanup({ key: e });
      Gr(a) && a.catch((i) => {
        console.error(
          "unregisterDetailTab: Fehler beim asynchronen cleanup",
          i
        );
      });
    } catch (a) {
      console.error("unregisterDetailTab: Fehler beim Ausführen von cleanup", a);
    }
  De.delete(e);
  const n = Ke.indexOf(e);
  n >= 0 && Ke.splice(n, 1);
  const r = ln(e);
  r && gt.get(r) === e && gt.delete(r);
}
function gs(e) {
  return De.has(e);
}
function qn(e) {
  return De.get(e) ?? null;
}
function hs(e) {
  if (e != null && typeof e != "function") {
    console.error("setSecurityDetailTabFactory: Erwartet Funktion oder null", e);
    return;
  }
  Bt = e ?? null;
}
function Qr(e) {
  return `${Wt}${e}`;
}
function vt() {
  for (const t of Va())
    if (t.isConnected)
      return t;
  const e = /* @__PURE__ */ new Set();
  for (const t of Ua())
    e.add(t);
  for (const t of e) {
    const n = t.shadowRoot?.querySelector("pp-reader-dashboard");
    if (n)
      return n;
  }
  if (typeof document < "u") {
    const t = document.querySelector("pp-reader-dashboard");
    if (t)
      return t;
  }
  return null;
}
function jt() {
  const e = vt();
  if (!e) {
    console.warn("requestDashboardRender: Kein pp-reader-dashboard Element gefunden");
    return;
  }
  if (typeof e._renderIfInitialized == "function") {
    e._renderIfInitialized();
    return;
  }
  typeof e._render == "function" && e._render();
}
const Fs = {
  findDashboardElement: vt
};
function ms(e) {
  const t = vt();
  if (t && typeof t.handleExternalRender == "function")
    try {
      t.handleExternalRender(e);
    } catch (n) {
      console.warn("notifyExternalRender: Fehler beim Synchronisieren des Dashboards", n);
    }
}
function ea(e) {
  if (!e)
    return console.error("openSecurityDetail: Ungültige securityUuid", e), !1;
  const t = Qr(e);
  let n = qn(t);
  if (!n && typeof Bt == "function")
    try {
      const i = Bt(e);
      i && typeof i.render == "function" ? (ps(t, i), n = qn(t)) : console.error("openSecurityDetail: Factory lieferte ungültigen Descriptor", i);
    } catch (i) {
      console.error("openSecurityDetail: Fehler beim Erzeugen des Tab-Descriptors", i);
    }
  if (!n)
    return console.warn(`openSecurityDetail: Kein Detail-Tab für ${e} verfügbar`), !1;
  Zr();
  let a = se().findIndex((i) => i.key === t);
  return a === -1 && (a = se().findIndex((o) => o.key === t), a === -1) ? (console.error("openSecurityDetail: Tab nach Registrierung nicht auffindbar"), !1) : (O = a, Ee = null, jt(), !0);
}
function ys(e, t = {}) {
  if (!e)
    return console.error("closeSecurityDetail: Ungültige securityUuid", e), !1;
  const { suppressRender: n = !1 } = t, r = Qr(e);
  if (!gs(r))
    return !1;
  const i = se().findIndex((c) => c.key === r), o = i === O;
  Jr(r);
  const s = se();
  if (!s.length)
    return O = 0, n || jt(), !0;
  if (Ee = e, o) {
    const c = s.findIndex((l) => l.key === pt);
    c >= 0 ? O = c : O = Math.min(Math.max(i - 1, 0), s.length - 1);
  } else O >= s.length && (O = Math.max(0, s.length - 1));
  return n || jt(), !0;
}
async function ta(e, t, n) {
  let r = n;
  r || (r = Xr(t ? t.panels : null));
  const a = se();
  O >= a.length && (O = Math.max(0, a.length - 1));
  const i = ds(O);
  if (!i) {
    console.error("renderTab: Kein gültiger Tab oder keine render-Methode gefunden!");
    return;
  }
  let o;
  try {
    o = await i.render(e, t, r);
  } catch (f) {
    console.error("renderTab: Fehler beim Rendern des Tabs:", f), e.innerHTML = `<div class="card"><h2>Fehler</h2><pre>${os(f)}</pre></div>`;
    return;
  }
  e.innerHTML = o ?? "", i.render === Ar && rn(e);
  const c = await new Promise((f) => {
    const u = window.setInterval(() => {
      const g = e.querySelector(".header-card");
      g && (clearInterval(u), f(g));
    }, 50);
  });
  let l = e.querySelector(`#${Ot}`);
  if (!l) {
    l = document.createElement("div"), l.id = Ot;
    const f = c.parentNode;
    f && "insertBefore" in f && f.insertBefore(l, c);
  }
  vs(e, t, n), bs(e, t, n), _s(e);
}
function _s(e) {
  const t = e.querySelector(".header-card"), n = e.querySelector(`#${Ot}`);
  if (!t || !n) {
    console.error("Fehlende Elemente für das Scrollverhalten: headerCard oder anchor.");
    return;
  }
  Tt?.disconnect(), Tt = new IntersectionObserver(
    ([r]) => {
      r.isIntersecting ? t.classList.remove("sticky") : t.classList.add("sticky");
    },
    {
      root: null,
      rootMargin: "0px 0px 0px 0px",
      threshold: 0
    }
  ), Tt.observe(n);
}
function bs(e, t, n) {
  const r = e.querySelector(".header-card");
  if (!r) {
    console.error("Header-Card nicht gefunden!");
    return;
  }
  as(
    r,
    () => {
      mt(1, e, t, n);
    },
    () => {
      mt(-1, e, t, n);
    }
  );
}
function vs(e, t, n) {
  const r = e.querySelector(".header-card");
  if (!r) {
    console.error("Header-Card nicht gefunden!");
    return;
  }
  const a = r.querySelector("#nav-left"), i = r.querySelector("#nav-right");
  if (!a || !i) {
    console.error("Navigationspfeile nicht gefunden!");
    return;
  }
  a.addEventListener("click", () => {
    mt(-1, e, t, n);
  }), i.addEventListener("click", () => {
    mt(1, e, t, n);
  }), Ss(r);
}
function Ss(e) {
  const t = e.querySelector("#nav-left"), n = e.querySelector("#nav-right");
  if (t && (O === 0 ? (t.disabled = !0, t.classList.add("disabled")) : (t.disabled = !1, t.classList.remove("disabled"))), n) {
    const r = se(), i = !(O === r.length - 1) || !!Ee;
    n.disabled = !i, n.classList.toggle("disabled", !i);
  }
}
class Ps extends HTMLElement {
  _root;
  _hass = null;
  _panel = null;
  _narrow = null;
  _route = null;
  _lastPanel = null;
  _lastNarrow = null;
  _lastRoute = null;
  _lastPage = null;
  _scrollPositions = {};
  _unsubscribeEvents = null;
  _initialized = !1;
  _hasNewData = !1;
  _pendingUpdates = [];
  _entryIdWaitWarned = !1;
  constructor() {
    super(), this._root = document.createElement("div"), this._root.className = "pp-reader-dashboard", this.appendChild(this._root);
  }
  set hass(t) {
    this._hass = t ?? null, this._checkInitialization();
  }
  set panel(t) {
    this._panel !== t && (this._panel = t ?? null, this._checkInitialization());
  }
  set narrow(t) {
    this._narrow !== (t ?? null) && (this._narrow = t ?? null, this._renderIfInitialized());
  }
  set route(t) {
    this._route !== (t ?? null) && (this._route = t ?? null, this._renderIfInitialized());
  }
  connectedCallback() {
    this._checkInitialization();
  }
  disconnectedCallback() {
    this._removeEventListeners();
  }
  _checkInitialization() {
    if (!this._hass || this._initialized)
      return;
    this._panel || (this._panel = Xr(this._hass.panels ?? null));
    const t = mn(this._hass, this._panel);
    if (!t) {
      this._entryIdWaitWarned || (console.warn("PPReaderDashboard: kein entry_id ermittelbar – warte auf Panel-Konfiguration."), this._entryIdWaitWarned = !0);
      return;
    }
    this._entryIdWaitWarned = !1, console.debug("PPReaderDashboard: entry_id (fallback) =", t), this._initialized = !0, this._initializeEventListeners(), this._render();
  }
  _initializeEventListeners() {
    this._removeEventListeners();
    const t = this._hass?.connection;
    if (!t || typeof t.subscribeEvents != "function") {
      console.error("PPReaderDashboard: keine valide WebSocket-Verbindung oder subscribeEvents fehlt");
      return;
    }
    const n = ["panels_updated"], r = [];
    Promise.all(
      n.map(async (i) => {
        try {
          const o = await t.subscribeEvents(
            this._handleBusEvent.bind(this),
            i
          );
          typeof o == "function" ? (r.push(o), console.debug("PPReaderDashboard: subscribed to", i)) : console.error(
            "PPReaderDashboard: subscribeEvents lieferte kein Unsubscribe-Func für",
            i,
            o
          );
        } catch (o) {
          console.error("PPReaderDashboard: Fehler bei subscribeEvents für", i, o);
        }
      })
    ).then(() => {
      this._unsubscribeEvents = () => {
        r.forEach((i) => {
          try {
            i();
          } catch {
          }
        }), console.debug("PPReaderDashboard: alle Event-Subscriptions entfernt");
      };
    }).catch((i) => {
      console.error("PPReaderDashboard: Fehler beim Registrieren der Events", i);
    });
  }
  _removeEventListeners() {
    if (typeof this._unsubscribeEvents == "function")
      try {
        this._unsubscribeEvents();
      } catch (t) {
        console.error("PPReaderDashboard: Fehler beim Entfernen der Event-Listener:", t);
      }
    this._unsubscribeEvents = null;
  }
  _handleBusEvent(t) {
    const n = mn(this._hass, this._panel);
    if (!n)
      return;
    const r = t.data;
    if (!ss(r.data_type) || r.entry_id && r.entry_id !== n)
      return;
    const a = ls(r.data_type, r.data);
    a && (this._queueUpdate(a.type, a.data), this._doRender(a.type, a.data));
  }
  _doRender(t, n) {
    switch (t) {
      case "accounts":
        Fi(
          n,
          this._root
        );
        break;
      case "last_file_update":
        Hi(
          n,
          this._root
        );
        break;
      case "portfolio_values":
        Ri(
          n,
          this._root
        );
        break;
      case "portfolio_positions":
        Li(
          n,
          this._root
        );
        break;
      default:
        console.warn("PPReaderDashboard: Unbekannter Datentyp:", t);
        break;
    }
  }
  _queueUpdate(t, n) {
    const r = this._cloneData(n), a = {
      type: t,
      data: r
    };
    t === "portfolio_positions" && (a.portfolioUuid = cs(
      r
    ));
    let i = -1;
    t === "portfolio_positions" && a.portfolioUuid ? i = this._pendingUpdates.findIndex(
      (o) => o.type === t && o.portfolioUuid === a.portfolioUuid
    ) : i = this._pendingUpdates.findIndex((o) => o.type === t), i >= 0 ? this._pendingUpdates[i] = a : this._pendingUpdates.push(a), this._hasNewData = !0;
  }
  _cloneData(t) {
    if (t == null)
      return t;
    try {
      if (typeof structuredClone == "function")
        return structuredClone(t);
    } catch (n) {
      console.warn("PPReaderDashboard: structuredClone fehlgeschlagen, falle auf JSON zurück", n);
    }
    try {
      return JSON.parse(JSON.stringify(t));
    } catch (n) {
      return console.warn("PPReaderDashboard: JSON-Clone fehlgeschlagen, referenziere Originaldaten", n), t;
    }
  }
  _reapplyPendingUpdates() {
    if (!(!Array.isArray(this._pendingUpdates) || this._pendingUpdates.length === 0))
      for (const t of this._pendingUpdates)
        try {
          this._doRender(t.type, this._cloneData(t.data));
        } catch (n) {
          console.error("PPReaderDashboard: Fehler beim erneuten Anwenden eines Updates", t, n);
        }
  }
  _renderIfInitialized() {
    this._initialized && this._render();
  }
  handleExternalRender(t) {
    this._afterRender(t);
  }
  rememberScrollPosition(t = O) {
    const n = Number.isInteger(t) ? t : O;
    this._scrollPositions[n] = this._root.scrollTop || 0;
  }
  _render() {
    if (!this._hass) {
      console.warn("pp-reader-dashboard: noch kein hass, überspringe _render()");
      return;
    }
    if (!this._initialized) {
      console.debug("pp-reader-dashboard: _render aufgerufen bevor initialisiert");
      return;
    }
    const t = O;
    if (!this._hasNewData && this._panel === this._lastPanel && this._narrow === this._lastNarrow && this._route === this._lastRoute && this._lastPage === t)
      return;
    this._lastPage != null && (this._scrollPositions[this._lastPage] = this._root.scrollTop);
    const n = ta(this._root, this._hass, this._panel);
    if (Gr(n)) {
      n.then(() => {
        this._afterRender(t);
      }).catch((r) => {
        console.error("PPReaderDashboard: Fehler beim Rendern des Tabs", r), this._afterRender(t);
      });
      return;
    }
    this._afterRender(t);
  }
  _afterRender(t) {
    const n = this._scrollPositions[t] || 0;
    this._root.scrollTop = n, this._lastPanel = this._panel, this._lastNarrow = this._narrow, this._lastRoute = this._route, this._lastPage = t;
    try {
      this._reapplyPendingUpdates();
    } catch (r) {
      console.error("PPReaderDashboard: Fehler beim Wiederanlegen der Updates", r);
    }
    this._hasNewData = !1;
  }
}
customElements.get("pp-reader-dashboard") || customElements.define("pp-reader-dashboard", Ps);
console.log("PPReader dashboard module v20250914b geladen");
rs({
  setSecurityDetailTabFactory: hs
});
export {
  Fs as __TEST_ONLY_DASHBOARD,
  xs as __TEST_ONLY__,
  ys as closeSecurityDetail,
  nn as flushPendingPositions,
  qn as getDetailTabDescriptor,
  Li as handlePortfolioPositionsUpdate,
  gs as hasDetailTab,
  ea as openSecurityDetail,
  Es as reapplyPositionsSort,
  As as registerDashboardElement,
  ps as registerDetailTab,
  ws as registerPanelHost,
  hs as setSecurityDetailTabFactory,
  Cs as unregisterDashboardElement,
  Jr as unregisterDetailTab,
  Ns as unregisterPanelHost,
  Pr as updatePortfolioFooterFromDom
};
//# sourceMappingURL=dashboard.BGYOTQrG.js.map
