const an = /* @__PURE__ */ new Set(), on = /* @__PURE__ */ new Set(), lr = {}, Ba = [
  "renderPositionsTable",
  "applyGainPctMetadata",
  "attachSecurityDetailListener",
  "attachPortfolioPositionsSorting",
  "updatePortfolioFooter"
];
function Ya(e, t) {
  typeof t == "function" && (lr[e] = t);
}
function yc(e) {
  e && an.add(e);
}
function _c(e) {
  e && an.delete(e);
}
function ja() {
  return an;
}
function bc(e) {
  e && on.add(e);
}
function vc(e) {
  e && on.delete(e);
}
function Ka() {
  return on;
}
function Ga(e) {
  for (const t of Ba)
    Ya(t, e[t]);
}
function sn() {
  return lr;
}
function ge(e) {
  return typeof e == "object" && e !== null;
}
function O(e) {
  return typeof e == "string" ? e : null;
}
function Qe(e) {
  return e === null ? null : O(e);
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
function Pn(e) {
  const t = V(e);
  if (t == null)
    return null;
  const n = Math.trunc(t);
  return Number.isFinite(n) ? n : null;
}
function tt(e) {
  return ge(e) ? { ...e } : null;
}
function ur(e) {
  return ge(e) ? { ...e } : null;
}
function dr(e) {
  return typeof e == "boolean" ? e : void 0;
}
function Xa(e) {
  if (!ge(e))
    return null;
  const t = O(e.name), n = O(e.currency_code), r = V(e.orig_balance);
  if (!t || !n || r == null)
    return null;
  const a = e.balance === null ? null : V(e.balance), i = {
    uuid: O(e.uuid) ?? void 0,
    name: t,
    currency_code: n,
    orig_balance: r,
    balance: a ?? null
  }, o = V(e.fx_rate);
  o != null && (i.fx_rate = o);
  const c = O(e.fx_rate_source);
  c && (i.fx_rate_source = c);
  const s = O(e.fx_rate_timestamp);
  s && (i.fx_rate_timestamp = s);
  const l = V(e.coverage_ratio);
  l != null && (i.coverage_ratio = l);
  const u = O(e.provenance);
  u && (i.provenance = u);
  const f = Qe(e.metric_run_uuid);
  f !== null && (i.metric_run_uuid = f);
  const p = dr(e.fx_unavailable);
  return typeof p == "boolean" && (i.fx_unavailable = p), i;
}
function fr(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = Xa(n);
    r && t.push(r);
  }
  return t;
}
function Za(e) {
  if (!ge(e))
    return null;
  const t = e.aggregation, n = O(e.security_uuid), r = O(e.name), a = V(e.current_holdings), i = V(e.purchase_value_eur) ?? (ge(t) ? V(t.purchase_value_eur) ?? V(t.purchase_total_account) ?? V(t.account_currency_total) : null) ?? V(e.purchase_value), o = V(e.current_value);
  if (!n || !r || a == null || i == null || o == null)
    return null;
  const c = {
    portfolio_uuid: O(e.portfolio_uuid) ?? void 0,
    security_uuid: n,
    name: r,
    ticker_symbol: O(e.ticker_symbol),
    currency_code: O(e.currency_code),
    current_holdings: a,
    purchase_value: i,
    current_value: o,
    average_cost: tt(e.average_cost),
    performance: tt(e.performance),
    aggregation: tt(e.aggregation),
    data_state: ur(e.data_state)
  }, s = V(e.coverage_ratio);
  s != null && (c.coverage_ratio = s);
  const l = O(e.provenance);
  l && (c.provenance = l);
  const u = Qe(e.metric_run_uuid);
  u !== null && (c.metric_run_uuid = u);
  const f = V(e.last_price_native);
  f != null && (c.last_price_native = f);
  const p = V(e.last_price_eur);
  p != null && (c.last_price_eur = p);
  const d = V(e.last_close_native);
  d != null && (c.last_close_native = d);
  const g = V(e.last_close_eur);
  return g != null && (c.last_close_eur = g), c;
}
function pr(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = Za(n);
    r && t.push(r);
  }
  return t;
}
function gr(e) {
  if (!ge(e))
    return null;
  const t = O(e.name), n = V(e.current_value ?? e.value);
  if (!t || n == null)
    return null;
  const a = V(
    e.purchase_sum ?? e.purchase_value_eur ?? e.purchase_value ?? e.purchaseSum
  ) ?? 0, i = {
    uuid: O(e.uuid) ?? void 0,
    name: t,
    current_value: n,
    purchase_value: a,
    purchase_sum: a,
    day_change_abs: V(e.day_change_abs) ?? V(e.day_change_eur) ?? void 0,
    day_change_pct: V(e.day_change_pct) ?? void 0,
    position_count: Pn(e.position_count ?? e.count) ?? void 0,
    missing_value_positions: Pn(e.missing_value_positions) ?? void 0,
    has_current_value: dr(e.has_current_value),
    performance: tt(e.performance),
    coverage_ratio: V(e.coverage_ratio) ?? void 0,
    provenance: O(e.provenance) ?? void 0,
    metric_run_uuid: Qe(e.metric_run_uuid) ?? void 0,
    data_state: ur(e.data_state)
  };
  return Array.isArray(e.positions) && (i.positions = pr(e.positions)), i;
}
function hr(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = gr(n);
    r && t.push(r);
  }
  return t;
}
function mr(e) {
  if (!ge(e))
    return null;
  const t = { ...e }, n = Qe(e.metric_run_uuid);
  n !== null ? t.metric_run_uuid = n : delete t.metric_run_uuid;
  const r = V(e.coverage_ratio);
  r != null ? t.coverage_ratio = r : delete t.coverage_ratio;
  const a = O(e.provenance);
  a ? t.provenance = a : delete t.provenance;
  const i = O(e.generated_at ?? e.snapshot_generated_at);
  return i ? t.generated_at = i : delete t.generated_at, t;
}
function Ja(e) {
  if (!ge(e))
    return null;
  const t = { ...e }, n = mr(e.normalized_payload);
  return n ? t.normalized_payload = n : "normalized_payload" in t && delete t.normalized_payload, t;
}
function yr(e) {
  if (!ge(e))
    return null;
  const t = O(e.generated_at);
  if (!t)
    return null;
  const n = Qe(e.metric_run_uuid), r = fr(e.accounts), a = hr(e.portfolios), i = Ja(e.diagnostics), o = {
    generated_at: t,
    metric_run_uuid: n,
    accounts: r,
    portfolios: a
  };
  return i && (o.diagnostics = i), o;
}
function te(e) {
  return typeof e == "string" ? e : null;
}
function Qa(e) {
  if (typeof e == "string")
    return e;
  if (e === null)
    return null;
}
function ei(e) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
}
function An(e, t) {
  if (typeof e == "string")
    return e;
  throw new Error(`mapPositionSnapshotToRecord: fehlendes ${t}`);
}
function xt(e, t) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  throw new Error(`mapPositionSnapshotToRecord: fehlendes ${t}`);
}
function ti(e) {
  const t = An(e.security_uuid, "security_uuid"), n = An(e.name, "name"), r = xt(e.current_holdings, "current_holdings"), a = xt(e.purchase_value, "purchase_value"), i = xt(e.current_value, "current_value"), o = {
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
function he(e, t) {
  let n = t?.config?.entry_id ?? t?.entry_id ?? t?.config?._panel_custom?.config?.entry_id ?? void 0;
  if (!n && e?.panels) {
    const r = e.panels, a = r.ppreader ?? r.pp_reader ?? Object.values(r).find(
      (i) => i?.webcomponent_name === "pp-reader-panel"
    );
    n = a?.config?.entry_id ?? a?.entry_id ?? a?.config?._panel_custom?.config?.entry_id ?? void 0;
  }
  return n ?? void 0;
}
function Nn(e, t) {
  return he(e, t);
}
async function ni(e, t) {
  if (!e)
    throw new Error("fetchAccountsWS: fehlendes hass");
  const n = he(e, t);
  if (!n)
    throw new Error("fetchAccountsWS: fehlendes entry_id");
  const r = await e.connection.sendMessagePromise({
    type: "pp_reader/get_accounts",
    entry_id: n
  }), a = fr(r.accounts), i = yr(r.normalized_payload);
  return {
    accounts: a,
    normalized_payload: i
  };
}
async function ri(e, t) {
  if (!e)
    throw new Error("fetchLastFileUpdateWS: fehlendes hass");
  const n = he(e, t);
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
async function ai(e, t) {
  if (!e)
    throw new Error("fetchPortfoliosWS: fehlendes hass");
  const n = he(e, t);
  if (!n)
    throw new Error("fetchPortfoliosWS: fehlendes entry_id");
  const r = await e.connection.sendMessagePromise({
    type: "pp_reader/get_portfolio_data",
    entry_id: n
  }), a = hr(r.portfolios), i = yr(r.normalized_payload);
  return {
    portfolios: a,
    normalized_payload: i
  };
}
function ii(e, t, n) {
  if (e && typeof e == "object") {
    const r = te(e.start), a = te(e.end);
    if (r && a)
      return { start: r, end: a };
  }
  if (n?.start && n.end)
    return { start: n.start, end: n.end };
  if (t)
    return { start: t, end: t };
  throw new Error("fetchDailyWealthWS: fehlender Zeitraum");
}
function X(e) {
  return typeof e == "number" && Number.isFinite(e) ? e : 0;
}
function En(e) {
  return e === null ? null : typeof e == "number" && Number.isFinite(e) ? e : null;
}
function _r(e) {
  const t = te(e.date);
  if (!t)
    return null;
  const n = {
    date: t,
    total_wealth_eur: X(e.total_wealth_eur),
    portfolio_wealth_eur: X(e.portfolio_wealth_eur),
    account_wealth_eur: X(e.account_wealth_eur),
    dividends_eur: X(e.dividends_eur),
    interest_eur: X(e.interest_eur),
    inbound_transfers_eur: X(e.inbound_transfers_eur),
    outbound_transfers_eur: X(e.outbound_transfers_eur),
    performance_neutral_movements: X(e.performance_neutral_movements),
    fees_eur: X(e.fees_eur),
    taxes_eur: X(e.taxes_eur),
    realized_gains_eur: X(e.realized_gains_eur),
    unrealized_gains_eur: X(e.unrealized_gains_eur),
    unrealized_price_gains_eur: X(e.unrealized_price_gains_eur),
    invested_capital_eur: X(e.invested_capital_eur),
    fx_coverage_ratio: En(e.fx_coverage_ratio),
    price_coverage_ratio: En(e.price_coverage_ratio),
    stale_price: e.stale_price === !0
  }, r = te(e.provenance);
  return r && (n.provenance = r), n;
}
function Dn(e) {
  const t = _r(e), n = te(e.scope_type), r = te(e.scope_id);
  if (!t || !n || !r || n !== "portfolio" && n !== "account")
    return null;
  const a = {
    ...t,
    scope_type: n,
    scope_id: r
  }, i = te(e.scope_name);
  return i && (a.scope_name = i), a;
}
function oi(e) {
  if (!e || typeof e != "object")
    return;
  const t = e, n = Array.isArray(t.accounts) ? t.accounts : [], r = Array.isArray(t.portfolios) ? t.portfolios : [], a = n.map((o) => o && typeof o == "object" ? Dn(o) : null).filter((o) => !!o), i = r.map((o) => o && typeof o == "object" ? Dn(o) : null).filter((o) => !!o);
  if (!(a.length === 0 && i.length === 0))
    return { accounts: a, portfolios: i };
}
async function si(e, t, n) {
  if (!e)
    throw new Error("fetchDailyWealthWS: fehlendes hass");
  const r = he(e, t);
  if (!r)
    throw new Error("fetchDailyWealthWS: fehlendes entry_id");
  const { date: a, range: i, includeSlices: o, includeScopes: c, scopes: s, limit: l, offset: u } = n, f = te(a), p = i && typeof i == "object" ? {
    start: te(i.start) ?? "",
    end: te(i.end) ?? ""
  } : null;
  if (f && p && p.start && p.end)
    throw new Error("fetchDailyWealthWS: date und range sind gleichzeitig gesetzt");
  const d = {
    type: "pp_reader/get_daily_wealth",
    entry_id: r
  };
  if (f)
    d.date = f;
  else if (p && p.start && p.end)
    d.range = p;
  else
    throw new Error("fetchDailyWealthWS: weder date noch range angegeben");
  o !== void 0 && (d.include_slices = o), c !== void 0 && (d.include_scopes = c), (Array.isArray(s?.accounts) || Array.isArray(s?.portfolios)) && (d.scopes = {}, Array.isArray(s.accounts) && (d.scopes.accounts = s.accounts.filter((b) => typeof b == "string" && b.length > 0)), Array.isArray(s.portfolios) && (d.scopes.portfolios = s.portfolios.filter(
    (b) => typeof b == "string" && b.length > 0
  ))), typeof l == "number" && Number.isFinite(l) && l > 0 && (d.limit = l), typeof u == "number" && Number.isFinite(u) && u >= 0 && (d.offset = u);
  const g = await e.connection.sendMessagePromise(d), m = ii(g.range, f, p), h = (Array.isArray(g.records) ? g.records : []).map((b) => b && typeof b == "object" ? _r(b) : null).filter((b) => !!b), _ = oi(g.slices);
  return {
    range: m,
    records: h,
    ..._ ? { slices: _ } : {}
  };
}
async function br(e, t, n) {
  if (!e)
    throw new Error("fetchPortfolioPositionsWS: fehlendes hass");
  const r = he(e, t);
  if (!r)
    throw new Error("fetchPortfolioPositionsWS: fehlendes entry_id");
  if (!n)
    throw new Error("fetchPortfolioPositionsWS: fehlendes portfolio_uuid");
  const a = await e.connection.sendMessagePromise({
    type: "pp_reader/get_portfolio_positions",
    entry_id: r,
    portfolio_uuid: n
  }), o = pr(a.positions).map(ti), c = mr(a.normalized_payload), s = {
    portfolio_uuid: te(a.portfolio_uuid) ?? n,
    positions: o
  };
  typeof a.error == "string" && (s.error = a.error);
  const l = ei(a.coverage_ratio);
  l !== void 0 && (s.coverage_ratio = l);
  const u = te(a.provenance);
  u && (s.provenance = u);
  const f = Qa(a.metric_run_uuid);
  return f !== void 0 && (s.metric_run_uuid = f), c && (s.normalized_payload = c), s;
}
async function ci(e, t, n) {
  if (!e)
    throw new Error("fetchSecuritySnapshotWS: fehlendes hass");
  const r = he(e, t);
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
async function li(e, t) {
  if (!e)
    throw new Error("fetchNewsPromptWS: fehlendes hass");
  const n = he(e, t);
  if (!n)
    throw new Error("fetchNewsPromptWS: fehlendes entry_id");
  return e.connection.sendMessagePromise({
    type: "pp_reader/get_news_prompt",
    entry_id: n
  });
}
async function ot(e, t, n, r = {}) {
  if (!e)
    throw new Error("fetchSecurityHistoryWS: fehlendes hass");
  const a = he(e, t);
  if (!a)
    throw new Error("fetchSecurityHistoryWS: fehlendes entry_id");
  if (!n)
    throw new Error("fetchSecurityHistoryWS: fehlendes securityUuid");
  const i = {
    type: "pp_reader/get_security_history",
    entry_id: a,
    security_uuid: n
  }, { startDate: o, endDate: c, start_date: s, end_date: l } = r || {}, u = o ?? s;
  u != null && (i.start_date = u);
  const f = c ?? l;
  f != null && (i.end_date = f);
  const p = await e.connection.sendMessagePromise(i);
  return Array.isArray(p.prices) || (p.prices = []), Array.isArray(p.transactions) || (p.transactions = []), p;
}
const cn = (e, t) => {
  if (!Number.isFinite(e) || e === 0)
    return "neutral";
  const n = 0.5 / Math.pow(10, t);
  return Math.abs(e) < n ? "neutral" : e > 0 ? "positive" : "negative";
};
function L(e, t, n = void 0, r = void 0) {
  let a = null;
  const i = (s) => {
    if (typeof s == "number")
      return s;
    if (typeof s == "string" && s.trim() !== "") {
      const l = s.replace(/\s+/g, "").replace(/[^0-9,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."), u = Number.parseFloat(l);
      return Number.isNaN(u) ? Number.NaN : u;
    }
    return Number.NaN;
  }, o = (s, l = 2, u = 2) => {
    const f = typeof s == "number" ? s : i(s);
    return Number.isFinite(f) ? f.toLocaleString("de-DE", {
      minimumFractionDigits: l,
      maximumFractionDigits: u
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
          const d = p.day_change;
          if (d && typeof d == "object") {
            const g = e === "day_change_pct" ? d.change_pct : d.value_change_eur ?? d.price_change_eur;
            typeof g == "number" && (t = g);
          }
        } else {
          const d = p[e];
          typeof d == "number" && (t = d);
        }
    }
    const s = n?.fx_unavailable === !0 ? "Wechselkurs nicht verfügbar – EUR-Wert unbekannt" : "";
    if (t == null || r?.hasValue === !1)
      return c(s);
    const l = typeof t == "number" ? t : i(t);
    if (!Number.isFinite(l))
      return c(s);
    const u = e.endsWith("pct") ? "%" : "€";
    return a = o(l) + `&nbsp;${u}`, `<span class="${cn(l, 2)}">${a}</span>`;
  } else if (e === "position_count") {
    const s = typeof t == "number" ? t : i(t);
    if (!Number.isFinite(s))
      return c();
    a = s.toLocaleString("de-DE");
  } else if (["balance", "current_value", "purchase_value"].includes(e)) {
    const s = typeof t == "number" ? t : i(t);
    if (!Number.isFinite(s))
      return n?.fx_unavailable ? c("Wechselkurs nicht verfügbar – EUR-Wert unbekannt") : (r && r.hasValue === !1, c());
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
    typeof t == "string" ? s = t : typeof t == "number" && Number.isFinite(t) ? s = t.toString() : typeof t == "boolean" ? s = t ? "true" : "false" : t instanceof Date && Number.isFinite(t.getTime()) && (s = t.toISOString()), a = s, a && (/<|&lt;|&gt;/.test(a) || (a.length > 60 && (a = a.slice(0, 59) + "…"), a.startsWith("Kontostand ") ? a = a.substring(11) : a.startsWith("Depotwert ") && (a = a.substring(10))));
  }
  return typeof a != "string" || a === "" ? c() : a;
}
function $e(e, t, n = [], r = {}) {
  const { sortable: a = !1, defaultSort: i } = r, o = i?.key ?? "", c = i?.dir === "desc" ? "desc" : "asc", s = (h) => {
    if (h == null)
      return "";
    let _ = "";
    if (typeof h == "string")
      _ = h;
    else if (typeof h == "number" && Number.isFinite(h))
      _ = h.toString();
    else if (typeof h == "boolean")
      _ = h ? "true" : "false";
    else if (h instanceof Date && Number.isFinite(h.getTime()))
      _ = h.toISOString();
    else
      return "";
    return _.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  };
  let l = "<table><thead><tr>";
  t.forEach((h) => {
    const _ = h.align === "right" ? ' class="align-right"' : "";
    a && h.key ? l += `<th${_} data-sort-key="${h.key}">${h.label}</th>` : l += `<th${_}>${h.label}</th>`;
  }), l += "</tr></thead><tbody>", e.forEach((h) => {
    l += "<tr>", t.forEach((_) => {
      const b = _.align === "right" ? ' class="align-right"' : "";
      l += `<td${b}>${L(_.key, h[_.key], h)}</td>`;
    }), l += "</tr>";
  });
  const u = {}, f = {};
  t.forEach((h) => {
    if (n.includes(h.key)) {
      const _ = e.reduce(
        (b, S) => {
          let C = S[h.key];
          if ((h.key === "gain_abs" || h.key === "gain_pct") && (typeof C != "number" || !Number.isFinite(C))) {
            const A = S.performance;
            if (typeof A == "object" && A !== null) {
              const P = A[h.key];
              typeof P == "number" && (C = P);
            }
          } else if ((h.key === "day_change_abs" || h.key === "day_change_pct") && (typeof C != "number" || !Number.isFinite(C))) {
            const A = S.performance;
            if (typeof A == "object" && A !== null) {
              const P = A.day_change;
              if (P && typeof P == "object") {
                const N = h.key === "day_change_pct" ? P.change_pct : P.value_change_eur ?? P.price_change_eur;
                typeof N == "number" && (C = N);
              }
            }
          }
          if (typeof C == "number" && Number.isFinite(C)) {
            const A = C;
            b.total += A, b.hasValue = !0;
          }
          return b;
        },
        { total: 0, hasValue: !1 }
      );
      _.hasValue ? (u[h.key] = _.total, f[h.key] = { hasValue: !0 }) : (u[h.key] = null, f[h.key] = { hasValue: !1 });
    }
  });
  const p = u.gain_abs ?? null;
  if (p != null) {
    const h = u.purchase_value ?? null;
    if (h != null && h > 0)
      u.gain_pct = p / h * 100;
    else {
      const _ = u.current_value ?? null;
      _ != null && _ !== 0 && (u.gain_pct = p / (_ - p) * 100);
    }
  }
  const d = u.day_change_abs ?? null;
  if (d != null) {
    const h = u.current_value ?? null;
    if (h != null) {
      const _ = h - d;
      _ && (u.day_change_pct = d / _ * 100, f.day_change_pct = { hasValue: !0 });
    }
  }
  const g = Number.isFinite(u.gain_pct ?? NaN) ? u.gain_pct : null;
  let m = "", y = "neutral";
  if (g != null && (m = `${re(g)} %`, g > 0 ? y = "positive" : g < 0 && (y = "negative")), l += '<tr class="footer-row">', t.forEach((h, _) => {
    const b = h.align === "right" ? ' class="align-right"' : "";
    if (_ === 0) {
      l += `<td${b}>Summe</td>`;
      return;
    }
    if (u[h.key] != null) {
      let C = "";
      h.key === "gain_abs" && m && (C = ` data-gain-pct="${s(m)}" data-gain-sign="${s(y)}"`), l += `<td${b}${C}>${L(h.key, u[h.key], void 0, f[h.key])}</td>`;
      return;
    }
    if (h.key === "gain_pct" && u.gain_pct != null) {
      l += `<td${b}>${L("gain_pct", u.gain_pct, void 0, f[h.key])}</td>`;
      return;
    }
    const S = f[h.key] ?? { hasValue: !1 };
    l += `<td${b}>${L(h.key, null, void 0, S)}</td>`;
  }), l += "</tr>", l += "</tbody></table>", a)
    try {
      const h = document.createElement("template");
      h.innerHTML = l.trim();
      const _ = h.content.querySelector("table");
      if (_)
        return _.classList.add("sortable-table"), o && (_.dataset.defaultSort = o, _.dataset.defaultDir = c), _.outerHTML;
    } catch (h) {
      console.warn("makeTable(sortable): Injection fehlgeschlagen:", h);
    }
  return l;
}
function ln(e, t, n = {}) {
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
function ui(e) {
  const t = Number.isNaN(e) ? 0 : e;
  return `<span class="${cn(t, 2)}">${re(t)}&nbsp;€</span>`;
}
function di(e) {
  const t = Number.isNaN(e) ? 0 : e;
  return `<span class="${cn(t, 2)}">${re(t)}&nbsp;%</span>`;
}
function vr(e, t, n = "asc", r = !1) {
  if (!e)
    return [];
  const a = e.querySelector("tbody");
  if (!a)
    return [];
  const i = a.querySelector("tr.footer-row"), o = Array.from(a.querySelectorAll("tr")).filter((u) => u !== i);
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
    const u = Array.from(e.querySelectorAll("thead th"));
    for (let f = 0; f < u.length; f++)
      if (u[f].getAttribute("data-sort-key") === t) {
        c = f;
        break;
      }
  }
  if (c < 0)
    return o;
  const s = (u) => {
    const f = u.replace(/\u00A0/g, " ").replace(/[%€]/g, "").replace(/\./g, "").replace(/,/g, ".").replace(/[^\d.-]/g, "").trim();
    if (!f) return NaN;
    const p = parseFloat(f);
    return Number.isFinite(p) ? p : NaN;
  };
  o.sort((u, f) => {
    const p = u.cells.item(c), d = f.cells.item(c), g = (p?.textContent ?? "").trim(), m = (d?.textContent ?? "").trim(), y = s(g), h = s(m);
    let _;
    const b = /[0-9]/.test(g) || /[0-9]/.test(m);
    return !Number.isNaN(y) && !Number.isNaN(h) && b ? _ = y - h : _ = g.localeCompare(m, "de", { sensitivity: "base" }), n === "asc" ? _ : -_;
  }), o.forEach((u) => a.appendChild(u)), i && a.appendChild(i), e.querySelectorAll("thead th.sort-active").forEach((u) => {
    u.classList.remove("sort-active", "dir-asc", "dir-desc");
  });
  const l = e.querySelector(`thead th[data-sort-key="${t}"]`);
  return l && l.classList.add("sort-active", n === "asc" ? "dir-asc" : "dir-desc"), o;
}
const fi = 2;
function fe(e) {
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
        const f = o.split(","), p = f[f.length - 1]?.length ?? 0, d = f.slice(0, -1).join(""), g = d.replace(/[+-]/g, "").length, m = f.length > 2, y = /^[-+]?0$/.test(d);
        o = m || p === 0 || p === 3 && g > 0 && g <= 3 && !y ? o.replace(/,/g, "") : o.replace(",", ".");
      }
    else s && c && i > a ? o = o.replace(/,/g, "") : s && o.length - i - 1 === 3 && /\d{4,}/.test(o.replace(/\./g, "")) && (o = o.replace(/\./g, ""));
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
function Pt(e, { decimals: t = fi, fallback: n = null } = {}) {
  const r = fe(e);
  if (r == null)
    return n ?? null;
  const a = 10 ** t, i = Math.round(r * a) / a;
  return Object.is(i, -0) ? 0 : i;
}
function xn(e, t = {}) {
  return Pt(e, t);
}
function pi(e, t = {}) {
  return Pt(e, t);
}
const gi = /^[+-]?(?:\d+\.?\d*|\d*\.?\d+)(?:[eE][+-]?\d+)?$/, se = (e) => {
  if (typeof e == "number")
    return Number.isFinite(e) ? e : null;
  if (typeof e == "string") {
    const t = e.trim();
    if (!t || !gi.test(t))
      return null;
    const n = Number(t);
    if (Number.isFinite(n))
      return n;
  }
  return null;
}, Sr = (e) => {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t || null;
};
function hi(e) {
  const t = e && typeof e == "object" ? e : null;
  if (!t)
    return null;
  const n = se(t.price_change_native), r = se(t.price_change_eur), a = se(t.change_pct), i = se(t.value_change_eur);
  if (n == null && r == null && a == null && i == null)
    return null;
  const o = Sr(t.source) ?? "derived", c = se(t.coverage_ratio) ?? null;
  return {
    price_change_native: n,
    price_change_eur: r,
    change_pct: a,
    value_change_eur: i ?? null,
    source: o,
    coverage_ratio: c
  };
}
function ve(e) {
  const t = e && typeof e == "object" ? e : null;
  if (!t)
    return null;
  const n = se(t.gain_abs), r = se(t.gain_pct), a = se(t.total_change_eur), i = se(t.total_change_pct);
  if (n == null || r == null || a == null || i == null)
    return null;
  const o = Sr(t.source) ?? "derived", c = se(t.coverage_ratio) ?? null, s = hi(t.day_change);
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
const _e = /* @__PURE__ */ new Map();
function me(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t.length > 0 ? t : null;
}
function U(e) {
  if (e === null)
    return null;
  const t = fe(e);
  return Number.isFinite(t ?? NaN) ? t : null;
}
function mi(e) {
  if (!e || typeof e != "object")
    return !1;
  const t = e;
  return typeof t.security_uuid == "string" && typeof t.name == "string" && typeof t.current_holdings == "number" && typeof t.purchase_value == "number" && typeof t.current_value == "number";
}
function ke(e) {
  const t = { ...e };
  return e.average_cost && typeof e.average_cost == "object" && (t.average_cost = { ...e.average_cost }), e.performance && typeof e.performance == "object" && (t.performance = { ...e.performance }), e.aggregation && typeof e.aggregation == "object" && (t.aggregation = { ...e.aggregation }), e.data_state && typeof e.data_state == "object" && (t.data_state = { ...e.data_state }), t;
}
function yi(e, t, n = []) {
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
function _i(e, t) {
  const n = e ? ke(e) : {}, r = [
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
  ], a = (s, l, u) => {
    const f = l[u];
    f !== void 0 && (s[u] = f);
  };
  r.forEach((s) => {
    a(n, t, s);
  });
  const i = (s) => {
    const l = t[s];
    if (l && typeof l == "object") {
      const u = e && e[s] && typeof e[s] == "object" ? e[s] : {};
      n[s] = {
        ...u,
        ...l
      };
    } else l !== void 0 && (n[s] = l);
  }, o = t.performance, c = e && e.performance && typeof e.performance == "object" ? e.performance : void 0;
  return o !== void 0 && (n.performance = yi(c, o, [
    "gain_pct",
    "total_change_pct"
  ])), i("aggregation"), i("average_cost"), i("data_state"), n;
}
function st(e, t) {
  if (!e)
    return [];
  if (!Array.isArray(t))
    return _e.delete(e), [];
  if (t.length === 0)
    return _e.set(e, []), [];
  const n = _e.get(e) ?? [], r = new Map(
    n.filter((i) => i.security_uuid).map((i) => [i.security_uuid, i])
  ), a = t.filter((i) => !!i).map((i) => {
    const o = i.security_uuid ?? "", c = o ? r.get(o) : void 0;
    return _i(c, i);
  }).map(ke);
  return _e.set(e, a), a.map(ke);
}
function At(e) {
  return e ? _e.has(e) : !1;
}
function Cr(e) {
  if (!e)
    return [];
  const t = _e.get(e);
  return t ? t.map(ke) : [];
}
function bi() {
  _e.clear();
}
function vi() {
  return new Map(
    Array.from(_e.entries(), ([e, t]) => [
      e,
      t.map(ke)
    ])
  );
}
function Me(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e, n = U(t.native), r = U(t.security), a = U(t.account), i = U(t.eur), o = U(t.coverage_ratio);
  if (n == null && r == null && a == null && i == null && o == null)
    return null;
  const c = me(t.source);
  return {
    native: n,
    security: r,
    account: a,
    eur: i,
    source: c === "totals" || c === "eur_total" ? c : "aggregation",
    coverage_ratio: o
  };
}
function un(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e, n = U(t.total_holdings), r = U(t.positive_holdings), a = U(t.purchase_value_eur), i = U(t.purchase_total_security) ?? U(t.security_currency_total), o = U(t.purchase_total_account) ?? U(t.account_currency_total);
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
function Si(e) {
  if (!e || typeof e != "object")
    return null;
  const t = mi(e) ? ke(e) : e, n = me(t.security_uuid), r = me(t.name), a = fe(t.current_holdings), i = xn(t.current_value), o = un(t.aggregation), c = t.aggregation && typeof t.aggregation == "object" ? t.aggregation : null, s = U(t.purchase_value_eur) ?? U(c?.purchase_value_eur) ?? U(c?.purchase_total_account) ?? U(c?.account_currency_total) ?? xn(t.purchase_value);
  if (!n || !r || a == null || s == null || i == null)
    return null;
  const l = {
    security_uuid: n,
    name: r,
    portfolio_uuid: me(t.portfolio_uuid) ?? me(t.portfolioUuid) ?? void 0,
    currency_code: me(t.currency_code),
    current_holdings: a,
    purchase_value: s,
    current_value: i
  }, u = Me(t.average_cost);
  u && (l.average_cost = u), o && (l.aggregation = o);
  const f = ve(t.performance);
  if (f)
    l.performance = f, l.gain_abs = typeof f.gain_abs == "number" ? f.gain_abs : null, l.gain_pct = typeof f.gain_pct == "number" ? f.gain_pct : null;
  else {
    const b = U(t.gain_abs), S = U(t.gain_pct);
    b !== null && (l.gain_abs = b), S !== null && (l.gain_pct = S);
  }
  "coverage_ratio" in t && (l.coverage_ratio = U(t.coverage_ratio));
  const p = me(t.provenance);
  p && (l.provenance = p);
  const d = me(t.metric_run_uuid);
  (d || t.metric_run_uuid === null) && (l.metric_run_uuid = d ?? null);
  const g = U(t.last_price_native);
  g !== null && (l.last_price_native = g);
  const m = U(t.last_price_eur);
  m !== null && (l.last_price_eur = m);
  const y = U(t.last_close_native);
  y !== null && (l.last_close_native = y);
  const h = U(t.last_close_eur);
  h !== null && (l.last_close_eur = h);
  const _ = t.data_state && typeof t.data_state == "object" ? { ...t.data_state } : void 0;
  return _ && (l.data_state = _), l;
}
function Nt(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = Si(n);
    r && t.push(r);
  }
  return t;
}
let wr = [];
const be = /* @__PURE__ */ new Map();
function nt(e) {
  return typeof e == "string" && e.length > 0 ? e : void 0;
}
function Ci(e) {
  return e === null ? null : nt(e);
}
function wi(e) {
  return typeof e == "number" && Number.isFinite(e) ? e : void 0;
}
function we(e) {
  return e === null ? null : wi(e);
}
function Fn(e) {
  if (!(typeof e != "number" || !Number.isFinite(e)))
    return Math.trunc(e);
}
function ce(e) {
  if (!(!e || typeof e != "object"))
    return { ...e };
}
function je(e) {
  const t = { ...e };
  return t.average_cost = ce(e.average_cost), t.performance = ce(e.performance), t.aggregation = ce(e.aggregation), t.data_state = ce(e.data_state), t;
}
function dn(e) {
  const t = { ...e };
  return t.performance = ce(e.performance), t.data_state = ce(e.data_state), Array.isArray(e.positions) && (t.positions = e.positions.map(je)), t;
}
function Pr(e) {
  if (!e || typeof e != "object")
    return null;
  const t = nt(e.uuid);
  if (!t)
    return null;
  const n = { uuid: t }, r = nt(e.name);
  r && (n.name = r);
  const a = we(e.current_value);
  a !== void 0 && (n.current_value = a);
  const i = we(e.purchase_sum) ?? we(e.purchase_value_eur) ?? we(e.purchase_value);
  i !== void 0 && (n.purchase_value = i, n.purchase_sum = i);
  const o = we(e.day_change_abs);
  o !== void 0 && (n.day_change_abs = o);
  const c = we(e.day_change_pct);
  c !== void 0 && (n.day_change_pct = c);
  const s = Fn(e.position_count);
  s !== void 0 && (n.position_count = s);
  const l = Fn(e.missing_value_positions);
  l !== void 0 && (n.missing_value_positions = l), typeof e.has_current_value == "boolean" && (n.has_current_value = e.has_current_value);
  const u = we(e.coverage_ratio);
  u !== void 0 && (n.coverage_ratio = u);
  const f = nt(e.provenance);
  f && (n.provenance = f), "metric_run_uuid" in e && (n.metric_run_uuid = Ci(e.metric_run_uuid));
  const p = ce(e.performance);
  p && (n.performance = p);
  const d = ce(e.data_state);
  if (d && (n.data_state = d), Array.isArray(e.positions)) {
    const g = e.positions.filter(
      (m) => !!m
    );
    g.length && (n.positions = g.map(je));
  }
  return n;
}
function Pi(e, t) {
  const n = {
    ...e,
    ...t
  };
  return !t.performance && e.performance && (n.performance = ce(e.performance)), !t.data_state && e.data_state && (n.data_state = ce(e.data_state)), !t.positions && e.positions && (n.positions = e.positions.map(je)), n;
}
function Ar(e) {
  wr = (e ?? []).map((n) => ({ ...n }));
}
function Ai() {
  return wr.map((e) => ({ ...e }));
}
function Ni(e) {
  be.clear();
  const t = e ?? [];
  for (const n of t) {
    const r = Pr(n);
    r && be.set(r.uuid, dn(r));
  }
}
function Ei(e) {
  const t = e ?? [];
  for (const n of t) {
    const r = Pr(n);
    if (!r)
      continue;
    const a = be.get(r.uuid), i = a ? Pi(a, r) : dn(r);
    be.set(i.uuid, i);
  }
}
function ct(e, t) {
  if (!e)
    return;
  const n = be.get(e);
  if (!n)
    return;
  if (!Array.isArray(t) || t.length === 0) {
    const s = { ...n };
    delete s.positions, be.set(e, s);
    return;
  }
  const r = (s, l) => {
    const u = s ? je(s) : {}, f = u;
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
    const d = (g, m = []) => {
      const y = l[g], h = s && s[g] && typeof s[g] == "object" ? s[g] : void 0;
      if (!y || typeof y != "object") {
        y !== void 0 && (f[g] = y);
        return;
      }
      const _ = {
        ...h ?? {},
        ...y
      };
      m.forEach((b) => {
        const S = h?.[b];
        S != null && (_[b] = S);
      }), f[g] = _;
    };
    return d("performance", ["gain_pct", "total_change_pct"]), d("aggregation"), d("average_cost"), d("data_state"), u;
  }, a = Array.isArray(n.positions) ? n.positions : [], i = new Map(
    a.filter((s) => s.security_uuid).map((s) => [s.security_uuid, s])
  ), o = t.filter((s) => !!s).map((s) => {
    const l = s.security_uuid ? i.get(s.security_uuid) : void 0;
    return r(l, s);
  }).map(je), c = {
    ...n,
    positions: o
  };
  be.set(e, c);
}
function Di() {
  return Array.from(be.values(), (e) => dn(e));
}
function Nr() {
  return {
    accounts: Ai(),
    portfolios: Di()
  };
}
const xi = "unknown-account";
function Z(e) {
  return typeof e != "number" || !Number.isFinite(e) ? null : e;
}
function Rn(e) {
  const t = Z(e);
  return t == null ? 0 : Math.trunc(t);
}
function ee(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t.length > 0 ? t : null;
}
function Er(e, t) {
  return ee(e) ?? t;
}
function Dr(e) {
  return e == null || !Number.isFinite(e) ? null : e < 0 ? 0 : e > 1 ? 1 : e;
}
function xr(e) {
  return e.split(/[\s_-]+/).filter(Boolean).map(
    (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
  ).join(" ");
}
function Fr(e) {
  const t = Fi(e);
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
function Fi(e) {
  const t = ee(e);
  if (!t)
    return null;
  const n = Ri(t);
  return n || xr(t);
}
function Ri(e) {
  const t = e.trim();
  if (!t.startsWith("{") && !t.startsWith("["))
    return null;
  try {
    const n = JSON.parse(t), r = $i(n), a = n && typeof n == "object" ? ee(
      n.provider ?? n.source
    ) : null;
    if (r.length && a)
      return `${xr(a)} (${r.join(", ")})`;
    if (r.length)
      return `FX (${r.join(", ")})`;
  } catch {
    return null;
  }
  return null;
}
function $i(e) {
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
function ki(e) {
  if (!e)
    return null;
  const t = ee(e.uuid) ?? `${xi}-${e.name ?? "0"}`, n = Er(e.name, "Unbenanntes Konto"), r = ee(e.currency_code), a = Z(e.balance), i = Z(e.orig_balance), o = "coverage_ratio" in e ? Dr(Z(e.coverage_ratio)) : null, c = ee(e.provenance), s = ee(e.metric_run_uuid), l = e.fx_unavailable === !0, u = Z(e.fx_rate), f = ee(e.fx_rate_source), p = ee(e.fx_rate_timestamp), d = [], g = Fr(c);
  g && d.push(g);
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
    fx_rate: u,
    fx_rate_source: f,
    fx_rate_timestamp: p,
    badges: d
  }, y = typeof s == "string" ? s : null;
  return m.metric_run_uuid = y, m;
}
function Ti(e) {
  if (!e)
    return null;
  const t = ee(e.uuid);
  if (!t)
    return null;
  const n = Er(e.name, "Unbenanntes Depot"), r = Rn(e.position_count), a = Rn(e.missing_value_positions), i = Z(e.current_value), o = Z(e.purchase_sum) ?? Z(e.purchase_value_eur) ?? Z(e.purchase_value) ?? 0, c = Z(e.day_change_abs) ?? null, s = Z(e.day_change_pct) ?? null, l = ve(e.performance), u = l?.gain_abs ?? null, f = l?.gain_pct ?? null, p = l?.day_change ?? null;
  let d = c ?? (p?.value_change_eur != null ? Z(p.value_change_eur) : null), g = s ?? (p?.change_pct != null ? Z(p.change_pct) : null);
  if (d == null && g != null && i != null) {
    const N = i / (1 + g / 100);
    N && (d = i - N);
  }
  if (g == null && d != null && i != null) {
    const N = i - d;
    N && (g = d / N * 100);
  }
  const m = i != null, y = e.has_current_value === !1 || !m, h = "coverage_ratio" in e ? Dr(Z(e.coverage_ratio)) : null, _ = ee(e.provenance), b = ee(e.metric_run_uuid), S = [], C = Fr(_);
  C && S.push(C);
  const A = {
    uuid: t,
    name: n,
    position_count: r,
    current_value: i,
    purchase_sum: o,
    day_change_abs: d ?? null,
    day_change_pct: g ?? null,
    gain_abs: u,
    gain_pct: f,
    hasValue: m,
    fx_unavailable: y || a > 0,
    missing_value_positions: a,
    performance: l,
    coverage_ratio: h,
    provenance: _,
    metric_run_uuid: null,
    badges: S
  }, P = typeof b == "string" ? b : null;
  return A.metric_run_uuid = P, A;
}
function Rr() {
  const { accounts: e } = Nr();
  return e.map(ki).filter((t) => !!t);
}
function Li() {
  const { portfolios: e } = Nr();
  return e.map(Ti).filter((t) => !!t);
}
function Se(e) {
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
function $r(e) {
  return Se(e);
}
function kr(e, t = {}) {
  if (!e || e.length === 0)
    return "";
  const n = ["meta-badges", t.containerClass].filter(Boolean).join(" "), r = e.map((a) => {
    const i = `meta-badge--${a.tone}`, o = a.description ? ` title="${Se(a.description)}"` : "";
    return `<span class="meta-badge ${i}"${o}>${Se(
      a.label
    )}</span>`;
  }).join("");
  return `<span class="${n}">${r}</span>`;
}
function lt(e, t, n = {}) {
  const r = kr(t, n);
  if (!r)
    return Se(e);
  const a = n.labelClass ?? "name-with-badges__label";
  return `<span class="${["name-with-badges", n.containerClass].filter(Boolean).join(" ")}"><span class="${a}">${Se(
    e
  )}</span>${r}</span>`;
}
function Tr(e, t, n, r) {
  e[t] = {
    previous: n,
    current: r
  };
}
const le = /* @__PURE__ */ new Map(), Oe = /* @__PURE__ */ new Map();
function Mi(e) {
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
function He(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t.length > 0 ? t : null;
}
function Ne(e) {
  return typeof e == "number" && Number.isFinite(e) ? e : void 0;
}
function Hi(e) {
  return e === null ? null : Ne(e);
}
function Ii(e) {
  return e === null ? null : He(e);
}
function $n(e) {
  return (e ?? []).filter(
    (t) => !t.key.endsWith("-coverage") && !t.key.startsWith("provenance-")
  );
}
function kn(e) {
  return ve(e.performance);
}
const zi = 500, Vi = 10, Ui = "pp-reader:portfolio-positions-updated", qi = "pp-reader:diagnostics", Ft = /* @__PURE__ */ new Map(), Lr = [
  "coverage_ratio",
  "provenance",
  "metric_run_uuid",
  "generated_at"
], qt = /* @__PURE__ */ new Map();
function Wi(e, t) {
  return `${e}:${t}`;
}
function Oi(e) {
  if (e === void 0)
    return;
  if (e === null)
    return null;
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  const t = Hi(e);
  if (t === null)
    return null;
  if (typeof t == "number" && Number.isFinite(t))
    return t;
}
function Rt(e) {
  if (e !== void 0)
    return Ii(e);
}
function fn(e, t, n, r) {
  const a = {}, i = Oi(e);
  i !== void 0 && (a.coverage_ratio = i);
  const o = Rt(t);
  o !== void 0 && (a.provenance = o);
  const c = Rt(n);
  c !== void 0 && (a.metric_run_uuid = c);
  const s = Rt(r);
  return s !== void 0 && (a.generated_at = s), Object.keys(a).length > 0 ? a : null;
}
function Bi(e, t) {
  const n = {};
  let r = !1;
  for (const a of Lr) {
    const i = e?.[a], o = t[a];
    i !== o && (Tr(n, a, i, o), r = !0);
  }
  return r ? n : null;
}
function Yi(e) {
  const t = {};
  let n = !1;
  for (const r of Lr) {
    const a = e[r];
    a !== void 0 && (Tr(t, r, a, void 0), n = !0);
  }
  return n ? t : null;
}
function Tn(e) {
  if (Object.keys(e.changed).length) {
    try {
      console.debug("pp-reader:diagnostics", e);
    } catch {
    }
    if (!(typeof window > "u" || typeof window.dispatchEvent != "function"))
      try {
        window.dispatchEvent(new CustomEvent(qi, { detail: e }));
      } catch (t) {
        console.warn("updateConfigsWS: Diagnostics-Event konnte nicht gesendet werden", t);
      }
  }
}
function pn(e, t, n, r) {
  const a = Wi(e, n), i = Ft.get(a);
  if (!r) {
    if (!i)
      return;
    Ft.delete(a);
    const c = Yi(i);
    if (!c)
      return;
    Tn({
      kind: e,
      uuid: n,
      source: t,
      changed: c,
      snapshot: {},
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    return;
  }
  const o = Bi(i, r);
  o && (Ft.set(a, { ...r }), Tn({
    kind: e,
    uuid: n,
    source: t,
    changed: o,
    snapshot: { ...r },
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  }));
}
function ji(e) {
  if (!(!e || e.length === 0))
    for (const t of e) {
      const n = He(t.uuid);
      if (!n)
        continue;
      const r = fn(
        t.coverage_ratio,
        t.provenance,
        t.metric_run_uuid,
        void 0
      );
      pn("account", "accounts", n, r);
    }
}
function Ki(e) {
  if (!(!e || e.length === 0))
    for (const t of e) {
      const n = He(t.uuid);
      if (!n)
        continue;
      const r = fn(
        t.coverage_ratio,
        t.provenance,
        t.metric_run_uuid,
        void 0
      );
      pn("portfolio", "portfolio_values", n, r);
    }
}
function Gi(e, t) {
  if (!t)
    return;
  const n = fn(
    t.coverage_ratio ?? t.normalized_payload?.coverage_ratio,
    t.provenance ?? t.normalized_payload?.provenance,
    t.metric_run_uuid ?? t.normalized_payload?.metric_run_uuid,
    t.normalized_payload?.generated_at
  );
  pn("portfolio_positions", "portfolio_positions", e, n);
}
function Xi(e, t) {
  return `<div class="error">${Mi(e)} <button class="retry-pos" data-portfolio="${t}">Erneut laden</button></div>`;
}
function Zi(e, t, n) {
  const r = e.querySelector("table.sortable-positions");
  if (!r) return;
  const a = e.dataset.sortKey || r.dataset.defaultSort || "name", o = (e.dataset.sortDir || r.dataset.defaultDir || "asc") === "desc" ? "desc" : "asc";
  e.dataset.sortKey = a, e.dataset.sortDir = o;
  try {
    vr(r, a, o, !0);
  } catch (l) {
    console.warn("restoreSortAndInit: sortTableRows Fehler:", l);
  }
  const { attachPortfolioPositionsSorting: c, attachSecurityDetailListener: s } = sn();
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
function Mr(e, t, n, r) {
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
    return i.innerHTML = Xi(r, t), { applied: !0 };
  const o = i.dataset.sortKey, c = i.dataset.sortDir;
  return i.innerHTML = oo(n), o && (i.dataset.sortKey = o), c && (i.dataset.sortDir = c), Zi(i, e, t), { applied: !0 };
}
function gn(e, t) {
  const n = le.get(t);
  if (!n) return !1;
  const r = Mr(
    e,
    t,
    n.positions,
    n.error
  );
  return r.applied && le.delete(t), r.applied;
}
function Ji(e) {
  let t = !1;
  for (const [n] of le)
    gn(e, n) && (t = !0);
  return t;
}
function Hr(e, t) {
  const n = Oe.get(t) ?? {
    attempts: 0,
    timer: null
  };
  n.timer || (n.timer = setTimeout(() => {
    n.timer = null, n.attempts += 1;
    const r = gn(e, t);
    r || n.attempts >= Vi ? (Oe.delete(t), r || le.delete(t)) : Hr(e, t);
  }, zi), Oe.set(t, n));
}
function Qi(e, t) {
  console.log("updateConfigsWS: Kontodaten-Update erhalten:", e);
  const n = Array.isArray(e) ? e : [];
  if (Ar(n), ji(n), !t)
    return;
  const r = Rr();
  eo(r, t);
  const a = t.querySelector(".portfolio-table table"), i = a ? Array.from(
    a.querySelectorAll("tbody tr.portfolio-row")
  ).map((o) => {
    const c = o.dataset.currentValue, s = c ? Number.parseFloat(c) : Number.NaN;
    if (Number.isFinite(s))
      return {
        current_value: s
      };
    const l = o.cells.item(3), u = rt(l?.textContent);
    return {
      current_value: Number.isFinite(u) ? u : 0
    };
  }) : [];
  Ir(r, i, t);
}
function eo(e, t) {
  const n = t.querySelector(".account-table"), r = t.querySelector(".fx-account-table"), a = e.filter((o) => (o.currency_code || "EUR") === "EUR"), i = e.filter((o) => (o.currency_code || "EUR") !== "EUR");
  if (n) {
    const o = a.map((c) => ({
      name: lt(c.name, $n(c.badges), {
        containerClass: "account-name",
        labelClass: "account-name__label"
      }),
      balance: c.balance ?? null
    }));
    n.innerHTML = $e(
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
      const s = c.orig_balance, l = typeof s == "number" && Number.isFinite(s), u = He(c.currency_code), f = l ? s.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) : null, p = f ? u ? `${f} ${u}` : f : "";
      return {
        name: lt(c.name, $n(c.badges), {
          containerClass: "account-name",
          labelClass: "account-name__label"
        }),
        fx_display: p,
        balance: c.balance ?? null
      };
    });
    r.innerHTML = $e(
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
function to(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = gr(n);
    r && t.push(r);
  }
  return t;
}
function no(e, t) {
  if (!Array.isArray(e)) {
    console.warn("handlePortfolioUpdate: Update ist kein Array:", e);
    return;
  }
  try {
    console.debug("handlePortfolioUpdate: payload=", e);
  } catch {
  }
  const n = to(e);
  if (n.length && Ei(n), Ki(n), !t)
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
        const d = typeof navigator < "u" && navigator.language ? navigator.language : "de-DE";
        return new Intl.NumberFormat(d, {
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
  }, u = /* @__PURE__ */ new Map();
  for (const f of n) {
    const p = He(f.uuid);
    p && u.set(p, f);
  }
  for (const [f, p] of u.entries()) {
    const d = o.get(f);
    if (!d)
      continue;
    d.cells.length < 8 && console.warn("handlePortfolioUpdate: Unerwartetes Spaltenlayout", d.cells.length);
    const g = d.cells.item(1), m = d.cells.item(2), y = d.cells.item(3), h = d.cells.item(4), _ = d.cells.item(5), b = d.cells.item(6), S = d.cells.item(7);
    if (!g || !m || !y)
      continue;
    const C = typeof p.position_count == "number" && Number.isFinite(p.position_count) ? p.position_count : 0, A = typeof p.current_value == "number" && Number.isFinite(p.current_value) ? p.current_value : null, P = ve(p.performance), N = typeof P?.gain_abs == "number" ? P.gain_abs : null, F = typeof P?.gain_pct == "number" ? P.gain_pct : null, H = typeof p.purchase_sum == "number" && Number.isFinite(p.purchase_sum) ? p.purchase_sum : typeof p.purchase_value == "number" && Number.isFinite(p.purchase_value) ? p.purchase_value : null, w = P?.day_change ?? null, E = Ne(p.day_change_abs) ?? Ne(w?.value_change_eur) ?? Ne(w?.price_change_eur), I = Ne(p.day_change_pct) ?? Ne(w?.change_pct);
    let x = E ?? null, R = I ?? null;
    if (x == null && R != null && A != null) {
      const j = A / (1 + R / 100);
      j && (x = A - j);
    }
    if (R == null && x != null && A != null) {
      const j = A - x;
      j && (R = x / j * 100);
    }
    const K = typeof p.missing_value_positions == "number" && Number.isFinite(p.missing_value_positions) ? p.missing_value_positions : 0, v = A !== null, D = p.has_current_value === !1 || K > 0 || !v, T = rt(y.textContent);
    rt(g.textContent) !== C && (g.textContent = l(C));
    const $ = {
      fx_unavailable: D,
      current_value: A,
      performance: P
    }, z = { hasValue: v }, W = L("purchase_value", H, $, z);
    m.innerHTML !== W && (m.innerHTML = W);
    const B = L("current_value", $.current_value, $, z), G = typeof A == "number" ? A : 0;
    if ((Math.abs(T - G) >= 5e-3 || y.innerHTML !== B) && (y.innerHTML = B, d.classList.add("flash-update"), setTimeout(() => {
      d.classList.remove("flash-update");
    }, 800)), h && (h.innerHTML = L("day_change_abs", x, $, z)), _ && (_.innerHTML = L("day_change_pct", R, $, z)), b) {
      const j = L("gain_abs", N, $, z);
      b.innerHTML = j;
      const Ce = typeof F == "number" && Number.isFinite(F) ? F : null;
      b.dataset.gainPct = Ce != null ? `${i(Ce)} %` : "—", b.dataset.gainSign = Ce != null ? Ce > 0 ? "positive" : Ce < 0 ? "negative" : "neutral" : "neutral";
    }
    S && (S.innerHTML = L("gain_pct", F, $, z)), d.dataset.positionCount = C.toString(), d.dataset.purchaseSum = H != null ? H.toString() : "", d.dataset.currentValue = v ? G.toString() : "", d.dataset.dayChange = v && x != null ? x.toString() : "", d.dataset.dayChangePct = v && R != null ? R.toString() : "", d.dataset.gainAbs = N != null ? N.toString() : "", d.dataset.gainPct = F != null ? F.toString() : "", d.dataset.hasValue = v ? "true" : "false", d.dataset.fxUnavailable = D ? "true" : "false", d.dataset.coverageRatio = typeof p.coverage_ratio == "number" && Number.isFinite(p.coverage_ratio) ? p.coverage_ratio.toString() : "", d.dataset.provenance = typeof p.provenance == "string" ? p.provenance : "", d.dataset.metricRunUuid = typeof p.metric_run_uuid == "string" ? p.metric_run_uuid : "", s += 1;
  }
  if (s === 0)
    console.debug("handlePortfolioUpdate: Keine passenden Zeilen gefunden / keine Änderungen.");
  else {
    const f = s.toLocaleString("de-DE");
    console.debug(`handlePortfolioUpdate: ${f} Zeile(n) gepatcht.`);
  }
  try {
    so(r);
  } catch (f) {
    console.warn("handlePortfolioUpdate: Fehler bei Summen-Neuberechnung:", f);
  }
  try {
    const f = (...h) => {
      for (const _ of h) {
        if (!_) continue;
        const b = t.querySelector(_);
        if (b) return b;
      }
      return null;
    }, p = f(
      ".account-table table",
      ".accounts-eur-table table",
      ".accounts-table table"
    ), d = f(
      ".fx-account-table table",
      ".accounts-fx-table table"
    ), g = (h, _) => {
      if (!h) return [];
      const b = h.querySelectorAll("tbody tr.account-row");
      return (b.length ? Array.from(b) : Array.from(h.querySelectorAll("tbody tr:not(.footer-row)"))).map((C) => {
        const A = _ ? C.cells.item(2) : C.cells.item(1);
        return { balance: rt(A?.textContent) };
      });
    }, m = [
      ...g(p, !1),
      ...g(d, !0)
    ], y = Array.from(
      r.querySelectorAll("tbody tr.portfolio-row")
    ).map((h) => {
      const _ = h.dataset.currentValue, b = h.dataset.purchaseSum, S = _ ? Number.parseFloat(_) : Number.NaN, C = b ? Number.parseFloat(b) : Number.NaN;
      return {
        current_value: Number.isFinite(S) ? S : 0,
        purchase_sum: Number.isFinite(C) ? C : 0
      };
    });
    Ir(m, y, t);
  } catch (f) {
    console.warn("handlePortfolioUpdate: Fehler bei Total-Neuberechnung:", f);
  }
}
function ro(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e.portfolio_uuid;
  if (typeof t == "string" && t)
    return t;
  const n = e.portfolioUuid;
  return typeof n == "string" && n ? n : null;
}
function Wt(e) {
  qt.delete(e);
}
function Ln(e) {
  return typeof e != "number" || !Number.isInteger(e) || e <= 0 ? null : e;
}
function ao(e, t, n, r) {
  if (!n || n <= 1 || !t)
    return Wt(e), r;
  const a = n, i = qt.get(e) ?? { expected: a, chunks: /* @__PURE__ */ new Map() };
  if (i.expected !== a && (i.chunks.clear(), i.expected = a), i.chunks.set(t, r), qt.set(e, i), i.chunks.size < a)
    return null;
  const o = [];
  for (let c = 1; c <= a; c += 1) {
    const s = i.chunks.get(c);
    s && Array.isArray(s) && o.push(...s);
  }
  return Wt(e), o;
}
function Mn(e, t) {
  const n = ro(e);
  if (!n)
    return console.warn("handlePortfolioPositionsUpdate: Ungültiges Update:", e), !1;
  const r = e?.error, a = Ln(e?.chunk_index), i = Ln(e?.chunk_count), o = Nt(e?.positions ?? []);
  r && Wt(n);
  const c = r ? o : ao(n, a, i, o);
  if (!r && c === null)
    return !0;
  const s = r ? o : c ?? [];
  Gi(n, e);
  const l = At(n);
  let u = s;
  if (!r && l) {
    const p = st(n, s);
    ct(n, p), u = p;
  }
  const f = Mr(t, n, u, r);
  if (f.applied) {
    if (le.delete(n), !r && !l) {
      const p = st(n, u);
      ct(n, p);
    }
  } else
    r || f.reason !== "hidden" || l ? (le.set(n, { positions: u, error: r }), Hr(t, n)) : (le.delete(n), Oe.delete(n));
  if (!r && o.length > 0) {
    const p = Array.from(
      new Set(
        o.map((d) => d.security_uuid).filter((d) => typeof d == "string" && d.length > 0)
      )
    );
    if (p.length && typeof window < "u")
      try {
        window.dispatchEvent(
          new CustomEvent(
            Ui,
            {
              detail: {
                portfolioUuid: n,
                securityUuids: p
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
function io(e, t) {
  if (Array.isArray(e)) {
    let n = !1;
    for (const r of e)
      Mn(r, t) && (n = !0);
    !n && e.length && console.warn("handlePortfolioPositionsUpdate: Kein gültiges Element im Array:", e);
    return;
  }
  Mn(e, t);
}
function oo(e) {
  const { renderPositionsTable: t, applyGainPctMetadata: n } = sn();
  try {
    if (typeof t == "function")
      return t(e);
  } catch {
  }
  if (e.length === 0)
    return '<div class="no-positions">Keine Positionen vorhanden.</div>';
  const r = e.map((i) => {
    const o = kn(i);
    return {
      name: i.name,
      current_holdings: i.current_holdings,
      purchase_value: i.purchase_value,
      current_value: i.current_value,
      performance: o
    };
  }), a = $e(
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
        const d = s[p];
        d && (f.setAttribute("data-sort-key", d), f.classList.add("sortable-col"));
      }), o.querySelectorAll("tbody tr").forEach((f, p) => {
        if (f.classList.contains("footer-row"))
          return;
        const d = e[p];
        d.security_uuid && (f.dataset.security = d.security_uuid), f.classList.add("position-row");
      }), o.dataset.defaultSort = "name", o.dataset.defaultDir = "asc";
      const u = n;
      if (u)
        try {
          u(o);
        } catch (f) {
          console.warn("renderPositionsTableInline: applyGainPctMetadata failed", f);
        }
      else
        o.querySelectorAll("tbody tr").forEach((p, d) => {
          if (p.classList.contains("footer-row"))
            return;
          const g = p.cells.item(4);
          if (!g)
            return;
          const m = e[d], y = kn(m), h = typeof y?.gain_pct == "number" && Number.isFinite(y.gain_pct) ? y.gain_pct : null, _ = h != null ? `${h.toLocaleString("de-DE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })} %` : "—", b = h == null ? "neutral" : h > 0 ? "positive" : h < 0 ? "negative" : "neutral";
          g.dataset.gainPct = _, g.dataset.gainSign = b;
        });
      return o.outerHTML;
    }
  } catch (i) {
    console.warn("renderPositionsTableInline: Sortier-Metadaten Injection fehlgeschlagen:", i);
  }
  return a;
}
function so(e) {
  if (!e) return;
  const { updatePortfolioFooter: t } = sn();
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
    const _ = Number.parseFloat(h);
    return Number.isFinite(_) ? _ : null;
  }, a = n.reduce(
    (h, _) => {
      const b = r(_.dataset.positionCount);
      if (b != null && (h.sumPositions += b), _.dataset.fxUnavailable === "true" && (h.fxUnavailable = !0), _.dataset.hasValue !== "true")
        return h.incompleteRows += 1, h;
      h.valueRows += 1;
      const S = r(_.dataset.currentValue), C = r(_.dataset.gainAbs), A = r(_.dataset.purchaseSum);
      return S == null || C == null || A == null ? (h.incompleteRows += 1, h) : (h.sumCurrent += S, h.sumGainAbs += C, h.sumPurchase += A, h);
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
  }, u = { hasValue: i }, f = L("current_value", l.current_value, l, u), p = i ? a.sumGainAbs : null, d = i ? o : null, g = L("gain_abs", p, l, u), m = L("gain_pct", d, l, u);
  c.innerHTML = `
    <td>Summe</td>
    <td class="align-right">${s}</td>
    <td class="align-right">${f}</td>
    <td class="align-right">${g}</td>
    <td class="align-right">${m}</td>
  `;
  const y = c.cells.item(3);
  y && (y.dataset.gainPct = i && typeof o == "number" ? `${Ot(o)} %` : "—", y.dataset.gainSign = i && typeof o == "number" ? o > 0 ? "positive" : o < 0 ? "negative" : "neutral" : "neutral"), c.dataset.positionCount = Math.round(a.sumPositions).toString(), c.dataset.currentValue = i ? a.sumCurrent.toString() : "", c.dataset.purchaseSum = i ? a.sumPurchase.toString() : "", c.dataset.gainAbs = i ? a.sumGainAbs.toString() : "", c.dataset.gainPct = i && typeof o == "number" ? o.toString() : "", c.dataset.hasValue = i ? "true" : "false", c.dataset.fxUnavailable = a.fxUnavailable || !i ? "true" : "false";
}
function Hn(e) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  if (typeof e == "string") {
    const t = Number.parseFloat(e);
    return Number.isFinite(t) ? t : 0;
  }
  return 0;
}
function Ot(e) {
  return (Pt(e, { fallback: 0 }) ?? 0).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
function Ir(e, t, n) {
  const r = n ?? document, i = (Array.isArray(e) ? e : []).reduce((f, p) => {
    const d = p.balance ?? p.current_value ?? p.value, g = Hn(d);
    return f + g;
  }, 0), c = (Array.isArray(t) ? t : []).reduce((f, p) => {
    const d = p.current_value ?? p.value, g = Hn(d);
    return f + g;
  }, 0), s = i + c, l = r.querySelector("#headerMeta");
  if (!l) {
    console.warn("updateTotalWealth: #headerMeta nicht gefunden.");
    return;
  }
  const u = l.querySelector("strong") || l.querySelector(".total-wealth-value");
  u ? u.textContent = `${Ot(s)} €` : l.textContent = `💰 Gesamtvermögen: ${Ot(s)} €`, l.dataset.totalWealthEur = s.toString();
}
function co(e, t) {
  const n = typeof e == "string" ? e : e?.last_file_update, r = He(n) ?? "";
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
function Sc(e) {
  if (e == null)
    return;
  const t = e.querySelector("table.sortable-positions");
  if (t == null)
    return;
  const n = e.dataset.sortKey || t.dataset.defaultSort || "name", a = (e.dataset.sortDir || t.dataset.defaultDir || "asc") === "desc" ? "desc" : "asc";
  e.dataset.sortKey = n, e.dataset.sortDir = a, vr(t, n, a, !0);
}
const Cc = {
  getPortfolioPositionsCacheSnapshot: vi,
  clearPortfolioPositionsCache: bi,
  getPendingUpdateCount() {
    return le.size;
  },
  queuePendingUpdate(e, t, n) {
    le.set(e, { positions: t, error: n });
  },
  clearPendingUpdates() {
    le.clear(), Oe.clear();
  }
};
function rt(e) {
  return e == null ? 0 : parseFloat(
    e.replace(/\u00A0/g, " ").replace(/[€%]/g, "").replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "")
  ) || 0;
}
const In = 50;
function zn(e, t) {
  try {
    t();
  } catch (n) {
    console.warn(`addSwipeEvents: ${e} handler threw`, n);
  }
}
function lo(e, t, n) {
  let r = null;
  const a = (l) => {
    l < -In ? zn("left", t) : l > In && zn("right", n);
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
  }, c = (l) => {
    r = l.clientX;
  }, s = (l) => {
    r !== null && (a(l.clientX - r), r = null);
  };
  e.addEventListener("touchstart", i, { passive: !0 }), e.addEventListener("touchend", o, { passive: !0 }), e.addEventListener("mousedown", c), e.addEventListener("mouseup", s);
}
const uo = [
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
function $t(e) {
  return uo.includes(e);
}
function kt(e) {
  return e === "asc" || e === "desc";
}
function zr(e) {
  return (e ?? []).filter((t) => !t.key.endsWith("-coverage"));
}
function Vn(e) {
  return zr(e).filter(
    (t) => !t.key.startsWith("provenance-")
  );
}
let ut = null, dt = null;
const Un = { min: 2, max: 6 };
function Ve(e) {
  return fe(e);
}
function fo(e) {
  return typeof e == "number" && Number.isFinite(e);
}
function po(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  if (!t)
    return null;
  const n = t.toUpperCase();
  return /^[A-Z]{3}$/.test(n) ? n : n === "€" ? "EUR" : null;
}
function qn(e, t, n = null) {
  for (const r of t) {
    const a = po(e[r]);
    if (a)
      return a;
  }
  return n;
}
function Wn(e, t) {
  return fo(e) ? `${e.toLocaleString("de-DE", {
    minimumFractionDigits: Un.min,
    maximumFractionDigits: Un.max
  })}${t ? ` ${t}` : ""}` : null;
}
function go(e) {
  const t = e, n = e.average_cost ?? null, r = e.aggregation ?? null, a = qn(t, [
    "security_currency_code",
    "security_currency",
    "native_currency_code",
    "native_currency"
  ], e.currency_code ?? null), i = qn(
    t,
    [
      "account_currency_code",
      "account_currency",
      "purchase_currency_code",
      "currency_code"
    ],
    a === "EUR" ? "EUR" : null
  ) ?? "EUR", o = Ve(n?.native), c = Ve(n?.security), s = Ve(n?.account), l = Ve(n?.eur), u = c ?? o, f = l ?? (i === "EUR" ? s : null), p = a ?? i, d = p === "EUR";
  let g, m;
  d ? (g = "EUR", m = f ?? u ?? s ?? null) : u != null ? (g = p, m = u) : s != null ? (g = i, m = s) : (g = "EUR", m = f ?? null);
  const y = Wn(m, g), h = d ? null : Wn(f, "EUR"), _ = !!h && h !== y, b = [], S = [];
  y ? (b.push(
    `<span class="purchase-price purchase-price--primary">${y}</span>`
  ), S.push(y.replace(/\u00A0/g, " "))) : (b.push('<span class="missing-value" role="note" aria-label="Kein Kaufpreis verfügbar" title="Kein Kaufpreis verfügbar">—</span>'), S.push("Kein Kaufpreis verfügbar")), _ && h && (b.push(
    `<span class="purchase-price purchase-price--secondary">${h}</span>`
  ), S.push(h.replace(/\u00A0/g, " ")));
  const C = b.join("<br>"), A = Ve(r?.purchase_value_eur) ?? 0, P = S.join(", ");
  return { markup: C, sortValue: A, ariaLabel: P };
}
function ho(e) {
  const t = fe(e.current_holdings);
  if (t == null)
    return { value: null, pct: null };
  const n = fe(e.last_price_eur), r = fe(e.last_close_eur);
  let a = null, i = null;
  if (n != null && r != null) {
    a = (n - r) * t;
    const f = r * t;
    f && (i = a / f * 100);
  }
  const c = ve(e.performance)?.day_change ?? null;
  if (a == null && c?.price_change_eur != null && (a = c.price_change_eur * t), i == null && c?.change_pct != null && (i = c.change_pct), a == null && i != null) {
    const u = fe(e.current_value);
    if (u != null) {
      const f = u / (1 + i / 100);
      f && (a = u - f);
    }
  }
  const s = a != null && Number.isFinite(a) ? Math.round(a * 100) / 100 : null, l = i != null && Number.isFinite(i) ? Math.round(i * 100) / 100 : null;
  return { value: s, pct: l };
}
const ft = /* @__PURE__ */ new Set();
function Vr(e) {
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
function Ke(e) {
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
    const i = ve(a.performance), o = typeof i?.gain_abs == "number" ? i.gain_abs : null, c = typeof i?.gain_pct == "number" ? i.gain_pct : null, s = ho(a), l = typeof a.purchase_value == "number" || typeof a.purchase_value == "string" ? a.purchase_value : null;
    return {
      name: typeof a.name == "string" ? Se(a.name) : typeof a.name == "number" ? String(a.name) : "",
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
  }), r = $e(n, t, ["purchase_value", "current_value", "day_change_abs", "gain_abs"]);
  try {
    const a = document.createElement("template");
    a.innerHTML = r.trim();
    const i = a.content.querySelector("table");
    if (i) {
      i.classList.add("sortable-positions");
      const o = Array.from(i.querySelectorAll("thead th"));
      return t.forEach((s, l) => {
        const u = o.at(l);
        u && (u.setAttribute("data-sort-key", s.key), u.classList.add("sortable-col"));
      }), i.querySelectorAll("tbody tr").forEach((s, l) => {
        if (s.classList.contains("footer-row") || l >= e.length)
          return;
        const u = e[l], f = typeof u.security_uuid == "string" ? u.security_uuid : null;
        f && (s.dataset.security = f), s.classList.add("position-row");
        const p = s.cells.item(2);
        if (p) {
          const { markup: m, sortValue: y, ariaLabel: h } = go(u);
          p.innerHTML = m, p.dataset.sortValue = String(y), h ? p.setAttribute("aria-label", h) : p.removeAttribute("aria-label");
        }
        const d = s.cells.item(7);
        if (d) {
          const m = ve(u.performance), y = typeof m?.gain_pct == "number" && Number.isFinite(m.gain_pct) ? m.gain_pct : null, h = y != null ? `${y.toLocaleString("de-DE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })} %` : "—", _ = y == null ? "neutral" : y > 0 ? "positive" : y < 0 ? "negative" : "neutral";
          d.dataset.gainPct = h, d.dataset.gainSign = _;
        }
        const g = s.cells.item(8);
        g && g.classList.add("gain-pct-cell");
      }), i.dataset.defaultSort = "name", i.dataset.defaultDir = "asc", Vr(i), i.outerHTML;
    }
  } catch (a) {
    console.warn("renderPositionsTable: Konnte Sortier-Metadaten nicht injizieren:", a);
  }
  return r;
}
function mo(e) {
  const t = Nt(e ?? []);
  return Ke(t);
}
function yo(e, t) {
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
        wa(s) || console.warn("attachSecurityDetailDelegation: Detail-Tab konnte nicht geöffnet werden für", s);
      } catch (l) {
        console.error("attachSecurityDetailDelegation: Fehler beim Öffnen des Detail-Tabs", l);
      }
  })));
}
function Ge(e, t) {
  yo(e, t);
}
function Ur(e) {
  console.debug("buildExpandablePortfolioTable: render", e.length, "portfolios");
  const t = (v) => v == null || typeof v != "string" && typeof v != "number" && typeof v != "boolean" ? "" : Se(v);
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
  r.forEach((v) => {
    const D = v.align === "right" ? ' class="align-right"' : "";
    n += `<th${D}>${v.label}</th>`;
  }), n += "</tr></thead><tbody>", e.forEach((v) => {
    const D = Number.isFinite(v.position_count) ? v.position_count : 0, T = Number.isFinite(v.purchase_sum) ? v.purchase_sum : 0, Y = v.hasValue && typeof v.current_value == "number" && Number.isFinite(v.current_value) ? v.current_value : null, $ = Y !== null, z = v.performance, W = typeof v.gain_abs == "number" ? v.gain_abs : typeof z?.gain_abs == "number" ? z.gain_abs : null, B = typeof v.gain_pct == "number" ? v.gain_pct : typeof z?.gain_pct == "number" ? z.gain_pct : null, G = z && typeof z == "object" ? z.day_change : null, j = typeof v.day_change_abs == "number" ? v.day_change_abs : G && typeof G == "object" ? G.value_change_eur ?? G.price_change_eur : null, Ie = typeof v.day_change_pct == "number" ? v.day_change_pct : G && typeof G == "object" && typeof G.change_pct == "number" ? G.change_pct : null, Ce = v.fx_unavailable && $, Aa = typeof v.coverage_ratio == "number" && Number.isFinite(v.coverage_ratio) ? v.coverage_ratio : "", Na = typeof v.provenance == "string" ? v.provenance : "", Ea = typeof v.metric_run_uuid == "string" ? v.metric_run_uuid : "", ze = ft.has(v.uuid), Da = ze ? "portfolio-toggle expanded" : "portfolio-toggle", Cn = `portfolio-details-${v.uuid}`, J = {
      fx_unavailable: v.fx_unavailable,
      purchase_value: T,
      current_value: Y,
      day_change_abs: j,
      day_change_pct: Ie,
      gain_abs: W,
      gain_pct: B
    }, Ae = { hasValue: $ }, xa = L("purchase_value", J.purchase_value, J, Ae), Fa = L("current_value", J.current_value, J, Ae), Ra = L("day_change_abs", J.day_change_abs, J, Ae), $a = L("day_change_pct", J.day_change_pct, J, Ae), ka = L("gain_abs", J.gain_abs, J, Ae), Ta = L("gain_pct", J.gain_pct, J, Ae), wn = $ && typeof B == "number" && Number.isFinite(B) ? `${re(B)} %` : "", La = $ && typeof B == "number" && Number.isFinite(B) ? B > 0 ? "positive" : B < 0 ? "negative" : "neutral" : "", Ma = $ && typeof Y == "number" && Number.isFinite(Y) ? Y : "", Ha = $ && typeof W == "number" && Number.isFinite(W) ? W : "", Ia = $ && typeof B == "number" && Number.isFinite(B) ? B : "", za = $ && typeof j == "number" && Number.isFinite(j) ? j : "", Va = $ && typeof Ie == "number" && Number.isFinite(Ie) ? Ie : "", Ua = String(D);
    let Dt = "";
    wn && (Dt = ` data-gain-pct="${t(wn)}" data-gain-sign="${t(La)}"`), Ce && (Dt += ' data-partial="true"'), n += `<tr class="portfolio-row"
                  data-portfolio="${v.uuid}"
                  data-position-count="${Ua}"
                  data-current-value="${t(Ma)}"
                  data-purchase-sum="${t(T)}"
                  data-day-change="${t(za)}"
                  data-day-change-pct="${t(Va)}"
                  data-gain-abs="${t(Ha)}"
                data-gain-pct="${t(Ia)}"
                data-has-value="${$ ? "true" : "false"}"
                data-fx-unavailable="${v.fx_unavailable ? "true" : "false"}"
                data-coverage-ratio="${t(Aa)}"
                data-provenance="${t(Na)}"
                data-metric-run-uuid="${t(Ea)}">`;
    const qa = Se(v.name), Wa = kr(zr(v.badges), {
      containerClass: "portfolio-badges"
    });
    n += `<td>
        <button type="button"
                class="${Da}"
                data-portfolio="${v.uuid}"
                aria-expanded="${ze ? "true" : "false"}"
                aria-controls="${Cn}">
          <span class="caret">${ze ? "▼" : "▶"}</span>
          <span class="portfolio-name">${qa}</span>${Wa}
        </button>
      </td>`;
    const Oa = D.toLocaleString("de-DE");
    n += `<td class="align-right">${Oa}</td>`, n += `<td class="align-right">${xa}</td>`, n += `<td class="align-right">${Fa}</td>`, n += `<td class="align-right">${Ra}</td>`, n += `<td class="align-right">${$a}</td>`, n += `<td class="align-right"${Dt}>${ka}</td>`, n += `<td class="align-right gain-pct-cell">${Ta}</td>`, n += "</tr>", n += `<tr class="portfolio-details${ze ? "" : " hidden"}"
                data-portfolio="${v.uuid}"
                id="${Cn}"
                role="region"
                aria-label="Positionen für ${v.name}">
      <td colspan="${r.length.toString()}">
        <div class="positions-container">${ze ? At(v.uuid) ? Ke(Cr(v.uuid)) : '<div class="loading">Lade Positionen...</div>' : ""}</div>
      </td>
    </tr>`;
  });
  const a = e.filter((v) => typeof v.current_value == "number" && Number.isFinite(v.current_value)), i = e.reduce((v, D) => v + (Number.isFinite(D.position_count) ? D.position_count : 0), 0), o = a.reduce((v, D) => typeof D.current_value == "number" && Number.isFinite(D.current_value) ? v + D.current_value : v, 0), c = a.reduce((v, D) => typeof D.purchase_sum == "number" && Number.isFinite(D.purchase_sum) ? v + D.purchase_sum : v, 0), s = a.map((v) => {
    if (typeof v.day_change_abs == "number")
      return v.day_change_abs;
    const D = v.performance && typeof v.performance == "object" ? v.performance.day_change : null;
    if (D && typeof D == "object") {
      const T = D.value_change_eur;
      if (typeof T == "number" && Number.isFinite(T))
        return T;
    }
    return null;
  }).filter((v) => typeof v == "number" && Number.isFinite(v)), l = s.reduce((v, D) => v + D, 0), u = a.reduce((v, D) => {
    if (typeof D.performance?.gain_abs == "number" && Number.isFinite(D.performance.gain_abs))
      return v + D.performance.gain_abs;
    const T = typeof D.current_value == "number" && Number.isFinite(D.current_value) ? D.current_value : 0, Y = typeof D.purchase_sum == "number" && Number.isFinite(D.purchase_sum) ? D.purchase_sum : 0;
    return v + (T - Y);
  }, 0), f = a.length > 0, p = a.length !== e.length, d = s.length > 0, g = d && f && o !== 0 ? (() => {
    const v = o - l;
    return v ? l / v * 100 : null;
  })() : null, m = f && c > 0 ? u / c * 100 : null, y = {
    fx_unavailable: p,
    purchase_value: f ? c : null,
    current_value: f ? o : null,
    day_change_abs: d ? l : null,
    day_change_pct: d ? g : null,
    gain_abs: f ? u : null,
    gain_pct: f ? m : null
  }, h = { hasValue: f }, _ = { hasValue: d }, b = L("purchase_value", y.purchase_value, y, h), S = L("current_value", y.current_value, y, h), C = L("day_change_abs", y.day_change_abs, y, _), A = L("day_change_pct", y.day_change_pct, y, _), P = L("gain_abs", y.gain_abs, y, h), N = L("gain_pct", y.gain_pct, y, h);
  let F = "";
  if (f && typeof m == "number" && Number.isFinite(m)) {
    const v = `${re(m)} %`, D = m > 0 ? "positive" : m < 0 ? "negative" : "neutral";
    F = ` data-gain-pct="${t(v)}" data-gain-sign="${t(D)}"`;
  }
  p && (F += ' data-partial="true"');
  const H = String(Math.round(i)), w = f ? String(o) : "", E = f ? String(c) : "", I = d ? String(l) : "", x = d && typeof g == "number" && Number.isFinite(g) ? String(g) : "", R = f ? String(u) : "", K = f && typeof m == "number" && Number.isFinite(m) ? String(m) : "";
  return n += `<tr class="footer-row"
      data-position-count="${H}"
      data-current-value="${t(w)}"
      data-purchase-sum="${t(E)}"
      data-day-change="${t(I)}"
      data-day-change-pct="${t(x)}"
      data-gain-abs="${t(R)}"
      data-gain-pct="${t(K)}"
      data-has-value="${f ? "true" : "false"}"
      data-fx-unavailable="${p ? "true" : "false"}">
      <td>Summe</td>
      <td class="align-right">${Math.round(i).toLocaleString("de-DE")}</td>
    <td class="align-right">${b}</td>
    <td class="align-right">${S}</td>
    <td class="align-right">${C}</td>
    <td class="align-right">${A}</td>
    <td class="align-right"${F}>${P}</td>
    <td class="align-right gain-pct-cell">${N}</td>
  </tr>`, n += "</tbody></table>", n;
}
function _o(e) {
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
function Ue(e) {
  if (e === void 0)
    return null;
  const t = Number(e);
  return Number.isFinite(t) ? t : null;
}
function qr(e) {
  const t = _o(e);
  if (!t)
    return;
  const n = t.tBodies.item(0);
  if (!n)
    return;
  const r = Array.from(n.querySelectorAll("tr.portfolio-row"));
  if (!r.length)
    return;
  let a = 0, i = 0, o = 0, c = 0, s = 0, l = !1, u = !1, f = !0, p = !1;
  for (const T of r) {
    const Y = Ue(T.dataset.positionCount);
    Y != null && (a += Y), T.dataset.fxUnavailable === "true" && (p = !0);
    const $ = T.dataset.hasValue;
    if (!!($ === "false" || $ === "0" || $ === "" || $ == null)) {
      f = !1;
      continue;
    }
    l = !0;
    const W = Ue(T.dataset.currentValue), B = Ue(T.dataset.gainAbs), G = Ue(T.dataset.purchaseSum), j = Ue(T.dataset.dayChange);
    if (W == null || B == null || G == null) {
      f = !1;
      continue;
    }
    i += W, c += B, o += G, j != null && (s += j, u = !0);
  }
  const d = l && f, g = d && o > 0 ? c / o * 100 : null, m = u && d && i !== 0 ? (() => {
    const T = i - s;
    return T ? s / T * 100 : null;
  })() : null;
  let y = Array.from(n.children).find(
    (T) => T instanceof HTMLTableRowElement && T.classList.contains("footer-row")
  );
  y || (y = document.createElement("tr"), y.classList.add("footer-row"), n.appendChild(y));
  const h = Math.round(a).toLocaleString("de-DE"), _ = {
    fx_unavailable: p || !d,
    purchase_value: d ? o : null,
    current_value: d ? i : null,
    day_change_abs: u && d ? s : null,
    day_change_pct: u && d ? m : null,
    gain_abs: d ? c : null,
    gain_pct: d ? g : null
  }, b = { hasValue: d }, S = { hasValue: u && d }, C = L("purchase_value", _.purchase_value, _, b), A = L("current_value", _.current_value, _, b), P = L("day_change_abs", _.day_change_abs, _, S), N = L("day_change_pct", _.day_change_pct, _, S), F = L("gain_abs", _.gain_abs, _, b), H = L("gain_pct", _.gain_pct, _, b), w = t.tHead ? t.tHead.rows.item(0) : null, E = w ? w.cells.length : 0, I = y.cells.length, x = E || I, R = x > 0 ? x <= 5 : !1, K = d && typeof g == "number" ? `${re(g)} %` : "", v = d && typeof g == "number" ? g > 0 ? "positive" : g < 0 ? "negative" : "neutral" : "neutral";
  R ? y.innerHTML = `
      <td>Summe</td>
      <td class="align-right">${h}</td>
      <td class="align-right">${A}</td>
      <td class="align-right">${F}</td>
      <td class="align-right gain-pct-cell">${H}</td>
    ` : y.innerHTML = `
      <td>Summe</td>
      <td class="align-right">${h}</td>
      <td class="align-right">${C}</td>
      <td class="align-right">${A}</td>
      <td class="align-right">${P}</td>
      <td class="align-right">${N}</td>
      <td class="align-right">${F}</td>
      <td class="align-right">${H}</td>
    `;
  const D = y.cells.item(R ? 3 : 6);
  D && (D.dataset.gainPct = K || "—", D.dataset.gainSign = v), y.dataset.positionCount = String(Math.round(a)), y.dataset.currentValue = d ? String(i) : "", y.dataset.purchaseSum = d ? String(o) : "", y.dataset.dayChange = d && u ? String(s) : "", y.dataset.dayChangePct = d && u && typeof m == "number" ? String(m) : "", y.dataset.gainAbs = d ? String(c) : "", y.dataset.gainPct = d && typeof g == "number" ? String(g) : "", y.dataset.hasValue = d ? "true" : "false", y.dataset.fxUnavailable = p ? "true" : "false";
}
function Xe(e, t) {
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
  const i = (p, d) => {
    const g = a.querySelector("tbody");
    if (!g) return;
    const m = Array.from(g.querySelectorAll("tr")).filter((b) => !b.classList.contains("footer-row")), y = g.querySelector("tr.footer-row"), h = (b) => {
      if (b == null) return 0;
      const S = b.replace(/\u00A0/g, " ").replace(/[%€]/g, "").replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, ""), C = Number.parseFloat(S);
      return Number.isFinite(C) ? C : 0;
    };
    m.sort((b, S) => {
      const A = {
        name: 0,
        current_holdings: 1,
        average_price: 2,
        purchase_value: 3,
        current_value: 4,
        day_change_abs: 5,
        day_change_pct: 6,
        gain_abs: 7,
        gain_pct: 8
      }[p], P = b.cells.item(A), N = S.cells.item(A);
      let F = "";
      if (P) {
        const I = P.textContent;
        typeof I == "string" && (F = I.trim());
      }
      let H = "";
      if (N) {
        const I = N.textContent;
        typeof I == "string" && (H = I.trim());
      }
      const w = (I, x) => {
        const R = I ? I.dataset.sortValue : void 0;
        if (R != null && R !== "") {
          const K = Number(R);
          if (Number.isFinite(K))
            return K;
        }
        return h(x);
      };
      let E;
      if (p === "name")
        E = F.localeCompare(H, "de", { sensitivity: "base" });
      else {
        const I = w(P, F), x = w(N, H);
        E = I - x;
      }
      return d === "asc" ? E : -E;
    }), a.querySelectorAll("thead th.sort-active").forEach((b) => {
      b.classList.remove("sort-active", "dir-asc", "dir-desc");
    });
    const _ = a.querySelector(`thead th[data-sort-key="${p}"]`);
    _ && _.classList.add("sort-active", d === "asc" ? "dir-asc" : "dir-desc"), m.forEach((b) => g.appendChild(b)), y && g.appendChild(y);
  }, o = r.dataset.sortKey, c = r.dataset.sortDir, s = a.dataset.defaultSort, l = a.dataset.defaultDir, u = $t(o) ? o : $t(s) ? s : "name", f = kt(c) ? c : kt(l) ? l : "asc";
  i(u, f), a.addEventListener("click", (p) => {
    const d = p.target;
    if (!(d instanceof Element))
      return;
    const g = d.closest("th[data-sort-key]");
    if (!g || !a.contains(g)) return;
    const m = g.getAttribute("data-sort-key");
    if (!$t(m))
      return;
    let y = "asc";
    r.dataset.sortKey === m && (y = (kt(r.dataset.sortDir) ? r.dataset.sortDir : "asc") === "asc" ? "desc" : "asc"), r.dataset.sortKey = m, r.dataset.sortDir = y, i(m, y);
  });
}
async function bo(e, t, n) {
  if (!e || !ut || !dt) return;
  const r = t || n.querySelector(
    `.portfolio-details[data-portfolio="${e}"] .positions-container`
  );
  if (!r)
    return;
  const a = r.closest(".portfolio-details");
  if (!(a && a.classList.contains("hidden"))) {
    r.innerHTML = '<div class="loading">Neu laden...</div>';
    try {
      const i = await br(
        ut,
        dt,
        e
      );
      if (i.error) {
        const c = typeof i.error == "string" ? i.error : String(i.error);
        r.innerHTML = `<div class="error">${c} <button class="retry-pos" data-portfolio="${e}">Erneut laden</button></div>`;
        return;
      }
      const o = Nt(
        Array.isArray(i.positions) ? i.positions : []
      );
      st(e, o), ct(e, o), r.innerHTML = Ke(o);
      try {
        Xe(n, e);
      } catch (c) {
        console.warn("attachPortfolioToggleHandler: Sort-Init (Lazy) fehlgeschlagen:", c);
      }
      try {
        Ge(n, e);
      } catch (c) {
        console.warn("reloadPortfolioPositions: Security-Listener konnte nicht gebunden werden:", c);
      }
    } catch (i) {
      const o = i instanceof Error ? i.message : String(i);
      r.innerHTML = `<div class="error">Fehler: ${o} <button class="retry-pos" data-portfolio="${e}">Retry</button></div>`;
    }
  }
}
async function vo(e, t, n = 3e3, r = 50) {
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
function hn(e) {
  const n = (typeof e.__ppReaderAttachToken == "number" ? e.__ppReaderAttachToken : 0) + 1;
  e.__ppReaderAttachToken = n, e.__ppReaderAttachInProgress = !0, (async () => {
    try {
      const r = await vo(e, ".portfolio-table");
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
              const d = c.getAttribute("data-portfolio");
              if (d) {
                const m = e.querySelector(
                  `.portfolio-details[data-portfolio="${d}"]`
                )?.querySelector(".positions-container");
                await bo(d, m ?? null, e);
              }
              return;
            }
            const s = o.closest(".portfolio-toggle");
            if (!s || !r.contains(s)) return;
            const l = s.getAttribute("data-portfolio");
            if (!l) return;
            const u = e.querySelector(
              `.portfolio-details[data-portfolio="${l}"]`
            );
            if (!u) return;
            const f = s.querySelector(".caret");
            if (u.classList.contains("hidden")) {
              u.classList.remove("hidden"), s.classList.add("expanded"), s.setAttribute("aria-expanded", "true"), f && (f.textContent = "▼"), ft.add(l);
              try {
                gn(e, l);
              } catch (d) {
                console.warn("attachPortfolioToggleHandler: Pending-Flush fehlgeschlagen:", d);
              }
              if (At(l)) {
                const d = u.querySelector(".positions-container");
                if (d) {
                  d.innerHTML = Ke(
                    Cr(l)
                  ), Xe(e, l);
                  try {
                    Ge(e, l);
                  } catch (g) {
                    console.warn("attachPortfolioToggleHandler: Security-Listener (Cache) Fehler:", g);
                  }
                }
              } else {
                const d = u.querySelector(".positions-container");
                d && (d.innerHTML = '<div class="loading">Lade Positionen...</div>');
                try {
                  const g = await br(
                    ut,
                    dt,
                    l
                  );
                  if (g.error) {
                    const y = typeof g.error == "string" ? g.error : String(g.error);
                    d && (d.innerHTML = `<div class="error">${y} <button class="retry-pos" data-portfolio="${l}">Erneut laden</button></div>`);
                    return;
                  }
                  const m = Nt(
                    Array.isArray(g.positions) ? g.positions : []
                  );
                  if (st(l, m), ct(
                    l,
                    m
                  ), d) {
                    d.innerHTML = Ke(m);
                    try {
                      Xe(e, l);
                    } catch (y) {
                      console.warn("attachPortfolioToggleHandler: Sort-Init (Lazy) fehlgeschlagen:", y);
                    }
                    try {
                      Ge(e, l);
                    } catch (y) {
                      console.warn("attachPortfolioToggleHandler: Security-Listener konnte nicht gebunden werden:", y);
                    }
                  }
                } catch (g) {
                  const m = g instanceof Error ? g.message : String(g), y = u.querySelector(".positions-container");
                  y && (y.innerHTML = `<div class="error">Fehler beim Laden: ${m} <button class="retry-pos" data-portfolio="${l}">Retry</button></div>`), console.error("Fehler beim Lazy Load für", l, g);
                }
              }
            } else
              u.classList.add("hidden"), s.classList.remove("expanded"), s.setAttribute("aria-expanded", "false"), f && (f.textContent = "▶"), ft.delete(l);
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
function So(e) {
  const t = e.querySelector(".expandable-portfolio-table");
  t && (t.__ppReaderPortfolioFallbackBound || (t.__ppReaderPortfolioFallbackBound = !0, t.addEventListener("click", (n) => {
    const r = n.target;
    !(r instanceof Element) || !r.closest(".portfolio-toggle") || e.querySelector(".portfolio-table")?.__ppReaderPortfolioToggleBound || (console.debug("Fallback-Listener aktiv – re-attach Hauptlistener"), hn(e));
  })));
}
async function Wr(e, t, n) {
  ut = t ?? null, dt = n ?? null, console.debug(
    "renderDashboard: start – panelConfig:",
    n?.config,
    "derived entry_id?",
    n?.config?._panel_custom?.config?.entry_id
  );
  const r = await ni(t, n);
  Ar(r.accounts);
  const a = Rr(), i = await ai(t, n);
  Ni(i.portfolios);
  const o = Li();
  let c = "";
  try {
    c = await ri(t, n);
  } catch {
    c = "";
  }
  const s = a.reduce(
    (w, E) => w + (typeof E.balance == "number" && Number.isFinite(E.balance) ? E.balance : 0),
    0
  ), l = o.some((w) => w.fx_unavailable), u = a.some((w) => w.fx_unavailable && (w.balance == null || !Number.isFinite(w.balance))), f = o.reduce((w, E) => E.hasValue && typeof E.current_value == "number" && Number.isFinite(E.current_value) ? w + E.current_value : w, 0), p = s + f, d = "Teilw. fehlende FX-Kurse – Gesamtvermögen abweichend", m = o.some((w) => w.hasValue && typeof w.current_value == "number" && Number.isFinite(w.current_value)) || a.some((w) => typeof w.balance == "number" && Number.isFinite(w.balance)) ? `${re(p)}&nbsp;€` : `<span class="missing-value" role="note" aria-label="${d}" title="${d}">—</span>`, y = l || u ? `<span class="total-wealth-note">${d}</span>` : "", h = `
    <div class="header-meta-row">
      💰 Gesamtvermögen: <strong class="total-wealth-value">${m}</strong>${y}
    </div>
  `, _ = ln("Übersicht", h), b = Ur(o), S = a.filter((w) => (w.currency_code ?? "EUR") === "EUR"), C = a.filter((w) => (w.currency_code ?? "EUR") !== "EUR"), P = C.some((w) => w.fx_unavailable) ? `
        <p class="table-note" role="note">
          <span class="table-note__icon" aria-hidden="true">⚠️</span>
          <span>Wechselkurse konnten nicht geladen werden. EUR-Werte werden derzeit nicht angezeigt.</span>
        </p>
      ` : "", N = `
    <div class="card">
      <h2>Liquidität</h2>
      <div class="scroll-container account-table">
        ${$e(
    S.map((w) => ({
      name: lt(w.name, Vn(w.badges), {
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
          ${$e(
    C.map((w) => {
      const E = w.orig_balance, x = typeof E == "number" && Number.isFinite(E) ? `${E.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}&nbsp;${w.currency_code ?? ""}` : "";
      return {
        name: lt(w.name, Vn(w.badges), {
          containerClass: "account-name",
          labelClass: "account-name__label"
        }),
        fx_display: x,
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
  `, F = `
    <div class="card footer-card">
      <div class="meta">
        <div class="last-file-update">
          📂 Letzte Aktualisierung der Datei: <strong>${c || "Unbekannt"}</strong>
        </div>
      </div>
    </div>
  `, H = `
    ${_.outerHTML}
    <div class="card">
      <h2>Investment</h2>
      <div class="scroll-container portfolio-table">
        ${b}
      </div>
    </div>
    ${N}
    ${F}
  `;
  return Co(e, o), H;
}
function Co(e, t) {
  if (!e)
    return;
  const n = () => {
    try {
      const a = e, i = a.querySelector(".portfolio-table");
      i && i.querySelectorAll(".portfolio-toggle").length === 0 && (console.debug("Recovery: Tabelle ohne Buttons – erneuter Aufbau"), i.innerHTML = Ur(t)), hn(e), So(e), ft.forEach((o) => {
        try {
          At(o) && (Xe(e, o), Ge(e, o));
        } catch (c) {
          console.warn("Init-Sortierung für expandiertes Depot fehlgeschlagen:", o, c);
        }
      });
      try {
        qr(a);
      } catch (o) {
        console.warn("renderDashboard: Footer-Summe konnte nicht aktualisiert werden:", o);
      }
      try {
        Ji(e);
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
Ga({
  renderPositionsTable: (e) => mo(e),
  applyGainPctMetadata: Vr,
  attachSecurityDetailListener: Ge,
  attachPortfolioPositionsSorting: Xe,
  updatePortfolioFooter: (e) => {
    e && qr(e);
  }
});
const wo = "http://www.w3.org/2000/svg", Ee = 640, De = 260, qe = { top: 12, right: 16, bottom: 24, left: 16 }, We = "var(--pp-reader-chart-line, #3f51b5)", Bt = "var(--pp-reader-chart-area, rgba(63, 81, 181, 0.12))", On = "0.75rem", Or = "var(--pp-reader-chart-baseline, rgba(96, 125, 139, 0.75))", Br = "6 4", Po = 1440 * 60 * 1e3;
function Ao(e) {
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
function No(e) {
  return typeof e == "string" ? e : typeof e == "number" && Number.isFinite(e) ? e.toString() : e instanceof Date && Number.isFinite(e.getTime()) ? e.toISOString() : "";
}
function Q(e) {
  return `${String(e)}px`;
}
function ie(e, t = {}) {
  const n = document.createElementNS(wo, e);
  return Object.entries(t).forEach(([r, a]) => {
    const i = Ao(a);
    i != null && n.setAttribute(r, i);
  }), n;
}
function pt(e, t = null) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  if (typeof e == "string" && e.trim() !== "") {
    const n = Number.parseFloat(e);
    if (Number.isFinite(n))
      return n;
  }
  return t;
}
function Yr(e, t) {
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
const jr = (e) => {
  if (e && typeof e == "object" && "date" in e)
    return e.date;
}, Kr = (e) => {
  if (e && typeof e == "object" && "close" in e)
    return e.close;
}, Gr = (e, t, n) => {
  if (Number.isFinite(e)) {
    const r = new Date(e);
    if (!Number.isNaN(r.getTime()))
      return r.toLocaleDateString("de-DE");
  }
  if (t && typeof t == "object" && "date" in t) {
    const r = t.date, a = No(r);
    if (a)
      return a;
  }
  return Number.isFinite(e) ? e.toString() : "";
}, Xr = (e, t, n) => (Number.isFinite(e) ? e : pt(e, 0) ?? 0).toLocaleString("de-DE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
}), Zr = ({ xFormatted: e, yFormatted: t }) => `
    <div class="chart-tooltip-date">${e}</div>
    <div class="chart-tooltip-value">${t}&nbsp;€</div>
  `, Jr = ({
  marker: e,
  xFormatted: t,
  yFormatted: n
}) => `
    <div class="chart-tooltip-date">${(typeof e.label == "string" ? e.label : null) || t}</div>
    <div class="chart-tooltip-value">${n}</div>
  `;
function Qr(e) {
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
    width: Ee,
    height: De,
    margin: { ...qe },
    series: [],
    points: [],
    range: null,
    xAccessor: jr,
    yAccessor: Kr,
    xFormatter: Gr,
    yFormatter: Xr,
    tooltipRenderer: Zr,
    markerTooltipRenderer: Jr,
    color: We,
    areaColor: Bt,
    baseline: null,
    handlersAttached: !1,
    markers: [],
    markerPositions: []
  }), e.__chartState;
}
function ne(e, t, n) {
  return !Number.isFinite(e) || e < t ? t : e > n ? n : e;
}
function Eo(e, t) {
  if (e.length === 0)
    return "";
  const n = [];
  e.forEach((o, c) => {
    const s = c === 0 ? "M" : "L", l = o.x.toFixed(2), u = o.y.toFixed(2);
    n.push(`${s}${l} ${u}`);
  });
  const r = e[0], i = `L${e[e.length - 1].x.toFixed(2)} ${t.toFixed(2)} L${r.x.toFixed(2)} ${t.toFixed(2)} Z`;
  return `${n.join(" ")} ${i}`;
}
function Do(e) {
  if (e.length === 0)
    return "";
  const t = [];
  return e.forEach((n, r) => {
    const a = r === 0 ? "M" : "L", i = n.x.toFixed(2), o = n.y.toFixed(2);
    t.push(`${a}${i} ${o}`);
  }), t.join(" ");
}
function xo(e) {
  const { baselineLine: t, baseline: n } = e;
  if (!t)
    return;
  const r = n?.color ?? Or, a = n?.dashArray ?? Br;
  t.setAttribute("stroke", r), t.setAttribute("stroke-dasharray", a);
}
function Tt(e) {
  const { baselineLine: t, baseline: n, range: r, margin: a, width: i } = e;
  if (!t)
    return;
  const o = n?.value;
  if (!r || o == null || !Number.isFinite(o)) {
    t.style.opacity = "0";
    return;
  }
  const { minY: c, maxY: s, boundedHeight: l } = r, u = Number.isFinite(c) ? c : o, p = (Number.isFinite(s) ? s : u + 1) - u, d = p === 0 ? 0.5 : (o - u) / p, g = ne(d, 0, 1), m = Math.max(l, 0), y = a.top + (1 - g) * m, h = Math.max(i - a.left - a.right, 0), _ = a.left, b = a.left + h;
  t.setAttribute("x1", _.toFixed(2)), t.setAttribute("x2", b.toFixed(2)), t.setAttribute("y1", y.toFixed(2)), t.setAttribute("y2", y.toFixed(2)), t.style.opacity = "1";
}
function Fo(e, t, n) {
  const { width: r, height: a, margin: i } = t, { xAccessor: o, yAccessor: c } = n;
  if (e.length === 0)
    return { points: [], range: null };
  const s = e.map((x, R) => {
    const K = o(x, R), v = c(x, R), D = Yr(K, R), T = pt(v, Number.NaN);
    return Number.isFinite(T) ? {
      index: R,
      data: x,
      xValue: D,
      yValue: T
    } : null;
  }).filter((x) => !!x);
  if (s.length === 0)
    return { points: [], range: null };
  const l = s.reduce((x, R) => Math.min(x, R.xValue), s[0].xValue), u = s.reduce((x, R) => Math.max(x, R.xValue), s[0].xValue), f = s.reduce((x, R) => Math.min(x, R.yValue), s[0].yValue), p = s.reduce((x, R) => Math.max(x, R.yValue), s[0].yValue), d = Math.max(r - i.left - i.right, 1), g = Math.max(a - i.top - i.bottom, 1), m = Number.isFinite(l) ? l : 0, y = Number.isFinite(u) ? u : m + 1, h = Number.isFinite(f) ? f : 0, _ = Number.isFinite(p) ? p : h + 1, b = pt(t.baseline?.value, null), S = b != null && Number.isFinite(b) ? Math.min(h, b) : h, C = b != null && Number.isFinite(b) ? Math.max(_, b) : _, A = Math.max(
    2,
    Math.min(
      6,
      Math.round(
        Math.max(a - i.top - i.bottom, 0) / 60
      ) || 4
    )
  ), { niceMin: P, niceMax: N } = Ho(
    S,
    C,
    A
  ), F = Number.isFinite(P) ? P : h, H = Number.isFinite(N) ? N : _, w = y - m || 1, E = H - F || 1;
  return {
    points: s.map((x) => {
      const R = w === 0 ? 0.5 : (x.xValue - m) / w, K = E === 0 ? 0.5 : (x.yValue - F) / E, v = i.left + R * d, D = i.top + (1 - K) * g;
      return {
        ...x,
        x: v,
        y: D
      };
    }),
    range: {
      minX: m,
      maxX: y,
      minY: F,
      maxY: H,
      boundedWidth: d,
      boundedHeight: g
    }
  };
}
function Lt(e) {
  const { markerLayer: t, markerOverlay: n, markers: r, range: a, margin: i, markerTooltip: o } = e;
  if (e.markerPositions = [], at(e), !t || !n)
    return;
  for (; t.firstChild; )
    t.removeChild(t.firstChild);
  for (; n.firstChild; )
    n.removeChild(n.firstChild);
  if (!a || !Array.isArray(r) || r.length === 0)
    return;
  const c = a.maxX - a.minX || 1, s = a.maxY - a.minY || 1;
  r.forEach((l, u) => {
    const f = Yr(l.x, u), p = pt(l.y, Number.NaN), d = Number(p);
    if (!Number.isFinite(f) || !Number.isFinite(d))
      return;
    const g = c === 0 ? 0.5 : ne((f - a.minX) / c, 0, 1), m = s === 0 ? 0.5 : ne((d - a.minY) / s, 0, 1), y = i.left + g * a.boundedWidth, h = i.top + (1 - m) * a.boundedHeight, _ = ie("g", {
      class: "line-chart-marker",
      transform: `translate(${y.toFixed(2)} ${h.toFixed(2)})`,
      "data-marker-id": l.id
    }), b = ie("circle", {
      r: 5,
      fill: l.color || e.color,
      stroke: "#fff",
      "stroke-width": 2,
      opacity: 0.95
    });
    _.appendChild(b), t.appendChild(_), e.markerPositions.push({
      marker: l,
      x: y,
      y: h
    });
  }), o && (o.style.opacity = "0", o.style.visibility = "hidden");
}
function ea(e, t, n, r) {
  e.width = Number.isFinite(t) ? Number(t) : Ee, e.height = Number.isFinite(n) ? Number(n) : De, e.margin = {
    top: Number.isFinite(r?.top) ? Number(r?.top) : qe.top,
    right: Number.isFinite(r?.right) ? Number(r?.right) : qe.right,
    bottom: Number.isFinite(r?.bottom) ? Number(r?.bottom) : qe.bottom,
    left: Number.isFinite(r?.left) ? Number(r?.left) : qe.left
  };
}
function Ro(e, t) {
  const n = e.xFormatter(t.xValue, t.data, t.index), r = e.yFormatter(t.yValue, t.data, t.index);
  return e.tooltipRenderer({
    point: t,
    xFormatted: n,
    yFormatted: r,
    data: t.data,
    index: t.index
  });
}
function $o(e, t, n, r = null) {
  const { tooltip: a, width: i, margin: o, height: c } = e;
  if (!a)
    return;
  const s = r && Number.isFinite(r.scaleX) && r.scaleX > 0 ? r.scaleX : 1, l = r && Number.isFinite(r.scaleY) && r.scaleY > 0 ? r.scaleY : 1, u = c - o.bottom;
  a.style.visibility = "visible", a.style.opacity = "1";
  const f = a.offsetWidth || 0, p = a.offsetHeight || 0, d = t.x * s, g = ne(
    d - f / 2,
    o.left * s,
    (i - o.right) * s - f
  ), m = Math.max(u * l - p, 0), y = 12, _ = (Number.isFinite(n) ? ne(n ?? 0, o.top, u) : t.y) * l;
  let b = _ - p - y;
  b < o.top * l && (b = _ + y), b = ne(b, 0, m);
  const S = Q(Math.round(g)), C = Q(Math.round(b));
  a.style.transform = `translate(${S}, ${C})`;
}
function Yt(e) {
  const { tooltip: t, focusLine: n, focusCircle: r } = e;
  t && (t.style.opacity = "0", t.style.visibility = "hidden"), n && (n.style.opacity = "0"), r && (r.style.opacity = "0");
}
function ko(e, t) {
  const { marker: n } = t, r = e.xFormatter(t.marker.x, n, -1), a = e.yFormatter(t.marker.y, n, -1);
  return e.markerTooltipRenderer({
    marker: n,
    xFormatted: r,
    yFormatted: a
  });
}
function To(e, t, n, r = null) {
  const { markerTooltip: a, width: i, margin: o, height: c, tooltip: s } = e;
  if (!a)
    return;
  const l = r && Number.isFinite(r.scaleX) && r.scaleX > 0 ? r.scaleX : 1, u = r && Number.isFinite(r.scaleY) && r.scaleY > 0 ? r.scaleY : 1, f = c - o.bottom;
  a.style.visibility = "visible", a.style.opacity = "1";
  const p = a.offsetWidth || 0, d = a.offsetHeight || 0, g = t.x * l, m = ne(
    g - p / 2,
    o.left * l,
    (i - o.right) * l - p
  ), y = Math.max(f * u - d, 0), h = 10, _ = s?.getBoundingClientRect(), b = e.svg?.getBoundingClientRect(), S = _ && b ? _.top - b.top : null, C = _ && b ? _.bottom - b.top : null, P = (Number.isFinite(n) ? ne(n ?? t.y, o.top, f) : t.y) * u;
  let N;
  S != null && C != null ? S <= P ? N = S - d - h : N = C + h : (N = P - d - h, N < o.top * u && (N = P + h)), N = ne(N, 0, y);
  const F = Q(Math.round(m)), H = Q(Math.round(N));
  a.style.transform = `translate(${F}, ${H})`;
}
function at(e) {
  const { markerTooltip: t } = e;
  t && (t.style.opacity = "0", t.style.visibility = "hidden");
}
function Lo(e, t, n) {
  let a = null, i = 576;
  for (const o of e.markerPositions) {
    const c = o.x - t, s = o.y - n, l = c * c + s * s;
    l <= i && (a = o, i = l);
  }
  return a;
}
function Mo(e, t) {
  if (t.handlersAttached || !t.overlay)
    return;
  const n = (a) => {
    if (t.points.length === 0 || !t.svg) {
      Yt(t), at(t);
      return;
    }
    const i = t.svg.getBoundingClientRect(), o = t.width || Ee, c = t.height || De, s = i.width && Number.isFinite(i.width) && Number.isFinite(o) && o > 0 ? i.width / o : 1, l = i.height && Number.isFinite(i.height) && Number.isFinite(c) && c > 0 ? i.height / c : 1, u = s > 0 ? 1 / s : 1, f = l > 0 ? 1 / l : 1, p = (a.clientX - i.left) * u, d = (a.clientY - i.top) * f, g = {
      scaleX: s,
      scaleY: l
    };
    let m = t.points[0], y = Math.abs(p - m.x);
    for (let _ = 1; _ < t.points.length; _ += 1) {
      const b = t.points[_], S = Math.abs(p - b.x);
      S < y && (y = S, m = b);
    }
    t.focusCircle && (t.focusCircle.setAttribute("cx", m.x.toFixed(2)), t.focusCircle.setAttribute("cy", m.y.toFixed(2)), t.focusCircle.style.opacity = "1"), t.focusLine && (t.focusLine.setAttribute("x1", m.x.toFixed(2)), t.focusLine.setAttribute("x2", m.x.toFixed(2)), t.focusLine.setAttribute("y1", t.margin.top.toFixed(2)), t.focusLine.setAttribute(
      "y2",
      (t.height - t.margin.bottom).toFixed(2)
    ), t.focusLine.style.opacity = "1"), t.tooltip && (t.tooltip.innerHTML = Ro(t, m), $o(t, m, d, g));
    const h = Lo(t, p, d);
    h && t.markerTooltip ? (t.markerTooltip.innerHTML = ko(t, h), To(t, h, d, g)) : at(t);
  }, r = () => {
    Yt(t), at(t);
  };
  t.overlay.addEventListener("pointermove", n), t.overlay.addEventListener("pointerenter", n), t.overlay.addEventListener("pointerleave", r), t.handlersAttached = !0, t.handlePointerMove = n, t.handlePointerLeave = r, e.addEventListener("pointercancel", r);
}
function ta(e, t = {}) {
  const n = document.createElement("div");
  n.className = "line-chart-container", n.dataset.chartType = "line", n.style.position = "relative";
  const r = ie("svg", {
    width: Ee,
    height: De,
    viewBox: `0 0 ${String(Ee)} ${String(De)}`,
    role: "img",
    "aria-hidden": "true",
    focusable: "false"
  });
  r.classList.add("line-chart-svg");
  const a = ie("path", {
    class: "line-chart-area",
    fill: Bt,
    stroke: "none"
  }), i = ie("line", {
    class: "line-chart-baseline",
    stroke: Or,
    "stroke-width": 1,
    "stroke-dasharray": Br,
    opacity: 0
  }), o = ie("path", {
    class: "line-chart-path",
    fill: "none",
    stroke: We,
    "stroke-width": 2,
    "stroke-linecap": "round",
    "stroke-linejoin": "round"
  }), c = ie("line", {
    class: "line-chart-focus-line",
    stroke: We,
    "stroke-width": 1,
    "stroke-dasharray": "4 4",
    opacity: 0
  }), s = ie("circle", {
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
    width: Ee,
    height: De
  });
  r.appendChild(a), r.appendChild(i), r.appendChild(o), r.appendChild(c), r.appendChild(s), r.appendChild(l), r.appendChild(u), n.appendChild(r);
  const f = document.createElement("div");
  f.className = "chart-tooltip", f.style.position = "absolute", f.style.top = "0", f.style.left = "0", f.style.pointerEvents = "none", f.style.opacity = "0", f.style.visibility = "hidden", n.appendChild(f);
  const p = document.createElement("div");
  p.className = "line-chart-marker-overlay", p.style.position = "absolute", p.style.top = "0", p.style.left = "0", p.style.width = "100%", p.style.height = "100%", p.style.pointerEvents = "none", p.style.overflow = "visible", p.style.zIndex = "2", n.appendChild(p);
  const d = document.createElement("div");
  d.className = "chart-tooltip chart-tooltip--marker", d.style.position = "absolute", d.style.top = "0", d.style.left = "0", d.style.pointerEvents = "none", d.style.opacity = "0", d.style.visibility = "hidden", n.appendChild(d), e.appendChild(n);
  const g = Qr(n);
  if (g.svg = r, g.areaPath = a, g.linePath = o, g.baselineLine = i, g.focusLine = c, g.focusCircle = s, g.overlay = u, g.tooltip = f, g.markerOverlay = p, g.markerLayer = l, g.markerTooltip = d, g.xAccessor = t.xAccessor ?? jr, g.yAccessor = t.yAccessor ?? Kr, g.xFormatter = t.xFormatter ?? Gr, g.yFormatter = t.yFormatter ?? Xr, g.tooltipRenderer = t.tooltipRenderer ?? Zr, g.markerTooltipRenderer = t.markerTooltipRenderer ?? Jr, g.color = t.color ?? We, g.areaColor = t.areaColor ?? Bt, g.baseline = t.baseline ?? null, g.handlersAttached = !1, g.markers = Array.isArray(t.markers) ? t.markers.slice() : [], !g.xAxis) {
    const m = document.createElement("div");
    m.className = "line-chart-axis line-chart-axis-x", m.style.position = "absolute", m.style.left = "0", m.style.right = "0", m.style.bottom = "0", m.style.pointerEvents = "none", m.style.fontSize = On, m.style.color = "var(--secondary-text-color)", m.style.display = "block", n.appendChild(m), g.xAxis = m;
  }
  if (!g.yAxis) {
    const m = document.createElement("div");
    m.className = "line-chart-axis line-chart-axis-y", m.style.position = "absolute", m.style.top = "0", m.style.bottom = "0", m.style.left = "0", m.style.pointerEvents = "none", m.style.fontSize = On, m.style.color = "var(--secondary-text-color)", m.style.display = "block", n.appendChild(m), g.yAxis = m;
  }
  return ea(g, t.width, t.height, t.margin), o.setAttribute("stroke", g.color), c.setAttribute("stroke", g.color), s.setAttribute("stroke", g.color), a.setAttribute("fill", g.areaColor), mn(n, t), Mo(n, g), n;
}
function mn(e, t = {}) {
  if (!e) {
    console.error("updateLineChart: container element is required");
    return;
  }
  const n = Qr(e);
  if (!n.svg || !n.linePath || !n.overlay) {
    console.error("updateLineChart: chart was not initialised with renderLineChart");
    return;
  }
  t.xAccessor && (n.xAccessor = t.xAccessor), t.yAccessor && (n.yAccessor = t.yAccessor), t.xFormatter && (n.xFormatter = t.xFormatter), t.yFormatter && (n.yFormatter = t.yFormatter), t.tooltipRenderer && (n.tooltipRenderer = t.tooltipRenderer), t.markerTooltipRenderer && (n.markerTooltipRenderer = t.markerTooltipRenderer), t.color && (n.color = t.color, n.linePath.setAttribute("stroke", n.color), n.focusLine && n.focusLine.setAttribute("stroke", n.color), n.focusCircle && n.focusCircle.setAttribute("stroke", n.color)), t.areaColor && (n.areaColor = t.areaColor, n.areaPath && n.areaPath.setAttribute("fill", n.areaColor)), Object.prototype.hasOwnProperty.call(t, "baseline") && (n.baseline = t.baseline ?? null), Array.isArray(t.markers) && (n.markers = t.markers.slice()), xo(n), ea(n, t.width, t.height, t.margin);
  const { width: r, height: a } = n;
  n.svg.setAttribute("width", String(r)), n.svg.setAttribute("height", String(a)), n.svg.setAttribute("viewBox", `0 0 ${String(r)} ${String(a)}`), n.overlay.setAttribute("x", "0"), n.overlay.setAttribute("y", "0"), n.overlay.setAttribute("width", Math.max(r, 0).toFixed(2)), n.overlay.setAttribute("height", Math.max(a, 0).toFixed(2)), Array.isArray(t.series) && (n.series = Array.from(t.series));
  const { points: i, range: o } = Fo(n.series, n, {
    xAccessor: n.xAccessor,
    yAccessor: n.yAccessor
  });
  if (n.points = i, n.range = o, i.length === 0) {
    n.linePath.setAttribute("d", ""), n.areaPath && n.areaPath.setAttribute("d", ""), Yt(n), Lt(n), Mt(n), Tt(n);
    return;
  }
  if (i.length === 1) {
    const s = i[0], l = Math.max(
      0.5,
      Math.min(4, Math.max(n.width - n.margin.left - n.margin.right, 1) * 0.01)
    ), u = `M${s.x.toFixed(2)} ${s.y.toFixed(2)} h${l.toFixed(2)}`;
    n.linePath.setAttribute("d", u), n.areaPath && n.areaPath.setAttribute("d", ""), n.focusCircle && (n.focusCircle.setAttribute("cx", s.x.toFixed(2)), n.focusCircle.setAttribute("cy", s.y.toFixed(2)), n.focusCircle.style.opacity = "1"), n.focusLine && (n.focusLine.style.opacity = "0"), Mt(n), Tt(n), Lt(n);
    return;
  }
  const c = Do(i);
  if (n.linePath.setAttribute("d", c), n.areaPath && o) {
    const s = n.margin.top + o.boundedHeight, l = Eo(i, s);
    n.areaPath.setAttribute("d", l);
  }
  Mt(n), Tt(n), Lt(n);
}
function Mt(e) {
  const { xAxis: t, yAxis: n, range: r, margin: a, height: i, yFormatter: o } = e;
  if (!t || !n)
    return;
  if (!r) {
    t.innerHTML = "", n.innerHTML = "";
    return;
  }
  const { minX: c, maxX: s, minY: l, maxY: u, boundedWidth: f, boundedHeight: p } = r, d = Number.isFinite(c) && Number.isFinite(s) && s >= c, g = Number.isFinite(l) && Number.isFinite(u) && u >= l, m = Math.max(f, 0), y = Math.max(p, 0);
  if (t.style.left = Q(a.left), t.style.width = Q(m), t.style.top = Q(i - a.bottom + 6), t.innerHTML = "", d && m > 0) {
    const _ = (s - c) / Po, b = Math.max(2, Math.min(6, Math.round(m / 140) || 4));
    Io(e, c, s, b, _).forEach(({ positionRatio: C, label: A }) => {
      const P = document.createElement("div");
      P.className = "line-chart-axis-tick line-chart-axis-tick-x", P.style.position = "absolute", P.style.bottom = "0";
      const N = ne(C, 0, 1);
      P.style.left = Q(N * m);
      let F = "-50%", H = "center";
      N <= 1e-3 ? (F = "0", H = "left", P.style.marginLeft = "2px") : N >= 0.999 && (F = "-100%", H = "right", P.style.marginRight = "2px"), P.style.transform = `translateX(${F})`, P.style.textAlign = H, P.textContent = A, t.appendChild(P);
    });
  }
  n.style.top = Q(a.top), n.style.height = Q(y);
  const h = Math.max(a.left - 6, 0);
  if (n.style.left = "0", n.style.width = Q(Math.max(h, 0)), n.innerHTML = "", g && y > 0) {
    const _ = Math.max(2, Math.min(6, Math.round(y / 60) || 4)), b = zo(l, u, _), S = o;
    b.forEach(({ value: C, positionRatio: A }) => {
      const P = document.createElement("div");
      P.className = "line-chart-axis-tick line-chart-axis-tick-y", P.style.position = "absolute", P.style.left = "0";
      const F = (1 - ne(A, 0, 1)) * y;
      P.style.top = Q(F), P.textContent = S(C, null, -1), n.appendChild(P);
    });
  }
}
function Ho(e, t, n = 4) {
  if (!Number.isFinite(e) || !Number.isFinite(t))
    return {
      niceMin: e,
      niceMax: t
    };
  const r = Math.max(2, n);
  if (t === e) {
    const l = jt(Math.abs(e) || 1);
    return {
      niceMin: e - l,
      niceMax: t + l
    };
  }
  const i = (t - e) / (r - 1), o = jt(i), c = Math.floor(e / o) * o, s = Math.ceil(t / o) * o;
  return c === s ? {
    niceMin: e,
    niceMax: t + o
  } : {
    niceMin: c,
    niceMax: s
  };
}
function Io(e, t, n, r, a) {
  if (!Number.isFinite(t) || !Number.isFinite(n) || n < t)
    return [];
  if (!Number.isFinite(a) || a <= 0)
    return [
      {
        positionRatio: 0.5,
        label: Bn(e, t, a || 0)
      }
    ];
  const i = Math.max(2, r), o = [], c = n - t;
  for (let s = 0; s < i; s += 1) {
    const l = i === 1 ? 0.5 : s / (i - 1), u = t + l * c;
    o.push({
      positionRatio: l,
      label: Bn(e, u, a)
    });
  }
  return o;
}
function Bn(e, t, n) {
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
function zo(e, t, n) {
  if (!Number.isFinite(e) || !Number.isFinite(t))
    return [];
  if (t === e)
    return [
      {
        value: e,
        positionRatio: 0.5
      }
    ];
  const r = t - e, a = Math.max(2, n), i = r / (a - 1), o = jt(i), c = Math.floor(e / o) * o, s = Math.ceil(t / o) * o, l = [];
  for (let u = c; u <= s + o / 2; u += o) {
    const f = (u - e) / (t - e);
    l.push({
      value: u,
      positionRatio: ne(f, 0, 1)
    });
  }
  return l.length > a + 2 ? l.filter((u, f) => f % 2 === 0) : l;
}
function jt(e) {
  if (!Number.isFinite(e) || e === 0)
    return 1;
  const t = Math.floor(Math.log10(Math.abs(e))), n = Math.abs(e) / 10 ** t;
  let r;
  return n <= 1 ? r = 1 : n <= 2 ? r = 2 : n <= 5 ? r = 5 : r = 10, r * 10 ** t;
}
function Vo(e) {
  return Array.isArray(e) && e.every((t) => typeof t == "string");
}
function Uo(e) {
  return typeof e == "object" && e !== null;
}
function qo(e) {
  if (!Uo(e))
    return !1;
  const t = e;
  return typeof t.portfolioUuid != "string" ? !1 : Vo(t.securityUuids);
}
function Wo(e) {
  return e instanceof CustomEvent ? qo(e.detail) : !1;
}
const Ht = { min: 0, max: 6 }, gt = { min: 2, max: 4 }, Oo = "1Y", na = [
  "1M",
  "6M",
  "1Y",
  "5Y",
  "ALL"
], Bo = {
  "1M": 30,
  "6M": 182,
  "1Y": 365,
  "5Y": 1826,
  ALL: Number.POSITIVE_INFINITY
}, Yo = /* @__PURE__ */ new Set([0, 2]), jo = /* @__PURE__ */ new Set([1, 3]), Ko = "var(--pp-reader-chart-marker-buy, #2e7d32)", Go = "var(--pp-reader-chart-marker-sell, #c0392b)", Yn = "{TICKER}", Xo = "https://chatgpt.com/", It = {
  aggregation: "Aggregationsdaten",
  totals: "Kaufsummen",
  eur_total: "EUR-Kaufsumme"
}, xe = /* @__PURE__ */ new Map(), it = /* @__PURE__ */ new Map(), Ze = /* @__PURE__ */ new Map(), Fe = /* @__PURE__ */ new Map(), ra = "pp-reader:portfolio-positions-updated", Be = /* @__PURE__ */ new Map();
function Zo(e) {
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
function Jo(e, t) {
  if (e) {
    if (t) {
      Ze.set(e, t);
      return;
    }
    Ze.delete(e);
  }
}
function Qo(e) {
  if (!e || typeof window > "u")
    return null;
  if (Ze.has(e)) {
    const t = Ze.get(e) || null;
    if (t)
      return t;
  }
  return null;
}
function aa(e) {
  return xe.has(e) || xe.set(e, /* @__PURE__ */ new Map()), xe.get(e);
}
function ia(e) {
  return Fe.has(e) || Fe.set(e, /* @__PURE__ */ new Map()), Fe.get(e);
}
function oa(e) {
  if (e) {
    if (xe.has(e)) {
      try {
        const t = xe.get(e);
        t && t.clear();
      } catch (t) {
        console.warn("invalidateHistoryCache: Konnte Cache nicht leeren", e, t);
      }
      xe.delete(e);
    }
    if (Fe.has(e)) {
      try {
        Fe.get(e)?.clear();
      } catch (t) {
        console.warn("invalidateHistoryCache: Konnte Marker-Cache nicht leeren", e, t);
      }
      Fe.delete(e);
    }
  }
}
function sa(e) {
  e && Ze.delete(e);
}
function es(e, t) {
  if (!e || !t)
    return;
  const n = t.securityUuids;
  (Array.isArray(n) ? n : []).includes(e) && (oa(e), sa(e));
}
function ts(e) {
  if (!e || Be.has(e))
    return;
  const t = (n) => {
    Wo(n) && es(e, n.detail);
  };
  try {
    window.addEventListener(ra, t), Be.set(e, t);
  } catch (n) {
    console.error("ensureLiveUpdateSubscription: Registrierung fehlgeschlagen", n);
  }
}
function ns(e) {
  if (!e || !Be.has(e))
    return;
  const t = Be.get(e);
  try {
    t && window.removeEventListener(ra, t);
  } catch (n) {
    console.error("removeLiveUpdateSubscription: Entfernen des Listeners fehlgeschlagen", n);
  }
  Be.delete(e);
}
function rs(e) {
  e && (ns(e), oa(e), sa(e));
}
function jn(e, t) {
  if (!it.has(e)) {
    it.set(e, { activeRange: t });
    return;
  }
  const n = it.get(e);
  n && (n.activeRange = t);
}
function ca(e) {
  return it.get(e)?.activeRange ?? Oo;
}
function Kt(e) {
  const t = Date.UTC(
    e.getUTCFullYear(),
    e.getUTCMonth(),
    e.getUTCDate()
  );
  return Math.floor(t / 864e5);
}
function Te(e) {
  const t = new Date(e.getTime());
  return t.setUTCHours(0, 0, 0, 0), t;
}
function Kn(e) {
  return !(e instanceof Date) || Number.isNaN(e.getTime()) ? null : Kt(Te(e));
}
function M(e) {
  return fe(e);
}
function la(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t || null;
}
function Pe(e) {
  const t = la(e);
  return t ? t.toUpperCase() : null;
}
function as(e) {
  if (!e)
    return null;
  const t = un(e.aggregation), n = M(t?.purchase_total_security) ?? (t ? M(
    t.security_currency_total
  ) : null), r = M(t?.purchase_total_account) ?? (t ? M(
    t.account_currency_total
  ) : null);
  if (oe(n) && oe(r)) {
    const c = n / r;
    if (oe(c))
      return c;
  }
  const a = Me(e.average_cost), i = M(a?.native) ?? M(a?.security), o = M(a?.account) ?? M(a?.eur);
  if (oe(i) && oe(o)) {
    const c = i / o;
    if (oe(c))
      return c;
  }
  return null;
}
function ua(e, t = "Unbekannter Fehler") {
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
function ht(e, t) {
  const n = Te(t instanceof Date ? t : /* @__PURE__ */ new Date()), r = Bo[e], a = Kn(n), i = {};
  if (a != null && (i.end_date = a), Number.isFinite(r) && r > 0) {
    const o = new Date(n.getTime());
    o.setUTCDate(o.getUTCDate() - (r - 1));
    const c = Kn(o);
    c != null && (i.start_date = c);
  }
  return i;
}
function yn(e) {
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
      return Number.isNaN(n.getTime()) ? null : Te(n);
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
          return Te(r);
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
function is(e) {
  const t = yn(e);
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
function mt(e) {
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
function Gt(e) {
  return Array.isArray(e) ? e.map((t) => {
    let r = M(t.close);
    if (r == null) {
      const i = M(t.close_raw);
      i != null && (r = i / 1e8);
    }
    return r == null ? null : {
      date: yn(t.date) ?? t.date,
      close: r
    };
  }).filter((t) => !!t) : [];
}
function yt(e, t, n = null) {
  if (!Array.isArray(e))
    return [];
  const r = [], a = Pe(t), i = a || "EUR", o = as(n);
  return e.forEach((c, s) => {
    const l = typeof c.type == "number" ? c.type : Number(c.type), u = Yo.has(l), f = jo.has(l);
    if (!u && !f)
      return;
    const p = is(c.date);
    let d = M(c.price);
    if (!p || d == null)
      return;
    const g = Pe(c.currency_code), m = a ?? g ?? i;
    g && a && g !== a && oe(o) && (d *= o);
    const y = M(c.shares), h = M(c.net_price_eur), _ = u ? "Kauf" : "Verkauf", b = y != null ? `${vn(y)} @ ` : "", S = `${_} ${b}${pe(d)} ${m}`, C = f && h != null ? `${S} (netto ${pe(h)} EUR)` : S, A = u ? Ko : Go, P = typeof c.uuid == "string" && c.uuid.trim() || `${_}-${p.getTime().toString()}-${s.toString()}`;
    r.push({
      id: P,
      x: p.getTime(),
      y: d,
      color: A,
      label: C,
      payload: {
        type: _,
        currency: m,
        transactionCurrency: g,
        shares: y,
        price: d,
        netPriceEur: h,
        date: p.toISOString(),
        portfolio: c.portfolio
      }
    });
  }), r;
}
function _n(e) {
  const t = M(e?.last_price_native) ?? M(e?.last_price?.native) ?? null;
  if (k(t))
    return t;
  if (Pe(e?.currency_code) === "EUR") {
    const r = M(e?.last_price_eur);
    if (k(r))
      return r;
  }
  return null;
}
function os(e) {
  if (!e)
    return null;
  const n = e.last_price_fetched_at, r = mt(n);
  if (r != null)
    return r;
  const i = e.last_price?.fetched_at;
  return mt(i) ?? null;
}
function Xt(e, t) {
  let n = [];
  Array.isArray(e) && (n = e.map((l) => ({
    ...l
  })));
  const r = n.slice(), a = _n(t);
  if (!k(a))
    return r;
  const i = os(t) ?? Date.now(), o = new Date(i);
  if (Number.isNaN(o.getTime()))
    return r;
  const c = Kt(Te(o));
  let s = null;
  for (let l = r.length - 1; l >= 0; l -= 1) {
    const u = r[l], f = yn(u.date);
    if (!f)
      continue;
    const p = Kt(Te(f));
    if (s == null && (s = p), p === c)
      return u.close !== a && (r[l] = { ...u, close: a }), r;
    if (p < c)
      break;
  }
  return s != null && s > c || r.push({
    date: o,
    close: a
  }), r;
}
function k(e) {
  return typeof e == "number" && Number.isFinite(e);
}
function oe(e) {
  return typeof e == "number" && Number.isFinite(e) && e > 0;
}
function Ye(e, t, n) {
  if (!k(e) || !k(t))
    return !1;
  const r = Math.abs(e - t), a = Math.max(Math.abs(e), Math.abs(t), 1);
  return r <= a * 1e-4;
}
function ss(e, t) {
  return !k(t) || t === 0 || !k(e) ? null : pi((e - t) / t * 100);
}
function da(e, t) {
  if (e.length === 0)
    return { priceChange: null, priceChangePct: null };
  const n = e[0], r = M(n.close);
  if (!k(r) || r === 0)
    return { priceChange: null, priceChangePct: null };
  const a = e[e.length - 1], i = M(a.close), o = M(t) ?? i;
  if (!k(o))
    return { priceChange: null, priceChangePct: null };
  const c = o - r, s = Object.is(c, -0) ? 0 : c, l = ss(o, r);
  return { priceChange: s, priceChangePct: l };
}
function bn(e, t) {
  if (!k(e) || e === 0)
    return "neutral";
  const n = 0.5 / Math.pow(10, t);
  return Math.abs(e) < n ? "neutral" : e > 0 ? "positive" : "negative";
}
function cs(e, t) {
  if (!k(e))
    return '<span class="value neutral">—</span>';
  const n = pe(e);
  if (n === "—")
    return '<span class="value neutral">—</span>';
  const r = bn(e, gt.max), a = t ? `&nbsp;${t}` : "";
  return `<span class="value ${r}">${n}${a}</span>`;
}
function ls(e) {
  return k(e) ? `<span class="value ${bn(e, 2)} value--percentage">${re(e)}&nbsp;%</span>` : '<span class="value neutral">—</span>';
}
function fa(e, t, n, r) {
  const a = e, i = a.length > 0 ? a : "Zeitraum";
  return `
    <div class="security-info-bar" data-range="${a}">
      <div class="security-info-item">
        <span class="label">Preisänderung (${i})</span>
        <div class="value-row">
          ${cs(t, r)}
          ${ls(n)}
        </div>
      </div>
    </div>
  `;
}
function us(e) {
  return `
    <div class="security-range-selector" role="group" aria-label="Zeitraum">
      ${na.map((n) => `
      <button
        type="button"
        class="security-range-button${n === e ? " active" : ""}"
        data-range="${n}"
        aria-pressed="${n === e ? "true" : "false"}"
      >
        ${n}
      </button>
    `).join(`
`)}
    </div>
  `;
}
function pa(e, t = { status: "empty" }) {
  const n = e;
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
      const r = ua(
        t.message,
        "Die historischen Daten konnten nicht geladen werden."
      );
      return `
        <div class="history-placeholder" data-state="error" data-range="${n}">
          <p>${r}</p>
        </div>
      `;
    }
    case "empty":
    default: {
      const r = n.length > 0 ? n : "den gewählten Zeitraum";
      return `
        <div class="history-placeholder" data-state="empty" data-range="${n}">
          <p>Für dieses Wertpapier liegen im Zeitraum ${r} keine historischen Daten vor.</p>
        </div>
      `;
    }
  }
}
function vn(e) {
  const t = M(e);
  if (t == null)
    return "—";
  const n = Math.abs(t % 1) > 0, r = n ? 2 : Ht.min, a = n ? Ht.max : Ht.min;
  return t.toLocaleString("de-DE", {
    minimumFractionDigits: r,
    maximumFractionDigits: a
  });
}
function pe(e) {
  const t = M(e);
  return t == null ? "—" : t.toLocaleString("de-DE", {
    minimumFractionDigits: gt.min,
    maximumFractionDigits: gt.max
  });
}
function ds(e, t) {
  const n = pe(e), r = `&nbsp;${t}`;
  return `<span class="${bn(e, gt.max)}">${n}${r}</span>`;
}
function fs(e, t) {
  const n = e?.ticker_symbol;
  if (typeof n == "string" && n.trim())
    return n.trim();
  const r = typeof e?.name == "string" ? e.name.trim() : "";
  return r || (typeof t == "string" ? t : "");
}
function ps(e) {
  return `
    <div class="news-prompt-container">
      <button
        type="button"
        class="news-prompt-button"
        data-symbol="${$r(e)}"
      >
        Copy prompt &amp; open ChatGPT
      </button>
    </div>
  `;
}
async function gs(e) {
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
function hs(e) {
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
function ms(e, t, n) {
  const r = Me(e?.average_cost), a = r?.account ?? (k(t) ? t : M(t));
  if (!k(a))
    return null;
  const i = e?.account_currency_code ?? e?.account_currency;
  if (typeof i == "string" && i.trim())
    return i.trim().toUpperCase();
  const o = Pe(e?.currency_code) ?? "", c = r?.security ?? r?.native ?? (k(n) ? n : M(n)), s = un(e?.aggregation);
  if (o && k(c) && Ye(a, c))
    return o;
  const l = M(s?.purchase_total_security) ?? M(e?.purchase_total_security), u = M(s?.purchase_total_account) ?? M(e?.purchase_total_account);
  let f = null;
  if (k(l) && l !== 0 && k(u) && (f = u / l), r?.source === "eur_total")
    return "EUR";
  const d = r?.eur;
  if (k(d) && Ye(a, d))
    return "EUR";
  const g = M(e?.purchase_value_eur);
  return k(g) ? "EUR" : f != null && Ye(f, 1) ? o || null : o === "EUR" ? "EUR" : o || "EUR";
}
function Gn(e) {
  return typeof e != "number" || !Number.isFinite(e) || e <= 0 ? null : e.toLocaleString("de-DE", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
  });
}
function ys(e) {
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
    const o = t?.[i], c = mt(o);
    if (c != null)
      return c;
  }
  const r = [];
  t && "last_price_fetched_at" in t && r.push(t.last_price_fetched_at);
  const a = e?.last_price;
  a && typeof a == "object" && r.push(a.fetched_at), t && "last_price_date" in t && r.push(t.last_price_date);
  for (const i of r) {
    const o = mt(i);
    if (o != null)
      return o;
  }
  return null;
}
function _s(e) {
  if (e == null || !Number.isFinite(e))
    return null;
  const t = new Date(e);
  return Number.isNaN(t.getTime()) ? null : t.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}
function bs(e, t) {
  if (!e)
    return null;
  const n = Pe(e.currency_code) ?? "", r = Me(e.average_cost);
  if (!r || !n)
    return null;
  const a = r.native ?? r.security ?? null;
  let o = r.account ?? r.eur ?? null, c = Pe(t) ?? "";
  if (oe(r.eur) && (!c || c === n) && (o = r.eur, c = "EUR"), !n || !c || n === c || !oe(a) || !oe(o))
    return null;
  const s = o / a;
  if (!Number.isFinite(s) || s <= 0)
    return null;
  const l = Gn(s);
  if (!l)
    return null;
  let u = null;
  if (s > 0) {
    const _ = 1 / s;
    Number.isFinite(_) && _ > 0 && (u = Gn(_));
  }
  const f = ys(e), p = _s(f), d = [`FX-Kurs (Kauf): 1 ${n} = ${l} ${c}`];
  u && d.push(`1 ${c} = ${u} ${n}`);
  const g = [], m = r.source, y = m in It ? It[m] : It.aggregation;
  if (g.push(`Quelle: ${y}`), k(r.coverage_ratio)) {
    const _ = Math.min(Math.max(r.coverage_ratio * 100, 0), 100);
    g.push(
      `Abdeckung: ${_.toLocaleString("de-DE", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      })}%`
    );
  }
  g.length && d.push(...g);
  const h = p ?? "Datum unbekannt";
  return `${d.join(" · ")} (Stand: ${h})`;
}
function Xn(e) {
  if (!e)
    return null;
  const t = Me(e.average_cost), n = t?.native ?? t?.security ?? null;
  return k(n) ? n : null;
}
function vs(e) {
  if (!e)
    return '<div class="meta-error">Keine Snapshot-Daten verfügbar.</div>';
  const t = e.currency_code || "EUR", n = e.total_holdings_precise ?? e.total_holdings, r = vn(n), a = e.last_price_native ?? e.last_price?.native ?? e.last_price_eur, i = pe(a), o = i === "—" ? null : `${i}${`&nbsp;${t}`}`, c = M(e.market_value_eur) ?? M(e.current_value_eur) ?? null, s = Me(e.average_cost), l = s?.native ?? s?.security ?? null, u = s?.eur ?? null, p = s?.account ?? null ?? u, d = ve(e.performance), g = d?.day_change ?? null, m = g?.price_change_native ?? null, y = g?.price_change_eur ?? null, h = k(m) ? m : y, _ = k(m) ? t : "EUR", b = ($, z = "") => {
    const W = ["value"];
    return z && W.push(...z.split(" ").filter(Boolean)), `<span class="${W.join(" ")}">${$}</span>`;
  }, S = ($ = "") => {
    const z = ["value--missing"];
    return $ && z.push($), b("—", z.join(" "));
  }, C = ($, z = "") => {
    if (!k($))
      return S(z);
    const W = ["value--gain"];
    return z && W.push(z), b(ui($), W.join(" "));
  }, A = ($, z = "") => {
    if (!k($))
      return S(z);
    const W = ["value--gain-percentage"];
    return z && W.push(z), b(di($), W.join(" "));
  }, P = o ? b(o, "value--price") : S("value--price"), N = r === "—" ? S("value--holdings") : b(r, "value--holdings"), F = k(c) ? b(`${re(c)}&nbsp;€`, "value--market-value") : S("value--market-value"), H = k(h) ? b(
    ds(h, _),
    "value--gain value--absolute"
  ) : S("value--absolute"), w = A(
    g?.change_pct,
    "value--percentage"
  ), E = C(
    d?.total_change_eur,
    "value--absolute"
  ), I = A(
    d?.total_change_pct,
    "value--percentage"
  ), x = ms(
    e,
    p,
    l
  ), R = bs(
    e,
    x
  ), K = R ? ` title="${$r(R)}"` : "", v = [], D = k(u);
  k(l) ? v.push(
    b(
      `${pe(l)}${`&nbsp;${t}`}`,
      "value--average value--average-native"
    )
  ) : v.push(
    S("value--average value--average-native")
  );
  let T = null, Y = null;
  return D && (t !== "EUR" || !k(l) || !Ye(u, l)) ? (T = u, Y = "EUR") : k(p) && x && (x !== t || !Ye(p, l ?? NaN)) && (T = p, Y = x), T != null && k(T) && v.push(
    b(
      `${pe(T)}${Y ? `&nbsp;${Y}` : ""}`,
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
          ${v.join("")}
        </div>
      </div>
      <div class="security-meta-item security-meta-item--day-change">
        <span class="label">Tagesänderung</span>
        <div class="value-group">
          ${H}
          ${w}
        </div>
      </div>
      <div class="security-meta-item security-meta-item--total-change">
        <span class="label">Gesamtänderung</span>
        <div class="value-group">
          ${E}
          ${I}
        </div>
      </div>
      <div class="security-meta-item security-meta-item--holdings">
        <span class="label">Bestand</span>
        <div class="value-group">${N}</div>
      </div>
      <div class="security-meta-item security-meta-item--market-value">
        <span class="label">Marktwert (EUR)</span>
        <div class="value-group">${F}</div>
      </div>
    </div>
  `;
}
function Ss(e) {
  return `
    <div class="card security-meta-card">
      <div id="headerMeta" class="meta">
        ${vs(e)}
      </div>
    </div>
  `;
}
function ga(e) {
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
function Cs(e, t, {
  currency: n,
  baseline: r,
  markers: a
} = {}) {
  const i = e.clientWidth || e.offsetWidth || 0, o = i > 0 ? i : 640, c = Math.min(Math.max(Math.floor(o * 0.5), 240), 440), s = (n || "").toUpperCase() || "EUR", l = k(r) ? r : null, u = Math.max(48, Math.min(72, Math.round(o * 0.075))), f = Math.max(28, Math.min(56, Math.round(o * 0.05))), p = Math.max(40, Math.min(64, Math.round(c * 0.14)));
  return {
    width: o,
    height: c,
    margin: {
      top: 18,
      right: f,
      bottom: p,
      left: u
    },
    series: t,
    yFormatter: (g) => pe(g),
    tooltipRenderer: ({ xFormatted: g, yFormatted: m }) => `
      <div class="chart-tooltip-date">${g}</div>
      <div class="chart-tooltip-value">${m}&nbsp;${s}</div>
    `,
    markerTooltipRenderer: ({
      marker: g,
      xFormatted: m,
      yFormatted: y
    }) => {
      const h = g.payload ?? {}, _ = la(h.type), b = M(h.shares), S = b != null ? vn(b) : null, C = Pe(h.currency) ?? s, A = [];
      _ && A.push(_), S && A.push(`${S} Stück`), m && A.push(`am ${m}`);
      const P = A.join(" ").trim() || (typeof g.label == "string" ? g.label : m), N = typeof y == "string" && y.trim() ? y.trim() : pe(h.price), F = N ? `${N}${C ? `&nbsp;${C}` : ""}` : C;
      return `
      <div class="chart-tooltip-date">${P}</div>
      <div class="chart-tooltip-value">${F}</div>
    `;
    },
    baseline: l != null ? {
      value: l
    } : null,
    markers: Array.isArray(a) ? a : []
  };
}
const Zn = /* @__PURE__ */ new WeakMap();
function ws(e, t, n = {}) {
  if (t.length === 0)
    return;
  const r = Cs(e, t, n);
  let a = Zn.get(e) ?? null;
  if (!a || !e.contains(a)) {
    e.innerHTML = "", a = ta(e, r), a && Zn.set(e, a);
    return;
  }
  mn(a, r);
}
function Jn(e, t) {
  e && (e.dataset.activeRange = t, e.querySelectorAll(".security-range-button").forEach((n) => {
    const a = n.dataset.range === t;
    n.classList.toggle("active", a), n.setAttribute("aria-pressed", a ? "true" : "false"), n.disabled = !1, n.classList.remove("loading");
  }));
}
function Ps(e, t, n, r, a) {
  const i = e.querySelector(".security-info-bar");
  if (!i || !i.parentElement)
    return;
  const o = document.createElement("div");
  o.innerHTML = fa(t, n, r, a).trim();
  const c = o.firstElementChild;
  c && i.parentElement.replaceChild(c, i);
}
function Qn(e, t, n, r, a = {}) {
  const i = e.querySelector(".security-detail-placeholder");
  if (i && (i.innerHTML = `
    <h2>Historie</h2>
    ${pa(t, n)}
  `, n.status === "loaded" && Array.isArray(r) && r.length)) {
    const o = i.querySelector(".history-chart");
    o && requestAnimationFrame(() => {
      ws(o, r, a);
    });
  }
}
function As(e) {
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
    const u = aa(a), f = ia(a), p = Xn(i);
    Array.isArray(c) && s.status !== "error" && u.set(o, c), ts(a), jn(a, o), Jn(l, o);
    const g = Xt(
      c,
      i
    );
    let m = s;
    m.status !== "error" && (m = g.length ? { status: "loaded" } : { status: "empty" }), Qn(
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
    const y = async (h) => {
      if (h === ca(a))
        return;
      const _ = l.querySelector(
        `.security-range-button[data-range="${h}"]`
      );
      _ && (_.disabled = !0, _.classList.add("loading"));
      let b = u.get(h) ?? null, S = f.get(h) ?? null, C = null, A = [];
      if (b)
        C = b.length ? { status: "loaded" } : { status: "empty" };
      else
        try {
          const E = ht(h), I = await ot(
            n,
            r,
            a,
            E
          );
          b = Gt(I.prices), S = yt(
            I.transactions,
            i?.currency_code,
            i
          ), u.set(h, b), S = Array.isArray(S) ? S : [], f.set(h, S), C = b.length ? { status: "loaded" } : { status: "empty" };
        } catch (E) {
          console.error("Range-Wechsel: Historie konnte nicht geladen werden", E), b = [], S = [], C = {
            status: "error",
            message: ga(E) || "Die historischen Daten konnten aufgrund eines Fehlers nicht geladen werden."
          };
        }
      if (!Array.isArray(S))
        try {
          const E = ht(h), I = await ot(
            n,
            r,
            a,
            E
          );
          S = yt(
            I.transactions,
            i?.currency_code,
            i
          ), S = Array.isArray(S) ? S : [], f.set(h, S);
        } catch (E) {
          console.error("Range-Wechsel: Transaktionsmarker konnten nicht geladen werden", E), S = [];
        }
      A = Xt(b, i), C.status !== "error" && (C = A.length ? { status: "loaded" } : { status: "empty" });
      const P = _n(i), { priceChange: N, priceChangePct: F } = da(
        A,
        P
      ), H = Array.isArray(S) ? S : [];
      jn(a, h), Jn(l, h), Ps(
        t,
        h,
        N,
        F,
        i?.currency_code
      );
      const w = Xn(i);
      Qn(
        t,
        h,
        C,
        A,
        {
          currency: i?.currency_code,
          baseline: w,
          markers: H
        }
      );
    };
    l.addEventListener("click", (h) => {
      const _ = h.target?.closest(".security-range-button");
      if (!_ || _.disabled)
        return;
      const { range: b } = _.dataset;
      !b || !na.includes(b) || y(b);
    });
  }, 0);
}
function Ns(e) {
  const { root: t, hass: n, panelConfig: r, tickerSymbol: a } = e;
  let i = null, o = !1;
  const c = async () => {
    try {
      i = await li(n, r);
    } catch (s) {
      o = !0, console.warn("News-Prompt: Prefetch fehlgeschlagen", s);
    }
  };
  c(), setTimeout(() => {
    const s = t.querySelector(".news-prompt-button");
    if (!s)
      return;
    const l = (f) => {
      const p = (i?.placeholder || Yn).trim() || Yn, d = (i?.prompt_template || "").trim(), g = (i?.link || "").trim() || Xo;
      return { body: d ? d.includes(p) ? d.split(p).join(f) : `${d}

Ticker: ${f}` : `Ticker: ${f}`, link: g };
    }, u = async () => {
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
        const { body: d, link: g } = l(f), m = await gs(d);
        m ? s.textContent = "✅ Copied! Opening..." : console.warn("News-Prompt: Clipboard unavailable – prompt could not be copied"), m && await new Promise((y) => setTimeout(y, 800)), hs(g), !i && !o && c();
      } catch (d) {
        console.error("News-Prompt: Kopiervorgang fehlgeschlagen", d);
      } finally {
        s.classList.remove("loading"), s.disabled = !1, p && setTimeout(() => {
          s.textContent = p;
        }, 2e3);
      }
    };
    s.addEventListener("click", () => {
      u();
    });
  }, 0);
}
async function Es(e, t, n, r) {
  if (!r)
    return console.error("renderSecurityDetail: securityUuid fehlt"), '<div class="card"><h2>Fehler</h2><p>Kein Wertpapier angegeben.</p></div>';
  const a = Qo(r);
  let i = null, o = null;
  try {
    const w = await ci(
      t,
      n,
      r
    ), E = w.snapshot;
    i = E && typeof E == "object" ? E : w;
  } catch (w) {
    console.error("renderSecurityDetail: Snapshot konnte nicht geladen werden", w), o = ua(w);
  }
  const c = i || a, s = !!(a && !i), l = (c?.source ?? "") === "cache";
  r && Jo(r, c ?? null);
  const u = c && (s || l) ? Zo({ fallbackUsed: s, flaggedAsCache: l }) : "", f = c?.name || "Wertpapierdetails", p = ln(f, "", { includeMeta: !1 });
  p.classList.add("security-detail-header");
  const d = Ss(c);
  if (o)
    return `
      ${p.outerHTML}
      ${d}
      ${u}
      <div class="card error-card">
        <h2>Fehler beim Laden</h2>
        <p>${o}</p>
      </div>
    `;
  const g = ca(r), m = aa(r), y = ia(r);
  let h = m.has(g) ? m.get(g) ?? null : null, _ = { status: "empty" }, b = y.has(g) ? y.get(g) ?? null : null;
  if (Array.isArray(h))
    _ = h.length ? { status: "loaded" } : { status: "empty" };
  else {
    h = [];
    try {
      const w = ht(g), E = await ot(
        t,
        n,
        r,
        w
      );
      h = Gt(E.prices), b = yt(
        E.transactions,
        c?.currency_code,
        c
      ), m.set(g, h), b = Array.isArray(b) ? b : [], y.set(g, b), _ = h.length ? { status: "loaded" } : { status: "empty" };
    } catch (w) {
      console.error(
        "renderSecurityDetail: Historie konnte nicht geladen werden",
        w
      ), _ = {
        status: "error",
        message: ga(w) || "Die historischen Daten konnten aufgrund eines Fehlers nicht geladen werden."
      };
    }
  }
  if (!Array.isArray(b))
    try {
      const w = ht(g), E = await ot(
        t,
        n,
        r,
        w
      ), I = Gt(E.prices);
      b = yt(
        E.transactions,
        c?.currency_code,
        c
      ), m.set(g, I), b = Array.isArray(b) ? b : [], y.set(g, b), h = I, _ = h.length ? { status: "loaded" } : { status: "empty" };
    } catch (w) {
      console.error(
        "renderSecurityDetail: Transaktionsmarker konnten nicht geladen werden",
        w
      ), b = [];
    }
  const S = Xt(
    h,
    c
  );
  _.status !== "error" && (_ = S.length ? { status: "loaded" } : { status: "empty" });
  const C = fs(c, r), A = ps(C), P = _n(c), { priceChange: N, priceChangePct: F } = da(
    S,
    P
  ), H = fa(
    g,
    N,
    F,
    c?.currency_code
  );
  return As({
    root: e,
    hass: t,
    panelConfig: n,
    securityUuid: r,
    snapshot: c,
    initialRange: g,
    initialHistory: h,
    initialHistoryState: _
  }), Ns({
    root: e,
    hass: t,
    panelConfig: n,
    tickerSymbol: C
  }), `
    ${p.outerHTML}
    ${d}
    ${u}
    ${A}
    ${H}
    ${us(g)}
    <div class="card security-detail-placeholder">
      <h2>Historie</h2>
      ${pa(g, _)}
    </div>
  `;
}
function Ds(e) {
  const { setSecurityDetailTabFactory: t } = e;
  if (typeof t != "function") {
    console.error("registerSecurityDetailTab: Ungültige Factory-Funktion übergeben");
    return;
  }
  t((n) => ({
    title: "Wertpapier",
    render: (r, a, i) => Es(r, a, i, n),
    cleanup: () => {
      rs(n);
    }
  }));
}
class xs {
  element;
  range;
  options;
  // State
  isOpen = !1;
  viewDate;
  // The date determining which month is shown in the left calendar
  tempRange;
  // Range currently being selected in the picker
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
    this.element.classList.add("date-range-picker"), this.triggerEl = document.createElement("div"), this.triggerEl.className = "drp-trigger", this.triggerEl.innerHTML = `
      <svg class="drp-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line>
        <line x1="8" y1="2" x2="8" y2="6"></line>
        <line x1="3" y1="10" x2="21" y2="10"></line>
      </svg>
      <span class="drp-label"></span>
    `, this.element.appendChild(this.triggerEl), this.popoverEl = document.createElement("div"), this.popoverEl.className = "drp-popover";
    const t = document.createElement("div");
    t.className = "drp-sidebar", this.options.presets?.forEach((l) => {
      const u = document.createElement("button");
      u.className = "drp-preset-btn", u.textContent = l.label, u.addEventListener("click", () => {
        this.selectPreset(l);
      }), t.appendChild(u);
    }), this.popoverEl.appendChild(t);
    const n = document.createElement("div");
    n.className = "drp-main", this.calendarsContainer = document.createElement("div"), this.calendarsContainer.className = "drp-calendars", n.appendChild(this.calendarsContainer);
    const r = document.createElement("div");
    r.className = "drp-footer";
    const a = document.createElement("div");
    a.className = "drp-inputs", this.startInput = document.createElement("input"), this.startInput.type = "text", this.startInput.className = "drp-date-input", this.startInput.readOnly = !0, this.endInput = document.createElement("input"), this.endInput.type = "text", this.endInput.className = "drp-date-input", this.endInput.readOnly = !0;
    const i = document.createElement("span");
    i.textContent = "–", a.appendChild(this.startInput), a.appendChild(i), a.appendChild(this.endInput);
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
    this.triggerEl.addEventListener("click", (t) => {
      t.stopPropagation(), this.toggle();
    }), document.addEventListener("click", (t) => {
      const n = t.composedPath();
      this.isOpen && !n.includes(this.element) && this.close();
    }), this.popoverEl.addEventListener("click", (t) => {
      t.stopPropagation();
    });
  }
  toggle() {
    this.isOpen ? this.close() : this.open();
  }
  open() {
    this.isOpen = !0, this.popoverEl.classList.add("open"), this.triggerEl.classList.add("active"), this.tempRange = { ...this.range }, this.viewDate = new Date(this.range.end.getFullYear(), this.range.end.getMonth() - 1, 1), this.renderCalendars(), this.updateInputs();
  }
  close() {
    this.isOpen = !1, this.popoverEl.classList.remove("open"), this.popoverEl.style.display = "", this.triggerEl.classList.remove("active");
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
    c.className = "drp-nav-btn", c.innerHTML = "‹", n === "left" ? c.addEventListener("click", (m) => {
      m.stopPropagation(), this.viewDate.setMonth(this.viewDate.getMonth() - 1), this.renderCalendars();
    }) : c.style.visibility = "hidden";
    const s = document.createElement("span");
    s.className = "drp-month-label", s.textContent = t.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
    const l = document.createElement("button");
    l.className = "drp-nav-btn", l.innerHTML = "›", n === "right" ? l.addEventListener("click", (m) => {
      m.stopPropagation(), this.viewDate.setMonth(this.viewDate.getMonth() + 1), this.renderCalendars();
    }) : l.style.visibility = "hidden", o.appendChild(c), o.appendChild(s), o.appendChild(l), i.appendChild(o);
    const u = document.createElement("div");
    u.className = "drp-days-header", ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].forEach((m) => {
      const y = document.createElement("span");
      y.className = "drp-day-name", y.textContent = m, u.appendChild(y);
    }), i.appendChild(u);
    const f = document.createElement("div");
    f.className = "drp-days-grid";
    const p = new Date(r, a, 1), d = new Date(r, a + 1, 0);
    let g = p.getDay() - 1;
    g < 0 && (g = 6);
    for (let m = 0; m < g; m++) {
      const y = document.createElement("div");
      y.className = "drp-day empty", f.appendChild(y);
    }
    for (let m = 1; m <= d.getDate(); m++) {
      const y = new Date(r, a, m), h = document.createElement("div");
      h.className = "drp-day", h.textContent = m.toString(), this.applyDayClasses(h, y), h.addEventListener("click", (_) => {
        _.stopPropagation(), this.handleDayClick(y);
      }), h.addEventListener("mouseenter", () => {
        this.handleDayHover(y);
      }), f.appendChild(h);
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
let ye = {
  status: "idle",
  error: null,
  data: null,
  selection: null,
  lastUpdated: null
}, er = null;
function Fs(e) {
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
function Zt(e) {
  return typeof e != "string" ? null : e.trim() || null;
}
function Rs(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e, n = Zt(t.start), r = Zt(t.end);
  return n && r ? { start: n, end: r } : null;
}
function tr(e) {
  if (!Array.isArray(e))
    return [];
  const t = e.map((r) => typeof r == "string" ? r.trim() : "").filter((r) => r.length > 0), n = Array.from(new Set(t));
  return n.sort(), n;
}
function $s(e) {
  const t = Zt(e.date ?? null), n = Rs(e.range ?? null);
  if (t && n)
    throw new Error("loadDailyWealth: date und range können nicht gleichzeitig gesetzt werden");
  if (!t && !n)
    throw new Error("loadDailyWealth: entweder date oder range erforderlich");
  const r = e.scopes ?? {}, a = tr(r.accounts), i = tr(r.portfolios), o = {};
  t && (o.date = t), n && (o.range = n);
  const c = e.include_slices ?? e.includeSlices ?? void 0, s = e.include_scopes ?? e.includeScopes ?? void 0;
  return c !== void 0 && (o.includeSlices = c), s !== void 0 && (o.includeScopes = s), (a.length || i.length) && (o.scopes = {}, a.length && (o.scopes.accounts = a), i.length && (o.scopes.portfolios = i)), typeof e.limit == "number" && Number.isFinite(e.limit) && e.limit > 0 && (o.limit = e.limit), typeof e.offset == "number" && Number.isFinite(e.offset) && e.offset >= 0 && (o.offset = e.offset), o;
}
function ks(e) {
  const t = e.date ?? "", n = e.range ? `${e.range.start}..${e.range.end}` : "", r = e.scopes?.accounts ?? [], a = e.scopes?.portfolios ?? [], i = JSON.stringify({ accounts: r, portfolios: a }), o = e.includeSlices ? "1" : "0", c = e.includeScopes ? "1" : "0", s = e.limit ?? "", l = e.offset ?? "";
  return [t, n, i, o, c, s, l].join("::");
}
function Ts(e) {
  return { ...e };
}
function nr(e) {
  return { ...e };
}
function Ls(e) {
  if (e)
    return {
      accounts: e.accounts.map(nr),
      portfolios: e.portfolios.map(nr)
    };
}
function Ms(e) {
  if (!e)
    return null;
  const t = Ls(e.slices);
  return {
    range: { ...e.range },
    records: e.records.map(Ts),
    ...t ? { slices: t } : {}
  };
}
function Hs(e) {
  if (!e)
    return null;
  const t = {};
  return e.date && (t.date = e.date), e.range && (t.range = { ...e.range }), e.scopes && (t.scopes = {
    ...e.scopes.accounts ? { accounts: [...e.scopes.accounts] } : {},
    ...e.scopes.portfolios ? { portfolios: [...e.scopes.portfolios] } : {}
  }), e.includeSlices !== void 0 && (t.includeSlices = e.includeSlices), e.includeScopes !== void 0 && (t.includeScopes = e.includeScopes), e.limit !== void 0 && (t.limit = e.limit), e.offset !== void 0 && (t.offset = e.offset), t;
}
function zt(e) {
  ye = {
    ...ye,
    ...e
  };
}
function Jt() {
  return {
    status: ye.status,
    error: ye.error,
    lastUpdated: ye.lastUpdated,
    data: Ms(ye.data),
    selection: Hs(ye.selection)
  };
}
async function Is(e, t, n = {}) {
  const r = $s(n), a = ks(r);
  if (ye.data && !n.force && er === a)
    return Jt();
  zt({
    status: "loading",
    error: null,
    selection: r
  });
  try {
    const i = await si(e, t, r);
    er = a, zt({
      status: "loaded",
      error: null,
      data: i,
      selection: r,
      lastUpdated: Date.now()
    });
  } catch (i) {
    zt({
      status: "error",
      error: Fs(i),
      selection: r,
      lastUpdated: Date.now()
    });
  }
  return Jt();
}
const zs = 30;
let ha = null, Qt = null;
const de = /* @__PURE__ */ new Set(), Vs = [
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
function Us() {
  const e = /* @__PURE__ */ new Date(), t = new Date(e);
  return t.setUTCDate(e.getUTCDate() - (zs - 1)), {
    range: {
      start: _t(t),
      end: _t(e)
    },
    includeSlices: !0,
    includeScopes: !0
  };
}
function qs(e) {
  if (!e.length)
    return "";
  const t = e.some((i) => i.fx_coverage_ratio != null && i.fx_coverage_ratio < 1), n = e.some((i) => i.price_coverage_ratio != null && i.price_coverage_ratio < 1), r = e.some((i) => i.stale_price), a = [];
  return t && a.push('<span class="meta-badge meta-badge--warning" title="Wechselkurse fehlen teilweise">FX-Abdeckung</span>'), n && a.push('<span class="meta-badge meta-badge--warning" title="Preisdaten unvollständig">Preisabdeckung</span>'), r && a.push('<span class="meta-badge meta-badge--neutral" title="Letzte Kurse sind veraltet">Stale Kurse</span>'), a.length ? `<span class="meta-badges">${a.join("")}</span>` : '<span class="meta-badge meta-badge--positive">Volle Abdeckung</span>';
}
function ma(e) {
  return `${re(e)}&nbsp;€`;
}
function ae(e, t) {
  return e.reduce((n, r) => {
    const a = r[t];
    return typeof a == "number" && Number.isFinite(a) ? n + a : n;
  }, 0);
}
function et(e, t, n = "") {
  const r = e.querySelector("#analyse-status");
  r && (r.dataset.state = t, t === "loading" ? r.textContent = "Lade Vermögensdaten …" : t === "error" ? r.textContent = n || "Daten konnten nicht geladen werden." : r.textContent = "");
}
function rr(e, t, n) {
  const r = e.querySelector("#analyse-total-wealth"), a = e.querySelector("#analyse-coverage"), i = e.querySelector("#analyse-selection-label");
  if (!r || !a || !i)
    return;
  if (i.textContent = t, !n.length) {
    r.innerHTML = "—", a.innerHTML = "";
    return;
  }
  const o = n[n.length - 1];
  r.innerHTML = ma(o.total_wealth_eur), a.innerHTML = qs(n);
}
function ar(e, t) {
  const n = e.querySelector(".analyse-metrics-grid");
  if (!n) return;
  if (!t.length) {
    n.innerHTML = '<div class="metrics-empty">Keine Daten verfügbar</div>';
    return;
  }
  const r = Ks(t);
  if (!r) return;
  const a = (o, c, s = "", l = "") => `
    <div class="metric-row ${s}" ${l ? `id="${l}"` : ""}>
      <span class="metric-label">${o}</span>
      <span class="metric-value">${typeof c == "number" ? ma(c) : c}</span>
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
function bt(e, t) {
  return !e || !t ? null : `${e}:${t}`;
}
function Ws(e) {
  if (!e) {
    de.clear();
    return;
  }
  const t = /* @__PURE__ */ new Set(), n = (r, a) => {
    r.forEach((i) => {
      const o = bt(a, i.scope_id);
      o && t.add(o);
    });
  };
  n(e.accounts, "account"), n(e.portfolios, "portfolio"), de.size === 0 ? t.forEach((r) => de.add(r)) : Array.from(de).forEach((r) => {
    t.has(r) || de.delete(r);
  });
}
function Os(e, t) {
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
    const u = /* @__PURE__ */ new Map();
    if (s.forEach((p) => {
      const d = bt(l, p.scope_id);
      d && !u.has(d) && u.set(d, p);
    }), u.size === 0)
      return "";
    const f = Array.from(u.values()).map((p) => {
      const d = bt(l, p.scope_id);
      if (!d)
        return "";
      const g = de.has(d) ? "checked" : "", m = p.scope_name ?? p.scope_id;
      return `
          <label class="scope-option">
            <input type="checkbox" data-scope-key="${d}" ${g}>
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
    s.checked ? de.add(l) : de.delete(l);
    const u = e.closest("#analyse-chart-card");
    u && Qt && ya(u, Qt);
  });
}
function Bs(e) {
  if (typeof e == "number")
    return Number.isFinite(e) ? e : null;
  const t = Date.parse(e);
  return Number.isFinite(t) ? t : null;
}
function Ys(e) {
  const t = Array.from(Vs), n = {
    key: "total",
    label: "Gesamtvermögen",
    color: "#2c3e50",
    points: e.records.map((o) => ({
      date: o.date,
      value: o.total_wealth_eur
    }))
  }, r = [], a = /* @__PURE__ */ new Map(), i = (o, c) => {
    o.forEach((s) => {
      const l = bt(c, s.scope_id);
      l && (a.has(l) || a.set(l, /* @__PURE__ */ new Map()), a.get(l)?.set(s.date, s));
    });
  };
  return e.slices && (i(e.slices.accounts, "account"), i(e.slices.portfolios, "portfolio")), a.forEach((o, c) => {
    if (!de.has(c))
      return;
    const s = t.shift() ?? "#607d8b", l = c.startsWith("account:"), u = c.split(":")[1] ?? "", p = `${l ? "Konto" : "Depot"} ${u}`.trim(), d = o.values().next(), m = (d.done ? void 0 : d.value)?.scope_name ?? p;
    r.push({
      key: c,
      label: m,
      color: s,
      points: e.records.map((y) => {
        const h = o.get(y.date);
        return !h || !Number.isFinite(h.total_wealth_eur) ? null : { date: y.date, value: h.total_wealth_eur };
      }).filter((y) => !!y)
    });
  }), [n, ...r];
}
function js(e, t) {
  const n = e.__chartState, r = e.querySelector("svg");
  if (!n || !n.range || !n.margin || !r)
    return;
  const { range: a, margin: i } = n;
  r.querySelectorAll(".analyse-slice-series").forEach((o) => {
    o.remove();
  }), t.filter((o) => o.key !== "total").forEach((o) => {
    const c = o.points.map((u, f) => {
      const p = Bs(u.date);
      if (p == null || !Number.isFinite(u.value))
        return null;
      const d = a.maxX === a.minX ? 0.5 : (p - a.minX) / (a.maxX - a.minX), g = a.maxY === a.minY ? 0.5 : (u.value - a.minY) / (a.maxY - a.minY), m = i.left + d * a.boundedWidth, y = i.top + (1 - g) * a.boundedHeight;
      return `${f === 0 ? "M" : "L"}${String(m)},${String(y)}`;
    }).filter(Boolean).join(" ");
    if (!c)
      return;
    const s = document.createElementNS("http://www.w3.org/2000/svg", "g");
    s.setAttribute("class", "analyse-slice-series");
    const l = document.createElementNS("http://www.w3.org/2000/svg", "path");
    l.setAttribute("d", c), l.setAttribute("fill", "none"), l.setAttribute("stroke", o.color), l.setAttribute("stroke-width", "2"), l.setAttribute("stroke-linejoin", "round"), l.setAttribute("stroke-linecap", "round"), s.appendChild(l), r.appendChild(s);
  });
}
function ya(e, t) {
  const n = e.querySelector(".line-chart-container");
  if (!n)
    return;
  const r = Ys(t), a = r[0];
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
    yFormatter: (s) => re(s),
    color: a.color,
    areaColor: "rgba(44, 62, 80, 0.12)"
  }, o = n;
  let c = o;
  !o.__chartState || !n.querySelector("svg") ? (n.innerHTML = "", c = ta(n, i)) : (mn(o, i), c = o), c && js(c, r);
}
function Ks(e) {
  if (!e.length)
    return null;
  const t = e[0]?.total_wealth_eur ?? 0, n = e[e.length - 1]?.total_wealth_eur ?? 0, r = ae(e, "dividends_eur"), a = ae(e, "interest_eur"), i = r + a, o = -Math.abs(ae(e, "fees_eur")), c = -Math.abs(ae(e, "taxes_eur")), s = ae(e, "inbound_transfers_eur") - ae(e, "outbound_transfers_eur"), l = ae(e, "performance_neutral_movements"), u = n - t - i - o - c - s - l, f = ae(e, "realized_gains_eur"), p = ae(e, "unrealized_price_gains_eur"), d = ae(e, "fx_gains_eur");
  return {
    startValue: t,
    endValue: n,
    marketGain: u,
    realizedGains: f,
    unrealizedPriceGains: p,
    fxGains: d,
    dividends: r,
    interest: a,
    ertraege: i,
    fees: o,
    taxes: c,
    netTransfers: s,
    neutral: l
  };
}
async function ir(e, t, n, r, a) {
  et(e, "loading");
  const i = await Is(n, r, a);
  if (i.status === "error") {
    if (et(e, "error", i.error ?? void 0), t) {
      const s = t.querySelector(".line-chart-container");
      s && s.replaceChildren();
    }
    return;
  }
  const o = i.data;
  if (!o || !Array.isArray(o.records) || o.records.length === 0) {
    const s = a.range?.start ?? "?", l = a.range?.end ?? "?", u = `Zeitraum: ${s} – ${l}`;
    if (rr(e, u, []), ar(e, []), et(e, "loaded", "Keine Daten für den gewählten Zeitraum."), t) {
      const f = t.querySelector(".line-chart-container");
      f && f.replaceChildren();
    }
    return;
  }
  ha = a, Qt = o, Ws(o.slices);
  const c = a.range ? `Zeitraum: ${a.range.start} – ${a.range.end}` : a.date ? `Tag: ${a.date}` : "";
  rr(e, c, o.records), ar(e, o.records), t && (Os(t, o.slices), ya(t, o)), et(e, "loaded");
}
function Gs(e, t, n, r) {
  const a = e.querySelector("#analyse-date-picker-container"), i = ha ?? Jt().selection ?? Us();
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
  a && new xs(a, {
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
      ir(e, t, n, r, s);
    }
  }), ir(e, t, n, r, i);
}
function Xs(e, t, n) {
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

    ${ln("Zeitmaschine", `
    <div class="header-meta-row">
      <span>Vermögensverlauf &amp; Cashflows</span>
    </div>
  `).outerHTML}

    <div class="card" id="analyse-range-card" data-section="range">
      <h2>Zeitraum &amp; Kennzahlen</h2>
      <div class="analyse-range-form" role="group" aria-label="Zeitraum wählen">
        <div id="analyse-date-picker-container"></div>
      </div>

      <div class="analyse-headline" style="display: none;">
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
    l && Gs(l, u, t, n);
  }, 0), s;
}
const Zs = lo, en = "pp-reader-sticky-anchor", vt = "overview", Js = "analyse", tn = "security:", Qs = [
  { key: vt, title: "Dashboard", render: Wr },
  { key: Js, title: "Zeitmaschine", render: Xs }
], Le = /* @__PURE__ */ new Map(), Je = [], St = /* @__PURE__ */ new Map();
let nn = null, Vt = !1, Re = null, q = 0, Ut = null;
function Ct(e) {
  return typeof e == "object" && e !== null;
}
function _a(e) {
  return typeof e == "object" && e !== null && typeof e.then == "function";
}
function ec(e) {
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
function tc(e) {
  return e === "accounts" || e === "last_file_update" || e === "portfolio_values" || e === "portfolio_positions";
}
function or(e) {
  const t = e.portfolio_uuid;
  if (typeof t == "string" && t)
    return t;
  const n = e.portfolioUuid;
  return typeof n == "string" && n ? n : null;
}
function nc(e) {
  if (!e)
    return null;
  if (Array.isArray(e)) {
    for (const t of e)
      if (Ct(t)) {
        const n = or(t);
        if (n)
          return n;
      }
    return null;
  }
  return Ct(e) ? or(e) : null;
}
function rc(e, t) {
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
function Sn(e) {
  return typeof e != "string" || !e.startsWith(tn) ? null : e.slice(tn.length) || null;
}
function ac() {
  if (!Re)
    return !1;
  const e = wa(Re);
  return e || (Re = null), e;
}
function ue() {
  const e = Je.map((t) => Le.get(t)).filter((t) => !!t);
  return [...Qs, ...e];
}
function ic(e) {
  const t = ue();
  return e < 0 || e >= t.length ? null : t[e];
}
function ba(e) {
  if (!e)
    return null;
  const t = e, n = t.ppreader ?? t.pp_reader;
  return n || (Object.values(t).find((a) => !a || typeof a != "object" ? !1 : a.webcomponent_name === "pp-reader-panel") ?? null);
}
function va() {
  try {
    const e = Et();
    e && typeof e.rememberScrollPosition == "function" && e.rememberScrollPosition();
  } catch (e) {
    console.warn("rememberCurrentPageScroll: konnte Scroll-Position nicht sichern", e);
  }
}
function sr(e) {
  const t = ue();
  return !t.length || e < 0 ? 0 : e >= t.length ? t.length - 1 : e;
}
async function oc(e, t, n, r) {
  const a = ue(), i = sr(e);
  if (i === q) {
    e > q && ac();
    return;
  }
  va();
  const o = q >= 0 && q < a.length ? a[q] : null, c = o ? Sn(o.key) : null;
  let s = i;
  if (c) {
    const l = i >= 0 && i < a.length ? a[i] : null;
    if (l && l.key === vt && dc(c, { suppressRender: !0 })) {
      const p = ue().findIndex((d) => d.key === vt);
      s = p >= 0 ? p : 0;
    }
  }
  if (!Vt) {
    Vt = !0;
    try {
      q = sr(s);
      const l = q;
      await Pa(t, n, r), uc(l);
    } catch (l) {
      console.error("navigateToPage: Fehler beim Rendern des Tabs", l);
    } finally {
      Vt = !1;
    }
  }
}
function wt(e, t, n, r) {
  oc(q + e, t, n, r);
}
function sc(e, t) {
  if (!e || !t || typeof t.render != "function") {
    console.error("registerDetailTab: Ungültiger Tab-Descriptor", e, t);
    return;
  }
  const n = Sn(e);
  if (n) {
    const a = St.get(n);
    a && a !== e && Sa(a);
  }
  const r = {
    ...t,
    key: e
  };
  Le.set(e, r), n && St.set(n, e), Je.includes(e) || Je.push(e);
}
function Sa(e) {
  if (!e)
    return;
  const t = Le.get(e);
  if (t && typeof t.cleanup == "function")
    try {
      const a = t.cleanup({ key: e });
      _a(a) && a.catch((i) => {
        console.error(
          "unregisterDetailTab: Fehler beim asynchronen cleanup",
          i
        );
      });
    } catch (a) {
      console.error("unregisterDetailTab: Fehler beim Ausführen von cleanup", a);
    }
  Le.delete(e);
  const n = Je.indexOf(e);
  n >= 0 && Je.splice(n, 1);
  const r = Sn(e);
  r && St.get(r) === e && St.delete(r);
}
function cc(e) {
  return Le.has(e);
}
function cr(e) {
  return Le.get(e) ?? null;
}
function lc(e) {
  if (e != null && typeof e != "function") {
    console.error("setSecurityDetailTabFactory: Erwartet Funktion oder null", e);
    return;
  }
  nn = e ?? null;
}
function Ca(e) {
  return `${tn}${e}`;
}
function Et() {
  for (const t of ja())
    if (t.isConnected)
      return t;
  const e = /* @__PURE__ */ new Set();
  for (const t of Ka())
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
function rn() {
  const e = Et();
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
const wc = {
  findDashboardElement: Et
};
function uc(e) {
  const t = Et();
  if (t && typeof t.handleExternalRender == "function")
    try {
      t.handleExternalRender(e);
    } catch (n) {
      console.warn("notifyExternalRender: Fehler beim Synchronisieren des Dashboards", n);
    }
}
function wa(e) {
  if (!e)
    return console.error("openSecurityDetail: Ungültige securityUuid", e), !1;
  const t = Ca(e);
  let n = cr(t);
  if (!n && typeof nn == "function")
    try {
      const i = nn(e);
      i && typeof i.render == "function" ? (sc(t, i), n = cr(t)) : console.error("openSecurityDetail: Factory lieferte ungültigen Descriptor", i);
    } catch (i) {
      console.error("openSecurityDetail: Fehler beim Erzeugen des Tab-Descriptors", i);
    }
  if (!n)
    return console.warn(`openSecurityDetail: Kein Detail-Tab für ${e} verfügbar`), !1;
  va();
  let a = ue().findIndex((i) => i.key === t);
  return a === -1 && (a = ue().findIndex((o) => o.key === t), a === -1) ? (console.error("openSecurityDetail: Tab nach Registrierung nicht auffindbar"), !1) : (q = a, Re = null, rn(), !0);
}
function dc(e, t = {}) {
  if (!e)
    return console.error("closeSecurityDetail: Ungültige securityUuid", e), !1;
  const { suppressRender: n = !1 } = t, r = Ca(e);
  if (!cc(r))
    return !1;
  const i = ue().findIndex((s) => s.key === r), o = i === q;
  Sa(r);
  const c = ue();
  if (!c.length)
    return q = 0, n || rn(), !0;
  if (Re = e, o) {
    const s = c.findIndex((l) => l.key === vt);
    s >= 0 ? q = s : q = Math.min(Math.max(i - 1, 0), c.length - 1);
  } else q >= c.length && (q = Math.max(0, c.length - 1));
  return n || rn(), !0;
}
async function Pa(e, t, n) {
  let r = n;
  r || (r = ba(t ? t.panels : null));
  const a = ue();
  q >= a.length && (q = Math.max(0, a.length - 1));
  const i = ic(q);
  if (!i) {
    console.error("renderTab: Kein gültiger Tab oder keine render-Methode gefunden!");
    return;
  }
  let o;
  try {
    o = await i.render(e, t, r);
  } catch (u) {
    console.error("renderTab: Fehler beim Rendern des Tabs:", u), e.innerHTML = `<div class="card"><h2>Fehler</h2><pre>${ec(u)}</pre></div>`;
    return;
  }
  e.innerHTML = o ?? "", i.render === Wr && hn(e);
  const s = await new Promise((u) => {
    const f = window.setInterval(() => {
      const p = e.querySelector(".header-card");
      p && (clearInterval(f), u(p));
    }, 50);
  });
  let l = e.querySelector(`#${en}`);
  if (!l) {
    l = document.createElement("div"), l.id = en;
    const u = s.parentNode;
    u && "insertBefore" in u && u.insertBefore(l, s);
  }
  gc(e, t, n), pc(e, t, n), fc(e);
}
function fc(e) {
  const t = e.querySelector(".header-card"), n = e.querySelector(`#${en}`);
  if (!t || !n) {
    console.error("Fehlende Elemente für das Scrollverhalten: headerCard oder anchor.");
    return;
  }
  Ut?.disconnect(), Ut = new IntersectionObserver(
    ([r]) => {
      r.isIntersecting ? t.classList.remove("sticky") : t.classList.add("sticky");
    },
    {
      root: null,
      rootMargin: "0px 0px 0px 0px",
      threshold: 0
    }
  ), Ut.observe(n);
}
function pc(e, t, n) {
  const r = e.querySelector(".header-card");
  if (!r) {
    console.error("Header-Card nicht gefunden!");
    return;
  }
  Zs(
    r,
    () => {
      wt(1, e, t, n);
    },
    () => {
      wt(-1, e, t, n);
    }
  );
}
function gc(e, t, n) {
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
    wt(-1, e, t, n);
  }), i.addEventListener("click", () => {
    wt(1, e, t, n);
  }), hc(r);
}
function hc(e) {
  const t = e.querySelector("#nav-left"), n = e.querySelector("#nav-right");
  if (t && (q === 0 ? (t.disabled = !0, t.classList.add("disabled")) : (t.disabled = !1, t.classList.remove("disabled"))), n) {
    const r = ue(), i = !(q === r.length - 1) || !!Re;
    n.disabled = !i, n.classList.toggle("disabled", !i);
  }
}
class mc extends HTMLElement {
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
    this._panel || (this._panel = ba(this._hass.panels ?? null));
    const t = Nn(this._hass, this._panel);
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
    const n = Nn(this._hass, this._panel);
    if (!n)
      return;
    const r = t.data;
    if (!tc(r.data_type) || r.entry_id && r.entry_id !== n)
      return;
    const a = rc(r.data_type, r.data);
    a && (this._queueUpdate(a.type, a.data), this._doRender(a.type, a.data));
  }
  _doRender(t, n) {
    switch (t) {
      case "accounts":
        Qi(
          n,
          this._root
        );
        break;
      case "last_file_update":
        co(
          n,
          this._root
        );
        break;
      case "portfolio_values":
        no(
          n,
          this._root
        );
        break;
      case "portfolio_positions":
        io(
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
    t === "portfolio_positions" && (a.portfolioUuid = nc(
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
  rememberScrollPosition(t = q) {
    const n = Number.isInteger(t) ? t : q;
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
    const t = q;
    if (!this._hasNewData && this._panel === this._lastPanel && this._narrow === this._lastNarrow && this._route === this._lastRoute && this._lastPage === t)
      return;
    this._lastPage != null && (this._scrollPositions[this._lastPage] = this._root.scrollTop);
    const n = Pa(this._root, this._hass, this._panel);
    if (_a(n)) {
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
customElements.get("pp-reader-dashboard") || customElements.define("pp-reader-dashboard", mc);
console.log("PPReader dashboard module v20250914b geladen");
Ds({
  setSecurityDetailTabFactory: lc
});
export {
  wc as __TEST_ONLY_DASHBOARD,
  Cc as __TEST_ONLY__,
  dc as closeSecurityDetail,
  gn as flushPendingPositions,
  cr as getDetailTabDescriptor,
  io as handlePortfolioPositionsUpdate,
  cc as hasDetailTab,
  wa as openSecurityDetail,
  Sc as reapplyPositionsSort,
  yc as registerDashboardElement,
  sc as registerDetailTab,
  bc as registerPanelHost,
  lc as setSecurityDetailTabFactory,
  _c as unregisterDashboardElement,
  Sa as unregisterDetailTab,
  vc as unregisterPanelHost,
  qr as updatePortfolioFooterFromDom
};
//# sourceMappingURL=dashboard.nC4f-3ri.js.map
