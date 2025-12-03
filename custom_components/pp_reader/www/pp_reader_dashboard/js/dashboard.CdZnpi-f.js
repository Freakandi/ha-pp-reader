var vi = Object.defineProperty;
var Si = (e, t, n) => t in e ? vi(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : e[t] = n;
var G = (e, t, n) => Si(e, typeof t != "symbol" ? t + "" : t, n);
function un(e, t) {
  try {
    t();
  } catch (n) {
    console.warn(`addSwipeEvents: ${e} handler threw`, n);
  }
}
function Pi(e, t, n) {
  let r = null;
  const i = (l) => {
    l < -50 ? un("left", t) : l > 50 && un("right", n);
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
  if (["gain_abs", "gain_pct", "day_change_abs", "day_change_pct"].includes(e)) {
    if (t == null && n) {
      const u = n.performance;
      if (typeof u == "object" && u !== null)
        if (e.startsWith("day_change")) {
          const p = u.day_change;
          if (p && typeof p == "object") {
            const g = e === "day_change_pct" ? p.change_pct : p.value_change_eur ?? p.price_change_eur;
            typeof g == "number" && (t = g);
          }
        } else {
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
    const d = e.endsWith("pct") ? "%" : "€";
    return i = a(l) + `&nbsp;${d}`, `<span class="${Ot(l, 2)}">${i}</span>`;
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
function we(e, t, n = [], r = {}) {
  const { sortable: i = !1, defaultSort: o } = r, a = (o == null ? void 0 : o.key) ?? "", s = (o == null ? void 0 : o.dir) === "desc" ? "desc" : "asc", c = (h) => {
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
  const d = {}, f = {};
  t.forEach((h) => {
    if (n.includes(h.key)) {
      const _ = e.reduce(
        (b, S) => {
          let P = S[h.key];
          if ((h.key === "gain_abs" || h.key === "gain_pct") && (typeof P != "number" || !Number.isFinite(P))) {
            const N = S.performance;
            if (typeof N == "object" && N !== null) {
              const A = N[h.key];
              typeof A == "number" && (P = A);
            }
          } else if ((h.key === "day_change_abs" || h.key === "day_change_pct") && (typeof P != "number" || !Number.isFinite(P))) {
            const N = S.performance;
            if (typeof N == "object" && N !== null) {
              const A = N.day_change;
              if (A && typeof A == "object") {
                const E = h.key === "day_change_pct" ? A.change_pct : A.value_change_eur ?? A.price_change_eur;
                typeof E == "number" && (P = E);
              }
            }
          }
          if (typeof P == "number" && Number.isFinite(P)) {
            const N = P;
            b.total += N, b.hasValue = !0;
          }
          return b;
        },
        { total: 0, hasValue: !1 }
      );
      _.hasValue ? (d[h.key] = _.total, f[h.key] = { hasValue: !0 }) : (d[h.key] = null, f[h.key] = { hasValue: !1 });
    }
  });
  const u = d.gain_abs ?? null;
  if (u != null) {
    const h = d.purchase_value ?? null;
    if (h != null && h > 0)
      d.gain_pct = u / h * 100;
    else {
      const _ = d.current_value ?? null;
      _ != null && _ !== 0 && (d.gain_pct = u / (_ - u) * 100);
    }
  }
  const p = d.day_change_abs ?? null;
  if (p != null) {
    const h = d.current_value ?? null;
    if (h != null) {
      const _ = h - p;
      _ && (d.day_change_pct = p / _ * 100, f.day_change_pct = { hasValue: !0 });
    }
  }
  const g = Number.isFinite(d.gain_pct ?? NaN) ? d.gain_pct : null;
  let m = "", y = "neutral";
  if (g != null && (m = `${le(g)} %`, g > 0 ? y = "positive" : g < 0 && (y = "negative")), l += '<tr class="footer-row">', t.forEach((h, _) => {
    const b = h.align === "right" ? ' class="align-right"' : "";
    if (_ === 0) {
      l += `<td${b}>Summe</td>`;
      return;
    }
    if (d[h.key] != null) {
      let P = "";
      h.key === "gain_abs" && m && (P = ` data-gain-pct="${c(m)}" data-gain-sign="${c(y)}"`), l += `<td${b}${P}>${H(h.key, d[h.key], void 0, f[h.key])}</td>`;
      return;
    }
    if (h.key === "gain_pct" && d.gain_pct != null) {
      l += `<td${b}>${H("gain_pct", d.gain_pct, void 0, f[h.key])}</td>`;
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
        return _.classList.add("sortable-table"), a && (_.dataset.defaultSort = a, _.dataset.defaultDir = s), _.outerHTML;
    } catch (h) {
      console.warn("makeTable(sortable): Injection fehlgeschlagen:", h);
    }
  return l;
}
function xt(e, t) {
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
function le(e, t = 2, n = 2) {
  return (Number.isNaN(e) ? 0 : e).toLocaleString("de-DE", {
    minimumFractionDigits: t,
    maximumFractionDigits: n
  });
}
function Ai(e) {
  const t = Number.isNaN(e) ? 0 : e;
  return `<span class="${Ot(t, 2)}">${le(t)}&nbsp;€</span>`;
}
function Ni(e) {
  const t = Number.isNaN(e) ? 0 : e;
  return `<span class="${Ot(t, 2)}">${le(t)}&nbsp;%</span>`;
}
function zn(e, t, n = "asc", r = !1) {
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
      average_price: 2,
      purchase_value: 3,
      current_value: 4,
      day_change_abs: 5,
      day_change_pct: 6,
      gain_abs: 7,
      gain_pct: 8
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
    const u = d.cells.item(s), p = f.cells.item(s), g = ((u == null ? void 0 : u.textContent) ?? "").trim(), m = ((p == null ? void 0 : p.textContent) ?? "").trim(), y = c(g), h = c(m);
    let _;
    const b = /[0-9]/.test(g) || /[0-9]/.test(m);
    return !Number.isNaN(y) && !Number.isNaN(h) && b ? _ = y - h : _ = g.localeCompare(m, "de", { sensitivity: "base" }), n === "asc" ? _ : -_;
  }), a.forEach((d) => i.appendChild(d)), o && i.appendChild(o), e.querySelectorAll("thead th.sort-active").forEach((d) => {
    d.classList.remove("sort-active", "dir-asc", "dir-desc");
  });
  const l = e.querySelector(`thead th[data-sort-key="${t}"]`);
  return l && l.classList.add("sort-active", n === "asc" ? "dir-asc" : "dir-desc"), a;
}
function ue(e) {
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
function dn(e) {
  const t = V(e);
  if (t == null)
    return null;
  const n = Math.trunc(t);
  return Number.isFinite(n) ? n : null;
}
function Ge(e) {
  return ue(e) ? { ...e } : null;
}
function qn(e) {
  return ue(e) ? { ...e } : null;
}
function On(e) {
  return typeof e == "boolean" ? e : void 0;
}
function wi(e) {
  if (!ue(e))
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
  }, a = V(e.fx_rate);
  a != null && (o.fx_rate = a);
  const s = j(e.fx_rate_source);
  s && (o.fx_rate_source = s);
  const c = j(e.fx_rate_timestamp);
  c && (o.fx_rate_timestamp = c);
  const l = V(e.coverage_ratio);
  l != null && (o.coverage_ratio = l);
  const d = j(e.provenance);
  d && (o.provenance = d);
  const f = Be(e.metric_run_uuid);
  f !== null && (o.metric_run_uuid = f);
  const u = On(e.fx_unavailable);
  return typeof u == "boolean" && (o.fx_unavailable = u), o;
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
function Ei(e) {
  if (!ue(e))
    return null;
  const t = e.aggregation, n = j(e.security_uuid), r = j(e.name), i = V(e.current_holdings), o = V(e.purchase_value_eur) ?? (ue(t) ? V(t.purchase_value_eur) ?? V(t.purchase_total_account) ?? V(t.account_currency_total) : null) ?? V(e.purchase_value), a = V(e.current_value);
  if (!n || !r || i == null || o == null || a == null)
    return null;
  const s = {
    portfolio_uuid: j(e.portfolio_uuid) ?? void 0,
    security_uuid: n,
    name: r,
    ticker_symbol: j(e.ticker_symbol),
    currency_code: j(e.currency_code),
    current_holdings: i,
    purchase_value: o,
    current_value: a,
    average_cost: Ge(e.average_cost),
    performance: Ge(e.performance),
    aggregation: Ge(e.aggregation),
    data_state: qn(e.data_state)
  }, c = V(e.coverage_ratio);
  c != null && (s.coverage_ratio = c);
  const l = j(e.provenance);
  l && (s.provenance = l);
  const d = Be(e.metric_run_uuid);
  d !== null && (s.metric_run_uuid = d);
  const f = V(e.last_price_native);
  f != null && (s.last_price_native = f);
  const u = V(e.last_price_eur);
  u != null && (s.last_price_eur = u);
  const p = V(e.last_close_native);
  p != null && (s.last_close_native = p);
  const g = V(e.last_close_eur);
  return g != null && (s.last_close_eur = g), s;
}
function Bn(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = Ei(n);
    r && t.push(r);
  }
  return t;
}
function jn(e) {
  if (!ue(e))
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
    position_count: dn(e.position_count ?? e.count) ?? void 0,
    missing_value_positions: dn(e.missing_value_positions) ?? void 0,
    has_current_value: On(e.has_current_value),
    performance: Ge(e.performance),
    coverage_ratio: V(e.coverage_ratio) ?? void 0,
    provenance: j(e.provenance) ?? void 0,
    metric_run_uuid: Be(e.metric_run_uuid) ?? void 0,
    data_state: qn(e.data_state)
  };
  return Array.isArray(e.positions) && (o.positions = Bn(e.positions)), o;
}
function Yn(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = jn(n);
    r && t.push(r);
  }
  return t;
}
function Gn(e) {
  if (!ue(e))
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
function Fi(e) {
  if (!ue(e))
    return null;
  const t = { ...e }, n = Gn(e.normalized_payload);
  return n ? t.normalized_payload = n : "normalized_payload" in t && delete t.normalized_payload, t;
}
function Kn(e) {
  if (!ue(e))
    return null;
  const t = j(e.generated_at);
  if (!t)
    return null;
  const n = Be(e.metric_run_uuid), r = Wn(e.accounts), i = Yn(e.portfolios), o = Fi(e.diagnostics), a = {
    generated_at: t,
    metric_run_uuid: n,
    accounts: r,
    portfolios: i
  };
  return o && (a.diagnostics = o), a;
}
function fn(e) {
  return typeof e == "string" ? e : null;
}
function Ci(e) {
  if (typeof e == "string")
    return e;
  if (e === null)
    return null;
}
function xi(e) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
}
function pn(e, t) {
  if (typeof e == "string")
    return e;
  throw new Error(`mapPositionSnapshotToRecord: fehlendes ${t}`);
}
function _t(e, t) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  throw new Error(`mapPositionSnapshotToRecord: fehlendes ${t}`);
}
function Di(e) {
  const t = pn(e.security_uuid, "security_uuid"), n = pn(e.name, "name"), r = _t(e.current_holdings, "current_holdings"), i = _t(e.purchase_value, "purchase_value"), o = _t(e.current_value, "current_value"), a = {
    security_uuid: t,
    name: n,
    current_holdings: r,
    purchase_value: i,
    current_value: o,
    average_cost: e.average_cost ?? null,
    performance: e.performance ?? null,
    aggregation: e.aggregation ?? null
  };
  return e.currency_code !== void 0 && (a.currency_code = e.currency_code), e.coverage_ratio != null && (a.coverage_ratio = e.coverage_ratio), e.provenance && (a.provenance = e.provenance), e.metric_run_uuid !== void 0 && (a.metric_run_uuid = e.metric_run_uuid), e.last_price_native != null && (a.last_price_native = e.last_price_native), e.last_price_eur != null && (a.last_price_eur = e.last_price_eur), e.last_close_native != null && (a.last_close_native = e.last_close_native), e.last_close_eur != null && (a.last_close_eur = e.last_close_eur), e.data_state && (a.data_state = e.data_state), e.ticker_symbol && (a.ticker_symbol = e.ticker_symbol), e.portfolio_uuid && (a.portfolio_uuid = e.portfolio_uuid), a;
}
function he(e, t) {
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
function gn(e, t) {
  return he(e, t);
}
async function Ti(e, t) {
  if (!e)
    throw new Error("fetchAccountsWS: fehlendes hass");
  const n = he(e, t);
  if (!n)
    throw new Error("fetchAccountsWS: fehlendes entry_id");
  const r = await e.connection.sendMessagePromise({
    type: "pp_reader/get_accounts",
    entry_id: n
  }), i = Wn(r.accounts), o = Kn(r.normalized_payload);
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
async function Ri(e, t) {
  if (!e)
    throw new Error("fetchPortfoliosWS: fehlendes hass");
  const n = he(e, t);
  if (!n)
    throw new Error("fetchPortfoliosWS: fehlendes entry_id");
  const r = await e.connection.sendMessagePromise({
    type: "pp_reader/get_portfolio_data",
    entry_id: n
  }), i = Yn(r.portfolios), o = Kn(r.normalized_payload);
  return {
    portfolios: i,
    normalized_payload: o
  };
}
async function Xn(e, t, n) {
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
  }), a = Bn(i.positions).map(Di), s = Gn(i.normalized_payload), c = {
    portfolio_uuid: fn(i.portfolio_uuid) ?? n,
    positions: a
  };
  typeof i.error == "string" && (c.error = i.error);
  const l = xi(i.coverage_ratio);
  l !== void 0 && (c.coverage_ratio = l);
  const d = fn(i.provenance);
  d && (c.provenance = d);
  const f = Ci(i.metric_run_uuid);
  return f !== void 0 && (c.metric_run_uuid = f), s && (c.normalized_payload = s), c;
}
async function $i(e, t, n) {
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
async function Li(e, t) {
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
  }, { startDate: a, endDate: s, start_date: c, end_date: l } = r || {}, d = a ?? c;
  d != null && (o.start_date = d);
  const f = s ?? l;
  f != null && (o.end_date = f);
  const u = await e.connection.sendMessagePromise(o);
  return Array.isArray(u.prices) || (u.prices = []), Array.isArray(u.transactions) || (u.transactions = []), u;
}
const Wt = /* @__PURE__ */ new Set(), Bt = /* @__PURE__ */ new Set(), Zn = {}, Mi = [
  "renderPositionsTable",
  "applyGainPctMetadata",
  "attachSecurityDetailListener",
  "attachPortfolioPositionsSorting",
  "updatePortfolioFooter"
];
function Hi(e, t) {
  typeof t == "function" && (Zn[e] = t);
}
function vs(e) {
  e && Wt.add(e);
}
function Ss(e) {
  e && Wt.delete(e);
}
function Ii() {
  return Wt;
}
function Ps(e) {
  e && Bt.add(e);
}
function As(e) {
  e && Bt.delete(e);
}
function Vi() {
  return Bt;
}
function Ui(e) {
  for (const t of Mi)
    Hi(t, e[t]);
}
function jt() {
  return Zn;
}
const zi = 2;
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
    const o = i.lastIndexOf(","), a = i.lastIndexOf(".");
    let s = i;
    const c = o !== -1, l = a !== -1;
    if (c && (!l || o > a))
      if (l)
        s = s.replace(/\./g, "").replace(",", ".");
      else {
        const u = s.split(","), p = ((t = u[u.length - 1]) == null ? void 0 : t.length) ?? 0, g = u.slice(0, -1).join(""), m = g.replace(/[+-]/g, "").length, y = u.length > 2, h = /^[-+]?0$/.test(g);
        s = y || p === 0 || p === 3 && m > 0 && m <= 3 && !h ? s.replace(/,/g, "") : s.replace(",", ".");
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
function pt(e, { decimals: t = zi, fallback: n = null } = {}) {
  const r = ae(e);
  if (r == null)
    return n ?? null;
  const i = 10 ** t, o = Math.round(r * i) / i;
  return Object.is(o, -0) ? 0 : o;
}
function hn(e, t = {}) {
  return pt(e, t);
}
function qi(e, t = {}) {
  return pt(e, t);
}
const Oi = /^[+-]?(?:\d+\.?\d*|\d*\.?\d+)(?:[eE][+-]?\d+)?$/, re = (e) => {
  if (typeof e == "number")
    return Number.isFinite(e) ? e : null;
  if (typeof e == "string") {
    const t = e.trim();
    if (!t || !Oi.test(t))
      return null;
    const n = Number(t);
    if (Number.isFinite(n))
      return n;
  }
  return null;
}, Jn = (e) => {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t || null;
};
function Wi(e) {
  const t = e && typeof e == "object" ? e : null;
  if (!t)
    return null;
  const n = re(t.price_change_native), r = re(t.price_change_eur), i = re(t.change_pct), o = re(t.value_change_eur);
  if (n == null && r == null && i == null && o == null)
    return null;
  const a = Jn(t.source) ?? "derived", s = re(t.coverage_ratio) ?? null;
  return {
    price_change_native: n,
    price_change_eur: r,
    change_pct: i,
    value_change_eur: o ?? null,
    source: a,
    coverage_ratio: s
  };
}
function ge(e) {
  const t = e && typeof e == "object" ? e : null;
  if (!t)
    return null;
  const n = re(t.gain_abs), r = re(t.gain_pct), i = re(t.total_change_eur), o = re(t.total_change_pct);
  if (n == null || r == null || i == null || o == null)
    return null;
  const a = Jn(t.source) ?? "derived", s = re(t.coverage_ratio) ?? null, c = Wi(t.day_change);
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
const fe = /* @__PURE__ */ new Map();
function de(e) {
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
function Bi(e) {
  if (!e || typeof e != "object")
    return !1;
  const t = e;
  return typeof t.security_uuid == "string" && typeof t.name == "string" && typeof t.current_holdings == "number" && typeof t.purchase_value == "number" && typeof t.current_value == "number";
}
function je(e) {
  const t = { ...e };
  return e.average_cost && typeof e.average_cost == "object" && (t.average_cost = { ...e.average_cost }), e.performance && typeof e.performance == "object" && (t.performance = { ...e.performance }), e.aggregation && typeof e.aggregation == "object" && (t.aggregation = { ...e.aggregation }), e.data_state && typeof e.data_state == "object" && (t.data_state = { ...e.data_state }), t;
}
function ji(e, t) {
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
  ], i = (a, s, c) => {
    const l = s[c];
    l !== void 0 && (a[c] = l);
  };
  r.forEach((a) => {
    i(n, t, a);
  });
  const o = (a) => {
    const s = t[a];
    if (s && typeof s == "object") {
      const c = e && e[a] && typeof e[a] == "object" ? e[a] : {};
      n[a] = {
        ...c,
        ...s
      };
    } else s !== void 0 && (n[a] = s);
  };
  return o("performance"), o("aggregation"), o("average_cost"), o("data_state"), n;
}
function Yt(e, t) {
  if (!e)
    return;
  if (!Array.isArray(t)) {
    fe.delete(e);
    return;
  }
  if (t.length === 0) {
    fe.set(e, []);
    return;
  }
  const n = fe.get(e) ?? [], r = new Map(
    n.filter((o) => o.security_uuid).map((o) => [o.security_uuid, o])
  ), i = t.filter((o) => !!o).map((o) => {
    const a = o.security_uuid ?? "", s = a ? r.get(a) : void 0;
    return ji(s, o);
  }).map(je);
  fe.set(e, i);
}
function Gt(e) {
  return e ? fe.has(e) : !1;
}
function Qn(e) {
  if (!e)
    return [];
  const t = fe.get(e);
  return t ? t.map(je) : [];
}
function Yi() {
  fe.clear();
}
function Gi() {
  return new Map(
    Array.from(fe.entries(), ([e, t]) => [
      e,
      t.map(je)
    ])
  );
}
function Ce(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e, n = q(t.native), r = q(t.security), i = q(t.account), o = q(t.eur), a = q(t.coverage_ratio);
  if (n == null && r == null && i == null && o == null && a == null)
    return null;
  const s = de(t.source);
  return {
    native: n,
    security: r,
    account: i,
    eur: o,
    source: s === "totals" || s === "eur_total" ? s : "aggregation",
    coverage_ratio: a
  };
}
function Kt(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e, n = q(t.total_holdings), r = q(t.positive_holdings), i = q(t.purchase_value_eur), o = q(t.purchase_total_security) ?? q(t.security_currency_total), a = q(t.purchase_total_account) ?? q(t.account_currency_total);
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
function Ki(e) {
  if (!e || typeof e != "object")
    return null;
  const t = Bi(e) ? je(e) : e, n = de(t.security_uuid), r = de(t.name), i = ae(t.current_holdings), o = hn(t.current_value), a = Kt(t.aggregation), s = t.aggregation && typeof t.aggregation == "object" ? t.aggregation : null, c = q(t.purchase_value_eur) ?? q(s == null ? void 0 : s.purchase_value_eur) ?? q(s == null ? void 0 : s.purchase_total_account) ?? q(s == null ? void 0 : s.account_currency_total) ?? hn(t.purchase_value);
  if (!n || !r || i == null || c == null || o == null)
    return null;
  const l = {
    security_uuid: n,
    name: r,
    portfolio_uuid: de(t.portfolio_uuid) ?? de(t.portfolioUuid) ?? void 0,
    currency_code: de(t.currency_code),
    current_holdings: i,
    purchase_value: c,
    current_value: o
  }, d = Ce(t.average_cost);
  d && (l.average_cost = d), a && (l.aggregation = a);
  const f = ge(t.performance);
  if (f)
    l.performance = f, l.gain_abs = typeof f.gain_abs == "number" ? f.gain_abs : null, l.gain_pct = typeof f.gain_pct == "number" ? f.gain_pct : null;
  else {
    const b = q(t.gain_abs), S = q(t.gain_pct);
    b !== null && (l.gain_abs = b), S !== null && (l.gain_pct = S);
  }
  "coverage_ratio" in t && (l.coverage_ratio = q(t.coverage_ratio));
  const u = de(t.provenance);
  u && (l.provenance = u);
  const p = de(t.metric_run_uuid);
  (p || t.metric_run_uuid === null) && (l.metric_run_uuid = p ?? null);
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
function gt(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = Ki(n);
    r && t.push(r);
  }
  return t;
}
let er = [];
const pe = /* @__PURE__ */ new Map();
function Ke(e) {
  return typeof e == "string" && e.length > 0 ? e : void 0;
}
function Xi(e) {
  return e === null ? null : Ke(e);
}
function Zi(e) {
  return typeof e == "number" && Number.isFinite(e) ? e : void 0;
}
function _e(e) {
  return e === null ? null : Zi(e);
}
function mn(e) {
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
function tr(e) {
  if (!e || typeof e != "object")
    return null;
  const t = Ke(e.uuid);
  if (!t)
    return null;
  const n = { uuid: t }, r = Ke(e.name);
  r && (n.name = r);
  const i = _e(e.current_value);
  i !== void 0 && (n.current_value = i);
  const o = _e(e.purchase_sum) ?? _e(e.purchase_value_eur) ?? _e(e.purchase_value);
  o !== void 0 && (n.purchase_value = o, n.purchase_sum = o);
  const a = _e(e.day_change_abs);
  a !== void 0 && (n.day_change_abs = a);
  const s = _e(e.day_change_pct);
  s !== void 0 && (n.day_change_pct = s);
  const c = mn(e.position_count);
  c !== void 0 && (n.position_count = c);
  const l = mn(e.missing_value_positions);
  l !== void 0 && (n.missing_value_positions = l), typeof e.has_current_value == "boolean" && (n.has_current_value = e.has_current_value);
  const d = _e(e.coverage_ratio);
  d !== void 0 && (n.coverage_ratio = d);
  const f = Ke(e.provenance);
  f && (n.provenance = f), "metric_run_uuid" in e && (n.metric_run_uuid = Xi(e.metric_run_uuid));
  const u = ie(e.performance);
  u && (n.performance = u);
  const p = ie(e.data_state);
  if (p && (n.data_state = p), Array.isArray(e.positions)) {
    const g = e.positions.filter(
      (m) => !!m
    );
    g.length && (n.positions = g.map(Ie));
  }
  return n;
}
function Ji(e, t) {
  const n = {
    ...e,
    ...t
  };
  return !t.performance && e.performance && (n.performance = ie(e.performance)), !t.data_state && e.data_state && (n.data_state = ie(e.data_state)), !t.positions && e.positions && (n.positions = e.positions.map(Ie)), n;
}
function nr(e) {
  er = (e ?? []).map((n) => ({ ...n }));
}
function Qi() {
  return er.map((e) => ({ ...e }));
}
function eo(e) {
  pe.clear();
  const t = e ?? [];
  for (const n of t) {
    const r = tr(n);
    r && pe.set(r.uuid, Xt(r));
  }
}
function to(e) {
  const t = e ?? [];
  for (const n of t) {
    const r = tr(n);
    if (!r)
      continue;
    const i = pe.get(r.uuid), o = i ? Ji(i, r) : Xt(r);
    pe.set(o.uuid, o);
  }
}
function Zt(e, t) {
  if (!e)
    return;
  const n = pe.get(e);
  if (!n)
    return;
  if (!Array.isArray(t) || t.length === 0) {
    const c = { ...n };
    delete c.positions, pe.set(e, c);
    return;
  }
  const r = (c, l) => {
    const d = c ? Ie(c) : {}, f = d;
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
    const p = (g) => {
      const m = l[g];
      if (m && typeof m == "object") {
        const y = c && c[g] && typeof c[g] == "object" ? c[g] : {};
        f[g] = {
          ...y,
          ...m
        };
      } else m != null && (f[g] = m);
    };
    return p("performance"), p("aggregation"), p("average_cost"), p("data_state"), d;
  }, i = Array.isArray(n.positions) ? n.positions : [], o = new Map(
    i.filter((c) => c.security_uuid).map((c) => [c.security_uuid, c])
  ), a = t.filter((c) => !!c).map((c) => {
    const l = c.security_uuid ? o.get(c.security_uuid) : void 0;
    return r(l, c);
  }).map(Ie), s = {
    ...n,
    positions: a
  };
  pe.set(e, s);
}
function no() {
  return Array.from(pe.values(), (e) => Xt(e));
}
function rr() {
  return {
    accounts: Qi(),
    portfolios: no()
  };
}
const ro = "unknown-account";
function K(e) {
  return typeof e != "number" || !Number.isFinite(e) ? null : e;
}
function _n(e) {
  const t = K(e);
  return t == null ? 0 : Math.trunc(t);
}
function J(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t.length > 0 ? t : null;
}
function ir(e, t) {
  return J(e) ?? t;
}
function or(e) {
  return e == null || !Number.isFinite(e) ? null : e < 0 ? 0 : e > 1 ? 1 : e;
}
function ar(e) {
  return e.split(/[\s_-]+/).filter(Boolean).map(
    (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
  ).join(" ");
}
function sr(e) {
  const t = io(e);
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
function io(e) {
  const t = J(e);
  if (!t)
    return null;
  const n = oo(t);
  return n || ar(t);
}
function oo(e) {
  const t = e.trim();
  if (!t.startsWith("{") && !t.startsWith("["))
    return null;
  try {
    const n = JSON.parse(t), r = ao(n), i = n && typeof n == "object" ? J(
      n.provider ?? n.source
    ) : null;
    if (r.length && i)
      return `${ar(i)} (${r.join(", ")})`;
    if (r.length)
      return `FX (${r.join(", ")})`;
  } catch {
    return null;
  }
  return null;
}
function ao(e) {
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
function so(e) {
  if (!e)
    return null;
  const t = J(e.uuid) ?? `${ro}-${e.name ?? "0"}`, n = ir(e.name, "Unbenanntes Konto"), r = J(e.currency_code), i = K(e.balance), o = K(e.orig_balance), a = "coverage_ratio" in e ? or(K(e.coverage_ratio)) : null, s = J(e.provenance), c = J(e.metric_run_uuid), l = e.fx_unavailable === !0, d = K(e.fx_rate), f = J(e.fx_rate_source), u = J(e.fx_rate_timestamp), p = [], g = sr(s);
  g && p.push(g);
  const m = {
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
  }, y = typeof c == "string" ? c : null;
  return m.metric_run_uuid = y, m;
}
function co(e) {
  if (!e)
    return null;
  const t = J(e.uuid);
  if (!t)
    return null;
  const n = ir(e.name, "Unbenanntes Depot"), r = _n(e.position_count), i = _n(e.missing_value_positions), o = K(e.current_value), a = K(e.purchase_sum) ?? K(e.purchase_value_eur) ?? K(e.purchase_value) ?? 0, s = K(e.day_change_abs) ?? null, c = K(e.day_change_pct) ?? null, l = ge(e.performance), d = (l == null ? void 0 : l.gain_abs) ?? null, f = (l == null ? void 0 : l.gain_pct) ?? null, u = (l == null ? void 0 : l.day_change) ?? null;
  let p = s ?? ((u == null ? void 0 : u.value_change_eur) != null ? K(u.value_change_eur) : null), g = c ?? ((u == null ? void 0 : u.change_pct) != null ? K(u.change_pct) : null);
  if (p == null && g != null && o != null) {
    const E = o / (1 + g / 100);
    E && (p = o - E);
  }
  if (g == null && p != null && o != null) {
    const E = o - p;
    E && (g = p / E * 100);
  }
  const m = o != null, y = e.has_current_value === !1 || !m, h = "coverage_ratio" in e ? or(K(e.coverage_ratio)) : null, _ = J(e.provenance), b = J(e.metric_run_uuid), S = [], P = sr(_);
  P && S.push(P);
  const N = {
    uuid: t,
    name: n,
    position_count: r,
    current_value: o,
    purchase_sum: a,
    day_change_abs: p ?? null,
    day_change_pct: g ?? null,
    gain_abs: d,
    gain_pct: f,
    hasValue: m,
    fx_unavailable: y || i > 0,
    missing_value_positions: i,
    performance: l,
    coverage_ratio: h,
    provenance: _,
    metric_run_uuid: null,
    badges: S
  }, A = typeof b == "string" ? b : null;
  return N.metric_run_uuid = A, N;
}
function cr() {
  const { accounts: e } = rr();
  return e.map(so).filter((t) => !!t);
}
function lo() {
  const { portfolios: e } = rr();
  return e.map(co).filter((t) => !!t);
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
function lr(e, t = {}) {
  if (!e || e.length === 0)
    return "";
  const n = ["meta-badges", t.containerClass].filter(Boolean).join(" "), r = e.map((i) => {
    const o = `meta-badge--${i.tone}`, a = i.description ? ` title="${Ve(i.description)}"` : "";
    return `<span class="meta-badge ${o}"${a}>${Ve(
      i.label
    )}</span>`;
  }).join("");
  return `<span class="${n}">${r}</span>`;
}
function et(e, t, n = {}) {
  const r = lr(t, n);
  if (!r)
    return Ve(e);
  const i = n.labelClass ?? "name-with-badges__label";
  return `<span class="${["name-with-badges", n.containerClass].filter(Boolean).join(" ")}"><span class="${i}">${Ve(
    e
  )}</span>${r}</span>`;
}
function ur(e, t, n, r) {
  e[t] = {
    previous: n,
    current: r
  };
}
const se = /* @__PURE__ */ new Map(), Xe = /* @__PURE__ */ new Map();
function uo(e) {
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
function xe(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t.length > 0 ? t : null;
}
function fo(e) {
  return typeof e == "number" && Number.isFinite(e) ? e : void 0;
}
function po(e) {
  return e === null ? null : fo(e);
}
function go(e) {
  return e === null ? null : xe(e);
}
function yn(e) {
  return (e ?? []).filter(
    (t) => !t.key.endsWith("-coverage") && !t.key.startsWith("provenance-")
  );
}
function bn(e) {
  return ge(e.performance);
}
const ho = 500, mo = 10, _o = "pp-reader:portfolio-positions-updated", yo = "pp-reader:diagnostics", yt = /* @__PURE__ */ new Map(), dr = [
  "coverage_ratio",
  "provenance",
  "metric_run_uuid",
  "generated_at"
], Dt = /* @__PURE__ */ new Map();
function bo(e, t) {
  return `${e}:${t}`;
}
function vo(e) {
  if (e === void 0)
    return;
  if (e === null)
    return null;
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  const t = po(e);
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
  const i = {}, o = vo(e);
  o !== void 0 && (i.coverage_ratio = o);
  const a = bt(t);
  a !== void 0 && (i.provenance = a);
  const s = bt(n);
  s !== void 0 && (i.metric_run_uuid = s);
  const c = bt(r);
  return c !== void 0 && (i.generated_at = c), Object.keys(i).length > 0 ? i : null;
}
function So(e, t) {
  const n = {};
  let r = !1;
  for (const i of dr) {
    const o = e == null ? void 0 : e[i], a = t[i];
    o !== a && (ur(n, i, o, a), r = !0);
  }
  return r ? n : null;
}
function Po(e) {
  const t = {};
  let n = !1;
  for (const r of dr) {
    const i = e[r];
    i !== void 0 && (ur(t, r, i, void 0), n = !0);
  }
  return n ? t : null;
}
function vn(e) {
  if (Object.keys(e.changed).length) {
    try {
      console.debug("pp-reader:diagnostics", e);
    } catch {
    }
    if (!(typeof window > "u" || typeof window.dispatchEvent != "function"))
      try {
        window.dispatchEvent(new CustomEvent(yo, { detail: e }));
      } catch (t) {
        console.warn("updateConfigsWS: Diagnostics-Event konnte nicht gesendet werden", t);
      }
  }
}
function Qt(e, t, n, r) {
  const i = bo(e, n), o = yt.get(i);
  if (!r) {
    if (!o)
      return;
    yt.delete(i);
    const s = Po(o);
    if (!s)
      return;
    vn({
      kind: e,
      uuid: n,
      source: t,
      changed: s,
      snapshot: {},
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    return;
  }
  const a = So(o, r);
  a && (yt.set(i, { ...r }), vn({
    kind: e,
    uuid: n,
    source: t,
    changed: a,
    snapshot: { ...r },
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  }));
}
function Ao(e) {
  if (!(!e || e.length === 0))
    for (const t of e) {
      const n = xe(t.uuid);
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
function No(e) {
  if (!(!e || e.length === 0))
    for (const t of e) {
      const n = xe(t.uuid);
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
function wo(e, t) {
  var r, i, o, a;
  if (!t)
    return;
  const n = Jt(
    t.coverage_ratio ?? ((r = t.normalized_payload) == null ? void 0 : r.coverage_ratio),
    t.provenance ?? ((i = t.normalized_payload) == null ? void 0 : i.provenance),
    t.metric_run_uuid ?? ((o = t.normalized_payload) == null ? void 0 : o.metric_run_uuid),
    (a = t.normalized_payload) == null ? void 0 : a.generated_at
  );
  Qt("portfolio_positions", "portfolio_positions", e, n);
}
function Eo(e, t) {
  return `<div class="error">${uo(e)} <button class="retry-pos" data-portfolio="${t}">Erneut laden</button></div>`;
}
function Fo(e, t, n) {
  const r = e.querySelector("table.sortable-positions");
  if (!r) return;
  const i = e.dataset.sortKey || r.dataset.defaultSort || "name", a = (e.dataset.sortDir || r.dataset.defaultDir || "asc") === "desc" ? "desc" : "asc";
  e.dataset.sortKey = i, e.dataset.sortDir = a;
  try {
    zn(r, i, a, !0);
  } catch (l) {
    console.warn("restoreSortAndInit: sortTableRows Fehler:", l);
  }
  const { attachPortfolioPositionsSorting: s, attachSecurityDetailListener: c } = jt();
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
function fr(e, t, n, r) {
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
    return o.innerHTML = Eo(r, t), { applied: !0 };
  const a = o.dataset.sortKey, s = o.dataset.sortDir;
  return o.innerHTML = Mo(n), a && (o.dataset.sortKey = a), s && (o.dataset.sortDir = s), Fo(o, e, t), { applied: !0 };
}
function en(e, t) {
  const n = se.get(t);
  if (!n) return !1;
  const r = fr(
    e,
    t,
    n.positions,
    n.error
  );
  return r.applied && se.delete(t), r.applied;
}
function Co(e) {
  let t = !1;
  for (const [n] of se)
    en(e, n) && (t = !0);
  return t;
}
function pr(e, t) {
  const n = Xe.get(t) ?? {
    attempts: 0,
    timer: null
  };
  n.timer || (n.timer = setTimeout(() => {
    n.timer = null, n.attempts += 1;
    const r = en(e, t);
    r || n.attempts >= mo ? (Xe.delete(t), r || se.delete(t)) : pr(e, t);
  }, ho), Xe.set(t, n));
}
function xo(e, t) {
  console.log("updateConfigsWS: Kontodaten-Update erhalten:", e);
  const n = Array.isArray(e) ? e : [];
  if (nr(n), Ao(n), !t)
    return;
  const r = cr();
  Do(r, t);
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
  gr(r, o, t);
}
function Do(e, t) {
  const n = t.querySelector(".account-table"), r = t.querySelector(".fx-account-table"), i = e.filter((a) => (a.currency_code || "EUR") === "EUR"), o = e.filter((a) => (a.currency_code || "EUR") !== "EUR");
  if (n) {
    const a = i.map((s) => ({
      name: et(s.name, yn(s.badges), {
        containerClass: "account-name",
        labelClass: "account-name__label"
      }),
      balance: s.balance ?? null
    }));
    n.innerHTML = we(
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
      const c = s.orig_balance, l = typeof c == "number" && Number.isFinite(c), d = xe(s.currency_code), f = l ? c.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) : null, u = f ? d ? `${f} ${d}` : f : "";
      return {
        name: et(s.name, yn(s.badges), {
          containerClass: "account-name",
          labelClass: "account-name__label"
        }),
        fx_display: u,
        balance: s.balance ?? null
      };
    });
    r.innerHTML = we(
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
function To(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = jn(n);
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
  const n = To(e);
  if (n.length && to(n), No(n), !t)
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
    return (pt(f, { fallback: 0 }) ?? 0).toFixed(2).replace(".", ",");
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
    const u = xe(f.uuid);
    u && d.set(u, f);
  }
  for (const [f, u] of d.entries()) {
    const p = a.get(f);
    if (!p || p.cells.length < 3)
      continue;
    const g = p.cells.item(1), m = p.cells.item(2), y = p.cells.item(3), h = p.cells.item(4);
    if (!g || !m)
      continue;
    const _ = typeof u.position_count == "number" && Number.isFinite(u.position_count) ? u.position_count : 0, b = typeof u.current_value == "number" && Number.isFinite(u.current_value) ? u.current_value : null, S = ge(u.performance), P = typeof (S == null ? void 0 : S.gain_abs) == "number" ? S.gain_abs : null, N = typeof (S == null ? void 0 : S.gain_pct) == "number" ? S.gain_pct : null, A = typeof u.purchase_sum == "number" && Number.isFinite(u.purchase_sum) ? u.purchase_sum : typeof u.purchase_value == "number" && Number.isFinite(u.purchase_value) ? u.purchase_value : null, E = vt(m.textContent);
    vt(g.textContent) !== _ && (g.textContent = l(_));
    const F = b !== null, D = {
      fx_unavailable: p.dataset.fxUnavailable === "true",
      current_value: b,
      performance: S
    }, R = { hasValue: F }, M = H("current_value", D.current_value, D, R), w = b ?? 0;
    if ((Math.abs(E - w) >= 5e-3 || m.innerHTML !== M) && (m.innerHTML = M, p.classList.add("flash-update"), setTimeout(() => {
      p.classList.remove("flash-update");
    }, 800)), y) {
      const C = H("gain_abs", P, D, R);
      y.innerHTML = C;
      const v = typeof N == "number" && Number.isFinite(N) ? N : null;
      y.dataset.gainPct = v != null ? `${o(v)} %` : "—", y.dataset.gainSign = v != null ? v > 0 ? "positive" : v < 0 ? "negative" : "neutral" : "neutral";
    }
    h && (h.innerHTML = H("gain_pct", N, D, R)), p.dataset.positionCount = _.toString(), p.dataset.currentValue = F ? w.toString() : "", p.dataset.purchaseSum = A != null ? A.toString() : "", p.dataset.gainAbs = P != null ? P.toString() : "", p.dataset.gainPct = N != null ? N.toString() : "", p.dataset.coverageRatio = typeof u.coverage_ratio == "number" && Number.isFinite(u.coverage_ratio) ? u.coverage_ratio.toString() : "", p.dataset.provenance = typeof u.provenance == "string" ? u.provenance : "", p.dataset.metricRunUuid = typeof u.metric_run_uuid == "string" ? u.metric_run_uuid : "", c += 1;
  }
  if (c === 0)
    console.debug("handlePortfolioUpdate: Keine passenden Zeilen gefunden / keine Änderungen.");
  else {
    const f = c.toLocaleString("de-DE");
    console.debug(`handlePortfolioUpdate: ${f} Zeile(n) gepatcht.`);
  }
  try {
    Ho(r);
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
    }, u = f(
      ".account-table table",
      ".accounts-eur-table table",
      ".accounts-table table"
    ), p = f(
      ".fx-account-table table",
      ".accounts-fx-table table"
    ), g = (h, _) => {
      if (!h) return [];
      const b = h.querySelectorAll("tbody tr.account-row");
      return (b.length ? Array.from(b) : Array.from(h.querySelectorAll("tbody tr:not(.footer-row)"))).map((P) => {
        const N = _ ? P.cells.item(2) : P.cells.item(1);
        return { balance: vt(N == null ? void 0 : N.textContent) };
      });
    }, m = [
      ...g(u, !1),
      ...g(p, !0)
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
function Ro(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e.portfolio_uuid;
  if (typeof t == "string" && t)
    return t;
  const n = e.portfolioUuid;
  return typeof n == "string" && n ? n : null;
}
function Tt(e) {
  Dt.delete(e);
}
function Sn(e) {
  return typeof e != "number" || !Number.isInteger(e) || e <= 0 ? null : e;
}
function $o(e, t, n, r) {
  if (!n || n <= 1 || !t)
    return Tt(e), r;
  const i = n, o = Dt.get(e) ?? { expected: i, chunks: /* @__PURE__ */ new Map() };
  if (o.expected !== i && (o.chunks.clear(), o.expected = i), o.chunks.set(t, r), Dt.set(e, o), o.chunks.size < i)
    return null;
  const a = [];
  for (let s = 1; s <= i; s += 1) {
    const c = o.chunks.get(s);
    c && Array.isArray(c) && a.push(...c);
  }
  return Tt(e), a;
}
function Pn(e, t) {
  const n = Ro(e);
  if (!n)
    return console.warn("handlePortfolioPositionsUpdate: Ungültiges Update:", e), !1;
  const r = e == null ? void 0 : e.error, i = Sn(e == null ? void 0 : e.chunk_index), o = Sn(e == null ? void 0 : e.chunk_count), a = gt((e == null ? void 0 : e.positions) ?? []);
  r && Tt(n);
  const s = r ? a : $o(n, i, o, a);
  if (!r && s === null)
    return !0;
  const c = r ? a : s ?? [];
  wo(n, e), r || (Yt(n, c), Zt(n, c));
  const l = fr(t, n, c, r);
  if (l.applied ? se.delete(n) : (se.set(n, { positions: a, error: r }), l.reason !== "hidden" && pr(t, n)), !r && a.length > 0) {
    const d = Array.from(
      new Set(
        a.map((f) => f.security_uuid).filter((f) => typeof f == "string" && f.length > 0)
      )
    );
    if (d.length && typeof window < "u")
      try {
        window.dispatchEvent(
          new CustomEvent(
            _o,
            {
              detail: {
                portfolioUuid: n,
                securityUuids: d
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
function Lo(e, t) {
  if (Array.isArray(e)) {
    let n = !1;
    for (const r of e)
      Pn(r, t) && (n = !0);
    !n && e.length && console.warn("handlePortfolioPositionsUpdate: Kein gültiges Element im Array:", e);
    return;
  }
  Pn(e, t);
}
function Mo(e) {
  const { renderPositionsTable: t, applyGainPctMetadata: n } = jt();
  try {
    if (typeof t == "function")
      return t(e);
  } catch {
  }
  if (e.length === 0)
    return '<div class="no-positions">Keine Positionen vorhanden.</div>';
  const r = e.map((o) => {
    const a = bn(o);
    return {
      name: o.name,
      current_holdings: o.current_holdings,
      purchase_value: o.purchase_value,
      current_value: o.current_value,
      performance: a
    };
  }), i = we(
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
          const g = u.cells.item(4);
          if (!g)
            return;
          const m = e[p], y = bn(m), h = typeof (y == null ? void 0 : y.gain_pct) == "number" && Number.isFinite(y.gain_pct) ? y.gain_pct : null, _ = h != null ? `${h.toLocaleString("de-DE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })} %` : "—", b = h == null ? "neutral" : h > 0 ? "positive" : h < 0 ? "negative" : "neutral";
          g.dataset.gainPct = _, g.dataset.gainSign = b;
        });
      return a.outerHTML;
    }
  } catch (o) {
    console.warn("renderPositionsTableInline: Sortier-Metadaten Injection fehlgeschlagen:", o);
  }
  return i;
}
function Ho(e) {
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
      const P = r(b.dataset.currentValue), N = r(b.dataset.gainAbs), A = r(b.dataset.purchaseSum);
      return P == null || N == null || A == null ? (_.incompleteRows += 1, _) : (_.sumCurrent += P, _.sumGainAbs += N, _.sumPurchase += A, _);
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
  }, d = { hasValue: o }, f = H("current_value", l.current_value, l, d), u = o ? i.sumGainAbs : null, p = o ? a : null, g = H("gain_abs", u, l, d), m = H("gain_pct", p, l, d);
  s.innerHTML = `
    <td>Summe</td>
    <td class="align-right">${c}</td>
    <td class="align-right">${f}</td>
    <td class="align-right">${g}</td>
    <td class="align-right">${m}</td>
  `;
  const y = s.cells.item(3);
  y && (y.dataset.gainPct = o && typeof a == "number" ? `${kt(a)} %` : "—", y.dataset.gainSign = o && typeof a == "number" ? a > 0 ? "positive" : a < 0 ? "negative" : "neutral" : "neutral"), s.dataset.positionCount = Math.round(i.sumPositions).toString(), s.dataset.currentValue = o ? i.sumCurrent.toString() : "", s.dataset.purchaseSum = o ? i.sumPurchase.toString() : "", s.dataset.gainAbs = o ? i.sumGainAbs.toString() : "", s.dataset.gainPct = o && typeof a == "number" ? a.toString() : "", s.dataset.hasValue = o ? "true" : "false", s.dataset.fxUnavailable = i.fxUnavailable || !o ? "true" : "false";
}
function An(e) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  if (typeof e == "string") {
    const t = Number.parseFloat(e);
    return Number.isFinite(t) ? t : 0;
  }
  return 0;
}
function kt(e) {
  return (pt(e, { fallback: 0 }) ?? 0).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
function gr(e, t, n) {
  const r = n ?? document, o = (Array.isArray(e) ? e : []).reduce((f, u) => {
    const p = u.balance ?? u.current_value ?? u.value, g = An(p);
    return f + g;
  }, 0), s = (Array.isArray(t) ? t : []).reduce((f, u) => {
    const p = u.current_value ?? u.value, g = An(p);
    return f + g;
  }, 0), c = o + s, l = r.querySelector("#headerMeta");
  if (!l) {
    console.warn("updateTotalWealth: #headerMeta nicht gefunden.");
    return;
  }
  const d = l.querySelector("strong") || l.querySelector(".total-wealth-value");
  d ? d.textContent = `${kt(c)} €` : l.textContent = `💰 Gesamtvermögen: ${kt(c)} €`, l.dataset.totalWealthEur = c.toString();
}
function Io(e, t) {
  const n = typeof e == "string" ? e : e == null ? void 0 : e.last_file_update, r = xe(n) ?? "";
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
  e.dataset.sortKey = n, e.dataset.sortDir = i, zn(t, n, i, !0);
}
const ws = {
  getPortfolioPositionsCacheSnapshot: Gi,
  clearPortfolioPositionsCache: Yi,
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
const Vo = [
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
  return Vo.includes(e);
}
function Pt(e) {
  return e === "asc" || e === "desc";
}
function hr(e) {
  return (e ?? []).filter((t) => !t.key.endsWith("-coverage"));
}
function Nn(e) {
  return hr(e).filter(
    (t) => !t.key.startsWith("provenance-")
  );
}
let tt = null, nt = null;
const wn = { min: 2, max: 6 };
function Te(e) {
  return ae(e);
}
function Uo(e) {
  return typeof e == "number" && Number.isFinite(e);
}
function zo(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  if (!t)
    return null;
  const n = t.toUpperCase();
  return /^[A-Z]{3}$/.test(n) ? n : n === "€" ? "EUR" : null;
}
function En(e, t, n = null) {
  for (const r of t) {
    const i = zo(e[r]);
    if (i)
      return i;
  }
  return n;
}
function Fn(e, t) {
  return Uo(e) ? `${e.toLocaleString("de-DE", {
    minimumFractionDigits: wn.min,
    maximumFractionDigits: wn.max
  })}${t ? ` ${t}` : ""}` : null;
}
function qo(e) {
  const t = e, n = e.average_cost ?? null, r = e.aggregation ?? null, i = En(t, [
    "security_currency_code",
    "security_currency",
    "native_currency_code",
    "native_currency"
  ], e.currency_code ?? null), o = En(
    t,
    [
      "account_currency_code",
      "account_currency",
      "purchase_currency_code",
      "currency_code"
    ],
    i === "EUR" ? "EUR" : null
  ) ?? "EUR", a = Te(n == null ? void 0 : n.native), s = Te(n == null ? void 0 : n.security), c = Te(n == null ? void 0 : n.account), l = Te(n == null ? void 0 : n.eur), d = s ?? a, f = l ?? (o === "EUR" ? c : null), u = i ?? o, p = u === "EUR";
  let g, m;
  p ? (g = "EUR", m = f ?? d ?? c ?? null) : d != null ? (g = u, m = d) : c != null ? (g = o, m = c) : (g = "EUR", m = f ?? null);
  const y = Fn(m, g), h = p ? null : Fn(f, "EUR"), _ = !!h && h !== y, b = [], S = [];
  y ? (b.push(
    `<span class="purchase-price purchase-price--primary">${y}</span>`
  ), S.push(y.replace(/\u00A0/g, " "))) : (b.push('<span class="missing-value" role="note" aria-label="Kein Kaufpreis verfügbar" title="Kein Kaufpreis verfügbar">—</span>'), S.push("Kein Kaufpreis verfügbar")), _ && h && (b.push(
    `<span class="purchase-price purchase-price--secondary">${h}</span>`
  ), S.push(h.replace(/\u00A0/g, " ")));
  const P = b.join("<br>"), N = Te(r == null ? void 0 : r.purchase_value_eur) ?? 0, A = S.join(", ");
  return { markup: P, sortValue: N, ariaLabel: A };
}
function Oo(e) {
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
  const a = ge(e.performance), s = (a == null ? void 0 : a.day_change) ?? null;
  if (i == null && (s == null ? void 0 : s.price_change_eur) != null && (i = s.price_change_eur * t), o == null && (s == null ? void 0 : s.change_pct) != null && (o = s.change_pct), i == null && o != null) {
    const d = ae(e.current_value);
    if (d != null) {
      const f = d / (1 + o / 100);
      f && (i = d - f);
    }
  }
  const c = i != null && Number.isFinite(i) ? Math.round(i * 100) / 100 : null, l = o != null && Number.isFinite(o) ? Math.round(o * 100) / 100 : null;
  return { value: c, pct: l };
}
const rt = /* @__PURE__ */ new Set();
function mr(e) {
  if (!e)
    return;
  Array.from(e.querySelectorAll("tbody tr")).forEach((n) => {
    const r = n.cells.item(7), i = n.cells.item(8);
    if (!r || !i || r.dataset.gainPct && r.dataset.gainSign)
      return;
    const o = (i.textContent || "").trim() || "—";
    let a = "neutral";
    i.querySelector(".positive") ? a = "positive" : i.querySelector(".negative") && (a = "negative"), r.dataset.gainPct = o, r.dataset.gainSign = a;
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
    const o = ge(i.performance), a = typeof (o == null ? void 0 : o.gain_abs) == "number" ? o.gain_abs : null, s = typeof (o == null ? void 0 : o.gain_pct) == "number" ? o.gain_pct : null, c = Oo(i), l = typeof i.purchase_value == "number" || typeof i.purchase_value == "string" ? i.purchase_value : null;
    return {
      name: typeof i.name == "string" ? i.name : typeof i.name == "number" ? String(i.name) : "",
      current_holdings: typeof i.current_holdings == "number" || typeof i.current_holdings == "string" ? i.current_holdings : null,
      average_price: typeof i.purchase_value == "number" || typeof i.purchase_value == "string" ? i.purchase_value : null,
      purchase_value: l,
      current_value: typeof i.current_value == "number" || typeof i.current_value == "string" ? i.current_value : null,
      day_change_abs: c.value,
      day_change_pct: c.pct,
      gain_abs: a,
      gain_pct: s,
      performance: o
    };
  }), r = we(n, t, ["purchase_value", "current_value", "day_change_abs", "gain_abs"]);
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
          const { markup: m, sortValue: y, ariaLabel: h } = qo(d);
          u.innerHTML = m, u.dataset.sortValue = String(y), h ? u.setAttribute("aria-label", h) : u.removeAttribute("aria-label");
        }
        const p = c.cells.item(7);
        if (p) {
          const m = ge(d.performance), y = typeof (m == null ? void 0 : m.gain_pct) == "number" && Number.isFinite(m.gain_pct) ? m.gain_pct : null, h = y != null ? `${y.toLocaleString("de-DE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })} %` : "—", _ = y == null ? "neutral" : y > 0 ? "positive" : y < 0 ? "negative" : "neutral";
          p.dataset.gainPct = h, p.dataset.gainSign = _;
        }
        const g = c.cells.item(8);
        g && g.classList.add("gain-pct-cell");
      }), o.dataset.defaultSort = "name", o.dataset.defaultDir = "asc", mr(o), o.outerHTML;
    }
  } catch (i) {
    console.warn("renderPositionsTable: Konnte Sortier-Metadaten nicht injizieren:", i);
  }
  return r;
}
function Wo(e) {
  const t = gt(e ?? []);
  return Ue(t);
}
function Bo(e, t) {
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
        Zr(c) || console.warn("attachSecurityDetailDelegation: Detail-Tab konnte nicht geöffnet werden für", c);
      } catch (l) {
        console.error("attachSecurityDetailDelegation: Fehler beim Öffnen des Detail-Tabs", l);
      }
  })));
}
function ze(e, t) {
  Bo(e, t);
}
function _r(e) {
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
    const x = Number.isFinite(v.position_count) ? v.position_count : 0, $ = Number.isFinite(v.purchase_sum) ? v.purchase_sum : 0, Y = v.hasValue && typeof v.current_value == "number" && Number.isFinite(v.current_value) ? v.current_value : null, W = Y !== null, U = v.performance, B = typeof v.gain_abs == "number" ? v.gain_abs : typeof (U == null ? void 0 : U.gain_abs) == "number" ? U.gain_abs : null, z = typeof v.gain_pct == "number" ? v.gain_pct : typeof (U == null ? void 0 : U.gain_pct) == "number" ? U.gain_pct : null, ee = U && typeof U == "object" ? U.day_change : null, me = typeof v.day_change_abs == "number" ? v.day_change_abs : ee && typeof ee == "object" ? ee.value_change_eur ?? ee.price_change_eur : null, Ye = typeof v.day_change_pct == "number" ? v.day_change_pct : ee && typeof ee == "object" && typeof ee.change_pct == "number" ? ee.change_pct : null, Qr = v.fx_unavailable && W, ei = typeof v.coverage_ratio == "number" && Number.isFinite(v.coverage_ratio) ? v.coverage_ratio : "", ti = typeof v.provenance == "string" ? v.provenance : "", ni = typeof v.metric_run_uuid == "string" ? v.metric_run_uuid : "", De = rt.has(v.uuid), ri = De ? "portfolio-toggle expanded" : "portfolio-toggle", cn = `portfolio-details-${v.uuid}`, X = {
      fx_unavailable: v.fx_unavailable,
      purchase_value: $,
      current_value: Y,
      day_change_abs: me,
      day_change_pct: Ye,
      gain_abs: B,
      gain_pct: z
    }, be = { hasValue: W }, ii = H("purchase_value", X.purchase_value, X, be), oi = H("current_value", X.current_value, X, be), ai = H("day_change_abs", X.day_change_abs, X, be), si = H("day_change_pct", X.day_change_pct, X, be), ci = H("gain_abs", X.gain_abs, X, be), li = H("gain_pct", X.gain_pct, X, be), ln = W && typeof z == "number" && Number.isFinite(z) ? `${le(z)} %` : "", ui = W && typeof z == "number" && Number.isFinite(z) ? z > 0 ? "positive" : z < 0 ? "negative" : "neutral" : "", di = W && typeof Y == "number" && Number.isFinite(Y) ? Y : "", fi = W && typeof B == "number" && Number.isFinite(B) ? B : "", pi = W && typeof z == "number" && Number.isFinite(z) ? z : "", gi = W && typeof me == "number" && Number.isFinite(me) ? me : "", hi = W && typeof Ye == "number" && Number.isFinite(Ye) ? Ye : "", mi = String(x);
    let mt = "";
    ln && (mt = ` data-gain-pct="${t(ln)}" data-gain-sign="${t(ui)}"`), Qr && (mt += ' data-partial="true"'), n += `<tr class="portfolio-row"
                  data-portfolio="${v.uuid}"
                  data-position-count="${mi}"
                  data-current-value="${t(di)}"
                  data-purchase-sum="${t($)}"
                  data-day-change="${t(gi)}"
                  data-day-change-pct="${t(hi)}"
                  data-gain-abs="${t(fi)}"
                data-gain-pct="${t(pi)}"
                data-has-value="${W ? "true" : "false"}"
                data-fx-unavailable="${v.fx_unavailable ? "true" : "false"}"
                data-coverage-ratio="${t(ei)}"
                data-provenance="${t(ti)}"
                data-metric-run-uuid="${t(ni)}">`;
    const _i = Ve(v.name), yi = lr(hr(v.badges), {
      containerClass: "portfolio-badges"
    });
    n += `<td>
        <button type="button"
                class="${ri}"
                data-portfolio="${v.uuid}"
                aria-expanded="${De ? "true" : "false"}"
                aria-controls="${cn}">
          <span class="caret">${De ? "▼" : "▶"}</span>
          <span class="portfolio-name">${_i}</span>${yi}
        </button>
      </td>`;
    const bi = x.toLocaleString("de-DE");
    n += `<td class="align-right">${bi}</td>`, n += `<td class="align-right">${ii}</td>`, n += `<td class="align-right">${oi}</td>`, n += `<td class="align-right">${ai}</td>`, n += `<td class="align-right">${si}</td>`, n += `<td class="align-right"${mt}>${ci}</td>`, n += `<td class="align-right gain-pct-cell">${li}</td>`, n += "</tr>", n += `<tr class="portfolio-details${De ? "" : " hidden"}"
                data-portfolio="${v.uuid}"
                id="${cn}"
                role="region"
                aria-label="Positionen für ${v.name}">
      <td colspan="${r.length.toString()}">
        <div class="positions-container">${De ? Gt(v.uuid) ? Ue(Qn(v.uuid)) : '<div class="loading">Lade Positionen...</div>' : ""}</div>
      </td>
    </tr>`;
  });
  const i = e.filter((v) => typeof v.current_value == "number" && Number.isFinite(v.current_value)), o = e.reduce((v, x) => v + (Number.isFinite(x.position_count) ? x.position_count : 0), 0), a = i.reduce((v, x) => typeof x.current_value == "number" && Number.isFinite(x.current_value) ? v + x.current_value : v, 0), s = i.reduce((v, x) => typeof x.purchase_sum == "number" && Number.isFinite(x.purchase_sum) ? v + x.purchase_sum : v, 0), c = i.map((v) => {
    if (typeof v.day_change_abs == "number")
      return v.day_change_abs;
    const x = v.performance && typeof v.performance == "object" ? v.performance.day_change : null;
    if (x && typeof x == "object") {
      const $ = x.value_change_eur;
      if (typeof $ == "number" && Number.isFinite($))
        return $;
    }
    return null;
  }).filter((v) => typeof v == "number" && Number.isFinite(v)), l = c.reduce((v, x) => v + x, 0), d = i.reduce((v, x) => {
    var W;
    if (typeof ((W = x.performance) == null ? void 0 : W.gain_abs) == "number" && Number.isFinite(x.performance.gain_abs))
      return v + x.performance.gain_abs;
    const $ = typeof x.current_value == "number" && Number.isFinite(x.current_value) ? x.current_value : 0, Y = typeof x.purchase_sum == "number" && Number.isFinite(x.purchase_sum) ? x.purchase_sum : 0;
    return v + ($ - Y);
  }, 0), f = i.length > 0, u = i.length !== e.length, p = c.length > 0, g = p && f && a !== 0 ? (() => {
    const v = a - l;
    return v ? l / v * 100 : null;
  })() : null, m = f && s > 0 ? d / s * 100 : null, y = {
    fx_unavailable: u,
    purchase_value: f ? s : null,
    current_value: f ? a : null,
    day_change_abs: p ? l : null,
    day_change_pct: p ? g : null,
    gain_abs: f ? d : null,
    gain_pct: f ? m : null
  }, h = { hasValue: f }, _ = { hasValue: p }, b = H("purchase_value", y.purchase_value, y, h), S = H("current_value", y.current_value, y, h), P = H("day_change_abs", y.day_change_abs, y, _), N = H("day_change_pct", y.day_change_pct, y, _), A = H("gain_abs", y.gain_abs, y, h), E = H("gain_pct", y.gain_pct, y, h);
  let k = "";
  if (f && typeof m == "number" && Number.isFinite(m)) {
    const v = `${le(m)} %`, x = m > 0 ? "positive" : m < 0 ? "negative" : "neutral";
    k = ` data-gain-pct="${t(v)}" data-gain-sign="${t(x)}"`;
  }
  u && (k += ' data-partial="true"');
  const F = String(Math.round(o)), D = f ? String(a) : "", R = f ? String(s) : "", M = p ? String(l) : "", w = p && typeof g == "number" && Number.isFinite(g) ? String(g) : "", C = f ? String(d) : "", I = f && typeof m == "number" && Number.isFinite(m) ? String(m) : "";
  return n += `<tr class="footer-row"
      data-position-count="${F}"
      data-current-value="${t(D)}"
      data-purchase-sum="${t(R)}"
      data-day-change="${t(M)}"
      data-day-change-pct="${t(w)}"
      data-gain-abs="${t(C)}"
      data-gain-pct="${t(I)}"
      data-has-value="${f ? "true" : "false"}"
      data-fx-unavailable="${u ? "true" : "false"}">
      <td>Summe</td>
      <td class="align-right">${Math.round(o).toLocaleString("de-DE")}</td>
    <td class="align-right">${b}</td>
    <td class="align-right">${S}</td>
    <td class="align-right">${P}</td>
    <td class="align-right">${N}</td>
    <td class="align-right"${k}>${A}</td>
    <td class="align-right gain-pct-cell">${E}</td>
  </tr>`, n += "</tbody></table>", n;
}
function jo(e) {
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
function ke(e) {
  if (e === void 0)
    return null;
  const t = Number(e);
  return Number.isFinite(t) ? t : null;
}
function yr(e) {
  const t = jo(e);
  if (!t)
    return;
  const n = t.tBodies.item(0);
  if (!n)
    return;
  const r = Array.from(n.querySelectorAll("tr.portfolio-row"));
  if (!r.length)
    return;
  let i = 0, o = 0, a = 0, s = 0, c = 0, l = !1, d = !1, f = !0, u = !1;
  for (const $ of r) {
    const Y = ke($.dataset.positionCount);
    Y != null && (i += Y), $.dataset.fxUnavailable === "true" && (u = !0);
    const W = $.dataset.hasValue;
    if (!!(W === "false" || W === "0" || W === "" || W == null)) {
      f = !1;
      continue;
    }
    l = !0;
    const B = ke($.dataset.currentValue), z = ke($.dataset.gainAbs), ee = ke($.dataset.purchaseSum), me = ke($.dataset.dayChange);
    if (B == null || z == null || ee == null) {
      f = !1;
      continue;
    }
    o += B, s += z, a += ee, me != null && (c += me, d = !0);
  }
  const p = l && f, g = p && a > 0 ? s / a * 100 : null, m = d && p && o !== 0 ? (() => {
    const $ = o - c;
    return $ ? c / $ * 100 : null;
  })() : null;
  let y = Array.from(n.children).find(
    ($) => $ instanceof HTMLTableRowElement && $.classList.contains("footer-row")
  );
  y || (y = document.createElement("tr"), y.classList.add("footer-row"), n.appendChild(y));
  const h = Math.round(i).toLocaleString("de-DE"), _ = {
    fx_unavailable: u || !p,
    purchase_value: p ? a : null,
    current_value: p ? o : null,
    day_change_abs: d && p ? c : null,
    day_change_pct: d && p ? m : null,
    gain_abs: p ? s : null,
    gain_pct: p ? g : null
  }, b = { hasValue: p }, S = { hasValue: d && p }, P = H("purchase_value", _.purchase_value, _, b), N = H("current_value", _.current_value, _, b), A = H("day_change_abs", _.day_change_abs, _, S), E = H("day_change_pct", _.day_change_pct, _, S), k = H("gain_abs", _.gain_abs, _, b), F = H("gain_pct", _.gain_pct, _, b), D = t.tHead ? t.tHead.rows.item(0) : null, R = D ? D.cells.length : 0, M = y.cells.length, w = R || M, C = w > 0 ? w <= 5 : !1, I = p && typeof g == "number" ? `${le(g)} %` : "", v = p && typeof g == "number" ? g > 0 ? "positive" : g < 0 ? "negative" : "neutral" : "neutral";
  C ? y.innerHTML = `
      <td>Summe</td>
      <td class="align-right">${h}</td>
      <td class="align-right">${N}</td>
      <td class="align-right">${k}</td>
      <td class="align-right gain-pct-cell">${F}</td>
    ` : y.innerHTML = `
      <td>Summe</td>
      <td class="align-right">${h}</td>
      <td class="align-right">${P}</td>
      <td class="align-right">${N}</td>
      <td class="align-right">${A}</td>
      <td class="align-right">${E}</td>
      <td class="align-right">${k}</td>
      <td class="align-right">${F}</td>
    `;
  const x = y.cells.item(C ? 3 : 6);
  x && (x.dataset.gainPct = I || "—", x.dataset.gainSign = v), y.dataset.positionCount = String(Math.round(i)), y.dataset.currentValue = p ? String(o) : "", y.dataset.purchaseSum = p ? String(a) : "", y.dataset.dayChange = p && d ? String(c) : "", y.dataset.dayChangePct = p && d && typeof m == "number" ? String(m) : "", y.dataset.gainAbs = p ? String(s) : "", y.dataset.gainPct = p && typeof g == "number" ? String(g) : "", y.dataset.hasValue = p ? "true" : "false", y.dataset.fxUnavailable = u ? "true" : "false";
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
  const o = (u, p) => {
    const g = i.querySelector("tbody");
    if (!g) return;
    const m = Array.from(g.querySelectorAll("tr")).filter((b) => !b.classList.contains("footer-row")), y = g.querySelector("tr.footer-row"), h = (b) => {
      if (b == null) return 0;
      const S = b.replace(/\u00A0/g, " ").replace(/[%€]/g, "").replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, ""), P = Number.parseFloat(S);
      return Number.isFinite(P) ? P : 0;
    };
    m.sort((b, S) => {
      const N = {
        name: 0,
        current_holdings: 1,
        average_price: 2,
        purchase_value: 3,
        current_value: 4,
        day_change_abs: 5,
        day_change_pct: 6,
        gain_abs: 7,
        gain_pct: 8
      }[u], A = b.cells.item(N), E = S.cells.item(N);
      let k = "";
      if (A) {
        const M = A.textContent;
        typeof M == "string" && (k = M.trim());
      }
      let F = "";
      if (E) {
        const M = E.textContent;
        typeof M == "string" && (F = M.trim());
      }
      const D = (M, w) => {
        const C = M ? M.dataset.sortValue : void 0;
        if (C != null && C !== "") {
          const I = Number(C);
          if (Number.isFinite(I))
            return I;
        }
        return h(w);
      };
      let R;
      if (u === "name")
        R = k.localeCompare(F, "de", { sensitivity: "base" });
      else {
        const M = D(A, k), w = D(E, F);
        R = M - w;
      }
      return p === "asc" ? R : -R;
    }), i.querySelectorAll("thead th.sort-active").forEach((b) => {
      b.classList.remove("sort-active", "dir-asc", "dir-desc");
    });
    const _ = i.querySelector(`thead th[data-sort-key="${u}"]`);
    _ && _.classList.add("sort-active", p === "asc" ? "dir-asc" : "dir-desc"), m.forEach((b) => g.appendChild(b)), y && g.appendChild(y);
  }, a = r.dataset.sortKey, s = r.dataset.sortDir, c = i.dataset.defaultSort, l = i.dataset.defaultDir, d = St(a) ? a : St(c) ? c : "name", f = Pt(s) ? s : Pt(l) ? l : "asc";
  o(d, f), i.addEventListener("click", (u) => {
    const p = u.target;
    if (!(p instanceof Element))
      return;
    const g = p.closest("th[data-sort-key]");
    if (!g || !i.contains(g)) return;
    const m = g.getAttribute("data-sort-key");
    if (!St(m))
      return;
    let y = "asc";
    r.dataset.sortKey === m && (y = (Pt(r.dataset.sortDir) ? r.dataset.sortDir : "asc") === "asc" ? "desc" : "asc"), r.dataset.sortKey = m, r.dataset.sortDir = y, o(m, y);
  });
}
async function Yo(e, t, n) {
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
      const o = await Xn(
        tt,
        nt,
        e
      );
      if (o.error) {
        const s = typeof o.error == "string" ? o.error : String(o.error);
        r.innerHTML = `<div class="error">${s} <button class="retry-pos" data-portfolio="${e}">Erneut laden</button></div>`;
        return;
      }
      const a = gt(
        Array.isArray(o.positions) ? o.positions : []
      );
      Yt(e, a), Zt(e, a), r.innerHTML = Ue(a);
      try {
        qe(n, e);
      } catch (s) {
        console.warn("attachPortfolioToggleHandler: Sort-Init (Lazy) fehlgeschlagen:", s);
      }
      try {
        ze(n, e);
      } catch (s) {
        console.warn("reloadPortfolioPositions: Security-Listener konnte nicht gebunden werden:", s);
      }
    } catch (o) {
      const a = o instanceof Error ? o.message : String(o);
      r.innerHTML = `<div class="error">Fehler: ${a} <button class="retry-pos" data-portfolio="${e}">Retry</button></div>`;
    }
  }
}
async function Go(e, t, n = 3e3, r = 50) {
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
            const a = o.target;
            if (!(a instanceof Element))
              return;
            const s = a.closest(".retry-pos");
            if (s && r.contains(s)) {
              const p = s.getAttribute("data-portfolio");
              if (p) {
                const g = e.querySelector(
                  `.portfolio-details[data-portfolio="${p}"]`
                ), m = g == null ? void 0 : g.querySelector(".positions-container");
                await Yo(p, m ?? null, e);
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
              d.classList.remove("hidden"), c.classList.add("expanded"), c.setAttribute("aria-expanded", "true"), f && (f.textContent = "▼"), rt.add(l);
              try {
                en(e, l);
              } catch (p) {
                console.warn("attachPortfolioToggleHandler: Pending-Flush fehlgeschlagen:", p);
              }
              if (Gt(l)) {
                const p = d.querySelector(".positions-container");
                if (p) {
                  p.innerHTML = Ue(
                    Qn(l)
                  ), qe(e, l);
                  try {
                    ze(e, l);
                  } catch (g) {
                    console.warn("attachPortfolioToggleHandler: Security-Listener (Cache) Fehler:", g);
                  }
                }
              } else {
                const p = d.querySelector(".positions-container");
                p && (p.innerHTML = '<div class="loading">Lade Positionen...</div>');
                try {
                  const g = await Xn(
                    tt,
                    nt,
                    l
                  );
                  if (g.error) {
                    const y = typeof g.error == "string" ? g.error : String(g.error);
                    p && (p.innerHTML = `<div class="error">${y} <button class="retry-pos" data-portfolio="${l}">Erneut laden</button></div>`);
                    return;
                  }
                  const m = gt(
                    Array.isArray(g.positions) ? g.positions : []
                  );
                  if (Yt(l, m), Zt(
                    l,
                    m
                  ), p) {
                    p.innerHTML = Ue(m);
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
                } catch (g) {
                  const m = g instanceof Error ? g.message : String(g), y = d.querySelector(".positions-container");
                  y && (y.innerHTML = `<div class="error">Fehler beim Laden: ${m} <button class="retry-pos" data-portfolio="${l}">Retry</button></div>`), console.error("Fehler beim Lazy Load für", l, g);
                }
              }
            } else
              d.classList.add("hidden"), c.classList.remove("expanded"), c.setAttribute("aria-expanded", "false"), f && (f.textContent = "▶"), rt.delete(l);
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
function Ko(e) {
  const t = e.querySelector(".expandable-portfolio-table");
  t && (t.__ppReaderPortfolioFallbackBound || (t.__ppReaderPortfolioFallbackBound = !0, t.addEventListener("click", (n) => {
    const r = n.target;
    if (!(r instanceof Element) || !r.closest(".portfolio-toggle")) return;
    const o = e.querySelector(".portfolio-table");
    o != null && o.__ppReaderPortfolioToggleBound || (console.debug("Fallback-Listener aktiv – re-attach Hauptlistener"), tn(e));
  })));
}
async function br(e, t, n) {
  var D, R, M;
  tt = t ?? null, nt = n ?? null, console.debug(
    "renderDashboard: start – panelConfig:",
    n == null ? void 0 : n.config,
    "derived entry_id?",
    (M = (R = (D = n == null ? void 0 : n.config) == null ? void 0 : D._panel_custom) == null ? void 0 : R.config) == null ? void 0 : M.entry_id
  );
  const r = await Ti(t, n);
  nr(r.accounts);
  const i = cr(), o = await Ri(t, n);
  eo(o.portfolios);
  const a = lo();
  let s = "";
  try {
    s = await ki(t, n);
  } catch {
    s = "";
  }
  const c = i.reduce(
    (w, C) => w + (typeof C.balance == "number" && Number.isFinite(C.balance) ? C.balance : 0),
    0
  ), l = a.some((w) => w.fx_unavailable), d = i.some((w) => w.fx_unavailable && (w.balance == null || !Number.isFinite(w.balance))), f = a.reduce((w, C) => C.hasValue && typeof C.current_value == "number" && Number.isFinite(C.current_value) ? w + C.current_value : w, 0), u = c + f, p = "Teilw. fehlende FX-Kurse – Gesamtvermögen abweichend", m = a.some((w) => w.hasValue && typeof w.current_value == "number" && Number.isFinite(w.current_value)) || i.some((w) => typeof w.balance == "number" && Number.isFinite(w.balance)) ? `${le(u)}&nbsp;€` : `<span class="missing-value" role="note" aria-label="${p}" title="${p}">—</span>`, y = l || d ? `<span class="total-wealth-note">${p}</span>` : "", h = `
    <div class="header-meta-row">
      💰 Gesamtvermögen: <strong class="total-wealth-value">${m}</strong>${y}
    </div>
  `, _ = xt("Übersicht", h), b = _r(a), S = i.filter((w) => (w.currency_code ?? "EUR") === "EUR"), P = i.filter((w) => (w.currency_code ?? "EUR") !== "EUR"), A = P.some((w) => w.fx_unavailable) ? `
        <p class="table-note" role="note">
          <span class="table-note__icon" aria-hidden="true">⚠️</span>
          <span>Wechselkurse konnten nicht geladen werden. EUR-Werte werden derzeit nicht angezeigt.</span>
        </p>
      ` : "", E = `
    <div class="card">
      <h2>Liquidität</h2>
      <div class="scroll-container account-table">
        ${we(
    S.map((w) => ({
      name: et(w.name, Nn(w.badges), {
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
          ${we(
    P.map((w) => {
      const C = w.orig_balance, v = typeof C == "number" && Number.isFinite(C) ? `${C.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}&nbsp;${w.currency_code ?? ""}` : "";
      return {
        name: et(w.name, Nn(w.badges), {
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
        ${A}
      </div>` : ""}
  `, k = `
    <div class="card footer-card">
      <div class="meta">
        <div class="last-file-update">
          📂 Letzte Aktualisierung der Datei: <strong>${s || "Unbekannt"}</strong>
        </div>
      </div>
    </div>
  `, F = `
    ${_.outerHTML}
    <div class="card">
      <h2>Investment</h2>
      <div class="scroll-container portfolio-table">
        ${b}
      </div>
    </div>
    ${E}
    ${k}
  `;
  return Xo(e, a), F;
}
function Xo(e, t) {
  if (!e)
    return;
  const n = () => {
    try {
      const i = e, o = i.querySelector(".portfolio-table");
      o && o.querySelectorAll(".portfolio-toggle").length === 0 && (console.debug("Recovery: Tabelle ohne Buttons – erneuter Aufbau"), o.innerHTML = _r(t)), tn(e), Ko(e), rt.forEach((a) => {
        try {
          Gt(a) && (qe(e, a), ze(e, a));
        } catch (s) {
          console.warn("Init-Sortierung für expandiertes Depot fehlgeschlagen:", a, s);
        }
      });
      try {
        yr(i);
      } catch (a) {
        console.warn("renderDashboard: Footer-Summe konnte nicht aktualisiert werden:", a);
      }
      try {
        Co(e);
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
Ui({
  renderPositionsTable: (e) => Wo(e),
  applyGainPctMetadata: mr,
  attachSecurityDetailListener: ze,
  attachPortfolioPositionsSorting: qe,
  updatePortfolioFooter: (e) => {
    e && yr(e);
  }
});
const Zo = "http://www.w3.org/2000/svg", ve = 640, Se = 260, $e = { top: 12, right: 16, bottom: 24, left: 16 }, Le = "var(--pp-reader-chart-line, #3f51b5)", Rt = "var(--pp-reader-chart-area, rgba(63, 81, 181, 0.12))", Cn = "0.75rem", vr = "var(--pp-reader-chart-baseline, rgba(96, 125, 139, 0.75))", Sr = "6 4", Jo = 24 * 60 * 60 * 1e3;
function Qo(e) {
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
function ea(e) {
  return typeof e == "string" ? e : typeof e == "number" && Number.isFinite(e) ? e.toString() : e instanceof Date && Number.isFinite(e.getTime()) ? e.toISOString() : "";
}
function Z(e) {
  return `${String(e)}px`;
}
function te(e, t = {}) {
  const n = document.createElementNS(Zo, e);
  return Object.entries(t).forEach(([r, i]) => {
    const o = Qo(i);
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
function Pr(e, t) {
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
const Ar = (e) => {
  if (e && typeof e == "object" && "date" in e)
    return e.date;
}, Nr = (e) => {
  if (e && typeof e == "object" && "close" in e)
    return e.close;
}, wr = (e, t, n) => {
  if (Number.isFinite(e)) {
    const r = new Date(e);
    if (!Number.isNaN(r.getTime()))
      return r.toLocaleDateString("de-DE");
  }
  if (t && typeof t == "object" && "date" in t) {
    const r = t.date, i = ea(r);
    if (i)
      return i;
  }
  return Number.isFinite(e) ? e.toString() : "";
}, Er = (e, t, n) => (Number.isFinite(e) ? e : it(e, 0) ?? 0).toLocaleString("de-DE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
}), Fr = ({ xFormatted: e, yFormatted: t }) => `
    <div class="chart-tooltip-date">${e}</div>
    <div class="chart-tooltip-value">${t}&nbsp;€</div>
  `, Cr = ({
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
    width: ve,
    height: Se,
    margin: { ...$e },
    series: [],
    points: [],
    range: null,
    xAccessor: Ar,
    yAccessor: Nr,
    xFormatter: wr,
    yFormatter: Er,
    tooltipRenderer: Fr,
    markerTooltipRenderer: Cr,
    color: Le,
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
function ta(e, t) {
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
function na(e) {
  if (e.length === 0)
    return "";
  const t = [];
  return e.forEach((n, r) => {
    const i = r === 0 ? "M" : "L", o = n.x.toFixed(2), a = n.y.toFixed(2);
    t.push(`${i}${o} ${a}`);
  }), t.join(" ");
}
function ra(e) {
  const { baselineLine: t, baseline: n } = e;
  if (!t)
    return;
  const r = (n == null ? void 0 : n.color) ?? vr, i = (n == null ? void 0 : n.dashArray) ?? Sr;
  t.setAttribute("stroke", r), t.setAttribute("stroke-dasharray", i);
}
function At(e) {
  const { baselineLine: t, baseline: n, range: r, margin: i, width: o } = e;
  if (!t)
    return;
  const a = n == null ? void 0 : n.value;
  if (!r || a == null || !Number.isFinite(a)) {
    t.style.opacity = "0";
    return;
  }
  const { minY: s, maxY: c, boundedHeight: l } = r, d = Number.isFinite(s) ? s : a, u = (Number.isFinite(c) ? c : d + 1) - d, p = u === 0 ? 0.5 : (a - d) / u, g = Q(p, 0, 1), m = Math.max(l, 0), y = i.top + (1 - g) * m, h = Math.max(o - i.left - i.right, 0), _ = i.left, b = i.left + h;
  t.setAttribute("x1", _.toFixed(2)), t.setAttribute("x2", b.toFixed(2)), t.setAttribute("y1", y.toFixed(2)), t.setAttribute("y2", y.toFixed(2)), t.style.opacity = "1";
}
function ia(e, t, n) {
  var w;
  const { width: r, height: i, margin: o } = t, { xAccessor: a, yAccessor: s } = n;
  if (e.length === 0)
    return { points: [], range: null };
  const c = e.map((C, I) => {
    const v = a(C, I), x = s(C, I), $ = Pr(v, I), Y = it(x, Number.NaN);
    return Number.isFinite(Y) ? {
      index: I,
      data: C,
      xValue: $,
      yValue: Y
    } : null;
  }).filter((C) => !!C);
  if (c.length === 0)
    return { points: [], range: null };
  const l = c.reduce((C, I) => Math.min(C, I.xValue), c[0].xValue), d = c.reduce((C, I) => Math.max(C, I.xValue), c[0].xValue), f = c.reduce((C, I) => Math.min(C, I.yValue), c[0].yValue), u = c.reduce((C, I) => Math.max(C, I.yValue), c[0].yValue), p = Math.max(r - o.left - o.right, 1), g = Math.max(i - o.top - o.bottom, 1), m = Number.isFinite(l) ? l : 0, y = Number.isFinite(d) ? d : m + 1, h = Number.isFinite(f) ? f : 0, _ = Number.isFinite(u) ? u : h + 1, b = it((w = t.baseline) == null ? void 0 : w.value, null), S = b != null && Number.isFinite(b) ? Math.min(h, b) : h, P = b != null && Number.isFinite(b) ? Math.max(_, b) : _, N = Math.max(
    2,
    Math.min(
      6,
      Math.round(
        Math.max(i - o.top - o.bottom, 0) / 60
      ) || 4
    )
  ), { niceMin: A, niceMax: E } = fa(
    S,
    P,
    N
  ), k = Number.isFinite(A) ? A : h, F = Number.isFinite(E) ? E : _, D = y - m || 1, R = F - k || 1;
  return {
    points: c.map((C) => {
      const I = D === 0 ? 0.5 : (C.xValue - m) / D, v = R === 0 ? 0.5 : (C.yValue - k) / R, x = o.left + I * p, $ = o.top + (1 - v) * g;
      return {
        ...C,
        x,
        y: $
      };
    }),
    range: {
      minX: m,
      maxX: y,
      minY: k,
      maxY: F,
      boundedWidth: p,
      boundedHeight: g
    }
  };
}
function Nt(e) {
  const { markerLayer: t, markerOverlay: n, markers: r, range: i, margin: o, markerTooltip: a } = e;
  if (e.markerPositions = [], Ze(e), !t || !n)
    return;
  for (; t.firstChild; )
    t.removeChild(t.firstChild);
  for (; n.firstChild; )
    n.removeChild(n.firstChild);
  if (!i || !Array.isArray(r) || r.length === 0)
    return;
  const s = i.maxX - i.minX || 1, c = i.maxY - i.minY || 1;
  r.forEach((l, d) => {
    const f = Pr(l.x, d), u = it(l.y, Number.NaN), p = Number(u);
    if (!Number.isFinite(f) || !Number.isFinite(p))
      return;
    const g = s === 0 ? 0.5 : Q((f - i.minX) / s, 0, 1), m = c === 0 ? 0.5 : Q((p - i.minY) / c, 0, 1), y = o.left + g * i.boundedWidth, h = o.top + (1 - m) * i.boundedHeight, _ = te("g", {
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
  }), a && (a.style.opacity = "0", a.style.visibility = "hidden");
}
function Dr(e, t, n, r) {
  e.width = Number.isFinite(t) ? Number(t) : ve, e.height = Number.isFinite(n) ? Number(n) : Se, e.margin = {
    top: Number.isFinite(r == null ? void 0 : r.top) ? Number(r == null ? void 0 : r.top) : $e.top,
    right: Number.isFinite(r == null ? void 0 : r.right) ? Number(r == null ? void 0 : r.right) : $e.right,
    bottom: Number.isFinite(r == null ? void 0 : r.bottom) ? Number(r == null ? void 0 : r.bottom) : $e.bottom,
    left: Number.isFinite(r == null ? void 0 : r.left) ? Number(r == null ? void 0 : r.left) : $e.left
  };
}
function oa(e, t) {
  const n = e.xFormatter(t.xValue, t.data, t.index), r = e.yFormatter(t.yValue, t.data, t.index);
  return e.tooltipRenderer({
    point: t,
    xFormatted: n,
    yFormatted: r,
    data: t.data,
    index: t.index
  });
}
function aa(e, t, n, r = null) {
  const { tooltip: i, width: o, margin: a, height: s } = e;
  if (!i)
    return;
  const c = r && Number.isFinite(r.scaleX) && r.scaleX > 0 ? r.scaleX : 1, l = r && Number.isFinite(r.scaleY) && r.scaleY > 0 ? r.scaleY : 1, d = s - a.bottom;
  i.style.visibility = "visible", i.style.opacity = "1";
  const f = i.offsetWidth || 0, u = i.offsetHeight || 0, p = t.x * c, g = Q(
    p - f / 2,
    a.left * c,
    (o - a.right) * c - f
  ), m = Math.max(d * l - u, 0), y = 12, _ = (Number.isFinite(n) ? Q(n ?? 0, a.top, d) : t.y) * l;
  let b = _ - u - y;
  b < a.top * l && (b = _ + y), b = Q(b, 0, m);
  const S = Z(Math.round(g)), P = Z(Math.round(b));
  i.style.transform = `translate(${S}, ${P})`;
}
function $t(e) {
  const { tooltip: t, focusLine: n, focusCircle: r } = e;
  t && (t.style.opacity = "0", t.style.visibility = "hidden"), n && (n.style.opacity = "0"), r && (r.style.opacity = "0");
}
function sa(e, t) {
  const { marker: n } = t, r = e.xFormatter(t.marker.x, n, -1), i = e.yFormatter(t.marker.y, n, -1);
  return e.markerTooltipRenderer({
    marker: n,
    xFormatted: r,
    yFormatted: i
  });
}
function ca(e, t, n, r = null) {
  var D;
  const { markerTooltip: i, width: o, margin: a, height: s, tooltip: c } = e;
  if (!i)
    return;
  const l = r && Number.isFinite(r.scaleX) && r.scaleX > 0 ? r.scaleX : 1, d = r && Number.isFinite(r.scaleY) && r.scaleY > 0 ? r.scaleY : 1, f = s - a.bottom;
  i.style.visibility = "visible", i.style.opacity = "1";
  const u = i.offsetWidth || 0, p = i.offsetHeight || 0, g = t.x * l, m = Q(
    g - u / 2,
    a.left * l,
    (o - a.right) * l - u
  ), y = Math.max(f * d - p, 0), h = 10, _ = c == null ? void 0 : c.getBoundingClientRect(), b = (D = e.svg) == null ? void 0 : D.getBoundingClientRect(), S = _ && b ? _.top - b.top : null, P = _ && b ? _.bottom - b.top : null, A = (Number.isFinite(n) ? Q(n ?? t.y, a.top, f) : t.y) * d;
  let E;
  S != null && P != null ? S <= A ? E = S - p - h : E = P + h : (E = A - p - h, E < a.top * d && (E = A + h)), E = Q(E, 0, y);
  const k = Z(Math.round(m)), F = Z(Math.round(E));
  i.style.transform = `translate(${k}, ${F})`;
}
function Ze(e) {
  const { markerTooltip: t } = e;
  t && (t.style.opacity = "0", t.style.visibility = "hidden");
}
function la(e, t, n) {
  let i = null, o = 24 * 24;
  for (const a of e.markerPositions) {
    const s = a.x - t, c = a.y - n, l = s * s + c * c;
    l <= o && (i = a, o = l);
  }
  return i;
}
function ua(e, t) {
  if (t.handlersAttached || !t.overlay)
    return;
  const n = (i) => {
    if (t.points.length === 0 || !t.svg) {
      $t(t), Ze(t);
      return;
    }
    const o = t.svg.getBoundingClientRect(), a = t.width || ve, s = t.height || Se, c = o.width && Number.isFinite(o.width) && Number.isFinite(a) && a > 0 ? o.width / a : 1, l = o.height && Number.isFinite(o.height) && Number.isFinite(s) && s > 0 ? o.height / s : 1, d = c > 0 ? 1 / c : 1, f = l > 0 ? 1 / l : 1, u = (i.clientX - o.left) * d, p = (i.clientY - o.top) * f, g = {
      scaleX: c,
      scaleY: l
    };
    let m = t.points[0], y = Math.abs(u - m.x);
    for (let _ = 1; _ < t.points.length; _ += 1) {
      const b = t.points[_], S = Math.abs(u - b.x);
      S < y && (y = S, m = b);
    }
    t.focusCircle && (t.focusCircle.setAttribute("cx", m.x.toFixed(2)), t.focusCircle.setAttribute("cy", m.y.toFixed(2)), t.focusCircle.style.opacity = "1"), t.focusLine && (t.focusLine.setAttribute("x1", m.x.toFixed(2)), t.focusLine.setAttribute("x2", m.x.toFixed(2)), t.focusLine.setAttribute("y1", t.margin.top.toFixed(2)), t.focusLine.setAttribute(
      "y2",
      (t.height - t.margin.bottom).toFixed(2)
    ), t.focusLine.style.opacity = "1"), t.tooltip && (t.tooltip.innerHTML = oa(t, m), aa(t, m, p, g));
    const h = la(t, u, p);
    h && t.markerTooltip ? (t.markerTooltip.innerHTML = sa(t, h), ca(t, h, p, g)) : Ze(t);
  }, r = () => {
    $t(t), Ze(t);
  };
  t.overlay.addEventListener("pointermove", n), t.overlay.addEventListener("pointerenter", n), t.overlay.addEventListener("pointerleave", r), t.handlersAttached = !0, t.handlePointerMove = n, t.handlePointerLeave = r, e.addEventListener("pointercancel", r);
}
function da(e, t = {}) {
  const n = document.createElement("div");
  n.className = "line-chart-container", n.dataset.chartType = "line", n.style.position = "relative";
  const r = te("svg", {
    width: ve,
    height: Se,
    viewBox: `0 0 ${String(ve)} ${String(Se)}`,
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
    stroke: vr,
    "stroke-width": 1,
    "stroke-dasharray": Sr,
    opacity: 0
  }), a = te("path", {
    class: "line-chart-path",
    fill: "none",
    stroke: Le,
    "stroke-width": 2,
    "stroke-linecap": "round",
    "stroke-linejoin": "round"
  }), s = te("line", {
    class: "line-chart-focus-line",
    stroke: Le,
    "stroke-width": 1,
    "stroke-dasharray": "4 4",
    opacity: 0
  }), c = te("circle", {
    class: "line-chart-focus-circle",
    r: 4,
    fill: "#fff",
    stroke: Le,
    "stroke-width": 2,
    opacity: 0
  }), l = te("g", {
    class: "line-chart-markers"
  }), d = te("rect", {
    class: "line-chart-overlay",
    fill: "transparent",
    x: 0,
    y: 0,
    width: ve,
    height: Se
  });
  r.appendChild(i), r.appendChild(o), r.appendChild(a), r.appendChild(s), r.appendChild(c), r.appendChild(l), r.appendChild(d), n.appendChild(r);
  const f = document.createElement("div");
  f.className = "chart-tooltip", f.style.position = "absolute", f.style.top = "0", f.style.left = "0", f.style.pointerEvents = "none", f.style.opacity = "0", f.style.visibility = "hidden", n.appendChild(f);
  const u = document.createElement("div");
  u.className = "line-chart-marker-overlay", u.style.position = "absolute", u.style.top = "0", u.style.left = "0", u.style.width = "100%", u.style.height = "100%", u.style.pointerEvents = "none", u.style.overflow = "visible", u.style.zIndex = "2", n.appendChild(u);
  const p = document.createElement("div");
  p.className = "chart-tooltip chart-tooltip--marker", p.style.position = "absolute", p.style.top = "0", p.style.left = "0", p.style.pointerEvents = "none", p.style.opacity = "0", p.style.visibility = "hidden", n.appendChild(p), e.appendChild(n);
  const g = xr(n);
  if (g.svg = r, g.areaPath = i, g.linePath = a, g.baselineLine = o, g.focusLine = s, g.focusCircle = c, g.overlay = d, g.tooltip = f, g.markerOverlay = u, g.markerLayer = l, g.markerTooltip = p, g.xAccessor = t.xAccessor ?? Ar, g.yAccessor = t.yAccessor ?? Nr, g.xFormatter = t.xFormatter ?? wr, g.yFormatter = t.yFormatter ?? Er, g.tooltipRenderer = t.tooltipRenderer ?? Fr, g.markerTooltipRenderer = t.markerTooltipRenderer ?? Cr, g.color = t.color ?? Le, g.areaColor = t.areaColor ?? Rt, g.baseline = t.baseline ?? null, g.handlersAttached = !1, g.markers = Array.isArray(t.markers) ? t.markers.slice() : [], !g.xAxis) {
    const m = document.createElement("div");
    m.className = "line-chart-axis line-chart-axis-x", m.style.position = "absolute", m.style.left = "0", m.style.right = "0", m.style.bottom = "0", m.style.pointerEvents = "none", m.style.fontSize = Cn, m.style.color = "var(--secondary-text-color)", m.style.display = "block", n.appendChild(m), g.xAxis = m;
  }
  if (!g.yAxis) {
    const m = document.createElement("div");
    m.className = "line-chart-axis line-chart-axis-y", m.style.position = "absolute", m.style.top = "0", m.style.bottom = "0", m.style.left = "0", m.style.pointerEvents = "none", m.style.fontSize = Cn, m.style.color = "var(--secondary-text-color)", m.style.display = "block", n.appendChild(m), g.yAxis = m;
  }
  return Dr(g, t.width, t.height, t.margin), a.setAttribute("stroke", g.color), s.setAttribute("stroke", g.color), c.setAttribute("stroke", g.color), i.setAttribute("fill", g.areaColor), Tr(n, t), ua(n, g), n;
}
function Tr(e, t = {}) {
  if (!e) {
    console.error("updateLineChart: container element is required");
    return;
  }
  const n = xr(e);
  if (!n.svg || !n.linePath || !n.overlay) {
    console.error("updateLineChart: chart was not initialised with renderLineChart");
    return;
  }
  t.xAccessor && (n.xAccessor = t.xAccessor), t.yAccessor && (n.yAccessor = t.yAccessor), t.xFormatter && (n.xFormatter = t.xFormatter), t.yFormatter && (n.yFormatter = t.yFormatter), t.tooltipRenderer && (n.tooltipRenderer = t.tooltipRenderer), t.markerTooltipRenderer && (n.markerTooltipRenderer = t.markerTooltipRenderer), t.color && (n.color = t.color, n.linePath.setAttribute("stroke", n.color), n.focusLine && n.focusLine.setAttribute("stroke", n.color), n.focusCircle && n.focusCircle.setAttribute("stroke", n.color)), t.areaColor && (n.areaColor = t.areaColor, n.areaPath && n.areaPath.setAttribute("fill", n.areaColor)), Object.prototype.hasOwnProperty.call(t, "baseline") && (n.baseline = t.baseline ?? null), Array.isArray(t.markers) && (n.markers = t.markers.slice()), ra(n), Dr(n, t.width, t.height, t.margin);
  const { width: r, height: i } = n;
  n.svg.setAttribute("width", String(r)), n.svg.setAttribute("height", String(i)), n.svg.setAttribute("viewBox", `0 0 ${String(r)} ${String(i)}`), n.overlay.setAttribute("x", "0"), n.overlay.setAttribute("y", "0"), n.overlay.setAttribute("width", Math.max(r, 0).toFixed(2)), n.overlay.setAttribute("height", Math.max(i, 0).toFixed(2)), Array.isArray(t.series) && (n.series = Array.from(t.series));
  const { points: o, range: a } = ia(n.series, n, {
    xAccessor: n.xAccessor,
    yAccessor: n.yAccessor
  });
  if (n.points = o, n.range = a, o.length === 0) {
    n.linePath.setAttribute("d", ""), n.areaPath && n.areaPath.setAttribute("d", ""), $t(n), Nt(n), wt(n), At(n);
    return;
  }
  if (o.length === 1) {
    const c = o[0], l = Math.max(
      0.5,
      Math.min(4, Math.max(n.width - n.margin.left - n.margin.right, 1) * 0.01)
    ), d = `M${c.x.toFixed(2)} ${c.y.toFixed(2)} h${l.toFixed(2)}`;
    n.linePath.setAttribute("d", d), n.areaPath && n.areaPath.setAttribute("d", ""), n.focusCircle && (n.focusCircle.setAttribute("cx", c.x.toFixed(2)), n.focusCircle.setAttribute("cy", c.y.toFixed(2)), n.focusCircle.style.opacity = "1"), n.focusLine && (n.focusLine.style.opacity = "0"), wt(n), At(n), Nt(n);
    return;
  }
  const s = na(o);
  if (n.linePath.setAttribute("d", s), n.areaPath && a) {
    const c = n.margin.top + a.boundedHeight, l = ta(o, c);
    n.areaPath.setAttribute("d", l);
  }
  wt(n), At(n), Nt(n);
}
function wt(e) {
  const { xAxis: t, yAxis: n, range: r, margin: i, height: o, yFormatter: a } = e;
  if (!t || !n)
    return;
  if (!r) {
    t.innerHTML = "", n.innerHTML = "";
    return;
  }
  const { minX: s, maxX: c, minY: l, maxY: d, boundedWidth: f, boundedHeight: u } = r, p = Number.isFinite(s) && Number.isFinite(c) && c >= s, g = Number.isFinite(l) && Number.isFinite(d) && d >= l, m = Math.max(f, 0), y = Math.max(u, 0);
  if (t.style.left = Z(i.left), t.style.width = Z(m), t.style.top = Z(o - i.bottom + 6), t.innerHTML = "", p && m > 0) {
    const _ = (c - s) / Jo, b = Math.max(2, Math.min(6, Math.round(m / 140) || 4));
    pa(e, s, c, b, _).forEach(({ positionRatio: P, label: N }) => {
      const A = document.createElement("div");
      A.className = "line-chart-axis-tick line-chart-axis-tick-x", A.style.position = "absolute", A.style.bottom = "0";
      const E = Q(P, 0, 1);
      A.style.left = Z(E * m);
      let k = "-50%", F = "center";
      E <= 1e-3 ? (k = "0", F = "left", A.style.marginLeft = "2px") : E >= 0.999 && (k = "-100%", F = "right", A.style.marginRight = "2px"), A.style.transform = `translateX(${k})`, A.style.textAlign = F, A.textContent = N, t.appendChild(A);
    });
  }
  n.style.top = Z(i.top), n.style.height = Z(y);
  const h = Math.max(i.left - 6, 0);
  if (n.style.left = "0", n.style.width = Z(Math.max(h, 0)), n.innerHTML = "", g && y > 0) {
    const _ = Math.max(2, Math.min(6, Math.round(y / 60) || 4)), b = ga(l, d, _), S = a;
    b.forEach(({ value: P, positionRatio: N }) => {
      const A = document.createElement("div");
      A.className = "line-chart-axis-tick line-chart-axis-tick-y", A.style.position = "absolute", A.style.left = "0";
      const k = (1 - Q(N, 0, 1)) * y;
      A.style.top = Z(k), A.textContent = S(P, null, -1), n.appendChild(A);
    });
  }
}
function fa(e, t, n = 4) {
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
  const o = (t - e) / (r - 1), a = Lt(o), s = Math.floor(e / a) * a, c = Math.ceil(t / a) * a;
  return s === c ? {
    niceMin: e,
    niceMax: t + a
  } : {
    niceMin: s,
    niceMax: c
  };
}
function pa(e, t, n, r, i) {
  if (!Number.isFinite(t) || !Number.isFinite(n) || n < t)
    return [];
  if (!Number.isFinite(i) || i <= 0)
    return [
      {
        positionRatio: 0.5,
        label: xn(e, t, i || 0)
      }
    ];
  const o = Math.max(2, r), a = [], s = n - t;
  for (let c = 0; c < o; c += 1) {
    const l = o === 1 ? 0.5 : c / (o - 1), d = t + l * s;
    a.push({
      positionRatio: l,
      label: xn(e, d, i)
    });
  }
  return a;
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
  const r = t - e, i = Math.max(2, n), o = r / (i - 1), a = Lt(o), s = Math.floor(e / a) * a, c = Math.ceil(t / a) * a, l = [];
  for (let d = s; d <= c + a / 2; d += a) {
    const f = (d - e) / (t - e);
    l.push({
      value: d,
      positionRatio: Q(f, 0, 1)
    });
  }
  return l.length > i + 2 ? l.filter((d, f) => f % 2 === 0) : l;
}
function Lt(e) {
  if (!Number.isFinite(e) || e === 0)
    return 1;
  const t = Math.floor(Math.log10(Math.abs(e))), n = Math.abs(e) / 10 ** t;
  let r;
  return n <= 1 ? r = 1 : n <= 2 ? r = 2 : n <= 5 ? r = 5 : r = 10, r * 10 ** t;
}
function ha(e) {
  return Array.isArray(e) && e.every((t) => typeof t == "string");
}
function ma(e) {
  return typeof e == "object" && e !== null;
}
function _a(e) {
  if (!ma(e))
    return !1;
  const t = e;
  return typeof t.portfolioUuid != "string" ? !1 : ha(t.securityUuids);
}
function ya(e) {
  return e instanceof CustomEvent ? _a(e.detail) : !1;
}
const Et = { min: 0, max: 6 }, ot = { min: 2, max: 4 }, ba = "1Y", kr = [
  "1M",
  "6M",
  "1Y",
  "5Y",
  "ALL"
], va = {
  "1M": 30,
  "6M": 182,
  "1Y": 365,
  "5Y": 1826,
  ALL: Number.POSITIVE_INFINITY
}, Sa = /* @__PURE__ */ new Set([0, 2]), Pa = /* @__PURE__ */ new Set([1, 3]), Aa = "var(--pp-reader-chart-marker-buy, #2e7d32)", Na = "var(--pp-reader-chart-marker-sell, #c0392b)", Ft = {
  aggregation: "Aggregationsdaten",
  totals: "Kaufsummen",
  eur_total: "EUR-Kaufsumme"
}, Pe = /* @__PURE__ */ new Map(), Je = /* @__PURE__ */ new Map(), Oe = /* @__PURE__ */ new Map(), Ae = /* @__PURE__ */ new Map(), Rr = "pp-reader:portfolio-positions-updated", Me = /* @__PURE__ */ new Map();
function wa(e) {
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
function Ea(e, t) {
  if (e) {
    if (t) {
      Oe.set(e, t);
      return;
    }
    Oe.delete(e);
  }
}
function Fa(e) {
  if (!e || typeof window > "u")
    return null;
  if (Oe.has(e)) {
    const t = Oe.get(e) || null;
    if (t)
      return t;
  }
  return null;
}
function $r(e) {
  return Pe.has(e) || Pe.set(e, /* @__PURE__ */ new Map()), Pe.get(e);
}
function Lr(e) {
  return Ae.has(e) || Ae.set(e, /* @__PURE__ */ new Map()), Ae.get(e);
}
function Mr(e) {
  if (e) {
    if (Pe.has(e)) {
      try {
        const t = Pe.get(e);
        t && t.clear();
      } catch (t) {
        console.warn("invalidateHistoryCache: Konnte Cache nicht leeren", e, t);
      }
      Pe.delete(e);
    }
    if (Ae.has(e)) {
      try {
        const t = Ae.get(e);
        t == null || t.clear();
      } catch (t) {
        console.warn("invalidateHistoryCache: Konnte Marker-Cache nicht leeren", e, t);
      }
      Ae.delete(e);
    }
  }
}
function Hr(e) {
  e && Oe.delete(e);
}
function Ca(e, t) {
  if (!e || !t)
    return;
  const n = t.securityUuids;
  (Array.isArray(n) ? n : []).includes(e) && (Mr(e), Hr(e));
}
function xa(e) {
  if (!e || Me.has(e))
    return;
  const t = (n) => {
    ya(n) && Ca(e, n.detail);
  };
  try {
    window.addEventListener(Rr, t), Me.set(e, t);
  } catch (n) {
    console.error("ensureLiveUpdateSubscription: Registrierung fehlgeschlagen", n);
  }
}
function Da(e) {
  if (!e || !Me.has(e))
    return;
  const t = Me.get(e);
  try {
    t && window.removeEventListener(Rr, t);
  } catch (n) {
    console.error("removeLiveUpdateSubscription: Entfernen des Listeners fehlgeschlagen", n);
  }
  Me.delete(e);
}
function Ta(e) {
  e && (Da(e), Mr(e), Hr(e));
}
function Dn(e, t) {
  if (!Je.has(e)) {
    Je.set(e, { activeRange: t });
    return;
  }
  const n = Je.get(e);
  n && (n.activeRange = t);
}
function Ir(e) {
  var t;
  return ((t = Je.get(e)) == null ? void 0 : t.activeRange) ?? ba;
}
function Mt(e) {
  const t = Date.UTC(
    e.getUTCFullYear(),
    e.getUTCMonth(),
    e.getUTCDate()
  );
  return Math.floor(t / 864e5);
}
function Ee(e) {
  const t = new Date(e.getTime());
  return t.setUTCHours(0, 0, 0, 0), t;
}
function Tn(e) {
  return !(e instanceof Date) || Number.isNaN(e.getTime()) ? null : Mt(Ee(e));
}
function L(e) {
  return ae(e);
}
function Vr(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t || null;
}
function ye(e) {
  const t = Vr(e);
  return t ? t.toUpperCase() : null;
}
function ka(e) {
  if (!e)
    return null;
  const t = Kt(e.aggregation), n = L(t == null ? void 0 : t.purchase_total_security) ?? L(t == null ? void 0 : t.security_currency_total), r = L(t == null ? void 0 : t.purchase_total_account) ?? L(t == null ? void 0 : t.account_currency_total);
  if (ne(n) && ne(r)) {
    const s = n / r;
    if (ne(s))
      return s;
  }
  const i = Ce(e.average_cost), o = L(i == null ? void 0 : i.native) ?? L(i == null ? void 0 : i.security), a = L(i == null ? void 0 : i.account) ?? L(i == null ? void 0 : i.eur);
  if (ne(o) && ne(a)) {
    const s = o / a;
    if (ne(s))
      return s;
  }
  return null;
}
function Ur(e, t = "Unbekannter Fehler") {
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
  const n = Ee(t instanceof Date ? t : /* @__PURE__ */ new Date()), r = va[e], i = Tn(n), o = {};
  if (i != null && (o.end_date = i), Number.isFinite(r) && r > 0) {
    const a = new Date(n.getTime());
    a.setUTCDate(a.getUTCDate() - (r - 1));
    const s = Tn(a);
    s != null && (o.start_date = s);
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
      return Number.isNaN(n.getTime()) ? null : Ee(n);
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
          return Ee(r);
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
    let r = L(t.close);
    if (r == null) {
      const o = L(t.close_raw);
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
  const r = [], i = ye(t), o = i || "EUR", a = ka(n);
  return e.forEach((s, c) => {
    const l = typeof s.type == "number" ? s.type : Number(s.type), d = Sa.has(l), f = Pa.has(l);
    if (!d && !f)
      return;
    const u = Ra(s.date);
    let p = L(s.price);
    if (!u || p == null)
      return;
    const g = ye(s.currency_code), m = i ?? g ?? o;
    g && i && g !== i && ne(a) && (p *= a);
    const y = L(s.shares), h = L(s.net_price_eur), _ = d ? "Kauf" : "Verkauf", b = y != null ? `${an(y)} @ ` : "", S = `${_} ${b}${ce(p)} ${m}`, P = f && h != null ? `${S} (netto ${ce(h)} EUR)` : S, N = d ? Aa : Na, A = typeof s.uuid == "string" && s.uuid.trim() || `${_}-${u.getTime().toString()}-${c.toString()}`;
    r.push({
      id: A,
      x: u.getTime(),
      y: p,
      color: N,
      label: P,
      payload: {
        type: _,
        currency: m,
        transactionCurrency: g,
        shares: y,
        price: p,
        netPriceEur: h,
        date: u.toISOString(),
        portfolio: s.portfolio
      }
    });
  }), r;
}
function rn(e) {
  var r;
  const t = L(e == null ? void 0 : e.last_price_native) ?? L((r = e == null ? void 0 : e.last_price) == null ? void 0 : r.native) ?? null;
  if (T(t))
    return t;
  if (ye(e == null ? void 0 : e.currency_code) === "EUR") {
    const i = L(e == null ? void 0 : e.last_price_eur);
    if (T(i))
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
  if (!T(i))
    return r;
  const o = $a(t) ?? Date.now(), a = new Date(o);
  if (Number.isNaN(a.getTime()))
    return r;
  const s = Mt(Ee(a));
  let c = null;
  for (let l = r.length - 1; l >= 0; l -= 1) {
    const d = r[l], f = nn(d.date);
    if (!f)
      continue;
    const u = Mt(Ee(f));
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
function T(e) {
  return typeof e == "number" && Number.isFinite(e);
}
function ne(e) {
  return typeof e == "number" && Number.isFinite(e) && e > 0;
}
function He(e, t, n) {
  if (!T(e) || !T(t))
    return !1;
  const r = Math.abs(e - t), i = Math.max(Math.abs(e), Math.abs(t), 1);
  return r <= i * 1e-4;
}
function La(e, t) {
  return !T(t) || t === 0 || !T(e) ? null : qi((e - t) / t * 100);
}
function zr(e, t) {
  if (e.length === 0)
    return { priceChange: null, priceChangePct: null };
  const n = e[0], r = L(n.close);
  if (!T(r) || r === 0)
    return { priceChange: null, priceChangePct: null };
  const i = e[e.length - 1], o = L(i.close), a = L(t) ?? o;
  if (!T(a))
    return { priceChange: null, priceChangePct: null };
  const s = a - r, c = Object.is(s, -0) ? 0 : s, l = La(a, r);
  return { priceChange: c, priceChangePct: l };
}
function on(e, t) {
  if (!T(e) || e === 0)
    return "neutral";
  const n = 0.5 / Math.pow(10, t);
  return Math.abs(e) < n ? "neutral" : e > 0 ? "positive" : "negative";
}
function Ma(e, t) {
  if (!T(e))
    return '<span class="value neutral">—</span>';
  const n = ce(e);
  if (n === "—")
    return '<span class="value neutral">—</span>';
  const r = on(e, ot.max), i = t ? `&nbsp;${t}` : "";
  return `<span class="value ${r}">${n}${i}</span>`;
}
function Ha(e) {
  return T(e) ? `<span class="value ${on(e, 2)} value--percentage">${le(e)}&nbsp;%</span>` : '<span class="value neutral">—</span>';
}
function qr(e, t, n, r) {
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
function Or(e, t = { status: "empty" }) {
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
      const r = Ur(
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
function an(e) {
  const t = L(e);
  if (t == null)
    return "—";
  const n = Math.abs(t % 1) > 0, r = n ? 2 : Et.min, i = n ? Et.max : Et.min;
  return t.toLocaleString("de-DE", {
    minimumFractionDigits: r,
    maximumFractionDigits: i
  });
}
function ce(e) {
  const t = L(e);
  return t == null ? "—" : t.toLocaleString("de-DE", {
    minimumFractionDigits: ot.min,
    maximumFractionDigits: ot.max
  });
}
function Va(e, t) {
  const n = ce(e), r = `&nbsp;${t}`;
  return `<span class="${on(e, ot.max)}">${n}${r}</span>`;
}
function Wr(e) {
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
        data-symbol="${Wr(e)}"
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
  const r = Ce(e == null ? void 0 : e.average_cost), i = (r == null ? void 0 : r.account) ?? (T(t) ? t : L(t));
  if (!T(i))
    return null;
  const o = (e == null ? void 0 : e.account_currency_code) ?? (e == null ? void 0 : e.account_currency);
  if (typeof o == "string" && o.trim())
    return o.trim().toUpperCase();
  const a = ye(e == null ? void 0 : e.currency_code) ?? "", s = (r == null ? void 0 : r.security) ?? (r == null ? void 0 : r.native) ?? (T(n) ? n : L(n)), c = Kt(e == null ? void 0 : e.aggregation);
  if (a && T(s) && He(i, s))
    return a;
  const l = L(c == null ? void 0 : c.purchase_total_security) ?? L(e == null ? void 0 : e.purchase_total_security), d = L(c == null ? void 0 : c.purchase_total_account) ?? L(e == null ? void 0 : e.purchase_total_account);
  let f = null;
  if (T(l) && l !== 0 && T(d) && (f = d / l), (r == null ? void 0 : r.source) === "eur_total")
    return "EUR";
  const p = r == null ? void 0 : r.eur;
  if (T(p) && He(i, p))
    return "EUR";
  const g = L(e == null ? void 0 : e.purchase_value_eur);
  return T(g) ? "EUR" : f != null && He(f, 1) ? a || null : a === "EUR" ? "EUR" : a || "EUR";
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
    const a = t == null ? void 0 : t[o], s = st(a);
    if (s != null)
      return s;
  }
  const r = [];
  t && "last_price_fetched_at" in t && r.push(t.last_price_fetched_at);
  const i = e == null ? void 0 : e.last_price;
  i && typeof i == "object" && r.push(i.fetched_at), t && "last_price_date" in t && r.push(t.last_price_date);
  for (const o of r) {
    const a = st(o);
    if (a != null)
      return a;
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
  const n = ye(e.currency_code) ?? "", r = Ce(e.average_cost);
  if (!r || !n)
    return null;
  const i = r.native ?? r.security ?? null;
  let a = r.account ?? r.eur ?? null, s = ye(t) ?? "";
  if (ne(r.eur) && (!s || s === n) && (a = r.eur, s = "EUR"), !n || !s || n === s || !ne(i) || !ne(a))
    return null;
  const c = a / i;
  if (!Number.isFinite(c) || c <= 0)
    return null;
  const l = kn(c);
  if (!l)
    return null;
  let d = null;
  if (c > 0) {
    const _ = 1 / c;
    Number.isFinite(_) && _ > 0 && (d = kn(_));
  }
  const f = Wa(e), u = Ba(f), p = [`FX-Kurs (Kauf): 1 ${n} = ${l} ${s}`];
  d && p.push(`1 ${s} = ${d} ${n}`);
  const g = [], m = r.source, y = m in Ft ? Ft[m] : Ft.aggregation;
  if (g.push(`Quelle: ${y}`), T(r.coverage_ratio)) {
    const _ = Math.min(Math.max(r.coverage_ratio * 100, 0), 100);
    g.push(
      `Abdeckung: ${_.toLocaleString("de-DE", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      })}%`
    );
  }
  g.length && p.push(...g);
  const h = u ?? "Datum unbekannt";
  return `${p.join(" · ")} (Stand: ${h})`;
}
function Rn(e) {
  if (!e)
    return null;
  const t = Ce(e.average_cost), n = (t == null ? void 0 : t.native) ?? (t == null ? void 0 : t.security) ?? null;
  return T(n) ? n : null;
}
function $n(e) {
  var W;
  if (!e)
    return '<div class="meta-error">Keine Snapshot-Daten verfügbar.</div>';
  const t = e.currency_code || "EUR", n = e.total_holdings_precise ?? e.total_holdings, r = an(n), i = e.last_price_native ?? ((W = e.last_price) == null ? void 0 : W.native) ?? e.last_price_eur, o = ce(i), a = o === "—" ? null : `${o}${`&nbsp;${t}`}`, s = L(e.market_value_eur) ?? L(e.current_value_eur) ?? null, c = Ce(e.average_cost), l = (c == null ? void 0 : c.native) ?? (c == null ? void 0 : c.security) ?? null, d = (c == null ? void 0 : c.eur) ?? null, u = (c == null ? void 0 : c.account) ?? null ?? d, p = ge(e.performance), g = (p == null ? void 0 : p.day_change) ?? null, m = (g == null ? void 0 : g.price_change_native) ?? null, y = (g == null ? void 0 : g.price_change_eur) ?? null, h = T(m) ? m : y, _ = T(m) ? t : "EUR", b = (U, B = "") => {
    const z = ["value"];
    return B && z.push(...B.split(" ").filter(Boolean)), `<span class="${z.join(" ")}">${U}</span>`;
  }, S = (U = "") => {
    const B = ["value--missing"];
    return U && B.push(U), b("—", B.join(" "));
  }, P = (U, B = "") => {
    if (!T(U))
      return S(B);
    const z = ["value--gain"];
    return B && z.push(B), b(Ai(U), z.join(" "));
  }, N = (U, B = "") => {
    if (!T(U))
      return S(B);
    const z = ["value--gain-percentage"];
    return B && z.push(B), b(Ni(U), z.join(" "));
  }, A = a ? b(a, "value--price") : S("value--price"), E = r === "—" ? S("value--holdings") : b(r, "value--holdings"), k = T(s) ? b(`${le(s)}&nbsp;€`, "value--market-value") : S("value--market-value"), F = T(h) ? b(
    Va(h, _),
    "value--gain value--absolute"
  ) : S("value--absolute"), D = N(
    g == null ? void 0 : g.change_pct,
    "value--percentage"
  ), R = P(
    p == null ? void 0 : p.total_change_eur,
    "value--absolute"
  ), M = N(
    p == null ? void 0 : p.total_change_pct,
    "value--percentage"
  ), w = Oa(
    e,
    u,
    l
  ), C = ja(
    e,
    w
  ), I = C ? ` title="${Wr(C)}"` : "", v = [], x = T(d);
  T(l) ? v.push(
    b(
      `${ce(l)}${`&nbsp;${t}`}`,
      "value--average value--average-native"
    )
  ) : v.push(
    S("value--average value--average-native")
  );
  let $ = null, Y = null;
  return x && (t !== "EUR" || !T(l) || !He(d, l)) ? ($ = d, Y = "EUR") : T(u) && w && (w !== t || !He(u, l ?? NaN)) && ($ = u, Y = w), $ != null && T($) && v.push(
    b(
      `${ce($)}${Y ? `&nbsp;${Y}` : ""}`,
      "value--average value--average-eur"
    )
  ), `
    <div class="security-meta-grid security-meta-grid--expanded">
      <div class="security-meta-item security-meta-item--price">
        <span class="label">Letzter Preis</span>
        <div class="value-group">${A}</div>
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
          ${F}
          ${D}
        </div>
      </div>
      <div class="security-meta-item security-meta-item--total-change">
        <span class="label">Gesamtänderung</span>
        <div class="value-group">
          ${R}
          ${M}
        </div>
      </div>
      <div class="security-meta-item security-meta-item--holdings">
        <span class="label">Bestand</span>
        <div class="value-group">${E}</div>
      </div>
      <div class="security-meta-item security-meta-item--market-value">
        <span class="label">Marktwert (EUR)</span>
        <div class="value-group">${k}</div>
      </div>
    </div>
  `;
}
function Br(e) {
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
function Ya(e, t, {
  currency: n,
  baseline: r,
  markers: i
} = {}) {
  const o = e.clientWidth || e.offsetWidth || 0, a = o > 0 ? o : 640, s = Math.min(Math.max(Math.floor(a * 0.5), 240), 440), c = (n || "").toUpperCase() || "EUR", l = T(r) ? r : null, d = Math.max(48, Math.min(72, Math.round(a * 0.075))), f = Math.max(28, Math.min(56, Math.round(a * 0.05))), u = Math.max(40, Math.min(64, Math.round(s * 0.14)));
  return {
    width: a,
    height: s,
    margin: {
      top: 18,
      right: f,
      bottom: u,
      left: d
    },
    series: t,
    yFormatter: (g) => ce(g),
    tooltipRenderer: ({ xFormatted: g, yFormatted: m }) => `
      <div class="chart-tooltip-date">${g}</div>
      <div class="chart-tooltip-value">${m}&nbsp;${c}</div>
    `,
    markerTooltipRenderer: ({
      marker: g,
      xFormatted: m,
      yFormatted: y
    }) => {
      const h = (g == null ? void 0 : g.payload) ?? {}, _ = Vr(h.type), b = L(h.shares), S = b != null ? an(b) : null, P = ye(h.currency) ?? c, N = [];
      _ && N.push(_), S && N.push(`${S} Stück`), m && N.push(`am ${m}`);
      const A = N.join(" ").trim() || (typeof g.label == "string" ? g.label : m), E = typeof y == "string" && y.trim() ? y.trim() : ce(h.price), k = E ? `${E}${P ? `&nbsp;${P}` : ""}` : P ?? "";
      return `
      <div class="chart-tooltip-date">${A}</div>
      <div class="chart-tooltip-value">${k}</div>
    `;
    },
    baseline: l != null ? {
      value: l
    } : null,
    markers: Array.isArray(i) ? i : []
  };
}
const Ln = /* @__PURE__ */ new WeakMap();
function Ga(e, t, n = {}) {
  if (t.length === 0)
    return;
  const r = Ya(e, t, n);
  let i = Ln.get(e) ?? null;
  if (!i || !e.contains(i)) {
    e.innerHTML = "", i = da(e, r), i && Ln.set(e, i);
    return;
  }
  Tr(i, r);
}
function Mn(e, t) {
  e && (e.dataset.activeRange = t, e.querySelectorAll(".security-range-button").forEach((n) => {
    const i = n.dataset.range === t;
    n.classList.toggle("active", i), n.setAttribute("aria-pressed", i ? "true" : "false"), n.disabled = !1, n.classList.remove("loading");
  }));
}
function Ka(e, t, n, r, i) {
  const o = e.querySelector(".security-info-bar");
  if (!o || !o.parentElement)
    return;
  const a = document.createElement("div");
  a.innerHTML = qr(t, n, r, i).trim();
  const s = a.firstElementChild;
  s && o.parentElement.replaceChild(s, o);
}
function Hn(e, t, n, r, i = {}) {
  const o = e.querySelector(".security-detail-placeholder");
  if (o && (o.innerHTML = `
    <h2>Historie</h2>
    ${Or(t, n)}
  `, n.status === "loaded" && Array.isArray(r) && r.length)) {
    const a = o.querySelector(".history-chart");
    a && requestAnimationFrame(() => {
      Ga(a, r, i);
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
    initialRange: a,
    initialHistory: s,
    initialHistoryState: c
  } = e;
  setTimeout(() => {
    const l = t.querySelector(".security-range-selector");
    if (!l)
      return;
    const d = $r(i), f = Lr(i), u = Rn(o);
    Array.isArray(s) && c.status !== "error" && d.set(a, s), xa(i), Dn(i, a), Mn(l, a);
    const g = It(
      s,
      o
    );
    let m = c;
    m.status !== "error" && (m = g.length ? { status: "loaded" } : { status: "empty" }), Hn(
      t,
      a,
      m,
      g,
      {
        currency: o == null ? void 0 : o.currency_code,
        baseline: u,
        markers: f.get(a) ?? []
      }
    );
    const y = async (h) => {
      if (h === Ir(i))
        return;
      const _ = l.querySelector(
        `.security-range-button[data-range="${h}"]`
      );
      _ && (_.disabled = !0, _.classList.add("loading"));
      let b = d.get(h) ?? null, S = f.get(h) ?? null, P = null, N = [];
      if (b)
        P = b.length ? { status: "loaded" } : { status: "empty" };
      else
        try {
          const R = at(h), M = await Qe(
            n,
            r,
            i,
            R
          );
          b = Ht(M.prices), S = ct(
            M.transactions,
            o == null ? void 0 : o.currency_code,
            o
          ), d.set(h, b), S = Array.isArray(S) ? S : [], f.set(h, S), P = b.length ? { status: "loaded" } : { status: "empty" };
        } catch (R) {
          console.error("Range-Wechsel: Historie konnte nicht geladen werden", R), b = [], S = [], P = {
            status: "error",
            message: Br(R) || "Die historischen Daten konnten aufgrund eines Fehlers nicht geladen werden."
          };
        }
      if (!Array.isArray(S))
        try {
          const R = at(h), M = await Qe(
            n,
            r,
            i,
            R
          );
          S = ct(
            M.transactions,
            o == null ? void 0 : o.currency_code,
            o
          ), S = Array.isArray(S) ? S : [], f.set(h, S);
        } catch (R) {
          console.error("Range-Wechsel: Transaktionsmarker konnten nicht geladen werden", R), S = [];
        }
      N = It(b, o), P.status !== "error" && (P = N.length ? { status: "loaded" } : { status: "empty" });
      const A = rn(o), { priceChange: E, priceChangePct: k } = zr(
        N,
        A
      ), F = Array.isArray(S) ? S : [];
      Dn(i, h), Mn(l, h), Ka(
        t,
        h,
        E,
        k,
        o == null ? void 0 : o.currency_code
      );
      const D = Rn(o);
      Hn(
        t,
        h,
        P,
        N,
        {
          currency: o == null ? void 0 : o.currency_code,
          baseline: D,
          markers: F
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
    const a = async () => {
      const s = (o.dataset.symbol || i || "").trim();
      if (!s) {
        console.warn("News-Prompt: Kein Ticker verfügbar");
        return;
      }
      if (!o.classList.contains("loading")) {
        o.disabled = !0, o.classList.add("loading");
        try {
          const c = await Li(n, r), l = (c.placeholder || "").trim() || "{TICKER}", d = (c.prompt_template || "").trim(), f = d ? l && d.includes(l) ? d.split(l).join(s) : `${d}

Ticker: ${s}` : `Ticker: ${s}`;
          if (await qa(f), c.link)
            try {
              window.open(c.link, "_blank", "noopener,noreferrer");
            } catch (u) {
              console.warn("News-Prompt: Link konnte nicht geöffnet werden", u);
            }
        } catch (c) {
          console.error("News-Prompt: Kopiervorgang fehlgeschlagen", c);
        } finally {
          o.classList.remove("loading"), o.disabled = !1;
        }
      }
    };
    o.addEventListener("click", () => {
      a();
    });
  }, 0);
}
async function Ja(e, t, n, r) {
  if (!r)
    return console.error("renderSecurityDetail: securityUuid fehlt"), '<div class="card"><h2>Fehler</h2><p>Kein Wertpapier angegeben.</p></div>';
  const i = Fa(r);
  let o = null, a = null;
  try {
    const F = await $i(
      t,
      n,
      r
    ), D = F.snapshot;
    o = D && typeof D == "object" ? D : F;
  } catch (F) {
    console.error("renderSecurityDetail: Snapshot konnte nicht geladen werden", F), a = Ur(F);
  }
  const s = o || i, c = !!(i && !o), l = ((s == null ? void 0 : s.source) ?? "") === "cache";
  r && Ea(r, s ?? null);
  const d = s && (c || l) ? wa({ fallbackUsed: c, flaggedAsCache: l }) : "", f = (s == null ? void 0 : s.name) || "Wertpapierdetails";
  if (a) {
    const F = xt(
      f,
      $n(s)
    );
    return F.classList.add("security-detail-header"), `
      ${F.outerHTML}
      ${d}
      <div class="card error-card">
        <h2>Fehler beim Laden</h2>
        <p>${a}</p>
      </div>
    `;
  }
  const u = Ir(r), p = $r(r), g = Lr(r);
  let m = p.has(u) ? p.get(u) ?? null : null, y = { status: "empty" }, h = g.has(u) ? g.get(u) ?? null : null;
  if (Array.isArray(m))
    y = m.length ? { status: "loaded" } : { status: "empty" };
  else {
    m = [];
    try {
      const F = at(u), D = await Qe(
        t,
        n,
        r,
        F
      );
      m = Ht(D.prices), h = ct(
        D.transactions,
        s == null ? void 0 : s.currency_code,
        s
      ), p.set(u, m), h = Array.isArray(h) ? h : [], g.set(u, h), y = m.length ? { status: "loaded" } : { status: "empty" };
    } catch (F) {
      console.error(
        "renderSecurityDetail: Historie konnte nicht geladen werden",
        F
      ), y = {
        status: "error",
        message: Br(F) || "Die historischen Daten konnten aufgrund eines Fehlers nicht geladen werden."
      };
    }
  }
  if (!Array.isArray(h))
    try {
      const F = at(u), D = await Qe(
        t,
        n,
        r,
        F
      ), R = Ht(D.prices);
      h = ct(
        D.transactions,
        s == null ? void 0 : s.currency_code,
        s
      ), p.set(u, R), h = Array.isArray(h) ? h : [], g.set(u, h), m = R, y = m.length ? { status: "loaded" } : { status: "empty" };
    } catch (F) {
      console.error(
        "renderSecurityDetail: Transaktionsmarker konnten nicht geladen werden",
        F
      ), h = [];
    }
  const _ = It(
    m,
    s
  );
  y.status !== "error" && (y = _.length ? { status: "loaded" } : { status: "empty" });
  const b = xt(
    f,
    $n(s)
  );
  b.classList.add("security-detail-header");
  const S = Ua(s, r), P = za(S), N = rn(s), { priceChange: A, priceChangePct: E } = zr(
    _,
    N
  ), k = qr(
    u,
    A,
    E,
    s == null ? void 0 : s.currency_code
  );
  return Xa({
    root: e,
    hass: t,
    panelConfig: n,
    securityUuid: r,
    snapshot: s,
    initialRange: u,
    initialHistory: m,
    initialHistoryState: y
  }), Za({
    root: e,
    hass: t,
    panelConfig: n,
    tickerSymbol: S
  }), `
    ${b.outerHTML}
    ${d}
    ${P}
    ${k}
    ${Ia(u)}
    <div class="card security-detail-placeholder">
      <h2>Historie</h2>
      ${Or(u, y)}
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
      Ta(n);
    }
  }));
}
const es = Pi, Vt = "pp-reader-sticky-anchor", lt = "overview", Ut = "security:", ts = [
  { key: lt, title: "Dashboard", render: br }
], Fe = /* @__PURE__ */ new Map(), We = [], ut = /* @__PURE__ */ new Map();
let zt = null, Ct = !1, Ne = null, O = 0, Re = null;
function dt(e) {
  return typeof e == "object" && e !== null;
}
function jr(e) {
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
function In(e) {
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
        const n = In(t);
        if (n)
          return n;
      }
    return null;
  }
  return dt(e) ? In(e) : null;
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
function sn(e) {
  return typeof e != "string" || !e.startsWith(Ut) ? null : e.slice(Ut.length) || null;
}
function as() {
  if (!Ne)
    return !1;
  const e = Zr(Ne);
  return e || (Ne = null), e;
}
function oe() {
  const e = We.map((t) => Fe.get(t)).filter((t) => !!t);
  return [...ts, ...e];
}
function ss(e) {
  const t = oe();
  return e < 0 || e >= t.length ? null : t[e];
}
function Yr(e) {
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
function Vn(e) {
  const t = oe();
  return !t.length || e < 0 ? 0 : e >= t.length ? t.length - 1 : e;
}
async function cs(e, t, n, r) {
  const i = oe(), o = Vn(e);
  if (o === O) {
    e > O && as();
    return;
  }
  Gr();
  const a = O >= 0 && O < i.length ? i[O] : null, s = a ? sn(a.key) : null;
  let c = o;
  if (s) {
    const l = o >= 0 && o < i.length ? i[o] : null;
    if (l && l.key === lt && ps(s, { suppressRender: !0 })) {
      const u = oe().findIndex((p) => p.key === lt);
      c = u >= 0 ? u : 0;
    }
  }
  if (!Ct) {
    Ct = !0;
    try {
      O = Vn(c);
      const l = O;
      await Jr(t, n, r), fs(l);
    } catch (l) {
      console.error("navigateToPage: Fehler beim Rendern des Tabs", l);
    } finally {
      Ct = !1;
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
  const n = sn(e);
  if (n) {
    const i = ut.get(n);
    i && i !== e && Kr(i);
  }
  const r = {
    ...t,
    key: e
  };
  Fe.set(e, r), n && ut.set(n, e), We.includes(e) || We.push(e);
}
function Kr(e) {
  if (!e)
    return;
  const t = Fe.get(e);
  if (t && typeof t.cleanup == "function")
    try {
      const i = t.cleanup({ key: e });
      jr(i) && i.catch((o) => {
        console.error(
          "unregisterDetailTab: Fehler beim asynchronen cleanup",
          o
        );
      });
    } catch (i) {
      console.error("unregisterDetailTab: Fehler beim Ausführen von cleanup", i);
    }
  Fe.delete(e);
  const n = We.indexOf(e);
  n >= 0 && We.splice(n, 1);
  const r = sn(e);
  r && ut.get(r) === e && ut.delete(r);
}
function us(e) {
  return Fe.has(e);
}
function Un(e) {
  return Fe.get(e) ?? null;
}
function ds(e) {
  if (e != null && typeof e != "function") {
    console.error("setSecurityDetailTabFactory: Erwartet Funktion oder null", e);
    return;
  }
  zt = e ?? null;
}
function Xr(e) {
  return `${Ut}${e}`;
}
function ht() {
  var t;
  for (const n of Ii())
    if (n.isConnected)
      return n;
  const e = /* @__PURE__ */ new Set();
  for (const n of Vi())
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
function Zr(e) {
  if (!e)
    return console.error("openSecurityDetail: Ungültige securityUuid", e), !1;
  const t = Xr(e);
  let n = Un(t);
  if (!n && typeof zt == "function")
    try {
      const o = zt(e);
      o && typeof o.render == "function" ? (ls(t, o), n = Un(t)) : console.error("openSecurityDetail: Factory lieferte ungültigen Descriptor", o);
    } catch (o) {
      console.error("openSecurityDetail: Fehler beim Erzeugen des Tab-Descriptors", o);
    }
  if (!n)
    return console.warn(`openSecurityDetail: Kein Detail-Tab für ${e} verfügbar`), !1;
  Gr();
  let i = oe().findIndex((o) => o.key === t);
  return i === -1 && (i = oe().findIndex((a) => a.key === t), i === -1) ? (console.error("openSecurityDetail: Tab nach Registrierung nicht auffindbar"), !1) : (O = i, Ne = null, qt(), !0);
}
function ps(e, t = {}) {
  if (!e)
    return console.error("closeSecurityDetail: Ungültige securityUuid", e), !1;
  const { suppressRender: n = !1 } = t, r = Xr(e);
  if (!us(r))
    return !1;
  const o = oe().findIndex((c) => c.key === r), a = o === O;
  Kr(r);
  const s = oe();
  if (!s.length)
    return O = 0, n || qt(), !0;
  if (Ne = e, a) {
    const c = s.findIndex((l) => l.key === lt);
    c >= 0 ? O = c : O = Math.min(Math.max(o - 1, 0), s.length - 1);
  } else O >= s.length && (O = Math.max(0, s.length - 1));
  return n || qt(), !0;
}
async function Jr(e, t, n) {
  let r = n;
  r || (r = Yr(t ? t.panels : null));
  const i = oe();
  O >= i.length && (O = Math.max(0, i.length - 1));
  const o = ss(O);
  if (!o) {
    console.error("renderTab: Kein gültiger Tab oder keine render-Methode gefunden!");
    return;
  }
  let a;
  try {
    a = await o.render(e, t, r);
  } catch (d) {
    console.error("renderTab: Fehler beim Rendern des Tabs:", d), e.innerHTML = `<div class="card"><h2>Fehler</h2><pre>${ns(d)}</pre></div>`;
    return;
  }
  e.innerHTML = a ?? "", o.render === br && tn(e);
  const c = await new Promise((d) => {
    const f = window.setInterval(() => {
      const u = e.querySelector(".header-card");
      u && (clearInterval(f), d(u));
    }, 50);
  });
  let l = e.querySelector(`#${Vt}`);
  if (!l) {
    l = document.createElement("div"), l.id = Vt;
    const d = c.parentNode;
    d && "insertBefore" in d && d.insertBefore(l, c);
  }
  ms(e, t, n), hs(e, t, n), gs(e);
}
function gs(e) {
  const t = e.querySelector(".header-card"), n = e.querySelector(`#${Vt}`);
  if (!t || !n) {
    console.error("Fehlende Elemente für das Scrollverhalten: headerCard oder anchor.");
    return;
  }
  Re == null || Re.disconnect(), Re = new IntersectionObserver(
    ([r]) => {
      r.isIntersecting ? t.classList.remove("sticky") : t.classList.add("sticky");
    },
    {
      root: null,
      rootMargin: "0px 0px 0px 0px",
      threshold: 0
    }
  ), Re.observe(n);
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
    const r = oe(), o = !(O === r.length - 1) || !!Ne;
    n.disabled = !o, n.classList.toggle("disabled", !o);
  }
}
class ys extends HTMLElement {
  constructor() {
    super();
    G(this, "_root");
    G(this, "_hass", null);
    G(this, "_panel", null);
    G(this, "_narrow", null);
    G(this, "_route", null);
    G(this, "_lastPanel", null);
    G(this, "_lastNarrow", null);
    G(this, "_lastRoute", null);
    G(this, "_lastPage", null);
    G(this, "_scrollPositions", {});
    G(this, "_unsubscribeEvents", null);
    G(this, "_initialized", !1);
    G(this, "_hasNewData", !1);
    G(this, "_pendingUpdates", []);
    G(this, "_entryIdWaitWarned", !1);
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
    this._panel || (this._panel = Yr(this._hass.panels ?? null));
    const n = gn(this._hass, this._panel);
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
        Io(
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
        Lo(
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
    const r = Jr(this._root, this._hass, this._panel);
    if (jr(r)) {
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
  ps as closeSecurityDetail,
  en as flushPendingPositions,
  Un as getDetailTabDescriptor,
  Lo as handlePortfolioPositionsUpdate,
  us as hasDetailTab,
  Zr as openSecurityDetail,
  Ns as reapplyPositionsSort,
  vs as registerDashboardElement,
  ls as registerDetailTab,
  Ps as registerPanelHost,
  ds as setSecurityDetailTabFactory,
  Ss as unregisterDashboardElement,
  Kr as unregisterDetailTab,
  As as unregisterPanelHost,
  yr as updatePortfolioFooterFromDom
};
//# sourceMappingURL=dashboard.CdZnpi-f.js.map
