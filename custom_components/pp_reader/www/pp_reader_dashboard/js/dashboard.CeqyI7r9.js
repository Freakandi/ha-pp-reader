var qr = Object.defineProperty;
var Br = (e, t, n) => t in e ? qr(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : e[t] = n;
var q = (e, t, n) => Br(e, typeof t != "symbol" ? t + "" : t, n);
function Bt(e, t) {
  try {
    t();
  } catch (n) {
    console.warn(`addSwipeEvents: ${e} handler threw`, n);
  }
}
function Or(e, t, n) {
  let r = null;
  const i = (l) => {
    l < -50 ? Bt("left", t) : l > 50 && Bt("right", n);
  }, o = (l) => {
    l.touches.length === 1 && (r = l.touches[0].clientX);
  }, a = (l) => {
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
  e.addEventListener("touchstart", o, { passive: !0 }), e.addEventListener("touchend", a, { passive: !0 }), e.addEventListener("mousedown", s), e.addEventListener("mouseup", c);
}
const Ft = (e, t) => {
  if (!Number.isFinite(e) || e === 0)
    return "neutral";
  const n = 0.5 / Math.pow(10, t);
  return Math.abs(e) < n ? "neutral" : e > 0 ? "positive" : "negative";
};
function I(e, t, n = void 0, r = void 0) {
  let i = null;
  const o = (c) => {
    if (typeof c == "number")
      return c;
    if (typeof c == "string" && c.trim() !== "") {
      const l = c.replace(/\s+/g, "").replace(/[^0-9,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."), d = Number.parseFloat(l);
      return Number.isNaN(d) ? Number.NaN : d;
    }
    return Number.NaN;
  }, a = (c, l = 2, d = 2) => {
    const f = typeof c == "number" ? c : o(c);
    return Number.isFinite(f) ? f.toLocaleString("de-DE", {
      minimumFractionDigits: l,
      maximumFractionDigits: d
    }) : "";
  }, s = (c = "") => {
    const l = c || "Kein Wert verfügbar";
    return `<span class="missing-value" role="note" aria-label="${l}" title="${l}">—</span>`;
  };
  if (["gain_abs", "gain_pct"].includes(e)) {
    if (t == null && n) {
      const u = n.performance;
      if (typeof u == "object" && u !== null) {
        const p = u[e];
        typeof p == "number" && (t = p);
      }
    }
    const c = (n == null ? void 0 : n.fx_unavailable) === !0 ? "Wechselkurs nicht verfügbar – EUR-Wert unbekannt" : "";
    if (t == null || (r == null ? void 0 : r.hasValue) === !1)
      return s(c);
    const l = typeof t == "number" ? t : o(t);
    if (!Number.isFinite(l))
      return s(c);
    const d = e === "gain_pct" ? "%" : "€";
    return i = a(l) + `&nbsp;${d}`, `<span class="${Ft(l, 2)}">${i}</span>`;
  } else if (e === "position_count") {
    const c = typeof t == "number" ? t : o(t);
    if (!Number.isFinite(c))
      return s();
    i = c.toLocaleString("de-DE");
  } else if (["balance", "current_value", "purchase_value"].includes(e)) {
    const c = typeof t == "number" ? t : o(t);
    if (!Number.isFinite(c))
      return n != null && n.fx_unavailable ? s("Wechselkurs nicht verfügbar – EUR-Wert unbekannt") : (r && r.hasValue === !1, s());
    i = a(c) + "&nbsp;€";
  } else if (e === "current_holdings") {
    const c = typeof t == "number" ? t : o(t);
    if (!Number.isFinite(c))
      return s();
    const l = Math.abs(c % 1) > 0;
    i = c.toLocaleString("de-DE", {
      minimumFractionDigits: l ? 2 : 0,
      maximumFractionDigits: 4
    });
  } else {
    let c = "";
    typeof t == "string" ? c = t : typeof t == "number" && Number.isFinite(t) ? c = t.toString() : typeof t == "boolean" ? c = t ? "true" : "false" : t instanceof Date && Number.isFinite(t.getTime()) && (c = t.toISOString()), i = c, i && (i.length > 60 && (i = i.slice(0, 59) + "…"), i.startsWith("Kontostand ") ? i = i.substring(11) : i.startsWith("Depotwert ") && (i = i.substring(10)));
  }
  return typeof i != "string" || i === "" ? s() : i;
}
function ne(e, t, n = [], r = {}) {
  const { sortable: i = !1, defaultSort: o } = r, a = (o == null ? void 0 : o.key) ?? "", s = (o == null ? void 0 : o.dir) === "desc" ? "desc" : "asc", c = (g) => {
    if (g == null)
      return "";
    let h = "";
    if (typeof g == "string")
      h = g;
    else if (typeof g == "number" && Number.isFinite(g))
      h = g.toString();
    else if (typeof g == "boolean")
      h = g ? "true" : "false";
    else if (g instanceof Date && Number.isFinite(g.getTime()))
      h = g.toISOString();
    else
      return "";
    return h.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  };
  let l = "<table><thead><tr>";
  t.forEach((g) => {
    const h = g.align === "right" ? ' class="align-right"' : "";
    i && g.key ? l += `<th${h} data-sort-key="${g.key}">${g.label}</th>` : l += `<th${h}>${g.label}</th>`;
  }), l += "</tr></thead><tbody>", e.forEach((g) => {
    l += "<tr>", t.forEach((h) => {
      const y = h.align === "right" ? ' class="align-right"' : "";
      l += `<td${y}>${I(h.key, g[h.key], g)}</td>`;
    }), l += "</tr>";
  });
  const d = {}, f = {};
  t.forEach((g) => {
    if (n.includes(g.key)) {
      const h = e.reduce(
        (y, v) => {
          let P = v[g.key];
          if ((g.key === "gain_abs" || g.key === "gain_pct") && (typeof P != "number" || !Number.isFinite(P))) {
            const A = v.performance;
            if (typeof A == "object" && A !== null) {
              const N = A[g.key];
              typeof N == "number" && (P = N);
            }
          }
          if (typeof P == "number" && Number.isFinite(P)) {
            const A = P;
            y.total += A, y.hasValue = !0;
          }
          return y;
        },
        { total: 0, hasValue: !1 }
      );
      h.hasValue ? (d[g.key] = h.total, f[g.key] = { hasValue: !0 }) : (d[g.key] = null, f[g.key] = { hasValue: !1 });
    }
  });
  const u = d.gain_abs ?? null;
  if (u != null) {
    const g = d.purchase_value ?? null;
    if (g != null && g > 0)
      d.gain_pct = u / g * 100;
    else {
      const h = d.current_value ?? null;
      h != null && h !== 0 && (d.gain_pct = u / (h - u) * 100);
    }
  }
  const p = Number.isFinite(d.gain_pct ?? NaN) ? d.gain_pct : null;
  let m = "", b = "neutral";
  if (p != null && (m = `${Y(p)} %`, p > 0 ? b = "positive" : p < 0 && (b = "negative")), l += '<tr class="footer-row">', t.forEach((g, h) => {
    const y = g.align === "right" ? ' class="align-right"' : "";
    if (h === 0) {
      l += `<td${y}>Summe</td>`;
      return;
    }
    if (d[g.key] != null) {
      let P = "";
      g.key === "gain_abs" && m && (P = ` data-gain-pct="${c(m)}" data-gain-sign="${c(b)}"`), l += `<td${y}${P}>${I(g.key, d[g.key], void 0, f[g.key])}</td>`;
      return;
    }
    if (g.key === "gain_pct" && d.gain_pct != null) {
      l += `<td${y}>${I("gain_pct", d.gain_pct, void 0, f[g.key])}</td>`;
      return;
    }
    const v = f[g.key] ?? { hasValue: !1 };
    l += `<td${y}>${I(g.key, null, void 0, v)}</td>`;
  }), l += "</tr>", l += "</tbody></table>", i)
    try {
      const g = document.createElement("template");
      g.innerHTML = l.trim();
      const h = g.content.querySelector("table");
      if (h)
        return h.classList.add("sortable-table"), a && (h.dataset.defaultSort = a, h.dataset.defaultDir = s), h.outerHTML;
    } catch (g) {
      console.warn("makeTable(sortable): Injection fehlgeschlagen:", g);
    }
  return l;
}
function Ue(e, t) {
  const n = document.createElement("div");
  return n.className = "header-card", n.innerHTML = `
    <div class="header-content">
      <button id="nav-left" class="nav-arrow" aria-label="Vorherige Seite">
        <svg viewBox="0 0 24 24">
          <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"></path>
        </svg>
      </button>
      <h1 id="headerTitle">${e}</h1>
      <button id="nav-right" class="nav-arrow" aria-label="Nächste Seite">
        <svg viewBox="0 0 24 24">
          <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"></path>
        </svg>
      </button>
    </div>
    <div id="headerMeta" class="meta">${t}</div>
  `, n;
}
function Y(e, t = 2, n = 2) {
  return (Number.isNaN(e) ? 0 : e).toLocaleString("de-DE", {
    minimumFractionDigits: t,
    maximumFractionDigits: n
  });
}
function Wr(e) {
  const t = Number.isNaN(e) ? 0 : e;
  return `<span class="${Ft(t, 2)}">${Y(t)}&nbsp;€</span>`;
}
function Kr(e) {
  const t = Number.isNaN(e) ? 0 : e;
  return `<span class="${Ft(t, 2)}">${Y(t)}&nbsp;%</span>`;
}
function Sn(e, t, n = "asc", r = !1) {
  if (!e)
    return [];
  const i = e.querySelector("tbody");
  if (!i)
    return [];
  const o = i.querySelector("tr.footer-row"), a = Array.from(i.querySelectorAll("tr")).filter((d) => d !== o);
  let s = -1;
  if (r) {
    const f = {
      name: 0,
      current_holdings: 1,
      purchase_value: 2,
      current_value: 3,
      gain_abs: 4,
      gain_pct: 5
    }[t];
    typeof f == "number" && (s = f);
  } else {
    const d = Array.from(e.querySelectorAll("thead th"));
    for (let f = 0; f < d.length; f++)
      if (d[f].getAttribute("data-sort-key") === t) {
        s = f;
        break;
      }
  }
  if (s < 0)
    return a;
  const c = (d) => {
    const f = d.replace(/\u00A0/g, " ").replace(/[%€]/g, "").replace(/\./g, "").replace(/,/g, ".").replace(/[^\d.-]/g, "").trim();
    if (!f) return NaN;
    const u = parseFloat(f);
    return Number.isFinite(u) ? u : NaN;
  };
  a.sort((d, f) => {
    const u = d.cells.item(s), p = f.cells.item(s), m = ((u == null ? void 0 : u.textContent) ?? "").trim(), b = ((p == null ? void 0 : p.textContent) ?? "").trim(), g = c(m), h = c(b);
    let y;
    const v = /[0-9]/.test(m) || /[0-9]/.test(b);
    return !Number.isNaN(g) && !Number.isNaN(h) && v ? y = g - h : y = m.localeCompare(b, "de", { sensitivity: "base" }), n === "asc" ? y : -y;
  }), a.forEach((d) => i.appendChild(d)), o && i.appendChild(o), e.querySelectorAll("thead th.sort-active").forEach((d) => {
    d.classList.remove("sort-active", "dir-asc", "dir-desc");
  });
  const l = e.querySelector(`thead th[data-sort-key="${t}"]`);
  return l && l.classList.add("sort-active", n === "asc" ? "dir-asc" : "dir-desc"), a;
}
function re(e) {
  return typeof e == "object" && e !== null;
}
function U(e) {
  return typeof e == "string" ? e : null;
}
function De(e) {
  return e === null ? null : U(e);
}
function z(e) {
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
function Ot(e) {
  const t = z(e);
  if (t == null)
    return null;
  const n = Math.trunc(t);
  return Number.isFinite(n) ? n : null;
}
function Ce(e) {
  return re(e) ? { ...e } : null;
}
function Pn(e) {
  return re(e) ? { ...e } : null;
}
function An(e) {
  return typeof e == "boolean" ? e : void 0;
}
function Gr(e) {
  if (!re(e))
    return null;
  const t = U(e.name), n = U(e.currency_code), r = z(e.orig_balance);
  if (!t || !n || r == null)
    return null;
  const i = e.balance === null ? null : z(e.balance), o = {
    uuid: U(e.uuid) ?? void 0,
    name: t,
    currency_code: n,
    orig_balance: r,
    balance: i ?? null
  }, a = z(e.fx_rate);
  a != null && (o.fx_rate = a);
  const s = U(e.fx_rate_source);
  s && (o.fx_rate_source = s);
  const c = U(e.fx_rate_timestamp);
  c && (o.fx_rate_timestamp = c);
  const l = z(e.coverage_ratio);
  l != null && (o.coverage_ratio = l);
  const d = U(e.provenance);
  d && (o.provenance = d);
  const f = De(e.metric_run_uuid);
  f !== null && (o.metric_run_uuid = f);
  const u = An(e.fx_unavailable);
  return typeof u == "boolean" && (o.fx_unavailable = u), o;
}
function Nn(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = Gr(n);
    r && t.push(r);
  }
  return t;
}
function jr(e) {
  if (!re(e))
    return null;
  const t = U(e.security_uuid), n = U(e.name), r = z(e.current_holdings), i = z(e.purchase_value), o = z(e.current_value);
  if (!t || !n || r == null || i == null || o == null)
    return null;
  const a = {
    portfolio_uuid: U(e.portfolio_uuid) ?? void 0,
    security_uuid: t,
    name: n,
    currency_code: U(e.currency_code),
    current_holdings: r,
    purchase_value: i,
    current_value: o,
    average_cost: Ce(e.average_cost),
    performance: Ce(e.performance),
    aggregation: Ce(e.aggregation),
    data_state: Pn(e.data_state)
  }, s = z(e.coverage_ratio);
  s != null && (a.coverage_ratio = s);
  const c = U(e.provenance);
  c && (a.provenance = c);
  const l = De(e.metric_run_uuid);
  l !== null && (a.metric_run_uuid = l);
  const d = z(e.last_price_native);
  d != null && (a.last_price_native = d);
  const f = z(e.last_price_eur);
  f != null && (a.last_price_eur = f);
  const u = z(e.last_close_native);
  u != null && (a.last_close_native = u);
  const p = z(e.last_close_eur);
  return p != null && (a.last_close_eur = p), a;
}
function Fn(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = jr(n);
    r && t.push(r);
  }
  return t;
}
function wn(e) {
  if (!re(e))
    return null;
  const t = U(e.name), n = z(e.current_value ?? e.value);
  if (!t || n == null)
    return null;
  const i = z(e.purchase_value ?? e.purchase_sum ?? e.purchaseSum) ?? 0, o = {
    uuid: U(e.uuid) ?? void 0,
    name: t,
    current_value: n,
    purchase_value: i,
    purchase_sum: i,
    position_count: Ot(e.position_count ?? e.count) ?? void 0,
    missing_value_positions: Ot(e.missing_value_positions) ?? void 0,
    has_current_value: An(e.has_current_value),
    performance: Ce(e.performance),
    coverage_ratio: z(e.coverage_ratio) ?? void 0,
    provenance: U(e.provenance) ?? void 0,
    metric_run_uuid: De(e.metric_run_uuid) ?? void 0,
    data_state: Pn(e.data_state)
  };
  return Array.isArray(e.positions) && (o.positions = Fn(e.positions)), o;
}
function xn(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = wn(n);
    r && t.push(r);
  }
  return t;
}
function En(e) {
  if (!re(e))
    return null;
  const t = { ...e }, n = De(e.metric_run_uuid);
  n !== null ? t.metric_run_uuid = n : delete t.metric_run_uuid;
  const r = z(e.coverage_ratio);
  r != null ? t.coverage_ratio = r : delete t.coverage_ratio;
  const i = U(e.provenance);
  i ? t.provenance = i : delete t.provenance;
  const o = U(e.generated_at ?? e.snapshot_generated_at);
  return o ? t.generated_at = o : delete t.generated_at, t;
}
function Yr(e) {
  if (!re(e))
    return null;
  const t = { ...e }, n = En(e.normalized_payload);
  return n ? t.normalized_payload = n : "normalized_payload" in t && delete t.normalized_payload, t;
}
function Dn(e) {
  if (!re(e))
    return null;
  const t = U(e.generated_at);
  if (!t)
    return null;
  const n = De(e.metric_run_uuid), r = Nn(e.accounts), i = xn(e.portfolios), o = Yr(e.diagnostics), a = {
    generated_at: t,
    metric_run_uuid: n,
    accounts: r,
    portfolios: i
  };
  return o && (a.diagnostics = o), a;
}
function Wt(e) {
  return typeof e == "string" ? e : null;
}
function Xr(e) {
  if (typeof e == "string")
    return e;
  if (e === null)
    return null;
}
function Zr(e) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
}
function Kt(e, t) {
  if (typeof e == "string")
    return e;
  throw new Error(`mapPositionSnapshotToRecord: fehlendes ${t}`);
}
function rt(e, t) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  throw new Error(`mapPositionSnapshotToRecord: fehlendes ${t}`);
}
function Jr(e) {
  const t = Kt(e.security_uuid, "security_uuid"), n = Kt(e.name, "name"), r = rt(e.current_holdings, "current_holdings"), i = rt(e.purchase_value, "purchase_value"), o = rt(e.current_value, "current_value"), a = {
    security_uuid: t,
    name: n,
    current_holdings: r,
    purchase_value: i,
    current_value: o,
    average_cost: e.average_cost ?? null,
    performance: e.performance ?? null,
    aggregation: e.aggregation ?? null
  };
  return e.currency_code !== void 0 && (a.currency_code = e.currency_code), e.coverage_ratio != null && (a.coverage_ratio = e.coverage_ratio), e.provenance && (a.provenance = e.provenance), e.metric_run_uuid !== void 0 && (a.metric_run_uuid = e.metric_run_uuid), e.last_price_native != null && (a.last_price_native = e.last_price_native), e.last_price_eur != null && (a.last_price_eur = e.last_price_eur), e.last_close_native != null && (a.last_close_native = e.last_close_native), e.last_close_eur != null && (a.last_close_eur = e.last_close_eur), e.data_state && (a.data_state = e.data_state), e.portfolio_uuid && (a.portfolio_uuid = e.portfolio_uuid), a;
}
function se(e, t) {
  var r, i, o, a, s, c, l, d;
  let n = ((r = t == null ? void 0 : t.config) == null ? void 0 : r.entry_id) ?? (t == null ? void 0 : t.entry_id) ?? ((a = (o = (i = t == null ? void 0 : t.config) == null ? void 0 : i._panel_custom) == null ? void 0 : o.config) == null ? void 0 : a.entry_id) ?? void 0;
  if (!n && (e != null && e.panels)) {
    const f = e.panels, u = f.ppreader ?? f.pp_reader ?? Object.values(f).find(
      (p) => (p == null ? void 0 : p.webcomponent_name) === "pp-reader-panel"
    );
    n = ((s = u == null ? void 0 : u.config) == null ? void 0 : s.entry_id) ?? (u == null ? void 0 : u.entry_id) ?? ((d = (l = (c = u == null ? void 0 : u.config) == null ? void 0 : c._panel_custom) == null ? void 0 : l.config) == null ? void 0 : d.entry_id) ?? void 0;
  }
  return n ?? void 0;
}
function Gt(e, t) {
  return se(e, t);
}
async function Rn(e, t) {
  if (!e)
    throw new Error("fetchAccountsWS: fehlendes hass");
  const n = se(e, t);
  if (!n)
    throw new Error("fetchAccountsWS: fehlendes entry_id");
  const r = await e.connection.sendMessagePromise({
    type: "pp_reader/get_accounts",
    entry_id: n
  }), i = Nn(r.accounts), o = Dn(r.normalized_payload);
  return {
    accounts: i,
    normalized_payload: o
  };
}
async function Qr(e, t) {
  if (!e)
    throw new Error("fetchLastFileUpdateWS: fehlendes hass");
  const n = se(e, t);
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
async function ei(e, t) {
  if (!e)
    throw new Error("fetchPortfoliosWS: fehlendes hass");
  const n = se(e, t);
  if (!n)
    throw new Error("fetchPortfoliosWS: fehlendes entry_id");
  const r = await e.connection.sendMessagePromise({
    type: "pp_reader/get_portfolio_data",
    entry_id: n
  }), i = xn(r.portfolios), o = Dn(r.normalized_payload);
  return {
    portfolios: i,
    normalized_payload: o
  };
}
async function $n(e, t, n) {
  if (!e)
    throw new Error("fetchPortfolioPositionsWS: fehlendes hass");
  const r = se(e, t);
  if (!r)
    throw new Error("fetchPortfolioPositionsWS: fehlendes entry_id");
  if (!n)
    throw new Error("fetchPortfolioPositionsWS: fehlendes portfolio_uuid");
  const i = await e.connection.sendMessagePromise({
    type: "pp_reader/get_portfolio_positions",
    entry_id: r,
    portfolio_uuid: n
  }), a = Fn(i.positions).map(Jr), s = En(i.normalized_payload), c = {
    portfolio_uuid: Wt(i.portfolio_uuid) ?? n,
    positions: a
  };
  typeof i.error == "string" && (c.error = i.error);
  const l = Zr(i.coverage_ratio);
  l !== void 0 && (c.coverage_ratio = l);
  const d = Wt(i.provenance);
  d && (c.provenance = d);
  const f = Xr(i.metric_run_uuid);
  return f !== void 0 && (c.metric_run_uuid = f), s && (c.normalized_payload = s), c;
}
async function ti(e, t, n) {
  if (!e)
    throw new Error("fetchSecuritySnapshotWS: fehlendes hass");
  const r = se(e, t);
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
async function Ln(e, t, n, r = {}) {
  if (!e)
    throw new Error("fetchSecurityHistoryWS: fehlendes hass");
  const i = se(e, t);
  if (!i)
    throw new Error("fetchSecurityHistoryWS: fehlendes entry_id");
  if (!n)
    throw new Error("fetchSecurityHistoryWS: fehlendes securityUuid");
  const o = {
    type: "pp_reader/get_security_history",
    entry_id: i,
    security_uuid: n
  }, { startDate: a, endDate: s, start_date: c, end_date: l } = r || {}, d = a ?? c;
  d != null && (o.start_date = d);
  const f = s ?? l;
  return f != null && (o.end_date = f), e.connection.sendMessagePromise(o);
}
const ni = /* @__PURE__ */ new Set(), ri = /* @__PURE__ */ new Set(), Tn = {}, ii = [
  "renderPositionsTable",
  "applyGainPctMetadata",
  "attachSecurityDetailListener",
  "attachPortfolioPositionsSorting",
  "updatePortfolioFooter"
];
function oi(e, t) {
  typeof t == "function" && (Tn[e] = t);
}
function ai() {
  return ni;
}
function si() {
  return ri;
}
function ci(e) {
  for (const t of ii)
    oi(t, e[t]);
}
function wt() {
  return Tn;
}
const li = 2;
function Re(e) {
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
    const o = i.lastIndexOf(","), a = i.lastIndexOf(".");
    let s = i;
    const c = o !== -1, l = a !== -1;
    if (c && (!l || o > a))
      if (l)
        s = s.replace(/\./g, "").replace(",", ".");
      else {
        const u = s.split(","), p = ((t = u[u.length - 1]) == null ? void 0 : t.length) ?? 0, m = u.slice(0, -1).join(""), b = m.replace(/[+-]/g, "").length, g = u.length > 2, h = /^[-+]?0$/.test(m);
        s = g || p === 0 || p === 3 && b > 0 && b <= 3 && !h ? s.replace(/,/g, "") : s.replace(",", ".");
      }
    else l && c && a > o ? s = s.replace(/,/g, "") : l && s.length - a - 1 === 3 && /\d{4,}/.test(s.replace(/\./g, "")) && (s = s.replace(/\./g, ""));
    if (s === "-" || s === "+")
      return null;
    const d = Number.parseFloat(s);
    if (Number.isFinite(d))
      return d;
    const f = Number.parseFloat(i.replace(",", "."));
    if (Number.isFinite(f))
      return f;
  }
  return null;
}
function Ze(e, { decimals: t = li, fallback: n = null } = {}) {
  const r = Re(e);
  if (r == null)
    return n ?? null;
  const i = 10 ** t, o = Math.round(r * i) / i;
  return Object.is(o, -0) ? 0 : o;
}
function jt(e, t = {}) {
  return Ze(e, t);
}
function ui(e, t = {}) {
  return Ze(e, t);
}
const fi = /^[+-]?(?:\d+\.?\d*|\d*\.?\d+)(?:[eE][+-]?\d+)?$/, Z = (e) => {
  if (typeof e == "number")
    return Number.isFinite(e) ? e : null;
  if (typeof e == "string") {
    const t = e.trim();
    if (!t || !fi.test(t))
      return null;
    const n = Number(t);
    if (Number.isFinite(n))
      return n;
  }
  return null;
}, Cn = (e) => {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t || null;
};
function di(e) {
  const t = e && typeof e == "object" ? e : null;
  if (!t)
    return null;
  const n = Z(t.price_change_native), r = Z(t.price_change_eur), i = Z(t.change_pct);
  if (n == null && r == null && i == null)
    return null;
  const o = Cn(t.source) ?? "derived", a = Z(t.coverage_ratio) ?? null;
  return {
    price_change_native: n,
    price_change_eur: r,
    change_pct: i,
    source: o,
    coverage_ratio: a
  };
}
function ae(e) {
  const t = e && typeof e == "object" ? e : null;
  if (!t)
    return null;
  const n = Z(t.gain_abs), r = Z(t.gain_pct), i = Z(t.total_change_eur), o = Z(t.total_change_pct);
  if (n == null || r == null || i == null || o == null)
    return null;
  const a = Cn(t.source) ?? "derived", s = Z(t.coverage_ratio) ?? null, c = di(t.day_change);
  return {
    gain_abs: n,
    gain_pct: r,
    total_change_eur: i,
    total_change_pct: o,
    source: a,
    coverage_ratio: s,
    day_change: c
  };
}
const de = /* @__PURE__ */ new Map();
function Q(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t.length > 0 ? t : null;
}
function M(e) {
  if (e === null)
    return null;
  const t = Re(e);
  return Number.isFinite(t ?? NaN) ? t : null;
}
function pi(e) {
  if (!e || typeof e != "object")
    return !1;
  const t = e;
  return typeof t.security_uuid == "string" && typeof t.name == "string" && typeof t.current_holdings == "number" && typeof t.purchase_value == "number" && typeof t.current_value == "number";
}
function Je(e) {
  const t = { ...e };
  return e.average_cost && typeof e.average_cost == "object" && (t.average_cost = { ...e.average_cost }), e.performance && typeof e.performance == "object" && (t.performance = { ...e.performance }), e.aggregation && typeof e.aggregation == "object" && (t.aggregation = { ...e.aggregation }), e.data_state && typeof e.data_state == "object" && (t.data_state = { ...e.data_state }), t;
}
function xt(e, t) {
  if (!e)
    return;
  if (!Array.isArray(t)) {
    de.delete(e);
    return;
  }
  const n = t.filter((r) => !!r).map(Je);
  de.set(e, n);
}
function Et(e) {
  return e ? de.has(e) : !1;
}
function Mn(e) {
  if (!e)
    return [];
  const t = de.get(e);
  return t ? t.map(Je) : [];
}
function gi() {
  de.clear();
}
function mi() {
  return new Map(
    Array.from(de.entries(), ([e, t]) => [
      e,
      t.map(Je)
    ])
  );
}
function $e(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e, n = M(t.native), r = M(t.security), i = M(t.account), o = M(t.eur), a = M(t.coverage_ratio);
  if (n == null && r == null && i == null && o == null && a == null)
    return null;
  const s = Q(t.source);
  return {
    native: n,
    security: r,
    account: i,
    eur: o,
    source: s === "totals" || s === "eur_total" ? s : "aggregation",
    coverage_ratio: a
  };
}
function kn(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e, n = M(t.total_holdings), r = M(t.positive_holdings), i = M(t.purchase_value_eur), o = M(t.purchase_total_security) ?? M(t.security_currency_total), a = M(t.purchase_total_account) ?? M(t.account_currency_total);
  let s = 0;
  if (typeof t.purchase_value_cents == "number")
    s = Number.isFinite(t.purchase_value_cents) ? Math.trunc(t.purchase_value_cents) : 0;
  else if (typeof t.purchase_value_cents == "string") {
    const l = Number.parseInt(t.purchase_value_cents, 10);
    Number.isFinite(l) && (s = l);
  }
  return n != null || r != null || i != null || o != null || a != null || s !== 0 ? {
    total_holdings: n ?? 0,
    positive_holdings: r ?? 0,
    purchase_value_cents: s,
    purchase_value_eur: i ?? 0,
    security_currency_total: o ?? 0,
    account_currency_total: a ?? 0,
    purchase_total_security: o ?? 0,
    purchase_total_account: a ?? 0
  } : null;
}
function hi(e) {
  if (pi(e))
    return Je(e);
  if (!e || typeof e != "object")
    return null;
  const t = e, n = Q(t.security_uuid), r = Q(t.name), i = Re(t.current_holdings), o = jt(t.purchase_value), a = jt(t.current_value);
  if (!n || !r || i == null || o == null || a == null)
    return null;
  const s = {
    security_uuid: n,
    name: r,
    portfolio_uuid: Q(t.portfolio_uuid) ?? Q(t.portfolioUuid) ?? void 0,
    currency_code: Q(t.currency_code),
    current_holdings: i,
    purchase_value: o,
    current_value: a
  }, c = $e(t.average_cost);
  c && (s.average_cost = c);
  const l = kn(t.aggregation);
  l && (s.aggregation = l);
  const d = ae(t.performance);
  if (d)
    s.performance = d, s.gain_abs = typeof d.gain_abs == "number" ? d.gain_abs : null, s.gain_pct = typeof d.gain_pct == "number" ? d.gain_pct : null;
  else {
    const y = M(t.gain_abs), v = M(t.gain_pct);
    y !== null && (s.gain_abs = y), v !== null && (s.gain_pct = v);
  }
  "coverage_ratio" in t && (s.coverage_ratio = M(t.coverage_ratio));
  const f = Q(t.provenance);
  f && (s.provenance = f);
  const u = Q(t.metric_run_uuid);
  (u || t.metric_run_uuid === null) && (s.metric_run_uuid = u ?? null);
  const p = M(t.last_price_native);
  p !== null && (s.last_price_native = p);
  const m = M(t.last_price_eur);
  m !== null && (s.last_price_eur = m);
  const b = M(t.last_close_native);
  b !== null && (s.last_close_native = b);
  const g = M(t.last_close_eur);
  g !== null && (s.last_close_eur = g);
  const h = t.data_state && typeof t.data_state == "object" ? { ...t.data_state } : void 0;
  return h && (s.data_state = h), s;
}
function Qe(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = hi(n);
    r && t.push(r);
  }
  return t;
}
let In = [];
const te = /* @__PURE__ */ new Map();
function Me(e) {
  return typeof e == "string" && e.length > 0 ? e : void 0;
}
function bi(e) {
  return e === null ? null : Me(e);
}
function _i(e) {
  return typeof e == "number" && Number.isFinite(e) ? e : void 0;
}
function Le(e) {
  return e === null ? null : _i(e);
}
function Yt(e) {
  if (!(typeof e != "number" || !Number.isFinite(e)))
    return Math.trunc(e);
}
function j(e) {
  if (!(!e || typeof e != "object"))
    return { ...e };
}
function et(e) {
  const t = { ...e };
  return t.average_cost = j(e.average_cost), t.performance = j(e.performance), t.aggregation = j(e.aggregation), t.data_state = j(e.data_state), t;
}
function Dt(e) {
  const t = { ...e };
  return t.performance = j(e.performance), t.data_state = j(e.data_state), Array.isArray(e.positions) && (t.positions = e.positions.map(et)), t;
}
function Hn(e) {
  if (!e || typeof e != "object")
    return null;
  const t = Me(e.uuid);
  if (!t)
    return null;
  const n = { uuid: t }, r = Me(e.name);
  r && (n.name = r);
  const i = Le(e.current_value);
  i !== void 0 && (n.current_value = i);
  const o = Le(e.purchase_value) ?? Le(e.purchase_sum);
  o !== void 0 && (n.purchase_value = o, n.purchase_sum = o);
  const a = Yt(e.position_count);
  a !== void 0 && (n.position_count = a);
  const s = Yt(e.missing_value_positions);
  s !== void 0 && (n.missing_value_positions = s), typeof e.has_current_value == "boolean" && (n.has_current_value = e.has_current_value);
  const c = Le(e.coverage_ratio);
  c !== void 0 && (n.coverage_ratio = c);
  const l = Me(e.provenance);
  l && (n.provenance = l), "metric_run_uuid" in e && (n.metric_run_uuid = bi(e.metric_run_uuid));
  const d = j(e.performance);
  d && (n.performance = d);
  const f = j(e.data_state);
  if (f && (n.data_state = f), Array.isArray(e.positions)) {
    const u = e.positions.filter(
      (p) => !!p
    );
    u.length && (n.positions = u.map(et));
  }
  return n;
}
function yi(e, t) {
  const n = {
    ...e,
    ...t
  };
  return !t.performance && e.performance && (n.performance = j(e.performance)), !t.data_state && e.data_state && (n.data_state = j(e.data_state)), !t.positions && e.positions && (n.positions = e.positions.map(et)), n;
}
function Rt(e) {
  In = (e ?? []).map((n) => ({ ...n }));
}
function vi() {
  return In.map((e) => ({ ...e }));
}
function Si(e) {
  te.clear();
  const t = e ?? [];
  for (const n of t) {
    const r = Hn(n);
    r && te.set(r.uuid, Dt(r));
  }
}
function Pi(e) {
  const t = e ?? [];
  for (const n of t) {
    const r = Hn(n);
    if (!r)
      continue;
    const i = te.get(r.uuid), o = i ? yi(i, r) : Dt(r);
    te.set(o.uuid, o);
  }
}
function $t(e, t) {
  if (!e)
    return;
  const n = te.get(e);
  if (!n)
    return;
  if (!Array.isArray(t) || t.length === 0) {
    const o = { ...n };
    delete o.positions, te.set(e, o);
    return;
  }
  const r = t.map(et), i = {
    ...n,
    positions: r
  };
  te.set(e, i);
}
function Ai() {
  return Array.from(te.values(), (e) => Dt(e));
}
function Un() {
  return {
    accounts: vi(),
    portfolios: Ai()
  };
}
const Ni = "unknown-account";
function ee(e) {
  return typeof e != "number" || !Number.isFinite(e) ? null : e;
}
function Xt(e) {
  const t = ee(e);
  return t == null ? 0 : Math.trunc(t);
}
function K(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t.length > 0 ? t : null;
}
function zn(e, t) {
  return K(e) ?? t;
}
function Lt(e) {
  return e == null || !Number.isFinite(e) ? null : e < 0 ? 0 : e > 1 ? 1 : e;
}
function Fi(e) {
  const t = Math.abs(e % 1) > 0.01;
  return e.toLocaleString("de-DE", {
    minimumFractionDigits: t ? 1 : 0,
    maximumFractionDigits: 1
  });
}
function Vn(e, t) {
  const n = Lt(e);
  if (n == null)
    return null;
  const r = Math.round(n * 1e3) / 10;
  let i = "info";
  n < 0.5 ? i = "danger" : n < 0.9 && (i = "warning");
  const o = t === "account" ? "FX-Abdeckung" : "Abdeckung", a = t === "account" ? "Anteil der verfügbaren FX-Daten für diese Kontoumrechnung." : "Anteil der verfügbaren Kennzahlen für dieses Depot.";
  return {
    key: `${t}-coverage`,
    label: `${o} ${Fi(r)}%`,
    tone: i,
    description: a
  };
}
function wi(e) {
  return e.split(/[\s_-]+/).filter(Boolean).map(
    (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
  ).join(" ");
}
function qn(e) {
  const t = K(e);
  if (!t)
    return null;
  const n = wi(t);
  return {
    key: `provenance-${t}`,
    label: `Quelle: ${n}`,
    tone: "neutral",
    description: "Backend-Provenance zur Nachverfolgung der Kennzahlen."
  };
}
function xi(e) {
  if (!e)
    return null;
  const t = K(e.uuid) ?? `${Ni}-${e.name ?? "0"}`, n = zn(e.name, "Unbenanntes Konto"), r = K(e.currency_code), i = ee(e.balance), o = ee(e.orig_balance), a = "coverage_ratio" in e ? Lt(ee(e.coverage_ratio)) : null, s = K(e.provenance), c = K(e.metric_run_uuid), l = e.fx_unavailable === !0, d = ee(e.fx_rate), f = K(e.fx_rate_source), u = K(e.fx_rate_timestamp), p = [], m = Vn(a, "account");
  m && p.push(m);
  const b = qn(s);
  b && p.push(b);
  const g = {
    uuid: t,
    name: n,
    currency_code: r,
    balance: i,
    orig_balance: o,
    fx_unavailable: l,
    coverage_ratio: a,
    provenance: s,
    metric_run_uuid: null,
    fx_rate: d,
    fx_rate_source: f,
    fx_rate_timestamp: u,
    badges: p
  }, h = typeof c == "string" ? c : null;
  return g.metric_run_uuid = h, g;
}
function Ei(e) {
  if (!e)
    return null;
  const t = K(e.uuid);
  if (!t)
    return null;
  const n = zn(e.name, "Unbenanntes Depot"), r = Xt(e.position_count), i = Xt(e.missing_value_positions), o = ee(e.current_value), a = ee(e.purchase_value ?? e.purchase_sum) ?? 0, s = ae(e.performance), c = (s == null ? void 0 : s.gain_abs) ?? null, l = (s == null ? void 0 : s.gain_pct) ?? null, d = o != null, f = e.has_current_value === !1 || !d, u = "coverage_ratio" in e ? Lt(ee(e.coverage_ratio)) : null, p = K(e.provenance), m = K(e.metric_run_uuid), b = [], g = Vn(u, "portfolio");
  g && b.push(g);
  const h = qn(p);
  h && b.push(h);
  const y = {
    uuid: t,
    name: n,
    position_count: r,
    current_value: o,
    purchase_sum: a,
    gain_abs: c,
    gain_pct: l,
    hasValue: d,
    fx_unavailable: f || i > 0,
    missing_value_positions: i,
    performance: s,
    coverage_ratio: u,
    provenance: p,
    metric_run_uuid: null,
    badges: b
  }, v = typeof m == "string" ? m : null;
  return y.metric_run_uuid = v, y;
}
function Tt() {
  const { accounts: e } = Un();
  return e.map(xi).filter((t) => !!t);
}
function Di() {
  const { portfolios: e } = Un();
  return e.map(Ei).filter((t) => !!t);
}
function pe(e) {
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
function Bn(e, t = {}) {
  if (!e || e.length === 0)
    return "";
  const n = ["meta-badges", t.containerClass].filter(Boolean).join(" "), r = e.map((i) => {
    const o = `meta-badge--${i.tone}`, a = i.description ? ` title="${pe(i.description)}"` : "";
    return `<span class="meta-badge ${o}"${a}>${pe(
      i.label
    )}</span>`;
  }).join("");
  return `<span class="${n}">${r}</span>`;
}
function ge(e, t, n = {}) {
  const r = Bn(t, n);
  if (!r)
    return pe(e);
  const i = n.labelClass ?? "name-with-badges__label";
  return `<span class="${["name-with-badges", n.containerClass].filter(Boolean).join(" ")}"><span class="${i}">${pe(
    e
  )}</span>${r}</span>`;
}
function On(e, t, n, r) {
  e[t] = {
    previous: n,
    current: r
  };
}
const J = /* @__PURE__ */ new Map(), ke = /* @__PURE__ */ new Map();
function Ri(e) {
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
function he(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t.length > 0 ? t : null;
}
function $i(e) {
  return typeof e == "number" && Number.isFinite(e) ? e : void 0;
}
function Li(e) {
  return e === null ? null : $i(e);
}
function Ti(e) {
  return e === null ? null : he(e);
}
function Zt(e) {
  return ae(e.performance);
}
const Ci = 500, Mi = 10, ki = "pp-reader:portfolio-positions-updated", Ii = "pp-reader:diagnostics", it = /* @__PURE__ */ new Map(), Wn = [
  "coverage_ratio",
  "provenance",
  "metric_run_uuid",
  "generated_at"
];
function Hi(e, t) {
  return `${e}:${t}`;
}
function Ui(e) {
  if (e === void 0)
    return;
  if (e === null)
    return null;
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  const t = Li(e);
  if (t === null)
    return null;
  if (typeof t == "number" && Number.isFinite(t))
    return t;
}
function ot(e) {
  if (e !== void 0)
    return Ti(e);
}
function Ct(e, t, n, r) {
  const i = {}, o = Ui(e);
  o !== void 0 && (i.coverage_ratio = o);
  const a = ot(t);
  a !== void 0 && (i.provenance = a);
  const s = ot(n);
  s !== void 0 && (i.metric_run_uuid = s);
  const c = ot(r);
  return c !== void 0 && (i.generated_at = c), Object.keys(i).length > 0 ? i : null;
}
function zi(e, t) {
  const n = {};
  let r = !1;
  for (const i of Wn) {
    const o = e == null ? void 0 : e[i], a = t[i];
    o !== a && (On(n, i, o, a), r = !0);
  }
  return r ? n : null;
}
function Vi(e) {
  const t = {};
  let n = !1;
  for (const r of Wn) {
    const i = e[r];
    i !== void 0 && (On(t, r, i, void 0), n = !0);
  }
  return n ? t : null;
}
function Jt(e) {
  if (Object.keys(e.changed).length) {
    try {
      console.debug("pp-reader:diagnostics", e);
    } catch {
    }
    if (!(typeof window > "u" || typeof window.dispatchEvent != "function"))
      try {
        window.dispatchEvent(new CustomEvent(Ii, { detail: e }));
      } catch (t) {
        console.warn("updateConfigsWS: Diagnostics-Event konnte nicht gesendet werden", t);
      }
  }
}
function Mt(e, t, n, r) {
  const i = Hi(e, n), o = it.get(i);
  if (!r) {
    if (!o)
      return;
    it.delete(i);
    const s = Vi(o);
    if (!s)
      return;
    Jt({
      kind: e,
      uuid: n,
      source: t,
      changed: s,
      snapshot: {},
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    return;
  }
  const a = zi(o, r);
  a && (it.set(i, { ...r }), Jt({
    kind: e,
    uuid: n,
    source: t,
    changed: a,
    snapshot: { ...r },
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  }));
}
function qi(e) {
  if (!(!e || e.length === 0))
    for (const t of e) {
      const n = he(t.uuid);
      if (!n)
        continue;
      const r = Ct(
        t.coverage_ratio,
        t.provenance,
        t.metric_run_uuid,
        void 0
      );
      Mt("account", "accounts", n, r);
    }
}
function Bi(e) {
  if (!(!e || e.length === 0))
    for (const t of e) {
      const n = he(t.uuid);
      if (!n)
        continue;
      const r = Ct(
        t.coverage_ratio,
        t.provenance,
        t.metric_run_uuid,
        void 0
      );
      Mt("portfolio", "portfolio_values", n, r);
    }
}
function Oi(e, t) {
  var r, i, o, a;
  if (!t)
    return;
  const n = Ct(
    t.coverage_ratio ?? ((r = t.normalized_payload) == null ? void 0 : r.coverage_ratio),
    t.provenance ?? ((i = t.normalized_payload) == null ? void 0 : i.provenance),
    t.metric_run_uuid ?? ((o = t.normalized_payload) == null ? void 0 : o.metric_run_uuid),
    (a = t.normalized_payload) == null ? void 0 : a.generated_at
  );
  Mt("portfolio_positions", "portfolio_positions", e, n);
}
function Wi(e, t) {
  return `<div class="error">${Ri(e)} <button class="retry-pos" data-portfolio="${t}">Erneut laden</button></div>`;
}
function Ki(e, t, n) {
  const r = e.querySelector("table.sortable-positions");
  if (!r) return;
  const i = e.dataset.sortKey || r.dataset.defaultSort || "name", a = (e.dataset.sortDir || r.dataset.defaultDir || "asc") === "desc" ? "desc" : "asc";
  e.dataset.sortKey = i, e.dataset.sortDir = a;
  try {
    Sn(r, i, a, !0);
  } catch (l) {
    console.warn("restoreSortAndInit: sortTableRows Fehler:", l);
  }
  const { attachPortfolioPositionsSorting: s, attachSecurityDetailListener: c } = wt();
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
function Kn(e, t, n, r) {
  if (!e || !t)
    return { applied: !1, reason: "invalid" };
  const i = e.querySelector(
    `.portfolio-table .portfolio-details[data-portfolio="${t}"]`
  );
  if (!i)
    return { applied: !1, reason: "missing" };
  const o = i.querySelector(".positions-container");
  if (!o)
    return { applied: !1, reason: "missing" };
  if (i.classList.contains("hidden"))
    return { applied: !1, reason: "hidden" };
  if (r)
    return o.innerHTML = Wi(r, t), { applied: !0 };
  const a = o.dataset.sortKey, s = o.dataset.sortDir;
  return o.innerHTML = eo(n), a && (o.dataset.sortKey = a), s && (o.dataset.sortDir = s), Ki(o, e, t), { applied: !0 };
}
function kt(e, t) {
  const n = J.get(t);
  if (!n) return !1;
  const r = Kn(
    e,
    t,
    n.positions,
    n.error
  );
  return r.applied && J.delete(t), r.applied;
}
function Gi(e) {
  let t = !1;
  for (const [n] of J)
    kt(e, n) && (t = !0);
  return t;
}
function Gn(e, t) {
  const n = ke.get(t) ?? {
    attempts: 0,
    timer: null
  };
  n.timer || (n.timer = setTimeout(() => {
    n.timer = null, n.attempts += 1;
    const r = kt(e, t);
    r || n.attempts >= Mi ? (ke.delete(t), r || J.delete(t)) : Gn(e, t);
  }, Ci), ke.set(t, n));
}
function ji(e, t) {
  console.log("updateConfigsWS: Kontodaten-Update erhalten:", e);
  const n = Array.isArray(e) ? e : [];
  if (Rt(n), qi(n), !t)
    return;
  const r = Tt();
  Yi(r, t);
  const i = t.querySelector(".portfolio-table table"), o = i ? Array.from(
    i.querySelectorAll("tbody tr:not(.footer-row)")
  ).map((a) => {
    const s = a.cells.item(2), c = (s == null ? void 0 : s.textContent) ?? "", l = parseFloat(
      c.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "")
    );
    return {
      current_value: Number.isFinite(l) ? l : 0
    };
  }) : [];
  jn(r, o, t);
}
function Yi(e, t) {
  const n = t.querySelector(".account-table"), r = t.querySelector(".fx-account-table"), i = e.filter((a) => (a.currency_code || "EUR") === "EUR"), o = e.filter((a) => (a.currency_code || "EUR") !== "EUR");
  if (n) {
    const a = i.map((s) => ({
      name: ge(s.name, s.badges, {
        containerClass: "account-name",
        labelClass: "account-name__label"
      }),
      balance: s.balance ?? null
    }));
    n.innerHTML = ne(
      a,
      [
        { key: "name", label: "Name" },
        { key: "balance", label: "Kontostand (EUR)", align: "right" }
      ],
      ["balance"]
    );
  } else
    console.warn("updateAccountTable: .account-table nicht gefunden.");
  if (r) {
    const a = o.map((s) => {
      const c = s.orig_balance, l = typeof c == "number" && Number.isFinite(c), d = he(s.currency_code), f = l ? c.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) : null, u = f ? d ? `${f} ${d}` : f : "";
      return {
        name: ge(s.name, s.badges, {
          containerClass: "account-name",
          labelClass: "account-name__label"
        }),
        fx_display: u,
        balance: s.balance ?? null
      };
    });
    r.innerHTML = ne(
      a,
      [
        { key: "name", label: "Name" },
        { key: "fx_display", label: "Betrag (FX)" },
        { key: "balance", label: "EUR", align: "right" }
      ],
      ["balance"]
    );
  } else o.length && console.warn("updateAccountTable: .fx-account-table nicht gefunden, obwohl FX-Konten vorhanden sind.");
}
function Xi(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = wn(n);
    r && t.push(r);
  }
  return t;
}
function Zi(e, t) {
  if (!Array.isArray(e)) {
    console.warn("handlePortfolioUpdate: Update ist kein Array:", e);
    return;
  }
  try {
    console.debug("handlePortfolioUpdate: payload=", e);
  } catch {
  }
  const n = Xi(e);
  if (n.length && Pi(n), Bi(n), !t)
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
  const o = (f) => {
    if (typeof Intl < "u")
      try {
        const p = typeof navigator < "u" && navigator.language ? navigator.language : "de-DE";
        return new Intl.NumberFormat(p, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(f);
      } catch {
      }
    return (Ze(f, { fallback: 0 }) ?? 0).toFixed(2).replace(".", ",");
  }, a = /* @__PURE__ */ new Map();
  i.querySelectorAll("tr.portfolio-row").forEach((f) => {
    const u = f.dataset.portfolio;
    u && a.set(u, f);
  });
  let c = 0;
  const l = (f) => {
    const u = typeof f == "number" && Number.isFinite(f) ? f : 0;
    try {
      return u.toLocaleString("de-DE");
    } catch {
      return u.toString();
    }
  }, d = /* @__PURE__ */ new Map();
  for (const f of n) {
    const u = he(f.uuid);
    u && d.set(u, f);
  }
  for (const [f, u] of d.entries()) {
    const p = a.get(f);
    if (!p || p.cells.length < 3)
      continue;
    const m = p.cells.item(1), b = p.cells.item(2), g = p.cells.item(3), h = p.cells.item(4);
    if (!m || !b)
      continue;
    const y = typeof u.position_count == "number" && Number.isFinite(u.position_count) ? u.position_count : 0, v = typeof u.current_value == "number" && Number.isFinite(u.current_value) ? u.current_value : null, P = ae(u.performance), A = typeof (P == null ? void 0 : P.gain_abs) == "number" ? P.gain_abs : null, N = typeof (P == null ? void 0 : P.gain_pct) == "number" ? P.gain_pct : null, _ = typeof u.purchase_sum == "number" && Number.isFinite(u.purchase_sum) ? u.purchase_sum : typeof u.purchase_value == "number" && Number.isFinite(u.purchase_value) ? u.purchase_value : null, F = at(b.textContent);
    at(m.textContent) !== y && (m.textContent = l(y));
    const E = v !== null, R = {
      fx_unavailable: p.dataset.fxUnavailable === "true",
      current_value: v,
      performance: P
    }, $ = { hasValue: E }, L = I("current_value", R.current_value, R, $), S = v ?? 0;
    if ((Math.abs(F - S) >= 5e-3 || b.innerHTML !== L) && (b.innerHTML = L, p.classList.add("flash-update"), setTimeout(() => {
      p.classList.remove("flash-update");
    }, 800)), g) {
      const w = I("gain_abs", A, R, $);
      g.innerHTML = w;
      const H = typeof N == "number" && Number.isFinite(N) ? N : null;
      g.dataset.gainPct = H != null ? `${o(H)} %` : "—", g.dataset.gainSign = H != null ? H > 0 ? "positive" : H < 0 ? "negative" : "neutral" : "neutral";
    }
    h && (h.innerHTML = I("gain_pct", N, R, $)), p.dataset.positionCount = y.toString(), p.dataset.currentValue = E ? S.toString() : "", p.dataset.purchaseSum = _ != null ? _.toString() : "", p.dataset.gainAbs = A != null ? A.toString() : "", p.dataset.gainPct = N != null ? N.toString() : "", p.dataset.coverageRatio = typeof u.coverage_ratio == "number" && Number.isFinite(u.coverage_ratio) ? u.coverage_ratio.toString() : "", p.dataset.provenance = typeof u.provenance == "string" ? u.provenance : "", p.dataset.metricRunUuid = typeof u.metric_run_uuid == "string" ? u.metric_run_uuid : "", c += 1;
  }
  if (c === 0)
    console.debug("handlePortfolioUpdate: Keine passenden Zeilen gefunden / keine Änderungen.");
  else {
    const f = c.toLocaleString("de-DE");
    console.debug(`handlePortfolioUpdate: ${f} Zeile(n) gepatcht.`);
  }
  try {
    to(r);
  } catch (f) {
    console.warn("handlePortfolioUpdate: Fehler bei Summen-Neuberechnung:", f);
  }
  try {
    const f = (...h) => {
      for (const y of h) {
        if (!y) continue;
        const v = t.querySelector(y);
        if (v) return v;
      }
      return null;
    }, u = f(
      ".account-table table",
      ".accounts-eur-table table",
      ".accounts-table table"
    ), p = f(
      ".fx-account-table table",
      ".accounts-fx-table table"
    ), m = (h, y) => {
      if (!h) return [];
      const v = h.querySelectorAll("tbody tr.account-row");
      return (v.length ? Array.from(v) : Array.from(h.querySelectorAll("tbody tr:not(.footer-row)"))).map((A) => {
        const N = y ? A.cells.item(2) : A.cells.item(1);
        return { balance: at(N == null ? void 0 : N.textContent) };
      });
    }, b = [
      ...m(u, !1),
      ...m(p, !0)
    ], g = Array.from(
      r.querySelectorAll("tbody tr.portfolio-row")
    ).map((h) => {
      const y = h.dataset.currentValue, v = h.dataset.purchaseSum, P = y ? Number.parseFloat(y) : Number.NaN, A = v ? Number.parseFloat(v) : Number.NaN;
      return {
        current_value: Number.isFinite(P) ? P : 0,
        purchase_sum: Number.isFinite(A) ? A : 0
      };
    });
    jn(b, g, t);
  } catch (f) {
    console.warn("handlePortfolioUpdate: Fehler bei Total-Neuberechnung:", f);
  }
}
function Ji(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e.portfolio_uuid;
  if (typeof t == "string" && t)
    return t;
  const n = e.portfolioUuid;
  return typeof n == "string" && n ? n : null;
}
function Qt(e, t) {
  const n = Ji(e);
  if (!n)
    return console.warn("handlePortfolioPositionsUpdate: Ungültiges Update:", e), !1;
  const r = e == null ? void 0 : e.error, i = Qe((e == null ? void 0 : e.positions) ?? []);
  Oi(n, e), r || (xt(n, i), $t(n, i));
  const o = Kn(t, n, i, r);
  if (o.applied ? J.delete(n) : (J.set(n, { positions: i, error: r }), o.reason !== "hidden" && Gn(t, n)), !r && i.length > 0) {
    const a = Array.from(
      new Set(
        i.map((s) => s.security_uuid).filter((s) => typeof s == "string" && s.length > 0)
      )
    );
    if (a.length && typeof window < "u")
      try {
        window.dispatchEvent(
          new CustomEvent(
            ki,
            {
              detail: {
                portfolioUuid: n,
                securityUuids: a
              }
            }
          )
        );
      } catch (s) {
        console.warn(
          "handlePortfolioPositionsUpdate: Dispatch des Portfolio-Events fehlgeschlagen",
          s
        );
      }
  }
  return !0;
}
function Qi(e, t) {
  if (Array.isArray(e)) {
    let n = !1;
    for (const r of e)
      Qt(r, t) && (n = !0);
    !n && e.length && console.warn("handlePortfolioPositionsUpdate: Kein gültiges Element im Array:", e);
    return;
  }
  Qt(e, t);
}
function eo(e) {
  const { renderPositionsTable: t, applyGainPctMetadata: n } = wt();
  try {
    if (typeof t == "function")
      return t(e);
  } catch {
  }
  if (e.length === 0)
    return '<div class="no-positions">Keine Positionen vorhanden.</div>';
  const r = e.map((o) => {
    const a = Zt(o);
    return {
      name: o.name,
      current_holdings: o.current_holdings,
      purchase_value: o.purchase_value,
      current_value: o.current_value,
      performance: a
    };
  }), i = ne(
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
    o.innerHTML = i.trim();
    const a = o.content.querySelector("table");
    if (a) {
      a.classList.add("sortable-positions");
      const s = a.querySelectorAll("thead th"), c = ["name", "current_holdings", "purchase_value", "current_value", "gain_abs", "gain_pct"];
      s.forEach((f, u) => {
        const p = c[u];
        p && (f.setAttribute("data-sort-key", p), f.classList.add("sortable-col"));
      }), a.querySelectorAll("tbody tr").forEach((f, u) => {
        if (f.classList.contains("footer-row"))
          return;
        const p = e[u];
        p.security_uuid && (f.dataset.security = p.security_uuid), f.classList.add("position-row");
      }), a.dataset.defaultSort = "name", a.dataset.defaultDir = "asc";
      const d = n;
      if (d)
        try {
          d(a);
        } catch (f) {
          console.warn("renderPositionsTableInline: applyGainPctMetadata failed", f);
        }
      else
        a.querySelectorAll("tbody tr").forEach((u, p) => {
          if (u.classList.contains("footer-row"))
            return;
          const m = u.cells.item(4);
          if (!m)
            return;
          const b = e[p], g = Zt(b), h = typeof (g == null ? void 0 : g.gain_pct) == "number" && Number.isFinite(g.gain_pct) ? g.gain_pct : null, y = h != null ? `${h.toLocaleString("de-DE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })} %` : "—", v = h == null ? "neutral" : h > 0 ? "positive" : h < 0 ? "negative" : "neutral";
          m.dataset.gainPct = y, m.dataset.gainSign = v;
        });
      return a.outerHTML;
    }
  } catch (o) {
    console.warn("renderPositionsTableInline: Sortier-Metadaten Injection fehlgeschlagen:", o);
  }
  return i;
}
function to(e) {
  var h;
  if (!e) return;
  const { updatePortfolioFooter: t } = wt();
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
    const v = Number.parseFloat(y);
    return Number.isFinite(v) ? v : null;
  }, i = n.reduce(
    (y, v) => {
      const P = r(v.dataset.positionCount);
      if (P != null && (y.sumPositions += P), v.dataset.fxUnavailable === "true" && (y.fxUnavailable = !0), v.dataset.hasValue !== "true")
        return y.incompleteRows += 1, y;
      y.valueRows += 1;
      const A = r(v.dataset.currentValue), N = r(v.dataset.gainAbs), _ = r(v.dataset.purchaseSum);
      return A == null || N == null || _ == null ? (y.incompleteRows += 1, y) : (y.sumCurrent += A, y.sumGainAbs += N, y.sumPurchase += _, y);
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
  ), o = i.valueRows > 0 && i.incompleteRows === 0, a = o && i.sumPurchase > 0 ? i.sumGainAbs / i.sumPurchase * 100 : null;
  let s = e.querySelector("tr.footer-row");
  s || (s = document.createElement("tr"), s.className = "footer-row", (h = e.querySelector("tbody")) == null || h.appendChild(s));
  const c = Math.round(i.sumPositions).toLocaleString("de-DE"), l = {
    fx_unavailable: i.fxUnavailable || !o,
    current_value: o ? i.sumCurrent : null,
    performance: o ? {
      gain_abs: i.sumGainAbs,
      gain_pct: a,
      total_change_eur: i.sumGainAbs,
      total_change_pct: a,
      source: "aggregated",
      coverage_ratio: 1
    } : null
  }, d = { hasValue: o }, f = I("current_value", l.current_value, l, d), u = o ? i.sumGainAbs : null, p = o ? a : null, m = I("gain_abs", u, l, d), b = I("gain_pct", p, l, d);
  s.innerHTML = `
    <td>Summe</td>
    <td class="align-right">${c}</td>
    <td class="align-right">${f}</td>
    <td class="align-right">${m}</td>
    <td class="align-right">${b}</td>
  `;
  const g = s.cells.item(3);
  g && (g.dataset.gainPct = o && typeof a == "number" ? `${pt(a)} %` : "—", g.dataset.gainSign = o && typeof a == "number" ? a > 0 ? "positive" : a < 0 ? "negative" : "neutral" : "neutral"), s.dataset.positionCount = Math.round(i.sumPositions).toString(), s.dataset.currentValue = o ? i.sumCurrent.toString() : "", s.dataset.purchaseSum = o ? i.sumPurchase.toString() : "", s.dataset.gainAbs = o ? i.sumGainAbs.toString() : "", s.dataset.gainPct = o && typeof a == "number" ? a.toString() : "", s.dataset.hasValue = o ? "true" : "false", s.dataset.fxUnavailable = i.fxUnavailable || !o ? "true" : "false";
}
function en(e) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  if (typeof e == "string") {
    const t = Number.parseFloat(e);
    return Number.isFinite(t) ? t : 0;
  }
  return 0;
}
function pt(e) {
  return (Ze(e, { fallback: 0 }) ?? 0).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
function jn(e, t, n) {
  const r = n ?? document, o = (Array.isArray(e) ? e : []).reduce((f, u) => {
    const p = u.balance ?? u.current_value ?? u.value, m = en(p);
    return f + m;
  }, 0), s = (Array.isArray(t) ? t : []).reduce((f, u) => {
    const p = u.current_value ?? u.value, m = en(p);
    return f + m;
  }, 0), c = o + s, l = r.querySelector("#headerMeta");
  if (!l) {
    console.warn("updateTotalWealth: #headerMeta nicht gefunden.");
    return;
  }
  const d = l.querySelector("strong") || l.querySelector(".total-wealth-value");
  d ? d.textContent = `${pt(c)} €` : l.textContent = `💰 Gesamtvermögen: ${pt(c)} €`, l.dataset.totalWealthEur = c.toString();
}
function no(e, t) {
  const n = typeof e == "string" ? e : e == null ? void 0 : e.last_file_update, r = he(n) ?? "";
  if (!t) {
    console.warn("handleLastFileUpdate: root fehlt");
    return;
  }
  let i = t.querySelector(".footer-card .last-file-update") || t.querySelector(".last-file-update");
  if (!i) {
    const o = t.querySelector(".footer-card .meta") || t.querySelector("#headerMeta") || t.querySelector(".header-card .meta") || t.querySelector(".header-card");
    if (!o) {
      console.warn("handleLastFileUpdate: Kein Einfügepunkt gefunden.");
      return;
    }
    i = document.createElement("div"), i.className = "last-file-update", o.appendChild(i);
  }
  i.closest(".footer-card") ? i.innerHTML = r ? `📂 Letzte Aktualisierung der Datei: <strong>${r}</strong>` : "📂 Letzte Aktualisierung der Datei: <strong>Unbekannt</strong>" : i.textContent = r ? `📂 Letzte Aktualisierung: ${r}` : "📂 Letzte Aktualisierung: Unbekannt";
}
function Ua(e) {
  if (e == null)
    return;
  const t = e.querySelector("table.sortable-positions");
  if (t == null)
    return;
  const n = e.dataset.sortKey || t.dataset.defaultSort || "name", i = (e.dataset.sortDir || t.dataset.defaultDir || "asc") === "desc" ? "desc" : "asc";
  e.dataset.sortKey = n, e.dataset.sortDir = i, Sn(t, n, i, !0);
}
const za = {
  getPortfolioPositionsCacheSnapshot: mi,
  clearPortfolioPositionsCache: gi,
  getPendingUpdateCount() {
    return J.size;
  },
  queuePendingUpdate(e, t, n) {
    J.set(e, { positions: t, error: n });
  },
  clearPendingUpdates() {
    J.clear(), ke.clear();
  }
};
function at(e) {
  return e == null ? 0 : parseFloat(
    e.replace(/\u00A0/g, " ").replace(/[€%]/g, "").replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "")
  ) || 0;
}
const ro = [
  "name",
  "current_holdings",
  "purchase_value",
  "current_value",
  "gain_abs",
  "gain_pct"
];
function st(e) {
  return ro.includes(e);
}
function ct(e) {
  return e === "asc" || e === "desc";
}
let ze = null, Ve = null;
const tn = { min: 2, max: 6 };
function be(e) {
  return Re(e);
}
function gt(e) {
  return typeof e == "number" && Number.isFinite(e);
}
function io(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  if (!t)
    return null;
  const n = t.toUpperCase();
  return /^[A-Z]{3}$/.test(n) ? n : n === "€" ? "EUR" : null;
}
function nn(e, t, n = null) {
  for (const r of t) {
    const i = io(e[r]);
    if (i)
      return i;
  }
  return n;
}
function lt(e, t) {
  return gt(e) ? `${e.toLocaleString("de-DE", {
    minimumFractionDigits: tn.min,
    maximumFractionDigits: tn.max
  })}${t ? ` ${t}` : ""}` : null;
}
function oo(e) {
  const t = e, n = e.average_cost ?? null, r = e.aggregation ?? null, i = nn(t, [
    "security_currency_code",
    "security_currency",
    "native_currency_code",
    "native_currency"
  ], e.currency_code ?? null), o = nn(t, [
    "account_currency_code",
    "account_currency",
    "purchase_currency_code",
    "currency_code"
  ], i === "EUR" ? "EUR" : null) ?? (i === "EUR" ? "EUR" : null) ?? "EUR", a = be(n == null ? void 0 : n.native), s = be(n == null ? void 0 : n.security), c = be(n == null ? void 0 : n.account), l = be(n == null ? void 0 : n.eur), d = s ?? a, f = c ?? l;
  let u = d, p = i, m = lt(d, i);
  m || (u = f, p = o, m = lt(f, o));
  const b = lt(
    f,
    o
  ), g = b !== null && (m == null || !p || !o || o !== p || gt(f) && gt(u) && Math.abs(f - u) > 1e-6), h = [], y = [];
  m ? (h.push(
    `<span class="purchase-price purchase-price--primary">${m}</span>`
  ), y.push(m.replace(/\u00A0/g, " "))) : (h.push('<span class="missing-value" role="note" aria-label="Kein Kaufpreis verfügbar" title="Kein Kaufpreis verfügbar">—</span>'), y.push("Kein Kaufpreis verfügbar")), g && b && b !== m && (h.push(
    `<span class="purchase-price purchase-price--secondary">${b}</span>`
  ), y.push(b.replace(/\u00A0/g, " ")));
  const v = h.join("<br>"), P = be(r == null ? void 0 : r.purchase_value_eur) ?? 0, A = y.join(", ");
  return { markup: v, sortValue: P, ariaLabel: A };
}
const qe = /* @__PURE__ */ new Set();
function Yn(e) {
  if (!e)
    return;
  Array.from(e.querySelectorAll("tbody tr")).forEach((n) => {
    const r = n.cells.item(4), i = n.cells.item(5);
    if (!r || !i || r.dataset.gainPct && r.dataset.gainSign)
      return;
    const o = (i.textContent || "").trim() || "—";
    let a = "neutral";
    i.querySelector(".positive") ? a = "positive" : i.querySelector(".negative") && (a = "negative"), r.dataset.gainPct = o, r.dataset.gainSign = a;
  });
}
function Ne(e) {
  if (e.length === 0)
    return '<div class="no-positions">Keine Positionen vorhanden.</div>';
  const t = [
    { key: "name", label: "Wertpapier" },
    { key: "current_holdings", label: "Bestand", align: "right" },
    { key: "purchase_value", label: "Ø Kaufpreis", align: "right" },
    { key: "current_value", label: "Aktueller Wert", align: "right" },
    { key: "gain_abs", label: "+/-", align: "right" },
    { key: "gain_pct", label: "%", align: "right" }
  ], n = e.map((i) => {
    const o = ae(i.performance), a = typeof (o == null ? void 0 : o.gain_abs) == "number" ? o.gain_abs : null, s = typeof (o == null ? void 0 : o.gain_pct) == "number" ? o.gain_pct : null;
    return {
      name: typeof i.name == "string" ? i.name : typeof i.name == "number" ? String(i.name) : "",
      current_holdings: typeof i.current_holdings == "number" || typeof i.current_holdings == "string" ? i.current_holdings : null,
      purchase_value: typeof i.purchase_value == "number" || typeof i.purchase_value == "string" ? i.purchase_value : null,
      current_value: typeof i.current_value == "number" || typeof i.current_value == "string" ? i.current_value : null,
      gain_abs: a,
      gain_pct: s
    };
  }), r = ne(n, t, ["purchase_value", "current_value", "gain_abs"]);
  try {
    const i = document.createElement("template");
    i.innerHTML = r.trim();
    const o = i.content.querySelector("table");
    if (o) {
      o.classList.add("sortable-positions");
      const a = Array.from(o.querySelectorAll("thead th"));
      return t.forEach((c, l) => {
        const d = a.at(l);
        d && (d.setAttribute("data-sort-key", c.key), d.classList.add("sortable-col"));
      }), o.querySelectorAll("tbody tr").forEach((c, l) => {
        if (c.classList.contains("footer-row") || l >= e.length)
          return;
        const d = e[l], f = typeof d.security_uuid == "string" ? d.security_uuid : null;
        f && (c.dataset.security = f), c.classList.add("position-row");
        const u = c.cells.item(2);
        if (u) {
          const { markup: b, sortValue: g, ariaLabel: h } = oo(d);
          u.innerHTML = b, u.dataset.sortValue = String(g), h ? u.setAttribute("aria-label", h) : u.removeAttribute("aria-label");
        }
        const p = c.cells.item(4);
        if (p) {
          const b = ae(d.performance), g = typeof (b == null ? void 0 : b.gain_pct) == "number" && Number.isFinite(b.gain_pct) ? b.gain_pct : null, h = g != null ? `${g.toLocaleString("de-DE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })} %` : "—", y = g == null ? "neutral" : g > 0 ? "positive" : g < 0 ? "negative" : "neutral";
          p.dataset.gainPct = h, p.dataset.gainSign = y;
        }
        const m = c.cells.item(5);
        m && m.classList.add("gain-pct-cell");
      }), o.dataset.defaultSort = "name", o.dataset.defaultDir = "asc", Yn(o), o.outerHTML;
    }
  } catch (i) {
    console.warn("renderPositionsTable: Konnte Sortier-Metadaten nicht injizieren:", i);
  }
  return r;
}
function ao(e) {
  const t = Qe(e ?? []);
  return Ne(t);
}
function so(e, t) {
  if (!t) return;
  const n = e.querySelector(
    `.portfolio-details[data-portfolio="${t}"]`
  );
  if (!n) return;
  const r = n.querySelector(".positions-container");
  r && (r.__ppReaderSecurityClickBound || (r.__ppReaderSecurityClickBound = !0, r.addEventListener("click", (i) => {
    const o = i.target;
    if (!(o instanceof Element))
      return;
    const a = o.closest("button, a");
    if (a && r.contains(a))
      return;
    const s = o.closest("tr[data-security]");
    if (!s || !r.contains(s))
      return;
    const c = s.getAttribute("data-security");
    if (c)
      try {
        Dr(c) || console.warn("attachSecurityDetailDelegation: Detail-Tab konnte nicht geöffnet werden für", c);
      } catch (l) {
        console.error("attachSecurityDetailDelegation: Fehler beim Öffnen des Detail-Tabs", l);
      }
  })));
}
function Fe(e, t) {
  so(e, t);
}
function Xn(e) {
  console.debug("buildExpandablePortfolioTable: render", e.length, "portfolios");
  const t = (_) => _ == null || typeof _ != "string" && typeof _ != "number" && typeof _ != "boolean" ? "" : String(_).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  let n = '<table class="expandable-portfolio-table"><thead><tr>';
  [
    { key: "name", label: "Name" },
    { key: "position_count", label: "Anzahl Positionen", align: "right" },
    { key: "current_value", label: "Aktueller Wert", align: "right" },
    { key: "gain_abs", label: "Gesamt +/-", align: "right" },
    { key: "gain_pct", label: "%", align: "right" }
  ].forEach((_) => {
    const F = _.align === "right" ? ' class="align-right"' : "";
    n += `<th${F}>${_.label}</th>`;
  }), n += "</tr></thead><tbody>", e.forEach((_) => {
    const F = Number.isFinite(_.position_count) ? _.position_count : 0, D = Number.isFinite(_.purchase_sum) ? _.purchase_sum : 0, E = _.hasValue && typeof _.current_value == "number" && Number.isFinite(_.current_value) ? _.current_value : null, R = E !== null, $ = _.performance, L = typeof _.gain_abs == "number" ? _.gain_abs : typeof ($ == null ? void 0 : $.gain_abs) == "number" ? $.gain_abs : null, S = typeof _.gain_pct == "number" ? _.gain_pct : typeof ($ == null ? void 0 : $.gain_pct) == "number" ? $.gain_pct : null, w = _.fx_unavailable && R, T = typeof _.coverage_ratio == "number" && Number.isFinite(_.coverage_ratio) ? _.coverage_ratio : "", H = typeof _.provenance == "string" ? _.provenance : "", ce = typeof _.metric_run_uuid == "string" ? _.metric_run_uuid : "", W = qe.has(_.uuid), B = W ? "portfolio-toggle expanded" : "portfolio-toggle", V = `portfolio-details-${_.uuid}`, O = {
      fx_unavailable: _.fx_unavailable,
      current_value: E,
      gain_abs: L,
      gain_pct: S
    }, tt = { hasValue: R }, $r = I("current_value", O.current_value, O, tt), Lr = I("gain_abs", O.gain_abs, O, tt), Tr = I("gain_pct", O.gain_pct, O, tt), qt = R && typeof S == "number" && Number.isFinite(S) ? `${Y(S)} %` : "", Cr = R && typeof S == "number" && Number.isFinite(S) ? S > 0 ? "positive" : S < 0 ? "negative" : "neutral" : "", Mr = R && typeof E == "number" && Number.isFinite(E) ? E : "", kr = R && typeof L == "number" && Number.isFinite(L) ? L : "", Ir = R && typeof S == "number" && Number.isFinite(S) ? S : "", Hr = String(F);
    let nt = "";
    qt && (nt = ` data-gain-pct="${t(qt)}" data-gain-sign="${t(Cr)}"`), w && (nt += ' data-partial="true"'), n += `<tr class="portfolio-row"
                  data-portfolio="${_.uuid}"
                  data-position-count="${Hr}"
                  data-current-value="${t(Mr)}"
                  data-purchase-sum="${t(D)}"
                  data-gain-abs="${t(kr)}"
                data-gain-pct="${t(Ir)}"
                data-has-value="${R ? "true" : "false"}"
                data-fx-unavailable="${_.fx_unavailable ? "true" : "false"}"
                data-coverage-ratio="${t(T)}"
                data-provenance="${t(H)}"
                data-metric-run-uuid="${t(ce)}">`;
    const Ur = pe(_.name), zr = Bn(_.badges, { containerClass: "portfolio-badges" });
    n += `<td>
        <button type="button"
                class="${B}"
                data-portfolio="${_.uuid}"
                aria-expanded="${W ? "true" : "false"}"
                aria-controls="${V}">
          <span class="caret">${W ? "▼" : "▶"}</span>
          <span class="portfolio-name">${Ur}</span>${zr}
        </button>
      </td>`;
    const Vr = F.toLocaleString("de-DE");
    n += `<td class="align-right">${Vr}</td>`, n += `<td class="align-right">${$r}</td>`, n += `<td class="align-right"${nt}>${Lr}</td>`, n += `<td class="align-right gain-pct-cell">${Tr}</td>`, n += "</tr>", n += `<tr class="portfolio-details${W ? "" : " hidden"}"
                data-portfolio="${_.uuid}"
                id="${V}"
                role="region"
                aria-label="Positionen für ${_.name}">
      <td colspan="5">
        <div class="positions-container">${W ? Et(_.uuid) ? Ne(Mn(_.uuid)) : '<div class="loading">Lade Positionen...</div>' : ""}</div>
      </td>
    </tr>`;
  });
  const i = e.filter((_) => typeof _.current_value == "number" && Number.isFinite(_.current_value)), o = e.reduce((_, F) => _ + (Number.isFinite(F.position_count) ? F.position_count : 0), 0), a = i.reduce((_, F) => typeof F.current_value == "number" && Number.isFinite(F.current_value) ? _ + F.current_value : _, 0), s = i.reduce((_, F) => typeof F.purchase_sum == "number" && Number.isFinite(F.purchase_sum) ? _ + F.purchase_sum : _, 0), c = i.reduce((_, F) => {
    var R;
    if (typeof ((R = F.performance) == null ? void 0 : R.gain_abs) == "number" && Number.isFinite(F.performance.gain_abs))
      return _ + F.performance.gain_abs;
    const D = typeof F.current_value == "number" && Number.isFinite(F.current_value) ? F.current_value : 0, E = typeof F.purchase_sum == "number" && Number.isFinite(F.purchase_sum) ? F.purchase_sum : 0;
    return _ + (D - E);
  }, 0), l = i.length > 0, d = i.length !== e.length, f = l && s > 0 ? c / s * 100 : null, u = {
    fx_unavailable: d,
    current_value: l ? a : null,
    gain_abs: l ? c : null,
    gain_pct: l ? f : null
  }, p = { hasValue: l }, m = I("current_value", u.current_value, u, p), b = I("gain_abs", u.gain_abs, u, p), g = I("gain_pct", u.gain_pct, u, p);
  let h = "";
  if (l && typeof f == "number" && Number.isFinite(f)) {
    const _ = `${Y(f)} %`, F = f > 0 ? "positive" : f < 0 ? "negative" : "neutral";
    h = ` data-gain-pct="${t(_)}" data-gain-sign="${t(F)}"`;
  }
  d && (h += ' data-partial="true"');
  const y = String(Math.round(o)), v = l ? String(a) : "", P = l ? String(s) : "", A = l ? String(c) : "", N = l && typeof f == "number" && Number.isFinite(f) ? String(f) : "";
  return n += `<tr class="footer-row"
      data-position-count="${y}"
      data-current-value="${t(v)}"
      data-purchase-sum="${t(P)}"
      data-gain-abs="${t(A)}"
      data-gain-pct="${t(N)}"
      data-has-value="${l ? "true" : "false"}"
      data-fx-unavailable="${d ? "true" : "false"}">
      <td>Summe</td>
      <td class="align-right">${Math.round(o).toLocaleString("de-DE")}</td>
    <td class="align-right">${m}</td>
    <td class="align-right"${h}>${b}</td>
    <td class="align-right gain-pct-cell">${g}</td>
  </tr>`, n += "</tbody></table>", n;
}
function co(e) {
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
function Te(e) {
  if (e === void 0)
    return null;
  const t = Number(e);
  return Number.isFinite(t) ? t : null;
}
function Zn(e) {
  const t = co(e);
  if (!t)
    return;
  const n = t.tBodies.item(0);
  if (!n)
    return;
  const r = Array.from(n.querySelectorAll("tr.portfolio-row"));
  if (!r.length)
    return;
  let i = 0, o = 0, a = 0, s = 0, c = !1, l = !0, d = !1;
  for (const A of r) {
    const N = Te(A.dataset.positionCount);
    N != null && (i += N), A.dataset.fxUnavailable === "true" && (d = !0);
    const _ = A.dataset.hasValue;
    if (!!(_ === "false" || _ === "0" || _ === "" || _ == null)) {
      l = !1;
      continue;
    }
    c = !0;
    const D = Te(A.dataset.currentValue), E = Te(A.dataset.gainAbs), R = Te(A.dataset.purchaseSum);
    if (D == null || E == null || R == null) {
      l = !1;
      continue;
    }
    o += D, s += E, a += R;
  }
  const f = c && l, u = f && a > 0 ? s / a * 100 : null;
  let p = Array.from(n.children).find(
    (A) => A instanceof HTMLTableRowElement && A.classList.contains("footer-row")
  );
  p || (p = document.createElement("tr"), p.classList.add("footer-row"), n.appendChild(p));
  const m = Math.round(i).toLocaleString("de-DE"), b = {
    fx_unavailable: d || !f,
    current_value: f ? o : null,
    gain_abs: f ? s : null,
    gain_pct: f ? u : null
  }, g = { hasValue: f }, h = I("current_value", b.current_value, b, g), y = I("gain_abs", b.gain_abs, b, g), v = I("gain_pct", b.gain_pct, b, g);
  p.innerHTML = `
      <td>Summe</td>
      <td class="align-right">${m}</td>
      <td class="align-right">${h}</td>
      <td class="align-right">${y}</td>
      <td class="align-right">${v}</td>
    `;
  const P = p.cells.item(3);
  P && (P.dataset.gainPct = f && typeof u == "number" ? `${Y(u)} %` : "—", P.dataset.gainSign = f && typeof u == "number" ? u > 0 ? "positive" : u < 0 ? "negative" : "neutral" : "neutral"), p.dataset.positionCount = String(Math.round(i)), p.dataset.currentValue = f ? String(o) : "", p.dataset.purchaseSum = f ? String(a) : "", p.dataset.gainAbs = f ? String(s) : "", p.dataset.gainPct = f && typeof u == "number" ? String(u) : "", p.dataset.hasValue = f ? "true" : "false", p.dataset.fxUnavailable = d ? "true" : "false";
}
function we(e, t) {
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
  const o = (u, p) => {
    const m = i.querySelector("tbody");
    if (!m) return;
    const b = Array.from(m.querySelectorAll("tr")).filter((v) => !v.classList.contains("footer-row")), g = m.querySelector("tr.footer-row"), h = (v) => {
      if (v == null) return 0;
      const P = v.replace(/\u00A0/g, " ").replace(/[%€]/g, "").replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, ""), A = Number.parseFloat(P);
      return Number.isFinite(A) ? A : 0;
    };
    b.sort((v, P) => {
      const N = {
        name: 0,
        current_holdings: 1,
        purchase_value: 2,
        current_value: 3,
        gain_abs: 4,
        gain_pct: 5
      }[u], _ = v.cells.item(N), F = P.cells.item(N);
      let D = "";
      if (_) {
        const L = _.textContent;
        typeof L == "string" && (D = L.trim());
      }
      let E = "";
      if (F) {
        const L = F.textContent;
        typeof L == "string" && (E = L.trim());
      }
      const R = (L, S) => {
        const w = L ? L.dataset.sortValue : void 0;
        if (w != null && w !== "") {
          const T = Number(w);
          if (Number.isFinite(T))
            return T;
        }
        return h(S);
      };
      let $;
      if (u === "name")
        $ = D.localeCompare(E, "de", { sensitivity: "base" });
      else {
        const L = R(_, D), S = R(F, E);
        $ = L - S;
      }
      return p === "asc" ? $ : -$;
    }), i.querySelectorAll("thead th.sort-active").forEach((v) => {
      v.classList.remove("sort-active", "dir-asc", "dir-desc");
    });
    const y = i.querySelector(`thead th[data-sort-key="${u}"]`);
    y && y.classList.add("sort-active", p === "asc" ? "dir-asc" : "dir-desc"), b.forEach((v) => m.appendChild(v)), g && m.appendChild(g);
  }, a = r.dataset.sortKey, s = r.dataset.sortDir, c = i.dataset.defaultSort, l = i.dataset.defaultDir, d = st(a) ? a : st(c) ? c : "name", f = ct(s) ? s : ct(l) ? l : "asc";
  o(d, f), i.addEventListener("click", (u) => {
    const p = u.target;
    if (!(p instanceof Element))
      return;
    const m = p.closest("th[data-sort-key]");
    if (!m || !i.contains(m)) return;
    const b = m.getAttribute("data-sort-key");
    if (!st(b))
      return;
    let g = "asc";
    r.dataset.sortKey === b && (g = (ct(r.dataset.sortDir) ? r.dataset.sortDir : "asc") === "asc" ? "desc" : "asc"), r.dataset.sortKey = b, r.dataset.sortDir = g, o(b, g);
  });
}
async function lo(e, t, n) {
  if (!e || !ze || !Ve) return;
  const r = t || n.querySelector(
    `.portfolio-details[data-portfolio="${e}"] .positions-container`
  );
  if (!r)
    return;
  const i = r.closest(".portfolio-details");
  if (!(i && i.classList.contains("hidden"))) {
    r.innerHTML = '<div class="loading">Neu laden...</div>';
    try {
      const o = await $n(
        ze,
        Ve,
        e
      );
      if (o.error) {
        const s = typeof o.error == "string" ? o.error : String(o.error);
        r.innerHTML = `<div class="error">${s} <button class="retry-pos" data-portfolio="${e}">Erneut laden</button></div>`;
        return;
      }
      const a = Qe(
        Array.isArray(o.positions) ? o.positions : []
      );
      xt(e, a), $t(e, a), r.innerHTML = Ne(a);
      try {
        we(n, e);
      } catch (s) {
        console.warn("attachPortfolioToggleHandler: Sort-Init (Lazy) fehlgeschlagen:", s);
      }
      try {
        Fe(n, e);
      } catch (s) {
        console.warn("reloadPortfolioPositions: Security-Listener konnte nicht gebunden werden:", s);
      }
    } catch (o) {
      const a = o instanceof Error ? o.message : String(o);
      r.innerHTML = `<div class="error">Fehler: ${a} <button class="retry-pos" data-portfolio="${e}">Retry</button></div>`;
    }
  }
}
async function uo(e, t, n = 3e3, r = 50) {
  const i = performance.now();
  return new Promise((o) => {
    const a = () => {
      const s = e.querySelector(t);
      if (s) {
        o(s);
        return;
      }
      if (performance.now() - i > n) {
        o(null);
        return;
      }
      setTimeout(a, r);
    };
    a();
  });
}
function It(e) {
  const n = (typeof e.__ppReaderAttachToken == "number" ? e.__ppReaderAttachToken : 0) + 1;
  e.__ppReaderAttachToken = n, e.__ppReaderAttachInProgress = !0, (async () => {
    try {
      const r = await uo(e, ".portfolio-table");
      if (n !== e.__ppReaderAttachToken)
        return;
      if (!r) {
        console.warn("attachPortfolioToggleHandler: .portfolio-table nicht gefunden (Timeout)");
        return;
      }
      if (r.querySelectorAll(".portfolio-toggle").length === 0 && console.debug("attachPortfolioToggleHandler: Noch keine Buttons – evtl. Recovery später"), r.__ppReaderPortfolioToggleBound)
        return;
      r.__ppReaderPortfolioToggleBound = !0, console.debug("attachPortfolioToggleHandler: Listener registriert"), r.addEventListener("click", (o) => {
        (async () => {
          try {
            const a = o.target;
            if (!(a instanceof Element))
              return;
            const s = a.closest(".retry-pos");
            if (s && r.contains(s)) {
              const p = s.getAttribute("data-portfolio");
              if (p) {
                const m = e.querySelector(
                  `.portfolio-details[data-portfolio="${p}"]`
                ), b = m == null ? void 0 : m.querySelector(".positions-container");
                await lo(p, b ?? null, e);
              }
              return;
            }
            const c = a.closest(".portfolio-toggle");
            if (!c || !r.contains(c)) return;
            const l = c.getAttribute("data-portfolio");
            if (!l) return;
            const d = e.querySelector(
              `.portfolio-details[data-portfolio="${l}"]`
            );
            if (!d) return;
            const f = c.querySelector(".caret");
            if (d.classList.contains("hidden")) {
              d.classList.remove("hidden"), c.classList.add("expanded"), c.setAttribute("aria-expanded", "true"), f && (f.textContent = "▼"), qe.add(l);
              try {
                kt(e, l);
              } catch (p) {
                console.warn("attachPortfolioToggleHandler: Pending-Flush fehlgeschlagen:", p);
              }
              if (Et(l)) {
                const p = d.querySelector(".positions-container");
                if (p) {
                  p.innerHTML = Ne(
                    Mn(l)
                  ), we(e, l);
                  try {
                    Fe(e, l);
                  } catch (m) {
                    console.warn("attachPortfolioToggleHandler: Security-Listener (Cache) Fehler:", m);
                  }
                }
              } else {
                const p = d.querySelector(".positions-container");
                p && (p.innerHTML = '<div class="loading">Lade Positionen...</div>');
                try {
                  const m = await $n(
                    ze,
                    Ve,
                    l
                  );
                  if (m.error) {
                    const g = typeof m.error == "string" ? m.error : String(m.error);
                    p && (p.innerHTML = `<div class="error">${g} <button class="retry-pos" data-portfolio="${l}">Erneut laden</button></div>`);
                    return;
                  }
                  const b = Qe(
                    Array.isArray(m.positions) ? m.positions : []
                  );
                  if (xt(l, b), $t(
                    l,
                    b
                  ), p) {
                    p.innerHTML = Ne(b);
                    try {
                      we(e, l);
                    } catch (g) {
                      console.warn("attachPortfolioToggleHandler: Sort-Init (Lazy) fehlgeschlagen:", g);
                    }
                    try {
                      Fe(e, l);
                    } catch (g) {
                      console.warn("attachPortfolioToggleHandler: Security-Listener konnte nicht gebunden werden:", g);
                    }
                  }
                } catch (m) {
                  const b = m instanceof Error ? m.message : String(m), g = d.querySelector(".positions-container");
                  g && (g.innerHTML = `<div class="error">Fehler beim Laden: ${b} <button class="retry-pos" data-portfolio="${l}">Retry</button></div>`), console.error("Fehler beim Lazy Load für", l, m);
                }
              }
            } else
              d.classList.add("hidden"), c.classList.remove("expanded"), c.setAttribute("aria-expanded", "false"), f && (f.textContent = "▶"), qe.delete(l);
          } catch (a) {
            console.error("attachPortfolioToggleHandler: Ungefangener Fehler im Click-Handler", a);
          }
        })();
      });
    } finally {
      n === e.__ppReaderAttachToken && (e.__ppReaderAttachInProgress = !1);
    }
  })();
}
function fo(e) {
  const t = e.querySelector(".expandable-portfolio-table");
  t && (t.__ppReaderPortfolioFallbackBound || (t.__ppReaderPortfolioFallbackBound = !0, t.addEventListener("click", (n) => {
    const r = n.target;
    if (!(r instanceof Element) || !r.closest(".portfolio-toggle")) return;
    const o = e.querySelector(".portfolio-table");
    o != null && o.__ppReaderPortfolioToggleBound || (console.debug("Fallback-Listener aktiv – re-attach Hauptlistener"), It(e));
  })));
}
async function Jn(e, t, n) {
  var R, $, L;
  ze = t ?? null, Ve = n ?? null, console.debug(
    "renderDashboard: start – panelConfig:",
    n == null ? void 0 : n.config,
    "derived entry_id?",
    (L = ($ = (R = n == null ? void 0 : n.config) == null ? void 0 : R._panel_custom) == null ? void 0 : $.config) == null ? void 0 : L.entry_id
  );
  const r = await Rn(t, n);
  Rt(r.accounts);
  const i = Tt(), o = await ei(t, n);
  Si(o.portfolios);
  const a = Di();
  let s = "";
  try {
    s = await Qr(t, n);
  } catch {
    s = "";
  }
  const c = i.reduce(
    (S, w) => S + (typeof w.balance == "number" && Number.isFinite(w.balance) ? w.balance : 0),
    0
  ), l = a.some((S) => S.fx_unavailable), d = i.some((S) => S.fx_unavailable && (S.balance == null || !Number.isFinite(S.balance))), f = a.reduce((S, w) => w.hasValue && typeof w.current_value == "number" && Number.isFinite(w.current_value) ? S + w.current_value : S, 0), u = c + f, p = "Teilw. fehlende FX-Kurse – Gesamtvermögen abweichend", b = a.some((S) => S.hasValue && typeof S.current_value == "number" && Number.isFinite(S.current_value)) || i.some((S) => typeof S.balance == "number" && Number.isFinite(S.balance)) ? `${Y(u)}&nbsp;€` : `<span class="missing-value" role="note" aria-label="${p}" title="${p}">—</span>`, g = l || d ? `<span class="total-wealth-note">${p}</span>` : "", h = `
    <div class="header-meta-row">
      💰 Gesamtvermögen: <strong class="total-wealth-value">${b}</strong>${g}
    </div>
  `, y = Ue("Übersicht", h), v = Xn(a), P = i.filter((S) => (S.currency_code ?? "EUR") === "EUR"), A = i.filter((S) => (S.currency_code ?? "EUR") !== "EUR"), _ = A.some((S) => S.fx_unavailable) ? `
        <p class="table-note" role="note">
          <span class="table-note__icon" aria-hidden="true">⚠️</span>
          <span>Wechselkurse konnten nicht geladen werden. EUR-Werte werden derzeit nicht angezeigt.</span>
        </p>
      ` : "", F = `
    <div class="card">
      <h2>Liquidität</h2>
      <div class="scroll-container account-table">
        ${ne(
    P.map((S) => ({
      name: ge(S.name, S.badges, {
        containerClass: "account-name",
        labelClass: "account-name__label"
      }),
      balance: S.balance ?? null
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
          ${ne(
    A.map((S) => {
      const w = S.orig_balance, H = typeof w == "number" && Number.isFinite(w) ? `${w.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}&nbsp;${S.currency_code ?? ""}` : "";
      return {
        name: ge(S.name, S.badges, {
          containerClass: "account-name",
          labelClass: "account-name__label"
        }),
        fx_display: H,
        balance: S.balance ?? null
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
        ${_}
      </div>` : ""}
  `, D = `
    <div class="card footer-card">
      <div class="meta">
        <div class="last-file-update">
          📂 Letzte Aktualisierung der Datei: <strong>${s || "Unbekannt"}</strong>
        </div>
      </div>
    </div>
  `, E = `
    ${y.outerHTML}
    <div class="card">
      <h2>Investment</h2>
      <div class="scroll-container portfolio-table">
        ${v}
      </div>
    </div>
    ${F}
    ${D}
  `;
  return po(e, a), E;
}
function po(e, t) {
  if (!e)
    return;
  const n = () => {
    try {
      const i = e, o = i.querySelector(".portfolio-table");
      o && o.querySelectorAll(".portfolio-toggle").length === 0 && (console.debug("Recovery: Tabelle ohne Buttons – erneuter Aufbau"), o.innerHTML = Xn(t)), It(e), fo(e), qe.forEach((a) => {
        try {
          Et(a) && (we(e, a), Fe(e, a));
        } catch (s) {
          console.warn("Init-Sortierung für expandiertes Depot fehlgeschlagen:", a, s);
        }
      });
      try {
        Zn(i);
      } catch (a) {
        console.warn("renderDashboard: Footer-Summe konnte nicht aktualisiert werden:", a);
      }
      try {
        Gi(e);
      } catch (a) {
        console.warn("renderDashboard: Pending-Positions konnten nicht angewendet werden:", a);
      }
      console.debug("renderDashboard: portfolio-toggle Buttons:", i.querySelectorAll(".portfolio-toggle").length);
    } catch (i) {
      console.error("renderDashboard: Fehler bei Recovery/Listener", i);
    }
  }, r = typeof requestAnimationFrame == "function" ? (i) => requestAnimationFrame(i) : (i) => setTimeout(i, 0);
  r(() => r(n));
}
ci({
  renderPositionsTable: (e) => ao(e),
  applyGainPctMetadata: Yn,
  attachSecurityDetailListener: Fe,
  attachPortfolioPositionsSorting: we,
  updatePortfolioFooter: (e) => {
    e && Zn(e);
  }
});
const go = "http://www.w3.org/2000/svg", Se = 640, Pe = 260, ye = { top: 12, right: 16, bottom: 24, left: 16 }, ve = "var(--pp-reader-chart-line, #3f51b5)", mt = "var(--pp-reader-chart-area, rgba(63, 81, 181, 0.12))", rn = "0.75rem", Qn = "var(--pp-reader-chart-baseline, rgba(96, 125, 139, 0.75))", er = "6 4", mo = 24 * 60 * 60 * 1e3;
function ho(e) {
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
function bo(e) {
  return typeof e == "string" ? e : typeof e == "number" && Number.isFinite(e) ? e.toString() : e instanceof Date && Number.isFinite(e.getTime()) ? e.toISOString() : "";
}
function G(e) {
  return `${String(e)}px`;
}
function ie(e, t = {}) {
  const n = document.createElementNS(go, e);
  return Object.entries(t).forEach(([r, i]) => {
    const o = ho(i);
    o != null && n.setAttribute(r, o);
  }), n;
}
function ht(e, t = null) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  if (typeof e == "string" && e.trim() !== "") {
    const n = Number.parseFloat(e);
    if (Number.isFinite(n))
      return n;
  }
  return t;
}
function _o(e, t) {
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
const tr = (e) => {
  if (e && typeof e == "object" && "date" in e)
    return e.date;
}, nr = (e) => {
  if (e && typeof e == "object" && "close" in e)
    return e.close;
}, rr = (e, t, n) => {
  if (Number.isFinite(e)) {
    const r = new Date(e);
    if (!Number.isNaN(r.getTime()))
      return r.toLocaleDateString("de-DE");
  }
  if (t && typeof t == "object" && "date" in t) {
    const r = t.date, i = bo(r);
    if (i)
      return i;
  }
  return Number.isFinite(e) ? e.toString() : "";
}, ir = (e, t, n) => (Number.isFinite(e) ? e : ht(e, 0) ?? 0).toLocaleString("de-DE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
}), or = ({ xFormatted: e, yFormatted: t }) => `
    <div class="chart-tooltip-date">${e}</div>
    <div class="chart-tooltip-value">${t}&nbsp;€</div>
  `;
function ar(e) {
  return e.__chartState || (e.__chartState = {
    svg: null,
    areaPath: null,
    linePath: null,
    baselineLine: null,
    focusLine: null,
    focusCircle: null,
    overlay: null,
    tooltip: null,
    width: Se,
    height: Pe,
    margin: { ...ye },
    series: [],
    points: [],
    range: null,
    xAccessor: tr,
    yAccessor: nr,
    xFormatter: rr,
    yFormatter: ir,
    tooltipRenderer: or,
    color: ve,
    areaColor: mt,
    baseline: null,
    handlersAttached: !1
  }), e.__chartState;
}
function oe(e, t, n) {
  return !Number.isFinite(e) || e < t ? t : e > n ? n : e;
}
function yo(e, t) {
  if (e.length === 0)
    return "";
  const n = [];
  e.forEach((a, s) => {
    const c = s === 0 ? "M" : "L", l = a.x.toFixed(2), d = a.y.toFixed(2);
    n.push(`${c}${l} ${d}`);
  });
  const r = e[0], o = `L${e[e.length - 1].x.toFixed(2)} ${t.toFixed(2)} L${r.x.toFixed(2)} ${t.toFixed(2)} Z`;
  return `${n.join(" ")} ${o}`;
}
function vo(e) {
  if (e.length === 0)
    return "";
  const t = [];
  return e.forEach((n, r) => {
    const i = r === 0 ? "M" : "L", o = n.x.toFixed(2), a = n.y.toFixed(2);
    t.push(`${i}${o} ${a}`);
  }), t.join(" ");
}
function So(e) {
  const { baselineLine: t, baseline: n } = e;
  if (!t)
    return;
  const r = (n == null ? void 0 : n.color) ?? Qn, i = (n == null ? void 0 : n.dashArray) ?? er;
  t.setAttribute("stroke", r), t.setAttribute("stroke-dasharray", i);
}
function on(e) {
  const { baselineLine: t, baseline: n, range: r, margin: i, width: o } = e;
  if (!t)
    return;
  const a = n == null ? void 0 : n.value;
  if (!r || a == null || !Number.isFinite(a)) {
    t.style.opacity = "0";
    return;
  }
  const { minY: s, maxY: c, boundedHeight: l } = r, d = Number.isFinite(s) ? s : a, u = (Number.isFinite(c) ? c : d + 1) - d, p = u === 0 ? 0.5 : (a - d) / u, m = oe(p, 0, 1), b = Math.max(l, 0), g = i.top + (1 - m) * b, h = Math.max(o - i.left - i.right, 0), y = i.left, v = i.left + h;
  t.setAttribute("x1", y.toFixed(2)), t.setAttribute("x2", v.toFixed(2)), t.setAttribute("y1", g.toFixed(2)), t.setAttribute("y2", g.toFixed(2)), t.style.opacity = "1";
}
function Po(e, t, n) {
  var S;
  const { width: r, height: i, margin: o } = t, { xAccessor: a, yAccessor: s } = n;
  if (e.length === 0)
    return { points: [], range: null };
  const c = e.map((w, T) => {
    const H = a(w, T), ce = s(w, T), W = _o(H, T), B = ht(ce, Number.NaN);
    return Number.isFinite(B) ? {
      index: T,
      data: w,
      xValue: W,
      yValue: B
    } : null;
  }).filter((w) => !!w);
  if (c.length === 0)
    return { points: [], range: null };
  const l = c.reduce((w, T) => Math.min(w, T.xValue), c[0].xValue), d = c.reduce((w, T) => Math.max(w, T.xValue), c[0].xValue), f = c.reduce((w, T) => Math.min(w, T.yValue), c[0].yValue), u = c.reduce((w, T) => Math.max(w, T.yValue), c[0].yValue), p = Math.max(r - o.left - o.right, 1), m = Math.max(i - o.top - o.bottom, 1), b = Number.isFinite(l) ? l : 0, g = Number.isFinite(d) ? d : b + 1, h = Number.isFinite(f) ? f : 0, y = Number.isFinite(u) ? u : h + 1, v = ht((S = t.baseline) == null ? void 0 : S.value, null), P = v != null && Number.isFinite(v) ? Math.min(h, v) : h, A = v != null && Number.isFinite(v) ? Math.max(y, v) : y, N = Math.max(
    2,
    Math.min(
      6,
      Math.round(
        Math.max(i - o.top - o.bottom, 0) / 60
      ) || 4
    )
  ), { niceMin: _, niceMax: F } = xo(
    P,
    A,
    N
  ), D = Number.isFinite(_) ? _ : h, E = Number.isFinite(F) ? F : y, R = g - b || 1, $ = E - D || 1;
  return {
    points: c.map((w) => {
      const T = R === 0 ? 0.5 : (w.xValue - b) / R, H = $ === 0 ? 0.5 : (w.yValue - D) / $, ce = o.left + T * p, W = o.top + (1 - H) * m;
      return {
        ...w,
        x: ce,
        y: W
      };
    }),
    range: {
      minX: b,
      maxX: g,
      minY: D,
      maxY: E,
      boundedWidth: p,
      boundedHeight: m
    }
  };
}
function sr(e, t, n, r) {
  e.width = Number.isFinite(t) ? Number(t) : Se, e.height = Number.isFinite(n) ? Number(n) : Pe, e.margin = {
    top: Number.isFinite(r == null ? void 0 : r.top) ? Number(r == null ? void 0 : r.top) : ye.top,
    right: Number.isFinite(r == null ? void 0 : r.right) ? Number(r == null ? void 0 : r.right) : ye.right,
    bottom: Number.isFinite(r == null ? void 0 : r.bottom) ? Number(r == null ? void 0 : r.bottom) : ye.bottom,
    left: Number.isFinite(r == null ? void 0 : r.left) ? Number(r == null ? void 0 : r.left) : ye.left
  };
}
function Ao(e, t) {
  const n = e.xFormatter(t.xValue, t.data, t.index), r = e.yFormatter(t.yValue, t.data, t.index);
  return e.tooltipRenderer({
    point: t,
    xFormatted: n,
    yFormatted: r,
    data: t.data,
    index: t.index
  });
}
function No(e, t, n) {
  const { tooltip: r, width: i, margin: o, height: a } = e;
  if (!r)
    return;
  const s = a - o.bottom;
  r.style.visibility = "visible", r.style.opacity = "1";
  const c = r.offsetWidth || 0, l = r.offsetHeight || 0, d = oe(t.x - c / 2, o.left, i - o.right - c), f = Math.max(s - l, 0), u = 12, p = Number.isFinite(n) ? oe(n ?? 0, o.top, s) : t.y;
  let m = p - l - u;
  m < o.top && (m = p + u), m = oe(m, 0, f);
  const b = G(Math.round(d)), g = G(Math.round(m));
  r.style.transform = `translate(${b}, ${g})`;
}
function bt(e) {
  const { tooltip: t, focusLine: n, focusCircle: r } = e;
  t && (t.style.opacity = "0", t.style.visibility = "hidden"), n && (n.style.opacity = "0"), r && (r.style.opacity = "0");
}
function Fo(e, t) {
  if (t.handlersAttached || !t.overlay)
    return;
  const n = (i) => {
    if (t.points.length === 0 || !t.svg) {
      bt(t);
      return;
    }
    const o = t.svg.getBoundingClientRect(), a = i.clientX - o.left, s = i.clientY - o.top;
    let c = t.points[0], l = Math.abs(a - c.x);
    for (let d = 1; d < t.points.length; d += 1) {
      const f = t.points[d], u = Math.abs(a - f.x);
      u < l && (l = u, c = f);
    }
    t.focusCircle && (t.focusCircle.setAttribute("cx", c.x.toFixed(2)), t.focusCircle.setAttribute("cy", c.y.toFixed(2)), t.focusCircle.style.opacity = "1"), t.focusLine && (t.focusLine.setAttribute("x1", c.x.toFixed(2)), t.focusLine.setAttribute("x2", c.x.toFixed(2)), t.focusLine.setAttribute("y1", t.margin.top.toFixed(2)), t.focusLine.setAttribute(
      "y2",
      (t.height - t.margin.bottom).toFixed(2)
    ), t.focusLine.style.opacity = "1"), t.tooltip && (t.tooltip.innerHTML = Ao(t, c), No(t, c, s));
  }, r = () => {
    bt(t);
  };
  t.overlay.addEventListener("pointermove", n), t.overlay.addEventListener("pointerenter", n), t.overlay.addEventListener("pointerleave", r), t.handlersAttached = !0, t.handlePointerMove = n, t.handlePointerLeave = r, e.addEventListener("pointercancel", r);
}
function wo(e, t = {}) {
  const n = document.createElement("div");
  n.className = "line-chart-container", n.dataset.chartType = "line", n.style.position = "relative";
  const r = ie("svg", {
    width: Se,
    height: Pe,
    viewBox: `0 0 ${String(Se)} ${String(Pe)}`,
    role: "img",
    "aria-hidden": "true",
    focusable: "false"
  });
  r.classList.add("line-chart-svg");
  const i = ie("path", {
    class: "line-chart-area",
    fill: mt,
    stroke: "none"
  }), o = ie("line", {
    class: "line-chart-baseline",
    stroke: Qn,
    "stroke-width": 1,
    "stroke-dasharray": er,
    opacity: 0
  }), a = ie("path", {
    class: "line-chart-path",
    fill: "none",
    stroke: ve,
    "stroke-width": 2,
    "stroke-linecap": "round",
    "stroke-linejoin": "round"
  }), s = ie("line", {
    class: "line-chart-focus-line",
    stroke: ve,
    "stroke-width": 1,
    "stroke-dasharray": "4 4",
    opacity: 0
  }), c = ie("circle", {
    class: "line-chart-focus-circle",
    r: 4,
    fill: "#fff",
    stroke: ve,
    "stroke-width": 2,
    opacity: 0
  }), l = ie("rect", {
    class: "line-chart-overlay",
    fill: "transparent",
    x: 0,
    y: 0,
    width: Se,
    height: Pe
  });
  r.appendChild(i), r.appendChild(o), r.appendChild(a), r.appendChild(s), r.appendChild(c), r.appendChild(l), n.appendChild(r);
  const d = document.createElement("div");
  d.className = "chart-tooltip", d.style.position = "absolute", d.style.top = "0", d.style.left = "0", d.style.pointerEvents = "none", d.style.opacity = "0", d.style.visibility = "hidden", n.appendChild(d), e.appendChild(n);
  const f = ar(n);
  if (f.svg = r, f.areaPath = i, f.linePath = a, f.baselineLine = o, f.focusLine = s, f.focusCircle = c, f.overlay = l, f.tooltip = d, f.xAccessor = t.xAccessor ?? tr, f.yAccessor = t.yAccessor ?? nr, f.xFormatter = t.xFormatter ?? rr, f.yFormatter = t.yFormatter ?? ir, f.tooltipRenderer = t.tooltipRenderer ?? or, f.color = t.color ?? ve, f.areaColor = t.areaColor ?? mt, f.baseline = t.baseline ?? null, f.handlersAttached = !1, !f.xAxis) {
    const u = document.createElement("div");
    u.className = "line-chart-axis line-chart-axis-x", u.style.position = "absolute", u.style.left = "0", u.style.right = "0", u.style.bottom = "0", u.style.pointerEvents = "none", u.style.fontSize = rn, u.style.color = "var(--secondary-text-color)", u.style.display = "block", n.appendChild(u), f.xAxis = u;
  }
  if (!f.yAxis) {
    const u = document.createElement("div");
    u.className = "line-chart-axis line-chart-axis-y", u.style.position = "absolute", u.style.top = "0", u.style.bottom = "0", u.style.left = "0", u.style.pointerEvents = "none", u.style.fontSize = rn, u.style.color = "var(--secondary-text-color)", u.style.display = "block", n.appendChild(u), f.yAxis = u;
  }
  return sr(f, t.width, t.height, t.margin), a.setAttribute("stroke", f.color), s.setAttribute("stroke", f.color), c.setAttribute("stroke", f.color), i.setAttribute("fill", f.areaColor), cr(n, t), Fo(n, f), n;
}
function cr(e, t = {}) {
  if (!e) {
    console.error("updateLineChart: container element is required");
    return;
  }
  const n = ar(e);
  if (!n.svg || !n.linePath || !n.overlay) {
    console.error("updateLineChart: chart was not initialised with renderLineChart");
    return;
  }
  t.xAccessor && (n.xAccessor = t.xAccessor), t.yAccessor && (n.yAccessor = t.yAccessor), t.xFormatter && (n.xFormatter = t.xFormatter), t.yFormatter && (n.yFormatter = t.yFormatter), t.tooltipRenderer && (n.tooltipRenderer = t.tooltipRenderer), t.color && (n.color = t.color, n.linePath.setAttribute("stroke", n.color), n.focusLine && n.focusLine.setAttribute("stroke", n.color), n.focusCircle && n.focusCircle.setAttribute("stroke", n.color)), t.areaColor && (n.areaColor = t.areaColor, n.areaPath && n.areaPath.setAttribute("fill", n.areaColor)), Object.prototype.hasOwnProperty.call(t, "baseline") && (n.baseline = t.baseline ?? null), So(n), sr(n, t.width, t.height, t.margin);
  const { width: r, height: i, margin: o } = n;
  n.svg.setAttribute("width", String(r)), n.svg.setAttribute("height", String(i)), n.svg.setAttribute("viewBox", `0 0 ${String(r)} ${String(i)}`), n.overlay.setAttribute("x", o.left.toFixed(2)), n.overlay.setAttribute("y", o.top.toFixed(2)), n.overlay.setAttribute(
    "width",
    Math.max(r - o.left - o.right, 0).toFixed(2)
  ), n.overlay.setAttribute(
    "height",
    Math.max(i - o.top - o.bottom, 0).toFixed(2)
  ), Array.isArray(t.series) && (n.series = Array.from(t.series));
  const { points: a, range: s } = Po(n.series, n, {
    xAccessor: n.xAccessor,
    yAccessor: n.yAccessor
  });
  if (n.points = a, n.range = s, a.length === 0) {
    n.linePath.setAttribute("d", ""), n.areaPath && n.areaPath.setAttribute("d", ""), bt(n), an(n), on(n);
    return;
  }
  const c = vo(a);
  if (n.linePath.setAttribute("d", c), n.areaPath && s) {
    const l = n.margin.top + s.boundedHeight, d = yo(a, l);
    n.areaPath.setAttribute("d", d);
  }
  an(n), on(n);
}
function an(e) {
  const { xAxis: t, yAxis: n, range: r, margin: i, height: o, yFormatter: a } = e;
  if (!t || !n)
    return;
  if (!r) {
    t.innerHTML = "", n.innerHTML = "";
    return;
  }
  const { minX: s, maxX: c, minY: l, maxY: d, boundedWidth: f, boundedHeight: u } = r, p = Number.isFinite(s) && Number.isFinite(c) && c >= s, m = Number.isFinite(l) && Number.isFinite(d) && d >= l, b = Math.max(f, 0), g = Math.max(u, 0);
  if (t.style.left = G(i.left), t.style.width = G(b), t.style.top = G(o - i.bottom + 6), t.innerHTML = "", p && b > 0) {
    const y = (c - s) / mo, v = Math.max(2, Math.min(6, Math.round(b / 140) || 4));
    Eo(e, s, c, v, y).forEach(({ positionRatio: A, label: N }) => {
      const _ = document.createElement("div");
      _.className = "line-chart-axis-tick line-chart-axis-tick-x", _.style.position = "absolute", _.style.bottom = "0";
      const F = oe(A, 0, 1);
      _.style.left = G(F * b);
      let D = "-50%", E = "center";
      F <= 1e-3 ? (D = "0", E = "left", _.style.marginLeft = "2px") : F >= 0.999 && (D = "-100%", E = "right", _.style.marginRight = "2px"), _.style.transform = `translateX(${D})`, _.style.textAlign = E, _.textContent = N, t.appendChild(_);
    });
  }
  n.style.top = G(i.top), n.style.height = G(g);
  const h = Math.max(i.left - 6, 0);
  if (n.style.left = "0", n.style.width = G(Math.max(h, 0)), n.innerHTML = "", m && g > 0) {
    const y = Math.max(2, Math.min(6, Math.round(g / 60) || 4)), v = Do(l, d, y), P = a;
    v.forEach(({ value: A, positionRatio: N }) => {
      const _ = document.createElement("div");
      _.className = "line-chart-axis-tick line-chart-axis-tick-y", _.style.position = "absolute", _.style.left = "0";
      const D = (1 - oe(N, 0, 1)) * g;
      _.style.top = G(D), _.textContent = P(A, null, -1), n.appendChild(_);
    });
  }
}
function xo(e, t, n = 4) {
  if (!Number.isFinite(e) || !Number.isFinite(t))
    return {
      niceMin: e,
      niceMax: t
    };
  const r = Math.max(2, n);
  if (t === e) {
    const l = _t(Math.abs(e) || 1);
    return {
      niceMin: e - l,
      niceMax: t + l
    };
  }
  const o = (t - e) / (r - 1), a = _t(o), s = Math.floor(e / a) * a, c = Math.ceil(t / a) * a;
  return s === c ? {
    niceMin: e,
    niceMax: t + a
  } : {
    niceMin: s,
    niceMax: c
  };
}
function Eo(e, t, n, r, i) {
  if (!Number.isFinite(t) || !Number.isFinite(n) || n < t)
    return [];
  if (!Number.isFinite(i) || i <= 0)
    return [
      {
        positionRatio: 0.5,
        label: sn(e, t, i || 0)
      }
    ];
  const o = Math.max(2, r), a = [], s = n - t;
  for (let c = 0; c < o; c += 1) {
    const l = o === 1 ? 0.5 : c / (o - 1), d = t + l * s;
    a.push({
      positionRatio: l,
      label: sn(e, d, i)
    });
  }
  return a;
}
function sn(e, t, n) {
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
function Do(e, t, n) {
  if (!Number.isFinite(e) || !Number.isFinite(t))
    return [];
  if (t === e)
    return [
      {
        value: e,
        positionRatio: 0.5
      }
    ];
  const r = t - e, i = Math.max(2, n), o = r / (i - 1), a = _t(o), s = Math.floor(e / a) * a, c = Math.ceil(t / a) * a, l = [];
  for (let d = s; d <= c + a / 2; d += a) {
    const f = (d - e) / (t - e);
    l.push({
      value: d,
      positionRatio: oe(f, 0, 1)
    });
  }
  return l.length > i + 2 ? l.filter((d, f) => f % 2 === 0) : l;
}
function _t(e) {
  if (!Number.isFinite(e) || e === 0)
    return 1;
  const t = Math.floor(Math.log10(Math.abs(e))), n = Math.abs(e) / 10 ** t;
  let r;
  return n <= 1 ? r = 1 : n <= 2 ? r = 2 : n <= 5 ? r = 5 : r = 10, r * 10 ** t;
}
function Ro(e) {
  return Array.isArray(e) && e.every((t) => typeof t == "string");
}
function $o(e) {
  return typeof e == "object" && e !== null;
}
function Lo(e) {
  if (!$o(e))
    return !1;
  const t = e;
  return typeof t.portfolioUuid != "string" ? !1 : Ro(t.securityUuids);
}
function To(e) {
  return e instanceof CustomEvent ? Lo(e.detail) : !1;
}
const ut = { min: 0, max: 6 }, Be = { min: 2, max: 4 }, Co = "1Y", lr = [
  "1M",
  "6M",
  "1Y",
  "5Y",
  "ALL"
], Mo = {
  "1M": 30,
  "6M": 182,
  "1Y": 365,
  "5Y": 1826,
  ALL: Number.POSITIVE_INFINITY
}, ft = {
  aggregation: "Aggregationsdaten",
  totals: "Kaufsummen",
  eur_total: "EUR-Kaufsumme"
}, le = /* @__PURE__ */ new Map(), Ie = /* @__PURE__ */ new Map(), xe = /* @__PURE__ */ new Map(), ur = "pp-reader:portfolio-positions-updated", Ae = /* @__PURE__ */ new Map();
function ko(e) {
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
function Io(e, t) {
  if (e) {
    if (t) {
      xe.set(e, t);
      return;
    }
    xe.delete(e);
  }
}
function Ho(e) {
  if (!e || typeof window > "u")
    return null;
  if (xe.has(e)) {
    const t = xe.get(e) || null;
    if (t)
      return t;
  }
  return null;
}
function fr(e) {
  return le.has(e) || le.set(e, /* @__PURE__ */ new Map()), le.get(e);
}
function dr(e) {
  if (e && le.has(e)) {
    try {
      const t = le.get(e);
      t && t.clear();
    } catch (t) {
      console.warn("invalidateHistoryCache: Konnte Cache nicht leeren", e, t);
    }
    le.delete(e);
  }
}
function pr(e) {
  e && xe.delete(e);
}
function Uo(e, t) {
  if (!e || !t)
    return;
  const n = t.securityUuids;
  (Array.isArray(n) ? n : []).includes(e) && (dr(e), pr(e));
}
function zo(e) {
  if (!e || Ae.has(e))
    return;
  const t = (n) => {
    To(n) && Uo(e, n.detail);
  };
  try {
    window.addEventListener(ur, t), Ae.set(e, t);
  } catch (n) {
    console.error("ensureLiveUpdateSubscription: Registrierung fehlgeschlagen", n);
  }
}
function Vo(e) {
  if (!e || !Ae.has(e))
    return;
  const t = Ae.get(e);
  try {
    t && window.removeEventListener(ur, t);
  } catch (n) {
    console.error("removeLiveUpdateSubscription: Entfernen des Listeners fehlgeschlagen", n);
  }
  Ae.delete(e);
}
function qo(e) {
  e && (Vo(e), dr(e), pr(e));
}
function cn(e, t) {
  if (!Ie.has(e)) {
    Ie.set(e, { activeRange: t });
    return;
  }
  const n = Ie.get(e);
  n && (n.activeRange = t);
}
function gr(e) {
  var t;
  return ((t = Ie.get(e)) == null ? void 0 : t.activeRange) ?? Co;
}
function Oe(e) {
  const t = Date.UTC(
    e.getUTCFullYear(),
    e.getUTCMonth(),
    e.getUTCDate()
  );
  return Math.floor(t / 864e5);
}
function yt(e) {
  const t = new Date(e.getTime());
  return t.setUTCHours(0, 0, 0, 0), t;
}
function k(e) {
  return Re(e);
}
function Bo(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t || null;
}
function We(e) {
  const t = Bo(e);
  return t ? t.toUpperCase() : null;
}
function mr(e, t = "Unbekannter Fehler") {
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
function hr(e) {
  const t = yt(/* @__PURE__ */ new Date()), n = Mo[e], r = { end_date: Oe(t) };
  if (Number.isFinite(n) && n > 0) {
    const i = new Date(t.getTime());
    i.setUTCDate(i.getUTCDate() - (n - 1)), r.start_date = Oe(i);
  }
  return r;
}
function br(e) {
  if (!e)
    return null;
  if (e instanceof Date && !Number.isNaN(e.getTime()))
    return new Date(e.getTime());
  if (typeof e == "number" && Number.isFinite(e)) {
    const t = e * 864e5;
    if (Number.isFinite(t))
      return new Date(t);
  }
  if (typeof e == "string") {
    const t = e.trim();
    if (/^\d{8}$/.test(t)) {
      const r = Number.parseInt(t.slice(0, 4), 10), i = Number.parseInt(t.slice(4, 6), 10) - 1, o = Number.parseInt(t.slice(6, 8), 10);
      if (Number.isFinite(r) && Number.isFinite(i) && Number.isFinite(o)) {
        const a = new Date(Date.UTC(r, i, o));
        if (!Number.isNaN(a.getTime()))
          return a;
      }
    }
    const n = Date.parse(t);
    if (Number.isFinite(n))
      return new Date(n);
  }
  return null;
}
function Ke(e) {
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
function _r(e) {
  return Array.isArray(e) ? e.map((t) => {
    let r = k(t.close);
    if (r == null) {
      const o = k(t.close_raw);
      o != null && (r = o / 1e8);
    }
    return r == null ? null : {
      date: br(t.date) ?? t.date,
      close: r
    };
  }).filter((t) => !!t) : [];
}
function Ht(e) {
  var r;
  const t = k(e == null ? void 0 : e.last_price_native) ?? k((r = e == null ? void 0 : e.last_price) == null ? void 0 : r.native) ?? null;
  if (x(t))
    return t;
  if (We(e == null ? void 0 : e.currency_code) === "EUR") {
    const i = k(e == null ? void 0 : e.last_price_eur);
    if (x(i))
      return i;
  }
  return null;
}
function Oo(e) {
  if (!e)
    return null;
  const n = e.last_price_fetched_at, r = Ke(n);
  if (r != null)
    return r;
  const i = e.last_price, o = i == null ? void 0 : i.fetched_at;
  return Ke(o) ?? null;
}
function vt(e, t) {
  let n = [];
  Array.isArray(e) && (n = e.map((l) => ({
    ...l
  })));
  const r = n.slice(), i = Ht(t);
  if (!x(i))
    return r;
  const o = Oo(t) ?? Date.now(), a = new Date(o);
  if (Number.isNaN(a.getTime()))
    return r;
  const s = Oe(yt(a));
  let c = null;
  for (let l = r.length - 1; l >= 0; l -= 1) {
    const d = r[l], f = br(d.date);
    if (!f)
      continue;
    const u = Oe(yt(f));
    if (c == null && (c = u), u === s)
      return d.close !== i && (r[l] = { ...d, close: i }), r;
    if (u < s)
      break;
  }
  return c != null && c > s || r.push({
    date: a,
    close: i
  }), r;
}
function x(e) {
  return typeof e == "number" && Number.isFinite(e);
}
function ln(e) {
  return typeof e == "number" && Number.isFinite(e) && e > 0;
}
function He(e, t, n) {
  if (!x(e) || !x(t))
    return !1;
  const r = Math.abs(e - t), i = Math.max(Math.abs(e), Math.abs(t), 1);
  return r <= i * 1e-4;
}
function Wo(e, t) {
  return !x(t) || t === 0 || !x(e) ? null : ui((e - t) / t * 100);
}
function yr(e, t) {
  if (e.length === 0)
    return { priceChange: null, priceChangePct: null };
  const n = e[0], r = k(n.close);
  if (!x(r) || r === 0)
    return { priceChange: null, priceChangePct: null };
  const i = e[e.length - 1], o = k(i.close), a = k(t) ?? o;
  if (!x(a))
    return { priceChange: null, priceChangePct: null };
  const s = a - r, c = Object.is(s, -0) ? 0 : s, l = Wo(a, r);
  return { priceChange: c, priceChangePct: l };
}
function Ut(e, t) {
  if (!x(e) || e === 0)
    return "neutral";
  const n = 0.5 / Math.pow(10, t);
  return Math.abs(e) < n ? "neutral" : e > 0 ? "positive" : "negative";
}
function Ko(e, t) {
  if (!x(e))
    return '<span class="value neutral">—</span>';
  const n = ue(e);
  if (n === "—")
    return '<span class="value neutral">—</span>';
  const r = Ut(e, Be.max), i = t ? `&nbsp;${t}` : "";
  return `<span class="value ${r}">${n}${i}</span>`;
}
function Go(e) {
  return x(e) ? `<span class="value ${Ut(e, 2)} value--percentage">${Y(e)}&nbsp;%</span>` : '<span class="value neutral">—</span>';
}
function vr(e, t, n, r) {
  const i = e, o = i.length > 0 ? i : "Zeitraum";
  return `
    <div class="security-info-bar" data-range="${i}">
      <div class="security-info-item">
        <span class="label">Preisänderung (${o})</span>
        <div class="value-row">
          ${Ko(t, r)}
          ${Go(n)}
        </div>
      </div>
    </div>
  `;
}
function jo(e) {
  return `
    <div class="security-range-selector" role="group" aria-label="Zeitraum">
      ${lr.map((n) => `
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
function Sr(e, t = { status: "empty" }) {
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
      const r = mr(
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
function Yo(e) {
  const t = k(e);
  if (t == null)
    return "—";
  const n = Math.abs(t % 1) > 0, r = n ? 2 : ut.min, i = n ? ut.max : ut.min;
  return t.toLocaleString("de-DE", {
    minimumFractionDigits: r,
    maximumFractionDigits: i
  });
}
function ue(e) {
  const t = k(e);
  return t == null ? "—" : t.toLocaleString("de-DE", {
    minimumFractionDigits: Be.min,
    maximumFractionDigits: Be.max
  });
}
function Xo(e, t) {
  const n = ue(e), r = `&nbsp;${t}`;
  return `<span class="${Ut(e, Be.max)}">${n}${r}</span>`;
}
function Zo(e) {
  return e == null ? "" : (typeof e == "string" ? e : String(e)).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function Jo(e, t, n) {
  const r = $e(e == null ? void 0 : e.average_cost), i = (r == null ? void 0 : r.account) ?? (x(t) ? t : k(t));
  if (!x(i))
    return null;
  const o = (e == null ? void 0 : e.account_currency_code) ?? (e == null ? void 0 : e.account_currency);
  if (typeof o == "string" && o.trim())
    return o.trim().toUpperCase();
  const a = We(e == null ? void 0 : e.currency_code) ?? "", s = (r == null ? void 0 : r.security) ?? (r == null ? void 0 : r.native) ?? (x(n) ? n : k(n)), c = kn(e == null ? void 0 : e.aggregation);
  if (a && x(s) && He(i, s))
    return a;
  const l = k(c == null ? void 0 : c.purchase_total_security) ?? k(e == null ? void 0 : e.purchase_total_security), d = k(c == null ? void 0 : c.purchase_total_account) ?? k(e == null ? void 0 : e.purchase_total_account);
  let f = null;
  if (x(l) && l !== 0 && x(d) && (f = d / l), (r == null ? void 0 : r.source) === "eur_total")
    return "EUR";
  const p = r == null ? void 0 : r.eur;
  if (x(p) && He(i, p))
    return "EUR";
  const m = k(e == null ? void 0 : e.purchase_value_eur);
  return x(m) ? "EUR" : f != null && He(f, 1) ? a || null : a === "EUR" ? "EUR" : a || "EUR";
}
function un(e) {
  return typeof e != "number" || !Number.isFinite(e) || e <= 0 ? null : e.toLocaleString("de-DE", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
  });
}
function Qo(e) {
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
    const a = t == null ? void 0 : t[o], s = Ke(a);
    if (s != null)
      return s;
  }
  const r = [];
  t && "last_price_fetched_at" in t && r.push(t.last_price_fetched_at);
  const i = e == null ? void 0 : e.last_price;
  i && typeof i == "object" && r.push(i.fetched_at), t && "last_price_date" in t && r.push(t.last_price_date);
  for (const o of r) {
    const a = Ke(o);
    if (a != null)
      return a;
  }
  return null;
}
function ea(e) {
  if (e == null || !Number.isFinite(e))
    return null;
  const t = new Date(e);
  return Number.isNaN(t.getTime()) ? null : t.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}
function ta(e, t) {
  if (!e)
    return null;
  const n = We(e.currency_code) ?? "", r = We(t) ?? "";
  if (!n || !r || n === r)
    return null;
  const i = $e(e.average_cost);
  if (!i)
    return null;
  const o = i.native ?? i.security ?? null, a = i.account ?? i.eur ?? null;
  if (!ln(o) || !ln(a))
    return null;
  const s = a / o;
  if (!Number.isFinite(s) || s <= 0)
    return null;
  const c = un(s);
  if (!c)
    return null;
  let l = null;
  if (s > 0) {
    const h = 1 / s;
    Number.isFinite(h) && h > 0 && (l = un(h));
  }
  const d = Qo(e), f = ea(d), u = [`FX-Kurs (Kauf): 1 ${n} = ${c} ${r}`];
  l && u.push(`1 ${r} = ${l} ${n}`);
  const p = [], m = i.source, b = m in ft ? ft[m] : ft.aggregation;
  if (p.push(`Quelle: ${b}`), x(i.coverage_ratio)) {
    const h = Math.min(Math.max(i.coverage_ratio * 100, 0), 100);
    p.push(
      `Abdeckung: ${h.toLocaleString("de-DE", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      })}%`
    );
  }
  p.length && u.push(...p);
  const g = f ?? "Datum unbekannt";
  return `${u.join(" · ")} (Stand: ${g})`;
}
function fn(e) {
  if (!e)
    return null;
  const t = $e(e.average_cost), n = (t == null ? void 0 : t.native) ?? (t == null ? void 0 : t.security) ?? null;
  return x(n) ? n : null;
}
function dn(e) {
  var W;
  if (!e)
    return '<div class="meta-error">Keine Snapshot-Daten verfügbar.</div>';
  const t = e.currency_code || "EUR", n = e.total_holdings_precise ?? e.total_holdings, r = Yo(n), i = e.last_price_native ?? ((W = e.last_price) == null ? void 0 : W.native) ?? e.last_price_eur, o = ue(i), a = o === "—" ? null : `${o}${`&nbsp;${t}`}`, s = k(e.market_value_eur) ?? k(e.current_value_eur) ?? null, c = $e(e.average_cost), l = (c == null ? void 0 : c.native) ?? (c == null ? void 0 : c.security) ?? null, d = (c == null ? void 0 : c.eur) ?? null, u = (c == null ? void 0 : c.account) ?? null ?? d, p = ae(e.performance), m = (p == null ? void 0 : p.day_change) ?? null, b = (m == null ? void 0 : m.price_change_native) ?? null, g = (m == null ? void 0 : m.price_change_eur) ?? null, h = x(b) ? b : g, y = x(b) ? t : "EUR", v = (B, V = "") => {
    const O = ["value"];
    return V && O.push(...V.split(" ").filter(Boolean)), `<span class="${O.join(" ")}">${B}</span>`;
  }, P = (B = "") => {
    const V = ["value--missing"];
    return B && V.push(B), v("—", V.join(" "));
  }, A = (B, V = "") => {
    if (!x(B))
      return P(V);
    const O = ["value--gain"];
    return V && O.push(V), v(Wr(B), O.join(" "));
  }, N = (B, V = "") => {
    if (!x(B))
      return P(V);
    const O = ["value--gain-percentage"];
    return V && O.push(V), v(Kr(B), O.join(" "));
  }, _ = a ? v(a, "value--price") : P("value--price"), F = r === "—" ? P("value--holdings") : v(r, "value--holdings"), D = x(s) ? v(`${Y(s)}&nbsp;€`, "value--market-value") : P("value--market-value"), E = x(h) ? v(
    Xo(h, y),
    "value--gain value--absolute"
  ) : P("value--absolute"), R = N(
    m == null ? void 0 : m.change_pct,
    "value--percentage"
  ), $ = A(
    p == null ? void 0 : p.total_change_eur,
    "value--absolute"
  ), L = N(
    p == null ? void 0 : p.total_change_pct,
    "value--percentage"
  ), S = Jo(
    e,
    u,
    l
  ), w = ta(
    e,
    S
  ), T = w ? ` title="${Zo(w)}"` : "", H = [];
  return x(l) ? H.push(
    v(
      `${ue(l)}${`&nbsp;${t}`}`,
      "value--average value--average-native"
    )
  ) : H.push(
    P("value--average value--average-native")
  ), x(u) && (!x(l) || !S || !t || S !== t || !He(u, l)) && x(u) && H.push(
    v(
      `${ue(u)}${S ? `&nbsp;${S}` : ""}`,
      "value--average value--average-eur"
    )
  ), `
    <div class="security-meta-grid security-meta-grid--expanded">
      <div class="security-meta-item security-meta-item--price">
        <span class="label">Letzter Preis</span>
        <div class="value-group">${_}</div>
      </div>
      <div class="security-meta-item security-meta-item--average">
        <span class="label">Durchschnittlicher Kaufpreis</span>
        <div class="value-group"${T}>
          ${H.join("")}
        </div>
      </div>
      <div class="security-meta-item security-meta-item--day-change">
        <span class="label">Tagesänderung</span>
        <div class="value-group">
          ${E}
          ${R}
        </div>
      </div>
      <div class="security-meta-item security-meta-item--total-change">
        <span class="label">Gesamtänderung</span>
        <div class="value-group">
          ${$}
          ${L}
        </div>
      </div>
      <div class="security-meta-item security-meta-item--holdings">
        <span class="label">Bestand</span>
        <div class="value-group">${F}</div>
      </div>
      <div class="security-meta-item security-meta-item--market-value">
        <span class="label">Marktwert (EUR)</span>
        <div class="value-group">${D}</div>
      </div>
    </div>
  `;
}
function Pr(e) {
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
function na(e, t, {
  currency: n,
  baseline: r
} = {}) {
  const i = e.clientWidth || e.offsetWidth || 0, o = i > 0 ? i : 640, a = Math.min(Math.max(Math.floor(o * 0.55), 220), 420), s = (n || "").toUpperCase() || "EUR", c = x(r) ? r : null;
  return {
    width: o,
    height: a,
    margin: { top: 16, right: 20, bottom: 32, left: 20 },
    series: t,
    yFormatter: (l) => ue(l),
    tooltipRenderer: ({ xFormatted: l, yFormatted: d }) => `
      <div class="chart-tooltip-date">${l}</div>
      <div class="chart-tooltip-value">${d}&nbsp;${s}</div>
    `,
    baseline: c != null ? {
      value: c
    } : null
  };
}
const pn = /* @__PURE__ */ new WeakMap();
function ra(e, t, n = {}) {
  if (t.length === 0)
    return;
  const r = na(e, t, n);
  let i = pn.get(e) ?? null;
  if (!i || !e.contains(i)) {
    e.innerHTML = "", i = wo(e, r), i && pn.set(e, i);
    return;
  }
  cr(i, r);
}
function gn(e, t) {
  e && (e.dataset.activeRange = t, e.querySelectorAll(".security-range-button").forEach((n) => {
    const i = n.dataset.range === t;
    n.classList.toggle("active", i), n.setAttribute("aria-pressed", i ? "true" : "false"), n.disabled = !1, n.classList.remove("loading");
  }));
}
function ia(e, t, n, r, i) {
  const o = e.querySelector(".security-info-bar");
  if (!o || !o.parentElement)
    return;
  const a = document.createElement("div");
  a.innerHTML = vr(t, n, r, i).trim();
  const s = a.firstElementChild;
  s && o.parentElement.replaceChild(s, o);
}
function mn(e, t, n, r, i = {}) {
  const o = e.querySelector(".security-detail-placeholder");
  if (o && (o.innerHTML = `
    <h2>Historie</h2>
    ${Sr(t, n)}
  `, n.status === "loaded" && Array.isArray(r) && r.length)) {
    const a = o.querySelector(".history-chart");
    a && requestAnimationFrame(() => {
      ra(a, r, i);
    });
  }
}
function oa(e) {
  const {
    root: t,
    hass: n,
    panelConfig: r,
    securityUuid: i,
    snapshot: o,
    initialRange: a,
    initialHistory: s,
    initialHistoryState: c
  } = e;
  setTimeout(() => {
    const l = t.querySelector(".security-range-selector");
    if (!l)
      return;
    const d = fr(i), f = fn(o);
    Array.isArray(s) && c.status !== "error" && d.set(a, s), zo(i), cn(i, a), gn(l, a);
    const p = vt(
      s,
      o
    );
    let m = c;
    m.status !== "error" && (m = p.length ? { status: "loaded" } : { status: "empty" }), mn(
      t,
      a,
      m,
      p,
      {
        currency: o == null ? void 0 : o.currency_code,
        baseline: f
      }
    );
    const b = async (g) => {
      if (g === gr(i))
        return;
      const h = l.querySelector(
        `.security-range-button[data-range="${g}"]`
      );
      h && (h.disabled = !0, h.classList.add("loading"));
      let y = d.get(g) ?? null, v = null, P = [];
      if (y)
        v = y.length ? { status: "loaded" } : { status: "empty" };
      else
        try {
          const D = hr(g), E = await Ln(
            n,
            r,
            i,
            D
          );
          y = _r(E.prices), d.set(g, y), v = y.length ? { status: "loaded" } : { status: "empty" };
        } catch (D) {
          console.error("Range-Wechsel: Historie konnte nicht geladen werden", D), y = [], v = {
            status: "error",
            message: Pr(D) || "Die historischen Daten konnten aufgrund eines Fehlers nicht geladen werden."
          };
        }
      P = vt(y, o), v.status !== "error" && (v = P.length ? { status: "loaded" } : { status: "empty" });
      const A = Ht(o), { priceChange: N, priceChangePct: _ } = yr(
        P,
        A
      );
      cn(i, g), gn(l, g), ia(
        t,
        g,
        N,
        _,
        o == null ? void 0 : o.currency_code
      );
      const F = fn(o);
      mn(
        t,
        g,
        v,
        P,
        {
          currency: o == null ? void 0 : o.currency_code,
          baseline: F
        }
      );
    };
    l.addEventListener("click", (g) => {
      var v;
      const h = (v = g.target) == null ? void 0 : v.closest(".security-range-button");
      if (!h || h.disabled)
        return;
      const { range: y } = h.dataset;
      !y || !lr.includes(y) || b(y);
    });
  }, 0);
}
async function aa(e, t, n, r) {
  if (!r)
    return console.error("renderSecurityDetail: securityUuid fehlt"), '<div class="card"><h2>Fehler</h2><p>Kein Wertpapier angegeben.</p></div>';
  const i = Ho(r);
  let o = null, a = null;
  try {
    const N = await ti(
      t,
      n,
      r
    ), _ = N.snapshot;
    o = _ && typeof _ == "object" ? _ : N;
  } catch (N) {
    console.error("renderSecurityDetail: Snapshot konnte nicht geladen werden", N), a = mr(N);
  }
  const s = o || i, c = !!(i && !o), l = ((s == null ? void 0 : s.source) ?? "") === "cache";
  r && Io(r, s ?? null);
  const d = s && (c || l) ? ko({ fallbackUsed: c, flaggedAsCache: l }) : "", f = (s == null ? void 0 : s.name) || "Wertpapierdetails";
  if (a)
    return `
      ${Ue(
      f,
      dn(s)
    ).outerHTML}
      ${d}
      <div class="card error-card">
        <h2>Fehler beim Laden</h2>
        <p>${a}</p>
      </div>
    `;
  const u = gr(r), p = fr(r);
  let m = p.has(u) ? p.get(u) ?? null : null, b = { status: "empty" };
  if (Array.isArray(m))
    b = m.length ? { status: "loaded" } : { status: "empty" };
  else {
    m = [];
    try {
      const N = hr(u), _ = await Ln(
        t,
        n,
        r,
        N
      );
      m = _r(_.prices), p.set(u, m), b = m.length ? { status: "loaded" } : { status: "empty" };
    } catch (N) {
      console.error(
        "renderSecurityDetail: Historie konnte nicht geladen werden",
        N
      ), b = {
        status: "error",
        message: Pr(N) || "Die historischen Daten konnten aufgrund eines Fehlers nicht geladen werden."
      };
    }
  }
  const g = vt(
    m,
    s
  );
  b.status !== "error" && (b = g.length ? { status: "loaded" } : { status: "empty" });
  const h = Ue(
    f,
    dn(s)
  ), y = Ht(s), { priceChange: v, priceChangePct: P } = yr(
    g,
    y
  ), A = vr(
    u,
    v,
    P,
    s == null ? void 0 : s.currency_code
  );
  return oa({
    root: e,
    hass: t,
    panelConfig: n,
    securityUuid: r,
    snapshot: s,
    initialRange: u,
    initialHistory: m,
    initialHistoryState: b
  }), `
    ${h.outerHTML}
    ${d}
    ${A}
    ${jo(u)}
    <div class="card security-detail-placeholder">
      <h2>Historie</h2>
      ${Sr(u, b)}
    </div>
  `;
}
function sa(e) {
  const { setSecurityDetailTabFactory: t } = e;
  if (typeof t != "function") {
    console.error("registerSecurityDetailTab: Ungültige Factory-Funktion übergeben");
    return;
  }
  t((n) => ({
    title: "Wertpapier",
    render: (r, i, o) => aa(r, i, o, n),
    cleanup: () => {
      qo(n);
    }
  }));
}
const ca = "accounts", Ar = "Konten";
function la(e) {
  const t = [], n = [];
  for (const r of e)
    ((r.currency_code ?? "").toUpperCase() || "EUR") === "EUR" ? t.push(r) : n.push(r);
  return { eur: t, fx: n };
}
function hn(e) {
  return e.reduce((t, n) => typeof n.balance == "number" && Number.isFinite(n.balance) ? t + n.balance : t, 0);
}
function bn(e) {
  return `${Y(e)} €`;
}
function ua(e) {
  if (typeof e.orig_balance != "number" || !Number.isFinite(e.orig_balance))
    return "—";
  const t = e.currency_code ?? "";
  return `${e.orig_balance.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}${t ? ` ${t}` : ""}`;
}
function fa(e) {
  return typeof e != "number" || !Number.isFinite(e) || e <= 0 ? null : e.toLocaleString("de-DE", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
  });
}
function da(e) {
  if (!e)
    return null;
  const t = new Date(e);
  return Number.isNaN(t.getTime()) ? null : t.toLocaleString("de-DE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}
function pa(e) {
  const t = [], n = e.fx_rate_source, r = da(e.fx_rate_timestamp), i = fa(e.fx_rate);
  return n && t.push(n), r && t.push(r), i && t.push(`Kurs ${i}`), t.length === 0 ? e.fx_unavailable ? "FX-Daten fehlen" : "—" : t.join(" · ");
}
function ga(e, t, n) {
  const r = t > 0 ? bn(t) : "—", i = n ? `<span class="total-wealth-note">${String(
    n
  )}&nbsp;FX-Konten ohne Kurs</span>` : "";
  return `
    <div class="header-meta-row accounts-meta">
      <span>💶 EUR-Konten: <strong>${bn(e)}</strong></span>
      <span>💱 FX-Konten (EUR): <strong>${r}</strong></span>
      ${i}
    </div>
  `;
}
function ma(e) {
  if (e === 0)
    return "";
  const t = e === 1 ? "" : "e";
  return `
    <div class="card warning-card">
      <h2>FX-Warnung</h2>
      <p>${String(
    e
  )} Fremdwährungskont${t} ohne aktuelle FX-Daten. EUR-Werte fehlen für diese Konten.</p>
    </div>
  `;
}
function ha(e, t) {
  const n = e.map((a) => ({
    name: ge(a.name, a.badges, {
      containerClass: "account-name",
      labelClass: "account-name__label"
    }),
    balance: a.balance ?? null,
    fx_unavailable: a.fx_unavailable
  })), r = ne(
    n,
    [
      { key: "name", label: "Name" },
      { key: "balance", label: "Kontostand (EUR)", align: "right" }
    ],
    ["balance"]
  ), i = t.map((a) => ({
    name: ge(a.name, a.badges, {
      containerClass: "account-name",
      labelClass: "account-name__label"
    }),
    fx_display: ua(a),
    fx_source: pe(pa(a)),
    balance: a.fx_unavailable ? null : a.balance ?? null,
    fx_unavailable: a.fx_unavailable
  })), o = ne(
    i,
    [
      { key: "name", label: "Name" },
      { key: "fx_display", label: "Betrag (FX)" },
      { key: "fx_source", label: "FX-Provenienz" },
      { key: "balance", label: "EUR", align: "right" }
    ],
    ["balance"]
  );
  return { eurTable: r, fxTable: o };
}
async function ba(e, t, n) {
  const r = await Rn(t, n);
  Rt(r.accounts);
  const i = Tt(), { eur: o, fx: a } = la(i), s = hn(o), c = hn(
    a.filter((b) => !b.fx_unavailable)
  ), l = a.filter(
    (b) => b.fx_unavailable || b.balance == null
  ).length, d = ga(s, c, l), f = Ue(Ar, d), u = ma(l), { eurTable: p, fxTable: m } = ha(o, a);
  return `
    ${f.outerHTML}
    ${u}
    <div class="card">
      <h2>EUR-Konten</h2>
      <div class="scroll-container account-table">
        ${p}
      </div>
    </div>
    <div class="card">
      <h2>Fremdwährungen</h2>
      <div class="scroll-container fx-account-table">
        ${m}
      </div>
      ${a.length ? `
        <p class="table-note" role="note">
          <span class="table-note__icon" aria-hidden="true">ℹ️</span>
          <span>FX-Provenienz zeigt Quelle, Zeitpunkt und Kurs des letzten Abgleichs.</span>
        </p>` : ""}
    </div>
  `;
}
const _a = {
  key: ca,
  title: Ar,
  render: ba
}, ya = Or, St = "pp-reader-sticky-anchor", Ge = "overview", Pt = "security:", va = [
  { key: Ge, title: "Dashboard", render: Jn },
  _a
], me = /* @__PURE__ */ new Map(), Ee = [], je = /* @__PURE__ */ new Map();
let At = null, dt = !1, fe = null, C = 0, _e = null;
function Ye(e) {
  return typeof e == "object" && e !== null;
}
function Nr(e) {
  return typeof e == "object" && e !== null && typeof e.then == "function";
}
function Sa(e) {
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
function Pa(e) {
  return e === "accounts" || e === "last_file_update" || e === "portfolio_values" || e === "portfolio_positions";
}
function _n(e) {
  const t = e.portfolio_uuid;
  if (typeof t == "string" && t)
    return t;
  const n = e.portfolioUuid;
  return typeof n == "string" && n ? n : null;
}
function Aa(e) {
  if (!e)
    return null;
  if (Array.isArray(e)) {
    for (const t of e)
      if (Ye(t)) {
        const n = _n(t);
        if (n)
          return n;
      }
    return null;
  }
  return Ye(e) ? _n(e) : null;
}
function Na(e, t) {
  switch (e) {
    case "accounts":
      return {
        type: e,
        data: Array.isArray(t) ? t : null
      };
    case "last_file_update":
      return typeof t == "string" ? { type: e, data: t } : Ye(t) ? { type: e, data: t } : { type: e, data: null };
    case "portfolio_values":
      return Array.isArray(t) ? { type: e, data: t } : { type: e, data: null };
    case "portfolio_positions":
      return Array.isArray(t) ? { type: e, data: t } : Ye(t) ? { type: e, data: t } : { type: e, data: null };
    default:
      return null;
  }
}
function zt(e) {
  return typeof e != "string" || !e.startsWith(Pt) ? null : e.slice(Pt.length) || null;
}
function Fa() {
  if (!fe)
    return !1;
  const e = Dr(fe);
  return e || (fe = null), e;
}
function X() {
  const e = Ee.map((t) => me.get(t)).filter((t) => !!t);
  return [...va, ...e];
}
function wa(e) {
  const t = X();
  return e < 0 || e >= t.length ? null : t[e];
}
function Fr(e) {
  if (!e)
    return null;
  const t = e, n = t.ppreader ?? t.pp_reader;
  return n || (Object.values(t).find((i) => !i || typeof i != "object" ? !1 : i.webcomponent_name === "pp-reader-panel") ?? null);
}
function wr() {
  try {
    const e = Vt();
    e && typeof e.rememberScrollPosition == "function" && e.rememberScrollPosition();
  } catch (e) {
    console.warn("rememberCurrentPageScroll: konnte Scroll-Position nicht sichern", e);
  }
}
function yn(e) {
  const t = X();
  return !t.length || e < 0 ? 0 : e >= t.length ? t.length - 1 : e;
}
async function xa(e, t, n, r) {
  const i = X(), o = yn(e);
  if (o === C) {
    e > C && Fa();
    return;
  }
  wr();
  const a = C >= 0 && C < i.length ? i[C] : null, s = a ? zt(a.key) : null;
  let c = o;
  if (s) {
    const l = o >= 0 && o < i.length ? i[o] : null;
    if (l && l.key === Ge && La(s, { suppressRender: !0 })) {
      const u = X().findIndex((p) => p.key === Ge);
      c = u >= 0 ? u : 0;
    }
  }
  if (!dt) {
    dt = !0;
    try {
      C = yn(c);
      const l = C;
      await Rr(t, n, r), $a(l);
    } catch (l) {
      console.error("navigateToPage: Fehler beim Rendern des Tabs", l);
    } finally {
      dt = !1;
    }
  }
}
function Xe(e, t, n, r) {
  xa(C + e, t, n, r);
}
function Ea(e, t) {
  if (!e || !t || typeof t.render != "function") {
    console.error("registerDetailTab: Ungültiger Tab-Descriptor", e, t);
    return;
  }
  const n = zt(e);
  if (n) {
    const i = je.get(n);
    i && i !== e && xr(i);
  }
  const r = {
    ...t,
    key: e
  };
  me.set(e, r), n && je.set(n, e), Ee.includes(e) || Ee.push(e);
}
function xr(e) {
  if (!e)
    return;
  const t = me.get(e);
  if (t && typeof t.cleanup == "function")
    try {
      const i = t.cleanup({ key: e });
      Nr(i) && i.catch((o) => {
        console.error(
          "unregisterDetailTab: Fehler beim asynchronen cleanup",
          o
        );
      });
    } catch (i) {
      console.error("unregisterDetailTab: Fehler beim Ausführen von cleanup", i);
    }
  me.delete(e);
  const n = Ee.indexOf(e);
  n >= 0 && Ee.splice(n, 1);
  const r = zt(e);
  r && je.get(r) === e && je.delete(r);
}
function Da(e) {
  return me.has(e);
}
function vn(e) {
  return me.get(e) ?? null;
}
function Ra(e) {
  if (e != null && typeof e != "function") {
    console.error("setSecurityDetailTabFactory: Erwartet Funktion oder null", e);
    return;
  }
  At = e ?? null;
}
function Er(e) {
  return `${Pt}${e}`;
}
function Vt() {
  var t;
  for (const n of ai())
    if (n.isConnected)
      return n;
  const e = /* @__PURE__ */ new Set();
  for (const n of si())
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
function Nt() {
  const e = Vt();
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
function $a(e) {
  const t = Vt();
  if (t && typeof t.handleExternalRender == "function")
    try {
      t.handleExternalRender(e);
    } catch (n) {
      console.warn("notifyExternalRender: Fehler beim Synchronisieren des Dashboards", n);
    }
}
function Dr(e) {
  if (!e)
    return console.error("openSecurityDetail: Ungültige securityUuid", e), !1;
  const t = Er(e);
  let n = vn(t);
  if (!n && typeof At == "function")
    try {
      const o = At(e);
      o && typeof o.render == "function" ? (Ea(t, o), n = vn(t)) : console.error("openSecurityDetail: Factory lieferte ungültigen Descriptor", o);
    } catch (o) {
      console.error("openSecurityDetail: Fehler beim Erzeugen des Tab-Descriptors", o);
    }
  if (!n)
    return console.warn(`openSecurityDetail: Kein Detail-Tab für ${e} verfügbar`), !1;
  wr();
  let i = X().findIndex((o) => o.key === t);
  return i === -1 && (i = X().findIndex((a) => a.key === t), i === -1) ? (console.error("openSecurityDetail: Tab nach Registrierung nicht auffindbar"), !1) : (C = i, fe = null, Nt(), !0);
}
function La(e, t = {}) {
  if (!e)
    return console.error("closeSecurityDetail: Ungültige securityUuid", e), !1;
  const { suppressRender: n = !1 } = t, r = Er(e);
  if (!Da(r))
    return !1;
  const o = X().findIndex((c) => c.key === r), a = o === C;
  xr(r);
  const s = X();
  if (!s.length)
    return C = 0, n || Nt(), !0;
  if (fe = e, a) {
    const c = s.findIndex((l) => l.key === Ge);
    c >= 0 ? C = c : C = Math.min(Math.max(o - 1, 0), s.length - 1);
  } else C >= s.length && (C = Math.max(0, s.length - 1));
  return n || Nt(), !0;
}
async function Rr(e, t, n) {
  let r = n;
  r || (r = Fr(t ? t.panels : null));
  const i = X();
  C >= i.length && (C = Math.max(0, i.length - 1));
  const o = wa(C);
  if (!o) {
    console.error("renderTab: Kein gültiger Tab oder keine render-Methode gefunden!");
    return;
  }
  let a;
  try {
    a = await o.render(e, t, r);
  } catch (d) {
    console.error("renderTab: Fehler beim Rendern des Tabs:", d), e.innerHTML = `<div class="card"><h2>Fehler</h2><pre>${Sa(d)}</pre></div>`;
    return;
  }
  e.innerHTML = a ?? "", o.render === Jn && It(e);
  const c = await new Promise((d) => {
    const f = window.setInterval(() => {
      const u = e.querySelector(".header-card");
      u && (clearInterval(f), d(u));
    }, 50);
  });
  let l = e.querySelector(`#${St}`);
  if (!l) {
    l = document.createElement("div"), l.id = St;
    const d = c.parentNode;
    d && "insertBefore" in d && d.insertBefore(l, c);
  }
  Ma(e, t, n), Ca(e, t, n), Ta(e);
}
function Ta(e) {
  const t = e.querySelector(".header-card"), n = e.querySelector(`#${St}`);
  if (!t || !n) {
    console.error("Fehlende Elemente für das Scrollverhalten: headerCard oder anchor.");
    return;
  }
  _e == null || _e.disconnect(), _e = new IntersectionObserver(
    ([r]) => {
      r.isIntersecting ? t.classList.remove("sticky") : t.classList.add("sticky");
    },
    {
      root: null,
      rootMargin: "0px 0px 0px 0px",
      threshold: 0
    }
  ), _e.observe(n);
}
function Ca(e, t, n) {
  const r = e.querySelector(".header-card");
  if (!r) {
    console.error("Header-Card nicht gefunden!");
    return;
  }
  ya(
    r,
    () => {
      Xe(1, e, t, n);
    },
    () => {
      Xe(-1, e, t, n);
    }
  );
}
function Ma(e, t, n) {
  const r = e.querySelector(".header-card");
  if (!r) {
    console.error("Header-Card nicht gefunden!");
    return;
  }
  const i = r.querySelector("#nav-left"), o = r.querySelector("#nav-right");
  if (!i || !o) {
    console.error("Navigationspfeile nicht gefunden!");
    return;
  }
  i.addEventListener("click", () => {
    Xe(-1, e, t, n);
  }), o.addEventListener("click", () => {
    Xe(1, e, t, n);
  }), ka(r);
}
function ka(e) {
  const t = e.querySelector("#nav-left"), n = e.querySelector("#nav-right");
  if (t && (C === 0 ? (t.disabled = !0, t.classList.add("disabled")) : (t.disabled = !1, t.classList.remove("disabled"))), n) {
    const r = X(), o = !(C === r.length - 1) || !!fe;
    n.disabled = !o, n.classList.toggle("disabled", !o);
  }
}
class Ia extends HTMLElement {
  constructor() {
    super();
    q(this, "_root");
    q(this, "_hass", null);
    q(this, "_panel", null);
    q(this, "_narrow", null);
    q(this, "_route", null);
    q(this, "_lastPanel", null);
    q(this, "_lastNarrow", null);
    q(this, "_lastRoute", null);
    q(this, "_lastPage", null);
    q(this, "_scrollPositions", {});
    q(this, "_unsubscribeEvents", null);
    q(this, "_initialized", !1);
    q(this, "_hasNewData", !1);
    q(this, "_pendingUpdates", []);
    q(this, "_entryIdWaitWarned", !1);
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
    this._panel || (this._panel = Fr(this._hass.panels ?? null));
    const n = Gt(this._hass, this._panel);
    if (!n) {
      this._entryIdWaitWarned || (console.warn("PPReaderDashboard: kein entry_id ermittelbar – warte auf Panel-Konfiguration."), this._entryIdWaitWarned = !0);
      return;
    }
    this._entryIdWaitWarned = !1, console.debug("PPReaderDashboard: entry_id (fallback) =", n), this._initialized = !0, this._initializeEventListeners(), this._render();
  }
  _initializeEventListeners() {
    var a;
    this._removeEventListeners();
    const n = (a = this._hass) == null ? void 0 : a.connection;
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
    const r = Gt(this._hass, this._panel);
    if (!r)
      return;
    const i = n.data;
    if (!Pa(i.data_type) || i.entry_id && i.entry_id !== r)
      return;
    const o = Na(i.data_type, i.data);
    o && (this._queueUpdate(o.type, o.data), this._doRender(o.type, o.data));
  }
  _doRender(n, r) {
    switch (n) {
      case "accounts":
        ji(
          r,
          this._root
        );
        break;
      case "last_file_update":
        no(
          r,
          this._root
        );
        break;
      case "portfolio_values":
        Zi(
          r,
          this._root
        );
        break;
      case "portfolio_positions":
        Qi(
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
    const i = this._cloneData(r), o = {
      type: n,
      data: i
    };
    n === "portfolio_positions" && (o.portfolioUuid = Aa(
      i
    ));
    let a = -1;
    n === "portfolio_positions" && o.portfolioUuid ? a = this._pendingUpdates.findIndex(
      (s) => s.type === n && s.portfolioUuid === o.portfolioUuid
    ) : a = this._pendingUpdates.findIndex((s) => s.type === n), a >= 0 ? this._pendingUpdates[a] = o : this._pendingUpdates.push(o), this._hasNewData = !0;
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
  rememberScrollPosition(n = C) {
    const r = Number.isInteger(n) ? n : C;
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
    const n = C;
    if (!this._hasNewData && this._panel === this._lastPanel && this._narrow === this._lastNarrow && this._route === this._lastRoute && this._lastPage === n)
      return;
    this._lastPage != null && (this._scrollPositions[this._lastPage] = this._root.scrollTop);
    const r = Rr(this._root, this._hass, this._panel);
    if (Nr(r)) {
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
customElements.get("pp-reader-dashboard") || customElements.define("pp-reader-dashboard", Ia);
console.log("PPReader dashboard module v20250914b geladen");
sa({
  setSecurityDetailTabFactory: Ra
});
export {
  za as __TEST_ONLY__,
  La as closeSecurityDetail,
  kt as flushPendingPositions,
  vn as getDetailTabDescriptor,
  Qi as handlePortfolioPositionsUpdate,
  Da as hasDetailTab,
  Dr as openSecurityDetail,
  Ua as reapplyPositionsSort,
  Ea as registerDetailTab,
  Ra as setSecurityDetailTabFactory,
  xr as unregisterDetailTab,
  Zn as updatePortfolioFooterFromDom
};
//# sourceMappingURL=dashboard.CeqyI7r9.js.map
