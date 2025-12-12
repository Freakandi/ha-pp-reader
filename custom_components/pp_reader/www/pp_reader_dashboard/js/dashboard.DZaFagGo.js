function Fn(e, t) {
  try {
    t();
  } catch (n) {
    console.warn(`addSwipeEvents: ${e} handler threw`, n);
  }
}
function Xa(e, t, n) {
  let r = null;
  const a = (l) => {
    l < -50 ? Fn("left", t) : l > 50 && Fn("right", n);
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
const un = (e, t) => {
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
    const p = typeof s == "number" ? s : o(s);
    return Number.isFinite(p) ? p.toLocaleString("de-DE", {
      minimumFractionDigits: l,
      maximumFractionDigits: u
    }) : "";
  }, c = (s = "") => {
    const l = s || "Kein Wert verfügbar";
    return `<span class="missing-value" role="note" aria-label="${l}" title="${l}">—</span>`;
  };
  if (["gain_abs", "gain_pct", "day_change_abs", "day_change_pct"].includes(e)) {
    if (t == null && n) {
      const f = n.performance;
      if (typeof f == "object" && f !== null)
        if (e.startsWith("day_change")) {
          const d = f.day_change;
          if (d && typeof d == "object") {
            const g = e === "day_change_pct" ? d.change_pct : d.value_change_eur ?? d.price_change_eur;
            typeof g == "number" && (t = g);
          }
        } else {
          const d = f[e];
          typeof d == "number" && (t = d);
        }
    }
    const s = n?.fx_unavailable === !0 ? "Wechselkurs nicht verfügbar – EUR-Wert unbekannt" : "";
    if (t == null || r?.hasValue === !1)
      return c(s);
    const l = typeof t == "number" ? t : o(t);
    if (!Number.isFinite(l))
      return c(s);
    const u = e.endsWith("pct") ? "%" : "€";
    return a = i(l) + `&nbsp;${u}`, `<span class="${un(l, 2)}">${a}</span>`;
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
function $e(e, t, n = [], r = {}) {
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
  const u = {}, p = {};
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
      y.hasValue ? (u[h.key] = y.total, p[h.key] = { hasValue: !0 }) : (u[h.key] = null, p[h.key] = { hasValue: !1 });
    }
  });
  const f = u.gain_abs ?? null;
  if (f != null) {
    const h = u.purchase_value ?? null;
    if (h != null && h > 0)
      u.gain_pct = f / h * 100;
    else {
      const y = u.current_value ?? null;
      y != null && y !== 0 && (u.gain_pct = f / (y - f) * 100);
    }
  }
  const d = u.day_change_abs ?? null;
  if (d != null) {
    const h = u.current_value ?? null;
    if (h != null) {
      const y = h - d;
      y && (u.day_change_pct = d / y * 100, p.day_change_pct = { hasValue: !0 });
    }
  }
  const g = Number.isFinite(u.gain_pct ?? NaN) ? u.gain_pct : null;
  let m = "", _ = "neutral";
  if (g != null && (m = `${ne(g)} %`, g > 0 ? _ = "positive" : g < 0 && (_ = "negative")), l += '<tr class="footer-row">', t.forEach((h, y) => {
    const b = h.align === "right" ? ' class="align-right"' : "";
    if (y === 0) {
      l += `<td${b}>Summe</td>`;
      return;
    }
    if (u[h.key] != null) {
      let w = "";
      h.key === "gain_abs" && m && (w = ` data-gain-pct="${s(m)}" data-gain-sign="${s(_)}"`), l += `<td${b}${w}>${L(h.key, u[h.key], void 0, p[h.key])}</td>`;
      return;
    }
    if (h.key === "gain_pct" && u.gain_pct != null) {
      l += `<td${b}>${L("gain_pct", u.gain_pct, void 0, p[h.key])}</td>`;
      return;
    }
    const S = p[h.key] ?? { hasValue: !1 };
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
function dn(e, t, n = {}) {
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
function ne(e, t = 2, n = 2) {
  return (Number.isNaN(e) ? 0 : e).toLocaleString("de-DE", {
    minimumFractionDigits: t,
    maximumFractionDigits: n
  });
}
function Za(e) {
  const t = Number.isNaN(e) ? 0 : e;
  return `<span class="${un(t, 2)}">${ne(t)}&nbsp;€</span>`;
}
function Ja(e) {
  const t = Number.isNaN(e) ? 0 : e;
  return `<span class="${un(t, 2)}">${ne(t)}&nbsp;%</span>`;
}
function gr(e, t, n = "asc", r = !1) {
  if (!e)
    return [];
  const a = e.querySelector("tbody");
  if (!a)
    return [];
  const o = a.querySelector("tr.footer-row"), i = Array.from(a.querySelectorAll("tr")).filter((u) => u !== o);
  let c = -1;
  if (r) {
    const p = {
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
    typeof p == "number" && (c = p);
  } else {
    const u = Array.from(e.querySelectorAll("thead th"));
    for (let p = 0; p < u.length; p++)
      if (u[p].getAttribute("data-sort-key") === t) {
        c = p;
        break;
      }
  }
  if (c < 0)
    return i;
  const s = (u) => {
    const p = u.replace(/\u00A0/g, " ").replace(/[%€]/g, "").replace(/\./g, "").replace(/,/g, ".").replace(/[^\d.-]/g, "").trim();
    if (!p) return NaN;
    const f = parseFloat(p);
    return Number.isFinite(f) ? f : NaN;
  };
  i.sort((u, p) => {
    const f = u.cells.item(c), d = p.cells.item(c), g = (f?.textContent ?? "").trim(), m = (d?.textContent ?? "").trim(), _ = s(g), h = s(m);
    let y;
    const b = /[0-9]/.test(g) || /[0-9]/.test(m);
    return !Number.isNaN(_) && !Number.isNaN(h) && b ? y = _ - h : y = g.localeCompare(m, "de", { sensitivity: "base" }), n === "asc" ? y : -y;
  }), i.forEach((u) => a.appendChild(u)), o && a.appendChild(o), e.querySelectorAll("thead th.sort-active").forEach((u) => {
    u.classList.remove("sort-active", "dir-asc", "dir-desc");
  });
  const l = e.querySelector(`thead th[data-sort-key="${t}"]`);
  return l && l.classList.add("sort-active", n === "asc" ? "dir-asc" : "dir-desc"), i;
}
function pe(e) {
  return typeof e == "object" && e !== null;
}
function O(e) {
  return typeof e == "string" ? e : null;
}
function Qe(e) {
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
function Dn(e) {
  const t = z(e);
  if (t == null)
    return null;
  const n = Math.trunc(t);
  return Number.isFinite(n) ? n : null;
}
function ot(e) {
  return pe(e) ? { ...e } : null;
}
function hr(e) {
  return pe(e) ? { ...e } : null;
}
function mr(e) {
  return typeof e == "boolean" ? e : void 0;
}
function Qa(e) {
  if (!pe(e))
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
  const p = Qe(e.metric_run_uuid);
  p !== null && (o.metric_run_uuid = p);
  const f = mr(e.fx_unavailable);
  return typeof f == "boolean" && (o.fx_unavailable = f), o;
}
function yr(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = Qa(n);
    r && t.push(r);
  }
  return t;
}
function eo(e) {
  if (!pe(e))
    return null;
  const t = e.aggregation, n = O(e.security_uuid), r = O(e.name), a = z(e.current_holdings), o = z(e.purchase_value_eur) ?? (pe(t) ? z(t.purchase_value_eur) ?? z(t.purchase_total_account) ?? z(t.account_currency_total) : null) ?? z(e.purchase_value), i = z(e.current_value);
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
    average_cost: ot(e.average_cost),
    performance: ot(e.performance),
    aggregation: ot(e.aggregation),
    data_state: hr(e.data_state)
  }, s = z(e.coverage_ratio);
  s != null && (c.coverage_ratio = s);
  const l = O(e.provenance);
  l && (c.provenance = l);
  const u = Qe(e.metric_run_uuid);
  u !== null && (c.metric_run_uuid = u);
  const p = z(e.last_price_native);
  p != null && (c.last_price_native = p);
  const f = z(e.last_price_eur);
  f != null && (c.last_price_eur = f);
  const d = z(e.last_close_native);
  d != null && (c.last_close_native = d);
  const g = z(e.last_close_eur);
  return g != null && (c.last_close_eur = g), c;
}
function _r(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = eo(n);
    r && t.push(r);
  }
  return t;
}
function br(e) {
  if (!pe(e))
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
    position_count: Dn(e.position_count ?? e.count) ?? void 0,
    missing_value_positions: Dn(e.missing_value_positions) ?? void 0,
    has_current_value: mr(e.has_current_value),
    performance: ot(e.performance),
    coverage_ratio: z(e.coverage_ratio) ?? void 0,
    provenance: O(e.provenance) ?? void 0,
    metric_run_uuid: Qe(e.metric_run_uuid) ?? void 0,
    data_state: hr(e.data_state)
  };
  return Array.isArray(e.positions) && (o.positions = _r(e.positions)), o;
}
function vr(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = br(n);
    r && t.push(r);
  }
  return t;
}
function Sr(e) {
  if (!pe(e))
    return null;
  const t = { ...e }, n = Qe(e.metric_run_uuid);
  n !== null ? t.metric_run_uuid = n : delete t.metric_run_uuid;
  const r = z(e.coverage_ratio);
  r != null ? t.coverage_ratio = r : delete t.coverage_ratio;
  const a = O(e.provenance);
  a ? t.provenance = a : delete t.provenance;
  const o = O(e.generated_at ?? e.snapshot_generated_at);
  return o ? t.generated_at = o : delete t.generated_at, t;
}
function to(e) {
  if (!pe(e))
    return null;
  const t = { ...e }, n = Sr(e.normalized_payload);
  return n ? t.normalized_payload = n : "normalized_payload" in t && delete t.normalized_payload, t;
}
function wr(e) {
  if (!pe(e))
    return null;
  const t = O(e.generated_at);
  if (!t)
    return null;
  const n = Qe(e.metric_run_uuid), r = yr(e.accounts), a = vr(e.portfolios), o = to(e.diagnostics), i = {
    generated_at: t,
    metric_run_uuid: n,
    accounts: r,
    portfolios: a
  };
  return o && (i.diagnostics = o), i;
}
function ee(e) {
  return typeof e == "string" ? e : null;
}
function no(e) {
  if (typeof e == "string")
    return e;
  if (e === null)
    return null;
}
function ro(e) {
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
function ao(e) {
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
function ge(e, t) {
  let n = t?.config?.entry_id ?? t?.entry_id ?? t?.config?._panel_custom?.config?.entry_id ?? void 0;
  if (!n && e?.panels) {
    const r = e.panels, a = r.ppreader ?? r.pp_reader ?? Object.values(r).find(
      (o) => o?.webcomponent_name === "pp-reader-panel"
    );
    n = a?.config?.entry_id ?? a?.entry_id ?? a?.config?._panel_custom?.config?.entry_id ?? void 0;
  }
  return n ?? void 0;
}
function kn(e, t) {
  return ge(e, t);
}
async function oo(e, t) {
  if (!e)
    throw new Error("fetchAccountsWS: fehlendes hass");
  const n = ge(e, t);
  if (!n)
    throw new Error("fetchAccountsWS: fehlendes entry_id");
  const r = await e.connection.sendMessagePromise({
    type: "pp_reader/get_accounts",
    entry_id: n
  }), a = yr(r.accounts), o = wr(r.normalized_payload);
  return {
    accounts: a,
    normalized_payload: o
  };
}
async function io(e, t) {
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
async function so(e, t) {
  if (!e)
    throw new Error("fetchPortfoliosWS: fehlendes hass");
  const n = ge(e, t);
  if (!n)
    throw new Error("fetchPortfoliosWS: fehlendes entry_id");
  const r = await e.connection.sendMessagePromise({
    type: "pp_reader/get_portfolio_data",
    entry_id: n
  }), a = vr(r.portfolios), o = wr(r.normalized_payload);
  return {
    portfolios: a,
    normalized_payload: o
  };
}
function co(e, t, n) {
  if (e && typeof e == "object") {
    const r = ee(e.start), a = ee(e.end);
    if (r && a)
      return { start: r, end: a };
  }
  if (n?.start && n.end)
    return { start: n.start, end: n.end };
  if (t)
    return { start: t, end: t };
  throw new Error("fetchDailyWealthWS: fehlender Zeitraum");
}
function re(e) {
  return typeof e == "number" && Number.isFinite(e) ? e : 0;
}
function Tn(e) {
  return e === null ? null : typeof e == "number" && Number.isFinite(e) ? e : null;
}
function Pr(e) {
  const t = ee(e.date);
  if (!t)
    return null;
  const n = {
    date: t,
    total_wealth_eur: re(e.total_wealth_eur),
    portfolio_wealth_eur: re(e.portfolio_wealth_eur),
    account_wealth_eur: re(e.account_wealth_eur),
    dividends_eur: re(e.dividends_eur),
    interest_eur: re(e.interest_eur),
    inbound_transfers_eur: re(e.inbound_transfers_eur),
    outbound_transfers_eur: re(e.outbound_transfers_eur),
    performance_neutral_movements: re(e.performance_neutral_movements),
    fees_eur: re(e.fees_eur),
    taxes_eur: re(e.taxes_eur),
    fx_coverage_ratio: Tn(e.fx_coverage_ratio),
    price_coverage_ratio: Tn(e.price_coverage_ratio),
    stale_price: e.stale_price === !0
  }, r = ee(e.provenance);
  return r && (n.provenance = r), n;
}
function Rn(e) {
  const t = Pr(e), n = ee(e.scope_type), r = ee(e.scope_id);
  if (!t || !n || !r || n !== "portfolio" && n !== "account")
    return null;
  const a = {
    ...t,
    scope_type: n,
    scope_id: r
  }, o = ee(e.scope_name);
  return o && (a.scope_name = o), a;
}
function lo(e) {
  if (!e || typeof e != "object")
    return;
  const t = e, n = Array.isArray(t.accounts) ? t.accounts : [], r = Array.isArray(t.portfolios) ? t.portfolios : [], a = n.map((i) => i && typeof i == "object" ? Rn(i) : null).filter((i) => !!i), o = r.map((i) => i && typeof i == "object" ? Rn(i) : null).filter((i) => !!i);
  if (!(a.length === 0 && o.length === 0))
    return { accounts: a, portfolios: o };
}
async function uo(e, t, n) {
  if (!e)
    throw new Error("fetchDailyWealthWS: fehlendes hass");
  const r = ge(e, t);
  if (!r)
    throw new Error("fetchDailyWealthWS: fehlendes entry_id");
  const { date: a, range: o, includeSlices: i, includeScopes: c, scopes: s, limit: l, offset: u } = n, p = ee(a), f = o && typeof o == "object" ? {
    start: ee(o.start) ?? "",
    end: ee(o.end) ?? ""
  } : null;
  if (p && f && f.start && f.end)
    throw new Error("fetchDailyWealthWS: date und range sind gleichzeitig gesetzt");
  const d = {
    type: "pp_reader/get_daily_wealth",
    entry_id: r
  };
  if (p)
    d.date = p;
  else if (f && f.start && f.end)
    d.range = f;
  else
    throw new Error("fetchDailyWealthWS: weder date noch range angegeben");
  i !== void 0 && (d.include_slices = i), c !== void 0 && (d.include_scopes = c), (Array.isArray(s?.accounts) || Array.isArray(s?.portfolios)) && (d.scopes = {}, Array.isArray(s.accounts) && (d.scopes.accounts = s.accounts.filter((b) => typeof b == "string" && b.length > 0)), Array.isArray(s.portfolios) && (d.scopes.portfolios = s.portfolios.filter(
    (b) => typeof b == "string" && b.length > 0
  ))), typeof l == "number" && Number.isFinite(l) && l > 0 && (d.limit = l), typeof u == "number" && Number.isFinite(u) && u >= 0 && (d.offset = u);
  const g = await e.connection.sendMessagePromise(d), m = co(g.range, p, f), h = (Array.isArray(g.records) ? g.records : []).map((b) => b && typeof b == "object" ? Pr(b) : null).filter((b) => !!b), y = lo(g.slices);
  return {
    range: m,
    records: h,
    ...y ? { slices: y } : {}
  };
}
async function Ar(e, t, n) {
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
  }), i = _r(a.positions).map(ao), c = Sr(a.normalized_payload), s = {
    portfolio_uuid: ee(a.portfolio_uuid) ?? n,
    positions: i
  };
  typeof a.error == "string" && (s.error = a.error);
  const l = ro(a.coverage_ratio);
  l !== void 0 && (s.coverage_ratio = l);
  const u = ee(a.provenance);
  u && (s.provenance = u);
  const p = no(a.metric_run_uuid);
  return p !== void 0 && (s.metric_run_uuid = p), c && (s.normalized_payload = c), s;
}
async function fo(e, t, n) {
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
async function po(e, t) {
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
async function ut(e, t, n, r = {}) {
  if (!e)
    throw new Error("fetchSecurityHistoryWS: fehlendes hass");
  const a = ge(e, t);
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
  const p = c ?? l;
  p != null && (o.end_date = p);
  const f = await e.connection.sendMessagePromise(o);
  return Array.isArray(f.prices) || (f.prices = []), Array.isArray(f.transactions) || (f.transactions = []), f;
}
const fn = /* @__PURE__ */ new Set(), pn = /* @__PURE__ */ new Set(), Cr = {}, go = [
  "renderPositionsTable",
  "applyGainPctMetadata",
  "attachSecurityDetailListener",
  "attachPortfolioPositionsSorting",
  "updatePortfolioFooter"
];
function ho(e, t) {
  typeof t == "function" && (Cr[e] = t);
}
function Sc(e) {
  e && fn.add(e);
}
function wc(e) {
  e && fn.delete(e);
}
function mo() {
  return fn;
}
function Pc(e) {
  e && pn.add(e);
}
function Ac(e) {
  e && pn.delete(e);
}
function yo() {
  return pn;
}
function _o(e) {
  for (const t of go)
    ho(t, e[t]);
}
function gn() {
  return Cr;
}
const bo = 2;
function de(e) {
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
        const p = i.split(","), f = p[p.length - 1]?.length ?? 0, d = p.slice(0, -1).join(""), g = d.replace(/[+-]/g, "").length, m = p.length > 2, _ = /^[-+]?0$/.test(d);
        i = m || f === 0 || f === 3 && g > 0 && g <= 3 && !_ ? i.replace(/,/g, "") : i.replace(",", ".");
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
function Et(e, { decimals: t = bo, fallback: n = null } = {}) {
  const r = de(e);
  if (r == null)
    return n ?? null;
  const a = 10 ** t, o = Math.round(r * a) / a;
  return Object.is(o, -0) ? 0 : o;
}
function Ln(e, t = {}) {
  return Et(e, t);
}
function vo(e, t = {}) {
  return Et(e, t);
}
const So = /^[+-]?(?:\d+\.?\d*|\d*\.?\d+)(?:[eE][+-]?\d+)?$/, ie = (e) => {
  if (typeof e == "number")
    return Number.isFinite(e) ? e : null;
  if (typeof e == "string") {
    const t = e.trim();
    if (!t || !So.test(t))
      return null;
    const n = Number(t);
    if (Number.isFinite(n))
      return n;
  }
  return null;
}, Nr = (e) => {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t || null;
};
function wo(e) {
  const t = e && typeof e == "object" ? e : null;
  if (!t)
    return null;
  const n = ie(t.price_change_native), r = ie(t.price_change_eur), a = ie(t.change_pct), o = ie(t.value_change_eur);
  if (n == null && r == null && a == null && o == null)
    return null;
  const i = Nr(t.source) ?? "derived", c = ie(t.coverage_ratio) ?? null;
  return {
    price_change_native: n,
    price_change_eur: r,
    change_pct: a,
    value_change_eur: o ?? null,
    source: i,
    coverage_ratio: c
  };
}
function be(e) {
  const t = e && typeof e == "object" ? e : null;
  if (!t)
    return null;
  const n = ie(t.gain_abs), r = ie(t.gain_pct), a = ie(t.total_change_eur), o = ie(t.total_change_pct);
  if (n == null || r == null || a == null || o == null)
    return null;
  const i = Nr(t.source) ?? "derived", c = ie(t.coverage_ratio) ?? null, s = wo(t.day_change);
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
const ye = /* @__PURE__ */ new Map();
function he(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t.length > 0 ? t : null;
}
function U(e) {
  if (e === null)
    return null;
  const t = de(e);
  return Number.isFinite(t ?? NaN) ? t : null;
}
function Po(e) {
  if (!e || typeof e != "object")
    return !1;
  const t = e;
  return typeof t.security_uuid == "string" && typeof t.name == "string" && typeof t.current_holdings == "number" && typeof t.purchase_value == "number" && typeof t.current_value == "number";
}
function ke(e) {
  const t = { ...e };
  return e.average_cost && typeof e.average_cost == "object" && (t.average_cost = { ...e.average_cost }), e.performance && typeof e.performance == "object" && (t.performance = { ...e.performance }), e.aggregation && typeof e.aggregation == "object" && (t.aggregation = { ...e.aggregation }), e.data_state && typeof e.data_state == "object" && (t.data_state = { ...e.data_state }), t;
}
function Ao(e, t, n = []) {
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
function Co(e, t) {
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
    const p = l[u];
    p !== void 0 && (s[u] = p);
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
  return i !== void 0 && (n.performance = Ao(c, i, [
    "gain_pct",
    "total_change_pct"
  ])), o("aggregation"), o("average_cost"), o("data_state"), n;
}
function dt(e, t) {
  if (!e)
    return [];
  if (!Array.isArray(t))
    return ye.delete(e), [];
  if (t.length === 0)
    return ye.set(e, []), [];
  const n = ye.get(e) ?? [], r = new Map(
    n.filter((o) => o.security_uuid).map((o) => [o.security_uuid, o])
  ), a = t.filter((o) => !!o).map((o) => {
    const i = o.security_uuid ?? "", c = i ? r.get(i) : void 0;
    return Co(c, o);
  }).map(ke);
  return ye.set(e, a), a.map(ke);
}
function xt(e) {
  return e ? ye.has(e) : !1;
}
function Er(e) {
  if (!e)
    return [];
  const t = ye.get(e);
  return t ? t.map(ke) : [];
}
function No() {
  ye.clear();
}
function Eo() {
  return new Map(
    Array.from(ye.entries(), ([e, t]) => [
      e,
      t.map(ke)
    ])
  );
}
function Me(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e, n = U(t.native), r = U(t.security), a = U(t.account), o = U(t.eur), i = U(t.coverage_ratio);
  if (n == null && r == null && a == null && o == null && i == null)
    return null;
  const c = he(t.source);
  return {
    native: n,
    security: r,
    account: a,
    eur: o,
    source: c === "totals" || c === "eur_total" ? c : "aggregation",
    coverage_ratio: i
  };
}
function hn(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e, n = U(t.total_holdings), r = U(t.positive_holdings), a = U(t.purchase_value_eur), o = U(t.purchase_total_security) ?? U(t.security_currency_total), i = U(t.purchase_total_account) ?? U(t.account_currency_total);
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
function xo(e) {
  if (!e || typeof e != "object")
    return null;
  const t = Po(e) ? ke(e) : e, n = he(t.security_uuid), r = he(t.name), a = de(t.current_holdings), o = Ln(t.current_value), i = hn(t.aggregation), c = t.aggregation && typeof t.aggregation == "object" ? t.aggregation : null, s = U(t.purchase_value_eur) ?? U(c?.purchase_value_eur) ?? U(c?.purchase_total_account) ?? U(c?.account_currency_total) ?? Ln(t.purchase_value);
  if (!n || !r || a == null || s == null || o == null)
    return null;
  const l = {
    security_uuid: n,
    name: r,
    portfolio_uuid: he(t.portfolio_uuid) ?? he(t.portfolioUuid) ?? void 0,
    currency_code: he(t.currency_code),
    current_holdings: a,
    purchase_value: s,
    current_value: o
  }, u = Me(t.average_cost);
  u && (l.average_cost = u), i && (l.aggregation = i);
  const p = be(t.performance);
  if (p)
    l.performance = p, l.gain_abs = typeof p.gain_abs == "number" ? p.gain_abs : null, l.gain_pct = typeof p.gain_pct == "number" ? p.gain_pct : null;
  else {
    const b = U(t.gain_abs), S = U(t.gain_pct);
    b !== null && (l.gain_abs = b), S !== null && (l.gain_pct = S);
  }
  "coverage_ratio" in t && (l.coverage_ratio = U(t.coverage_ratio));
  const f = he(t.provenance);
  f && (l.provenance = f);
  const d = he(t.metric_run_uuid);
  (d || t.metric_run_uuid === null) && (l.metric_run_uuid = d ?? null);
  const g = U(t.last_price_native);
  g !== null && (l.last_price_native = g);
  const m = U(t.last_price_eur);
  m !== null && (l.last_price_eur = m);
  const _ = U(t.last_close_native);
  _ !== null && (l.last_close_native = _);
  const h = U(t.last_close_eur);
  h !== null && (l.last_close_eur = h);
  const y = t.data_state && typeof t.data_state == "object" ? { ...t.data_state } : void 0;
  return y && (l.data_state = y), l;
}
function Ft(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = xo(n);
    r && t.push(r);
  }
  return t;
}
let xr = [];
const _e = /* @__PURE__ */ new Map();
function it(e) {
  return typeof e == "string" && e.length > 0 ? e : void 0;
}
function Fo(e) {
  return e === null ? null : it(e);
}
function Do(e) {
  return typeof e == "number" && Number.isFinite(e) ? e : void 0;
}
function Se(e) {
  return e === null ? null : Do(e);
}
function Mn(e) {
  if (!(typeof e != "number" || !Number.isFinite(e)))
    return Math.trunc(e);
}
function se(e) {
  if (!(!e || typeof e != "object"))
    return { ...e };
}
function Ke(e) {
  const t = { ...e };
  return t.average_cost = se(e.average_cost), t.performance = se(e.performance), t.aggregation = se(e.aggregation), t.data_state = se(e.data_state), t;
}
function mn(e) {
  const t = { ...e };
  return t.performance = se(e.performance), t.data_state = se(e.data_state), Array.isArray(e.positions) && (t.positions = e.positions.map(Ke)), t;
}
function Fr(e) {
  if (!e || typeof e != "object")
    return null;
  const t = it(e.uuid);
  if (!t)
    return null;
  const n = { uuid: t }, r = it(e.name);
  r && (n.name = r);
  const a = Se(e.current_value);
  a !== void 0 && (n.current_value = a);
  const o = Se(e.purchase_sum) ?? Se(e.purchase_value_eur) ?? Se(e.purchase_value);
  o !== void 0 && (n.purchase_value = o, n.purchase_sum = o);
  const i = Se(e.day_change_abs);
  i !== void 0 && (n.day_change_abs = i);
  const c = Se(e.day_change_pct);
  c !== void 0 && (n.day_change_pct = c);
  const s = Mn(e.position_count);
  s !== void 0 && (n.position_count = s);
  const l = Mn(e.missing_value_positions);
  l !== void 0 && (n.missing_value_positions = l), typeof e.has_current_value == "boolean" && (n.has_current_value = e.has_current_value);
  const u = Se(e.coverage_ratio);
  u !== void 0 && (n.coverage_ratio = u);
  const p = it(e.provenance);
  p && (n.provenance = p), "metric_run_uuid" in e && (n.metric_run_uuid = Fo(e.metric_run_uuid));
  const f = se(e.performance);
  f && (n.performance = f);
  const d = se(e.data_state);
  if (d && (n.data_state = d), Array.isArray(e.positions)) {
    const g = e.positions.filter(
      (m) => !!m
    );
    g.length && (n.positions = g.map(Ke));
  }
  return n;
}
function $o(e, t) {
  const n = {
    ...e,
    ...t
  };
  return !t.performance && e.performance && (n.performance = se(e.performance)), !t.data_state && e.data_state && (n.data_state = se(e.data_state)), !t.positions && e.positions && (n.positions = e.positions.map(Ke)), n;
}
function Dr(e) {
  xr = (e ?? []).map((n) => ({ ...n }));
}
function ko() {
  return xr.map((e) => ({ ...e }));
}
function To(e) {
  _e.clear();
  const t = e ?? [];
  for (const n of t) {
    const r = Fr(n);
    r && _e.set(r.uuid, mn(r));
  }
}
function Ro(e) {
  const t = e ?? [];
  for (const n of t) {
    const r = Fr(n);
    if (!r)
      continue;
    const a = _e.get(r.uuid), o = a ? $o(a, r) : mn(r);
    _e.set(o.uuid, o);
  }
}
function ft(e, t) {
  if (!e)
    return;
  const n = _e.get(e);
  if (!n)
    return;
  if (!Array.isArray(t) || t.length === 0) {
    const s = { ...n };
    delete s.positions, _e.set(e, s);
    return;
  }
  const r = (s, l) => {
    const u = s ? Ke(s) : {}, p = u;
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
      m != null && (p[g] = m);
    });
    const d = (g, m = []) => {
      const _ = l[g], h = s && s[g] && typeof s[g] == "object" ? s[g] : void 0;
      if (!_ || typeof _ != "object") {
        _ !== void 0 && (p[g] = _);
        return;
      }
      const y = {
        ...h ?? {},
        ..._
      };
      m.forEach((b) => {
        const S = h?.[b];
        S != null && (y[b] = S);
      }), p[g] = y;
    };
    return d("performance", ["gain_pct", "total_change_pct"]), d("aggregation"), d("average_cost"), d("data_state"), u;
  }, a = Array.isArray(n.positions) ? n.positions : [], o = new Map(
    a.filter((s) => s.security_uuid).map((s) => [s.security_uuid, s])
  ), i = t.filter((s) => !!s).map((s) => {
    const l = s.security_uuid ? o.get(s.security_uuid) : void 0;
    return r(l, s);
  }).map(Ke), c = {
    ...n,
    positions: i
  };
  _e.set(e, c);
}
function Lo() {
  return Array.from(_e.values(), (e) => mn(e));
}
function $r() {
  return {
    accounts: ko(),
    portfolios: Lo()
  };
}
const Mo = "unknown-account";
function X(e) {
  return typeof e != "number" || !Number.isFinite(e) ? null : e;
}
function Hn(e) {
  const t = X(e);
  return t == null ? 0 : Math.trunc(t);
}
function Q(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t.length > 0 ? t : null;
}
function kr(e, t) {
  return Q(e) ?? t;
}
function Tr(e) {
  return e == null || !Number.isFinite(e) ? null : e < 0 ? 0 : e > 1 ? 1 : e;
}
function Rr(e) {
  return e.split(/[\s_-]+/).filter(Boolean).map(
    (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
  ).join(" ");
}
function Lr(e) {
  const t = Ho(e);
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
function Ho(e) {
  const t = Q(e);
  if (!t)
    return null;
  const n = Io(t);
  return n || Rr(t);
}
function Io(e) {
  const t = e.trim();
  if (!t.startsWith("{") && !t.startsWith("["))
    return null;
  try {
    const n = JSON.parse(t), r = Vo(n), a = n && typeof n == "object" ? Q(
      n.provider ?? n.source
    ) : null;
    if (r.length && a)
      return `${Rr(a)} (${r.join(", ")})`;
    if (r.length)
      return `FX (${r.join(", ")})`;
  } catch {
    return null;
  }
  return null;
}
function Vo(e) {
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
function zo(e) {
  if (!e)
    return null;
  const t = Q(e.uuid) ?? `${Mo}-${e.name ?? "0"}`, n = kr(e.name, "Unbenanntes Konto"), r = Q(e.currency_code), a = X(e.balance), o = X(e.orig_balance), i = "coverage_ratio" in e ? Tr(X(e.coverage_ratio)) : null, c = Q(e.provenance), s = Q(e.metric_run_uuid), l = e.fx_unavailable === !0, u = X(e.fx_rate), p = Q(e.fx_rate_source), f = Q(e.fx_rate_timestamp), d = [], g = Lr(c);
  g && d.push(g);
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
    fx_rate_source: p,
    fx_rate_timestamp: f,
    badges: d
  }, _ = typeof s == "string" ? s : null;
  return m.metric_run_uuid = _, m;
}
function Uo(e) {
  if (!e)
    return null;
  const t = Q(e.uuid);
  if (!t)
    return null;
  const n = kr(e.name, "Unbenanntes Depot"), r = Hn(e.position_count), a = Hn(e.missing_value_positions), o = X(e.current_value), i = X(e.purchase_sum) ?? X(e.purchase_value_eur) ?? X(e.purchase_value) ?? 0, c = X(e.day_change_abs) ?? null, s = X(e.day_change_pct) ?? null, l = be(e.performance), u = l?.gain_abs ?? null, p = l?.gain_pct ?? null, f = l?.day_change ?? null;
  let d = c ?? (f?.value_change_eur != null ? X(f.value_change_eur) : null), g = s ?? (f?.change_pct != null ? X(f.change_pct) : null);
  if (d == null && g != null && o != null) {
    const N = o / (1 + g / 100);
    N && (d = o - N);
  }
  if (g == null && d != null && o != null) {
    const N = o - d;
    N && (g = d / N * 100);
  }
  const m = o != null, _ = e.has_current_value === !1 || !m, h = "coverage_ratio" in e ? Tr(X(e.coverage_ratio)) : null, y = Q(e.provenance), b = Q(e.metric_run_uuid), S = [], w = Lr(y);
  w && S.push(w);
  const C = {
    uuid: t,
    name: n,
    position_count: r,
    current_value: o,
    purchase_sum: i,
    day_change_abs: d ?? null,
    day_change_pct: g ?? null,
    gain_abs: u,
    gain_pct: p,
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
function Mr() {
  const { accounts: e } = $r();
  return e.map(zo).filter((t) => !!t);
}
function qo() {
  const { portfolios: e } = $r();
  return e.map(Uo).filter((t) => !!t);
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
function Hr(e, t = {}) {
  if (!e || e.length === 0)
    return "";
  const n = ["meta-badges", t.containerClass].filter(Boolean).join(" "), r = e.map((a) => {
    const o = `meta-badge--${a.tone}`, i = a.description ? ` title="${Te(a.description)}"` : "";
    return `<span class="meta-badge ${o}"${i}>${Te(
      a.label
    )}</span>`;
  }).join("");
  return `<span class="${n}">${r}</span>`;
}
function pt(e, t, n = {}) {
  const r = Hr(t, n);
  if (!r)
    return Te(e);
  const a = n.labelClass ?? "name-with-badges__label";
  return `<span class="${["name-with-badges", n.containerClass].filter(Boolean).join(" ")}"><span class="${a}">${Te(
    e
  )}</span>${r}</span>`;
}
function Ir(e, t, n, r) {
  e[t] = {
    previous: n,
    current: r
  };
}
const ce = /* @__PURE__ */ new Map(), Oe = /* @__PURE__ */ new Map();
function Wo(e) {
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
function He(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t.length > 0 ? t : null;
}
function Ce(e) {
  return typeof e == "number" && Number.isFinite(e) ? e : void 0;
}
function Oo(e) {
  return e === null ? null : Ce(e);
}
function Bo(e) {
  return e === null ? null : He(e);
}
function In(e) {
  return (e ?? []).filter(
    (t) => !t.key.endsWith("-coverage") && !t.key.startsWith("provenance-")
  );
}
function Vn(e) {
  return be(e.performance);
}
const jo = 500, Ko = 10, Yo = "pp-reader:portfolio-positions-updated", Go = "pp-reader:diagnostics", Tt = /* @__PURE__ */ new Map(), Vr = [
  "coverage_ratio",
  "provenance",
  "metric_run_uuid",
  "generated_at"
], jt = /* @__PURE__ */ new Map();
function Xo(e, t) {
  return `${e}:${t}`;
}
function Zo(e) {
  if (e === void 0)
    return;
  if (e === null)
    return null;
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  const t = Oo(e);
  if (t === null)
    return null;
  if (typeof t == "number" && Number.isFinite(t))
    return t;
}
function Rt(e) {
  if (e !== void 0)
    return Bo(e);
}
function yn(e, t, n, r) {
  const a = {}, o = Zo(e);
  o !== void 0 && (a.coverage_ratio = o);
  const i = Rt(t);
  i !== void 0 && (a.provenance = i);
  const c = Rt(n);
  c !== void 0 && (a.metric_run_uuid = c);
  const s = Rt(r);
  return s !== void 0 && (a.generated_at = s), Object.keys(a).length > 0 ? a : null;
}
function Jo(e, t) {
  const n = {};
  let r = !1;
  for (const a of Vr) {
    const o = e?.[a], i = t[a];
    o !== i && (Ir(n, a, o, i), r = !0);
  }
  return r ? n : null;
}
function Qo(e) {
  const t = {};
  let n = !1;
  for (const r of Vr) {
    const a = e[r];
    a !== void 0 && (Ir(t, r, a, void 0), n = !0);
  }
  return n ? t : null;
}
function zn(e) {
  if (Object.keys(e.changed).length) {
    try {
      console.debug("pp-reader:diagnostics", e);
    } catch {
    }
    if (!(typeof window > "u" || typeof window.dispatchEvent != "function"))
      try {
        window.dispatchEvent(new CustomEvent(Go, { detail: e }));
      } catch (t) {
        console.warn("updateConfigsWS: Diagnostics-Event konnte nicht gesendet werden", t);
      }
  }
}
function _n(e, t, n, r) {
  const a = Xo(e, n), o = Tt.get(a);
  if (!r) {
    if (!o)
      return;
    Tt.delete(a);
    const c = Qo(o);
    if (!c)
      return;
    zn({
      kind: e,
      uuid: n,
      source: t,
      changed: c,
      snapshot: {},
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    return;
  }
  const i = Jo(o, r);
  i && (Tt.set(a, { ...r }), zn({
    kind: e,
    uuid: n,
    source: t,
    changed: i,
    snapshot: { ...r },
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  }));
}
function ei(e) {
  if (!(!e || e.length === 0))
    for (const t of e) {
      const n = He(t.uuid);
      if (!n)
        continue;
      const r = yn(
        t.coverage_ratio,
        t.provenance,
        t.metric_run_uuid,
        void 0
      );
      _n("account", "accounts", n, r);
    }
}
function ti(e) {
  if (!(!e || e.length === 0))
    for (const t of e) {
      const n = He(t.uuid);
      if (!n)
        continue;
      const r = yn(
        t.coverage_ratio,
        t.provenance,
        t.metric_run_uuid,
        void 0
      );
      _n("portfolio", "portfolio_values", n, r);
    }
}
function ni(e, t) {
  if (!t)
    return;
  const n = yn(
    t.coverage_ratio ?? t.normalized_payload?.coverage_ratio,
    t.provenance ?? t.normalized_payload?.provenance,
    t.metric_run_uuid ?? t.normalized_payload?.metric_run_uuid,
    t.normalized_payload?.generated_at
  );
  _n("portfolio_positions", "portfolio_positions", e, n);
}
function ri(e, t) {
  return `<div class="error">${Wo(e)} <button class="retry-pos" data-portfolio="${t}">Erneut laden</button></div>`;
}
function ai(e, t, n) {
  const r = e.querySelector("table.sortable-positions");
  if (!r) return;
  const a = e.dataset.sortKey || r.dataset.defaultSort || "name", i = (e.dataset.sortDir || r.dataset.defaultDir || "asc") === "desc" ? "desc" : "asc";
  e.dataset.sortKey = a, e.dataset.sortDir = i;
  try {
    gr(r, a, i, !0);
  } catch (l) {
    console.warn("restoreSortAndInit: sortTableRows Fehler:", l);
  }
  const { attachPortfolioPositionsSorting: c, attachSecurityDetailListener: s } = gn();
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
function zr(e, t, n, r) {
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
    return o.innerHTML = ri(r, t), { applied: !0 };
  const i = o.dataset.sortKey, c = o.dataset.sortDir;
  return o.innerHTML = pi(n), i && (o.dataset.sortKey = i), c && (o.dataset.sortDir = c), ai(o, e, t), { applied: !0 };
}
function bn(e, t) {
  const n = ce.get(t);
  if (!n) return !1;
  const r = zr(
    e,
    t,
    n.positions,
    n.error
  );
  return r.applied && ce.delete(t), r.applied;
}
function oi(e) {
  let t = !1;
  for (const [n] of ce)
    bn(e, n) && (t = !0);
  return t;
}
function Ur(e, t) {
  const n = Oe.get(t) ?? {
    attempts: 0,
    timer: null
  };
  n.timer || (n.timer = setTimeout(() => {
    n.timer = null, n.attempts += 1;
    const r = bn(e, t);
    r || n.attempts >= Ko ? (Oe.delete(t), r || ce.delete(t)) : Ur(e, t);
  }, jo), Oe.set(t, n));
}
function ii(e, t) {
  console.log("updateConfigsWS: Kontodaten-Update erhalten:", e);
  const n = Array.isArray(e) ? e : [];
  if (Dr(n), ei(n), !t)
    return;
  const r = Mr();
  si(r, t);
  const a = t.querySelector(".portfolio-table table"), o = a ? Array.from(
    a.querySelectorAll("tbody tr.portfolio-row")
  ).map((i) => {
    const c = i.dataset.currentValue, s = c ? Number.parseFloat(c) : Number.NaN;
    if (Number.isFinite(s))
      return {
        current_value: s
      };
    const l = i.cells.item(3), u = st(l?.textContent);
    return {
      current_value: Number.isFinite(u) ? u : 0
    };
  }) : [];
  qr(r, o, t);
}
function si(e, t) {
  const n = t.querySelector(".account-table"), r = t.querySelector(".fx-account-table"), a = e.filter((i) => (i.currency_code || "EUR") === "EUR"), o = e.filter((i) => (i.currency_code || "EUR") !== "EUR");
  if (n) {
    const i = a.map((c) => ({
      name: pt(c.name, In(c.badges), {
        containerClass: "account-name",
        labelClass: "account-name__label"
      }),
      balance: c.balance ?? null
    }));
    n.innerHTML = $e(
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
      const s = c.orig_balance, l = typeof s == "number" && Number.isFinite(s), u = He(c.currency_code), p = l ? s.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) : null, f = p ? u ? `${p} ${u}` : p : "";
      return {
        name: pt(c.name, In(c.badges), {
          containerClass: "account-name",
          labelClass: "account-name__label"
        }),
        fx_display: f,
        balance: c.balance ?? null
      };
    });
    r.innerHTML = $e(
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
function ci(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = br(n);
    r && t.push(r);
  }
  return t;
}
function li(e, t) {
  if (!Array.isArray(e)) {
    console.warn("handlePortfolioUpdate: Update ist kein Array:", e);
    return;
  }
  try {
    console.debug("handlePortfolioUpdate: payload=", e);
  } catch {
  }
  const n = ci(e);
  if (n.length && Ro(n), ti(n), !t)
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
  const o = (p) => {
    if (typeof Intl < "u")
      try {
        const d = typeof navigator < "u" && navigator.language ? navigator.language : "de-DE";
        return new Intl.NumberFormat(d, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(p);
      } catch {
      }
    return (Et(p, { fallback: 0 }) ?? 0).toFixed(2).replace(".", ",");
  }, i = /* @__PURE__ */ new Map();
  a.querySelectorAll("tr.portfolio-row").forEach((p) => {
    const f = p.dataset.portfolio;
    f && i.set(f, p);
  });
  let s = 0;
  const l = (p) => {
    const f = typeof p == "number" && Number.isFinite(p) ? p : 0;
    try {
      return f.toLocaleString("de-DE");
    } catch {
      return f.toString();
    }
  }, u = /* @__PURE__ */ new Map();
  for (const p of n) {
    const f = He(p.uuid);
    f && u.set(f, p);
  }
  for (const [p, f] of u.entries()) {
    const d = i.get(p);
    if (!d)
      continue;
    d.cells.length < 8 && console.warn("handlePortfolioUpdate: Unerwartetes Spaltenlayout", d.cells.length);
    const g = d.cells.item(1), m = d.cells.item(2), _ = d.cells.item(3), h = d.cells.item(4), y = d.cells.item(5), b = d.cells.item(6), S = d.cells.item(7);
    if (!g || !m || !_)
      continue;
    const w = typeof f.position_count == "number" && Number.isFinite(f.position_count) ? f.position_count : 0, C = typeof f.current_value == "number" && Number.isFinite(f.current_value) ? f.current_value : null, A = be(f.performance), N = typeof A?.gain_abs == "number" ? A.gain_abs : null, D = typeof A?.gain_pct == "number" ? A.gain_pct : null, H = typeof f.purchase_sum == "number" && Number.isFinite(f.purchase_sum) ? f.purchase_sum : typeof f.purchase_value == "number" && Number.isFinite(f.purchase_value) ? f.purchase_value : null, P = A?.day_change ?? null, E = Ce(f.day_change_abs) ?? Ce(P?.value_change_eur) ?? Ce(P?.price_change_eur), I = Ce(f.day_change_pct) ?? Ce(P?.change_pct);
    let F = E ?? null, $ = I ?? null;
    if (F == null && $ != null && C != null) {
      const K = C / (1 + $ / 100);
      K && (F = C - K);
    }
    if ($ == null && F != null && C != null) {
      const K = C - F;
      K && ($ = F / K * 100);
    }
    const Y = typeof f.missing_value_positions == "number" && Number.isFinite(f.missing_value_positions) ? f.missing_value_positions : 0, v = C !== null, x = f.has_current_value === !1 || Y > 0 || !v, R = st(_.textContent);
    st(g.textContent) !== w && (g.textContent = l(w));
    const k = {
      fx_unavailable: x,
      current_value: C,
      performance: A
    }, V = { hasValue: v }, W = L("purchase_value", H, k, V);
    m.innerHTML !== W && (m.innerHTML = W);
    const B = L("current_value", k.current_value, k, V), G = typeof C == "number" ? C : 0;
    if ((Math.abs(R - G) >= 5e-3 || _.innerHTML !== B) && (_.innerHTML = B, d.classList.add("flash-update"), setTimeout(() => {
      d.classList.remove("flash-update");
    }, 800)), h && (h.innerHTML = L("day_change_abs", F, k, V)), y && (y.innerHTML = L("day_change_pct", $, k, V)), b) {
      const K = L("gain_abs", N, k, V);
      b.innerHTML = K;
      const ve = typeof D == "number" && Number.isFinite(D) ? D : null;
      b.dataset.gainPct = ve != null ? `${o(ve)} %` : "—", b.dataset.gainSign = ve != null ? ve > 0 ? "positive" : ve < 0 ? "negative" : "neutral" : "neutral";
    }
    S && (S.innerHTML = L("gain_pct", D, k, V)), d.dataset.positionCount = w.toString(), d.dataset.purchaseSum = H != null ? H.toString() : "", d.dataset.currentValue = v ? G.toString() : "", d.dataset.dayChange = v && F != null ? F.toString() : "", d.dataset.dayChangePct = v && $ != null ? $.toString() : "", d.dataset.gainAbs = N != null ? N.toString() : "", d.dataset.gainPct = D != null ? D.toString() : "", d.dataset.hasValue = v ? "true" : "false", d.dataset.fxUnavailable = x ? "true" : "false", d.dataset.coverageRatio = typeof f.coverage_ratio == "number" && Number.isFinite(f.coverage_ratio) ? f.coverage_ratio.toString() : "", d.dataset.provenance = typeof f.provenance == "string" ? f.provenance : "", d.dataset.metricRunUuid = typeof f.metric_run_uuid == "string" ? f.metric_run_uuid : "", s += 1;
  }
  if (s === 0)
    console.debug("handlePortfolioUpdate: Keine passenden Zeilen gefunden / keine Änderungen.");
  else {
    const p = s.toLocaleString("de-DE");
    console.debug(`handlePortfolioUpdate: ${p} Zeile(n) gepatcht.`);
  }
  try {
    gi(r);
  } catch (p) {
    console.warn("handlePortfolioUpdate: Fehler bei Summen-Neuberechnung:", p);
  }
  try {
    const p = (...h) => {
      for (const y of h) {
        if (!y) continue;
        const b = t.querySelector(y);
        if (b) return b;
      }
      return null;
    }, f = p(
      ".account-table table",
      ".accounts-eur-table table",
      ".accounts-table table"
    ), d = p(
      ".fx-account-table table",
      ".accounts-fx-table table"
    ), g = (h, y) => {
      if (!h) return [];
      const b = h.querySelectorAll("tbody tr.account-row");
      return (b.length ? Array.from(b) : Array.from(h.querySelectorAll("tbody tr:not(.footer-row)"))).map((w) => {
        const C = y ? w.cells.item(2) : w.cells.item(1);
        return { balance: st(C?.textContent) };
      });
    }, m = [
      ...g(f, !1),
      ...g(d, !0)
    ], _ = Array.from(
      r.querySelectorAll("tbody tr.portfolio-row")
    ).map((h) => {
      const y = h.dataset.currentValue, b = h.dataset.purchaseSum, S = y ? Number.parseFloat(y) : Number.NaN, w = b ? Number.parseFloat(b) : Number.NaN;
      return {
        current_value: Number.isFinite(S) ? S : 0,
        purchase_sum: Number.isFinite(w) ? w : 0
      };
    });
    qr(m, _, t);
  } catch (p) {
    console.warn("handlePortfolioUpdate: Fehler bei Total-Neuberechnung:", p);
  }
}
function ui(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e.portfolio_uuid;
  if (typeof t == "string" && t)
    return t;
  const n = e.portfolioUuid;
  return typeof n == "string" && n ? n : null;
}
function Kt(e) {
  jt.delete(e);
}
function Un(e) {
  return typeof e != "number" || !Number.isInteger(e) || e <= 0 ? null : e;
}
function di(e, t, n, r) {
  if (!n || n <= 1 || !t)
    return Kt(e), r;
  const a = n, o = jt.get(e) ?? { expected: a, chunks: /* @__PURE__ */ new Map() };
  if (o.expected !== a && (o.chunks.clear(), o.expected = a), o.chunks.set(t, r), jt.set(e, o), o.chunks.size < a)
    return null;
  const i = [];
  for (let c = 1; c <= a; c += 1) {
    const s = o.chunks.get(c);
    s && Array.isArray(s) && i.push(...s);
  }
  return Kt(e), i;
}
function qn(e, t) {
  const n = ui(e);
  if (!n)
    return console.warn("handlePortfolioPositionsUpdate: Ungültiges Update:", e), !1;
  const r = e?.error, a = Un(e?.chunk_index), o = Un(e?.chunk_count), i = Ft(e?.positions ?? []);
  r && Kt(n);
  const c = r ? i : di(n, a, o, i);
  if (!r && c === null)
    return !0;
  const s = r ? i : c ?? [];
  ni(n, e);
  const l = xt(n);
  let u = s;
  if (!r && l) {
    const f = dt(n, s);
    ft(n, f), u = f;
  }
  const p = zr(t, n, u, r);
  if (p.applied) {
    if (ce.delete(n), !r && !l) {
      const f = dt(n, u);
      ft(n, f);
    }
  } else
    r || p.reason !== "hidden" || l ? (ce.set(n, { positions: u, error: r }), Ur(t, n)) : (ce.delete(n), Oe.delete(n));
  if (!r && i.length > 0) {
    const f = Array.from(
      new Set(
        i.map((d) => d.security_uuid).filter((d) => typeof d == "string" && d.length > 0)
      )
    );
    if (f.length && typeof window < "u")
      try {
        window.dispatchEvent(
          new CustomEvent(
            Yo,
            {
              detail: {
                portfolioUuid: n,
                securityUuids: f
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
function fi(e, t) {
  if (Array.isArray(e)) {
    let n = !1;
    for (const r of e)
      qn(r, t) && (n = !0);
    !n && e.length && console.warn("handlePortfolioPositionsUpdate: Kein gültiges Element im Array:", e);
    return;
  }
  qn(e, t);
}
function pi(e) {
  const { renderPositionsTable: t, applyGainPctMetadata: n } = gn();
  try {
    if (typeof t == "function")
      return t(e);
  } catch {
  }
  if (e.length === 0)
    return '<div class="no-positions">Keine Positionen vorhanden.</div>';
  const r = e.map((o) => {
    const i = Vn(o);
    return {
      name: o.name,
      current_holdings: o.current_holdings,
      purchase_value: o.purchase_value,
      current_value: o.current_value,
      performance: i
    };
  }), a = $e(
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
      c.forEach((p, f) => {
        const d = s[f];
        d && (p.setAttribute("data-sort-key", d), p.classList.add("sortable-col"));
      }), i.querySelectorAll("tbody tr").forEach((p, f) => {
        if (p.classList.contains("footer-row"))
          return;
        const d = e[f];
        d.security_uuid && (p.dataset.security = d.security_uuid), p.classList.add("position-row");
      }), i.dataset.defaultSort = "name", i.dataset.defaultDir = "asc";
      const u = n;
      if (u)
        try {
          u(i);
        } catch (p) {
          console.warn("renderPositionsTableInline: applyGainPctMetadata failed", p);
        }
      else
        i.querySelectorAll("tbody tr").forEach((f, d) => {
          if (f.classList.contains("footer-row"))
            return;
          const g = f.cells.item(4);
          if (!g)
            return;
          const m = e[d], _ = Vn(m), h = typeof _?.gain_pct == "number" && Number.isFinite(_.gain_pct) ? _.gain_pct : null, y = h != null ? `${h.toLocaleString("de-DE", {
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
function gi(e) {
  if (!e) return;
  const { updatePortfolioFooter: t } = gn();
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
  }, u = { hasValue: o }, p = L("current_value", l.current_value, l, u), f = o ? a.sumGainAbs : null, d = o ? i : null, g = L("gain_abs", f, l, u), m = L("gain_pct", d, l, u);
  c.innerHTML = `
    <td>Summe</td>
    <td class="align-right">${s}</td>
    <td class="align-right">${p}</td>
    <td class="align-right">${g}</td>
    <td class="align-right">${m}</td>
  `;
  const _ = c.cells.item(3);
  _ && (_.dataset.gainPct = o && typeof i == "number" ? `${Yt(i)} %` : "—", _.dataset.gainSign = o && typeof i == "number" ? i > 0 ? "positive" : i < 0 ? "negative" : "neutral" : "neutral"), c.dataset.positionCount = Math.round(a.sumPositions).toString(), c.dataset.currentValue = o ? a.sumCurrent.toString() : "", c.dataset.purchaseSum = o ? a.sumPurchase.toString() : "", c.dataset.gainAbs = o ? a.sumGainAbs.toString() : "", c.dataset.gainPct = o && typeof i == "number" ? i.toString() : "", c.dataset.hasValue = o ? "true" : "false", c.dataset.fxUnavailable = a.fxUnavailable || !o ? "true" : "false";
}
function Wn(e) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  if (typeof e == "string") {
    const t = Number.parseFloat(e);
    return Number.isFinite(t) ? t : 0;
  }
  return 0;
}
function Yt(e) {
  return (Et(e, { fallback: 0 }) ?? 0).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
function qr(e, t, n) {
  const r = n ?? document, o = (Array.isArray(e) ? e : []).reduce((p, f) => {
    const d = f.balance ?? f.current_value ?? f.value, g = Wn(d);
    return p + g;
  }, 0), c = (Array.isArray(t) ? t : []).reduce((p, f) => {
    const d = f.current_value ?? f.value, g = Wn(d);
    return p + g;
  }, 0), s = o + c, l = r.querySelector("#headerMeta");
  if (!l) {
    console.warn("updateTotalWealth: #headerMeta nicht gefunden.");
    return;
  }
  const u = l.querySelector("strong") || l.querySelector(".total-wealth-value");
  u ? u.textContent = `${Yt(s)} €` : l.textContent = `💰 Gesamtvermögen: ${Yt(s)} €`, l.dataset.totalWealthEur = s.toString();
}
function hi(e, t) {
  const n = typeof e == "string" ? e : e?.last_file_update, r = He(n) ?? "";
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
function Cc(e) {
  if (e == null)
    return;
  const t = e.querySelector("table.sortable-positions");
  if (t == null)
    return;
  const n = e.dataset.sortKey || t.dataset.defaultSort || "name", a = (e.dataset.sortDir || t.dataset.defaultDir || "asc") === "desc" ? "desc" : "asc";
  e.dataset.sortKey = n, e.dataset.sortDir = a, gr(t, n, a, !0);
}
const Nc = {
  getPortfolioPositionsCacheSnapshot: Eo,
  clearPortfolioPositionsCache: No,
  getPendingUpdateCount() {
    return ce.size;
  },
  queuePendingUpdate(e, t, n) {
    ce.set(e, { positions: t, error: n });
  },
  clearPendingUpdates() {
    ce.clear(), Oe.clear();
  }
};
function st(e) {
  return e == null ? 0 : parseFloat(
    e.replace(/\u00A0/g, " ").replace(/[€%]/g, "").replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "")
  ) || 0;
}
const mi = [
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
  return mi.includes(e);
}
function Mt(e) {
  return e === "asc" || e === "desc";
}
function Wr(e) {
  return (e ?? []).filter((t) => !t.key.endsWith("-coverage"));
}
function On(e) {
  return Wr(e).filter(
    (t) => !t.key.startsWith("provenance-")
  );
}
let gt = null, ht = null;
const Bn = { min: 2, max: 6 };
function ze(e) {
  return de(e);
}
function yi(e) {
  return typeof e == "number" && Number.isFinite(e);
}
function _i(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  if (!t)
    return null;
  const n = t.toUpperCase();
  return /^[A-Z]{3}$/.test(n) ? n : n === "€" ? "EUR" : null;
}
function jn(e, t, n = null) {
  for (const r of t) {
    const a = _i(e[r]);
    if (a)
      return a;
  }
  return n;
}
function Kn(e, t) {
  return yi(e) ? `${e.toLocaleString("de-DE", {
    minimumFractionDigits: Bn.min,
    maximumFractionDigits: Bn.max
  })}${t ? ` ${t}` : ""}` : null;
}
function bi(e) {
  const t = e, n = e.average_cost ?? null, r = e.aggregation ?? null, a = jn(t, [
    "security_currency_code",
    "security_currency",
    "native_currency_code",
    "native_currency"
  ], e.currency_code ?? null), o = jn(
    t,
    [
      "account_currency_code",
      "account_currency",
      "purchase_currency_code",
      "currency_code"
    ],
    a === "EUR" ? "EUR" : null
  ) ?? "EUR", i = ze(n?.native), c = ze(n?.security), s = ze(n?.account), l = ze(n?.eur), u = c ?? i, p = l ?? (o === "EUR" ? s : null), f = a ?? o, d = f === "EUR";
  let g, m;
  d ? (g = "EUR", m = p ?? u ?? s ?? null) : u != null ? (g = f, m = u) : s != null ? (g = o, m = s) : (g = "EUR", m = p ?? null);
  const _ = Kn(m, g), h = d ? null : Kn(p, "EUR"), y = !!h && h !== _, b = [], S = [];
  _ ? (b.push(
    `<span class="purchase-price purchase-price--primary">${_}</span>`
  ), S.push(_.replace(/\u00A0/g, " "))) : (b.push('<span class="missing-value" role="note" aria-label="Kein Kaufpreis verfügbar" title="Kein Kaufpreis verfügbar">—</span>'), S.push("Kein Kaufpreis verfügbar")), y && h && (b.push(
    `<span class="purchase-price purchase-price--secondary">${h}</span>`
  ), S.push(h.replace(/\u00A0/g, " ")));
  const w = b.join("<br>"), C = ze(r?.purchase_value_eur) ?? 0, A = S.join(", ");
  return { markup: w, sortValue: C, ariaLabel: A };
}
function vi(e) {
  const t = de(e.current_holdings);
  if (t == null)
    return { value: null, pct: null };
  const n = de(e.last_price_eur), r = de(e.last_close_eur);
  let a = null, o = null;
  if (n != null && r != null) {
    a = (n - r) * t;
    const p = r * t;
    p && (o = a / p * 100);
  }
  const c = be(e.performance)?.day_change ?? null;
  if (a == null && c?.price_change_eur != null && (a = c.price_change_eur * t), o == null && c?.change_pct != null && (o = c.change_pct), a == null && o != null) {
    const u = de(e.current_value);
    if (u != null) {
      const p = u / (1 + o / 100);
      p && (a = u - p);
    }
  }
  const s = a != null && Number.isFinite(a) ? Math.round(a * 100) / 100 : null, l = o != null && Number.isFinite(o) ? Math.round(o * 100) / 100 : null;
  return { value: s, pct: l };
}
const mt = /* @__PURE__ */ new Set();
function Or(e) {
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
function Ye(e) {
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
    const o = be(a.performance), i = typeof o?.gain_abs == "number" ? o.gain_abs : null, c = typeof o?.gain_pct == "number" ? o.gain_pct : null, s = vi(a), l = typeof a.purchase_value == "number" || typeof a.purchase_value == "string" ? a.purchase_value : null;
    return {
      name: typeof a.name == "string" ? Te(a.name) : typeof a.name == "number" ? String(a.name) : "",
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
  }), r = $e(n, t, ["purchase_value", "current_value", "day_change_abs", "gain_abs"]);
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
        const u = e[l], p = typeof u.security_uuid == "string" ? u.security_uuid : null;
        p && (s.dataset.security = p), s.classList.add("position-row");
        const f = s.cells.item(2);
        if (f) {
          const { markup: m, sortValue: _, ariaLabel: h } = bi(u);
          f.innerHTML = m, f.dataset.sortValue = String(_), h ? f.setAttribute("aria-label", h) : f.removeAttribute("aria-label");
        }
        const d = s.cells.item(7);
        if (d) {
          const m = be(u.performance), _ = typeof m?.gain_pct == "number" && Number.isFinite(m.gain_pct) ? m.gain_pct : null, h = _ != null ? `${_.toLocaleString("de-DE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })} %` : "—", y = _ == null ? "neutral" : _ > 0 ? "positive" : _ < 0 ? "negative" : "neutral";
          d.dataset.gainPct = h, d.dataset.gainSign = y;
        }
        const g = s.cells.item(8);
        g && g.classList.add("gain-pct-cell");
      }), o.dataset.defaultSort = "name", o.dataset.defaultDir = "asc", Or(o), o.outerHTML;
    }
  } catch (a) {
    console.warn("renderPositionsTable: Konnte Sortier-Metadaten nicht injizieren:", a);
  }
  return r;
}
function Si(e) {
  const t = Ft(e ?? []);
  return Ye(t);
}
function wi(e, t) {
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
        xa(s) || console.warn("attachSecurityDetailDelegation: Detail-Tab konnte nicht geöffnet werden für", s);
      } catch (l) {
        console.error("attachSecurityDetailDelegation: Fehler beim Öffnen des Detail-Tabs", l);
      }
  })));
}
function Ge(e, t) {
  wi(e, t);
}
function Br(e) {
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
    const x = Number.isFinite(v.position_count) ? v.position_count : 0, R = Number.isFinite(v.purchase_sum) ? v.purchase_sum : 0, j = v.hasValue && typeof v.current_value == "number" && Number.isFinite(v.current_value) ? v.current_value : null, k = j !== null, V = v.performance, W = typeof v.gain_abs == "number" ? v.gain_abs : typeof V?.gain_abs == "number" ? V.gain_abs : null, B = typeof v.gain_pct == "number" ? v.gain_pct : typeof V?.gain_pct == "number" ? V.gain_pct : null, G = V && typeof V == "object" ? V.day_change : null, K = typeof v.day_change_abs == "number" ? v.day_change_abs : G && typeof G == "object" ? G.value_change_eur ?? G.price_change_eur : null, Ie = typeof v.day_change_pct == "number" ? v.day_change_pct : G && typeof G == "object" && typeof G.change_pct == "number" ? G.change_pct : null, ve = v.fx_unavailable && k, Da = typeof v.coverage_ratio == "number" && Number.isFinite(v.coverage_ratio) ? v.coverage_ratio : "", $a = typeof v.provenance == "string" ? v.provenance : "", ka = typeof v.metric_run_uuid == "string" ? v.metric_run_uuid : "", Ve = mt.has(v.uuid), Ta = Ve ? "portfolio-toggle expanded" : "portfolio-toggle", En = `portfolio-details-${v.uuid}`, Z = {
      fx_unavailable: v.fx_unavailable,
      purchase_value: R,
      current_value: j,
      day_change_abs: K,
      day_change_pct: Ie,
      gain_abs: W,
      gain_pct: B
    }, Ae = { hasValue: k }, Ra = L("purchase_value", Z.purchase_value, Z, Ae), La = L("current_value", Z.current_value, Z, Ae), Ma = L("day_change_abs", Z.day_change_abs, Z, Ae), Ha = L("day_change_pct", Z.day_change_pct, Z, Ae), Ia = L("gain_abs", Z.gain_abs, Z, Ae), Va = L("gain_pct", Z.gain_pct, Z, Ae), xn = k && typeof B == "number" && Number.isFinite(B) ? `${ne(B)} %` : "", za = k && typeof B == "number" && Number.isFinite(B) ? B > 0 ? "positive" : B < 0 ? "negative" : "neutral" : "", Ua = k && typeof j == "number" && Number.isFinite(j) ? j : "", qa = k && typeof W == "number" && Number.isFinite(W) ? W : "", Wa = k && typeof B == "number" && Number.isFinite(B) ? B : "", Oa = k && typeof K == "number" && Number.isFinite(K) ? K : "", Ba = k && typeof Ie == "number" && Number.isFinite(Ie) ? Ie : "", ja = String(x);
    let $t = "";
    xn && ($t = ` data-gain-pct="${t(xn)}" data-gain-sign="${t(za)}"`), ve && ($t += ' data-partial="true"'), n += `<tr class="portfolio-row"
                  data-portfolio="${v.uuid}"
                  data-position-count="${ja}"
                  data-current-value="${t(Ua)}"
                  data-purchase-sum="${t(R)}"
                  data-day-change="${t(Oa)}"
                  data-day-change-pct="${t(Ba)}"
                  data-gain-abs="${t(qa)}"
                data-gain-pct="${t(Wa)}"
                data-has-value="${k ? "true" : "false"}"
                data-fx-unavailable="${v.fx_unavailable ? "true" : "false"}"
                data-coverage-ratio="${t(Da)}"
                data-provenance="${t($a)}"
                data-metric-run-uuid="${t(ka)}">`;
    const Ka = Te(v.name), Ya = Hr(Wr(v.badges), {
      containerClass: "portfolio-badges"
    });
    n += `<td>
        <button type="button"
                class="${Ta}"
                data-portfolio="${v.uuid}"
                aria-expanded="${Ve ? "true" : "false"}"
                aria-controls="${En}">
          <span class="caret">${Ve ? "▼" : "▶"}</span>
          <span class="portfolio-name">${Ka}</span>${Ya}
        </button>
      </td>`;
    const Ga = x.toLocaleString("de-DE");
    n += `<td class="align-right">${Ga}</td>`, n += `<td class="align-right">${Ra}</td>`, n += `<td class="align-right">${La}</td>`, n += `<td class="align-right">${Ma}</td>`, n += `<td class="align-right">${Ha}</td>`, n += `<td class="align-right"${$t}>${Ia}</td>`, n += `<td class="align-right gain-pct-cell">${Va}</td>`, n += "</tr>", n += `<tr class="portfolio-details${Ve ? "" : " hidden"}"
                data-portfolio="${v.uuid}"
                id="${En}"
                role="region"
                aria-label="Positionen für ${v.name}">
      <td colspan="${r.length.toString()}">
        <div class="positions-container">${Ve ? xt(v.uuid) ? Ye(Er(v.uuid)) : '<div class="loading">Lade Positionen...</div>' : ""}</div>
      </td>
    </tr>`;
  });
  const a = e.filter((v) => typeof v.current_value == "number" && Number.isFinite(v.current_value)), o = e.reduce((v, x) => v + (Number.isFinite(x.position_count) ? x.position_count : 0), 0), i = a.reduce((v, x) => typeof x.current_value == "number" && Number.isFinite(x.current_value) ? v + x.current_value : v, 0), c = a.reduce((v, x) => typeof x.purchase_sum == "number" && Number.isFinite(x.purchase_sum) ? v + x.purchase_sum : v, 0), s = a.map((v) => {
    if (typeof v.day_change_abs == "number")
      return v.day_change_abs;
    const x = v.performance && typeof v.performance == "object" ? v.performance.day_change : null;
    if (x && typeof x == "object") {
      const R = x.value_change_eur;
      if (typeof R == "number" && Number.isFinite(R))
        return R;
    }
    return null;
  }).filter((v) => typeof v == "number" && Number.isFinite(v)), l = s.reduce((v, x) => v + x, 0), u = a.reduce((v, x) => {
    if (typeof x.performance?.gain_abs == "number" && Number.isFinite(x.performance.gain_abs))
      return v + x.performance.gain_abs;
    const R = typeof x.current_value == "number" && Number.isFinite(x.current_value) ? x.current_value : 0, j = typeof x.purchase_sum == "number" && Number.isFinite(x.purchase_sum) ? x.purchase_sum : 0;
    return v + (R - j);
  }, 0), p = a.length > 0, f = a.length !== e.length, d = s.length > 0, g = d && p && i !== 0 ? (() => {
    const v = i - l;
    return v ? l / v * 100 : null;
  })() : null, m = p && c > 0 ? u / c * 100 : null, _ = {
    fx_unavailable: f,
    purchase_value: p ? c : null,
    current_value: p ? i : null,
    day_change_abs: d ? l : null,
    day_change_pct: d ? g : null,
    gain_abs: p ? u : null,
    gain_pct: p ? m : null
  }, h = { hasValue: p }, y = { hasValue: d }, b = L("purchase_value", _.purchase_value, _, h), S = L("current_value", _.current_value, _, h), w = L("day_change_abs", _.day_change_abs, _, y), C = L("day_change_pct", _.day_change_pct, _, y), A = L("gain_abs", _.gain_abs, _, h), N = L("gain_pct", _.gain_pct, _, h);
  let D = "";
  if (p && typeof m == "number" && Number.isFinite(m)) {
    const v = `${ne(m)} %`, x = m > 0 ? "positive" : m < 0 ? "negative" : "neutral";
    D = ` data-gain-pct="${t(v)}" data-gain-sign="${t(x)}"`;
  }
  f && (D += ' data-partial="true"');
  const H = String(Math.round(o)), P = p ? String(i) : "", E = p ? String(c) : "", I = d ? String(l) : "", F = d && typeof g == "number" && Number.isFinite(g) ? String(g) : "", $ = p ? String(u) : "", Y = p && typeof m == "number" && Number.isFinite(m) ? String(m) : "";
  return n += `<tr class="footer-row"
      data-position-count="${H}"
      data-current-value="${t(P)}"
      data-purchase-sum="${t(E)}"
      data-day-change="${t(I)}"
      data-day-change-pct="${t(F)}"
      data-gain-abs="${t($)}"
      data-gain-pct="${t(Y)}"
      data-has-value="${p ? "true" : "false"}"
      data-fx-unavailable="${f ? "true" : "false"}">
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
function Pi(e) {
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
function Ue(e) {
  if (e === void 0)
    return null;
  const t = Number(e);
  return Number.isFinite(t) ? t : null;
}
function jr(e) {
  const t = Pi(e);
  if (!t)
    return;
  const n = t.tBodies.item(0);
  if (!n)
    return;
  const r = Array.from(n.querySelectorAll("tr.portfolio-row"));
  if (!r.length)
    return;
  let a = 0, o = 0, i = 0, c = 0, s = 0, l = !1, u = !1, p = !0, f = !1;
  for (const R of r) {
    const j = Ue(R.dataset.positionCount);
    j != null && (a += j), R.dataset.fxUnavailable === "true" && (f = !0);
    const k = R.dataset.hasValue;
    if (!!(k === "false" || k === "0" || k === "" || k == null)) {
      p = !1;
      continue;
    }
    l = !0;
    const W = Ue(R.dataset.currentValue), B = Ue(R.dataset.gainAbs), G = Ue(R.dataset.purchaseSum), K = Ue(R.dataset.dayChange);
    if (W == null || B == null || G == null) {
      p = !1;
      continue;
    }
    o += W, c += B, i += G, K != null && (s += K, u = !0);
  }
  const d = l && p, g = d && i > 0 ? c / i * 100 : null, m = u && d && o !== 0 ? (() => {
    const R = o - s;
    return R ? s / R * 100 : null;
  })() : null;
  let _ = Array.from(n.children).find(
    (R) => R instanceof HTMLTableRowElement && R.classList.contains("footer-row")
  );
  _ || (_ = document.createElement("tr"), _.classList.add("footer-row"), n.appendChild(_));
  const h = Math.round(a).toLocaleString("de-DE"), y = {
    fx_unavailable: f || !d,
    purchase_value: d ? i : null,
    current_value: d ? o : null,
    day_change_abs: u && d ? s : null,
    day_change_pct: u && d ? m : null,
    gain_abs: d ? c : null,
    gain_pct: d ? g : null
  }, b = { hasValue: d }, S = { hasValue: u && d }, w = L("purchase_value", y.purchase_value, y, b), C = L("current_value", y.current_value, y, b), A = L("day_change_abs", y.day_change_abs, y, S), N = L("day_change_pct", y.day_change_pct, y, S), D = L("gain_abs", y.gain_abs, y, b), H = L("gain_pct", y.gain_pct, y, b), P = t.tHead ? t.tHead.rows.item(0) : null, E = P ? P.cells.length : 0, I = _.cells.length, F = E || I, $ = F > 0 ? F <= 5 : !1, Y = d && typeof g == "number" ? `${ne(g)} %` : "", v = d && typeof g == "number" ? g > 0 ? "positive" : g < 0 ? "negative" : "neutral" : "neutral";
  $ ? _.innerHTML = `
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
  const x = _.cells.item($ ? 3 : 6);
  x && (x.dataset.gainPct = Y || "—", x.dataset.gainSign = v), _.dataset.positionCount = String(Math.round(a)), _.dataset.currentValue = d ? String(o) : "", _.dataset.purchaseSum = d ? String(i) : "", _.dataset.dayChange = d && u ? String(s) : "", _.dataset.dayChangePct = d && u && typeof m == "number" ? String(m) : "", _.dataset.gainAbs = d ? String(c) : "", _.dataset.gainPct = d && typeof g == "number" ? String(g) : "", _.dataset.hasValue = d ? "true" : "false", _.dataset.fxUnavailable = f ? "true" : "false";
}
function Xe(e, t) {
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
  const o = (f, d) => {
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
      }[f], A = b.cells.item(C), N = S.cells.item(C);
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
        const $ = I ? I.dataset.sortValue : void 0;
        if ($ != null && $ !== "") {
          const Y = Number($);
          if (Number.isFinite(Y))
            return Y;
        }
        return h(F);
      };
      let E;
      if (f === "name")
        E = D.localeCompare(H, "de", { sensitivity: "base" });
      else {
        const I = P(A, D), F = P(N, H);
        E = I - F;
      }
      return d === "asc" ? E : -E;
    }), a.querySelectorAll("thead th.sort-active").forEach((b) => {
      b.classList.remove("sort-active", "dir-asc", "dir-desc");
    });
    const y = a.querySelector(`thead th[data-sort-key="${f}"]`);
    y && y.classList.add("sort-active", d === "asc" ? "dir-asc" : "dir-desc"), m.forEach((b) => g.appendChild(b)), _ && g.appendChild(_);
  }, i = r.dataset.sortKey, c = r.dataset.sortDir, s = a.dataset.defaultSort, l = a.dataset.defaultDir, u = Lt(i) ? i : Lt(s) ? s : "name", p = Mt(c) ? c : Mt(l) ? l : "asc";
  o(u, p), a.addEventListener("click", (f) => {
    const d = f.target;
    if (!(d instanceof Element))
      return;
    const g = d.closest("th[data-sort-key]");
    if (!g || !a.contains(g)) return;
    const m = g.getAttribute("data-sort-key");
    if (!Lt(m))
      return;
    let _ = "asc";
    r.dataset.sortKey === m && (_ = (Mt(r.dataset.sortDir) ? r.dataset.sortDir : "asc") === "asc" ? "desc" : "asc"), r.dataset.sortKey = m, r.dataset.sortDir = _, o(m, _);
  });
}
async function Ai(e, t, n) {
  if (!e || !gt || !ht) return;
  const r = t || n.querySelector(
    `.portfolio-details[data-portfolio="${e}"] .positions-container`
  );
  if (!r)
    return;
  const a = r.closest(".portfolio-details");
  if (!(a && a.classList.contains("hidden"))) {
    r.innerHTML = '<div class="loading">Neu laden...</div>';
    try {
      const o = await Ar(
        gt,
        ht,
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
      dt(e, i), ft(e, i), r.innerHTML = Ye(i);
      try {
        Xe(n, e);
      } catch (c) {
        console.warn("attachPortfolioToggleHandler: Sort-Init (Lazy) fehlgeschlagen:", c);
      }
      try {
        Ge(n, e);
      } catch (c) {
        console.warn("reloadPortfolioPositions: Security-Listener konnte nicht gebunden werden:", c);
      }
    } catch (o) {
      const i = o instanceof Error ? o.message : String(o);
      r.innerHTML = `<div class="error">Fehler: ${i} <button class="retry-pos" data-portfolio="${e}">Retry</button></div>`;
    }
  }
}
async function Ci(e, t, n = 3e3, r = 50) {
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
function vn(e) {
  const n = (typeof e.__ppReaderAttachToken == "number" ? e.__ppReaderAttachToken : 0) + 1;
  e.__ppReaderAttachToken = n, e.__ppReaderAttachInProgress = !0, (async () => {
    try {
      const r = await Ci(e, ".portfolio-table");
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
              const d = c.getAttribute("data-portfolio");
              if (d) {
                const m = e.querySelector(
                  `.portfolio-details[data-portfolio="${d}"]`
                )?.querySelector(".positions-container");
                await Ai(d, m ?? null, e);
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
            const p = s.querySelector(".caret");
            if (u.classList.contains("hidden")) {
              u.classList.remove("hidden"), s.classList.add("expanded"), s.setAttribute("aria-expanded", "true"), p && (p.textContent = "▼"), mt.add(l);
              try {
                bn(e, l);
              } catch (d) {
                console.warn("attachPortfolioToggleHandler: Pending-Flush fehlgeschlagen:", d);
              }
              if (xt(l)) {
                const d = u.querySelector(".positions-container");
                if (d) {
                  d.innerHTML = Ye(
                    Er(l)
                  ), Xe(e, l);
                  try {
                    Ge(e, l);
                  } catch (g) {
                    console.warn("attachPortfolioToggleHandler: Security-Listener (Cache) Fehler:", g);
                  }
                }
              } else {
                const d = u.querySelector(".positions-container");
                d && (d.innerHTML = '<div class="loading">Lade Positionen...</div>');
                try {
                  const g = await Ar(
                    gt,
                    ht,
                    l
                  );
                  if (g.error) {
                    const _ = typeof g.error == "string" ? g.error : String(g.error);
                    d && (d.innerHTML = `<div class="error">${_} <button class="retry-pos" data-portfolio="${l}">Erneut laden</button></div>`);
                    return;
                  }
                  const m = Ft(
                    Array.isArray(g.positions) ? g.positions : []
                  );
                  if (dt(l, m), ft(
                    l,
                    m
                  ), d) {
                    d.innerHTML = Ye(m);
                    try {
                      Xe(e, l);
                    } catch (_) {
                      console.warn("attachPortfolioToggleHandler: Sort-Init (Lazy) fehlgeschlagen:", _);
                    }
                    try {
                      Ge(e, l);
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
              u.classList.add("hidden"), s.classList.remove("expanded"), s.setAttribute("aria-expanded", "false"), p && (p.textContent = "▶"), mt.delete(l);
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
function Ni(e) {
  const t = e.querySelector(".expandable-portfolio-table");
  t && (t.__ppReaderPortfolioFallbackBound || (t.__ppReaderPortfolioFallbackBound = !0, t.addEventListener("click", (n) => {
    const r = n.target;
    !(r instanceof Element) || !r.closest(".portfolio-toggle") || e.querySelector(".portfolio-table")?.__ppReaderPortfolioToggleBound || (console.debug("Fallback-Listener aktiv – re-attach Hauptlistener"), vn(e));
  })));
}
async function Kr(e, t, n) {
  gt = t ?? null, ht = n ?? null, console.debug(
    "renderDashboard: start – panelConfig:",
    n?.config,
    "derived entry_id?",
    n?.config?._panel_custom?.config?.entry_id
  );
  const r = await oo(t, n);
  Dr(r.accounts);
  const a = Mr(), o = await so(t, n);
  To(o.portfolios);
  const i = qo();
  let c = "";
  try {
    c = await io(t, n);
  } catch {
    c = "";
  }
  const s = a.reduce(
    (P, E) => P + (typeof E.balance == "number" && Number.isFinite(E.balance) ? E.balance : 0),
    0
  ), l = i.some((P) => P.fx_unavailable), u = a.some((P) => P.fx_unavailable && (P.balance == null || !Number.isFinite(P.balance))), p = i.reduce((P, E) => E.hasValue && typeof E.current_value == "number" && Number.isFinite(E.current_value) ? P + E.current_value : P, 0), f = s + p, d = "Teilw. fehlende FX-Kurse – Gesamtvermögen abweichend", m = i.some((P) => P.hasValue && typeof P.current_value == "number" && Number.isFinite(P.current_value)) || a.some((P) => typeof P.balance == "number" && Number.isFinite(P.balance)) ? `${ne(f)}&nbsp;€` : `<span class="missing-value" role="note" aria-label="${d}" title="${d}">—</span>`, _ = l || u ? `<span class="total-wealth-note">${d}</span>` : "", h = `
    <div class="header-meta-row">
      💰 Gesamtvermögen: <strong class="total-wealth-value">${m}</strong>${_}
    </div>
  `, y = dn("Übersicht", h), b = Br(i), S = a.filter((P) => (P.currency_code ?? "EUR") === "EUR"), w = a.filter((P) => (P.currency_code ?? "EUR") !== "EUR"), A = w.some((P) => P.fx_unavailable) ? `
        <p class="table-note" role="note">
          <span class="table-note__icon" aria-hidden="true">⚠️</span>
          <span>Wechselkurse konnten nicht geladen werden. EUR-Werte werden derzeit nicht angezeigt.</span>
        </p>
      ` : "", N = `
    <div class="card">
      <h2>Liquidität</h2>
      <div class="scroll-container account-table">
        ${$e(
    S.map((P) => ({
      name: pt(P.name, On(P.badges), {
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
          ${$e(
    w.map((P) => {
      const E = P.orig_balance, F = typeof E == "number" && Number.isFinite(E) ? `${E.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}&nbsp;${P.currency_code ?? ""}` : "";
      return {
        name: pt(P.name, On(P.badges), {
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
  return Ei(e, i), H;
}
function Ei(e, t) {
  if (!e)
    return;
  const n = () => {
    try {
      const a = e, o = a.querySelector(".portfolio-table");
      o && o.querySelectorAll(".portfolio-toggle").length === 0 && (console.debug("Recovery: Tabelle ohne Buttons – erneuter Aufbau"), o.innerHTML = Br(t)), vn(e), Ni(e), mt.forEach((i) => {
        try {
          xt(i) && (Xe(e, i), Ge(e, i));
        } catch (c) {
          console.warn("Init-Sortierung für expandiertes Depot fehlgeschlagen:", i, c);
        }
      });
      try {
        jr(a);
      } catch (i) {
        console.warn("renderDashboard: Footer-Summe konnte nicht aktualisiert werden:", i);
      }
      try {
        oi(e);
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
_o({
  renderPositionsTable: (e) => Si(e),
  applyGainPctMetadata: Or,
  attachSecurityDetailListener: Ge,
  attachPortfolioPositionsSorting: Xe,
  updatePortfolioFooter: (e) => {
    e && jr(e);
  }
});
const xi = "http://www.w3.org/2000/svg", Ne = 640, Ee = 260, qe = { top: 12, right: 16, bottom: 24, left: 16 }, We = "var(--pp-reader-chart-line, #3f51b5)", Gt = "var(--pp-reader-chart-area, rgba(63, 81, 181, 0.12))", Yn = "0.75rem", Yr = "var(--pp-reader-chart-baseline, rgba(96, 125, 139, 0.75))", Gr = "6 4", Fi = 1440 * 60 * 1e3;
function Di(e) {
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
function $i(e) {
  return typeof e == "string" ? e : typeof e == "number" && Number.isFinite(e) ? e.toString() : e instanceof Date && Number.isFinite(e.getTime()) ? e.toISOString() : "";
}
function J(e) {
  return `${String(e)}px`;
}
function ae(e, t = {}) {
  const n = document.createElementNS(xi, e);
  return Object.entries(t).forEach(([r, a]) => {
    const o = Di(a);
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
function Xr(e, t) {
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
const Zr = (e) => {
  if (e && typeof e == "object" && "date" in e)
    return e.date;
}, Jr = (e) => {
  if (e && typeof e == "object" && "close" in e)
    return e.close;
}, Qr = (e, t, n) => {
  if (Number.isFinite(e)) {
    const r = new Date(e);
    if (!Number.isNaN(r.getTime()))
      return r.toLocaleDateString("de-DE");
  }
  if (t && typeof t == "object" && "date" in t) {
    const r = t.date, a = $i(r);
    if (a)
      return a;
  }
  return Number.isFinite(e) ? e.toString() : "";
}, ea = (e, t, n) => (Number.isFinite(e) ? e : yt(e, 0) ?? 0).toLocaleString("de-DE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
}), ta = ({ xFormatted: e, yFormatted: t }) => `
    <div class="chart-tooltip-date">${e}</div>
    <div class="chart-tooltip-value">${t}&nbsp;€</div>
  `, na = ({
  marker: e,
  xFormatted: t,
  yFormatted: n
}) => `
    <div class="chart-tooltip-date">${(typeof e.label == "string" ? e.label : null) || t}</div>
    <div class="chart-tooltip-value">${n}</div>
  `;
function ra(e) {
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
    margin: { ...qe },
    series: [],
    points: [],
    range: null,
    xAccessor: Zr,
    yAccessor: Jr,
    xFormatter: Qr,
    yFormatter: ea,
    tooltipRenderer: ta,
    markerTooltipRenderer: na,
    color: We,
    areaColor: Gt,
    baseline: null,
    handlersAttached: !1,
    markers: [],
    markerPositions: []
  }), e.__chartState;
}
function te(e, t, n) {
  return !Number.isFinite(e) || e < t ? t : e > n ? n : e;
}
function ki(e, t) {
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
function Ti(e) {
  if (e.length === 0)
    return "";
  const t = [];
  return e.forEach((n, r) => {
    const a = r === 0 ? "M" : "L", o = n.x.toFixed(2), i = n.y.toFixed(2);
    t.push(`${a}${o} ${i}`);
  }), t.join(" ");
}
function Ri(e) {
  const { baselineLine: t, baseline: n } = e;
  if (!t)
    return;
  const r = n?.color ?? Yr, a = n?.dashArray ?? Gr;
  t.setAttribute("stroke", r), t.setAttribute("stroke-dasharray", a);
}
function Ht(e) {
  const { baselineLine: t, baseline: n, range: r, margin: a, width: o } = e;
  if (!t)
    return;
  const i = n?.value;
  if (!r || i == null || !Number.isFinite(i)) {
    t.style.opacity = "0";
    return;
  }
  const { minY: c, maxY: s, boundedHeight: l } = r, u = Number.isFinite(c) ? c : i, f = (Number.isFinite(s) ? s : u + 1) - u, d = f === 0 ? 0.5 : (i - u) / f, g = te(d, 0, 1), m = Math.max(l, 0), _ = a.top + (1 - g) * m, h = Math.max(o - a.left - a.right, 0), y = a.left, b = a.left + h;
  t.setAttribute("x1", y.toFixed(2)), t.setAttribute("x2", b.toFixed(2)), t.setAttribute("y1", _.toFixed(2)), t.setAttribute("y2", _.toFixed(2)), t.style.opacity = "1";
}
function Li(e, t, n) {
  const { width: r, height: a, margin: o } = t, { xAccessor: i, yAccessor: c } = n;
  if (e.length === 0)
    return { points: [], range: null };
  const s = e.map((F, $) => {
    const Y = i(F, $), v = c(F, $), x = Xr(Y, $), R = yt(v, Number.NaN);
    return Number.isFinite(R) ? {
      index: $,
      data: F,
      xValue: x,
      yValue: R
    } : null;
  }).filter((F) => !!F);
  if (s.length === 0)
    return { points: [], range: null };
  const l = s.reduce((F, $) => Math.min(F, $.xValue), s[0].xValue), u = s.reduce((F, $) => Math.max(F, $.xValue), s[0].xValue), p = s.reduce((F, $) => Math.min(F, $.yValue), s[0].yValue), f = s.reduce((F, $) => Math.max(F, $.yValue), s[0].yValue), d = Math.max(r - o.left - o.right, 1), g = Math.max(a - o.top - o.bottom, 1), m = Number.isFinite(l) ? l : 0, _ = Number.isFinite(u) ? u : m + 1, h = Number.isFinite(p) ? p : 0, y = Number.isFinite(f) ? f : h + 1, b = yt(t.baseline?.value, null), S = b != null && Number.isFinite(b) ? Math.min(h, b) : h, w = b != null && Number.isFinite(b) ? Math.max(y, b) : y, C = Math.max(
    2,
    Math.min(
      6,
      Math.round(
        Math.max(a - o.top - o.bottom, 0) / 60
      ) || 4
    )
  ), { niceMin: A, niceMax: N } = qi(
    S,
    w,
    C
  ), D = Number.isFinite(A) ? A : h, H = Number.isFinite(N) ? N : y, P = _ - m || 1, E = H - D || 1;
  return {
    points: s.map((F) => {
      const $ = P === 0 ? 0.5 : (F.xValue - m) / P, Y = E === 0 ? 0.5 : (F.yValue - D) / E, v = o.left + $ * d, x = o.top + (1 - Y) * g;
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
      boundedWidth: d,
      boundedHeight: g
    }
  };
}
function It(e) {
  const { markerLayer: t, markerOverlay: n, markers: r, range: a, margin: o, markerTooltip: i } = e;
  if (e.markerPositions = [], ct(e), !t || !n)
    return;
  for (; t.firstChild; )
    t.removeChild(t.firstChild);
  for (; n.firstChild; )
    n.removeChild(n.firstChild);
  if (!a || !Array.isArray(r) || r.length === 0)
    return;
  const c = a.maxX - a.minX || 1, s = a.maxY - a.minY || 1;
  r.forEach((l, u) => {
    const p = Xr(l.x, u), f = yt(l.y, Number.NaN), d = Number(f);
    if (!Number.isFinite(p) || !Number.isFinite(d))
      return;
    const g = c === 0 ? 0.5 : te((p - a.minX) / c, 0, 1), m = s === 0 ? 0.5 : te((d - a.minY) / s, 0, 1), _ = o.left + g * a.boundedWidth, h = o.top + (1 - m) * a.boundedHeight, y = ae("g", {
      class: "line-chart-marker",
      transform: `translate(${_.toFixed(2)} ${h.toFixed(2)})`,
      "data-marker-id": l.id
    }), b = ae("circle", {
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
function aa(e, t, n, r) {
  e.width = Number.isFinite(t) ? Number(t) : Ne, e.height = Number.isFinite(n) ? Number(n) : Ee, e.margin = {
    top: Number.isFinite(r?.top) ? Number(r?.top) : qe.top,
    right: Number.isFinite(r?.right) ? Number(r?.right) : qe.right,
    bottom: Number.isFinite(r?.bottom) ? Number(r?.bottom) : qe.bottom,
    left: Number.isFinite(r?.left) ? Number(r?.left) : qe.left
  };
}
function Mi(e, t) {
  const n = e.xFormatter(t.xValue, t.data, t.index), r = e.yFormatter(t.yValue, t.data, t.index);
  return e.tooltipRenderer({
    point: t,
    xFormatted: n,
    yFormatted: r,
    data: t.data,
    index: t.index
  });
}
function Hi(e, t, n, r = null) {
  const { tooltip: a, width: o, margin: i, height: c } = e;
  if (!a)
    return;
  const s = r && Number.isFinite(r.scaleX) && r.scaleX > 0 ? r.scaleX : 1, l = r && Number.isFinite(r.scaleY) && r.scaleY > 0 ? r.scaleY : 1, u = c - i.bottom;
  a.style.visibility = "visible", a.style.opacity = "1";
  const p = a.offsetWidth || 0, f = a.offsetHeight || 0, d = t.x * s, g = te(
    d - p / 2,
    i.left * s,
    (o - i.right) * s - p
  ), m = Math.max(u * l - f, 0), _ = 12, y = (Number.isFinite(n) ? te(n ?? 0, i.top, u) : t.y) * l;
  let b = y - f - _;
  b < i.top * l && (b = y + _), b = te(b, 0, m);
  const S = J(Math.round(g)), w = J(Math.round(b));
  a.style.transform = `translate(${S}, ${w})`;
}
function Xt(e) {
  const { tooltip: t, focusLine: n, focusCircle: r } = e;
  t && (t.style.opacity = "0", t.style.visibility = "hidden"), n && (n.style.opacity = "0"), r && (r.style.opacity = "0");
}
function Ii(e, t) {
  const { marker: n } = t, r = e.xFormatter(t.marker.x, n, -1), a = e.yFormatter(t.marker.y, n, -1);
  return e.markerTooltipRenderer({
    marker: n,
    xFormatted: r,
    yFormatted: a
  });
}
function Vi(e, t, n, r = null) {
  const { markerTooltip: a, width: o, margin: i, height: c, tooltip: s } = e;
  if (!a)
    return;
  const l = r && Number.isFinite(r.scaleX) && r.scaleX > 0 ? r.scaleX : 1, u = r && Number.isFinite(r.scaleY) && r.scaleY > 0 ? r.scaleY : 1, p = c - i.bottom;
  a.style.visibility = "visible", a.style.opacity = "1";
  const f = a.offsetWidth || 0, d = a.offsetHeight || 0, g = t.x * l, m = te(
    g - f / 2,
    i.left * l,
    (o - i.right) * l - f
  ), _ = Math.max(p * u - d, 0), h = 10, y = s?.getBoundingClientRect(), b = e.svg?.getBoundingClientRect(), S = y && b ? y.top - b.top : null, w = y && b ? y.bottom - b.top : null, A = (Number.isFinite(n) ? te(n ?? t.y, i.top, p) : t.y) * u;
  let N;
  S != null && w != null ? S <= A ? N = S - d - h : N = w + h : (N = A - d - h, N < i.top * u && (N = A + h)), N = te(N, 0, _);
  const D = J(Math.round(m)), H = J(Math.round(N));
  a.style.transform = `translate(${D}, ${H})`;
}
function ct(e) {
  const { markerTooltip: t } = e;
  t && (t.style.opacity = "0", t.style.visibility = "hidden");
}
function zi(e, t, n) {
  let a = null, o = 576;
  for (const i of e.markerPositions) {
    const c = i.x - t, s = i.y - n, l = c * c + s * s;
    l <= o && (a = i, o = l);
  }
  return a;
}
function Ui(e, t) {
  if (t.handlersAttached || !t.overlay)
    return;
  const n = (a) => {
    if (t.points.length === 0 || !t.svg) {
      Xt(t), ct(t);
      return;
    }
    const o = t.svg.getBoundingClientRect(), i = t.width || Ne, c = t.height || Ee, s = o.width && Number.isFinite(o.width) && Number.isFinite(i) && i > 0 ? o.width / i : 1, l = o.height && Number.isFinite(o.height) && Number.isFinite(c) && c > 0 ? o.height / c : 1, u = s > 0 ? 1 / s : 1, p = l > 0 ? 1 / l : 1, f = (a.clientX - o.left) * u, d = (a.clientY - o.top) * p, g = {
      scaleX: s,
      scaleY: l
    };
    let m = t.points[0], _ = Math.abs(f - m.x);
    for (let y = 1; y < t.points.length; y += 1) {
      const b = t.points[y], S = Math.abs(f - b.x);
      S < _ && (_ = S, m = b);
    }
    t.focusCircle && (t.focusCircle.setAttribute("cx", m.x.toFixed(2)), t.focusCircle.setAttribute("cy", m.y.toFixed(2)), t.focusCircle.style.opacity = "1"), t.focusLine && (t.focusLine.setAttribute("x1", m.x.toFixed(2)), t.focusLine.setAttribute("x2", m.x.toFixed(2)), t.focusLine.setAttribute("y1", t.margin.top.toFixed(2)), t.focusLine.setAttribute(
      "y2",
      (t.height - t.margin.bottom).toFixed(2)
    ), t.focusLine.style.opacity = "1"), t.tooltip && (t.tooltip.innerHTML = Mi(t, m), Hi(t, m, d, g));
    const h = zi(t, f, d);
    h && t.markerTooltip ? (t.markerTooltip.innerHTML = Ii(t, h), Vi(t, h, d, g)) : ct(t);
  }, r = () => {
    Xt(t), ct(t);
  };
  t.overlay.addEventListener("pointermove", n), t.overlay.addEventListener("pointerenter", n), t.overlay.addEventListener("pointerleave", r), t.handlersAttached = !0, t.handlePointerMove = n, t.handlePointerLeave = r, e.addEventListener("pointercancel", r);
}
function oa(e, t = {}) {
  const n = document.createElement("div");
  n.className = "line-chart-container", n.dataset.chartType = "line", n.style.position = "relative";
  const r = ae("svg", {
    width: Ne,
    height: Ee,
    viewBox: `0 0 ${String(Ne)} ${String(Ee)}`,
    role: "img",
    "aria-hidden": "true",
    focusable: "false"
  });
  r.classList.add("line-chart-svg");
  const a = ae("path", {
    class: "line-chart-area",
    fill: Gt,
    stroke: "none"
  }), o = ae("line", {
    class: "line-chart-baseline",
    stroke: Yr,
    "stroke-width": 1,
    "stroke-dasharray": Gr,
    opacity: 0
  }), i = ae("path", {
    class: "line-chart-path",
    fill: "none",
    stroke: We,
    "stroke-width": 2,
    "stroke-linecap": "round",
    "stroke-linejoin": "round"
  }), c = ae("line", {
    class: "line-chart-focus-line",
    stroke: We,
    "stroke-width": 1,
    "stroke-dasharray": "4 4",
    opacity: 0
  }), s = ae("circle", {
    class: "line-chart-focus-circle",
    r: 4,
    fill: "#fff",
    stroke: We,
    "stroke-width": 2,
    opacity: 0
  }), l = ae("g", {
    class: "line-chart-markers"
  }), u = ae("rect", {
    class: "line-chart-overlay",
    fill: "transparent",
    x: 0,
    y: 0,
    width: Ne,
    height: Ee
  });
  r.appendChild(a), r.appendChild(o), r.appendChild(i), r.appendChild(c), r.appendChild(s), r.appendChild(l), r.appendChild(u), n.appendChild(r);
  const p = document.createElement("div");
  p.className = "chart-tooltip", p.style.position = "absolute", p.style.top = "0", p.style.left = "0", p.style.pointerEvents = "none", p.style.opacity = "0", p.style.visibility = "hidden", n.appendChild(p);
  const f = document.createElement("div");
  f.className = "line-chart-marker-overlay", f.style.position = "absolute", f.style.top = "0", f.style.left = "0", f.style.width = "100%", f.style.height = "100%", f.style.pointerEvents = "none", f.style.overflow = "visible", f.style.zIndex = "2", n.appendChild(f);
  const d = document.createElement("div");
  d.className = "chart-tooltip chart-tooltip--marker", d.style.position = "absolute", d.style.top = "0", d.style.left = "0", d.style.pointerEvents = "none", d.style.opacity = "0", d.style.visibility = "hidden", n.appendChild(d), e.appendChild(n);
  const g = ra(n);
  if (g.svg = r, g.areaPath = a, g.linePath = i, g.baselineLine = o, g.focusLine = c, g.focusCircle = s, g.overlay = u, g.tooltip = p, g.markerOverlay = f, g.markerLayer = l, g.markerTooltip = d, g.xAccessor = t.xAccessor ?? Zr, g.yAccessor = t.yAccessor ?? Jr, g.xFormatter = t.xFormatter ?? Qr, g.yFormatter = t.yFormatter ?? ea, g.tooltipRenderer = t.tooltipRenderer ?? ta, g.markerTooltipRenderer = t.markerTooltipRenderer ?? na, g.color = t.color ?? We, g.areaColor = t.areaColor ?? Gt, g.baseline = t.baseline ?? null, g.handlersAttached = !1, g.markers = Array.isArray(t.markers) ? t.markers.slice() : [], !g.xAxis) {
    const m = document.createElement("div");
    m.className = "line-chart-axis line-chart-axis-x", m.style.position = "absolute", m.style.left = "0", m.style.right = "0", m.style.bottom = "0", m.style.pointerEvents = "none", m.style.fontSize = Yn, m.style.color = "var(--secondary-text-color)", m.style.display = "block", n.appendChild(m), g.xAxis = m;
  }
  if (!g.yAxis) {
    const m = document.createElement("div");
    m.className = "line-chart-axis line-chart-axis-y", m.style.position = "absolute", m.style.top = "0", m.style.bottom = "0", m.style.left = "0", m.style.pointerEvents = "none", m.style.fontSize = Yn, m.style.color = "var(--secondary-text-color)", m.style.display = "block", n.appendChild(m), g.yAxis = m;
  }
  return aa(g, t.width, t.height, t.margin), i.setAttribute("stroke", g.color), c.setAttribute("stroke", g.color), s.setAttribute("stroke", g.color), a.setAttribute("fill", g.areaColor), Sn(n, t), Ui(n, g), n;
}
function Sn(e, t = {}) {
  if (!e) {
    console.error("updateLineChart: container element is required");
    return;
  }
  const n = ra(e);
  if (!n.svg || !n.linePath || !n.overlay) {
    console.error("updateLineChart: chart was not initialised with renderLineChart");
    return;
  }
  t.xAccessor && (n.xAccessor = t.xAccessor), t.yAccessor && (n.yAccessor = t.yAccessor), t.xFormatter && (n.xFormatter = t.xFormatter), t.yFormatter && (n.yFormatter = t.yFormatter), t.tooltipRenderer && (n.tooltipRenderer = t.tooltipRenderer), t.markerTooltipRenderer && (n.markerTooltipRenderer = t.markerTooltipRenderer), t.color && (n.color = t.color, n.linePath.setAttribute("stroke", n.color), n.focusLine && n.focusLine.setAttribute("stroke", n.color), n.focusCircle && n.focusCircle.setAttribute("stroke", n.color)), t.areaColor && (n.areaColor = t.areaColor, n.areaPath && n.areaPath.setAttribute("fill", n.areaColor)), Object.prototype.hasOwnProperty.call(t, "baseline") && (n.baseline = t.baseline ?? null), Array.isArray(t.markers) && (n.markers = t.markers.slice()), Ri(n), aa(n, t.width, t.height, t.margin);
  const { width: r, height: a } = n;
  n.svg.setAttribute("width", String(r)), n.svg.setAttribute("height", String(a)), n.svg.setAttribute("viewBox", `0 0 ${String(r)} ${String(a)}`), n.overlay.setAttribute("x", "0"), n.overlay.setAttribute("y", "0"), n.overlay.setAttribute("width", Math.max(r, 0).toFixed(2)), n.overlay.setAttribute("height", Math.max(a, 0).toFixed(2)), Array.isArray(t.series) && (n.series = Array.from(t.series));
  const { points: o, range: i } = Li(n.series, n, {
    xAccessor: n.xAccessor,
    yAccessor: n.yAccessor
  });
  if (n.points = o, n.range = i, o.length === 0) {
    n.linePath.setAttribute("d", ""), n.areaPath && n.areaPath.setAttribute("d", ""), Xt(n), It(n), Vt(n), Ht(n);
    return;
  }
  if (o.length === 1) {
    const s = o[0], l = Math.max(
      0.5,
      Math.min(4, Math.max(n.width - n.margin.left - n.margin.right, 1) * 0.01)
    ), u = `M${s.x.toFixed(2)} ${s.y.toFixed(2)} h${l.toFixed(2)}`;
    n.linePath.setAttribute("d", u), n.areaPath && n.areaPath.setAttribute("d", ""), n.focusCircle && (n.focusCircle.setAttribute("cx", s.x.toFixed(2)), n.focusCircle.setAttribute("cy", s.y.toFixed(2)), n.focusCircle.style.opacity = "1"), n.focusLine && (n.focusLine.style.opacity = "0"), Vt(n), Ht(n), It(n);
    return;
  }
  const c = Ti(o);
  if (n.linePath.setAttribute("d", c), n.areaPath && i) {
    const s = n.margin.top + i.boundedHeight, l = ki(o, s);
    n.areaPath.setAttribute("d", l);
  }
  Vt(n), Ht(n), It(n);
}
function Vt(e) {
  const { xAxis: t, yAxis: n, range: r, margin: a, height: o, yFormatter: i } = e;
  if (!t || !n)
    return;
  if (!r) {
    t.innerHTML = "", n.innerHTML = "";
    return;
  }
  const { minX: c, maxX: s, minY: l, maxY: u, boundedWidth: p, boundedHeight: f } = r, d = Number.isFinite(c) && Number.isFinite(s) && s >= c, g = Number.isFinite(l) && Number.isFinite(u) && u >= l, m = Math.max(p, 0), _ = Math.max(f, 0);
  if (t.style.left = J(a.left), t.style.width = J(m), t.style.top = J(o - a.bottom + 6), t.innerHTML = "", d && m > 0) {
    const y = (s - c) / Fi, b = Math.max(2, Math.min(6, Math.round(m / 140) || 4));
    Wi(e, c, s, b, y).forEach(({ positionRatio: w, label: C }) => {
      const A = document.createElement("div");
      A.className = "line-chart-axis-tick line-chart-axis-tick-x", A.style.position = "absolute", A.style.bottom = "0";
      const N = te(w, 0, 1);
      A.style.left = J(N * m);
      let D = "-50%", H = "center";
      N <= 1e-3 ? (D = "0", H = "left", A.style.marginLeft = "2px") : N >= 0.999 && (D = "-100%", H = "right", A.style.marginRight = "2px"), A.style.transform = `translateX(${D})`, A.style.textAlign = H, A.textContent = C, t.appendChild(A);
    });
  }
  n.style.top = J(a.top), n.style.height = J(_);
  const h = Math.max(a.left - 6, 0);
  if (n.style.left = "0", n.style.width = J(Math.max(h, 0)), n.innerHTML = "", g && _ > 0) {
    const y = Math.max(2, Math.min(6, Math.round(_ / 60) || 4)), b = Oi(l, u, y), S = i;
    b.forEach(({ value: w, positionRatio: C }) => {
      const A = document.createElement("div");
      A.className = "line-chart-axis-tick line-chart-axis-tick-y", A.style.position = "absolute", A.style.left = "0";
      const D = (1 - te(C, 0, 1)) * _;
      A.style.top = J(D), A.textContent = S(w, null, -1), n.appendChild(A);
    });
  }
}
function qi(e, t, n = 4) {
  if (!Number.isFinite(e) || !Number.isFinite(t))
    return {
      niceMin: e,
      niceMax: t
    };
  const r = Math.max(2, n);
  if (t === e) {
    const l = Zt(Math.abs(e) || 1);
    return {
      niceMin: e - l,
      niceMax: t + l
    };
  }
  const o = (t - e) / (r - 1), i = Zt(o), c = Math.floor(e / i) * i, s = Math.ceil(t / i) * i;
  return c === s ? {
    niceMin: e,
    niceMax: t + i
  } : {
    niceMin: c,
    niceMax: s
  };
}
function Wi(e, t, n, r, a) {
  if (!Number.isFinite(t) || !Number.isFinite(n) || n < t)
    return [];
  if (!Number.isFinite(a) || a <= 0)
    return [
      {
        positionRatio: 0.5,
        label: Gn(e, t, a || 0)
      }
    ];
  const o = Math.max(2, r), i = [], c = n - t;
  for (let s = 0; s < o; s += 1) {
    const l = o === 1 ? 0.5 : s / (o - 1), u = t + l * c;
    i.push({
      positionRatio: l,
      label: Gn(e, u, a)
    });
  }
  return i;
}
function Gn(e, t, n) {
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
function Oi(e, t, n) {
  if (!Number.isFinite(e) || !Number.isFinite(t))
    return [];
  if (t === e)
    return [
      {
        value: e,
        positionRatio: 0.5
      }
    ];
  const r = t - e, a = Math.max(2, n), o = r / (a - 1), i = Zt(o), c = Math.floor(e / i) * i, s = Math.ceil(t / i) * i, l = [];
  for (let u = c; u <= s + i / 2; u += i) {
    const p = (u - e) / (t - e);
    l.push({
      value: u,
      positionRatio: te(p, 0, 1)
    });
  }
  return l.length > a + 2 ? l.filter((u, p) => p % 2 === 0) : l;
}
function Zt(e) {
  if (!Number.isFinite(e) || e === 0)
    return 1;
  const t = Math.floor(Math.log10(Math.abs(e))), n = Math.abs(e) / 10 ** t;
  let r;
  return n <= 1 ? r = 1 : n <= 2 ? r = 2 : n <= 5 ? r = 5 : r = 10, r * 10 ** t;
}
let me = {
  status: "idle",
  error: null,
  data: null,
  selection: null,
  lastUpdated: null
}, Xn = null;
function Bi(e) {
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
function Jt(e) {
  return typeof e != "string" ? null : e.trim() || null;
}
function ji(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e, n = Jt(t.start), r = Jt(t.end);
  return n && r ? { start: n, end: r } : null;
}
function Zn(e) {
  if (!Array.isArray(e))
    return [];
  const t = e.map((r) => typeof r == "string" ? r.trim() : "").filter((r) => r.length > 0), n = Array.from(new Set(t));
  return n.sort(), n;
}
function Ki(e) {
  const t = Jt(e.date ?? null), n = ji(e.range ?? null);
  if (t && n)
    throw new Error("loadDailyWealth: date und range können nicht gleichzeitig gesetzt werden");
  if (!t && !n)
    throw new Error("loadDailyWealth: entweder date oder range erforderlich");
  const r = e.scopes ?? {}, a = Zn(r.accounts), o = Zn(r.portfolios), i = {};
  t && (i.date = t), n && (i.range = n);
  const c = e.include_slices ?? e.includeSlices ?? void 0, s = e.include_scopes ?? e.includeScopes ?? void 0;
  return c !== void 0 && (i.includeSlices = c), s !== void 0 && (i.includeScopes = s), (a.length || o.length) && (i.scopes = {}, a.length && (i.scopes.accounts = a), o.length && (i.scopes.portfolios = o)), typeof e.limit == "number" && Number.isFinite(e.limit) && e.limit > 0 && (i.limit = e.limit), typeof e.offset == "number" && Number.isFinite(e.offset) && e.offset >= 0 && (i.offset = e.offset), i;
}
function Yi(e) {
  const t = e.date ?? "", n = e.range ? `${e.range.start}..${e.range.end}` : "", r = e.scopes?.accounts ?? [], a = e.scopes?.portfolios ?? [], o = JSON.stringify({ accounts: r, portfolios: a }), i = e.includeSlices ? "1" : "0", c = e.includeScopes ? "1" : "0", s = e.limit ?? "", l = e.offset ?? "";
  return [t, n, o, i, c, s, l].join("::");
}
function Gi(e) {
  return { ...e };
}
function Jn(e) {
  return { ...e };
}
function Xi(e) {
  if (e)
    return {
      accounts: e.accounts.map(Jn),
      portfolios: e.portfolios.map(Jn)
    };
}
function Zi(e) {
  if (!e)
    return null;
  const t = Xi(e.slices);
  return {
    range: { ...e.range },
    records: e.records.map(Gi),
    ...t ? { slices: t } : {}
  };
}
function Ji(e) {
  if (!e)
    return null;
  const t = {};
  return e.date && (t.date = e.date), e.range && (t.range = { ...e.range }), e.scopes && (t.scopes = {
    ...e.scopes.accounts ? { accounts: [...e.scopes.accounts] } : {},
    ...e.scopes.portfolios ? { portfolios: [...e.scopes.portfolios] } : {}
  }), e.includeSlices !== void 0 && (t.includeSlices = e.includeSlices), e.includeScopes !== void 0 && (t.includeScopes = e.includeScopes), e.limit !== void 0 && (t.limit = e.limit), e.offset !== void 0 && (t.offset = e.offset), t;
}
function zt(e) {
  me = {
    ...me,
    ...e
  };
}
function Qt() {
  return {
    status: me.status,
    error: me.error,
    lastUpdated: me.lastUpdated,
    data: Zi(me.data),
    selection: Ji(me.selection)
  };
}
async function Qi(e, t, n = {}) {
  const r = Ki(n), a = Yi(r);
  if (me.data && !n.force && Xn === a)
    return Qt();
  zt({
    status: "loading",
    error: null,
    selection: r
  });
  try {
    const o = await uo(e, t, r);
    Xn = a, zt({
      status: "loaded",
      error: null,
      data: o,
      selection: r,
      lastUpdated: Date.now()
    });
  } catch (o) {
    zt({
      status: "error",
      error: Bi(o),
      selection: r,
      lastUpdated: Date.now()
    });
  }
  return Qt();
}
const es = 30;
let ia = null, en = "range", tn = null;
const ue = /* @__PURE__ */ new Set();
let et = null;
const ts = [
  "#1976d2",
  "#c2185b",
  "#7b1fa2",
  "#00796b",
  "#ef6c00",
  "#5d4037",
  "#512da8",
  "#0097a7"
];
function Qn(e) {
  const t = e.getUTCFullYear(), n = String(e.getUTCMonth() + 1).padStart(2, "0"), r = String(e.getUTCDate()).padStart(2, "0");
  return `${String(t)}-${n}-${r}`;
}
function ns() {
  const e = /* @__PURE__ */ new Date(), t = new Date(e);
  return t.setUTCDate(e.getUTCDate() - (es - 1)), {
    range: {
      start: Qn(t),
      end: Qn(e)
    },
    includeSlices: !0,
    includeScopes: !0
  };
}
function rs(e) {
  if (!e.length)
    return "";
  const t = e.some((o) => o.fx_coverage_ratio != null && o.fx_coverage_ratio < 1), n = e.some((o) => o.price_coverage_ratio != null && o.price_coverage_ratio < 1), r = e.some((o) => o.stale_price), a = [];
  return t && a.push('<span class="meta-badge meta-badge--warning" title="Wechselkurse fehlen teilweise">FX-Abdeckung</span>'), n && a.push('<span class="meta-badge meta-badge--warning" title="Preisdaten unvollständig">Preisabdeckung</span>'), r && a.push('<span class="meta-badge meta-badge--neutral" title="Letzte Kurse sind veraltet">Stale Kurse</span>'), a.length ? `<span class="meta-badges">${a.join("")}</span>` : '<span class="meta-badge meta-badge--positive">Volle Abdeckung</span>';
}
function sa(e) {
  return `${ne(e)}&nbsp;€`;
}
function we(e, t) {
  return e.reduce((n, r) => {
    const a = r[t];
    return typeof a == "number" && Number.isFinite(a) ? n + a : n;
  }, 0);
}
function tt(e, t, n = "") {
  const r = e.querySelector("#analyse-status");
  r && (r.dataset.state = t, t === "loading" ? r.textContent = "Lade Vermögensdaten …" : t === "error" ? r.textContent = n || "Daten konnten nicht geladen werden." : r.textContent = "");
}
function er(e, t, n) {
  const r = e.querySelector("#analyse-total-wealth"), a = e.querySelector("#analyse-coverage"), o = e.querySelector("#analyse-selection-label");
  if (!r || !a || !o)
    return;
  if (o.textContent = t, !n.length) {
    r.innerHTML = "—", a.innerHTML = "";
    return;
  }
  const i = n[n.length - 1];
  r.innerHTML = sa(i.total_wealth_eur), a.innerHTML = rs(n);
}
function tr(e, t) {
  const n = e.querySelector(".analyse-metrics-grid");
  if (!n) return;
  if (!t.length) {
    n.innerHTML = '<div class="metrics-empty">Keine Daten verfügbar</div>';
    return;
  }
  const r = ls(t);
  if (!r) return;
  const a = (i, c, s = "") => `
    <div class="metric-row ${s}">
      <span class="metric-label">${i}</span>
      <span class="metric-value">${typeof c == "number" ? sa(c) : c}</span>
    </div>`, o = `
    <div class="metrics-section">
      <h3>Vermögensentwicklung</h3>
      ${a("Startwert", r.startValue)}
      ${a("Endwert", r.endValue, "highlight")}
      ${a("Abs. Veränderung", r.endValue - r.startValue)}
    </div>
    <div class="metrics-section">
      <h3>Performance-Treiber</h3>
      ${a("Markt & FX", r.marketGain)}
      ${a("Erträge (Div/Zins)", r.ertraege)}
      ${a("Kosten & Steuern", r.fees + r.taxes)}
    </div>
    <div class="metrics-section">
      <h3>Finanzfluss</h3>
      ${a("Netto-Transfers", r.netTransfers)}
      ${a("Neutral", r.neutral)}
    </div>
  `;
  n.innerHTML = o;
}
function Ut(e, t = 200) {
  et != null && window.clearTimeout(et), et = window.setTimeout(() => {
    et = null, e();
  }, t);
}
function _t(e, t) {
  return !e || !t ? null : `${e}:${t}`;
}
function as(e) {
  if (!e) {
    ue.clear();
    return;
  }
  const t = /* @__PURE__ */ new Set(), n = (r, a) => {
    r.forEach((o) => {
      const i = _t(a, o.scope_id);
      i && t.add(i);
    });
  };
  n(e.accounts, "account"), n(e.portfolios, "portfolio"), ue.size === 0 ? t.forEach((r) => ue.add(r)) : Array.from(ue).forEach((r) => {
    t.has(r) || ue.delete(r);
  });
}
function os(e, t) {
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
    const u = /* @__PURE__ */ new Map();
    if (s.forEach((f) => {
      const d = _t(l, f.scope_id);
      d && !u.has(d) && u.set(d, f);
    }), u.size === 0)
      return "";
    const p = Array.from(u.values()).map((f) => {
      const d = _t(l, f.scope_id);
      if (!d)
        return "";
      const g = ue.has(d) ? "checked" : "", m = f.scope_name ?? f.scope_id;
      return `
          <label class="scope-option">
            <input type="checkbox" data-scope-key="${d}" ${g}>
            <span>${m}</span>
          </label>
        `;
    }).join("");
    return `<div class="scope-group"><div class="scope-title">${c}</div>${p}</div>`;
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
    s.checked ? ue.add(l) : ue.delete(l);
    const u = e.closest("#analyse-chart-card");
    u && tn && ca(u, tn);
  });
}
function is(e) {
  if (typeof e == "number")
    return Number.isFinite(e) ? e : null;
  const t = Date.parse(e);
  return Number.isFinite(t) ? t : null;
}
function ss(e) {
  const t = Array.from(ts), n = {
    key: "total",
    label: "Gesamtvermögen",
    color: "#2c3e50",
    points: e.records.map((i) => ({
      date: i.date,
      value: i.total_wealth_eur
    }))
  }, r = [], a = /* @__PURE__ */ new Map(), o = (i, c) => {
    i.forEach((s) => {
      const l = _t(c, s.scope_id);
      l && (a.has(l) || a.set(l, /* @__PURE__ */ new Map()), a.get(l)?.set(s.date, s));
    });
  };
  return e.slices && (o(e.slices.accounts, "account"), o(e.slices.portfolios, "portfolio")), a.forEach((i, c) => {
    if (!ue.has(c))
      return;
    const s = t.shift() ?? "#607d8b", l = c.startsWith("account:"), u = c.split(":")[1] ?? "", f = `${l ? "Konto" : "Depot"} ${u}`.trim(), d = i.values().next(), m = (d.done ? void 0 : d.value)?.scope_name ?? f;
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
function cs(e, t) {
  const n = e.__chartState, r = e.querySelector("svg");
  if (!n || !n.range || !n.margin || !r)
    return;
  const { range: a, margin: o } = n;
  r.querySelectorAll(".analyse-slice-series").forEach((i) => {
    i.remove();
  }), t.filter((i) => i.key !== "total").forEach((i) => {
    const c = i.points.map((u, p) => {
      const f = is(u.date);
      if (f == null || !Number.isFinite(u.value))
        return null;
      const d = a.maxX === a.minX ? 0.5 : (f - a.minX) / (a.maxX - a.minX), g = a.maxY === a.minY ? 0.5 : (u.value - a.minY) / (a.maxY - a.minY), m = o.left + d * a.boundedWidth, _ = o.top + (1 - g) * a.boundedHeight;
      return `${p === 0 ? "M" : "L"}${String(m)},${String(_)}`;
    }).filter(Boolean).join(" ");
    if (!c)
      return;
    const s = document.createElementNS("http://www.w3.org/2000/svg", "g");
    s.setAttribute("class", "analyse-slice-series");
    const l = document.createElementNS("http://www.w3.org/2000/svg", "path");
    l.setAttribute("d", c), l.setAttribute("fill", "none"), l.setAttribute("stroke", i.color), l.setAttribute("stroke-width", "2"), l.setAttribute("stroke-linejoin", "round"), l.setAttribute("stroke-linecap", "round"), s.appendChild(l), r.appendChild(s);
  });
}
function ca(e, t) {
  const n = e.querySelector(".line-chart-container");
  if (!n)
    return;
  const r = ss(t), a = r[0];
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
    yFormatter: (s) => ne(s),
    color: a.color,
    areaColor: "rgba(44, 62, 80, 0.12)"
  }, i = n;
  let c = i;
  !i.__chartState || !n.querySelector("svg") ? (n.innerHTML = "", c = oa(n, o)) : (Sn(i, o), c = i), c && cs(c, r);
}
function ls(e) {
  if (!e.length)
    return null;
  const t = e[0]?.total_wealth_eur ?? 0, n = e[e.length - 1]?.total_wealth_eur ?? 0, r = we(e, "dividends_eur") + we(e, "interest_eur"), a = -Math.abs(we(e, "fees_eur")), o = -Math.abs(we(e, "taxes_eur")), i = we(e, "inbound_transfers_eur") - we(e, "outbound_transfers_eur"), c = we(e, "performance_neutral_movements"), s = n - t - r - a - o - i - c;
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
function nt(e) {
  const n = e.querySelector('input[name="analyse-range-mode"]:checked')?.value === "date" ? "date" : "range";
  en = n;
  const r = e.querySelector("#analyse-date-single"), a = e.querySelector("#analyse-date-start"), o = e.querySelector("#analyse-date-end"), i = (l) => {
    if (!l)
      return null;
    const u = l.trim();
    return u.length === 10 ? u : null;
  };
  if (n === "date") {
    let l = i(r?.value);
    if (!l) {
      const u = i(a?.value) ?? (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
      l = u, r && (r.value = u);
    }
    return { date: l, includeSlices: !0, includeScopes: !0 };
  }
  let c = i(a?.value), s = i(o?.value);
  if (!c || !s) {
    const l = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    c || (c = l), s || (s = l), a && !a.value && (a.value = c), o && !o.value && (o.value = s);
  }
  return !c || !s ? null : c > s ? { range: { start: s, end: c }, includeSlices: !0, includeScopes: !0 } : { range: { start: c, end: s }, includeSlices: !0, includeScopes: !0 };
}
function rt(e, t) {
  const n = t.date ? "date" : "range", r = e.querySelector('input[name="analyse-range-mode"][value="date"]'), a = e.querySelector('input[name="analyse-range-mode"][value="range"]');
  r && a && (r.checked = n === "date", a.checked = n === "range");
  const o = e.querySelector("#analyse-date-single"), i = e.querySelector("#analyse-date-start"), c = e.querySelector("#analyse-date-end");
  o && t.date && (o.value = t.date), i && c && t.range && (i.value = t.range.start, c.value = t.range.end);
  const s = e.querySelector(".analyse-range-fields"), l = e.querySelector(".analyse-single-field");
  s && l && (n === "date" ? (s.style.display = "none", l.style.display = "") : (s.style.display = "", l.style.display = "none"));
}
function nr(e) {
  return e.date ? `Tag: ${e.date}` : e.range ? `Zeitraum: ${e.range.start} – ${e.range.end}` : "";
}
async function at(e, t, n, r, a) {
  tt(e, "loading");
  const o = await Qi(n, r, a);
  if (o.status === "error") {
    if (tt(e, "error", o.error ?? void 0), t) {
      const c = t.querySelector(".line-chart-container");
      c && c.replaceChildren();
    }
    return;
  }
  const i = o.data;
  if (!i || !Array.isArray(i.records) || i.records.length === 0) {
    if (er(e, nr(a), []), tr(e, []), tt(e, "loaded", "Keine Daten für den gewählten Zeitraum."), t) {
      const c = t.querySelector(".line-chart-container");
      c && c.replaceChildren();
    }
    return;
  }
  ia = a, tn = i, as(i.slices), er(e, nr(a), i.records), tr(e, i.records), t && (os(t, i.slices), ca(t, i)), tt(e, "loaded");
}
function us(e, t, n, r) {
  const a = e.querySelector("#analyse-range-apply"), o = e.querySelectorAll('input[name="analyse-range-mode"]'), i = ia ?? Qt().selection ?? ns();
  rt(e, i);
  const c = () => {
    const l = nt(e);
    l && rt(e, l);
  };
  o.forEach((l) => {
    l.addEventListener("change", () => {
      c();
      const u = nt(e);
      u && Ut(() => {
        rt(e, u), at(e, t, n, r, u);
      });
    });
  }), a && a.addEventListener("click", () => {
    const l = nt(e) ?? i;
    rt(e, l), Ut(() => {
      at(e, t, n, r, l);
    });
  }), e.querySelectorAll('input[type="date"]').forEach((l) => {
    l.addEventListener("change", () => {
      const u = nt(e);
      u && Ut(() => {
        at(e, t, n, r, u);
      });
    });
  }), at(e, t, n, r, i);
}
function ds(e, t, n) {
  const a = dn("Analyse", `
    <div class="header-meta-row">
      <span>Vermögensverlauf &amp; Cashflows (Backdating)</span>
    </div>
  `), o = `
    <style>
      .analyse-metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
        margin-top: 1.5rem;
        padding-top: 1.5rem;
        border-top: 1px solid var(--divider-color, #e0e0e0);
      }
      .metrics-section h3 {
        margin: 0 0 0.75rem 0;
        font-size: 0.9rem;
        font-weight: 500;
        text-transform: uppercase;
        color: var(--secondary-text-color, #727272);
        letter-spacing: 0.05em;
      }
      .metric-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.25rem 0;
        font-size: 0.95rem;
      }
      .metric-label {
        color: var(--primary-text-color, #212121);
      }
      .metric-value {
        font-weight: 500;
        font-family: var(--code-font-family, monospace); /* Tabular figures preferred */
      }
      .metric-row.highlight {
        font-weight: 600;
        color: var(--primary-color, #03a9f4);
      }
      .metric-row.highlight .metric-value {
        font-weight: 700;
      }
      .metrics-empty {
        text-align: center;
        color: var(--secondary-text-color);
        padding: 2rem;
        font-style: italic;
      }
      @media (max-width: 600px) {
        .analyse-metrics-grid {
          grid-template-columns: 1fr;
          gap: 1rem;
        }
      }
    </style>
  `, i = `
    <div class="card" id="analyse-range-card" data-section="range">
      <h2>Zeitraum &amp; Kennzahlen</h2>
      <div class="analyse-range-form" role="group" aria-label="Zeitraum wählen">
        <div class="analyse-mode-toggle">
          <label><input type="radio" name="analyse-range-mode" value="range" ${en === "range" ? "checked" : ""}> Zeitraum</label>
          <label><input type="radio" name="analyse-range-mode" value="date" ${en === "date" ? "checked" : ""}> Ein Tag</label>
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

      <div class="analyse-metrics-grid">
        <!-- Filled via renderMetrics -->
      </div>

      <div class="analyse-status" id="analyse-status" data-state="idle" role="status" aria-live="polite"></div>
    </div>
  `, s = `
    ${o}
    ${a.outerHTML}
    ${i}
    
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
    const l = e.querySelector("#analyse-range-card"), u = e.querySelector("#analyse-chart-card");
    l && us(l, u, t, n);
  }, 0), s;
}
function fs(e) {
  return Array.isArray(e) && e.every((t) => typeof t == "string");
}
function ps(e) {
  return typeof e == "object" && e !== null;
}
function gs(e) {
  if (!ps(e))
    return !1;
  const t = e;
  return typeof t.portfolioUuid != "string" ? !1 : fs(t.securityUuids);
}
function hs(e) {
  return e instanceof CustomEvent ? gs(e.detail) : !1;
}
const qt = { min: 0, max: 6 }, bt = { min: 2, max: 4 }, ms = "1Y", la = [
  "1M",
  "6M",
  "1Y",
  "5Y",
  "ALL"
], ys = {
  "1M": 30,
  "6M": 182,
  "1Y": 365,
  "5Y": 1826,
  ALL: Number.POSITIVE_INFINITY
}, _s = /* @__PURE__ */ new Set([0, 2]), bs = /* @__PURE__ */ new Set([1, 3]), vs = "var(--pp-reader-chart-marker-buy, #2e7d32)", Ss = "var(--pp-reader-chart-marker-sell, #c0392b)", rr = "{TICKER}", ws = "https://chatgpt.com/", Wt = {
  aggregation: "Aggregationsdaten",
  totals: "Kaufsummen",
  eur_total: "EUR-Kaufsumme"
}, xe = /* @__PURE__ */ new Map(), lt = /* @__PURE__ */ new Map(), Ze = /* @__PURE__ */ new Map(), Fe = /* @__PURE__ */ new Map(), ua = "pp-reader:portfolio-positions-updated", Be = /* @__PURE__ */ new Map();
function Ps(e) {
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
function As(e, t) {
  if (e) {
    if (t) {
      Ze.set(e, t);
      return;
    }
    Ze.delete(e);
  }
}
function Cs(e) {
  if (!e || typeof window > "u")
    return null;
  if (Ze.has(e)) {
    const t = Ze.get(e) || null;
    if (t)
      return t;
  }
  return null;
}
function da(e) {
  return xe.has(e) || xe.set(e, /* @__PURE__ */ new Map()), xe.get(e);
}
function fa(e) {
  return Fe.has(e) || Fe.set(e, /* @__PURE__ */ new Map()), Fe.get(e);
}
function pa(e) {
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
function ga(e) {
  e && Ze.delete(e);
}
function Ns(e, t) {
  if (!e || !t)
    return;
  const n = t.securityUuids;
  (Array.isArray(n) ? n : []).includes(e) && (pa(e), ga(e));
}
function Es(e) {
  if (!e || Be.has(e))
    return;
  const t = (n) => {
    hs(n) && Ns(e, n.detail);
  };
  try {
    window.addEventListener(ua, t), Be.set(e, t);
  } catch (n) {
    console.error("ensureLiveUpdateSubscription: Registrierung fehlgeschlagen", n);
  }
}
function xs(e) {
  if (!e || !Be.has(e))
    return;
  const t = Be.get(e);
  try {
    t && window.removeEventListener(ua, t);
  } catch (n) {
    console.error("removeLiveUpdateSubscription: Entfernen des Listeners fehlgeschlagen", n);
  }
  Be.delete(e);
}
function Fs(e) {
  e && (xs(e), pa(e), ga(e));
}
function ar(e, t) {
  if (!lt.has(e)) {
    lt.set(e, { activeRange: t });
    return;
  }
  const n = lt.get(e);
  n && (n.activeRange = t);
}
function ha(e) {
  return lt.get(e)?.activeRange ?? ms;
}
function nn(e) {
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
function or(e) {
  return !(e instanceof Date) || Number.isNaN(e.getTime()) ? null : nn(Re(e));
}
function M(e) {
  return de(e);
}
function ma(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t || null;
}
function Pe(e) {
  const t = ma(e);
  return t ? t.toUpperCase() : null;
}
function Ds(e) {
  if (!e)
    return null;
  const t = hn(e.aggregation), n = M(t?.purchase_total_security) ?? (t ? M(
    t.security_currency_total
  ) : null), r = M(t?.purchase_total_account) ?? (t ? M(
    t.account_currency_total
  ) : null);
  if (oe(n) && oe(r)) {
    const c = n / r;
    if (oe(c))
      return c;
  }
  const a = Me(e.average_cost), o = M(a?.native) ?? M(a?.security), i = M(a?.account) ?? M(a?.eur);
  if (oe(o) && oe(i)) {
    const c = o / i;
    if (oe(c))
      return c;
  }
  return null;
}
function ya(e, t = "Unbekannter Fehler") {
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
  const n = Re(t instanceof Date ? t : /* @__PURE__ */ new Date()), r = ys[e], a = or(n), o = {};
  if (a != null && (o.end_date = a), Number.isFinite(r) && r > 0) {
    const i = new Date(n.getTime());
    i.setUTCDate(i.getUTCDate() - (r - 1));
    const c = or(i);
    c != null && (o.start_date = c);
  }
  return o;
}
function wn(e) {
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
function $s(e) {
  const t = wn(e);
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
function rn(e) {
  return Array.isArray(e) ? e.map((t) => {
    let r = M(t.close);
    if (r == null) {
      const o = M(t.close_raw);
      o != null && (r = o / 1e8);
    }
    return r == null ? null : {
      date: wn(t.date) ?? t.date,
      close: r
    };
  }).filter((t) => !!t) : [];
}
function wt(e, t, n = null) {
  if (!Array.isArray(e))
    return [];
  const r = [], a = Pe(t), o = a || "EUR", i = Ds(n);
  return e.forEach((c, s) => {
    const l = typeof c.type == "number" ? c.type : Number(c.type), u = _s.has(l), p = bs.has(l);
    if (!u && !p)
      return;
    const f = $s(c.date);
    let d = M(c.price);
    if (!f || d == null)
      return;
    const g = Pe(c.currency_code), m = a ?? g ?? o;
    g && a && g !== a && oe(i) && (d *= i);
    const _ = M(c.shares), h = M(c.net_price_eur), y = u ? "Kauf" : "Verkauf", b = _ != null ? `${Cn(_)} @ ` : "", S = `${y} ${b}${fe(d)} ${m}`, w = p && h != null ? `${S} (netto ${fe(h)} EUR)` : S, C = u ? vs : Ss, A = typeof c.uuid == "string" && c.uuid.trim() || `${y}-${f.getTime().toString()}-${s.toString()}`;
    r.push({
      id: A,
      x: f.getTime(),
      y: d,
      color: C,
      label: w,
      payload: {
        type: y,
        currency: m,
        transactionCurrency: g,
        shares: _,
        price: d,
        netPriceEur: h,
        date: f.toISOString(),
        portfolio: c.portfolio
      }
    });
  }), r;
}
function Pn(e) {
  const t = M(e?.last_price_native) ?? M(e?.last_price?.native) ?? null;
  if (T(t))
    return t;
  if (Pe(e?.currency_code) === "EUR") {
    const r = M(e?.last_price_eur);
    if (T(r))
      return r;
  }
  return null;
}
function ks(e) {
  if (!e)
    return null;
  const n = e.last_price_fetched_at, r = St(n);
  if (r != null)
    return r;
  const o = e.last_price?.fetched_at;
  return St(o) ?? null;
}
function an(e, t) {
  let n = [];
  Array.isArray(e) && (n = e.map((l) => ({
    ...l
  })));
  const r = n.slice(), a = Pn(t);
  if (!T(a))
    return r;
  const o = ks(t) ?? Date.now(), i = new Date(o);
  if (Number.isNaN(i.getTime()))
    return r;
  const c = nn(Re(i));
  let s = null;
  for (let l = r.length - 1; l >= 0; l -= 1) {
    const u = r[l], p = wn(u.date);
    if (!p)
      continue;
    const f = nn(Re(p));
    if (s == null && (s = f), f === c)
      return u.close !== a && (r[l] = { ...u, close: a }), r;
    if (f < c)
      break;
  }
  return s != null && s > c || r.push({
    date: i,
    close: a
  }), r;
}
function T(e) {
  return typeof e == "number" && Number.isFinite(e);
}
function oe(e) {
  return typeof e == "number" && Number.isFinite(e) && e > 0;
}
function je(e, t, n) {
  if (!T(e) || !T(t))
    return !1;
  const r = Math.abs(e - t), a = Math.max(Math.abs(e), Math.abs(t), 1);
  return r <= a * 1e-4;
}
function Ts(e, t) {
  return !T(t) || t === 0 || !T(e) ? null : vo((e - t) / t * 100);
}
function _a(e, t) {
  if (e.length === 0)
    return { priceChange: null, priceChangePct: null };
  const n = e[0], r = M(n.close);
  if (!T(r) || r === 0)
    return { priceChange: null, priceChangePct: null };
  const a = e[e.length - 1], o = M(a.close), i = M(t) ?? o;
  if (!T(i))
    return { priceChange: null, priceChangePct: null };
  const c = i - r, s = Object.is(c, -0) ? 0 : c, l = Ts(i, r);
  return { priceChange: s, priceChangePct: l };
}
function An(e, t) {
  if (!T(e) || e === 0)
    return "neutral";
  const n = 0.5 / Math.pow(10, t);
  return Math.abs(e) < n ? "neutral" : e > 0 ? "positive" : "negative";
}
function Rs(e, t) {
  if (!T(e))
    return '<span class="value neutral">—</span>';
  const n = fe(e);
  if (n === "—")
    return '<span class="value neutral">—</span>';
  const r = An(e, bt.max), a = t ? `&nbsp;${t}` : "";
  return `<span class="value ${r}">${n}${a}</span>`;
}
function Ls(e) {
  return T(e) ? `<span class="value ${An(e, 2)} value--percentage">${ne(e)}&nbsp;%</span>` : '<span class="value neutral">—</span>';
}
function ba(e, t, n, r) {
  const a = e, o = a.length > 0 ? a : "Zeitraum";
  return `
    <div class="security-info-bar" data-range="${a}">
      <div class="security-info-item">
        <span class="label">Preisänderung (${o})</span>
        <div class="value-row">
          ${Rs(t, r)}
          ${Ls(n)}
        </div>
      </div>
    </div>
  `;
}
function Ms(e) {
  return `
    <div class="security-range-selector" role="group" aria-label="Zeitraum">
      ${la.map((n) => `
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
function va(e, t = { status: "empty" }) {
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
      const r = ya(
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
function Cn(e) {
  const t = M(e);
  if (t == null)
    return "—";
  const n = Math.abs(t % 1) > 0, r = n ? 2 : qt.min, a = n ? qt.max : qt.min;
  return t.toLocaleString("de-DE", {
    minimumFractionDigits: r,
    maximumFractionDigits: a
  });
}
function fe(e) {
  const t = M(e);
  return t == null ? "—" : t.toLocaleString("de-DE", {
    minimumFractionDigits: bt.min,
    maximumFractionDigits: bt.max
  });
}
function Hs(e, t) {
  const n = fe(e), r = `&nbsp;${t}`;
  return `<span class="${An(e, bt.max)}">${n}${r}</span>`;
}
function Sa(e) {
  return e == null ? "" : (typeof e == "string" ? e : String(e)).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function Is(e, t) {
  const n = e?.ticker_symbol;
  if (typeof n == "string" && n.trim())
    return n.trim();
  const r = typeof e?.name == "string" ? e.name.trim() : "";
  return r || (typeof t == "string" ? t : "");
}
function Vs(e) {
  return `
    <div class="news-prompt-container">
      <button
        type="button"
        class="news-prompt-button"
        data-symbol="${Sa(e)}"
      >
        Check recent news via ChatGPT
      </button>
    </div>
  `;
}
async function zs(e) {
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
function qs(e, t, n) {
  const r = Me(e?.average_cost), a = r?.account ?? (T(t) ? t : M(t));
  if (!T(a))
    return null;
  const o = e?.account_currency_code ?? e?.account_currency;
  if (typeof o == "string" && o.trim())
    return o.trim().toUpperCase();
  const i = Pe(e?.currency_code) ?? "", c = r?.security ?? r?.native ?? (T(n) ? n : M(n)), s = hn(e?.aggregation);
  if (i && T(c) && je(a, c))
    return i;
  const l = M(s?.purchase_total_security) ?? M(e?.purchase_total_security), u = M(s?.purchase_total_account) ?? M(e?.purchase_total_account);
  let p = null;
  if (T(l) && l !== 0 && T(u) && (p = u / l), r?.source === "eur_total")
    return "EUR";
  const d = r?.eur;
  if (T(d) && je(a, d))
    return "EUR";
  const g = M(e?.purchase_value_eur);
  return T(g) ? "EUR" : p != null && je(p, 1) ? i || null : i === "EUR" ? "EUR" : i || "EUR";
}
function ir(e) {
  return typeof e != "number" || !Number.isFinite(e) || e <= 0 ? null : e.toLocaleString("de-DE", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
  });
}
function Ws(e) {
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
function Os(e) {
  if (e == null || !Number.isFinite(e))
    return null;
  const t = new Date(e);
  return Number.isNaN(t.getTime()) ? null : t.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}
function Bs(e, t) {
  if (!e)
    return null;
  const n = Pe(e.currency_code) ?? "", r = Me(e.average_cost);
  if (!r || !n)
    return null;
  const a = r.native ?? r.security ?? null;
  let i = r.account ?? r.eur ?? null, c = Pe(t) ?? "";
  if (oe(r.eur) && (!c || c === n) && (i = r.eur, c = "EUR"), !n || !c || n === c || !oe(a) || !oe(i))
    return null;
  const s = i / a;
  if (!Number.isFinite(s) || s <= 0)
    return null;
  const l = ir(s);
  if (!l)
    return null;
  let u = null;
  if (s > 0) {
    const y = 1 / s;
    Number.isFinite(y) && y > 0 && (u = ir(y));
  }
  const p = Ws(e), f = Os(p), d = [`FX-Kurs (Kauf): 1 ${n} = ${l} ${c}`];
  u && d.push(`1 ${c} = ${u} ${n}`);
  const g = [], m = r.source, _ = m in Wt ? Wt[m] : Wt.aggregation;
  if (g.push(`Quelle: ${_}`), T(r.coverage_ratio)) {
    const y = Math.min(Math.max(r.coverage_ratio * 100, 0), 100);
    g.push(
      `Abdeckung: ${y.toLocaleString("de-DE", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      })}%`
    );
  }
  g.length && d.push(...g);
  const h = f ?? "Datum unbekannt";
  return `${d.join(" · ")} (Stand: ${h})`;
}
function sr(e) {
  if (!e)
    return null;
  const t = Me(e.average_cost), n = t?.native ?? t?.security ?? null;
  return T(n) ? n : null;
}
function js(e) {
  if (!e)
    return '<div class="meta-error">Keine Snapshot-Daten verfügbar.</div>';
  const t = e.currency_code || "EUR", n = e.total_holdings_precise ?? e.total_holdings, r = Cn(n), a = e.last_price_native ?? e.last_price?.native ?? e.last_price_eur, o = fe(a), i = o === "—" ? null : `${o}${`&nbsp;${t}`}`, c = M(e.market_value_eur) ?? M(e.current_value_eur) ?? null, s = Me(e.average_cost), l = s?.native ?? s?.security ?? null, u = s?.eur ?? null, f = s?.account ?? null ?? u, d = be(e.performance), g = d?.day_change ?? null, m = g?.price_change_native ?? null, _ = g?.price_change_eur ?? null, h = T(m) ? m : _, y = T(m) ? t : "EUR", b = (k, V = "") => {
    const W = ["value"];
    return V && W.push(...V.split(" ").filter(Boolean)), `<span class="${W.join(" ")}">${k}</span>`;
  }, S = (k = "") => {
    const V = ["value--missing"];
    return k && V.push(k), b("—", V.join(" "));
  }, w = (k, V = "") => {
    if (!T(k))
      return S(V);
    const W = ["value--gain"];
    return V && W.push(V), b(Za(k), W.join(" "));
  }, C = (k, V = "") => {
    if (!T(k))
      return S(V);
    const W = ["value--gain-percentage"];
    return V && W.push(V), b(Ja(k), W.join(" "));
  }, A = i ? b(i, "value--price") : S("value--price"), N = r === "—" ? S("value--holdings") : b(r, "value--holdings"), D = T(c) ? b(`${ne(c)}&nbsp;€`, "value--market-value") : S("value--market-value"), H = T(h) ? b(
    Hs(h, y),
    "value--gain value--absolute"
  ) : S("value--absolute"), P = C(
    g?.change_pct,
    "value--percentage"
  ), E = w(
    d?.total_change_eur,
    "value--absolute"
  ), I = C(
    d?.total_change_pct,
    "value--percentage"
  ), F = qs(
    e,
    f,
    l
  ), $ = Bs(
    e,
    F
  ), Y = $ ? ` title="${Sa($)}"` : "", v = [], x = T(u);
  T(l) ? v.push(
    b(
      `${fe(l)}${`&nbsp;${t}`}`,
      "value--average value--average-native"
    )
  ) : v.push(
    S("value--average value--average-native")
  );
  let R = null, j = null;
  return x && (t !== "EUR" || !T(l) || !je(u, l)) ? (R = u, j = "EUR") : T(f) && F && (F !== t || !je(f, l ?? NaN)) && (R = f, j = F), R != null && T(R) && v.push(
    b(
      `${fe(R)}${j ? `&nbsp;${j}` : ""}`,
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
function Ks(e) {
  return `
    <div class="card security-meta-card">
      <div id="headerMeta" class="meta">
        ${js(e)}
      </div>
    </div>
  `;
}
function wa(e) {
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
function Ys(e, t, {
  currency: n,
  baseline: r,
  markers: a
} = {}) {
  const o = e.clientWidth || e.offsetWidth || 0, i = o > 0 ? o : 640, c = Math.min(Math.max(Math.floor(i * 0.5), 240), 440), s = (n || "").toUpperCase() || "EUR", l = T(r) ? r : null, u = Math.max(48, Math.min(72, Math.round(i * 0.075))), p = Math.max(28, Math.min(56, Math.round(i * 0.05))), f = Math.max(40, Math.min(64, Math.round(c * 0.14)));
  return {
    width: i,
    height: c,
    margin: {
      top: 18,
      right: p,
      bottom: f,
      left: u
    },
    series: t,
    yFormatter: (g) => fe(g),
    tooltipRenderer: ({ xFormatted: g, yFormatted: m }) => `
      <div class="chart-tooltip-date">${g}</div>
      <div class="chart-tooltip-value">${m}&nbsp;${s}</div>
    `,
    markerTooltipRenderer: ({
      marker: g,
      xFormatted: m,
      yFormatted: _
    }) => {
      const h = g.payload ?? {}, y = ma(h.type), b = M(h.shares), S = b != null ? Cn(b) : null, w = Pe(h.currency) ?? s, C = [];
      y && C.push(y), S && C.push(`${S} Stück`), m && C.push(`am ${m}`);
      const A = C.join(" ").trim() || (typeof g.label == "string" ? g.label : m), N = typeof _ == "string" && _.trim() ? _.trim() : fe(h.price), D = N ? `${N}${w ? `&nbsp;${w}` : ""}` : w;
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
const cr = /* @__PURE__ */ new WeakMap();
function Gs(e, t, n = {}) {
  if (t.length === 0)
    return;
  const r = Ys(e, t, n);
  let a = cr.get(e) ?? null;
  if (!a || !e.contains(a)) {
    e.innerHTML = "", a = oa(e, r), a && cr.set(e, a);
    return;
  }
  Sn(a, r);
}
function lr(e, t) {
  e && (e.dataset.activeRange = t, e.querySelectorAll(".security-range-button").forEach((n) => {
    const a = n.dataset.range === t;
    n.classList.toggle("active", a), n.setAttribute("aria-pressed", a ? "true" : "false"), n.disabled = !1, n.classList.remove("loading");
  }));
}
function Xs(e, t, n, r, a) {
  const o = e.querySelector(".security-info-bar");
  if (!o || !o.parentElement)
    return;
  const i = document.createElement("div");
  i.innerHTML = ba(t, n, r, a).trim();
  const c = i.firstElementChild;
  c && o.parentElement.replaceChild(c, o);
}
function ur(e, t, n, r, a = {}) {
  const o = e.querySelector(".security-detail-placeholder");
  if (o && (o.innerHTML = `
    <h2>Historie</h2>
    ${va(t, n)}
  `, n.status === "loaded" && Array.isArray(r) && r.length)) {
    const i = o.querySelector(".history-chart");
    i && requestAnimationFrame(() => {
      Gs(i, r, a);
    });
  }
}
function Zs(e) {
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
    const u = da(a), p = fa(a), f = sr(o);
    Array.isArray(c) && s.status !== "error" && u.set(i, c), Es(a), ar(a, i), lr(l, i);
    const g = an(
      c,
      o
    );
    let m = s;
    m.status !== "error" && (m = g.length ? { status: "loaded" } : { status: "empty" }), ur(
      t,
      i,
      m,
      g,
      {
        currency: o?.currency_code,
        baseline: f,
        markers: p.get(i) ?? []
      }
    );
    const _ = async (h) => {
      if (h === ha(a))
        return;
      const y = l.querySelector(
        `.security-range-button[data-range="${h}"]`
      );
      y && (y.disabled = !0, y.classList.add("loading"));
      let b = u.get(h) ?? null, S = p.get(h) ?? null, w = null, C = [];
      if (b)
        w = b.length ? { status: "loaded" } : { status: "empty" };
      else
        try {
          const E = vt(h), I = await ut(
            n,
            r,
            a,
            E
          );
          b = rn(I.prices), S = wt(
            I.transactions,
            o?.currency_code,
            o
          ), u.set(h, b), S = Array.isArray(S) ? S : [], p.set(h, S), w = b.length ? { status: "loaded" } : { status: "empty" };
        } catch (E) {
          console.error("Range-Wechsel: Historie konnte nicht geladen werden", E), b = [], S = [], w = {
            status: "error",
            message: wa(E) || "Die historischen Daten konnten aufgrund eines Fehlers nicht geladen werden."
          };
        }
      if (!Array.isArray(S))
        try {
          const E = vt(h), I = await ut(
            n,
            r,
            a,
            E
          );
          S = wt(
            I.transactions,
            o?.currency_code,
            o
          ), S = Array.isArray(S) ? S : [], p.set(h, S);
        } catch (E) {
          console.error("Range-Wechsel: Transaktionsmarker konnten nicht geladen werden", E), S = [];
        }
      C = an(b, o), w.status !== "error" && (w = C.length ? { status: "loaded" } : { status: "empty" });
      const A = Pn(o), { priceChange: N, priceChangePct: D } = _a(
        C,
        A
      ), H = Array.isArray(S) ? S : [];
      ar(a, h), lr(l, h), Xs(
        t,
        h,
        N,
        D,
        o?.currency_code
      );
      const P = sr(o);
      ur(
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
      !b || !la.includes(b) || _(b);
    });
  }, 0);
}
function Js(e) {
  const { root: t, hass: n, panelConfig: r, tickerSymbol: a } = e;
  let o = null, i = !1;
  const c = async () => {
    try {
      o = await po(n, r);
    } catch (s) {
      i = !0, console.warn("News-Prompt: Prefetch fehlgeschlagen", s);
    }
  };
  c(), setTimeout(() => {
    const s = t.querySelector(".news-prompt-button");
    if (!s)
      return;
    const l = (p) => {
      const f = (o?.placeholder || rr).trim() || rr, d = (o?.prompt_template || "").trim(), g = (o?.link || "").trim() || ws;
      return { body: d ? d.includes(f) ? d.split(f).join(p) : `${d}

Ticker: ${p}` : `Ticker: ${p}`, link: g };
    }, u = async () => {
      const p = (s.dataset.symbol || a || "").trim();
      if (!p) {
        console.warn("News-Prompt: Kein Ticker verfügbar");
        return;
      }
      if (!s.classList.contains("loading")) {
        s.disabled = !0, s.classList.add("loading");
        try {
          const { body: f, link: d } = l(p);
          await zs(f) || console.warn("News-Prompt: Clipboard unavailable – prompt could not be copied"), Us(d), !o && !i && c();
        } catch (f) {
          console.error("News-Prompt: Kopiervorgang fehlgeschlagen", f);
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
async function Qs(e, t, n, r) {
  if (!r)
    return console.error("renderSecurityDetail: securityUuid fehlt"), '<div class="card"><h2>Fehler</h2><p>Kein Wertpapier angegeben.</p></div>';
  const a = Cs(r);
  let o = null, i = null;
  try {
    const P = await fo(
      t,
      n,
      r
    ), E = P.snapshot;
    o = E && typeof E == "object" ? E : P;
  } catch (P) {
    console.error("renderSecurityDetail: Snapshot konnte nicht geladen werden", P), i = ya(P);
  }
  const c = o || a, s = !!(a && !o), l = (c?.source ?? "") === "cache";
  r && As(r, c ?? null);
  const u = c && (s || l) ? Ps({ fallbackUsed: s, flaggedAsCache: l }) : "", p = c?.name || "Wertpapierdetails", f = dn(p, "", { includeMeta: !1 });
  f.classList.add("security-detail-header");
  const d = Ks(c);
  if (i)
    return `
      ${f.outerHTML}
      ${d}
      ${u}
      <div class="card error-card">
        <h2>Fehler beim Laden</h2>
        <p>${i}</p>
      </div>
    `;
  const g = ha(r), m = da(r), _ = fa(r);
  let h = m.has(g) ? m.get(g) ?? null : null, y = { status: "empty" }, b = _.has(g) ? _.get(g) ?? null : null;
  if (Array.isArray(h))
    y = h.length ? { status: "loaded" } : { status: "empty" };
  else {
    h = [];
    try {
      const P = vt(g), E = await ut(
        t,
        n,
        r,
        P
      );
      h = rn(E.prices), b = wt(
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
        message: wa(P) || "Die historischen Daten konnten aufgrund eines Fehlers nicht geladen werden."
      };
    }
  }
  if (!Array.isArray(b))
    try {
      const P = vt(g), E = await ut(
        t,
        n,
        r,
        P
      ), I = rn(E.prices);
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
  const S = an(
    h,
    c
  );
  y.status !== "error" && (y = S.length ? { status: "loaded" } : { status: "empty" });
  const w = Is(c, r), C = Vs(w), A = Pn(c), { priceChange: N, priceChangePct: D } = _a(
    S,
    A
  ), H = ba(
    g,
    N,
    D,
    c?.currency_code
  );
  return Zs({
    root: e,
    hass: t,
    panelConfig: n,
    securityUuid: r,
    snapshot: c,
    initialRange: g,
    initialHistory: h,
    initialHistoryState: y
  }), Js({
    root: e,
    hass: t,
    panelConfig: n,
    tickerSymbol: w
  }), `
    ${f.outerHTML}
    ${d}
    ${u}
    ${C}
    ${H}
    ${Ms(g)}
    <div class="card security-detail-placeholder">
      <h2>Historie</h2>
      ${va(g, y)}
    </div>
  `;
}
function ec(e) {
  const { setSecurityDetailTabFactory: t } = e;
  if (typeof t != "function") {
    console.error("registerSecurityDetailTab: Ungültige Factory-Funktion übergeben");
    return;
  }
  t((n) => ({
    title: "Wertpapier",
    render: (r, a, o) => Qs(r, a, o, n),
    cleanup: () => {
      Fs(n);
    }
  }));
}
const tc = Xa, on = "pp-reader-sticky-anchor", Pt = "overview", nc = "analyse", sn = "security:", rc = [
  { key: Pt, title: "Dashboard", render: Kr },
  { key: nc, title: "Analyse", render: ds }
], Le = /* @__PURE__ */ new Map(), Je = [], At = /* @__PURE__ */ new Map();
let cn = null, Ot = !1, De = null, q = 0, Bt = null;
function Ct(e) {
  return typeof e == "object" && e !== null;
}
function Pa(e) {
  return typeof e == "object" && e !== null && typeof e.then == "function";
}
function ac(e) {
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
function oc(e) {
  return e === "accounts" || e === "last_file_update" || e === "portfolio_values" || e === "portfolio_positions";
}
function dr(e) {
  const t = e.portfolio_uuid;
  if (typeof t == "string" && t)
    return t;
  const n = e.portfolioUuid;
  return typeof n == "string" && n ? n : null;
}
function ic(e) {
  if (!e)
    return null;
  if (Array.isArray(e)) {
    for (const t of e)
      if (Ct(t)) {
        const n = dr(t);
        if (n)
          return n;
      }
    return null;
  }
  return Ct(e) ? dr(e) : null;
}
function sc(e, t) {
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
function Nn(e) {
  return typeof e != "string" || !e.startsWith(sn) ? null : e.slice(sn.length) || null;
}
function cc() {
  if (!De)
    return !1;
  const e = xa(De);
  return e || (De = null), e;
}
function le() {
  const e = Je.map((t) => Le.get(t)).filter((t) => !!t);
  return [...rc, ...e];
}
function lc(e) {
  const t = le();
  return e < 0 || e >= t.length ? null : t[e];
}
function Aa(e) {
  if (!e)
    return null;
  const t = e, n = t.ppreader ?? t.pp_reader;
  return n || (Object.values(t).find((a) => !a || typeof a != "object" ? !1 : a.webcomponent_name === "pp-reader-panel") ?? null);
}
function Ca() {
  try {
    const e = Dt();
    e && typeof e.rememberScrollPosition == "function" && e.rememberScrollPosition();
  } catch (e) {
    console.warn("rememberCurrentPageScroll: konnte Scroll-Position nicht sichern", e);
  }
}
function fr(e) {
  const t = le();
  return !t.length || e < 0 ? 0 : e >= t.length ? t.length - 1 : e;
}
async function uc(e, t, n, r) {
  const a = le(), o = fr(e);
  if (o === q) {
    e > q && cc();
    return;
  }
  Ca();
  const i = q >= 0 && q < a.length ? a[q] : null, c = i ? Nn(i.key) : null;
  let s = o;
  if (c) {
    const l = o >= 0 && o < a.length ? a[o] : null;
    if (l && l.key === Pt && hc(c, { suppressRender: !0 })) {
      const f = le().findIndex((d) => d.key === Pt);
      s = f >= 0 ? f : 0;
    }
  }
  if (!Ot) {
    Ot = !0;
    try {
      q = fr(s);
      const l = q;
      await Fa(t, n, r), gc(l);
    } catch (l) {
      console.error("navigateToPage: Fehler beim Rendern des Tabs", l);
    } finally {
      Ot = !1;
    }
  }
}
function Nt(e, t, n, r) {
  uc(q + e, t, n, r);
}
function dc(e, t) {
  if (!e || !t || typeof t.render != "function") {
    console.error("registerDetailTab: Ungültiger Tab-Descriptor", e, t);
    return;
  }
  const n = Nn(e);
  if (n) {
    const a = At.get(n);
    a && a !== e && Na(a);
  }
  const r = {
    ...t,
    key: e
  };
  Le.set(e, r), n && At.set(n, e), Je.includes(e) || Je.push(e);
}
function Na(e) {
  if (!e)
    return;
  const t = Le.get(e);
  if (t && typeof t.cleanup == "function")
    try {
      const a = t.cleanup({ key: e });
      Pa(a) && a.catch((o) => {
        console.error(
          "unregisterDetailTab: Fehler beim asynchronen cleanup",
          o
        );
      });
    } catch (a) {
      console.error("unregisterDetailTab: Fehler beim Ausführen von cleanup", a);
    }
  Le.delete(e);
  const n = Je.indexOf(e);
  n >= 0 && Je.splice(n, 1);
  const r = Nn(e);
  r && At.get(r) === e && At.delete(r);
}
function fc(e) {
  return Le.has(e);
}
function pr(e) {
  return Le.get(e) ?? null;
}
function pc(e) {
  if (e != null && typeof e != "function") {
    console.error("setSecurityDetailTabFactory: Erwartet Funktion oder null", e);
    return;
  }
  cn = e ?? null;
}
function Ea(e) {
  return `${sn}${e}`;
}
function Dt() {
  for (const t of mo())
    if (t.isConnected)
      return t;
  const e = /* @__PURE__ */ new Set();
  for (const t of yo())
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
function ln() {
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
const Ec = {
  findDashboardElement: Dt
};
function gc(e) {
  const t = Dt();
  if (t && typeof t.handleExternalRender == "function")
    try {
      t.handleExternalRender(e);
    } catch (n) {
      console.warn("notifyExternalRender: Fehler beim Synchronisieren des Dashboards", n);
    }
}
function xa(e) {
  if (!e)
    return console.error("openSecurityDetail: Ungültige securityUuid", e), !1;
  const t = Ea(e);
  let n = pr(t);
  if (!n && typeof cn == "function")
    try {
      const o = cn(e);
      o && typeof o.render == "function" ? (dc(t, o), n = pr(t)) : console.error("openSecurityDetail: Factory lieferte ungültigen Descriptor", o);
    } catch (o) {
      console.error("openSecurityDetail: Fehler beim Erzeugen des Tab-Descriptors", o);
    }
  if (!n)
    return console.warn(`openSecurityDetail: Kein Detail-Tab für ${e} verfügbar`), !1;
  Ca();
  let a = le().findIndex((o) => o.key === t);
  return a === -1 && (a = le().findIndex((i) => i.key === t), a === -1) ? (console.error("openSecurityDetail: Tab nach Registrierung nicht auffindbar"), !1) : (q = a, De = null, ln(), !0);
}
function hc(e, t = {}) {
  if (!e)
    return console.error("closeSecurityDetail: Ungültige securityUuid", e), !1;
  const { suppressRender: n = !1 } = t, r = Ea(e);
  if (!fc(r))
    return !1;
  const o = le().findIndex((s) => s.key === r), i = o === q;
  Na(r);
  const c = le();
  if (!c.length)
    return q = 0, n || ln(), !0;
  if (De = e, i) {
    const s = c.findIndex((l) => l.key === Pt);
    s >= 0 ? q = s : q = Math.min(Math.max(o - 1, 0), c.length - 1);
  } else q >= c.length && (q = Math.max(0, c.length - 1));
  return n || ln(), !0;
}
async function Fa(e, t, n) {
  let r = n;
  r || (r = Aa(t ? t.panels : null));
  const a = le();
  q >= a.length && (q = Math.max(0, a.length - 1));
  const o = lc(q);
  if (!o) {
    console.error("renderTab: Kein gültiger Tab oder keine render-Methode gefunden!");
    return;
  }
  let i;
  try {
    i = await o.render(e, t, r);
  } catch (u) {
    console.error("renderTab: Fehler beim Rendern des Tabs:", u), e.innerHTML = `<div class="card"><h2>Fehler</h2><pre>${ac(u)}</pre></div>`;
    return;
  }
  e.innerHTML = i ?? "", o.render === Kr && vn(e);
  const s = await new Promise((u) => {
    const p = window.setInterval(() => {
      const f = e.querySelector(".header-card");
      f && (clearInterval(p), u(f));
    }, 50);
  });
  let l = e.querySelector(`#${on}`);
  if (!l) {
    l = document.createElement("div"), l.id = on;
    const u = s.parentNode;
    u && "insertBefore" in u && u.insertBefore(l, s);
  }
  _c(e, t, n), yc(e, t, n), mc(e);
}
function mc(e) {
  const t = e.querySelector(".header-card"), n = e.querySelector(`#${on}`);
  if (!t || !n) {
    console.error("Fehlende Elemente für das Scrollverhalten: headerCard oder anchor.");
    return;
  }
  Bt?.disconnect(), Bt = new IntersectionObserver(
    ([r]) => {
      r.isIntersecting ? t.classList.remove("sticky") : t.classList.add("sticky");
    },
    {
      root: null,
      rootMargin: "0px 0px 0px 0px",
      threshold: 0
    }
  ), Bt.observe(n);
}
function yc(e, t, n) {
  const r = e.querySelector(".header-card");
  if (!r) {
    console.error("Header-Card nicht gefunden!");
    return;
  }
  tc(
    r,
    () => {
      Nt(1, e, t, n);
    },
    () => {
      Nt(-1, e, t, n);
    }
  );
}
function _c(e, t, n) {
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
  }), bc(r);
}
function bc(e) {
  const t = e.querySelector("#nav-left"), n = e.querySelector("#nav-right");
  if (t && (q === 0 ? (t.disabled = !0, t.classList.add("disabled")) : (t.disabled = !1, t.classList.remove("disabled"))), n) {
    const r = le(), o = !(q === r.length - 1) || !!De;
    n.disabled = !o, n.classList.toggle("disabled", !o);
  }
}
class vc extends HTMLElement {
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
    this._panel || (this._panel = Aa(this._hass.panels ?? null));
    const t = kn(this._hass, this._panel);
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
    const n = kn(this._hass, this._panel);
    if (!n)
      return;
    const r = t.data;
    if (!oc(r.data_type) || r.entry_id && r.entry_id !== n)
      return;
    const a = sc(r.data_type, r.data);
    a && (this._queueUpdate(a.type, a.data), this._doRender(a.type, a.data));
  }
  _doRender(t, n) {
    switch (t) {
      case "accounts":
        ii(
          n,
          this._root
        );
        break;
      case "last_file_update":
        hi(
          n,
          this._root
        );
        break;
      case "portfolio_values":
        li(
          n,
          this._root
        );
        break;
      case "portfolio_positions":
        fi(
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
    t === "portfolio_positions" && (a.portfolioUuid = ic(
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
  rememberScrollPosition(t = q) {
    const n = Number.isInteger(t) ? t : q;
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
    const t = q;
    if (!this._hasNewData && this._panel === this._lastPanel && this._narrow === this._lastNarrow && this._route === this._lastRoute && this._lastPage === t)
      return;
    this._lastPage != null && (this._scrollPositions[this._lastPage] = this._root.scrollTop);
    const n = Fa(this._root, this._hass, this._panel);
    if (Pa(n)) {
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
customElements.get("pp-reader-dashboard") || customElements.define("pp-reader-dashboard", vc);
console.log("PPReader dashboard module v20250914b geladen");
ec({
  setSecurityDetailTabFactory: pc
});
export {
  Ec as __TEST_ONLY_DASHBOARD,
  Nc as __TEST_ONLY__,
  hc as closeSecurityDetail,
  bn as flushPendingPositions,
  pr as getDetailTabDescriptor,
  fi as handlePortfolioPositionsUpdate,
  fc as hasDetailTab,
  xa as openSecurityDetail,
  Cc as reapplyPositionsSort,
  Sc as registerDashboardElement,
  dc as registerDetailTab,
  Pc as registerPanelHost,
  pc as setSecurityDetailTabFactory,
  wc as unregisterDashboardElement,
  Na as unregisterDetailTab,
  Ac as unregisterPanelHost,
  jr as updatePortfolioFooterFromDom
};
//# sourceMappingURL=dashboard.DZaFagGo.js.map
