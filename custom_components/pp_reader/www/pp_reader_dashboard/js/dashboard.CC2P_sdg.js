var Pi = Object.defineProperty;
var Ai = (e, t, n) => t in e ? Pi(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : e[t] = n;
var K = (e, t, n) => Ai(e, typeof t != "symbol" ? t + "" : t, n);
function fn(e, t) {
  try {
    t();
  } catch (n) {
    console.warn(`addSwipeEvents: ${e} handler threw`, n);
  }
}
function Ni(e, t, n) {
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
    const p = l.changedTouches[0];
    i(p.clientX - r), r = null;
  }, s = (l) => {
    r = l.clientX;
  }, c = (l) => {
    r !== null && (i(l.clientX - r), r = null);
  };
  e.addEventListener("touchstart", o, { passive: !0 }), e.addEventListener("touchend", a, { passive: !0 }), e.addEventListener("mousedown", s), e.addEventListener("mouseup", c);
}
const Bt = (e, t) => {
  if (!Number.isFinite(e) || e === 0)
    return "neutral";
  const n = 0.5 / Math.pow(10, t);
  return Math.abs(e) < n ? "neutral" : e > 0 ? "positive" : "negative";
};
function L(e, t, n = void 0, r = void 0) {
  let i = null;
  const o = (c) => {
    if (typeof c == "number")
      return c;
    if (typeof c == "string" && c.trim() !== "") {
      const l = c.replace(/\s+/g, "").replace(/[^0-9,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."), p = Number.parseFloat(l);
      return Number.isNaN(p) ? Number.NaN : p;
    }
    return Number.NaN;
  }, a = (c, l = 2, p = 2) => {
    const d = typeof c == "number" ? c : o(c);
    return Number.isFinite(d) ? d.toLocaleString("de-DE", {
      minimumFractionDigits: l,
      maximumFractionDigits: p
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
          const f = u.day_change;
          if (f && typeof f == "object") {
            const g = e === "day_change_pct" ? f.change_pct : f.value_change_eur ?? f.price_change_eur;
            typeof g == "number" && (t = g);
          }
        } else {
          const f = u[e];
          typeof f == "number" && (t = f);
        }
    }
    const c = (n == null ? void 0 : n.fx_unavailable) === !0 ? "Wechselkurs nicht verfügbar – EUR-Wert unbekannt" : "";
    if (t == null || (r == null ? void 0 : r.hasValue) === !1)
      return s(c);
    const l = typeof t == "number" ? t : o(t);
    if (!Number.isFinite(l))
      return s(c);
    const p = e.endsWith("pct") ? "%" : "€";
    return i = a(l) + `&nbsp;${p}`, `<span class="${Bt(l, 2)}">${i}</span>`;
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
function Fe(e, t, n = [], r = {}) {
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
      l += `<td${b}>${L(_.key, h[_.key], h)}</td>`;
    }), l += "</tr>";
  });
  const p = {}, d = {};
  t.forEach((h) => {
    if (n.includes(h.key)) {
      const _ = e.reduce(
        (b, S) => {
          let A = S[h.key];
          if ((h.key === "gain_abs" || h.key === "gain_pct") && (typeof A != "number" || !Number.isFinite(A))) {
            const N = S.performance;
            if (typeof N == "object" && N !== null) {
              const P = N[h.key];
              typeof P == "number" && (A = P);
            }
          } else if ((h.key === "day_change_abs" || h.key === "day_change_pct") && (typeof A != "number" || !Number.isFinite(A))) {
            const N = S.performance;
            if (typeof N == "object" && N !== null) {
              const P = N.day_change;
              if (P && typeof P == "object") {
                const F = h.key === "day_change_pct" ? P.change_pct : P.value_change_eur ?? P.price_change_eur;
                typeof F == "number" && (A = F);
              }
            }
          }
          if (typeof A == "number" && Number.isFinite(A)) {
            const N = A;
            b.total += N, b.hasValue = !0;
          }
          return b;
        },
        { total: 0, hasValue: !1 }
      );
      _.hasValue ? (p[h.key] = _.total, d[h.key] = { hasValue: !0 }) : (p[h.key] = null, d[h.key] = { hasValue: !1 });
    }
  });
  const u = p.gain_abs ?? null;
  if (u != null) {
    const h = p.purchase_value ?? null;
    if (h != null && h > 0)
      p.gain_pct = u / h * 100;
    else {
      const _ = p.current_value ?? null;
      _ != null && _ !== 0 && (p.gain_pct = u / (_ - u) * 100);
    }
  }
  const f = p.day_change_abs ?? null;
  if (f != null) {
    const h = p.current_value ?? null;
    if (h != null) {
      const _ = h - f;
      _ && (p.day_change_pct = f / _ * 100, d.day_change_pct = { hasValue: !0 });
    }
  }
  const g = Number.isFinite(p.gain_pct ?? NaN) ? p.gain_pct : null;
  let m = "", y = "neutral";
  if (g != null && (m = `${ue(g)} %`, g > 0 ? y = "positive" : g < 0 && (y = "negative")), l += '<tr class="footer-row">', t.forEach((h, _) => {
    const b = h.align === "right" ? ' class="align-right"' : "";
    if (_ === 0) {
      l += `<td${b}>Summe</td>`;
      return;
    }
    if (p[h.key] != null) {
      let A = "";
      h.key === "gain_abs" && m && (A = ` data-gain-pct="${c(m)}" data-gain-sign="${c(y)}"`), l += `<td${b}${A}>${L(h.key, p[h.key], void 0, d[h.key])}</td>`;
      return;
    }
    if (h.key === "gain_pct" && p.gain_pct != null) {
      l += `<td${b}>${L("gain_pct", p.gain_pct, void 0, d[h.key])}</td>`;
      return;
    }
    const S = d[h.key] ?? { hasValue: !1 };
    l += `<td${b}>${L(h.key, null, void 0, S)}</td>`;
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
function kt(e, t) {
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
function ue(e, t = 2, n = 2) {
  return (Number.isNaN(e) ? 0 : e).toLocaleString("de-DE", {
    minimumFractionDigits: t,
    maximumFractionDigits: n
  });
}
function wi(e) {
  const t = Number.isNaN(e) ? 0 : e;
  return `<span class="${Bt(t, 2)}">${ue(t)}&nbsp;€</span>`;
}
function Ei(e) {
  const t = Number.isNaN(e) ? 0 : e;
  return `<span class="${Bt(t, 2)}">${ue(t)}&nbsp;%</span>`;
}
function Wn(e, t, n = "asc", r = !1) {
  if (!e)
    return [];
  const i = e.querySelector("tbody");
  if (!i)
    return [];
  const o = i.querySelector("tr.footer-row"), a = Array.from(i.querySelectorAll("tr")).filter((p) => p !== o);
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
    const p = Array.from(e.querySelectorAll("thead th"));
    for (let d = 0; d < p.length; d++)
      if (p[d].getAttribute("data-sort-key") === t) {
        s = d;
        break;
      }
  }
  if (s < 0)
    return a;
  const c = (p) => {
    const d = p.replace(/\u00A0/g, " ").replace(/[%€]/g, "").replace(/\./g, "").replace(/,/g, ".").replace(/[^\d.-]/g, "").trim();
    if (!d) return NaN;
    const u = parseFloat(d);
    return Number.isFinite(u) ? u : NaN;
  };
  a.sort((p, d) => {
    const u = p.cells.item(s), f = d.cells.item(s), g = ((u == null ? void 0 : u.textContent) ?? "").trim(), m = ((f == null ? void 0 : f.textContent) ?? "").trim(), y = c(g), h = c(m);
    let _;
    const b = /[0-9]/.test(g) || /[0-9]/.test(m);
    return !Number.isNaN(y) && !Number.isNaN(h) && b ? _ = y - h : _ = g.localeCompare(m, "de", { sensitivity: "base" }), n === "asc" ? _ : -_;
  }), a.forEach((p) => i.appendChild(p)), o && i.appendChild(o), e.querySelectorAll("thead th.sort-active").forEach((p) => {
    p.classList.remove("sort-active", "dir-asc", "dir-desc");
  });
  const l = e.querySelector(`thead th[data-sort-key="${t}"]`);
  return l && l.classList.add("sort-active", n === "asc" ? "dir-asc" : "dir-desc"), a;
}
function de(e) {
  return typeof e == "object" && e !== null;
}
function Y(e) {
  return typeof e == "string" ? e : null;
}
function Ke(e) {
  return e === null ? null : Y(e);
}
function O(e) {
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
function pn(e) {
  const t = O(e);
  if (t == null)
    return null;
  const n = Math.trunc(t);
  return Number.isFinite(n) ? n : null;
}
function Xe(e) {
  return de(e) ? { ...e } : null;
}
function Bn(e) {
  return de(e) ? { ...e } : null;
}
function jn(e) {
  return typeof e == "boolean" ? e : void 0;
}
function Fi(e) {
  if (!de(e))
    return null;
  const t = Y(e.name), n = Y(e.currency_code), r = O(e.orig_balance);
  if (!t || !n || r == null)
    return null;
  const i = e.balance === null ? null : O(e.balance), o = {
    uuid: Y(e.uuid) ?? void 0,
    name: t,
    currency_code: n,
    orig_balance: r,
    balance: i ?? null
  }, a = O(e.fx_rate);
  a != null && (o.fx_rate = a);
  const s = Y(e.fx_rate_source);
  s && (o.fx_rate_source = s);
  const c = Y(e.fx_rate_timestamp);
  c && (o.fx_rate_timestamp = c);
  const l = O(e.coverage_ratio);
  l != null && (o.coverage_ratio = l);
  const p = Y(e.provenance);
  p && (o.provenance = p);
  const d = Ke(e.metric_run_uuid);
  d !== null && (o.metric_run_uuid = d);
  const u = jn(e.fx_unavailable);
  return typeof u == "boolean" && (o.fx_unavailable = u), o;
}
function Yn(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = Fi(n);
    r && t.push(r);
  }
  return t;
}
function Ci(e) {
  if (!de(e))
    return null;
  const t = e.aggregation, n = Y(e.security_uuid), r = Y(e.name), i = O(e.current_holdings), o = O(e.purchase_value_eur) ?? (de(t) ? O(t.purchase_value_eur) ?? O(t.purchase_total_account) ?? O(t.account_currency_total) : null) ?? O(e.purchase_value), a = O(e.current_value);
  if (!n || !r || i == null || o == null || a == null)
    return null;
  const s = {
    portfolio_uuid: Y(e.portfolio_uuid) ?? void 0,
    security_uuid: n,
    name: r,
    ticker_symbol: Y(e.ticker_symbol),
    currency_code: Y(e.currency_code),
    current_holdings: i,
    purchase_value: o,
    current_value: a,
    average_cost: Xe(e.average_cost),
    performance: Xe(e.performance),
    aggregation: Xe(e.aggregation),
    data_state: Bn(e.data_state)
  }, c = O(e.coverage_ratio);
  c != null && (s.coverage_ratio = c);
  const l = Y(e.provenance);
  l && (s.provenance = l);
  const p = Ke(e.metric_run_uuid);
  p !== null && (s.metric_run_uuid = p);
  const d = O(e.last_price_native);
  d != null && (s.last_price_native = d);
  const u = O(e.last_price_eur);
  u != null && (s.last_price_eur = u);
  const f = O(e.last_close_native);
  f != null && (s.last_close_native = f);
  const g = O(e.last_close_eur);
  return g != null && (s.last_close_eur = g), s;
}
function Kn(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = Ci(n);
    r && t.push(r);
  }
  return t;
}
function Gn(e) {
  if (!de(e))
    return null;
  const t = Y(e.name), n = O(e.current_value ?? e.value);
  if (!t || n == null)
    return null;
  const i = O(
    e.purchase_sum ?? e.purchase_value_eur ?? e.purchase_value ?? e.purchaseSum
  ) ?? 0, o = {
    uuid: Y(e.uuid) ?? void 0,
    name: t,
    current_value: n,
    purchase_value: i,
    purchase_sum: i,
    day_change_abs: O(e.day_change_abs) ?? O(e.day_change_eur) ?? void 0,
    day_change_pct: O(e.day_change_pct) ?? void 0,
    position_count: pn(e.position_count ?? e.count) ?? void 0,
    missing_value_positions: pn(e.missing_value_positions) ?? void 0,
    has_current_value: jn(e.has_current_value),
    performance: Xe(e.performance),
    coverage_ratio: O(e.coverage_ratio) ?? void 0,
    provenance: Y(e.provenance) ?? void 0,
    metric_run_uuid: Ke(e.metric_run_uuid) ?? void 0,
    data_state: Bn(e.data_state)
  };
  return Array.isArray(e.positions) && (o.positions = Kn(e.positions)), o;
}
function Xn(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = Gn(n);
    r && t.push(r);
  }
  return t;
}
function Zn(e) {
  if (!de(e))
    return null;
  const t = { ...e }, n = Ke(e.metric_run_uuid);
  n !== null ? t.metric_run_uuid = n : delete t.metric_run_uuid;
  const r = O(e.coverage_ratio);
  r != null ? t.coverage_ratio = r : delete t.coverage_ratio;
  const i = Y(e.provenance);
  i ? t.provenance = i : delete t.provenance;
  const o = Y(e.generated_at ?? e.snapshot_generated_at);
  return o ? t.generated_at = o : delete t.generated_at, t;
}
function xi(e) {
  if (!de(e))
    return null;
  const t = { ...e }, n = Zn(e.normalized_payload);
  return n ? t.normalized_payload = n : "normalized_payload" in t && delete t.normalized_payload, t;
}
function Jn(e) {
  if (!de(e))
    return null;
  const t = Y(e.generated_at);
  if (!t)
    return null;
  const n = Ke(e.metric_run_uuid), r = Yn(e.accounts), i = Xn(e.portfolios), o = xi(e.diagnostics), a = {
    generated_at: t,
    metric_run_uuid: n,
    accounts: r,
    portfolios: i
  };
  return o && (a.diagnostics = o), a;
}
function gn(e) {
  return typeof e == "string" ? e : null;
}
function Di(e) {
  if (typeof e == "string")
    return e;
  if (e === null)
    return null;
}
function ki(e) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
}
function hn(e, t) {
  if (typeof e == "string")
    return e;
  throw new Error(`mapPositionSnapshotToRecord: fehlendes ${t}`);
}
function vt(e, t) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  throw new Error(`mapPositionSnapshotToRecord: fehlendes ${t}`);
}
function Ti(e) {
  const t = hn(e.security_uuid, "security_uuid"), n = hn(e.name, "name"), r = vt(e.current_holdings, "current_holdings"), i = vt(e.purchase_value, "purchase_value"), o = vt(e.current_value, "current_value"), a = {
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
function me(e, t) {
  var r, i, o, a, s, c, l, p;
  let n = ((r = t == null ? void 0 : t.config) == null ? void 0 : r.entry_id) ?? (t == null ? void 0 : t.entry_id) ?? ((a = (o = (i = t == null ? void 0 : t.config) == null ? void 0 : i._panel_custom) == null ? void 0 : o.config) == null ? void 0 : a.entry_id) ?? void 0;
  if (!n && (e != null && e.panels)) {
    const d = e.panels, u = d.ppreader ?? d.pp_reader ?? Object.values(d).find(
      (f) => (f == null ? void 0 : f.webcomponent_name) === "pp-reader-panel"
    );
    n = ((s = u == null ? void 0 : u.config) == null ? void 0 : s.entry_id) ?? (u == null ? void 0 : u.entry_id) ?? ((p = (l = (c = u == null ? void 0 : u.config) == null ? void 0 : c._panel_custom) == null ? void 0 : l.config) == null ? void 0 : p.entry_id) ?? void 0;
  }
  return n ?? void 0;
}
function mn(e, t) {
  return me(e, t);
}
async function Ri(e, t) {
  if (!e)
    throw new Error("fetchAccountsWS: fehlendes hass");
  const n = me(e, t);
  if (!n)
    throw new Error("fetchAccountsWS: fehlendes entry_id");
  const r = await e.connection.sendMessagePromise({
    type: "pp_reader/get_accounts",
    entry_id: n
  }), i = Yn(r.accounts), o = Jn(r.normalized_payload);
  return {
    accounts: i,
    normalized_payload: o
  };
}
async function $i(e, t) {
  if (!e)
    throw new Error("fetchLastFileUpdateWS: fehlendes hass");
  const n = me(e, t);
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
async function Li(e, t) {
  if (!e)
    throw new Error("fetchPortfoliosWS: fehlendes hass");
  const n = me(e, t);
  if (!n)
    throw new Error("fetchPortfoliosWS: fehlendes entry_id");
  const r = await e.connection.sendMessagePromise({
    type: "pp_reader/get_portfolio_data",
    entry_id: n
  }), i = Xn(r.portfolios), o = Jn(r.normalized_payload);
  return {
    portfolios: i,
    normalized_payload: o
  };
}
async function Qn(e, t, n) {
  if (!e)
    throw new Error("fetchPortfolioPositionsWS: fehlendes hass");
  const r = me(e, t);
  if (!r)
    throw new Error("fetchPortfolioPositionsWS: fehlendes entry_id");
  if (!n)
    throw new Error("fetchPortfolioPositionsWS: fehlendes portfolio_uuid");
  const i = await e.connection.sendMessagePromise({
    type: "pp_reader/get_portfolio_positions",
    entry_id: r,
    portfolio_uuid: n
  }), a = Kn(i.positions).map(Ti), s = Zn(i.normalized_payload), c = {
    portfolio_uuid: gn(i.portfolio_uuid) ?? n,
    positions: a
  };
  typeof i.error == "string" && (c.error = i.error);
  const l = ki(i.coverage_ratio);
  l !== void 0 && (c.coverage_ratio = l);
  const p = gn(i.provenance);
  p && (c.provenance = p);
  const d = Di(i.metric_run_uuid);
  return d !== void 0 && (c.metric_run_uuid = d), s && (c.normalized_payload = s), c;
}
async function Mi(e, t, n) {
  if (!e)
    throw new Error("fetchSecuritySnapshotWS: fehlendes hass");
  const r = me(e, t);
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
async function Hi(e, t) {
  if (!e)
    throw new Error("fetchNewsPromptWS: fehlendes hass");
  const n = me(e, t);
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
  const i = me(e, t);
  if (!i)
    throw new Error("fetchSecurityHistoryWS: fehlendes entry_id");
  if (!n)
    throw new Error("fetchSecurityHistoryWS: fehlendes securityUuid");
  const o = {
    type: "pp_reader/get_security_history",
    entry_id: i,
    security_uuid: n
  }, { startDate: a, endDate: s, start_date: c, end_date: l } = r || {}, p = a ?? c;
  p != null && (o.start_date = p);
  const d = s ?? l;
  d != null && (o.end_date = d);
  const u = await e.connection.sendMessagePromise(o);
  return Array.isArray(u.prices) || (u.prices = []), Array.isArray(u.transactions) || (u.transactions = []), u;
}
const jt = /* @__PURE__ */ new Set(), Yt = /* @__PURE__ */ new Set(), er = {}, Ii = [
  "renderPositionsTable",
  "applyGainPctMetadata",
  "attachSecurityDetailListener",
  "attachPortfolioPositionsSorting",
  "updatePortfolioFooter"
];
function Vi(e, t) {
  typeof t == "function" && (er[e] = t);
}
function Ns(e) {
  e && jt.add(e);
}
function ws(e) {
  e && jt.delete(e);
}
function Ui() {
  return jt;
}
function Es(e) {
  e && Yt.add(e);
}
function Fs(e) {
  e && Yt.delete(e);
}
function zi() {
  return Yt;
}
function qi(e) {
  for (const t of Ii)
    Vi(t, e[t]);
}
function Kt() {
  return er;
}
const Oi = 2;
function se(e) {
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
        const u = s.split(","), f = ((t = u[u.length - 1]) == null ? void 0 : t.length) ?? 0, g = u.slice(0, -1).join(""), m = g.replace(/[+-]/g, "").length, y = u.length > 2, h = /^[-+]?0$/.test(g);
        s = y || f === 0 || f === 3 && m > 0 && m <= 3 && !h ? s.replace(/,/g, "") : s.replace(",", ".");
      }
    else l && c && a > o ? s = s.replace(/,/g, "") : l && s.length - a - 1 === 3 && /\d{4,}/.test(s.replace(/\./g, "")) && (s = s.replace(/\./g, ""));
    if (s === "-" || s === "+")
      return null;
    const p = Number.parseFloat(s);
    if (Number.isFinite(p))
      return p;
    const d = Number.parseFloat(i.replace(",", "."));
    if (Number.isFinite(d))
      return d;
  }
  return null;
}
function mt(e, { decimals: t = Oi, fallback: n = null } = {}) {
  const r = se(e);
  if (r == null)
    return n ?? null;
  const i = 10 ** t, o = Math.round(r * i) / i;
  return Object.is(o, -0) ? 0 : o;
}
function _n(e, t = {}) {
  return mt(e, t);
}
function Wi(e, t = {}) {
  return mt(e, t);
}
const Bi = /^[+-]?(?:\d+\.?\d*|\d*\.?\d+)(?:[eE][+-]?\d+)?$/, ie = (e) => {
  if (typeof e == "number")
    return Number.isFinite(e) ? e : null;
  if (typeof e == "string") {
    const t = e.trim();
    if (!t || !Bi.test(t))
      return null;
    const n = Number(t);
    if (Number.isFinite(n))
      return n;
  }
  return null;
}, tr = (e) => {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t || null;
};
function ji(e) {
  const t = e && typeof e == "object" ? e : null;
  if (!t)
    return null;
  const n = ie(t.price_change_native), r = ie(t.price_change_eur), i = ie(t.change_pct), o = ie(t.value_change_eur);
  if (n == null && r == null && i == null && o == null)
    return null;
  const a = tr(t.source) ?? "derived", s = ie(t.coverage_ratio) ?? null;
  return {
    price_change_native: n,
    price_change_eur: r,
    change_pct: i,
    value_change_eur: o ?? null,
    source: a,
    coverage_ratio: s
  };
}
function he(e) {
  const t = e && typeof e == "object" ? e : null;
  if (!t)
    return null;
  const n = ie(t.gain_abs), r = ie(t.gain_pct), i = ie(t.total_change_eur), o = ie(t.total_change_pct);
  if (n == null || r == null || i == null || o == null)
    return null;
  const a = tr(t.source) ?? "derived", s = ie(t.coverage_ratio) ?? null, c = ji(t.day_change);
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
const pe = /* @__PURE__ */ new Map();
function fe(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t.length > 0 ? t : null;
}
function W(e) {
  if (e === null)
    return null;
  const t = se(e);
  return Number.isFinite(t ?? NaN) ? t : null;
}
function Yi(e) {
  if (!e || typeof e != "object")
    return !1;
  const t = e;
  return typeof t.security_uuid == "string" && typeof t.name == "string" && typeof t.current_holdings == "number" && typeof t.purchase_value == "number" && typeof t.current_value == "number";
}
function Ge(e) {
  const t = { ...e };
  return e.average_cost && typeof e.average_cost == "object" && (t.average_cost = { ...e.average_cost }), e.performance && typeof e.performance == "object" && (t.performance = { ...e.performance }), e.aggregation && typeof e.aggregation == "object" && (t.aggregation = { ...e.aggregation }), e.data_state && typeof e.data_state == "object" && (t.data_state = { ...e.data_state }), t;
}
function Ki(e, t, n = []) {
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
function Gi(e, t) {
  const n = e ? Ge(e) : {}, r = [
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
  ], i = (c, l, p) => {
    const d = l[p];
    d !== void 0 && (c[p] = d);
  };
  r.forEach((c) => {
    i(n, t, c);
  });
  const o = (c) => {
    const l = t[c];
    if (l && typeof l == "object") {
      const p = e && e[c] && typeof e[c] == "object" ? e[c] : {};
      n[c] = {
        ...p,
        ...l
      };
    } else l !== void 0 && (n[c] = l);
  }, a = t.performance, s = e && e.performance && typeof e.performance == "object" ? e.performance : void 0;
  return a !== void 0 && (n.performance = Ki(s, a, [
    "gain_pct",
    "total_change_pct"
  ])), o("aggregation"), o("average_cost"), o("data_state"), n;
}
function Gt(e, t) {
  if (!e)
    return;
  if (!Array.isArray(t)) {
    pe.delete(e);
    return;
  }
  if (t.length === 0) {
    pe.set(e, []);
    return;
  }
  const n = pe.get(e) ?? [], r = new Map(
    n.filter((o) => o.security_uuid).map((o) => [o.security_uuid, o])
  ), i = t.filter((o) => !!o).map((o) => {
    const a = o.security_uuid ?? "", s = a ? r.get(a) : void 0;
    return Gi(s, o);
  }).map(Ge);
  pe.set(e, i);
}
function Xt(e) {
  return e ? pe.has(e) : !1;
}
function nr(e) {
  if (!e)
    return [];
  const t = pe.get(e);
  return t ? t.map(Ge) : [];
}
function Xi() {
  pe.clear();
}
function Zi() {
  return new Map(
    Array.from(pe.entries(), ([e, t]) => [
      e,
      t.map(Ge)
    ])
  );
}
function De(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e, n = W(t.native), r = W(t.security), i = W(t.account), o = W(t.eur), a = W(t.coverage_ratio);
  if (n == null && r == null && i == null && o == null && a == null)
    return null;
  const s = fe(t.source);
  return {
    native: n,
    security: r,
    account: i,
    eur: o,
    source: s === "totals" || s === "eur_total" ? s : "aggregation",
    coverage_ratio: a
  };
}
function Zt(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e, n = W(t.total_holdings), r = W(t.positive_holdings), i = W(t.purchase_value_eur), o = W(t.purchase_total_security) ?? W(t.security_currency_total), a = W(t.purchase_total_account) ?? W(t.account_currency_total);
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
function Ji(e) {
  if (!e || typeof e != "object")
    return null;
  const t = Yi(e) ? Ge(e) : e, n = fe(t.security_uuid), r = fe(t.name), i = se(t.current_holdings), o = _n(t.current_value), a = Zt(t.aggregation), s = t.aggregation && typeof t.aggregation == "object" ? t.aggregation : null, c = W(t.purchase_value_eur) ?? W(s == null ? void 0 : s.purchase_value_eur) ?? W(s == null ? void 0 : s.purchase_total_account) ?? W(s == null ? void 0 : s.account_currency_total) ?? _n(t.purchase_value);
  if (!n || !r || i == null || c == null || o == null)
    return null;
  const l = {
    security_uuid: n,
    name: r,
    portfolio_uuid: fe(t.portfolio_uuid) ?? fe(t.portfolioUuid) ?? void 0,
    currency_code: fe(t.currency_code),
    current_holdings: i,
    purchase_value: c,
    current_value: o
  }, p = De(t.average_cost);
  p && (l.average_cost = p), a && (l.aggregation = a);
  const d = he(t.performance);
  if (d)
    l.performance = d, l.gain_abs = typeof d.gain_abs == "number" ? d.gain_abs : null, l.gain_pct = typeof d.gain_pct == "number" ? d.gain_pct : null;
  else {
    const b = W(t.gain_abs), S = W(t.gain_pct);
    b !== null && (l.gain_abs = b), S !== null && (l.gain_pct = S);
  }
  "coverage_ratio" in t && (l.coverage_ratio = W(t.coverage_ratio));
  const u = fe(t.provenance);
  u && (l.provenance = u);
  const f = fe(t.metric_run_uuid);
  (f || t.metric_run_uuid === null) && (l.metric_run_uuid = f ?? null);
  const g = W(t.last_price_native);
  g !== null && (l.last_price_native = g);
  const m = W(t.last_price_eur);
  m !== null && (l.last_price_eur = m);
  const y = W(t.last_close_native);
  y !== null && (l.last_close_native = y);
  const h = W(t.last_close_eur);
  h !== null && (l.last_close_eur = h);
  const _ = t.data_state && typeof t.data_state == "object" ? { ...t.data_state } : void 0;
  return _ && (l.data_state = _), l;
}
function _t(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = Ji(n);
    r && t.push(r);
  }
  return t;
}
let rr = [];
const ge = /* @__PURE__ */ new Map();
function Ze(e) {
  return typeof e == "string" && e.length > 0 ? e : void 0;
}
function Qi(e) {
  return e === null ? null : Ze(e);
}
function eo(e) {
  return typeof e == "number" && Number.isFinite(e) ? e : void 0;
}
function ye(e) {
  return e === null ? null : eo(e);
}
function yn(e) {
  if (!(typeof e != "number" || !Number.isFinite(e)))
    return Math.trunc(e);
}
function oe(e) {
  if (!(!e || typeof e != "object"))
    return { ...e };
}
function ze(e) {
  const t = { ...e };
  return t.average_cost = oe(e.average_cost), t.performance = oe(e.performance), t.aggregation = oe(e.aggregation), t.data_state = oe(e.data_state), t;
}
function Jt(e) {
  const t = { ...e };
  return t.performance = oe(e.performance), t.data_state = oe(e.data_state), Array.isArray(e.positions) && (t.positions = e.positions.map(ze)), t;
}
function ir(e) {
  if (!e || typeof e != "object")
    return null;
  const t = Ze(e.uuid);
  if (!t)
    return null;
  const n = { uuid: t }, r = Ze(e.name);
  r && (n.name = r);
  const i = ye(e.current_value);
  i !== void 0 && (n.current_value = i);
  const o = ye(e.purchase_sum) ?? ye(e.purchase_value_eur) ?? ye(e.purchase_value);
  o !== void 0 && (n.purchase_value = o, n.purchase_sum = o);
  const a = ye(e.day_change_abs);
  a !== void 0 && (n.day_change_abs = a);
  const s = ye(e.day_change_pct);
  s !== void 0 && (n.day_change_pct = s);
  const c = yn(e.position_count);
  c !== void 0 && (n.position_count = c);
  const l = yn(e.missing_value_positions);
  l !== void 0 && (n.missing_value_positions = l), typeof e.has_current_value == "boolean" && (n.has_current_value = e.has_current_value);
  const p = ye(e.coverage_ratio);
  p !== void 0 && (n.coverage_ratio = p);
  const d = Ze(e.provenance);
  d && (n.provenance = d), "metric_run_uuid" in e && (n.metric_run_uuid = Qi(e.metric_run_uuid));
  const u = oe(e.performance);
  u && (n.performance = u);
  const f = oe(e.data_state);
  if (f && (n.data_state = f), Array.isArray(e.positions)) {
    const g = e.positions.filter(
      (m) => !!m
    );
    g.length && (n.positions = g.map(ze));
  }
  return n;
}
function to(e, t) {
  const n = {
    ...e,
    ...t
  };
  return !t.performance && e.performance && (n.performance = oe(e.performance)), !t.data_state && e.data_state && (n.data_state = oe(e.data_state)), !t.positions && e.positions && (n.positions = e.positions.map(ze)), n;
}
function or(e) {
  rr = (e ?? []).map((n) => ({ ...n }));
}
function no() {
  return rr.map((e) => ({ ...e }));
}
function ro(e) {
  ge.clear();
  const t = e ?? [];
  for (const n of t) {
    const r = ir(n);
    r && ge.set(r.uuid, Jt(r));
  }
}
function io(e) {
  const t = e ?? [];
  for (const n of t) {
    const r = ir(n);
    if (!r)
      continue;
    const i = ge.get(r.uuid), o = i ? to(i, r) : Jt(r);
    ge.set(o.uuid, o);
  }
}
function Qt(e, t) {
  if (!e)
    return;
  const n = ge.get(e);
  if (!n)
    return;
  if (!Array.isArray(t) || t.length === 0) {
    const c = { ...n };
    delete c.positions, ge.set(e, c);
    return;
  }
  const r = (c, l) => {
    const p = c ? ze(c) : {}, d = p;
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
    const f = (g, m = []) => {
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
        const S = h == null ? void 0 : h[b];
        S != null && (_[b] = S);
      }), d[g] = _;
    };
    return f("performance", ["gain_pct", "total_change_pct"]), f("aggregation"), f("average_cost"), f("data_state"), p;
  }, i = Array.isArray(n.positions) ? n.positions : [], o = new Map(
    i.filter((c) => c.security_uuid).map((c) => [c.security_uuid, c])
  ), a = t.filter((c) => !!c).map((c) => {
    const l = c.security_uuid ? o.get(c.security_uuid) : void 0;
    return r(l, c);
  }).map(ze), s = {
    ...n,
    positions: a
  };
  ge.set(e, s);
}
function oo() {
  return Array.from(ge.values(), (e) => Jt(e));
}
function ar() {
  return {
    accounts: no(),
    portfolios: oo()
  };
}
const ao = "unknown-account";
function Z(e) {
  return typeof e != "number" || !Number.isFinite(e) ? null : e;
}
function bn(e) {
  const t = Z(e);
  return t == null ? 0 : Math.trunc(t);
}
function ee(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t.length > 0 ? t : null;
}
function sr(e, t) {
  return ee(e) ?? t;
}
function cr(e) {
  return e == null || !Number.isFinite(e) ? null : e < 0 ? 0 : e > 1 ? 1 : e;
}
function lr(e) {
  return e.split(/[\s_-]+/).filter(Boolean).map(
    (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
  ).join(" ");
}
function ur(e) {
  const t = so(e);
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
function so(e) {
  const t = ee(e);
  if (!t)
    return null;
  const n = co(t);
  return n || lr(t);
}
function co(e) {
  const t = e.trim();
  if (!t.startsWith("{") && !t.startsWith("["))
    return null;
  try {
    const n = JSON.parse(t), r = lo(n), i = n && typeof n == "object" ? ee(
      n.provider ?? n.source
    ) : null;
    if (r.length && i)
      return `${lr(i)} (${r.join(", ")})`;
    if (r.length)
      return `FX (${r.join(", ")})`;
  } catch {
    return null;
  }
  return null;
}
function lo(e) {
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
function uo(e) {
  if (!e)
    return null;
  const t = ee(e.uuid) ?? `${ao}-${e.name ?? "0"}`, n = sr(e.name, "Unbenanntes Konto"), r = ee(e.currency_code), i = Z(e.balance), o = Z(e.orig_balance), a = "coverage_ratio" in e ? cr(Z(e.coverage_ratio)) : null, s = ee(e.provenance), c = ee(e.metric_run_uuid), l = e.fx_unavailable === !0, p = Z(e.fx_rate), d = ee(e.fx_rate_source), u = ee(e.fx_rate_timestamp), f = [], g = ur(s);
  g && f.push(g);
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
    fx_rate: p,
    fx_rate_source: d,
    fx_rate_timestamp: u,
    badges: f
  }, y = typeof c == "string" ? c : null;
  return m.metric_run_uuid = y, m;
}
function fo(e) {
  if (!e)
    return null;
  const t = ee(e.uuid);
  if (!t)
    return null;
  const n = sr(e.name, "Unbenanntes Depot"), r = bn(e.position_count), i = bn(e.missing_value_positions), o = Z(e.current_value), a = Z(e.purchase_sum) ?? Z(e.purchase_value_eur) ?? Z(e.purchase_value) ?? 0, s = Z(e.day_change_abs) ?? null, c = Z(e.day_change_pct) ?? null, l = he(e.performance), p = (l == null ? void 0 : l.gain_abs) ?? null, d = (l == null ? void 0 : l.gain_pct) ?? null, u = (l == null ? void 0 : l.day_change) ?? null;
  let f = s ?? ((u == null ? void 0 : u.value_change_eur) != null ? Z(u.value_change_eur) : null), g = c ?? ((u == null ? void 0 : u.change_pct) != null ? Z(u.change_pct) : null);
  if (f == null && g != null && o != null) {
    const F = o / (1 + g / 100);
    F && (f = o - F);
  }
  if (g == null && f != null && o != null) {
    const F = o - f;
    F && (g = f / F * 100);
  }
  const m = o != null, y = e.has_current_value === !1 || !m, h = "coverage_ratio" in e ? cr(Z(e.coverage_ratio)) : null, _ = ee(e.provenance), b = ee(e.metric_run_uuid), S = [], A = ur(_);
  A && S.push(A);
  const N = {
    uuid: t,
    name: n,
    position_count: r,
    current_value: o,
    purchase_sum: a,
    day_change_abs: f ?? null,
    day_change_pct: g ?? null,
    gain_abs: p,
    gain_pct: d,
    hasValue: m,
    fx_unavailable: y || i > 0,
    missing_value_positions: i,
    performance: l,
    coverage_ratio: h,
    provenance: _,
    metric_run_uuid: null,
    badges: S
  }, P = typeof b == "string" ? b : null;
  return N.metric_run_uuid = P, N;
}
function dr() {
  const { accounts: e } = ar();
  return e.map(uo).filter((t) => !!t);
}
function po() {
  const { portfolios: e } = ar();
  return e.map(fo).filter((t) => !!t);
}
function qe(e) {
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
function fr(e, t = {}) {
  if (!e || e.length === 0)
    return "";
  const n = ["meta-badges", t.containerClass].filter(Boolean).join(" "), r = e.map((i) => {
    const o = `meta-badge--${i.tone}`, a = i.description ? ` title="${qe(i.description)}"` : "";
    return `<span class="meta-badge ${o}"${a}>${qe(
      i.label
    )}</span>`;
  }).join("");
  return `<span class="${n}">${r}</span>`;
}
function rt(e, t, n = {}) {
  const r = fr(t, n);
  if (!r)
    return qe(e);
  const i = n.labelClass ?? "name-with-badges__label";
  return `<span class="${["name-with-badges", n.containerClass].filter(Boolean).join(" ")}"><span class="${i}">${qe(
    e
  )}</span>${r}</span>`;
}
function pr(e, t, n, r) {
  e[t] = {
    previous: n,
    current: r
  };
}
const ce = /* @__PURE__ */ new Map(), Je = /* @__PURE__ */ new Map();
function go(e) {
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
function ke(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t.length > 0 ? t : null;
}
function Se(e) {
  return typeof e == "number" && Number.isFinite(e) ? e : void 0;
}
function ho(e) {
  return e === null ? null : Se(e);
}
function mo(e) {
  return e === null ? null : ke(e);
}
function vn(e) {
  return (e ?? []).filter(
    (t) => !t.key.endsWith("-coverage") && !t.key.startsWith("provenance-")
  );
}
function Sn(e) {
  return he(e.performance);
}
const _o = 500, yo = 10, bo = "pp-reader:portfolio-positions-updated", vo = "pp-reader:diagnostics", St = /* @__PURE__ */ new Map(), gr = [
  "coverage_ratio",
  "provenance",
  "metric_run_uuid",
  "generated_at"
], Tt = /* @__PURE__ */ new Map();
function So(e, t) {
  return `${e}:${t}`;
}
function Po(e) {
  if (e === void 0)
    return;
  if (e === null)
    return null;
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  const t = ho(e);
  if (t === null)
    return null;
  if (typeof t == "number" && Number.isFinite(t))
    return t;
}
function Pt(e) {
  if (e !== void 0)
    return mo(e);
}
function en(e, t, n, r) {
  const i = {}, o = Po(e);
  o !== void 0 && (i.coverage_ratio = o);
  const a = Pt(t);
  a !== void 0 && (i.provenance = a);
  const s = Pt(n);
  s !== void 0 && (i.metric_run_uuid = s);
  const c = Pt(r);
  return c !== void 0 && (i.generated_at = c), Object.keys(i).length > 0 ? i : null;
}
function Ao(e, t) {
  const n = {};
  let r = !1;
  for (const i of gr) {
    const o = e == null ? void 0 : e[i], a = t[i];
    o !== a && (pr(n, i, o, a), r = !0);
  }
  return r ? n : null;
}
function No(e) {
  const t = {};
  let n = !1;
  for (const r of gr) {
    const i = e[r];
    i !== void 0 && (pr(t, r, i, void 0), n = !0);
  }
  return n ? t : null;
}
function Pn(e) {
  if (Object.keys(e.changed).length) {
    try {
      console.debug("pp-reader:diagnostics", e);
    } catch {
    }
    if (!(typeof window > "u" || typeof window.dispatchEvent != "function"))
      try {
        window.dispatchEvent(new CustomEvent(vo, { detail: e }));
      } catch (t) {
        console.warn("updateConfigsWS: Diagnostics-Event konnte nicht gesendet werden", t);
      }
  }
}
function tn(e, t, n, r) {
  const i = So(e, n), o = St.get(i);
  if (!r) {
    if (!o)
      return;
    St.delete(i);
    const s = No(o);
    if (!s)
      return;
    Pn({
      kind: e,
      uuid: n,
      source: t,
      changed: s,
      snapshot: {},
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    return;
  }
  const a = Ao(o, r);
  a && (St.set(i, { ...r }), Pn({
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
      const n = ke(t.uuid);
      if (!n)
        continue;
      const r = en(
        t.coverage_ratio,
        t.provenance,
        t.metric_run_uuid,
        void 0
      );
      tn("account", "accounts", n, r);
    }
}
function Eo(e) {
  if (!(!e || e.length === 0))
    for (const t of e) {
      const n = ke(t.uuid);
      if (!n)
        continue;
      const r = en(
        t.coverage_ratio,
        t.provenance,
        t.metric_run_uuid,
        void 0
      );
      tn("portfolio", "portfolio_values", n, r);
    }
}
function Fo(e, t) {
  var r, i, o, a;
  if (!t)
    return;
  const n = en(
    t.coverage_ratio ?? ((r = t.normalized_payload) == null ? void 0 : r.coverage_ratio),
    t.provenance ?? ((i = t.normalized_payload) == null ? void 0 : i.provenance),
    t.metric_run_uuid ?? ((o = t.normalized_payload) == null ? void 0 : o.metric_run_uuid),
    (a = t.normalized_payload) == null ? void 0 : a.generated_at
  );
  tn("portfolio_positions", "portfolio_positions", e, n);
}
function Co(e, t) {
  return `<div class="error">${go(e)} <button class="retry-pos" data-portfolio="${t}">Erneut laden</button></div>`;
}
function xo(e, t, n) {
  const r = e.querySelector("table.sortable-positions");
  if (!r) return;
  const i = e.dataset.sortKey || r.dataset.defaultSort || "name", a = (e.dataset.sortDir || r.dataset.defaultDir || "asc") === "desc" ? "desc" : "asc";
  e.dataset.sortKey = i, e.dataset.sortDir = a;
  try {
    Wn(r, i, a, !0);
  } catch (l) {
    console.warn("restoreSortAndInit: sortTableRows Fehler:", l);
  }
  const { attachPortfolioPositionsSorting: s, attachSecurityDetailListener: c } = Kt();
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
function hr(e, t, n, r) {
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
    return o.innerHTML = Co(r, t), { applied: !0 };
  const a = o.dataset.sortKey, s = o.dataset.sortDir;
  return o.innerHTML = Io(n), a && (o.dataset.sortKey = a), s && (o.dataset.sortDir = s), xo(o, e, t), { applied: !0 };
}
function nn(e, t) {
  const n = ce.get(t);
  if (!n) return !1;
  const r = hr(
    e,
    t,
    n.positions,
    n.error
  );
  return r.applied && ce.delete(t), r.applied;
}
function Do(e) {
  let t = !1;
  for (const [n] of ce)
    nn(e, n) && (t = !0);
  return t;
}
function mr(e, t) {
  const n = Je.get(t) ?? {
    attempts: 0,
    timer: null
  };
  n.timer || (n.timer = setTimeout(() => {
    n.timer = null, n.attempts += 1;
    const r = nn(e, t);
    r || n.attempts >= yo ? (Je.delete(t), r || ce.delete(t)) : mr(e, t);
  }, _o), Je.set(t, n));
}
function ko(e, t) {
  console.log("updateConfigsWS: Kontodaten-Update erhalten:", e);
  const n = Array.isArray(e) ? e : [];
  if (or(n), wo(n), !t)
    return;
  const r = dr();
  To(r, t);
  const i = t.querySelector(".portfolio-table table"), o = i ? Array.from(
    i.querySelectorAll("tbody tr.portfolio-row")
  ).map((a) => {
    const s = a.dataset.currentValue, c = s ? Number.parseFloat(s) : Number.NaN;
    if (Number.isFinite(c))
      return {
        current_value: c
      };
    const l = a.cells.item(3), p = Qe(l == null ? void 0 : l.textContent);
    return {
      current_value: Number.isFinite(p) ? p : 0
    };
  }) : [];
  _r(r, o, t);
}
function To(e, t) {
  const n = t.querySelector(".account-table"), r = t.querySelector(".fx-account-table"), i = e.filter((a) => (a.currency_code || "EUR") === "EUR"), o = e.filter((a) => (a.currency_code || "EUR") !== "EUR");
  if (n) {
    const a = i.map((s) => ({
      name: rt(s.name, vn(s.badges), {
        containerClass: "account-name",
        labelClass: "account-name__label"
      }),
      balance: s.balance ?? null
    }));
    n.innerHTML = Fe(
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
      const c = s.orig_balance, l = typeof c == "number" && Number.isFinite(c), p = ke(s.currency_code), d = l ? c.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) : null, u = d ? p ? `${d} ${p}` : d : "";
      return {
        name: rt(s.name, vn(s.badges), {
          containerClass: "account-name",
          labelClass: "account-name__label"
        }),
        fx_display: u,
        balance: s.balance ?? null
      };
    });
    r.innerHTML = Fe(
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
function Ro(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = Gn(n);
    r && t.push(r);
  }
  return t;
}
function $o(e, t) {
  if (!Array.isArray(e)) {
    console.warn("handlePortfolioUpdate: Update ist kein Array:", e);
    return;
  }
  try {
    console.debug("handlePortfolioUpdate: payload=", e);
  } catch {
  }
  const n = Ro(e);
  if (n.length && io(n), Eo(n), !t)
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
        const f = typeof navigator < "u" && navigator.language ? navigator.language : "de-DE";
        return new Intl.NumberFormat(f, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(d);
      } catch {
      }
    return (mt(d, { fallback: 0 }) ?? 0).toFixed(2).replace(".", ",");
  }, a = /* @__PURE__ */ new Map();
  i.querySelectorAll("tr.portfolio-row").forEach((d) => {
    const u = d.dataset.portfolio;
    u && a.set(u, d);
  });
  let c = 0;
  const l = (d) => {
    const u = typeof d == "number" && Number.isFinite(d) ? d : 0;
    try {
      return u.toLocaleString("de-DE");
    } catch {
      return u.toString();
    }
  }, p = /* @__PURE__ */ new Map();
  for (const d of n) {
    const u = ke(d.uuid);
    u && p.set(u, d);
  }
  for (const [d, u] of p.entries()) {
    const f = a.get(d);
    if (!f)
      continue;
    f.cells.length < 8 && console.warn("handlePortfolioUpdate: Unerwartetes Spaltenlayout", f.cells.length);
    const g = f.cells.item(1), m = f.cells.item(2), y = f.cells.item(3), h = f.cells.item(4), _ = f.cells.item(5), b = f.cells.item(6), S = f.cells.item(7);
    if (!g || !m || !y)
      continue;
    const A = typeof u.position_count == "number" && Number.isFinite(u.position_count) ? u.position_count : 0, N = typeof u.current_value == "number" && Number.isFinite(u.current_value) ? u.current_value : null, P = he(u.performance), F = typeof (P == null ? void 0 : P.gain_abs) == "number" ? P.gain_abs : null, k = typeof (P == null ? void 0 : P.gain_pct) == "number" ? P.gain_pct : null, x = typeof u.purchase_sum == "number" && Number.isFinite(u.purchase_sum) ? u.purchase_sum : typeof u.purchase_value == "number" && Number.isFinite(u.purchase_value) ? u.purchase_value : null, D = (P == null ? void 0 : P.day_change) ?? null, $ = Se(u.day_change_abs) ?? Se(D == null ? void 0 : D.value_change_eur) ?? Se(D == null ? void 0 : D.price_change_eur), V = Se(u.day_change_pct) ?? Se(D == null ? void 0 : D.change_pct);
    let w = $ ?? null, E = V ?? null;
    if (w == null && E != null && N != null) {
      const G = N / (1 + E / 100);
      G && (w = N - G);
    }
    if (E == null && w != null && N != null) {
      const G = N - w;
      G && (E = w / G * 100);
    }
    const U = typeof u.missing_value_positions == "number" && Number.isFinite(u.missing_value_positions) ? u.missing_value_positions : 0, v = N !== null, C = u.has_current_value === !1 || U > 0 || !v, T = Qe(y.textContent);
    Qe(g.textContent) !== A && (g.textContent = l(A));
    const I = {
      fx_unavailable: C,
      current_value: N,
      performance: P
    }, H = { hasValue: v }, q = L("purchase_value", x, I, H);
    m.innerHTML !== q && (m.innerHTML = q);
    const z = L("current_value", I.current_value, I, H), X = typeof N == "number" ? N : 0;
    if ((Math.abs(T - X) >= 5e-3 || y.innerHTML !== z) && (y.innerHTML = z, f.classList.add("flash-update"), setTimeout(() => {
      f.classList.remove("flash-update");
    }, 800)), h && (h.innerHTML = L("day_change_abs", w, I, H)), _ && (_.innerHTML = L("day_change_pct", E, I, H)), b) {
      const G = L("gain_abs", F, I, H);
      b.innerHTML = G;
      const _e = typeof k == "number" && Number.isFinite(k) ? k : null;
      b.dataset.gainPct = _e != null ? `${o(_e)} %` : "—", b.dataset.gainSign = _e != null ? _e > 0 ? "positive" : _e < 0 ? "negative" : "neutral" : "neutral";
    }
    S && (S.innerHTML = L("gain_pct", k, I, H)), f.dataset.positionCount = A.toString(), f.dataset.purchaseSum = x != null ? x.toString() : "", f.dataset.currentValue = v ? X.toString() : "", f.dataset.dayChange = v && w != null ? w.toString() : "", f.dataset.dayChangePct = v && E != null ? E.toString() : "", f.dataset.gainAbs = F != null ? F.toString() : "", f.dataset.gainPct = k != null ? k.toString() : "", f.dataset.hasValue = v ? "true" : "false", f.dataset.fxUnavailable = C ? "true" : "false", f.dataset.coverageRatio = typeof u.coverage_ratio == "number" && Number.isFinite(u.coverage_ratio) ? u.coverage_ratio.toString() : "", f.dataset.provenance = typeof u.provenance == "string" ? u.provenance : "", f.dataset.metricRunUuid = typeof u.metric_run_uuid == "string" ? u.metric_run_uuid : "", c += 1;
  }
  if (c === 0)
    console.debug("handlePortfolioUpdate: Keine passenden Zeilen gefunden / keine Änderungen.");
  else {
    const d = c.toLocaleString("de-DE");
    console.debug(`handlePortfolioUpdate: ${d} Zeile(n) gepatcht.`);
  }
  try {
    Vo(r);
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
    }, u = d(
      ".account-table table",
      ".accounts-eur-table table",
      ".accounts-table table"
    ), f = d(
      ".fx-account-table table",
      ".accounts-fx-table table"
    ), g = (h, _) => {
      if (!h) return [];
      const b = h.querySelectorAll("tbody tr.account-row");
      return (b.length ? Array.from(b) : Array.from(h.querySelectorAll("tbody tr:not(.footer-row)"))).map((A) => {
        const N = _ ? A.cells.item(2) : A.cells.item(1);
        return { balance: Qe(N == null ? void 0 : N.textContent) };
      });
    }, m = [
      ...g(u, !1),
      ...g(f, !0)
    ], y = Array.from(
      r.querySelectorAll("tbody tr.portfolio-row")
    ).map((h) => {
      const _ = h.dataset.currentValue, b = h.dataset.purchaseSum, S = _ ? Number.parseFloat(_) : Number.NaN, A = b ? Number.parseFloat(b) : Number.NaN;
      return {
        current_value: Number.isFinite(S) ? S : 0,
        purchase_sum: Number.isFinite(A) ? A : 0
      };
    });
    _r(m, y, t);
  } catch (d) {
    console.warn("handlePortfolioUpdate: Fehler bei Total-Neuberechnung:", d);
  }
}
function Lo(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e.portfolio_uuid;
  if (typeof t == "string" && t)
    return t;
  const n = e.portfolioUuid;
  return typeof n == "string" && n ? n : null;
}
function Rt(e) {
  Tt.delete(e);
}
function An(e) {
  return typeof e != "number" || !Number.isInteger(e) || e <= 0 ? null : e;
}
function Mo(e, t, n, r) {
  if (!n || n <= 1 || !t)
    return Rt(e), r;
  const i = n, o = Tt.get(e) ?? { expected: i, chunks: /* @__PURE__ */ new Map() };
  if (o.expected !== i && (o.chunks.clear(), o.expected = i), o.chunks.set(t, r), Tt.set(e, o), o.chunks.size < i)
    return null;
  const a = [];
  for (let s = 1; s <= i; s += 1) {
    const c = o.chunks.get(s);
    c && Array.isArray(c) && a.push(...c);
  }
  return Rt(e), a;
}
function Nn(e, t) {
  const n = Lo(e);
  if (!n)
    return console.warn("handlePortfolioPositionsUpdate: Ungültiges Update:", e), !1;
  const r = e == null ? void 0 : e.error, i = An(e == null ? void 0 : e.chunk_index), o = An(e == null ? void 0 : e.chunk_count), a = _t((e == null ? void 0 : e.positions) ?? []);
  r && Rt(n);
  const s = r ? a : Mo(n, i, o, a);
  if (!r && s === null)
    return !0;
  const c = r ? a : s ?? [];
  Fo(n, e), r || (Gt(n, c), Qt(n, c));
  const l = hr(t, n, c, r);
  if (l.applied ? ce.delete(n) : (ce.set(n, { positions: a, error: r }), l.reason !== "hidden" && mr(t, n)), !r && a.length > 0) {
    const p = Array.from(
      new Set(
        a.map((d) => d.security_uuid).filter((d) => typeof d == "string" && d.length > 0)
      )
    );
    if (p.length && typeof window < "u")
      try {
        window.dispatchEvent(
          new CustomEvent(
            bo,
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
function Ho(e, t) {
  if (Array.isArray(e)) {
    let n = !1;
    for (const r of e)
      Nn(r, t) && (n = !0);
    !n && e.length && console.warn("handlePortfolioPositionsUpdate: Kein gültiges Element im Array:", e);
    return;
  }
  Nn(e, t);
}
function Io(e) {
  const { renderPositionsTable: t, applyGainPctMetadata: n } = Kt();
  try {
    if (typeof t == "function")
      return t(e);
  } catch {
  }
  if (e.length === 0)
    return '<div class="no-positions">Keine Positionen vorhanden.</div>';
  const r = e.map((o) => {
    const a = Sn(o);
    return {
      name: o.name,
      current_holdings: o.current_holdings,
      purchase_value: o.purchase_value,
      current_value: o.current_value,
      performance: a
    };
  }), i = Fe(
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
      s.forEach((d, u) => {
        const f = c[u];
        f && (d.setAttribute("data-sort-key", f), d.classList.add("sortable-col"));
      }), a.querySelectorAll("tbody tr").forEach((d, u) => {
        if (d.classList.contains("footer-row"))
          return;
        const f = e[u];
        f.security_uuid && (d.dataset.security = f.security_uuid), d.classList.add("position-row");
      }), a.dataset.defaultSort = "name", a.dataset.defaultDir = "asc";
      const p = n;
      if (p)
        try {
          p(a);
        } catch (d) {
          console.warn("renderPositionsTableInline: applyGainPctMetadata failed", d);
        }
      else
        a.querySelectorAll("tbody tr").forEach((u, f) => {
          if (u.classList.contains("footer-row"))
            return;
          const g = u.cells.item(4);
          if (!g)
            return;
          const m = e[f], y = Sn(m), h = typeof (y == null ? void 0 : y.gain_pct) == "number" && Number.isFinite(y.gain_pct) ? y.gain_pct : null, _ = h != null ? `${h.toLocaleString("de-DE", {
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
function Vo(e) {
  var h;
  if (!e) return;
  const { updatePortfolioFooter: t } = Kt();
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
      const A = r(b.dataset.currentValue), N = r(b.dataset.gainAbs), P = r(b.dataset.purchaseSum);
      return A == null || N == null || P == null ? (_.incompleteRows += 1, _) : (_.sumCurrent += A, _.sumGainAbs += N, _.sumPurchase += P, _);
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
  }, p = { hasValue: o }, d = L("current_value", l.current_value, l, p), u = o ? i.sumGainAbs : null, f = o ? a : null, g = L("gain_abs", u, l, p), m = L("gain_pct", f, l, p);
  s.innerHTML = `
    <td>Summe</td>
    <td class="align-right">${c}</td>
    <td class="align-right">${d}</td>
    <td class="align-right">${g}</td>
    <td class="align-right">${m}</td>
  `;
  const y = s.cells.item(3);
  y && (y.dataset.gainPct = o && typeof a == "number" ? `${$t(a)} %` : "—", y.dataset.gainSign = o && typeof a == "number" ? a > 0 ? "positive" : a < 0 ? "negative" : "neutral" : "neutral"), s.dataset.positionCount = Math.round(i.sumPositions).toString(), s.dataset.currentValue = o ? i.sumCurrent.toString() : "", s.dataset.purchaseSum = o ? i.sumPurchase.toString() : "", s.dataset.gainAbs = o ? i.sumGainAbs.toString() : "", s.dataset.gainPct = o && typeof a == "number" ? a.toString() : "", s.dataset.hasValue = o ? "true" : "false", s.dataset.fxUnavailable = i.fxUnavailable || !o ? "true" : "false";
}
function wn(e) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  if (typeof e == "string") {
    const t = Number.parseFloat(e);
    return Number.isFinite(t) ? t : 0;
  }
  return 0;
}
function $t(e) {
  return (mt(e, { fallback: 0 }) ?? 0).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
function _r(e, t, n) {
  const r = n ?? document, o = (Array.isArray(e) ? e : []).reduce((d, u) => {
    const f = u.balance ?? u.current_value ?? u.value, g = wn(f);
    return d + g;
  }, 0), s = (Array.isArray(t) ? t : []).reduce((d, u) => {
    const f = u.current_value ?? u.value, g = wn(f);
    return d + g;
  }, 0), c = o + s, l = r.querySelector("#headerMeta");
  if (!l) {
    console.warn("updateTotalWealth: #headerMeta nicht gefunden.");
    return;
  }
  const p = l.querySelector("strong") || l.querySelector(".total-wealth-value");
  p ? p.textContent = `${$t(c)} €` : l.textContent = `💰 Gesamtvermögen: ${$t(c)} €`, l.dataset.totalWealthEur = c.toString();
}
function Uo(e, t) {
  const n = typeof e == "string" ? e : e == null ? void 0 : e.last_file_update, r = ke(n) ?? "";
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
function Cs(e) {
  if (e == null)
    return;
  const t = e.querySelector("table.sortable-positions");
  if (t == null)
    return;
  const n = e.dataset.sortKey || t.dataset.defaultSort || "name", i = (e.dataset.sortDir || t.dataset.defaultDir || "asc") === "desc" ? "desc" : "asc";
  e.dataset.sortKey = n, e.dataset.sortDir = i, Wn(t, n, i, !0);
}
const xs = {
  getPortfolioPositionsCacheSnapshot: Zi,
  clearPortfolioPositionsCache: Xi,
  getPendingUpdateCount() {
    return ce.size;
  },
  queuePendingUpdate(e, t, n) {
    ce.set(e, { positions: t, error: n });
  },
  clearPendingUpdates() {
    ce.clear(), Je.clear();
  }
};
function Qe(e) {
  return e == null ? 0 : parseFloat(
    e.replace(/\u00A0/g, " ").replace(/[€%]/g, "").replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "")
  ) || 0;
}
const zo = [
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
  return zo.includes(e);
}
function Nt(e) {
  return e === "asc" || e === "desc";
}
function yr(e) {
  return (e ?? []).filter((t) => !t.key.endsWith("-coverage"));
}
function En(e) {
  return yr(e).filter(
    (t) => !t.key.startsWith("provenance-")
  );
}
let it = null, ot = null;
const Fn = { min: 2, max: 6 };
function $e(e) {
  return se(e);
}
function qo(e) {
  return typeof e == "number" && Number.isFinite(e);
}
function Oo(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  if (!t)
    return null;
  const n = t.toUpperCase();
  return /^[A-Z]{3}$/.test(n) ? n : n === "€" ? "EUR" : null;
}
function Cn(e, t, n = null) {
  for (const r of t) {
    const i = Oo(e[r]);
    if (i)
      return i;
  }
  return n;
}
function xn(e, t) {
  return qo(e) ? `${e.toLocaleString("de-DE", {
    minimumFractionDigits: Fn.min,
    maximumFractionDigits: Fn.max
  })}${t ? ` ${t}` : ""}` : null;
}
function Wo(e) {
  const t = e, n = e.average_cost ?? null, r = e.aggregation ?? null, i = Cn(t, [
    "security_currency_code",
    "security_currency",
    "native_currency_code",
    "native_currency"
  ], e.currency_code ?? null), o = Cn(
    t,
    [
      "account_currency_code",
      "account_currency",
      "purchase_currency_code",
      "currency_code"
    ],
    i === "EUR" ? "EUR" : null
  ) ?? "EUR", a = $e(n == null ? void 0 : n.native), s = $e(n == null ? void 0 : n.security), c = $e(n == null ? void 0 : n.account), l = $e(n == null ? void 0 : n.eur), p = s ?? a, d = l ?? (o === "EUR" ? c : null), u = i ?? o, f = u === "EUR";
  let g, m;
  f ? (g = "EUR", m = d ?? p ?? c ?? null) : p != null ? (g = u, m = p) : c != null ? (g = o, m = c) : (g = "EUR", m = d ?? null);
  const y = xn(m, g), h = f ? null : xn(d, "EUR"), _ = !!h && h !== y, b = [], S = [];
  y ? (b.push(
    `<span class="purchase-price purchase-price--primary">${y}</span>`
  ), S.push(y.replace(/\u00A0/g, " "))) : (b.push('<span class="missing-value" role="note" aria-label="Kein Kaufpreis verfügbar" title="Kein Kaufpreis verfügbar">—</span>'), S.push("Kein Kaufpreis verfügbar")), _ && h && (b.push(
    `<span class="purchase-price purchase-price--secondary">${h}</span>`
  ), S.push(h.replace(/\u00A0/g, " ")));
  const A = b.join("<br>"), N = $e(r == null ? void 0 : r.purchase_value_eur) ?? 0, P = S.join(", ");
  return { markup: A, sortValue: N, ariaLabel: P };
}
function Bo(e) {
  const t = se(e.current_holdings);
  if (t == null)
    return { value: null, pct: null };
  const n = se(e.last_price_eur), r = se(e.last_close_eur);
  let i = null, o = null;
  if (n != null && r != null) {
    i = (n - r) * t;
    const d = r * t;
    d && (o = i / d * 100);
  }
  const a = he(e.performance), s = (a == null ? void 0 : a.day_change) ?? null;
  if (i == null && (s == null ? void 0 : s.price_change_eur) != null && (i = s.price_change_eur * t), o == null && (s == null ? void 0 : s.change_pct) != null && (o = s.change_pct), i == null && o != null) {
    const p = se(e.current_value);
    if (p != null) {
      const d = p / (1 + o / 100);
      d && (i = p - d);
    }
  }
  const c = i != null && Number.isFinite(i) ? Math.round(i * 100) / 100 : null, l = o != null && Number.isFinite(o) ? Math.round(o * 100) / 100 : null;
  return { value: c, pct: l };
}
const at = /* @__PURE__ */ new Set();
function br(e) {
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
function Oe(e) {
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
    const o = he(i.performance), a = typeof (o == null ? void 0 : o.gain_abs) == "number" ? o.gain_abs : null, s = typeof (o == null ? void 0 : o.gain_pct) == "number" ? o.gain_pct : null, c = Bo(i), l = typeof i.purchase_value == "number" || typeof i.purchase_value == "string" ? i.purchase_value : null;
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
  }), r = Fe(n, t, ["purchase_value", "current_value", "day_change_abs", "gain_abs"]);
  try {
    const i = document.createElement("template");
    i.innerHTML = r.trim();
    const o = i.content.querySelector("table");
    if (o) {
      o.classList.add("sortable-positions");
      const a = Array.from(o.querySelectorAll("thead th"));
      return t.forEach((c, l) => {
        const p = a.at(l);
        p && (p.setAttribute("data-sort-key", c.key), p.classList.add("sortable-col"));
      }), o.querySelectorAll("tbody tr").forEach((c, l) => {
        if (c.classList.contains("footer-row") || l >= e.length)
          return;
        const p = e[l], d = typeof p.security_uuid == "string" ? p.security_uuid : null;
        d && (c.dataset.security = d), c.classList.add("position-row");
        const u = c.cells.item(2);
        if (u) {
          const { markup: m, sortValue: y, ariaLabel: h } = Wo(p);
          u.innerHTML = m, u.dataset.sortValue = String(y), h ? u.setAttribute("aria-label", h) : u.removeAttribute("aria-label");
        }
        const f = c.cells.item(7);
        if (f) {
          const m = he(p.performance), y = typeof (m == null ? void 0 : m.gain_pct) == "number" && Number.isFinite(m.gain_pct) ? m.gain_pct : null, h = y != null ? `${y.toLocaleString("de-DE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })} %` : "—", _ = y == null ? "neutral" : y > 0 ? "positive" : y < 0 ? "negative" : "neutral";
          f.dataset.gainPct = h, f.dataset.gainSign = _;
        }
        const g = c.cells.item(8);
        g && g.classList.add("gain-pct-cell");
      }), o.dataset.defaultSort = "name", o.dataset.defaultDir = "asc", br(o), o.outerHTML;
    }
  } catch (i) {
    console.warn("renderPositionsTable: Konnte Sortier-Metadaten nicht injizieren:", i);
  }
  return r;
}
function jo(e) {
  const t = _t(e ?? []);
  return Oe(t);
}
function Yo(e, t) {
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
        ei(c) || console.warn("attachSecurityDetailDelegation: Detail-Tab konnte nicht geöffnet werden für", c);
      } catch (l) {
        console.error("attachSecurityDetailDelegation: Fehler beim Öffnen des Detail-Tabs", l);
      }
  })));
}
function We(e, t) {
  Yo(e, t);
}
function vr(e) {
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
    const C = Number.isFinite(v.position_count) ? v.position_count : 0, T = Number.isFinite(v.purchase_sum) ? v.purchase_sum : 0, j = v.hasValue && typeof v.current_value == "number" && Number.isFinite(v.current_value) ? v.current_value : null, I = j !== null, H = v.performance, q = typeof v.gain_abs == "number" ? v.gain_abs : typeof (H == null ? void 0 : H.gain_abs) == "number" ? H.gain_abs : null, z = typeof v.gain_pct == "number" ? v.gain_pct : typeof (H == null ? void 0 : H.gain_pct) == "number" ? H.gain_pct : null, X = H && typeof H == "object" ? H.day_change : null, G = typeof v.day_change_abs == "number" ? v.day_change_abs : X && typeof X == "object" ? X.value_change_eur ?? X.price_change_eur : null, Te = typeof v.day_change_pct == "number" ? v.day_change_pct : X && typeof X == "object" && typeof X.change_pct == "number" ? X.change_pct : null, _e = v.fx_unavailable && I, ni = typeof v.coverage_ratio == "number" && Number.isFinite(v.coverage_ratio) ? v.coverage_ratio : "", ri = typeof v.provenance == "string" ? v.provenance : "", ii = typeof v.metric_run_uuid == "string" ? v.metric_run_uuid : "", Re = at.has(v.uuid), oi = Re ? "portfolio-toggle expanded" : "portfolio-toggle", un = `portfolio-details-${v.uuid}`, J = {
      fx_unavailable: v.fx_unavailable,
      purchase_value: T,
      current_value: j,
      day_change_abs: G,
      day_change_pct: Te,
      gain_abs: q,
      gain_pct: z
    }, ve = { hasValue: I }, ai = L("purchase_value", J.purchase_value, J, ve), si = L("current_value", J.current_value, J, ve), ci = L("day_change_abs", J.day_change_abs, J, ve), li = L("day_change_pct", J.day_change_pct, J, ve), ui = L("gain_abs", J.gain_abs, J, ve), di = L("gain_pct", J.gain_pct, J, ve), dn = I && typeof z == "number" && Number.isFinite(z) ? `${ue(z)} %` : "", fi = I && typeof z == "number" && Number.isFinite(z) ? z > 0 ? "positive" : z < 0 ? "negative" : "neutral" : "", pi = I && typeof j == "number" && Number.isFinite(j) ? j : "", gi = I && typeof q == "number" && Number.isFinite(q) ? q : "", hi = I && typeof z == "number" && Number.isFinite(z) ? z : "", mi = I && typeof G == "number" && Number.isFinite(G) ? G : "", _i = I && typeof Te == "number" && Number.isFinite(Te) ? Te : "", yi = String(C);
    let bt = "";
    dn && (bt = ` data-gain-pct="${t(dn)}" data-gain-sign="${t(fi)}"`), _e && (bt += ' data-partial="true"'), n += `<tr class="portfolio-row"
                  data-portfolio="${v.uuid}"
                  data-position-count="${yi}"
                  data-current-value="${t(pi)}"
                  data-purchase-sum="${t(T)}"
                  data-day-change="${t(mi)}"
                  data-day-change-pct="${t(_i)}"
                  data-gain-abs="${t(gi)}"
                data-gain-pct="${t(hi)}"
                data-has-value="${I ? "true" : "false"}"
                data-fx-unavailable="${v.fx_unavailable ? "true" : "false"}"
                data-coverage-ratio="${t(ni)}"
                data-provenance="${t(ri)}"
                data-metric-run-uuid="${t(ii)}">`;
    const bi = qe(v.name), vi = fr(yr(v.badges), {
      containerClass: "portfolio-badges"
    });
    n += `<td>
        <button type="button"
                class="${oi}"
                data-portfolio="${v.uuid}"
                aria-expanded="${Re ? "true" : "false"}"
                aria-controls="${un}">
          <span class="caret">${Re ? "▼" : "▶"}</span>
          <span class="portfolio-name">${bi}</span>${vi}
        </button>
      </td>`;
    const Si = C.toLocaleString("de-DE");
    n += `<td class="align-right">${Si}</td>`, n += `<td class="align-right">${ai}</td>`, n += `<td class="align-right">${si}</td>`, n += `<td class="align-right">${ci}</td>`, n += `<td class="align-right">${li}</td>`, n += `<td class="align-right"${bt}>${ui}</td>`, n += `<td class="align-right gain-pct-cell">${di}</td>`, n += "</tr>", n += `<tr class="portfolio-details${Re ? "" : " hidden"}"
                data-portfolio="${v.uuid}"
                id="${un}"
                role="region"
                aria-label="Positionen für ${v.name}">
      <td colspan="${r.length.toString()}">
        <div class="positions-container">${Re ? Xt(v.uuid) ? Oe(nr(v.uuid)) : '<div class="loading">Lade Positionen...</div>' : ""}</div>
      </td>
    </tr>`;
  });
  const i = e.filter((v) => typeof v.current_value == "number" && Number.isFinite(v.current_value)), o = e.reduce((v, C) => v + (Number.isFinite(C.position_count) ? C.position_count : 0), 0), a = i.reduce((v, C) => typeof C.current_value == "number" && Number.isFinite(C.current_value) ? v + C.current_value : v, 0), s = i.reduce((v, C) => typeof C.purchase_sum == "number" && Number.isFinite(C.purchase_sum) ? v + C.purchase_sum : v, 0), c = i.map((v) => {
    if (typeof v.day_change_abs == "number")
      return v.day_change_abs;
    const C = v.performance && typeof v.performance == "object" ? v.performance.day_change : null;
    if (C && typeof C == "object") {
      const T = C.value_change_eur;
      if (typeof T == "number" && Number.isFinite(T))
        return T;
    }
    return null;
  }).filter((v) => typeof v == "number" && Number.isFinite(v)), l = c.reduce((v, C) => v + C, 0), p = i.reduce((v, C) => {
    var I;
    if (typeof ((I = C.performance) == null ? void 0 : I.gain_abs) == "number" && Number.isFinite(C.performance.gain_abs))
      return v + C.performance.gain_abs;
    const T = typeof C.current_value == "number" && Number.isFinite(C.current_value) ? C.current_value : 0, j = typeof C.purchase_sum == "number" && Number.isFinite(C.purchase_sum) ? C.purchase_sum : 0;
    return v + (T - j);
  }, 0), d = i.length > 0, u = i.length !== e.length, f = c.length > 0, g = f && d && a !== 0 ? (() => {
    const v = a - l;
    return v ? l / v * 100 : null;
  })() : null, m = d && s > 0 ? p / s * 100 : null, y = {
    fx_unavailable: u,
    purchase_value: d ? s : null,
    current_value: d ? a : null,
    day_change_abs: f ? l : null,
    day_change_pct: f ? g : null,
    gain_abs: d ? p : null,
    gain_pct: d ? m : null
  }, h = { hasValue: d }, _ = { hasValue: f }, b = L("purchase_value", y.purchase_value, y, h), S = L("current_value", y.current_value, y, h), A = L("day_change_abs", y.day_change_abs, y, _), N = L("day_change_pct", y.day_change_pct, y, _), P = L("gain_abs", y.gain_abs, y, h), F = L("gain_pct", y.gain_pct, y, h);
  let k = "";
  if (d && typeof m == "number" && Number.isFinite(m)) {
    const v = `${ue(m)} %`, C = m > 0 ? "positive" : m < 0 ? "negative" : "neutral";
    k = ` data-gain-pct="${t(v)}" data-gain-sign="${t(C)}"`;
  }
  u && (k += ' data-partial="true"');
  const x = String(Math.round(o)), D = d ? String(a) : "", $ = d ? String(s) : "", V = f ? String(l) : "", w = f && typeof g == "number" && Number.isFinite(g) ? String(g) : "", E = d ? String(p) : "", U = d && typeof m == "number" && Number.isFinite(m) ? String(m) : "";
  return n += `<tr class="footer-row"
      data-position-count="${x}"
      data-current-value="${t(D)}"
      data-purchase-sum="${t($)}"
      data-day-change="${t(V)}"
      data-day-change-pct="${t(w)}"
      data-gain-abs="${t(E)}"
      data-gain-pct="${t(U)}"
      data-has-value="${d ? "true" : "false"}"
      data-fx-unavailable="${u ? "true" : "false"}">
      <td>Summe</td>
      <td class="align-right">${Math.round(o).toLocaleString("de-DE")}</td>
    <td class="align-right">${b}</td>
    <td class="align-right">${S}</td>
    <td class="align-right">${A}</td>
    <td class="align-right">${N}</td>
    <td class="align-right"${k}>${P}</td>
    <td class="align-right gain-pct-cell">${F}</td>
  </tr>`, n += "</tbody></table>", n;
}
function Ko(e) {
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
function Le(e) {
  if (e === void 0)
    return null;
  const t = Number(e);
  return Number.isFinite(t) ? t : null;
}
function Sr(e) {
  const t = Ko(e);
  if (!t)
    return;
  const n = t.tBodies.item(0);
  if (!n)
    return;
  const r = Array.from(n.querySelectorAll("tr.portfolio-row"));
  if (!r.length)
    return;
  let i = 0, o = 0, a = 0, s = 0, c = 0, l = !1, p = !1, d = !0, u = !1;
  for (const T of r) {
    const j = Le(T.dataset.positionCount);
    j != null && (i += j), T.dataset.fxUnavailable === "true" && (u = !0);
    const I = T.dataset.hasValue;
    if (!!(I === "false" || I === "0" || I === "" || I == null)) {
      d = !1;
      continue;
    }
    l = !0;
    const q = Le(T.dataset.currentValue), z = Le(T.dataset.gainAbs), X = Le(T.dataset.purchaseSum), G = Le(T.dataset.dayChange);
    if (q == null || z == null || X == null) {
      d = !1;
      continue;
    }
    o += q, s += z, a += X, G != null && (c += G, p = !0);
  }
  const f = l && d, g = f && a > 0 ? s / a * 100 : null, m = p && f && o !== 0 ? (() => {
    const T = o - c;
    return T ? c / T * 100 : null;
  })() : null;
  let y = Array.from(n.children).find(
    (T) => T instanceof HTMLTableRowElement && T.classList.contains("footer-row")
  );
  y || (y = document.createElement("tr"), y.classList.add("footer-row"), n.appendChild(y));
  const h = Math.round(i).toLocaleString("de-DE"), _ = {
    fx_unavailable: u || !f,
    purchase_value: f ? a : null,
    current_value: f ? o : null,
    day_change_abs: p && f ? c : null,
    day_change_pct: p && f ? m : null,
    gain_abs: f ? s : null,
    gain_pct: f ? g : null
  }, b = { hasValue: f }, S = { hasValue: p && f }, A = L("purchase_value", _.purchase_value, _, b), N = L("current_value", _.current_value, _, b), P = L("day_change_abs", _.day_change_abs, _, S), F = L("day_change_pct", _.day_change_pct, _, S), k = L("gain_abs", _.gain_abs, _, b), x = L("gain_pct", _.gain_pct, _, b), D = t.tHead ? t.tHead.rows.item(0) : null, $ = D ? D.cells.length : 0, V = y.cells.length, w = $ || V, E = w > 0 ? w <= 5 : !1, U = f && typeof g == "number" ? `${ue(g)} %` : "", v = f && typeof g == "number" ? g > 0 ? "positive" : g < 0 ? "negative" : "neutral" : "neutral";
  E ? y.innerHTML = `
      <td>Summe</td>
      <td class="align-right">${h}</td>
      <td class="align-right">${N}</td>
      <td class="align-right">${k}</td>
      <td class="align-right gain-pct-cell">${x}</td>
    ` : y.innerHTML = `
      <td>Summe</td>
      <td class="align-right">${h}</td>
      <td class="align-right">${A}</td>
      <td class="align-right">${N}</td>
      <td class="align-right">${P}</td>
      <td class="align-right">${F}</td>
      <td class="align-right">${k}</td>
      <td class="align-right">${x}</td>
    `;
  const C = y.cells.item(E ? 3 : 6);
  C && (C.dataset.gainPct = U || "—", C.dataset.gainSign = v), y.dataset.positionCount = String(Math.round(i)), y.dataset.currentValue = f ? String(o) : "", y.dataset.purchaseSum = f ? String(a) : "", y.dataset.dayChange = f && p ? String(c) : "", y.dataset.dayChangePct = f && p && typeof m == "number" ? String(m) : "", y.dataset.gainAbs = f ? String(s) : "", y.dataset.gainPct = f && typeof g == "number" ? String(g) : "", y.dataset.hasValue = f ? "true" : "false", y.dataset.fxUnavailable = u ? "true" : "false";
}
function Be(e, t) {
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
  const o = (u, f) => {
    const g = i.querySelector("tbody");
    if (!g) return;
    const m = Array.from(g.querySelectorAll("tr")).filter((b) => !b.classList.contains("footer-row")), y = g.querySelector("tr.footer-row"), h = (b) => {
      if (b == null) return 0;
      const S = b.replace(/\u00A0/g, " ").replace(/[%€]/g, "").replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, ""), A = Number.parseFloat(S);
      return Number.isFinite(A) ? A : 0;
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
      }[u], P = b.cells.item(N), F = S.cells.item(N);
      let k = "";
      if (P) {
        const V = P.textContent;
        typeof V == "string" && (k = V.trim());
      }
      let x = "";
      if (F) {
        const V = F.textContent;
        typeof V == "string" && (x = V.trim());
      }
      const D = (V, w) => {
        const E = V ? V.dataset.sortValue : void 0;
        if (E != null && E !== "") {
          const U = Number(E);
          if (Number.isFinite(U))
            return U;
        }
        return h(w);
      };
      let $;
      if (u === "name")
        $ = k.localeCompare(x, "de", { sensitivity: "base" });
      else {
        const V = D(P, k), w = D(F, x);
        $ = V - w;
      }
      return f === "asc" ? $ : -$;
    }), i.querySelectorAll("thead th.sort-active").forEach((b) => {
      b.classList.remove("sort-active", "dir-asc", "dir-desc");
    });
    const _ = i.querySelector(`thead th[data-sort-key="${u}"]`);
    _ && _.classList.add("sort-active", f === "asc" ? "dir-asc" : "dir-desc"), m.forEach((b) => g.appendChild(b)), y && g.appendChild(y);
  }, a = r.dataset.sortKey, s = r.dataset.sortDir, c = i.dataset.defaultSort, l = i.dataset.defaultDir, p = At(a) ? a : At(c) ? c : "name", d = Nt(s) ? s : Nt(l) ? l : "asc";
  o(p, d), i.addEventListener("click", (u) => {
    const f = u.target;
    if (!(f instanceof Element))
      return;
    const g = f.closest("th[data-sort-key]");
    if (!g || !i.contains(g)) return;
    const m = g.getAttribute("data-sort-key");
    if (!At(m))
      return;
    let y = "asc";
    r.dataset.sortKey === m && (y = (Nt(r.dataset.sortDir) ? r.dataset.sortDir : "asc") === "asc" ? "desc" : "asc"), r.dataset.sortKey = m, r.dataset.sortDir = y, o(m, y);
  });
}
async function Go(e, t, n) {
  if (!e || !it || !ot) return;
  const r = t || n.querySelector(
    `.portfolio-details[data-portfolio="${e}"] .positions-container`
  );
  if (!r)
    return;
  const i = r.closest(".portfolio-details");
  if (!(i && i.classList.contains("hidden"))) {
    r.innerHTML = '<div class="loading">Neu laden...</div>';
    try {
      const o = await Qn(
        it,
        ot,
        e
      );
      if (o.error) {
        const s = typeof o.error == "string" ? o.error : String(o.error);
        r.innerHTML = `<div class="error">${s} <button class="retry-pos" data-portfolio="${e}">Erneut laden</button></div>`;
        return;
      }
      const a = _t(
        Array.isArray(o.positions) ? o.positions : []
      );
      Gt(e, a), Qt(e, a), r.innerHTML = Oe(a);
      try {
        Be(n, e);
      } catch (s) {
        console.warn("attachPortfolioToggleHandler: Sort-Init (Lazy) fehlgeschlagen:", s);
      }
      try {
        We(n, e);
      } catch (s) {
        console.warn("reloadPortfolioPositions: Security-Listener konnte nicht gebunden werden:", s);
      }
    } catch (o) {
      const a = o instanceof Error ? o.message : String(o);
      r.innerHTML = `<div class="error">Fehler: ${a} <button class="retry-pos" data-portfolio="${e}">Retry</button></div>`;
    }
  }
}
async function Xo(e, t, n = 3e3, r = 50) {
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
function rn(e) {
  const n = (typeof e.__ppReaderAttachToken == "number" ? e.__ppReaderAttachToken : 0) + 1;
  e.__ppReaderAttachToken = n, e.__ppReaderAttachInProgress = !0, (async () => {
    try {
      const r = await Xo(e, ".portfolio-table");
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
              const f = s.getAttribute("data-portfolio");
              if (f) {
                const g = e.querySelector(
                  `.portfolio-details[data-portfolio="${f}"]`
                ), m = g == null ? void 0 : g.querySelector(".positions-container");
                await Go(f, m ?? null, e);
              }
              return;
            }
            const c = a.closest(".portfolio-toggle");
            if (!c || !r.contains(c)) return;
            const l = c.getAttribute("data-portfolio");
            if (!l) return;
            const p = e.querySelector(
              `.portfolio-details[data-portfolio="${l}"]`
            );
            if (!p) return;
            const d = c.querySelector(".caret");
            if (p.classList.contains("hidden")) {
              p.classList.remove("hidden"), c.classList.add("expanded"), c.setAttribute("aria-expanded", "true"), d && (d.textContent = "▼"), at.add(l);
              try {
                nn(e, l);
              } catch (f) {
                console.warn("attachPortfolioToggleHandler: Pending-Flush fehlgeschlagen:", f);
              }
              if (Xt(l)) {
                const f = p.querySelector(".positions-container");
                if (f) {
                  f.innerHTML = Oe(
                    nr(l)
                  ), Be(e, l);
                  try {
                    We(e, l);
                  } catch (g) {
                    console.warn("attachPortfolioToggleHandler: Security-Listener (Cache) Fehler:", g);
                  }
                }
              } else {
                const f = p.querySelector(".positions-container");
                f && (f.innerHTML = '<div class="loading">Lade Positionen...</div>');
                try {
                  const g = await Qn(
                    it,
                    ot,
                    l
                  );
                  if (g.error) {
                    const y = typeof g.error == "string" ? g.error : String(g.error);
                    f && (f.innerHTML = `<div class="error">${y} <button class="retry-pos" data-portfolio="${l}">Erneut laden</button></div>`);
                    return;
                  }
                  const m = _t(
                    Array.isArray(g.positions) ? g.positions : []
                  );
                  if (Gt(l, m), Qt(
                    l,
                    m
                  ), f) {
                    f.innerHTML = Oe(m);
                    try {
                      Be(e, l);
                    } catch (y) {
                      console.warn("attachPortfolioToggleHandler: Sort-Init (Lazy) fehlgeschlagen:", y);
                    }
                    try {
                      We(e, l);
                    } catch (y) {
                      console.warn("attachPortfolioToggleHandler: Security-Listener konnte nicht gebunden werden:", y);
                    }
                  }
                } catch (g) {
                  const m = g instanceof Error ? g.message : String(g), y = p.querySelector(".positions-container");
                  y && (y.innerHTML = `<div class="error">Fehler beim Laden: ${m} <button class="retry-pos" data-portfolio="${l}">Retry</button></div>`), console.error("Fehler beim Lazy Load für", l, g);
                }
              }
            } else
              p.classList.add("hidden"), c.classList.remove("expanded"), c.setAttribute("aria-expanded", "false"), d && (d.textContent = "▶"), at.delete(l);
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
function Zo(e) {
  const t = e.querySelector(".expandable-portfolio-table");
  t && (t.__ppReaderPortfolioFallbackBound || (t.__ppReaderPortfolioFallbackBound = !0, t.addEventListener("click", (n) => {
    const r = n.target;
    if (!(r instanceof Element) || !r.closest(".portfolio-toggle")) return;
    const o = e.querySelector(".portfolio-table");
    o != null && o.__ppReaderPortfolioToggleBound || (console.debug("Fallback-Listener aktiv – re-attach Hauptlistener"), rn(e));
  })));
}
async function Pr(e, t, n) {
  var D, $, V;
  it = t ?? null, ot = n ?? null, console.debug(
    "renderDashboard: start – panelConfig:",
    n == null ? void 0 : n.config,
    "derived entry_id?",
    (V = ($ = (D = n == null ? void 0 : n.config) == null ? void 0 : D._panel_custom) == null ? void 0 : $.config) == null ? void 0 : V.entry_id
  );
  const r = await Ri(t, n);
  or(r.accounts);
  const i = dr(), o = await Li(t, n);
  ro(o.portfolios);
  const a = po();
  let s = "";
  try {
    s = await $i(t, n);
  } catch {
    s = "";
  }
  const c = i.reduce(
    (w, E) => w + (typeof E.balance == "number" && Number.isFinite(E.balance) ? E.balance : 0),
    0
  ), l = a.some((w) => w.fx_unavailable), p = i.some((w) => w.fx_unavailable && (w.balance == null || !Number.isFinite(w.balance))), d = a.reduce((w, E) => E.hasValue && typeof E.current_value == "number" && Number.isFinite(E.current_value) ? w + E.current_value : w, 0), u = c + d, f = "Teilw. fehlende FX-Kurse – Gesamtvermögen abweichend", m = a.some((w) => w.hasValue && typeof w.current_value == "number" && Number.isFinite(w.current_value)) || i.some((w) => typeof w.balance == "number" && Number.isFinite(w.balance)) ? `${ue(u)}&nbsp;€` : `<span class="missing-value" role="note" aria-label="${f}" title="${f}">—</span>`, y = l || p ? `<span class="total-wealth-note">${f}</span>` : "", h = `
    <div class="header-meta-row">
      💰 Gesamtvermögen: <strong class="total-wealth-value">${m}</strong>${y}
    </div>
  `, _ = kt("Übersicht", h), b = vr(a), S = i.filter((w) => (w.currency_code ?? "EUR") === "EUR"), A = i.filter((w) => (w.currency_code ?? "EUR") !== "EUR"), P = A.some((w) => w.fx_unavailable) ? `
        <p class="table-note" role="note">
          <span class="table-note__icon" aria-hidden="true">⚠️</span>
          <span>Wechselkurse konnten nicht geladen werden. EUR-Werte werden derzeit nicht angezeigt.</span>
        </p>
      ` : "", F = `
    <div class="card">
      <h2>Liquidität</h2>
      <div class="scroll-container account-table">
        ${Fe(
    S.map((w) => ({
      name: rt(w.name, En(w.badges), {
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
          ${Fe(
    A.map((w) => {
      const E = w.orig_balance, v = typeof E == "number" && Number.isFinite(E) ? `${E.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}&nbsp;${w.currency_code ?? ""}` : "";
      return {
        name: rt(w.name, En(w.badges), {
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
  `, k = `
    <div class="card footer-card">
      <div class="meta">
        <div class="last-file-update">
          📂 Letzte Aktualisierung der Datei: <strong>${s || "Unbekannt"}</strong>
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
    ${F}
    ${k}
  `;
  return Jo(e, a), x;
}
function Jo(e, t) {
  if (!e)
    return;
  const n = () => {
    try {
      const i = e, o = i.querySelector(".portfolio-table");
      o && o.querySelectorAll(".portfolio-toggle").length === 0 && (console.debug("Recovery: Tabelle ohne Buttons – erneuter Aufbau"), o.innerHTML = vr(t)), rn(e), Zo(e), at.forEach((a) => {
        try {
          Xt(a) && (Be(e, a), We(e, a));
        } catch (s) {
          console.warn("Init-Sortierung für expandiertes Depot fehlgeschlagen:", a, s);
        }
      });
      try {
        Sr(i);
      } catch (a) {
        console.warn("renderDashboard: Footer-Summe konnte nicht aktualisiert werden:", a);
      }
      try {
        Do(e);
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
qi({
  renderPositionsTable: (e) => jo(e),
  applyGainPctMetadata: br,
  attachSecurityDetailListener: We,
  attachPortfolioPositionsSorting: Be,
  updatePortfolioFooter: (e) => {
    e && Sr(e);
  }
});
const Qo = "http://www.w3.org/2000/svg", Pe = 640, Ae = 260, He = { top: 12, right: 16, bottom: 24, left: 16 }, Ie = "var(--pp-reader-chart-line, #3f51b5)", Lt = "var(--pp-reader-chart-area, rgba(63, 81, 181, 0.12))", Dn = "0.75rem", Ar = "var(--pp-reader-chart-baseline, rgba(96, 125, 139, 0.75))", Nr = "6 4", ea = 24 * 60 * 60 * 1e3;
function ta(e) {
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
function na(e) {
  return typeof e == "string" ? e : typeof e == "number" && Number.isFinite(e) ? e.toString() : e instanceof Date && Number.isFinite(e.getTime()) ? e.toISOString() : "";
}
function Q(e) {
  return `${String(e)}px`;
}
function ne(e, t = {}) {
  const n = document.createElementNS(Qo, e);
  return Object.entries(t).forEach(([r, i]) => {
    const o = ta(i);
    o != null && n.setAttribute(r, o);
  }), n;
}
function st(e, t = null) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  if (typeof e == "string" && e.trim() !== "") {
    const n = Number.parseFloat(e);
    if (Number.isFinite(n))
      return n;
  }
  return t;
}
function wr(e, t) {
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
const Er = (e) => {
  if (e && typeof e == "object" && "date" in e)
    return e.date;
}, Fr = (e) => {
  if (e && typeof e == "object" && "close" in e)
    return e.close;
}, Cr = (e, t, n) => {
  if (Number.isFinite(e)) {
    const r = new Date(e);
    if (!Number.isNaN(r.getTime()))
      return r.toLocaleDateString("de-DE");
  }
  if (t && typeof t == "object" && "date" in t) {
    const r = t.date, i = na(r);
    if (i)
      return i;
  }
  return Number.isFinite(e) ? e.toString() : "";
}, xr = (e, t, n) => (Number.isFinite(e) ? e : st(e, 0) ?? 0).toLocaleString("de-DE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
}), Dr = ({ xFormatted: e, yFormatted: t }) => `
    <div class="chart-tooltip-date">${e}</div>
    <div class="chart-tooltip-value">${t}&nbsp;€</div>
  `, kr = ({
  marker: e,
  xFormatted: t,
  yFormatted: n
}) => `
    <div class="chart-tooltip-date">${(typeof e.label == "string" ? e.label : null) || t}</div>
    <div class="chart-tooltip-value">${n}</div>
  `;
function Tr(e) {
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
    width: Pe,
    height: Ae,
    margin: { ...He },
    series: [],
    points: [],
    range: null,
    xAccessor: Er,
    yAccessor: Fr,
    xFormatter: Cr,
    yFormatter: xr,
    tooltipRenderer: Dr,
    markerTooltipRenderer: kr,
    color: Ie,
    areaColor: Lt,
    baseline: null,
    handlersAttached: !1,
    markers: [],
    markerPositions: []
  }), e.__chartState;
}
function te(e, t, n) {
  return !Number.isFinite(e) || e < t ? t : e > n ? n : e;
}
function ra(e, t) {
  if (e.length === 0)
    return "";
  const n = [];
  e.forEach((a, s) => {
    const c = s === 0 ? "M" : "L", l = a.x.toFixed(2), p = a.y.toFixed(2);
    n.push(`${c}${l} ${p}`);
  });
  const r = e[0], o = `L${e[e.length - 1].x.toFixed(2)} ${t.toFixed(2)} L${r.x.toFixed(2)} ${t.toFixed(2)} Z`;
  return `${n.join(" ")} ${o}`;
}
function ia(e) {
  if (e.length === 0)
    return "";
  const t = [];
  return e.forEach((n, r) => {
    const i = r === 0 ? "M" : "L", o = n.x.toFixed(2), a = n.y.toFixed(2);
    t.push(`${i}${o} ${a}`);
  }), t.join(" ");
}
function oa(e) {
  const { baselineLine: t, baseline: n } = e;
  if (!t)
    return;
  const r = (n == null ? void 0 : n.color) ?? Ar, i = (n == null ? void 0 : n.dashArray) ?? Nr;
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
  const { minY: s, maxY: c, boundedHeight: l } = r, p = Number.isFinite(s) ? s : a, u = (Number.isFinite(c) ? c : p + 1) - p, f = u === 0 ? 0.5 : (a - p) / u, g = te(f, 0, 1), m = Math.max(l, 0), y = i.top + (1 - g) * m, h = Math.max(o - i.left - i.right, 0), _ = i.left, b = i.left + h;
  t.setAttribute("x1", _.toFixed(2)), t.setAttribute("x2", b.toFixed(2)), t.setAttribute("y1", y.toFixed(2)), t.setAttribute("y2", y.toFixed(2)), t.style.opacity = "1";
}
function aa(e, t, n) {
  var w;
  const { width: r, height: i, margin: o } = t, { xAccessor: a, yAccessor: s } = n;
  if (e.length === 0)
    return { points: [], range: null };
  const c = e.map((E, U) => {
    const v = a(E, U), C = s(E, U), T = wr(v, U), j = st(C, Number.NaN);
    return Number.isFinite(j) ? {
      index: U,
      data: E,
      xValue: T,
      yValue: j
    } : null;
  }).filter((E) => !!E);
  if (c.length === 0)
    return { points: [], range: null };
  const l = c.reduce((E, U) => Math.min(E, U.xValue), c[0].xValue), p = c.reduce((E, U) => Math.max(E, U.xValue), c[0].xValue), d = c.reduce((E, U) => Math.min(E, U.yValue), c[0].yValue), u = c.reduce((E, U) => Math.max(E, U.yValue), c[0].yValue), f = Math.max(r - o.left - o.right, 1), g = Math.max(i - o.top - o.bottom, 1), m = Number.isFinite(l) ? l : 0, y = Number.isFinite(p) ? p : m + 1, h = Number.isFinite(d) ? d : 0, _ = Number.isFinite(u) ? u : h + 1, b = st((w = t.baseline) == null ? void 0 : w.value, null), S = b != null && Number.isFinite(b) ? Math.min(h, b) : h, A = b != null && Number.isFinite(b) ? Math.max(_, b) : _, N = Math.max(
    2,
    Math.min(
      6,
      Math.round(
        Math.max(i - o.top - o.bottom, 0) / 60
      ) || 4
    )
  ), { niceMin: P, niceMax: F } = ga(
    S,
    A,
    N
  ), k = Number.isFinite(P) ? P : h, x = Number.isFinite(F) ? F : _, D = y - m || 1, $ = x - k || 1;
  return {
    points: c.map((E) => {
      const U = D === 0 ? 0.5 : (E.xValue - m) / D, v = $ === 0 ? 0.5 : (E.yValue - k) / $, C = o.left + U * f, T = o.top + (1 - v) * g;
      return {
        ...E,
        x: C,
        y: T
      };
    }),
    range: {
      minX: m,
      maxX: y,
      minY: k,
      maxY: x,
      boundedWidth: f,
      boundedHeight: g
    }
  };
}
function Et(e) {
  const { markerLayer: t, markerOverlay: n, markers: r, range: i, margin: o, markerTooltip: a } = e;
  if (e.markerPositions = [], et(e), !t || !n)
    return;
  for (; t.firstChild; )
    t.removeChild(t.firstChild);
  for (; n.firstChild; )
    n.removeChild(n.firstChild);
  if (!i || !Array.isArray(r) || r.length === 0)
    return;
  const s = i.maxX - i.minX || 1, c = i.maxY - i.minY || 1;
  r.forEach((l, p) => {
    const d = wr(l.x, p), u = st(l.y, Number.NaN), f = Number(u);
    if (!Number.isFinite(d) || !Number.isFinite(f))
      return;
    const g = s === 0 ? 0.5 : te((d - i.minX) / s, 0, 1), m = c === 0 ? 0.5 : te((f - i.minY) / c, 0, 1), y = o.left + g * i.boundedWidth, h = o.top + (1 - m) * i.boundedHeight, _ = ne("g", {
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
  }), a && (a.style.opacity = "0", a.style.visibility = "hidden");
}
function Rr(e, t, n, r) {
  e.width = Number.isFinite(t) ? Number(t) : Pe, e.height = Number.isFinite(n) ? Number(n) : Ae, e.margin = {
    top: Number.isFinite(r == null ? void 0 : r.top) ? Number(r == null ? void 0 : r.top) : He.top,
    right: Number.isFinite(r == null ? void 0 : r.right) ? Number(r == null ? void 0 : r.right) : He.right,
    bottom: Number.isFinite(r == null ? void 0 : r.bottom) ? Number(r == null ? void 0 : r.bottom) : He.bottom,
    left: Number.isFinite(r == null ? void 0 : r.left) ? Number(r == null ? void 0 : r.left) : He.left
  };
}
function sa(e, t) {
  const n = e.xFormatter(t.xValue, t.data, t.index), r = e.yFormatter(t.yValue, t.data, t.index);
  return e.tooltipRenderer({
    point: t,
    xFormatted: n,
    yFormatted: r,
    data: t.data,
    index: t.index
  });
}
function ca(e, t, n, r = null) {
  const { tooltip: i, width: o, margin: a, height: s } = e;
  if (!i)
    return;
  const c = r && Number.isFinite(r.scaleX) && r.scaleX > 0 ? r.scaleX : 1, l = r && Number.isFinite(r.scaleY) && r.scaleY > 0 ? r.scaleY : 1, p = s - a.bottom;
  i.style.visibility = "visible", i.style.opacity = "1";
  const d = i.offsetWidth || 0, u = i.offsetHeight || 0, f = t.x * c, g = te(
    f - d / 2,
    a.left * c,
    (o - a.right) * c - d
  ), m = Math.max(p * l - u, 0), y = 12, _ = (Number.isFinite(n) ? te(n ?? 0, a.top, p) : t.y) * l;
  let b = _ - u - y;
  b < a.top * l && (b = _ + y), b = te(b, 0, m);
  const S = Q(Math.round(g)), A = Q(Math.round(b));
  i.style.transform = `translate(${S}, ${A})`;
}
function Mt(e) {
  const { tooltip: t, focusLine: n, focusCircle: r } = e;
  t && (t.style.opacity = "0", t.style.visibility = "hidden"), n && (n.style.opacity = "0"), r && (r.style.opacity = "0");
}
function la(e, t) {
  const { marker: n } = t, r = e.xFormatter(t.marker.x, n, -1), i = e.yFormatter(t.marker.y, n, -1);
  return e.markerTooltipRenderer({
    marker: n,
    xFormatted: r,
    yFormatted: i
  });
}
function ua(e, t, n, r = null) {
  var D;
  const { markerTooltip: i, width: o, margin: a, height: s, tooltip: c } = e;
  if (!i)
    return;
  const l = r && Number.isFinite(r.scaleX) && r.scaleX > 0 ? r.scaleX : 1, p = r && Number.isFinite(r.scaleY) && r.scaleY > 0 ? r.scaleY : 1, d = s - a.bottom;
  i.style.visibility = "visible", i.style.opacity = "1";
  const u = i.offsetWidth || 0, f = i.offsetHeight || 0, g = t.x * l, m = te(
    g - u / 2,
    a.left * l,
    (o - a.right) * l - u
  ), y = Math.max(d * p - f, 0), h = 10, _ = c == null ? void 0 : c.getBoundingClientRect(), b = (D = e.svg) == null ? void 0 : D.getBoundingClientRect(), S = _ && b ? _.top - b.top : null, A = _ && b ? _.bottom - b.top : null, P = (Number.isFinite(n) ? te(n ?? t.y, a.top, d) : t.y) * p;
  let F;
  S != null && A != null ? S <= P ? F = S - f - h : F = A + h : (F = P - f - h, F < a.top * p && (F = P + h)), F = te(F, 0, y);
  const k = Q(Math.round(m)), x = Q(Math.round(F));
  i.style.transform = `translate(${k}, ${x})`;
}
function et(e) {
  const { markerTooltip: t } = e;
  t && (t.style.opacity = "0", t.style.visibility = "hidden");
}
function da(e, t, n) {
  let i = null, o = 24 * 24;
  for (const a of e.markerPositions) {
    const s = a.x - t, c = a.y - n, l = s * s + c * c;
    l <= o && (i = a, o = l);
  }
  return i;
}
function fa(e, t) {
  if (t.handlersAttached || !t.overlay)
    return;
  const n = (i) => {
    if (t.points.length === 0 || !t.svg) {
      Mt(t), et(t);
      return;
    }
    const o = t.svg.getBoundingClientRect(), a = t.width || Pe, s = t.height || Ae, c = o.width && Number.isFinite(o.width) && Number.isFinite(a) && a > 0 ? o.width / a : 1, l = o.height && Number.isFinite(o.height) && Number.isFinite(s) && s > 0 ? o.height / s : 1, p = c > 0 ? 1 / c : 1, d = l > 0 ? 1 / l : 1, u = (i.clientX - o.left) * p, f = (i.clientY - o.top) * d, g = {
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
    ), t.focusLine.style.opacity = "1"), t.tooltip && (t.tooltip.innerHTML = sa(t, m), ca(t, m, f, g));
    const h = da(t, u, f);
    h && t.markerTooltip ? (t.markerTooltip.innerHTML = la(t, h), ua(t, h, f, g)) : et(t);
  }, r = () => {
    Mt(t), et(t);
  };
  t.overlay.addEventListener("pointermove", n), t.overlay.addEventListener("pointerenter", n), t.overlay.addEventListener("pointerleave", r), t.handlersAttached = !0, t.handlePointerMove = n, t.handlePointerLeave = r, e.addEventListener("pointercancel", r);
}
function pa(e, t = {}) {
  const n = document.createElement("div");
  n.className = "line-chart-container", n.dataset.chartType = "line", n.style.position = "relative";
  const r = ne("svg", {
    width: Pe,
    height: Ae,
    viewBox: `0 0 ${String(Pe)} ${String(Ae)}`,
    role: "img",
    "aria-hidden": "true",
    focusable: "false"
  });
  r.classList.add("line-chart-svg");
  const i = ne("path", {
    class: "line-chart-area",
    fill: Lt,
    stroke: "none"
  }), o = ne("line", {
    class: "line-chart-baseline",
    stroke: Ar,
    "stroke-width": 1,
    "stroke-dasharray": Nr,
    opacity: 0
  }), a = ne("path", {
    class: "line-chart-path",
    fill: "none",
    stroke: Ie,
    "stroke-width": 2,
    "stroke-linecap": "round",
    "stroke-linejoin": "round"
  }), s = ne("line", {
    class: "line-chart-focus-line",
    stroke: Ie,
    "stroke-width": 1,
    "stroke-dasharray": "4 4",
    opacity: 0
  }), c = ne("circle", {
    class: "line-chart-focus-circle",
    r: 4,
    fill: "#fff",
    stroke: Ie,
    "stroke-width": 2,
    opacity: 0
  }), l = ne("g", {
    class: "line-chart-markers"
  }), p = ne("rect", {
    class: "line-chart-overlay",
    fill: "transparent",
    x: 0,
    y: 0,
    width: Pe,
    height: Ae
  });
  r.appendChild(i), r.appendChild(o), r.appendChild(a), r.appendChild(s), r.appendChild(c), r.appendChild(l), r.appendChild(p), n.appendChild(r);
  const d = document.createElement("div");
  d.className = "chart-tooltip", d.style.position = "absolute", d.style.top = "0", d.style.left = "0", d.style.pointerEvents = "none", d.style.opacity = "0", d.style.visibility = "hidden", n.appendChild(d);
  const u = document.createElement("div");
  u.className = "line-chart-marker-overlay", u.style.position = "absolute", u.style.top = "0", u.style.left = "0", u.style.width = "100%", u.style.height = "100%", u.style.pointerEvents = "none", u.style.overflow = "visible", u.style.zIndex = "2", n.appendChild(u);
  const f = document.createElement("div");
  f.className = "chart-tooltip chart-tooltip--marker", f.style.position = "absolute", f.style.top = "0", f.style.left = "0", f.style.pointerEvents = "none", f.style.opacity = "0", f.style.visibility = "hidden", n.appendChild(f), e.appendChild(n);
  const g = Tr(n);
  if (g.svg = r, g.areaPath = i, g.linePath = a, g.baselineLine = o, g.focusLine = s, g.focusCircle = c, g.overlay = p, g.tooltip = d, g.markerOverlay = u, g.markerLayer = l, g.markerTooltip = f, g.xAccessor = t.xAccessor ?? Er, g.yAccessor = t.yAccessor ?? Fr, g.xFormatter = t.xFormatter ?? Cr, g.yFormatter = t.yFormatter ?? xr, g.tooltipRenderer = t.tooltipRenderer ?? Dr, g.markerTooltipRenderer = t.markerTooltipRenderer ?? kr, g.color = t.color ?? Ie, g.areaColor = t.areaColor ?? Lt, g.baseline = t.baseline ?? null, g.handlersAttached = !1, g.markers = Array.isArray(t.markers) ? t.markers.slice() : [], !g.xAxis) {
    const m = document.createElement("div");
    m.className = "line-chart-axis line-chart-axis-x", m.style.position = "absolute", m.style.left = "0", m.style.right = "0", m.style.bottom = "0", m.style.pointerEvents = "none", m.style.fontSize = Dn, m.style.color = "var(--secondary-text-color)", m.style.display = "block", n.appendChild(m), g.xAxis = m;
  }
  if (!g.yAxis) {
    const m = document.createElement("div");
    m.className = "line-chart-axis line-chart-axis-y", m.style.position = "absolute", m.style.top = "0", m.style.bottom = "0", m.style.left = "0", m.style.pointerEvents = "none", m.style.fontSize = Dn, m.style.color = "var(--secondary-text-color)", m.style.display = "block", n.appendChild(m), g.yAxis = m;
  }
  return Rr(g, t.width, t.height, t.margin), a.setAttribute("stroke", g.color), s.setAttribute("stroke", g.color), c.setAttribute("stroke", g.color), i.setAttribute("fill", g.areaColor), $r(n, t), fa(n, g), n;
}
function $r(e, t = {}) {
  if (!e) {
    console.error("updateLineChart: container element is required");
    return;
  }
  const n = Tr(e);
  if (!n.svg || !n.linePath || !n.overlay) {
    console.error("updateLineChart: chart was not initialised with renderLineChart");
    return;
  }
  t.xAccessor && (n.xAccessor = t.xAccessor), t.yAccessor && (n.yAccessor = t.yAccessor), t.xFormatter && (n.xFormatter = t.xFormatter), t.yFormatter && (n.yFormatter = t.yFormatter), t.tooltipRenderer && (n.tooltipRenderer = t.tooltipRenderer), t.markerTooltipRenderer && (n.markerTooltipRenderer = t.markerTooltipRenderer), t.color && (n.color = t.color, n.linePath.setAttribute("stroke", n.color), n.focusLine && n.focusLine.setAttribute("stroke", n.color), n.focusCircle && n.focusCircle.setAttribute("stroke", n.color)), t.areaColor && (n.areaColor = t.areaColor, n.areaPath && n.areaPath.setAttribute("fill", n.areaColor)), Object.prototype.hasOwnProperty.call(t, "baseline") && (n.baseline = t.baseline ?? null), Array.isArray(t.markers) && (n.markers = t.markers.slice()), oa(n), Rr(n, t.width, t.height, t.margin);
  const { width: r, height: i } = n;
  n.svg.setAttribute("width", String(r)), n.svg.setAttribute("height", String(i)), n.svg.setAttribute("viewBox", `0 0 ${String(r)} ${String(i)}`), n.overlay.setAttribute("x", "0"), n.overlay.setAttribute("y", "0"), n.overlay.setAttribute("width", Math.max(r, 0).toFixed(2)), n.overlay.setAttribute("height", Math.max(i, 0).toFixed(2)), Array.isArray(t.series) && (n.series = Array.from(t.series));
  const { points: o, range: a } = aa(n.series, n, {
    xAccessor: n.xAccessor,
    yAccessor: n.yAccessor
  });
  if (n.points = o, n.range = a, o.length === 0) {
    n.linePath.setAttribute("d", ""), n.areaPath && n.areaPath.setAttribute("d", ""), Mt(n), Et(n), Ft(n), wt(n);
    return;
  }
  if (o.length === 1) {
    const c = o[0], l = Math.max(
      0.5,
      Math.min(4, Math.max(n.width - n.margin.left - n.margin.right, 1) * 0.01)
    ), p = `M${c.x.toFixed(2)} ${c.y.toFixed(2)} h${l.toFixed(2)}`;
    n.linePath.setAttribute("d", p), n.areaPath && n.areaPath.setAttribute("d", ""), n.focusCircle && (n.focusCircle.setAttribute("cx", c.x.toFixed(2)), n.focusCircle.setAttribute("cy", c.y.toFixed(2)), n.focusCircle.style.opacity = "1"), n.focusLine && (n.focusLine.style.opacity = "0"), Ft(n), wt(n), Et(n);
    return;
  }
  const s = ia(o);
  if (n.linePath.setAttribute("d", s), n.areaPath && a) {
    const c = n.margin.top + a.boundedHeight, l = ra(o, c);
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
  const { minX: s, maxX: c, minY: l, maxY: p, boundedWidth: d, boundedHeight: u } = r, f = Number.isFinite(s) && Number.isFinite(c) && c >= s, g = Number.isFinite(l) && Number.isFinite(p) && p >= l, m = Math.max(d, 0), y = Math.max(u, 0);
  if (t.style.left = Q(i.left), t.style.width = Q(m), t.style.top = Q(o - i.bottom + 6), t.innerHTML = "", f && m > 0) {
    const _ = (c - s) / ea, b = Math.max(2, Math.min(6, Math.round(m / 140) || 4));
    ha(e, s, c, b, _).forEach(({ positionRatio: A, label: N }) => {
      const P = document.createElement("div");
      P.className = "line-chart-axis-tick line-chart-axis-tick-x", P.style.position = "absolute", P.style.bottom = "0";
      const F = te(A, 0, 1);
      P.style.left = Q(F * m);
      let k = "-50%", x = "center";
      F <= 1e-3 ? (k = "0", x = "left", P.style.marginLeft = "2px") : F >= 0.999 && (k = "-100%", x = "right", P.style.marginRight = "2px"), P.style.transform = `translateX(${k})`, P.style.textAlign = x, P.textContent = N, t.appendChild(P);
    });
  }
  n.style.top = Q(i.top), n.style.height = Q(y);
  const h = Math.max(i.left - 6, 0);
  if (n.style.left = "0", n.style.width = Q(Math.max(h, 0)), n.innerHTML = "", g && y > 0) {
    const _ = Math.max(2, Math.min(6, Math.round(y / 60) || 4)), b = ma(l, p, _), S = a;
    b.forEach(({ value: A, positionRatio: N }) => {
      const P = document.createElement("div");
      P.className = "line-chart-axis-tick line-chart-axis-tick-y", P.style.position = "absolute", P.style.left = "0";
      const k = (1 - te(N, 0, 1)) * y;
      P.style.top = Q(k), P.textContent = S(A, null, -1), n.appendChild(P);
    });
  }
}
function ga(e, t, n = 4) {
  if (!Number.isFinite(e) || !Number.isFinite(t))
    return {
      niceMin: e,
      niceMax: t
    };
  const r = Math.max(2, n);
  if (t === e) {
    const l = Ht(Math.abs(e) || 1);
    return {
      niceMin: e - l,
      niceMax: t + l
    };
  }
  const o = (t - e) / (r - 1), a = Ht(o), s = Math.floor(e / a) * a, c = Math.ceil(t / a) * a;
  return s === c ? {
    niceMin: e,
    niceMax: t + a
  } : {
    niceMin: s,
    niceMax: c
  };
}
function ha(e, t, n, r, i) {
  if (!Number.isFinite(t) || !Number.isFinite(n) || n < t)
    return [];
  if (!Number.isFinite(i) || i <= 0)
    return [
      {
        positionRatio: 0.5,
        label: kn(e, t, i || 0)
      }
    ];
  const o = Math.max(2, r), a = [], s = n - t;
  for (let c = 0; c < o; c += 1) {
    const l = o === 1 ? 0.5 : c / (o - 1), p = t + l * s;
    a.push({
      positionRatio: l,
      label: kn(e, p, i)
    });
  }
  return a;
}
function kn(e, t, n) {
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
function ma(e, t, n) {
  if (!Number.isFinite(e) || !Number.isFinite(t))
    return [];
  if (t === e)
    return [
      {
        value: e,
        positionRatio: 0.5
      }
    ];
  const r = t - e, i = Math.max(2, n), o = r / (i - 1), a = Ht(o), s = Math.floor(e / a) * a, c = Math.ceil(t / a) * a, l = [];
  for (let p = s; p <= c + a / 2; p += a) {
    const d = (p - e) / (t - e);
    l.push({
      value: p,
      positionRatio: te(d, 0, 1)
    });
  }
  return l.length > i + 2 ? l.filter((p, d) => d % 2 === 0) : l;
}
function Ht(e) {
  if (!Number.isFinite(e) || e === 0)
    return 1;
  const t = Math.floor(Math.log10(Math.abs(e))), n = Math.abs(e) / 10 ** t;
  let r;
  return n <= 1 ? r = 1 : n <= 2 ? r = 2 : n <= 5 ? r = 5 : r = 10, r * 10 ** t;
}
function _a(e) {
  return Array.isArray(e) && e.every((t) => typeof t == "string");
}
function ya(e) {
  return typeof e == "object" && e !== null;
}
function ba(e) {
  if (!ya(e))
    return !1;
  const t = e;
  return typeof t.portfolioUuid != "string" ? !1 : _a(t.securityUuids);
}
function va(e) {
  return e instanceof CustomEvent ? ba(e.detail) : !1;
}
const Ct = { min: 0, max: 6 }, ct = { min: 2, max: 4 }, Sa = "1Y", Lr = [
  "1M",
  "6M",
  "1Y",
  "5Y",
  "ALL"
], Pa = {
  "1M": 30,
  "6M": 182,
  "1Y": 365,
  "5Y": 1826,
  ALL: Number.POSITIVE_INFINITY
}, Aa = /* @__PURE__ */ new Set([0, 2]), Na = /* @__PURE__ */ new Set([1, 3]), wa = "var(--pp-reader-chart-marker-buy, #2e7d32)", Ea = "var(--pp-reader-chart-marker-sell, #c0392b)", Tn = "{TICKER}", Fa = "https://chatgpt.com/", xt = {
  aggregation: "Aggregationsdaten",
  totals: "Kaufsummen",
  eur_total: "EUR-Kaufsumme"
}, Ne = /* @__PURE__ */ new Map(), tt = /* @__PURE__ */ new Map(), je = /* @__PURE__ */ new Map(), we = /* @__PURE__ */ new Map(), Mr = "pp-reader:portfolio-positions-updated", Ve = /* @__PURE__ */ new Map();
function Ca(e) {
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
function xa(e, t) {
  if (e) {
    if (t) {
      je.set(e, t);
      return;
    }
    je.delete(e);
  }
}
function Da(e) {
  if (!e || typeof window > "u")
    return null;
  if (je.has(e)) {
    const t = je.get(e) || null;
    if (t)
      return t;
  }
  return null;
}
function Hr(e) {
  return Ne.has(e) || Ne.set(e, /* @__PURE__ */ new Map()), Ne.get(e);
}
function Ir(e) {
  return we.has(e) || we.set(e, /* @__PURE__ */ new Map()), we.get(e);
}
function Vr(e) {
  if (e) {
    if (Ne.has(e)) {
      try {
        const t = Ne.get(e);
        t && t.clear();
      } catch (t) {
        console.warn("invalidateHistoryCache: Konnte Cache nicht leeren", e, t);
      }
      Ne.delete(e);
    }
    if (we.has(e)) {
      try {
        const t = we.get(e);
        t == null || t.clear();
      } catch (t) {
        console.warn("invalidateHistoryCache: Konnte Marker-Cache nicht leeren", e, t);
      }
      we.delete(e);
    }
  }
}
function Ur(e) {
  e && je.delete(e);
}
function ka(e, t) {
  if (!e || !t)
    return;
  const n = t.securityUuids;
  (Array.isArray(n) ? n : []).includes(e) && (Vr(e), Ur(e));
}
function Ta(e) {
  if (!e || Ve.has(e))
    return;
  const t = (n) => {
    va(n) && ka(e, n.detail);
  };
  try {
    window.addEventListener(Mr, t), Ve.set(e, t);
  } catch (n) {
    console.error("ensureLiveUpdateSubscription: Registrierung fehlgeschlagen", n);
  }
}
function Ra(e) {
  if (!e || !Ve.has(e))
    return;
  const t = Ve.get(e);
  try {
    t && window.removeEventListener(Mr, t);
  } catch (n) {
    console.error("removeLiveUpdateSubscription: Entfernen des Listeners fehlgeschlagen", n);
  }
  Ve.delete(e);
}
function $a(e) {
  e && (Ra(e), Vr(e), Ur(e));
}
function Rn(e, t) {
  if (!tt.has(e)) {
    tt.set(e, { activeRange: t });
    return;
  }
  const n = tt.get(e);
  n && (n.activeRange = t);
}
function zr(e) {
  var t;
  return ((t = tt.get(e)) == null ? void 0 : t.activeRange) ?? Sa;
}
function It(e) {
  const t = Date.UTC(
    e.getUTCFullYear(),
    e.getUTCMonth(),
    e.getUTCDate()
  );
  return Math.floor(t / 864e5);
}
function Ce(e) {
  const t = new Date(e.getTime());
  return t.setUTCHours(0, 0, 0, 0), t;
}
function $n(e) {
  return !(e instanceof Date) || Number.isNaN(e.getTime()) ? null : It(Ce(e));
}
function M(e) {
  return se(e);
}
function qr(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t || null;
}
function be(e) {
  const t = qr(e);
  return t ? t.toUpperCase() : null;
}
function La(e) {
  if (!e)
    return null;
  const t = Zt(e.aggregation), n = M(t == null ? void 0 : t.purchase_total_security) ?? (t ? M(
    t.security_currency_total
  ) : null), r = M(t == null ? void 0 : t.purchase_total_account) ?? (t ? M(
    t.account_currency_total
  ) : null);
  if (re(n) && re(r)) {
    const s = n / r;
    if (re(s))
      return s;
  }
  const i = De(e.average_cost), o = M(i == null ? void 0 : i.native) ?? M(i == null ? void 0 : i.security), a = M(i == null ? void 0 : i.account) ?? M(i == null ? void 0 : i.eur);
  if (re(o) && re(a)) {
    const s = o / a;
    if (re(s))
      return s;
  }
  return null;
}
function Or(e, t = "Unbekannter Fehler") {
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
function lt(e, t) {
  const n = Ce(t instanceof Date ? t : /* @__PURE__ */ new Date()), r = Pa[e], i = $n(n), o = {};
  if (i != null && (o.end_date = i), Number.isFinite(r) && r > 0) {
    const a = new Date(n.getTime());
    a.setUTCDate(a.getUTCDate() - (r - 1));
    const s = $n(a);
    s != null && (o.start_date = s);
  }
  return o;
}
function on(e) {
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
      return Number.isNaN(n.getTime()) ? null : Ce(n);
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
          return Ce(r);
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
function Ma(e) {
  const t = on(e);
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
function ut(e) {
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
function Vt(e) {
  return Array.isArray(e) ? e.map((t) => {
    let r = M(t.close);
    if (r == null) {
      const o = M(t.close_raw);
      o != null && (r = o / 1e8);
    }
    return r == null ? null : {
      date: on(t.date) ?? t.date,
      close: r
    };
  }).filter((t) => !!t) : [];
}
function dt(e, t, n = null) {
  if (!Array.isArray(e))
    return [];
  const r = [], i = be(t), o = i || "EUR", a = La(n);
  return e.forEach((s, c) => {
    const l = typeof s.type == "number" ? s.type : Number(s.type), p = Aa.has(l), d = Na.has(l);
    if (!p && !d)
      return;
    const u = Ma(s.date);
    let f = M(s.price);
    if (!u || f == null)
      return;
    const g = be(s.currency_code), m = i ?? g ?? o;
    g && i && g !== i && re(a) && (f *= a);
    const y = M(s.shares), h = M(s.net_price_eur), _ = p ? "Kauf" : "Verkauf", b = y != null ? `${cn(y)} @ ` : "", S = `${_} ${b}${le(f)} ${m}`, A = d && h != null ? `${S} (netto ${le(h)} EUR)` : S, N = p ? wa : Ea, P = typeof s.uuid == "string" && s.uuid.trim() || `${_}-${u.getTime().toString()}-${c.toString()}`;
    r.push({
      id: P,
      x: u.getTime(),
      y: f,
      color: N,
      label: A,
      payload: {
        type: _,
        currency: m,
        transactionCurrency: g,
        shares: y,
        price: f,
        netPriceEur: h,
        date: u.toISOString(),
        portfolio: s.portfolio
      }
    });
  }), r;
}
function an(e) {
  var r;
  const t = M(e == null ? void 0 : e.last_price_native) ?? M((r = e == null ? void 0 : e.last_price) == null ? void 0 : r.native) ?? null;
  if (R(t))
    return t;
  if (be(e == null ? void 0 : e.currency_code) === "EUR") {
    const i = M(e == null ? void 0 : e.last_price_eur);
    if (R(i))
      return i;
  }
  return null;
}
function Ha(e) {
  if (!e)
    return null;
  const n = e.last_price_fetched_at, r = ut(n);
  if (r != null)
    return r;
  const i = e.last_price, o = i == null ? void 0 : i.fetched_at;
  return ut(o) ?? null;
}
function Ut(e, t) {
  let n = [];
  Array.isArray(e) && (n = e.map((l) => ({
    ...l
  })));
  const r = n.slice(), i = an(t);
  if (!R(i))
    return r;
  const o = Ha(t) ?? Date.now(), a = new Date(o);
  if (Number.isNaN(a.getTime()))
    return r;
  const s = It(Ce(a));
  let c = null;
  for (let l = r.length - 1; l >= 0; l -= 1) {
    const p = r[l], d = on(p.date);
    if (!d)
      continue;
    const u = It(Ce(d));
    if (c == null && (c = u), u === s)
      return p.close !== i && (r[l] = { ...p, close: i }), r;
    if (u < s)
      break;
  }
  return c != null && c > s || r.push({
    date: a,
    close: i
  }), r;
}
function R(e) {
  return typeof e == "number" && Number.isFinite(e);
}
function re(e) {
  return typeof e == "number" && Number.isFinite(e) && e > 0;
}
function Ue(e, t, n) {
  if (!R(e) || !R(t))
    return !1;
  const r = Math.abs(e - t), i = Math.max(Math.abs(e), Math.abs(t), 1);
  return r <= i * 1e-4;
}
function Ia(e, t) {
  return !R(t) || t === 0 || !R(e) ? null : Wi((e - t) / t * 100);
}
function Wr(e, t) {
  if (e.length === 0)
    return { priceChange: null, priceChangePct: null };
  const n = e[0], r = M(n.close);
  if (!R(r) || r === 0)
    return { priceChange: null, priceChangePct: null };
  const i = e[e.length - 1], o = M(i.close), a = M(t) ?? o;
  if (!R(a))
    return { priceChange: null, priceChangePct: null };
  const s = a - r, c = Object.is(s, -0) ? 0 : s, l = Ia(a, r);
  return { priceChange: c, priceChangePct: l };
}
function sn(e, t) {
  if (!R(e) || e === 0)
    return "neutral";
  const n = 0.5 / Math.pow(10, t);
  return Math.abs(e) < n ? "neutral" : e > 0 ? "positive" : "negative";
}
function Va(e, t) {
  if (!R(e))
    return '<span class="value neutral">—</span>';
  const n = le(e);
  if (n === "—")
    return '<span class="value neutral">—</span>';
  const r = sn(e, ct.max), i = t ? `&nbsp;${t}` : "";
  return `<span class="value ${r}">${n}${i}</span>`;
}
function Ua(e) {
  return R(e) ? `<span class="value ${sn(e, 2)} value--percentage">${ue(e)}&nbsp;%</span>` : '<span class="value neutral">—</span>';
}
function Br(e, t, n, r) {
  const i = e, o = i.length > 0 ? i : "Zeitraum";
  return `
    <div class="security-info-bar" data-range="${i}">
      <div class="security-info-item">
        <span class="label">Preisänderung (${o})</span>
        <div class="value-row">
          ${Va(t, r)}
          ${Ua(n)}
        </div>
      </div>
    </div>
  `;
}
function za(e) {
  return `
    <div class="security-range-selector" role="group" aria-label="Zeitraum">
      ${Lr.map((n) => `
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
function jr(e, t = { status: "empty" }) {
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
      const r = Or(
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
function cn(e) {
  const t = M(e);
  if (t == null)
    return "—";
  const n = Math.abs(t % 1) > 0, r = n ? 2 : Ct.min, i = n ? Ct.max : Ct.min;
  return t.toLocaleString("de-DE", {
    minimumFractionDigits: r,
    maximumFractionDigits: i
  });
}
function le(e) {
  const t = M(e);
  return t == null ? "—" : t.toLocaleString("de-DE", {
    minimumFractionDigits: ct.min,
    maximumFractionDigits: ct.max
  });
}
function qa(e, t) {
  const n = le(e), r = `&nbsp;${t}`;
  return `<span class="${sn(e, ct.max)}">${n}${r}</span>`;
}
function Yr(e) {
  return e == null ? "" : (typeof e == "string" ? e : String(e)).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function Oa(e, t) {
  const n = e == null ? void 0 : e.ticker_symbol;
  if (typeof n == "string" && n.trim())
    return n.trim();
  const r = typeof (e == null ? void 0 : e.name) == "string" ? e.name.trim() : "";
  return r || (typeof t == "string" ? t : "");
}
function Wa(e) {
  return `
    <div class="news-prompt-container">
      <button
        type="button"
        class="news-prompt-button"
        data-symbol="${Yr(e)}"
      >
        Check recent news via ChatGPT
      </button>
    </div>
  `;
}
async function Ba(e) {
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
function ja(e) {
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
function Ya(e, t, n) {
  const r = De(e == null ? void 0 : e.average_cost), i = (r == null ? void 0 : r.account) ?? (R(t) ? t : M(t));
  if (!R(i))
    return null;
  const o = (e == null ? void 0 : e.account_currency_code) ?? (e == null ? void 0 : e.account_currency);
  if (typeof o == "string" && o.trim())
    return o.trim().toUpperCase();
  const a = be(e == null ? void 0 : e.currency_code) ?? "", s = (r == null ? void 0 : r.security) ?? (r == null ? void 0 : r.native) ?? (R(n) ? n : M(n)), c = Zt(e == null ? void 0 : e.aggregation);
  if (a && R(s) && Ue(i, s))
    return a;
  const l = M(c == null ? void 0 : c.purchase_total_security) ?? M(e == null ? void 0 : e.purchase_total_security), p = M(c == null ? void 0 : c.purchase_total_account) ?? M(e == null ? void 0 : e.purchase_total_account);
  let d = null;
  if (R(l) && l !== 0 && R(p) && (d = p / l), (r == null ? void 0 : r.source) === "eur_total")
    return "EUR";
  const f = r == null ? void 0 : r.eur;
  if (R(f) && Ue(i, f))
    return "EUR";
  const g = M(e == null ? void 0 : e.purchase_value_eur);
  return R(g) ? "EUR" : d != null && Ue(d, 1) ? a || null : a === "EUR" ? "EUR" : a || "EUR";
}
function Ln(e) {
  return typeof e != "number" || !Number.isFinite(e) || e <= 0 ? null : e.toLocaleString("de-DE", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
  });
}
function Ka(e) {
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
    const a = t == null ? void 0 : t[o], s = ut(a);
    if (s != null)
      return s;
  }
  const r = [];
  t && "last_price_fetched_at" in t && r.push(t.last_price_fetched_at);
  const i = e == null ? void 0 : e.last_price;
  i && typeof i == "object" && r.push(i.fetched_at), t && "last_price_date" in t && r.push(t.last_price_date);
  for (const o of r) {
    const a = ut(o);
    if (a != null)
      return a;
  }
  return null;
}
function Ga(e) {
  if (e == null || !Number.isFinite(e))
    return null;
  const t = new Date(e);
  return Number.isNaN(t.getTime()) ? null : t.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}
function Xa(e, t) {
  if (!e)
    return null;
  const n = be(e.currency_code) ?? "", r = De(e.average_cost);
  if (!r || !n)
    return null;
  const i = r.native ?? r.security ?? null;
  let a = r.account ?? r.eur ?? null, s = be(t) ?? "";
  if (re(r.eur) && (!s || s === n) && (a = r.eur, s = "EUR"), !n || !s || n === s || !re(i) || !re(a))
    return null;
  const c = a / i;
  if (!Number.isFinite(c) || c <= 0)
    return null;
  const l = Ln(c);
  if (!l)
    return null;
  let p = null;
  if (c > 0) {
    const _ = 1 / c;
    Number.isFinite(_) && _ > 0 && (p = Ln(_));
  }
  const d = Ka(e), u = Ga(d), f = [`FX-Kurs (Kauf): 1 ${n} = ${l} ${s}`];
  p && f.push(`1 ${s} = ${p} ${n}`);
  const g = [], m = r.source, y = m in xt ? xt[m] : xt.aggregation;
  if (g.push(`Quelle: ${y}`), R(r.coverage_ratio)) {
    const _ = Math.min(Math.max(r.coverage_ratio * 100, 0), 100);
    g.push(
      `Abdeckung: ${_.toLocaleString("de-DE", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      })}%`
    );
  }
  g.length && f.push(...g);
  const h = u ?? "Datum unbekannt";
  return `${f.join(" · ")} (Stand: ${h})`;
}
function Mn(e) {
  if (!e)
    return null;
  const t = De(e.average_cost), n = (t == null ? void 0 : t.native) ?? (t == null ? void 0 : t.security) ?? null;
  return R(n) ? n : null;
}
function Hn(e) {
  var I;
  if (!e)
    return '<div class="meta-error">Keine Snapshot-Daten verfügbar.</div>';
  const t = e.currency_code || "EUR", n = e.total_holdings_precise ?? e.total_holdings, r = cn(n), i = e.last_price_native ?? ((I = e.last_price) == null ? void 0 : I.native) ?? e.last_price_eur, o = le(i), a = o === "—" ? null : `${o}${`&nbsp;${t}`}`, s = M(e.market_value_eur) ?? M(e.current_value_eur) ?? null, c = De(e.average_cost), l = (c == null ? void 0 : c.native) ?? (c == null ? void 0 : c.security) ?? null, p = (c == null ? void 0 : c.eur) ?? null, u = (c == null ? void 0 : c.account) ?? null ?? p, f = he(e.performance), g = (f == null ? void 0 : f.day_change) ?? null, m = (g == null ? void 0 : g.price_change_native) ?? null, y = (g == null ? void 0 : g.price_change_eur) ?? null, h = R(m) ? m : y, _ = R(m) ? t : "EUR", b = (H, q = "") => {
    const z = ["value"];
    return q && z.push(...q.split(" ").filter(Boolean)), `<span class="${z.join(" ")}">${H}</span>`;
  }, S = (H = "") => {
    const q = ["value--missing"];
    return H && q.push(H), b("—", q.join(" "));
  }, A = (H, q = "") => {
    if (!R(H))
      return S(q);
    const z = ["value--gain"];
    return q && z.push(q), b(wi(H), z.join(" "));
  }, N = (H, q = "") => {
    if (!R(H))
      return S(q);
    const z = ["value--gain-percentage"];
    return q && z.push(q), b(Ei(H), z.join(" "));
  }, P = a ? b(a, "value--price") : S("value--price"), F = r === "—" ? S("value--holdings") : b(r, "value--holdings"), k = R(s) ? b(`${ue(s)}&nbsp;€`, "value--market-value") : S("value--market-value"), x = R(h) ? b(
    qa(h, _),
    "value--gain value--absolute"
  ) : S("value--absolute"), D = N(
    g == null ? void 0 : g.change_pct,
    "value--percentage"
  ), $ = A(
    f == null ? void 0 : f.total_change_eur,
    "value--absolute"
  ), V = N(
    f == null ? void 0 : f.total_change_pct,
    "value--percentage"
  ), w = Ya(
    e,
    u,
    l
  ), E = Xa(
    e,
    w
  ), U = E ? ` title="${Yr(E)}"` : "", v = [], C = R(p);
  R(l) ? v.push(
    b(
      `${le(l)}${`&nbsp;${t}`}`,
      "value--average value--average-native"
    )
  ) : v.push(
    S("value--average value--average-native")
  );
  let T = null, j = null;
  return C && (t !== "EUR" || !R(l) || !Ue(p, l)) ? (T = p, j = "EUR") : R(u) && w && (w !== t || !Ue(u, l ?? NaN)) && (T = u, j = w), T != null && R(T) && v.push(
    b(
      `${le(T)}${j ? `&nbsp;${j}` : ""}`,
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
        <div class="value-group"${U}>
          ${v.join("")}
        </div>
      </div>
      <div class="security-meta-item security-meta-item--day-change">
        <span class="label">Tagesänderung</span>
        <div class="value-group">
          ${x}
          ${D}
        </div>
      </div>
      <div class="security-meta-item security-meta-item--total-change">
        <span class="label">Gesamtänderung</span>
        <div class="value-group">
          ${$}
          ${V}
        </div>
      </div>
      <div class="security-meta-item security-meta-item--holdings">
        <span class="label">Bestand</span>
        <div class="value-group">${F}</div>
      </div>
      <div class="security-meta-item security-meta-item--market-value">
        <span class="label">Marktwert (EUR)</span>
        <div class="value-group">${k}</div>
      </div>
    </div>
  `;
}
function Kr(e) {
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
function Za(e, t, {
  currency: n,
  baseline: r,
  markers: i
} = {}) {
  const o = e.clientWidth || e.offsetWidth || 0, a = o > 0 ? o : 640, s = Math.min(Math.max(Math.floor(a * 0.5), 240), 440), c = (n || "").toUpperCase() || "EUR", l = R(r) ? r : null, p = Math.max(48, Math.min(72, Math.round(a * 0.075))), d = Math.max(28, Math.min(56, Math.round(a * 0.05))), u = Math.max(40, Math.min(64, Math.round(s * 0.14)));
  return {
    width: a,
    height: s,
    margin: {
      top: 18,
      right: d,
      bottom: u,
      left: p
    },
    series: t,
    yFormatter: (g) => le(g),
    tooltipRenderer: ({ xFormatted: g, yFormatted: m }) => `
      <div class="chart-tooltip-date">${g}</div>
      <div class="chart-tooltip-value">${m}&nbsp;${c}</div>
    `,
    markerTooltipRenderer: ({
      marker: g,
      xFormatted: m,
      yFormatted: y
    }) => {
      const h = g.payload ?? {}, _ = qr(h.type), b = M(h.shares), S = b != null ? cn(b) : null, A = be(h.currency) ?? c, N = [];
      _ && N.push(_), S && N.push(`${S} Stück`), m && N.push(`am ${m}`);
      const P = N.join(" ").trim() || (typeof g.label == "string" ? g.label : m), F = typeof y == "string" && y.trim() ? y.trim() : le(h.price), k = F ? `${F}${A ? `&nbsp;${A}` : ""}` : A;
      return `
      <div class="chart-tooltip-date">${P}</div>
      <div class="chart-tooltip-value">${k}</div>
    `;
    },
    baseline: l != null ? {
      value: l
    } : null,
    markers: Array.isArray(i) ? i : []
  };
}
const In = /* @__PURE__ */ new WeakMap();
function Ja(e, t, n = {}) {
  if (t.length === 0)
    return;
  const r = Za(e, t, n);
  let i = In.get(e) ?? null;
  if (!i || !e.contains(i)) {
    e.innerHTML = "", i = pa(e, r), i && In.set(e, i);
    return;
  }
  $r(i, r);
}
function Vn(e, t) {
  e && (e.dataset.activeRange = t, e.querySelectorAll(".security-range-button").forEach((n) => {
    const i = n.dataset.range === t;
    n.classList.toggle("active", i), n.setAttribute("aria-pressed", i ? "true" : "false"), n.disabled = !1, n.classList.remove("loading");
  }));
}
function Qa(e, t, n, r, i) {
  const o = e.querySelector(".security-info-bar");
  if (!o || !o.parentElement)
    return;
  const a = document.createElement("div");
  a.innerHTML = Br(t, n, r, i).trim();
  const s = a.firstElementChild;
  s && o.parentElement.replaceChild(s, o);
}
function Un(e, t, n, r, i = {}) {
  const o = e.querySelector(".security-detail-placeholder");
  if (o && (o.innerHTML = `
    <h2>Historie</h2>
    ${jr(t, n)}
  `, n.status === "loaded" && Array.isArray(r) && r.length)) {
    const a = o.querySelector(".history-chart");
    a && requestAnimationFrame(() => {
      Ja(a, r, i);
    });
  }
}
function es(e) {
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
    const p = Hr(i), d = Ir(i), u = Mn(o);
    Array.isArray(s) && c.status !== "error" && p.set(a, s), Ta(i), Rn(i, a), Vn(l, a);
    const g = Ut(
      s,
      o
    );
    let m = c;
    m.status !== "error" && (m = g.length ? { status: "loaded" } : { status: "empty" }), Un(
      t,
      a,
      m,
      g,
      {
        currency: o == null ? void 0 : o.currency_code,
        baseline: u,
        markers: d.get(a) ?? []
      }
    );
    const y = async (h) => {
      if (h === zr(i))
        return;
      const _ = l.querySelector(
        `.security-range-button[data-range="${h}"]`
      );
      _ && (_.disabled = !0, _.classList.add("loading"));
      let b = p.get(h) ?? null, S = d.get(h) ?? null, A = null, N = [];
      if (b)
        A = b.length ? { status: "loaded" } : { status: "empty" };
      else
        try {
          const $ = lt(h), V = await nt(
            n,
            r,
            i,
            $
          );
          b = Vt(V.prices), S = dt(
            V.transactions,
            o == null ? void 0 : o.currency_code,
            o
          ), p.set(h, b), S = Array.isArray(S) ? S : [], d.set(h, S), A = b.length ? { status: "loaded" } : { status: "empty" };
        } catch ($) {
          console.error("Range-Wechsel: Historie konnte nicht geladen werden", $), b = [], S = [], A = {
            status: "error",
            message: Kr($) || "Die historischen Daten konnten aufgrund eines Fehlers nicht geladen werden."
          };
        }
      if (!Array.isArray(S))
        try {
          const $ = lt(h), V = await nt(
            n,
            r,
            i,
            $
          );
          S = dt(
            V.transactions,
            o == null ? void 0 : o.currency_code,
            o
          ), S = Array.isArray(S) ? S : [], d.set(h, S);
        } catch ($) {
          console.error("Range-Wechsel: Transaktionsmarker konnten nicht geladen werden", $), S = [];
        }
      N = Ut(b, o), A.status !== "error" && (A = N.length ? { status: "loaded" } : { status: "empty" });
      const P = an(o), { priceChange: F, priceChangePct: k } = Wr(
        N,
        P
      ), x = Array.isArray(S) ? S : [];
      Rn(i, h), Vn(l, h), Qa(
        t,
        h,
        F,
        k,
        o == null ? void 0 : o.currency_code
      );
      const D = Mn(o);
      Un(
        t,
        h,
        A,
        N,
        {
          currency: o == null ? void 0 : o.currency_code,
          baseline: D,
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
      !b || !Lr.includes(b) || y(b);
    });
  }, 0);
}
function ts(e) {
  const { root: t, hass: n, panelConfig: r, tickerSymbol: i } = e;
  let o = null, a = !1;
  const s = async () => {
    try {
      o = await Hi(n, r);
    } catch (c) {
      a = !0, console.warn("News-Prompt: Prefetch fehlgeschlagen", c);
    }
  };
  s(), setTimeout(() => {
    const c = t.querySelector(".news-prompt-button");
    if (!c)
      return;
    const l = (d) => {
      const u = ((o == null ? void 0 : o.placeholder) || Tn).trim() || Tn, f = ((o == null ? void 0 : o.prompt_template) || "").trim(), g = ((o == null ? void 0 : o.link) || "").trim() || Fa;
      return { body: f ? f.includes(u) ? f.split(u).join(d) : `${f}

Ticker: ${d}` : `Ticker: ${d}`, link: g };
    }, p = async () => {
      const d = (c.dataset.symbol || i || "").trim();
      if (!d) {
        console.warn("News-Prompt: Kein Ticker verfügbar");
        return;
      }
      if (!c.classList.contains("loading")) {
        c.disabled = !0, c.classList.add("loading");
        try {
          const { body: u, link: f } = l(d);
          await Ba(u) || console.warn("News-Prompt: Clipboard unavailable – prompt could not be copied"), ja(f), !o && !a && s();
        } catch (u) {
          console.error("News-Prompt: Kopiervorgang fehlgeschlagen", u);
        } finally {
          c.classList.remove("loading"), c.disabled = !1;
        }
      }
    };
    c.addEventListener("click", () => {
      p();
    });
  }, 0);
}
async function ns(e, t, n, r) {
  if (!r)
    return console.error("renderSecurityDetail: securityUuid fehlt"), '<div class="card"><h2>Fehler</h2><p>Kein Wertpapier angegeben.</p></div>';
  const i = Da(r);
  let o = null, a = null;
  try {
    const x = await Mi(
      t,
      n,
      r
    ), D = x.snapshot;
    o = D && typeof D == "object" ? D : x;
  } catch (x) {
    console.error("renderSecurityDetail: Snapshot konnte nicht geladen werden", x), a = Or(x);
  }
  const s = o || i, c = !!(i && !o), l = ((s == null ? void 0 : s.source) ?? "") === "cache";
  r && xa(r, s ?? null);
  const p = s && (c || l) ? Ca({ fallbackUsed: c, flaggedAsCache: l }) : "", d = (s == null ? void 0 : s.name) || "Wertpapierdetails";
  if (a) {
    const x = kt(
      d,
      Hn(s)
    );
    return x.classList.add("security-detail-header"), `
      ${x.outerHTML}
      ${p}
      <div class="card error-card">
        <h2>Fehler beim Laden</h2>
        <p>${a}</p>
      </div>
    `;
  }
  const u = zr(r), f = Hr(r), g = Ir(r);
  let m = f.has(u) ? f.get(u) ?? null : null, y = { status: "empty" }, h = g.has(u) ? g.get(u) ?? null : null;
  if (Array.isArray(m))
    y = m.length ? { status: "loaded" } : { status: "empty" };
  else {
    m = [];
    try {
      const x = lt(u), D = await nt(
        t,
        n,
        r,
        x
      );
      m = Vt(D.prices), h = dt(
        D.transactions,
        s == null ? void 0 : s.currency_code,
        s
      ), f.set(u, m), h = Array.isArray(h) ? h : [], g.set(u, h), y = m.length ? { status: "loaded" } : { status: "empty" };
    } catch (x) {
      console.error(
        "renderSecurityDetail: Historie konnte nicht geladen werden",
        x
      ), y = {
        status: "error",
        message: Kr(x) || "Die historischen Daten konnten aufgrund eines Fehlers nicht geladen werden."
      };
    }
  }
  if (!Array.isArray(h))
    try {
      const x = lt(u), D = await nt(
        t,
        n,
        r,
        x
      ), $ = Vt(D.prices);
      h = dt(
        D.transactions,
        s == null ? void 0 : s.currency_code,
        s
      ), f.set(u, $), h = Array.isArray(h) ? h : [], g.set(u, h), m = $, y = m.length ? { status: "loaded" } : { status: "empty" };
    } catch (x) {
      console.error(
        "renderSecurityDetail: Transaktionsmarker konnten nicht geladen werden",
        x
      ), h = [];
    }
  const _ = Ut(
    m,
    s
  );
  y.status !== "error" && (y = _.length ? { status: "loaded" } : { status: "empty" });
  const b = kt(
    d,
    Hn(s)
  );
  b.classList.add("security-detail-header");
  const S = Oa(s, r), A = Wa(S), N = an(s), { priceChange: P, priceChangePct: F } = Wr(
    _,
    N
  ), k = Br(
    u,
    P,
    F,
    s == null ? void 0 : s.currency_code
  );
  return es({
    root: e,
    hass: t,
    panelConfig: n,
    securityUuid: r,
    snapshot: s,
    initialRange: u,
    initialHistory: m,
    initialHistoryState: y
  }), ts({
    root: e,
    hass: t,
    panelConfig: n,
    tickerSymbol: S
  }), `
    ${b.outerHTML}
    ${p}
    ${A}
    ${k}
    ${za(u)}
    <div class="card security-detail-placeholder">
      <h2>Historie</h2>
      ${jr(u, y)}
    </div>
  `;
}
function rs(e) {
  const { setSecurityDetailTabFactory: t } = e;
  if (typeof t != "function") {
    console.error("registerSecurityDetailTab: Ungültige Factory-Funktion übergeben");
    return;
  }
  t((n) => ({
    title: "Wertpapier",
    render: (r, i, o) => ns(r, i, o, n),
    cleanup: () => {
      $a(n);
    }
  }));
}
const is = Ni, zt = "pp-reader-sticky-anchor", ft = "overview", qt = "security:", os = [
  { key: ft, title: "Dashboard", render: Pr }
], xe = /* @__PURE__ */ new Map(), Ye = [], pt = /* @__PURE__ */ new Map();
let Ot = null, Dt = !1, Ee = null, B = 0, Me = null;
function gt(e) {
  return typeof e == "object" && e !== null;
}
function Gr(e) {
  return typeof e == "object" && e !== null && typeof e.then == "function";
}
function as(e) {
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
function ss(e) {
  return e === "accounts" || e === "last_file_update" || e === "portfolio_values" || e === "portfolio_positions";
}
function zn(e) {
  const t = e.portfolio_uuid;
  if (typeof t == "string" && t)
    return t;
  const n = e.portfolioUuid;
  return typeof n == "string" && n ? n : null;
}
function cs(e) {
  if (!e)
    return null;
  if (Array.isArray(e)) {
    for (const t of e)
      if (gt(t)) {
        const n = zn(t);
        if (n)
          return n;
      }
    return null;
  }
  return gt(e) ? zn(e) : null;
}
function ls(e, t) {
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
  return typeof e != "string" || !e.startsWith(qt) ? null : e.slice(qt.length) || null;
}
function us() {
  if (!Ee)
    return !1;
  const e = ei(Ee);
  return e || (Ee = null), e;
}
function ae() {
  const e = Ye.map((t) => xe.get(t)).filter((t) => !!t);
  return [...os, ...e];
}
function ds(e) {
  const t = ae();
  return e < 0 || e >= t.length ? null : t[e];
}
function Xr(e) {
  if (!e)
    return null;
  const t = e, n = t.ppreader ?? t.pp_reader;
  return n || (Object.values(t).find((i) => !i || typeof i != "object" ? !1 : i.webcomponent_name === "pp-reader-panel") ?? null);
}
function Zr() {
  try {
    const e = yt();
    e && typeof e.rememberScrollPosition == "function" && e.rememberScrollPosition();
  } catch (e) {
    console.warn("rememberCurrentPageScroll: konnte Scroll-Position nicht sichern", e);
  }
}
function qn(e) {
  const t = ae();
  return !t.length || e < 0 ? 0 : e >= t.length ? t.length - 1 : e;
}
async function fs(e, t, n, r) {
  const i = ae(), o = qn(e);
  if (o === B) {
    e > B && us();
    return;
  }
  Zr();
  const a = B >= 0 && B < i.length ? i[B] : null, s = a ? ln(a.key) : null;
  let c = o;
  if (s) {
    const l = o >= 0 && o < i.length ? i[o] : null;
    if (l && l.key === ft && _s(s, { suppressRender: !0 })) {
      const u = ae().findIndex((f) => f.key === ft);
      c = u >= 0 ? u : 0;
    }
  }
  if (!Dt) {
    Dt = !0;
    try {
      B = qn(c);
      const l = B;
      await ti(t, n, r), ms(l);
    } catch (l) {
      console.error("navigateToPage: Fehler beim Rendern des Tabs", l);
    } finally {
      Dt = !1;
    }
  }
}
function ht(e, t, n, r) {
  fs(B + e, t, n, r);
}
function ps(e, t) {
  if (!e || !t || typeof t.render != "function") {
    console.error("registerDetailTab: Ungültiger Tab-Descriptor", e, t);
    return;
  }
  const n = ln(e);
  if (n) {
    const i = pt.get(n);
    i && i !== e && Jr(i);
  }
  const r = {
    ...t,
    key: e
  };
  xe.set(e, r), n && pt.set(n, e), Ye.includes(e) || Ye.push(e);
}
function Jr(e) {
  if (!e)
    return;
  const t = xe.get(e);
  if (t && typeof t.cleanup == "function")
    try {
      const i = t.cleanup({ key: e });
      Gr(i) && i.catch((o) => {
        console.error(
          "unregisterDetailTab: Fehler beim asynchronen cleanup",
          o
        );
      });
    } catch (i) {
      console.error("unregisterDetailTab: Fehler beim Ausführen von cleanup", i);
    }
  xe.delete(e);
  const n = Ye.indexOf(e);
  n >= 0 && Ye.splice(n, 1);
  const r = ln(e);
  r && pt.get(r) === e && pt.delete(r);
}
function gs(e) {
  return xe.has(e);
}
function On(e) {
  return xe.get(e) ?? null;
}
function hs(e) {
  if (e != null && typeof e != "function") {
    console.error("setSecurityDetailTabFactory: Erwartet Funktion oder null", e);
    return;
  }
  Ot = e ?? null;
}
function Qr(e) {
  return `${qt}${e}`;
}
function yt() {
  var t;
  for (const n of Ui())
    if (n.isConnected)
      return n;
  const e = /* @__PURE__ */ new Set();
  for (const n of zi())
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
  const e = yt();
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
const Ds = {
  findDashboardElement: yt
};
function ms(e) {
  const t = yt();
  if (t && typeof t.handleExternalRender == "function")
    try {
      t.handleExternalRender(e);
    } catch (n) {
      console.warn("notifyExternalRender: Fehler beim Synchronisieren des Dashboards", n);
    }
}
function ei(e) {
  if (!e)
    return console.error("openSecurityDetail: Ungültige securityUuid", e), !1;
  const t = Qr(e);
  let n = On(t);
  if (!n && typeof Ot == "function")
    try {
      const o = Ot(e);
      o && typeof o.render == "function" ? (ps(t, o), n = On(t)) : console.error("openSecurityDetail: Factory lieferte ungültigen Descriptor", o);
    } catch (o) {
      console.error("openSecurityDetail: Fehler beim Erzeugen des Tab-Descriptors", o);
    }
  if (!n)
    return console.warn(`openSecurityDetail: Kein Detail-Tab für ${e} verfügbar`), !1;
  Zr();
  let i = ae().findIndex((o) => o.key === t);
  return i === -1 && (i = ae().findIndex((a) => a.key === t), i === -1) ? (console.error("openSecurityDetail: Tab nach Registrierung nicht auffindbar"), !1) : (B = i, Ee = null, Wt(), !0);
}
function _s(e, t = {}) {
  if (!e)
    return console.error("closeSecurityDetail: Ungültige securityUuid", e), !1;
  const { suppressRender: n = !1 } = t, r = Qr(e);
  if (!gs(r))
    return !1;
  const o = ae().findIndex((c) => c.key === r), a = o === B;
  Jr(r);
  const s = ae();
  if (!s.length)
    return B = 0, n || Wt(), !0;
  if (Ee = e, a) {
    const c = s.findIndex((l) => l.key === ft);
    c >= 0 ? B = c : B = Math.min(Math.max(o - 1, 0), s.length - 1);
  } else B >= s.length && (B = Math.max(0, s.length - 1));
  return n || Wt(), !0;
}
async function ti(e, t, n) {
  let r = n;
  r || (r = Xr(t ? t.panels : null));
  const i = ae();
  B >= i.length && (B = Math.max(0, i.length - 1));
  const o = ds(B);
  if (!o) {
    console.error("renderTab: Kein gültiger Tab oder keine render-Methode gefunden!");
    return;
  }
  let a;
  try {
    a = await o.render(e, t, r);
  } catch (p) {
    console.error("renderTab: Fehler beim Rendern des Tabs:", p), e.innerHTML = `<div class="card"><h2>Fehler</h2><pre>${as(p)}</pre></div>`;
    return;
  }
  e.innerHTML = a ?? "", o.render === Pr && rn(e);
  const c = await new Promise((p) => {
    const d = window.setInterval(() => {
      const u = e.querySelector(".header-card");
      u && (clearInterval(d), p(u));
    }, 50);
  });
  let l = e.querySelector(`#${zt}`);
  if (!l) {
    l = document.createElement("div"), l.id = zt;
    const p = c.parentNode;
    p && "insertBefore" in p && p.insertBefore(l, c);
  }
  vs(e, t, n), bs(e, t, n), ys(e);
}
function ys(e) {
  const t = e.querySelector(".header-card"), n = e.querySelector(`#${zt}`);
  if (!t || !n) {
    console.error("Fehlende Elemente für das Scrollverhalten: headerCard oder anchor.");
    return;
  }
  Me == null || Me.disconnect(), Me = new IntersectionObserver(
    ([r]) => {
      r.isIntersecting ? t.classList.remove("sticky") : t.classList.add("sticky");
    },
    {
      root: null,
      rootMargin: "0px 0px 0px 0px",
      threshold: 0
    }
  ), Me.observe(n);
}
function bs(e, t, n) {
  const r = e.querySelector(".header-card");
  if (!r) {
    console.error("Header-Card nicht gefunden!");
    return;
  }
  is(
    r,
    () => {
      ht(1, e, t, n);
    },
    () => {
      ht(-1, e, t, n);
    }
  );
}
function vs(e, t, n) {
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
    ht(-1, e, t, n);
  }), o.addEventListener("click", () => {
    ht(1, e, t, n);
  }), Ss(r);
}
function Ss(e) {
  const t = e.querySelector("#nav-left"), n = e.querySelector("#nav-right");
  if (t && (B === 0 ? (t.disabled = !0, t.classList.add("disabled")) : (t.disabled = !1, t.classList.remove("disabled"))), n) {
    const r = ae(), o = !(B === r.length - 1) || !!Ee;
    n.disabled = !o, n.classList.toggle("disabled", !o);
  }
}
class Ps extends HTMLElement {
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
    this._panel || (this._panel = Xr(this._hass.panels ?? null));
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
    if (!ss(i.data_type) || i.entry_id && i.entry_id !== r)
      return;
    const o = ls(i.data_type, i.data);
    o && (this._queueUpdate(o.type, o.data), this._doRender(o.type, o.data));
  }
  _doRender(n, r) {
    switch (n) {
      case "accounts":
        ko(
          r,
          this._root
        );
        break;
      case "last_file_update":
        Uo(
          r,
          this._root
        );
        break;
      case "portfolio_values":
        $o(
          r,
          this._root
        );
        break;
      case "portfolio_positions":
        Ho(
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
    n === "portfolio_positions" && (o.portfolioUuid = cs(
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
  rememberScrollPosition(n = B) {
    const r = Number.isInteger(n) ? n : B;
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
    const n = B;
    if (!this._hasNewData && this._panel === this._lastPanel && this._narrow === this._lastNarrow && this._route === this._lastRoute && this._lastPage === n)
      return;
    this._lastPage != null && (this._scrollPositions[this._lastPage] = this._root.scrollTop);
    const r = ti(this._root, this._hass, this._panel);
    if (Gr(r)) {
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
customElements.get("pp-reader-dashboard") || customElements.define("pp-reader-dashboard", Ps);
console.log("PPReader dashboard module v20250914b geladen");
rs({
  setSecurityDetailTabFactory: hs
});
export {
  Ds as __TEST_ONLY_DASHBOARD,
  xs as __TEST_ONLY__,
  _s as closeSecurityDetail,
  nn as flushPendingPositions,
  On as getDetailTabDescriptor,
  Ho as handlePortfolioPositionsUpdate,
  gs as hasDetailTab,
  ei as openSecurityDetail,
  Cs as reapplyPositionsSort,
  Ns as registerDashboardElement,
  ps as registerDetailTab,
  Es as registerPanelHost,
  hs as setSecurityDetailTabFactory,
  ws as unregisterDashboardElement,
  Jr as unregisterDetailTab,
  Fs as unregisterPanelHost,
  Sr as updatePortfolioFooterFromDom
};
//# sourceMappingURL=dashboard.CC2P_sdg.js.map
