var vi = Object.defineProperty;
var Si = (e, t, n) => t in e ? vi(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : e[t] = n;
var K = (e, t, n) => Si(e, typeof t != "symbol" ? t + "" : t, n);
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
    const u = l.changedTouches[0];
    i(u.clientX - r), r = null;
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
      const l = c.replace(/\s+/g, "").replace(/[^0-9,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."), u = Number.parseFloat(l);
      return Number.isNaN(u) ? Number.NaN : u;
    }
    return Number.NaN;
  }, a = (c, l = 2, u = 2) => {
    const d = typeof c == "number" ? c : o(c);
    return Number.isFinite(d) ? d.toLocaleString("de-DE", {
      minimumFractionDigits: l,
      maximumFractionDigits: u
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
          const p = f.day_change;
          if (p && typeof p == "object") {
            const g = e === "day_change_pct" ? p.change_pct : p.value_change_eur ?? p.price_change_eur;
            typeof g == "number" && (t = g);
          }
        } else {
          const p = f[e];
          typeof p == "number" && (t = p);
        }
    }
    const c = (n == null ? void 0 : n.fx_unavailable) === !0 ? "Wechselkurs nicht verfügbar – EUR-Wert unbekannt" : "";
    if (t == null || (r == null ? void 0 : r.hasValue) === !1)
      return s(c);
    const l = typeof t == "number" ? t : o(t);
    if (!Number.isFinite(l))
      return s(c);
    const u = e.endsWith("pct") ? "%" : "€";
    return i = a(l) + `&nbsp;${u}`, `<span class="${Ot(l, 2)}">${i}</span>`;
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
function Ne(e, t, n = [], r = {}) {
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
  const u = {}, d = {};
  t.forEach((h) => {
    if (n.includes(h.key)) {
      const _ = e.reduce(
        (b, v) => {
          let P = v[h.key];
          if ((h.key === "gain_abs" || h.key === "gain_pct") && (typeof P != "number" || !Number.isFinite(P))) {
            const w = v.performance;
            if (typeof w == "object" && w !== null) {
              const A = w[h.key];
              typeof A == "number" && (P = A);
            }
          } else if ((h.key === "day_change_abs" || h.key === "day_change_pct") && (typeof P != "number" || !Number.isFinite(P))) {
            const w = v.performance;
            if (typeof w == "object" && w !== null) {
              const A = w.day_change;
              if (A && typeof A == "object") {
                const E = h.key === "day_change_pct" ? A.change_pct : A.value_change_eur ?? A.price_change_eur;
                typeof E == "number" && (P = E);
              }
            }
          }
          if (typeof P == "number" && Number.isFinite(P)) {
            const w = P;
            b.total += w, b.hasValue = !0;
          }
          return b;
        },
        { total: 0, hasValue: !1 }
      );
      _.hasValue ? (u[h.key] = _.total, d[h.key] = { hasValue: !0 }) : (u[h.key] = null, d[h.key] = { hasValue: !1 });
    }
  });
  const f = u.gain_abs ?? null;
  if (f != null) {
    const h = u.purchase_value ?? null;
    if (h != null && h > 0)
      u.gain_pct = f / h * 100;
    else {
      const _ = u.current_value ?? null;
      _ != null && _ !== 0 && (u.gain_pct = f / (_ - f) * 100);
    }
  }
  const p = u.day_change_abs ?? null;
  if (p != null) {
    const h = u.current_value ?? null;
    if (h != null) {
      const _ = h - p;
      _ && (u.day_change_pct = p / _ * 100, d.day_change_pct = { hasValue: !0 });
    }
  }
  const g = Number.isFinite(u.gain_pct ?? NaN) ? u.gain_pct : null;
  let m = "", y = "neutral";
  if (g != null && (m = `${le(g)} %`, g > 0 ? y = "positive" : g < 0 && (y = "negative")), l += '<tr class="footer-row">', t.forEach((h, _) => {
    const b = h.align === "right" ? ' class="align-right"' : "";
    if (_ === 0) {
      l += `<td${b}>Summe</td>`;
      return;
    }
    if (u[h.key] != null) {
      let P = "";
      h.key === "gain_abs" && m && (P = ` data-gain-pct="${c(m)}" data-gain-sign="${c(y)}"`), l += `<td${b}${P}>${H(h.key, u[h.key], void 0, d[h.key])}</td>`;
      return;
    }
    if (h.key === "gain_pct" && u.gain_pct != null) {
      l += `<td${b}>${H("gain_pct", u.gain_pct, void 0, d[h.key])}</td>`;
      return;
    }
    const v = d[h.key] ?? { hasValue: !1 };
    l += `<td${b}>${H(h.key, null, void 0, v)}</td>`;
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
function wi(e) {
  const t = Number.isNaN(e) ? 0 : e;
  return `<span class="${Ot(t, 2)}">${le(t)}&nbsp;%</span>`;
}
function zn(e, t, n = "asc", r = !1) {
  if (!e)
    return [];
  const i = e.querySelector("tbody");
  if (!i)
    return [];
  const o = i.querySelector("tr.footer-row"), a = Array.from(i.querySelectorAll("tr")).filter((u) => u !== o);
  let s = -1;
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
    typeof d == "number" && (s = d);
  } else {
    const u = Array.from(e.querySelectorAll("thead th"));
    for (let d = 0; d < u.length; d++)
      if (u[d].getAttribute("data-sort-key") === t) {
        s = d;
        break;
      }
  }
  if (s < 0)
    return a;
  const c = (u) => {
    const d = u.replace(/\u00A0/g, " ").replace(/[%€]/g, "").replace(/\./g, "").replace(/,/g, ".").replace(/[^\d.-]/g, "").trim();
    if (!d) return NaN;
    const f = parseFloat(d);
    return Number.isFinite(f) ? f : NaN;
  };
  a.sort((u, d) => {
    const f = u.cells.item(s), p = d.cells.item(s), g = ((f == null ? void 0 : f.textContent) ?? "").trim(), m = ((p == null ? void 0 : p.textContent) ?? "").trim(), y = c(g), h = c(m);
    let _;
    const b = /[0-9]/.test(g) || /[0-9]/.test(m);
    return !Number.isNaN(y) && !Number.isNaN(h) && b ? _ = y - h : _ = g.localeCompare(m, "de", { sensitivity: "base" }), n === "asc" ? _ : -_;
  }), a.forEach((u) => i.appendChild(u)), o && i.appendChild(o), e.querySelectorAll("thead th.sort-active").forEach((u) => {
    u.classList.remove("sort-active", "dir-asc", "dir-desc");
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
function Ke(e) {
  return ue(e) ? { ...e } : null;
}
function qn(e) {
  return ue(e) ? { ...e } : null;
}
function On(e) {
  return typeof e == "boolean" ? e : void 0;
}
function Ni(e) {
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
  const u = j(e.provenance);
  u && (o.provenance = u);
  const d = Be(e.metric_run_uuid);
  d !== null && (o.metric_run_uuid = d);
  const f = On(e.fx_unavailable);
  return typeof f == "boolean" && (o.fx_unavailable = f), o;
}
function Wn(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = Ni(n);
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
    average_cost: Ke(e.average_cost),
    performance: Ke(e.performance),
    aggregation: Ke(e.aggregation),
    data_state: qn(e.data_state)
  }, c = V(e.coverage_ratio);
  c != null && (s.coverage_ratio = c);
  const l = j(e.provenance);
  l && (s.provenance = l);
  const u = Be(e.metric_run_uuid);
  u !== null && (s.metric_run_uuid = u);
  const d = V(e.last_price_native);
  d != null && (s.last_price_native = d);
  const f = V(e.last_price_eur);
  f != null && (s.last_price_eur = f);
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
    performance: Ke(e.performance),
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
function Kn(e) {
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
  const t = { ...e }, n = Kn(e.normalized_payload);
  return n ? t.normalized_payload = n : "normalized_payload" in t && delete t.normalized_payload, t;
}
function Gn(e) {
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
  var r, i, o, a, s, c, l, u;
  let n = ((r = t == null ? void 0 : t.config) == null ? void 0 : r.entry_id) ?? (t == null ? void 0 : t.entry_id) ?? ((a = (o = (i = t == null ? void 0 : t.config) == null ? void 0 : i._panel_custom) == null ? void 0 : o.config) == null ? void 0 : a.entry_id) ?? void 0;
  if (!n && (e != null && e.panels)) {
    const d = e.panels, f = d.ppreader ?? d.pp_reader ?? Object.values(d).find(
      (p) => (p == null ? void 0 : p.webcomponent_name) === "pp-reader-panel"
    );
    n = ((s = f == null ? void 0 : f.config) == null ? void 0 : s.entry_id) ?? (f == null ? void 0 : f.entry_id) ?? ((u = (l = (c = f == null ? void 0 : f.config) == null ? void 0 : c._panel_custom) == null ? void 0 : l.config) == null ? void 0 : u.entry_id) ?? void 0;
  }
  return n ?? void 0;
}
function gn(e, t) {
  return he(e, t);
}
async function ki(e, t) {
  if (!e)
    throw new Error("fetchAccountsWS: fehlendes hass");
  const n = he(e, t);
  if (!n)
    throw new Error("fetchAccountsWS: fehlendes entry_id");
  const r = await e.connection.sendMessagePromise({
    type: "pp_reader/get_accounts",
    entry_id: n
  }), i = Wn(r.accounts), o = Gn(r.normalized_payload);
  return {
    accounts: i,
    normalized_payload: o
  };
}
async function Ti(e, t) {
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
  }), i = Yn(r.portfolios), o = Gn(r.normalized_payload);
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
  }), a = Bn(i.positions).map(Di), s = Kn(i.normalized_payload), c = {
    portfolio_uuid: fn(i.portfolio_uuid) ?? n,
    positions: a
  };
  typeof i.error == "string" && (c.error = i.error);
  const l = xi(i.coverage_ratio);
  l !== void 0 && (c.coverage_ratio = l);
  const u = fn(i.provenance);
  u && (c.provenance = u);
  const d = Ci(i.metric_run_uuid);
  return d !== void 0 && (c.metric_run_uuid = d), s && (c.normalized_payload = s), c;
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
  }, { startDate: a, endDate: s, start_date: c, end_date: l } = r || {}, u = a ?? c;
  u != null && (o.start_date = u);
  const d = s ?? l;
  d != null && (o.end_date = d);
  const f = await e.connection.sendMessagePromise(o);
  return Array.isArray(f.prices) || (f.prices = []), Array.isArray(f.transactions) || (f.transactions = []), f;
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
function Ps(e) {
  e && Wt.add(e);
}
function As(e) {
  e && Wt.delete(e);
}
function Ii() {
  return Wt;
}
function ws(e) {
  e && Bt.add(e);
}
function Ns(e) {
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
        const f = s.split(","), p = ((t = f[f.length - 1]) == null ? void 0 : t.length) ?? 0, g = f.slice(0, -1).join(""), m = g.replace(/[+-]/g, "").length, y = f.length > 2, h = /^[-+]?0$/.test(g);
        s = y || p === 0 || p === 3 && m > 0 && m <= 3 && !h ? s.replace(/,/g, "") : s.replace(",", ".");
      }
    else l && c && a > o ? s = s.replace(/,/g, "") : l && s.length - a - 1 === 3 && /\d{4,}/.test(s.replace(/\./g, "")) && (s = s.replace(/\./g, ""));
    if (s === "-" || s === "+")
      return null;
    const u = Number.parseFloat(s);
    if (Number.isFinite(u))
      return u;
    const d = Number.parseFloat(i.replace(",", "."));
    if (Number.isFinite(d))
      return d;
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
function ji(e, t, n = []) {
  if (!t || typeof t != "object")
    return t;
  const r = {
    ...e && typeof e == "object" ? e : {},
    ...t
  };
  return n.forEach((i) => {
    const o = e == null ? void 0 : e[i];
    o != null && (r[i] = o);
  }), r;
}
function Yi(e, t) {
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
  ], i = (c, l, u) => {
    const d = l[u];
    d !== void 0 && (c[u] = d);
  };
  r.forEach((c) => {
    i(n, t, c);
  });
  const o = (c) => {
    const l = t[c];
    if (l && typeof l == "object") {
      const u = e && e[c] && typeof e[c] == "object" ? e[c] : {};
      n[c] = {
        ...u,
        ...l
      };
    } else l !== void 0 && (n[c] = l);
  }, a = t.performance, s = e && e.performance && typeof e.performance == "object" ? e.performance : void 0;
  return a !== void 0 && (n.performance = ji(s, a, [
    "gain_pct",
    "total_change_pct"
  ])), o("aggregation"), o("average_cost"), o("data_state"), n;
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
    return Yi(s, o);
  }).map(je);
  fe.set(e, i);
}
function Kt(e) {
  return e ? fe.has(e) : !1;
}
function Qn(e) {
  if (!e)
    return [];
  const t = fe.get(e);
  return t ? t.map(je) : [];
}
function Ki() {
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
function Gt(e) {
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
function Xi(e) {
  if (!e || typeof e != "object")
    return null;
  const t = Bi(e) ? je(e) : e, n = de(t.security_uuid), r = de(t.name), i = ae(t.current_holdings), o = hn(t.current_value), a = Gt(t.aggregation), s = t.aggregation && typeof t.aggregation == "object" ? t.aggregation : null, c = q(t.purchase_value_eur) ?? q(s == null ? void 0 : s.purchase_value_eur) ?? q(s == null ? void 0 : s.purchase_total_account) ?? q(s == null ? void 0 : s.account_currency_total) ?? hn(t.purchase_value);
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
  }, u = Ce(t.average_cost);
  u && (l.average_cost = u), a && (l.aggregation = a);
  const d = ge(t.performance);
  if (d)
    l.performance = d, l.gain_abs = typeof d.gain_abs == "number" ? d.gain_abs : null, l.gain_pct = typeof d.gain_pct == "number" ? d.gain_pct : null;
  else {
    const b = q(t.gain_abs), v = q(t.gain_pct);
    b !== null && (l.gain_abs = b), v !== null && (l.gain_pct = v);
  }
  "coverage_ratio" in t && (l.coverage_ratio = q(t.coverage_ratio));
  const f = de(t.provenance);
  f && (l.provenance = f);
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
    const r = Xi(n);
    r && t.push(r);
  }
  return t;
}
let er = [];
const pe = /* @__PURE__ */ new Map();
function Ge(e) {
  return typeof e == "string" && e.length > 0 ? e : void 0;
}
function Zi(e) {
  return e === null ? null : Ge(e);
}
function Ji(e) {
  return typeof e == "number" && Number.isFinite(e) ? e : void 0;
}
function _e(e) {
  return e === null ? null : Ji(e);
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
  const t = Ge(e.uuid);
  if (!t)
    return null;
  const n = { uuid: t }, r = Ge(e.name);
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
  const u = _e(e.coverage_ratio);
  u !== void 0 && (n.coverage_ratio = u);
  const d = Ge(e.provenance);
  d && (n.provenance = d), "metric_run_uuid" in e && (n.metric_run_uuid = Zi(e.metric_run_uuid));
  const f = ie(e.performance);
  f && (n.performance = f);
  const p = ie(e.data_state);
  if (p && (n.data_state = p), Array.isArray(e.positions)) {
    const g = e.positions.filter(
      (m) => !!m
    );
    g.length && (n.positions = g.map(Ie));
  }
  return n;
}
function Qi(e, t) {
  const n = {
    ...e,
    ...t
  };
  return !t.performance && e.performance && (n.performance = ie(e.performance)), !t.data_state && e.data_state && (n.data_state = ie(e.data_state)), !t.positions && e.positions && (n.positions = e.positions.map(Ie)), n;
}
function nr(e) {
  er = (e ?? []).map((n) => ({ ...n }));
}
function eo() {
  return er.map((e) => ({ ...e }));
}
function to(e) {
  pe.clear();
  const t = e ?? [];
  for (const n of t) {
    const r = tr(n);
    r && pe.set(r.uuid, Xt(r));
  }
}
function no(e) {
  const t = e ?? [];
  for (const n of t) {
    const r = tr(n);
    if (!r)
      continue;
    const i = pe.get(r.uuid), o = i ? Qi(i, r) : Xt(r);
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
    const u = c ? Ie(c) : {}, d = u;
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
      m != null && (d[g] = m);
    });
    const p = (g, m = []) => {
      const y = l[g], h = c && c[g] && typeof c[g] == "object" ? c[g] : void 0;
      if (!y || typeof y != "object") {
        y !== void 0 && (d[g] = y);
        return;
      }
      const _ = {
        ...h ?? {},
        ...y
      };
      m.forEach((b) => {
        const v = h == null ? void 0 : h[b];
        v != null && (_[b] = v);
      }), d[g] = _;
    };
    return p("performance", ["gain_pct", "total_change_pct"]), p("aggregation"), p("average_cost"), p("data_state"), u;
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
function ro() {
  return Array.from(pe.values(), (e) => Xt(e));
}
function rr() {
  return {
    accounts: eo(),
    portfolios: ro()
  };
}
const io = "unknown-account";
function G(e) {
  return typeof e != "number" || !Number.isFinite(e) ? null : e;
}
function _n(e) {
  const t = G(e);
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
  const t = oo(e);
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
function oo(e) {
  const t = J(e);
  if (!t)
    return null;
  const n = ao(t);
  return n || ar(t);
}
function ao(e) {
  const t = e.trim();
  if (!t.startsWith("{") && !t.startsWith("["))
    return null;
  try {
    const n = JSON.parse(t), r = so(n), i = n && typeof n == "object" ? J(
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
function so(e) {
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
function co(e) {
  if (!e)
    return null;
  const t = J(e.uuid) ?? `${io}-${e.name ?? "0"}`, n = ir(e.name, "Unbenanntes Konto"), r = J(e.currency_code), i = G(e.balance), o = G(e.orig_balance), a = "coverage_ratio" in e ? or(G(e.coverage_ratio)) : null, s = J(e.provenance), c = J(e.metric_run_uuid), l = e.fx_unavailable === !0, u = G(e.fx_rate), d = J(e.fx_rate_source), f = J(e.fx_rate_timestamp), p = [], g = sr(s);
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
    fx_rate: u,
    fx_rate_source: d,
    fx_rate_timestamp: f,
    badges: p
  }, y = typeof c == "string" ? c : null;
  return m.metric_run_uuid = y, m;
}
function lo(e) {
  if (!e)
    return null;
  const t = J(e.uuid);
  if (!t)
    return null;
  const n = ir(e.name, "Unbenanntes Depot"), r = _n(e.position_count), i = _n(e.missing_value_positions), o = G(e.current_value), a = G(e.purchase_sum) ?? G(e.purchase_value_eur) ?? G(e.purchase_value) ?? 0, s = G(e.day_change_abs) ?? null, c = G(e.day_change_pct) ?? null, l = ge(e.performance), u = (l == null ? void 0 : l.gain_abs) ?? null, d = (l == null ? void 0 : l.gain_pct) ?? null, f = (l == null ? void 0 : l.day_change) ?? null;
  let p = s ?? ((f == null ? void 0 : f.value_change_eur) != null ? G(f.value_change_eur) : null), g = c ?? ((f == null ? void 0 : f.change_pct) != null ? G(f.change_pct) : null);
  if (p == null && g != null && o != null) {
    const E = o / (1 + g / 100);
    E && (p = o - E);
  }
  if (g == null && p != null && o != null) {
    const E = o - p;
    E && (g = p / E * 100);
  }
  const m = o != null, y = e.has_current_value === !1 || !m, h = "coverage_ratio" in e ? or(G(e.coverage_ratio)) : null, _ = J(e.provenance), b = J(e.metric_run_uuid), v = [], P = sr(_);
  P && v.push(P);
  const w = {
    uuid: t,
    name: n,
    position_count: r,
    current_value: o,
    purchase_sum: a,
    day_change_abs: p ?? null,
    day_change_pct: g ?? null,
    gain_abs: u,
    gain_pct: d,
    hasValue: m,
    fx_unavailable: y || i > 0,
    missing_value_positions: i,
    performance: l,
    coverage_ratio: h,
    provenance: _,
    metric_run_uuid: null,
    badges: v
  }, A = typeof b == "string" ? b : null;
  return w.metric_run_uuid = A, w;
}
function cr() {
  const { accounts: e } = rr();
  return e.map(co).filter((t) => !!t);
}
function uo() {
  const { portfolios: e } = rr();
  return e.map(lo).filter((t) => !!t);
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
function fo(e) {
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
function po(e) {
  return typeof e == "number" && Number.isFinite(e) ? e : void 0;
}
function go(e) {
  return e === null ? null : po(e);
}
function ho(e) {
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
const mo = 500, _o = 10, yo = "pp-reader:portfolio-positions-updated", bo = "pp-reader:diagnostics", yt = /* @__PURE__ */ new Map(), dr = [
  "coverage_ratio",
  "provenance",
  "metric_run_uuid",
  "generated_at"
], Dt = /* @__PURE__ */ new Map();
function vo(e, t) {
  return `${e}:${t}`;
}
function So(e) {
  if (e === void 0)
    return;
  if (e === null)
    return null;
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  const t = go(e);
  if (t === null)
    return null;
  if (typeof t == "number" && Number.isFinite(t))
    return t;
}
function bt(e) {
  if (e !== void 0)
    return ho(e);
}
function Jt(e, t, n, r) {
  const i = {}, o = So(e);
  o !== void 0 && (i.coverage_ratio = o);
  const a = bt(t);
  a !== void 0 && (i.provenance = a);
  const s = bt(n);
  s !== void 0 && (i.metric_run_uuid = s);
  const c = bt(r);
  return c !== void 0 && (i.generated_at = c), Object.keys(i).length > 0 ? i : null;
}
function Po(e, t) {
  const n = {};
  let r = !1;
  for (const i of dr) {
    const o = e == null ? void 0 : e[i], a = t[i];
    o !== a && (ur(n, i, o, a), r = !0);
  }
  return r ? n : null;
}
function Ao(e) {
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
        window.dispatchEvent(new CustomEvent(bo, { detail: e }));
      } catch (t) {
        console.warn("updateConfigsWS: Diagnostics-Event konnte nicht gesendet werden", t);
      }
  }
}
function Qt(e, t, n, r) {
  const i = vo(e, n), o = yt.get(i);
  if (!r) {
    if (!o)
      return;
    yt.delete(i);
    const s = Ao(o);
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
  const a = Po(o, r);
  a && (yt.set(i, { ...r }), vn({
    kind: e,
    uuid: n,
    source: t,
    changed: a,
    snapshot: { ...r },
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  }));
}
function wo(e) {
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
function Eo(e, t) {
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
function Fo(e, t) {
  return `<div class="error">${fo(e)} <button class="retry-pos" data-portfolio="${t}">Erneut laden</button></div>`;
}
function Co(e, t, n) {
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
    return o.innerHTML = Fo(r, t), { applied: !0 };
  const a = o.dataset.sortKey, s = o.dataset.sortDir;
  return o.innerHTML = Ho(n), a && (o.dataset.sortKey = a), s && (o.dataset.sortDir = s), Co(o, e, t), { applied: !0 };
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
function xo(e) {
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
    r || n.attempts >= _o ? (Xe.delete(t), r || se.delete(t)) : pr(e, t);
  }, mo), Xe.set(t, n));
}
function Do(e, t) {
  console.log("updateConfigsWS: Kontodaten-Update erhalten:", e);
  const n = Array.isArray(e) ? e : [];
  if (nr(n), wo(n), !t)
    return;
  const r = cr();
  ko(r, t);
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
function ko(e, t) {
  const n = t.querySelector(".account-table"), r = t.querySelector(".fx-account-table"), i = e.filter((a) => (a.currency_code || "EUR") === "EUR"), o = e.filter((a) => (a.currency_code || "EUR") !== "EUR");
  if (n) {
    const a = i.map((s) => ({
      name: et(s.name, yn(s.badges), {
        containerClass: "account-name",
        labelClass: "account-name__label"
      }),
      balance: s.balance ?? null
    }));
    n.innerHTML = Ne(
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
      const c = s.orig_balance, l = typeof c == "number" && Number.isFinite(c), u = xe(s.currency_code), d = l ? c.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) : null, f = d ? u ? `${d} ${u}` : d : "";
      return {
        name: et(s.name, yn(s.badges), {
          containerClass: "account-name",
          labelClass: "account-name__label"
        }),
        fx_display: f,
        balance: s.balance ?? null
      };
    });
    r.innerHTML = Ne(
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
function Ro(e, t) {
  if (!Array.isArray(e)) {
    console.warn("handlePortfolioUpdate: Update ist kein Array:", e);
    return;
  }
  try {
    console.debug("handlePortfolioUpdate: payload=", e);
  } catch {
  }
  const n = To(e);
  if (n.length && no(n), No(n), !t)
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
  const o = (d) => {
    if (typeof Intl < "u")
      try {
        const p = typeof navigator < "u" && navigator.language ? navigator.language : "de-DE";
        return new Intl.NumberFormat(p, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(d);
      } catch {
      }
    return (pt(d, { fallback: 0 }) ?? 0).toFixed(2).replace(".", ",");
  }, a = /* @__PURE__ */ new Map();
  i.querySelectorAll("tr.portfolio-row").forEach((d) => {
    const f = d.dataset.portfolio;
    f && a.set(f, d);
  });
  let c = 0;
  const l = (d) => {
    const f = typeof d == "number" && Number.isFinite(d) ? d : 0;
    try {
      return f.toLocaleString("de-DE");
    } catch {
      return f.toString();
    }
  }, u = /* @__PURE__ */ new Map();
  for (const d of n) {
    const f = xe(d.uuid);
    f && u.set(f, d);
  }
  for (const [d, f] of u.entries()) {
    const p = a.get(d);
    if (!p || p.cells.length < 3)
      continue;
    const g = p.cells.item(1), m = p.cells.item(2), y = p.cells.item(3), h = p.cells.item(4);
    if (!g || !m)
      continue;
    const _ = typeof f.position_count == "number" && Number.isFinite(f.position_count) ? f.position_count : 0, b = typeof f.current_value == "number" && Number.isFinite(f.current_value) ? f.current_value : null, v = ge(f.performance), P = typeof (v == null ? void 0 : v.gain_abs) == "number" ? v.gain_abs : null, w = typeof (v == null ? void 0 : v.gain_pct) == "number" ? v.gain_pct : null, A = typeof f.purchase_sum == "number" && Number.isFinite(f.purchase_sum) ? f.purchase_sum : typeof f.purchase_value == "number" && Number.isFinite(f.purchase_value) ? f.purchase_value : null, E = vt(m.textContent);
    vt(g.textContent) !== _ && (g.textContent = l(_));
    const F = b !== null, D = {
      fx_unavailable: p.dataset.fxUnavailable === "true",
      current_value: b,
      performance: v
    }, R = { hasValue: F }, M = H("current_value", D.current_value, D, R), N = b ?? 0;
    if ((Math.abs(E - N) >= 5e-3 || m.innerHTML !== M) && (m.innerHTML = M, p.classList.add("flash-update"), setTimeout(() => {
      p.classList.remove("flash-update");
    }, 800)), y) {
      const C = H("gain_abs", P, D, R);
      y.innerHTML = C;
      const S = typeof w == "number" && Number.isFinite(w) ? w : null;
      y.dataset.gainPct = S != null ? `${o(S)} %` : "—", y.dataset.gainSign = S != null ? S > 0 ? "positive" : S < 0 ? "negative" : "neutral" : "neutral";
    }
    h && (h.innerHTML = H("gain_pct", w, D, R)), p.dataset.positionCount = _.toString(), p.dataset.currentValue = F ? N.toString() : "", p.dataset.purchaseSum = A != null ? A.toString() : "", p.dataset.gainAbs = P != null ? P.toString() : "", p.dataset.gainPct = w != null ? w.toString() : "", p.dataset.coverageRatio = typeof f.coverage_ratio == "number" && Number.isFinite(f.coverage_ratio) ? f.coverage_ratio.toString() : "", p.dataset.provenance = typeof f.provenance == "string" ? f.provenance : "", p.dataset.metricRunUuid = typeof f.metric_run_uuid == "string" ? f.metric_run_uuid : "", c += 1;
  }
  if (c === 0)
    console.debug("handlePortfolioUpdate: Keine passenden Zeilen gefunden / keine Änderungen.");
  else {
    const d = c.toLocaleString("de-DE");
    console.debug(`handlePortfolioUpdate: ${d} Zeile(n) gepatcht.`);
  }
  try {
    Io(r);
  } catch (d) {
    console.warn("handlePortfolioUpdate: Fehler bei Summen-Neuberechnung:", d);
  }
  try {
    const d = (...h) => {
      for (const _ of h) {
        if (!_) continue;
        const b = t.querySelector(_);
        if (b) return b;
      }
      return null;
    }, f = d(
      ".account-table table",
      ".accounts-eur-table table",
      ".accounts-table table"
    ), p = d(
      ".fx-account-table table",
      ".accounts-fx-table table"
    ), g = (h, _) => {
      if (!h) return [];
      const b = h.querySelectorAll("tbody tr.account-row");
      return (b.length ? Array.from(b) : Array.from(h.querySelectorAll("tbody tr:not(.footer-row)"))).map((P) => {
        const w = _ ? P.cells.item(2) : P.cells.item(1);
        return { balance: vt(w == null ? void 0 : w.textContent) };
      });
    }, m = [
      ...g(f, !1),
      ...g(p, !0)
    ], y = Array.from(
      r.querySelectorAll("tbody tr.portfolio-row")
    ).map((h) => {
      const _ = h.dataset.currentValue, b = h.dataset.purchaseSum, v = _ ? Number.parseFloat(_) : Number.NaN, P = b ? Number.parseFloat(b) : Number.NaN;
      return {
        current_value: Number.isFinite(v) ? v : 0,
        purchase_sum: Number.isFinite(P) ? P : 0
      };
    });
    gr(m, y, t);
  } catch (d) {
    console.warn("handlePortfolioUpdate: Fehler bei Total-Neuberechnung:", d);
  }
}
function $o(e) {
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
function Sn(e) {
  return typeof e != "number" || !Number.isInteger(e) || e <= 0 ? null : e;
}
function Lo(e, t, n, r) {
  if (!n || n <= 1 || !t)
    return kt(e), r;
  const i = n, o = Dt.get(e) ?? { expected: i, chunks: /* @__PURE__ */ new Map() };
  if (o.expected !== i && (o.chunks.clear(), o.expected = i), o.chunks.set(t, r), Dt.set(e, o), o.chunks.size < i)
    return null;
  const a = [];
  for (let s = 1; s <= i; s += 1) {
    const c = o.chunks.get(s);
    c && Array.isArray(c) && a.push(...c);
  }
  return kt(e), a;
}
function Pn(e, t) {
  const n = $o(e);
  if (!n)
    return console.warn("handlePortfolioPositionsUpdate: Ungültiges Update:", e), !1;
  const r = e == null ? void 0 : e.error, i = Sn(e == null ? void 0 : e.chunk_index), o = Sn(e == null ? void 0 : e.chunk_count), a = gt((e == null ? void 0 : e.positions) ?? []);
  r && kt(n);
  const s = r ? a : Lo(n, i, o, a);
  if (!r && s === null)
    return !0;
  const c = r ? a : s ?? [];
  Eo(n, e), r || (Yt(n, c), Zt(n, c));
  const l = fr(t, n, c, r);
  if (l.applied ? se.delete(n) : (se.set(n, { positions: a, error: r }), l.reason !== "hidden" && pr(t, n)), !r && a.length > 0) {
    const u = Array.from(
      new Set(
        a.map((d) => d.security_uuid).filter((d) => typeof d == "string" && d.length > 0)
      )
    );
    if (u.length && typeof window < "u")
      try {
        window.dispatchEvent(
          new CustomEvent(
            yo,
            {
              detail: {
                portfolioUuid: n,
                securityUuids: u
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
function Mo(e, t) {
  if (Array.isArray(e)) {
    let n = !1;
    for (const r of e)
      Pn(r, t) && (n = !0);
    !n && e.length && console.warn("handlePortfolioPositionsUpdate: Kein gültiges Element im Array:", e);
    return;
  }
  Pn(e, t);
}
function Ho(e) {
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
  }), i = Ne(
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
      s.forEach((d, f) => {
        const p = c[f];
        p && (d.setAttribute("data-sort-key", p), d.classList.add("sortable-col"));
      }), a.querySelectorAll("tbody tr").forEach((d, f) => {
        if (d.classList.contains("footer-row"))
          return;
        const p = e[f];
        p.security_uuid && (d.dataset.security = p.security_uuid), d.classList.add("position-row");
      }), a.dataset.defaultSort = "name", a.dataset.defaultDir = "asc";
      const u = n;
      if (u)
        try {
          u(a);
        } catch (d) {
          console.warn("renderPositionsTableInline: applyGainPctMetadata failed", d);
        }
      else
        a.querySelectorAll("tbody tr").forEach((f, p) => {
          if (f.classList.contains("footer-row"))
            return;
          const g = f.cells.item(4);
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
function Io(e) {
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
      const v = r(b.dataset.positionCount);
      if (v != null && (_.sumPositions += v), b.dataset.fxUnavailable === "true" && (_.fxUnavailable = !0), b.dataset.hasValue !== "true")
        return _.incompleteRows += 1, _;
      _.valueRows += 1;
      const P = r(b.dataset.currentValue), w = r(b.dataset.gainAbs), A = r(b.dataset.purchaseSum);
      return P == null || w == null || A == null ? (_.incompleteRows += 1, _) : (_.sumCurrent += P, _.sumGainAbs += w, _.sumPurchase += A, _);
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
  }, u = { hasValue: o }, d = H("current_value", l.current_value, l, u), f = o ? i.sumGainAbs : null, p = o ? a : null, g = H("gain_abs", f, l, u), m = H("gain_pct", p, l, u);
  s.innerHTML = `
    <td>Summe</td>
    <td class="align-right">${c}</td>
    <td class="align-right">${d}</td>
    <td class="align-right">${g}</td>
    <td class="align-right">${m}</td>
  `;
  const y = s.cells.item(3);
  y && (y.dataset.gainPct = o && typeof a == "number" ? `${Tt(a)} %` : "—", y.dataset.gainSign = o && typeof a == "number" ? a > 0 ? "positive" : a < 0 ? "negative" : "neutral" : "neutral"), s.dataset.positionCount = Math.round(i.sumPositions).toString(), s.dataset.currentValue = o ? i.sumCurrent.toString() : "", s.dataset.purchaseSum = o ? i.sumPurchase.toString() : "", s.dataset.gainAbs = o ? i.sumGainAbs.toString() : "", s.dataset.gainPct = o && typeof a == "number" ? a.toString() : "", s.dataset.hasValue = o ? "true" : "false", s.dataset.fxUnavailable = i.fxUnavailable || !o ? "true" : "false";
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
function Tt(e) {
  return (pt(e, { fallback: 0 }) ?? 0).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
function gr(e, t, n) {
  const r = n ?? document, o = (Array.isArray(e) ? e : []).reduce((d, f) => {
    const p = f.balance ?? f.current_value ?? f.value, g = An(p);
    return d + g;
  }, 0), s = (Array.isArray(t) ? t : []).reduce((d, f) => {
    const p = f.current_value ?? f.value, g = An(p);
    return d + g;
  }, 0), c = o + s, l = r.querySelector("#headerMeta");
  if (!l) {
    console.warn("updateTotalWealth: #headerMeta nicht gefunden.");
    return;
  }
  const u = l.querySelector("strong") || l.querySelector(".total-wealth-value");
  u ? u.textContent = `${Tt(c)} €` : l.textContent = `💰 Gesamtvermögen: ${Tt(c)} €`, l.dataset.totalWealthEur = c.toString();
}
function Vo(e, t) {
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
function Es(e) {
  if (e == null)
    return;
  const t = e.querySelector("table.sortable-positions");
  if (t == null)
    return;
  const n = e.dataset.sortKey || t.dataset.defaultSort || "name", i = (e.dataset.sortDir || t.dataset.defaultDir || "asc") === "desc" ? "desc" : "asc";
  e.dataset.sortKey = n, e.dataset.sortDir = i, zn(t, n, i, !0);
}
const Fs = {
  getPortfolioPositionsCacheSnapshot: Gi,
  clearPortfolioPositionsCache: Ki,
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
const Uo = [
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
  return Uo.includes(e);
}
function Pt(e) {
  return e === "asc" || e === "desc";
}
function hr(e) {
  return (e ?? []).filter((t) => !t.key.endsWith("-coverage"));
}
function wn(e) {
  return hr(e).filter(
    (t) => !t.key.startsWith("provenance-")
  );
}
let tt = null, nt = null;
const Nn = { min: 2, max: 6 };
function ke(e) {
  return ae(e);
}
function zo(e) {
  return typeof e == "number" && Number.isFinite(e);
}
function qo(e) {
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
    const i = qo(e[r]);
    if (i)
      return i;
  }
  return n;
}
function Fn(e, t) {
  return zo(e) ? `${e.toLocaleString("de-DE", {
    minimumFractionDigits: Nn.min,
    maximumFractionDigits: Nn.max
  })}${t ? ` ${t}` : ""}` : null;
}
function Oo(e) {
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
  ) ?? "EUR", a = ke(n == null ? void 0 : n.native), s = ke(n == null ? void 0 : n.security), c = ke(n == null ? void 0 : n.account), l = ke(n == null ? void 0 : n.eur), u = s ?? a, d = l ?? (o === "EUR" ? c : null), f = i ?? o, p = f === "EUR";
  let g, m;
  p ? (g = "EUR", m = d ?? u ?? c ?? null) : u != null ? (g = f, m = u) : c != null ? (g = o, m = c) : (g = "EUR", m = d ?? null);
  const y = Fn(m, g), h = p ? null : Fn(d, "EUR"), _ = !!h && h !== y, b = [], v = [];
  y ? (b.push(
    `<span class="purchase-price purchase-price--primary">${y}</span>`
  ), v.push(y.replace(/\u00A0/g, " "))) : (b.push('<span class="missing-value" role="note" aria-label="Kein Kaufpreis verfügbar" title="Kein Kaufpreis verfügbar">—</span>'), v.push("Kein Kaufpreis verfügbar")), _ && h && (b.push(
    `<span class="purchase-price purchase-price--secondary">${h}</span>`
  ), v.push(h.replace(/\u00A0/g, " ")));
  const P = b.join("<br>"), w = ke(r == null ? void 0 : r.purchase_value_eur) ?? 0, A = v.join(", ");
  return { markup: P, sortValue: w, ariaLabel: A };
}
function Wo(e) {
  const t = ae(e.current_holdings);
  if (t == null)
    return { value: null, pct: null };
  const n = ae(e.last_price_eur), r = ae(e.last_close_eur);
  let i = null, o = null;
  if (n != null && r != null) {
    i = (n - r) * t;
    const d = r * t;
    d && (o = i / d * 100);
  }
  const a = ge(e.performance), s = (a == null ? void 0 : a.day_change) ?? null;
  if (i == null && (s == null ? void 0 : s.price_change_eur) != null && (i = s.price_change_eur * t), o == null && (s == null ? void 0 : s.change_pct) != null && (o = s.change_pct), i == null && o != null) {
    const u = ae(e.current_value);
    if (u != null) {
      const d = u / (1 + o / 100);
      d && (i = u - d);
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
    const o = ge(i.performance), a = typeof (o == null ? void 0 : o.gain_abs) == "number" ? o.gain_abs : null, s = typeof (o == null ? void 0 : o.gain_pct) == "number" ? o.gain_pct : null, c = Wo(i), l = typeof i.purchase_value == "number" || typeof i.purchase_value == "string" ? i.purchase_value : null;
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
  }), r = Ne(n, t, ["purchase_value", "current_value", "day_change_abs", "gain_abs"]);
  try {
    const i = document.createElement("template");
    i.innerHTML = r.trim();
    const o = i.content.querySelector("table");
    if (o) {
      o.classList.add("sortable-positions");
      const a = Array.from(o.querySelectorAll("thead th"));
      return t.forEach((c, l) => {
        const u = a.at(l);
        u && (u.setAttribute("data-sort-key", c.key), u.classList.add("sortable-col"));
      }), o.querySelectorAll("tbody tr").forEach((c, l) => {
        if (c.classList.contains("footer-row") || l >= e.length)
          return;
        const u = e[l], d = typeof u.security_uuid == "string" ? u.security_uuid : null;
        d && (c.dataset.security = d), c.classList.add("position-row");
        const f = c.cells.item(2);
        if (f) {
          const { markup: m, sortValue: y, ariaLabel: h } = Oo(u);
          f.innerHTML = m, f.dataset.sortValue = String(y), h ? f.setAttribute("aria-label", h) : f.removeAttribute("aria-label");
        }
        const p = c.cells.item(7);
        if (p) {
          const m = ge(u.performance), y = typeof (m == null ? void 0 : m.gain_pct) == "number" && Number.isFinite(m.gain_pct) ? m.gain_pct : null, h = y != null ? `${y.toLocaleString("de-DE", {
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
function Bo(e) {
  const t = gt(e ?? []);
  return Ue(t);
}
function jo(e, t) {
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
  jo(e, t);
}
function _r(e) {
  console.debug("buildExpandablePortfolioTable: render", e.length, "portfolios");
  const t = (S) => S == null || typeof S != "string" && typeof S != "number" && typeof S != "boolean" ? "" : String(S).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
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
    const x = S.align === "right" ? ' class="align-right"' : "";
    n += `<th${x}>${S.label}</th>`;
  }), n += "</tr></thead><tbody>", e.forEach((S) => {
    const x = Number.isFinite(S.position_count) ? S.position_count : 0, $ = Number.isFinite(S.purchase_sum) ? S.purchase_sum : 0, Y = S.hasValue && typeof S.current_value == "number" && Number.isFinite(S.current_value) ? S.current_value : null, W = Y !== null, U = S.performance, B = typeof S.gain_abs == "number" ? S.gain_abs : typeof (U == null ? void 0 : U.gain_abs) == "number" ? U.gain_abs : null, z = typeof S.gain_pct == "number" ? S.gain_pct : typeof (U == null ? void 0 : U.gain_pct) == "number" ? U.gain_pct : null, ee = U && typeof U == "object" ? U.day_change : null, me = typeof S.day_change_abs == "number" ? S.day_change_abs : ee && typeof ee == "object" ? ee.value_change_eur ?? ee.price_change_eur : null, Ye = typeof S.day_change_pct == "number" ? S.day_change_pct : ee && typeof ee == "object" && typeof ee.change_pct == "number" ? ee.change_pct : null, Qr = S.fx_unavailable && W, ei = typeof S.coverage_ratio == "number" && Number.isFinite(S.coverage_ratio) ? S.coverage_ratio : "", ti = typeof S.provenance == "string" ? S.provenance : "", ni = typeof S.metric_run_uuid == "string" ? S.metric_run_uuid : "", De = rt.has(S.uuid), ri = De ? "portfolio-toggle expanded" : "portfolio-toggle", cn = `portfolio-details-${S.uuid}`, X = {
      fx_unavailable: S.fx_unavailable,
      purchase_value: $,
      current_value: Y,
      day_change_abs: me,
      day_change_pct: Ye,
      gain_abs: B,
      gain_pct: z
    }, be = { hasValue: W }, ii = H("purchase_value", X.purchase_value, X, be), oi = H("current_value", X.current_value, X, be), ai = H("day_change_abs", X.day_change_abs, X, be), si = H("day_change_pct", X.day_change_pct, X, be), ci = H("gain_abs", X.gain_abs, X, be), li = H("gain_pct", X.gain_pct, X, be), ln = W && typeof z == "number" && Number.isFinite(z) ? `${le(z)} %` : "", ui = W && typeof z == "number" && Number.isFinite(z) ? z > 0 ? "positive" : z < 0 ? "negative" : "neutral" : "", di = W && typeof Y == "number" && Number.isFinite(Y) ? Y : "", fi = W && typeof B == "number" && Number.isFinite(B) ? B : "", pi = W && typeof z == "number" && Number.isFinite(z) ? z : "", gi = W && typeof me == "number" && Number.isFinite(me) ? me : "", hi = W && typeof Ye == "number" && Number.isFinite(Ye) ? Ye : "", mi = String(x);
    let mt = "";
    ln && (mt = ` data-gain-pct="${t(ln)}" data-gain-sign="${t(ui)}"`), Qr && (mt += ' data-partial="true"'), n += `<tr class="portfolio-row"
                  data-portfolio="${S.uuid}"
                  data-position-count="${mi}"
                  data-current-value="${t(di)}"
                  data-purchase-sum="${t($)}"
                  data-day-change="${t(gi)}"
                  data-day-change-pct="${t(hi)}"
                  data-gain-abs="${t(fi)}"
                data-gain-pct="${t(pi)}"
                data-has-value="${W ? "true" : "false"}"
                data-fx-unavailable="${S.fx_unavailable ? "true" : "false"}"
                data-coverage-ratio="${t(ei)}"
                data-provenance="${t(ti)}"
                data-metric-run-uuid="${t(ni)}">`;
    const _i = Ve(S.name), yi = lr(hr(S.badges), {
      containerClass: "portfolio-badges"
    });
    n += `<td>
        <button type="button"
                class="${ri}"
                data-portfolio="${S.uuid}"
                aria-expanded="${De ? "true" : "false"}"
                aria-controls="${cn}">
          <span class="caret">${De ? "▼" : "▶"}</span>
          <span class="portfolio-name">${_i}</span>${yi}
        </button>
      </td>`;
    const bi = x.toLocaleString("de-DE");
    n += `<td class="align-right">${bi}</td>`, n += `<td class="align-right">${ii}</td>`, n += `<td class="align-right">${oi}</td>`, n += `<td class="align-right">${ai}</td>`, n += `<td class="align-right">${si}</td>`, n += `<td class="align-right"${mt}>${ci}</td>`, n += `<td class="align-right gain-pct-cell">${li}</td>`, n += "</tr>", n += `<tr class="portfolio-details${De ? "" : " hidden"}"
                data-portfolio="${S.uuid}"
                id="${cn}"
                role="region"
                aria-label="Positionen für ${S.name}">
      <td colspan="${r.length.toString()}">
        <div class="positions-container">${De ? Kt(S.uuid) ? Ue(Qn(S.uuid)) : '<div class="loading">Lade Positionen...</div>' : ""}</div>
      </td>
    </tr>`;
  });
  const i = e.filter((S) => typeof S.current_value == "number" && Number.isFinite(S.current_value)), o = e.reduce((S, x) => S + (Number.isFinite(x.position_count) ? x.position_count : 0), 0), a = i.reduce((S, x) => typeof x.current_value == "number" && Number.isFinite(x.current_value) ? S + x.current_value : S, 0), s = i.reduce((S, x) => typeof x.purchase_sum == "number" && Number.isFinite(x.purchase_sum) ? S + x.purchase_sum : S, 0), c = i.map((S) => {
    if (typeof S.day_change_abs == "number")
      return S.day_change_abs;
    const x = S.performance && typeof S.performance == "object" ? S.performance.day_change : null;
    if (x && typeof x == "object") {
      const $ = x.value_change_eur;
      if (typeof $ == "number" && Number.isFinite($))
        return $;
    }
    return null;
  }).filter((S) => typeof S == "number" && Number.isFinite(S)), l = c.reduce((S, x) => S + x, 0), u = i.reduce((S, x) => {
    var W;
    if (typeof ((W = x.performance) == null ? void 0 : W.gain_abs) == "number" && Number.isFinite(x.performance.gain_abs))
      return S + x.performance.gain_abs;
    const $ = typeof x.current_value == "number" && Number.isFinite(x.current_value) ? x.current_value : 0, Y = typeof x.purchase_sum == "number" && Number.isFinite(x.purchase_sum) ? x.purchase_sum : 0;
    return S + ($ - Y);
  }, 0), d = i.length > 0, f = i.length !== e.length, p = c.length > 0, g = p && d && a !== 0 ? (() => {
    const S = a - l;
    return S ? l / S * 100 : null;
  })() : null, m = d && s > 0 ? u / s * 100 : null, y = {
    fx_unavailable: f,
    purchase_value: d ? s : null,
    current_value: d ? a : null,
    day_change_abs: p ? l : null,
    day_change_pct: p ? g : null,
    gain_abs: d ? u : null,
    gain_pct: d ? m : null
  }, h = { hasValue: d }, _ = { hasValue: p }, b = H("purchase_value", y.purchase_value, y, h), v = H("current_value", y.current_value, y, h), P = H("day_change_abs", y.day_change_abs, y, _), w = H("day_change_pct", y.day_change_pct, y, _), A = H("gain_abs", y.gain_abs, y, h), E = H("gain_pct", y.gain_pct, y, h);
  let T = "";
  if (d && typeof m == "number" && Number.isFinite(m)) {
    const S = `${le(m)} %`, x = m > 0 ? "positive" : m < 0 ? "negative" : "neutral";
    T = ` data-gain-pct="${t(S)}" data-gain-sign="${t(x)}"`;
  }
  f && (T += ' data-partial="true"');
  const F = String(Math.round(o)), D = d ? String(a) : "", R = d ? String(s) : "", M = p ? String(l) : "", N = p && typeof g == "number" && Number.isFinite(g) ? String(g) : "", C = d ? String(u) : "", I = d && typeof m == "number" && Number.isFinite(m) ? String(m) : "";
  return n += `<tr class="footer-row"
      data-position-count="${F}"
      data-current-value="${t(D)}"
      data-purchase-sum="${t(R)}"
      data-day-change="${t(M)}"
      data-day-change-pct="${t(N)}"
      data-gain-abs="${t(C)}"
      data-gain-pct="${t(I)}"
      data-has-value="${d ? "true" : "false"}"
      data-fx-unavailable="${f ? "true" : "false"}">
      <td>Summe</td>
      <td class="align-right">${Math.round(o).toLocaleString("de-DE")}</td>
    <td class="align-right">${b}</td>
    <td class="align-right">${v}</td>
    <td class="align-right">${P}</td>
    <td class="align-right">${w}</td>
    <td class="align-right"${T}>${A}</td>
    <td class="align-right gain-pct-cell">${E}</td>
  </tr>`, n += "</tbody></table>", n;
}
function Yo(e) {
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
function yr(e) {
  const t = Yo(e);
  if (!t)
    return;
  const n = t.tBodies.item(0);
  if (!n)
    return;
  const r = Array.from(n.querySelectorAll("tr.portfolio-row"));
  if (!r.length)
    return;
  let i = 0, o = 0, a = 0, s = 0, c = 0, l = !1, u = !1, d = !0, f = !1;
  for (const $ of r) {
    const Y = Te($.dataset.positionCount);
    Y != null && (i += Y), $.dataset.fxUnavailable === "true" && (f = !0);
    const W = $.dataset.hasValue;
    if (!!(W === "false" || W === "0" || W === "" || W == null)) {
      d = !1;
      continue;
    }
    l = !0;
    const B = Te($.dataset.currentValue), z = Te($.dataset.gainAbs), ee = Te($.dataset.purchaseSum), me = Te($.dataset.dayChange);
    if (B == null || z == null || ee == null) {
      d = !1;
      continue;
    }
    o += B, s += z, a += ee, me != null && (c += me, u = !0);
  }
  const p = l && d, g = p && a > 0 ? s / a * 100 : null, m = u && p && o !== 0 ? (() => {
    const $ = o - c;
    return $ ? c / $ * 100 : null;
  })() : null;
  let y = Array.from(n.children).find(
    ($) => $ instanceof HTMLTableRowElement && $.classList.contains("footer-row")
  );
  y || (y = document.createElement("tr"), y.classList.add("footer-row"), n.appendChild(y));
  const h = Math.round(i).toLocaleString("de-DE"), _ = {
    fx_unavailable: f || !p,
    purchase_value: p ? a : null,
    current_value: p ? o : null,
    day_change_abs: u && p ? c : null,
    day_change_pct: u && p ? m : null,
    gain_abs: p ? s : null,
    gain_pct: p ? g : null
  }, b = { hasValue: p }, v = { hasValue: u && p }, P = H("purchase_value", _.purchase_value, _, b), w = H("current_value", _.current_value, _, b), A = H("day_change_abs", _.day_change_abs, _, v), E = H("day_change_pct", _.day_change_pct, _, v), T = H("gain_abs", _.gain_abs, _, b), F = H("gain_pct", _.gain_pct, _, b), D = t.tHead ? t.tHead.rows.item(0) : null, R = D ? D.cells.length : 0, M = y.cells.length, N = R || M, C = N > 0 ? N <= 5 : !1, I = p && typeof g == "number" ? `${le(g)} %` : "", S = p && typeof g == "number" ? g > 0 ? "positive" : g < 0 ? "negative" : "neutral" : "neutral";
  C ? y.innerHTML = `
      <td>Summe</td>
      <td class="align-right">${h}</td>
      <td class="align-right">${w}</td>
      <td class="align-right">${T}</td>
      <td class="align-right gain-pct-cell">${F}</td>
    ` : y.innerHTML = `
      <td>Summe</td>
      <td class="align-right">${h}</td>
      <td class="align-right">${P}</td>
      <td class="align-right">${w}</td>
      <td class="align-right">${A}</td>
      <td class="align-right">${E}</td>
      <td class="align-right">${T}</td>
      <td class="align-right">${F}</td>
    `;
  const x = y.cells.item(C ? 3 : 6);
  x && (x.dataset.gainPct = I || "—", x.dataset.gainSign = S), y.dataset.positionCount = String(Math.round(i)), y.dataset.currentValue = p ? String(o) : "", y.dataset.purchaseSum = p ? String(a) : "", y.dataset.dayChange = p && u ? String(c) : "", y.dataset.dayChangePct = p && u && typeof m == "number" ? String(m) : "", y.dataset.gainAbs = p ? String(s) : "", y.dataset.gainPct = p && typeof g == "number" ? String(g) : "", y.dataset.hasValue = p ? "true" : "false", y.dataset.fxUnavailable = f ? "true" : "false";
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
  const o = (f, p) => {
    const g = i.querySelector("tbody");
    if (!g) return;
    const m = Array.from(g.querySelectorAll("tr")).filter((b) => !b.classList.contains("footer-row")), y = g.querySelector("tr.footer-row"), h = (b) => {
      if (b == null) return 0;
      const v = b.replace(/\u00A0/g, " ").replace(/[%€]/g, "").replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, ""), P = Number.parseFloat(v);
      return Number.isFinite(P) ? P : 0;
    };
    m.sort((b, v) => {
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
      }[f], A = b.cells.item(w), E = v.cells.item(w);
      let T = "";
      if (A) {
        const M = A.textContent;
        typeof M == "string" && (T = M.trim());
      }
      let F = "";
      if (E) {
        const M = E.textContent;
        typeof M == "string" && (F = M.trim());
      }
      const D = (M, N) => {
        const C = M ? M.dataset.sortValue : void 0;
        if (C != null && C !== "") {
          const I = Number(C);
          if (Number.isFinite(I))
            return I;
        }
        return h(N);
      };
      let R;
      if (f === "name")
        R = T.localeCompare(F, "de", { sensitivity: "base" });
      else {
        const M = D(A, T), N = D(E, F);
        R = M - N;
      }
      return p === "asc" ? R : -R;
    }), i.querySelectorAll("thead th.sort-active").forEach((b) => {
      b.classList.remove("sort-active", "dir-asc", "dir-desc");
    });
    const _ = i.querySelector(`thead th[data-sort-key="${f}"]`);
    _ && _.classList.add("sort-active", p === "asc" ? "dir-asc" : "dir-desc"), m.forEach((b) => g.appendChild(b)), y && g.appendChild(y);
  }, a = r.dataset.sortKey, s = r.dataset.sortDir, c = i.dataset.defaultSort, l = i.dataset.defaultDir, u = St(a) ? a : St(c) ? c : "name", d = Pt(s) ? s : Pt(l) ? l : "asc";
  o(u, d), i.addEventListener("click", (f) => {
    const p = f.target;
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
async function Ko(e, t, n) {
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
                await Ko(p, m ?? null, e);
              }
              return;
            }
            const c = a.closest(".portfolio-toggle");
            if (!c || !r.contains(c)) return;
            const l = c.getAttribute("data-portfolio");
            if (!l) return;
            const u = e.querySelector(
              `.portfolio-details[data-portfolio="${l}"]`
            );
            if (!u) return;
            const d = c.querySelector(".caret");
            if (u.classList.contains("hidden")) {
              u.classList.remove("hidden"), c.classList.add("expanded"), c.setAttribute("aria-expanded", "true"), d && (d.textContent = "▼"), rt.add(l);
              try {
                en(e, l);
              } catch (p) {
                console.warn("attachPortfolioToggleHandler: Pending-Flush fehlgeschlagen:", p);
              }
              if (Kt(l)) {
                const p = u.querySelector(".positions-container");
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
                const p = u.querySelector(".positions-container");
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
                  const m = g instanceof Error ? g.message : String(g), y = u.querySelector(".positions-container");
                  y && (y.innerHTML = `<div class="error">Fehler beim Laden: ${m} <button class="retry-pos" data-portfolio="${l}">Retry</button></div>`), console.error("Fehler beim Lazy Load für", l, g);
                }
              }
            } else
              u.classList.add("hidden"), c.classList.remove("expanded"), c.setAttribute("aria-expanded", "false"), d && (d.textContent = "▶"), rt.delete(l);
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
function Xo(e) {
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
  const r = await ki(t, n);
  nr(r.accounts);
  const i = cr(), o = await Ri(t, n);
  to(o.portfolios);
  const a = uo();
  let s = "";
  try {
    s = await Ti(t, n);
  } catch {
    s = "";
  }
  const c = i.reduce(
    (N, C) => N + (typeof C.balance == "number" && Number.isFinite(C.balance) ? C.balance : 0),
    0
  ), l = a.some((N) => N.fx_unavailable), u = i.some((N) => N.fx_unavailable && (N.balance == null || !Number.isFinite(N.balance))), d = a.reduce((N, C) => C.hasValue && typeof C.current_value == "number" && Number.isFinite(C.current_value) ? N + C.current_value : N, 0), f = c + d, p = "Teilw. fehlende FX-Kurse – Gesamtvermögen abweichend", m = a.some((N) => N.hasValue && typeof N.current_value == "number" && Number.isFinite(N.current_value)) || i.some((N) => typeof N.balance == "number" && Number.isFinite(N.balance)) ? `${le(f)}&nbsp;€` : `<span class="missing-value" role="note" aria-label="${p}" title="${p}">—</span>`, y = l || u ? `<span class="total-wealth-note">${p}</span>` : "", h = `
    <div class="header-meta-row">
      💰 Gesamtvermögen: <strong class="total-wealth-value">${m}</strong>${y}
    </div>
  `, _ = xt("Übersicht", h), b = _r(a), v = i.filter((N) => (N.currency_code ?? "EUR") === "EUR"), P = i.filter((N) => (N.currency_code ?? "EUR") !== "EUR"), A = P.some((N) => N.fx_unavailable) ? `
        <p class="table-note" role="note">
          <span class="table-note__icon" aria-hidden="true">⚠️</span>
          <span>Wechselkurse konnten nicht geladen werden. EUR-Werte werden derzeit nicht angezeigt.</span>
        </p>
      ` : "", E = `
    <div class="card">
      <h2>Liquidität</h2>
      <div class="scroll-container account-table">
        ${Ne(
    v.map((N) => ({
      name: et(N.name, wn(N.badges), {
        containerClass: "account-name",
        labelClass: "account-name__label"
      }),
      balance: N.balance ?? null
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
          ${Ne(
    P.map((N) => {
      const C = N.orig_balance, S = typeof C == "number" && Number.isFinite(C) ? `${C.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}&nbsp;${N.currency_code ?? ""}` : "";
      return {
        name: et(N.name, wn(N.badges), {
          containerClass: "account-name",
          labelClass: "account-name__label"
        }),
        fx_display: S,
        balance: N.balance ?? null
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
  `, T = `
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
    ${T}
  `;
  return Zo(e, a), F;
}
function Zo(e, t) {
  if (!e)
    return;
  const n = () => {
    try {
      const i = e, o = i.querySelector(".portfolio-table");
      o && o.querySelectorAll(".portfolio-toggle").length === 0 && (console.debug("Recovery: Tabelle ohne Buttons – erneuter Aufbau"), o.innerHTML = _r(t)), tn(e), Xo(e), rt.forEach((a) => {
        try {
          Kt(a) && (qe(e, a), ze(e, a));
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
        xo(e);
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
  renderPositionsTable: (e) => Bo(e),
  applyGainPctMetadata: mr,
  attachSecurityDetailListener: ze,
  attachPortfolioPositionsSorting: qe,
  updatePortfolioFooter: (e) => {
    e && yr(e);
  }
});
const Jo = "http://www.w3.org/2000/svg", ve = 640, Se = 260, $e = { top: 12, right: 16, bottom: 24, left: 16 }, Le = "var(--pp-reader-chart-line, #3f51b5)", Rt = "var(--pp-reader-chart-area, rgba(63, 81, 181, 0.12))", Cn = "0.75rem", vr = "var(--pp-reader-chart-baseline, rgba(96, 125, 139, 0.75))", Sr = "6 4", Qo = 24 * 60 * 60 * 1e3;
function ea(e) {
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
function ta(e) {
  return typeof e == "string" ? e : typeof e == "number" && Number.isFinite(e) ? e.toString() : e instanceof Date && Number.isFinite(e.getTime()) ? e.toISOString() : "";
}
function Z(e) {
  return `${String(e)}px`;
}
function te(e, t = {}) {
  const n = document.createElementNS(Jo, e);
  return Object.entries(t).forEach(([r, i]) => {
    const o = ea(i);
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
}, wr = (e) => {
  if (e && typeof e == "object" && "close" in e)
    return e.close;
}, Nr = (e, t, n) => {
  if (Number.isFinite(e)) {
    const r = new Date(e);
    if (!Number.isNaN(r.getTime()))
      return r.toLocaleDateString("de-DE");
  }
  if (t && typeof t == "object" && "date" in t) {
    const r = t.date, i = ta(r);
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
    yAccessor: wr,
    xFormatter: Nr,
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
function na(e, t) {
  if (e.length === 0)
    return "";
  const n = [];
  e.forEach((a, s) => {
    const c = s === 0 ? "M" : "L", l = a.x.toFixed(2), u = a.y.toFixed(2);
    n.push(`${c}${l} ${u}`);
  });
  const r = e[0], o = `L${e[e.length - 1].x.toFixed(2)} ${t.toFixed(2)} L${r.x.toFixed(2)} ${t.toFixed(2)} Z`;
  return `${n.join(" ")} ${o}`;
}
function ra(e) {
  if (e.length === 0)
    return "";
  const t = [];
  return e.forEach((n, r) => {
    const i = r === 0 ? "M" : "L", o = n.x.toFixed(2), a = n.y.toFixed(2);
    t.push(`${i}${o} ${a}`);
  }), t.join(" ");
}
function ia(e) {
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
  const { minY: s, maxY: c, boundedHeight: l } = r, u = Number.isFinite(s) ? s : a, f = (Number.isFinite(c) ? c : u + 1) - u, p = f === 0 ? 0.5 : (a - u) / f, g = Q(p, 0, 1), m = Math.max(l, 0), y = i.top + (1 - g) * m, h = Math.max(o - i.left - i.right, 0), _ = i.left, b = i.left + h;
  t.setAttribute("x1", _.toFixed(2)), t.setAttribute("x2", b.toFixed(2)), t.setAttribute("y1", y.toFixed(2)), t.setAttribute("y2", y.toFixed(2)), t.style.opacity = "1";
}
function oa(e, t, n) {
  var N;
  const { width: r, height: i, margin: o } = t, { xAccessor: a, yAccessor: s } = n;
  if (e.length === 0)
    return { points: [], range: null };
  const c = e.map((C, I) => {
    const S = a(C, I), x = s(C, I), $ = Pr(S, I), Y = it(x, Number.NaN);
    return Number.isFinite(Y) ? {
      index: I,
      data: C,
      xValue: $,
      yValue: Y
    } : null;
  }).filter((C) => !!C);
  if (c.length === 0)
    return { points: [], range: null };
  const l = c.reduce((C, I) => Math.min(C, I.xValue), c[0].xValue), u = c.reduce((C, I) => Math.max(C, I.xValue), c[0].xValue), d = c.reduce((C, I) => Math.min(C, I.yValue), c[0].yValue), f = c.reduce((C, I) => Math.max(C, I.yValue), c[0].yValue), p = Math.max(r - o.left - o.right, 1), g = Math.max(i - o.top - o.bottom, 1), m = Number.isFinite(l) ? l : 0, y = Number.isFinite(u) ? u : m + 1, h = Number.isFinite(d) ? d : 0, _ = Number.isFinite(f) ? f : h + 1, b = it((N = t.baseline) == null ? void 0 : N.value, null), v = b != null && Number.isFinite(b) ? Math.min(h, b) : h, P = b != null && Number.isFinite(b) ? Math.max(_, b) : _, w = Math.max(
    2,
    Math.min(
      6,
      Math.round(
        Math.max(i - o.top - o.bottom, 0) / 60
      ) || 4
    )
  ), { niceMin: A, niceMax: E } = pa(
    v,
    P,
    w
  ), T = Number.isFinite(A) ? A : h, F = Number.isFinite(E) ? E : _, D = y - m || 1, R = F - T || 1;
  return {
    points: c.map((C) => {
      const I = D === 0 ? 0.5 : (C.xValue - m) / D, S = R === 0 ? 0.5 : (C.yValue - T) / R, x = o.left + I * p, $ = o.top + (1 - S) * g;
      return {
        ...C,
        x,
        y: $
      };
    }),
    range: {
      minX: m,
      maxX: y,
      minY: T,
      maxY: F,
      boundedWidth: p,
      boundedHeight: g
    }
  };
}
function wt(e) {
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
  r.forEach((l, u) => {
    const d = Pr(l.x, u), f = it(l.y, Number.NaN), p = Number(f);
    if (!Number.isFinite(d) || !Number.isFinite(p))
      return;
    const g = s === 0 ? 0.5 : Q((d - i.minX) / s, 0, 1), m = c === 0 ? 0.5 : Q((p - i.minY) / c, 0, 1), y = o.left + g * i.boundedWidth, h = o.top + (1 - m) * i.boundedHeight, _ = te("g", {
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
function aa(e, t) {
  const n = e.xFormatter(t.xValue, t.data, t.index), r = e.yFormatter(t.yValue, t.data, t.index);
  return e.tooltipRenderer({
    point: t,
    xFormatted: n,
    yFormatted: r,
    data: t.data,
    index: t.index
  });
}
function sa(e, t, n, r = null) {
  const { tooltip: i, width: o, margin: a, height: s } = e;
  if (!i)
    return;
  const c = r && Number.isFinite(r.scaleX) && r.scaleX > 0 ? r.scaleX : 1, l = r && Number.isFinite(r.scaleY) && r.scaleY > 0 ? r.scaleY : 1, u = s - a.bottom;
  i.style.visibility = "visible", i.style.opacity = "1";
  const d = i.offsetWidth || 0, f = i.offsetHeight || 0, p = t.x * c, g = Q(
    p - d / 2,
    a.left * c,
    (o - a.right) * c - d
  ), m = Math.max(u * l - f, 0), y = 12, _ = (Number.isFinite(n) ? Q(n ?? 0, a.top, u) : t.y) * l;
  let b = _ - f - y;
  b < a.top * l && (b = _ + y), b = Q(b, 0, m);
  const v = Z(Math.round(g)), P = Z(Math.round(b));
  i.style.transform = `translate(${v}, ${P})`;
}
function $t(e) {
  const { tooltip: t, focusLine: n, focusCircle: r } = e;
  t && (t.style.opacity = "0", t.style.visibility = "hidden"), n && (n.style.opacity = "0"), r && (r.style.opacity = "0");
}
function ca(e, t) {
  const { marker: n } = t, r = e.xFormatter(t.marker.x, n, -1), i = e.yFormatter(t.marker.y, n, -1);
  return e.markerTooltipRenderer({
    marker: n,
    xFormatted: r,
    yFormatted: i
  });
}
function la(e, t, n, r = null) {
  var D;
  const { markerTooltip: i, width: o, margin: a, height: s, tooltip: c } = e;
  if (!i)
    return;
  const l = r && Number.isFinite(r.scaleX) && r.scaleX > 0 ? r.scaleX : 1, u = r && Number.isFinite(r.scaleY) && r.scaleY > 0 ? r.scaleY : 1, d = s - a.bottom;
  i.style.visibility = "visible", i.style.opacity = "1";
  const f = i.offsetWidth || 0, p = i.offsetHeight || 0, g = t.x * l, m = Q(
    g - f / 2,
    a.left * l,
    (o - a.right) * l - f
  ), y = Math.max(d * u - p, 0), h = 10, _ = c == null ? void 0 : c.getBoundingClientRect(), b = (D = e.svg) == null ? void 0 : D.getBoundingClientRect(), v = _ && b ? _.top - b.top : null, P = _ && b ? _.bottom - b.top : null, A = (Number.isFinite(n) ? Q(n ?? t.y, a.top, d) : t.y) * u;
  let E;
  v != null && P != null ? v <= A ? E = v - p - h : E = P + h : (E = A - p - h, E < a.top * u && (E = A + h)), E = Q(E, 0, y);
  const T = Z(Math.round(m)), F = Z(Math.round(E));
  i.style.transform = `translate(${T}, ${F})`;
}
function Ze(e) {
  const { markerTooltip: t } = e;
  t && (t.style.opacity = "0", t.style.visibility = "hidden");
}
function ua(e, t, n) {
  let i = null, o = 24 * 24;
  for (const a of e.markerPositions) {
    const s = a.x - t, c = a.y - n, l = s * s + c * c;
    l <= o && (i = a, o = l);
  }
  return i;
}
function da(e, t) {
  if (t.handlersAttached || !t.overlay)
    return;
  const n = (i) => {
    if (t.points.length === 0 || !t.svg) {
      $t(t), Ze(t);
      return;
    }
    const o = t.svg.getBoundingClientRect(), a = t.width || ve, s = t.height || Se, c = o.width && Number.isFinite(o.width) && Number.isFinite(a) && a > 0 ? o.width / a : 1, l = o.height && Number.isFinite(o.height) && Number.isFinite(s) && s > 0 ? o.height / s : 1, u = c > 0 ? 1 / c : 1, d = l > 0 ? 1 / l : 1, f = (i.clientX - o.left) * u, p = (i.clientY - o.top) * d, g = {
      scaleX: c,
      scaleY: l
    };
    let m = t.points[0], y = Math.abs(f - m.x);
    for (let _ = 1; _ < t.points.length; _ += 1) {
      const b = t.points[_], v = Math.abs(f - b.x);
      v < y && (y = v, m = b);
    }
    t.focusCircle && (t.focusCircle.setAttribute("cx", m.x.toFixed(2)), t.focusCircle.setAttribute("cy", m.y.toFixed(2)), t.focusCircle.style.opacity = "1"), t.focusLine && (t.focusLine.setAttribute("x1", m.x.toFixed(2)), t.focusLine.setAttribute("x2", m.x.toFixed(2)), t.focusLine.setAttribute("y1", t.margin.top.toFixed(2)), t.focusLine.setAttribute(
      "y2",
      (t.height - t.margin.bottom).toFixed(2)
    ), t.focusLine.style.opacity = "1"), t.tooltip && (t.tooltip.innerHTML = aa(t, m), sa(t, m, p, g));
    const h = ua(t, f, p);
    h && t.markerTooltip ? (t.markerTooltip.innerHTML = ca(t, h), la(t, h, p, g)) : Ze(t);
  }, r = () => {
    $t(t), Ze(t);
  };
  t.overlay.addEventListener("pointermove", n), t.overlay.addEventListener("pointerenter", n), t.overlay.addEventListener("pointerleave", r), t.handlersAttached = !0, t.handlePointerMove = n, t.handlePointerLeave = r, e.addEventListener("pointercancel", r);
}
function fa(e, t = {}) {
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
  }), u = te("rect", {
    class: "line-chart-overlay",
    fill: "transparent",
    x: 0,
    y: 0,
    width: ve,
    height: Se
  });
  r.appendChild(i), r.appendChild(o), r.appendChild(a), r.appendChild(s), r.appendChild(c), r.appendChild(l), r.appendChild(u), n.appendChild(r);
  const d = document.createElement("div");
  d.className = "chart-tooltip", d.style.position = "absolute", d.style.top = "0", d.style.left = "0", d.style.pointerEvents = "none", d.style.opacity = "0", d.style.visibility = "hidden", n.appendChild(d);
  const f = document.createElement("div");
  f.className = "line-chart-marker-overlay", f.style.position = "absolute", f.style.top = "0", f.style.left = "0", f.style.width = "100%", f.style.height = "100%", f.style.pointerEvents = "none", f.style.overflow = "visible", f.style.zIndex = "2", n.appendChild(f);
  const p = document.createElement("div");
  p.className = "chart-tooltip chart-tooltip--marker", p.style.position = "absolute", p.style.top = "0", p.style.left = "0", p.style.pointerEvents = "none", p.style.opacity = "0", p.style.visibility = "hidden", n.appendChild(p), e.appendChild(n);
  const g = xr(n);
  if (g.svg = r, g.areaPath = i, g.linePath = a, g.baselineLine = o, g.focusLine = s, g.focusCircle = c, g.overlay = u, g.tooltip = d, g.markerOverlay = f, g.markerLayer = l, g.markerTooltip = p, g.xAccessor = t.xAccessor ?? Ar, g.yAccessor = t.yAccessor ?? wr, g.xFormatter = t.xFormatter ?? Nr, g.yFormatter = t.yFormatter ?? Er, g.tooltipRenderer = t.tooltipRenderer ?? Fr, g.markerTooltipRenderer = t.markerTooltipRenderer ?? Cr, g.color = t.color ?? Le, g.areaColor = t.areaColor ?? Rt, g.baseline = t.baseline ?? null, g.handlersAttached = !1, g.markers = Array.isArray(t.markers) ? t.markers.slice() : [], !g.xAxis) {
    const m = document.createElement("div");
    m.className = "line-chart-axis line-chart-axis-x", m.style.position = "absolute", m.style.left = "0", m.style.right = "0", m.style.bottom = "0", m.style.pointerEvents = "none", m.style.fontSize = Cn, m.style.color = "var(--secondary-text-color)", m.style.display = "block", n.appendChild(m), g.xAxis = m;
  }
  if (!g.yAxis) {
    const m = document.createElement("div");
    m.className = "line-chart-axis line-chart-axis-y", m.style.position = "absolute", m.style.top = "0", m.style.bottom = "0", m.style.left = "0", m.style.pointerEvents = "none", m.style.fontSize = Cn, m.style.color = "var(--secondary-text-color)", m.style.display = "block", n.appendChild(m), g.yAxis = m;
  }
  return Dr(g, t.width, t.height, t.margin), a.setAttribute("stroke", g.color), s.setAttribute("stroke", g.color), c.setAttribute("stroke", g.color), i.setAttribute("fill", g.areaColor), kr(n, t), da(n, g), n;
}
function kr(e, t = {}) {
  if (!e) {
    console.error("updateLineChart: container element is required");
    return;
  }
  const n = xr(e);
  if (!n.svg || !n.linePath || !n.overlay) {
    console.error("updateLineChart: chart was not initialised with renderLineChart");
    return;
  }
  t.xAccessor && (n.xAccessor = t.xAccessor), t.yAccessor && (n.yAccessor = t.yAccessor), t.xFormatter && (n.xFormatter = t.xFormatter), t.yFormatter && (n.yFormatter = t.yFormatter), t.tooltipRenderer && (n.tooltipRenderer = t.tooltipRenderer), t.markerTooltipRenderer && (n.markerTooltipRenderer = t.markerTooltipRenderer), t.color && (n.color = t.color, n.linePath.setAttribute("stroke", n.color), n.focusLine && n.focusLine.setAttribute("stroke", n.color), n.focusCircle && n.focusCircle.setAttribute("stroke", n.color)), t.areaColor && (n.areaColor = t.areaColor, n.areaPath && n.areaPath.setAttribute("fill", n.areaColor)), Object.prototype.hasOwnProperty.call(t, "baseline") && (n.baseline = t.baseline ?? null), Array.isArray(t.markers) && (n.markers = t.markers.slice()), ia(n), Dr(n, t.width, t.height, t.margin);
  const { width: r, height: i } = n;
  n.svg.setAttribute("width", String(r)), n.svg.setAttribute("height", String(i)), n.svg.setAttribute("viewBox", `0 0 ${String(r)} ${String(i)}`), n.overlay.setAttribute("x", "0"), n.overlay.setAttribute("y", "0"), n.overlay.setAttribute("width", Math.max(r, 0).toFixed(2)), n.overlay.setAttribute("height", Math.max(i, 0).toFixed(2)), Array.isArray(t.series) && (n.series = Array.from(t.series));
  const { points: o, range: a } = oa(n.series, n, {
    xAccessor: n.xAccessor,
    yAccessor: n.yAccessor
  });
  if (n.points = o, n.range = a, o.length === 0) {
    n.linePath.setAttribute("d", ""), n.areaPath && n.areaPath.setAttribute("d", ""), $t(n), wt(n), Nt(n), At(n);
    return;
  }
  if (o.length === 1) {
    const c = o[0], l = Math.max(
      0.5,
      Math.min(4, Math.max(n.width - n.margin.left - n.margin.right, 1) * 0.01)
    ), u = `M${c.x.toFixed(2)} ${c.y.toFixed(2)} h${l.toFixed(2)}`;
    n.linePath.setAttribute("d", u), n.areaPath && n.areaPath.setAttribute("d", ""), n.focusCircle && (n.focusCircle.setAttribute("cx", c.x.toFixed(2)), n.focusCircle.setAttribute("cy", c.y.toFixed(2)), n.focusCircle.style.opacity = "1"), n.focusLine && (n.focusLine.style.opacity = "0"), Nt(n), At(n), wt(n);
    return;
  }
  const s = ra(o);
  if (n.linePath.setAttribute("d", s), n.areaPath && a) {
    const c = n.margin.top + a.boundedHeight, l = na(o, c);
    n.areaPath.setAttribute("d", l);
  }
  Nt(n), At(n), wt(n);
}
function Nt(e) {
  const { xAxis: t, yAxis: n, range: r, margin: i, height: o, yFormatter: a } = e;
  if (!t || !n)
    return;
  if (!r) {
    t.innerHTML = "", n.innerHTML = "";
    return;
  }
  const { minX: s, maxX: c, minY: l, maxY: u, boundedWidth: d, boundedHeight: f } = r, p = Number.isFinite(s) && Number.isFinite(c) && c >= s, g = Number.isFinite(l) && Number.isFinite(u) && u >= l, m = Math.max(d, 0), y = Math.max(f, 0);
  if (t.style.left = Z(i.left), t.style.width = Z(m), t.style.top = Z(o - i.bottom + 6), t.innerHTML = "", p && m > 0) {
    const _ = (c - s) / Qo, b = Math.max(2, Math.min(6, Math.round(m / 140) || 4));
    ga(e, s, c, b, _).forEach(({ positionRatio: P, label: w }) => {
      const A = document.createElement("div");
      A.className = "line-chart-axis-tick line-chart-axis-tick-x", A.style.position = "absolute", A.style.bottom = "0";
      const E = Q(P, 0, 1);
      A.style.left = Z(E * m);
      let T = "-50%", F = "center";
      E <= 1e-3 ? (T = "0", F = "left", A.style.marginLeft = "2px") : E >= 0.999 && (T = "-100%", F = "right", A.style.marginRight = "2px"), A.style.transform = `translateX(${T})`, A.style.textAlign = F, A.textContent = w, t.appendChild(A);
    });
  }
  n.style.top = Z(i.top), n.style.height = Z(y);
  const h = Math.max(i.left - 6, 0);
  if (n.style.left = "0", n.style.width = Z(Math.max(h, 0)), n.innerHTML = "", g && y > 0) {
    const _ = Math.max(2, Math.min(6, Math.round(y / 60) || 4)), b = ha(l, u, _), v = a;
    b.forEach(({ value: P, positionRatio: w }) => {
      const A = document.createElement("div");
      A.className = "line-chart-axis-tick line-chart-axis-tick-y", A.style.position = "absolute", A.style.left = "0";
      const T = (1 - Q(w, 0, 1)) * y;
      A.style.top = Z(T), A.textContent = v(P, null, -1), n.appendChild(A);
    });
  }
}
function pa(e, t, n = 4) {
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
function ga(e, t, n, r, i) {
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
    const l = o === 1 ? 0.5 : c / (o - 1), u = t + l * s;
    a.push({
      positionRatio: l,
      label: xn(e, u, i)
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
function ha(e, t, n) {
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
  for (let u = s; u <= c + a / 2; u += a) {
    const d = (u - e) / (t - e);
    l.push({
      value: u,
      positionRatio: Q(d, 0, 1)
    });
  }
  return l.length > i + 2 ? l.filter((u, d) => d % 2 === 0) : l;
}
function Lt(e) {
  if (!Number.isFinite(e) || e === 0)
    return 1;
  const t = Math.floor(Math.log10(Math.abs(e))), n = Math.abs(e) / 10 ** t;
  let r;
  return n <= 1 ? r = 1 : n <= 2 ? r = 2 : n <= 5 ? r = 5 : r = 10, r * 10 ** t;
}
function ma(e) {
  return Array.isArray(e) && e.every((t) => typeof t == "string");
}
function _a(e) {
  return typeof e == "object" && e !== null;
}
function ya(e) {
  if (!_a(e))
    return !1;
  const t = e;
  return typeof t.portfolioUuid != "string" ? !1 : ma(t.securityUuids);
}
function ba(e) {
  return e instanceof CustomEvent ? ya(e.detail) : !1;
}
const Et = { min: 0, max: 6 }, ot = { min: 2, max: 4 }, va = "1Y", Tr = [
  "1M",
  "6M",
  "1Y",
  "5Y",
  "ALL"
], Sa = {
  "1M": 30,
  "6M": 182,
  "1Y": 365,
  "5Y": 1826,
  ALL: Number.POSITIVE_INFINITY
}, Pa = /* @__PURE__ */ new Set([0, 2]), Aa = /* @__PURE__ */ new Set([1, 3]), wa = "var(--pp-reader-chart-marker-buy, #2e7d32)", Na = "var(--pp-reader-chart-marker-sell, #c0392b)", Ft = {
  aggregation: "Aggregationsdaten",
  totals: "Kaufsummen",
  eur_total: "EUR-Kaufsumme"
}, Pe = /* @__PURE__ */ new Map(), Je = /* @__PURE__ */ new Map(), Oe = /* @__PURE__ */ new Map(), Ae = /* @__PURE__ */ new Map(), Rr = "pp-reader:portfolio-positions-updated", Me = /* @__PURE__ */ new Map();
function Ea(e) {
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
function Fa(e, t) {
  if (e) {
    if (t) {
      Oe.set(e, t);
      return;
    }
    Oe.delete(e);
  }
}
function Ca(e) {
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
function xa(e, t) {
  if (!e || !t)
    return;
  const n = t.securityUuids;
  (Array.isArray(n) ? n : []).includes(e) && (Mr(e), Hr(e));
}
function Da(e) {
  if (!e || Me.has(e))
    return;
  const t = (n) => {
    ba(n) && xa(e, n.detail);
  };
  try {
    window.addEventListener(Rr, t), Me.set(e, t);
  } catch (n) {
    console.error("ensureLiveUpdateSubscription: Registrierung fehlgeschlagen", n);
  }
}
function ka(e) {
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
  e && (ka(e), Mr(e), Hr(e));
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
  return ((t = Je.get(e)) == null ? void 0 : t.activeRange) ?? va;
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
function kn(e) {
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
function Ra(e) {
  if (!e)
    return null;
  const t = Gt(e.aggregation), n = L(t == null ? void 0 : t.purchase_total_security) ?? (t ? L(
    t.security_currency_total
  ) : null), r = L(t == null ? void 0 : t.purchase_total_account) ?? (t ? L(
    t.account_currency_total
  ) : null);
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
  const n = Ee(t instanceof Date ? t : /* @__PURE__ */ new Date()), r = Sa[e], i = kn(n), o = {};
  if (i != null && (o.end_date = i), Number.isFinite(r) && r > 0) {
    const a = new Date(n.getTime());
    a.setUTCDate(a.getUTCDate() - (r - 1));
    const s = kn(a);
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
function $a(e) {
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
  const r = [], i = ye(t), o = i || "EUR", a = Ra(n);
  return e.forEach((s, c) => {
    const l = typeof s.type == "number" ? s.type : Number(s.type), u = Pa.has(l), d = Aa.has(l);
    if (!u && !d)
      return;
    const f = $a(s.date);
    let p = L(s.price);
    if (!f || p == null)
      return;
    const g = ye(s.currency_code), m = i ?? g ?? o;
    g && i && g !== i && ne(a) && (p *= a);
    const y = L(s.shares), h = L(s.net_price_eur), _ = u ? "Kauf" : "Verkauf", b = y != null ? `${an(y)} @ ` : "", v = `${_} ${b}${ce(p)} ${m}`, P = d && h != null ? `${v} (netto ${ce(h)} EUR)` : v, w = u ? wa : Na, A = typeof s.uuid == "string" && s.uuid.trim() || `${_}-${f.getTime().toString()}-${c.toString()}`;
    r.push({
      id: A,
      x: f.getTime(),
      y: p,
      color: w,
      label: P,
      payload: {
        type: _,
        currency: m,
        transactionCurrency: g,
        shares: y,
        price: p,
        netPriceEur: h,
        date: f.toISOString(),
        portfolio: s.portfolio
      }
    });
  }), r;
}
function rn(e) {
  var r;
  const t = L(e == null ? void 0 : e.last_price_native) ?? L((r = e == null ? void 0 : e.last_price) == null ? void 0 : r.native) ?? null;
  if (k(t))
    return t;
  if (ye(e == null ? void 0 : e.currency_code) === "EUR") {
    const i = L(e == null ? void 0 : e.last_price_eur);
    if (k(i))
      return i;
  }
  return null;
}
function La(e) {
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
  if (!k(i))
    return r;
  const o = La(t) ?? Date.now(), a = new Date(o);
  if (Number.isNaN(a.getTime()))
    return r;
  const s = Mt(Ee(a));
  let c = null;
  for (let l = r.length - 1; l >= 0; l -= 1) {
    const u = r[l], d = nn(u.date);
    if (!d)
      continue;
    const f = Mt(Ee(d));
    if (c == null && (c = f), f === s)
      return u.close !== i && (r[l] = { ...u, close: i }), r;
    if (f < s)
      break;
  }
  return c != null && c > s || r.push({
    date: a,
    close: i
  }), r;
}
function k(e) {
  return typeof e == "number" && Number.isFinite(e);
}
function ne(e) {
  return typeof e == "number" && Number.isFinite(e) && e > 0;
}
function He(e, t, n) {
  if (!k(e) || !k(t))
    return !1;
  const r = Math.abs(e - t), i = Math.max(Math.abs(e), Math.abs(t), 1);
  return r <= i * 1e-4;
}
function Ma(e, t) {
  return !k(t) || t === 0 || !k(e) ? null : qi((e - t) / t * 100);
}
function zr(e, t) {
  if (e.length === 0)
    return { priceChange: null, priceChangePct: null };
  const n = e[0], r = L(n.close);
  if (!k(r) || r === 0)
    return { priceChange: null, priceChangePct: null };
  const i = e[e.length - 1], o = L(i.close), a = L(t) ?? o;
  if (!k(a))
    return { priceChange: null, priceChangePct: null };
  const s = a - r, c = Object.is(s, -0) ? 0 : s, l = Ma(a, r);
  return { priceChange: c, priceChangePct: l };
}
function on(e, t) {
  if (!k(e) || e === 0)
    return "neutral";
  const n = 0.5 / Math.pow(10, t);
  return Math.abs(e) < n ? "neutral" : e > 0 ? "positive" : "negative";
}
function Ha(e, t) {
  if (!k(e))
    return '<span class="value neutral">—</span>';
  const n = ce(e);
  if (n === "—")
    return '<span class="value neutral">—</span>';
  const r = on(e, ot.max), i = t ? `&nbsp;${t}` : "";
  return `<span class="value ${r}">${n}${i}</span>`;
}
function Ia(e) {
  return k(e) ? `<span class="value ${on(e, 2)} value--percentage">${le(e)}&nbsp;%</span>` : '<span class="value neutral">—</span>';
}
function qr(e, t, n, r) {
  const i = e, o = i.length > 0 ? i : "Zeitraum";
  return `
    <div class="security-info-bar" data-range="${i}">
      <div class="security-info-item">
        <span class="label">Preisänderung (${o})</span>
        <div class="value-row">
          ${Ha(t, r)}
          ${Ia(n)}
        </div>
      </div>
    </div>
  `;
}
function Va(e) {
  return `
    <div class="security-range-selector" role="group" aria-label="Zeitraum">
      ${Tr.map((n) => `
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
function Ua(e, t) {
  const n = ce(e), r = `&nbsp;${t}`;
  return `<span class="${on(e, ot.max)}">${n}${r}</span>`;
}
function Wr(e) {
  return e == null ? "" : (typeof e == "string" ? e : String(e)).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function za(e, t) {
  const n = e == null ? void 0 : e.ticker_symbol;
  if (typeof n == "string" && n.trim())
    return n.trim();
  const r = typeof (e == null ? void 0 : e.name) == "string" ? e.name.trim() : "";
  return r || (typeof t == "string" ? t : "");
}
function qa(e) {
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
async function Oa(e) {
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
function Wa(e) {
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
function Ba(e, t, n) {
  const r = Ce(e == null ? void 0 : e.average_cost), i = (r == null ? void 0 : r.account) ?? (k(t) ? t : L(t));
  if (!k(i))
    return null;
  const o = (e == null ? void 0 : e.account_currency_code) ?? (e == null ? void 0 : e.account_currency);
  if (typeof o == "string" && o.trim())
    return o.trim().toUpperCase();
  const a = ye(e == null ? void 0 : e.currency_code) ?? "", s = (r == null ? void 0 : r.security) ?? (r == null ? void 0 : r.native) ?? (k(n) ? n : L(n)), c = Gt(e == null ? void 0 : e.aggregation);
  if (a && k(s) && He(i, s))
    return a;
  const l = L(c == null ? void 0 : c.purchase_total_security) ?? L(e == null ? void 0 : e.purchase_total_security), u = L(c == null ? void 0 : c.purchase_total_account) ?? L(e == null ? void 0 : e.purchase_total_account);
  let d = null;
  if (k(l) && l !== 0 && k(u) && (d = u / l), (r == null ? void 0 : r.source) === "eur_total")
    return "EUR";
  const p = r == null ? void 0 : r.eur;
  if (k(p) && He(i, p))
    return "EUR";
  const g = L(e == null ? void 0 : e.purchase_value_eur);
  return k(g) ? "EUR" : d != null && He(d, 1) ? a || null : a === "EUR" ? "EUR" : a || "EUR";
}
function Tn(e) {
  return typeof e != "number" || !Number.isFinite(e) || e <= 0 ? null : e.toLocaleString("de-DE", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
  });
}
function ja(e) {
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
function Ya(e) {
  if (e == null || !Number.isFinite(e))
    return null;
  const t = new Date(e);
  return Number.isNaN(t.getTime()) ? null : t.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}
function Ka(e, t) {
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
  const l = Tn(c);
  if (!l)
    return null;
  let u = null;
  if (c > 0) {
    const _ = 1 / c;
    Number.isFinite(_) && _ > 0 && (u = Tn(_));
  }
  const d = ja(e), f = Ya(d), p = [`FX-Kurs (Kauf): 1 ${n} = ${l} ${s}`];
  u && p.push(`1 ${s} = ${u} ${n}`);
  const g = [], m = r.source, y = m in Ft ? Ft[m] : Ft.aggregation;
  if (g.push(`Quelle: ${y}`), k(r.coverage_ratio)) {
    const _ = Math.min(Math.max(r.coverage_ratio * 100, 0), 100);
    g.push(
      `Abdeckung: ${_.toLocaleString("de-DE", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      })}%`
    );
  }
  g.length && p.push(...g);
  const h = f ?? "Datum unbekannt";
  return `${p.join(" · ")} (Stand: ${h})`;
}
function Rn(e) {
  if (!e)
    return null;
  const t = Ce(e.average_cost), n = (t == null ? void 0 : t.native) ?? (t == null ? void 0 : t.security) ?? null;
  return k(n) ? n : null;
}
function $n(e) {
  var W;
  if (!e)
    return '<div class="meta-error">Keine Snapshot-Daten verfügbar.</div>';
  const t = e.currency_code || "EUR", n = e.total_holdings_precise ?? e.total_holdings, r = an(n), i = e.last_price_native ?? ((W = e.last_price) == null ? void 0 : W.native) ?? e.last_price_eur, o = ce(i), a = o === "—" ? null : `${o}${`&nbsp;${t}`}`, s = L(e.market_value_eur) ?? L(e.current_value_eur) ?? null, c = Ce(e.average_cost), l = (c == null ? void 0 : c.native) ?? (c == null ? void 0 : c.security) ?? null, u = (c == null ? void 0 : c.eur) ?? null, f = (c == null ? void 0 : c.account) ?? null ?? u, p = ge(e.performance), g = (p == null ? void 0 : p.day_change) ?? null, m = (g == null ? void 0 : g.price_change_native) ?? null, y = (g == null ? void 0 : g.price_change_eur) ?? null, h = k(m) ? m : y, _ = k(m) ? t : "EUR", b = (U, B = "") => {
    const z = ["value"];
    return B && z.push(...B.split(" ").filter(Boolean)), `<span class="${z.join(" ")}">${U}</span>`;
  }, v = (U = "") => {
    const B = ["value--missing"];
    return U && B.push(U), b("—", B.join(" "));
  }, P = (U, B = "") => {
    if (!k(U))
      return v(B);
    const z = ["value--gain"];
    return B && z.push(B), b(Ai(U), z.join(" "));
  }, w = (U, B = "") => {
    if (!k(U))
      return v(B);
    const z = ["value--gain-percentage"];
    return B && z.push(B), b(wi(U), z.join(" "));
  }, A = a ? b(a, "value--price") : v("value--price"), E = r === "—" ? v("value--holdings") : b(r, "value--holdings"), T = k(s) ? b(`${le(s)}&nbsp;€`, "value--market-value") : v("value--market-value"), F = k(h) ? b(
    Ua(h, _),
    "value--gain value--absolute"
  ) : v("value--absolute"), D = w(
    g == null ? void 0 : g.change_pct,
    "value--percentage"
  ), R = P(
    p == null ? void 0 : p.total_change_eur,
    "value--absolute"
  ), M = w(
    p == null ? void 0 : p.total_change_pct,
    "value--percentage"
  ), N = Ba(
    e,
    f,
    l
  ), C = Ka(
    e,
    N
  ), I = C ? ` title="${Wr(C)}"` : "", S = [], x = k(u);
  k(l) ? S.push(
    b(
      `${ce(l)}${`&nbsp;${t}`}`,
      "value--average value--average-native"
    )
  ) : S.push(
    v("value--average value--average-native")
  );
  let $ = null, Y = null;
  return x && (t !== "EUR" || !k(l) || !He(u, l)) ? ($ = u, Y = "EUR") : k(f) && N && (N !== t || !He(f, l ?? NaN)) && ($ = f, Y = N), $ != null && k($) && S.push(
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
          ${S.join("")}
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
        <div class="value-group">${T}</div>
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
function Ga(e, t, {
  currency: n,
  baseline: r,
  markers: i
} = {}) {
  const o = e.clientWidth || e.offsetWidth || 0, a = o > 0 ? o : 640, s = Math.min(Math.max(Math.floor(a * 0.5), 240), 440), c = (n || "").toUpperCase() || "EUR", l = k(r) ? r : null, u = Math.max(48, Math.min(72, Math.round(a * 0.075))), d = Math.max(28, Math.min(56, Math.round(a * 0.05))), f = Math.max(40, Math.min(64, Math.round(s * 0.14)));
  return {
    width: a,
    height: s,
    margin: {
      top: 18,
      right: d,
      bottom: f,
      left: u
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
      const h = g.payload ?? {}, _ = Vr(h.type), b = L(h.shares), v = b != null ? an(b) : null, P = ye(h.currency) ?? c, w = [];
      _ && w.push(_), v && w.push(`${v} Stück`), m && w.push(`am ${m}`);
      const A = w.join(" ").trim() || (typeof g.label == "string" ? g.label : m), E = typeof y == "string" && y.trim() ? y.trim() : ce(h.price), T = E ? `${E}${P ? `&nbsp;${P}` : ""}` : P;
      return `
      <div class="chart-tooltip-date">${A}</div>
      <div class="chart-tooltip-value">${T}</div>
    `;
    },
    baseline: l != null ? {
      value: l
    } : null,
    markers: Array.isArray(i) ? i : []
  };
}
const Ln = /* @__PURE__ */ new WeakMap();
function Xa(e, t, n = {}) {
  if (t.length === 0)
    return;
  const r = Ga(e, t, n);
  let i = Ln.get(e) ?? null;
  if (!i || !e.contains(i)) {
    e.innerHTML = "", i = fa(e, r), i && Ln.set(e, i);
    return;
  }
  kr(i, r);
}
function Mn(e, t) {
  e && (e.dataset.activeRange = t, e.querySelectorAll(".security-range-button").forEach((n) => {
    const i = n.dataset.range === t;
    n.classList.toggle("active", i), n.setAttribute("aria-pressed", i ? "true" : "false"), n.disabled = !1, n.classList.remove("loading");
  }));
}
function Za(e, t, n, r, i) {
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
      Xa(a, r, i);
    });
  }
}
function Ja(e) {
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
    const u = $r(i), d = Lr(i), f = Rn(o);
    Array.isArray(s) && c.status !== "error" && u.set(a, s), Da(i), Dn(i, a), Mn(l, a);
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
        baseline: f,
        markers: d.get(a) ?? []
      }
    );
    const y = async (h) => {
      if (h === Ir(i))
        return;
      const _ = l.querySelector(
        `.security-range-button[data-range="${h}"]`
      );
      _ && (_.disabled = !0, _.classList.add("loading"));
      let b = u.get(h) ?? null, v = d.get(h) ?? null, P = null, w = [];
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
          b = Ht(M.prices), v = ct(
            M.transactions,
            o == null ? void 0 : o.currency_code,
            o
          ), u.set(h, b), v = Array.isArray(v) ? v : [], d.set(h, v), P = b.length ? { status: "loaded" } : { status: "empty" };
        } catch (R) {
          console.error("Range-Wechsel: Historie konnte nicht geladen werden", R), b = [], v = [], P = {
            status: "error",
            message: Br(R) || "Die historischen Daten konnten aufgrund eines Fehlers nicht geladen werden."
          };
        }
      if (!Array.isArray(v))
        try {
          const R = at(h), M = await Qe(
            n,
            r,
            i,
            R
          );
          v = ct(
            M.transactions,
            o == null ? void 0 : o.currency_code,
            o
          ), v = Array.isArray(v) ? v : [], d.set(h, v);
        } catch (R) {
          console.error("Range-Wechsel: Transaktionsmarker konnten nicht geladen werden", R), v = [];
        }
      w = It(b, o), P.status !== "error" && (P = w.length ? { status: "loaded" } : { status: "empty" });
      const A = rn(o), { priceChange: E, priceChangePct: T } = zr(
        w,
        A
      ), F = Array.isArray(v) ? v : [];
      Dn(i, h), Mn(l, h), Za(
        t,
        h,
        E,
        T,
        o == null ? void 0 : o.currency_code
      );
      const D = Rn(o);
      Hn(
        t,
        h,
        P,
        w,
        {
          currency: o == null ? void 0 : o.currency_code,
          baseline: D,
          markers: F
        }
      );
    };
    l.addEventListener("click", (h) => {
      var v;
      const _ = (v = h.target) == null ? void 0 : v.closest(".security-range-button");
      if (!_ || _.disabled)
        return;
      const { range: b } = _.dataset;
      !b || !Tr.includes(b) || y(b);
    });
  }, 0);
}
function Qa(e) {
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
          const c = await Li(n, r), l = (c.placeholder || "").trim() || "{TICKER}", u = (c.prompt_template || "").trim(), d = u ? l && u.includes(l) ? u.split(l).join(s) : `${u}

Ticker: ${s}` : `Ticker: ${s}`;
          await Oa(d) || console.warn("News-Prompt: Clipboard unavailable – prompt could not be copied"), c.link && Wa(c.link);
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
async function es(e, t, n, r) {
  if (!r)
    return console.error("renderSecurityDetail: securityUuid fehlt"), '<div class="card"><h2>Fehler</h2><p>Kein Wertpapier angegeben.</p></div>';
  const i = Ca(r);
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
  r && Fa(r, s ?? null);
  const u = s && (c || l) ? Ea({ fallbackUsed: c, flaggedAsCache: l }) : "", d = (s == null ? void 0 : s.name) || "Wertpapierdetails";
  if (a) {
    const F = xt(
      d,
      $n(s)
    );
    return F.classList.add("security-detail-header"), `
      ${F.outerHTML}
      ${u}
      <div class="card error-card">
        <h2>Fehler beim Laden</h2>
        <p>${a}</p>
      </div>
    `;
  }
  const f = Ir(r), p = $r(r), g = Lr(r);
  let m = p.has(f) ? p.get(f) ?? null : null, y = { status: "empty" }, h = g.has(f) ? g.get(f) ?? null : null;
  if (Array.isArray(m))
    y = m.length ? { status: "loaded" } : { status: "empty" };
  else {
    m = [];
    try {
      const F = at(f), D = await Qe(
        t,
        n,
        r,
        F
      );
      m = Ht(D.prices), h = ct(
        D.transactions,
        s == null ? void 0 : s.currency_code,
        s
      ), p.set(f, m), h = Array.isArray(h) ? h : [], g.set(f, h), y = m.length ? { status: "loaded" } : { status: "empty" };
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
      const F = at(f), D = await Qe(
        t,
        n,
        r,
        F
      ), R = Ht(D.prices);
      h = ct(
        D.transactions,
        s == null ? void 0 : s.currency_code,
        s
      ), p.set(f, R), h = Array.isArray(h) ? h : [], g.set(f, h), m = R, y = m.length ? { status: "loaded" } : { status: "empty" };
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
    d,
    $n(s)
  );
  b.classList.add("security-detail-header");
  const v = za(s, r), P = qa(v), w = rn(s), { priceChange: A, priceChangePct: E } = zr(
    _,
    w
  ), T = qr(
    f,
    A,
    E,
    s == null ? void 0 : s.currency_code
  );
  return Ja({
    root: e,
    hass: t,
    panelConfig: n,
    securityUuid: r,
    snapshot: s,
    initialRange: f,
    initialHistory: m,
    initialHistoryState: y
  }), Qa({
    root: e,
    hass: t,
    panelConfig: n,
    tickerSymbol: v
  }), `
    ${b.outerHTML}
    ${u}
    ${P}
    ${T}
    ${Va(f)}
    <div class="card security-detail-placeholder">
      <h2>Historie</h2>
      ${Or(f, y)}
    </div>
  `;
}
function ts(e) {
  const { setSecurityDetailTabFactory: t } = e;
  if (typeof t != "function") {
    console.error("registerSecurityDetailTab: Ungültige Factory-Funktion übergeben");
    return;
  }
  t((n) => ({
    title: "Wertpapier",
    render: (r, i, o) => es(r, i, o, n),
    cleanup: () => {
      Ta(n);
    }
  }));
}
const ns = Pi, Vt = "pp-reader-sticky-anchor", lt = "overview", Ut = "security:", rs = [
  { key: lt, title: "Dashboard", render: br }
], Fe = /* @__PURE__ */ new Map(), We = [], ut = /* @__PURE__ */ new Map();
let zt = null, Ct = !1, we = null, O = 0, Re = null;
function dt(e) {
  return typeof e == "object" && e !== null;
}
function jr(e) {
  return typeof e == "object" && e !== null && typeof e.then == "function";
}
function is(e) {
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
function os(e) {
  return e === "accounts" || e === "last_file_update" || e === "portfolio_values" || e === "portfolio_positions";
}
function In(e) {
  const t = e.portfolio_uuid;
  if (typeof t == "string" && t)
    return t;
  const n = e.portfolioUuid;
  return typeof n == "string" && n ? n : null;
}
function as(e) {
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
function ss(e, t) {
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
function cs() {
  if (!we)
    return !1;
  const e = Zr(we);
  return e || (we = null), e;
}
function oe() {
  const e = We.map((t) => Fe.get(t)).filter((t) => !!t);
  return [...rs, ...e];
}
function ls(e) {
  const t = oe();
  return e < 0 || e >= t.length ? null : t[e];
}
function Yr(e) {
  if (!e)
    return null;
  const t = e, n = t.ppreader ?? t.pp_reader;
  return n || (Object.values(t).find((i) => !i || typeof i != "object" ? !1 : i.webcomponent_name === "pp-reader-panel") ?? null);
}
function Kr() {
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
async function us(e, t, n, r) {
  const i = oe(), o = Vn(e);
  if (o === O) {
    e > O && cs();
    return;
  }
  Kr();
  const a = O >= 0 && O < i.length ? i[O] : null, s = a ? sn(a.key) : null;
  let c = o;
  if (s) {
    const l = o >= 0 && o < i.length ? i[o] : null;
    if (l && l.key === lt && hs(s, { suppressRender: !0 })) {
      const f = oe().findIndex((p) => p.key === lt);
      c = f >= 0 ? f : 0;
    }
  }
  if (!Ct) {
    Ct = !0;
    try {
      O = Vn(c);
      const l = O;
      await Jr(t, n, r), gs(l);
    } catch (l) {
      console.error("navigateToPage: Fehler beim Rendern des Tabs", l);
    } finally {
      Ct = !1;
    }
  }
}
function ft(e, t, n, r) {
  us(O + e, t, n, r);
}
function ds(e, t) {
  if (!e || !t || typeof t.render != "function") {
    console.error("registerDetailTab: Ungültiger Tab-Descriptor", e, t);
    return;
  }
  const n = sn(e);
  if (n) {
    const i = ut.get(n);
    i && i !== e && Gr(i);
  }
  const r = {
    ...t,
    key: e
  };
  Fe.set(e, r), n && ut.set(n, e), We.includes(e) || We.push(e);
}
function Gr(e) {
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
function fs(e) {
  return Fe.has(e);
}
function Un(e) {
  return Fe.get(e) ?? null;
}
function ps(e) {
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
const Cs = {
  findDashboardElement: ht
};
function gs(e) {
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
      o && typeof o.render == "function" ? (ds(t, o), n = Un(t)) : console.error("openSecurityDetail: Factory lieferte ungültigen Descriptor", o);
    } catch (o) {
      console.error("openSecurityDetail: Fehler beim Erzeugen des Tab-Descriptors", o);
    }
  if (!n)
    return console.warn(`openSecurityDetail: Kein Detail-Tab für ${e} verfügbar`), !1;
  Kr();
  let i = oe().findIndex((o) => o.key === t);
  return i === -1 && (i = oe().findIndex((a) => a.key === t), i === -1) ? (console.error("openSecurityDetail: Tab nach Registrierung nicht auffindbar"), !1) : (O = i, we = null, qt(), !0);
}
function hs(e, t = {}) {
  if (!e)
    return console.error("closeSecurityDetail: Ungültige securityUuid", e), !1;
  const { suppressRender: n = !1 } = t, r = Xr(e);
  if (!fs(r))
    return !1;
  const o = oe().findIndex((c) => c.key === r), a = o === O;
  Gr(r);
  const s = oe();
  if (!s.length)
    return O = 0, n || qt(), !0;
  if (we = e, a) {
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
  const o = ls(O);
  if (!o) {
    console.error("renderTab: Kein gültiger Tab oder keine render-Methode gefunden!");
    return;
  }
  let a;
  try {
    a = await o.render(e, t, r);
  } catch (u) {
    console.error("renderTab: Fehler beim Rendern des Tabs:", u), e.innerHTML = `<div class="card"><h2>Fehler</h2><pre>${is(u)}</pre></div>`;
    return;
  }
  e.innerHTML = a ?? "", o.render === br && tn(e);
  const c = await new Promise((u) => {
    const d = window.setInterval(() => {
      const f = e.querySelector(".header-card");
      f && (clearInterval(d), u(f));
    }, 50);
  });
  let l = e.querySelector(`#${Vt}`);
  if (!l) {
    l = document.createElement("div"), l.id = Vt;
    const u = c.parentNode;
    u && "insertBefore" in u && u.insertBefore(l, c);
  }
  ys(e, t, n), _s(e, t, n), ms(e);
}
function ms(e) {
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
function _s(e, t, n) {
  const r = e.querySelector(".header-card");
  if (!r) {
    console.error("Header-Card nicht gefunden!");
    return;
  }
  ns(
    r,
    () => {
      ft(1, e, t, n);
    },
    () => {
      ft(-1, e, t, n);
    }
  );
}
function ys(e, t, n) {
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
  }), bs(r);
}
function bs(e) {
  const t = e.querySelector("#nav-left"), n = e.querySelector("#nav-right");
  if (t && (O === 0 ? (t.disabled = !0, t.classList.add("disabled")) : (t.disabled = !1, t.classList.remove("disabled"))), n) {
    const r = oe(), o = !(O === r.length - 1) || !!we;
    n.disabled = !o, n.classList.toggle("disabled", !o);
  }
}
class vs extends HTMLElement {
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
    if (!os(i.data_type) || i.entry_id && i.entry_id !== r)
      return;
    const o = ss(i.data_type, i.data);
    o && (this._queueUpdate(o.type, o.data), this._doRender(o.type, o.data));
  }
  _doRender(n, r) {
    switch (n) {
      case "accounts":
        Do(
          r,
          this._root
        );
        break;
      case "last_file_update":
        Vo(
          r,
          this._root
        );
        break;
      case "portfolio_values":
        Ro(
          r,
          this._root
        );
        break;
      case "portfolio_positions":
        Mo(
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
    n === "portfolio_positions" && (o.portfolioUuid = as(
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
customElements.get("pp-reader-dashboard") || customElements.define("pp-reader-dashboard", vs);
console.log("PPReader dashboard module v20250914b geladen");
ts({
  setSecurityDetailTabFactory: ps
});
export {
  Cs as __TEST_ONLY_DASHBOARD,
  Fs as __TEST_ONLY__,
  hs as closeSecurityDetail,
  en as flushPendingPositions,
  Un as getDetailTabDescriptor,
  Mo as handlePortfolioPositionsUpdate,
  fs as hasDetailTab,
  Zr as openSecurityDetail,
  Es as reapplyPositionsSort,
  Ps as registerDashboardElement,
  ds as registerDetailTab,
  ws as registerPanelHost,
  ps as setSecurityDetailTabFactory,
  As as unregisterDashboardElement,
  Gr as unregisterDetailTab,
  Ns as unregisterPanelHost,
  yr as updatePortfolioFooterFromDom
};
//# sourceMappingURL=dashboard.BhX59eRa.js.map
