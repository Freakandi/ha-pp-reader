function kn(e, t) {
  try {
    t();
  } catch (n) {
    console.warn(`addSwipeEvents: ${e} handler threw`, n);
  }
}
function Ja(e, t, n) {
  let r = null;
  const a = (l) => {
    l < -50 ? kn("left", t) : l > 50 && kn("right", n);
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
const dn = (e, t) => {
  if (!Number.isFinite(e) || e === 0)
    return "neutral";
  const n = 0.5 / Math.pow(10, t);
  return Math.abs(e) < n ? "neutral" : e > 0 ? "positive" : "negative";
};
function L(e, t, n = void 0, r = void 0) {
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
      const p = n.performance;
      if (typeof p == "object" && p !== null)
        if (e.startsWith("day_change")) {
          const f = p.day_change;
          if (f && typeof f == "object") {
            const g = e === "day_change_pct" ? f.change_pct : f.value_change_eur ?? f.price_change_eur;
            typeof g == "number" && (t = g);
          }
        } else {
          const f = p[e];
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
    return a = i(l) + `&nbsp;${u}`, `<span class="${dn(l, 2)}">${a}</span>`;
  } else if (e === "position_count") {
    const s = typeof t == "number" ? t : o(t);
    if (!Number.isFinite(s))
      return c();
    a = s.toLocaleString("de-DE");
  } else if (["balance", "current_value", "purchase_value"].includes(e)) {
    const s = typeof t == "number" ? t : o(t);
    if (!Number.isFinite(s))
      return n?.fx_unavailable ? c("Wechselkurs nicht verfügbar – EUR-Wert unbekannt") : (r && r.hasValue === !1, c());
    a = i(s) + "&nbsp;€";
  } else if (e === "current_holdings") {
    const s = typeof t == "number" ? t : o(t);
    if (!Number.isFinite(s))
      return c();
    const l = Math.abs(s % 1) > 0;
    a = s.toLocaleString("de-DE", {
      minimumFractionDigits: l ? 2 : 0,
      maximumFractionDigits: 4
    });
  } else {
    let s = "";
    typeof t == "string" ? s = t : typeof t == "number" && Number.isFinite(t) ? s = t.toString() : typeof t == "boolean" ? s = t ? "true" : "false" : t instanceof Date && Number.isFinite(t.getTime()) && (s = t.toISOString()), a = s, a && (/<|&lt;|&gt;/.test(a) || (a.length > 60 && (a = a.slice(0, 59) + "…"), a.startsWith("Kontostand ") ? a = a.substring(11) : a.startsWith("Depotwert ") && (a = a.substring(10))));
  }
  return typeof a != "string" || a === "" ? c() : a;
}
function Te(e, t, n = [], r = {}) {
  const { sortable: a = !1, defaultSort: o } = r, i = o?.key ?? "", c = o?.dir === "desc" ? "desc" : "asc", s = (h) => {
    if (h == null)
      return "";
    let y = "";
    if (typeof h == "string")
      y = h;
    else if (typeof h == "number" && Number.isFinite(h))
      y = h.toString();
    else if (typeof h == "boolean")
      y = h ? "true" : "false";
    else if (h instanceof Date && Number.isFinite(h.getTime()))
      y = h.toISOString();
    else
      return "";
    return y.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  };
  let l = "<table><thead><tr>";
  t.forEach((h) => {
    const y = h.align === "right" ? ' class="align-right"' : "";
    a && h.key ? l += `<th${y} data-sort-key="${h.key}">${h.label}</th>` : l += `<th${y}>${h.label}</th>`;
  }), l += "</tr></thead><tbody>", e.forEach((h) => {
    l += "<tr>", t.forEach((y) => {
      const b = y.align === "right" ? ' class="align-right"' : "";
      l += `<td${b}>${L(y.key, h[y.key], h)}</td>`;
    }), l += "</tr>";
  });
  const u = {}, d = {};
  t.forEach((h) => {
    if (n.includes(h.key)) {
      const y = e.reduce(
        (b, S) => {
          let w = S[h.key];
          if ((h.key === "gain_abs" || h.key === "gain_pct") && (typeof w != "number" || !Number.isFinite(w))) {
            const C = S.performance;
            if (typeof C == "object" && C !== null) {
              const A = C[h.key];
              typeof A == "number" && (w = A);
            }
          } else if ((h.key === "day_change_abs" || h.key === "day_change_pct") && (typeof w != "number" || !Number.isFinite(w))) {
            const C = S.performance;
            if (typeof C == "object" && C !== null) {
              const A = C.day_change;
              if (A && typeof A == "object") {
                const N = h.key === "day_change_pct" ? A.change_pct : A.value_change_eur ?? A.price_change_eur;
                typeof N == "number" && (w = N);
              }
            }
          }
          if (typeof w == "number" && Number.isFinite(w)) {
            const C = w;
            b.total += C, b.hasValue = !0;
          }
          return b;
        },
        { total: 0, hasValue: !1 }
      );
      y.hasValue ? (u[h.key] = y.total, d[h.key] = { hasValue: !0 }) : (u[h.key] = null, d[h.key] = { hasValue: !1 });
    }
  });
  const p = u.gain_abs ?? null;
  if (p != null) {
    const h = u.purchase_value ?? null;
    if (h != null && h > 0)
      u.gain_pct = p / h * 100;
    else {
      const y = u.current_value ?? null;
      y != null && y !== 0 && (u.gain_pct = p / (y - p) * 100);
    }
  }
  const f = u.day_change_abs ?? null;
  if (f != null) {
    const h = u.current_value ?? null;
    if (h != null) {
      const y = h - f;
      y && (u.day_change_pct = f / y * 100, d.day_change_pct = { hasValue: !0 });
    }
  }
  const g = Number.isFinite(u.gain_pct ?? NaN) ? u.gain_pct : null;
  let m = "", _ = "neutral";
  if (g != null && (m = `${re(g)} %`, g > 0 ? _ = "positive" : g < 0 && (_ = "negative")), l += '<tr class="footer-row">', t.forEach((h, y) => {
    const b = h.align === "right" ? ' class="align-right"' : "";
    if (y === 0) {
      l += `<td${b}>Summe</td>`;
      return;
    }
    if (u[h.key] != null) {
      let w = "";
      h.key === "gain_abs" && m && (w = ` data-gain-pct="${s(m)}" data-gain-sign="${s(_)}"`), l += `<td${b}${w}>${L(h.key, u[h.key], void 0, d[h.key])}</td>`;
      return;
    }
    if (h.key === "gain_pct" && u.gain_pct != null) {
      l += `<td${b}>${L("gain_pct", u.gain_pct, void 0, d[h.key])}</td>`;
      return;
    }
    const S = d[h.key] ?? { hasValue: !1 };
    l += `<td${b}>${L(h.key, null, void 0, S)}</td>`;
  }), l += "</tr>", l += "</tbody></table>", a)
    try {
      const h = document.createElement("template");
      h.innerHTML = l.trim();
      const y = h.content.querySelector("table");
      if (y)
        return y.classList.add("sortable-table"), i && (y.dataset.defaultSort = i, y.dataset.defaultDir = c), y.outerHTML;
    } catch (h) {
      console.warn("makeTable(sortable): Injection fehlgeschlagen:", h);
    }
  return l;
}
function fn(e, t, n = {}) {
  const { includeMeta: r = !0 } = n, a = document.createElement("div");
  a.className = "header-card";
  const o = r ? `<div id="headerMeta" class="meta">${t}</div>` : "";
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
    ${o}
  `, a;
}
function re(e, t = 2, n = 2) {
  return (Number.isNaN(e) ? 0 : e).toLocaleString("de-DE", {
    minimumFractionDigits: t,
    maximumFractionDigits: n
  });
}
function Qa(e) {
  const t = Number.isNaN(e) ? 0 : e;
  return `<span class="${dn(t, 2)}">${re(t)}&nbsp;€</span>`;
}
function eo(e) {
  const t = Number.isNaN(e) ? 0 : e;
  return `<span class="${dn(t, 2)}">${re(t)}&nbsp;%</span>`;
}
function mr(e, t, n = "asc", r = !1) {
  if (!e)
    return [];
  const a = e.querySelector("tbody");
  if (!a)
    return [];
  const o = a.querySelector("tr.footer-row"), i = Array.from(a.querySelectorAll("tr")).filter((u) => u !== o);
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
    const u = Array.from(e.querySelectorAll("thead th"));
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
    const p = parseFloat(d);
    return Number.isFinite(p) ? p : NaN;
  };
  i.sort((u, d) => {
    const p = u.cells.item(c), f = d.cells.item(c), g = (p?.textContent ?? "").trim(), m = (f?.textContent ?? "").trim(), _ = s(g), h = s(m);
    let y;
    const b = /[0-9]/.test(g) || /[0-9]/.test(m);
    return !Number.isNaN(_) && !Number.isNaN(h) && b ? y = _ - h : y = g.localeCompare(m, "de", { sensitivity: "base" }), n === "asc" ? y : -y;
  }), i.forEach((u) => a.appendChild(u)), o && a.appendChild(o), e.querySelectorAll("thead th.sort-active").forEach((u) => {
    u.classList.remove("sort-active", "dir-asc", "dir-desc");
  });
  const l = e.querySelector(`thead th[data-sort-key="${t}"]`);
  return l && l.classList.add("sort-active", n === "asc" ? "dir-asc" : "dir-desc"), i;
}
function ge(e) {
  return typeof e == "object" && e !== null;
}
function O(e) {
  return typeof e == "string" ? e : null;
}
function et(e) {
  return e === null ? null : O(e);
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
function Rn(e) {
  const t = z(e);
  if (t == null)
    return null;
  const n = Math.trunc(t);
  return Number.isFinite(n) ? n : null;
}
function it(e) {
  return ge(e) ? { ...e } : null;
}
function yr(e) {
  return ge(e) ? { ...e } : null;
}
function _r(e) {
  return typeof e == "boolean" ? e : void 0;
}
function to(e) {
  if (!ge(e))
    return null;
  const t = O(e.name), n = O(e.currency_code), r = z(e.orig_balance);
  if (!t || !n || r == null)
    return null;
  const a = e.balance === null ? null : z(e.balance), o = {
    uuid: O(e.uuid) ?? void 0,
    name: t,
    currency_code: n,
    orig_balance: r,
    balance: a ?? null
  }, i = z(e.fx_rate);
  i != null && (o.fx_rate = i);
  const c = O(e.fx_rate_source);
  c && (o.fx_rate_source = c);
  const s = O(e.fx_rate_timestamp);
  s && (o.fx_rate_timestamp = s);
  const l = z(e.coverage_ratio);
  l != null && (o.coverage_ratio = l);
  const u = O(e.provenance);
  u && (o.provenance = u);
  const d = et(e.metric_run_uuid);
  d !== null && (o.metric_run_uuid = d);
  const p = _r(e.fx_unavailable);
  return typeof p == "boolean" && (o.fx_unavailable = p), o;
}
function br(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = to(n);
    r && t.push(r);
  }
  return t;
}
function no(e) {
  if (!ge(e))
    return null;
  const t = e.aggregation, n = O(e.security_uuid), r = O(e.name), a = z(e.current_holdings), o = z(e.purchase_value_eur) ?? (ge(t) ? z(t.purchase_value_eur) ?? z(t.purchase_total_account) ?? z(t.account_currency_total) : null) ?? z(e.purchase_value), i = z(e.current_value);
  if (!n || !r || a == null || o == null || i == null)
    return null;
  const c = {
    portfolio_uuid: O(e.portfolio_uuid) ?? void 0,
    security_uuid: n,
    name: r,
    ticker_symbol: O(e.ticker_symbol),
    currency_code: O(e.currency_code),
    current_holdings: a,
    purchase_value: o,
    current_value: i,
    average_cost: it(e.average_cost),
    performance: it(e.performance),
    aggregation: it(e.aggregation),
    data_state: yr(e.data_state)
  }, s = z(e.coverage_ratio);
  s != null && (c.coverage_ratio = s);
  const l = O(e.provenance);
  l && (c.provenance = l);
  const u = et(e.metric_run_uuid);
  u !== null && (c.metric_run_uuid = u);
  const d = z(e.last_price_native);
  d != null && (c.last_price_native = d);
  const p = z(e.last_price_eur);
  p != null && (c.last_price_eur = p);
  const f = z(e.last_close_native);
  f != null && (c.last_close_native = f);
  const g = z(e.last_close_eur);
  return g != null && (c.last_close_eur = g), c;
}
function vr(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = no(n);
    r && t.push(r);
  }
  return t;
}
function Sr(e) {
  if (!ge(e))
    return null;
  const t = O(e.name), n = z(e.current_value ?? e.value);
  if (!t || n == null)
    return null;
  const a = z(
    e.purchase_sum ?? e.purchase_value_eur ?? e.purchase_value ?? e.purchaseSum
  ) ?? 0, o = {
    uuid: O(e.uuid) ?? void 0,
    name: t,
    current_value: n,
    purchase_value: a,
    purchase_sum: a,
    day_change_abs: z(e.day_change_abs) ?? z(e.day_change_eur) ?? void 0,
    day_change_pct: z(e.day_change_pct) ?? void 0,
    position_count: Rn(e.position_count ?? e.count) ?? void 0,
    missing_value_positions: Rn(e.missing_value_positions) ?? void 0,
    has_current_value: _r(e.has_current_value),
    performance: it(e.performance),
    coverage_ratio: z(e.coverage_ratio) ?? void 0,
    provenance: O(e.provenance) ?? void 0,
    metric_run_uuid: et(e.metric_run_uuid) ?? void 0,
    data_state: yr(e.data_state)
  };
  return Array.isArray(e.positions) && (o.positions = vr(e.positions)), o;
}
function wr(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = Sr(n);
    r && t.push(r);
  }
  return t;
}
function Pr(e) {
  if (!ge(e))
    return null;
  const t = { ...e }, n = et(e.metric_run_uuid);
  n !== null ? t.metric_run_uuid = n : delete t.metric_run_uuid;
  const r = z(e.coverage_ratio);
  r != null ? t.coverage_ratio = r : delete t.coverage_ratio;
  const a = O(e.provenance);
  a ? t.provenance = a : delete t.provenance;
  const o = O(e.generated_at ?? e.snapshot_generated_at);
  return o ? t.generated_at = o : delete t.generated_at, t;
}
function ro(e) {
  if (!ge(e))
    return null;
  const t = { ...e }, n = Pr(e.normalized_payload);
  return n ? t.normalized_payload = n : "normalized_payload" in t && delete t.normalized_payload, t;
}
function Ar(e) {
  if (!ge(e))
    return null;
  const t = O(e.generated_at);
  if (!t)
    return null;
  const n = et(e.metric_run_uuid), r = br(e.accounts), a = wr(e.portfolios), o = ro(e.diagnostics), i = {
    generated_at: t,
    metric_run_uuid: n,
    accounts: r,
    portfolios: a
  };
  return o && (i.diagnostics = o), i;
}
function te(e) {
  return typeof e == "string" ? e : null;
}
function ao(e) {
  if (typeof e == "string")
    return e;
  if (e === null)
    return null;
}
function oo(e) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
}
function $n(e, t) {
  if (typeof e == "string")
    return e;
  throw new Error(`mapPositionSnapshotToRecord: fehlendes ${t}`);
}
function kt(e, t) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  throw new Error(`mapPositionSnapshotToRecord: fehlendes ${t}`);
}
function io(e) {
  const t = $n(e.security_uuid, "security_uuid"), n = $n(e.name, "name"), r = kt(e.current_holdings, "current_holdings"), a = kt(e.purchase_value, "purchase_value"), o = kt(e.current_value, "current_value"), i = {
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
function he(e, t) {
  let n = t?.config?.entry_id ?? t?.entry_id ?? t?.config?._panel_custom?.config?.entry_id ?? void 0;
  if (!n && e?.panels) {
    const r = e.panels, a = r.ppreader ?? r.pp_reader ?? Object.values(r).find(
      (o) => o?.webcomponent_name === "pp-reader-panel"
    );
    n = a?.config?.entry_id ?? a?.entry_id ?? a?.config?._panel_custom?.config?.entry_id ?? void 0;
  }
  return n ?? void 0;
}
function Ln(e, t) {
  return he(e, t);
}
async function so(e, t) {
  if (!e)
    throw new Error("fetchAccountsWS: fehlendes hass");
  const n = he(e, t);
  if (!n)
    throw new Error("fetchAccountsWS: fehlendes entry_id");
  const r = await e.connection.sendMessagePromise({
    type: "pp_reader/get_accounts",
    entry_id: n
  }), a = br(r.accounts), o = Ar(r.normalized_payload);
  return {
    accounts: a,
    normalized_payload: o
  };
}
async function co(e, t) {
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
  const a = r.last_file_update;
  return typeof a == "string" ? a : "";
}
async function lo(e, t) {
  if (!e)
    throw new Error("fetchPortfoliosWS: fehlendes hass");
  const n = he(e, t);
  if (!n)
    throw new Error("fetchPortfoliosWS: fehlendes entry_id");
  const r = await e.connection.sendMessagePromise({
    type: "pp_reader/get_portfolio_data",
    entry_id: n
  }), a = wr(r.portfolios), o = Ar(r.normalized_payload);
  return {
    portfolios: a,
    normalized_payload: o
  };
}
function uo(e, t, n) {
  if (e && typeof e == "object") {
    const r = te(e.start), a = te(e.end);
    if (r && a)
      return { start: r, end: a };
  }
  if (n?.start && n.end)
    return { start: n.start, end: n.end };
  if (t)
    return { start: t, end: t };
  throw new Error("fetchDailyWealthWS: fehlender Zeitraum");
}
function ae(e) {
  return typeof e == "number" && Number.isFinite(e) ? e : 0;
}
function Mn(e) {
  return e === null ? null : typeof e == "number" && Number.isFinite(e) ? e : null;
}
function Cr(e) {
  const t = te(e.date);
  if (!t)
    return null;
  const n = {
    date: t,
    total_wealth_eur: ae(e.total_wealth_eur),
    portfolio_wealth_eur: ae(e.portfolio_wealth_eur),
    account_wealth_eur: ae(e.account_wealth_eur),
    dividends_eur: ae(e.dividends_eur),
    interest_eur: ae(e.interest_eur),
    inbound_transfers_eur: ae(e.inbound_transfers_eur),
    outbound_transfers_eur: ae(e.outbound_transfers_eur),
    performance_neutral_movements: ae(e.performance_neutral_movements),
    fees_eur: ae(e.fees_eur),
    taxes_eur: ae(e.taxes_eur),
    fx_coverage_ratio: Mn(e.fx_coverage_ratio),
    price_coverage_ratio: Mn(e.price_coverage_ratio),
    stale_price: e.stale_price === !0
  }, r = te(e.provenance);
  return r && (n.provenance = r), n;
}
function Hn(e) {
  const t = Cr(e), n = te(e.scope_type), r = te(e.scope_id);
  if (!t || !n || !r || n !== "portfolio" && n !== "account")
    return null;
  const a = {
    ...t,
    scope_type: n,
    scope_id: r
  }, o = te(e.scope_name);
  return o && (a.scope_name = o), a;
}
function fo(e) {
  if (!e || typeof e != "object")
    return;
  const t = e, n = Array.isArray(t.accounts) ? t.accounts : [], r = Array.isArray(t.portfolios) ? t.portfolios : [], a = n.map((i) => i && typeof i == "object" ? Hn(i) : null).filter((i) => !!i), o = r.map((i) => i && typeof i == "object" ? Hn(i) : null).filter((i) => !!i);
  if (!(a.length === 0 && o.length === 0))
    return { accounts: a, portfolios: o };
}
async function po(e, t, n) {
  if (!e)
    throw new Error("fetchDailyWealthWS: fehlendes hass");
  const r = he(e, t);
  if (!r)
    throw new Error("fetchDailyWealthWS: fehlendes entry_id");
  const { date: a, range: o, includeSlices: i, includeScopes: c, scopes: s, limit: l, offset: u } = n, d = te(a), p = o && typeof o == "object" ? {
    start: te(o.start) ?? "",
    end: te(o.end) ?? ""
  } : null;
  if (d && p && p.start && p.end)
    throw new Error("fetchDailyWealthWS: date und range sind gleichzeitig gesetzt");
  const f = {
    type: "pp_reader/get_daily_wealth",
    entry_id: r
  };
  if (d)
    f.date = d;
  else if (p && p.start && p.end)
    f.range = p;
  else
    throw new Error("fetchDailyWealthWS: weder date noch range angegeben");
  i !== void 0 && (f.include_slices = i), c !== void 0 && (f.include_scopes = c), (Array.isArray(s?.accounts) || Array.isArray(s?.portfolios)) && (f.scopes = {}, Array.isArray(s.accounts) && (f.scopes.accounts = s.accounts.filter((b) => typeof b == "string" && b.length > 0)), Array.isArray(s.portfolios) && (f.scopes.portfolios = s.portfolios.filter(
    (b) => typeof b == "string" && b.length > 0
  ))), typeof l == "number" && Number.isFinite(l) && l > 0 && (f.limit = l), typeof u == "number" && Number.isFinite(u) && u >= 0 && (f.offset = u);
  const g = await e.connection.sendMessagePromise(f), m = uo(g.range, d, p), h = (Array.isArray(g.records) ? g.records : []).map((b) => b && typeof b == "object" ? Cr(b) : null).filter((b) => !!b), y = fo(g.slices);
  return {
    range: m,
    records: h,
    ...y ? { slices: y } : {}
  };
}
async function Nr(e, t, n) {
  if (!e)
    throw new Error("fetchPortfolioPositionsWS: fehlendes hass");
  const r = he(e, t);
  if (!r)
    throw new Error("fetchPortfolioPositionsWS: fehlendes entry_id");
  if (!n)
    throw new Error("fetchPortfolioPositionsWS: fehlendes portfolio_uuid");
  const a = await e.connection.sendMessagePromise({
    type: "pp_reader/get_portfolio_positions",
    entry_id: r,
    portfolio_uuid: n
  }), i = vr(a.positions).map(io), c = Pr(a.normalized_payload), s = {
    portfolio_uuid: te(a.portfolio_uuid) ?? n,
    positions: i
  };
  typeof a.error == "string" && (s.error = a.error);
  const l = oo(a.coverage_ratio);
  l !== void 0 && (s.coverage_ratio = l);
  const u = te(a.provenance);
  u && (s.provenance = u);
  const d = ao(a.metric_run_uuid);
  return d !== void 0 && (s.metric_run_uuid = d), c && (s.normalized_payload = c), s;
}
async function go(e, t, n) {
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
async function ho(e, t) {
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
async function dt(e, t, n, r = {}) {
  if (!e)
    throw new Error("fetchSecurityHistoryWS: fehlendes hass");
  const a = he(e, t);
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
  const p = await e.connection.sendMessagePromise(o);
  return Array.isArray(p.prices) || (p.prices = []), Array.isArray(p.transactions) || (p.transactions = []), p;
}
const pn = /* @__PURE__ */ new Set(), gn = /* @__PURE__ */ new Set(), Er = {}, mo = [
  "renderPositionsTable",
  "applyGainPctMetadata",
  "attachSecurityDetailListener",
  "attachPortfolioPositionsSorting",
  "updatePortfolioFooter"
];
function yo(e, t) {
  typeof t == "function" && (Er[e] = t);
}
function wc(e) {
  e && pn.add(e);
}
function Pc(e) {
  e && pn.delete(e);
}
function _o() {
  return pn;
}
function Ac(e) {
  e && gn.add(e);
}
function Cc(e) {
  e && gn.delete(e);
}
function bo() {
  return gn;
}
function vo(e) {
  for (const t of mo)
    yo(t, e[t]);
}
function hn() {
  return Er;
}
const So = 2;
function fe(e) {
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
        const d = i.split(","), p = d[d.length - 1]?.length ?? 0, f = d.slice(0, -1).join(""), g = f.replace(/[+-]/g, "").length, m = d.length > 2, _ = /^[-+]?0$/.test(f);
        i = m || p === 0 || p === 3 && g > 0 && g <= 3 && !_ ? i.replace(/,/g, "") : i.replace(",", ".");
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
function Et(e, { decimals: t = So, fallback: n = null } = {}) {
  const r = fe(e);
  if (r == null)
    return n ?? null;
  const a = 10 ** t, o = Math.round(r * a) / a;
  return Object.is(o, -0) ? 0 : o;
}
function In(e, t = {}) {
  return Et(e, t);
}
function wo(e, t = {}) {
  return Et(e, t);
}
const Po = /^[+-]?(?:\d+\.?\d*|\d*\.?\d+)(?:[eE][+-]?\d+)?$/, se = (e) => {
  if (typeof e == "number")
    return Number.isFinite(e) ? e : null;
  if (typeof e == "string") {
    const t = e.trim();
    if (!t || !Po.test(t))
      return null;
    const n = Number(t);
    if (Number.isFinite(n))
      return n;
  }
  return null;
}, xr = (e) => {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t || null;
};
function Ao(e) {
  const t = e && typeof e == "object" ? e : null;
  if (!t)
    return null;
  const n = se(t.price_change_native), r = se(t.price_change_eur), a = se(t.change_pct), o = se(t.value_change_eur);
  if (n == null && r == null && a == null && o == null)
    return null;
  const i = xr(t.source) ?? "derived", c = se(t.coverage_ratio) ?? null;
  return {
    price_change_native: n,
    price_change_eur: r,
    change_pct: a,
    value_change_eur: o ?? null,
    source: i,
    coverage_ratio: c
  };
}
function ve(e) {
  const t = e && typeof e == "object" ? e : null;
  if (!t)
    return null;
  const n = se(t.gain_abs), r = se(t.gain_pct), a = se(t.total_change_eur), o = se(t.total_change_pct);
  if (n == null || r == null || a == null || o == null)
    return null;
  const i = xr(t.source) ?? "derived", c = se(t.coverage_ratio) ?? null, s = Ao(t.day_change);
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
const _e = /* @__PURE__ */ new Map();
function me(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t.length > 0 ? t : null;
}
function q(e) {
  if (e === null)
    return null;
  const t = fe(e);
  return Number.isFinite(t ?? NaN) ? t : null;
}
function Co(e) {
  if (!e || typeof e != "object")
    return !1;
  const t = e;
  return typeof t.security_uuid == "string" && typeof t.name == "string" && typeof t.current_holdings == "number" && typeof t.purchase_value == "number" && typeof t.current_value == "number";
}
function ke(e) {
  const t = { ...e };
  return e.average_cost && typeof e.average_cost == "object" && (t.average_cost = { ...e.average_cost }), e.performance && typeof e.performance == "object" && (t.performance = { ...e.performance }), e.aggregation && typeof e.aggregation == "object" && (t.aggregation = { ...e.aggregation }), e.data_state && typeof e.data_state == "object" && (t.data_state = { ...e.data_state }), t;
}
function No(e, t, n = []) {
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
function Eo(e, t) {
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
  return i !== void 0 && (n.performance = No(c, i, [
    "gain_pct",
    "total_change_pct"
  ])), o("aggregation"), o("average_cost"), o("data_state"), n;
}
function ft(e, t) {
  if (!e)
    return [];
  if (!Array.isArray(t))
    return _e.delete(e), [];
  if (t.length === 0)
    return _e.set(e, []), [];
  const n = _e.get(e) ?? [], r = new Map(
    n.filter((o) => o.security_uuid).map((o) => [o.security_uuid, o])
  ), a = t.filter((o) => !!o).map((o) => {
    const i = o.security_uuid ?? "", c = i ? r.get(i) : void 0;
    return Eo(c, o);
  }).map(ke);
  return _e.set(e, a), a.map(ke);
}
function xt(e) {
  return e ? _e.has(e) : !1;
}
function Fr(e) {
  if (!e)
    return [];
  const t = _e.get(e);
  return t ? t.map(ke) : [];
}
function xo() {
  _e.clear();
}
function Fo() {
  return new Map(
    Array.from(_e.entries(), ([e, t]) => [
      e,
      t.map(ke)
    ])
  );
}
function Le(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e, n = q(t.native), r = q(t.security), a = q(t.account), o = q(t.eur), i = q(t.coverage_ratio);
  if (n == null && r == null && a == null && o == null && i == null)
    return null;
  const c = me(t.source);
  return {
    native: n,
    security: r,
    account: a,
    eur: o,
    source: c === "totals" || c === "eur_total" ? c : "aggregation",
    coverage_ratio: i
  };
}
function mn(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e, n = q(t.total_holdings), r = q(t.positive_holdings), a = q(t.purchase_value_eur), o = q(t.purchase_total_security) ?? q(t.security_currency_total), i = q(t.purchase_total_account) ?? q(t.account_currency_total);
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
function Do(e) {
  if (!e || typeof e != "object")
    return null;
  const t = Co(e) ? ke(e) : e, n = me(t.security_uuid), r = me(t.name), a = fe(t.current_holdings), o = In(t.current_value), i = mn(t.aggregation), c = t.aggregation && typeof t.aggregation == "object" ? t.aggregation : null, s = q(t.purchase_value_eur) ?? q(c?.purchase_value_eur) ?? q(c?.purchase_total_account) ?? q(c?.account_currency_total) ?? In(t.purchase_value);
  if (!n || !r || a == null || s == null || o == null)
    return null;
  const l = {
    security_uuid: n,
    name: r,
    portfolio_uuid: me(t.portfolio_uuid) ?? me(t.portfolioUuid) ?? void 0,
    currency_code: me(t.currency_code),
    current_holdings: a,
    purchase_value: s,
    current_value: o
  }, u = Le(t.average_cost);
  u && (l.average_cost = u), i && (l.aggregation = i);
  const d = ve(t.performance);
  if (d)
    l.performance = d, l.gain_abs = typeof d.gain_abs == "number" ? d.gain_abs : null, l.gain_pct = typeof d.gain_pct == "number" ? d.gain_pct : null;
  else {
    const b = q(t.gain_abs), S = q(t.gain_pct);
    b !== null && (l.gain_abs = b), S !== null && (l.gain_pct = S);
  }
  "coverage_ratio" in t && (l.coverage_ratio = q(t.coverage_ratio));
  const p = me(t.provenance);
  p && (l.provenance = p);
  const f = me(t.metric_run_uuid);
  (f || t.metric_run_uuid === null) && (l.metric_run_uuid = f ?? null);
  const g = q(t.last_price_native);
  g !== null && (l.last_price_native = g);
  const m = q(t.last_price_eur);
  m !== null && (l.last_price_eur = m);
  const _ = q(t.last_close_native);
  _ !== null && (l.last_close_native = _);
  const h = q(t.last_close_eur);
  h !== null && (l.last_close_eur = h);
  const y = t.data_state && typeof t.data_state == "object" ? { ...t.data_state } : void 0;
  return y && (l.data_state = y), l;
}
function Ft(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = Do(n);
    r && t.push(r);
  }
  return t;
}
let Dr = [];
const be = /* @__PURE__ */ new Map();
function st(e) {
  return typeof e == "string" && e.length > 0 ? e : void 0;
}
function To(e) {
  return e === null ? null : st(e);
}
function ko(e) {
  return typeof e == "number" && Number.isFinite(e) ? e : void 0;
}
function we(e) {
  return e === null ? null : ko(e);
}
function Vn(e) {
  if (!(typeof e != "number" || !Number.isFinite(e)))
    return Math.trunc(e);
}
function ce(e) {
  if (!(!e || typeof e != "object"))
    return { ...e };
}
function Ke(e) {
  const t = { ...e };
  return t.average_cost = ce(e.average_cost), t.performance = ce(e.performance), t.aggregation = ce(e.aggregation), t.data_state = ce(e.data_state), t;
}
function yn(e) {
  const t = { ...e };
  return t.performance = ce(e.performance), t.data_state = ce(e.data_state), Array.isArray(e.positions) && (t.positions = e.positions.map(Ke)), t;
}
function Tr(e) {
  if (!e || typeof e != "object")
    return null;
  const t = st(e.uuid);
  if (!t)
    return null;
  const n = { uuid: t }, r = st(e.name);
  r && (n.name = r);
  const a = we(e.current_value);
  a !== void 0 && (n.current_value = a);
  const o = we(e.purchase_sum) ?? we(e.purchase_value_eur) ?? we(e.purchase_value);
  o !== void 0 && (n.purchase_value = o, n.purchase_sum = o);
  const i = we(e.day_change_abs);
  i !== void 0 && (n.day_change_abs = i);
  const c = we(e.day_change_pct);
  c !== void 0 && (n.day_change_pct = c);
  const s = Vn(e.position_count);
  s !== void 0 && (n.position_count = s);
  const l = Vn(e.missing_value_positions);
  l !== void 0 && (n.missing_value_positions = l), typeof e.has_current_value == "boolean" && (n.has_current_value = e.has_current_value);
  const u = we(e.coverage_ratio);
  u !== void 0 && (n.coverage_ratio = u);
  const d = st(e.provenance);
  d && (n.provenance = d), "metric_run_uuid" in e && (n.metric_run_uuid = To(e.metric_run_uuid));
  const p = ce(e.performance);
  p && (n.performance = p);
  const f = ce(e.data_state);
  if (f && (n.data_state = f), Array.isArray(e.positions)) {
    const g = e.positions.filter(
      (m) => !!m
    );
    g.length && (n.positions = g.map(Ke));
  }
  return n;
}
function Ro(e, t) {
  const n = {
    ...e,
    ...t
  };
  return !t.performance && e.performance && (n.performance = ce(e.performance)), !t.data_state && e.data_state && (n.data_state = ce(e.data_state)), !t.positions && e.positions && (n.positions = e.positions.map(Ke)), n;
}
function kr(e) {
  Dr = (e ?? []).map((n) => ({ ...n }));
}
function $o() {
  return Dr.map((e) => ({ ...e }));
}
function Lo(e) {
  be.clear();
  const t = e ?? [];
  for (const n of t) {
    const r = Tr(n);
    r && be.set(r.uuid, yn(r));
  }
}
function Mo(e) {
  const t = e ?? [];
  for (const n of t) {
    const r = Tr(n);
    if (!r)
      continue;
    const a = be.get(r.uuid), o = a ? Ro(a, r) : yn(r);
    be.set(o.uuid, o);
  }
}
function pt(e, t) {
  if (!e)
    return;
  const n = be.get(e);
  if (!n)
    return;
  if (!Array.isArray(t) || t.length === 0) {
    const s = { ...n };
    delete s.positions, be.set(e, s);
    return;
  }
  const r = (s, l) => {
    const u = s ? Ke(s) : {}, d = u;
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
      const _ = l[g], h = s && s[g] && typeof s[g] == "object" ? s[g] : void 0;
      if (!_ || typeof _ != "object") {
        _ !== void 0 && (d[g] = _);
        return;
      }
      const y = {
        ...h ?? {},
        ..._
      };
      m.forEach((b) => {
        const S = h?.[b];
        S != null && (y[b] = S);
      }), d[g] = y;
    };
    return f("performance", ["gain_pct", "total_change_pct"]), f("aggregation"), f("average_cost"), f("data_state"), u;
  }, a = Array.isArray(n.positions) ? n.positions : [], o = new Map(
    a.filter((s) => s.security_uuid).map((s) => [s.security_uuid, s])
  ), i = t.filter((s) => !!s).map((s) => {
    const l = s.security_uuid ? o.get(s.security_uuid) : void 0;
    return r(l, s);
  }).map(Ke), c = {
    ...n,
    positions: i
  };
  be.set(e, c);
}
function Ho() {
  return Array.from(be.values(), (e) => yn(e));
}
function Rr() {
  return {
    accounts: $o(),
    portfolios: Ho()
  };
}
const Io = "unknown-account";
function X(e) {
  return typeof e != "number" || !Number.isFinite(e) ? null : e;
}
function zn(e) {
  const t = X(e);
  return t == null ? 0 : Math.trunc(t);
}
function ee(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t.length > 0 ? t : null;
}
function $r(e, t) {
  return ee(e) ?? t;
}
function Lr(e) {
  return e == null || !Number.isFinite(e) ? null : e < 0 ? 0 : e > 1 ? 1 : e;
}
function Mr(e) {
  return e.split(/[\s_-]+/).filter(Boolean).map(
    (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
  ).join(" ");
}
function Hr(e) {
  const t = Vo(e);
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
function Vo(e) {
  const t = ee(e);
  if (!t)
    return null;
  const n = zo(t);
  return n || Mr(t);
}
function zo(e) {
  const t = e.trim();
  if (!t.startsWith("{") && !t.startsWith("["))
    return null;
  try {
    const n = JSON.parse(t), r = qo(n), a = n && typeof n == "object" ? ee(
      n.provider ?? n.source
    ) : null;
    if (r.length && a)
      return `${Mr(a)} (${r.join(", ")})`;
    if (r.length)
      return `FX (${r.join(", ")})`;
  } catch {
    return null;
  }
  return null;
}
function qo(e) {
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
function Uo(e) {
  if (!e)
    return null;
  const t = ee(e.uuid) ?? `${Io}-${e.name ?? "0"}`, n = $r(e.name, "Unbenanntes Konto"), r = ee(e.currency_code), a = X(e.balance), o = X(e.orig_balance), i = "coverage_ratio" in e ? Lr(X(e.coverage_ratio)) : null, c = ee(e.provenance), s = ee(e.metric_run_uuid), l = e.fx_unavailable === !0, u = X(e.fx_rate), d = ee(e.fx_rate_source), p = ee(e.fx_rate_timestamp), f = [], g = Hr(c);
  g && f.push(g);
  const m = {
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
    fx_rate_timestamp: p,
    badges: f
  }, _ = typeof s == "string" ? s : null;
  return m.metric_run_uuid = _, m;
}
function Wo(e) {
  if (!e)
    return null;
  const t = ee(e.uuid);
  if (!t)
    return null;
  const n = $r(e.name, "Unbenanntes Depot"), r = zn(e.position_count), a = zn(e.missing_value_positions), o = X(e.current_value), i = X(e.purchase_sum) ?? X(e.purchase_value_eur) ?? X(e.purchase_value) ?? 0, c = X(e.day_change_abs) ?? null, s = X(e.day_change_pct) ?? null, l = ve(e.performance), u = l?.gain_abs ?? null, d = l?.gain_pct ?? null, p = l?.day_change ?? null;
  let f = c ?? (p?.value_change_eur != null ? X(p.value_change_eur) : null), g = s ?? (p?.change_pct != null ? X(p.change_pct) : null);
  if (f == null && g != null && o != null) {
    const N = o / (1 + g / 100);
    N && (f = o - N);
  }
  if (g == null && f != null && o != null) {
    const N = o - f;
    N && (g = f / N * 100);
  }
  const m = o != null, _ = e.has_current_value === !1 || !m, h = "coverage_ratio" in e ? Lr(X(e.coverage_ratio)) : null, y = ee(e.provenance), b = ee(e.metric_run_uuid), S = [], w = Hr(y);
  w && S.push(w);
  const C = {
    uuid: t,
    name: n,
    position_count: r,
    current_value: o,
    purchase_sum: i,
    day_change_abs: f ?? null,
    day_change_pct: g ?? null,
    gain_abs: u,
    gain_pct: d,
    hasValue: m,
    fx_unavailable: _ || a > 0,
    missing_value_positions: a,
    performance: l,
    coverage_ratio: h,
    provenance: y,
    metric_run_uuid: null,
    badges: S
  }, A = typeof b == "string" ? b : null;
  return C.metric_run_uuid = A, C;
}
function Ir() {
  const { accounts: e } = Rr();
  return e.map(Uo).filter((t) => !!t);
}
function Oo() {
  const { portfolios: e } = Rr();
  return e.map(Wo).filter((t) => !!t);
}
function Ye(e) {
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
function Vr(e, t = {}) {
  if (!e || e.length === 0)
    return "";
  const n = ["meta-badges", t.containerClass].filter(Boolean).join(" "), r = e.map((a) => {
    const o = `meta-badge--${a.tone}`, i = a.description ? ` title="${Ye(a.description)}"` : "";
    return `<span class="meta-badge ${o}"${i}>${Ye(
      a.label
    )}</span>`;
  }).join("");
  return `<span class="${n}">${r}</span>`;
}
function gt(e, t, n = {}) {
  const r = Vr(t, n);
  if (!r)
    return Ye(e);
  const a = n.labelClass ?? "name-with-badges__label";
  return `<span class="${["name-with-badges", n.containerClass].filter(Boolean).join(" ")}"><span class="${a}">${Ye(
    e
  )}</span>${r}</span>`;
}
function zr(e, t, n, r) {
  e[t] = {
    previous: n,
    current: r
  };
}
const le = /* @__PURE__ */ new Map(), Oe = /* @__PURE__ */ new Map();
function Bo(e) {
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
function Me(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t.length > 0 ? t : null;
}
function Ce(e) {
  return typeof e == "number" && Number.isFinite(e) ? e : void 0;
}
function jo(e) {
  return e === null ? null : Ce(e);
}
function Ko(e) {
  return e === null ? null : Me(e);
}
function qn(e) {
  return (e ?? []).filter(
    (t) => !t.key.endsWith("-coverage") && !t.key.startsWith("provenance-")
  );
}
function Un(e) {
  return ve(e.performance);
}
const Yo = 500, Go = 10, Xo = "pp-reader:portfolio-positions-updated", Zo = "pp-reader:diagnostics", Rt = /* @__PURE__ */ new Map(), qr = [
  "coverage_ratio",
  "provenance",
  "metric_run_uuid",
  "generated_at"
], Kt = /* @__PURE__ */ new Map();
function Jo(e, t) {
  return `${e}:${t}`;
}
function Qo(e) {
  if (e === void 0)
    return;
  if (e === null)
    return null;
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  const t = jo(e);
  if (t === null)
    return null;
  if (typeof t == "number" && Number.isFinite(t))
    return t;
}
function $t(e) {
  if (e !== void 0)
    return Ko(e);
}
function _n(e, t, n, r) {
  const a = {}, o = Qo(e);
  o !== void 0 && (a.coverage_ratio = o);
  const i = $t(t);
  i !== void 0 && (a.provenance = i);
  const c = $t(n);
  c !== void 0 && (a.metric_run_uuid = c);
  const s = $t(r);
  return s !== void 0 && (a.generated_at = s), Object.keys(a).length > 0 ? a : null;
}
function ei(e, t) {
  const n = {};
  let r = !1;
  for (const a of qr) {
    const o = e?.[a], i = t[a];
    o !== i && (zr(n, a, o, i), r = !0);
  }
  return r ? n : null;
}
function ti(e) {
  const t = {};
  let n = !1;
  for (const r of qr) {
    const a = e[r];
    a !== void 0 && (zr(t, r, a, void 0), n = !0);
  }
  return n ? t : null;
}
function Wn(e) {
  if (Object.keys(e.changed).length) {
    try {
      console.debug("pp-reader:diagnostics", e);
    } catch {
    }
    if (!(typeof window > "u" || typeof window.dispatchEvent != "function"))
      try {
        window.dispatchEvent(new CustomEvent(Zo, { detail: e }));
      } catch (t) {
        console.warn("updateConfigsWS: Diagnostics-Event konnte nicht gesendet werden", t);
      }
  }
}
function bn(e, t, n, r) {
  const a = Jo(e, n), o = Rt.get(a);
  if (!r) {
    if (!o)
      return;
    Rt.delete(a);
    const c = ti(o);
    if (!c)
      return;
    Wn({
      kind: e,
      uuid: n,
      source: t,
      changed: c,
      snapshot: {},
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    return;
  }
  const i = ei(o, r);
  i && (Rt.set(a, { ...r }), Wn({
    kind: e,
    uuid: n,
    source: t,
    changed: i,
    snapshot: { ...r },
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  }));
}
function ni(e) {
  if (!(!e || e.length === 0))
    for (const t of e) {
      const n = Me(t.uuid);
      if (!n)
        continue;
      const r = _n(
        t.coverage_ratio,
        t.provenance,
        t.metric_run_uuid,
        void 0
      );
      bn("account", "accounts", n, r);
    }
}
function ri(e) {
  if (!(!e || e.length === 0))
    for (const t of e) {
      const n = Me(t.uuid);
      if (!n)
        continue;
      const r = _n(
        t.coverage_ratio,
        t.provenance,
        t.metric_run_uuid,
        void 0
      );
      bn("portfolio", "portfolio_values", n, r);
    }
}
function ai(e, t) {
  if (!t)
    return;
  const n = _n(
    t.coverage_ratio ?? t.normalized_payload?.coverage_ratio,
    t.provenance ?? t.normalized_payload?.provenance,
    t.metric_run_uuid ?? t.normalized_payload?.metric_run_uuid,
    t.normalized_payload?.generated_at
  );
  bn("portfolio_positions", "portfolio_positions", e, n);
}
function oi(e, t) {
  return `<div class="error">${Bo(e)} <button class="retry-pos" data-portfolio="${t}">Erneut laden</button></div>`;
}
function ii(e, t, n) {
  const r = e.querySelector("table.sortable-positions");
  if (!r) return;
  const a = e.dataset.sortKey || r.dataset.defaultSort || "name", i = (e.dataset.sortDir || r.dataset.defaultDir || "asc") === "desc" ? "desc" : "asc";
  e.dataset.sortKey = a, e.dataset.sortDir = i;
  try {
    mr(r, a, i, !0);
  } catch (l) {
    console.warn("restoreSortAndInit: sortTableRows Fehler:", l);
  }
  const { attachPortfolioPositionsSorting: c, attachSecurityDetailListener: s } = hn();
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
function Ur(e, t, n, r) {
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
    return o.innerHTML = oi(r, t), { applied: !0 };
  const i = o.dataset.sortKey, c = o.dataset.sortDir;
  return o.innerHTML = hi(n), i && (o.dataset.sortKey = i), c && (o.dataset.sortDir = c), ii(o, e, t), { applied: !0 };
}
function vn(e, t) {
  const n = le.get(t);
  if (!n) return !1;
  const r = Ur(
    e,
    t,
    n.positions,
    n.error
  );
  return r.applied && le.delete(t), r.applied;
}
function si(e) {
  let t = !1;
  for (const [n] of le)
    vn(e, n) && (t = !0);
  return t;
}
function Wr(e, t) {
  const n = Oe.get(t) ?? {
    attempts: 0,
    timer: null
  };
  n.timer || (n.timer = setTimeout(() => {
    n.timer = null, n.attempts += 1;
    const r = vn(e, t);
    r || n.attempts >= Go ? (Oe.delete(t), r || le.delete(t)) : Wr(e, t);
  }, Yo), Oe.set(t, n));
}
function ci(e, t) {
  console.log("updateConfigsWS: Kontodaten-Update erhalten:", e);
  const n = Array.isArray(e) ? e : [];
  if (kr(n), ni(n), !t)
    return;
  const r = Ir();
  li(r, t);
  const a = t.querySelector(".portfolio-table table"), o = a ? Array.from(
    a.querySelectorAll("tbody tr.portfolio-row")
  ).map((i) => {
    const c = i.dataset.currentValue, s = c ? Number.parseFloat(c) : Number.NaN;
    if (Number.isFinite(s))
      return {
        current_value: s
      };
    const l = i.cells.item(3), u = ct(l?.textContent);
    return {
      current_value: Number.isFinite(u) ? u : 0
    };
  }) : [];
  Or(r, o, t);
}
function li(e, t) {
  const n = t.querySelector(".account-table"), r = t.querySelector(".fx-account-table"), a = e.filter((i) => (i.currency_code || "EUR") === "EUR"), o = e.filter((i) => (i.currency_code || "EUR") !== "EUR");
  if (n) {
    const i = a.map((c) => ({
      name: gt(c.name, qn(c.badges), {
        containerClass: "account-name",
        labelClass: "account-name__label"
      }),
      balance: c.balance ?? null
    }));
    n.innerHTML = Te(
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
      const s = c.orig_balance, l = typeof s == "number" && Number.isFinite(s), u = Me(c.currency_code), d = l ? s.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) : null, p = d ? u ? `${d} ${u}` : d : "";
      return {
        name: gt(c.name, qn(c.badges), {
          containerClass: "account-name",
          labelClass: "account-name__label"
        }),
        fx_display: p,
        balance: c.balance ?? null
      };
    });
    r.innerHTML = Te(
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
function ui(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = Sr(n);
    r && t.push(r);
  }
  return t;
}
function di(e, t) {
  if (!Array.isArray(e)) {
    console.warn("handlePortfolioUpdate: Update ist kein Array:", e);
    return;
  }
  try {
    console.debug("handlePortfolioUpdate: payload=", e);
  } catch {
  }
  const n = ui(e);
  if (n.length && Mo(n), ri(n), !t)
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
    return (Et(d, { fallback: 0 }) ?? 0).toFixed(2).replace(".", ",");
  }, i = /* @__PURE__ */ new Map();
  a.querySelectorAll("tr.portfolio-row").forEach((d) => {
    const p = d.dataset.portfolio;
    p && i.set(p, d);
  });
  let s = 0;
  const l = (d) => {
    const p = typeof d == "number" && Number.isFinite(d) ? d : 0;
    try {
      return p.toLocaleString("de-DE");
    } catch {
      return p.toString();
    }
  }, u = /* @__PURE__ */ new Map();
  for (const d of n) {
    const p = Me(d.uuid);
    p && u.set(p, d);
  }
  for (const [d, p] of u.entries()) {
    const f = i.get(d);
    if (!f)
      continue;
    f.cells.length < 8 && console.warn("handlePortfolioUpdate: Unerwartetes Spaltenlayout", f.cells.length);
    const g = f.cells.item(1), m = f.cells.item(2), _ = f.cells.item(3), h = f.cells.item(4), y = f.cells.item(5), b = f.cells.item(6), S = f.cells.item(7);
    if (!g || !m || !_)
      continue;
    const w = typeof p.position_count == "number" && Number.isFinite(p.position_count) ? p.position_count : 0, C = typeof p.current_value == "number" && Number.isFinite(p.current_value) ? p.current_value : null, A = ve(p.performance), N = typeof A?.gain_abs == "number" ? A.gain_abs : null, D = typeof A?.gain_pct == "number" ? A.gain_pct : null, H = typeof p.purchase_sum == "number" && Number.isFinite(p.purchase_sum) ? p.purchase_sum : typeof p.purchase_value == "number" && Number.isFinite(p.purchase_value) ? p.purchase_value : null, P = A?.day_change ?? null, E = Ce(p.day_change_abs) ?? Ce(P?.value_change_eur) ?? Ce(P?.price_change_eur), I = Ce(p.day_change_pct) ?? Ce(P?.change_pct);
    let F = E ?? null, T = I ?? null;
    if (F == null && T != null && C != null) {
      const K = C / (1 + T / 100);
      K && (F = C - K);
    }
    if (T == null && F != null && C != null) {
      const K = C - F;
      K && (T = F / K * 100);
    }
    const Y = typeof p.missing_value_positions == "number" && Number.isFinite(p.missing_value_positions) ? p.missing_value_positions : 0, v = C !== null, x = p.has_current_value === !1 || Y > 0 || !v, $ = ct(_.textContent);
    ct(g.textContent) !== w && (g.textContent = l(w));
    const k = {
      fx_unavailable: x,
      current_value: C,
      performance: A
    }, V = { hasValue: v }, W = L("purchase_value", H, k, V);
    m.innerHTML !== W && (m.innerHTML = W);
    const B = L("current_value", k.current_value, k, V), G = typeof C == "number" ? C : 0;
    if ((Math.abs($ - G) >= 5e-3 || _.innerHTML !== B) && (_.innerHTML = B, f.classList.add("flash-update"), setTimeout(() => {
      f.classList.remove("flash-update");
    }, 800)), h && (h.innerHTML = L("day_change_abs", F, k, V)), y && (y.innerHTML = L("day_change_pct", T, k, V)), b) {
      const K = L("gain_abs", N, k, V);
      b.innerHTML = K;
      const Se = typeof D == "number" && Number.isFinite(D) ? D : null;
      b.dataset.gainPct = Se != null ? `${o(Se)} %` : "—", b.dataset.gainSign = Se != null ? Se > 0 ? "positive" : Se < 0 ? "negative" : "neutral" : "neutral";
    }
    S && (S.innerHTML = L("gain_pct", D, k, V)), f.dataset.positionCount = w.toString(), f.dataset.purchaseSum = H != null ? H.toString() : "", f.dataset.currentValue = v ? G.toString() : "", f.dataset.dayChange = v && F != null ? F.toString() : "", f.dataset.dayChangePct = v && T != null ? T.toString() : "", f.dataset.gainAbs = N != null ? N.toString() : "", f.dataset.gainPct = D != null ? D.toString() : "", f.dataset.hasValue = v ? "true" : "false", f.dataset.fxUnavailable = x ? "true" : "false", f.dataset.coverageRatio = typeof p.coverage_ratio == "number" && Number.isFinite(p.coverage_ratio) ? p.coverage_ratio.toString() : "", f.dataset.provenance = typeof p.provenance == "string" ? p.provenance : "", f.dataset.metricRunUuid = typeof p.metric_run_uuid == "string" ? p.metric_run_uuid : "", s += 1;
  }
  if (s === 0)
    console.debug("handlePortfolioUpdate: Keine passenden Zeilen gefunden / keine Änderungen.");
  else {
    const d = s.toLocaleString("de-DE");
    console.debug(`handlePortfolioUpdate: ${d} Zeile(n) gepatcht.`);
  }
  try {
    mi(r);
  } catch (d) {
    console.warn("handlePortfolioUpdate: Fehler bei Summen-Neuberechnung:", d);
  }
  try {
    const d = (...h) => {
      for (const y of h) {
        if (!y) continue;
        const b = t.querySelector(y);
        if (b) return b;
      }
      return null;
    }, p = d(
      ".account-table table",
      ".accounts-eur-table table",
      ".accounts-table table"
    ), f = d(
      ".fx-account-table table",
      ".accounts-fx-table table"
    ), g = (h, y) => {
      if (!h) return [];
      const b = h.querySelectorAll("tbody tr.account-row");
      return (b.length ? Array.from(b) : Array.from(h.querySelectorAll("tbody tr:not(.footer-row)"))).map((w) => {
        const C = y ? w.cells.item(2) : w.cells.item(1);
        return { balance: ct(C?.textContent) };
      });
    }, m = [
      ...g(p, !1),
      ...g(f, !0)
    ], _ = Array.from(
      r.querySelectorAll("tbody tr.portfolio-row")
    ).map((h) => {
      const y = h.dataset.currentValue, b = h.dataset.purchaseSum, S = y ? Number.parseFloat(y) : Number.NaN, w = b ? Number.parseFloat(b) : Number.NaN;
      return {
        current_value: Number.isFinite(S) ? S : 0,
        purchase_sum: Number.isFinite(w) ? w : 0
      };
    });
    Or(m, _, t);
  } catch (d) {
    console.warn("handlePortfolioUpdate: Fehler bei Total-Neuberechnung:", d);
  }
}
function fi(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e.portfolio_uuid;
  if (typeof t == "string" && t)
    return t;
  const n = e.portfolioUuid;
  return typeof n == "string" && n ? n : null;
}
function Yt(e) {
  Kt.delete(e);
}
function On(e) {
  return typeof e != "number" || !Number.isInteger(e) || e <= 0 ? null : e;
}
function pi(e, t, n, r) {
  if (!n || n <= 1 || !t)
    return Yt(e), r;
  const a = n, o = Kt.get(e) ?? { expected: a, chunks: /* @__PURE__ */ new Map() };
  if (o.expected !== a && (o.chunks.clear(), o.expected = a), o.chunks.set(t, r), Kt.set(e, o), o.chunks.size < a)
    return null;
  const i = [];
  for (let c = 1; c <= a; c += 1) {
    const s = o.chunks.get(c);
    s && Array.isArray(s) && i.push(...s);
  }
  return Yt(e), i;
}
function Bn(e, t) {
  const n = fi(e);
  if (!n)
    return console.warn("handlePortfolioPositionsUpdate: Ungültiges Update:", e), !1;
  const r = e?.error, a = On(e?.chunk_index), o = On(e?.chunk_count), i = Ft(e?.positions ?? []);
  r && Yt(n);
  const c = r ? i : pi(n, a, o, i);
  if (!r && c === null)
    return !0;
  const s = r ? i : c ?? [];
  ai(n, e);
  const l = xt(n);
  let u = s;
  if (!r && l) {
    const p = ft(n, s);
    pt(n, p), u = p;
  }
  const d = Ur(t, n, u, r);
  if (d.applied) {
    if (le.delete(n), !r && !l) {
      const p = ft(n, u);
      pt(n, p);
    }
  } else
    r || d.reason !== "hidden" || l ? (le.set(n, { positions: u, error: r }), Wr(t, n)) : (le.delete(n), Oe.delete(n));
  if (!r && i.length > 0) {
    const p = Array.from(
      new Set(
        i.map((f) => f.security_uuid).filter((f) => typeof f == "string" && f.length > 0)
      )
    );
    if (p.length && typeof window < "u")
      try {
        window.dispatchEvent(
          new CustomEvent(
            Xo,
            {
              detail: {
                portfolioUuid: n,
                securityUuids: p
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
function gi(e, t) {
  if (Array.isArray(e)) {
    let n = !1;
    for (const r of e)
      Bn(r, t) && (n = !0);
    !n && e.length && console.warn("handlePortfolioPositionsUpdate: Kein gültiges Element im Array:", e);
    return;
  }
  Bn(e, t);
}
function hi(e) {
  const { renderPositionsTable: t, applyGainPctMetadata: n } = hn();
  try {
    if (typeof t == "function")
      return t(e);
  } catch {
  }
  if (e.length === 0)
    return '<div class="no-positions">Keine Positionen vorhanden.</div>';
  const r = e.map((o) => {
    const i = Un(o);
    return {
      name: o.name,
      current_holdings: o.current_holdings,
      purchase_value: o.purchase_value,
      current_value: o.current_value,
      performance: i
    };
  }), a = Te(
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
      c.forEach((d, p) => {
        const f = s[p];
        f && (d.setAttribute("data-sort-key", f), d.classList.add("sortable-col"));
      }), i.querySelectorAll("tbody tr").forEach((d, p) => {
        if (d.classList.contains("footer-row"))
          return;
        const f = e[p];
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
        i.querySelectorAll("tbody tr").forEach((p, f) => {
          if (p.classList.contains("footer-row"))
            return;
          const g = p.cells.item(4);
          if (!g)
            return;
          const m = e[f], _ = Un(m), h = typeof _?.gain_pct == "number" && Number.isFinite(_.gain_pct) ? _.gain_pct : null, y = h != null ? `${h.toLocaleString("de-DE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })} %` : "—", b = h == null ? "neutral" : h > 0 ? "positive" : h < 0 ? "negative" : "neutral";
          g.dataset.gainPct = y, g.dataset.gainSign = b;
        });
      return i.outerHTML;
    }
  } catch (o) {
    console.warn("renderPositionsTableInline: Sortier-Metadaten Injection fehlgeschlagen:", o);
  }
  return a;
}
function mi(e) {
  if (!e) return;
  const { updatePortfolioFooter: t } = hn();
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
    const y = Number.parseFloat(h);
    return Number.isFinite(y) ? y : null;
  }, a = n.reduce(
    (h, y) => {
      const b = r(y.dataset.positionCount);
      if (b != null && (h.sumPositions += b), y.dataset.fxUnavailable === "true" && (h.fxUnavailable = !0), y.dataset.hasValue !== "true")
        return h.incompleteRows += 1, h;
      h.valueRows += 1;
      const S = r(y.dataset.currentValue), w = r(y.dataset.gainAbs), C = r(y.dataset.purchaseSum);
      return S == null || w == null || C == null ? (h.incompleteRows += 1, h) : (h.sumCurrent += S, h.sumGainAbs += w, h.sumPurchase += C, h);
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
  }, u = { hasValue: o }, d = L("current_value", l.current_value, l, u), p = o ? a.sumGainAbs : null, f = o ? i : null, g = L("gain_abs", p, l, u), m = L("gain_pct", f, l, u);
  c.innerHTML = `
    <td>Summe</td>
    <td class="align-right">${s}</td>
    <td class="align-right">${d}</td>
    <td class="align-right">${g}</td>
    <td class="align-right">${m}</td>
  `;
  const _ = c.cells.item(3);
  _ && (_.dataset.gainPct = o && typeof i == "number" ? `${Gt(i)} %` : "—", _.dataset.gainSign = o && typeof i == "number" ? i > 0 ? "positive" : i < 0 ? "negative" : "neutral" : "neutral"), c.dataset.positionCount = Math.round(a.sumPositions).toString(), c.dataset.currentValue = o ? a.sumCurrent.toString() : "", c.dataset.purchaseSum = o ? a.sumPurchase.toString() : "", c.dataset.gainAbs = o ? a.sumGainAbs.toString() : "", c.dataset.gainPct = o && typeof i == "number" ? i.toString() : "", c.dataset.hasValue = o ? "true" : "false", c.dataset.fxUnavailable = a.fxUnavailable || !o ? "true" : "false";
}
function jn(e) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  if (typeof e == "string") {
    const t = Number.parseFloat(e);
    return Number.isFinite(t) ? t : 0;
  }
  return 0;
}
function Gt(e) {
  return (Et(e, { fallback: 0 }) ?? 0).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
function Or(e, t, n) {
  const r = n ?? document, o = (Array.isArray(e) ? e : []).reduce((d, p) => {
    const f = p.balance ?? p.current_value ?? p.value, g = jn(f);
    return d + g;
  }, 0), c = (Array.isArray(t) ? t : []).reduce((d, p) => {
    const f = p.current_value ?? p.value, g = jn(f);
    return d + g;
  }, 0), s = o + c, l = r.querySelector("#headerMeta");
  if (!l) {
    console.warn("updateTotalWealth: #headerMeta nicht gefunden.");
    return;
  }
  const u = l.querySelector("strong") || l.querySelector(".total-wealth-value");
  u ? u.textContent = `${Gt(s)} €` : l.textContent = `💰 Gesamtvermögen: ${Gt(s)} €`, l.dataset.totalWealthEur = s.toString();
}
function yi(e, t) {
  const n = typeof e == "string" ? e : e?.last_file_update, r = Me(n) ?? "";
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
  a.closest(".footer-card") ? a.innerHTML = r ? `📂 Letzte Aktualisierung der Datei: <strong>${r}</strong>` : "📂 Letzte Aktualisierung der Datei: <strong>Unbekannt</strong>" : a.textContent = r ? `📂 Letzte Aktualisierung: ${r}` : "📂 Letzte Aktualisierung: Unbekannt";
}
function Nc(e) {
  if (e == null)
    return;
  const t = e.querySelector("table.sortable-positions");
  if (t == null)
    return;
  const n = e.dataset.sortKey || t.dataset.defaultSort || "name", a = (e.dataset.sortDir || t.dataset.defaultDir || "asc") === "desc" ? "desc" : "asc";
  e.dataset.sortKey = n, e.dataset.sortDir = a, mr(t, n, a, !0);
}
const Ec = {
  getPortfolioPositionsCacheSnapshot: Fo,
  clearPortfolioPositionsCache: xo,
  getPendingUpdateCount() {
    return le.size;
  },
  queuePendingUpdate(e, t, n) {
    le.set(e, { positions: t, error: n });
  },
  clearPendingUpdates() {
    le.clear(), Oe.clear();
  }
};
function ct(e) {
  return e == null ? 0 : parseFloat(
    e.replace(/\u00A0/g, " ").replace(/[€%]/g, "").replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "")
  ) || 0;
}
const _i = [
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
function Lt(e) {
  return _i.includes(e);
}
function Mt(e) {
  return e === "asc" || e === "desc";
}
function Br(e) {
  return (e ?? []).filter((t) => !t.key.endsWith("-coverage"));
}
function Kn(e) {
  return Br(e).filter(
    (t) => !t.key.startsWith("provenance-")
  );
}
let ht = null, mt = null;
const Yn = { min: 2, max: 6 };
function Ve(e) {
  return fe(e);
}
function bi(e) {
  return typeof e == "number" && Number.isFinite(e);
}
function vi(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  if (!t)
    return null;
  const n = t.toUpperCase();
  return /^[A-Z]{3}$/.test(n) ? n : n === "€" ? "EUR" : null;
}
function Gn(e, t, n = null) {
  for (const r of t) {
    const a = vi(e[r]);
    if (a)
      return a;
  }
  return n;
}
function Xn(e, t) {
  return bi(e) ? `${e.toLocaleString("de-DE", {
    minimumFractionDigits: Yn.min,
    maximumFractionDigits: Yn.max
  })}${t ? ` ${t}` : ""}` : null;
}
function Si(e) {
  const t = e, n = e.average_cost ?? null, r = e.aggregation ?? null, a = Gn(t, [
    "security_currency_code",
    "security_currency",
    "native_currency_code",
    "native_currency"
  ], e.currency_code ?? null), o = Gn(
    t,
    [
      "account_currency_code",
      "account_currency",
      "purchase_currency_code",
      "currency_code"
    ],
    a === "EUR" ? "EUR" : null
  ) ?? "EUR", i = Ve(n?.native), c = Ve(n?.security), s = Ve(n?.account), l = Ve(n?.eur), u = c ?? i, d = l ?? (o === "EUR" ? s : null), p = a ?? o, f = p === "EUR";
  let g, m;
  f ? (g = "EUR", m = d ?? u ?? s ?? null) : u != null ? (g = p, m = u) : s != null ? (g = o, m = s) : (g = "EUR", m = d ?? null);
  const _ = Xn(m, g), h = f ? null : Xn(d, "EUR"), y = !!h && h !== _, b = [], S = [];
  _ ? (b.push(
    `<span class="purchase-price purchase-price--primary">${_}</span>`
  ), S.push(_.replace(/\u00A0/g, " "))) : (b.push('<span class="missing-value" role="note" aria-label="Kein Kaufpreis verfügbar" title="Kein Kaufpreis verfügbar">—</span>'), S.push("Kein Kaufpreis verfügbar")), y && h && (b.push(
    `<span class="purchase-price purchase-price--secondary">${h}</span>`
  ), S.push(h.replace(/\u00A0/g, " ")));
  const w = b.join("<br>"), C = Ve(r?.purchase_value_eur) ?? 0, A = S.join(", ");
  return { markup: w, sortValue: C, ariaLabel: A };
}
function wi(e) {
  const t = fe(e.current_holdings);
  if (t == null)
    return { value: null, pct: null };
  const n = fe(e.last_price_eur), r = fe(e.last_close_eur);
  let a = null, o = null;
  if (n != null && r != null) {
    a = (n - r) * t;
    const d = r * t;
    d && (o = a / d * 100);
  }
  const c = ve(e.performance)?.day_change ?? null;
  if (a == null && c?.price_change_eur != null && (a = c.price_change_eur * t), o == null && c?.change_pct != null && (o = c.change_pct), a == null && o != null) {
    const u = fe(e.current_value);
    if (u != null) {
      const d = u / (1 + o / 100);
      d && (a = u - d);
    }
  }
  const s = a != null && Number.isFinite(a) ? Math.round(a * 100) / 100 : null, l = o != null && Number.isFinite(o) ? Math.round(o * 100) / 100 : null;
  return { value: s, pct: l };
}
const yt = /* @__PURE__ */ new Set();
function jr(e) {
  if (!e)
    return;
  Array.from(e.querySelectorAll("tbody tr")).forEach((n) => {
    const r = n.cells.item(7), a = n.cells.item(8);
    if (!r || !a || r.dataset.gainPct && r.dataset.gainSign)
      return;
    const o = (a.textContent || "").trim() || "—";
    let i = "neutral";
    a.querySelector(".positive") ? i = "positive" : a.querySelector(".negative") && (i = "negative"), r.dataset.gainPct = o, r.dataset.gainSign = i;
  });
}
function Ge(e) {
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
  ], n = e.map((a) => {
    const o = ve(a.performance), i = typeof o?.gain_abs == "number" ? o.gain_abs : null, c = typeof o?.gain_pct == "number" ? o.gain_pct : null, s = wi(a), l = typeof a.purchase_value == "number" || typeof a.purchase_value == "string" ? a.purchase_value : null;
    return {
      name: typeof a.name == "string" ? a.name : typeof a.name == "number" ? String(a.name) : "",
      current_holdings: typeof a.current_holdings == "number" || typeof a.current_holdings == "string" ? a.current_holdings : null,
      average_price: typeof a.purchase_value == "number" || typeof a.purchase_value == "string" ? a.purchase_value : null,
      purchase_value: l,
      current_value: typeof a.current_value == "number" || typeof a.current_value == "string" ? a.current_value : null,
      day_change_abs: s.value,
      day_change_pct: s.pct,
      gain_abs: i,
      gain_pct: c,
      performance: o
    };
  }), r = Te(n, t, ["purchase_value", "current_value", "day_change_abs", "gain_abs"]);
  try {
    const a = document.createElement("template");
    a.innerHTML = r.trim();
    const o = a.content.querySelector("table");
    if (o) {
      o.classList.add("sortable-positions");
      const i = Array.from(o.querySelectorAll("thead th"));
      return t.forEach((s, l) => {
        const u = i.at(l);
        u && (u.setAttribute("data-sort-key", s.key), u.classList.add("sortable-col"));
      }), o.querySelectorAll("tbody tr").forEach((s, l) => {
        if (s.classList.contains("footer-row") || l >= e.length)
          return;
        const u = e[l], d = typeof u.security_uuid == "string" ? u.security_uuid : null;
        d && (s.dataset.security = d), s.classList.add("position-row");
        const p = s.cells.item(2);
        if (p) {
          const { markup: m, sortValue: _, ariaLabel: h } = Si(u);
          p.innerHTML = m, p.dataset.sortValue = String(_), h ? p.setAttribute("aria-label", h) : p.removeAttribute("aria-label");
        }
        const f = s.cells.item(7);
        if (f) {
          const m = ve(u.performance), _ = typeof m?.gain_pct == "number" && Number.isFinite(m.gain_pct) ? m.gain_pct : null, h = _ != null ? `${_.toLocaleString("de-DE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })} %` : "—", y = _ == null ? "neutral" : _ > 0 ? "positive" : _ < 0 ? "negative" : "neutral";
          f.dataset.gainPct = h, f.dataset.gainSign = y;
        }
        const g = s.cells.item(8);
        g && g.classList.add("gain-pct-cell");
      }), o.dataset.defaultSort = "name", o.dataset.defaultDir = "asc", jr(o), o.outerHTML;
    }
  } catch (a) {
    console.warn("renderPositionsTable: Konnte Sortier-Metadaten nicht injizieren:", a);
  }
  return r;
}
function Pi(e) {
  const t = Ft(e ?? []);
  return Ge(t);
}
function Ai(e, t) {
  if (!t) return;
  const n = e.querySelector(
    `.portfolio-details[data-portfolio="${t}"]`
  );
  if (!n) return;
  const r = n.querySelector(".positions-container");
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
        Da(s) || console.warn("attachSecurityDetailDelegation: Detail-Tab konnte nicht geöffnet werden für", s);
      } catch (l) {
        console.error("attachSecurityDetailDelegation: Fehler beim Öffnen des Detail-Tabs", l);
      }
  })));
}
function Xe(e, t) {
  Ai(e, t);
}
function Kr(e) {
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
    const x = Number.isFinite(v.position_count) ? v.position_count : 0, $ = Number.isFinite(v.purchase_sum) ? v.purchase_sum : 0, j = v.hasValue && typeof v.current_value == "number" && Number.isFinite(v.current_value) ? v.current_value : null, k = j !== null, V = v.performance, W = typeof v.gain_abs == "number" ? v.gain_abs : typeof V?.gain_abs == "number" ? V.gain_abs : null, B = typeof v.gain_pct == "number" ? v.gain_pct : typeof V?.gain_pct == "number" ? V.gain_pct : null, G = V && typeof V == "object" ? V.day_change : null, K = typeof v.day_change_abs == "number" ? v.day_change_abs : G && typeof G == "object" ? G.value_change_eur ?? G.price_change_eur : null, He = typeof v.day_change_pct == "number" ? v.day_change_pct : G && typeof G == "object" && typeof G.change_pct == "number" ? G.change_pct : null, Se = v.fx_unavailable && k, ka = typeof v.coverage_ratio == "number" && Number.isFinite(v.coverage_ratio) ? v.coverage_ratio : "", Ra = typeof v.provenance == "string" ? v.provenance : "", $a = typeof v.metric_run_uuid == "string" ? v.metric_run_uuid : "", Ie = yt.has(v.uuid), La = Ie ? "portfolio-toggle expanded" : "portfolio-toggle", Dn = `portfolio-details-${v.uuid}`, J = {
      fx_unavailable: v.fx_unavailable,
      purchase_value: $,
      current_value: j,
      day_change_abs: K,
      day_change_pct: He,
      gain_abs: W,
      gain_pct: B
    }, Ae = { hasValue: k }, Ma = L("purchase_value", J.purchase_value, J, Ae), Ha = L("current_value", J.current_value, J, Ae), Ia = L("day_change_abs", J.day_change_abs, J, Ae), Va = L("day_change_pct", J.day_change_pct, J, Ae), za = L("gain_abs", J.gain_abs, J, Ae), qa = L("gain_pct", J.gain_pct, J, Ae), Tn = k && typeof B == "number" && Number.isFinite(B) ? `${re(B)} %` : "", Ua = k && typeof B == "number" && Number.isFinite(B) ? B > 0 ? "positive" : B < 0 ? "negative" : "neutral" : "", Wa = k && typeof j == "number" && Number.isFinite(j) ? j : "", Oa = k && typeof W == "number" && Number.isFinite(W) ? W : "", Ba = k && typeof B == "number" && Number.isFinite(B) ? B : "", ja = k && typeof K == "number" && Number.isFinite(K) ? K : "", Ka = k && typeof He == "number" && Number.isFinite(He) ? He : "", Ya = String(x);
    let Tt = "";
    Tn && (Tt = ` data-gain-pct="${t(Tn)}" data-gain-sign="${t(Ua)}"`), Se && (Tt += ' data-partial="true"'), n += `<tr class="portfolio-row"
                  data-portfolio="${v.uuid}"
                  data-position-count="${Ya}"
                  data-current-value="${t(Wa)}"
                  data-purchase-sum="${t($)}"
                  data-day-change="${t(ja)}"
                  data-day-change-pct="${t(Ka)}"
                  data-gain-abs="${t(Oa)}"
                data-gain-pct="${t(Ba)}"
                data-has-value="${k ? "true" : "false"}"
                data-fx-unavailable="${v.fx_unavailable ? "true" : "false"}"
                data-coverage-ratio="${t(ka)}"
                data-provenance="${t(Ra)}"
                data-metric-run-uuid="${t($a)}">`;
    const Ga = Ye(v.name), Xa = Vr(Br(v.badges), {
      containerClass: "portfolio-badges"
    });
    n += `<td>
        <button type="button"
                class="${La}"
                data-portfolio="${v.uuid}"
                aria-expanded="${Ie ? "true" : "false"}"
                aria-controls="${Dn}">
          <span class="caret">${Ie ? "▼" : "▶"}</span>
          <span class="portfolio-name">${Ga}</span>${Xa}
        </button>
      </td>`;
    const Za = x.toLocaleString("de-DE");
    n += `<td class="align-right">${Za}</td>`, n += `<td class="align-right">${Ma}</td>`, n += `<td class="align-right">${Ha}</td>`, n += `<td class="align-right">${Ia}</td>`, n += `<td class="align-right">${Va}</td>`, n += `<td class="align-right"${Tt}>${za}</td>`, n += `<td class="align-right gain-pct-cell">${qa}</td>`, n += "</tr>", n += `<tr class="portfolio-details${Ie ? "" : " hidden"}"
                data-portfolio="${v.uuid}"
                id="${Dn}"
                role="region"
                aria-label="Positionen für ${v.name}">
      <td colspan="${r.length.toString()}">
        <div class="positions-container">${Ie ? xt(v.uuid) ? Ge(Fr(v.uuid)) : '<div class="loading">Lade Positionen...</div>' : ""}</div>
      </td>
    </tr>`;
  });
  const a = e.filter((v) => typeof v.current_value == "number" && Number.isFinite(v.current_value)), o = e.reduce((v, x) => v + (Number.isFinite(x.position_count) ? x.position_count : 0), 0), i = a.reduce((v, x) => typeof x.current_value == "number" && Number.isFinite(x.current_value) ? v + x.current_value : v, 0), c = a.reduce((v, x) => typeof x.purchase_sum == "number" && Number.isFinite(x.purchase_sum) ? v + x.purchase_sum : v, 0), s = a.map((v) => {
    if (typeof v.day_change_abs == "number")
      return v.day_change_abs;
    const x = v.performance && typeof v.performance == "object" ? v.performance.day_change : null;
    if (x && typeof x == "object") {
      const $ = x.value_change_eur;
      if (typeof $ == "number" && Number.isFinite($))
        return $;
    }
    return null;
  }).filter((v) => typeof v == "number" && Number.isFinite(v)), l = s.reduce((v, x) => v + x, 0), u = a.reduce((v, x) => {
    if (typeof x.performance?.gain_abs == "number" && Number.isFinite(x.performance.gain_abs))
      return v + x.performance.gain_abs;
    const $ = typeof x.current_value == "number" && Number.isFinite(x.current_value) ? x.current_value : 0, j = typeof x.purchase_sum == "number" && Number.isFinite(x.purchase_sum) ? x.purchase_sum : 0;
    return v + ($ - j);
  }, 0), d = a.length > 0, p = a.length !== e.length, f = s.length > 0, g = f && d && i !== 0 ? (() => {
    const v = i - l;
    return v ? l / v * 100 : null;
  })() : null, m = d && c > 0 ? u / c * 100 : null, _ = {
    fx_unavailable: p,
    purchase_value: d ? c : null,
    current_value: d ? i : null,
    day_change_abs: f ? l : null,
    day_change_pct: f ? g : null,
    gain_abs: d ? u : null,
    gain_pct: d ? m : null
  }, h = { hasValue: d }, y = { hasValue: f }, b = L("purchase_value", _.purchase_value, _, h), S = L("current_value", _.current_value, _, h), w = L("day_change_abs", _.day_change_abs, _, y), C = L("day_change_pct", _.day_change_pct, _, y), A = L("gain_abs", _.gain_abs, _, h), N = L("gain_pct", _.gain_pct, _, h);
  let D = "";
  if (d && typeof m == "number" && Number.isFinite(m)) {
    const v = `${re(m)} %`, x = m > 0 ? "positive" : m < 0 ? "negative" : "neutral";
    D = ` data-gain-pct="${t(v)}" data-gain-sign="${t(x)}"`;
  }
  p && (D += ' data-partial="true"');
  const H = String(Math.round(o)), P = d ? String(i) : "", E = d ? String(c) : "", I = f ? String(l) : "", F = f && typeof g == "number" && Number.isFinite(g) ? String(g) : "", T = d ? String(u) : "", Y = d && typeof m == "number" && Number.isFinite(m) ? String(m) : "";
  return n += `<tr class="footer-row"
      data-position-count="${H}"
      data-current-value="${t(P)}"
      data-purchase-sum="${t(E)}"
      data-day-change="${t(I)}"
      data-day-change-pct="${t(F)}"
      data-gain-abs="${t(T)}"
      data-gain-pct="${t(Y)}"
      data-has-value="${d ? "true" : "false"}"
      data-fx-unavailable="${p ? "true" : "false"}">
      <td>Summe</td>
      <td class="align-right">${Math.round(o).toLocaleString("de-DE")}</td>
    <td class="align-right">${b}</td>
    <td class="align-right">${S}</td>
    <td class="align-right">${w}</td>
    <td class="align-right">${C}</td>
    <td class="align-right"${D}>${A}</td>
    <td class="align-right gain-pct-cell">${N}</td>
  </tr>`, n += "</tbody></table>", n;
}
function Ci(e) {
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
function ze(e) {
  if (e === void 0)
    return null;
  const t = Number(e);
  return Number.isFinite(t) ? t : null;
}
function Yr(e) {
  const t = Ci(e);
  if (!t)
    return;
  const n = t.tBodies.item(0);
  if (!n)
    return;
  const r = Array.from(n.querySelectorAll("tr.portfolio-row"));
  if (!r.length)
    return;
  let a = 0, o = 0, i = 0, c = 0, s = 0, l = !1, u = !1, d = !0, p = !1;
  for (const $ of r) {
    const j = ze($.dataset.positionCount);
    j != null && (a += j), $.dataset.fxUnavailable === "true" && (p = !0);
    const k = $.dataset.hasValue;
    if (!!(k === "false" || k === "0" || k === "" || k == null)) {
      d = !1;
      continue;
    }
    l = !0;
    const W = ze($.dataset.currentValue), B = ze($.dataset.gainAbs), G = ze($.dataset.purchaseSum), K = ze($.dataset.dayChange);
    if (W == null || B == null || G == null) {
      d = !1;
      continue;
    }
    o += W, c += B, i += G, K != null && (s += K, u = !0);
  }
  const f = l && d, g = f && i > 0 ? c / i * 100 : null, m = u && f && o !== 0 ? (() => {
    const $ = o - s;
    return $ ? s / $ * 100 : null;
  })() : null;
  let _ = Array.from(n.children).find(
    ($) => $ instanceof HTMLTableRowElement && $.classList.contains("footer-row")
  );
  _ || (_ = document.createElement("tr"), _.classList.add("footer-row"), n.appendChild(_));
  const h = Math.round(a).toLocaleString("de-DE"), y = {
    fx_unavailable: p || !f,
    purchase_value: f ? i : null,
    current_value: f ? o : null,
    day_change_abs: u && f ? s : null,
    day_change_pct: u && f ? m : null,
    gain_abs: f ? c : null,
    gain_pct: f ? g : null
  }, b = { hasValue: f }, S = { hasValue: u && f }, w = L("purchase_value", y.purchase_value, y, b), C = L("current_value", y.current_value, y, b), A = L("day_change_abs", y.day_change_abs, y, S), N = L("day_change_pct", y.day_change_pct, y, S), D = L("gain_abs", y.gain_abs, y, b), H = L("gain_pct", y.gain_pct, y, b), P = t.tHead ? t.tHead.rows.item(0) : null, E = P ? P.cells.length : 0, I = _.cells.length, F = E || I, T = F > 0 ? F <= 5 : !1, Y = f && typeof g == "number" ? `${re(g)} %` : "", v = f && typeof g == "number" ? g > 0 ? "positive" : g < 0 ? "negative" : "neutral" : "neutral";
  T ? _.innerHTML = `
      <td>Summe</td>
      <td class="align-right">${h}</td>
      <td class="align-right">${C}</td>
      <td class="align-right">${D}</td>
      <td class="align-right gain-pct-cell">${H}</td>
    ` : _.innerHTML = `
      <td>Summe</td>
      <td class="align-right">${h}</td>
      <td class="align-right">${w}</td>
      <td class="align-right">${C}</td>
      <td class="align-right">${A}</td>
      <td class="align-right">${N}</td>
      <td class="align-right">${D}</td>
      <td class="align-right">${H}</td>
    `;
  const x = _.cells.item(T ? 3 : 6);
  x && (x.dataset.gainPct = Y || "—", x.dataset.gainSign = v), _.dataset.positionCount = String(Math.round(a)), _.dataset.currentValue = f ? String(o) : "", _.dataset.purchaseSum = f ? String(i) : "", _.dataset.dayChange = f && u ? String(s) : "", _.dataset.dayChangePct = f && u && typeof m == "number" ? String(m) : "", _.dataset.gainAbs = f ? String(c) : "", _.dataset.gainPct = f && typeof g == "number" ? String(g) : "", _.dataset.hasValue = f ? "true" : "false", _.dataset.fxUnavailable = p ? "true" : "false";
}
function Ze(e, t) {
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
  const o = (p, f) => {
    const g = a.querySelector("tbody");
    if (!g) return;
    const m = Array.from(g.querySelectorAll("tr")).filter((b) => !b.classList.contains("footer-row")), _ = g.querySelector("tr.footer-row"), h = (b) => {
      if (b == null) return 0;
      const S = b.replace(/\u00A0/g, " ").replace(/[%€]/g, "").replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, ""), w = Number.parseFloat(S);
      return Number.isFinite(w) ? w : 0;
    };
    m.sort((b, S) => {
      const C = {
        name: 0,
        current_holdings: 1,
        average_price: 2,
        purchase_value: 3,
        current_value: 4,
        day_change_abs: 5,
        day_change_pct: 6,
        gain_abs: 7,
        gain_pct: 8
      }[p], A = b.cells.item(C), N = S.cells.item(C);
      let D = "";
      if (A) {
        const I = A.textContent;
        typeof I == "string" && (D = I.trim());
      }
      let H = "";
      if (N) {
        const I = N.textContent;
        typeof I == "string" && (H = I.trim());
      }
      const P = (I, F) => {
        const T = I ? I.dataset.sortValue : void 0;
        if (T != null && T !== "") {
          const Y = Number(T);
          if (Number.isFinite(Y))
            return Y;
        }
        return h(F);
      };
      let E;
      if (p === "name")
        E = D.localeCompare(H, "de", { sensitivity: "base" });
      else {
        const I = P(A, D), F = P(N, H);
        E = I - F;
      }
      return f === "asc" ? E : -E;
    }), a.querySelectorAll("thead th.sort-active").forEach((b) => {
      b.classList.remove("sort-active", "dir-asc", "dir-desc");
    });
    const y = a.querySelector(`thead th[data-sort-key="${p}"]`);
    y && y.classList.add("sort-active", f === "asc" ? "dir-asc" : "dir-desc"), m.forEach((b) => g.appendChild(b)), _ && g.appendChild(_);
  }, i = r.dataset.sortKey, c = r.dataset.sortDir, s = a.dataset.defaultSort, l = a.dataset.defaultDir, u = Lt(i) ? i : Lt(s) ? s : "name", d = Mt(c) ? c : Mt(l) ? l : "asc";
  o(u, d), a.addEventListener("click", (p) => {
    const f = p.target;
    if (!(f instanceof Element))
      return;
    const g = f.closest("th[data-sort-key]");
    if (!g || !a.contains(g)) return;
    const m = g.getAttribute("data-sort-key");
    if (!Lt(m))
      return;
    let _ = "asc";
    r.dataset.sortKey === m && (_ = (Mt(r.dataset.sortDir) ? r.dataset.sortDir : "asc") === "asc" ? "desc" : "asc"), r.dataset.sortKey = m, r.dataset.sortDir = _, o(m, _);
  });
}
async function Ni(e, t, n) {
  if (!e || !ht || !mt) return;
  const r = t || n.querySelector(
    `.portfolio-details[data-portfolio="${e}"] .positions-container`
  );
  if (!r)
    return;
  const a = r.closest(".portfolio-details");
  if (!(a && a.classList.contains("hidden"))) {
    r.innerHTML = '<div class="loading">Neu laden...</div>';
    try {
      const o = await Nr(
        ht,
        mt,
        e
      );
      if (o.error) {
        const c = typeof o.error == "string" ? o.error : String(o.error);
        r.innerHTML = `<div class="error">${c} <button class="retry-pos" data-portfolio="${e}">Erneut laden</button></div>`;
        return;
      }
      const i = Ft(
        Array.isArray(o.positions) ? o.positions : []
      );
      ft(e, i), pt(e, i), r.innerHTML = Ge(i);
      try {
        Ze(n, e);
      } catch (c) {
        console.warn("attachPortfolioToggleHandler: Sort-Init (Lazy) fehlgeschlagen:", c);
      }
      try {
        Xe(n, e);
      } catch (c) {
        console.warn("reloadPortfolioPositions: Security-Listener konnte nicht gebunden werden:", c);
      }
    } catch (o) {
      const i = o instanceof Error ? o.message : String(o);
      r.innerHTML = `<div class="error">Fehler: ${i} <button class="retry-pos" data-portfolio="${e}">Retry</button></div>`;
    }
  }
}
async function Ei(e, t, n = 3e3, r = 50) {
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
function Sn(e) {
  const n = (typeof e.__ppReaderAttachToken == "number" ? e.__ppReaderAttachToken : 0) + 1;
  e.__ppReaderAttachToken = n, e.__ppReaderAttachInProgress = !0, (async () => {
    try {
      const r = await Ei(e, ".portfolio-table");
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
            const i = o.target;
            if (!(i instanceof Element))
              return;
            const c = i.closest(".retry-pos");
            if (c && r.contains(c)) {
              const f = c.getAttribute("data-portfolio");
              if (f) {
                const m = e.querySelector(
                  `.portfolio-details[data-portfolio="${f}"]`
                )?.querySelector(".positions-container");
                await Ni(f, m ?? null, e);
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
              u.classList.remove("hidden"), s.classList.add("expanded"), s.setAttribute("aria-expanded", "true"), d && (d.textContent = "▼"), yt.add(l);
              try {
                vn(e, l);
              } catch (f) {
                console.warn("attachPortfolioToggleHandler: Pending-Flush fehlgeschlagen:", f);
              }
              if (xt(l)) {
                const f = u.querySelector(".positions-container");
                if (f) {
                  f.innerHTML = Ge(
                    Fr(l)
                  ), Ze(e, l);
                  try {
                    Xe(e, l);
                  } catch (g) {
                    console.warn("attachPortfolioToggleHandler: Security-Listener (Cache) Fehler:", g);
                  }
                }
              } else {
                const f = u.querySelector(".positions-container");
                f && (f.innerHTML = '<div class="loading">Lade Positionen...</div>');
                try {
                  const g = await Nr(
                    ht,
                    mt,
                    l
                  );
                  if (g.error) {
                    const _ = typeof g.error == "string" ? g.error : String(g.error);
                    f && (f.innerHTML = `<div class="error">${_} <button class="retry-pos" data-portfolio="${l}">Erneut laden</button></div>`);
                    return;
                  }
                  const m = Ft(
                    Array.isArray(g.positions) ? g.positions : []
                  );
                  if (ft(l, m), pt(
                    l,
                    m
                  ), f) {
                    f.innerHTML = Ge(m);
                    try {
                      Ze(e, l);
                    } catch (_) {
                      console.warn("attachPortfolioToggleHandler: Sort-Init (Lazy) fehlgeschlagen:", _);
                    }
                    try {
                      Xe(e, l);
                    } catch (_) {
                      console.warn("attachPortfolioToggleHandler: Security-Listener konnte nicht gebunden werden:", _);
                    }
                  }
                } catch (g) {
                  const m = g instanceof Error ? g.message : String(g), _ = u.querySelector(".positions-container");
                  _ && (_.innerHTML = `<div class="error">Fehler beim Laden: ${m} <button class="retry-pos" data-portfolio="${l}">Retry</button></div>`), console.error("Fehler beim Lazy Load für", l, g);
                }
              }
            } else
              u.classList.add("hidden"), s.classList.remove("expanded"), s.setAttribute("aria-expanded", "false"), d && (d.textContent = "▶"), yt.delete(l);
          } catch (i) {
            console.error("attachPortfolioToggleHandler: Ungefangener Fehler im Click-Handler", i);
          }
        })();
      });
    } finally {
      n === e.__ppReaderAttachToken && (e.__ppReaderAttachInProgress = !1);
    }
  })();
}
function xi(e) {
  const t = e.querySelector(".expandable-portfolio-table");
  t && (t.__ppReaderPortfolioFallbackBound || (t.__ppReaderPortfolioFallbackBound = !0, t.addEventListener("click", (n) => {
    const r = n.target;
    !(r instanceof Element) || !r.closest(".portfolio-toggle") || e.querySelector(".portfolio-table")?.__ppReaderPortfolioToggleBound || (console.debug("Fallback-Listener aktiv – re-attach Hauptlistener"), Sn(e));
  })));
}
async function Gr(e, t, n) {
  ht = t ?? null, mt = n ?? null, console.debug(
    "renderDashboard: start – panelConfig:",
    n?.config,
    "derived entry_id?",
    n?.config?._panel_custom?.config?.entry_id
  );
  const r = await so(t, n);
  kr(r.accounts);
  const a = Ir(), o = await lo(t, n);
  Lo(o.portfolios);
  const i = Oo();
  let c = "";
  try {
    c = await co(t, n);
  } catch {
    c = "";
  }
  const s = a.reduce(
    (P, E) => P + (typeof E.balance == "number" && Number.isFinite(E.balance) ? E.balance : 0),
    0
  ), l = i.some((P) => P.fx_unavailable), u = a.some((P) => P.fx_unavailable && (P.balance == null || !Number.isFinite(P.balance))), d = i.reduce((P, E) => E.hasValue && typeof E.current_value == "number" && Number.isFinite(E.current_value) ? P + E.current_value : P, 0), p = s + d, f = "Teilw. fehlende FX-Kurse – Gesamtvermögen abweichend", m = i.some((P) => P.hasValue && typeof P.current_value == "number" && Number.isFinite(P.current_value)) || a.some((P) => typeof P.balance == "number" && Number.isFinite(P.balance)) ? `${re(p)}&nbsp;€` : `<span class="missing-value" role="note" aria-label="${f}" title="${f}">—</span>`, _ = l || u ? `<span class="total-wealth-note">${f}</span>` : "", h = `
    <div class="header-meta-row">
      💰 Gesamtvermögen: <strong class="total-wealth-value">${m}</strong>${_}
    </div>
  `, y = fn("Übersicht", h), b = Kr(i), S = a.filter((P) => (P.currency_code ?? "EUR") === "EUR"), w = a.filter((P) => (P.currency_code ?? "EUR") !== "EUR"), A = w.some((P) => P.fx_unavailable) ? `
        <p class="table-note" role="note">
          <span class="table-note__icon" aria-hidden="true">⚠️</span>
          <span>Wechselkurse konnten nicht geladen werden. EUR-Werte werden derzeit nicht angezeigt.</span>
        </p>
      ` : "", N = `
    <div class="card">
      <h2>Liquidität</h2>
      <div class="scroll-container account-table">
        ${Te(
    S.map((P) => ({
      name: gt(P.name, Kn(P.badges), {
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
    ${w.length ? `
      <div class="card">
        <h2>Fremdwährungen</h2>
        <div class="scroll-container fx-account-table">
          ${Te(
    w.map((P) => {
      const E = P.orig_balance, F = typeof E == "number" && Number.isFinite(E) ? `${E.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}&nbsp;${P.currency_code ?? ""}` : "";
      return {
        name: gt(P.name, Kn(P.badges), {
          containerClass: "account-name",
          labelClass: "account-name__label"
        }),
        fx_display: F,
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
        ${A}
      </div>` : ""}
  `, D = `
    <div class="card footer-card">
      <div class="meta">
        <div class="last-file-update">
          📂 Letzte Aktualisierung der Datei: <strong>${c || "Unbekannt"}</strong>
        </div>
      </div>
    </div>
  `, H = `
    ${y.outerHTML}
    <div class="card">
      <h2>Investment</h2>
      <div class="scroll-container portfolio-table">
        ${b}
      </div>
    </div>
    ${N}
    ${D}
  `;
  return Fi(e, i), H;
}
function Fi(e, t) {
  if (!e)
    return;
  const n = () => {
    try {
      const a = e, o = a.querySelector(".portfolio-table");
      o && o.querySelectorAll(".portfolio-toggle").length === 0 && (console.debug("Recovery: Tabelle ohne Buttons – erneuter Aufbau"), o.innerHTML = Kr(t)), Sn(e), xi(e), yt.forEach((i) => {
        try {
          xt(i) && (Ze(e, i), Xe(e, i));
        } catch (c) {
          console.warn("Init-Sortierung für expandiertes Depot fehlgeschlagen:", i, c);
        }
      });
      try {
        Yr(a);
      } catch (i) {
        console.warn("renderDashboard: Footer-Summe konnte nicht aktualisiert werden:", i);
      }
      try {
        si(e);
      } catch (i) {
        console.warn("renderDashboard: Pending-Positions konnten nicht angewendet werden:", i);
      }
      console.debug("renderDashboard: portfolio-toggle Buttons:", a.querySelectorAll(".portfolio-toggle").length);
    } catch (a) {
      console.error("renderDashboard: Fehler bei Recovery/Listener", a);
    }
  }, r = typeof requestAnimationFrame == "function" ? (a) => requestAnimationFrame(a) : (a) => setTimeout(a, 0);
  r(() => r(n));
}
vo({
  renderPositionsTable: (e) => Pi(e),
  applyGainPctMetadata: jr,
  attachSecurityDetailListener: Xe,
  attachPortfolioPositionsSorting: Ze,
  updatePortfolioFooter: (e) => {
    e && Yr(e);
  }
});
let ye = {
  status: "idle",
  error: null,
  data: null,
  selection: null,
  lastUpdated: null
}, Zn = null;
function Di(e) {
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
function Xt(e) {
  return typeof e != "string" ? null : e.trim() || null;
}
function Ti(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e, n = Xt(t.start), r = Xt(t.end);
  return n && r ? { start: n, end: r } : null;
}
function Jn(e) {
  if (!Array.isArray(e))
    return [];
  const t = e.map((r) => typeof r == "string" ? r.trim() : "").filter((r) => r.length > 0), n = Array.from(new Set(t));
  return n.sort(), n;
}
function ki(e) {
  const t = Xt(e.date ?? null), n = Ti(e.range ?? null);
  if (t && n)
    throw new Error("loadDailyWealth: date und range können nicht gleichzeitig gesetzt werden");
  if (!t && !n)
    throw new Error("loadDailyWealth: entweder date oder range erforderlich");
  const r = e.scopes ?? {}, a = Jn(r.accounts), o = Jn(r.portfolios), i = {};
  t && (i.date = t), n && (i.range = n);
  const c = e.include_slices ?? e.includeSlices ?? void 0, s = e.include_scopes ?? e.includeScopes ?? void 0;
  return c !== void 0 && (i.includeSlices = c), s !== void 0 && (i.includeScopes = s), (a.length || o.length) && (i.scopes = {}, a.length && (i.scopes.accounts = a), o.length && (i.scopes.portfolios = o)), typeof e.limit == "number" && Number.isFinite(e.limit) && e.limit > 0 && (i.limit = e.limit), typeof e.offset == "number" && Number.isFinite(e.offset) && e.offset >= 0 && (i.offset = e.offset), i;
}
function Ri(e) {
  const t = e.date ?? "", n = e.range ? `${e.range.start}..${e.range.end}` : "", r = e.scopes?.accounts ?? [], a = e.scopes?.portfolios ?? [], o = JSON.stringify({ accounts: r, portfolios: a }), i = e.includeSlices ? "1" : "0", c = e.includeScopes ? "1" : "0", s = e.limit ?? "", l = e.offset ?? "";
  return [t, n, o, i, c, s, l].join("::");
}
function $i(e) {
  return { ...e };
}
function Qn(e) {
  return { ...e };
}
function Li(e) {
  if (e)
    return {
      accounts: e.accounts.map(Qn),
      portfolios: e.portfolios.map(Qn)
    };
}
function Mi(e) {
  if (!e)
    return null;
  const t = Li(e.slices);
  return {
    range: { ...e.range },
    records: e.records.map($i),
    ...t ? { slices: t } : {}
  };
}
function Hi(e) {
  if (!e)
    return null;
  const t = {};
  return e.date && (t.date = e.date), e.range && (t.range = { ...e.range }), e.scopes && (t.scopes = {
    ...e.scopes.accounts ? { accounts: [...e.scopes.accounts] } : {},
    ...e.scopes.portfolios ? { portfolios: [...e.scopes.portfolios] } : {}
  }), e.includeSlices !== void 0 && (t.includeSlices = e.includeSlices), e.includeScopes !== void 0 && (t.includeScopes = e.includeScopes), e.limit !== void 0 && (t.limit = e.limit), e.offset !== void 0 && (t.offset = e.offset), t;
}
function Ht(e) {
  ye = {
    ...ye,
    ...e
  };
}
function Zt() {
  return {
    status: ye.status,
    error: ye.error,
    lastUpdated: ye.lastUpdated,
    data: Mi(ye.data),
    selection: Hi(ye.selection)
  };
}
async function Ii(e, t, n = {}) {
  const r = ki(n), a = Ri(r);
  if (ye.data && !n.force && Zn === a)
    return Zt();
  Ht({
    status: "loading",
    error: null,
    selection: r
  });
  try {
    const o = await po(e, t, r);
    Zn = a, Ht({
      status: "loaded",
      error: null,
      data: o,
      selection: r,
      lastUpdated: Date.now()
    });
  } catch (o) {
    Ht({
      status: "error",
      error: Di(o),
      selection: r,
      lastUpdated: Date.now()
    });
  }
  return Zt();
}
const Vi = "http://www.w3.org/2000/svg", Ne = 640, Ee = 260, Ue = { top: 12, right: 16, bottom: 24, left: 16 }, We = "var(--pp-reader-chart-line, #3f51b5)", Jt = "var(--pp-reader-chart-area, rgba(63, 81, 181, 0.12))", er = "0.75rem", Xr = "var(--pp-reader-chart-baseline, rgba(96, 125, 139, 0.75))", Zr = "6 4", zi = 1440 * 60 * 1e3;
function qi(e) {
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
function Ui(e) {
  return typeof e == "string" ? e : typeof e == "number" && Number.isFinite(e) ? e.toString() : e instanceof Date && Number.isFinite(e.getTime()) ? e.toISOString() : "";
}
function Q(e) {
  return `${String(e)}px`;
}
function oe(e, t = {}) {
  const n = document.createElementNS(Vi, e);
  return Object.entries(t).forEach(([r, a]) => {
    const o = qi(a);
    o != null && n.setAttribute(r, o);
  }), n;
}
function _t(e, t = null) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  if (typeof e == "string" && e.trim() !== "") {
    const n = Number.parseFloat(e);
    if (Number.isFinite(n))
      return n;
  }
  return t;
}
function Jr(e, t) {
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
const Qr = (e) => {
  if (e && typeof e == "object" && "date" in e)
    return e.date;
}, ea = (e) => {
  if (e && typeof e == "object" && "close" in e)
    return e.close;
}, ta = (e, t, n) => {
  if (Number.isFinite(e)) {
    const r = new Date(e);
    if (!Number.isNaN(r.getTime()))
      return r.toLocaleDateString("de-DE");
  }
  if (t && typeof t == "object" && "date" in t) {
    const r = t.date, a = Ui(r);
    if (a)
      return a;
  }
  return Number.isFinite(e) ? e.toString() : "";
}, na = (e, t, n) => (Number.isFinite(e) ? e : _t(e, 0) ?? 0).toLocaleString("de-DE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
}), ra = ({ xFormatted: e, yFormatted: t }) => `
    <div class="chart-tooltip-date">${e}</div>
    <div class="chart-tooltip-value">${t}&nbsp;€</div>
  `, aa = ({
  marker: e,
  xFormatted: t,
  yFormatted: n
}) => `
    <div class="chart-tooltip-date">${(typeof e.label == "string" ? e.label : null) || t}</div>
    <div class="chart-tooltip-value">${n}</div>
  `;
function oa(e) {
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
    width: Ne,
    height: Ee,
    margin: { ...Ue },
    series: [],
    points: [],
    range: null,
    xAccessor: Qr,
    yAccessor: ea,
    xFormatter: ta,
    yFormatter: na,
    tooltipRenderer: ra,
    markerTooltipRenderer: aa,
    color: We,
    areaColor: Jt,
    baseline: null,
    handlersAttached: !1,
    markers: [],
    markerPositions: []
  }), e.__chartState;
}
function ne(e, t, n) {
  return !Number.isFinite(e) || e < t ? t : e > n ? n : e;
}
function Wi(e, t) {
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
function Oi(e) {
  if (e.length === 0)
    return "";
  const t = [];
  return e.forEach((n, r) => {
    const a = r === 0 ? "M" : "L", o = n.x.toFixed(2), i = n.y.toFixed(2);
    t.push(`${a}${o} ${i}`);
  }), t.join(" ");
}
function Bi(e) {
  const { baselineLine: t, baseline: n } = e;
  if (!t)
    return;
  const r = n?.color ?? Xr, a = n?.dashArray ?? Zr;
  t.setAttribute("stroke", r), t.setAttribute("stroke-dasharray", a);
}
function It(e) {
  const { baselineLine: t, baseline: n, range: r, margin: a, width: o } = e;
  if (!t)
    return;
  const i = n?.value;
  if (!r || i == null || !Number.isFinite(i)) {
    t.style.opacity = "0";
    return;
  }
  const { minY: c, maxY: s, boundedHeight: l } = r, u = Number.isFinite(c) ? c : i, p = (Number.isFinite(s) ? s : u + 1) - u, f = p === 0 ? 0.5 : (i - u) / p, g = ne(f, 0, 1), m = Math.max(l, 0), _ = a.top + (1 - g) * m, h = Math.max(o - a.left - a.right, 0), y = a.left, b = a.left + h;
  t.setAttribute("x1", y.toFixed(2)), t.setAttribute("x2", b.toFixed(2)), t.setAttribute("y1", _.toFixed(2)), t.setAttribute("y2", _.toFixed(2)), t.style.opacity = "1";
}
function ji(e, t, n) {
  const { width: r, height: a, margin: o } = t, { xAccessor: i, yAccessor: c } = n;
  if (e.length === 0)
    return { points: [], range: null };
  const s = e.map((F, T) => {
    const Y = i(F, T), v = c(F, T), x = Jr(Y, T), $ = _t(v, Number.NaN);
    return Number.isFinite($) ? {
      index: T,
      data: F,
      xValue: x,
      yValue: $
    } : null;
  }).filter((F) => !!F);
  if (s.length === 0)
    return { points: [], range: null };
  const l = s.reduce((F, T) => Math.min(F, T.xValue), s[0].xValue), u = s.reduce((F, T) => Math.max(F, T.xValue), s[0].xValue), d = s.reduce((F, T) => Math.min(F, T.yValue), s[0].yValue), p = s.reduce((F, T) => Math.max(F, T.yValue), s[0].yValue), f = Math.max(r - o.left - o.right, 1), g = Math.max(a - o.top - o.bottom, 1), m = Number.isFinite(l) ? l : 0, _ = Number.isFinite(u) ? u : m + 1, h = Number.isFinite(d) ? d : 0, y = Number.isFinite(p) ? p : h + 1, b = _t(t.baseline?.value, null), S = b != null && Number.isFinite(b) ? Math.min(h, b) : h, w = b != null && Number.isFinite(b) ? Math.max(y, b) : y, C = Math.max(
    2,
    Math.min(
      6,
      Math.round(
        Math.max(a - o.top - o.bottom, 0) / 60
      ) || 4
    )
  ), { niceMin: A, niceMax: N } = Qi(
    S,
    w,
    C
  ), D = Number.isFinite(A) ? A : h, H = Number.isFinite(N) ? N : y, P = _ - m || 1, E = H - D || 1;
  return {
    points: s.map((F) => {
      const T = P === 0 ? 0.5 : (F.xValue - m) / P, Y = E === 0 ? 0.5 : (F.yValue - D) / E, v = o.left + T * f, x = o.top + (1 - Y) * g;
      return {
        ...F,
        x: v,
        y: x
      };
    }),
    range: {
      minX: m,
      maxX: _,
      minY: D,
      maxY: H,
      boundedWidth: f,
      boundedHeight: g
    }
  };
}
function Vt(e) {
  const { markerLayer: t, markerOverlay: n, markers: r, range: a, margin: o, markerTooltip: i } = e;
  if (e.markerPositions = [], lt(e), !t || !n)
    return;
  for (; t.firstChild; )
    t.removeChild(t.firstChild);
  for (; n.firstChild; )
    n.removeChild(n.firstChild);
  if (!a || !Array.isArray(r) || r.length === 0)
    return;
  const c = a.maxX - a.minX || 1, s = a.maxY - a.minY || 1;
  r.forEach((l, u) => {
    const d = Jr(l.x, u), p = _t(l.y, Number.NaN), f = Number(p);
    if (!Number.isFinite(d) || !Number.isFinite(f))
      return;
    const g = c === 0 ? 0.5 : ne((d - a.minX) / c, 0, 1), m = s === 0 ? 0.5 : ne((f - a.minY) / s, 0, 1), _ = o.left + g * a.boundedWidth, h = o.top + (1 - m) * a.boundedHeight, y = oe("g", {
      class: "line-chart-marker",
      transform: `translate(${_.toFixed(2)} ${h.toFixed(2)})`,
      "data-marker-id": l.id
    }), b = oe("circle", {
      r: 5,
      fill: l.color || e.color,
      stroke: "#fff",
      "stroke-width": 2,
      opacity: 0.95
    });
    y.appendChild(b), t.appendChild(y), e.markerPositions.push({
      marker: l,
      x: _,
      y: h
    });
  }), i && (i.style.opacity = "0", i.style.visibility = "hidden");
}
function ia(e, t, n, r) {
  e.width = Number.isFinite(t) ? Number(t) : Ne, e.height = Number.isFinite(n) ? Number(n) : Ee, e.margin = {
    top: Number.isFinite(r?.top) ? Number(r?.top) : Ue.top,
    right: Number.isFinite(r?.right) ? Number(r?.right) : Ue.right,
    bottom: Number.isFinite(r?.bottom) ? Number(r?.bottom) : Ue.bottom,
    left: Number.isFinite(r?.left) ? Number(r?.left) : Ue.left
  };
}
function Ki(e, t) {
  const n = e.xFormatter(t.xValue, t.data, t.index), r = e.yFormatter(t.yValue, t.data, t.index);
  return e.tooltipRenderer({
    point: t,
    xFormatted: n,
    yFormatted: r,
    data: t.data,
    index: t.index
  });
}
function Yi(e, t, n, r = null) {
  const { tooltip: a, width: o, margin: i, height: c } = e;
  if (!a)
    return;
  const s = r && Number.isFinite(r.scaleX) && r.scaleX > 0 ? r.scaleX : 1, l = r && Number.isFinite(r.scaleY) && r.scaleY > 0 ? r.scaleY : 1, u = c - i.bottom;
  a.style.visibility = "visible", a.style.opacity = "1";
  const d = a.offsetWidth || 0, p = a.offsetHeight || 0, f = t.x * s, g = ne(
    f - d / 2,
    i.left * s,
    (o - i.right) * s - d
  ), m = Math.max(u * l - p, 0), _ = 12, y = (Number.isFinite(n) ? ne(n ?? 0, i.top, u) : t.y) * l;
  let b = y - p - _;
  b < i.top * l && (b = y + _), b = ne(b, 0, m);
  const S = Q(Math.round(g)), w = Q(Math.round(b));
  a.style.transform = `translate(${S}, ${w})`;
}
function Qt(e) {
  const { tooltip: t, focusLine: n, focusCircle: r } = e;
  t && (t.style.opacity = "0", t.style.visibility = "hidden"), n && (n.style.opacity = "0"), r && (r.style.opacity = "0");
}
function Gi(e, t) {
  const { marker: n } = t, r = e.xFormatter(t.marker.x, n, -1), a = e.yFormatter(t.marker.y, n, -1);
  return e.markerTooltipRenderer({
    marker: n,
    xFormatted: r,
    yFormatted: a
  });
}
function Xi(e, t, n, r = null) {
  const { markerTooltip: a, width: o, margin: i, height: c, tooltip: s } = e;
  if (!a)
    return;
  const l = r && Number.isFinite(r.scaleX) && r.scaleX > 0 ? r.scaleX : 1, u = r && Number.isFinite(r.scaleY) && r.scaleY > 0 ? r.scaleY : 1, d = c - i.bottom;
  a.style.visibility = "visible", a.style.opacity = "1";
  const p = a.offsetWidth || 0, f = a.offsetHeight || 0, g = t.x * l, m = ne(
    g - p / 2,
    i.left * l,
    (o - i.right) * l - p
  ), _ = Math.max(d * u - f, 0), h = 10, y = s?.getBoundingClientRect(), b = e.svg?.getBoundingClientRect(), S = y && b ? y.top - b.top : null, w = y && b ? y.bottom - b.top : null, A = (Number.isFinite(n) ? ne(n ?? t.y, i.top, d) : t.y) * u;
  let N;
  S != null && w != null ? S <= A ? N = S - f - h : N = w + h : (N = A - f - h, N < i.top * u && (N = A + h)), N = ne(N, 0, _);
  const D = Q(Math.round(m)), H = Q(Math.round(N));
  a.style.transform = `translate(${D}, ${H})`;
}
function lt(e) {
  const { markerTooltip: t } = e;
  t && (t.style.opacity = "0", t.style.visibility = "hidden");
}
function Zi(e, t, n) {
  let a = null, o = 576;
  for (const i of e.markerPositions) {
    const c = i.x - t, s = i.y - n, l = c * c + s * s;
    l <= o && (a = i, o = l);
  }
  return a;
}
function Ji(e, t) {
  if (t.handlersAttached || !t.overlay)
    return;
  const n = (a) => {
    if (t.points.length === 0 || !t.svg) {
      Qt(t), lt(t);
      return;
    }
    const o = t.svg.getBoundingClientRect(), i = t.width || Ne, c = t.height || Ee, s = o.width && Number.isFinite(o.width) && Number.isFinite(i) && i > 0 ? o.width / i : 1, l = o.height && Number.isFinite(o.height) && Number.isFinite(c) && c > 0 ? o.height / c : 1, u = s > 0 ? 1 / s : 1, d = l > 0 ? 1 / l : 1, p = (a.clientX - o.left) * u, f = (a.clientY - o.top) * d, g = {
      scaleX: s,
      scaleY: l
    };
    let m = t.points[0], _ = Math.abs(p - m.x);
    for (let y = 1; y < t.points.length; y += 1) {
      const b = t.points[y], S = Math.abs(p - b.x);
      S < _ && (_ = S, m = b);
    }
    t.focusCircle && (t.focusCircle.setAttribute("cx", m.x.toFixed(2)), t.focusCircle.setAttribute("cy", m.y.toFixed(2)), t.focusCircle.style.opacity = "1"), t.focusLine && (t.focusLine.setAttribute("x1", m.x.toFixed(2)), t.focusLine.setAttribute("x2", m.x.toFixed(2)), t.focusLine.setAttribute("y1", t.margin.top.toFixed(2)), t.focusLine.setAttribute(
      "y2",
      (t.height - t.margin.bottom).toFixed(2)
    ), t.focusLine.style.opacity = "1"), t.tooltip && (t.tooltip.innerHTML = Ki(t, m), Yi(t, m, f, g));
    const h = Zi(t, p, f);
    h && t.markerTooltip ? (t.markerTooltip.innerHTML = Gi(t, h), Xi(t, h, f, g)) : lt(t);
  }, r = () => {
    Qt(t), lt(t);
  };
  t.overlay.addEventListener("pointermove", n), t.overlay.addEventListener("pointerenter", n), t.overlay.addEventListener("pointerleave", r), t.handlersAttached = !0, t.handlePointerMove = n, t.handlePointerLeave = r, e.addEventListener("pointercancel", r);
}
function sa(e, t = {}) {
  const n = document.createElement("div");
  n.className = "line-chart-container", n.dataset.chartType = "line", n.style.position = "relative";
  const r = oe("svg", {
    width: Ne,
    height: Ee,
    viewBox: `0 0 ${String(Ne)} ${String(Ee)}`,
    role: "img",
    "aria-hidden": "true",
    focusable: "false"
  });
  r.classList.add("line-chart-svg");
  const a = oe("path", {
    class: "line-chart-area",
    fill: Jt,
    stroke: "none"
  }), o = oe("line", {
    class: "line-chart-baseline",
    stroke: Xr,
    "stroke-width": 1,
    "stroke-dasharray": Zr,
    opacity: 0
  }), i = oe("path", {
    class: "line-chart-path",
    fill: "none",
    stroke: We,
    "stroke-width": 2,
    "stroke-linecap": "round",
    "stroke-linejoin": "round"
  }), c = oe("line", {
    class: "line-chart-focus-line",
    stroke: We,
    "stroke-width": 1,
    "stroke-dasharray": "4 4",
    opacity: 0
  }), s = oe("circle", {
    class: "line-chart-focus-circle",
    r: 4,
    fill: "#fff",
    stroke: We,
    "stroke-width": 2,
    opacity: 0
  }), l = oe("g", {
    class: "line-chart-markers"
  }), u = oe("rect", {
    class: "line-chart-overlay",
    fill: "transparent",
    x: 0,
    y: 0,
    width: Ne,
    height: Ee
  });
  r.appendChild(a), r.appendChild(o), r.appendChild(i), r.appendChild(c), r.appendChild(s), r.appendChild(l), r.appendChild(u), n.appendChild(r);
  const d = document.createElement("div");
  d.className = "chart-tooltip", d.style.position = "absolute", d.style.top = "0", d.style.left = "0", d.style.pointerEvents = "none", d.style.opacity = "0", d.style.visibility = "hidden", n.appendChild(d);
  const p = document.createElement("div");
  p.className = "line-chart-marker-overlay", p.style.position = "absolute", p.style.top = "0", p.style.left = "0", p.style.width = "100%", p.style.height = "100%", p.style.pointerEvents = "none", p.style.overflow = "visible", p.style.zIndex = "2", n.appendChild(p);
  const f = document.createElement("div");
  f.className = "chart-tooltip chart-tooltip--marker", f.style.position = "absolute", f.style.top = "0", f.style.left = "0", f.style.pointerEvents = "none", f.style.opacity = "0", f.style.visibility = "hidden", n.appendChild(f), e.appendChild(n);
  const g = oa(n);
  if (g.svg = r, g.areaPath = a, g.linePath = i, g.baselineLine = o, g.focusLine = c, g.focusCircle = s, g.overlay = u, g.tooltip = d, g.markerOverlay = p, g.markerLayer = l, g.markerTooltip = f, g.xAccessor = t.xAccessor ?? Qr, g.yAccessor = t.yAccessor ?? ea, g.xFormatter = t.xFormatter ?? ta, g.yFormatter = t.yFormatter ?? na, g.tooltipRenderer = t.tooltipRenderer ?? ra, g.markerTooltipRenderer = t.markerTooltipRenderer ?? aa, g.color = t.color ?? We, g.areaColor = t.areaColor ?? Jt, g.baseline = t.baseline ?? null, g.handlersAttached = !1, g.markers = Array.isArray(t.markers) ? t.markers.slice() : [], !g.xAxis) {
    const m = document.createElement("div");
    m.className = "line-chart-axis line-chart-axis-x", m.style.position = "absolute", m.style.left = "0", m.style.right = "0", m.style.bottom = "0", m.style.pointerEvents = "none", m.style.fontSize = er, m.style.color = "var(--secondary-text-color)", m.style.display = "block", n.appendChild(m), g.xAxis = m;
  }
  if (!g.yAxis) {
    const m = document.createElement("div");
    m.className = "line-chart-axis line-chart-axis-y", m.style.position = "absolute", m.style.top = "0", m.style.bottom = "0", m.style.left = "0", m.style.pointerEvents = "none", m.style.fontSize = er, m.style.color = "var(--secondary-text-color)", m.style.display = "block", n.appendChild(m), g.yAxis = m;
  }
  return ia(g, t.width, t.height, t.margin), i.setAttribute("stroke", g.color), c.setAttribute("stroke", g.color), s.setAttribute("stroke", g.color), a.setAttribute("fill", g.areaColor), wn(n, t), Ji(n, g), n;
}
function wn(e, t = {}) {
  if (!e) {
    console.error("updateLineChart: container element is required");
    return;
  }
  const n = oa(e);
  if (!n.svg || !n.linePath || !n.overlay) {
    console.error("updateLineChart: chart was not initialised with renderLineChart");
    return;
  }
  t.xAccessor && (n.xAccessor = t.xAccessor), t.yAccessor && (n.yAccessor = t.yAccessor), t.xFormatter && (n.xFormatter = t.xFormatter), t.yFormatter && (n.yFormatter = t.yFormatter), t.tooltipRenderer && (n.tooltipRenderer = t.tooltipRenderer), t.markerTooltipRenderer && (n.markerTooltipRenderer = t.markerTooltipRenderer), t.color && (n.color = t.color, n.linePath.setAttribute("stroke", n.color), n.focusLine && n.focusLine.setAttribute("stroke", n.color), n.focusCircle && n.focusCircle.setAttribute("stroke", n.color)), t.areaColor && (n.areaColor = t.areaColor, n.areaPath && n.areaPath.setAttribute("fill", n.areaColor)), Object.prototype.hasOwnProperty.call(t, "baseline") && (n.baseline = t.baseline ?? null), Array.isArray(t.markers) && (n.markers = t.markers.slice()), Bi(n), ia(n, t.width, t.height, t.margin);
  const { width: r, height: a } = n;
  n.svg.setAttribute("width", String(r)), n.svg.setAttribute("height", String(a)), n.svg.setAttribute("viewBox", `0 0 ${String(r)} ${String(a)}`), n.overlay.setAttribute("x", "0"), n.overlay.setAttribute("y", "0"), n.overlay.setAttribute("width", Math.max(r, 0).toFixed(2)), n.overlay.setAttribute("height", Math.max(a, 0).toFixed(2)), Array.isArray(t.series) && (n.series = Array.from(t.series));
  const { points: o, range: i } = ji(n.series, n, {
    xAccessor: n.xAccessor,
    yAccessor: n.yAccessor
  });
  if (n.points = o, n.range = i, o.length === 0) {
    n.linePath.setAttribute("d", ""), n.areaPath && n.areaPath.setAttribute("d", ""), Qt(n), Vt(n), zt(n), It(n);
    return;
  }
  if (o.length === 1) {
    const s = o[0], l = Math.max(
      0.5,
      Math.min(4, Math.max(n.width - n.margin.left - n.margin.right, 1) * 0.01)
    ), u = `M${s.x.toFixed(2)} ${s.y.toFixed(2)} h${l.toFixed(2)}`;
    n.linePath.setAttribute("d", u), n.areaPath && n.areaPath.setAttribute("d", ""), n.focusCircle && (n.focusCircle.setAttribute("cx", s.x.toFixed(2)), n.focusCircle.setAttribute("cy", s.y.toFixed(2)), n.focusCircle.style.opacity = "1"), n.focusLine && (n.focusLine.style.opacity = "0"), zt(n), It(n), Vt(n);
    return;
  }
  const c = Oi(o);
  if (n.linePath.setAttribute("d", c), n.areaPath && i) {
    const s = n.margin.top + i.boundedHeight, l = Wi(o, s);
    n.areaPath.setAttribute("d", l);
  }
  zt(n), It(n), Vt(n);
}
function zt(e) {
  const { xAxis: t, yAxis: n, range: r, margin: a, height: o, yFormatter: i } = e;
  if (!t || !n)
    return;
  if (!r) {
    t.innerHTML = "", n.innerHTML = "";
    return;
  }
  const { minX: c, maxX: s, minY: l, maxY: u, boundedWidth: d, boundedHeight: p } = r, f = Number.isFinite(c) && Number.isFinite(s) && s >= c, g = Number.isFinite(l) && Number.isFinite(u) && u >= l, m = Math.max(d, 0), _ = Math.max(p, 0);
  if (t.style.left = Q(a.left), t.style.width = Q(m), t.style.top = Q(o - a.bottom + 6), t.innerHTML = "", f && m > 0) {
    const y = (s - c) / zi, b = Math.max(2, Math.min(6, Math.round(m / 140) || 4));
    es(e, c, s, b, y).forEach(({ positionRatio: w, label: C }) => {
      const A = document.createElement("div");
      A.className = "line-chart-axis-tick line-chart-axis-tick-x", A.style.position = "absolute", A.style.bottom = "0";
      const N = ne(w, 0, 1);
      A.style.left = Q(N * m);
      let D = "-50%", H = "center";
      N <= 1e-3 ? (D = "0", H = "left", A.style.marginLeft = "2px") : N >= 0.999 && (D = "-100%", H = "right", A.style.marginRight = "2px"), A.style.transform = `translateX(${D})`, A.style.textAlign = H, A.textContent = C, t.appendChild(A);
    });
  }
  n.style.top = Q(a.top), n.style.height = Q(_);
  const h = Math.max(a.left - 6, 0);
  if (n.style.left = "0", n.style.width = Q(Math.max(h, 0)), n.innerHTML = "", g && _ > 0) {
    const y = Math.max(2, Math.min(6, Math.round(_ / 60) || 4)), b = ts(l, u, y), S = i;
    b.forEach(({ value: w, positionRatio: C }) => {
      const A = document.createElement("div");
      A.className = "line-chart-axis-tick line-chart-axis-tick-y", A.style.position = "absolute", A.style.left = "0";
      const D = (1 - ne(C, 0, 1)) * _;
      A.style.top = Q(D), A.textContent = S(w, null, -1), n.appendChild(A);
    });
  }
}
function Qi(e, t, n = 4) {
  if (!Number.isFinite(e) || !Number.isFinite(t))
    return {
      niceMin: e,
      niceMax: t
    };
  const r = Math.max(2, n);
  if (t === e) {
    const l = en(Math.abs(e) || 1);
    return {
      niceMin: e - l,
      niceMax: t + l
    };
  }
  const o = (t - e) / (r - 1), i = en(o), c = Math.floor(e / i) * i, s = Math.ceil(t / i) * i;
  return c === s ? {
    niceMin: e,
    niceMax: t + i
  } : {
    niceMin: c,
    niceMax: s
  };
}
function es(e, t, n, r, a) {
  if (!Number.isFinite(t) || !Number.isFinite(n) || n < t)
    return [];
  if (!Number.isFinite(a) || a <= 0)
    return [
      {
        positionRatio: 0.5,
        label: tr(e, t, a || 0)
      }
    ];
  const o = Math.max(2, r), i = [], c = n - t;
  for (let s = 0; s < o; s += 1) {
    const l = o === 1 ? 0.5 : s / (o - 1), u = t + l * c;
    i.push({
      positionRatio: l,
      label: tr(e, u, a)
    });
  }
  return i;
}
function tr(e, t, n) {
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
function ts(e, t, n) {
  if (!Number.isFinite(e) || !Number.isFinite(t))
    return [];
  if (t === e)
    return [
      {
        value: e,
        positionRatio: 0.5
      }
    ];
  const r = t - e, a = Math.max(2, n), o = r / (a - 1), i = en(o), c = Math.floor(e / i) * i, s = Math.ceil(t / i) * i, l = [];
  for (let u = c; u <= s + i / 2; u += i) {
    const d = (u - e) / (t - e);
    l.push({
      value: u,
      positionRatio: ne(d, 0, 1)
    });
  }
  return l.length > a + 2 ? l.filter((u, d) => d % 2 === 0) : l;
}
function en(e) {
  if (!Number.isFinite(e) || e === 0)
    return 1;
  const t = Math.floor(Math.log10(Math.abs(e))), n = Math.abs(e) / 10 ** t;
  let r;
  return n <= 1 ? r = 1 : n <= 2 ? r = 2 : n <= 5 ? r = 5 : r = 10, r * 10 ** t;
}
const ns = 30;
let ca = null, tn = "range", nn = null;
const de = /* @__PURE__ */ new Set();
let tt = null;
const rs = [
  "#1976d2",
  "#c2185b",
  "#7b1fa2",
  "#00796b",
  "#ef6c00",
  "#5d4037",
  "#512da8",
  "#0097a7"
];
function nr(e) {
  const t = e.getUTCFullYear(), n = String(e.getUTCMonth() + 1).padStart(2, "0"), r = String(e.getUTCDate()).padStart(2, "0");
  return `${String(t)}-${n}-${r}`;
}
function as() {
  const e = /* @__PURE__ */ new Date(), t = new Date(e);
  return t.setUTCDate(e.getUTCDate() - (ns - 1)), {
    range: {
      start: nr(t),
      end: nr(e)
    },
    includeSlices: !0,
    includeScopes: !0
  };
}
function la(e) {
  if (!e.length)
    return "";
  const t = e.some((o) => o.fx_coverage_ratio != null && o.fx_coverage_ratio < 1), n = e.some((o) => o.price_coverage_ratio != null && o.price_coverage_ratio < 1), r = e.some((o) => o.stale_price), a = [];
  return t && a.push('<span class="meta-badge meta-badge--warning" title="Wechselkurse fehlen teilweise">FX-Abdeckung</span>'), n && a.push('<span class="meta-badge meta-badge--warning" title="Preisdaten unvollständig">Preisabdeckung</span>'), r && a.push('<span class="meta-badge meta-badge--neutral" title="Letzte Kurse sind veraltet">Stale Kurse</span>'), a.length ? `<span class="meta-badges">${a.join("")}</span>` : '<span class="meta-badge meta-badge--positive">Volle Abdeckung</span>';
}
function Pn(e) {
  return `${re(e)}&nbsp;€`;
}
function Z(e, t) {
  return e.reduce((n, r) => {
    const a = r[t];
    return typeof a == "number" && Number.isFinite(a) ? n + a : n;
  }, 0);
}
function nt(e, t, n = "") {
  const r = e.querySelector("#analyse-status");
  r && (r.dataset.state = t, t === "loading" ? r.textContent = "Lade Vermögensdaten …" : t === "error" ? r.textContent = n || "Daten konnten nicht geladen werden." : r.textContent = "");
}
function rr(e, t, n) {
  const r = e.querySelector("#analyse-total-wealth"), a = e.querySelector("#analyse-coverage"), o = e.querySelector("#analyse-selection-label");
  if (!r || !a || !o)
    return;
  if (o.textContent = t, !n.length) {
    r.innerHTML = "—", a.innerHTML = "";
    return;
  }
  const i = n[n.length - 1];
  r.innerHTML = Pn(i.total_wealth_eur), a.innerHTML = la(n);
}
function ar(e, t) {
  const n = {
    dividends: Z(t, "dividends_eur"),
    interest: Z(t, "interest_eur"),
    inbound: Z(t, "inbound_transfers_eur"),
    outbound: Z(t, "outbound_transfers_eur"),
    fees: Z(t, "fees_eur"),
    taxes: Z(t, "taxes_eur")
  }, r = (a, o) => {
    const i = e.querySelector(`#${a}`);
    i && (i.innerHTML = Pn(o));
  };
  r("cashflow-dividends", n.dividends), r("cashflow-interest", n.interest), r("cashflow-inbound", n.inbound), r("cashflow-outbound", -Math.abs(n.outbound)), r("cashflow-fees", -Math.abs(n.fees)), r("cashflow-taxes", -Math.abs(n.taxes));
}
function qt(e, t = 200) {
  tt != null && window.clearTimeout(tt), tt = window.setTimeout(() => {
    tt = null, e();
  }, t);
}
function An(e, t) {
  return !e || !t ? null : `${e}:${t}`;
}
function os(e) {
  if (!e) {
    de.clear();
    return;
  }
  const t = /* @__PURE__ */ new Set(), n = (r, a) => {
    r.forEach((o) => {
      const i = An(a, o.scope_id);
      i && t.add(i);
    });
  };
  n(e.accounts, "account"), n(e.portfolios, "portfolio"), de.size === 0 ? t.forEach((r) => de.add(r)) : Array.from(de).forEach((r) => {
    t.has(r) || de.delete(r);
  });
}
function is(e, t) {
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
    if (!s.length)
      return "";
    const u = s.map((d) => {
      const p = An(l, d.scope_id);
      if (!p)
        return "";
      const f = de.has(p) ? "checked" : "", g = d.scope_name ?? d.scope_id;
      return `
          <label class="scope-option">
            <input type="checkbox" data-scope-key="${p}" ${f}>
            <span>${g}</span>
          </label>
        `;
    }).join("");
    return `<div class="scope-group"><div class="scope-title">${c}</div>${u}</div>`;
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
    s.checked ? de.add(l) : de.delete(l);
    const u = e.closest("#analyse-chart-card");
    u && nn && ua(u, nn);
  });
}
function ss(e) {
  if (typeof e == "number")
    return Number.isFinite(e) ? e : null;
  const t = Date.parse(e);
  return Number.isFinite(t) ? t : null;
}
function cs(e) {
  const t = Array.from(rs), n = {
    key: "total",
    label: "Gesamtvermögen",
    color: "#2c3e50",
    points: e.records.map((i) => ({
      date: i.date,
      value: i.total_wealth_eur
    }))
  }, r = [], a = /* @__PURE__ */ new Map(), o = (i, c) => {
    i.forEach((s) => {
      const l = An(c, s.scope_id);
      l && (a.has(l) || a.set(l, /* @__PURE__ */ new Map()), a.get(l)?.set(s.date, s));
    });
  };
  return e.slices && (o(e.slices.accounts, "account"), o(e.slices.portfolios, "portfolio")), a.forEach((i, c) => {
    if (!de.has(c))
      return;
    const s = t.shift() ?? "#607d8b", l = c.startsWith("account:"), u = c.split(":")[1] ?? "", p = `${l ? "Konto" : "Depot"} ${u}`.trim(), f = i.values().next(), m = (f.done ? void 0 : f.value)?.scope_name ?? p;
    r.push({
      key: c,
      label: m,
      color: s,
      points: e.records.map((_) => {
        const h = i.get(_.date);
        return !h || !Number.isFinite(h.total_wealth_eur) ? null : { date: _.date, value: h.total_wealth_eur };
      }).filter((_) => !!_)
    });
  }), [n, ...r];
}
function ls(e, t) {
  const n = e.__chartState, r = e.querySelector("svg");
  if (!n || !n.range || !n.margin || !r)
    return;
  const { range: a, margin: o } = n;
  r.querySelectorAll(".analyse-slice-series").forEach((i) => {
    i.remove();
  }), t.filter((i) => i.key !== "total").forEach((i) => {
    const c = i.points.map((u, d) => {
      const p = ss(u.date);
      if (p == null || !Number.isFinite(u.value))
        return null;
      const f = a.maxX === a.minX ? 0.5 : (p - a.minX) / (a.maxX - a.minX), g = a.maxY === a.minY ? 0.5 : (u.value - a.minY) / (a.maxY - a.minY), m = o.left + f * a.boundedWidth, _ = o.top + (1 - g) * a.boundedHeight;
      return `${d === 0 ? "M" : "L"}${String(m)},${String(_)}`;
    }).filter(Boolean).join(" ");
    if (!c)
      return;
    const s = document.createElementNS("http://www.w3.org/2000/svg", "g");
    s.setAttribute("class", "analyse-slice-series");
    const l = document.createElementNS("http://www.w3.org/2000/svg", "path");
    l.setAttribute("d", c), l.setAttribute("fill", "none"), l.setAttribute("stroke", i.color), l.setAttribute("stroke-width", "2"), l.setAttribute("stroke-linejoin", "round"), l.setAttribute("stroke-linecap", "round"), s.appendChild(l), r.appendChild(s);
  });
}
function ua(e, t) {
  const n = e.querySelector(".line-chart-container");
  if (!n)
    return;
  const r = cs(t), a = r[0];
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
    yFormatter: (s) => re(s),
    color: a.color,
    areaColor: "rgba(44, 62, 80, 0.12)"
  }, i = n;
  let c = i;
  !i.__chartState || !n.querySelector("svg") ? (n.innerHTML = "", c = sa(n, o)) : (wn(i, o), c = i), c && ls(c, r);
}
function us(e) {
  if (!e.length)
    return null;
  const t = e[0]?.total_wealth_eur ?? 0, n = e[e.length - 1]?.total_wealth_eur ?? 0, r = Z(e, "dividends_eur") + Z(e, "interest_eur"), a = -Math.abs(Z(e, "fees_eur")), o = -Math.abs(Z(e, "taxes_eur")), i = Z(e, "inbound_transfers_eur") - Z(e, "outbound_transfers_eur"), c = Z(e, "performance_neutral_movements"), s = n - t - r - a - o - i - c;
  return {
    startValue: t,
    endValue: n,
    marketGain: s,
    ertraege: r,
    fees: a,
    taxes: o,
    netTransfers: i,
    neutral: c
  };
}
function Ut(e, t, n) {
  const r = e.querySelector("#perf-selection-label"), a = e.querySelector("#perf-coverage"), o = e.querySelector("#perf-note");
  if (r && (r.textContent = t), a && (a.innerHTML = la(n)), !n.length) {
    o && (o.textContent = "Keine Daten für den gewählten Zeitraum."), ["startValue", "endValue", "marketGain", "ertraege", "fees", "taxes", "netTransfers", "neutral"].forEach((s) => {
      const l = e.querySelector(`#perf-${s}`);
      l && (l.innerHTML = "—");
    });
    return;
  }
  o && (o.textContent = "");
  const i = us(n);
  if (!i)
    return;
  const c = (s, l) => {
    const u = e.querySelector(`#perf-${s}`);
    u && (u.innerHTML = Pn(l));
  };
  c("startValue", i.startValue), c("endValue", i.endValue), c("marketGain", i.marketGain), c("ertraege", i.ertraege), c("fees", i.fees), c("taxes", i.taxes), c("netTransfers", i.netTransfers), c("neutral", i.neutral);
}
function rt(e) {
  const n = e.querySelector('input[name="analyse-range-mode"]:checked')?.value === "date" ? "date" : "range";
  tn = n;
  const r = e.querySelector("#analyse-date-single"), a = e.querySelector("#analyse-date-start"), o = e.querySelector("#analyse-date-end"), i = (l) => {
    if (!l)
      return null;
    const u = l.trim();
    return u.length === 10 ? u : null;
  };
  if (n === "date") {
    const l = i(r?.value);
    return l ? { date: l, includeSlices: !0, includeScopes: !0 } : null;
  }
  const c = i(a?.value), s = i(o?.value);
  return !c || !s ? null : c > s ? { range: { start: s, end: c }, includeSlices: !0, includeScopes: !0 } : { range: { start: c, end: s }, includeSlices: !0, includeScopes: !0 };
}
function at(e, t) {
  const n = t.date ? "date" : "range", r = e.querySelector('input[name="analyse-range-mode"][value="date"]'), a = e.querySelector('input[name="analyse-range-mode"][value="range"]');
  r && a && (r.checked = n === "date", a.checked = n === "range");
  const o = e.querySelector("#analyse-date-single"), i = e.querySelector("#analyse-date-start"), c = e.querySelector("#analyse-date-end");
  o && t.date && (o.value = t.date), i && c && t.range && (i.value = t.range.start, c.value = t.range.end);
  const s = e.querySelector(".analyse-range-fields"), l = e.querySelector(".analyse-single-field");
  s && l && (n === "date" ? (s.style.display = "none", l.style.display = "") : (s.style.display = "", l.style.display = "none"));
}
function qe(e) {
  return e.date ? `Tag: ${e.date}` : e.range ? `Zeitraum: ${e.range.start} – ${e.range.end}` : "";
}
async function ot(e, t, n, r, a, o) {
  nt(e, "loading");
  const i = await Ii(r, a, o);
  if (i.status === "error") {
    if (nt(e, "error", i.error ?? void 0), t && Ut(t, qe(o), []), n) {
      const s = n.querySelector(".line-chart-container");
      s && s.replaceChildren();
    }
    return;
  }
  const c = i.data;
  if (!c || !Array.isArray(c.records) || c.records.length === 0) {
    if (rr(e, qe(o), []), ar(e, []), nt(e, "loaded", "Keine Daten für den gewählten Zeitraum."), t && Ut(t, qe(o), []), n) {
      const s = n.querySelector(".line-chart-container");
      s && s.replaceChildren();
    }
    return;
  }
  ca = o, nn = c, os(c.slices), rr(e, qe(o), c.records), ar(e, c.records), t && Ut(t, qe(o), c.records), n && (is(n, c.slices), ua(n, c)), nt(e, "loaded");
}
function ds(e, t, n, r, a) {
  const o = e.querySelector("#analyse-range-apply"), i = e.querySelectorAll('input[name="analyse-range-mode"]'), c = ca ?? Zt().selection ?? as();
  at(e, c);
  const s = () => {
    const u = rt(e);
    u && at(e, u);
  };
  i.forEach((u) => {
    u.addEventListener("change", () => {
      s();
      const d = rt(e);
      d && qt(() => {
        at(e, d), ot(e, t, n, r, a, d);
      });
    });
  }), o && o.addEventListener("click", () => {
    const u = rt(e) ?? c;
    at(e, u), qt(() => {
      ot(e, t, n, r, a, u);
    });
  }), e.querySelectorAll('input[type="date"]').forEach((u) => {
    u.addEventListener("change", () => {
      const d = rt(e);
      d && qt(() => {
        ot(e, t, n, r, a, d);
      });
    });
  }), ot(e, t, n, r, a, c);
}
function fs(e, t, n) {
  const a = fn("Analyse", `
    <div class="header-meta-row">
      <span>Vermögensverlauf &amp; Cashflows (Backdating)</span>
    </div>
  `), o = `
    <div class="card" id="analyse-range-card" data-section="range">
      <h2>Zeitraum &amp; Kennzahlen</h2>
      <div class="analyse-range-form" role="group" aria-label="Zeitraum wählen">
        <div class="analyse-mode-toggle">
          <label><input type="radio" name="analyse-range-mode" value="range" ${tn === "range" ? "checked" : ""}> Zeitraum</label>
          <label><input type="radio" name="analyse-range-mode" value="date" ${tn === "date" ? "checked" : ""}> Ein Tag</label>
        </div>
        <div class="analyse-range-fields">
          <label for="analyse-date-start">Start</label>
          <input type="date" id="analyse-date-start" aria-label="Startdatum">
          <label for="analyse-date-end">Ende</label>
          <input type="date" id="analyse-date-end" aria-label="Enddatum">
        </div>
        <div class="analyse-single-field" style="display: none;">
          <label for="analyse-date-single">Datum</label>
          <input type="date" id="analyse-date-single" aria-label="Datum">
        </div>
        <button type="button" id="analyse-range-apply" aria-label="Auswahl übernehmen">Übernehmen</button>
      </div>
      <div class="analyse-headline">
        <div class="headline-value" id="analyse-total-wealth">—</div>
        <div class="headline-meta">
          <span id="analyse-selection-label" class="selection-label"></span>
          <span id="analyse-coverage" class="coverage"></span>
        </div>
      </div>
      <div class="analyse-cashflows">
        <div class="cashflow-row"><span>Dividenden</span><span id="cashflow-dividends" class="value">—</span></div>
        <div class="cashflow-row"><span>Zinsen</span><span id="cashflow-interest" class="value">—</span></div>
        <div class="cashflow-row"><span>Eingänge</span><span id="cashflow-inbound" class="value">—</span></div>
        <div class="cashflow-row"><span>Ausgänge</span><span id="cashflow-outbound" class="value">—</span></div>
        <div class="cashflow-row"><span>Gebühren</span><span id="cashflow-fees" class="value">—</span></div>
        <div class="cashflow-row"><span>Steuern</span><span id="cashflow-taxes" class="value">—</span></div>
      </div>
      <div class="analyse-status" id="analyse-status" data-state="idle" role="status" aria-live="polite"></div>
    </div>
  `, s = `
    ${a.outerHTML}
    ${o}
    
    <div class="card" id="analyse-performance-card" data-section="performance">
      <h2>Performance</h2>
      <div class="performance-meta">
        <span id="perf-selection-label" class="selection-label"></span>
        <span id="perf-coverage" class="coverage"></span>
      </div>
      <div class="performance-grid">
        <div class="perf-row"><span>Startwert</span><span id="perf-startValue" class="value">—</span></div>
        <div class="perf-row"><span>Endwert</span><span id="perf-endValue" class="value">—</span></div>
        <div class="perf-row"><span>Markt/FX-Gewinn (Rest)</span><span id="perf-marketGain" class="value">—</span></div>
        <div class="perf-row"><span>Erträge (Div + Zins)</span><span id="perf-ertraege" class="value">—</span></div>
        <div class="perf-row"><span>Gebühren</span><span id="perf-fees" class="value">—</span></div>
        <div class="perf-row"><span>Steuern</span><span id="perf-taxes" class="value">—</span></div>
        <div class="perf-row"><span>Netto-Transfers</span><span id="perf-netTransfers" class="value">—</span></div>
        <div class="perf-row"><span>Performance-neutral</span><span id="perf-neutral" class="value">—</span></div>
      </div>
      <div class="table-note" role="note" id="perf-note" aria-live="polite"></div>
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
    const l = e.querySelector("#analyse-range-card"), u = e.querySelector("#analyse-performance-card"), d = e.querySelector("#analyse-chart-card");
    l && ds(l, u, d, t, n);
  }, 0), s;
}
function ps(e) {
  return Array.isArray(e) && e.every((t) => typeof t == "string");
}
function gs(e) {
  return typeof e == "object" && e !== null;
}
function hs(e) {
  if (!gs(e))
    return !1;
  const t = e;
  return typeof t.portfolioUuid != "string" ? !1 : ps(t.securityUuids);
}
function ms(e) {
  return e instanceof CustomEvent ? hs(e.detail) : !1;
}
const Wt = { min: 0, max: 6 }, bt = { min: 2, max: 4 }, ys = "1Y", da = [
  "1M",
  "6M",
  "1Y",
  "5Y",
  "ALL"
], _s = {
  "1M": 30,
  "6M": 182,
  "1Y": 365,
  "5Y": 1826,
  ALL: Number.POSITIVE_INFINITY
}, bs = /* @__PURE__ */ new Set([0, 2]), vs = /* @__PURE__ */ new Set([1, 3]), Ss = "var(--pp-reader-chart-marker-buy, #2e7d32)", ws = "var(--pp-reader-chart-marker-sell, #c0392b)", or = "{TICKER}", Ps = "https://chatgpt.com/", Ot = {
  aggregation: "Aggregationsdaten",
  totals: "Kaufsummen",
  eur_total: "EUR-Kaufsumme"
}, xe = /* @__PURE__ */ new Map(), ut = /* @__PURE__ */ new Map(), Je = /* @__PURE__ */ new Map(), Fe = /* @__PURE__ */ new Map(), fa = "pp-reader:portfolio-positions-updated", Be = /* @__PURE__ */ new Map();
function As(e) {
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
function Cs(e, t) {
  if (e) {
    if (t) {
      Je.set(e, t);
      return;
    }
    Je.delete(e);
  }
}
function Ns(e) {
  if (!e || typeof window > "u")
    return null;
  if (Je.has(e)) {
    const t = Je.get(e) || null;
    if (t)
      return t;
  }
  return null;
}
function pa(e) {
  return xe.has(e) || xe.set(e, /* @__PURE__ */ new Map()), xe.get(e);
}
function ga(e) {
  return Fe.has(e) || Fe.set(e, /* @__PURE__ */ new Map()), Fe.get(e);
}
function ha(e) {
  if (e) {
    if (xe.has(e)) {
      try {
        const t = xe.get(e);
        t && t.clear();
      } catch (t) {
        console.warn("invalidateHistoryCache: Konnte Cache nicht leeren", e, t);
      }
      xe.delete(e);
    }
    if (Fe.has(e)) {
      try {
        Fe.get(e)?.clear();
      } catch (t) {
        console.warn("invalidateHistoryCache: Konnte Marker-Cache nicht leeren", e, t);
      }
      Fe.delete(e);
    }
  }
}
function ma(e) {
  e && Je.delete(e);
}
function Es(e, t) {
  if (!e || !t)
    return;
  const n = t.securityUuids;
  (Array.isArray(n) ? n : []).includes(e) && (ha(e), ma(e));
}
function xs(e) {
  if (!e || Be.has(e))
    return;
  const t = (n) => {
    ms(n) && Es(e, n.detail);
  };
  try {
    window.addEventListener(fa, t), Be.set(e, t);
  } catch (n) {
    console.error("ensureLiveUpdateSubscription: Registrierung fehlgeschlagen", n);
  }
}
function Fs(e) {
  if (!e || !Be.has(e))
    return;
  const t = Be.get(e);
  try {
    t && window.removeEventListener(fa, t);
  } catch (n) {
    console.error("removeLiveUpdateSubscription: Entfernen des Listeners fehlgeschlagen", n);
  }
  Be.delete(e);
}
function Ds(e) {
  e && (Fs(e), ha(e), ma(e));
}
function ir(e, t) {
  if (!ut.has(e)) {
    ut.set(e, { activeRange: t });
    return;
  }
  const n = ut.get(e);
  n && (n.activeRange = t);
}
function ya(e) {
  return ut.get(e)?.activeRange ?? ys;
}
function rn(e) {
  const t = Date.UTC(
    e.getUTCFullYear(),
    e.getUTCMonth(),
    e.getUTCDate()
  );
  return Math.floor(t / 864e5);
}
function Re(e) {
  const t = new Date(e.getTime());
  return t.setUTCHours(0, 0, 0, 0), t;
}
function sr(e) {
  return !(e instanceof Date) || Number.isNaN(e.getTime()) ? null : rn(Re(e));
}
function M(e) {
  return fe(e);
}
function _a(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t || null;
}
function Pe(e) {
  const t = _a(e);
  return t ? t.toUpperCase() : null;
}
function Ts(e) {
  if (!e)
    return null;
  const t = mn(e.aggregation), n = M(t?.purchase_total_security) ?? (t ? M(
    t.security_currency_total
  ) : null), r = M(t?.purchase_total_account) ?? (t ? M(
    t.account_currency_total
  ) : null);
  if (ie(n) && ie(r)) {
    const c = n / r;
    if (ie(c))
      return c;
  }
  const a = Le(e.average_cost), o = M(a?.native) ?? M(a?.security), i = M(a?.account) ?? M(a?.eur);
  if (ie(o) && ie(i)) {
    const c = o / i;
    if (ie(c))
      return c;
  }
  return null;
}
function ba(e, t = "Unbekannter Fehler") {
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
function vt(e, t) {
  const n = Re(t instanceof Date ? t : /* @__PURE__ */ new Date()), r = _s[e], a = sr(n), o = {};
  if (a != null && (o.end_date = a), Number.isFinite(r) && r > 0) {
    const i = new Date(n.getTime());
    i.setUTCDate(i.getUTCDate() - (r - 1));
    const c = sr(i);
    c != null && (o.start_date = c);
  }
  return o;
}
function Cn(e) {
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
      return Number.isNaN(n.getTime()) ? null : Re(n);
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
          return Re(r);
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
function ks(e) {
  const t = Cn(e);
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
function St(e) {
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
function an(e) {
  return Array.isArray(e) ? e.map((t) => {
    let r = M(t.close);
    if (r == null) {
      const o = M(t.close_raw);
      o != null && (r = o / 1e8);
    }
    return r == null ? null : {
      date: Cn(t.date) ?? t.date,
      close: r
    };
  }).filter((t) => !!t) : [];
}
function wt(e, t, n = null) {
  if (!Array.isArray(e))
    return [];
  const r = [], a = Pe(t), o = a || "EUR", i = Ts(n);
  return e.forEach((c, s) => {
    const l = typeof c.type == "number" ? c.type : Number(c.type), u = bs.has(l), d = vs.has(l);
    if (!u && !d)
      return;
    const p = ks(c.date);
    let f = M(c.price);
    if (!p || f == null)
      return;
    const g = Pe(c.currency_code), m = a ?? g ?? o;
    g && a && g !== a && ie(i) && (f *= i);
    const _ = M(c.shares), h = M(c.net_price_eur), y = u ? "Kauf" : "Verkauf", b = _ != null ? `${xn(_)} @ ` : "", S = `${y} ${b}${pe(f)} ${m}`, w = d && h != null ? `${S} (netto ${pe(h)} EUR)` : S, C = u ? Ss : ws, A = typeof c.uuid == "string" && c.uuid.trim() || `${y}-${p.getTime().toString()}-${s.toString()}`;
    r.push({
      id: A,
      x: p.getTime(),
      y: f,
      color: C,
      label: w,
      payload: {
        type: y,
        currency: m,
        transactionCurrency: g,
        shares: _,
        price: f,
        netPriceEur: h,
        date: p.toISOString(),
        portfolio: c.portfolio
      }
    });
  }), r;
}
function Nn(e) {
  const t = M(e?.last_price_native) ?? M(e?.last_price?.native) ?? null;
  if (R(t))
    return t;
  if (Pe(e?.currency_code) === "EUR") {
    const r = M(e?.last_price_eur);
    if (R(r))
      return r;
  }
  return null;
}
function Rs(e) {
  if (!e)
    return null;
  const n = e.last_price_fetched_at, r = St(n);
  if (r != null)
    return r;
  const o = e.last_price?.fetched_at;
  return St(o) ?? null;
}
function on(e, t) {
  let n = [];
  Array.isArray(e) && (n = e.map((l) => ({
    ...l
  })));
  const r = n.slice(), a = Nn(t);
  if (!R(a))
    return r;
  const o = Rs(t) ?? Date.now(), i = new Date(o);
  if (Number.isNaN(i.getTime()))
    return r;
  const c = rn(Re(i));
  let s = null;
  for (let l = r.length - 1; l >= 0; l -= 1) {
    const u = r[l], d = Cn(u.date);
    if (!d)
      continue;
    const p = rn(Re(d));
    if (s == null && (s = p), p === c)
      return u.close !== a && (r[l] = { ...u, close: a }), r;
    if (p < c)
      break;
  }
  return s != null && s > c || r.push({
    date: i,
    close: a
  }), r;
}
function R(e) {
  return typeof e == "number" && Number.isFinite(e);
}
function ie(e) {
  return typeof e == "number" && Number.isFinite(e) && e > 0;
}
function je(e, t, n) {
  if (!R(e) || !R(t))
    return !1;
  const r = Math.abs(e - t), a = Math.max(Math.abs(e), Math.abs(t), 1);
  return r <= a * 1e-4;
}
function $s(e, t) {
  return !R(t) || t === 0 || !R(e) ? null : wo((e - t) / t * 100);
}
function va(e, t) {
  if (e.length === 0)
    return { priceChange: null, priceChangePct: null };
  const n = e[0], r = M(n.close);
  if (!R(r) || r === 0)
    return { priceChange: null, priceChangePct: null };
  const a = e[e.length - 1], o = M(a.close), i = M(t) ?? o;
  if (!R(i))
    return { priceChange: null, priceChangePct: null };
  const c = i - r, s = Object.is(c, -0) ? 0 : c, l = $s(i, r);
  return { priceChange: s, priceChangePct: l };
}
function En(e, t) {
  if (!R(e) || e === 0)
    return "neutral";
  const n = 0.5 / Math.pow(10, t);
  return Math.abs(e) < n ? "neutral" : e > 0 ? "positive" : "negative";
}
function Ls(e, t) {
  if (!R(e))
    return '<span class="value neutral">—</span>';
  const n = pe(e);
  if (n === "—")
    return '<span class="value neutral">—</span>';
  const r = En(e, bt.max), a = t ? `&nbsp;${t}` : "";
  return `<span class="value ${r}">${n}${a}</span>`;
}
function Ms(e) {
  return R(e) ? `<span class="value ${En(e, 2)} value--percentage">${re(e)}&nbsp;%</span>` : '<span class="value neutral">—</span>';
}
function Sa(e, t, n, r) {
  const a = e, o = a.length > 0 ? a : "Zeitraum";
  return `
    <div class="security-info-bar" data-range="${a}">
      <div class="security-info-item">
        <span class="label">Preisänderung (${o})</span>
        <div class="value-row">
          ${Ls(t, r)}
          ${Ms(n)}
        </div>
      </div>
    </div>
  `;
}
function Hs(e) {
  return `
    <div class="security-range-selector" role="group" aria-label="Zeitraum">
      ${da.map((n) => `
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
function wa(e, t = { status: "empty" }) {
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
      const r = ba(
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
function xn(e) {
  const t = M(e);
  if (t == null)
    return "—";
  const n = Math.abs(t % 1) > 0, r = n ? 2 : Wt.min, a = n ? Wt.max : Wt.min;
  return t.toLocaleString("de-DE", {
    minimumFractionDigits: r,
    maximumFractionDigits: a
  });
}
function pe(e) {
  const t = M(e);
  return t == null ? "—" : t.toLocaleString("de-DE", {
    minimumFractionDigits: bt.min,
    maximumFractionDigits: bt.max
  });
}
function Is(e, t) {
  const n = pe(e), r = `&nbsp;${t}`;
  return `<span class="${En(e, bt.max)}">${n}${r}</span>`;
}
function Pa(e) {
  return e == null ? "" : (typeof e == "string" ? e : String(e)).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function Vs(e, t) {
  const n = e?.ticker_symbol;
  if (typeof n == "string" && n.trim())
    return n.trim();
  const r = typeof e?.name == "string" ? e.name.trim() : "";
  return r || (typeof t == "string" ? t : "");
}
function zs(e) {
  return `
    <div class="news-prompt-container">
      <button
        type="button"
        class="news-prompt-button"
        data-symbol="${Pa(e)}"
      >
        Check recent news via ChatGPT
      </button>
    </div>
  `;
}
async function qs(e) {
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
function Us(e) {
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
function Ws(e, t, n) {
  const r = Le(e?.average_cost), a = r?.account ?? (R(t) ? t : M(t));
  if (!R(a))
    return null;
  const o = e?.account_currency_code ?? e?.account_currency;
  if (typeof o == "string" && o.trim())
    return o.trim().toUpperCase();
  const i = Pe(e?.currency_code) ?? "", c = r?.security ?? r?.native ?? (R(n) ? n : M(n)), s = mn(e?.aggregation);
  if (i && R(c) && je(a, c))
    return i;
  const l = M(s?.purchase_total_security) ?? M(e?.purchase_total_security), u = M(s?.purchase_total_account) ?? M(e?.purchase_total_account);
  let d = null;
  if (R(l) && l !== 0 && R(u) && (d = u / l), r?.source === "eur_total")
    return "EUR";
  const f = r?.eur;
  if (R(f) && je(a, f))
    return "EUR";
  const g = M(e?.purchase_value_eur);
  return R(g) ? "EUR" : d != null && je(d, 1) ? i || null : i === "EUR" ? "EUR" : i || "EUR";
}
function cr(e) {
  return typeof e != "number" || !Number.isFinite(e) || e <= 0 ? null : e.toLocaleString("de-DE", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
  });
}
function Os(e) {
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
    const i = t?.[o], c = St(i);
    if (c != null)
      return c;
  }
  const r = [];
  t && "last_price_fetched_at" in t && r.push(t.last_price_fetched_at);
  const a = e?.last_price;
  a && typeof a == "object" && r.push(a.fetched_at), t && "last_price_date" in t && r.push(t.last_price_date);
  for (const o of r) {
    const i = St(o);
    if (i != null)
      return i;
  }
  return null;
}
function Bs(e) {
  if (e == null || !Number.isFinite(e))
    return null;
  const t = new Date(e);
  return Number.isNaN(t.getTime()) ? null : t.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}
function js(e, t) {
  if (!e)
    return null;
  const n = Pe(e.currency_code) ?? "", r = Le(e.average_cost);
  if (!r || !n)
    return null;
  const a = r.native ?? r.security ?? null;
  let i = r.account ?? r.eur ?? null, c = Pe(t) ?? "";
  if (ie(r.eur) && (!c || c === n) && (i = r.eur, c = "EUR"), !n || !c || n === c || !ie(a) || !ie(i))
    return null;
  const s = i / a;
  if (!Number.isFinite(s) || s <= 0)
    return null;
  const l = cr(s);
  if (!l)
    return null;
  let u = null;
  if (s > 0) {
    const y = 1 / s;
    Number.isFinite(y) && y > 0 && (u = cr(y));
  }
  const d = Os(e), p = Bs(d), f = [`FX-Kurs (Kauf): 1 ${n} = ${l} ${c}`];
  u && f.push(`1 ${c} = ${u} ${n}`);
  const g = [], m = r.source, _ = m in Ot ? Ot[m] : Ot.aggregation;
  if (g.push(`Quelle: ${_}`), R(r.coverage_ratio)) {
    const y = Math.min(Math.max(r.coverage_ratio * 100, 0), 100);
    g.push(
      `Abdeckung: ${y.toLocaleString("de-DE", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      })}%`
    );
  }
  g.length && f.push(...g);
  const h = p ?? "Datum unbekannt";
  return `${f.join(" · ")} (Stand: ${h})`;
}
function lr(e) {
  if (!e)
    return null;
  const t = Le(e.average_cost), n = t?.native ?? t?.security ?? null;
  return R(n) ? n : null;
}
function Ks(e) {
  if (!e)
    return '<div class="meta-error">Keine Snapshot-Daten verfügbar.</div>';
  const t = e.currency_code || "EUR", n = e.total_holdings_precise ?? e.total_holdings, r = xn(n), a = e.last_price_native ?? e.last_price?.native ?? e.last_price_eur, o = pe(a), i = o === "—" ? null : `${o}${`&nbsp;${t}`}`, c = M(e.market_value_eur) ?? M(e.current_value_eur) ?? null, s = Le(e.average_cost), l = s?.native ?? s?.security ?? null, u = s?.eur ?? null, p = s?.account ?? null ?? u, f = ve(e.performance), g = f?.day_change ?? null, m = g?.price_change_native ?? null, _ = g?.price_change_eur ?? null, h = R(m) ? m : _, y = R(m) ? t : "EUR", b = (k, V = "") => {
    const W = ["value"];
    return V && W.push(...V.split(" ").filter(Boolean)), `<span class="${W.join(" ")}">${k}</span>`;
  }, S = (k = "") => {
    const V = ["value--missing"];
    return k && V.push(k), b("—", V.join(" "));
  }, w = (k, V = "") => {
    if (!R(k))
      return S(V);
    const W = ["value--gain"];
    return V && W.push(V), b(Qa(k), W.join(" "));
  }, C = (k, V = "") => {
    if (!R(k))
      return S(V);
    const W = ["value--gain-percentage"];
    return V && W.push(V), b(eo(k), W.join(" "));
  }, A = i ? b(i, "value--price") : S("value--price"), N = r === "—" ? S("value--holdings") : b(r, "value--holdings"), D = R(c) ? b(`${re(c)}&nbsp;€`, "value--market-value") : S("value--market-value"), H = R(h) ? b(
    Is(h, y),
    "value--gain value--absolute"
  ) : S("value--absolute"), P = C(
    g?.change_pct,
    "value--percentage"
  ), E = w(
    f?.total_change_eur,
    "value--absolute"
  ), I = C(
    f?.total_change_pct,
    "value--percentage"
  ), F = Ws(
    e,
    p,
    l
  ), T = js(
    e,
    F
  ), Y = T ? ` title="${Pa(T)}"` : "", v = [], x = R(u);
  R(l) ? v.push(
    b(
      `${pe(l)}${`&nbsp;${t}`}`,
      "value--average value--average-native"
    )
  ) : v.push(
    S("value--average value--average-native")
  );
  let $ = null, j = null;
  return x && (t !== "EUR" || !R(l) || !je(u, l)) ? ($ = u, j = "EUR") : R(p) && F && (F !== t || !je(p, l ?? NaN)) && ($ = p, j = F), $ != null && R($) && v.push(
    b(
      `${pe($)}${j ? `&nbsp;${j}` : ""}`,
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
        <div class="value-group"${Y}>
          ${v.join("")}
        </div>
      </div>
      <div class="security-meta-item security-meta-item--day-change">
        <span class="label">Tagesänderung</span>
        <div class="value-group">
          ${H}
          ${P}
        </div>
      </div>
      <div class="security-meta-item security-meta-item--total-change">
        <span class="label">Gesamtänderung</span>
        <div class="value-group">
          ${E}
          ${I}
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
function Ys(e) {
  return `
    <div class="card security-meta-card">
      <div id="headerMeta" class="meta">
        ${Ks(e)}
      </div>
    </div>
  `;
}
function Aa(e) {
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
function Gs(e, t, {
  currency: n,
  baseline: r,
  markers: a
} = {}) {
  const o = e.clientWidth || e.offsetWidth || 0, i = o > 0 ? o : 640, c = Math.min(Math.max(Math.floor(i * 0.5), 240), 440), s = (n || "").toUpperCase() || "EUR", l = R(r) ? r : null, u = Math.max(48, Math.min(72, Math.round(i * 0.075))), d = Math.max(28, Math.min(56, Math.round(i * 0.05))), p = Math.max(40, Math.min(64, Math.round(c * 0.14)));
  return {
    width: i,
    height: c,
    margin: {
      top: 18,
      right: d,
      bottom: p,
      left: u
    },
    series: t,
    yFormatter: (g) => pe(g),
    tooltipRenderer: ({ xFormatted: g, yFormatted: m }) => `
      <div class="chart-tooltip-date">${g}</div>
      <div class="chart-tooltip-value">${m}&nbsp;${s}</div>
    `,
    markerTooltipRenderer: ({
      marker: g,
      xFormatted: m,
      yFormatted: _
    }) => {
      const h = g.payload ?? {}, y = _a(h.type), b = M(h.shares), S = b != null ? xn(b) : null, w = Pe(h.currency) ?? s, C = [];
      y && C.push(y), S && C.push(`${S} Stück`), m && C.push(`am ${m}`);
      const A = C.join(" ").trim() || (typeof g.label == "string" ? g.label : m), N = typeof _ == "string" && _.trim() ? _.trim() : pe(h.price), D = N ? `${N}${w ? `&nbsp;${w}` : ""}` : w;
      return `
      <div class="chart-tooltip-date">${A}</div>
      <div class="chart-tooltip-value">${D}</div>
    `;
    },
    baseline: l != null ? {
      value: l
    } : null,
    markers: Array.isArray(a) ? a : []
  };
}
const ur = /* @__PURE__ */ new WeakMap();
function Xs(e, t, n = {}) {
  if (t.length === 0)
    return;
  const r = Gs(e, t, n);
  let a = ur.get(e) ?? null;
  if (!a || !e.contains(a)) {
    e.innerHTML = "", a = sa(e, r), a && ur.set(e, a);
    return;
  }
  wn(a, r);
}
function dr(e, t) {
  e && (e.dataset.activeRange = t, e.querySelectorAll(".security-range-button").forEach((n) => {
    const a = n.dataset.range === t;
    n.classList.toggle("active", a), n.setAttribute("aria-pressed", a ? "true" : "false"), n.disabled = !1, n.classList.remove("loading");
  }));
}
function Zs(e, t, n, r, a) {
  const o = e.querySelector(".security-info-bar");
  if (!o || !o.parentElement)
    return;
  const i = document.createElement("div");
  i.innerHTML = Sa(t, n, r, a).trim();
  const c = i.firstElementChild;
  c && o.parentElement.replaceChild(c, o);
}
function fr(e, t, n, r, a = {}) {
  const o = e.querySelector(".security-detail-placeholder");
  if (o && (o.innerHTML = `
    <h2>Historie</h2>
    ${wa(t, n)}
  `, n.status === "loaded" && Array.isArray(r) && r.length)) {
    const i = o.querySelector(".history-chart");
    i && requestAnimationFrame(() => {
      Xs(i, r, a);
    });
  }
}
function Js(e) {
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
    const u = pa(a), d = ga(a), p = lr(o);
    Array.isArray(c) && s.status !== "error" && u.set(i, c), xs(a), ir(a, i), dr(l, i);
    const g = on(
      c,
      o
    );
    let m = s;
    m.status !== "error" && (m = g.length ? { status: "loaded" } : { status: "empty" }), fr(
      t,
      i,
      m,
      g,
      {
        currency: o?.currency_code,
        baseline: p,
        markers: d.get(i) ?? []
      }
    );
    const _ = async (h) => {
      if (h === ya(a))
        return;
      const y = l.querySelector(
        `.security-range-button[data-range="${h}"]`
      );
      y && (y.disabled = !0, y.classList.add("loading"));
      let b = u.get(h) ?? null, S = d.get(h) ?? null, w = null, C = [];
      if (b)
        w = b.length ? { status: "loaded" } : { status: "empty" };
      else
        try {
          const E = vt(h), I = await dt(
            n,
            r,
            a,
            E
          );
          b = an(I.prices), S = wt(
            I.transactions,
            o?.currency_code,
            o
          ), u.set(h, b), S = Array.isArray(S) ? S : [], d.set(h, S), w = b.length ? { status: "loaded" } : { status: "empty" };
        } catch (E) {
          console.error("Range-Wechsel: Historie konnte nicht geladen werden", E), b = [], S = [], w = {
            status: "error",
            message: Aa(E) || "Die historischen Daten konnten aufgrund eines Fehlers nicht geladen werden."
          };
        }
      if (!Array.isArray(S))
        try {
          const E = vt(h), I = await dt(
            n,
            r,
            a,
            E
          );
          S = wt(
            I.transactions,
            o?.currency_code,
            o
          ), S = Array.isArray(S) ? S : [], d.set(h, S);
        } catch (E) {
          console.error("Range-Wechsel: Transaktionsmarker konnten nicht geladen werden", E), S = [];
        }
      C = on(b, o), w.status !== "error" && (w = C.length ? { status: "loaded" } : { status: "empty" });
      const A = Nn(o), { priceChange: N, priceChangePct: D } = va(
        C,
        A
      ), H = Array.isArray(S) ? S : [];
      ir(a, h), dr(l, h), Zs(
        t,
        h,
        N,
        D,
        o?.currency_code
      );
      const P = lr(o);
      fr(
        t,
        h,
        w,
        C,
        {
          currency: o?.currency_code,
          baseline: P,
          markers: H
        }
      );
    };
    l.addEventListener("click", (h) => {
      const y = h.target?.closest(".security-range-button");
      if (!y || y.disabled)
        return;
      const { range: b } = y.dataset;
      !b || !da.includes(b) || _(b);
    });
  }, 0);
}
function Qs(e) {
  const { root: t, hass: n, panelConfig: r, tickerSymbol: a } = e;
  let o = null, i = !1;
  const c = async () => {
    try {
      o = await ho(n, r);
    } catch (s) {
      i = !0, console.warn("News-Prompt: Prefetch fehlgeschlagen", s);
    }
  };
  c(), setTimeout(() => {
    const s = t.querySelector(".news-prompt-button");
    if (!s)
      return;
    const l = (d) => {
      const p = (o?.placeholder || or).trim() || or, f = (o?.prompt_template || "").trim(), g = (o?.link || "").trim() || Ps;
      return { body: f ? f.includes(p) ? f.split(p).join(d) : `${f}

Ticker: ${d}` : `Ticker: ${d}`, link: g };
    }, u = async () => {
      const d = (s.dataset.symbol || a || "").trim();
      if (!d) {
        console.warn("News-Prompt: Kein Ticker verfügbar");
        return;
      }
      if (!s.classList.contains("loading")) {
        s.disabled = !0, s.classList.add("loading");
        try {
          const { body: p, link: f } = l(d);
          await qs(p) || console.warn("News-Prompt: Clipboard unavailable – prompt could not be copied"), Us(f), !o && !i && c();
        } catch (p) {
          console.error("News-Prompt: Kopiervorgang fehlgeschlagen", p);
        } finally {
          s.classList.remove("loading"), s.disabled = !1;
        }
      }
    };
    s.addEventListener("click", () => {
      u();
    });
  }, 0);
}
async function ec(e, t, n, r) {
  if (!r)
    return console.error("renderSecurityDetail: securityUuid fehlt"), '<div class="card"><h2>Fehler</h2><p>Kein Wertpapier angegeben.</p></div>';
  const a = Ns(r);
  let o = null, i = null;
  try {
    const P = await go(
      t,
      n,
      r
    ), E = P.snapshot;
    o = E && typeof E == "object" ? E : P;
  } catch (P) {
    console.error("renderSecurityDetail: Snapshot konnte nicht geladen werden", P), i = ba(P);
  }
  const c = o || a, s = !!(a && !o), l = (c?.source ?? "") === "cache";
  r && Cs(r, c ?? null);
  const u = c && (s || l) ? As({ fallbackUsed: s, flaggedAsCache: l }) : "", d = c?.name || "Wertpapierdetails", p = fn(d, "", { includeMeta: !1 });
  p.classList.add("security-detail-header");
  const f = Ys(c);
  if (i)
    return `
      ${p.outerHTML}
      ${f}
      ${u}
      <div class="card error-card">
        <h2>Fehler beim Laden</h2>
        <p>${i}</p>
      </div>
    `;
  const g = ya(r), m = pa(r), _ = ga(r);
  let h = m.has(g) ? m.get(g) ?? null : null, y = { status: "empty" }, b = _.has(g) ? _.get(g) ?? null : null;
  if (Array.isArray(h))
    y = h.length ? { status: "loaded" } : { status: "empty" };
  else {
    h = [];
    try {
      const P = vt(g), E = await dt(
        t,
        n,
        r,
        P
      );
      h = an(E.prices), b = wt(
        E.transactions,
        c?.currency_code,
        c
      ), m.set(g, h), b = Array.isArray(b) ? b : [], _.set(g, b), y = h.length ? { status: "loaded" } : { status: "empty" };
    } catch (P) {
      console.error(
        "renderSecurityDetail: Historie konnte nicht geladen werden",
        P
      ), y = {
        status: "error",
        message: Aa(P) || "Die historischen Daten konnten aufgrund eines Fehlers nicht geladen werden."
      };
    }
  }
  if (!Array.isArray(b))
    try {
      const P = vt(g), E = await dt(
        t,
        n,
        r,
        P
      ), I = an(E.prices);
      b = wt(
        E.transactions,
        c?.currency_code,
        c
      ), m.set(g, I), b = Array.isArray(b) ? b : [], _.set(g, b), h = I, y = h.length ? { status: "loaded" } : { status: "empty" };
    } catch (P) {
      console.error(
        "renderSecurityDetail: Transaktionsmarker konnten nicht geladen werden",
        P
      ), b = [];
    }
  const S = on(
    h,
    c
  );
  y.status !== "error" && (y = S.length ? { status: "loaded" } : { status: "empty" });
  const w = Vs(c, r), C = zs(w), A = Nn(c), { priceChange: N, priceChangePct: D } = va(
    S,
    A
  ), H = Sa(
    g,
    N,
    D,
    c?.currency_code
  );
  return Js({
    root: e,
    hass: t,
    panelConfig: n,
    securityUuid: r,
    snapshot: c,
    initialRange: g,
    initialHistory: h,
    initialHistoryState: y
  }), Qs({
    root: e,
    hass: t,
    panelConfig: n,
    tickerSymbol: w
  }), `
    ${p.outerHTML}
    ${f}
    ${u}
    ${C}
    ${H}
    ${Hs(g)}
    <div class="card security-detail-placeholder">
      <h2>Historie</h2>
      ${wa(g, y)}
    </div>
  `;
}
function tc(e) {
  const { setSecurityDetailTabFactory: t } = e;
  if (typeof t != "function") {
    console.error("registerSecurityDetailTab: Ungültige Factory-Funktion übergeben");
    return;
  }
  t((n) => ({
    title: "Wertpapier",
    render: (r, a, o) => ec(r, a, o, n),
    cleanup: () => {
      Ds(n);
    }
  }));
}
const nc = Ja, sn = "pp-reader-sticky-anchor", Pt = "overview", rc = "analyse", cn = "security:", ac = [
  { key: Pt, title: "Dashboard", render: Gr },
  { key: rc, title: "Analyse", render: fs }
], $e = /* @__PURE__ */ new Map(), Qe = [], At = /* @__PURE__ */ new Map();
let ln = null, Bt = !1, De = null, U = 0, jt = null;
function Ct(e) {
  return typeof e == "object" && e !== null;
}
function Ca(e) {
  return typeof e == "object" && e !== null && typeof e.then == "function";
}
function oc(e) {
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
function ic(e) {
  return e === "accounts" || e === "last_file_update" || e === "portfolio_values" || e === "portfolio_positions";
}
function pr(e) {
  const t = e.portfolio_uuid;
  if (typeof t == "string" && t)
    return t;
  const n = e.portfolioUuid;
  return typeof n == "string" && n ? n : null;
}
function sc(e) {
  if (!e)
    return null;
  if (Array.isArray(e)) {
    for (const t of e)
      if (Ct(t)) {
        const n = pr(t);
        if (n)
          return n;
      }
    return null;
  }
  return Ct(e) ? pr(e) : null;
}
function cc(e, t) {
  switch (e) {
    case "accounts":
      return {
        type: e,
        data: Array.isArray(t) ? t : null
      };
    case "last_file_update":
      return typeof t == "string" ? { type: e, data: t } : Ct(t) ? { type: e, data: t } : { type: e, data: null };
    case "portfolio_values":
      return Array.isArray(t) ? { type: e, data: t } : { type: e, data: null };
    case "portfolio_positions":
      return Array.isArray(t) ? { type: e, data: t } : Ct(t) ? { type: e, data: t } : { type: e, data: null };
    default:
      return null;
  }
}
function Fn(e) {
  return typeof e != "string" || !e.startsWith(cn) ? null : e.slice(cn.length) || null;
}
function lc() {
  if (!De)
    return !1;
  const e = Da(De);
  return e || (De = null), e;
}
function ue() {
  const e = Qe.map((t) => $e.get(t)).filter((t) => !!t);
  return [...ac, ...e];
}
function uc(e) {
  const t = ue();
  return e < 0 || e >= t.length ? null : t[e];
}
function Na(e) {
  if (!e)
    return null;
  const t = e, n = t.ppreader ?? t.pp_reader;
  return n || (Object.values(t).find((a) => !a || typeof a != "object" ? !1 : a.webcomponent_name === "pp-reader-panel") ?? null);
}
function Ea() {
  try {
    const e = Dt();
    e && typeof e.rememberScrollPosition == "function" && e.rememberScrollPosition();
  } catch (e) {
    console.warn("rememberCurrentPageScroll: konnte Scroll-Position nicht sichern", e);
  }
}
function gr(e) {
  const t = ue();
  return !t.length || e < 0 ? 0 : e >= t.length ? t.length - 1 : e;
}
async function dc(e, t, n, r) {
  const a = ue(), o = gr(e);
  if (o === U) {
    e > U && lc();
    return;
  }
  Ea();
  const i = U >= 0 && U < a.length ? a[U] : null, c = i ? Fn(i.key) : null;
  let s = o;
  if (c) {
    const l = o >= 0 && o < a.length ? a[o] : null;
    if (l && l.key === Pt && mc(c, { suppressRender: !0 })) {
      const p = ue().findIndex((f) => f.key === Pt);
      s = p >= 0 ? p : 0;
    }
  }
  if (!Bt) {
    Bt = !0;
    try {
      U = gr(s);
      const l = U;
      await Ta(t, n, r), hc(l);
    } catch (l) {
      console.error("navigateToPage: Fehler beim Rendern des Tabs", l);
    } finally {
      Bt = !1;
    }
  }
}
function Nt(e, t, n, r) {
  dc(U + e, t, n, r);
}
function fc(e, t) {
  if (!e || !t || typeof t.render != "function") {
    console.error("registerDetailTab: Ungültiger Tab-Descriptor", e, t);
    return;
  }
  const n = Fn(e);
  if (n) {
    const a = At.get(n);
    a && a !== e && xa(a);
  }
  const r = {
    ...t,
    key: e
  };
  $e.set(e, r), n && At.set(n, e), Qe.includes(e) || Qe.push(e);
}
function xa(e) {
  if (!e)
    return;
  const t = $e.get(e);
  if (t && typeof t.cleanup == "function")
    try {
      const a = t.cleanup({ key: e });
      Ca(a) && a.catch((o) => {
        console.error(
          "unregisterDetailTab: Fehler beim asynchronen cleanup",
          o
        );
      });
    } catch (a) {
      console.error("unregisterDetailTab: Fehler beim Ausführen von cleanup", a);
    }
  $e.delete(e);
  const n = Qe.indexOf(e);
  n >= 0 && Qe.splice(n, 1);
  const r = Fn(e);
  r && At.get(r) === e && At.delete(r);
}
function pc(e) {
  return $e.has(e);
}
function hr(e) {
  return $e.get(e) ?? null;
}
function gc(e) {
  if (e != null && typeof e != "function") {
    console.error("setSecurityDetailTabFactory: Erwartet Funktion oder null", e);
    return;
  }
  ln = e ?? null;
}
function Fa(e) {
  return `${cn}${e}`;
}
function Dt() {
  for (const t of _o())
    if (t.isConnected)
      return t;
  const e = /* @__PURE__ */ new Set();
  for (const t of bo())
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
function un() {
  const e = Dt();
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
const xc = {
  findDashboardElement: Dt
};
function hc(e) {
  const t = Dt();
  if (t && typeof t.handleExternalRender == "function")
    try {
      t.handleExternalRender(e);
    } catch (n) {
      console.warn("notifyExternalRender: Fehler beim Synchronisieren des Dashboards", n);
    }
}
function Da(e) {
  if (!e)
    return console.error("openSecurityDetail: Ungültige securityUuid", e), !1;
  const t = Fa(e);
  let n = hr(t);
  if (!n && typeof ln == "function")
    try {
      const o = ln(e);
      o && typeof o.render == "function" ? (fc(t, o), n = hr(t)) : console.error("openSecurityDetail: Factory lieferte ungültigen Descriptor", o);
    } catch (o) {
      console.error("openSecurityDetail: Fehler beim Erzeugen des Tab-Descriptors", o);
    }
  if (!n)
    return console.warn(`openSecurityDetail: Kein Detail-Tab für ${e} verfügbar`), !1;
  Ea();
  let a = ue().findIndex((o) => o.key === t);
  return a === -1 && (a = ue().findIndex((i) => i.key === t), a === -1) ? (console.error("openSecurityDetail: Tab nach Registrierung nicht auffindbar"), !1) : (U = a, De = null, un(), !0);
}
function mc(e, t = {}) {
  if (!e)
    return console.error("closeSecurityDetail: Ungültige securityUuid", e), !1;
  const { suppressRender: n = !1 } = t, r = Fa(e);
  if (!pc(r))
    return !1;
  const o = ue().findIndex((s) => s.key === r), i = o === U;
  xa(r);
  const c = ue();
  if (!c.length)
    return U = 0, n || un(), !0;
  if (De = e, i) {
    const s = c.findIndex((l) => l.key === Pt);
    s >= 0 ? U = s : U = Math.min(Math.max(o - 1, 0), c.length - 1);
  } else U >= c.length && (U = Math.max(0, c.length - 1));
  return n || un(), !0;
}
async function Ta(e, t, n) {
  let r = n;
  r || (r = Na(t ? t.panels : null));
  const a = ue();
  U >= a.length && (U = Math.max(0, a.length - 1));
  const o = uc(U);
  if (!o) {
    console.error("renderTab: Kein gültiger Tab oder keine render-Methode gefunden!");
    return;
  }
  let i;
  try {
    i = await o.render(e, t, r);
  } catch (u) {
    console.error("renderTab: Fehler beim Rendern des Tabs:", u), e.innerHTML = `<div class="card"><h2>Fehler</h2><pre>${oc(u)}</pre></div>`;
    return;
  }
  e.innerHTML = i ?? "", o.render === Gr && Sn(e);
  const s = await new Promise((u) => {
    const d = window.setInterval(() => {
      const p = e.querySelector(".header-card");
      p && (clearInterval(d), u(p));
    }, 50);
  });
  let l = e.querySelector(`#${sn}`);
  if (!l) {
    l = document.createElement("div"), l.id = sn;
    const u = s.parentNode;
    u && "insertBefore" in u && u.insertBefore(l, s);
  }
  bc(e, t, n), _c(e, t, n), yc(e);
}
function yc(e) {
  const t = e.querySelector(".header-card"), n = e.querySelector(`#${sn}`);
  if (!t || !n) {
    console.error("Fehlende Elemente für das Scrollverhalten: headerCard oder anchor.");
    return;
  }
  jt?.disconnect(), jt = new IntersectionObserver(
    ([r]) => {
      r.isIntersecting ? t.classList.remove("sticky") : t.classList.add("sticky");
    },
    {
      root: null,
      rootMargin: "0px 0px 0px 0px",
      threshold: 0
    }
  ), jt.observe(n);
}
function _c(e, t, n) {
  const r = e.querySelector(".header-card");
  if (!r) {
    console.error("Header-Card nicht gefunden!");
    return;
  }
  nc(
    r,
    () => {
      Nt(1, e, t, n);
    },
    () => {
      Nt(-1, e, t, n);
    }
  );
}
function bc(e, t, n) {
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
    Nt(-1, e, t, n);
  }), o.addEventListener("click", () => {
    Nt(1, e, t, n);
  }), vc(r);
}
function vc(e) {
  const t = e.querySelector("#nav-left"), n = e.querySelector("#nav-right");
  if (t && (U === 0 ? (t.disabled = !0, t.classList.add("disabled")) : (t.disabled = !1, t.classList.remove("disabled"))), n) {
    const r = ue(), o = !(U === r.length - 1) || !!De;
    n.disabled = !o, n.classList.toggle("disabled", !o);
  }
}
class Sc extends HTMLElement {
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
    this._panel || (this._panel = Na(this._hass.panels ?? null));
    const t = Ln(this._hass, this._panel);
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
    const n = Ln(this._hass, this._panel);
    if (!n)
      return;
    const r = t.data;
    if (!ic(r.data_type) || r.entry_id && r.entry_id !== n)
      return;
    const a = cc(r.data_type, r.data);
    a && (this._queueUpdate(a.type, a.data), this._doRender(a.type, a.data));
  }
  _doRender(t, n) {
    switch (t) {
      case "accounts":
        ci(
          n,
          this._root
        );
        break;
      case "last_file_update":
        yi(
          n,
          this._root
        );
        break;
      case "portfolio_values":
        di(
          n,
          this._root
        );
        break;
      case "portfolio_positions":
        gi(
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
    t === "portfolio_positions" && (a.portfolioUuid = sc(
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
  rememberScrollPosition(t = U) {
    const n = Number.isInteger(t) ? t : U;
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
    const t = U;
    if (!this._hasNewData && this._panel === this._lastPanel && this._narrow === this._lastNarrow && this._route === this._lastRoute && this._lastPage === t)
      return;
    this._lastPage != null && (this._scrollPositions[this._lastPage] = this._root.scrollTop);
    const n = Ta(this._root, this._hass, this._panel);
    if (Ca(n)) {
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
customElements.get("pp-reader-dashboard") || customElements.define("pp-reader-dashboard", Sc);
console.log("PPReader dashboard module v20250914b geladen");
tc({
  setSecurityDetailTabFactory: gc
});
export {
  xc as __TEST_ONLY_DASHBOARD,
  Ec as __TEST_ONLY__,
  mc as closeSecurityDetail,
  vn as flushPendingPositions,
  hr as getDetailTabDescriptor,
  gi as handlePortfolioPositionsUpdate,
  pc as hasDetailTab,
  Da as openSecurityDetail,
  Nc as reapplyPositionsSort,
  wc as registerDashboardElement,
  fc as registerDetailTab,
  Ac as registerPanelHost,
  gc as setSecurityDetailTabFactory,
  Pc as unregisterDashboardElement,
  xa as unregisterDetailTab,
  Cc as unregisterPanelHost,
  Yr as updatePortfolioFooterFromDom
};
//# sourceMappingURL=dashboard.8OyhXCeC.js.map
