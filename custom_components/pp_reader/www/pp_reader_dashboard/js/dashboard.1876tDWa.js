var bi = Object.defineProperty;
var vi = (e, t, n) => t in e ? bi(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : e[t] = n;
var K = (e, t, n) => vi(e, typeof t != "symbol" ? t + "" : t, n);
function ln(e, t) {
  try {
    t();
  } catch (n) {
    console.warn(`addSwipeEvents: ${e} handler threw`, n);
  }
}
function Si(e, t, n) {
  let r = null;
  const i = (l) => {
    l < -50 ? ln("left", t) : l > 50 && ln("right", n);
  }, o = (l) => {
    l.touches.length === 1 && (r = l.touches[0].clientX);
  }, s = (l) => {
    if (r === null)
      return;
    if (l.changedTouches.length === 0) {
      r = null;
      return;
    }
    const u = l.changedTouches[0];
    i(u.clientX - r), r = null;
  }, a = (l) => {
    r = l.clientX;
  }, c = (l) => {
    r !== null && (i(l.clientX - r), r = null);
  };
  e.addEventListener("touchstart", o, { passive: !0 }), e.addEventListener("touchend", s, { passive: !0 }), e.addEventListener("mousedown", a), e.addEventListener("mouseup", c);
}
const Ot = (e, t) => {
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
      const l = c.replace(/\s+/g, "").replace(/[^0-9,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."), u = Number.parseFloat(l);
      return Number.isNaN(u) ? Number.NaN : u;
    }
    return Number.NaN;
  }, s = (c, l = 2, u = 2) => {
    const f = typeof c == "number" ? c : o(c);
    return Number.isFinite(f) ? f.toLocaleString("de-DE", {
      minimumFractionDigits: l,
      maximumFractionDigits: u
    }) : "";
  }, a = (c = "") => {
    const l = c || "Kein Wert verfügbar";
    return `<span class="missing-value" role="note" aria-label="${l}" title="${l}">—</span>`;
  };
  if (["gain_abs", "gain_pct", "day_change_abs", "day_change_pct"].includes(e)) {
    if (t == null && n) {
      const d = n.performance;
      if (typeof d == "object" && d !== null)
        if (e.startsWith("day_change")) {
          const g = d.day_change;
          if (g && typeof g == "object") {
            const p = e === "day_change_pct" ? g.change_pct : g.value_change_eur ?? g.price_change_eur;
            typeof p == "number" && (t = p);
          }
        } else {
          const g = d[e];
          typeof g == "number" && (t = g);
        }
    }
    const c = (n == null ? void 0 : n.fx_unavailable) === !0 ? "Wechselkurs nicht verfügbar – EUR-Wert unbekannt" : "";
    if (t == null || (r == null ? void 0 : r.hasValue) === !1)
      return a(c);
    const l = typeof t == "number" ? t : o(t);
    if (!Number.isFinite(l))
      return a(c);
    const u = e.endsWith("pct") ? "%" : "€";
    return i = s(l) + `&nbsp;${u}`, `<span class="${Ot(l, 2)}">${i}</span>`;
  } else if (e === "position_count") {
    const c = typeof t == "number" ? t : o(t);
    if (!Number.isFinite(c))
      return a();
    i = c.toLocaleString("de-DE");
  } else if (["balance", "current_value", "purchase_value"].includes(e)) {
    const c = typeof t == "number" ? t : o(t);
    if (!Number.isFinite(c))
      return n != null && n.fx_unavailable ? a("Wechselkurs nicht verfügbar – EUR-Wert unbekannt") : (r && r.hasValue === !1, a());
    i = s(c) + "&nbsp;€";
  } else if (e === "current_holdings") {
    const c = typeof t == "number" ? t : o(t);
    if (!Number.isFinite(c))
      return a();
    const l = Math.abs(c % 1) > 0;
    i = c.toLocaleString("de-DE", {
      minimumFractionDigits: l ? 2 : 0,
      maximumFractionDigits: 4
    });
  } else {
    let c = "";
    typeof t == "string" ? c = t : typeof t == "number" && Number.isFinite(t) ? c = t.toString() : typeof t == "boolean" ? c = t ? "true" : "false" : t instanceof Date && Number.isFinite(t.getTime()) && (c = t.toISOString()), i = c, i && (/<|&lt;|&gt;/.test(i) || (i.length > 60 && (i = i.slice(0, 59) + "…"), i.startsWith("Kontostand ") ? i = i.substring(11) : i.startsWith("Depotwert ") && (i = i.substring(10))));
  }
  return typeof i != "string" || i === "" ? a() : i;
}
function Pe(e, t, n = [], r = {}) {
  const { sortable: i = !1, defaultSort: o } = r, s = (o == null ? void 0 : o.key) ?? "", a = (o == null ? void 0 : o.dir) === "desc" ? "desc" : "asc", c = (h) => {
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
    i && h.key ? l += `<th${_} data-sort-key="${h.key}">${h.label}</th>` : l += `<th${_}>${h.label}</th>`;
  }), l += "</tr></thead><tbody>", e.forEach((h) => {
    l += "<tr>", t.forEach((_) => {
      const b = _.align === "right" ? ' class="align-right"' : "";
      l += `<td${b}>${H(_.key, h[_.key], h)}</td>`;
    }), l += "</tr>";
  });
  const u = {}, f = {};
  t.forEach((h) => {
    if (n.includes(h.key)) {
      const _ = e.reduce(
        (b, S) => {
          let P = S[h.key];
          if ((h.key === "gain_abs" || h.key === "gain_pct") && (typeof P != "number" || !Number.isFinite(P))) {
            const A = S.performance;
            if (typeof A == "object" && A !== null) {
              const N = A[h.key];
              typeof N == "number" && (P = N);
            }
          } else if ((h.key === "day_change_abs" || h.key === "day_change_pct") && (typeof P != "number" || !Number.isFinite(P))) {
            const A = S.performance;
            if (typeof A == "object" && A !== null) {
              const N = A.day_change;
              if (N && typeof N == "object") {
                const C = h.key === "day_change_pct" ? N.change_pct : N.value_change_eur ?? N.price_change_eur;
                typeof C == "number" && (P = C);
              }
            }
          }
          if (typeof P == "number" && Number.isFinite(P)) {
            const A = P;
            b.total += A, b.hasValue = !0;
          }
          return b;
        },
        { total: 0, hasValue: !1 }
      );
      _.hasValue ? (u[h.key] = _.total, f[h.key] = { hasValue: !0 }) : (u[h.key] = null, f[h.key] = { hasValue: !1 });
    }
  });
  const d = u.gain_abs ?? null;
  if (d != null) {
    const h = u.purchase_value ?? null;
    if (h != null && h > 0)
      u.gain_pct = d / h * 100;
    else {
      const _ = u.current_value ?? null;
      _ != null && _ !== 0 && (u.gain_pct = d / (_ - d) * 100);
    }
  }
  const g = u.day_change_abs ?? null;
  if (g != null) {
    const h = u.current_value ?? null;
    if (h != null) {
      const _ = h - g;
      _ && (u.day_change_pct = g / _ * 100, f.day_change_pct = { hasValue: !0 });
    }
  }
  const p = Number.isFinite(u.gain_pct ?? NaN) ? u.gain_pct : null;
  let m = "", y = "neutral";
  if (p != null && (m = `${ce(p)} %`, p > 0 ? y = "positive" : p < 0 && (y = "negative")), l += '<tr class="footer-row">', t.forEach((h, _) => {
    const b = h.align === "right" ? ' class="align-right"' : "";
    if (_ === 0) {
      l += `<td${b}>Summe</td>`;
      return;
    }
    if (u[h.key] != null) {
      let P = "";
      h.key === "gain_abs" && m && (P = ` data-gain-pct="${c(m)}" data-gain-sign="${c(y)}"`), l += `<td${b}${P}>${H(h.key, u[h.key], void 0, f[h.key])}</td>`;
      return;
    }
    if (h.key === "gain_pct" && u.gain_pct != null) {
      l += `<td${b}>${H("gain_pct", u.gain_pct, void 0, f[h.key])}</td>`;
      return;
    }
    const S = f[h.key] ?? { hasValue: !1 };
    l += `<td${b}>${H(h.key, null, void 0, S)}</td>`;
  }), l += "</tr>", l += "</tbody></table>", i)
    try {
      const h = document.createElement("template");
      h.innerHTML = l.trim();
      const _ = h.content.querySelector("table");
      if (_)
        return _.classList.add("sortable-table"), s && (_.dataset.defaultSort = s, _.dataset.defaultDir = a), _.outerHTML;
    } catch (h) {
      console.warn("makeTable(sortable): Injection fehlgeschlagen:", h);
    }
  return l;
}
function Ct(e, t) {
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
function ce(e, t = 2, n = 2) {
  return (Number.isNaN(e) ? 0 : e).toLocaleString("de-DE", {
    minimumFractionDigits: t,
    maximumFractionDigits: n
  });
}
function Pi(e) {
  const t = Number.isNaN(e) ? 0 : e;
  return `<span class="${Ot(t, 2)}">${ce(t)}&nbsp;€</span>`;
}
function Ai(e) {
  const t = Number.isNaN(e) ? 0 : e;
  return `<span class="${Ot(t, 2)}">${ce(t)}&nbsp;%</span>`;
}
function Un(e, t, n = "asc", r = !1) {
  if (!e)
    return [];
  const i = e.querySelector("tbody");
  if (!i)
    return [];
  const o = i.querySelector("tr.footer-row"), s = Array.from(i.querySelectorAll("tr")).filter((u) => u !== o);
  let a = -1;
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
    typeof f == "number" && (a = f);
  } else {
    const u = Array.from(e.querySelectorAll("thead th"));
    for (let f = 0; f < u.length; f++)
      if (u[f].getAttribute("data-sort-key") === t) {
        a = f;
        break;
      }
  }
  if (a < 0)
    return s;
  const c = (u) => {
    const f = u.replace(/\u00A0/g, " ").replace(/[%€]/g, "").replace(/\./g, "").replace(/,/g, ".").replace(/[^\d.-]/g, "").trim();
    if (!f) return NaN;
    const d = parseFloat(f);
    return Number.isFinite(d) ? d : NaN;
  };
  s.sort((u, f) => {
    const d = u.cells.item(a), g = f.cells.item(a), p = ((d == null ? void 0 : d.textContent) ?? "").trim(), m = ((g == null ? void 0 : g.textContent) ?? "").trim(), y = c(p), h = c(m);
    let _;
    const b = /[0-9]/.test(p) || /[0-9]/.test(m);
    return !Number.isNaN(y) && !Number.isNaN(h) && b ? _ = y - h : _ = p.localeCompare(m, "de", { sensitivity: "base" }), n === "asc" ? _ : -_;
  }), s.forEach((u) => i.appendChild(u)), o && i.appendChild(o), e.querySelectorAll("thead th.sort-active").forEach((u) => {
    u.classList.remove("sort-active", "dir-asc", "dir-desc");
  });
  const l = e.querySelector(`thead th[data-sort-key="${t}"]`);
  return l && l.classList.add("sort-active", n === "asc" ? "dir-asc" : "dir-desc"), s;
}
function le(e) {
  return typeof e == "object" && e !== null;
}
function j(e) {
  return typeof e == "string" ? e : null;
}
function Be(e) {
  return e === null ? null : j(e);
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
function un(e) {
  const t = V(e);
  if (t == null)
    return null;
  const n = Math.trunc(t);
  return Number.isFinite(n) ? n : null;
}
function Ke(e) {
  return le(e) ? { ...e } : null;
}
function zn(e) {
  return le(e) ? { ...e } : null;
}
function qn(e) {
  return typeof e == "boolean" ? e : void 0;
}
function Ni(e) {
  if (!le(e))
    return null;
  const t = j(e.name), n = j(e.currency_code), r = V(e.orig_balance);
  if (!t || !n || r == null)
    return null;
  const i = e.balance === null ? null : V(e.balance), o = {
    uuid: j(e.uuid) ?? void 0,
    name: t,
    currency_code: n,
    orig_balance: r,
    balance: i ?? null
  }, s = V(e.fx_rate);
  s != null && (o.fx_rate = s);
  const a = j(e.fx_rate_source);
  a && (o.fx_rate_source = a);
  const c = j(e.fx_rate_timestamp);
  c && (o.fx_rate_timestamp = c);
  const l = V(e.coverage_ratio);
  l != null && (o.coverage_ratio = l);
  const u = j(e.provenance);
  u && (o.provenance = u);
  const f = Be(e.metric_run_uuid);
  f !== null && (o.metric_run_uuid = f);
  const d = qn(e.fx_unavailable);
  return typeof d == "boolean" && (o.fx_unavailable = d), o;
}
function On(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = Ni(n);
    r && t.push(r);
  }
  return t;
}
function wi(e) {
  if (!le(e))
    return null;
  const t = e.aggregation, n = j(e.security_uuid), r = j(e.name), i = V(e.current_holdings), o = V(e.purchase_value_eur) ?? (le(t) ? V(t.purchase_value_eur) ?? V(t.purchase_total_account) ?? V(t.account_currency_total) : null) ?? V(e.purchase_value), s = V(e.current_value);
  if (!n || !r || i == null || o == null || s == null)
    return null;
  const a = {
    portfolio_uuid: j(e.portfolio_uuid) ?? void 0,
    security_uuid: n,
    name: r,
    ticker_symbol: j(e.ticker_symbol),
    currency_code: j(e.currency_code),
    current_holdings: i,
    purchase_value: o,
    current_value: s,
    average_cost: Ke(e.average_cost),
    performance: Ke(e.performance),
    aggregation: Ke(e.aggregation),
    data_state: zn(e.data_state)
  }, c = V(e.coverage_ratio);
  c != null && (a.coverage_ratio = c);
  const l = j(e.provenance);
  l && (a.provenance = l);
  const u = Be(e.metric_run_uuid);
  u !== null && (a.metric_run_uuid = u);
  const f = V(e.last_price_native);
  f != null && (a.last_price_native = f);
  const d = V(e.last_price_eur);
  d != null && (a.last_price_eur = d);
  const g = V(e.last_close_native);
  g != null && (a.last_close_native = g);
  const p = V(e.last_close_eur);
  return p != null && (a.last_close_eur = p), a;
}
function Wn(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = wi(n);
    r && t.push(r);
  }
  return t;
}
function Bn(e) {
  if (!le(e))
    return null;
  const t = j(e.name), n = V(e.current_value ?? e.value);
  if (!t || n == null)
    return null;
  const i = V(
    e.purchase_sum ?? e.purchase_value_eur ?? e.purchase_value ?? e.purchaseSum
  ) ?? 0, o = {
    uuid: j(e.uuid) ?? void 0,
    name: t,
    current_value: n,
    purchase_value: i,
    purchase_sum: i,
    day_change_abs: V(e.day_change_abs) ?? V(e.day_change_eur) ?? void 0,
    day_change_pct: V(e.day_change_pct) ?? void 0,
    position_count: un(e.position_count ?? e.count) ?? void 0,
    missing_value_positions: un(e.missing_value_positions) ?? void 0,
    has_current_value: qn(e.has_current_value),
    performance: Ke(e.performance),
    coverage_ratio: V(e.coverage_ratio) ?? void 0,
    provenance: j(e.provenance) ?? void 0,
    metric_run_uuid: Be(e.metric_run_uuid) ?? void 0,
    data_state: zn(e.data_state)
  };
  return Array.isArray(e.positions) && (o.positions = Wn(e.positions)), o;
}
function jn(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = Bn(n);
    r && t.push(r);
  }
  return t;
}
function Gn(e) {
  if (!le(e))
    return null;
  const t = { ...e }, n = Be(e.metric_run_uuid);
  n !== null ? t.metric_run_uuid = n : delete t.metric_run_uuid;
  const r = V(e.coverage_ratio);
  r != null ? t.coverage_ratio = r : delete t.coverage_ratio;
  const i = j(e.provenance);
  i ? t.provenance = i : delete t.provenance;
  const o = j(e.generated_at ?? e.snapshot_generated_at);
  return o ? t.generated_at = o : delete t.generated_at, t;
}
function Ei(e) {
  if (!le(e))
    return null;
  const t = { ...e }, n = Gn(e.normalized_payload);
  return n ? t.normalized_payload = n : "normalized_payload" in t && delete t.normalized_payload, t;
}
function Kn(e) {
  if (!le(e))
    return null;
  const t = j(e.generated_at);
  if (!t)
    return null;
  const n = Be(e.metric_run_uuid), r = On(e.accounts), i = jn(e.portfolios), o = Ei(e.diagnostics), s = {
    generated_at: t,
    metric_run_uuid: n,
    accounts: r,
    portfolios: i
  };
  return o && (s.diagnostics = o), s;
}
function dn(e) {
  return typeof e == "string" ? e : null;
}
function Fi(e) {
  if (typeof e == "string")
    return e;
  if (e === null)
    return null;
}
function xi(e) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
}
function fn(e, t) {
  if (typeof e == "string")
    return e;
  throw new Error(`mapPositionSnapshotToRecord: fehlendes ${t}`);
}
function _t(e, t) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  throw new Error(`mapPositionSnapshotToRecord: fehlendes ${t}`);
}
function Ci(e) {
  const t = fn(e.security_uuid, "security_uuid"), n = fn(e.name, "name"), r = _t(e.current_holdings, "current_holdings"), i = _t(e.purchase_value, "purchase_value"), o = _t(e.current_value, "current_value"), s = {
    security_uuid: t,
    name: n,
    current_holdings: r,
    purchase_value: i,
    current_value: o,
    average_cost: e.average_cost ?? null,
    performance: e.performance ?? null,
    aggregation: e.aggregation ?? null
  };
  return e.currency_code !== void 0 && (s.currency_code = e.currency_code), e.coverage_ratio != null && (s.coverage_ratio = e.coverage_ratio), e.provenance && (s.provenance = e.provenance), e.metric_run_uuid !== void 0 && (s.metric_run_uuid = e.metric_run_uuid), e.last_price_native != null && (s.last_price_native = e.last_price_native), e.last_price_eur != null && (s.last_price_eur = e.last_price_eur), e.last_close_native != null && (s.last_close_native = e.last_close_native), e.last_close_eur != null && (s.last_close_eur = e.last_close_eur), e.data_state && (s.data_state = e.data_state), e.ticker_symbol && (s.ticker_symbol = e.ticker_symbol), e.portfolio_uuid && (s.portfolio_uuid = e.portfolio_uuid), s;
}
function he(e, t) {
  var r, i, o, s, a, c, l, u;
  let n = ((r = t == null ? void 0 : t.config) == null ? void 0 : r.entry_id) ?? (t == null ? void 0 : t.entry_id) ?? ((s = (o = (i = t == null ? void 0 : t.config) == null ? void 0 : i._panel_custom) == null ? void 0 : o.config) == null ? void 0 : s.entry_id) ?? void 0;
  if (!n && (e != null && e.panels)) {
    const f = e.panels, d = f.ppreader ?? f.pp_reader ?? Object.values(f).find(
      (g) => (g == null ? void 0 : g.webcomponent_name) === "pp-reader-panel"
    );
    n = ((a = d == null ? void 0 : d.config) == null ? void 0 : a.entry_id) ?? (d == null ? void 0 : d.entry_id) ?? ((u = (l = (c = d == null ? void 0 : d.config) == null ? void 0 : c._panel_custom) == null ? void 0 : l.config) == null ? void 0 : u.entry_id) ?? void 0;
  }
  return n ?? void 0;
}
function gn(e, t) {
  return he(e, t);
}
async function Di(e, t) {
  if (!e)
    throw new Error("fetchAccountsWS: fehlendes hass");
  const n = he(e, t);
  if (!n)
    throw new Error("fetchAccountsWS: fehlendes entry_id");
  const r = await e.connection.sendMessagePromise({
    type: "pp_reader/get_accounts",
    entry_id: n
  }), i = On(r.accounts), o = Kn(r.normalized_payload);
  return {
    accounts: i,
    normalized_payload: o
  };
}
async function ki(e, t) {
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
  const i = r.last_file_update;
  return typeof i == "string" ? i : "";
}
async function Ti(e, t) {
  if (!e)
    throw new Error("fetchPortfoliosWS: fehlendes hass");
  const n = he(e, t);
  if (!n)
    throw new Error("fetchPortfoliosWS: fehlendes entry_id");
  const r = await e.connection.sendMessagePromise({
    type: "pp_reader/get_portfolio_data",
    entry_id: n
  }), i = jn(r.portfolios), o = Kn(r.normalized_payload);
  return {
    portfolios: i,
    normalized_payload: o
  };
}
async function Yn(e, t, n) {
  if (!e)
    throw new Error("fetchPortfolioPositionsWS: fehlendes hass");
  const r = he(e, t);
  if (!r)
    throw new Error("fetchPortfolioPositionsWS: fehlendes entry_id");
  if (!n)
    throw new Error("fetchPortfolioPositionsWS: fehlendes portfolio_uuid");
  const i = await e.connection.sendMessagePromise({
    type: "pp_reader/get_portfolio_positions",
    entry_id: r,
    portfolio_uuid: n
  }), s = Wn(i.positions).map(Ci), a = Gn(i.normalized_payload), c = {
    portfolio_uuid: dn(i.portfolio_uuid) ?? n,
    positions: s
  };
  typeof i.error == "string" && (c.error = i.error);
  const l = xi(i.coverage_ratio);
  l !== void 0 && (c.coverage_ratio = l);
  const u = dn(i.provenance);
  u && (c.provenance = u);
  const f = Fi(i.metric_run_uuid);
  return f !== void 0 && (c.metric_run_uuid = f), a && (c.normalized_payload = a), c;
}
async function Ri(e, t, n) {
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
async function $i(e, t) {
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
async function Qe(e, t, n, r = {}) {
  if (!e)
    throw new Error("fetchSecurityHistoryWS: fehlendes hass");
  const i = he(e, t);
  if (!i)
    throw new Error("fetchSecurityHistoryWS: fehlendes entry_id");
  if (!n)
    throw new Error("fetchSecurityHistoryWS: fehlendes securityUuid");
  const o = {
    type: "pp_reader/get_security_history",
    entry_id: i,
    security_uuid: n
  }, { startDate: s, endDate: a, start_date: c, end_date: l } = r || {}, u = s ?? c;
  u != null && (o.start_date = u);
  const f = a ?? l;
  f != null && (o.end_date = f);
  const d = await e.connection.sendMessagePromise(o);
  return Array.isArray(d.prices) || (d.prices = []), Array.isArray(d.transactions) || (d.transactions = []), d;
}
const Wt = /* @__PURE__ */ new Set(), Bt = /* @__PURE__ */ new Set(), Xn = {}, Li = [
  "renderPositionsTable",
  "applyGainPctMetadata",
  "attachSecurityDetailListener",
  "attachPortfolioPositionsSorting",
  "updatePortfolioFooter"
];
function Mi(e, t) {
  typeof t == "function" && (Xn[e] = t);
}
function vs(e) {
  e && Wt.add(e);
}
function Ss(e) {
  e && Wt.delete(e);
}
function Hi() {
  return Wt;
}
function Ps(e) {
  e && Bt.add(e);
}
function As(e) {
  e && Bt.delete(e);
}
function Ii() {
  return Bt;
}
function Vi(e) {
  for (const t of Li)
    Mi(t, e[t]);
}
function jt() {
  return Xn;
}
const Ui = 2;
function ae(e) {
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
    const o = i.lastIndexOf(","), s = i.lastIndexOf(".");
    let a = i;
    const c = o !== -1, l = s !== -1;
    if (c && (!l || o > s))
      if (l)
        a = a.replace(/\./g, "").replace(",", ".");
      else {
        const d = a.split(","), g = ((t = d[d.length - 1]) == null ? void 0 : t.length) ?? 0, p = d.slice(0, -1).join(""), m = p.replace(/[+-]/g, "").length, y = d.length > 2, h = /^[-+]?0$/.test(p);
        a = y || g === 0 || g === 3 && m > 0 && m <= 3 && !h ? a.replace(/,/g, "") : a.replace(",", ".");
      }
    else l && c && s > o ? a = a.replace(/,/g, "") : l && a.length - s - 1 === 3 && /\d{4,}/.test(a.replace(/\./g, "")) && (a = a.replace(/\./g, ""));
    if (a === "-" || a === "+")
      return null;
    const u = Number.parseFloat(a);
    if (Number.isFinite(u))
      return u;
    const f = Number.parseFloat(i.replace(",", "."));
    if (Number.isFinite(f))
      return f;
  }
  return null;
}
function gt(e, { decimals: t = Ui, fallback: n = null } = {}) {
  const r = ae(e);
  if (r == null)
    return n ?? null;
  const i = 10 ** t, o = Math.round(r * i) / i;
  return Object.is(o, -0) ? 0 : o;
}
function pn(e, t = {}) {
  return gt(e, t);
}
function zi(e, t = {}) {
  return gt(e, t);
}
const qi = /^[+-]?(?:\d+\.?\d*|\d*\.?\d+)(?:[eE][+-]?\d+)?$/, re = (e) => {
  if (typeof e == "number")
    return Number.isFinite(e) ? e : null;
  if (typeof e == "string") {
    const t = e.trim();
    if (!t || !qi.test(t))
      return null;
    const n = Number(t);
    if (Number.isFinite(n))
      return n;
  }
  return null;
}, Zn = (e) => {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t || null;
};
function Oi(e) {
  const t = e && typeof e == "object" ? e : null;
  if (!t)
    return null;
  const n = re(t.price_change_native), r = re(t.price_change_eur), i = re(t.change_pct), o = re(t.value_change_eur);
  if (n == null && r == null && i == null && o == null)
    return null;
  const s = Zn(t.source) ?? "derived", a = re(t.coverage_ratio) ?? null;
  return {
    price_change_native: n,
    price_change_eur: r,
    change_pct: i,
    value_change_eur: o ?? null,
    source: s,
    coverage_ratio: a
  };
}
function pe(e) {
  const t = e && typeof e == "object" ? e : null;
  if (!t)
    return null;
  const n = re(t.gain_abs), r = re(t.gain_pct), i = re(t.total_change_eur), o = re(t.total_change_pct);
  if (n == null || r == null || i == null || o == null)
    return null;
  const s = Zn(t.source) ?? "derived", a = re(t.coverage_ratio) ?? null, c = Oi(t.day_change);
  return {
    gain_abs: n,
    gain_pct: r,
    total_change_eur: i,
    total_change_pct: o,
    source: s,
    coverage_ratio: a,
    day_change: c
  };
}
const de = /* @__PURE__ */ new Map();
function ue(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t.length > 0 ? t : null;
}
function q(e) {
  if (e === null)
    return null;
  const t = ae(e);
  return Number.isFinite(t ?? NaN) ? t : null;
}
function Wi(e) {
  if (!e || typeof e != "object")
    return !1;
  const t = e;
  return typeof t.security_uuid == "string" && typeof t.name == "string" && typeof t.current_holdings == "number" && typeof t.purchase_value == "number" && typeof t.current_value == "number";
}
function je(e) {
  const t = { ...e };
  return e.average_cost && typeof e.average_cost == "object" && (t.average_cost = { ...e.average_cost }), e.performance && typeof e.performance == "object" && (t.performance = { ...e.performance }), e.aggregation && typeof e.aggregation == "object" && (t.aggregation = { ...e.aggregation }), e.data_state && typeof e.data_state == "object" && (t.data_state = { ...e.data_state }), t;
}
function Bi(e, t) {
  const n = e ? je(e) : {}, r = [
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
  ], i = (s, a, c) => {
    const l = a[c];
    l !== void 0 && (s[c] = l);
  };
  r.forEach((s) => {
    i(n, t, s);
  });
  const o = (s) => {
    const a = t[s];
    if (a && typeof a == "object") {
      const c = e && e[s] && typeof e[s] == "object" ? e[s] : {};
      n[s] = {
        ...c,
        ...a
      };
    } else a !== void 0 && (n[s] = a);
  };
  return o("performance"), o("aggregation"), o("average_cost"), o("data_state"), n;
}
function Gt(e, t) {
  if (!e)
    return;
  if (!Array.isArray(t)) {
    de.delete(e);
    return;
  }
  if (t.length === 0) {
    de.set(e, []);
    return;
  }
  const n = de.get(e) ?? [], r = new Map(
    n.filter((o) => o.security_uuid).map((o) => [o.security_uuid, o])
  ), i = t.filter((o) => !!o).map((o) => {
    const s = o.security_uuid ?? "", a = s ? r.get(s) : void 0;
    return Bi(a, o);
  }).map(je);
  de.set(e, i);
}
function Kt(e) {
  return e ? de.has(e) : !1;
}
function Jn(e) {
  if (!e)
    return [];
  const t = de.get(e);
  return t ? t.map(je) : [];
}
function ji() {
  de.clear();
}
function Gi() {
  return new Map(
    Array.from(de.entries(), ([e, t]) => [
      e,
      t.map(je)
    ])
  );
}
function Ee(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e, n = q(t.native), r = q(t.security), i = q(t.account), o = q(t.eur), s = q(t.coverage_ratio);
  if (n == null && r == null && i == null && o == null && s == null)
    return null;
  const a = ue(t.source);
  return {
    native: n,
    security: r,
    account: i,
    eur: o,
    source: a === "totals" || a === "eur_total" ? a : "aggregation",
    coverage_ratio: s
  };
}
function Yt(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e, n = q(t.total_holdings), r = q(t.positive_holdings), i = q(t.purchase_value_eur), o = q(t.purchase_total_security) ?? q(t.security_currency_total), s = q(t.purchase_total_account) ?? q(t.account_currency_total);
  let a = 0;
  if (typeof t.purchase_value_cents == "number")
    a = Number.isFinite(t.purchase_value_cents) ? Math.trunc(t.purchase_value_cents) : 0;
  else if (typeof t.purchase_value_cents == "string") {
    const l = Number.parseInt(t.purchase_value_cents, 10);
    Number.isFinite(l) && (a = l);
  }
  return n != null || r != null || i != null || o != null || s != null || a !== 0 ? {
    total_holdings: n ?? 0,
    positive_holdings: r ?? 0,
    purchase_value_cents: a,
    purchase_value_eur: i ?? 0,
    security_currency_total: o ?? 0,
    account_currency_total: s ?? 0,
    purchase_total_security: o ?? 0,
    purchase_total_account: s ?? 0
  } : null;
}
function Ki(e) {
  if (!e || typeof e != "object")
    return null;
  const t = Wi(e) ? je(e) : e, n = ue(t.security_uuid), r = ue(t.name), i = ae(t.current_holdings), o = pn(t.current_value), s = Yt(t.aggregation), a = t.aggregation && typeof t.aggregation == "object" ? t.aggregation : null, c = q(t.purchase_value_eur) ?? q(a == null ? void 0 : a.purchase_value_eur) ?? q(a == null ? void 0 : a.purchase_total_account) ?? q(a == null ? void 0 : a.account_currency_total) ?? pn(t.purchase_value);
  if (!n || !r || i == null || c == null || o == null)
    return null;
  const l = {
    security_uuid: n,
    name: r,
    portfolio_uuid: ue(t.portfolio_uuid) ?? ue(t.portfolioUuid) ?? void 0,
    currency_code: ue(t.currency_code),
    current_holdings: i,
    purchase_value: c,
    current_value: o
  }, u = Ee(t.average_cost);
  u && (l.average_cost = u), s && (l.aggregation = s);
  const f = pe(t.performance);
  if (f)
    l.performance = f, l.gain_abs = typeof f.gain_abs == "number" ? f.gain_abs : null, l.gain_pct = typeof f.gain_pct == "number" ? f.gain_pct : null;
  else {
    const b = q(t.gain_abs), S = q(t.gain_pct);
    b !== null && (l.gain_abs = b), S !== null && (l.gain_pct = S);
  }
  "coverage_ratio" in t && (l.coverage_ratio = q(t.coverage_ratio));
  const d = ue(t.provenance);
  d && (l.provenance = d);
  const g = ue(t.metric_run_uuid);
  (g || t.metric_run_uuid === null) && (l.metric_run_uuid = g ?? null);
  const p = q(t.last_price_native);
  p !== null && (l.last_price_native = p);
  const m = q(t.last_price_eur);
  m !== null && (l.last_price_eur = m);
  const y = q(t.last_close_native);
  y !== null && (l.last_close_native = y);
  const h = q(t.last_close_eur);
  h !== null && (l.last_close_eur = h);
  const _ = t.data_state && typeof t.data_state == "object" ? { ...t.data_state } : void 0;
  return _ && (l.data_state = _), l;
}
function pt(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = Ki(n);
    r && t.push(r);
  }
  return t;
}
let Qn = [];
const fe = /* @__PURE__ */ new Map();
function Ye(e) {
  return typeof e == "string" && e.length > 0 ? e : void 0;
}
function Yi(e) {
  return e === null ? null : Ye(e);
}
function Xi(e) {
  return typeof e == "number" && Number.isFinite(e) ? e : void 0;
}
function _e(e) {
  return e === null ? null : Xi(e);
}
function hn(e) {
  if (!(typeof e != "number" || !Number.isFinite(e)))
    return Math.trunc(e);
}
function ie(e) {
  if (!(!e || typeof e != "object"))
    return { ...e };
}
function Ie(e) {
  const t = { ...e };
  return t.average_cost = ie(e.average_cost), t.performance = ie(e.performance), t.aggregation = ie(e.aggregation), t.data_state = ie(e.data_state), t;
}
function Xt(e) {
  const t = { ...e };
  return t.performance = ie(e.performance), t.data_state = ie(e.data_state), Array.isArray(e.positions) && (t.positions = e.positions.map(Ie)), t;
}
function er(e) {
  if (!e || typeof e != "object")
    return null;
  const t = Ye(e.uuid);
  if (!t)
    return null;
  const n = { uuid: t }, r = Ye(e.name);
  r && (n.name = r);
  const i = _e(e.current_value);
  i !== void 0 && (n.current_value = i);
  const o = _e(e.purchase_sum) ?? _e(e.purchase_value_eur) ?? _e(e.purchase_value);
  o !== void 0 && (n.purchase_value = o, n.purchase_sum = o);
  const s = _e(e.day_change_abs);
  s !== void 0 && (n.day_change_abs = s);
  const a = _e(e.day_change_pct);
  a !== void 0 && (n.day_change_pct = a);
  const c = hn(e.position_count);
  c !== void 0 && (n.position_count = c);
  const l = hn(e.missing_value_positions);
  l !== void 0 && (n.missing_value_positions = l), typeof e.has_current_value == "boolean" && (n.has_current_value = e.has_current_value);
  const u = _e(e.coverage_ratio);
  u !== void 0 && (n.coverage_ratio = u);
  const f = Ye(e.provenance);
  f && (n.provenance = f), "metric_run_uuid" in e && (n.metric_run_uuid = Yi(e.metric_run_uuid));
  const d = ie(e.performance);
  d && (n.performance = d);
  const g = ie(e.data_state);
  if (g && (n.data_state = g), Array.isArray(e.positions)) {
    const p = e.positions.filter(
      (m) => !!m
    );
    p.length && (n.positions = p.map(Ie));
  }
  return n;
}
function Zi(e, t) {
  const n = {
    ...e,
    ...t
  };
  return !t.performance && e.performance && (n.performance = ie(e.performance)), !t.data_state && e.data_state && (n.data_state = ie(e.data_state)), !t.positions && e.positions && (n.positions = e.positions.map(Ie)), n;
}
function tr(e) {
  Qn = (e ?? []).map((n) => ({ ...n }));
}
function Ji() {
  return Qn.map((e) => ({ ...e }));
}
function Qi(e) {
  fe.clear();
  const t = e ?? [];
  for (const n of t) {
    const r = er(n);
    r && fe.set(r.uuid, Xt(r));
  }
}
function eo(e) {
  const t = e ?? [];
  for (const n of t) {
    const r = er(n);
    if (!r)
      continue;
    const i = fe.get(r.uuid), o = i ? Zi(i, r) : Xt(r);
    fe.set(o.uuid, o);
  }
}
function Zt(e, t) {
  if (!e)
    return;
  const n = fe.get(e);
  if (!n)
    return;
  if (!Array.isArray(t) || t.length === 0) {
    const c = { ...n };
    delete c.positions, fe.set(e, c);
    return;
  }
  const r = (c, l) => {
    const u = c ? Ie(c) : {}, f = u;
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
      m != null && (f[p] = m);
    });
    const g = (p) => {
      const m = l[p];
      if (m && typeof m == "object") {
        const y = c && c[p] && typeof c[p] == "object" ? c[p] : {};
        f[p] = {
          ...y,
          ...m
        };
      } else m != null && (f[p] = m);
    };
    return g("performance"), g("aggregation"), g("average_cost"), g("data_state"), u;
  }, i = Array.isArray(n.positions) ? n.positions : [], o = new Map(
    i.filter((c) => c.security_uuid).map((c) => [c.security_uuid, c])
  ), s = t.filter((c) => !!c).map((c) => {
    const l = c.security_uuid ? o.get(c.security_uuid) : void 0;
    return r(l, c);
  }).map(Ie), a = {
    ...n,
    positions: s
  };
  fe.set(e, a);
}
function to() {
  return Array.from(fe.values(), (e) => Xt(e));
}
function nr() {
  return {
    accounts: Ji(),
    portfolios: to()
  };
}
const no = "unknown-account";
function Y(e) {
  return typeof e != "number" || !Number.isFinite(e) ? null : e;
}
function mn(e) {
  const t = Y(e);
  return t == null ? 0 : Math.trunc(t);
}
function J(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t.length > 0 ? t : null;
}
function rr(e, t) {
  return J(e) ?? t;
}
function ir(e) {
  return e == null || !Number.isFinite(e) ? null : e < 0 ? 0 : e > 1 ? 1 : e;
}
function or(e) {
  return e.split(/[\s_-]+/).filter(Boolean).map(
    (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
  ).join(" ");
}
function ar(e) {
  const t = ro(e);
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
function ro(e) {
  const t = J(e);
  if (!t)
    return null;
  const n = io(t);
  return n || or(t);
}
function io(e) {
  const t = e.trim();
  if (!t.startsWith("{") && !t.startsWith("["))
    return null;
  try {
    const n = JSON.parse(t), r = oo(n), i = n && typeof n == "object" ? J(
      n.provider ?? n.source
    ) : null;
    if (r.length && i)
      return `${or(i)} (${r.join(", ")})`;
    if (r.length)
      return `FX (${r.join(", ")})`;
  } catch {
    return null;
  }
  return null;
}
function oo(e) {
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
function ao(e) {
  if (!e)
    return null;
  const t = J(e.uuid) ?? `${no}-${e.name ?? "0"}`, n = rr(e.name, "Unbenanntes Konto"), r = J(e.currency_code), i = Y(e.balance), o = Y(e.orig_balance), s = "coverage_ratio" in e ? ir(Y(e.coverage_ratio)) : null, a = J(e.provenance), c = J(e.metric_run_uuid), l = e.fx_unavailable === !0, u = Y(e.fx_rate), f = J(e.fx_rate_source), d = J(e.fx_rate_timestamp), g = [], p = ar(a);
  p && g.push(p);
  const m = {
    uuid: t,
    name: n,
    currency_code: r,
    balance: i,
    orig_balance: o,
    fx_unavailable: l,
    coverage_ratio: s,
    provenance: a,
    metric_run_uuid: null,
    fx_rate: u,
    fx_rate_source: f,
    fx_rate_timestamp: d,
    badges: g
  }, y = typeof c == "string" ? c : null;
  return m.metric_run_uuid = y, m;
}
function so(e) {
  if (!e)
    return null;
  const t = J(e.uuid);
  if (!t)
    return null;
  const n = rr(e.name, "Unbenanntes Depot"), r = mn(e.position_count), i = mn(e.missing_value_positions), o = Y(e.current_value), s = Y(e.purchase_sum) ?? Y(e.purchase_value_eur) ?? Y(e.purchase_value) ?? 0, a = Y(e.day_change_abs) ?? null, c = Y(e.day_change_pct) ?? null, l = pe(e.performance), u = (l == null ? void 0 : l.gain_abs) ?? null, f = (l == null ? void 0 : l.gain_pct) ?? null, d = (l == null ? void 0 : l.day_change) ?? null;
  let g = a ?? ((d == null ? void 0 : d.value_change_eur) != null ? Y(d.value_change_eur) : null), p = c ?? ((d == null ? void 0 : d.change_pct) != null ? Y(d.change_pct) : null);
  if (g == null && p != null && o != null) {
    const C = o / (1 + p / 100);
    C && (g = o - C);
  }
  if (p == null && g != null && o != null) {
    const C = o - g;
    C && (p = g / C * 100);
  }
  const m = o != null, y = e.has_current_value === !1 || !m, h = "coverage_ratio" in e ? ir(Y(e.coverage_ratio)) : null, _ = J(e.provenance), b = J(e.metric_run_uuid), S = [], P = ar(_);
  P && S.push(P);
  const A = {
    uuid: t,
    name: n,
    position_count: r,
    current_value: o,
    purchase_sum: s,
    day_change_abs: g ?? null,
    day_change_pct: p ?? null,
    gain_abs: u,
    gain_pct: f,
    hasValue: m,
    fx_unavailable: y || i > 0,
    missing_value_positions: i,
    performance: l,
    coverage_ratio: h,
    provenance: _,
    metric_run_uuid: null,
    badges: S
  }, N = typeof b == "string" ? b : null;
  return A.metric_run_uuid = N, A;
}
function sr() {
  const { accounts: e } = nr();
  return e.map(ao).filter((t) => !!t);
}
function co() {
  const { portfolios: e } = nr();
  return e.map(so).filter((t) => !!t);
}
function Ve(e) {
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
function cr(e, t = {}) {
  if (!e || e.length === 0)
    return "";
  const n = ["meta-badges", t.containerClass].filter(Boolean).join(" "), r = e.map((i) => {
    const o = `meta-badge--${i.tone}`, s = i.description ? ` title="${Ve(i.description)}"` : "";
    return `<span class="meta-badge ${o}"${s}>${Ve(
      i.label
    )}</span>`;
  }).join("");
  return `<span class="${n}">${r}</span>`;
}
function et(e, t, n = {}) {
  const r = cr(t, n);
  if (!r)
    return Ve(e);
  const i = n.labelClass ?? "name-with-badges__label";
  return `<span class="${["name-with-badges", n.containerClass].filter(Boolean).join(" ")}"><span class="${i}">${Ve(
    e
  )}</span>${r}</span>`;
}
function lr(e, t, n, r) {
  e[t] = {
    previous: n,
    current: r
  };
}
const se = /* @__PURE__ */ new Map(), Xe = /* @__PURE__ */ new Map();
function lo(e) {
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
function Fe(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t.length > 0 ? t : null;
}
function uo(e) {
  return typeof e == "number" && Number.isFinite(e) ? e : void 0;
}
function fo(e) {
  return e === null ? null : uo(e);
}
function go(e) {
  return e === null ? null : Fe(e);
}
function _n(e) {
  return (e ?? []).filter(
    (t) => !t.key.endsWith("-coverage") && !t.key.startsWith("provenance-")
  );
}
function yn(e) {
  return pe(e.performance);
}
const po = 500, ho = 10, mo = "pp-reader:portfolio-positions-updated", _o = "pp-reader:diagnostics", yt = /* @__PURE__ */ new Map(), ur = [
  "coverage_ratio",
  "provenance",
  "metric_run_uuid",
  "generated_at"
], Dt = /* @__PURE__ */ new Map();
function yo(e, t) {
  return `${e}:${t}`;
}
function bo(e) {
  if (e === void 0)
    return;
  if (e === null)
    return null;
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  const t = fo(e);
  if (t === null)
    return null;
  if (typeof t == "number" && Number.isFinite(t))
    return t;
}
function bt(e) {
  if (e !== void 0)
    return go(e);
}
function Jt(e, t, n, r) {
  const i = {}, o = bo(e);
  o !== void 0 && (i.coverage_ratio = o);
  const s = bt(t);
  s !== void 0 && (i.provenance = s);
  const a = bt(n);
  a !== void 0 && (i.metric_run_uuid = a);
  const c = bt(r);
  return c !== void 0 && (i.generated_at = c), Object.keys(i).length > 0 ? i : null;
}
function vo(e, t) {
  const n = {};
  let r = !1;
  for (const i of ur) {
    const o = e == null ? void 0 : e[i], s = t[i];
    o !== s && (lr(n, i, o, s), r = !0);
  }
  return r ? n : null;
}
function So(e) {
  const t = {};
  let n = !1;
  for (const r of ur) {
    const i = e[r];
    i !== void 0 && (lr(t, r, i, void 0), n = !0);
  }
  return n ? t : null;
}
function bn(e) {
  if (Object.keys(e.changed).length) {
    try {
      console.debug("pp-reader:diagnostics", e);
    } catch {
    }
    if (!(typeof window > "u" || typeof window.dispatchEvent != "function"))
      try {
        window.dispatchEvent(new CustomEvent(_o, { detail: e }));
      } catch (t) {
        console.warn("updateConfigsWS: Diagnostics-Event konnte nicht gesendet werden", t);
      }
  }
}
function Qt(e, t, n, r) {
  const i = yo(e, n), o = yt.get(i);
  if (!r) {
    if (!o)
      return;
    yt.delete(i);
    const a = So(o);
    if (!a)
      return;
    bn({
      kind: e,
      uuid: n,
      source: t,
      changed: a,
      snapshot: {},
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    return;
  }
  const s = vo(o, r);
  s && (yt.set(i, { ...r }), bn({
    kind: e,
    uuid: n,
    source: t,
    changed: s,
    snapshot: { ...r },
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  }));
}
function Po(e) {
  if (!(!e || e.length === 0))
    for (const t of e) {
      const n = Fe(t.uuid);
      if (!n)
        continue;
      const r = Jt(
        t.coverage_ratio,
        t.provenance,
        t.metric_run_uuid,
        void 0
      );
      Qt("account", "accounts", n, r);
    }
}
function Ao(e) {
  if (!(!e || e.length === 0))
    for (const t of e) {
      const n = Fe(t.uuid);
      if (!n)
        continue;
      const r = Jt(
        t.coverage_ratio,
        t.provenance,
        t.metric_run_uuid,
        void 0
      );
      Qt("portfolio", "portfolio_values", n, r);
    }
}
function No(e, t) {
  var r, i, o, s;
  if (!t)
    return;
  const n = Jt(
    t.coverage_ratio ?? ((r = t.normalized_payload) == null ? void 0 : r.coverage_ratio),
    t.provenance ?? ((i = t.normalized_payload) == null ? void 0 : i.provenance),
    t.metric_run_uuid ?? ((o = t.normalized_payload) == null ? void 0 : o.metric_run_uuid),
    (s = t.normalized_payload) == null ? void 0 : s.generated_at
  );
  Qt("portfolio_positions", "portfolio_positions", e, n);
}
function wo(e, t) {
  return `<div class="error">${lo(e)} <button class="retry-pos" data-portfolio="${t}">Erneut laden</button></div>`;
}
function Eo(e, t, n) {
  const r = e.querySelector("table.sortable-positions");
  if (!r) return;
  const i = e.dataset.sortKey || r.dataset.defaultSort || "name", s = (e.dataset.sortDir || r.dataset.defaultDir || "asc") === "desc" ? "desc" : "asc";
  e.dataset.sortKey = i, e.dataset.sortDir = s;
  try {
    Un(r, i, s, !0);
  } catch (l) {
    console.warn("restoreSortAndInit: sortTableRows Fehler:", l);
  }
  const { attachPortfolioPositionsSorting: a, attachSecurityDetailListener: c } = jt();
  if (a)
    try {
      a(t, n);
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
function dr(e, t, n, r) {
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
    return o.innerHTML = wo(r, t), { applied: !0 };
  const s = o.dataset.sortKey, a = o.dataset.sortDir;
  return o.innerHTML = Lo(n), s && (o.dataset.sortKey = s), a && (o.dataset.sortDir = a), Eo(o, e, t), { applied: !0 };
}
function en(e, t) {
  const n = se.get(t);
  if (!n) return !1;
  const r = dr(
    e,
    t,
    n.positions,
    n.error
  );
  return r.applied && se.delete(t), r.applied;
}
function Fo(e) {
  let t = !1;
  for (const [n] of se)
    en(e, n) && (t = !0);
  return t;
}
function fr(e, t) {
  const n = Xe.get(t) ?? {
    attempts: 0,
    timer: null
  };
  n.timer || (n.timer = setTimeout(() => {
    n.timer = null, n.attempts += 1;
    const r = en(e, t);
    r || n.attempts >= ho ? (Xe.delete(t), r || se.delete(t)) : fr(e, t);
  }, po), Xe.set(t, n));
}
function xo(e, t) {
  console.log("updateConfigsWS: Kontodaten-Update erhalten:", e);
  const n = Array.isArray(e) ? e : [];
  if (tr(n), Po(n), !t)
    return;
  const r = sr();
  Co(r, t);
  const i = t.querySelector(".portfolio-table table"), o = i ? Array.from(
    i.querySelectorAll("tbody tr:not(.footer-row)")
  ).map((s) => {
    const a = s.cells.item(2), c = (a == null ? void 0 : a.textContent) ?? "", l = parseFloat(
      c.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "")
    );
    return {
      current_value: Number.isFinite(l) ? l : 0
    };
  }) : [];
  gr(r, o, t);
}
function Co(e, t) {
  const n = t.querySelector(".account-table"), r = t.querySelector(".fx-account-table"), i = e.filter((s) => (s.currency_code || "EUR") === "EUR"), o = e.filter((s) => (s.currency_code || "EUR") !== "EUR");
  if (n) {
    const s = i.map((a) => ({
      name: et(a.name, _n(a.badges), {
        containerClass: "account-name",
        labelClass: "account-name__label"
      }),
      balance: a.balance ?? null
    }));
    n.innerHTML = Pe(
      s,
      [
        { key: "name", label: "Name" },
        { key: "balance", label: "Kontostand (EUR)", align: "right" }
      ],
      ["balance"]
    );
  } else
    console.warn("updateAccountTable: .account-table nicht gefunden.");
  if (r) {
    const s = o.map((a) => {
      const c = a.orig_balance, l = typeof c == "number" && Number.isFinite(c), u = Fe(a.currency_code), f = l ? c.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) : null, d = f ? u ? `${f} ${u}` : f : "";
      return {
        name: et(a.name, _n(a.badges), {
          containerClass: "account-name",
          labelClass: "account-name__label"
        }),
        fx_display: d,
        balance: a.balance ?? null
      };
    });
    r.innerHTML = Pe(
      s,
      [
        { key: "name", label: "Name" },
        { key: "fx_display", label: "Betrag (FX)" },
        { key: "balance", label: "EUR", align: "right" }
      ],
      ["balance"]
    );
  } else o.length && console.warn("updateAccountTable: .fx-account-table nicht gefunden, obwohl FX-Konten vorhanden sind.");
}
function Do(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = Bn(n);
    r && t.push(r);
  }
  return t;
}
function ko(e, t) {
  if (!Array.isArray(e)) {
    console.warn("handlePortfolioUpdate: Update ist kein Array:", e);
    return;
  }
  try {
    console.debug("handlePortfolioUpdate: payload=", e);
  } catch {
  }
  const n = Do(e);
  if (n.length && eo(n), Ao(n), !t)
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
        const g = typeof navigator < "u" && navigator.language ? navigator.language : "de-DE";
        return new Intl.NumberFormat(g, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(f);
      } catch {
      }
    return (gt(f, { fallback: 0 }) ?? 0).toFixed(2).replace(".", ",");
  }, s = /* @__PURE__ */ new Map();
  i.querySelectorAll("tr.portfolio-row").forEach((f) => {
    const d = f.dataset.portfolio;
    d && s.set(d, f);
  });
  let c = 0;
  const l = (f) => {
    const d = typeof f == "number" && Number.isFinite(f) ? f : 0;
    try {
      return d.toLocaleString("de-DE");
    } catch {
      return d.toString();
    }
  }, u = /* @__PURE__ */ new Map();
  for (const f of n) {
    const d = Fe(f.uuid);
    d && u.set(d, f);
  }
  for (const [f, d] of u.entries()) {
    const g = s.get(f);
    if (!g || g.cells.length < 3)
      continue;
    const p = g.cells.item(1), m = g.cells.item(2), y = g.cells.item(3), h = g.cells.item(4);
    if (!p || !m)
      continue;
    const _ = typeof d.position_count == "number" && Number.isFinite(d.position_count) ? d.position_count : 0, b = typeof d.current_value == "number" && Number.isFinite(d.current_value) ? d.current_value : null, S = pe(d.performance), P = typeof (S == null ? void 0 : S.gain_abs) == "number" ? S.gain_abs : null, A = typeof (S == null ? void 0 : S.gain_pct) == "number" ? S.gain_pct : null, N = typeof d.purchase_sum == "number" && Number.isFinite(d.purchase_sum) ? d.purchase_sum : typeof d.purchase_value == "number" && Number.isFinite(d.purchase_value) ? d.purchase_value : null, C = vt(m.textContent);
    vt(p.textContent) !== _ && (p.textContent = l(_));
    const x = b !== null, k = {
      fx_unavailable: g.dataset.fxUnavailable === "true",
      current_value: b,
      performance: S
    }, T = { hasValue: x }, M = H("current_value", k.current_value, k, T), w = b ?? 0;
    if ((Math.abs(C - w) >= 5e-3 || m.innerHTML !== M) && (m.innerHTML = M, g.classList.add("flash-update"), setTimeout(() => {
      g.classList.remove("flash-update");
    }, 800)), y) {
      const E = H("gain_abs", P, k, T);
      y.innerHTML = E;
      const v = typeof A == "number" && Number.isFinite(A) ? A : null;
      y.dataset.gainPct = v != null ? `${o(v)} %` : "—", y.dataset.gainSign = v != null ? v > 0 ? "positive" : v < 0 ? "negative" : "neutral" : "neutral";
    }
    h && (h.innerHTML = H("gain_pct", A, k, T)), g.dataset.positionCount = _.toString(), g.dataset.currentValue = x ? w.toString() : "", g.dataset.purchaseSum = N != null ? N.toString() : "", g.dataset.gainAbs = P != null ? P.toString() : "", g.dataset.gainPct = A != null ? A.toString() : "", g.dataset.coverageRatio = typeof d.coverage_ratio == "number" && Number.isFinite(d.coverage_ratio) ? d.coverage_ratio.toString() : "", g.dataset.provenance = typeof d.provenance == "string" ? d.provenance : "", g.dataset.metricRunUuid = typeof d.metric_run_uuid == "string" ? d.metric_run_uuid : "", c += 1;
  }
  if (c === 0)
    console.debug("handlePortfolioUpdate: Keine passenden Zeilen gefunden / keine Änderungen.");
  else {
    const f = c.toLocaleString("de-DE");
    console.debug(`handlePortfolioUpdate: ${f} Zeile(n) gepatcht.`);
  }
  try {
    Mo(r);
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
    }, d = f(
      ".account-table table",
      ".accounts-eur-table table",
      ".accounts-table table"
    ), g = f(
      ".fx-account-table table",
      ".accounts-fx-table table"
    ), p = (h, _) => {
      if (!h) return [];
      const b = h.querySelectorAll("tbody tr.account-row");
      return (b.length ? Array.from(b) : Array.from(h.querySelectorAll("tbody tr:not(.footer-row)"))).map((P) => {
        const A = _ ? P.cells.item(2) : P.cells.item(1);
        return { balance: vt(A == null ? void 0 : A.textContent) };
      });
    }, m = [
      ...p(d, !1),
      ...p(g, !0)
    ], y = Array.from(
      r.querySelectorAll("tbody tr.portfolio-row")
    ).map((h) => {
      const _ = h.dataset.currentValue, b = h.dataset.purchaseSum, S = _ ? Number.parseFloat(_) : Number.NaN, P = b ? Number.parseFloat(b) : Number.NaN;
      return {
        current_value: Number.isFinite(S) ? S : 0,
        purchase_sum: Number.isFinite(P) ? P : 0
      };
    });
    gr(m, y, t);
  } catch (f) {
    console.warn("handlePortfolioUpdate: Fehler bei Total-Neuberechnung:", f);
  }
}
function To(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e.portfolio_uuid;
  if (typeof t == "string" && t)
    return t;
  const n = e.portfolioUuid;
  return typeof n == "string" && n ? n : null;
}
function kt(e) {
  Dt.delete(e);
}
function vn(e) {
  return typeof e != "number" || !Number.isInteger(e) || e <= 0 ? null : e;
}
function Ro(e, t, n, r) {
  if (!n || n <= 1 || !t)
    return kt(e), r;
  const i = n, o = Dt.get(e) ?? { expected: i, chunks: /* @__PURE__ */ new Map() };
  if (o.expected !== i && (o.chunks.clear(), o.expected = i), o.chunks.set(t, r), Dt.set(e, o), o.chunks.size < i)
    return null;
  const s = [];
  for (let a = 1; a <= i; a += 1) {
    const c = o.chunks.get(a);
    c && Array.isArray(c) && s.push(...c);
  }
  return kt(e), s;
}
function Sn(e, t) {
  const n = To(e);
  if (!n)
    return console.warn("handlePortfolioPositionsUpdate: Ungültiges Update:", e), !1;
  const r = e == null ? void 0 : e.error, i = vn(e == null ? void 0 : e.chunk_index), o = vn(e == null ? void 0 : e.chunk_count), s = pt((e == null ? void 0 : e.positions) ?? []);
  r && kt(n);
  const a = r ? s : Ro(n, i, o, s);
  if (!r && a === null)
    return !0;
  const c = r ? s : a ?? [];
  No(n, e), r || (Gt(n, c), Zt(n, c));
  const l = dr(t, n, c, r);
  if (l.applied ? se.delete(n) : (se.set(n, { positions: s, error: r }), l.reason !== "hidden" && fr(t, n)), !r && s.length > 0) {
    const u = Array.from(
      new Set(
        s.map((f) => f.security_uuid).filter((f) => typeof f == "string" && f.length > 0)
      )
    );
    if (u.length && typeof window < "u")
      try {
        window.dispatchEvent(
          new CustomEvent(
            mo,
            {
              detail: {
                portfolioUuid: n,
                securityUuids: u
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
function $o(e, t) {
  if (Array.isArray(e)) {
    let n = !1;
    for (const r of e)
      Sn(r, t) && (n = !0);
    !n && e.length && console.warn("handlePortfolioPositionsUpdate: Kein gültiges Element im Array:", e);
    return;
  }
  Sn(e, t);
}
function Lo(e) {
  const { renderPositionsTable: t, applyGainPctMetadata: n } = jt();
  try {
    if (typeof t == "function")
      return t(e);
  } catch {
  }
  if (e.length === 0)
    return '<div class="no-positions">Keine Positionen vorhanden.</div>';
  const r = e.map((o) => {
    const s = yn(o);
    return {
      name: o.name,
      current_holdings: o.current_holdings,
      purchase_value: o.purchase_value,
      current_value: o.current_value,
      performance: s
    };
  }), i = Pe(
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
    const s = o.content.querySelector("table");
    if (s) {
      s.classList.add("sortable-positions");
      const a = s.querySelectorAll("thead th"), c = ["name", "current_holdings", "purchase_value", "current_value", "gain_abs", "gain_pct"];
      a.forEach((f, d) => {
        const g = c[d];
        g && (f.setAttribute("data-sort-key", g), f.classList.add("sortable-col"));
      }), s.querySelectorAll("tbody tr").forEach((f, d) => {
        if (f.classList.contains("footer-row"))
          return;
        const g = e[d];
        g.security_uuid && (f.dataset.security = g.security_uuid), f.classList.add("position-row");
      }), s.dataset.defaultSort = "name", s.dataset.defaultDir = "asc";
      const u = n;
      if (u)
        try {
          u(s);
        } catch (f) {
          console.warn("renderPositionsTableInline: applyGainPctMetadata failed", f);
        }
      else
        s.querySelectorAll("tbody tr").forEach((d, g) => {
          if (d.classList.contains("footer-row"))
            return;
          const p = d.cells.item(4);
          if (!p)
            return;
          const m = e[g], y = yn(m), h = typeof (y == null ? void 0 : y.gain_pct) == "number" && Number.isFinite(y.gain_pct) ? y.gain_pct : null, _ = h != null ? `${h.toLocaleString("de-DE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })} %` : "—", b = h == null ? "neutral" : h > 0 ? "positive" : h < 0 ? "negative" : "neutral";
          p.dataset.gainPct = _, p.dataset.gainSign = b;
        });
      return s.outerHTML;
    }
  } catch (o) {
    console.warn("renderPositionsTableInline: Sortier-Metadaten Injection fehlgeschlagen:", o);
  }
  return i;
}
function Mo(e) {
  var h;
  if (!e) return;
  const { updatePortfolioFooter: t } = jt();
  if (typeof t == "function")
    try {
      t(e);
      return;
    } catch (_) {
      console.warn("updatePortfolioFooter: helper schlug fehl:", _);
    }
  const n = Array.from(e.querySelectorAll("tbody tr.portfolio-row")), r = (_) => {
    if (_ === void 0)
      return null;
    const b = Number.parseFloat(_);
    return Number.isFinite(b) ? b : null;
  }, i = n.reduce(
    (_, b) => {
      const S = r(b.dataset.positionCount);
      if (S != null && (_.sumPositions += S), b.dataset.fxUnavailable === "true" && (_.fxUnavailable = !0), b.dataset.hasValue !== "true")
        return _.incompleteRows += 1, _;
      _.valueRows += 1;
      const P = r(b.dataset.currentValue), A = r(b.dataset.gainAbs), N = r(b.dataset.purchaseSum);
      return P == null || A == null || N == null ? (_.incompleteRows += 1, _) : (_.sumCurrent += P, _.sumGainAbs += A, _.sumPurchase += N, _);
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
  ), o = i.valueRows > 0 && i.incompleteRows === 0, s = o && i.sumPurchase > 0 ? i.sumGainAbs / i.sumPurchase * 100 : null;
  let a = e.querySelector("tr.footer-row");
  a || (a = document.createElement("tr"), a.className = "footer-row", (h = e.querySelector("tbody")) == null || h.appendChild(a));
  const c = Math.round(i.sumPositions).toLocaleString("de-DE"), l = {
    fx_unavailable: i.fxUnavailable || !o,
    current_value: o ? i.sumCurrent : null,
    performance: o ? {
      gain_abs: i.sumGainAbs,
      gain_pct: s,
      total_change_eur: i.sumGainAbs,
      total_change_pct: s,
      source: "aggregated",
      coverage_ratio: 1
    } : null
  }, u = { hasValue: o }, f = H("current_value", l.current_value, l, u), d = o ? i.sumGainAbs : null, g = o ? s : null, p = H("gain_abs", d, l, u), m = H("gain_pct", g, l, u);
  a.innerHTML = `
    <td>Summe</td>
    <td class="align-right">${c}</td>
    <td class="align-right">${f}</td>
    <td class="align-right">${p}</td>
    <td class="align-right">${m}</td>
  `;
  const y = a.cells.item(3);
  y && (y.dataset.gainPct = o && typeof s == "number" ? `${Tt(s)} %` : "—", y.dataset.gainSign = o && typeof s == "number" ? s > 0 ? "positive" : s < 0 ? "negative" : "neutral" : "neutral"), a.dataset.positionCount = Math.round(i.sumPositions).toString(), a.dataset.currentValue = o ? i.sumCurrent.toString() : "", a.dataset.purchaseSum = o ? i.sumPurchase.toString() : "", a.dataset.gainAbs = o ? i.sumGainAbs.toString() : "", a.dataset.gainPct = o && typeof s == "number" ? s.toString() : "", a.dataset.hasValue = o ? "true" : "false", a.dataset.fxUnavailable = i.fxUnavailable || !o ? "true" : "false";
}
function Pn(e) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  if (typeof e == "string") {
    const t = Number.parseFloat(e);
    return Number.isFinite(t) ? t : 0;
  }
  return 0;
}
function Tt(e) {
  return (gt(e, { fallback: 0 }) ?? 0).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
function gr(e, t, n) {
  const r = n ?? document, o = (Array.isArray(e) ? e : []).reduce((f, d) => {
    const g = d.balance ?? d.current_value ?? d.value, p = Pn(g);
    return f + p;
  }, 0), a = (Array.isArray(t) ? t : []).reduce((f, d) => {
    const g = d.current_value ?? d.value, p = Pn(g);
    return f + p;
  }, 0), c = o + a, l = r.querySelector("#headerMeta");
  if (!l) {
    console.warn("updateTotalWealth: #headerMeta nicht gefunden.");
    return;
  }
  const u = l.querySelector("strong") || l.querySelector(".total-wealth-value");
  u ? u.textContent = `${Tt(c)} €` : l.textContent = `💰 Gesamtvermögen: ${Tt(c)} €`, l.dataset.totalWealthEur = c.toString();
}
function Ho(e, t) {
  const n = typeof e == "string" ? e : e == null ? void 0 : e.last_file_update, r = Fe(n) ?? "";
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
function Ns(e) {
  if (e == null)
    return;
  const t = e.querySelector("table.sortable-positions");
  if (t == null)
    return;
  const n = e.dataset.sortKey || t.dataset.defaultSort || "name", i = (e.dataset.sortDir || t.dataset.defaultDir || "asc") === "desc" ? "desc" : "asc";
  e.dataset.sortKey = n, e.dataset.sortDir = i, Un(t, n, i, !0);
}
const ws = {
  getPortfolioPositionsCacheSnapshot: Gi,
  clearPortfolioPositionsCache: ji,
  getPendingUpdateCount() {
    return se.size;
  },
  queuePendingUpdate(e, t, n) {
    se.set(e, { positions: t, error: n });
  },
  clearPendingUpdates() {
    se.clear(), Xe.clear();
  }
};
function vt(e) {
  return e == null ? 0 : parseFloat(
    e.replace(/\u00A0/g, " ").replace(/[€%]/g, "").replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "")
  ) || 0;
}
const Io = [
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
function St(e) {
  return Io.includes(e);
}
function Pt(e) {
  return e === "asc" || e === "desc";
}
function pr(e) {
  return (e ?? []).filter((t) => !t.key.endsWith("-coverage"));
}
function An(e) {
  return pr(e).filter(
    (t) => !t.key.startsWith("provenance-")
  );
}
let tt = null, nt = null;
const Nn = { min: 2, max: 6 };
function Ce(e) {
  return ae(e);
}
function Vo(e) {
  return typeof e == "number" && Number.isFinite(e);
}
function Uo(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  if (!t)
    return null;
  const n = t.toUpperCase();
  return /^[A-Z]{3}$/.test(n) ? n : n === "€" ? "EUR" : null;
}
function wn(e, t, n = null) {
  for (const r of t) {
    const i = Uo(e[r]);
    if (i)
      return i;
  }
  return n;
}
function En(e, t) {
  return Vo(e) ? `${e.toLocaleString("de-DE", {
    minimumFractionDigits: Nn.min,
    maximumFractionDigits: Nn.max
  })}${t ? ` ${t}` : ""}` : null;
}
function zo(e) {
  const t = e, n = e.average_cost ?? null, r = e.aggregation ?? null, i = wn(t, [
    "security_currency_code",
    "security_currency",
    "native_currency_code",
    "native_currency"
  ], e.currency_code ?? null), o = wn(
    t,
    [
      "account_currency_code",
      "account_currency",
      "purchase_currency_code",
      "currency_code"
    ],
    i === "EUR" ? "EUR" : null
  ) ?? "EUR", s = Ce(n == null ? void 0 : n.native), a = Ce(n == null ? void 0 : n.security), c = Ce(n == null ? void 0 : n.account), l = Ce(n == null ? void 0 : n.eur), u = a ?? s, f = l ?? (o === "EUR" ? c : null), d = i ?? o, g = d === "EUR";
  let p, m;
  g ? (p = "EUR", m = f ?? u ?? c ?? null) : u != null ? (p = d, m = u) : c != null ? (p = o, m = c) : (p = "EUR", m = f ?? null);
  const y = En(m, p), h = g ? null : En(f, "EUR"), _ = !!h && h !== y, b = [], S = [];
  y ? (b.push(
    `<span class="purchase-price purchase-price--primary">${y}</span>`
  ), S.push(y.replace(/\u00A0/g, " "))) : (b.push('<span class="missing-value" role="note" aria-label="Kein Kaufpreis verfügbar" title="Kein Kaufpreis verfügbar">—</span>'), S.push("Kein Kaufpreis verfügbar")), _ && h && (b.push(
    `<span class="purchase-price purchase-price--secondary">${h}</span>`
  ), S.push(h.replace(/\u00A0/g, " ")));
  const P = b.join("<br>"), A = Ce(r == null ? void 0 : r.purchase_value_eur) ?? 0, N = S.join(", ");
  return { markup: P, sortValue: A, ariaLabel: N };
}
function qo(e) {
  const t = ae(e.current_holdings);
  if (t == null)
    return { value: null, pct: null };
  const n = ae(e.last_price_eur), r = ae(e.last_close_eur);
  let i = null, o = null;
  if (n != null && r != null) {
    i = (n - r) * t;
    const f = r * t;
    f && (o = i / f * 100);
  }
  const s = pe(e.performance), a = (s == null ? void 0 : s.day_change) ?? null;
  if (i == null && (a == null ? void 0 : a.price_change_eur) != null && (i = a.price_change_eur * t), o == null && (a == null ? void 0 : a.change_pct) != null && (o = a.change_pct), i == null && o != null) {
    const u = ae(e.current_value);
    if (u != null) {
      const f = u / (1 + o / 100);
      f && (i = u - f);
    }
  }
  const c = i != null && Number.isFinite(i) ? Math.round(i * 100) / 100 : null, l = o != null && Number.isFinite(o) ? Math.round(o * 100) / 100 : null;
  return { value: c, pct: l };
}
const rt = /* @__PURE__ */ new Set();
function hr(e) {
  if (!e)
    return;
  Array.from(e.querySelectorAll("tbody tr")).forEach((n) => {
    const r = n.cells.item(7), i = n.cells.item(8);
    if (!r || !i || r.dataset.gainPct && r.dataset.gainSign)
      return;
    const o = (i.textContent || "").trim() || "—";
    let s = "neutral";
    i.querySelector(".positive") ? s = "positive" : i.querySelector(".negative") && (s = "negative"), r.dataset.gainPct = o, r.dataset.gainSign = s;
  });
}
function Ue(e) {
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
    const o = pe(i.performance), s = typeof (o == null ? void 0 : o.gain_abs) == "number" ? o.gain_abs : null, a = typeof (o == null ? void 0 : o.gain_pct) == "number" ? o.gain_pct : null, c = qo(i), l = typeof i.purchase_value == "number" || typeof i.purchase_value == "string" ? i.purchase_value : null;
    return {
      name: typeof i.name == "string" ? i.name : typeof i.name == "number" ? String(i.name) : "",
      current_holdings: typeof i.current_holdings == "number" || typeof i.current_holdings == "string" ? i.current_holdings : null,
      average_price: typeof i.purchase_value == "number" || typeof i.purchase_value == "string" ? i.purchase_value : null,
      purchase_value: l,
      current_value: typeof i.current_value == "number" || typeof i.current_value == "string" ? i.current_value : null,
      day_change_abs: c.value,
      day_change_pct: c.pct,
      gain_abs: s,
      gain_pct: a,
      performance: o
    };
  }), r = Pe(n, t, ["purchase_value", "current_value", "day_change_abs", "gain_abs"]);
  try {
    const i = document.createElement("template");
    i.innerHTML = r.trim();
    const o = i.content.querySelector("table");
    if (o) {
      o.classList.add("sortable-positions");
      const s = Array.from(o.querySelectorAll("thead th"));
      return t.forEach((c, l) => {
        const u = s.at(l);
        u && (u.setAttribute("data-sort-key", c.key), u.classList.add("sortable-col"));
      }), o.querySelectorAll("tbody tr").forEach((c, l) => {
        if (c.classList.contains("footer-row") || l >= e.length)
          return;
        const u = e[l], f = typeof u.security_uuid == "string" ? u.security_uuid : null;
        f && (c.dataset.security = f), c.classList.add("position-row");
        const d = c.cells.item(2);
        if (d) {
          const { markup: m, sortValue: y, ariaLabel: h } = zo(u);
          d.innerHTML = m, d.dataset.sortValue = String(y), h ? d.setAttribute("aria-label", h) : d.removeAttribute("aria-label");
        }
        const g = c.cells.item(7);
        if (g) {
          const m = pe(u.performance), y = typeof (m == null ? void 0 : m.gain_pct) == "number" && Number.isFinite(m.gain_pct) ? m.gain_pct : null, h = y != null ? `${y.toLocaleString("de-DE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })} %` : "—", _ = y == null ? "neutral" : y > 0 ? "positive" : y < 0 ? "negative" : "neutral";
          g.dataset.gainPct = h, g.dataset.gainSign = _;
        }
        const p = c.cells.item(8);
        p && p.classList.add("gain-pct-cell");
      }), o.dataset.defaultSort = "name", o.dataset.defaultDir = "asc", hr(o), o.outerHTML;
    }
  } catch (i) {
    console.warn("renderPositionsTable: Konnte Sortier-Metadaten nicht injizieren:", i);
  }
  return r;
}
function Oo(e) {
  const t = pt(e ?? []);
  return Ue(t);
}
function Wo(e, t) {
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
    const s = o.closest("button, a");
    if (s && r.contains(s))
      return;
    const a = o.closest("tr[data-security]");
    if (!a || !r.contains(a))
      return;
    const c = a.getAttribute("data-security");
    if (c)
      try {
        Xr(c) || console.warn("attachSecurityDetailDelegation: Detail-Tab konnte nicht geöffnet werden für", c);
      } catch (l) {
        console.error("attachSecurityDetailDelegation: Fehler beim Öffnen des Detail-Tabs", l);
      }
  })));
}
function ze(e, t) {
  Wo(e, t);
}
function mr(e) {
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
    const F = v.align === "right" ? ' class="align-right"' : "";
    n += `<th${F}>${v.label}</th>`;
  }), n += "</tr></thead><tbody>", e.forEach((v) => {
    const F = Number.isFinite(v.position_count) ? v.position_count : 0, R = Number.isFinite(v.purchase_sum) ? v.purchase_sum : 0, G = v.hasValue && typeof v.current_value == "number" && Number.isFinite(v.current_value) ? v.current_value : null, W = G !== null, U = v.performance, B = typeof v.gain_abs == "number" ? v.gain_abs : typeof (U == null ? void 0 : U.gain_abs) == "number" ? U.gain_abs : null, z = typeof v.gain_pct == "number" ? v.gain_pct : typeof (U == null ? void 0 : U.gain_pct) == "number" ? U.gain_pct : null, ee = U && typeof U == "object" ? U.day_change : null, me = typeof v.day_change_abs == "number" ? v.day_change_abs : ee && typeof ee == "object" ? ee.value_change_eur ?? ee.price_change_eur : null, Ge = typeof v.day_change_pct == "number" ? v.day_change_pct : ee && typeof ee == "object" && typeof ee.change_pct == "number" ? ee.change_pct : null, Jr = v.fx_unavailable && W, Qr = typeof v.coverage_ratio == "number" && Number.isFinite(v.coverage_ratio) ? v.coverage_ratio : "", ei = typeof v.provenance == "string" ? v.provenance : "", ti = typeof v.metric_run_uuid == "string" ? v.metric_run_uuid : "", xe = rt.has(v.uuid), ni = xe ? "portfolio-toggle expanded" : "portfolio-toggle", sn = `portfolio-details-${v.uuid}`, X = {
      fx_unavailable: v.fx_unavailable,
      purchase_value: R,
      current_value: G,
      day_change_abs: me,
      day_change_pct: Ge,
      gain_abs: B,
      gain_pct: z
    }, ye = { hasValue: W }, ri = H("purchase_value", X.purchase_value, X, ye), ii = H("current_value", X.current_value, X, ye), oi = H("day_change_abs", X.day_change_abs, X, ye), ai = H("day_change_pct", X.day_change_pct, X, ye), si = H("gain_abs", X.gain_abs, X, ye), ci = H("gain_pct", X.gain_pct, X, ye), cn = W && typeof z == "number" && Number.isFinite(z) ? `${ce(z)} %` : "", li = W && typeof z == "number" && Number.isFinite(z) ? z > 0 ? "positive" : z < 0 ? "negative" : "neutral" : "", ui = W && typeof G == "number" && Number.isFinite(G) ? G : "", di = W && typeof B == "number" && Number.isFinite(B) ? B : "", fi = W && typeof z == "number" && Number.isFinite(z) ? z : "", gi = W && typeof me == "number" && Number.isFinite(me) ? me : "", pi = W && typeof Ge == "number" && Number.isFinite(Ge) ? Ge : "", hi = String(F);
    let mt = "";
    cn && (mt = ` data-gain-pct="${t(cn)}" data-gain-sign="${t(li)}"`), Jr && (mt += ' data-partial="true"'), n += `<tr class="portfolio-row"
                  data-portfolio="${v.uuid}"
                  data-position-count="${hi}"
                  data-current-value="${t(ui)}"
                  data-purchase-sum="${t(R)}"
                  data-day-change="${t(gi)}"
                  data-day-change-pct="${t(pi)}"
                  data-gain-abs="${t(di)}"
                data-gain-pct="${t(fi)}"
                data-has-value="${W ? "true" : "false"}"
                data-fx-unavailable="${v.fx_unavailable ? "true" : "false"}"
                data-coverage-ratio="${t(Qr)}"
                data-provenance="${t(ei)}"
                data-metric-run-uuid="${t(ti)}">`;
    const mi = Ve(v.name), _i = cr(pr(v.badges), {
      containerClass: "portfolio-badges"
    });
    n += `<td>
        <button type="button"
                class="${ni}"
                data-portfolio="${v.uuid}"
                aria-expanded="${xe ? "true" : "false"}"
                aria-controls="${sn}">
          <span class="caret">${xe ? "▼" : "▶"}</span>
          <span class="portfolio-name">${mi}</span>${_i}
        </button>
      </td>`;
    const yi = F.toLocaleString("de-DE");
    n += `<td class="align-right">${yi}</td>`, n += `<td class="align-right">${ri}</td>`, n += `<td class="align-right">${ii}</td>`, n += `<td class="align-right">${oi}</td>`, n += `<td class="align-right">${ai}</td>`, n += `<td class="align-right"${mt}>${si}</td>`, n += `<td class="align-right gain-pct-cell">${ci}</td>`, n += "</tr>", n += `<tr class="portfolio-details${xe ? "" : " hidden"}"
                data-portfolio="${v.uuid}"
                id="${sn}"
                role="region"
                aria-label="Positionen für ${v.name}">
      <td colspan="${r.length.toString()}">
        <div class="positions-container">${xe ? Kt(v.uuid) ? Ue(Jn(v.uuid)) : '<div class="loading">Lade Positionen...</div>' : ""}</div>
      </td>
    </tr>`;
  });
  const i = e.filter((v) => typeof v.current_value == "number" && Number.isFinite(v.current_value)), o = e.reduce((v, F) => v + (Number.isFinite(F.position_count) ? F.position_count : 0), 0), s = i.reduce((v, F) => typeof F.current_value == "number" && Number.isFinite(F.current_value) ? v + F.current_value : v, 0), a = i.reduce((v, F) => typeof F.purchase_sum == "number" && Number.isFinite(F.purchase_sum) ? v + F.purchase_sum : v, 0), c = i.map((v) => {
    if (typeof v.day_change_abs == "number")
      return v.day_change_abs;
    const F = v.performance && typeof v.performance == "object" ? v.performance.day_change : null;
    if (F && typeof F == "object") {
      const R = F.value_change_eur;
      if (typeof R == "number" && Number.isFinite(R))
        return R;
    }
    return null;
  }).filter((v) => typeof v == "number" && Number.isFinite(v)), l = c.reduce((v, F) => v + F, 0), u = i.reduce((v, F) => {
    var W;
    if (typeof ((W = F.performance) == null ? void 0 : W.gain_abs) == "number" && Number.isFinite(F.performance.gain_abs))
      return v + F.performance.gain_abs;
    const R = typeof F.current_value == "number" && Number.isFinite(F.current_value) ? F.current_value : 0, G = typeof F.purchase_sum == "number" && Number.isFinite(F.purchase_sum) ? F.purchase_sum : 0;
    return v + (R - G);
  }, 0), f = i.length > 0, d = i.length !== e.length, g = c.length > 0, p = g && f && s !== 0 ? (() => {
    const v = s - l;
    return v ? l / v * 100 : null;
  })() : null, m = f && a > 0 ? u / a * 100 : null, y = {
    fx_unavailable: d,
    purchase_value: f ? a : null,
    current_value: f ? s : null,
    day_change_abs: g ? l : null,
    day_change_pct: g ? p : null,
    gain_abs: f ? u : null,
    gain_pct: f ? m : null
  }, h = { hasValue: f }, _ = { hasValue: g }, b = H("purchase_value", y.purchase_value, y, h), S = H("current_value", y.current_value, y, h), P = H("day_change_abs", y.day_change_abs, y, _), A = H("day_change_pct", y.day_change_pct, y, _), N = H("gain_abs", y.gain_abs, y, h), C = H("gain_pct", y.gain_pct, y, h);
  let L = "";
  if (f && typeof m == "number" && Number.isFinite(m)) {
    const v = `${ce(m)} %`, F = m > 0 ? "positive" : m < 0 ? "negative" : "neutral";
    L = ` data-gain-pct="${t(v)}" data-gain-sign="${t(F)}"`;
  }
  d && (L += ' data-partial="true"');
  const x = String(Math.round(o)), k = f ? String(s) : "", T = f ? String(a) : "", M = g ? String(l) : "", w = g && typeof p == "number" && Number.isFinite(p) ? String(p) : "", E = f ? String(u) : "", I = f && typeof m == "number" && Number.isFinite(m) ? String(m) : "";
  return n += `<tr class="footer-row"
      data-position-count="${x}"
      data-current-value="${t(k)}"
      data-purchase-sum="${t(T)}"
      data-day-change="${t(M)}"
      data-day-change-pct="${t(w)}"
      data-gain-abs="${t(E)}"
      data-gain-pct="${t(I)}"
      data-has-value="${f ? "true" : "false"}"
      data-fx-unavailable="${d ? "true" : "false"}">
      <td>Summe</td>
      <td class="align-right">${Math.round(o).toLocaleString("de-DE")}</td>
    <td class="align-right">${b}</td>
    <td class="align-right">${S}</td>
    <td class="align-right">${P}</td>
    <td class="align-right">${A}</td>
    <td class="align-right"${L}>${N}</td>
    <td class="align-right gain-pct-cell">${C}</td>
  </tr>`, n += "</tbody></table>", n;
}
function Bo(e) {
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
function De(e) {
  if (e === void 0)
    return null;
  const t = Number(e);
  return Number.isFinite(t) ? t : null;
}
function _r(e) {
  const t = Bo(e);
  if (!t)
    return;
  const n = t.tBodies.item(0);
  if (!n)
    return;
  const r = Array.from(n.querySelectorAll("tr.portfolio-row"));
  if (!r.length)
    return;
  let i = 0, o = 0, s = 0, a = 0, c = 0, l = !1, u = !1, f = !0, d = !1;
  for (const R of r) {
    const G = De(R.dataset.positionCount);
    G != null && (i += G), R.dataset.fxUnavailable === "true" && (d = !0);
    const W = R.dataset.hasValue;
    if (!!(W === "false" || W === "0" || W === "" || W == null)) {
      f = !1;
      continue;
    }
    l = !0;
    const B = De(R.dataset.currentValue), z = De(R.dataset.gainAbs), ee = De(R.dataset.purchaseSum), me = De(R.dataset.dayChange);
    if (B == null || z == null || ee == null) {
      f = !1;
      continue;
    }
    o += B, a += z, s += ee, me != null && (c += me, u = !0);
  }
  const g = l && f, p = g && s > 0 ? a / s * 100 : null, m = u && g && o !== 0 ? (() => {
    const R = o - c;
    return R ? c / R * 100 : null;
  })() : null;
  let y = Array.from(n.children).find(
    (R) => R instanceof HTMLTableRowElement && R.classList.contains("footer-row")
  );
  y || (y = document.createElement("tr"), y.classList.add("footer-row"), n.appendChild(y));
  const h = Math.round(i).toLocaleString("de-DE"), _ = {
    fx_unavailable: d || !g,
    purchase_value: g ? s : null,
    current_value: g ? o : null,
    day_change_abs: u && g ? c : null,
    day_change_pct: u && g ? m : null,
    gain_abs: g ? a : null,
    gain_pct: g ? p : null
  }, b = { hasValue: g }, S = { hasValue: u && g }, P = H("purchase_value", _.purchase_value, _, b), A = H("current_value", _.current_value, _, b), N = H("day_change_abs", _.day_change_abs, _, S), C = H("day_change_pct", _.day_change_pct, _, S), L = H("gain_abs", _.gain_abs, _, b), x = H("gain_pct", _.gain_pct, _, b), k = t.tHead ? t.tHead.rows.item(0) : null, T = k ? k.cells.length : 0, M = y.cells.length, w = T || M, E = w > 0 ? w <= 5 : !1, I = g && typeof p == "number" ? `${ce(p)} %` : "", v = g && typeof p == "number" ? p > 0 ? "positive" : p < 0 ? "negative" : "neutral" : "neutral";
  E ? y.innerHTML = `
      <td>Summe</td>
      <td class="align-right">${h}</td>
      <td class="align-right">${A}</td>
      <td class="align-right">${L}</td>
      <td class="align-right gain-pct-cell">${x}</td>
    ` : y.innerHTML = `
      <td>Summe</td>
      <td class="align-right">${h}</td>
      <td class="align-right">${P}</td>
      <td class="align-right">${A}</td>
      <td class="align-right">${N}</td>
      <td class="align-right">${C}</td>
      <td class="align-right">${L}</td>
      <td class="align-right">${x}</td>
    `;
  const F = y.cells.item(E ? 3 : 6);
  F && (F.dataset.gainPct = I || "—", F.dataset.gainSign = v), y.dataset.positionCount = String(Math.round(i)), y.dataset.currentValue = g ? String(o) : "", y.dataset.purchaseSum = g ? String(s) : "", y.dataset.dayChange = g && u ? String(c) : "", y.dataset.dayChangePct = g && u && typeof m == "number" ? String(m) : "", y.dataset.gainAbs = g ? String(a) : "", y.dataset.gainPct = g && typeof p == "number" ? String(p) : "", y.dataset.hasValue = g ? "true" : "false", y.dataset.fxUnavailable = d ? "true" : "false";
}
function qe(e, t) {
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
  const o = (d, g) => {
    const p = i.querySelector("tbody");
    if (!p) return;
    const m = Array.from(p.querySelectorAll("tr")).filter((b) => !b.classList.contains("footer-row")), y = p.querySelector("tr.footer-row"), h = (b) => {
      if (b == null) return 0;
      const S = b.replace(/\u00A0/g, " ").replace(/[%€]/g, "").replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, ""), P = Number.parseFloat(S);
      return Number.isFinite(P) ? P : 0;
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
      }[d], N = b.cells.item(A), C = S.cells.item(A);
      let L = "";
      if (N) {
        const M = N.textContent;
        typeof M == "string" && (L = M.trim());
      }
      let x = "";
      if (C) {
        const M = C.textContent;
        typeof M == "string" && (x = M.trim());
      }
      const k = (M, w) => {
        const E = M ? M.dataset.sortValue : void 0;
        if (E != null && E !== "") {
          const I = Number(E);
          if (Number.isFinite(I))
            return I;
        }
        return h(w);
      };
      let T;
      if (d === "name")
        T = L.localeCompare(x, "de", { sensitivity: "base" });
      else {
        const M = k(N, L), w = k(C, x);
        T = M - w;
      }
      return g === "asc" ? T : -T;
    }), i.querySelectorAll("thead th.sort-active").forEach((b) => {
      b.classList.remove("sort-active", "dir-asc", "dir-desc");
    });
    const _ = i.querySelector(`thead th[data-sort-key="${d}"]`);
    _ && _.classList.add("sort-active", g === "asc" ? "dir-asc" : "dir-desc"), m.forEach((b) => p.appendChild(b)), y && p.appendChild(y);
  }, s = r.dataset.sortKey, a = r.dataset.sortDir, c = i.dataset.defaultSort, l = i.dataset.defaultDir, u = St(s) ? s : St(c) ? c : "name", f = Pt(a) ? a : Pt(l) ? l : "asc";
  o(u, f), i.addEventListener("click", (d) => {
    const g = d.target;
    if (!(g instanceof Element))
      return;
    const p = g.closest("th[data-sort-key]");
    if (!p || !i.contains(p)) return;
    const m = p.getAttribute("data-sort-key");
    if (!St(m))
      return;
    let y = "asc";
    r.dataset.sortKey === m && (y = (Pt(r.dataset.sortDir) ? r.dataset.sortDir : "asc") === "asc" ? "desc" : "asc"), r.dataset.sortKey = m, r.dataset.sortDir = y, o(m, y);
  });
}
async function jo(e, t, n) {
  if (!e || !tt || !nt) return;
  const r = t || n.querySelector(
    `.portfolio-details[data-portfolio="${e}"] .positions-container`
  );
  if (!r)
    return;
  const i = r.closest(".portfolio-details");
  if (!(i && i.classList.contains("hidden"))) {
    r.innerHTML = '<div class="loading">Neu laden...</div>';
    try {
      const o = await Yn(
        tt,
        nt,
        e
      );
      if (o.error) {
        const a = typeof o.error == "string" ? o.error : String(o.error);
        r.innerHTML = `<div class="error">${a} <button class="retry-pos" data-portfolio="${e}">Erneut laden</button></div>`;
        return;
      }
      const s = pt(
        Array.isArray(o.positions) ? o.positions : []
      );
      Gt(e, s), Zt(e, s), r.innerHTML = Ue(s);
      try {
        qe(n, e);
      } catch (a) {
        console.warn("attachPortfolioToggleHandler: Sort-Init (Lazy) fehlgeschlagen:", a);
      }
      try {
        ze(n, e);
      } catch (a) {
        console.warn("reloadPortfolioPositions: Security-Listener konnte nicht gebunden werden:", a);
      }
    } catch (o) {
      const s = o instanceof Error ? o.message : String(o);
      r.innerHTML = `<div class="error">Fehler: ${s} <button class="retry-pos" data-portfolio="${e}">Retry</button></div>`;
    }
  }
}
async function Go(e, t, n = 3e3, r = 50) {
  const i = performance.now();
  return new Promise((o) => {
    const s = () => {
      const a = e.querySelector(t);
      if (a) {
        o(a);
        return;
      }
      if (performance.now() - i > n) {
        o(null);
        return;
      }
      setTimeout(s, r);
    };
    s();
  });
}
function tn(e) {
  const n = (typeof e.__ppReaderAttachToken == "number" ? e.__ppReaderAttachToken : 0) + 1;
  e.__ppReaderAttachToken = n, e.__ppReaderAttachInProgress = !0, (async () => {
    try {
      const r = await Go(e, ".portfolio-table");
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
            const s = o.target;
            if (!(s instanceof Element))
              return;
            const a = s.closest(".retry-pos");
            if (a && r.contains(a)) {
              const g = a.getAttribute("data-portfolio");
              if (g) {
                const p = e.querySelector(
                  `.portfolio-details[data-portfolio="${g}"]`
                ), m = p == null ? void 0 : p.querySelector(".positions-container");
                await jo(g, m ?? null, e);
              }
              return;
            }
            const c = s.closest(".portfolio-toggle");
            if (!c || !r.contains(c)) return;
            const l = c.getAttribute("data-portfolio");
            if (!l) return;
            const u = e.querySelector(
              `.portfolio-details[data-portfolio="${l}"]`
            );
            if (!u) return;
            const f = c.querySelector(".caret");
            if (u.classList.contains("hidden")) {
              u.classList.remove("hidden"), c.classList.add("expanded"), c.setAttribute("aria-expanded", "true"), f && (f.textContent = "▼"), rt.add(l);
              try {
                en(e, l);
              } catch (g) {
                console.warn("attachPortfolioToggleHandler: Pending-Flush fehlgeschlagen:", g);
              }
              if (Kt(l)) {
                const g = u.querySelector(".positions-container");
                if (g) {
                  g.innerHTML = Ue(
                    Jn(l)
                  ), qe(e, l);
                  try {
                    ze(e, l);
                  } catch (p) {
                    console.warn("attachPortfolioToggleHandler: Security-Listener (Cache) Fehler:", p);
                  }
                }
              } else {
                const g = u.querySelector(".positions-container");
                g && (g.innerHTML = '<div class="loading">Lade Positionen...</div>');
                try {
                  const p = await Yn(
                    tt,
                    nt,
                    l
                  );
                  if (p.error) {
                    const y = typeof p.error == "string" ? p.error : String(p.error);
                    g && (g.innerHTML = `<div class="error">${y} <button class="retry-pos" data-portfolio="${l}">Erneut laden</button></div>`);
                    return;
                  }
                  const m = pt(
                    Array.isArray(p.positions) ? p.positions : []
                  );
                  if (Gt(l, m), Zt(
                    l,
                    m
                  ), g) {
                    g.innerHTML = Ue(m);
                    try {
                      qe(e, l);
                    } catch (y) {
                      console.warn("attachPortfolioToggleHandler: Sort-Init (Lazy) fehlgeschlagen:", y);
                    }
                    try {
                      ze(e, l);
                    } catch (y) {
                      console.warn("attachPortfolioToggleHandler: Security-Listener konnte nicht gebunden werden:", y);
                    }
                  }
                } catch (p) {
                  const m = p instanceof Error ? p.message : String(p), y = u.querySelector(".positions-container");
                  y && (y.innerHTML = `<div class="error">Fehler beim Laden: ${m} <button class="retry-pos" data-portfolio="${l}">Retry</button></div>`), console.error("Fehler beim Lazy Load für", l, p);
                }
              }
            } else
              u.classList.add("hidden"), c.classList.remove("expanded"), c.setAttribute("aria-expanded", "false"), f && (f.textContent = "▶"), rt.delete(l);
          } catch (s) {
            console.error("attachPortfolioToggleHandler: Ungefangener Fehler im Click-Handler", s);
          }
        })();
      });
    } finally {
      n === e.__ppReaderAttachToken && (e.__ppReaderAttachInProgress = !1);
    }
  })();
}
function Ko(e) {
  const t = e.querySelector(".expandable-portfolio-table");
  t && (t.__ppReaderPortfolioFallbackBound || (t.__ppReaderPortfolioFallbackBound = !0, t.addEventListener("click", (n) => {
    const r = n.target;
    if (!(r instanceof Element) || !r.closest(".portfolio-toggle")) return;
    const o = e.querySelector(".portfolio-table");
    o != null && o.__ppReaderPortfolioToggleBound || (console.debug("Fallback-Listener aktiv – re-attach Hauptlistener"), tn(e));
  })));
}
async function yr(e, t, n) {
  var k, T, M;
  tt = t ?? null, nt = n ?? null, console.debug(
    "renderDashboard: start – panelConfig:",
    n == null ? void 0 : n.config,
    "derived entry_id?",
    (M = (T = (k = n == null ? void 0 : n.config) == null ? void 0 : k._panel_custom) == null ? void 0 : T.config) == null ? void 0 : M.entry_id
  );
  const r = await Di(t, n);
  tr(r.accounts);
  const i = sr(), o = await Ti(t, n);
  Qi(o.portfolios);
  const s = co();
  let a = "";
  try {
    a = await ki(t, n);
  } catch {
    a = "";
  }
  const c = i.reduce(
    (w, E) => w + (typeof E.balance == "number" && Number.isFinite(E.balance) ? E.balance : 0),
    0
  ), l = s.some((w) => w.fx_unavailable), u = i.some((w) => w.fx_unavailable && (w.balance == null || !Number.isFinite(w.balance))), f = s.reduce((w, E) => E.hasValue && typeof E.current_value == "number" && Number.isFinite(E.current_value) ? w + E.current_value : w, 0), d = c + f, g = "Teilw. fehlende FX-Kurse – Gesamtvermögen abweichend", m = s.some((w) => w.hasValue && typeof w.current_value == "number" && Number.isFinite(w.current_value)) || i.some((w) => typeof w.balance == "number" && Number.isFinite(w.balance)) ? `${ce(d)}&nbsp;€` : `<span class="missing-value" role="note" aria-label="${g}" title="${g}">—</span>`, y = l || u ? `<span class="total-wealth-note">${g}</span>` : "", h = `
    <div class="header-meta-row">
      💰 Gesamtvermögen: <strong class="total-wealth-value">${m}</strong>${y}
    </div>
  `, _ = Ct("Übersicht", h), b = mr(s), S = i.filter((w) => (w.currency_code ?? "EUR") === "EUR"), P = i.filter((w) => (w.currency_code ?? "EUR") !== "EUR"), N = P.some((w) => w.fx_unavailable) ? `
        <p class="table-note" role="note">
          <span class="table-note__icon" aria-hidden="true">⚠️</span>
          <span>Wechselkurse konnten nicht geladen werden. EUR-Werte werden derzeit nicht angezeigt.</span>
        </p>
      ` : "", C = `
    <div class="card">
      <h2>Liquidität</h2>
      <div class="scroll-container account-table">
        ${Pe(
    S.map((w) => ({
      name: et(w.name, An(w.badges), {
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
    ${P.length ? `
      <div class="card">
        <h2>Fremdwährungen</h2>
        <div class="scroll-container fx-account-table">
          ${Pe(
    P.map((w) => {
      const E = w.orig_balance, v = typeof E == "number" && Number.isFinite(E) ? `${E.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}&nbsp;${w.currency_code ?? ""}` : "";
      return {
        name: et(w.name, An(w.badges), {
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
        ${N}
      </div>` : ""}
  `, L = `
    <div class="card footer-card">
      <div class="meta">
        <div class="last-file-update">
          📂 Letzte Aktualisierung der Datei: <strong>${a || "Unbekannt"}</strong>
        </div>
      </div>
    </div>
  `, x = `
    ${_.outerHTML}
    <div class="card">
      <h2>Investment</h2>
      <div class="scroll-container portfolio-table">
        ${b}
      </div>
    </div>
    ${C}
    ${L}
  `;
  return Yo(e, s), x;
}
function Yo(e, t) {
  if (!e)
    return;
  const n = () => {
    try {
      const i = e, o = i.querySelector(".portfolio-table");
      o && o.querySelectorAll(".portfolio-toggle").length === 0 && (console.debug("Recovery: Tabelle ohne Buttons – erneuter Aufbau"), o.innerHTML = mr(t)), tn(e), Ko(e), rt.forEach((s) => {
        try {
          Kt(s) && (qe(e, s), ze(e, s));
        } catch (a) {
          console.warn("Init-Sortierung für expandiertes Depot fehlgeschlagen:", s, a);
        }
      });
      try {
        _r(i);
      } catch (s) {
        console.warn("renderDashboard: Footer-Summe konnte nicht aktualisiert werden:", s);
      }
      try {
        Fo(e);
      } catch (s) {
        console.warn("renderDashboard: Pending-Positions konnten nicht angewendet werden:", s);
      }
      console.debug("renderDashboard: portfolio-toggle Buttons:", i.querySelectorAll(".portfolio-toggle").length);
    } catch (i) {
      console.error("renderDashboard: Fehler bei Recovery/Listener", i);
    }
  }, r = typeof requestAnimationFrame == "function" ? (i) => requestAnimationFrame(i) : (i) => setTimeout(i, 0);
  r(() => r(n));
}
Vi({
  renderPositionsTable: (e) => Oo(e),
  applyGainPctMetadata: hr,
  attachSecurityDetailListener: ze,
  attachPortfolioPositionsSorting: qe,
  updatePortfolioFooter: (e) => {
    e && _r(e);
  }
});
const Xo = "http://www.w3.org/2000/svg", $e = 640, Le = 260, Te = { top: 12, right: 16, bottom: 24, left: 16 }, Re = "var(--pp-reader-chart-line, #3f51b5)", Rt = "var(--pp-reader-chart-area, rgba(63, 81, 181, 0.12))", Fn = "0.75rem", br = "var(--pp-reader-chart-baseline, rgba(96, 125, 139, 0.75))", vr = "6 4", Zo = 24 * 60 * 60 * 1e3;
function Jo(e) {
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
function Qo(e) {
  return typeof e == "string" ? e : typeof e == "number" && Number.isFinite(e) ? e.toString() : e instanceof Date && Number.isFinite(e.getTime()) ? e.toISOString() : "";
}
function Z(e) {
  return `${String(e)}px`;
}
function te(e, t = {}) {
  const n = document.createElementNS(Xo, e);
  return Object.entries(t).forEach(([r, i]) => {
    const o = Jo(i);
    o != null && n.setAttribute(r, o);
  }), n;
}
function it(e, t = null) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  if (typeof e == "string" && e.trim() !== "") {
    const n = Number.parseFloat(e);
    if (Number.isFinite(n))
      return n;
  }
  return t;
}
function Sr(e, t) {
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
const Pr = (e) => {
  if (e && typeof e == "object" && "date" in e)
    return e.date;
}, Ar = (e) => {
  if (e && typeof e == "object" && "close" in e)
    return e.close;
}, Nr = (e, t, n) => {
  if (Number.isFinite(e)) {
    const r = new Date(e);
    if (!Number.isNaN(r.getTime()))
      return r.toLocaleDateString("de-DE");
  }
  if (t && typeof t == "object" && "date" in t) {
    const r = t.date, i = Qo(r);
    if (i)
      return i;
  }
  return Number.isFinite(e) ? e.toString() : "";
}, wr = (e, t, n) => (Number.isFinite(e) ? e : it(e, 0) ?? 0).toLocaleString("de-DE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
}), Er = ({ xFormatted: e, yFormatted: t }) => `
    <div class="chart-tooltip-date">${e}</div>
    <div class="chart-tooltip-value">${t}&nbsp;€</div>
  `, Fr = ({
  marker: e,
  xFormatted: t,
  yFormatted: n
}) => `
    <div class="chart-tooltip-date">${(typeof e.label == "string" ? e.label : null) || t}</div>
    <div class="chart-tooltip-value">${n}</div>
  `;
function xr(e) {
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
    width: $e,
    height: Le,
    margin: { ...Te },
    series: [],
    points: [],
    range: null,
    xAccessor: Pr,
    yAccessor: Ar,
    xFormatter: Nr,
    yFormatter: wr,
    tooltipRenderer: Er,
    markerTooltipRenderer: Fr,
    color: Re,
    areaColor: Rt,
    baseline: null,
    handlersAttached: !1,
    markers: [],
    markerPositions: []
  }), e.__chartState;
}
function Q(e, t, n) {
  return !Number.isFinite(e) || e < t ? t : e > n ? n : e;
}
function ea(e, t) {
  if (e.length === 0)
    return "";
  const n = [];
  e.forEach((s, a) => {
    const c = a === 0 ? "M" : "L", l = s.x.toFixed(2), u = s.y.toFixed(2);
    n.push(`${c}${l} ${u}`);
  });
  const r = e[0], o = `L${e[e.length - 1].x.toFixed(2)} ${t.toFixed(2)} L${r.x.toFixed(2)} ${t.toFixed(2)} Z`;
  return `${n.join(" ")} ${o}`;
}
function ta(e) {
  if (e.length === 0)
    return "";
  const t = [];
  return e.forEach((n, r) => {
    const i = r === 0 ? "M" : "L", o = n.x.toFixed(2), s = n.y.toFixed(2);
    t.push(`${i}${o} ${s}`);
  }), t.join(" ");
}
function na(e) {
  const { baselineLine: t, baseline: n } = e;
  if (!t)
    return;
  const r = (n == null ? void 0 : n.color) ?? br, i = (n == null ? void 0 : n.dashArray) ?? vr;
  t.setAttribute("stroke", r), t.setAttribute("stroke-dasharray", i);
}
function At(e) {
  const { baselineLine: t, baseline: n, range: r, margin: i, width: o } = e;
  if (!t)
    return;
  const s = n == null ? void 0 : n.value;
  if (!r || s == null || !Number.isFinite(s)) {
    t.style.opacity = "0";
    return;
  }
  const { minY: a, maxY: c, boundedHeight: l } = r, u = Number.isFinite(a) ? a : s, d = (Number.isFinite(c) ? c : u + 1) - u, g = d === 0 ? 0.5 : (s - u) / d, p = Q(g, 0, 1), m = Math.max(l, 0), y = i.top + (1 - p) * m, h = Math.max(o - i.left - i.right, 0), _ = i.left, b = i.left + h;
  t.setAttribute("x1", _.toFixed(2)), t.setAttribute("x2", b.toFixed(2)), t.setAttribute("y1", y.toFixed(2)), t.setAttribute("y2", y.toFixed(2)), t.style.opacity = "1";
}
function ra(e, t, n) {
  var w;
  const { width: r, height: i, margin: o } = t, { xAccessor: s, yAccessor: a } = n;
  if (e.length === 0)
    return { points: [], range: null };
  const c = e.map((E, I) => {
    const v = s(E, I), F = a(E, I), R = Sr(v, I), G = it(F, Number.NaN);
    return Number.isFinite(G) ? {
      index: I,
      data: E,
      xValue: R,
      yValue: G
    } : null;
  }).filter((E) => !!E);
  if (c.length === 0)
    return { points: [], range: null };
  const l = c.reduce((E, I) => Math.min(E, I.xValue), c[0].xValue), u = c.reduce((E, I) => Math.max(E, I.xValue), c[0].xValue), f = c.reduce((E, I) => Math.min(E, I.yValue), c[0].yValue), d = c.reduce((E, I) => Math.max(E, I.yValue), c[0].yValue), g = Math.max(r - o.left - o.right, 1), p = Math.max(i - o.top - o.bottom, 1), m = Number.isFinite(l) ? l : 0, y = Number.isFinite(u) ? u : m + 1, h = Number.isFinite(f) ? f : 0, _ = Number.isFinite(d) ? d : h + 1, b = it((w = t.baseline) == null ? void 0 : w.value, null), S = b != null && Number.isFinite(b) ? Math.min(h, b) : h, P = b != null && Number.isFinite(b) ? Math.max(_, b) : _, A = Math.max(
    2,
    Math.min(
      6,
      Math.round(
        Math.max(i - o.top - o.bottom, 0) / 60
      ) || 4
    )
  ), { niceMin: N, niceMax: C } = da(
    S,
    P,
    A
  ), L = Number.isFinite(N) ? N : h, x = Number.isFinite(C) ? C : _, k = y - m || 1, T = x - L || 1;
  return {
    points: c.map((E) => {
      const I = k === 0 ? 0.5 : (E.xValue - m) / k, v = T === 0 ? 0.5 : (E.yValue - L) / T, F = o.left + I * g, R = o.top + (1 - v) * p;
      return {
        ...E,
        x: F,
        y: R
      };
    }),
    range: {
      minX: m,
      maxX: y,
      minY: L,
      maxY: x,
      boundedWidth: g,
      boundedHeight: p
    }
  };
}
function Nt(e) {
  const { markerLayer: t, markerOverlay: n, markers: r, range: i, margin: o, markerTooltip: s } = e;
  if (e.markerPositions = [], Ze(e), !t || !n)
    return;
  for (; t.firstChild; )
    t.removeChild(t.firstChild);
  for (; n.firstChild; )
    n.removeChild(n.firstChild);
  if (!i || !Array.isArray(r) || r.length === 0)
    return;
  const a = i.maxX - i.minX || 1, c = i.maxY - i.minY || 1;
  r.forEach((l, u) => {
    const f = Sr(l.x, u), d = it(l.y, Number.NaN), g = Number(d);
    if (!Number.isFinite(f) || !Number.isFinite(g))
      return;
    const p = a === 0 ? 0.5 : Q((f - i.minX) / a, 0, 1), m = c === 0 ? 0.5 : Q((g - i.minY) / c, 0, 1), y = o.left + p * i.boundedWidth, h = o.top + (1 - m) * i.boundedHeight, _ = te("g", {
      class: "line-chart-marker",
      transform: `translate(${y.toFixed(2)} ${h.toFixed(2)})`,
      "data-marker-id": l.id
    }), b = te("circle", {
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
  }), s && (s.style.opacity = "0", s.style.visibility = "hidden");
}
function Cr(e, t, n, r) {
  e.width = Number.isFinite(t) ? Number(t) : $e, e.height = Number.isFinite(n) ? Number(n) : Le, e.margin = {
    top: Number.isFinite(r == null ? void 0 : r.top) ? Number(r == null ? void 0 : r.top) : Te.top,
    right: Number.isFinite(r == null ? void 0 : r.right) ? Number(r == null ? void 0 : r.right) : Te.right,
    bottom: Number.isFinite(r == null ? void 0 : r.bottom) ? Number(r == null ? void 0 : r.bottom) : Te.bottom,
    left: Number.isFinite(r == null ? void 0 : r.left) ? Number(r == null ? void 0 : r.left) : Te.left
  };
}
function ia(e, t) {
  const n = e.xFormatter(t.xValue, t.data, t.index), r = e.yFormatter(t.yValue, t.data, t.index);
  return e.tooltipRenderer({
    point: t,
    xFormatted: n,
    yFormatted: r,
    data: t.data,
    index: t.index
  });
}
function oa(e, t, n) {
  const { tooltip: r, width: i, margin: o, height: s } = e;
  if (!r)
    return;
  const a = s - o.bottom;
  r.style.visibility = "visible", r.style.opacity = "1";
  const c = r.offsetWidth || 0, l = r.offsetHeight || 0, u = Q(t.x - c / 2, o.left, i - o.right - c), f = Math.max(a - l, 0), d = 12, g = Number.isFinite(n) ? Q(n ?? 0, o.top, a) : t.y;
  let p = g - l - d;
  p < o.top && (p = g + d), p = Q(p, 0, f);
  const m = Z(Math.round(u)), y = Z(Math.round(p));
  r.style.transform = `translate(${m}, ${y})`;
}
function $t(e) {
  const { tooltip: t, focusLine: n, focusCircle: r } = e;
  t && (t.style.opacity = "0", t.style.visibility = "hidden"), n && (n.style.opacity = "0"), r && (r.style.opacity = "0");
}
function aa(e, t) {
  const { marker: n } = t, r = e.xFormatter(t.marker.x, n, -1), i = e.yFormatter(t.marker.y, n, -1);
  return e.markerTooltipRenderer({
    marker: n,
    xFormatted: r,
    yFormatted: i
  });
}
function sa(e, t, n) {
  var A;
  const { markerTooltip: r, width: i, margin: o, height: s, tooltip: a } = e;
  if (!r)
    return;
  const c = s - o.bottom;
  r.style.visibility = "visible", r.style.opacity = "1";
  const l = r.offsetWidth || 0, u = r.offsetHeight || 0, f = Q(t.x - l / 2, o.left, i - o.right - l), d = Math.max(c - u, 0), g = 10, p = a == null ? void 0 : a.getBoundingClientRect(), m = (A = e.svg) == null ? void 0 : A.getBoundingClientRect(), y = p && m ? p.top - m.top : null, h = p && m ? p.bottom - m.top : null, _ = Number.isFinite(n) ? Q(n ?? t.y, o.top, c) : t.y;
  let b;
  y != null && h != null ? y <= _ ? b = y - u - g : b = h + g : (b = _ - u - g, b < o.top && (b = _ + g)), b = Q(b, 0, d);
  const S = Z(Math.round(f)), P = Z(Math.round(b));
  r.style.transform = `translate(${S}, ${P})`;
}
function Ze(e) {
  const { markerTooltip: t } = e;
  t && (t.style.opacity = "0", t.style.visibility = "hidden");
}
function ca(e, t, n) {
  let i = null, o = 24 * 24;
  for (const s of e.markerPositions) {
    const a = s.x - t, c = s.y - n, l = a * a + c * c;
    l <= o && (i = s, o = l);
  }
  return i;
}
function la(e, t) {
  if (t.handlersAttached || !t.overlay)
    return;
  const n = (i) => {
    if (t.points.length === 0 || !t.svg) {
      $t(t), Ze(t);
      return;
    }
    const o = t.svg.getBoundingClientRect(), s = i.clientX - o.left, a = i.clientY - o.top;
    let c = t.points[0], l = Math.abs(s - c.x);
    for (let f = 1; f < t.points.length; f += 1) {
      const d = t.points[f], g = Math.abs(s - d.x);
      g < l && (l = g, c = d);
    }
    t.focusCircle && (t.focusCircle.setAttribute("cx", c.x.toFixed(2)), t.focusCircle.setAttribute("cy", c.y.toFixed(2)), t.focusCircle.style.opacity = "1"), t.focusLine && (t.focusLine.setAttribute("x1", c.x.toFixed(2)), t.focusLine.setAttribute("x2", c.x.toFixed(2)), t.focusLine.setAttribute("y1", t.margin.top.toFixed(2)), t.focusLine.setAttribute(
      "y2",
      (t.height - t.margin.bottom).toFixed(2)
    ), t.focusLine.style.opacity = "1"), t.tooltip && (t.tooltip.innerHTML = ia(t, c), oa(t, c, a));
    const u = ca(t, s, a);
    u && t.markerTooltip ? (t.markerTooltip.innerHTML = aa(t, u), sa(t, u, a)) : Ze(t);
  }, r = () => {
    $t(t), Ze(t);
  };
  t.overlay.addEventListener("pointermove", n), t.overlay.addEventListener("pointerenter", n), t.overlay.addEventListener("pointerleave", r), t.handlersAttached = !0, t.handlePointerMove = n, t.handlePointerLeave = r, e.addEventListener("pointercancel", r);
}
function ua(e, t = {}) {
  const n = document.createElement("div");
  n.className = "line-chart-container", n.dataset.chartType = "line", n.style.position = "relative";
  const r = te("svg", {
    width: $e,
    height: Le,
    viewBox: `0 0 ${String($e)} ${String(Le)}`,
    role: "img",
    "aria-hidden": "true",
    focusable: "false"
  });
  r.classList.add("line-chart-svg");
  const i = te("path", {
    class: "line-chart-area",
    fill: Rt,
    stroke: "none"
  }), o = te("line", {
    class: "line-chart-baseline",
    stroke: br,
    "stroke-width": 1,
    "stroke-dasharray": vr,
    opacity: 0
  }), s = te("path", {
    class: "line-chart-path",
    fill: "none",
    stroke: Re,
    "stroke-width": 2,
    "stroke-linecap": "round",
    "stroke-linejoin": "round"
  }), a = te("line", {
    class: "line-chart-focus-line",
    stroke: Re,
    "stroke-width": 1,
    "stroke-dasharray": "4 4",
    opacity: 0
  }), c = te("circle", {
    class: "line-chart-focus-circle",
    r: 4,
    fill: "#fff",
    stroke: Re,
    "stroke-width": 2,
    opacity: 0
  }), l = te("g", {
    class: "line-chart-markers"
  }), u = te("rect", {
    class: "line-chart-overlay",
    fill: "transparent",
    x: 0,
    y: 0,
    width: $e,
    height: Le
  });
  r.appendChild(i), r.appendChild(o), r.appendChild(s), r.appendChild(a), r.appendChild(c), r.appendChild(l), r.appendChild(u), n.appendChild(r);
  const f = document.createElement("div");
  f.className = "chart-tooltip", f.style.position = "absolute", f.style.top = "0", f.style.left = "0", f.style.pointerEvents = "none", f.style.opacity = "0", f.style.visibility = "hidden", n.appendChild(f);
  const d = document.createElement("div");
  d.className = "line-chart-marker-overlay", d.style.position = "absolute", d.style.top = "0", d.style.left = "0", d.style.width = "100%", d.style.height = "100%", d.style.pointerEvents = "none", d.style.overflow = "visible", d.style.zIndex = "2", n.appendChild(d);
  const g = document.createElement("div");
  g.className = "chart-tooltip chart-tooltip--marker", g.style.position = "absolute", g.style.top = "0", g.style.left = "0", g.style.pointerEvents = "none", g.style.opacity = "0", g.style.visibility = "hidden", n.appendChild(g), e.appendChild(n);
  const p = xr(n);
  if (p.svg = r, p.areaPath = i, p.linePath = s, p.baselineLine = o, p.focusLine = a, p.focusCircle = c, p.overlay = u, p.tooltip = f, p.markerOverlay = d, p.markerLayer = l, p.markerTooltip = g, p.xAccessor = t.xAccessor ?? Pr, p.yAccessor = t.yAccessor ?? Ar, p.xFormatter = t.xFormatter ?? Nr, p.yFormatter = t.yFormatter ?? wr, p.tooltipRenderer = t.tooltipRenderer ?? Er, p.markerTooltipRenderer = t.markerTooltipRenderer ?? Fr, p.color = t.color ?? Re, p.areaColor = t.areaColor ?? Rt, p.baseline = t.baseline ?? null, p.handlersAttached = !1, p.markers = Array.isArray(t.markers) ? t.markers.slice() : [], !p.xAxis) {
    const m = document.createElement("div");
    m.className = "line-chart-axis line-chart-axis-x", m.style.position = "absolute", m.style.left = "0", m.style.right = "0", m.style.bottom = "0", m.style.pointerEvents = "none", m.style.fontSize = Fn, m.style.color = "var(--secondary-text-color)", m.style.display = "block", n.appendChild(m), p.xAxis = m;
  }
  if (!p.yAxis) {
    const m = document.createElement("div");
    m.className = "line-chart-axis line-chart-axis-y", m.style.position = "absolute", m.style.top = "0", m.style.bottom = "0", m.style.left = "0", m.style.pointerEvents = "none", m.style.fontSize = Fn, m.style.color = "var(--secondary-text-color)", m.style.display = "block", n.appendChild(m), p.yAxis = m;
  }
  return Cr(p, t.width, t.height, t.margin), s.setAttribute("stroke", p.color), a.setAttribute("stroke", p.color), c.setAttribute("stroke", p.color), i.setAttribute("fill", p.areaColor), Dr(n, t), la(n, p), n;
}
function Dr(e, t = {}) {
  if (!e) {
    console.error("updateLineChart: container element is required");
    return;
  }
  const n = xr(e);
  if (!n.svg || !n.linePath || !n.overlay) {
    console.error("updateLineChart: chart was not initialised with renderLineChart");
    return;
  }
  t.xAccessor && (n.xAccessor = t.xAccessor), t.yAccessor && (n.yAccessor = t.yAccessor), t.xFormatter && (n.xFormatter = t.xFormatter), t.yFormatter && (n.yFormatter = t.yFormatter), t.tooltipRenderer && (n.tooltipRenderer = t.tooltipRenderer), t.markerTooltipRenderer && (n.markerTooltipRenderer = t.markerTooltipRenderer), t.color && (n.color = t.color, n.linePath.setAttribute("stroke", n.color), n.focusLine && n.focusLine.setAttribute("stroke", n.color), n.focusCircle && n.focusCircle.setAttribute("stroke", n.color)), t.areaColor && (n.areaColor = t.areaColor, n.areaPath && n.areaPath.setAttribute("fill", n.areaColor)), Object.prototype.hasOwnProperty.call(t, "baseline") && (n.baseline = t.baseline ?? null), Array.isArray(t.markers) && (n.markers = t.markers.slice()), na(n), Cr(n, t.width, t.height, t.margin);
  const { width: r, height: i } = n;
  n.svg.setAttribute("width", String(r)), n.svg.setAttribute("height", String(i)), n.svg.setAttribute("viewBox", `0 0 ${String(r)} ${String(i)}`), n.overlay.setAttribute("x", "0"), n.overlay.setAttribute("y", "0"), n.overlay.setAttribute("width", Math.max(r, 0).toFixed(2)), n.overlay.setAttribute("height", Math.max(i, 0).toFixed(2)), Array.isArray(t.series) && (n.series = Array.from(t.series));
  const { points: o, range: s } = ra(n.series, n, {
    xAccessor: n.xAccessor,
    yAccessor: n.yAccessor
  });
  if (n.points = o, n.range = s, o.length === 0) {
    n.linePath.setAttribute("d", ""), n.areaPath && n.areaPath.setAttribute("d", ""), $t(n), Nt(n), wt(n), At(n);
    return;
  }
  if (o.length === 1) {
    const c = o[0], l = Math.max(
      0.5,
      Math.min(4, Math.max(n.width - n.margin.left - n.margin.right, 1) * 0.01)
    ), u = `M${c.x.toFixed(2)} ${c.y.toFixed(2)} h${l.toFixed(2)}`;
    n.linePath.setAttribute("d", u), n.areaPath && n.areaPath.setAttribute("d", ""), n.focusCircle && (n.focusCircle.setAttribute("cx", c.x.toFixed(2)), n.focusCircle.setAttribute("cy", c.y.toFixed(2)), n.focusCircle.style.opacity = "1"), n.focusLine && (n.focusLine.style.opacity = "0"), wt(n), At(n), Nt(n);
    return;
  }
  const a = ta(o);
  if (n.linePath.setAttribute("d", a), n.areaPath && s) {
    const c = n.margin.top + s.boundedHeight, l = ea(o, c);
    n.areaPath.setAttribute("d", l);
  }
  wt(n), At(n), Nt(n);
}
function wt(e) {
  const { xAxis: t, yAxis: n, range: r, margin: i, height: o, yFormatter: s } = e;
  if (!t || !n)
    return;
  if (!r) {
    t.innerHTML = "", n.innerHTML = "";
    return;
  }
  const { minX: a, maxX: c, minY: l, maxY: u, boundedWidth: f, boundedHeight: d } = r, g = Number.isFinite(a) && Number.isFinite(c) && c >= a, p = Number.isFinite(l) && Number.isFinite(u) && u >= l, m = Math.max(f, 0), y = Math.max(d, 0);
  if (t.style.left = Z(i.left), t.style.width = Z(m), t.style.top = Z(o - i.bottom + 6), t.innerHTML = "", g && m > 0) {
    const _ = (c - a) / Zo, b = Math.max(2, Math.min(6, Math.round(m / 140) || 4));
    fa(e, a, c, b, _).forEach(({ positionRatio: P, label: A }) => {
      const N = document.createElement("div");
      N.className = "line-chart-axis-tick line-chart-axis-tick-x", N.style.position = "absolute", N.style.bottom = "0";
      const C = Q(P, 0, 1);
      N.style.left = Z(C * m);
      let L = "-50%", x = "center";
      C <= 1e-3 ? (L = "0", x = "left", N.style.marginLeft = "2px") : C >= 0.999 && (L = "-100%", x = "right", N.style.marginRight = "2px"), N.style.transform = `translateX(${L})`, N.style.textAlign = x, N.textContent = A, t.appendChild(N);
    });
  }
  n.style.top = Z(i.top), n.style.height = Z(y);
  const h = Math.max(i.left - 6, 0);
  if (n.style.left = "0", n.style.width = Z(Math.max(h, 0)), n.innerHTML = "", p && y > 0) {
    const _ = Math.max(2, Math.min(6, Math.round(y / 60) || 4)), b = ga(l, u, _), S = s;
    b.forEach(({ value: P, positionRatio: A }) => {
      const N = document.createElement("div");
      N.className = "line-chart-axis-tick line-chart-axis-tick-y", N.style.position = "absolute", N.style.left = "0";
      const L = (1 - Q(A, 0, 1)) * y;
      N.style.top = Z(L), N.textContent = S(P, null, -1), n.appendChild(N);
    });
  }
}
function da(e, t, n = 4) {
  if (!Number.isFinite(e) || !Number.isFinite(t))
    return {
      niceMin: e,
      niceMax: t
    };
  const r = Math.max(2, n);
  if (t === e) {
    const l = Lt(Math.abs(e) || 1);
    return {
      niceMin: e - l,
      niceMax: t + l
    };
  }
  const o = (t - e) / (r - 1), s = Lt(o), a = Math.floor(e / s) * s, c = Math.ceil(t / s) * s;
  return a === c ? {
    niceMin: e,
    niceMax: t + s
  } : {
    niceMin: a,
    niceMax: c
  };
}
function fa(e, t, n, r, i) {
  if (!Number.isFinite(t) || !Number.isFinite(n) || n < t)
    return [];
  if (!Number.isFinite(i) || i <= 0)
    return [
      {
        positionRatio: 0.5,
        label: xn(e, t, i || 0)
      }
    ];
  const o = Math.max(2, r), s = [], a = n - t;
  for (let c = 0; c < o; c += 1) {
    const l = o === 1 ? 0.5 : c / (o - 1), u = t + l * a;
    s.push({
      positionRatio: l,
      label: xn(e, u, i)
    });
  }
  return s;
}
function xn(e, t, n) {
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
function ga(e, t, n) {
  if (!Number.isFinite(e) || !Number.isFinite(t))
    return [];
  if (t === e)
    return [
      {
        value: e,
        positionRatio: 0.5
      }
    ];
  const r = t - e, i = Math.max(2, n), o = r / (i - 1), s = Lt(o), a = Math.floor(e / s) * s, c = Math.ceil(t / s) * s, l = [];
  for (let u = a; u <= c + s / 2; u += s) {
    const f = (u - e) / (t - e);
    l.push({
      value: u,
      positionRatio: Q(f, 0, 1)
    });
  }
  return l.length > i + 2 ? l.filter((u, f) => f % 2 === 0) : l;
}
function Lt(e) {
  if (!Number.isFinite(e) || e === 0)
    return 1;
  const t = Math.floor(Math.log10(Math.abs(e))), n = Math.abs(e) / 10 ** t;
  let r;
  return n <= 1 ? r = 1 : n <= 2 ? r = 2 : n <= 5 ? r = 5 : r = 10, r * 10 ** t;
}
function pa(e) {
  return Array.isArray(e) && e.every((t) => typeof t == "string");
}
function ha(e) {
  return typeof e == "object" && e !== null;
}
function ma(e) {
  if (!ha(e))
    return !1;
  const t = e;
  return typeof t.portfolioUuid != "string" ? !1 : pa(t.securityUuids);
}
function _a(e) {
  return e instanceof CustomEvent ? ma(e.detail) : !1;
}
const Et = { min: 0, max: 6 }, ot = { min: 2, max: 4 }, ya = "1Y", kr = [
  "1M",
  "6M",
  "1Y",
  "5Y",
  "ALL"
], ba = {
  "1M": 30,
  "6M": 182,
  "1Y": 365,
  "5Y": 1826,
  ALL: Number.POSITIVE_INFINITY
}, va = /* @__PURE__ */ new Set([0, 2]), Sa = /* @__PURE__ */ new Set([1, 3]), Pa = "var(--pp-reader-chart-marker-buy, #2e7d32)", Aa = "var(--pp-reader-chart-marker-sell, #c0392b)", Ft = {
  aggregation: "Aggregationsdaten",
  totals: "Kaufsummen",
  eur_total: "EUR-Kaufsumme"
}, be = /* @__PURE__ */ new Map(), Je = /* @__PURE__ */ new Map(), Oe = /* @__PURE__ */ new Map(), ve = /* @__PURE__ */ new Map(), Tr = "pp-reader:portfolio-positions-updated", Me = /* @__PURE__ */ new Map();
function Na(e) {
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
function wa(e, t) {
  if (e) {
    if (t) {
      Oe.set(e, t);
      return;
    }
    Oe.delete(e);
  }
}
function Ea(e) {
  if (!e || typeof window > "u")
    return null;
  if (Oe.has(e)) {
    const t = Oe.get(e) || null;
    if (t)
      return t;
  }
  return null;
}
function Rr(e) {
  return be.has(e) || be.set(e, /* @__PURE__ */ new Map()), be.get(e);
}
function $r(e) {
  return ve.has(e) || ve.set(e, /* @__PURE__ */ new Map()), ve.get(e);
}
function Lr(e) {
  if (e) {
    if (be.has(e)) {
      try {
        const t = be.get(e);
        t && t.clear();
      } catch (t) {
        console.warn("invalidateHistoryCache: Konnte Cache nicht leeren", e, t);
      }
      be.delete(e);
    }
    if (ve.has(e)) {
      try {
        const t = ve.get(e);
        t == null || t.clear();
      } catch (t) {
        console.warn("invalidateHistoryCache: Konnte Marker-Cache nicht leeren", e, t);
      }
      ve.delete(e);
    }
  }
}
function Mr(e) {
  e && Oe.delete(e);
}
function Fa(e, t) {
  if (!e || !t)
    return;
  const n = t.securityUuids;
  (Array.isArray(n) ? n : []).includes(e) && (Lr(e), Mr(e));
}
function xa(e) {
  if (!e || Me.has(e))
    return;
  const t = (n) => {
    _a(n) && Fa(e, n.detail);
  };
  try {
    window.addEventListener(Tr, t), Me.set(e, t);
  } catch (n) {
    console.error("ensureLiveUpdateSubscription: Registrierung fehlgeschlagen", n);
  }
}
function Ca(e) {
  if (!e || !Me.has(e))
    return;
  const t = Me.get(e);
  try {
    t && window.removeEventListener(Tr, t);
  } catch (n) {
    console.error("removeLiveUpdateSubscription: Entfernen des Listeners fehlgeschlagen", n);
  }
  Me.delete(e);
}
function Da(e) {
  e && (Ca(e), Lr(e), Mr(e));
}
function Cn(e, t) {
  if (!Je.has(e)) {
    Je.set(e, { activeRange: t });
    return;
  }
  const n = Je.get(e);
  n && (n.activeRange = t);
}
function Hr(e) {
  var t;
  return ((t = Je.get(e)) == null ? void 0 : t.activeRange) ?? ya;
}
function Mt(e) {
  const t = Date.UTC(
    e.getUTCFullYear(),
    e.getUTCMonth(),
    e.getUTCDate()
  );
  return Math.floor(t / 864e5);
}
function Ae(e) {
  const t = new Date(e.getTime());
  return t.setUTCHours(0, 0, 0, 0), t;
}
function Dn(e) {
  return !(e instanceof Date) || Number.isNaN(e.getTime()) ? null : Mt(Ae(e));
}
function $(e) {
  return ae(e);
}
function ka(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t || null;
}
function Ne(e) {
  const t = ka(e);
  return t ? t.toUpperCase() : null;
}
function Ta(e) {
  if (!e)
    return null;
  const t = Yt(e.aggregation), n = $(t == null ? void 0 : t.purchase_total_security) ?? $(t == null ? void 0 : t.security_currency_total), r = $(t == null ? void 0 : t.purchase_total_account) ?? $(t == null ? void 0 : t.account_currency_total);
  if (ne(n) && ne(r)) {
    const a = n / r;
    if (ne(a))
      return a;
  }
  const i = Ee(e.average_cost), o = $(i == null ? void 0 : i.native) ?? $(i == null ? void 0 : i.security), s = $(i == null ? void 0 : i.account) ?? $(i == null ? void 0 : i.eur);
  if (ne(o) && ne(s)) {
    const a = o / s;
    if (ne(a))
      return a;
  }
  return null;
}
function Ir(e, t = "Unbekannter Fehler") {
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
function at(e, t) {
  const n = Ae(t instanceof Date ? t : /* @__PURE__ */ new Date()), r = ba[e], i = Dn(n), o = {};
  if (i != null && (o.end_date = i), Number.isFinite(r) && r > 0) {
    const s = new Date(n.getTime());
    s.setUTCDate(s.getUTCDate() - (r - 1));
    const a = Dn(s);
    a != null && (o.start_date = a);
  }
  return o;
}
function nn(e) {
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
      return Number.isNaN(n.getTime()) ? null : Ae(n);
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
          return Ae(r);
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
function Ra(e) {
  const t = nn(e);
  if (t)
    return t;
  if (typeof e == "string") {
    const n = e.trim();
    if (!n)
      return null;
    const r = Date.parse(n);
    if (Number.isFinite(r)) {
      const i = new Date(r);
      return Number.isNaN(i.getTime()) ? null : i;
    }
  }
  return null;
}
function st(e) {
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
function Ht(e) {
  return Array.isArray(e) ? e.map((t) => {
    let r = $(t.close);
    if (r == null) {
      const o = $(t.close_raw);
      o != null && (r = o / 1e8);
    }
    return r == null ? null : {
      date: nn(t.date) ?? t.date,
      close: r
    };
  }).filter((t) => !!t) : [];
}
function ct(e, t, n = null) {
  if (!Array.isArray(e))
    return [];
  const r = [], i = Ne(t), o = i || "EUR", s = Ta(n);
  return e.forEach((a, c) => {
    const l = typeof a.type == "number" ? a.type : Number(a.type), u = va.has(l), f = Sa.has(l);
    if (!u && !f)
      return;
    const d = Ra(a.date);
    let g = $(a.price);
    if (!d || g == null)
      return;
    const p = Ne(a.currency_code), m = i ?? p ?? o;
    p && i && p !== i && ne(s) && (g *= s);
    const y = $(a.shares), h = $(a.net_price_eur), _ = u ? "Kauf" : "Verkauf", b = y != null ? `${qr(y)} @ ` : "", S = `${_} ${b}${ge(g)} ${m}`, P = f && h != null ? `${S} (netto ${ge(h)} EUR)` : S, A = u ? Pa : Aa, N = typeof a.uuid == "string" && a.uuid.trim() || `${_}-${d.getTime().toString()}-${c.toString()}`;
    r.push({
      id: N,
      x: d.getTime(),
      y: g,
      color: A,
      label: P,
      payload: {
        type: _,
        currency: m,
        transactionCurrency: p,
        shares: y,
        price: g,
        netPriceEur: h,
        date: d.toISOString(),
        portfolio: a.portfolio
      }
    });
  }), r;
}
function rn(e) {
  var r;
  const t = $(e == null ? void 0 : e.last_price_native) ?? $((r = e == null ? void 0 : e.last_price) == null ? void 0 : r.native) ?? null;
  if (D(t))
    return t;
  if (Ne(e == null ? void 0 : e.currency_code) === "EUR") {
    const i = $(e == null ? void 0 : e.last_price_eur);
    if (D(i))
      return i;
  }
  return null;
}
function $a(e) {
  if (!e)
    return null;
  const n = e.last_price_fetched_at, r = st(n);
  if (r != null)
    return r;
  const i = e.last_price, o = i == null ? void 0 : i.fetched_at;
  return st(o) ?? null;
}
function It(e, t) {
  let n = [];
  Array.isArray(e) && (n = e.map((l) => ({
    ...l
  })));
  const r = n.slice(), i = rn(t);
  if (!D(i))
    return r;
  const o = $a(t) ?? Date.now(), s = new Date(o);
  if (Number.isNaN(s.getTime()))
    return r;
  const a = Mt(Ae(s));
  let c = null;
  for (let l = r.length - 1; l >= 0; l -= 1) {
    const u = r[l], f = nn(u.date);
    if (!f)
      continue;
    const d = Mt(Ae(f));
    if (c == null && (c = d), d === a)
      return u.close !== i && (r[l] = { ...u, close: i }), r;
    if (d < a)
      break;
  }
  return c != null && c > a || r.push({
    date: s,
    close: i
  }), r;
}
function D(e) {
  return typeof e == "number" && Number.isFinite(e);
}
function ne(e) {
  return typeof e == "number" && Number.isFinite(e) && e > 0;
}
function He(e, t, n) {
  if (!D(e) || !D(t))
    return !1;
  const r = Math.abs(e - t), i = Math.max(Math.abs(e), Math.abs(t), 1);
  return r <= i * 1e-4;
}
function La(e, t) {
  return !D(t) || t === 0 || !D(e) ? null : zi((e - t) / t * 100);
}
function Vr(e, t) {
  if (e.length === 0)
    return { priceChange: null, priceChangePct: null };
  const n = e[0], r = $(n.close);
  if (!D(r) || r === 0)
    return { priceChange: null, priceChangePct: null };
  const i = e[e.length - 1], o = $(i.close), s = $(t) ?? o;
  if (!D(s))
    return { priceChange: null, priceChangePct: null };
  const a = s - r, c = Object.is(a, -0) ? 0 : a, l = La(s, r);
  return { priceChange: c, priceChangePct: l };
}
function on(e, t) {
  if (!D(e) || e === 0)
    return "neutral";
  const n = 0.5 / Math.pow(10, t);
  return Math.abs(e) < n ? "neutral" : e > 0 ? "positive" : "negative";
}
function Ma(e, t) {
  if (!D(e))
    return '<span class="value neutral">—</span>';
  const n = ge(e);
  if (n === "—")
    return '<span class="value neutral">—</span>';
  const r = on(e, ot.max), i = t ? `&nbsp;${t}` : "";
  return `<span class="value ${r}">${n}${i}</span>`;
}
function Ha(e) {
  return D(e) ? `<span class="value ${on(e, 2)} value--percentage">${ce(e)}&nbsp;%</span>` : '<span class="value neutral">—</span>';
}
function Ur(e, t, n, r) {
  const i = e, o = i.length > 0 ? i : "Zeitraum";
  return `
    <div class="security-info-bar" data-range="${i}">
      <div class="security-info-item">
        <span class="label">Preisänderung (${o})</span>
        <div class="value-row">
          ${Ma(t, r)}
          ${Ha(n)}
        </div>
      </div>
    </div>
  `;
}
function Ia(e) {
  return `
    <div class="security-range-selector" role="group" aria-label="Zeitraum">
      ${kr.map((n) => `
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
function zr(e, t = { status: "empty" }) {
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
      const r = Ir(
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
function qr(e) {
  const t = $(e);
  if (t == null)
    return "—";
  const n = Math.abs(t % 1) > 0, r = n ? 2 : Et.min, i = n ? Et.max : Et.min;
  return t.toLocaleString("de-DE", {
    minimumFractionDigits: r,
    maximumFractionDigits: i
  });
}
function ge(e) {
  const t = $(e);
  return t == null ? "—" : t.toLocaleString("de-DE", {
    minimumFractionDigits: ot.min,
    maximumFractionDigits: ot.max
  });
}
function Va(e, t) {
  const n = ge(e), r = `&nbsp;${t}`;
  return `<span class="${on(e, ot.max)}">${n}${r}</span>`;
}
function Or(e) {
  return e == null ? "" : (typeof e == "string" ? e : String(e)).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function Ua(e, t) {
  const n = e == null ? void 0 : e.ticker_symbol;
  if (typeof n == "string" && n.trim())
    return n.trim();
  const r = typeof (e == null ? void 0 : e.name) == "string" ? e.name.trim() : "";
  return r || (typeof t == "string" ? t : "");
}
function za(e) {
  return `
    <div class="news-prompt-container">
      <button
        type="button"
        class="news-prompt-button"
        data-symbol="${Or(e)}"
      >
        Check recent news via ChatGPT
      </button>
    </div>
  `;
}
async function qa(e) {
  typeof navigator > "u" || "clipboard" in navigator && typeof navigator.clipboard.writeText == "function" && await navigator.clipboard.writeText(e);
}
function Oa(e, t, n) {
  const r = Ee(e == null ? void 0 : e.average_cost), i = (r == null ? void 0 : r.account) ?? (D(t) ? t : $(t));
  if (!D(i))
    return null;
  const o = (e == null ? void 0 : e.account_currency_code) ?? (e == null ? void 0 : e.account_currency);
  if (typeof o == "string" && o.trim())
    return o.trim().toUpperCase();
  const s = Ne(e == null ? void 0 : e.currency_code) ?? "", a = (r == null ? void 0 : r.security) ?? (r == null ? void 0 : r.native) ?? (D(n) ? n : $(n)), c = Yt(e == null ? void 0 : e.aggregation);
  if (s && D(a) && He(i, a))
    return s;
  const l = $(c == null ? void 0 : c.purchase_total_security) ?? $(e == null ? void 0 : e.purchase_total_security), u = $(c == null ? void 0 : c.purchase_total_account) ?? $(e == null ? void 0 : e.purchase_total_account);
  let f = null;
  if (D(l) && l !== 0 && D(u) && (f = u / l), (r == null ? void 0 : r.source) === "eur_total")
    return "EUR";
  const g = r == null ? void 0 : r.eur;
  if (D(g) && He(i, g))
    return "EUR";
  const p = $(e == null ? void 0 : e.purchase_value_eur);
  return D(p) ? "EUR" : f != null && He(f, 1) ? s || null : s === "EUR" ? "EUR" : s || "EUR";
}
function kn(e) {
  return typeof e != "number" || !Number.isFinite(e) || e <= 0 ? null : e.toLocaleString("de-DE", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
  });
}
function Wa(e) {
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
    const s = t == null ? void 0 : t[o], a = st(s);
    if (a != null)
      return a;
  }
  const r = [];
  t && "last_price_fetched_at" in t && r.push(t.last_price_fetched_at);
  const i = e == null ? void 0 : e.last_price;
  i && typeof i == "object" && r.push(i.fetched_at), t && "last_price_date" in t && r.push(t.last_price_date);
  for (const o of r) {
    const s = st(o);
    if (s != null)
      return s;
  }
  return null;
}
function Ba(e) {
  if (e == null || !Number.isFinite(e))
    return null;
  const t = new Date(e);
  return Number.isNaN(t.getTime()) ? null : t.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}
function ja(e, t) {
  if (!e)
    return null;
  const n = Ne(e.currency_code) ?? "", r = Ee(e.average_cost);
  if (!r || !n)
    return null;
  const i = r.native ?? r.security ?? null;
  let s = r.account ?? r.eur ?? null, a = Ne(t) ?? "";
  if (ne(r.eur) && (!a || a === n) && (s = r.eur, a = "EUR"), !n || !a || n === a || !ne(i) || !ne(s))
    return null;
  const c = s / i;
  if (!Number.isFinite(c) || c <= 0)
    return null;
  const l = kn(c);
  if (!l)
    return null;
  let u = null;
  if (c > 0) {
    const _ = 1 / c;
    Number.isFinite(_) && _ > 0 && (u = kn(_));
  }
  const f = Wa(e), d = Ba(f), g = [`FX-Kurs (Kauf): 1 ${n} = ${l} ${a}`];
  u && g.push(`1 ${a} = ${u} ${n}`);
  const p = [], m = r.source, y = m in Ft ? Ft[m] : Ft.aggregation;
  if (p.push(`Quelle: ${y}`), D(r.coverage_ratio)) {
    const _ = Math.min(Math.max(r.coverage_ratio * 100, 0), 100);
    p.push(
      `Abdeckung: ${_.toLocaleString("de-DE", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      })}%`
    );
  }
  p.length && g.push(...p);
  const h = d ?? "Datum unbekannt";
  return `${g.join(" · ")} (Stand: ${h})`;
}
function Tn(e) {
  if (!e)
    return null;
  const t = Ee(e.average_cost), n = (t == null ? void 0 : t.native) ?? (t == null ? void 0 : t.security) ?? null;
  return D(n) ? n : null;
}
function Rn(e) {
  var W;
  if (!e)
    return '<div class="meta-error">Keine Snapshot-Daten verfügbar.</div>';
  const t = e.currency_code || "EUR", n = e.total_holdings_precise ?? e.total_holdings, r = qr(n), i = e.last_price_native ?? ((W = e.last_price) == null ? void 0 : W.native) ?? e.last_price_eur, o = ge(i), s = o === "—" ? null : `${o}${`&nbsp;${t}`}`, a = $(e.market_value_eur) ?? $(e.current_value_eur) ?? null, c = Ee(e.average_cost), l = (c == null ? void 0 : c.native) ?? (c == null ? void 0 : c.security) ?? null, u = (c == null ? void 0 : c.eur) ?? null, d = (c == null ? void 0 : c.account) ?? null ?? u, g = pe(e.performance), p = (g == null ? void 0 : g.day_change) ?? null, m = (p == null ? void 0 : p.price_change_native) ?? null, y = (p == null ? void 0 : p.price_change_eur) ?? null, h = D(m) ? m : y, _ = D(m) ? t : "EUR", b = (U, B = "") => {
    const z = ["value"];
    return B && z.push(...B.split(" ").filter(Boolean)), `<span class="${z.join(" ")}">${U}</span>`;
  }, S = (U = "") => {
    const B = ["value--missing"];
    return U && B.push(U), b("—", B.join(" "));
  }, P = (U, B = "") => {
    if (!D(U))
      return S(B);
    const z = ["value--gain"];
    return B && z.push(B), b(Pi(U), z.join(" "));
  }, A = (U, B = "") => {
    if (!D(U))
      return S(B);
    const z = ["value--gain-percentage"];
    return B && z.push(B), b(Ai(U), z.join(" "));
  }, N = s ? b(s, "value--price") : S("value--price"), C = r === "—" ? S("value--holdings") : b(r, "value--holdings"), L = D(a) ? b(`${ce(a)}&nbsp;€`, "value--market-value") : S("value--market-value"), x = D(h) ? b(
    Va(h, _),
    "value--gain value--absolute"
  ) : S("value--absolute"), k = A(
    p == null ? void 0 : p.change_pct,
    "value--percentage"
  ), T = P(
    g == null ? void 0 : g.total_change_eur,
    "value--absolute"
  ), M = A(
    g == null ? void 0 : g.total_change_pct,
    "value--percentage"
  ), w = Oa(
    e,
    d,
    l
  ), E = ja(
    e,
    w
  ), I = E ? ` title="${Or(E)}"` : "", v = [], F = D(u);
  D(l) ? v.push(
    b(
      `${ge(l)}${`&nbsp;${t}`}`,
      "value--average value--average-native"
    )
  ) : v.push(
    S("value--average value--average-native")
  );
  let R = null, G = null;
  return F && (t !== "EUR" || !D(l) || !He(u, l)) ? (R = u, G = "EUR") : D(d) && w && (w !== t || !He(d, l ?? NaN)) && (R = d, G = w), R != null && D(R) && v.push(
    b(
      `${ge(R)}${G ? `&nbsp;${G}` : ""}`,
      "value--average value--average-eur"
    )
  ), `
    <div class="security-meta-grid security-meta-grid--expanded">
      <div class="security-meta-item security-meta-item--price">
        <span class="label">Letzter Preis</span>
        <div class="value-group">${N}</div>
      </div>
      <div class="security-meta-item security-meta-item--average">
        <span class="label">Durchschnittlicher Kaufpreis</span>
        <div class="value-group"${I}>
          ${v.join("")}
        </div>
      </div>
      <div class="security-meta-item security-meta-item--day-change">
        <span class="label">Tagesänderung</span>
        <div class="value-group">
          ${x}
          ${k}
        </div>
      </div>
      <div class="security-meta-item security-meta-item--total-change">
        <span class="label">Gesamtänderung</span>
        <div class="value-group">
          ${T}
          ${M}
        </div>
      </div>
      <div class="security-meta-item security-meta-item--holdings">
        <span class="label">Bestand</span>
        <div class="value-group">${C}</div>
      </div>
      <div class="security-meta-item security-meta-item--market-value">
        <span class="label">Marktwert (EUR)</span>
        <div class="value-group">${L}</div>
      </div>
    </div>
  `;
}
function Wr(e) {
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
function Ga(e, t, {
  currency: n,
  baseline: r,
  markers: i
} = {}) {
  const o = e.clientWidth || e.offsetWidth || 0, s = o > 0 ? o : 640, a = Math.min(Math.max(Math.floor(s * 0.5), 240), 440), c = (n || "").toUpperCase() || "EUR", l = D(r) ? r : null, u = Math.max(48, Math.min(72, Math.round(s * 0.075))), f = Math.max(28, Math.min(56, Math.round(s * 0.05))), d = Math.max(40, Math.min(64, Math.round(a * 0.14)));
  return {
    width: s,
    height: a,
    margin: {
      top: 18,
      right: f,
      bottom: d,
      left: u
    },
    series: t,
    yFormatter: (g) => ge(g),
    tooltipRenderer: ({ xFormatted: g, yFormatted: p }) => `
      <div class="chart-tooltip-date">${g}</div>
      <div class="chart-tooltip-value">${p}&nbsp;${c}</div>
    `,
    baseline: l != null ? {
      value: l
    } : null,
    markers: Array.isArray(i) ? i : []
  };
}
const $n = /* @__PURE__ */ new WeakMap();
function Ka(e, t, n = {}) {
  if (t.length === 0)
    return;
  const r = Ga(e, t, n);
  let i = $n.get(e) ?? null;
  if (!i || !e.contains(i)) {
    e.innerHTML = "", i = ua(e, r), i && $n.set(e, i);
    return;
  }
  Dr(i, r);
}
function Ln(e, t) {
  e && (e.dataset.activeRange = t, e.querySelectorAll(".security-range-button").forEach((n) => {
    const i = n.dataset.range === t;
    n.classList.toggle("active", i), n.setAttribute("aria-pressed", i ? "true" : "false"), n.disabled = !1, n.classList.remove("loading");
  }));
}
function Ya(e, t, n, r, i) {
  const o = e.querySelector(".security-info-bar");
  if (!o || !o.parentElement)
    return;
  const s = document.createElement("div");
  s.innerHTML = Ur(t, n, r, i).trim();
  const a = s.firstElementChild;
  a && o.parentElement.replaceChild(a, o);
}
function Mn(e, t, n, r, i = {}) {
  const o = e.querySelector(".security-detail-placeholder");
  if (o && (o.innerHTML = `
    <h2>Historie</h2>
    ${zr(t, n)}
  `, n.status === "loaded" && Array.isArray(r) && r.length)) {
    const s = o.querySelector(".history-chart");
    s && requestAnimationFrame(() => {
      Ka(s, r, i);
    });
  }
}
function Xa(e) {
  const {
    root: t,
    hass: n,
    panelConfig: r,
    securityUuid: i,
    snapshot: o,
    initialRange: s,
    initialHistory: a,
    initialHistoryState: c
  } = e;
  setTimeout(() => {
    const l = t.querySelector(".security-range-selector");
    if (!l)
      return;
    const u = Rr(i), f = $r(i), d = Tn(o);
    Array.isArray(a) && c.status !== "error" && u.set(s, a), xa(i), Cn(i, s), Ln(l, s);
    const p = It(
      a,
      o
    );
    let m = c;
    m.status !== "error" && (m = p.length ? { status: "loaded" } : { status: "empty" }), Mn(
      t,
      s,
      m,
      p,
      {
        currency: o == null ? void 0 : o.currency_code,
        baseline: d,
        markers: f.get(s) ?? []
      }
    );
    const y = async (h) => {
      if (h === Hr(i))
        return;
      const _ = l.querySelector(
        `.security-range-button[data-range="${h}"]`
      );
      _ && (_.disabled = !0, _.classList.add("loading"));
      let b = u.get(h) ?? null, S = f.get(h) ?? null, P = null, A = [];
      if (b)
        P = b.length ? { status: "loaded" } : { status: "empty" };
      else
        try {
          const T = at(h), M = await Qe(
            n,
            r,
            i,
            T
          );
          b = Ht(M.prices), S = ct(
            M.transactions,
            o == null ? void 0 : o.currency_code,
            o
          ), u.set(h, b), S = Array.isArray(S) ? S : [], f.set(h, S), P = b.length ? { status: "loaded" } : { status: "empty" };
        } catch (T) {
          console.error("Range-Wechsel: Historie konnte nicht geladen werden", T), b = [], S = [], P = {
            status: "error",
            message: Wr(T) || "Die historischen Daten konnten aufgrund eines Fehlers nicht geladen werden."
          };
        }
      if (!Array.isArray(S))
        try {
          const T = at(h), M = await Qe(
            n,
            r,
            i,
            T
          );
          S = ct(
            M.transactions,
            o == null ? void 0 : o.currency_code,
            o
          ), S = Array.isArray(S) ? S : [], f.set(h, S);
        } catch (T) {
          console.error("Range-Wechsel: Transaktionsmarker konnten nicht geladen werden", T), S = [];
        }
      A = It(b, o), P.status !== "error" && (P = A.length ? { status: "loaded" } : { status: "empty" });
      const N = rn(o), { priceChange: C, priceChangePct: L } = Vr(
        A,
        N
      ), x = Array.isArray(S) ? S : [];
      Cn(i, h), Ln(l, h), Ya(
        t,
        h,
        C,
        L,
        o == null ? void 0 : o.currency_code
      );
      const k = Tn(o);
      Mn(
        t,
        h,
        P,
        A,
        {
          currency: o == null ? void 0 : o.currency_code,
          baseline: k,
          markers: x
        }
      );
    };
    l.addEventListener("click", (h) => {
      var S;
      const _ = (S = h.target) == null ? void 0 : S.closest(".security-range-button");
      if (!_ || _.disabled)
        return;
      const { range: b } = _.dataset;
      !b || !kr.includes(b) || y(b);
    });
  }, 0);
}
function Za(e) {
  const { root: t, hass: n, panelConfig: r, tickerSymbol: i } = e;
  setTimeout(() => {
    const o = t.querySelector(".news-prompt-button");
    if (!o)
      return;
    const s = async () => {
      const a = (o.dataset.symbol || i || "").trim();
      if (!a) {
        console.warn("News-Prompt: Kein Ticker verfügbar");
        return;
      }
      if (!o.classList.contains("loading")) {
        o.disabled = !0, o.classList.add("loading");
        try {
          const c = await $i(n, r), l = (c.placeholder || "").trim() || "{TICKER}", u = (c.prompt_template || "").trim(), f = u ? l && u.includes(l) ? u.split(l).join(a) : `${u}

Ticker: ${a}` : `Ticker: ${a}`;
          if (await qa(f), c.link)
            try {
              window.open(c.link, "_blank", "noopener,noreferrer");
            } catch (d) {
              console.warn("News-Prompt: Link konnte nicht geöffnet werden", d);
            }
        } catch (c) {
          console.error("News-Prompt: Kopiervorgang fehlgeschlagen", c);
        } finally {
          o.classList.remove("loading"), o.disabled = !1;
        }
      }
    };
    o.addEventListener("click", () => {
      s();
    });
  }, 0);
}
async function Ja(e, t, n, r) {
  if (!r)
    return console.error("renderSecurityDetail: securityUuid fehlt"), '<div class="card"><h2>Fehler</h2><p>Kein Wertpapier angegeben.</p></div>';
  const i = Ea(r);
  let o = null, s = null;
  try {
    const x = await Ri(
      t,
      n,
      r
    ), k = x.snapshot;
    o = k && typeof k == "object" ? k : x;
  } catch (x) {
    console.error("renderSecurityDetail: Snapshot konnte nicht geladen werden", x), s = Ir(x);
  }
  const a = o || i, c = !!(i && !o), l = ((a == null ? void 0 : a.source) ?? "") === "cache";
  r && wa(r, a ?? null);
  const u = a && (c || l) ? Na({ fallbackUsed: c, flaggedAsCache: l }) : "", f = (a == null ? void 0 : a.name) || "Wertpapierdetails";
  if (s) {
    const x = Ct(
      f,
      Rn(a)
    );
    return x.classList.add("security-detail-header"), `
      ${x.outerHTML}
      ${u}
      <div class="card error-card">
        <h2>Fehler beim Laden</h2>
        <p>${s}</p>
      </div>
    `;
  }
  const d = Hr(r), g = Rr(r), p = $r(r);
  let m = g.has(d) ? g.get(d) ?? null : null, y = { status: "empty" }, h = p.has(d) ? p.get(d) ?? null : null;
  if (Array.isArray(m))
    y = m.length ? { status: "loaded" } : { status: "empty" };
  else {
    m = [];
    try {
      const x = at(d), k = await Qe(
        t,
        n,
        r,
        x
      );
      m = Ht(k.prices), h = ct(
        k.transactions,
        a == null ? void 0 : a.currency_code,
        a
      ), g.set(d, m), h = Array.isArray(h) ? h : [], p.set(d, h), y = m.length ? { status: "loaded" } : { status: "empty" };
    } catch (x) {
      console.error(
        "renderSecurityDetail: Historie konnte nicht geladen werden",
        x
      ), y = {
        status: "error",
        message: Wr(x) || "Die historischen Daten konnten aufgrund eines Fehlers nicht geladen werden."
      };
    }
  }
  if (!Array.isArray(h))
    try {
      const x = at(d), k = await Qe(
        t,
        n,
        r,
        x
      ), T = Ht(k.prices);
      h = ct(
        k.transactions,
        a == null ? void 0 : a.currency_code,
        a
      ), g.set(d, T), h = Array.isArray(h) ? h : [], p.set(d, h), m = T, y = m.length ? { status: "loaded" } : { status: "empty" };
    } catch (x) {
      console.error(
        "renderSecurityDetail: Transaktionsmarker konnten nicht geladen werden",
        x
      ), h = [];
    }
  const _ = It(
    m,
    a
  );
  y.status !== "error" && (y = _.length ? { status: "loaded" } : { status: "empty" });
  const b = Ct(
    f,
    Rn(a)
  );
  b.classList.add("security-detail-header");
  const S = Ua(a, r), P = za(S), A = rn(a), { priceChange: N, priceChangePct: C } = Vr(
    _,
    A
  ), L = Ur(
    d,
    N,
    C,
    a == null ? void 0 : a.currency_code
  );
  return Xa({
    root: e,
    hass: t,
    panelConfig: n,
    securityUuid: r,
    snapshot: a,
    initialRange: d,
    initialHistory: m,
    initialHistoryState: y
  }), Za({
    root: e,
    hass: t,
    panelConfig: n,
    tickerSymbol: S
  }), `
    ${b.outerHTML}
    ${u}
    ${P}
    ${L}
    ${Ia(d)}
    <div class="card security-detail-placeholder">
      <h2>Historie</h2>
      ${zr(d, y)}
    </div>
  `;
}
function Qa(e) {
  const { setSecurityDetailTabFactory: t } = e;
  if (typeof t != "function") {
    console.error("registerSecurityDetailTab: Ungültige Factory-Funktion übergeben");
    return;
  }
  t((n) => ({
    title: "Wertpapier",
    render: (r, i, o) => Ja(r, i, o, n),
    cleanup: () => {
      Da(n);
    }
  }));
}
const es = Si, Vt = "pp-reader-sticky-anchor", lt = "overview", Ut = "security:", ts = [
  { key: lt, title: "Dashboard", render: yr }
], we = /* @__PURE__ */ new Map(), We = [], ut = /* @__PURE__ */ new Map();
let zt = null, xt = !1, Se = null, O = 0, ke = null;
function dt(e) {
  return typeof e == "object" && e !== null;
}
function Br(e) {
  return typeof e == "object" && e !== null && typeof e.then == "function";
}
function ns(e) {
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
function rs(e) {
  return e === "accounts" || e === "last_file_update" || e === "portfolio_values" || e === "portfolio_positions";
}
function Hn(e) {
  const t = e.portfolio_uuid;
  if (typeof t == "string" && t)
    return t;
  const n = e.portfolioUuid;
  return typeof n == "string" && n ? n : null;
}
function is(e) {
  if (!e)
    return null;
  if (Array.isArray(e)) {
    for (const t of e)
      if (dt(t)) {
        const n = Hn(t);
        if (n)
          return n;
      }
    return null;
  }
  return dt(e) ? Hn(e) : null;
}
function os(e, t) {
  switch (e) {
    case "accounts":
      return {
        type: e,
        data: Array.isArray(t) ? t : null
      };
    case "last_file_update":
      return typeof t == "string" ? { type: e, data: t } : dt(t) ? { type: e, data: t } : { type: e, data: null };
    case "portfolio_values":
      return Array.isArray(t) ? { type: e, data: t } : { type: e, data: null };
    case "portfolio_positions":
      return Array.isArray(t) ? { type: e, data: t } : dt(t) ? { type: e, data: t } : { type: e, data: null };
    default:
      return null;
  }
}
function an(e) {
  return typeof e != "string" || !e.startsWith(Ut) ? null : e.slice(Ut.length) || null;
}
function as() {
  if (!Se)
    return !1;
  const e = Xr(Se);
  return e || (Se = null), e;
}
function oe() {
  const e = We.map((t) => we.get(t)).filter((t) => !!t);
  return [...ts, ...e];
}
function ss(e) {
  const t = oe();
  return e < 0 || e >= t.length ? null : t[e];
}
function jr(e) {
  if (!e)
    return null;
  const t = e, n = t.ppreader ?? t.pp_reader;
  return n || (Object.values(t).find((i) => !i || typeof i != "object" ? !1 : i.webcomponent_name === "pp-reader-panel") ?? null);
}
function Gr() {
  try {
    const e = ht();
    e && typeof e.rememberScrollPosition == "function" && e.rememberScrollPosition();
  } catch (e) {
    console.warn("rememberCurrentPageScroll: konnte Scroll-Position nicht sichern", e);
  }
}
function In(e) {
  const t = oe();
  return !t.length || e < 0 ? 0 : e >= t.length ? t.length - 1 : e;
}
async function cs(e, t, n, r) {
  const i = oe(), o = In(e);
  if (o === O) {
    e > O && as();
    return;
  }
  Gr();
  const s = O >= 0 && O < i.length ? i[O] : null, a = s ? an(s.key) : null;
  let c = o;
  if (a) {
    const l = o >= 0 && o < i.length ? i[o] : null;
    if (l && l.key === lt && gs(a, { suppressRender: !0 })) {
      const d = oe().findIndex((g) => g.key === lt);
      c = d >= 0 ? d : 0;
    }
  }
  if (!xt) {
    xt = !0;
    try {
      O = In(c);
      const l = O;
      await Zr(t, n, r), fs(l);
    } catch (l) {
      console.error("navigateToPage: Fehler beim Rendern des Tabs", l);
    } finally {
      xt = !1;
    }
  }
}
function ft(e, t, n, r) {
  cs(O + e, t, n, r);
}
function ls(e, t) {
  if (!e || !t || typeof t.render != "function") {
    console.error("registerDetailTab: Ungültiger Tab-Descriptor", e, t);
    return;
  }
  const n = an(e);
  if (n) {
    const i = ut.get(n);
    i && i !== e && Kr(i);
  }
  const r = {
    ...t,
    key: e
  };
  we.set(e, r), n && ut.set(n, e), We.includes(e) || We.push(e);
}
function Kr(e) {
  if (!e)
    return;
  const t = we.get(e);
  if (t && typeof t.cleanup == "function")
    try {
      const i = t.cleanup({ key: e });
      Br(i) && i.catch((o) => {
        console.error(
          "unregisterDetailTab: Fehler beim asynchronen cleanup",
          o
        );
      });
    } catch (i) {
      console.error("unregisterDetailTab: Fehler beim Ausführen von cleanup", i);
    }
  we.delete(e);
  const n = We.indexOf(e);
  n >= 0 && We.splice(n, 1);
  const r = an(e);
  r && ut.get(r) === e && ut.delete(r);
}
function us(e) {
  return we.has(e);
}
function Vn(e) {
  return we.get(e) ?? null;
}
function ds(e) {
  if (e != null && typeof e != "function") {
    console.error("setSecurityDetailTabFactory: Erwartet Funktion oder null", e);
    return;
  }
  zt = e ?? null;
}
function Yr(e) {
  return `${Ut}${e}`;
}
function ht() {
  var t;
  for (const n of Hi())
    if (n.isConnected)
      return n;
  const e = /* @__PURE__ */ new Set();
  for (const n of Ii())
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
function qt() {
  const e = ht();
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
const Es = {
  findDashboardElement: ht
};
function fs(e) {
  const t = ht();
  if (t && typeof t.handleExternalRender == "function")
    try {
      t.handleExternalRender(e);
    } catch (n) {
      console.warn("notifyExternalRender: Fehler beim Synchronisieren des Dashboards", n);
    }
}
function Xr(e) {
  if (!e)
    return console.error("openSecurityDetail: Ungültige securityUuid", e), !1;
  const t = Yr(e);
  let n = Vn(t);
  if (!n && typeof zt == "function")
    try {
      const o = zt(e);
      o && typeof o.render == "function" ? (ls(t, o), n = Vn(t)) : console.error("openSecurityDetail: Factory lieferte ungültigen Descriptor", o);
    } catch (o) {
      console.error("openSecurityDetail: Fehler beim Erzeugen des Tab-Descriptors", o);
    }
  if (!n)
    return console.warn(`openSecurityDetail: Kein Detail-Tab für ${e} verfügbar`), !1;
  Gr();
  let i = oe().findIndex((o) => o.key === t);
  return i === -1 && (i = oe().findIndex((s) => s.key === t), i === -1) ? (console.error("openSecurityDetail: Tab nach Registrierung nicht auffindbar"), !1) : (O = i, Se = null, qt(), !0);
}
function gs(e, t = {}) {
  if (!e)
    return console.error("closeSecurityDetail: Ungültige securityUuid", e), !1;
  const { suppressRender: n = !1 } = t, r = Yr(e);
  if (!us(r))
    return !1;
  const o = oe().findIndex((c) => c.key === r), s = o === O;
  Kr(r);
  const a = oe();
  if (!a.length)
    return O = 0, n || qt(), !0;
  if (Se = e, s) {
    const c = a.findIndex((l) => l.key === lt);
    c >= 0 ? O = c : O = Math.min(Math.max(o - 1, 0), a.length - 1);
  } else O >= a.length && (O = Math.max(0, a.length - 1));
  return n || qt(), !0;
}
async function Zr(e, t, n) {
  let r = n;
  r || (r = jr(t ? t.panels : null));
  const i = oe();
  O >= i.length && (O = Math.max(0, i.length - 1));
  const o = ss(O);
  if (!o) {
    console.error("renderTab: Kein gültiger Tab oder keine render-Methode gefunden!");
    return;
  }
  let s;
  try {
    s = await o.render(e, t, r);
  } catch (u) {
    console.error("renderTab: Fehler beim Rendern des Tabs:", u), e.innerHTML = `<div class="card"><h2>Fehler</h2><pre>${ns(u)}</pre></div>`;
    return;
  }
  e.innerHTML = s ?? "", o.render === yr && tn(e);
  const c = await new Promise((u) => {
    const f = window.setInterval(() => {
      const d = e.querySelector(".header-card");
      d && (clearInterval(f), u(d));
    }, 50);
  });
  let l = e.querySelector(`#${Vt}`);
  if (!l) {
    l = document.createElement("div"), l.id = Vt;
    const u = c.parentNode;
    u && "insertBefore" in u && u.insertBefore(l, c);
  }
  ms(e, t, n), hs(e, t, n), ps(e);
}
function ps(e) {
  const t = e.querySelector(".header-card"), n = e.querySelector(`#${Vt}`);
  if (!t || !n) {
    console.error("Fehlende Elemente für das Scrollverhalten: headerCard oder anchor.");
    return;
  }
  ke == null || ke.disconnect(), ke = new IntersectionObserver(
    ([r]) => {
      r.isIntersecting ? t.classList.remove("sticky") : t.classList.add("sticky");
    },
    {
      root: null,
      rootMargin: "0px 0px 0px 0px",
      threshold: 0
    }
  ), ke.observe(n);
}
function hs(e, t, n) {
  const r = e.querySelector(".header-card");
  if (!r) {
    console.error("Header-Card nicht gefunden!");
    return;
  }
  es(
    r,
    () => {
      ft(1, e, t, n);
    },
    () => {
      ft(-1, e, t, n);
    }
  );
}
function ms(e, t, n) {
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
    ft(-1, e, t, n);
  }), o.addEventListener("click", () => {
    ft(1, e, t, n);
  }), _s(r);
}
function _s(e) {
  const t = e.querySelector("#nav-left"), n = e.querySelector("#nav-right");
  if (t && (O === 0 ? (t.disabled = !0, t.classList.add("disabled")) : (t.disabled = !1, t.classList.remove("disabled"))), n) {
    const r = oe(), o = !(O === r.length - 1) || !!Se;
    n.disabled = !o, n.classList.toggle("disabled", !o);
  }
}
class ys extends HTMLElement {
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
    this._panel || (this._panel = jr(this._hass.panels ?? null));
    const n = gn(this._hass, this._panel);
    if (!n) {
      this._entryIdWaitWarned || (console.warn("PPReaderDashboard: kein entry_id ermittelbar – warte auf Panel-Konfiguration."), this._entryIdWaitWarned = !0);
      return;
    }
    this._entryIdWaitWarned = !1, console.debug("PPReaderDashboard: entry_id (fallback) =", n), this._initialized = !0, this._initializeEventListeners(), this._render();
  }
  _initializeEventListeners() {
    var s;
    this._removeEventListeners();
    const n = (s = this._hass) == null ? void 0 : s.connection;
    if (!n || typeof n.subscribeEvents != "function") {
      console.error("PPReaderDashboard: keine valide WebSocket-Verbindung oder subscribeEvents fehlt");
      return;
    }
    const r = ["panels_updated"], i = [];
    Promise.all(
      r.map(async (a) => {
        try {
          const c = await n.subscribeEvents(
            this._handleBusEvent.bind(this),
            a
          );
          typeof c == "function" ? (i.push(c), console.debug("PPReaderDashboard: subscribed to", a)) : console.error(
            "PPReaderDashboard: subscribeEvents lieferte kein Unsubscribe-Func für",
            a,
            c
          );
        } catch (c) {
          console.error("PPReaderDashboard: Fehler bei subscribeEvents für", a, c);
        }
      })
    ).then(() => {
      this._unsubscribeEvents = () => {
        i.forEach((a) => {
          try {
            a();
          } catch {
          }
        }), console.debug("PPReaderDashboard: alle Event-Subscriptions entfernt");
      };
    }).catch((a) => {
      console.error("PPReaderDashboard: Fehler beim Registrieren der Events", a);
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
    const r = gn(this._hass, this._panel);
    if (!r)
      return;
    const i = n.data;
    if (!rs(i.data_type) || i.entry_id && i.entry_id !== r)
      return;
    const o = os(i.data_type, i.data);
    o && (this._queueUpdate(o.type, o.data), this._doRender(o.type, o.data));
  }
  _doRender(n, r) {
    switch (n) {
      case "accounts":
        xo(
          r,
          this._root
        );
        break;
      case "last_file_update":
        Ho(
          r,
          this._root
        );
        break;
      case "portfolio_values":
        ko(
          r,
          this._root
        );
        break;
      case "portfolio_positions":
        $o(
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
    n === "portfolio_positions" && (o.portfolioUuid = is(
      i
    ));
    let s = -1;
    n === "portfolio_positions" && o.portfolioUuid ? s = this._pendingUpdates.findIndex(
      (a) => a.type === n && a.portfolioUuid === o.portfolioUuid
    ) : s = this._pendingUpdates.findIndex((a) => a.type === n), s >= 0 ? this._pendingUpdates[s] = o : this._pendingUpdates.push(o), this._hasNewData = !0;
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
  rememberScrollPosition(n = O) {
    const r = Number.isInteger(n) ? n : O;
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
    const n = O;
    if (!this._hasNewData && this._panel === this._lastPanel && this._narrow === this._lastNarrow && this._route === this._lastRoute && this._lastPage === n)
      return;
    this._lastPage != null && (this._scrollPositions[this._lastPage] = this._root.scrollTop);
    const r = Zr(this._root, this._hass, this._panel);
    if (Br(r)) {
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
customElements.get("pp-reader-dashboard") || customElements.define("pp-reader-dashboard", ys);
console.log("PPReader dashboard module v20250914b geladen");
Qa({
  setSecurityDetailTabFactory: ds
});
export {
  Es as __TEST_ONLY_DASHBOARD,
  ws as __TEST_ONLY__,
  gs as closeSecurityDetail,
  en as flushPendingPositions,
  Vn as getDetailTabDescriptor,
  $o as handlePortfolioPositionsUpdate,
  us as hasDetailTab,
  Xr as openSecurityDetail,
  Ns as reapplyPositionsSort,
  vs as registerDashboardElement,
  ls as registerDetailTab,
  Ps as registerPanelHost,
  ds as setSecurityDetailTabFactory,
  Ss as unregisterDashboardElement,
  Kr as unregisterDetailTab,
  As as unregisterPanelHost,
  _r as updatePortfolioFooterFromDom
};
//# sourceMappingURL=dashboard.1876tDWa.js.map
