const Kt = /* @__PURE__ */ new Set(), Gt = /* @__PURE__ */ new Set(), jn = {}, Ea = [
  "renderPositionsTable",
  "applyGainPctMetadata",
  "attachSecurityDetailListener",
  "attachPortfolioPositionsSorting",
  "updatePortfolioFooter"
];
function xa(e, t) {
  typeof t == "function" && (jn[e] = t);
}
function Rs(e) {
  e && Kt.add(e);
}
function Ts(e) {
  e && Kt.delete(e);
}
function Fa() {
  return Kt;
}
function Ls(e) {
  e && Gt.add(e);
}
function Ms(e) {
  e && Gt.delete(e);
}
function ka() {
  return Gt;
}
function Da(e) {
  for (const t of Ea)
    xa(t, e[t]);
}
function Xt() {
  return jn;
}
function fe(e) {
  return typeof e == "object" && e !== null;
}
function W(e) {
  return typeof e == "string" ? e : null;
}
function Xe(e) {
  return e === null ? null : W(e);
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
function gn(e) {
  const t = U(e);
  if (t == null)
    return null;
  const n = Math.trunc(t);
  return Number.isFinite(n) ? n : null;
}
function Ze(e) {
  return fe(e) ? { ...e } : null;
}
function Yn(e) {
  return fe(e) ? { ...e } : null;
}
function Kn(e) {
  return typeof e == "boolean" ? e : void 0;
}
function $a(e) {
  if (!fe(e))
    return null;
  const t = W(e.name), n = W(e.currency_code), r = U(e.orig_balance);
  if (!t || !n || r == null)
    return null;
  const a = e.balance === null ? null : U(e.balance), i = {
    uuid: W(e.uuid) ?? void 0,
    name: t,
    currency_code: n,
    orig_balance: r,
    balance: a ?? null
  }, o = U(e.fx_rate);
  o != null && (i.fx_rate = o);
  const s = W(e.fx_rate_source);
  s && (i.fx_rate_source = s);
  const c = W(e.fx_rate_timestamp);
  c && (i.fx_rate_timestamp = c);
  const l = U(e.coverage_ratio);
  l != null && (i.coverage_ratio = l);
  const f = W(e.provenance);
  f && (i.provenance = f);
  const u = Xe(e.metric_run_uuid);
  u !== null && (i.metric_run_uuid = u);
  const p = Kn(e.fx_unavailable);
  return typeof p == "boolean" && (i.fx_unavailable = p), i;
}
function Gn(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = $a(n);
    r && t.push(r);
  }
  return t;
}
function Ra(e) {
  if (!fe(e))
    return null;
  const t = e.aggregation, n = W(e.security_uuid), r = W(e.name), a = U(e.current_holdings), i = U(e.purchase_value_eur) ?? (fe(t) ? U(t.purchase_value_eur) ?? U(t.purchase_total_account) ?? U(t.account_currency_total) : null) ?? U(e.purchase_value), o = U(e.current_value);
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
    average_cost: Ze(e.average_cost),
    performance: Ze(e.performance),
    aggregation: Ze(e.aggregation),
    data_state: Yn(e.data_state)
  }, c = U(e.coverage_ratio);
  c != null && (s.coverage_ratio = c);
  const l = W(e.provenance);
  l && (s.provenance = l);
  const f = Xe(e.metric_run_uuid);
  f !== null && (s.metric_run_uuid = f);
  const u = U(e.last_price_native);
  u != null && (s.last_price_native = u);
  const p = U(e.last_price_eur);
  p != null && (s.last_price_eur = p);
  const d = U(e.last_close_native);
  d != null && (s.last_close_native = d);
  const g = U(e.last_close_eur);
  return g != null && (s.last_close_eur = g), s;
}
function Xn(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = Ra(n);
    r && t.push(r);
  }
  return t;
}
function Zn(e) {
  if (!fe(e))
    return null;
  const t = W(e.name), n = U(e.current_value ?? e.value);
  if (!t || n == null)
    return null;
  const a = U(
    e.purchase_sum ?? e.purchase_value_eur ?? e.purchase_value ?? e.purchaseSum
  ) ?? 0, i = {
    uuid: W(e.uuid) ?? void 0,
    name: t,
    current_value: n,
    purchase_value: a,
    purchase_sum: a,
    day_change_abs: U(e.day_change_abs) ?? U(e.day_change_eur) ?? void 0,
    day_change_pct: U(e.day_change_pct) ?? void 0,
    position_count: gn(e.position_count ?? e.count) ?? void 0,
    missing_value_positions: gn(e.missing_value_positions) ?? void 0,
    has_current_value: Kn(e.has_current_value),
    performance: Ze(e.performance),
    coverage_ratio: U(e.coverage_ratio) ?? void 0,
    provenance: W(e.provenance) ?? void 0,
    metric_run_uuid: Xe(e.metric_run_uuid) ?? void 0,
    data_state: Yn(e.data_state)
  };
  return Array.isArray(e.positions) && (i.positions = Xn(e.positions)), i;
}
function Jn(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = Zn(n);
    r && t.push(r);
  }
  return t;
}
function Qn(e) {
  if (!fe(e))
    return null;
  const t = { ...e }, n = Xe(e.metric_run_uuid);
  n !== null ? t.metric_run_uuid = n : delete t.metric_run_uuid;
  const r = U(e.coverage_ratio);
  r != null ? t.coverage_ratio = r : delete t.coverage_ratio;
  const a = W(e.provenance);
  a ? t.provenance = a : delete t.provenance;
  const i = W(e.generated_at ?? e.snapshot_generated_at);
  return i ? t.generated_at = i : delete t.generated_at, t;
}
function Ta(e) {
  if (!fe(e))
    return null;
  const t = { ...e }, n = Qn(e.normalized_payload);
  return n ? t.normalized_payload = n : "normalized_payload" in t && delete t.normalized_payload, t;
}
function er(e) {
  if (!fe(e))
    return null;
  const t = W(e.generated_at);
  if (!t)
    return null;
  const n = Xe(e.metric_run_uuid), r = Gn(e.accounts), a = Jn(e.portfolios), i = Ta(e.diagnostics), o = {
    generated_at: t,
    metric_run_uuid: n,
    accounts: r,
    portfolios: a
  };
  return i && (o.diagnostics = i), o;
}
function hn(e) {
  return typeof e == "string" ? e : null;
}
function La(e) {
  if (typeof e == "string")
    return e;
  if (e === null)
    return null;
}
function Ma(e) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
}
function mn(e, t) {
  if (typeof e == "string")
    return e;
  throw new Error(`mapPositionSnapshotToRecord: fehlendes ${t}`);
}
function At(e, t) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  throw new Error(`mapPositionSnapshotToRecord: fehlendes ${t}`);
}
function Ha(e) {
  const t = mn(e.security_uuid, "security_uuid"), n = mn(e.name, "name"), r = At(e.current_holdings, "current_holdings"), a = At(e.purchase_value, "purchase_value"), i = At(e.current_value, "current_value"), o = {
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
function ge(e, t) {
  let n = t?.config?.entry_id ?? t?.entry_id ?? t?.config?._panel_custom?.config?.entry_id ?? void 0;
  if (!n && e?.panels) {
    const r = e.panels, a = r.ppreader ?? r.pp_reader ?? Object.values(r).find(
      (i) => i?.webcomponent_name === "pp-reader-panel"
    );
    n = a?.config?.entry_id ?? a?.entry_id ?? a?.config?._panel_custom?.config?.entry_id ?? void 0;
  }
  return n ?? void 0;
}
function _n(e, t) {
  return ge(e, t);
}
async function Ia(e, t) {
  if (!e)
    throw new Error("fetchAccountsWS: fehlendes hass");
  const n = ge(e, t);
  if (!n)
    throw new Error("fetchAccountsWS: fehlendes entry_id");
  const r = await e.connection.sendMessagePromise({
    type: "pp_reader/get_accounts",
    entry_id: n
  }), a = Gn(r.accounts), i = er(r.normalized_payload);
  return {
    accounts: a,
    normalized_payload: i
  };
}
async function Va(e, t) {
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
async function Ua(e, t) {
  if (!e)
    throw new Error("fetchPortfoliosWS: fehlendes hass");
  const n = ge(e, t);
  if (!n)
    throw new Error("fetchPortfoliosWS: fehlendes entry_id");
  const r = await e.connection.sendMessagePromise({
    type: "pp_reader/get_portfolio_data",
    entry_id: n
  }), a = Jn(r.portfolios), i = er(r.normalized_payload);
  return {
    portfolios: a,
    normalized_payload: i
  };
}
async function tr(e, t, n) {
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
  }), o = Xn(a.positions).map(Ha), s = Qn(a.normalized_payload), c = {
    portfolio_uuid: hn(a.portfolio_uuid) ?? n,
    positions: o
  };
  typeof a.error == "string" && (c.error = a.error);
  const l = Ma(a.coverage_ratio);
  l !== void 0 && (c.coverage_ratio = l);
  const f = hn(a.provenance);
  f && (c.provenance = f);
  const u = La(a.metric_run_uuid);
  return u !== void 0 && (c.metric_run_uuid = u), s && (c.normalized_payload = s), c;
}
async function za(e, t, n) {
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
async function qa(e, t) {
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
async function nt(e, t, n, r = {}) {
  if (!e)
    throw new Error("fetchSecurityHistoryWS: fehlendes hass");
  const a = ge(e, t);
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
  const p = await e.connection.sendMessagePromise(i);
  return Array.isArray(p.prices) || (p.prices = []), Array.isArray(p.transactions) || (p.transactions = []), p;
}
async function Oa(e, t) {
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
function le(e) {
  return k(e);
}
const Zt = (e, t) => {
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
    const c = n?.fx_unavailable === !0 ? "Wechselkurs nicht verfügbar – EUR-Wert unbekannt" : "";
    if (t == null || r?.hasValue === !1)
      return s(c);
    const l = typeof t == "number" ? t : i(t);
    if (!Number.isFinite(l))
      return s(c);
    const f = e.endsWith("pct") ? "%" : "€";
    return a = o(l) + `&nbsp;${f}`, `<span class="${Zt(l, 2)}">${a}</span>`;
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
    typeof t == "string" ? c = t : typeof t == "number" && Number.isFinite(t) ? c = t.toString() : typeof t == "boolean" ? c = t ? "true" : "false" : t instanceof Date && Number.isFinite(t.getTime()) && (c = t.toISOString()), a = c, a && (/<[a-z]/i.test(a) && /<\s*(?:script|iframe|object|embed|base|style|link|meta|form)\b|javascript:|[\s\/]on[a-z]+\s*=/i.test(a) && (a = k(a)), /<|&lt;|&gt;/.test(a) || (a.length > 60 && (a = a.slice(0, 59) + "…"), a.startsWith("Kontostand ") ? a = a.substring(11) : a.startsWith("Depotwert ") && (a = a.substring(10))));
  }
  return typeof a != "string" || a === "" ? s() : a;
}
function Se(e, t, n = [], r = {}) {
  const { sortable: a = !1, defaultSort: i, rowAttributes: o } = r, s = i?.key ?? "", c = i?.dir === "desc" ? "desc" : "asc";
  let l = "<table><thead><tr>";
  t.forEach((h) => {
    const _ = h.align === "right" ? ' class="align-right"' : "";
    if (a && h.key) {
      const b = `${le(h.label)} sortieren`;
      l += `<th${_} data-sort-key="${h.key}" role="button" tabindex="0" aria-sort="none" aria-label="${b}">${h.label}</th>`;
    } else
      l += `<th${_}>${h.label}</th>`;
  }), l += "</tr></thead><tbody>", e.forEach((h) => {
    let _ = "";
    if (o) {
      const b = o(h);
      _ = Object.entries(b).map(([v, P]) => ` ${v}="${le(P)}"`).join("");
    }
    l += `<tr${_}>`, t.forEach((b) => {
      const v = b.align === "right" ? ' class="align-right"' : "";
      l += `<td${v}>${M(b.key, h[b.key], h)}</td>`;
    }), l += "</tr>";
  });
  const f = {}, u = {};
  t.forEach((h) => {
    if (n.includes(h.key)) {
      const _ = e.reduce(
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
      _.hasValue ? (f[h.key] = _.total, u[h.key] = { hasValue: !0 }) : (f[h.key] = null, u[h.key] = { hasValue: !1 });
    }
  });
  const p = f.gain_abs ?? null;
  if (p != null) {
    const h = f.purchase_value ?? null;
    if (h != null && h > 0)
      f.gain_pct = p / h * 100;
    else {
      const _ = f.current_value ?? null;
      _ != null && _ !== 0 && (f.gain_pct = p / (_ - p) * 100);
    }
  }
  const d = f.day_change_abs ?? null;
  if (d != null) {
    const h = f.current_value ?? null;
    if (h != null) {
      const _ = h - d;
      _ && (f.day_change_pct = d / _ * 100, u.day_change_pct = { hasValue: !0 });
    }
  }
  const g = Number.isFinite(f.gain_pct ?? NaN) ? f.gain_pct : null;
  let m = "", y = "neutral";
  if (g != null && (m = `${pe(g)} %`, g > 0 ? y = "positive" : g < 0 && (y = "negative")), l += '<tr class="footer-row">', t.forEach((h, _) => {
    const b = h.align === "right" ? ' class="align-right"' : "";
    if (_ === 0) {
      l += `<td${b}>Summe</td>`;
      return;
    }
    if (f[h.key] != null) {
      let P = "";
      h.key === "gain_abs" && m && (P = ` data-gain-pct="${le(m)}" data-gain-sign="${le(y)}"`), l += `<td${b}${P}>${M(h.key, f[h.key], void 0, u[h.key])}</td>`;
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
      const _ = h.content.querySelector("table");
      if (_)
        return _.classList.add("sortable-table"), s && (_.dataset.defaultSort = s, _.dataset.defaultDir = c), _.outerHTML;
    } catch (h) {
      console.warn("makeTable(sortable): Injection fehlgeschlagen:", h);
    }
  return l;
}
function Jt(e, t, n = {}) {
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
function pe(e, t = 2, n = 2) {
  return (Number.isNaN(e) ? 0 : e).toLocaleString("de-DE", {
    minimumFractionDigits: t,
    maximumFractionDigits: n
  });
}
function Ba(e) {
  const t = Number.isNaN(e) ? 0 : e;
  return `<span class="${Zt(t, 2)}">${pe(t)}&nbsp;€</span>`;
}
function Wa(e) {
  const t = Number.isNaN(e) ? 0 : e;
  return `<span class="${Zt(t, 2)}">${pe(t)}&nbsp;%</span>`;
}
function ja() {
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
function Qt(e = "Laden...") {
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
function nr(e, t, n = "asc", r = !1) {
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
    const p = parseFloat(u);
    return Number.isFinite(p) ? p : NaN;
  };
  o.sort((f, u) => {
    const p = f.cells.item(s), d = u.cells.item(s), g = (p?.textContent ?? "").trim(), m = (d?.textContent ?? "").trim(), y = c(g), h = c(m);
    let _;
    const b = /[0-9]/.test(g) || /[0-9]/.test(m);
    return !Number.isNaN(y) && !Number.isNaN(h) && b ? _ = y - h : _ = g.localeCompare(m, "de", { sensitivity: "base" }), n === "asc" ? _ : -_;
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
const Ya = 2;
function ue(e) {
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
        const u = o.split(","), p = u[u.length - 1]?.length ?? 0, d = u.slice(0, -1).join(""), g = d.replace(/[+-]/g, "").length, m = u.length > 2, y = /^[-+]?0$/.test(d);
        o = m || p === 0 || p === 3 && g > 0 && g <= 3 && !y ? o.replace(/,/g, "") : o.replace(",", ".");
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
function yt(e, { decimals: t = Ya, fallback: n = null } = {}) {
  const r = ue(e);
  if (r == null)
    return n ?? null;
  const a = 10 ** t, i = Math.round(r * a) / a;
  return Object.is(i, -0) ? 0 : i;
}
function yn(e, t = {}) {
  return yt(e, t);
}
function Ka(e, t = {}) {
  return yt(e, t);
}
const Ga = /^[+-]?(?:\d+\.?\d*|\d*\.?\d+)(?:[eE][+-]?\d+)?$/, ae = (e) => {
  if (typeof e == "number")
    return Number.isFinite(e) ? e : null;
  if (typeof e == "string") {
    const t = e.trim();
    if (!t || !Ga.test(t))
      return null;
    const n = Number(t);
    if (Number.isFinite(n))
      return n;
  }
  return null;
}, rr = (e) => {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t || null;
};
function Xa(e) {
  const t = e && typeof e == "object" ? e : null;
  if (!t)
    return null;
  const n = ae(t.price_change_native), r = ae(t.price_change_eur), a = ae(t.change_pct), i = ae(t.value_change_eur);
  if (n == null && r == null && a == null && i == null)
    return null;
  const o = rr(t.source) ?? "derived", s = ae(t.coverage_ratio) ?? null;
  return {
    price_change_native: n,
    price_change_eur: r,
    change_pct: a,
    value_change_eur: i ?? null,
    source: o,
    coverage_ratio: s
  };
}
function ye(e) {
  const t = e && typeof e == "object" ? e : null;
  if (!t)
    return null;
  const n = ae(t.gain_abs), r = ae(t.gain_pct), a = ae(t.total_change_eur), i = ae(t.total_change_pct);
  if (n == null || r == null || a == null || i == null)
    return null;
  const o = rr(t.source) ?? "derived", s = ae(t.coverage_ratio) ?? null, c = Xa(t.day_change);
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
const me = /* @__PURE__ */ new Map();
function he(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t.length > 0 ? t : null;
}
function q(e) {
  if (e === null)
    return null;
  const t = ue(e);
  return Number.isFinite(t ?? NaN) ? t : null;
}
function Za(e) {
  if (!e || typeof e != "object")
    return !1;
  const t = e;
  return typeof t.security_uuid == "string" && typeof t.name == "string" && typeof t.current_holdings == "number" && typeof t.purchase_value == "number" && typeof t.current_value == "number";
}
function ke(e) {
  const t = { ...e };
  return e.average_cost && typeof e.average_cost == "object" && (t.average_cost = { ...e.average_cost }), e.performance && typeof e.performance == "object" && (t.performance = { ...e.performance }), e.aggregation && typeof e.aggregation == "object" && (t.aggregation = { ...e.aggregation }), e.data_state && typeof e.data_state == "object" && (t.data_state = { ...e.data_state }), t;
}
function Ja(e, t, n = []) {
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
function Qa(e, t) {
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
  return o !== void 0 && (n.performance = Ja(s, o, [
    "gain_pct",
    "total_change_pct"
  ])), i("aggregation"), i("average_cost"), i("data_state"), n;
}
function rt(e, t) {
  if (!e)
    return [];
  if (!Array.isArray(t))
    return me.delete(e), [];
  if (t.length === 0)
    return me.set(e, []), [];
  const n = me.get(e) ?? [], r = new Map(
    n.filter((i) => i.security_uuid).map((i) => [i.security_uuid, i])
  ), a = t.filter((i) => !!i).map((i) => {
    const o = i.security_uuid ?? "", s = o ? r.get(o) : void 0;
    return Qa(s, i);
  }).map(ke);
  return me.set(e, a), a.map(ke);
}
function bt(e) {
  return e ? me.has(e) : !1;
}
function ar(e) {
  if (!e)
    return [];
  const t = me.get(e);
  return t ? t.map(ke) : [];
}
function ei() {
  me.clear();
}
function ti() {
  return new Map(
    Array.from(me.entries(), ([e, t]) => [
      e,
      t.map(ke)
    ])
  );
}
function Re(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e, n = q(t.native), r = q(t.security), a = q(t.account), i = q(t.eur), o = q(t.coverage_ratio);
  if (n == null && r == null && a == null && i == null && o == null)
    return null;
  const s = he(t.source);
  return {
    native: n,
    security: r,
    account: a,
    eur: i,
    source: s === "totals" || s === "eur_total" ? s : "aggregation",
    coverage_ratio: o
  };
}
function en(e) {
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
function ni(e) {
  if (!e || typeof e != "object")
    return null;
  const t = Za(e) ? ke(e) : e, n = he(t.security_uuid), r = he(t.name), a = ue(t.current_holdings), i = yn(t.current_value), o = en(t.aggregation), s = t.aggregation && typeof t.aggregation == "object" ? t.aggregation : null, c = q(t.purchase_value_eur) ?? q(s?.purchase_value_eur) ?? q(s?.purchase_total_account) ?? q(s?.account_currency_total) ?? yn(t.purchase_value);
  if (!n || !r || a == null || c == null || i == null)
    return null;
  const l = {
    security_uuid: n,
    name: r,
    portfolio_uuid: he(t.portfolio_uuid) ?? he(t.portfolioUuid) ?? void 0,
    currency_code: he(t.currency_code),
    current_holdings: a,
    purchase_value: c,
    current_value: i
  }, f = Re(t.average_cost);
  f && (l.average_cost = f), o && (l.aggregation = o);
  const u = ye(t.performance);
  if (u)
    l.performance = u, l.gain_abs = typeof u.gain_abs == "number" ? u.gain_abs : null, l.gain_pct = typeof u.gain_pct == "number" ? u.gain_pct : null;
  else {
    const b = q(t.gain_abs), v = q(t.gain_pct);
    b !== null && (l.gain_abs = b), v !== null && (l.gain_pct = v);
  }
  "coverage_ratio" in t && (l.coverage_ratio = q(t.coverage_ratio));
  const p = he(t.provenance);
  p && (l.provenance = p);
  const d = he(t.metric_run_uuid);
  (d || t.metric_run_uuid === null) && (l.metric_run_uuid = d ?? null);
  const g = q(t.last_price_native);
  g !== null && (l.last_price_native = g);
  const m = q(t.last_price_eur);
  m !== null && (l.last_price_eur = m);
  const y = q(t.last_close_native);
  y !== null && (l.last_close_native = y);
  const h = q(t.last_close_eur);
  h !== null && (l.last_close_eur = h);
  const _ = t.data_state && typeof t.data_state == "object" ? { ...t.data_state } : void 0;
  return _ && (l.data_state = _), l;
}
function vt(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = ni(n);
    r && t.push(r);
  }
  return t;
}
let ir = [];
const _e = /* @__PURE__ */ new Map();
function Je(e) {
  return typeof e == "string" && e.length > 0 ? e : void 0;
}
function ri(e) {
  return e === null ? null : Je(e);
}
function ai(e) {
  return typeof e == "number" && Number.isFinite(e) ? e : void 0;
}
function ve(e) {
  return e === null ? null : ai(e);
}
function bn(e) {
  if (!(typeof e != "number" || !Number.isFinite(e)))
    return Math.trunc(e);
}
function ie(e) {
  if (!(!e || typeof e != "object"))
    return { ...e };
}
function Be(e) {
  const t = { ...e };
  return t.average_cost = ie(e.average_cost), t.performance = ie(e.performance), t.aggregation = ie(e.aggregation), t.data_state = ie(e.data_state), t;
}
function tn(e) {
  const t = { ...e };
  return t.performance = ie(e.performance), t.data_state = ie(e.data_state), Array.isArray(e.positions) && (t.positions = e.positions.map(Be)), t;
}
function or(e) {
  if (!e || typeof e != "object")
    return null;
  const t = Je(e.uuid);
  if (!t)
    return null;
  const n = { uuid: t }, r = Je(e.name);
  r && (n.name = r);
  const a = ve(e.current_value);
  a !== void 0 && (n.current_value = a);
  const i = ve(e.purchase_sum) ?? ve(e.purchase_value_eur) ?? ve(e.purchase_value);
  i !== void 0 && (n.purchase_value = i, n.purchase_sum = i);
  const o = ve(e.day_change_abs);
  o !== void 0 && (n.day_change_abs = o);
  const s = ve(e.day_change_pct);
  s !== void 0 && (n.day_change_pct = s);
  const c = bn(e.position_count);
  c !== void 0 && (n.position_count = c);
  const l = bn(e.missing_value_positions);
  l !== void 0 && (n.missing_value_positions = l), typeof e.has_current_value == "boolean" && (n.has_current_value = e.has_current_value);
  const f = ve(e.coverage_ratio);
  f !== void 0 && (n.coverage_ratio = f);
  const u = Je(e.provenance);
  u && (n.provenance = u), "metric_run_uuid" in e && (n.metric_run_uuid = ri(e.metric_run_uuid));
  const p = ie(e.performance);
  p && (n.performance = p);
  const d = ie(e.data_state);
  if (d && (n.data_state = d), Array.isArray(e.positions)) {
    const g = e.positions.filter(
      (m) => !!m
    );
    g.length && (n.positions = g.map(Be));
  }
  return n;
}
function ii(e, t) {
  const n = {
    ...e,
    ...t
  };
  return !t.performance && e.performance && (n.performance = ie(e.performance)), !t.data_state && e.data_state && (n.data_state = ie(e.data_state)), !t.positions && e.positions && (n.positions = e.positions.map(Be)), n;
}
function sr(e) {
  ir = (e ?? []).map((n) => ({ ...n }));
}
function oi() {
  return ir.map((e) => ({ ...e }));
}
function si(e) {
  _e.clear();
  const t = e ?? [];
  for (const n of t) {
    const r = or(n);
    r && _e.set(r.uuid, tn(r));
  }
}
function ci(e) {
  const t = e ?? [];
  for (const n of t) {
    const r = or(n);
    if (!r)
      continue;
    const a = _e.get(r.uuid), i = a ? ii(a, r) : tn(r);
    _e.set(i.uuid, i);
  }
}
function at(e, t) {
  if (!e)
    return;
  const n = _e.get(e);
  if (!n)
    return;
  if (!Array.isArray(t) || t.length === 0) {
    const c = { ...n };
    delete c.positions, _e.set(e, c);
    return;
  }
  const r = (c, l) => {
    const f = c ? Be(c) : {}, u = f;
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
      m != null && (u[g] = m);
    });
    const d = (g, m = []) => {
      const y = l[g], h = c && c[g] && typeof c[g] == "object" ? c[g] : void 0;
      if (!y || typeof y != "object") {
        y !== void 0 && (u[g] = y);
        return;
      }
      const _ = {
        ...h ?? {},
        ...y
      };
      m.forEach((b) => {
        const v = h?.[b];
        v != null && (_[b] = v);
      }), u[g] = _;
    };
    return d("performance", ["gain_pct", "total_change_pct"]), d("aggregation"), d("average_cost"), d("data_state"), f;
  }, a = Array.isArray(n.positions) ? n.positions : [], i = new Map(
    a.filter((c) => c.security_uuid).map((c) => [c.security_uuid, c])
  ), o = t.filter((c) => !!c).map((c) => {
    const l = c.security_uuid ? i.get(c.security_uuid) : void 0;
    return r(l, c);
  }).map(Be), s = {
    ...n,
    positions: o
  };
  _e.set(e, s);
}
function li() {
  return Array.from(_e.values(), (e) => tn(e));
}
function cr() {
  return {
    accounts: oi(),
    portfolios: li()
  };
}
const ui = "unknown-account";
function Z(e) {
  return typeof e != "number" || !Number.isFinite(e) ? null : e;
}
function vn(e) {
  const t = Z(e);
  return t == null ? 0 : Math.trunc(t);
}
function ee(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t.length > 0 ? t : null;
}
function lr(e, t) {
  return ee(e) ?? t;
}
function ur(e) {
  return e == null || !Number.isFinite(e) ? null : e < 0 ? 0 : e > 1 ? 1 : e;
}
function dr(e) {
  return e.split(/[\s_-]+/).filter(Boolean).map(
    (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
  ).join(" ");
}
function fr(e) {
  const t = di(e);
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
function di(e) {
  const t = ee(e);
  if (!t)
    return null;
  const n = fi(t);
  return n || dr(t);
}
function fi(e) {
  const t = e.trim();
  if (!t.startsWith("{") && !t.startsWith("["))
    return null;
  try {
    const n = JSON.parse(t), r = pi(n), a = n && typeof n == "object" ? ee(
      n.provider ?? n.source
    ) : null;
    if (r.length && a)
      return `${dr(a)} (${r.join(", ")})`;
    if (r.length)
      return `FX (${r.join(", ")})`;
  } catch {
    return null;
  }
  return null;
}
function pi(e) {
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
function gi(e) {
  if (!e)
    return null;
  const t = ee(e.uuid) ?? `${ui}-${e.name ?? "0"}`, n = lr(e.name, "Unbenanntes Konto"), r = ee(e.currency_code), a = Z(e.balance), i = Z(e.orig_balance), o = "coverage_ratio" in e ? ur(Z(e.coverage_ratio)) : null, s = ee(e.provenance), c = ee(e.metric_run_uuid), l = e.fx_unavailable === !0, f = Z(e.fx_rate), u = ee(e.fx_rate_source), p = ee(e.fx_rate_timestamp), d = [], g = fr(s);
  g && d.push(g);
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
    fx_rate_timestamp: p,
    badges: d
  }, y = typeof c == "string" ? c : null;
  return m.metric_run_uuid = y, m;
}
function hi(e) {
  if (!e)
    return null;
  const t = ee(e.uuid);
  if (!t)
    return null;
  const n = lr(e.name, "Unbenanntes Depot"), r = vn(e.position_count), a = vn(e.missing_value_positions), i = Z(e.current_value), o = Z(e.purchase_sum) ?? Z(e.purchase_value_eur) ?? Z(e.purchase_value) ?? 0, s = Z(e.day_change_abs) ?? null, c = Z(e.day_change_pct) ?? null, l = ye(e.performance), f = l?.gain_abs ?? null, u = l?.gain_pct ?? null, p = l?.day_change ?? null;
  let d = s ?? (p?.value_change_eur != null ? Z(p.value_change_eur) : null), g = c ?? (p?.change_pct != null ? Z(p.change_pct) : null);
  if (d == null && g != null && i != null) {
    const N = i / (1 + g / 100);
    N && (d = i - N);
  }
  if (g == null && d != null && i != null) {
    const N = i - d;
    N && (g = d / N * 100);
  }
  const m = i != null, y = e.has_current_value === !1 || !m, h = "coverage_ratio" in e ? ur(Z(e.coverage_ratio)) : null, _ = ee(e.provenance), b = ee(e.metric_run_uuid), v = [], P = fr(_);
  P && v.push(P);
  const C = {
    uuid: t,
    name: n,
    position_count: r,
    current_value: i,
    purchase_sum: o,
    day_change_abs: d ?? null,
    day_change_pct: g ?? null,
    gain_abs: f,
    gain_pct: u,
    hasValue: m,
    fx_unavailable: y || a > 0,
    missing_value_positions: a,
    performance: l,
    coverage_ratio: h,
    provenance: _,
    metric_run_uuid: null,
    badges: v
  }, w = typeof b == "string" ? b : null;
  return C.metric_run_uuid = w, C;
}
function pr() {
  const { accounts: e } = cr();
  return e.map(gi).filter((t) => !!t);
}
function mi() {
  const { portfolios: e } = cr();
  return e.map(hi).filter((t) => !!t);
}
function gr(e, t = {}) {
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
function it(e, t, n = {}) {
  const r = gr(t, n);
  if (!r)
    return k(e);
  const a = n.labelClass ?? "name-with-badges__label";
  return `<span class="${["name-with-badges", n.containerClass].filter(Boolean).join(" ")}"><span class="${a}">${k(
    e
  )}</span>${r}</span>`;
}
function hr(e, t, n, r) {
  e[t] = {
    previous: n,
    current: r
  };
}
const oe = /* @__PURE__ */ new Map(), ze = /* @__PURE__ */ new Map();
function _i(e) {
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
function Ce(e) {
  return typeof e == "number" && Number.isFinite(e) ? e : void 0;
}
function yi(e) {
  return e === null ? null : Ce(e);
}
function bi(e) {
  return e === null ? null : Te(e);
}
function Sn(e) {
  return (e ?? []).filter(
    (t) => !t.key.endsWith("-coverage") && !t.key.startsWith("provenance-")
  );
}
function Pn(e) {
  return ye(e.performance);
}
const vi = 500, Si = 10, Pi = "pp-reader:portfolio-positions-updated", Ai = "pp-reader:diagnostics", Ct = /* @__PURE__ */ new Map(), mr = [
  "coverage_ratio",
  "provenance",
  "metric_run_uuid",
  "generated_at"
], Lt = /* @__PURE__ */ new Map();
function Ci(e, t) {
  return `${e}:${t}`;
}
function wi(e) {
  if (e === void 0)
    return;
  if (e === null)
    return null;
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  const t = yi(e);
  if (t === null)
    return null;
  if (typeof t == "number" && Number.isFinite(t))
    return t;
}
function wt(e) {
  if (e !== void 0)
    return bi(e);
}
function nn(e, t, n, r) {
  const a = {}, i = wi(e);
  i !== void 0 && (a.coverage_ratio = i);
  const o = wt(t);
  o !== void 0 && (a.provenance = o);
  const s = wt(n);
  s !== void 0 && (a.metric_run_uuid = s);
  const c = wt(r);
  return c !== void 0 && (a.generated_at = c), Object.keys(a).length > 0 ? a : null;
}
function Ni(e, t) {
  const n = {};
  let r = !1;
  for (const a of mr) {
    const i = e?.[a], o = t[a];
    i !== o && (hr(n, a, i, o), r = !0);
  }
  return r ? n : null;
}
function Ei(e) {
  const t = {};
  let n = !1;
  for (const r of mr) {
    const a = e[r];
    a !== void 0 && (hr(t, r, a, void 0), n = !0);
  }
  return n ? t : null;
}
function An(e) {
  if (Object.keys(e.changed).length) {
    try {
      console.debug("pp-reader:diagnostics", e);
    } catch {
    }
    if (!(typeof window > "u" || typeof window.dispatchEvent != "function"))
      try {
        window.dispatchEvent(new CustomEvent(Ai, { detail: e }));
      } catch (t) {
        console.warn("updateConfigsWS: Diagnostics-Event konnte nicht gesendet werden", t);
      }
  }
}
function rn(e, t, n, r) {
  const a = Ci(e, n), i = Ct.get(a);
  if (!r) {
    if (!i)
      return;
    Ct.delete(a);
    const s = Ei(i);
    if (!s)
      return;
    An({
      kind: e,
      uuid: n,
      source: t,
      changed: s,
      snapshot: {},
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    return;
  }
  const o = Ni(i, r);
  o && (Ct.set(a, { ...r }), An({
    kind: e,
    uuid: n,
    source: t,
    changed: o,
    snapshot: { ...r },
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  }));
}
function xi(e) {
  if (!(!e || e.length === 0))
    for (const t of e) {
      const n = Te(t.uuid);
      if (!n)
        continue;
      const r = nn(
        t.coverage_ratio,
        t.provenance,
        t.metric_run_uuid,
        void 0
      );
      rn("account", "accounts", n, r);
    }
}
function Fi(e) {
  if (!(!e || e.length === 0))
    for (const t of e) {
      const n = Te(t.uuid);
      if (!n)
        continue;
      const r = nn(
        t.coverage_ratio,
        t.provenance,
        t.metric_run_uuid,
        void 0
      );
      rn("portfolio", "portfolio_values", n, r);
    }
}
function ki(e, t) {
  if (!t)
    return;
  const n = nn(
    t.coverage_ratio ?? t.normalized_payload?.coverage_ratio,
    t.provenance ?? t.normalized_payload?.provenance,
    t.metric_run_uuid ?? t.normalized_payload?.metric_run_uuid,
    t.normalized_payload?.generated_at
  );
  rn("portfolio_positions", "portfolio_positions", e, n);
}
function Di(e, t) {
  return `<div class="error">${k(_i(e))} <button class="retry-pos" data-portfolio="${t}">Erneut laden</button></div>`;
}
function $i(e, t, n) {
  const r = e.querySelector("table.sortable-positions");
  if (!r) return;
  const a = e.dataset.sortKey || r.dataset.defaultSort || "name", o = (e.dataset.sortDir || r.dataset.defaultDir || "asc") === "desc" ? "desc" : "asc";
  e.dataset.sortKey = a, e.dataset.sortDir = o;
  try {
    nr(r, a, o, !0);
  } catch (l) {
    console.warn("restoreSortAndInit: sortTableRows Fehler:", l);
  }
  const { attachPortfolioPositionsSorting: s, attachSecurityDetailListener: c } = Xt();
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
function _r(e, t, n, r) {
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
    return i.innerHTML = Di(r, t), { applied: !0 };
  const o = i.dataset.sortKey, s = i.dataset.sortDir;
  return i.innerHTML = br(n), o && (i.dataset.sortKey = o), s && (i.dataset.sortDir = s), $i(i, e, t), { applied: !0 };
}
function an(e, t) {
  const n = oe.get(t);
  if (!n) return !1;
  const r = _r(
    e,
    t,
    n.positions,
    n.error
  );
  return r.applied && oe.delete(t), r.applied;
}
function Ri(e) {
  let t = !1;
  for (const [n] of oe)
    an(e, n) && (t = !0);
  return t;
}
function yr(e, t) {
  const n = ze.get(t) ?? {
    attempts: 0,
    timer: null
  };
  n.timer || (n.timer = setTimeout(() => {
    n.timer = null, n.attempts += 1;
    const r = an(e, t);
    r || n.attempts >= Si ? (ze.delete(t), r || oe.delete(t)) : yr(e, t);
  }, vi), ze.set(t, n));
}
function Ti(e, t) {
  console.log("updateConfigsWS: Kontodaten-Update erhalten:", e);
  const n = Array.isArray(e) ? e : [];
  if (sr(n), xi(n), !t)
    return;
  const r = pr();
  Li(r, t);
  const a = t.querySelector(".portfolio-table table"), i = a ? Array.from(
    a.querySelectorAll("tbody tr.portfolio-row")
  ).map((o) => {
    const s = o.dataset.currentValue, c = s ? Number.parseFloat(s) : Number.NaN;
    if (Number.isFinite(c))
      return {
        current_value: c
      };
    const l = o.cells.item(3), f = Qe(l?.textContent);
    return {
      current_value: Number.isFinite(f) ? f : 0
    };
  }) : [];
  vr(r, i, t);
}
function Li(e, t) {
  const n = t.querySelector(".account-table"), r = t.querySelector(".fx-account-table"), a = e.filter((o) => (o.currency_code || "EUR") === "EUR"), i = e.filter((o) => (o.currency_code || "EUR") !== "EUR");
  if (n) {
    const o = a.map((s) => ({
      name: it(s.name, Sn(s.badges), {
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
      const c = s.orig_balance, l = typeof c == "number" && Number.isFinite(c), f = Te(s.currency_code), u = l ? c.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) : null, p = u ? f ? `${u} ${f}` : u : "";
      return {
        name: it(s.name, Sn(s.badges), {
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
function Mi(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = Zn(n);
    r && t.push(r);
  }
  return t;
}
function Hi(e, t) {
  if (!Array.isArray(e)) {
    console.warn("handlePortfolioUpdate: Update ist kein Array:", e);
    return;
  }
  try {
    console.debug("handlePortfolioUpdate: payload=", e);
  } catch {
  }
  const n = Mi(e);
  if (n.length && ci(n), Fi(n), !t)
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
    const p = u.dataset.portfolio;
    p && o.set(p, u);
  });
  let c = 0;
  const l = (u) => {
    const p = typeof u == "number" && Number.isFinite(u) ? u : 0;
    try {
      return p.toLocaleString("de-DE");
    } catch {
      return p.toString();
    }
  }, f = /* @__PURE__ */ new Map();
  for (const u of n) {
    const p = Te(u.uuid);
    p && f.set(p, u);
  }
  for (const [u, p] of f.entries()) {
    const d = o.get(u);
    if (!d)
      continue;
    d.cells.length < 8 && console.warn("handlePortfolioUpdate: Unerwartetes Spaltenlayout", d.cells.length);
    const g = d.cells.item(1), m = d.cells.item(2), y = d.cells.item(3), h = d.cells.item(4), _ = d.cells.item(5), b = d.cells.item(6), v = d.cells.item(7);
    if (!g || !m || !y)
      continue;
    const P = typeof p.position_count == "number" && Number.isFinite(p.position_count) ? p.position_count : 0, C = typeof p.current_value == "number" && Number.isFinite(p.current_value) ? p.current_value : null, w = ye(p.performance), N = typeof w?.gain_abs == "number" ? w.gain_abs : null, D = typeof w?.gain_pct == "number" ? w.gain_pct : null, I = typeof p.purchase_sum == "number" && Number.isFinite(p.purchase_sum) ? p.purchase_sum : typeof p.purchase_value == "number" && Number.isFinite(p.purchase_value) ? p.purchase_value : null, A = w?.day_change ?? null, x = Ce(p.day_change_abs) ?? Ce(A?.value_change_eur) ?? Ce(A?.price_change_eur), z = Ce(p.day_change_pct) ?? Ce(A?.change_pct);
    let E = x ?? null, $ = z ?? null;
    if (E == null && $ != null && C != null) {
      const G = C / (1 + $ / 100);
      G && (E = C - G);
    }
    if ($ == null && E != null && C != null) {
      const G = C - E;
      G && ($ = E / G * 100);
    }
    const K = typeof p.missing_value_positions == "number" && Number.isFinite(p.missing_value_positions) ? p.missing_value_positions : 0, S = C !== null, F = p.has_current_value === !1 || K > 0 || !S, L = Qe(y.textContent);
    Qe(g.textContent) !== P && (g.textContent = l(P));
    const R = {
      fx_unavailable: F,
      current_value: C,
      performance: w
    }, V = { hasValue: S }, B = M("purchase_value", I, R, V);
    m.innerHTML !== B && (m.innerHTML = B);
    const j = M("current_value", R.current_value, R, V), X = typeof C == "number" ? C : 0;
    if ((Math.abs(L - X) >= 5e-3 || y.innerHTML !== j) && (y.innerHTML = j, d.classList.add("flash-update"), setTimeout(() => {
      d.classList.remove("flash-update");
    }, 800)), h && (h.innerHTML = M("day_change_abs", E, R, V)), _ && (_.innerHTML = M("day_change_pct", $, R, V)), b) {
      const G = M("gain_abs", N, R, V);
      b.innerHTML = G;
      const be = typeof D == "number" && Number.isFinite(D) ? D : null;
      b.dataset.gainPct = be != null ? `${i(be)} %` : "—", b.dataset.gainSign = be != null ? be > 0 ? "positive" : be < 0 ? "negative" : "neutral" : "neutral";
    }
    v && (v.innerHTML = M("gain_pct", D, R, V)), d.dataset.positionCount = P.toString(), d.dataset.purchaseSum = I != null ? I.toString() : "", d.dataset.currentValue = S ? X.toString() : "", d.dataset.dayChange = S && E != null ? E.toString() : "", d.dataset.dayChangePct = S && $ != null ? $.toString() : "", d.dataset.gainAbs = N != null ? N.toString() : "", d.dataset.gainPct = D != null ? D.toString() : "", d.dataset.hasValue = S ? "true" : "false", d.dataset.fxUnavailable = F ? "true" : "false", d.dataset.coverageRatio = typeof p.coverage_ratio == "number" && Number.isFinite(p.coverage_ratio) ? p.coverage_ratio.toString() : "", d.dataset.provenance = typeof p.provenance == "string" ? p.provenance : "", d.dataset.metricRunUuid = typeof p.metric_run_uuid == "string" ? p.metric_run_uuid : "", c += 1;
  }
  if (c === 0)
    console.debug("handlePortfolioUpdate: Keine passenden Zeilen gefunden / keine Änderungen.");
  else {
    const u = c.toLocaleString("de-DE");
    console.debug(`handlePortfolioUpdate: ${u} Zeile(n) gepatcht.`);
  }
  try {
    zi(r);
  } catch (u) {
    console.warn("handlePortfolioUpdate: Fehler bei Summen-Neuberechnung:", u);
  }
  try {
    const u = (...h) => {
      for (const _ of h) {
        if (!_) continue;
        const b = t.querySelector(_);
        if (b) return b;
      }
      return null;
    }, p = u(
      ".account-table table",
      ".accounts-eur-table table",
      ".accounts-table table"
    ), d = u(
      ".fx-account-table table",
      ".accounts-fx-table table"
    ), g = (h, _) => {
      if (!h) return [];
      const b = h.querySelectorAll("tbody tr.account-row");
      return (b.length ? Array.from(b) : Array.from(h.querySelectorAll("tbody tr:not(.footer-row)"))).map((P) => {
        const C = _ ? P.cells.item(2) : P.cells.item(1);
        return { balance: Qe(C?.textContent) };
      });
    }, m = [
      ...g(p, !1),
      ...g(d, !0)
    ], y = Array.from(
      r.querySelectorAll("tbody tr.portfolio-row")
    ).map((h) => {
      const _ = h.dataset.currentValue, b = h.dataset.purchaseSum, v = _ ? Number.parseFloat(_) : Number.NaN, P = b ? Number.parseFloat(b) : Number.NaN;
      return {
        current_value: Number.isFinite(v) ? v : 0,
        purchase_sum: Number.isFinite(P) ? P : 0
      };
    });
    vr(m, y, t);
  } catch (u) {
    console.warn("handlePortfolioUpdate: Fehler bei Total-Neuberechnung:", u);
  }
}
function Ii(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e.portfolio_uuid;
  if (typeof t == "string" && t)
    return t;
  const n = e.portfolioUuid;
  return typeof n == "string" && n ? n : null;
}
function Mt(e) {
  Lt.delete(e);
}
function Cn(e) {
  return typeof e != "number" || !Number.isInteger(e) || e <= 0 ? null : e;
}
function Vi(e, t, n, r) {
  if (!n || n <= 1 || !t)
    return Mt(e), r;
  const a = n, i = Lt.get(e) ?? { expected: a, chunks: /* @__PURE__ */ new Map() };
  if (i.expected !== a && (i.chunks.clear(), i.expected = a), i.chunks.set(t, r), Lt.set(e, i), i.chunks.size < a)
    return null;
  const o = [];
  for (let s = 1; s <= a; s += 1) {
    const c = i.chunks.get(s);
    c && Array.isArray(c) && o.push(...c);
  }
  return Mt(e), o;
}
function wn(e, t) {
  const n = Ii(e);
  if (!n)
    return console.warn("handlePortfolioPositionsUpdate: Ungültiges Update:", e), !1;
  const r = e?.error, a = Cn(e?.chunk_index), i = Cn(e?.chunk_count), o = vt(e?.positions ?? []);
  r && Mt(n);
  const s = r ? o : Vi(n, a, i, o);
  if (!r && s === null)
    return !0;
  const c = r ? o : s ?? [];
  ki(n, e);
  const l = bt(n);
  let f = c;
  if (!r && l) {
    const p = rt(n, c);
    at(n, p), f = p;
  }
  const u = _r(t, n, f, r);
  if (u.applied) {
    if (oe.delete(n), !r && !l) {
      const p = rt(n, f);
      at(n, p);
    }
  } else
    r || u.reason !== "hidden" || l ? (oe.set(n, { positions: f, error: r }), yr(t, n)) : (oe.delete(n), ze.delete(n));
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
            Pi,
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
function Ui(e, t) {
  if (Array.isArray(e)) {
    let n = !1;
    for (const r of e)
      wn(r, t) && (n = !0);
    !n && e.length && console.warn("handlePortfolioPositionsUpdate: Kein gültiges Element im Array:", e);
    return;
  }
  wn(e, t);
}
function br(e) {
  const { renderPositionsTable: t, applyGainPctMetadata: n } = Xt();
  try {
    if (typeof t == "function")
      return t(e);
  } catch {
  }
  if (e.length === 0)
    return '<div class="no-positions">Keine Positionen vorhanden.</div>';
  const r = e.map((i) => {
    const o = Pn(i);
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
      s.forEach((u, p) => {
        const d = c[p];
        if (!d) return;
        u.setAttribute("data-sort-key", d), u.classList.add("sortable-col"), u.setAttribute("role", "button"), u.setAttribute("tabindex", "0"), u.setAttribute("aria-sort", "none");
        const g = u.textContent || "";
        u.setAttribute("aria-label", `${k(g)} sortieren`);
      }), o.querySelectorAll("tbody tr").forEach((u, p) => {
        if (u.classList.contains("footer-row"))
          return;
        const d = e[p];
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
        o.querySelectorAll("tbody tr").forEach((p, d) => {
          if (p.classList.contains("footer-row"))
            return;
          const g = p.cells.item(4);
          if (!g)
            return;
          const m = e[d], y = Pn(m), h = typeof y?.gain_pct == "number" && Number.isFinite(y.gain_pct) ? y.gain_pct : null, _ = h != null ? `${h.toLocaleString("de-DE", {
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
function zi(e) {
  if (!e) return;
  const { updatePortfolioFooter: t } = Xt();
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
      const v = r(_.dataset.currentValue), P = r(_.dataset.gainAbs), C = r(_.dataset.purchaseSum);
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
  }, f = { hasValue: i }, u = M("current_value", l.current_value, l, f), p = i ? a.sumGainAbs : null, d = i ? o : null, g = M("gain_abs", p, l, f), m = M("gain_pct", d, l, f);
  s.innerHTML = `
    <td>Summe</td>
    <td class="align-right">${c}</td>
    <td class="align-right">${u}</td>
    <td class="align-right">${g}</td>
    <td class="align-right">${m}</td>
  `;
  const y = s.cells.item(3);
  y && (y.dataset.gainPct = i && typeof o == "number" ? `${Ht(o)} %` : "—", y.dataset.gainSign = i && typeof o == "number" ? o > 0 ? "positive" : o < 0 ? "negative" : "neutral" : "neutral"), s.dataset.positionCount = Math.round(a.sumPositions).toString(), s.dataset.currentValue = i ? a.sumCurrent.toString() : "", s.dataset.purchaseSum = i ? a.sumPurchase.toString() : "", s.dataset.gainAbs = i ? a.sumGainAbs.toString() : "", s.dataset.gainPct = i && typeof o == "number" ? o.toString() : "", s.dataset.hasValue = i ? "true" : "false", s.dataset.fxUnavailable = a.fxUnavailable || !i ? "true" : "false";
}
function Nn(e) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  if (typeof e == "string") {
    const t = Number.parseFloat(e);
    return Number.isFinite(t) ? t : 0;
  }
  return 0;
}
function Ht(e) {
  return (yt(e, { fallback: 0 }) ?? 0).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
function vr(e, t, n) {
  const r = n ?? document, i = (Array.isArray(e) ? e : []).reduce((u, p) => {
    const d = p.balance ?? p.current_value ?? p.value, g = Nn(d);
    return u + g;
  }, 0), s = (Array.isArray(t) ? t : []).reduce((u, p) => {
    const d = p.current_value ?? p.value, g = Nn(d);
    return u + g;
  }, 0), c = i + s, l = r.querySelector("#headerMeta");
  if (!l) {
    console.warn("updateTotalWealth: #headerMeta nicht gefunden.");
    return;
  }
  const f = l.querySelector("strong") || l.querySelector(".total-wealth-value");
  f ? f.textContent = `${Ht(c)} €` : l.textContent = `💰 Gesamtvermögen: ${Ht(c)} €`, l.dataset.totalWealthEur = c.toString();
}
function qi(e, t) {
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
function Hs(e) {
  if (e == null)
    return;
  const t = e.querySelector("table.sortable-positions");
  if (t == null)
    return;
  const n = e.dataset.sortKey || t.dataset.defaultSort || "name", a = (e.dataset.sortDir || t.dataset.defaultDir || "asc") === "desc" ? "desc" : "asc";
  e.dataset.sortKey = n, e.dataset.sortDir = a, nr(t, n, a, !0);
}
const Is = {
  getPortfolioPositionsCacheSnapshot: ti,
  clearPortfolioPositionsCache: ei,
  getPendingUpdateCount() {
    return oe.size;
  },
  queuePendingUpdate(e, t, n) {
    oe.set(e, { positions: t, error: n });
  },
  clearPendingUpdates() {
    oe.clear(), ze.clear();
  },
  renderPositionsTableInline: br
};
function Qe(e) {
  return e == null ? 0 : parseFloat(
    e.replace(/\u00A0/g, " ").replace(/[€%]/g, "").replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "")
  ) || 0;
}
const En = 50;
function xn(e, t) {
  try {
    t();
  } catch (n) {
    console.warn(`addSwipeEvents: ${e} handler threw`, n);
  }
}
function Oi(e, t, n) {
  let r = null;
  const a = (l) => {
    l < -En ? xn("left", t) : l > En && xn("right", n);
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
const Bi = [
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
function Nt(e) {
  return Bi.includes(e);
}
function Et(e) {
  return e === "asc" || e === "desc";
}
function Sr(e) {
  return (e ?? []).filter((t) => !t.key.endsWith("-coverage"));
}
function Fn(e) {
  return Sr(e).filter(
    (t) => !t.key.startsWith("provenance-")
  );
}
let ot = null, st = null;
const kn = { min: 2, max: 6 };
function He(e) {
  return ue(e);
}
function Wi(e) {
  return typeof e == "number" && Number.isFinite(e);
}
function ji(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  if (!t)
    return null;
  const n = t.toUpperCase();
  return /^[A-Z]{3}$/.test(n) ? n : n === "€" ? "EUR" : null;
}
function Dn(e, t, n = null) {
  for (const r of t) {
    const a = ji(e[r]);
    if (a)
      return a;
  }
  return n;
}
function $n(e, t) {
  return Wi(e) ? `${e.toLocaleString("de-DE", {
    minimumFractionDigits: kn.min,
    maximumFractionDigits: kn.max
  })}${t ? ` ${t}` : ""}` : null;
}
function Yi(e) {
  const t = e, n = e.average_cost ?? null, r = e.aggregation ?? null, a = Dn(t, [
    "security_currency_code",
    "security_currency",
    "native_currency_code",
    "native_currency"
  ], e.currency_code ?? null), i = Dn(
    t,
    [
      "account_currency_code",
      "account_currency",
      "purchase_currency_code",
      "currency_code"
    ],
    a === "EUR" ? "EUR" : null
  ) ?? "EUR", o = He(n?.native), s = He(n?.security), c = He(n?.account), l = He(n?.eur), f = s ?? o, u = l ?? (i === "EUR" ? c : null), p = a ?? i, d = p === "EUR";
  let g, m;
  d ? (g = "EUR", m = u ?? f ?? c ?? null) : f != null ? (g = p, m = f) : c != null ? (g = i, m = c) : (g = "EUR", m = u ?? null);
  const y = $n(m, g), h = d ? null : $n(u, "EUR"), _ = !!h && h !== y, b = [], v = [];
  y ? (b.push(
    `<span class="purchase-price purchase-price--primary">${y}</span>`
  ), v.push(y.replace(/\u00A0/g, " "))) : (b.push('<span class="missing-value" role="note" aria-label="Kein Kaufpreis verfügbar" title="Kein Kaufpreis verfügbar">—</span>'), v.push("Kein Kaufpreis verfügbar")), _ && h && (b.push(
    `<span class="purchase-price purchase-price--secondary">${h}</span>`
  ), v.push(h.replace(/\u00A0/g, " ")));
  const P = b.join("<br>"), C = He(r?.purchase_value_eur) ?? 0, w = v.join(", ");
  return { markup: P, sortValue: C, ariaLabel: w };
}
function Ki(e) {
  const t = ue(e.current_holdings);
  if (t == null)
    return { value: null, pct: null };
  const n = ue(e.last_price_eur), r = ue(e.last_close_eur);
  let a = null, i = null;
  if (n != null && r != null) {
    a = (n - r) * t;
    const u = r * t;
    u && (i = a / u * 100);
  }
  const s = ye(e.performance)?.day_change ?? null;
  if (a == null && s?.price_change_eur != null && (a = s.price_change_eur * t), i == null && s?.change_pct != null && (i = s.change_pct), a == null && i != null) {
    const f = ue(e.current_value);
    if (f != null) {
      const u = f / (1 + i / 100);
      u && (a = f - u);
    }
  }
  const c = a != null && Number.isFinite(a) ? Math.round(a * 100) / 100 : null, l = i != null && Number.isFinite(i) ? Math.round(i * 100) / 100 : null;
  return { value: c, pct: l };
}
const ct = /* @__PURE__ */ new Set();
function Pr(e) {
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
    const o = ye(i.performance), s = typeof o?.gain_abs == "number" ? o.gain_abs : null, c = typeof o?.gain_pct == "number" ? o.gain_pct : null, l = Ki(i), f = typeof i.purchase_value == "number" || typeof i.purchase_value == "string" ? i.purchase_value : null;
    return {
      name: typeof i.name == "string" ? k(i.name) : typeof i.name == "number" ? String(i.name) : "",
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
  }), a = Se(r, n, ["purchase_value", "current_value", "day_change_abs", "gain_abs"]);
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
        const p = u.textContent || "";
        u.setAttribute("aria-label", `${k(p)} sortieren`);
      }), o.querySelectorAll("tbody tr").forEach((l, f) => {
        if (l.classList.contains("footer-row") || f >= t.length)
          return;
        const u = t[f], p = typeof u.security_uuid == "string" ? u.security_uuid : null;
        p && (l.dataset.security = p), l.classList.add("position-row");
        const d = l.cells.item(2);
        if (d) {
          const { markup: y, sortValue: h, ariaLabel: _ } = Yi(u);
          d.innerHTML = y, d.dataset.sortValue = String(h), _ ? d.setAttribute("aria-label", _) : d.removeAttribute("aria-label");
        }
        const g = l.cells.item(7);
        if (g) {
          const y = ye(u.performance), h = typeof y?.gain_pct == "number" && Number.isFinite(y.gain_pct) ? y.gain_pct : null, _ = h != null ? `${h.toLocaleString("de-DE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })} %` : "—", b = h == null ? "neutral" : h > 0 ? "positive" : h < 0 ? "negative" : "neutral";
          g.dataset.gainPct = _, g.dataset.gainSign = b;
        }
        const m = l.cells.item(8);
        m && m.classList.add("gain-pct-cell");
      }), o.dataset.defaultSort = "name", o.dataset.defaultDir = "asc", Pr(o), o.outerHTML;
    }
  } catch (i) {
    console.warn("renderPositionsTable: Konnte Sortier-Metadaten nicht injizieren:", i);
  }
  return a;
}
function Gi(e) {
  const t = vt(e ?? []);
  return We(t);
}
function Xi(e, t) {
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
        ia(c) || console.warn("attachSecurityDetailDelegation: Detail-Tab konnte nicht geöffnet werden für", c);
      } catch (l) {
        console.error("attachSecurityDetailDelegation: Fehler beim Öffnen des Detail-Tabs", l);
      }
  })));
}
function je(e, t) {
  Xi(e, t);
}
function Ar(e) {
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
    const F = S.align === "right" ? ' class="align-right"' : "";
    n += `<th${F}>${S.label}</th>`;
  }), n += "</tr></thead><tbody>", e.forEach((S) => {
    const F = Number.isFinite(S.position_count) ? S.position_count : 0, L = Number.isFinite(S.purchase_sum) ? S.purchase_sum : 0, Y = S.hasValue && typeof S.current_value == "number" && Number.isFinite(S.current_value) ? S.current_value : null, R = Y !== null, V = S.performance, B = typeof S.gain_abs == "number" ? S.gain_abs : typeof V?.gain_abs == "number" ? V.gain_abs : null, j = typeof S.gain_pct == "number" ? S.gain_pct : typeof V?.gain_pct == "number" ? V.gain_pct : null, X = V && typeof V == "object" ? V.day_change : null, G = typeof S.day_change_abs == "number" ? S.day_change_abs : X && typeof X == "object" ? X.value_change_eur ?? X.price_change_eur : null, Le = typeof S.day_change_pct == "number" ? S.day_change_pct : X && typeof X == "object" && typeof X.change_pct == "number" ? X.change_pct : null, be = S.fx_unavailable && R, sa = typeof S.coverage_ratio == "number" && Number.isFinite(S.coverage_ratio) ? S.coverage_ratio : "", ca = typeof S.provenance == "string" ? S.provenance : "", la = typeof S.metric_run_uuid == "string" ? S.metric_run_uuid : "", Me = ct.has(S.uuid), ua = Me ? "portfolio-toggle expanded" : "portfolio-toggle", fn = `portfolio-details-${S.uuid}`, J = {
      fx_unavailable: S.fx_unavailable,
      purchase_value: L,
      current_value: Y,
      day_change_abs: G,
      day_change_pct: Le,
      gain_abs: B,
      gain_pct: j
    }, Ae = { hasValue: R }, da = M("purchase_value", J.purchase_value, J, Ae), fa = M("current_value", J.current_value, J, Ae), pa = M("day_change_abs", J.day_change_abs, J, Ae), ga = M("day_change_pct", J.day_change_pct, J, Ae), ha = M("gain_abs", J.gain_abs, J, Ae), ma = M("gain_pct", J.gain_pct, J, Ae), pn = R && typeof j == "number" && Number.isFinite(j) ? `${pe(j)} %` : "", _a = R && typeof j == "number" && Number.isFinite(j) ? j > 0 ? "positive" : j < 0 ? "negative" : "neutral" : "", ya = R && typeof Y == "number" && Number.isFinite(Y) ? Y : "", ba = R && typeof B == "number" && Number.isFinite(B) ? B : "", va = R && typeof j == "number" && Number.isFinite(j) ? j : "", Sa = R && typeof G == "number" && Number.isFinite(G) ? G : "", Pa = R && typeof Le == "number" && Number.isFinite(Le) ? Le : "", Aa = String(F);
    let Pt = "";
    pn && (Pt = ` data-gain-pct="${t(pn)}" data-gain-sign="${t(_a)}"`), be && (Pt += ' data-partial="true"'), n += `<tr class="portfolio-row"
                  data-portfolio="${S.uuid}"
                  data-position-count="${Aa}"
                  data-current-value="${t(ya)}"
                  data-purchase-sum="${t(L)}"
                  data-day-change="${t(Sa)}"
                  data-day-change-pct="${t(Pa)}"
                  data-gain-abs="${t(ba)}"
                data-gain-pct="${t(va)}"
                data-has-value="${R ? "true" : "false"}"
                data-fx-unavailable="${S.fx_unavailable ? "true" : "false"}"
                data-coverage-ratio="${t(sa)}"
                data-provenance="${t(ca)}"
                data-metric-run-uuid="${t(la)}">`;
    const Ca = k(S.name), wa = gr(Sr(S.badges), {
      containerClass: "portfolio-badges"
    });
    n += `<td>
        <button type="button"
                class="${ua}"
                data-portfolio="${S.uuid}"
                aria-expanded="${Me ? "true" : "false"}"
                aria-controls="${fn}">
          <span class="caret">${Me ? "▼" : "▶"}</span>
          <span class="portfolio-name">${Ca}</span>${wa}
        </button>
      </td>`;
    const Na = F.toLocaleString("de-DE");
    n += `<td class="align-right">${Na}</td>`, n += `<td class="align-right">${da}</td>`, n += `<td class="align-right">${fa}</td>`, n += `<td class="align-right">${pa}</td>`, n += `<td class="align-right">${ga}</td>`, n += `<td class="align-right"${Pt}>${ha}</td>`, n += `<td class="align-right gain-pct-cell">${ma}</td>`, n += "</tr>", n += `<tr class="portfolio-details${Me ? "" : " hidden"}"
                data-portfolio="${S.uuid}"
                id="${fn}"
                role="region"
                aria-label="Positionen für ${S.name}">
      <td colspan="${r.length.toString()}">
        <div class="positions-container">${Me ? bt(S.uuid) ? We(ar(S.uuid)) : Qt("Lade Positionen...") : ""}</div>
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
  }, 0), u = a.length > 0, p = a.length !== e.length, d = c.length > 0, g = d && u && o !== 0 ? (() => {
    const S = o - l;
    return S ? l / S * 100 : null;
  })() : null, m = u && s > 0 ? f / s * 100 : null, y = {
    fx_unavailable: p,
    purchase_value: u ? s : null,
    current_value: u ? o : null,
    day_change_abs: d ? l : null,
    day_change_pct: d ? g : null,
    gain_abs: u ? f : null,
    gain_pct: u ? m : null
  }, h = { hasValue: u }, _ = { hasValue: d }, b = M("purchase_value", y.purchase_value, y, h), v = M("current_value", y.current_value, y, h), P = M("day_change_abs", y.day_change_abs, y, _), C = M("day_change_pct", y.day_change_pct, y, _), w = M("gain_abs", y.gain_abs, y, h), N = M("gain_pct", y.gain_pct, y, h);
  let D = "";
  if (u && typeof m == "number" && Number.isFinite(m)) {
    const S = `${pe(m)} %`, F = m > 0 ? "positive" : m < 0 ? "negative" : "neutral";
    D = ` data-gain-pct="${t(S)}" data-gain-sign="${t(F)}"`;
  }
  p && (D += ' data-partial="true"');
  const I = String(Math.round(i)), A = u ? String(o) : "", x = u ? String(s) : "", z = d ? String(l) : "", E = d && typeof g == "number" && Number.isFinite(g) ? String(g) : "", $ = u ? String(f) : "", K = u && typeof m == "number" && Number.isFinite(m) ? String(m) : "";
  return n += `<tr class="footer-row"
      data-position-count="${I}"
      data-current-value="${t(A)}"
      data-purchase-sum="${t(x)}"
      data-day-change="${t(z)}"
      data-day-change-pct="${t(E)}"
      data-gain-abs="${t($)}"
      data-gain-pct="${t(K)}"
      data-has-value="${u ? "true" : "false"}"
      data-fx-unavailable="${p ? "true" : "false"}">
      <td>Summe</td>
      <td class="align-right">${Math.round(i).toLocaleString("de-DE")}</td>
    <td class="align-right">${b}</td>
    <td class="align-right">${v}</td>
    <td class="align-right">${P}</td>
    <td class="align-right">${C}</td>
    <td class="align-right"${D}>${w}</td>
    <td class="align-right gain-pct-cell">${N}</td>
  </tr>`, n += "</tbody></table>", n;
}
function Zi(e) {
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
function Ie(e) {
  if (e === void 0)
    return null;
  const t = Number(e);
  return Number.isFinite(t) ? t : null;
}
function Cr(e) {
  const t = Zi(e);
  if (!t)
    return;
  const n = t.tBodies.item(0);
  if (!n)
    return;
  const r = Array.from(n.querySelectorAll("tr.portfolio-row"));
  if (!r.length)
    return;
  let a = 0, i = 0, o = 0, s = 0, c = 0, l = !1, f = !1, u = !0, p = !1;
  for (const L of r) {
    const Y = Ie(L.dataset.positionCount);
    Y != null && (a += Y), L.dataset.fxUnavailable === "true" && (p = !0);
    const R = L.dataset.hasValue;
    if (!!(R === "false" || R === "0" || R === "" || R == null)) {
      u = !1;
      continue;
    }
    l = !0;
    const B = Ie(L.dataset.currentValue), j = Ie(L.dataset.gainAbs), X = Ie(L.dataset.purchaseSum), G = Ie(L.dataset.dayChange);
    if (B == null || j == null || X == null) {
      u = !1;
      continue;
    }
    i += B, s += j, o += X, G != null && (c += G, f = !0);
  }
  const d = l && u, g = d && o > 0 ? s / o * 100 : null, m = f && d && i !== 0 ? (() => {
    const L = i - c;
    return L ? c / L * 100 : null;
  })() : null;
  let y = Array.from(n.children).find(
    (L) => L instanceof HTMLTableRowElement && L.classList.contains("footer-row")
  );
  y || (y = document.createElement("tr"), y.classList.add("footer-row"), n.appendChild(y));
  const h = Math.round(a).toLocaleString("de-DE"), _ = {
    fx_unavailable: p || !d,
    purchase_value: d ? o : null,
    current_value: d ? i : null,
    day_change_abs: f && d ? c : null,
    day_change_pct: f && d ? m : null,
    gain_abs: d ? s : null,
    gain_pct: d ? g : null
  }, b = { hasValue: d }, v = { hasValue: f && d }, P = M("purchase_value", _.purchase_value, _, b), C = M("current_value", _.current_value, _, b), w = M("day_change_abs", _.day_change_abs, _, v), N = M("day_change_pct", _.day_change_pct, _, v), D = M("gain_abs", _.gain_abs, _, b), I = M("gain_pct", _.gain_pct, _, b), A = t.tHead ? t.tHead.rows.item(0) : null, x = A ? A.cells.length : 0, z = y.cells.length, E = x || z, $ = E > 0 ? E <= 5 : !1, K = d && typeof g == "number" ? `${pe(g)} %` : "", S = d && typeof g == "number" ? g > 0 ? "positive" : g < 0 ? "negative" : "neutral" : "neutral";
  $ ? y.innerHTML = `
      <td>Summe</td>
      <td class="align-right">${h}</td>
      <td class="align-right">${C}</td>
      <td class="align-right">${D}</td>
      <td class="align-right gain-pct-cell">${I}</td>
    ` : y.innerHTML = `
      <td>Summe</td>
      <td class="align-right">${h}</td>
      <td class="align-right">${P}</td>
      <td class="align-right">${C}</td>
      <td class="align-right">${w}</td>
      <td class="align-right">${N}</td>
      <td class="align-right">${D}</td>
      <td class="align-right">${I}</td>
    `;
  const F = y.cells.item($ ? 3 : 6);
  F && (F.dataset.gainPct = K || "—", F.dataset.gainSign = S), y.dataset.positionCount = String(Math.round(a)), y.dataset.currentValue = d ? String(i) : "", y.dataset.purchaseSum = d ? String(o) : "", y.dataset.dayChange = d && f ? String(c) : "", y.dataset.dayChangePct = d && f && typeof m == "number" ? String(m) : "", y.dataset.gainAbs = d ? String(s) : "", y.dataset.gainPct = d && typeof g == "number" ? String(g) : "", y.dataset.hasValue = d ? "true" : "false", y.dataset.fxUnavailable = p ? "true" : "false";
}
function Ye(e, t) {
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
  const i = (d, g) => {
    const m = a.querySelector("tbody");
    if (!m) return;
    const y = Array.from(m.querySelectorAll("tr")).filter((v) => !v.classList.contains("footer-row")), h = m.querySelector("tr.footer-row"), _ = (v) => {
      if (v == null) return 0;
      const P = v.replace(/\u00A0/g, " ").replace(/[%€]/g, "").replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, ""), C = Number.parseFloat(P);
      return Number.isFinite(C) ? C : 0;
    };
    y.sort((v, P) => {
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
      }[d], N = v.cells.item(w), D = P.cells.item(w);
      let I = "";
      if (N) {
        const E = N.textContent;
        typeof E == "string" && (I = E.trim());
      }
      let A = "";
      if (D) {
        const E = D.textContent;
        typeof E == "string" && (A = E.trim());
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
      let z;
      if (d === "name")
        z = I.localeCompare(A, "de", { sensitivity: "base" });
      else {
        const E = x(N, I), $ = x(D, A);
        z = E - $;
      }
      return g === "asc" ? z : -z;
    }), a.querySelectorAll("thead th.sort-active").forEach((v) => {
      v.classList.remove("sort-active", "dir-asc", "dir-desc");
    }), a.querySelectorAll("thead th[aria-sort]").forEach((v) => {
      v.setAttribute("aria-sort", "none");
    });
    const b = a.querySelector(`thead th[data-sort-key="${d}"]`);
    b && (b.classList.add("sort-active", g === "asc" ? "dir-asc" : "dir-desc"), b.setAttribute("aria-sort", g === "asc" ? "ascending" : "descending")), y.forEach((v) => m.appendChild(v)), h && m.appendChild(h);
  }, o = r.dataset.sortKey, s = r.dataset.sortDir, c = a.dataset.defaultSort, l = a.dataset.defaultDir, f = Nt(o) ? o : Nt(c) ? c : "name", u = Et(s) ? s : Et(l) ? l : "asc";
  i(f, u);
  const p = (d) => {
    const g = d.target;
    if (!(g instanceof Element))
      return;
    const m = g.closest("th[data-sort-key]");
    if (!m || !a.contains(m)) return;
    const y = m.getAttribute("data-sort-key");
    if (!Nt(y))
      return;
    let h = "asc";
    r.dataset.sortKey === y && (h = (Et(r.dataset.sortDir) ? r.dataset.sortDir : "asc") === "asc" ? "desc" : "asc"), r.dataset.sortKey = y, r.dataset.sortDir = h, i(y, h);
  };
  a.addEventListener("click", (d) => {
    p(d);
  }), a.addEventListener("keydown", (d) => {
    (d.key === "Enter" || d.key === " ") && (d.preventDefault(), p(d));
  });
}
async function Ji(e, t, n) {
  if (!e || !ot || !st) return;
  const r = t || n.querySelector(
    `.portfolio-details[data-portfolio="${e}"] .positions-container`
  );
  if (!r)
    return;
  const a = r.closest(".portfolio-details");
  if (!(a && a.classList.contains("hidden"))) {
    r.innerHTML = Qt("Neu laden...");
    try {
      const i = await tr(
        ot,
        st,
        e
      );
      if (i.error) {
        const s = typeof i.error == "string" ? i.error : String(i.error);
        r.innerHTML = `<div class="error">${k(s)} <button class="retry-pos" data-portfolio="${e}">Erneut laden</button></div>`;
        return;
      }
      const o = vt(
        Array.isArray(i.positions) ? i.positions : []
      );
      rt(e, o), at(e, o), r.innerHTML = We(o);
      try {
        Ye(n, e);
      } catch (s) {
        console.warn("attachPortfolioToggleHandler: Sort-Init (Lazy) fehlgeschlagen:", s);
      }
      try {
        je(n, e);
      } catch (s) {
        console.warn("reloadPortfolioPositions: Security-Listener konnte nicht gebunden werden:", s);
      }
    } catch (i) {
      const o = i instanceof Error ? i.message : String(i);
      r.innerHTML = `<div class="error">Fehler: ${k(o)} <button class="retry-pos" data-portfolio="${e}">Retry</button></div>`;
    }
  }
}
async function Qi(e, t, n = 3e3, r = 50) {
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
function on(e) {
  const n = (typeof e.__ppReaderAttachToken == "number" ? e.__ppReaderAttachToken : 0) + 1;
  e.__ppReaderAttachToken = n, e.__ppReaderAttachInProgress = !0, (async () => {
    try {
      const r = await Qi(e, ".portfolio-table");
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
                await Ji(d, m ?? null, e);
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
              f.classList.remove("hidden"), c.classList.add("expanded"), c.setAttribute("aria-expanded", "true"), u && (u.textContent = "▼"), ct.add(l);
              try {
                an(e, l);
              } catch (d) {
                console.warn("attachPortfolioToggleHandler: Pending-Flush fehlgeschlagen:", d);
              }
              if (bt(l)) {
                const d = f.querySelector(".positions-container");
                if (d) {
                  d.innerHTML = We(
                    ar(l)
                  ), Ye(e, l);
                  try {
                    je(e, l);
                  } catch (g) {
                    console.warn("attachPortfolioToggleHandler: Security-Listener (Cache) Fehler:", g);
                  }
                }
              } else {
                const d = f.querySelector(".positions-container");
                d && (d.innerHTML = Qt("Lade Positionen..."));
                try {
                  const g = await tr(
                    ot,
                    st,
                    l
                  );
                  if (g.error) {
                    const y = typeof g.error == "string" ? g.error : String(g.error);
                    d && (d.innerHTML = `<div class="error">${k(y)} <button class="retry-pos" data-portfolio="${l}">Erneut laden</button></div>`);
                    return;
                  }
                  const m = vt(
                    Array.isArray(g.positions) ? g.positions : []
                  );
                  if (rt(l, m), at(
                    l,
                    m
                  ), d) {
                    d.innerHTML = We(m);
                    try {
                      Ye(e, l);
                    } catch (y) {
                      console.warn("attachPortfolioToggleHandler: Sort-Init (Lazy) fehlgeschlagen:", y);
                    }
                    try {
                      je(e, l);
                    } catch (y) {
                      console.warn("attachPortfolioToggleHandler: Security-Listener konnte nicht gebunden werden:", y);
                    }
                  }
                } catch (g) {
                  const m = g instanceof Error ? g.message : String(g), y = f.querySelector(".positions-container");
                  y && (y.innerHTML = `<div class="error">Fehler beim Laden: ${k(m)} <button class="retry-pos" data-portfolio="${l}">Retry</button></div>`), console.error("Fehler beim Lazy Load für", l, g);
                }
              }
            } else
              f.classList.add("hidden"), c.classList.remove("expanded"), c.setAttribute("aria-expanded", "false"), u && (u.textContent = "▶"), ct.delete(l);
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
function eo(e) {
  const t = e.querySelector(".expandable-portfolio-table");
  t && (t.__ppReaderPortfolioFallbackBound || (t.__ppReaderPortfolioFallbackBound = !0, t.addEventListener("click", (n) => {
    const r = n.target;
    !(r instanceof Element) || !r.closest(".portfolio-toggle") || e.querySelector(".portfolio-table")?.__ppReaderPortfolioToggleBound || (console.debug("Fallback-Listener aktiv – re-attach Hauptlistener"), on(e));
  })));
}
async function wr(e, t, n) {
  ot = t ?? null, st = n ?? null, console.debug(
    "renderDashboard: start – panelConfig:",
    n?.config,
    "derived entry_id?",
    n?.config?._panel_custom?.config?.entry_id
  );
  const r = await Ia(t, n);
  sr(r.accounts);
  const a = pr(), i = await Ua(t, n);
  si(i.portfolios);
  const o = mi();
  let s = "";
  try {
    s = await Va(t, n);
  } catch {
    s = "";
  }
  const c = a.reduce(
    (A, x) => A + (typeof x.balance == "number" && Number.isFinite(x.balance) ? x.balance : 0),
    0
  ), l = o.some((A) => A.fx_unavailable), f = a.some((A) => A.fx_unavailable && (A.balance == null || !Number.isFinite(A.balance))), u = o.reduce((A, x) => x.hasValue && typeof x.current_value == "number" && Number.isFinite(x.current_value) ? A + x.current_value : A, 0), p = c + u, d = "Teilw. fehlende FX-Kurse – Gesamtvermögen abweichend", m = o.some((A) => A.hasValue && typeof A.current_value == "number" && Number.isFinite(A.current_value)) || a.some((A) => typeof A.balance == "number" && Number.isFinite(A.balance)) ? `${pe(p)}&nbsp;€` : `<span class="missing-value" role="note" aria-label="${d}" title="${d}">—</span>`, y = l || f ? `<span class="total-wealth-note">${d}</span>` : "", h = `
    <div class="header-meta-row">
      💰 Gesamtvermögen: <strong class="total-wealth-value">${m}</strong>${y}
    </div>
  `, _ = Jt("Übersicht", h), b = Ar(o), v = a.filter((A) => (A.currency_code ?? "EUR") === "EUR"), P = a.filter((A) => (A.currency_code ?? "EUR") !== "EUR"), w = P.some((A) => A.fx_unavailable) ? `
        <p class="table-note" role="note">
          <span class="table-note__icon" aria-hidden="true">⚠️</span>
          <span>Wechselkurse konnten nicht geladen werden. EUR-Werte werden derzeit nicht angezeigt.</span>
        </p>
      ` : "", N = `
    <div class="card">
      <h2>Liquidität</h2>
      <div class="scroll-container account-table">
        ${Se(
    v.map((A) => ({
      name: it(A.name, Fn(A.badges), {
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
          ${Se(
    P.map((A) => {
      const x = A.orig_balance, E = typeof x == "number" && Number.isFinite(x) ? `${x.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}&nbsp;${A.currency_code ?? ""}` : "";
      return {
        name: it(A.name, Fn(A.badges), {
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
  `, D = `
    <div class="card footer-card">
      <div class="meta">
        <div class="last-file-update">
          📂 Letzte Aktualisierung der Datei: <strong>${s || "Unbekannt"}</strong>
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
    ${D}
  `;
  return to(e, o), I;
}
function to(e, t) {
  if (!e)
    return;
  const n = () => {
    try {
      const a = e, i = a.querySelector(".portfolio-table");
      i && i.querySelectorAll(".portfolio-toggle").length === 0 && (console.debug("Recovery: Tabelle ohne Buttons – erneuter Aufbau"), i.innerHTML = Ar(t)), on(e), eo(e), ct.forEach((o) => {
        try {
          bt(o) && (Ye(e, o), je(e, o));
        } catch (s) {
          console.warn("Init-Sortierung für expandiertes Depot fehlgeschlagen:", o, s);
        }
      });
      try {
        Cr(a);
      } catch (o) {
        console.warn("renderDashboard: Footer-Summe konnte nicht aktualisiert werden:", o);
      }
      try {
        Ri(e);
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
Da({
  renderPositionsTable: (e) => Gi(e),
  applyGainPctMetadata: Pr,
  attachSecurityDetailListener: je,
  attachPortfolioPositionsSorting: Ye,
  updatePortfolioFooter: (e) => {
    e && Cr(e);
  }
});
const no = "http://www.w3.org/2000/svg", we = 640, Ne = 260, Ve = { top: 12, right: 16, bottom: 24, left: 16 }, Ue = "var(--pp-reader-chart-line, #3f51b5)", It = "var(--pp-reader-chart-area, rgba(63, 81, 181, 0.12))", Rn = "0.75rem", Nr = "var(--pp-reader-chart-baseline, rgba(96, 125, 139, 0.75))", Er = "6 4", ro = 1440 * 60 * 1e3;
function ao(e) {
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
function io(e) {
  return typeof e == "string" ? e : typeof e == "number" && Number.isFinite(e) ? e.toString() : e instanceof Date && Number.isFinite(e.getTime()) ? e.toISOString() : "";
}
function Q(e) {
  return `${String(e)}px`;
}
function ne(e, t = {}) {
  const n = document.createElementNS(no, e);
  return Object.entries(t).forEach(([r, a]) => {
    const i = ao(a);
    i != null && n.setAttribute(r, i);
  }), n;
}
function lt(e, t = null) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  if (typeof e == "string" && e.trim() !== "") {
    const n = Number.parseFloat(e);
    if (Number.isFinite(n))
      return n;
  }
  return t;
}
function xr(e, t) {
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
const Fr = (e) => {
  if (e && typeof e == "object" && "date" in e)
    return e.date;
}, kr = (e) => {
  if (e && typeof e == "object" && "close" in e)
    return e.close;
}, Dr = (e, t, n) => {
  if (Number.isFinite(e)) {
    const r = new Date(e);
    if (!Number.isNaN(r.getTime()))
      return r.toLocaleDateString("de-DE");
  }
  if (t && typeof t == "object" && "date" in t) {
    const r = t.date, a = io(r);
    if (a)
      return a;
  }
  return Number.isFinite(e) ? e.toString() : "";
}, $r = (e, t, n) => (Number.isFinite(e) ? e : lt(e, 0) ?? 0).toLocaleString("de-DE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
}), Rr = ({ xFormatted: e, yFormatted: t }) => `
    <div class="chart-tooltip-date">${k(e)}</div>
    <div class="chart-tooltip-value">${k(t)}&nbsp;€</div>
  `, Tr = ({
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
function Lr(e) {
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
    width: we,
    height: Ne,
    margin: { ...Ve },
    series: [],
    points: [],
    range: null,
    xAccessor: Fr,
    yAccessor: kr,
    xFormatter: Dr,
    yFormatter: $r,
    tooltipRenderer: Rr,
    markerTooltipRenderer: Tr,
    color: Ue,
    areaColor: It,
    baseline: null,
    handlersAttached: !1,
    markers: [],
    markerPositions: []
  }), e.__chartState;
}
function te(e, t, n) {
  return !Number.isFinite(e) || e < t ? t : e > n ? n : e;
}
function oo(e, t) {
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
function so(e) {
  if (e.length === 0)
    return "";
  const t = [];
  return e.forEach((n, r) => {
    const a = r === 0 ? "M" : "L", i = n.x.toFixed(2), o = n.y.toFixed(2);
    t.push(`${a}${i} ${o}`);
  }), t.join(" ");
}
function co(e) {
  const { baselineLine: t, baseline: n } = e;
  if (!t)
    return;
  const r = n?.color ?? Nr, a = n?.dashArray ?? Er;
  t.setAttribute("stroke", r), t.setAttribute("stroke-dasharray", a);
}
function xt(e) {
  const { baselineLine: t, baseline: n, range: r, margin: a, width: i } = e;
  if (!t)
    return;
  const o = n?.value;
  if (!r || o == null || !Number.isFinite(o)) {
    t.style.opacity = "0";
    return;
  }
  const { minY: s, maxY: c, boundedHeight: l } = r, f = Number.isFinite(s) ? s : o, p = (Number.isFinite(c) ? c : f + 1) - f, d = p === 0 ? 0.5 : (o - f) / p, g = te(d, 0, 1), m = Math.max(l, 0), y = a.top + (1 - g) * m, h = Math.max(i - a.left - a.right, 0), _ = a.left, b = a.left + h;
  t.setAttribute("x1", _.toFixed(2)), t.setAttribute("x2", b.toFixed(2)), t.setAttribute("y1", y.toFixed(2)), t.setAttribute("y2", y.toFixed(2)), t.style.opacity = "1";
}
function lo(e, t, n) {
  const { width: r, height: a, margin: i } = t, { xAccessor: o, yAccessor: s } = n;
  if (e.length === 0)
    return { points: [], range: null };
  const c = e.map((E, $) => {
    const K = o(E, $), S = s(E, $), F = xr(K, $), L = lt(S, Number.NaN);
    return Number.isFinite(L) ? {
      index: $,
      data: E,
      xValue: F,
      yValue: L
    } : null;
  }).filter((E) => !!E);
  if (c.length === 0)
    return { points: [], range: null };
  const l = c.reduce((E, $) => Math.min(E, $.xValue), c[0].xValue), f = c.reduce((E, $) => Math.max(E, $.xValue), c[0].xValue), u = c.reduce((E, $) => Math.min(E, $.yValue), c[0].yValue), p = c.reduce((E, $) => Math.max(E, $.yValue), c[0].yValue), d = Math.max(r - i.left - i.right, 1), g = Math.max(a - i.top - i.bottom, 1), m = Number.isFinite(l) ? l : 0, y = Number.isFinite(f) ? f : m + 1, h = Number.isFinite(u) ? u : 0, _ = Number.isFinite(p) ? p : h + 1, b = lt(t.baseline?.value, null), v = b != null && Number.isFinite(b) ? Math.min(h, b) : h, P = b != null && Number.isFinite(b) ? Math.max(_, b) : _, C = Math.max(
    2,
    Math.min(
      6,
      Math.round(
        Math.max(a - i.top - i.bottom, 0) / 60
      ) || 4
    )
  ), { niceMin: w, niceMax: N } = yo(
    v,
    P,
    C
  ), D = Number.isFinite(w) ? w : h, I = Number.isFinite(N) ? N : _, A = y - m || 1, x = I - D || 1;
  return {
    points: c.map((E) => {
      const $ = A === 0 ? 0.5 : (E.xValue - m) / A, K = x === 0 ? 0.5 : (E.yValue - D) / x, S = i.left + $ * d, F = i.top + (1 - K) * g;
      return {
        ...E,
        x: S,
        y: F
      };
    }),
    range: {
      minX: m,
      maxX: y,
      minY: D,
      maxY: I,
      boundedWidth: d,
      boundedHeight: g
    }
  };
}
function Ft(e) {
  const { markerLayer: t, markerOverlay: n, markers: r, range: a, margin: i, markerTooltip: o } = e;
  if (e.markerPositions = [], et(e), !t || !n)
    return;
  for (; t.firstChild; )
    t.removeChild(t.firstChild);
  for (; n.firstChild; )
    n.removeChild(n.firstChild);
  if (!a || !Array.isArray(r) || r.length === 0)
    return;
  const s = a.maxX - a.minX || 1, c = a.maxY - a.minY || 1;
  r.forEach((l, f) => {
    const u = xr(l.x, f), p = lt(l.y, Number.NaN), d = Number(p);
    if (!Number.isFinite(u) || !Number.isFinite(d))
      return;
    const g = s === 0 ? 0.5 : te((u - a.minX) / s, 0, 1), m = c === 0 ? 0.5 : te((d - a.minY) / c, 0, 1), y = i.left + g * a.boundedWidth, h = i.top + (1 - m) * a.boundedHeight, _ = ne("g", {
      class: "line-chart-marker",
      transform: `translate(${y.toFixed(2)} ${h.toFixed(2)})`,
      "data-marker-id": l.id
    }), b = ne("circle", {
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
function Mr(e, t, n, r) {
  e.width = Number.isFinite(t) ? Number(t) : we, e.height = Number.isFinite(n) ? Number(n) : Ne, e.margin = {
    top: Number.isFinite(r?.top) ? Number(r?.top) : Ve.top,
    right: Number.isFinite(r?.right) ? Number(r?.right) : Ve.right,
    bottom: Number.isFinite(r?.bottom) ? Number(r?.bottom) : Ve.bottom,
    left: Number.isFinite(r?.left) ? Number(r?.left) : Ve.left
  };
}
function uo(e, t) {
  const n = e.xFormatter(t.xValue, t.data, t.index), r = e.yFormatter(t.yValue, t.data, t.index);
  return e.tooltipRenderer({
    point: t,
    xFormatted: n,
    yFormatted: r,
    data: t.data,
    index: t.index
  });
}
function fo(e, t, n, r = null) {
  const { tooltip: a, width: i, margin: o, height: s } = e;
  if (!a)
    return;
  const c = r && Number.isFinite(r.scaleX) && r.scaleX > 0 ? r.scaleX : 1, l = r && Number.isFinite(r.scaleY) && r.scaleY > 0 ? r.scaleY : 1, f = s - o.bottom;
  a.style.visibility = "visible", a.style.opacity = "1";
  const u = a.offsetWidth || 0, p = a.offsetHeight || 0, d = t.x * c, g = te(
    d - u / 2,
    o.left * c,
    (i - o.right) * c - u
  ), m = Math.max(f * l - p, 0), y = 12, _ = (Number.isFinite(n) ? te(n ?? 0, o.top, f) : t.y) * l;
  let b = _ - p - y;
  b < o.top * l && (b = _ + y), b = te(b, 0, m);
  const v = Q(Math.round(g)), P = Q(Math.round(b));
  a.style.transform = `translate(${v}, ${P})`;
}
function Vt(e) {
  const { tooltip: t, focusLine: n, focusCircle: r } = e;
  t && (t.style.opacity = "0", t.style.visibility = "hidden"), n && (n.style.opacity = "0"), r && (r.style.opacity = "0");
}
function po(e, t) {
  const { marker: n } = t, r = e.xFormatter(t.marker.x, n, -1), a = e.yFormatter(t.marker.y, n, -1);
  return e.markerTooltipRenderer({
    marker: n,
    xFormatted: r,
    yFormatted: a
  });
}
function go(e, t, n, r = null) {
  const { markerTooltip: a, width: i, margin: o, height: s, tooltip: c } = e;
  if (!a)
    return;
  const l = r && Number.isFinite(r.scaleX) && r.scaleX > 0 ? r.scaleX : 1, f = r && Number.isFinite(r.scaleY) && r.scaleY > 0 ? r.scaleY : 1, u = s - o.bottom;
  a.style.visibility = "visible", a.style.opacity = "1";
  const p = a.offsetWidth || 0, d = a.offsetHeight || 0, g = t.x * l, m = te(
    g - p / 2,
    o.left * l,
    (i - o.right) * l - p
  ), y = Math.max(u * f - d, 0), h = 10, _ = c?.getBoundingClientRect(), b = e.svg?.getBoundingClientRect(), v = _ && b ? _.top - b.top : null, P = _ && b ? _.bottom - b.top : null, w = (Number.isFinite(n) ? te(n ?? t.y, o.top, u) : t.y) * f;
  let N;
  v != null && P != null ? v <= w ? N = v - d - h : N = P + h : (N = w - d - h, N < o.top * f && (N = w + h)), N = te(N, 0, y);
  const D = Q(Math.round(m)), I = Q(Math.round(N));
  a.style.transform = `translate(${D}, ${I})`;
}
function et(e) {
  const { markerTooltip: t } = e;
  t && (t.style.opacity = "0", t.style.visibility = "hidden");
}
function ho(e, t, n) {
  let a = null, i = 576;
  for (const o of e.markerPositions) {
    const s = o.x - t, c = o.y - n, l = s * s + c * c;
    l <= i && (a = o, i = l);
  }
  return a;
}
function mo(e, t) {
  if (t.handlersAttached || !t.overlay)
    return;
  const n = (a) => {
    if (t.points.length === 0 || !t.svg) {
      Vt(t), et(t);
      return;
    }
    const i = t.svg.getBoundingClientRect(), o = t.width || we, s = t.height || Ne, c = i.width && Number.isFinite(i.width) && Number.isFinite(o) && o > 0 ? i.width / o : 1, l = i.height && Number.isFinite(i.height) && Number.isFinite(s) && s > 0 ? i.height / s : 1, f = c > 0 ? 1 / c : 1, u = l > 0 ? 1 / l : 1, p = (a.clientX - i.left) * f, d = (a.clientY - i.top) * u, g = {
      scaleX: c,
      scaleY: l
    };
    let m = t.points[0], y = Math.abs(p - m.x);
    for (let _ = 1; _ < t.points.length; _ += 1) {
      const b = t.points[_], v = Math.abs(p - b.x);
      v < y && (y = v, m = b);
    }
    t.focusCircle && (t.focusCircle.setAttribute("cx", m.x.toFixed(2)), t.focusCircle.setAttribute("cy", m.y.toFixed(2)), t.focusCircle.style.opacity = "1"), t.focusLine && (t.focusLine.setAttribute("x1", m.x.toFixed(2)), t.focusLine.setAttribute("x2", m.x.toFixed(2)), t.focusLine.setAttribute("y1", t.margin.top.toFixed(2)), t.focusLine.setAttribute(
      "y2",
      (t.height - t.margin.bottom).toFixed(2)
    ), t.focusLine.style.opacity = "1"), t.tooltip && (t.tooltip.innerHTML = uo(t, m), fo(t, m, d, g));
    const h = ho(t, p, d);
    h && t.markerTooltip ? (t.markerTooltip.innerHTML = po(t, h), go(t, h, d, g)) : et(t);
  }, r = () => {
    Vt(t), et(t);
  };
  t.overlay.addEventListener("pointermove", n), t.overlay.addEventListener("pointerenter", n), t.overlay.addEventListener("pointerleave", r), t.handlersAttached = !0, t.handlePointerMove = n, t.handlePointerLeave = r, e.addEventListener("pointercancel", r);
}
function _o(e, t = {}) {
  const n = document.createElement("div");
  n.className = "line-chart-container", n.dataset.chartType = "line", n.style.position = "relative";
  const r = ne("svg", {
    width: we,
    height: Ne,
    viewBox: `0 0 ${String(we)} ${String(Ne)}`,
    role: "img",
    "aria-hidden": "true",
    focusable: "false"
  });
  r.classList.add("line-chart-svg");
  const a = ne("path", {
    class: "line-chart-area",
    fill: It,
    stroke: "none"
  }), i = ne("line", {
    class: "line-chart-baseline",
    stroke: Nr,
    "stroke-width": 1,
    "stroke-dasharray": Er,
    opacity: 0
  }), o = ne("path", {
    class: "line-chart-path",
    fill: "none",
    stroke: Ue,
    "stroke-width": 2,
    "stroke-linecap": "round",
    "stroke-linejoin": "round"
  }), s = ne("line", {
    class: "line-chart-focus-line",
    stroke: Ue,
    "stroke-width": 1,
    "stroke-dasharray": "4 4",
    opacity: 0
  }), c = ne("circle", {
    class: "line-chart-focus-circle",
    r: 4,
    fill: "#fff",
    stroke: Ue,
    "stroke-width": 2,
    opacity: 0
  }), l = ne("g", {
    class: "line-chart-markers"
  }), f = ne("rect", {
    class: "line-chart-overlay",
    fill: "transparent",
    x: 0,
    y: 0,
    width: we,
    height: Ne
  });
  r.appendChild(a), r.appendChild(i), r.appendChild(o), r.appendChild(s), r.appendChild(c), r.appendChild(l), r.appendChild(f), n.appendChild(r);
  const u = document.createElement("div");
  u.className = "chart-tooltip", u.style.position = "absolute", u.style.top = "0", u.style.left = "0", u.style.pointerEvents = "none", u.style.opacity = "0", u.style.visibility = "hidden", n.appendChild(u);
  const p = document.createElement("div");
  p.className = "line-chart-marker-overlay", p.style.position = "absolute", p.style.top = "0", p.style.left = "0", p.style.width = "100%", p.style.height = "100%", p.style.pointerEvents = "none", p.style.overflow = "visible", p.style.zIndex = "2", n.appendChild(p);
  const d = document.createElement("div");
  d.className = "chart-tooltip chart-tooltip--marker", d.style.position = "absolute", d.style.top = "0", d.style.left = "0", d.style.pointerEvents = "none", d.style.opacity = "0", d.style.visibility = "hidden", n.appendChild(d), e.appendChild(n);
  const g = Lr(n);
  if (g.svg = r, g.areaPath = a, g.linePath = o, g.baselineLine = i, g.focusLine = s, g.focusCircle = c, g.overlay = f, g.tooltip = u, g.markerOverlay = p, g.markerLayer = l, g.markerTooltip = d, g.xAccessor = t.xAccessor ?? Fr, g.yAccessor = t.yAccessor ?? kr, g.xFormatter = t.xFormatter ?? Dr, g.yFormatter = t.yFormatter ?? $r, g.tooltipRenderer = t.tooltipRenderer ?? Rr, g.markerTooltipRenderer = t.markerTooltipRenderer ?? Tr, g.color = t.color ?? Ue, g.areaColor = t.areaColor ?? It, g.baseline = t.baseline ?? null, g.handlersAttached = !1, g.markers = Array.isArray(t.markers) ? t.markers.slice() : [], !g.xAxis) {
    const m = document.createElement("div");
    m.className = "line-chart-axis line-chart-axis-x", m.style.position = "absolute", m.style.left = "0", m.style.right = "0", m.style.bottom = "0", m.style.pointerEvents = "none", m.style.fontSize = Rn, m.style.color = "var(--secondary-text-color)", m.style.display = "block", n.appendChild(m), g.xAxis = m;
  }
  if (!g.yAxis) {
    const m = document.createElement("div");
    m.className = "line-chart-axis line-chart-axis-y", m.style.position = "absolute", m.style.top = "0", m.style.bottom = "0", m.style.left = "0", m.style.pointerEvents = "none", m.style.fontSize = Rn, m.style.color = "var(--secondary-text-color)", m.style.display = "block", n.appendChild(m), g.yAxis = m;
  }
  return Mr(g, t.width, t.height, t.margin), o.setAttribute("stroke", g.color), s.setAttribute("stroke", g.color), c.setAttribute("stroke", g.color), a.setAttribute("fill", g.areaColor), Hr(n, t), mo(n, g), n;
}
function Hr(e, t = {}) {
  if (!e) {
    console.error("updateLineChart: container element is required");
    return;
  }
  const n = Lr(e);
  if (!n.svg || !n.linePath || !n.overlay) {
    console.error("updateLineChart: chart was not initialised with renderLineChart");
    return;
  }
  t.xAccessor && (n.xAccessor = t.xAccessor), t.yAccessor && (n.yAccessor = t.yAccessor), t.xFormatter && (n.xFormatter = t.xFormatter), t.yFormatter && (n.yFormatter = t.yFormatter), t.tooltipRenderer && (n.tooltipRenderer = t.tooltipRenderer), t.markerTooltipRenderer && (n.markerTooltipRenderer = t.markerTooltipRenderer), t.color && (n.color = t.color, n.linePath.setAttribute("stroke", n.color), n.focusLine && n.focusLine.setAttribute("stroke", n.color), n.focusCircle && n.focusCircle.setAttribute("stroke", n.color)), t.areaColor && (n.areaColor = t.areaColor, n.areaPath && n.areaPath.setAttribute("fill", n.areaColor)), Object.prototype.hasOwnProperty.call(t, "baseline") && (n.baseline = t.baseline ?? null), Array.isArray(t.markers) && (n.markers = t.markers.slice()), co(n), Mr(n, t.width, t.height, t.margin);
  const { width: r, height: a } = n;
  n.svg.setAttribute("width", String(r)), n.svg.setAttribute("height", String(a)), n.svg.setAttribute("viewBox", `0 0 ${String(r)} ${String(a)}`), n.overlay.setAttribute("x", "0"), n.overlay.setAttribute("y", "0"), n.overlay.setAttribute("width", Math.max(r, 0).toFixed(2)), n.overlay.setAttribute("height", Math.max(a, 0).toFixed(2)), Array.isArray(t.series) && (n.series = Array.from(t.series));
  const { points: i, range: o } = lo(n.series, n, {
    xAccessor: n.xAccessor,
    yAccessor: n.yAccessor
  });
  if (n.points = i, n.range = o, i.length === 0) {
    n.linePath.setAttribute("d", ""), n.areaPath && n.areaPath.setAttribute("d", ""), Vt(n), Ft(n), kt(n), xt(n);
    return;
  }
  if (i.length === 1) {
    const c = i[0], l = Math.max(
      0.5,
      Math.min(4, Math.max(n.width - n.margin.left - n.margin.right, 1) * 0.01)
    ), f = `M${c.x.toFixed(2)} ${c.y.toFixed(2)} h${l.toFixed(2)}`;
    n.linePath.setAttribute("d", f), n.areaPath && n.areaPath.setAttribute("d", ""), n.focusCircle && (n.focusCircle.setAttribute("cx", c.x.toFixed(2)), n.focusCircle.setAttribute("cy", c.y.toFixed(2)), n.focusCircle.style.opacity = "1"), n.focusLine && (n.focusLine.style.opacity = "0"), kt(n), xt(n), Ft(n);
    return;
  }
  const s = so(i);
  if (n.linePath.setAttribute("d", s), n.areaPath && o) {
    const c = n.margin.top + o.boundedHeight, l = oo(i, c);
    n.areaPath.setAttribute("d", l);
  }
  kt(n), xt(n), Ft(n);
}
function kt(e) {
  const { xAxis: t, yAxis: n, range: r, margin: a, height: i, yFormatter: o } = e;
  if (!t || !n)
    return;
  if (!r) {
    t.innerHTML = "", n.innerHTML = "";
    return;
  }
  const { minX: s, maxX: c, minY: l, maxY: f, boundedWidth: u, boundedHeight: p } = r, d = Number.isFinite(s) && Number.isFinite(c) && c >= s, g = Number.isFinite(l) && Number.isFinite(f) && f >= l, m = Math.max(u, 0), y = Math.max(p, 0);
  if (t.style.left = Q(a.left), t.style.width = Q(m), t.style.top = Q(i - a.bottom + 6), t.innerHTML = "", d && m > 0) {
    const _ = (c - s) / ro, b = Math.max(2, Math.min(6, Math.round(m / 140) || 4));
    bo(e, s, c, b, _).forEach(({ positionRatio: P, label: C }) => {
      const w = document.createElement("div");
      w.className = "line-chart-axis-tick line-chart-axis-tick-x", w.style.position = "absolute", w.style.bottom = "0";
      const N = te(P, 0, 1);
      w.style.left = Q(N * m);
      let D = "-50%", I = "center";
      N <= 1e-3 ? (D = "0", I = "left", w.style.marginLeft = "2px") : N >= 0.999 && (D = "-100%", I = "right", w.style.marginRight = "2px"), w.style.transform = `translateX(${D})`, w.style.textAlign = I, w.textContent = C, t.appendChild(w);
    });
  }
  n.style.top = Q(a.top), n.style.height = Q(y);
  const h = Math.max(a.left - 6, 0);
  if (n.style.left = "0", n.style.width = Q(Math.max(h, 0)), n.innerHTML = "", g && y > 0) {
    const _ = Math.max(2, Math.min(6, Math.round(y / 60) || 4)), b = vo(l, f, _), v = o;
    b.forEach(({ value: P, positionRatio: C }) => {
      const w = document.createElement("div");
      w.className = "line-chart-axis-tick line-chart-axis-tick-y", w.style.position = "absolute", w.style.left = "0";
      const D = (1 - te(C, 0, 1)) * y;
      w.style.top = Q(D), w.textContent = v(P, null, -1), n.appendChild(w);
    });
  }
}
function yo(e, t, n = 4) {
  if (!Number.isFinite(e) || !Number.isFinite(t))
    return {
      niceMin: e,
      niceMax: t
    };
  const r = Math.max(2, n);
  if (t === e) {
    const l = Ut(Math.abs(e) || 1);
    return {
      niceMin: e - l,
      niceMax: t + l
    };
  }
  const i = (t - e) / (r - 1), o = Ut(i), s = Math.floor(e / o) * o, c = Math.ceil(t / o) * o;
  return s === c ? {
    niceMin: e,
    niceMax: t + o
  } : {
    niceMin: s,
    niceMax: c
  };
}
function bo(e, t, n, r, a) {
  if (!Number.isFinite(t) || !Number.isFinite(n) || n < t)
    return [];
  if (!Number.isFinite(a) || a <= 0)
    return [
      {
        positionRatio: 0.5,
        label: Tn(e, t, a || 0)
      }
    ];
  const i = Math.max(2, r), o = [], s = n - t;
  for (let c = 0; c < i; c += 1) {
    const l = i === 1 ? 0.5 : c / (i - 1), f = t + l * s;
    o.push({
      positionRatio: l,
      label: Tn(e, f, a)
    });
  }
  return o;
}
function Tn(e, t, n) {
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
function vo(e, t, n) {
  if (!Number.isFinite(e) || !Number.isFinite(t))
    return [];
  if (t === e)
    return [
      {
        value: e,
        positionRatio: 0.5
      }
    ];
  const r = t - e, a = Math.max(2, n), i = r / (a - 1), o = Ut(i), s = Math.floor(e / o) * o, c = Math.ceil(t / o) * o, l = [];
  for (let f = s; f <= c + o / 2; f += o) {
    const u = (f - e) / (t - e);
    l.push({
      value: f,
      positionRatio: te(u, 0, 1)
    });
  }
  return l.length > a + 2 ? l.filter((f, u) => u % 2 === 0) : l;
}
function Ut(e) {
  if (!Number.isFinite(e) || e === 0)
    return 1;
  const t = Math.floor(Math.log10(Math.abs(e))), n = Math.abs(e) / 10 ** t;
  let r;
  return n <= 1 ? r = 1 : n <= 2 ? r = 2 : n <= 5 ? r = 5 : r = 10, r * 10 ** t;
}
function So(e) {
  return Array.isArray(e) && e.every((t) => typeof t == "string");
}
function Po(e) {
  return typeof e == "object" && e !== null;
}
function Ao(e) {
  if (!Po(e))
    return !1;
  const t = e;
  return typeof t.portfolioUuid != "string" ? !1 : So(t.securityUuids);
}
function Co(e) {
  return e instanceof CustomEvent ? Ao(e.detail) : !1;
}
const Dt = { min: 0, max: 6 }, ut = { min: 2, max: 4 }, wo = "1Y", Ir = [
  "1M",
  "6M",
  "1Y",
  "5Y",
  "ALL"
], No = {
  "1M": 30,
  "6M": 182,
  "1Y": 365,
  "5Y": 1826,
  ALL: Number.POSITIVE_INFINITY
}, Eo = /* @__PURE__ */ new Set([0, 2]), xo = /* @__PURE__ */ new Set([1, 3]), Fo = "var(--pp-reader-chart-marker-buy, #2e7d32)", ko = "var(--pp-reader-chart-marker-sell, #c0392b)", Ln = "{TICKER}", Do = "https://chatgpt.com/", $t = {
  aggregation: "Aggregationsdaten",
  totals: "Kaufsummen",
  eur_total: "EUR-Kaufsumme"
}, Ee = /* @__PURE__ */ new Map(), tt = /* @__PURE__ */ new Map(), Ke = /* @__PURE__ */ new Map(), xe = /* @__PURE__ */ new Map(), Vr = "pp-reader:portfolio-positions-updated", qe = /* @__PURE__ */ new Map();
function $o(e) {
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
function Ro(e, t) {
  if (e) {
    if (t) {
      Ke.set(e, t);
      return;
    }
    Ke.delete(e);
  }
}
function To(e) {
  if (!e || typeof window > "u")
    return null;
  if (Ke.has(e)) {
    const t = Ke.get(e) || null;
    if (t)
      return t;
  }
  return null;
}
function Ur(e) {
  return Ee.has(e) || Ee.set(e, /* @__PURE__ */ new Map()), Ee.get(e);
}
function zr(e) {
  return xe.has(e) || xe.set(e, /* @__PURE__ */ new Map()), xe.get(e);
}
function qr(e) {
  if (e) {
    if (Ee.has(e)) {
      try {
        const t = Ee.get(e);
        t && t.clear();
      } catch (t) {
        console.warn("invalidateHistoryCache: Konnte Cache nicht leeren", e, t);
      }
      Ee.delete(e);
    }
    if (xe.has(e)) {
      try {
        xe.get(e)?.clear();
      } catch (t) {
        console.warn("invalidateHistoryCache: Konnte Marker-Cache nicht leeren", e, t);
      }
      xe.delete(e);
    }
  }
}
function Or(e) {
  e && Ke.delete(e);
}
function Lo(e, t) {
  if (!e || !t)
    return;
  const n = t.securityUuids;
  (Array.isArray(n) ? n : []).includes(e) && (qr(e), Or(e));
}
function Mo(e) {
  if (!e || qe.has(e))
    return;
  const t = (n) => {
    Co(n) && Lo(e, n.detail);
  };
  try {
    window.addEventListener(Vr, t), qe.set(e, t);
  } catch (n) {
    console.error("ensureLiveUpdateSubscription: Registrierung fehlgeschlagen", n);
  }
}
function Ho(e) {
  if (!e || !qe.has(e))
    return;
  const t = qe.get(e);
  try {
    t && window.removeEventListener(Vr, t);
  } catch (n) {
    console.error("removeLiveUpdateSubscription: Entfernen des Listeners fehlgeschlagen", n);
  }
  qe.delete(e);
}
function Io(e) {
  e && (Ho(e), qr(e), Or(e));
}
function Mn(e, t) {
  if (!tt.has(e)) {
    tt.set(e, { activeRange: t });
    return;
  }
  const n = tt.get(e);
  n && (n.activeRange = t);
}
function Br(e) {
  return tt.get(e)?.activeRange ?? wo;
}
function zt(e) {
  const t = Date.UTC(
    e.getUTCFullYear(),
    e.getUTCMonth(),
    e.getUTCDate()
  );
  return Math.floor(t / 864e5);
}
function De(e) {
  const t = new Date(e.getTime());
  return t.setUTCHours(0, 0, 0, 0), t;
}
function Hn(e) {
  return !(e instanceof Date) || Number.isNaN(e.getTime()) ? null : zt(De(e));
}
function H(e) {
  return ue(e);
}
function Wr(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t || null;
}
function Pe(e) {
  const t = Wr(e);
  return t ? t.toUpperCase() : null;
}
function Vo(e) {
  if (!e)
    return null;
  const t = en(e.aggregation), n = H(t?.purchase_total_security) ?? (t ? H(
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
function jr(e, t = "Unbekannter Fehler") {
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
function dt(e, t) {
  const n = De(t instanceof Date ? t : /* @__PURE__ */ new Date()), r = No[e], a = Hn(n), i = {};
  if (a != null && (i.end_date = a), Number.isFinite(r) && r > 0) {
    const o = new Date(n.getTime());
    o.setUTCDate(o.getUTCDate() - (r - 1));
    const s = Hn(o);
    s != null && (i.start_date = s);
  }
  return i;
}
function sn(e) {
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
      return Number.isNaN(n.getTime()) ? null : De(n);
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
          return De(r);
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
function Uo(e) {
  const t = sn(e);
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
function ft(e) {
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
function qt(e) {
  return Array.isArray(e) ? e.map((t) => {
    let r = H(t.close);
    if (r == null) {
      const i = H(t.close_raw);
      i != null && (r = i / 1e8);
    }
    return r == null ? null : {
      date: sn(t.date) ?? t.date,
      close: r
    };
  }).filter((t) => !!t) : [];
}
function pt(e, t, n = null) {
  if (!Array.isArray(e))
    return [];
  const r = [], a = Pe(t), i = a || "EUR", o = Vo(n);
  return e.forEach((s, c) => {
    const l = typeof s.type == "number" ? s.type : Number(s.type), f = Eo.has(l), u = xo.has(l);
    if (!f && !u)
      return;
    const p = Uo(s.date);
    let d = H(s.price);
    if (!p || d == null)
      return;
    const g = Pe(s.currency_code), m = a ?? g ?? i;
    g && a && g !== a && re(o) && (d *= o);
    const y = H(s.shares), h = H(s.net_price_eur), _ = f ? "Kauf" : "Verkauf", b = y != null ? `${un(y)} @ ` : "", v = `${_} ${b}${de(d)} ${m}`, P = u && h != null ? `${v} (netto ${de(h)} EUR)` : v, C = f ? Fo : ko, w = typeof s.uuid == "string" && s.uuid.trim() || `${_}-${p.getTime().toString()}-${c.toString()}`;
    r.push({
      id: w,
      x: p.getTime(),
      y: d,
      color: C,
      label: P,
      payload: {
        type: _,
        currency: m,
        transactionCurrency: g,
        shares: y,
        price: d,
        netPriceEur: h,
        date: p.toISOString(),
        portfolio: s.portfolio
      }
    });
  }), r;
}
function cn(e) {
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
function zo(e) {
  if (!e)
    return null;
  const n = e.last_price_fetched_at, r = ft(n);
  if (r != null)
    return r;
  const i = e.last_price?.fetched_at;
  return ft(i) ?? null;
}
function Ot(e, t) {
  let n = [];
  Array.isArray(e) && (n = e.map((l) => ({
    ...l
  })));
  const r = n.slice(), a = cn(t);
  if (!T(a))
    return r;
  const i = zo(t) ?? Date.now(), o = new Date(i);
  if (Number.isNaN(o.getTime()))
    return r;
  const s = zt(De(o));
  let c = null;
  for (let l = r.length - 1; l >= 0; l -= 1) {
    const f = r[l], u = sn(f.date);
    if (!u)
      continue;
    const p = zt(De(u));
    if (c == null && (c = p), p === s)
      return f.close !== a && (r[l] = { ...f, close: a }), r;
    if (p < s)
      break;
  }
  return c != null && c > s || r.push({
    date: o,
    close: a
  }), r;
}
function T(e) {
  return typeof e == "number" && Number.isFinite(e);
}
function re(e) {
  return typeof e == "number" && Number.isFinite(e) && e > 0;
}
function Oe(e, t, n) {
  if (!T(e) || !T(t))
    return !1;
  const r = Math.abs(e - t), a = Math.max(Math.abs(e), Math.abs(t), 1);
  return r <= a * 1e-4;
}
function qo(e, t) {
  return !T(t) || t === 0 || !T(e) ? null : Ka((e - t) / t * 100);
}
function Yr(e, t) {
  if (e.length === 0)
    return { priceChange: null, priceChangePct: null };
  const n = e[0], r = H(n.close);
  if (!T(r) || r === 0)
    return { priceChange: null, priceChangePct: null };
  const a = e[e.length - 1], i = H(a.close), o = H(t) ?? i;
  if (!T(o))
    return { priceChange: null, priceChangePct: null };
  const s = o - r, c = Object.is(s, -0) ? 0 : s, l = qo(o, r);
  return { priceChange: c, priceChangePct: l };
}
function ln(e, t) {
  if (!T(e) || e === 0)
    return "neutral";
  const n = 0.5 / Math.pow(10, t);
  return Math.abs(e) < n ? "neutral" : e > 0 ? "positive" : "negative";
}
function Oo(e, t) {
  if (!T(e))
    return '<span class="value neutral">—</span>';
  const n = de(e);
  if (n === "—")
    return '<span class="value neutral">—</span>';
  const r = ln(e, ut.max), a = t ? `&nbsp;${k(t)}` : "";
  return `<span class="value ${r}">${n}${a}</span>`;
}
function Bo(e) {
  return T(e) ? `<span class="value ${ln(e, 2)} value--percentage">${pe(e)}&nbsp;%</span>` : '<span class="value neutral">—</span>';
}
function Kr(e, t, n, r) {
  const a = e, i = a.length > 0 ? a : "Zeitraum";
  return `
    <div class="security-info-bar" data-range="${le(a)}">
      <div class="security-info-item">
        <span class="label">Preisänderung (${k(i)})</span>
        <div class="value-row">
          ${Oo(t, r)}
          ${Bo(n)}
        </div>
      </div>
    </div>
  `;
}
function Wo(e) {
  return `
    <div class="security-range-selector" role="group" aria-label="Zeitraum">
      ${Ir.map((n) => `
      <button
        type="button"
        class="security-range-button${n === e ? " active" : ""}"
        data-range="${le(n)}"
        aria-pressed="${n === e ? "true" : "false"}"
      >
        ${k(n)}
      </button>
    `).join(`
`)}
    </div>
  `;
}
function Gr(e, t = { status: "empty" }) {
  const n = le(e);
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
      const r = jr(
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
function un(e) {
  const t = H(e);
  if (t == null)
    return "—";
  const n = Math.abs(t % 1) > 0, r = n ? 2 : Dt.min, a = n ? Dt.max : Dt.min;
  return t.toLocaleString("de-DE", {
    minimumFractionDigits: r,
    maximumFractionDigits: a
  });
}
function de(e) {
  const t = H(e);
  return t == null ? "—" : t.toLocaleString("de-DE", {
    minimumFractionDigits: ut.min,
    maximumFractionDigits: ut.max
  });
}
function jo(e, t) {
  const n = de(e), r = `&nbsp;${k(t)}`;
  return `<span class="${ln(e, ut.max)}">${n}${r}</span>`;
}
function Yo(e, t) {
  const n = e?.ticker_symbol;
  if (typeof n == "string" && n.trim())
    return n.trim();
  const r = typeof e?.name == "string" ? e.name.trim() : "";
  return r || (typeof t == "string" ? t : "");
}
function Ko(e) {
  return `
    <div class="news-prompt-container">
      <button
        type="button"
        class="news-prompt-button"
        data-symbol="${le(e)}"
      >
        Copy prompt &amp; open ChatGPT
      </button>
    </div>
  `;
}
async function Go(e) {
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
function Xo(e) {
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
function Zo(e, t, n) {
  const r = Re(e?.average_cost), a = r?.account ?? (T(t) ? t : H(t));
  if (!T(a))
    return null;
  const i = e?.account_currency_code ?? e?.account_currency;
  if (typeof i == "string" && i.trim())
    return i.trim().toUpperCase();
  const o = Pe(e?.currency_code) ?? "", s = r?.security ?? r?.native ?? (T(n) ? n : H(n)), c = en(e?.aggregation);
  if (o && T(s) && Oe(a, s))
    return o;
  const l = H(c?.purchase_total_security) ?? H(e?.purchase_total_security), f = H(c?.purchase_total_account) ?? H(e?.purchase_total_account);
  let u = null;
  if (T(l) && l !== 0 && T(f) && (u = f / l), r?.source === "eur_total")
    return "EUR";
  const d = r?.eur;
  if (T(d) && Oe(a, d))
    return "EUR";
  const g = H(e?.purchase_value_eur);
  return T(g) ? "EUR" : u != null && Oe(u, 1) ? o || null : o === "EUR" ? "EUR" : o || "EUR";
}
function In(e) {
  return typeof e != "number" || !Number.isFinite(e) || e <= 0 ? null : e.toLocaleString("de-DE", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
  });
}
function Jo(e) {
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
    const o = t?.[i], s = ft(o);
    if (s != null)
      return s;
  }
  const r = [];
  t && "last_price_fetched_at" in t && r.push(t.last_price_fetched_at);
  const a = e?.last_price;
  a && typeof a == "object" && r.push(a.fetched_at), t && "last_price_date" in t && r.push(t.last_price_date);
  for (const i of r) {
    const o = ft(i);
    if (o != null)
      return o;
  }
  return null;
}
function Qo(e) {
  if (e == null || !Number.isFinite(e))
    return null;
  const t = new Date(e);
  return Number.isNaN(t.getTime()) ? null : t.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}
function es(e, t) {
  if (!e)
    return null;
  const n = Pe(e.currency_code) ?? "", r = Re(e.average_cost);
  if (!r || !n)
    return null;
  const a = r.native ?? r.security ?? null;
  let o = r.account ?? r.eur ?? null, s = Pe(t) ?? "";
  if (re(r.eur) && (!s || s === n) && (o = r.eur, s = "EUR"), !n || !s || n === s || !re(a) || !re(o))
    return null;
  const c = o / a;
  if (!Number.isFinite(c) || c <= 0)
    return null;
  const l = In(c);
  if (!l)
    return null;
  let f = null;
  if (c > 0) {
    const _ = 1 / c;
    Number.isFinite(_) && _ > 0 && (f = In(_));
  }
  const u = Jo(e), p = Qo(u), d = [`FX-Kurs (Kauf): 1 ${n} = ${l} ${s}`];
  f && d.push(`1 ${s} = ${f} ${n}`);
  const g = [], m = r.source, y = m in $t ? $t[m] : $t.aggregation;
  if (g.push(`Quelle: ${y}`), T(r.coverage_ratio)) {
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
function Vn(e) {
  if (!e)
    return null;
  const t = Re(e.average_cost), n = t?.native ?? t?.security ?? null;
  return T(n) ? n : null;
}
function ts(e) {
  if (!e)
    return '<div class="meta-error">Keine Snapshot-Daten verfügbar.</div>';
  const t = e.currency_code || "EUR", n = e.total_holdings_precise ?? e.total_holdings, r = un(n), a = e.last_price_native ?? e.last_price?.native ?? e.last_price_eur, i = de(a), o = i === "—" ? null : `${i}${`&nbsp;${k(t)}`}`, s = H(e.market_value_eur) ?? H(e.current_value_eur) ?? null, c = Re(e.average_cost), l = c?.native ?? c?.security ?? null, f = c?.eur ?? null, p = c?.account ?? null ?? f, d = ye(e.performance), g = d?.day_change ?? null, m = g?.price_change_native ?? null, y = g?.price_change_eur ?? null, h = T(m) ? m : y, _ = T(m) ? t : "EUR", b = (R, V = "") => {
    const B = ["value"];
    return V && B.push(...V.split(" ").filter(Boolean)), `<span class="${B.join(" ")}">${R}</span>`;
  }, v = (R = "") => {
    const V = ["value--missing"];
    return R && V.push(R), b("—", V.join(" "));
  }, P = (R, V = "") => {
    if (!T(R))
      return v(V);
    const B = ["value--gain"];
    return V && B.push(V), b(Ba(R), B.join(" "));
  }, C = (R, V = "") => {
    if (!T(R))
      return v(V);
    const B = ["value--gain-percentage"];
    return V && B.push(V), b(Wa(R), B.join(" "));
  }, w = o ? b(o, "value--price") : v("value--price"), N = r === "—" ? v("value--holdings") : b(r, "value--holdings"), D = T(s) ? b(`${pe(s)}&nbsp;€`, "value--market-value") : v("value--market-value"), I = T(h) ? b(
    jo(h, _),
    "value--gain value--absolute"
  ) : v("value--absolute"), A = C(
    g?.change_pct,
    "value--percentage"
  ), x = P(
    d?.total_change_eur,
    "value--absolute"
  ), z = C(
    d?.total_change_pct,
    "value--percentage"
  ), E = Zo(
    e,
    p,
    l
  ), $ = es(
    e,
    E
  ), K = $ ? ` title="${le($)}"` : "", S = [], F = T(f);
  T(l) ? S.push(
    b(
      `${de(l)}${`&nbsp;${k(t)}`}`,
      "value--average value--average-native"
    )
  ) : S.push(
    v("value--average value--average-native")
  );
  let L = null, Y = null;
  return F && (t !== "EUR" || !T(l) || !Oe(f, l)) ? (L = f, Y = "EUR") : T(p) && E && (E !== t || !Oe(p, l ?? NaN)) && (L = p, Y = E), L != null && T(L) && S.push(
    b(
      `${de(L)}${Y ? `&nbsp;${k(Y)}` : ""}`,
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
        <div class="value-group">${D}</div>
      </div>
    </div>
  `;
}
function ns(e) {
  return `
    <div class="card security-meta-card">
      <div id="headerMeta" class="meta">
        ${ts(e)}
      </div>
    </div>
  `;
}
function Xr(e) {
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
function rs(e, t, {
  currency: n,
  baseline: r,
  markers: a
} = {}) {
  const i = e.clientWidth || e.offsetWidth || 0, o = i > 0 ? i : 640, s = Math.min(Math.max(Math.floor(o * 0.5), 240), 440), c = (n || "").toUpperCase() || "EUR", l = T(r) ? r : null, f = Math.max(48, Math.min(72, Math.round(o * 0.075))), u = Math.max(28, Math.min(56, Math.round(o * 0.05))), p = Math.max(40, Math.min(64, Math.round(s * 0.14)));
  return {
    width: o,
    height: s,
    margin: {
      top: 18,
      right: u,
      bottom: p,
      left: f
    },
    series: t,
    yFormatter: (g) => de(g),
    tooltipRenderer: ({ xFormatted: g, yFormatted: m }) => `
      <div class="chart-tooltip-date">${k(g)}</div>
      <div class="chart-tooltip-value">${k(m)}&nbsp;${k(c)}</div>
    `,
    markerTooltipRenderer: ({
      marker: g,
      xFormatted: m,
      yFormatted: y
    }) => {
      const h = g.payload ?? {}, _ = Wr(h.type), b = H(h.shares), v = b != null ? un(b) : null, P = Pe(h.currency) ?? c, C = [];
      _ && C.push(_), v && C.push(`${v} Stück`), m && C.push(`am ${m}`);
      const w = C.join(" ").trim() || (typeof g.label == "string" ? g.label : m), N = typeof y == "string" && y.trim() ? y.trim() : de(h.price), D = N ? `${N}${P ? `&nbsp;${k(P)}` : ""}` : k(P);
      return `
      <div class="chart-tooltip-date">${k(w)}</div>
      <div class="chart-tooltip-value">${D}</div>
    `;
    },
    baseline: l != null ? {
      value: l
    } : null,
    markers: Array.isArray(a) ? a : []
  };
}
const Un = /* @__PURE__ */ new WeakMap();
function as(e, t, n = {}) {
  if (t.length === 0)
    return;
  const r = rs(e, t, n);
  let a = Un.get(e) ?? null;
  if (!a || !e.contains(a)) {
    e.innerHTML = "", a = _o(e, r), a && Un.set(e, a);
    return;
  }
  Hr(a, r);
}
function zn(e, t) {
  e && (e.dataset.activeRange = t, e.querySelectorAll(".security-range-button").forEach((n) => {
    const r = n.dataset.range, a = r === t;
    n.classList.toggle("active", a), n.setAttribute("aria-pressed", a ? "true" : "false"), n.disabled = !1, n.classList.remove("loading"), r && (n.textContent = r);
  }));
}
function is(e, t, n, r, a) {
  const i = e.querySelector(".security-info-bar");
  if (!i || !i.parentElement)
    return;
  const o = document.createElement("div");
  o.innerHTML = Kr(t, n, r, a).trim();
  const s = o.firstElementChild;
  s && i.parentElement.replaceChild(s, i);
}
function qn(e, t, n, r, a = {}) {
  const i = e.querySelector(".security-detail-placeholder");
  if (i && (i.innerHTML = `
    <h2>Historie</h2>
    ${Gr(t, n)}
  `, n.status === "loaded" && Array.isArray(r) && r.length)) {
    const o = i.querySelector(".history-chart");
    o && requestAnimationFrame(() => {
      as(o, r, a);
    });
  }
}
function os(e) {
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
    const f = Ur(a), u = zr(a), p = Vn(i);
    Array.isArray(s) && c.status !== "error" && f.set(o, s), Mo(a), Mn(a, o), zn(l, o);
    const g = Ot(
      s,
      i
    );
    let m = c;
    m.status !== "error" && (m = g.length ? { status: "loaded" } : { status: "empty" }), qn(
      t,
      o,
      m,
      g,
      {
        currency: i?.currency_code,
        baseline: p,
        markers: u.get(o) ?? []
      }
    );
    const y = async (h) => {
      if (h === Br(a))
        return;
      const _ = l.querySelector(
        `.security-range-button[data-range="${h}"]`
      );
      _ && (_.disabled = !0, _.classList.add("loading"), _.innerHTML = ja());
      let b = f.get(h) ?? null, v = u.get(h) ?? null, P = null, C = [];
      if (b)
        P = b.length ? { status: "loaded" } : { status: "empty" };
      else
        try {
          const x = dt(h), z = await nt(
            n,
            r,
            a,
            x
          );
          b = qt(z.prices), v = pt(
            z.transactions,
            i?.currency_code,
            i
          ), f.set(h, b), v = Array.isArray(v) ? v : [], u.set(h, v), P = b.length ? { status: "loaded" } : { status: "empty" };
        } catch (x) {
          console.error("Range-Wechsel: Historie konnte nicht geladen werden", x), b = [], v = [], P = {
            status: "error",
            message: Xr(x) || "Die historischen Daten konnten aufgrund eines Fehlers nicht geladen werden."
          };
        }
      if (!Array.isArray(v))
        try {
          const x = dt(h), z = await nt(
            n,
            r,
            a,
            x
          );
          v = pt(
            z.transactions,
            i?.currency_code,
            i
          ), v = Array.isArray(v) ? v : [], u.set(h, v);
        } catch (x) {
          console.error("Range-Wechsel: Transaktionsmarker konnten nicht geladen werden", x), v = [];
        }
      C = Ot(b, i), P.status !== "error" && (P = C.length ? { status: "loaded" } : { status: "empty" });
      const w = cn(i), { priceChange: N, priceChangePct: D } = Yr(
        C,
        w
      ), I = Array.isArray(v) ? v : [];
      Mn(a, h), zn(l, h), is(
        t,
        h,
        N,
        D,
        i?.currency_code
      );
      const A = Vn(i);
      qn(
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
      const _ = h.target?.closest(".security-range-button");
      if (!_ || _.disabled)
        return;
      const { range: b } = _.dataset;
      !b || !Ir.includes(b) || y(b);
    });
  }, 0);
}
function ss(e) {
  const { root: t, hass: n, panelConfig: r, tickerSymbol: a } = e;
  let i = null, o = !1;
  const s = async () => {
    try {
      i = await qa(n, r);
    } catch (c) {
      o = !0, console.warn("News-Prompt: Prefetch fehlgeschlagen", c);
    }
  };
  s(), setTimeout(() => {
    const c = t.querySelector(".news-prompt-button");
    if (!c)
      return;
    const l = (u) => {
      const p = (i?.placeholder || Ln).trim() || Ln, d = (i?.prompt_template || "").trim(), g = (i?.link || "").trim() || Do;
      return { body: d ? d.includes(p) ? d.split(p).join(u) : `${d}

Ticker: ${u}` : `Ticker: ${u}`, link: g };
    }, f = async () => {
      const u = (c.dataset.symbol || a || "").trim();
      if (!u) {
        console.warn("News-Prompt: Kein Ticker verfügbar");
        return;
      }
      if (c.classList.contains("loading"))
        return;
      c.disabled = !0, c.classList.add("loading");
      const p = c.textContent;
      try {
        const { body: d, link: g } = l(u), m = await Go(d);
        m ? c.textContent = "✅ Copied! Opening..." : console.warn("News-Prompt: Clipboard unavailable – prompt could not be copied"), m && await new Promise((y) => setTimeout(y, 800)), Xo(g), !i && !o && s();
      } catch (d) {
        console.error("News-Prompt: Kopiervorgang fehlgeschlagen", d);
      } finally {
        c.classList.remove("loading"), c.disabled = !1, p && setTimeout(() => {
          c.textContent = p;
        }, 2e3);
      }
    };
    c.addEventListener("click", () => {
      f();
    });
  }, 0);
}
async function cs(e, t, n, r) {
  if (!r)
    return console.error("renderSecurityDetail: securityUuid fehlt"), '<div class="card"><h2>Fehler</h2><p>Kein Wertpapier angegeben.</p></div>';
  const a = To(r);
  let i = null, o = null;
  try {
    const A = await za(
      t,
      n,
      r
    ), x = A.snapshot;
    i = x && typeof x == "object" ? x : A;
  } catch (A) {
    console.error("renderSecurityDetail: Snapshot konnte nicht geladen werden", A), o = jr(A);
  }
  const s = i || a, c = !!(a && !i), l = (s?.source ?? "") === "cache";
  r && Ro(r, s ?? null);
  const f = s && (c || l) ? $o({ fallbackUsed: c, flaggedAsCache: l }) : "", u = s?.name || "Wertpapierdetails", p = Jt(u, "", { includeMeta: !1 });
  p.classList.add("security-detail-header");
  const d = ns(s);
  if (o)
    return `
      ${p.outerHTML}
      ${d}
      ${f}
      <div class="card error-card">
        <h2>Fehler beim Laden</h2>
        <p>${o}</p>
      </div>
    `;
  const g = Br(r), m = Ur(r), y = zr(r);
  let h = m.has(g) ? m.get(g) ?? null : null, _ = { status: "empty" }, b = y.has(g) ? y.get(g) ?? null : null;
  if (Array.isArray(h))
    _ = h.length ? { status: "loaded" } : { status: "empty" };
  else {
    h = [];
    try {
      const A = dt(g), x = await nt(
        t,
        n,
        r,
        A
      );
      h = qt(x.prices), b = pt(
        x.transactions,
        s?.currency_code,
        s
      ), m.set(g, h), b = Array.isArray(b) ? b : [], y.set(g, b), _ = h.length ? { status: "loaded" } : { status: "empty" };
    } catch (A) {
      console.error(
        "renderSecurityDetail: Historie konnte nicht geladen werden",
        A
      ), _ = {
        status: "error",
        message: Xr(A) || "Die historischen Daten konnten aufgrund eines Fehlers nicht geladen werden."
      };
    }
  }
  if (!Array.isArray(b))
    try {
      const A = dt(g), x = await nt(
        t,
        n,
        r,
        A
      ), z = qt(x.prices);
      b = pt(
        x.transactions,
        s?.currency_code,
        s
      ), m.set(g, z), b = Array.isArray(b) ? b : [], y.set(g, b), h = z, _ = h.length ? { status: "loaded" } : { status: "empty" };
    } catch (A) {
      console.error(
        "renderSecurityDetail: Transaktionsmarker konnten nicht geladen werden",
        A
      ), b = [];
    }
  const v = Ot(
    h,
    s
  );
  _.status !== "error" && (_ = v.length ? { status: "loaded" } : { status: "empty" });
  const P = Yo(s, r), C = Ko(P), w = cn(s), { priceChange: N, priceChangePct: D } = Yr(
    v,
    w
  ), I = Kr(
    g,
    N,
    D,
    s?.currency_code
  );
  return os({
    root: e,
    hass: t,
    panelConfig: n,
    securityUuid: r,
    snapshot: s,
    initialRange: g,
    initialHistory: h,
    initialHistoryState: _
  }), ss({
    root: e,
    hass: t,
    panelConfig: n,
    tickerSymbol: P
  }), `
    ${p.outerHTML}
    ${d}
    ${f}
    ${C}
    ${I}
    ${Wo(g)}
    <div class="card security-detail-placeholder">
      <h2>Historie</h2>
      ${Gr(g, _)}
    </div>
  `;
}
function ls(e) {
  const { setSecurityDetailTabFactory: t } = e;
  if (typeof t != "function") {
    console.error("registerSecurityDetailTab: Ungültige Factory-Funktion übergeben");
    return;
  }
  t((n) => ({
    title: "Wertpapier",
    render: (r, a, i) => cs(r, a, i, n),
    cleanup: () => {
      Io(n);
    }
  }));
}
function ce(e, t = "EUR") {
  return e === null || typeof e > "u" ? "" : new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: t
  }).format(e);
}
function Zr(e) {
  return e === null || typeof e > "u" ? "" : new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(e);
}
function Jr(e) {
  return e === null || typeof e > "u" ? "" : new Intl.NumberFormat("de-DE", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(e);
}
function Qr(e, t) {
  return `<span class="${e > 0 ? "positive" : e < 0 ? "negative" : "neutral"}">${t}</span>`;
}
function us(e) {
  if (e.length === 0)
    return '<div class="no-positions">Keine realisierten Gewinne/Verluste vorhanden.</div>';
  const t = [
    { key: "name", label: "Wertpapier" },
    { key: "ticker_symbol", label: "Symbol" },
    { key: "last_sell_price", label: "Verkaufskurs", align: "right" },
    { key: "current_price", label: "Aktueller Kurs", align: "right" },
    { key: "purchase_value_gross", label: "Einstandswert", align: "right" },
    { key: "sales_value_gross", label: "Verkaufswert", align: "right" },
    { key: "sales_value_net", label: "Nettoerlös", align: "right" },
    { key: "result_pct", label: "Resultat", align: "right" },
    { key: "current_holdings", label: "Bestand", align: "right" }
  ], n = e.map((r) => {
    const a = r.current_price ?? 0, i = r.last_sell_price, o = a - i, s = o > 0 ? "positive" : o < 0 ? "negative" : "neutral";
    let c = k(r.name);
    return r.lots.length > 1 && (c = `
        <span class="expand-icon" data-security-uuid="${r.security_uuid}">
          <ha-icon icon="mdi:chevron-right"></ha-icon>
        </span>
        ${c}
      `), {
      _uuid: r.security_uuid,
      _lots: r.lots,
      name: c,
      ticker_symbol: k(r.ticker_symbol || ""),
      last_sell_price: ce(r.last_sell_price),
      current_price: `<span class="trend--${s}">${ce(r.current_price)}</span>`,
      purchase_value_gross: ce(r.purchase_value_gross),
      sales_value_gross: ce(r.sales_value_gross),
      sales_value_net: ce(r.sales_value_net),
      result_pct: Qr(r.result_pct, Jr(r.result_pct / 100)),
      current_holdings: `${Zr(r.current_holdings)} ${r.current_holdings === 0 ? '<ha-icon icon="mdi:lock-outline" title="Geschlossen"></ha-icon>' : ""}`
    };
  });
  return Se(n, t, [], {
    sortable: !0,
    defaultSort: { key: "name" },
    rowAttributes: (r) => ({
      "data-security-uuid": r._uuid
    })
  });
}
function ds(e, t) {
  const n = new Map(t.map((r) => [r.security_uuid, r]));
  e.querySelectorAll(".expand-icon").forEach((r) => {
    r.addEventListener("click", (a) => {
      a.stopPropagation();
      const o = a.currentTarget.dataset.securityUuid, s = o ? n.get(o) : void 0, c = e.querySelector(`tr[data-security-uuid="${String(o)}"]`);
      if (!c || !s) return;
      const l = c.querySelector(".expand-icon ha-icon");
      if (c.classList.toggle("is-expanded")) {
        l?.setAttribute("icon", "mdi:chevron-down");
        const f = s.lots.map((u) => {
          const p = document.createElement("tr");
          return p.classList.add("child-row"), o && (p.dataset.parentUuid = o), p.innerHTML = `
            <td class="cell--name">
              <span class="child-indicator"></span>
              ${k(u.date)}
            </td>
            <td>${Zr(u.shares)} Stk.</td>
            <td class="cell--right">${ce(u.sell_price)}</td>
            <td></td>
            <td class="cell--right">${ce(u.purchase_value_gross)}</td>
            <td class="cell--right">${ce(u.sales_value_gross)}</td>
            <td class="cell--right">${ce(u.sales_value_net)}</td>
            <td class="cell--right">${Qr(u.result_pct, Jr(u.result_pct / 100))}</td>
            <td></td>
          `, p;
        });
        c.after(...f);
      } else
        l?.setAttribute("icon", "mdi:chevron-right"), e.querySelectorAll(`tr.child-row[data-parent-uuid="${String(o)}"]`).forEach((f) => {
          f.remove();
        });
    });
  });
}
async function fs(e, t, n) {
  const r = Jt("Realisierte Performance", "");
  let a = [];
  try {
    a = await Oa(t, n);
  } catch (s) {
    console.error("Failed to fetch trades", s);
  }
  const i = us(a), o = `
    ${r.outerHTML}
    <div class="card">
      <div class="scroll-container trades-table">
        ${i}
      </div>
    </div>
  `;
  return setTimeout(() => {
    ds(e, a);
  }, 0), o;
}
const ps = Oi, Bt = "pp-reader-sticky-anchor", gt = "overview", gs = "trades", Wt = "security:", hs = [
  { key: gt, title: "Dashboard", render: wr },
  { key: gs, title: "Trades", render: fs }
], $e = /* @__PURE__ */ new Map(), Ge = [], ht = /* @__PURE__ */ new Map();
let jt = null, Rt = !1, Fe = null, O = 0, Tt = null;
function mt(e) {
  return typeof e == "object" && e !== null;
}
function ea(e) {
  return typeof e == "object" && e !== null && typeof e.then == "function";
}
function ms(e) {
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
function _s(e) {
  return e === "accounts" || e === "last_file_update" || e === "portfolio_values" || e === "portfolio_positions";
}
function On(e) {
  const t = e.portfolio_uuid;
  if (typeof t == "string" && t)
    return t;
  const n = e.portfolioUuid;
  return typeof n == "string" && n ? n : null;
}
function ys(e) {
  if (!e)
    return null;
  if (Array.isArray(e)) {
    for (const t of e)
      if (mt(t)) {
        const n = On(t);
        if (n)
          return n;
      }
    return null;
  }
  return mt(e) ? On(e) : null;
}
function bs(e, t) {
  switch (e) {
    case "accounts":
      return {
        type: e,
        data: Array.isArray(t) ? t : null
      };
    case "last_file_update":
      return typeof t == "string" ? { type: e, data: t } : mt(t) ? { type: e, data: t } : { type: e, data: null };
    case "portfolio_values":
      return Array.isArray(t) ? { type: e, data: t } : { type: e, data: null };
    case "portfolio_positions":
      return Array.isArray(t) ? { type: e, data: t } : mt(t) ? { type: e, data: t } : { type: e, data: null };
    default:
      return null;
  }
}
function dn(e) {
  return typeof e != "string" || !e.startsWith(Wt) ? null : e.slice(Wt.length) || null;
}
function vs() {
  if (!Fe)
    return !1;
  const e = ia(Fe);
  return e || (Fe = null), e;
}
function se() {
  const e = Ge.map((t) => $e.get(t)).filter((t) => !!t);
  return [...hs, ...e];
}
function Ss(e) {
  const t = se();
  return e < 0 || e >= t.length ? null : t[e];
}
function ta(e) {
  if (!e)
    return null;
  const t = e, n = t.ppreader ?? t.pp_reader;
  return n || (Object.values(t).find((a) => !a || typeof a != "object" ? !1 : a.webcomponent_name === "pp-reader-panel") ?? null);
}
function na() {
  try {
    const e = St();
    e && typeof e.rememberScrollPosition == "function" && e.rememberScrollPosition();
  } catch (e) {
    console.warn("rememberCurrentPageScroll: konnte Scroll-Position nicht sichern", e);
  }
}
function Bn(e) {
  const t = se();
  return !t.length || e < 0 ? 0 : e >= t.length ? t.length - 1 : e;
}
async function Ps(e, t, n, r) {
  const a = se(), i = Bn(e);
  if (i === O) {
    e > O && vs();
    return;
  }
  na();
  const o = O >= 0 && O < a.length ? a[O] : null, s = o ? dn(o.key) : null;
  let c = i;
  if (s) {
    const l = i >= 0 && i < a.length ? a[i] : null;
    if (l && l.key === gt && Es(s, { suppressRender: !0 })) {
      const p = se().findIndex((d) => d.key === gt);
      c = p >= 0 ? p : 0;
    }
  }
  if (!Rt) {
    Rt = !0;
    try {
      O = Bn(c);
      const l = O;
      await oa(t, n, r), Ns(l);
    } catch (l) {
      console.error("navigateToPage: Fehler beim Rendern des Tabs", l);
    } finally {
      Rt = !1;
    }
  }
}
function _t(e, t, n, r) {
  Ps(O + e, t, n, r);
}
function As(e, t) {
  if (!e || !t || typeof t.render != "function") {
    console.error("registerDetailTab: Ungültiger Tab-Descriptor", e, t);
    return;
  }
  const n = dn(e);
  if (n) {
    const a = ht.get(n);
    a && a !== e && ra(a);
  }
  const r = {
    ...t,
    key: e
  };
  $e.set(e, r), n && ht.set(n, e), Ge.includes(e) || Ge.push(e);
}
function ra(e) {
  if (!e)
    return;
  const t = $e.get(e);
  if (t && typeof t.cleanup == "function")
    try {
      const a = t.cleanup({ key: e });
      ea(a) && a.catch((i) => {
        console.error(
          "unregisterDetailTab: Fehler beim asynchronen cleanup",
          i
        );
      });
    } catch (a) {
      console.error("unregisterDetailTab: Fehler beim Ausführen von cleanup", a);
    }
  $e.delete(e);
  const n = Ge.indexOf(e);
  n >= 0 && Ge.splice(n, 1);
  const r = dn(e);
  r && ht.get(r) === e && ht.delete(r);
}
function Cs(e) {
  return $e.has(e);
}
function Wn(e) {
  return $e.get(e) ?? null;
}
function ws(e) {
  if (e != null && typeof e != "function") {
    console.error("setSecurityDetailTabFactory: Erwartet Funktion oder null", e);
    return;
  }
  jt = e ?? null;
}
function aa(e) {
  return `${Wt}${e}`;
}
function St() {
  for (const t of Fa())
    if (t.isConnected)
      return t;
  const e = /* @__PURE__ */ new Set();
  for (const t of ka())
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
function Yt() {
  const e = St();
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
const Vs = {
  findDashboardElement: St
};
function Ns(e) {
  const t = St();
  if (t && typeof t.handleExternalRender == "function")
    try {
      t.handleExternalRender(e);
    } catch (n) {
      console.warn("notifyExternalRender: Fehler beim Synchronisieren des Dashboards", n);
    }
}
function ia(e) {
  if (!e)
    return console.error("openSecurityDetail: Ungültige securityUuid", e), !1;
  const t = aa(e);
  let n = Wn(t);
  if (!n && typeof jt == "function")
    try {
      const i = jt(e);
      i && typeof i.render == "function" ? (As(t, i), n = Wn(t)) : console.error("openSecurityDetail: Factory lieferte ungültigen Descriptor", i);
    } catch (i) {
      console.error("openSecurityDetail: Fehler beim Erzeugen des Tab-Descriptors", i);
    }
  if (!n)
    return console.warn(`openSecurityDetail: Kein Detail-Tab für ${e} verfügbar`), !1;
  na();
  let a = se().findIndex((i) => i.key === t);
  return a === -1 && (a = se().findIndex((o) => o.key === t), a === -1) ? (console.error("openSecurityDetail: Tab nach Registrierung nicht auffindbar"), !1) : (O = a, Fe = null, Yt(), !0);
}
function Es(e, t = {}) {
  if (!e)
    return console.error("closeSecurityDetail: Ungültige securityUuid", e), !1;
  const { suppressRender: n = !1 } = t, r = aa(e);
  if (!Cs(r))
    return !1;
  const i = se().findIndex((c) => c.key === r), o = i === O;
  ra(r);
  const s = se();
  if (!s.length)
    return O = 0, n || Yt(), !0;
  if (Fe = e, o) {
    const c = s.findIndex((l) => l.key === gt);
    c >= 0 ? O = c : O = Math.min(Math.max(i - 1, 0), s.length - 1);
  } else O >= s.length && (O = Math.max(0, s.length - 1));
  return n || Yt(), !0;
}
async function oa(e, t, n) {
  let r = n;
  r || (r = ta(t ? t.panels : null));
  const a = se();
  O >= a.length && (O = Math.max(0, a.length - 1));
  const i = Ss(O);
  if (!i) {
    console.error("renderTab: Kein gültiger Tab oder keine render-Methode gefunden!");
    return;
  }
  let o;
  try {
    o = await i.render(e, t, r);
  } catch (f) {
    console.error("renderTab: Fehler beim Rendern des Tabs:", f), e.innerHTML = `<div class="card"><h2>Fehler</h2><pre>${ms(f)}</pre></div>`;
    return;
  }
  e.innerHTML = o ?? "", i.render === wr && on(e);
  const c = await new Promise((f) => {
    const u = window.setInterval(() => {
      const p = e.querySelector(".header-card");
      p && (clearInterval(u), f(p));
    }, 50);
  });
  let l = e.querySelector(`#${Bt}`);
  if (!l) {
    l = document.createElement("div"), l.id = Bt;
    const f = c.parentNode;
    f && "insertBefore" in f && f.insertBefore(l, c);
  }
  ks(e, t, n), Fs(e, t, n), xs(e);
}
function xs(e) {
  const t = e.querySelector(".header-card"), n = e.querySelector(`#${Bt}`);
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
function Fs(e, t, n) {
  const r = e.querySelector(".header-card");
  if (!r) {
    console.error("Header-Card nicht gefunden!");
    return;
  }
  ps(
    r,
    () => {
      _t(1, e, t, n);
    },
    () => {
      _t(-1, e, t, n);
    }
  );
}
function ks(e, t, n) {
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
    _t(-1, e, t, n);
  }), i.addEventListener("click", () => {
    _t(1, e, t, n);
  }), Ds(r);
}
function Ds(e) {
  const t = e.querySelector("#nav-left"), n = e.querySelector("#nav-right");
  if (t && (O === 0 ? (t.disabled = !0, t.classList.add("disabled")) : (t.disabled = !1, t.classList.remove("disabled"))), n) {
    const r = se(), i = !(O === r.length - 1) || !!Fe;
    n.disabled = !i, n.classList.toggle("disabled", !i);
  }
}
class $s extends HTMLElement {
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
    this._panel || (this._panel = ta(this._hass.panels ?? null));
    const t = _n(this._hass, this._panel);
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
    const n = _n(this._hass, this._panel);
    if (!n)
      return;
    const r = t.data;
    if (!_s(r.data_type) || r.entry_id && r.entry_id !== n)
      return;
    const a = bs(r.data_type, r.data);
    a && (this._queueUpdate(a.type, a.data), this._doRender(a.type, a.data));
  }
  _doRender(t, n) {
    switch (t) {
      case "accounts":
        Ti(
          n,
          this._root
        );
        break;
      case "last_file_update":
        qi(
          n,
          this._root
        );
        break;
      case "portfolio_values":
        Hi(
          n,
          this._root
        );
        break;
      case "portfolio_positions":
        Ui(
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
    t === "portfolio_positions" && (a.portfolioUuid = ys(
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
    const n = oa(this._root, this._hass, this._panel);
    if (ea(n)) {
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
customElements.get("pp-reader-dashboard") || customElements.define("pp-reader-dashboard", $s);
console.log("PPReader dashboard module v20250914b geladen");
ls({
  setSecurityDetailTabFactory: ws
});
export {
  Vs as __TEST_ONLY_DASHBOARD,
  Is as __TEST_ONLY__,
  Es as closeSecurityDetail,
  an as flushPendingPositions,
  Wn as getDetailTabDescriptor,
  Ui as handlePortfolioPositionsUpdate,
  Cs as hasDetailTab,
  ia as openSecurityDetail,
  Hs as reapplyPositionsSort,
  Rs as registerDashboardElement,
  As as registerDetailTab,
  Ls as registerPanelHost,
  ws as setSecurityDetailTabFactory,
  Ts as unregisterDashboardElement,
  ra as unregisterDetailTab,
  Ms as unregisterPanelHost,
  Cr as updatePortfolioFooterFromDom
};
//# sourceMappingURL=dashboard.5bCXP4HG.js.map
