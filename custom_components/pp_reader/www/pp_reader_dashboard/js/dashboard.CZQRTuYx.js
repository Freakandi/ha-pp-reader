const un = /* @__PURE__ */ new Set(), dn = /* @__PURE__ */ new Set(), pr = {}, Za = [
  "renderPositionsTable",
  "applyGainPctMetadata",
  "attachSecurityDetailListener",
  "attachPortfolioPositionsSorting",
  "updatePortfolioFooter"
];
function Ja(e, t) {
  typeof t == "function" && (pr[e] = t);
}
function Nc(e) {
  e && un.add(e);
}
function xc(e) {
  e && un.delete(e);
}
function Qa() {
  return un;
}
function Dc(e) {
  e && dn.add(e);
}
function kc(e) {
  e && dn.delete(e);
}
function ei() {
  return dn;
}
function ti(e) {
  for (const t of Za)
    Ja(t, e[t]);
}
function fn() {
  return pr;
}
function me(e) {
  return typeof e == "object" && e !== null;
}
function W(e) {
  return typeof e == "string" ? e : null;
}
function et(e) {
  return e === null ? null : W(e);
}
function V(e) {
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
function xn(e) {
  const t = V(e);
  if (t == null)
    return null;
  const n = Math.trunc(t);
  return Number.isFinite(n) ? n : null;
}
function nt(e) {
  return me(e) ? { ...e } : null;
}
function gr(e) {
  return me(e) ? { ...e } : null;
}
function hr(e) {
  return typeof e == "boolean" ? e : void 0;
}
function ni(e) {
  if (!me(e))
    return null;
  const t = W(e.name), n = W(e.currency_code), r = V(e.orig_balance);
  if (!t || !n || r == null)
    return null;
  const a = e.balance === null ? null : V(e.balance), i = {
    uuid: W(e.uuid) ?? void 0,
    name: t,
    currency_code: n,
    orig_balance: r,
    balance: a ?? null
  }, o = V(e.fx_rate);
  o != null && (i.fx_rate = o);
  const s = W(e.fx_rate_source);
  s && (i.fx_rate_source = s);
  const c = W(e.fx_rate_timestamp);
  c && (i.fx_rate_timestamp = c);
  const l = V(e.coverage_ratio);
  l != null && (i.coverage_ratio = l);
  const u = W(e.provenance);
  u && (i.provenance = u);
  const d = et(e.metric_run_uuid);
  d !== null && (i.metric_run_uuid = d);
  const p = hr(e.fx_unavailable);
  return typeof p == "boolean" && (i.fx_unavailable = p), i;
}
function mr(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = ni(n);
    r && t.push(r);
  }
  return t;
}
function ri(e) {
  if (!me(e))
    return null;
  const t = e.aggregation, n = W(e.security_uuid), r = W(e.name), a = V(e.current_holdings), i = V(e.purchase_value_eur) ?? (me(t) ? V(t.purchase_value_eur) ?? V(t.purchase_total_account) ?? V(t.account_currency_total) : null) ?? V(e.purchase_value), o = V(e.current_value);
  if (!n || !r || a == null || i == null || o == null)
    return null;
  const s = {
    portfolio_uuid: W(e.portfolio_uuid) ?? void 0,
    security_uuid: n,
    name: r,
    ticker_symbol: W(e.ticker_symbol),
    currency_code: W(e.currency_code),
    current_holdings: a,
    purchase_value: i,
    current_value: o,
    average_cost: nt(e.average_cost),
    performance: nt(e.performance),
    aggregation: nt(e.aggregation),
    data_state: gr(e.data_state)
  }, c = V(e.coverage_ratio);
  c != null && (s.coverage_ratio = c);
  const l = W(e.provenance);
  l && (s.provenance = l);
  const u = et(e.metric_run_uuid);
  u !== null && (s.metric_run_uuid = u);
  const d = V(e.last_price_native);
  d != null && (s.last_price_native = d);
  const p = V(e.last_price_eur);
  p != null && (s.last_price_eur = p);
  const f = V(e.last_close_native);
  f != null && (s.last_close_native = f);
  const g = V(e.last_close_eur);
  return g != null && (s.last_close_eur = g), s;
}
function yr(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = ri(n);
    r && t.push(r);
  }
  return t;
}
function br(e) {
  if (!me(e))
    return null;
  const t = W(e.name), n = V(e.current_value ?? e.value);
  if (!t || n == null)
    return null;
  const a = V(
    e.purchase_sum ?? e.purchase_value_eur ?? e.purchase_value ?? e.purchaseSum
  ) ?? 0, i = {
    uuid: W(e.uuid) ?? void 0,
    name: t,
    current_value: n,
    purchase_value: a,
    purchase_sum: a,
    day_change_abs: V(e.day_change_abs) ?? V(e.day_change_eur) ?? void 0,
    day_change_pct: V(e.day_change_pct) ?? void 0,
    position_count: xn(e.position_count ?? e.count) ?? void 0,
    missing_value_positions: xn(e.missing_value_positions) ?? void 0,
    has_current_value: hr(e.has_current_value),
    performance: nt(e.performance),
    coverage_ratio: V(e.coverage_ratio) ?? void 0,
    provenance: W(e.provenance) ?? void 0,
    metric_run_uuid: et(e.metric_run_uuid) ?? void 0,
    data_state: gr(e.data_state)
  };
  return Array.isArray(e.positions) && (i.positions = yr(e.positions)), i;
}
function _r(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = br(n);
    r && t.push(r);
  }
  return t;
}
function vr(e) {
  if (!me(e))
    return null;
  const t = { ...e }, n = et(e.metric_run_uuid);
  n !== null ? t.metric_run_uuid = n : delete t.metric_run_uuid;
  const r = V(e.coverage_ratio);
  r != null ? t.coverage_ratio = r : delete t.coverage_ratio;
  const a = W(e.provenance);
  a ? t.provenance = a : delete t.provenance;
  const i = W(e.generated_at ?? e.snapshot_generated_at);
  return i ? t.generated_at = i : delete t.generated_at, t;
}
function ai(e) {
  if (!me(e))
    return null;
  const t = { ...e }, n = vr(e.normalized_payload);
  return n ? t.normalized_payload = n : "normalized_payload" in t && delete t.normalized_payload, t;
}
function Sr(e) {
  if (!me(e))
    return null;
  const t = W(e.generated_at);
  if (!t)
    return null;
  const n = et(e.metric_run_uuid), r = mr(e.accounts), a = _r(e.portfolios), i = ai(e.diagnostics), o = {
    generated_at: t,
    metric_run_uuid: n,
    accounts: r,
    portfolios: a
  };
  return i && (o.diagnostics = i), o;
}
function Dn(e) {
  return typeof e == "string" ? e : null;
}
function ii(e) {
  if (typeof e == "string")
    return e;
  if (e === null)
    return null;
}
function oi(e) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
}
function kn(e, t) {
  if (typeof e == "string")
    return e;
  throw new Error(`mapPositionSnapshotToRecord: fehlendes ${t}`);
}
function Ft(e, t) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  throw new Error(`mapPositionSnapshotToRecord: fehlendes ${t}`);
}
function si(e) {
  const t = kn(e.security_uuid, "security_uuid"), n = kn(e.name, "name"), r = Ft(e.current_holdings, "current_holdings"), a = Ft(e.purchase_value, "purchase_value"), i = Ft(e.current_value, "current_value"), o = {
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
function fe(e, t) {
  let n = t?.config?.entry_id ?? t?.entry_id ?? t?.config?._panel_custom?.config?.entry_id ?? void 0;
  if (!n && e?.panels) {
    const r = e.panels, a = r.ppreader ?? r.pp_reader ?? Object.values(r).find(
      (i) => i?.webcomponent_name === "pp-reader-panel"
    );
    n = a?.config?.entry_id ?? a?.entry_id ?? a?.config?._panel_custom?.config?.entry_id ?? void 0;
  }
  return n ?? void 0;
}
function Fn(e, t) {
  return fe(e, t);
}
async function ci(e, t) {
  if (!e)
    throw new Error("fetchAccountsWS: fehlendes hass");
  const n = fe(e, t);
  if (!n)
    throw new Error("fetchAccountsWS: fehlendes entry_id");
  const r = await e.connection.sendMessagePromise({
    type: "pp_reader/get_accounts",
    entry_id: n
  }), a = mr(r.accounts), i = Sr(r.normalized_payload);
  return {
    accounts: a,
    normalized_payload: i
  };
}
async function li(e, t) {
  if (!e)
    throw new Error("fetchLastFileUpdateWS: fehlendes hass");
  const n = fe(e, t);
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
async function ui(e, t) {
  if (!e)
    throw new Error("fetchPortfoliosWS: fehlendes hass");
  const n = fe(e, t);
  if (!n)
    throw new Error("fetchPortfoliosWS: fehlendes entry_id");
  const r = await e.connection.sendMessagePromise({
    type: "pp_reader/get_portfolio_data",
    entry_id: n
  }), a = _r(r.portfolios), i = Sr(r.normalized_payload);
  return {
    portfolios: a,
    normalized_payload: i
  };
}
async function wr(e, t, n) {
  if (!e)
    throw new Error("fetchPortfolioPositionsWS: fehlendes hass");
  const r = fe(e, t);
  if (!r)
    throw new Error("fetchPortfolioPositionsWS: fehlendes entry_id");
  if (!n)
    throw new Error("fetchPortfolioPositionsWS: fehlendes portfolio_uuid");
  const a = await e.connection.sendMessagePromise({
    type: "pp_reader/get_portfolio_positions",
    entry_id: r,
    portfolio_uuid: n
  }), o = yr(a.positions).map(si), s = vr(a.normalized_payload), c = {
    portfolio_uuid: Dn(a.portfolio_uuid) ?? n,
    positions: o
  };
  typeof a.error == "string" && (c.error = a.error);
  const l = oi(a.coverage_ratio);
  l !== void 0 && (c.coverage_ratio = l);
  const u = Dn(a.provenance);
  u && (c.provenance = u);
  const d = ii(a.metric_run_uuid);
  return d !== void 0 && (c.metric_run_uuid = d), s && (c.normalized_payload = s), c;
}
async function di(e, t, n) {
  if (!e)
    throw new Error("fetchSecuritySnapshotWS: fehlendes hass");
  const r = fe(e, t);
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
async function fi(e, t) {
  if (!e)
    throw new Error("fetchNewsPromptWS: fehlendes hass");
  const n = fe(e, t);
  if (!n)
    throw new Error("fetchNewsPromptWS: fehlendes entry_id");
  return e.connection.sendMessagePromise({
    type: "pp_reader/get_news_prompt",
    entry_id: n
  });
}
async function st(e, t, n, r = {}) {
  if (!e)
    throw new Error("fetchSecurityHistoryWS: fehlendes hass");
  const a = fe(e, t);
  if (!a)
    throw new Error("fetchSecurityHistoryWS: fehlendes entry_id");
  if (!n)
    throw new Error("fetchSecurityHistoryWS: fehlendes securityUuid");
  const i = {
    type: "pp_reader/get_security_history",
    entry_id: a,
    security_uuid: n
  }, { startDate: o, endDate: s, start_date: c, end_date: l } = r || {}, u = o ?? c;
  u != null && (i.start_date = u);
  const d = s ?? l;
  d != null && (i.end_date = d);
  const p = await e.connection.sendMessagePromise(i);
  return Array.isArray(p.prices) || (p.prices = []), Array.isArray(p.transactions) || (p.transactions = []), p;
}
async function pi(e, t) {
  const n = fe(e, t);
  if (!e || !n) return [];
  try {
    return (await e.connection.sendMessagePromise({
      type: "pp_reader/get_trades",
      entry_id: n
    })).trades;
  } catch (r) {
    return console.error("Error fetching realized performance data:", r), [];
  }
}
async function gi(e, t, n) {
  const r = fe(e, t);
  if (!e || !r) return null;
  try {
    const a = {
      type: "pp_reader/get_daily_wealth",
      entry_id: r,
      ...n
    };
    for (const i of Object.keys(a))
      a[i] === void 0 && delete a[i];
    return await e.connection.sendMessagePromise(a);
  } catch (a) {
    throw console.error("Error fetching daily wealth data:", a), a;
  }
}
function k(e) {
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
  return k(e);
}
const pn = (e, t) => {
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
      const l = c.replace(/\s+/g, "").replace(/[^0-9,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."), u = Number.parseFloat(l);
      return Number.isNaN(u) ? Number.NaN : u;
    }
    return Number.NaN;
  }, o = (c, l = 2, u = 2) => {
    const d = typeof c == "number" ? c : i(c);
    return Number.isFinite(d) ? d.toLocaleString("de-DE", {
      minimumFractionDigits: l,
      maximumFractionDigits: u
    }) : "";
  }, s = (c = "") => {
    const l = c || "Kein Wert verfügbar";
    return `<span class="missing-value" role="note" aria-label="${l}" title="${l}">—</span>`;
  };
  if (["gain_abs", "gain_pct", "day_change_abs", "day_change_pct"].includes(e)) {
    if (t == null && n) {
      const p = n.performance;
      if (typeof p == "object" && p !== null)
        if (e.startsWith("day_change")) {
          const f = p.day_change;
          if (f && typeof f == "object") {
            const g = e === "day_change_pct" ? f.change_pct : f.value_change_eur ?? f.price_change_eur;
            typeof g == "number" && (t = g);
          }
        } else {
          const f = p[e];
          typeof f == "number" && (t = f);
        }
    }
    const c = n?.fx_unavailable === !0 ? "Wechselkurs nicht verfügbar – EUR-Wert unbekannt" : "";
    if (t == null || r?.hasValue === !1)
      return s(c);
    const l = typeof t == "number" ? t : i(t);
    if (!Number.isFinite(l))
      return s(c);
    const u = e.endsWith("pct") ? "%" : "€";
    return a = o(l) + `&nbsp;${u}`, `<span class="${pn(l, 2)}">${a}</span>`;
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
  } else if (e === "current_holdings")
    if (typeof t == "string" && t.trim().startsWith("<"))
      a = t;
    else {
      const c = typeof t == "number" ? t : i(t);
      if (!Number.isFinite(c))
        return s();
      const l = Math.abs(c % 1) > 0;
      a = c.toLocaleString("de-DE", {
        minimumFractionDigits: l ? 2 : 0,
        maximumFractionDigits: 4
      });
    }
  else {
    let c = "";
    typeof t == "string" ? c = t : typeof t == "number" && Number.isFinite(t) ? c = t.toString() : typeof t == "boolean" ? c = t ? "true" : "false" : t instanceof Date && Number.isFinite(t.getTime()) && (c = t.toISOString()), a = c, a && (/<[a-z]/i.test(a) && /<\s*(?:script|iframe|object|embed|base|style|link|meta|form)\b|javascript:|[\s\/]on[a-z]+\s*=/i.test(a) && (a = k(a)), /<|&lt;|&gt;/.test(a) || (a.length > 60 && (a = a.slice(0, 59) + "…"), a.startsWith("Kontostand ") ? a = a.substring(11) : a.startsWith("Depotwert ") && (a = a.substring(10))));
  }
  return typeof a != "string" || a === "" ? s() : a;
}
function Se(e, t, n = [], r = {}) {
  const { sortable: a = !1, defaultSort: i, rowAttributes: o } = r, s = i?.key ?? "", c = i?.dir === "desc" ? "desc" : "asc";
  let l = "<table><thead><tr>";
  t.forEach((h) => {
    const b = h.align === "right" ? ' class="align-right"' : "";
    if (a && h.key) {
      const _ = `${ce(h.label)} sortieren`;
      l += `<th${b} data-sort-key="${h.key}" role="button" tabindex="0" aria-sort="none" aria-label="${_}">${h.label}</th>`;
    } else
      l += `<th${b}>${h.label}</th>`;
  }), l += "</tr></thead><tbody>", e.forEach((h) => {
    let b = "";
    if (o) {
      const _ = o(h);
      b = Object.entries(_).map(([v, w]) => ` ${v}="${ce(w)}"`).join("");
    }
    l += `<tr${b}>`, t.forEach((_) => {
      const v = _.align === "right" ? ' class="align-right"' : "";
      l += `<td${v}>${M(_.key, h[_.key], h)}</td>`;
    }), l += "</tr>";
  });
  const u = {}, d = {};
  t.forEach((h) => {
    if (n.includes(h.key)) {
      const b = e.reduce(
        (_, v) => {
          let w = v[h.key];
          if ((h.key === "gain_abs" || h.key === "gain_pct") && (typeof w != "number" || !Number.isFinite(w))) {
            const A = v.performance;
            if (typeof A == "object" && A !== null) {
              const P = A[h.key];
              typeof P == "number" && (w = P);
            }
          } else if ((h.key === "day_change_abs" || h.key === "day_change_pct") && (typeof w != "number" || !Number.isFinite(w))) {
            const A = v.performance;
            if (typeof A == "object" && A !== null) {
              const P = A.day_change;
              if (P && typeof P == "object") {
                const E = h.key === "day_change_pct" ? P.change_pct : P.value_change_eur ?? P.price_change_eur;
                typeof E == "number" && (w = E);
              }
            }
          }
          if (typeof w == "number" && Number.isFinite(w)) {
            const A = w;
            _.total += A, _.hasValue = !0;
          }
          return _;
        },
        { total: 0, hasValue: !1 }
      );
      b.hasValue ? (u[h.key] = b.total, d[h.key] = { hasValue: !0 }) : (u[h.key] = null, d[h.key] = { hasValue: !1 });
    }
  });
  const p = u.gain_abs ?? null;
  if (p != null) {
    const h = u.purchase_value ?? null;
    if (h != null && h > 0)
      u.gain_pct = p / h * 100;
    else {
      const b = u.current_value ?? null;
      b != null && b !== 0 && (u.gain_pct = p / (b - p) * 100);
    }
  }
  const f = u.day_change_abs ?? null;
  if (f != null) {
    const h = u.current_value ?? null;
    if (h != null) {
      const b = h - f;
      b && (u.day_change_pct = f / b * 100, d.day_change_pct = { hasValue: !0 });
    }
  }
  const g = Number.isFinite(u.gain_pct ?? NaN) ? u.gain_pct : null;
  let m = "", y = "neutral";
  if (g != null && (m = `${re(g)} %`, g > 0 ? y = "positive" : g < 0 && (y = "negative")), l += '<tr class="footer-row">', t.forEach((h, b) => {
    const _ = h.align === "right" ? ' class="align-right"' : "";
    if (b === 0) {
      l += `<td${_}>Summe</td>`;
      return;
    }
    if (u[h.key] != null) {
      let w = "";
      h.key === "gain_abs" && m && (w = ` data-gain-pct="${ce(m)}" data-gain-sign="${ce(y)}"`), l += `<td${_}${w}>${M(h.key, u[h.key], void 0, d[h.key])}</td>`;
      return;
    }
    if (h.key === "gain_pct" && u.gain_pct != null) {
      l += `<td${_}>${M("gain_pct", u.gain_pct, void 0, d[h.key])}</td>`;
      return;
    }
    const v = d[h.key] ?? { hasValue: !1 };
    l += `<td${_}>${M(h.key, null, void 0, v)}</td>`;
  }), l += "</tr>", l += "</tbody></table>", a)
    try {
      const h = document.createElement("template");
      h.innerHTML = l.trim();
      const b = h.content.querySelector("table");
      if (b)
        return b.classList.add("sortable-table"), s && (b.dataset.defaultSort = s, b.dataset.defaultDir = c), b.outerHTML;
    } catch (h) {
      console.warn("makeTable(sortable): Injection fehlgeschlagen:", h);
    }
  return l;
}
function Et(e, t, n = {}) {
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
function re(e, t = 2, n = 2) {
  return (Number.isNaN(e) ? 0 : e).toLocaleString("de-DE", {
    minimumFractionDigits: t,
    maximumFractionDigits: n
  });
}
function hi(e) {
  const t = Number.isNaN(e) ? 0 : e;
  return `<span class="${pn(t, 2)}">${re(t)}&nbsp;€</span>`;
}
function mi(e) {
  const t = Number.isNaN(e) ? 0 : e;
  return `<span class="${pn(t, 2)}">${re(t)}&nbsp;%</span>`;
}
function yi() {
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
function gn(e = "Laden...") {
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
  
      <span>${k(e || "Laden...")}</span>
    </div>
  `;
}
function Cr(e, t, n = "asc", r = !1) {
  if (!e)
    return [];
  const a = e.querySelector("tbody");
  if (!a)
    return [];
  const i = a.querySelector("tr.footer-row"), o = Array.from(
    a.querySelectorAll("tr")
  ).filter((u) => u !== i);
  let s = -1;
  if (r) {
    const d = {
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
    typeof d == "number" && (s = d);
  } else {
    const u = Array.from(
      e.querySelectorAll("thead th")
    );
    for (let d = 0; d < u.length; d++)
      if (u[d].getAttribute("data-sort-key") === t) {
        s = d;
        break;
      }
  }
  if (s < 0)
    return o;
  const c = (u) => {
    const d = u.replace(/\u00A0/g, " ").replace(/[%€]/g, "").replace(/\./g, "").replace(/,/g, ".").replace(/[^\d.-]/g, "").trim();
    if (!d) return NaN;
    const p = parseFloat(d);
    return Number.isFinite(p) ? p : NaN;
  };
  o.sort((u, d) => {
    const p = u.cells.item(s), f = d.cells.item(s), g = (p?.textContent ?? "").trim(), m = (f?.textContent ?? "").trim(), y = c(g), h = c(m);
    let b;
    const _ = /[0-9]/.test(g) || /[0-9]/.test(m);
    return !Number.isNaN(y) && !Number.isNaN(h) && _ ? b = y - h : b = g.localeCompare(m, "de", { sensitivity: "base" }), n === "asc" ? b : -b;
  }), o.forEach((u) => a.appendChild(u)), i && a.appendChild(i), e.querySelectorAll("thead th.sort-active").forEach((u) => {
    u.classList.remove("sort-active", "dir-asc", "dir-desc");
  }), e.querySelectorAll("thead th[aria-sort]").forEach((u) => {
    u.setAttribute("aria-sort", "none");
  });
  const l = e.querySelector(
    `thead th[data-sort-key="${t}"]`
  );
  return l && (l.classList.add(
    "sort-active",
    n === "asc" ? "dir-asc" : "dir-desc"
  ), l.setAttribute("aria-sort", n === "asc" ? "ascending" : "descending")), o;
}
const bi = 2;
function ge(e) {
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
        const d = o.split(","), p = d[d.length - 1]?.length ?? 0, f = d.slice(0, -1).join(""), g = f.replace(/[+-]/g, "").length, m = d.length > 2, y = /^[-+]?0$/.test(f);
        o = m || p === 0 || p === 3 && g > 0 && g <= 3 && !y ? o.replace(/,/g, "") : o.replace(",", ".");
      }
    else c && s && i > a ? o = o.replace(/,/g, "") : c && o.length - i - 1 === 3 && /\d{4,}/.test(o.replace(/\./g, "")) && (o = o.replace(/\./g, ""));
    if (o === "-" || o === "+")
      return null;
    const l = Number.parseFloat(o);
    if (Number.isFinite(l))
      return l;
    const u = Number.parseFloat(r.replace(",", "."));
    if (Number.isFinite(u))
      return u;
  }
  return null;
}
function Nt(e, { decimals: t = bi, fallback: n = null } = {}) {
  const r = ge(e);
  if (r == null)
    return n ?? null;
  const a = 10 ** t, i = Math.round(r * a) / a;
  return Object.is(i, -0) ? 0 : i;
}
function $n(e, t = {}) {
  return Nt(e, t);
}
function _i(e, t = {}) {
  return Nt(e, t);
}
const vi = /^[+-]?(?:\d+\.?\d*|\d*\.?\d+)(?:[eE][+-]?\d+)?$/, se = (e) => {
  if (typeof e == "number")
    return Number.isFinite(e) ? e : null;
  if (typeof e == "string") {
    const t = e.trim();
    if (!t || !vi.test(t))
      return null;
    const n = Number(t);
    if (Number.isFinite(n))
      return n;
  }
  return null;
}, Ar = (e) => {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t || null;
};
function Si(e) {
  const t = e && typeof e == "object" ? e : null;
  if (!t)
    return null;
  const n = se(t.price_change_native), r = se(t.price_change_eur), a = se(t.change_pct), i = se(t.value_change_eur);
  if (n == null && r == null && a == null && i == null)
    return null;
  const o = Ar(t.source) ?? "derived", s = se(t.coverage_ratio) ?? null;
  return {
    price_change_native: n,
    price_change_eur: r,
    change_pct: a,
    value_change_eur: i ?? null,
    source: o,
    coverage_ratio: s
  };
}
function we(e) {
  const t = e && typeof e == "object" ? e : null;
  if (!t)
    return null;
  const n = se(t.gain_abs), r = se(t.gain_pct), a = se(t.total_change_eur), i = se(t.total_change_pct);
  if (n == null || r == null || a == null || i == null)
    return null;
  const o = Ar(t.source) ?? "derived", s = se(t.coverage_ratio) ?? null, c = Si(t.day_change);
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
const _e = /* @__PURE__ */ new Map();
function ye(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t.length > 0 ? t : null;
}
function U(e) {
  if (e === null)
    return null;
  const t = ge(e);
  return Number.isFinite(t ?? NaN) ? t : null;
}
function wi(e) {
  if (!e || typeof e != "object")
    return !1;
  const t = e;
  return typeof t.security_uuid == "string" && typeof t.name == "string" && typeof t.current_holdings == "number" && typeof t.purchase_value == "number" && typeof t.current_value == "number";
}
function Re(e) {
  const t = { ...e };
  return e.average_cost && typeof e.average_cost == "object" && (t.average_cost = { ...e.average_cost }), e.performance && typeof e.performance == "object" && (t.performance = { ...e.performance }), e.aggregation && typeof e.aggregation == "object" && (t.aggregation = { ...e.aggregation }), e.data_state && typeof e.data_state == "object" && (t.data_state = { ...e.data_state }), t;
}
function Ci(e, t, n = []) {
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
function Ai(e, t) {
  const n = e ? Re(e) : {}, r = [
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
  ], a = (c, l, u) => {
    const d = l[u];
    d !== void 0 && (c[u] = d);
  };
  r.forEach((c) => {
    a(n, t, c);
  });
  const i = (c) => {
    const l = t[c];
    if (l && typeof l == "object") {
      const u = e && e[c] && typeof e[c] == "object" ? e[c] : {};
      n[c] = {
        ...u,
        ...l
      };
    } else l !== void 0 && (n[c] = l);
  }, o = t.performance, s = e && e.performance && typeof e.performance == "object" ? e.performance : void 0;
  return o !== void 0 && (n.performance = Ci(s, o, [
    "gain_pct",
    "total_change_pct"
  ])), i("aggregation"), i("average_cost"), i("data_state"), n;
}
function ct(e, t) {
  if (!e)
    return [];
  if (!Array.isArray(t))
    return _e.delete(e), [];
  if (t.length === 0)
    return _e.set(e, []), [];
  const n = _e.get(e) ?? [], r = new Map(
    n.filter((i) => i.security_uuid).map((i) => [i.security_uuid, i])
  ), a = t.filter((i) => !!i).map((i) => {
    const o = i.security_uuid ?? "", s = o ? r.get(o) : void 0;
    return Ai(s, i);
  }).map(Re);
  return _e.set(e, a), a.map(Re);
}
function xt(e) {
  return e ? _e.has(e) : !1;
}
function Pr(e) {
  if (!e)
    return [];
  const t = _e.get(e);
  return t ? t.map(Re) : [];
}
function Pi() {
  _e.clear();
}
function Ei() {
  return new Map(
    Array.from(_e.entries(), ([e, t]) => [
      e,
      t.map(Re)
    ])
  );
}
function Ie(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e, n = U(t.native), r = U(t.security), a = U(t.account), i = U(t.eur), o = U(t.coverage_ratio);
  if (n == null && r == null && a == null && i == null && o == null)
    return null;
  const s = ye(t.source);
  return {
    native: n,
    security: r,
    account: a,
    eur: i,
    source: s === "totals" || s === "eur_total" ? s : "aggregation",
    coverage_ratio: o
  };
}
function hn(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e, n = U(t.total_holdings), r = U(t.positive_holdings), a = U(t.purchase_value_eur), i = U(t.purchase_total_security) ?? U(t.security_currency_total), o = U(t.purchase_total_account) ?? U(t.account_currency_total);
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
function Ni(e) {
  if (!e || typeof e != "object")
    return null;
  const t = wi(e) ? Re(e) : e, n = ye(t.security_uuid), r = ye(t.name), a = ge(t.current_holdings), i = $n(t.current_value), o = hn(t.aggregation), s = t.aggregation && typeof t.aggregation == "object" ? t.aggregation : null, c = U(t.purchase_value_eur) ?? U(s?.purchase_value_eur) ?? U(s?.purchase_total_account) ?? U(s?.account_currency_total) ?? $n(t.purchase_value);
  if (!n || !r || a == null || c == null || i == null)
    return null;
  const l = {
    security_uuid: n,
    name: r,
    portfolio_uuid: ye(t.portfolio_uuid) ?? ye(t.portfolioUuid) ?? void 0,
    currency_code: ye(t.currency_code),
    current_holdings: a,
    purchase_value: c,
    current_value: i
  }, u = Ie(t.average_cost);
  u && (l.average_cost = u), o && (l.aggregation = o);
  const d = we(t.performance);
  if (d)
    l.performance = d, l.gain_abs = typeof d.gain_abs == "number" ? d.gain_abs : null, l.gain_pct = typeof d.gain_pct == "number" ? d.gain_pct : null;
  else {
    const _ = U(t.gain_abs), v = U(t.gain_pct);
    _ !== null && (l.gain_abs = _), v !== null && (l.gain_pct = v);
  }
  "coverage_ratio" in t && (l.coverage_ratio = U(t.coverage_ratio));
  const p = ye(t.provenance);
  p && (l.provenance = p);
  const f = ye(t.metric_run_uuid);
  (f || t.metric_run_uuid === null) && (l.metric_run_uuid = f ?? null);
  const g = U(t.last_price_native);
  g !== null && (l.last_price_native = g);
  const m = U(t.last_price_eur);
  m !== null && (l.last_price_eur = m);
  const y = U(t.last_close_native);
  y !== null && (l.last_close_native = y);
  const h = U(t.last_close_eur);
  h !== null && (l.last_close_eur = h);
  const b = t.data_state && typeof t.data_state == "object" ? { ...t.data_state } : void 0;
  return b && (l.data_state = b), l;
}
function Dt(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = Ni(n);
    r && t.push(r);
  }
  return t;
}
let Er = [];
const ve = /* @__PURE__ */ new Map();
function rt(e) {
  return typeof e == "string" && e.length > 0 ? e : void 0;
}
function xi(e) {
  return e === null ? null : rt(e);
}
function Di(e) {
  return typeof e == "number" && Number.isFinite(e) ? e : void 0;
}
function Ae(e) {
  return e === null ? null : Di(e);
}
function Tn(e) {
  if (!(typeof e != "number" || !Number.isFinite(e)))
    return Math.trunc(e);
}
function le(e) {
  if (!(!e || typeof e != "object"))
    return { ...e };
}
function Ge(e) {
  const t = { ...e };
  return t.average_cost = le(e.average_cost), t.performance = le(e.performance), t.aggregation = le(e.aggregation), t.data_state = le(e.data_state), t;
}
function mn(e) {
  const t = { ...e };
  return t.performance = le(e.performance), t.data_state = le(e.data_state), Array.isArray(e.positions) && (t.positions = e.positions.map(Ge)), t;
}
function Nr(e) {
  if (!e || typeof e != "object")
    return null;
  const t = rt(e.uuid);
  if (!t)
    return null;
  const n = { uuid: t }, r = rt(e.name);
  r && (n.name = r);
  const a = Ae(e.current_value);
  a !== void 0 && (n.current_value = a);
  const i = Ae(e.purchase_sum) ?? Ae(e.purchase_value_eur) ?? Ae(e.purchase_value);
  i !== void 0 && (n.purchase_value = i, n.purchase_sum = i);
  const o = Ae(e.day_change_abs);
  o !== void 0 && (n.day_change_abs = o);
  const s = Ae(e.day_change_pct);
  s !== void 0 && (n.day_change_pct = s);
  const c = Tn(e.position_count);
  c !== void 0 && (n.position_count = c);
  const l = Tn(e.missing_value_positions);
  l !== void 0 && (n.missing_value_positions = l), typeof e.has_current_value == "boolean" && (n.has_current_value = e.has_current_value);
  const u = Ae(e.coverage_ratio);
  u !== void 0 && (n.coverage_ratio = u);
  const d = rt(e.provenance);
  d && (n.provenance = d), "metric_run_uuid" in e && (n.metric_run_uuid = xi(e.metric_run_uuid));
  const p = le(e.performance);
  p && (n.performance = p);
  const f = le(e.data_state);
  if (f && (n.data_state = f), Array.isArray(e.positions)) {
    const g = e.positions.filter(
      (m) => !!m
    );
    g.length && (n.positions = g.map(Ge));
  }
  return n;
}
function ki(e, t) {
  const n = {
    ...e,
    ...t
  };
  return !t.performance && e.performance && (n.performance = le(e.performance)), !t.data_state && e.data_state && (n.data_state = le(e.data_state)), !t.positions && e.positions && (n.positions = e.positions.map(Ge)), n;
}
function xr(e) {
  Er = (e ?? []).map((n) => ({ ...n }));
}
function Fi() {
  return Er.map((e) => ({ ...e }));
}
function $i(e) {
  ve.clear();
  const t = e ?? [];
  for (const n of t) {
    const r = Nr(n);
    r && ve.set(r.uuid, mn(r));
  }
}
function Ti(e) {
  const t = e ?? [];
  for (const n of t) {
    const r = Nr(n);
    if (!r)
      continue;
    const a = ve.get(r.uuid), i = a ? ki(a, r) : mn(r);
    ve.set(i.uuid, i);
  }
}
function lt(e, t) {
  if (!e)
    return;
  const n = ve.get(e);
  if (!n)
    return;
  if (!Array.isArray(t) || t.length === 0) {
    const c = { ...n };
    delete c.positions, ve.set(e, c);
    return;
  }
  const r = (c, l) => {
    const u = c ? Ge(c) : {}, d = u;
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
    ].forEach((g) => {
      const m = l[g];
      m != null && (d[g] = m);
    });
    const f = (g, m = []) => {
      const y = l[g], h = c && c[g] && typeof c[g] == "object" ? c[g] : void 0;
      if (!y || typeof y != "object") {
        y !== void 0 && (d[g] = y);
        return;
      }
      const b = {
        ...h ?? {},
        ...y
      };
      m.forEach((_) => {
        const v = h?.[_];
        v != null && (b[_] = v);
      }), d[g] = b;
    };
    return f("performance", ["gain_pct", "total_change_pct"]), f("aggregation"), f("average_cost"), f("data_state"), u;
  }, a = Array.isArray(n.positions) ? n.positions : [], i = new Map(
    a.filter((c) => c.security_uuid).map((c) => [c.security_uuid, c])
  ), o = t.filter((c) => !!c).map((c) => {
    const l = c.security_uuid ? i.get(c.security_uuid) : void 0;
    return r(l, c);
  }).map(Ge), s = {
    ...n,
    positions: o
  };
  ve.set(e, s);
}
function Li() {
  return Array.from(ve.values(), (e) => mn(e));
}
function Dr() {
  return {
    accounts: Fi(),
    portfolios: Li()
  };
}
const Ri = "unknown-account";
function Z(e) {
  return typeof e != "number" || !Number.isFinite(e) ? null : e;
}
function Ln(e) {
  const t = Z(e);
  return t == null ? 0 : Math.trunc(t);
}
function ee(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t.length > 0 ? t : null;
}
function kr(e, t) {
  return ee(e) ?? t;
}
function Fr(e) {
  return e == null || !Number.isFinite(e) ? null : e < 0 ? 0 : e > 1 ? 1 : e;
}
function $r(e) {
  return e.split(/[\s_-]+/).filter(Boolean).map(
    (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
  ).join(" ");
}
function Tr(e) {
  const t = Mi(e);
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
function Mi(e) {
  const t = ee(e);
  if (!t)
    return null;
  const n = Hi(t);
  return n || $r(t);
}
function Hi(e) {
  const t = e.trim();
  if (!t.startsWith("{") && !t.startsWith("["))
    return null;
  try {
    const n = JSON.parse(t), r = Ii(n), a = n && typeof n == "object" ? ee(
      n.provider ?? n.source
    ) : null;
    if (r.length && a)
      return `${$r(a)} (${r.join(", ")})`;
    if (r.length)
      return `FX (${r.join(", ")})`;
  } catch {
    return null;
  }
  return null;
}
function Ii(e) {
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
function zi(e) {
  if (!e)
    return null;
  const t = ee(e.uuid) ?? `${Ri}-${e.name ?? "0"}`, n = kr(e.name, "Unbenanntes Konto"), r = ee(e.currency_code), a = Z(e.balance), i = Z(e.orig_balance), o = "coverage_ratio" in e ? Fr(Z(e.coverage_ratio)) : null, s = ee(e.provenance), c = ee(e.metric_run_uuid), l = e.fx_unavailable === !0, u = Z(e.fx_rate), d = ee(e.fx_rate_source), p = ee(e.fx_rate_timestamp), f = [], g = Tr(s);
  g && f.push(g);
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
    fx_rate: u,
    fx_rate_source: d,
    fx_rate_timestamp: p,
    badges: f
  }, y = typeof c == "string" ? c : null;
  return m.metric_run_uuid = y, m;
}
function Vi(e) {
  if (!e)
    return null;
  const t = ee(e.uuid);
  if (!t)
    return null;
  const n = kr(e.name, "Unbenanntes Depot"), r = Ln(e.position_count), a = Ln(e.missing_value_positions), i = Z(e.current_value), o = Z(e.purchase_sum) ?? Z(e.purchase_value_eur) ?? Z(e.purchase_value) ?? 0, s = Z(e.day_change_abs) ?? null, c = Z(e.day_change_pct) ?? null, l = we(e.performance), u = l?.gain_abs ?? null, d = l?.gain_pct ?? null, p = l?.day_change ?? null;
  let f = s ?? (p?.value_change_eur != null ? Z(p.value_change_eur) : null), g = c ?? (p?.change_pct != null ? Z(p.change_pct) : null);
  if (f == null && g != null && i != null) {
    const E = i / (1 + g / 100);
    E && (f = i - E);
  }
  if (g == null && f != null && i != null) {
    const E = i - f;
    E && (g = f / E * 100);
  }
  const m = i != null, y = e.has_current_value === !1 || !m, h = "coverage_ratio" in e ? Fr(Z(e.coverage_ratio)) : null, b = ee(e.provenance), _ = ee(e.metric_run_uuid), v = [], w = Tr(b);
  w && v.push(w);
  const A = {
    uuid: t,
    name: n,
    position_count: r,
    current_value: i,
    purchase_sum: o,
    day_change_abs: f ?? null,
    day_change_pct: g ?? null,
    gain_abs: u,
    gain_pct: d,
    hasValue: m,
    fx_unavailable: y || a > 0,
    missing_value_positions: a,
    performance: l,
    coverage_ratio: h,
    provenance: b,
    metric_run_uuid: null,
    badges: v
  }, P = typeof _ == "string" ? _ : null;
  return A.metric_run_uuid = P, A;
}
function Lr() {
  const { accounts: e } = Dr();
  return e.map(zi).filter((t) => !!t);
}
function qi() {
  const { portfolios: e } = Dr();
  return e.map(Vi).filter((t) => !!t);
}
function Rr(e, t = {}) {
  if (!e || e.length === 0)
    return "";
  const n = ["meta-badges", t.containerClass].filter(Boolean).join(" "), r = e.map((a) => {
    const i = `meta-badge--${a.tone}`, o = a.description ? ` title="${k(a.description)}"` : "";
    return `<span class="meta-badge ${i}"${o}>${k(
      a.label
    )}</span>`;
  }).join("");
  return `<span class="${n}">${r}</span>`;
}
function ut(e, t, n = {}) {
  const r = Rr(t, n);
  if (!r)
    return k(e);
  const a = n.labelClass ?? "name-with-badges__label";
  return `<span class="${["name-with-badges", n.containerClass].filter(Boolean).join(" ")}"><span class="${a}">${k(
    e
  )}</span>${r}</span>`;
}
function Mr(e, t, n, r) {
  e[t] = {
    previous: n,
    current: r
  };
}
const ue = /* @__PURE__ */ new Map(), Ye = /* @__PURE__ */ new Map();
function Ui(e) {
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
function ze(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t.length > 0 ? t : null;
}
function xe(e) {
  return typeof e == "number" && Number.isFinite(e) ? e : void 0;
}
function Oi(e) {
  return e === null ? null : xe(e);
}
function Bi(e) {
  return e === null ? null : ze(e);
}
function Rn(e) {
  return (e ?? []).filter(
    (t) => !t.key.endsWith("-coverage") && !t.key.startsWith("provenance-")
  );
}
function Mn(e) {
  return we(e.performance);
}
const Wi = 500, Yi = 10, Ki = "pp-reader:portfolio-positions-updated", ji = "pp-reader:diagnostics", $t = /* @__PURE__ */ new Map(), Hr = [
  "coverage_ratio",
  "provenance",
  "metric_run_uuid",
  "generated_at"
], Yt = /* @__PURE__ */ new Map();
function Gi(e, t) {
  return `${e}:${t}`;
}
function Xi(e) {
  if (e === void 0)
    return;
  if (e === null)
    return null;
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  const t = Oi(e);
  if (t === null)
    return null;
  if (typeof t == "number" && Number.isFinite(t))
    return t;
}
function Tt(e) {
  if (e !== void 0)
    return Bi(e);
}
function yn(e, t, n, r) {
  const a = {}, i = Xi(e);
  i !== void 0 && (a.coverage_ratio = i);
  const o = Tt(t);
  o !== void 0 && (a.provenance = o);
  const s = Tt(n);
  s !== void 0 && (a.metric_run_uuid = s);
  const c = Tt(r);
  return c !== void 0 && (a.generated_at = c), Object.keys(a).length > 0 ? a : null;
}
function Zi(e, t) {
  const n = {};
  let r = !1;
  for (const a of Hr) {
    const i = e?.[a], o = t[a];
    i !== o && (Mr(n, a, i, o), r = !0);
  }
  return r ? n : null;
}
function Ji(e) {
  const t = {};
  let n = !1;
  for (const r of Hr) {
    const a = e[r];
    a !== void 0 && (Mr(t, r, a, void 0), n = !0);
  }
  return n ? t : null;
}
function Hn(e) {
  if (Object.keys(e.changed).length) {
    try {
      console.debug("pp-reader:diagnostics", e);
    } catch {
    }
    if (!(typeof window > "u" || typeof window.dispatchEvent != "function"))
      try {
        window.dispatchEvent(new CustomEvent(ji, { detail: e }));
      } catch (t) {
        console.warn("updateConfigsWS: Diagnostics-Event konnte nicht gesendet werden", t);
      }
  }
}
function bn(e, t, n, r) {
  const a = Gi(e, n), i = $t.get(a);
  if (!r) {
    if (!i)
      return;
    $t.delete(a);
    const s = Ji(i);
    if (!s)
      return;
    Hn({
      kind: e,
      uuid: n,
      source: t,
      changed: s,
      snapshot: {},
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    return;
  }
  const o = Zi(i, r);
  o && ($t.set(a, { ...r }), Hn({
    kind: e,
    uuid: n,
    source: t,
    changed: o,
    snapshot: { ...r },
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  }));
}
function Qi(e) {
  if (!(!e || e.length === 0))
    for (const t of e) {
      const n = ze(t.uuid);
      if (!n)
        continue;
      const r = yn(
        t.coverage_ratio,
        t.provenance,
        t.metric_run_uuid,
        void 0
      );
      bn("account", "accounts", n, r);
    }
}
function eo(e) {
  if (!(!e || e.length === 0))
    for (const t of e) {
      const n = ze(t.uuid);
      if (!n)
        continue;
      const r = yn(
        t.coverage_ratio,
        t.provenance,
        t.metric_run_uuid,
        void 0
      );
      bn("portfolio", "portfolio_values", n, r);
    }
}
function to(e, t) {
  if (!t)
    return;
  const n = yn(
    t.coverage_ratio ?? t.normalized_payload?.coverage_ratio,
    t.provenance ?? t.normalized_payload?.provenance,
    t.metric_run_uuid ?? t.normalized_payload?.metric_run_uuid,
    t.normalized_payload?.generated_at
  );
  bn("portfolio_positions", "portfolio_positions", e, n);
}
function no(e, t) {
  return `<div class="error">${k(Ui(e))} <button class="retry-pos" data-portfolio="${t}">Erneut laden</button></div>`;
}
function ro(e, t, n) {
  const r = e.querySelector("table.sortable-positions");
  if (!r) return;
  const a = e.dataset.sortKey || r.dataset.defaultSort || "name", o = (e.dataset.sortDir || r.dataset.defaultDir || "asc") === "desc" ? "desc" : "asc";
  e.dataset.sortKey = a, e.dataset.sortDir = o;
  try {
    Cr(r, a, o, !0);
  } catch (l) {
    console.warn("restoreSortAndInit: sortTableRows Fehler:", l);
  }
  const { attachPortfolioPositionsSorting: s, attachSecurityDetailListener: c } = fn();
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
function Ir(e, t, n, r) {
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
    return i.innerHTML = no(r, t), { applied: !0 };
  const o = i.dataset.sortKey, s = i.dataset.sortDir;
  return i.innerHTML = Vr(n), o && (i.dataset.sortKey = o), s && (i.dataset.sortDir = s), ro(i, e, t), { applied: !0 };
}
function _n(e, t) {
  const n = ue.get(t);
  if (!n) return !1;
  const r = Ir(
    e,
    t,
    n.positions,
    n.error
  );
  return r.applied && ue.delete(t), r.applied;
}
function ao(e) {
  let t = !1;
  for (const [n] of ue)
    _n(e, n) && (t = !0);
  return t;
}
function zr(e, t) {
  const n = Ye.get(t) ?? {
    attempts: 0,
    timer: null
  };
  n.timer || (n.timer = setTimeout(() => {
    n.timer = null, n.attempts += 1;
    const r = _n(e, t);
    r || n.attempts >= Yi ? (Ye.delete(t), r || ue.delete(t)) : zr(e, t);
  }, Wi), Ye.set(t, n));
}
function io(e, t) {
  console.log("updateConfigsWS: Kontodaten-Update erhalten:", e);
  const n = Array.isArray(e) ? e : [];
  if (xr(n), Qi(n), !t)
    return;
  const r = Lr();
  oo(r, t);
  const a = t.querySelector(".portfolio-table table"), i = a ? Array.from(
    a.querySelectorAll("tbody tr.portfolio-row")
  ).map((o) => {
    const s = o.dataset.currentValue, c = s ? Number.parseFloat(s) : Number.NaN;
    if (Number.isFinite(c))
      return {
        current_value: c
      };
    const l = o.cells.item(3), u = at(l?.textContent);
    return {
      current_value: Number.isFinite(u) ? u : 0
    };
  }) : [];
  qr(r, i, t);
}
function oo(e, t) {
  const n = t.querySelector(".account-table"), r = t.querySelector(".fx-account-table"), a = e.filter((o) => (o.currency_code || "EUR") === "EUR"), i = e.filter((o) => (o.currency_code || "EUR") !== "EUR");
  if (n) {
    const o = a.map((s) => ({
      name: ut(s.name, Rn(s.badges), {
        containerClass: "account-name",
        labelClass: "account-name__label"
      }),
      balance: s.balance ?? null
    }));
    n.innerHTML = Se(
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
      const c = s.orig_balance, l = typeof c == "number" && Number.isFinite(c), u = ze(s.currency_code), d = l ? c.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) : null, p = d ? u ? `${d} ${u}` : d : "";
      return {
        name: ut(s.name, Rn(s.badges), {
          containerClass: "account-name",
          labelClass: "account-name__label"
        }),
        fx_display: p,
        balance: s.balance ?? null
      };
    });
    r.innerHTML = Se(
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
function so(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = br(n);
    r && t.push(r);
  }
  return t;
}
function co(e, t) {
  if (!Array.isArray(e)) {
    console.warn("handlePortfolioUpdate: Update ist kein Array:", e);
    return;
  }
  try {
    console.debug("handlePortfolioUpdate: payload=", e);
  } catch {
  }
  const n = so(e);
  if (n.length && Ti(n), eo(n), !t)
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
  const i = (d) => {
    if (typeof Intl < "u")
      try {
        const f = typeof navigator < "u" && navigator.language ? navigator.language : "de-DE";
        return new Intl.NumberFormat(f, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(d);
      } catch {
      }
    return (Nt(d, { fallback: 0 }) ?? 0).toFixed(2).replace(".", ",");
  }, o = /* @__PURE__ */ new Map();
  a.querySelectorAll("tr.portfolio-row").forEach((d) => {
    const p = d.dataset.portfolio;
    p && o.set(p, d);
  });
  let c = 0;
  const l = (d) => {
    const p = typeof d == "number" && Number.isFinite(d) ? d : 0;
    try {
      return p.toLocaleString("de-DE");
    } catch {
      return p.toString();
    }
  }, u = /* @__PURE__ */ new Map();
  for (const d of n) {
    const p = ze(d.uuid);
    p && u.set(p, d);
  }
  for (const [d, p] of u.entries()) {
    const f = o.get(d);
    if (!f)
      continue;
    f.cells.length < 8 && console.warn("handlePortfolioUpdate: Unerwartetes Spaltenlayout", f.cells.length);
    const g = f.cells.item(1), m = f.cells.item(2), y = f.cells.item(3), h = f.cells.item(4), b = f.cells.item(5), _ = f.cells.item(6), v = f.cells.item(7);
    if (!g || !m || !y)
      continue;
    const w = typeof p.position_count == "number" && Number.isFinite(p.position_count) ? p.position_count : 0, A = typeof p.current_value == "number" && Number.isFinite(p.current_value) ? p.current_value : null, P = we(p.performance), E = typeof P?.gain_abs == "number" ? P.gain_abs : null, F = typeof P?.gain_pct == "number" ? P.gain_pct : null, I = typeof p.purchase_sum == "number" && Number.isFinite(p.purchase_sum) ? p.purchase_sum : typeof p.purchase_value == "number" && Number.isFinite(p.purchase_value) ? p.purchase_value : null, C = P?.day_change ?? null, x = xe(p.day_change_abs) ?? xe(C?.value_change_eur) ?? xe(C?.price_change_eur), q = xe(p.day_change_pct) ?? xe(C?.change_pct);
    let N = x ?? null, $ = q ?? null;
    if (N == null && $ != null && A != null) {
      const G = A / (1 + $ / 100);
      G && (N = A - G);
    }
    if ($ == null && N != null && A != null) {
      const G = A - N;
      G && ($ = N / G * 100);
    }
    const j = typeof p.missing_value_positions == "number" && Number.isFinite(p.missing_value_positions) ? p.missing_value_positions : 0, S = A !== null, D = p.has_current_value === !1 || j > 0 || !S, R = at(y.textContent);
    at(g.textContent) !== w && (g.textContent = l(w));
    const T = {
      fx_unavailable: D,
      current_value: A,
      performance: P
    }, z = { hasValue: S }, B = M("purchase_value", I, T, z);
    m.innerHTML !== B && (m.innerHTML = B);
    const Y = M("current_value", T.current_value, T, z), X = typeof A == "number" ? A : 0;
    if ((Math.abs(R - X) >= 5e-3 || y.innerHTML !== Y) && (y.innerHTML = Y, f.classList.add("flash-update"), setTimeout(() => {
      f.classList.remove("flash-update");
    }, 800)), h && (h.innerHTML = M("day_change_abs", N, T, z)), b && (b.innerHTML = M("day_change_pct", $, T, z)), _) {
      const G = M("gain_abs", E, T, z);
      _.innerHTML = G;
      const Ce = typeof F == "number" && Number.isFinite(F) ? F : null;
      _.dataset.gainPct = Ce != null ? `${i(Ce)} %` : "—", _.dataset.gainSign = Ce != null ? Ce > 0 ? "positive" : Ce < 0 ? "negative" : "neutral" : "neutral";
    }
    v && (v.innerHTML = M("gain_pct", F, T, z)), f.dataset.positionCount = w.toString(), f.dataset.purchaseSum = I != null ? I.toString() : "", f.dataset.currentValue = S ? X.toString() : "", f.dataset.dayChange = S && N != null ? N.toString() : "", f.dataset.dayChangePct = S && $ != null ? $.toString() : "", f.dataset.gainAbs = E != null ? E.toString() : "", f.dataset.gainPct = F != null ? F.toString() : "", f.dataset.hasValue = S ? "true" : "false", f.dataset.fxUnavailable = D ? "true" : "false", f.dataset.coverageRatio = typeof p.coverage_ratio == "number" && Number.isFinite(p.coverage_ratio) ? p.coverage_ratio.toString() : "", f.dataset.provenance = typeof p.provenance == "string" ? p.provenance : "", f.dataset.metricRunUuid = typeof p.metric_run_uuid == "string" ? p.metric_run_uuid : "", c += 1;
  }
  if (c === 0)
    console.debug("handlePortfolioUpdate: Keine passenden Zeilen gefunden / keine Änderungen.");
  else {
    const d = c.toLocaleString("de-DE");
    console.debug(`handlePortfolioUpdate: ${d} Zeile(n) gepatcht.`);
  }
  try {
    po(r);
  } catch (d) {
    console.warn("handlePortfolioUpdate: Fehler bei Summen-Neuberechnung:", d);
  }
  try {
    const d = (...h) => {
      for (const b of h) {
        if (!b) continue;
        const _ = t.querySelector(b);
        if (_) return _;
      }
      return null;
    }, p = d(
      ".account-table table",
      ".accounts-eur-table table",
      ".accounts-table table"
    ), f = d(
      ".fx-account-table table",
      ".accounts-fx-table table"
    ), g = (h, b) => {
      if (!h) return [];
      const _ = h.querySelectorAll("tbody tr.account-row");
      return (_.length ? Array.from(_) : Array.from(h.querySelectorAll("tbody tr:not(.footer-row)"))).map((w) => {
        const A = b ? w.cells.item(2) : w.cells.item(1);
        return { balance: at(A?.textContent) };
      });
    }, m = [
      ...g(p, !1),
      ...g(f, !0)
    ], y = Array.from(
      r.querySelectorAll("tbody tr.portfolio-row")
    ).map((h) => {
      const b = h.dataset.currentValue, _ = h.dataset.purchaseSum, v = b ? Number.parseFloat(b) : Number.NaN, w = _ ? Number.parseFloat(_) : Number.NaN;
      return {
        current_value: Number.isFinite(v) ? v : 0,
        purchase_sum: Number.isFinite(w) ? w : 0
      };
    });
    qr(m, y, t);
  } catch (d) {
    console.warn("handlePortfolioUpdate: Fehler bei Total-Neuberechnung:", d);
  }
}
function lo(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e.portfolio_uuid;
  if (typeof t == "string" && t)
    return t;
  const n = e.portfolioUuid;
  return typeof n == "string" && n ? n : null;
}
function Kt(e) {
  Yt.delete(e);
}
function In(e) {
  return typeof e != "number" || !Number.isInteger(e) || e <= 0 ? null : e;
}
function uo(e, t, n, r) {
  if (!n || n <= 1 || !t)
    return Kt(e), r;
  const a = n, i = Yt.get(e) ?? { expected: a, chunks: /* @__PURE__ */ new Map() };
  if (i.expected !== a && (i.chunks.clear(), i.expected = a), i.chunks.set(t, r), Yt.set(e, i), i.chunks.size < a)
    return null;
  const o = [];
  for (let s = 1; s <= a; s += 1) {
    const c = i.chunks.get(s);
    c && Array.isArray(c) && o.push(...c);
  }
  return Kt(e), o;
}
function zn(e, t) {
  const n = lo(e);
  if (!n)
    return console.warn("handlePortfolioPositionsUpdate: Ungültiges Update:", e), !1;
  const r = e?.error, a = In(e?.chunk_index), i = In(e?.chunk_count), o = Dt(e?.positions ?? []);
  r && Kt(n);
  const s = r ? o : uo(n, a, i, o);
  if (!r && s === null)
    return !0;
  const c = r ? o : s ?? [];
  to(n, e);
  const l = xt(n);
  let u = c;
  if (!r && l) {
    const p = ct(n, c);
    lt(n, p), u = p;
  }
  const d = Ir(t, n, u, r);
  if (d.applied) {
    if (ue.delete(n), !r && !l) {
      const p = ct(n, u);
      lt(n, p);
    }
  } else
    r || d.reason !== "hidden" || l ? (ue.set(n, { positions: u, error: r }), zr(t, n)) : (ue.delete(n), Ye.delete(n));
  if (!r && o.length > 0) {
    const p = Array.from(
      new Set(
        o.map((f) => f.security_uuid).filter((f) => typeof f == "string" && f.length > 0)
      )
    );
    if (p.length && typeof window < "u")
      try {
        window.dispatchEvent(
          new CustomEvent(
            Ki,
            {
              detail: {
                portfolioUuid: n,
                securityUuids: p
              }
            }
          )
        );
      } catch (f) {
        console.warn(
          "handlePortfolioPositionsUpdate: Dispatch des Portfolio-Events fehlgeschlagen",
          f
        );
      }
  }
  return !0;
}
function fo(e, t) {
  if (Array.isArray(e)) {
    let n = !1;
    for (const r of e)
      zn(r, t) && (n = !0);
    !n && e.length && console.warn("handlePortfolioPositionsUpdate: Kein gültiges Element im Array:", e);
    return;
  }
  zn(e, t);
}
function Vr(e) {
  const { renderPositionsTable: t, applyGainPctMetadata: n } = fn();
  try {
    if (typeof t == "function")
      return t(e);
  } catch {
  }
  if (e.length === 0)
    return '<div class="no-positions">Keine Positionen vorhanden.</div>';
  const r = e.map((i) => {
    const o = Mn(i);
    return {
      name: k(i.name),
      current_holdings: i.current_holdings,
      purchase_value: i.purchase_value,
      current_value: i.current_value,
      performance: o
    };
  }), a = Se(
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
      s.forEach((d, p) => {
        const f = c[p];
        if (!f) return;
        d.setAttribute("data-sort-key", f), d.classList.add("sortable-col"), d.setAttribute("role", "button"), d.setAttribute("tabindex", "0"), d.setAttribute("aria-sort", "none");
        const g = d.textContent || "";
        d.setAttribute("aria-label", `${k(g)} sortieren`);
      }), o.querySelectorAll("tbody tr").forEach((d, p) => {
        if (d.classList.contains("footer-row"))
          return;
        const f = e[p];
        f.security_uuid && (d.dataset.security = f.security_uuid), d.classList.add("position-row");
      }), o.dataset.defaultSort = "name", o.dataset.defaultDir = "asc";
      const u = n;
      if (u)
        try {
          u(o);
        } catch (d) {
          console.warn("renderPositionsTableInline: applyGainPctMetadata failed", d);
        }
      else
        o.querySelectorAll("tbody tr").forEach((p, f) => {
          if (p.classList.contains("footer-row"))
            return;
          const g = p.cells.item(4);
          if (!g)
            return;
          const m = e[f], y = Mn(m), h = typeof y?.gain_pct == "number" && Number.isFinite(y.gain_pct) ? y.gain_pct : null, b = h != null ? `${h.toLocaleString("de-DE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })} %` : "—", _ = h == null ? "neutral" : h > 0 ? "positive" : h < 0 ? "negative" : "neutral";
          g.dataset.gainPct = b, g.dataset.gainSign = _;
        });
      return o.outerHTML;
    }
  } catch (i) {
    console.warn("renderPositionsTableInline: Sortier-Metadaten Injection fehlgeschlagen:", i);
  }
  return a;
}
function po(e) {
  if (!e) return;
  const { updatePortfolioFooter: t } = fn();
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
    const b = Number.parseFloat(h);
    return Number.isFinite(b) ? b : null;
  }, a = n.reduce(
    (h, b) => {
      const _ = r(b.dataset.positionCount);
      if (_ != null && (h.sumPositions += _), b.dataset.fxUnavailable === "true" && (h.fxUnavailable = !0), b.dataset.hasValue !== "true")
        return h.incompleteRows += 1, h;
      h.valueRows += 1;
      const v = r(b.dataset.currentValue), w = r(b.dataset.gainAbs), A = r(b.dataset.purchaseSum);
      return v == null || w == null || A == null ? (h.incompleteRows += 1, h) : (h.sumCurrent += v, h.sumGainAbs += w, h.sumPurchase += A, h);
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
  }, u = { hasValue: i }, d = M("current_value", l.current_value, l, u), p = i ? a.sumGainAbs : null, f = i ? o : null, g = M("gain_abs", p, l, u), m = M("gain_pct", f, l, u);
  s.innerHTML = `
    <td>Summe</td>
    <td class="align-right">${c}</td>
    <td class="align-right">${d}</td>
    <td class="align-right">${g}</td>
    <td class="align-right">${m}</td>
  `;
  const y = s.cells.item(3);
  y && (y.dataset.gainPct = i && typeof o == "number" ? `${jt(o)} %` : "—", y.dataset.gainSign = i && typeof o == "number" ? o > 0 ? "positive" : o < 0 ? "negative" : "neutral" : "neutral"), s.dataset.positionCount = Math.round(a.sumPositions).toString(), s.dataset.currentValue = i ? a.sumCurrent.toString() : "", s.dataset.purchaseSum = i ? a.sumPurchase.toString() : "", s.dataset.gainAbs = i ? a.sumGainAbs.toString() : "", s.dataset.gainPct = i && typeof o == "number" ? o.toString() : "", s.dataset.hasValue = i ? "true" : "false", s.dataset.fxUnavailable = a.fxUnavailable || !i ? "true" : "false";
}
function Vn(e) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  if (typeof e == "string") {
    const t = Number.parseFloat(e);
    return Number.isFinite(t) ? t : 0;
  }
  return 0;
}
function jt(e) {
  return (Nt(e, { fallback: 0 }) ?? 0).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
function qr(e, t, n) {
  const r = n ?? document, i = (Array.isArray(e) ? e : []).reduce((d, p) => {
    const f = p.balance ?? p.current_value ?? p.value, g = Vn(f);
    return d + g;
  }, 0), s = (Array.isArray(t) ? t : []).reduce((d, p) => {
    const f = p.current_value ?? p.value, g = Vn(f);
    return d + g;
  }, 0), c = i + s, l = r.querySelector("#headerMeta");
  if (!l) {
    console.warn("updateTotalWealth: #headerMeta nicht gefunden.");
    return;
  }
  const u = l.querySelector("strong") || l.querySelector(".total-wealth-value");
  u ? u.textContent = `${jt(c)} €` : l.textContent = `💰 Gesamtvermögen: ${jt(c)} €`, l.dataset.totalWealthEur = c.toString();
}
function go(e, t) {
  const n = typeof e == "string" ? e : e?.last_file_update, r = ze(n) ?? "";
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
function Fc(e) {
  if (e == null)
    return;
  const t = e.querySelector("table.sortable-positions");
  if (t == null)
    return;
  const n = e.dataset.sortKey || t.dataset.defaultSort || "name", a = (e.dataset.sortDir || t.dataset.defaultDir || "asc") === "desc" ? "desc" : "asc";
  e.dataset.sortKey = n, e.dataset.sortDir = a, Cr(t, n, a, !0);
}
const $c = {
  getPortfolioPositionsCacheSnapshot: Ei,
  clearPortfolioPositionsCache: Pi,
  getPendingUpdateCount() {
    return ue.size;
  },
  queuePendingUpdate(e, t, n) {
    ue.set(e, { positions: t, error: n });
  },
  clearPendingUpdates() {
    ue.clear(), Ye.clear();
  },
  renderPositionsTableInline: Vr
};
function at(e) {
  return e == null ? 0 : parseFloat(
    e.replace(/\u00A0/g, " ").replace(/[€%]/g, "").replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "")
  ) || 0;
}
const qn = 50;
function Un(e, t) {
  try {
    t();
  } catch (n) {
    console.warn(`addSwipeEvents: ${e} handler threw`, n);
  }
}
function ho(e, t, n) {
  let r = null;
  const a = (l) => {
    l < -qn ? Un("left", t) : l > qn && Un("right", n);
  }, i = (l) => {
    l.touches.length === 1 && (r = l.touches[0].clientX);
  }, o = (l) => {
    if (r === null)
      return;
    if (l.changedTouches.length === 0) {
      r = null;
      return;
    }
    const u = l.changedTouches[0];
    a(u.clientX - r), r = null;
  }, s = (l) => {
    r = l.clientX;
  }, c = (l) => {
    r !== null && (a(l.clientX - r), r = null);
  };
  e.addEventListener("touchstart", i, { passive: !0 }), e.addEventListener("touchend", o, { passive: !0 }), e.addEventListener("mousedown", s), e.addEventListener("mouseup", c);
}
const mo = [
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
function Lt(e) {
  return mo.includes(e);
}
function Rt(e) {
  return e === "asc" || e === "desc";
}
function Ur(e) {
  return (e ?? []).filter((t) => !t.key.endsWith("-coverage"));
}
function On(e) {
  return Ur(e).filter(
    (t) => !t.key.startsWith("provenance-")
  );
}
let dt = null, ft = null;
const Bn = { min: 2, max: 6 };
function Ue(e) {
  return ge(e);
}
function yo(e) {
  return typeof e == "number" && Number.isFinite(e);
}
function bo(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  if (!t)
    return null;
  const n = t.toUpperCase();
  return /^[A-Z]{3}$/.test(n) ? n : n === "€" ? "EUR" : null;
}
function Wn(e, t, n = null) {
  for (const r of t) {
    const a = bo(e[r]);
    if (a)
      return a;
  }
  return n;
}
function Yn(e, t) {
  return yo(e) ? `${e.toLocaleString("de-DE", {
    minimumFractionDigits: Bn.min,
    maximumFractionDigits: Bn.max
  })}${t ? ` ${t}` : ""}` : null;
}
function _o(e) {
  const t = e, n = e.average_cost ?? null, r = e.aggregation ?? null, a = Wn(t, [
    "security_currency_code",
    "security_currency",
    "native_currency_code",
    "native_currency"
  ], e.currency_code ?? null), i = Wn(
    t,
    [
      "account_currency_code",
      "account_currency",
      "purchase_currency_code",
      "currency_code"
    ],
    a === "EUR" ? "EUR" : null
  ) ?? "EUR", o = Ue(n?.native), s = Ue(n?.security), c = Ue(n?.account), l = Ue(n?.eur), u = s ?? o, d = l ?? (i === "EUR" ? c : null), p = a ?? i, f = p === "EUR";
  let g, m;
  f ? (g = "EUR", m = d ?? u ?? c ?? null) : u != null ? (g = p, m = u) : c != null ? (g = i, m = c) : (g = "EUR", m = d ?? null);
  const y = Yn(m, g), h = f ? null : Yn(d, "EUR"), b = !!h && h !== y, _ = [], v = [];
  y ? (_.push(
    `<span class="purchase-price purchase-price--primary">${y}</span>`
  ), v.push(y.replace(/\u00A0/g, " "))) : (_.push('<span class="missing-value" role="note" aria-label="Kein Kaufpreis verfügbar" title="Kein Kaufpreis verfügbar">—</span>'), v.push("Kein Kaufpreis verfügbar")), b && h && (_.push(
    `<span class="purchase-price purchase-price--secondary">${h}</span>`
  ), v.push(h.replace(/\u00A0/g, " ")));
  const w = _.join("<br>"), A = Ue(r?.purchase_value_eur) ?? 0, P = v.join(", ");
  return { markup: w, sortValue: A, ariaLabel: P };
}
function vo(e) {
  const t = ge(e.current_holdings);
  if (t == null)
    return { value: null, pct: null };
  const n = ge(e.last_price_eur), r = ge(e.last_close_eur);
  let a = null, i = null;
  if (n != null && r != null) {
    a = (n - r) * t;
    const d = r * t;
    d && (i = a / d * 100);
  }
  const s = we(e.performance)?.day_change ?? null;
  if (a == null && s?.price_change_eur != null && (a = s.price_change_eur * t), i == null && s?.change_pct != null && (i = s.change_pct), a == null && i != null) {
    const u = ge(e.current_value);
    if (u != null) {
      const d = u / (1 + i / 100);
      d && (a = u - d);
    }
  }
  const c = a != null && Number.isFinite(a) ? Math.round(a * 100) / 100 : null, l = i != null && Number.isFinite(i) ? Math.round(i * 100) / 100 : null;
  return { value: c, pct: l };
}
const pt = /* @__PURE__ */ new Set();
function Or(e) {
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
function Xe(e) {
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
    const o = we(i.performance), s = typeof o?.gain_abs == "number" ? o.gain_abs : null, c = typeof o?.gain_pct == "number" ? o.gain_pct : null, l = vo(i), u = typeof i.purchase_value == "number" || typeof i.purchase_value == "string" ? i.purchase_value : null;
    return {
      name: typeof i.name == "string" ? k(i.name) : typeof i.name == "number" ? String(i.name) : "",
      current_holdings: typeof i.current_holdings == "number" || typeof i.current_holdings == "string" ? i.current_holdings : null,
      average_price: typeof i.purchase_value == "number" || typeof i.purchase_value == "string" ? i.purchase_value : null,
      purchase_value: u,
      current_value: typeof i.current_value == "number" || typeof i.current_value == "string" ? i.current_value : null,
      day_change_abs: l.value,
      day_change_pct: l.pct,
      gain_abs: s,
      gain_pct: c,
      performance: o
    };
  }), a = Se(r, n, ["purchase_value", "current_value", "day_change_abs", "gain_abs"]);
  try {
    const i = document.createElement("template");
    i.innerHTML = a.trim();
    const o = i.content.querySelector("table");
    if (o) {
      o.classList.add("sortable-positions");
      const s = Array.from(o.querySelectorAll("thead th"));
      return n.forEach((l, u) => {
        const d = s.at(u);
        if (!d)
          return;
        d.setAttribute("data-sort-key", l.key), d.classList.add("sortable-col"), d.setAttribute("role", "button"), d.setAttribute("tabindex", "0"), d.setAttribute("aria-sort", "none");
        const p = d.textContent || "";
        d.setAttribute("aria-label", `${k(p)} sortieren`);
      }), o.querySelectorAll("tbody tr").forEach((l, u) => {
        if (l.classList.contains("footer-row") || u >= t.length)
          return;
        const d = t[u], p = typeof d.security_uuid == "string" ? d.security_uuid : null;
        p && (l.dataset.security = p), l.classList.add("position-row");
        const f = l.cells.item(2);
        if (f) {
          const { markup: y, sortValue: h, ariaLabel: b } = _o(d);
          f.innerHTML = y, f.dataset.sortValue = String(h), b ? f.setAttribute("aria-label", b) : f.removeAttribute("aria-label");
        }
        const g = l.cells.item(7);
        if (g) {
          const y = we(d.performance), h = typeof y?.gain_pct == "number" && Number.isFinite(y.gain_pct) ? y.gain_pct : null, b = h != null ? `${h.toLocaleString("de-DE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })} %` : "—", _ = h == null ? "neutral" : h > 0 ? "positive" : h < 0 ? "negative" : "neutral";
          g.dataset.gainPct = b, g.dataset.gainSign = _;
        }
        const m = l.cells.item(8);
        m && m.classList.add("gain-pct-cell");
      }), o.dataset.defaultSort = "name", o.dataset.defaultDir = "asc", Or(o), o.outerHTML;
    }
  } catch (i) {
    console.warn("renderPositionsTable: Konnte Sortier-Metadaten nicht injizieren:", i);
  }
  return a;
}
function So(e) {
  const t = Dt(e ?? []);
  return Xe(t);
}
function wo(e, t) {
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
        Da(c) || console.warn("attachSecurityDetailDelegation: Detail-Tab konnte nicht geöffnet werden für", c);
      } catch (l) {
        console.error("attachSecurityDetailDelegation: Fehler beim Öffnen des Detail-Tabs", l);
      }
  })));
}
function Ze(e, t) {
  wo(e, t);
}
function Br(e) {
  console.debug("buildExpandablePortfolioTable: render", e.length, "portfolios");
  const t = (S) => S == null || typeof S != "string" && typeof S != "number" && typeof S != "boolean" ? "" : k(S);
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
    const D = S.align === "right" ? ' class="align-right"' : "";
    n += `<th${D}>${S.label}</th>`;
  }), n += "</tr></thead><tbody>", e.forEach((S) => {
    const D = Number.isFinite(S.position_count) ? S.position_count : 0, R = Number.isFinite(S.purchase_sum) ? S.purchase_sum : 0, K = S.hasValue && typeof S.current_value == "number" && Number.isFinite(S.current_value) ? S.current_value : null, T = K !== null, z = S.performance, B = typeof S.gain_abs == "number" ? S.gain_abs : typeof z?.gain_abs == "number" ? z.gain_abs : null, Y = typeof S.gain_pct == "number" ? S.gain_pct : typeof z?.gain_pct == "number" ? z.gain_pct : null, X = z && typeof z == "object" ? z.day_change : null, G = typeof S.day_change_abs == "number" ? S.day_change_abs : X && typeof X == "object" ? X.value_change_eur ?? X.price_change_eur : null, Ve = typeof S.day_change_pct == "number" ? S.day_change_pct : X && typeof X == "object" && typeof X.change_pct == "number" ? X.change_pct : null, Ce = S.fx_unavailable && T, Fa = typeof S.coverage_ratio == "number" && Number.isFinite(S.coverage_ratio) ? S.coverage_ratio : "", $a = typeof S.provenance == "string" ? S.provenance : "", Ta = typeof S.metric_run_uuid == "string" ? S.metric_run_uuid : "", qe = pt.has(S.uuid), La = qe ? "portfolio-toggle expanded" : "portfolio-toggle", En = `portfolio-details-${S.uuid}`, J = {
      fx_unavailable: S.fx_unavailable,
      purchase_value: R,
      current_value: K,
      day_change_abs: G,
      day_change_pct: Ve,
      gain_abs: B,
      gain_pct: Y
    }, Ne = { hasValue: T }, Ra = M("purchase_value", J.purchase_value, J, Ne), Ma = M("current_value", J.current_value, J, Ne), Ha = M("day_change_abs", J.day_change_abs, J, Ne), Ia = M("day_change_pct", J.day_change_pct, J, Ne), za = M("gain_abs", J.gain_abs, J, Ne), Va = M("gain_pct", J.gain_pct, J, Ne), Nn = T && typeof Y == "number" && Number.isFinite(Y) ? `${re(Y)} %` : "", qa = T && typeof Y == "number" && Number.isFinite(Y) ? Y > 0 ? "positive" : Y < 0 ? "negative" : "neutral" : "", Ua = T && typeof K == "number" && Number.isFinite(K) ? K : "", Oa = T && typeof B == "number" && Number.isFinite(B) ? B : "", Ba = T && typeof Y == "number" && Number.isFinite(Y) ? Y : "", Wa = T && typeof G == "number" && Number.isFinite(G) ? G : "", Ya = T && typeof Ve == "number" && Number.isFinite(Ve) ? Ve : "", Ka = String(D);
    let kt = "";
    Nn && (kt = ` data-gain-pct="${t(Nn)}" data-gain-sign="${t(qa)}"`), Ce && (kt += ' data-partial="true"'), n += `<tr class="portfolio-row"
                  data-portfolio="${S.uuid}"
                  data-position-count="${Ka}"
                  data-current-value="${t(Ua)}"
                  data-purchase-sum="${t(R)}"
                  data-day-change="${t(Wa)}"
                  data-day-change-pct="${t(Ya)}"
                  data-gain-abs="${t(Oa)}"
                data-gain-pct="${t(Ba)}"
                data-has-value="${T ? "true" : "false"}"
                data-fx-unavailable="${S.fx_unavailable ? "true" : "false"}"
                data-coverage-ratio="${t(Fa)}"
                data-provenance="${t($a)}"
                data-metric-run-uuid="${t(Ta)}">`;
    const ja = k(S.name), Ga = Rr(Ur(S.badges), {
      containerClass: "portfolio-badges"
    });
    n += `<td>
        <button type="button"
                class="${La}"
                data-portfolio="${S.uuid}"
                aria-expanded="${qe ? "true" : "false"}"
                aria-controls="${En}">
          <span class="caret">${qe ? "▼" : "▶"}</span>
          <span class="portfolio-name">${ja}</span>${Ga}
        </button>
      </td>`;
    const Xa = D.toLocaleString("de-DE");
    n += `<td class="align-right">${Xa}</td>`, n += `<td class="align-right">${Ra}</td>`, n += `<td class="align-right">${Ma}</td>`, n += `<td class="align-right">${Ha}</td>`, n += `<td class="align-right">${Ia}</td>`, n += `<td class="align-right"${kt}>${za}</td>`, n += `<td class="align-right gain-pct-cell">${Va}</td>`, n += "</tr>", n += `<tr class="portfolio-details${qe ? "" : " hidden"}"
                data-portfolio="${S.uuid}"
                id="${En}"
                role="region"
                aria-label="Positionen für ${S.name}">
      <td colspan="${r.length.toString()}">
        <div class="positions-container">${qe ? xt(S.uuid) ? Xe(Pr(S.uuid)) : gn("Lade Positionen...") : ""}</div>
      </td>
    </tr>`;
  });
  const a = e.filter((S) => typeof S.current_value == "number" && Number.isFinite(S.current_value)), i = e.reduce((S, D) => S + (Number.isFinite(D.position_count) ? D.position_count : 0), 0), o = a.reduce((S, D) => typeof D.current_value == "number" && Number.isFinite(D.current_value) ? S + D.current_value : S, 0), s = a.reduce((S, D) => typeof D.purchase_sum == "number" && Number.isFinite(D.purchase_sum) ? S + D.purchase_sum : S, 0), c = a.map((S) => {
    if (typeof S.day_change_abs == "number")
      return S.day_change_abs;
    const D = S.performance && typeof S.performance == "object" ? S.performance.day_change : null;
    if (D && typeof D == "object") {
      const R = D.value_change_eur;
      if (typeof R == "number" && Number.isFinite(R))
        return R;
    }
    return null;
  }).filter((S) => typeof S == "number" && Number.isFinite(S)), l = c.reduce((S, D) => S + D, 0), u = a.reduce((S, D) => {
    if (typeof D.performance?.gain_abs == "number" && Number.isFinite(D.performance.gain_abs))
      return S + D.performance.gain_abs;
    const R = typeof D.current_value == "number" && Number.isFinite(D.current_value) ? D.current_value : 0, K = typeof D.purchase_sum == "number" && Number.isFinite(D.purchase_sum) ? D.purchase_sum : 0;
    return S + (R - K);
  }, 0), d = a.length > 0, p = a.length !== e.length, f = c.length > 0, g = f && d && o !== 0 ? (() => {
    const S = o - l;
    return S ? l / S * 100 : null;
  })() : null, m = d && s > 0 ? u / s * 100 : null, y = {
    fx_unavailable: p,
    purchase_value: d ? s : null,
    current_value: d ? o : null,
    day_change_abs: f ? l : null,
    day_change_pct: f ? g : null,
    gain_abs: d ? u : null,
    gain_pct: d ? m : null
  }, h = { hasValue: d }, b = { hasValue: f }, _ = M("purchase_value", y.purchase_value, y, h), v = M("current_value", y.current_value, y, h), w = M("day_change_abs", y.day_change_abs, y, b), A = M("day_change_pct", y.day_change_pct, y, b), P = M("gain_abs", y.gain_abs, y, h), E = M("gain_pct", y.gain_pct, y, h);
  let F = "";
  if (d && typeof m == "number" && Number.isFinite(m)) {
    const S = `${re(m)} %`, D = m > 0 ? "positive" : m < 0 ? "negative" : "neutral";
    F = ` data-gain-pct="${t(S)}" data-gain-sign="${t(D)}"`;
  }
  p && (F += ' data-partial="true"');
  const I = String(Math.round(i)), C = d ? String(o) : "", x = d ? String(s) : "", q = f ? String(l) : "", N = f && typeof g == "number" && Number.isFinite(g) ? String(g) : "", $ = d ? String(u) : "", j = d && typeof m == "number" && Number.isFinite(m) ? String(m) : "";
  return n += `<tr class="footer-row"
      data-position-count="${I}"
      data-current-value="${t(C)}"
      data-purchase-sum="${t(x)}"
      data-day-change="${t(q)}"
      data-day-change-pct="${t(N)}"
      data-gain-abs="${t($)}"
      data-gain-pct="${t(j)}"
      data-has-value="${d ? "true" : "false"}"
      data-fx-unavailable="${p ? "true" : "false"}">
      <td>Summe</td>
      <td class="align-right">${Math.round(i).toLocaleString("de-DE")}</td>
    <td class="align-right">${_}</td>
    <td class="align-right">${v}</td>
    <td class="align-right">${w}</td>
    <td class="align-right">${A}</td>
    <td class="align-right"${F}>${P}</td>
    <td class="align-right gain-pct-cell">${E}</td>
  </tr>`, n += "</tbody></table>", n;
}
function Co(e) {
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
function Oe(e) {
  if (e === void 0)
    return null;
  const t = Number(e);
  return Number.isFinite(t) ? t : null;
}
function Wr(e) {
  const t = Co(e);
  if (!t)
    return;
  const n = t.tBodies.item(0);
  if (!n)
    return;
  const r = Array.from(n.querySelectorAll("tr.portfolio-row"));
  if (!r.length)
    return;
  let a = 0, i = 0, o = 0, s = 0, c = 0, l = !1, u = !1, d = !0, p = !1;
  for (const R of r) {
    const K = Oe(R.dataset.positionCount);
    K != null && (a += K), R.dataset.fxUnavailable === "true" && (p = !0);
    const T = R.dataset.hasValue;
    if (!!(T === "false" || T === "0" || T === "" || T == null)) {
      d = !1;
      continue;
    }
    l = !0;
    const B = Oe(R.dataset.currentValue), Y = Oe(R.dataset.gainAbs), X = Oe(R.dataset.purchaseSum), G = Oe(R.dataset.dayChange);
    if (B == null || Y == null || X == null) {
      d = !1;
      continue;
    }
    i += B, s += Y, o += X, G != null && (c += G, u = !0);
  }
  const f = l && d, g = f && o > 0 ? s / o * 100 : null, m = u && f && i !== 0 ? (() => {
    const R = i - c;
    return R ? c / R * 100 : null;
  })() : null;
  let y = Array.from(n.children).find(
    (R) => R instanceof HTMLTableRowElement && R.classList.contains("footer-row")
  );
  y || (y = document.createElement("tr"), y.classList.add("footer-row"), n.appendChild(y));
  const h = Math.round(a).toLocaleString("de-DE"), b = {
    fx_unavailable: p || !f,
    purchase_value: f ? o : null,
    current_value: f ? i : null,
    day_change_abs: u && f ? c : null,
    day_change_pct: u && f ? m : null,
    gain_abs: f ? s : null,
    gain_pct: f ? g : null
  }, _ = { hasValue: f }, v = { hasValue: u && f }, w = M("purchase_value", b.purchase_value, b, _), A = M("current_value", b.current_value, b, _), P = M("day_change_abs", b.day_change_abs, b, v), E = M("day_change_pct", b.day_change_pct, b, v), F = M("gain_abs", b.gain_abs, b, _), I = M("gain_pct", b.gain_pct, b, _), C = t.tHead ? t.tHead.rows.item(0) : null, x = C ? C.cells.length : 0, q = y.cells.length, N = x || q, $ = N > 0 ? N <= 5 : !1, j = f && typeof g == "number" ? `${re(g)} %` : "", S = f && typeof g == "number" ? g > 0 ? "positive" : g < 0 ? "negative" : "neutral" : "neutral";
  $ ? y.innerHTML = `
      <td>Summe</td>
      <td class="align-right">${h}</td>
      <td class="align-right">${A}</td>
      <td class="align-right">${F}</td>
      <td class="align-right gain-pct-cell">${I}</td>
    ` : y.innerHTML = `
      <td>Summe</td>
      <td class="align-right">${h}</td>
      <td class="align-right">${w}</td>
      <td class="align-right">${A}</td>
      <td class="align-right">${P}</td>
      <td class="align-right">${E}</td>
      <td class="align-right">${F}</td>
      <td class="align-right">${I}</td>
    `;
  const D = y.cells.item($ ? 3 : 6);
  D && (D.dataset.gainPct = j || "—", D.dataset.gainSign = S), y.dataset.positionCount = String(Math.round(a)), y.dataset.currentValue = f ? String(i) : "", y.dataset.purchaseSum = f ? String(o) : "", y.dataset.dayChange = f && u ? String(c) : "", y.dataset.dayChangePct = f && u && typeof m == "number" ? String(m) : "", y.dataset.gainAbs = f ? String(s) : "", y.dataset.gainPct = f && typeof g == "number" ? String(g) : "", y.dataset.hasValue = f ? "true" : "false", y.dataset.fxUnavailable = p ? "true" : "false";
}
function Je(e, t) {
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
  const i = (f, g) => {
    const m = a.querySelector("tbody");
    if (!m) return;
    const y = Array.from(m.querySelectorAll("tr")).filter((v) => !v.classList.contains("footer-row")), h = m.querySelector("tr.footer-row"), b = (v) => {
      if (v == null) return 0;
      const w = v.replace(/\u00A0/g, " ").replace(/[%€]/g, "").replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, ""), A = Number.parseFloat(w);
      return Number.isFinite(A) ? A : 0;
    };
    y.sort((v, w) => {
      const P = {
        name: 0,
        current_holdings: 1,
        average_price: 2,
        purchase_value: 3,
        current_value: 4,
        day_change_abs: 5,
        day_change_pct: 6,
        gain_abs: 7,
        gain_pct: 8
      }[f], E = v.cells.item(P), F = w.cells.item(P);
      let I = "";
      if (E) {
        const N = E.textContent;
        typeof N == "string" && (I = N.trim());
      }
      let C = "";
      if (F) {
        const N = F.textContent;
        typeof N == "string" && (C = N.trim());
      }
      const x = (N, $) => {
        const j = N ? N.dataset.sortValue : void 0;
        if (j != null && j !== "") {
          const S = Number(j);
          if (Number.isFinite(S))
            return S;
        }
        return b($);
      };
      let q;
      if (f === "name")
        q = I.localeCompare(C, "de", { sensitivity: "base" });
      else {
        const N = x(E, I), $ = x(F, C);
        q = N - $;
      }
      return g === "asc" ? q : -q;
    }), a.querySelectorAll("thead th.sort-active").forEach((v) => {
      v.classList.remove("sort-active", "dir-asc", "dir-desc");
    }), a.querySelectorAll("thead th[aria-sort]").forEach((v) => {
      v.setAttribute("aria-sort", "none");
    });
    const _ = a.querySelector(`thead th[data-sort-key="${f}"]`);
    _ && (_.classList.add("sort-active", g === "asc" ? "dir-asc" : "dir-desc"), _.setAttribute("aria-sort", g === "asc" ? "ascending" : "descending")), y.forEach((v) => m.appendChild(v)), h && m.appendChild(h);
  }, o = r.dataset.sortKey, s = r.dataset.sortDir, c = a.dataset.defaultSort, l = a.dataset.defaultDir, u = Lt(o) ? o : Lt(c) ? c : "name", d = Rt(s) ? s : Rt(l) ? l : "asc";
  i(u, d);
  const p = (f) => {
    const g = f.target;
    if (!(g instanceof Element))
      return;
    const m = g.closest("th[data-sort-key]");
    if (!m || !a.contains(m)) return;
    const y = m.getAttribute("data-sort-key");
    if (!Lt(y))
      return;
    let h = "asc";
    r.dataset.sortKey === y && (h = (Rt(r.dataset.sortDir) ? r.dataset.sortDir : "asc") === "asc" ? "desc" : "asc"), r.dataset.sortKey = y, r.dataset.sortDir = h, i(y, h);
  };
  a.addEventListener("click", (f) => {
    p(f);
  }), a.addEventListener("keydown", (f) => {
    (f.key === "Enter" || f.key === " ") && (f.preventDefault(), p(f));
  });
}
async function Ao(e, t, n) {
  if (!e || !dt || !ft) return;
  const r = t || n.querySelector(
    `.portfolio-details[data-portfolio="${e}"] .positions-container`
  );
  if (!r)
    return;
  const a = r.closest(".portfolio-details");
  if (!(a && a.classList.contains("hidden"))) {
    r.innerHTML = gn("Neu laden...");
    try {
      const i = await wr(
        dt,
        ft,
        e
      );
      if (i.error) {
        const s = typeof i.error == "string" ? i.error : String(i.error);
        r.innerHTML = `<div class="error">${k(s)} <button class="retry-pos" data-portfolio="${e}">Erneut laden</button></div>`;
        return;
      }
      const o = Dt(
        Array.isArray(i.positions) ? i.positions : []
      );
      ct(e, o), lt(e, o), r.innerHTML = Xe(o);
      try {
        Je(n, e);
      } catch (s) {
        console.warn("attachPortfolioToggleHandler: Sort-Init (Lazy) fehlgeschlagen:", s);
      }
      try {
        Ze(n, e);
      } catch (s) {
        console.warn("reloadPortfolioPositions: Security-Listener konnte nicht gebunden werden:", s);
      }
    } catch (i) {
      const o = i instanceof Error ? i.message : String(i);
      r.innerHTML = `<div class="error">Fehler: ${k(o)} <button class="retry-pos" data-portfolio="${e}">Retry</button></div>`;
    }
  }
}
async function Po(e, t, n = 3e3, r = 50) {
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
function vn(e) {
  const n = (typeof e.__ppReaderAttachToken == "number" ? e.__ppReaderAttachToken : 0) + 1;
  e.__ppReaderAttachToken = n, e.__ppReaderAttachInProgress = !0, (async () => {
    try {
      const r = await Po(e, ".portfolio-table");
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
              const f = s.getAttribute("data-portfolio");
              if (f) {
                const m = e.querySelector(
                  `.portfolio-details[data-portfolio="${f}"]`
                )?.querySelector(".positions-container");
                await Ao(f, m ?? null, e);
              }
              return;
            }
            const c = o.closest(".portfolio-toggle");
            if (!c || !r.contains(c)) return;
            const l = c.getAttribute("data-portfolio");
            if (!l) return;
            const u = e.querySelector(
              `.portfolio-details[data-portfolio="${l}"]`
            );
            if (!u) return;
            const d = c.querySelector(".caret");
            if (u.classList.contains("hidden")) {
              u.classList.remove("hidden"), c.classList.add("expanded"), c.setAttribute("aria-expanded", "true"), d && (d.textContent = "▼"), pt.add(l);
              try {
                _n(e, l);
              } catch (f) {
                console.warn("attachPortfolioToggleHandler: Pending-Flush fehlgeschlagen:", f);
              }
              if (xt(l)) {
                const f = u.querySelector(".positions-container");
                if (f) {
                  f.innerHTML = Xe(
                    Pr(l)
                  ), Je(e, l);
                  try {
                    Ze(e, l);
                  } catch (g) {
                    console.warn("attachPortfolioToggleHandler: Security-Listener (Cache) Fehler:", g);
                  }
                }
              } else {
                const f = u.querySelector(".positions-container");
                f && (f.innerHTML = gn("Lade Positionen..."));
                try {
                  const g = await wr(
                    dt,
                    ft,
                    l
                  );
                  if (g.error) {
                    const y = typeof g.error == "string" ? g.error : String(g.error);
                    f && (f.innerHTML = `<div class="error">${k(y)} <button class="retry-pos" data-portfolio="${l}">Erneut laden</button></div>`);
                    return;
                  }
                  const m = Dt(
                    Array.isArray(g.positions) ? g.positions : []
                  );
                  if (ct(l, m), lt(
                    l,
                    m
                  ), f) {
                    f.innerHTML = Xe(m);
                    try {
                      Je(e, l);
                    } catch (y) {
                      console.warn("attachPortfolioToggleHandler: Sort-Init (Lazy) fehlgeschlagen:", y);
                    }
                    try {
                      Ze(e, l);
                    } catch (y) {
                      console.warn("attachPortfolioToggleHandler: Security-Listener konnte nicht gebunden werden:", y);
                    }
                  }
                } catch (g) {
                  const m = g instanceof Error ? g.message : String(g), y = u.querySelector(".positions-container");
                  y && (y.innerHTML = `<div class="error">Fehler beim Laden: ${k(m)} <button class="retry-pos" data-portfolio="${l}">Retry</button></div>`), console.error("Fehler beim Lazy Load für", l, g);
                }
              }
            } else
              u.classList.add("hidden"), c.classList.remove("expanded"), c.setAttribute("aria-expanded", "false"), d && (d.textContent = "▶"), pt.delete(l);
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
function Eo(e) {
  const t = e.querySelector(".expandable-portfolio-table");
  t && (t.__ppReaderPortfolioFallbackBound || (t.__ppReaderPortfolioFallbackBound = !0, t.addEventListener("click", (n) => {
    const r = n.target;
    !(r instanceof Element) || !r.closest(".portfolio-toggle") || e.querySelector(".portfolio-table")?.__ppReaderPortfolioToggleBound || (console.debug("Fallback-Listener aktiv – re-attach Hauptlistener"), vn(e));
  })));
}
async function Yr(e, t, n) {
  dt = t ?? null, ft = n ?? null, console.debug(
    "renderDashboard: start – panelConfig:",
    n?.config,
    "derived entry_id?",
    n?.config?._panel_custom?.config?.entry_id
  );
  const r = await ci(t, n);
  xr(r.accounts);
  const a = Lr(), i = await ui(t, n);
  $i(i.portfolios);
  const o = qi();
  let s = "";
  try {
    s = await li(t, n);
  } catch {
    s = "";
  }
  const c = a.reduce(
    (C, x) => C + (typeof x.balance == "number" && Number.isFinite(x.balance) ? x.balance : 0),
    0
  ), l = o.some((C) => C.fx_unavailable), u = a.some((C) => C.fx_unavailable && (C.balance == null || !Number.isFinite(C.balance))), d = o.reduce((C, x) => x.hasValue && typeof x.current_value == "number" && Number.isFinite(x.current_value) ? C + x.current_value : C, 0), p = c + d, f = "Teilw. fehlende FX-Kurse – Gesamtvermögen abweichend", m = o.some((C) => C.hasValue && typeof C.current_value == "number" && Number.isFinite(C.current_value)) || a.some((C) => typeof C.balance == "number" && Number.isFinite(C.balance)) ? `${re(p)}&nbsp;€` : `<span class="missing-value" role="note" aria-label="${f}" title="${f}">—</span>`, y = l || u ? `<span class="total-wealth-note">${f}</span>` : "", h = `
    <div class="header-meta-row">
      💰 Gesamtvermögen: <strong class="total-wealth-value">${m}</strong>${y}
    </div>
  `, b = Et("Übersicht", h), _ = Br(o), v = a.filter((C) => (C.currency_code ?? "EUR") === "EUR"), w = a.filter((C) => (C.currency_code ?? "EUR") !== "EUR"), P = w.some((C) => C.fx_unavailable) ? `
        <p class="table-note" role="note">
          <span class="table-note__icon" aria-hidden="true">⚠️</span>
          <span>Wechselkurse konnten nicht geladen werden. EUR-Werte werden derzeit nicht angezeigt.</span>
        </p>
      ` : "", E = `
    <div class="card">
      <h2>Liquidität</h2>
      <div class="scroll-container account-table">
        ${Se(
    v.map((C) => ({
      name: ut(C.name, On(C.badges), {
        containerClass: "account-name",
        labelClass: "account-name__label"
      }),
      balance: C.balance ?? null
    })),
    [
      { key: "name", label: "Name" },
      { key: "balance", label: "Kontostand (EUR)", align: "right" }
    ],
    ["balance"]
  )}
      </div>
    </div>
    ${w.length ? `
      <div class="card">
        <h2>Fremdwährungen</h2>
        <div class="scroll-container fx-account-table">
          ${Se(
    w.map((C) => {
      const x = C.orig_balance, N = typeof x == "number" && Number.isFinite(x) ? `${x.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}&nbsp;${C.currency_code ?? ""}` : "";
      return {
        name: ut(C.name, On(C.badges), {
          containerClass: "account-name",
          labelClass: "account-name__label"
        }),
        fx_display: N,
        balance: C.balance ?? null
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
        ${P}
      </div>` : ""}
  `, F = `
    <div class="card footer-card">
      <div class="meta">
        <div class="last-file-update">
          📂 Letzte Aktualisierung der Datei: <strong>${s || "Unbekannt"}</strong>
        </div>
      </div>
    </div>
  `, I = `
    ${b.outerHTML}
    <div class="card">
      <h2>Investment</h2>
      <div class="scroll-container portfolio-table">
        ${_}
      </div>
    </div>
    ${E}
    ${F}
  `;
  return No(e, o), I;
}
function No(e, t) {
  if (!e)
    return;
  const n = () => {
    try {
      const a = e, i = a.querySelector(".portfolio-table");
      i && i.querySelectorAll(".portfolio-toggle").length === 0 && (console.debug("Recovery: Tabelle ohne Buttons – erneuter Aufbau"), i.innerHTML = Br(t)), vn(e), Eo(e), pt.forEach((o) => {
        try {
          xt(o) && (Je(e, o), Ze(e, o));
        } catch (s) {
          console.warn("Init-Sortierung für expandiertes Depot fehlgeschlagen:", o, s);
        }
      });
      try {
        Wr(a);
      } catch (o) {
        console.warn("renderDashboard: Footer-Summe konnte nicht aktualisiert werden:", o);
      }
      try {
        ao(e);
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
ti({
  renderPositionsTable: (e) => So(e),
  applyGainPctMetadata: Or,
  attachSecurityDetailListener: Ze,
  attachPortfolioPositionsSorting: Je,
  updatePortfolioFooter: (e) => {
    e && Wr(e);
  }
});
const xo = "http://www.w3.org/2000/svg", De = 640, ke = 260, Be = { top: 12, right: 16, bottom: 24, left: 16 }, We = "var(--pp-reader-chart-line, #3f51b5)", Gt = "var(--pp-reader-chart-area, rgba(63, 81, 181, 0.12))", Kn = "0.75rem", Kr = "var(--pp-reader-chart-baseline, rgba(96, 125, 139, 0.75))", jr = "6 4", Do = 1440 * 60 * 1e3;
function ko(e) {
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
function Fo(e) {
  return typeof e == "string" ? e : typeof e == "number" && Number.isFinite(e) ? e.toString() : e instanceof Date && Number.isFinite(e.getTime()) ? e.toISOString() : "";
}
function Q(e) {
  return `${String(e)}px`;
}
function ie(e, t = {}) {
  const n = document.createElementNS(xo, e);
  return Object.entries(t).forEach(([r, a]) => {
    const i = ko(a);
    i != null && n.setAttribute(r, i);
  }), n;
}
function gt(e, t = null) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  if (typeof e == "string" && e.trim() !== "") {
    const n = Number.parseFloat(e);
    if (Number.isFinite(n))
      return n;
  }
  return t;
}
function Gr(e, t) {
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
const Xr = (e) => {
  if (e && typeof e == "object" && "date" in e)
    return e.date;
}, Zr = (e) => {
  if (e && typeof e == "object" && "close" in e)
    return e.close;
}, Jr = (e, t, n) => {
  if (Number.isFinite(e)) {
    const r = new Date(e);
    if (!Number.isNaN(r.getTime()))
      return r.toLocaleDateString("de-DE");
  }
  if (t && typeof t == "object" && "date" in t) {
    const r = t.date, a = Fo(r);
    if (a)
      return a;
  }
  return Number.isFinite(e) ? e.toString() : "";
}, Qr = (e, t, n) => (Number.isFinite(e) ? e : gt(e, 0) ?? 0).toLocaleString("de-DE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
}), ea = ({ xFormatted: e, yFormatted: t }) => `
    <div class="chart-tooltip-date">${k(e)}</div>
    <div class="chart-tooltip-value">${k(t)}&nbsp;€</div>
  `, ta = ({
  marker: e,
  xFormatted: t,
  yFormatted: n
}) => {
  const r = typeof e.label == "string" ? e.label : null;
  return `
    <div class="chart-tooltip-date">${k(r || t)}</div>
    <div class="chart-tooltip-value">${k(n)}</div>
  `;
};
function na(e) {
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
    width: De,
    height: ke,
    margin: { ...Be },
    series: [],
    points: [],
    range: null,
    xAccessor: Xr,
    yAccessor: Zr,
    xFormatter: Jr,
    yFormatter: Qr,
    tooltipRenderer: ea,
    markerTooltipRenderer: ta,
    color: We,
    areaColor: Gt,
    baseline: null,
    handlersAttached: !1,
    markers: [],
    markerPositions: []
  }), e.__chartState;
}
function te(e, t, n) {
  return !Number.isFinite(e) || e < t ? t : e > n ? n : e;
}
function $o(e, t) {
  if (e.length === 0)
    return "";
  const n = [];
  e.forEach((o, s) => {
    const c = s === 0 ? "M" : "L", l = o.x.toFixed(2), u = o.y.toFixed(2);
    n.push(`${c}${l} ${u}`);
  });
  const r = e[0], i = `L${e[e.length - 1].x.toFixed(2)} ${t.toFixed(2)} L${r.x.toFixed(2)} ${t.toFixed(2)} Z`;
  return `${n.join(" ")} ${i}`;
}
function To(e) {
  if (e.length === 0)
    return "";
  const t = [];
  return e.forEach((n, r) => {
    const a = r === 0 ? "M" : "L", i = n.x.toFixed(2), o = n.y.toFixed(2);
    t.push(`${a}${i} ${o}`);
  }), t.join(" ");
}
function Lo(e) {
  const { baselineLine: t, baseline: n } = e;
  if (!t)
    return;
  const r = n?.color ?? Kr, a = n?.dashArray ?? jr;
  t.setAttribute("stroke", r), t.setAttribute("stroke-dasharray", a);
}
function Mt(e) {
  const { baselineLine: t, baseline: n, range: r, margin: a, width: i } = e;
  if (!t)
    return;
  const o = n?.value;
  if (!r || o == null || !Number.isFinite(o)) {
    t.style.opacity = "0";
    return;
  }
  const { minY: s, maxY: c, boundedHeight: l } = r, u = Number.isFinite(s) ? s : o, p = (Number.isFinite(c) ? c : u + 1) - u, f = p === 0 ? 0.5 : (o - u) / p, g = te(f, 0, 1), m = Math.max(l, 0), y = a.top + (1 - g) * m, h = Math.max(i - a.left - a.right, 0), b = a.left, _ = a.left + h;
  t.setAttribute("x1", b.toFixed(2)), t.setAttribute("x2", _.toFixed(2)), t.setAttribute("y1", y.toFixed(2)), t.setAttribute("y2", y.toFixed(2)), t.style.opacity = "1";
}
function Ro(e, t, n) {
  const { width: r, height: a, margin: i } = t, { xAccessor: o, yAccessor: s } = n;
  if (e.length === 0)
    return { points: [], range: null };
  const c = e.map((N, $) => {
    const j = o(N, $), S = s(N, $), D = Gr(j, $), R = gt(S, Number.NaN);
    return Number.isFinite(R) ? {
      index: $,
      data: N,
      xValue: D,
      yValue: R
    } : null;
  }).filter((N) => !!N);
  if (c.length === 0)
    return { points: [], range: null };
  const l = c.reduce((N, $) => Math.min(N, $.xValue), c[0].xValue), u = c.reduce((N, $) => Math.max(N, $.xValue), c[0].xValue), d = c.reduce((N, $) => Math.min(N, $.yValue), c[0].yValue), p = c.reduce((N, $) => Math.max(N, $.yValue), c[0].yValue), f = Math.max(r - i.left - i.right, 1), g = Math.max(a - i.top - i.bottom, 1), m = Number.isFinite(l) ? l : 0, y = Number.isFinite(u) ? u : m + 1, h = Number.isFinite(d) ? d : 0, b = Number.isFinite(p) ? p : h + 1, _ = gt(t.baseline?.value, null), v = _ != null && Number.isFinite(_) ? Math.min(h, _) : h, w = _ != null && Number.isFinite(_) ? Math.max(b, _) : b, A = Math.max(
    2,
    Math.min(
      6,
      Math.round(
        Math.max(a - i.top - i.bottom, 0) / 60
      ) || 4
    )
  ), { niceMin: P, niceMax: E } = Uo(
    v,
    w,
    A
  ), F = Number.isFinite(P) ? P : h, I = Number.isFinite(E) ? E : b, C = y - m || 1, x = I - F || 1;
  return {
    points: c.map((N) => {
      const $ = C === 0 ? 0.5 : (N.xValue - m) / C, j = x === 0 ? 0.5 : (N.yValue - F) / x, S = i.left + $ * f, D = i.top + (1 - j) * g;
      return {
        ...N,
        x: S,
        y: D
      };
    }),
    range: {
      minX: m,
      maxX: y,
      minY: F,
      maxY: I,
      boundedWidth: f,
      boundedHeight: g
    }
  };
}
function Ht(e) {
  const { markerLayer: t, markerOverlay: n, markers: r, range: a, margin: i, markerTooltip: o } = e;
  if (e.markerPositions = [], it(e), !t || !n)
    return;
  for (; t.firstChild; )
    t.removeChild(t.firstChild);
  for (; n.firstChild; )
    n.removeChild(n.firstChild);
  if (!a || !Array.isArray(r) || r.length === 0)
    return;
  const s = a.maxX - a.minX || 1, c = a.maxY - a.minY || 1;
  r.forEach((l, u) => {
    const d = Gr(l.x, u), p = gt(l.y, Number.NaN), f = Number(p);
    if (!Number.isFinite(d) || !Number.isFinite(f))
      return;
    const g = s === 0 ? 0.5 : te((d - a.minX) / s, 0, 1), m = c === 0 ? 0.5 : te((f - a.minY) / c, 0, 1), y = i.left + g * a.boundedWidth, h = i.top + (1 - m) * a.boundedHeight, b = ie("g", {
      class: "line-chart-marker",
      transform: `translate(${y.toFixed(2)} ${h.toFixed(2)})`,
      "data-marker-id": l.id
    }), _ = ie("circle", {
      r: 5,
      fill: l.color || e.color,
      stroke: "#fff",
      "stroke-width": 2,
      opacity: 0.95
    });
    b.appendChild(_), t.appendChild(b), e.markerPositions.push({
      marker: l,
      x: y,
      y: h
    });
  }), o && (o.style.opacity = "0", o.style.visibility = "hidden");
}
function ra(e, t, n, r) {
  e.width = Number.isFinite(t) ? Number(t) : De, e.height = Number.isFinite(n) ? Number(n) : ke, e.margin = {
    top: Number.isFinite(r?.top) ? Number(r?.top) : Be.top,
    right: Number.isFinite(r?.right) ? Number(r?.right) : Be.right,
    bottom: Number.isFinite(r?.bottom) ? Number(r?.bottom) : Be.bottom,
    left: Number.isFinite(r?.left) ? Number(r?.left) : Be.left
  };
}
function Mo(e, t) {
  const n = e.xFormatter(t.xValue, t.data, t.index), r = e.yFormatter(t.yValue, t.data, t.index);
  return e.tooltipRenderer({
    point: t,
    xFormatted: n,
    yFormatted: r,
    data: t.data,
    index: t.index
  });
}
function Ho(e, t, n, r = null) {
  const { tooltip: a, width: i, margin: o, height: s } = e;
  if (!a)
    return;
  const c = r && Number.isFinite(r.scaleX) && r.scaleX > 0 ? r.scaleX : 1, l = r && Number.isFinite(r.scaleY) && r.scaleY > 0 ? r.scaleY : 1, u = s - o.bottom;
  a.style.visibility = "visible", a.style.opacity = "1";
  const d = a.offsetWidth || 0, p = a.offsetHeight || 0, f = t.x * c, g = te(
    f - d / 2,
    o.left * c,
    (i - o.right) * c - d
  ), m = Math.max(u * l - p, 0), y = 12, b = (Number.isFinite(n) ? te(n ?? 0, o.top, u) : t.y) * l;
  let _ = b - p - y;
  _ < o.top * l && (_ = b + y), _ = te(_, 0, m);
  const v = Q(Math.round(g)), w = Q(Math.round(_));
  a.style.transform = `translate(${v}, ${w})`;
}
function Xt(e) {
  const { tooltip: t, focusLine: n, focusCircle: r } = e;
  t && (t.style.opacity = "0", t.style.visibility = "hidden"), n && (n.style.opacity = "0"), r && (r.style.opacity = "0");
}
function Io(e, t) {
  const { marker: n } = t, r = e.xFormatter(t.marker.x, n, -1), a = e.yFormatter(t.marker.y, n, -1);
  return e.markerTooltipRenderer({
    marker: n,
    xFormatted: r,
    yFormatted: a
  });
}
function zo(e, t, n, r = null) {
  const { markerTooltip: a, width: i, margin: o, height: s, tooltip: c } = e;
  if (!a)
    return;
  const l = r && Number.isFinite(r.scaleX) && r.scaleX > 0 ? r.scaleX : 1, u = r && Number.isFinite(r.scaleY) && r.scaleY > 0 ? r.scaleY : 1, d = s - o.bottom;
  a.style.visibility = "visible", a.style.opacity = "1";
  const p = a.offsetWidth || 0, f = a.offsetHeight || 0, g = t.x * l, m = te(
    g - p / 2,
    o.left * l,
    (i - o.right) * l - p
  ), y = Math.max(d * u - f, 0), h = 10, b = c?.getBoundingClientRect(), _ = e.svg?.getBoundingClientRect(), v = b && _ ? b.top - _.top : null, w = b && _ ? b.bottom - _.top : null, P = (Number.isFinite(n) ? te(n ?? t.y, o.top, d) : t.y) * u;
  let E;
  v != null && w != null ? v <= P ? E = v - f - h : E = w + h : (E = P - f - h, E < o.top * u && (E = P + h)), E = te(E, 0, y);
  const F = Q(Math.round(m)), I = Q(Math.round(E));
  a.style.transform = `translate(${F}, ${I})`;
}
function it(e) {
  const { markerTooltip: t } = e;
  t && (t.style.opacity = "0", t.style.visibility = "hidden");
}
function Vo(e, t, n) {
  let a = null, i = 576;
  for (const o of e.markerPositions) {
    const s = o.x - t, c = o.y - n, l = s * s + c * c;
    l <= i && (a = o, i = l);
  }
  return a;
}
function qo(e, t) {
  if (t.handlersAttached || !t.overlay)
    return;
  const n = (a) => {
    if (t.points.length === 0 || !t.svg) {
      Xt(t), it(t);
      return;
    }
    const i = t.svg.getBoundingClientRect(), o = t.width || De, s = t.height || ke, c = i.width && Number.isFinite(i.width) && Number.isFinite(o) && o > 0 ? i.width / o : 1, l = i.height && Number.isFinite(i.height) && Number.isFinite(s) && s > 0 ? i.height / s : 1, u = c > 0 ? 1 / c : 1, d = l > 0 ? 1 / l : 1, p = (a.clientX - i.left) * u, f = (a.clientY - i.top) * d, g = {
      scaleX: c,
      scaleY: l
    };
    let m = t.points[0], y = Math.abs(p - m.x);
    for (let b = 1; b < t.points.length; b += 1) {
      const _ = t.points[b], v = Math.abs(p - _.x);
      v < y && (y = v, m = _);
    }
    t.focusCircle && (t.focusCircle.setAttribute("cx", m.x.toFixed(2)), t.focusCircle.setAttribute("cy", m.y.toFixed(2)), t.focusCircle.style.opacity = "1"), t.focusLine && (t.focusLine.setAttribute("x1", m.x.toFixed(2)), t.focusLine.setAttribute("x2", m.x.toFixed(2)), t.focusLine.setAttribute("y1", t.margin.top.toFixed(2)), t.focusLine.setAttribute(
      "y2",
      (t.height - t.margin.bottom).toFixed(2)
    ), t.focusLine.style.opacity = "1"), t.tooltip && (t.tooltip.innerHTML = Mo(t, m), Ho(t, m, f, g));
    const h = Vo(t, p, f);
    h && t.markerTooltip ? (t.markerTooltip.innerHTML = Io(t, h), zo(t, h, f, g)) : it(t);
  }, r = () => {
    Xt(t), it(t);
  };
  t.overlay.addEventListener("pointermove", n), t.overlay.addEventListener("pointerenter", n), t.overlay.addEventListener("pointerleave", r), t.handlersAttached = !0, t.handlePointerMove = n, t.handlePointerLeave = r, e.addEventListener("pointercancel", r);
}
function aa(e, t = {}) {
  const n = document.createElement("div");
  n.className = "line-chart-container", n.dataset.chartType = "line", n.style.position = "relative";
  const r = ie("svg", {
    width: De,
    height: ke,
    viewBox: `0 0 ${String(De)} ${String(ke)}`,
    role: "img",
    "aria-hidden": "true",
    focusable: "false"
  });
  r.classList.add("line-chart-svg");
  const a = ie("path", {
    class: "line-chart-area",
    fill: Gt,
    stroke: "none"
  }), i = ie("line", {
    class: "line-chart-baseline",
    stroke: Kr,
    "stroke-width": 1,
    "stroke-dasharray": jr,
    opacity: 0
  }), o = ie("path", {
    class: "line-chart-path",
    fill: "none",
    stroke: We,
    "stroke-width": 2,
    "stroke-linecap": "round",
    "stroke-linejoin": "round"
  }), s = ie("line", {
    class: "line-chart-focus-line",
    stroke: We,
    "stroke-width": 1,
    "stroke-dasharray": "4 4",
    opacity: 0
  }), c = ie("circle", {
    class: "line-chart-focus-circle",
    r: 4,
    fill: "#fff",
    stroke: We,
    "stroke-width": 2,
    opacity: 0
  }), l = ie("g", {
    class: "line-chart-markers"
  }), u = ie("rect", {
    class: "line-chart-overlay",
    fill: "transparent",
    x: 0,
    y: 0,
    width: De,
    height: ke
  });
  r.appendChild(a), r.appendChild(i), r.appendChild(o), r.appendChild(s), r.appendChild(c), r.appendChild(l), r.appendChild(u), n.appendChild(r);
  const d = document.createElement("div");
  d.className = "chart-tooltip", d.style.position = "absolute", d.style.top = "0", d.style.left = "0", d.style.pointerEvents = "none", d.style.opacity = "0", d.style.visibility = "hidden", n.appendChild(d);
  const p = document.createElement("div");
  p.className = "line-chart-marker-overlay", p.style.position = "absolute", p.style.top = "0", p.style.left = "0", p.style.width = "100%", p.style.height = "100%", p.style.pointerEvents = "none", p.style.overflow = "visible", p.style.zIndex = "2", n.appendChild(p);
  const f = document.createElement("div");
  f.className = "chart-tooltip chart-tooltip--marker", f.style.position = "absolute", f.style.top = "0", f.style.left = "0", f.style.pointerEvents = "none", f.style.opacity = "0", f.style.visibility = "hidden", n.appendChild(f), e.appendChild(n);
  const g = na(n);
  if (g.svg = r, g.areaPath = a, g.linePath = o, g.baselineLine = i, g.focusLine = s, g.focusCircle = c, g.overlay = u, g.tooltip = d, g.markerOverlay = p, g.markerLayer = l, g.markerTooltip = f, g.xAccessor = t.xAccessor ?? Xr, g.yAccessor = t.yAccessor ?? Zr, g.xFormatter = t.xFormatter ?? Jr, g.yFormatter = t.yFormatter ?? Qr, g.tooltipRenderer = t.tooltipRenderer ?? ea, g.markerTooltipRenderer = t.markerTooltipRenderer ?? ta, g.color = t.color ?? We, g.areaColor = t.areaColor ?? Gt, g.baseline = t.baseline ?? null, g.handlersAttached = !1, g.markers = Array.isArray(t.markers) ? t.markers.slice() : [], !g.xAxis) {
    const m = document.createElement("div");
    m.className = "line-chart-axis line-chart-axis-x", m.style.position = "absolute", m.style.left = "0", m.style.right = "0", m.style.bottom = "0", m.style.pointerEvents = "none", m.style.fontSize = Kn, m.style.color = "var(--secondary-text-color)", m.style.display = "block", n.appendChild(m), g.xAxis = m;
  }
  if (!g.yAxis) {
    const m = document.createElement("div");
    m.className = "line-chart-axis line-chart-axis-y", m.style.position = "absolute", m.style.top = "0", m.style.bottom = "0", m.style.left = "0", m.style.pointerEvents = "none", m.style.fontSize = Kn, m.style.color = "var(--secondary-text-color)", m.style.display = "block", n.appendChild(m), g.yAxis = m;
  }
  return ra(g, t.width, t.height, t.margin), o.setAttribute("stroke", g.color), s.setAttribute("stroke", g.color), c.setAttribute("stroke", g.color), a.setAttribute("fill", g.areaColor), Sn(n, t), qo(n, g), n;
}
function Sn(e, t = {}) {
  if (!e) {
    console.error("updateLineChart: container element is required");
    return;
  }
  const n = na(e);
  if (!n.svg || !n.linePath || !n.overlay) {
    console.error("updateLineChart: chart was not initialised with renderLineChart");
    return;
  }
  t.xAccessor && (n.xAccessor = t.xAccessor), t.yAccessor && (n.yAccessor = t.yAccessor), t.xFormatter && (n.xFormatter = t.xFormatter), t.yFormatter && (n.yFormatter = t.yFormatter), t.tooltipRenderer && (n.tooltipRenderer = t.tooltipRenderer), t.markerTooltipRenderer && (n.markerTooltipRenderer = t.markerTooltipRenderer), t.color && (n.color = t.color, n.linePath.setAttribute("stroke", n.color), n.focusLine && n.focusLine.setAttribute("stroke", n.color), n.focusCircle && n.focusCircle.setAttribute("stroke", n.color)), t.areaColor && (n.areaColor = t.areaColor, n.areaPath && n.areaPath.setAttribute("fill", n.areaColor)), Object.prototype.hasOwnProperty.call(t, "baseline") && (n.baseline = t.baseline ?? null), Array.isArray(t.markers) && (n.markers = t.markers.slice()), Lo(n), ra(n, t.width, t.height, t.margin);
  const { width: r, height: a } = n;
  n.svg.setAttribute("width", String(r)), n.svg.setAttribute("height", String(a)), n.svg.setAttribute("viewBox", `0 0 ${String(r)} ${String(a)}`), n.overlay.setAttribute("x", "0"), n.overlay.setAttribute("y", "0"), n.overlay.setAttribute("width", Math.max(r, 0).toFixed(2)), n.overlay.setAttribute("height", Math.max(a, 0).toFixed(2)), Array.isArray(t.series) && (n.series = Array.from(t.series));
  const { points: i, range: o } = Ro(n.series, n, {
    xAccessor: n.xAccessor,
    yAccessor: n.yAccessor
  });
  if (n.points = i, n.range = o, i.length === 0) {
    n.linePath.setAttribute("d", ""), n.areaPath && n.areaPath.setAttribute("d", ""), Xt(n), Ht(n), It(n), Mt(n);
    return;
  }
  if (i.length === 1) {
    const c = i[0], l = Math.max(
      0.5,
      Math.min(4, Math.max(n.width - n.margin.left - n.margin.right, 1) * 0.01)
    ), u = `M${c.x.toFixed(2)} ${c.y.toFixed(2)} h${l.toFixed(2)}`;
    n.linePath.setAttribute("d", u), n.areaPath && n.areaPath.setAttribute("d", ""), n.focusCircle && (n.focusCircle.setAttribute("cx", c.x.toFixed(2)), n.focusCircle.setAttribute("cy", c.y.toFixed(2)), n.focusCircle.style.opacity = "1"), n.focusLine && (n.focusLine.style.opacity = "0"), It(n), Mt(n), Ht(n);
    return;
  }
  const s = To(i);
  if (n.linePath.setAttribute("d", s), n.areaPath && o) {
    const c = n.margin.top + o.boundedHeight, l = $o(i, c);
    n.areaPath.setAttribute("d", l);
  }
  It(n), Mt(n), Ht(n);
}
function It(e) {
  const { xAxis: t, yAxis: n, range: r, margin: a, height: i, yFormatter: o } = e;
  if (!t || !n)
    return;
  if (!r) {
    t.innerHTML = "", n.innerHTML = "";
    return;
  }
  const { minX: s, maxX: c, minY: l, maxY: u, boundedWidth: d, boundedHeight: p } = r, f = Number.isFinite(s) && Number.isFinite(c) && c >= s, g = Number.isFinite(l) && Number.isFinite(u) && u >= l, m = Math.max(d, 0), y = Math.max(p, 0);
  if (t.style.left = Q(a.left), t.style.width = Q(m), t.style.top = Q(i - a.bottom + 6), t.innerHTML = "", f && m > 0) {
    const b = (c - s) / Do, _ = Math.max(2, Math.min(6, Math.round(m / 140) || 4));
    Oo(e, s, c, _, b).forEach(({ positionRatio: w, label: A }) => {
      const P = document.createElement("div");
      P.className = "line-chart-axis-tick line-chart-axis-tick-x", P.style.position = "absolute", P.style.bottom = "0";
      const E = te(w, 0, 1);
      P.style.left = Q(E * m);
      let F = "-50%", I = "center";
      E <= 1e-3 ? (F = "0", I = "left", P.style.marginLeft = "2px") : E >= 0.999 && (F = "-100%", I = "right", P.style.marginRight = "2px"), P.style.transform = `translateX(${F})`, P.style.textAlign = I, P.textContent = A, t.appendChild(P);
    });
  }
  n.style.top = Q(a.top), n.style.height = Q(y);
  const h = Math.max(a.left - 6, 0);
  if (n.style.left = "0", n.style.width = Q(Math.max(h, 0)), n.innerHTML = "", g && y > 0) {
    const b = Math.max(2, Math.min(6, Math.round(y / 60) || 4)), _ = Bo(l, u, b), v = o;
    _.forEach(({ value: w, positionRatio: A }) => {
      const P = document.createElement("div");
      P.className = "line-chart-axis-tick line-chart-axis-tick-y", P.style.position = "absolute", P.style.left = "0";
      const F = (1 - te(A, 0, 1)) * y;
      P.style.top = Q(F), P.textContent = v(w, null, -1), n.appendChild(P);
    });
  }
}
function Uo(e, t, n = 4) {
  if (!Number.isFinite(e) || !Number.isFinite(t))
    return {
      niceMin: e,
      niceMax: t
    };
  const r = Math.max(2, n);
  if (t === e) {
    const l = Zt(Math.abs(e) || 1);
    return {
      niceMin: e - l,
      niceMax: t + l
    };
  }
  const i = (t - e) / (r - 1), o = Zt(i), s = Math.floor(e / o) * o, c = Math.ceil(t / o) * o;
  return s === c ? {
    niceMin: e,
    niceMax: t + o
  } : {
    niceMin: s,
    niceMax: c
  };
}
function Oo(e, t, n, r, a) {
  if (!Number.isFinite(t) || !Number.isFinite(n) || n < t)
    return [];
  if (!Number.isFinite(a) || a <= 0)
    return [
      {
        positionRatio: 0.5,
        label: jn(e, t, a || 0)
      }
    ];
  const i = Math.max(2, r), o = [], s = n - t;
  for (let c = 0; c < i; c += 1) {
    const l = i === 1 ? 0.5 : c / (i - 1), u = t + l * s;
    o.push({
      positionRatio: l,
      label: jn(e, u, a)
    });
  }
  return o;
}
function jn(e, t, n) {
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
function Bo(e, t, n) {
  if (!Number.isFinite(e) || !Number.isFinite(t))
    return [];
  if (t === e)
    return [
      {
        value: e,
        positionRatio: 0.5
      }
    ];
  const r = t - e, a = Math.max(2, n), i = r / (a - 1), o = Zt(i), s = Math.floor(e / o) * o, c = Math.ceil(t / o) * o, l = [];
  for (let u = s; u <= c + o / 2; u += o) {
    const d = (u - e) / (t - e);
    l.push({
      value: u,
      positionRatio: te(d, 0, 1)
    });
  }
  return l.length > a + 2 ? l.filter((u, d) => d % 2 === 0) : l;
}
function Zt(e) {
  if (!Number.isFinite(e) || e === 0)
    return 1;
  const t = Math.floor(Math.log10(Math.abs(e))), n = Math.abs(e) / 10 ** t;
  let r;
  return n <= 1 ? r = 1 : n <= 2 ? r = 2 : n <= 5 ? r = 5 : r = 10, r * 10 ** t;
}
function Wo(e) {
  return Array.isArray(e) && e.every((t) => typeof t == "string");
}
function Yo(e) {
  return typeof e == "object" && e !== null;
}
function Ko(e) {
  if (!Yo(e))
    return !1;
  const t = e;
  return typeof t.portfolioUuid != "string" ? !1 : Wo(t.securityUuids);
}
function jo(e) {
  return e instanceof CustomEvent ? Ko(e.detail) : !1;
}
const zt = { min: 0, max: 6 }, ht = { min: 2, max: 4 }, Go = "1Y", ia = [
  "1M",
  "6M",
  "1Y",
  "5Y",
  "ALL"
], Xo = {
  "1M": 30,
  "6M": 182,
  "1Y": 365,
  "5Y": 1826,
  ALL: Number.POSITIVE_INFINITY
}, Zo = /* @__PURE__ */ new Set([0, 2]), Jo = /* @__PURE__ */ new Set([1, 3]), Qo = "var(--pp-reader-chart-marker-buy, #2e7d32)", es = "var(--pp-reader-chart-marker-sell, #c0392b)", Gn = "{TICKER}", ts = "https://chatgpt.com/", Vt = {
  aggregation: "Aggregationsdaten",
  totals: "Kaufsummen",
  eur_total: "EUR-Kaufsumme"
}, Fe = /* @__PURE__ */ new Map(), ot = /* @__PURE__ */ new Map(), Qe = /* @__PURE__ */ new Map(), $e = /* @__PURE__ */ new Map(), oa = "pp-reader:portfolio-positions-updated", Ke = /* @__PURE__ */ new Map();
function ns(e) {
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
function rs(e, t) {
  if (e) {
    if (t) {
      Qe.set(e, t);
      return;
    }
    Qe.delete(e);
  }
}
function as(e) {
  if (!e || typeof window > "u")
    return null;
  if (Qe.has(e)) {
    const t = Qe.get(e) || null;
    if (t)
      return t;
  }
  return null;
}
function sa(e) {
  return Fe.has(e) || Fe.set(e, /* @__PURE__ */ new Map()), Fe.get(e);
}
function ca(e) {
  return $e.has(e) || $e.set(e, /* @__PURE__ */ new Map()), $e.get(e);
}
function la(e) {
  if (e) {
    if (Fe.has(e)) {
      try {
        const t = Fe.get(e);
        t && t.clear();
      } catch (t) {
        console.warn("invalidateHistoryCache: Konnte Cache nicht leeren", e, t);
      }
      Fe.delete(e);
    }
    if ($e.has(e)) {
      try {
        $e.get(e)?.clear();
      } catch (t) {
        console.warn("invalidateHistoryCache: Konnte Marker-Cache nicht leeren", e, t);
      }
      $e.delete(e);
    }
  }
}
function ua(e) {
  e && Qe.delete(e);
}
function is(e, t) {
  if (!e || !t)
    return;
  const n = t.securityUuids;
  (Array.isArray(n) ? n : []).includes(e) && (la(e), ua(e));
}
function os(e) {
  if (!e || Ke.has(e))
    return;
  const t = (n) => {
    jo(n) && is(e, n.detail);
  };
  try {
    window.addEventListener(oa, t), Ke.set(e, t);
  } catch (n) {
    console.error("ensureLiveUpdateSubscription: Registrierung fehlgeschlagen", n);
  }
}
function ss(e) {
  if (!e || !Ke.has(e))
    return;
  const t = Ke.get(e);
  try {
    t && window.removeEventListener(oa, t);
  } catch (n) {
    console.error("removeLiveUpdateSubscription: Entfernen des Listeners fehlgeschlagen", n);
  }
  Ke.delete(e);
}
function cs(e) {
  e && (ss(e), la(e), ua(e));
}
function Xn(e, t) {
  if (!ot.has(e)) {
    ot.set(e, { activeRange: t });
    return;
  }
  const n = ot.get(e);
  n && (n.activeRange = t);
}
function da(e) {
  return ot.get(e)?.activeRange ?? Go;
}
function Jt(e) {
  const t = Date.UTC(
    e.getUTCFullYear(),
    e.getUTCMonth(),
    e.getUTCDate()
  );
  return Math.floor(t / 864e5);
}
function Me(e) {
  const t = new Date(e.getTime());
  return t.setUTCHours(0, 0, 0, 0), t;
}
function Zn(e) {
  return !(e instanceof Date) || Number.isNaN(e.getTime()) ? null : Jt(Me(e));
}
function H(e) {
  return ge(e);
}
function fa(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t || null;
}
function Pe(e) {
  const t = fa(e);
  return t ? t.toUpperCase() : null;
}
function ls(e) {
  if (!e)
    return null;
  const t = hn(e.aggregation), n = H(t?.purchase_total_security) ?? (t ? H(
    t.security_currency_total
  ) : null), r = H(t?.purchase_total_account) ?? (t ? H(
    t.account_currency_total
  ) : null);
  if (oe(n) && oe(r)) {
    const s = n / r;
    if (oe(s))
      return s;
  }
  const a = Ie(e.average_cost), i = H(a?.native) ?? H(a?.security), o = H(a?.account) ?? H(a?.eur);
  if (oe(i) && oe(o)) {
    const s = i / o;
    if (oe(s))
      return s;
  }
  return null;
}
function pa(e, t = "Unbekannter Fehler") {
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
function mt(e, t) {
  const n = Me(t instanceof Date ? t : /* @__PURE__ */ new Date()), r = Xo[e], a = Zn(n), i = {};
  if (a != null && (i.end_date = a), Number.isFinite(r) && r > 0) {
    const o = new Date(n.getTime());
    o.setUTCDate(o.getUTCDate() - (r - 1));
    const s = Zn(o);
    s != null && (i.start_date = s);
  }
  return i;
}
function wn(e) {
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
      return Number.isNaN(n.getTime()) ? null : Me(n);
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
          return Me(r);
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
function us(e) {
  const t = wn(e);
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
function yt(e) {
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
function Qt(e) {
  return Array.isArray(e) ? e.map((t) => {
    let r = H(t.close);
    if (r == null) {
      const i = H(t.close_raw);
      i != null && (r = i / 1e8);
    }
    return r == null ? null : {
      date: wn(t.date) ?? t.date,
      close: r
    };
  }).filter((t) => !!t) : [];
}
function bt(e, t, n = null) {
  if (!Array.isArray(e))
    return [];
  const r = [], a = Pe(t), i = a || "EUR", o = ls(n);
  return e.forEach((s, c) => {
    const l = typeof s.type == "number" ? s.type : Number(s.type), u = Zo.has(l), d = Jo.has(l);
    if (!u && !d)
      return;
    const p = us(s.date);
    let f = H(s.price);
    if (!p || f == null)
      return;
    const g = Pe(s.currency_code), m = a ?? g ?? i;
    g && a && g !== a && oe(o) && (f *= o);
    const y = H(s.shares), h = H(s.net_price_eur), b = u ? "Kauf" : "Verkauf", _ = y != null ? `${Pn(y)} @ ` : "", v = `${b} ${_}${he(f)} ${m}`, w = d && h != null ? `${v} (netto ${he(h)} EUR)` : v, A = u ? Qo : es, P = typeof s.uuid == "string" && s.uuid.trim() || `${b}-${p.getTime().toString()}-${c.toString()}`;
    r.push({
      id: P,
      x: p.getTime(),
      y: f,
      color: A,
      label: w,
      payload: {
        type: b,
        currency: m,
        transactionCurrency: g,
        shares: y,
        price: f,
        netPriceEur: h,
        date: p.toISOString(),
        portfolio: s.portfolio
      }
    });
  }), r;
}
function Cn(e) {
  const t = H(e?.last_price_native) ?? H(e?.last_price?.native) ?? null;
  if (L(t))
    return t;
  if (Pe(e?.currency_code) === "EUR") {
    const r = H(e?.last_price_eur);
    if (L(r))
      return r;
  }
  return null;
}
function ds(e) {
  if (!e)
    return null;
  const n = e.last_price_fetched_at, r = yt(n);
  if (r != null)
    return r;
  const i = e.last_price?.fetched_at;
  return yt(i) ?? null;
}
function en(e, t) {
  let n = [];
  Array.isArray(e) && (n = e.map((l) => ({
    ...l
  })));
  const r = n.slice(), a = Cn(t);
  if (!L(a))
    return r;
  const i = ds(t) ?? Date.now(), o = new Date(i);
  if (Number.isNaN(o.getTime()))
    return r;
  const s = Jt(Me(o));
  let c = null;
  for (let l = r.length - 1; l >= 0; l -= 1) {
    const u = r[l], d = wn(u.date);
    if (!d)
      continue;
    const p = Jt(Me(d));
    if (c == null && (c = p), p === s)
      return u.close !== a && (r[l] = { ...u, close: a }), r;
    if (p < s)
      break;
  }
  return c != null && c > s || r.push({
    date: o,
    close: a
  }), r;
}
function L(e) {
  return typeof e == "number" && Number.isFinite(e);
}
function oe(e) {
  return typeof e == "number" && Number.isFinite(e) && e > 0;
}
function je(e, t, n) {
  if (!L(e) || !L(t))
    return !1;
  const r = Math.abs(e - t), a = Math.max(Math.abs(e), Math.abs(t), 1);
  return r <= a * 1e-4;
}
function fs(e, t) {
  return !L(t) || t === 0 || !L(e) ? null : _i((e - t) / t * 100);
}
function ga(e, t) {
  if (e.length === 0)
    return { priceChange: null, priceChangePct: null };
  const n = e[0], r = H(n.close);
  if (!L(r) || r === 0)
    return { priceChange: null, priceChangePct: null };
  const a = e[e.length - 1], i = H(a.close), o = H(t) ?? i;
  if (!L(o))
    return { priceChange: null, priceChangePct: null };
  const s = o - r, c = Object.is(s, -0) ? 0 : s, l = fs(o, r);
  return { priceChange: c, priceChangePct: l };
}
function An(e, t) {
  if (!L(e) || e === 0)
    return "neutral";
  const n = 0.5 / Math.pow(10, t);
  return Math.abs(e) < n ? "neutral" : e > 0 ? "positive" : "negative";
}
function ps(e, t) {
  if (!L(e))
    return '<span class="value neutral">—</span>';
  const n = he(e);
  if (n === "—")
    return '<span class="value neutral">—</span>';
  const r = An(e, ht.max), a = t ? `&nbsp;${k(t)}` : "";
  return `<span class="value ${r}">${n}${a}</span>`;
}
function gs(e) {
  return L(e) ? `<span class="value ${An(e, 2)} value--percentage">${re(e)}&nbsp;%</span>` : '<span class="value neutral">—</span>';
}
function ha(e, t, n, r) {
  const a = e, i = a.length > 0 ? a : "Zeitraum";
  return `
    <div class="security-info-bar" data-range="${ce(a)}">
      <div class="security-info-item">
        <span class="label">Preisänderung (${k(i)})</span>
        <div class="value-row">
          ${ps(t, r)}
          ${gs(n)}
        </div>
      </div>
    </div>
  `;
}
function hs(e) {
  return `
    <div class="security-range-selector" role="group" aria-label="Zeitraum">
      ${ia.map((n) => `
      <button
        type="button"
        class="security-range-button${n === e ? " active" : ""}"
        data-range="${ce(n)}"
        aria-pressed="${n === e ? "true" : "false"}"
      >
        ${k(n)}
      </button>
    `).join(`
`)}
    </div>
  `;
}
function ma(e, t = { status: "empty" }) {
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
      const r = pa(
        t.message,
        "Die historischen Daten konnten nicht geladen werden."
      );
      return `
        <div class="history-placeholder" data-state="error" data-range="${n}">
          <p>${k(r)}</p>
        </div>
      `;
    }
    case "empty":
    default: {
      const r = n.length > 0 ? n : "den gewählten Zeitraum";
      return `
        <div class="history-placeholder" data-state="empty" data-range="${n}">
          <p>Für dieses Wertpapier liegen im Zeitraum ${k(r)} keine historischen Daten vor.</p>
        </div>
      `;
    }
  }
}
function Pn(e) {
  const t = H(e);
  if (t == null)
    return "—";
  const n = Math.abs(t % 1) > 0, r = n ? 2 : zt.min, a = n ? zt.max : zt.min;
  return t.toLocaleString("de-DE", {
    minimumFractionDigits: r,
    maximumFractionDigits: a
  });
}
function he(e) {
  const t = H(e);
  return t == null ? "—" : t.toLocaleString("de-DE", {
    minimumFractionDigits: ht.min,
    maximumFractionDigits: ht.max
  });
}
function ms(e, t) {
  const n = he(e), r = `&nbsp;${k(t)}`;
  return `<span class="${An(e, ht.max)}">${n}${r}</span>`;
}
function ys(e, t) {
  const n = e?.ticker_symbol;
  if (typeof n == "string" && n.trim())
    return n.trim();
  const r = typeof e?.name == "string" ? e.name.trim() : "";
  return r || (typeof t == "string" ? t : "");
}
function bs(e) {
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
async function _s(e) {
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
function vs(e) {
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
function Ss(e, t, n) {
  const r = Ie(e?.average_cost), a = r?.account ?? (L(t) ? t : H(t));
  if (!L(a))
    return null;
  const i = e?.account_currency_code ?? e?.account_currency;
  if (typeof i == "string" && i.trim())
    return i.trim().toUpperCase();
  const o = Pe(e?.currency_code) ?? "", s = r?.security ?? r?.native ?? (L(n) ? n : H(n)), c = hn(e?.aggregation);
  if (o && L(s) && je(a, s))
    return o;
  const l = H(c?.purchase_total_security) ?? H(e?.purchase_total_security), u = H(c?.purchase_total_account) ?? H(e?.purchase_total_account);
  let d = null;
  if (L(l) && l !== 0 && L(u) && (d = u / l), r?.source === "eur_total")
    return "EUR";
  const f = r?.eur;
  if (L(f) && je(a, f))
    return "EUR";
  const g = H(e?.purchase_value_eur);
  return L(g) ? "EUR" : d != null && je(d, 1) ? o || null : o === "EUR" ? "EUR" : o || "EUR";
}
function Jn(e) {
  return typeof e != "number" || !Number.isFinite(e) || e <= 0 ? null : e.toLocaleString("de-DE", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
  });
}
function ws(e) {
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
    const o = t?.[i], s = yt(o);
    if (s != null)
      return s;
  }
  const r = [];
  t && "last_price_fetched_at" in t && r.push(t.last_price_fetched_at);
  const a = e?.last_price;
  a && typeof a == "object" && r.push(a.fetched_at), t && "last_price_date" in t && r.push(t.last_price_date);
  for (const i of r) {
    const o = yt(i);
    if (o != null)
      return o;
  }
  return null;
}
function Cs(e) {
  if (e == null || !Number.isFinite(e))
    return null;
  const t = new Date(e);
  return Number.isNaN(t.getTime()) ? null : t.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}
function As(e, t) {
  if (!e)
    return null;
  const n = Pe(e.currency_code) ?? "", r = Ie(e.average_cost);
  if (!r || !n)
    return null;
  const a = r.native ?? r.security ?? null;
  let o = r.account ?? r.eur ?? null, s = Pe(t) ?? "";
  if (oe(r.eur) && (!s || s === n) && (o = r.eur, s = "EUR"), !n || !s || n === s || !oe(a) || !oe(o))
    return null;
  const c = o / a;
  if (!Number.isFinite(c) || c <= 0)
    return null;
  const l = Jn(c);
  if (!l)
    return null;
  let u = null;
  if (c > 0) {
    const b = 1 / c;
    Number.isFinite(b) && b > 0 && (u = Jn(b));
  }
  const d = ws(e), p = Cs(d), f = [`FX-Kurs (Kauf): 1 ${n} = ${l} ${s}`];
  u && f.push(`1 ${s} = ${u} ${n}`);
  const g = [], m = r.source, y = m in Vt ? Vt[m] : Vt.aggregation;
  if (g.push(`Quelle: ${y}`), L(r.coverage_ratio)) {
    const b = Math.min(Math.max(r.coverage_ratio * 100, 0), 100);
    g.push(
      `Abdeckung: ${b.toLocaleString("de-DE", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      })}%`
    );
  }
  g.length && f.push(...g);
  const h = p ?? "Datum unbekannt";
  return `${f.join(" · ")} (Stand: ${h})`;
}
function Qn(e) {
  if (!e)
    return null;
  const t = Ie(e.average_cost), n = t?.native ?? t?.security ?? null;
  return L(n) ? n : null;
}
function Ps(e) {
  if (!e)
    return '<div class="meta-error">Keine Snapshot-Daten verfügbar.</div>';
  const t = e.currency_code || "EUR", n = e.total_holdings_precise ?? e.total_holdings, r = Pn(n), a = e.last_price_native ?? e.last_price?.native ?? e.last_price_eur, i = he(a), o = i === "—" ? null : `${i}${`&nbsp;${k(t)}`}`, s = H(e.market_value_eur) ?? H(e.current_value_eur) ?? null, c = Ie(e.average_cost), l = c?.native ?? c?.security ?? null, u = c?.eur ?? null, p = c?.account ?? null ?? u, f = we(e.performance), g = f?.day_change ?? null, m = g?.price_change_native ?? null, y = g?.price_change_eur ?? null, h = L(m) ? m : y, b = L(m) ? t : "EUR", _ = (T, z = "") => {
    const B = ["value"];
    return z && B.push(...z.split(" ").filter(Boolean)), `<span class="${B.join(" ")}">${T}</span>`;
  }, v = (T = "") => {
    const z = ["value--missing"];
    return T && z.push(T), _("—", z.join(" "));
  }, w = (T, z = "") => {
    if (!L(T))
      return v(z);
    const B = ["value--gain"];
    return z && B.push(z), _(hi(T), B.join(" "));
  }, A = (T, z = "") => {
    if (!L(T))
      return v(z);
    const B = ["value--gain-percentage"];
    return z && B.push(z), _(mi(T), B.join(" "));
  }, P = o ? _(o, "value--price") : v("value--price"), E = r === "—" ? v("value--holdings") : _(r, "value--holdings"), F = L(s) ? _(`${re(s)}&nbsp;€`, "value--market-value") : v("value--market-value"), I = L(h) ? _(
    ms(h, b),
    "value--gain value--absolute"
  ) : v("value--absolute"), C = A(
    g?.change_pct,
    "value--percentage"
  ), x = w(
    f?.total_change_eur,
    "value--absolute"
  ), q = A(
    f?.total_change_pct,
    "value--percentage"
  ), N = Ss(
    e,
    p,
    l
  ), $ = As(
    e,
    N
  ), j = $ ? ` title="${ce($)}"` : "", S = [], D = L(u);
  L(l) ? S.push(
    _(
      `${he(l)}${`&nbsp;${k(t)}`}`,
      "value--average value--average-native"
    )
  ) : S.push(
    v("value--average value--average-native")
  );
  let R = null, K = null;
  return D && (t !== "EUR" || !L(l) || !je(u, l)) ? (R = u, K = "EUR") : L(p) && N && (N !== t || !je(p, l ?? NaN)) && (R = p, K = N), R != null && L(R) && S.push(
    _(
      `${he(R)}${K ? `&nbsp;${k(K)}` : ""}`,
      "value--average value--average-eur"
    )
  ), `
    <div class="security-meta-grid security-meta-grid--expanded">
      <div class="security-meta-item security-meta-item--price">
        <span class="label">Letzter Preis</span>
        <div class="value-group">${P}</div>
      </div>
      <div class="security-meta-item security-meta-item--average">
        <span class="label">Durchschnittlicher Kaufpreis</span>
        <div class="value-group"${j}>
          ${S.join("")}
        </div>
      </div>
      <div class="security-meta-item security-meta-item--day-change">
        <span class="label">Tagesänderung</span>
        <div class="value-group">
          ${I}
          ${C}
        </div>
      </div>
      <div class="security-meta-item security-meta-item--total-change">
        <span class="label">Gesamtänderung</span>
        <div class="value-group">
          ${x}
          ${q}
        </div>
      </div>
      <div class="security-meta-item security-meta-item--holdings">
        <span class="label">Bestand</span>
        <div class="value-group">${E}</div>
      </div>
      <div class="security-meta-item security-meta-item--market-value">
        <span class="label">Marktwert (EUR)</span>
        <div class="value-group">${F}</div>
      </div>
    </div>
  `;
}
function Es(e) {
  return `
    <div class="card security-meta-card">
      <div id="headerMeta" class="meta">
        ${Ps(e)}
      </div>
    </div>
  `;
}
function ya(e) {
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
function Ns(e, t, {
  currency: n,
  baseline: r,
  markers: a
} = {}) {
  const i = e.clientWidth || e.offsetWidth || 0, o = i > 0 ? i : 640, s = Math.min(Math.max(Math.floor(o * 0.5), 240), 440), c = (n || "").toUpperCase() || "EUR", l = L(r) ? r : null, u = Math.max(48, Math.min(72, Math.round(o * 0.075))), d = Math.max(28, Math.min(56, Math.round(o * 0.05))), p = Math.max(40, Math.min(64, Math.round(s * 0.14)));
  return {
    width: o,
    height: s,
    margin: {
      top: 18,
      right: d,
      bottom: p,
      left: u
    },
    series: t,
    yFormatter: (g) => he(g),
    tooltipRenderer: ({ xFormatted: g, yFormatted: m }) => `
      <div class="chart-tooltip-date">${k(g)}</div>
      <div class="chart-tooltip-value">${k(m)}&nbsp;${k(c)}</div>
    `,
    markerTooltipRenderer: ({
      marker: g,
      xFormatted: m,
      yFormatted: y
    }) => {
      const h = g.payload ?? {}, b = fa(h.type), _ = H(h.shares), v = _ != null ? Pn(_) : null, w = Pe(h.currency) ?? c, A = [];
      b && A.push(b), v && A.push(`${v} Stück`), m && A.push(`am ${m}`);
      const P = A.join(" ").trim() || (typeof g.label == "string" ? g.label : m), E = typeof y == "string" && y.trim() ? y.trim() : he(h.price), F = E ? `${E}${w ? `&nbsp;${k(w)}` : ""}` : k(w);
      return `
      <div class="chart-tooltip-date">${k(P)}</div>
      <div class="chart-tooltip-value">${F}</div>
    `;
    },
    baseline: l != null ? {
      value: l
    } : null,
    markers: Array.isArray(a) ? a : []
  };
}
const er = /* @__PURE__ */ new WeakMap();
function xs(e, t, n = {}) {
  if (t.length === 0)
    return;
  const r = Ns(e, t, n);
  let a = er.get(e) ?? null;
  if (!a || !e.contains(a)) {
    e.innerHTML = "", a = aa(e, r), a && er.set(e, a);
    return;
  }
  Sn(a, r);
}
function tr(e, t) {
  e && (e.dataset.activeRange = t, e.querySelectorAll(".security-range-button").forEach((n) => {
    const r = n.dataset.range, a = r === t;
    n.classList.toggle("active", a), n.setAttribute("aria-pressed", a ? "true" : "false"), n.disabled = !1, n.classList.remove("loading"), r && (n.textContent = r);
  }));
}
function Ds(e, t, n, r, a) {
  const i = e.querySelector(".security-info-bar");
  if (!i || !i.parentElement)
    return;
  const o = document.createElement("div");
  o.innerHTML = ha(t, n, r, a).trim();
  const s = o.firstElementChild;
  s && i.parentElement.replaceChild(s, i);
}
function nr(e, t, n, r, a = {}) {
  const i = e.querySelector(".security-detail-placeholder");
  if (i && (i.innerHTML = `
    <h2>Historie</h2>
    ${ma(t, n)}
  `, n.status === "loaded" && Array.isArray(r) && r.length)) {
    const o = i.querySelector(".history-chart");
    o && requestAnimationFrame(() => {
      xs(o, r, a);
    });
  }
}
function ks(e) {
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
    const u = sa(a), d = ca(a), p = Qn(i);
    Array.isArray(s) && c.status !== "error" && u.set(o, s), os(a), Xn(a, o), tr(l, o);
    const g = en(
      s,
      i
    );
    let m = c;
    m.status !== "error" && (m = g.length ? { status: "loaded" } : { status: "empty" }), nr(
      t,
      o,
      m,
      g,
      {
        currency: i?.currency_code,
        baseline: p,
        markers: d.get(o) ?? []
      }
    );
    const y = async (h) => {
      if (h === da(a))
        return;
      const b = l.querySelector(
        `.security-range-button[data-range="${h}"]`
      );
      b && (b.disabled = !0, b.classList.add("loading"), b.innerHTML = yi());
      let _ = u.get(h) ?? null, v = d.get(h) ?? null, w = null, A = [];
      if (_)
        w = _.length ? { status: "loaded" } : { status: "empty" };
      else
        try {
          const x = mt(h), q = await st(
            n,
            r,
            a,
            x
          );
          _ = Qt(q.prices), v = bt(
            q.transactions,
            i?.currency_code,
            i
          ), u.set(h, _), v = Array.isArray(v) ? v : [], d.set(h, v), w = _.length ? { status: "loaded" } : { status: "empty" };
        } catch (x) {
          console.error("Range-Wechsel: Historie konnte nicht geladen werden", x), _ = [], v = [], w = {
            status: "error",
            message: ya(x) || "Die historischen Daten konnten aufgrund eines Fehlers nicht geladen werden."
          };
        }
      if (!Array.isArray(v))
        try {
          const x = mt(h), q = await st(
            n,
            r,
            a,
            x
          );
          v = bt(
            q.transactions,
            i?.currency_code,
            i
          ), v = Array.isArray(v) ? v : [], d.set(h, v);
        } catch (x) {
          console.error("Range-Wechsel: Transaktionsmarker konnten nicht geladen werden", x), v = [];
        }
      A = en(_, i), w.status !== "error" && (w = A.length ? { status: "loaded" } : { status: "empty" });
      const P = Cn(i), { priceChange: E, priceChangePct: F } = ga(
        A,
        P
      ), I = Array.isArray(v) ? v : [];
      Xn(a, h), tr(l, h), Ds(
        t,
        h,
        E,
        F,
        i?.currency_code
      );
      const C = Qn(i);
      nr(
        t,
        h,
        w,
        A,
        {
          currency: i?.currency_code,
          baseline: C,
          markers: I
        }
      );
    };
    l.addEventListener("click", (h) => {
      const b = h.target?.closest(".security-range-button");
      if (!b || b.disabled)
        return;
      const { range: _ } = b.dataset;
      !_ || !ia.includes(_) || y(_);
    });
  }, 0);
}
function Fs(e) {
  const { root: t, hass: n, panelConfig: r, tickerSymbol: a } = e;
  let i = null, o = !1;
  const s = async () => {
    try {
      i = await fi(n, r);
    } catch (c) {
      o = !0, console.warn("News-Prompt: Prefetch fehlgeschlagen", c);
    }
  };
  s(), setTimeout(() => {
    const c = t.querySelector(".news-prompt-button");
    if (!c)
      return;
    const l = (d) => {
      const p = (i?.placeholder || Gn).trim() || Gn, f = (i?.prompt_template || "").trim(), g = (i?.link || "").trim() || ts;
      return { body: f ? f.includes(p) ? f.split(p).join(d) : `${f}

Ticker: ${d}` : `Ticker: ${d}`, link: g };
    }, u = async () => {
      const d = (c.dataset.symbol || a || "").trim();
      if (!d) {
        console.warn("News-Prompt: Kein Ticker verfügbar");
        return;
      }
      if (c.classList.contains("loading"))
        return;
      c.disabled = !0, c.classList.add("loading");
      const p = c.textContent;
      try {
        const { body: f, link: g } = l(d), m = await _s(f);
        m ? c.textContent = "✅ Copied! Opening..." : console.warn("News-Prompt: Clipboard unavailable – prompt could not be copied"), m && await new Promise((y) => setTimeout(y, 800)), vs(g), !i && !o && s();
      } catch (f) {
        console.error("News-Prompt: Kopiervorgang fehlgeschlagen", f);
      } finally {
        c.classList.remove("loading"), c.disabled = !1, p && setTimeout(() => {
          c.textContent = p;
        }, 2e3);
      }
    };
    c.addEventListener("click", () => {
      u();
    });
  }, 0);
}
async function $s(e, t, n, r) {
  if (!r)
    return console.error("renderSecurityDetail: securityUuid fehlt"), '<div class="card"><h2>Fehler</h2><p>Kein Wertpapier angegeben.</p></div>';
  const a = as(r);
  let i = null, o = null;
  try {
    const C = await di(
      t,
      n,
      r
    ), x = C.snapshot;
    i = x && typeof x == "object" ? x : C;
  } catch (C) {
    console.error("renderSecurityDetail: Snapshot konnte nicht geladen werden", C), o = pa(C);
  }
  const s = i || a, c = !!(a && !i), l = (s?.source ?? "") === "cache";
  r && rs(r, s ?? null);
  const u = s && (c || l) ? ns({ fallbackUsed: c, flaggedAsCache: l }) : "", d = s?.name || "Wertpapierdetails", p = Et(d, "", { includeMeta: !1 });
  p.classList.add("security-detail-header");
  const f = Es(s);
  if (o)
    return `
      ${p.outerHTML}
      ${f}
      ${u}
      <div class="card error-card">
        <h2>Fehler beim Laden</h2>
        <p>${o}</p>
      </div>
    `;
  const g = da(r), m = sa(r), y = ca(r);
  let h = m.has(g) ? m.get(g) ?? null : null, b = { status: "empty" }, _ = y.has(g) ? y.get(g) ?? null : null;
  if (Array.isArray(h))
    b = h.length ? { status: "loaded" } : { status: "empty" };
  else {
    h = [];
    try {
      const C = mt(g), x = await st(
        t,
        n,
        r,
        C
      );
      h = Qt(x.prices), _ = bt(
        x.transactions,
        s?.currency_code,
        s
      ), m.set(g, h), _ = Array.isArray(_) ? _ : [], y.set(g, _), b = h.length ? { status: "loaded" } : { status: "empty" };
    } catch (C) {
      console.error(
        "renderSecurityDetail: Historie konnte nicht geladen werden",
        C
      ), b = {
        status: "error",
        message: ya(C) || "Die historischen Daten konnten aufgrund eines Fehlers nicht geladen werden."
      };
    }
  }
  if (!Array.isArray(_))
    try {
      const C = mt(g), x = await st(
        t,
        n,
        r,
        C
      ), q = Qt(x.prices);
      _ = bt(
        x.transactions,
        s?.currency_code,
        s
      ), m.set(g, q), _ = Array.isArray(_) ? _ : [], y.set(g, _), h = q, b = h.length ? { status: "loaded" } : { status: "empty" };
    } catch (C) {
      console.error(
        "renderSecurityDetail: Transaktionsmarker konnten nicht geladen werden",
        C
      ), _ = [];
    }
  const v = en(
    h,
    s
  );
  b.status !== "error" && (b = v.length ? { status: "loaded" } : { status: "empty" });
  const w = ys(s, r), A = bs(w), P = Cn(s), { priceChange: E, priceChangePct: F } = ga(
    v,
    P
  ), I = ha(
    g,
    E,
    F,
    s?.currency_code
  );
  return ks({
    root: e,
    hass: t,
    panelConfig: n,
    securityUuid: r,
    snapshot: s,
    initialRange: g,
    initialHistory: h,
    initialHistoryState: b
  }), Fs({
    root: e,
    hass: t,
    panelConfig: n,
    tickerSymbol: w
  }), `
    ${p.outerHTML}
    ${f}
    ${u}
    ${A}
    ${I}
    ${hs(g)}
    <div class="card security-detail-placeholder">
      <h2>Historie</h2>
      ${ma(g, b)}
    </div>
  `;
}
function Ts(e) {
  const { setSecurityDetailTabFactory: t } = e;
  if (typeof t != "function") {
    console.error("registerSecurityDetailTab: Ungültige Factory-Funktion übergeben");
    return;
  }
  t((n) => ({
    title: "Wertpapier",
    render: (r, a, i) => $s(r, a, i, n),
    cleanup: () => {
      cs(n);
    }
  }));
}
class Ls {
  element;
  range;
  options;
  // State
  isOpen = !1;
  viewDate;
  // The date determining which month is shown in the left calendar
  tempRange;
  // Range currently being selected in the picker
  previousFocus = null;
  // Element that had focus before opening
  // Elements
  triggerEl;
  popoverEl;
  calendarsContainer;
  startInput;
  endInput;
  constructor(t, n) {
    this.element = t, this.options = {
      presets: [
        { label: "Letzte 7 Tage", days: 7 },
        { label: "Letzte 30 Tage", days: 30 },
        { label: "Diesen Monat", days: 0 },
        // Special handling
        { label: "Letzten Monat", days: -1 },
        // Special handling
        { label: "Dieses Jahr", days: -365 }
        // Special handling
      ],
      ...n
    };
    const r = /* @__PURE__ */ new Date();
    this.range = n.initialRange || {
      start: new Date(r.getFullYear(), r.getMonth(), r.getDate() - 29),
      end: r
    }, this.tempRange = { ...this.range }, this.viewDate = new Date(this.range.end.getFullYear(), this.range.end.getMonth() - 1, 1), this.render(), this.bindEvents(), this.updateTrigger();
  }
  formatDisplayDate(t) {
    return t.toLocaleDateString("de-DE", { month: "short", day: "numeric", year: "numeric" });
  }
  render() {
    this.element.classList.add("date-range-picker"), this.triggerEl = document.createElement("div"), this.triggerEl.className = "drp-trigger", this.triggerEl.setAttribute("role", "button"), this.triggerEl.setAttribute("aria-expanded", "false"), this.triggerEl.setAttribute("aria-haspopup", "dialog"), this.triggerEl.setAttribute("tabindex", "0"), this.triggerEl.innerHTML = `
      <svg class="drp-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line>
        <line x1="8" y1="2" x2="8" y2="6"></line>
        <line x1="3" y1="10" x2="21" y2="10"></line>
      </svg>
      <span class="drp-label"></span>
    `, this.element.appendChild(this.triggerEl), this.popoverEl = document.createElement("div"), this.popoverEl.className = "drp-popover", this.popoverEl.setAttribute("role", "dialog"), this.popoverEl.setAttribute("aria-modal", "true"), this.popoverEl.setAttribute("aria-label", "Zeitraum wählen");
    const t = document.createElement("div");
    t.className = "drp-sidebar", this.options.presets?.forEach((l) => {
      const u = document.createElement("button");
      u.className = "drp-preset-btn", u.textContent = l.label, u.setAttribute("aria-pressed", "false"), u.addEventListener("click", () => {
        this.selectPreset(l);
      }), t.appendChild(u);
    }), this.popoverEl.appendChild(t);
    const n = document.createElement("div");
    n.className = "drp-main", this.calendarsContainer = document.createElement("div"), this.calendarsContainer.className = "drp-calendars", n.appendChild(this.calendarsContainer);
    const r = document.createElement("div");
    r.className = "drp-footer";
    const a = document.createElement("div");
    a.className = "drp-inputs", this.startInput = document.createElement("input"), this.startInput.type = "text", this.startInput.className = "drp-date-input", this.startInput.readOnly = !0, this.startInput.setAttribute("aria-label", "Startdatum"), this.endInput = document.createElement("input"), this.endInput.type = "text", this.endInput.className = "drp-date-input", this.endInput.readOnly = !0, this.endInput.setAttribute("aria-label", "Enddatum");
    const i = document.createElement("span");
    i.textContent = "–", i.setAttribute("aria-hidden", "true"), a.appendChild(this.startInput), a.appendChild(i), a.appendChild(this.endInput);
    const o = document.createElement("div");
    o.className = "drp-actions";
    const s = document.createElement("button");
    s.className = "drp-btn drp-btn-cancel", s.textContent = "Abbrechen", s.addEventListener("click", (l) => {
      l.stopPropagation(), this.close();
    });
    const c = document.createElement("button");
    c.className = "drp-btn drp-btn-apply", c.textContent = "Übernehmen", c.addEventListener("click", (l) => {
      l.stopPropagation(), this.apply();
    }), o.appendChild(s), o.appendChild(c), r.appendChild(a), r.appendChild(o), n.appendChild(r), this.popoverEl.appendChild(n), this.element.appendChild(this.popoverEl);
  }
  bindEvents() {
    const t = (n) => {
      n.stopPropagation(), this.toggle();
    };
    this.triggerEl.addEventListener("click", t), this.triggerEl.addEventListener("keydown", (n) => {
      (n.key === "Enter" || n.key === " ") && (n.preventDefault(), t(n));
    }), document.addEventListener("click", (n) => {
      const r = n.composedPath();
      this.isOpen && !r.includes(this.element) && this.close();
    }), this.popoverEl.addEventListener("click", (n) => {
      n.stopPropagation();
    }), this.popoverEl.addEventListener("keydown", (n) => {
      if (n.key === "Escape") {
        n.stopPropagation(), this.close();
        return;
      }
      if (n.key === "Tab") {
        const r = this.popoverEl.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ), a = r[0], i = r[r.length - 1];
        n.shiftKey ? document.activeElement === a && (n.preventDefault(), i.focus()) : document.activeElement === i && (n.preventDefault(), a.focus());
      }
    });
  }
  toggle() {
    this.isOpen ? this.close() : this.open();
  }
  open() {
    this.isOpen = !0, this.previousFocus = document.activeElement, this.popoverEl.classList.add("open"), this.popoverEl.style.display = "flex", this.triggerEl.classList.add("active"), this.triggerEl.setAttribute("aria-expanded", "true"), this.tempRange = { ...this.range }, this.viewDate = new Date(this.range.end.getFullYear(), this.range.end.getMonth() - 1, 1), this.renderCalendars(), this.updateInputs(), this.updatePresetState(null), requestAnimationFrame(() => {
      const t = this.popoverEl.querySelector(
        'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      t && t.focus();
    });
  }
  close() {
    this.isOpen = !1, this.popoverEl.classList.remove("open"), this.popoverEl.style.display = "", this.triggerEl.classList.remove("active"), this.triggerEl.setAttribute("aria-expanded", "false"), this.previousFocus && document.body.contains(this.previousFocus) && this.previousFocus.focus(), this.previousFocus = null;
  }
  apply() {
    this.range = { ...this.tempRange }, this.updateTrigger(), this.close(), this.options.onChange && this.options.onChange(this.range);
  }
  updateTrigger() {
    const t = this.triggerEl.querySelector(".drp-label");
    t && (t.textContent = `${this.formatDisplayDate(this.range.start)} – ${this.formatDisplayDate(this.range.end)}`);
  }
  updateInputs() {
    this.startInput.value = this.formatDisplayDate(this.tempRange.start), this.endInput.value = this.formatDisplayDate(this.tempRange.end);
  }
  selectPreset(t) {
    const n = /* @__PURE__ */ new Date();
    n.setHours(0, 0, 0, 0);
    let r = new Date(n);
    t.label === "Diesen Monat" ? r = new Date(n.getFullYear(), n.getMonth(), 1) : t.label === "Letzten Monat" ? (r = new Date(n.getFullYear(), n.getMonth() - 1, 1), n.setDate(0)) : t.label === "Dieses Jahr" ? r = new Date(n.getFullYear(), 0, 1) : r.setDate(n.getDate() - (t.days - 1)), this.tempRange = { start: r, end: n }, this.viewDate = new Date(n.getFullYear(), n.getMonth() - 1, 1), this.renderCalendars(), this.updateInputs(), this.updatePresetState(t.label);
  }
  updatePresetState(t) {
    this.popoverEl.querySelectorAll(".drp-preset-btn").forEach((n) => {
      n.textContent === t ? (n.classList.add("active"), n.setAttribute("aria-pressed", "true")) : (n.classList.remove("active"), n.setAttribute("aria-pressed", "false"));
    });
  }
  renderCalendars() {
    this.calendarsContainer.innerHTML = "", this.renderCalendar(this.viewDate, "left");
    const t = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() + 1, 1);
    this.renderCalendar(t, "right");
  }
  renderCalendar(t, n) {
    const r = t.getFullYear(), a = t.getMonth(), i = document.createElement("div");
    i.className = "drp-calendar";
    const o = document.createElement("div");
    o.className = "drp-calendar-header";
    const s = document.createElement("button");
    s.className = "drp-nav-btn", s.innerHTML = `
            <svg viewBox="0 0 24 24">
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"></path>
            </svg>
        `, s.setAttribute("aria-label", "Vorheriger Monat"), n === "left" ? s.addEventListener("click", (m) => {
      m.stopPropagation(), this.viewDate.setMonth(this.viewDate.getMonth() - 1), this.renderCalendars();
    }) : s.style.visibility = "hidden";
    const c = document.createElement("span");
    c.className = "drp-month-label", c.textContent = t.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
    const l = document.createElement("button");
    l.className = "drp-nav-btn", l.innerHTML = `
            <svg viewBox="0 0 24 24">
                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"></path>
            </svg>
        `, l.setAttribute("aria-label", "Nächster Monat"), n === "right" ? l.addEventListener("click", (m) => {
      m.stopPropagation(), this.viewDate.setMonth(this.viewDate.getMonth() + 1), this.renderCalendars();
    }) : l.style.visibility = "hidden", o.appendChild(s), o.appendChild(c), o.appendChild(l), i.appendChild(o);
    const u = document.createElement("div");
    u.className = "drp-days-header", ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].forEach((m) => {
      const y = document.createElement("span");
      y.className = "drp-day-name", y.textContent = m, u.appendChild(y);
    }), i.appendChild(u);
    const d = document.createElement("div");
    d.className = "drp-days-grid";
    const p = new Date(r, a, 1), f = new Date(r, a + 1, 0);
    let g = p.getDay() - 1;
    g < 0 && (g = 6);
    for (let m = 0; m < g; m++) {
      const y = document.createElement("div");
      y.className = "drp-day empty", d.appendChild(y);
    }
    for (let m = 1; m <= f.getDate(); m++) {
      const y = new Date(r, a, m), h = document.createElement("div");
      h.className = "drp-day", h.textContent = m.toString(), h.setAttribute("role", "button"), h.tabIndex = 0;
      const b = y.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
      h.setAttribute("aria-label", b), this.applyDayClasses(h, y), h.addEventListener("click", (_) => {
        _.stopPropagation(), this.handleDayClick(y);
      }), h.addEventListener("keydown", (_) => {
        (_.key === "Enter" || _.key === " ") && (_.preventDefault(), _.stopPropagation(), this.handleDayClick(y));
      }), h.addEventListener("mouseenter", () => {
        this.handleDayHover(y);
      }), d.appendChild(h);
    }
    i.appendChild(d), this.calendarsContainer.appendChild(i);
  }
  applyDayClasses(t, n) {
    const r = n.getTime(), a = this.tempRange.start.getTime(), i = this.tempRange.end.getTime();
    r === a && t.classList.add("range-start"), r === i && t.classList.add("range-end"), r > a && r < i && t.classList.add("in-range");
    const o = /* @__PURE__ */ new Date();
    n.getDate() === o.getDate() && n.getMonth() === o.getMonth() && n.getFullYear() === o.getFullYear() && (t.style.fontWeight = "bold");
  }
  handleDayClick(t) {
    const n = t.getTime(), r = this.tempRange.start.getTime(), a = this.tempRange.end.getTime();
    r !== a ? this.tempRange = { start: t, end: t } : n < r ? this.tempRange = { start: t, end: t } : this.tempRange = { start: this.tempRange.start, end: t }, this.updateInputs(), this.renderCalendars(), this.updatePresetState(null);
  }
  handleDayHover(t) {
  }
}
let be = {
  status: "idle",
  error: null,
  data: null,
  selection: null,
  lastUpdated: null
}, rr = null;
function Rs(e) {
  if (typeof e == "string")
    return e.trim() || "Unbekannter Fehler";
  if (e instanceof Error)
    return e.message.trim() || e.name;
  try {
    return JSON.stringify(e) || String(e);
  } catch {
    return String(e);
  }
}
function tn(e) {
  return typeof e != "string" ? null : e.trim() || null;
}
function Ms(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e, n = tn(t.start), r = tn(t.end);
  return n && r ? { start: n, end: r } : null;
}
function ar(e) {
  if (!Array.isArray(e))
    return [];
  const t = e.map((r) => typeof r == "string" ? r.trim() : "").filter((r) => r.length > 0), n = Array.from(new Set(t));
  return n.sort(), n;
}
function Hs(e) {
  const t = tn(e.date ?? null), n = Ms(e.range ?? null);
  if (t && n)
    throw new Error("loadDailyWealth: date und range können nicht gleichzeitig gesetzt werden");
  if (!t && !n)
    throw new Error("loadDailyWealth: entweder date oder range erforderlich");
  const r = e.scopes ?? {}, a = ar(r.accounts), i = ar(r.portfolios), o = {};
  t && (o.date = t), n && (o.range = n);
  const s = e.include_slices ?? e.includeSlices ?? void 0, c = e.include_scopes ?? e.includeScopes ?? void 0;
  return s !== void 0 && (o.includeSlices = s), c !== void 0 && (o.includeScopes = c), (a.length || i.length) && (o.scopes = {}, a.length && (o.scopes.accounts = a), i.length && (o.scopes.portfolios = i)), typeof e.limit == "number" && Number.isFinite(e.limit) && e.limit > 0 && (o.limit = e.limit), typeof e.offset == "number" && Number.isFinite(e.offset) && e.offset >= 0 && (o.offset = e.offset), o;
}
function Is(e) {
  const t = e.date ?? "", n = e.range ? `${e.range.start}..${e.range.end}` : "", r = e.scopes?.accounts ?? [], a = e.scopes?.portfolios ?? [], i = JSON.stringify({ accounts: r, portfolios: a }), o = e.includeSlices ? "1" : "0", s = e.includeScopes ? "1" : "0", c = e.limit ?? "", l = e.offset ?? "";
  return [t, n, i, o, s, c, l].join("::");
}
function zs(e) {
  return { ...e };
}
function ir(e) {
  return { ...e };
}
function Vs(e) {
  if (e)
    return {
      accounts: e.accounts.map(ir),
      portfolios: e.portfolios.map(ir)
    };
}
function qs(e) {
  if (!e)
    return null;
  const t = Vs(e.slices);
  return {
    range: { ...e.range },
    records: e.records.map(zs),
    ...t ? { slices: t } : {}
  };
}
function Us(e) {
  if (!e)
    return null;
  const t = {};
  return e.date && (t.date = e.date), e.range && (t.range = { ...e.range }), e.scopes && (t.scopes = {
    ...e.scopes.accounts ? { accounts: [...e.scopes.accounts] } : {},
    ...e.scopes.portfolios ? { portfolios: [...e.scopes.portfolios] } : {}
  }), e.includeSlices !== void 0 && (t.includeSlices = e.includeSlices), e.includeScopes !== void 0 && (t.includeScopes = e.includeScopes), e.limit !== void 0 && (t.limit = e.limit), e.offset !== void 0 && (t.offset = e.offset), t;
}
function qt(e) {
  be = {
    ...be,
    ...e
  };
}
function nn() {
  return {
    status: be.status,
    error: be.error,
    lastUpdated: be.lastUpdated,
    data: qs(be.data),
    selection: Us(be.selection)
  };
}
async function Os(e, t, n = {}) {
  const r = Hs(n), a = Is(r);
  if (be.data && !n.force && rr === a)
    return nn();
  qt({
    status: "loading",
    error: null,
    selection: r
  });
  try {
    const i = await gi(e, t, r);
    rr = a, qt({
      status: "loaded",
      error: null,
      data: i,
      selection: r,
      lastUpdated: Date.now()
    });
  } catch (i) {
    qt({
      status: "error",
      error: Rs(i),
      selection: r,
      lastUpdated: Date.now()
    });
  }
  return nn();
}
const Bs = 30;
let ba = null, rn = null;
const pe = /* @__PURE__ */ new Set(), Ws = [
  "#1976d2",
  "#c2185b",
  "#7b1fa2",
  "#00796b",
  "#ef6c00",
  "#5d4037",
  "#512da8",
  "#0097a7"
];
function _t(e) {
  const t = e.getUTCFullYear(), n = String(e.getUTCMonth() + 1).padStart(2, "0"), r = String(e.getUTCDate()).padStart(2, "0");
  return `${String(t)}-${n}-${r}`;
}
function Ys() {
  const e = /* @__PURE__ */ new Date(), t = new Date(e);
  return t.setUTCDate(e.getUTCDate() - (Bs - 1)), {
    range: {
      start: _t(t),
      end: _t(e)
    },
    includeSlices: !0,
    includeScopes: !0
  };
}
function Ks(e) {
  if (!e.length)
    return "";
  const t = e.some((i) => i.fx_coverage_ratio != null && i.fx_coverage_ratio < 1), n = e.some((i) => i.price_coverage_ratio != null && i.price_coverage_ratio < 1), r = e.some((i) => i.stale_price), a = [];
  return t && a.push('<span class="meta-badge meta-badge--warning" title="Wechselkurse fehlen teilweise">FX-Abdeckung</span>'), n && a.push('<span class="meta-badge meta-badge--warning" title="Preisdaten unvollständig">Preisabdeckung</span>'), r && a.push('<span class="meta-badge meta-badge--neutral" title="Letzte Kurse sind veraltet">Stale Kurse</span>'), a.length ? `<span class="meta-badges">${a.join("")}</span>` : '<span class="meta-badge meta-badge--positive">Volle Abdeckung</span>';
}
function _a(e) {
  return `${re(e)}&nbsp;€`;
}
function ae(e, t) {
  return e.reduce((n, r) => {
    const a = r[t];
    return typeof a == "number" && Number.isFinite(a) ? n + a : n;
  }, 0);
}
function tt(e, t, n = "") {
  const r = e.querySelector("#analyse-status");
  r && (r.dataset.state = t, t === "loading" ? r.textContent = "Lade Vermögensdaten …" : t === "error" ? r.textContent = n || "Daten konnten nicht geladen werden." : r.textContent = "");
}
function or(e, t, n) {
  const r = e.querySelector("#analyse-total-wealth"), a = e.querySelector("#analyse-coverage"), i = e.querySelector("#analyse-selection-label");
  if (!r || !a || !i)
    return;
  if (i.textContent = t, !n.length) {
    r.innerHTML = "—", a.innerHTML = "";
    return;
  }
  const o = n[n.length - 1];
  r.innerHTML = _a(o.total_wealth_eur), a.innerHTML = Ks(n);
}
function sr(e, t) {
  const n = e.querySelector(".analyse-metrics-grid");
  if (!n) return;
  if (!t.length) {
    n.innerHTML = '<div class="metrics-empty">Keine Daten verfügbar</div>';
    return;
  }
  const r = Qs(t);
  if (!r) return;
  const a = (o, s, c = "", l = "") => `
    <div class="metric-row ${c}" ${l ? `id="${l}"` : ""}>
      <span class="metric-label">${o}</span>
      <span class="metric-value">${typeof s == "number" ? _a(s) : s}</span>
    </div>`, i = `
    <div class="metrics-section">
      <h3>Performance-Berechnung</h3>
      ${a("Anfangswert", r.startValue, "", "perf-startValue")}
      ${a("Kurserfolge (Gesamt)", r.marketGain, "sub-header")}
      ${a("&nbsp;&nbsp;↳ Realisiert", r.realizedGains, "indent")}
      ${a("&nbsp;&nbsp;↳ Nicht realisiert", r.unrealizedPriceGains, "indent")}
      ${a("Dividenden", r.dividends)}
      ${a("Zinsen", r.interest)}
      ${a("Gebühren", r.fees)}
      ${a("Steuern", r.taxes)}
      ${a("FX-Veränderung", r.fxGains)}
      ${a("Performanceneutrale Bew.", r.neutral + r.netTransfers)}
      ${a("Endwert", r.endValue, "highlight", "perf-endValue")}
    </div>
  `;
  n.innerHTML = i;
}
function vt(e, t) {
  return !e || !t ? null : `${e}:${t}`;
}
function js(e) {
  if (!e) {
    pe.clear();
    return;
  }
  const t = /* @__PURE__ */ new Set(), n = (r, a) => {
    r.forEach((i) => {
      const o = vt(a, i.scope_id);
      o && t.add(o);
    });
  };
  n(e.accounts, "account"), n(e.portfolios, "portfolio"), pe.size === 0 ? t.forEach((r) => pe.add(r)) : Array.from(pe).forEach((r) => {
    t.has(r) || pe.delete(r);
  });
}
function Gs(e, t) {
  const n = e.querySelector(".analyse-scope-filters");
  if (!n)
    return;
  const r = n.cloneNode(!1);
  n.replaceWith(r), r.innerHTML = "";
  const a = t ? t.accounts.length > 0 : !1, i = t ? t.portfolios.length > 0 : !1;
  if (!t || !a && !i) {
    r.innerHTML = '<p class="table-note" role="note"><span class="table-note__icon" aria-hidden="true">ℹ️</span><span>Keine Slices verfügbar.</span></p>';
    return;
  }
  const o = (s, c, l) => {
    const u = /* @__PURE__ */ new Map();
    if (c.forEach((p) => {
      const f = vt(l, p.scope_id);
      f && !u.has(f) && u.set(f, p);
    }), u.size === 0)
      return "";
    const d = Array.from(u.values()).map((p) => {
      const f = vt(l, p.scope_id);
      if (!f)
        return "";
      const g = pe.has(f) ? "checked" : "", m = k(p.scope_name ?? p.scope_id);
      return `
          <label class="scope-option">
            <input type="checkbox" data-scope-key="${ce(f)}" ${g}>
            <span>${m}</span>
          </label>
        `;
    }).join("");
    return `<div class="scope-group"><div class="scope-title">${s}</div>${d}</div>`;
  };
  r.innerHTML = `
    ${o("Konten", t.accounts, "account")}
    ${o("Depots", t.portfolios, "portfolio")}
  `, r.addEventListener("change", (s) => {
    const c = s.target?.closest('input[type="checkbox"][data-scope-key]');
    if (!c || !c.dataset.scopeKey)
      return;
    const { scopeKey: l } = c.dataset;
    if (!l)
      return;
    c.checked ? pe.add(l) : pe.delete(l);
    const u = e.closest("#analyse-chart-card");
    u && rn && va(u, rn);
  });
}
function Xs(e) {
  if (typeof e == "number")
    return Number.isFinite(e) ? e : null;
  const t = Date.parse(e);
  return Number.isFinite(t) ? t : null;
}
function Zs(e) {
  const t = Array.from(Ws), n = {
    key: "total",
    label: "Gesamtvermögen",
    color: "#2c3e50",
    points: e.records.map((o) => ({
      date: o.date,
      value: o.total_wealth_eur
    }))
  }, r = [], a = /* @__PURE__ */ new Map(), i = (o, s) => {
    o.forEach((c) => {
      const l = vt(s, c.scope_id);
      l && (a.has(l) || a.set(l, /* @__PURE__ */ new Map()), a.get(l)?.set(c.date, c));
    });
  };
  return e.slices && (i(e.slices.accounts, "account"), i(e.slices.portfolios, "portfolio")), a.forEach((o, s) => {
    if (!pe.has(s))
      return;
    const c = t.shift() ?? "#607d8b", l = s.startsWith("account:"), u = s.split(":")[1] ?? "", p = `${l ? "Konto" : "Depot"} ${u}`.trim(), f = o.values().next(), m = (f.done ? void 0 : f.value)?.scope_name ?? p;
    r.push({
      key: s,
      label: m,
      color: c,
      points: e.records.map((y) => {
        const h = o.get(y.date);
        return !h || !Number.isFinite(h.total_wealth_eur) ? null : { date: y.date, value: h.total_wealth_eur };
      }).filter((y) => !!y)
    });
  }), [n, ...r];
}
function Js(e, t) {
  const n = e.__chartState, r = e.querySelector("svg");
  if (!n || !n.range || !n.margin || !r)
    return;
  const { range: a, margin: i } = n;
  r.querySelectorAll(".analyse-slice-series").forEach((o) => {
    o.remove();
  }), t.filter((o) => o.key !== "total").forEach((o) => {
    const s = o.points.map((u, d) => {
      const p = Xs(u.date);
      if (p == null || !Number.isFinite(u.value))
        return null;
      const f = a.maxX === a.minX ? 0.5 : (p - a.minX) / (a.maxX - a.minX), g = a.maxY === a.minY ? 0.5 : (u.value - a.minY) / (a.maxY - a.minY), m = i.left + f * a.boundedWidth, y = i.top + (1 - g) * a.boundedHeight;
      return `${d === 0 ? "M" : "L"}${String(m)},${String(y)}`;
    }).filter(Boolean).join(" ");
    if (!s)
      return;
    const c = document.createElementNS("http://www.w3.org/2000/svg", "g");
    c.setAttribute("class", "analyse-slice-series");
    const l = document.createElementNS("http://www.w3.org/2000/svg", "path");
    l.setAttribute("d", s), l.setAttribute("fill", "none"), l.setAttribute("stroke", o.color), l.setAttribute("stroke-width", "2"), l.setAttribute("stroke-linejoin", "round"), l.setAttribute("stroke-linecap", "round"), c.appendChild(l), r.appendChild(c);
  });
}
function va(e, t) {
  const n = e.querySelector(".line-chart-container");
  if (!n)
    return;
  const r = Zs(t), a = r[0];
  if (!a.points.length) {
    n.innerHTML = `
      <div class="history-placeholder" data-state="empty">
        <p>Keine Chart-Daten verfügbar.</p>
      </div>
    `;
    return;
  }
  const i = {
    series: a.points,
    xAccessor: (c) => c.date,
    yAccessor: (c) => c.value,
    xFormatter: (c) => {
      const l = new Date(c);
      return Number.isFinite(l.getTime()) ? l.toLocaleDateString("de-DE") : "";
    },
    yFormatter: (c) => re(c),
    color: a.color,
    areaColor: "rgba(44, 62, 80, 0.12)"
  }, o = n;
  let s = o;
  !o.__chartState || !n.querySelector("svg") ? (n.innerHTML = "", s = aa(n, i)) : (Sn(o, i), s = o), s && Js(s, r);
}
function Qs(e) {
  if (!e.length)
    return null;
  const t = e[0]?.total_wealth_eur ?? 0, n = e[e.length - 1]?.total_wealth_eur ?? 0, r = ae(e, "dividends_eur"), a = ae(e, "interest_eur"), i = r + a, o = -Math.abs(ae(e, "fees_eur")), s = -Math.abs(ae(e, "taxes_eur")), c = ae(e, "inbound_transfers_eur") - ae(e, "outbound_transfers_eur"), l = ae(e, "performance_neutral_movements"), u = n - t - i - o - s - c - l, d = ae(e, "realized_gains_eur"), p = ae(e, "unrealized_price_gains_eur"), f = ae(e, "fx_gains_eur");
  return {
    startValue: t,
    endValue: n,
    marketGain: u,
    realizedGains: d,
    unrealizedPriceGains: p,
    fxGains: f,
    dividends: r,
    interest: a,
    ertraege: i,
    fees: o,
    taxes: s,
    netTransfers: c,
    neutral: l
  };
}
async function cr(e, t, n, r, a) {
  tt(e, "loading");
  const i = await Os(n, r, a);
  if (i.status === "error") {
    if (tt(e, "error", i.error ?? void 0), t) {
      const c = t.querySelector(".line-chart-container");
      c && c.replaceChildren();
    }
    return;
  }
  const o = i.data;
  if (!o || !Array.isArray(o.records) || o.records.length === 0) {
    const c = a.range?.start ?? "?", l = a.range?.end ?? "?", u = `Zeitraum: ${c} – ${l}`;
    if (or(e, u, []), sr(e, []), tt(e, "loaded", "Keine Daten für den gewählten Zeitraum."), t) {
      const d = t.querySelector(".line-chart-container");
      d && d.replaceChildren();
    }
    return;
  }
  ba = a, rn = o, js(o.slices);
  const s = a.range ? `Zeitraum: ${a.range.start} – ${a.range.end}` : a.date ? `Tag: ${a.date}` : "";
  or(e, s, o.records), sr(e, o.records), t && (Gs(t, o.slices), va(t, o)), tt(e, "loaded");
}
function ec(e, t, n, r) {
  const a = e.querySelector("#analyse-date-picker-container"), i = ba ?? nn().selection ?? Ys();
  let o;
  if (i.range)
    o = {
      start: new Date(i.range.start),
      end: new Date(i.range.end)
    };
  else if (i.date) {
    const s = new Date(i.date);
    o = { start: s, end: s };
  }
  a && new Ls(a, {
    initialRange: o,
    onChange: (s) => {
      const c = {
        range: {
          start: _t(s.start),
          end: _t(s.end)
        },
        includeSlices: !0,
        includeScopes: !0
      };
      cr(e, t, n, r, c);
    }
  }), cr(e, t, n, r, i);
}
function tc(e, t, n) {
  const c = `
    
    <style>
      .analyse-metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
        margin-top: 1.5rem;
        padding-top: 1.5rem;
        border-top: 1px solid var(--divider-color, #e0e0e0);
      }
      .metrics-section {
        display: grid;
        grid-template-columns: max-content max-content;
        justify-content: start;
        align-items: center;
        gap: 0.25rem 2rem;
      }
      .metrics-section h3 {
        grid-column: 1 / -1;
        margin: 0 0 0.75rem 0;
        font-size: 0.9rem;
        font-weight: 500;
        text-transform: uppercase;
        color: var(--secondary-text-color, #727272);
        letter-spacing: 0.05em;
      }
      .metric-row {
        display: contents;
      }
      .metric-label {
        color: var(--primary-text-color, #212121);
      }
      .metric-value {
        font-weight: 500;
        font-family: var(--code-font-family, monospace);
        text-align: right;
      }
      .metric-row.highlight .metric-label,
      .metric-row.highlight .metric-value {
        font-weight: 600;
        color: var(--primary-color, #03a9f4);
      }
      .metric-row.highlight .metric-value {
        font-weight: 700;
      }
      .metrics-empty {
        grid-column: 1 / -1;
        text-align: center;
        color: var(--secondary-text-color);
        padding: 2rem;
        font-style: italic;
      }
      @media (max-width: 600px) {
        .analyse-metrics-grid {
          grid-template-columns: 1fr;
          gap: 1rem;
        }
      }
    </style>
  
    ${Et("Zeitmaschine", `
    <div class="header-meta-row">
      <span>Vermögensverlauf &amp; Cashflows</span>
    </div>
  `).outerHTML}
    
    <div class="card" id="analyse-range-card" data-section="range">
      <h2>Zeitraum &amp; Kennzahlen</h2>
      <div class="analyse-range-form" role="group" aria-label="Zeitraum wählen">
        <div id="analyse-date-picker-container"></div>
      </div>

      <div class="analyse-headline">
        <div class="headline-value" id="analyse-total-wealth">—</div>
        <div class="headline-meta">
          <span id="analyse-selection-label" class="selection-label"></span>
          <span id="analyse-coverage" class="coverage"></span>
        </div>
      </div>

      <div class="analyse-metrics-grid">
        <!-- Filled via renderMetrics -->
      </div>

      <div class="analyse-status" id="analyse-status" data-state="idle" role="status" aria-live="polite"></div>
    </div>
  
    
    <div class="card" id="analyse-chart-card" data-section="chart">
      <h2>Vermögensverlauf</h2>
      <div class="analyse-scope-filters" role="group" aria-label="Scopes auswählen"></div>
      <div class="line-chart-container" role="img" aria-label="Zeitreihen-Chart" aria-live="polite"></div>
      <p class="table-note" role="note" id="chart-note">
        <span class="table-note__icon" aria-hidden="true">ℹ️</span>
        <span>Gesamtvermögen wird immer dargestellt; wähle zusätzliche Konten/Depots für Vergleich.</span>
      </p>
    </div>
  
  `;
  return setTimeout(() => {
    if (!t)
      return;
    const l = e.querySelector("#analyse-range-card"), u = e.querySelector("#analyse-chart-card");
    l && ec(l, u, t, n);
  }, 0), c;
}
function ne(e, t = "EUR") {
  return e === null || typeof e > "u" ? "" : new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: t
  }).format(e);
}
function Sa(e) {
  return e === null || typeof e > "u" ? "" : new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(e);
}
function wa(e) {
  return e === null || typeof e > "u" ? "" : new Intl.NumberFormat("de-DE", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(e);
}
const lr = `
<style>
  .sort-stack {
    display: flex;
    flex-direction: column;
    gap: 4px;
    line-height: 1.2;
    padding: 4px 0;
  }
  .sort-item {
    cursor: pointer;
    white-space: nowrap;
    opacity: 0.7;
    transition: opacity 0.2s;
    display: inline-block;
  }
  .sort-item:hover {
    opacity: 1;
    text-decoration: underline;
  }
  .sort-item.sort-active {
    opacity: 1;
    font-weight: bold;
    color: var(--primary-color);
  }
  .sort-item.sort-active::after {
    content: " ↕"; /* Default neutral arrow */
    font-size: 0.8em;
    opacity: 0.5;
  }
  .sort-item.sort-active.dir-asc::after {
    content: " ▲";
    opacity: 1;
  }
  .sort-item.sort-active.dir-desc::after {
    content: " ▼";
    opacity: 1;
  }

  .simple-sort-header {
    cursor: pointer;
  }
  .simple-sort-header:hover {
    text-decoration: underline;
  }
  .simple-sort-header.sort-active {
     font-weight: bold;
     color: var(--primary-color);
  }
  .simple-sort-header.sort-active.dir-asc::after { content: " ▲"; }
  .simple-sort-header.sort-active.dir-desc::after { content: " ▼"; }


  .cell-stack {
    display: flex;
    flex-direction: column;
    gap: 4px;
    line-height: 1.2;
  }
  .val-top {
    display: block;
    font-weight: 500;
  }
  .val-bottom {
    display: block;
    color: var(--secondary-text-color);
    font-size: 0.9em;
  }

  /* Ensure trend colors carry over */
  .val-top .positive, .val-bottom .positive { color: var(--success-color); }
  .val-top .negative, .val-bottom .negative { color: var(--error-color); }
</style>
`;
function Ca(e, t) {
  return `<span class="${e > 0 ? "positive" : e < 0 ? "negative" : "neutral"}">${t}</span>`;
}
function Ut(e, t, n, r) {
  return `
    <div class="sort-stack">
        <span class="sort-item" data-sort-selector="${t}" role="button" tabindex="0">${e}</span>
        <span class="sort-item" data-sort-selector="${r}" role="button" tabindex="0">${n}</span>
    </div>
  `;
}
function Ot(e, t) {
  return `<span class="simple-sort-header" data-sort-key="${t}" role="button" tabindex="0">${e}</span>`;
}
function nc(e) {
  if (e.length === 0)
    return lr + '<div class="no-positions">Keine realisierten Gewinne/Verluste vorhanden.</div>';
  const t = [
    { key: "name", label: Ot("Wertpapier", "name") },
    // Combo 1: Sales / Current
    {
      key: "price_combo",
      label: Ut("Verkaufskurs", ".val-top", "Aktueller Kurs", ".val-bottom"),
      align: "right"
    },
    // Combo 2: Purchase / Sales Value
    {
      key: "value_combo",
      label: Ut("Einstandswert", ".val-top", "Verkaufswert", ".val-bottom"),
      align: "right"
    },
    // Combo 3: Gross / Net Result
    {
      key: "result_combo",
      label: Ut("Bruttoergebnis", ".val-top", "Nettoergebnis", ".val-bottom"),
      align: "right"
    },
    { key: "result_pct", label: Ot("Resultat", "result_pct"), align: "right" },
    { key: "current_holdings", label: Ot("Bestand", "current_holdings"), align: "right" }
  ], n = e.map((r) => {
    const a = r.current_price ?? 0, i = r.last_sell_price, o = a - i, s = o > 0 ? "positive" : o < 0 ? "negative" : "neutral";
    let c = k(r.name);
    r.lots.length > 1 ? c = `
        <span class="expand-icon" data-security-uuid="${r.security_uuid}">
          <ha-icon icon="mdi:chevron-right"></ha-icon>
        </span>
        <span data-val="${k(r.name)}">${c}</span>
      ` : c = `<span data-val="${k(r.name)}">${c}</span>`;
    const l = Math.abs(r.current_holdings) < 1e-3, u = (d, p, f, g) => `
      <div class="cell-stack">
        <span class="val-top" data-val="${String(d)}">${p}</span>
        <span class="val-bottom" data-val="${String(f)}">${g}</span>
      </div>
    `;
    return {
      _uuid: r.security_uuid,
      _lots: r.lots,
      name: c,
      price_combo: u(
        r.last_sell_price_native ?? r.last_sell_price,
        ne(r.last_sell_price_native ?? r.last_sell_price, r.currency_code),
        r.current_price ?? 0,
        `<span class="trend--${s}">${ne(r.current_price, r.currency_code)}</span>`
      ),
      value_combo: u(
        r.purchase_value_gross,
        ne(r.purchase_value_gross),
        r.sales_value_gross,
        ne(r.sales_value_gross)
      ),
      // Gross Result (Top) / Net Result (Bottom)
      result_combo: u(
        r.sales_value_gross - r.purchase_value_gross,
        // result_gross
        ne(r.sales_value_gross - r.purchase_value_gross),
        r.result_abs,
        ne(r.result_abs)
      ),
      result_pct: `<span data-val="${String(r.result_pct)}">${Ca(r.result_pct, wa(r.result_pct / 100))}</span>`,
      current_holdings: l ? '<span data-val="0"><ha-icon icon="mdi:lock-outline" title="Geschlossen" style="opacity: 0.6;"></ha-icon></span>' : `<span data-val="${String(r.current_holdings)}">${Sa(r.current_holdings)}</span>`
    };
  });
  return lr + Se(n, t, [], {
    sortable: !1,
    // We handle sorting manually
    rowAttributes: (r) => ({
      "data-security-uuid": r._uuid
    })
  });
}
function rc(e, t) {
  const n = e.map((r) => {
    const a = `
      <div class="lot-date-shares">
         <span class="lot-date">${r.date}</span>
         <span class="lot-shares">${Sa(r.shares)} Stk.</span>
      </div>
    `, i = (o, s, c, l) => `
      <div class="cell-stack">
        <span class="val-top" data-val="${String(o)}">${s}</span>
        <span class="val-bottom" data-val="${String(c)}">${l}</span>
      </div>
    `;
    return {
      name: a,
      price_combo: i(
        r.sell_price_native ?? r.sell_price,
        ne(r.sell_price_native ?? r.sell_price, t.currency_code),
        0,
        ""
        // No current price for lots
      ),
      value_combo: i(
        r.purchase_value_gross,
        ne(r.purchase_value_gross),
        r.sales_value_gross,
        ne(r.sales_value_gross)
      ),
      result_combo: i(
        r.sales_value_gross - r.purchase_value_gross,
        ne(r.sales_value_gross - r.purchase_value_gross),
        r.result_abs,
        ne(r.result_abs)
      ),
      result_pct: `<span data-val="${String(r.result_pct)}">${Ca(r.result_pct, wa(r.result_pct / 100))}</span>`,
      current_holdings: ""
    };
  });
  return Se(
    n,
    [
      { key: "name", label: "" },
      { key: "price_combo", label: "", align: "right" },
      { key: "value_combo", label: "", align: "right" },
      { key: "result_combo", label: "", align: "right" },
      { key: "result_pct", label: "", align: "right" },
      { key: "current_holdings", label: "", align: "right" }
    ],
    [],
    { sortable: !1 }
  );
}
function ac(e, t, n, r) {
  const a = e.querySelector("tbody");
  if (!a) return;
  const i = a.querySelector("tr.footer-row");
  e.querySelectorAll(".is-expanded").forEach((s) => {
    s.classList.remove("is-expanded");
    const c = s.querySelector(".expand-icon ha-icon");
    c && c.setAttribute("icon", "mdi:chevron-right");
  }), a.querySelectorAll("tr.child-row").forEach((s) => {
    s.remove();
  });
  const o = Array.from(a.querySelectorAll("tr")).filter((s) => s !== i);
  o.sort((s, c) => {
    const l = s.cells[t], u = c.cells[t];
    let d = "", p = "";
    if (n) {
      const m = l.querySelector(n), y = u.querySelector(n);
      d = m?.getAttribute("data-val") ?? "", p = y?.getAttribute("data-val") ?? "";
    } else {
      const m = l.querySelector("[data-val]"), y = u.querySelector("[data-val]");
      d = m?.getAttribute("data-val") ?? l.textContent ?? "", p = y?.getAttribute("data-val") ?? u.textContent ?? "";
    }
    const f = parseFloat(d), g = parseFloat(p);
    return !isNaN(f) && !isNaN(g) ? (f - g) * (r === "asc" ? 1 : -1) : d.localeCompare(p) * (r === "asc" ? 1 : -1);
  }), o.forEach((s) => a.appendChild(s)), i && a.appendChild(i);
}
function ic(e, t) {
  const n = new Map(t.map((r) => [r.security_uuid, r]));
  e.addEventListener("click", (r) => {
    const a = r.target, i = a.closest(".expand-icon");
    if (i) {
      r.stopPropagation();
      const s = i.dataset.securityUuid, c = s ? n.get(s) : void 0, l = e.querySelector(`tr[data-security-uuid="${String(s)}"]`);
      if (l && c)
        if (l.classList.toggle("is-expanded")) {
          l.querySelector(".expand-icon ha-icon")?.setAttribute("icon", "mdi:chevron-down");
          const u = rc(c.lots, c), d = document.createElement("div");
          d.innerHTML = u;
          const p = Array.from(d.querySelectorAll("tbody tr")).map((f) => (f.classList.add("child-row"), s && (f.dataset.parentUuid = s), f));
          l.after(...p);
        } else
          l.querySelector(".expand-icon ha-icon")?.setAttribute("icon", "mdi:chevron-right"), e.querySelectorAll(`tr.child-row[data-parent-uuid="${String(s)}"]`).forEach((u) => {
            u.remove();
          });
      return;
    }
    const o = a.closest("[data-sort-selector]") || a.closest("[data-sort-key]");
    if (o) {
      const s = o.closest("table");
      if (!s) return;
      s.querySelectorAll(".sort-active").forEach((d) => {
        d !== o && d.classList.remove("sort-active", "dir-asc", "dir-desc");
      });
      let c = "asc";
      o.classList.contains("sort-active") && o.classList.contains("dir-asc") && (c = "desc"), o.classList.add("sort-active"), o.classList.remove("dir-asc", "dir-desc"), o.classList.add(`dir-${c}`);
      const l = o.closest("th"), u = l ? Array.from(l.parentElement?.children ?? []).indexOf(l) : -1;
      if (u >= 0) {
        const d = o.dataset.sortSelector || null;
        ac(s, u, d, c);
      }
    }
  });
}
async function oc(e, t, n) {
  const r = Et("Realisierte Performance", "");
  let a = [];
  try {
    a = await pi(t, n);
  } catch (s) {
    console.error("Failed to fetch trades", s);
  }
  const i = nc(a), o = `
    <div class="trades-view-wrapper" style="height: 100%;">
      ${r.outerHTML}
      <div class="card">
        <div class="trades-table-container">
          ${i}
        </div>
      </div>
    </div>
  `;
  return setTimeout(() => {
    ic(e, a);
  }, 0), o;
}
const sc = ho, an = "pp-reader-sticky-anchor", St = "overview", cc = "analyse", lc = "trades", on = "security:", uc = [
  { key: St, title: "Dashboard", render: Yr },
  { key: cc, title: "Analyse", render: tc },
  { key: lc, title: "Trades", render: oc }
], He = /* @__PURE__ */ new Map(), Te = [], wt = /* @__PURE__ */ new Map();
let sn = null, Bt = !1, Le = null, O = 0, Wt = null;
function Ct(e) {
  return typeof e == "object" && e !== null;
}
function Aa(e) {
  return typeof e == "object" && e !== null && typeof e.then == "function";
}
function Pa(e) {
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
function dc(e) {
  return e === "accounts" || e === "last_file_update" || e === "portfolio_values" || e === "portfolio_positions";
}
function ur(e) {
  const t = e.portfolio_uuid;
  if (typeof t == "string" && t)
    return t;
  const n = e.portfolioUuid;
  return typeof n == "string" && n ? n : null;
}
function fc(e) {
  if (!e)
    return null;
  if (Array.isArray(e)) {
    for (const t of e)
      if (Ct(t)) {
        const n = ur(t);
        if (n)
          return n;
      }
    return null;
  }
  return Ct(e) ? ur(e) : null;
}
function pc(e, t) {
  switch (e) {
    case "accounts":
      return {
        type: e,
        data: Array.isArray(t) ? t : null
      };
    case "last_file_update":
      return typeof t == "string" ? { type: e, data: t } : Ct(t) ? { type: e, data: t } : { type: e, data: null };
    case "portfolio_values":
      return Array.isArray(t) ? { type: e, data: t } : { type: e, data: null };
    case "portfolio_positions":
      return Array.isArray(t) ? { type: e, data: t } : Ct(t) ? { type: e, data: t } : { type: e, data: null };
    default:
      return null;
  }
}
function At(e) {
  return typeof e != "string" || !e.startsWith(on) ? null : e.slice(on.length) || null;
}
function gc() {
  if (!Le)
    return !1;
  const e = Da(Le);
  return e || (Le = null), e;
}
function de() {
  return [...Te.map((t) => He.get(t)).filter((t) => !!t), ...uc];
}
function hc(e) {
  const t = de();
  return e < 0 || e >= t.length ? null : t[e];
}
function Ea(e) {
  if (!e)
    return null;
  const t = e, n = t.ppreader ?? t.pp_reader;
  return n || (Object.values(t).find((a) => !a || typeof a != "object" ? !1 : a.webcomponent_name === "pp-reader-panel") ?? null);
}
function Na() {
  try {
    const e = Ee();
    e && typeof e.rememberScrollPosition == "function" && e.rememberScrollPosition();
  } catch (e) {
    console.warn("rememberCurrentPageScroll: konnte Scroll-Position nicht sichern", e);
  }
}
function dr(e) {
  const t = de();
  return !t.length || e < 0 ? 0 : e >= t.length ? t.length - 1 : e;
}
async function mc(e, t, n, r) {
  const a = de(), i = dr(e);
  if (i === O) {
    e < O && gc();
    return;
  }
  Na();
  const o = O >= 0 && O < a.length ? a[O] : null, s = o ? At(o.key) : null;
  let c = i;
  if (s) {
    const l = i >= 0 && i < a.length ? a[i] : null;
    if (l && l.key === St && Sc(s, { suppressRender: !0 })) {
      const p = de().findIndex((f) => f.key === St);
      c = p >= 0 ? p : 0;
    }
  }
  if (!Bt) {
    Bt = !0;
    try {
      O = dr(c);
      const l = O;
      await ka(t, n, r), vc(l);
    } catch (l) {
      console.error("navigateToPage: Fehler beim Rendern des Tabs", l);
    } finally {
      Bt = !1;
    }
  }
}
function Pt(e, t, n, r) {
  mc(O + e, t, n, r);
}
function yc(e, t) {
  if (!e || !t || typeof t.render != "function") {
    console.error("registerDetailTab: Ungültiger Tab-Descriptor", e, t);
    return;
  }
  const n = At(e);
  if (n) {
    const a = [...Te];
    for (const i of a)
      i !== e && At(i) && cn(i);
  }
  if (n) {
    const a = wt.get(n);
    a && a !== e && cn(a);
  }
  const r = {
    ...t,
    key: e
  };
  He.set(e, r), n && wt.set(n, e), Te.includes(e) || Te.push(e);
}
function cn(e) {
  if (!e)
    return;
  const t = He.get(e);
  if (t && typeof t.cleanup == "function")
    try {
      const a = t.cleanup({ key: e });
      Aa(a) && a.catch((i) => {
        console.error(
          "unregisterDetailTab: Fehler beim asynchronen cleanup",
          i
        );
      });
    } catch (a) {
      console.error("unregisterDetailTab: Fehler beim Ausführen von cleanup", a);
    }
  He.delete(e);
  const n = Te.indexOf(e);
  n >= 0 && Te.splice(n, 1);
  const r = At(e);
  r && wt.get(r) === e && wt.delete(r);
}
function bc(e) {
  return He.has(e);
}
function fr(e) {
  return He.get(e) ?? null;
}
function _c(e) {
  if (e != null && typeof e != "function") {
    console.error("setSecurityDetailTabFactory: Erwartet Funktion oder null", e);
    return;
  }
  sn = e ?? null;
}
function xa(e) {
  return `${on}${e}`;
}
function Ee() {
  for (const t of Qa())
    if (t.isConnected)
      return t;
  const e = /* @__PURE__ */ new Set();
  for (const t of ei())
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
function ln() {
  const e = Ee();
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
const Tc = {
  findDashboardElement: Ee,
  toErrorMessage: Pa
};
function vc(e) {
  const t = Ee();
  if (t && typeof t.handleExternalRender == "function")
    try {
      t.handleExternalRender(e);
    } catch (n) {
      console.warn("notifyExternalRender: Fehler beim Synchronisieren des Dashboards", n);
    }
}
function Da(e) {
  if (!e)
    return console.error("openSecurityDetail: Ungültige securityUuid", e), !1;
  const t = xa(e);
  let n = fr(t);
  if (!n && typeof sn == "function")
    try {
      const o = sn(e);
      o && typeof o.render == "function" ? (yc(t, o), n = fr(t)) : console.error("openSecurityDetail: Factory lieferte ungültigen Descriptor", o);
    } catch (o) {
      console.error("openSecurityDetail: Fehler beim Erzeugen des Tab-Descriptors", o);
    }
  if (!n)
    return console.warn(`openSecurityDetail: Kein Detail-Tab für ${e} verfügbar`), !1;
  Na();
  let a = de().findIndex((o) => o.key === t);
  if (a === -1 && (a = de().findIndex((s) => s.key === t), a === -1))
    return console.error("openSecurityDetail: Tab nach Registrierung nicht auffindbar"), !1;
  O = a, Le = null;
  const i = Ee();
  return i && (i._lastPage = null), ln(), !0;
}
function Sc(e, t = {}) {
  if (!e)
    return console.error("closeSecurityDetail: Ungültige securityUuid", e), !1;
  const { suppressRender: n = !1 } = t, r = xa(e);
  if (!bc(r))
    return !1;
  const i = de().findIndex((c) => c.key === r), o = i === O;
  cn(r);
  const s = de();
  if (!s.length) {
    if (O = 0, !n) {
      const c = Ee();
      c && (c._lastPage = null), ln();
    }
    return !0;
  }
  if (Le = e, o) {
    const c = s.findIndex((l) => l.key === St);
    c >= 0 ? O = c : O = Math.min(Math.max(i - 1, 0), s.length - 1);
  } else O >= s.length && (O = Math.max(0, s.length - 1));
  if (!n) {
    const c = Ee();
    c && (c._lastPage = null), ln();
  }
  return !0;
}
async function ka(e, t, n) {
  let r = n;
  r || (r = Ea(t ? t.panels : null));
  const a = de();
  O >= a.length && (O = Math.max(0, a.length - 1));
  const i = hc(O);
  if (!i) {
    console.error("renderTab: Kein gültiger Tab oder keine render-Methode gefunden!");
    return;
  }
  let o;
  try {
    o = await i.render(e, t, r);
  } catch (u) {
    console.error("renderTab: Fehler beim Rendern des Tabs:", u), e.innerHTML = `<div class="card"><h2>Fehler</h2><pre>${Pa(u)}</pre></div>`;
    return;
  }
  e.innerHTML = o ?? "", i.render === Yr && vn(e);
  const c = await new Promise((u) => {
    const d = window.setInterval(() => {
      const p = e.querySelector(".header-card");
      p && (clearInterval(d), u(p));
    }, 50);
  });
  let l = e.querySelector(`#${an}`);
  if (!l) {
    l = document.createElement("div"), l.id = an;
    const u = c.parentNode;
    u && "insertBefore" in u && u.insertBefore(l, c);
  }
  Ac(e, t, n), Cc(e, t, n), wc(e);
}
function wc(e) {
  const t = e.querySelector(".header-card"), n = e.querySelector(`#${an}`);
  if (!t || !n) {
    console.error("Fehlende Elemente für das Scrollverhalten: headerCard oder anchor.");
    return;
  }
  Wt?.disconnect(), Wt = new IntersectionObserver(
    ([r]) => {
      r.isIntersecting ? t.classList.remove("sticky") : t.classList.add("sticky");
    },
    {
      root: null,
      rootMargin: "0px 0px 0px 0px",
      threshold: 0
    }
  ), Wt.observe(n);
}
function Cc(e, t, n) {
  const r = e.querySelector(".header-card");
  if (!r) {
    console.error("Header-Card nicht gefunden!");
    return;
  }
  sc(
    r,
    () => {
      Pt(1, e, t, n);
    },
    () => {
      Pt(-1, e, t, n);
    }
  );
}
function Ac(e, t, n) {
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
    Pt(-1, e, t, n);
  }), i.addEventListener("click", () => {
    Pt(1, e, t, n);
  }), Pc(r);
}
function Pc(e) {
  const t = e.querySelector("#nav-left"), n = e.querySelector("#nav-right");
  if (t) {
    const r = O > 0 || !!Le;
    t.disabled = !r, t.classList.toggle("disabled", !r);
  }
  if (n) {
    const r = de(), i = !(O === r.length - 1);
    n.disabled = !i, n.classList.toggle("disabled", !i);
  }
}
class Ec extends HTMLElement {
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
    this._panel || (this._panel = Ea(this._hass.panels ?? null));
    const t = Fn(this._hass, this._panel);
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
    const n = Fn(this._hass, this._panel);
    if (!n)
      return;
    const r = t.data;
    if (!dc(r.data_type) || r.entry_id && r.entry_id !== n)
      return;
    const a = pc(r.data_type, r.data);
    a && (this._queueUpdate(a.type, a.data), this._doRender(a.type, a.data));
  }
  _doRender(t, n) {
    switch (t) {
      case "accounts":
        io(
          n,
          this._root
        );
        break;
      case "last_file_update":
        go(
          n,
          this._root
        );
        break;
      case "portfolio_values":
        co(
          n,
          this._root
        );
        break;
      case "portfolio_positions":
        fo(
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
    t === "portfolio_positions" && (a.portfolioUuid = fc(
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
    const n = ka(this._root, this._hass, this._panel);
    if (Aa(n)) {
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
customElements.get("pp-reader-dashboard") || customElements.define("pp-reader-dashboard", Ec);
console.log("PPReader dashboard module v20250914b geladen");
Ts({
  setSecurityDetailTabFactory: _c
});
export {
  Tc as __TEST_ONLY_DASHBOARD,
  $c as __TEST_ONLY__,
  Sc as closeSecurityDetail,
  _n as flushPendingPositions,
  fr as getDetailTabDescriptor,
  fo as handlePortfolioPositionsUpdate,
  bc as hasDetailTab,
  Da as openSecurityDetail,
  Fc as reapplyPositionsSort,
  Nc as registerDashboardElement,
  yc as registerDetailTab,
  Dc as registerPanelHost,
  _c as setSecurityDetailTabFactory,
  xc as unregisterDashboardElement,
  cn as unregisterDetailTab,
  kc as unregisterPanelHost,
  Wr as updatePortfolioFooterFromDom
};
//# sourceMappingURL=dashboard.CZQRTuYx.js.map
