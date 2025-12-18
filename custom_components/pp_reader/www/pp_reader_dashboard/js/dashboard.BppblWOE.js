const on = /* @__PURE__ */ new Set(), sn = /* @__PURE__ */ new Set(), dr = {}, Ka = [
  "renderPositionsTable",
  "applyGainPctMetadata",
  "attachSecurityDetailListener",
  "attachPortfolioPositionsSorting",
  "updatePortfolioFooter"
];
function Ga(e, t) {
  typeof t == "function" && (dr[e] = t);
}
function _c(e) {
  e && on.add(e);
}
function vc(e) {
  e && on.delete(e);
}
function Xa() {
  return on;
}
function Sc(e) {
  e && sn.add(e);
}
function wc(e) {
  e && sn.delete(e);
}
function Za() {
  return sn;
}
function Ja(e) {
  for (const t of Ka)
    Ga(t, e[t]);
}
function cn() {
  return dr;
}
function me(e) {
  return typeof e == "object" && e !== null;
}
function B(e) {
  return typeof e == "string" ? e : null;
}
function et(e) {
  return e === null ? null : B(e);
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
function En(e) {
  const t = V(e);
  if (t == null)
    return null;
  const n = Math.trunc(t);
  return Number.isFinite(n) ? n : null;
}
function nt(e) {
  return me(e) ? { ...e } : null;
}
function fr(e) {
  return me(e) ? { ...e } : null;
}
function pr(e) {
  return typeof e == "boolean" ? e : void 0;
}
function Qa(e) {
  if (!me(e))
    return null;
  const t = B(e.name), n = B(e.currency_code), r = V(e.orig_balance);
  if (!t || !n || r == null)
    return null;
  const a = e.balance === null ? null : V(e.balance), i = {
    uuid: B(e.uuid) ?? void 0,
    name: t,
    currency_code: n,
    orig_balance: r,
    balance: a ?? null
  }, o = V(e.fx_rate);
  o != null && (i.fx_rate = o);
  const c = B(e.fx_rate_source);
  c && (i.fx_rate_source = c);
  const s = B(e.fx_rate_timestamp);
  s && (i.fx_rate_timestamp = s);
  const l = V(e.coverage_ratio);
  l != null && (i.coverage_ratio = l);
  const d = B(e.provenance);
  d && (i.provenance = d);
  const f = et(e.metric_run_uuid);
  f !== null && (i.metric_run_uuid = f);
  const p = pr(e.fx_unavailable);
  return typeof p == "boolean" && (i.fx_unavailable = p), i;
}
function gr(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = Qa(n);
    r && t.push(r);
  }
  return t;
}
function ei(e) {
  if (!me(e))
    return null;
  const t = e.aggregation, n = B(e.security_uuid), r = B(e.name), a = V(e.current_holdings), i = V(e.purchase_value_eur) ?? (me(t) ? V(t.purchase_value_eur) ?? V(t.purchase_total_account) ?? V(t.account_currency_total) : null) ?? V(e.purchase_value), o = V(e.current_value);
  if (!n || !r || a == null || i == null || o == null)
    return null;
  const c = {
    portfolio_uuid: B(e.portfolio_uuid) ?? void 0,
    security_uuid: n,
    name: r,
    ticker_symbol: B(e.ticker_symbol),
    currency_code: B(e.currency_code),
    current_holdings: a,
    purchase_value: i,
    current_value: o,
    average_cost: nt(e.average_cost),
    performance: nt(e.performance),
    aggregation: nt(e.aggregation),
    data_state: fr(e.data_state)
  }, s = V(e.coverage_ratio);
  s != null && (c.coverage_ratio = s);
  const l = B(e.provenance);
  l && (c.provenance = l);
  const d = et(e.metric_run_uuid);
  d !== null && (c.metric_run_uuid = d);
  const f = V(e.last_price_native);
  f != null && (c.last_price_native = f);
  const p = V(e.last_price_eur);
  p != null && (c.last_price_eur = p);
  const u = V(e.last_close_native);
  u != null && (c.last_close_native = u);
  const g = V(e.last_close_eur);
  return g != null && (c.last_close_eur = g), c;
}
function hr(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = ei(n);
    r && t.push(r);
  }
  return t;
}
function mr(e) {
  if (!me(e))
    return null;
  const t = B(e.name), n = V(e.current_value ?? e.value);
  if (!t || n == null)
    return null;
  const a = V(
    e.purchase_sum ?? e.purchase_value_eur ?? e.purchase_value ?? e.purchaseSum
  ) ?? 0, i = {
    uuid: B(e.uuid) ?? void 0,
    name: t,
    current_value: n,
    purchase_value: a,
    purchase_sum: a,
    day_change_abs: V(e.day_change_abs) ?? V(e.day_change_eur) ?? void 0,
    day_change_pct: V(e.day_change_pct) ?? void 0,
    position_count: En(e.position_count ?? e.count) ?? void 0,
    missing_value_positions: En(e.missing_value_positions) ?? void 0,
    has_current_value: pr(e.has_current_value),
    performance: nt(e.performance),
    coverage_ratio: V(e.coverage_ratio) ?? void 0,
    provenance: B(e.provenance) ?? void 0,
    metric_run_uuid: et(e.metric_run_uuid) ?? void 0,
    data_state: fr(e.data_state)
  };
  return Array.isArray(e.positions) && (i.positions = hr(e.positions)), i;
}
function yr(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = mr(n);
    r && t.push(r);
  }
  return t;
}
function br(e) {
  if (!me(e))
    return null;
  const t = { ...e }, n = et(e.metric_run_uuid);
  n !== null ? t.metric_run_uuid = n : delete t.metric_run_uuid;
  const r = V(e.coverage_ratio);
  r != null ? t.coverage_ratio = r : delete t.coverage_ratio;
  const a = B(e.provenance);
  a ? t.provenance = a : delete t.provenance;
  const i = B(e.generated_at ?? e.snapshot_generated_at);
  return i ? t.generated_at = i : delete t.generated_at, t;
}
function ti(e) {
  if (!me(e))
    return null;
  const t = { ...e }, n = br(e.normalized_payload);
  return n ? t.normalized_payload = n : "normalized_payload" in t && delete t.normalized_payload, t;
}
function _r(e) {
  if (!me(e))
    return null;
  const t = B(e.generated_at);
  if (!t)
    return null;
  const n = et(e.metric_run_uuid), r = gr(e.accounts), a = yr(e.portfolios), i = ti(e.diagnostics), o = {
    generated_at: t,
    metric_run_uuid: n,
    accounts: r,
    portfolios: a
  };
  return i && (o.diagnostics = i), o;
}
function ne(e) {
  return typeof e == "string" ? e : null;
}
function ni(e) {
  if (typeof e == "string")
    return e;
  if (e === null)
    return null;
}
function ri(e) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
}
function Nn(e, t) {
  if (typeof e == "string")
    return e;
  throw new Error(`mapPositionSnapshotToRecord: fehlendes ${t}`);
}
function Ft(e, t) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  throw new Error(`mapPositionSnapshotToRecord: fehlendes ${t}`);
}
function ai(e) {
  const t = Nn(e.security_uuid, "security_uuid"), n = Nn(e.name, "name"), r = Ft(e.current_holdings, "current_holdings"), a = Ft(e.purchase_value, "purchase_value"), i = Ft(e.current_value, "current_value"), o = {
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
function xn(e, t) {
  return ye(e, t);
}
async function ii(e, t) {
  if (!e)
    throw new Error("fetchAccountsWS: fehlendes hass");
  const n = ye(e, t);
  if (!n)
    throw new Error("fetchAccountsWS: fehlendes entry_id");
  const r = await e.connection.sendMessagePromise({
    type: "pp_reader/get_accounts",
    entry_id: n
  }), a = gr(r.accounts), i = _r(r.normalized_payload);
  return {
    accounts: a,
    normalized_payload: i
  };
}
async function oi(e, t) {
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
async function si(e, t) {
  if (!e)
    throw new Error("fetchPortfoliosWS: fehlendes hass");
  const n = ye(e, t);
  if (!n)
    throw new Error("fetchPortfoliosWS: fehlendes entry_id");
  const r = await e.connection.sendMessagePromise({
    type: "pp_reader/get_portfolio_data",
    entry_id: n
  }), a = yr(r.portfolios), i = _r(r.normalized_payload);
  return {
    portfolios: a,
    normalized_payload: i
  };
}
function ci(e, t, n) {
  if (e && typeof e == "object") {
    const r = ne(e.start), a = ne(e.end);
    if (r && a)
      return { start: r, end: a };
  }
  if (n?.start && n.end)
    return { start: n.start, end: n.end };
  if (t)
    return { start: t, end: t };
  throw new Error("fetchDailyWealthWS: fehlender Zeitraum");
}
function Z(e) {
  return typeof e == "number" && Number.isFinite(e) ? e : 0;
}
function Dn(e) {
  return e === null ? null : typeof e == "number" && Number.isFinite(e) ? e : null;
}
function vr(e) {
  const t = ne(e.date);
  if (!t)
    return null;
  const n = {
    date: t,
    total_wealth_eur: Z(e.total_wealth_eur),
    portfolio_wealth_eur: Z(e.portfolio_wealth_eur),
    account_wealth_eur: Z(e.account_wealth_eur),
    dividends_eur: Z(e.dividends_eur),
    interest_eur: Z(e.interest_eur),
    inbound_transfers_eur: Z(e.inbound_transfers_eur),
    outbound_transfers_eur: Z(e.outbound_transfers_eur),
    performance_neutral_movements: Z(e.performance_neutral_movements),
    fees_eur: Z(e.fees_eur),
    taxes_eur: Z(e.taxes_eur),
    realized_gains_eur: Z(e.realized_gains_eur),
    unrealized_gains_eur: Z(e.unrealized_gains_eur),
    unrealized_price_gains_eur: Z(e.unrealized_price_gains_eur),
    invested_capital_eur: Z(e.invested_capital_eur),
    fx_coverage_ratio: Dn(e.fx_coverage_ratio),
    price_coverage_ratio: Dn(e.price_coverage_ratio),
    stale_price: e.stale_price === !0
  }, r = ne(e.provenance);
  return r && (n.provenance = r), n;
}
function Fn(e) {
  const t = vr(e), n = ne(e.scope_type), r = ne(e.scope_id);
  if (!t || !n || !r || n !== "portfolio" && n !== "account")
    return null;
  const a = {
    ...t,
    scope_type: n,
    scope_id: r
  }, i = ne(e.scope_name);
  return i && (a.scope_name = i), a;
}
function li(e) {
  if (!e || typeof e != "object")
    return;
  const t = e, n = Array.isArray(t.accounts) ? t.accounts : [], r = Array.isArray(t.portfolios) ? t.portfolios : [], a = n.map((o) => o && typeof o == "object" ? Fn(o) : null).filter((o) => !!o), i = r.map((o) => o && typeof o == "object" ? Fn(o) : null).filter((o) => !!o);
  if (!(a.length === 0 && i.length === 0))
    return { accounts: a, portfolios: i };
}
async function ui(e, t, n) {
  if (!e)
    throw new Error("fetchDailyWealthWS: fehlendes hass");
  const r = ye(e, t);
  if (!r)
    throw new Error("fetchDailyWealthWS: fehlendes entry_id");
  const { date: a, range: i, includeSlices: o, includeScopes: c, scopes: s, limit: l, offset: d } = n, f = ne(a), p = i && typeof i == "object" ? {
    start: ne(i.start) ?? "",
    end: ne(i.end) ?? ""
  } : null;
  if (f && p && p.start && p.end)
    throw new Error("fetchDailyWealthWS: date und range sind gleichzeitig gesetzt");
  const u = {
    type: "pp_reader/get_daily_wealth",
    entry_id: r
  };
  if (f)
    u.date = f;
  else if (p && p.start && p.end)
    u.range = p;
  else
    throw new Error("fetchDailyWealthWS: weder date noch range angegeben");
  o !== void 0 && (u.include_slices = o), c !== void 0 && (u.include_scopes = c), (Array.isArray(s?.accounts) || Array.isArray(s?.portfolios)) && (u.scopes = {}, Array.isArray(s.accounts) && (u.scopes.accounts = s.accounts.filter((b) => typeof b == "string" && b.length > 0)), Array.isArray(s.portfolios) && (u.scopes.portfolios = s.portfolios.filter(
    (b) => typeof b == "string" && b.length > 0
  ))), typeof l == "number" && Number.isFinite(l) && l > 0 && (u.limit = l), typeof d == "number" && Number.isFinite(d) && d >= 0 && (u.offset = d);
  const g = await e.connection.sendMessagePromise(u), m = ci(g.range, f, p), y = (Array.isArray(g.records) ? g.records : []).map((b) => b && typeof b == "object" ? vr(b) : null).filter((b) => !!b), _ = li(g.slices);
  return {
    range: m,
    records: y,
    ..._ ? { slices: _ } : {}
  };
}
async function Sr(e, t, n) {
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
  }), o = hr(a.positions).map(ai), c = br(a.normalized_payload), s = {
    portfolio_uuid: ne(a.portfolio_uuid) ?? n,
    positions: o
  };
  typeof a.error == "string" && (s.error = a.error);
  const l = ri(a.coverage_ratio);
  l !== void 0 && (s.coverage_ratio = l);
  const d = ne(a.provenance);
  d && (s.provenance = d);
  const f = ni(a.metric_run_uuid);
  return f !== void 0 && (s.metric_run_uuid = f), c && (s.normalized_payload = c), s;
}
async function di(e, t, n) {
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
async function fi(e, t) {
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
async function st(e, t, n, r = {}) {
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
  }, { startDate: o, endDate: c, start_date: s, end_date: l } = r || {}, d = o ?? s;
  d != null && (i.start_date = d);
  const f = c ?? l;
  f != null && (i.end_date = f);
  const p = await e.connection.sendMessagePromise(i);
  return Array.isArray(p.prices) || (p.prices = []), Array.isArray(p.transactions) || (p.transactions = []), p;
}
function F(e) {
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
function ge(e) {
  return F(e);
}
const ln = (e, t) => {
  if (!Number.isFinite(e) || e === 0)
    return "neutral";
  const n = 0.5 / Math.pow(10, t);
  return Math.abs(e) < n ? "neutral" : e > 0 ? "positive" : "negative";
};
function M(e, t, n = void 0, r = void 0) {
  let a = null;
  const i = (s) => {
    if (typeof s == "number")
      return s;
    if (typeof s == "string" && s.trim() !== "") {
      const l = s.replace(/\s+/g, "").replace(/[^0-9,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."), d = Number.parseFloat(l);
      return Number.isNaN(d) ? Number.NaN : d;
    }
    return Number.NaN;
  }, o = (s, l = 2, d = 2) => {
    const f = typeof s == "number" ? s : i(s);
    return Number.isFinite(f) ? f.toLocaleString("de-DE", {
      minimumFractionDigits: l,
      maximumFractionDigits: d
    }) : "";
  }, c = (s = "") => {
    const l = s || "Kein Wert verfügbar";
    return `<span class="missing-value" role="note" aria-label="${l}" title="${l}">—</span>`;
  };
  if (["gain_abs", "gain_pct", "day_change_abs", "day_change_pct"].includes(e)) {
    if (t == null && n) {
      const p = n.performance;
      if (typeof p == "object" && p !== null)
        if (e.startsWith("day_change")) {
          const u = p.day_change;
          if (u && typeof u == "object") {
            const g = e === "day_change_pct" ? u.change_pct : u.value_change_eur ?? u.price_change_eur;
            typeof g == "number" && (t = g);
          }
        } else {
          const u = p[e];
          typeof u == "number" && (t = u);
        }
    }
    const s = n?.fx_unavailable === !0 ? "Wechselkurs nicht verfügbar – EUR-Wert unbekannt" : "";
    if (t == null || r?.hasValue === !1)
      return c(s);
    const l = typeof t == "number" ? t : i(t);
    if (!Number.isFinite(l))
      return c(s);
    const d = e.endsWith("pct") ? "%" : "€";
    return a = o(l) + `&nbsp;${d}`, `<span class="${ln(l, 2)}">${a}</span>`;
  } else if (e === "position_count") {
    const s = typeof t == "number" ? t : i(t);
    if (!Number.isFinite(s))
      return c();
    a = s.toLocaleString("de-DE");
  } else if (["balance", "current_value", "purchase_value"].includes(e)) {
    const s = typeof t == "number" ? t : i(t);
    if (!Number.isFinite(s))
      return n?.fx_unavailable ? c(
        "Wechselkurs nicht verfügbar – EUR-Wert unbekannt"
      ) : (r && r.hasValue === !1, c());
    a = o(s) + "&nbsp;€";
  } else if (e === "current_holdings") {
    const s = typeof t == "number" ? t : i(t);
    if (!Number.isFinite(s))
      return c();
    const l = Math.abs(s % 1) > 0;
    a = s.toLocaleString("de-DE", {
      minimumFractionDigits: l ? 2 : 0,
      maximumFractionDigits: 4
    });
  } else {
    let s = "";
    typeof t == "string" ? s = t : typeof t == "number" && Number.isFinite(t) ? s = t.toString() : typeof t == "boolean" ? s = t ? "true" : "false" : t instanceof Date && Number.isFinite(t.getTime()) && (s = t.toISOString()), a = s, a && (/<[a-z]/i.test(a) && /<\s*(?:script|iframe|object|embed|base|style|link|meta|form)\b|javascript:|[\s\/]on[a-z]+\s*=/i.test(a) && (a = F(a)), /<|&lt;|&gt;/.test(a) || (a.length > 60 && (a = a.slice(0, 59) + "…"), a.startsWith("Kontostand ") ? a = a.substring(11) : a.startsWith("Depotwert ") && (a = a.substring(10))));
  }
  return typeof a != "string" || a === "" ? c() : a;
}
function Re(e, t, n = [], r = {}) {
  const { sortable: a = !1, defaultSort: i } = r, o = i?.key ?? "", c = i?.dir === "desc" ? "desc" : "asc";
  let s = "<table><thead><tr>";
  t.forEach((h) => {
    const y = h.align === "right" ? ' class="align-right"' : "";
    if (a && h.key) {
      const _ = `${ge(h.label)} sortieren`;
      s += `<th${y} data-sort-key="${h.key}" role="button" tabindex="0" aria-sort="none" aria-label="${_}">${h.label}</th>`;
    } else
      s += `<th${y}>${h.label}</th>`;
  }), s += "</tr></thead><tbody>", e.forEach((h) => {
    s += "<tr>", t.forEach((y) => {
      const _ = y.align === "right" ? ' class="align-right"' : "";
      s += `<td${_}>${M(y.key, h[y.key], h)}</td>`;
    }), s += "</tr>";
  });
  const l = {}, d = {};
  t.forEach((h) => {
    if (n.includes(h.key)) {
      const y = e.reduce(
        (_, b) => {
          let v = b[h.key];
          if ((h.key === "gain_abs" || h.key === "gain_pct") && (typeof v != "number" || !Number.isFinite(v))) {
            const C = b.performance;
            if (typeof C == "object" && C !== null) {
              const A = C[h.key];
              typeof A == "number" && (v = A);
            }
          } else if ((h.key === "day_change_abs" || h.key === "day_change_pct") && (typeof v != "number" || !Number.isFinite(v))) {
            const C = b.performance;
            if (typeof C == "object" && C !== null) {
              const A = C.day_change;
              if (A && typeof A == "object") {
                const P = h.key === "day_change_pct" ? A.change_pct : A.value_change_eur ?? A.price_change_eur;
                typeof P == "number" && (v = P);
              }
            }
          }
          if (typeof v == "number" && Number.isFinite(v)) {
            const C = v;
            _.total += C, _.hasValue = !0;
          }
          return _;
        },
        { total: 0, hasValue: !1 }
      );
      y.hasValue ? (l[h.key] = y.total, d[h.key] = { hasValue: !0 }) : (l[h.key] = null, d[h.key] = { hasValue: !1 });
    }
  });
  const f = l.gain_abs ?? null;
  if (f != null) {
    const h = l.purchase_value ?? null;
    if (h != null && h > 0)
      l.gain_pct = f / h * 100;
    else {
      const y = l.current_value ?? null;
      y != null && y !== 0 && (l.gain_pct = f / (y - f) * 100);
    }
  }
  const p = l.day_change_abs ?? null;
  if (p != null) {
    const h = l.current_value ?? null;
    if (h != null) {
      const y = h - p;
      y && (l.day_change_pct = p / y * 100, d.day_change_pct = { hasValue: !0 });
    }
  }
  const u = Number.isFinite(l.gain_pct ?? NaN) ? l.gain_pct : null;
  let g = "", m = "neutral";
  if (u != null && (g = `${ae(u)} %`, u > 0 ? m = "positive" : u < 0 && (m = "negative")), s += '<tr class="footer-row">', t.forEach((h, y) => {
    const _ = h.align === "right" ? ' class="align-right"' : "";
    if (y === 0) {
      s += `<td${_}>Summe</td>`;
      return;
    }
    if (l[h.key] != null) {
      let v = "";
      h.key === "gain_abs" && g && (v = ` data-gain-pct="${ge(g)}" data-gain-sign="${ge(m)}"`), s += `<td${_}${v}>${M(h.key, l[h.key], void 0, d[h.key])}</td>`;
      return;
    }
    if (h.key === "gain_pct" && l.gain_pct != null) {
      s += `<td${_}>${M("gain_pct", l.gain_pct, void 0, d[h.key])}</td>`;
      return;
    }
    const b = d[h.key] ?? { hasValue: !1 };
    s += `<td${_}>${M(h.key, null, void 0, b)}</td>`;
  }), s += "</tr>", s += "</tbody></table>", a)
    try {
      const h = document.createElement("template");
      h.innerHTML = s.trim();
      const y = h.content.querySelector("table");
      if (y)
        return y.classList.add("sortable-table"), o && (y.dataset.defaultSort = o, y.dataset.defaultDir = c), y.outerHTML;
    } catch (h) {
      console.warn("makeTable(sortable): Injection fehlgeschlagen:", h);
    }
  return s;
}
function un(e, t, n = {}) {
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
function ae(e, t = 2, n = 2) {
  return (Number.isNaN(e) ? 0 : e).toLocaleString("de-DE", {
    minimumFractionDigits: t,
    maximumFractionDigits: n
  });
}
function pi(e) {
  const t = Number.isNaN(e) ? 0 : e;
  return `<span class="${ln(t, 2)}">${ae(t)}&nbsp;€</span>`;
}
function gi(e) {
  const t = Number.isNaN(e) ? 0 : e;
  return `<span class="${ln(t, 2)}">${ae(t)}&nbsp;%</span>`;
}
function hi() {
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
function dn(e = "Laden...") {
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

      <span>${F(e || "Laden...")}</span>
    </div>
  `;
}
function wr(e, t, n = "asc", r = !1) {
  if (!e)
    return [];
  const a = e.querySelector("tbody");
  if (!a)
    return [];
  const i = a.querySelector("tr.footer-row"), o = Array.from(
    a.querySelectorAll("tr")
  ).filter((d) => d !== i);
  let c = -1;
  if (r) {
    const f = {
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
    typeof f == "number" && (c = f);
  } else {
    const d = Array.from(
      e.querySelectorAll("thead th")
    );
    for (let f = 0; f < d.length; f++)
      if (d[f].getAttribute("data-sort-key") === t) {
        c = f;
        break;
      }
  }
  if (c < 0)
    return o;
  const s = (d) => {
    const f = d.replace(/\u00A0/g, " ").replace(/[%€]/g, "").replace(/\./g, "").replace(/,/g, ".").replace(/[^\d.-]/g, "").trim();
    if (!f) return NaN;
    const p = parseFloat(f);
    return Number.isFinite(p) ? p : NaN;
  };
  o.sort((d, f) => {
    const p = d.cells.item(c), u = f.cells.item(c), g = (p?.textContent ?? "").trim(), m = (u?.textContent ?? "").trim(), h = s(g), y = s(m);
    let _;
    const b = /[0-9]/.test(g) || /[0-9]/.test(m);
    return !Number.isNaN(h) && !Number.isNaN(y) && b ? _ = h - y : _ = g.localeCompare(m, "de", { sensitivity: "base" }), n === "asc" ? _ : -_;
  }), o.forEach((d) => a.appendChild(d)), i && a.appendChild(i), e.querySelectorAll("thead th.sort-active").forEach((d) => {
    d.classList.remove("sort-active", "dir-asc", "dir-desc");
  }), e.querySelectorAll("thead th[aria-sort]").forEach((d) => {
    d.setAttribute("aria-sort", "none");
  });
  const l = e.querySelector(
    `thead th[data-sort-key="${t}"]`
  );
  return l && (l.classList.add(
    "sort-active",
    n === "asc" ? "dir-asc" : "dir-desc"
  ), l.setAttribute("aria-sort", n === "asc" ? "ascending" : "descending")), o;
}
const mi = 2;
function pe(e) {
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
    const c = a !== -1, s = i !== -1;
    if (c && (!s || a > i))
      if (s)
        o = o.replace(/\./g, "").replace(",", ".");
      else {
        const f = o.split(","), p = f[f.length - 1]?.length ?? 0, u = f.slice(0, -1).join(""), g = u.replace(/[+-]/g, "").length, m = f.length > 2, h = /^[-+]?0$/.test(u);
        o = m || p === 0 || p === 3 && g > 0 && g <= 3 && !h ? o.replace(/,/g, "") : o.replace(",", ".");
      }
    else s && c && i > a ? o = o.replace(/,/g, "") : s && o.length - i - 1 === 3 && /\d{4,}/.test(o.replace(/\./g, "")) && (o = o.replace(/\./g, ""));
    if (o === "-" || o === "+")
      return null;
    const l = Number.parseFloat(o);
    if (Number.isFinite(l))
      return l;
    const d = Number.parseFloat(r.replace(",", "."));
    if (Number.isFinite(d))
      return d;
  }
  return null;
}
function Pt(e, { decimals: t = mi, fallback: n = null } = {}) {
  const r = pe(e);
  if (r == null)
    return n ?? null;
  const a = 10 ** t, i = Math.round(r * a) / a;
  return Object.is(i, -0) ? 0 : i;
}
function kn(e, t = {}) {
  return Pt(e, t);
}
function yi(e, t = {}) {
  return Pt(e, t);
}
const bi = /^[+-]?(?:\d+\.?\d*|\d*\.?\d+)(?:[eE][+-]?\d+)?$/, ce = (e) => {
  if (typeof e == "number")
    return Number.isFinite(e) ? e : null;
  if (typeof e == "string") {
    const t = e.trim();
    if (!t || !bi.test(t))
      return null;
    const n = Number(t);
    if (Number.isFinite(n))
      return n;
  }
  return null;
}, Cr = (e) => {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t || null;
};
function _i(e) {
  const t = e && typeof e == "object" ? e : null;
  if (!t)
    return null;
  const n = ce(t.price_change_native), r = ce(t.price_change_eur), a = ce(t.change_pct), i = ce(t.value_change_eur);
  if (n == null && r == null && a == null && i == null)
    return null;
  const o = Cr(t.source) ?? "derived", c = ce(t.coverage_ratio) ?? null;
  return {
    price_change_native: n,
    price_change_eur: r,
    change_pct: a,
    value_change_eur: i ?? null,
    source: o,
    coverage_ratio: c
  };
}
function we(e) {
  const t = e && typeof e == "object" ? e : null;
  if (!t)
    return null;
  const n = ce(t.gain_abs), r = ce(t.gain_pct), a = ce(t.total_change_eur), i = ce(t.total_change_pct);
  if (n == null || r == null || a == null || i == null)
    return null;
  const o = Cr(t.source) ?? "derived", c = ce(t.coverage_ratio) ?? null, s = _i(t.day_change);
  return {
    gain_abs: n,
    gain_pct: r,
    total_change_eur: a,
    total_change_pct: i,
    source: o,
    coverage_ratio: c,
    day_change: s
  };
}
const ve = /* @__PURE__ */ new Map();
function be(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t.length > 0 ? t : null;
}
function q(e) {
  if (e === null)
    return null;
  const t = pe(e);
  return Number.isFinite(t ?? NaN) ? t : null;
}
function vi(e) {
  if (!e || typeof e != "object")
    return !1;
  const t = e;
  return typeof t.security_uuid == "string" && typeof t.name == "string" && typeof t.current_holdings == "number" && typeof t.purchase_value == "number" && typeof t.current_value == "number";
}
function Te(e) {
  const t = { ...e };
  return e.average_cost && typeof e.average_cost == "object" && (t.average_cost = { ...e.average_cost }), e.performance && typeof e.performance == "object" && (t.performance = { ...e.performance }), e.aggregation && typeof e.aggregation == "object" && (t.aggregation = { ...e.aggregation }), e.data_state && typeof e.data_state == "object" && (t.data_state = { ...e.data_state }), t;
}
function Si(e, t, n = []) {
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
function wi(e, t) {
  const n = e ? Te(e) : {}, r = [
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
  ], a = (s, l, d) => {
    const f = l[d];
    f !== void 0 && (s[d] = f);
  };
  r.forEach((s) => {
    a(n, t, s);
  });
  const i = (s) => {
    const l = t[s];
    if (l && typeof l == "object") {
      const d = e && e[s] && typeof e[s] == "object" ? e[s] : {};
      n[s] = {
        ...d,
        ...l
      };
    } else l !== void 0 && (n[s] = l);
  }, o = t.performance, c = e && e.performance && typeof e.performance == "object" ? e.performance : void 0;
  return o !== void 0 && (n.performance = Si(c, o, [
    "gain_pct",
    "total_change_pct"
  ])), i("aggregation"), i("average_cost"), i("data_state"), n;
}
function ct(e, t) {
  if (!e)
    return [];
  if (!Array.isArray(t))
    return ve.delete(e), [];
  if (t.length === 0)
    return ve.set(e, []), [];
  const n = ve.get(e) ?? [], r = new Map(
    n.filter((i) => i.security_uuid).map((i) => [i.security_uuid, i])
  ), a = t.filter((i) => !!i).map((i) => {
    const o = i.security_uuid ?? "", c = o ? r.get(o) : void 0;
    return wi(c, i);
  }).map(Te);
  return ve.set(e, a), a.map(Te);
}
function Et(e) {
  return e ? ve.has(e) : !1;
}
function Ar(e) {
  if (!e)
    return [];
  const t = ve.get(e);
  return t ? t.map(Te) : [];
}
function Ci() {
  ve.clear();
}
function Ai() {
  return new Map(
    Array.from(ve.entries(), ([e, t]) => [
      e,
      t.map(Te)
    ])
  );
}
function He(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e, n = q(t.native), r = q(t.security), a = q(t.account), i = q(t.eur), o = q(t.coverage_ratio);
  if (n == null && r == null && a == null && i == null && o == null)
    return null;
  const c = be(t.source);
  return {
    native: n,
    security: r,
    account: a,
    eur: i,
    source: c === "totals" || c === "eur_total" ? c : "aggregation",
    coverage_ratio: o
  };
}
function fn(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e, n = q(t.total_holdings), r = q(t.positive_holdings), a = q(t.purchase_value_eur), i = q(t.purchase_total_security) ?? q(t.security_currency_total), o = q(t.purchase_total_account) ?? q(t.account_currency_total);
  let c = 0;
  if (typeof t.purchase_value_cents == "number")
    c = Number.isFinite(t.purchase_value_cents) ? Math.trunc(t.purchase_value_cents) : 0;
  else if (typeof t.purchase_value_cents == "string") {
    const l = Number.parseInt(t.purchase_value_cents, 10);
    Number.isFinite(l) && (c = l);
  }
  return n != null || r != null || a != null || i != null || o != null || c !== 0 ? {
    total_holdings: n ?? 0,
    positive_holdings: r ?? 0,
    purchase_value_cents: c,
    purchase_value_eur: a ?? 0,
    security_currency_total: i ?? 0,
    account_currency_total: o ?? 0,
    purchase_total_security: i ?? 0,
    purchase_total_account: o ?? 0
  } : null;
}
function Pi(e) {
  if (!e || typeof e != "object")
    return null;
  const t = vi(e) ? Te(e) : e, n = be(t.security_uuid), r = be(t.name), a = pe(t.current_holdings), i = kn(t.current_value), o = fn(t.aggregation), c = t.aggregation && typeof t.aggregation == "object" ? t.aggregation : null, s = q(t.purchase_value_eur) ?? q(c?.purchase_value_eur) ?? q(c?.purchase_total_account) ?? q(c?.account_currency_total) ?? kn(t.purchase_value);
  if (!n || !r || a == null || s == null || i == null)
    return null;
  const l = {
    security_uuid: n,
    name: r,
    portfolio_uuid: be(t.portfolio_uuid) ?? be(t.portfolioUuid) ?? void 0,
    currency_code: be(t.currency_code),
    current_holdings: a,
    purchase_value: s,
    current_value: i
  }, d = He(t.average_cost);
  d && (l.average_cost = d), o && (l.aggregation = o);
  const f = we(t.performance);
  if (f)
    l.performance = f, l.gain_abs = typeof f.gain_abs == "number" ? f.gain_abs : null, l.gain_pct = typeof f.gain_pct == "number" ? f.gain_pct : null;
  else {
    const b = q(t.gain_abs), v = q(t.gain_pct);
    b !== null && (l.gain_abs = b), v !== null && (l.gain_pct = v);
  }
  "coverage_ratio" in t && (l.coverage_ratio = q(t.coverage_ratio));
  const p = be(t.provenance);
  p && (l.provenance = p);
  const u = be(t.metric_run_uuid);
  (u || t.metric_run_uuid === null) && (l.metric_run_uuid = u ?? null);
  const g = q(t.last_price_native);
  g !== null && (l.last_price_native = g);
  const m = q(t.last_price_eur);
  m !== null && (l.last_price_eur = m);
  const h = q(t.last_close_native);
  h !== null && (l.last_close_native = h);
  const y = q(t.last_close_eur);
  y !== null && (l.last_close_eur = y);
  const _ = t.data_state && typeof t.data_state == "object" ? { ...t.data_state } : void 0;
  return _ && (l.data_state = _), l;
}
function Nt(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = Pi(n);
    r && t.push(r);
  }
  return t;
}
let Pr = [];
const Se = /* @__PURE__ */ new Map();
function rt(e) {
  return typeof e == "string" && e.length > 0 ? e : void 0;
}
function Ei(e) {
  return e === null ? null : rt(e);
}
function Ni(e) {
  return typeof e == "number" && Number.isFinite(e) ? e : void 0;
}
function Ae(e) {
  return e === null ? null : Ni(e);
}
function $n(e) {
  if (!(typeof e != "number" || !Number.isFinite(e)))
    return Math.trunc(e);
}
function le(e) {
  if (!(!e || typeof e != "object"))
    return { ...e };
}
function Ke(e) {
  const t = { ...e };
  return t.average_cost = le(e.average_cost), t.performance = le(e.performance), t.aggregation = le(e.aggregation), t.data_state = le(e.data_state), t;
}
function pn(e) {
  const t = { ...e };
  return t.performance = le(e.performance), t.data_state = le(e.data_state), Array.isArray(e.positions) && (t.positions = e.positions.map(Ke)), t;
}
function Er(e) {
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
  const c = Ae(e.day_change_pct);
  c !== void 0 && (n.day_change_pct = c);
  const s = $n(e.position_count);
  s !== void 0 && (n.position_count = s);
  const l = $n(e.missing_value_positions);
  l !== void 0 && (n.missing_value_positions = l), typeof e.has_current_value == "boolean" && (n.has_current_value = e.has_current_value);
  const d = Ae(e.coverage_ratio);
  d !== void 0 && (n.coverage_ratio = d);
  const f = rt(e.provenance);
  f && (n.provenance = f), "metric_run_uuid" in e && (n.metric_run_uuid = Ei(e.metric_run_uuid));
  const p = le(e.performance);
  p && (n.performance = p);
  const u = le(e.data_state);
  if (u && (n.data_state = u), Array.isArray(e.positions)) {
    const g = e.positions.filter(
      (m) => !!m
    );
    g.length && (n.positions = g.map(Ke));
  }
  return n;
}
function xi(e, t) {
  const n = {
    ...e,
    ...t
  };
  return !t.performance && e.performance && (n.performance = le(e.performance)), !t.data_state && e.data_state && (n.data_state = le(e.data_state)), !t.positions && e.positions && (n.positions = e.positions.map(Ke)), n;
}
function Nr(e) {
  Pr = (e ?? []).map((n) => ({ ...n }));
}
function Di() {
  return Pr.map((e) => ({ ...e }));
}
function Fi(e) {
  Se.clear();
  const t = e ?? [];
  for (const n of t) {
    const r = Er(n);
    r && Se.set(r.uuid, pn(r));
  }
}
function ki(e) {
  const t = e ?? [];
  for (const n of t) {
    const r = Er(n);
    if (!r)
      continue;
    const a = Se.get(r.uuid), i = a ? xi(a, r) : pn(r);
    Se.set(i.uuid, i);
  }
}
function lt(e, t) {
  if (!e)
    return;
  const n = Se.get(e);
  if (!n)
    return;
  if (!Array.isArray(t) || t.length === 0) {
    const s = { ...n };
    delete s.positions, Se.set(e, s);
    return;
  }
  const r = (s, l) => {
    const d = s ? Ke(s) : {}, f = d;
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
      m != null && (f[g] = m);
    });
    const u = (g, m = []) => {
      const h = l[g], y = s && s[g] && typeof s[g] == "object" ? s[g] : void 0;
      if (!h || typeof h != "object") {
        h !== void 0 && (f[g] = h);
        return;
      }
      const _ = {
        ...y ?? {},
        ...h
      };
      m.forEach((b) => {
        const v = y?.[b];
        v != null && (_[b] = v);
      }), f[g] = _;
    };
    return u("performance", ["gain_pct", "total_change_pct"]), u("aggregation"), u("average_cost"), u("data_state"), d;
  }, a = Array.isArray(n.positions) ? n.positions : [], i = new Map(
    a.filter((s) => s.security_uuid).map((s) => [s.security_uuid, s])
  ), o = t.filter((s) => !!s).map((s) => {
    const l = s.security_uuid ? i.get(s.security_uuid) : void 0;
    return r(l, s);
  }).map(Ke), c = {
    ...n,
    positions: o
  };
  Se.set(e, c);
}
function $i() {
  return Array.from(Se.values(), (e) => pn(e));
}
function xr() {
  return {
    accounts: Di(),
    portfolios: $i()
  };
}
const Ri = "unknown-account";
function J(e) {
  return typeof e != "number" || !Number.isFinite(e) ? null : e;
}
function Rn(e) {
  const t = J(e);
  return t == null ? 0 : Math.trunc(t);
}
function te(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t.length > 0 ? t : null;
}
function Dr(e, t) {
  return te(e) ?? t;
}
function Fr(e) {
  return e == null || !Number.isFinite(e) ? null : e < 0 ? 0 : e > 1 ? 1 : e;
}
function kr(e) {
  return e.split(/[\s_-]+/).filter(Boolean).map(
    (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
  ).join(" ");
}
function $r(e) {
  const t = Ti(e);
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
function Ti(e) {
  const t = te(e);
  if (!t)
    return null;
  const n = Li(t);
  return n || kr(t);
}
function Li(e) {
  const t = e.trim();
  if (!t.startsWith("{") && !t.startsWith("["))
    return null;
  try {
    const n = JSON.parse(t), r = Mi(n), a = n && typeof n == "object" ? te(
      n.provider ?? n.source
    ) : null;
    if (r.length && a)
      return `${kr(a)} (${r.join(", ")})`;
    if (r.length)
      return `FX (${r.join(", ")})`;
  } catch {
    return null;
  }
  return null;
}
function Mi(e) {
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
function Hi(e) {
  if (!e)
    return null;
  const t = te(e.uuid) ?? `${Ri}-${e.name ?? "0"}`, n = Dr(e.name, "Unbenanntes Konto"), r = te(e.currency_code), a = J(e.balance), i = J(e.orig_balance), o = "coverage_ratio" in e ? Fr(J(e.coverage_ratio)) : null, c = te(e.provenance), s = te(e.metric_run_uuid), l = e.fx_unavailable === !0, d = J(e.fx_rate), f = te(e.fx_rate_source), p = te(e.fx_rate_timestamp), u = [], g = $r(c);
  g && u.push(g);
  const m = {
    uuid: t,
    name: n,
    currency_code: r,
    balance: a,
    orig_balance: i,
    fx_unavailable: l,
    coverage_ratio: o,
    provenance: c,
    metric_run_uuid: null,
    fx_rate: d,
    fx_rate_source: f,
    fx_rate_timestamp: p,
    badges: u
  }, h = typeof s == "string" ? s : null;
  return m.metric_run_uuid = h, m;
}
function Ii(e) {
  if (!e)
    return null;
  const t = te(e.uuid);
  if (!t)
    return null;
  const n = Dr(e.name, "Unbenanntes Depot"), r = Rn(e.position_count), a = Rn(e.missing_value_positions), i = J(e.current_value), o = J(e.purchase_sum) ?? J(e.purchase_value_eur) ?? J(e.purchase_value) ?? 0, c = J(e.day_change_abs) ?? null, s = J(e.day_change_pct) ?? null, l = we(e.performance), d = l?.gain_abs ?? null, f = l?.gain_pct ?? null, p = l?.day_change ?? null;
  let u = c ?? (p?.value_change_eur != null ? J(p.value_change_eur) : null), g = s ?? (p?.change_pct != null ? J(p.change_pct) : null);
  if (u == null && g != null && i != null) {
    const N = i / (1 + g / 100);
    N && (u = i - N);
  }
  if (g == null && u != null && i != null) {
    const N = i - u;
    N && (g = u / N * 100);
  }
  const m = i != null, h = e.has_current_value === !1 || !m, y = "coverage_ratio" in e ? Fr(J(e.coverage_ratio)) : null, _ = te(e.provenance), b = te(e.metric_run_uuid), v = [], C = $r(_);
  C && v.push(C);
  const A = {
    uuid: t,
    name: n,
    position_count: r,
    current_value: i,
    purchase_sum: o,
    day_change_abs: u ?? null,
    day_change_pct: g ?? null,
    gain_abs: d,
    gain_pct: f,
    hasValue: m,
    fx_unavailable: h || a > 0,
    missing_value_positions: a,
    performance: l,
    coverage_ratio: y,
    provenance: _,
    metric_run_uuid: null,
    badges: v
  }, P = typeof b == "string" ? b : null;
  return A.metric_run_uuid = P, A;
}
function Rr() {
  const { accounts: e } = xr();
  return e.map(Hi).filter((t) => !!t);
}
function zi() {
  const { portfolios: e } = xr();
  return e.map(Ii).filter((t) => !!t);
}
function Tr(e, t = {}) {
  if (!e || e.length === 0)
    return "";
  const n = ["meta-badges", t.containerClass].filter(Boolean).join(" "), r = e.map((a) => {
    const i = `meta-badge--${a.tone}`, o = a.description ? ` title="${F(a.description)}"` : "";
    return `<span class="meta-badge ${i}"${o}>${F(
      a.label
    )}</span>`;
  }).join("");
  return `<span class="${n}">${r}</span>`;
}
function ut(e, t, n = {}) {
  const r = Tr(t, n);
  if (!r)
    return F(e);
  const a = n.labelClass ?? "name-with-badges__label";
  return `<span class="${["name-with-badges", n.containerClass].filter(Boolean).join(" ")}"><span class="${a}">${F(
    e
  )}</span>${r}</span>`;
}
function Lr(e, t, n, r) {
  e[t] = {
    previous: n,
    current: r
  };
}
const ue = /* @__PURE__ */ new Map(), Be = /* @__PURE__ */ new Map();
function Vi(e) {
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
function Ie(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t.length > 0 ? t : null;
}
function Ne(e) {
  return typeof e == "number" && Number.isFinite(e) ? e : void 0;
}
function Ui(e) {
  return e === null ? null : Ne(e);
}
function qi(e) {
  return e === null ? null : Ie(e);
}
function Tn(e) {
  return (e ?? []).filter(
    (t) => !t.key.endsWith("-coverage") && !t.key.startsWith("provenance-")
  );
}
function Ln(e) {
  return we(e.performance);
}
const Wi = 500, Oi = 10, Bi = "pp-reader:portfolio-positions-updated", Yi = "pp-reader:diagnostics", kt = /* @__PURE__ */ new Map(), Mr = [
  "coverage_ratio",
  "provenance",
  "metric_run_uuid",
  "generated_at"
], Wt = /* @__PURE__ */ new Map();
function ji(e, t) {
  return `${e}:${t}`;
}
function Ki(e) {
  if (e === void 0)
    return;
  if (e === null)
    return null;
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  const t = Ui(e);
  if (t === null)
    return null;
  if (typeof t == "number" && Number.isFinite(t))
    return t;
}
function $t(e) {
  if (e !== void 0)
    return qi(e);
}
function gn(e, t, n, r) {
  const a = {}, i = Ki(e);
  i !== void 0 && (a.coverage_ratio = i);
  const o = $t(t);
  o !== void 0 && (a.provenance = o);
  const c = $t(n);
  c !== void 0 && (a.metric_run_uuid = c);
  const s = $t(r);
  return s !== void 0 && (a.generated_at = s), Object.keys(a).length > 0 ? a : null;
}
function Gi(e, t) {
  const n = {};
  let r = !1;
  for (const a of Mr) {
    const i = e?.[a], o = t[a];
    i !== o && (Lr(n, a, i, o), r = !0);
  }
  return r ? n : null;
}
function Xi(e) {
  const t = {};
  let n = !1;
  for (const r of Mr) {
    const a = e[r];
    a !== void 0 && (Lr(t, r, a, void 0), n = !0);
  }
  return n ? t : null;
}
function Mn(e) {
  if (Object.keys(e.changed).length) {
    try {
      console.debug("pp-reader:diagnostics", e);
    } catch {
    }
    if (!(typeof window > "u" || typeof window.dispatchEvent != "function"))
      try {
        window.dispatchEvent(new CustomEvent(Yi, { detail: e }));
      } catch (t) {
        console.warn("updateConfigsWS: Diagnostics-Event konnte nicht gesendet werden", t);
      }
  }
}
function hn(e, t, n, r) {
  const a = ji(e, n), i = kt.get(a);
  if (!r) {
    if (!i)
      return;
    kt.delete(a);
    const c = Xi(i);
    if (!c)
      return;
    Mn({
      kind: e,
      uuid: n,
      source: t,
      changed: c,
      snapshot: {},
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    return;
  }
  const o = Gi(i, r);
  o && (kt.set(a, { ...r }), Mn({
    kind: e,
    uuid: n,
    source: t,
    changed: o,
    snapshot: { ...r },
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  }));
}
function Zi(e) {
  if (!(!e || e.length === 0))
    for (const t of e) {
      const n = Ie(t.uuid);
      if (!n)
        continue;
      const r = gn(
        t.coverage_ratio,
        t.provenance,
        t.metric_run_uuid,
        void 0
      );
      hn("account", "accounts", n, r);
    }
}
function Ji(e) {
  if (!(!e || e.length === 0))
    for (const t of e) {
      const n = Ie(t.uuid);
      if (!n)
        continue;
      const r = gn(
        t.coverage_ratio,
        t.provenance,
        t.metric_run_uuid,
        void 0
      );
      hn("portfolio", "portfolio_values", n, r);
    }
}
function Qi(e, t) {
  if (!t)
    return;
  const n = gn(
    t.coverage_ratio ?? t.normalized_payload?.coverage_ratio,
    t.provenance ?? t.normalized_payload?.provenance,
    t.metric_run_uuid ?? t.normalized_payload?.metric_run_uuid,
    t.normalized_payload?.generated_at
  );
  hn("portfolio_positions", "portfolio_positions", e, n);
}
function eo(e, t) {
  return `<div class="error">${F(Vi(e))} <button class="retry-pos" data-portfolio="${t}">Erneut laden</button></div>`;
}
function to(e, t, n) {
  const r = e.querySelector("table.sortable-positions");
  if (!r) return;
  const a = e.dataset.sortKey || r.dataset.defaultSort || "name", o = (e.dataset.sortDir || r.dataset.defaultDir || "asc") === "desc" ? "desc" : "asc";
  e.dataset.sortKey = a, e.dataset.sortDir = o;
  try {
    wr(r, a, o, !0);
  } catch (l) {
    console.warn("restoreSortAndInit: sortTableRows Fehler:", l);
  }
  const { attachPortfolioPositionsSorting: c, attachSecurityDetailListener: s } = cn();
  if (c)
    try {
      c(t, n);
    } catch (l) {
      console.warn("restoreSortAndInit: attachPortfolioPositionsSorting Fehler:", l);
    }
  if (s)
    try {
      s(t, n);
    } catch (l) {
      console.warn("restoreSortAndInit: attachSecurityDetailListener Fehler:", l);
    }
}
function Hr(e, t, n, r) {
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
    return i.innerHTML = eo(r, t), { applied: !0 };
  const o = i.dataset.sortKey, c = i.dataset.sortDir;
  return i.innerHTML = zr(n), o && (i.dataset.sortKey = o), c && (i.dataset.sortDir = c), to(i, e, t), { applied: !0 };
}
function mn(e, t) {
  const n = ue.get(t);
  if (!n) return !1;
  const r = Hr(
    e,
    t,
    n.positions,
    n.error
  );
  return r.applied && ue.delete(t), r.applied;
}
function no(e) {
  let t = !1;
  for (const [n] of ue)
    mn(e, n) && (t = !0);
  return t;
}
function Ir(e, t) {
  const n = Be.get(t) ?? {
    attempts: 0,
    timer: null
  };
  n.timer || (n.timer = setTimeout(() => {
    n.timer = null, n.attempts += 1;
    const r = mn(e, t);
    r || n.attempts >= Oi ? (Be.delete(t), r || ue.delete(t)) : Ir(e, t);
  }, Wi), Be.set(t, n));
}
function ro(e, t) {
  console.log("updateConfigsWS: Kontodaten-Update erhalten:", e);
  const n = Array.isArray(e) ? e : [];
  if (Nr(n), Zi(n), !t)
    return;
  const r = Rr();
  ao(r, t);
  const a = t.querySelector(".portfolio-table table"), i = a ? Array.from(
    a.querySelectorAll("tbody tr.portfolio-row")
  ).map((o) => {
    const c = o.dataset.currentValue, s = c ? Number.parseFloat(c) : Number.NaN;
    if (Number.isFinite(s))
      return {
        current_value: s
      };
    const l = o.cells.item(3), d = at(l?.textContent);
    return {
      current_value: Number.isFinite(d) ? d : 0
    };
  }) : [];
  Vr(r, i, t);
}
function ao(e, t) {
  const n = t.querySelector(".account-table"), r = t.querySelector(".fx-account-table"), a = e.filter((o) => (o.currency_code || "EUR") === "EUR"), i = e.filter((o) => (o.currency_code || "EUR") !== "EUR");
  if (n) {
    const o = a.map((c) => ({
      name: ut(c.name, Tn(c.badges), {
        containerClass: "account-name",
        labelClass: "account-name__label"
      }),
      balance: c.balance ?? null
    }));
    n.innerHTML = Re(
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
    const o = i.map((c) => {
      const s = c.orig_balance, l = typeof s == "number" && Number.isFinite(s), d = Ie(c.currency_code), f = l ? s.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) : null, p = f ? d ? `${f} ${d}` : f : "";
      return {
        name: ut(c.name, Tn(c.badges), {
          containerClass: "account-name",
          labelClass: "account-name__label"
        }),
        fx_display: p,
        balance: c.balance ?? null
      };
    });
    r.innerHTML = Re(
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
function io(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = mr(n);
    r && t.push(r);
  }
  return t;
}
function oo(e, t) {
  if (!Array.isArray(e)) {
    console.warn("handlePortfolioUpdate: Update ist kein Array:", e);
    return;
  }
  try {
    console.debug("handlePortfolioUpdate: payload=", e);
  } catch {
  }
  const n = io(e);
  if (n.length && ki(n), Ji(n), !t)
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
  const i = (f) => {
    if (typeof Intl < "u")
      try {
        const u = typeof navigator < "u" && navigator.language ? navigator.language : "de-DE";
        return new Intl.NumberFormat(u, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(f);
      } catch {
      }
    return (Pt(f, { fallback: 0 }) ?? 0).toFixed(2).replace(".", ",");
  }, o = /* @__PURE__ */ new Map();
  a.querySelectorAll("tr.portfolio-row").forEach((f) => {
    const p = f.dataset.portfolio;
    p && o.set(p, f);
  });
  let s = 0;
  const l = (f) => {
    const p = typeof f == "number" && Number.isFinite(f) ? f : 0;
    try {
      return p.toLocaleString("de-DE");
    } catch {
      return p.toString();
    }
  }, d = /* @__PURE__ */ new Map();
  for (const f of n) {
    const p = Ie(f.uuid);
    p && d.set(p, f);
  }
  for (const [f, p] of d.entries()) {
    const u = o.get(f);
    if (!u)
      continue;
    u.cells.length < 8 && console.warn("handlePortfolioUpdate: Unerwartetes Spaltenlayout", u.cells.length);
    const g = u.cells.item(1), m = u.cells.item(2), h = u.cells.item(3), y = u.cells.item(4), _ = u.cells.item(5), b = u.cells.item(6), v = u.cells.item(7);
    if (!g || !m || !h)
      continue;
    const C = typeof p.position_count == "number" && Number.isFinite(p.position_count) ? p.position_count : 0, A = typeof p.current_value == "number" && Number.isFinite(p.current_value) ? p.current_value : null, P = we(p.performance), N = typeof P?.gain_abs == "number" ? P.gain_abs : null, k = typeof P?.gain_pct == "number" ? P.gain_pct : null, I = typeof p.purchase_sum == "number" && Number.isFinite(p.purchase_sum) ? p.purchase_sum : typeof p.purchase_value == "number" && Number.isFinite(p.purchase_value) ? p.purchase_value : null, w = P?.day_change ?? null, x = Ne(p.day_change_abs) ?? Ne(w?.value_change_eur) ?? Ne(w?.price_change_eur), U = Ne(p.day_change_pct) ?? Ne(w?.change_pct);
    let E = x ?? null, $ = U ?? null;
    if (E == null && $ != null && A != null) {
      const G = A / (1 + $ / 100);
      G && (E = A - G);
    }
    if ($ == null && E != null && A != null) {
      const G = A - E;
      G && ($ = E / G * 100);
    }
    const K = typeof p.missing_value_positions == "number" && Number.isFinite(p.missing_value_positions) ? p.missing_value_positions : 0, S = A !== null, D = p.has_current_value === !1 || K > 0 || !S, L = at(h.textContent);
    at(g.textContent) !== C && (g.textContent = l(C));
    const R = {
      fx_unavailable: D,
      current_value: A,
      performance: P
    }, z = { hasValue: S }, O = M("purchase_value", I, R, z);
    m.innerHTML !== O && (m.innerHTML = O);
    const Y = M("current_value", R.current_value, R, z), X = typeof A == "number" ? A : 0;
    if ((Math.abs(L - X) >= 5e-3 || h.innerHTML !== Y) && (h.innerHTML = Y, u.classList.add("flash-update"), setTimeout(() => {
      u.classList.remove("flash-update");
    }, 800)), y && (y.innerHTML = M("day_change_abs", E, R, z)), _ && (_.innerHTML = M("day_change_pct", $, R, z)), b) {
      const G = M("gain_abs", N, R, z);
      b.innerHTML = G;
      const Ce = typeof k == "number" && Number.isFinite(k) ? k : null;
      b.dataset.gainPct = Ce != null ? `${i(Ce)} %` : "—", b.dataset.gainSign = Ce != null ? Ce > 0 ? "positive" : Ce < 0 ? "negative" : "neutral" : "neutral";
    }
    v && (v.innerHTML = M("gain_pct", k, R, z)), u.dataset.positionCount = C.toString(), u.dataset.purchaseSum = I != null ? I.toString() : "", u.dataset.currentValue = S ? X.toString() : "", u.dataset.dayChange = S && E != null ? E.toString() : "", u.dataset.dayChangePct = S && $ != null ? $.toString() : "", u.dataset.gainAbs = N != null ? N.toString() : "", u.dataset.gainPct = k != null ? k.toString() : "", u.dataset.hasValue = S ? "true" : "false", u.dataset.fxUnavailable = D ? "true" : "false", u.dataset.coverageRatio = typeof p.coverage_ratio == "number" && Number.isFinite(p.coverage_ratio) ? p.coverage_ratio.toString() : "", u.dataset.provenance = typeof p.provenance == "string" ? p.provenance : "", u.dataset.metricRunUuid = typeof p.metric_run_uuid == "string" ? p.metric_run_uuid : "", s += 1;
  }
  if (s === 0)
    console.debug("handlePortfolioUpdate: Keine passenden Zeilen gefunden / keine Änderungen.");
  else {
    const f = s.toLocaleString("de-DE");
    console.debug(`handlePortfolioUpdate: ${f} Zeile(n) gepatcht.`);
  }
  try {
    uo(r);
  } catch (f) {
    console.warn("handlePortfolioUpdate: Fehler bei Summen-Neuberechnung:", f);
  }
  try {
    const f = (...y) => {
      for (const _ of y) {
        if (!_) continue;
        const b = t.querySelector(_);
        if (b) return b;
      }
      return null;
    }, p = f(
      ".account-table table",
      ".accounts-eur-table table",
      ".accounts-table table"
    ), u = f(
      ".fx-account-table table",
      ".accounts-fx-table table"
    ), g = (y, _) => {
      if (!y) return [];
      const b = y.querySelectorAll("tbody tr.account-row");
      return (b.length ? Array.from(b) : Array.from(y.querySelectorAll("tbody tr:not(.footer-row)"))).map((C) => {
        const A = _ ? C.cells.item(2) : C.cells.item(1);
        return { balance: at(A?.textContent) };
      });
    }, m = [
      ...g(p, !1),
      ...g(u, !0)
    ], h = Array.from(
      r.querySelectorAll("tbody tr.portfolio-row")
    ).map((y) => {
      const _ = y.dataset.currentValue, b = y.dataset.purchaseSum, v = _ ? Number.parseFloat(_) : Number.NaN, C = b ? Number.parseFloat(b) : Number.NaN;
      return {
        current_value: Number.isFinite(v) ? v : 0,
        purchase_sum: Number.isFinite(C) ? C : 0
      };
    });
    Vr(m, h, t);
  } catch (f) {
    console.warn("handlePortfolioUpdate: Fehler bei Total-Neuberechnung:", f);
  }
}
function so(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e.portfolio_uuid;
  if (typeof t == "string" && t)
    return t;
  const n = e.portfolioUuid;
  return typeof n == "string" && n ? n : null;
}
function Ot(e) {
  Wt.delete(e);
}
function Hn(e) {
  return typeof e != "number" || !Number.isInteger(e) || e <= 0 ? null : e;
}
function co(e, t, n, r) {
  if (!n || n <= 1 || !t)
    return Ot(e), r;
  const a = n, i = Wt.get(e) ?? { expected: a, chunks: /* @__PURE__ */ new Map() };
  if (i.expected !== a && (i.chunks.clear(), i.expected = a), i.chunks.set(t, r), Wt.set(e, i), i.chunks.size < a)
    return null;
  const o = [];
  for (let c = 1; c <= a; c += 1) {
    const s = i.chunks.get(c);
    s && Array.isArray(s) && o.push(...s);
  }
  return Ot(e), o;
}
function In(e, t) {
  const n = so(e);
  if (!n)
    return console.warn("handlePortfolioPositionsUpdate: Ungültiges Update:", e), !1;
  const r = e?.error, a = Hn(e?.chunk_index), i = Hn(e?.chunk_count), o = Nt(e?.positions ?? []);
  r && Ot(n);
  const c = r ? o : co(n, a, i, o);
  if (!r && c === null)
    return !0;
  const s = r ? o : c ?? [];
  Qi(n, e);
  const l = Et(n);
  let d = s;
  if (!r && l) {
    const p = ct(n, s);
    lt(n, p), d = p;
  }
  const f = Hr(t, n, d, r);
  if (f.applied) {
    if (ue.delete(n), !r && !l) {
      const p = ct(n, d);
      lt(n, p);
    }
  } else
    r || f.reason !== "hidden" || l ? (ue.set(n, { positions: d, error: r }), Ir(t, n)) : (ue.delete(n), Be.delete(n));
  if (!r && o.length > 0) {
    const p = Array.from(
      new Set(
        o.map((u) => u.security_uuid).filter((u) => typeof u == "string" && u.length > 0)
      )
    );
    if (p.length && typeof window < "u")
      try {
        window.dispatchEvent(
          new CustomEvent(
            Bi,
            {
              detail: {
                portfolioUuid: n,
                securityUuids: p
              }
            }
          )
        );
      } catch (u) {
        console.warn(
          "handlePortfolioPositionsUpdate: Dispatch des Portfolio-Events fehlgeschlagen",
          u
        );
      }
  }
  return !0;
}
function lo(e, t) {
  if (Array.isArray(e)) {
    let n = !1;
    for (const r of e)
      In(r, t) && (n = !0);
    !n && e.length && console.warn("handlePortfolioPositionsUpdate: Kein gültiges Element im Array:", e);
    return;
  }
  In(e, t);
}
function zr(e) {
  const { renderPositionsTable: t, applyGainPctMetadata: n } = cn();
  try {
    if (typeof t == "function")
      return t(e);
  } catch {
  }
  if (e.length === 0)
    return '<div class="no-positions">Keine Positionen vorhanden.</div>';
  const r = e.map((i) => {
    const o = Ln(i);
    return {
      name: F(i.name),
      current_holdings: i.current_holdings,
      purchase_value: i.purchase_value,
      current_value: i.current_value,
      performance: o
    };
  }), a = Re(
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
      const c = o.querySelectorAll("thead th"), s = ["name", "current_holdings", "purchase_value", "current_value", "gain_abs", "gain_pct"];
      c.forEach((f, p) => {
        const u = s[p];
        if (!u) return;
        f.setAttribute("data-sort-key", u), f.classList.add("sortable-col"), f.setAttribute("role", "button"), f.setAttribute("tabindex", "0"), f.setAttribute("aria-sort", "none");
        const g = f.textContent || "";
        f.setAttribute("aria-label", `${F(g)} sortieren`);
      }), o.querySelectorAll("tbody tr").forEach((f, p) => {
        if (f.classList.contains("footer-row"))
          return;
        const u = e[p];
        u.security_uuid && (f.dataset.security = u.security_uuid), f.classList.add("position-row");
      }), o.dataset.defaultSort = "name", o.dataset.defaultDir = "asc";
      const d = n;
      if (d)
        try {
          d(o);
        } catch (f) {
          console.warn("renderPositionsTableInline: applyGainPctMetadata failed", f);
        }
      else
        o.querySelectorAll("tbody tr").forEach((p, u) => {
          if (p.classList.contains("footer-row"))
            return;
          const g = p.cells.item(4);
          if (!g)
            return;
          const m = e[u], h = Ln(m), y = typeof h?.gain_pct == "number" && Number.isFinite(h.gain_pct) ? h.gain_pct : null, _ = y != null ? `${y.toLocaleString("de-DE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })} %` : "—", b = y == null ? "neutral" : y > 0 ? "positive" : y < 0 ? "negative" : "neutral";
          g.dataset.gainPct = _, g.dataset.gainSign = b;
        });
      return o.outerHTML;
    }
  } catch (i) {
    console.warn("renderPositionsTableInline: Sortier-Metadaten Injection fehlgeschlagen:", i);
  }
  return a;
}
function uo(e) {
  if (!e) return;
  const { updatePortfolioFooter: t } = cn();
  if (typeof t == "function")
    try {
      t(e);
      return;
    } catch (y) {
      console.warn("updatePortfolioFooter: helper schlug fehl:", y);
    }
  const n = Array.from(e.querySelectorAll("tbody tr.portfolio-row")), r = (y) => {
    if (y === void 0)
      return null;
    const _ = Number.parseFloat(y);
    return Number.isFinite(_) ? _ : null;
  }, a = n.reduce(
    (y, _) => {
      const b = r(_.dataset.positionCount);
      if (b != null && (y.sumPositions += b), _.dataset.fxUnavailable === "true" && (y.fxUnavailable = !0), _.dataset.hasValue !== "true")
        return y.incompleteRows += 1, y;
      y.valueRows += 1;
      const v = r(_.dataset.currentValue), C = r(_.dataset.gainAbs), A = r(_.dataset.purchaseSum);
      return v == null || C == null || A == null ? (y.incompleteRows += 1, y) : (y.sumCurrent += v, y.sumGainAbs += C, y.sumPurchase += A, y);
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
  let c = e.querySelector("tr.footer-row");
  c || (c = document.createElement("tr"), c.className = "footer-row", e.querySelector("tbody")?.appendChild(c));
  const s = Math.round(a.sumPositions).toLocaleString("de-DE"), l = {
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
  }, d = { hasValue: i }, f = M("current_value", l.current_value, l, d), p = i ? a.sumGainAbs : null, u = i ? o : null, g = M("gain_abs", p, l, d), m = M("gain_pct", u, l, d);
  c.innerHTML = `
    <td>Summe</td>
    <td class="align-right">${s}</td>
    <td class="align-right">${f}</td>
    <td class="align-right">${g}</td>
    <td class="align-right">${m}</td>
  `;
  const h = c.cells.item(3);
  h && (h.dataset.gainPct = i && typeof o == "number" ? `${Bt(o)} %` : "—", h.dataset.gainSign = i && typeof o == "number" ? o > 0 ? "positive" : o < 0 ? "negative" : "neutral" : "neutral"), c.dataset.positionCount = Math.round(a.sumPositions).toString(), c.dataset.currentValue = i ? a.sumCurrent.toString() : "", c.dataset.purchaseSum = i ? a.sumPurchase.toString() : "", c.dataset.gainAbs = i ? a.sumGainAbs.toString() : "", c.dataset.gainPct = i && typeof o == "number" ? o.toString() : "", c.dataset.hasValue = i ? "true" : "false", c.dataset.fxUnavailable = a.fxUnavailable || !i ? "true" : "false";
}
function zn(e) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  if (typeof e == "string") {
    const t = Number.parseFloat(e);
    return Number.isFinite(t) ? t : 0;
  }
  return 0;
}
function Bt(e) {
  return (Pt(e, { fallback: 0 }) ?? 0).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
function Vr(e, t, n) {
  const r = n ?? document, i = (Array.isArray(e) ? e : []).reduce((f, p) => {
    const u = p.balance ?? p.current_value ?? p.value, g = zn(u);
    return f + g;
  }, 0), c = (Array.isArray(t) ? t : []).reduce((f, p) => {
    const u = p.current_value ?? p.value, g = zn(u);
    return f + g;
  }, 0), s = i + c, l = r.querySelector("#headerMeta");
  if (!l) {
    console.warn("updateTotalWealth: #headerMeta nicht gefunden.");
    return;
  }
  const d = l.querySelector("strong") || l.querySelector(".total-wealth-value");
  d ? d.textContent = `${Bt(s)} €` : l.textContent = `💰 Gesamtvermögen: ${Bt(s)} €`, l.dataset.totalWealthEur = s.toString();
}
function fo(e, t) {
  const n = typeof e == "string" ? e : e?.last_file_update, r = Ie(n) ?? "";
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
function Cc(e) {
  if (e == null)
    return;
  const t = e.querySelector("table.sortable-positions");
  if (t == null)
    return;
  const n = e.dataset.sortKey || t.dataset.defaultSort || "name", a = (e.dataset.sortDir || t.dataset.defaultDir || "asc") === "desc" ? "desc" : "asc";
  e.dataset.sortKey = n, e.dataset.sortDir = a, wr(t, n, a, !0);
}
const Ac = {
  getPortfolioPositionsCacheSnapshot: Ai,
  clearPortfolioPositionsCache: Ci,
  getPendingUpdateCount() {
    return ue.size;
  },
  queuePendingUpdate(e, t, n) {
    ue.set(e, { positions: t, error: n });
  },
  clearPendingUpdates() {
    ue.clear(), Be.clear();
  },
  renderPositionsTableInline: zr
};
function at(e) {
  return e == null ? 0 : parseFloat(
    e.replace(/\u00A0/g, " ").replace(/[€%]/g, "").replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "")
  ) || 0;
}
const Vn = 50;
function Un(e, t) {
  try {
    t();
  } catch (n) {
    console.warn(`addSwipeEvents: ${e} handler threw`, n);
  }
}
function po(e, t, n) {
  let r = null;
  const a = (l) => {
    l < -Vn ? Un("left", t) : l > Vn && Un("right", n);
  }, i = (l) => {
    l.touches.length === 1 && (r = l.touches[0].clientX);
  }, o = (l) => {
    if (r === null)
      return;
    if (l.changedTouches.length === 0) {
      r = null;
      return;
    }
    const d = l.changedTouches[0];
    a(d.clientX - r), r = null;
  }, c = (l) => {
    r = l.clientX;
  }, s = (l) => {
    r !== null && (a(l.clientX - r), r = null);
  };
  e.addEventListener("touchstart", i, { passive: !0 }), e.addEventListener("touchend", o, { passive: !0 }), e.addEventListener("mousedown", c), e.addEventListener("mouseup", s);
}
const go = [
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
function Rt(e) {
  return go.includes(e);
}
function Tt(e) {
  return e === "asc" || e === "desc";
}
function Ur(e) {
  return (e ?? []).filter((t) => !t.key.endsWith("-coverage"));
}
function qn(e) {
  return Ur(e).filter(
    (t) => !t.key.startsWith("provenance-")
  );
}
let dt = null, ft = null;
const Wn = { min: 2, max: 6 };
function Ue(e) {
  return pe(e);
}
function ho(e) {
  return typeof e == "number" && Number.isFinite(e);
}
function mo(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  if (!t)
    return null;
  const n = t.toUpperCase();
  return /^[A-Z]{3}$/.test(n) ? n : n === "€" ? "EUR" : null;
}
function On(e, t, n = null) {
  for (const r of t) {
    const a = mo(e[r]);
    if (a)
      return a;
  }
  return n;
}
function Bn(e, t) {
  return ho(e) ? `${e.toLocaleString("de-DE", {
    minimumFractionDigits: Wn.min,
    maximumFractionDigits: Wn.max
  })}${t ? ` ${t}` : ""}` : null;
}
function yo(e) {
  const t = e, n = e.average_cost ?? null, r = e.aggregation ?? null, a = On(t, [
    "security_currency_code",
    "security_currency",
    "native_currency_code",
    "native_currency"
  ], e.currency_code ?? null), i = On(
    t,
    [
      "account_currency_code",
      "account_currency",
      "purchase_currency_code",
      "currency_code"
    ],
    a === "EUR" ? "EUR" : null
  ) ?? "EUR", o = Ue(n?.native), c = Ue(n?.security), s = Ue(n?.account), l = Ue(n?.eur), d = c ?? o, f = l ?? (i === "EUR" ? s : null), p = a ?? i, u = p === "EUR";
  let g, m;
  u ? (g = "EUR", m = f ?? d ?? s ?? null) : d != null ? (g = p, m = d) : s != null ? (g = i, m = s) : (g = "EUR", m = f ?? null);
  const h = Bn(m, g), y = u ? null : Bn(f, "EUR"), _ = !!y && y !== h, b = [], v = [];
  h ? (b.push(
    `<span class="purchase-price purchase-price--primary">${h}</span>`
  ), v.push(h.replace(/\u00A0/g, " "))) : (b.push('<span class="missing-value" role="note" aria-label="Kein Kaufpreis verfügbar" title="Kein Kaufpreis verfügbar">—</span>'), v.push("Kein Kaufpreis verfügbar")), _ && y && (b.push(
    `<span class="purchase-price purchase-price--secondary">${y}</span>`
  ), v.push(y.replace(/\u00A0/g, " ")));
  const C = b.join("<br>"), A = Ue(r?.purchase_value_eur) ?? 0, P = v.join(", ");
  return { markup: C, sortValue: A, ariaLabel: P };
}
function bo(e) {
  const t = pe(e.current_holdings);
  if (t == null)
    return { value: null, pct: null };
  const n = pe(e.last_price_eur), r = pe(e.last_close_eur);
  let a = null, i = null;
  if (n != null && r != null) {
    a = (n - r) * t;
    const f = r * t;
    f && (i = a / f * 100);
  }
  const c = we(e.performance)?.day_change ?? null;
  if (a == null && c?.price_change_eur != null && (a = c.price_change_eur * t), i == null && c?.change_pct != null && (i = c.change_pct), a == null && i != null) {
    const d = pe(e.current_value);
    if (d != null) {
      const f = d / (1 + i / 100);
      f && (a = d - f);
    }
  }
  const s = a != null && Number.isFinite(a) ? Math.round(a * 100) / 100 : null, l = i != null && Number.isFinite(i) ? Math.round(i * 100) / 100 : null;
  return { value: s, pct: l };
}
const pt = /* @__PURE__ */ new Set();
function qr(e) {
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
function Ge(e) {
  if (e.length === 0)
    return '<div class="no-positions">Keine Positionen vorhanden.</div>';
  const t = [
    { key: "name", label: "Wertpapier" },
    { key: "current_holdings", label: "Bestand", align: "right" },
    { key: "average_price", label: "Ø Kaufpreis", align: "right" },
    { key: "purchase_value", label: "Kaufpreis (EUR)", align: "right" },
    { key: "current_value", label: "Aktueller Wert", align: "right" },
    { key: "day_change_abs", label: "Heute +/-", align: "right" },
    { key: "day_change_pct", label: "Heute %", align: "right" },
    { key: "gain_abs", label: "Gesamt +/-", align: "right" },
    { key: "gain_pct", label: "Gesamt %", align: "right" }
  ], n = e.map((a) => {
    const i = we(a.performance), o = typeof i?.gain_abs == "number" ? i.gain_abs : null, c = typeof i?.gain_pct == "number" ? i.gain_pct : null, s = bo(a), l = typeof a.purchase_value == "number" || typeof a.purchase_value == "string" ? a.purchase_value : null;
    return {
      name: typeof a.name == "string" ? F(a.name) : typeof a.name == "number" ? String(a.name) : "",
      current_holdings: typeof a.current_holdings == "number" || typeof a.current_holdings == "string" ? a.current_holdings : null,
      average_price: typeof a.purchase_value == "number" || typeof a.purchase_value == "string" ? a.purchase_value : null,
      purchase_value: l,
      current_value: typeof a.current_value == "number" || typeof a.current_value == "string" ? a.current_value : null,
      day_change_abs: s.value,
      day_change_pct: s.pct,
      gain_abs: o,
      gain_pct: c,
      performance: i
    };
  }), r = Re(n, t, ["purchase_value", "current_value", "day_change_abs", "gain_abs"]);
  try {
    const a = document.createElement("template");
    a.innerHTML = r.trim();
    const i = a.content.querySelector("table");
    if (i) {
      i.classList.add("sortable-positions");
      const o = Array.from(i.querySelectorAll("thead th"));
      return t.forEach((s, l) => {
        const d = o.at(l);
        if (!d)
          return;
        d.setAttribute("data-sort-key", s.key), d.classList.add("sortable-col"), d.setAttribute("role", "button"), d.setAttribute("tabindex", "0"), d.setAttribute("aria-sort", "none");
        const f = d.textContent || "";
        d.setAttribute("aria-label", `${F(f)} sortieren`);
      }), i.querySelectorAll("tbody tr").forEach((s, l) => {
        if (s.classList.contains("footer-row") || l >= e.length)
          return;
        const d = e[l], f = typeof d.security_uuid == "string" ? d.security_uuid : null;
        f && (s.dataset.security = f), s.classList.add("position-row");
        const p = s.cells.item(2);
        if (p) {
          const { markup: m, sortValue: h, ariaLabel: y } = yo(d);
          p.innerHTML = m, p.dataset.sortValue = String(h), y ? p.setAttribute("aria-label", y) : p.removeAttribute("aria-label");
        }
        const u = s.cells.item(7);
        if (u) {
          const m = we(d.performance), h = typeof m?.gain_pct == "number" && Number.isFinite(m.gain_pct) ? m.gain_pct : null, y = h != null ? `${h.toLocaleString("de-DE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })} %` : "—", _ = h == null ? "neutral" : h > 0 ? "positive" : h < 0 ? "negative" : "neutral";
          u.dataset.gainPct = y, u.dataset.gainSign = _;
        }
        const g = s.cells.item(8);
        g && g.classList.add("gain-pct-cell");
      }), i.dataset.defaultSort = "name", i.dataset.defaultDir = "asc", qr(i), i.outerHTML;
    }
  } catch (a) {
    console.warn("renderPositionsTable: Konnte Sortier-Metadaten nicht injizieren:", a);
  }
  return r;
}
function _o(e) {
  const t = Nt(e ?? []);
  return Ge(t);
}
function vo(e, t) {
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
    const c = i.closest("tr[data-security]");
    if (!c || !r.contains(c))
      return;
    const s = c.getAttribute("data-security");
    if (s)
      try {
        Ea(s) || console.warn("attachSecurityDetailDelegation: Detail-Tab konnte nicht geöffnet werden für", s);
      } catch (l) {
        console.error("attachSecurityDetailDelegation: Fehler beim Öffnen des Detail-Tabs", l);
      }
  })));
}
function Xe(e, t) {
  vo(e, t);
}
function Wr(e) {
  console.debug("buildExpandablePortfolioTable: render", e.length, "portfolios");
  const t = (S) => S == null || typeof S != "string" && typeof S != "number" && typeof S != "boolean" ? "" : F(S);
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
    const D = Number.isFinite(S.position_count) ? S.position_count : 0, L = Number.isFinite(S.purchase_sum) ? S.purchase_sum : 0, j = S.hasValue && typeof S.current_value == "number" && Number.isFinite(S.current_value) ? S.current_value : null, R = j !== null, z = S.performance, O = typeof S.gain_abs == "number" ? S.gain_abs : typeof z?.gain_abs == "number" ? z.gain_abs : null, Y = typeof S.gain_pct == "number" ? S.gain_pct : typeof z?.gain_pct == "number" ? z.gain_pct : null, X = z && typeof z == "object" ? z.day_change : null, G = typeof S.day_change_abs == "number" ? S.day_change_abs : X && typeof X == "object" ? X.value_change_eur ?? X.price_change_eur : null, ze = typeof S.day_change_pct == "number" ? S.day_change_pct : X && typeof X == "object" && typeof X.change_pct == "number" ? X.change_pct : null, Ce = S.fx_unavailable && R, xa = typeof S.coverage_ratio == "number" && Number.isFinite(S.coverage_ratio) ? S.coverage_ratio : "", Da = typeof S.provenance == "string" ? S.provenance : "", Fa = typeof S.metric_run_uuid == "string" ? S.metric_run_uuid : "", Ve = pt.has(S.uuid), ka = Ve ? "portfolio-toggle expanded" : "portfolio-toggle", An = `portfolio-details-${S.uuid}`, Q = {
      fx_unavailable: S.fx_unavailable,
      purchase_value: L,
      current_value: j,
      day_change_abs: G,
      day_change_pct: ze,
      gain_abs: O,
      gain_pct: Y
    }, Ee = { hasValue: R }, $a = M("purchase_value", Q.purchase_value, Q, Ee), Ra = M("current_value", Q.current_value, Q, Ee), Ta = M("day_change_abs", Q.day_change_abs, Q, Ee), La = M("day_change_pct", Q.day_change_pct, Q, Ee), Ma = M("gain_abs", Q.gain_abs, Q, Ee), Ha = M("gain_pct", Q.gain_pct, Q, Ee), Pn = R && typeof Y == "number" && Number.isFinite(Y) ? `${ae(Y)} %` : "", Ia = R && typeof Y == "number" && Number.isFinite(Y) ? Y > 0 ? "positive" : Y < 0 ? "negative" : "neutral" : "", za = R && typeof j == "number" && Number.isFinite(j) ? j : "", Va = R && typeof O == "number" && Number.isFinite(O) ? O : "", Ua = R && typeof Y == "number" && Number.isFinite(Y) ? Y : "", qa = R && typeof G == "number" && Number.isFinite(G) ? G : "", Wa = R && typeof ze == "number" && Number.isFinite(ze) ? ze : "", Oa = String(D);
    let Dt = "";
    Pn && (Dt = ` data-gain-pct="${t(Pn)}" data-gain-sign="${t(Ia)}"`), Ce && (Dt += ' data-partial="true"'), n += `<tr class="portfolio-row"
                  data-portfolio="${S.uuid}"
                  data-position-count="${Oa}"
                  data-current-value="${t(za)}"
                  data-purchase-sum="${t(L)}"
                  data-day-change="${t(qa)}"
                  data-day-change-pct="${t(Wa)}"
                  data-gain-abs="${t(Va)}"
                data-gain-pct="${t(Ua)}"
                data-has-value="${R ? "true" : "false"}"
                data-fx-unavailable="${S.fx_unavailable ? "true" : "false"}"
                data-coverage-ratio="${t(xa)}"
                data-provenance="${t(Da)}"
                data-metric-run-uuid="${t(Fa)}">`;
    const Ba = F(S.name), Ya = Tr(Ur(S.badges), {
      containerClass: "portfolio-badges"
    });
    n += `<td>
        <button type="button"
                class="${ka}"
                data-portfolio="${S.uuid}"
                aria-expanded="${Ve ? "true" : "false"}"
                aria-controls="${An}">
          <span class="caret">${Ve ? "▼" : "▶"}</span>
          <span class="portfolio-name">${Ba}</span>${Ya}
        </button>
      </td>`;
    const ja = D.toLocaleString("de-DE");
    n += `<td class="align-right">${ja}</td>`, n += `<td class="align-right">${$a}</td>`, n += `<td class="align-right">${Ra}</td>`, n += `<td class="align-right">${Ta}</td>`, n += `<td class="align-right">${La}</td>`, n += `<td class="align-right"${Dt}>${Ma}</td>`, n += `<td class="align-right gain-pct-cell">${Ha}</td>`, n += "</tr>", n += `<tr class="portfolio-details${Ve ? "" : " hidden"}"
                data-portfolio="${S.uuid}"
                id="${An}"
                role="region"
                aria-label="Positionen für ${S.name}">
      <td colspan="${r.length.toString()}">
        <div class="positions-container">${Ve ? Et(S.uuid) ? Ge(Ar(S.uuid)) : dn("Lade Positionen...") : ""}</div>
      </td>
    </tr>`;
  });
  const a = e.filter((S) => typeof S.current_value == "number" && Number.isFinite(S.current_value)), i = e.reduce((S, D) => S + (Number.isFinite(D.position_count) ? D.position_count : 0), 0), o = a.reduce((S, D) => typeof D.current_value == "number" && Number.isFinite(D.current_value) ? S + D.current_value : S, 0), c = a.reduce((S, D) => typeof D.purchase_sum == "number" && Number.isFinite(D.purchase_sum) ? S + D.purchase_sum : S, 0), s = a.map((S) => {
    if (typeof S.day_change_abs == "number")
      return S.day_change_abs;
    const D = S.performance && typeof S.performance == "object" ? S.performance.day_change : null;
    if (D && typeof D == "object") {
      const L = D.value_change_eur;
      if (typeof L == "number" && Number.isFinite(L))
        return L;
    }
    return null;
  }).filter((S) => typeof S == "number" && Number.isFinite(S)), l = s.reduce((S, D) => S + D, 0), d = a.reduce((S, D) => {
    if (typeof D.performance?.gain_abs == "number" && Number.isFinite(D.performance.gain_abs))
      return S + D.performance.gain_abs;
    const L = typeof D.current_value == "number" && Number.isFinite(D.current_value) ? D.current_value : 0, j = typeof D.purchase_sum == "number" && Number.isFinite(D.purchase_sum) ? D.purchase_sum : 0;
    return S + (L - j);
  }, 0), f = a.length > 0, p = a.length !== e.length, u = s.length > 0, g = u && f && o !== 0 ? (() => {
    const S = o - l;
    return S ? l / S * 100 : null;
  })() : null, m = f && c > 0 ? d / c * 100 : null, h = {
    fx_unavailable: p,
    purchase_value: f ? c : null,
    current_value: f ? o : null,
    day_change_abs: u ? l : null,
    day_change_pct: u ? g : null,
    gain_abs: f ? d : null,
    gain_pct: f ? m : null
  }, y = { hasValue: f }, _ = { hasValue: u }, b = M("purchase_value", h.purchase_value, h, y), v = M("current_value", h.current_value, h, y), C = M("day_change_abs", h.day_change_abs, h, _), A = M("day_change_pct", h.day_change_pct, h, _), P = M("gain_abs", h.gain_abs, h, y), N = M("gain_pct", h.gain_pct, h, y);
  let k = "";
  if (f && typeof m == "number" && Number.isFinite(m)) {
    const S = `${ae(m)} %`, D = m > 0 ? "positive" : m < 0 ? "negative" : "neutral";
    k = ` data-gain-pct="${t(S)}" data-gain-sign="${t(D)}"`;
  }
  p && (k += ' data-partial="true"');
  const I = String(Math.round(i)), w = f ? String(o) : "", x = f ? String(c) : "", U = u ? String(l) : "", E = u && typeof g == "number" && Number.isFinite(g) ? String(g) : "", $ = f ? String(d) : "", K = f && typeof m == "number" && Number.isFinite(m) ? String(m) : "";
  return n += `<tr class="footer-row"
      data-position-count="${I}"
      data-current-value="${t(w)}"
      data-purchase-sum="${t(x)}"
      data-day-change="${t(U)}"
      data-day-change-pct="${t(E)}"
      data-gain-abs="${t($)}"
      data-gain-pct="${t(K)}"
      data-has-value="${f ? "true" : "false"}"
      data-fx-unavailable="${p ? "true" : "false"}">
      <td>Summe</td>
      <td class="align-right">${Math.round(i).toLocaleString("de-DE")}</td>
    <td class="align-right">${b}</td>
    <td class="align-right">${v}</td>
    <td class="align-right">${C}</td>
    <td class="align-right">${A}</td>
    <td class="align-right"${k}>${P}</td>
    <td class="align-right gain-pct-cell">${N}</td>
  </tr>`, n += "</tbody></table>", n;
}
function So(e) {
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
function qe(e) {
  if (e === void 0)
    return null;
  const t = Number(e);
  return Number.isFinite(t) ? t : null;
}
function Or(e) {
  const t = So(e);
  if (!t)
    return;
  const n = t.tBodies.item(0);
  if (!n)
    return;
  const r = Array.from(n.querySelectorAll("tr.portfolio-row"));
  if (!r.length)
    return;
  let a = 0, i = 0, o = 0, c = 0, s = 0, l = !1, d = !1, f = !0, p = !1;
  for (const L of r) {
    const j = qe(L.dataset.positionCount);
    j != null && (a += j), L.dataset.fxUnavailable === "true" && (p = !0);
    const R = L.dataset.hasValue;
    if (!!(R === "false" || R === "0" || R === "" || R == null)) {
      f = !1;
      continue;
    }
    l = !0;
    const O = qe(L.dataset.currentValue), Y = qe(L.dataset.gainAbs), X = qe(L.dataset.purchaseSum), G = qe(L.dataset.dayChange);
    if (O == null || Y == null || X == null) {
      f = !1;
      continue;
    }
    i += O, c += Y, o += X, G != null && (s += G, d = !0);
  }
  const u = l && f, g = u && o > 0 ? c / o * 100 : null, m = d && u && i !== 0 ? (() => {
    const L = i - s;
    return L ? s / L * 100 : null;
  })() : null;
  let h = Array.from(n.children).find(
    (L) => L instanceof HTMLTableRowElement && L.classList.contains("footer-row")
  );
  h || (h = document.createElement("tr"), h.classList.add("footer-row"), n.appendChild(h));
  const y = Math.round(a).toLocaleString("de-DE"), _ = {
    fx_unavailable: p || !u,
    purchase_value: u ? o : null,
    current_value: u ? i : null,
    day_change_abs: d && u ? s : null,
    day_change_pct: d && u ? m : null,
    gain_abs: u ? c : null,
    gain_pct: u ? g : null
  }, b = { hasValue: u }, v = { hasValue: d && u }, C = M("purchase_value", _.purchase_value, _, b), A = M("current_value", _.current_value, _, b), P = M("day_change_abs", _.day_change_abs, _, v), N = M("day_change_pct", _.day_change_pct, _, v), k = M("gain_abs", _.gain_abs, _, b), I = M("gain_pct", _.gain_pct, _, b), w = t.tHead ? t.tHead.rows.item(0) : null, x = w ? w.cells.length : 0, U = h.cells.length, E = x || U, $ = E > 0 ? E <= 5 : !1, K = u && typeof g == "number" ? `${ae(g)} %` : "", S = u && typeof g == "number" ? g > 0 ? "positive" : g < 0 ? "negative" : "neutral" : "neutral";
  $ ? h.innerHTML = `
      <td>Summe</td>
      <td class="align-right">${y}</td>
      <td class="align-right">${A}</td>
      <td class="align-right">${k}</td>
      <td class="align-right gain-pct-cell">${I}</td>
    ` : h.innerHTML = `
      <td>Summe</td>
      <td class="align-right">${y}</td>
      <td class="align-right">${C}</td>
      <td class="align-right">${A}</td>
      <td class="align-right">${P}</td>
      <td class="align-right">${N}</td>
      <td class="align-right">${k}</td>
      <td class="align-right">${I}</td>
    `;
  const D = h.cells.item($ ? 3 : 6);
  D && (D.dataset.gainPct = K || "—", D.dataset.gainSign = S), h.dataset.positionCount = String(Math.round(a)), h.dataset.currentValue = u ? String(i) : "", h.dataset.purchaseSum = u ? String(o) : "", h.dataset.dayChange = u && d ? String(s) : "", h.dataset.dayChangePct = u && d && typeof m == "number" ? String(m) : "", h.dataset.gainAbs = u ? String(c) : "", h.dataset.gainPct = u && typeof g == "number" ? String(g) : "", h.dataset.hasValue = u ? "true" : "false", h.dataset.fxUnavailable = p ? "true" : "false";
}
function Ze(e, t) {
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
  const i = (u, g) => {
    const m = a.querySelector("tbody");
    if (!m) return;
    const h = Array.from(m.querySelectorAll("tr")).filter((v) => !v.classList.contains("footer-row")), y = m.querySelector("tr.footer-row"), _ = (v) => {
      if (v == null) return 0;
      const C = v.replace(/\u00A0/g, " ").replace(/[%€]/g, "").replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, ""), A = Number.parseFloat(C);
      return Number.isFinite(A) ? A : 0;
    };
    h.sort((v, C) => {
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
      }[u], N = v.cells.item(P), k = C.cells.item(P);
      let I = "";
      if (N) {
        const E = N.textContent;
        typeof E == "string" && (I = E.trim());
      }
      let w = "";
      if (k) {
        const E = k.textContent;
        typeof E == "string" && (w = E.trim());
      }
      const x = (E, $) => {
        const K = E ? E.dataset.sortValue : void 0;
        if (K != null && K !== "") {
          const S = Number(K);
          if (Number.isFinite(S))
            return S;
        }
        return _($);
      };
      let U;
      if (u === "name")
        U = I.localeCompare(w, "de", { sensitivity: "base" });
      else {
        const E = x(N, I), $ = x(k, w);
        U = E - $;
      }
      return g === "asc" ? U : -U;
    }), a.querySelectorAll("thead th.sort-active").forEach((v) => {
      v.classList.remove("sort-active", "dir-asc", "dir-desc");
    }), a.querySelectorAll("thead th[aria-sort]").forEach((v) => {
      v.setAttribute("aria-sort", "none");
    });
    const b = a.querySelector(`thead th[data-sort-key="${u}"]`);
    b && (b.classList.add("sort-active", g === "asc" ? "dir-asc" : "dir-desc"), b.setAttribute("aria-sort", g === "asc" ? "ascending" : "descending")), h.forEach((v) => m.appendChild(v)), y && m.appendChild(y);
  }, o = r.dataset.sortKey, c = r.dataset.sortDir, s = a.dataset.defaultSort, l = a.dataset.defaultDir, d = Rt(o) ? o : Rt(s) ? s : "name", f = Tt(c) ? c : Tt(l) ? l : "asc";
  i(d, f);
  const p = (u) => {
    const g = u.target;
    if (!(g instanceof Element))
      return;
    const m = g.closest("th[data-sort-key]");
    if (!m || !a.contains(m)) return;
    const h = m.getAttribute("data-sort-key");
    if (!Rt(h))
      return;
    let y = "asc";
    r.dataset.sortKey === h && (y = (Tt(r.dataset.sortDir) ? r.dataset.sortDir : "asc") === "asc" ? "desc" : "asc"), r.dataset.sortKey = h, r.dataset.sortDir = y, i(h, y);
  };
  a.addEventListener("click", (u) => {
    p(u);
  }), a.addEventListener("keydown", (u) => {
    (u.key === "Enter" || u.key === " ") && (u.preventDefault(), p(u));
  });
}
async function wo(e, t, n) {
  if (!e || !dt || !ft) return;
  const r = t || n.querySelector(
    `.portfolio-details[data-portfolio="${e}"] .positions-container`
  );
  if (!r)
    return;
  const a = r.closest(".portfolio-details");
  if (!(a && a.classList.contains("hidden"))) {
    r.innerHTML = dn("Neu laden...");
    try {
      const i = await Sr(
        dt,
        ft,
        e
      );
      if (i.error) {
        const c = typeof i.error == "string" ? i.error : String(i.error);
        r.innerHTML = `<div class="error">${F(c)} <button class="retry-pos" data-portfolio="${e}">Erneut laden</button></div>`;
        return;
      }
      const o = Nt(
        Array.isArray(i.positions) ? i.positions : []
      );
      ct(e, o), lt(e, o), r.innerHTML = Ge(o);
      try {
        Ze(n, e);
      } catch (c) {
        console.warn("attachPortfolioToggleHandler: Sort-Init (Lazy) fehlgeschlagen:", c);
      }
      try {
        Xe(n, e);
      } catch (c) {
        console.warn("reloadPortfolioPositions: Security-Listener konnte nicht gebunden werden:", c);
      }
    } catch (i) {
      const o = i instanceof Error ? i.message : String(i);
      r.innerHTML = `<div class="error">Fehler: ${F(o)} <button class="retry-pos" data-portfolio="${e}">Retry</button></div>`;
    }
  }
}
async function Co(e, t, n = 3e3, r = 50) {
  const a = performance.now();
  return new Promise((i) => {
    const o = () => {
      const c = e.querySelector(t);
      if (c) {
        i(c);
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
function yn(e) {
  const n = (typeof e.__ppReaderAttachToken == "number" ? e.__ppReaderAttachToken : 0) + 1;
  e.__ppReaderAttachToken = n, e.__ppReaderAttachInProgress = !0, (async () => {
    try {
      const r = await Co(e, ".portfolio-table");
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
            const c = o.closest(".retry-pos");
            if (c && r.contains(c)) {
              const u = c.getAttribute("data-portfolio");
              if (u) {
                const m = e.querySelector(
                  `.portfolio-details[data-portfolio="${u}"]`
                )?.querySelector(".positions-container");
                await wo(u, m ?? null, e);
              }
              return;
            }
            const s = o.closest(".portfolio-toggle");
            if (!s || !r.contains(s)) return;
            const l = s.getAttribute("data-portfolio");
            if (!l) return;
            const d = e.querySelector(
              `.portfolio-details[data-portfolio="${l}"]`
            );
            if (!d) return;
            const f = s.querySelector(".caret");
            if (d.classList.contains("hidden")) {
              d.classList.remove("hidden"), s.classList.add("expanded"), s.setAttribute("aria-expanded", "true"), f && (f.textContent = "▼"), pt.add(l);
              try {
                mn(e, l);
              } catch (u) {
                console.warn("attachPortfolioToggleHandler: Pending-Flush fehlgeschlagen:", u);
              }
              if (Et(l)) {
                const u = d.querySelector(".positions-container");
                if (u) {
                  u.innerHTML = Ge(
                    Ar(l)
                  ), Ze(e, l);
                  try {
                    Xe(e, l);
                  } catch (g) {
                    console.warn("attachPortfolioToggleHandler: Security-Listener (Cache) Fehler:", g);
                  }
                }
              } else {
                const u = d.querySelector(".positions-container");
                u && (u.innerHTML = dn("Lade Positionen..."));
                try {
                  const g = await Sr(
                    dt,
                    ft,
                    l
                  );
                  if (g.error) {
                    const h = typeof g.error == "string" ? g.error : String(g.error);
                    u && (u.innerHTML = `<div class="error">${F(h)} <button class="retry-pos" data-portfolio="${l}">Erneut laden</button></div>`);
                    return;
                  }
                  const m = Nt(
                    Array.isArray(g.positions) ? g.positions : []
                  );
                  if (ct(l, m), lt(
                    l,
                    m
                  ), u) {
                    u.innerHTML = Ge(m);
                    try {
                      Ze(e, l);
                    } catch (h) {
                      console.warn("attachPortfolioToggleHandler: Sort-Init (Lazy) fehlgeschlagen:", h);
                    }
                    try {
                      Xe(e, l);
                    } catch (h) {
                      console.warn("attachPortfolioToggleHandler: Security-Listener konnte nicht gebunden werden:", h);
                    }
                  }
                } catch (g) {
                  const m = g instanceof Error ? g.message : String(g), h = d.querySelector(".positions-container");
                  h && (h.innerHTML = `<div class="error">Fehler beim Laden: ${F(m)} <button class="retry-pos" data-portfolio="${l}">Retry</button></div>`), console.error("Fehler beim Lazy Load für", l, g);
                }
              }
            } else
              d.classList.add("hidden"), s.classList.remove("expanded"), s.setAttribute("aria-expanded", "false"), f && (f.textContent = "▶"), pt.delete(l);
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
function Ao(e) {
  const t = e.querySelector(".expandable-portfolio-table");
  t && (t.__ppReaderPortfolioFallbackBound || (t.__ppReaderPortfolioFallbackBound = !0, t.addEventListener("click", (n) => {
    const r = n.target;
    !(r instanceof Element) || !r.closest(".portfolio-toggle") || e.querySelector(".portfolio-table")?.__ppReaderPortfolioToggleBound || (console.debug("Fallback-Listener aktiv – re-attach Hauptlistener"), yn(e));
  })));
}
async function Br(e, t, n) {
  dt = t ?? null, ft = n ?? null, console.debug(
    "renderDashboard: start – panelConfig:",
    n?.config,
    "derived entry_id?",
    n?.config?._panel_custom?.config?.entry_id
  );
  const r = await ii(t, n);
  Nr(r.accounts);
  const a = Rr(), i = await si(t, n);
  Fi(i.portfolios);
  const o = zi();
  let c = "";
  try {
    c = await oi(t, n);
  } catch {
    c = "";
  }
  const s = a.reduce(
    (w, x) => w + (typeof x.balance == "number" && Number.isFinite(x.balance) ? x.balance : 0),
    0
  ), l = o.some((w) => w.fx_unavailable), d = a.some((w) => w.fx_unavailable && (w.balance == null || !Number.isFinite(w.balance))), f = o.reduce((w, x) => x.hasValue && typeof x.current_value == "number" && Number.isFinite(x.current_value) ? w + x.current_value : w, 0), p = s + f, u = "Teilw. fehlende FX-Kurse – Gesamtvermögen abweichend", m = o.some((w) => w.hasValue && typeof w.current_value == "number" && Number.isFinite(w.current_value)) || a.some((w) => typeof w.balance == "number" && Number.isFinite(w.balance)) ? `${ae(p)}&nbsp;€` : `<span class="missing-value" role="note" aria-label="${u}" title="${u}">—</span>`, h = l || d ? `<span class="total-wealth-note">${u}</span>` : "", y = `
    <div class="header-meta-row">
      💰 Gesamtvermögen: <strong class="total-wealth-value">${m}</strong>${h}
    </div>
  `, _ = un("Übersicht", y), b = Wr(o), v = a.filter((w) => (w.currency_code ?? "EUR") === "EUR"), C = a.filter((w) => (w.currency_code ?? "EUR") !== "EUR"), P = C.some((w) => w.fx_unavailable) ? `
        <p class="table-note" role="note">
          <span class="table-note__icon" aria-hidden="true">⚠️</span>
          <span>Wechselkurse konnten nicht geladen werden. EUR-Werte werden derzeit nicht angezeigt.</span>
        </p>
      ` : "", N = `
    <div class="card">
      <h2>Liquidität</h2>
      <div class="scroll-container account-table">
        ${Re(
    v.map((w) => ({
      name: ut(w.name, qn(w.badges), {
        containerClass: "account-name",
        labelClass: "account-name__label"
      }),
      balance: w.balance ?? null
    })),
    [
      { key: "name", label: "Name" },
      { key: "balance", label: "Kontostand (EUR)", align: "right" }
    ],
    ["balance"]
  )}
      </div>
    </div>
    ${C.length ? `
      <div class="card">
        <h2>Fremdwährungen</h2>
        <div class="scroll-container fx-account-table">
          ${Re(
    C.map((w) => {
      const x = w.orig_balance, E = typeof x == "number" && Number.isFinite(x) ? `${x.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}&nbsp;${w.currency_code ?? ""}` : "";
      return {
        name: ut(w.name, qn(w.badges), {
          containerClass: "account-name",
          labelClass: "account-name__label"
        }),
        fx_display: E,
        balance: w.balance ?? null
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
  `, k = `
    <div class="card footer-card">
      <div class="meta">
        <div class="last-file-update">
          📂 Letzte Aktualisierung der Datei: <strong>${c || "Unbekannt"}</strong>
        </div>
      </div>
    </div>
  `, I = `
    ${_.outerHTML}
    <div class="card">
      <h2>Investment</h2>
      <div class="scroll-container portfolio-table">
        ${b}
      </div>
    </div>
    ${N}
    ${k}
  `;
  return Po(e, o), I;
}
function Po(e, t) {
  if (!e)
    return;
  const n = () => {
    try {
      const a = e, i = a.querySelector(".portfolio-table");
      i && i.querySelectorAll(".portfolio-toggle").length === 0 && (console.debug("Recovery: Tabelle ohne Buttons – erneuter Aufbau"), i.innerHTML = Wr(t)), yn(e), Ao(e), pt.forEach((o) => {
        try {
          Et(o) && (Ze(e, o), Xe(e, o));
        } catch (c) {
          console.warn("Init-Sortierung für expandiertes Depot fehlgeschlagen:", o, c);
        }
      });
      try {
        Or(a);
      } catch (o) {
        console.warn("renderDashboard: Footer-Summe konnte nicht aktualisiert werden:", o);
      }
      try {
        no(e);
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
Ja({
  renderPositionsTable: (e) => _o(e),
  applyGainPctMetadata: qr,
  attachSecurityDetailListener: Xe,
  attachPortfolioPositionsSorting: Ze,
  updatePortfolioFooter: (e) => {
    e && Or(e);
  }
});
const Eo = "http://www.w3.org/2000/svg", xe = 640, De = 260, We = { top: 12, right: 16, bottom: 24, left: 16 }, Oe = "var(--pp-reader-chart-line, #3f51b5)", Yt = "var(--pp-reader-chart-area, rgba(63, 81, 181, 0.12))", Yn = "0.75rem", Yr = "var(--pp-reader-chart-baseline, rgba(96, 125, 139, 0.75))", jr = "6 4", No = 1440 * 60 * 1e3;
function xo(e) {
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
function Do(e) {
  return typeof e == "string" ? e : typeof e == "number" && Number.isFinite(e) ? e.toString() : e instanceof Date && Number.isFinite(e.getTime()) ? e.toISOString() : "";
}
function ee(e) {
  return `${String(e)}px`;
}
function oe(e, t = {}) {
  const n = document.createElementNS(Eo, e);
  return Object.entries(t).forEach(([r, a]) => {
    const i = xo(a);
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
function Kr(e, t) {
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
const Gr = (e) => {
  if (e && typeof e == "object" && "date" in e)
    return e.date;
}, Xr = (e) => {
  if (e && typeof e == "object" && "close" in e)
    return e.close;
}, Zr = (e, t, n) => {
  if (Number.isFinite(e)) {
    const r = new Date(e);
    if (!Number.isNaN(r.getTime()))
      return r.toLocaleDateString("de-DE");
  }
  if (t && typeof t == "object" && "date" in t) {
    const r = t.date, a = Do(r);
    if (a)
      return a;
  }
  return Number.isFinite(e) ? e.toString() : "";
}, Jr = (e, t, n) => (Number.isFinite(e) ? e : gt(e, 0) ?? 0).toLocaleString("de-DE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
}), Qr = ({ xFormatted: e, yFormatted: t }) => `
    <div class="chart-tooltip-date">${F(e)}</div>
    <div class="chart-tooltip-value">${F(t)}&nbsp;€</div>
  `, ea = ({
  marker: e,
  xFormatted: t,
  yFormatted: n
}) => {
  const r = typeof e.label == "string" ? e.label : null;
  return `
    <div class="chart-tooltip-date">${F(r || t)}</div>
    <div class="chart-tooltip-value">${F(n)}</div>
  `;
};
function ta(e) {
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
    width: xe,
    height: De,
    margin: { ...We },
    series: [],
    points: [],
    range: null,
    xAccessor: Gr,
    yAccessor: Xr,
    xFormatter: Zr,
    yFormatter: Jr,
    tooltipRenderer: Qr,
    markerTooltipRenderer: ea,
    color: Oe,
    areaColor: Yt,
    baseline: null,
    handlersAttached: !1,
    markers: [],
    markerPositions: []
  }), e.__chartState;
}
function re(e, t, n) {
  return !Number.isFinite(e) || e < t ? t : e > n ? n : e;
}
function Fo(e, t) {
  if (e.length === 0)
    return "";
  const n = [];
  e.forEach((o, c) => {
    const s = c === 0 ? "M" : "L", l = o.x.toFixed(2), d = o.y.toFixed(2);
    n.push(`${s}${l} ${d}`);
  });
  const r = e[0], i = `L${e[e.length - 1].x.toFixed(2)} ${t.toFixed(2)} L${r.x.toFixed(2)} ${t.toFixed(2)} Z`;
  return `${n.join(" ")} ${i}`;
}
function ko(e) {
  if (e.length === 0)
    return "";
  const t = [];
  return e.forEach((n, r) => {
    const a = r === 0 ? "M" : "L", i = n.x.toFixed(2), o = n.y.toFixed(2);
    t.push(`${a}${i} ${o}`);
  }), t.join(" ");
}
function $o(e) {
  const { baselineLine: t, baseline: n } = e;
  if (!t)
    return;
  const r = n?.color ?? Yr, a = n?.dashArray ?? jr;
  t.setAttribute("stroke", r), t.setAttribute("stroke-dasharray", a);
}
function Lt(e) {
  const { baselineLine: t, baseline: n, range: r, margin: a, width: i } = e;
  if (!t)
    return;
  const o = n?.value;
  if (!r || o == null || !Number.isFinite(o)) {
    t.style.opacity = "0";
    return;
  }
  const { minY: c, maxY: s, boundedHeight: l } = r, d = Number.isFinite(c) ? c : o, p = (Number.isFinite(s) ? s : d + 1) - d, u = p === 0 ? 0.5 : (o - d) / p, g = re(u, 0, 1), m = Math.max(l, 0), h = a.top + (1 - g) * m, y = Math.max(i - a.left - a.right, 0), _ = a.left, b = a.left + y;
  t.setAttribute("x1", _.toFixed(2)), t.setAttribute("x2", b.toFixed(2)), t.setAttribute("y1", h.toFixed(2)), t.setAttribute("y2", h.toFixed(2)), t.style.opacity = "1";
}
function Ro(e, t, n) {
  const { width: r, height: a, margin: i } = t, { xAccessor: o, yAccessor: c } = n;
  if (e.length === 0)
    return { points: [], range: null };
  const s = e.map((E, $) => {
    const K = o(E, $), S = c(E, $), D = Kr(K, $), L = gt(S, Number.NaN);
    return Number.isFinite(L) ? {
      index: $,
      data: E,
      xValue: D,
      yValue: L
    } : null;
  }).filter((E) => !!E);
  if (s.length === 0)
    return { points: [], range: null };
  const l = s.reduce((E, $) => Math.min(E, $.xValue), s[0].xValue), d = s.reduce((E, $) => Math.max(E, $.xValue), s[0].xValue), f = s.reduce((E, $) => Math.min(E, $.yValue), s[0].yValue), p = s.reduce((E, $) => Math.max(E, $.yValue), s[0].yValue), u = Math.max(r - i.left - i.right, 1), g = Math.max(a - i.top - i.bottom, 1), m = Number.isFinite(l) ? l : 0, h = Number.isFinite(d) ? d : m + 1, y = Number.isFinite(f) ? f : 0, _ = Number.isFinite(p) ? p : y + 1, b = gt(t.baseline?.value, null), v = b != null && Number.isFinite(b) ? Math.min(y, b) : y, C = b != null && Number.isFinite(b) ? Math.max(_, b) : _, A = Math.max(
    2,
    Math.min(
      6,
      Math.round(
        Math.max(a - i.top - i.bottom, 0) / 60
      ) || 4
    )
  ), { niceMin: P, niceMax: N } = Vo(
    v,
    C,
    A
  ), k = Number.isFinite(P) ? P : y, I = Number.isFinite(N) ? N : _, w = h - m || 1, x = I - k || 1;
  return {
    points: s.map((E) => {
      const $ = w === 0 ? 0.5 : (E.xValue - m) / w, K = x === 0 ? 0.5 : (E.yValue - k) / x, S = i.left + $ * u, D = i.top + (1 - K) * g;
      return {
        ...E,
        x: S,
        y: D
      };
    }),
    range: {
      minX: m,
      maxX: h,
      minY: k,
      maxY: I,
      boundedWidth: u,
      boundedHeight: g
    }
  };
}
function Mt(e) {
  const { markerLayer: t, markerOverlay: n, markers: r, range: a, margin: i, markerTooltip: o } = e;
  if (e.markerPositions = [], it(e), !t || !n)
    return;
  for (; t.firstChild; )
    t.removeChild(t.firstChild);
  for (; n.firstChild; )
    n.removeChild(n.firstChild);
  if (!a || !Array.isArray(r) || r.length === 0)
    return;
  const c = a.maxX - a.minX || 1, s = a.maxY - a.minY || 1;
  r.forEach((l, d) => {
    const f = Kr(l.x, d), p = gt(l.y, Number.NaN), u = Number(p);
    if (!Number.isFinite(f) || !Number.isFinite(u))
      return;
    const g = c === 0 ? 0.5 : re((f - a.minX) / c, 0, 1), m = s === 0 ? 0.5 : re((u - a.minY) / s, 0, 1), h = i.left + g * a.boundedWidth, y = i.top + (1 - m) * a.boundedHeight, _ = oe("g", {
      class: "line-chart-marker",
      transform: `translate(${h.toFixed(2)} ${y.toFixed(2)})`,
      "data-marker-id": l.id
    }), b = oe("circle", {
      r: 5,
      fill: l.color || e.color,
      stroke: "#fff",
      "stroke-width": 2,
      opacity: 0.95
    });
    _.appendChild(b), t.appendChild(_), e.markerPositions.push({
      marker: l,
      x: h,
      y
    });
  }), o && (o.style.opacity = "0", o.style.visibility = "hidden");
}
function na(e, t, n, r) {
  e.width = Number.isFinite(t) ? Number(t) : xe, e.height = Number.isFinite(n) ? Number(n) : De, e.margin = {
    top: Number.isFinite(r?.top) ? Number(r?.top) : We.top,
    right: Number.isFinite(r?.right) ? Number(r?.right) : We.right,
    bottom: Number.isFinite(r?.bottom) ? Number(r?.bottom) : We.bottom,
    left: Number.isFinite(r?.left) ? Number(r?.left) : We.left
  };
}
function To(e, t) {
  const n = e.xFormatter(t.xValue, t.data, t.index), r = e.yFormatter(t.yValue, t.data, t.index);
  return e.tooltipRenderer({
    point: t,
    xFormatted: n,
    yFormatted: r,
    data: t.data,
    index: t.index
  });
}
function Lo(e, t, n, r = null) {
  const { tooltip: a, width: i, margin: o, height: c } = e;
  if (!a)
    return;
  const s = r && Number.isFinite(r.scaleX) && r.scaleX > 0 ? r.scaleX : 1, l = r && Number.isFinite(r.scaleY) && r.scaleY > 0 ? r.scaleY : 1, d = c - o.bottom;
  a.style.visibility = "visible", a.style.opacity = "1";
  const f = a.offsetWidth || 0, p = a.offsetHeight || 0, u = t.x * s, g = re(
    u - f / 2,
    o.left * s,
    (i - o.right) * s - f
  ), m = Math.max(d * l - p, 0), h = 12, _ = (Number.isFinite(n) ? re(n ?? 0, o.top, d) : t.y) * l;
  let b = _ - p - h;
  b < o.top * l && (b = _ + h), b = re(b, 0, m);
  const v = ee(Math.round(g)), C = ee(Math.round(b));
  a.style.transform = `translate(${v}, ${C})`;
}
function jt(e) {
  const { tooltip: t, focusLine: n, focusCircle: r } = e;
  t && (t.style.opacity = "0", t.style.visibility = "hidden"), n && (n.style.opacity = "0"), r && (r.style.opacity = "0");
}
function Mo(e, t) {
  const { marker: n } = t, r = e.xFormatter(t.marker.x, n, -1), a = e.yFormatter(t.marker.y, n, -1);
  return e.markerTooltipRenderer({
    marker: n,
    xFormatted: r,
    yFormatted: a
  });
}
function Ho(e, t, n, r = null) {
  const { markerTooltip: a, width: i, margin: o, height: c, tooltip: s } = e;
  if (!a)
    return;
  const l = r && Number.isFinite(r.scaleX) && r.scaleX > 0 ? r.scaleX : 1, d = r && Number.isFinite(r.scaleY) && r.scaleY > 0 ? r.scaleY : 1, f = c - o.bottom;
  a.style.visibility = "visible", a.style.opacity = "1";
  const p = a.offsetWidth || 0, u = a.offsetHeight || 0, g = t.x * l, m = re(
    g - p / 2,
    o.left * l,
    (i - o.right) * l - p
  ), h = Math.max(f * d - u, 0), y = 10, _ = s?.getBoundingClientRect(), b = e.svg?.getBoundingClientRect(), v = _ && b ? _.top - b.top : null, C = _ && b ? _.bottom - b.top : null, P = (Number.isFinite(n) ? re(n ?? t.y, o.top, f) : t.y) * d;
  let N;
  v != null && C != null ? v <= P ? N = v - u - y : N = C + y : (N = P - u - y, N < o.top * d && (N = P + y)), N = re(N, 0, h);
  const k = ee(Math.round(m)), I = ee(Math.round(N));
  a.style.transform = `translate(${k}, ${I})`;
}
function it(e) {
  const { markerTooltip: t } = e;
  t && (t.style.opacity = "0", t.style.visibility = "hidden");
}
function Io(e, t, n) {
  let a = null, i = 576;
  for (const o of e.markerPositions) {
    const c = o.x - t, s = o.y - n, l = c * c + s * s;
    l <= i && (a = o, i = l);
  }
  return a;
}
function zo(e, t) {
  if (t.handlersAttached || !t.overlay)
    return;
  const n = (a) => {
    if (t.points.length === 0 || !t.svg) {
      jt(t), it(t);
      return;
    }
    const i = t.svg.getBoundingClientRect(), o = t.width || xe, c = t.height || De, s = i.width && Number.isFinite(i.width) && Number.isFinite(o) && o > 0 ? i.width / o : 1, l = i.height && Number.isFinite(i.height) && Number.isFinite(c) && c > 0 ? i.height / c : 1, d = s > 0 ? 1 / s : 1, f = l > 0 ? 1 / l : 1, p = (a.clientX - i.left) * d, u = (a.clientY - i.top) * f, g = {
      scaleX: s,
      scaleY: l
    };
    let m = t.points[0], h = Math.abs(p - m.x);
    for (let _ = 1; _ < t.points.length; _ += 1) {
      const b = t.points[_], v = Math.abs(p - b.x);
      v < h && (h = v, m = b);
    }
    t.focusCircle && (t.focusCircle.setAttribute("cx", m.x.toFixed(2)), t.focusCircle.setAttribute("cy", m.y.toFixed(2)), t.focusCircle.style.opacity = "1"), t.focusLine && (t.focusLine.setAttribute("x1", m.x.toFixed(2)), t.focusLine.setAttribute("x2", m.x.toFixed(2)), t.focusLine.setAttribute("y1", t.margin.top.toFixed(2)), t.focusLine.setAttribute(
      "y2",
      (t.height - t.margin.bottom).toFixed(2)
    ), t.focusLine.style.opacity = "1"), t.tooltip && (t.tooltip.innerHTML = To(t, m), Lo(t, m, u, g));
    const y = Io(t, p, u);
    y && t.markerTooltip ? (t.markerTooltip.innerHTML = Mo(t, y), Ho(t, y, u, g)) : it(t);
  }, r = () => {
    jt(t), it(t);
  };
  t.overlay.addEventListener("pointermove", n), t.overlay.addEventListener("pointerenter", n), t.overlay.addEventListener("pointerleave", r), t.handlersAttached = !0, t.handlePointerMove = n, t.handlePointerLeave = r, e.addEventListener("pointercancel", r);
}
function ra(e, t = {}) {
  const n = document.createElement("div");
  n.className = "line-chart-container", n.dataset.chartType = "line", n.style.position = "relative";
  const r = oe("svg", {
    width: xe,
    height: De,
    viewBox: `0 0 ${String(xe)} ${String(De)}`,
    role: "img",
    "aria-hidden": "true",
    focusable: "false"
  });
  r.classList.add("line-chart-svg");
  const a = oe("path", {
    class: "line-chart-area",
    fill: Yt,
    stroke: "none"
  }), i = oe("line", {
    class: "line-chart-baseline",
    stroke: Yr,
    "stroke-width": 1,
    "stroke-dasharray": jr,
    opacity: 0
  }), o = oe("path", {
    class: "line-chart-path",
    fill: "none",
    stroke: Oe,
    "stroke-width": 2,
    "stroke-linecap": "round",
    "stroke-linejoin": "round"
  }), c = oe("line", {
    class: "line-chart-focus-line",
    stroke: Oe,
    "stroke-width": 1,
    "stroke-dasharray": "4 4",
    opacity: 0
  }), s = oe("circle", {
    class: "line-chart-focus-circle",
    r: 4,
    fill: "#fff",
    stroke: Oe,
    "stroke-width": 2,
    opacity: 0
  }), l = oe("g", {
    class: "line-chart-markers"
  }), d = oe("rect", {
    class: "line-chart-overlay",
    fill: "transparent",
    x: 0,
    y: 0,
    width: xe,
    height: De
  });
  r.appendChild(a), r.appendChild(i), r.appendChild(o), r.appendChild(c), r.appendChild(s), r.appendChild(l), r.appendChild(d), n.appendChild(r);
  const f = document.createElement("div");
  f.className = "chart-tooltip", f.style.position = "absolute", f.style.top = "0", f.style.left = "0", f.style.pointerEvents = "none", f.style.opacity = "0", f.style.visibility = "hidden", n.appendChild(f);
  const p = document.createElement("div");
  p.className = "line-chart-marker-overlay", p.style.position = "absolute", p.style.top = "0", p.style.left = "0", p.style.width = "100%", p.style.height = "100%", p.style.pointerEvents = "none", p.style.overflow = "visible", p.style.zIndex = "2", n.appendChild(p);
  const u = document.createElement("div");
  u.className = "chart-tooltip chart-tooltip--marker", u.style.position = "absolute", u.style.top = "0", u.style.left = "0", u.style.pointerEvents = "none", u.style.opacity = "0", u.style.visibility = "hidden", n.appendChild(u), e.appendChild(n);
  const g = ta(n);
  if (g.svg = r, g.areaPath = a, g.linePath = o, g.baselineLine = i, g.focusLine = c, g.focusCircle = s, g.overlay = d, g.tooltip = f, g.markerOverlay = p, g.markerLayer = l, g.markerTooltip = u, g.xAccessor = t.xAccessor ?? Gr, g.yAccessor = t.yAccessor ?? Xr, g.xFormatter = t.xFormatter ?? Zr, g.yFormatter = t.yFormatter ?? Jr, g.tooltipRenderer = t.tooltipRenderer ?? Qr, g.markerTooltipRenderer = t.markerTooltipRenderer ?? ea, g.color = t.color ?? Oe, g.areaColor = t.areaColor ?? Yt, g.baseline = t.baseline ?? null, g.handlersAttached = !1, g.markers = Array.isArray(t.markers) ? t.markers.slice() : [], !g.xAxis) {
    const m = document.createElement("div");
    m.className = "line-chart-axis line-chart-axis-x", m.style.position = "absolute", m.style.left = "0", m.style.right = "0", m.style.bottom = "0", m.style.pointerEvents = "none", m.style.fontSize = Yn, m.style.color = "var(--secondary-text-color)", m.style.display = "block", n.appendChild(m), g.xAxis = m;
  }
  if (!g.yAxis) {
    const m = document.createElement("div");
    m.className = "line-chart-axis line-chart-axis-y", m.style.position = "absolute", m.style.top = "0", m.style.bottom = "0", m.style.left = "0", m.style.pointerEvents = "none", m.style.fontSize = Yn, m.style.color = "var(--secondary-text-color)", m.style.display = "block", n.appendChild(m), g.yAxis = m;
  }
  return na(g, t.width, t.height, t.margin), o.setAttribute("stroke", g.color), c.setAttribute("stroke", g.color), s.setAttribute("stroke", g.color), a.setAttribute("fill", g.areaColor), bn(n, t), zo(n, g), n;
}
function bn(e, t = {}) {
  if (!e) {
    console.error("updateLineChart: container element is required");
    return;
  }
  const n = ta(e);
  if (!n.svg || !n.linePath || !n.overlay) {
    console.error("updateLineChart: chart was not initialised with renderLineChart");
    return;
  }
  t.xAccessor && (n.xAccessor = t.xAccessor), t.yAccessor && (n.yAccessor = t.yAccessor), t.xFormatter && (n.xFormatter = t.xFormatter), t.yFormatter && (n.yFormatter = t.yFormatter), t.tooltipRenderer && (n.tooltipRenderer = t.tooltipRenderer), t.markerTooltipRenderer && (n.markerTooltipRenderer = t.markerTooltipRenderer), t.color && (n.color = t.color, n.linePath.setAttribute("stroke", n.color), n.focusLine && n.focusLine.setAttribute("stroke", n.color), n.focusCircle && n.focusCircle.setAttribute("stroke", n.color)), t.areaColor && (n.areaColor = t.areaColor, n.areaPath && n.areaPath.setAttribute("fill", n.areaColor)), Object.prototype.hasOwnProperty.call(t, "baseline") && (n.baseline = t.baseline ?? null), Array.isArray(t.markers) && (n.markers = t.markers.slice()), $o(n), na(n, t.width, t.height, t.margin);
  const { width: r, height: a } = n;
  n.svg.setAttribute("width", String(r)), n.svg.setAttribute("height", String(a)), n.svg.setAttribute("viewBox", `0 0 ${String(r)} ${String(a)}`), n.overlay.setAttribute("x", "0"), n.overlay.setAttribute("y", "0"), n.overlay.setAttribute("width", Math.max(r, 0).toFixed(2)), n.overlay.setAttribute("height", Math.max(a, 0).toFixed(2)), Array.isArray(t.series) && (n.series = Array.from(t.series));
  const { points: i, range: o } = Ro(n.series, n, {
    xAccessor: n.xAccessor,
    yAccessor: n.yAccessor
  });
  if (n.points = i, n.range = o, i.length === 0) {
    n.linePath.setAttribute("d", ""), n.areaPath && n.areaPath.setAttribute("d", ""), jt(n), Mt(n), Ht(n), Lt(n);
    return;
  }
  if (i.length === 1) {
    const s = i[0], l = Math.max(
      0.5,
      Math.min(4, Math.max(n.width - n.margin.left - n.margin.right, 1) * 0.01)
    ), d = `M${s.x.toFixed(2)} ${s.y.toFixed(2)} h${l.toFixed(2)}`;
    n.linePath.setAttribute("d", d), n.areaPath && n.areaPath.setAttribute("d", ""), n.focusCircle && (n.focusCircle.setAttribute("cx", s.x.toFixed(2)), n.focusCircle.setAttribute("cy", s.y.toFixed(2)), n.focusCircle.style.opacity = "1"), n.focusLine && (n.focusLine.style.opacity = "0"), Ht(n), Lt(n), Mt(n);
    return;
  }
  const c = ko(i);
  if (n.linePath.setAttribute("d", c), n.areaPath && o) {
    const s = n.margin.top + o.boundedHeight, l = Fo(i, s);
    n.areaPath.setAttribute("d", l);
  }
  Ht(n), Lt(n), Mt(n);
}
function Ht(e) {
  const { xAxis: t, yAxis: n, range: r, margin: a, height: i, yFormatter: o } = e;
  if (!t || !n)
    return;
  if (!r) {
    t.innerHTML = "", n.innerHTML = "";
    return;
  }
  const { minX: c, maxX: s, minY: l, maxY: d, boundedWidth: f, boundedHeight: p } = r, u = Number.isFinite(c) && Number.isFinite(s) && s >= c, g = Number.isFinite(l) && Number.isFinite(d) && d >= l, m = Math.max(f, 0), h = Math.max(p, 0);
  if (t.style.left = ee(a.left), t.style.width = ee(m), t.style.top = ee(i - a.bottom + 6), t.innerHTML = "", u && m > 0) {
    const _ = (s - c) / No, b = Math.max(2, Math.min(6, Math.round(m / 140) || 4));
    Uo(e, c, s, b, _).forEach(({ positionRatio: C, label: A }) => {
      const P = document.createElement("div");
      P.className = "line-chart-axis-tick line-chart-axis-tick-x", P.style.position = "absolute", P.style.bottom = "0";
      const N = re(C, 0, 1);
      P.style.left = ee(N * m);
      let k = "-50%", I = "center";
      N <= 1e-3 ? (k = "0", I = "left", P.style.marginLeft = "2px") : N >= 0.999 && (k = "-100%", I = "right", P.style.marginRight = "2px"), P.style.transform = `translateX(${k})`, P.style.textAlign = I, P.textContent = A, t.appendChild(P);
    });
  }
  n.style.top = ee(a.top), n.style.height = ee(h);
  const y = Math.max(a.left - 6, 0);
  if (n.style.left = "0", n.style.width = ee(Math.max(y, 0)), n.innerHTML = "", g && h > 0) {
    const _ = Math.max(2, Math.min(6, Math.round(h / 60) || 4)), b = qo(l, d, _), v = o;
    b.forEach(({ value: C, positionRatio: A }) => {
      const P = document.createElement("div");
      P.className = "line-chart-axis-tick line-chart-axis-tick-y", P.style.position = "absolute", P.style.left = "0";
      const k = (1 - re(A, 0, 1)) * h;
      P.style.top = ee(k), P.textContent = v(C, null, -1), n.appendChild(P);
    });
  }
}
function Vo(e, t, n = 4) {
  if (!Number.isFinite(e) || !Number.isFinite(t))
    return {
      niceMin: e,
      niceMax: t
    };
  const r = Math.max(2, n);
  if (t === e) {
    const l = Kt(Math.abs(e) || 1);
    return {
      niceMin: e - l,
      niceMax: t + l
    };
  }
  const i = (t - e) / (r - 1), o = Kt(i), c = Math.floor(e / o) * o, s = Math.ceil(t / o) * o;
  return c === s ? {
    niceMin: e,
    niceMax: t + o
  } : {
    niceMin: c,
    niceMax: s
  };
}
function Uo(e, t, n, r, a) {
  if (!Number.isFinite(t) || !Number.isFinite(n) || n < t)
    return [];
  if (!Number.isFinite(a) || a <= 0)
    return [
      {
        positionRatio: 0.5,
        label: jn(e, t, a || 0)
      }
    ];
  const i = Math.max(2, r), o = [], c = n - t;
  for (let s = 0; s < i; s += 1) {
    const l = i === 1 ? 0.5 : s / (i - 1), d = t + l * c;
    o.push({
      positionRatio: l,
      label: jn(e, d, a)
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
function qo(e, t, n) {
  if (!Number.isFinite(e) || !Number.isFinite(t))
    return [];
  if (t === e)
    return [
      {
        value: e,
        positionRatio: 0.5
      }
    ];
  const r = t - e, a = Math.max(2, n), i = r / (a - 1), o = Kt(i), c = Math.floor(e / o) * o, s = Math.ceil(t / o) * o, l = [];
  for (let d = c; d <= s + o / 2; d += o) {
    const f = (d - e) / (t - e);
    l.push({
      value: d,
      positionRatio: re(f, 0, 1)
    });
  }
  return l.length > a + 2 ? l.filter((d, f) => f % 2 === 0) : l;
}
function Kt(e) {
  if (!Number.isFinite(e) || e === 0)
    return 1;
  const t = Math.floor(Math.log10(Math.abs(e))), n = Math.abs(e) / 10 ** t;
  let r;
  return n <= 1 ? r = 1 : n <= 2 ? r = 2 : n <= 5 ? r = 5 : r = 10, r * 10 ** t;
}
function Wo(e) {
  return Array.isArray(e) && e.every((t) => typeof t == "string");
}
function Oo(e) {
  return typeof e == "object" && e !== null;
}
function Bo(e) {
  if (!Oo(e))
    return !1;
  const t = e;
  return typeof t.portfolioUuid != "string" ? !1 : Wo(t.securityUuids);
}
function Yo(e) {
  return e instanceof CustomEvent ? Bo(e.detail) : !1;
}
const It = { min: 0, max: 6 }, ht = { min: 2, max: 4 }, jo = "1Y", aa = [
  "1M",
  "6M",
  "1Y",
  "5Y",
  "ALL"
], Ko = {
  "1M": 30,
  "6M": 182,
  "1Y": 365,
  "5Y": 1826,
  ALL: Number.POSITIVE_INFINITY
}, Go = /* @__PURE__ */ new Set([0, 2]), Xo = /* @__PURE__ */ new Set([1, 3]), Zo = "var(--pp-reader-chart-marker-buy, #2e7d32)", Jo = "var(--pp-reader-chart-marker-sell, #c0392b)", Kn = "{TICKER}", Qo = "https://chatgpt.com/", zt = {
  aggregation: "Aggregationsdaten",
  totals: "Kaufsummen",
  eur_total: "EUR-Kaufsumme"
}, Fe = /* @__PURE__ */ new Map(), ot = /* @__PURE__ */ new Map(), Je = /* @__PURE__ */ new Map(), ke = /* @__PURE__ */ new Map(), ia = "pp-reader:portfolio-positions-updated", Ye = /* @__PURE__ */ new Map();
function es(e) {
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
function ts(e, t) {
  if (e) {
    if (t) {
      Je.set(e, t);
      return;
    }
    Je.delete(e);
  }
}
function ns(e) {
  if (!e || typeof window > "u")
    return null;
  if (Je.has(e)) {
    const t = Je.get(e) || null;
    if (t)
      return t;
  }
  return null;
}
function oa(e) {
  return Fe.has(e) || Fe.set(e, /* @__PURE__ */ new Map()), Fe.get(e);
}
function sa(e) {
  return ke.has(e) || ke.set(e, /* @__PURE__ */ new Map()), ke.get(e);
}
function ca(e) {
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
    if (ke.has(e)) {
      try {
        ke.get(e)?.clear();
      } catch (t) {
        console.warn("invalidateHistoryCache: Konnte Marker-Cache nicht leeren", e, t);
      }
      ke.delete(e);
    }
  }
}
function la(e) {
  e && Je.delete(e);
}
function rs(e, t) {
  if (!e || !t)
    return;
  const n = t.securityUuids;
  (Array.isArray(n) ? n : []).includes(e) && (ca(e), la(e));
}
function as(e) {
  if (!e || Ye.has(e))
    return;
  const t = (n) => {
    Yo(n) && rs(e, n.detail);
  };
  try {
    window.addEventListener(ia, t), Ye.set(e, t);
  } catch (n) {
    console.error("ensureLiveUpdateSubscription: Registrierung fehlgeschlagen", n);
  }
}
function is(e) {
  if (!e || !Ye.has(e))
    return;
  const t = Ye.get(e);
  try {
    t && window.removeEventListener(ia, t);
  } catch (n) {
    console.error("removeLiveUpdateSubscription: Entfernen des Listeners fehlgeschlagen", n);
  }
  Ye.delete(e);
}
function os(e) {
  e && (is(e), ca(e), la(e));
}
function Gn(e, t) {
  if (!ot.has(e)) {
    ot.set(e, { activeRange: t });
    return;
  }
  const n = ot.get(e);
  n && (n.activeRange = t);
}
function ua(e) {
  return ot.get(e)?.activeRange ?? jo;
}
function Gt(e) {
  const t = Date.UTC(
    e.getUTCFullYear(),
    e.getUTCMonth(),
    e.getUTCDate()
  );
  return Math.floor(t / 864e5);
}
function Le(e) {
  const t = new Date(e.getTime());
  return t.setUTCHours(0, 0, 0, 0), t;
}
function Xn(e) {
  return !(e instanceof Date) || Number.isNaN(e.getTime()) ? null : Gt(Le(e));
}
function H(e) {
  return pe(e);
}
function da(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t || null;
}
function Pe(e) {
  const t = da(e);
  return t ? t.toUpperCase() : null;
}
function ss(e) {
  if (!e)
    return null;
  const t = fn(e.aggregation), n = H(t?.purchase_total_security) ?? (t ? H(
    t.security_currency_total
  ) : null), r = H(t?.purchase_total_account) ?? (t ? H(
    t.account_currency_total
  ) : null);
  if (se(n) && se(r)) {
    const c = n / r;
    if (se(c))
      return c;
  }
  const a = He(e.average_cost), i = H(a?.native) ?? H(a?.security), o = H(a?.account) ?? H(a?.eur);
  if (se(i) && se(o)) {
    const c = i / o;
    if (se(c))
      return c;
  }
  return null;
}
function fa(e, t = "Unbekannter Fehler") {
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
  const n = Le(t instanceof Date ? t : /* @__PURE__ */ new Date()), r = Ko[e], a = Xn(n), i = {};
  if (a != null && (i.end_date = a), Number.isFinite(r) && r > 0) {
    const o = new Date(n.getTime());
    o.setUTCDate(o.getUTCDate() - (r - 1));
    const c = Xn(o);
    c != null && (i.start_date = c);
  }
  return i;
}
function _n(e) {
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
      return Number.isNaN(n.getTime()) ? null : Le(n);
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
          return Le(r);
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
function cs(e) {
  const t = _n(e);
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
function Xt(e) {
  return Array.isArray(e) ? e.map((t) => {
    let r = H(t.close);
    if (r == null) {
      const i = H(t.close_raw);
      i != null && (r = i / 1e8);
    }
    return r == null ? null : {
      date: _n(t.date) ?? t.date,
      close: r
    };
  }).filter((t) => !!t) : [];
}
function bt(e, t, n = null) {
  if (!Array.isArray(e))
    return [];
  const r = [], a = Pe(t), i = a || "EUR", o = ss(n);
  return e.forEach((c, s) => {
    const l = typeof c.type == "number" ? c.type : Number(c.type), d = Go.has(l), f = Xo.has(l);
    if (!d && !f)
      return;
    const p = cs(c.date);
    let u = H(c.price);
    if (!p || u == null)
      return;
    const g = Pe(c.currency_code), m = a ?? g ?? i;
    g && a && g !== a && se(o) && (u *= o);
    const h = H(c.shares), y = H(c.net_price_eur), _ = d ? "Kauf" : "Verkauf", b = h != null ? `${wn(h)} @ ` : "", v = `${_} ${b}${he(u)} ${m}`, C = f && y != null ? `${v} (netto ${he(y)} EUR)` : v, A = d ? Zo : Jo, P = typeof c.uuid == "string" && c.uuid.trim() || `${_}-${p.getTime().toString()}-${s.toString()}`;
    r.push({
      id: P,
      x: p.getTime(),
      y: u,
      color: A,
      label: C,
      payload: {
        type: _,
        currency: m,
        transactionCurrency: g,
        shares: h,
        price: u,
        netPriceEur: y,
        date: p.toISOString(),
        portfolio: c.portfolio
      }
    });
  }), r;
}
function vn(e) {
  const t = H(e?.last_price_native) ?? H(e?.last_price?.native) ?? null;
  if (T(t))
    return t;
  if (Pe(e?.currency_code) === "EUR") {
    const r = H(e?.last_price_eur);
    if (T(r))
      return r;
  }
  return null;
}
function ls(e) {
  if (!e)
    return null;
  const n = e.last_price_fetched_at, r = yt(n);
  if (r != null)
    return r;
  const i = e.last_price?.fetched_at;
  return yt(i) ?? null;
}
function Zt(e, t) {
  let n = [];
  Array.isArray(e) && (n = e.map((l) => ({
    ...l
  })));
  const r = n.slice(), a = vn(t);
  if (!T(a))
    return r;
  const i = ls(t) ?? Date.now(), o = new Date(i);
  if (Number.isNaN(o.getTime()))
    return r;
  const c = Gt(Le(o));
  let s = null;
  for (let l = r.length - 1; l >= 0; l -= 1) {
    const d = r[l], f = _n(d.date);
    if (!f)
      continue;
    const p = Gt(Le(f));
    if (s == null && (s = p), p === c)
      return d.close !== a && (r[l] = { ...d, close: a }), r;
    if (p < c)
      break;
  }
  return s != null && s > c || r.push({
    date: o,
    close: a
  }), r;
}
function T(e) {
  return typeof e == "number" && Number.isFinite(e);
}
function se(e) {
  return typeof e == "number" && Number.isFinite(e) && e > 0;
}
function je(e, t, n) {
  if (!T(e) || !T(t))
    return !1;
  const r = Math.abs(e - t), a = Math.max(Math.abs(e), Math.abs(t), 1);
  return r <= a * 1e-4;
}
function us(e, t) {
  return !T(t) || t === 0 || !T(e) ? null : yi((e - t) / t * 100);
}
function pa(e, t) {
  if (e.length === 0)
    return { priceChange: null, priceChangePct: null };
  const n = e[0], r = H(n.close);
  if (!T(r) || r === 0)
    return { priceChange: null, priceChangePct: null };
  const a = e[e.length - 1], i = H(a.close), o = H(t) ?? i;
  if (!T(o))
    return { priceChange: null, priceChangePct: null };
  const c = o - r, s = Object.is(c, -0) ? 0 : c, l = us(o, r);
  return { priceChange: s, priceChangePct: l };
}
function Sn(e, t) {
  if (!T(e) || e === 0)
    return "neutral";
  const n = 0.5 / Math.pow(10, t);
  return Math.abs(e) < n ? "neutral" : e > 0 ? "positive" : "negative";
}
function ds(e, t) {
  if (!T(e))
    return '<span class="value neutral">—</span>';
  const n = he(e);
  if (n === "—")
    return '<span class="value neutral">—</span>';
  const r = Sn(e, ht.max), a = t ? `&nbsp;${F(t)}` : "";
  return `<span class="value ${r}">${n}${a}</span>`;
}
function fs(e) {
  return T(e) ? `<span class="value ${Sn(e, 2)} value--percentage">${ae(e)}&nbsp;%</span>` : '<span class="value neutral">—</span>';
}
function ga(e, t, n, r) {
  const a = e, i = a.length > 0 ? a : "Zeitraum";
  return `
    <div class="security-info-bar" data-range="${ge(a)}">
      <div class="security-info-item">
        <span class="label">Preisänderung (${F(i)})</span>
        <div class="value-row">
          ${ds(t, r)}
          ${fs(n)}
        </div>
      </div>
    </div>
  `;
}
function ps(e) {
  return `
    <div class="security-range-selector" role="group" aria-label="Zeitraum">
      ${aa.map((n) => `
      <button
        type="button"
        class="security-range-button${n === e ? " active" : ""}"
        data-range="${ge(n)}"
        aria-pressed="${n === e ? "true" : "false"}"
      >
        ${F(n)}
      </button>
    `).join(`
`)}
    </div>
  `;
}
function ha(e, t = { status: "empty" }) {
  const n = ge(e);
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
      const r = fa(
        t.message,
        "Die historischen Daten konnten nicht geladen werden."
      );
      return `
        <div class="history-placeholder" data-state="error" data-range="${n}">
          <p>${F(r)}</p>
        </div>
      `;
    }
    case "empty":
    default: {
      const r = n.length > 0 ? n : "den gewählten Zeitraum";
      return `
        <div class="history-placeholder" data-state="empty" data-range="${n}">
          <p>Für dieses Wertpapier liegen im Zeitraum ${F(r)} keine historischen Daten vor.</p>
        </div>
      `;
    }
  }
}
function wn(e) {
  const t = H(e);
  if (t == null)
    return "—";
  const n = Math.abs(t % 1) > 0, r = n ? 2 : It.min, a = n ? It.max : It.min;
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
function gs(e, t) {
  const n = he(e), r = `&nbsp;${F(t)}`;
  return `<span class="${Sn(e, ht.max)}">${n}${r}</span>`;
}
function hs(e, t) {
  const n = e?.ticker_symbol;
  if (typeof n == "string" && n.trim())
    return n.trim();
  const r = typeof e?.name == "string" ? e.name.trim() : "";
  return r || (typeof t == "string" ? t : "");
}
function ms(e) {
  return `
    <div class="news-prompt-container">
      <button
        type="button"
        class="news-prompt-button"
        data-symbol="${ge(e)}"
      >
        Copy prompt &amp; open ChatGPT
      </button>
    </div>
  `;
}
async function ys(e) {
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
function bs(e) {
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
function _s(e, t, n) {
  const r = He(e?.average_cost), a = r?.account ?? (T(t) ? t : H(t));
  if (!T(a))
    return null;
  const i = e?.account_currency_code ?? e?.account_currency;
  if (typeof i == "string" && i.trim())
    return i.trim().toUpperCase();
  const o = Pe(e?.currency_code) ?? "", c = r?.security ?? r?.native ?? (T(n) ? n : H(n)), s = fn(e?.aggregation);
  if (o && T(c) && je(a, c))
    return o;
  const l = H(s?.purchase_total_security) ?? H(e?.purchase_total_security), d = H(s?.purchase_total_account) ?? H(e?.purchase_total_account);
  let f = null;
  if (T(l) && l !== 0 && T(d) && (f = d / l), r?.source === "eur_total")
    return "EUR";
  const u = r?.eur;
  if (T(u) && je(a, u))
    return "EUR";
  const g = H(e?.purchase_value_eur);
  return T(g) ? "EUR" : f != null && je(f, 1) ? o || null : o === "EUR" ? "EUR" : o || "EUR";
}
function Zn(e) {
  return typeof e != "number" || !Number.isFinite(e) || e <= 0 ? null : e.toLocaleString("de-DE", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
  });
}
function vs(e) {
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
    const o = t?.[i], c = yt(o);
    if (c != null)
      return c;
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
function Ss(e) {
  if (e == null || !Number.isFinite(e))
    return null;
  const t = new Date(e);
  return Number.isNaN(t.getTime()) ? null : t.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}
function ws(e, t) {
  if (!e)
    return null;
  const n = Pe(e.currency_code) ?? "", r = He(e.average_cost);
  if (!r || !n)
    return null;
  const a = r.native ?? r.security ?? null;
  let o = r.account ?? r.eur ?? null, c = Pe(t) ?? "";
  if (se(r.eur) && (!c || c === n) && (o = r.eur, c = "EUR"), !n || !c || n === c || !se(a) || !se(o))
    return null;
  const s = o / a;
  if (!Number.isFinite(s) || s <= 0)
    return null;
  const l = Zn(s);
  if (!l)
    return null;
  let d = null;
  if (s > 0) {
    const _ = 1 / s;
    Number.isFinite(_) && _ > 0 && (d = Zn(_));
  }
  const f = vs(e), p = Ss(f), u = [`FX-Kurs (Kauf): 1 ${n} = ${l} ${c}`];
  d && u.push(`1 ${c} = ${d} ${n}`);
  const g = [], m = r.source, h = m in zt ? zt[m] : zt.aggregation;
  if (g.push(`Quelle: ${h}`), T(r.coverage_ratio)) {
    const _ = Math.min(Math.max(r.coverage_ratio * 100, 0), 100);
    g.push(
      `Abdeckung: ${_.toLocaleString("de-DE", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      })}%`
    );
  }
  g.length && u.push(...g);
  const y = p ?? "Datum unbekannt";
  return `${u.join(" · ")} (Stand: ${y})`;
}
function Jn(e) {
  if (!e)
    return null;
  const t = He(e.average_cost), n = t?.native ?? t?.security ?? null;
  return T(n) ? n : null;
}
function Cs(e) {
  if (!e)
    return '<div class="meta-error">Keine Snapshot-Daten verfügbar.</div>';
  const t = e.currency_code || "EUR", n = e.total_holdings_precise ?? e.total_holdings, r = wn(n), a = e.last_price_native ?? e.last_price?.native ?? e.last_price_eur, i = he(a), o = i === "—" ? null : `${i}${`&nbsp;${F(t)}`}`, c = H(e.market_value_eur) ?? H(e.current_value_eur) ?? null, s = He(e.average_cost), l = s?.native ?? s?.security ?? null, d = s?.eur ?? null, p = s?.account ?? null ?? d, u = we(e.performance), g = u?.day_change ?? null, m = g?.price_change_native ?? null, h = g?.price_change_eur ?? null, y = T(m) ? m : h, _ = T(m) ? t : "EUR", b = (R, z = "") => {
    const O = ["value"];
    return z && O.push(...z.split(" ").filter(Boolean)), `<span class="${O.join(" ")}">${R}</span>`;
  }, v = (R = "") => {
    const z = ["value--missing"];
    return R && z.push(R), b("—", z.join(" "));
  }, C = (R, z = "") => {
    if (!T(R))
      return v(z);
    const O = ["value--gain"];
    return z && O.push(z), b(pi(R), O.join(" "));
  }, A = (R, z = "") => {
    if (!T(R))
      return v(z);
    const O = ["value--gain-percentage"];
    return z && O.push(z), b(gi(R), O.join(" "));
  }, P = o ? b(o, "value--price") : v("value--price"), N = r === "—" ? v("value--holdings") : b(r, "value--holdings"), k = T(c) ? b(`${ae(c)}&nbsp;€`, "value--market-value") : v("value--market-value"), I = T(y) ? b(
    gs(y, _),
    "value--gain value--absolute"
  ) : v("value--absolute"), w = A(
    g?.change_pct,
    "value--percentage"
  ), x = C(
    u?.total_change_eur,
    "value--absolute"
  ), U = A(
    u?.total_change_pct,
    "value--percentage"
  ), E = _s(
    e,
    p,
    l
  ), $ = ws(
    e,
    E
  ), K = $ ? ` title="${ge($)}"` : "", S = [], D = T(d);
  T(l) ? S.push(
    b(
      `${he(l)}${`&nbsp;${F(t)}`}`,
      "value--average value--average-native"
    )
  ) : S.push(
    v("value--average value--average-native")
  );
  let L = null, j = null;
  return D && (t !== "EUR" || !T(l) || !je(d, l)) ? (L = d, j = "EUR") : T(p) && E && (E !== t || !je(p, l ?? NaN)) && (L = p, j = E), L != null && T(L) && S.push(
    b(
      `${he(L)}${j ? `&nbsp;${F(j)}` : ""}`,
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
        <div class="value-group"${K}>
          ${S.join("")}
        </div>
      </div>
      <div class="security-meta-item security-meta-item--day-change">
        <span class="label">Tagesänderung</span>
        <div class="value-group">
          ${I}
          ${w}
        </div>
      </div>
      <div class="security-meta-item security-meta-item--total-change">
        <span class="label">Gesamtänderung</span>
        <div class="value-group">
          ${x}
          ${U}
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
function As(e) {
  return `
    <div class="card security-meta-card">
      <div id="headerMeta" class="meta">
        ${Cs(e)}
      </div>
    </div>
  `;
}
function ma(e) {
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
function Ps(e, t, {
  currency: n,
  baseline: r,
  markers: a
} = {}) {
  const i = e.clientWidth || e.offsetWidth || 0, o = i > 0 ? i : 640, c = Math.min(Math.max(Math.floor(o * 0.5), 240), 440), s = (n || "").toUpperCase() || "EUR", l = T(r) ? r : null, d = Math.max(48, Math.min(72, Math.round(o * 0.075))), f = Math.max(28, Math.min(56, Math.round(o * 0.05))), p = Math.max(40, Math.min(64, Math.round(c * 0.14)));
  return {
    width: o,
    height: c,
    margin: {
      top: 18,
      right: f,
      bottom: p,
      left: d
    },
    series: t,
    yFormatter: (g) => he(g),
    tooltipRenderer: ({ xFormatted: g, yFormatted: m }) => `
      <div class="chart-tooltip-date">${F(g)}</div>
      <div class="chart-tooltip-value">${F(m)}&nbsp;${F(s)}</div>
    `,
    markerTooltipRenderer: ({
      marker: g,
      xFormatted: m,
      yFormatted: h
    }) => {
      const y = g.payload ?? {}, _ = da(y.type), b = H(y.shares), v = b != null ? wn(b) : null, C = Pe(y.currency) ?? s, A = [];
      _ && A.push(_), v && A.push(`${v} Stück`), m && A.push(`am ${m}`);
      const P = A.join(" ").trim() || (typeof g.label == "string" ? g.label : m), N = typeof h == "string" && h.trim() ? h.trim() : he(y.price), k = N ? `${N}${C ? `&nbsp;${F(C)}` : ""}` : F(C);
      return `
      <div class="chart-tooltip-date">${F(P)}</div>
      <div class="chart-tooltip-value">${k}</div>
    `;
    },
    baseline: l != null ? {
      value: l
    } : null,
    markers: Array.isArray(a) ? a : []
  };
}
const Qn = /* @__PURE__ */ new WeakMap();
function Es(e, t, n = {}) {
  if (t.length === 0)
    return;
  const r = Ps(e, t, n);
  let a = Qn.get(e) ?? null;
  if (!a || !e.contains(a)) {
    e.innerHTML = "", a = ra(e, r), a && Qn.set(e, a);
    return;
  }
  bn(a, r);
}
function er(e, t) {
  e && (e.dataset.activeRange = t, e.querySelectorAll(".security-range-button").forEach((n) => {
    const r = n.dataset.range, a = r === t;
    n.classList.toggle("active", a), n.setAttribute("aria-pressed", a ? "true" : "false"), n.disabled = !1, n.classList.remove("loading"), r && (n.textContent = r);
  }));
}
function Ns(e, t, n, r, a) {
  const i = e.querySelector(".security-info-bar");
  if (!i || !i.parentElement)
    return;
  const o = document.createElement("div");
  o.innerHTML = ga(t, n, r, a).trim();
  const c = o.firstElementChild;
  c && i.parentElement.replaceChild(c, i);
}
function tr(e, t, n, r, a = {}) {
  const i = e.querySelector(".security-detail-placeholder");
  if (i && (i.innerHTML = `
    <h2>Historie</h2>
    ${ha(t, n)}
  `, n.status === "loaded" && Array.isArray(r) && r.length)) {
    const o = i.querySelector(".history-chart");
    o && requestAnimationFrame(() => {
      Es(o, r, a);
    });
  }
}
function xs(e) {
  const {
    root: t,
    hass: n,
    panelConfig: r,
    securityUuid: a,
    snapshot: i,
    initialRange: o,
    initialHistory: c,
    initialHistoryState: s
  } = e;
  setTimeout(() => {
    const l = t.querySelector(".security-range-selector");
    if (!l)
      return;
    const d = oa(a), f = sa(a), p = Jn(i);
    Array.isArray(c) && s.status !== "error" && d.set(o, c), as(a), Gn(a, o), er(l, o);
    const g = Zt(
      c,
      i
    );
    let m = s;
    m.status !== "error" && (m = g.length ? { status: "loaded" } : { status: "empty" }), tr(
      t,
      o,
      m,
      g,
      {
        currency: i?.currency_code,
        baseline: p,
        markers: f.get(o) ?? []
      }
    );
    const h = async (y) => {
      if (y === ua(a))
        return;
      const _ = l.querySelector(
        `.security-range-button[data-range="${y}"]`
      );
      _ && (_.disabled = !0, _.classList.add("loading"), _.innerHTML = hi());
      let b = d.get(y) ?? null, v = f.get(y) ?? null, C = null, A = [];
      if (b)
        C = b.length ? { status: "loaded" } : { status: "empty" };
      else
        try {
          const x = mt(y), U = await st(
            n,
            r,
            a,
            x
          );
          b = Xt(U.prices), v = bt(
            U.transactions,
            i?.currency_code,
            i
          ), d.set(y, b), v = Array.isArray(v) ? v : [], f.set(y, v), C = b.length ? { status: "loaded" } : { status: "empty" };
        } catch (x) {
          console.error("Range-Wechsel: Historie konnte nicht geladen werden", x), b = [], v = [], C = {
            status: "error",
            message: ma(x) || "Die historischen Daten konnten aufgrund eines Fehlers nicht geladen werden."
          };
        }
      if (!Array.isArray(v))
        try {
          const x = mt(y), U = await st(
            n,
            r,
            a,
            x
          );
          v = bt(
            U.transactions,
            i?.currency_code,
            i
          ), v = Array.isArray(v) ? v : [], f.set(y, v);
        } catch (x) {
          console.error("Range-Wechsel: Transaktionsmarker konnten nicht geladen werden", x), v = [];
        }
      A = Zt(b, i), C.status !== "error" && (C = A.length ? { status: "loaded" } : { status: "empty" });
      const P = vn(i), { priceChange: N, priceChangePct: k } = pa(
        A,
        P
      ), I = Array.isArray(v) ? v : [];
      Gn(a, y), er(l, y), Ns(
        t,
        y,
        N,
        k,
        i?.currency_code
      );
      const w = Jn(i);
      tr(
        t,
        y,
        C,
        A,
        {
          currency: i?.currency_code,
          baseline: w,
          markers: I
        }
      );
    };
    l.addEventListener("click", (y) => {
      const _ = y.target?.closest(".security-range-button");
      if (!_ || _.disabled)
        return;
      const { range: b } = _.dataset;
      !b || !aa.includes(b) || h(b);
    });
  }, 0);
}
function Ds(e) {
  const { root: t, hass: n, panelConfig: r, tickerSymbol: a } = e;
  let i = null, o = !1;
  const c = async () => {
    try {
      i = await fi(n, r);
    } catch (s) {
      o = !0, console.warn("News-Prompt: Prefetch fehlgeschlagen", s);
    }
  };
  c(), setTimeout(() => {
    const s = t.querySelector(".news-prompt-button");
    if (!s)
      return;
    const l = (f) => {
      const p = (i?.placeholder || Kn).trim() || Kn, u = (i?.prompt_template || "").trim(), g = (i?.link || "").trim() || Qo;
      return { body: u ? u.includes(p) ? u.split(p).join(f) : `${u}

Ticker: ${f}` : `Ticker: ${f}`, link: g };
    }, d = async () => {
      const f = (s.dataset.symbol || a || "").trim();
      if (!f) {
        console.warn("News-Prompt: Kein Ticker verfügbar");
        return;
      }
      if (s.classList.contains("loading"))
        return;
      s.disabled = !0, s.classList.add("loading");
      const p = s.textContent;
      try {
        const { body: u, link: g } = l(f), m = await ys(u);
        m ? s.textContent = "✅ Copied! Opening..." : console.warn("News-Prompt: Clipboard unavailable – prompt could not be copied"), m && await new Promise((h) => setTimeout(h, 800)), bs(g), !i && !o && c();
      } catch (u) {
        console.error("News-Prompt: Kopiervorgang fehlgeschlagen", u);
      } finally {
        s.classList.remove("loading"), s.disabled = !1, p && setTimeout(() => {
          s.textContent = p;
        }, 2e3);
      }
    };
    s.addEventListener("click", () => {
      d();
    });
  }, 0);
}
async function Fs(e, t, n, r) {
  if (!r)
    return console.error("renderSecurityDetail: securityUuid fehlt"), '<div class="card"><h2>Fehler</h2><p>Kein Wertpapier angegeben.</p></div>';
  const a = ns(r);
  let i = null, o = null;
  try {
    const w = await di(
      t,
      n,
      r
    ), x = w.snapshot;
    i = x && typeof x == "object" ? x : w;
  } catch (w) {
    console.error("renderSecurityDetail: Snapshot konnte nicht geladen werden", w), o = fa(w);
  }
  const c = i || a, s = !!(a && !i), l = (c?.source ?? "") === "cache";
  r && ts(r, c ?? null);
  const d = c && (s || l) ? es({ fallbackUsed: s, flaggedAsCache: l }) : "", f = c?.name || "Wertpapierdetails", p = un(f, "", { includeMeta: !1 });
  p.classList.add("security-detail-header");
  const u = As(c);
  if (o)
    return `
      ${p.outerHTML}
      ${u}
      ${d}
      <div class="card error-card">
        <h2>Fehler beim Laden</h2>
        <p>${o}</p>
      </div>
    `;
  const g = ua(r), m = oa(r), h = sa(r);
  let y = m.has(g) ? m.get(g) ?? null : null, _ = { status: "empty" }, b = h.has(g) ? h.get(g) ?? null : null;
  if (Array.isArray(y))
    _ = y.length ? { status: "loaded" } : { status: "empty" };
  else {
    y = [];
    try {
      const w = mt(g), x = await st(
        t,
        n,
        r,
        w
      );
      y = Xt(x.prices), b = bt(
        x.transactions,
        c?.currency_code,
        c
      ), m.set(g, y), b = Array.isArray(b) ? b : [], h.set(g, b), _ = y.length ? { status: "loaded" } : { status: "empty" };
    } catch (w) {
      console.error(
        "renderSecurityDetail: Historie konnte nicht geladen werden",
        w
      ), _ = {
        status: "error",
        message: ma(w) || "Die historischen Daten konnten aufgrund eines Fehlers nicht geladen werden."
      };
    }
  }
  if (!Array.isArray(b))
    try {
      const w = mt(g), x = await st(
        t,
        n,
        r,
        w
      ), U = Xt(x.prices);
      b = bt(
        x.transactions,
        c?.currency_code,
        c
      ), m.set(g, U), b = Array.isArray(b) ? b : [], h.set(g, b), y = U, _ = y.length ? { status: "loaded" } : { status: "empty" };
    } catch (w) {
      console.error(
        "renderSecurityDetail: Transaktionsmarker konnten nicht geladen werden",
        w
      ), b = [];
    }
  const v = Zt(
    y,
    c
  );
  _.status !== "error" && (_ = v.length ? { status: "loaded" } : { status: "empty" });
  const C = hs(c, r), A = ms(C), P = vn(c), { priceChange: N, priceChangePct: k } = pa(
    v,
    P
  ), I = ga(
    g,
    N,
    k,
    c?.currency_code
  );
  return xs({
    root: e,
    hass: t,
    panelConfig: n,
    securityUuid: r,
    snapshot: c,
    initialRange: g,
    initialHistory: y,
    initialHistoryState: _
  }), Ds({
    root: e,
    hass: t,
    panelConfig: n,
    tickerSymbol: C
  }), `
    ${p.outerHTML}
    ${u}
    ${d}
    ${A}
    ${I}
    ${ps(g)}
    <div class="card security-detail-placeholder">
      <h2>Historie</h2>
      ${ha(g, _)}
    </div>
  `;
}
function ks(e) {
  const { setSecurityDetailTabFactory: t } = e;
  if (typeof t != "function") {
    console.error("registerSecurityDetailTab: Ungültige Factory-Funktion übergeben");
    return;
  }
  t((n) => ({
    title: "Wertpapier",
    render: (r, a, i) => Fs(r, a, i, n),
    cleanup: () => {
      os(n);
    }
  }));
}
class $s {
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
      const d = document.createElement("button");
      d.className = "drp-preset-btn", d.textContent = l.label, d.addEventListener("click", () => {
        this.selectPreset(l);
      }), t.appendChild(d);
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
    const c = document.createElement("button");
    c.className = "drp-btn drp-btn-cancel", c.textContent = "Abbrechen", c.addEventListener("click", (l) => {
      l.stopPropagation(), this.close();
    });
    const s = document.createElement("button");
    s.className = "drp-btn drp-btn-apply", s.textContent = "Übernehmen", s.addEventListener("click", (l) => {
      l.stopPropagation(), this.apply();
    }), o.appendChild(c), o.appendChild(s), r.appendChild(a), r.appendChild(o), n.appendChild(r), this.popoverEl.appendChild(n), this.element.appendChild(this.popoverEl);
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
    this.isOpen = !0, this.previousFocus = document.activeElement, this.popoverEl.classList.add("open"), this.popoverEl.style.display = "flex", this.triggerEl.classList.add("active"), this.triggerEl.setAttribute("aria-expanded", "true"), this.tempRange = { ...this.range }, this.viewDate = new Date(this.range.end.getFullYear(), this.range.end.getMonth() - 1, 1), this.renderCalendars(), this.updateInputs(), requestAnimationFrame(() => {
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
    t.label === "Diesen Monat" ? r = new Date(n.getFullYear(), n.getMonth(), 1) : t.label === "Letzten Monat" ? (r = new Date(n.getFullYear(), n.getMonth() - 1, 1), n.setDate(0)) : t.label === "Dieses Jahr" ? r = new Date(n.getFullYear(), 0, 1) : r.setDate(n.getDate() - (t.days - 1)), this.tempRange = { start: r, end: n }, this.viewDate = new Date(n.getFullYear(), n.getMonth() - 1, 1), this.renderCalendars(), this.updateInputs(), this.popoverEl.querySelectorAll(".drp-preset-btn").forEach((a) => {
      a.textContent === t.label ? a.classList.add("active") : a.classList.remove("active");
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
    const c = document.createElement("button");
    c.className = "drp-nav-btn", c.innerHTML = "‹", c.setAttribute("aria-label", "Vorheriger Monat"), n === "left" ? c.addEventListener("click", (m) => {
      m.stopPropagation(), this.viewDate.setMonth(this.viewDate.getMonth() - 1), this.renderCalendars();
    }) : c.style.visibility = "hidden";
    const s = document.createElement("span");
    s.className = "drp-month-label", s.textContent = t.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
    const l = document.createElement("button");
    l.className = "drp-nav-btn", l.innerHTML = "›", l.setAttribute("aria-label", "Nächster Monat"), n === "right" ? l.addEventListener("click", (m) => {
      m.stopPropagation(), this.viewDate.setMonth(this.viewDate.getMonth() + 1), this.renderCalendars();
    }) : l.style.visibility = "hidden", o.appendChild(c), o.appendChild(s), o.appendChild(l), i.appendChild(o);
    const d = document.createElement("div");
    d.className = "drp-days-header", ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].forEach((m) => {
      const h = document.createElement("span");
      h.className = "drp-day-name", h.textContent = m, d.appendChild(h);
    }), i.appendChild(d);
    const f = document.createElement("div");
    f.className = "drp-days-grid";
    const p = new Date(r, a, 1), u = new Date(r, a + 1, 0);
    let g = p.getDay() - 1;
    g < 0 && (g = 6);
    for (let m = 0; m < g; m++) {
      const h = document.createElement("div");
      h.className = "drp-day empty", f.appendChild(h);
    }
    for (let m = 1; m <= u.getDate(); m++) {
      const h = new Date(r, a, m), y = document.createElement("div");
      y.className = "drp-day", y.textContent = m.toString(), y.setAttribute("role", "button"), y.tabIndex = 0;
      const _ = h.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
      y.setAttribute("aria-label", _), this.applyDayClasses(y, h), y.addEventListener("click", (b) => {
        b.stopPropagation(), this.handleDayClick(h);
      }), y.addEventListener("keydown", (b) => {
        (b.key === "Enter" || b.key === " ") && (b.preventDefault(), b.stopPropagation(), this.handleDayClick(h));
      }), y.addEventListener("mouseenter", () => {
        this.handleDayHover(h);
      }), f.appendChild(y);
    }
    i.appendChild(f), this.calendarsContainer.appendChild(i);
  }
  applyDayClasses(t, n) {
    const r = n.getTime(), a = this.tempRange.start.getTime(), i = this.tempRange.end.getTime();
    r === a && t.classList.add("range-start"), r === i && t.classList.add("range-end"), r > a && r < i && t.classList.add("in-range");
    const o = /* @__PURE__ */ new Date();
    n.getDate() === o.getDate() && n.getMonth() === o.getMonth() && n.getFullYear() === o.getFullYear() && (t.style.fontWeight = "bold");
  }
  handleDayClick(t) {
    const n = t.getTime(), r = this.tempRange.start.getTime(), a = this.tempRange.end.getTime();
    r !== a ? this.tempRange = { start: t, end: t } : n < r ? this.tempRange = { start: t, end: t } : this.tempRange = { start: this.tempRange.start, end: t }, this.updateInputs(), this.renderCalendars();
  }
  handleDayHover(t) {
  }
}
let _e = {
  status: "idle",
  error: null,
  data: null,
  selection: null,
  lastUpdated: null
}, nr = null;
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
function Jt(e) {
  return typeof e != "string" ? null : e.trim() || null;
}
function Ts(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e, n = Jt(t.start), r = Jt(t.end);
  return n && r ? { start: n, end: r } : null;
}
function rr(e) {
  if (!Array.isArray(e))
    return [];
  const t = e.map((r) => typeof r == "string" ? r.trim() : "").filter((r) => r.length > 0), n = Array.from(new Set(t));
  return n.sort(), n;
}
function Ls(e) {
  const t = Jt(e.date ?? null), n = Ts(e.range ?? null);
  if (t && n)
    throw new Error("loadDailyWealth: date und range können nicht gleichzeitig gesetzt werden");
  if (!t && !n)
    throw new Error("loadDailyWealth: entweder date oder range erforderlich");
  const r = e.scopes ?? {}, a = rr(r.accounts), i = rr(r.portfolios), o = {};
  t && (o.date = t), n && (o.range = n);
  const c = e.include_slices ?? e.includeSlices ?? void 0, s = e.include_scopes ?? e.includeScopes ?? void 0;
  return c !== void 0 && (o.includeSlices = c), s !== void 0 && (o.includeScopes = s), (a.length || i.length) && (o.scopes = {}, a.length && (o.scopes.accounts = a), i.length && (o.scopes.portfolios = i)), typeof e.limit == "number" && Number.isFinite(e.limit) && e.limit > 0 && (o.limit = e.limit), typeof e.offset == "number" && Number.isFinite(e.offset) && e.offset >= 0 && (o.offset = e.offset), o;
}
function Ms(e) {
  const t = e.date ?? "", n = e.range ? `${e.range.start}..${e.range.end}` : "", r = e.scopes?.accounts ?? [], a = e.scopes?.portfolios ?? [], i = JSON.stringify({ accounts: r, portfolios: a }), o = e.includeSlices ? "1" : "0", c = e.includeScopes ? "1" : "0", s = e.limit ?? "", l = e.offset ?? "";
  return [t, n, i, o, c, s, l].join("::");
}
function Hs(e) {
  return { ...e };
}
function ar(e) {
  return { ...e };
}
function Is(e) {
  if (e)
    return {
      accounts: e.accounts.map(ar),
      portfolios: e.portfolios.map(ar)
    };
}
function zs(e) {
  if (!e)
    return null;
  const t = Is(e.slices);
  return {
    range: { ...e.range },
    records: e.records.map(Hs),
    ...t ? { slices: t } : {}
  };
}
function Vs(e) {
  if (!e)
    return null;
  const t = {};
  return e.date && (t.date = e.date), e.range && (t.range = { ...e.range }), e.scopes && (t.scopes = {
    ...e.scopes.accounts ? { accounts: [...e.scopes.accounts] } : {},
    ...e.scopes.portfolios ? { portfolios: [...e.scopes.portfolios] } : {}
  }), e.includeSlices !== void 0 && (t.includeSlices = e.includeSlices), e.includeScopes !== void 0 && (t.includeScopes = e.includeScopes), e.limit !== void 0 && (t.limit = e.limit), e.offset !== void 0 && (t.offset = e.offset), t;
}
function Vt(e) {
  _e = {
    ..._e,
    ...e
  };
}
function Qt() {
  return {
    status: _e.status,
    error: _e.error,
    lastUpdated: _e.lastUpdated,
    data: zs(_e.data),
    selection: Vs(_e.selection)
  };
}
async function Us(e, t, n = {}) {
  const r = Ls(n), a = Ms(r);
  if (_e.data && !n.force && nr === a)
    return Qt();
  Vt({
    status: "loading",
    error: null,
    selection: r
  });
  try {
    const i = await ui(e, t, r);
    nr = a, Vt({
      status: "loaded",
      error: null,
      data: i,
      selection: r,
      lastUpdated: Date.now()
    });
  } catch (i) {
    Vt({
      status: "error",
      error: Rs(i),
      selection: r,
      lastUpdated: Date.now()
    });
  }
  return Qt();
}
const qs = 30;
let ya = null, en = null;
const fe = /* @__PURE__ */ new Set(), Ws = [
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
function Os() {
  const e = /* @__PURE__ */ new Date(), t = new Date(e);
  return t.setUTCDate(e.getUTCDate() - (qs - 1)), {
    range: {
      start: _t(t),
      end: _t(e)
    },
    includeSlices: !0,
    includeScopes: !0
  };
}
function Bs(e) {
  if (!e.length)
    return "";
  const t = e.some((i) => i.fx_coverage_ratio != null && i.fx_coverage_ratio < 1), n = e.some((i) => i.price_coverage_ratio != null && i.price_coverage_ratio < 1), r = e.some((i) => i.stale_price), a = [];
  return t && a.push('<span class="meta-badge meta-badge--warning" title="Wechselkurse fehlen teilweise">FX-Abdeckung</span>'), n && a.push('<span class="meta-badge meta-badge--warning" title="Preisdaten unvollständig">Preisabdeckung</span>'), r && a.push('<span class="meta-badge meta-badge--neutral" title="Letzte Kurse sind veraltet">Stale Kurse</span>'), a.length ? `<span class="meta-badges">${a.join("")}</span>` : '<span class="meta-badge meta-badge--positive">Volle Abdeckung</span>';
}
function ba(e) {
  return `${ae(e)}&nbsp;€`;
}
function ie(e, t) {
  return e.reduce((n, r) => {
    const a = r[t];
    return typeof a == "number" && Number.isFinite(a) ? n + a : n;
  }, 0);
}
function tt(e, t, n = "") {
  const r = e.querySelector("#analyse-status");
  r && (r.dataset.state = t, t === "loading" ? r.textContent = "Lade Vermögensdaten …" : t === "error" ? r.textContent = n || "Daten konnten nicht geladen werden." : r.textContent = "");
}
function ir(e, t, n) {
  const r = e.querySelector("#analyse-total-wealth"), a = e.querySelector("#analyse-coverage"), i = e.querySelector("#analyse-selection-label");
  if (!r || !a || !i)
    return;
  if (i.textContent = t, !n.length) {
    r.innerHTML = "—", a.innerHTML = "";
    return;
  }
  const o = n[n.length - 1];
  r.innerHTML = ba(o.total_wealth_eur), a.innerHTML = Bs(n);
}
function or(e, t) {
  const n = e.querySelector(".analyse-metrics-grid");
  if (!n) return;
  if (!t.length) {
    n.innerHTML = '<div class="metrics-empty">Keine Daten verfügbar</div>';
    return;
  }
  const r = Zs(t);
  if (!r) return;
  const a = (o, c, s = "", l = "") => `
    <div class="metric-row ${s}" ${l ? `id="${l}"` : ""}>
      <span class="metric-label">${o}</span>
      <span class="metric-value">${typeof c == "number" ? ba(c) : c}</span>
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
function Ys(e) {
  if (!e) {
    fe.clear();
    return;
  }
  const t = /* @__PURE__ */ new Set(), n = (r, a) => {
    r.forEach((i) => {
      const o = vt(a, i.scope_id);
      o && t.add(o);
    });
  };
  n(e.accounts, "account"), n(e.portfolios, "portfolio"), fe.size === 0 ? t.forEach((r) => fe.add(r)) : Array.from(fe).forEach((r) => {
    t.has(r) || fe.delete(r);
  });
}
function js(e, t) {
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
  const o = (c, s, l) => {
    const d = /* @__PURE__ */ new Map();
    if (s.forEach((p) => {
      const u = vt(l, p.scope_id);
      u && !d.has(u) && d.set(u, p);
    }), d.size === 0)
      return "";
    const f = Array.from(d.values()).map((p) => {
      const u = vt(l, p.scope_id);
      if (!u)
        return "";
      const g = fe.has(u) ? "checked" : "", m = F(p.scope_name ?? p.scope_id);
      return `
          <label class="scope-option">
            <input type="checkbox" data-scope-key="${ge(u)}" ${g}>
            <span>${m}</span>
          </label>
        `;
    }).join("");
    return `<div class="scope-group"><div class="scope-title">${c}</div>${f}</div>`;
  };
  r.innerHTML = `
    ${o("Konten", t.accounts, "account")}
    ${o("Depots", t.portfolios, "portfolio")}
  `, r.addEventListener("change", (c) => {
    const s = c.target?.closest('input[type="checkbox"][data-scope-key]');
    if (!s || !s.dataset.scopeKey)
      return;
    const { scopeKey: l } = s.dataset;
    if (!l)
      return;
    s.checked ? fe.add(l) : fe.delete(l);
    const d = e.closest("#analyse-chart-card");
    d && en && _a(d, en);
  });
}
function Ks(e) {
  if (typeof e == "number")
    return Number.isFinite(e) ? e : null;
  const t = Date.parse(e);
  return Number.isFinite(t) ? t : null;
}
function Gs(e) {
  const t = Array.from(Ws), n = {
    key: "total",
    label: "Gesamtvermögen",
    color: "#2c3e50",
    points: e.records.map((o) => ({
      date: o.date,
      value: o.total_wealth_eur
    }))
  }, r = [], a = /* @__PURE__ */ new Map(), i = (o, c) => {
    o.forEach((s) => {
      const l = vt(c, s.scope_id);
      l && (a.has(l) || a.set(l, /* @__PURE__ */ new Map()), a.get(l)?.set(s.date, s));
    });
  };
  return e.slices && (i(e.slices.accounts, "account"), i(e.slices.portfolios, "portfolio")), a.forEach((o, c) => {
    if (!fe.has(c))
      return;
    const s = t.shift() ?? "#607d8b", l = c.startsWith("account:"), d = c.split(":")[1] ?? "", p = `${l ? "Konto" : "Depot"} ${d}`.trim(), u = o.values().next(), m = (u.done ? void 0 : u.value)?.scope_name ?? p;
    r.push({
      key: c,
      label: m,
      color: s,
      points: e.records.map((h) => {
        const y = o.get(h.date);
        return !y || !Number.isFinite(y.total_wealth_eur) ? null : { date: h.date, value: y.total_wealth_eur };
      }).filter((h) => !!h)
    });
  }), [n, ...r];
}
function Xs(e, t) {
  const n = e.__chartState, r = e.querySelector("svg");
  if (!n || !n.range || !n.margin || !r)
    return;
  const { range: a, margin: i } = n;
  r.querySelectorAll(".analyse-slice-series").forEach((o) => {
    o.remove();
  }), t.filter((o) => o.key !== "total").forEach((o) => {
    const c = o.points.map((d, f) => {
      const p = Ks(d.date);
      if (p == null || !Number.isFinite(d.value))
        return null;
      const u = a.maxX === a.minX ? 0.5 : (p - a.minX) / (a.maxX - a.minX), g = a.maxY === a.minY ? 0.5 : (d.value - a.minY) / (a.maxY - a.minY), m = i.left + u * a.boundedWidth, h = i.top + (1 - g) * a.boundedHeight;
      return `${f === 0 ? "M" : "L"}${String(m)},${String(h)}`;
    }).filter(Boolean).join(" ");
    if (!c)
      return;
    const s = document.createElementNS("http://www.w3.org/2000/svg", "g");
    s.setAttribute("class", "analyse-slice-series");
    const l = document.createElementNS("http://www.w3.org/2000/svg", "path");
    l.setAttribute("d", c), l.setAttribute("fill", "none"), l.setAttribute("stroke", o.color), l.setAttribute("stroke-width", "2"), l.setAttribute("stroke-linejoin", "round"), l.setAttribute("stroke-linecap", "round"), s.appendChild(l), r.appendChild(s);
  });
}
function _a(e, t) {
  const n = e.querySelector(".line-chart-container");
  if (!n)
    return;
  const r = Gs(t), a = r[0];
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
    xAccessor: (s) => s.date,
    yAccessor: (s) => s.value,
    xFormatter: (s) => {
      const l = new Date(s);
      return Number.isFinite(l.getTime()) ? l.toLocaleDateString("de-DE") : "";
    },
    yFormatter: (s) => ae(s),
    color: a.color,
    areaColor: "rgba(44, 62, 80, 0.12)"
  }, o = n;
  let c = o;
  !o.__chartState || !n.querySelector("svg") ? (n.innerHTML = "", c = ra(n, i)) : (bn(o, i), c = o), c && Xs(c, r);
}
function Zs(e) {
  if (!e.length)
    return null;
  const t = e[0]?.total_wealth_eur ?? 0, n = e[e.length - 1]?.total_wealth_eur ?? 0, r = ie(e, "dividends_eur"), a = ie(e, "interest_eur"), i = r + a, o = -Math.abs(ie(e, "fees_eur")), c = -Math.abs(ie(e, "taxes_eur")), s = ie(e, "inbound_transfers_eur") - ie(e, "outbound_transfers_eur"), l = ie(e, "performance_neutral_movements"), d = n - t - i - o - c - s - l, f = ie(e, "realized_gains_eur"), p = ie(e, "unrealized_price_gains_eur"), u = ie(e, "fx_gains_eur");
  return {
    startValue: t,
    endValue: n,
    marketGain: d,
    realizedGains: f,
    unrealizedPriceGains: p,
    fxGains: u,
    dividends: r,
    interest: a,
    ertraege: i,
    fees: o,
    taxes: c,
    netTransfers: s,
    neutral: l
  };
}
async function sr(e, t, n, r, a) {
  tt(e, "loading");
  const i = await Us(n, r, a);
  if (i.status === "error") {
    if (tt(e, "error", i.error ?? void 0), t) {
      const s = t.querySelector(".line-chart-container");
      s && s.replaceChildren();
    }
    return;
  }
  const o = i.data;
  if (!o || !Array.isArray(o.records) || o.records.length === 0) {
    const s = a.range?.start ?? "?", l = a.range?.end ?? "?", d = `Zeitraum: ${s} – ${l}`;
    if (ir(e, d, []), or(e, []), tt(e, "loaded", "Keine Daten für den gewählten Zeitraum."), t) {
      const f = t.querySelector(".line-chart-container");
      f && f.replaceChildren();
    }
    return;
  }
  ya = a, en = o, Ys(o.slices);
  const c = a.range ? `Zeitraum: ${a.range.start} – ${a.range.end}` : a.date ? `Tag: ${a.date}` : "";
  ir(e, c, o.records), or(e, o.records), t && (js(t, o.slices), _a(t, o)), tt(e, "loaded");
}
function Js(e, t, n, r) {
  const a = e.querySelector("#analyse-date-picker-container"), i = ya ?? Qt().selection ?? Os();
  let o;
  if (i.range)
    o = {
      start: new Date(i.range.start),
      end: new Date(i.range.end)
    };
  else if (i.date) {
    const c = new Date(i.date);
    o = { start: c, end: c };
  }
  a && new $s(a, {
    initialRange: o,
    onChange: (c) => {
      const s = {
        range: {
          start: _t(c.start),
          end: _t(c.end)
        },
        includeSlices: !0,
        includeScopes: !0
      };
      sr(e, t, n, r, s);
    }
  }), sr(e, t, n, r, i);
}
function Qs(e, t, n) {
  const s = `

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

    ${un("Zeitmaschine", `
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
    const l = e.querySelector("#analyse-range-card"), d = e.querySelector("#analyse-chart-card");
    l && Js(l, d, t, n);
  }, 0), s;
}
const ec = po, tn = "pp-reader-sticky-anchor", St = "overview", tc = "analyse", nn = "security:", nc = [
  { key: St, title: "Dashboard", render: Br },
  { key: tc, title: "Zeitmaschine", render: Qs }
], Me = /* @__PURE__ */ new Map(), Qe = [], wt = /* @__PURE__ */ new Map();
let rn = null, Ut = !1, $e = null, W = 0, qt = null;
function Ct(e) {
  return typeof e == "object" && e !== null;
}
function va(e) {
  return typeof e == "object" && e !== null && typeof e.then == "function";
}
function Sa(e) {
  if (typeof e == "string") {
    const t = e.trim();
    return F(t.length > 0 ? t : "Unbekannter Fehler");
  }
  if (e instanceof Error) {
    const t = e.message.trim();
    return F(t.length > 0 ? t : e.name);
  }
  if (e != null)
    try {
      const t = JSON.stringify(e);
      if (t && t !== "{}")
        return F(t);
    } catch {
    }
  return F(String(e));
}
function rc(e) {
  return e === "accounts" || e === "last_file_update" || e === "portfolio_values" || e === "portfolio_positions";
}
function cr(e) {
  const t = e.portfolio_uuid;
  if (typeof t == "string" && t)
    return t;
  const n = e.portfolioUuid;
  return typeof n == "string" && n ? n : null;
}
function ac(e) {
  if (!e)
    return null;
  if (Array.isArray(e)) {
    for (const t of e)
      if (Ct(t)) {
        const n = cr(t);
        if (n)
          return n;
      }
    return null;
  }
  return Ct(e) ? cr(e) : null;
}
function ic(e, t) {
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
function Cn(e) {
  return typeof e != "string" || !e.startsWith(nn) ? null : e.slice(nn.length) || null;
}
function oc() {
  if (!$e)
    return !1;
  const e = Ea($e);
  return e || ($e = null), e;
}
function de() {
  const e = Qe.map((t) => Me.get(t)).filter((t) => !!t);
  return [...nc, ...e];
}
function sc(e) {
  const t = de();
  return e < 0 || e >= t.length ? null : t[e];
}
function wa(e) {
  if (!e)
    return null;
  const t = e, n = t.ppreader ?? t.pp_reader;
  return n || (Object.values(t).find((a) => !a || typeof a != "object" ? !1 : a.webcomponent_name === "pp-reader-panel") ?? null);
}
function Ca() {
  try {
    const e = xt();
    e && typeof e.rememberScrollPosition == "function" && e.rememberScrollPosition();
  } catch (e) {
    console.warn("rememberCurrentPageScroll: konnte Scroll-Position nicht sichern", e);
  }
}
function lr(e) {
  const t = de();
  return !t.length || e < 0 ? 0 : e >= t.length ? t.length - 1 : e;
}
async function cc(e, t, n, r) {
  const a = de(), i = lr(e);
  if (i === W) {
    e > W && oc();
    return;
  }
  Ca();
  const o = W >= 0 && W < a.length ? a[W] : null, c = o ? Cn(o.key) : null;
  let s = i;
  if (c) {
    const l = i >= 0 && i < a.length ? a[i] : null;
    if (l && l.key === St && pc(c, { suppressRender: !0 })) {
      const p = de().findIndex((u) => u.key === St);
      s = p >= 0 ? p : 0;
    }
  }
  if (!Ut) {
    Ut = !0;
    try {
      W = lr(s);
      const l = W;
      await Na(t, n, r), fc(l);
    } catch (l) {
      console.error("navigateToPage: Fehler beim Rendern des Tabs", l);
    } finally {
      Ut = !1;
    }
  }
}
function At(e, t, n, r) {
  cc(W + e, t, n, r);
}
function lc(e, t) {
  if (!e || !t || typeof t.render != "function") {
    console.error("registerDetailTab: Ungültiger Tab-Descriptor", e, t);
    return;
  }
  const n = Cn(e);
  if (n) {
    const a = wt.get(n);
    a && a !== e && Aa(a);
  }
  const r = {
    ...t,
    key: e
  };
  Me.set(e, r), n && wt.set(n, e), Qe.includes(e) || Qe.push(e);
}
function Aa(e) {
  if (!e)
    return;
  const t = Me.get(e);
  if (t && typeof t.cleanup == "function")
    try {
      const a = t.cleanup({ key: e });
      va(a) && a.catch((i) => {
        console.error(
          "unregisterDetailTab: Fehler beim asynchronen cleanup",
          i
        );
      });
    } catch (a) {
      console.error("unregisterDetailTab: Fehler beim Ausführen von cleanup", a);
    }
  Me.delete(e);
  const n = Qe.indexOf(e);
  n >= 0 && Qe.splice(n, 1);
  const r = Cn(e);
  r && wt.get(r) === e && wt.delete(r);
}
function uc(e) {
  return Me.has(e);
}
function ur(e) {
  return Me.get(e) ?? null;
}
function dc(e) {
  if (e != null && typeof e != "function") {
    console.error("setSecurityDetailTabFactory: Erwartet Funktion oder null", e);
    return;
  }
  rn = e ?? null;
}
function Pa(e) {
  return `${nn}${e}`;
}
function xt() {
  for (const t of Xa())
    if (t.isConnected)
      return t;
  const e = /* @__PURE__ */ new Set();
  for (const t of Za())
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
function an() {
  const e = xt();
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
const Pc = {
  findDashboardElement: xt,
  toErrorMessage: Sa
};
function fc(e) {
  const t = xt();
  if (t && typeof t.handleExternalRender == "function")
    try {
      t.handleExternalRender(e);
    } catch (n) {
      console.warn("notifyExternalRender: Fehler beim Synchronisieren des Dashboards", n);
    }
}
function Ea(e) {
  if (!e)
    return console.error("openSecurityDetail: Ungültige securityUuid", e), !1;
  const t = Pa(e);
  let n = ur(t);
  if (!n && typeof rn == "function")
    try {
      const i = rn(e);
      i && typeof i.render == "function" ? (lc(t, i), n = ur(t)) : console.error("openSecurityDetail: Factory lieferte ungültigen Descriptor", i);
    } catch (i) {
      console.error("openSecurityDetail: Fehler beim Erzeugen des Tab-Descriptors", i);
    }
  if (!n)
    return console.warn(`openSecurityDetail: Kein Detail-Tab für ${e} verfügbar`), !1;
  Ca();
  let a = de().findIndex((i) => i.key === t);
  return a === -1 && (a = de().findIndex((o) => o.key === t), a === -1) ? (console.error("openSecurityDetail: Tab nach Registrierung nicht auffindbar"), !1) : (W = a, $e = null, an(), !0);
}
function pc(e, t = {}) {
  if (!e)
    return console.error("closeSecurityDetail: Ungültige securityUuid", e), !1;
  const { suppressRender: n = !1 } = t, r = Pa(e);
  if (!uc(r))
    return !1;
  const i = de().findIndex((s) => s.key === r), o = i === W;
  Aa(r);
  const c = de();
  if (!c.length)
    return W = 0, n || an(), !0;
  if ($e = e, o) {
    const s = c.findIndex((l) => l.key === St);
    s >= 0 ? W = s : W = Math.min(Math.max(i - 1, 0), c.length - 1);
  } else W >= c.length && (W = Math.max(0, c.length - 1));
  return n || an(), !0;
}
async function Na(e, t, n) {
  let r = n;
  r || (r = wa(t ? t.panels : null));
  const a = de();
  W >= a.length && (W = Math.max(0, a.length - 1));
  const i = sc(W);
  if (!i) {
    console.error("renderTab: Kein gültiger Tab oder keine render-Methode gefunden!");
    return;
  }
  let o;
  try {
    o = await i.render(e, t, r);
  } catch (d) {
    console.error("renderTab: Fehler beim Rendern des Tabs:", d), e.innerHTML = `<div class="card"><h2>Fehler</h2><pre>${Sa(d)}</pre></div>`;
    return;
  }
  e.innerHTML = o ?? "", i.render === Br && yn(e);
  const s = await new Promise((d) => {
    const f = window.setInterval(() => {
      const p = e.querySelector(".header-card");
      p && (clearInterval(f), d(p));
    }, 50);
  });
  let l = e.querySelector(`#${tn}`);
  if (!l) {
    l = document.createElement("div"), l.id = tn;
    const d = s.parentNode;
    d && "insertBefore" in d && d.insertBefore(l, s);
  }
  mc(e, t, n), hc(e, t, n), gc(e);
}
function gc(e) {
  const t = e.querySelector(".header-card"), n = e.querySelector(`#${tn}`);
  if (!t || !n) {
    console.error("Fehlende Elemente für das Scrollverhalten: headerCard oder anchor.");
    return;
  }
  qt?.disconnect(), qt = new IntersectionObserver(
    ([r]) => {
      r.isIntersecting ? t.classList.remove("sticky") : t.classList.add("sticky");
    },
    {
      root: null,
      rootMargin: "0px 0px 0px 0px",
      threshold: 0
    }
  ), qt.observe(n);
}
function hc(e, t, n) {
  const r = e.querySelector(".header-card");
  if (!r) {
    console.error("Header-Card nicht gefunden!");
    return;
  }
  ec(
    r,
    () => {
      At(1, e, t, n);
    },
    () => {
      At(-1, e, t, n);
    }
  );
}
function mc(e, t, n) {
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
    At(-1, e, t, n);
  }), i.addEventListener("click", () => {
    At(1, e, t, n);
  }), yc(r);
}
function yc(e) {
  const t = e.querySelector("#nav-left"), n = e.querySelector("#nav-right");
  if (t && (W === 0 ? (t.disabled = !0, t.classList.add("disabled")) : (t.disabled = !1, t.classList.remove("disabled"))), n) {
    const r = de(), i = !(W === r.length - 1) || !!$e;
    n.disabled = !i, n.classList.toggle("disabled", !i);
  }
}
class bc extends HTMLElement {
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
    this._panel || (this._panel = wa(this._hass.panels ?? null));
    const t = xn(this._hass, this._panel);
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
    const n = xn(this._hass, this._panel);
    if (!n)
      return;
    const r = t.data;
    if (!rc(r.data_type) || r.entry_id && r.entry_id !== n)
      return;
    const a = ic(r.data_type, r.data);
    a && (this._queueUpdate(a.type, a.data), this._doRender(a.type, a.data));
  }
  _doRender(t, n) {
    switch (t) {
      case "accounts":
        ro(
          n,
          this._root
        );
        break;
      case "last_file_update":
        fo(
          n,
          this._root
        );
        break;
      case "portfolio_values":
        oo(
          n,
          this._root
        );
        break;
      case "portfolio_positions":
        lo(
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
    t === "portfolio_positions" && (a.portfolioUuid = ac(
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
  rememberScrollPosition(t = W) {
    const n = Number.isInteger(t) ? t : W;
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
    const t = W;
    if (!this._hasNewData && this._panel === this._lastPanel && this._narrow === this._lastNarrow && this._route === this._lastRoute && this._lastPage === t)
      return;
    this._lastPage != null && (this._scrollPositions[this._lastPage] = this._root.scrollTop);
    const n = Na(this._root, this._hass, this._panel);
    if (va(n)) {
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
customElements.get("pp-reader-dashboard") || customElements.define("pp-reader-dashboard", bc);
console.log("PPReader dashboard module v20250914b geladen");
ks({
  setSecurityDetailTabFactory: dc
});
export {
  Pc as __TEST_ONLY_DASHBOARD,
  Ac as __TEST_ONLY__,
  pc as closeSecurityDetail,
  mn as flushPendingPositions,
  ur as getDetailTabDescriptor,
  lo as handlePortfolioPositionsUpdate,
  uc as hasDetailTab,
  Ea as openSecurityDetail,
  Cc as reapplyPositionsSort,
  _c as registerDashboardElement,
  lc as registerDetailTab,
  Sc as registerPanelHost,
  dc as setSecurityDetailTabFactory,
  vc as unregisterDashboardElement,
  Aa as unregisterDetailTab,
  wc as unregisterPanelHost,
  Or as updatePortfolioFooterFromDom
};
//# sourceMappingURL=dashboard.BppblWOE.js.map
