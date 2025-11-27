var Br = Object.defineProperty;
var Wr = (e, t, n) => t in e ? Br(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : e[t] = n;
var q = (e, t, n) => Wr(e, typeof t != "symbol" ? t + "" : t, n);
function Wt(e, t) {
  try {
    t();
  } catch (n) {
    console.warn(`addSwipeEvents: ${e} handler threw`, n);
  }
}
function jr(e, t, n) {
  let r = null;
  const i = (l) => {
    l < -50 ? Wt("left", t) : l > 50 && Wt("right", n);
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
const Et = (e, t) => {
  if (!Number.isFinite(e) || e === 0)
    return "neutral";
  const n = 0.5 / Math.pow(10, t);
  return Math.abs(e) < n ? "neutral" : e > 0 ? "positive" : "negative";
};
function H(e, t, n = void 0, r = void 0) {
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
    const u = typeof c == "number" ? c : o(c);
    return Number.isFinite(u) ? u.toLocaleString("de-DE", {
      minimumFractionDigits: l,
      maximumFractionDigits: d
    }) : "";
  }, s = (c = "") => {
    const l = c || "Kein Wert verfügbar";
    return `<span class="missing-value" role="note" aria-label="${l}" title="${l}">—</span>`;
  };
  if (["gain_abs", "gain_pct"].includes(e)) {
    if (t == null && n) {
      const f = n.performance;
      if (typeof f == "object" && f !== null) {
        const g = f[e];
        typeof g == "number" && (t = g);
      }
    }
    const c = (n == null ? void 0 : n.fx_unavailable) === !0 ? "Wechselkurs nicht verfügbar – EUR-Wert unbekannt" : "";
    if (t == null || (r == null ? void 0 : r.hasValue) === !1)
      return s(c);
    const l = typeof t == "number" ? t : o(t);
    if (!Number.isFinite(l))
      return s(c);
    const d = e === "gain_pct" ? "%" : "€";
    return i = a(l) + `&nbsp;${d}`, `<span class="${Et(l, 2)}">${i}</span>`;
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
    typeof t == "string" ? c = t : typeof t == "number" && Number.isFinite(t) ? c = t.toString() : typeof t == "boolean" ? c = t ? "true" : "false" : t instanceof Date && Number.isFinite(t.getTime()) && (c = t.toISOString()), i = c, i && (/<|&lt;|&gt;/.test(i) || (i.length > 60 && (i = i.slice(0, 59) + "…"), i.startsWith("Kontostand ") ? i = i.substring(11) : i.startsWith("Depotwert ") && (i = i.substring(10))));
  }
  return typeof i != "string" || i === "" ? s() : i;
}
function de(e, t, n = [], r = {}) {
  const { sortable: i = !1, defaultSort: o } = r, a = (o == null ? void 0 : o.key) ?? "", s = (o == null ? void 0 : o.dir) === "desc" ? "desc" : "asc", c = (p) => {
    if (p == null)
      return "";
    let h = "";
    if (typeof p == "string")
      h = p;
    else if (typeof p == "number" && Number.isFinite(p))
      h = p.toString();
    else if (typeof p == "boolean")
      h = p ? "true" : "false";
    else if (p instanceof Date && Number.isFinite(p.getTime()))
      h = p.toISOString();
    else
      return "";
    return h.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  };
  let l = "<table><thead><tr>";
  t.forEach((p) => {
    const h = p.align === "right" ? ' class="align-right"' : "";
    i && p.key ? l += `<th${h} data-sort-key="${p.key}">${p.label}</th>` : l += `<th${h}>${p.label}</th>`;
  }), l += "</tr></thead><tbody>", e.forEach((p) => {
    l += "<tr>", t.forEach((h) => {
      const v = h.align === "right" ? ' class="align-right"' : "";
      l += `<td${v}>${H(h.key, p[h.key], p)}</td>`;
    }), l += "</tr>";
  });
  const d = {}, u = {};
  t.forEach((p) => {
    if (n.includes(p.key)) {
      const h = e.reduce(
        (v, y) => {
          let S = y[p.key];
          if ((p.key === "gain_abs" || p.key === "gain_pct") && (typeof S != "number" || !Number.isFinite(S))) {
            const A = y.performance;
            if (typeof A == "object" && A !== null) {
              const N = A[p.key];
              typeof N == "number" && (S = N);
            }
          }
          if (typeof S == "number" && Number.isFinite(S)) {
            const A = S;
            v.total += A, v.hasValue = !0;
          }
          return v;
        },
        { total: 0, hasValue: !1 }
      );
      h.hasValue ? (d[p.key] = h.total, u[p.key] = { hasValue: !0 }) : (d[p.key] = null, u[p.key] = { hasValue: !1 });
    }
  });
  const f = d.gain_abs ?? null;
  if (f != null) {
    const p = d.purchase_value ?? null;
    if (p != null && p > 0)
      d.gain_pct = f / p * 100;
    else {
      const h = d.current_value ?? null;
      h != null && h !== 0 && (d.gain_pct = f / (h - f) * 100);
    }
  }
  const g = Number.isFinite(d.gain_pct ?? NaN) ? d.gain_pct : null;
  let m = "", _ = "neutral";
  if (g != null && (m = `${Q(g)} %`, g > 0 ? _ = "positive" : g < 0 && (_ = "negative")), l += '<tr class="footer-row">', t.forEach((p, h) => {
    const v = p.align === "right" ? ' class="align-right"' : "";
    if (h === 0) {
      l += `<td${v}>Summe</td>`;
      return;
    }
    if (d[p.key] != null) {
      let S = "";
      p.key === "gain_abs" && m && (S = ` data-gain-pct="${c(m)}" data-gain-sign="${c(_)}"`), l += `<td${v}${S}>${H(p.key, d[p.key], void 0, u[p.key])}</td>`;
      return;
    }
    if (p.key === "gain_pct" && d.gain_pct != null) {
      l += `<td${v}>${H("gain_pct", d.gain_pct, void 0, u[p.key])}</td>`;
      return;
    }
    const y = u[p.key] ?? { hasValue: !1 };
    l += `<td${v}>${H(p.key, null, void 0, y)}</td>`;
  }), l += "</tr>", l += "</tbody></table>", i)
    try {
      const p = document.createElement("template");
      p.innerHTML = l.trim();
      const h = p.content.querySelector("table");
      if (h)
        return h.classList.add("sortable-table"), a && (h.dataset.defaultSort = a, h.dataset.defaultDir = s), h.outerHTML;
    } catch (p) {
      console.warn("makeTable(sortable): Injection fehlgeschlagen:", p);
    }
  return l;
}
function pt(e, t) {
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
function Q(e, t = 2, n = 2) {
  return (Number.isNaN(e) ? 0 : e).toLocaleString("de-DE", {
    minimumFractionDigits: t,
    maximumFractionDigits: n
  });
}
function Kr(e) {
  const t = Number.isNaN(e) ? 0 : e;
  return `<span class="${Et(t, 2)}">${Q(t)}&nbsp;€</span>`;
}
function Gr(e) {
  const t = Number.isNaN(e) ? 0 : e;
  return `<span class="${Et(t, 2)}">${Q(t)}&nbsp;%</span>`;
}
function Pn(e, t, n = "asc", r = !1) {
  if (!e)
    return [];
  const i = e.querySelector("tbody");
  if (!i)
    return [];
  const o = i.querySelector("tr.footer-row"), a = Array.from(i.querySelectorAll("tr")).filter((d) => d !== o);
  let s = -1;
  if (r) {
    const u = {
      name: 0,
      current_holdings: 1,
      purchase_value: 2,
      current_value: 3,
      gain_abs: 4,
      gain_pct: 5
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
    return a;
  const c = (d) => {
    const u = d.replace(/\u00A0/g, " ").replace(/[%€]/g, "").replace(/\./g, "").replace(/,/g, ".").replace(/[^\d.-]/g, "").trim();
    if (!u) return NaN;
    const f = parseFloat(u);
    return Number.isFinite(f) ? f : NaN;
  };
  a.sort((d, u) => {
    const f = d.cells.item(s), g = u.cells.item(s), m = ((f == null ? void 0 : f.textContent) ?? "").trim(), _ = ((g == null ? void 0 : g.textContent) ?? "").trim(), p = c(m), h = c(_);
    let v;
    const y = /[0-9]/.test(m) || /[0-9]/.test(_);
    return !Number.isNaN(p) && !Number.isNaN(h) && y ? v = p - h : v = m.localeCompare(_, "de", { sensitivity: "base" }), n === "asc" ? v : -v;
  }), a.forEach((d) => i.appendChild(d)), o && i.appendChild(o), e.querySelectorAll("thead th.sort-active").forEach((d) => {
    d.classList.remove("sort-active", "dir-asc", "dir-desc");
  });
  const l = e.querySelector(`thead th[data-sort-key="${t}"]`);
  return l && l.classList.add("sort-active", n === "asc" ? "dir-asc" : "dir-desc"), a;
}
function ee(e) {
  return typeof e == "object" && e !== null;
}
function V(e) {
  return typeof e == "string" ? e : null;
}
function Ce(e) {
  return e === null ? null : V(e);
}
function k(e) {
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
function jt(e) {
  const t = k(e);
  if (t == null)
    return null;
  const n = Math.trunc(t);
  return Number.isFinite(n) ? n : null;
}
function ke(e) {
  return ee(e) ? { ...e } : null;
}
function An(e) {
  return ee(e) ? { ...e } : null;
}
function Nn(e) {
  return typeof e == "boolean" ? e : void 0;
}
function Yr(e) {
  if (!ee(e))
    return null;
  const t = V(e.name), n = V(e.currency_code), r = k(e.orig_balance);
  if (!t || !n || r == null)
    return null;
  const i = e.balance === null ? null : k(e.balance), o = {
    uuid: V(e.uuid) ?? void 0,
    name: t,
    currency_code: n,
    orig_balance: r,
    balance: i ?? null
  }, a = k(e.fx_rate);
  a != null && (o.fx_rate = a);
  const s = V(e.fx_rate_source);
  s && (o.fx_rate_source = s);
  const c = V(e.fx_rate_timestamp);
  c && (o.fx_rate_timestamp = c);
  const l = k(e.coverage_ratio);
  l != null && (o.coverage_ratio = l);
  const d = V(e.provenance);
  d && (o.provenance = d);
  const u = Ce(e.metric_run_uuid);
  u !== null && (o.metric_run_uuid = u);
  const f = Nn(e.fx_unavailable);
  return typeof f == "boolean" && (o.fx_unavailable = f), o;
}
function wn(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = Yr(n);
    r && t.push(r);
  }
  return t;
}
function Xr(e) {
  if (!ee(e))
    return null;
  const t = e.aggregation, n = V(e.security_uuid), r = V(e.name), i = k(e.current_holdings), o = k(e.purchase_value_eur) ?? (ee(t) ? k(t.purchase_value_eur) ?? k(t.purchase_total_account) ?? k(t.account_currency_total) : null) ?? k(e.purchase_value), a = k(e.current_value);
  if (!n || !r || i == null || o == null || a == null)
    return null;
  const s = {
    portfolio_uuid: V(e.portfolio_uuid) ?? void 0,
    security_uuid: n,
    name: r,
    currency_code: V(e.currency_code),
    current_holdings: i,
    purchase_value: o,
    current_value: a,
    average_cost: ke(e.average_cost),
    performance: ke(e.performance),
    aggregation: ke(e.aggregation),
    data_state: An(e.data_state)
  }, c = k(e.coverage_ratio);
  c != null && (s.coverage_ratio = c);
  const l = V(e.provenance);
  l && (s.provenance = l);
  const d = Ce(e.metric_run_uuid);
  d !== null && (s.metric_run_uuid = d);
  const u = k(e.last_price_native);
  u != null && (s.last_price_native = u);
  const f = k(e.last_price_eur);
  f != null && (s.last_price_eur = f);
  const g = k(e.last_close_native);
  g != null && (s.last_close_native = g);
  const m = k(e.last_close_eur);
  return m != null && (s.last_close_eur = m), s;
}
function Fn(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = Xr(n);
    r && t.push(r);
  }
  return t;
}
function xn(e) {
  if (!ee(e))
    return null;
  const t = V(e.name), n = k(e.current_value ?? e.value);
  if (!t || n == null)
    return null;
  const i = k(
    e.purchase_sum ?? e.purchase_value_eur ?? e.purchase_value ?? e.purchaseSum
  ) ?? 0, o = {
    uuid: V(e.uuid) ?? void 0,
    name: t,
    current_value: n,
    purchase_value: i,
    purchase_sum: i,
    position_count: jt(e.position_count ?? e.count) ?? void 0,
    missing_value_positions: jt(e.missing_value_positions) ?? void 0,
    has_current_value: Nn(e.has_current_value),
    performance: ke(e.performance),
    coverage_ratio: k(e.coverage_ratio) ?? void 0,
    provenance: V(e.provenance) ?? void 0,
    metric_run_uuid: Ce(e.metric_run_uuid) ?? void 0,
    data_state: An(e.data_state)
  };
  return Array.isArray(e.positions) && (o.positions = Fn(e.positions)), o;
}
function En(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = xn(n);
    r && t.push(r);
  }
  return t;
}
function Dn(e) {
  if (!ee(e))
    return null;
  const t = { ...e }, n = Ce(e.metric_run_uuid);
  n !== null ? t.metric_run_uuid = n : delete t.metric_run_uuid;
  const r = k(e.coverage_ratio);
  r != null ? t.coverage_ratio = r : delete t.coverage_ratio;
  const i = V(e.provenance);
  i ? t.provenance = i : delete t.provenance;
  const o = V(e.generated_at ?? e.snapshot_generated_at);
  return o ? t.generated_at = o : delete t.generated_at, t;
}
function Zr(e) {
  if (!ee(e))
    return null;
  const t = { ...e }, n = Dn(e.normalized_payload);
  return n ? t.normalized_payload = n : "normalized_payload" in t && delete t.normalized_payload, t;
}
function Rn(e) {
  if (!ee(e))
    return null;
  const t = V(e.generated_at);
  if (!t)
    return null;
  const n = Ce(e.metric_run_uuid), r = wn(e.accounts), i = En(e.portfolios), o = Zr(e.diagnostics), a = {
    generated_at: t,
    metric_run_uuid: n,
    accounts: r,
    portfolios: i
  };
  return o && (a.diagnostics = o), a;
}
function Kt(e) {
  return typeof e == "string" ? e : null;
}
function Jr(e) {
  if (typeof e == "string")
    return e;
  if (e === null)
    return null;
}
function Qr(e) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
}
function Gt(e, t) {
  if (typeof e == "string")
    return e;
  throw new Error(`mapPositionSnapshotToRecord: fehlendes ${t}`);
}
function rt(e, t) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  throw new Error(`mapPositionSnapshotToRecord: fehlendes ${t}`);
}
function ei(e) {
  const t = Gt(e.security_uuid, "security_uuid"), n = Gt(e.name, "name"), r = rt(e.current_holdings, "current_holdings"), i = rt(e.purchase_value, "purchase_value"), o = rt(e.current_value, "current_value"), a = {
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
    const u = e.panels, f = u.ppreader ?? u.pp_reader ?? Object.values(u).find(
      (g) => (g == null ? void 0 : g.webcomponent_name) === "pp-reader-panel"
    );
    n = ((s = f == null ? void 0 : f.config) == null ? void 0 : s.entry_id) ?? (f == null ? void 0 : f.entry_id) ?? ((d = (l = (c = f == null ? void 0 : f.config) == null ? void 0 : c._panel_custom) == null ? void 0 : l.config) == null ? void 0 : d.entry_id) ?? void 0;
  }
  return n ?? void 0;
}
function Yt(e, t) {
  return se(e, t);
}
async function ti(e, t) {
  if (!e)
    throw new Error("fetchAccountsWS: fehlendes hass");
  const n = se(e, t);
  if (!n)
    throw new Error("fetchAccountsWS: fehlendes entry_id");
  const r = await e.connection.sendMessagePromise({
    type: "pp_reader/get_accounts",
    entry_id: n
  }), i = wn(r.accounts), o = Rn(r.normalized_payload);
  return {
    accounts: i,
    normalized_payload: o
  };
}
async function ni(e, t) {
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
async function ri(e, t) {
  if (!e)
    throw new Error("fetchPortfoliosWS: fehlendes hass");
  const n = se(e, t);
  if (!n)
    throw new Error("fetchPortfoliosWS: fehlendes entry_id");
  const r = await e.connection.sendMessagePromise({
    type: "pp_reader/get_portfolio_data",
    entry_id: n
  }), i = En(r.portfolios), o = Rn(r.normalized_payload);
  return {
    portfolios: i,
    normalized_payload: o
  };
}
async function Cn(e, t, n) {
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
  }), a = Fn(i.positions).map(ei), s = Dn(i.normalized_payload), c = {
    portfolio_uuid: Kt(i.portfolio_uuid) ?? n,
    positions: a
  };
  typeof i.error == "string" && (c.error = i.error);
  const l = Qr(i.coverage_ratio);
  l !== void 0 && (c.coverage_ratio = l);
  const d = Kt(i.provenance);
  d && (c.provenance = d);
  const u = Jr(i.metric_run_uuid);
  return u !== void 0 && (c.metric_run_uuid = u), s && (c.normalized_payload = s), c;
}
async function ii(e, t, n) {
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
async function $n(e, t, n, r = {}) {
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
  const u = s ?? l;
  return u != null && (o.end_date = u), e.connection.sendMessagePromise(o);
}
const Dt = /* @__PURE__ */ new Set(), Rt = /* @__PURE__ */ new Set(), Ln = {}, oi = [
  "renderPositionsTable",
  "applyGainPctMetadata",
  "attachSecurityDetailListener",
  "attachPortfolioPositionsSorting",
  "updatePortfolioFooter"
];
function ai(e, t) {
  typeof t == "function" && (Ln[e] = t);
}
function Ta(e) {
  e && Dt.add(e);
}
function Ma(e) {
  e && Dt.delete(e);
}
function si() {
  return Dt;
}
function ka(e) {
  e && Rt.add(e);
}
function Ia(e) {
  e && Rt.delete(e);
}
function ci() {
  return Rt;
}
function li(e) {
  for (const t of oi)
    ai(t, e[t]);
}
function Ct() {
  return Ln;
}
const ui = 2;
function $e(e) {
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
        const f = s.split(","), g = ((t = f[f.length - 1]) == null ? void 0 : t.length) ?? 0, m = f.slice(0, -1).join(""), _ = m.replace(/[+-]/g, "").length, p = f.length > 2, h = /^[-+]?0$/.test(m);
        s = p || g === 0 || g === 3 && _ > 0 && _ <= 3 && !h ? s.replace(/,/g, "") : s.replace(",", ".");
      }
    else l && c && a > o ? s = s.replace(/,/g, "") : l && s.length - a - 1 === 3 && /\d{4,}/.test(s.replace(/\./g, "")) && (s = s.replace(/\./g, ""));
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
function Je(e, { decimals: t = ui, fallback: n = null } = {}) {
  const r = $e(e);
  if (r == null)
    return n ?? null;
  const i = 10 ** t, o = Math.round(r * i) / i;
  return Object.is(o, -0) ? 0 : o;
}
function Xt(e, t = {}) {
  return Je(e, t);
}
function fi(e, t = {}) {
  return Je(e, t);
}
const di = /^[+-]?(?:\d+\.?\d*|\d*\.?\d+)(?:[eE][+-]?\d+)?$/, Z = (e) => {
  if (typeof e == "number")
    return Number.isFinite(e) ? e : null;
  if (typeof e == "string") {
    const t = e.trim();
    if (!t || !di.test(t))
      return null;
    const n = Number(t);
    if (Number.isFinite(n))
      return n;
  }
  return null;
}, Tn = (e) => {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t || null;
};
function gi(e) {
  const t = e && typeof e == "object" ? e : null;
  if (!t)
    return null;
  const n = Z(t.price_change_native), r = Z(t.price_change_eur), i = Z(t.change_pct);
  if (n == null && r == null && i == null)
    return null;
  const o = Tn(t.source) ?? "derived", a = Z(t.coverage_ratio) ?? null;
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
  const a = Tn(t.source) ?? "derived", s = Z(t.coverage_ratio) ?? null, c = gi(t.day_change);
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
const ne = /* @__PURE__ */ new Map();
function te(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t.length > 0 ? t : null;
}
function T(e) {
  if (e === null)
    return null;
  const t = $e(e);
  return Number.isFinite(t ?? NaN) ? t : null;
}
function pi(e) {
  if (!e || typeof e != "object")
    return !1;
  const t = e;
  return typeof t.security_uuid == "string" && typeof t.name == "string" && typeof t.current_holdings == "number" && typeof t.purchase_value == "number" && typeof t.current_value == "number";
}
function Le(e) {
  const t = { ...e };
  return e.average_cost && typeof e.average_cost == "object" && (t.average_cost = { ...e.average_cost }), e.performance && typeof e.performance == "object" && (t.performance = { ...e.performance }), e.aggregation && typeof e.aggregation == "object" && (t.aggregation = { ...e.aggregation }), e.data_state && typeof e.data_state == "object" && (t.data_state = { ...e.data_state }), t;
}
function mi(e, t) {
  const n = e ? Le(e) : {};
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
  ].forEach((o) => {
    t[o] !== void 0 && (n[o] = t[o]);
  });
  const i = (o) => {
    const a = t[o];
    if (a && typeof a == "object") {
      const s = e && e[o] && typeof e[o] == "object" ? e[o] : {};
      n[o] = { ...s, ...a };
    } else a !== void 0 && (n[o] = a);
  };
  return i("performance"), i("aggregation"), i("average_cost"), i("data_state"), n;
}
function $t(e, t) {
  if (!e)
    return;
  if (!Array.isArray(t)) {
    ne.delete(e);
    return;
  }
  if (t.length === 0) {
    ne.set(e, []);
    return;
  }
  const n = ne.get(e) ?? [], r = new Map(
    n.filter((o) => o.security_uuid).map((o) => [o.security_uuid, o])
  ), i = t.filter((o) => !!o).map((o) => {
    const a = o.security_uuid ?? "", s = a ? r.get(a) : void 0;
    return mi(s, o);
  }).map(Le);
  ne.set(e, i);
}
function Lt(e) {
  return e ? ne.has(e) : !1;
}
function Mn(e) {
  if (!e)
    return [];
  const t = ne.get(e);
  return t ? t.map(Le) : [];
}
function hi() {
  ne.clear();
}
function bi() {
  return new Map(
    Array.from(ne.entries(), ([e, t]) => [
      e,
      t.map(Le)
    ])
  );
}
function Te(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e, n = T(t.native), r = T(t.security), i = T(t.account), o = T(t.eur), a = T(t.coverage_ratio);
  if (n == null && r == null && i == null && o == null && a == null)
    return null;
  const s = te(t.source);
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
  const t = e, n = T(t.total_holdings), r = T(t.positive_holdings), i = T(t.purchase_value_eur), o = T(t.purchase_total_security) ?? T(t.security_currency_total), a = T(t.purchase_total_account) ?? T(t.account_currency_total);
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
function _i(e) {
  if (!e || typeof e != "object")
    return null;
  const t = pi(e) ? Le(e) : e, n = te(t.security_uuid), r = te(t.name), i = $e(t.current_holdings), o = Xt(t.current_value), a = kn(t.aggregation), s = t.aggregation && typeof t.aggregation == "object" ? t.aggregation : null, c = T(t.purchase_value_eur) ?? T(s == null ? void 0 : s.purchase_value_eur) ?? T(s == null ? void 0 : s.purchase_total_account) ?? T(s == null ? void 0 : s.account_currency_total) ?? Xt(t.purchase_value);
  if (!n || !r || i == null || c == null || o == null)
    return null;
  const l = {
    security_uuid: n,
    name: r,
    portfolio_uuid: te(t.portfolio_uuid) ?? te(t.portfolioUuid) ?? void 0,
    currency_code: te(t.currency_code),
    current_holdings: i,
    purchase_value: c,
    current_value: o
  }, d = Te(t.average_cost);
  d && (l.average_cost = d), a && (l.aggregation = a);
  const u = ae(t.performance);
  if (u)
    l.performance = u, l.gain_abs = typeof u.gain_abs == "number" ? u.gain_abs : null, l.gain_pct = typeof u.gain_pct == "number" ? u.gain_pct : null;
  else {
    const y = T(t.gain_abs), S = T(t.gain_pct);
    y !== null && (l.gain_abs = y), S !== null && (l.gain_pct = S);
  }
  "coverage_ratio" in t && (l.coverage_ratio = T(t.coverage_ratio));
  const f = te(t.provenance);
  f && (l.provenance = f);
  const g = te(t.metric_run_uuid);
  (g || t.metric_run_uuid === null) && (l.metric_run_uuid = g ?? null);
  const m = T(t.last_price_native);
  m !== null && (l.last_price_native = m);
  const _ = T(t.last_price_eur);
  _ !== null && (l.last_price_eur = _);
  const p = T(t.last_close_native);
  p !== null && (l.last_close_native = p);
  const h = T(t.last_close_eur);
  h !== null && (l.last_close_eur = h);
  const v = t.data_state && typeof t.data_state == "object" ? { ...t.data_state } : void 0;
  return v && (l.data_state = v), l;
}
function Qe(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = _i(n);
    r && t.push(r);
  }
  return t;
}
let In = [];
const re = /* @__PURE__ */ new Map();
function Ie(e) {
  return typeof e == "string" && e.length > 0 ? e : void 0;
}
function yi(e) {
  return e === null ? null : Ie(e);
}
function vi(e) {
  return typeof e == "number" && Number.isFinite(e) ? e : void 0;
}
function he(e) {
  return e === null ? null : vi(e);
}
function Zt(e) {
  if (!(typeof e != "number" || !Number.isFinite(e)))
    return Math.trunc(e);
}
function Y(e) {
  if (!(!e || typeof e != "object"))
    return { ...e };
}
function Ne(e) {
  const t = { ...e };
  return t.average_cost = Y(e.average_cost), t.performance = Y(e.performance), t.aggregation = Y(e.aggregation), t.data_state = Y(e.data_state), t;
}
function Tt(e) {
  const t = { ...e };
  return t.performance = Y(e.performance), t.data_state = Y(e.data_state), Array.isArray(e.positions) && (t.positions = e.positions.map(Ne)), t;
}
function Hn(e) {
  if (!e || typeof e != "object")
    return null;
  const t = Ie(e.uuid);
  if (!t)
    return null;
  const n = { uuid: t }, r = Ie(e.name);
  r && (n.name = r);
  const i = he(e.current_value);
  i !== void 0 && (n.current_value = i);
  const o = he(e.purchase_sum) ?? he(e.purchase_value_eur) ?? he(e.purchase_value);
  o !== void 0 && (n.purchase_value = o, n.purchase_sum = o);
  const a = Zt(e.position_count);
  a !== void 0 && (n.position_count = a);
  const s = Zt(e.missing_value_positions);
  s !== void 0 && (n.missing_value_positions = s), typeof e.has_current_value == "boolean" && (n.has_current_value = e.has_current_value);
  const c = he(e.coverage_ratio);
  c !== void 0 && (n.coverage_ratio = c);
  const l = Ie(e.provenance);
  l && (n.provenance = l), "metric_run_uuid" in e && (n.metric_run_uuid = yi(e.metric_run_uuid));
  const d = Y(e.performance);
  d && (n.performance = d);
  const u = Y(e.data_state);
  if (u && (n.data_state = u), Array.isArray(e.positions)) {
    const f = e.positions.filter(
      (g) => !!g
    );
    f.length && (n.positions = f.map(Ne));
  }
  return n;
}
function Si(e, t) {
  const n = {
    ...e,
    ...t
  };
  return !t.performance && e.performance && (n.performance = Y(e.performance)), !t.data_state && e.data_state && (n.data_state = Y(e.data_state)), !t.positions && e.positions && (n.positions = e.positions.map(Ne)), n;
}
function Un(e) {
  In = (e ?? []).map((n) => ({ ...n }));
}
function Pi() {
  return In.map((e) => ({ ...e }));
}
function Ai(e) {
  re.clear();
  const t = e ?? [];
  for (const n of t) {
    const r = Hn(n);
    r && re.set(r.uuid, Tt(r));
  }
}
function Ni(e) {
  const t = e ?? [];
  for (const n of t) {
    const r = Hn(n);
    if (!r)
      continue;
    const i = re.get(r.uuid), o = i ? Si(i, r) : Tt(r);
    re.set(o.uuid, o);
  }
}
function Mt(e, t) {
  if (!e)
    return;
  const n = re.get(e);
  if (!n)
    return;
  if (!Array.isArray(t) || t.length === 0) {
    const c = { ...n };
    delete c.positions, re.set(e, c);
    return;
  }
  const r = (c, l) => {
    const d = c ? Ne(c) : {};
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
      const m = l[g];
      if (m && typeof m == "object") {
        const _ = c && c[g] && typeof c[g] == "object" ? c[g] : {};
        d[g] = { ..._, ...m };
      } else m !== void 0 && (d[g] = m);
    };
    return f("performance"), f("aggregation"), f("average_cost"), f("data_state"), d;
  }, i = Array.isArray(n.positions) ? n.positions : [], o = new Map(
    i.filter((c) => c.security_uuid).map((c) => [c.security_uuid, c])
  ), a = t.filter((c) => !!c).map((c) => {
    const l = c.security_uuid ? o.get(c.security_uuid) : void 0;
    return r(l, c);
  }).map(Ne), s = {
    ...n,
    positions: a
  };
  re.set(e, s);
}
function wi() {
  return Array.from(re.values(), (e) => Tt(e));
}
function Vn() {
  return {
    accounts: Pi(),
    portfolios: wi()
  };
}
const Fi = "unknown-account";
function G(e) {
  return typeof e != "number" || !Number.isFinite(e) ? null : e;
}
function Jt(e) {
  const t = G(e);
  return t == null ? 0 : Math.trunc(t);
}
function j(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t.length > 0 ? t : null;
}
function zn(e, t) {
  return j(e) ?? t;
}
function kt(e) {
  return e == null || !Number.isFinite(e) ? null : e < 0 ? 0 : e > 1 ? 1 : e;
}
function xi(e) {
  const t = Math.abs(e % 1) > 0.01;
  return e.toLocaleString("de-DE", {
    minimumFractionDigits: t ? 1 : 0,
    maximumFractionDigits: 1
  });
}
function qn(e, t) {
  const n = kt(e);
  if (n == null)
    return null;
  const r = Math.round(n * 1e3) / 10;
  let i = "info";
  n < 0.5 ? i = "danger" : n < 0.9 && (i = "warning");
  const o = t === "account" ? "FX-Abdeckung" : "Abdeckung", a = t === "account" ? "Anteil der verfügbaren FX-Daten für diese Kontoumrechnung." : "Anteil der verfügbaren Kennzahlen für dieses Depot.";
  return {
    key: `${t}-coverage`,
    label: `${o} ${xi(r)}%`,
    tone: i,
    description: a
  };
}
function On(e) {
  return e.split(/[\s_-]+/).filter(Boolean).map(
    (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
  ).join(" ");
}
function Bn(e) {
  const t = Ei(e);
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
function Ei(e) {
  const t = j(e);
  if (!t)
    return null;
  const n = Di(t);
  return n || On(t);
}
function Di(e) {
  const t = e.trim();
  if (!t.startsWith("{") && !t.startsWith("["))
    return null;
  try {
    const n = JSON.parse(t), r = Ri(n), i = n && typeof n == "object" ? j(
      n.provider ?? n.source
    ) : null;
    if (r.length && i)
      return `${On(i)} (${r.join(", ")})`;
    if (r.length)
      return `FX (${r.join(", ")})`;
  } catch {
    return null;
  }
  return null;
}
function Ri(e) {
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
function Ci(e) {
  if (!e)
    return null;
  const t = j(e.uuid) ?? `${Fi}-${e.name ?? "0"}`, n = zn(e.name, "Unbenanntes Konto"), r = j(e.currency_code), i = G(e.balance), o = G(e.orig_balance), a = "coverage_ratio" in e ? kt(G(e.coverage_ratio)) : null, s = j(e.provenance), c = j(e.metric_run_uuid), l = e.fx_unavailable === !0, d = G(e.fx_rate), u = j(e.fx_rate_source), f = j(e.fx_rate_timestamp), g = [], m = qn(a, "account");
  m && g.push(m);
  const _ = Bn(s);
  _ && g.push(_);
  const p = {
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
    fx_rate_source: u,
    fx_rate_timestamp: f,
    badges: g
  }, h = typeof c == "string" ? c : null;
  return p.metric_run_uuid = h, p;
}
function $i(e) {
  if (!e)
    return null;
  const t = j(e.uuid);
  if (!t)
    return null;
  const n = zn(e.name, "Unbenanntes Depot"), r = Jt(e.position_count), i = Jt(e.missing_value_positions), o = G(e.current_value), a = G(e.purchase_sum) ?? G(e == null ? void 0 : e.purchase_value_eur) ?? G(e.purchase_value) ?? 0, s = ae(e.performance), c = (s == null ? void 0 : s.gain_abs) ?? null, l = (s == null ? void 0 : s.gain_pct) ?? null, d = o != null, u = e.has_current_value === !1 || !d, f = "coverage_ratio" in e ? kt(G(e.coverage_ratio)) : null, g = j(e.provenance), m = j(e.metric_run_uuid), _ = [], p = qn(f, "portfolio");
  p && _.push(p);
  const h = Bn(g);
  h && _.push(h);
  const v = {
    uuid: t,
    name: n,
    position_count: r,
    current_value: o,
    purchase_sum: a,
    gain_abs: c,
    gain_pct: l,
    hasValue: d,
    fx_unavailable: u || i > 0,
    missing_value_positions: i,
    performance: s,
    coverage_ratio: f,
    provenance: g,
    metric_run_uuid: null,
    badges: _
  }, y = typeof m == "string" ? m : null;
  return v.metric_run_uuid = y, v;
}
function Wn() {
  const { accounts: e } = Vn();
  return e.map(Ci).filter((t) => !!t);
}
function Li() {
  const { portfolios: e } = Vn();
  return e.map($i).filter((t) => !!t);
}
function we(e) {
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
function jn(e, t = {}) {
  if (!e || e.length === 0)
    return "";
  const n = ["meta-badges", t.containerClass].filter(Boolean).join(" "), r = e.map((i) => {
    const o = `meta-badge--${i.tone}`, a = i.description ? ` title="${we(i.description)}"` : "";
    return `<span class="meta-badge ${o}"${a}>${we(
      i.label
    )}</span>`;
  }).join("");
  return `<span class="${n}">${r}</span>`;
}
function ze(e, t, n = {}) {
  const r = jn(t, n);
  if (!r)
    return we(e);
  const i = n.labelClass ?? "name-with-badges__label";
  return `<span class="${["name-with-badges", n.containerClass].filter(Boolean).join(" ")}"><span class="${i}">${we(
    e
  )}</span>${r}</span>`;
}
function Kn(e, t, n, r) {
  e[t] = {
    previous: n,
    current: r
  };
}
const J = /* @__PURE__ */ new Map(), He = /* @__PURE__ */ new Map();
function Ti(e) {
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
function me(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t.length > 0 ? t : null;
}
function Mi(e) {
  return typeof e == "number" && Number.isFinite(e) ? e : void 0;
}
function ki(e) {
  return e === null ? null : Mi(e);
}
function Ii(e) {
  return e === null ? null : me(e);
}
function Qt(e) {
  return ae(e.performance);
}
const Hi = 500, Ui = 10, Vi = "pp-reader:portfolio-positions-updated", zi = "pp-reader:diagnostics", it = /* @__PURE__ */ new Map(), Gn = [
  "coverage_ratio",
  "provenance",
  "metric_run_uuid",
  "generated_at"
], mt = /* @__PURE__ */ new Map();
function qi(e, t) {
  return `${e}:${t}`;
}
function Oi(e) {
  if (e === void 0)
    return;
  if (e === null)
    return null;
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  const t = ki(e);
  if (t === null)
    return null;
  if (typeof t == "number" && Number.isFinite(t))
    return t;
}
function ot(e) {
  if (e !== void 0)
    return Ii(e);
}
function It(e, t, n, r) {
  const i = {}, o = Oi(e);
  o !== void 0 && (i.coverage_ratio = o);
  const a = ot(t);
  a !== void 0 && (i.provenance = a);
  const s = ot(n);
  s !== void 0 && (i.metric_run_uuid = s);
  const c = ot(r);
  return c !== void 0 && (i.generated_at = c), Object.keys(i).length > 0 ? i : null;
}
function Bi(e, t) {
  const n = {};
  let r = !1;
  for (const i of Gn) {
    const o = e == null ? void 0 : e[i], a = t[i];
    o !== a && (Kn(n, i, o, a), r = !0);
  }
  return r ? n : null;
}
function Wi(e) {
  const t = {};
  let n = !1;
  for (const r of Gn) {
    const i = e[r];
    i !== void 0 && (Kn(t, r, i, void 0), n = !0);
  }
  return n ? t : null;
}
function en(e) {
  if (Object.keys(e.changed).length) {
    try {
      console.debug("pp-reader:diagnostics", e);
    } catch {
    }
    if (!(typeof window > "u" || typeof window.dispatchEvent != "function"))
      try {
        window.dispatchEvent(new CustomEvent(zi, { detail: e }));
      } catch (t) {
        console.warn("updateConfigsWS: Diagnostics-Event konnte nicht gesendet werden", t);
      }
  }
}
function Ht(e, t, n, r) {
  const i = qi(e, n), o = it.get(i);
  if (!r) {
    if (!o)
      return;
    it.delete(i);
    const s = Wi(o);
    if (!s)
      return;
    en({
      kind: e,
      uuid: n,
      source: t,
      changed: s,
      snapshot: {},
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    return;
  }
  const a = Bi(o, r);
  a && (it.set(i, { ...r }), en({
    kind: e,
    uuid: n,
    source: t,
    changed: a,
    snapshot: { ...r },
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  }));
}
function ji(e) {
  if (!(!e || e.length === 0))
    for (const t of e) {
      const n = me(t.uuid);
      if (!n)
        continue;
      const r = It(
        t.coverage_ratio,
        t.provenance,
        t.metric_run_uuid,
        void 0
      );
      Ht("account", "accounts", n, r);
    }
}
function Ki(e) {
  if (!(!e || e.length === 0))
    for (const t of e) {
      const n = me(t.uuid);
      if (!n)
        continue;
      const r = It(
        t.coverage_ratio,
        t.provenance,
        t.metric_run_uuid,
        void 0
      );
      Ht("portfolio", "portfolio_values", n, r);
    }
}
function Gi(e, t) {
  var r, i, o, a;
  if (!t)
    return;
  const n = It(
    t.coverage_ratio ?? ((r = t.normalized_payload) == null ? void 0 : r.coverage_ratio),
    t.provenance ?? ((i = t.normalized_payload) == null ? void 0 : i.provenance),
    t.metric_run_uuid ?? ((o = t.normalized_payload) == null ? void 0 : o.metric_run_uuid),
    (a = t.normalized_payload) == null ? void 0 : a.generated_at
  );
  Ht("portfolio_positions", "portfolio_positions", e, n);
}
function Yi(e, t) {
  return `<div class="error">${Ti(e)} <button class="retry-pos" data-portfolio="${t}">Erneut laden</button></div>`;
}
function Xi(e, t, n) {
  const r = e.querySelector("table.sortable-positions");
  if (!r) return;
  const i = e.dataset.sortKey || r.dataset.defaultSort || "name", a = (e.dataset.sortDir || r.dataset.defaultDir || "asc") === "desc" ? "desc" : "asc";
  e.dataset.sortKey = i, e.dataset.sortDir = a;
  try {
    Pn(r, i, a, !0);
  } catch (l) {
    console.warn("restoreSortAndInit: sortTableRows Fehler:", l);
  }
  const { attachPortfolioPositionsSorting: s, attachSecurityDetailListener: c } = Ct();
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
function Yn(e, t, n, r) {
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
    return o.innerHTML = Yi(r, t), { applied: !0 };
  const a = o.dataset.sortKey, s = o.dataset.sortDir;
  return o.innerHTML = oo(n), a && (o.dataset.sortKey = a), s && (o.dataset.sortDir = s), Xi(o, e, t), { applied: !0 };
}
function Ut(e, t) {
  const n = J.get(t);
  if (!n) return !1;
  const r = Yn(
    e,
    t,
    n.positions,
    n.error
  );
  return r.applied && J.delete(t), r.applied;
}
function Zi(e) {
  let t = !1;
  for (const [n] of J)
    Ut(e, n) && (t = !0);
  return t;
}
function Xn(e, t) {
  const n = He.get(t) ?? {
    attempts: 0,
    timer: null
  };
  n.timer || (n.timer = setTimeout(() => {
    n.timer = null, n.attempts += 1;
    const r = Ut(e, t);
    r || n.attempts >= Ui ? (He.delete(t), r || J.delete(t)) : Xn(e, t);
  }, Hi), He.set(t, n));
}
function Ji(e, t) {
  console.log("updateConfigsWS: Kontodaten-Update erhalten:", e);
  const n = Array.isArray(e) ? e : [];
  if (Un(n), ji(n), !t)
    return;
  const r = Wn();
  Qi(r, t);
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
  Zn(r, o, t);
}
function Qi(e, t) {
  const n = t.querySelector(".account-table"), r = t.querySelector(".fx-account-table"), i = e.filter((a) => (a.currency_code || "EUR") === "EUR"), o = e.filter((a) => (a.currency_code || "EUR") !== "EUR");
  if (n) {
    const a = i.map((s) => ({
      name: ze(s.name, s.badges, {
        containerClass: "account-name",
        labelClass: "account-name__label"
      }),
      balance: s.balance ?? null
    }));
    n.innerHTML = de(
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
      const c = s.orig_balance, l = typeof c == "number" && Number.isFinite(c), d = me(s.currency_code), u = l ? c.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) : null, f = u ? d ? `${u} ${d}` : u : "";
      return {
        name: ze(s.name, s.badges, {
          containerClass: "account-name",
          labelClass: "account-name__label"
        }),
        fx_display: f,
        balance: s.balance ?? null
      };
    });
    r.innerHTML = de(
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
function eo(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = xn(n);
    r && t.push(r);
  }
  return t;
}
function to(e, t) {
  if (!Array.isArray(e)) {
    console.warn("handlePortfolioUpdate: Update ist kein Array:", e);
    return;
  }
  try {
    console.debug("handlePortfolioUpdate: payload=", e);
  } catch {
  }
  const n = eo(e);
  if (n.length && Ni(n), Ki(n), !t)
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
  const o = (u) => {
    if (typeof Intl < "u")
      try {
        const g = typeof navigator < "u" && navigator.language ? navigator.language : "de-DE";
        return new Intl.NumberFormat(g, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(u);
      } catch {
      }
    return (Je(u, { fallback: 0 }) ?? 0).toFixed(2).replace(".", ",");
  }, a = /* @__PURE__ */ new Map();
  i.querySelectorAll("tr.portfolio-row").forEach((u) => {
    const f = u.dataset.portfolio;
    f && a.set(f, u);
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
    const f = me(u.uuid);
    f && d.set(f, u);
  }
  for (const [u, f] of d.entries()) {
    const g = a.get(u);
    if (!g || g.cells.length < 3)
      continue;
    const m = g.cells.item(1), _ = g.cells.item(2), p = g.cells.item(3), h = g.cells.item(4);
    if (!m || !_)
      continue;
    const v = typeof f.position_count == "number" && Number.isFinite(f.position_count) ? f.position_count : 0, y = typeof f.current_value == "number" && Number.isFinite(f.current_value) ? f.current_value : null, S = ae(f.performance), A = typeof (S == null ? void 0 : S.gain_abs) == "number" ? S.gain_abs : null, N = typeof (S == null ? void 0 : S.gain_pct) == "number" ? S.gain_pct : null, b = typeof f.purchase_sum == "number" && Number.isFinite(f.purchase_sum) ? f.purchase_sum : typeof f.purchase_value == "number" && Number.isFinite(f.purchase_value) ? f.purchase_value : null, w = at(_.textContent);
    at(m.textContent) !== v && (m.textContent = l(v));
    const E = y !== null, R = {
      fx_unavailable: g.dataset.fxUnavailable === "true",
      current_value: y,
      performance: S
    }, C = { hasValue: E }, $ = H("current_value", R.current_value, R, C), P = y ?? 0;
    if ((Math.abs(w - P) >= 5e-3 || _.innerHTML !== $) && (_.innerHTML = $, g.classList.add("flash-update"), setTimeout(() => {
      g.classList.remove("flash-update");
    }, 800)), p) {
      const F = H("gain_abs", A, R, C);
      p.innerHTML = F;
      const U = typeof N == "number" && Number.isFinite(N) ? N : null;
      p.dataset.gainPct = U != null ? `${o(U)} %` : "—", p.dataset.gainSign = U != null ? U > 0 ? "positive" : U < 0 ? "negative" : "neutral" : "neutral";
    }
    h && (h.innerHTML = H("gain_pct", N, R, C)), g.dataset.positionCount = v.toString(), g.dataset.currentValue = E ? P.toString() : "", g.dataset.purchaseSum = b != null ? b.toString() : "", g.dataset.gainAbs = A != null ? A.toString() : "", g.dataset.gainPct = N != null ? N.toString() : "", g.dataset.coverageRatio = typeof f.coverage_ratio == "number" && Number.isFinite(f.coverage_ratio) ? f.coverage_ratio.toString() : "", g.dataset.provenance = typeof f.provenance == "string" ? f.provenance : "", g.dataset.metricRunUuid = typeof f.metric_run_uuid == "string" ? f.metric_run_uuid : "", c += 1;
  }
  if (c === 0)
    console.debug("handlePortfolioUpdate: Keine passenden Zeilen gefunden / keine Änderungen.");
  else {
    const u = c.toLocaleString("de-DE");
    console.debug(`handlePortfolioUpdate: ${u} Zeile(n) gepatcht.`);
  }
  try {
    ao(r);
  } catch (u) {
    console.warn("handlePortfolioUpdate: Fehler bei Summen-Neuberechnung:", u);
  }
  try {
    const u = (...h) => {
      for (const v of h) {
        if (!v) continue;
        const y = t.querySelector(v);
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
    ), m = (h, v) => {
      if (!h) return [];
      const y = h.querySelectorAll("tbody tr.account-row");
      return (y.length ? Array.from(y) : Array.from(h.querySelectorAll("tbody tr:not(.footer-row)"))).map((A) => {
        const N = v ? A.cells.item(2) : A.cells.item(1);
        return { balance: at(N == null ? void 0 : N.textContent) };
      });
    }, _ = [
      ...m(f, !1),
      ...m(g, !0)
    ], p = Array.from(
      r.querySelectorAll("tbody tr.portfolio-row")
    ).map((h) => {
      const v = h.dataset.currentValue, y = h.dataset.purchaseSum, S = v ? Number.parseFloat(v) : Number.NaN, A = y ? Number.parseFloat(y) : Number.NaN;
      return {
        current_value: Number.isFinite(S) ? S : 0,
        purchase_sum: Number.isFinite(A) ? A : 0
      };
    });
    Zn(_, p, t);
  } catch (u) {
    console.warn("handlePortfolioUpdate: Fehler bei Total-Neuberechnung:", u);
  }
}
function no(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e.portfolio_uuid;
  if (typeof t == "string" && t)
    return t;
  const n = e.portfolioUuid;
  return typeof n == "string" && n ? n : null;
}
function ht(e) {
  mt.delete(e);
}
function tn(e) {
  return typeof e != "number" || !Number.isInteger(e) || e <= 0 ? null : e;
}
function ro(e, t, n, r) {
  if (!n || n <= 1 || !t)
    return ht(e), r;
  const i = n, o = mt.get(e) ?? { expected: i, chunks: /* @__PURE__ */ new Map() };
  if (o.expected !== i && (o.chunks.clear(), o.expected = i), o.chunks.set(t, r), mt.set(e, o), o.chunks.size < i)
    return null;
  const a = [];
  for (let s = 1; s <= i; s += 1) {
    const c = o.chunks.get(s);
    c && Array.isArray(c) && a.push(...c);
  }
  return ht(e), a;
}
function nn(e, t) {
  const n = no(e);
  if (!n)
    return console.warn("handlePortfolioPositionsUpdate: Ungültiges Update:", e), !1;
  const r = e == null ? void 0 : e.error, i = tn(e == null ? void 0 : e.chunk_index), o = tn(e == null ? void 0 : e.chunk_count), a = Qe((e == null ? void 0 : e.positions) ?? []);
  r && ht(n);
  const s = r ? a : ro(n, i, o, a);
  if (!r && s === null)
    return !0;
  const c = r ? a : s ?? [];
  Gi(n, e), r || ($t(n, c), Mt(n, c));
  const l = Yn(t, n, c, r);
  if (l.applied ? J.delete(n) : (J.set(n, { positions: a, error: r }), l.reason !== "hidden" && Xn(t, n)), !r && a.length > 0) {
    const d = Array.from(
      new Set(
        a.map((u) => u.security_uuid).filter((u) => typeof u == "string" && u.length > 0)
      )
    );
    if (d.length && typeof window < "u")
      try {
        window.dispatchEvent(
          new CustomEvent(
            Vi,
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
function io(e, t) {
  if (Array.isArray(e)) {
    let n = !1;
    for (const r of e)
      nn(r, t) && (n = !0);
    !n && e.length && console.warn("handlePortfolioPositionsUpdate: Kein gültiges Element im Array:", e);
    return;
  }
  nn(e, t);
}
function oo(e) {
  const { renderPositionsTable: t, applyGainPctMetadata: n } = Ct();
  try {
    if (typeof t == "function")
      return t(e);
  } catch {
  }
  if (e.length === 0)
    return '<div class="no-positions">Keine Positionen vorhanden.</div>';
  const r = e.map((o) => {
    const a = Qt(o);
    return {
      name: o.name,
      current_holdings: o.current_holdings,
      purchase_value: o.purchase_value,
      current_value: o.current_value,
      performance: a
    };
  }), i = de(
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
      s.forEach((u, f) => {
        const g = c[f];
        g && (u.setAttribute("data-sort-key", g), u.classList.add("sortable-col"));
      }), a.querySelectorAll("tbody tr").forEach((u, f) => {
        if (u.classList.contains("footer-row"))
          return;
        const g = e[f];
        g.security_uuid && (u.dataset.security = g.security_uuid), u.classList.add("position-row");
      }), a.dataset.defaultSort = "name", a.dataset.defaultDir = "asc";
      const d = n;
      if (d)
        try {
          d(a);
        } catch (u) {
          console.warn("renderPositionsTableInline: applyGainPctMetadata failed", u);
        }
      else
        a.querySelectorAll("tbody tr").forEach((f, g) => {
          if (f.classList.contains("footer-row"))
            return;
          const m = f.cells.item(4);
          if (!m)
            return;
          const _ = e[g], p = Qt(_), h = typeof (p == null ? void 0 : p.gain_pct) == "number" && Number.isFinite(p.gain_pct) ? p.gain_pct : null, v = h != null ? `${h.toLocaleString("de-DE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })} %` : "—", y = h == null ? "neutral" : h > 0 ? "positive" : h < 0 ? "negative" : "neutral";
          m.dataset.gainPct = v, m.dataset.gainSign = y;
        });
      return a.outerHTML;
    }
  } catch (o) {
    console.warn("renderPositionsTableInline: Sortier-Metadaten Injection fehlgeschlagen:", o);
  }
  return i;
}
function ao(e) {
  var h;
  if (!e) return;
  const { updatePortfolioFooter: t } = Ct();
  if (typeof t == "function")
    try {
      t(e);
      return;
    } catch (v) {
      console.warn("updatePortfolioFooter: helper schlug fehl:", v);
    }
  const n = Array.from(e.querySelectorAll("tbody tr.portfolio-row")), r = (v) => {
    if (v === void 0)
      return null;
    const y = Number.parseFloat(v);
    return Number.isFinite(y) ? y : null;
  }, i = n.reduce(
    (v, y) => {
      const S = r(y.dataset.positionCount);
      if (S != null && (v.sumPositions += S), y.dataset.fxUnavailable === "true" && (v.fxUnavailable = !0), y.dataset.hasValue !== "true")
        return v.incompleteRows += 1, v;
      v.valueRows += 1;
      const A = r(y.dataset.currentValue), N = r(y.dataset.gainAbs), b = r(y.dataset.purchaseSum);
      return A == null || N == null || b == null ? (v.incompleteRows += 1, v) : (v.sumCurrent += A, v.sumGainAbs += N, v.sumPurchase += b, v);
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
  }, d = { hasValue: o }, u = H("current_value", l.current_value, l, d), f = o ? i.sumGainAbs : null, g = o ? a : null, m = H("gain_abs", f, l, d), _ = H("gain_pct", g, l, d);
  s.innerHTML = `
    <td>Summe</td>
    <td class="align-right">${c}</td>
    <td class="align-right">${u}</td>
    <td class="align-right">${m}</td>
    <td class="align-right">${_}</td>
  `;
  const p = s.cells.item(3);
  p && (p.dataset.gainPct = o && typeof a == "number" ? `${bt(a)} %` : "—", p.dataset.gainSign = o && typeof a == "number" ? a > 0 ? "positive" : a < 0 ? "negative" : "neutral" : "neutral"), s.dataset.positionCount = Math.round(i.sumPositions).toString(), s.dataset.currentValue = o ? i.sumCurrent.toString() : "", s.dataset.purchaseSum = o ? i.sumPurchase.toString() : "", s.dataset.gainAbs = o ? i.sumGainAbs.toString() : "", s.dataset.gainPct = o && typeof a == "number" ? a.toString() : "", s.dataset.hasValue = o ? "true" : "false", s.dataset.fxUnavailable = i.fxUnavailable || !o ? "true" : "false";
}
function rn(e) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  if (typeof e == "string") {
    const t = Number.parseFloat(e);
    return Number.isFinite(t) ? t : 0;
  }
  return 0;
}
function bt(e) {
  return (Je(e, { fallback: 0 }) ?? 0).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
function Zn(e, t, n) {
  const r = n ?? document, o = (Array.isArray(e) ? e : []).reduce((u, f) => {
    const g = f.balance ?? f.current_value ?? f.value, m = rn(g);
    return u + m;
  }, 0), s = (Array.isArray(t) ? t : []).reduce((u, f) => {
    const g = f.current_value ?? f.value, m = rn(g);
    return u + m;
  }, 0), c = o + s, l = r.querySelector("#headerMeta");
  if (!l) {
    console.warn("updateTotalWealth: #headerMeta nicht gefunden.");
    return;
  }
  const d = l.querySelector("strong") || l.querySelector(".total-wealth-value");
  d ? d.textContent = `${bt(c)} €` : l.textContent = `💰 Gesamtvermögen: ${bt(c)} €`, l.dataset.totalWealthEur = c.toString();
}
function so(e, t) {
  const n = typeof e == "string" ? e : e == null ? void 0 : e.last_file_update, r = me(n) ?? "";
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
function Ha(e) {
  if (e == null)
    return;
  const t = e.querySelector("table.sortable-positions");
  if (t == null)
    return;
  const n = e.dataset.sortKey || t.dataset.defaultSort || "name", i = (e.dataset.sortDir || t.dataset.defaultDir || "asc") === "desc" ? "desc" : "asc";
  e.dataset.sortKey = n, e.dataset.sortDir = i, Pn(t, n, i, !0);
}
const Ua = {
  getPortfolioPositionsCacheSnapshot: bi,
  clearPortfolioPositionsCache: hi,
  getPendingUpdateCount() {
    return J.size;
  },
  queuePendingUpdate(e, t, n) {
    J.set(e, { positions: t, error: n });
  },
  clearPendingUpdates() {
    J.clear(), He.clear();
  }
};
function at(e) {
  return e == null ? 0 : parseFloat(
    e.replace(/\u00A0/g, " ").replace(/[€%]/g, "").replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "")
  ) || 0;
}
const co = [
  "name",
  "current_holdings",
  "purchase_value",
  "current_value",
  "gain_abs",
  "gain_pct"
];
function st(e) {
  return co.includes(e);
}
function ct(e) {
  return e === "asc" || e === "desc";
}
let qe = null, Oe = null;
const on = { min: 2, max: 6 };
function be(e) {
  return $e(e);
}
function lo(e) {
  return typeof e == "number" && Number.isFinite(e);
}
function uo(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  if (!t)
    return null;
  const n = t.toUpperCase();
  return /^[A-Z]{3}$/.test(n) ? n : n === "€" ? "EUR" : null;
}
function an(e, t, n = null) {
  for (const r of t) {
    const i = uo(e[r]);
    if (i)
      return i;
  }
  return n;
}
function sn(e, t) {
  return lo(e) ? `${e.toLocaleString("de-DE", {
    minimumFractionDigits: on.min,
    maximumFractionDigits: on.max
  })}${t ? ` ${t}` : ""}` : null;
}
function fo(e) {
  const t = e, n = e.average_cost ?? null, r = e.aggregation ?? null, i = an(t, [
    "security_currency_code",
    "security_currency",
    "native_currency_code",
    "native_currency"
  ], e.currency_code ?? null), o = an(t, [
    "account_currency_code",
    "account_currency",
    "purchase_currency_code",
    "currency_code"
  ], i === "EUR" ? "EUR" : null) ?? (i === "EUR" ? "EUR" : null) ?? "EUR", a = be(n == null ? void 0 : n.native), s = be(n == null ? void 0 : n.security), c = be(n == null ? void 0 : n.account), l = be(n == null ? void 0 : n.eur), d = s ?? a, u = l ?? (o === "EUR" ? c : null), f = i ?? o ?? "EUR", g = f === "EUR";
  let m, _;
  g ? (m = "EUR", _ = u ?? d ?? c ?? null) : d != null ? (m = f, _ = d) : c != null ? (m = o, _ = c) : (m = "EUR", _ = u ?? null);
  const p = sn(_, m), h = g ? null : sn(u, "EUR"), v = !!h && h !== p, y = [], S = [];
  p ? (y.push(
    `<span class="purchase-price purchase-price--primary">${p}</span>`
  ), S.push(p.replace(/\u00A0/g, " "))) : (y.push('<span class="missing-value" role="note" aria-label="Kein Kaufpreis verfügbar" title="Kein Kaufpreis verfügbar">—</span>'), S.push("Kein Kaufpreis verfügbar")), v && h && (y.push(
    `<span class="purchase-price purchase-price--secondary">${h}</span>`
  ), S.push(h.replace(/\u00A0/g, " ")));
  const A = y.join("<br>"), N = be(r == null ? void 0 : r.purchase_value_eur) ?? 0, b = S.join(", ");
  return { markup: A, sortValue: N, ariaLabel: b };
}
const Be = /* @__PURE__ */ new Set();
function Jn(e) {
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
function Fe(e) {
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
  }), r = de(n, t, ["purchase_value", "current_value", "gain_abs"]);
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
        const d = e[l], u = typeof d.security_uuid == "string" ? d.security_uuid : null;
        u && (c.dataset.security = u), c.classList.add("position-row");
        const f = c.cells.item(2);
        if (f) {
          const { markup: _, sortValue: p, ariaLabel: h } = fo(d);
          f.innerHTML = _, f.dataset.sortValue = String(p), h ? f.setAttribute("aria-label", h) : f.removeAttribute("aria-label");
        }
        const g = c.cells.item(4);
        if (g) {
          const _ = ae(d.performance), p = typeof (_ == null ? void 0 : _.gain_pct) == "number" && Number.isFinite(_.gain_pct) ? _.gain_pct : null, h = p != null ? `${p.toLocaleString("de-DE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })} %` : "—", v = p == null ? "neutral" : p > 0 ? "positive" : p < 0 ? "negative" : "neutral";
          g.dataset.gainPct = h, g.dataset.gainSign = v;
        }
        const m = c.cells.item(5);
        m && m.classList.add("gain-pct-cell");
      }), o.dataset.defaultSort = "name", o.dataset.defaultDir = "asc", Jn(o), o.outerHTML;
    }
  } catch (i) {
    console.warn("renderPositionsTable: Konnte Sortier-Metadaten nicht injizieren:", i);
  }
  return r;
}
function go(e) {
  const t = Qe(e ?? []);
  return Fe(t);
}
function po(e, t) {
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
        Cr(c) || console.warn("attachSecurityDetailDelegation: Detail-Tab konnte nicht geöffnet werden für", c);
      } catch (l) {
        console.error("attachSecurityDetailDelegation: Fehler beim Öffnen des Detail-Tabs", l);
      }
  })));
}
function xe(e, t) {
  po(e, t);
}
function Qn(e) {
  console.debug("buildExpandablePortfolioTable: render", e.length, "portfolios");
  const t = (b) => b == null || typeof b != "string" && typeof b != "number" && typeof b != "boolean" ? "" : String(b).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  let n = '<table class="expandable-portfolio-table"><thead><tr>';
  [
    { key: "name", label: "Name" },
    { key: "position_count", label: "Anzahl Positionen", align: "right" },
    { key: "current_value", label: "Aktueller Wert", align: "right" },
    { key: "gain_abs", label: "Gesamt +/-", align: "right" },
    { key: "gain_pct", label: "%", align: "right" }
  ].forEach((b) => {
    const w = b.align === "right" ? ' class="align-right"' : "";
    n += `<th${w}>${b.label}</th>`;
  }), n += "</tr></thead><tbody>", e.forEach((b) => {
    const w = Number.isFinite(b.position_count) ? b.position_count : 0, D = Number.isFinite(b.purchase_sum) ? b.purchase_sum : 0, E = b.hasValue && typeof b.current_value == "number" && Number.isFinite(b.current_value) ? b.current_value : null, R = E !== null, C = b.performance, $ = typeof b.gain_abs == "number" ? b.gain_abs : typeof (C == null ? void 0 : C.gain_abs) == "number" ? C.gain_abs : null, P = typeof b.gain_pct == "number" ? b.gain_pct : typeof (C == null ? void 0 : C.gain_pct) == "number" ? C.gain_pct : null, F = b.fx_unavailable && R, L = typeof b.coverage_ratio == "number" && Number.isFinite(b.coverage_ratio) ? b.coverage_ratio : "", U = typeof b.provenance == "string" ? b.provenance : "", ce = typeof b.metric_run_uuid == "string" ? b.metric_run_uuid : "", W = Be.has(b.uuid), O = W ? "portfolio-toggle expanded" : "portfolio-toggle", z = `portfolio-details-${b.uuid}`, B = {
      fx_unavailable: b.fx_unavailable,
      current_value: E,
      gain_abs: $,
      gain_pct: P
    }, tt = { hasValue: R }, Lr = H("current_value", B.current_value, B, tt), Tr = H("gain_abs", B.gain_abs, B, tt), Mr = H("gain_pct", B.gain_pct, B, tt), Bt = R && typeof P == "number" && Number.isFinite(P) ? `${Q(P)} %` : "", kr = R && typeof P == "number" && Number.isFinite(P) ? P > 0 ? "positive" : P < 0 ? "negative" : "neutral" : "", Ir = R && typeof E == "number" && Number.isFinite(E) ? E : "", Hr = R && typeof $ == "number" && Number.isFinite($) ? $ : "", Ur = R && typeof P == "number" && Number.isFinite(P) ? P : "", Vr = String(w);
    let nt = "";
    Bt && (nt = ` data-gain-pct="${t(Bt)}" data-gain-sign="${t(kr)}"`), F && (nt += ' data-partial="true"'), n += `<tr class="portfolio-row"
                  data-portfolio="${b.uuid}"
                  data-position-count="${Vr}"
                  data-current-value="${t(Ir)}"
                  data-purchase-sum="${t(D)}"
                  data-gain-abs="${t(Hr)}"
                data-gain-pct="${t(Ur)}"
                data-has-value="${R ? "true" : "false"}"
                data-fx-unavailable="${b.fx_unavailable ? "true" : "false"}"
                data-coverage-ratio="${t(L)}"
                data-provenance="${t(U)}"
                data-metric-run-uuid="${t(ce)}">`;
    const zr = we(b.name), qr = jn(b.badges, { containerClass: "portfolio-badges" });
    n += `<td>
        <button type="button"
                class="${O}"
                data-portfolio="${b.uuid}"
                aria-expanded="${W ? "true" : "false"}"
                aria-controls="${z}">
          <span class="caret">${W ? "▼" : "▶"}</span>
          <span class="portfolio-name">${zr}</span>${qr}
        </button>
      </td>`;
    const Or = w.toLocaleString("de-DE");
    n += `<td class="align-right">${Or}</td>`, n += `<td class="align-right">${Lr}</td>`, n += `<td class="align-right"${nt}>${Tr}</td>`, n += `<td class="align-right gain-pct-cell">${Mr}</td>`, n += "</tr>", n += `<tr class="portfolio-details${W ? "" : " hidden"}"
                data-portfolio="${b.uuid}"
                id="${z}"
                role="region"
                aria-label="Positionen für ${b.name}">
      <td colspan="5">
        <div class="positions-container">${W ? Lt(b.uuid) ? Fe(Mn(b.uuid)) : '<div class="loading">Lade Positionen...</div>' : ""}</div>
      </td>
    </tr>`;
  });
  const i = e.filter((b) => typeof b.current_value == "number" && Number.isFinite(b.current_value)), o = e.reduce((b, w) => b + (Number.isFinite(w.position_count) ? w.position_count : 0), 0), a = i.reduce((b, w) => typeof w.current_value == "number" && Number.isFinite(w.current_value) ? b + w.current_value : b, 0), s = i.reduce((b, w) => typeof w.purchase_sum == "number" && Number.isFinite(w.purchase_sum) ? b + w.purchase_sum : b, 0), c = i.reduce((b, w) => {
    var R;
    if (typeof ((R = w.performance) == null ? void 0 : R.gain_abs) == "number" && Number.isFinite(w.performance.gain_abs))
      return b + w.performance.gain_abs;
    const D = typeof w.current_value == "number" && Number.isFinite(w.current_value) ? w.current_value : 0, E = typeof w.purchase_sum == "number" && Number.isFinite(w.purchase_sum) ? w.purchase_sum : 0;
    return b + (D - E);
  }, 0), l = i.length > 0, d = i.length !== e.length, u = l && s > 0 ? c / s * 100 : null, f = {
    fx_unavailable: d,
    current_value: l ? a : null,
    gain_abs: l ? c : null,
    gain_pct: l ? u : null
  }, g = { hasValue: l }, m = H("current_value", f.current_value, f, g), _ = H("gain_abs", f.gain_abs, f, g), p = H("gain_pct", f.gain_pct, f, g);
  let h = "";
  if (l && typeof u == "number" && Number.isFinite(u)) {
    const b = `${Q(u)} %`, w = u > 0 ? "positive" : u < 0 ? "negative" : "neutral";
    h = ` data-gain-pct="${t(b)}" data-gain-sign="${t(w)}"`;
  }
  d && (h += ' data-partial="true"');
  const v = String(Math.round(o)), y = l ? String(a) : "", S = l ? String(s) : "", A = l ? String(c) : "", N = l && typeof u == "number" && Number.isFinite(u) ? String(u) : "";
  return n += `<tr class="footer-row"
      data-position-count="${v}"
      data-current-value="${t(y)}"
      data-purchase-sum="${t(S)}"
      data-gain-abs="${t(A)}"
      data-gain-pct="${t(N)}"
      data-has-value="${l ? "true" : "false"}"
      data-fx-unavailable="${d ? "true" : "false"}">
      <td>Summe</td>
      <td class="align-right">${Math.round(o).toLocaleString("de-DE")}</td>
    <td class="align-right">${m}</td>
    <td class="align-right"${h}>${_}</td>
    <td class="align-right gain-pct-cell">${p}</td>
  </tr>`, n += "</tbody></table>", n;
}
function mo(e) {
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
function Me(e) {
  if (e === void 0)
    return null;
  const t = Number(e);
  return Number.isFinite(t) ? t : null;
}
function er(e) {
  const t = mo(e);
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
    const N = Me(A.dataset.positionCount);
    N != null && (i += N), A.dataset.fxUnavailable === "true" && (d = !0);
    const b = A.dataset.hasValue;
    if (!!(b === "false" || b === "0" || b === "" || b == null)) {
      l = !1;
      continue;
    }
    c = !0;
    const D = Me(A.dataset.currentValue), E = Me(A.dataset.gainAbs), R = Me(A.dataset.purchaseSum);
    if (D == null || E == null || R == null) {
      l = !1;
      continue;
    }
    o += D, s += E, a += R;
  }
  const u = c && l, f = u && a > 0 ? s / a * 100 : null;
  let g = Array.from(n.children).find(
    (A) => A instanceof HTMLTableRowElement && A.classList.contains("footer-row")
  );
  g || (g = document.createElement("tr"), g.classList.add("footer-row"), n.appendChild(g));
  const m = Math.round(i).toLocaleString("de-DE"), _ = {
    fx_unavailable: d || !u,
    current_value: u ? o : null,
    gain_abs: u ? s : null,
    gain_pct: u ? f : null
  }, p = { hasValue: u }, h = H("current_value", _.current_value, _, p), v = H("gain_abs", _.gain_abs, _, p), y = H("gain_pct", _.gain_pct, _, p);
  g.innerHTML = `
      <td>Summe</td>
      <td class="align-right">${m}</td>
      <td class="align-right">${h}</td>
      <td class="align-right">${v}</td>
      <td class="align-right">${y}</td>
    `;
  const S = g.cells.item(3);
  S && (S.dataset.gainPct = u && typeof f == "number" ? `${Q(f)} %` : "—", S.dataset.gainSign = u && typeof f == "number" ? f > 0 ? "positive" : f < 0 ? "negative" : "neutral" : "neutral"), g.dataset.positionCount = String(Math.round(i)), g.dataset.currentValue = u ? String(o) : "", g.dataset.purchaseSum = u ? String(a) : "", g.dataset.gainAbs = u ? String(s) : "", g.dataset.gainPct = u && typeof f == "number" ? String(f) : "", g.dataset.hasValue = u ? "true" : "false", g.dataset.fxUnavailable = d ? "true" : "false";
}
function Ee(e, t) {
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
  const o = (f, g) => {
    const m = i.querySelector("tbody");
    if (!m) return;
    const _ = Array.from(m.querySelectorAll("tr")).filter((y) => !y.classList.contains("footer-row")), p = m.querySelector("tr.footer-row"), h = (y) => {
      if (y == null) return 0;
      const S = y.replace(/\u00A0/g, " ").replace(/[%€]/g, "").replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, ""), A = Number.parseFloat(S);
      return Number.isFinite(A) ? A : 0;
    };
    _.sort((y, S) => {
      const N = {
        name: 0,
        current_holdings: 1,
        purchase_value: 2,
        current_value: 3,
        gain_abs: 4,
        gain_pct: 5
      }[f], b = y.cells.item(N), w = S.cells.item(N);
      let D = "";
      if (b) {
        const $ = b.textContent;
        typeof $ == "string" && (D = $.trim());
      }
      let E = "";
      if (w) {
        const $ = w.textContent;
        typeof $ == "string" && (E = $.trim());
      }
      const R = ($, P) => {
        const F = $ ? $.dataset.sortValue : void 0;
        if (F != null && F !== "") {
          const L = Number(F);
          if (Number.isFinite(L))
            return L;
        }
        return h(P);
      };
      let C;
      if (f === "name")
        C = D.localeCompare(E, "de", { sensitivity: "base" });
      else {
        const $ = R(b, D), P = R(w, E);
        C = $ - P;
      }
      return g === "asc" ? C : -C;
    }), i.querySelectorAll("thead th.sort-active").forEach((y) => {
      y.classList.remove("sort-active", "dir-asc", "dir-desc");
    });
    const v = i.querySelector(`thead th[data-sort-key="${f}"]`);
    v && v.classList.add("sort-active", g === "asc" ? "dir-asc" : "dir-desc"), _.forEach((y) => m.appendChild(y)), p && m.appendChild(p);
  }, a = r.dataset.sortKey, s = r.dataset.sortDir, c = i.dataset.defaultSort, l = i.dataset.defaultDir, d = st(a) ? a : st(c) ? c : "name", u = ct(s) ? s : ct(l) ? l : "asc";
  o(d, u), i.addEventListener("click", (f) => {
    const g = f.target;
    if (!(g instanceof Element))
      return;
    const m = g.closest("th[data-sort-key]");
    if (!m || !i.contains(m)) return;
    const _ = m.getAttribute("data-sort-key");
    if (!st(_))
      return;
    let p = "asc";
    r.dataset.sortKey === _ && (p = (ct(r.dataset.sortDir) ? r.dataset.sortDir : "asc") === "asc" ? "desc" : "asc"), r.dataset.sortKey = _, r.dataset.sortDir = p, o(_, p);
  });
}
async function ho(e, t, n) {
  if (!e || !qe || !Oe) return;
  const r = t || n.querySelector(
    `.portfolio-details[data-portfolio="${e}"] .positions-container`
  );
  if (!r)
    return;
  const i = r.closest(".portfolio-details");
  if (!(i && i.classList.contains("hidden"))) {
    r.innerHTML = '<div class="loading">Neu laden...</div>';
    try {
      const o = await Cn(
        qe,
        Oe,
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
      $t(e, a), Mt(e, a), r.innerHTML = Fe(a);
      try {
        Ee(n, e);
      } catch (s) {
        console.warn("attachPortfolioToggleHandler: Sort-Init (Lazy) fehlgeschlagen:", s);
      }
      try {
        xe(n, e);
      } catch (s) {
        console.warn("reloadPortfolioPositions: Security-Listener konnte nicht gebunden werden:", s);
      }
    } catch (o) {
      const a = o instanceof Error ? o.message : String(o);
      r.innerHTML = `<div class="error">Fehler: ${a} <button class="retry-pos" data-portfolio="${e}">Retry</button></div>`;
    }
  }
}
async function bo(e, t, n = 3e3, r = 50) {
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
function Vt(e) {
  const n = (typeof e.__ppReaderAttachToken == "number" ? e.__ppReaderAttachToken : 0) + 1;
  e.__ppReaderAttachToken = n, e.__ppReaderAttachInProgress = !0, (async () => {
    try {
      const r = await bo(e, ".portfolio-table");
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
              const g = s.getAttribute("data-portfolio");
              if (g) {
                const m = e.querySelector(
                  `.portfolio-details[data-portfolio="${g}"]`
                ), _ = m == null ? void 0 : m.querySelector(".positions-container");
                await ho(g, _ ?? null, e);
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
            const u = c.querySelector(".caret");
            if (d.classList.contains("hidden")) {
              d.classList.remove("hidden"), c.classList.add("expanded"), c.setAttribute("aria-expanded", "true"), u && (u.textContent = "▼"), Be.add(l);
              try {
                Ut(e, l);
              } catch (g) {
                console.warn("attachPortfolioToggleHandler: Pending-Flush fehlgeschlagen:", g);
              }
              if (Lt(l)) {
                const g = d.querySelector(".positions-container");
                if (g) {
                  g.innerHTML = Fe(
                    Mn(l)
                  ), Ee(e, l);
                  try {
                    xe(e, l);
                  } catch (m) {
                    console.warn("attachPortfolioToggleHandler: Security-Listener (Cache) Fehler:", m);
                  }
                }
              } else {
                const g = d.querySelector(".positions-container");
                g && (g.innerHTML = '<div class="loading">Lade Positionen...</div>');
                try {
                  const m = await Cn(
                    qe,
                    Oe,
                    l
                  );
                  if (m.error) {
                    const p = typeof m.error == "string" ? m.error : String(m.error);
                    g && (g.innerHTML = `<div class="error">${p} <button class="retry-pos" data-portfolio="${l}">Erneut laden</button></div>`);
                    return;
                  }
                  const _ = Qe(
                    Array.isArray(m.positions) ? m.positions : []
                  );
                  if ($t(l, _), Mt(
                    l,
                    _
                  ), g) {
                    g.innerHTML = Fe(_);
                    try {
                      Ee(e, l);
                    } catch (p) {
                      console.warn("attachPortfolioToggleHandler: Sort-Init (Lazy) fehlgeschlagen:", p);
                    }
                    try {
                      xe(e, l);
                    } catch (p) {
                      console.warn("attachPortfolioToggleHandler: Security-Listener konnte nicht gebunden werden:", p);
                    }
                  }
                } catch (m) {
                  const _ = m instanceof Error ? m.message : String(m), p = d.querySelector(".positions-container");
                  p && (p.innerHTML = `<div class="error">Fehler beim Laden: ${_} <button class="retry-pos" data-portfolio="${l}">Retry</button></div>`), console.error("Fehler beim Lazy Load für", l, m);
                }
              }
            } else
              d.classList.add("hidden"), c.classList.remove("expanded"), c.setAttribute("aria-expanded", "false"), u && (u.textContent = "▶"), Be.delete(l);
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
function _o(e) {
  const t = e.querySelector(".expandable-portfolio-table");
  t && (t.__ppReaderPortfolioFallbackBound || (t.__ppReaderPortfolioFallbackBound = !0, t.addEventListener("click", (n) => {
    const r = n.target;
    if (!(r instanceof Element) || !r.closest(".portfolio-toggle")) return;
    const o = e.querySelector(".portfolio-table");
    o != null && o.__ppReaderPortfolioToggleBound || (console.debug("Fallback-Listener aktiv – re-attach Hauptlistener"), Vt(e));
  })));
}
async function tr(e, t, n) {
  var R, C, $;
  qe = t ?? null, Oe = n ?? null, console.debug(
    "renderDashboard: start – panelConfig:",
    n == null ? void 0 : n.config,
    "derived entry_id?",
    ($ = (C = (R = n == null ? void 0 : n.config) == null ? void 0 : R._panel_custom) == null ? void 0 : C.config) == null ? void 0 : $.entry_id
  );
  const r = await ti(t, n);
  Un(r.accounts);
  const i = Wn(), o = await ri(t, n);
  Ai(o.portfolios);
  const a = Li();
  let s = "";
  try {
    s = await ni(t, n);
  } catch {
    s = "";
  }
  const c = i.reduce(
    (P, F) => P + (typeof F.balance == "number" && Number.isFinite(F.balance) ? F.balance : 0),
    0
  ), l = a.some((P) => P.fx_unavailable), d = i.some((P) => P.fx_unavailable && (P.balance == null || !Number.isFinite(P.balance))), u = a.reduce((P, F) => F.hasValue && typeof F.current_value == "number" && Number.isFinite(F.current_value) ? P + F.current_value : P, 0), f = c + u, g = "Teilw. fehlende FX-Kurse – Gesamtvermögen abweichend", _ = a.some((P) => P.hasValue && typeof P.current_value == "number" && Number.isFinite(P.current_value)) || i.some((P) => typeof P.balance == "number" && Number.isFinite(P.balance)) ? `${Q(f)}&nbsp;€` : `<span class="missing-value" role="note" aria-label="${g}" title="${g}">—</span>`, p = l || d ? `<span class="total-wealth-note">${g}</span>` : "", h = `
    <div class="header-meta-row">
      💰 Gesamtvermögen: <strong class="total-wealth-value">${_}</strong>${p}
    </div>
  `, v = pt("Übersicht", h), y = Qn(a), S = i.filter((P) => (P.currency_code ?? "EUR") === "EUR"), A = i.filter((P) => (P.currency_code ?? "EUR") !== "EUR"), b = A.some((P) => P.fx_unavailable) ? `
        <p class="table-note" role="note">
          <span class="table-note__icon" aria-hidden="true">⚠️</span>
          <span>Wechselkurse konnten nicht geladen werden. EUR-Werte werden derzeit nicht angezeigt.</span>
        </p>
      ` : "", w = `
    <div class="card">
      <h2>Liquidität</h2>
      <div class="scroll-container account-table">
        ${de(
    S.map((P) => ({
      name: ze(P.name, P.badges, {
        containerClass: "account-name",
        labelClass: "account-name__label"
      }),
      balance: P.balance ?? null
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
          ${de(
    A.map((P) => {
      const F = P.orig_balance, U = typeof F == "number" && Number.isFinite(F) ? `${F.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}&nbsp;${P.currency_code ?? ""}` : "";
      return {
        name: ze(P.name, P.badges, {
          containerClass: "account-name",
          labelClass: "account-name__label"
        }),
        fx_display: U,
        balance: P.balance ?? null
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
        ${b}
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
    ${v.outerHTML}
    <div class="card">
      <h2>Investment</h2>
      <div class="scroll-container portfolio-table">
        ${y}
      </div>
    </div>
    ${w}
    ${D}
  `;
  return yo(e, a), E;
}
function yo(e, t) {
  if (!e)
    return;
  const n = () => {
    try {
      const i = e, o = i.querySelector(".portfolio-table");
      o && o.querySelectorAll(".portfolio-toggle").length === 0 && (console.debug("Recovery: Tabelle ohne Buttons – erneuter Aufbau"), o.innerHTML = Qn(t)), Vt(e), _o(e), Be.forEach((a) => {
        try {
          Lt(a) && (Ee(e, a), xe(e, a));
        } catch (s) {
          console.warn("Init-Sortierung für expandiertes Depot fehlgeschlagen:", a, s);
        }
      });
      try {
        er(i);
      } catch (a) {
        console.warn("renderDashboard: Footer-Summe konnte nicht aktualisiert werden:", a);
      }
      try {
        Zi(e);
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
li({
  renderPositionsTable: (e) => go(e),
  applyGainPctMetadata: Jn,
  attachSecurityDetailListener: xe,
  attachPortfolioPositionsSorting: Ee,
  updatePortfolioFooter: (e) => {
    e && er(e);
  }
});
const vo = "http://www.w3.org/2000/svg", Se = 640, Pe = 260, ye = { top: 12, right: 16, bottom: 24, left: 16 }, ve = "var(--pp-reader-chart-line, #3f51b5)", _t = "var(--pp-reader-chart-area, rgba(63, 81, 181, 0.12))", cn = "0.75rem", nr = "var(--pp-reader-chart-baseline, rgba(96, 125, 139, 0.75))", rr = "6 4", So = 24 * 60 * 60 * 1e3;
function Po(e) {
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
function Ao(e) {
  return typeof e == "string" ? e : typeof e == "number" && Number.isFinite(e) ? e.toString() : e instanceof Date && Number.isFinite(e.getTime()) ? e.toISOString() : "";
}
function K(e) {
  return `${String(e)}px`;
}
function ie(e, t = {}) {
  const n = document.createElementNS(vo, e);
  return Object.entries(t).forEach(([r, i]) => {
    const o = Po(i);
    o != null && n.setAttribute(r, o);
  }), n;
}
function yt(e, t = null) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  if (typeof e == "string" && e.trim() !== "") {
    const n = Number.parseFloat(e);
    if (Number.isFinite(n))
      return n;
  }
  return t;
}
function No(e, t) {
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
const ir = (e) => {
  if (e && typeof e == "object" && "date" in e)
    return e.date;
}, or = (e) => {
  if (e && typeof e == "object" && "close" in e)
    return e.close;
}, ar = (e, t, n) => {
  if (Number.isFinite(e)) {
    const r = new Date(e);
    if (!Number.isNaN(r.getTime()))
      return r.toLocaleDateString("de-DE");
  }
  if (t && typeof t == "object" && "date" in t) {
    const r = t.date, i = Ao(r);
    if (i)
      return i;
  }
  return Number.isFinite(e) ? e.toString() : "";
}, sr = (e, t, n) => (Number.isFinite(e) ? e : yt(e, 0) ?? 0).toLocaleString("de-DE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
}), cr = ({ xFormatted: e, yFormatted: t }) => `
    <div class="chart-tooltip-date">${e}</div>
    <div class="chart-tooltip-value">${t}&nbsp;€</div>
  `;
function lr(e) {
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
    xAccessor: ir,
    yAccessor: or,
    xFormatter: ar,
    yFormatter: sr,
    tooltipRenderer: cr,
    color: ve,
    areaColor: _t,
    baseline: null,
    handlersAttached: !1
  }), e.__chartState;
}
function oe(e, t, n) {
  return !Number.isFinite(e) || e < t ? t : e > n ? n : e;
}
function wo(e, t) {
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
function Fo(e) {
  if (e.length === 0)
    return "";
  const t = [];
  return e.forEach((n, r) => {
    const i = r === 0 ? "M" : "L", o = n.x.toFixed(2), a = n.y.toFixed(2);
    t.push(`${i}${o} ${a}`);
  }), t.join(" ");
}
function xo(e) {
  const { baselineLine: t, baseline: n } = e;
  if (!t)
    return;
  const r = (n == null ? void 0 : n.color) ?? nr, i = (n == null ? void 0 : n.dashArray) ?? rr;
  t.setAttribute("stroke", r), t.setAttribute("stroke-dasharray", i);
}
function lt(e) {
  const { baselineLine: t, baseline: n, range: r, margin: i, width: o } = e;
  if (!t)
    return;
  const a = n == null ? void 0 : n.value;
  if (!r || a == null || !Number.isFinite(a)) {
    t.style.opacity = "0";
    return;
  }
  const { minY: s, maxY: c, boundedHeight: l } = r, d = Number.isFinite(s) ? s : a, f = (Number.isFinite(c) ? c : d + 1) - d, g = f === 0 ? 0.5 : (a - d) / f, m = oe(g, 0, 1), _ = Math.max(l, 0), p = i.top + (1 - m) * _, h = Math.max(o - i.left - i.right, 0), v = i.left, y = i.left + h;
  t.setAttribute("x1", v.toFixed(2)), t.setAttribute("x2", y.toFixed(2)), t.setAttribute("y1", p.toFixed(2)), t.setAttribute("y2", p.toFixed(2)), t.style.opacity = "1";
}
function Eo(e, t, n) {
  var P;
  const { width: r, height: i, margin: o } = t, { xAccessor: a, yAccessor: s } = n;
  if (e.length === 0)
    return { points: [], range: null };
  const c = e.map((F, L) => {
    const U = a(F, L), ce = s(F, L), W = No(U, L), O = yt(ce, Number.NaN);
    return Number.isFinite(O) ? {
      index: L,
      data: F,
      xValue: W,
      yValue: O
    } : null;
  }).filter((F) => !!F);
  if (c.length === 0)
    return { points: [], range: null };
  const l = c.reduce((F, L) => Math.min(F, L.xValue), c[0].xValue), d = c.reduce((F, L) => Math.max(F, L.xValue), c[0].xValue), u = c.reduce((F, L) => Math.min(F, L.yValue), c[0].yValue), f = c.reduce((F, L) => Math.max(F, L.yValue), c[0].yValue), g = Math.max(r - o.left - o.right, 1), m = Math.max(i - o.top - o.bottom, 1), _ = Number.isFinite(l) ? l : 0, p = Number.isFinite(d) ? d : _ + 1, h = Number.isFinite(u) ? u : 0, v = Number.isFinite(f) ? f : h + 1, y = yt((P = t.baseline) == null ? void 0 : P.value, null), S = y != null && Number.isFinite(y) ? Math.min(h, y) : h, A = y != null && Number.isFinite(y) ? Math.max(v, y) : v, N = Math.max(
    2,
    Math.min(
      6,
      Math.round(
        Math.max(i - o.top - o.bottom, 0) / 60
      ) || 4
    )
  ), { niceMin: b, niceMax: w } = Lo(
    S,
    A,
    N
  ), D = Number.isFinite(b) ? b : h, E = Number.isFinite(w) ? w : v, R = p - _ || 1, C = E - D || 1;
  return {
    points: c.map((F) => {
      const L = R === 0 ? 0.5 : (F.xValue - _) / R, U = C === 0 ? 0.5 : (F.yValue - D) / C, ce = o.left + L * g, W = o.top + (1 - U) * m;
      return {
        ...F,
        x: ce,
        y: W
      };
    }),
    range: {
      minX: _,
      maxX: p,
      minY: D,
      maxY: E,
      boundedWidth: g,
      boundedHeight: m
    }
  };
}
function ur(e, t, n, r) {
  e.width = Number.isFinite(t) ? Number(t) : Se, e.height = Number.isFinite(n) ? Number(n) : Pe, e.margin = {
    top: Number.isFinite(r == null ? void 0 : r.top) ? Number(r == null ? void 0 : r.top) : ye.top,
    right: Number.isFinite(r == null ? void 0 : r.right) ? Number(r == null ? void 0 : r.right) : ye.right,
    bottom: Number.isFinite(r == null ? void 0 : r.bottom) ? Number(r == null ? void 0 : r.bottom) : ye.bottom,
    left: Number.isFinite(r == null ? void 0 : r.left) ? Number(r == null ? void 0 : r.left) : ye.left
  };
}
function Do(e, t) {
  const n = e.xFormatter(t.xValue, t.data, t.index), r = e.yFormatter(t.yValue, t.data, t.index);
  return e.tooltipRenderer({
    point: t,
    xFormatted: n,
    yFormatted: r,
    data: t.data,
    index: t.index
  });
}
function Ro(e, t, n) {
  const { tooltip: r, width: i, margin: o, height: a } = e;
  if (!r)
    return;
  const s = a - o.bottom;
  r.style.visibility = "visible", r.style.opacity = "1";
  const c = r.offsetWidth || 0, l = r.offsetHeight || 0, d = oe(t.x - c / 2, o.left, i - o.right - c), u = Math.max(s - l, 0), f = 12, g = Number.isFinite(n) ? oe(n ?? 0, o.top, s) : t.y;
  let m = g - l - f;
  m < o.top && (m = g + f), m = oe(m, 0, u);
  const _ = K(Math.round(d)), p = K(Math.round(m));
  r.style.transform = `translate(${_}, ${p})`;
}
function vt(e) {
  const { tooltip: t, focusLine: n, focusCircle: r } = e;
  t && (t.style.opacity = "0", t.style.visibility = "hidden"), n && (n.style.opacity = "0"), r && (r.style.opacity = "0");
}
function Co(e, t) {
  if (t.handlersAttached || !t.overlay)
    return;
  const n = (i) => {
    if (t.points.length === 0 || !t.svg) {
      vt(t);
      return;
    }
    const o = t.svg.getBoundingClientRect(), a = i.clientX - o.left, s = i.clientY - o.top;
    let c = t.points[0], l = Math.abs(a - c.x);
    for (let d = 1; d < t.points.length; d += 1) {
      const u = t.points[d], f = Math.abs(a - u.x);
      f < l && (l = f, c = u);
    }
    t.focusCircle && (t.focusCircle.setAttribute("cx", c.x.toFixed(2)), t.focusCircle.setAttribute("cy", c.y.toFixed(2)), t.focusCircle.style.opacity = "1"), t.focusLine && (t.focusLine.setAttribute("x1", c.x.toFixed(2)), t.focusLine.setAttribute("x2", c.x.toFixed(2)), t.focusLine.setAttribute("y1", t.margin.top.toFixed(2)), t.focusLine.setAttribute(
      "y2",
      (t.height - t.margin.bottom).toFixed(2)
    ), t.focusLine.style.opacity = "1"), t.tooltip && (t.tooltip.innerHTML = Do(t, c), Ro(t, c, s));
  }, r = () => {
    vt(t);
  };
  t.overlay.addEventListener("pointermove", n), t.overlay.addEventListener("pointerenter", n), t.overlay.addEventListener("pointerleave", r), t.handlersAttached = !0, t.handlePointerMove = n, t.handlePointerLeave = r, e.addEventListener("pointercancel", r);
}
function $o(e, t = {}) {
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
    fill: _t,
    stroke: "none"
  }), o = ie("line", {
    class: "line-chart-baseline",
    stroke: nr,
    "stroke-width": 1,
    "stroke-dasharray": rr,
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
  const u = lr(n);
  if (u.svg = r, u.areaPath = i, u.linePath = a, u.baselineLine = o, u.focusLine = s, u.focusCircle = c, u.overlay = l, u.tooltip = d, u.xAccessor = t.xAccessor ?? ir, u.yAccessor = t.yAccessor ?? or, u.xFormatter = t.xFormatter ?? ar, u.yFormatter = t.yFormatter ?? sr, u.tooltipRenderer = t.tooltipRenderer ?? cr, u.color = t.color ?? ve, u.areaColor = t.areaColor ?? _t, u.baseline = t.baseline ?? null, u.handlersAttached = !1, !u.xAxis) {
    const f = document.createElement("div");
    f.className = "line-chart-axis line-chart-axis-x", f.style.position = "absolute", f.style.left = "0", f.style.right = "0", f.style.bottom = "0", f.style.pointerEvents = "none", f.style.fontSize = cn, f.style.color = "var(--secondary-text-color)", f.style.display = "block", n.appendChild(f), u.xAxis = f;
  }
  if (!u.yAxis) {
    const f = document.createElement("div");
    f.className = "line-chart-axis line-chart-axis-y", f.style.position = "absolute", f.style.top = "0", f.style.bottom = "0", f.style.left = "0", f.style.pointerEvents = "none", f.style.fontSize = cn, f.style.color = "var(--secondary-text-color)", f.style.display = "block", n.appendChild(f), u.yAxis = f;
  }
  return ur(u, t.width, t.height, t.margin), a.setAttribute("stroke", u.color), s.setAttribute("stroke", u.color), c.setAttribute("stroke", u.color), i.setAttribute("fill", u.areaColor), fr(n, t), Co(n, u), n;
}
function fr(e, t = {}) {
  if (!e) {
    console.error("updateLineChart: container element is required");
    return;
  }
  const n = lr(e);
  if (!n.svg || !n.linePath || !n.overlay) {
    console.error("updateLineChart: chart was not initialised with renderLineChart");
    return;
  }
  t.xAccessor && (n.xAccessor = t.xAccessor), t.yAccessor && (n.yAccessor = t.yAccessor), t.xFormatter && (n.xFormatter = t.xFormatter), t.yFormatter && (n.yFormatter = t.yFormatter), t.tooltipRenderer && (n.tooltipRenderer = t.tooltipRenderer), t.color && (n.color = t.color, n.linePath.setAttribute("stroke", n.color), n.focusLine && n.focusLine.setAttribute("stroke", n.color), n.focusCircle && n.focusCircle.setAttribute("stroke", n.color)), t.areaColor && (n.areaColor = t.areaColor, n.areaPath && n.areaPath.setAttribute("fill", n.areaColor)), Object.prototype.hasOwnProperty.call(t, "baseline") && (n.baseline = t.baseline ?? null), xo(n), ur(n, t.width, t.height, t.margin);
  const { width: r, height: i, margin: o } = n;
  n.svg.setAttribute("width", String(r)), n.svg.setAttribute("height", String(i)), n.svg.setAttribute("viewBox", `0 0 ${String(r)} ${String(i)}`), n.overlay.setAttribute("x", o.left.toFixed(2)), n.overlay.setAttribute("y", o.top.toFixed(2)), n.overlay.setAttribute(
    "width",
    Math.max(r - o.left - o.right, 0).toFixed(2)
  ), n.overlay.setAttribute(
    "height",
    Math.max(i - o.top - o.bottom, 0).toFixed(2)
  ), Array.isArray(t.series) && (n.series = Array.from(t.series));
  const { points: a, range: s } = Eo(n.series, n, {
    xAccessor: n.xAccessor,
    yAccessor: n.yAccessor
  });
  if (n.points = a, n.range = s, a.length === 0) {
    n.linePath.setAttribute("d", ""), n.areaPath && n.areaPath.setAttribute("d", ""), vt(n), ut(n), lt(n);
    return;
  }
  if (a.length === 1) {
    const l = a[0], d = Math.max(
      0.5,
      Math.min(4, Math.max(n.width - n.margin.left - n.margin.right, 1) * 0.01)
    ), u = `M${l.x.toFixed(2)} ${l.y.toFixed(2)} h${d.toFixed(2)}`;
    n.linePath.setAttribute("d", u), n.areaPath && n.areaPath.setAttribute("d", ""), n.focusCircle && (n.focusCircle.setAttribute("cx", l.x.toFixed(2)), n.focusCircle.setAttribute("cy", l.y.toFixed(2)), n.focusCircle.style.opacity = "1"), n.focusLine && (n.focusLine.style.opacity = "0"), ut(n), lt(n);
    return;
  }
  const c = Fo(a);
  if (n.linePath.setAttribute("d", c), n.areaPath && s) {
    const l = n.margin.top + s.boundedHeight, d = wo(a, l);
    n.areaPath.setAttribute("d", d);
  }
  ut(n), lt(n);
}
function ut(e) {
  const { xAxis: t, yAxis: n, range: r, margin: i, height: o, yFormatter: a } = e;
  if (!t || !n)
    return;
  if (!r) {
    t.innerHTML = "", n.innerHTML = "";
    return;
  }
  const { minX: s, maxX: c, minY: l, maxY: d, boundedWidth: u, boundedHeight: f } = r, g = Number.isFinite(s) && Number.isFinite(c) && c >= s, m = Number.isFinite(l) && Number.isFinite(d) && d >= l, _ = Math.max(u, 0), p = Math.max(f, 0);
  if (t.style.left = K(i.left), t.style.width = K(_), t.style.top = K(o - i.bottom + 6), t.innerHTML = "", g && _ > 0) {
    const v = (c - s) / So, y = Math.max(2, Math.min(6, Math.round(_ / 140) || 4));
    To(e, s, c, y, v).forEach(({ positionRatio: A, label: N }) => {
      const b = document.createElement("div");
      b.className = "line-chart-axis-tick line-chart-axis-tick-x", b.style.position = "absolute", b.style.bottom = "0";
      const w = oe(A, 0, 1);
      b.style.left = K(w * _);
      let D = "-50%", E = "center";
      w <= 1e-3 ? (D = "0", E = "left", b.style.marginLeft = "2px") : w >= 0.999 && (D = "-100%", E = "right", b.style.marginRight = "2px"), b.style.transform = `translateX(${D})`, b.style.textAlign = E, b.textContent = N, t.appendChild(b);
    });
  }
  n.style.top = K(i.top), n.style.height = K(p);
  const h = Math.max(i.left - 6, 0);
  if (n.style.left = "0", n.style.width = K(Math.max(h, 0)), n.innerHTML = "", m && p > 0) {
    const v = Math.max(2, Math.min(6, Math.round(p / 60) || 4)), y = Mo(l, d, v), S = a;
    y.forEach(({ value: A, positionRatio: N }) => {
      const b = document.createElement("div");
      b.className = "line-chart-axis-tick line-chart-axis-tick-y", b.style.position = "absolute", b.style.left = "0";
      const D = (1 - oe(N, 0, 1)) * p;
      b.style.top = K(D), b.textContent = S(A, null, -1), n.appendChild(b);
    });
  }
}
function Lo(e, t, n = 4) {
  if (!Number.isFinite(e) || !Number.isFinite(t))
    return {
      niceMin: e,
      niceMax: t
    };
  const r = Math.max(2, n);
  if (t === e) {
    const l = St(Math.abs(e) || 1);
    return {
      niceMin: e - l,
      niceMax: t + l
    };
  }
  const o = (t - e) / (r - 1), a = St(o), s = Math.floor(e / a) * a, c = Math.ceil(t / a) * a;
  return s === c ? {
    niceMin: e,
    niceMax: t + a
  } : {
    niceMin: s,
    niceMax: c
  };
}
function To(e, t, n, r, i) {
  if (!Number.isFinite(t) || !Number.isFinite(n) || n < t)
    return [];
  if (!Number.isFinite(i) || i <= 0)
    return [
      {
        positionRatio: 0.5,
        label: ln(e, t, i || 0)
      }
    ];
  const o = Math.max(2, r), a = [], s = n - t;
  for (let c = 0; c < o; c += 1) {
    const l = o === 1 ? 0.5 : c / (o - 1), d = t + l * s;
    a.push({
      positionRatio: l,
      label: ln(e, d, i)
    });
  }
  return a;
}
function ln(e, t, n) {
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
function Mo(e, t, n) {
  if (!Number.isFinite(e) || !Number.isFinite(t))
    return [];
  if (t === e)
    return [
      {
        value: e,
        positionRatio: 0.5
      }
    ];
  const r = t - e, i = Math.max(2, n), o = r / (i - 1), a = St(o), s = Math.floor(e / a) * a, c = Math.ceil(t / a) * a, l = [];
  for (let d = s; d <= c + a / 2; d += a) {
    const u = (d - e) / (t - e);
    l.push({
      value: d,
      positionRatio: oe(u, 0, 1)
    });
  }
  return l.length > i + 2 ? l.filter((d, u) => u % 2 === 0) : l;
}
function St(e) {
  if (!Number.isFinite(e) || e === 0)
    return 1;
  const t = Math.floor(Math.log10(Math.abs(e))), n = Math.abs(e) / 10 ** t;
  let r;
  return n <= 1 ? r = 1 : n <= 2 ? r = 2 : n <= 5 ? r = 5 : r = 10, r * 10 ** t;
}
function ko(e) {
  return Array.isArray(e) && e.every((t) => typeof t == "string");
}
function Io(e) {
  return typeof e == "object" && e !== null;
}
function Ho(e) {
  if (!Io(e))
    return !1;
  const t = e;
  return typeof t.portfolioUuid != "string" ? !1 : ko(t.securityUuids);
}
function Uo(e) {
  return e instanceof CustomEvent ? Ho(e.detail) : !1;
}
const ft = { min: 0, max: 6 }, We = { min: 2, max: 4 }, Vo = "1Y", dr = [
  "1M",
  "6M",
  "1Y",
  "5Y",
  "ALL"
], zo = {
  "1M": 30,
  "6M": 182,
  "1Y": 365,
  "5Y": 1826,
  ALL: Number.POSITIVE_INFINITY
}, dt = {
  aggregation: "Aggregationsdaten",
  totals: "Kaufsummen",
  eur_total: "EUR-Kaufsumme"
}, le = /* @__PURE__ */ new Map(), Ue = /* @__PURE__ */ new Map(), De = /* @__PURE__ */ new Map(), gr = "pp-reader:portfolio-positions-updated", Ae = /* @__PURE__ */ new Map();
function qo(e) {
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
function Oo(e, t) {
  if (e) {
    if (t) {
      De.set(e, t);
      return;
    }
    De.delete(e);
  }
}
function Bo(e) {
  if (!e || typeof window > "u")
    return null;
  if (De.has(e)) {
    const t = De.get(e) || null;
    if (t)
      return t;
  }
  return null;
}
function pr(e) {
  return le.has(e) || le.set(e, /* @__PURE__ */ new Map()), le.get(e);
}
function mr(e) {
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
function hr(e) {
  e && De.delete(e);
}
function Wo(e, t) {
  if (!e || !t)
    return;
  const n = t.securityUuids;
  (Array.isArray(n) ? n : []).includes(e) && (mr(e), hr(e));
}
function jo(e) {
  if (!e || Ae.has(e))
    return;
  const t = (n) => {
    Uo(n) && Wo(e, n.detail);
  };
  try {
    window.addEventListener(gr, t), Ae.set(e, t);
  } catch (n) {
    console.error("ensureLiveUpdateSubscription: Registrierung fehlgeschlagen", n);
  }
}
function Ko(e) {
  if (!e || !Ae.has(e))
    return;
  const t = Ae.get(e);
  try {
    t && window.removeEventListener(gr, t);
  } catch (n) {
    console.error("removeLiveUpdateSubscription: Entfernen des Listeners fehlgeschlagen", n);
  }
  Ae.delete(e);
}
function Go(e) {
  e && (Ko(e), mr(e), hr(e));
}
function un(e, t) {
  if (!Ue.has(e)) {
    Ue.set(e, { activeRange: t });
    return;
  }
  const n = Ue.get(e);
  n && (n.activeRange = t);
}
function br(e) {
  var t;
  return ((t = Ue.get(e)) == null ? void 0 : t.activeRange) ?? Vo;
}
function Pt(e) {
  const t = Date.UTC(
    e.getUTCFullYear(),
    e.getUTCMonth(),
    e.getUTCDate()
  );
  return Math.floor(t / 864e5);
}
function ge(e) {
  const t = new Date(e.getTime());
  return t.setUTCHours(0, 0, 0, 0), t;
}
function fn(e) {
  return !(e instanceof Date) || Number.isNaN(e.getTime()) ? null : Pt(ge(e));
}
function I(e) {
  return $e(e);
}
function Yo(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t || null;
}
function je(e) {
  const t = Yo(e);
  return t ? t.toUpperCase() : null;
}
function _r(e, t = "Unbekannter Fehler") {
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
function yr(e, t) {
  const n = ge(t instanceof Date ? t : /* @__PURE__ */ new Date()), r = zo[e], i = fn(n), o = {};
  if (i != null && (o.end_date = i), Number.isFinite(r) && r > 0) {
    const a = new Date(n.getTime());
    a.setUTCDate(a.getUTCDate() - (r - 1));
    const s = fn(a);
    s != null && (o.start_date = s);
  }
  return o;
}
function vr(e) {
  if (!e)
    return null;
  if (e instanceof Date)
    return Number.isNaN(e.getTime()) ? null : new Date(e.getTime());
  if (typeof e == "number" && Number.isFinite(e)) {
    const t = Math.trunc(e);
    if (t >= 1e6 && t <= 99999999) {
      const n = Math.floor(t / 1e4), r = Math.floor(t % 1e4 / 100), i = t % 100, o = new Date(Date.UTC(n, r - 1, i));
      return Number.isNaN(o.getTime()) ? null : o;
    }
    if (t >= 0 && t <= 1e5) {
      const n = new Date(t * 864e5);
      return Number.isNaN(n.getTime()) ? null : ge(n);
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
          return ge(r);
      }
    }
    if (/^\d{8}$/.test(t)) {
      const n = Number.parseInt(t.slice(0, 4), 10), r = Number.parseInt(t.slice(4, 6), 10) - 1, i = Number.parseInt(t.slice(6, 8), 10);
      if (Number.isFinite(n) && Number.isFinite(r) && Number.isFinite(i)) {
        const o = new Date(Date.UTC(n, r, i));
        if (!Number.isNaN(o.getTime()))
          return o;
      }
    }
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
function Sr(e) {
  return Array.isArray(e) ? e.map((t) => {
    let r = I(t.close);
    if (r == null) {
      const o = I(t.close_raw);
      o != null && (r = o / 1e8);
    }
    return r == null ? null : {
      date: vr(t.date) ?? t.date,
      close: r
    };
  }).filter((t) => !!t) : [];
}
function zt(e) {
  var r;
  const t = I(e == null ? void 0 : e.last_price_native) ?? I((r = e == null ? void 0 : e.last_price) == null ? void 0 : r.native) ?? null;
  if (x(t))
    return t;
  if (je(e == null ? void 0 : e.currency_code) === "EUR") {
    const i = I(e == null ? void 0 : e.last_price_eur);
    if (x(i))
      return i;
  }
  return null;
}
function Xo(e) {
  if (!e)
    return null;
  const n = e.last_price_fetched_at, r = Ke(n);
  if (r != null)
    return r;
  const i = e.last_price, o = i == null ? void 0 : i.fetched_at;
  return Ke(o) ?? null;
}
function At(e, t) {
  let n = [];
  Array.isArray(e) && (n = e.map((l) => ({
    ...l
  })));
  const r = n.slice(), i = zt(t);
  if (!x(i))
    return r;
  const o = Xo(t) ?? Date.now(), a = new Date(o);
  if (Number.isNaN(a.getTime()))
    return r;
  const s = Pt(ge(a));
  let c = null;
  for (let l = r.length - 1; l >= 0; l -= 1) {
    const d = r[l], u = vr(d.date);
    if (!u)
      continue;
    const f = Pt(ge(u));
    if (c == null && (c = f), f === s)
      return d.close !== i && (r[l] = { ...d, close: i }), r;
    if (f < s)
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
function dn(e) {
  return typeof e == "number" && Number.isFinite(e) && e > 0;
}
function Ve(e, t, n) {
  if (!x(e) || !x(t))
    return !1;
  const r = Math.abs(e - t), i = Math.max(Math.abs(e), Math.abs(t), 1);
  return r <= i * 1e-4;
}
function Zo(e, t) {
  return !x(t) || t === 0 || !x(e) ? null : fi((e - t) / t * 100);
}
function Pr(e, t) {
  if (e.length === 0)
    return { priceChange: null, priceChangePct: null };
  const n = e[0], r = I(n.close);
  if (!x(r) || r === 0)
    return { priceChange: null, priceChangePct: null };
  const i = e[e.length - 1], o = I(i.close), a = I(t) ?? o;
  if (!x(a))
    return { priceChange: null, priceChangePct: null };
  const s = a - r, c = Object.is(s, -0) ? 0 : s, l = Zo(a, r);
  return { priceChange: c, priceChangePct: l };
}
function qt(e, t) {
  if (!x(e) || e === 0)
    return "neutral";
  const n = 0.5 / Math.pow(10, t);
  return Math.abs(e) < n ? "neutral" : e > 0 ? "positive" : "negative";
}
function Jo(e, t) {
  if (!x(e))
    return '<span class="value neutral">—</span>';
  const n = ue(e);
  if (n === "—")
    return '<span class="value neutral">—</span>';
  const r = qt(e, We.max), i = t ? `&nbsp;${t}` : "";
  return `<span class="value ${r}">${n}${i}</span>`;
}
function Qo(e) {
  return x(e) ? `<span class="value ${qt(e, 2)} value--percentage">${Q(e)}&nbsp;%</span>` : '<span class="value neutral">—</span>';
}
function Ar(e, t, n, r) {
  const i = e, o = i.length > 0 ? i : "Zeitraum";
  return `
    <div class="security-info-bar" data-range="${i}">
      <div class="security-info-item">
        <span class="label">Preisänderung (${o})</span>
        <div class="value-row">
          ${Jo(t, r)}
          ${Qo(n)}
        </div>
      </div>
    </div>
  `;
}
function ea(e) {
  return `
    <div class="security-range-selector" role="group" aria-label="Zeitraum">
      ${dr.map((n) => `
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
function Nr(e, t = { status: "empty" }) {
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
      const r = _r(
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
function ta(e) {
  const t = I(e);
  if (t == null)
    return "—";
  const n = Math.abs(t % 1) > 0, r = n ? 2 : ft.min, i = n ? ft.max : ft.min;
  return t.toLocaleString("de-DE", {
    minimumFractionDigits: r,
    maximumFractionDigits: i
  });
}
function ue(e) {
  const t = I(e);
  return t == null ? "—" : t.toLocaleString("de-DE", {
    minimumFractionDigits: We.min,
    maximumFractionDigits: We.max
  });
}
function na(e, t) {
  const n = ue(e), r = `&nbsp;${t}`;
  return `<span class="${qt(e, We.max)}">${n}${r}</span>`;
}
function ra(e) {
  return e == null ? "" : (typeof e == "string" ? e : String(e)).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function ia(e, t, n) {
  const r = Te(e == null ? void 0 : e.average_cost), i = (r == null ? void 0 : r.account) ?? (x(t) ? t : I(t));
  if (!x(i))
    return null;
  const o = (e == null ? void 0 : e.account_currency_code) ?? (e == null ? void 0 : e.account_currency);
  if (typeof o == "string" && o.trim())
    return o.trim().toUpperCase();
  const a = je(e == null ? void 0 : e.currency_code) ?? "", s = (r == null ? void 0 : r.security) ?? (r == null ? void 0 : r.native) ?? (x(n) ? n : I(n)), c = kn(e == null ? void 0 : e.aggregation);
  if (a && x(s) && Ve(i, s))
    return a;
  const l = I(c == null ? void 0 : c.purchase_total_security) ?? I(e == null ? void 0 : e.purchase_total_security), d = I(c == null ? void 0 : c.purchase_total_account) ?? I(e == null ? void 0 : e.purchase_total_account);
  let u = null;
  if (x(l) && l !== 0 && x(d) && (u = d / l), (r == null ? void 0 : r.source) === "eur_total")
    return "EUR";
  const g = r == null ? void 0 : r.eur;
  if (x(g) && Ve(i, g))
    return "EUR";
  const m = I(e == null ? void 0 : e.purchase_value_eur);
  return x(m) ? "EUR" : u != null && Ve(u, 1) ? a || null : a === "EUR" ? "EUR" : a || "EUR";
}
function gn(e) {
  return typeof e != "number" || !Number.isFinite(e) || e <= 0 ? null : e.toLocaleString("de-DE", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
  });
}
function oa(e) {
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
function aa(e) {
  if (e == null || !Number.isFinite(e))
    return null;
  const t = new Date(e);
  return Number.isNaN(t.getTime()) ? null : t.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}
function sa(e, t) {
  if (!e)
    return null;
  const n = je(e.currency_code) ?? "", r = je(t) ?? "";
  if (!n || !r || n === r)
    return null;
  const i = Te(e.average_cost);
  if (!i)
    return null;
  const o = i.native ?? i.security ?? null, a = i.account ?? i.eur ?? null;
  if (!dn(o) || !dn(a))
    return null;
  const s = a / o;
  if (!Number.isFinite(s) || s <= 0)
    return null;
  const c = gn(s);
  if (!c)
    return null;
  let l = null;
  if (s > 0) {
    const h = 1 / s;
    Number.isFinite(h) && h > 0 && (l = gn(h));
  }
  const d = oa(e), u = aa(d), f = [`FX-Kurs (Kauf): 1 ${n} = ${c} ${r}`];
  l && f.push(`1 ${r} = ${l} ${n}`);
  const g = [], m = i.source, _ = m in dt ? dt[m] : dt.aggregation;
  if (g.push(`Quelle: ${_}`), x(i.coverage_ratio)) {
    const h = Math.min(Math.max(i.coverage_ratio * 100, 0), 100);
    g.push(
      `Abdeckung: ${h.toLocaleString("de-DE", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      })}%`
    );
  }
  g.length && f.push(...g);
  const p = u ?? "Datum unbekannt";
  return `${f.join(" · ")} (Stand: ${p})`;
}
function pn(e) {
  if (!e)
    return null;
  const t = Te(e.average_cost), n = (t == null ? void 0 : t.native) ?? (t == null ? void 0 : t.security) ?? null;
  return x(n) ? n : null;
}
function mn(e) {
  var W;
  if (!e)
    return '<div class="meta-error">Keine Snapshot-Daten verfügbar.</div>';
  const t = e.currency_code || "EUR", n = e.total_holdings_precise ?? e.total_holdings, r = ta(n), i = e.last_price_native ?? ((W = e.last_price) == null ? void 0 : W.native) ?? e.last_price_eur, o = ue(i), a = o === "—" ? null : `${o}${`&nbsp;${t}`}`, s = I(e.market_value_eur) ?? I(e.current_value_eur) ?? null, c = Te(e.average_cost), l = (c == null ? void 0 : c.native) ?? (c == null ? void 0 : c.security) ?? null, d = (c == null ? void 0 : c.eur) ?? null, f = (c == null ? void 0 : c.account) ?? null ?? d, g = ae(e.performance), m = (g == null ? void 0 : g.day_change) ?? null, _ = (m == null ? void 0 : m.price_change_native) ?? null, p = (m == null ? void 0 : m.price_change_eur) ?? null, h = x(_) ? _ : p, v = x(_) ? t : "EUR", y = (O, z = "") => {
    const B = ["value"];
    return z && B.push(...z.split(" ").filter(Boolean)), `<span class="${B.join(" ")}">${O}</span>`;
  }, S = (O = "") => {
    const z = ["value--missing"];
    return O && z.push(O), y("—", z.join(" "));
  }, A = (O, z = "") => {
    if (!x(O))
      return S(z);
    const B = ["value--gain"];
    return z && B.push(z), y(Kr(O), B.join(" "));
  }, N = (O, z = "") => {
    if (!x(O))
      return S(z);
    const B = ["value--gain-percentage"];
    return z && B.push(z), y(Gr(O), B.join(" "));
  }, b = a ? y(a, "value--price") : S("value--price"), w = r === "—" ? S("value--holdings") : y(r, "value--holdings"), D = x(s) ? y(`${Q(s)}&nbsp;€`, "value--market-value") : S("value--market-value"), E = x(h) ? y(
    na(h, v),
    "value--gain value--absolute"
  ) : S("value--absolute"), R = N(
    m == null ? void 0 : m.change_pct,
    "value--percentage"
  ), C = A(
    g == null ? void 0 : g.total_change_eur,
    "value--absolute"
  ), $ = N(
    g == null ? void 0 : g.total_change_pct,
    "value--percentage"
  ), P = ia(
    e,
    f,
    l
  ), F = sa(
    e,
    P
  ), L = F ? ` title="${ra(F)}"` : "", U = [];
  return x(l) ? U.push(
    y(
      `${ue(l)}${`&nbsp;${t}`}`,
      "value--average value--average-native"
    )
  ) : U.push(
    S("value--average value--average-native")
  ), x(f) && (!x(l) || !P || !t || P !== t || !Ve(f, l)) && x(f) && U.push(
    y(
      `${ue(f)}${P ? `&nbsp;${P}` : ""}`,
      "value--average value--average-eur"
    )
  ), `
    <div class="security-meta-grid security-meta-grid--expanded">
      <div class="security-meta-item security-meta-item--price">
        <span class="label">Letzter Preis</span>
        <div class="value-group">${b}</div>
      </div>
      <div class="security-meta-item security-meta-item--average">
        <span class="label">Durchschnittlicher Kaufpreis</span>
        <div class="value-group"${L}>
          ${U.join("")}
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
          ${C}
          ${$}
        </div>
      </div>
      <div class="security-meta-item security-meta-item--holdings">
        <span class="label">Bestand</span>
        <div class="value-group">${w}</div>
      </div>
      <div class="security-meta-item security-meta-item--market-value">
        <span class="label">Marktwert (EUR)</span>
        <div class="value-group">${D}</div>
      </div>
    </div>
  `;
}
function wr(e) {
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
function ca(e, t, {
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
const hn = /* @__PURE__ */ new WeakMap();
function la(e, t, n = {}) {
  if (t.length === 0)
    return;
  const r = ca(e, t, n);
  let i = hn.get(e) ?? null;
  if (!i || !e.contains(i)) {
    e.innerHTML = "", i = $o(e, r), i && hn.set(e, i);
    return;
  }
  fr(i, r);
}
function bn(e, t) {
  e && (e.dataset.activeRange = t, e.querySelectorAll(".security-range-button").forEach((n) => {
    const i = n.dataset.range === t;
    n.classList.toggle("active", i), n.setAttribute("aria-pressed", i ? "true" : "false"), n.disabled = !1, n.classList.remove("loading");
  }));
}
function ua(e, t, n, r, i) {
  const o = e.querySelector(".security-info-bar");
  if (!o || !o.parentElement)
    return;
  const a = document.createElement("div");
  a.innerHTML = Ar(t, n, r, i).trim();
  const s = a.firstElementChild;
  s && o.parentElement.replaceChild(s, o);
}
function _n(e, t, n, r, i = {}) {
  const o = e.querySelector(".security-detail-placeholder");
  if (o && (o.innerHTML = `
    <h2>Historie</h2>
    ${Nr(t, n)}
  `, n.status === "loaded" && Array.isArray(r) && r.length)) {
    const a = o.querySelector(".history-chart");
    a && requestAnimationFrame(() => {
      la(a, r, i);
    });
  }
}
function fa(e) {
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
    const d = pr(i), u = pn(o);
    Array.isArray(s) && c.status !== "error" && d.set(a, s), jo(i), un(i, a), bn(l, a);
    const g = At(
      s,
      o
    );
    let m = c;
    m.status !== "error" && (m = g.length ? { status: "loaded" } : { status: "empty" }), _n(
      t,
      a,
      m,
      g,
      {
        currency: o == null ? void 0 : o.currency_code,
        baseline: u
      }
    );
    const _ = async (p) => {
      if (p === br(i))
        return;
      const h = l.querySelector(
        `.security-range-button[data-range="${p}"]`
      );
      h && (h.disabled = !0, h.classList.add("loading"));
      let v = d.get(p) ?? null, y = null, S = [];
      if (v)
        y = v.length ? { status: "loaded" } : { status: "empty" };
      else
        try {
          const D = yr(p), E = await $n(
            n,
            r,
            i,
            D
          );
          v = Sr(E.prices), d.set(p, v), y = v.length ? { status: "loaded" } : { status: "empty" };
        } catch (D) {
          console.error("Range-Wechsel: Historie konnte nicht geladen werden", D), v = [], y = {
            status: "error",
            message: wr(D) || "Die historischen Daten konnten aufgrund eines Fehlers nicht geladen werden."
          };
        }
      S = At(v, o), y.status !== "error" && (y = S.length ? { status: "loaded" } : { status: "empty" });
      const A = zt(o), { priceChange: N, priceChangePct: b } = Pr(
        S,
        A
      );
      un(i, p), bn(l, p), ua(
        t,
        p,
        N,
        b,
        o == null ? void 0 : o.currency_code
      );
      const w = pn(o);
      _n(
        t,
        p,
        y,
        S,
        {
          currency: o == null ? void 0 : o.currency_code,
          baseline: w
        }
      );
    };
    l.addEventListener("click", (p) => {
      var y;
      const h = (y = p.target) == null ? void 0 : y.closest(".security-range-button");
      if (!h || h.disabled)
        return;
      const { range: v } = h.dataset;
      !v || !dr.includes(v) || _(v);
    });
  }, 0);
}
async function da(e, t, n, r) {
  if (!r)
    return console.error("renderSecurityDetail: securityUuid fehlt"), '<div class="card"><h2>Fehler</h2><p>Kein Wertpapier angegeben.</p></div>';
  const i = Bo(r);
  let o = null, a = null;
  try {
    const N = await ii(
      t,
      n,
      r
    ), b = N.snapshot;
    o = b && typeof b == "object" ? b : N;
  } catch (N) {
    console.error("renderSecurityDetail: Snapshot konnte nicht geladen werden", N), a = _r(N);
  }
  const s = o || i, c = !!(i && !o), l = ((s == null ? void 0 : s.source) ?? "") === "cache";
  r && Oo(r, s ?? null);
  const d = s && (c || l) ? qo({ fallbackUsed: c, flaggedAsCache: l }) : "", u = (s == null ? void 0 : s.name) || "Wertpapierdetails";
  if (a)
    return `
      ${pt(
      u,
      mn(s)
    ).outerHTML}
      ${d}
      <div class="card error-card">
        <h2>Fehler beim Laden</h2>
        <p>${a}</p>
      </div>
    `;
  const f = br(r), g = pr(r);
  let m = g.has(f) ? g.get(f) ?? null : null, _ = { status: "empty" };
  if (Array.isArray(m))
    _ = m.length ? { status: "loaded" } : { status: "empty" };
  else {
    m = [];
    try {
      const N = yr(f), b = await $n(
        t,
        n,
        r,
        N
      );
      m = Sr(b.prices), g.set(f, m), _ = m.length ? { status: "loaded" } : { status: "empty" };
    } catch (N) {
      console.error(
        "renderSecurityDetail: Historie konnte nicht geladen werden",
        N
      ), _ = {
        status: "error",
        message: wr(N) || "Die historischen Daten konnten aufgrund eines Fehlers nicht geladen werden."
      };
    }
  }
  const p = At(
    m,
    s
  );
  _.status !== "error" && (_ = p.length ? { status: "loaded" } : { status: "empty" });
  const h = pt(
    u,
    mn(s)
  ), v = zt(s), { priceChange: y, priceChangePct: S } = Pr(
    p,
    v
  ), A = Ar(
    f,
    y,
    S,
    s == null ? void 0 : s.currency_code
  );
  return fa({
    root: e,
    hass: t,
    panelConfig: n,
    securityUuid: r,
    snapshot: s,
    initialRange: f,
    initialHistory: m,
    initialHistoryState: _
  }), `
    ${h.outerHTML}
    ${d}
    ${A}
    ${ea(f)}
    <div class="card security-detail-placeholder">
      <h2>Historie</h2>
      ${Nr(f, _)}
    </div>
  `;
}
function ga(e) {
  const { setSecurityDetailTabFactory: t } = e;
  if (typeof t != "function") {
    console.error("registerSecurityDetailTab: Ungültige Factory-Funktion übergeben");
    return;
  }
  t((n) => ({
    title: "Wertpapier",
    render: (r, i, o) => da(r, i, o, n),
    cleanup: () => {
      Go(n);
    }
  }));
}
const pa = jr, Nt = "pp-reader-sticky-anchor", Ge = "overview", wt = "security:", ma = [
  { key: Ge, title: "Dashboard", render: tr }
], pe = /* @__PURE__ */ new Map(), Re = [], Ye = /* @__PURE__ */ new Map();
let Ft = null, gt = !1, fe = null, M = 0, _e = null;
function Xe(e) {
  return typeof e == "object" && e !== null;
}
function Fr(e) {
  return typeof e == "object" && e !== null && typeof e.then == "function";
}
function ha(e) {
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
function ba(e) {
  return e === "accounts" || e === "last_file_update" || e === "portfolio_values" || e === "portfolio_positions";
}
function yn(e) {
  const t = e.portfolio_uuid;
  if (typeof t == "string" && t)
    return t;
  const n = e.portfolioUuid;
  return typeof n == "string" && n ? n : null;
}
function _a(e) {
  if (!e)
    return null;
  if (Array.isArray(e)) {
    for (const t of e)
      if (Xe(t)) {
        const n = yn(t);
        if (n)
          return n;
      }
    return null;
  }
  return Xe(e) ? yn(e) : null;
}
function ya(e, t) {
  switch (e) {
    case "accounts":
      return {
        type: e,
        data: Array.isArray(t) ? t : null
      };
    case "last_file_update":
      return typeof t == "string" ? { type: e, data: t } : Xe(t) ? { type: e, data: t } : { type: e, data: null };
    case "portfolio_values":
      return Array.isArray(t) ? { type: e, data: t } : { type: e, data: null };
    case "portfolio_positions":
      return Array.isArray(t) ? { type: e, data: t } : Xe(t) ? { type: e, data: t } : { type: e, data: null };
    default:
      return null;
  }
}
function Ot(e) {
  return typeof e != "string" || !e.startsWith(wt) ? null : e.slice(wt.length) || null;
}
function va() {
  if (!fe)
    return !1;
  const e = Cr(fe);
  return e || (fe = null), e;
}
function X() {
  const e = Re.map((t) => pe.get(t)).filter((t) => !!t);
  return [...ma, ...e];
}
function Sa(e) {
  const t = X();
  return e < 0 || e >= t.length ? null : t[e];
}
function xr(e) {
  if (!e)
    return null;
  const t = e, n = t.ppreader ?? t.pp_reader;
  return n || (Object.values(t).find((i) => !i || typeof i != "object" ? !1 : i.webcomponent_name === "pp-reader-panel") ?? null);
}
function Er() {
  try {
    const e = et();
    e && typeof e.rememberScrollPosition == "function" && e.rememberScrollPosition();
  } catch (e) {
    console.warn("rememberCurrentPageScroll: konnte Scroll-Position nicht sichern", e);
  }
}
function vn(e) {
  const t = X();
  return !t.length || e < 0 ? 0 : e >= t.length ? t.length - 1 : e;
}
async function Pa(e, t, n, r) {
  const i = X(), o = vn(e);
  if (o === M) {
    e > M && va();
    return;
  }
  Er();
  const a = M >= 0 && M < i.length ? i[M] : null, s = a ? Ot(a.key) : null;
  let c = o;
  if (s) {
    const l = o >= 0 && o < i.length ? i[o] : null;
    if (l && l.key === Ge && xa(s, { suppressRender: !0 })) {
      const f = X().findIndex((g) => g.key === Ge);
      c = f >= 0 ? f : 0;
    }
  }
  if (!gt) {
    gt = !0;
    try {
      M = vn(c);
      const l = M;
      await $r(t, n, r), Fa(l);
    } catch (l) {
      console.error("navigateToPage: Fehler beim Rendern des Tabs", l);
    } finally {
      gt = !1;
    }
  }
}
function Ze(e, t, n, r) {
  Pa(M + e, t, n, r);
}
function Aa(e, t) {
  if (!e || !t || typeof t.render != "function") {
    console.error("registerDetailTab: Ungültiger Tab-Descriptor", e, t);
    return;
  }
  const n = Ot(e);
  if (n) {
    const i = Ye.get(n);
    i && i !== e && Dr(i);
  }
  const r = {
    ...t,
    key: e
  };
  pe.set(e, r), n && Ye.set(n, e), Re.includes(e) || Re.push(e);
}
function Dr(e) {
  if (!e)
    return;
  const t = pe.get(e);
  if (t && typeof t.cleanup == "function")
    try {
      const i = t.cleanup({ key: e });
      Fr(i) && i.catch((o) => {
        console.error(
          "unregisterDetailTab: Fehler beim asynchronen cleanup",
          o
        );
      });
    } catch (i) {
      console.error("unregisterDetailTab: Fehler beim Ausführen von cleanup", i);
    }
  pe.delete(e);
  const n = Re.indexOf(e);
  n >= 0 && Re.splice(n, 1);
  const r = Ot(e);
  r && Ye.get(r) === e && Ye.delete(r);
}
function Na(e) {
  return pe.has(e);
}
function Sn(e) {
  return pe.get(e) ?? null;
}
function wa(e) {
  if (e != null && typeof e != "function") {
    console.error("setSecurityDetailTabFactory: Erwartet Funktion oder null", e);
    return;
  }
  Ft = e ?? null;
}
function Rr(e) {
  return `${wt}${e}`;
}
function et() {
  var t;
  for (const n of si())
    if (n.isConnected)
      return n;
  const e = /* @__PURE__ */ new Set();
  for (const n of ci())
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
function xt() {
  const e = et();
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
const Va = {
  findDashboardElement: et
};
function Fa(e) {
  const t = et();
  if (t && typeof t.handleExternalRender == "function")
    try {
      t.handleExternalRender(e);
    } catch (n) {
      console.warn("notifyExternalRender: Fehler beim Synchronisieren des Dashboards", n);
    }
}
function Cr(e) {
  if (!e)
    return console.error("openSecurityDetail: Ungültige securityUuid", e), !1;
  const t = Rr(e);
  let n = Sn(t);
  if (!n && typeof Ft == "function")
    try {
      const o = Ft(e);
      o && typeof o.render == "function" ? (Aa(t, o), n = Sn(t)) : console.error("openSecurityDetail: Factory lieferte ungültigen Descriptor", o);
    } catch (o) {
      console.error("openSecurityDetail: Fehler beim Erzeugen des Tab-Descriptors", o);
    }
  if (!n)
    return console.warn(`openSecurityDetail: Kein Detail-Tab für ${e} verfügbar`), !1;
  Er();
  let i = X().findIndex((o) => o.key === t);
  return i === -1 && (i = X().findIndex((a) => a.key === t), i === -1) ? (console.error("openSecurityDetail: Tab nach Registrierung nicht auffindbar"), !1) : (M = i, fe = null, xt(), !0);
}
function xa(e, t = {}) {
  if (!e)
    return console.error("closeSecurityDetail: Ungültige securityUuid", e), !1;
  const { suppressRender: n = !1 } = t, r = Rr(e);
  if (!Na(r))
    return !1;
  const o = X().findIndex((c) => c.key === r), a = o === M;
  Dr(r);
  const s = X();
  if (!s.length)
    return M = 0, n || xt(), !0;
  if (fe = e, a) {
    const c = s.findIndex((l) => l.key === Ge);
    c >= 0 ? M = c : M = Math.min(Math.max(o - 1, 0), s.length - 1);
  } else M >= s.length && (M = Math.max(0, s.length - 1));
  return n || xt(), !0;
}
async function $r(e, t, n) {
  let r = n;
  r || (r = xr(t ? t.panels : null));
  const i = X();
  M >= i.length && (M = Math.max(0, i.length - 1));
  const o = Sa(M);
  if (!o) {
    console.error("renderTab: Kein gültiger Tab oder keine render-Methode gefunden!");
    return;
  }
  let a;
  try {
    a = await o.render(e, t, r);
  } catch (d) {
    console.error("renderTab: Fehler beim Rendern des Tabs:", d), e.innerHTML = `<div class="card"><h2>Fehler</h2><pre>${ha(d)}</pre></div>`;
    return;
  }
  e.innerHTML = a ?? "", o.render === tr && Vt(e);
  const c = await new Promise((d) => {
    const u = window.setInterval(() => {
      const f = e.querySelector(".header-card");
      f && (clearInterval(u), d(f));
    }, 50);
  });
  let l = e.querySelector(`#${Nt}`);
  if (!l) {
    l = document.createElement("div"), l.id = Nt;
    const d = c.parentNode;
    d && "insertBefore" in d && d.insertBefore(l, c);
  }
  Ra(e, t, n), Da(e, t, n), Ea(e);
}
function Ea(e) {
  const t = e.querySelector(".header-card"), n = e.querySelector(`#${Nt}`);
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
function Da(e, t, n) {
  const r = e.querySelector(".header-card");
  if (!r) {
    console.error("Header-Card nicht gefunden!");
    return;
  }
  pa(
    r,
    () => {
      Ze(1, e, t, n);
    },
    () => {
      Ze(-1, e, t, n);
    }
  );
}
function Ra(e, t, n) {
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
    Ze(-1, e, t, n);
  }), o.addEventListener("click", () => {
    Ze(1, e, t, n);
  }), Ca(r);
}
function Ca(e) {
  const t = e.querySelector("#nav-left"), n = e.querySelector("#nav-right");
  if (t && (M === 0 ? (t.disabled = !0, t.classList.add("disabled")) : (t.disabled = !1, t.classList.remove("disabled"))), n) {
    const r = X(), o = !(M === r.length - 1) || !!fe;
    n.disabled = !o, n.classList.toggle("disabled", !o);
  }
}
class $a extends HTMLElement {
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
    this._panel || (this._panel = xr(this._hass.panels ?? null));
    const n = Yt(this._hass, this._panel);
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
    const r = Yt(this._hass, this._panel);
    if (!r)
      return;
    const i = n.data;
    if (!ba(i.data_type) || i.entry_id && i.entry_id !== r)
      return;
    const o = ya(i.data_type, i.data);
    o && (this._queueUpdate(o.type, o.data), this._doRender(o.type, o.data));
  }
  _doRender(n, r) {
    switch (n) {
      case "accounts":
        Ji(
          r,
          this._root
        );
        break;
      case "last_file_update":
        so(
          r,
          this._root
        );
        break;
      case "portfolio_values":
        to(
          r,
          this._root
        );
        break;
      case "portfolio_positions":
        io(
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
    n === "portfolio_positions" && (o.portfolioUuid = _a(
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
  rememberScrollPosition(n = M) {
    const r = Number.isInteger(n) ? n : M;
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
    const n = M;
    if (!this._hasNewData && this._panel === this._lastPanel && this._narrow === this._lastNarrow && this._route === this._lastRoute && this._lastPage === n)
      return;
    this._lastPage != null && (this._scrollPositions[this._lastPage] = this._root.scrollTop);
    const r = $r(this._root, this._hass, this._panel);
    if (Fr(r)) {
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
customElements.get("pp-reader-dashboard") || customElements.define("pp-reader-dashboard", $a);
console.log("PPReader dashboard module v20250914b geladen");
ga({
  setSecurityDetailTabFactory: wa
});
export {
  Va as __TEST_ONLY_DASHBOARD,
  Ua as __TEST_ONLY__,
  xa as closeSecurityDetail,
  Ut as flushPendingPositions,
  Sn as getDetailTabDescriptor,
  io as handlePortfolioPositionsUpdate,
  Na as hasDetailTab,
  Cr as openSecurityDetail,
  Ha as reapplyPositionsSort,
  Ta as registerDashboardElement,
  Aa as registerDetailTab,
  ka as registerPanelHost,
  wa as setSecurityDetailTabFactory,
  Ma as unregisterDashboardElement,
  Dr as unregisterDetailTab,
  Ia as unregisterPanelHost,
  er as updatePortfolioFooterFromDom
};
//# sourceMappingURL=dashboard.DyBTCr6b.js.map
