var ci = Object.defineProperty;
var li = (e, t, n) => t in e ? ci(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : e[t] = n;
var K = (e, t, n) => li(e, typeof t != "symbol" ? t + "" : t, n);
function en(e, t) {
  try {
    t();
  } catch (n) {
    console.warn(`addSwipeEvents: ${e} handler threw`, n);
  }
}
function ui(e, t, n) {
  let r = null;
  const i = (l) => {
    l < -50 ? en("left", t) : l > 50 && en("right", n);
  }, a = (l) => {
    l.touches.length === 1 && (r = l.touches[0].clientX);
  }, o = (l) => {
    if (r === null)
      return;
    if (l.changedTouches.length === 0) {
      r = null;
      return;
    }
    const d = l.changedTouches[0];
    i(d.clientX - r), r = null;
  }, s = (l) => {
    r = l.clientX;
  }, c = (l) => {
    r !== null && (i(l.clientX - r), r = null);
  };
  e.addEventListener("touchstart", a, { passive: !0 }), e.addEventListener("touchend", o, { passive: !0 }), e.addEventListener("mousedown", s), e.addEventListener("mouseup", c);
}
const kt = (e, t) => {
  if (!Number.isFinite(e) || e === 0)
    return "neutral";
  const n = 0.5 / Math.pow(10, t);
  return Math.abs(e) < n ? "neutral" : e > 0 ? "positive" : "negative";
};
function R(e, t, n = void 0, r = void 0) {
  let i = null;
  const a = (c) => {
    if (typeof c == "number")
      return c;
    if (typeof c == "string" && c.trim() !== "") {
      const l = c.replace(/\s+/g, "").replace(/[^0-9,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."), d = Number.parseFloat(l);
      return Number.isNaN(d) ? Number.NaN : d;
    }
    return Number.NaN;
  }, o = (c, l = 2, d = 2) => {
    const u = typeof c == "number" ? c : a(c);
    return Number.isFinite(u) ? u.toLocaleString("de-DE", {
      minimumFractionDigits: l,
      maximumFractionDigits: d
    }) : "";
  }, s = (c = "") => {
    const l = c || "Kein Wert verfügbar";
    return `<span class="missing-value" role="note" aria-label="${l}" title="${l}">—</span>`;
  };
  if (["gain_abs", "gain_pct", "day_change_abs", "day_change_pct"].includes(e)) {
    if (t == null && n) {
      const f = n.performance;
      if (typeof f == "object" && f !== null)
        if (e.startsWith("day_change")) {
          const g = f.day_change;
          if (g && typeof g == "object") {
            const p = e === "day_change_pct" ? g.change_pct : g.value_change_eur ?? g.price_change_eur;
            typeof p == "number" && (t = p);
          }
        } else {
          const g = f[e];
          typeof g == "number" && (t = g);
        }
    }
    const c = (n == null ? void 0 : n.fx_unavailable) === !0 ? "Wechselkurs nicht verfügbar – EUR-Wert unbekannt" : "";
    if (t == null || (r == null ? void 0 : r.hasValue) === !1)
      return s(c);
    const l = typeof t == "number" ? t : a(t);
    if (!Number.isFinite(l))
      return s(c);
    const d = e.endsWith("pct") ? "%" : "€";
    return i = o(l) + `&nbsp;${d}`, `<span class="${kt(l, 2)}">${i}</span>`;
  } else if (e === "position_count") {
    const c = typeof t == "number" ? t : a(t);
    if (!Number.isFinite(c))
      return s();
    i = c.toLocaleString("de-DE");
  } else if (["balance", "current_value", "purchase_value"].includes(e)) {
    const c = typeof t == "number" ? t : a(t);
    if (!Number.isFinite(c))
      return n != null && n.fx_unavailable ? s("Wechselkurs nicht verfügbar – EUR-Wert unbekannt") : (r && r.hasValue === !1, s());
    i = o(c) + "&nbsp;€";
  } else if (e === "current_holdings") {
    const c = typeof t == "number" ? t : a(t);
    if (!Number.isFinite(c))
      return s();
    const l = Math.abs(c % 1) > 0;
    i = c.toLocaleString("de-DE", {
      minimumFractionDigits: l ? 2 : 0,
      maximumFractionDigits: 4
    });
  } else {
    let c = "";
    typeof t == "string" ? c = t : typeof t == "number" && Number.isFinite(t) ? c = t.toString() : typeof t == "boolean" ? c = t ? "true" : "false" : t instanceof Date && Number.isFinite(t.getTime()) && (c = t.toISOString()), i = c, i && (/<|&lt;|&gt;/.test(i) || (i.length > 60 && (i = i.slice(0, 59) + "…"), i.startsWith("Kontostand ") ? i = i.substring(11) : i.startsWith("Depotwert ") && (i = i.substring(10))));
  }
  return typeof i != "string" || i === "" ? s() : i;
}
function ye(e, t, n = [], r = {}) {
  const { sortable: i = !1, defaultSort: a } = r, o = (a == null ? void 0 : a.key) ?? "", s = (a == null ? void 0 : a.dir) === "desc" ? "desc" : "asc", c = (h) => {
    if (h == null)
      return "";
    let m = "";
    if (typeof h == "string")
      m = h;
    else if (typeof h == "number" && Number.isFinite(h))
      m = h.toString();
    else if (typeof h == "boolean")
      m = h ? "true" : "false";
    else if (h instanceof Date && Number.isFinite(h.getTime()))
      m = h.toISOString();
    else
      return "";
    return m.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  };
  let l = "<table><thead><tr>";
  t.forEach((h) => {
    const m = h.align === "right" ? ' class="align-right"' : "";
    i && h.key ? l += `<th${m} data-sort-key="${h.key}">${h.label}</th>` : l += `<th${m}>${h.label}</th>`;
  }), l += "</tr></thead><tbody>", e.forEach((h) => {
    l += "<tr>", t.forEach((m) => {
      const y = m.align === "right" ? ' class="align-right"' : "";
      l += `<td${y}>${R(m.key, h[m.key], h)}</td>`;
    }), l += "</tr>";
  });
  const d = {}, u = {};
  t.forEach((h) => {
    if (n.includes(h.key)) {
      const m = e.reduce(
        (y, S) => {
          let N = S[h.key];
          if ((h.key === "gain_abs" || h.key === "gain_pct") && (typeof N != "number" || !Number.isFinite(N))) {
            const A = S.performance;
            if (typeof A == "object" && A !== null) {
              const P = A[h.key];
              typeof P == "number" && (N = P);
            }
          } else if ((h.key === "day_change_abs" || h.key === "day_change_pct") && (typeof N != "number" || !Number.isFinite(N))) {
            const A = S.performance;
            if (typeof A == "object" && A !== null) {
              const P = A.day_change;
              if (P && typeof P == "object") {
                const $ = h.key === "day_change_pct" ? P.change_pct : P.value_change_eur ?? P.price_change_eur;
                typeof $ == "number" && (N = $);
              }
            }
          }
          if (typeof N == "number" && Number.isFinite(N)) {
            const A = N;
            y.total += A, y.hasValue = !0;
          }
          return y;
        },
        { total: 0, hasValue: !1 }
      );
      m.hasValue ? (d[h.key] = m.total, u[h.key] = { hasValue: !0 }) : (d[h.key] = null, u[h.key] = { hasValue: !1 });
    }
  });
  const f = d.gain_abs ?? null;
  if (f != null) {
    const h = d.purchase_value ?? null;
    if (h != null && h > 0)
      d.gain_pct = f / h * 100;
    else {
      const m = d.current_value ?? null;
      m != null && m !== 0 && (d.gain_pct = f / (m - f) * 100);
    }
  }
  const g = d.day_change_abs ?? null;
  if (g != null) {
    const h = d.current_value ?? null;
    if (h != null) {
      const m = h - g;
      m && (d.day_change_pct = g / m * 100, u.day_change_pct = { hasValue: !0 });
    }
  }
  const p = Number.isFinite(d.gain_pct ?? NaN) ? d.gain_pct : null;
  let b = "", _ = "neutral";
  if (p != null && (b = `${ie(p)} %`, p > 0 ? _ = "positive" : p < 0 && (_ = "negative")), l += '<tr class="footer-row">', t.forEach((h, m) => {
    const y = h.align === "right" ? ' class="align-right"' : "";
    if (m === 0) {
      l += `<td${y}>Summe</td>`;
      return;
    }
    if (d[h.key] != null) {
      let N = "";
      h.key === "gain_abs" && b && (N = ` data-gain-pct="${c(b)}" data-gain-sign="${c(_)}"`), l += `<td${y}${N}>${R(h.key, d[h.key], void 0, u[h.key])}</td>`;
      return;
    }
    if (h.key === "gain_pct" && d.gain_pct != null) {
      l += `<td${y}>${R("gain_pct", d.gain_pct, void 0, u[h.key])}</td>`;
      return;
    }
    const S = u[h.key] ?? { hasValue: !1 };
    l += `<td${y}>${R(h.key, null, void 0, S)}</td>`;
  }), l += "</tr>", l += "</tbody></table>", i)
    try {
      const h = document.createElement("template");
      h.innerHTML = l.trim();
      const m = h.content.querySelector("table");
      if (m)
        return m.classList.add("sortable-table"), o && (m.dataset.defaultSort = o, m.dataset.defaultDir = s), m.outerHTML;
    } catch (h) {
      console.warn("makeTable(sortable): Injection fehlgeschlagen:", h);
    }
  return l;
}
function Pt(e, t) {
  const n = document.createElement("div");
  return n.className = "header-card", n.innerHTML = `
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
    <div id="headerMeta" class="meta">${t}</div>
  `, n;
}
function ie(e, t = 2, n = 2) {
  return (Number.isNaN(e) ? 0 : e).toLocaleString("de-DE", {
    minimumFractionDigits: t,
    maximumFractionDigits: n
  });
}
function di(e) {
  const t = Number.isNaN(e) ? 0 : e;
  return `<span class="${kt(t, 2)}">${ie(t)}&nbsp;€</span>`;
}
function fi(e) {
  const t = Number.isNaN(e) ? 0 : e;
  return `<span class="${kt(t, 2)}">${ie(t)}&nbsp;%</span>`;
}
function Cn(e, t, n = "asc", r = !1) {
  if (!e)
    return [];
  const i = e.querySelector("tbody");
  if (!i)
    return [];
  const a = i.querySelector("tr.footer-row"), o = Array.from(i.querySelectorAll("tr")).filter((d) => d !== a);
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
    const d = Array.from(e.querySelectorAll("thead th"));
    for (let u = 0; u < d.length; u++)
      if (d[u].getAttribute("data-sort-key") === t) {
        s = u;
        break;
      }
  }
  if (s < 0)
    return o;
  const c = (d) => {
    const u = d.replace(/\u00A0/g, " ").replace(/[%€]/g, "").replace(/\./g, "").replace(/,/g, ".").replace(/[^\d.-]/g, "").trim();
    if (!u) return NaN;
    const f = parseFloat(u);
    return Number.isFinite(f) ? f : NaN;
  };
  o.sort((d, u) => {
    const f = d.cells.item(s), g = u.cells.item(s), p = ((f == null ? void 0 : f.textContent) ?? "").trim(), b = ((g == null ? void 0 : g.textContent) ?? "").trim(), _ = c(p), h = c(b);
    let m;
    const y = /[0-9]/.test(p) || /[0-9]/.test(b);
    return !Number.isNaN(_) && !Number.isNaN(h) && y ? m = _ - h : m = p.localeCompare(b, "de", { sensitivity: "base" }), n === "asc" ? m : -m;
  }), o.forEach((d) => i.appendChild(d)), a && i.appendChild(a), e.querySelectorAll("thead th.sort-active").forEach((d) => {
    d.classList.remove("sort-active", "dir-asc", "dir-desc");
  });
  const l = e.querySelector(`thead th[data-sort-key="${t}"]`);
  return l && l.classList.add("sort-active", n === "asc" ? "dir-asc" : "dir-desc"), o;
}
function ae(e) {
  return typeof e == "object" && e !== null;
}
function j(e) {
  return typeof e == "string" ? e : null;
}
function Ve(e) {
  return e === null ? null : j(e);
}
function M(e) {
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
function tn(e) {
  const t = M(e);
  if (t == null)
    return null;
  const n = Math.trunc(t);
  return Number.isFinite(n) ? n : null;
}
function We(e) {
  return ae(e) ? { ...e } : null;
}
function $n(e) {
  return ae(e) ? { ...e } : null;
}
function Rn(e) {
  return typeof e == "boolean" ? e : void 0;
}
function gi(e) {
  if (!ae(e))
    return null;
  const t = j(e.name), n = j(e.currency_code), r = M(e.orig_balance);
  if (!t || !n || r == null)
    return null;
  const i = e.balance === null ? null : M(e.balance), a = {
    uuid: j(e.uuid) ?? void 0,
    name: t,
    currency_code: n,
    orig_balance: r,
    balance: i ?? null
  }, o = M(e.fx_rate);
  o != null && (a.fx_rate = o);
  const s = j(e.fx_rate_source);
  s && (a.fx_rate_source = s);
  const c = j(e.fx_rate_timestamp);
  c && (a.fx_rate_timestamp = c);
  const l = M(e.coverage_ratio);
  l != null && (a.coverage_ratio = l);
  const d = j(e.provenance);
  d && (a.provenance = d);
  const u = Ve(e.metric_run_uuid);
  u !== null && (a.metric_run_uuid = u);
  const f = Rn(e.fx_unavailable);
  return typeof f == "boolean" && (a.fx_unavailable = f), a;
}
function Ln(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = gi(n);
    r && t.push(r);
  }
  return t;
}
function pi(e) {
  if (!ae(e))
    return null;
  const t = e.aggregation, n = j(e.security_uuid), r = j(e.name), i = M(e.current_holdings), a = M(e.purchase_value_eur) ?? (ae(t) ? M(t.purchase_value_eur) ?? M(t.purchase_total_account) ?? M(t.account_currency_total) : null) ?? M(e.purchase_value), o = M(e.current_value);
  if (!n || !r || i == null || a == null || o == null)
    return null;
  const s = {
    portfolio_uuid: j(e.portfolio_uuid) ?? void 0,
    security_uuid: n,
    name: r,
    currency_code: j(e.currency_code),
    current_holdings: i,
    purchase_value: a,
    current_value: o,
    average_cost: We(e.average_cost),
    performance: We(e.performance),
    aggregation: We(e.aggregation),
    data_state: $n(e.data_state)
  }, c = M(e.coverage_ratio);
  c != null && (s.coverage_ratio = c);
  const l = j(e.provenance);
  l && (s.provenance = l);
  const d = Ve(e.metric_run_uuid);
  d !== null && (s.metric_run_uuid = d);
  const u = M(e.last_price_native);
  u != null && (s.last_price_native = u);
  const f = M(e.last_price_eur);
  f != null && (s.last_price_eur = f);
  const g = M(e.last_close_native);
  g != null && (s.last_close_native = g);
  const p = M(e.last_close_eur);
  return p != null && (s.last_close_eur = p), s;
}
function Tn(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = pi(n);
    r && t.push(r);
  }
  return t;
}
function Mn(e) {
  if (!ae(e))
    return null;
  const t = j(e.name), n = M(e.current_value ?? e.value);
  if (!t || n == null)
    return null;
  const i = M(
    e.purchase_sum ?? e.purchase_value_eur ?? e.purchase_value ?? e.purchaseSum
  ) ?? 0, a = {
    uuid: j(e.uuid) ?? void 0,
    name: t,
    current_value: n,
    purchase_value: i,
    purchase_sum: i,
    day_change_abs: M(
      (e == null ? void 0 : e.day_change_abs) ?? (e == null ? void 0 : e.day_change_eur)
    ) ?? void 0,
    day_change_pct: M(e == null ? void 0 : e.day_change_pct) ?? void 0,
    position_count: tn(e.position_count ?? e.count) ?? void 0,
    missing_value_positions: tn(e.missing_value_positions) ?? void 0,
    has_current_value: Rn(e.has_current_value),
    performance: We(e.performance),
    coverage_ratio: M(e.coverage_ratio) ?? void 0,
    provenance: j(e.provenance) ?? void 0,
    metric_run_uuid: Ve(e.metric_run_uuid) ?? void 0,
    data_state: $n(e.data_state)
  };
  return Array.isArray(e.positions) && (a.positions = Tn(e.positions)), a;
}
function kn(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = Mn(n);
    r && t.push(r);
  }
  return t;
}
function Hn(e) {
  if (!ae(e))
    return null;
  const t = { ...e }, n = Ve(e.metric_run_uuid);
  n !== null ? t.metric_run_uuid = n : delete t.metric_run_uuid;
  const r = M(e.coverage_ratio);
  r != null ? t.coverage_ratio = r : delete t.coverage_ratio;
  const i = j(e.provenance);
  i ? t.provenance = i : delete t.provenance;
  const a = j(e.generated_at ?? e.snapshot_generated_at);
  return a ? t.generated_at = a : delete t.generated_at, t;
}
function hi(e) {
  if (!ae(e))
    return null;
  const t = { ...e }, n = Hn(e.normalized_payload);
  return n ? t.normalized_payload = n : "normalized_payload" in t && delete t.normalized_payload, t;
}
function In(e) {
  if (!ae(e))
    return null;
  const t = j(e.generated_at);
  if (!t)
    return null;
  const n = Ve(e.metric_run_uuid), r = Ln(e.accounts), i = kn(e.portfolios), a = hi(e.diagnostics), o = {
    generated_at: t,
    metric_run_uuid: n,
    accounts: r,
    portfolios: i
  };
  return a && (o.diagnostics = a), o;
}
function nn(e) {
  return typeof e == "string" ? e : null;
}
function mi(e) {
  if (typeof e == "string")
    return e;
  if (e === null)
    return null;
}
function _i(e) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
}
function rn(e, t) {
  if (typeof e == "string")
    return e;
  throw new Error(`mapPositionSnapshotToRecord: fehlendes ${t}`);
}
function ut(e, t) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  throw new Error(`mapPositionSnapshotToRecord: fehlendes ${t}`);
}
function bi(e) {
  const t = rn(e.security_uuid, "security_uuid"), n = rn(e.name, "name"), r = ut(e.current_holdings, "current_holdings"), i = ut(e.purchase_value, "purchase_value"), a = ut(e.current_value, "current_value"), o = {
    security_uuid: t,
    name: n,
    current_holdings: r,
    purchase_value: i,
    current_value: a,
    average_cost: e.average_cost ?? null,
    performance: e.performance ?? null,
    aggregation: e.aggregation ?? null
  };
  return e.currency_code !== void 0 && (o.currency_code = e.currency_code), e.coverage_ratio != null && (o.coverage_ratio = e.coverage_ratio), e.provenance && (o.provenance = e.provenance), e.metric_run_uuid !== void 0 && (o.metric_run_uuid = e.metric_run_uuid), e.last_price_native != null && (o.last_price_native = e.last_price_native), e.last_price_eur != null && (o.last_price_eur = e.last_price_eur), e.last_close_native != null && (o.last_close_native = e.last_close_native), e.last_close_eur != null && (o.last_close_eur = e.last_close_eur), e.data_state && (o.data_state = e.data_state), e.portfolio_uuid && (o.portfolio_uuid = e.portfolio_uuid), o;
}
function pe(e, t) {
  var r, i, a, o, s, c, l, d;
  let n = ((r = t == null ? void 0 : t.config) == null ? void 0 : r.entry_id) ?? (t == null ? void 0 : t.entry_id) ?? ((o = (a = (i = t == null ? void 0 : t.config) == null ? void 0 : i._panel_custom) == null ? void 0 : a.config) == null ? void 0 : o.entry_id) ?? void 0;
  if (!n && (e != null && e.panels)) {
    const u = e.panels, f = u.ppreader ?? u.pp_reader ?? Object.values(u).find(
      (g) => (g == null ? void 0 : g.webcomponent_name) === "pp-reader-panel"
    );
    n = ((s = f == null ? void 0 : f.config) == null ? void 0 : s.entry_id) ?? (f == null ? void 0 : f.entry_id) ?? ((d = (l = (c = f == null ? void 0 : f.config) == null ? void 0 : c._panel_custom) == null ? void 0 : l.config) == null ? void 0 : d.entry_id) ?? void 0;
  }
  return n ?? void 0;
}
function an(e, t) {
  return pe(e, t);
}
async function yi(e, t) {
  if (!e)
    throw new Error("fetchAccountsWS: fehlendes hass");
  const n = pe(e, t);
  if (!n)
    throw new Error("fetchAccountsWS: fehlendes entry_id");
  const r = await e.connection.sendMessagePromise({
    type: "pp_reader/get_accounts",
    entry_id: n
  }), i = Ln(r.accounts), a = In(r.normalized_payload);
  return {
    accounts: i,
    normalized_payload: a
  };
}
async function vi(e, t) {
  if (!e)
    throw new Error("fetchLastFileUpdateWS: fehlendes hass");
  const n = pe(e, t);
  if (!n)
    throw new Error("fetchLastFileUpdateWS: fehlendes entry_id");
  const r = await e.connection.sendMessagePromise({
    type: "pp_reader/get_last_file_update",
    entry_id: n
  });
  if (typeof r == "string")
    return r;
  const i = r.last_file_update;
  return typeof i == "string" ? i : "";
}
async function Si(e, t) {
  if (!e)
    throw new Error("fetchPortfoliosWS: fehlendes hass");
  const n = pe(e, t);
  if (!n)
    throw new Error("fetchPortfoliosWS: fehlendes entry_id");
  const r = await e.connection.sendMessagePromise({
    type: "pp_reader/get_portfolio_data",
    entry_id: n
  }), i = kn(r.portfolios), a = In(r.normalized_payload);
  return {
    portfolios: i,
    normalized_payload: a
  };
}
async function Un(e, t, n) {
  if (!e)
    throw new Error("fetchPortfolioPositionsWS: fehlendes hass");
  const r = pe(e, t);
  if (!r)
    throw new Error("fetchPortfolioPositionsWS: fehlendes entry_id");
  if (!n)
    throw new Error("fetchPortfolioPositionsWS: fehlendes portfolio_uuid");
  const i = await e.connection.sendMessagePromise({
    type: "pp_reader/get_portfolio_positions",
    entry_id: r,
    portfolio_uuid: n
  }), o = Tn(i.positions).map(bi), s = Hn(i.normalized_payload), c = {
    portfolio_uuid: nn(i.portfolio_uuid) ?? n,
    positions: o
  };
  typeof i.error == "string" && (c.error = i.error);
  const l = _i(i.coverage_ratio);
  l !== void 0 && (c.coverage_ratio = l);
  const d = nn(i.provenance);
  d && (c.provenance = d);
  const u = mi(i.metric_run_uuid);
  return u !== void 0 && (c.metric_run_uuid = u), s && (c.normalized_payload = s), c;
}
async function Pi(e, t, n) {
  if (!e)
    throw new Error("fetchSecuritySnapshotWS: fehlendes hass");
  const r = pe(e, t);
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
async function Vn(e, t, n, r = {}) {
  if (!e)
    throw new Error("fetchSecurityHistoryWS: fehlendes hass");
  const i = pe(e, t);
  if (!i)
    throw new Error("fetchSecurityHistoryWS: fehlendes entry_id");
  if (!n)
    throw new Error("fetchSecurityHistoryWS: fehlendes securityUuid");
  const a = {
    type: "pp_reader/get_security_history",
    entry_id: i,
    security_uuid: n
  }, { startDate: o, endDate: s, start_date: c, end_date: l } = r || {}, d = o ?? c;
  d != null && (a.start_date = d);
  const u = s ?? l;
  return u != null && (a.end_date = u), e.connection.sendMessagePromise(a);
}
const Ht = /* @__PURE__ */ new Set(), It = /* @__PURE__ */ new Set(), zn = {}, Ai = [
  "renderPositionsTable",
  "applyGainPctMetadata",
  "attachSecurityDetailListener",
  "attachPortfolioPositionsSorting",
  "updatePortfolioFooter"
];
function Ni(e, t) {
  typeof t == "function" && (zn[e] = t);
}
function Qo(e) {
  e && Ht.add(e);
}
function es(e) {
  e && Ht.delete(e);
}
function wi() {
  return Ht;
}
function ts(e) {
  e && It.add(e);
}
function ns(e) {
  e && It.delete(e);
}
function Fi() {
  return It;
}
function xi(e) {
  for (const t of Ai)
    Ni(t, e[t]);
}
function Ut() {
  return zn;
}
const Ei = 2;
function ne(e) {
  var t;
  if (typeof e == "number")
    return Number.isFinite(e) ? e : null;
  if (typeof e == "string") {
    const n = e.trim().replace(/\u00a0/g, "");
    if (!n)
      return null;
    const r = Number(n);
    if (Number.isFinite(r))
      return r;
    const i = n.replace(/[^0-9.,+-]/g, "");
    if (!i)
      return null;
    const a = i.lastIndexOf(","), o = i.lastIndexOf(".");
    let s = i;
    const c = a !== -1, l = o !== -1;
    if (c && (!l || a > o))
      if (l)
        s = s.replace(/\./g, "").replace(",", ".");
      else {
        const f = s.split(","), g = ((t = f[f.length - 1]) == null ? void 0 : t.length) ?? 0, p = f.slice(0, -1).join(""), b = p.replace(/[+-]/g, "").length, _ = f.length > 2, h = /^[-+]?0$/.test(p);
        s = _ || g === 0 || g === 3 && b > 0 && b <= 3 && !h ? s.replace(/,/g, "") : s.replace(",", ".");
      }
    else l && c && o > a ? s = s.replace(/,/g, "") : l && s.length - o - 1 === 3 && /\d{4,}/.test(s.replace(/\./g, "")) && (s = s.replace(/\./g, ""));
    if (s === "-" || s === "+")
      return null;
    const d = Number.parseFloat(s);
    if (Number.isFinite(d))
      return d;
    const u = Number.parseFloat(i.replace(",", "."));
    if (Number.isFinite(u))
      return u;
  }
  return null;
}
function ot(e, { decimals: t = Ei, fallback: n = null } = {}) {
  const r = ne(e);
  if (r == null)
    return n ?? null;
  const i = 10 ** t, a = Math.round(r * i) / i;
  return Object.is(a, -0) ? 0 : a;
}
function on(e, t = {}) {
  return ot(e, t);
}
function Di(e, t = {}) {
  return ot(e, t);
}
const Ci = /^[+-]?(?:\d+\.?\d*|\d*\.?\d+)(?:[eE][+-]?\d+)?$/, Q = (e) => {
  if (typeof e == "number")
    return Number.isFinite(e) ? e : null;
  if (typeof e == "string") {
    const t = e.trim();
    if (!t || !Ci.test(t))
      return null;
    const n = Number(t);
    if (Number.isFinite(n))
      return n;
  }
  return null;
}, qn = (e) => {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t || null;
};
function $i(e) {
  const t = e && typeof e == "object" ? e : null;
  if (!t)
    return null;
  const n = Q(t.price_change_native), r = Q(t.price_change_eur), i = Q(t.change_pct), a = Q(t.value_change_eur);
  if (n == null && r == null && i == null && a == null)
    return null;
  const o = qn(t.source) ?? "derived", s = Q(t.coverage_ratio) ?? null;
  return {
    price_change_native: n,
    price_change_eur: r,
    change_pct: i,
    value_change_eur: a ?? null,
    source: o,
    coverage_ratio: s
  };
}
function ue(e) {
  const t = e && typeof e == "object" ? e : null;
  if (!t)
    return null;
  const n = Q(t.gain_abs), r = Q(t.gain_pct), i = Q(t.total_change_eur), a = Q(t.total_change_pct);
  if (n == null || r == null || i == null || a == null)
    return null;
  const o = qn(t.source) ?? "derived", s = Q(t.coverage_ratio) ?? null, c = $i(t.day_change);
  return {
    gain_abs: n,
    gain_pct: r,
    total_change_eur: i,
    total_change_pct: a,
    source: o,
    coverage_ratio: s,
    day_change: c
  };
}
const ce = /* @__PURE__ */ new Map();
function se(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t.length > 0 ? t : null;
}
function k(e) {
  if (e === null)
    return null;
  const t = ne(e);
  return Number.isFinite(t ?? NaN) ? t : null;
}
function Ri(e) {
  if (!e || typeof e != "object")
    return !1;
  const t = e;
  return typeof t.security_uuid == "string" && typeof t.name == "string" && typeof t.current_holdings == "number" && typeof t.purchase_value == "number" && typeof t.current_value == "number";
}
function ze(e) {
  const t = { ...e };
  return e.average_cost && typeof e.average_cost == "object" && (t.average_cost = { ...e.average_cost }), e.performance && typeof e.performance == "object" && (t.performance = { ...e.performance }), e.aggregation && typeof e.aggregation == "object" && (t.aggregation = { ...e.aggregation }), e.data_state && typeof e.data_state == "object" && (t.data_state = { ...e.data_state }), t;
}
function Li(e, t) {
  const n = e ? ze(e) : {};
  [
    "portfolio_uuid",
    "security_uuid",
    "name",
    "currency_code",
    "current_holdings",
    "purchase_value",
    "current_value",
    "coverage_ratio",
    "provenance",
    "metric_run_uuid",
    "fx_unavailable"
  ].forEach((a) => {
    t[a] !== void 0 && (n[a] = t[a]);
  });
  const i = (a) => {
    const o = t[a];
    if (o && typeof o == "object") {
      const s = e && e[a] && typeof e[a] == "object" ? e[a] : {};
      n[a] = { ...s, ...o };
    } else o !== void 0 && (n[a] = o);
  };
  return i("performance"), i("aggregation"), i("average_cost"), i("data_state"), n;
}
function Vt(e, t) {
  if (!e)
    return;
  if (!Array.isArray(t)) {
    ce.delete(e);
    return;
  }
  if (t.length === 0) {
    ce.set(e, []);
    return;
  }
  const n = ce.get(e) ?? [], r = new Map(
    n.filter((a) => a.security_uuid).map((a) => [a.security_uuid, a])
  ), i = t.filter((a) => !!a).map((a) => {
    const o = a.security_uuid ?? "", s = o ? r.get(o) : void 0;
    return Li(s, a);
  }).map(ze);
  ce.set(e, i);
}
function zt(e) {
  return e ? ce.has(e) : !1;
}
function On(e) {
  if (!e)
    return [];
  const t = ce.get(e);
  return t ? t.map(ze) : [];
}
function Ti() {
  ce.clear();
}
function Mi() {
  return new Map(
    Array.from(ce.entries(), ([e, t]) => [
      e,
      t.map(ze)
    ])
  );
}
function qe(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e, n = k(t.native), r = k(t.security), i = k(t.account), a = k(t.eur), o = k(t.coverage_ratio);
  if (n == null && r == null && i == null && a == null && o == null)
    return null;
  const s = se(t.source);
  return {
    native: n,
    security: r,
    account: i,
    eur: a,
    source: s === "totals" || s === "eur_total" ? s : "aggregation",
    coverage_ratio: o
  };
}
function Bn(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e, n = k(t.total_holdings), r = k(t.positive_holdings), i = k(t.purchase_value_eur), a = k(t.purchase_total_security) ?? k(t.security_currency_total), o = k(t.purchase_total_account) ?? k(t.account_currency_total);
  let s = 0;
  if (typeof t.purchase_value_cents == "number")
    s = Number.isFinite(t.purchase_value_cents) ? Math.trunc(t.purchase_value_cents) : 0;
  else if (typeof t.purchase_value_cents == "string") {
    const l = Number.parseInt(t.purchase_value_cents, 10);
    Number.isFinite(l) && (s = l);
  }
  return n != null || r != null || i != null || a != null || o != null || s !== 0 ? {
    total_holdings: n ?? 0,
    positive_holdings: r ?? 0,
    purchase_value_cents: s,
    purchase_value_eur: i ?? 0,
    security_currency_total: a ?? 0,
    account_currency_total: o ?? 0,
    purchase_total_security: a ?? 0,
    purchase_total_account: o ?? 0
  } : null;
}
function ki(e) {
  if (!e || typeof e != "object")
    return null;
  const t = Ri(e) ? ze(e) : e, n = se(t.security_uuid), r = se(t.name), i = ne(t.current_holdings), a = on(t.current_value), o = Bn(t.aggregation), s = t.aggregation && typeof t.aggregation == "object" ? t.aggregation : null, c = k(t.purchase_value_eur) ?? k(s == null ? void 0 : s.purchase_value_eur) ?? k(s == null ? void 0 : s.purchase_total_account) ?? k(s == null ? void 0 : s.account_currency_total) ?? on(t.purchase_value);
  if (!n || !r || i == null || c == null || a == null)
    return null;
  const l = {
    security_uuid: n,
    name: r,
    portfolio_uuid: se(t.portfolio_uuid) ?? se(t.portfolioUuid) ?? void 0,
    currency_code: se(t.currency_code),
    current_holdings: i,
    purchase_value: c,
    current_value: a
  }, d = qe(t.average_cost);
  d && (l.average_cost = d), o && (l.aggregation = o);
  const u = ue(t.performance);
  if (u)
    l.performance = u, l.gain_abs = typeof u.gain_abs == "number" ? u.gain_abs : null, l.gain_pct = typeof u.gain_pct == "number" ? u.gain_pct : null;
  else {
    const y = k(t.gain_abs), S = k(t.gain_pct);
    y !== null && (l.gain_abs = y), S !== null && (l.gain_pct = S);
  }
  "coverage_ratio" in t && (l.coverage_ratio = k(t.coverage_ratio));
  const f = se(t.provenance);
  f && (l.provenance = f);
  const g = se(t.metric_run_uuid);
  (g || t.metric_run_uuid === null) && (l.metric_run_uuid = g ?? null);
  const p = k(t.last_price_native);
  p !== null && (l.last_price_native = p);
  const b = k(t.last_price_eur);
  b !== null && (l.last_price_eur = b);
  const _ = k(t.last_close_native);
  _ !== null && (l.last_close_native = _);
  const h = k(t.last_close_eur);
  h !== null && (l.last_close_eur = h);
  const m = t.data_state && typeof t.data_state == "object" ? { ...t.data_state } : void 0;
  return m && (l.data_state = m), l;
}
function st(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = ki(n);
    r && t.push(r);
  }
  return t;
}
let Wn = [];
const le = /* @__PURE__ */ new Map();
function je(e) {
  return typeof e == "string" && e.length > 0 ? e : void 0;
}
function Hi(e) {
  return e === null ? null : je(e);
}
function Ii(e) {
  return typeof e == "number" && Number.isFinite(e) ? e : void 0;
}
function de(e) {
  return e === null ? null : Ii(e);
}
function sn(e) {
  if (!(typeof e != "number" || !Number.isFinite(e)))
    return Math.trunc(e);
}
function ee(e) {
  if (!(!e || typeof e != "object"))
    return { ...e };
}
function Le(e) {
  const t = { ...e };
  return t.average_cost = ee(e.average_cost), t.performance = ee(e.performance), t.aggregation = ee(e.aggregation), t.data_state = ee(e.data_state), t;
}
function qt(e) {
  const t = { ...e };
  return t.performance = ee(e.performance), t.data_state = ee(e.data_state), Array.isArray(e.positions) && (t.positions = e.positions.map(Le)), t;
}
function jn(e) {
  if (!e || typeof e != "object")
    return null;
  const t = je(e.uuid);
  if (!t)
    return null;
  const n = { uuid: t }, r = je(e.name);
  r && (n.name = r);
  const i = de(e.current_value);
  i !== void 0 && (n.current_value = i);
  const a = de(e.purchase_sum) ?? de(e.purchase_value_eur) ?? de(e.purchase_value);
  a !== void 0 && (n.purchase_value = a, n.purchase_sum = a);
  const o = de(e.day_change_abs);
  o !== void 0 && (n.day_change_abs = o);
  const s = de(e.day_change_pct);
  s !== void 0 && (n.day_change_pct = s);
  const c = sn(e.position_count);
  c !== void 0 && (n.position_count = c);
  const l = sn(e.missing_value_positions);
  l !== void 0 && (n.missing_value_positions = l), typeof e.has_current_value == "boolean" && (n.has_current_value = e.has_current_value);
  const d = de(e.coverage_ratio);
  d !== void 0 && (n.coverage_ratio = d);
  const u = je(e.provenance);
  u && (n.provenance = u), "metric_run_uuid" in e && (n.metric_run_uuid = Hi(e.metric_run_uuid));
  const f = ee(e.performance);
  f && (n.performance = f);
  const g = ee(e.data_state);
  if (g && (n.data_state = g), Array.isArray(e.positions)) {
    const p = e.positions.filter(
      (b) => !!b
    );
    p.length && (n.positions = p.map(Le));
  }
  return n;
}
function Ui(e, t) {
  const n = {
    ...e,
    ...t
  };
  return !t.performance && e.performance && (n.performance = ee(e.performance)), !t.data_state && e.data_state && (n.data_state = ee(e.data_state)), !t.positions && e.positions && (n.positions = e.positions.map(Le)), n;
}
function Gn(e) {
  Wn = (e ?? []).map((n) => ({ ...n }));
}
function Vi() {
  return Wn.map((e) => ({ ...e }));
}
function zi(e) {
  le.clear();
  const t = e ?? [];
  for (const n of t) {
    const r = jn(n);
    r && le.set(r.uuid, qt(r));
  }
}
function qi(e) {
  const t = e ?? [];
  for (const n of t) {
    const r = jn(n);
    if (!r)
      continue;
    const i = le.get(r.uuid), a = i ? Ui(i, r) : qt(r);
    le.set(a.uuid, a);
  }
}
function Ot(e, t) {
  if (!e)
    return;
  const n = le.get(e);
  if (!n)
    return;
  if (!Array.isArray(t) || t.length === 0) {
    const c = { ...n };
    delete c.positions, le.set(e, c);
    return;
  }
  const r = (c, l) => {
    const d = c ? Le(c) : {};
    [
      "portfolio_uuid",
      "security_uuid",
      "name",
      "currency_code",
      "current_holdings",
      "purchase_value",
      "current_value",
      "coverage_ratio",
      "provenance",
      "metric_run_uuid"
    ].forEach((g) => {
      l[g] !== void 0 && (d[g] = l[g]);
    });
    const f = (g) => {
      const p = l[g];
      if (p && typeof p == "object") {
        const b = c && c[g] && typeof c[g] == "object" ? c[g] : {};
        d[g] = { ...b, ...p };
      } else p !== void 0 && (d[g] = p);
    };
    return f("performance"), f("aggregation"), f("average_cost"), f("data_state"), d;
  }, i = Array.isArray(n.positions) ? n.positions : [], a = new Map(
    i.filter((c) => c.security_uuid).map((c) => [c.security_uuid, c])
  ), o = t.filter((c) => !!c).map((c) => {
    const l = c.security_uuid ? a.get(c.security_uuid) : void 0;
    return r(l, c);
  }).map(Le), s = {
    ...n,
    positions: o
  };
  le.set(e, s);
}
function Oi() {
  return Array.from(le.values(), (e) => qt(e));
}
function Kn() {
  return {
    accounts: Vi(),
    portfolios: Oi()
  };
}
const Bi = "unknown-account";
function Y(e) {
  return typeof e != "number" || !Number.isFinite(e) ? null : e;
}
function cn(e) {
  const t = Y(e);
  return t == null ? 0 : Math.trunc(t);
}
function Z(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t.length > 0 ? t : null;
}
function Yn(e, t) {
  return Z(e) ?? t;
}
function Bt(e) {
  return e == null || !Number.isFinite(e) ? null : e < 0 ? 0 : e > 1 ? 1 : e;
}
function Wi(e) {
  const t = Math.abs(e % 1) > 0.01;
  return e.toLocaleString("de-DE", {
    minimumFractionDigits: t ? 1 : 0,
    maximumFractionDigits: 1
  });
}
function Xn(e, t) {
  const n = Bt(e);
  if (n == null)
    return null;
  const r = Math.round(n * 1e3) / 10;
  let i = "info";
  n < 0.5 ? i = "danger" : n < 0.9 && (i = "warning");
  const a = t === "account" ? "FX-Abdeckung" : "Abdeckung", o = t === "account" ? "Anteil der verfügbaren FX-Daten für diese Kontoumrechnung." : "Anteil der verfügbaren Kennzahlen für dieses Depot.";
  return {
    key: `${t}-coverage`,
    label: `${a} ${Wi(r)}%`,
    tone: i,
    description: o
  };
}
function Zn(e) {
  return e.split(/[\s_-]+/).filter(Boolean).map(
    (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
  ).join(" ");
}
function Jn(e) {
  const t = ji(e);
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
function ji(e) {
  const t = Z(e);
  if (!t)
    return null;
  const n = Gi(t);
  return n || Zn(t);
}
function Gi(e) {
  const t = e.trim();
  if (!t.startsWith("{") && !t.startsWith("["))
    return null;
  try {
    const n = JSON.parse(t), r = Ki(n), i = n && typeof n == "object" ? Z(
      n.provider ?? n.source
    ) : null;
    if (r.length && i)
      return `${Zn(i)} (${r.join(", ")})`;
    if (r.length)
      return `FX (${r.join(", ")})`;
  } catch {
    return null;
  }
  return null;
}
function Ki(e) {
  const t = (r) => {
    if (typeof r != "string")
      return null;
    const i = r.trim();
    return i ? i.toUpperCase() : null;
  }, n = (r) => r.map(t).filter((i) => !!i);
  if (Array.isArray(e))
    return n(e);
  if (e && typeof e == "object") {
    const r = e.currencies;
    if (Array.isArray(r))
      return n(r);
  }
  return [];
}
function Yi(e) {
  if (!e)
    return null;
  const t = Z(e.uuid) ?? `${Bi}-${e.name ?? "0"}`, n = Yn(e.name, "Unbenanntes Konto"), r = Z(e.currency_code), i = Y(e.balance), a = Y(e.orig_balance), o = "coverage_ratio" in e ? Bt(Y(e.coverage_ratio)) : null, s = Z(e.provenance), c = Z(e.metric_run_uuid), l = e.fx_unavailable === !0, d = Y(e.fx_rate), u = Z(e.fx_rate_source), f = Z(e.fx_rate_timestamp), g = [], p = Xn(o, "account");
  p && g.push(p);
  const b = Jn(s);
  b && g.push(b);
  const _ = {
    uuid: t,
    name: n,
    currency_code: r,
    balance: i,
    orig_balance: a,
    fx_unavailable: l,
    coverage_ratio: o,
    provenance: s,
    metric_run_uuid: null,
    fx_rate: d,
    fx_rate_source: u,
    fx_rate_timestamp: f,
    badges: g
  }, h = typeof c == "string" ? c : null;
  return _.metric_run_uuid = h, _;
}
function Xi(e) {
  if (!e)
    return null;
  const t = Z(e.uuid);
  if (!t)
    return null;
  const n = Yn(e.name, "Unbenanntes Depot"), r = cn(e.position_count), i = cn(e.missing_value_positions), a = Y(e.current_value), o = Y(e.purchase_sum) ?? Y(e == null ? void 0 : e.purchase_value_eur) ?? Y(e.purchase_value) ?? 0, s = Y(e.day_change_abs) ?? null, c = Y(e.day_change_pct) ?? null, l = ue(e.performance), d = (l == null ? void 0 : l.gain_abs) ?? null, u = (l == null ? void 0 : l.gain_pct) ?? null, f = (l == null ? void 0 : l.day_change) ?? null;
  let g = s ?? ((f == null ? void 0 : f.value_change_eur) != null ? Y(f.value_change_eur) : null), p = c ?? ((f == null ? void 0 : f.change_pct) != null ? Y(f.change_pct) : null);
  if (g == null && p != null && a != null) {
    const E = a / (1 + p / 100);
    E && (g = a - E);
  }
  if (p == null && g != null && a != null) {
    const E = a - g;
    E && (p = g / E * 100);
  }
  const b = a != null, _ = e.has_current_value === !1 || !b, h = "coverage_ratio" in e ? Bt(Y(e.coverage_ratio)) : null, m = Z(e.provenance), y = Z(e.metric_run_uuid), S = [], N = Xn(h, "portfolio");
  N && S.push(N);
  const A = Jn(m);
  A && S.push(A);
  const P = {
    uuid: t,
    name: n,
    position_count: r,
    current_value: a,
    purchase_sum: o,
    day_change_abs: g ?? null,
    day_change_pct: p ?? null,
    gain_abs: d,
    gain_pct: u,
    hasValue: b,
    fx_unavailable: _ || i > 0,
    missing_value_positions: i,
    performance: l,
    coverage_ratio: h,
    provenance: m,
    metric_run_uuid: null,
    badges: S
  }, $ = typeof y == "string" ? y : null;
  return P.metric_run_uuid = $, P;
}
function Qn() {
  const { accounts: e } = Kn();
  return e.map(Yi).filter((t) => !!t);
}
function Zi() {
  const { portfolios: e } = Kn();
  return e.map(Xi).filter((t) => !!t);
}
function Te(e) {
  return e ? e.replace(/[&<>"']/g, (t) => {
    switch (t) {
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
        return t;
    }
  }) : "";
}
function er(e, t = {}) {
  if (!e || e.length === 0)
    return "";
  const n = ["meta-badges", t.containerClass].filter(Boolean).join(" "), r = e.map((i) => {
    const a = `meta-badge--${i.tone}`, o = i.description ? ` title="${Te(i.description)}"` : "";
    return `<span class="meta-badge ${a}"${o}>${Te(
      i.label
    )}</span>`;
  }).join("");
  return `<span class="${n}">${r}</span>`;
}
function Ye(e, t, n = {}) {
  const r = er(t, n);
  if (!r)
    return Te(e);
  const i = n.labelClass ?? "name-with-badges__label";
  return `<span class="${["name-with-badges", n.containerClass].filter(Boolean).join(" ")}"><span class="${i}">${Te(
    e
  )}</span>${r}</span>`;
}
function tr(e, t, n, r) {
  e[t] = {
    previous: n,
    current: r
  };
}
const re = /* @__PURE__ */ new Map(), Ge = /* @__PURE__ */ new Map();
function Ji(e) {
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
function Pe(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t.length > 0 ? t : null;
}
function Qi(e) {
  return typeof e == "number" && Number.isFinite(e) ? e : void 0;
}
function ea(e) {
  return e === null ? null : Qi(e);
}
function ta(e) {
  return e === null ? null : Pe(e);
}
function ln(e) {
  return ue(e.performance);
}
const na = 500, ra = 10, ia = "pp-reader:portfolio-positions-updated", aa = "pp-reader:diagnostics", dt = /* @__PURE__ */ new Map(), nr = [
  "coverage_ratio",
  "provenance",
  "metric_run_uuid",
  "generated_at"
], At = /* @__PURE__ */ new Map();
function oa(e, t) {
  return `${e}:${t}`;
}
function sa(e) {
  if (e === void 0)
    return;
  if (e === null)
    return null;
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  const t = ea(e);
  if (t === null)
    return null;
  if (typeof t == "number" && Number.isFinite(t))
    return t;
}
function ft(e) {
  if (e !== void 0)
    return ta(e);
}
function Wt(e, t, n, r) {
  const i = {}, a = sa(e);
  a !== void 0 && (i.coverage_ratio = a);
  const o = ft(t);
  o !== void 0 && (i.provenance = o);
  const s = ft(n);
  s !== void 0 && (i.metric_run_uuid = s);
  const c = ft(r);
  return c !== void 0 && (i.generated_at = c), Object.keys(i).length > 0 ? i : null;
}
function ca(e, t) {
  const n = {};
  let r = !1;
  for (const i of nr) {
    const a = e == null ? void 0 : e[i], o = t[i];
    a !== o && (tr(n, i, a, o), r = !0);
  }
  return r ? n : null;
}
function la(e) {
  const t = {};
  let n = !1;
  for (const r of nr) {
    const i = e[r];
    i !== void 0 && (tr(t, r, i, void 0), n = !0);
  }
  return n ? t : null;
}
function un(e) {
  if (Object.keys(e.changed).length) {
    try {
      console.debug("pp-reader:diagnostics", e);
    } catch {
    }
    if (!(typeof window > "u" || typeof window.dispatchEvent != "function"))
      try {
        window.dispatchEvent(new CustomEvent(aa, { detail: e }));
      } catch (t) {
        console.warn("updateConfigsWS: Diagnostics-Event konnte nicht gesendet werden", t);
      }
  }
}
function jt(e, t, n, r) {
  const i = oa(e, n), a = dt.get(i);
  if (!r) {
    if (!a)
      return;
    dt.delete(i);
    const s = la(a);
    if (!s)
      return;
    un({
      kind: e,
      uuid: n,
      source: t,
      changed: s,
      snapshot: {},
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    return;
  }
  const o = ca(a, r);
  o && (dt.set(i, { ...r }), un({
    kind: e,
    uuid: n,
    source: t,
    changed: o,
    snapshot: { ...r },
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  }));
}
function ua(e) {
  if (!(!e || e.length === 0))
    for (const t of e) {
      const n = Pe(t.uuid);
      if (!n)
        continue;
      const r = Wt(
        t.coverage_ratio,
        t.provenance,
        t.metric_run_uuid,
        void 0
      );
      jt("account", "accounts", n, r);
    }
}
function da(e) {
  if (!(!e || e.length === 0))
    for (const t of e) {
      const n = Pe(t.uuid);
      if (!n)
        continue;
      const r = Wt(
        t.coverage_ratio,
        t.provenance,
        t.metric_run_uuid,
        void 0
      );
      jt("portfolio", "portfolio_values", n, r);
    }
}
function fa(e, t) {
  var r, i, a, o;
  if (!t)
    return;
  const n = Wt(
    t.coverage_ratio ?? ((r = t.normalized_payload) == null ? void 0 : r.coverage_ratio),
    t.provenance ?? ((i = t.normalized_payload) == null ? void 0 : i.provenance),
    t.metric_run_uuid ?? ((a = t.normalized_payload) == null ? void 0 : a.metric_run_uuid),
    (o = t.normalized_payload) == null ? void 0 : o.generated_at
  );
  jt("portfolio_positions", "portfolio_positions", e, n);
}
function ga(e, t) {
  return `<div class="error">${Ji(e)} <button class="retry-pos" data-portfolio="${t}">Erneut laden</button></div>`;
}
function pa(e, t, n) {
  const r = e.querySelector("table.sortable-positions");
  if (!r) return;
  const i = e.dataset.sortKey || r.dataset.defaultSort || "name", o = (e.dataset.sortDir || r.dataset.defaultDir || "asc") === "desc" ? "desc" : "asc";
  e.dataset.sortKey = i, e.dataset.sortDir = o;
  try {
    Cn(r, i, o, !0);
  } catch (l) {
    console.warn("restoreSortAndInit: sortTableRows Fehler:", l);
  }
  const { attachPortfolioPositionsSorting: s, attachSecurityDetailListener: c } = Ut();
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
function rr(e, t, n, r) {
  if (!e || !t)
    return { applied: !1, reason: "invalid" };
  const i = e.querySelector(
    `.portfolio-table .portfolio-details[data-portfolio="${t}"]`
  );
  if (!i)
    return { applied: !1, reason: "missing" };
  const a = i.querySelector(".positions-container");
  if (!a)
    return { applied: !1, reason: "missing" };
  if (i.classList.contains("hidden"))
    return { applied: !1, reason: "hidden" };
  if (r)
    return a.innerHTML = ga(r, t), { applied: !0 };
  const o = a.dataset.sortKey, s = a.dataset.sortDir;
  return a.innerHTML = Aa(n), o && (a.dataset.sortKey = o), s && (a.dataset.sortDir = s), pa(a, e, t), { applied: !0 };
}
function Gt(e, t) {
  const n = re.get(t);
  if (!n) return !1;
  const r = rr(
    e,
    t,
    n.positions,
    n.error
  );
  return r.applied && re.delete(t), r.applied;
}
function ha(e) {
  let t = !1;
  for (const [n] of re)
    Gt(e, n) && (t = !0);
  return t;
}
function ir(e, t) {
  const n = Ge.get(t) ?? {
    attempts: 0,
    timer: null
  };
  n.timer || (n.timer = setTimeout(() => {
    n.timer = null, n.attempts += 1;
    const r = Gt(e, t);
    r || n.attempts >= ra ? (Ge.delete(t), r || re.delete(t)) : ir(e, t);
  }, na), Ge.set(t, n));
}
function ma(e, t) {
  console.log("updateConfigsWS: Kontodaten-Update erhalten:", e);
  const n = Array.isArray(e) ? e : [];
  if (Gn(n), ua(n), !t)
    return;
  const r = Qn();
  _a(r, t);
  const i = t.querySelector(".portfolio-table table"), a = i ? Array.from(
    i.querySelectorAll("tbody tr:not(.footer-row)")
  ).map((o) => {
    const s = o.cells.item(2), c = (s == null ? void 0 : s.textContent) ?? "", l = parseFloat(
      c.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "")
    );
    return {
      current_value: Number.isFinite(l) ? l : 0
    };
  }) : [];
  ar(r, a, t);
}
function _a(e, t) {
  const n = t.querySelector(".account-table"), r = t.querySelector(".fx-account-table"), i = e.filter((o) => (o.currency_code || "EUR") === "EUR"), a = e.filter((o) => (o.currency_code || "EUR") !== "EUR");
  if (n) {
    const o = i.map((s) => ({
      name: Ye(s.name, s.badges, {
        containerClass: "account-name",
        labelClass: "account-name__label"
      }),
      balance: s.balance ?? null
    }));
    n.innerHTML = ye(
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
    const o = a.map((s) => {
      const c = s.orig_balance, l = typeof c == "number" && Number.isFinite(c), d = Pe(s.currency_code), u = l ? c.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) : null, f = u ? d ? `${u} ${d}` : u : "";
      return {
        name: Ye(s.name, s.badges, {
          containerClass: "account-name",
          labelClass: "account-name__label"
        }),
        fx_display: f,
        balance: s.balance ?? null
      };
    });
    r.innerHTML = ye(
      o,
      [
        { key: "name", label: "Name" },
        { key: "fx_display", label: "Betrag (FX)" },
        { key: "balance", label: "EUR", align: "right" }
      ],
      ["balance"]
    );
  } else a.length && console.warn("updateAccountTable: .fx-account-table nicht gefunden, obwohl FX-Konten vorhanden sind.");
}
function ba(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = Mn(n);
    r && t.push(r);
  }
  return t;
}
function ya(e, t) {
  if (!Array.isArray(e)) {
    console.warn("handlePortfolioUpdate: Update ist kein Array:", e);
    return;
  }
  try {
    console.debug("handlePortfolioUpdate: payload=", e);
  } catch {
  }
  const n = ba(e);
  if (n.length && qi(n), da(n), !t)
    return;
  const r = t.querySelector(".portfolio-table table") || t.querySelector("table.expandable-portfolio-table");
  if (!r) {
    !t.querySelector(".portfolio-table") && (t.querySelector(".security-range-selector") || t.querySelector(".security-detail-placeholder")) ? console.debug(
      "handlePortfolioUpdate: Übersicht nicht aktiv – Update wird später angewendet."
    ) : console.warn("handlePortfolioUpdate: Keine Portfolio-Tabelle gefunden.");
    return;
  }
  const i = r.tBodies.item(0) ?? r.querySelector("tbody");
  if (!i) {
    console.warn("handlePortfolioUpdate: Kein <tbody> in Tabelle.");
    return;
  }
  const a = (u) => {
    if (typeof Intl < "u")
      try {
        const g = typeof navigator < "u" && navigator.language ? navigator.language : "de-DE";
        return new Intl.NumberFormat(g, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(u);
      } catch {
      }
    return (ot(u, { fallback: 0 }) ?? 0).toFixed(2).replace(".", ",");
  }, o = /* @__PURE__ */ new Map();
  i.querySelectorAll("tr.portfolio-row").forEach((u) => {
    const f = u.dataset.portfolio;
    f && o.set(f, u);
  });
  let c = 0;
  const l = (u) => {
    const f = typeof u == "number" && Number.isFinite(u) ? u : 0;
    try {
      return f.toLocaleString("de-DE");
    } catch {
      return f.toString();
    }
  }, d = /* @__PURE__ */ new Map();
  for (const u of n) {
    const f = Pe(u.uuid);
    f && d.set(f, u);
  }
  for (const [u, f] of d.entries()) {
    const g = o.get(u);
    if (!g || g.cells.length < 3)
      continue;
    const p = g.cells.item(1), b = g.cells.item(2), _ = g.cells.item(3), h = g.cells.item(4);
    if (!p || !b)
      continue;
    const m = typeof f.position_count == "number" && Number.isFinite(f.position_count) ? f.position_count : 0, y = typeof f.current_value == "number" && Number.isFinite(f.current_value) ? f.current_value : null, S = ue(f.performance), N = typeof (S == null ? void 0 : S.gain_abs) == "number" ? S.gain_abs : null, A = typeof (S == null ? void 0 : S.gain_pct) == "number" ? S.gain_pct : null, P = typeof f.purchase_sum == "number" && Number.isFinite(f.purchase_sum) ? f.purchase_sum : typeof f.purchase_value == "number" && Number.isFinite(f.purchase_value) ? f.purchase_value : null, $ = gt(b.textContent);
    gt(p.textContent) !== m && (p.textContent = l(m));
    const L = y !== null, U = {
      fx_unavailable: g.dataset.fxUnavailable === "true",
      current_value: y,
      performance: S
    }, V = { hasValue: L }, D = R("current_value", U.current_value, U, V), w = y ?? 0;
    if ((Math.abs($ - w) >= 5e-3 || b.innerHTML !== D) && (b.innerHTML = D, g.classList.add("flash-update"), setTimeout(() => {
      g.classList.remove("flash-update");
    }, 800)), _) {
      const F = R("gain_abs", N, U, V);
      _.innerHTML = F;
      const v = typeof A == "number" && Number.isFinite(A) ? A : null;
      _.dataset.gainPct = v != null ? `${a(v)} %` : "—", _.dataset.gainSign = v != null ? v > 0 ? "positive" : v < 0 ? "negative" : "neutral" : "neutral";
    }
    h && (h.innerHTML = R("gain_pct", A, U, V)), g.dataset.positionCount = m.toString(), g.dataset.currentValue = L ? w.toString() : "", g.dataset.purchaseSum = P != null ? P.toString() : "", g.dataset.gainAbs = N != null ? N.toString() : "", g.dataset.gainPct = A != null ? A.toString() : "", g.dataset.coverageRatio = typeof f.coverage_ratio == "number" && Number.isFinite(f.coverage_ratio) ? f.coverage_ratio.toString() : "", g.dataset.provenance = typeof f.provenance == "string" ? f.provenance : "", g.dataset.metricRunUuid = typeof f.metric_run_uuid == "string" ? f.metric_run_uuid : "", c += 1;
  }
  if (c === 0)
    console.debug("handlePortfolioUpdate: Keine passenden Zeilen gefunden / keine Änderungen.");
  else {
    const u = c.toLocaleString("de-DE");
    console.debug(`handlePortfolioUpdate: ${u} Zeile(n) gepatcht.`);
  }
  try {
    Na(r);
  } catch (u) {
    console.warn("handlePortfolioUpdate: Fehler bei Summen-Neuberechnung:", u);
  }
  try {
    const u = (...h) => {
      for (const m of h) {
        if (!m) continue;
        const y = t.querySelector(m);
        if (y) return y;
      }
      return null;
    }, f = u(
      ".account-table table",
      ".accounts-eur-table table",
      ".accounts-table table"
    ), g = u(
      ".fx-account-table table",
      ".accounts-fx-table table"
    ), p = (h, m) => {
      if (!h) return [];
      const y = h.querySelectorAll("tbody tr.account-row");
      return (y.length ? Array.from(y) : Array.from(h.querySelectorAll("tbody tr:not(.footer-row)"))).map((N) => {
        const A = m ? N.cells.item(2) : N.cells.item(1);
        return { balance: gt(A == null ? void 0 : A.textContent) };
      });
    }, b = [
      ...p(f, !1),
      ...p(g, !0)
    ], _ = Array.from(
      r.querySelectorAll("tbody tr.portfolio-row")
    ).map((h) => {
      const m = h.dataset.currentValue, y = h.dataset.purchaseSum, S = m ? Number.parseFloat(m) : Number.NaN, N = y ? Number.parseFloat(y) : Number.NaN;
      return {
        current_value: Number.isFinite(S) ? S : 0,
        purchase_sum: Number.isFinite(N) ? N : 0
      };
    });
    ar(b, _, t);
  } catch (u) {
    console.warn("handlePortfolioUpdate: Fehler bei Total-Neuberechnung:", u);
  }
}
function va(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e.portfolio_uuid;
  if (typeof t == "string" && t)
    return t;
  const n = e.portfolioUuid;
  return typeof n == "string" && n ? n : null;
}
function Nt(e) {
  At.delete(e);
}
function dn(e) {
  return typeof e != "number" || !Number.isInteger(e) || e <= 0 ? null : e;
}
function Sa(e, t, n, r) {
  if (!n || n <= 1 || !t)
    return Nt(e), r;
  const i = n, a = At.get(e) ?? { expected: i, chunks: /* @__PURE__ */ new Map() };
  if (a.expected !== i && (a.chunks.clear(), a.expected = i), a.chunks.set(t, r), At.set(e, a), a.chunks.size < i)
    return null;
  const o = [];
  for (let s = 1; s <= i; s += 1) {
    const c = a.chunks.get(s);
    c && Array.isArray(c) && o.push(...c);
  }
  return Nt(e), o;
}
function fn(e, t) {
  const n = va(e);
  if (!n)
    return console.warn("handlePortfolioPositionsUpdate: Ungültiges Update:", e), !1;
  const r = e == null ? void 0 : e.error, i = dn(e == null ? void 0 : e.chunk_index), a = dn(e == null ? void 0 : e.chunk_count), o = st((e == null ? void 0 : e.positions) ?? []);
  r && Nt(n);
  const s = r ? o : Sa(n, i, a, o);
  if (!r && s === null)
    return !0;
  const c = r ? o : s ?? [];
  fa(n, e), r || (Vt(n, c), Ot(n, c));
  const l = rr(t, n, c, r);
  if (l.applied ? re.delete(n) : (re.set(n, { positions: o, error: r }), l.reason !== "hidden" && ir(t, n)), !r && o.length > 0) {
    const d = Array.from(
      new Set(
        o.map((u) => u.security_uuid).filter((u) => typeof u == "string" && u.length > 0)
      )
    );
    if (d.length && typeof window < "u")
      try {
        window.dispatchEvent(
          new CustomEvent(
            ia,
            {
              detail: {
                portfolioUuid: n,
                securityUuids: d
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
function Pa(e, t) {
  if (Array.isArray(e)) {
    let n = !1;
    for (const r of e)
      fn(r, t) && (n = !0);
    !n && e.length && console.warn("handlePortfolioPositionsUpdate: Kein gültiges Element im Array:", e);
    return;
  }
  fn(e, t);
}
function Aa(e) {
  const { renderPositionsTable: t, applyGainPctMetadata: n } = Ut();
  try {
    if (typeof t == "function")
      return t(e);
  } catch {
  }
  if (e.length === 0)
    return '<div class="no-positions">Keine Positionen vorhanden.</div>';
  const r = e.map((a) => {
    const o = ln(a);
    return {
      name: a.name,
      current_holdings: a.current_holdings,
      purchase_value: a.purchase_value,
      current_value: a.current_value,
      performance: o
    };
  }), i = ye(
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
    const a = document.createElement("template");
    a.innerHTML = i.trim();
    const o = a.content.querySelector("table");
    if (o) {
      o.classList.add("sortable-positions");
      const s = o.querySelectorAll("thead th"), c = ["name", "current_holdings", "purchase_value", "current_value", "gain_abs", "gain_pct"];
      s.forEach((u, f) => {
        const g = c[f];
        g && (u.setAttribute("data-sort-key", g), u.classList.add("sortable-col"));
      }), o.querySelectorAll("tbody tr").forEach((u, f) => {
        if (u.classList.contains("footer-row"))
          return;
        const g = e[f];
        g.security_uuid && (u.dataset.security = g.security_uuid), u.classList.add("position-row");
      }), o.dataset.defaultSort = "name", o.dataset.defaultDir = "asc";
      const d = n;
      if (d)
        try {
          d(o);
        } catch (u) {
          console.warn("renderPositionsTableInline: applyGainPctMetadata failed", u);
        }
      else
        o.querySelectorAll("tbody tr").forEach((f, g) => {
          if (f.classList.contains("footer-row"))
            return;
          const p = f.cells.item(4);
          if (!p)
            return;
          const b = e[g], _ = ln(b), h = typeof (_ == null ? void 0 : _.gain_pct) == "number" && Number.isFinite(_.gain_pct) ? _.gain_pct : null, m = h != null ? `${h.toLocaleString("de-DE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })} %` : "—", y = h == null ? "neutral" : h > 0 ? "positive" : h < 0 ? "negative" : "neutral";
          p.dataset.gainPct = m, p.dataset.gainSign = y;
        });
      return o.outerHTML;
    }
  } catch (a) {
    console.warn("renderPositionsTableInline: Sortier-Metadaten Injection fehlgeschlagen:", a);
  }
  return i;
}
function Na(e) {
  var h;
  if (!e) return;
  const { updatePortfolioFooter: t } = Ut();
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
    const y = Number.parseFloat(m);
    return Number.isFinite(y) ? y : null;
  }, i = n.reduce(
    (m, y) => {
      const S = r(y.dataset.positionCount);
      if (S != null && (m.sumPositions += S), y.dataset.fxUnavailable === "true" && (m.fxUnavailable = !0), y.dataset.hasValue !== "true")
        return m.incompleteRows += 1, m;
      m.valueRows += 1;
      const N = r(y.dataset.currentValue), A = r(y.dataset.gainAbs), P = r(y.dataset.purchaseSum);
      return N == null || A == null || P == null ? (m.incompleteRows += 1, m) : (m.sumCurrent += N, m.sumGainAbs += A, m.sumPurchase += P, m);
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
  ), a = i.valueRows > 0 && i.incompleteRows === 0, o = a && i.sumPurchase > 0 ? i.sumGainAbs / i.sumPurchase * 100 : null;
  let s = e.querySelector("tr.footer-row");
  s || (s = document.createElement("tr"), s.className = "footer-row", (h = e.querySelector("tbody")) == null || h.appendChild(s));
  const c = Math.round(i.sumPositions).toLocaleString("de-DE"), l = {
    fx_unavailable: i.fxUnavailable || !a,
    current_value: a ? i.sumCurrent : null,
    performance: a ? {
      gain_abs: i.sumGainAbs,
      gain_pct: o,
      total_change_eur: i.sumGainAbs,
      total_change_pct: o,
      source: "aggregated",
      coverage_ratio: 1
    } : null
  }, d = { hasValue: a }, u = R("current_value", l.current_value, l, d), f = a ? i.sumGainAbs : null, g = a ? o : null, p = R("gain_abs", f, l, d), b = R("gain_pct", g, l, d);
  s.innerHTML = `
    <td>Summe</td>
    <td class="align-right">${c}</td>
    <td class="align-right">${u}</td>
    <td class="align-right">${p}</td>
    <td class="align-right">${b}</td>
  `;
  const _ = s.cells.item(3);
  _ && (_.dataset.gainPct = a && typeof o == "number" ? `${wt(o)} %` : "—", _.dataset.gainSign = a && typeof o == "number" ? o > 0 ? "positive" : o < 0 ? "negative" : "neutral" : "neutral"), s.dataset.positionCount = Math.round(i.sumPositions).toString(), s.dataset.currentValue = a ? i.sumCurrent.toString() : "", s.dataset.purchaseSum = a ? i.sumPurchase.toString() : "", s.dataset.gainAbs = a ? i.sumGainAbs.toString() : "", s.dataset.gainPct = a && typeof o == "number" ? o.toString() : "", s.dataset.hasValue = a ? "true" : "false", s.dataset.fxUnavailable = i.fxUnavailable || !a ? "true" : "false";
}
function gn(e) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  if (typeof e == "string") {
    const t = Number.parseFloat(e);
    return Number.isFinite(t) ? t : 0;
  }
  return 0;
}
function wt(e) {
  return (ot(e, { fallback: 0 }) ?? 0).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
function ar(e, t, n) {
  const r = n ?? document, a = (Array.isArray(e) ? e : []).reduce((u, f) => {
    const g = f.balance ?? f.current_value ?? f.value, p = gn(g);
    return u + p;
  }, 0), s = (Array.isArray(t) ? t : []).reduce((u, f) => {
    const g = f.current_value ?? f.value, p = gn(g);
    return u + p;
  }, 0), c = a + s, l = r.querySelector("#headerMeta");
  if (!l) {
    console.warn("updateTotalWealth: #headerMeta nicht gefunden.");
    return;
  }
  const d = l.querySelector("strong") || l.querySelector(".total-wealth-value");
  d ? d.textContent = `${wt(c)} €` : l.textContent = `💰 Gesamtvermögen: ${wt(c)} €`, l.dataset.totalWealthEur = c.toString();
}
function wa(e, t) {
  const n = typeof e == "string" ? e : e == null ? void 0 : e.last_file_update, r = Pe(n) ?? "";
  if (!t) {
    console.warn("handleLastFileUpdate: root fehlt");
    return;
  }
  let i = t.querySelector(".footer-card .last-file-update") || t.querySelector(".last-file-update");
  if (!i) {
    const a = t.querySelector(".footer-card .meta") || t.querySelector("#headerMeta") || t.querySelector(".header-card .meta") || t.querySelector(".header-card");
    if (!a) {
      console.warn("handleLastFileUpdate: Kein Einfügepunkt gefunden.");
      return;
    }
    i = document.createElement("div"), i.className = "last-file-update", a.appendChild(i);
  }
  i.closest(".footer-card") ? i.innerHTML = r ? `📂 Letzte Aktualisierung der Datei: <strong>${r}</strong>` : "📂 Letzte Aktualisierung der Datei: <strong>Unbekannt</strong>" : i.textContent = r ? `📂 Letzte Aktualisierung: ${r}` : "📂 Letzte Aktualisierung: Unbekannt";
}
function rs(e) {
  if (e == null)
    return;
  const t = e.querySelector("table.sortable-positions");
  if (t == null)
    return;
  const n = e.dataset.sortKey || t.dataset.defaultSort || "name", i = (e.dataset.sortDir || t.dataset.defaultDir || "asc") === "desc" ? "desc" : "asc";
  e.dataset.sortKey = n, e.dataset.sortDir = i, Cn(t, n, i, !0);
}
const is = {
  getPortfolioPositionsCacheSnapshot: Mi,
  clearPortfolioPositionsCache: Ti,
  getPendingUpdateCount() {
    return re.size;
  },
  queuePendingUpdate(e, t, n) {
    re.set(e, { positions: t, error: n });
  },
  clearPendingUpdates() {
    re.clear(), Ge.clear();
  }
};
function gt(e) {
  return e == null ? 0 : parseFloat(
    e.replace(/\u00A0/g, " ").replace(/[€%]/g, "").replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "")
  ) || 0;
}
const Fa = [
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
function pt(e) {
  return Fa.includes(e);
}
function ht(e) {
  return e === "asc" || e === "desc";
}
let Xe = null, Ze = null;
const pn = { min: 2, max: 6 };
function Ne(e) {
  return ne(e);
}
function xa(e) {
  return typeof e == "number" && Number.isFinite(e);
}
function Ea(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  if (!t)
    return null;
  const n = t.toUpperCase();
  return /^[A-Z]{3}$/.test(n) ? n : n === "€" ? "EUR" : null;
}
function hn(e, t, n = null) {
  for (const r of t) {
    const i = Ea(e[r]);
    if (i)
      return i;
  }
  return n;
}
function mn(e, t) {
  return xa(e) ? `${e.toLocaleString("de-DE", {
    minimumFractionDigits: pn.min,
    maximumFractionDigits: pn.max
  })}${t ? ` ${t}` : ""}` : null;
}
function Da(e) {
  const t = e, n = e.average_cost ?? null, r = e.aggregation ?? null, i = hn(t, [
    "security_currency_code",
    "security_currency",
    "native_currency_code",
    "native_currency"
  ], e.currency_code ?? null), a = hn(t, [
    "account_currency_code",
    "account_currency",
    "purchase_currency_code",
    "currency_code"
  ], i === "EUR" ? "EUR" : null) ?? (i === "EUR" ? "EUR" : null) ?? "EUR", o = Ne(n == null ? void 0 : n.native), s = Ne(n == null ? void 0 : n.security), c = Ne(n == null ? void 0 : n.account), l = Ne(n == null ? void 0 : n.eur), d = s ?? o, u = l ?? (a === "EUR" ? c : null), f = i ?? a ?? "EUR", g = f === "EUR";
  let p, b;
  g ? (p = "EUR", b = u ?? d ?? c ?? null) : d != null ? (p = f, b = d) : c != null ? (p = a, b = c) : (p = "EUR", b = u ?? null);
  const _ = mn(b, p), h = g ? null : mn(u, "EUR"), m = !!h && h !== _, y = [], S = [];
  _ ? (y.push(
    `<span class="purchase-price purchase-price--primary">${_}</span>`
  ), S.push(_.replace(/\u00A0/g, " "))) : (y.push('<span class="missing-value" role="note" aria-label="Kein Kaufpreis verfügbar" title="Kein Kaufpreis verfügbar">—</span>'), S.push("Kein Kaufpreis verfügbar")), m && h && (y.push(
    `<span class="purchase-price purchase-price--secondary">${h}</span>`
  ), S.push(h.replace(/\u00A0/g, " ")));
  const N = y.join("<br>"), A = Ne(r == null ? void 0 : r.purchase_value_eur) ?? 0, P = S.join(", ");
  return { markup: N, sortValue: A, ariaLabel: P };
}
function Ca(e) {
  const t = ne(e.current_holdings);
  if (t == null)
    return { value: null, pct: null };
  const n = ne(e.last_price_eur), r = ne(e.last_close_eur);
  let i = null, a = null;
  if (n != null && r != null) {
    i = (n - r) * t;
    const u = r * t;
    u && (a = i / u * 100);
  }
  const o = ue(e.performance), s = (o == null ? void 0 : o.day_change) ?? null;
  if (i == null && (s == null ? void 0 : s.price_change_eur) != null && (i = s.price_change_eur * t), a == null && (s == null ? void 0 : s.change_pct) != null && (a = s.change_pct), i == null && a != null) {
    const d = ne(e.current_value);
    if (d != null) {
      const u = d / (1 + a / 100);
      u && (i = d - u);
    }
  }
  const c = i != null && Number.isFinite(i) ? Math.round(i * 100) / 100 : null, l = a != null && Number.isFinite(a) ? Math.round(a * 100) / 100 : null;
  return { value: c, pct: l };
}
const Je = /* @__PURE__ */ new Set();
function or(e) {
  if (!e)
    return;
  Array.from(e.querySelectorAll("tbody tr")).forEach((n) => {
    const r = n.cells.item(7), i = n.cells.item(8);
    if (!r || !i || r.dataset.gainPct && r.dataset.gainSign)
      return;
    const a = (i.textContent || "").trim() || "—";
    let o = "neutral";
    i.querySelector(".positive") ? o = "positive" : i.querySelector(".negative") && (o = "negative"), r.dataset.gainPct = a, r.dataset.gainSign = o;
  });
}
function Me(e) {
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
  ], n = e.map((i) => {
    const a = ue(i.performance), o = typeof (a == null ? void 0 : a.gain_abs) == "number" ? a.gain_abs : null, s = typeof (a == null ? void 0 : a.gain_pct) == "number" ? a.gain_pct : null, c = Ca(i), l = typeof i.purchase_value == "number" || typeof i.purchase_value == "string" ? i.purchase_value : null;
    return {
      name: typeof i.name == "string" ? i.name : typeof i.name == "number" ? String(i.name) : "",
      current_holdings: typeof i.current_holdings == "number" || typeof i.current_holdings == "string" ? i.current_holdings : null,
      average_price: typeof i.purchase_value == "number" || typeof i.purchase_value == "string" ? i.purchase_value : null,
      purchase_value: l,
      current_value: typeof i.current_value == "number" || typeof i.current_value == "string" ? i.current_value : null,
      day_change_abs: c.value,
      day_change_pct: c.pct,
      gain_abs: o,
      gain_pct: s,
      performance: a
    };
  }), r = ye(n, t, ["purchase_value", "current_value", "day_change_abs", "gain_abs"]);
  try {
    const i = document.createElement("template");
    i.innerHTML = r.trim();
    const a = i.content.querySelector("table");
    if (a) {
      a.classList.add("sortable-positions");
      const o = Array.from(a.querySelectorAll("thead th"));
      return t.forEach((c, l) => {
        const d = o.at(l);
        d && (d.setAttribute("data-sort-key", c.key), d.classList.add("sortable-col"));
      }), a.querySelectorAll("tbody tr").forEach((c, l) => {
        if (c.classList.contains("footer-row") || l >= e.length)
          return;
        const d = e[l], u = typeof d.security_uuid == "string" ? d.security_uuid : null;
        u && (c.dataset.security = u), c.classList.add("position-row");
        const f = c.cells.item(2);
        if (f) {
          const { markup: b, sortValue: _, ariaLabel: h } = Da(d);
          f.innerHTML = b, f.dataset.sortValue = String(_), h ? f.setAttribute("aria-label", h) : f.removeAttribute("aria-label");
        }
        const g = c.cells.item(7);
        if (g) {
          const b = ue(d.performance), _ = typeof (b == null ? void 0 : b.gain_pct) == "number" && Number.isFinite(b.gain_pct) ? b.gain_pct : null, h = _ != null ? `${_.toLocaleString("de-DE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })} %` : "—", m = _ == null ? "neutral" : _ > 0 ? "positive" : _ < 0 ? "negative" : "neutral";
          g.dataset.gainPct = h, g.dataset.gainSign = m;
        }
        const p = c.cells.item(8);
        p && p.classList.add("gain-pct-cell");
      }), a.dataset.defaultSort = "name", a.dataset.defaultDir = "asc", or(a), a.outerHTML;
    }
  } catch (i) {
    console.warn("renderPositionsTable: Konnte Sortier-Metadaten nicht injizieren:", i);
  }
  return r;
}
function $a(e) {
  const t = st(e ?? []);
  return Me(t);
}
function Ra(e, t) {
  if (!t) return;
  const n = e.querySelector(
    `.portfolio-details[data-portfolio="${t}"]`
  );
  if (!n) return;
  const r = n.querySelector(".positions-container");
  r && (r.__ppReaderSecurityClickBound || (r.__ppReaderSecurityClickBound = !0, r.addEventListener("click", (i) => {
    const a = i.target;
    if (!(a instanceof Element))
      return;
    const o = a.closest("button, a");
    if (o && r.contains(o))
      return;
    const s = a.closest("tr[data-security]");
    if (!s || !r.contains(s))
      return;
    const c = s.getAttribute("data-security");
    if (c)
      try {
        Ur(c) || console.warn("attachSecurityDetailDelegation: Detail-Tab konnte nicht geöffnet werden für", c);
      } catch (l) {
        console.error("attachSecurityDetailDelegation: Fehler beim Öffnen des Detail-Tabs", l);
      }
  })));
}
function ke(e, t) {
  Ra(e, t);
}
function sr(e) {
  console.debug("buildExpandablePortfolioTable: render", e.length, "portfolios");
  const t = (v) => v == null || typeof v != "string" && typeof v != "number" && typeof v != "boolean" ? "" : String(v).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
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
    const x = v.align === "right" ? ' class="align-right"' : "";
    n += `<th${x}>${v.label}</th>`;
  }), n += "</tr></thead><tbody>", e.forEach((v) => {
    const x = Number.isFinite(v.position_count) ? v.position_count : 0, z = Number.isFinite(v.purchase_sum) ? v.purchase_sum : 0, B = v.hasValue && typeof v.current_value == "number" && Number.isFinite(v.current_value) ? v.current_value : null, G = B !== null, I = v.performance, W = typeof v.gain_abs == "number" ? v.gain_abs : typeof (I == null ? void 0 : I.gain_abs) == "number" ? I.gain_abs : null, q = typeof v.gain_pct == "number" ? v.gain_pct : typeof (I == null ? void 0 : I.gain_pct) == "number" ? I.gain_pct : null, oe = I && typeof I == "object" ? I.day_change : null, Oe = typeof v.day_change_abs == "number" ? v.day_change_abs : oe && typeof oe == "object" ? oe.value_change_eur ?? oe.price_change_eur : null, Be = typeof v.day_change_pct == "number" ? v.day_change_pct : oe && typeof oe == "object" && typeof oe.change_pct == "number" ? oe.change_pct : null, zr = v.fx_unavailable && G, qr = typeof v.coverage_ratio == "number" && Number.isFinite(v.coverage_ratio) ? v.coverage_ratio : "", Or = typeof v.provenance == "string" ? v.provenance : "", Br = typeof v.metric_run_uuid == "string" ? v.metric_run_uuid : "", Ae = Je.has(v.uuid), Wr = Ae ? "portfolio-toggle expanded" : "portfolio-toggle", Jt = `portfolio-details-${v.uuid}`, X = {
      fx_unavailable: v.fx_unavailable,
      purchase_value: z,
      current_value: B,
      day_change_abs: Oe,
      day_change_pct: Be,
      gain_abs: W,
      gain_pct: q
    }, he = { hasValue: G }, jr = R("purchase_value", X.purchase_value, X, he), Gr = R("current_value", X.current_value, X, he), Kr = R("day_change_abs", X.day_change_abs, X, he), Yr = R("day_change_pct", X.day_change_pct, X, he), Xr = R("gain_abs", X.gain_abs, X, he), Zr = R("gain_pct", X.gain_pct, X, he), Qt = G && typeof q == "number" && Number.isFinite(q) ? `${ie(q)} %` : "", Jr = G && typeof q == "number" && Number.isFinite(q) ? q > 0 ? "positive" : q < 0 ? "negative" : "neutral" : "", Qr = G && typeof B == "number" && Number.isFinite(B) ? B : "", ei = G && typeof W == "number" && Number.isFinite(W) ? W : "", ti = G && typeof q == "number" && Number.isFinite(q) ? q : "", ni = G && typeof Oe == "number" && Number.isFinite(Oe) ? Oe : "", ri = G && typeof Be == "number" && Number.isFinite(Be) ? Be : "", ii = String(x);
    let lt = "";
    Qt && (lt = ` data-gain-pct="${t(Qt)}" data-gain-sign="${t(Jr)}"`), zr && (lt += ' data-partial="true"'), n += `<tr class="portfolio-row"
                  data-portfolio="${v.uuid}"
                  data-position-count="${ii}"
                  data-current-value="${t(Qr)}"
                  data-purchase-sum="${t(z)}"
                  data-day-change="${t(ni)}"
                  data-day-change-pct="${t(ri)}"
                  data-gain-abs="${t(ei)}"
                data-gain-pct="${t(ti)}"
                data-has-value="${G ? "true" : "false"}"
                data-fx-unavailable="${v.fx_unavailable ? "true" : "false"}"
                data-coverage-ratio="${t(qr)}"
                data-provenance="${t(Or)}"
                data-metric-run-uuid="${t(Br)}">`;
    const ai = Te(v.name), oi = er(v.badges, { containerClass: "portfolio-badges" });
    n += `<td>
        <button type="button"
                class="${Wr}"
                data-portfolio="${v.uuid}"
                aria-expanded="${Ae ? "true" : "false"}"
                aria-controls="${Jt}">
          <span class="caret">${Ae ? "▼" : "▶"}</span>
          <span class="portfolio-name">${ai}</span>${oi}
        </button>
      </td>`;
    const si = x.toLocaleString("de-DE");
    n += `<td class="align-right">${si}</td>`, n += `<td class="align-right">${jr}</td>`, n += `<td class="align-right">${Gr}</td>`, n += `<td class="align-right">${Kr}</td>`, n += `<td class="align-right">${Yr}</td>`, n += `<td class="align-right"${lt}>${Xr}</td>`, n += `<td class="align-right gain-pct-cell">${Zr}</td>`, n += "</tr>", n += `<tr class="portfolio-details${Ae ? "" : " hidden"}"
                data-portfolio="${v.uuid}"
                id="${Jt}"
                role="region"
                aria-label="Positionen für ${v.name}">
      <td colspan="${r.length}">
        <div class="positions-container">${Ae ? zt(v.uuid) ? Me(On(v.uuid)) : '<div class="loading">Lade Positionen...</div>' : ""}</div>
      </td>
    </tr>`;
  });
  const i = e.filter((v) => typeof v.current_value == "number" && Number.isFinite(v.current_value)), a = e.reduce((v, x) => v + (Number.isFinite(x.position_count) ? x.position_count : 0), 0), o = i.reduce((v, x) => typeof x.current_value == "number" && Number.isFinite(x.current_value) ? v + x.current_value : v, 0), s = i.reduce((v, x) => typeof x.purchase_sum == "number" && Number.isFinite(x.purchase_sum) ? v + x.purchase_sum : v, 0), c = i.map((v) => {
    if (typeof v.day_change_abs == "number")
      return v.day_change_abs;
    const x = v.performance && typeof v.performance == "object" ? v.performance.day_change : null;
    if (x && typeof x == "object") {
      const z = x.value_change_eur;
      if (typeof z == "number" && Number.isFinite(z))
        return z;
    }
    return null;
  }).filter((v) => typeof v == "number" && Number.isFinite(v)), l = c.reduce((v, x) => v + x, 0), d = i.reduce((v, x) => {
    var G;
    if (typeof ((G = x.performance) == null ? void 0 : G.gain_abs) == "number" && Number.isFinite(x.performance.gain_abs))
      return v + x.performance.gain_abs;
    const z = typeof x.current_value == "number" && Number.isFinite(x.current_value) ? x.current_value : 0, B = typeof x.purchase_sum == "number" && Number.isFinite(x.purchase_sum) ? x.purchase_sum : 0;
    return v + (z - B);
  }, 0), u = i.length > 0, f = i.length !== e.length, g = c.length > 0, p = g && u && o !== 0 ? (() => {
    const v = o - l;
    return v ? l / v * 100 : null;
  })() : null, b = u && s > 0 ? d / s * 100 : null, _ = {
    fx_unavailable: f,
    purchase_value: u ? s : null,
    current_value: u ? o : null,
    day_change_abs: g ? l : null,
    day_change_pct: g ? p : null,
    gain_abs: u ? d : null,
    gain_pct: u ? b : null
  }, h = { hasValue: u }, m = { hasValue: g }, y = R("purchase_value", _.purchase_value, _, h), S = R("current_value", _.current_value, _, h), N = R("day_change_abs", _.day_change_abs, _, m), A = R("day_change_pct", _.day_change_pct, _, m), P = R("gain_abs", _.gain_abs, _, h), $ = R("gain_pct", _.gain_pct, _, h);
  let E = "";
  if (u && typeof b == "number" && Number.isFinite(b)) {
    const v = `${ie(b)} %`, x = b > 0 ? "positive" : b < 0 ? "negative" : "neutral";
    E = ` data-gain-pct="${t(v)}" data-gain-sign="${t(x)}"`;
  }
  f && (E += ' data-partial="true"');
  const L = String(Math.round(a)), U = u ? String(o) : "", V = u ? String(s) : "", D = g ? String(l) : "", w = g && typeof p == "number" && Number.isFinite(p) ? String(p) : "", F = u ? String(d) : "", T = u && typeof b == "number" && Number.isFinite(b) ? String(b) : "";
  return n += `<tr class="footer-row"
      data-position-count="${L}"
      data-current-value="${t(U)}"
      data-purchase-sum="${t(V)}"
      data-day-change="${t(D)}"
      data-day-change-pct="${t(w)}"
      data-gain-abs="${t(F)}"
      data-gain-pct="${t(T)}"
      data-has-value="${u ? "true" : "false"}"
      data-fx-unavailable="${f ? "true" : "false"}">
      <td>Summe</td>
      <td class="align-right">${Math.round(a).toLocaleString("de-DE")}</td>
    <td class="align-right">${y}</td>
    <td class="align-right">${S}</td>
    <td class="align-right">${N}</td>
    <td class="align-right">${A}</td>
    <td class="align-right"${E}>${P}</td>
    <td class="align-right gain-pct-cell">${$}</td>
  </tr>`, n += "</tbody></table>", n;
}
function La(e) {
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
function we(e) {
  if (e === void 0)
    return null;
  const t = Number(e);
  return Number.isFinite(t) ? t : null;
}
function cr(e) {
  var V;
  const t = La(e);
  if (!t)
    return;
  const n = t.tBodies.item(0);
  if (!n)
    return;
  const r = Array.from(n.querySelectorAll("tr.portfolio-row"));
  if (!r.length)
    return;
  let i = 0, a = 0, o = 0, s = 0, c = 0, l = !1, d = !1, u = !0, f = !1;
  for (const D of r) {
    const w = we(D.dataset.positionCount);
    w != null && (i += w), D.dataset.fxUnavailable === "true" && (f = !0);
    const F = D.dataset.hasValue;
    if (!!(F === "false" || F === "0" || F === "" || F == null)) {
      u = !1;
      continue;
    }
    l = !0;
    const v = we(D.dataset.currentValue), x = we(D.dataset.gainAbs), z = we(D.dataset.purchaseSum), B = we((V = D.dataset) == null ? void 0 : V.dayChange);
    if (v == null || x == null || z == null) {
      u = !1;
      continue;
    }
    a += v, s += x, o += z, B != null && (c += B, d = !0);
  }
  const g = l && u, p = g && o > 0 ? s / o * 100 : null, b = d && g && a !== 0 ? (() => {
    const D = a - c;
    return D ? c / D * 100 : null;
  })() : null;
  let _ = Array.from(n.children).find(
    (D) => D instanceof HTMLTableRowElement && D.classList.contains("footer-row")
  );
  _ || (_ = document.createElement("tr"), _.classList.add("footer-row"), n.appendChild(_));
  const h = Math.round(i).toLocaleString("de-DE"), m = {
    fx_unavailable: f || !g,
    purchase_value: g ? o : null,
    current_value: g ? a : null,
    day_change_abs: d && g ? c : null,
    day_change_pct: d && g ? b : null,
    gain_abs: g ? s : null,
    gain_pct: g ? p : null
  }, y = { hasValue: g }, S = { hasValue: d && g }, N = R("purchase_value", m.purchase_value, m, y), A = R("current_value", m.current_value, m, y), P = R("day_change_abs", m.day_change_abs, m, S), $ = R("day_change_pct", m.day_change_pct, m, S), E = R("gain_abs", m.gain_abs, m, y), L = R("gain_pct", m.gain_pct, m, y);
  _.innerHTML = `
      <td>Summe</td>
      <td class="align-right">${h}</td>
      <td class="align-right">${N}</td>
      <td class="align-right">${A}</td>
      <td class="align-right">${P}</td>
      <td class="align-right">${$}</td>
      <td class="align-right">${E}</td>
      <td class="align-right">${L}</td>
    `;
  const U = _.cells.item(6);
  U && (U.dataset.gainPct = g && typeof p == "number" ? `${ie(p)} %` : "—", U.dataset.gainSign = g && typeof p == "number" ? p > 0 ? "positive" : p < 0 ? "negative" : "neutral" : "neutral"), _.dataset.positionCount = String(Math.round(i)), _.dataset.currentValue = g ? String(a) : "", _.dataset.purchaseSum = g ? String(o) : "", _.dataset.dayChange = g && d ? String(c) : "", _.dataset.dayChangePct = g && d && typeof b == "number" ? String(b) : "", _.dataset.gainAbs = g ? String(s) : "", _.dataset.gainPct = g && typeof p == "number" ? String(p) : "", _.dataset.hasValue = g ? "true" : "false", _.dataset.fxUnavailable = f ? "true" : "false";
}
function He(e, t) {
  if (!t) return;
  const n = e.querySelector(
    `.portfolio-details[data-portfolio="${t}"]`
  );
  if (!n) return;
  const r = n.querySelector(".positions-container");
  if (!r) return;
  const i = r.querySelector("table.sortable-positions");
  if (!i || i.__ppReaderSortingBound) return;
  i.__ppReaderSortingBound = !0;
  const a = (f, g) => {
    const p = i.querySelector("tbody");
    if (!p) return;
    const b = Array.from(p.querySelectorAll("tr")).filter((y) => !y.classList.contains("footer-row")), _ = p.querySelector("tr.footer-row"), h = (y) => {
      if (y == null) return 0;
      const S = y.replace(/\u00A0/g, " ").replace(/[%€]/g, "").replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, ""), N = Number.parseFloat(S);
      return Number.isFinite(N) ? N : 0;
    };
    b.sort((y, S) => {
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
      }[f], P = y.cells.item(A), $ = S.cells.item(A);
      let E = "";
      if (P) {
        const D = P.textContent;
        typeof D == "string" && (E = D.trim());
      }
      let L = "";
      if ($) {
        const D = $.textContent;
        typeof D == "string" && (L = D.trim());
      }
      const U = (D, w) => {
        const F = D ? D.dataset.sortValue : void 0;
        if (F != null && F !== "") {
          const T = Number(F);
          if (Number.isFinite(T))
            return T;
        }
        return h(w);
      };
      let V;
      if (f === "name")
        V = E.localeCompare(L, "de", { sensitivity: "base" });
      else {
        const D = U(P, E), w = U($, L);
        V = D - w;
      }
      return g === "asc" ? V : -V;
    }), i.querySelectorAll("thead th.sort-active").forEach((y) => {
      y.classList.remove("sort-active", "dir-asc", "dir-desc");
    });
    const m = i.querySelector(`thead th[data-sort-key="${f}"]`);
    m && m.classList.add("sort-active", g === "asc" ? "dir-asc" : "dir-desc"), b.forEach((y) => p.appendChild(y)), _ && p.appendChild(_);
  }, o = r.dataset.sortKey, s = r.dataset.sortDir, c = i.dataset.defaultSort, l = i.dataset.defaultDir, d = pt(o) ? o : pt(c) ? c : "name", u = ht(s) ? s : ht(l) ? l : "asc";
  a(d, u), i.addEventListener("click", (f) => {
    const g = f.target;
    if (!(g instanceof Element))
      return;
    const p = g.closest("th[data-sort-key]");
    if (!p || !i.contains(p)) return;
    const b = p.getAttribute("data-sort-key");
    if (!pt(b))
      return;
    let _ = "asc";
    r.dataset.sortKey === b && (_ = (ht(r.dataset.sortDir) ? r.dataset.sortDir : "asc") === "asc" ? "desc" : "asc"), r.dataset.sortKey = b, r.dataset.sortDir = _, a(b, _);
  });
}
async function Ta(e, t, n) {
  if (!e || !Xe || !Ze) return;
  const r = t || n.querySelector(
    `.portfolio-details[data-portfolio="${e}"] .positions-container`
  );
  if (!r)
    return;
  const i = r.closest(".portfolio-details");
  if (!(i && i.classList.contains("hidden"))) {
    r.innerHTML = '<div class="loading">Neu laden...</div>';
    try {
      const a = await Un(
        Xe,
        Ze,
        e
      );
      if (a.error) {
        const s = typeof a.error == "string" ? a.error : String(a.error);
        r.innerHTML = `<div class="error">${s} <button class="retry-pos" data-portfolio="${e}">Erneut laden</button></div>`;
        return;
      }
      const o = st(
        Array.isArray(a.positions) ? a.positions : []
      );
      Vt(e, o), Ot(e, o), r.innerHTML = Me(o);
      try {
        He(n, e);
      } catch (s) {
        console.warn("attachPortfolioToggleHandler: Sort-Init (Lazy) fehlgeschlagen:", s);
      }
      try {
        ke(n, e);
      } catch (s) {
        console.warn("reloadPortfolioPositions: Security-Listener konnte nicht gebunden werden:", s);
      }
    } catch (a) {
      const o = a instanceof Error ? a.message : String(a);
      r.innerHTML = `<div class="error">Fehler: ${o} <button class="retry-pos" data-portfolio="${e}">Retry</button></div>`;
    }
  }
}
async function Ma(e, t, n = 3e3, r = 50) {
  const i = performance.now();
  return new Promise((a) => {
    const o = () => {
      const s = e.querySelector(t);
      if (s) {
        a(s);
        return;
      }
      if (performance.now() - i > n) {
        a(null);
        return;
      }
      setTimeout(o, r);
    };
    o();
  });
}
function Kt(e) {
  const n = (typeof e.__ppReaderAttachToken == "number" ? e.__ppReaderAttachToken : 0) + 1;
  e.__ppReaderAttachToken = n, e.__ppReaderAttachInProgress = !0, (async () => {
    try {
      const r = await Ma(e, ".portfolio-table");
      if (n !== e.__ppReaderAttachToken)
        return;
      if (!r) {
        console.warn("attachPortfolioToggleHandler: .portfolio-table nicht gefunden (Timeout)");
        return;
      }
      if (r.querySelectorAll(".portfolio-toggle").length === 0 && console.debug("attachPortfolioToggleHandler: Noch keine Buttons – evtl. Recovery später"), r.__ppReaderPortfolioToggleBound)
        return;
      r.__ppReaderPortfolioToggleBound = !0, console.debug("attachPortfolioToggleHandler: Listener registriert"), r.addEventListener("click", (a) => {
        (async () => {
          try {
            const o = a.target;
            if (!(o instanceof Element))
              return;
            const s = o.closest(".retry-pos");
            if (s && r.contains(s)) {
              const g = s.getAttribute("data-portfolio");
              if (g) {
                const p = e.querySelector(
                  `.portfolio-details[data-portfolio="${g}"]`
                ), b = p == null ? void 0 : p.querySelector(".positions-container");
                await Ta(g, b ?? null, e);
              }
              return;
            }
            const c = o.closest(".portfolio-toggle");
            if (!c || !r.contains(c)) return;
            const l = c.getAttribute("data-portfolio");
            if (!l) return;
            const d = e.querySelector(
              `.portfolio-details[data-portfolio="${l}"]`
            );
            if (!d) return;
            const u = c.querySelector(".caret");
            if (d.classList.contains("hidden")) {
              d.classList.remove("hidden"), c.classList.add("expanded"), c.setAttribute("aria-expanded", "true"), u && (u.textContent = "▼"), Je.add(l);
              try {
                Gt(e, l);
              } catch (g) {
                console.warn("attachPortfolioToggleHandler: Pending-Flush fehlgeschlagen:", g);
              }
              if (zt(l)) {
                const g = d.querySelector(".positions-container");
                if (g) {
                  g.innerHTML = Me(
                    On(l)
                  ), He(e, l);
                  try {
                    ke(e, l);
                  } catch (p) {
                    console.warn("attachPortfolioToggleHandler: Security-Listener (Cache) Fehler:", p);
                  }
                }
              } else {
                const g = d.querySelector(".positions-container");
                g && (g.innerHTML = '<div class="loading">Lade Positionen...</div>');
                try {
                  const p = await Un(
                    Xe,
                    Ze,
                    l
                  );
                  if (p.error) {
                    const _ = typeof p.error == "string" ? p.error : String(p.error);
                    g && (g.innerHTML = `<div class="error">${_} <button class="retry-pos" data-portfolio="${l}">Erneut laden</button></div>`);
                    return;
                  }
                  const b = st(
                    Array.isArray(p.positions) ? p.positions : []
                  );
                  if (Vt(l, b), Ot(
                    l,
                    b
                  ), g) {
                    g.innerHTML = Me(b);
                    try {
                      He(e, l);
                    } catch (_) {
                      console.warn("attachPortfolioToggleHandler: Sort-Init (Lazy) fehlgeschlagen:", _);
                    }
                    try {
                      ke(e, l);
                    } catch (_) {
                      console.warn("attachPortfolioToggleHandler: Security-Listener konnte nicht gebunden werden:", _);
                    }
                  }
                } catch (p) {
                  const b = p instanceof Error ? p.message : String(p), _ = d.querySelector(".positions-container");
                  _ && (_.innerHTML = `<div class="error">Fehler beim Laden: ${b} <button class="retry-pos" data-portfolio="${l}">Retry</button></div>`), console.error("Fehler beim Lazy Load für", l, p);
                }
              }
            } else
              d.classList.add("hidden"), c.classList.remove("expanded"), c.setAttribute("aria-expanded", "false"), u && (u.textContent = "▶"), Je.delete(l);
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
function ka(e) {
  const t = e.querySelector(".expandable-portfolio-table");
  t && (t.__ppReaderPortfolioFallbackBound || (t.__ppReaderPortfolioFallbackBound = !0, t.addEventListener("click", (n) => {
    const r = n.target;
    if (!(r instanceof Element) || !r.closest(".portfolio-toggle")) return;
    const a = e.querySelector(".portfolio-table");
    a != null && a.__ppReaderPortfolioToggleBound || (console.debug("Fallback-Listener aktiv – re-attach Hauptlistener"), Kt(e));
  })));
}
async function lr(e, t, n) {
  var U, V, D;
  Xe = t ?? null, Ze = n ?? null, console.debug(
    "renderDashboard: start – panelConfig:",
    n == null ? void 0 : n.config,
    "derived entry_id?",
    (D = (V = (U = n == null ? void 0 : n.config) == null ? void 0 : U._panel_custom) == null ? void 0 : V.config) == null ? void 0 : D.entry_id
  );
  const r = await yi(t, n);
  Gn(r.accounts);
  const i = Qn(), a = await Si(t, n);
  zi(a.portfolios);
  const o = Zi();
  let s = "";
  try {
    s = await vi(t, n);
  } catch {
    s = "";
  }
  const c = i.reduce(
    (w, F) => w + (typeof F.balance == "number" && Number.isFinite(F.balance) ? F.balance : 0),
    0
  ), l = o.some((w) => w.fx_unavailable), d = i.some((w) => w.fx_unavailable && (w.balance == null || !Number.isFinite(w.balance))), u = o.reduce((w, F) => F.hasValue && typeof F.current_value == "number" && Number.isFinite(F.current_value) ? w + F.current_value : w, 0), f = c + u, g = "Teilw. fehlende FX-Kurse – Gesamtvermögen abweichend", b = o.some((w) => w.hasValue && typeof w.current_value == "number" && Number.isFinite(w.current_value)) || i.some((w) => typeof w.balance == "number" && Number.isFinite(w.balance)) ? `${ie(f)}&nbsp;€` : `<span class="missing-value" role="note" aria-label="${g}" title="${g}">—</span>`, _ = l || d ? `<span class="total-wealth-note">${g}</span>` : "", h = `
    <div class="header-meta-row">
      💰 Gesamtvermögen: <strong class="total-wealth-value">${b}</strong>${_}
    </div>
  `, m = Pt("Übersicht", h), y = sr(o), S = i.filter((w) => (w.currency_code ?? "EUR") === "EUR"), N = i.filter((w) => (w.currency_code ?? "EUR") !== "EUR"), P = N.some((w) => w.fx_unavailable) ? `
        <p class="table-note" role="note">
          <span class="table-note__icon" aria-hidden="true">⚠️</span>
          <span>Wechselkurse konnten nicht geladen werden. EUR-Werte werden derzeit nicht angezeigt.</span>
        </p>
      ` : "", $ = `
    <div class="card">
      <h2>Liquidität</h2>
      <div class="scroll-container account-table">
        ${ye(
    S.map((w) => ({
      name: Ye(w.name, w.badges, {
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
    ${N.length ? `
      <div class="card">
        <h2>Fremdwährungen</h2>
        <div class="scroll-container fx-account-table">
          ${ye(
    N.map((w) => {
      const F = w.orig_balance, v = typeof F == "number" && Number.isFinite(F) ? `${F.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}&nbsp;${w.currency_code ?? ""}` : "";
      return {
        name: Ye(w.name, w.badges, {
          containerClass: "account-name",
          labelClass: "account-name__label"
        }),
        fx_display: v,
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
  `, E = `
    <div class="card footer-card">
      <div class="meta">
        <div class="last-file-update">
          📂 Letzte Aktualisierung der Datei: <strong>${s || "Unbekannt"}</strong>
        </div>
      </div>
    </div>
  `, L = `
    ${m.outerHTML}
    <div class="card">
      <h2>Investment</h2>
      <div class="scroll-container portfolio-table">
        ${y}
      </div>
    </div>
    ${$}
    ${E}
  `;
  return Ha(e, o), L;
}
function Ha(e, t) {
  if (!e)
    return;
  const n = () => {
    try {
      const i = e, a = i.querySelector(".portfolio-table");
      a && a.querySelectorAll(".portfolio-toggle").length === 0 && (console.debug("Recovery: Tabelle ohne Buttons – erneuter Aufbau"), a.innerHTML = sr(t)), Kt(e), ka(e), Je.forEach((o) => {
        try {
          zt(o) && (He(e, o), ke(e, o));
        } catch (s) {
          console.warn("Init-Sortierung für expandiertes Depot fehlgeschlagen:", o, s);
        }
      });
      try {
        cr(i);
      } catch (o) {
        console.warn("renderDashboard: Footer-Summe konnte nicht aktualisiert werden:", o);
      }
      try {
        ha(e);
      } catch (o) {
        console.warn("renderDashboard: Pending-Positions konnten nicht angewendet werden:", o);
      }
      console.debug("renderDashboard: portfolio-toggle Buttons:", i.querySelectorAll(".portfolio-toggle").length);
    } catch (i) {
      console.error("renderDashboard: Fehler bei Recovery/Listener", i);
    }
  }, r = typeof requestAnimationFrame == "function" ? (i) => requestAnimationFrame(i) : (i) => setTimeout(i, 0);
  r(() => r(n));
}
xi({
  renderPositionsTable: (e) => $a(e),
  applyGainPctMetadata: or,
  attachSecurityDetailListener: ke,
  attachPortfolioPositionsSorting: He,
  updatePortfolioFooter: (e) => {
    e && cr(e);
  }
});
const Ia = "http://www.w3.org/2000/svg", De = 640, Ce = 260, xe = { top: 12, right: 16, bottom: 24, left: 16 }, Ee = "var(--pp-reader-chart-line, #3f51b5)", Ft = "var(--pp-reader-chart-area, rgba(63, 81, 181, 0.12))", _n = "0.75rem", ur = "var(--pp-reader-chart-baseline, rgba(96, 125, 139, 0.75))", dr = "6 4", Ua = 24 * 60 * 60 * 1e3;
function Va(e) {
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
function za(e) {
  return typeof e == "string" ? e : typeof e == "number" && Number.isFinite(e) ? e.toString() : e instanceof Date && Number.isFinite(e.getTime()) ? e.toISOString() : "";
}
function J(e) {
  return `${String(e)}px`;
}
function fe(e, t = {}) {
  const n = document.createElementNS(Ia, e);
  return Object.entries(t).forEach(([r, i]) => {
    const a = Va(i);
    a != null && n.setAttribute(r, a);
  }), n;
}
function xt(e, t = null) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  if (typeof e == "string" && e.trim() !== "") {
    const n = Number.parseFloat(e);
    if (Number.isFinite(n))
      return n;
  }
  return t;
}
function qa(e, t) {
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
const fr = (e) => {
  if (e && typeof e == "object" && "date" in e)
    return e.date;
}, gr = (e) => {
  if (e && typeof e == "object" && "close" in e)
    return e.close;
}, pr = (e, t, n) => {
  if (Number.isFinite(e)) {
    const r = new Date(e);
    if (!Number.isNaN(r.getTime()))
      return r.toLocaleDateString("de-DE");
  }
  if (t && typeof t == "object" && "date" in t) {
    const r = t.date, i = za(r);
    if (i)
      return i;
  }
  return Number.isFinite(e) ? e.toString() : "";
}, hr = (e, t, n) => (Number.isFinite(e) ? e : xt(e, 0) ?? 0).toLocaleString("de-DE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
}), mr = ({ xFormatted: e, yFormatted: t }) => `
    <div class="chart-tooltip-date">${e}</div>
    <div class="chart-tooltip-value">${t}&nbsp;€</div>
  `;
function _r(e) {
  return e.__chartState || (e.__chartState = {
    svg: null,
    areaPath: null,
    linePath: null,
    baselineLine: null,
    focusLine: null,
    focusCircle: null,
    overlay: null,
    tooltip: null,
    width: De,
    height: Ce,
    margin: { ...xe },
    series: [],
    points: [],
    range: null,
    xAccessor: fr,
    yAccessor: gr,
    xFormatter: pr,
    yFormatter: hr,
    tooltipRenderer: mr,
    color: Ee,
    areaColor: Ft,
    baseline: null,
    handlersAttached: !1
  }), e.__chartState;
}
function ge(e, t, n) {
  return !Number.isFinite(e) || e < t ? t : e > n ? n : e;
}
function Oa(e, t) {
  if (e.length === 0)
    return "";
  const n = [];
  e.forEach((o, s) => {
    const c = s === 0 ? "M" : "L", l = o.x.toFixed(2), d = o.y.toFixed(2);
    n.push(`${c}${l} ${d}`);
  });
  const r = e[0], a = `L${e[e.length - 1].x.toFixed(2)} ${t.toFixed(2)} L${r.x.toFixed(2)} ${t.toFixed(2)} Z`;
  return `${n.join(" ")} ${a}`;
}
function Ba(e) {
  if (e.length === 0)
    return "";
  const t = [];
  return e.forEach((n, r) => {
    const i = r === 0 ? "M" : "L", a = n.x.toFixed(2), o = n.y.toFixed(2);
    t.push(`${i}${a} ${o}`);
  }), t.join(" ");
}
function Wa(e) {
  const { baselineLine: t, baseline: n } = e;
  if (!t)
    return;
  const r = (n == null ? void 0 : n.color) ?? ur, i = (n == null ? void 0 : n.dashArray) ?? dr;
  t.setAttribute("stroke", r), t.setAttribute("stroke-dasharray", i);
}
function mt(e) {
  const { baselineLine: t, baseline: n, range: r, margin: i, width: a } = e;
  if (!t)
    return;
  const o = n == null ? void 0 : n.value;
  if (!r || o == null || !Number.isFinite(o)) {
    t.style.opacity = "0";
    return;
  }
  const { minY: s, maxY: c, boundedHeight: l } = r, d = Number.isFinite(s) ? s : o, f = (Number.isFinite(c) ? c : d + 1) - d, g = f === 0 ? 0.5 : (o - d) / f, p = ge(g, 0, 1), b = Math.max(l, 0), _ = i.top + (1 - p) * b, h = Math.max(a - i.left - i.right, 0), m = i.left, y = i.left + h;
  t.setAttribute("x1", m.toFixed(2)), t.setAttribute("x2", y.toFixed(2)), t.setAttribute("y1", _.toFixed(2)), t.setAttribute("y2", _.toFixed(2)), t.style.opacity = "1";
}
function ja(e, t, n) {
  var w;
  const { width: r, height: i, margin: a } = t, { xAccessor: o, yAccessor: s } = n;
  if (e.length === 0)
    return { points: [], range: null };
  const c = e.map((F, T) => {
    const v = o(F, T), x = s(F, T), z = qa(v, T), B = xt(x, Number.NaN);
    return Number.isFinite(B) ? {
      index: T,
      data: F,
      xValue: z,
      yValue: B
    } : null;
  }).filter((F) => !!F);
  if (c.length === 0)
    return { points: [], range: null };
  const l = c.reduce((F, T) => Math.min(F, T.xValue), c[0].xValue), d = c.reduce((F, T) => Math.max(F, T.xValue), c[0].xValue), u = c.reduce((F, T) => Math.min(F, T.yValue), c[0].yValue), f = c.reduce((F, T) => Math.max(F, T.yValue), c[0].yValue), g = Math.max(r - a.left - a.right, 1), p = Math.max(i - a.top - a.bottom, 1), b = Number.isFinite(l) ? l : 0, _ = Number.isFinite(d) ? d : b + 1, h = Number.isFinite(u) ? u : 0, m = Number.isFinite(f) ? f : h + 1, y = xt((w = t.baseline) == null ? void 0 : w.value, null), S = y != null && Number.isFinite(y) ? Math.min(h, y) : h, N = y != null && Number.isFinite(y) ? Math.max(m, y) : m, A = Math.max(
    2,
    Math.min(
      6,
      Math.round(
        Math.max(i - a.top - a.bottom, 0) / 60
      ) || 4
    )
  ), { niceMin: P, niceMax: $ } = Za(
    S,
    N,
    A
  ), E = Number.isFinite(P) ? P : h, L = Number.isFinite($) ? $ : m, U = _ - b || 1, V = L - E || 1;
  return {
    points: c.map((F) => {
      const T = U === 0 ? 0.5 : (F.xValue - b) / U, v = V === 0 ? 0.5 : (F.yValue - E) / V, x = a.left + T * g, z = a.top + (1 - v) * p;
      return {
        ...F,
        x,
        y: z
      };
    }),
    range: {
      minX: b,
      maxX: _,
      minY: E,
      maxY: L,
      boundedWidth: g,
      boundedHeight: p
    }
  };
}
function br(e, t, n, r) {
  e.width = Number.isFinite(t) ? Number(t) : De, e.height = Number.isFinite(n) ? Number(n) : Ce, e.margin = {
    top: Number.isFinite(r == null ? void 0 : r.top) ? Number(r == null ? void 0 : r.top) : xe.top,
    right: Number.isFinite(r == null ? void 0 : r.right) ? Number(r == null ? void 0 : r.right) : xe.right,
    bottom: Number.isFinite(r == null ? void 0 : r.bottom) ? Number(r == null ? void 0 : r.bottom) : xe.bottom,
    left: Number.isFinite(r == null ? void 0 : r.left) ? Number(r == null ? void 0 : r.left) : xe.left
  };
}
function Ga(e, t) {
  const n = e.xFormatter(t.xValue, t.data, t.index), r = e.yFormatter(t.yValue, t.data, t.index);
  return e.tooltipRenderer({
    point: t,
    xFormatted: n,
    yFormatted: r,
    data: t.data,
    index: t.index
  });
}
function Ka(e, t, n) {
  const { tooltip: r, width: i, margin: a, height: o } = e;
  if (!r)
    return;
  const s = o - a.bottom;
  r.style.visibility = "visible", r.style.opacity = "1";
  const c = r.offsetWidth || 0, l = r.offsetHeight || 0, d = ge(t.x - c / 2, a.left, i - a.right - c), u = Math.max(s - l, 0), f = 12, g = Number.isFinite(n) ? ge(n ?? 0, a.top, s) : t.y;
  let p = g - l - f;
  p < a.top && (p = g + f), p = ge(p, 0, u);
  const b = J(Math.round(d)), _ = J(Math.round(p));
  r.style.transform = `translate(${b}, ${_})`;
}
function Et(e) {
  const { tooltip: t, focusLine: n, focusCircle: r } = e;
  t && (t.style.opacity = "0", t.style.visibility = "hidden"), n && (n.style.opacity = "0"), r && (r.style.opacity = "0");
}
function Ya(e, t) {
  if (t.handlersAttached || !t.overlay)
    return;
  const n = (i) => {
    if (t.points.length === 0 || !t.svg) {
      Et(t);
      return;
    }
    const a = t.svg.getBoundingClientRect(), o = i.clientX - a.left, s = i.clientY - a.top;
    let c = t.points[0], l = Math.abs(o - c.x);
    for (let d = 1; d < t.points.length; d += 1) {
      const u = t.points[d], f = Math.abs(o - u.x);
      f < l && (l = f, c = u);
    }
    t.focusCircle && (t.focusCircle.setAttribute("cx", c.x.toFixed(2)), t.focusCircle.setAttribute("cy", c.y.toFixed(2)), t.focusCircle.style.opacity = "1"), t.focusLine && (t.focusLine.setAttribute("x1", c.x.toFixed(2)), t.focusLine.setAttribute("x2", c.x.toFixed(2)), t.focusLine.setAttribute("y1", t.margin.top.toFixed(2)), t.focusLine.setAttribute(
      "y2",
      (t.height - t.margin.bottom).toFixed(2)
    ), t.focusLine.style.opacity = "1"), t.tooltip && (t.tooltip.innerHTML = Ga(t, c), Ka(t, c, s));
  }, r = () => {
    Et(t);
  };
  t.overlay.addEventListener("pointermove", n), t.overlay.addEventListener("pointerenter", n), t.overlay.addEventListener("pointerleave", r), t.handlersAttached = !0, t.handlePointerMove = n, t.handlePointerLeave = r, e.addEventListener("pointercancel", r);
}
function Xa(e, t = {}) {
  const n = document.createElement("div");
  n.className = "line-chart-container", n.dataset.chartType = "line", n.style.position = "relative";
  const r = fe("svg", {
    width: De,
    height: Ce,
    viewBox: `0 0 ${String(De)} ${String(Ce)}`,
    role: "img",
    "aria-hidden": "true",
    focusable: "false"
  });
  r.classList.add("line-chart-svg");
  const i = fe("path", {
    class: "line-chart-area",
    fill: Ft,
    stroke: "none"
  }), a = fe("line", {
    class: "line-chart-baseline",
    stroke: ur,
    "stroke-width": 1,
    "stroke-dasharray": dr,
    opacity: 0
  }), o = fe("path", {
    class: "line-chart-path",
    fill: "none",
    stroke: Ee,
    "stroke-width": 2,
    "stroke-linecap": "round",
    "stroke-linejoin": "round"
  }), s = fe("line", {
    class: "line-chart-focus-line",
    stroke: Ee,
    "stroke-width": 1,
    "stroke-dasharray": "4 4",
    opacity: 0
  }), c = fe("circle", {
    class: "line-chart-focus-circle",
    r: 4,
    fill: "#fff",
    stroke: Ee,
    "stroke-width": 2,
    opacity: 0
  }), l = fe("rect", {
    class: "line-chart-overlay",
    fill: "transparent",
    x: 0,
    y: 0,
    width: De,
    height: Ce
  });
  r.appendChild(i), r.appendChild(a), r.appendChild(o), r.appendChild(s), r.appendChild(c), r.appendChild(l), n.appendChild(r);
  const d = document.createElement("div");
  d.className = "chart-tooltip", d.style.position = "absolute", d.style.top = "0", d.style.left = "0", d.style.pointerEvents = "none", d.style.opacity = "0", d.style.visibility = "hidden", n.appendChild(d), e.appendChild(n);
  const u = _r(n);
  if (u.svg = r, u.areaPath = i, u.linePath = o, u.baselineLine = a, u.focusLine = s, u.focusCircle = c, u.overlay = l, u.tooltip = d, u.xAccessor = t.xAccessor ?? fr, u.yAccessor = t.yAccessor ?? gr, u.xFormatter = t.xFormatter ?? pr, u.yFormatter = t.yFormatter ?? hr, u.tooltipRenderer = t.tooltipRenderer ?? mr, u.color = t.color ?? Ee, u.areaColor = t.areaColor ?? Ft, u.baseline = t.baseline ?? null, u.handlersAttached = !1, !u.xAxis) {
    const f = document.createElement("div");
    f.className = "line-chart-axis line-chart-axis-x", f.style.position = "absolute", f.style.left = "0", f.style.right = "0", f.style.bottom = "0", f.style.pointerEvents = "none", f.style.fontSize = _n, f.style.color = "var(--secondary-text-color)", f.style.display = "block", n.appendChild(f), u.xAxis = f;
  }
  if (!u.yAxis) {
    const f = document.createElement("div");
    f.className = "line-chart-axis line-chart-axis-y", f.style.position = "absolute", f.style.top = "0", f.style.bottom = "0", f.style.left = "0", f.style.pointerEvents = "none", f.style.fontSize = _n, f.style.color = "var(--secondary-text-color)", f.style.display = "block", n.appendChild(f), u.yAxis = f;
  }
  return br(u, t.width, t.height, t.margin), o.setAttribute("stroke", u.color), s.setAttribute("stroke", u.color), c.setAttribute("stroke", u.color), i.setAttribute("fill", u.areaColor), yr(n, t), Ya(n, u), n;
}
function yr(e, t = {}) {
  if (!e) {
    console.error("updateLineChart: container element is required");
    return;
  }
  const n = _r(e);
  if (!n.svg || !n.linePath || !n.overlay) {
    console.error("updateLineChart: chart was not initialised with renderLineChart");
    return;
  }
  t.xAccessor && (n.xAccessor = t.xAccessor), t.yAccessor && (n.yAccessor = t.yAccessor), t.xFormatter && (n.xFormatter = t.xFormatter), t.yFormatter && (n.yFormatter = t.yFormatter), t.tooltipRenderer && (n.tooltipRenderer = t.tooltipRenderer), t.color && (n.color = t.color, n.linePath.setAttribute("stroke", n.color), n.focusLine && n.focusLine.setAttribute("stroke", n.color), n.focusCircle && n.focusCircle.setAttribute("stroke", n.color)), t.areaColor && (n.areaColor = t.areaColor, n.areaPath && n.areaPath.setAttribute("fill", n.areaColor)), Object.prototype.hasOwnProperty.call(t, "baseline") && (n.baseline = t.baseline ?? null), Wa(n), br(n, t.width, t.height, t.margin);
  const { width: r, height: i } = n;
  n.svg.setAttribute("width", String(r)), n.svg.setAttribute("height", String(i)), n.svg.setAttribute("viewBox", `0 0 ${String(r)} ${String(i)}`), n.overlay.setAttribute("x", "0"), n.overlay.setAttribute("y", "0"), n.overlay.setAttribute("width", Math.max(r, 0).toFixed(2)), n.overlay.setAttribute("height", Math.max(i, 0).toFixed(2)), Array.isArray(t.series) && (n.series = Array.from(t.series));
  const { points: a, range: o } = ja(n.series, n, {
    xAccessor: n.xAccessor,
    yAccessor: n.yAccessor
  });
  if (n.points = a, n.range = o, a.length === 0) {
    n.linePath.setAttribute("d", ""), n.areaPath && n.areaPath.setAttribute("d", ""), Et(n), _t(n), mt(n);
    return;
  }
  if (a.length === 1) {
    const c = a[0], l = Math.max(
      0.5,
      Math.min(4, Math.max(n.width - n.margin.left - n.margin.right, 1) * 0.01)
    ), d = `M${c.x.toFixed(2)} ${c.y.toFixed(2)} h${l.toFixed(2)}`;
    n.linePath.setAttribute("d", d), n.areaPath && n.areaPath.setAttribute("d", ""), n.focusCircle && (n.focusCircle.setAttribute("cx", c.x.toFixed(2)), n.focusCircle.setAttribute("cy", c.y.toFixed(2)), n.focusCircle.style.opacity = "1"), n.focusLine && (n.focusLine.style.opacity = "0"), _t(n), mt(n);
    return;
  }
  const s = Ba(a);
  if (n.linePath.setAttribute("d", s), n.areaPath && o) {
    const c = n.margin.top + o.boundedHeight, l = Oa(a, c);
    n.areaPath.setAttribute("d", l);
  }
  _t(n), mt(n);
}
function _t(e) {
  const { xAxis: t, yAxis: n, range: r, margin: i, height: a, yFormatter: o } = e;
  if (!t || !n)
    return;
  if (!r) {
    t.innerHTML = "", n.innerHTML = "";
    return;
  }
  const { minX: s, maxX: c, minY: l, maxY: d, boundedWidth: u, boundedHeight: f } = r, g = Number.isFinite(s) && Number.isFinite(c) && c >= s, p = Number.isFinite(l) && Number.isFinite(d) && d >= l, b = Math.max(u, 0), _ = Math.max(f, 0);
  if (t.style.left = J(i.left), t.style.width = J(b), t.style.top = J(a - i.bottom + 6), t.innerHTML = "", g && b > 0) {
    const m = (c - s) / Ua, y = Math.max(2, Math.min(6, Math.round(b / 140) || 4));
    Ja(e, s, c, y, m).forEach(({ positionRatio: N, label: A }) => {
      const P = document.createElement("div");
      P.className = "line-chart-axis-tick line-chart-axis-tick-x", P.style.position = "absolute", P.style.bottom = "0";
      const $ = ge(N, 0, 1);
      P.style.left = J($ * b);
      let E = "-50%", L = "center";
      $ <= 1e-3 ? (E = "0", L = "left", P.style.marginLeft = "2px") : $ >= 0.999 && (E = "-100%", L = "right", P.style.marginRight = "2px"), P.style.transform = `translateX(${E})`, P.style.textAlign = L, P.textContent = A, t.appendChild(P);
    });
  }
  n.style.top = J(i.top), n.style.height = J(_);
  const h = Math.max(i.left - 6, 0);
  if (n.style.left = "0", n.style.width = J(Math.max(h, 0)), n.innerHTML = "", p && _ > 0) {
    const m = Math.max(2, Math.min(6, Math.round(_ / 60) || 4)), y = Qa(l, d, m), S = o;
    y.forEach(({ value: N, positionRatio: A }) => {
      const P = document.createElement("div");
      P.className = "line-chart-axis-tick line-chart-axis-tick-y", P.style.position = "absolute", P.style.left = "0";
      const E = (1 - ge(A, 0, 1)) * _;
      P.style.top = J(E), P.textContent = S(N, null, -1), n.appendChild(P);
    });
  }
}
function Za(e, t, n = 4) {
  if (!Number.isFinite(e) || !Number.isFinite(t))
    return {
      niceMin: e,
      niceMax: t
    };
  const r = Math.max(2, n);
  if (t === e) {
    const l = Dt(Math.abs(e) || 1);
    return {
      niceMin: e - l,
      niceMax: t + l
    };
  }
  const a = (t - e) / (r - 1), o = Dt(a), s = Math.floor(e / o) * o, c = Math.ceil(t / o) * o;
  return s === c ? {
    niceMin: e,
    niceMax: t + o
  } : {
    niceMin: s,
    niceMax: c
  };
}
function Ja(e, t, n, r, i) {
  if (!Number.isFinite(t) || !Number.isFinite(n) || n < t)
    return [];
  if (!Number.isFinite(i) || i <= 0)
    return [
      {
        positionRatio: 0.5,
        label: bn(e, t, i || 0)
      }
    ];
  const a = Math.max(2, r), o = [], s = n - t;
  for (let c = 0; c < a; c += 1) {
    const l = a === 1 ? 0.5 : c / (a - 1), d = t + l * s;
    o.push({
      positionRatio: l,
      label: bn(e, d, i)
    });
  }
  return o;
}
function bn(e, t, n) {
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
function Qa(e, t, n) {
  if (!Number.isFinite(e) || !Number.isFinite(t))
    return [];
  if (t === e)
    return [
      {
        value: e,
        positionRatio: 0.5
      }
    ];
  const r = t - e, i = Math.max(2, n), a = r / (i - 1), o = Dt(a), s = Math.floor(e / o) * o, c = Math.ceil(t / o) * o, l = [];
  for (let d = s; d <= c + o / 2; d += o) {
    const u = (d - e) / (t - e);
    l.push({
      value: d,
      positionRatio: ge(u, 0, 1)
    });
  }
  return l.length > i + 2 ? l.filter((d, u) => u % 2 === 0) : l;
}
function Dt(e) {
  if (!Number.isFinite(e) || e === 0)
    return 1;
  const t = Math.floor(Math.log10(Math.abs(e))), n = Math.abs(e) / 10 ** t;
  let r;
  return n <= 1 ? r = 1 : n <= 2 ? r = 2 : n <= 5 ? r = 5 : r = 10, r * 10 ** t;
}
function eo(e) {
  return Array.isArray(e) && e.every((t) => typeof t == "string");
}
function to(e) {
  return typeof e == "object" && e !== null;
}
function no(e) {
  if (!to(e))
    return !1;
  const t = e;
  return typeof t.portfolioUuid != "string" ? !1 : eo(t.securityUuids);
}
function ro(e) {
  return e instanceof CustomEvent ? no(e.detail) : !1;
}
const bt = { min: 0, max: 6 }, Qe = { min: 2, max: 4 }, io = "1Y", vr = [
  "1M",
  "6M",
  "1Y",
  "5Y",
  "ALL"
], ao = {
  "1M": 30,
  "6M": 182,
  "1Y": 365,
  "5Y": 1826,
  ALL: Number.POSITIVE_INFINITY
}, yt = {
  aggregation: "Aggregationsdaten",
  totals: "Kaufsummen",
  eur_total: "EUR-Kaufsumme"
}, me = /* @__PURE__ */ new Map(), Ke = /* @__PURE__ */ new Map(), Ie = /* @__PURE__ */ new Map(), Sr = "pp-reader:portfolio-positions-updated", $e = /* @__PURE__ */ new Map();
function oo(e) {
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
function so(e, t) {
  if (e) {
    if (t) {
      Ie.set(e, t);
      return;
    }
    Ie.delete(e);
  }
}
function co(e) {
  if (!e || typeof window > "u")
    return null;
  if (Ie.has(e)) {
    const t = Ie.get(e) || null;
    if (t)
      return t;
  }
  return null;
}
function Pr(e) {
  return me.has(e) || me.set(e, /* @__PURE__ */ new Map()), me.get(e);
}
function Ar(e) {
  if (e && me.has(e)) {
    try {
      const t = me.get(e);
      t && t.clear();
    } catch (t) {
      console.warn("invalidateHistoryCache: Konnte Cache nicht leeren", e, t);
    }
    me.delete(e);
  }
}
function Nr(e) {
  e && Ie.delete(e);
}
function lo(e, t) {
  if (!e || !t)
    return;
  const n = t.securityUuids;
  (Array.isArray(n) ? n : []).includes(e) && (Ar(e), Nr(e));
}
function uo(e) {
  if (!e || $e.has(e))
    return;
  const t = (n) => {
    ro(n) && lo(e, n.detail);
  };
  try {
    window.addEventListener(Sr, t), $e.set(e, t);
  } catch (n) {
    console.error("ensureLiveUpdateSubscription: Registrierung fehlgeschlagen", n);
  }
}
function fo(e) {
  if (!e || !$e.has(e))
    return;
  const t = $e.get(e);
  try {
    t && window.removeEventListener(Sr, t);
  } catch (n) {
    console.error("removeLiveUpdateSubscription: Entfernen des Listeners fehlgeschlagen", n);
  }
  $e.delete(e);
}
function go(e) {
  e && (fo(e), Ar(e), Nr(e));
}
function yn(e, t) {
  if (!Ke.has(e)) {
    Ke.set(e, { activeRange: t });
    return;
  }
  const n = Ke.get(e);
  n && (n.activeRange = t);
}
function wr(e) {
  var t;
  return ((t = Ke.get(e)) == null ? void 0 : t.activeRange) ?? io;
}
function Ct(e) {
  const t = Date.UTC(
    e.getUTCFullYear(),
    e.getUTCMonth(),
    e.getUTCDate()
  );
  return Math.floor(t / 864e5);
}
function ve(e) {
  const t = new Date(e.getTime());
  return t.setUTCHours(0, 0, 0, 0), t;
}
function vn(e) {
  return !(e instanceof Date) || Number.isNaN(e.getTime()) ? null : Ct(ve(e));
}
function O(e) {
  return ne(e);
}
function po(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t || null;
}
function et(e) {
  const t = po(e);
  return t ? t.toUpperCase() : null;
}
function Fr(e, t = "Unbekannter Fehler") {
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
function xr(e, t) {
  const n = ve(t instanceof Date ? t : /* @__PURE__ */ new Date()), r = ao[e], i = vn(n), a = {};
  if (i != null && (a.end_date = i), Number.isFinite(r) && r > 0) {
    const o = new Date(n.getTime());
    o.setUTCDate(o.getUTCDate() - (r - 1));
    const s = vn(o);
    s != null && (a.start_date = s);
  }
  return a;
}
function Er(e) {
  if (!e)
    return null;
  if (e instanceof Date)
    return Number.isNaN(e.getTime()) ? null : new Date(e.getTime());
  if (typeof e == "number" && Number.isFinite(e)) {
    const t = Math.trunc(e);
    if (t >= 1e6 && t <= 99999999) {
      const n = Math.floor(t / 1e4), r = Math.floor(t % 1e4 / 100), i = t % 100, a = new Date(Date.UTC(n, r - 1, i));
      return Number.isNaN(a.getTime()) ? null : a;
    }
    if (t >= 0 && t <= 1e5) {
      const n = new Date(t * 864e5);
      return Number.isNaN(n.getTime()) ? null : ve(n);
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
          return ve(r);
      }
    }
    if (/^\d{8}$/.test(t)) {
      const n = Number.parseInt(t.slice(0, 4), 10), r = Number.parseInt(t.slice(4, 6), 10) - 1, i = Number.parseInt(t.slice(6, 8), 10);
      if (Number.isFinite(n) && Number.isFinite(r) && Number.isFinite(i)) {
        const a = new Date(Date.UTC(n, r, i));
        if (!Number.isNaN(a.getTime()))
          return a;
      }
    }
  }
  return null;
}
function tt(e) {
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
function Dr(e) {
  return Array.isArray(e) ? e.map((t) => {
    let r = O(t.close);
    if (r == null) {
      const a = O(t.close_raw);
      a != null && (r = a / 1e8);
    }
    return r == null ? null : {
      date: Er(t.date) ?? t.date,
      close: r
    };
  }).filter((t) => !!t) : [];
}
function Yt(e) {
  var r;
  const t = O(e == null ? void 0 : e.last_price_native) ?? O((r = e == null ? void 0 : e.last_price) == null ? void 0 : r.native) ?? null;
  if (C(t))
    return t;
  if (et(e == null ? void 0 : e.currency_code) === "EUR") {
    const i = O(e == null ? void 0 : e.last_price_eur);
    if (C(i))
      return i;
  }
  return null;
}
function ho(e) {
  if (!e)
    return null;
  const n = e.last_price_fetched_at, r = tt(n);
  if (r != null)
    return r;
  const i = e.last_price, a = i == null ? void 0 : i.fetched_at;
  return tt(a) ?? null;
}
function $t(e, t) {
  let n = [];
  Array.isArray(e) && (n = e.map((l) => ({
    ...l
  })));
  const r = n.slice(), i = Yt(t);
  if (!C(i))
    return r;
  const a = ho(t) ?? Date.now(), o = new Date(a);
  if (Number.isNaN(o.getTime()))
    return r;
  const s = Ct(ve(o));
  let c = null;
  for (let l = r.length - 1; l >= 0; l -= 1) {
    const d = r[l], u = Er(d.date);
    if (!u)
      continue;
    const f = Ct(ve(u));
    if (c == null && (c = f), f === s)
      return d.close !== i && (r[l] = { ...d, close: i }), r;
    if (f < s)
      break;
  }
  return c != null && c > s || r.push({
    date: o,
    close: i
  }), r;
}
function C(e) {
  return typeof e == "number" && Number.isFinite(e);
}
function vt(e) {
  return typeof e == "number" && Number.isFinite(e) && e > 0;
}
function Re(e, t, n) {
  if (!C(e) || !C(t))
    return !1;
  const r = Math.abs(e - t), i = Math.max(Math.abs(e), Math.abs(t), 1);
  return r <= i * 1e-4;
}
function mo(e, t) {
  return !C(t) || t === 0 || !C(e) ? null : Di((e - t) / t * 100);
}
function Cr(e, t) {
  if (e.length === 0)
    return { priceChange: null, priceChangePct: null };
  const n = e[0], r = O(n.close);
  if (!C(r) || r === 0)
    return { priceChange: null, priceChangePct: null };
  const i = e[e.length - 1], a = O(i.close), o = O(t) ?? a;
  if (!C(o))
    return { priceChange: null, priceChangePct: null };
  const s = o - r, c = Object.is(s, -0) ? 0 : s, l = mo(o, r);
  return { priceChange: c, priceChangePct: l };
}
function Xt(e, t) {
  if (!C(e) || e === 0)
    return "neutral";
  const n = 0.5 / Math.pow(10, t);
  return Math.abs(e) < n ? "neutral" : e > 0 ? "positive" : "negative";
}
function _o(e, t) {
  if (!C(e))
    return '<span class="value neutral">—</span>';
  const n = _e(e);
  if (n === "—")
    return '<span class="value neutral">—</span>';
  const r = Xt(e, Qe.max), i = t ? `&nbsp;${t}` : "";
  return `<span class="value ${r}">${n}${i}</span>`;
}
function bo(e) {
  return C(e) ? `<span class="value ${Xt(e, 2)} value--percentage">${ie(e)}&nbsp;%</span>` : '<span class="value neutral">—</span>';
}
function $r(e, t, n, r) {
  const i = e, a = i.length > 0 ? i : "Zeitraum";
  return `
    <div class="security-info-bar" data-range="${i}">
      <div class="security-info-item">
        <span class="label">Preisänderung (${a})</span>
        <div class="value-row">
          ${_o(t, r)}
          ${bo(n)}
        </div>
      </div>
    </div>
  `;
}
function yo(e) {
  return `
    <div class="security-range-selector" role="group" aria-label="Zeitraum">
      ${vr.map((n) => `
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
function Rr(e, t = { status: "empty" }) {
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
      const r = Fr(
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
function vo(e) {
  const t = O(e);
  if (t == null)
    return "—";
  const n = Math.abs(t % 1) > 0, r = n ? 2 : bt.min, i = n ? bt.max : bt.min;
  return t.toLocaleString("de-DE", {
    minimumFractionDigits: r,
    maximumFractionDigits: i
  });
}
function _e(e) {
  const t = O(e);
  return t == null ? "—" : t.toLocaleString("de-DE", {
    minimumFractionDigits: Qe.min,
    maximumFractionDigits: Qe.max
  });
}
function So(e, t) {
  const n = _e(e), r = `&nbsp;${t}`;
  return `<span class="${Xt(e, Qe.max)}">${n}${r}</span>`;
}
function Po(e) {
  return e == null ? "" : (typeof e == "string" ? e : String(e)).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function Ao(e, t, n) {
  const r = qe(e == null ? void 0 : e.average_cost), i = (r == null ? void 0 : r.account) ?? (C(t) ? t : O(t));
  if (!C(i))
    return null;
  const a = (e == null ? void 0 : e.account_currency_code) ?? (e == null ? void 0 : e.account_currency);
  if (typeof a == "string" && a.trim())
    return a.trim().toUpperCase();
  const o = et(e == null ? void 0 : e.currency_code) ?? "", s = (r == null ? void 0 : r.security) ?? (r == null ? void 0 : r.native) ?? (C(n) ? n : O(n)), c = Bn(e == null ? void 0 : e.aggregation);
  if (o && C(s) && Re(i, s))
    return o;
  const l = O(c == null ? void 0 : c.purchase_total_security) ?? O(e == null ? void 0 : e.purchase_total_security), d = O(c == null ? void 0 : c.purchase_total_account) ?? O(e == null ? void 0 : e.purchase_total_account);
  let u = null;
  if (C(l) && l !== 0 && C(d) && (u = d / l), (r == null ? void 0 : r.source) === "eur_total")
    return "EUR";
  const g = r == null ? void 0 : r.eur;
  if (C(g) && Re(i, g))
    return "EUR";
  const p = O(e == null ? void 0 : e.purchase_value_eur);
  return C(p) ? "EUR" : u != null && Re(u, 1) ? o || null : o === "EUR" ? "EUR" : o || "EUR";
}
function Sn(e) {
  return typeof e != "number" || !Number.isFinite(e) || e <= 0 ? null : e.toLocaleString("de-DE", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
  });
}
function No(e) {
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
  for (const a of n) {
    const o = t == null ? void 0 : t[a], s = tt(o);
    if (s != null)
      return s;
  }
  const r = [];
  t && "last_price_fetched_at" in t && r.push(t.last_price_fetched_at);
  const i = e == null ? void 0 : e.last_price;
  i && typeof i == "object" && r.push(i.fetched_at), t && "last_price_date" in t && r.push(t.last_price_date);
  for (const a of r) {
    const o = tt(a);
    if (o != null)
      return o;
  }
  return null;
}
function wo(e) {
  if (e == null || !Number.isFinite(e))
    return null;
  const t = new Date(e);
  return Number.isNaN(t.getTime()) ? null : t.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}
function Fo(e, t) {
  if (!e)
    return null;
  const n = et(e.currency_code) ?? "", r = qe(e.average_cost);
  if (!r || !n)
    return null;
  const i = r.native ?? r.security ?? null;
  let o = r.account ?? r.eur ?? null, s = et(t) ?? "";
  if (vt(r.eur) && (!s || s === n) && (o = r.eur, s = "EUR"), !n || !s || n === s || !vt(i) || !vt(o))
    return null;
  const c = o / i;
  if (!Number.isFinite(c) || c <= 0)
    return null;
  const l = Sn(c);
  if (!l)
    return null;
  let d = null;
  if (c > 0) {
    const m = 1 / c;
    Number.isFinite(m) && m > 0 && (d = Sn(m));
  }
  const u = No(e), f = wo(u), g = [`FX-Kurs (Kauf): 1 ${n} = ${l} ${s}`];
  d && g.push(`1 ${s} = ${d} ${n}`);
  const p = [], b = r.source, _ = b in yt ? yt[b] : yt.aggregation;
  if (p.push(`Quelle: ${_}`), C(r.coverage_ratio)) {
    const m = Math.min(Math.max(r.coverage_ratio * 100, 0), 100);
    p.push(
      `Abdeckung: ${m.toLocaleString("de-DE", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      })}%`
    );
  }
  p.length && g.push(...p);
  const h = f ?? "Datum unbekannt";
  return `${g.join(" · ")} (Stand: ${h})`;
}
function Pn(e) {
  if (!e)
    return null;
  const t = qe(e.average_cost), n = (t == null ? void 0 : t.native) ?? (t == null ? void 0 : t.security) ?? null;
  return C(n) ? n : null;
}
function An(e) {
  var G;
  if (!e)
    return '<div class="meta-error">Keine Snapshot-Daten verfügbar.</div>';
  const t = e.currency_code || "EUR", n = e.total_holdings_precise ?? e.total_holdings, r = vo(n), i = e.last_price_native ?? ((G = e.last_price) == null ? void 0 : G.native) ?? e.last_price_eur, a = _e(i), o = a === "—" ? null : `${a}${`&nbsp;${t}`}`, s = O(e.market_value_eur) ?? O(e.current_value_eur) ?? null, c = qe(e.average_cost), l = (c == null ? void 0 : c.native) ?? (c == null ? void 0 : c.security) ?? null, d = (c == null ? void 0 : c.eur) ?? null, f = (c == null ? void 0 : c.account) ?? null ?? d, g = ue(e.performance), p = (g == null ? void 0 : g.day_change) ?? null, b = (p == null ? void 0 : p.price_change_native) ?? null, _ = (p == null ? void 0 : p.price_change_eur) ?? null, h = C(b) ? b : _, m = C(b) ? t : "EUR", y = (I, W = "") => {
    const q = ["value"];
    return W && q.push(...W.split(" ").filter(Boolean)), `<span class="${q.join(" ")}">${I}</span>`;
  }, S = (I = "") => {
    const W = ["value--missing"];
    return I && W.push(I), y("—", W.join(" "));
  }, N = (I, W = "") => {
    if (!C(I))
      return S(W);
    const q = ["value--gain"];
    return W && q.push(W), y(di(I), q.join(" "));
  }, A = (I, W = "") => {
    if (!C(I))
      return S(W);
    const q = ["value--gain-percentage"];
    return W && q.push(W), y(fi(I), q.join(" "));
  }, P = o ? y(o, "value--price") : S("value--price"), $ = r === "—" ? S("value--holdings") : y(r, "value--holdings"), E = C(s) ? y(`${ie(s)}&nbsp;€`, "value--market-value") : S("value--market-value"), L = C(h) ? y(
    So(h, m),
    "value--gain value--absolute"
  ) : S("value--absolute"), U = A(
    p == null ? void 0 : p.change_pct,
    "value--percentage"
  ), V = N(
    g == null ? void 0 : g.total_change_eur,
    "value--absolute"
  ), D = A(
    g == null ? void 0 : g.total_change_pct,
    "value--percentage"
  ), w = Ao(
    e,
    f,
    l
  ), F = Fo(
    e,
    w
  ), T = F ? ` title="${Po(F)}"` : "", v = [], x = C(d);
  C(l) ? v.push(
    y(
      `${_e(l)}${`&nbsp;${t}`}`,
      "value--average value--average-native"
    )
  ) : v.push(
    S("value--average value--average-native")
  );
  let z = null, B = null;
  return x && (t !== "EUR" || !C(l) || !Re(d, l)) ? (z = d, B = "EUR") : C(f) && w && (w !== t || !Re(f, l ?? NaN)) && (z = f, B = w), z != null && C(z) && v.push(
    y(
      `${_e(z)}${B ? `&nbsp;${B}` : ""}`,
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
        <div class="value-group"${T}>
          ${v.join("")}
        </div>
      </div>
      <div class="security-meta-item security-meta-item--day-change">
        <span class="label">Tagesänderung</span>
        <div class="value-group">
          ${L}
          ${U}
        </div>
      </div>
      <div class="security-meta-item security-meta-item--total-change">
        <span class="label">Gesamtänderung</span>
        <div class="value-group">
          ${V}
          ${D}
        </div>
      </div>
      <div class="security-meta-item security-meta-item--holdings">
        <span class="label">Bestand</span>
        <div class="value-group">${$}</div>
      </div>
      <div class="security-meta-item security-meta-item--market-value">
        <span class="label">Marktwert (EUR)</span>
        <div class="value-group">${E}</div>
      </div>
    </div>
  `;
}
function Lr(e) {
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
function xo(e, t, {
  currency: n,
  baseline: r
} = {}) {
  const i = e.clientWidth || e.offsetWidth || 0, a = i > 0 ? i : 640, o = Math.min(Math.max(Math.floor(a * 0.5), 240), 440), s = (n || "").toUpperCase() || "EUR", c = C(r) ? r : null, l = Math.max(48, Math.min(72, Math.round(a * 0.075))), d = Math.max(28, Math.min(56, Math.round(a * 0.05))), u = Math.max(40, Math.min(64, Math.round(o * 0.14)));
  return {
    width: a,
    height: o,
    margin: {
      top: 18,
      right: d,
      bottom: u,
      left: l
    },
    series: t,
    yFormatter: (f) => _e(f),
    tooltipRenderer: ({ xFormatted: f, yFormatted: g }) => `
      <div class="chart-tooltip-date">${f}</div>
      <div class="chart-tooltip-value">${g}&nbsp;${s}</div>
    `,
    baseline: c != null ? {
      value: c
    } : null
  };
}
const Nn = /* @__PURE__ */ new WeakMap();
function Eo(e, t, n = {}) {
  if (t.length === 0)
    return;
  const r = xo(e, t, n);
  let i = Nn.get(e) ?? null;
  if (!i || !e.contains(i)) {
    e.innerHTML = "", i = Xa(e, r), i && Nn.set(e, i);
    return;
  }
  yr(i, r);
}
function wn(e, t) {
  e && (e.dataset.activeRange = t, e.querySelectorAll(".security-range-button").forEach((n) => {
    const i = n.dataset.range === t;
    n.classList.toggle("active", i), n.setAttribute("aria-pressed", i ? "true" : "false"), n.disabled = !1, n.classList.remove("loading");
  }));
}
function Do(e, t, n, r, i) {
  const a = e.querySelector(".security-info-bar");
  if (!a || !a.parentElement)
    return;
  const o = document.createElement("div");
  o.innerHTML = $r(t, n, r, i).trim();
  const s = o.firstElementChild;
  s && a.parentElement.replaceChild(s, a);
}
function Fn(e, t, n, r, i = {}) {
  const a = e.querySelector(".security-detail-placeholder");
  if (a && (a.innerHTML = `
    <h2>Historie</h2>
    ${Rr(t, n)}
  `, n.status === "loaded" && Array.isArray(r) && r.length)) {
    const o = a.querySelector(".history-chart");
    o && requestAnimationFrame(() => {
      Eo(o, r, i);
    });
  }
}
function Co(e) {
  const {
    root: t,
    hass: n,
    panelConfig: r,
    securityUuid: i,
    snapshot: a,
    initialRange: o,
    initialHistory: s,
    initialHistoryState: c
  } = e;
  setTimeout(() => {
    const l = t.querySelector(".security-range-selector");
    if (!l)
      return;
    const d = Pr(i), u = Pn(a);
    Array.isArray(s) && c.status !== "error" && d.set(o, s), uo(i), yn(i, o), wn(l, o);
    const g = $t(
      s,
      a
    );
    let p = c;
    p.status !== "error" && (p = g.length ? { status: "loaded" } : { status: "empty" }), Fn(
      t,
      o,
      p,
      g,
      {
        currency: a == null ? void 0 : a.currency_code,
        baseline: u
      }
    );
    const b = async (_) => {
      if (_ === wr(i))
        return;
      const h = l.querySelector(
        `.security-range-button[data-range="${_}"]`
      );
      h && (h.disabled = !0, h.classList.add("loading"));
      let m = d.get(_) ?? null, y = null, S = [];
      if (m)
        y = m.length ? { status: "loaded" } : { status: "empty" };
      else
        try {
          const E = xr(_), L = await Vn(
            n,
            r,
            i,
            E
          );
          m = Dr(L.prices), d.set(_, m), y = m.length ? { status: "loaded" } : { status: "empty" };
        } catch (E) {
          console.error("Range-Wechsel: Historie konnte nicht geladen werden", E), m = [], y = {
            status: "error",
            message: Lr(E) || "Die historischen Daten konnten aufgrund eines Fehlers nicht geladen werden."
          };
        }
      S = $t(m, a), y.status !== "error" && (y = S.length ? { status: "loaded" } : { status: "empty" });
      const N = Yt(a), { priceChange: A, priceChangePct: P } = Cr(
        S,
        N
      );
      yn(i, _), wn(l, _), Do(
        t,
        _,
        A,
        P,
        a == null ? void 0 : a.currency_code
      );
      const $ = Pn(a);
      Fn(
        t,
        _,
        y,
        S,
        {
          currency: a == null ? void 0 : a.currency_code,
          baseline: $
        }
      );
    };
    l.addEventListener("click", (_) => {
      var y;
      const h = (y = _.target) == null ? void 0 : y.closest(".security-range-button");
      if (!h || h.disabled)
        return;
      const { range: m } = h.dataset;
      !m || !vr.includes(m) || b(m);
    });
  }, 0);
}
async function $o(e, t, n, r) {
  if (!r)
    return console.error("renderSecurityDetail: securityUuid fehlt"), '<div class="card"><h2>Fehler</h2><p>Kein Wertpapier angegeben.</p></div>';
  const i = co(r);
  let a = null, o = null;
  try {
    const A = await Pi(
      t,
      n,
      r
    ), P = A.snapshot;
    a = P && typeof P == "object" ? P : A;
  } catch (A) {
    console.error("renderSecurityDetail: Snapshot konnte nicht geladen werden", A), o = Fr(A);
  }
  const s = a || i, c = !!(i && !a), l = ((s == null ? void 0 : s.source) ?? "") === "cache";
  r && so(r, s ?? null);
  const d = s && (c || l) ? oo({ fallbackUsed: c, flaggedAsCache: l }) : "", u = (s == null ? void 0 : s.name) || "Wertpapierdetails";
  if (o)
    return `
      ${Pt(
      u,
      An(s)
    ).outerHTML}
      ${d}
      <div class="card error-card">
        <h2>Fehler beim Laden</h2>
        <p>${o}</p>
      </div>
    `;
  const f = wr(r), g = Pr(r);
  let p = g.has(f) ? g.get(f) ?? null : null, b = { status: "empty" };
  if (Array.isArray(p))
    b = p.length ? { status: "loaded" } : { status: "empty" };
  else {
    p = [];
    try {
      const A = xr(f), P = await Vn(
        t,
        n,
        r,
        A
      );
      p = Dr(P.prices), g.set(f, p), b = p.length ? { status: "loaded" } : { status: "empty" };
    } catch (A) {
      console.error(
        "renderSecurityDetail: Historie konnte nicht geladen werden",
        A
      ), b = {
        status: "error",
        message: Lr(A) || "Die historischen Daten konnten aufgrund eines Fehlers nicht geladen werden."
      };
    }
  }
  const _ = $t(
    p,
    s
  );
  b.status !== "error" && (b = _.length ? { status: "loaded" } : { status: "empty" });
  const h = Pt(
    u,
    An(s)
  ), m = Yt(s), { priceChange: y, priceChangePct: S } = Cr(
    _,
    m
  ), N = $r(
    f,
    y,
    S,
    s == null ? void 0 : s.currency_code
  );
  return Co({
    root: e,
    hass: t,
    panelConfig: n,
    securityUuid: r,
    snapshot: s,
    initialRange: f,
    initialHistory: p,
    initialHistoryState: b
  }), `
    ${h.outerHTML}
    ${d}
    ${N}
    ${yo(f)}
    <div class="card security-detail-placeholder">
      <h2>Historie</h2>
      ${Rr(f, b)}
    </div>
  `;
}
function Ro(e) {
  const { setSecurityDetailTabFactory: t } = e;
  if (typeof t != "function") {
    console.error("registerSecurityDetailTab: Ungültige Factory-Funktion übergeben");
    return;
  }
  t((n) => ({
    title: "Wertpapier",
    render: (r, i, a) => $o(r, i, a, n),
    cleanup: () => {
      go(n);
    }
  }));
}
const Lo = ui, Rt = "pp-reader-sticky-anchor", nt = "overview", Lt = "security:", To = [
  { key: nt, title: "Dashboard", render: lr }
], Se = /* @__PURE__ */ new Map(), Ue = [], rt = /* @__PURE__ */ new Map();
let Tt = null, St = !1, be = null, H = 0, Fe = null;
function it(e) {
  return typeof e == "object" && e !== null;
}
function Tr(e) {
  return typeof e == "object" && e !== null && typeof e.then == "function";
}
function Mo(e) {
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
function ko(e) {
  return e === "accounts" || e === "last_file_update" || e === "portfolio_values" || e === "portfolio_positions";
}
function xn(e) {
  const t = e.portfolio_uuid;
  if (typeof t == "string" && t)
    return t;
  const n = e.portfolioUuid;
  return typeof n == "string" && n ? n : null;
}
function Ho(e) {
  if (!e)
    return null;
  if (Array.isArray(e)) {
    for (const t of e)
      if (it(t)) {
        const n = xn(t);
        if (n)
          return n;
      }
    return null;
  }
  return it(e) ? xn(e) : null;
}
function Io(e, t) {
  switch (e) {
    case "accounts":
      return {
        type: e,
        data: Array.isArray(t) ? t : null
      };
    case "last_file_update":
      return typeof t == "string" ? { type: e, data: t } : it(t) ? { type: e, data: t } : { type: e, data: null };
    case "portfolio_values":
      return Array.isArray(t) ? { type: e, data: t } : { type: e, data: null };
    case "portfolio_positions":
      return Array.isArray(t) ? { type: e, data: t } : it(t) ? { type: e, data: t } : { type: e, data: null };
    default:
      return null;
  }
}
function Zt(e) {
  return typeof e != "string" || !e.startsWith(Lt) ? null : e.slice(Lt.length) || null;
}
function Uo() {
  if (!be)
    return !1;
  const e = Ur(be);
  return e || (be = null), e;
}
function te() {
  const e = Ue.map((t) => Se.get(t)).filter((t) => !!t);
  return [...To, ...e];
}
function Vo(e) {
  const t = te();
  return e < 0 || e >= t.length ? null : t[e];
}
function Mr(e) {
  if (!e)
    return null;
  const t = e, n = t.ppreader ?? t.pp_reader;
  return n || (Object.values(t).find((i) => !i || typeof i != "object" ? !1 : i.webcomponent_name === "pp-reader-panel") ?? null);
}
function kr() {
  try {
    const e = ct();
    e && typeof e.rememberScrollPosition == "function" && e.rememberScrollPosition();
  } catch (e) {
    console.warn("rememberCurrentPageScroll: konnte Scroll-Position nicht sichern", e);
  }
}
function En(e) {
  const t = te();
  return !t.length || e < 0 ? 0 : e >= t.length ? t.length - 1 : e;
}
async function zo(e, t, n, r) {
  const i = te(), a = En(e);
  if (a === H) {
    e > H && Uo();
    return;
  }
  kr();
  const o = H >= 0 && H < i.length ? i[H] : null, s = o ? Zt(o.key) : null;
  let c = a;
  if (s) {
    const l = a >= 0 && a < i.length ? i[a] : null;
    if (l && l.key === nt && jo(s, { suppressRender: !0 })) {
      const f = te().findIndex((g) => g.key === nt);
      c = f >= 0 ? f : 0;
    }
  }
  if (!St) {
    St = !0;
    try {
      H = En(c);
      const l = H;
      await Vr(t, n, r), Wo(l);
    } catch (l) {
      console.error("navigateToPage: Fehler beim Rendern des Tabs", l);
    } finally {
      St = !1;
    }
  }
}
function at(e, t, n, r) {
  zo(H + e, t, n, r);
}
function qo(e, t) {
  if (!e || !t || typeof t.render != "function") {
    console.error("registerDetailTab: Ungültiger Tab-Descriptor", e, t);
    return;
  }
  const n = Zt(e);
  if (n) {
    const i = rt.get(n);
    i && i !== e && Hr(i);
  }
  const r = {
    ...t,
    key: e
  };
  Se.set(e, r), n && rt.set(n, e), Ue.includes(e) || Ue.push(e);
}
function Hr(e) {
  if (!e)
    return;
  const t = Se.get(e);
  if (t && typeof t.cleanup == "function")
    try {
      const i = t.cleanup({ key: e });
      Tr(i) && i.catch((a) => {
        console.error(
          "unregisterDetailTab: Fehler beim asynchronen cleanup",
          a
        );
      });
    } catch (i) {
      console.error("unregisterDetailTab: Fehler beim Ausführen von cleanup", i);
    }
  Se.delete(e);
  const n = Ue.indexOf(e);
  n >= 0 && Ue.splice(n, 1);
  const r = Zt(e);
  r && rt.get(r) === e && rt.delete(r);
}
function Oo(e) {
  return Se.has(e);
}
function Dn(e) {
  return Se.get(e) ?? null;
}
function Bo(e) {
  if (e != null && typeof e != "function") {
    console.error("setSecurityDetailTabFactory: Erwartet Funktion oder null", e);
    return;
  }
  Tt = e ?? null;
}
function Ir(e) {
  return `${Lt}${e}`;
}
function ct() {
  var t;
  for (const n of wi())
    if (n.isConnected)
      return n;
  const e = /* @__PURE__ */ new Set();
  for (const n of Fi())
    e.add(n);
  for (const n of e) {
    const r = (t = n.shadowRoot) == null ? void 0 : t.querySelector("pp-reader-dashboard");
    if (r)
      return r;
  }
  if (typeof document < "u") {
    const n = document.querySelector("pp-reader-dashboard");
    if (n)
      return n;
  }
  return null;
}
function Mt() {
  const e = ct();
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
const as = {
  findDashboardElement: ct
};
function Wo(e) {
  const t = ct();
  if (t && typeof t.handleExternalRender == "function")
    try {
      t.handleExternalRender(e);
    } catch (n) {
      console.warn("notifyExternalRender: Fehler beim Synchronisieren des Dashboards", n);
    }
}
function Ur(e) {
  if (!e)
    return console.error("openSecurityDetail: Ungültige securityUuid", e), !1;
  const t = Ir(e);
  let n = Dn(t);
  if (!n && typeof Tt == "function")
    try {
      const a = Tt(e);
      a && typeof a.render == "function" ? (qo(t, a), n = Dn(t)) : console.error("openSecurityDetail: Factory lieferte ungültigen Descriptor", a);
    } catch (a) {
      console.error("openSecurityDetail: Fehler beim Erzeugen des Tab-Descriptors", a);
    }
  if (!n)
    return console.warn(`openSecurityDetail: Kein Detail-Tab für ${e} verfügbar`), !1;
  kr();
  let i = te().findIndex((a) => a.key === t);
  return i === -1 && (i = te().findIndex((o) => o.key === t), i === -1) ? (console.error("openSecurityDetail: Tab nach Registrierung nicht auffindbar"), !1) : (H = i, be = null, Mt(), !0);
}
function jo(e, t = {}) {
  if (!e)
    return console.error("closeSecurityDetail: Ungültige securityUuid", e), !1;
  const { suppressRender: n = !1 } = t, r = Ir(e);
  if (!Oo(r))
    return !1;
  const a = te().findIndex((c) => c.key === r), o = a === H;
  Hr(r);
  const s = te();
  if (!s.length)
    return H = 0, n || Mt(), !0;
  if (be = e, o) {
    const c = s.findIndex((l) => l.key === nt);
    c >= 0 ? H = c : H = Math.min(Math.max(a - 1, 0), s.length - 1);
  } else H >= s.length && (H = Math.max(0, s.length - 1));
  return n || Mt(), !0;
}
async function Vr(e, t, n) {
  let r = n;
  r || (r = Mr(t ? t.panels : null));
  const i = te();
  H >= i.length && (H = Math.max(0, i.length - 1));
  const a = Vo(H);
  if (!a) {
    console.error("renderTab: Kein gültiger Tab oder keine render-Methode gefunden!");
    return;
  }
  let o;
  try {
    o = await a.render(e, t, r);
  } catch (d) {
    console.error("renderTab: Fehler beim Rendern des Tabs:", d), e.innerHTML = `<div class="card"><h2>Fehler</h2><pre>${Mo(d)}</pre></div>`;
    return;
  }
  e.innerHTML = o ?? "", a.render === lr && Kt(e);
  const c = await new Promise((d) => {
    const u = window.setInterval(() => {
      const f = e.querySelector(".header-card");
      f && (clearInterval(u), d(f));
    }, 50);
  });
  let l = e.querySelector(`#${Rt}`);
  if (!l) {
    l = document.createElement("div"), l.id = Rt;
    const d = c.parentNode;
    d && "insertBefore" in d && d.insertBefore(l, c);
  }
  Yo(e, t, n), Ko(e, t, n), Go(e);
}
function Go(e) {
  const t = e.querySelector(".header-card"), n = e.querySelector(`#${Rt}`);
  if (!t || !n) {
    console.error("Fehlende Elemente für das Scrollverhalten: headerCard oder anchor.");
    return;
  }
  Fe == null || Fe.disconnect(), Fe = new IntersectionObserver(
    ([r]) => {
      r.isIntersecting ? t.classList.remove("sticky") : t.classList.add("sticky");
    },
    {
      root: null,
      rootMargin: "0px 0px 0px 0px",
      threshold: 0
    }
  ), Fe.observe(n);
}
function Ko(e, t, n) {
  const r = e.querySelector(".header-card");
  if (!r) {
    console.error("Header-Card nicht gefunden!");
    return;
  }
  Lo(
    r,
    () => {
      at(1, e, t, n);
    },
    () => {
      at(-1, e, t, n);
    }
  );
}
function Yo(e, t, n) {
  const r = e.querySelector(".header-card");
  if (!r) {
    console.error("Header-Card nicht gefunden!");
    return;
  }
  const i = r.querySelector("#nav-left"), a = r.querySelector("#nav-right");
  if (!i || !a) {
    console.error("Navigationspfeile nicht gefunden!");
    return;
  }
  i.addEventListener("click", () => {
    at(-1, e, t, n);
  }), a.addEventListener("click", () => {
    at(1, e, t, n);
  }), Xo(r);
}
function Xo(e) {
  const t = e.querySelector("#nav-left"), n = e.querySelector("#nav-right");
  if (t && (H === 0 ? (t.disabled = !0, t.classList.add("disabled")) : (t.disabled = !1, t.classList.remove("disabled"))), n) {
    const r = te(), a = !(H === r.length - 1) || !!be;
    n.disabled = !a, n.classList.toggle("disabled", !a);
  }
}
class Zo extends HTMLElement {
  constructor() {
    super();
    K(this, "_root");
    K(this, "_hass", null);
    K(this, "_panel", null);
    K(this, "_narrow", null);
    K(this, "_route", null);
    K(this, "_lastPanel", null);
    K(this, "_lastNarrow", null);
    K(this, "_lastRoute", null);
    K(this, "_lastPage", null);
    K(this, "_scrollPositions", {});
    K(this, "_unsubscribeEvents", null);
    K(this, "_initialized", !1);
    K(this, "_hasNewData", !1);
    K(this, "_pendingUpdates", []);
    K(this, "_entryIdWaitWarned", !1);
    this._root = document.createElement("div"), this._root.className = "pp-reader-dashboard", this.appendChild(this._root);
  }
  set hass(n) {
    this._hass = n ?? null, this._checkInitialization();
  }
  set panel(n) {
    this._panel !== n && (this._panel = n ?? null, this._checkInitialization());
  }
  set narrow(n) {
    this._narrow !== (n ?? null) && (this._narrow = n ?? null, this._renderIfInitialized());
  }
  set route(n) {
    this._route !== (n ?? null) && (this._route = n ?? null, this._renderIfInitialized());
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
    this._panel || (this._panel = Mr(this._hass.panels ?? null));
    const n = an(this._hass, this._panel);
    if (!n) {
      this._entryIdWaitWarned || (console.warn("PPReaderDashboard: kein entry_id ermittelbar – warte auf Panel-Konfiguration."), this._entryIdWaitWarned = !0);
      return;
    }
    this._entryIdWaitWarned = !1, console.debug("PPReaderDashboard: entry_id (fallback) =", n), this._initialized = !0, this._initializeEventListeners(), this._render();
  }
  _initializeEventListeners() {
    var o;
    this._removeEventListeners();
    const n = (o = this._hass) == null ? void 0 : o.connection;
    if (!n || typeof n.subscribeEvents != "function") {
      console.error("PPReaderDashboard: keine valide WebSocket-Verbindung oder subscribeEvents fehlt");
      return;
    }
    const r = ["panels_updated"], i = [];
    Promise.all(
      r.map(async (s) => {
        try {
          const c = await n.subscribeEvents(
            this._handleBusEvent.bind(this),
            s
          );
          typeof c == "function" ? (i.push(c), console.debug("PPReaderDashboard: subscribed to", s)) : console.error(
            "PPReaderDashboard: subscribeEvents lieferte kein Unsubscribe-Func für",
            s,
            c
          );
        } catch (c) {
          console.error("PPReaderDashboard: Fehler bei subscribeEvents für", s, c);
        }
      })
    ).then(() => {
      this._unsubscribeEvents = () => {
        i.forEach((s) => {
          try {
            s();
          } catch {
          }
        }), console.debug("PPReaderDashboard: alle Event-Subscriptions entfernt");
      };
    }).catch((s) => {
      console.error("PPReaderDashboard: Fehler beim Registrieren der Events", s);
    });
  }
  _removeEventListeners() {
    if (typeof this._unsubscribeEvents == "function")
      try {
        this._unsubscribeEvents();
      } catch (n) {
        console.error("PPReaderDashboard: Fehler beim Entfernen der Event-Listener:", n);
      }
    this._unsubscribeEvents = null;
  }
  _handleBusEvent(n) {
    const r = an(this._hass, this._panel);
    if (!r)
      return;
    const i = n.data;
    if (!ko(i.data_type) || i.entry_id && i.entry_id !== r)
      return;
    const a = Io(i.data_type, i.data);
    a && (this._queueUpdate(a.type, a.data), this._doRender(a.type, a.data));
  }
  _doRender(n, r) {
    switch (n) {
      case "accounts":
        ma(
          r,
          this._root
        );
        break;
      case "last_file_update":
        wa(
          r,
          this._root
        );
        break;
      case "portfolio_values":
        ya(
          r,
          this._root
        );
        break;
      case "portfolio_positions":
        Pa(
          r,
          this._root
        );
        break;
      default:
        console.warn("PPReaderDashboard: Unbekannter Datentyp:", n);
        break;
    }
  }
  _queueUpdate(n, r) {
    const i = this._cloneData(r), a = {
      type: n,
      data: i
    };
    n === "portfolio_positions" && (a.portfolioUuid = Ho(
      i
    ));
    let o = -1;
    n === "portfolio_positions" && a.portfolioUuid ? o = this._pendingUpdates.findIndex(
      (s) => s.type === n && s.portfolioUuid === a.portfolioUuid
    ) : o = this._pendingUpdates.findIndex((s) => s.type === n), o >= 0 ? this._pendingUpdates[o] = a : this._pendingUpdates.push(a), this._hasNewData = !0;
  }
  _cloneData(n) {
    if (n == null)
      return n;
    try {
      if (typeof structuredClone == "function")
        return structuredClone(n);
    } catch (r) {
      console.warn("PPReaderDashboard: structuredClone fehlgeschlagen, falle auf JSON zurück", r);
    }
    try {
      return JSON.parse(JSON.stringify(n));
    } catch (r) {
      return console.warn("PPReaderDashboard: JSON-Clone fehlgeschlagen, referenziere Originaldaten", r), n;
    }
  }
  _reapplyPendingUpdates() {
    if (!(!Array.isArray(this._pendingUpdates) || this._pendingUpdates.length === 0))
      for (const n of this._pendingUpdates)
        try {
          this._doRender(n.type, this._cloneData(n.data));
        } catch (r) {
          console.error("PPReaderDashboard: Fehler beim erneuten Anwenden eines Updates", n, r);
        }
  }
  _renderIfInitialized() {
    this._initialized && this._render();
  }
  handleExternalRender(n) {
    this._afterRender(n);
  }
  rememberScrollPosition(n = H) {
    const r = Number.isInteger(n) ? n : H;
    this._scrollPositions[r] = this._root.scrollTop || 0;
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
    const n = H;
    if (!this._hasNewData && this._panel === this._lastPanel && this._narrow === this._lastNarrow && this._route === this._lastRoute && this._lastPage === n)
      return;
    this._lastPage != null && (this._scrollPositions[this._lastPage] = this._root.scrollTop);
    const r = Vr(this._root, this._hass, this._panel);
    if (Tr(r)) {
      r.then(() => {
        this._afterRender(n);
      }).catch((i) => {
        console.error("PPReaderDashboard: Fehler beim Rendern des Tabs", i), this._afterRender(n);
      });
      return;
    }
    this._afterRender(n);
  }
  _afterRender(n) {
    const r = this._scrollPositions[n] || 0;
    this._root.scrollTop = r, this._lastPanel = this._panel, this._lastNarrow = this._narrow, this._lastRoute = this._route, this._lastPage = n;
    try {
      this._reapplyPendingUpdates();
    } catch (i) {
      console.error("PPReaderDashboard: Fehler beim Wiederanlegen der Updates", i);
    }
    this._hasNewData = !1;
  }
}
customElements.get("pp-reader-dashboard") || customElements.define("pp-reader-dashboard", Zo);
console.log("PPReader dashboard module v20250914b geladen");
Ro({
  setSecurityDetailTabFactory: Bo
});
export {
  as as __TEST_ONLY_DASHBOARD,
  is as __TEST_ONLY__,
  jo as closeSecurityDetail,
  Gt as flushPendingPositions,
  Dn as getDetailTabDescriptor,
  Pa as handlePortfolioPositionsUpdate,
  Oo as hasDetailTab,
  Ur as openSecurityDetail,
  rs as reapplyPositionsSort,
  Qo as registerDashboardElement,
  qo as registerDetailTab,
  ts as registerPanelHost,
  Bo as setSecurityDetailTabFactory,
  es as unregisterDashboardElement,
  Hr as unregisterDetailTab,
  ns as unregisterPanelHost,
  cr as updatePortfolioFooterFromDom
};
//# sourceMappingURL=dashboard.DIcWl6Pt.js.map
