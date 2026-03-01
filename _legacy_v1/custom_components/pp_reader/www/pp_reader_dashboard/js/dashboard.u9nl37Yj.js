const Mn = /* @__PURE__ */ new Set(), In = /* @__PURE__ */ new Set(), Or = {}, Eo = [
  "renderPositionsTable",
  "applyGainPctMetadata",
  "attachSecurityDetailListener",
  "attachPortfolioPositionsSorting",
  "updatePortfolioFooter"
];
function xo(e, t) {
  typeof t == "function" && (Or[e] = t);
}
function xl(e) {
  e && Mn.add(e);
}
function Pl(e) {
  e && Mn.delete(e);
}
function Po() {
  return Mn;
}
function Dl(e) {
  e && In.add(e);
}
function $l(e) {
  e && In.delete(e);
}
function Do() {
  return In;
}
function $o(e) {
  for (const t of Eo)
    xo(t, e[t]);
}
function Hn() {
  return Or;
}
function Se(e) {
  return typeof e == "object" && e !== null;
}
function W(e) {
  return typeof e == "string" ? e : null;
}
function ut(e) {
  return e === null ? null : W(e);
}
function q(e) {
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
function tr(e) {
  const t = q(e);
  if (t == null)
    return null;
  const n = Math.trunc(t);
  return Number.isFinite(n) ? n : null;
}
function pt(e) {
  return Se(e) ? { ...e } : null;
}
function Br(e) {
  return Se(e) ? { ...e } : null;
}
function Wr(e) {
  return typeof e == "boolean" ? e : void 0;
}
function No(e) {
  if (!Se(e))
    return null;
  const t = W(e.name), n = W(e.currency_code), r = q(e.orig_balance);
  if (!t || !n || r == null)
    return null;
  const a = e.balance === null ? null : q(e.balance), o = {
    uuid: W(e.uuid) ?? void 0,
    name: t,
    currency_code: n,
    orig_balance: r,
    balance: a ?? null
  }, i = q(e.fx_rate);
  i != null && (o.fx_rate = i);
  const c = W(e.fx_rate_source);
  c && (o.fx_rate_source = c);
  const s = W(e.fx_rate_timestamp);
  s && (o.fx_rate_timestamp = s);
  const l = q(e.coverage_ratio);
  l != null && (o.coverage_ratio = l);
  const u = W(e.provenance);
  u && (o.provenance = u);
  const d = ut(e.metric_run_uuid);
  d !== null && (o.metric_run_uuid = d);
  const h = Wr(e.fx_unavailable);
  return typeof h == "boolean" && (o.fx_unavailable = h), o;
}
function Yr(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = No(n);
    r && t.push(r);
  }
  return t;
}
function ko(e) {
  if (!Se(e))
    return null;
  const t = e.aggregation, n = W(e.security_uuid), r = W(e.name), a = q(e.current_holdings), o = q(e.purchase_value_eur) ?? (Se(t) ? q(t.purchase_value_eur) ?? q(t.purchase_total_account) ?? q(t.account_currency_total) : null) ?? q(e.purchase_value), i = q(e.current_value);
  if (!n || !r || a == null || o == null || i == null)
    return null;
  const c = {
    portfolio_uuid: W(e.portfolio_uuid) ?? void 0,
    security_uuid: n,
    name: r,
    ticker_symbol: W(e.ticker_symbol),
    currency_code: W(e.currency_code),
    current_holdings: a,
    purchase_value: o,
    current_value: i,
    average_cost: pt(e.average_cost),
    performance: pt(e.performance),
    aggregation: pt(e.aggregation),
    data_state: Br(e.data_state)
  }, s = q(e.coverage_ratio);
  s != null && (c.coverage_ratio = s);
  const l = W(e.provenance);
  l && (c.provenance = l);
  const u = ut(e.metric_run_uuid);
  u !== null && (c.metric_run_uuid = u);
  const d = q(e.last_price_native);
  d != null && (c.last_price_native = d);
  const h = q(e.last_price_eur);
  h != null && (c.last_price_eur = h);
  const f = q(e.last_close_native);
  f != null && (c.last_close_native = f);
  const m = q(e.last_close_eur);
  return m != null && (c.last_close_eur = m), c;
}
function Kr(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = ko(n);
    r && t.push(r);
  }
  return t;
}
function jr(e) {
  if (!Se(e))
    return null;
  const t = W(e.name), n = q(e.current_value ?? e.value);
  if (!t || n == null)
    return null;
  const a = q(
    e.purchase_sum ?? e.purchase_value_eur ?? e.purchase_value ?? e.purchaseSum
  ) ?? 0, o = {
    uuid: W(e.uuid) ?? void 0,
    name: t,
    current_value: n,
    purchase_value: a,
    purchase_sum: a,
    day_change_abs: q(e.day_change_abs) ?? q(e.day_change_eur) ?? void 0,
    day_change_pct: q(e.day_change_pct) ?? void 0,
    position_count: tr(e.position_count ?? e.count) ?? void 0,
    missing_value_positions: tr(e.missing_value_positions) ?? void 0,
    has_current_value: Wr(e.has_current_value),
    performance: pt(e.performance),
    coverage_ratio: q(e.coverage_ratio) ?? void 0,
    provenance: W(e.provenance) ?? void 0,
    metric_run_uuid: ut(e.metric_run_uuid) ?? void 0,
    data_state: Br(e.data_state)
  };
  return Array.isArray(e.positions) && (o.positions = Kr(e.positions)), o;
}
function Gr(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = jr(n);
    r && t.push(r);
  }
  return t;
}
function Xr(e) {
  if (!Se(e))
    return null;
  const t = { ...e }, n = ut(e.metric_run_uuid);
  n !== null ? t.metric_run_uuid = n : delete t.metric_run_uuid;
  const r = q(e.coverage_ratio);
  r != null ? t.coverage_ratio = r : delete t.coverage_ratio;
  const a = W(e.provenance);
  a ? t.provenance = a : delete t.provenance;
  const o = W(e.generated_at ?? e.snapshot_generated_at);
  return o ? t.generated_at = o : delete t.generated_at, t;
}
function To(e) {
  if (!Se(e))
    return null;
  const t = { ...e }, n = Xr(e.normalized_payload);
  return n ? t.normalized_payload = n : "normalized_payload" in t && delete t.normalized_payload, t;
}
function Zr(e) {
  if (!Se(e))
    return null;
  const t = W(e.generated_at);
  if (!t)
    return null;
  const n = ut(e.metric_run_uuid), r = Yr(e.accounts), a = Gr(e.portfolios), o = To(e.diagnostics), i = {
    generated_at: t,
    metric_run_uuid: n,
    accounts: r,
    portfolios: a
  };
  return o && (i.diagnostics = o), i;
}
function nr(e) {
  return typeof e == "string" ? e : null;
}
function Lo(e) {
  if (typeof e == "string")
    return e;
  if (e === null)
    return null;
}
function Ro(e) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
}
function rr(e, t) {
  if (typeof e == "string")
    return e;
  throw new Error(`mapPositionSnapshotToRecord: fehlendes ${t}`);
}
function Kt(e, t) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  throw new Error(`mapPositionSnapshotToRecord: fehlendes ${t}`);
}
function Fo(e) {
  const t = rr(e.security_uuid, "security_uuid"), n = rr(e.name, "name"), r = Kt(e.current_holdings, "current_holdings"), a = Kt(e.purchase_value, "purchase_value"), o = Kt(e.current_value, "current_value"), i = {
    security_uuid: t,
    name: n,
    current_holdings: r,
    purchase_value: a,
    current_value: o,
    average_cost: e.average_cost ?? null,
    performance: e.performance ?? null,
    aggregation: e.aggregation ?? null
  };
  return e.currency_code !== void 0 && (i.currency_code = e.currency_code), e.coverage_ratio != null && (i.coverage_ratio = e.coverage_ratio), e.provenance && (i.provenance = e.provenance), e.metric_run_uuid !== void 0 && (i.metric_run_uuid = e.metric_run_uuid), e.last_price_native != null && (i.last_price_native = e.last_price_native), e.last_price_eur != null && (i.last_price_eur = e.last_price_eur), e.last_close_native != null && (i.last_close_native = e.last_close_native), e.last_close_eur != null && (i.last_close_eur = e.last_close_eur), e.data_state && (i.data_state = e.data_state), e.ticker_symbol && (i.ticker_symbol = e.ticker_symbol), e.portfolio_uuid && (i.portfolio_uuid = e.portfolio_uuid), i;
}
function ge(e, t) {
  let n = t?.config?.entry_id ?? t?.entry_id ?? t?.config?._panel_custom?.config?.entry_id ?? void 0;
  if (!n && e?.panels) {
    const r = e.panels, a = r.ppreader ?? r.pp_reader ?? Object.values(r).find(
      (o) => o?.webcomponent_name === "pp-reader-panel"
    );
    n = a?.config?.entry_id ?? a?.entry_id ?? a?.config?._panel_custom?.config?.entry_id ?? void 0;
  }
  return n ?? void 0;
}
function fn(e, t) {
  return ge(e, t);
}
async function Mo(e, t) {
  if (!e)
    throw new Error("fetchAccountsWS: fehlendes hass");
  const n = ge(e, t);
  if (!n)
    throw new Error("fetchAccountsWS: fehlendes entry_id");
  const r = await e.connection.sendMessagePromise({
    type: "pp_reader/get_accounts",
    entry_id: n
  }), a = Yr(r.accounts), o = Zr(r.normalized_payload);
  return {
    accounts: a,
    normalized_payload: o
  };
}
async function Io(e, t) {
  if (!e)
    throw new Error("fetchLastFileUpdateWS: fehlendes hass");
  const n = ge(e, t);
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
async function Ho(e, t) {
  if (!e)
    throw new Error("fetchPortfoliosWS: fehlendes hass");
  const n = ge(e, t);
  if (!n)
    throw new Error("fetchPortfoliosWS: fehlendes entry_id");
  const r = await e.connection.sendMessagePromise({
    type: "pp_reader/get_portfolio_data",
    entry_id: n
  }), a = Gr(r.portfolios), o = Zr(r.normalized_payload);
  return {
    portfolios: a,
    normalized_payload: o
  };
}
async function Jr(e, t, n) {
  if (!e)
    throw new Error("fetchPortfolioPositionsWS: fehlendes hass");
  const r = ge(e, t);
  if (!r)
    throw new Error("fetchPortfolioPositionsWS: fehlendes entry_id");
  if (!n)
    throw new Error("fetchPortfolioPositionsWS: fehlendes portfolio_uuid");
  const a = await e.connection.sendMessagePromise({
    type: "pp_reader/get_portfolio_positions",
    entry_id: r,
    portfolio_uuid: n
  }), i = Kr(a.positions).map(Fo), c = Xr(a.normalized_payload), s = {
    portfolio_uuid: nr(a.portfolio_uuid) ?? n,
    positions: i
  };
  typeof a.error == "string" && (s.error = a.error);
  const l = Ro(a.coverage_ratio);
  l !== void 0 && (s.coverage_ratio = l);
  const u = nr(a.provenance);
  u && (s.provenance = u);
  const d = Lo(a.metric_run_uuid);
  return d !== void 0 && (s.metric_run_uuid = d), c && (s.normalized_payload = c), s;
}
async function Vo(e, t, n) {
  if (!e)
    throw new Error("fetchSecuritySnapshotWS: fehlendes hass");
  const r = ge(e, t);
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
async function Qr(e, t) {
  if (!e)
    throw new Error("fetchNewsPromptWS: fehlendes hass");
  const n = ge(e, t);
  if (!n)
    throw new Error("fetchNewsPromptWS: fehlendes entry_id");
  return e.connection.sendMessagePromise({
    type: "pp_reader/get_news_prompt",
    entry_id: n
  });
}
async function Ue(e, t, n, r = {}) {
  if (!e)
    throw new Error("fetchSecurityHistoryWS: fehlendes hass");
  const a = ge(e, t);
  if (!a)
    throw new Error("fetchSecurityHistoryWS: fehlendes entry_id");
  if (!n)
    throw new Error("fetchSecurityHistoryWS: fehlendes securityUuid");
  const o = {
    type: "pp_reader/get_security_history",
    entry_id: a,
    security_uuid: n
  }, { startDate: i, endDate: c, start_date: s, end_date: l } = r || {}, u = i ?? s;
  u != null && (o.start_date = u);
  const d = c ?? l;
  d != null && (o.end_date = d);
  const h = await e.connection.sendMessagePromise(o);
  return Array.isArray(h.prices) || (h.prices = []), Array.isArray(h.transactions) || (h.transactions = []), h;
}
async function ea(e, t) {
  const n = ge(e, t);
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
async function zo(e, t, n) {
  const r = ge(e, t);
  if (!e || !r) return null;
  try {
    const a = {
      type: "pp_reader/get_daily_wealth",
      entry_id: r,
      ...n
    };
    for (const o of Object.keys(a))
      a[o] === void 0 && delete a[o];
    return await e.connection.sendMessagePromise(a);
  } catch (a) {
    throw console.error("Error fetching daily wealth data:", a), a;
  }
}
let Ce = {
  status: "idle",
  error: null,
  data: null,
  selection: null,
  lastUpdated: null
}, pn = null;
function qo(e) {
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
function hn(e) {
  return typeof e != "string" ? null : e.trim() || null;
}
function Uo(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e, n = hn(t.start), r = hn(t.end);
  return n && r ? { start: n, end: r } : null;
}
function ar(e) {
  if (!Array.isArray(e))
    return [];
  const t = e.map((r) => typeof r == "string" ? r.trim() : "").filter((r) => r.length > 0), n = Array.from(new Set(t));
  return n.sort(), n;
}
function Oo(e) {
  const t = hn(e.date ?? null), n = Uo(e.range ?? null);
  if (t && n)
    throw new Error("loadDailyWealth: date und range können nicht gleichzeitig gesetzt werden");
  if (!t && !n)
    throw new Error("loadDailyWealth: entweder date oder range erforderlich");
  const r = e.scopes ?? {}, a = ar(r.accounts), o = ar(r.portfolios), i = {};
  t && (i.date = t), n && (i.range = n), e.metrics_start && (i.metrics_start = e.metrics_start);
  const c = e.include_slices ?? e.includeSlices ?? void 0, s = e.include_scopes ?? e.includeScopes ?? void 0;
  return c !== void 0 && (i.includeSlices = c), s !== void 0 && (i.includeScopes = s), (a.length || o.length) && (i.scopes = {}, a.length && (i.scopes.accounts = a), o.length && (i.scopes.portfolios = o)), typeof e.limit == "number" && Number.isFinite(e.limit) && e.limit > 0 && (i.limit = e.limit), typeof e.offset == "number" && Number.isFinite(e.offset) && e.offset >= 0 && (i.offset = e.offset), i;
}
function Bo(e) {
  const t = e.date ?? "", n = e.range ? `${e.range.start}..${e.range.end}` : "", r = e.scopes?.accounts ?? [], a = e.scopes?.portfolios ?? [], o = JSON.stringify({ accounts: r, portfolios: a }), i = e.includeSlices ? "1" : "0", c = e.includeScopes ? "1" : "0", s = e.limit ?? "", l = e.offset ?? "", u = e.metrics_start ?? "";
  return [t, n, o, i, c, s, l, u].join("::");
}
function Wo(e) {
  return { ...e };
}
function or(e) {
  return { ...e };
}
function Yo(e) {
  if (e)
    return {
      accounts: e.accounts.map(or),
      portfolios: e.portfolios.map(or)
    };
}
function Ko(e) {
  if (!e)
    return null;
  const t = Yo(e.slices);
  return {
    range: { ...e.range },
    records: e.records.map(Wo),
    ...t ? { slices: t } : {},
    ...e.metrics ? { metrics: { ...e.metrics } } : {}
  };
}
function jo(e) {
  if (!e)
    return null;
  const t = {};
  return e.date && (t.date = e.date), e.range && (t.range = { ...e.range }), e.metrics_start && (t.metrics_start = e.metrics_start), e.scopes && (t.scopes = {
    ...e.scopes.accounts ? { accounts: [...e.scopes.accounts] } : {},
    ...e.scopes.portfolios ? { portfolios: [...e.scopes.portfolios] } : {}
  }), e.includeSlices !== void 0 && (t.includeSlices = e.includeSlices), e.includeScopes !== void 0 && (t.includeScopes = e.includeScopes), e.limit !== void 0 && (t.limit = e.limit), e.offset !== void 0 && (t.offset = e.offset), t;
}
function jt(e) {
  Ce = {
    ...Ce,
    ...e
  };
}
function St() {
  return {
    status: Ce.status,
    error: Ce.error,
    lastUpdated: Ce.lastUpdated,
    data: Ko(Ce.data),
    selection: jo(Ce.selection)
  };
}
function Gt() {
  pn = null;
}
async function Go(e, t, n = {}) {
  const r = Oo(n), a = Bo(r);
  if (Ce.data && !n.force && pn === a)
    return St();
  jt({
    status: "loading",
    error: null,
    selection: r
  });
  try {
    const o = await zo(e, t, r);
    pn = a, jt({
      status: "loaded",
      error: null,
      data: o,
      selection: r,
      lastUpdated: Date.now()
    });
  } catch (o) {
    jt({
      status: "error",
      error: qo(o),
      selection: r,
      lastUpdated: Date.now()
    });
  }
  return St();
}
function x(e) {
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
function T(e) {
  return x(e);
}
const mn = '<svg class="sort-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>', Vn = (e, t) => {
  if (!Number.isFinite(e) || e === 0)
    return "neutral";
  const n = 0.5 / Math.pow(10, t);
  return Math.abs(e) < n ? "neutral" : e > 0 ? "positive" : "negative";
};
function Q(e, t, n = void 0, r = void 0) {
  let a = null;
  const o = (s) => {
    if (typeof s == "number")
      return s;
    if (typeof s == "string" && s.trim() !== "") {
      const l = s.replace(/\s+/g, "").replace(/[^0-9,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."), u = Number.parseFloat(l);
      return Number.isNaN(u) ? Number.NaN : u;
    }
    return Number.NaN;
  }, i = (s, l = 2, u = 2) => {
    const d = typeof s == "number" ? s : o(s);
    return Number.isFinite(d) ? d.toLocaleString("de-DE", {
      minimumFractionDigits: l,
      maximumFractionDigits: u
    }) : "";
  }, c = (s = "") => {
    const l = s || "Kein Wert verfügbar";
    return `<span class="missing-value" role="note" aria-label="${l}" title="${l}">—</span>`;
  };
  if (["gain_abs", "gain_pct", "day_change_abs", "day_change_pct"].includes(e)) {
    if (t == null && n) {
      const h = n.performance;
      if (typeof h == "object" && h !== null)
        if (e.startsWith("day_change")) {
          const f = h.day_change;
          if (f && typeof f == "object") {
            const m = e === "day_change_pct" ? f.change_pct : f.value_change_eur ?? f.price_change_eur;
            typeof m == "number" && (t = m);
          }
        } else {
          const f = h[e];
          typeof f == "number" && (t = f);
        }
    }
    const s = n?.fx_unavailable === !0 ? "Wechselkurs nicht verfügbar – EUR-Wert unbekannt" : "";
    if (t == null || r?.hasValue === !1)
      return c(s);
    const l = typeof t == "number" ? t : o(t);
    if (!Number.isFinite(l))
      return c(s);
    const u = e.endsWith("pct") ? "%" : "€";
    return a = i(l) + `&nbsp;${u}`, `<span class="${Vn(l, 2)}">${a}</span>`;
  } else if (e === "position_count") {
    const s = typeof t == "number" ? t : o(t);
    if (!Number.isFinite(s))
      return c();
    a = s.toLocaleString("de-DE");
  } else if (["balance", "current_value", "purchase_value"].includes(e)) {
    const s = typeof t == "number" ? t : o(t);
    if (!Number.isFinite(s))
      return n?.fx_unavailable ? c(
        "Wechselkurs nicht verfügbar – EUR-Wert unbekannt"
      ) : (r && r.hasValue === !1, c());
    a = i(s) + "&nbsp;€";
  } else if (e === "current_holdings")
    if (typeof t == "string" && t.trim().startsWith("<"))
      a = t;
    else {
      const s = typeof t == "number" ? t : o(t);
      if (!Number.isFinite(s))
        return c();
      const l = Math.abs(s % 1) > 0;
      a = s.toLocaleString("de-DE", {
        minimumFractionDigits: l ? 2 : 0,
        maximumFractionDigits: 4
      });
    }
  else {
    let s = "";
    if (typeof t == "string" ? s = t : typeof t == "number" && Number.isFinite(t) ? s = t.toString() : typeof t == "boolean" ? s = t ? "true" : "false" : t instanceof Date && Number.isFinite(t.getTime()) && (s = t.toISOString()), a = s, a) {
      if (/<[a-z]/i.test(a)) {
        const u = /<\/?(?!(?:span|div|ha-icon|strong|br|p|button)\b)[a-z][a-z0-9]*\b/i, d = /javascript:|data:\w+\/|[\s\/]on[a-z]+\s*=|url\s*\(|[\s\/](?:href|src)\s*=/i;
        (u.test(a) || d.test(a)) && (a = x(a));
      }
      /<|&lt;|&gt;/.test(a) || (a.length > 60 && (a = a.slice(0, 59) + "…"), a.startsWith("Kontostand ") ? a = a.substring(11) : a.startsWith("Depotwert ") && (a = a.substring(10)));
    }
  }
  return typeof a != "string" || a === "" ? c() : a;
}
function $e(e, t, n = [], r = {}) {
  const { sortable: a = !1, defaultSort: o, rowAttributes: i } = r, c = o?.key ?? "", s = o?.dir === "desc" ? "desc" : "asc";
  let l = "<table><thead><tr>";
  t.forEach((p) => {
    const y = p.align === "right" ? ' class="align-right"' : "";
    if (a && p.key) {
      const _ = `${T(p.label)} sortieren`;
      l += `<th${y} data-sort-key="${p.key}" role="button" tabindex="0" aria-sort="none" aria-label="${_}" data-label="${T(p.label)}">${p.label}</th>`;
    } else
      l += `<th${y}>${p.label}</th>`;
  }), l += "</tr></thead><tbody>", e.forEach((p) => {
    let y = "";
    if (i) {
      const _ = i(p);
      y = Object.entries(_).map(([v, S]) => ` ${v}="${T(S)}"`).join("");
    }
    l += `<tr${y}>`, t.forEach((_) => {
      const v = _.align === "right" ? ' class="align-right"' : "";
      l += `<td${v}>${Q(_.key, p[_.key], p)}</td>`;
    }), l += "</tr>";
  });
  const u = {}, d = {};
  t.forEach((p) => {
    if (n.includes(p.key)) {
      const y = e.reduce(
        (_, v) => {
          let S = v[p.key];
          if ((p.key === "gain_abs" || p.key === "gain_pct") && (typeof S != "number" || !Number.isFinite(S))) {
            const w = v.performance;
            if (typeof w == "object" && w !== null) {
              const C = w[p.key];
              typeof C == "number" && (S = C);
            }
          } else if ((p.key === "day_change_abs" || p.key === "day_change_pct") && (typeof S != "number" || !Number.isFinite(S))) {
            const w = v.performance;
            if (typeof w == "object" && w !== null) {
              const C = w.day_change;
              if (C && typeof C == "object") {
                const E = p.key === "day_change_pct" ? C.change_pct : C.value_change_eur ?? C.price_change_eur;
                typeof E == "number" && (S = E);
              }
            }
          }
          if (typeof S == "number" && Number.isFinite(S)) {
            const w = S;
            _.total += w, _.hasValue = !0;
          }
          return _;
        },
        { total: 0, hasValue: !1 }
      );
      y.hasValue ? (u[p.key] = y.total, d[p.key] = { hasValue: !0 }) : (u[p.key] = null, d[p.key] = { hasValue: !1 });
    }
  });
  const h = u.gain_abs ?? null;
  if (h != null) {
    const p = u.purchase_value ?? null;
    if (p != null && p > 0)
      u.gain_pct = h / p * 100;
    else {
      const y = u.current_value ?? null;
      y != null && y !== 0 && (u.gain_pct = h / (y - h) * 100);
    }
  }
  const f = u.day_change_abs ?? null;
  if (f != null) {
    const p = u.current_value ?? null;
    if (p != null) {
      const y = p - f;
      y && (u.day_change_pct = f / y * 100, d.day_change_pct = { hasValue: !0 });
    }
  }
  const m = Number.isFinite(u.gain_pct ?? NaN) ? u.gain_pct : null;
  let g = "", b = "neutral";
  if (m != null && (g = `${ye(m)} %`, m > 0 ? b = "positive" : m < 0 && (b = "negative")), l += '<tr class="footer-row">', t.forEach((p, y) => {
    const _ = p.align === "right" ? ' class="align-right"' : "";
    if (y === 0) {
      l += `<td${_}>Summe</td>`;
      return;
    }
    if (r.footerValues && r.footerValues[p.key] !== void 0) {
      const S = r.footerValues[p.key];
      typeof S == "string" ? l += `<td${_}>${S}</td>` : typeof S == "number" ? l += `<td${_}>${Q(p.key, S)}</td>` : l += `<td${_}>—</td>`;
      return;
    }
    if (u[p.key] != null) {
      let S = "";
      p.key === "gain_abs" && g && (S = ` data-gain-pct="${T(g)}" data-gain-sign="${T(b)}"`), l += `<td${_}${S}>${Q(p.key, u[p.key], void 0, d[p.key])}</td>`;
      return;
    }
    if (p.key === "gain_pct" && u.gain_pct != null) {
      l += `<td${_}>${Q("gain_pct", u.gain_pct, void 0, d[p.key])}</td>`;
      return;
    }
    const v = d[p.key] ?? { hasValue: !1 };
    l += `<td${_}>${Q(p.key, null, void 0, v)}</td>`;
  }), l += "</tr>", l += "</tbody></table>", a)
    try {
      const p = document.createElement("template");
      p.innerHTML = l.trim();
      const y = p.content.querySelector("table");
      if (y)
        return y.classList.add("sortable-table"), c && (y.dataset.defaultSort = c, y.dataset.defaultDir = s), y.outerHTML;
    } catch (p) {
      console.warn("makeTable(sortable): Injection fehlgeschlagen:", p);
    }
  return l;
}
function dt(e, t, n = {}) {
  const { includeMeta: r = !0 } = n, a = document.createElement("div");
  a.className = "header-card";
  const o = r ? `<div id="headerMeta" class="meta">${t}</div>` : "", i = n.subtitle ? `<div class="header-subtitle">${x(n.subtitle ?? "")}</div>` : "";
  return a.innerHTML = `
    <div class="header-content">
      <button id="nav-left" class="nav-arrow" aria-label="Vorherige Seite" title="Vorherige Seite">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"></path>
        </svg>
      </button>
      <div class="header-title-group" style="display: flex; flex-direction: column; align-items: center;">
        <h2 id="headerTitle">${x(e)}</h2>
        ${i}
      </div>
      <button id="nav-right" class="nav-arrow" aria-label="Nächste Seite" title="Nächste Seite">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"></path>
        </svg>
      </button>
    </div>
    ${o}
  `, a;
}
function ye(e, t = 2, n = 2) {
  return (Number.isNaN(e) ? 0 : e).toLocaleString("de-DE", {
    minimumFractionDigits: t,
    maximumFractionDigits: n
  });
}
function Xo(e) {
  const t = Number.isNaN(e) ? 0 : e;
  return `<span class="${Vn(t, 2)}">${ye(t)}&nbsp;€</span>`;
}
function Zo(e) {
  const t = Number.isNaN(e) ? 0 : e;
  return `<span class="${Vn(t, 2)}">${ye(t)}&nbsp;%</span>`;
}
function Ut() {
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
function zn(e = "Laden...") {
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
  
      <span>${x(e || "Laden...")}</span>
    </div>
  `;
}
function V(e, t, n, r) {
  return `
      <div class="cell-stack">
        <span class="val-top" data-val="${T(e)}">${t}</span>
        <span class="val-bottom" data-val="${T(n)}">${r}</span>
      </div>
    `;
}
function fe(e, t, n, r) {
  return `
    <div class="sort-stack">
        <span class="sort-item" data-sort-selector="${t}" role="button" tabindex="0" data-label="${x(e)}" aria-label="${x(e)} sortieren">${x(e)}${mn}</span>
        <span class="sort-item" data-sort-selector="${r}" role="button" tabindex="0" data-label="${x(n)}" aria-label="${x(n)} sortieren">${x(n)}${mn}</span>
    </div>
  `;
}
function ce(e, t) {
  return `<span class="simple-sort-header" data-sort-key="${t}" role="button" tabindex="0" data-label="${x(e)}" aria-label="${x(e)} sortieren">${x(e)}${mn}</span>`;
}
function ta(e, t, n = "asc", r = !1) {
  if (!e)
    return [];
  const a = e.querySelector("tbody");
  if (!a)
    return [];
  const o = a.querySelector("tr.footer-row"), i = Array.from(
    a.querySelectorAll("tr")
  ).filter((u) => u !== o);
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
    const u = Array.from(
      e.querySelectorAll("thead th")
    );
    for (let d = 0; d < u.length; d++)
      if (u[d].getAttribute("data-sort-key") === t) {
        c = d;
        break;
      }
  }
  if (c < 0)
    return i;
  const s = (u) => {
    const d = u.replace(/\u00A0/g, " ").replace(/[%€]/g, "").replace(/\./g, "").replace(/,/g, ".").replace(/[^\d.-]/g, "").trim();
    if (!d) return NaN;
    const h = parseFloat(d);
    return Number.isFinite(h) ? h : NaN;
  };
  i.sort((u, d) => {
    const h = u.cells.item(c), f = d.cells.item(c), m = (h?.textContent ?? "").trim(), g = (f?.textContent ?? "").trim(), b = s(m), p = s(g);
    let y;
    const _ = /[0-9]/.test(m) || /[0-9]/.test(g);
    return !Number.isNaN(b) && !Number.isNaN(p) && _ ? y = b - p : y = m.localeCompare(g, "de", { sensitivity: "base" }), n === "asc" ? y : -y;
  }), i.forEach((u) => a.appendChild(u)), o && a.appendChild(o), e.querySelectorAll("thead th.sort-active").forEach((u) => {
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
  ), l.setAttribute("aria-sort", n === "asc" ? "ascending" : "descending")), i;
}
const Jo = '<svg class="retry-icon" viewBox="0 0 24 24" aria-hidden="true" style="width: 1.2em; height: 1.2em; vertical-align: text-bottom; margin-right: 4px; fill: currentColor;"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>';
function at(e, t = "Erneut laden") {
  const n = T(e), r = x(t);
  return `<button class="retry-pos" type="button" data-portfolio="${n}" aria-label="${r}">
    ${Jo}${r}
  </button>`;
}
let na = [];
const Pe = /* @__PURE__ */ new Map();
function ht(e) {
  return typeof e == "string" && e.length > 0 ? e : void 0;
}
function Qo(e) {
  return e === null ? null : ht(e);
}
function ei(e) {
  return typeof e == "number" && Number.isFinite(e) ? e : void 0;
}
function Ne(e) {
  return e === null ? null : ei(e);
}
function ir(e) {
  if (!(typeof e != "number" || !Number.isFinite(e)))
    return Math.trunc(e);
}
function pe(e) {
  if (!(!e || typeof e != "object"))
    return { ...e };
}
function ot(e) {
  const t = { ...e };
  return t.average_cost = pe(e.average_cost), t.performance = pe(e.performance), t.aggregation = pe(e.aggregation), t.data_state = pe(e.data_state), t;
}
function qn(e) {
  const t = { ...e };
  return t.performance = pe(e.performance), t.data_state = pe(e.data_state), Array.isArray(e.positions) && (t.positions = e.positions.map(ot)), t;
}
function ra(e) {
  if (!e || typeof e != "object")
    return null;
  const t = ht(e.uuid);
  if (!t)
    return null;
  const n = { uuid: t }, r = ht(e.name);
  r && (n.name = r);
  const a = Ne(e.current_value);
  a !== void 0 && (n.current_value = a);
  const o = Ne(e.purchase_sum) ?? Ne(e.purchase_value_eur) ?? Ne(e.purchase_value);
  o !== void 0 && (n.purchase_value = o, n.purchase_sum = o);
  const i = Ne(e.day_change_abs);
  i !== void 0 && (n.day_change_abs = i);
  const c = Ne(e.day_change_pct);
  c !== void 0 && (n.day_change_pct = c);
  const s = ir(e.position_count);
  s !== void 0 && (n.position_count = s);
  const l = ir(e.missing_value_positions);
  l !== void 0 && (n.missing_value_positions = l), typeof e.has_current_value == "boolean" && (n.has_current_value = e.has_current_value);
  const u = Ne(e.coverage_ratio);
  u !== void 0 && (n.coverage_ratio = u);
  const d = ht(e.provenance);
  d && (n.provenance = d), "metric_run_uuid" in e && (n.metric_run_uuid = Qo(e.metric_run_uuid));
  const h = pe(e.performance);
  h && (n.performance = h);
  const f = pe(e.data_state);
  if (f && (n.data_state = f), Array.isArray(e.positions)) {
    const m = e.positions.filter(
      (g) => !!g
    );
    m.length && (n.positions = m.map(ot));
  }
  return n;
}
function ti(e, t) {
  const n = {
    ...e,
    ...t
  };
  return !t.performance && e.performance && (n.performance = pe(e.performance)), !t.data_state && e.data_state && (n.data_state = pe(e.data_state)), !t.positions && e.positions && (n.positions = e.positions.map(ot)), n;
}
function aa(e) {
  na = (e ?? []).map((n) => ({ ...n }));
}
function ni() {
  return na.map((e) => ({ ...e }));
}
function ri(e) {
  Pe.clear();
  const t = e ?? [];
  for (const n of t) {
    const r = ra(n);
    r && Pe.set(r.uuid, qn(r));
  }
}
function ai(e) {
  const t = e ?? [];
  for (const n of t) {
    const r = ra(n);
    if (!r)
      continue;
    const a = Pe.get(r.uuid), o = a ? ti(a, r) : qn(r);
    Pe.set(o.uuid, o);
  }
}
function wt(e, t) {
  if (!e)
    return;
  const n = Pe.get(e);
  if (!n)
    return;
  if (!Array.isArray(t) || t.length === 0) {
    const s = { ...n };
    delete s.positions, Pe.set(e, s);
    return;
  }
  const r = (s, l) => {
    const u = s ? ot(s) : {}, d = u;
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
    ].forEach((m) => {
      const g = l[m];
      g != null && (d[m] = g);
    });
    const f = (m, g = []) => {
      const b = l[m], p = s && s[m] && typeof s[m] == "object" ? s[m] : void 0;
      if (!b || typeof b != "object") {
        b !== void 0 && (d[m] = b);
        return;
      }
      const y = {
        ...p ?? {},
        ...b
      };
      g.forEach((_) => {
        const v = p?.[_];
        v != null && (y[_] = v);
      }), d[m] = y;
    };
    return f("performance", ["gain_pct", "total_change_pct"]), f("aggregation"), f("average_cost"), f("data_state"), u;
  }, a = Array.isArray(n.positions) ? n.positions : [], o = new Map(
    a.filter((s) => s.security_uuid).map((s) => [s.security_uuid, s])
  ), i = t.filter((s) => !!s).map((s) => {
    const l = s.security_uuid ? o.get(s.security_uuid) : void 0;
    return r(l, s);
  }).map(ot), c = {
    ...n,
    positions: i
  };
  Pe.set(e, c);
}
function oi() {
  return Array.from(Pe.values(), (e) => qn(e));
}
function oa() {
  return {
    accounts: ni(),
    portfolios: oi()
  };
}
const ii = /^[+-]?(?:\d+\.?\d*|\d*\.?\d+)(?:[eE][+-]?\d+)?$/, de = (e) => {
  if (typeof e == "number")
    return Number.isFinite(e) ? e : null;
  if (typeof e == "string") {
    const t = e.trim();
    if (!t || !ii.test(t))
      return null;
    const n = Number(t);
    if (Number.isFinite(n))
      return n;
  }
  return null;
}, ia = (e) => {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t || null;
};
function si(e) {
  const t = e && typeof e == "object" ? e : null;
  if (!t)
    return null;
  const n = de(t.price_change_native), r = de(t.price_change_eur), a = de(t.change_pct), o = de(t.value_change_eur);
  if (n == null && r == null && a == null && o == null)
    return null;
  const i = ia(t.source) ?? "derived", c = de(t.coverage_ratio) ?? null;
  return {
    price_change_native: n,
    price_change_eur: r,
    change_pct: a,
    value_change_eur: o ?? null,
    source: i,
    coverage_ratio: c
  };
}
function Me(e) {
  const t = e && typeof e == "object" ? e : null;
  if (!t)
    return null;
  const n = de(t.gain_abs), r = de(t.gain_pct), a = de(t.total_change_eur), o = de(t.total_change_pct);
  if (n == null || r == null || a == null || o == null)
    return null;
  const i = ia(t.source) ?? "derived", c = de(t.coverage_ratio) ?? null, s = si(t.day_change);
  return {
    gain_abs: n,
    gain_pct: r,
    total_change_eur: a,
    total_change_pct: o,
    source: i,
    coverage_ratio: c,
    day_change: s
  };
}
const ci = "unknown-account";
function J(e) {
  return typeof e != "number" || !Number.isFinite(e) ? null : e;
}
function sr(e) {
  const t = J(e);
  return t == null ? 0 : Math.trunc(t);
}
function re(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t.length > 0 ? t : null;
}
function sa(e, t) {
  return re(e) ?? t;
}
function ca(e) {
  return e == null || !Number.isFinite(e) ? null : e < 0 ? 0 : e > 1 ? 1 : e;
}
function la(e) {
  return e.split(/[\s_-]+/).filter(Boolean).map(
    (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
  ).join(" ");
}
function ua(e) {
  const t = li(e);
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
function li(e) {
  const t = re(e);
  if (!t)
    return null;
  const n = ui(t);
  return n || la(t);
}
function ui(e) {
  const t = e.trim();
  if (!t.startsWith("{") && !t.startsWith("["))
    return null;
  try {
    const n = JSON.parse(t), r = di(n), a = n && typeof n == "object" ? re(
      n.provider ?? n.source
    ) : null;
    if (r.length && a)
      return `${la(a)} (${r.join(", ")})`;
    if (r.length)
      return `FX (${r.join(", ")})`;
  } catch {
    return null;
  }
  return null;
}
function di(e) {
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
function fi(e) {
  if (!e)
    return null;
  const t = re(e.uuid) ?? `${ci}-${e.name ?? "0"}`, n = sa(e.name, "Unbenanntes Konto"), r = re(e.currency_code), a = J(e.balance), o = J(e.orig_balance), i = "coverage_ratio" in e ? ca(J(e.coverage_ratio)) : null, c = re(e.provenance), s = re(e.metric_run_uuid), l = e.fx_unavailable === !0, u = J(e.fx_rate), d = re(e.fx_rate_source), h = re(e.fx_rate_timestamp), f = [], m = ua(c);
  m && f.push(m);
  const g = {
    uuid: t,
    name: n,
    currency_code: r,
    balance: a,
    orig_balance: o,
    fx_unavailable: l,
    coverage_ratio: i,
    provenance: c,
    metric_run_uuid: null,
    fx_rate: u,
    fx_rate_source: d,
    fx_rate_timestamp: h,
    badges: f
  }, b = typeof s == "string" ? s : null;
  return g.metric_run_uuid = b, g;
}
function pi(e) {
  if (!e)
    return null;
  const t = re(e.uuid);
  if (!t)
    return null;
  const n = sa(e.name, "Unbenanntes Depot"), r = sr(e.position_count), a = sr(e.missing_value_positions), o = J(e.current_value), i = J(e.purchase_sum) ?? J(e.purchase_value_eur) ?? J(e.purchase_value) ?? 0, c = J(e.day_change_abs) ?? null, s = J(e.day_change_pct) ?? null, l = Me(e.performance), u = l?.gain_abs ?? null, d = l?.gain_pct ?? null, h = l?.day_change ?? null;
  let f = c ?? (h?.value_change_eur != null ? J(h.value_change_eur) : null), m = s ?? (h?.change_pct != null ? J(h.change_pct) : null);
  if (f == null && m != null && o != null) {
    const E = o / (1 + m / 100);
    E && (f = o - E);
  }
  if (m == null && f != null && o != null) {
    const E = o - f;
    E && (m = f / E * 100);
  }
  const g = o != null, b = e.has_current_value === !1 || !g, p = "coverage_ratio" in e ? ca(J(e.coverage_ratio)) : null, y = re(e.provenance), _ = re(e.metric_run_uuid), v = [], S = ua(y);
  S && v.push(S);
  const w = {
    uuid: t,
    name: n,
    position_count: r,
    current_value: o,
    purchase_sum: i,
    day_change_abs: f ?? null,
    day_change_pct: m ?? null,
    gain_abs: u,
    gain_pct: d,
    hasValue: g,
    fx_unavailable: b || a > 0,
    missing_value_positions: a,
    performance: l,
    coverage_ratio: p,
    provenance: y,
    metric_run_uuid: null,
    badges: v
  }, C = typeof _ == "string" ? _ : null;
  return w.metric_run_uuid = C, w;
}
function da() {
  const { accounts: e } = oa();
  return e.map(fi).filter((t) => !!t);
}
function hi() {
  const { portfolios: e } = oa();
  return e.map(pi).filter((t) => !!t);
}
function fa(e, t = {}) {
  if (!e || e.length === 0)
    return "";
  const n = ["meta-badges", t.containerClass].filter(Boolean).join(" "), r = e.map((a) => {
    const o = `meta-badge--${a.tone}`, i = a.description ? ` title="${x(a.description)}"` : "";
    return `<span class="meta-badge ${o}"${i}>${x(
      a.label
    )}</span>`;
  }).join("");
  return `<span class="${n}">${r}</span>`;
}
function Ct(e, t, n = {}) {
  const r = fa(t, n);
  if (!r)
    return x(e);
  const a = n.labelClass ?? "name-with-badges__label";
  return `<span class="${["name-with-badges", n.containerClass].filter(Boolean).join(" ")}"><span class="${a}">${x(
    e
  )}</span>${r}</span>`;
}
const mi = 2;
function _e(e) {
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
    const a = r.lastIndexOf(","), o = r.lastIndexOf(".");
    let i = r;
    const c = a !== -1, s = o !== -1;
    if (c && (!s || a > o))
      if (s)
        i = i.replace(/\./g, "").replace(",", ".");
      else {
        const d = i.split(","), h = d[d.length - 1]?.length ?? 0, f = d.slice(0, -1).join(""), m = f.replace(/[+-]/g, "").length, g = d.length > 2, b = /^[-+]?0$/.test(f);
        i = g || h === 0 || h === 3 && m > 0 && m <= 3 && !b ? i.replace(/,/g, "") : i.replace(",", ".");
      }
    else s && c && o > a ? i = i.replace(/,/g, "") : s && i.length - o - 1 === 3 && /\d{4,}/.test(i.replace(/\./g, "")) && (i = i.replace(/\./g, ""));
    if (i === "-" || i === "+")
      return null;
    const l = Number.parseFloat(i);
    if (Number.isFinite(l))
      return l;
    const u = Number.parseFloat(r.replace(",", "."));
    if (Number.isFinite(u))
      return u;
  }
  return null;
}
function Un(e, { decimals: t = mi, fallback: n = null } = {}) {
  const r = _e(e);
  if (r == null)
    return n ?? null;
  const a = 10 ** t, o = Math.round(r * a) / a;
  return Object.is(o, -0) ? 0 : o;
}
function cr(e, t = {}) {
  return Un(e, t);
}
function gi(e, t = {}) {
  return Un(e, t);
}
const Ee = /* @__PURE__ */ new Map();
function we(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t.length > 0 ? t : null;
}
function U(e) {
  if (e === null)
    return null;
  const t = _e(e);
  return Number.isFinite(t ?? NaN) ? t : null;
}
function yi(e) {
  if (!e || typeof e != "object")
    return !1;
  const t = e;
  return typeof t.security_uuid == "string" && typeof t.name == "string" && typeof t.current_holdings == "number" && typeof t.purchase_value == "number" && typeof t.current_value == "number";
}
function Oe(e) {
  const t = { ...e };
  return e.average_cost && typeof e.average_cost == "object" && (t.average_cost = { ...e.average_cost }), e.performance && typeof e.performance == "object" && (t.performance = { ...e.performance }), e.aggregation && typeof e.aggregation == "object" && (t.aggregation = { ...e.aggregation }), e.data_state && typeof e.data_state == "object" && (t.data_state = { ...e.data_state }), t;
}
function bi(e, t, n = []) {
  if (!t || typeof t != "object")
    return t;
  const r = {
    ...e && typeof e == "object" ? e : {},
    ...t
  };
  return n.forEach((a) => {
    const o = e?.[a];
    o != null && (r[a] = o);
  }), r;
}
function _i(e, t) {
  const n = e ? Oe(e) : {}, r = [
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
    const d = l[u];
    d !== void 0 && (s[u] = d);
  };
  r.forEach((s) => {
    a(n, t, s);
  });
  const o = (s) => {
    const l = t[s];
    if (l && typeof l == "object") {
      const u = e && e[s] && typeof e[s] == "object" ? e[s] : {};
      n[s] = {
        ...u,
        ...l
      };
    } else l !== void 0 && (n[s] = l);
  }, i = t.performance, c = e && e.performance && typeof e.performance == "object" ? e.performance : void 0;
  return i !== void 0 && (n.performance = bi(c, i, [
    "gain_pct",
    "total_change_pct"
  ])), o("aggregation"), o("average_cost"), o("data_state"), n;
}
function At(e, t) {
  if (!e)
    return [];
  if (!Array.isArray(t))
    return Ee.delete(e), [];
  if (t.length === 0)
    return Ee.set(e, []), [];
  const n = Ee.get(e) ?? [], r = new Map(
    n.filter((o) => o.security_uuid).map((o) => [o.security_uuid, o])
  ), a = t.filter((o) => !!o).map((o) => {
    const i = o.security_uuid ?? "", c = i ? r.get(i) : void 0;
    return _i(c, o);
  }).map(Oe);
  return Ee.set(e, a), a.map(Oe);
}
function Ot(e) {
  return e ? Ee.has(e) : !1;
}
function pa(e) {
  if (!e)
    return [];
  const t = Ee.get(e);
  return t ? t.map(Oe) : [];
}
function vi() {
  Ee.clear();
}
function Si() {
  return new Map(
    Array.from(Ee.entries(), ([e, t]) => [
      e,
      t.map(Oe)
    ])
  );
}
function Ye(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e, n = U(t.native), r = U(t.security), a = U(t.account), o = U(t.eur), i = U(t.coverage_ratio);
  if (n == null && r == null && a == null && o == null && i == null)
    return null;
  const c = we(t.source);
  return {
    native: n,
    security: r,
    account: a,
    eur: o,
    source: c === "totals" || c === "eur_total" ? c : "aggregation",
    coverage_ratio: i
  };
}
function On(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e, n = U(t.total_holdings), r = U(t.positive_holdings), a = U(t.purchase_value_eur), o = U(t.purchase_total_security) ?? U(t.security_currency_total), i = U(t.purchase_total_account) ?? U(t.account_currency_total);
  let c = 0;
  if (typeof t.purchase_value_cents == "number")
    c = Number.isFinite(t.purchase_value_cents) ? Math.trunc(t.purchase_value_cents) : 0;
  else if (typeof t.purchase_value_cents == "string") {
    const l = Number.parseInt(t.purchase_value_cents, 10);
    Number.isFinite(l) && (c = l);
  }
  return n != null || r != null || a != null || o != null || i != null || c !== 0 ? {
    total_holdings: n ?? 0,
    positive_holdings: r ?? 0,
    purchase_value_cents: c,
    purchase_value_eur: a ?? 0,
    security_currency_total: o ?? 0,
    account_currency_total: i ?? 0,
    purchase_total_security: o ?? 0,
    purchase_total_account: i ?? 0
  } : null;
}
function wi(e) {
  if (!e || typeof e != "object")
    return null;
  const t = yi(e) ? Oe(e) : e, n = we(t.security_uuid), r = we(t.name), a = _e(t.current_holdings), o = cr(t.current_value), i = On(t.aggregation), c = t.aggregation && typeof t.aggregation == "object" ? t.aggregation : null, s = U(t.purchase_value_eur) ?? U(c?.purchase_value_eur) ?? U(c?.purchase_total_account) ?? U(c?.account_currency_total) ?? cr(t.purchase_value);
  if (!n || !r || a == null || s == null || o == null)
    return null;
  const l = {
    security_uuid: n,
    name: r,
    portfolio_uuid: we(t.portfolio_uuid) ?? we(t.portfolioUuid) ?? void 0,
    currency_code: we(t.currency_code),
    current_holdings: a,
    purchase_value: s,
    current_value: o
  }, u = Ye(t.average_cost);
  u && (l.average_cost = u), i && (l.aggregation = i);
  const d = Me(t.performance);
  if (d)
    l.performance = d, l.gain_abs = typeof d.gain_abs == "number" ? d.gain_abs : null, l.gain_pct = typeof d.gain_pct == "number" ? d.gain_pct : null;
  else {
    const _ = U(t.gain_abs), v = U(t.gain_pct);
    _ !== null && (l.gain_abs = _), v !== null && (l.gain_pct = v);
  }
  "coverage_ratio" in t && (l.coverage_ratio = U(t.coverage_ratio));
  const h = we(t.provenance);
  h && (l.provenance = h);
  const f = we(t.metric_run_uuid);
  (f || t.metric_run_uuid === null) && (l.metric_run_uuid = f ?? null);
  const m = U(t.last_price_native);
  m !== null && (l.last_price_native = m);
  const g = U(t.last_price_eur);
  g !== null && (l.last_price_eur = g);
  const b = U(t.last_close_native);
  b !== null && (l.last_close_native = b);
  const p = U(t.last_close_eur);
  p !== null && (l.last_close_eur = p);
  const y = t.data_state && typeof t.data_state == "object" ? { ...t.data_state } : void 0;
  return y && (l.data_state = y), l;
}
function Bt(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = wi(n);
    r && t.push(r);
  }
  return t;
}
function ha(e, t, n, r) {
  e[t] = {
    previous: n,
    current: r
  };
}
const he = /* @__PURE__ */ new Map(), Qe = /* @__PURE__ */ new Map();
function Ci(e) {
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
function Ke(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t.length > 0 ? t : null;
}
function Ie(e) {
  return typeof e == "number" && Number.isFinite(e) ? e : void 0;
}
function Ai(e) {
  return e === null ? null : Ie(e);
}
function Ei(e) {
  return e === null ? null : Ke(e);
}
function lr(e) {
  return (e ?? []).filter(
    (t) => !t.key.endsWith("-coverage") && !t.key.startsWith("provenance-")
  );
}
function ur(e) {
  return Me(e.performance);
}
const xi = 500, Pi = 10, Di = "pp-reader:portfolio-positions-updated", $i = "pp-reader:diagnostics", Xt = /* @__PURE__ */ new Map(), ma = [
  "coverage_ratio",
  "provenance",
  "metric_run_uuid",
  "generated_at"
], gn = /* @__PURE__ */ new Map();
function Ni(e, t) {
  return `${e}:${t}`;
}
function ki(e) {
  if (e === void 0)
    return;
  if (e === null)
    return null;
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  const t = Ai(e);
  if (t === null)
    return null;
  if (typeof t == "number" && Number.isFinite(t))
    return t;
}
function Zt(e) {
  if (e !== void 0)
    return Ei(e);
}
function Bn(e, t, n, r) {
  const a = {}, o = ki(e);
  o !== void 0 && (a.coverage_ratio = o);
  const i = Zt(t);
  i !== void 0 && (a.provenance = i);
  const c = Zt(n);
  c !== void 0 && (a.metric_run_uuid = c);
  const s = Zt(r);
  return s !== void 0 && (a.generated_at = s), Object.keys(a).length > 0 ? a : null;
}
function Ti(e, t) {
  const n = {};
  let r = !1;
  for (const a of ma) {
    const o = e?.[a], i = t[a];
    o !== i && (ha(n, a, o, i), r = !0);
  }
  return r ? n : null;
}
function Li(e) {
  const t = {};
  let n = !1;
  for (const r of ma) {
    const a = e[r];
    a !== void 0 && (ha(t, r, a, void 0), n = !0);
  }
  return n ? t : null;
}
function dr(e) {
  if (Object.keys(e.changed).length) {
    try {
      console.debug("pp-reader:diagnostics", e);
    } catch {
    }
    if (!(typeof window > "u" || typeof window.dispatchEvent != "function"))
      try {
        window.dispatchEvent(new CustomEvent($i, { detail: e }));
      } catch (t) {
        console.warn("updateConfigsWS: Diagnostics-Event konnte nicht gesendet werden", t);
      }
  }
}
function Wn(e, t, n, r) {
  const a = Ni(e, n), o = Xt.get(a);
  if (!r) {
    if (!o)
      return;
    Xt.delete(a);
    const c = Li(o);
    if (!c)
      return;
    dr({
      kind: e,
      uuid: n,
      source: t,
      changed: c,
      snapshot: {},
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    return;
  }
  const i = Ti(o, r);
  i && (Xt.set(a, { ...r }), dr({
    kind: e,
    uuid: n,
    source: t,
    changed: i,
    snapshot: { ...r },
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  }));
}
function Ri(e) {
  if (!(!e || e.length === 0))
    for (const t of e) {
      const n = Ke(t.uuid);
      if (!n)
        continue;
      const r = Bn(
        t.coverage_ratio,
        t.provenance,
        t.metric_run_uuid,
        void 0
      );
      Wn("account", "accounts", n, r);
    }
}
function Fi(e) {
  if (!(!e || e.length === 0))
    for (const t of e) {
      const n = Ke(t.uuid);
      if (!n)
        continue;
      const r = Bn(
        t.coverage_ratio,
        t.provenance,
        t.metric_run_uuid,
        void 0
      );
      Wn("portfolio", "portfolio_values", n, r);
    }
}
function Mi(e, t) {
  if (!t)
    return;
  const n = Bn(
    t.coverage_ratio ?? t.normalized_payload?.coverage_ratio,
    t.provenance ?? t.normalized_payload?.provenance,
    t.metric_run_uuid ?? t.normalized_payload?.metric_run_uuid,
    t.normalized_payload?.generated_at
  );
  Wn("portfolio_positions", "portfolio_positions", e, n);
}
function Ii(e, t) {
  return `<div class="error">${x(Ci(e))} ${at(t)}</div>`;
}
function Hi(e, t, n) {
  const r = e.querySelector("table.sortable-positions");
  if (!r) return;
  const a = e.dataset.sortKey || r.dataset.defaultSort || "name", i = (e.dataset.sortDir || r.dataset.defaultDir || "asc") === "desc" ? "desc" : "asc";
  e.dataset.sortKey = a, e.dataset.sortDir = i;
  try {
    ta(r, a, i, !0);
  } catch (l) {
    console.warn("restoreSortAndInit: sortTableRows Fehler:", l);
  }
  const { attachPortfolioPositionsSorting: c, attachSecurityDetailListener: s } = Hn();
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
function ga(e, t, n, r) {
  if (!e || !t)
    return { applied: !1, reason: "invalid" };
  const a = e.querySelector(
    `.portfolio-table .portfolio-details[data-portfolio="${t}"]`
  );
  if (!a)
    return { applied: !1, reason: "missing" };
  const o = a.querySelector(".positions-container");
  if (!o)
    return { applied: !1, reason: "missing" };
  if (a.classList.contains("hidden"))
    return { applied: !1, reason: "hidden" };
  if (r)
    return o.innerHTML = Ii(r, t), { applied: !0 };
  const i = o.dataset.sortKey, c = o.dataset.sortDir;
  return o.innerHTML = ba(n), i && (o.dataset.sortKey = i), c && (o.dataset.sortDir = c), Hi(o, e, t), { applied: !0 };
}
function Yn(e, t) {
  const n = he.get(t);
  if (!n) return !1;
  const r = ga(
    e,
    t,
    n.positions,
    n.error
  );
  return r.applied && he.delete(t), r.applied;
}
function Vi(e) {
  let t = !1;
  for (const [n] of he)
    Yn(e, n) && (t = !0);
  return t;
}
function ya(e, t) {
  const n = Qe.get(t) ?? {
    attempts: 0,
    timer: null
  };
  n.timer || (n.timer = setTimeout(() => {
    n.timer = null, n.attempts += 1;
    const r = Yn(e, t);
    r || n.attempts >= Pi ? (Qe.delete(t), r || he.delete(t)) : ya(e, t);
  }, xi), Qe.set(t, n));
}
function zi(e, t) {
  console.log("updateConfigsWS: Kontodaten-Update erhalten:", e);
  const n = Array.isArray(e) ? e : [];
  if (aa(n), Ri(n), !t)
    return;
  const r = da();
  qi(r, t);
  const a = t.querySelector(".portfolio-table table"), o = a ? Array.from(
    a.querySelectorAll("tbody tr.portfolio-row")
  ).map((i) => {
    const c = i.dataset.currentValue, s = c ? Number.parseFloat(c) : Number.NaN;
    if (Number.isFinite(s))
      return {
        current_value: s
      };
    const l = i.cells.item(3), u = mt(l?.textContent);
    return {
      current_value: Number.isFinite(u) ? u : 0
    };
  }) : [];
  _a(r, o, t);
}
function qi(e, t) {
  const n = t.querySelector(".account-table"), r = t.querySelector(".fx-account-table"), a = e.filter((i) => (i.currency_code || "EUR") === "EUR"), o = e.filter((i) => (i.currency_code || "EUR") !== "EUR");
  if (n) {
    const i = a.map((c) => ({
      name: Ct(c.name, lr(c.badges), {
        containerClass: "account-name",
        labelClass: "account-name__label"
      }),
      balance: c.balance ?? null
    }));
    n.innerHTML = $e(
      i,
      [
        { key: "name", label: "Name" },
        { key: "balance", label: "Kontostand (EUR)", align: "right" }
      ],
      ["balance"]
    );
  } else
    console.warn("updateAccountTable: .account-table nicht gefunden.");
  if (r) {
    const i = o.map((c) => {
      const s = c.orig_balance, l = typeof s == "number" && Number.isFinite(s), u = Ke(c.currency_code), d = l ? s.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) : null, h = d ? u ? `${d} ${x(u)}` : d : "";
      return {
        name: Ct(c.name, lr(c.badges), {
          containerClass: "account-name",
          labelClass: "account-name__label"
        }),
        fx_display: h,
        balance: c.balance ?? null
      };
    });
    r.innerHTML = $e(
      i,
      [
        { key: "name", label: "Name" },
        { key: "fx_display", label: "Betrag (FX)" },
        { key: "balance", label: "EUR", align: "right" }
      ],
      ["balance"]
    );
  } else o.length && console.warn("updateAccountTable: .fx-account-table nicht gefunden, obwohl FX-Konten vorhanden sind.");
}
function Ui(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = jr(n);
    r && t.push(r);
  }
  return t;
}
function Oi(e, t) {
  if (!Array.isArray(e)) {
    console.warn("handlePortfolioUpdate: Update ist kein Array:", e);
    return;
  }
  try {
    console.debug("handlePortfolioUpdate: payload=", e);
  } catch {
  }
  const n = Ui(e);
  if (n.length && ai(n), Fi(n), !t)
    return;
  const r = t.querySelector(".portfolio-table table") || t.querySelector("table.expandable-portfolio-table");
  if (!r) {
    const d = !t.querySelector(".portfolio-table") && (t.querySelector(".security-range-selector") || t.querySelector(".security-detail-placeholder"));
    console.debug(
      d ? "handlePortfolioUpdate: Übersicht nicht aktiv – Update wird später angewendet." : "handlePortfolioUpdate: Keine Portfolio-Tabelle gefunden (Tab inaktiv?)."
    );
    return;
  }
  const a = r.tBodies.item(0) ?? r.querySelector("tbody");
  if (!a) {
    console.warn("handlePortfolioUpdate: Kein <tbody> in Tabelle.");
    return;
  }
  const o = /* @__PURE__ */ new Map();
  a.querySelectorAll("tr.portfolio-row").forEach((u) => {
    const d = u.dataset.portfolio;
    d && o.set(d, u);
  });
  let c = 0;
  const s = (u) => {
    const d = typeof u == "number" && Number.isFinite(u) ? u : 0;
    try {
      return d.toLocaleString("de-DE");
    } catch {
      return d.toString();
    }
  }, l = /* @__PURE__ */ new Map();
  for (const u of n) {
    const d = Ke(u.uuid);
    d && l.set(d, u);
  }
  for (const [u, d] of l.entries()) {
    const h = o.get(u);
    if (!h)
      continue;
    if (h.cells.length < 5) {
      console.warn("handlePortfolioUpdate: Unerwartetes Spaltenlayout", h.cells.length, "(erwartet mindestens 5 für gestapelte Spalten)");
      continue;
    }
    const f = h.cells.item(1), m = h.cells.item(2), g = h.cells.item(3), b = h.cells.item(4);
    if (!f || !m)
      continue;
    const p = typeof d.position_count == "number" && Number.isFinite(d.position_count) ? d.position_count : 0, y = typeof d.current_value == "number" && Number.isFinite(d.current_value) ? d.current_value : null, _ = Me(d.performance), v = typeof _?.gain_abs == "number" ? _.gain_abs : null, S = typeof _?.gain_pct == "number" ? _.gain_pct : null, w = typeof d.purchase_sum == "number" && Number.isFinite(d.purchase_sum) ? d.purchase_sum : typeof d.purchase_value == "number" && Number.isFinite(d.purchase_value) ? d.purchase_value : null, C = _?.day_change ?? null, E = Ie(d.day_change_abs) ?? Ie(C?.value_change_eur) ?? Ie(C?.price_change_eur), $ = Ie(d.day_change_pct) ?? Ie(C?.change_pct);
    let D = E ?? null, A = $ ?? null;
    if (D == null && A != null && y != null) {
      const ie = y / (1 + A / 100);
      ie && (D = y - ie);
    }
    if (A == null && D != null && y != null) {
      const ie = y - D;
      ie && (A = D / ie * 100);
    }
    const P = typeof d.missing_value_positions == "number" && Number.isFinite(d.missing_value_positions) ? d.missing_value_positions : 0, I = y !== null, j = d.has_current_value === !1 || P > 0 || !I, F = m.querySelector(".val-bottom [data-val]"), z = F ? mt(F.getAttribute("data-val")) : 0;
    mt(f.textContent) !== p && (f.textContent = s(p));
    const L = {
      fx_unavailable: j,
      current_value: y,
      performance: _
    }, Y = { hasValue: I }, oe = Q("purchase_value", w, L, Y), Z = Q("current_value", L.current_value, L, Y), K = `
      <div class="cell-stack">
        <span class="val-top" data-val="${String(w ?? 0)}">${oe}</span>
        <span class="val-bottom" data-val="${String(y ?? 0)}">${Z}</span>
      </div>
    `, te = typeof y == "number" ? y : 0;
    if ((Math.abs(z - te) >= 5e-3 || m.innerHTML.trim() !== K.trim()) && (m.innerHTML = K, h.classList.add("flash-update"), setTimeout(() => {
      h.classList.remove("flash-update");
    }, 800)), g) {
      const ie = Q("day_change_abs", D, L, Y), je = Q("day_change_pct", A, L, Y), Ge = `
        <div class="cell-stack">
          <span class="val-top" data-val="${String(D ?? 0)}">${ie}</span>
          <span class="val-bottom" data-val="${String(A ?? 0)}">${je}</span>
        </div>
      `;
      g.innerHTML = Ge;
    }
    if (b) {
      const ie = Q("gain_abs", v, L, Y), je = Q("gain_pct", S, L, Y), Ge = `
        <div class="cell-stack">
          <span class="val-top" data-val="${String(v ?? 0)}">${ie}</span>
          <span class="val-bottom" data-val="${String(S ?? 0)}">${je}</span>
        </div>
      `;
      b.innerHTML = Ge;
    }
    h.dataset.positionCount = p.toString(), h.dataset.purchaseSum = w != null ? w.toString() : "", h.dataset.currentValue = I ? te.toString() : "", h.dataset.dayChange = I && D != null ? D.toString() : "", h.dataset.dayChangePct = I && A != null ? A.toString() : "", h.dataset.gainAbs = v != null ? v.toString() : "", h.dataset.gainPct = S != null ? S.toString() : "", h.dataset.hasValue = I ? "true" : "false", h.dataset.fxUnavailable = j ? "true" : "false", h.dataset.coverageRatio = typeof d.coverage_ratio == "number" && Number.isFinite(d.coverage_ratio) ? d.coverage_ratio.toString() : "", h.dataset.provenance = typeof d.provenance == "string" ? d.provenance : "", h.dataset.metricRunUuid = typeof d.metric_run_uuid == "string" ? d.metric_run_uuid : "", c += 1;
  }
  if (c === 0)
    console.debug("handlePortfolioUpdate: Keine passenden Zeilen gefunden / keine Änderungen.");
  else {
    const u = c.toLocaleString("de-DE");
    console.debug(`handlePortfolioUpdate: ${u} Zeile(n) gepatcht.`);
  }
  try {
    Ki(r);
  } catch (u) {
    console.warn("handlePortfolioUpdate: Fehler bei Summen-Neuberechnung:", u);
  }
  try {
    const u = (...b) => {
      for (const p of b) {
        if (!p) continue;
        const y = t.querySelector(p);
        if (y) return y;
      }
      return null;
    }, d = u(
      ".account-table table",
      ".accounts-eur-table table",
      ".accounts-table table"
    ), h = u(
      ".fx-account-table table",
      ".accounts-fx-table table"
    ), f = (b, p) => {
      if (!b) return [];
      const y = b.querySelectorAll("tbody tr.account-row");
      return (y.length ? Array.from(y) : Array.from(b.querySelectorAll("tbody tr:not(.footer-row)"))).map((v) => {
        const S = p ? v.cells.item(2) : v.cells.item(1);
        return { balance: mt(S?.textContent) };
      });
    }, m = [
      ...f(d, !1),
      ...f(h, !0)
    ], g = Array.from(
      r.querySelectorAll("tbody tr.portfolio-row")
    ).map((b) => {
      const p = b.dataset.currentValue, y = b.dataset.purchaseSum, _ = p ? Number.parseFloat(p) : Number.NaN, v = y ? Number.parseFloat(y) : Number.NaN;
      return {
        current_value: Number.isFinite(_) ? _ : 0,
        purchase_sum: Number.isFinite(v) ? v : 0
      };
    });
    _a(m, g, t);
  } catch (u) {
    console.warn("handlePortfolioUpdate: Fehler bei Total-Neuberechnung:", u);
  }
}
function Bi(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e.portfolio_uuid;
  if (typeof t == "string" && t)
    return t;
  const n = e.portfolioUuid;
  return typeof n == "string" && n ? n : null;
}
function yn(e) {
  gn.delete(e);
}
function fr(e) {
  return typeof e != "number" || !Number.isInteger(e) || e <= 0 ? null : e;
}
function Wi(e, t, n, r) {
  if (!n || n <= 1 || !t)
    return yn(e), r;
  const a = n, o = gn.get(e) ?? { expected: a, chunks: /* @__PURE__ */ new Map() };
  if (o.expected !== a && (o.chunks.clear(), o.expected = a), o.chunks.set(t, r), gn.set(e, o), o.chunks.size < a)
    return null;
  const i = [];
  for (let c = 1; c <= a; c += 1) {
    const s = o.chunks.get(c);
    s && Array.isArray(s) && i.push(...s);
  }
  return yn(e), i;
}
function pr(e, t) {
  const n = Bi(e);
  if (!n)
    return console.warn("handlePortfolioPositionsUpdate: Ungültiges Update:", e), !1;
  const r = e?.error, a = fr(e?.chunk_index), o = fr(e?.chunk_count), i = Bt(e?.positions ?? []);
  r && yn(n);
  const c = r ? i : Wi(n, a, o, i);
  if (!r && c === null)
    return !0;
  const s = r ? i : c ?? [];
  Mi(n, e);
  const l = Ot(n);
  let u = s;
  if (!r && l) {
    const h = At(n, s);
    wt(n, h), u = h;
  }
  const d = ga(t, n, u, r);
  if (d.applied) {
    if (he.delete(n), !r && !l) {
      const h = At(n, u);
      wt(n, h);
    }
  } else
    r || d.reason !== "hidden" || l ? (he.set(n, { positions: u, error: r }), ya(t, n)) : (he.delete(n), Qe.delete(n));
  if (!r && i.length > 0) {
    const h = Array.from(
      new Set(
        i.map((f) => f.security_uuid).filter((f) => typeof f == "string" && f.length > 0)
      )
    );
    if (h.length && typeof window < "u")
      try {
        window.dispatchEvent(
          new CustomEvent(
            Di,
            {
              detail: {
                portfolioUuid: n,
                securityUuids: h
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
function Yi(e, t) {
  if (Array.isArray(e)) {
    let n = !1;
    for (const r of e)
      pr(r, t) && (n = !0);
    !n && e.length && console.warn("handlePortfolioPositionsUpdate: Kein gültiges Element im Array:", e);
    return;
  }
  pr(e, t);
}
function ba(e) {
  const { renderPositionsTable: t, applyGainPctMetadata: n } = Hn();
  try {
    if (typeof t == "function") {
      const o = t(e);
      if (o)
        return o;
      console.warn("renderPositionsTableInline: renderPositionsTable returned empty/falsy result");
    } else
      console.warn("renderPositionsTableInline: renderPositionsTable is not a function, falling back to basic rendering");
  } catch (o) {
    console.error("renderPositionsTableInline: renderPositionsTable threw an error, falling back to basic rendering:", o);
  }
  if (e.length === 0)
    return '<div class="no-positions">Keine Positionen vorhanden.</div>';
  const r = e.map((o) => {
    const i = ur(o);
    return {
      name: x(o.name),
      current_holdings: o.current_holdings,
      purchase_value: o.purchase_value,
      current_value: o.current_value,
      performance: i
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
    const o = document.createElement("template");
    o.innerHTML = a.trim();
    const i = o.content.querySelector("table");
    if (i) {
      i.classList.add("sortable-positions");
      const c = i.querySelectorAll("thead th"), s = ["name", "current_holdings", "purchase_value", "current_value", "gain_abs", "gain_pct"];
      c.forEach((d, h) => {
        const f = s[h];
        if (!f) return;
        d.setAttribute("data-sort-key", f), d.classList.add("sortable-col"), d.setAttribute("role", "button"), d.setAttribute("tabindex", "0"), d.setAttribute("aria-sort", "none");
        const m = d.textContent || "";
        d.setAttribute("aria-label", `${x(m)} sortieren`);
      }), i.querySelectorAll("tbody tr").forEach((d, h) => {
        if (d.classList.contains("footer-row"))
          return;
        const f = e[h];
        f.security_uuid && (d.dataset.security = f.security_uuid), d.classList.add("position-row");
      }), i.dataset.defaultSort = "name", i.dataset.defaultDir = "asc";
      const u = n;
      if (u)
        try {
          u(i);
        } catch (d) {
          console.warn("renderPositionsTableInline: applyGainPctMetadata failed", d);
        }
      else
        i.querySelectorAll("tbody tr").forEach((h, f) => {
          if (h.classList.contains("footer-row"))
            return;
          const m = h.cells.item(4);
          if (!m)
            return;
          const g = e[f], b = ur(g), p = typeof b?.gain_pct == "number" && Number.isFinite(b.gain_pct) ? b.gain_pct : null, y = p != null ? `${p.toLocaleString("de-DE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })} %` : "—", _ = p == null ? "neutral" : p > 0 ? "positive" : p < 0 ? "negative" : "neutral";
          m.dataset.gainPct = y, m.dataset.gainSign = _;
        });
      return i.outerHTML;
    }
  } catch (o) {
    console.warn("renderPositionsTableInline: Sortier-Metadaten Injection fehlgeschlagen:", o);
  }
  return a;
}
function Ki(e) {
  if (!e) return;
  const { updatePortfolioFooter: t } = Hn();
  if (typeof t == "function")
    try {
      t(e);
      return;
    } catch (p) {
      console.warn("updatePortfolioFooter: helper schlug fehl:", p);
    }
  const n = Array.from(e.querySelectorAll("tbody tr.portfolio-row")), r = (p) => {
    if (p === void 0)
      return null;
    const y = Number.parseFloat(p);
    return Number.isFinite(y) ? y : null;
  }, a = n.reduce(
    (p, y) => {
      const _ = r(y.dataset.positionCount);
      if (_ != null && (p.sumPositions += _), y.dataset.fxUnavailable === "true" && (p.fxUnavailable = !0), y.dataset.hasValue !== "true")
        return p.incompleteRows += 1, p;
      p.valueRows += 1;
      const v = r(y.dataset.currentValue), S = r(y.dataset.gainAbs), w = r(y.dataset.purchaseSum);
      return v == null || S == null || w == null ? (p.incompleteRows += 1, p) : (p.sumCurrent += v, p.sumGainAbs += S, p.sumPurchase += w, p);
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
  ), o = a.valueRows > 0 && a.incompleteRows === 0, i = o && a.sumPurchase > 0 ? a.sumGainAbs / a.sumPurchase * 100 : null;
  let c = e.querySelector("tr.footer-row");
  c || (c = document.createElement("tr"), c.className = "footer-row", e.querySelector("tbody")?.appendChild(c));
  const s = Math.round(a.sumPositions).toLocaleString("de-DE"), l = {
    fx_unavailable: a.fxUnavailable || !o,
    current_value: o ? a.sumCurrent : null,
    performance: o ? {
      gain_abs: a.sumGainAbs,
      gain_pct: i,
      total_change_eur: a.sumGainAbs,
      total_change_pct: i,
      source: "aggregated",
      coverage_ratio: 1
    } : null
  }, u = { hasValue: o }, d = Q("current_value", l.current_value, l, u), h = o ? a.sumGainAbs : null, f = o ? i : null, m = Q("gain_abs", h, l, u), g = Q("gain_pct", f, l, u);
  c.innerHTML = `
    <td>Summe</td>
    <td class="align-right">${s}</td>
    <td class="align-right">${d}</td>
    <td class="align-right">${m}</td>
    <td class="align-right">${g}</td>
  `;
  const b = c.cells.item(3);
  b && (b.dataset.gainPct = o && typeof i == "number" ? `${bn(i)} %` : "—", b.dataset.gainSign = o && typeof i == "number" ? i > 0 ? "positive" : i < 0 ? "negative" : "neutral" : "neutral"), c.dataset.positionCount = Math.round(a.sumPositions).toString(), c.dataset.currentValue = o ? a.sumCurrent.toString() : "", c.dataset.purchaseSum = o ? a.sumPurchase.toString() : "", c.dataset.gainAbs = o ? a.sumGainAbs.toString() : "", c.dataset.gainPct = o && typeof i == "number" ? i.toString() : "", c.dataset.hasValue = o ? "true" : "false", c.dataset.fxUnavailable = a.fxUnavailable || !o ? "true" : "false";
}
function hr(e) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  if (typeof e == "string") {
    const t = Number.parseFloat(e);
    return Number.isFinite(t) ? t : 0;
  }
  return 0;
}
function bn(e) {
  return (Un(e, { fallback: 0 }) ?? 0).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
function _a(e, t, n) {
  const r = n ?? document, o = (Array.isArray(e) ? e : []).reduce((d, h) => {
    const f = h.balance ?? h.current_value ?? h.value, m = hr(f);
    return d + m;
  }, 0), c = (Array.isArray(t) ? t : []).reduce((d, h) => {
    const f = h.current_value ?? h.value, m = hr(f);
    return d + m;
  }, 0), s = o + c, l = r.querySelector("#headerMeta");
  if (!l) {
    console.warn("updateTotalWealth: #headerMeta nicht gefunden.");
    return;
  }
  const u = l.querySelector("strong") || l.querySelector(".total-wealth-value");
  u ? u.textContent = `${bn(s)} €` : l.textContent = `💰 Gesamtvermögen: ${bn(s)} €`, l.dataset.totalWealthEur = s.toString();
}
function ji(e, t) {
  const n = typeof e == "string" ? e : e?.last_file_update, r = Ke(n) ?? "";
  if (!t) {
    console.warn("handleLastFileUpdate: root fehlt");
    return;
  }
  let a = t.querySelector(".footer-card .last-file-update") || t.querySelector(".last-file-update");
  if (!a) {
    const o = t.querySelector(".footer-card .meta") || t.querySelector("#headerMeta") || t.querySelector(".header-card .meta") || t.querySelector(".header-card");
    if (!o) {
      console.warn("handleLastFileUpdate: Kein Einfügepunkt gefunden.");
      return;
    }
    a = document.createElement("div"), a.className = "last-file-update", o.appendChild(a);
  }
  a.closest(".footer-card") ? a.innerHTML = r ? `📂 Letzte Aktualisierung der Datei: <strong>${x(r)}</strong>` : "📂 Letzte Aktualisierung der Datei: <strong>Unbekannt</strong>" : a.textContent = r ? `📂 Letzte Aktualisierung: ${r}` : "📂 Letzte Aktualisierung: Unbekannt";
}
function Nl(e) {
  if (e == null)
    return;
  const t = e.querySelector("table.sortable-positions");
  if (t == null)
    return;
  const n = e.dataset.sortKey || t.dataset.defaultSort || "name", a = (e.dataset.sortDir || t.dataset.defaultDir || "asc") === "desc" ? "desc" : "asc";
  e.dataset.sortKey = n, e.dataset.sortDir = a, ta(t, n, a, !0);
}
const kl = {
  getPortfolioPositionsCacheSnapshot: Si,
  clearPortfolioPositionsCache: vi,
  getPendingUpdateCount() {
    return he.size;
  },
  queuePendingUpdate(e, t, n) {
    he.set(e, { positions: t, error: n });
  },
  clearPendingUpdates() {
    he.clear(), Qe.clear();
  },
  renderPositionsTableInline: ba
};
function mt(e) {
  return e == null ? 0 : parseFloat(
    e.replace(/\u00A0/g, " ").replace(/[€%]/g, "").replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "")
  ) || 0;
}
const mr = 50;
function gr(e, t) {
  try {
    t();
  } catch (n) {
    console.warn(`addSwipeEvents: ${e} handler threw`, n);
  }
}
function Gi(e, t, n) {
  let r = null;
  const a = (l) => {
    l < -mr ? gr("left", t) : l > mr && gr("right", n);
  }, o = (l) => {
    l.touches.length === 1 && (r = l.touches[0].clientX);
  }, i = (l) => {
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
  e.addEventListener("touchstart", o, { passive: !0 }), e.addEventListener("touchend", i, { passive: !0 }), e.addEventListener("mousedown", c), e.addEventListener("mouseup", s);
}
function N(e, t = "EUR") {
  return e === null || typeof e > "u" ? "" : new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: t
  }).format(e);
}
function _n(e) {
  return e === null || typeof e > "u" ? "" : new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(e);
}
function G(e) {
  return e === null || typeof e > "u" ? "" : new Intl.NumberFormat("de-DE", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(e);
}
function va(e) {
  if (!e) return "";
  const t = new Date(e);
  return isNaN(t.getTime()) ? e : new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(t);
}
const Sa = "M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z", wa = "M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z", vn = `
<style>
  .portfolio-toggle .caret {
    display: inline-flex !important;
    align-items: center;
    justify-content: center;
    width: 24px !important;
    height: 24px !important;
  }
  .portfolio-toggle .caret svg {
    width: 24px;
    height: 24px;
    fill: currentColor;
    display: block;
  }
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
  .sort-item:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
    border-radius: 2px;
    opacity: 1;
  }
  .sort-item.sort-active {
    opacity: 1;
    font-weight: bold;
    color: var(--primary-color);
  }

  /* SVG Icon Styles */
  .sort-icon {
    width: 16px;
    height: 16px;
    fill: currentColor;
    display: inline-block;
    vertical-align: middle;
    margin-left: 2px;
    opacity: 0;
    transition: opacity 0.2s, transform 0.2s;
  }
  .sort-active .sort-icon {
    opacity: 1;
  }
  .sort-active.dir-desc .sort-icon {
    transform: rotate(180deg);
  }
  .sort-item:hover .sort-icon,
  .simple-sort-header:hover .sort-icon {
      opacity: 0.5;
  }
  .sort-item.sort-active:hover .sort-icon,
  .simple-sort-header.sort-active:hover .sort-icon {
      opacity: 1;
  }

  .simple-sort-header {
    cursor: pointer;
  }
  .simple-sort-header:hover {
    text-decoration: underline;
  }
  .simple-sort-header:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
    border-radius: 2px;
  }
  .simple-sort-header.sort-active {
     font-weight: bold;
     color: var(--primary-color);
  }

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

  .empty-state {
    padding: 32px;
    text-align: center;
    color: var(--secondary-text-color);
  }
  .empty-state__icon {
    opacity: 0.5;
    width: 48px;
    height: 48px;
    margin-bottom: 16px;
    fill: currentColor;
  }
  .empty-state__title {
    margin: 0;
    font-size: 1.1em;
  }
  .empty-state__text {
    margin: 4px 0 0 0;
    font-size: 0.9em;
    opacity: 0.8;
  }
</style>
`;
function B(e, t) {
  return `<span class="${e > 0 ? "positive" : e < 0 ? "negative" : "neutral"}">${t}</span>`;
}
const Xi = [
  "name",
  "current_holdings",
  "last_price",
  "average_price",
  "purchase_value",
  "current_value",
  "day_change_abs",
  "day_change_pct",
  "gain_abs",
  "gain_pct"
];
function Jt(e) {
  return Xi.includes(e);
}
function Qt(e) {
  return e === "asc" || e === "desc";
}
function Ca(e) {
  return (e ?? []).filter((t) => !t.key.endsWith("-coverage"));
}
function yr(e) {
  return Ca(e).filter(
    (t) => !t.key.startsWith("provenance-")
  );
}
let Et = null, xt = null;
const br = { min: 2, max: 6 };
function ke(e) {
  return _e(e);
}
function Zi(e) {
  return typeof e == "number" && Number.isFinite(e);
}
function Ji(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  if (!t)
    return null;
  const n = t.toUpperCase();
  return /^[A-Z]{3}$/.test(n) ? n : n === "€" ? "EUR" : null;
}
function _r(e, t, n = null) {
  for (const r of t) {
    const a = Ji(e[r]);
    if (a)
      return a;
  }
  return n;
}
function et(e, t) {
  return Zi(e) ? `${e.toLocaleString("de-DE", {
    minimumFractionDigits: br.min,
    maximumFractionDigits: br.max
  })}${t ? ` ${x(t)}` : ""}` : null;
}
function Qi(e) {
  const t = e, n = e.average_cost ?? null, r = e.aggregation ?? null, a = _r(
    t,
    [
      "security_currency_code",
      "security_currency",
      "native_currency_code",
      "native_currency"
    ],
    e.currency_code ?? null
  ), o = _r(
    t,
    [
      "account_currency_code",
      "account_currency",
      "purchase_currency_code",
      "currency_code"
    ],
    a === "EUR" ? "EUR" : null
  ) ?? "EUR", i = ke(n?.native), c = ke(n?.security), s = ke(n?.account), l = ke(n?.eur), u = c ?? i, d = l ?? (o === "EUR" ? s : null), h = a ?? o, f = h === "EUR";
  let m, g;
  f ? (m = "EUR", g = d ?? u ?? s ?? null) : u != null ? (m = h, g = u) : s != null ? (m = o, g = s) : (m = "EUR", g = d ?? null);
  const b = et(g, m), p = f ? null : et(d, "EUR"), y = !!p && p !== b, _ = [], v = [];
  b ? (_.push(
    `<span class="purchase-price purchase-price--primary">${b}</span>`
  ), v.push(b.replace(/\u00A0/g, " "))) : (_.push('<span class="missing-value" role="note" aria-label="Kein Kaufpreis verfügbar" title="Kein Kaufpreis verfügbar">—</span>'), v.push("Kein Kaufpreis verfügbar")), y && p && (_.push(
    `<span class="purchase-price purchase-price--secondary">${p}</span>`
  ), v.push(p.replace(/\u00A0/g, " ")));
  const S = _.join("<br>"), w = ke(r?.purchase_value_eur) ?? 0, C = v.join(", ");
  return { markup: S, sortValue: w, ariaLabel: C };
}
function es(e) {
  const t = ke(e.last_price_native), n = ke(e.last_price_eur), r = e.currency_code ?? "EUR", a = r === "EUR", o = [], i = [];
  let c = 0;
  if (a) {
    const s = t ?? n;
    if (c = s ?? 0, s != null) {
      const l = et(s, "EUR");
      l && (o.push(`<span class="val-top">${l}</span>`), i.push(l.replace(/\u00A0/g, " ")));
    }
  } else {
    if (t != null) {
      c = n ?? 0;
      const s = et(t, r);
      s && (o.push(`<span class="val-top">${s}</span>`), i.push(s.replace(/\u00A0/g, " ")));
    }
    if (n != null) {
      const s = et(n, "EUR");
      s && (o.push(`<span class="val-bottom">${s}</span>`), i.push(s.replace(/\u00A0/g, " ")));
    }
  }
  return o.length === 0 && (o.push('<span class="missing-value">—</span>'), i.push("Kein aktueller Kurs")), {
    markup: `<div class="cell-stack">${o.join("")}</div>`,
    sortValue: c,
    // Using EUR value for consistent sorting across different currencies
    ariaLabel: i.join(", ")
  };
}
function ts(e) {
  const t = _e(e.current_holdings);
  if (t == null)
    return { value: null, pct: null };
  const n = _e(
    e.last_price_eur
  ), r = _e(
    e.last_close_eur
  );
  let a = null, o = null;
  if (n != null && r != null) {
    a = (n - r) * t;
    const d = r * t;
    d && (o = a / d * 100);
  }
  const c = Me(e.performance)?.day_change ?? null;
  if (a == null && c?.price_change_eur != null && (a = c.price_change_eur * t), o == null && c?.change_pct != null && (o = c.change_pct), a == null && o != null) {
    const u = _e(e.current_value);
    if (u != null) {
      const d = u / (1 + o / 100);
      d && (a = u - d);
    }
  }
  const s = a != null && Number.isFinite(a) ? Math.round(a * 100) / 100 : null, l = o != null && Number.isFinite(o) ? Math.round(o * 100) / 100 : null;
  return { value: s, pct: l };
}
const Pt = /* @__PURE__ */ new Set();
function ns(e) {
  if (!e)
    return;
  Array.from(
    e.querySelectorAll("tbody tr")
  ).forEach((n) => {
    const r = n.cells.item(7), a = n.cells.item(8);
    if (!r || !a || r.dataset.gainPct && r.dataset.gainSign)
      return;
    const o = (a.textContent || "").trim() || "—";
    let i = "neutral";
    a.querySelector(".positive") ? i = "positive" : a.querySelector(".negative") && (i = "negative"), r.dataset.gainPct = o, r.dataset.gainSign = i;
  });
}
function it(e) {
  const t = e.filter(
    (d) => Number(d.current_holdings) > 0
  );
  if (t.length === 0)
    return vn + `
      <div class="empty-state">
        <svg class="empty-state__icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21,16.5C21,16.88 20.79,17.21 20.47,17.38L12.57,21.82C12.41,21.94 12.21,22 12,22C11.79,22 11.59,21.94 11.43,21.82L3.53,17.38C3.21,17.21 3,16.88 3,16.5V7.5C3,7.12 3.21,6.79 3.53,6.62L11.43,2.18C11.59,2.06 11.79,2 12,2C12.21,2 12.41,2.06 12.57,2.18L20.47,6.62C20.79,6.79 21,7.12 21,7.5V16.5M12,4.15L6.04,7.5L12,10.85L17.96,7.5L12,4.15M5,15.91L11,19.29V12.58L5,9.21V15.91M19,15.91V9.21L13,12.58V19.29L19,15.91Z" />
        </svg>
        <p class="empty-state__title">Keine Positionen vorhanden</p>
        <p class="empty-state__text">In diesem Depot befinden sich aktuell keine Wertpapiere.</p>
      </div>
    `;
  let n = 0, r = 0, a = 0, o = 0;
  const i = t.map((d) => {
    const h = Me(d.performance), f = typeof h?.gain_abs == "number" ? h.gain_abs : 0, m = typeof h?.gain_pct == "number" ? h.gain_pct : 0, g = ts(d), b = g.value ?? 0, p = g.pct ?? 0, y = typeof d.purchase_value == "number" ? d.purchase_value : 0, _ = typeof d.current_value == "number" ? d.current_value : 0;
    typeof d.purchase_value == "number" && (n += y), typeof d.current_value == "number" && (r += _), g.value != null && (a += b), typeof h?.gain_abs == "number" && (o += f);
    const v = V(
      y,
      N(y),
      _,
      N(_)
    ), S = V(
      b,
      B(b, N(b)),
      p,
      B(p, G(p / 100))
    ), w = V(
      f,
      B(f, N(f)),
      m,
      B(m, G(m / 100))
    ), { markup: C, sortValue: E } = Qi(d), { markup: $, sortValue: D } = es(d);
    return {
      _uuid: typeof d.security_uuid == "string" ? d.security_uuid : "",
      name: typeof d.name == "string" ? x(d.name) : typeof d.name == "number" ? String(d.name) : "",
      current_holdings: typeof d.current_holdings == "number" || typeof d.current_holdings == "string" ? d.current_holdings : null,
      last_price: `<span data-sort-value="${String(D)}">${$}</span>`,
      average_price: `<span data-sort-value="${String(E)}">${C}</span>`,
      // Stacked columns
      value_combo: v,
      day_combo: S,
      gain_combo: w
    };
  }), c = r - a !== 0 ? a / (r - a) * 100 : 0, s = n !== 0 ? o / n * 100 : 0, l = {
    name: "Summe",
    current_holdings: "",
    last_price: "",
    average_price: "",
    value_combo: V(
      n,
      N(n),
      r,
      N(r)
    ),
    day_combo: V(
      a,
      B(a, N(a)),
      c,
      B(c, G(c / 100))
    ),
    gain_combo: V(
      o,
      B(o, N(o)),
      s,
      B(s, G(s / 100))
    )
  }, u = [
    { key: "name", label: ce("Wertpapier", "name") },
    {
      key: "current_holdings",
      label: ce("Bestand", "current_holdings"),
      align: "right"
    },
    {
      key: "last_price",
      label: ce("Letzter Kurs", "last_price"),
      align: "right"
    },
    {
      key: "average_price",
      label: ce("Ø Kaufpreis", "average_price"),
      align: "right"
    },
    // Stacked Columns
    {
      key: "value_combo",
      label: fe(
        "Kaufwert",
        "purchase_value",
        "Aktueller Wert",
        "current_value"
      ),
      align: "right"
    },
    {
      key: "day_combo",
      label: fe(
        "Heute +/-",
        "day_change_abs",
        "Heute %",
        "day_change_pct"
      ),
      align: "right"
    },
    {
      key: "gain_combo",
      label: fe("Gesamt +/-", "gain_abs", "Gesamt %", "gain_pct"),
      align: "right"
    }
  ];
  return vn + $e(i, u, ["sortable-positions"], {
    sortable: !1,
    footerValues: l,
    rowAttributes: (d) => {
      const h = d._uuid, f = { class: "position-row" };
      return h && (f["data-security"] = h), f;
    }
  }).replace("<table", '<table class="sortable-positions"');
}
function rs(e) {
  const t = Bt(e ?? []);
  return it(t);
}
function as(e, t) {
  if (!t) return;
  const n = e.querySelector(
    `.portfolio-details[data-portfolio="${t}"]`
  );
  if (!n) return;
  const r = n.querySelector(
    ".positions-container"
  );
  r && (r.__ppReaderSecurityClickBound || (r.__ppReaderSecurityClickBound = !0, r.addEventListener("click", (a) => {
    const o = a.target;
    if (!(o instanceof Element))
      return;
    const i = o.closest("button, a");
    if (i && r.contains(i))
      return;
    const c = o.closest("tr[data-security]");
    if (!c || !r.contains(c))
      return;
    const s = c.getAttribute("data-security");
    if (s)
      try {
        vo(s) || console.warn(
          "attachSecurityDetailDelegation: Detail-Tab konnte nicht geöffnet werden für",
          s
        );
      } catch (l) {
        console.error(
          "attachSecurityDetailDelegation: Fehler beim Öffnen des Detail-Tabs",
          l
        );
      }
  })));
}
function st(e, t) {
  as(e, t);
}
function Aa(e) {
  if (console.debug(
    "buildExpandablePortfolioTable: render",
    e.length,
    "portfolios"
  ), e.length === 0)
    return `
      <div class="empty-state">
        <svg class="empty-state__icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
        </svg>
        <p class="empty-state__title">Keine Depots gefunden</p>
        <p class="empty-state__text">Bitte konfigurieren Sie Portfolio Performance in Home Assistant oder laden Sie eine Datei hoch.</p>
      </div>
    `;
  let t = '<table class="expandable-portfolio-table sortable-table"><thead><tr>';
  const n = [
    { key: "name", label: ce("Name", "name") },
    {
      key: "position_count",
      label: ce("Anzahl Positionen", "position_count"),
      align: "right"
    },
    {
      key: "value_combo",
      label: fe(
        "Kaufwert",
        ".val-top",
        "Aktueller Wert",
        ".val-bottom"
      ),
      align: "right"
    },
    {
      key: "day_combo",
      label: fe(
        "Heute +/-",
        ".val-top",
        "Heute %",
        ".val-bottom"
      ),
      align: "right"
    },
    {
      key: "gain_combo",
      label: fe(
        "Gesamt +/-",
        ".val-top",
        "Gesamt %",
        ".val-bottom"
      ),
      align: "right"
    }
  ];
  n.forEach((p) => {
    const y = p.align === "right" ? ' class="align-right"' : "";
    t += `<th${y}>${p.label}</th>`;
  }), t += "</tr></thead><tbody>", e.forEach((p) => {
    const y = Number.isFinite(p.position_count) ? p.position_count : 0, _ = Number.isFinite(p.purchase_sum) ? p.purchase_sum : 0, v = p.hasValue && typeof p.current_value == "number" && Number.isFinite(p.current_value) ? p.current_value : null, S = v !== null, w = p.performance, C = typeof p.gain_abs == "number" ? p.gain_abs : typeof w?.gain_abs == "number" ? w.gain_abs : null, E = typeof p.gain_pct == "number" ? p.gain_pct : typeof w?.gain_pct == "number" ? w.gain_pct : null, $ = w && typeof w == "object" ? w.day_change : null, D = typeof p.day_change_abs == "number" ? p.day_change_abs : $ && typeof $ == "object" ? $.value_change_eur ?? $.price_change_eur : null, A = typeof p.day_change_pct == "number" ? p.day_change_pct : $ && typeof $ == "object" && typeof $.change_pct == "number" ? $.change_pct : null, P = p.fx_unavailable && S, I = typeof p.provenance == "string" ? p.provenance : "", j = typeof p.metric_run_uuid == "string" ? p.metric_run_uuid : "", F = Pt.has(p.uuid), z = F ? "portfolio-toggle expanded" : "portfolio-toggle", H = `portfolio-details-${p.uuid}`, L = V(
      _,
      N(_),
      v ?? 0,
      v != null ? N(v) : "—"
    ), Y = V(
      D ?? 0,
      D != null ? B(D, N(D)) : "—",
      A ?? 0,
      A != null ? B(A, G(A / 100)) : "—"
    ), oe = V(
      C ?? 0,
      C != null ? B(C, N(C)) : "—",
      E ?? 0,
      E != null ? B(E, G(E / 100)) : "—"
    ), Z = S && typeof v == "number" ? v : "", K = S && typeof C == "number" ? C : "", te = S && typeof E == "number" ? E : "", ie = S && typeof D == "number" ? D : "", je = S && typeof A == "number" ? A : "", Ge = String(y);
    let Yt = "";
    p.fx_unavailable && (Yt += ' data-fx-unavailable="true"'), P && (Yt += ' data-partial="true"'), t += `<tr class="portfolio-row"
                  data-portfolio="${T(p.uuid)}"
                  data-position-count="${Ge}"
                  data-current-value="${T(Z)}"
                  data-purchase-sum="${T(_)}"
                  data-day-change="${T(ie)}"
                  data-day-change-pct="${T(je)}"
                  data-gain-abs="${T(K)}"
                data-gain-pct="${T(te)}"
                data-has-value="${S ? "true" : "false"}"
                data-provenance="${T(I)}"
                data-metric-run-uuid="${T(j)}"
                ${Yt}>`;
    const wo = x(p.name), Co = fa(Ca(p.badges), {
      containerClass: "portfolio-badges"
    });
    t += `<td>
        <button type="button"
                class="${z}"
                data-portfolio="${T(p.uuid)}"
                aria-expanded="${F ? "true" : "false"}"
                aria-controls="${T(H)}">
          <span class="caret" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="${F ? Sa : wa}" /></svg></span>
          <span class="portfolio-name">${wo}</span>${Co}
        </button>
      </td>`;
    const Ao = y.toLocaleString("de-DE");
    t += `<td class="align-right"><span data-val="${String(y)}">${Ao}</span></td>`, t += `<td class="align-right">${L}</td>`, t += `<td class="align-right">${Y}</td>`, t += `<td class="align-right">${oe}</td>`, t += "</tr>", t += `<tr class="portfolio-details${F ? "" : " hidden"}"
                data-portfolio="${T(p.uuid)}"
                id="${T(H)}"
                role="region"
                aria-label="Positionen für ${p.name}">
      <td colspan="${n.length.toString()}">
        <div class="positions-container">${F ? Ot(p.uuid) ? it(pa(p.uuid)) : zn("Lade Positionen...") : ""}</div>
      </td>
    </tr>`;
  });
  const r = e.filter(
    (p) => typeof p.current_value == "number" && Number.isFinite(p.current_value)
  ), a = e.reduce(
    (p, y) => p + (Number.isFinite(y.position_count) ? y.position_count : 0),
    0
  ), o = r.reduce((p, y) => typeof y.current_value == "number" && Number.isFinite(y.current_value) ? p + y.current_value : p, 0), i = r.reduce(
    (p, y) => p + (y.purchase_sum || 0),
    0
  ), c = r.map((p) => {
    const y = p.performance && typeof p.performance == "object" ? p.performance.day_change : null;
    if (typeof p.day_change_abs == "number") return p.day_change_abs;
    if (y && typeof y == "object") {
      const _ = y.value_change_eur;
      return typeof _ == "number" ? _ : 0;
    }
    return 0;
  }), s = c.reduce((p, y) => p + y, 0), l = r.reduce((p, y) => {
    if (typeof y.performance?.gain_abs == "number")
      return p + y.performance.gain_abs;
    const _ = y.current_value, v = y.purchase_sum;
    return p + (_ - v);
  }, 0), u = r.length > 0, h = c.length > 0 && u && o !== 0 ? (() => {
    const p = o - s;
    return p ? s / p * 100 : 0;
  })() : 0, f = u && i > 0 ? l / i * 100 : 0, m = V(
    i,
    N(i),
    o,
    N(o)
  ), g = V(
    s,
    B(s, N(s)),
    h,
    B(h, G(h / 100))
  ), b = V(
    l,
    B(l, N(l)),
    f,
    B(f, G(f / 100))
  );
  return t += '<tr class="footer-row">', t += "<td>Summe</td>", t += `<td class="align-right">${a.toLocaleString("de-DE")}</td>`, t += `<td class="align-right">${m}</td>`, t += `<td class="align-right">${g}</td>`, t += `<td class="align-right">${b}</td>`, t += "</tr>", t += "</tbody></table>", t;
}
function os(e) {
  if (e instanceof HTMLTableElement)
    return e;
  if (e && "querySelector" in e) {
    const t = e.querySelector(
      "table.expandable-portfolio-table"
    );
    if (t)
      return t;
    const n = e.querySelector(
      ".portfolio-table table"
    );
    if (n)
      return n;
    const r = e.querySelector(
      "table"
    );
    if (r)
      return r;
  }
  return document.querySelector(
    ".portfolio-table table.expandable-portfolio-table"
  ) || document.querySelector(".portfolio-table table");
}
function Xe(e) {
  if (e === void 0)
    return null;
  const t = Number(e);
  return Number.isFinite(t) ? t : null;
}
function Ea(e) {
  const t = os(e);
  if (!t)
    return;
  const n = t.tBodies.item(0);
  if (!n)
    return;
  const r = Array.from(
    n.querySelectorAll("tr.portfolio-row")
  );
  if (!r.length)
    return;
  let a = 0, o = 0, i = 0, c = 0, s = 0, l = !1, u = !1, d = !0, h = !1;
  for (const w of r) {
    const C = Xe(w.dataset.positionCount);
    C != null && (a += C), w.dataset.fxUnavailable === "true" && (h = !0);
    const E = w.dataset.hasValue;
    !(E === "false" || E === "0" || E === "" || E == null) && (l = !0);
    const D = Xe(w.dataset.currentValue), A = Xe(w.dataset.gainAbs), P = Xe(w.dataset.purchaseSum), I = Xe(w.dataset.dayChange);
    if (D == null || A == null || P == null) {
      d = !1;
      continue;
    }
    o += D, c += A, i += P, I != null && (s += I, u = !0);
  }
  const f = l && d, m = f && i > 0 ? c / i * 100 : null, g = u && f && o !== 0 ? (() => {
    const w = o - s;
    return w ? s / w * 100 : null;
  })() : null, b = Array.from(n.children).filter(
    (w) => w.tagName === "TR" && w.classList.contains("footer-row")
  );
  if (b.length > 1)
    for (let w = 1; w < b.length; w++)
      b[w].remove();
  let p = b.length > 0 ? b[0] : null;
  p || (p = document.createElement("tr"), p.classList.add("footer-row"), n.appendChild(p));
  const y = Math.round(a).toLocaleString("de-DE"), _ = V(
    f ? i : 0,
    f ? N(i) : "—",
    f ? o : 0,
    f ? N(o) : "—"
  ), v = V(
    u && f ? s : 0,
    u && f ? B(s, N(s)) : "—",
    u && f && g != null ? g : 0,
    u && f && g != null ? B(g, G(g / 100)) : "—"
  ), S = V(
    f ? c : 0,
    f ? B(c, N(c)) : "—",
    f && m != null ? m : 0,
    f && m != null ? B(m, G(m / 100)) : "—"
  );
  p.innerHTML = `
      <td>Summe</td>
      <td class="align-right">${y}</td>
      <td class="align-right">${_}</td>
      <td class="align-right">${v}</td>
      <td class="align-right">${S}</td>
    `, p.dataset.positionCount = String(Math.round(a)), p.dataset.currentValue = f ? String(o) : "", p.dataset.purchaseSum = f ? String(i) : "", p.dataset.dayChange = f && u ? String(s) : "", p.dataset.dayChangePct = f && u && typeof g == "number" ? String(g) : "", p.dataset.gainAbs = f ? String(c) : "", p.dataset.gainPct = f && typeof m == "number" ? String(m) : "", p.dataset.hasValue = f ? "true" : "false", p.dataset.fxUnavailable = h || !f ? "true" : "false";
}
function ct(e, t) {
  if (!t) return;
  const n = e.querySelector(
    `.portfolio-details[data-portfolio="${t}"]`
  );
  if (!n) return;
  const r = n.querySelector(
    ".positions-container"
  );
  if (!r) return;
  const a = r.querySelector(
    "table.sortable-positions"
  );
  if (!a || a.__ppReaderSortingBound) return;
  a.__ppReaderSortingBound = !0;
  const o = (f, m) => {
    const g = a.querySelector("tbody");
    if (!g) return;
    const b = Array.from(
      g.querySelectorAll("tr")
    ).filter((S) => !S.classList.contains("footer-row")), p = g.querySelector("tr.footer-row"), y = (S) => {
      if (S == null) return 0;
      const w = S.replace(/\u00A0/g, " ").replace(/[%€]/g, "").replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, ""), C = Number.parseFloat(w);
      return Number.isFinite(C) ? C : 0;
    };
    b.sort((S, w) => {
      const C = {
        name: 0,
        current_holdings: 1,
        last_price: 2,
        average_price: 3,
        purchase_value: 4,
        current_value: 4,
        day_change_abs: 5,
        day_change_pct: 5,
        gain_abs: 6,
        gain_pct: 6
      }, E = {
        name: null,
        current_holdings: null,
        last_price: null,
        average_price: null,
        purchase_value: ".val-top",
        current_value: ".val-bottom",
        day_change_abs: ".val-top",
        day_change_pct: ".val-bottom",
        gain_abs: ".val-top",
        gain_pct: ".val-bottom"
      }, $ = C[f], D = S.cells.item($), A = w.cells.item($), P = E[f];
      let I = "";
      if (D) {
        let H = null;
        if (P) {
          const L = D.querySelector(P);
          H = L ? L.getAttribute("data-val") || L.textContent : null;
        } else {
          const L = D.querySelector("[data-sort-value]") || D.querySelector("[data-val]");
          H = L ? L.getAttribute("data-sort-value") || L.getAttribute("data-val") : D.textContent;
        }
        typeof H == "string" && (I = H.trim());
      }
      let j = "";
      if (A) {
        let H = null;
        if (P) {
          const L = A.querySelector(P);
          H = L ? L.getAttribute("data-val") || L.textContent : null;
        } else {
          const L = A.querySelector("[data-sort-value]") || A.querySelector("[data-val]");
          H = L ? L.getAttribute("data-sort-value") || L.getAttribute("data-val") : A.textContent;
        }
        typeof H == "string" && (j = H.trim());
      }
      const F = (H) => /^-?\d+(\.\d+)?$/.test(H) ? Number.parseFloat(H) : y(H);
      let z;
      if (f === "name")
        z = I.localeCompare(j, "de", { sensitivity: "base" });
      else {
        const H = F(I), L = F(j);
        z = H - L;
      }
      return m === "asc" ? z : -z;
    }), a.querySelectorAll("thead th.sort-active").forEach((S) => {
      S.classList.remove("sort-active", "dir-asc", "dir-desc");
    }), a.querySelectorAll(".sort-active").forEach((S) => {
      S.classList.remove("sort-active", "dir-asc", "dir-desc");
      const w = S.getAttribute("data-label");
      w && S.setAttribute("aria-label", `${w} sortieren`);
    });
    const _ = a.querySelector(
      `[data-sort-key="${f}"], [data-sort-selector="${f}"]`
    );
    if (_) {
      _.classList.add("sort-active"), _.classList.remove("dir-asc", "dir-desc"), _.classList.add(m === "asc" ? "dir-asc" : "dir-desc");
      const S = _.getAttribute("data-label");
      if (S) {
        const w = m === "asc" ? "aufsteigend sortiert" : "absteigend sortiert";
        _.setAttribute("aria-label", `${S} ${w}`);
      }
    }
    const v = _?.closest("th");
    v && v.setAttribute("aria-sort", m === "asc" ? "ascending" : "descending"), b.forEach((S) => g.appendChild(S)), p && g.appendChild(p);
  }, i = r.dataset.sortKey, c = r.dataset.sortDir, s = a.dataset.defaultSort, l = a.dataset.defaultDir, u = Jt(i) ? i : Jt(s) ? s : "name", d = Qt(c) ? c : Qt(l) ? l : "asc";
  o(u, d);
  const h = (f) => {
    const m = f.target;
    if (!(m instanceof Element))
      return;
    const g = m.closest("[data-sort-key], [data-sort-selector]");
    if (!g || !a.contains(g)) return;
    const b = g.getAttribute("data-sort-key") || g.getAttribute("data-sort-selector");
    if (!Jt(b))
      return;
    let p = "asc";
    r.dataset.sortKey === b && (p = (Qt(r.dataset.sortDir) ? r.dataset.sortDir : "asc") === "asc" ? "desc" : "asc"), r.dataset.sortKey = b, r.dataset.sortDir = p, o(b, p);
  };
  a.addEventListener("click", (f) => {
    h(f);
  }), a.addEventListener("keydown", (f) => {
    (f.key === "Enter" || f.key === " ") && (f.preventDefault(), h(f));
  });
}
async function is(e, t, n) {
  if (!e || !Et || !xt) return;
  const r = t || n.querySelector(
    `.portfolio-details[data-portfolio="${e}"] .positions-container`
  );
  if (!r)
    return;
  const a = r.closest(".portfolio-details");
  if (!(a && a.classList.contains("hidden"))) {
    r.innerHTML = zn("Neu laden...");
    try {
      const o = await Jr(
        Et,
        xt,
        e
      );
      if (o.error) {
        const c = typeof o.error == "string" ? o.error : String(o.error);
        r.innerHTML = `<div class="error">${x(c)} ${at(e)}</div>`;
        return;
      }
      const i = Bt(
        Array.isArray(o.positions) ? o.positions : []
      );
      At(e, i), wt(e, i), r.innerHTML = it(i);
      try {
        ct(n, e);
      } catch (c) {
        console.warn(
          "attachPortfolioToggleHandler: Sort-Init (Lazy) fehlgeschlagen:",
          c
        );
      }
      try {
        st(n, e);
      } catch (c) {
        console.warn(
          "reloadPortfolioPositions: Security-Listener konnte nicht gebunden werden:",
          c
        );
      }
    } catch (o) {
      const i = o instanceof Error ? o.message : String(o);
      r.innerHTML = `<div class="error">Fehler beim Laden: ${x(i)} ${at(e)}</div>`;
    }
  }
}
async function ss(e, t, n = 3e3, r = 50) {
  const a = performance.now();
  return new Promise((o) => {
    const i = () => {
      const c = e.querySelector(t);
      if (c) {
        o(c);
        return;
      }
      if (performance.now() - a > n) {
        o(null);
        return;
      }
      setTimeout(i, r);
    };
    i();
  });
}
function cs(e, t, n, r) {
  const a = e.tBodies[0];
  if (!a) return;
  const o = Array.from(a.children).filter(
    (s) => s.classList.contains("footer-row")
  ), i = [];
  let c = null;
  if (Array.from(a.children).forEach((s) => {
    s.classList.contains("footer-row") || s instanceof HTMLTableRowElement && (s.classList.contains("portfolio-row") ? c = s : s.classList.contains("portfolio-details") && c && (i.push({ main: c, detail: s }), c = null));
  }), i.sort((s, l) => {
    const u = s.main, d = l.main, h = u.cells[t], f = d.cells[t];
    let m = "", g = "";
    if (n) {
      const y = h.querySelector(n), _ = f.querySelector(n);
      m = y?.getAttribute("data-val") || "", g = _?.getAttribute("data-val") || "";
    } else {
      const y = h.querySelector("[data-val]"), _ = f.querySelector("[data-val]");
      m = y?.getAttribute("data-val") || h.textContent || "", g = _?.getAttribute("data-val") || f.textContent || "";
    }
    const b = Number(m), p = Number(g);
    return !isNaN(b) && !isNaN(p) ? (b - p) * (r === "asc" ? 1 : -1) : m.localeCompare(g) * (r === "asc" ? 1 : -1);
  }), i.forEach((s) => {
    a.appendChild(s.main), a.appendChild(s.detail);
  }), o.length > 0) {
    a.appendChild(o[0]);
    for (let s = 1; s < o.length; s++) o[s].remove();
  }
}
function ls(e) {
  const t = e.querySelector(
    ".expandable-portfolio-table"
  );
  if (!t) return;
  const n = t;
  if (n.__ppReaderOverviewSortingBound) return;
  n.__ppReaderOverviewSortingBound = !0;
  const r = (a) => {
    const o = a.target, i = o.closest("[data-sort-selector]") || o.closest("[data-sort-key]");
    if (i) {
      if (i.closest("table") !== t) return;
      t.querySelectorAll(".sort-active").forEach((h) => {
        if (h !== i) {
          h.classList.remove("sort-active", "dir-asc", "dir-desc");
          const f = h.getAttribute("data-label");
          f && h.setAttribute("aria-label", `${f} sortieren`);
        }
      });
      let s = "asc";
      i.classList.contains("sort-active") && i.classList.contains("dir-asc") && (s = "desc"), i.classList.add("sort-active"), i.classList.remove("dir-asc", "dir-desc"), i.classList.add(`dir-${s}`);
      const l = i.getAttribute("data-label");
      if (l) {
        const h = s === "asc" ? "aufsteigend sortiert" : "absteigend sortiert";
        i.setAttribute("aria-label", `${l} ${h}`);
      }
      const u = i.closest("th"), d = u ? Array.from(u.parentElement?.children ?? []).indexOf(u) : -1;
      if (d >= 0) {
        const h = i.dataset.sortSelector || null;
        cs(t, d, h, s);
      }
    }
  };
  t.addEventListener("click", (a) => {
    r(a);
  }), t.addEventListener("keydown", (a) => {
    (a.key === "Enter" || a.key === " ") && (a.preventDefault(), r(a));
  });
}
function Kn(e) {
  const n = (typeof e.__ppReaderAttachToken == "number" ? e.__ppReaderAttachToken : 0) + 1;
  e.__ppReaderAttachToken = n, e.__ppReaderAttachInProgress = !0, (async () => {
    try {
      const r = await ss(
        e,
        ".portfolio-table"
      );
      if (n !== e.__ppReaderAttachToken)
        return;
      if (!r) {
        console.warn(
          "attachPortfolioToggleHandler: .portfolio-table nicht gefunden (Timeout)"
        );
        return;
      }
      if (r.querySelectorAll(".portfolio-toggle").length === 0 && console.debug(
        "attachPortfolioToggleHandler: Noch keine Buttons – evtl. Recovery später"
      ), r.__ppReaderPortfolioToggleBound)
        return;
      r.__ppReaderPortfolioToggleBound = !0, console.debug("attachPortfolioToggleHandler: Listener registriert"), r.addEventListener("click", (o) => {
        (async () => {
          try {
            const i = o.target;
            if (!(i instanceof Element))
              return;
            const c = i.closest(".retry-pos");
            if (c && r.contains(c)) {
              const f = c.getAttribute("data-portfolio");
              if (f) {
                const g = e.querySelector(
                  `.portfolio-details[data-portfolio="${f}"]`
                )?.querySelector(
                  ".positions-container"
                );
                await is(f, g ?? null, e);
              }
              return;
            }
            const s = i.closest(".portfolio-toggle");
            if (!s || !r.contains(s)) return;
            const l = s.getAttribute("data-portfolio");
            if (!l) return;
            const u = e.querySelector(
              `.portfolio-details[data-portfolio="${l}"]`
            );
            if (!u) return;
            const d = s.querySelector(".caret");
            if (u.classList.contains("hidden")) {
              u.classList.remove("hidden"), s.classList.add("expanded"), s.setAttribute("aria-expanded", "true"), d && (d.innerHTML = `<svg viewBox="0 0 24 24"><path d="${Sa}" /></svg>`), Pt.add(l);
              try {
                Yn(e, l);
              } catch (f) {
                console.warn(
                  "attachPortfolioToggleHandler: Pending-Flush fehlgeschlagen:",
                  f
                );
              }
              if (Ot(l)) {
                const f = u.querySelector(
                  ".positions-container"
                );
                if (f) {
                  f.innerHTML = it(
                    pa(l)
                  ), ct(e, l);
                  try {
                    st(e, l);
                  } catch (m) {
                    console.warn(
                      "attachPortfolioToggleHandler: Security-Listener (Cache) Fehler:",
                      m
                    );
                  }
                }
              } else {
                const f = u.querySelector(
                  ".positions-container"
                );
                f && (f.innerHTML = zn("Lade Positionen..."));
                try {
                  const m = await Jr(
                    Et,
                    xt,
                    l
                  );
                  if (m.error) {
                    const b = typeof m.error == "string" ? m.error : String(m.error);
                    f && (f.innerHTML = `<div class="error">${x(b)} ${at(l)}</div>`);
                    return;
                  }
                  const g = Bt(
                    Array.isArray(m.positions) ? m.positions : []
                  );
                  if (At(l, g), wt(
                    l,
                    g
                  ), f) {
                    f.innerHTML = it(g);
                    try {
                      ct(e, l);
                    } catch (b) {
                      console.warn(
                        "attachPortfolioToggleHandler: Sort-Init (Lazy) fehlgeschlagen:",
                        b
                      );
                    }
                    try {
                      st(e, l);
                    } catch (b) {
                      console.warn(
                        "attachPortfolioToggleHandler: Security-Listener konnte nicht gebunden werden:",
                        b
                      );
                    }
                  }
                } catch (m) {
                  const g = m instanceof Error ? m.message : String(m), b = u.querySelector(
                    ".positions-container"
                  );
                  b && (b.innerHTML = `<div class="error">Fehler beim Laden: ${x(g)} ${at(l)}</div>`), console.error(
                    "Fehler beim Lazy Load für",
                    l,
                    m
                  );
                }
              }
            } else
              u.classList.add("hidden"), s.classList.remove("expanded"), s.setAttribute("aria-expanded", "false"), d && (d.innerHTML = `<svg viewBox="0 0 24 24"><path d="${wa}" /></svg>`), Pt.delete(l);
          } catch (i) {
            console.error(
              "attachPortfolioToggleHandler: Ungefangener Fehler im Click-Handler",
              i
            );
          }
        })();
      });
    } finally {
      n === e.__ppReaderAttachToken && (e.__ppReaderAttachInProgress = !1);
    }
  })();
}
function us(e) {
  const t = e.querySelector(
    ".expandable-portfolio-table"
  );
  t && (t.__ppReaderPortfolioFallbackBound || (t.__ppReaderPortfolioFallbackBound = !0, t.addEventListener("click", (n) => {
    const r = n.target;
    !(r instanceof Element) || !r.closest(".portfolio-toggle") || e.querySelector(".portfolio-table")?.__ppReaderPortfolioToggleBound || (console.debug("Fallback-Listener aktiv – re-attach Hauptlistener"), Kn(e));
  })));
}
async function xa(e, t, n) {
  Et = t ?? null, xt = n ?? null, console.debug(
    "renderDashboard: start – panelConfig:",
    n?.config,
    "derived entry_id?",
    n?.config?._panel_custom?.config?.entry_id
  );
  const r = await Mo(t, n);
  aa(r.accounts);
  const a = da(), o = await Ho(t, n);
  ri(o.portfolios);
  const i = hi();
  let c = "";
  try {
    c = await Io(t, n);
  } catch {
    c = "";
  }
  const s = a.reduce(
    (A, P) => A + (typeof P.balance == "number" && Number.isFinite(P.balance) ? P.balance : 0),
    0
  ), l = i.some((A) => A.fx_unavailable), u = a.some(
    (A) => A.fx_unavailable && (A.balance == null || !Number.isFinite(A.balance))
  ), d = i.reduce((A, P) => P.hasValue && typeof P.current_value == "number" && Number.isFinite(P.current_value) ? A + P.current_value : A, 0), h = s + d, f = "Teilw. fehlende FX-Kurse – Gesamtvermögen abweichend", g = i.some(
    (A) => A.hasValue && typeof A.current_value == "number" && Number.isFinite(A.current_value)
  ) || a.some(
    (A) => typeof A.balance == "number" && Number.isFinite(A.balance)
  ) ? `${ye(h)}&nbsp;€` : `<span class="missing-value" role="note" aria-label="${f}" title="${f}">—</span>`, b = l || u ? `<span class="total-wealth-note">${f}</span>` : "", p = `
    <div class="header-meta-row">
      💰 Gesamtvermögen: <strong class="total-wealth-value">${g}</strong>${b}
    </div>
  `, y = dt("Übersicht", p), _ = Aa(i), v = a.filter(
    (A) => (A.currency_code ?? "EUR") === "EUR"
  ), S = a.filter(
    (A) => (A.currency_code ?? "EUR") !== "EUR"
  ), C = S.some((A) => A.fx_unavailable) ? `
        <p class="table-note" role="note">
          <span class="table-note__icon" aria-hidden="true">⚠️</span>
          <span>Wechselkurse konnten nicht geladen werden. EUR-Werte werden derzeit nicht angezeigt.</span>
        </p>
      ` : "", E = `
    <div class="card">
      <h2>Liquidität</h2>
      <div class="scroll-container account-table">
        ${$e(
    v.map((A) => ({
      name: Ct(
        A.name,
        yr(A.badges),
        {
          containerClass: "account-name",
          labelClass: "account-name__label"
        }
      ),
      balance: A.balance ?? null
    })),
    [
      { key: "name", label: "Name" },
      {
        key: "balance",
        label: "Kontostand (EUR)",
        align: "right"
      }
    ],
    ["balance"]
  )}
      </div>
    </div>
    ${S.length ? `
      <div class="card">
        <h2>Fremdwährungen</h2>
        <div class="scroll-container fx-account-table">
          ${$e(
    S.map((A) => {
      const P = A.orig_balance, j = typeof P == "number" && Number.isFinite(P) ? `${P.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}&nbsp;${A.currency_code ?? ""}` : "";
      return {
        name: Ct(
          A.name,
          yr(A.badges),
          {
            containerClass: "account-name",
            labelClass: "account-name__label"
          }
        ),
        fx_display: j,
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
        ${C}
      </div>` : ""}
  `, $ = `
    <div class="card footer-card">
      <div class="meta">
        <div class="last-file-update">
          📂 Letzte Aktualisierung der Datei: <strong>${x(c) || "Unbekannt"}</strong>
        </div>
      </div>
    </div>
  `, D = `
    ${vn}
    ${y.outerHTML}
    <div class="card">
      <h2>Investment</h2>
      <div class="scroll-container portfolio-table">
        ${_}
      </div>
    </div>
    ${E}
    ${$}
  `;
  return ds(e, i), D;
}
function ds(e, t) {
  if (!e)
    return;
  const n = () => {
    try {
      const a = e, o = a.querySelector(".portfolio-table");
      o && o.querySelectorAll(".portfolio-toggle").length === 0 && (console.debug("Recovery: Tabelle ohne Buttons – erneuter Aufbau"), o.innerHTML = Aa(t)), Kn(e), ls(e), us(e), Pt.forEach((i) => {
        try {
          Ot(i) && (ct(e, i), st(e, i));
        } catch (c) {
          console.warn(
            "Init-Sortierung für expandiertes Depot fehlgeschlagen:",
            i,
            c
          );
        }
      });
      try {
        Ea(a);
      } catch (i) {
        console.warn(
          "renderDashboard: Footer-Summe konnte nicht aktualisiert werden:",
          i
        );
      }
      try {
        Vi(e);
      } catch (i) {
        console.warn(
          "renderDashboard: Pending-Positions konnten nicht angewendet werden:",
          i
        );
      }
      console.debug(
        "renderDashboard: portfolio-toggle Buttons:",
        a.querySelectorAll(".portfolio-toggle").length
      );
    } catch (a) {
      console.error("renderDashboard: Fehler bei Recovery/Listener", a);
    }
  }, r = typeof requestAnimationFrame == "function" ? (a) => requestAnimationFrame(a) : (a) => setTimeout(a, 0);
  r(() => r(n));
}
$o({
  renderPositionsTable: (e) => rs(e),
  applyGainPctMetadata: ns,
  attachSecurityDetailListener: st,
  attachPortfolioPositionsSorting: ct,
  updatePortfolioFooter: (e) => {
    e && Ea(e);
  }
});
const fs = "http://www.w3.org/2000/svg", He = 640, Ve = 260, Ze = { top: 12, right: 16, bottom: 24, left: 16 }, Je = "var(--pp-reader-chart-line, #3f51b5)", Sn = "var(--pp-reader-chart-area, rgba(63, 81, 181, 0.12))", vr = "0.75rem", Pa = "var(--pp-reader-chart-baseline, rgba(96, 125, 139, 0.75))", Da = "6 4", ps = 1440 * 60 * 1e3;
function hs(e) {
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
function ms(e) {
  return typeof e == "string" ? e : typeof e == "number" && Number.isFinite(e) ? e.toString() : e instanceof Date && Number.isFinite(e.getTime()) ? e.toISOString() : "";
}
function ne(e) {
  return `${String(e)}px`;
}
function le(e, t = {}) {
  const n = document.createElementNS(fs, e);
  return Object.entries(t).forEach(([r, a]) => {
    const o = hs(a);
    o != null && n.setAttribute(r, o);
  }), n;
}
function Dt(e, t = null) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  if (typeof e == "string" && e.trim() !== "") {
    const n = Number.parseFloat(e);
    if (Number.isFinite(n))
      return n;
  }
  return t;
}
function $a(e, t) {
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
const Na = (e) => {
  if (e && typeof e == "object" && "date" in e)
    return e.date;
}, ka = (e) => {
  if (e && typeof e == "object" && "close" in e)
    return e.close;
}, Ta = (e, t, n) => {
  if (Number.isFinite(e)) {
    const r = new Date(e);
    if (!Number.isNaN(r.getTime()))
      return r.toLocaleDateString("de-DE");
  }
  if (t && typeof t == "object" && "date" in t) {
    const r = t.date, a = ms(r);
    if (a)
      return a;
  }
  return Number.isFinite(e) ? e.toString() : "";
}, La = (e, t, n) => (Number.isFinite(e) ? e : Dt(e, 0) ?? 0).toLocaleString("de-DE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
}), Ra = ({ xFormatted: e, yFormatted: t }) => `
    <div class="chart-tooltip-date">${x(e)}</div>
    <div class="chart-tooltip-value">${x(t)}&nbsp;€</div>
  `, Fa = ({
  marker: e,
  xFormatted: t,
  yFormatted: n
}) => {
  const r = typeof e.label == "string" ? e.label : null;
  return `
    <div class="chart-tooltip-date">${x(r || t)}</div>
    <div class="chart-tooltip-value">${x(n)}</div>
  `;
};
function Ma(e) {
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
    width: He,
    height: Ve,
    margin: { ...Ze },
    series: [],
    points: [],
    range: null,
    xAccessor: Na,
    yAccessor: ka,
    xFormatter: Ta,
    yFormatter: La,
    tooltipRenderer: Ra,
    markerTooltipRenderer: Fa,
    color: Je,
    areaColor: Sn,
    baseline: null,
    handlersAttached: !1,
    markers: [],
    markerPositions: []
  }), e.__chartState;
}
function ae(e, t, n) {
  return !Number.isFinite(e) || e < t ? t : e > n ? n : e;
}
function gs(e, t) {
  if (e.length === 0)
    return "";
  const n = [];
  e.forEach((i, c) => {
    const s = c === 0 ? "M" : "L", l = i.x.toFixed(2), u = i.y.toFixed(2);
    n.push(`${s}${l} ${u}`);
  });
  const r = e[0], o = `L${e[e.length - 1].x.toFixed(2)} ${t.toFixed(2)} L${r.x.toFixed(2)} ${t.toFixed(2)} Z`;
  return `${n.join(" ")} ${o}`;
}
function ys(e) {
  if (e.length === 0)
    return "";
  const t = [];
  return e.forEach((n, r) => {
    const a = r === 0 ? "M" : "L", o = n.x.toFixed(2), i = n.y.toFixed(2);
    t.push(`${a}${o} ${i}`);
  }), t.join(" ");
}
function bs(e) {
  const { baselineLine: t, baseline: n } = e;
  if (!t)
    return;
  const r = n?.color ?? Pa, a = n?.dashArray ?? Da;
  t.setAttribute("stroke", r), t.setAttribute("stroke-dasharray", a);
}
function en(e) {
  const { baselineLine: t, baseline: n, range: r, margin: a, width: o } = e;
  if (!t)
    return;
  const i = n?.value;
  if (!r || i == null || !Number.isFinite(i)) {
    t.style.opacity = "0";
    return;
  }
  const { minY: c, maxY: s, boundedHeight: l } = r, u = Number.isFinite(c) ? c : i, h = (Number.isFinite(s) ? s : u + 1) - u, f = h === 0 ? 0.5 : (i - u) / h, m = ae(f, 0, 1), g = Math.max(l, 0), b = a.top + (1 - m) * g, p = Math.max(o - a.left - a.right, 0), y = a.left, _ = a.left + p;
  t.setAttribute("x1", y.toFixed(2)), t.setAttribute("x2", _.toFixed(2)), t.setAttribute("y1", b.toFixed(2)), t.setAttribute("y2", b.toFixed(2)), t.style.opacity = "1";
}
function _s(e, t, n) {
  const { width: r, height: a, margin: o } = t, { xAccessor: i, yAccessor: c } = n;
  if (e.length === 0)
    return { points: [], range: null };
  const s = e.map((F, z) => {
    const H = i(F, z), L = c(F, z), Y = $a(H, z), oe = Dt(L, Number.NaN);
    return Number.isFinite(oe) ? {
      index: z,
      data: F,
      xValue: Y,
      yValue: oe
    } : null;
  }).filter((F) => !!F);
  if (s.length === 0)
    return { points: [], range: null };
  const l = s.reduce((F, z) => Math.min(F, z.xValue), s[0].xValue), u = s.reduce((F, z) => Math.max(F, z.xValue), s[0].xValue), d = s.reduce((F, z) => Math.min(F, z.yValue), s[0].yValue), h = s.reduce((F, z) => Math.max(F, z.yValue), s[0].yValue), f = Math.max(r - o.left - o.right, 1), m = Math.max(a - o.top - o.bottom, 1), g = Number.isFinite(l) ? l : 0, b = Number.isFinite(u) ? u : g + 1, p = Number.isFinite(d) ? d : 0, y = Number.isFinite(h) ? h : p + 1, _ = Dt(t.baseline?.value, null), v = t.baseline?.includeInDomain !== !1, S = v && _ != null && Number.isFinite(_) ? Math.min(p, _) : p, w = v && _ != null && Number.isFinite(_) ? Math.max(y, _) : y, C = Math.max(
    2,
    Math.min(
      6,
      Math.round(
        Math.max(a - o.top - o.bottom, 0) / 60
      ) || 4
    )
  ), { niceMin: E, niceMax: $ } = xs(
    S,
    w,
    C
  ), D = Number.isFinite(E) ? E : p, A = Number.isFinite($) ? $ : y, P = b - g || 1, I = A - D || 1;
  return {
    points: s.map((F) => {
      const z = P === 0 ? 0.5 : (F.xValue - g) / P, H = I === 0 ? 0.5 : (F.yValue - D) / I, L = o.left + z * f, Y = o.top + (1 - H) * m;
      return {
        ...F,
        x: L,
        y: Y
      };
    }),
    range: {
      minX: g,
      maxX: b,
      minY: D,
      maxY: A,
      boundedWidth: f,
      boundedHeight: m
    }
  };
}
function tn(e) {
  const { markerLayer: t, markerOverlay: n, markers: r, range: a, margin: o, markerTooltip: i } = e;
  if (e.markerPositions = [], gt(e), !t || !n)
    return;
  for (; t.firstChild; )
    t.removeChild(t.firstChild);
  for (; n.firstChild; )
    n.removeChild(n.firstChild);
  if (!a || !Array.isArray(r) || r.length === 0)
    return;
  const c = a.maxX - a.minX || 1, s = a.maxY - a.minY || 1;
  r.forEach((l, u) => {
    const d = $a(l.x, u), h = Dt(l.y, Number.NaN), f = Number(h);
    if (!Number.isFinite(d) || !Number.isFinite(f))
      return;
    const m = c === 0 ? 0.5 : ae((d - a.minX) / c, 0, 1), g = s === 0 ? 0.5 : ae((f - a.minY) / s, 0, 1), b = o.left + m * a.boundedWidth, p = o.top + (1 - g) * a.boundedHeight, y = le("g", {
      class: "line-chart-marker",
      transform: `translate(${b.toFixed(2)} ${p.toFixed(2)})`,
      "data-marker-id": l.id
    }), _ = le("circle", {
      r: 5,
      fill: l.color || e.color,
      stroke: "#fff",
      "stroke-width": 2,
      opacity: 0.95
    });
    y.appendChild(_), t.appendChild(y), e.markerPositions.push({
      marker: l,
      x: b,
      y: p
    });
  }), i && (i.style.opacity = "0", i.style.visibility = "hidden");
}
function Ia(e, t, n, r) {
  e.width = Number.isFinite(t) ? Number(t) : He, e.height = Number.isFinite(n) ? Number(n) : Ve, e.margin = {
    top: Number.isFinite(r?.top) ? Number(r?.top) : Ze.top,
    right: Number.isFinite(r?.right) ? Number(r?.right) : Ze.right,
    bottom: Number.isFinite(r?.bottom) ? Number(r?.bottom) : Ze.bottom,
    left: Number.isFinite(r?.left) ? Number(r?.left) : Ze.left
  };
}
function vs(e, t) {
  const n = e.xFormatter(t.xValue, t.data, t.index), r = e.yFormatter(t.yValue, t.data, t.index);
  return e.tooltipRenderer({
    point: t,
    xFormatted: n,
    yFormatted: r,
    data: t.data,
    index: t.index
  });
}
function Ss(e, t, n, r = null) {
  const { tooltip: a, width: o, margin: i, height: c } = e;
  if (!a)
    return;
  const s = r && Number.isFinite(r.scaleX) && r.scaleX > 0 ? r.scaleX : 1, l = r && Number.isFinite(r.scaleY) && r.scaleY > 0 ? r.scaleY : 1, u = c - i.bottom;
  a.style.visibility = "visible", a.style.opacity = "1";
  const d = a.offsetWidth || 0, h = a.offsetHeight || 0, f = t.x * s, m = ae(
    f - d / 2,
    i.left * s,
    (o - i.right) * s - d
  ), g = Math.max(u * l - h, 0), b = 12, y = (Number.isFinite(n) ? ae(n ?? 0, i.top, u) : t.y) * l;
  let _ = y - h - b;
  _ < i.top * l && (_ = y + b), _ = ae(_, 0, g);
  const v = ne(Math.round(m)), S = ne(Math.round(_));
  a.style.transform = `translate(${v}, ${S})`;
}
function wn(e) {
  const { tooltip: t, focusLine: n, focusCircle: r } = e;
  t && (t.style.opacity = "0", t.style.visibility = "hidden"), n && (n.style.opacity = "0"), r && (r.style.opacity = "0");
}
function ws(e, t) {
  const { marker: n } = t, r = e.xFormatter(t.marker.x, n, -1), a = e.yFormatter(t.marker.y, n, -1);
  return e.markerTooltipRenderer({
    marker: n,
    xFormatted: r,
    yFormatted: a
  });
}
function Cs(e, t, n, r = null) {
  const { markerTooltip: a, width: o, margin: i, height: c, tooltip: s } = e;
  if (!a)
    return;
  const l = r && Number.isFinite(r.scaleX) && r.scaleX > 0 ? r.scaleX : 1, u = r && Number.isFinite(r.scaleY) && r.scaleY > 0 ? r.scaleY : 1, d = c - i.bottom;
  a.style.visibility = "visible", a.style.opacity = "1";
  const h = a.offsetWidth || 0, f = a.offsetHeight || 0, m = t.x * l, g = ae(
    m - h / 2,
    i.left * l,
    (o - i.right) * l - h
  ), b = Math.max(d * u - f, 0), p = 10, y = s?.getBoundingClientRect(), _ = e.svg?.getBoundingClientRect(), v = y && _ ? y.top - _.top : null, S = y && _ ? y.bottom - _.top : null, C = (Number.isFinite(n) ? ae(n ?? t.y, i.top, d) : t.y) * u;
  let E;
  v != null && S != null ? v <= C ? E = v - f - p : E = S + p : (E = C - f - p, E < i.top * u && (E = C + p)), E = ae(E, 0, b);
  const $ = ne(Math.round(g)), D = ne(Math.round(E));
  a.style.transform = `translate(${$}, ${D})`;
}
function gt(e) {
  const { markerTooltip: t } = e;
  t && (t.style.opacity = "0", t.style.visibility = "hidden");
}
function As(e, t, n) {
  let a = null, o = 576;
  for (const i of e.markerPositions) {
    const c = i.x - t, s = i.y - n, l = c * c + s * s;
    l <= o && (a = i, o = l);
  }
  return a;
}
function Es(e, t) {
  if (t.handlersAttached || !t.overlay)
    return;
  const n = (a) => {
    if (t.points.length === 0 || !t.svg) {
      wn(t), gt(t);
      return;
    }
    const o = t.svg.getBoundingClientRect(), i = t.width || He, c = t.height || Ve, s = o.width && Number.isFinite(o.width) && Number.isFinite(i) && i > 0 ? o.width / i : 1, l = o.height && Number.isFinite(o.height) && Number.isFinite(c) && c > 0 ? o.height / c : 1, u = s > 0 ? 1 / s : 1, d = l > 0 ? 1 / l : 1, h = (a.clientX - o.left) * u, f = (a.clientY - o.top) * d, m = {
      scaleX: s,
      scaleY: l
    };
    let g = t.points[0], b = Math.abs(h - g.x);
    for (let y = 1; y < t.points.length; y += 1) {
      const _ = t.points[y], v = Math.abs(h - _.x);
      v < b && (b = v, g = _);
    }
    t.focusCircle && (t.focusCircle.setAttribute("cx", g.x.toFixed(2)), t.focusCircle.setAttribute("cy", g.y.toFixed(2)), t.focusCircle.style.opacity = "1"), t.focusLine && (t.focusLine.setAttribute("x1", g.x.toFixed(2)), t.focusLine.setAttribute("x2", g.x.toFixed(2)), t.focusLine.setAttribute("y1", t.margin.top.toFixed(2)), t.focusLine.setAttribute(
      "y2",
      (t.height - t.margin.bottom).toFixed(2)
    ), t.focusLine.style.opacity = "1"), t.tooltip && (t.tooltip.innerHTML = vs(t, g), Ss(t, g, f, m));
    const p = As(t, h, f);
    p && t.markerTooltip ? (t.markerTooltip.innerHTML = ws(t, p), Cs(t, p, f, m)) : gt(t);
  }, r = () => {
    wn(t), gt(t);
  };
  t.overlay.addEventListener("pointermove", n), t.overlay.addEventListener("pointerenter", n), t.overlay.addEventListener("pointerleave", r), t.handlersAttached = !0, t.handlePointerMove = n, t.handlePointerLeave = r, e.addEventListener("pointercancel", r);
}
function jn(e, t = {}) {
  const n = document.createElement("div");
  n.className = "line-chart-container", n.dataset.chartType = "line", n.style.position = "relative";
  const r = le("svg", {
    width: He,
    height: Ve,
    viewBox: `0 0 ${String(He)} ${String(Ve)}`,
    role: "img",
    "aria-hidden": "true",
    focusable: "false"
  });
  r.classList.add("line-chart-svg");
  const a = le("path", {
    class: "line-chart-area",
    fill: Sn,
    stroke: "none"
  }), o = le("line", {
    class: "line-chart-baseline",
    stroke: Pa,
    "stroke-width": 1,
    "stroke-dasharray": Da,
    opacity: 0
  }), i = le("path", {
    class: "line-chart-path",
    fill: "none",
    stroke: Je,
    "stroke-width": 2,
    "stroke-linecap": "round",
    "stroke-linejoin": "round"
  }), c = le("line", {
    class: "line-chart-focus-line",
    stroke: Je,
    "stroke-width": 1,
    "stroke-dasharray": "4 4",
    opacity: 0
  }), s = le("circle", {
    class: "line-chart-focus-circle",
    r: 4,
    fill: "#fff",
    stroke: Je,
    "stroke-width": 2,
    opacity: 0
  }), l = le("g", {
    class: "line-chart-markers"
  }), u = le("rect", {
    class: "line-chart-overlay",
    fill: "transparent",
    x: 0,
    y: 0,
    width: He,
    height: Ve
  });
  r.appendChild(a), r.appendChild(o), r.appendChild(i), r.appendChild(c), r.appendChild(s), r.appendChild(l), r.appendChild(u), n.appendChild(r);
  const d = document.createElement("div");
  d.className = "chart-tooltip", d.style.position = "absolute", d.style.top = "0", d.style.left = "0", d.style.pointerEvents = "none", d.style.opacity = "0", d.style.visibility = "hidden", n.appendChild(d);
  const h = document.createElement("div");
  h.className = "line-chart-marker-overlay", h.style.position = "absolute", h.style.top = "0", h.style.left = "0", h.style.width = "100%", h.style.height = "100%", h.style.pointerEvents = "none", h.style.overflow = "visible", h.style.zIndex = "2", n.appendChild(h);
  const f = document.createElement("div");
  f.className = "chart-tooltip chart-tooltip--marker", f.style.position = "absolute", f.style.top = "0", f.style.left = "0", f.style.pointerEvents = "none", f.style.opacity = "0", f.style.visibility = "hidden", n.appendChild(f), e.appendChild(n);
  const m = Ma(n);
  if (m.svg = r, m.areaPath = a, m.linePath = i, m.baselineLine = o, m.focusLine = c, m.focusCircle = s, m.overlay = u, m.tooltip = d, m.markerOverlay = h, m.markerLayer = l, m.markerTooltip = f, m.xAccessor = t.xAccessor ?? Na, m.yAccessor = t.yAccessor ?? ka, m.xFormatter = t.xFormatter ?? Ta, m.yFormatter = t.yFormatter ?? La, m.tooltipRenderer = t.tooltipRenderer ?? Ra, m.markerTooltipRenderer = t.markerTooltipRenderer ?? Fa, m.color = t.color ?? Je, m.areaColor = t.areaColor ?? Sn, m.baseline = t.baseline ?? null, m.handlersAttached = !1, m.markers = Array.isArray(t.markers) ? t.markers.slice() : [], !m.xAxis) {
    const g = document.createElement("div");
    g.className = "line-chart-axis line-chart-axis-x", g.style.position = "absolute", g.style.left = "0", g.style.right = "0", g.style.bottom = "0", g.style.pointerEvents = "none", g.style.fontSize = vr, g.style.color = "var(--secondary-text-color)", g.style.display = "block", n.appendChild(g), m.xAxis = g;
  }
  if (!m.yAxis) {
    const g = document.createElement("div");
    g.className = "line-chart-axis line-chart-axis-y", g.style.position = "absolute", g.style.top = "0", g.style.bottom = "0", g.style.left = "0", g.style.pointerEvents = "none", g.style.fontSize = vr, g.style.color = "var(--secondary-text-color)", g.style.display = "block", n.appendChild(g), m.yAxis = g;
  }
  return Ia(m, t.width, t.height, t.margin), i.setAttribute("stroke", m.color), c.setAttribute("stroke", m.color), s.setAttribute("stroke", m.color), a.setAttribute("fill", m.areaColor), Wt(n, t), Es(n, m), n;
}
function Wt(e, t = {}) {
  if (!e) {
    console.error("updateLineChart: container element is required");
    return;
  }
  const n = Ma(e);
  if (!n.svg || !n.linePath || !n.overlay) {
    console.error("updateLineChart: chart was not initialised with renderLineChart");
    return;
  }
  t.xAccessor && (n.xAccessor = t.xAccessor), t.yAccessor && (n.yAccessor = t.yAccessor), t.xFormatter && (n.xFormatter = t.xFormatter), t.yFormatter && (n.yFormatter = t.yFormatter), t.tooltipRenderer && (n.tooltipRenderer = t.tooltipRenderer), t.markerTooltipRenderer && (n.markerTooltipRenderer = t.markerTooltipRenderer), t.color && (n.color = t.color, n.linePath.setAttribute("stroke", n.color), n.focusLine && n.focusLine.setAttribute("stroke", n.color), n.focusCircle && n.focusCircle.setAttribute("stroke", n.color)), t.areaColor && (n.areaColor = t.areaColor, n.areaPath && n.areaPath.setAttribute("fill", n.areaColor)), Object.prototype.hasOwnProperty.call(t, "baseline") && (n.baseline = t.baseline ?? null), Array.isArray(t.markers) && (n.markers = t.markers.slice()), bs(n), Ia(n, t.width, t.height, t.margin);
  const { width: r, height: a } = n;
  n.svg.setAttribute("width", String(r)), n.svg.setAttribute("height", String(a)), n.svg.setAttribute("viewBox", `0 0 ${String(r)} ${String(a)}`), n.overlay.setAttribute("x", "0"), n.overlay.setAttribute("y", "0"), n.overlay.setAttribute("width", Math.max(r, 0).toFixed(2)), n.overlay.setAttribute("height", Math.max(a, 0).toFixed(2)), Array.isArray(t.series) && (n.series = Array.from(t.series));
  const { points: o, range: i } = _s(n.series, n, {
    xAccessor: n.xAccessor,
    yAccessor: n.yAccessor
  });
  if (n.points = o, n.range = i, o.length === 0) {
    n.linePath.setAttribute("d", ""), n.areaPath && n.areaPath.setAttribute("d", ""), wn(n), tn(n), nn(n), en(n);
    return;
  }
  if (o.length === 1) {
    const s = o[0], l = Math.max(
      0.5,
      Math.min(4, Math.max(n.width - n.margin.left - n.margin.right, 1) * 0.01)
    ), u = `M${s.x.toFixed(2)} ${s.y.toFixed(2)} h${l.toFixed(2)}`;
    n.linePath.setAttribute("d", u), n.areaPath && n.areaPath.setAttribute("d", ""), n.focusCircle && (n.focusCircle.setAttribute("cx", s.x.toFixed(2)), n.focusCircle.setAttribute("cy", s.y.toFixed(2)), n.focusCircle.style.opacity = "1"), n.focusLine && (n.focusLine.style.opacity = "0"), nn(n), en(n), tn(n);
    return;
  }
  const c = ys(o);
  if (n.linePath.setAttribute("d", c), n.areaPath && i) {
    const s = n.margin.top + i.boundedHeight, l = gs(o, s);
    n.areaPath.setAttribute("d", l);
  }
  nn(n), en(n), tn(n);
}
function nn(e) {
  const { xAxis: t, yAxis: n, range: r, margin: a, height: o, yFormatter: i } = e;
  if (!t || !n)
    return;
  if (!r) {
    t.innerHTML = "", n.innerHTML = "";
    return;
  }
  const { minX: c, maxX: s, minY: l, maxY: u, boundedWidth: d, boundedHeight: h } = r, f = Number.isFinite(c) && Number.isFinite(s) && s >= c, m = Number.isFinite(l) && Number.isFinite(u) && u >= l, g = Math.max(d, 0), b = Math.max(h, 0);
  if (t.style.left = ne(a.left), t.style.width = ne(g), t.style.top = ne(o - a.bottom + 6), t.innerHTML = "", f && g > 0) {
    const y = (s - c) / ps, _ = Math.max(2, Math.min(6, Math.round(g / 140) || 4));
    Ps(e, c, s, _, y).forEach(({ positionRatio: S, label: w }) => {
      const C = document.createElement("div");
      C.className = "line-chart-axis-tick line-chart-axis-tick-x", C.style.position = "absolute", C.style.bottom = "0";
      const E = ae(S, 0, 1);
      C.style.left = ne(E * g);
      let $ = "-50%", D = "center";
      E <= 1e-3 ? ($ = "0", D = "left", C.style.marginLeft = "2px") : E >= 0.999 && ($ = "-100%", D = "right", C.style.marginRight = "2px"), C.style.transform = `translateX(${$})`, C.style.textAlign = D, C.textContent = w, t.appendChild(C);
    });
  }
  n.style.top = ne(a.top), n.style.height = ne(b);
  const p = Math.max(a.left - 6, 0);
  if (n.style.left = "0", n.style.width = ne(Math.max(p, 0)), n.innerHTML = "", m && b > 0) {
    const y = Math.max(2, Math.min(6, Math.round(b / 60) || 4)), _ = Ds(l, u, y), v = i;
    _.forEach(({ value: S, positionRatio: w }) => {
      const C = document.createElement("div");
      C.className = "line-chart-axis-tick line-chart-axis-tick-y", C.style.position = "absolute", C.style.left = "0";
      const $ = (1 - ae(w, 0, 1)) * b;
      C.style.top = ne($), C.textContent = v(S, null, -1), n.appendChild(C);
    });
  }
}
function xs(e, t, n = 4) {
  if (!Number.isFinite(e) || !Number.isFinite(t))
    return {
      niceMin: e,
      niceMax: t
    };
  const r = Math.max(2, n);
  if (t === e) {
    const l = Cn(Math.abs(e) || 1);
    return {
      niceMin: e - l,
      niceMax: t + l
    };
  }
  const o = (t - e) / (r - 1), i = Cn(o), c = Math.floor(e / i) * i, s = Math.ceil(t / i) * i;
  return c === s ? {
    niceMin: e,
    niceMax: t + i
  } : {
    niceMin: c,
    niceMax: s
  };
}
function Ps(e, t, n, r, a) {
  if (!Number.isFinite(t) || !Number.isFinite(n) || n < t)
    return [];
  if (!Number.isFinite(a) || a <= 0)
    return [
      {
        positionRatio: 0.5,
        label: Sr(e, t, a || 0)
      }
    ];
  const o = Math.max(2, r), i = [], c = n - t;
  for (let s = 0; s < o; s += 1) {
    const l = o === 1 ? 0.5 : s / (o - 1), u = t + l * c;
    i.push({
      positionRatio: l,
      label: Sr(e, u, a)
    });
  }
  return i;
}
function Sr(e, t, n) {
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
function Ds(e, t, n) {
  if (!Number.isFinite(e) || !Number.isFinite(t))
    return [];
  if (t === e)
    return [
      {
        value: e,
        positionRatio: 0.5
      }
    ];
  const r = t - e, a = Math.max(2, n), o = r / (a - 1), i = Cn(o), c = Math.floor(e / i) * i, s = Math.ceil(t / i) * i, l = [];
  for (let u = c; u <= s + i / 2; u += i) {
    const d = (u - e) / (t - e);
    l.push({
      value: u,
      positionRatio: ae(d, 0, 1)
    });
  }
  return l.length > a + 2 ? l.filter((u, d) => d % 2 === 0) : l;
}
function Cn(e) {
  if (!Number.isFinite(e) || e === 0)
    return 1;
  const t = Math.floor(Math.log10(Math.abs(e))), n = Math.abs(e) / 10 ** t;
  let r;
  return n <= 1 ? r = 1 : n <= 2 ? r = 2 : n <= 5 ? r = 5 : r = 10, r * 10 ** t;
}
function $s(e) {
  return Array.isArray(e) && e.every((t) => typeof t == "string");
}
function Ns(e) {
  return typeof e == "object" && e !== null;
}
function ks(e) {
  if (!Ns(e))
    return !1;
  const t = e;
  return typeof t.portfolioUuid != "string" ? !1 : $s(t.securityUuids);
}
function Ts(e) {
  return e instanceof CustomEvent ? ks(e.detail) : !1;
}
const rn = { min: 0, max: 6 }, $t = { min: 2, max: 4 }, Ls = "1Y", Ha = [
  "1M",
  "6M",
  "1Y",
  "5Y",
  "ALL"
], Rs = {
  "1M": 30,
  "6M": 182,
  "1Y": 365,
  "5Y": 1826,
  ALL: Number.POSITIVE_INFINITY
}, Fs = /* @__PURE__ */ new Set([0, 2]), Ms = /* @__PURE__ */ new Set([1, 3]), Is = "var(--pp-reader-chart-marker-buy, #2e7d32)", Hs = "var(--pp-reader-chart-marker-sell, #c0392b)", wr = "{TICKER}", Vs = "https://chatgpt.com/", an = {
  aggregation: "Aggregationsdaten",
  totals: "Kaufsummen",
  eur_total: "EUR-Kaufsumme"
}, ze = /* @__PURE__ */ new Map(), yt = /* @__PURE__ */ new Map(), lt = /* @__PURE__ */ new Map(), qe = /* @__PURE__ */ new Map(), Va = "pp-reader:portfolio-positions-updated", tt = /* @__PURE__ */ new Map();
function zs(e) {
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
function qs(e, t) {
  if (e) {
    if (t) {
      lt.set(e, t);
      return;
    }
    lt.delete(e);
  }
}
function Us(e) {
  if (!e || typeof window > "u")
    return null;
  if (lt.has(e)) {
    const t = lt.get(e) || null;
    if (t)
      return t;
  }
  return null;
}
function za(e) {
  return ze.has(e) || ze.set(e, /* @__PURE__ */ new Map()), ze.get(e);
}
function qa(e) {
  return qe.has(e) || qe.set(e, /* @__PURE__ */ new Map()), qe.get(e);
}
function Ua(e) {
  if (e) {
    if (ze.has(e)) {
      try {
        const t = ze.get(e);
        t && t.clear();
      } catch (t) {
        console.warn("invalidateHistoryCache: Konnte Cache nicht leeren", e, t);
      }
      ze.delete(e);
    }
    if (qe.has(e)) {
      try {
        qe.get(e)?.clear();
      } catch (t) {
        console.warn("invalidateHistoryCache: Konnte Marker-Cache nicht leeren", e, t);
      }
      qe.delete(e);
    }
  }
}
function Oa(e) {
  e && lt.delete(e);
}
function Os(e, t) {
  if (!e || !t)
    return;
  const n = t.securityUuids;
  (Array.isArray(n) ? n : []).includes(e) && (Ua(e), Oa(e));
}
function Bs(e) {
  if (!e || tt.has(e))
    return;
  const t = (n) => {
    Ts(n) && Os(e, n.detail);
  };
  try {
    window.addEventListener(Va, t), tt.set(e, t);
  } catch (n) {
    console.error("ensureLiveUpdateSubscription: Registrierung fehlgeschlagen", n);
  }
}
function Ws(e) {
  if (!e || !tt.has(e))
    return;
  const t = tt.get(e);
  try {
    t && window.removeEventListener(Va, t);
  } catch (n) {
    console.error("removeLiveUpdateSubscription: Entfernen des Listeners fehlgeschlagen", n);
  }
  tt.delete(e);
}
function Ys(e) {
  e && (Ws(e), Ua(e), Oa(e));
}
function Cr(e, t) {
  if (!yt.has(e)) {
    yt.set(e, { activeRange: t });
    return;
  }
  const n = yt.get(e);
  n && (n.activeRange = t);
}
function Ba(e) {
  return yt.get(e)?.activeRange ?? Ls;
}
function An(e) {
  const t = Date.UTC(
    e.getUTCFullYear(),
    e.getUTCMonth(),
    e.getUTCDate()
  );
  return Math.floor(t / 864e5);
}
function Be(e) {
  const t = new Date(e.getTime());
  return t.setUTCHours(0, 0, 0, 0), t;
}
function Ar(e) {
  return !(e instanceof Date) || Number.isNaN(e.getTime()) ? null : An(Be(e));
}
function M(e) {
  return _e(e);
}
function Wa(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t || null;
}
function Te(e) {
  const t = Wa(e);
  return t ? t.toUpperCase() : null;
}
function Ks(e) {
  if (!e)
    return null;
  const t = On(e.aggregation), n = M(t?.purchase_total_security) ?? (t ? M(
    t.security_currency_total
  ) : null), r = M(t?.purchase_total_account) ?? (t ? M(
    t.account_currency_total
  ) : null);
  if (se(n) && se(r)) {
    const c = n / r;
    if (se(c))
      return c;
  }
  const a = Ye(e.average_cost), o = M(a?.native) ?? M(a?.security), i = M(a?.account) ?? M(a?.eur);
  if (se(o) && se(i)) {
    const c = o / i;
    if (se(c))
      return c;
  }
  return null;
}
function Ya(e, t = "Unbekannter Fehler") {
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
function Nt(e, t) {
  const n = Be(t instanceof Date ? t : /* @__PURE__ */ new Date()), r = Rs[e], a = Ar(n), o = {};
  if (a != null && (o.end_date = a), Number.isFinite(r) && r > 0) {
    const i = new Date(n.getTime());
    i.setUTCDate(i.getUTCDate() - (r - 1));
    const c = Ar(i);
    c != null && (o.start_date = c);
  }
  return o;
}
function Gn(e) {
  if (!e)
    return null;
  if (e instanceof Date)
    return Number.isNaN(e.getTime()) ? null : new Date(e.getTime());
  if (typeof e == "number" && Number.isFinite(e)) {
    const t = Math.trunc(e);
    if (t >= 1e6 && t <= 99999999) {
      const n = Math.floor(t / 1e4), r = Math.floor(t % 1e4 / 100), a = t % 100, o = new Date(Date.UTC(n, r - 1, a));
      return Number.isNaN(o.getTime()) ? null : o;
    }
    if (t >= 0 && t <= 1e5) {
      const n = new Date(t * 864e5);
      return Number.isNaN(n.getTime()) ? null : Be(n);
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
          return Be(r);
      }
    }
    if (/^\d{8}$/.test(t)) {
      const n = Number.parseInt(t.slice(0, 4), 10), r = Number.parseInt(t.slice(4, 6), 10) - 1, a = Number.parseInt(t.slice(6, 8), 10);
      if (Number.isFinite(n) && Number.isFinite(r) && Number.isFinite(a)) {
        const o = new Date(Date.UTC(n, r, a));
        if (!Number.isNaN(o.getTime()))
          return o;
      }
    }
  }
  return null;
}
function js(e) {
  const t = Gn(e);
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
function kt(e) {
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
function En(e) {
  return Array.isArray(e) ? e.map((t) => {
    let r = M(t.close);
    if (r == null) {
      const o = M(t.close_raw);
      o != null && (r = o / 1e8);
    }
    return r == null ? null : {
      date: Gn(t.date) ?? t.date,
      close: r
    };
  }).filter((t) => !!t) : [];
}
function Tt(e, t, n = null) {
  if (!Array.isArray(e))
    return [];
  const r = [], a = Te(t), o = a || "EUR", i = Ks(n);
  return e.forEach((c, s) => {
    const l = typeof c.type == "number" ? c.type : Number(c.type), u = Fs.has(l), d = Ms.has(l);
    if (!u && !d)
      return;
    const h = js(c.date), f = M(c.shares);
    let m = M(c.price);
    if (m == null) {
      const E = M(c.amount);
      k(E) && se(f) && (m = Math.abs(E) / f);
    }
    if (!h || m == null)
      return;
    const g = Te(c.currency_code), b = a ?? g ?? o;
    g && a && g !== a && se(i) && (m *= i);
    const p = M(c.net_price_eur), y = u ? "Kauf" : "Verkauf", _ = f != null ? `${Jn(f)} @ ` : "", v = `${y} ${_}${ve(m)} ${b}`, S = d && p != null ? `${v} (netto ${ve(p)} EUR)` : v, w = u ? Is : Hs, C = typeof c.uuid == "string" && c.uuid.trim() || `${y}-${h.getTime().toString()}-${s.toString()}`;
    r.push({
      id: C,
      x: h.getTime(),
      y: m,
      color: w,
      label: S,
      payload: {
        type: y,
        currency: b,
        transactionCurrency: g,
        shares: f,
        price: m,
        netPriceEur: p,
        date: h.toISOString(),
        portfolio: c.portfolio
      }
    });
  }), r;
}
function Xn(e) {
  const t = M(e?.last_price_native) ?? M(e?.last_price?.native) ?? null;
  if (k(t))
    return t;
  if (Te(e?.currency_code) === "EUR") {
    const r = M(e?.last_price_eur);
    if (k(r))
      return r;
  }
  return null;
}
function Gs(e) {
  if (!e)
    return null;
  const n = e.last_price_fetched_at, r = kt(n);
  if (r != null)
    return r;
  const o = e.last_price?.fetched_at;
  return kt(o) ?? null;
}
function xn(e, t) {
  let n = [];
  Array.isArray(e) && (n = e.map((l) => ({
    ...l
  })));
  const r = n.slice(), a = Xn(t);
  if (!k(a))
    return r;
  const o = Gs(t) ?? Date.now(), i = new Date(o);
  if (Number.isNaN(i.getTime()))
    return r;
  const c = An(Be(i));
  let s = null;
  for (let l = r.length - 1; l >= 0; l -= 1) {
    const u = r[l], d = Gn(u.date);
    if (!d)
      continue;
    const h = An(Be(d));
    if (s == null && (s = h), h === c)
      return u.close !== a && (r[l] = { ...u, close: a }), r;
    if (h < c)
      break;
  }
  return s != null && s > c || r.push({
    date: i,
    close: a
  }), r;
}
function k(e) {
  return typeof e == "number" && Number.isFinite(e);
}
function se(e) {
  return typeof e == "number" && Number.isFinite(e) && e > 0;
}
function nt(e, t, n) {
  if (!k(e) || !k(t))
    return !1;
  const r = Math.abs(e - t), a = Math.max(Math.abs(e), Math.abs(t), 1);
  return r <= a * 1e-4;
}
function Xs(e, t) {
  return !k(t) || t === 0 || !k(e) ? null : gi((e - t) / t * 100);
}
function Ka(e, t) {
  if (e.length === 0)
    return { priceChange: null, priceChangePct: null };
  const n = e[0], r = M(n.close);
  if (!k(r) || r === 0)
    return { priceChange: null, priceChangePct: null };
  const a = e[e.length - 1], o = M(a.close), i = M(t) ?? o;
  if (!k(i))
    return { priceChange: null, priceChangePct: null };
  const c = i - r, s = Object.is(c, -0) ? 0 : c, l = Xs(i, r);
  return { priceChange: s, priceChangePct: l };
}
function Zn(e, t) {
  if (!k(e) || e === 0)
    return "neutral";
  const n = 0.5 / Math.pow(10, t);
  return Math.abs(e) < n ? "neutral" : e > 0 ? "positive" : "negative";
}
function Zs(e, t) {
  if (!k(e))
    return '<span class="value neutral">—</span>';
  const n = ve(e);
  if (n === "—")
    return '<span class="value neutral">—</span>';
  const r = Zn(e, $t.max), a = t ? `&nbsp;${x(t)}` : "";
  return `<span class="value ${r}">${n}${a}</span>`;
}
function Js(e) {
  return k(e) ? `<span class="value ${Zn(e, 2)} value--percentage">${ye(e)}&nbsp;%</span>` : '<span class="value neutral">—</span>';
}
function ja(e, t, n, r) {
  const a = e, o = a.length > 0 ? a : "Zeitraum";
  return `
    <div class="security-info-bar" data-range="${T(a)}">
      <div class="security-info-item">
        <span class="label">Preisänderung (${x(o)})</span>
        <div class="value-row">
          ${Zs(t, r)}
          ${Js(n)}
        </div>
      </div>
    </div>
  `;
}
function Qs(e) {
  return `
    <div class="security-range-selector" role="group" aria-label="Zeitraum">
      ${Ha.map((n) => `
      <button
        type="button"
        class="security-range-button${n === e ? " active" : ""}"
        data-range="${T(n)}"
        aria-pressed="${n === e ? "true" : "false"}"
      >
        ${x(n)}
      </button>
    `).join(`
`)}
    </div>
  `;
}
function Ga(e, t = { status: "empty" }) {
  const n = T(e);
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
      const r = Ya(
        t.message,
        "Die historischen Daten konnten nicht geladen werden."
      );
      return `
        <div class="history-placeholder" data-state="error" data-range="${n}">
          <p>${x(r)}</p>
        </div>
      `;
    }
    case "empty":
    default: {
      const r = n.length > 0 ? n : "den gewählten Zeitraum";
      return `
        <div class="history-placeholder" data-state="empty" data-range="${n}">
          <p>Für dieses Wertpapier liegen im Zeitraum ${x(r)} keine historischen Daten vor.</p>
        </div>
      `;
    }
  }
}
function Jn(e) {
  const t = M(e);
  if (t == null)
    return "—";
  const n = Math.abs(t % 1) > 0, r = n ? 2 : rn.min, a = n ? rn.max : rn.min;
  return t.toLocaleString("de-DE", {
    minimumFractionDigits: r,
    maximumFractionDigits: a
  });
}
function ve(e) {
  const t = M(e);
  return t == null ? "—" : t.toLocaleString("de-DE", {
    minimumFractionDigits: $t.min,
    maximumFractionDigits: $t.max
  });
}
function ec(e, t) {
  const n = ve(e), r = `&nbsp;${x(t)}`;
  return `<span class="${Zn(e, $t.max)}">${n}${r}</span>`;
}
function tc(e, t) {
  const n = e?.ticker_symbol;
  if (typeof n == "string" && n.trim())
    return n.trim();
  const r = typeof e?.name == "string" ? e.name.trim() : "";
  return r || (typeof t == "string" ? t : "");
}
function nc(e) {
  return `
    <div class="news-prompt-container">
      <button
        type="button"
        class="news-prompt-button"
        data-symbol="${T(e)}"
      >
        Copy prompt &amp; open ChatGPT
      </button>
    </div>
  `;
}
async function rc(e) {
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
function ac(e) {
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
function oc(e, t, n) {
  const r = Ye(e?.average_cost), a = r?.account ?? (k(t) ? t : M(t));
  if (!k(a))
    return null;
  const o = e?.account_currency_code ?? e?.account_currency;
  if (typeof o == "string" && o.trim())
    return o.trim().toUpperCase();
  const i = Te(e?.currency_code) ?? "", c = r?.security ?? r?.native ?? (k(n) ? n : M(n)), s = On(e?.aggregation);
  if (i && k(c) && nt(a, c))
    return i;
  const l = M(s?.purchase_total_security) ?? M(e?.purchase_total_security), u = M(s?.purchase_total_account) ?? M(e?.purchase_total_account);
  let d = null;
  if (k(l) && l !== 0 && k(u) && (d = u / l), r?.source === "eur_total")
    return "EUR";
  const f = r?.eur;
  if (k(f) && nt(a, f))
    return "EUR";
  const m = M(e?.purchase_value_eur);
  return k(m) ? "EUR" : d != null && nt(d, 1) ? i || null : i === "EUR" ? "EUR" : i || "EUR";
}
function Er(e) {
  return typeof e != "number" || !Number.isFinite(e) || e <= 0 ? null : e.toLocaleString("de-DE", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
  });
}
function ic(e) {
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
  for (const o of n) {
    const i = t?.[o], c = kt(i);
    if (c != null)
      return c;
  }
  const r = [];
  t && "last_price_fetched_at" in t && r.push(t.last_price_fetched_at);
  const a = e?.last_price;
  a && typeof a == "object" && r.push(a.fetched_at), t && "last_price_date" in t && r.push(t.last_price_date);
  for (const o of r) {
    const i = kt(o);
    if (i != null)
      return i;
  }
  return null;
}
function sc(e) {
  if (e == null || !Number.isFinite(e))
    return null;
  const t = new Date(e);
  return Number.isNaN(t.getTime()) ? null : t.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}
function cc(e, t) {
  if (!e)
    return null;
  const n = Te(e.currency_code) ?? "", r = Ye(e.average_cost);
  if (!r || !n)
    return null;
  const a = r.native ?? r.security ?? null;
  let i = r.account ?? r.eur ?? null, c = Te(t) ?? "";
  if (se(r.eur) && (!c || c === n) && (i = r.eur, c = "EUR"), !n || !c || n === c || !se(a) || !se(i))
    return null;
  const s = i / a;
  if (!Number.isFinite(s) || s <= 0)
    return null;
  const l = Er(s);
  if (!l)
    return null;
  let u = null;
  if (s > 0) {
    const y = 1 / s;
    Number.isFinite(y) && y > 0 && (u = Er(y));
  }
  const d = ic(e), h = sc(d), f = [`FX-Kurs (Kauf): 1 ${n} = ${l} ${c}`];
  u && f.push(`1 ${c} = ${u} ${n}`);
  const m = [], g = r.source, b = g in an ? an[g] : an.aggregation;
  if (m.push(`Quelle: ${b}`), k(r.coverage_ratio)) {
    const y = Math.min(Math.max(r.coverage_ratio * 100, 0), 100);
    m.push(
      `Abdeckung: ${y.toLocaleString("de-DE", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      })}%`
    );
  }
  m.length && f.push(...m);
  const p = h ?? "Datum unbekannt";
  return `${f.join(" · ")} (Stand: ${p})`;
}
function xr(e) {
  if (!e)
    return null;
  const t = Ye(e.average_cost), n = t?.native ?? t?.security ?? null;
  return k(n) ? n : null;
}
function lc(e) {
  if (!e)
    return '<div class="meta-error">Keine Snapshot-Daten verfügbar.</div>';
  const t = e.currency_code || "EUR", n = e.total_holdings_precise ?? e.total_holdings, r = Jn(n), a = e.last_price_native ?? e.last_price?.native ?? e.last_price_eur, o = ve(a), i = o === "—" ? null : `${o}${`&nbsp;${x(t)}`}`, c = M(e.market_value_eur) ?? M(e.current_value_eur) ?? null, s = Ye(e.average_cost), l = s?.native ?? s?.security ?? null, u = s?.eur ?? null, h = s?.account ?? null ?? u, f = Me(e.performance), m = f?.day_change ?? null, g = m?.price_change_native ?? null, b = m?.price_change_eur ?? null, p = k(g) ? g : b, y = k(g) ? t : "EUR", _ = (Z, K = "") => {
    const te = ["value"];
    return K && te.push(...K.split(" ").filter(Boolean)), `<span class="${te.join(" ")}">${Z}</span>`;
  }, v = (Z = "") => {
    const K = ["value--missing"];
    return Z && K.push(Z), _("—", K.join(" "));
  }, S = (Z, K = "") => {
    if (!k(Z))
      return v(K);
    const te = ["value--gain"];
    return K && te.push(K), _(Xo(Z), te.join(" "));
  }, w = (Z, K = "") => {
    if (!k(Z))
      return v(K);
    const te = ["value--gain-percentage"];
    return K && te.push(K), _(Zo(Z), te.join(" "));
  }, C = i ? _(i, "value--price") : v("value--price"), E = r === "—" ? v("value--holdings") : _(r, "value--holdings"), $ = k(c) ? _(`${ye(c)}&nbsp;€`, "value--market-value") : v("value--market-value"), D = k(p) ? _(
    ec(p, y),
    "value--gain value--absolute"
  ) : v("value--absolute"), A = w(
    m?.change_pct,
    "value--percentage"
  ), P = S(
    f?.total_change_eur,
    "value--absolute"
  ), I = w(
    f?.total_change_pct,
    "value--percentage"
  ), j = oc(
    e,
    h,
    l
  ), F = cc(
    e,
    j
  ), z = F ? ` title="${T(F)}"` : "", H = [], L = k(u);
  k(l) ? H.push(
    _(
      `${ve(l)}${`&nbsp;${x(t)}`}`,
      "value--average value--average-native"
    )
  ) : H.push(
    v("value--average value--average-native")
  );
  let Y = null, oe = null;
  return L && (t !== "EUR" || !k(l) || !nt(u, l)) ? (Y = u, oe = "EUR") : k(h) && j && (j !== t || !nt(h, l ?? NaN)) && (Y = h, oe = j), Y != null && k(Y) && H.push(
    _(
      `${ve(Y)}${oe ? `&nbsp;${x(oe)}` : ""}`,
      "value--average value--average-eur"
    )
  ), `
    <div class="security-meta-grid security-meta-grid--expanded">
      <div class="security-meta-item security-meta-item--price">
        <span class="label">Letzter Preis</span>
        <div class="value-group">${C}</div>
      </div>
      <div class="security-meta-item security-meta-item--average">
        <span class="label">Durchschnittlicher Kaufpreis</span>
        <div class="value-group"${z}>
          ${H.join("")}
        </div>
      </div>
      <div class="security-meta-item security-meta-item--day-change">
        <span class="label">Tagesänderung</span>
        <div class="value-group">
          ${D}
          ${A}
        </div>
      </div>
      <div class="security-meta-item security-meta-item--total-change">
        <span class="label">Gesamtänderung</span>
        <div class="value-group">
          ${P}
          ${I}
        </div>
      </div>
      <div class="security-meta-item security-meta-item--holdings">
        <span class="label">Bestand</span>
        <div class="value-group">${E}</div>
      </div>
      <div class="security-meta-item security-meta-item--market-value">
        <span class="label">Marktwert (EUR)</span>
        <div class="value-group">${$}</div>
      </div>
    </div>
  `;
}
function uc(e) {
  return `
    <div class="card security-meta-card">
      <div id="headerMeta" class="meta">
        ${lc(e)}
      </div>
    </div>
  `;
}
function Xa(e) {
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
function dc(e, t, {
  currency: n,
  baseline: r,
  markers: a
} = {}) {
  const o = e.clientWidth || e.offsetWidth || 0, i = o > 0 ? o : 640, c = Math.min(Math.max(Math.floor(i * 0.5), 240), 440), s = (n || "").toUpperCase() || "EUR", l = k(r) ? r : null, u = Math.max(48, Math.min(72, Math.round(i * 0.075))), d = Math.max(28, Math.min(56, Math.round(i * 0.05))), h = Math.max(40, Math.min(64, Math.round(c * 0.14)));
  return {
    width: i,
    height: c,
    margin: {
      top: 18,
      right: d,
      bottom: h,
      left: u
    },
    series: t,
    yFormatter: (m) => ve(m),
    tooltipRenderer: ({ xFormatted: m, yFormatted: g }) => `
      <div class="chart-tooltip-date">${x(m)}</div>
      <div class="chart-tooltip-value">${x(g)}&nbsp;${x(s)}</div>
    `,
    markerTooltipRenderer: ({
      marker: m,
      xFormatted: g,
      yFormatted: b
    }) => {
      const p = m.payload ?? {}, y = Wa(p.type), _ = M(p.shares), v = _ != null ? Jn(_) : null, S = Te(p.currency) ?? s, w = [];
      y && w.push(y), v && w.push(`${v} Stück`), g && w.push(`am ${g}`);
      const C = w.join(" ").trim() || (typeof m.label == "string" ? m.label : g), E = typeof b == "string" && b.trim() ? b.trim() : ve(p.price), $ = E ? `${E}${S ? `&nbsp;${x(S)}` : ""}` : x(S);
      return `
      <div class="chart-tooltip-date">${x(C)}</div>
      <div class="chart-tooltip-value">${$}</div>
    `;
    },
    baseline: l != null ? {
      value: l,
      includeInDomain: !1
    } : null,
    markers: Array.isArray(a) ? a : []
  };
}
const Pr = /* @__PURE__ */ new WeakMap();
function fc(e, t, n = {}) {
  if (t.length === 0)
    return;
  const r = dc(e, t, n);
  let a = Pr.get(e) ?? null;
  if (!a || !e.contains(a)) {
    e.innerHTML = "", a = jn(e, r), a && Pr.set(e, a);
    return;
  }
  Wt(a, r);
}
function Dr(e, t) {
  e && (e.dataset.activeRange = t, e.querySelectorAll(".security-range-button").forEach((n) => {
    const r = n.dataset.range, a = r === t;
    n.classList.toggle("active", a), n.setAttribute("aria-pressed", a ? "true" : "false"), n.disabled = !1, n.classList.remove("loading"), r && (n.textContent = r);
  }));
}
function pc(e, t, n, r, a) {
  const o = e.querySelector(".security-info-bar");
  if (!o || !o.parentElement)
    return;
  const i = document.createElement("div");
  i.innerHTML = ja(t, n, r, a).trim();
  const c = i.firstElementChild;
  c && o.parentElement.replaceChild(c, o);
}
function $r(e, t, n, r, a = {}) {
  const o = e.querySelector(".security-detail-placeholder");
  if (o && (o.innerHTML = `
    <h2>Historie</h2>
    ${Ga(t, n)}
  `, n.status === "loaded" && Array.isArray(r) && r.length)) {
    const i = o.querySelector(".history-chart");
    i && requestAnimationFrame(() => {
      fc(i, r, a);
    });
  }
}
function hc(e) {
  const {
    root: t,
    hass: n,
    panelConfig: r,
    securityUuid: a,
    snapshot: o,
    initialRange: i,
    initialHistory: c,
    initialHistoryState: s
  } = e;
  setTimeout(() => {
    const l = t.querySelector(".security-range-selector");
    if (!l)
      return;
    const u = za(a), d = qa(a), h = xr(o);
    Array.isArray(c) && s.status !== "error" && u.set(i, c), Bs(a), Cr(a, i), Dr(l, i);
    const m = xn(
      c,
      o
    );
    let g = s;
    g.status !== "error" && (g = m.length ? { status: "loaded" } : { status: "empty" }), $r(
      t,
      i,
      g,
      m,
      {
        currency: o?.currency_code,
        baseline: h,
        markers: d.get(i) ?? []
      }
    );
    const b = async (p) => {
      if (p === Ba(a))
        return;
      const y = l.querySelector(
        `.security-range-button[data-range="${p}"]`
      );
      y && (!y.getAttribute("aria-label") && y.textContent && y.setAttribute("aria-label", y.textContent), y.disabled = !0, y.classList.add("loading"), y.innerHTML = Ut());
      let _ = u.get(p) ?? null, v = d.get(p) ?? null, S = null, w = [];
      if (_)
        S = _.length ? { status: "loaded" } : { status: "empty" };
      else
        try {
          const P = Nt(p), I = await Ue(
            n,
            r,
            a,
            P
          );
          _ = En(I.prices), v = Tt(
            I.transactions,
            o?.currency_code,
            o
          ), u.set(p, _), v = Array.isArray(v) ? v : [], d.set(p, v), S = _.length ? { status: "loaded" } : { status: "empty" };
        } catch (P) {
          console.error("Range-Wechsel: Historie konnte nicht geladen werden", P), _ = [], v = [], S = {
            status: "error",
            message: Xa(P) || "Die historischen Daten konnten aufgrund eines Fehlers nicht geladen werden."
          };
        }
      if (!Array.isArray(v))
        try {
          const P = Nt(p), I = await Ue(
            n,
            r,
            a,
            P
          );
          v = Tt(
            I.transactions,
            o?.currency_code,
            o
          ), v = Array.isArray(v) ? v : [], d.set(p, v);
        } catch (P) {
          console.error("Range-Wechsel: Transaktionsmarker konnten nicht geladen werden", P), v = [];
        }
      w = xn(_, o), S.status !== "error" && (S = w.length ? { status: "loaded" } : { status: "empty" });
      const C = Xn(o), { priceChange: E, priceChangePct: $ } = Ka(
        w,
        C
      ), D = Array.isArray(v) ? v : [];
      Cr(a, p), Dr(l, p), pc(
        t,
        p,
        E,
        $,
        o?.currency_code
      );
      const A = xr(o);
      $r(
        t,
        p,
        S,
        w,
        {
          currency: o?.currency_code,
          baseline: A,
          markers: D
        }
      );
    };
    l.addEventListener("click", (p) => {
      const y = p.target?.closest(".security-range-button");
      if (!y || y.disabled)
        return;
      const { range: _ } = y.dataset;
      !_ || !Ha.includes(_) || b(_);
    });
  }, 0);
}
function mc(e) {
  const { root: t, hass: n, panelConfig: r, tickerSymbol: a } = e;
  let o = null, i = !1;
  const c = async () => {
    try {
      o = await Qr(n, r);
    } catch (s) {
      i = !0, console.warn("News-Prompt: Prefetch fehlgeschlagen", s);
    }
  };
  c(), setTimeout(() => {
    const s = t.querySelector(".news-prompt-button");
    if (!s)
      return;
    const l = (d) => {
      const h = (o?.placeholder || wr).trim() || wr, f = (o?.prompt_template || "").trim(), m = (o?.link || "").trim() || Vs;
      return { body: f ? f.includes(h) ? f.split(h).join(d) : `${f}

Ticker: ${d}` : `Ticker: ${d}`, link: m };
    }, u = async () => {
      const d = (s.dataset.symbol || a || "").trim();
      if (!d) {
        console.warn("News-Prompt: Kein Ticker verfügbar");
        return;
      }
      if (s.classList.contains("loading"))
        return;
      s.disabled = !0, s.classList.add("loading");
      const h = s.textContent;
      s.innerHTML = Ut(), s.append(document.createTextNode(` ${h || ""}`));
      try {
        const { body: f, link: m } = l(d), g = await rc(f);
        g ? s.textContent = "✅ Copied! Opening..." : console.warn("News-Prompt: Clipboard unavailable – prompt could not be copied"), g && await new Promise((b) => setTimeout(b, 800)), ac(m), !o && !i && c();
      } catch (f) {
        console.error("News-Prompt: Kopiervorgang fehlgeschlagen", f);
      } finally {
        s.classList.remove("loading"), s.disabled = !1, h && setTimeout(() => {
          s.textContent = h;
        }, 2e3);
      }
    };
    s.addEventListener("click", () => {
      u();
    });
  }, 0);
}
async function gc(e, t, n, r) {
  if (!r)
    return console.error("renderSecurityDetail: securityUuid fehlt"), '<div class="card"><h2>Fehler</h2><p>Kein Wertpapier angegeben.</p></div>';
  const a = Us(r);
  let o = null, i = null;
  try {
    const A = await Vo(
      t,
      n,
      r
    ), P = A.snapshot;
    o = P && typeof P == "object" ? P : A;
  } catch (A) {
    console.error("renderSecurityDetail: Snapshot konnte nicht geladen werden", A), i = Ya(A);
  }
  const c = o || a, s = !!(a && !o), l = (c?.source ?? "") === "cache";
  r && qs(r, c ?? null);
  const u = c && (s || l) ? zs({ fallbackUsed: s, flaggedAsCache: l }) : "", d = c?.name || "Wertpapierdetails", h = dt(d, "", {
    includeMeta: !1,
    subtitle: "Positions-Details"
  });
  h.classList.add("security-detail-header");
  const f = uc(c);
  if (i)
    return `
      ${h.outerHTML}
      ${f}
      ${u}
      <div class="card error-card">
        <h2>Fehler beim Laden</h2>
        <p>${x(i)}</p>
      </div>
    `;
  const m = Ba(r), g = za(r), b = qa(r);
  let p = g.has(m) ? g.get(m) ?? null : null, y = { status: "empty" }, _ = b.has(m) ? b.get(m) ?? null : null;
  if (Array.isArray(p))
    y = p.length ? { status: "loaded" } : { status: "empty" };
  else {
    p = [];
    try {
      const A = Nt(m), P = await Ue(
        t,
        n,
        r,
        A
      );
      p = En(P.prices), _ = Tt(
        P.transactions,
        c?.currency_code,
        c
      ), g.set(m, p), _ = Array.isArray(_) ? _ : [], b.set(m, _), y = p.length ? { status: "loaded" } : { status: "empty" };
    } catch (A) {
      console.error(
        "renderSecurityDetail: Historie konnte nicht geladen werden",
        A
      ), y = {
        status: "error",
        message: Xa(A) || "Die historischen Daten konnten aufgrund eines Fehlers nicht geladen werden."
      };
    }
  }
  if (!Array.isArray(_))
    try {
      const A = Nt(m), P = await Ue(
        t,
        n,
        r,
        A
      ), I = En(P.prices);
      _ = Tt(
        P.transactions,
        c?.currency_code,
        c
      ), g.set(m, I), _ = Array.isArray(_) ? _ : [], b.set(m, _), p = I, y = p.length ? { status: "loaded" } : { status: "empty" };
    } catch (A) {
      console.error(
        "renderSecurityDetail: Transaktionsmarker konnten nicht geladen werden",
        A
      ), _ = [];
    }
  const v = xn(
    p,
    c
  );
  y.status !== "error" && (y = v.length ? { status: "loaded" } : { status: "empty" });
  const S = tc(c, r), w = nc(S), C = Xn(c), { priceChange: E, priceChangePct: $ } = Ka(
    v,
    C
  ), D = ja(
    m,
    E,
    $,
    c?.currency_code
  );
  return hc({
    root: e,
    hass: t,
    panelConfig: n,
    securityUuid: r,
    snapshot: c,
    initialRange: m,
    initialHistory: p,
    initialHistoryState: y
  }), mc({
    root: e,
    hass: t,
    panelConfig: n,
    tickerSymbol: S
  }), `
    ${h.outerHTML}
    ${f}
    ${u}
    ${w}
    ${D}
    ${Qs(m)}
    <div class="card security-detail-placeholder">
      <h2>Historie</h2>
      ${Ga(m, y)}
    </div>
  `;
}
function yc(e) {
  const { setSecurityDetailTabFactory: t } = e;
  if (typeof t != "function") {
    console.error("registerSecurityDetailTab: Ungültige Factory-Funktion übergeben");
    return;
  }
  t((n) => ({
    title: "Wertpapier",
    render: (r, a, o) => gc(r, a, o, n),
    cleanup: () => {
      Ys(n);
    }
  }));
}
class bc {
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
  activeDropdown = null;
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
    this.element.classList.add("date-range-picker"), this.triggerEl = document.createElement("div"), this.triggerEl.className = "drp-trigger", this.triggerEl.setAttribute("role", "button"), this.triggerEl.setAttribute("aria-expanded", "false"), this.triggerEl.setAttribute("aria-haspopup", "dialog"), this.triggerEl.setAttribute("tabindex", "0"), this.triggerEl.setAttribute("title", "Zeitraum wählen"), this.triggerEl.innerHTML = `
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
    const o = document.createElement("span");
    o.textContent = "–", o.setAttribute("aria-hidden", "true"), a.appendChild(this.startInput), a.appendChild(o), a.appendChild(this.endInput);
    const i = document.createElement("div");
    i.className = "drp-actions";
    const c = document.createElement("button");
    c.className = "drp-btn drp-btn-cancel", c.textContent = "Abbrechen", c.addEventListener("click", (l) => {
      l.stopPropagation(), this.close();
    });
    const s = document.createElement("button");
    s.className = "drp-btn drp-btn-apply", s.textContent = "Übernehmen", s.addEventListener("click", (l) => {
      l.stopPropagation(), this.apply();
    }), i.appendChild(c), i.appendChild(s), r.appendChild(a), r.appendChild(i), n.appendChild(r), this.popoverEl.appendChild(n), this.element.appendChild(this.popoverEl);
  }
  bindEvents() {
    const t = (n) => {
      n.stopPropagation(), this.toggle();
    };
    this.triggerEl.addEventListener("click", t), this.triggerEl.addEventListener("keydown", (n) => {
      (n.key === "Enter" || n.key === " ") && (n.preventDefault(), t(n));
    }), document.addEventListener("click", (n) => {
      const r = n.composedPath();
      this.activeDropdown && r.includes(this.activeDropdown) || (this.isOpen && !r.includes(this.element) && !r.includes(this.popoverEl) && this.close(), this.activeDropdown && this.closeDropdown());
    }), this.popoverEl.addEventListener("click", (n) => {
      n.stopPropagation(), this.activeDropdown && this.closeDropdown();
    }), this.popoverEl.addEventListener("keydown", (n) => {
      if (n.key === "Escape") {
        n.stopPropagation(), this.activeDropdown ? this.closeDropdown() : this.close();
        return;
      }
    });
  }
  toggle() {
    this.isOpen ? this.close() : this.open();
  }
  open() {
    this.isOpen = !0, this.previousFocus = document.activeElement, this.popoverEl.classList.add("open"), this.popoverEl.style.display = "flex", this.triggerEl.classList.add("active"), this.triggerEl.setAttribute("aria-expanded", "true");
    const t = this.triggerEl.getBoundingClientRect(), n = t.bottom + 8, r = t.left;
    this.popoverEl.style.top = `${String(n)}px`, this.popoverEl.style.left = `${String(r)}px`, this.tempRange = { ...this.range }, this.viewDate = new Date(this.range.end.getFullYear(), this.range.end.getMonth() - 1, 1), this.renderCalendars(), this.updateInputs(), this.updatePresetState(null), requestAnimationFrame(() => {
      const a = this.popoverEl.querySelector(
        'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      a && a.focus();
    });
  }
  close() {
    this.isOpen = !1, this.closeDropdown(), this.popoverEl.classList.remove("open"), this.popoverEl.style.display = "", this.triggerEl.classList.remove("active"), this.triggerEl.setAttribute("aria-expanded", "false"), this.previousFocus && document.body.contains(this.previousFocus) && this.previousFocus.focus(), this.previousFocus = null;
  }
  closeDropdown() {
    this.activeDropdown && (this.activeDropdown.remove(), this.activeDropdown = null);
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
    const r = t.getFullYear(), a = t.getMonth(), o = document.createElement("div");
    o.className = "drp-calendar";
    const i = document.createElement("div");
    i.className = "drp-calendar-header";
    const c = document.createElement("button");
    c.className = "drp-nav-btn", c.innerHTML = `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"></path>
            </svg>
        `, c.setAttribute("aria-label", "Vorheriger Monat"), c.setAttribute("title", "Vorheriger Monat"), n === "left" ? c.addEventListener("click", (v) => {
      v.stopPropagation(), this.closeDropdown(), this.viewDate.setMonth(this.viewDate.getMonth() - 1), this.renderCalendars();
    }) : c.style.visibility = "hidden";
    const s = document.createElement("div");
    s.className = "drp-title-container", s.style.display = "flex", s.style.alignItems = "center", s.style.gap = "4px";
    const l = document.createElement("div");
    l.className = "drp-dropdown-container";
    const u = document.createElement("button");
    u.className = "drp-header-btn", u.setAttribute("aria-haspopup", "true"), u.setAttribute("aria-expanded", "false"), u.innerHTML = `<span>${t.toLocaleDateString("de-DE", { month: "long" })}</span> <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>`, u.onclick = (v) => {
      v.stopPropagation();
      const S = u.closest(".drp-calendar-header")?.querySelectorAll(".drp-header-btn") ?? [];
      this.toggleMonthDropdown(l, t.getMonth(), (C) => {
        const E = t.getFullYear();
        this.viewDate = new Date(E, C, 1), this.renderCalendars();
      });
      const w = this.activeDropdown && l.contains(this.activeDropdown);
      S.forEach((C) => {
        C === u ? C.setAttribute("aria-expanded", w ? "true" : "false") : C.setAttribute("aria-expanded", "false");
      });
    }, l.appendChild(u);
    const d = document.createElement("div");
    d.className = "drp-dropdown-container";
    const h = document.createElement("button");
    h.className = "drp-header-btn", h.setAttribute("aria-haspopup", "true"), h.setAttribute("aria-expanded", "false"), h.innerHTML = `<span>${String(t.getFullYear())}</span> <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>`, h.onclick = (v) => {
      v.stopPropagation();
      const S = h.closest(".drp-calendar-header")?.querySelectorAll(".drp-header-btn") ?? [];
      this.toggleYearDropdown(d, t.getFullYear(), (C) => {
        const E = t.getMonth();
        this.viewDate = new Date(C, E, 1), this.renderCalendars();
      });
      const w = this.activeDropdown && d.contains(this.activeDropdown);
      S.forEach((C) => {
        C === h ? C.setAttribute("aria-expanded", w ? "true" : "false") : C.setAttribute("aria-expanded", "false");
      });
    }, d.appendChild(h), s.appendChild(l), s.appendChild(d);
    const f = document.createElement("button");
    f.className = "drp-nav-btn", f.innerHTML = `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"></path>
            </svg>
        `, f.setAttribute("aria-label", "Nächster Monat"), f.setAttribute("title", "Nächster Monat"), n === "right" ? f.addEventListener("click", (v) => {
      v.stopPropagation(), this.closeDropdown(), this.viewDate.setMonth(this.viewDate.getMonth() + 1), this.renderCalendars();
    }) : f.style.visibility = "hidden", i.appendChild(c), i.appendChild(s), i.appendChild(f), o.appendChild(i);
    const m = document.createElement("div");
    m.className = "drp-days-header", ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].forEach((v) => {
      const S = document.createElement("span");
      S.className = "drp-day-name", S.textContent = v, m.appendChild(S);
    }), o.appendChild(m);
    const g = document.createElement("div");
    g.className = "drp-days-grid", g.setAttribute("role", "listbox"), g.setAttribute("aria-multiselectable", "true"), g.setAttribute("aria-label", "Kalender");
    const b = new Date(r, a, 1), p = new Date(r, a + 1, 0);
    let y = b.getDay() - 1;
    y < 0 && (y = 6);
    for (let v = 0; v < y; v++) {
      const S = document.createElement("div");
      S.className = "drp-day empty", g.appendChild(S);
    }
    const _ = /* @__PURE__ */ new Date();
    for (let v = 1; v <= p.getDate(); v++) {
      const S = new Date(r, a, v), w = document.createElement("div");
      w.className = "drp-day", w.textContent = v.toString(), w.setAttribute("role", "option"), w.tabIndex = 0;
      let C = S.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
      S.getDate() === _.getDate() && S.getMonth() === _.getMonth() && S.getFullYear() === _.getFullYear() && (w.setAttribute("aria-current", "date"), C = `Heute, ${C}`);
      const E = S.getTime(), $ = this.tempRange.start.getTime(), D = this.tempRange.end.getTime();
      E === $ ? C += " (Startdatum)" : E === D ? C += " (Enddatum)" : E > $ && E < D && (C += " (im Zeitraum)"), w.setAttribute("aria-label", C);
      const A = E === $ || E === D;
      w.setAttribute("aria-selected", A ? "true" : "false"), this.applyDayClasses(w, S), w.addEventListener("click", (P) => {
        P.stopPropagation(), this.handleDayClick(S);
      }), w.addEventListener("keydown", (P) => {
        (P.key === "Enter" || P.key === " ") && (P.preventDefault(), P.stopPropagation(), this.handleDayClick(S));
      }), w.addEventListener("mouseenter", () => {
        this.handleDayHover(S);
      }), g.appendChild(w);
    }
    o.appendChild(g), this.calendarsContainer.appendChild(o);
  }
  toggleMonthDropdown(t, n, r) {
    if (this.activeDropdown && t.contains(this.activeDropdown)) {
      this.closeDropdown();
      return;
    }
    this.closeDropdown();
    const a = document.createElement("div");
    a.className = "drp-dropdown", [
      "Januar",
      "Februar",
      "März",
      "April",
      "Mai",
      "Juni",
      "Juli",
      "August",
      "September",
      "Oktober",
      "November",
      "Dezember"
    ].forEach((c, s) => {
      const l = document.createElement("button");
      l.className = "drp-dropdown-item", s === n && (l.classList.add("selected"), l.setAttribute("aria-current", "true")), l.textContent = c, l.onclick = (u) => {
        u.stopPropagation(), this.closeDropdown(), r(s);
      }, a.appendChild(l);
    }), t.appendChild(a), this.activeDropdown = a;
    const i = a.querySelector(".selected");
    i && setTimeout(() => {
      i.scrollIntoView({ block: "center" });
    }, 0);
  }
  toggleYearDropdown(t, n, r) {
    if (this.activeDropdown && t.contains(this.activeDropdown)) {
      this.closeDropdown();
      return;
    }
    this.closeDropdown();
    const a = document.createElement("div");
    a.className = "drp-dropdown";
    const o = n - 50, i = n + 20;
    for (let s = o; s <= i; s++) {
      const l = document.createElement("button");
      l.className = "drp-dropdown-item", s === n && (l.classList.add("selected"), l.setAttribute("aria-current", "true")), l.textContent = s.toString(), l.onclick = (u) => {
        u.stopPropagation(), this.closeDropdown(), r(s);
      }, a.appendChild(l);
    }
    t.appendChild(a), this.activeDropdown = a;
    const c = a.querySelector(".selected");
    c && setTimeout(() => {
      c.scrollIntoView({ block: "center" });
    }, 0);
  }
  applyDayClasses(t, n) {
    const r = n.getTime(), a = this.tempRange.start.getTime(), o = this.tempRange.end.getTime();
    r === a && t.classList.add("range-start"), r === o && t.classList.add("range-end"), r > a && r < o && t.classList.add("in-range");
    const i = /* @__PURE__ */ new Date();
    n.getDate() === i.getDate() && n.getMonth() === i.getMonth() && n.getFullYear() === i.getFullYear() && (t.style.fontWeight = "bold");
  }
  handleDayClick(t) {
    const n = t.getTime(), r = this.tempRange.start.getTime(), a = this.tempRange.end.getTime();
    r !== a ? this.tempRange = { start: t, end: t } : n < r ? this.tempRange = { start: t, end: t } : this.tempRange = { start: this.tempRange.start, end: t }, this.updateInputs(), this.renderCalendars(), this.updatePresetState(null);
  }
  handleDayHover(t) {
  }
}
const _c = 30;
let Za = null, Pn = null;
const be = /* @__PURE__ */ new Set(), vc = [
  "#1976d2",
  "#c2185b",
  "#7b1fa2",
  "#00796b",
  "#ef6c00",
  "#5d4037",
  "#512da8",
  "#0097a7"
];
function Dn(e) {
  const t = e.getUTCFullYear(), n = String(e.getUTCMonth() + 1).padStart(2, "0"), r = String(e.getUTCDate()).padStart(2, "0");
  return `${String(t)}-${n}-${r}`;
}
function Nr(e) {
  const t = e.getFullYear(), n = String(e.getMonth() + 1).padStart(2, "0"), r = String(e.getDate()).padStart(2, "0");
  return `${String(t)}-${n}-${r}`;
}
function Sc() {
  const e = /* @__PURE__ */ new Date(), t = new Date(e);
  return t.setUTCDate(e.getUTCDate() - (_c - 1)), {
    range: {
      start: Dn(t),
      end: Dn(e)
    },
    includeSlices: !0,
    includeScopes: !0
  };
}
function wc(e) {
  if (!e.length)
    return "";
  const t = e.some((o) => o.fx_coverage_ratio != null && o.fx_coverage_ratio < 1), n = e.some((o) => o.price_coverage_ratio != null && o.price_coverage_ratio < 1), r = e.some((o) => o.stale_price), a = [];
  return t && a.push('<span class="meta-badge meta-badge--warning" title="Wechselkurse fehlen teilweise">FX-Abdeckung</span>'), n && a.push('<span class="meta-badge meta-badge--warning" title="Preisdaten unvollständig">Preisabdeckung</span>'), r && a.push('<span class="meta-badge meta-badge--neutral" title="Letzte Kurse sind veraltet">Stale Kurse</span>'), a.length ? `<span class="meta-badges">${a.join("")}</span>` : '<span class="meta-badge meta-badge--positive">Volle Abdeckung</span>';
}
function $n(e) {
  return `${ye(e)}&nbsp;€`;
}
function ft(e, t, n = "") {
  const r = e.querySelector("#analyse-status");
  r && (r.dataset.state = t, t === "loading" ? r.textContent = "Lade Vermögensdaten …" : t === "error" ? r.textContent = n || "Daten konnten nicht geladen werden." : r.textContent = "");
}
function on(e, t, n) {
  const r = e.querySelector("#analyse-total-wealth"), a = e.querySelector("#analyse-coverage"), o = e.querySelector("#analyse-selection-label");
  if (!r || !a || !o)
    return;
  if (o.textContent = t, !n.length) {
    r.innerHTML = "—", a.innerHTML = "";
    return;
  }
  const i = n[n.length - 1];
  r.innerHTML = $n(i.total_wealth_eur), a.innerHTML = wc(n);
}
function sn(e, t, n, r, a, o) {
  const i = e.querySelector(".analyse-metrics-grid");
  if (!i) return;
  if (!t.length) {
    i.innerHTML = '<div class="metrics-empty">Keine Daten verfügbar</div>';
    return;
  }
  const c = Dc(t, n);
  if (!c) return;
  const s = (h, f, m = "", g = "", b = "") => {
    const p = b && r && o, y = p ? ' role="button" tabindex="0" aria-expanded="false"' : "";
    return `
    <div class="metric-row ${m} ${p ? "interactive" : ""}"
         ${g ? `id="${g}"` : ""}
         ${b ? `data-breakdown-type="${b}"` : ""}${y}>
      <span class="metric-label">
        ${p ? '<span class="toggle-icon">▶</span> ' : ""}${h}
      </span>
      <span class="metric-value">${typeof f == "number" ? $n(f) : f}</span>
    </div>`;
  }, l = (h) => {
    const f = (h * 100).toFixed(2);
    return `<span class="meta-badge ${h > 0 ? "meta-badge--positive" : h < 0 ? "meta-badge--warning" : "meta-badge--neutral"}" style="font-size: 1.1em; padding: 0.1em 0.5em;">${f} %</span>`;
  }, u = `
    <div class="metrics-section">
      <h3>Performance-Berechnung</h3>
      ${s("Anfangswert", c.startValue, "", "perf-startValue")}
      ${s("Nicht real. Kursgewinne", c.unrealizedGains, "", "", "unrealized_gains")}
      ${s("Realisierte Kursgewinne", c.realizedGains, "", "", "realized_gains")}
      ${s("Dividenden", c.dividends, "", "", "dividends")}
      ${s("Zinsen", c.interest, "", "", "interest")}
      ${s("Steuern", c.taxes, "", "", "taxes")}
      ${s("Gebühren", c.fees, "", "", "fees")}
      ${s("FX-Gewinne (Cash)", c.fxGains, "", "", "fx_gains_cash")}
      ${s("Performanceneutrale Bew.", c.netTransfers, "", "", "net_transfers")}
      ${s("Endwert", c.endValue, "highlight", "perf-endValue")}

      <h3>Rendite (Zeitraum)</h3>
      ${s("Time-Weighted Return (TWR)", l(c.twr))}
      ${s("Internal Rate of Return (IRR)", l(c.irr))}
    </div>
  `;
  i.innerHTML = u;
  const d = (h) => {
    (async () => {
      if (!r || !a) return;
      const f = h.currentTarget, m = f.dataset.breakdownType;
      if (!m) return;
      const g = f.classList.contains("expanded");
      if (f.setAttribute("aria-expanded", g ? "false" : "true"), g) {
        f.classList.remove("expanded");
        const b = f.querySelector(".toggle-icon");
        b && (b.textContent = "▶");
        let p = f.nextElementSibling;
        for (; p && p.classList.contains("breakdown-row"); ) {
          const y = p;
          p = p.nextElementSibling, y.remove();
        }
      } else {
        f.classList.add("expanded");
        const b = f.querySelector(".toggle-icon");
        b && (b.textContent = "▼");
        try {
          const p = document.createElement("div");
          p.className = "breakdown-row loading", p.innerHTML = '<span class="metric-label">Lade Details...</span><span class="metric-value">...</span>', f.after(p);
          let y = a.range?.start, _ = a.range?.end;
          y || (y = t[0].date, _ = t[t.length - 1].date);
          const v = await r.connection.sendMessagePromise({
            type: "pp_reader/get_performance_breakdown",
            entry_id: o,
            start: y,
            end: _
          });
          p.remove();
          const S = v[m];
          if (!S || S.length === 0) {
            const w = document.createElement("div");
            w.className = "breakdown-row empty", w.innerHTML = '<span class="metric-label">Keine Details</span><span class="metric-value">—</span>', f.after(w);
          } else
            [...S].reverse().forEach((w) => {
              const C = document.createElement("div");
              C.className = "breakdown-row", C.style.animation = "fadeIn 0.2s ease";
              const E = document.createElement("span");
              E.className = "metric-label", E.textContent = w.label;
              const $ = document.createElement("span");
              $.className = "metric-value", $.innerHTML = $n(w.amount), C.appendChild(E), C.appendChild($), f.after(C);
            });
        } catch (p) {
          console.error("Breakdown fetch failed", p);
          const y = document.createElement("div");
          y.className = "breakdown-row error", y.innerHTML = '<span class="metric-label">Fehler beim Laden</span>', f.querySelector(".breakdown-row.loading")?.replaceWith(y);
        }
      }
    })();
  };
  i.querySelectorAll(".metric-row.interactive").forEach((h) => {
    h.addEventListener("click", d), h.addEventListener("keydown", (f) => {
      const m = f.key;
      (m === "Enter" || m === " ") && (f.preventDefault(), d(f));
    });
  });
}
function Lt(e, t) {
  return !e || !t ? null : `${e}:${t}`;
}
function Cc(e) {
  if (!e) {
    be.clear();
    return;
  }
  const t = /* @__PURE__ */ new Set(), n = (r, a) => {
    r.forEach((o) => {
      const i = Lt(a, o.scope_id);
      i && t.add(i);
    });
  };
  n(e.accounts, "account"), n(e.portfolios, "portfolio"), be.size === 0 ? t.forEach((r) => be.add(r)) : Array.from(be).forEach((r) => {
    t.has(r) || be.delete(r);
  });
}
function Ac(e, t) {
  const n = e.querySelector(".analyse-scope-filters");
  if (!n)
    return;
  const r = n.cloneNode(!1);
  n.replaceWith(r), r.innerHTML = "";
  const a = t ? t.accounts.length > 0 : !1, o = t ? t.portfolios.length > 0 : !1;
  if (!t || !a && !o) {
    r.innerHTML = '<p class="table-note" role="note"><span class="table-note__icon" aria-hidden="true">ℹ️</span><span>Keine Slices verfügbar.</span></p>';
    return;
  }
  const i = (c, s, l) => {
    const u = /* @__PURE__ */ new Map();
    if (s.forEach((h) => {
      const f = Lt(l, h.scope_id);
      f && !u.has(f) && u.set(f, h);
    }), u.size === 0)
      return "";
    const d = Array.from(u.values()).map((h) => {
      const f = Lt(l, h.scope_id);
      if (!f)
        return "";
      const m = be.has(f) ? "checked" : "", g = x(h.scope_name ?? h.scope_id);
      return `
          <label class="scope-option">
            <input type="checkbox" data-scope-key="${T(f)}" ${m}>
            <span>${g}</span>
          </label>
        `;
    }).join("");
    return `<div class="scope-group"><div class="scope-title">${c}</div>${d}</div>`;
  };
  r.innerHTML = `
    ${i("Konten", t.accounts, "account")}
    ${i("Depots", t.portfolios, "portfolio")}
  `, r.addEventListener("change", (c) => {
    const s = c.target?.closest('input[type="checkbox"][data-scope-key]');
    if (!s || !s.dataset.scopeKey)
      return;
    const { scopeKey: l } = s.dataset;
    if (!l)
      return;
    s.checked ? be.add(l) : be.delete(l);
    const u = e.closest("#analyse-chart-card");
    u && Pn && Ja(u, Pn);
  });
}
function Ec(e) {
  if (typeof e == "number")
    return Number.isFinite(e) ? e : null;
  const t = Date.parse(e);
  return Number.isFinite(t) ? t : null;
}
function xc(e) {
  const t = Array.from(vc), n = {
    key: "total",
    label: "Gesamtvermögen",
    color: "#2c3e50",
    points: e.records.map((i) => ({
      date: i.date,
      value: i.total_wealth_eur
    }))
  }, r = [], a = /* @__PURE__ */ new Map(), o = (i, c) => {
    i.forEach((s) => {
      const l = Lt(c, s.scope_id);
      l && (a.has(l) || a.set(l, /* @__PURE__ */ new Map()), a.get(l)?.set(s.date, s));
    });
  };
  return e.slices && (o(e.slices.accounts, "account"), o(e.slices.portfolios, "portfolio")), a.forEach((i, c) => {
    if (!be.has(c))
      return;
    const s = t.shift() ?? "#607d8b", l = c.startsWith("account:"), u = c.split(":")[1] ?? "", h = `${l ? "Konto" : "Depot"} ${u}`.trim(), f = i.values().next(), g = (f.done ? void 0 : f.value)?.scope_name ?? h;
    r.push({
      key: c,
      label: g,
      color: s,
      points: e.records.map((b) => {
        const p = i.get(b.date);
        return !p || !Number.isFinite(p.total_wealth_eur) ? null : { date: b.date, value: p.total_wealth_eur };
      }).filter((b) => !!b)
    });
  }), [n, ...r];
}
function Pc(e, t) {
  const n = e.__chartState, r = e.querySelector("svg");
  if (!n || !n.range || !n.margin || !r)
    return;
  const { range: a, margin: o } = n;
  r.querySelectorAll(".analyse-slice-series").forEach((i) => {
    i.remove();
  }), t.filter((i) => i.key !== "total").forEach((i) => {
    const c = i.points.map((u, d) => {
      const h = Ec(u.date);
      if (h == null || !Number.isFinite(u.value))
        return null;
      const f = a.maxX === a.minX ? 0.5 : (h - a.minX) / (a.maxX - a.minX), m = a.maxY === a.minY ? 0.5 : (u.value - a.minY) / (a.maxY - a.minY), g = o.left + f * a.boundedWidth, b = o.top + (1 - m) * a.boundedHeight;
      return `${d === 0 ? "M" : "L"}${String(g)},${String(b)}`;
    }).filter(Boolean).join(" ");
    if (!c)
      return;
    const s = document.createElementNS("http://www.w3.org/2000/svg", "g");
    s.setAttribute("class", "analyse-slice-series");
    const l = document.createElementNS("http://www.w3.org/2000/svg", "path");
    l.setAttribute("d", c), l.setAttribute("fill", "none"), l.setAttribute("stroke", i.color), l.setAttribute("stroke-width", "2"), l.setAttribute("stroke-linejoin", "round"), l.setAttribute("stroke-linecap", "round"), s.appendChild(l), r.appendChild(s);
  });
}
function Ja(e, t) {
  const n = e.querySelector(".line-chart-container");
  if (!n)
    return;
  const r = xc(t), a = r[0];
  if (!a.points.length) {
    n.innerHTML = `
      <div class="history-placeholder" data-state="empty">
        <p>Keine Chart-Daten verfügbar.</p>
      </div>
    `;
    return;
  }
  const o = {
    series: a.points,
    xAccessor: (s) => s.date,
    yAccessor: (s) => s.value,
    xFormatter: (s) => {
      const l = new Date(s);
      return Number.isFinite(l.getTime()) ? l.toLocaleDateString("de-DE") : "";
    },
    yFormatter: (s) => ye(s),
    color: a.color,
    areaColor: "rgba(44, 62, 80, 0.12)"
  }, i = n;
  let c = i;
  !i.__chartState || !n.querySelector("svg") ? (n.innerHTML = "", c = jn(n, o)) : (Wt(i, o), c = i), c && Pc(c, r);
}
function Dc(e, t) {
  if (!t)
    return null;
  const {
    start_wealth: n,
    end_wealth: r,
    realized_gains: a,
    unrealized_gains: o,
    fx_gains_cash: i,
    dividends: c,
    interest: s,
    fees: l,
    taxes: u,
    net_transfers: d,
    twr: h,
    irr: f
  } = t, m = a + o;
  return {
    startValue: n,
    endValue: r,
    marketGain: m,
    realizedGains: a,
    unrealizedGains: o,
    fxGains: i,
    dividends: c,
    interest: s,
    fees: -Math.abs(l),
    taxes: -Math.abs(u),
    netTransfers: d,
    twr: h ?? 0,
    irr: f ?? 0
  };
}
async function Nn(e, t, n, r, a) {
  ft(e, "loading");
  let o = a;
  if (a.range) {
    const l = a.range.start.split("-").map(Number), u = new Date(Date.UTC(l[0], l[1] - 1, l[2]));
    u.setUTCDate(u.getUTCDate() - 1), o = {
      ...a,
      range: {
        start: Dn(u),
        end: a.range.end
      },
      metrics_start: a.range.start
    };
  }
  const i = await Go(n, r, o);
  if (i.status === "error") {
    if (ft(e, "error", i.error ?? void 0), t) {
      const l = t.querySelector(".line-chart-container");
      l && l.replaceChildren();
    }
    return;
  }
  const c = i.data;
  if (!c || !Array.isArray(c.records) || c.records.length === 0) {
    const l = a.range?.start ?? "?", u = a.range?.end ?? "?", d = `Zeitraum: ${l} – ${u}`;
    if (on(e, d, []), sn(e, []), ft(e, "loaded", "Keine Daten für den gewählten Zeitraum."), t) {
      const h = t.querySelector(".line-chart-container");
      h && h.replaceChildren();
    }
    return;
  }
  Za = a, Pn = c, Cc(c.slices);
  let s = "";
  if (c.records.length > 1) {
    const l = c.records[1], u = c.records[c.records.length - 1];
    s = `Zeitraum: ${l.date} – ${u.date}`;
  } else c.records.length === 1 ? s = `Tag: ${c.records[0].date}` : a.range ? s = `Zeitraum: ${a.range.start} – ${a.range.end}` : a.date && (s = `Tag: ${a.date}`);
  if (on(e, s, c.records), on(e, s, c.records), n) {
    const l = fn(n, r);
    l ? sn(e, c.records, c.metrics, n, a, l) : sn(e, c.records, c.metrics, n, a, "");
  }
  t && (Ac(t, c.slices), Ja(t, c)), ft(e, "loaded");
}
async function cn(e, t, n) {
  const r = e.querySelector("#analyse-range-card"), a = e.querySelector("#analyse-chart-card");
  if (!r)
    return;
  const o = St();
  o.selection && await Nn(r, a, t, n, o.selection);
}
function $c(e, t, n, r) {
  const a = e.querySelector("#analyse-date-picker-container"), o = Za ?? St().selection ?? Sc();
  let i;
  if (o.range)
    i = {
      start: new Date(o.range.start),
      end: new Date(o.range.end)
    };
  else if (o.date) {
    const c = new Date(o.date);
    i = { start: c, end: c };
  }
  a && new bc(a, {
    initialRange: i,
    onChange: (c) => {
      const s = {
        range: {
          start: Nr(c.start),
          end: Nr(c.end)
        },
        includeSlices: !0,
        includeScopes: !0
      };
      Nn(e, t, n, r, s);
    }
  }), Nn(e, t, n, r, o);
}
function Nc(e, t, n) {
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

      /* Breakdown Styles */
      .metric-row.interactive {
        cursor: pointer;
      }
      .metric-row.interactive:hover .metric-label,
      .metric-row.interactive:focus-visible .metric-label {
        color: var(--primary-color, #03a9f4);
        text-decoration: underline;
        text-decoration-thickness: 1px;
        text-underline-offset: 3px;
      }
      .metric-row.interactive:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
        border-radius: 2px;
      }

      .toggle-icon {
        display: inline-block;
        width: 1.25em;
        text-align: center;
        font-size: 0.8em;
        color: var(--secondary-text-color, #727272);
      }

      .breakdown-row {
        grid-column: 1 / -1;
        display: flex;
        justify-content: space-between;
        padding: 0.35rem 0 0.35rem 2rem;
        font-size: 0.9em;
        border-bottom: 1px dashed var(--divider-color, #ddd);
        background-color: rgba(0,0,0,0.01);
      }
      .breakdown-row:last-of-type {
        border-bottom: none;
      }
      .breakdown-row .metric-label {
        font-weight: 400;
        color: var(--primary-text-color);
      }
      .breakdown-row .metric-value {
        font-family: var(--code-font-family, monospace);
        font-weight: 400;
      }

      .breakdown-row.loading, .breakdown-row.empty, .breakdown-row.error {
        color: var(--secondary-text-color);
        font-style: italic;
        padding-left: 2rem;
      }
      .breakdown-row.error {
        color: var(--error-color, #d32f2f);
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-3px); }
        to { opacity: 1; transform: translateY(0); }
      }
    </style>
  
    ${dt("Zeitmaschine", `
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
    l && $c(l, u, t, n);
  }, 0), s;
}
const kn = { min: 2, max: 4 }, ln = { min: 0, max: 6 }, kc = "1Y", Qa = [
  "1M",
  "6M",
  "1Y",
  "5Y",
  "ALL"
], Tc = {
  "1M": 30,
  "6M": 182,
  "1Y": 365,
  "5Y": 1826,
  ALL: Number.POSITIVE_INFINITY
  // 'ALL' handled separately
}, Lc = /* @__PURE__ */ new Set([0, 2]), Rc = /* @__PURE__ */ new Set([1, 3]), Fc = "var(--pp-reader-chart-marker-buy, #2e7d32)", Mc = "var(--pp-reader-chart-marker-sell, #c0392b)", kr = "{TICKER}", Ic = "https://chatgpt.com/", Tr = /* @__PURE__ */ new Map(), Lr = /* @__PURE__ */ new Map(), Tn = /* @__PURE__ */ new Map(), Rr = /* @__PURE__ */ new WeakMap();
function eo(e) {
  let t = Tr.get(e);
  return t || (t = /* @__PURE__ */ new Map(), Tr.set(e, t)), t;
}
function to(e) {
  let t = Lr.get(e);
  return t || (t = /* @__PURE__ */ new Map(), Lr.set(e, t)), t;
}
function Fr(e, t) {
  const n = Tn.get(e);
  n ? n.activeRange = t : Tn.set(e, { activeRange: t });
}
function no(e) {
  return Tn.get(e)?.activeRange ?? kc;
}
function Rt(e) {
  const t = new Date(e.getTime());
  return t.setUTCHours(0, 0, 0, 0), t;
}
function Hc(e) {
  const t = Date.UTC(
    e.getUTCFullYear(),
    e.getUTCMonth(),
    e.getUTCDate()
  );
  return Math.floor(t / 864e5);
}
function Mr(e) {
  return !(e instanceof Date) || Number.isNaN(e.getTime()) ? null : Hc(Rt(e));
}
function ro(e) {
  if (!e) return null;
  if (e instanceof Date) return Number.isNaN(e.getTime()) ? null : new Date(e.getTime());
  if (typeof e == "number" && Number.isFinite(e)) {
    const t = Math.trunc(e);
    if (t >= 1e6 && t <= 99999999) {
      const n = Math.floor(t / 1e4), r = Math.floor(t % 1e4 / 100), a = t % 100, o = new Date(Date.UTC(n, r - 1, a));
      return Number.isNaN(o.getTime()) ? null : o;
    }
    if (t >= 0 && t <= 1e5) {
      const n = new Date(t * 864e5);
      return Number.isNaN(n.getTime()) ? null : Rt(n);
    }
    return t > 1e12 ? new Date(t) : t > 1e9 ? new Date(t * 1e3) : null;
  }
  if (typeof e == "string") {
    const t = e.trim();
    if (/^\d{1,6}$/.test(t)) {
      const n = Number.parseInt(t, 10);
      if (Number.isFinite(n) && n >= 0 && n <= 1e5)
        return Rt(new Date(n * 864e5));
    }
    if (/^\d{8}$/.test(t)) {
      const n = Number.parseInt(t.slice(0, 4), 10), r = Number.parseInt(t.slice(4, 6), 10) - 1, a = Number.parseInt(t.slice(6, 8), 10);
      return new Date(Date.UTC(n, r, a));
    }
  }
  return null;
}
function O(e) {
  if (typeof e == "number" && Number.isFinite(e)) return e;
  if (typeof e == "string") {
    const t = parseFloat(e);
    return Number.isFinite(t) ? t : null;
  }
  return null;
}
function ee(e) {
  return typeof e == "number" && Number.isFinite(e);
}
function Vc(e) {
  if (typeof e != "string") return null;
  const t = e.trim();
  return t || null;
}
function Ir(e) {
  const t = Vc(e);
  return t ? t.toUpperCase() : null;
}
function ao(e, t = /* @__PURE__ */ new Date()) {
  const n = Rt(t instanceof Date ? t : /* @__PURE__ */ new Date()), r = Tc[e], a = Mr(n), o = {};
  if (a != null && (o.end_date = a), Number.isFinite(r) && r > 0) {
    const i = new Date(n.getTime());
    i.setUTCDate(i.getUTCDate() - (r - 1));
    const c = Mr(i);
    c != null && (o.start_date = c);
  }
  return o;
}
function oo(e) {
  return Array.isArray(e) ? e.map((t) => {
    let n = O(t.close);
    if (n == null) {
      const a = O(t.close_raw);
      a != null && (n = a / 1e8);
    }
    return n == null ? null : {
      date: ro(t.date) ?? t.date,
      close: n
    };
  }).filter((t) => !!t) : [];
}
function zc(e) {
  const t = ro(e);
  if (t) return t;
  if (typeof e == "string") {
    const n = e.trim();
    if (!n) return null;
    const r = Date.parse(n);
    if (Number.isFinite(r)) return new Date(r);
  }
  return null;
}
function ue(e) {
  const t = O(e);
  return t == null ? "—" : t.toLocaleString("de-DE", {
    minimumFractionDigits: kn.min,
    maximumFractionDigits: kn.max
  });
}
function qc(e) {
  const t = O(e);
  if (t == null) return "—";
  const n = Math.abs(t % 1) > 0;
  return t.toLocaleString("de-DE", {
    minimumFractionDigits: n ? 2 : ln.min,
    maximumFractionDigits: n ? ln.max : ln.min
  });
}
function io(e, t) {
  if (!Array.isArray(e)) return [];
  const n = [], r = Ir(t), a = r || "EUR";
  return e.forEach((o, i) => {
    const c = typeof o.type == "number" ? o.type : Number(o.type), s = Lc.has(c), l = Rc.has(c);
    if (!s && !l) return;
    const u = zc(o.date), d = O(o.price);
    if (!u || d == null) return;
    const h = Ir(o.currency_code), f = r ?? h ?? a, m = O(o.shares), g = O(o.net_price_eur), b = s ? "Kauf" : "Verkauf", p = m != null ? `${qc(m)} @ ` : "", y = `${b} ${p}${ue(d)} ${f}`, _ = l && g != null ? `${y} (netto ${ue(g)} EUR)` : y, v = s ? Fc : Mc, S = typeof o.uuid == "string" && o.uuid.trim() || `${b}-${u.getTime().toString()}-${i.toString()}`;
    n.push({
      id: S,
      x: u.getTime(),
      y: d,
      color: v,
      label: _,
      payload: {
        type: b,
        currency: f,
        transactionCurrency: h,
        shares: m,
        price: d,
        netPriceEur: g,
        date: u.toISOString()
      }
    });
  }), n;
}
function Ft(e, t) {
  if (!ee(e) || e === 0) return "neutral";
  const n = 0.5 / Math.pow(10, t);
  return Math.abs(e) < n ? "neutral" : e > 0 ? "positive" : "negative";
}
function Uc(e, t) {
  if (!ee(e)) return '<span class="value neutral">—</span>';
  const n = ue(e);
  if (n === "—") return '<span class="value neutral">—</span>';
  const r = Ft(e, kn.max), a = t ? `&nbsp;${x(t)}` : "";
  return `<span class="value ${r}">${n}${a}</span>`;
}
function Oc(e) {
  return ee(e) ? `<span class="value ${Ft(e, 2)} value--percentage">${ye(e)}&nbsp;%</span>` : '<span class="value neutral">—</span>';
}
function Bc(e, t) {
  return !ee(t) || t === 0 || !ee(e) ? null : (e - t) / t * 100;
}
function so(e, t) {
  if (e.length === 0) return { priceChange: null, priceChangePct: null };
  const n = e[0], r = O(n.close);
  if (!ee(r) || r === 0) return { priceChange: null, priceChangePct: null };
  const a = e[e.length - 1], o = O(a.close), i = O(t) ?? o;
  if (!ee(i)) return { priceChange: null, priceChangePct: null };
  const c = i - r, s = Object.is(c, -0) ? 0 : c, l = Bc(i, r);
  return { priceChange: s, priceChangePct: l };
}
function co(e, t, n, r) {
  const a = e, o = a.length > 0 ? a : "Zeitraum";
  return `
    <div class="security-info-bar" data-range="${T(a)}">
      <div class="security-info-item">
        <span class="label">Preisänderung (${x(o)})</span>
        <div class="value-row">
          ${Uc(t, r)}
          ${Oc(n)}
        </div>
      </div>
    </div>
  `;
}
function Wc(e) {
  return `
    <div class="security-range-selector" role="group" aria-label="Zeitraum">
      ${Qa.map((n) => `
      <button
        type="button"
        class="security-range-button${n === e ? " active" : ""}"
        data-range="${T(n)}"
        aria-pressed="${n === e ? "true" : "false"}"
      >
        ${x(n)}
      </button>
    `).join(`
`)}
    </div>
  `;
}
function lo(e, t = "Unbekannter Fehler") {
  return typeof e == "string" ? e.trim() || t : e instanceof Error && e.message.trim() || t;
}
function uo(e, t = { status: "empty" }) {
  const n = T(e);
  switch (t.status) {
    case "loaded":
      return `<div class="history-chart" data-state="loaded" data-range="${n}" role="img"></div>`;
    case "error":
      return `<div class="history-placeholder" data-state="error"><p>${x(lo(t.message))}</p></div>`;
    case "empty":
    default:
      return '<div class="history-placeholder" data-state="empty"><p>Keine historischen Daten verfügbar.</p></div>';
  }
}
function Yc(e, t, n = {}) {
  const r = e.clientWidth || e.offsetWidth || 0, a = r > 0 ? r : 640, o = Math.min(Math.max(Math.floor(a * 0.5), 240), 440), i = (n.currency || "").toUpperCase() || "EUR", c = ee(n.baseline) ? n.baseline : null, s = Math.max(48, Math.min(72, Math.round(a * 0.075)));
  return {
    width: a,
    height: o,
    margin: { top: 18, right: Math.max(28, Math.round(a * 0.05)), bottom: 40, left: s },
    series: t,
    yFormatter: (l) => ue(l),
    tooltipRenderer: ({ xFormatted: l, yFormatted: u }) => `
      <div class="chart-tooltip-date">${x(l)}</div>
      <div class="chart-tooltip-value">${x(u)}&nbsp;${x(i)}</div>
    `,
    baseline: c != null ? { value: c, includeInDomain: !1 } : null,
    markers: Array.isArray(n.markers) ? n.markers : []
  };
}
function fo(e, t, n = {}) {
  if (t.length === 0) return;
  const r = Yc(e, t, n);
  let a = Rr.get(e) ?? null;
  if (!a || !e.contains(a)) {
    e.innerHTML = "", a = jn(e, r), a && Rr.set(e, a);
    return;
  }
  Wt(a, r);
}
function Kc(e) {
  let t = null, n = null, r = null;
  if (e.lots.length > 0) {
    const m = [...e.lots].sort((y, _) => new Date(y.date).getTime() - new Date(_.date).getTime()), g = m[m.length - 1];
    t = O(g.sell_price_native) ?? null, n = O(g.sell_price) ?? null;
    const b = O(g.sales_value_net), p = O(g.shares);
    b != null && p != null && p > 0 && (r = b / p);
  }
  n == null && (n = O(e.last_sell_price)), t == null && (t = O(e.last_sell_price_native));
  const a = e.currency_code, o = [];
  let i = t, c = a;
  if (ee(i) ? a === "EUR" && (i = n, c = "EUR") : (i = n, c = "EUR"), ee(i)) {
    let m = `${ue(i)} ${c ? x(c) : ""}`;
    !(c !== "EUR") && ee(r) && (m += ` <span class="secondary-text" style="font-size: 0.85em; opacity: 0.8;">(Netto: ${ue(r)} EUR)</span>`), o.push(`<span class="value value--price">${m}</span>`);
  } else
    o.push('<span class="value neutral">—</span>');
  if (c !== "EUR" && ee(n) && ee(i)) {
    let m = `${ue(n)} €`;
    ee(r) && (m += ` <span class="secondary-text" style="font-size: 0.85em; opacity: 0.8;">(Netto: ${ue(r)} EUR)</span>`), o.push(`<span class="value value--average value--average-eur" style="display: block; font-size: 0.85em; margin-top: 2px;">${m}</span>`);
  }
  const s = o.join(""), l = O(e.current_price);
  let u = "—";
  l != null && (u = `${ue(l)} ${a ? x(a) : ""}`);
  const d = O(e.since_sell_abs), h = O(e.since_sell_pct);
  let f = "";
  if (d != null && h != null) {
    const m = Ft(d, 2), g = Ft(h, 2);
    f = `
      <span class="value ${m}">${ue(d)} €</span>
      <span class="value ${g} value--percentage">${ye(h)} %</span>
    `;
  } else
    f = '<span class="value neutral">—</span>';
  return `
    <div class="card security-meta-card">
      <div id="headerMeta" class="meta">
        <div class="security-meta-grid security-meta-grid--expanded">
          <div class="security-meta-item">
            <span class="label">Letzter Preis</span>
            <div class="value-group"><span class="value value--price">${u}</span></div>
          </div>
          <div class="security-meta-item">
            <span class="label">Letzter Verkaufspreis</span>
            <div class="value-group" style="display: flex; flex-direction: column; align-items: flex-start;">${s}</div>
          </div>
          <div class="security-meta-item">
            <span class="label">Änderung seit Verkauf</span>
            <div class="value-group">${f}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}
function jc(e, t, n, r, a) {
  const o = e.querySelector(".security-info-bar");
  if (!o || !o.parentElement) return;
  const i = document.createElement("div");
  i.innerHTML = co(t, n, r, a).trim();
  const c = i.firstElementChild;
  c && o.parentElement.replaceChild(c, o);
}
function Hr(e, t, n, r, a = {}) {
  const o = e.querySelector(".security-detail-placeholder");
  if (o && (o.innerHTML = `
    <h2>Historie</h2>
    ${uo(t, n)}
  `, n.status === "loaded" && Array.isArray(r) && r.length)) {
    const i = o.querySelector(".history-chart");
    i && requestAnimationFrame(() => {
      fo(i, r, a);
    });
  }
}
function Vr(e, t) {
  e && e.querySelectorAll(".security-range-button").forEach((n) => {
    const r = n.dataset.range, a = r === t;
    n.classList.toggle("active", a), n.setAttribute("aria-pressed", a ? "true" : "false"), n.disabled = !1, n.classList.remove("loading"), r && (n.textContent = r);
  });
}
function Gc(e) {
  const { root: t, hass: n, panelConfig: r, securityUuid: a, currencyCode: o, baseline: i } = e;
  setTimeout(() => {
    const c = t.querySelector(".security-range-selector");
    if (!c) return;
    const s = eo(a), l = to(a), u = async (h) => {
      const f = ao(h), m = await Ue(n, r, a, f), g = oo(m.prices), b = io(m.transactions, o);
      return s.set(h, g), l.set(h, b), { historySeries: g, markers: b };
    }, d = (h) => {
      const f = s.get(h) ?? [], m = l.get(h) ?? [], g = f.length ? { status: "loaded" } : { status: "empty" }, { priceChange: b, priceChangePct: p } = so(f, i ?? null);
      Fr(a, h), Vr(c, h), jc(t, h, b, p, o), Hr(t, h, g, f, {
        currency: o,
        baseline: i ?? void 0,
        markers: m
      });
    };
    c.addEventListener("click", (h) => {
      (async () => {
        const f = h.target.closest(".security-range-button");
        if (!f || f.disabled) return;
        const m = f.dataset.range;
        if (!(!m || !Qa.includes(m)) && m !== no(a)) {
          f.disabled = !0, f.classList.add("loading"), f.innerHTML = Ut();
          try {
            s.has(m) || await u(m), d(m);
          } catch (g) {
            console.error("Failed to load history range", g), Fr(a, m), Vr(c, m), Hr(t, m, { status: "error", message: "Laden fehlgeschlagen" }, [], { currency: o });
          }
        }
      })();
    });
  }, 0);
}
async function Xc(e) {
  if (typeof navigator < "u" && navigator.clipboard && typeof navigator.clipboard.writeText == "function")
    try {
      return await navigator.clipboard.writeText(e), !0;
    } catch {
    }
  const t = document.createElement("textarea");
  t.value = e, t.style.position = "fixed", t.style.left = "-9999px", document.body.appendChild(t), t.select();
  const n = document.execCommand("copy");
  return document.body.removeChild(t), n;
}
function Zc(e) {
  return `
    <div class="news-prompt-container">
      <button type="button" class="news-prompt-button" data-symbol="${T(e)}">
        Copy prompt &amp; open ChatGPT
      </button>
    </div>
  `;
}
function Jc(e) {
  const { root: t, hass: n, panelConfig: r, tickerSymbol: a } = e;
  let o = null;
  (async () => {
    try {
      o = await Qr(n, r);
    } catch (c) {
      console.warn(c);
    }
  })(), setTimeout(() => {
    const c = t.querySelector(".news-prompt-button");
    c && c.addEventListener("click", () => {
      (async () => {
        const s = (c.dataset.symbol || a || "").trim();
        if (!s || c.classList.contains("loading")) return;
        c.disabled = !0, c.classList.add("loading");
        const l = c.textContent;
        c.innerHTML = Ut(), c.append(document.createTextNode(` ${l || ""}`));
        try {
          const u = (o?.placeholder || kr).trim() || kr, d = (o?.prompt_template || "").trim(), h = d ? d.includes(u) ? d.split(u).join(s) : `${d}

Ticker: ${s}` : `Ticker: ${s}`;
          await Xc(h), c.textContent = "✅ Copied! Opening...", await new Promise((m) => setTimeout(m, 800));
          const f = (o?.link || "").trim() || Ic;
          window.open(f, "_blank");
        } catch (u) {
          console.error(u);
        } finally {
          c.classList.remove("loading"), c.disabled = !1, l && setTimeout(() => {
            c.textContent = l;
          }, 2e3);
        }
      })();
    });
  }, 0);
}
const Qc = `
<style>
  .trade-detail-container {
    user-select: none;
  }
</style>
`;
async function el(e, t, n, r) {
  if (!r)
    return '<div class="card"><h2>Fehler</h2><p>Kein Wertpapier angegeben.</p></div>';
  const o = (await ea(t, n)).find((w) => w.security_uuid === r);
  if (!o)
    return '<div class="card"><h2>Fehler</h2><p>Trade-Daten nicht gefunden.</p></div>';
  const i = no(r), c = ao(i);
  let s = [], l = [], u = { status: "empty" };
  const d = eo(r), h = to(r);
  if (d.has(i))
    s = d.get(i) ?? [], l = h.get(i) ?? [], u = { status: s.length ? "loaded" : "empty" };
  else
    try {
      const w = await Ue(t, n, r, c);
      s = oo(w.prices), l = io(w.transactions, o.currency_code), d.set(i, s), h.set(i, l), u = { status: s.length ? "loaded" : "empty" };
    } catch (w) {
      console.error("Error fetching trade history", w), u = { status: "error", message: lo(w) };
    }
  const f = dt(o.name, "", {
    includeMeta: !1,
    subtitle: "Watchlist Details"
  });
  f.classList.add("security-detail-header");
  const m = Kc(o), g = so(s, null), b = co(i, g.priceChange, g.priceChangePct, o.currency_code), p = Wc(i), y = uo(i, u), _ = o.ticker_symbol || o.name, v = Zc(_), S = `
    <div class="trade-detail-container">
      ${Qc}
      ${f.outerHTML}
      ${m}
      ${v}
      ${b}
      ${p}
      <div class="card security-detail-placeholder">
        <h2>Historie</h2>
        ${y}
      </div>
    </div>
  `;
  return setTimeout(() => {
    const w = e.querySelector(".security-detail-placeholder .history-chart");
    w && u.status === "loaded" && fo(w, s, {
      currency: o.currency_code,
      baseline: O(o.last_sell_price_native) ?? o.last_sell_price,
      markers: l
    }), Gc({
      root: e,
      hass: t,
      panelConfig: n,
      securityUuid: r,
      currencyCode: o.currency_code,
      baseline: O(o.last_sell_price_native) ?? o.last_sell_price
    }), Jc({
      root: e,
      hass: t,
      panelConfig: n,
      tickerSymbol: _
    });
  }, 0), S;
}
function tl(e) {
  const { setTradeDetailTabFactory: t } = e;
  if (typeof t != "function") {
    console.error("registerTradeDetailTab: Ungültige Factory-Funktion übergeben");
    return;
  }
  t((n) => ({
    title: "Trade-Details",
    render: (r, a, o) => el(r, a, o, n),
    cleanup: () => {
    }
  }));
}
let bt = null;
function nl(e) {
  bt = e;
}
const zr = `
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
  .sort-item:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
    border-radius: 2px;
    opacity: 1;
  }
  .sort-item.sort-active {
    opacity: 1;
    font-weight: bold;
    color: var(--primary-color);
  }

  /* SVG Icon Styles */
  .sort-icon {
    width: 16px;
    height: 16px;
    fill: currentColor;
    display: inline-block;
    vertical-align: middle;
    margin-left: 2px;
    opacity: 0;
    transition: opacity 0.2s, transform 0.2s;
  }
  .sort-active .sort-icon {
    opacity: 1;
  }
  .sort-active.dir-desc .sort-icon {
    transform: rotate(180deg);
  }
  .sort-item:hover .sort-icon,
  .simple-sort-header:hover .sort-icon {
      opacity: 0.5;
  }
  .sort-item.sort-active:hover .sort-icon,
  .simple-sort-header.sort-active:hover .sort-icon {
      opacity: 1;
  }

  .simple-sort-header {
    cursor: pointer;
  }
  .simple-sort-header:hover {
    text-decoration: underline;
  }
  .simple-sort-header:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
    border-radius: 2px;
  }
  .simple-sort-header.sort-active {
     font-weight: bold;
     color: var(--primary-color);
  }


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
  .trades-table-container { user-select: none; }
  .trade-name-clickable { cursor: pointer; text-decoration: underline; }

  .empty-state {
    padding: 32px;
    text-align: center;
    color: var(--secondary-text-color);
  }
  .empty-state__icon {
    opacity: 0.5;
    width: 48px;
    height: 48px;
    margin-bottom: 16px;
    fill: currentColor;
  }
  .empty-state__title {
    margin: 0;
    font-size: 1.1em;
  }
  .empty-state__text {
    margin: 4px 0 0 0;
    font-size: 0.9em;
    opacity: 0.8;
  }
</style>
`;
function Ae(e, t) {
  return `<span class="${e > 0 ? "positive" : e < 0 ? "negative" : "neutral"}">${t}</span>`;
}
function rl(e) {
  if (e.length === 0)
    return zr + `
      <div class="empty-state" role="status" aria-live="polite">
        <svg class="empty-state__icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21,16.5C21,16.88 20.79,17.21 20.47,17.38L12.57,21.82C12.41,21.94 12.21,22 12,22C11.79,22 11.59,21.94 11.43,21.82L3.53,17.38C3.21,17.21 3,16.88 3,16.5V7.5C3,7.12 3.21,6.79 3.53,6.62L11.43,2.18C11.59,2.06 11.79,2 12,2C12.21,2 12.41,2.06 12.57,2.18L20.47,6.62C20.79,6.79 21,7.12 21,7.5V16.5M12,4.15L6.04,7.5L12,10.85L17.96,7.5L12,4.15M5,15.91L11,19.29V12.58L5,9.21V15.91M19,15.91V9.21L13,12.58V19.29L19,15.91Z" />
        </svg>
        <p class="empty-state__title">Keine realisierten Gewinne/Verluste</p>
        <p class="empty-state__text">Es wurden noch keine realisierten Gewinne oder Verluste verzeichnet.</p>
      </div>
    `;
  const t = [
    { key: "name", label: ce("Wertpapier", "name") },
    { key: "total_sold_shares", label: ce("Stück", "total_sold_shares"), align: "right" },
    { key: "last_sell_date", label: ce("Datum", "last_sell_date"), align: "right" },
    // Combo 1: Sales / Current
    {
      key: "price_combo",
      label: fe("Verkaufskurs", ".val-top", "Aktueller Kurs", ".val-bottom"),
      align: "right"
    },
    // Combo 2: Purchase / Sales Value
    {
      key: "value_combo",
      label: fe("Einstandswert", ".val-top", "Verkaufswert", ".val-bottom"),
      align: "right"
    },
    // Combo 3: Gross / Net Result
    {
      key: "result_combo",
      label: fe("Bruttoergebnis", ".val-top", "Nettoergebnis", ".val-bottom"),
      align: "right"
    },
    { key: "result_pct", label: ce("Resultat", "result_pct"), align: "right" },
    { key: "current_holdings", label: ce("Bestand", "current_holdings"), align: "right" },
    {
      key: "since_sell",
      label: fe("Seit Verkauf %", ".val-top", "Gesamt", ".val-bottom"),
      align: "right"
    }
  ], n = e.map((u) => {
    const d = u.current_price ?? 0, h = u.last_sell_price, f = d - h, m = f > 0 ? "positive" : f < 0 ? "negative" : "neutral", g = x(u.name);
    let b = `<span class="trade-name-clickable" role="button" tabindex="0" aria-label="Details für ${g} anzeigen" data-val="${g}" data-security-uuid="${T(u.security_uuid)}">${g}</span>`;
    u.lots.length > 1 && (b = `
        <span class="expand-icon" role="button" tabindex="0" aria-label="Details anzeigen" aria-expanded="false" data-security-uuid="${T(u.security_uuid)}">
          <ha-icon icon="mdi:chevron-right" aria-hidden="true"></ha-icon>
        </span>
        ${b}
      `);
    const p = Math.abs(u.current_holdings) < 1e-3, y = u.since_sell_abs, _ = u.since_sell_pct;
    return {
      _uuid: u.security_uuid,
      _lots: u.lots,
      name: b,
      total_sold_shares: `<span data-val="${String(u.total_sold_shares)}">${_n(u.total_sold_shares)}</span>`,
      last_sell_date: `<span data-val="${T(u.last_sell_date)}">${va(u.last_sell_date)}</span>`,
      price_combo: V(
        u.last_sell_price_native ?? u.last_sell_price,
        N(u.last_sell_price_native ?? u.last_sell_price, u.currency_code),
        u.current_price ?? 0,
        `<span class="trend--${m}">${N(u.current_price, u.currency_code)}</span>`
      ),
      value_combo: V(
        u.purchase_value_gross,
        N(u.purchase_value_gross),
        u.sales_value_gross,
        N(u.sales_value_gross)
      ),
      // Gross Result (Top) / Net Result (Bottom)
      result_combo: V(
        u.sales_value_gross - u.purchase_value_gross,
        // result_gross
        N(u.sales_value_gross - u.purchase_value_gross),
        u.result_abs,
        N(u.result_abs)
      ),
      result_pct: `<span data-val="${String(u.result_pct)}">${Ae(u.result_pct, G(u.result_pct / 100))}</span>`,
      current_holdings: p ? '<span data-val="0" role="img" aria-label="Position geschlossen"><ha-icon icon="mdi:lock-outline" title="Geschlossen" style="opacity: 0.6;" aria-hidden="true"></ha-icon></span>' : `<span data-val="${String(u.current_holdings)}">${_n(u.current_holdings)}</span>`,
      since_sell: u.current_price === null ? "<span>-</span>" : V(
        _,
        Ae(_, G(_)),
        y,
        Ae(y, N(y))
      )
    };
  }), r = e.reduce((u, d) => u + d.purchase_value_gross, 0), a = e.reduce((u, d) => u + d.sales_value_gross, 0), o = e.reduce((u, d) => u + (d.sales_value_gross - d.purchase_value_gross), 0), i = e.reduce((u, d) => u + d.result_abs, 0), c = e.reduce((u, d) => u + d.since_sell_abs, 0), s = r !== 0 ? o / r * 100 : 0, l = {
    value_combo: V(
      r,
      N(r),
      a,
      N(a)
    ),
    result_combo: V(
      o,
      N(o),
      i,
      N(i)
    ),
    result_pct: `<span data-val="${String(s)}">${Ae(s, G(s / 100))}</span>`,
    since_sell: V(
      0,
      "—",
      c,
      Ae(c, N(c))
    )
  };
  return zr + $e(n, t, [], {
    sortable: !1,
    // We handle sorting manually
    rowAttributes: (u) => ({
      "data-security-uuid": u._uuid
    }),
    footerValues: l
  });
}
function al(e, t) {
  const n = e.map((r) => {
    const a = r.since_sell_abs, o = r.since_sell_pct;
    return {
      name: x(t.name),
      total_sold_shares: _n(r.shares),
      last_sell_date: va(r.date),
      price_combo: V(
        r.sell_price_native ?? r.sell_price,
        N(r.sell_price_native ?? r.sell_price, t.currency_code),
        0,
        ""
        // No current price for lots
      ),
      value_combo: V(
        r.purchase_value_gross,
        N(r.purchase_value_gross),
        r.sales_value_gross,
        N(r.sales_value_gross)
      ),
      result_combo: V(
        r.sales_value_gross - r.purchase_value_gross,
        N(r.sales_value_gross - r.purchase_value_gross),
        r.result_abs,
        N(r.result_abs)
      ),
      result_pct: `<span data-val="${String(r.result_pct)}">${Ae(r.result_pct, G(r.result_pct / 100))}</span>`,
      current_holdings: "",
      since_sell: t.current_price === null ? "<span>-</span>" : V(
        o,
        Ae(o, G(o)),
        a,
        Ae(a, N(a))
      )
    };
  });
  return $e(
    n,
    [
      { key: "name", label: "" },
      { key: "total_sold_shares", label: "", align: "right" },
      { key: "last_sell_date", label: "", align: "right" },
      { key: "price_combo", label: "", align: "right" },
      { key: "value_combo", label: "", align: "right" },
      { key: "result_combo", label: "", align: "right" },
      { key: "result_pct", label: "", align: "right" },
      { key: "current_holdings", label: "", align: "right" },
      { key: "since_sell", label: "", align: "right" }
    ],
    [],
    { sortable: !1 }
  );
}
function ol(e, t, n, r) {
  const a = e.querySelector("tbody");
  if (!a) return;
  const o = a.querySelector("tr.footer-row");
  e.querySelectorAll(".is-expanded").forEach((c) => {
    c.classList.remove("is-expanded");
    const s = c.querySelector(".expand-icon ha-icon");
    s && s.setAttribute("icon", "mdi:chevron-right");
  }), a.querySelectorAll("tr.child-row").forEach((c) => {
    c.remove();
  });
  const i = Array.from(a.querySelectorAll("tr")).filter((c) => c !== o);
  i.sort((c, s) => {
    const l = c.cells[t], u = s.cells[t];
    let d = "", h = "";
    if (n) {
      const g = l.querySelector(n), b = u.querySelector(n);
      d = g?.getAttribute("data-val") ?? "", h = b?.getAttribute("data-val") ?? "";
    } else {
      const g = l.querySelector("[data-val]"), b = u.querySelector("[data-val]");
      d = g?.getAttribute("data-val") ?? l.textContent ?? "", h = b?.getAttribute("data-val") ?? u.textContent ?? "";
    }
    const f = Number(d), m = Number(h);
    return !isNaN(f) && !isNaN(m) ? (f - m) * (r === "asc" ? 1 : -1) : d.localeCompare(h) * (r === "asc" ? 1 : -1);
  }), i.forEach((c) => a.appendChild(c)), o && a.appendChild(o);
}
function il(e, t) {
  const n = new Map(t.map((a) => [a.security_uuid, a])), r = (a) => {
    const o = a.target, i = o.closest(".trade-name-clickable");
    if (i) {
      a.stopPropagation();
      const l = i.dataset.securityUuid;
      l && bt ? bt(l) : bt || console.warn("openTradeDetail callback not set");
      return;
    }
    const c = o.closest(".expand-icon");
    if (c) {
      a.stopPropagation(), a.type === "keydown" && a.preventDefault();
      const l = c.dataset.securityUuid, u = l ? n.get(l) : void 0, d = e.querySelector(`tr[data-security-uuid="${String(l)}"]`);
      if (d && u) {
        const h = d.classList.toggle("is-expanded"), f = d.querySelector(".expand-icon");
        if (f && (f.setAttribute("aria-expanded", h ? "true" : "false"), f.setAttribute("aria-label", h ? "Details verbergen" : "Details anzeigen")), h) {
          d.querySelector(".expand-icon ha-icon")?.setAttribute("icon", "mdi:chevron-down");
          const m = al(u.lots, u), g = document.createElement("div");
          g.innerHTML = m;
          const b = Array.from(g.querySelectorAll("tbody tr")).map((p) => (p.classList.add("child-row"), l && (p.dataset.parentUuid = l), p));
          d.after(...b);
        } else
          d.querySelector(".expand-icon ha-icon")?.setAttribute("icon", "mdi:chevron-right"), e.querySelectorAll(`tr.child-row[data-parent-uuid="${String(l)}"]`).forEach((m) => {
            m.remove();
          });
      }
      return;
    }
    if (a.type === "keydown" && !["Enter", " "].includes(a.key))
      return;
    const s = o.closest("[data-sort-selector]") || o.closest("[data-sort-key]");
    if (s) {
      const l = s.closest("table");
      if (!l) return;
      l.querySelectorAll(".sort-active").forEach((f) => {
        f !== s && f.classList.remove("sort-active", "dir-asc", "dir-desc");
      });
      let u = "asc";
      s.classList.contains("sort-active") && s.classList.contains("dir-asc") && (u = "desc"), s.classList.add("sort-active"), s.classList.remove("dir-asc", "dir-desc"), s.classList.add(`dir-${u}`);
      const d = s.closest("th"), h = d ? Array.from(d.parentElement?.children ?? []).indexOf(d) : -1;
      if (h >= 0) {
        const f = s.dataset.sortSelector || null;
        ol(l, h, f, u);
      }
    }
  };
  e.addEventListener("click", r), e.addEventListener("keydown", (a) => {
    (a.key === "Enter" || a.key === " ") && r(a);
  });
}
async function sl(e, t, n) {
  const r = dt("Realisierte Performance", "");
  let a = [];
  try {
    a = await ea(t, n);
  } catch (c) {
    console.error("Failed to fetch trades", c);
  }
  const o = rl(a), i = `
    <div class="trades-view-wrapper" style="height: 100%;">
      ${r.outerHTML}
      <div class="card">
        <div class="trades-table-container">
          ${o}
        </div>
      </div>
    </div>
  `;
  return setTimeout(() => {
    const c = e.querySelector(".trades-view-wrapper");
    c && il(c, a);
  }, 0), i;
}
const cl = Gi, Ln = "pp-reader-sticky-anchor", Mt = "overview", _t = "analyse", It = "trades", Le = "security:", Re = "trade_detail:", ll = [
  { key: Mt, title: "Dashboard", render: xa },
  { key: _t, title: "Analyse", render: Nc },
  { key: It, title: "Trades", render: sl }
], Fe = /* @__PURE__ */ new Map(), xe = [], Ht = /* @__PURE__ */ new Map();
let Rn = null, Fn = null, un = !1, De = null, R = 0, dn = null;
function Vt(e) {
  return typeof e == "object" && e !== null;
}
function po(e) {
  return typeof e == "object" && e !== null && typeof e.then == "function";
}
function ho(e) {
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
function ul(e) {
  return e === "accounts" || e === "last_file_update" || e === "portfolio_values" || e === "portfolio_positions" || e === "daily_wealth";
}
function qr(e) {
  const t = e.portfolio_uuid;
  if (typeof t == "string" && t)
    return t;
  const n = e.portfolioUuid;
  return typeof n == "string" && n ? n : null;
}
function dl(e) {
  if (!e)
    return null;
  if (Array.isArray(e)) {
    for (const t of e)
      if (Vt(t)) {
        const n = qr(t);
        if (n)
          return n;
      }
    return null;
  }
  return Vt(e) ? qr(e) : null;
}
function fl(e, t) {
  switch (e) {
    case "accounts":
      return {
        type: e,
        data: Array.isArray(t) ? t : null
      };
    case "last_file_update":
      return typeof t == "string" ? { type: e, data: t } : Vt(t) ? { type: e, data: t } : { type: e, data: null };
    case "portfolio_values":
      return Array.isArray(t) ? { type: e, data: t } : { type: e, data: null };
    case "portfolio_positions":
      return Array.isArray(t) ? { type: e, data: t } : Vt(t) ? { type: e, data: t } : { type: e, data: null };
    case "daily_wealth":
      return { type: e, data: null };
    // Payload ignored
    default:
      return null;
  }
}
function Qn(e) {
  return typeof e != "string" ? null : e.startsWith(Le) ? e.slice(Le.length) || null : e.startsWith(Re) && e.slice(Re.length) || null;
}
function pl() {
  if (!De)
    return !1;
  const e = vo(De);
  return e || (De = null), e;
}
function X() {
  const e = xe.filter((n) => n.startsWith(Le)).map((n) => Fe.get(n)).filter((n) => !!n), t = xe.filter((n) => n.startsWith(Re)).map((n) => Fe.get(n)).filter((n) => !!n);
  return [...e, ...ll, ...t];
}
function vt(e) {
  const t = X();
  return e < 0 || e >= t.length ? null : t[e];
}
function mo(e) {
  if (!e)
    return null;
  const t = e, n = t.ppreader ?? t.pp_reader;
  return n || (Object.values(t).find((a) => !a || typeof a != "object" ? !1 : a.webcomponent_name === "pp-reader-panel") ?? null);
}
function er() {
  try {
    const e = me();
    e && typeof e.rememberScrollPosition == "function" && e.rememberScrollPosition();
  } catch (e) {
    console.warn("rememberCurrentPageScroll: konnte Scroll-Position nicht sichern", e);
  }
}
function Ur(e) {
  const t = X();
  return !t.length || e < 0 ? 0 : e >= t.length ? t.length - 1 : e;
}
async function hl(e, t, n, r) {
  const a = X(), o = Ur(e);
  if (o === R) {
    e < R && pl();
    return;
  }
  er();
  const i = R >= 0 && R < a.length ? a[R] : null, c = i ? Qn(i.key) : null;
  let s = o;
  if (c && i) {
    const l = o >= 0 && o < a.length ? a[o] : null;
    if (l) {
      if (i.key.startsWith(Le) && l.key === Mt) {
        if (_l(c, { suppressRender: !0 })) {
          const h = X().findIndex((f) => f.key === Mt);
          s = h >= 0 ? h : 0;
        }
      } else if (i.key.startsWith(Re) && l.key === It && vl(c, { suppressRender: !0 })) {
        const h = X().findIndex((f) => f.key === It);
        s = h >= 0 ? h : 0;
      }
    }
  }
  if (!un) {
    un = !0;
    try {
      R = Ur(s);
      const l = R;
      await So(t, n, r), yl(l);
    } catch (l) {
      console.error("navigateToPage: Fehler beim Rendern des Tabs", l);
    } finally {
      un = !1;
    }
  }
}
function zt(e, t, n, r) {
  hl(R + e, t, n, r);
}
function go(e, t) {
  if (!e || !t || typeof t.render != "function") {
    console.error("registerDetailTab: Ungültiger Tab-Descriptor", e, t);
    return;
  }
  const n = Qn(e);
  if (e.startsWith(Le)) {
    const a = [...xe];
    for (const o of a)
      o !== e && o.startsWith(Le) && rt(o);
  } else if (e.startsWith(Re)) {
    const a = [...xe];
    for (const o of a)
      o !== e && o.startsWith(Re) && rt(o);
  }
  if (n) {
    const a = Ht.get(n);
    a && a !== e && rt(a);
  }
  const r = {
    ...t,
    key: e
  };
  Fe.set(e, r), n && Ht.set(n, e), xe.includes(e) || xe.push(e);
}
function rt(e) {
  if (!e)
    return;
  const t = Fe.get(e);
  if (t && typeof t.cleanup == "function")
    try {
      const a = t.cleanup({ key: e });
      po(a) && a.catch((o) => {
        console.error(
          "unregisterDetailTab: Fehler beim asynchronen cleanup",
          o
        );
      });
    } catch (a) {
      console.error("unregisterDetailTab: Fehler beim Ausführen von cleanup", a);
    }
  Fe.delete(e);
  const n = xe.indexOf(e);
  n >= 0 && xe.splice(n, 1);
  const r = Qn(e);
  r && Ht.get(r) === e && Ht.delete(r);
}
function yo(e) {
  return Fe.has(e);
}
function qt(e) {
  return Fe.get(e) ?? null;
}
function ml(e) {
  if (e != null && typeof e != "function") {
    console.error("setSecurityDetailTabFactory: Erwartet Funktion oder null", e);
    return;
  }
  Rn = e ?? null;
}
function gl(e) {
  if (e != null && typeof e != "function") {
    console.error("setTradeDetailTabFactory: Erwartet Funktion oder null", e);
    return;
  }
  Fn = e ?? null;
}
function bo(e) {
  return `${Le}${e}`;
}
function _o(e) {
  return `${Re}${e}`;
}
function me() {
  for (const t of Po())
    if (t.isConnected)
      return t;
  const e = /* @__PURE__ */ new Set();
  for (const t of Do())
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
function We() {
  const e = me();
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
const Tl = {
  findDashboardElement: me,
  toErrorMessage: ho
};
function yl(e) {
  const t = me();
  if (t && typeof t.handleExternalRender == "function")
    try {
      t.handleExternalRender(e);
    } catch (n) {
      console.warn("notifyExternalRender: Fehler beim Synchronisieren des Dashboards", n);
    }
}
function vo(e) {
  if (!e)
    return console.error("openSecurityDetail: Ungültige securityUuid", e), !1;
  const t = bo(e);
  let n = qt(t);
  if (!n && typeof Rn == "function")
    try {
      const i = Rn(e);
      i && typeof i.render == "function" ? (go(t, i), n = qt(t)) : console.error("openSecurityDetail: Factory lieferte ungültigen Descriptor", i);
    } catch (i) {
      console.error("openSecurityDetail: Fehler beim Erzeugen des Tab-Descriptors", i);
    }
  if (!n)
    return console.warn(`openSecurityDetail: Kein Detail-Tab für ${e} verfügbar`), !1;
  er();
  let a = X().findIndex((i) => i.key === t);
  if (a === -1 && (a = X().findIndex((c) => c.key === t), a === -1))
    return console.error("openSecurityDetail: Tab nach Registrierung nicht auffindbar"), !1;
  R = a, De = null;
  const o = me();
  return o && (o._lastPage = null), We(), !0;
}
function bl(e) {
  if (!e)
    return console.error("openTradeDetail: Ungültige securityUuid", e), !1;
  const t = _o(e);
  let n = qt(t);
  if (!n && typeof Fn == "function")
    try {
      const i = Fn(e);
      i && typeof i.render == "function" ? (go(t, i), n = qt(t)) : console.error("openTradeDetail: Factory lieferte ungültigen Descriptor", i);
    } catch (i) {
      console.error("openTradeDetail: Fehler beim Erzeugen des Tab-Descriptors", i);
    }
  if (!n)
    return console.warn(`openTradeDetail: Kein Detail-Tab für ${e} verfügbar`), !1;
  er();
  let a = X().findIndex((i) => i.key === t);
  if (a === -1 && (a = X().findIndex((c) => c.key === t), a === -1))
    return console.error("openTradeDetail: Tab nach Registrierung nicht auffindbar"), !1;
  R = a, De = null;
  const o = me();
  return o && (o._lastPage = null), We(), !0;
}
function _l(e, t = {}) {
  if (!e)
    return console.error("closeSecurityDetail: Ungültige securityUuid", e), !1;
  const { suppressRender: n = !1 } = t, r = bo(e);
  if (!yo(r))
    return !1;
  const o = X().findIndex((s) => s.key === r), i = o === R;
  rt(r);
  const c = X();
  if (!c.length) {
    if (R = 0, !n) {
      const s = me();
      s && (s._lastPage = null), We();
    }
    return !0;
  }
  if (De = e, i) {
    const s = c.findIndex((l) => l.key === Mt);
    s >= 0 ? R = s : R = Math.min(Math.max(o - 1, 0), c.length - 1);
  } else R >= c.length && (R = Math.max(0, c.length - 1));
  if (!n) {
    const s = me();
    s && (s._lastPage = null), We();
  }
  return !0;
}
function vl(e, t = {}) {
  if (!e)
    return console.error("closeTradeDetail: Ungültige securityUuid", e), !1;
  const { suppressRender: n = !1 } = t, r = _o(e);
  if (!yo(r))
    return !1;
  const o = X().findIndex((s) => s.key === r), i = o === R;
  rt(r);
  const c = X();
  if (!c.length) {
    if (R = 0, !n) {
      const s = me();
      s && (s._lastPage = null), We();
    }
    return !0;
  }
  if (De = e, i) {
    const s = c.findIndex((l) => l.key === It);
    s >= 0 ? R = s : R = Math.min(Math.max(o - 1, 0), c.length - 1);
  } else R >= c.length && (R = Math.max(0, c.length - 1));
  if (!n) {
    const s = me();
    s && (s._lastPage = null), We();
  }
  return !0;
}
async function So(e, t, n) {
  let r = n;
  r || (r = mo(t ? t.panels : null));
  const a = X();
  R >= a.length && (R = Math.max(0, a.length - 1));
  const o = vt(R);
  if (!o) {
    console.error("renderTab: Kein gültiger Tab oder keine render-Methode gefunden!");
    return;
  }
  let i;
  try {
    i = await o.render(e, t, r);
  } catch (u) {
    console.error("renderTab: Fehler beim Rendern des Tabs:", u), e.innerHTML = `<div class="card"><h2>Fehler</h2><pre>${x(ho(u))}</pre></div>`;
    return;
  }
  e.innerHTML = i ?? "", o.render === xa && Kn(e);
  const s = await new Promise((u) => {
    const d = window.setInterval(() => {
      const h = e.querySelector(".header-card");
      h && (clearInterval(d), u(h));
    }, 50);
  });
  let l = e.querySelector(`#${Ln}`);
  if (!l) {
    l = document.createElement("div"), l.id = Ln;
    const u = s.parentNode;
    u && "insertBefore" in u && u.insertBefore(l, s);
  }
  Cl(e, t, n), wl(e, t, n), Sl(e);
}
function Sl(e) {
  const t = e.querySelector(".header-card"), n = e.querySelector(`#${Ln}`);
  if (!t || !n) {
    console.error("Fehlende Elemente für das Scrollverhalten: headerCard oder anchor.");
    return;
  }
  dn?.disconnect(), dn = new IntersectionObserver(
    ([r]) => {
      r.isIntersecting ? t.classList.remove("sticky") : t.classList.add("sticky");
    },
    {
      root: null,
      rootMargin: "0px 0px 0px 0px",
      threshold: 0
    }
  ), dn.observe(n);
}
function wl(e, t, n) {
  const r = e.querySelector(".header-card");
  if (!r) {
    console.error("Header-Card nicht gefunden!");
    return;
  }
  cl(
    r,
    () => {
      zt(1, e, t, n);
    },
    () => {
      zt(-1, e, t, n);
    }
  );
}
function Cl(e, t, n) {
  const r = e.querySelector(".header-card");
  if (!r) {
    console.error("Header-Card nicht gefunden!");
    return;
  }
  const a = r.querySelector("#nav-left"), o = r.querySelector("#nav-right");
  if (!a || !o) {
    console.error("Navigationspfeile nicht gefunden!");
    return;
  }
  a.addEventListener("click", () => {
    zt(-1, e, t, n);
  }), o.addEventListener("click", () => {
    zt(1, e, t, n);
  }), Al(r);
}
function Al(e) {
  const t = e.querySelector("#nav-left"), n = e.querySelector("#nav-right");
  if (t) {
    const r = R > 0 || !!De;
    t.disabled = !r, t.classList.toggle("disabled", !r);
  }
  if (n) {
    const r = X(), o = !(R === r.length - 1);
    n.disabled = !o, n.classList.toggle("disabled", !o);
  }
}
class El extends HTMLElement {
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
    this._panel || (this._panel = mo(this._hass.panels ?? null));
    const t = fn(this._hass, this._panel);
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
      n.map(async (o) => {
        try {
          const i = await t.subscribeEvents(
            this._handleBusEvent.bind(this),
            o
          );
          typeof i == "function" ? (r.push(i), console.debug("PPReaderDashboard: subscribed to", o)) : console.error(
            "PPReaderDashboard: subscribeEvents lieferte kein Unsubscribe-Func für",
            o,
            i
          );
        } catch (i) {
          console.error("PPReaderDashboard: Fehler bei subscribeEvents für", o, i);
        }
      })
    ).then(() => {
      this._unsubscribeEvents = () => {
        r.forEach((o) => {
          try {
            o();
          } catch {
          }
        }), console.debug("PPReaderDashboard: alle Event-Subscriptions entfernt");
      };
    }).catch((o) => {
      console.error("PPReaderDashboard: Fehler beim Registrieren der Events", o);
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
    const n = fn(this._hass, this._panel);
    if (!n)
      return;
    const r = t.data;
    if (!ul(r.data_type) || r.entry_id && r.entry_id !== n)
      return;
    const a = fl(r.data_type, r.data);
    a && (this._queueUpdate(a.type, a.data), this._doRender(a.type, a.data));
  }
  _doRender(t, n) {
    switch (t) {
      case "accounts":
        zi(
          n,
          this._root
        );
        break;
      case "last_file_update":
        ji(
          n,
          this._root
        );
        break;
      case "portfolio_values":
        Oi(
          n,
          this._root
        ), Gt(), vt(R)?.key === _t && cn(this._root, this._hass, this._panel);
        break;
      case "portfolio_positions":
        Yi(
          n,
          this._root
        ), Gt(), vt(R)?.key === _t && cn(this._root, this._hass, this._panel);
        break;
      case "daily_wealth":
        Gt();
        {
          const r = vt(R);
          r && r.key === _t && cn(this._root, this._hass, this._panel);
        }
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
    t === "portfolio_positions" && (a.portfolioUuid = dl(
      r
    ));
    let o = -1;
    t === "portfolio_positions" && a.portfolioUuid ? o = this._pendingUpdates.findIndex(
      (i) => i.type === t && i.portfolioUuid === a.portfolioUuid
    ) : o = this._pendingUpdates.findIndex((i) => i.type === t), o >= 0 ? this._pendingUpdates[o] = a : this._pendingUpdates.push(a), this._hasNewData = !0;
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
  rememberScrollPosition(t = R) {
    const n = Number.isInteger(t) ? t : R;
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
    const t = R;
    if (!this._hasNewData && this._panel === this._lastPanel && this._narrow === this._lastNarrow && this._route === this._lastRoute && this._lastPage === t)
      return;
    this._lastPage != null && (this._scrollPositions[this._lastPage] = this._root.scrollTop);
    const n = So(this._root, this._hass, this._panel);
    if (po(n)) {
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
customElements.get("pp-reader-dashboard") || customElements.define("pp-reader-dashboard", El);
console.log("PPReader dashboard module v20250914b geladen");
yc({
  setSecurityDetailTabFactory: ml
});
tl({
  setTradeDetailTabFactory: gl
});
nl(bl);
export {
  Tl as __TEST_ONLY_DASHBOARD,
  kl as __TEST_ONLY__,
  _l as closeSecurityDetail,
  vl as closeTradeDetail,
  Yn as flushPendingPositions,
  qt as getDetailTabDescriptor,
  X as getVisibleTabs,
  Yi as handlePortfolioPositionsUpdate,
  yo as hasDetailTab,
  vo as openSecurityDetail,
  bl as openTradeDetail,
  Nl as reapplyPositionsSort,
  xl as registerDashboardElement,
  go as registerDetailTab,
  Dl as registerPanelHost,
  ml as setSecurityDetailTabFactory,
  gl as setTradeDetailTabFactory,
  Pl as unregisterDashboardElement,
  rt as unregisterDetailTab,
  $l as unregisterPanelHost,
  Ea as updatePortfolioFooterFromDom
};
//# sourceMappingURL=dashboard.u9nl37Yj.js.map
