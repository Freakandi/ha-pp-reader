const sn = /* @__PURE__ */ new Set(), cn = /* @__PURE__ */ new Set(), fr = {}, Ga = [
  "renderPositionsTable",
  "applyGainPctMetadata",
  "attachSecurityDetailListener",
  "attachPortfolioPositionsSorting",
  "updatePortfolioFooter"
];
function Xa(e, t) {
  typeof t == "function" && (fr[e] = t);
}
function Ac(e) {
  e && sn.add(e);
}
function Cc(e) {
  e && sn.delete(e);
}
function Za() {
  return sn;
}
function Pc(e) {
  e && cn.add(e);
}
function Ec(e) {
  e && cn.delete(e);
}
function Ja() {
  return cn;
}
function Qa(e) {
  for (const t of Ga)
    Xa(t, e[t]);
}
function ln() {
  return fr;
}
function ye(e) {
  return typeof e == "object" && e !== null;
}
function O(e) {
  return typeof e == "string" ? e : null;
}
function et(e) {
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
function Nn(e) {
  const t = V(e);
  if (t == null)
    return null;
  const n = Math.trunc(t);
  return Number.isFinite(n) ? n : null;
}
function nt(e) {
  return ye(e) ? { ...e } : null;
}
function pr(e) {
  return ye(e) ? { ...e } : null;
}
function gr(e) {
  return typeof e == "boolean" ? e : void 0;
}
function ei(e) {
  if (!ye(e))
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
  const f = O(e.provenance);
  f && (i.provenance = f);
  const d = et(e.metric_run_uuid);
  d !== null && (i.metric_run_uuid = d);
  const p = gr(e.fx_unavailable);
  return typeof p == "boolean" && (i.fx_unavailable = p), i;
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
function ti(e) {
  if (!ye(e))
    return null;
  const t = e.aggregation, n = O(e.security_uuid), r = O(e.name), a = V(e.current_holdings), i = V(e.purchase_value_eur) ?? (ye(t) ? V(t.purchase_value_eur) ?? V(t.purchase_total_account) ?? V(t.account_currency_total) : null) ?? V(e.purchase_value), o = V(e.current_value);
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
    average_cost: nt(e.average_cost),
    performance: nt(e.performance),
    aggregation: nt(e.aggregation),
    data_state: pr(e.data_state)
  }, s = V(e.coverage_ratio);
  s != null && (c.coverage_ratio = s);
  const l = O(e.provenance);
  l && (c.provenance = l);
  const f = et(e.metric_run_uuid);
  f !== null && (c.metric_run_uuid = f);
  const d = V(e.last_price_native);
  d != null && (c.last_price_native = d);
  const p = V(e.last_price_eur);
  p != null && (c.last_price_eur = p);
  const u = V(e.last_close_native);
  u != null && (c.last_close_native = u);
  const g = V(e.last_close_eur);
  return g != null && (c.last_close_eur = g), c;
}
function mr(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = ti(n);
    r && t.push(r);
  }
  return t;
}
function yr(e) {
  if (!ye(e))
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
    position_count: Nn(e.position_count ?? e.count) ?? void 0,
    missing_value_positions: Nn(e.missing_value_positions) ?? void 0,
    has_current_value: gr(e.has_current_value),
    performance: nt(e.performance),
    coverage_ratio: V(e.coverage_ratio) ?? void 0,
    provenance: O(e.provenance) ?? void 0,
    metric_run_uuid: et(e.metric_run_uuid) ?? void 0,
    data_state: pr(e.data_state)
  };
  return Array.isArray(e.positions) && (i.positions = mr(e.positions)), i;
}
function br(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = yr(n);
    r && t.push(r);
  }
  return t;
}
function _r(e) {
  if (!ye(e))
    return null;
  const t = { ...e }, n = et(e.metric_run_uuid);
  n !== null ? t.metric_run_uuid = n : delete t.metric_run_uuid;
  const r = V(e.coverage_ratio);
  r != null ? t.coverage_ratio = r : delete t.coverage_ratio;
  const a = O(e.provenance);
  a ? t.provenance = a : delete t.provenance;
  const i = O(e.generated_at ?? e.snapshot_generated_at);
  return i ? t.generated_at = i : delete t.generated_at, t;
}
function ni(e) {
  if (!ye(e))
    return null;
  const t = { ...e }, n = _r(e.normalized_payload);
  return n ? t.normalized_payload = n : "normalized_payload" in t && delete t.normalized_payload, t;
}
function vr(e) {
  if (!ye(e))
    return null;
  const t = O(e.generated_at);
  if (!t)
    return null;
  const n = et(e.metric_run_uuid), r = hr(e.accounts), a = br(e.portfolios), i = ni(e.diagnostics), o = {
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
function ri(e) {
  if (typeof e == "string")
    return e;
  if (e === null)
    return null;
}
function ai(e) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
}
function xn(e, t) {
  if (typeof e == "string")
    return e;
  throw new Error(`mapPositionSnapshotToRecord: fehlendes ${t}`);
}
function Ft(e, t) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  throw new Error(`mapPositionSnapshotToRecord: fehlendes ${t}`);
}
function ii(e) {
  const t = xn(e.security_uuid, "security_uuid"), n = xn(e.name, "name"), r = Ft(e.current_holdings, "current_holdings"), a = Ft(e.purchase_value, "purchase_value"), i = Ft(e.current_value, "current_value"), o = {
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
function Dn(e, t) {
  return fe(e, t);
}
async function oi(e, t) {
  if (!e)
    throw new Error("fetchAccountsWS: fehlendes hass");
  const n = fe(e, t);
  if (!n)
    throw new Error("fetchAccountsWS: fehlendes entry_id");
  const r = await e.connection.sendMessagePromise({
    type: "pp_reader/get_accounts",
    entry_id: n
  }), a = hr(r.accounts), i = vr(r.normalized_payload);
  return {
    accounts: a,
    normalized_payload: i
  };
}
async function si(e, t) {
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
async function Sr(e, t) {
  if (!e)
    throw new Error("fetchPortfoliosWS: fehlendes hass");
  const n = fe(e, t);
  if (!n)
    throw new Error("fetchPortfoliosWS: fehlendes entry_id");
  const r = await e.connection.sendMessagePromise({
    type: "pp_reader/get_portfolio_data",
    entry_id: n
  }), a = br(r.portfolios), i = vr(r.normalized_payload);
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
function kn(e) {
  return e === null ? null : typeof e == "number" && Number.isFinite(e) ? e : null;
}
function wr(e) {
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
    fx_coverage_ratio: kn(e.fx_coverage_ratio),
    price_coverage_ratio: kn(e.price_coverage_ratio),
    stale_price: e.stale_price === !0
  }, r = ne(e.provenance);
  return r && (n.provenance = r), n;
}
function Fn(e) {
  const t = wr(e), n = ne(e.scope_type), r = ne(e.scope_id);
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
  const r = fe(e, t);
  if (!r)
    throw new Error("fetchDailyWealthWS: fehlendes entry_id");
  const { date: a, range: i, includeSlices: o, includeScopes: c, scopes: s, limit: l, offset: f } = n, d = ne(a), p = i && typeof i == "object" ? {
    start: ne(i.start) ?? "",
    end: ne(i.end) ?? ""
  } : null;
  if (d && p && p.start && p.end)
    throw new Error("fetchDailyWealthWS: date und range sind gleichzeitig gesetzt");
  const u = {
    type: "pp_reader/get_daily_wealth",
    entry_id: r
  };
  if (d)
    u.date = d;
  else if (p && p.start && p.end)
    u.range = p;
  else
    throw new Error("fetchDailyWealthWS: weder date noch range angegeben");
  o !== void 0 && (u.include_slices = o), c !== void 0 && (u.include_scopes = c), (Array.isArray(s?.accounts) || Array.isArray(s?.portfolios)) && (u.scopes = {}, Array.isArray(s.accounts) && (u.scopes.accounts = s.accounts.filter((b) => typeof b == "string" && b.length > 0)), Array.isArray(s.portfolios) && (u.scopes.portfolios = s.portfolios.filter(
    (b) => typeof b == "string" && b.length > 0
  ))), typeof l == "number" && Number.isFinite(l) && l > 0 && (u.limit = l), typeof f == "number" && Number.isFinite(f) && f >= 0 && (u.offset = f);
  const g = await e.connection.sendMessagePromise(u), y = ci(g.range, d, p), m = (Array.isArray(g.records) ? g.records : []).map((b) => b && typeof b == "object" ? wr(b) : null).filter((b) => !!b), _ = li(g.slices);
  return {
    range: y,
    records: m,
    ..._ ? { slices: _ } : {}
  };
}
async function un(e, t, n) {
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
  }), o = mr(a.positions).map(ii), c = _r(a.normalized_payload), s = {
    portfolio_uuid: ne(a.portfolio_uuid) ?? n,
    positions: o
  };
  typeof a.error == "string" && (s.error = a.error);
  const l = ai(a.coverage_ratio);
  l !== void 0 && (s.coverage_ratio = l);
  const f = ne(a.provenance);
  f && (s.provenance = f);
  const d = ri(a.metric_run_uuid);
  return d !== void 0 && (s.metric_run_uuid = d), c && (s.normalized_payload = c), s;
}
async function di(e, t) {
  if (!e)
    throw new Error("fetchAllPortfolioPositionsWS: fehlendes hass");
  if (!fe(e, t))
    throw new Error("fetchAllPortfolioPositionsWS: fehlendes entry_id");
  const r = await Sr(e, t), a = [];
  for (const i of r.portfolios) {
    const o = await un(e, t, i.uuid);
    a.push(...o.positions);
  }
  return a;
}
async function fi(e, t, n) {
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
async function pi(e, t) {
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
  }, { startDate: o, endDate: c, start_date: s, end_date: l } = r || {}, f = o ?? s;
  f != null && (i.start_date = f);
  const d = c ?? l;
  d != null && (i.end_date = d);
  const p = await e.connection.sendMessagePromise(i);
  return Array.isArray(p.prices) || (p.prices = []), Array.isArray(p.transactions) || (p.transactions = []), p;
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
function he(e) {
  return k(e);
}
const dn = (e, t) => {
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
      const l = s.replace(/\s+/g, "").replace(/[^0-9,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."), f = Number.parseFloat(l);
      return Number.isNaN(f) ? Number.NaN : f;
    }
    return Number.NaN;
  }, o = (s, l = 2, f = 2) => {
    const d = typeof s == "number" ? s : i(s);
    return Number.isFinite(d) ? d.toLocaleString("de-DE", {
      minimumFractionDigits: l,
      maximumFractionDigits: f
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
    const f = e.endsWith("pct") ? "%" : "€";
    return a = o(l) + `&nbsp;${f}`, `<span class="${dn(l, 2)}">${a}</span>`;
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
    typeof t == "string" ? s = t : typeof t == "number" && Number.isFinite(t) ? s = t.toString() : typeof t == "boolean" ? s = t ? "true" : "false" : t instanceof Date && Number.isFinite(t.getTime()) && (s = t.toISOString()), a = s, a && (/<[a-z]/i.test(a) && /<\s*(?:script|iframe|object|embed|base|style|link|meta|form)\b|javascript:|[\s\/]on[a-z]+\s*=/i.test(a) && (a = k(a)), /<|&lt;|&gt;/.test(a) || (a.length > 60 && (a = a.slice(0, 59) + "…"), a.startsWith("Kontostand ") ? a = a.substring(11) : a.startsWith("Depotwert ") && (a = a.substring(10))));
  }
  return typeof a != "string" || a === "" ? c() : a;
}
function Pe(e, t, n = [], r = {}) {
  const { sortable: a = !1, defaultSort: i } = r, o = i?.key ?? "", c = i?.dir === "desc" ? "desc" : "asc";
  let s = "<table><thead><tr>";
  t.forEach((h) => {
    const m = h.align === "right" ? ' class="align-right"' : "";
    if (a && h.key) {
      const _ = `${he(h.label)} sortieren`;
      s += `<th${m} data-sort-key="${h.key}" role="button" tabindex="0" aria-sort="none" aria-label="${_}">${h.label}</th>`;
    } else
      s += `<th${m}>${h.label}</th>`;
  }), s += "</tr></thead><tbody>", e.forEach((h) => {
    s += "<tr>", t.forEach((m) => {
      const _ = m.align === "right" ? ' class="align-right"' : "";
      s += `<td${_}>${M(m.key, h[m.key], h)}</td>`;
    }), s += "</tr>";
  });
  const l = {}, f = {};
  t.forEach((h) => {
    if (n.includes(h.key)) {
      const m = e.reduce(
        (_, b) => {
          let v = b[h.key];
          if ((h.key === "gain_abs" || h.key === "gain_pct") && (typeof v != "number" || !Number.isFinite(v))) {
            const A = b.performance;
            if (typeof A == "object" && A !== null) {
              const C = A[h.key];
              typeof C == "number" && (v = C);
            }
          } else if ((h.key === "day_change_abs" || h.key === "day_change_pct") && (typeof v != "number" || !Number.isFinite(v))) {
            const A = b.performance;
            if (typeof A == "object" && A !== null) {
              const C = A.day_change;
              if (C && typeof C == "object") {
                const P = h.key === "day_change_pct" ? C.change_pct : C.value_change_eur ?? C.price_change_eur;
                typeof P == "number" && (v = P);
              }
            }
          }
          if (typeof v == "number" && Number.isFinite(v)) {
            const A = v;
            _.total += A, _.hasValue = !0;
          }
          return _;
        },
        { total: 0, hasValue: !1 }
      );
      m.hasValue ? (l[h.key] = m.total, f[h.key] = { hasValue: !0 }) : (l[h.key] = null, f[h.key] = { hasValue: !1 });
    }
  });
  const d = l.gain_abs ?? null;
  if (d != null) {
    const h = l.purchase_value ?? null;
    if (h != null && h > 0)
      l.gain_pct = d / h * 100;
    else {
      const m = l.current_value ?? null;
      m != null && m !== 0 && (l.gain_pct = d / (m - d) * 100);
    }
  }
  const p = l.day_change_abs ?? null;
  if (p != null) {
    const h = l.current_value ?? null;
    if (h != null) {
      const m = h - p;
      m && (l.day_change_pct = p / m * 100, f.day_change_pct = { hasValue: !0 });
    }
  }
  const u = Number.isFinite(l.gain_pct ?? NaN) ? l.gain_pct : null;
  let g = "", y = "neutral";
  if (u != null && (g = `${ae(u)} %`, u > 0 ? y = "positive" : u < 0 && (y = "negative")), s += '<tr class="footer-row">', t.forEach((h, m) => {
    const _ = h.align === "right" ? ' class="align-right"' : "";
    if (m === 0) {
      s += `<td${_}>Summe</td>`;
      return;
    }
    if (l[h.key] != null) {
      let v = "";
      h.key === "gain_abs" && g && (v = ` data-gain-pct="${he(g)}" data-gain-sign="${he(y)}"`), s += `<td${_}${v}>${M(h.key, l[h.key], void 0, f[h.key])}</td>`;
      return;
    }
    if (h.key === "gain_pct" && l.gain_pct != null) {
      s += `<td${_}>${M("gain_pct", l.gain_pct, void 0, f[h.key])}</td>`;
      return;
    }
    const b = f[h.key] ?? { hasValue: !1 };
    s += `<td${_}>${M(h.key, null, void 0, b)}</td>`;
  }), s += "</tr>", s += "</tbody></table>", a)
    try {
      const h = document.createElement("template");
      h.innerHTML = s.trim();
      const m = h.content.querySelector("table");
      if (m)
        return m.classList.add("sortable-table"), o && (m.dataset.defaultSort = o, m.dataset.defaultDir = c), m.outerHTML;
    } catch (h) {
      console.warn("makeTable(sortable): Injection fehlgeschlagen:", h);
    }
  return s;
}
function Pt(e, t, n = {}) {
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
function gi(e) {
  const t = Number.isNaN(e) ? 0 : e;
  return `<span class="${dn(t, 2)}">${ae(t)}&nbsp;€</span>`;
}
function hi(e) {
  const t = Number.isNaN(e) ? 0 : e;
  return `<span class="${dn(t, 2)}">${ae(t)}&nbsp;%</span>`;
}
function mi() {
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
function fn(e = "Laden...") {
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
function Ar(e, t, n = "asc", r = !1) {
  if (!e)
    return [];
  const a = e.querySelector("tbody");
  if (!a)
    return [];
  const i = a.querySelector("tr.footer-row"), o = Array.from(
    a.querySelectorAll("tr")
  ).filter((f) => f !== i);
  let c = -1;
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
    typeof d == "number" && (c = d);
  } else {
    const f = Array.from(
      e.querySelectorAll("thead th")
    );
    for (let d = 0; d < f.length; d++)
      if (f[d].getAttribute("data-sort-key") === t) {
        c = d;
        break;
      }
  }
  if (c < 0)
    return o;
  const s = (f) => {
    const d = f.replace(/\u00A0/g, " ").replace(/[%€]/g, "").replace(/\./g, "").replace(/,/g, ".").replace(/[^\d.-]/g, "").trim();
    if (!d) return NaN;
    const p = parseFloat(d);
    return Number.isFinite(p) ? p : NaN;
  };
  o.sort((f, d) => {
    const p = f.cells.item(c), u = d.cells.item(c), g = (p?.textContent ?? "").trim(), y = (u?.textContent ?? "").trim(), h = s(g), m = s(y);
    let _;
    const b = /[0-9]/.test(g) || /[0-9]/.test(y);
    return !Number.isNaN(h) && !Number.isNaN(m) && b ? _ = h - m : _ = g.localeCompare(y, "de", { sensitivity: "base" }), n === "asc" ? _ : -_;
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
const yi = 2;
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
    const c = a !== -1, s = i !== -1;
    if (c && (!s || a > i))
      if (s)
        o = o.replace(/\./g, "").replace(",", ".");
      else {
        const d = o.split(","), p = d[d.length - 1]?.length ?? 0, u = d.slice(0, -1).join(""), g = u.replace(/[+-]/g, "").length, y = d.length > 2, h = /^[-+]?0$/.test(u);
        o = y || p === 0 || p === 3 && g > 0 && g <= 3 && !h ? o.replace(/,/g, "") : o.replace(",", ".");
      }
    else s && c && i > a ? o = o.replace(/,/g, "") : s && o.length - i - 1 === 3 && /\d{4,}/.test(o.replace(/\./g, "")) && (o = o.replace(/\./g, ""));
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
function Et(e, { decimals: t = yi, fallback: n = null } = {}) {
  const r = ge(e);
  if (r == null)
    return n ?? null;
  const a = 10 ** t, i = Math.round(r * a) / a;
  return Object.is(i, -0) ? 0 : i;
}
function Tn(e, t = {}) {
  return Et(e, t);
}
function bi(e, t = {}) {
  return Et(e, t);
}
const _i = /^[+-]?(?:\d+\.?\d*|\d*\.?\d+)(?:[eE][+-]?\d+)?$/, ce = (e) => {
  if (typeof e == "number")
    return Number.isFinite(e) ? e : null;
  if (typeof e == "string") {
    const t = e.trim();
    if (!t || !_i.test(t))
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
function vi(e) {
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
  const o = Cr(t.source) ?? "derived", c = ce(t.coverage_ratio) ?? null, s = vi(t.day_change);
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
  const t = ge(e);
  return Number.isFinite(t ?? NaN) ? t : null;
}
function Si(e) {
  if (!e || typeof e != "object")
    return !1;
  const t = e;
  return typeof t.security_uuid == "string" && typeof t.name == "string" && typeof t.current_holdings == "number" && typeof t.purchase_value == "number" && typeof t.current_value == "number";
}
function Re(e) {
  const t = { ...e };
  return e.average_cost && typeof e.average_cost == "object" && (t.average_cost = { ...e.average_cost }), e.performance && typeof e.performance == "object" && (t.performance = { ...e.performance }), e.aggregation && typeof e.aggregation == "object" && (t.aggregation = { ...e.aggregation }), e.data_state && typeof e.data_state == "object" && (t.data_state = { ...e.data_state }), t;
}
function wi(e, t, n = []) {
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
  ], a = (s, l, f) => {
    const d = l[f];
    d !== void 0 && (s[f] = d);
  };
  r.forEach((s) => {
    a(n, t, s);
  });
  const i = (s) => {
    const l = t[s];
    if (l && typeof l == "object") {
      const f = e && e[s] && typeof e[s] == "object" ? e[s] : {};
      n[s] = {
        ...f,
        ...l
      };
    } else l !== void 0 && (n[s] = l);
  }, o = t.performance, c = e && e.performance && typeof e.performance == "object" ? e.performance : void 0;
  return o !== void 0 && (n.performance = wi(c, o, [
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
    return Ai(c, i);
  }).map(Re);
  return ve.set(e, a), a.map(Re);
}
function Nt(e) {
  return e ? ve.has(e) : !1;
}
function Pr(e) {
  if (!e)
    return [];
  const t = ve.get(e);
  return t ? t.map(Re) : [];
}
function Ci() {
  ve.clear();
}
function Pi() {
  return new Map(
    Array.from(ve.entries(), ([e, t]) => [
      e,
      t.map(Re)
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
function pn(e) {
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
function Ei(e) {
  if (!e || typeof e != "object")
    return null;
  const t = Si(e) ? Re(e) : e, n = be(t.security_uuid), r = be(t.name), a = ge(t.current_holdings), i = Tn(t.current_value), o = pn(t.aggregation), c = t.aggregation && typeof t.aggregation == "object" ? t.aggregation : null, s = q(t.purchase_value_eur) ?? q(c?.purchase_value_eur) ?? q(c?.purchase_total_account) ?? q(c?.account_currency_total) ?? Tn(t.purchase_value);
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
  }, f = He(t.average_cost);
  f && (l.average_cost = f), o && (l.aggregation = o);
  const d = we(t.performance);
  if (d)
    l.performance = d, l.gain_abs = typeof d.gain_abs == "number" ? d.gain_abs : null, l.gain_pct = typeof d.gain_pct == "number" ? d.gain_pct : null;
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
  const y = q(t.last_price_eur);
  y !== null && (l.last_price_eur = y);
  const h = q(t.last_close_native);
  h !== null && (l.last_close_native = h);
  const m = q(t.last_close_eur);
  m !== null && (l.last_close_eur = m);
  const _ = t.data_state && typeof t.data_state == "object" ? { ...t.data_state } : void 0;
  return _ && (l.data_state = _), l;
}
function xt(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = Ei(n);
    r && t.push(r);
  }
  return t;
}
let Er = [];
const Se = /* @__PURE__ */ new Map();
function rt(e) {
  return typeof e == "string" && e.length > 0 ? e : void 0;
}
function Ni(e) {
  return e === null ? null : rt(e);
}
function xi(e) {
  return typeof e == "number" && Number.isFinite(e) ? e : void 0;
}
function Ce(e) {
  return e === null ? null : xi(e);
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
function gn(e) {
  const t = { ...e };
  return t.performance = le(e.performance), t.data_state = le(e.data_state), Array.isArray(e.positions) && (t.positions = e.positions.map(Ke)), t;
}
function Nr(e) {
  if (!e || typeof e != "object")
    return null;
  const t = rt(e.uuid);
  if (!t)
    return null;
  const n = { uuid: t }, r = rt(e.name);
  r && (n.name = r);
  const a = Ce(e.current_value);
  a !== void 0 && (n.current_value = a);
  const i = Ce(e.purchase_sum) ?? Ce(e.purchase_value_eur) ?? Ce(e.purchase_value);
  i !== void 0 && (n.purchase_value = i, n.purchase_sum = i);
  const o = Ce(e.day_change_abs);
  o !== void 0 && (n.day_change_abs = o);
  const c = Ce(e.day_change_pct);
  c !== void 0 && (n.day_change_pct = c);
  const s = $n(e.position_count);
  s !== void 0 && (n.position_count = s);
  const l = $n(e.missing_value_positions);
  l !== void 0 && (n.missing_value_positions = l), typeof e.has_current_value == "boolean" && (n.has_current_value = e.has_current_value);
  const f = Ce(e.coverage_ratio);
  f !== void 0 && (n.coverage_ratio = f);
  const d = rt(e.provenance);
  d && (n.provenance = d), "metric_run_uuid" in e && (n.metric_run_uuid = Ni(e.metric_run_uuid));
  const p = le(e.performance);
  p && (n.performance = p);
  const u = le(e.data_state);
  if (u && (n.data_state = u), Array.isArray(e.positions)) {
    const g = e.positions.filter(
      (y) => !!y
    );
    g.length && (n.positions = g.map(Ke));
  }
  return n;
}
function Di(e, t) {
  const n = {
    ...e,
    ...t
  };
  return !t.performance && e.performance && (n.performance = le(e.performance)), !t.data_state && e.data_state && (n.data_state = le(e.data_state)), !t.positions && e.positions && (n.positions = e.positions.map(Ke)), n;
}
function xr(e) {
  Er = (e ?? []).map((n) => ({ ...n }));
}
function ki() {
  return Er.map((e) => ({ ...e }));
}
function Fi(e) {
  Se.clear();
  const t = e ?? [];
  for (const n of t) {
    const r = Nr(n);
    r && Se.set(r.uuid, gn(r));
  }
}
function Ti(e) {
  const t = e ?? [];
  for (const n of t) {
    const r = Nr(n);
    if (!r)
      continue;
    const a = Se.get(r.uuid), i = a ? Di(a, r) : gn(r);
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
    const f = s ? Ke(s) : {}, d = f;
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
      const y = l[g];
      y != null && (d[g] = y);
    });
    const u = (g, y = []) => {
      const h = l[g], m = s && s[g] && typeof s[g] == "object" ? s[g] : void 0;
      if (!h || typeof h != "object") {
        h !== void 0 && (d[g] = h);
        return;
      }
      const _ = {
        ...m ?? {},
        ...h
      };
      y.forEach((b) => {
        const v = m?.[b];
        v != null && (_[b] = v);
      }), d[g] = _;
    };
    return u("performance", ["gain_pct", "total_change_pct"]), u("aggregation"), u("average_cost"), u("data_state"), f;
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
  return Array.from(Se.values(), (e) => gn(e));
}
function Dr() {
  return {
    accounts: ki(),
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
function kr(e, t) {
  return te(e) ?? t;
}
function Fr(e) {
  return e == null || !Number.isFinite(e) ? null : e < 0 ? 0 : e > 1 ? 1 : e;
}
function Tr(e) {
  return e.split(/[\s_-]+/).filter(Boolean).map(
    (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
  ).join(" ");
}
function $r(e) {
  const t = Li(e);
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
function Li(e) {
  const t = te(e);
  if (!t)
    return null;
  const n = Mi(t);
  return n || Tr(t);
}
function Mi(e) {
  const t = e.trim();
  if (!t.startsWith("{") && !t.startsWith("["))
    return null;
  try {
    const n = JSON.parse(t), r = Hi(n), a = n && typeof n == "object" ? te(
      n.provider ?? n.source
    ) : null;
    if (r.length && a)
      return `${Tr(a)} (${r.join(", ")})`;
    if (r.length)
      return `FX (${r.join(", ")})`;
  } catch {
    return null;
  }
  return null;
}
function Hi(e) {
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
function Ii(e) {
  if (!e)
    return null;
  const t = te(e.uuid) ?? `${Ri}-${e.name ?? "0"}`, n = kr(e.name, "Unbenanntes Konto"), r = te(e.currency_code), a = J(e.balance), i = J(e.orig_balance), o = "coverage_ratio" in e ? Fr(J(e.coverage_ratio)) : null, c = te(e.provenance), s = te(e.metric_run_uuid), l = e.fx_unavailable === !0, f = J(e.fx_rate), d = te(e.fx_rate_source), p = te(e.fx_rate_timestamp), u = [], g = $r(c);
  g && u.push(g);
  const y = {
    uuid: t,
    name: n,
    currency_code: r,
    balance: a,
    orig_balance: i,
    fx_unavailable: l,
    coverage_ratio: o,
    provenance: c,
    metric_run_uuid: null,
    fx_rate: f,
    fx_rate_source: d,
    fx_rate_timestamp: p,
    badges: u
  }, h = typeof s == "string" ? s : null;
  return y.metric_run_uuid = h, y;
}
function zi(e) {
  if (!e)
    return null;
  const t = te(e.uuid);
  if (!t)
    return null;
  const n = kr(e.name, "Unbenanntes Depot"), r = Rn(e.position_count), a = Rn(e.missing_value_positions), i = J(e.current_value), o = J(e.purchase_sum) ?? J(e.purchase_value_eur) ?? J(e.purchase_value) ?? 0, c = J(e.day_change_abs) ?? null, s = J(e.day_change_pct) ?? null, l = we(e.performance), f = l?.gain_abs ?? null, d = l?.gain_pct ?? null, p = l?.day_change ?? null;
  let u = c ?? (p?.value_change_eur != null ? J(p.value_change_eur) : null), g = s ?? (p?.change_pct != null ? J(p.change_pct) : null);
  if (u == null && g != null && i != null) {
    const N = i / (1 + g / 100);
    N && (u = i - N);
  }
  if (g == null && u != null && i != null) {
    const N = i - u;
    N && (g = u / N * 100);
  }
  const y = i != null, h = e.has_current_value === !1 || !y, m = "coverage_ratio" in e ? Fr(J(e.coverage_ratio)) : null, _ = te(e.provenance), b = te(e.metric_run_uuid), v = [], A = $r(_);
  A && v.push(A);
  const C = {
    uuid: t,
    name: n,
    position_count: r,
    current_value: i,
    purchase_sum: o,
    day_change_abs: u ?? null,
    day_change_pct: g ?? null,
    gain_abs: f,
    gain_pct: d,
    hasValue: y,
    fx_unavailable: h || a > 0,
    missing_value_positions: a,
    performance: l,
    coverage_ratio: m,
    provenance: _,
    metric_run_uuid: null,
    badges: v
  }, P = typeof b == "string" ? b : null;
  return C.metric_run_uuid = P, C;
}
function Rr() {
  const { accounts: e } = Dr();
  return e.map(Ii).filter((t) => !!t);
}
function Vi() {
  const { portfolios: e } = Dr();
  return e.map(zi).filter((t) => !!t);
}
function Lr(e, t = {}) {
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
  const r = Lr(t, n);
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
const ue = /* @__PURE__ */ new Map(), Oe = /* @__PURE__ */ new Map();
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
function Ie(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t.length > 0 ? t : null;
}
function xe(e) {
  return typeof e == "number" && Number.isFinite(e) ? e : void 0;
}
function qi(e) {
  return e === null ? null : xe(e);
}
function Wi(e) {
  return e === null ? null : Ie(e);
}
function Ln(e) {
  return (e ?? []).filter(
    (t) => !t.key.endsWith("-coverage") && !t.key.startsWith("provenance-")
  );
}
function Mn(e) {
  return we(e.performance);
}
const Bi = 500, Oi = 10, Yi = "pp-reader:portfolio-positions-updated", ji = "pp-reader:diagnostics", Tt = /* @__PURE__ */ new Map(), Hr = [
  "coverage_ratio",
  "provenance",
  "metric_run_uuid",
  "generated_at"
], Bt = /* @__PURE__ */ new Map();
function Ki(e, t) {
  return `${e}:${t}`;
}
function Gi(e) {
  if (e === void 0)
    return;
  if (e === null)
    return null;
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  const t = qi(e);
  if (t === null)
    return null;
  if (typeof t == "number" && Number.isFinite(t))
    return t;
}
function $t(e) {
  if (e !== void 0)
    return Wi(e);
}
function hn(e, t, n, r) {
  const a = {}, i = Gi(e);
  i !== void 0 && (a.coverage_ratio = i);
  const o = $t(t);
  o !== void 0 && (a.provenance = o);
  const c = $t(n);
  c !== void 0 && (a.metric_run_uuid = c);
  const s = $t(r);
  return s !== void 0 && (a.generated_at = s), Object.keys(a).length > 0 ? a : null;
}
function Xi(e, t) {
  const n = {};
  let r = !1;
  for (const a of Hr) {
    const i = e?.[a], o = t[a];
    i !== o && (Mr(n, a, i, o), r = !0);
  }
  return r ? n : null;
}
function Zi(e) {
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
function mn(e, t, n, r) {
  const a = Ki(e, n), i = Tt.get(a);
  if (!r) {
    if (!i)
      return;
    Tt.delete(a);
    const c = Zi(i);
    if (!c)
      return;
    Hn({
      kind: e,
      uuid: n,
      source: t,
      changed: c,
      snapshot: {},
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    return;
  }
  const o = Xi(i, r);
  o && (Tt.set(a, { ...r }), Hn({
    kind: e,
    uuid: n,
    source: t,
    changed: o,
    snapshot: { ...r },
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  }));
}
function Ji(e) {
  if (!(!e || e.length === 0))
    for (const t of e) {
      const n = Ie(t.uuid);
      if (!n)
        continue;
      const r = hn(
        t.coverage_ratio,
        t.provenance,
        t.metric_run_uuid,
        void 0
      );
      mn("account", "accounts", n, r);
    }
}
function Qi(e) {
  if (!(!e || e.length === 0))
    for (const t of e) {
      const n = Ie(t.uuid);
      if (!n)
        continue;
      const r = hn(
        t.coverage_ratio,
        t.provenance,
        t.metric_run_uuid,
        void 0
      );
      mn("portfolio", "portfolio_values", n, r);
    }
}
function eo(e, t) {
  if (!t)
    return;
  const n = hn(
    t.coverage_ratio ?? t.normalized_payload?.coverage_ratio,
    t.provenance ?? t.normalized_payload?.provenance,
    t.metric_run_uuid ?? t.normalized_payload?.metric_run_uuid,
    t.normalized_payload?.generated_at
  );
  mn("portfolio_positions", "portfolio_positions", e, n);
}
function to(e, t) {
  return `<div class="error">${k(Ui(e))} <button class="retry-pos" data-portfolio="${t}">Erneut laden</button></div>`;
}
function no(e, t, n) {
  const r = e.querySelector("table.sortable-positions");
  if (!r) return;
  const a = e.dataset.sortKey || r.dataset.defaultSort || "name", o = (e.dataset.sortDir || r.dataset.defaultDir || "asc") === "desc" ? "desc" : "asc";
  e.dataset.sortKey = a, e.dataset.sortDir = o;
  try {
    Ar(r, a, o, !0);
  } catch (l) {
    console.warn("restoreSortAndInit: sortTableRows Fehler:", l);
  }
  const { attachPortfolioPositionsSorting: c, attachSecurityDetailListener: s } = ln();
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
    return i.innerHTML = to(r, t), { applied: !0 };
  const o = i.dataset.sortKey, c = i.dataset.sortDir;
  return i.innerHTML = Vr(n), o && (i.dataset.sortKey = o), c && (i.dataset.sortDir = c), no(i, e, t), { applied: !0 };
}
function yn(e, t) {
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
function ro(e) {
  let t = !1;
  for (const [n] of ue)
    yn(e, n) && (t = !0);
  return t;
}
function zr(e, t) {
  const n = Oe.get(t) ?? {
    attempts: 0,
    timer: null
  };
  n.timer || (n.timer = setTimeout(() => {
    n.timer = null, n.attempts += 1;
    const r = yn(e, t);
    r || n.attempts >= Oi ? (Oe.delete(t), r || ue.delete(t)) : zr(e, t);
  }, Bi), Oe.set(t, n));
}
function ao(e, t) {
  console.log("updateConfigsWS: Kontodaten-Update erhalten:", e);
  const n = Array.isArray(e) ? e : [];
  if (xr(n), Ji(n), !t)
    return;
  const r = Rr();
  io(r, t);
  const a = t.querySelector(".portfolio-table table"), i = a ? Array.from(
    a.querySelectorAll("tbody tr.portfolio-row")
  ).map((o) => {
    const c = o.dataset.currentValue, s = c ? Number.parseFloat(c) : Number.NaN;
    if (Number.isFinite(s))
      return {
        current_value: s
      };
    const l = o.cells.item(3), f = at(l?.textContent);
    return {
      current_value: Number.isFinite(f) ? f : 0
    };
  }) : [];
  Ur(r, i, t);
}
function io(e, t) {
  const n = t.querySelector(".account-table"), r = t.querySelector(".fx-account-table"), a = e.filter((o) => (o.currency_code || "EUR") === "EUR"), i = e.filter((o) => (o.currency_code || "EUR") !== "EUR");
  if (n) {
    const o = a.map((c) => ({
      name: ut(c.name, Ln(c.badges), {
        containerClass: "account-name",
        labelClass: "account-name__label"
      }),
      balance: c.balance ?? null
    }));
    n.innerHTML = Pe(
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
      const s = c.orig_balance, l = typeof s == "number" && Number.isFinite(s), f = Ie(c.currency_code), d = l ? s.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) : null, p = d ? f ? `${d} ${f}` : d : "";
      return {
        name: ut(c.name, Ln(c.badges), {
          containerClass: "account-name",
          labelClass: "account-name__label"
        }),
        fx_display: p,
        balance: c.balance ?? null
      };
    });
    r.innerHTML = Pe(
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
function oo(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = yr(n);
    r && t.push(r);
  }
  return t;
}
function so(e, t) {
  if (!Array.isArray(e)) {
    console.warn("handlePortfolioUpdate: Update ist kein Array:", e);
    return;
  }
  try {
    console.debug("handlePortfolioUpdate: payload=", e);
  } catch {
  }
  const n = oo(e);
  if (n.length && Ti(n), Qi(n), !t)
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
        const u = typeof navigator < "u" && navigator.language ? navigator.language : "de-DE";
        return new Intl.NumberFormat(u, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(d);
      } catch {
      }
    return (Et(d, { fallback: 0 }) ?? 0).toFixed(2).replace(".", ",");
  }, o = /* @__PURE__ */ new Map();
  a.querySelectorAll("tr.portfolio-row").forEach((d) => {
    const p = d.dataset.portfolio;
    p && o.set(p, d);
  });
  let s = 0;
  const l = (d) => {
    const p = typeof d == "number" && Number.isFinite(d) ? d : 0;
    try {
      return p.toLocaleString("de-DE");
    } catch {
      return p.toString();
    }
  }, f = /* @__PURE__ */ new Map();
  for (const d of n) {
    const p = Ie(d.uuid);
    p && f.set(p, d);
  }
  for (const [d, p] of f.entries()) {
    const u = o.get(d);
    if (!u)
      continue;
    u.cells.length < 8 && console.warn("handlePortfolioUpdate: Unerwartetes Spaltenlayout", u.cells.length);
    const g = u.cells.item(1), y = u.cells.item(2), h = u.cells.item(3), m = u.cells.item(4), _ = u.cells.item(5), b = u.cells.item(6), v = u.cells.item(7);
    if (!g || !y || !h)
      continue;
    const A = typeof p.position_count == "number" && Number.isFinite(p.position_count) ? p.position_count : 0, C = typeof p.current_value == "number" && Number.isFinite(p.current_value) ? p.current_value : null, P = we(p.performance), N = typeof P?.gain_abs == "number" ? P.gain_abs : null, F = typeof P?.gain_pct == "number" ? P.gain_pct : null, I = typeof p.purchase_sum == "number" && Number.isFinite(p.purchase_sum) ? p.purchase_sum : typeof p.purchase_value == "number" && Number.isFinite(p.purchase_value) ? p.purchase_value : null, w = P?.day_change ?? null, x = xe(p.day_change_abs) ?? xe(w?.value_change_eur) ?? xe(w?.price_change_eur), U = xe(p.day_change_pct) ?? xe(w?.change_pct);
    let E = x ?? null, T = U ?? null;
    if (E == null && T != null && C != null) {
      const G = C / (1 + T / 100);
      G && (E = C - G);
    }
    if (T == null && E != null && C != null) {
      const G = C - E;
      G && (T = E / G * 100);
    }
    const K = typeof p.missing_value_positions == "number" && Number.isFinite(p.missing_value_positions) ? p.missing_value_positions : 0, S = C !== null, D = p.has_current_value === !1 || K > 0 || !S, L = at(h.textContent);
    at(g.textContent) !== A && (g.textContent = l(A));
    const $ = {
      fx_unavailable: D,
      current_value: C,
      performance: P
    }, z = { hasValue: S }, B = M("purchase_value", I, $, z);
    y.innerHTML !== B && (y.innerHTML = B);
    const Y = M("current_value", $.current_value, $, z), X = typeof C == "number" ? C : 0;
    if ((Math.abs(L - X) >= 5e-3 || h.innerHTML !== Y) && (h.innerHTML = Y, u.classList.add("flash-update"), setTimeout(() => {
      u.classList.remove("flash-update");
    }, 800)), m && (m.innerHTML = M("day_change_abs", E, $, z)), _ && (_.innerHTML = M("day_change_pct", T, $, z)), b) {
      const G = M("gain_abs", N, $, z);
      b.innerHTML = G;
      const Ae = typeof F == "number" && Number.isFinite(F) ? F : null;
      b.dataset.gainPct = Ae != null ? `${i(Ae)} %` : "—", b.dataset.gainSign = Ae != null ? Ae > 0 ? "positive" : Ae < 0 ? "negative" : "neutral" : "neutral";
    }
    v && (v.innerHTML = M("gain_pct", F, $, z)), u.dataset.positionCount = A.toString(), u.dataset.purchaseSum = I != null ? I.toString() : "", u.dataset.currentValue = S ? X.toString() : "", u.dataset.dayChange = S && E != null ? E.toString() : "", u.dataset.dayChangePct = S && T != null ? T.toString() : "", u.dataset.gainAbs = N != null ? N.toString() : "", u.dataset.gainPct = F != null ? F.toString() : "", u.dataset.hasValue = S ? "true" : "false", u.dataset.fxUnavailable = D ? "true" : "false", u.dataset.coverageRatio = typeof p.coverage_ratio == "number" && Number.isFinite(p.coverage_ratio) ? p.coverage_ratio.toString() : "", u.dataset.provenance = typeof p.provenance == "string" ? p.provenance : "", u.dataset.metricRunUuid = typeof p.metric_run_uuid == "string" ? p.metric_run_uuid : "", s += 1;
  }
  if (s === 0)
    console.debug("handlePortfolioUpdate: Keine passenden Zeilen gefunden / keine Änderungen.");
  else {
    const d = s.toLocaleString("de-DE");
    console.debug(`handlePortfolioUpdate: ${d} Zeile(n) gepatcht.`);
  }
  try {
    fo(r);
  } catch (d) {
    console.warn("handlePortfolioUpdate: Fehler bei Summen-Neuberechnung:", d);
  }
  try {
    const d = (...m) => {
      for (const _ of m) {
        if (!_) continue;
        const b = t.querySelector(_);
        if (b) return b;
      }
      return null;
    }, p = d(
      ".account-table table",
      ".accounts-eur-table table",
      ".accounts-table table"
    ), u = d(
      ".fx-account-table table",
      ".accounts-fx-table table"
    ), g = (m, _) => {
      if (!m) return [];
      const b = m.querySelectorAll("tbody tr.account-row");
      return (b.length ? Array.from(b) : Array.from(m.querySelectorAll("tbody tr:not(.footer-row)"))).map((A) => {
        const C = _ ? A.cells.item(2) : A.cells.item(1);
        return { balance: at(C?.textContent) };
      });
    }, y = [
      ...g(p, !1),
      ...g(u, !0)
    ], h = Array.from(
      r.querySelectorAll("tbody tr.portfolio-row")
    ).map((m) => {
      const _ = m.dataset.currentValue, b = m.dataset.purchaseSum, v = _ ? Number.parseFloat(_) : Number.NaN, A = b ? Number.parseFloat(b) : Number.NaN;
      return {
        current_value: Number.isFinite(v) ? v : 0,
        purchase_sum: Number.isFinite(A) ? A : 0
      };
    });
    Ur(y, h, t);
  } catch (d) {
    console.warn("handlePortfolioUpdate: Fehler bei Total-Neuberechnung:", d);
  }
}
function co(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e.portfolio_uuid;
  if (typeof t == "string" && t)
    return t;
  const n = e.portfolioUuid;
  return typeof n == "string" && n ? n : null;
}
function Ot(e) {
  Bt.delete(e);
}
function In(e) {
  return typeof e != "number" || !Number.isInteger(e) || e <= 0 ? null : e;
}
function lo(e, t, n, r) {
  if (!n || n <= 1 || !t)
    return Ot(e), r;
  const a = n, i = Bt.get(e) ?? { expected: a, chunks: /* @__PURE__ */ new Map() };
  if (i.expected !== a && (i.chunks.clear(), i.expected = a), i.chunks.set(t, r), Bt.set(e, i), i.chunks.size < a)
    return null;
  const o = [];
  for (let c = 1; c <= a; c += 1) {
    const s = i.chunks.get(c);
    s && Array.isArray(s) && o.push(...s);
  }
  return Ot(e), o;
}
function zn(e, t) {
  const n = co(e);
  if (!n)
    return console.warn("handlePortfolioPositionsUpdate: Ungültiges Update:", e), !1;
  const r = e?.error, a = In(e?.chunk_index), i = In(e?.chunk_count), o = xt(e?.positions ?? []);
  r && Ot(n);
  const c = r ? o : lo(n, a, i, o);
  if (!r && c === null)
    return !0;
  const s = r ? o : c ?? [];
  eo(n, e);
  const l = Nt(n);
  let f = s;
  if (!r && l) {
    const p = ct(n, s);
    lt(n, p), f = p;
  }
  const d = Ir(t, n, f, r);
  if (d.applied) {
    if (ue.delete(n), !r && !l) {
      const p = ct(n, f);
      lt(n, p);
    }
  } else
    r || d.reason !== "hidden" || l ? (ue.set(n, { positions: f, error: r }), zr(t, n)) : (ue.delete(n), Oe.delete(n));
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
            Yi,
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
function uo(e, t) {
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
  const { renderPositionsTable: t, applyGainPctMetadata: n } = ln();
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
  }), a = Pe(
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
      c.forEach((d, p) => {
        const u = s[p];
        if (!u) return;
        d.setAttribute("data-sort-key", u), d.classList.add("sortable-col"), d.setAttribute("role", "button"), d.setAttribute("tabindex", "0"), d.setAttribute("aria-sort", "none");
        const g = d.textContent || "";
        d.setAttribute("aria-label", `${k(g)} sortieren`);
      }), o.querySelectorAll("tbody tr").forEach((d, p) => {
        if (d.classList.contains("footer-row"))
          return;
        const u = e[p];
        u.security_uuid && (d.dataset.security = u.security_uuid), d.classList.add("position-row");
      }), o.dataset.defaultSort = "name", o.dataset.defaultDir = "asc";
      const f = n;
      if (f)
        try {
          f(o);
        } catch (d) {
          console.warn("renderPositionsTableInline: applyGainPctMetadata failed", d);
        }
      else
        o.querySelectorAll("tbody tr").forEach((p, u) => {
          if (p.classList.contains("footer-row"))
            return;
          const g = p.cells.item(4);
          if (!g)
            return;
          const y = e[u], h = Mn(y), m = typeof h?.gain_pct == "number" && Number.isFinite(h.gain_pct) ? h.gain_pct : null, _ = m != null ? `${m.toLocaleString("de-DE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })} %` : "—", b = m == null ? "neutral" : m > 0 ? "positive" : m < 0 ? "negative" : "neutral";
          g.dataset.gainPct = _, g.dataset.gainSign = b;
        });
      return o.outerHTML;
    }
  } catch (i) {
    console.warn("renderPositionsTableInline: Sortier-Metadaten Injection fehlgeschlagen:", i);
  }
  return a;
}
function fo(e) {
  if (!e) return;
  const { updatePortfolioFooter: t } = ln();
  if (typeof t == "function")
    try {
      t(e);
      return;
    } catch (m) {
      console.warn("updatePortfolioFooter: helper schlug fehl:", m);
    }
  const n = Array.from(e.querySelectorAll("tbody tr.portfolio-row")), r = (m) => {
    if (m === void 0)
      return null;
    const _ = Number.parseFloat(m);
    return Number.isFinite(_) ? _ : null;
  }, a = n.reduce(
    (m, _) => {
      const b = r(_.dataset.positionCount);
      if (b != null && (m.sumPositions += b), _.dataset.fxUnavailable === "true" && (m.fxUnavailable = !0), _.dataset.hasValue !== "true")
        return m.incompleteRows += 1, m;
      m.valueRows += 1;
      const v = r(_.dataset.currentValue), A = r(_.dataset.gainAbs), C = r(_.dataset.purchaseSum);
      return v == null || A == null || C == null ? (m.incompleteRows += 1, m) : (m.sumCurrent += v, m.sumGainAbs += A, m.sumPurchase += C, m);
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
  }, f = { hasValue: i }, d = M("current_value", l.current_value, l, f), p = i ? a.sumGainAbs : null, u = i ? o : null, g = M("gain_abs", p, l, f), y = M("gain_pct", u, l, f);
  c.innerHTML = `
    <td>Summe</td>
    <td class="align-right">${s}</td>
    <td class="align-right">${d}</td>
    <td class="align-right">${g}</td>
    <td class="align-right">${y}</td>
  `;
  const h = c.cells.item(3);
  h && (h.dataset.gainPct = i && typeof o == "number" ? `${Yt(o)} %` : "—", h.dataset.gainSign = i && typeof o == "number" ? o > 0 ? "positive" : o < 0 ? "negative" : "neutral" : "neutral"), c.dataset.positionCount = Math.round(a.sumPositions).toString(), c.dataset.currentValue = i ? a.sumCurrent.toString() : "", c.dataset.purchaseSum = i ? a.sumPurchase.toString() : "", c.dataset.gainAbs = i ? a.sumGainAbs.toString() : "", c.dataset.gainPct = i && typeof o == "number" ? o.toString() : "", c.dataset.hasValue = i ? "true" : "false", c.dataset.fxUnavailable = a.fxUnavailable || !i ? "true" : "false";
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
function Yt(e) {
  return (Et(e, { fallback: 0 }) ?? 0).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
function Ur(e, t, n) {
  const r = n ?? document, i = (Array.isArray(e) ? e : []).reduce((d, p) => {
    const u = p.balance ?? p.current_value ?? p.value, g = Vn(u);
    return d + g;
  }, 0), c = (Array.isArray(t) ? t : []).reduce((d, p) => {
    const u = p.current_value ?? p.value, g = Vn(u);
    return d + g;
  }, 0), s = i + c, l = r.querySelector("#headerMeta");
  if (!l) {
    console.warn("updateTotalWealth: #headerMeta nicht gefunden.");
    return;
  }
  const f = l.querySelector("strong") || l.querySelector(".total-wealth-value");
  f ? f.textContent = `${Yt(s)} €` : l.textContent = `💰 Gesamtvermögen: ${Yt(s)} €`, l.dataset.totalWealthEur = s.toString();
}
function po(e, t) {
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
function Nc(e) {
  if (e == null)
    return;
  const t = e.querySelector("table.sortable-positions");
  if (t == null)
    return;
  const n = e.dataset.sortKey || t.dataset.defaultSort || "name", a = (e.dataset.sortDir || t.dataset.defaultDir || "asc") === "desc" ? "desc" : "asc";
  e.dataset.sortKey = n, e.dataset.sortDir = a, Ar(t, n, a, !0);
}
const xc = {
  getPortfolioPositionsCacheSnapshot: Pi,
  clearPortfolioPositionsCache: Ci,
  getPendingUpdateCount() {
    return ue.size;
  },
  queuePendingUpdate(e, t, n) {
    ue.set(e, { positions: t, error: n });
  },
  clearPendingUpdates() {
    ue.clear(), Oe.clear();
  },
  renderPositionsTableInline: Vr
};
function at(e) {
  return e == null ? 0 : parseFloat(
    e.replace(/\u00A0/g, " ").replace(/[€%]/g, "").replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "")
  ) || 0;
}
const Un = 50;
function qn(e, t) {
  try {
    t();
  } catch (n) {
    console.warn(`addSwipeEvents: ${e} handler threw`, n);
  }
}
function go(e, t, n) {
  let r = null;
  const a = (l) => {
    l < -Un ? qn("left", t) : l > Un && qn("right", n);
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
  }, c = (l) => {
    r = l.clientX;
  }, s = (l) => {
    r !== null && (a(l.clientX - r), r = null);
  };
  e.addEventListener("touchstart", i, { passive: !0 }), e.addEventListener("touchend", o, { passive: !0 }), e.addEventListener("mousedown", c), e.addEventListener("mouseup", s);
}
const ho = [
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
  return ho.includes(e);
}
function Lt(e) {
  return e === "asc" || e === "desc";
}
function qr(e) {
  return (e ?? []).filter((t) => !t.key.endsWith("-coverage"));
}
function Wn(e) {
  return qr(e).filter(
    (t) => !t.key.startsWith("provenance-")
  );
}
let dt = null, ft = null;
const Bn = { min: 2, max: 6 };
function Ue(e) {
  return ge(e);
}
function mo(e) {
  return typeof e == "number" && Number.isFinite(e);
}
function yo(e) {
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
    const a = yo(e[r]);
    if (a)
      return a;
  }
  return n;
}
function Yn(e, t) {
  return mo(e) ? `${e.toLocaleString("de-DE", {
    minimumFractionDigits: Bn.min,
    maximumFractionDigits: Bn.max
  })}${t ? ` ${t}` : ""}` : null;
}
function bo(e) {
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
  ) ?? "EUR", o = Ue(n?.native), c = Ue(n?.security), s = Ue(n?.account), l = Ue(n?.eur), f = c ?? o, d = l ?? (i === "EUR" ? s : null), p = a ?? i, u = p === "EUR";
  let g, y;
  u ? (g = "EUR", y = d ?? f ?? s ?? null) : f != null ? (g = p, y = f) : s != null ? (g = i, y = s) : (g = "EUR", y = d ?? null);
  const h = Yn(y, g), m = u ? null : Yn(d, "EUR"), _ = !!m && m !== h, b = [], v = [];
  h ? (b.push(
    `<span class="purchase-price purchase-price--primary">${h}</span>`
  ), v.push(h.replace(/\u00A0/g, " "))) : (b.push('<span class="missing-value" role="note" aria-label="Kein Kaufpreis verfügbar" title="Kein Kaufpreis verfügbar">—</span>'), v.push("Kein Kaufpreis verfügbar")), _ && m && (b.push(
    `<span class="purchase-price purchase-price--secondary">${m}</span>`
  ), v.push(m.replace(/\u00A0/g, " ")));
  const A = b.join("<br>"), C = Ue(r?.purchase_value_eur) ?? 0, P = v.join(", ");
  return { markup: A, sortValue: C, ariaLabel: P };
}
function _o(e) {
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
  const c = we(e.performance)?.day_change ?? null;
  if (a == null && c?.price_change_eur != null && (a = c.price_change_eur * t), i == null && c?.change_pct != null && (i = c.change_pct), a == null && i != null) {
    const f = ge(e.current_value);
    if (f != null) {
      const d = f / (1 + i / 100);
      d && (a = f - d);
    }
  }
  const s = a != null && Number.isFinite(a) ? Math.round(a * 100) / 100 : null, l = i != null && Number.isFinite(i) ? Math.round(i * 100) / 100 : null;
  return { value: s, pct: l };
}
const pt = /* @__PURE__ */ new Set();
function Wr(e) {
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
    const o = we(i.performance), c = typeof o?.gain_abs == "number" ? o.gain_abs : null, s = typeof o?.gain_pct == "number" ? o.gain_pct : null, l = _o(i), f = typeof i.purchase_value == "number" || typeof i.purchase_value == "string" ? i.purchase_value : null;
    return {
      name: typeof i.name == "string" ? k(i.name) : typeof i.name == "number" ? String(i.name) : "",
      current_holdings: typeof i.current_holdings == "number" || typeof i.current_holdings == "string" ? i.current_holdings : null,
      average_price: typeof i.purchase_value == "number" || typeof i.purchase_value == "string" ? i.purchase_value : null,
      purchase_value: f,
      current_value: typeof i.current_value == "number" || typeof i.current_value == "string" ? i.current_value : null,
      day_change_abs: l.value,
      day_change_pct: l.pct,
      gain_abs: c,
      gain_pct: s,
      performance: o
    };
  }), a = Pe(r, n, ["purchase_value", "current_value", "day_change_abs", "gain_abs"]);
  try {
    const i = document.createElement("template");
    i.innerHTML = a.trim();
    const o = i.content.querySelector("table");
    if (o) {
      o.classList.add("sortable-positions");
      const c = Array.from(o.querySelectorAll("thead th"));
      return n.forEach((l, f) => {
        const d = c.at(f);
        if (!d)
          return;
        d.setAttribute("data-sort-key", l.key), d.classList.add("sortable-col"), d.setAttribute("role", "button"), d.setAttribute("tabindex", "0"), d.setAttribute("aria-sort", "none");
        const p = d.textContent || "";
        d.setAttribute("aria-label", `${k(p)} sortieren`);
      }), o.querySelectorAll("tbody tr").forEach((l, f) => {
        if (l.classList.contains("footer-row") || f >= t.length)
          return;
        const d = t[f], p = typeof d.security_uuid == "string" ? d.security_uuid : null;
        p && (l.dataset.security = p), l.classList.add("position-row");
        const u = l.cells.item(2);
        if (u) {
          const { markup: h, sortValue: m, ariaLabel: _ } = bo(d);
          u.innerHTML = h, u.dataset.sortValue = String(m), _ ? u.setAttribute("aria-label", _) : u.removeAttribute("aria-label");
        }
        const g = l.cells.item(7);
        if (g) {
          const h = we(d.performance), m = typeof h?.gain_pct == "number" && Number.isFinite(h.gain_pct) ? h.gain_pct : null, _ = m != null ? `${m.toLocaleString("de-DE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })} %` : "—", b = m == null ? "neutral" : m > 0 ? "positive" : m < 0 ? "negative" : "neutral";
          g.dataset.gainPct = _, g.dataset.gainSign = b;
        }
        const y = l.cells.item(8);
        y && y.classList.add("gain-pct-cell");
      }), o.dataset.defaultSort = "name", o.dataset.defaultDir = "asc", Wr(o), o.outerHTML;
    }
  } catch (i) {
    console.warn("renderPositionsTable: Konnte Sortier-Metadaten nicht injizieren:", i);
  }
  return a;
}
function vo(e) {
  const t = xt(e ?? []);
  return Ge(t);
}
function So(e, t) {
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
        Na(s) || console.warn("attachSecurityDetailDelegation: Detail-Tab konnte nicht geöffnet werden für", s);
      } catch (l) {
        console.error("attachSecurityDetailDelegation: Fehler beim Öffnen des Detail-Tabs", l);
      }
  })));
}
function Xe(e, t) {
  So(e, t);
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
    const D = Number.isFinite(S.position_count) ? S.position_count : 0, L = Number.isFinite(S.purchase_sum) ? S.purchase_sum : 0, j = S.hasValue && typeof S.current_value == "number" && Number.isFinite(S.current_value) ? S.current_value : null, $ = j !== null, z = S.performance, B = typeof S.gain_abs == "number" ? S.gain_abs : typeof z?.gain_abs == "number" ? z.gain_abs : null, Y = typeof S.gain_pct == "number" ? S.gain_pct : typeof z?.gain_pct == "number" ? z.gain_pct : null, X = z && typeof z == "object" ? z.day_change : null, G = typeof S.day_change_abs == "number" ? S.day_change_abs : X && typeof X == "object" ? X.value_change_eur ?? X.price_change_eur : null, ze = typeof S.day_change_pct == "number" ? S.day_change_pct : X && typeof X == "object" && typeof X.change_pct == "number" ? X.change_pct : null, Ae = S.fx_unavailable && $, Da = typeof S.coverage_ratio == "number" && Number.isFinite(S.coverage_ratio) ? S.coverage_ratio : "", ka = typeof S.provenance == "string" ? S.provenance : "", Fa = typeof S.metric_run_uuid == "string" ? S.metric_run_uuid : "", Ve = pt.has(S.uuid), Ta = Ve ? "portfolio-toggle expanded" : "portfolio-toggle", Pn = `portfolio-details-${S.uuid}`, Q = {
      fx_unavailable: S.fx_unavailable,
      purchase_value: L,
      current_value: j,
      day_change_abs: G,
      day_change_pct: ze,
      gain_abs: B,
      gain_pct: Y
    }, Ne = { hasValue: $ }, $a = M("purchase_value", Q.purchase_value, Q, Ne), Ra = M("current_value", Q.current_value, Q, Ne), La = M("day_change_abs", Q.day_change_abs, Q, Ne), Ma = M("day_change_pct", Q.day_change_pct, Q, Ne), Ha = M("gain_abs", Q.gain_abs, Q, Ne), Ia = M("gain_pct", Q.gain_pct, Q, Ne), En = $ && typeof Y == "number" && Number.isFinite(Y) ? `${ae(Y)} %` : "", za = $ && typeof Y == "number" && Number.isFinite(Y) ? Y > 0 ? "positive" : Y < 0 ? "negative" : "neutral" : "", Va = $ && typeof j == "number" && Number.isFinite(j) ? j : "", Ua = $ && typeof B == "number" && Number.isFinite(B) ? B : "", qa = $ && typeof Y == "number" && Number.isFinite(Y) ? Y : "", Wa = $ && typeof G == "number" && Number.isFinite(G) ? G : "", Ba = $ && typeof ze == "number" && Number.isFinite(ze) ? ze : "", Oa = String(D);
    let kt = "";
    En && (kt = ` data-gain-pct="${t(En)}" data-gain-sign="${t(za)}"`), Ae && (kt += ' data-partial="true"'), n += `<tr class="portfolio-row"
                  data-portfolio="${S.uuid}"
                  data-position-count="${Oa}"
                  data-current-value="${t(Va)}"
                  data-purchase-sum="${t(L)}"
                  data-day-change="${t(Wa)}"
                  data-day-change-pct="${t(Ba)}"
                  data-gain-abs="${t(Ua)}"
                data-gain-pct="${t(qa)}"
                data-has-value="${$ ? "true" : "false"}"
                data-fx-unavailable="${S.fx_unavailable ? "true" : "false"}"
                data-coverage-ratio="${t(Da)}"
                data-provenance="${t(ka)}"
                data-metric-run-uuid="${t(Fa)}">`;
    const Ya = k(S.name), ja = Lr(qr(S.badges), {
      containerClass: "portfolio-badges"
    });
    n += `<td>
        <button type="button"
                class="${Ta}"
                data-portfolio="${S.uuid}"
                aria-expanded="${Ve ? "true" : "false"}"
                aria-controls="${Pn}">
          <span class="caret">${Ve ? "▼" : "▶"}</span>
          <span class="portfolio-name">${Ya}</span>${ja}
        </button>
      </td>`;
    const Ka = D.toLocaleString("de-DE");
    n += `<td class="align-right">${Ka}</td>`, n += `<td class="align-right">${$a}</td>`, n += `<td class="align-right">${Ra}</td>`, n += `<td class="align-right">${La}</td>`, n += `<td class="align-right">${Ma}</td>`, n += `<td class="align-right"${kt}>${Ha}</td>`, n += `<td class="align-right gain-pct-cell">${Ia}</td>`, n += "</tr>", n += `<tr class="portfolio-details${Ve ? "" : " hidden"}"
                data-portfolio="${S.uuid}"
                id="${Pn}"
                role="region"
                aria-label="Positionen für ${S.name}">
      <td colspan="${r.length.toString()}">
        <div class="positions-container">${Ve ? Nt(S.uuid) ? Ge(Pr(S.uuid)) : fn("Lade Positionen...") : ""}</div>
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
  }).filter((S) => typeof S == "number" && Number.isFinite(S)), l = s.reduce((S, D) => S + D, 0), f = a.reduce((S, D) => {
    if (typeof D.performance?.gain_abs == "number" && Number.isFinite(D.performance.gain_abs))
      return S + D.performance.gain_abs;
    const L = typeof D.current_value == "number" && Number.isFinite(D.current_value) ? D.current_value : 0, j = typeof D.purchase_sum == "number" && Number.isFinite(D.purchase_sum) ? D.purchase_sum : 0;
    return S + (L - j);
  }, 0), d = a.length > 0, p = a.length !== e.length, u = s.length > 0, g = u && d && o !== 0 ? (() => {
    const S = o - l;
    return S ? l / S * 100 : null;
  })() : null, y = d && c > 0 ? f / c * 100 : null, h = {
    fx_unavailable: p,
    purchase_value: d ? c : null,
    current_value: d ? o : null,
    day_change_abs: u ? l : null,
    day_change_pct: u ? g : null,
    gain_abs: d ? f : null,
    gain_pct: d ? y : null
  }, m = { hasValue: d }, _ = { hasValue: u }, b = M("purchase_value", h.purchase_value, h, m), v = M("current_value", h.current_value, h, m), A = M("day_change_abs", h.day_change_abs, h, _), C = M("day_change_pct", h.day_change_pct, h, _), P = M("gain_abs", h.gain_abs, h, m), N = M("gain_pct", h.gain_pct, h, m);
  let F = "";
  if (d && typeof y == "number" && Number.isFinite(y)) {
    const S = `${ae(y)} %`, D = y > 0 ? "positive" : y < 0 ? "negative" : "neutral";
    F = ` data-gain-pct="${t(S)}" data-gain-sign="${t(D)}"`;
  }
  p && (F += ' data-partial="true"');
  const I = String(Math.round(i)), w = d ? String(o) : "", x = d ? String(c) : "", U = u ? String(l) : "", E = u && typeof g == "number" && Number.isFinite(g) ? String(g) : "", T = d ? String(f) : "", K = d && typeof y == "number" && Number.isFinite(y) ? String(y) : "";
  return n += `<tr class="footer-row"
      data-position-count="${I}"
      data-current-value="${t(w)}"
      data-purchase-sum="${t(x)}"
      data-day-change="${t(U)}"
      data-day-change-pct="${t(E)}"
      data-gain-abs="${t(T)}"
      data-gain-pct="${t(K)}"
      data-has-value="${d ? "true" : "false"}"
      data-fx-unavailable="${p ? "true" : "false"}">
      <td>Summe</td>
      <td class="align-right">${Math.round(i).toLocaleString("de-DE")}</td>
    <td class="align-right">${b}</td>
    <td class="align-right">${v}</td>
    <td class="align-right">${A}</td>
    <td class="align-right">${C}</td>
    <td class="align-right"${F}>${P}</td>
    <td class="align-right gain-pct-cell">${N}</td>
  </tr>`, n += "</tbody></table>", n;
}
function wo(e) {
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
  const t = wo(e);
  if (!t)
    return;
  const n = t.tBodies.item(0);
  if (!n)
    return;
  const r = Array.from(n.querySelectorAll("tr.portfolio-row"));
  if (!r.length)
    return;
  let a = 0, i = 0, o = 0, c = 0, s = 0, l = !1, f = !1, d = !0, p = !1;
  for (const L of r) {
    const j = qe(L.dataset.positionCount);
    j != null && (a += j), L.dataset.fxUnavailable === "true" && (p = !0);
    const $ = L.dataset.hasValue;
    if (!!($ === "false" || $ === "0" || $ === "" || $ == null)) {
      d = !1;
      continue;
    }
    l = !0;
    const B = qe(L.dataset.currentValue), Y = qe(L.dataset.gainAbs), X = qe(L.dataset.purchaseSum), G = qe(L.dataset.dayChange);
    if (B == null || Y == null || X == null) {
      d = !1;
      continue;
    }
    i += B, c += Y, o += X, G != null && (s += G, f = !0);
  }
  const u = l && d, g = u && o > 0 ? c / o * 100 : null, y = f && u && i !== 0 ? (() => {
    const L = i - s;
    return L ? s / L * 100 : null;
  })() : null;
  let h = Array.from(n.children).find(
    (L) => L instanceof HTMLTableRowElement && L.classList.contains("footer-row")
  );
  h || (h = document.createElement("tr"), h.classList.add("footer-row"), n.appendChild(h));
  const m = Math.round(a).toLocaleString("de-DE"), _ = {
    fx_unavailable: p || !u,
    purchase_value: u ? o : null,
    current_value: u ? i : null,
    day_change_abs: f && u ? s : null,
    day_change_pct: f && u ? y : null,
    gain_abs: u ? c : null,
    gain_pct: u ? g : null
  }, b = { hasValue: u }, v = { hasValue: f && u }, A = M("purchase_value", _.purchase_value, _, b), C = M("current_value", _.current_value, _, b), P = M("day_change_abs", _.day_change_abs, _, v), N = M("day_change_pct", _.day_change_pct, _, v), F = M("gain_abs", _.gain_abs, _, b), I = M("gain_pct", _.gain_pct, _, b), w = t.tHead ? t.tHead.rows.item(0) : null, x = w ? w.cells.length : 0, U = h.cells.length, E = x || U, T = E > 0 ? E <= 5 : !1, K = u && typeof g == "number" ? `${ae(g)} %` : "", S = u && typeof g == "number" ? g > 0 ? "positive" : g < 0 ? "negative" : "neutral" : "neutral";
  T ? h.innerHTML = `
      <td>Summe</td>
      <td class="align-right">${m}</td>
      <td class="align-right">${C}</td>
      <td class="align-right">${F}</td>
      <td class="align-right gain-pct-cell">${I}</td>
    ` : h.innerHTML = `
      <td>Summe</td>
      <td class="align-right">${m}</td>
      <td class="align-right">${A}</td>
      <td class="align-right">${C}</td>
      <td class="align-right">${P}</td>
      <td class="align-right">${N}</td>
      <td class="align-right">${F}</td>
      <td class="align-right">${I}</td>
    `;
  const D = h.cells.item(T ? 3 : 6);
  D && (D.dataset.gainPct = K || "—", D.dataset.gainSign = S), h.dataset.positionCount = String(Math.round(a)), h.dataset.currentValue = u ? String(i) : "", h.dataset.purchaseSum = u ? String(o) : "", h.dataset.dayChange = u && f ? String(s) : "", h.dataset.dayChangePct = u && f && typeof y == "number" ? String(y) : "", h.dataset.gainAbs = u ? String(c) : "", h.dataset.gainPct = u && typeof g == "number" ? String(g) : "", h.dataset.hasValue = u ? "true" : "false", h.dataset.fxUnavailable = p ? "true" : "false";
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
    const y = a.querySelector("tbody");
    if (!y) return;
    const h = Array.from(y.querySelectorAll("tr")).filter((v) => !v.classList.contains("footer-row")), m = y.querySelector("tr.footer-row"), _ = (v) => {
      if (v == null) return 0;
      const A = v.replace(/\u00A0/g, " ").replace(/[%€]/g, "").replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, ""), C = Number.parseFloat(A);
      return Number.isFinite(C) ? C : 0;
    };
    h.sort((v, A) => {
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
      }[u], N = v.cells.item(P), F = A.cells.item(P);
      let I = "";
      if (N) {
        const E = N.textContent;
        typeof E == "string" && (I = E.trim());
      }
      let w = "";
      if (F) {
        const E = F.textContent;
        typeof E == "string" && (w = E.trim());
      }
      const x = (E, T) => {
        const K = E ? E.dataset.sortValue : void 0;
        if (K != null && K !== "") {
          const S = Number(K);
          if (Number.isFinite(S))
            return S;
        }
        return _(T);
      };
      let U;
      if (u === "name")
        U = I.localeCompare(w, "de", { sensitivity: "base" });
      else {
        const E = x(N, I), T = x(F, w);
        U = E - T;
      }
      return g === "asc" ? U : -U;
    }), a.querySelectorAll("thead th.sort-active").forEach((v) => {
      v.classList.remove("sort-active", "dir-asc", "dir-desc");
    }), a.querySelectorAll("thead th[aria-sort]").forEach((v) => {
      v.setAttribute("aria-sort", "none");
    });
    const b = a.querySelector(`thead th[data-sort-key="${u}"]`);
    b && (b.classList.add("sort-active", g === "asc" ? "dir-asc" : "dir-desc"), b.setAttribute("aria-sort", g === "asc" ? "ascending" : "descending")), h.forEach((v) => y.appendChild(v)), m && y.appendChild(m);
  }, o = r.dataset.sortKey, c = r.dataset.sortDir, s = a.dataset.defaultSort, l = a.dataset.defaultDir, f = Rt(o) ? o : Rt(s) ? s : "name", d = Lt(c) ? c : Lt(l) ? l : "asc";
  i(f, d);
  const p = (u) => {
    const g = u.target;
    if (!(g instanceof Element))
      return;
    const y = g.closest("th[data-sort-key]");
    if (!y || !a.contains(y)) return;
    const h = y.getAttribute("data-sort-key");
    if (!Rt(h))
      return;
    let m = "asc";
    r.dataset.sortKey === h && (m = (Lt(r.dataset.sortDir) ? r.dataset.sortDir : "asc") === "asc" ? "desc" : "asc"), r.dataset.sortKey = h, r.dataset.sortDir = m, i(h, m);
  };
  a.addEventListener("click", (u) => {
    p(u);
  }), a.addEventListener("keydown", (u) => {
    (u.key === "Enter" || u.key === " ") && (u.preventDefault(), p(u));
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
    r.innerHTML = fn("Neu laden...");
    try {
      const i = await un(
        dt,
        ft,
        e
      );
      if (i.error) {
        const c = typeof i.error == "string" ? i.error : String(i.error);
        r.innerHTML = `<div class="error">${k(c)} <button class="retry-pos" data-portfolio="${e}">Erneut laden</button></div>`;
        return;
      }
      const o = xt(
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
      r.innerHTML = `<div class="error">Fehler: ${k(o)} <button class="retry-pos" data-portfolio="${e}">Retry</button></div>`;
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
function bn(e) {
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
                const y = e.querySelector(
                  `.portfolio-details[data-portfolio="${u}"]`
                )?.querySelector(".positions-container");
                await Ao(u, y ?? null, e);
              }
              return;
            }
            const s = o.closest(".portfolio-toggle");
            if (!s || !r.contains(s)) return;
            const l = s.getAttribute("data-portfolio");
            if (!l) return;
            const f = e.querySelector(
              `.portfolio-details[data-portfolio="${l}"]`
            );
            if (!f) return;
            const d = s.querySelector(".caret");
            if (f.classList.contains("hidden")) {
              f.classList.remove("hidden"), s.classList.add("expanded"), s.setAttribute("aria-expanded", "true"), d && (d.textContent = "▼"), pt.add(l);
              try {
                yn(e, l);
              } catch (u) {
                console.warn("attachPortfolioToggleHandler: Pending-Flush fehlgeschlagen:", u);
              }
              if (Nt(l)) {
                const u = f.querySelector(".positions-container");
                if (u) {
                  u.innerHTML = Ge(
                    Pr(l)
                  ), Ze(e, l);
                  try {
                    Xe(e, l);
                  } catch (g) {
                    console.warn("attachPortfolioToggleHandler: Security-Listener (Cache) Fehler:", g);
                  }
                }
              } else {
                const u = f.querySelector(".positions-container");
                u && (u.innerHTML = fn("Lade Positionen..."));
                try {
                  const g = await un(
                    dt,
                    ft,
                    l
                  );
                  if (g.error) {
                    const h = typeof g.error == "string" ? g.error : String(g.error);
                    u && (u.innerHTML = `<div class="error">${k(h)} <button class="retry-pos" data-portfolio="${l}">Erneut laden</button></div>`);
                    return;
                  }
                  const y = xt(
                    Array.isArray(g.positions) ? g.positions : []
                  );
                  if (ct(l, y), lt(
                    l,
                    y
                  ), u) {
                    u.innerHTML = Ge(y);
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
                  const y = g instanceof Error ? g.message : String(g), h = f.querySelector(".positions-container");
                  h && (h.innerHTML = `<div class="error">Fehler beim Laden: ${k(y)} <button class="retry-pos" data-portfolio="${l}">Retry</button></div>`), console.error("Fehler beim Lazy Load für", l, g);
                }
              }
            } else
              f.classList.add("hidden"), s.classList.remove("expanded"), s.setAttribute("aria-expanded", "false"), d && (d.textContent = "▶"), pt.delete(l);
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
function Po(e) {
  const t = e.querySelector(".expandable-portfolio-table");
  t && (t.__ppReaderPortfolioFallbackBound || (t.__ppReaderPortfolioFallbackBound = !0, t.addEventListener("click", (n) => {
    const r = n.target;
    !(r instanceof Element) || !r.closest(".portfolio-toggle") || e.querySelector(".portfolio-table")?.__ppReaderPortfolioToggleBound || (console.debug("Fallback-Listener aktiv – re-attach Hauptlistener"), bn(e));
  })));
}
async function Yr(e, t, n) {
  dt = t ?? null, ft = n ?? null, console.debug(
    "renderDashboard: start – panelConfig:",
    n?.config,
    "derived entry_id?",
    n?.config?._panel_custom?.config?.entry_id
  );
  const r = await oi(t, n);
  xr(r.accounts);
  const a = Rr(), i = await Sr(t, n);
  Fi(i.portfolios);
  const o = Vi();
  let c = "";
  try {
    c = await si(t, n);
  } catch {
    c = "";
  }
  const s = a.reduce(
    (w, x) => w + (typeof x.balance == "number" && Number.isFinite(x.balance) ? x.balance : 0),
    0
  ), l = o.some((w) => w.fx_unavailable), f = a.some((w) => w.fx_unavailable && (w.balance == null || !Number.isFinite(w.balance))), d = o.reduce((w, x) => x.hasValue && typeof x.current_value == "number" && Number.isFinite(x.current_value) ? w + x.current_value : w, 0), p = s + d, u = "Teilw. fehlende FX-Kurse – Gesamtvermögen abweichend", y = o.some((w) => w.hasValue && typeof w.current_value == "number" && Number.isFinite(w.current_value)) || a.some((w) => typeof w.balance == "number" && Number.isFinite(w.balance)) ? `${ae(p)}&nbsp;€` : `<span class="missing-value" role="note" aria-label="${u}" title="${u}">—</span>`, h = l || f ? `<span class="total-wealth-note">${u}</span>` : "", m = `
    <div class="header-meta-row">
      💰 Gesamtvermögen: <strong class="total-wealth-value">${y}</strong>${h}
    </div>
  `, _ = Pt("Übersicht", m), b = Br(o), v = a.filter((w) => (w.currency_code ?? "EUR") === "EUR"), A = a.filter((w) => (w.currency_code ?? "EUR") !== "EUR"), P = A.some((w) => w.fx_unavailable) ? `
        <p class="table-note" role="note">
          <span class="table-note__icon" aria-hidden="true">⚠️</span>
          <span>Wechselkurse konnten nicht geladen werden. EUR-Werte werden derzeit nicht angezeigt.</span>
        </p>
      ` : "", N = `
    <div class="card">
      <h2>Liquidität</h2>
      <div class="scroll-container account-table">
        ${Pe(
    v.map((w) => ({
      name: ut(w.name, Wn(w.badges), {
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
    ${A.length ? `
      <div class="card">
        <h2>Fremdwährungen</h2>
        <div class="scroll-container fx-account-table">
          ${Pe(
    A.map((w) => {
      const x = w.orig_balance, E = typeof x == "number" && Number.isFinite(x) ? `${x.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}&nbsp;${w.currency_code ?? ""}` : "";
      return {
        name: ut(w.name, Wn(w.badges), {
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
  `, F = `
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
    ${F}
  `;
  return Eo(e, o), I;
}
function Eo(e, t) {
  if (!e)
    return;
  const n = () => {
    try {
      const a = e, i = a.querySelector(".portfolio-table");
      i && i.querySelectorAll(".portfolio-toggle").length === 0 && (console.debug("Recovery: Tabelle ohne Buttons – erneuter Aufbau"), i.innerHTML = Br(t)), bn(e), Po(e), pt.forEach((o) => {
        try {
          Nt(o) && (Ze(e, o), Xe(e, o));
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
        ro(e);
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
Qa({
  renderPositionsTable: (e) => vo(e),
  applyGainPctMetadata: Wr,
  attachSecurityDetailListener: Xe,
  attachPortfolioPositionsSorting: Ze,
  updatePortfolioFooter: (e) => {
    e && Or(e);
  }
});
const No = "http://www.w3.org/2000/svg", De = 640, ke = 260, We = { top: 12, right: 16, bottom: 24, left: 16 }, Be = "var(--pp-reader-chart-line, #3f51b5)", jt = "var(--pp-reader-chart-area, rgba(63, 81, 181, 0.12))", jn = "0.75rem", jr = "var(--pp-reader-chart-baseline, rgba(96, 125, 139, 0.75))", Kr = "6 4", xo = 1440 * 60 * 1e3;
function Do(e) {
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
function ko(e) {
  return typeof e == "string" ? e : typeof e == "number" && Number.isFinite(e) ? e.toString() : e instanceof Date && Number.isFinite(e.getTime()) ? e.toISOString() : "";
}
function ee(e) {
  return `${String(e)}px`;
}
function oe(e, t = {}) {
  const n = document.createElementNS(No, e);
  return Object.entries(t).forEach(([r, a]) => {
    const i = Do(a);
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
    const r = t.date, a = ko(r);
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
    margin: { ...We },
    series: [],
    points: [],
    range: null,
    xAccessor: Xr,
    yAccessor: Zr,
    xFormatter: Jr,
    yFormatter: Qr,
    tooltipRenderer: ea,
    markerTooltipRenderer: ta,
    color: Be,
    areaColor: jt,
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
    const s = c === 0 ? "M" : "L", l = o.x.toFixed(2), f = o.y.toFixed(2);
    n.push(`${s}${l} ${f}`);
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
function $o(e) {
  const { baselineLine: t, baseline: n } = e;
  if (!t)
    return;
  const r = n?.color ?? jr, a = n?.dashArray ?? Kr;
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
  const { minY: c, maxY: s, boundedHeight: l } = r, f = Number.isFinite(c) ? c : o, p = (Number.isFinite(s) ? s : f + 1) - f, u = p === 0 ? 0.5 : (o - f) / p, g = re(u, 0, 1), y = Math.max(l, 0), h = a.top + (1 - g) * y, m = Math.max(i - a.left - a.right, 0), _ = a.left, b = a.left + m;
  t.setAttribute("x1", _.toFixed(2)), t.setAttribute("x2", b.toFixed(2)), t.setAttribute("y1", h.toFixed(2)), t.setAttribute("y2", h.toFixed(2)), t.style.opacity = "1";
}
function Ro(e, t, n) {
  const { width: r, height: a, margin: i } = t, { xAccessor: o, yAccessor: c } = n;
  if (e.length === 0)
    return { points: [], range: null };
  const s = e.map((E, T) => {
    const K = o(E, T), S = c(E, T), D = Gr(K, T), L = gt(S, Number.NaN);
    return Number.isFinite(L) ? {
      index: T,
      data: E,
      xValue: D,
      yValue: L
    } : null;
  }).filter((E) => !!E);
  if (s.length === 0)
    return { points: [], range: null };
  const l = s.reduce((E, T) => Math.min(E, T.xValue), s[0].xValue), f = s.reduce((E, T) => Math.max(E, T.xValue), s[0].xValue), d = s.reduce((E, T) => Math.min(E, T.yValue), s[0].yValue), p = s.reduce((E, T) => Math.max(E, T.yValue), s[0].yValue), u = Math.max(r - i.left - i.right, 1), g = Math.max(a - i.top - i.bottom, 1), y = Number.isFinite(l) ? l : 0, h = Number.isFinite(f) ? f : y + 1, m = Number.isFinite(d) ? d : 0, _ = Number.isFinite(p) ? p : m + 1, b = gt(t.baseline?.value, null), v = b != null && Number.isFinite(b) ? Math.min(m, b) : m, A = b != null && Number.isFinite(b) ? Math.max(_, b) : _, C = Math.max(
    2,
    Math.min(
      6,
      Math.round(
        Math.max(a - i.top - i.bottom, 0) / 60
      ) || 4
    )
  ), { niceMin: P, niceMax: N } = Uo(
    v,
    A,
    C
  ), F = Number.isFinite(P) ? P : m, I = Number.isFinite(N) ? N : _, w = h - y || 1, x = I - F || 1;
  return {
    points: s.map((E) => {
      const T = w === 0 ? 0.5 : (E.xValue - y) / w, K = x === 0 ? 0.5 : (E.yValue - F) / x, S = i.left + T * u, D = i.top + (1 - K) * g;
      return {
        ...E,
        x: S,
        y: D
      };
    }),
    range: {
      minX: y,
      maxX: h,
      minY: F,
      maxY: I,
      boundedWidth: u,
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
  const c = a.maxX - a.minX || 1, s = a.maxY - a.minY || 1;
  r.forEach((l, f) => {
    const d = Gr(l.x, f), p = gt(l.y, Number.NaN), u = Number(p);
    if (!Number.isFinite(d) || !Number.isFinite(u))
      return;
    const g = c === 0 ? 0.5 : re((d - a.minX) / c, 0, 1), y = s === 0 ? 0.5 : re((u - a.minY) / s, 0, 1), h = i.left + g * a.boundedWidth, m = i.top + (1 - y) * a.boundedHeight, _ = oe("g", {
      class: "line-chart-marker",
      transform: `translate(${h.toFixed(2)} ${m.toFixed(2)})`,
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
      y: m
    });
  }), o && (o.style.opacity = "0", o.style.visibility = "hidden");
}
function ra(e, t, n, r) {
  e.width = Number.isFinite(t) ? Number(t) : De, e.height = Number.isFinite(n) ? Number(n) : ke, e.margin = {
    top: Number.isFinite(r?.top) ? Number(r?.top) : We.top,
    right: Number.isFinite(r?.right) ? Number(r?.right) : We.right,
    bottom: Number.isFinite(r?.bottom) ? Number(r?.bottom) : We.bottom,
    left: Number.isFinite(r?.left) ? Number(r?.left) : We.left
  };
}
function Lo(e, t) {
  const n = e.xFormatter(t.xValue, t.data, t.index), r = e.yFormatter(t.yValue, t.data, t.index);
  return e.tooltipRenderer({
    point: t,
    xFormatted: n,
    yFormatted: r,
    data: t.data,
    index: t.index
  });
}
function Mo(e, t, n, r = null) {
  const { tooltip: a, width: i, margin: o, height: c } = e;
  if (!a)
    return;
  const s = r && Number.isFinite(r.scaleX) && r.scaleX > 0 ? r.scaleX : 1, l = r && Number.isFinite(r.scaleY) && r.scaleY > 0 ? r.scaleY : 1, f = c - o.bottom;
  a.style.visibility = "visible", a.style.opacity = "1";
  const d = a.offsetWidth || 0, p = a.offsetHeight || 0, u = t.x * s, g = re(
    u - d / 2,
    o.left * s,
    (i - o.right) * s - d
  ), y = Math.max(f * l - p, 0), h = 12, _ = (Number.isFinite(n) ? re(n ?? 0, o.top, f) : t.y) * l;
  let b = _ - p - h;
  b < o.top * l && (b = _ + h), b = re(b, 0, y);
  const v = ee(Math.round(g)), A = ee(Math.round(b));
  a.style.transform = `translate(${v}, ${A})`;
}
function Kt(e) {
  const { tooltip: t, focusLine: n, focusCircle: r } = e;
  t && (t.style.opacity = "0", t.style.visibility = "hidden"), n && (n.style.opacity = "0"), r && (r.style.opacity = "0");
}
function Ho(e, t) {
  const { marker: n } = t, r = e.xFormatter(t.marker.x, n, -1), a = e.yFormatter(t.marker.y, n, -1);
  return e.markerTooltipRenderer({
    marker: n,
    xFormatted: r,
    yFormatted: a
  });
}
function Io(e, t, n, r = null) {
  const { markerTooltip: a, width: i, margin: o, height: c, tooltip: s } = e;
  if (!a)
    return;
  const l = r && Number.isFinite(r.scaleX) && r.scaleX > 0 ? r.scaleX : 1, f = r && Number.isFinite(r.scaleY) && r.scaleY > 0 ? r.scaleY : 1, d = c - o.bottom;
  a.style.visibility = "visible", a.style.opacity = "1";
  const p = a.offsetWidth || 0, u = a.offsetHeight || 0, g = t.x * l, y = re(
    g - p / 2,
    o.left * l,
    (i - o.right) * l - p
  ), h = Math.max(d * f - u, 0), m = 10, _ = s?.getBoundingClientRect(), b = e.svg?.getBoundingClientRect(), v = _ && b ? _.top - b.top : null, A = _ && b ? _.bottom - b.top : null, P = (Number.isFinite(n) ? re(n ?? t.y, o.top, d) : t.y) * f;
  let N;
  v != null && A != null ? v <= P ? N = v - u - m : N = A + m : (N = P - u - m, N < o.top * f && (N = P + m)), N = re(N, 0, h);
  const F = ee(Math.round(y)), I = ee(Math.round(N));
  a.style.transform = `translate(${F}, ${I})`;
}
function it(e) {
  const { markerTooltip: t } = e;
  t && (t.style.opacity = "0", t.style.visibility = "hidden");
}
function zo(e, t, n) {
  let a = null, i = 576;
  for (const o of e.markerPositions) {
    const c = o.x - t, s = o.y - n, l = c * c + s * s;
    l <= i && (a = o, i = l);
  }
  return a;
}
function Vo(e, t) {
  if (t.handlersAttached || !t.overlay)
    return;
  const n = (a) => {
    if (t.points.length === 0 || !t.svg) {
      Kt(t), it(t);
      return;
    }
    const i = t.svg.getBoundingClientRect(), o = t.width || De, c = t.height || ke, s = i.width && Number.isFinite(i.width) && Number.isFinite(o) && o > 0 ? i.width / o : 1, l = i.height && Number.isFinite(i.height) && Number.isFinite(c) && c > 0 ? i.height / c : 1, f = s > 0 ? 1 / s : 1, d = l > 0 ? 1 / l : 1, p = (a.clientX - i.left) * f, u = (a.clientY - i.top) * d, g = {
      scaleX: s,
      scaleY: l
    };
    let y = t.points[0], h = Math.abs(p - y.x);
    for (let _ = 1; _ < t.points.length; _ += 1) {
      const b = t.points[_], v = Math.abs(p - b.x);
      v < h && (h = v, y = b);
    }
    t.focusCircle && (t.focusCircle.setAttribute("cx", y.x.toFixed(2)), t.focusCircle.setAttribute("cy", y.y.toFixed(2)), t.focusCircle.style.opacity = "1"), t.focusLine && (t.focusLine.setAttribute("x1", y.x.toFixed(2)), t.focusLine.setAttribute("x2", y.x.toFixed(2)), t.focusLine.setAttribute("y1", t.margin.top.toFixed(2)), t.focusLine.setAttribute(
      "y2",
      (t.height - t.margin.bottom).toFixed(2)
    ), t.focusLine.style.opacity = "1"), t.tooltip && (t.tooltip.innerHTML = Lo(t, y), Mo(t, y, u, g));
    const m = zo(t, p, u);
    m && t.markerTooltip ? (t.markerTooltip.innerHTML = Ho(t, m), Io(t, m, u, g)) : it(t);
  }, r = () => {
    Kt(t), it(t);
  };
  t.overlay.addEventListener("pointermove", n), t.overlay.addEventListener("pointerenter", n), t.overlay.addEventListener("pointerleave", r), t.handlersAttached = !0, t.handlePointerMove = n, t.handlePointerLeave = r, e.addEventListener("pointercancel", r);
}
function aa(e, t = {}) {
  const n = document.createElement("div");
  n.className = "line-chart-container", n.dataset.chartType = "line", n.style.position = "relative";
  const r = oe("svg", {
    width: De,
    height: ke,
    viewBox: `0 0 ${String(De)} ${String(ke)}`,
    role: "img",
    "aria-hidden": "true",
    focusable: "false"
  });
  r.classList.add("line-chart-svg");
  const a = oe("path", {
    class: "line-chart-area",
    fill: jt,
    stroke: "none"
  }), i = oe("line", {
    class: "line-chart-baseline",
    stroke: jr,
    "stroke-width": 1,
    "stroke-dasharray": Kr,
    opacity: 0
  }), o = oe("path", {
    class: "line-chart-path",
    fill: "none",
    stroke: Be,
    "stroke-width": 2,
    "stroke-linecap": "round",
    "stroke-linejoin": "round"
  }), c = oe("line", {
    class: "line-chart-focus-line",
    stroke: Be,
    "stroke-width": 1,
    "stroke-dasharray": "4 4",
    opacity: 0
  }), s = oe("circle", {
    class: "line-chart-focus-circle",
    r: 4,
    fill: "#fff",
    stroke: Be,
    "stroke-width": 2,
    opacity: 0
  }), l = oe("g", {
    class: "line-chart-markers"
  }), f = oe("rect", {
    class: "line-chart-overlay",
    fill: "transparent",
    x: 0,
    y: 0,
    width: De,
    height: ke
  });
  r.appendChild(a), r.appendChild(i), r.appendChild(o), r.appendChild(c), r.appendChild(s), r.appendChild(l), r.appendChild(f), n.appendChild(r);
  const d = document.createElement("div");
  d.className = "chart-tooltip", d.style.position = "absolute", d.style.top = "0", d.style.left = "0", d.style.pointerEvents = "none", d.style.opacity = "0", d.style.visibility = "hidden", n.appendChild(d);
  const p = document.createElement("div");
  p.className = "line-chart-marker-overlay", p.style.position = "absolute", p.style.top = "0", p.style.left = "0", p.style.width = "100%", p.style.height = "100%", p.style.pointerEvents = "none", p.style.overflow = "visible", p.style.zIndex = "2", n.appendChild(p);
  const u = document.createElement("div");
  u.className = "chart-tooltip chart-tooltip--marker", u.style.position = "absolute", u.style.top = "0", u.style.left = "0", u.style.pointerEvents = "none", u.style.opacity = "0", u.style.visibility = "hidden", n.appendChild(u), e.appendChild(n);
  const g = na(n);
  if (g.svg = r, g.areaPath = a, g.linePath = o, g.baselineLine = i, g.focusLine = c, g.focusCircle = s, g.overlay = f, g.tooltip = d, g.markerOverlay = p, g.markerLayer = l, g.markerTooltip = u, g.xAccessor = t.xAccessor ?? Xr, g.yAccessor = t.yAccessor ?? Zr, g.xFormatter = t.xFormatter ?? Jr, g.yFormatter = t.yFormatter ?? Qr, g.tooltipRenderer = t.tooltipRenderer ?? ea, g.markerTooltipRenderer = t.markerTooltipRenderer ?? ta, g.color = t.color ?? Be, g.areaColor = t.areaColor ?? jt, g.baseline = t.baseline ?? null, g.handlersAttached = !1, g.markers = Array.isArray(t.markers) ? t.markers.slice() : [], !g.xAxis) {
    const y = document.createElement("div");
    y.className = "line-chart-axis line-chart-axis-x", y.style.position = "absolute", y.style.left = "0", y.style.right = "0", y.style.bottom = "0", y.style.pointerEvents = "none", y.style.fontSize = jn, y.style.color = "var(--secondary-text-color)", y.style.display = "block", n.appendChild(y), g.xAxis = y;
  }
  if (!g.yAxis) {
    const y = document.createElement("div");
    y.className = "line-chart-axis line-chart-axis-y", y.style.position = "absolute", y.style.top = "0", y.style.bottom = "0", y.style.left = "0", y.style.pointerEvents = "none", y.style.fontSize = jn, y.style.color = "var(--secondary-text-color)", y.style.display = "block", n.appendChild(y), g.yAxis = y;
  }
  return ra(g, t.width, t.height, t.margin), o.setAttribute("stroke", g.color), c.setAttribute("stroke", g.color), s.setAttribute("stroke", g.color), a.setAttribute("fill", g.areaColor), _n(n, t), Vo(n, g), n;
}
function _n(e, t = {}) {
  if (!e) {
    console.error("updateLineChart: container element is required");
    return;
  }
  const n = na(e);
  if (!n.svg || !n.linePath || !n.overlay) {
    console.error("updateLineChart: chart was not initialised with renderLineChart");
    return;
  }
  t.xAccessor && (n.xAccessor = t.xAccessor), t.yAccessor && (n.yAccessor = t.yAccessor), t.xFormatter && (n.xFormatter = t.xFormatter), t.yFormatter && (n.yFormatter = t.yFormatter), t.tooltipRenderer && (n.tooltipRenderer = t.tooltipRenderer), t.markerTooltipRenderer && (n.markerTooltipRenderer = t.markerTooltipRenderer), t.color && (n.color = t.color, n.linePath.setAttribute("stroke", n.color), n.focusLine && n.focusLine.setAttribute("stroke", n.color), n.focusCircle && n.focusCircle.setAttribute("stroke", n.color)), t.areaColor && (n.areaColor = t.areaColor, n.areaPath && n.areaPath.setAttribute("fill", n.areaColor)), Object.prototype.hasOwnProperty.call(t, "baseline") && (n.baseline = t.baseline ?? null), Array.isArray(t.markers) && (n.markers = t.markers.slice()), $o(n), ra(n, t.width, t.height, t.margin);
  const { width: r, height: a } = n;
  n.svg.setAttribute("width", String(r)), n.svg.setAttribute("height", String(a)), n.svg.setAttribute("viewBox", `0 0 ${String(r)} ${String(a)}`), n.overlay.setAttribute("x", "0"), n.overlay.setAttribute("y", "0"), n.overlay.setAttribute("width", Math.max(r, 0).toFixed(2)), n.overlay.setAttribute("height", Math.max(a, 0).toFixed(2)), Array.isArray(t.series) && (n.series = Array.from(t.series));
  const { points: i, range: o } = Ro(n.series, n, {
    xAccessor: n.xAccessor,
    yAccessor: n.yAccessor
  });
  if (n.points = i, n.range = o, i.length === 0) {
    n.linePath.setAttribute("d", ""), n.areaPath && n.areaPath.setAttribute("d", ""), Kt(n), Ht(n), It(n), Mt(n);
    return;
  }
  if (i.length === 1) {
    const s = i[0], l = Math.max(
      0.5,
      Math.min(4, Math.max(n.width - n.margin.left - n.margin.right, 1) * 0.01)
    ), f = `M${s.x.toFixed(2)} ${s.y.toFixed(2)} h${l.toFixed(2)}`;
    n.linePath.setAttribute("d", f), n.areaPath && n.areaPath.setAttribute("d", ""), n.focusCircle && (n.focusCircle.setAttribute("cx", s.x.toFixed(2)), n.focusCircle.setAttribute("cy", s.y.toFixed(2)), n.focusCircle.style.opacity = "1"), n.focusLine && (n.focusLine.style.opacity = "0"), It(n), Mt(n), Ht(n);
    return;
  }
  const c = To(i);
  if (n.linePath.setAttribute("d", c), n.areaPath && o) {
    const s = n.margin.top + o.boundedHeight, l = Fo(i, s);
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
  const { minX: c, maxX: s, minY: l, maxY: f, boundedWidth: d, boundedHeight: p } = r, u = Number.isFinite(c) && Number.isFinite(s) && s >= c, g = Number.isFinite(l) && Number.isFinite(f) && f >= l, y = Math.max(d, 0), h = Math.max(p, 0);
  if (t.style.left = ee(a.left), t.style.width = ee(y), t.style.top = ee(i - a.bottom + 6), t.innerHTML = "", u && y > 0) {
    const _ = (s - c) / xo, b = Math.max(2, Math.min(6, Math.round(y / 140) || 4));
    qo(e, c, s, b, _).forEach(({ positionRatio: A, label: C }) => {
      const P = document.createElement("div");
      P.className = "line-chart-axis-tick line-chart-axis-tick-x", P.style.position = "absolute", P.style.bottom = "0";
      const N = re(A, 0, 1);
      P.style.left = ee(N * y);
      let F = "-50%", I = "center";
      N <= 1e-3 ? (F = "0", I = "left", P.style.marginLeft = "2px") : N >= 0.999 && (F = "-100%", I = "right", P.style.marginRight = "2px"), P.style.transform = `translateX(${F})`, P.style.textAlign = I, P.textContent = C, t.appendChild(P);
    });
  }
  n.style.top = ee(a.top), n.style.height = ee(h);
  const m = Math.max(a.left - 6, 0);
  if (n.style.left = "0", n.style.width = ee(Math.max(m, 0)), n.innerHTML = "", g && h > 0) {
    const _ = Math.max(2, Math.min(6, Math.round(h / 60) || 4)), b = Wo(l, f, _), v = o;
    b.forEach(({ value: A, positionRatio: C }) => {
      const P = document.createElement("div");
      P.className = "line-chart-axis-tick line-chart-axis-tick-y", P.style.position = "absolute", P.style.left = "0";
      const F = (1 - re(C, 0, 1)) * h;
      P.style.top = ee(F), P.textContent = v(A, null, -1), n.appendChild(P);
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
    const l = Gt(Math.abs(e) || 1);
    return {
      niceMin: e - l,
      niceMax: t + l
    };
  }
  const i = (t - e) / (r - 1), o = Gt(i), c = Math.floor(e / o) * o, s = Math.ceil(t / o) * o;
  return c === s ? {
    niceMin: e,
    niceMax: t + o
  } : {
    niceMin: c,
    niceMax: s
  };
}
function qo(e, t, n, r, a) {
  if (!Number.isFinite(t) || !Number.isFinite(n) || n < t)
    return [];
  if (!Number.isFinite(a) || a <= 0)
    return [
      {
        positionRatio: 0.5,
        label: Kn(e, t, a || 0)
      }
    ];
  const i = Math.max(2, r), o = [], c = n - t;
  for (let s = 0; s < i; s += 1) {
    const l = i === 1 ? 0.5 : s / (i - 1), f = t + l * c;
    o.push({
      positionRatio: l,
      label: Kn(e, f, a)
    });
  }
  return o;
}
function Kn(e, t, n) {
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
function Wo(e, t, n) {
  if (!Number.isFinite(e) || !Number.isFinite(t))
    return [];
  if (t === e)
    return [
      {
        value: e,
        positionRatio: 0.5
      }
    ];
  const r = t - e, a = Math.max(2, n), i = r / (a - 1), o = Gt(i), c = Math.floor(e / o) * o, s = Math.ceil(t / o) * o, l = [];
  for (let f = c; f <= s + o / 2; f += o) {
    const d = (f - e) / (t - e);
    l.push({
      value: f,
      positionRatio: re(d, 0, 1)
    });
  }
  return l.length > a + 2 ? l.filter((f, d) => d % 2 === 0) : l;
}
function Gt(e) {
  if (!Number.isFinite(e) || e === 0)
    return 1;
  const t = Math.floor(Math.log10(Math.abs(e))), n = Math.abs(e) / 10 ** t;
  let r;
  return n <= 1 ? r = 1 : n <= 2 ? r = 2 : n <= 5 ? r = 5 : r = 10, r * 10 ** t;
}
function Bo(e) {
  return Array.isArray(e) && e.every((t) => typeof t == "string");
}
function Oo(e) {
  return typeof e == "object" && e !== null;
}
function Yo(e) {
  if (!Oo(e))
    return !1;
  const t = e;
  return typeof t.portfolioUuid != "string" ? !1 : Bo(t.securityUuids);
}
function jo(e) {
  return e instanceof CustomEvent ? Yo(e.detail) : !1;
}
const zt = { min: 0, max: 6 }, ht = { min: 2, max: 4 }, Ko = "1Y", ia = [
  "1M",
  "6M",
  "1Y",
  "5Y",
  "ALL"
], Go = {
  "1M": 30,
  "6M": 182,
  "1Y": 365,
  "5Y": 1826,
  ALL: Number.POSITIVE_INFINITY
}, Xo = /* @__PURE__ */ new Set([0, 2]), Zo = /* @__PURE__ */ new Set([1, 3]), Jo = "var(--pp-reader-chart-marker-buy, #2e7d32)", Qo = "var(--pp-reader-chart-marker-sell, #c0392b)", Gn = "{TICKER}", es = "https://chatgpt.com/", Vt = {
  aggregation: "Aggregationsdaten",
  totals: "Kaufsummen",
  eur_total: "EUR-Kaufsumme"
}, Fe = /* @__PURE__ */ new Map(), ot = /* @__PURE__ */ new Map(), Je = /* @__PURE__ */ new Map(), Te = /* @__PURE__ */ new Map(), oa = "pp-reader:portfolio-positions-updated", Ye = /* @__PURE__ */ new Map();
function ts(e) {
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
function ns(e, t) {
  if (e) {
    if (t) {
      Je.set(e, t);
      return;
    }
    Je.delete(e);
  }
}
function rs(e) {
  if (!e || typeof window > "u")
    return null;
  if (Je.has(e)) {
    const t = Je.get(e) || null;
    if (t)
      return t;
  }
  return null;
}
function sa(e) {
  return Fe.has(e) || Fe.set(e, /* @__PURE__ */ new Map()), Fe.get(e);
}
function ca(e) {
  return Te.has(e) || Te.set(e, /* @__PURE__ */ new Map()), Te.get(e);
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
    if (Te.has(e)) {
      try {
        Te.get(e)?.clear();
      } catch (t) {
        console.warn("invalidateHistoryCache: Konnte Marker-Cache nicht leeren", e, t);
      }
      Te.delete(e);
    }
  }
}
function ua(e) {
  e && Je.delete(e);
}
function as(e, t) {
  if (!e || !t)
    return;
  const n = t.securityUuids;
  (Array.isArray(n) ? n : []).includes(e) && (la(e), ua(e));
}
function is(e) {
  if (!e || Ye.has(e))
    return;
  const t = (n) => {
    jo(n) && as(e, n.detail);
  };
  try {
    window.addEventListener(oa, t), Ye.set(e, t);
  } catch (n) {
    console.error("ensureLiveUpdateSubscription: Registrierung fehlgeschlagen", n);
  }
}
function os(e) {
  if (!e || !Ye.has(e))
    return;
  const t = Ye.get(e);
  try {
    t && window.removeEventListener(oa, t);
  } catch (n) {
    console.error("removeLiveUpdateSubscription: Entfernen des Listeners fehlgeschlagen", n);
  }
  Ye.delete(e);
}
function ss(e) {
  e && (os(e), la(e), ua(e));
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
  return ot.get(e)?.activeRange ?? Ko;
}
function Xt(e) {
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
function Zn(e) {
  return !(e instanceof Date) || Number.isNaN(e.getTime()) ? null : Xt(Le(e));
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
function Ee(e) {
  const t = fa(e);
  return t ? t.toUpperCase() : null;
}
function cs(e) {
  if (!e)
    return null;
  const t = pn(e.aggregation), n = H(t?.purchase_total_security) ?? (t ? H(
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
  const n = Le(t instanceof Date ? t : /* @__PURE__ */ new Date()), r = Go[e], a = Zn(n), i = {};
  if (a != null && (i.end_date = a), Number.isFinite(r) && r > 0) {
    const o = new Date(n.getTime());
    o.setUTCDate(o.getUTCDate() - (r - 1));
    const c = Zn(o);
    c != null && (i.start_date = c);
  }
  return i;
}
function vn(e) {
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
function ls(e) {
  const t = vn(e);
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
function Zt(e) {
  return Array.isArray(e) ? e.map((t) => {
    let r = H(t.close);
    if (r == null) {
      const i = H(t.close_raw);
      i != null && (r = i / 1e8);
    }
    return r == null ? null : {
      date: vn(t.date) ?? t.date,
      close: r
    };
  }).filter((t) => !!t) : [];
}
function bt(e, t, n = null) {
  if (!Array.isArray(e))
    return [];
  const r = [], a = Ee(t), i = a || "EUR", o = cs(n);
  return e.forEach((c, s) => {
    const l = typeof c.type == "number" ? c.type : Number(c.type), f = Xo.has(l), d = Zo.has(l);
    if (!f && !d)
      return;
    const p = ls(c.date);
    let u = H(c.price);
    if (!p || u == null)
      return;
    const g = Ee(c.currency_code), y = a ?? g ?? i;
    g && a && g !== a && se(o) && (u *= o);
    const h = H(c.shares), m = H(c.net_price_eur), _ = f ? "Kauf" : "Verkauf", b = h != null ? `${An(h)} @ ` : "", v = `${_} ${b}${me(u)} ${y}`, A = d && m != null ? `${v} (netto ${me(m)} EUR)` : v, C = f ? Jo : Qo, P = typeof c.uuid == "string" && c.uuid.trim() || `${_}-${p.getTime().toString()}-${s.toString()}`;
    r.push({
      id: P,
      x: p.getTime(),
      y: u,
      color: C,
      label: A,
      payload: {
        type: _,
        currency: y,
        transactionCurrency: g,
        shares: h,
        price: u,
        netPriceEur: m,
        date: p.toISOString(),
        portfolio: c.portfolio
      }
    });
  }), r;
}
function Sn(e) {
  const t = H(e?.last_price_native) ?? H(e?.last_price?.native) ?? null;
  if (R(t))
    return t;
  if (Ee(e?.currency_code) === "EUR") {
    const r = H(e?.last_price_eur);
    if (R(r))
      return r;
  }
  return null;
}
function us(e) {
  if (!e)
    return null;
  const n = e.last_price_fetched_at, r = yt(n);
  if (r != null)
    return r;
  const i = e.last_price?.fetched_at;
  return yt(i) ?? null;
}
function Jt(e, t) {
  let n = [];
  Array.isArray(e) && (n = e.map((l) => ({
    ...l
  })));
  const r = n.slice(), a = Sn(t);
  if (!R(a))
    return r;
  const i = us(t) ?? Date.now(), o = new Date(i);
  if (Number.isNaN(o.getTime()))
    return r;
  const c = Xt(Le(o));
  let s = null;
  for (let l = r.length - 1; l >= 0; l -= 1) {
    const f = r[l], d = vn(f.date);
    if (!d)
      continue;
    const p = Xt(Le(d));
    if (s == null && (s = p), p === c)
      return f.close !== a && (r[l] = { ...f, close: a }), r;
    if (p < c)
      break;
  }
  return s != null && s > c || r.push({
    date: o,
    close: a
  }), r;
}
function R(e) {
  return typeof e == "number" && Number.isFinite(e);
}
function se(e) {
  return typeof e == "number" && Number.isFinite(e) && e > 0;
}
function je(e, t, n) {
  if (!R(e) || !R(t))
    return !1;
  const r = Math.abs(e - t), a = Math.max(Math.abs(e), Math.abs(t), 1);
  return r <= a * 1e-4;
}
function ds(e, t) {
  return !R(t) || t === 0 || !R(e) ? null : bi((e - t) / t * 100);
}
function ga(e, t) {
  if (e.length === 0)
    return { priceChange: null, priceChangePct: null };
  const n = e[0], r = H(n.close);
  if (!R(r) || r === 0)
    return { priceChange: null, priceChangePct: null };
  const a = e[e.length - 1], i = H(a.close), o = H(t) ?? i;
  if (!R(o))
    return { priceChange: null, priceChangePct: null };
  const c = o - r, s = Object.is(c, -0) ? 0 : c, l = ds(o, r);
  return { priceChange: s, priceChangePct: l };
}
function wn(e, t) {
  if (!R(e) || e === 0)
    return "neutral";
  const n = 0.5 / Math.pow(10, t);
  return Math.abs(e) < n ? "neutral" : e > 0 ? "positive" : "negative";
}
function fs(e, t) {
  if (!R(e))
    return '<span class="value neutral">—</span>';
  const n = me(e);
  if (n === "—")
    return '<span class="value neutral">—</span>';
  const r = wn(e, ht.max), a = t ? `&nbsp;${k(t)}` : "";
  return `<span class="value ${r}">${n}${a}</span>`;
}
function ps(e) {
  return R(e) ? `<span class="value ${wn(e, 2)} value--percentage">${ae(e)}&nbsp;%</span>` : '<span class="value neutral">—</span>';
}
function ha(e, t, n, r) {
  const a = e, i = a.length > 0 ? a : "Zeitraum";
  return `
    <div class="security-info-bar" data-range="${he(a)}">
      <div class="security-info-item">
        <span class="label">Preisänderung (${k(i)})</span>
        <div class="value-row">
          ${fs(t, r)}
          ${ps(n)}
        </div>
      </div>
    </div>
  `;
}
function gs(e) {
  return `
    <div class="security-range-selector" role="group" aria-label="Zeitraum">
      ${ia.map((n) => `
      <button
        type="button"
        class="security-range-button${n === e ? " active" : ""}"
        data-range="${he(n)}"
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
  const n = he(e);
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
function An(e) {
  const t = H(e);
  if (t == null)
    return "—";
  const n = Math.abs(t % 1) > 0, r = n ? 2 : zt.min, a = n ? zt.max : zt.min;
  return t.toLocaleString("de-DE", {
    minimumFractionDigits: r,
    maximumFractionDigits: a
  });
}
function me(e) {
  const t = H(e);
  return t == null ? "—" : t.toLocaleString("de-DE", {
    minimumFractionDigits: ht.min,
    maximumFractionDigits: ht.max
  });
}
function hs(e, t) {
  const n = me(e), r = `&nbsp;${k(t)}`;
  return `<span class="${wn(e, ht.max)}">${n}${r}</span>`;
}
function ms(e, t) {
  const n = e?.ticker_symbol;
  if (typeof n == "string" && n.trim())
    return n.trim();
  const r = typeof e?.name == "string" ? e.name.trim() : "";
  return r || (typeof t == "string" ? t : "");
}
function ys(e) {
  return `
    <div class="news-prompt-container">
      <button
        type="button"
        class="news-prompt-button"
        data-symbol="${he(e)}"
      >
        Copy prompt &amp; open ChatGPT
      </button>
    </div>
  `;
}
async function bs(e) {
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
function _s(e) {
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
function vs(e, t, n) {
  const r = He(e?.average_cost), a = r?.account ?? (R(t) ? t : H(t));
  if (!R(a))
    return null;
  const i = e?.account_currency_code ?? e?.account_currency;
  if (typeof i == "string" && i.trim())
    return i.trim().toUpperCase();
  const o = Ee(e?.currency_code) ?? "", c = r?.security ?? r?.native ?? (R(n) ? n : H(n)), s = pn(e?.aggregation);
  if (o && R(c) && je(a, c))
    return o;
  const l = H(s?.purchase_total_security) ?? H(e?.purchase_total_security), f = H(s?.purchase_total_account) ?? H(e?.purchase_total_account);
  let d = null;
  if (R(l) && l !== 0 && R(f) && (d = f / l), r?.source === "eur_total")
    return "EUR";
  const u = r?.eur;
  if (R(u) && je(a, u))
    return "EUR";
  const g = H(e?.purchase_value_eur);
  return R(g) ? "EUR" : d != null && je(d, 1) ? o || null : o === "EUR" ? "EUR" : o || "EUR";
}
function Jn(e) {
  return typeof e != "number" || !Number.isFinite(e) || e <= 0 ? null : e.toLocaleString("de-DE", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
  });
}
function Ss(e) {
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
function ws(e) {
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
  const n = Ee(e.currency_code) ?? "", r = He(e.average_cost);
  if (!r || !n)
    return null;
  const a = r.native ?? r.security ?? null;
  let o = r.account ?? r.eur ?? null, c = Ee(t) ?? "";
  if (se(r.eur) && (!c || c === n) && (o = r.eur, c = "EUR"), !n || !c || n === c || !se(a) || !se(o))
    return null;
  const s = o / a;
  if (!Number.isFinite(s) || s <= 0)
    return null;
  const l = Jn(s);
  if (!l)
    return null;
  let f = null;
  if (s > 0) {
    const _ = 1 / s;
    Number.isFinite(_) && _ > 0 && (f = Jn(_));
  }
  const d = Ss(e), p = ws(d), u = [`FX-Kurs (Kauf): 1 ${n} = ${l} ${c}`];
  f && u.push(`1 ${c} = ${f} ${n}`);
  const g = [], y = r.source, h = y in Vt ? Vt[y] : Vt.aggregation;
  if (g.push(`Quelle: ${h}`), R(r.coverage_ratio)) {
    const _ = Math.min(Math.max(r.coverage_ratio * 100, 0), 100);
    g.push(
      `Abdeckung: ${_.toLocaleString("de-DE", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      })}%`
    );
  }
  g.length && u.push(...g);
  const m = p ?? "Datum unbekannt";
  return `${u.join(" · ")} (Stand: ${m})`;
}
function Qn(e) {
  if (!e)
    return null;
  const t = He(e.average_cost), n = t?.native ?? t?.security ?? null;
  return R(n) ? n : null;
}
function Cs(e) {
  if (!e)
    return '<div class="meta-error">Keine Snapshot-Daten verfügbar.</div>';
  const t = e.currency_code || "EUR", n = e.total_holdings_precise ?? e.total_holdings, r = An(n), a = e.last_price_native ?? e.last_price?.native ?? e.last_price_eur, i = me(a), o = i === "—" ? null : `${i}${`&nbsp;${k(t)}`}`, c = H(e.market_value_eur) ?? H(e.current_value_eur) ?? null, s = He(e.average_cost), l = s?.native ?? s?.security ?? null, f = s?.eur ?? null, p = s?.account ?? null ?? f, u = we(e.performance), g = u?.day_change ?? null, y = g?.price_change_native ?? null, h = g?.price_change_eur ?? null, m = R(y) ? y : h, _ = R(y) ? t : "EUR", b = ($, z = "") => {
    const B = ["value"];
    return z && B.push(...z.split(" ").filter(Boolean)), `<span class="${B.join(" ")}">${$}</span>`;
  }, v = ($ = "") => {
    const z = ["value--missing"];
    return $ && z.push($), b("—", z.join(" "));
  }, A = ($, z = "") => {
    if (!R($))
      return v(z);
    const B = ["value--gain"];
    return z && B.push(z), b(gi($), B.join(" "));
  }, C = ($, z = "") => {
    if (!R($))
      return v(z);
    const B = ["value--gain-percentage"];
    return z && B.push(z), b(hi($), B.join(" "));
  }, P = o ? b(o, "value--price") : v("value--price"), N = r === "—" ? v("value--holdings") : b(r, "value--holdings"), F = R(c) ? b(`${ae(c)}&nbsp;€`, "value--market-value") : v("value--market-value"), I = R(m) ? b(
    hs(m, _),
    "value--gain value--absolute"
  ) : v("value--absolute"), w = C(
    g?.change_pct,
    "value--percentage"
  ), x = A(
    u?.total_change_eur,
    "value--absolute"
  ), U = C(
    u?.total_change_pct,
    "value--percentage"
  ), E = vs(
    e,
    p,
    l
  ), T = As(
    e,
    E
  ), K = T ? ` title="${he(T)}"` : "", S = [], D = R(f);
  R(l) ? S.push(
    b(
      `${me(l)}${`&nbsp;${k(t)}`}`,
      "value--average value--average-native"
    )
  ) : S.push(
    v("value--average value--average-native")
  );
  let L = null, j = null;
  return D && (t !== "EUR" || !R(l) || !je(f, l)) ? (L = f, j = "EUR") : R(p) && E && (E !== t || !je(p, l ?? NaN)) && (L = p, j = E), L != null && R(L) && S.push(
    b(
      `${me(L)}${j ? `&nbsp;${k(j)}` : ""}`,
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
        <div class="value-group">${F}</div>
      </div>
    </div>
  `;
}
function Ps(e) {
  return `
    <div class="card security-meta-card">
      <div id="headerMeta" class="meta">
        ${Cs(e)}
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
function Es(e, t, {
  currency: n,
  baseline: r,
  markers: a
} = {}) {
  const i = e.clientWidth || e.offsetWidth || 0, o = i > 0 ? i : 640, c = Math.min(Math.max(Math.floor(o * 0.5), 240), 440), s = (n || "").toUpperCase() || "EUR", l = R(r) ? r : null, f = Math.max(48, Math.min(72, Math.round(o * 0.075))), d = Math.max(28, Math.min(56, Math.round(o * 0.05))), p = Math.max(40, Math.min(64, Math.round(c * 0.14)));
  return {
    width: o,
    height: c,
    margin: {
      top: 18,
      right: d,
      bottom: p,
      left: f
    },
    series: t,
    yFormatter: (g) => me(g),
    tooltipRenderer: ({ xFormatted: g, yFormatted: y }) => `
      <div class="chart-tooltip-date">${k(g)}</div>
      <div class="chart-tooltip-value">${k(y)}&nbsp;${k(s)}</div>
    `,
    markerTooltipRenderer: ({
      marker: g,
      xFormatted: y,
      yFormatted: h
    }) => {
      const m = g.payload ?? {}, _ = fa(m.type), b = H(m.shares), v = b != null ? An(b) : null, A = Ee(m.currency) ?? s, C = [];
      _ && C.push(_), v && C.push(`${v} Stück`), y && C.push(`am ${y}`);
      const P = C.join(" ").trim() || (typeof g.label == "string" ? g.label : y), N = typeof h == "string" && h.trim() ? h.trim() : me(m.price), F = N ? `${N}${A ? `&nbsp;${k(A)}` : ""}` : k(A);
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
function Ns(e, t, n = {}) {
  if (t.length === 0)
    return;
  const r = Es(e, t, n);
  let a = er.get(e) ?? null;
  if (!a || !e.contains(a)) {
    e.innerHTML = "", a = aa(e, r), a && er.set(e, a);
    return;
  }
  _n(a, r);
}
function tr(e, t) {
  e && (e.dataset.activeRange = t, e.querySelectorAll(".security-range-button").forEach((n) => {
    const r = n.dataset.range, a = r === t;
    n.classList.toggle("active", a), n.setAttribute("aria-pressed", a ? "true" : "false"), n.disabled = !1, n.classList.remove("loading"), r && (n.textContent = r);
  }));
}
function xs(e, t, n, r, a) {
  const i = e.querySelector(".security-info-bar");
  if (!i || !i.parentElement)
    return;
  const o = document.createElement("div");
  o.innerHTML = ha(t, n, r, a).trim();
  const c = o.firstElementChild;
  c && i.parentElement.replaceChild(c, i);
}
function nr(e, t, n, r, a = {}) {
  const i = e.querySelector(".security-detail-placeholder");
  if (i && (i.innerHTML = `
    <h2>Historie</h2>
    ${ma(t, n)}
  `, n.status === "loaded" && Array.isArray(r) && r.length)) {
    const o = i.querySelector(".history-chart");
    o && requestAnimationFrame(() => {
      Ns(o, r, a);
    });
  }
}
function Ds(e) {
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
    const f = sa(a), d = ca(a), p = Qn(i);
    Array.isArray(c) && s.status !== "error" && f.set(o, c), is(a), Xn(a, o), tr(l, o);
    const g = Jt(
      c,
      i
    );
    let y = s;
    y.status !== "error" && (y = g.length ? { status: "loaded" } : { status: "empty" }), nr(
      t,
      o,
      y,
      g,
      {
        currency: i?.currency_code,
        baseline: p,
        markers: d.get(o) ?? []
      }
    );
    const h = async (m) => {
      if (m === da(a))
        return;
      const _ = l.querySelector(
        `.security-range-button[data-range="${m}"]`
      );
      _ && (_.disabled = !0, _.classList.add("loading"), _.innerHTML = mi());
      let b = f.get(m) ?? null, v = d.get(m) ?? null, A = null, C = [];
      if (b)
        A = b.length ? { status: "loaded" } : { status: "empty" };
      else
        try {
          const x = mt(m), U = await st(
            n,
            r,
            a,
            x
          );
          b = Zt(U.prices), v = bt(
            U.transactions,
            i?.currency_code,
            i
          ), f.set(m, b), v = Array.isArray(v) ? v : [], d.set(m, v), A = b.length ? { status: "loaded" } : { status: "empty" };
        } catch (x) {
          console.error("Range-Wechsel: Historie konnte nicht geladen werden", x), b = [], v = [], A = {
            status: "error",
            message: ya(x) || "Die historischen Daten konnten aufgrund eines Fehlers nicht geladen werden."
          };
        }
      if (!Array.isArray(v))
        try {
          const x = mt(m), U = await st(
            n,
            r,
            a,
            x
          );
          v = bt(
            U.transactions,
            i?.currency_code,
            i
          ), v = Array.isArray(v) ? v : [], d.set(m, v);
        } catch (x) {
          console.error("Range-Wechsel: Transaktionsmarker konnten nicht geladen werden", x), v = [];
        }
      C = Jt(b, i), A.status !== "error" && (A = C.length ? { status: "loaded" } : { status: "empty" });
      const P = Sn(i), { priceChange: N, priceChangePct: F } = ga(
        C,
        P
      ), I = Array.isArray(v) ? v : [];
      Xn(a, m), tr(l, m), xs(
        t,
        m,
        N,
        F,
        i?.currency_code
      );
      const w = Qn(i);
      nr(
        t,
        m,
        A,
        C,
        {
          currency: i?.currency_code,
          baseline: w,
          markers: I
        }
      );
    };
    l.addEventListener("click", (m) => {
      const _ = m.target?.closest(".security-range-button");
      if (!_ || _.disabled)
        return;
      const { range: b } = _.dataset;
      !b || !ia.includes(b) || h(b);
    });
  }, 0);
}
function ks(e) {
  const { root: t, hass: n, panelConfig: r, tickerSymbol: a } = e;
  let i = null, o = !1;
  const c = async () => {
    try {
      i = await pi(n, r);
    } catch (s) {
      o = !0, console.warn("News-Prompt: Prefetch fehlgeschlagen", s);
    }
  };
  c(), setTimeout(() => {
    const s = t.querySelector(".news-prompt-button");
    if (!s)
      return;
    const l = (d) => {
      const p = (i?.placeholder || Gn).trim() || Gn, u = (i?.prompt_template || "").trim(), g = (i?.link || "").trim() || es;
      return { body: u ? u.includes(p) ? u.split(p).join(d) : `${u}

Ticker: ${d}` : `Ticker: ${d}`, link: g };
    }, f = async () => {
      const d = (s.dataset.symbol || a || "").trim();
      if (!d) {
        console.warn("News-Prompt: Kein Ticker verfügbar");
        return;
      }
      if (s.classList.contains("loading"))
        return;
      s.disabled = !0, s.classList.add("loading");
      const p = s.textContent;
      try {
        const { body: u, link: g } = l(d), y = await bs(u);
        y ? s.textContent = "✅ Copied! Opening..." : console.warn("News-Prompt: Clipboard unavailable – prompt could not be copied"), y && await new Promise((h) => setTimeout(h, 800)), _s(g), !i && !o && c();
      } catch (u) {
        console.error("News-Prompt: Kopiervorgang fehlgeschlagen", u);
      } finally {
        s.classList.remove("loading"), s.disabled = !1, p && setTimeout(() => {
          s.textContent = p;
        }, 2e3);
      }
    };
    s.addEventListener("click", () => {
      f();
    });
  }, 0);
}
async function Fs(e, t, n, r) {
  if (!r)
    return console.error("renderSecurityDetail: securityUuid fehlt"), '<div class="card"><h2>Fehler</h2><p>Kein Wertpapier angegeben.</p></div>';
  const a = rs(r);
  let i = null, o = null;
  try {
    const w = await fi(
      t,
      n,
      r
    ), x = w.snapshot;
    i = x && typeof x == "object" ? x : w;
  } catch (w) {
    console.error("renderSecurityDetail: Snapshot konnte nicht geladen werden", w), o = pa(w);
  }
  const c = i || a, s = !!(a && !i), l = (c?.source ?? "") === "cache";
  r && ns(r, c ?? null);
  const f = c && (s || l) ? ts({ fallbackUsed: s, flaggedAsCache: l }) : "", d = c?.name || "Wertpapierdetails", p = Pt(d, "", { includeMeta: !1 });
  p.classList.add("security-detail-header");
  const u = Ps(c);
  if (o)
    return `
      ${p.outerHTML}
      ${u}
      ${f}
      <div class="card error-card">
        <h2>Fehler beim Laden</h2>
        <p>${o}</p>
      </div>
    `;
  const g = da(r), y = sa(r), h = ca(r);
  let m = y.has(g) ? y.get(g) ?? null : null, _ = { status: "empty" }, b = h.has(g) ? h.get(g) ?? null : null;
  if (Array.isArray(m))
    _ = m.length ? { status: "loaded" } : { status: "empty" };
  else {
    m = [];
    try {
      const w = mt(g), x = await st(
        t,
        n,
        r,
        w
      );
      m = Zt(x.prices), b = bt(
        x.transactions,
        c?.currency_code,
        c
      ), y.set(g, m), b = Array.isArray(b) ? b : [], h.set(g, b), _ = m.length ? { status: "loaded" } : { status: "empty" };
    } catch (w) {
      console.error(
        "renderSecurityDetail: Historie konnte nicht geladen werden",
        w
      ), _ = {
        status: "error",
        message: ya(w) || "Die historischen Daten konnten aufgrund eines Fehlers nicht geladen werden."
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
      ), U = Zt(x.prices);
      b = bt(
        x.transactions,
        c?.currency_code,
        c
      ), y.set(g, U), b = Array.isArray(b) ? b : [], h.set(g, b), m = U, _ = m.length ? { status: "loaded" } : { status: "empty" };
    } catch (w) {
      console.error(
        "renderSecurityDetail: Transaktionsmarker konnten nicht geladen werden",
        w
      ), b = [];
    }
  const v = Jt(
    m,
    c
  );
  _.status !== "error" && (_ = v.length ? { status: "loaded" } : { status: "empty" });
  const A = ms(c, r), C = ys(A), P = Sn(c), { priceChange: N, priceChangePct: F } = ga(
    v,
    P
  ), I = ha(
    g,
    N,
    F,
    c?.currency_code
  );
  return Ds({
    root: e,
    hass: t,
    panelConfig: n,
    securityUuid: r,
    snapshot: c,
    initialRange: g,
    initialHistory: m,
    initialHistoryState: _
  }), ks({
    root: e,
    hass: t,
    panelConfig: n,
    tickerSymbol: A
  }), `
    ${p.outerHTML}
    ${u}
    ${f}
    ${C}
    ${I}
    ${gs(g)}
    <div class="card security-detail-placeholder">
      <h2>Historie</h2>
      ${ma(g, _)}
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
    render: (r, a, i) => Fs(r, a, i, n),
    cleanup: () => {
      ss(n);
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
      const f = document.createElement("button");
      f.className = "drp-preset-btn", f.textContent = l.label, f.setAttribute("aria-pressed", "false"), f.addEventListener("click", () => {
        this.selectPreset(l);
      }), t.appendChild(f);
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
    const c = document.createElement("button");
    c.className = "drp-nav-btn", c.innerHTML = `
            <svg viewBox="0 0 24 24">
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"></path>
            </svg>
        `, c.setAttribute("aria-label", "Vorheriger Monat"), n === "left" ? c.addEventListener("click", (y) => {
      y.stopPropagation(), this.viewDate.setMonth(this.viewDate.getMonth() - 1), this.renderCalendars();
    }) : c.style.visibility = "hidden";
    const s = document.createElement("span");
    s.className = "drp-month-label", s.textContent = t.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
    const l = document.createElement("button");
    l.className = "drp-nav-btn", l.innerHTML = `
            <svg viewBox="0 0 24 24">
                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"></path>
            </svg>
        `, l.setAttribute("aria-label", "Nächster Monat"), n === "right" ? l.addEventListener("click", (y) => {
      y.stopPropagation(), this.viewDate.setMonth(this.viewDate.getMonth() + 1), this.renderCalendars();
    }) : l.style.visibility = "hidden", o.appendChild(c), o.appendChild(s), o.appendChild(l), i.appendChild(o);
    const f = document.createElement("div");
    f.className = "drp-days-header", ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].forEach((y) => {
      const h = document.createElement("span");
      h.className = "drp-day-name", h.textContent = y, f.appendChild(h);
    }), i.appendChild(f);
    const d = document.createElement("div");
    d.className = "drp-days-grid";
    const p = new Date(r, a, 1), u = new Date(r, a + 1, 0);
    let g = p.getDay() - 1;
    g < 0 && (g = 6);
    for (let y = 0; y < g; y++) {
      const h = document.createElement("div");
      h.className = "drp-day empty", d.appendChild(h);
    }
    for (let y = 1; y <= u.getDate(); y++) {
      const h = new Date(r, a, y), m = document.createElement("div");
      m.className = "drp-day", m.textContent = y.toString(), m.setAttribute("role", "button"), m.tabIndex = 0;
      const _ = h.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
      m.setAttribute("aria-label", _), this.applyDayClasses(m, h), m.addEventListener("click", (b) => {
        b.stopPropagation(), this.handleDayClick(h);
      }), m.addEventListener("keydown", (b) => {
        (b.key === "Enter" || b.key === " ") && (b.preventDefault(), b.stopPropagation(), this.handleDayClick(h));
      }), m.addEventListener("mouseenter", () => {
        this.handleDayHover(h);
      }), d.appendChild(m);
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
let _e = {
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
function Qt(e) {
  return typeof e != "string" ? null : e.trim() || null;
}
function Ls(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e, n = Qt(t.start), r = Qt(t.end);
  return n && r ? { start: n, end: r } : null;
}
function ar(e) {
  if (!Array.isArray(e))
    return [];
  const t = e.map((r) => typeof r == "string" ? r.trim() : "").filter((r) => r.length > 0), n = Array.from(new Set(t));
  return n.sort(), n;
}
function Ms(e) {
  const t = Qt(e.date ?? null), n = Ls(e.range ?? null);
  if (t && n)
    throw new Error("loadDailyWealth: date und range können nicht gleichzeitig gesetzt werden");
  if (!t && !n)
    throw new Error("loadDailyWealth: entweder date oder range erforderlich");
  const r = e.scopes ?? {}, a = ar(r.accounts), i = ar(r.portfolios), o = {};
  t && (o.date = t), n && (o.range = n);
  const c = e.include_slices ?? e.includeSlices ?? void 0, s = e.include_scopes ?? e.includeScopes ?? void 0;
  return c !== void 0 && (o.includeSlices = c), s !== void 0 && (o.includeScopes = s), (a.length || i.length) && (o.scopes = {}, a.length && (o.scopes.accounts = a), i.length && (o.scopes.portfolios = i)), typeof e.limit == "number" && Number.isFinite(e.limit) && e.limit > 0 && (o.limit = e.limit), typeof e.offset == "number" && Number.isFinite(e.offset) && e.offset >= 0 && (o.offset = e.offset), o;
}
function Hs(e) {
  const t = e.date ?? "", n = e.range ? `${e.range.start}..${e.range.end}` : "", r = e.scopes?.accounts ?? [], a = e.scopes?.portfolios ?? [], i = JSON.stringify({ accounts: r, portfolios: a }), o = e.includeSlices ? "1" : "0", c = e.includeScopes ? "1" : "0", s = e.limit ?? "", l = e.offset ?? "";
  return [t, n, i, o, c, s, l].join("::");
}
function Is(e) {
  return { ...e };
}
function ir(e) {
  return { ...e };
}
function zs(e) {
  if (e)
    return {
      accounts: e.accounts.map(ir),
      portfolios: e.portfolios.map(ir)
    };
}
function Vs(e) {
  if (!e)
    return null;
  const t = zs(e.slices);
  return {
    range: { ...e.range },
    records: e.records.map(Is),
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
function Ut(e) {
  _e = {
    ..._e,
    ...e
  };
}
function en() {
  return {
    status: _e.status,
    error: _e.error,
    lastUpdated: _e.lastUpdated,
    data: Vs(_e.data),
    selection: Us(_e.selection)
  };
}
async function qs(e, t, n = {}) {
  const r = Ms(n), a = Hs(r);
  if (_e.data && !n.force && rr === a)
    return en();
  Ut({
    status: "loading",
    error: null,
    selection: r
  });
  try {
    const i = await ui(e, t, r);
    rr = a, Ut({
      status: "loaded",
      error: null,
      data: i,
      selection: r,
      lastUpdated: Date.now()
    });
  } catch (i) {
    Ut({
      status: "error",
      error: Rs(i),
      selection: r,
      lastUpdated: Date.now()
    });
  }
  return en();
}
const Ws = 30;
let ba = null, tn = null;
const pe = /* @__PURE__ */ new Set(), Bs = [
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
  return t.setUTCDate(e.getUTCDate() - (Ws - 1)), {
    range: {
      start: _t(t),
      end: _t(e)
    },
    includeSlices: !0,
    includeScopes: !0
  };
}
function Ys(e) {
  if (!e.length)
    return "";
  const t = e.some((i) => i.fx_coverage_ratio != null && i.fx_coverage_ratio < 1), n = e.some((i) => i.price_coverage_ratio != null && i.price_coverage_ratio < 1), r = e.some((i) => i.stale_price), a = [];
  return t && a.push('<span class="meta-badge meta-badge--warning" title="Wechselkurse fehlen teilweise">FX-Abdeckung</span>'), n && a.push('<span class="meta-badge meta-badge--warning" title="Preisdaten unvollständig">Preisabdeckung</span>'), r && a.push('<span class="meta-badge meta-badge--neutral" title="Letzte Kurse sind veraltet">Stale Kurse</span>'), a.length ? `<span class="meta-badges">${a.join("")}</span>` : '<span class="meta-badge meta-badge--positive">Volle Abdeckung</span>';
}
function _a(e) {
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
function or(e, t, n) {
  const r = e.querySelector("#analyse-total-wealth"), a = e.querySelector("#analyse-coverage"), i = e.querySelector("#analyse-selection-label");
  if (!r || !a || !i)
    return;
  if (i.textContent = t, !n.length) {
    r.innerHTML = "—", a.innerHTML = "";
    return;
  }
  const o = n[n.length - 1];
  r.innerHTML = _a(o.total_wealth_eur), a.innerHTML = Ys(n);
}
function sr(e, t) {
  const n = e.querySelector(".analyse-metrics-grid");
  if (!n) return;
  if (!t.length) {
    n.innerHTML = '<div class="metrics-empty">Keine Daten verfügbar</div>';
    return;
  }
  const r = Js(t);
  if (!r) return;
  const a = (o, c, s = "", l = "") => `
    <div class="metric-row ${s}" ${l ? `id="${l}"` : ""}>
      <span class="metric-label">${o}</span>
      <span class="metric-value">${typeof c == "number" ? _a(c) : c}</span>
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
function Ks(e, t) {
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
    const f = /* @__PURE__ */ new Map();
    if (s.forEach((p) => {
      const u = vt(l, p.scope_id);
      u && !f.has(u) && f.set(u, p);
    }), f.size === 0)
      return "";
    const d = Array.from(f.values()).map((p) => {
      const u = vt(l, p.scope_id);
      if (!u)
        return "";
      const g = pe.has(u) ? "checked" : "", y = k(p.scope_name ?? p.scope_id);
      return `
          <label class="scope-option">
            <input type="checkbox" data-scope-key="${he(u)}" ${g}>
            <span>${y}</span>
          </label>
        `;
    }).join("");
    return `<div class="scope-group"><div class="scope-title">${c}</div>${d}</div>`;
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
    s.checked ? pe.add(l) : pe.delete(l);
    const f = e.closest("#analyse-chart-card");
    f && tn && va(f, tn);
  });
}
function Gs(e) {
  if (typeof e == "number")
    return Number.isFinite(e) ? e : null;
  const t = Date.parse(e);
  return Number.isFinite(t) ? t : null;
}
function Xs(e) {
  const t = Array.from(Bs), n = {
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
    if (!pe.has(c))
      return;
    const s = t.shift() ?? "#607d8b", l = c.startsWith("account:"), f = c.split(":")[1] ?? "", p = `${l ? "Konto" : "Depot"} ${f}`.trim(), u = o.values().next(), y = (u.done ? void 0 : u.value)?.scope_name ?? p;
    r.push({
      key: c,
      label: y,
      color: s,
      points: e.records.map((h) => {
        const m = o.get(h.date);
        return !m || !Number.isFinite(m.total_wealth_eur) ? null : { date: h.date, value: m.total_wealth_eur };
      }).filter((h) => !!h)
    });
  }), [n, ...r];
}
function Zs(e, t) {
  const n = e.__chartState, r = e.querySelector("svg");
  if (!n || !n.range || !n.margin || !r)
    return;
  const { range: a, margin: i } = n;
  r.querySelectorAll(".analyse-slice-series").forEach((o) => {
    o.remove();
  }), t.filter((o) => o.key !== "total").forEach((o) => {
    const c = o.points.map((f, d) => {
      const p = Gs(f.date);
      if (p == null || !Number.isFinite(f.value))
        return null;
      const u = a.maxX === a.minX ? 0.5 : (p - a.minX) / (a.maxX - a.minX), g = a.maxY === a.minY ? 0.5 : (f.value - a.minY) / (a.maxY - a.minY), y = i.left + u * a.boundedWidth, h = i.top + (1 - g) * a.boundedHeight;
      return `${d === 0 ? "M" : "L"}${String(y)},${String(h)}`;
    }).filter(Boolean).join(" ");
    if (!c)
      return;
    const s = document.createElementNS("http://www.w3.org/2000/svg", "g");
    s.setAttribute("class", "analyse-slice-series");
    const l = document.createElementNS("http://www.w3.org/2000/svg", "path");
    l.setAttribute("d", c), l.setAttribute("fill", "none"), l.setAttribute("stroke", o.color), l.setAttribute("stroke-width", "2"), l.setAttribute("stroke-linejoin", "round"), l.setAttribute("stroke-linecap", "round"), s.appendChild(l), r.appendChild(s);
  });
}
function va(e, t) {
  const n = e.querySelector(".line-chart-container");
  if (!n)
    return;
  const r = Xs(t), a = r[0];
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
  !o.__chartState || !n.querySelector("svg") ? (n.innerHTML = "", c = aa(n, i)) : (_n(o, i), c = o), c && Zs(c, r);
}
function Js(e) {
  if (!e.length)
    return null;
  const t = e[0]?.total_wealth_eur ?? 0, n = e[e.length - 1]?.total_wealth_eur ?? 0, r = ie(e, "dividends_eur"), a = ie(e, "interest_eur"), i = r + a, o = -Math.abs(ie(e, "fees_eur")), c = -Math.abs(ie(e, "taxes_eur")), s = ie(e, "inbound_transfers_eur") - ie(e, "outbound_transfers_eur"), l = ie(e, "performance_neutral_movements"), f = n - t - i - o - c - s - l, d = ie(e, "realized_gains_eur"), p = ie(e, "unrealized_price_gains_eur"), u = ie(e, "fx_gains_eur");
  return {
    startValue: t,
    endValue: n,
    marketGain: f,
    realizedGains: d,
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
async function cr(e, t, n, r, a) {
  tt(e, "loading");
  const i = await qs(n, r, a);
  if (i.status === "error") {
    if (tt(e, "error", i.error ?? void 0), t) {
      const s = t.querySelector(".line-chart-container");
      s && s.replaceChildren();
    }
    return;
  }
  const o = i.data;
  if (!o || !Array.isArray(o.records) || o.records.length === 0) {
    const s = a.range?.start ?? "?", l = a.range?.end ?? "?", f = `Zeitraum: ${s} – ${l}`;
    if (or(e, f, []), sr(e, []), tt(e, "loaded", "Keine Daten für den gewählten Zeitraum."), t) {
      const d = t.querySelector(".line-chart-container");
      d && d.replaceChildren();
    }
    return;
  }
  ba = a, tn = o, js(o.slices);
  const c = a.range ? `Zeitraum: ${a.range.start} – ${a.range.end}` : a.date ? `Tag: ${a.date}` : "";
  or(e, c, o.records), sr(e, o.records), t && (Ks(t, o.slices), va(t, o)), tt(e, "loaded");
}
function Qs(e, t, n, r) {
  const a = e.querySelector("#analyse-date-picker-container"), i = ba ?? en().selection ?? Os();
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
      cr(e, t, n, r, s);
    }
  }), cr(e, t, n, r, i);
}
function ec(e, t, n) {
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

    ${Pt("Zeitmaschine", `
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
    const l = e.querySelector("#analyse-range-card"), f = e.querySelector("#analyse-chart-card");
    l && Qs(l, f, t, n);
  }, 0), s;
}
function tc(e) {
  const t = e.filter((a) => a.current_holdings === 0);
  if (t.length === 0)
    return '<div class="no-positions">Keine geschlossenen Positionen vorhanden.</div>';
  const n = [
    { key: "name", label: "Wertpapier" },
    { key: "ticker_symbol", label: "Symbol" },
    { key: "current_holdings", label: "Bestand", align: "right" },
    { key: "status", label: "Status" }
  ], r = t.map((a) => ({
    name: typeof a.name == "string" ? k(a.name) : "",
    ticker_symbol: typeof a.ticker_symbol == "string" ? k(a.ticker_symbol) : "",
    current_holdings: 0,
    status: "Geschlossen"
  }));
  return Pe(r, n, []);
}
async function nc(e, t, n) {
  const r = Pt("Trades", ""), a = tc(await di(t, n));
  return `
    ${r.outerHTML}
    <div class="card">
      <div class="scroll-container trades-table">
        ${a}
      </div>
    </div>
  `;
}
const rc = go, nn = "pp-reader-sticky-anchor", St = "overview", ac = "trades", ic = "analyse", rn = "security:", oc = [
  { key: St, title: "Dashboard", render: Yr },
  { key: ac, title: "Trades", render: nc },
  { key: ic, title: "Zeitmaschine", render: ec }
], Me = /* @__PURE__ */ new Map(), Qe = [], wt = /* @__PURE__ */ new Map();
let an = null, qt = !1, $e = null, W = 0, Wt = null;
function At(e) {
  return typeof e == "object" && e !== null;
}
function Sa(e) {
  return typeof e == "object" && e !== null && typeof e.then == "function";
}
function wa(e) {
  if (typeof e == "string") {
    const t = e.trim();
    return k(t.length > 0 ? t : "Unbekannter Fehler");
  }
  if (e instanceof Error) {
    const t = e.message.trim();
    return k(t.length > 0 ? t : e.name);
  }
  if (e != null)
    try {
      const t = JSON.stringify(e);
      if (t && t !== "{}")
        return k(t);
    } catch {
    }
  return k(String(e));
}
function sc(e) {
  return e === "accounts" || e === "last_file_update" || e === "portfolio_values" || e === "portfolio_positions";
}
function lr(e) {
  const t = e.portfolio_uuid;
  if (typeof t == "string" && t)
    return t;
  const n = e.portfolioUuid;
  return typeof n == "string" && n ? n : null;
}
function cc(e) {
  if (!e)
    return null;
  if (Array.isArray(e)) {
    for (const t of e)
      if (At(t)) {
        const n = lr(t);
        if (n)
          return n;
      }
    return null;
  }
  return At(e) ? lr(e) : null;
}
function lc(e, t) {
  switch (e) {
    case "accounts":
      return {
        type: e,
        data: Array.isArray(t) ? t : null
      };
    case "last_file_update":
      return typeof t == "string" ? { type: e, data: t } : At(t) ? { type: e, data: t } : { type: e, data: null };
    case "portfolio_values":
      return Array.isArray(t) ? { type: e, data: t } : { type: e, data: null };
    case "portfolio_positions":
      return Array.isArray(t) ? { type: e, data: t } : At(t) ? { type: e, data: t } : { type: e, data: null };
    default:
      return null;
  }
}
function Cn(e) {
  return typeof e != "string" || !e.startsWith(rn) ? null : e.slice(rn.length) || null;
}
function uc() {
  if (!$e)
    return !1;
  const e = Na($e);
  return e || ($e = null), e;
}
function de() {
  const e = Qe.map((t) => Me.get(t)).filter((t) => !!t);
  return [...oc, ...e];
}
function dc(e) {
  const t = de();
  return e < 0 || e >= t.length ? null : t[e];
}
function Aa(e) {
  if (!e)
    return null;
  const t = e, n = t.ppreader ?? t.pp_reader;
  return n || (Object.values(t).find((a) => !a || typeof a != "object" ? !1 : a.webcomponent_name === "pp-reader-panel") ?? null);
}
function Ca() {
  try {
    const e = Dt();
    e && typeof e.rememberScrollPosition == "function" && e.rememberScrollPosition();
  } catch (e) {
    console.warn("rememberCurrentPageScroll: konnte Scroll-Position nicht sichern", e);
  }
}
function ur(e) {
  const t = de();
  return !t.length || e < 0 ? 0 : e >= t.length ? t.length - 1 : e;
}
async function fc(e, t, n, r) {
  const a = de(), i = ur(e);
  if (i === W) {
    e > W && uc();
    return;
  }
  Ca();
  const o = W >= 0 && W < a.length ? a[W] : null, c = o ? Cn(o.key) : null;
  let s = i;
  if (c) {
    const l = i >= 0 && i < a.length ? a[i] : null;
    if (l && l.key === St && yc(c, { suppressRender: !0 })) {
      const p = de().findIndex((u) => u.key === St);
      s = p >= 0 ? p : 0;
    }
  }
  if (!qt) {
    qt = !0;
    try {
      W = ur(s);
      const l = W;
      await xa(t, n, r), mc(l);
    } catch (l) {
      console.error("navigateToPage: Fehler beim Rendern des Tabs", l);
    } finally {
      qt = !1;
    }
  }
}
function Ct(e, t, n, r) {
  fc(W + e, t, n, r);
}
function pc(e, t) {
  if (!e || !t || typeof t.render != "function") {
    console.error("registerDetailTab: Ungültiger Tab-Descriptor", e, t);
    return;
  }
  const n = Cn(e);
  if (n) {
    const a = wt.get(n);
    a && a !== e && Pa(a);
  }
  const r = {
    ...t,
    key: e
  };
  Me.set(e, r), n && wt.set(n, e), Qe.includes(e) || Qe.push(e);
}
function Pa(e) {
  if (!e)
    return;
  const t = Me.get(e);
  if (t && typeof t.cleanup == "function")
    try {
      const a = t.cleanup({ key: e });
      Sa(a) && a.catch((i) => {
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
function gc(e) {
  return Me.has(e);
}
function dr(e) {
  return Me.get(e) ?? null;
}
function hc(e) {
  if (e != null && typeof e != "function") {
    console.error("setSecurityDetailTabFactory: Erwartet Funktion oder null", e);
    return;
  }
  an = e ?? null;
}
function Ea(e) {
  return `${rn}${e}`;
}
function Dt() {
  for (const t of Za())
    if (t.isConnected)
      return t;
  const e = /* @__PURE__ */ new Set();
  for (const t of Ja())
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
function on() {
  const e = Dt();
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
const Dc = {
  findDashboardElement: Dt,
  toErrorMessage: wa
};
function mc(e) {
  const t = Dt();
  if (t && typeof t.handleExternalRender == "function")
    try {
      t.handleExternalRender(e);
    } catch (n) {
      console.warn("notifyExternalRender: Fehler beim Synchronisieren des Dashboards", n);
    }
}
function Na(e) {
  if (!e)
    return console.error("openSecurityDetail: Ungültige securityUuid", e), !1;
  const t = Ea(e);
  let n = dr(t);
  if (!n && typeof an == "function")
    try {
      const i = an(e);
      i && typeof i.render == "function" ? (pc(t, i), n = dr(t)) : console.error("openSecurityDetail: Factory lieferte ungültigen Descriptor", i);
    } catch (i) {
      console.error("openSecurityDetail: Fehler beim Erzeugen des Tab-Descriptors", i);
    }
  if (!n)
    return console.warn(`openSecurityDetail: Kein Detail-Tab für ${e} verfügbar`), !1;
  Ca();
  let a = de().findIndex((i) => i.key === t);
  return a === -1 && (a = de().findIndex((o) => o.key === t), a === -1) ? (console.error("openSecurityDetail: Tab nach Registrierung nicht auffindbar"), !1) : (W = a, $e = null, on(), !0);
}
function yc(e, t = {}) {
  if (!e)
    return console.error("closeSecurityDetail: Ungültige securityUuid", e), !1;
  const { suppressRender: n = !1 } = t, r = Ea(e);
  if (!gc(r))
    return !1;
  const i = de().findIndex((s) => s.key === r), o = i === W;
  Pa(r);
  const c = de();
  if (!c.length)
    return W = 0, n || on(), !0;
  if ($e = e, o) {
    const s = c.findIndex((l) => l.key === St);
    s >= 0 ? W = s : W = Math.min(Math.max(i - 1, 0), c.length - 1);
  } else W >= c.length && (W = Math.max(0, c.length - 1));
  return n || on(), !0;
}
async function xa(e, t, n) {
  let r = n;
  r || (r = Aa(t ? t.panels : null));
  const a = de();
  W >= a.length && (W = Math.max(0, a.length - 1));
  const i = dc(W);
  if (!i) {
    console.error("renderTab: Kein gültiger Tab oder keine render-Methode gefunden!");
    return;
  }
  let o;
  try {
    o = await i.render(e, t, r);
  } catch (f) {
    console.error("renderTab: Fehler beim Rendern des Tabs:", f), e.innerHTML = `<div class="card"><h2>Fehler</h2><pre>${wa(f)}</pre></div>`;
    return;
  }
  e.innerHTML = o ?? "", i.render === Yr && bn(e);
  const s = await new Promise((f) => {
    const d = window.setInterval(() => {
      const p = e.querySelector(".header-card");
      p && (clearInterval(d), f(p));
    }, 50);
  });
  let l = e.querySelector(`#${nn}`);
  if (!l) {
    l = document.createElement("div"), l.id = nn;
    const f = s.parentNode;
    f && "insertBefore" in f && f.insertBefore(l, s);
  }
  vc(e, t, n), _c(e, t, n), bc(e);
}
function bc(e) {
  const t = e.querySelector(".header-card"), n = e.querySelector(`#${nn}`);
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
function _c(e, t, n) {
  const r = e.querySelector(".header-card");
  if (!r) {
    console.error("Header-Card nicht gefunden!");
    return;
  }
  rc(
    r,
    () => {
      Ct(1, e, t, n);
    },
    () => {
      Ct(-1, e, t, n);
    }
  );
}
function vc(e, t, n) {
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
    Ct(-1, e, t, n);
  }), i.addEventListener("click", () => {
    Ct(1, e, t, n);
  }), Sc(r);
}
function Sc(e) {
  const t = e.querySelector("#nav-left"), n = e.querySelector("#nav-right");
  if (t && (W === 0 ? (t.disabled = !0, t.classList.add("disabled")) : (t.disabled = !1, t.classList.remove("disabled"))), n) {
    const r = de(), i = !(W === r.length - 1) || !!$e;
    n.disabled = !i, n.classList.toggle("disabled", !i);
  }
}
class wc extends HTMLElement {
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
    this._panel || (this._panel = Aa(this._hass.panels ?? null));
    const t = Dn(this._hass, this._panel);
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
    const n = Dn(this._hass, this._panel);
    if (!n)
      return;
    const r = t.data;
    if (!sc(r.data_type) || r.entry_id && r.entry_id !== n)
      return;
    const a = lc(r.data_type, r.data);
    a && (this._queueUpdate(a.type, a.data), this._doRender(a.type, a.data));
  }
  _doRender(t, n) {
    switch (t) {
      case "accounts":
        ao(
          n,
          this._root
        );
        break;
      case "last_file_update":
        po(
          n,
          this._root
        );
        break;
      case "portfolio_values":
        so(
          n,
          this._root
        );
        break;
      case "portfolio_positions":
        uo(
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
    t === "portfolio_positions" && (a.portfolioUuid = cc(
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
    const n = xa(this._root, this._hass, this._panel);
    if (Sa(n)) {
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
customElements.get("pp-reader-dashboard") || customElements.define("pp-reader-dashboard", wc);
console.log("PPReader dashboard module v20250914b geladen");
Ts({
  setSecurityDetailTabFactory: hc
});
export {
  Dc as __TEST_ONLY_DASHBOARD,
  xc as __TEST_ONLY__,
  yc as closeSecurityDetail,
  yn as flushPendingPositions,
  dr as getDetailTabDescriptor,
  uo as handlePortfolioPositionsUpdate,
  gc as hasDetailTab,
  Na as openSecurityDetail,
  Nc as reapplyPositionsSort,
  Ac as registerDashboardElement,
  pc as registerDetailTab,
  Pc as registerPanelHost,
  hc as setSecurityDetailTabFactory,
  Cc as unregisterDashboardElement,
  Pa as unregisterDetailTab,
  Ec as unregisterPanelHost,
  Or as updatePortfolioFooterFromDom
};
//# sourceMappingURL=dashboard.JG0BPZHW.js.map
