var _i = Object.defineProperty;
var yi = (e, t, n) => t in e ? _i(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : e[t] = n;
var G = (e, t, n) => yi(e, typeof t != "symbol" ? t + "" : t, n);
function fn(e, t) {
  try {
    t();
  } catch (n) {
    console.warn(`addSwipeEvents: ${e} handler threw`, n);
  }
}
function bi(e, t, n) {
  let r = null;
  const i = (l) => {
    l < -50 ? fn("left", t) : l > 50 && fn("right", n);
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
const jt = (e, t) => {
  if (!Number.isFinite(e) || e === 0)
    return "neutral";
  const n = 0.5 / Math.pow(10, t);
  return Math.abs(e) < n ? "neutral" : e > 0 ? "positive" : "negative";
};
function M(e, t, n = void 0, r = void 0) {
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
    const f = typeof c == "number" ? c : o(c);
    return Number.isFinite(f) ? f.toLocaleString("de-DE", {
      minimumFractionDigits: l,
      maximumFractionDigits: u
    }) : "";
  }, s = (c = "") => {
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
      return s(c);
    const l = typeof t == "number" ? t : o(t);
    if (!Number.isFinite(l))
      return s(c);
    const u = e.endsWith("pct") ? "%" : "€";
    return i = a(l) + `&nbsp;${u}`, `<span class="${jt(l, 2)}">${i}</span>`;
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
function Se(e, t, n = [], r = {}) {
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
      l += `<td${b}>${M(_.key, h[_.key], h)}</td>`;
    }), l += "</tr>";
  });
  const u = {}, f = {};
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
                const R = h.key === "day_change_pct" ? A.change_pct : A.value_change_eur ?? A.price_change_eur;
                typeof R == "number" && (P = R);
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
  if (p != null && (m = `${se(p)} %`, p > 0 ? y = "positive" : p < 0 && (y = "negative")), l += '<tr class="footer-row">', t.forEach((h, _) => {
    const b = h.align === "right" ? ' class="align-right"' : "";
    if (_ === 0) {
      l += `<td${b}>Summe</td>`;
      return;
    }
    if (u[h.key] != null) {
      let P = "";
      h.key === "gain_abs" && m && (P = ` data-gain-pct="${c(m)}" data-gain-sign="${c(y)}"`), l += `<td${b}${P}>${M(h.key, u[h.key], void 0, f[h.key])}</td>`;
      return;
    }
    if (h.key === "gain_pct" && u.gain_pct != null) {
      l += `<td${b}>${M("gain_pct", u.gain_pct, void 0, f[h.key])}</td>`;
      return;
    }
    const S = f[h.key] ?? { hasValue: !1 };
    l += `<td${b}>${M(h.key, null, void 0, S)}</td>`;
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
function Tt(e, t) {
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
function se(e, t = 2, n = 2) {
  return (Number.isNaN(e) ? 0 : e).toLocaleString("de-DE", {
    minimumFractionDigits: t,
    maximumFractionDigits: n
  });
}
function vi(e) {
  const t = Number.isNaN(e) ? 0 : e;
  return `<span class="${jt(t, 2)}">${se(t)}&nbsp;€</span>`;
}
function Si(e) {
  const t = Number.isNaN(e) ? 0 : e;
  return `<span class="${jt(t, 2)}">${se(t)}&nbsp;%</span>`;
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
    const u = Array.from(e.querySelectorAll("thead th"));
    for (let f = 0; f < u.length; f++)
      if (u[f].getAttribute("data-sort-key") === t) {
        s = f;
        break;
      }
  }
  if (s < 0)
    return a;
  const c = (u) => {
    const f = u.replace(/\u00A0/g, " ").replace(/[%€]/g, "").replace(/\./g, "").replace(/,/g, ".").replace(/[^\d.-]/g, "").trim();
    if (!f) return NaN;
    const d = parseFloat(f);
    return Number.isFinite(d) ? d : NaN;
  };
  a.sort((u, f) => {
    const d = u.cells.item(s), g = f.cells.item(s), p = ((d == null ? void 0 : d.textContent) ?? "").trim(), m = ((g == null ? void 0 : g.textContent) ?? "").trim(), y = c(p), h = c(m);
    let _;
    const b = /[0-9]/.test(p) || /[0-9]/.test(m);
    return !Number.isNaN(y) && !Number.isNaN(h) && b ? _ = y - h : _ = p.localeCompare(m, "de", { sensitivity: "base" }), n === "asc" ? _ : -_;
  }), a.forEach((u) => i.appendChild(u)), o && i.appendChild(o), e.querySelectorAll("thead th.sort-active").forEach((u) => {
    u.classList.remove("sort-active", "dir-asc", "dir-desc");
  });
  const l = e.querySelector(`thead th[data-sort-key="${t}"]`);
  return l && l.classList.add("sort-active", n === "asc" ? "dir-asc" : "dir-desc"), a;
}
function ce(e) {
  return typeof e == "object" && e !== null;
}
function j(e) {
  return typeof e == "string" ? e : null;
}
function Oe(e) {
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
function gn(e) {
  const t = V(e);
  if (t == null)
    return null;
  const n = Math.trunc(t);
  return Number.isFinite(n) ? n : null;
}
function Ye(e) {
  return ce(e) ? { ...e } : null;
}
function qn(e) {
  return ce(e) ? { ...e } : null;
}
function On(e) {
  return typeof e == "boolean" ? e : void 0;
}
function Pi(e) {
  if (!ce(e))
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
  const f = Oe(e.metric_run_uuid);
  f !== null && (o.metric_run_uuid = f);
  const d = On(e.fx_unavailable);
  return typeof d == "boolean" && (o.fx_unavailable = d), o;
}
function Bn(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = Pi(n);
    r && t.push(r);
  }
  return t;
}
function Ai(e) {
  if (!ce(e))
    return null;
  const t = e.aggregation, n = j(e.security_uuid), r = j(e.name), i = V(e.current_holdings), o = V(e.purchase_value_eur) ?? (ce(t) ? V(t.purchase_value_eur) ?? V(t.purchase_total_account) ?? V(t.account_currency_total) : null) ?? V(e.purchase_value), a = V(e.current_value);
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
    average_cost: Ye(e.average_cost),
    performance: Ye(e.performance),
    aggregation: Ye(e.aggregation),
    data_state: qn(e.data_state)
  }, c = V(e.coverage_ratio);
  c != null && (s.coverage_ratio = c);
  const l = j(e.provenance);
  l && (s.provenance = l);
  const u = Oe(e.metric_run_uuid);
  u !== null && (s.metric_run_uuid = u);
  const f = V(e.last_price_native);
  f != null && (s.last_price_native = f);
  const d = V(e.last_price_eur);
  d != null && (s.last_price_eur = d);
  const g = V(e.last_close_native);
  g != null && (s.last_close_native = g);
  const p = V(e.last_close_eur);
  return p != null && (s.last_close_eur = p), s;
}
function Wn(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = Ai(n);
    r && t.push(r);
  }
  return t;
}
function jn(e) {
  if (!ce(e))
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
    position_count: gn(e.position_count ?? e.count) ?? void 0,
    missing_value_positions: gn(e.missing_value_positions) ?? void 0,
    has_current_value: On(e.has_current_value),
    performance: Ye(e.performance),
    coverage_ratio: V(e.coverage_ratio) ?? void 0,
    provenance: j(e.provenance) ?? void 0,
    metric_run_uuid: Oe(e.metric_run_uuid) ?? void 0,
    data_state: qn(e.data_state)
  };
  return Array.isArray(e.positions) && (o.positions = Wn(e.positions)), o;
}
function Kn(e) {
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
  if (!ce(e))
    return null;
  const t = { ...e }, n = Oe(e.metric_run_uuid);
  n !== null ? t.metric_run_uuid = n : delete t.metric_run_uuid;
  const r = V(e.coverage_ratio);
  r != null ? t.coverage_ratio = r : delete t.coverage_ratio;
  const i = j(e.provenance);
  i ? t.provenance = i : delete t.provenance;
  const o = j(e.generated_at ?? e.snapshot_generated_at);
  return o ? t.generated_at = o : delete t.generated_at, t;
}
function Ni(e) {
  if (!ce(e))
    return null;
  const t = { ...e }, n = Gn(e.normalized_payload);
  return n ? t.normalized_payload = n : "normalized_payload" in t && delete t.normalized_payload, t;
}
function Yn(e) {
  if (!ce(e))
    return null;
  const t = j(e.generated_at);
  if (!t)
    return null;
  const n = Oe(e.metric_run_uuid), r = Bn(e.accounts), i = Kn(e.portfolios), o = Ni(e.diagnostics), a = {
    generated_at: t,
    metric_run_uuid: n,
    accounts: r,
    portfolios: i
  };
  return o && (a.diagnostics = o), a;
}
function pn(e) {
  return typeof e == "string" ? e : null;
}
function wi(e) {
  if (typeof e == "string")
    return e;
  if (e === null)
    return null;
}
function Ei(e) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
}
function hn(e, t) {
  if (typeof e == "string")
    return e;
  throw new Error(`mapPositionSnapshotToRecord: fehlendes ${t}`);
}
function bt(e, t) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  throw new Error(`mapPositionSnapshotToRecord: fehlendes ${t}`);
}
function Fi(e) {
  const t = hn(e.security_uuid, "security_uuid"), n = hn(e.name, "name"), r = bt(e.current_holdings, "current_holdings"), i = bt(e.purchase_value, "purchase_value"), o = bt(e.current_value, "current_value"), a = {
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
function pe(e, t) {
  var r, i, o, a, s, c, l, u;
  let n = ((r = t == null ? void 0 : t.config) == null ? void 0 : r.entry_id) ?? (t == null ? void 0 : t.entry_id) ?? ((a = (o = (i = t == null ? void 0 : t.config) == null ? void 0 : i._panel_custom) == null ? void 0 : o.config) == null ? void 0 : a.entry_id) ?? void 0;
  if (!n && (e != null && e.panels)) {
    const f = e.panels, d = f.ppreader ?? f.pp_reader ?? Object.values(f).find(
      (g) => (g == null ? void 0 : g.webcomponent_name) === "pp-reader-panel"
    );
    n = ((s = d == null ? void 0 : d.config) == null ? void 0 : s.entry_id) ?? (d == null ? void 0 : d.entry_id) ?? ((u = (l = (c = d == null ? void 0 : d.config) == null ? void 0 : c._panel_custom) == null ? void 0 : l.config) == null ? void 0 : u.entry_id) ?? void 0;
  }
  return n ?? void 0;
}
function mn(e, t) {
  return pe(e, t);
}
async function Ci(e, t) {
  if (!e)
    throw new Error("fetchAccountsWS: fehlendes hass");
  const n = pe(e, t);
  if (!n)
    throw new Error("fetchAccountsWS: fehlendes entry_id");
  const r = await e.connection.sendMessagePromise({
    type: "pp_reader/get_accounts",
    entry_id: n
  }), i = Bn(r.accounts), o = Yn(r.normalized_payload);
  return {
    accounts: i,
    normalized_payload: o
  };
}
async function xi(e, t) {
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
async function Di(e, t) {
  if (!e)
    throw new Error("fetchPortfoliosWS: fehlendes hass");
  const n = pe(e, t);
  if (!n)
    throw new Error("fetchPortfoliosWS: fehlendes entry_id");
  const r = await e.connection.sendMessagePromise({
    type: "pp_reader/get_portfolio_data",
    entry_id: n
  }), i = Kn(r.portfolios), o = Yn(r.normalized_payload);
  return {
    portfolios: i,
    normalized_payload: o
  };
}
async function Xn(e, t, n) {
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
  }), a = Wn(i.positions).map(Fi), s = Gn(i.normalized_payload), c = {
    portfolio_uuid: pn(i.portfolio_uuid) ?? n,
    positions: a
  };
  typeof i.error == "string" && (c.error = i.error);
  const l = Ei(i.coverage_ratio);
  l !== void 0 && (c.coverage_ratio = l);
  const u = pn(i.provenance);
  u && (c.provenance = u);
  const f = wi(i.metric_run_uuid);
  return f !== void 0 && (c.metric_run_uuid = f), s && (c.normalized_payload = s), c;
}
async function ki(e, t, n) {
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
async function Ti(e, t) {
  if (!e)
    throw new Error("fetchNewsPromptWS: fehlendes hass");
  const n = pe(e, t);
  if (!n)
    throw new Error("fetchNewsPromptWS: fehlendes entry_id");
  return e.connection.sendMessagePromise({
    type: "pp_reader/get_news_prompt",
    entry_id: n
  });
}
async function et(e, t, n, r = {}) {
  if (!e)
    throw new Error("fetchSecurityHistoryWS: fehlendes hass");
  const i = pe(e, t);
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
  const f = s ?? l;
  f != null && (o.end_date = f);
  const d = await e.connection.sendMessagePromise(o);
  return Array.isArray(d.prices) || (d.prices = []), Array.isArray(d.transactions) || (d.transactions = []), d;
}
const Kt = /* @__PURE__ */ new Set(), Gt = /* @__PURE__ */ new Set(), Zn = {}, $i = [
  "renderPositionsTable",
  "applyGainPctMetadata",
  "attachSecurityDetailListener",
  "attachPortfolioPositionsSorting",
  "updatePortfolioFooter"
];
function Ri(e, t) {
  typeof t == "function" && (Zn[e] = t);
}
function ys(e) {
  e && Kt.add(e);
}
function bs(e) {
  e && Kt.delete(e);
}
function Li() {
  return Kt;
}
function vs(e) {
  e && Gt.add(e);
}
function Ss(e) {
  e && Gt.delete(e);
}
function Mi() {
  return Gt;
}
function Hi(e) {
  for (const t of $i)
    Ri(t, e[t]);
}
function Yt() {
  return Zn;
}
const Ii = 2;
function oe(e) {
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
        const d = s.split(","), g = ((t = d[d.length - 1]) == null ? void 0 : t.length) ?? 0, p = d.slice(0, -1).join(""), m = p.replace(/[+-]/g, "").length, y = d.length > 2, h = /^[-+]?0$/.test(p);
        s = y || g === 0 || g === 3 && m > 0 && m <= 3 && !h ? s.replace(/,/g, "") : s.replace(",", ".");
      }
    else l && c && a > o ? s = s.replace(/,/g, "") : l && s.length - a - 1 === 3 && /\d{4,}/.test(s.replace(/\./g, "")) && (s = s.replace(/\./g, ""));
    if (s === "-" || s === "+")
      return null;
    const u = Number.parseFloat(s);
    if (Number.isFinite(u))
      return u;
    const f = Number.parseFloat(i.replace(",", "."));
    if (Number.isFinite(f))
      return f;
  }
  return null;
}
function ht(e, { decimals: t = Ii, fallback: n = null } = {}) {
  const r = oe(e);
  if (r == null)
    return n ?? null;
  const i = 10 ** t, o = Math.round(r * i) / i;
  return Object.is(o, -0) ? 0 : o;
}
function _n(e, t = {}) {
  return ht(e, t);
}
function Vi(e, t = {}) {
  return ht(e, t);
}
const Ui = /^[+-]?(?:\d+\.?\d*|\d*\.?\d+)(?:[eE][+-]?\d+)?$/, ne = (e) => {
  if (typeof e == "number")
    return Number.isFinite(e) ? e : null;
  if (typeof e == "string") {
    const t = e.trim();
    if (!t || !Ui.test(t))
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
function zi(e) {
  const t = e && typeof e == "object" ? e : null;
  if (!t)
    return null;
  const n = ne(t.price_change_native), r = ne(t.price_change_eur), i = ne(t.change_pct), o = ne(t.value_change_eur);
  if (n == null && r == null && i == null && o == null)
    return null;
  const a = Jn(t.source) ?? "derived", s = ne(t.coverage_ratio) ?? null;
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
  const n = ne(t.gain_abs), r = ne(t.gain_pct), i = ne(t.total_change_eur), o = ne(t.total_change_pct);
  if (n == null || r == null || i == null || o == null)
    return null;
  const a = Jn(t.source) ?? "derived", s = ne(t.coverage_ratio) ?? null, c = zi(t.day_change);
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
const ue = /* @__PURE__ */ new Map();
function le(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t.length > 0 ? t : null;
}
function z(e) {
  if (e === null)
    return null;
  const t = oe(e);
  return Number.isFinite(t ?? NaN) ? t : null;
}
function qi(e) {
  if (!e || typeof e != "object")
    return !1;
  const t = e;
  return typeof t.security_uuid == "string" && typeof t.name == "string" && typeof t.current_holdings == "number" && typeof t.purchase_value == "number" && typeof t.current_value == "number";
}
function Be(e) {
  const t = { ...e };
  return e.average_cost && typeof e.average_cost == "object" && (t.average_cost = { ...e.average_cost }), e.performance && typeof e.performance == "object" && (t.performance = { ...e.performance }), e.aggregation && typeof e.aggregation == "object" && (t.aggregation = { ...e.aggregation }), e.data_state && typeof e.data_state == "object" && (t.data_state = { ...e.data_state }), t;
}
function Oi(e, t) {
  const n = e ? Be(e) : {}, r = [
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
function Xt(e, t) {
  if (!e)
    return;
  if (!Array.isArray(t)) {
    ue.delete(e);
    return;
  }
  if (t.length === 0) {
    ue.set(e, []);
    return;
  }
  const n = ue.get(e) ?? [], r = new Map(
    n.filter((o) => o.security_uuid).map((o) => [o.security_uuid, o])
  ), i = t.filter((o) => !!o).map((o) => {
    const a = o.security_uuid ?? "", s = a ? r.get(a) : void 0;
    return Oi(s, o);
  }).map(Be);
  ue.set(e, i);
}
function Zt(e) {
  return e ? ue.has(e) : !1;
}
function Qn(e) {
  if (!e)
    return [];
  const t = ue.get(e);
  return t ? t.map(Be) : [];
}
function Bi() {
  ue.clear();
}
function Wi() {
  return new Map(
    Array.from(ue.entries(), ([e, t]) => [
      e,
      t.map(Be)
    ])
  );
}
function We(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e, n = z(t.native), r = z(t.security), i = z(t.account), o = z(t.eur), a = z(t.coverage_ratio);
  if (n == null && r == null && i == null && o == null && a == null)
    return null;
  const s = le(t.source);
  return {
    native: n,
    security: r,
    account: i,
    eur: o,
    source: s === "totals" || s === "eur_total" ? s : "aggregation",
    coverage_ratio: a
  };
}
function er(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e, n = z(t.total_holdings), r = z(t.positive_holdings), i = z(t.purchase_value_eur), o = z(t.purchase_total_security) ?? z(t.security_currency_total), a = z(t.purchase_total_account) ?? z(t.account_currency_total);
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
function ji(e) {
  if (!e || typeof e != "object")
    return null;
  const t = qi(e) ? Be(e) : e, n = le(t.security_uuid), r = le(t.name), i = oe(t.current_holdings), o = _n(t.current_value), a = er(t.aggregation), s = t.aggregation && typeof t.aggregation == "object" ? t.aggregation : null, c = z(t.purchase_value_eur) ?? z(s == null ? void 0 : s.purchase_value_eur) ?? z(s == null ? void 0 : s.purchase_total_account) ?? z(s == null ? void 0 : s.account_currency_total) ?? _n(t.purchase_value);
  if (!n || !r || i == null || c == null || o == null)
    return null;
  const l = {
    security_uuid: n,
    name: r,
    portfolio_uuid: le(t.portfolio_uuid) ?? le(t.portfolioUuid) ?? void 0,
    currency_code: le(t.currency_code),
    current_holdings: i,
    purchase_value: c,
    current_value: o
  }, u = We(t.average_cost);
  u && (l.average_cost = u), a && (l.aggregation = a);
  const f = ge(t.performance);
  if (f)
    l.performance = f, l.gain_abs = typeof f.gain_abs == "number" ? f.gain_abs : null, l.gain_pct = typeof f.gain_pct == "number" ? f.gain_pct : null;
  else {
    const b = z(t.gain_abs), S = z(t.gain_pct);
    b !== null && (l.gain_abs = b), S !== null && (l.gain_pct = S);
  }
  "coverage_ratio" in t && (l.coverage_ratio = z(t.coverage_ratio));
  const d = le(t.provenance);
  d && (l.provenance = d);
  const g = le(t.metric_run_uuid);
  (g || t.metric_run_uuid === null) && (l.metric_run_uuid = g ?? null);
  const p = z(t.last_price_native);
  p !== null && (l.last_price_native = p);
  const m = z(t.last_price_eur);
  m !== null && (l.last_price_eur = m);
  const y = z(t.last_close_native);
  y !== null && (l.last_close_native = y);
  const h = z(t.last_close_eur);
  h !== null && (l.last_close_eur = h);
  const _ = t.data_state && typeof t.data_state == "object" ? { ...t.data_state } : void 0;
  return _ && (l.data_state = _), l;
}
function mt(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = ji(n);
    r && t.push(r);
  }
  return t;
}
let tr = [];
const de = /* @__PURE__ */ new Map();
function Xe(e) {
  return typeof e == "string" && e.length > 0 ? e : void 0;
}
function Ki(e) {
  return e === null ? null : Xe(e);
}
function Gi(e) {
  return typeof e == "number" && Number.isFinite(e) ? e : void 0;
}
function me(e) {
  return e === null ? null : Gi(e);
}
function yn(e) {
  if (!(typeof e != "number" || !Number.isFinite(e)))
    return Math.trunc(e);
}
function re(e) {
  if (!(!e || typeof e != "object"))
    return { ...e };
}
function Me(e) {
  const t = { ...e };
  return t.average_cost = re(e.average_cost), t.performance = re(e.performance), t.aggregation = re(e.aggregation), t.data_state = re(e.data_state), t;
}
function Jt(e) {
  const t = { ...e };
  return t.performance = re(e.performance), t.data_state = re(e.data_state), Array.isArray(e.positions) && (t.positions = e.positions.map(Me)), t;
}
function nr(e) {
  if (!e || typeof e != "object")
    return null;
  const t = Xe(e.uuid);
  if (!t)
    return null;
  const n = { uuid: t }, r = Xe(e.name);
  r && (n.name = r);
  const i = me(e.current_value);
  i !== void 0 && (n.current_value = i);
  const o = me(e.purchase_sum) ?? me(e.purchase_value_eur) ?? me(e.purchase_value);
  o !== void 0 && (n.purchase_value = o, n.purchase_sum = o);
  const a = me(e.day_change_abs);
  a !== void 0 && (n.day_change_abs = a);
  const s = me(e.day_change_pct);
  s !== void 0 && (n.day_change_pct = s);
  const c = yn(e.position_count);
  c !== void 0 && (n.position_count = c);
  const l = yn(e.missing_value_positions);
  l !== void 0 && (n.missing_value_positions = l), typeof e.has_current_value == "boolean" && (n.has_current_value = e.has_current_value);
  const u = me(e.coverage_ratio);
  u !== void 0 && (n.coverage_ratio = u);
  const f = Xe(e.provenance);
  f && (n.provenance = f), "metric_run_uuid" in e && (n.metric_run_uuid = Ki(e.metric_run_uuid));
  const d = re(e.performance);
  d && (n.performance = d);
  const g = re(e.data_state);
  if (g && (n.data_state = g), Array.isArray(e.positions)) {
    const p = e.positions.filter(
      (m) => !!m
    );
    p.length && (n.positions = p.map(Me));
  }
  return n;
}
function Yi(e, t) {
  const n = {
    ...e,
    ...t
  };
  return !t.performance && e.performance && (n.performance = re(e.performance)), !t.data_state && e.data_state && (n.data_state = re(e.data_state)), !t.positions && e.positions && (n.positions = e.positions.map(Me)), n;
}
function rr(e) {
  tr = (e ?? []).map((n) => ({ ...n }));
}
function Xi() {
  return tr.map((e) => ({ ...e }));
}
function Zi(e) {
  de.clear();
  const t = e ?? [];
  for (const n of t) {
    const r = nr(n);
    r && de.set(r.uuid, Jt(r));
  }
}
function Ji(e) {
  const t = e ?? [];
  for (const n of t) {
    const r = nr(n);
    if (!r)
      continue;
    const i = de.get(r.uuid), o = i ? Yi(i, r) : Jt(r);
    de.set(o.uuid, o);
  }
}
function Qt(e, t) {
  if (!e)
    return;
  const n = de.get(e);
  if (!n)
    return;
  if (!Array.isArray(t) || t.length === 0) {
    const c = { ...n };
    delete c.positions, de.set(e, c);
    return;
  }
  const r = (c, l) => {
    const u = c ? Me(c) : {}, f = u;
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
  ), a = t.filter((c) => !!c).map((c) => {
    const l = c.security_uuid ? o.get(c.security_uuid) : void 0;
    return r(l, c);
  }).map(Me), s = {
    ...n,
    positions: a
  };
  de.set(e, s);
}
function Qi() {
  return Array.from(de.values(), (e) => Jt(e));
}
function ir() {
  return {
    accounts: Xi(),
    portfolios: Qi()
  };
}
const eo = "unknown-account";
function Y(e) {
  return typeof e != "number" || !Number.isFinite(e) ? null : e;
}
function bn(e) {
  const t = Y(e);
  return t == null ? 0 : Math.trunc(t);
}
function Q(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t.length > 0 ? t : null;
}
function or(e, t) {
  return Q(e) ?? t;
}
function en(e) {
  return e == null || !Number.isFinite(e) ? null : e < 0 ? 0 : e > 1 ? 1 : e;
}
function to(e) {
  const t = Math.abs(e % 1) > 0.01;
  return e.toLocaleString("de-DE", {
    minimumFractionDigits: t ? 1 : 0,
    maximumFractionDigits: 1
  });
}
function ar(e, t) {
  const n = en(e);
  if (n == null)
    return null;
  const r = Math.round(n * 1e3) / 10;
  let i = "info";
  n < 0.5 ? i = "danger" : n < 0.9 && (i = "warning");
  const o = t === "account" ? "FX-Abdeckung" : "Abdeckung", a = t === "account" ? "Anteil der verfügbaren FX-Daten für diese Kontoumrechnung." : "Anteil der verfügbaren Kennzahlen für dieses Depot.";
  return {
    key: `${t}-coverage`,
    label: `${o} ${to(r)}%`,
    tone: i,
    description: a
  };
}
function sr(e) {
  return e.split(/[\s_-]+/).filter(Boolean).map(
    (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
  ).join(" ");
}
function cr(e) {
  const t = no(e);
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
function no(e) {
  const t = Q(e);
  if (!t)
    return null;
  const n = ro(t);
  return n || sr(t);
}
function ro(e) {
  const t = e.trim();
  if (!t.startsWith("{") && !t.startsWith("["))
    return null;
  try {
    const n = JSON.parse(t), r = io(n), i = n && typeof n == "object" ? Q(
      n.provider ?? n.source
    ) : null;
    if (r.length && i)
      return `${sr(i)} (${r.join(", ")})`;
    if (r.length)
      return `FX (${r.join(", ")})`;
  } catch {
    return null;
  }
  return null;
}
function io(e) {
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
function oo(e) {
  if (!e)
    return null;
  const t = Q(e.uuid) ?? `${eo}-${e.name ?? "0"}`, n = or(e.name, "Unbenanntes Konto"), r = Q(e.currency_code), i = Y(e.balance), o = Y(e.orig_balance), a = "coverage_ratio" in e ? en(Y(e.coverage_ratio)) : null, s = Q(e.provenance), c = Q(e.metric_run_uuid), l = e.fx_unavailable === !0, u = Y(e.fx_rate), f = Q(e.fx_rate_source), d = Q(e.fx_rate_timestamp), g = [], p = ar(a, "account");
  p && g.push(p);
  const m = cr(s);
  m && g.push(m);
  const y = {
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
    fx_rate_source: f,
    fx_rate_timestamp: d,
    badges: g
  }, h = typeof c == "string" ? c : null;
  return y.metric_run_uuid = h, y;
}
function ao(e) {
  if (!e)
    return null;
  const t = Q(e.uuid);
  if (!t)
    return null;
  const n = or(e.name, "Unbenanntes Depot"), r = bn(e.position_count), i = bn(e.missing_value_positions), o = Y(e.current_value), a = Y(e.purchase_sum) ?? Y(e.purchase_value_eur) ?? Y(e.purchase_value) ?? 0, s = Y(e.day_change_abs) ?? null, c = Y(e.day_change_pct) ?? null, l = ge(e.performance), u = (l == null ? void 0 : l.gain_abs) ?? null, f = (l == null ? void 0 : l.gain_pct) ?? null, d = (l == null ? void 0 : l.day_change) ?? null;
  let g = s ?? ((d == null ? void 0 : d.value_change_eur) != null ? Y(d.value_change_eur) : null), p = c ?? ((d == null ? void 0 : d.change_pct) != null ? Y(d.change_pct) : null);
  if (g == null && p != null && o != null) {
    const x = o / (1 + p / 100);
    x && (g = o - x);
  }
  if (p == null && g != null && o != null) {
    const x = o - g;
    x && (p = g / x * 100);
  }
  const m = o != null, y = e.has_current_value === !1 || !m, h = "coverage_ratio" in e ? en(Y(e.coverage_ratio)) : null, _ = Q(e.provenance), b = Q(e.metric_run_uuid), S = [], P = ar(h, "portfolio");
  P && S.push(P);
  const N = cr(_);
  N && S.push(N);
  const A = {
    uuid: t,
    name: n,
    position_count: r,
    current_value: o,
    purchase_sum: a,
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
  }, R = typeof b == "string" ? b : null;
  return A.metric_run_uuid = R, A;
}
function lr() {
  const { accounts: e } = ir();
  return e.map(oo).filter((t) => !!t);
}
function so() {
  const { portfolios: e } = ir();
  return e.map(ao).filter((t) => !!t);
}
function He(e) {
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
function ur(e, t = {}) {
  if (!e || e.length === 0)
    return "";
  const n = ["meta-badges", t.containerClass].filter(Boolean).join(" "), r = e.map((i) => {
    const o = `meta-badge--${i.tone}`, a = i.description ? ` title="${He(i.description)}"` : "";
    return `<span class="meta-badge ${o}"${a}>${He(
      i.label
    )}</span>`;
  }).join("");
  return `<span class="${n}">${r}</span>`;
}
function tt(e, t, n = {}) {
  const r = ur(t, n);
  if (!r)
    return He(e);
  const i = n.labelClass ?? "name-with-badges__label";
  return `<span class="${["name-with-badges", n.containerClass].filter(Boolean).join(" ")}"><span class="${i}">${He(
    e
  )}</span>${r}</span>`;
}
function dr(e, t, n, r) {
  e[t] = {
    previous: n,
    current: r
  };
}
const ae = /* @__PURE__ */ new Map(), Ze = /* @__PURE__ */ new Map();
function co(e) {
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
function Ne(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t.length > 0 ? t : null;
}
function lo(e) {
  return typeof e == "number" && Number.isFinite(e) ? e : void 0;
}
function uo(e) {
  return e === null ? null : lo(e);
}
function fo(e) {
  return e === null ? null : Ne(e);
}
function vn(e) {
  return ge(e.performance);
}
const go = 500, po = 10, ho = "pp-reader:portfolio-positions-updated", mo = "pp-reader:diagnostics", vt = /* @__PURE__ */ new Map(), fr = [
  "coverage_ratio",
  "provenance",
  "metric_run_uuid",
  "generated_at"
], $t = /* @__PURE__ */ new Map();
function _o(e, t) {
  return `${e}:${t}`;
}
function yo(e) {
  if (e === void 0)
    return;
  if (e === null)
    return null;
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  const t = uo(e);
  if (t === null)
    return null;
  if (typeof t == "number" && Number.isFinite(t))
    return t;
}
function St(e) {
  if (e !== void 0)
    return fo(e);
}
function tn(e, t, n, r) {
  const i = {}, o = yo(e);
  o !== void 0 && (i.coverage_ratio = o);
  const a = St(t);
  a !== void 0 && (i.provenance = a);
  const s = St(n);
  s !== void 0 && (i.metric_run_uuid = s);
  const c = St(r);
  return c !== void 0 && (i.generated_at = c), Object.keys(i).length > 0 ? i : null;
}
function bo(e, t) {
  const n = {};
  let r = !1;
  for (const i of fr) {
    const o = e == null ? void 0 : e[i], a = t[i];
    o !== a && (dr(n, i, o, a), r = !0);
  }
  return r ? n : null;
}
function vo(e) {
  const t = {};
  let n = !1;
  for (const r of fr) {
    const i = e[r];
    i !== void 0 && (dr(t, r, i, void 0), n = !0);
  }
  return n ? t : null;
}
function Sn(e) {
  if (Object.keys(e.changed).length) {
    try {
      console.debug("pp-reader:diagnostics", e);
    } catch {
    }
    if (!(typeof window > "u" || typeof window.dispatchEvent != "function"))
      try {
        window.dispatchEvent(new CustomEvent(mo, { detail: e }));
      } catch (t) {
        console.warn("updateConfigsWS: Diagnostics-Event konnte nicht gesendet werden", t);
      }
  }
}
function nn(e, t, n, r) {
  const i = _o(e, n), o = vt.get(i);
  if (!r) {
    if (!o)
      return;
    vt.delete(i);
    const s = vo(o);
    if (!s)
      return;
    Sn({
      kind: e,
      uuid: n,
      source: t,
      changed: s,
      snapshot: {},
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    return;
  }
  const a = bo(o, r);
  a && (vt.set(i, { ...r }), Sn({
    kind: e,
    uuid: n,
    source: t,
    changed: a,
    snapshot: { ...r },
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  }));
}
function So(e) {
  if (!(!e || e.length === 0))
    for (const t of e) {
      const n = Ne(t.uuid);
      if (!n)
        continue;
      const r = tn(
        t.coverage_ratio,
        t.provenance,
        t.metric_run_uuid,
        void 0
      );
      nn("account", "accounts", n, r);
    }
}
function Po(e) {
  if (!(!e || e.length === 0))
    for (const t of e) {
      const n = Ne(t.uuid);
      if (!n)
        continue;
      const r = tn(
        t.coverage_ratio,
        t.provenance,
        t.metric_run_uuid,
        void 0
      );
      nn("portfolio", "portfolio_values", n, r);
    }
}
function Ao(e, t) {
  var r, i, o, a;
  if (!t)
    return;
  const n = tn(
    t.coverage_ratio ?? ((r = t.normalized_payload) == null ? void 0 : r.coverage_ratio),
    t.provenance ?? ((i = t.normalized_payload) == null ? void 0 : i.provenance),
    t.metric_run_uuid ?? ((o = t.normalized_payload) == null ? void 0 : o.metric_run_uuid),
    (a = t.normalized_payload) == null ? void 0 : a.generated_at
  );
  nn("portfolio_positions", "portfolio_positions", e, n);
}
function No(e, t) {
  return `<div class="error">${co(e)} <button class="retry-pos" data-portfolio="${t}">Erneut laden</button></div>`;
}
function wo(e, t, n) {
  const r = e.querySelector("table.sortable-positions");
  if (!r) return;
  const i = e.dataset.sortKey || r.dataset.defaultSort || "name", a = (e.dataset.sortDir || r.dataset.defaultDir || "asc") === "desc" ? "desc" : "asc";
  e.dataset.sortKey = i, e.dataset.sortDir = a;
  try {
    zn(r, i, a, !0);
  } catch (l) {
    console.warn("restoreSortAndInit: sortTableRows Fehler:", l);
  }
  const { attachPortfolioPositionsSorting: s, attachSecurityDetailListener: c } = Yt();
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
function gr(e, t, n, r) {
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
    return o.innerHTML = No(r, t), { applied: !0 };
  const a = o.dataset.sortKey, s = o.dataset.sortDir;
  return o.innerHTML = Ro(n), a && (o.dataset.sortKey = a), s && (o.dataset.sortDir = s), wo(o, e, t), { applied: !0 };
}
function rn(e, t) {
  const n = ae.get(t);
  if (!n) return !1;
  const r = gr(
    e,
    t,
    n.positions,
    n.error
  );
  return r.applied && ae.delete(t), r.applied;
}
function Eo(e) {
  let t = !1;
  for (const [n] of ae)
    rn(e, n) && (t = !0);
  return t;
}
function pr(e, t) {
  const n = Ze.get(t) ?? {
    attempts: 0,
    timer: null
  };
  n.timer || (n.timer = setTimeout(() => {
    n.timer = null, n.attempts += 1;
    const r = rn(e, t);
    r || n.attempts >= po ? (Ze.delete(t), r || ae.delete(t)) : pr(e, t);
  }, go), Ze.set(t, n));
}
function Fo(e, t) {
  console.log("updateConfigsWS: Kontodaten-Update erhalten:", e);
  const n = Array.isArray(e) ? e : [];
  if (rr(n), So(n), !t)
    return;
  const r = lr();
  Co(r, t);
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
  hr(r, o, t);
}
function Co(e, t) {
  const n = t.querySelector(".account-table"), r = t.querySelector(".fx-account-table"), i = e.filter((a) => (a.currency_code || "EUR") === "EUR"), o = e.filter((a) => (a.currency_code || "EUR") !== "EUR");
  if (n) {
    const a = i.map((s) => ({
      name: tt(s.name, s.badges, {
        containerClass: "account-name",
        labelClass: "account-name__label"
      }),
      balance: s.balance ?? null
    }));
    n.innerHTML = Se(
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
      const c = s.orig_balance, l = typeof c == "number" && Number.isFinite(c), u = Ne(s.currency_code), f = l ? c.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) : null, d = f ? u ? `${f} ${u}` : f : "";
      return {
        name: tt(s.name, s.badges, {
          containerClass: "account-name",
          labelClass: "account-name__label"
        }),
        fx_display: d,
        balance: s.balance ?? null
      };
    });
    r.innerHTML = Se(
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
function xo(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = jn(n);
    r && t.push(r);
  }
  return t;
}
function Do(e, t) {
  if (!Array.isArray(e)) {
    console.warn("handlePortfolioUpdate: Update ist kein Array:", e);
    return;
  }
  try {
    console.debug("handlePortfolioUpdate: payload=", e);
  } catch {
  }
  const n = xo(e);
  if (n.length && Ji(n), Po(n), !t)
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
    return (ht(f, { fallback: 0 }) ?? 0).toFixed(2).replace(".", ",");
  }, a = /* @__PURE__ */ new Map();
  i.querySelectorAll("tr.portfolio-row").forEach((f) => {
    const d = f.dataset.portfolio;
    d && a.set(d, f);
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
    const d = Ne(f.uuid);
    d && u.set(d, f);
  }
  for (const [f, d] of u.entries()) {
    const g = a.get(f);
    if (!g || g.cells.length < 3)
      continue;
    const p = g.cells.item(1), m = g.cells.item(2), y = g.cells.item(3), h = g.cells.item(4);
    if (!p || !m)
      continue;
    const _ = typeof d.position_count == "number" && Number.isFinite(d.position_count) ? d.position_count : 0, b = typeof d.current_value == "number" && Number.isFinite(d.current_value) ? d.current_value : null, S = ge(d.performance), P = typeof (S == null ? void 0 : S.gain_abs) == "number" ? S.gain_abs : null, N = typeof (S == null ? void 0 : S.gain_pct) == "number" ? S.gain_pct : null, A = typeof d.purchase_sum == "number" && Number.isFinite(d.purchase_sum) ? d.purchase_sum : typeof d.purchase_value == "number" && Number.isFinite(d.purchase_value) ? d.purchase_value : null, R = Pt(m.textContent);
    Pt(p.textContent) !== _ && (p.textContent = l(_));
    const F = b !== null, k = {
      fx_unavailable: g.dataset.fxUnavailable === "true",
      current_value: b,
      performance: S
    }, T = { hasValue: F }, L = M("current_value", k.current_value, k, T), w = b ?? 0;
    if ((Math.abs(R - w) >= 5e-3 || m.innerHTML !== L) && (m.innerHTML = L, g.classList.add("flash-update"), setTimeout(() => {
      g.classList.remove("flash-update");
    }, 800)), y) {
      const E = M("gain_abs", P, k, T);
      y.innerHTML = E;
      const v = typeof N == "number" && Number.isFinite(N) ? N : null;
      y.dataset.gainPct = v != null ? `${o(v)} %` : "—", y.dataset.gainSign = v != null ? v > 0 ? "positive" : v < 0 ? "negative" : "neutral" : "neutral";
    }
    h && (h.innerHTML = M("gain_pct", N, k, T)), g.dataset.positionCount = _.toString(), g.dataset.currentValue = F ? w.toString() : "", g.dataset.purchaseSum = A != null ? A.toString() : "", g.dataset.gainAbs = P != null ? P.toString() : "", g.dataset.gainPct = N != null ? N.toString() : "", g.dataset.coverageRatio = typeof d.coverage_ratio == "number" && Number.isFinite(d.coverage_ratio) ? d.coverage_ratio.toString() : "", g.dataset.provenance = typeof d.provenance == "string" ? d.provenance : "", g.dataset.metricRunUuid = typeof d.metric_run_uuid == "string" ? d.metric_run_uuid : "", c += 1;
  }
  if (c === 0)
    console.debug("handlePortfolioUpdate: Keine passenden Zeilen gefunden / keine Änderungen.");
  else {
    const f = c.toLocaleString("de-DE");
    console.debug(`handlePortfolioUpdate: ${f} Zeile(n) gepatcht.`);
  }
  try {
    Lo(r);
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
        const N = _ ? P.cells.item(2) : P.cells.item(1);
        return { balance: Pt(N == null ? void 0 : N.textContent) };
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
    hr(m, y, t);
  } catch (f) {
    console.warn("handlePortfolioUpdate: Fehler bei Total-Neuberechnung:", f);
  }
}
function ko(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e.portfolio_uuid;
  if (typeof t == "string" && t)
    return t;
  const n = e.portfolioUuid;
  return typeof n == "string" && n ? n : null;
}
function Rt(e) {
  $t.delete(e);
}
function Pn(e) {
  return typeof e != "number" || !Number.isInteger(e) || e <= 0 ? null : e;
}
function To(e, t, n, r) {
  if (!n || n <= 1 || !t)
    return Rt(e), r;
  const i = n, o = $t.get(e) ?? { expected: i, chunks: /* @__PURE__ */ new Map() };
  if (o.expected !== i && (o.chunks.clear(), o.expected = i), o.chunks.set(t, r), $t.set(e, o), o.chunks.size < i)
    return null;
  const a = [];
  for (let s = 1; s <= i; s += 1) {
    const c = o.chunks.get(s);
    c && Array.isArray(c) && a.push(...c);
  }
  return Rt(e), a;
}
function An(e, t) {
  const n = ko(e);
  if (!n)
    return console.warn("handlePortfolioPositionsUpdate: Ungültiges Update:", e), !1;
  const r = e == null ? void 0 : e.error, i = Pn(e == null ? void 0 : e.chunk_index), o = Pn(e == null ? void 0 : e.chunk_count), a = mt((e == null ? void 0 : e.positions) ?? []);
  r && Rt(n);
  const s = r ? a : To(n, i, o, a);
  if (!r && s === null)
    return !0;
  const c = r ? a : s ?? [];
  Ao(n, e), r || (Xt(n, c), Qt(n, c));
  const l = gr(t, n, c, r);
  if (l.applied ? ae.delete(n) : (ae.set(n, { positions: a, error: r }), l.reason !== "hidden" && pr(t, n)), !r && a.length > 0) {
    const u = Array.from(
      new Set(
        a.map((f) => f.security_uuid).filter((f) => typeof f == "string" && f.length > 0)
      )
    );
    if (u.length && typeof window < "u")
      try {
        window.dispatchEvent(
          new CustomEvent(
            ho,
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
      An(r, t) && (n = !0);
    !n && e.length && console.warn("handlePortfolioPositionsUpdate: Kein gültiges Element im Array:", e);
    return;
  }
  An(e, t);
}
function Ro(e) {
  const { renderPositionsTable: t, applyGainPctMetadata: n } = Yt();
  try {
    if (typeof t == "function")
      return t(e);
  } catch {
  }
  if (e.length === 0)
    return '<div class="no-positions">Keine Positionen vorhanden.</div>';
  const r = e.map((o) => {
    const a = vn(o);
    return {
      name: o.name,
      current_holdings: o.current_holdings,
      purchase_value: o.purchase_value,
      current_value: o.current_value,
      performance: a
    };
  }), i = Se(
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
      s.forEach((f, d) => {
        const g = c[d];
        g && (f.setAttribute("data-sort-key", g), f.classList.add("sortable-col"));
      }), a.querySelectorAll("tbody tr").forEach((f, d) => {
        if (f.classList.contains("footer-row"))
          return;
        const g = e[d];
        g.security_uuid && (f.dataset.security = g.security_uuid), f.classList.add("position-row");
      }), a.dataset.defaultSort = "name", a.dataset.defaultDir = "asc";
      const u = n;
      if (u)
        try {
          u(a);
        } catch (f) {
          console.warn("renderPositionsTableInline: applyGainPctMetadata failed", f);
        }
      else
        a.querySelectorAll("tbody tr").forEach((d, g) => {
          if (d.classList.contains("footer-row"))
            return;
          const p = d.cells.item(4);
          if (!p)
            return;
          const m = e[g], y = vn(m), h = typeof (y == null ? void 0 : y.gain_pct) == "number" && Number.isFinite(y.gain_pct) ? y.gain_pct : null, _ = h != null ? `${h.toLocaleString("de-DE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })} %` : "—", b = h == null ? "neutral" : h > 0 ? "positive" : h < 0 ? "negative" : "neutral";
          p.dataset.gainPct = _, p.dataset.gainSign = b;
        });
      return a.outerHTML;
    }
  } catch (o) {
    console.warn("renderPositionsTableInline: Sortier-Metadaten Injection fehlgeschlagen:", o);
  }
  return i;
}
function Lo(e) {
  var h;
  if (!e) return;
  const { updatePortfolioFooter: t } = Yt();
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
  }, u = { hasValue: o }, f = M("current_value", l.current_value, l, u), d = o ? i.sumGainAbs : null, g = o ? a : null, p = M("gain_abs", d, l, u), m = M("gain_pct", g, l, u);
  s.innerHTML = `
    <td>Summe</td>
    <td class="align-right">${c}</td>
    <td class="align-right">${f}</td>
    <td class="align-right">${p}</td>
    <td class="align-right">${m}</td>
  `;
  const y = s.cells.item(3);
  y && (y.dataset.gainPct = o && typeof a == "number" ? `${Lt(a)} %` : "—", y.dataset.gainSign = o && typeof a == "number" ? a > 0 ? "positive" : a < 0 ? "negative" : "neutral" : "neutral"), s.dataset.positionCount = Math.round(i.sumPositions).toString(), s.dataset.currentValue = o ? i.sumCurrent.toString() : "", s.dataset.purchaseSum = o ? i.sumPurchase.toString() : "", s.dataset.gainAbs = o ? i.sumGainAbs.toString() : "", s.dataset.gainPct = o && typeof a == "number" ? a.toString() : "", s.dataset.hasValue = o ? "true" : "false", s.dataset.fxUnavailable = i.fxUnavailable || !o ? "true" : "false";
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
function Lt(e) {
  return (ht(e, { fallback: 0 }) ?? 0).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
function hr(e, t, n) {
  const r = n ?? document, o = (Array.isArray(e) ? e : []).reduce((f, d) => {
    const g = d.balance ?? d.current_value ?? d.value, p = Nn(g);
    return f + p;
  }, 0), s = (Array.isArray(t) ? t : []).reduce((f, d) => {
    const g = d.current_value ?? d.value, p = Nn(g);
    return f + p;
  }, 0), c = o + s, l = r.querySelector("#headerMeta");
  if (!l) {
    console.warn("updateTotalWealth: #headerMeta nicht gefunden.");
    return;
  }
  const u = l.querySelector("strong") || l.querySelector(".total-wealth-value");
  u ? u.textContent = `${Lt(c)} €` : l.textContent = `💰 Gesamtvermögen: ${Lt(c)} €`, l.dataset.totalWealthEur = c.toString();
}
function Mo(e, t) {
  const n = typeof e == "string" ? e : e == null ? void 0 : e.last_file_update, r = Ne(n) ?? "";
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
function Ps(e) {
  if (e == null)
    return;
  const t = e.querySelector("table.sortable-positions");
  if (t == null)
    return;
  const n = e.dataset.sortKey || t.dataset.defaultSort || "name", i = (e.dataset.sortDir || t.dataset.defaultDir || "asc") === "desc" ? "desc" : "asc";
  e.dataset.sortKey = n, e.dataset.sortDir = i, zn(t, n, i, !0);
}
const As = {
  getPortfolioPositionsCacheSnapshot: Wi,
  clearPortfolioPositionsCache: Bi,
  getPendingUpdateCount() {
    return ae.size;
  },
  queuePendingUpdate(e, t, n) {
    ae.set(e, { positions: t, error: n });
  },
  clearPendingUpdates() {
    ae.clear(), Ze.clear();
  }
};
function Pt(e) {
  return e == null ? 0 : parseFloat(
    e.replace(/\u00A0/g, " ").replace(/[€%]/g, "").replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "")
  ) || 0;
}
const Ho = [
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
function At(e) {
  return Ho.includes(e);
}
function Nt(e) {
  return e === "asc" || e === "desc";
}
let nt = null, rt = null;
const wn = { min: 2, max: 6 };
function Fe(e) {
  return oe(e);
}
function Io(e) {
  return typeof e == "number" && Number.isFinite(e);
}
function Vo(e) {
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
    const i = Vo(e[r]);
    if (i)
      return i;
  }
  return n;
}
function Fn(e, t) {
  return Io(e) ? `${e.toLocaleString("de-DE", {
    minimumFractionDigits: wn.min,
    maximumFractionDigits: wn.max
  })}${t ? ` ${t}` : ""}` : null;
}
function Uo(e) {
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
  ) ?? "EUR", a = Fe(n == null ? void 0 : n.native), s = Fe(n == null ? void 0 : n.security), c = Fe(n == null ? void 0 : n.account), l = Fe(n == null ? void 0 : n.eur), u = s ?? a, f = l ?? (o === "EUR" ? c : null), d = i ?? o, g = d === "EUR";
  let p, m;
  g ? (p = "EUR", m = f ?? u ?? c ?? null) : u != null ? (p = d, m = u) : c != null ? (p = o, m = c) : (p = "EUR", m = f ?? null);
  const y = Fn(m, p), h = g ? null : Fn(f, "EUR"), _ = !!h && h !== y, b = [], S = [];
  y ? (b.push(
    `<span class="purchase-price purchase-price--primary">${y}</span>`
  ), S.push(y.replace(/\u00A0/g, " "))) : (b.push('<span class="missing-value" role="note" aria-label="Kein Kaufpreis verfügbar" title="Kein Kaufpreis verfügbar">—</span>'), S.push("Kein Kaufpreis verfügbar")), _ && h && (b.push(
    `<span class="purchase-price purchase-price--secondary">${h}</span>`
  ), S.push(h.replace(/\u00A0/g, " ")));
  const P = b.join("<br>"), N = Fe(r == null ? void 0 : r.purchase_value_eur) ?? 0, A = S.join(", ");
  return { markup: P, sortValue: N, ariaLabel: A };
}
function zo(e) {
  const t = oe(e.current_holdings);
  if (t == null)
    return { value: null, pct: null };
  const n = oe(e.last_price_eur), r = oe(e.last_close_eur);
  let i = null, o = null;
  if (n != null && r != null) {
    i = (n - r) * t;
    const f = r * t;
    f && (o = i / f * 100);
  }
  const a = ge(e.performance), s = (a == null ? void 0 : a.day_change) ?? null;
  if (i == null && (s == null ? void 0 : s.price_change_eur) != null && (i = s.price_change_eur * t), o == null && (s == null ? void 0 : s.change_pct) != null && (o = s.change_pct), i == null && o != null) {
    const u = oe(e.current_value);
    if (u != null) {
      const f = u / (1 + o / 100);
      f && (i = u - f);
    }
  }
  const c = i != null && Number.isFinite(i) ? Math.round(i * 100) / 100 : null, l = o != null && Number.isFinite(o) ? Math.round(o * 100) / 100 : null;
  return { value: c, pct: l };
}
const it = /* @__PURE__ */ new Set();
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
function Ie(e) {
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
    const o = ge(i.performance), a = typeof (o == null ? void 0 : o.gain_abs) == "number" ? o.gain_abs : null, s = typeof (o == null ? void 0 : o.gain_pct) == "number" ? o.gain_pct : null, c = zo(i), l = typeof i.purchase_value == "number" || typeof i.purchase_value == "string" ? i.purchase_value : null;
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
  }), r = Se(n, t, ["purchase_value", "current_value", "day_change_abs", "gain_abs"]);
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
        const u = e[l], f = typeof u.security_uuid == "string" ? u.security_uuid : null;
        f && (c.dataset.security = f), c.classList.add("position-row");
        const d = c.cells.item(2);
        if (d) {
          const { markup: m, sortValue: y, ariaLabel: h } = Uo(u);
          d.innerHTML = m, d.dataset.sortValue = String(y), h ? d.setAttribute("aria-label", h) : d.removeAttribute("aria-label");
        }
        const g = c.cells.item(7);
        if (g) {
          const m = ge(u.performance), y = typeof (m == null ? void 0 : m.gain_pct) == "number" && Number.isFinite(m.gain_pct) ? m.gain_pct : null, h = y != null ? `${y.toLocaleString("de-DE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })} %` : "—", _ = y == null ? "neutral" : y > 0 ? "positive" : y < 0 ? "negative" : "neutral";
          g.dataset.gainPct = h, g.dataset.gainSign = _;
        }
        const p = c.cells.item(8);
        p && p.classList.add("gain-pct-cell");
      }), o.dataset.defaultSort = "name", o.dataset.defaultDir = "asc", mr(o), o.outerHTML;
    }
  } catch (i) {
    console.warn("renderPositionsTable: Konnte Sortier-Metadaten nicht injizieren:", i);
  }
  return r;
}
function qo(e) {
  const t = mt(e ?? []);
  return Ie(t);
}
function Oo(e, t) {
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
function Ve(e, t) {
  Oo(e, t);
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
    const C = v.align === "right" ? ' class="align-right"' : "";
    n += `<th${C}>${v.label}</th>`;
  }), n += "</tr></thead><tbody>", e.forEach((v) => {
    const C = Number.isFinite(v.position_count) ? v.position_count : 0, B = Number.isFinite(v.purchase_sum) ? v.purchase_sum : 0, K = v.hasValue && typeof v.current_value == "number" && Number.isFinite(v.current_value) ? v.current_value : null, W = K !== null, I = v.performance, $ = typeof v.gain_abs == "number" ? v.gain_abs : typeof (I == null ? void 0 : I.gain_abs) == "number" ? I.gain_abs : null, U = typeof v.gain_pct == "number" ? v.gain_pct : typeof (I == null ? void 0 : I.gain_pct) == "number" ? I.gain_pct : null, X = I && typeof I == "object" ? I.day_change : null, we = typeof v.day_change_abs == "number" ? v.day_change_abs : X && typeof X == "object" ? X.value_change_eur ?? X.price_change_eur : null, he = typeof v.day_change_pct == "number" ? v.day_change_pct : X && typeof X == "object" && typeof X.change_pct == "number" ? X.change_pct : null, je = v.fx_unavailable && W, Ke = typeof v.coverage_ratio == "number" && Number.isFinite(v.coverage_ratio) ? v.coverage_ratio : "", Ge = typeof v.provenance == "string" ? v.provenance : "", Qr = typeof v.metric_run_uuid == "string" ? v.metric_run_uuid : "", Ee = it.has(v.uuid), ei = Ee ? "portfolio-toggle expanded" : "portfolio-toggle", un = `portfolio-details-${v.uuid}`, Z = {
      fx_unavailable: v.fx_unavailable,
      purchase_value: B,
      current_value: K,
      day_change_abs: we,
      day_change_pct: he,
      gain_abs: $,
      gain_pct: U
    }, _e = { hasValue: W }, ti = M("purchase_value", Z.purchase_value, Z, _e), ni = M("current_value", Z.current_value, Z, _e), ri = M("day_change_abs", Z.day_change_abs, Z, _e), ii = M("day_change_pct", Z.day_change_pct, Z, _e), oi = M("gain_abs", Z.gain_abs, Z, _e), ai = M("gain_pct", Z.gain_pct, Z, _e), dn = W && typeof U == "number" && Number.isFinite(U) ? `${se(U)} %` : "", si = W && typeof U == "number" && Number.isFinite(U) ? U > 0 ? "positive" : U < 0 ? "negative" : "neutral" : "", ci = W && typeof K == "number" && Number.isFinite(K) ? K : "", li = W && typeof $ == "number" && Number.isFinite($) ? $ : "", ui = W && typeof U == "number" && Number.isFinite(U) ? U : "", di = W && typeof we == "number" && Number.isFinite(we) ? we : "", fi = W && typeof he == "number" && Number.isFinite(he) ? he : "", gi = String(C);
    let yt = "";
    dn && (yt = ` data-gain-pct="${t(dn)}" data-gain-sign="${t(si)}"`), je && (yt += ' data-partial="true"'), n += `<tr class="portfolio-row"
                  data-portfolio="${v.uuid}"
                  data-position-count="${gi}"
                  data-current-value="${t(ci)}"
                  data-purchase-sum="${t(B)}"
                  data-day-change="${t(di)}"
                  data-day-change-pct="${t(fi)}"
                  data-gain-abs="${t(li)}"
                data-gain-pct="${t(ui)}"
                data-has-value="${W ? "true" : "false"}"
                data-fx-unavailable="${v.fx_unavailable ? "true" : "false"}"
                data-coverage-ratio="${t(Ke)}"
                data-provenance="${t(Ge)}"
                data-metric-run-uuid="${t(Qr)}">`;
    const pi = He(v.name), hi = ur(v.badges, { containerClass: "portfolio-badges" });
    n += `<td>
        <button type="button"
                class="${ei}"
                data-portfolio="${v.uuid}"
                aria-expanded="${Ee ? "true" : "false"}"
                aria-controls="${un}">
          <span class="caret">${Ee ? "▼" : "▶"}</span>
          <span class="portfolio-name">${pi}</span>${hi}
        </button>
      </td>`;
    const mi = C.toLocaleString("de-DE");
    n += `<td class="align-right">${mi}</td>`, n += `<td class="align-right">${ti}</td>`, n += `<td class="align-right">${ni}</td>`, n += `<td class="align-right">${ri}</td>`, n += `<td class="align-right">${ii}</td>`, n += `<td class="align-right"${yt}>${oi}</td>`, n += `<td class="align-right gain-pct-cell">${ai}</td>`, n += "</tr>", n += `<tr class="portfolio-details${Ee ? "" : " hidden"}"
                data-portfolio="${v.uuid}"
                id="${un}"
                role="region"
                aria-label="Positionen für ${v.name}">
      <td colspan="${r.length.toString()}">
        <div class="positions-container">${Ee ? Zt(v.uuid) ? Ie(Qn(v.uuid)) : '<div class="loading">Lade Positionen...</div>' : ""}</div>
      </td>
    </tr>`;
  });
  const i = e.filter((v) => typeof v.current_value == "number" && Number.isFinite(v.current_value)), o = e.reduce((v, C) => v + (Number.isFinite(C.position_count) ? C.position_count : 0), 0), a = i.reduce((v, C) => typeof C.current_value == "number" && Number.isFinite(C.current_value) ? v + C.current_value : v, 0), s = i.reduce((v, C) => typeof C.purchase_sum == "number" && Number.isFinite(C.purchase_sum) ? v + C.purchase_sum : v, 0), c = i.map((v) => {
    if (typeof v.day_change_abs == "number")
      return v.day_change_abs;
    const C = v.performance && typeof v.performance == "object" ? v.performance.day_change : null;
    if (C && typeof C == "object") {
      const B = C.value_change_eur;
      if (typeof B == "number" && Number.isFinite(B))
        return B;
    }
    return null;
  }).filter((v) => typeof v == "number" && Number.isFinite(v)), l = c.reduce((v, C) => v + C, 0), u = i.reduce((v, C) => {
    var W;
    if (typeof ((W = C.performance) == null ? void 0 : W.gain_abs) == "number" && Number.isFinite(C.performance.gain_abs))
      return v + C.performance.gain_abs;
    const B = typeof C.current_value == "number" && Number.isFinite(C.current_value) ? C.current_value : 0, K = typeof C.purchase_sum == "number" && Number.isFinite(C.purchase_sum) ? C.purchase_sum : 0;
    return v + (B - K);
  }, 0), f = i.length > 0, d = i.length !== e.length, g = c.length > 0, p = g && f && a !== 0 ? (() => {
    const v = a - l;
    return v ? l / v * 100 : null;
  })() : null, m = f && s > 0 ? u / s * 100 : null, y = {
    fx_unavailable: d,
    purchase_value: f ? s : null,
    current_value: f ? a : null,
    day_change_abs: g ? l : null,
    day_change_pct: g ? p : null,
    gain_abs: f ? u : null,
    gain_pct: f ? m : null
  }, h = { hasValue: f }, _ = { hasValue: g }, b = M("purchase_value", y.purchase_value, y, h), S = M("current_value", y.current_value, y, h), P = M("day_change_abs", y.day_change_abs, y, _), N = M("day_change_pct", y.day_change_pct, y, _), A = M("gain_abs", y.gain_abs, y, h), R = M("gain_pct", y.gain_pct, y, h);
  let x = "";
  if (f && typeof m == "number" && Number.isFinite(m)) {
    const v = `${se(m)} %`, C = m > 0 ? "positive" : m < 0 ? "negative" : "neutral";
    x = ` data-gain-pct="${t(v)}" data-gain-sign="${t(C)}"`;
  }
  d && (x += ' data-partial="true"');
  const F = String(Math.round(o)), k = f ? String(a) : "", T = f ? String(s) : "", L = g ? String(l) : "", w = g && typeof p == "number" && Number.isFinite(p) ? String(p) : "", E = f ? String(u) : "", H = f && typeof m == "number" && Number.isFinite(m) ? String(m) : "";
  return n += `<tr class="footer-row"
      data-position-count="${F}"
      data-current-value="${t(k)}"
      data-purchase-sum="${t(T)}"
      data-day-change="${t(L)}"
      data-day-change-pct="${t(w)}"
      data-gain-abs="${t(E)}"
      data-gain-pct="${t(H)}"
      data-has-value="${f ? "true" : "false"}"
      data-fx-unavailable="${d ? "true" : "false"}">
      <td>Summe</td>
      <td class="align-right">${Math.round(o).toLocaleString("de-DE")}</td>
    <td class="align-right">${b}</td>
    <td class="align-right">${S}</td>
    <td class="align-right">${P}</td>
    <td class="align-right">${N}</td>
    <td class="align-right"${x}>${A}</td>
    <td class="align-right gain-pct-cell">${R}</td>
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
function Ce(e) {
  if (e === void 0)
    return null;
  const t = Number(e);
  return Number.isFinite(t) ? t : null;
}
function yr(e) {
  var C, B, K, W, I;
  const t = Bo(e);
  if (!t)
    return;
  const n = t.tBodies.item(0);
  if (!n)
    return;
  const r = Array.from(n.querySelectorAll("tr.portfolio-row"));
  if (!r.length)
    return;
  let i = 0, o = 0, a = 0, s = 0, c = 0, l = !1, u = !1, f = !0, d = !1;
  for (const $ of r) {
    const U = Ce($.dataset.positionCount);
    U != null && (i += U), $.dataset.fxUnavailable === "true" && (d = !0);
    const X = $.dataset.hasValue;
    if (!!(X === "false" || X === "0" || X === "" || X == null)) {
      f = !1;
      continue;
    }
    l = !0;
    const he = Ce($.dataset.currentValue), je = Ce($.dataset.gainAbs), Ke = Ce($.dataset.purchaseSum), Ge = Ce($.dataset.dayChange);
    if (he == null || je == null || Ke == null) {
      f = !1;
      continue;
    }
    o += he, s += je, a += Ke, Ge != null && (c += Ge, u = !0);
  }
  const g = l && f, p = g && a > 0 ? s / a * 100 : null, m = u && g && o !== 0 ? (() => {
    const $ = o - c;
    return $ ? c / $ * 100 : null;
  })() : null;
  let y = Array.from(n.children).find(
    ($) => $ instanceof HTMLTableRowElement && $.classList.contains("footer-row")
  );
  y || (y = document.createElement("tr"), y.classList.add("footer-row"), n.appendChild(y));
  const h = Math.round(i).toLocaleString("de-DE"), _ = {
    fx_unavailable: d || !g,
    purchase_value: g ? a : null,
    current_value: g ? o : null,
    day_change_abs: u && g ? c : null,
    day_change_pct: u && g ? m : null,
    gain_abs: g ? s : null,
    gain_pct: g ? p : null
  }, b = { hasValue: g }, S = { hasValue: u && g }, P = M("purchase_value", _.purchase_value, _, b), N = M("current_value", _.current_value, _, b), A = M("day_change_abs", _.day_change_abs, _, S), R = M("day_change_pct", _.day_change_pct, _, S), x = M("gain_abs", _.gain_abs, _, b), F = M("gain_pct", _.gain_pct, _, b), k = ((W = (K = (B = (C = t.tHead) == null ? void 0 : C.rows) == null ? void 0 : B.item(0)) == null ? void 0 : K.cells) == null ? void 0 : W.length) ?? 0, T = ((I = y.cells) == null ? void 0 : I.length) ?? 0, L = k || T, w = L > 0 ? L <= 5 : !1, E = g && typeof p == "number" ? `${se(p)} %` : "", H = g && typeof p == "number" ? p > 0 ? "positive" : p < 0 ? "negative" : "neutral" : "neutral";
  w ? y.innerHTML = `
      <td>Summe</td>
      <td class="align-right">${h}</td>
      <td class="align-right">${N}</td>
      <td class="align-right">${x}</td>
      <td class="align-right gain-pct-cell">${F}</td>
    ` : y.innerHTML = `
      <td>Summe</td>
      <td class="align-right">${h}</td>
      <td class="align-right">${P}</td>
      <td class="align-right">${N}</td>
      <td class="align-right">${A}</td>
      <td class="align-right">${R}</td>
      <td class="align-right">${x}</td>
      <td class="align-right">${F}</td>
    `;
  const v = y.cells.item(w ? 3 : 6);
  v && (v.dataset.gainPct = E || "—", v.dataset.gainSign = H), y.dataset.positionCount = String(Math.round(i)), y.dataset.currentValue = g ? String(o) : "", y.dataset.purchaseSum = g ? String(a) : "", y.dataset.dayChange = g && u ? String(c) : "", y.dataset.dayChangePct = g && u && typeof m == "number" ? String(m) : "", y.dataset.gainAbs = g ? String(s) : "", y.dataset.gainPct = g && typeof p == "number" ? String(p) : "", y.dataset.hasValue = g ? "true" : "false", y.dataset.fxUnavailable = d ? "true" : "false";
}
function Ue(e, t) {
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
      }[d], A = b.cells.item(N), R = S.cells.item(N);
      let x = "";
      if (A) {
        const L = A.textContent;
        typeof L == "string" && (x = L.trim());
      }
      let F = "";
      if (R) {
        const L = R.textContent;
        typeof L == "string" && (F = L.trim());
      }
      const k = (L, w) => {
        const E = L ? L.dataset.sortValue : void 0;
        if (E != null && E !== "") {
          const H = Number(E);
          if (Number.isFinite(H))
            return H;
        }
        return h(w);
      };
      let T;
      if (d === "name")
        T = x.localeCompare(F, "de", { sensitivity: "base" });
      else {
        const L = k(A, x), w = k(R, F);
        T = L - w;
      }
      return g === "asc" ? T : -T;
    }), i.querySelectorAll("thead th.sort-active").forEach((b) => {
      b.classList.remove("sort-active", "dir-asc", "dir-desc");
    });
    const _ = i.querySelector(`thead th[data-sort-key="${d}"]`);
    _ && _.classList.add("sort-active", g === "asc" ? "dir-asc" : "dir-desc"), m.forEach((b) => p.appendChild(b)), y && p.appendChild(y);
  }, a = r.dataset.sortKey, s = r.dataset.sortDir, c = i.dataset.defaultSort, l = i.dataset.defaultDir, u = At(a) ? a : At(c) ? c : "name", f = Nt(s) ? s : Nt(l) ? l : "asc";
  o(u, f), i.addEventListener("click", (d) => {
    const g = d.target;
    if (!(g instanceof Element))
      return;
    const p = g.closest("th[data-sort-key]");
    if (!p || !i.contains(p)) return;
    const m = p.getAttribute("data-sort-key");
    if (!At(m))
      return;
    let y = "asc";
    r.dataset.sortKey === m && (y = (Nt(r.dataset.sortDir) ? r.dataset.sortDir : "asc") === "asc" ? "desc" : "asc"), r.dataset.sortKey = m, r.dataset.sortDir = y, o(m, y);
  });
}
async function Wo(e, t, n) {
  if (!e || !nt || !rt) return;
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
        nt,
        rt,
        e
      );
      if (o.error) {
        const s = typeof o.error == "string" ? o.error : String(o.error);
        r.innerHTML = `<div class="error">${s} <button class="retry-pos" data-portfolio="${e}">Erneut laden</button></div>`;
        return;
      }
      const a = mt(
        Array.isArray(o.positions) ? o.positions : []
      );
      Xt(e, a), Qt(e, a), r.innerHTML = Ie(a);
      try {
        Ue(n, e);
      } catch (s) {
        console.warn("attachPortfolioToggleHandler: Sort-Init (Lazy) fehlgeschlagen:", s);
      }
      try {
        Ve(n, e);
      } catch (s) {
        console.warn("reloadPortfolioPositions: Security-Listener konnte nicht gebunden werden:", s);
      }
    } catch (o) {
      const a = o instanceof Error ? o.message : String(o);
      r.innerHTML = `<div class="error">Fehler: ${a} <button class="retry-pos" data-portfolio="${e}">Retry</button></div>`;
    }
  }
}
async function jo(e, t, n = 3e3, r = 50) {
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
function on(e) {
  const n = (typeof e.__ppReaderAttachToken == "number" ? e.__ppReaderAttachToken : 0) + 1;
  e.__ppReaderAttachToken = n, e.__ppReaderAttachInProgress = !0, (async () => {
    try {
      const r = await jo(e, ".portfolio-table");
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
                const p = e.querySelector(
                  `.portfolio-details[data-portfolio="${g}"]`
                ), m = p == null ? void 0 : p.querySelector(".positions-container");
                await Wo(g, m ?? null, e);
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
            const f = c.querySelector(".caret");
            if (u.classList.contains("hidden")) {
              u.classList.remove("hidden"), c.classList.add("expanded"), c.setAttribute("aria-expanded", "true"), f && (f.textContent = "▼"), it.add(l);
              try {
                rn(e, l);
              } catch (g) {
                console.warn("attachPortfolioToggleHandler: Pending-Flush fehlgeschlagen:", g);
              }
              if (Zt(l)) {
                const g = u.querySelector(".positions-container");
                if (g) {
                  g.innerHTML = Ie(
                    Qn(l)
                  ), Ue(e, l);
                  try {
                    Ve(e, l);
                  } catch (p) {
                    console.warn("attachPortfolioToggleHandler: Security-Listener (Cache) Fehler:", p);
                  }
                }
              } else {
                const g = u.querySelector(".positions-container");
                g && (g.innerHTML = '<div class="loading">Lade Positionen...</div>');
                try {
                  const p = await Xn(
                    nt,
                    rt,
                    l
                  );
                  if (p.error) {
                    const y = typeof p.error == "string" ? p.error : String(p.error);
                    g && (g.innerHTML = `<div class="error">${y} <button class="retry-pos" data-portfolio="${l}">Erneut laden</button></div>`);
                    return;
                  }
                  const m = mt(
                    Array.isArray(p.positions) ? p.positions : []
                  );
                  if (Xt(l, m), Qt(
                    l,
                    m
                  ), g) {
                    g.innerHTML = Ie(m);
                    try {
                      Ue(e, l);
                    } catch (y) {
                      console.warn("attachPortfolioToggleHandler: Sort-Init (Lazy) fehlgeschlagen:", y);
                    }
                    try {
                      Ve(e, l);
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
              u.classList.add("hidden"), c.classList.remove("expanded"), c.setAttribute("aria-expanded", "false"), f && (f.textContent = "▶"), it.delete(l);
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
    o != null && o.__ppReaderPortfolioToggleBound || (console.debug("Fallback-Listener aktiv – re-attach Hauptlistener"), on(e));
  })));
}
async function br(e, t, n) {
  var k, T, L;
  nt = t ?? null, rt = n ?? null, console.debug(
    "renderDashboard: start – panelConfig:",
    n == null ? void 0 : n.config,
    "derived entry_id?",
    (L = (T = (k = n == null ? void 0 : n.config) == null ? void 0 : k._panel_custom) == null ? void 0 : T.config) == null ? void 0 : L.entry_id
  );
  const r = await Ci(t, n);
  rr(r.accounts);
  const i = lr(), o = await Di(t, n);
  Zi(o.portfolios);
  const a = so();
  let s = "";
  try {
    s = await xi(t, n);
  } catch {
    s = "";
  }
  const c = i.reduce(
    (w, E) => w + (typeof E.balance == "number" && Number.isFinite(E.balance) ? E.balance : 0),
    0
  ), l = a.some((w) => w.fx_unavailable), u = i.some((w) => w.fx_unavailable && (w.balance == null || !Number.isFinite(w.balance))), f = a.reduce((w, E) => E.hasValue && typeof E.current_value == "number" && Number.isFinite(E.current_value) ? w + E.current_value : w, 0), d = c + f, g = "Teilw. fehlende FX-Kurse – Gesamtvermögen abweichend", m = a.some((w) => w.hasValue && typeof w.current_value == "number" && Number.isFinite(w.current_value)) || i.some((w) => typeof w.balance == "number" && Number.isFinite(w.balance)) ? `${se(d)}&nbsp;€` : `<span class="missing-value" role="note" aria-label="${g}" title="${g}">—</span>`, y = l || u ? `<span class="total-wealth-note">${g}</span>` : "", h = `
    <div class="header-meta-row">
      💰 Gesamtvermögen: <strong class="total-wealth-value">${m}</strong>${y}
    </div>
  `, _ = Tt("Übersicht", h), b = _r(a), S = i.filter((w) => (w.currency_code ?? "EUR") === "EUR"), P = i.filter((w) => (w.currency_code ?? "EUR") !== "EUR"), A = P.some((w) => w.fx_unavailable) ? `
        <p class="table-note" role="note">
          <span class="table-note__icon" aria-hidden="true">⚠️</span>
          <span>Wechselkurse konnten nicht geladen werden. EUR-Werte werden derzeit nicht angezeigt.</span>
        </p>
      ` : "", R = `
    <div class="card">
      <h2>Liquidität</h2>
      <div class="scroll-container account-table">
        ${Se(
    S.map((w) => ({
      name: tt(w.name, w.badges, {
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
          ${Se(
    P.map((w) => {
      const E = w.orig_balance, v = typeof E == "number" && Number.isFinite(E) ? `${E.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}&nbsp;${w.currency_code ?? ""}` : "";
      return {
        name: tt(w.name, w.badges, {
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
  `, x = `
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
    ${R}
    ${x}
  `;
  return Go(e, a), F;
}
function Go(e, t) {
  if (!e)
    return;
  const n = () => {
    try {
      const i = e, o = i.querySelector(".portfolio-table");
      o && o.querySelectorAll(".portfolio-toggle").length === 0 && (console.debug("Recovery: Tabelle ohne Buttons – erneuter Aufbau"), o.innerHTML = _r(t)), on(e), Ko(e), it.forEach((a) => {
        try {
          Zt(a) && (Ue(e, a), Ve(e, a));
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
        Eo(e);
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
Hi({
  renderPositionsTable: (e) => qo(e),
  applyGainPctMetadata: mr,
  attachSecurityDetailListener: Ve,
  attachPortfolioPositionsSorting: Ue,
  updatePortfolioFooter: (e) => {
    e && yr(e);
  }
});
const Yo = "http://www.w3.org/2000/svg", Te = 640, $e = 260, De = { top: 12, right: 16, bottom: 24, left: 16 }, ke = "var(--pp-reader-chart-line, #3f51b5)", Mt = "var(--pp-reader-chart-area, rgba(63, 81, 181, 0.12))", Cn = "0.75rem", vr = "var(--pp-reader-chart-baseline, rgba(96, 125, 139, 0.75))", Sr = "6 4", Xo = 24 * 60 * 60 * 1e3;
function Zo(e) {
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
function Jo(e) {
  return typeof e == "string" ? e : typeof e == "number" && Number.isFinite(e) ? e.toString() : e instanceof Date && Number.isFinite(e.getTime()) ? e.toISOString() : "";
}
function J(e) {
  return `${String(e)}px`;
}
function te(e, t = {}) {
  const n = document.createElementNS(Yo, e);
  return Object.entries(t).forEach(([r, i]) => {
    const o = Zo(i);
    o != null && n.setAttribute(r, o);
  }), n;
}
function ot(e, t = null) {
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
    const r = t.date, i = Jo(r);
    if (i)
      return i;
  }
  return Number.isFinite(e) ? e.toString() : "";
}, Er = (e, t, n) => (Number.isFinite(e) ? e : ot(e, 0) ?? 0).toLocaleString("de-DE", {
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
    width: Te,
    height: $e,
    margin: { ...De },
    series: [],
    points: [],
    range: null,
    xAccessor: Ar,
    yAccessor: Nr,
    xFormatter: wr,
    yFormatter: Er,
    tooltipRenderer: Fr,
    markerTooltipRenderer: Cr,
    color: ke,
    areaColor: Mt,
    baseline: null,
    handlersAttached: !1,
    markers: [],
    markerPositions: []
  }), e.__chartState;
}
function ee(e, t, n) {
  return !Number.isFinite(e) || e < t ? t : e > n ? n : e;
}
function Qo(e, t) {
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
function ea(e) {
  if (e.length === 0)
    return "";
  const t = [];
  return e.forEach((n, r) => {
    const i = r === 0 ? "M" : "L", o = n.x.toFixed(2), a = n.y.toFixed(2);
    t.push(`${i}${o} ${a}`);
  }), t.join(" ");
}
function ta(e) {
  const { baselineLine: t, baseline: n } = e;
  if (!t)
    return;
  const r = (n == null ? void 0 : n.color) ?? vr, i = (n == null ? void 0 : n.dashArray) ?? Sr;
  t.setAttribute("stroke", r), t.setAttribute("stroke-dasharray", i);
}
function wt(e) {
  const { baselineLine: t, baseline: n, range: r, margin: i, width: o } = e;
  if (!t)
    return;
  const a = n == null ? void 0 : n.value;
  if (!r || a == null || !Number.isFinite(a)) {
    t.style.opacity = "0";
    return;
  }
  const { minY: s, maxY: c, boundedHeight: l } = r, u = Number.isFinite(s) ? s : a, d = (Number.isFinite(c) ? c : u + 1) - u, g = d === 0 ? 0.5 : (a - u) / d, p = ee(g, 0, 1), m = Math.max(l, 0), y = i.top + (1 - p) * m, h = Math.max(o - i.left - i.right, 0), _ = i.left, b = i.left + h;
  t.setAttribute("x1", _.toFixed(2)), t.setAttribute("x2", b.toFixed(2)), t.setAttribute("y1", y.toFixed(2)), t.setAttribute("y2", y.toFixed(2)), t.style.opacity = "1";
}
function na(e, t, n) {
  var w;
  const { width: r, height: i, margin: o } = t, { xAccessor: a, yAccessor: s } = n;
  if (e.length === 0)
    return { points: [], range: null };
  const c = e.map((E, H) => {
    const v = a(E, H), C = s(E, H), B = Pr(v, H), K = ot(C, Number.NaN);
    return Number.isFinite(K) ? {
      index: H,
      data: E,
      xValue: B,
      yValue: K
    } : null;
  }).filter((E) => !!E);
  if (c.length === 0)
    return { points: [], range: null };
  const l = c.reduce((E, H) => Math.min(E, H.xValue), c[0].xValue), u = c.reduce((E, H) => Math.max(E, H.xValue), c[0].xValue), f = c.reduce((E, H) => Math.min(E, H.yValue), c[0].yValue), d = c.reduce((E, H) => Math.max(E, H.yValue), c[0].yValue), g = Math.max(r - o.left - o.right, 1), p = Math.max(i - o.top - o.bottom, 1), m = Number.isFinite(l) ? l : 0, y = Number.isFinite(u) ? u : m + 1, h = Number.isFinite(f) ? f : 0, _ = Number.isFinite(d) ? d : h + 1, b = ot((w = t.baseline) == null ? void 0 : w.value, null), S = b != null && Number.isFinite(b) ? Math.min(h, b) : h, P = b != null && Number.isFinite(b) ? Math.max(_, b) : _, N = Math.max(
    2,
    Math.min(
      6,
      Math.round(
        Math.max(i - o.top - o.bottom, 0) / 60
      ) || 4
    )
  ), { niceMin: A, niceMax: R } = ua(
    S,
    P,
    N
  ), x = Number.isFinite(A) ? A : h, F = Number.isFinite(R) ? R : _, k = y - m || 1, T = F - x || 1;
  return {
    points: c.map((E) => {
      const H = k === 0 ? 0.5 : (E.xValue - m) / k, v = T === 0 ? 0.5 : (E.yValue - x) / T, C = o.left + H * g, B = o.top + (1 - v) * p;
      return {
        ...E,
        x: C,
        y: B
      };
    }),
    range: {
      minX: m,
      maxX: y,
      minY: x,
      maxY: F,
      boundedWidth: g,
      boundedHeight: p
    }
  };
}
function Et(e) {
  const { markerLayer: t, markerOverlay: n, markers: r, range: i, margin: o, markerTooltip: a } = e;
  if (e.markerPositions = [], Je(e), !t || !n)
    return;
  for (; t.firstChild; )
    t.removeChild(t.firstChild);
  for (; n.firstChild; )
    n.removeChild(n.firstChild);
  if (!i || !Array.isArray(r) || r.length === 0)
    return;
  const s = i.maxX - i.minX || 1, c = i.maxY - i.minY || 1;
  r.forEach((l, u) => {
    const f = Pr(l.x, u), d = ot(l.y, Number.NaN), g = Number(d);
    if (!Number.isFinite(f) || !Number.isFinite(g))
      return;
    const p = s === 0 ? 0.5 : ee((f - i.minX) / s, 0, 1), m = c === 0 ? 0.5 : ee((g - i.minY) / c, 0, 1), y = o.left + p * i.boundedWidth, h = o.top + (1 - m) * i.boundedHeight, _ = te("g", {
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
  e.width = Number.isFinite(t) ? Number(t) : Te, e.height = Number.isFinite(n) ? Number(n) : $e, e.margin = {
    top: Number.isFinite(r == null ? void 0 : r.top) ? Number(r == null ? void 0 : r.top) : De.top,
    right: Number.isFinite(r == null ? void 0 : r.right) ? Number(r == null ? void 0 : r.right) : De.right,
    bottom: Number.isFinite(r == null ? void 0 : r.bottom) ? Number(r == null ? void 0 : r.bottom) : De.bottom,
    left: Number.isFinite(r == null ? void 0 : r.left) ? Number(r == null ? void 0 : r.left) : De.left
  };
}
function ra(e, t) {
  const n = e.xFormatter(t.xValue, t.data, t.index), r = e.yFormatter(t.yValue, t.data, t.index);
  return e.tooltipRenderer({
    point: t,
    xFormatted: n,
    yFormatted: r,
    data: t.data,
    index: t.index
  });
}
function ia(e, t, n) {
  const { tooltip: r, width: i, margin: o, height: a } = e;
  if (!r)
    return;
  const s = a - o.bottom;
  r.style.visibility = "visible", r.style.opacity = "1";
  const c = r.offsetWidth || 0, l = r.offsetHeight || 0, u = ee(t.x - c / 2, o.left, i - o.right - c), f = Math.max(s - l, 0), d = 12, g = Number.isFinite(n) ? ee(n ?? 0, o.top, s) : t.y;
  let p = g - l - d;
  p < o.top && (p = g + d), p = ee(p, 0, f);
  const m = J(Math.round(u)), y = J(Math.round(p));
  r.style.transform = `translate(${m}, ${y})`;
}
function Ht(e) {
  const { tooltip: t, focusLine: n, focusCircle: r } = e;
  t && (t.style.opacity = "0", t.style.visibility = "hidden"), n && (n.style.opacity = "0"), r && (r.style.opacity = "0");
}
function oa(e, t) {
  const { marker: n } = t, r = e.xFormatter(t.marker.x, n, -1), i = e.yFormatter(t.marker.y, n, -1);
  return e.markerTooltipRenderer({
    marker: n,
    xFormatted: r,
    yFormatted: i
  });
}
function aa(e, t, n) {
  var N;
  const { markerTooltip: r, width: i, margin: o, height: a, tooltip: s } = e;
  if (!r)
    return;
  const c = a - o.bottom;
  r.style.visibility = "visible", r.style.opacity = "1";
  const l = r.offsetWidth || 0, u = r.offsetHeight || 0, f = ee(t.x - l / 2, o.left, i - o.right - l), d = Math.max(c - u, 0), g = 10, p = s == null ? void 0 : s.getBoundingClientRect(), m = (N = e.svg) == null ? void 0 : N.getBoundingClientRect(), y = p && m ? p.top - m.top : null, h = p && m ? p.bottom - m.top : null, _ = Number.isFinite(n) ? ee(n ?? t.y, o.top, c) : t.y;
  let b;
  y != null && h != null ? y <= _ ? b = y - u - g : b = h + g : (b = _ - u - g, b < o.top && (b = _ + g)), b = ee(b, 0, d);
  const S = J(Math.round(f)), P = J(Math.round(b));
  r.style.transform = `translate(${S}, ${P})`;
}
function Je(e) {
  const { markerTooltip: t } = e;
  t && (t.style.opacity = "0", t.style.visibility = "hidden");
}
function sa(e, t, n) {
  let i = null, o = 24 * 24;
  for (const a of e.markerPositions) {
    const s = a.x - t, c = a.y - n, l = s * s + c * c;
    l <= o && (i = a, o = l);
  }
  return i;
}
function ca(e, t) {
  if (t.handlersAttached || !t.overlay)
    return;
  const n = (i) => {
    if (t.points.length === 0 || !t.svg) {
      Ht(t), Je(t);
      return;
    }
    const o = t.svg.getBoundingClientRect(), a = i.clientX - o.left, s = i.clientY - o.top;
    let c = t.points[0], l = Math.abs(a - c.x);
    for (let f = 1; f < t.points.length; f += 1) {
      const d = t.points[f], g = Math.abs(a - d.x);
      g < l && (l = g, c = d);
    }
    t.focusCircle && (t.focusCircle.setAttribute("cx", c.x.toFixed(2)), t.focusCircle.setAttribute("cy", c.y.toFixed(2)), t.focusCircle.style.opacity = "1"), t.focusLine && (t.focusLine.setAttribute("x1", c.x.toFixed(2)), t.focusLine.setAttribute("x2", c.x.toFixed(2)), t.focusLine.setAttribute("y1", t.margin.top.toFixed(2)), t.focusLine.setAttribute(
      "y2",
      (t.height - t.margin.bottom).toFixed(2)
    ), t.focusLine.style.opacity = "1"), t.tooltip && (t.tooltip.innerHTML = ra(t, c), ia(t, c, s));
    const u = sa(t, a, s);
    u && t.markerTooltip ? (t.markerTooltip.innerHTML = oa(t, u), aa(t, u, s)) : Je(t);
  }, r = () => {
    Ht(t), Je(t);
  };
  t.overlay.addEventListener("pointermove", n), t.overlay.addEventListener("pointerenter", n), t.overlay.addEventListener("pointerleave", r), t.handlersAttached = !0, t.handlePointerMove = n, t.handlePointerLeave = r, e.addEventListener("pointercancel", r);
}
function la(e, t = {}) {
  const n = document.createElement("div");
  n.className = "line-chart-container", n.dataset.chartType = "line", n.style.position = "relative";
  const r = te("svg", {
    width: Te,
    height: $e,
    viewBox: `0 0 ${String(Te)} ${String($e)}`,
    role: "img",
    "aria-hidden": "true",
    focusable: "false"
  });
  r.classList.add("line-chart-svg");
  const i = te("path", {
    class: "line-chart-area",
    fill: Mt,
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
    stroke: ke,
    "stroke-width": 2,
    "stroke-linecap": "round",
    "stroke-linejoin": "round"
  }), s = te("line", {
    class: "line-chart-focus-line",
    stroke: ke,
    "stroke-width": 1,
    "stroke-dasharray": "4 4",
    opacity: 0
  }), c = te("circle", {
    class: "line-chart-focus-circle",
    r: 4,
    fill: "#fff",
    stroke: ke,
    "stroke-width": 2,
    opacity: 0
  }), l = te("g", {
    class: "line-chart-markers"
  }), u = te("rect", {
    class: "line-chart-overlay",
    fill: "transparent",
    x: 0,
    y: 0,
    width: Te,
    height: $e
  });
  r.appendChild(i), r.appendChild(o), r.appendChild(a), r.appendChild(s), r.appendChild(c), r.appendChild(l), r.appendChild(u), n.appendChild(r);
  const f = document.createElement("div");
  f.className = "chart-tooltip", f.style.position = "absolute", f.style.top = "0", f.style.left = "0", f.style.pointerEvents = "none", f.style.opacity = "0", f.style.visibility = "hidden", n.appendChild(f);
  const d = document.createElement("div");
  d.className = "line-chart-marker-overlay", d.style.position = "absolute", d.style.top = "0", d.style.left = "0", d.style.width = "100%", d.style.height = "100%", d.style.pointerEvents = "none", d.style.overflow = "visible", d.style.zIndex = "2", n.appendChild(d);
  const g = document.createElement("div");
  g.className = "chart-tooltip chart-tooltip--marker", g.style.position = "absolute", g.style.top = "0", g.style.left = "0", g.style.pointerEvents = "none", g.style.opacity = "0", g.style.visibility = "hidden", n.appendChild(g), e.appendChild(n);
  const p = xr(n);
  if (p.svg = r, p.areaPath = i, p.linePath = a, p.baselineLine = o, p.focusLine = s, p.focusCircle = c, p.overlay = u, p.tooltip = f, p.markerOverlay = d, p.markerLayer = l, p.markerTooltip = g, p.xAccessor = t.xAccessor ?? Ar, p.yAccessor = t.yAccessor ?? Nr, p.xFormatter = t.xFormatter ?? wr, p.yFormatter = t.yFormatter ?? Er, p.tooltipRenderer = t.tooltipRenderer ?? Fr, p.markerTooltipRenderer = t.markerTooltipRenderer ?? Cr, p.color = t.color ?? ke, p.areaColor = t.areaColor ?? Mt, p.baseline = t.baseline ?? null, p.handlersAttached = !1, p.markers = Array.isArray(t.markers) ? t.markers.slice() : [], !p.xAxis) {
    const m = document.createElement("div");
    m.className = "line-chart-axis line-chart-axis-x", m.style.position = "absolute", m.style.left = "0", m.style.right = "0", m.style.bottom = "0", m.style.pointerEvents = "none", m.style.fontSize = Cn, m.style.color = "var(--secondary-text-color)", m.style.display = "block", n.appendChild(m), p.xAxis = m;
  }
  if (!p.yAxis) {
    const m = document.createElement("div");
    m.className = "line-chart-axis line-chart-axis-y", m.style.position = "absolute", m.style.top = "0", m.style.bottom = "0", m.style.left = "0", m.style.pointerEvents = "none", m.style.fontSize = Cn, m.style.color = "var(--secondary-text-color)", m.style.display = "block", n.appendChild(m), p.yAxis = m;
  }
  return Dr(p, t.width, t.height, t.margin), a.setAttribute("stroke", p.color), s.setAttribute("stroke", p.color), c.setAttribute("stroke", p.color), i.setAttribute("fill", p.areaColor), kr(n, t), ca(n, p), n;
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
  t.xAccessor && (n.xAccessor = t.xAccessor), t.yAccessor && (n.yAccessor = t.yAccessor), t.xFormatter && (n.xFormatter = t.xFormatter), t.yFormatter && (n.yFormatter = t.yFormatter), t.tooltipRenderer && (n.tooltipRenderer = t.tooltipRenderer), t.markerTooltipRenderer && (n.markerTooltipRenderer = t.markerTooltipRenderer), t.color && (n.color = t.color, n.linePath.setAttribute("stroke", n.color), n.focusLine && n.focusLine.setAttribute("stroke", n.color), n.focusCircle && n.focusCircle.setAttribute("stroke", n.color)), t.areaColor && (n.areaColor = t.areaColor, n.areaPath && n.areaPath.setAttribute("fill", n.areaColor)), Object.prototype.hasOwnProperty.call(t, "baseline") && (n.baseline = t.baseline ?? null), Array.isArray(t.markers) && (n.markers = t.markers.slice()), ta(n), Dr(n, t.width, t.height, t.margin);
  const { width: r, height: i } = n;
  n.svg.setAttribute("width", String(r)), n.svg.setAttribute("height", String(i)), n.svg.setAttribute("viewBox", `0 0 ${String(r)} ${String(i)}`), n.overlay.setAttribute("x", "0"), n.overlay.setAttribute("y", "0"), n.overlay.setAttribute("width", Math.max(r, 0).toFixed(2)), n.overlay.setAttribute("height", Math.max(i, 0).toFixed(2)), Array.isArray(t.series) && (n.series = Array.from(t.series));
  const { points: o, range: a } = na(n.series, n, {
    xAccessor: n.xAccessor,
    yAccessor: n.yAccessor
  });
  if (n.points = o, n.range = a, o.length === 0) {
    n.linePath.setAttribute("d", ""), n.areaPath && n.areaPath.setAttribute("d", ""), Ht(n), Et(n), Ft(n), wt(n);
    return;
  }
  if (o.length === 1) {
    const c = o[0], l = Math.max(
      0.5,
      Math.min(4, Math.max(n.width - n.margin.left - n.margin.right, 1) * 0.01)
    ), u = `M${c.x.toFixed(2)} ${c.y.toFixed(2)} h${l.toFixed(2)}`;
    n.linePath.setAttribute("d", u), n.areaPath && n.areaPath.setAttribute("d", ""), n.focusCircle && (n.focusCircle.setAttribute("cx", c.x.toFixed(2)), n.focusCircle.setAttribute("cy", c.y.toFixed(2)), n.focusCircle.style.opacity = "1"), n.focusLine && (n.focusLine.style.opacity = "0"), Ft(n), wt(n), Et(n);
    return;
  }
  const s = ea(o);
  if (n.linePath.setAttribute("d", s), n.areaPath && a) {
    const c = n.margin.top + a.boundedHeight, l = Qo(o, c);
    n.areaPath.setAttribute("d", l);
  }
  Ft(n), wt(n), Et(n);
}
function Ft(e) {
  const { xAxis: t, yAxis: n, range: r, margin: i, height: o, yFormatter: a } = e;
  if (!t || !n)
    return;
  if (!r) {
    t.innerHTML = "", n.innerHTML = "";
    return;
  }
  const { minX: s, maxX: c, minY: l, maxY: u, boundedWidth: f, boundedHeight: d } = r, g = Number.isFinite(s) && Number.isFinite(c) && c >= s, p = Number.isFinite(l) && Number.isFinite(u) && u >= l, m = Math.max(f, 0), y = Math.max(d, 0);
  if (t.style.left = J(i.left), t.style.width = J(m), t.style.top = J(o - i.bottom + 6), t.innerHTML = "", g && m > 0) {
    const _ = (c - s) / Xo, b = Math.max(2, Math.min(6, Math.round(m / 140) || 4));
    da(e, s, c, b, _).forEach(({ positionRatio: P, label: N }) => {
      const A = document.createElement("div");
      A.className = "line-chart-axis-tick line-chart-axis-tick-x", A.style.position = "absolute", A.style.bottom = "0";
      const R = ee(P, 0, 1);
      A.style.left = J(R * m);
      let x = "-50%", F = "center";
      R <= 1e-3 ? (x = "0", F = "left", A.style.marginLeft = "2px") : R >= 0.999 && (x = "-100%", F = "right", A.style.marginRight = "2px"), A.style.transform = `translateX(${x})`, A.style.textAlign = F, A.textContent = N, t.appendChild(A);
    });
  }
  n.style.top = J(i.top), n.style.height = J(y);
  const h = Math.max(i.left - 6, 0);
  if (n.style.left = "0", n.style.width = J(Math.max(h, 0)), n.innerHTML = "", p && y > 0) {
    const _ = Math.max(2, Math.min(6, Math.round(y / 60) || 4)), b = fa(l, u, _), S = a;
    b.forEach(({ value: P, positionRatio: N }) => {
      const A = document.createElement("div");
      A.className = "line-chart-axis-tick line-chart-axis-tick-y", A.style.position = "absolute", A.style.left = "0";
      const x = (1 - ee(N, 0, 1)) * y;
      A.style.top = J(x), A.textContent = S(P, null, -1), n.appendChild(A);
    });
  }
}
function ua(e, t, n = 4) {
  if (!Number.isFinite(e) || !Number.isFinite(t))
    return {
      niceMin: e,
      niceMax: t
    };
  const r = Math.max(2, n);
  if (t === e) {
    const l = It(Math.abs(e) || 1);
    return {
      niceMin: e - l,
      niceMax: t + l
    };
  }
  const o = (t - e) / (r - 1), a = It(o), s = Math.floor(e / a) * a, c = Math.ceil(t / a) * a;
  return s === c ? {
    niceMin: e,
    niceMax: t + a
  } : {
    niceMin: s,
    niceMax: c
  };
}
function da(e, t, n, r, i) {
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
function fa(e, t, n) {
  if (!Number.isFinite(e) || !Number.isFinite(t))
    return [];
  if (t === e)
    return [
      {
        value: e,
        positionRatio: 0.5
      }
    ];
  const r = t - e, i = Math.max(2, n), o = r / (i - 1), a = It(o), s = Math.floor(e / a) * a, c = Math.ceil(t / a) * a, l = [];
  for (let u = s; u <= c + a / 2; u += a) {
    const f = (u - e) / (t - e);
    l.push({
      value: u,
      positionRatio: ee(f, 0, 1)
    });
  }
  return l.length > i + 2 ? l.filter((u, f) => f % 2 === 0) : l;
}
function It(e) {
  if (!Number.isFinite(e) || e === 0)
    return 1;
  const t = Math.floor(Math.log10(Math.abs(e))), n = Math.abs(e) / 10 ** t;
  let r;
  return n <= 1 ? r = 1 : n <= 2 ? r = 2 : n <= 5 ? r = 5 : r = 10, r * 10 ** t;
}
function ga(e) {
  return Array.isArray(e) && e.every((t) => typeof t == "string");
}
function pa(e) {
  return typeof e == "object" && e !== null;
}
function ha(e) {
  if (!pa(e))
    return !1;
  const t = e;
  return typeof t.portfolioUuid != "string" ? !1 : ga(t.securityUuids);
}
function ma(e) {
  return e instanceof CustomEvent ? ha(e.detail) : !1;
}
const Ct = { min: 0, max: 6 }, at = { min: 2, max: 4 }, _a = "1Y", Tr = [
  "1M",
  "6M",
  "1Y",
  "5Y",
  "ALL"
], ya = {
  "1M": 30,
  "6M": 182,
  "1Y": 365,
  "5Y": 1826,
  ALL: Number.POSITIVE_INFINITY
}, ba = /* @__PURE__ */ new Set([0, 2]), va = /* @__PURE__ */ new Set([1, 3]), Sa = "var(--pp-reader-chart-marker-buy, #2e7d32)", Pa = "var(--pp-reader-chart-marker-sell, #c0392b)", xt = {
  aggregation: "Aggregationsdaten",
  totals: "Kaufsummen",
  eur_total: "EUR-Kaufsumme"
}, ye = /* @__PURE__ */ new Map(), Qe = /* @__PURE__ */ new Map(), ze = /* @__PURE__ */ new Map(), be = /* @__PURE__ */ new Map(), $r = "pp-reader:portfolio-positions-updated", Re = /* @__PURE__ */ new Map();
function Aa(e) {
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
function Na(e, t) {
  if (e) {
    if (t) {
      ze.set(e, t);
      return;
    }
    ze.delete(e);
  }
}
function wa(e) {
  if (!e || typeof window > "u")
    return null;
  if (ze.has(e)) {
    const t = ze.get(e) || null;
    if (t)
      return t;
  }
  return null;
}
function Rr(e) {
  return ye.has(e) || ye.set(e, /* @__PURE__ */ new Map()), ye.get(e);
}
function Lr(e) {
  return be.has(e) || be.set(e, /* @__PURE__ */ new Map()), be.get(e);
}
function Mr(e) {
  if (e) {
    if (ye.has(e)) {
      try {
        const t = ye.get(e);
        t && t.clear();
      } catch (t) {
        console.warn("invalidateHistoryCache: Konnte Cache nicht leeren", e, t);
      }
      ye.delete(e);
    }
    if (be.has(e)) {
      try {
        const t = be.get(e);
        t == null || t.clear();
      } catch (t) {
        console.warn("invalidateHistoryCache: Konnte Marker-Cache nicht leeren", e, t);
      }
      be.delete(e);
    }
  }
}
function Hr(e) {
  e && ze.delete(e);
}
function Ea(e, t) {
  if (!e || !t)
    return;
  const n = t.securityUuids;
  (Array.isArray(n) ? n : []).includes(e) && (Mr(e), Hr(e));
}
function Fa(e) {
  if (!e || Re.has(e))
    return;
  const t = (n) => {
    ma(n) && Ea(e, n.detail);
  };
  try {
    window.addEventListener($r, t), Re.set(e, t);
  } catch (n) {
    console.error("ensureLiveUpdateSubscription: Registrierung fehlgeschlagen", n);
  }
}
function Ca(e) {
  if (!e || !Re.has(e))
    return;
  const t = Re.get(e);
  try {
    t && window.removeEventListener($r, t);
  } catch (n) {
    console.error("removeLiveUpdateSubscription: Entfernen des Listeners fehlgeschlagen", n);
  }
  Re.delete(e);
}
function xa(e) {
  e && (Ca(e), Mr(e), Hr(e));
}
function Dn(e, t) {
  if (!Qe.has(e)) {
    Qe.set(e, { activeRange: t });
    return;
  }
  const n = Qe.get(e);
  n && (n.activeRange = t);
}
function Ir(e) {
  var t;
  return ((t = Qe.get(e)) == null ? void 0 : t.activeRange) ?? _a;
}
function Vt(e) {
  const t = Date.UTC(
    e.getUTCFullYear(),
    e.getUTCMonth(),
    e.getUTCDate()
  );
  return Math.floor(t / 864e5);
}
function Pe(e) {
  const t = new Date(e.getTime());
  return t.setUTCHours(0, 0, 0, 0), t;
}
function kn(e) {
  return !(e instanceof Date) || Number.isNaN(e.getTime()) ? null : Vt(Pe(e));
}
function O(e) {
  return oe(e);
}
function Da(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t || null;
}
function st(e) {
  const t = Da(e);
  return t ? t.toUpperCase() : null;
}
function Vr(e, t = "Unbekannter Fehler") {
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
function ct(e, t) {
  const n = Pe(t instanceof Date ? t : /* @__PURE__ */ new Date()), r = ya[e], i = kn(n), o = {};
  if (i != null && (o.end_date = i), Number.isFinite(r) && r > 0) {
    const a = new Date(n.getTime());
    a.setUTCDate(a.getUTCDate() - (r - 1));
    const s = kn(a);
    s != null && (o.start_date = s);
  }
  return o;
}
function an(e) {
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
      return Number.isNaN(n.getTime()) ? null : Pe(n);
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
          return Pe(r);
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
function ka(e) {
  const t = an(e);
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
function lt(e) {
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
function Ut(e) {
  return Array.isArray(e) ? e.map((t) => {
    let r = O(t.close);
    if (r == null) {
      const o = O(t.close_raw);
      o != null && (r = o / 1e8);
    }
    return r == null ? null : {
      date: an(t.date) ?? t.date,
      close: r
    };
  }).filter((t) => !!t) : [];
}
function ut(e, t) {
  if (!Array.isArray(e))
    return [];
  const n = [], r = (t || "").toUpperCase() || "EUR";
  return e.forEach((i, o) => {
    const a = typeof i.type == "number" ? i.type : Number(i.type), s = ba.has(a), c = va.has(a);
    if (!s && !c)
      return;
    const l = ka(i.date), u = O(i.price);
    if (!l || u == null)
      return;
    const f = typeof i.currency_code == "string" && i.currency_code.trim() ? i.currency_code.toUpperCase() : r, d = O(i.shares), g = O(i.net_price_eur), p = s ? "Kauf" : "Verkauf", m = d != null ? `${Or(d)} @ ` : "", y = `${p} ${m}${fe(u)} ${f}`, h = c && g != null ? `${y} (netto ${fe(g)} EUR)` : y, _ = s ? Sa : Pa, b = typeof i.uuid == "string" && i.uuid.trim() || `${p}-${l.getTime().toString()}-${o.toString()}`;
    n.push({
      id: b,
      x: l.getTime(),
      y: u,
      color: _,
      label: h,
      payload: {
        type: p,
        currency: f,
        shares: d,
        price: u,
        netPriceEur: g,
        date: l.toISOString(),
        portfolio: i.portfolio
      }
    });
  }), n;
}
function sn(e) {
  var r;
  const t = O(e == null ? void 0 : e.last_price_native) ?? O((r = e == null ? void 0 : e.last_price) == null ? void 0 : r.native) ?? null;
  if (D(t))
    return t;
  if (st(e == null ? void 0 : e.currency_code) === "EUR") {
    const i = O(e == null ? void 0 : e.last_price_eur);
    if (D(i))
      return i;
  }
  return null;
}
function Ta(e) {
  if (!e)
    return null;
  const n = e.last_price_fetched_at, r = lt(n);
  if (r != null)
    return r;
  const i = e.last_price, o = i == null ? void 0 : i.fetched_at;
  return lt(o) ?? null;
}
function zt(e, t) {
  let n = [];
  Array.isArray(e) && (n = e.map((l) => ({
    ...l
  })));
  const r = n.slice(), i = sn(t);
  if (!D(i))
    return r;
  const o = Ta(t) ?? Date.now(), a = new Date(o);
  if (Number.isNaN(a.getTime()))
    return r;
  const s = Vt(Pe(a));
  let c = null;
  for (let l = r.length - 1; l >= 0; l -= 1) {
    const u = r[l], f = an(u.date);
    if (!f)
      continue;
    const d = Vt(Pe(f));
    if (c == null && (c = d), d === s)
      return u.close !== i && (r[l] = { ...u, close: i }), r;
    if (d < s)
      break;
  }
  return c != null && c > s || r.push({
    date: a,
    close: i
  }), r;
}
function D(e) {
  return typeof e == "number" && Number.isFinite(e);
}
function Dt(e) {
  return typeof e == "number" && Number.isFinite(e) && e > 0;
}
function Le(e, t, n) {
  if (!D(e) || !D(t))
    return !1;
  const r = Math.abs(e - t), i = Math.max(Math.abs(e), Math.abs(t), 1);
  return r <= i * 1e-4;
}
function $a(e, t) {
  return !D(t) || t === 0 || !D(e) ? null : Vi((e - t) / t * 100);
}
function Ur(e, t) {
  if (e.length === 0)
    return { priceChange: null, priceChangePct: null };
  const n = e[0], r = O(n.close);
  if (!D(r) || r === 0)
    return { priceChange: null, priceChangePct: null };
  const i = e[e.length - 1], o = O(i.close), a = O(t) ?? o;
  if (!D(a))
    return { priceChange: null, priceChangePct: null };
  const s = a - r, c = Object.is(s, -0) ? 0 : s, l = $a(a, r);
  return { priceChange: c, priceChangePct: l };
}
function cn(e, t) {
  if (!D(e) || e === 0)
    return "neutral";
  const n = 0.5 / Math.pow(10, t);
  return Math.abs(e) < n ? "neutral" : e > 0 ? "positive" : "negative";
}
function Ra(e, t) {
  if (!D(e))
    return '<span class="value neutral">—</span>';
  const n = fe(e);
  if (n === "—")
    return '<span class="value neutral">—</span>';
  const r = cn(e, at.max), i = t ? `&nbsp;${t}` : "";
  return `<span class="value ${r}">${n}${i}</span>`;
}
function La(e) {
  return D(e) ? `<span class="value ${cn(e, 2)} value--percentage">${se(e)}&nbsp;%</span>` : '<span class="value neutral">—</span>';
}
function zr(e, t, n, r) {
  const i = e, o = i.length > 0 ? i : "Zeitraum";
  return `
    <div class="security-info-bar" data-range="${i}">
      <div class="security-info-item">
        <span class="label">Preisänderung (${o})</span>
        <div class="value-row">
          ${Ra(t, r)}
          ${La(n)}
        </div>
      </div>
    </div>
  `;
}
function Ma(e) {
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
function qr(e, t = { status: "empty" }) {
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
      const r = Vr(
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
function Or(e) {
  const t = O(e);
  if (t == null)
    return "—";
  const n = Math.abs(t % 1) > 0, r = n ? 2 : Ct.min, i = n ? Ct.max : Ct.min;
  return t.toLocaleString("de-DE", {
    minimumFractionDigits: r,
    maximumFractionDigits: i
  });
}
function fe(e) {
  const t = O(e);
  return t == null ? "—" : t.toLocaleString("de-DE", {
    minimumFractionDigits: at.min,
    maximumFractionDigits: at.max
  });
}
function Ha(e, t) {
  const n = fe(e), r = `&nbsp;${t}`;
  return `<span class="${cn(e, at.max)}">${n}${r}</span>`;
}
function Br(e) {
  return e == null ? "" : (typeof e == "string" ? e : String(e)).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function Ia(e, t) {
  const n = e == null ? void 0 : e.ticker_symbol;
  if (typeof n == "string" && n.trim())
    return n.trim();
  const r = typeof (e == null ? void 0 : e.name) == "string" ? e.name.trim() : "";
  return r || (typeof t == "string" ? t : "");
}
function Va(e) {
  return `
    <div class="news-prompt-container">
      <button
        type="button"
        class="news-prompt-button"
        data-symbol="${Br(e)}"
      >
        Check recent news via ChatGPT
      </button>
    </div>
  `;
}
async function Ua(e) {
  typeof navigator > "u" || "clipboard" in navigator && typeof navigator.clipboard.writeText == "function" && await navigator.clipboard.writeText(e);
}
function za(e, t, n) {
  const r = We(e == null ? void 0 : e.average_cost), i = (r == null ? void 0 : r.account) ?? (D(t) ? t : O(t));
  if (!D(i))
    return null;
  const o = (e == null ? void 0 : e.account_currency_code) ?? (e == null ? void 0 : e.account_currency);
  if (typeof o == "string" && o.trim())
    return o.trim().toUpperCase();
  const a = st(e == null ? void 0 : e.currency_code) ?? "", s = (r == null ? void 0 : r.security) ?? (r == null ? void 0 : r.native) ?? (D(n) ? n : O(n)), c = er(e == null ? void 0 : e.aggregation);
  if (a && D(s) && Le(i, s))
    return a;
  const l = O(c == null ? void 0 : c.purchase_total_security) ?? O(e == null ? void 0 : e.purchase_total_security), u = O(c == null ? void 0 : c.purchase_total_account) ?? O(e == null ? void 0 : e.purchase_total_account);
  let f = null;
  if (D(l) && l !== 0 && D(u) && (f = u / l), (r == null ? void 0 : r.source) === "eur_total")
    return "EUR";
  const g = r == null ? void 0 : r.eur;
  if (D(g) && Le(i, g))
    return "EUR";
  const p = O(e == null ? void 0 : e.purchase_value_eur);
  return D(p) ? "EUR" : f != null && Le(f, 1) ? a || null : a === "EUR" ? "EUR" : a || "EUR";
}
function Tn(e) {
  return typeof e != "number" || !Number.isFinite(e) || e <= 0 ? null : e.toLocaleString("de-DE", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
  });
}
function qa(e) {
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
    const a = t == null ? void 0 : t[o], s = lt(a);
    if (s != null)
      return s;
  }
  const r = [];
  t && "last_price_fetched_at" in t && r.push(t.last_price_fetched_at);
  const i = e == null ? void 0 : e.last_price;
  i && typeof i == "object" && r.push(i.fetched_at), t && "last_price_date" in t && r.push(t.last_price_date);
  for (const o of r) {
    const a = lt(o);
    if (a != null)
      return a;
  }
  return null;
}
function Oa(e) {
  if (e == null || !Number.isFinite(e))
    return null;
  const t = new Date(e);
  return Number.isNaN(t.getTime()) ? null : t.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}
function Ba(e, t) {
  if (!e)
    return null;
  const n = st(e.currency_code) ?? "", r = We(e.average_cost);
  if (!r || !n)
    return null;
  const i = r.native ?? r.security ?? null;
  let a = r.account ?? r.eur ?? null, s = st(t) ?? "";
  if (Dt(r.eur) && (!s || s === n) && (a = r.eur, s = "EUR"), !n || !s || n === s || !Dt(i) || !Dt(a))
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
  const f = qa(e), d = Oa(f), g = [`FX-Kurs (Kauf): 1 ${n} = ${l} ${s}`];
  u && g.push(`1 ${s} = ${u} ${n}`);
  const p = [], m = r.source, y = m in xt ? xt[m] : xt.aggregation;
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
function $n(e) {
  if (!e)
    return null;
  const t = We(e.average_cost), n = (t == null ? void 0 : t.native) ?? (t == null ? void 0 : t.security) ?? null;
  return D(n) ? n : null;
}
function Rn(e) {
  var W;
  if (!e)
    return '<div class="meta-error">Keine Snapshot-Daten verfügbar.</div>';
  const t = e.currency_code || "EUR", n = e.total_holdings_precise ?? e.total_holdings, r = Or(n), i = e.last_price_native ?? ((W = e.last_price) == null ? void 0 : W.native) ?? e.last_price_eur, o = fe(i), a = o === "—" ? null : `${o}${`&nbsp;${t}`}`, s = O(e.market_value_eur) ?? O(e.current_value_eur) ?? null, c = We(e.average_cost), l = (c == null ? void 0 : c.native) ?? (c == null ? void 0 : c.security) ?? null, u = (c == null ? void 0 : c.eur) ?? null, d = (c == null ? void 0 : c.account) ?? null ?? u, g = ge(e.performance), p = (g == null ? void 0 : g.day_change) ?? null, m = (p == null ? void 0 : p.price_change_native) ?? null, y = (p == null ? void 0 : p.price_change_eur) ?? null, h = D(m) ? m : y, _ = D(m) ? t : "EUR", b = (I, $ = "") => {
    const U = ["value"];
    return $ && U.push(...$.split(" ").filter(Boolean)), `<span class="${U.join(" ")}">${I}</span>`;
  }, S = (I = "") => {
    const $ = ["value--missing"];
    return I && $.push(I), b("—", $.join(" "));
  }, P = (I, $ = "") => {
    if (!D(I))
      return S($);
    const U = ["value--gain"];
    return $ && U.push($), b(vi(I), U.join(" "));
  }, N = (I, $ = "") => {
    if (!D(I))
      return S($);
    const U = ["value--gain-percentage"];
    return $ && U.push($), b(Si(I), U.join(" "));
  }, A = a ? b(a, "value--price") : S("value--price"), R = r === "—" ? S("value--holdings") : b(r, "value--holdings"), x = D(s) ? b(`${se(s)}&nbsp;€`, "value--market-value") : S("value--market-value"), F = D(h) ? b(
    Ha(h, _),
    "value--gain value--absolute"
  ) : S("value--absolute"), k = N(
    p == null ? void 0 : p.change_pct,
    "value--percentage"
  ), T = P(
    g == null ? void 0 : g.total_change_eur,
    "value--absolute"
  ), L = N(
    g == null ? void 0 : g.total_change_pct,
    "value--percentage"
  ), w = za(
    e,
    d,
    l
  ), E = Ba(
    e,
    w
  ), H = E ? ` title="${Br(E)}"` : "", v = [], C = D(u);
  D(l) ? v.push(
    b(
      `${fe(l)}${`&nbsp;${t}`}`,
      "value--average value--average-native"
    )
  ) : v.push(
    S("value--average value--average-native")
  );
  let B = null, K = null;
  return C && (t !== "EUR" || !D(l) || !Le(u, l)) ? (B = u, K = "EUR") : D(d) && w && (w !== t || !Le(d, l ?? NaN)) && (B = d, K = w), B != null && D(B) && v.push(
    b(
      `${fe(B)}${K ? `&nbsp;${K}` : ""}`,
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
        <div class="value-group"${H}>
          ${v.join("")}
        </div>
      </div>
      <div class="security-meta-item security-meta-item--day-change">
        <span class="label">Tagesänderung</span>
        <div class="value-group">
          ${F}
          ${k}
        </div>
      </div>
      <div class="security-meta-item security-meta-item--total-change">
        <span class="label">Gesamtänderung</span>
        <div class="value-group">
          ${T}
          ${L}
        </div>
      </div>
      <div class="security-meta-item security-meta-item--holdings">
        <span class="label">Bestand</span>
        <div class="value-group">${R}</div>
      </div>
      <div class="security-meta-item security-meta-item--market-value">
        <span class="label">Marktwert (EUR)</span>
        <div class="value-group">${x}</div>
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
function Wa(e, t, {
  currency: n,
  baseline: r,
  markers: i
} = {}) {
  const o = e.clientWidth || e.offsetWidth || 0, a = o > 0 ? o : 640, s = Math.min(Math.max(Math.floor(a * 0.5), 240), 440), c = (n || "").toUpperCase() || "EUR", l = D(r) ? r : null, u = Math.max(48, Math.min(72, Math.round(a * 0.075))), f = Math.max(28, Math.min(56, Math.round(a * 0.05))), d = Math.max(40, Math.min(64, Math.round(s * 0.14)));
  return {
    width: a,
    height: s,
    margin: {
      top: 18,
      right: f,
      bottom: d,
      left: u
    },
    series: t,
    yFormatter: (g) => fe(g),
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
const Ln = /* @__PURE__ */ new WeakMap();
function ja(e, t, n = {}) {
  if (t.length === 0)
    return;
  const r = Wa(e, t, n);
  let i = Ln.get(e) ?? null;
  if (!i || !e.contains(i)) {
    e.innerHTML = "", i = la(e, r), i && Ln.set(e, i);
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
function Ka(e, t, n, r, i) {
  const o = e.querySelector(".security-info-bar");
  if (!o || !o.parentElement)
    return;
  const a = document.createElement("div");
  a.innerHTML = zr(t, n, r, i).trim();
  const s = a.firstElementChild;
  s && o.parentElement.replaceChild(s, o);
}
function Hn(e, t, n, r, i = {}) {
  const o = e.querySelector(".security-detail-placeholder");
  if (o && (o.innerHTML = `
    <h2>Historie</h2>
    ${qr(t, n)}
  `, n.status === "loaded" && Array.isArray(r) && r.length)) {
    const a = o.querySelector(".history-chart");
    a && requestAnimationFrame(() => {
      ja(a, r, i);
    });
  }
}
function Ga(e) {
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
    const u = Rr(i), f = Lr(i), d = $n(o);
    Array.isArray(s) && c.status !== "error" && u.set(a, s), Fa(i), Dn(i, a), Mn(l, a);
    const p = zt(
      s,
      o
    );
    let m = c;
    m.status !== "error" && (m = p.length ? { status: "loaded" } : { status: "empty" }), Hn(
      t,
      a,
      m,
      p,
      {
        currency: o == null ? void 0 : o.currency_code,
        baseline: d,
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
      let b = u.get(h) ?? null, S = f.get(h) ?? null, P = null, N = [];
      if (b)
        P = b.length ? { status: "loaded" } : { status: "empty" };
      else
        try {
          const T = ct(h), L = await et(
            n,
            r,
            i,
            T
          );
          b = Ut(L.prices), S = ut(
            L.transactions,
            o == null ? void 0 : o.currency_code
          ), u.set(h, b), S = Array.isArray(S) ? S : [], f.set(h, S), P = b.length ? { status: "loaded" } : { status: "empty" };
        } catch (T) {
          console.error("Range-Wechsel: Historie konnte nicht geladen werden", T), b = [], S = [], P = {
            status: "error",
            message: Wr(T) || "Die historischen Daten konnten aufgrund eines Fehlers nicht geladen werden."
          };
        }
      if (!Array.isArray(S))
        try {
          const T = ct(h), L = await et(
            n,
            r,
            i,
            T
          );
          S = ut(
            L.transactions,
            o == null ? void 0 : o.currency_code
          ), S = Array.isArray(S) ? S : [], f.set(h, S);
        } catch (T) {
          console.error("Range-Wechsel: Transaktionsmarker konnten nicht geladen werden", T), S = [];
        }
      N = zt(b, o), P.status !== "error" && (P = N.length ? { status: "loaded" } : { status: "empty" });
      const A = sn(o), { priceChange: R, priceChangePct: x } = Ur(
        N,
        A
      ), F = Array.isArray(S) ? S : [];
      Dn(i, h), Mn(l, h), Ka(
        t,
        h,
        R,
        x,
        o == null ? void 0 : o.currency_code
      );
      const k = $n(o);
      Hn(
        t,
        h,
        P,
        N,
        {
          currency: o == null ? void 0 : o.currency_code,
          baseline: k,
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
      !b || !Tr.includes(b) || y(b);
    });
  }, 0);
}
function Ya(e) {
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
          const c = await Ti(n, r), l = (c.placeholder || "").trim() || "{TICKER}", u = (c.prompt_template || "").trim(), f = u ? l && u.includes(l) ? u.split(l).join(s) : `${u}

Ticker: ${s}` : `Ticker: ${s}`;
          if (await Ua(f), c.link)
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
      a();
    });
  }, 0);
}
async function Xa(e, t, n, r) {
  if (!r)
    return console.error("renderSecurityDetail: securityUuid fehlt"), '<div class="card"><h2>Fehler</h2><p>Kein Wertpapier angegeben.</p></div>';
  const i = wa(r);
  let o = null, a = null;
  try {
    const F = await ki(
      t,
      n,
      r
    ), k = F.snapshot;
    o = k && typeof k == "object" ? k : F;
  } catch (F) {
    console.error("renderSecurityDetail: Snapshot konnte nicht geladen werden", F), a = Vr(F);
  }
  const s = o || i, c = !!(i && !o), l = ((s == null ? void 0 : s.source) ?? "") === "cache";
  r && Na(r, s ?? null);
  const u = s && (c || l) ? Aa({ fallbackUsed: c, flaggedAsCache: l }) : "", f = (s == null ? void 0 : s.name) || "Wertpapierdetails";
  if (a) {
    const F = Tt(
      f,
      Rn(s)
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
  const d = Ir(r), g = Rr(r), p = Lr(r);
  let m = g.has(d) ? g.get(d) ?? null : null, y = { status: "empty" }, h = p.has(d) ? p.get(d) ?? null : null;
  if (Array.isArray(m))
    y = m.length ? { status: "loaded" } : { status: "empty" };
  else {
    m = [];
    try {
      const F = ct(d), k = await et(
        t,
        n,
        r,
        F
      );
      m = Ut(k.prices), h = ut(
        k.transactions,
        s == null ? void 0 : s.currency_code
      ), g.set(d, m), h = Array.isArray(h) ? h : [], p.set(d, h), y = m.length ? { status: "loaded" } : { status: "empty" };
    } catch (F) {
      console.error(
        "renderSecurityDetail: Historie konnte nicht geladen werden",
        F
      ), y = {
        status: "error",
        message: Wr(F) || "Die historischen Daten konnten aufgrund eines Fehlers nicht geladen werden."
      };
    }
  }
  if (!Array.isArray(h))
    try {
      const F = ct(d), k = await et(
        t,
        n,
        r,
        F
      ), T = Ut(k.prices);
      h = ut(
        k.transactions,
        s == null ? void 0 : s.currency_code
      ), g.set(d, T), h = Array.isArray(h) ? h : [], p.set(d, h), m = T, y = m.length ? { status: "loaded" } : { status: "empty" };
    } catch (F) {
      console.error(
        "renderSecurityDetail: Transaktionsmarker konnten nicht geladen werden",
        F
      ), h = [];
    }
  const _ = zt(
    m,
    s
  );
  y.status !== "error" && (y = _.length ? { status: "loaded" } : { status: "empty" });
  const b = Tt(
    f,
    Rn(s)
  );
  b.classList.add("security-detail-header");
  const S = Ia(s, r), P = Va(S), N = sn(s), { priceChange: A, priceChangePct: R } = Ur(
    _,
    N
  ), x = zr(
    d,
    A,
    R,
    s == null ? void 0 : s.currency_code
  );
  return Ga({
    root: e,
    hass: t,
    panelConfig: n,
    securityUuid: r,
    snapshot: s,
    initialRange: d,
    initialHistory: m,
    initialHistoryState: y
  }), Ya({
    root: e,
    hass: t,
    panelConfig: n,
    tickerSymbol: S
  }), `
    ${b.outerHTML}
    ${u}
    ${P}
    ${x}
    ${Ma(d)}
    <div class="card security-detail-placeholder">
      <h2>Historie</h2>
      ${qr(d, y)}
    </div>
  `;
}
function Za(e) {
  const { setSecurityDetailTabFactory: t } = e;
  if (typeof t != "function") {
    console.error("registerSecurityDetailTab: Ungültige Factory-Funktion übergeben");
    return;
  }
  t((n) => ({
    title: "Wertpapier",
    render: (r, i, o) => Xa(r, i, o, n),
    cleanup: () => {
      xa(n);
    }
  }));
}
const Ja = bi, qt = "pp-reader-sticky-anchor", dt = "overview", Ot = "security:", Qa = [
  { key: dt, title: "Dashboard", render: br }
], Ae = /* @__PURE__ */ new Map(), qe = [], ft = /* @__PURE__ */ new Map();
let Bt = null, kt = !1, ve = null, q = 0, xe = null;
function gt(e) {
  return typeof e == "object" && e !== null;
}
function jr(e) {
  return typeof e == "object" && e !== null && typeof e.then == "function";
}
function es(e) {
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
function ts(e) {
  return e === "accounts" || e === "last_file_update" || e === "portfolio_values" || e === "portfolio_positions";
}
function In(e) {
  const t = e.portfolio_uuid;
  if (typeof t == "string" && t)
    return t;
  const n = e.portfolioUuid;
  return typeof n == "string" && n ? n : null;
}
function ns(e) {
  if (!e)
    return null;
  if (Array.isArray(e)) {
    for (const t of e)
      if (gt(t)) {
        const n = In(t);
        if (n)
          return n;
      }
    return null;
  }
  return gt(e) ? In(e) : null;
}
function rs(e, t) {
  switch (e) {
    case "accounts":
      return {
        type: e,
        data: Array.isArray(t) ? t : null
      };
    case "last_file_update":
      return typeof t == "string" ? { type: e, data: t } : gt(t) ? { type: e, data: t } : { type: e, data: null };
    case "portfolio_values":
      return Array.isArray(t) ? { type: e, data: t } : { type: e, data: null };
    case "portfolio_positions":
      return Array.isArray(t) ? { type: e, data: t } : gt(t) ? { type: e, data: t } : { type: e, data: null };
    default:
      return null;
  }
}
function ln(e) {
  return typeof e != "string" || !e.startsWith(Ot) ? null : e.slice(Ot.length) || null;
}
function is() {
  if (!ve)
    return !1;
  const e = Zr(ve);
  return e || (ve = null), e;
}
function ie() {
  const e = qe.map((t) => Ae.get(t)).filter((t) => !!t);
  return [...Qa, ...e];
}
function os(e) {
  const t = ie();
  return e < 0 || e >= t.length ? null : t[e];
}
function Kr(e) {
  if (!e)
    return null;
  const t = e, n = t.ppreader ?? t.pp_reader;
  return n || (Object.values(t).find((i) => !i || typeof i != "object" ? !1 : i.webcomponent_name === "pp-reader-panel") ?? null);
}
function Gr() {
  try {
    const e = _t();
    e && typeof e.rememberScrollPosition == "function" && e.rememberScrollPosition();
  } catch (e) {
    console.warn("rememberCurrentPageScroll: konnte Scroll-Position nicht sichern", e);
  }
}
function Vn(e) {
  const t = ie();
  return !t.length || e < 0 ? 0 : e >= t.length ? t.length - 1 : e;
}
async function as(e, t, n, r) {
  const i = ie(), o = Vn(e);
  if (o === q) {
    e > q && is();
    return;
  }
  Gr();
  const a = q >= 0 && q < i.length ? i[q] : null, s = a ? ln(a.key) : null;
  let c = o;
  if (s) {
    const l = o >= 0 && o < i.length ? i[o] : null;
    if (l && l.key === dt && ds(s, { suppressRender: !0 })) {
      const d = ie().findIndex((g) => g.key === dt);
      c = d >= 0 ? d : 0;
    }
  }
  if (!kt) {
    kt = !0;
    try {
      q = Vn(c);
      const l = q;
      await Jr(t, n, r), us(l);
    } catch (l) {
      console.error("navigateToPage: Fehler beim Rendern des Tabs", l);
    } finally {
      kt = !1;
    }
  }
}
function pt(e, t, n, r) {
  as(q + e, t, n, r);
}
function ss(e, t) {
  if (!e || !t || typeof t.render != "function") {
    console.error("registerDetailTab: Ungültiger Tab-Descriptor", e, t);
    return;
  }
  const n = ln(e);
  if (n) {
    const i = ft.get(n);
    i && i !== e && Yr(i);
  }
  const r = {
    ...t,
    key: e
  };
  Ae.set(e, r), n && ft.set(n, e), qe.includes(e) || qe.push(e);
}
function Yr(e) {
  if (!e)
    return;
  const t = Ae.get(e);
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
  Ae.delete(e);
  const n = qe.indexOf(e);
  n >= 0 && qe.splice(n, 1);
  const r = ln(e);
  r && ft.get(r) === e && ft.delete(r);
}
function cs(e) {
  return Ae.has(e);
}
function Un(e) {
  return Ae.get(e) ?? null;
}
function ls(e) {
  if (e != null && typeof e != "function") {
    console.error("setSecurityDetailTabFactory: Erwartet Funktion oder null", e);
    return;
  }
  Bt = e ?? null;
}
function Xr(e) {
  return `${Ot}${e}`;
}
function _t() {
  var t;
  for (const n of Li())
    if (n.isConnected)
      return n;
  const e = /* @__PURE__ */ new Set();
  for (const n of Mi())
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
function Wt() {
  const e = _t();
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
const Ns = {
  findDashboardElement: _t
};
function us(e) {
  const t = _t();
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
  if (!n && typeof Bt == "function")
    try {
      const o = Bt(e);
      o && typeof o.render == "function" ? (ss(t, o), n = Un(t)) : console.error("openSecurityDetail: Factory lieferte ungültigen Descriptor", o);
    } catch (o) {
      console.error("openSecurityDetail: Fehler beim Erzeugen des Tab-Descriptors", o);
    }
  if (!n)
    return console.warn(`openSecurityDetail: Kein Detail-Tab für ${e} verfügbar`), !1;
  Gr();
  let i = ie().findIndex((o) => o.key === t);
  return i === -1 && (i = ie().findIndex((a) => a.key === t), i === -1) ? (console.error("openSecurityDetail: Tab nach Registrierung nicht auffindbar"), !1) : (q = i, ve = null, Wt(), !0);
}
function ds(e, t = {}) {
  if (!e)
    return console.error("closeSecurityDetail: Ungültige securityUuid", e), !1;
  const { suppressRender: n = !1 } = t, r = Xr(e);
  if (!cs(r))
    return !1;
  const o = ie().findIndex((c) => c.key === r), a = o === q;
  Yr(r);
  const s = ie();
  if (!s.length)
    return q = 0, n || Wt(), !0;
  if (ve = e, a) {
    const c = s.findIndex((l) => l.key === dt);
    c >= 0 ? q = c : q = Math.min(Math.max(o - 1, 0), s.length - 1);
  } else q >= s.length && (q = Math.max(0, s.length - 1));
  return n || Wt(), !0;
}
async function Jr(e, t, n) {
  let r = n;
  r || (r = Kr(t ? t.panels : null));
  const i = ie();
  q >= i.length && (q = Math.max(0, i.length - 1));
  const o = os(q);
  if (!o) {
    console.error("renderTab: Kein gültiger Tab oder keine render-Methode gefunden!");
    return;
  }
  let a;
  try {
    a = await o.render(e, t, r);
  } catch (u) {
    console.error("renderTab: Fehler beim Rendern des Tabs:", u), e.innerHTML = `<div class="card"><h2>Fehler</h2><pre>${es(u)}</pre></div>`;
    return;
  }
  e.innerHTML = a ?? "", o.render === br && on(e);
  const c = await new Promise((u) => {
    const f = window.setInterval(() => {
      const d = e.querySelector(".header-card");
      d && (clearInterval(f), u(d));
    }, 50);
  });
  let l = e.querySelector(`#${qt}`);
  if (!l) {
    l = document.createElement("div"), l.id = qt;
    const u = c.parentNode;
    u && "insertBefore" in u && u.insertBefore(l, c);
  }
  ps(e, t, n), gs(e, t, n), fs(e);
}
function fs(e) {
  const t = e.querySelector(".header-card"), n = e.querySelector(`#${qt}`);
  if (!t || !n) {
    console.error("Fehlende Elemente für das Scrollverhalten: headerCard oder anchor.");
    return;
  }
  xe == null || xe.disconnect(), xe = new IntersectionObserver(
    ([r]) => {
      r.isIntersecting ? t.classList.remove("sticky") : t.classList.add("sticky");
    },
    {
      root: null,
      rootMargin: "0px 0px 0px 0px",
      threshold: 0
    }
  ), xe.observe(n);
}
function gs(e, t, n) {
  const r = e.querySelector(".header-card");
  if (!r) {
    console.error("Header-Card nicht gefunden!");
    return;
  }
  Ja(
    r,
    () => {
      pt(1, e, t, n);
    },
    () => {
      pt(-1, e, t, n);
    }
  );
}
function ps(e, t, n) {
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
    pt(-1, e, t, n);
  }), o.addEventListener("click", () => {
    pt(1, e, t, n);
  }), hs(r);
}
function hs(e) {
  const t = e.querySelector("#nav-left"), n = e.querySelector("#nav-right");
  if (t && (q === 0 ? (t.disabled = !0, t.classList.add("disabled")) : (t.disabled = !1, t.classList.remove("disabled"))), n) {
    const r = ie(), o = !(q === r.length - 1) || !!ve;
    n.disabled = !o, n.classList.toggle("disabled", !o);
  }
}
class ms extends HTMLElement {
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
    this._panel || (this._panel = Kr(this._hass.panels ?? null));
    const n = mn(this._hass, this._panel);
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
    const r = mn(this._hass, this._panel);
    if (!r)
      return;
    const i = n.data;
    if (!ts(i.data_type) || i.entry_id && i.entry_id !== r)
      return;
    const o = rs(i.data_type, i.data);
    o && (this._queueUpdate(o.type, o.data), this._doRender(o.type, o.data));
  }
  _doRender(n, r) {
    switch (n) {
      case "accounts":
        Fo(
          r,
          this._root
        );
        break;
      case "last_file_update":
        Mo(
          r,
          this._root
        );
        break;
      case "portfolio_values":
        Do(
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
    n === "portfolio_positions" && (o.portfolioUuid = ns(
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
  rememberScrollPosition(n = q) {
    const r = Number.isInteger(n) ? n : q;
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
    const n = q;
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
customElements.get("pp-reader-dashboard") || customElements.define("pp-reader-dashboard", ms);
console.log("PPReader dashboard module v20250914b geladen");
Za({
  setSecurityDetailTabFactory: ls
});
export {
  Ns as __TEST_ONLY_DASHBOARD,
  As as __TEST_ONLY__,
  ds as closeSecurityDetail,
  rn as flushPendingPositions,
  Un as getDetailTabDescriptor,
  $o as handlePortfolioPositionsUpdate,
  cs as hasDetailTab,
  Zr as openSecurityDetail,
  Ps as reapplyPositionsSort,
  ys as registerDashboardElement,
  ss as registerDetailTab,
  vs as registerPanelHost,
  ls as setSecurityDetailTabFactory,
  bs as unregisterDashboardElement,
  Yr as unregisterDetailTab,
  Ss as unregisterPanelHost,
  yr as updatePortfolioFooterFromDom
};
//# sourceMappingURL=dashboard.CL-xycQp.js.map
