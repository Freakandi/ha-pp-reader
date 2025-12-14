function Fn(e, t) {
  try {
    t();
  } catch (n) {
    console.warn(`addSwipeEvents: ${e} handler threw`, n);
  }
}
function Xa(e, t, n) {
  let r = null;
  const a = (c) => {
    c < -50 ? Fn("left", t) : c > 50 && Fn("right", n);
  }, i = (c) => {
    c.touches.length === 1 && (r = c.touches[0].clientX);
  }, o = (c) => {
    if (r === null)
      return;
    if (c.changedTouches.length === 0) {
      r = null;
      return;
    }
    const u = c.changedTouches[0];
    a(u.clientX - r), r = null;
  }, l = (c) => {
    r = c.clientX;
  }, s = (c) => {
    r !== null && (a(c.clientX - r), r = null);
  };
  e.addEventListener("touchstart", i, { passive: !0 }), e.addEventListener("touchend", o, { passive: !0 }), e.addEventListener("mousedown", l), e.addEventListener("mouseup", s);
}
const un = (e, t) => {
  if (!Number.isFinite(e) || e === 0)
    return "neutral";
  const n = 0.5 / Math.pow(10, t);
  return Math.abs(e) < n ? "neutral" : e > 0 ? "positive" : "negative";
};
function L(e, t, n = void 0, r = void 0) {
  let a = null;
  const i = (s) => {
    if (typeof s == "number")
      return s;
    if (typeof s == "string" && s.trim() !== "") {
      const c = s.replace(/\s+/g, "").replace(/[^0-9,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."), u = Number.parseFloat(c);
      return Number.isNaN(u) ? Number.NaN : u;
    }
    return Number.NaN;
  }, o = (s, c = 2, u = 2) => {
    const p = typeof s == "number" ? s : i(s);
    return Number.isFinite(p) ? p.toLocaleString("de-DE", {
      minimumFractionDigits: c,
      maximumFractionDigits: u
    }) : "";
  }, l = (s = "") => {
    const c = s || "Kein Wert verfügbar";
    return `<span class="missing-value" role="note" aria-label="${c}" title="${c}">—</span>`;
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
      return l(s);
    const c = typeof t == "number" ? t : i(t);
    if (!Number.isFinite(c))
      return l(s);
    const u = e.endsWith("pct") ? "%" : "€";
    return a = o(c) + `&nbsp;${u}`, `<span class="${un(c, 2)}">${a}</span>`;
  } else if (e === "position_count") {
    const s = typeof t == "number" ? t : i(t);
    if (!Number.isFinite(s))
      return l();
    a = s.toLocaleString("de-DE");
  } else if (["balance", "current_value", "purchase_value"].includes(e)) {
    const s = typeof t == "number" ? t : i(t);
    if (!Number.isFinite(s))
      return n?.fx_unavailable ? l("Wechselkurs nicht verfügbar – EUR-Wert unbekannt") : (r && r.hasValue === !1, l());
    a = o(s) + "&nbsp;€";
  } else if (e === "current_holdings") {
    const s = typeof t == "number" ? t : i(t);
    if (!Number.isFinite(s))
      return l();
    const c = Math.abs(s % 1) > 0;
    a = s.toLocaleString("de-DE", {
      minimumFractionDigits: c ? 2 : 0,
      maximumFractionDigits: 4
    });
  } else {
    let s = "";
    typeof t == "string" ? s = t : typeof t == "number" && Number.isFinite(t) ? s = t.toString() : typeof t == "boolean" ? s = t ? "true" : "false" : t instanceof Date && Number.isFinite(t.getTime()) && (s = t.toISOString()), a = s, a && (/<|&lt;|&gt;/.test(a) || (a.length > 60 && (a = a.slice(0, 59) + "…"), a.startsWith("Kontostand ") ? a = a.substring(11) : a.startsWith("Depotwert ") && (a = a.substring(10))));
  }
  return typeof a != "string" || a === "" ? l() : a;
}
function $e(e, t, n = [], r = {}) {
  const { sortable: a = !1, defaultSort: i } = r, o = i?.key ?? "", l = i?.dir === "desc" ? "desc" : "asc", s = (h) => {
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
  let c = "<table><thead><tr>";
  t.forEach((h) => {
    const y = h.align === "right" ? ' class="align-right"' : "";
    a && h.key ? c += `<th${y} data-sort-key="${h.key}">${h.label}</th>` : c += `<th${y}>${h.label}</th>`;
  }), c += "</tr></thead><tbody>", e.forEach((h) => {
    c += "<tr>", t.forEach((y) => {
      const b = y.align === "right" ? ' class="align-right"' : "";
      c += `<td${b}>${L(y.key, h[y.key], h)}</td>`;
    }), c += "</tr>";
  });
  const u = {}, p = {};
  t.forEach((h) => {
    if (n.includes(h.key)) {
      const y = e.reduce(
        (b, S) => {
          let P = S[h.key];
          if ((h.key === "gain_abs" || h.key === "gain_pct") && (typeof P != "number" || !Number.isFinite(P))) {
            const C = S.performance;
            if (typeof C == "object" && C !== null) {
              const w = C[h.key];
              typeof w == "number" && (P = w);
            }
          } else if ((h.key === "day_change_abs" || h.key === "day_change_pct") && (typeof P != "number" || !Number.isFinite(P))) {
            const C = S.performance;
            if (typeof C == "object" && C !== null) {
              const w = C.day_change;
              if (w && typeof w == "object") {
                const N = h.key === "day_change_pct" ? w.change_pct : w.value_change_eur ?? w.price_change_eur;
                typeof N == "number" && (P = N);
              }
            }
          }
          if (typeof P == "number" && Number.isFinite(P)) {
            const C = P;
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
  if (g != null && (m = `${re(g)} %`, g > 0 ? _ = "positive" : g < 0 && (_ = "negative")), c += '<tr class="footer-row">', t.forEach((h, y) => {
    const b = h.align === "right" ? ' class="align-right"' : "";
    if (y === 0) {
      c += `<td${b}>Summe</td>`;
      return;
    }
    if (u[h.key] != null) {
      let P = "";
      h.key === "gain_abs" && m && (P = ` data-gain-pct="${s(m)}" data-gain-sign="${s(_)}"`), c += `<td${b}${P}>${L(h.key, u[h.key], void 0, p[h.key])}</td>`;
      return;
    }
    if (h.key === "gain_pct" && u.gain_pct != null) {
      c += `<td${b}>${L("gain_pct", u.gain_pct, void 0, p[h.key])}</td>`;
      return;
    }
    const S = p[h.key] ?? { hasValue: !1 };
    c += `<td${b}>${L(h.key, null, void 0, S)}</td>`;
  }), c += "</tr>", c += "</tbody></table>", a)
    try {
      const h = document.createElement("template");
      h.innerHTML = c.trim();
      const y = h.content.querySelector("table");
      if (y)
        return y.classList.add("sortable-table"), o && (y.dataset.defaultSort = o, y.dataset.defaultDir = l), y.outerHTML;
    } catch (h) {
      console.warn("makeTable(sortable): Injection fehlgeschlagen:", h);
    }
  return c;
}
function dn(e, t, n = {}) {
  const { includeMeta: r = !0 } = n, a = document.createElement("div");
  a.className = "header-card";
  const i = r ? `<div id="headerMeta" class="meta">${t}</div>` : "";
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
    ${i}
  `, a;
}
function re(e, t = 2, n = 2) {
  return (Number.isNaN(e) ? 0 : e).toLocaleString("de-DE", {
    minimumFractionDigits: t,
    maximumFractionDigits: n
  });
}
function Za(e) {
  const t = Number.isNaN(e) ? 0 : e;
  return `<span class="${un(t, 2)}">${re(t)}&nbsp;€</span>`;
}
function Ja(e) {
  const t = Number.isNaN(e) ? 0 : e;
  return `<span class="${un(t, 2)}">${re(t)}&nbsp;%</span>`;
}
function gr(e, t, n = "asc", r = !1) {
  if (!e)
    return [];
  const a = e.querySelector("tbody");
  if (!a)
    return [];
  const i = a.querySelector("tr.footer-row"), o = Array.from(a.querySelectorAll("tr")).filter((u) => u !== i);
  let l = -1;
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
    typeof p == "number" && (l = p);
  } else {
    const u = Array.from(e.querySelectorAll("thead th"));
    for (let p = 0; p < u.length; p++)
      if (u[p].getAttribute("data-sort-key") === t) {
        l = p;
        break;
      }
  }
  if (l < 0)
    return o;
  const s = (u) => {
    const p = u.replace(/\u00A0/g, " ").replace(/[%€]/g, "").replace(/\./g, "").replace(/,/g, ".").replace(/[^\d.-]/g, "").trim();
    if (!p) return NaN;
    const f = parseFloat(p);
    return Number.isFinite(f) ? f : NaN;
  };
  o.sort((u, p) => {
    const f = u.cells.item(l), d = p.cells.item(l), g = (f?.textContent ?? "").trim(), m = (d?.textContent ?? "").trim(), _ = s(g), h = s(m);
    let y;
    const b = /[0-9]/.test(g) || /[0-9]/.test(m);
    return !Number.isNaN(_) && !Number.isNaN(h) && b ? y = _ - h : y = g.localeCompare(m, "de", { sensitivity: "base" }), n === "asc" ? y : -y;
  }), o.forEach((u) => a.appendChild(u)), i && a.appendChild(i), e.querySelectorAll("thead th.sort-active").forEach((u) => {
    u.classList.remove("sort-active", "dir-asc", "dir-desc");
  });
  const c = e.querySelector(`thead th[data-sort-key="${t}"]`);
  return c && c.classList.add("sort-active", n === "asc" ? "dir-asc" : "dir-desc"), o;
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
function Dn(e) {
  const t = V(e);
  if (t == null)
    return null;
  const n = Math.trunc(t);
  return Number.isFinite(n) ? n : null;
}
function it(e) {
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
  const t = O(e.name), n = O(e.currency_code), r = V(e.orig_balance);
  if (!t || !n || r == null)
    return null;
  const a = e.balance === null ? null : V(e.balance), i = {
    uuid: O(e.uuid) ?? void 0,
    name: t,
    currency_code: n,
    orig_balance: r,
    balance: a ?? null
  }, o = V(e.fx_rate);
  o != null && (i.fx_rate = o);
  const l = O(e.fx_rate_source);
  l && (i.fx_rate_source = l);
  const s = O(e.fx_rate_timestamp);
  s && (i.fx_rate_timestamp = s);
  const c = V(e.coverage_ratio);
  c != null && (i.coverage_ratio = c);
  const u = O(e.provenance);
  u && (i.provenance = u);
  const p = Qe(e.metric_run_uuid);
  p !== null && (i.metric_run_uuid = p);
  const f = mr(e.fx_unavailable);
  return typeof f == "boolean" && (i.fx_unavailable = f), i;
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
function ei(e) {
  if (!pe(e))
    return null;
  const t = e.aggregation, n = O(e.security_uuid), r = O(e.name), a = V(e.current_holdings), i = V(e.purchase_value_eur) ?? (pe(t) ? V(t.purchase_value_eur) ?? V(t.purchase_total_account) ?? V(t.account_currency_total) : null) ?? V(e.purchase_value), o = V(e.current_value);
  if (!n || !r || a == null || i == null || o == null)
    return null;
  const l = {
    portfolio_uuid: O(e.portfolio_uuid) ?? void 0,
    security_uuid: n,
    name: r,
    ticker_symbol: O(e.ticker_symbol),
    currency_code: O(e.currency_code),
    current_holdings: a,
    purchase_value: i,
    current_value: o,
    average_cost: it(e.average_cost),
    performance: it(e.performance),
    aggregation: it(e.aggregation),
    data_state: hr(e.data_state)
  }, s = V(e.coverage_ratio);
  s != null && (l.coverage_ratio = s);
  const c = O(e.provenance);
  c && (l.provenance = c);
  const u = Qe(e.metric_run_uuid);
  u !== null && (l.metric_run_uuid = u);
  const p = V(e.last_price_native);
  p != null && (l.last_price_native = p);
  const f = V(e.last_price_eur);
  f != null && (l.last_price_eur = f);
  const d = V(e.last_close_native);
  d != null && (l.last_close_native = d);
  const g = V(e.last_close_eur);
  return g != null && (l.last_close_eur = g), l;
}
function _r(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = ei(n);
    r && t.push(r);
  }
  return t;
}
function br(e) {
  if (!pe(e))
    return null;
  const t = O(e.name), n = V(e.current_value ?? e.value);
  if (!t || n == null)
    return null;
  const a = V(
    e.purchase_sum ?? e.purchase_value_eur ?? e.purchase_value ?? e.purchaseSum
  ) ?? 0, i = {
    uuid: O(e.uuid) ?? void 0,
    name: t,
    current_value: n,
    purchase_value: a,
    purchase_sum: a,
    day_change_abs: V(e.day_change_abs) ?? V(e.day_change_eur) ?? void 0,
    day_change_pct: V(e.day_change_pct) ?? void 0,
    position_count: Dn(e.position_count ?? e.count) ?? void 0,
    missing_value_positions: Dn(e.missing_value_positions) ?? void 0,
    has_current_value: mr(e.has_current_value),
    performance: it(e.performance),
    coverage_ratio: V(e.coverage_ratio) ?? void 0,
    provenance: O(e.provenance) ?? void 0,
    metric_run_uuid: Qe(e.metric_run_uuid) ?? void 0,
    data_state: hr(e.data_state)
  };
  return Array.isArray(e.positions) && (i.positions = _r(e.positions)), i;
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
  const r = V(e.coverage_ratio);
  r != null ? t.coverage_ratio = r : delete t.coverage_ratio;
  const a = O(e.provenance);
  a ? t.provenance = a : delete t.provenance;
  const i = O(e.generated_at ?? e.snapshot_generated_at);
  return i ? t.generated_at = i : delete t.generated_at, t;
}
function ti(e) {
  if (!pe(e))
    return null;
  const t = { ...e }, n = Sr(e.normalized_payload);
  return n ? t.normalized_payload = n : "normalized_payload" in t && delete t.normalized_payload, t;
}
function Pr(e) {
  if (!pe(e))
    return null;
  const t = O(e.generated_at);
  if (!t)
    return null;
  const n = Qe(e.metric_run_uuid), r = yr(e.accounts), a = vr(e.portfolios), i = ti(e.diagnostics), o = {
    generated_at: t,
    metric_run_uuid: n,
    accounts: r,
    portfolios: a
  };
  return i && (o.diagnostics = i), o;
}
function te(e) {
  return typeof e == "string" ? e : null;
}
function ni(e) {
  if (typeof e == "string")
    return e;
  if (e === null)
    return null;
}
function ri(e) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
}
function $n(e, t) {
  if (typeof e == "string")
    return e;
  throw new Error(`mapPositionSnapshotToRecord: fehlendes ${t}`);
}
function Tt(e, t) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  throw new Error(`mapPositionSnapshotToRecord: fehlendes ${t}`);
}
function ai(e) {
  const t = $n(e.security_uuid, "security_uuid"), n = $n(e.name, "name"), r = Tt(e.current_holdings, "current_holdings"), a = Tt(e.purchase_value, "purchase_value"), i = Tt(e.current_value, "current_value"), o = {
    security_uuid: t,
    name: n,
    current_holdings: r,
    purchase_value: a,
    current_value: i,
    average_cost: e.average_cost ?? null,
    performance: e.performance ?? null,
    aggregation: e.aggregation ?? null
  };
  return e.currency_code !== void 0 && (o.currency_code = e.currency_code), e.coverage_ratio != null && (o.coverage_ratio = e.coverage_ratio), e.provenance && (o.provenance = e.provenance), e.metric_run_uuid !== void 0 && (o.metric_run_uuid = e.metric_run_uuid), e.last_price_native != null && (o.last_price_native = e.last_price_native), e.last_price_eur != null && (o.last_price_eur = e.last_price_eur), e.last_close_native != null && (o.last_close_native = e.last_close_native), e.last_close_eur != null && (o.last_close_eur = e.last_close_eur), e.data_state && (o.data_state = e.data_state), e.ticker_symbol && (o.ticker_symbol = e.ticker_symbol), e.portfolio_uuid && (o.portfolio_uuid = e.portfolio_uuid), o;
}
function ge(e, t) {
  let n = t?.config?.entry_id ?? t?.entry_id ?? t?.config?._panel_custom?.config?.entry_id ?? void 0;
  if (!n && e?.panels) {
    const r = e.panels, a = r.ppreader ?? r.pp_reader ?? Object.values(r).find(
      (i) => i?.webcomponent_name === "pp-reader-panel"
    );
    n = a?.config?.entry_id ?? a?.entry_id ?? a?.config?._panel_custom?.config?.entry_id ?? void 0;
  }
  return n ?? void 0;
}
function Tn(e, t) {
  return ge(e, t);
}
async function ii(e, t) {
  if (!e)
    throw new Error("fetchAccountsWS: fehlendes hass");
  const n = ge(e, t);
  if (!n)
    throw new Error("fetchAccountsWS: fehlendes entry_id");
  const r = await e.connection.sendMessagePromise({
    type: "pp_reader/get_accounts",
    entry_id: n
  }), a = yr(r.accounts), i = Pr(r.normalized_payload);
  return {
    accounts: a,
    normalized_payload: i
  };
}
async function oi(e, t) {
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
async function si(e, t) {
  if (!e)
    throw new Error("fetchPortfoliosWS: fehlendes hass");
  const n = ge(e, t);
  if (!n)
    throw new Error("fetchPortfoliosWS: fehlendes entry_id");
  const r = await e.connection.sendMessagePromise({
    type: "pp_reader/get_portfolio_data",
    entry_id: n
  }), a = vr(r.portfolios), i = Pr(r.normalized_payload);
  return {
    portfolios: a,
    normalized_payload: i
  };
}
function ci(e, t, n) {
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
function Z(e) {
  return typeof e == "number" && Number.isFinite(e) ? e : 0;
}
function kn(e) {
  return e === null ? null : typeof e == "number" && Number.isFinite(e) ? e : null;
}
function Ar(e) {
  const t = te(e.date);
  if (!t)
    return null;
  const n = {
    date: t,
    total_wealth_eur: Z(e.total_wealth_eur),
    portfolio_wealth_eur: Z(e.portfolio_wealth_eur),
    account_wealth_eur: Z(e.account_wealth_eur),
    dividends_eur: Z(e.dividends_eur),
    interest_eur: Z(e.interest_eur),
    inbound_transfers_eur: Z(e.inbound_transfers_eur),
    outbound_transfers_eur: Z(e.outbound_transfers_eur),
    performance_neutral_movements: Z(e.performance_neutral_movements),
    fees_eur: Z(e.fees_eur),
    taxes_eur: Z(e.taxes_eur),
    realized_gains_eur: Z(e.realized_gains_eur),
    unrealized_gains_eur: Z(e.unrealized_gains_eur),
    invested_capital_eur: Z(e.invested_capital_eur),
    fx_coverage_ratio: kn(e.fx_coverage_ratio),
    price_coverage_ratio: kn(e.price_coverage_ratio),
    stale_price: e.stale_price === !0
  }, r = te(e.provenance);
  return r && (n.provenance = r), n;
}
function Rn(e) {
  const t = Ar(e), n = te(e.scope_type), r = te(e.scope_id);
  if (!t || !n || !r || n !== "portfolio" && n !== "account")
    return null;
  const a = {
    ...t,
    scope_type: n,
    scope_id: r
  }, i = te(e.scope_name);
  return i && (a.scope_name = i), a;
}
function li(e) {
  if (!e || typeof e != "object")
    return;
  const t = e, n = Array.isArray(t.accounts) ? t.accounts : [], r = Array.isArray(t.portfolios) ? t.portfolios : [], a = n.map((o) => o && typeof o == "object" ? Rn(o) : null).filter((o) => !!o), i = r.map((o) => o && typeof o == "object" ? Rn(o) : null).filter((o) => !!o);
  if (!(a.length === 0 && i.length === 0))
    return { accounts: a, portfolios: i };
}
async function ui(e, t, n) {
  if (!e)
    throw new Error("fetchDailyWealthWS: fehlendes hass");
  const r = ge(e, t);
  if (!r)
    throw new Error("fetchDailyWealthWS: fehlendes entry_id");
  const { date: a, range: i, includeSlices: o, includeScopes: l, scopes: s, limit: c, offset: u } = n, p = te(a), f = i && typeof i == "object" ? {
    start: te(i.start) ?? "",
    end: te(i.end) ?? ""
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
  o !== void 0 && (d.include_slices = o), l !== void 0 && (d.include_scopes = l), (Array.isArray(s?.accounts) || Array.isArray(s?.portfolios)) && (d.scopes = {}, Array.isArray(s.accounts) && (d.scopes.accounts = s.accounts.filter((b) => typeof b == "string" && b.length > 0)), Array.isArray(s.portfolios) && (d.scopes.portfolios = s.portfolios.filter(
    (b) => typeof b == "string" && b.length > 0
  ))), typeof c == "number" && Number.isFinite(c) && c > 0 && (d.limit = c), typeof u == "number" && Number.isFinite(u) && u >= 0 && (d.offset = u);
  const g = await e.connection.sendMessagePromise(d), m = ci(g.range, p, f), h = (Array.isArray(g.records) ? g.records : []).map((b) => b && typeof b == "object" ? Ar(b) : null).filter((b) => !!b), y = li(g.slices);
  return {
    range: m,
    records: h,
    ...y ? { slices: y } : {}
  };
}
async function wr(e, t, n) {
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
  }), o = _r(a.positions).map(ai), l = Sr(a.normalized_payload), s = {
    portfolio_uuid: te(a.portfolio_uuid) ?? n,
    positions: o
  };
  typeof a.error == "string" && (s.error = a.error);
  const c = ri(a.coverage_ratio);
  c !== void 0 && (s.coverage_ratio = c);
  const u = te(a.provenance);
  u && (s.provenance = u);
  const p = ni(a.metric_run_uuid);
  return p !== void 0 && (s.metric_run_uuid = p), l && (s.normalized_payload = l), s;
}
async function di(e, t, n) {
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
async function fi(e, t) {
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
  const i = {
    type: "pp_reader/get_security_history",
    entry_id: a,
    security_uuid: n
  }, { startDate: o, endDate: l, start_date: s, end_date: c } = r || {}, u = o ?? s;
  u != null && (i.start_date = u);
  const p = l ?? c;
  p != null && (i.end_date = p);
  const f = await e.connection.sendMessagePromise(i);
  return Array.isArray(f.prices) || (f.prices = []), Array.isArray(f.transactions) || (f.transactions = []), f;
}
const fn = /* @__PURE__ */ new Set(), pn = /* @__PURE__ */ new Set(), Cr = {}, pi = [
  "renderPositionsTable",
  "applyGainPctMetadata",
  "attachSecurityDetailListener",
  "attachPortfolioPositionsSorting",
  "updatePortfolioFooter"
];
function gi(e, t) {
  typeof t == "function" && (Cr[e] = t);
}
function Sc(e) {
  e && fn.add(e);
}
function Pc(e) {
  e && fn.delete(e);
}
function hi() {
  return fn;
}
function Ac(e) {
  e && pn.add(e);
}
function wc(e) {
  e && pn.delete(e);
}
function mi() {
  return pn;
}
function yi(e) {
  for (const t of pi)
    gi(t, e[t]);
}
function gn() {
  return Cr;
}
const _i = 2;
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
    const a = r.lastIndexOf(","), i = r.lastIndexOf(".");
    let o = r;
    const l = a !== -1, s = i !== -1;
    if (l && (!s || a > i))
      if (s)
        o = o.replace(/\./g, "").replace(",", ".");
      else {
        const p = o.split(","), f = p[p.length - 1]?.length ?? 0, d = p.slice(0, -1).join(""), g = d.replace(/[+-]/g, "").length, m = p.length > 2, _ = /^[-+]?0$/.test(d);
        o = m || f === 0 || f === 3 && g > 0 && g <= 3 && !_ ? o.replace(/,/g, "") : o.replace(",", ".");
      }
    else s && l && i > a ? o = o.replace(/,/g, "") : s && o.length - i - 1 === 3 && /\d{4,}/.test(o.replace(/\./g, "")) && (o = o.replace(/\./g, ""));
    if (o === "-" || o === "+")
      return null;
    const c = Number.parseFloat(o);
    if (Number.isFinite(c))
      return c;
    const u = Number.parseFloat(r.replace(",", "."));
    if (Number.isFinite(u))
      return u;
  }
  return null;
}
function Et(e, { decimals: t = _i, fallback: n = null } = {}) {
  const r = de(e);
  if (r == null)
    return n ?? null;
  const a = 10 ** t, i = Math.round(r * a) / a;
  return Object.is(i, -0) ? 0 : i;
}
function Ln(e, t = {}) {
  return Et(e, t);
}
function bi(e, t = {}) {
  return Et(e, t);
}
const vi = /^[+-]?(?:\d+\.?\d*|\d*\.?\d+)(?:[eE][+-]?\d+)?$/, oe = (e) => {
  if (typeof e == "number")
    return Number.isFinite(e) ? e : null;
  if (typeof e == "string") {
    const t = e.trim();
    if (!t || !vi.test(t))
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
function Si(e) {
  const t = e && typeof e == "object" ? e : null;
  if (!t)
    return null;
  const n = oe(t.price_change_native), r = oe(t.price_change_eur), a = oe(t.change_pct), i = oe(t.value_change_eur);
  if (n == null && r == null && a == null && i == null)
    return null;
  const o = Nr(t.source) ?? "derived", l = oe(t.coverage_ratio) ?? null;
  return {
    price_change_native: n,
    price_change_eur: r,
    change_pct: a,
    value_change_eur: i ?? null,
    source: o,
    coverage_ratio: l
  };
}
function ve(e) {
  const t = e && typeof e == "object" ? e : null;
  if (!t)
    return null;
  const n = oe(t.gain_abs), r = oe(t.gain_pct), a = oe(t.total_change_eur), i = oe(t.total_change_pct);
  if (n == null || r == null || a == null || i == null)
    return null;
  const o = Nr(t.source) ?? "derived", l = oe(t.coverage_ratio) ?? null, s = Si(t.day_change);
  return {
    gain_abs: n,
    gain_pct: r,
    total_change_eur: a,
    total_change_pct: i,
    source: o,
    coverage_ratio: l,
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
function U(e) {
  if (e === null)
    return null;
  const t = de(e);
  return Number.isFinite(t ?? NaN) ? t : null;
}
function Pi(e) {
  if (!e || typeof e != "object")
    return !1;
  const t = e;
  return typeof t.security_uuid == "string" && typeof t.name == "string" && typeof t.current_holdings == "number" && typeof t.purchase_value == "number" && typeof t.current_value == "number";
}
function Te(e) {
  const t = { ...e };
  return e.average_cost && typeof e.average_cost == "object" && (t.average_cost = { ...e.average_cost }), e.performance && typeof e.performance == "object" && (t.performance = { ...e.performance }), e.aggregation && typeof e.aggregation == "object" && (t.aggregation = { ...e.aggregation }), e.data_state && typeof e.data_state == "object" && (t.data_state = { ...e.data_state }), t;
}
function Ai(e, t, n = []) {
  if (!t || typeof t != "object")
    return t;
  const r = {
    ...e && typeof e == "object" ? e : {},
    ...t
  };
  return n.forEach((a) => {
    const i = e?.[a];
    i != null && (r[a] = i);
  }), r;
}
function wi(e, t) {
  const n = e ? Te(e) : {}, r = [
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
  ], a = (s, c, u) => {
    const p = c[u];
    p !== void 0 && (s[u] = p);
  };
  r.forEach((s) => {
    a(n, t, s);
  });
  const i = (s) => {
    const c = t[s];
    if (c && typeof c == "object") {
      const u = e && e[s] && typeof e[s] == "object" ? e[s] : {};
      n[s] = {
        ...u,
        ...c
      };
    } else c !== void 0 && (n[s] = c);
  }, o = t.performance, l = e && e.performance && typeof e.performance == "object" ? e.performance : void 0;
  return o !== void 0 && (n.performance = Ai(l, o, [
    "gain_pct",
    "total_change_pct"
  ])), i("aggregation"), i("average_cost"), i("data_state"), n;
}
function dt(e, t) {
  if (!e)
    return [];
  if (!Array.isArray(t))
    return _e.delete(e), [];
  if (t.length === 0)
    return _e.set(e, []), [];
  const n = _e.get(e) ?? [], r = new Map(
    n.filter((i) => i.security_uuid).map((i) => [i.security_uuid, i])
  ), a = t.filter((i) => !!i).map((i) => {
    const o = i.security_uuid ?? "", l = o ? r.get(o) : void 0;
    return wi(l, i);
  }).map(Te);
  return _e.set(e, a), a.map(Te);
}
function xt(e) {
  return e ? _e.has(e) : !1;
}
function Er(e) {
  if (!e)
    return [];
  const t = _e.get(e);
  return t ? t.map(Te) : [];
}
function Ci() {
  _e.clear();
}
function Ni() {
  return new Map(
    Array.from(_e.entries(), ([e, t]) => [
      e,
      t.map(Te)
    ])
  );
}
function Me(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e, n = U(t.native), r = U(t.security), a = U(t.account), i = U(t.eur), o = U(t.coverage_ratio);
  if (n == null && r == null && a == null && i == null && o == null)
    return null;
  const l = me(t.source);
  return {
    native: n,
    security: r,
    account: a,
    eur: i,
    source: l === "totals" || l === "eur_total" ? l : "aggregation",
    coverage_ratio: o
  };
}
function hn(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e, n = U(t.total_holdings), r = U(t.positive_holdings), a = U(t.purchase_value_eur), i = U(t.purchase_total_security) ?? U(t.security_currency_total), o = U(t.purchase_total_account) ?? U(t.account_currency_total);
  let l = 0;
  if (typeof t.purchase_value_cents == "number")
    l = Number.isFinite(t.purchase_value_cents) ? Math.trunc(t.purchase_value_cents) : 0;
  else if (typeof t.purchase_value_cents == "string") {
    const c = Number.parseInt(t.purchase_value_cents, 10);
    Number.isFinite(c) && (l = c);
  }
  return n != null || r != null || a != null || i != null || o != null || l !== 0 ? {
    total_holdings: n ?? 0,
    positive_holdings: r ?? 0,
    purchase_value_cents: l,
    purchase_value_eur: a ?? 0,
    security_currency_total: i ?? 0,
    account_currency_total: o ?? 0,
    purchase_total_security: i ?? 0,
    purchase_total_account: o ?? 0
  } : null;
}
function Ei(e) {
  if (!e || typeof e != "object")
    return null;
  const t = Pi(e) ? Te(e) : e, n = me(t.security_uuid), r = me(t.name), a = de(t.current_holdings), i = Ln(t.current_value), o = hn(t.aggregation), l = t.aggregation && typeof t.aggregation == "object" ? t.aggregation : null, s = U(t.purchase_value_eur) ?? U(l?.purchase_value_eur) ?? U(l?.purchase_total_account) ?? U(l?.account_currency_total) ?? Ln(t.purchase_value);
  if (!n || !r || a == null || s == null || i == null)
    return null;
  const c = {
    security_uuid: n,
    name: r,
    portfolio_uuid: me(t.portfolio_uuid) ?? me(t.portfolioUuid) ?? void 0,
    currency_code: me(t.currency_code),
    current_holdings: a,
    purchase_value: s,
    current_value: i
  }, u = Me(t.average_cost);
  u && (c.average_cost = u), o && (c.aggregation = o);
  const p = ve(t.performance);
  if (p)
    c.performance = p, c.gain_abs = typeof p.gain_abs == "number" ? p.gain_abs : null, c.gain_pct = typeof p.gain_pct == "number" ? p.gain_pct : null;
  else {
    const b = U(t.gain_abs), S = U(t.gain_pct);
    b !== null && (c.gain_abs = b), S !== null && (c.gain_pct = S);
  }
  "coverage_ratio" in t && (c.coverage_ratio = U(t.coverage_ratio));
  const f = me(t.provenance);
  f && (c.provenance = f);
  const d = me(t.metric_run_uuid);
  (d || t.metric_run_uuid === null) && (c.metric_run_uuid = d ?? null);
  const g = U(t.last_price_native);
  g !== null && (c.last_price_native = g);
  const m = U(t.last_price_eur);
  m !== null && (c.last_price_eur = m);
  const _ = U(t.last_close_native);
  _ !== null && (c.last_close_native = _);
  const h = U(t.last_close_eur);
  h !== null && (c.last_close_eur = h);
  const y = t.data_state && typeof t.data_state == "object" ? { ...t.data_state } : void 0;
  return y && (c.data_state = y), c;
}
function Ft(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = Ei(n);
    r && t.push(r);
  }
  return t;
}
let xr = [];
const be = /* @__PURE__ */ new Map();
function ot(e) {
  return typeof e == "string" && e.length > 0 ? e : void 0;
}
function xi(e) {
  return e === null ? null : ot(e);
}
function Fi(e) {
  return typeof e == "number" && Number.isFinite(e) ? e : void 0;
}
function Pe(e) {
  return e === null ? null : Fi(e);
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
  const t = ot(e.uuid);
  if (!t)
    return null;
  const n = { uuid: t }, r = ot(e.name);
  r && (n.name = r);
  const a = Pe(e.current_value);
  a !== void 0 && (n.current_value = a);
  const i = Pe(e.purchase_sum) ?? Pe(e.purchase_value_eur) ?? Pe(e.purchase_value);
  i !== void 0 && (n.purchase_value = i, n.purchase_sum = i);
  const o = Pe(e.day_change_abs);
  o !== void 0 && (n.day_change_abs = o);
  const l = Pe(e.day_change_pct);
  l !== void 0 && (n.day_change_pct = l);
  const s = Mn(e.position_count);
  s !== void 0 && (n.position_count = s);
  const c = Mn(e.missing_value_positions);
  c !== void 0 && (n.missing_value_positions = c), typeof e.has_current_value == "boolean" && (n.has_current_value = e.has_current_value);
  const u = Pe(e.coverage_ratio);
  u !== void 0 && (n.coverage_ratio = u);
  const p = ot(e.provenance);
  p && (n.provenance = p), "metric_run_uuid" in e && (n.metric_run_uuid = xi(e.metric_run_uuid));
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
function Di(e, t) {
  const n = {
    ...e,
    ...t
  };
  return !t.performance && e.performance && (n.performance = se(e.performance)), !t.data_state && e.data_state && (n.data_state = se(e.data_state)), !t.positions && e.positions && (n.positions = e.positions.map(Ke)), n;
}
function Dr(e) {
  xr = (e ?? []).map((n) => ({ ...n }));
}
function $i() {
  return xr.map((e) => ({ ...e }));
}
function Ti(e) {
  be.clear();
  const t = e ?? [];
  for (const n of t) {
    const r = Fr(n);
    r && be.set(r.uuid, mn(r));
  }
}
function ki(e) {
  const t = e ?? [];
  for (const n of t) {
    const r = Fr(n);
    if (!r)
      continue;
    const a = be.get(r.uuid), i = a ? Di(a, r) : mn(r);
    be.set(i.uuid, i);
  }
}
function ft(e, t) {
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
  const r = (s, c) => {
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
      const m = c[g];
      m != null && (p[g] = m);
    });
    const d = (g, m = []) => {
      const _ = c[g], h = s && s[g] && typeof s[g] == "object" ? s[g] : void 0;
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
  }, a = Array.isArray(n.positions) ? n.positions : [], i = new Map(
    a.filter((s) => s.security_uuid).map((s) => [s.security_uuid, s])
  ), o = t.filter((s) => !!s).map((s) => {
    const c = s.security_uuid ? i.get(s.security_uuid) : void 0;
    return r(c, s);
  }).map(Ke), l = {
    ...n,
    positions: o
  };
  be.set(e, l);
}
function Ri() {
  return Array.from(be.values(), (e) => mn(e));
}
function $r() {
  return {
    accounts: $i(),
    portfolios: Ri()
  };
}
const Li = "unknown-account";
function X(e) {
  return typeof e != "number" || !Number.isFinite(e) ? null : e;
}
function Hn(e) {
  const t = X(e);
  return t == null ? 0 : Math.trunc(t);
}
function ee(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t.length > 0 ? t : null;
}
function Tr(e, t) {
  return ee(e) ?? t;
}
function kr(e) {
  return e == null || !Number.isFinite(e) ? null : e < 0 ? 0 : e > 1 ? 1 : e;
}
function Rr(e) {
  return e.split(/[\s_-]+/).filter(Boolean).map(
    (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
  ).join(" ");
}
function Lr(e) {
  const t = Mi(e);
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
function Mi(e) {
  const t = ee(e);
  if (!t)
    return null;
  const n = Hi(t);
  return n || Rr(t);
}
function Hi(e) {
  const t = e.trim();
  if (!t.startsWith("{") && !t.startsWith("["))
    return null;
  try {
    const n = JSON.parse(t), r = Ii(n), a = n && typeof n == "object" ? ee(
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
function Ii(e) {
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
function zi(e) {
  if (!e)
    return null;
  const t = ee(e.uuid) ?? `${Li}-${e.name ?? "0"}`, n = Tr(e.name, "Unbenanntes Konto"), r = ee(e.currency_code), a = X(e.balance), i = X(e.orig_balance), o = "coverage_ratio" in e ? kr(X(e.coverage_ratio)) : null, l = ee(e.provenance), s = ee(e.metric_run_uuid), c = e.fx_unavailable === !0, u = X(e.fx_rate), p = ee(e.fx_rate_source), f = ee(e.fx_rate_timestamp), d = [], g = Lr(l);
  g && d.push(g);
  const m = {
    uuid: t,
    name: n,
    currency_code: r,
    balance: a,
    orig_balance: i,
    fx_unavailable: c,
    coverage_ratio: o,
    provenance: l,
    metric_run_uuid: null,
    fx_rate: u,
    fx_rate_source: p,
    fx_rate_timestamp: f,
    badges: d
  }, _ = typeof s == "string" ? s : null;
  return m.metric_run_uuid = _, m;
}
function Vi(e) {
  if (!e)
    return null;
  const t = ee(e.uuid);
  if (!t)
    return null;
  const n = Tr(e.name, "Unbenanntes Depot"), r = Hn(e.position_count), a = Hn(e.missing_value_positions), i = X(e.current_value), o = X(e.purchase_sum) ?? X(e.purchase_value_eur) ?? X(e.purchase_value) ?? 0, l = X(e.day_change_abs) ?? null, s = X(e.day_change_pct) ?? null, c = ve(e.performance), u = c?.gain_abs ?? null, p = c?.gain_pct ?? null, f = c?.day_change ?? null;
  let d = l ?? (f?.value_change_eur != null ? X(f.value_change_eur) : null), g = s ?? (f?.change_pct != null ? X(f.change_pct) : null);
  if (d == null && g != null && i != null) {
    const N = i / (1 + g / 100);
    N && (d = i - N);
  }
  if (g == null && d != null && i != null) {
    const N = i - d;
    N && (g = d / N * 100);
  }
  const m = i != null, _ = e.has_current_value === !1 || !m, h = "coverage_ratio" in e ? kr(X(e.coverage_ratio)) : null, y = ee(e.provenance), b = ee(e.metric_run_uuid), S = [], P = Lr(y);
  P && S.push(P);
  const C = {
    uuid: t,
    name: n,
    position_count: r,
    current_value: i,
    purchase_sum: o,
    day_change_abs: d ?? null,
    day_change_pct: g ?? null,
    gain_abs: u,
    gain_pct: p,
    hasValue: m,
    fx_unavailable: _ || a > 0,
    missing_value_positions: a,
    performance: c,
    coverage_ratio: h,
    provenance: y,
    metric_run_uuid: null,
    badges: S
  }, w = typeof b == "string" ? b : null;
  return C.metric_run_uuid = w, C;
}
function Mr() {
  const { accounts: e } = $r();
  return e.map(zi).filter((t) => !!t);
}
function Ui() {
  const { portfolios: e } = $r();
  return e.map(Vi).filter((t) => !!t);
}
function ke(e) {
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
    const i = `meta-badge--${a.tone}`, o = a.description ? ` title="${ke(a.description)}"` : "";
    return `<span class="meta-badge ${i}"${o}>${ke(
      a.label
    )}</span>`;
  }).join("");
  return `<span class="${n}">${r}</span>`;
}
function pt(e, t, n = {}) {
  const r = Hr(t, n);
  if (!r)
    return ke(e);
  const a = n.labelClass ?? "name-with-badges__label";
  return `<span class="${["name-with-badges", n.containerClass].filter(Boolean).join(" ")}"><span class="${a}">${ke(
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
function qi(e) {
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
function Wi(e) {
  return e === null ? null : Ce(e);
}
function Oi(e) {
  return e === null ? null : He(e);
}
function In(e) {
  return (e ?? []).filter(
    (t) => !t.key.endsWith("-coverage") && !t.key.startsWith("provenance-")
  );
}
function zn(e) {
  return ve(e.performance);
}
const Bi = 500, ji = 10, Ki = "pp-reader:portfolio-positions-updated", Yi = "pp-reader:diagnostics", kt = /* @__PURE__ */ new Map(), zr = [
  "coverage_ratio",
  "provenance",
  "metric_run_uuid",
  "generated_at"
], jt = /* @__PURE__ */ new Map();
function Gi(e, t) {
  return `${e}:${t}`;
}
function Xi(e) {
  if (e === void 0)
    return;
  if (e === null)
    return null;
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  const t = Wi(e);
  if (t === null)
    return null;
  if (typeof t == "number" && Number.isFinite(t))
    return t;
}
function Rt(e) {
  if (e !== void 0)
    return Oi(e);
}
function yn(e, t, n, r) {
  const a = {}, i = Xi(e);
  i !== void 0 && (a.coverage_ratio = i);
  const o = Rt(t);
  o !== void 0 && (a.provenance = o);
  const l = Rt(n);
  l !== void 0 && (a.metric_run_uuid = l);
  const s = Rt(r);
  return s !== void 0 && (a.generated_at = s), Object.keys(a).length > 0 ? a : null;
}
function Zi(e, t) {
  const n = {};
  let r = !1;
  for (const a of zr) {
    const i = e?.[a], o = t[a];
    i !== o && (Ir(n, a, i, o), r = !0);
  }
  return r ? n : null;
}
function Ji(e) {
  const t = {};
  let n = !1;
  for (const r of zr) {
    const a = e[r];
    a !== void 0 && (Ir(t, r, a, void 0), n = !0);
  }
  return n ? t : null;
}
function Vn(e) {
  if (Object.keys(e.changed).length) {
    try {
      console.debug("pp-reader:diagnostics", e);
    } catch {
    }
    if (!(typeof window > "u" || typeof window.dispatchEvent != "function"))
      try {
        window.dispatchEvent(new CustomEvent(Yi, { detail: e }));
      } catch (t) {
        console.warn("updateConfigsWS: Diagnostics-Event konnte nicht gesendet werden", t);
      }
  }
}
function _n(e, t, n, r) {
  const a = Gi(e, n), i = kt.get(a);
  if (!r) {
    if (!i)
      return;
    kt.delete(a);
    const l = Ji(i);
    if (!l)
      return;
    Vn({
      kind: e,
      uuid: n,
      source: t,
      changed: l,
      snapshot: {},
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    return;
  }
  const o = Zi(i, r);
  o && (kt.set(a, { ...r }), Vn({
    kind: e,
    uuid: n,
    source: t,
    changed: o,
    snapshot: { ...r },
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  }));
}
function Qi(e) {
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
function eo(e) {
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
function to(e, t) {
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
function no(e, t) {
  return `<div class="error">${qi(e)} <button class="retry-pos" data-portfolio="${t}">Erneut laden</button></div>`;
}
function ro(e, t, n) {
  const r = e.querySelector("table.sortable-positions");
  if (!r) return;
  const a = e.dataset.sortKey || r.dataset.defaultSort || "name", o = (e.dataset.sortDir || r.dataset.defaultDir || "asc") === "desc" ? "desc" : "asc";
  e.dataset.sortKey = a, e.dataset.sortDir = o;
  try {
    gr(r, a, o, !0);
  } catch (c) {
    console.warn("restoreSortAndInit: sortTableRows Fehler:", c);
  }
  const { attachPortfolioPositionsSorting: l, attachSecurityDetailListener: s } = gn();
  if (l)
    try {
      l(t, n);
    } catch (c) {
      console.warn("restoreSortAndInit: attachPortfolioPositionsSorting Fehler:", c);
    }
  if (s)
    try {
      s(t, n);
    } catch (c) {
      console.warn("restoreSortAndInit: attachSecurityDetailListener Fehler:", c);
    }
}
function Vr(e, t, n, r) {
  if (!e || !t)
    return { applied: !1, reason: "invalid" };
  const a = e.querySelector(
    `.portfolio-table .portfolio-details[data-portfolio="${t}"]`
  );
  if (!a)
    return { applied: !1, reason: "missing" };
  const i = a.querySelector(".positions-container");
  if (!i)
    return { applied: !1, reason: "missing" };
  if (a.classList.contains("hidden"))
    return { applied: !1, reason: "hidden" };
  if (r)
    return i.innerHTML = no(r, t), { applied: !0 };
  const o = i.dataset.sortKey, l = i.dataset.sortDir;
  return i.innerHTML = po(n), o && (i.dataset.sortKey = o), l && (i.dataset.sortDir = l), ro(i, e, t), { applied: !0 };
}
function bn(e, t) {
  const n = ce.get(t);
  if (!n) return !1;
  const r = Vr(
    e,
    t,
    n.positions,
    n.error
  );
  return r.applied && ce.delete(t), r.applied;
}
function ao(e) {
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
    r || n.attempts >= ji ? (Oe.delete(t), r || ce.delete(t)) : Ur(e, t);
  }, Bi), Oe.set(t, n));
}
function io(e, t) {
  console.log("updateConfigsWS: Kontodaten-Update erhalten:", e);
  const n = Array.isArray(e) ? e : [];
  if (Dr(n), Qi(n), !t)
    return;
  const r = Mr();
  oo(r, t);
  const a = t.querySelector(".portfolio-table table"), i = a ? Array.from(
    a.querySelectorAll("tbody tr.portfolio-row")
  ).map((o) => {
    const l = o.dataset.currentValue, s = l ? Number.parseFloat(l) : Number.NaN;
    if (Number.isFinite(s))
      return {
        current_value: s
      };
    const c = o.cells.item(3), u = st(c?.textContent);
    return {
      current_value: Number.isFinite(u) ? u : 0
    };
  }) : [];
  qr(r, i, t);
}
function oo(e, t) {
  const n = t.querySelector(".account-table"), r = t.querySelector(".fx-account-table"), a = e.filter((o) => (o.currency_code || "EUR") === "EUR"), i = e.filter((o) => (o.currency_code || "EUR") !== "EUR");
  if (n) {
    const o = a.map((l) => ({
      name: pt(l.name, In(l.badges), {
        containerClass: "account-name",
        labelClass: "account-name__label"
      }),
      balance: l.balance ?? null
    }));
    n.innerHTML = $e(
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
    const o = i.map((l) => {
      const s = l.orig_balance, c = typeof s == "number" && Number.isFinite(s), u = He(l.currency_code), p = c ? s.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) : null, f = p ? u ? `${p} ${u}` : p : "";
      return {
        name: pt(l.name, In(l.badges), {
          containerClass: "account-name",
          labelClass: "account-name__label"
        }),
        fx_display: f,
        balance: l.balance ?? null
      };
    });
    r.innerHTML = $e(
      o,
      [
        { key: "name", label: "Name" },
        { key: "fx_display", label: "Betrag (FX)" },
        { key: "balance", label: "EUR", align: "right" }
      ],
      ["balance"]
    );
  } else i.length && console.warn("updateAccountTable: .fx-account-table nicht gefunden, obwohl FX-Konten vorhanden sind.");
}
function so(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = br(n);
    r && t.push(r);
  }
  return t;
}
function co(e, t) {
  if (!Array.isArray(e)) {
    console.warn("handlePortfolioUpdate: Update ist kein Array:", e);
    return;
  }
  try {
    console.debug("handlePortfolioUpdate: payload=", e);
  } catch {
  }
  const n = so(e);
  if (n.length && ki(n), eo(n), !t)
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
  const i = (p) => {
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
  }, o = /* @__PURE__ */ new Map();
  a.querySelectorAll("tr.portfolio-row").forEach((p) => {
    const f = p.dataset.portfolio;
    f && o.set(f, p);
  });
  let s = 0;
  const c = (p) => {
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
    const d = o.get(p);
    if (!d)
      continue;
    d.cells.length < 8 && console.warn("handlePortfolioUpdate: Unerwartetes Spaltenlayout", d.cells.length);
    const g = d.cells.item(1), m = d.cells.item(2), _ = d.cells.item(3), h = d.cells.item(4), y = d.cells.item(5), b = d.cells.item(6), S = d.cells.item(7);
    if (!g || !m || !_)
      continue;
    const P = typeof f.position_count == "number" && Number.isFinite(f.position_count) ? f.position_count : 0, C = typeof f.current_value == "number" && Number.isFinite(f.current_value) ? f.current_value : null, w = ve(f.performance), N = typeof w?.gain_abs == "number" ? w.gain_abs : null, D = typeof w?.gain_pct == "number" ? w.gain_pct : null, H = typeof f.purchase_sum == "number" && Number.isFinite(f.purchase_sum) ? f.purchase_sum : typeof f.purchase_value == "number" && Number.isFinite(f.purchase_value) ? f.purchase_value : null, A = w?.day_change ?? null, E = Ce(f.day_change_abs) ?? Ce(A?.value_change_eur) ?? Ce(A?.price_change_eur), I = Ce(f.day_change_pct) ?? Ce(A?.change_pct);
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
    st(g.textContent) !== P && (g.textContent = c(P));
    const T = {
      fx_unavailable: x,
      current_value: C,
      performance: w
    }, z = { hasValue: v }, W = L("purchase_value", H, T, z);
    m.innerHTML !== W && (m.innerHTML = W);
    const B = L("current_value", T.current_value, T, z), G = typeof C == "number" ? C : 0;
    if ((Math.abs(R - G) >= 5e-3 || _.innerHTML !== B) && (_.innerHTML = B, d.classList.add("flash-update"), setTimeout(() => {
      d.classList.remove("flash-update");
    }, 800)), h && (h.innerHTML = L("day_change_abs", F, T, z)), y && (y.innerHTML = L("day_change_pct", $, T, z)), b) {
      const K = L("gain_abs", N, T, z);
      b.innerHTML = K;
      const Se = typeof D == "number" && Number.isFinite(D) ? D : null;
      b.dataset.gainPct = Se != null ? `${i(Se)} %` : "—", b.dataset.gainSign = Se != null ? Se > 0 ? "positive" : Se < 0 ? "negative" : "neutral" : "neutral";
    }
    S && (S.innerHTML = L("gain_pct", D, T, z)), d.dataset.positionCount = P.toString(), d.dataset.purchaseSum = H != null ? H.toString() : "", d.dataset.currentValue = v ? G.toString() : "", d.dataset.dayChange = v && F != null ? F.toString() : "", d.dataset.dayChangePct = v && $ != null ? $.toString() : "", d.dataset.gainAbs = N != null ? N.toString() : "", d.dataset.gainPct = D != null ? D.toString() : "", d.dataset.hasValue = v ? "true" : "false", d.dataset.fxUnavailable = x ? "true" : "false", d.dataset.coverageRatio = typeof f.coverage_ratio == "number" && Number.isFinite(f.coverage_ratio) ? f.coverage_ratio.toString() : "", d.dataset.provenance = typeof f.provenance == "string" ? f.provenance : "", d.dataset.metricRunUuid = typeof f.metric_run_uuid == "string" ? f.metric_run_uuid : "", s += 1;
  }
  if (s === 0)
    console.debug("handlePortfolioUpdate: Keine passenden Zeilen gefunden / keine Änderungen.");
  else {
    const p = s.toLocaleString("de-DE");
    console.debug(`handlePortfolioUpdate: ${p} Zeile(n) gepatcht.`);
  }
  try {
    go(r);
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
      return (b.length ? Array.from(b) : Array.from(h.querySelectorAll("tbody tr:not(.footer-row)"))).map((P) => {
        const C = y ? P.cells.item(2) : P.cells.item(1);
        return { balance: st(C?.textContent) };
      });
    }, m = [
      ...g(f, !1),
      ...g(d, !0)
    ], _ = Array.from(
      r.querySelectorAll("tbody tr.portfolio-row")
    ).map((h) => {
      const y = h.dataset.currentValue, b = h.dataset.purchaseSum, S = y ? Number.parseFloat(y) : Number.NaN, P = b ? Number.parseFloat(b) : Number.NaN;
      return {
        current_value: Number.isFinite(S) ? S : 0,
        purchase_sum: Number.isFinite(P) ? P : 0
      };
    });
    qr(m, _, t);
  } catch (p) {
    console.warn("handlePortfolioUpdate: Fehler bei Total-Neuberechnung:", p);
  }
}
function lo(e) {
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
function uo(e, t, n, r) {
  if (!n || n <= 1 || !t)
    return Kt(e), r;
  const a = n, i = jt.get(e) ?? { expected: a, chunks: /* @__PURE__ */ new Map() };
  if (i.expected !== a && (i.chunks.clear(), i.expected = a), i.chunks.set(t, r), jt.set(e, i), i.chunks.size < a)
    return null;
  const o = [];
  for (let l = 1; l <= a; l += 1) {
    const s = i.chunks.get(l);
    s && Array.isArray(s) && o.push(...s);
  }
  return Kt(e), o;
}
function qn(e, t) {
  const n = lo(e);
  if (!n)
    return console.warn("handlePortfolioPositionsUpdate: Ungültiges Update:", e), !1;
  const r = e?.error, a = Un(e?.chunk_index), i = Un(e?.chunk_count), o = Ft(e?.positions ?? []);
  r && Kt(n);
  const l = r ? o : uo(n, a, i, o);
  if (!r && l === null)
    return !0;
  const s = r ? o : l ?? [];
  to(n, e);
  const c = xt(n);
  let u = s;
  if (!r && c) {
    const f = dt(n, s);
    ft(n, f), u = f;
  }
  const p = Vr(t, n, u, r);
  if (p.applied) {
    if (ce.delete(n), !r && !c) {
      const f = dt(n, u);
      ft(n, f);
    }
  } else
    r || p.reason !== "hidden" || c ? (ce.set(n, { positions: u, error: r }), Ur(t, n)) : (ce.delete(n), Oe.delete(n));
  if (!r && o.length > 0) {
    const f = Array.from(
      new Set(
        o.map((d) => d.security_uuid).filter((d) => typeof d == "string" && d.length > 0)
      )
    );
    if (f.length && typeof window < "u")
      try {
        window.dispatchEvent(
          new CustomEvent(
            Ki,
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
function fo(e, t) {
  if (Array.isArray(e)) {
    let n = !1;
    for (const r of e)
      qn(r, t) && (n = !0);
    !n && e.length && console.warn("handlePortfolioPositionsUpdate: Kein gültiges Element im Array:", e);
    return;
  }
  qn(e, t);
}
function po(e) {
  const { renderPositionsTable: t, applyGainPctMetadata: n } = gn();
  try {
    if (typeof t == "function")
      return t(e);
  } catch {
  }
  if (e.length === 0)
    return '<div class="no-positions">Keine Positionen vorhanden.</div>';
  const r = e.map((i) => {
    const o = zn(i);
    return {
      name: i.name,
      current_holdings: i.current_holdings,
      purchase_value: i.purchase_value,
      current_value: i.current_value,
      performance: o
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
    const i = document.createElement("template");
    i.innerHTML = a.trim();
    const o = i.content.querySelector("table");
    if (o) {
      o.classList.add("sortable-positions");
      const l = o.querySelectorAll("thead th"), s = ["name", "current_holdings", "purchase_value", "current_value", "gain_abs", "gain_pct"];
      l.forEach((p, f) => {
        const d = s[f];
        d && (p.setAttribute("data-sort-key", d), p.classList.add("sortable-col"));
      }), o.querySelectorAll("tbody tr").forEach((p, f) => {
        if (p.classList.contains("footer-row"))
          return;
        const d = e[f];
        d.security_uuid && (p.dataset.security = d.security_uuid), p.classList.add("position-row");
      }), o.dataset.defaultSort = "name", o.dataset.defaultDir = "asc";
      const u = n;
      if (u)
        try {
          u(o);
        } catch (p) {
          console.warn("renderPositionsTableInline: applyGainPctMetadata failed", p);
        }
      else
        o.querySelectorAll("tbody tr").forEach((f, d) => {
          if (f.classList.contains("footer-row"))
            return;
          const g = f.cells.item(4);
          if (!g)
            return;
          const m = e[d], _ = zn(m), h = typeof _?.gain_pct == "number" && Number.isFinite(_.gain_pct) ? _.gain_pct : null, y = h != null ? `${h.toLocaleString("de-DE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })} %` : "—", b = h == null ? "neutral" : h > 0 ? "positive" : h < 0 ? "negative" : "neutral";
          g.dataset.gainPct = y, g.dataset.gainSign = b;
        });
      return o.outerHTML;
    }
  } catch (i) {
    console.warn("renderPositionsTableInline: Sortier-Metadaten Injection fehlgeschlagen:", i);
  }
  return a;
}
function go(e) {
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
      const S = r(y.dataset.currentValue), P = r(y.dataset.gainAbs), C = r(y.dataset.purchaseSum);
      return S == null || P == null || C == null ? (h.incompleteRows += 1, h) : (h.sumCurrent += S, h.sumGainAbs += P, h.sumPurchase += C, h);
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
  ), i = a.valueRows > 0 && a.incompleteRows === 0, o = i && a.sumPurchase > 0 ? a.sumGainAbs / a.sumPurchase * 100 : null;
  let l = e.querySelector("tr.footer-row");
  l || (l = document.createElement("tr"), l.className = "footer-row", e.querySelector("tbody")?.appendChild(l));
  const s = Math.round(a.sumPositions).toLocaleString("de-DE"), c = {
    fx_unavailable: a.fxUnavailable || !i,
    current_value: i ? a.sumCurrent : null,
    performance: i ? {
      gain_abs: a.sumGainAbs,
      gain_pct: o,
      total_change_eur: a.sumGainAbs,
      total_change_pct: o,
      source: "aggregated",
      coverage_ratio: 1
    } : null
  }, u = { hasValue: i }, p = L("current_value", c.current_value, c, u), f = i ? a.sumGainAbs : null, d = i ? o : null, g = L("gain_abs", f, c, u), m = L("gain_pct", d, c, u);
  l.innerHTML = `
    <td>Summe</td>
    <td class="align-right">${s}</td>
    <td class="align-right">${p}</td>
    <td class="align-right">${g}</td>
    <td class="align-right">${m}</td>
  `;
  const _ = l.cells.item(3);
  _ && (_.dataset.gainPct = i && typeof o == "number" ? `${Yt(o)} %` : "—", _.dataset.gainSign = i && typeof o == "number" ? o > 0 ? "positive" : o < 0 ? "negative" : "neutral" : "neutral"), l.dataset.positionCount = Math.round(a.sumPositions).toString(), l.dataset.currentValue = i ? a.sumCurrent.toString() : "", l.dataset.purchaseSum = i ? a.sumPurchase.toString() : "", l.dataset.gainAbs = i ? a.sumGainAbs.toString() : "", l.dataset.gainPct = i && typeof o == "number" ? o.toString() : "", l.dataset.hasValue = i ? "true" : "false", l.dataset.fxUnavailable = a.fxUnavailable || !i ? "true" : "false";
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
  const r = n ?? document, i = (Array.isArray(e) ? e : []).reduce((p, f) => {
    const d = f.balance ?? f.current_value ?? f.value, g = Wn(d);
    return p + g;
  }, 0), l = (Array.isArray(t) ? t : []).reduce((p, f) => {
    const d = f.current_value ?? f.value, g = Wn(d);
    return p + g;
  }, 0), s = i + l, c = r.querySelector("#headerMeta");
  if (!c) {
    console.warn("updateTotalWealth: #headerMeta nicht gefunden.");
    return;
  }
  const u = c.querySelector("strong") || c.querySelector(".total-wealth-value");
  u ? u.textContent = `${Yt(s)} €` : c.textContent = `💰 Gesamtvermögen: ${Yt(s)} €`, c.dataset.totalWealthEur = s.toString();
}
function ho(e, t) {
  const n = typeof e == "string" ? e : e?.last_file_update, r = He(n) ?? "";
  if (!t) {
    console.warn("handleLastFileUpdate: root fehlt");
    return;
  }
  let a = t.querySelector(".footer-card .last-file-update") || t.querySelector(".last-file-update");
  if (!a) {
    const i = t.querySelector(".footer-card .meta") || t.querySelector("#headerMeta") || t.querySelector(".header-card .meta") || t.querySelector(".header-card");
    if (!i) {
      console.warn("handleLastFileUpdate: Kein Einfügepunkt gefunden.");
      return;
    }
    a = document.createElement("div"), a.className = "last-file-update", i.appendChild(a);
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
  getPortfolioPositionsCacheSnapshot: Ni,
  clearPortfolioPositionsCache: Ci,
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
const mo = [
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
  return mo.includes(e);
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
function Ve(e) {
  return de(e);
}
function yo(e) {
  return typeof e == "number" && Number.isFinite(e);
}
function _o(e) {
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
    const a = _o(e[r]);
    if (a)
      return a;
  }
  return n;
}
function Kn(e, t) {
  return yo(e) ? `${e.toLocaleString("de-DE", {
    minimumFractionDigits: Bn.min,
    maximumFractionDigits: Bn.max
  })}${t ? ` ${t}` : ""}` : null;
}
function bo(e) {
  const t = e, n = e.average_cost ?? null, r = e.aggregation ?? null, a = jn(t, [
    "security_currency_code",
    "security_currency",
    "native_currency_code",
    "native_currency"
  ], e.currency_code ?? null), i = jn(
    t,
    [
      "account_currency_code",
      "account_currency",
      "purchase_currency_code",
      "currency_code"
    ],
    a === "EUR" ? "EUR" : null
  ) ?? "EUR", o = Ve(n?.native), l = Ve(n?.security), s = Ve(n?.account), c = Ve(n?.eur), u = l ?? o, p = c ?? (i === "EUR" ? s : null), f = a ?? i, d = f === "EUR";
  let g, m;
  d ? (g = "EUR", m = p ?? u ?? s ?? null) : u != null ? (g = f, m = u) : s != null ? (g = i, m = s) : (g = "EUR", m = p ?? null);
  const _ = Kn(m, g), h = d ? null : Kn(p, "EUR"), y = !!h && h !== _, b = [], S = [];
  _ ? (b.push(
    `<span class="purchase-price purchase-price--primary">${_}</span>`
  ), S.push(_.replace(/\u00A0/g, " "))) : (b.push('<span class="missing-value" role="note" aria-label="Kein Kaufpreis verfügbar" title="Kein Kaufpreis verfügbar">—</span>'), S.push("Kein Kaufpreis verfügbar")), y && h && (b.push(
    `<span class="purchase-price purchase-price--secondary">${h}</span>`
  ), S.push(h.replace(/\u00A0/g, " ")));
  const P = b.join("<br>"), C = Ve(r?.purchase_value_eur) ?? 0, w = S.join(", ");
  return { markup: P, sortValue: C, ariaLabel: w };
}
function vo(e) {
  const t = de(e.current_holdings);
  if (t == null)
    return { value: null, pct: null };
  const n = de(e.last_price_eur), r = de(e.last_close_eur);
  let a = null, i = null;
  if (n != null && r != null) {
    a = (n - r) * t;
    const p = r * t;
    p && (i = a / p * 100);
  }
  const l = ve(e.performance)?.day_change ?? null;
  if (a == null && l?.price_change_eur != null && (a = l.price_change_eur * t), i == null && l?.change_pct != null && (i = l.change_pct), a == null && i != null) {
    const u = de(e.current_value);
    if (u != null) {
      const p = u / (1 + i / 100);
      p && (a = u - p);
    }
  }
  const s = a != null && Number.isFinite(a) ? Math.round(a * 100) / 100 : null, c = i != null && Number.isFinite(i) ? Math.round(i * 100) / 100 : null;
  return { value: s, pct: c };
}
const mt = /* @__PURE__ */ new Set();
function Or(e) {
  if (!e)
    return;
  Array.from(e.querySelectorAll("tbody tr")).forEach((n) => {
    const r = n.cells.item(7), a = n.cells.item(8);
    if (!r || !a || r.dataset.gainPct && r.dataset.gainSign)
      return;
    const i = (a.textContent || "").trim() || "—";
    let o = "neutral";
    a.querySelector(".positive") ? o = "positive" : a.querySelector(".negative") && (o = "negative"), r.dataset.gainPct = i, r.dataset.gainSign = o;
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
    const i = ve(a.performance), o = typeof i?.gain_abs == "number" ? i.gain_abs : null, l = typeof i?.gain_pct == "number" ? i.gain_pct : null, s = vo(a), c = typeof a.purchase_value == "number" || typeof a.purchase_value == "string" ? a.purchase_value : null;
    return {
      name: typeof a.name == "string" ? ke(a.name) : typeof a.name == "number" ? String(a.name) : "",
      current_holdings: typeof a.current_holdings == "number" || typeof a.current_holdings == "string" ? a.current_holdings : null,
      average_price: typeof a.purchase_value == "number" || typeof a.purchase_value == "string" ? a.purchase_value : null,
      purchase_value: c,
      current_value: typeof a.current_value == "number" || typeof a.current_value == "string" ? a.current_value : null,
      day_change_abs: s.value,
      day_change_pct: s.pct,
      gain_abs: o,
      gain_pct: l,
      performance: i
    };
  }), r = $e(n, t, ["purchase_value", "current_value", "day_change_abs", "gain_abs"]);
  try {
    const a = document.createElement("template");
    a.innerHTML = r.trim();
    const i = a.content.querySelector("table");
    if (i) {
      i.classList.add("sortable-positions");
      const o = Array.from(i.querySelectorAll("thead th"));
      return t.forEach((s, c) => {
        const u = o.at(c);
        u && (u.setAttribute("data-sort-key", s.key), u.classList.add("sortable-col"));
      }), i.querySelectorAll("tbody tr").forEach((s, c) => {
        if (s.classList.contains("footer-row") || c >= e.length)
          return;
        const u = e[c], p = typeof u.security_uuid == "string" ? u.security_uuid : null;
        p && (s.dataset.security = p), s.classList.add("position-row");
        const f = s.cells.item(2);
        if (f) {
          const { markup: m, sortValue: _, ariaLabel: h } = bo(u);
          f.innerHTML = m, f.dataset.sortValue = String(_), h ? f.setAttribute("aria-label", h) : f.removeAttribute("aria-label");
        }
        const d = s.cells.item(7);
        if (d) {
          const m = ve(u.performance), _ = typeof m?.gain_pct == "number" && Number.isFinite(m.gain_pct) ? m.gain_pct : null, h = _ != null ? `${_.toLocaleString("de-DE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })} %` : "—", y = _ == null ? "neutral" : _ > 0 ? "positive" : _ < 0 ? "negative" : "neutral";
          d.dataset.gainPct = h, d.dataset.gainSign = y;
        }
        const g = s.cells.item(8);
        g && g.classList.add("gain-pct-cell");
      }), i.dataset.defaultSort = "name", i.dataset.defaultDir = "asc", Or(i), i.outerHTML;
    }
  } catch (a) {
    console.warn("renderPositionsTable: Konnte Sortier-Metadaten nicht injizieren:", a);
  }
  return r;
}
function So(e) {
  const t = Ft(e ?? []);
  return Ye(t);
}
function Po(e, t) {
  if (!t) return;
  const n = e.querySelector(
    `.portfolio-details[data-portfolio="${t}"]`
  );
  if (!n) return;
  const r = n.querySelector(".positions-container");
  r && (r.__ppReaderSecurityClickBound || (r.__ppReaderSecurityClickBound = !0, r.addEventListener("click", (a) => {
    const i = a.target;
    if (!(i instanceof Element))
      return;
    const o = i.closest("button, a");
    if (o && r.contains(o))
      return;
    const l = i.closest("tr[data-security]");
    if (!l || !r.contains(l))
      return;
    const s = l.getAttribute("data-security");
    if (s)
      try {
        xa(s) || console.warn("attachSecurityDetailDelegation: Detail-Tab konnte nicht geöffnet werden für", s);
      } catch (c) {
        console.error("attachSecurityDetailDelegation: Fehler beim Öffnen des Detail-Tabs", c);
      }
  })));
}
function Ge(e, t) {
  Po(e, t);
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
    const x = Number.isFinite(v.position_count) ? v.position_count : 0, R = Number.isFinite(v.purchase_sum) ? v.purchase_sum : 0, j = v.hasValue && typeof v.current_value == "number" && Number.isFinite(v.current_value) ? v.current_value : null, T = j !== null, z = v.performance, W = typeof v.gain_abs == "number" ? v.gain_abs : typeof z?.gain_abs == "number" ? z.gain_abs : null, B = typeof v.gain_pct == "number" ? v.gain_pct : typeof z?.gain_pct == "number" ? z.gain_pct : null, G = z && typeof z == "object" ? z.day_change : null, K = typeof v.day_change_abs == "number" ? v.day_change_abs : G && typeof G == "object" ? G.value_change_eur ?? G.price_change_eur : null, Ie = typeof v.day_change_pct == "number" ? v.day_change_pct : G && typeof G == "object" && typeof G.change_pct == "number" ? G.change_pct : null, Se = v.fx_unavailable && T, Da = typeof v.coverage_ratio == "number" && Number.isFinite(v.coverage_ratio) ? v.coverage_ratio : "", $a = typeof v.provenance == "string" ? v.provenance : "", Ta = typeof v.metric_run_uuid == "string" ? v.metric_run_uuid : "", ze = mt.has(v.uuid), ka = ze ? "portfolio-toggle expanded" : "portfolio-toggle", En = `portfolio-details-${v.uuid}`, J = {
      fx_unavailable: v.fx_unavailable,
      purchase_value: R,
      current_value: j,
      day_change_abs: K,
      day_change_pct: Ie,
      gain_abs: W,
      gain_pct: B
    }, we = { hasValue: T }, Ra = L("purchase_value", J.purchase_value, J, we), La = L("current_value", J.current_value, J, we), Ma = L("day_change_abs", J.day_change_abs, J, we), Ha = L("day_change_pct", J.day_change_pct, J, we), Ia = L("gain_abs", J.gain_abs, J, we), za = L("gain_pct", J.gain_pct, J, we), xn = T && typeof B == "number" && Number.isFinite(B) ? `${re(B)} %` : "", Va = T && typeof B == "number" && Number.isFinite(B) ? B > 0 ? "positive" : B < 0 ? "negative" : "neutral" : "", Ua = T && typeof j == "number" && Number.isFinite(j) ? j : "", qa = T && typeof W == "number" && Number.isFinite(W) ? W : "", Wa = T && typeof B == "number" && Number.isFinite(B) ? B : "", Oa = T && typeof K == "number" && Number.isFinite(K) ? K : "", Ba = T && typeof Ie == "number" && Number.isFinite(Ie) ? Ie : "", ja = String(x);
    let $t = "";
    xn && ($t = ` data-gain-pct="${t(xn)}" data-gain-sign="${t(Va)}"`), Se && ($t += ' data-partial="true"'), n += `<tr class="portfolio-row"
                  data-portfolio="${v.uuid}"
                  data-position-count="${ja}"
                  data-current-value="${t(Ua)}"
                  data-purchase-sum="${t(R)}"
                  data-day-change="${t(Oa)}"
                  data-day-change-pct="${t(Ba)}"
                  data-gain-abs="${t(qa)}"
                data-gain-pct="${t(Wa)}"
                data-has-value="${T ? "true" : "false"}"
                data-fx-unavailable="${v.fx_unavailable ? "true" : "false"}"
                data-coverage-ratio="${t(Da)}"
                data-provenance="${t($a)}"
                data-metric-run-uuid="${t(Ta)}">`;
    const Ka = ke(v.name), Ya = Hr(Wr(v.badges), {
      containerClass: "portfolio-badges"
    });
    n += `<td>
        <button type="button"
                class="${ka}"
                data-portfolio="${v.uuid}"
                aria-expanded="${ze ? "true" : "false"}"
                aria-controls="${En}">
          <span class="caret">${ze ? "▼" : "▶"}</span>
          <span class="portfolio-name">${Ka}</span>${Ya}
        </button>
      </td>`;
    const Ga = x.toLocaleString("de-DE");
    n += `<td class="align-right">${Ga}</td>`, n += `<td class="align-right">${Ra}</td>`, n += `<td class="align-right">${La}</td>`, n += `<td class="align-right">${Ma}</td>`, n += `<td class="align-right">${Ha}</td>`, n += `<td class="align-right"${$t}>${Ia}</td>`, n += `<td class="align-right gain-pct-cell">${za}</td>`, n += "</tr>", n += `<tr class="portfolio-details${ze ? "" : " hidden"}"
                data-portfolio="${v.uuid}"
                id="${En}"
                role="region"
                aria-label="Positionen für ${v.name}">
      <td colspan="${r.length.toString()}">
        <div class="positions-container">${ze ? xt(v.uuid) ? Ye(Er(v.uuid)) : '<div class="loading">Lade Positionen...</div>' : ""}</div>
      </td>
    </tr>`;
  });
  const a = e.filter((v) => typeof v.current_value == "number" && Number.isFinite(v.current_value)), i = e.reduce((v, x) => v + (Number.isFinite(x.position_count) ? x.position_count : 0), 0), o = a.reduce((v, x) => typeof x.current_value == "number" && Number.isFinite(x.current_value) ? v + x.current_value : v, 0), l = a.reduce((v, x) => typeof x.purchase_sum == "number" && Number.isFinite(x.purchase_sum) ? v + x.purchase_sum : v, 0), s = a.map((v) => {
    if (typeof v.day_change_abs == "number")
      return v.day_change_abs;
    const x = v.performance && typeof v.performance == "object" ? v.performance.day_change : null;
    if (x && typeof x == "object") {
      const R = x.value_change_eur;
      if (typeof R == "number" && Number.isFinite(R))
        return R;
    }
    return null;
  }).filter((v) => typeof v == "number" && Number.isFinite(v)), c = s.reduce((v, x) => v + x, 0), u = a.reduce((v, x) => {
    if (typeof x.performance?.gain_abs == "number" && Number.isFinite(x.performance.gain_abs))
      return v + x.performance.gain_abs;
    const R = typeof x.current_value == "number" && Number.isFinite(x.current_value) ? x.current_value : 0, j = typeof x.purchase_sum == "number" && Number.isFinite(x.purchase_sum) ? x.purchase_sum : 0;
    return v + (R - j);
  }, 0), p = a.length > 0, f = a.length !== e.length, d = s.length > 0, g = d && p && o !== 0 ? (() => {
    const v = o - c;
    return v ? c / v * 100 : null;
  })() : null, m = p && l > 0 ? u / l * 100 : null, _ = {
    fx_unavailable: f,
    purchase_value: p ? l : null,
    current_value: p ? o : null,
    day_change_abs: d ? c : null,
    day_change_pct: d ? g : null,
    gain_abs: p ? u : null,
    gain_pct: p ? m : null
  }, h = { hasValue: p }, y = { hasValue: d }, b = L("purchase_value", _.purchase_value, _, h), S = L("current_value", _.current_value, _, h), P = L("day_change_abs", _.day_change_abs, _, y), C = L("day_change_pct", _.day_change_pct, _, y), w = L("gain_abs", _.gain_abs, _, h), N = L("gain_pct", _.gain_pct, _, h);
  let D = "";
  if (p && typeof m == "number" && Number.isFinite(m)) {
    const v = `${re(m)} %`, x = m > 0 ? "positive" : m < 0 ? "negative" : "neutral";
    D = ` data-gain-pct="${t(v)}" data-gain-sign="${t(x)}"`;
  }
  f && (D += ' data-partial="true"');
  const H = String(Math.round(i)), A = p ? String(o) : "", E = p ? String(l) : "", I = d ? String(c) : "", F = d && typeof g == "number" && Number.isFinite(g) ? String(g) : "", $ = p ? String(u) : "", Y = p && typeof m == "number" && Number.isFinite(m) ? String(m) : "";
  return n += `<tr class="footer-row"
      data-position-count="${H}"
      data-current-value="${t(A)}"
      data-purchase-sum="${t(E)}"
      data-day-change="${t(I)}"
      data-day-change-pct="${t(F)}"
      data-gain-abs="${t($)}"
      data-gain-pct="${t(Y)}"
      data-has-value="${p ? "true" : "false"}"
      data-fx-unavailable="${f ? "true" : "false"}">
      <td>Summe</td>
      <td class="align-right">${Math.round(i).toLocaleString("de-DE")}</td>
    <td class="align-right">${b}</td>
    <td class="align-right">${S}</td>
    <td class="align-right">${P}</td>
    <td class="align-right">${C}</td>
    <td class="align-right"${D}>${w}</td>
    <td class="align-right gain-pct-cell">${N}</td>
  </tr>`, n += "</tbody></table>", n;
}
function Ao(e) {
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
  const t = Ao(e);
  if (!t)
    return;
  const n = t.tBodies.item(0);
  if (!n)
    return;
  const r = Array.from(n.querySelectorAll("tr.portfolio-row"));
  if (!r.length)
    return;
  let a = 0, i = 0, o = 0, l = 0, s = 0, c = !1, u = !1, p = !0, f = !1;
  for (const R of r) {
    const j = Ue(R.dataset.positionCount);
    j != null && (a += j), R.dataset.fxUnavailable === "true" && (f = !0);
    const T = R.dataset.hasValue;
    if (!!(T === "false" || T === "0" || T === "" || T == null)) {
      p = !1;
      continue;
    }
    c = !0;
    const W = Ue(R.dataset.currentValue), B = Ue(R.dataset.gainAbs), G = Ue(R.dataset.purchaseSum), K = Ue(R.dataset.dayChange);
    if (W == null || B == null || G == null) {
      p = !1;
      continue;
    }
    i += W, l += B, o += G, K != null && (s += K, u = !0);
  }
  const d = c && p, g = d && o > 0 ? l / o * 100 : null, m = u && d && i !== 0 ? (() => {
    const R = i - s;
    return R ? s / R * 100 : null;
  })() : null;
  let _ = Array.from(n.children).find(
    (R) => R instanceof HTMLTableRowElement && R.classList.contains("footer-row")
  );
  _ || (_ = document.createElement("tr"), _.classList.add("footer-row"), n.appendChild(_));
  const h = Math.round(a).toLocaleString("de-DE"), y = {
    fx_unavailable: f || !d,
    purchase_value: d ? o : null,
    current_value: d ? i : null,
    day_change_abs: u && d ? s : null,
    day_change_pct: u && d ? m : null,
    gain_abs: d ? l : null,
    gain_pct: d ? g : null
  }, b = { hasValue: d }, S = { hasValue: u && d }, P = L("purchase_value", y.purchase_value, y, b), C = L("current_value", y.current_value, y, b), w = L("day_change_abs", y.day_change_abs, y, S), N = L("day_change_pct", y.day_change_pct, y, S), D = L("gain_abs", y.gain_abs, y, b), H = L("gain_pct", y.gain_pct, y, b), A = t.tHead ? t.tHead.rows.item(0) : null, E = A ? A.cells.length : 0, I = _.cells.length, F = E || I, $ = F > 0 ? F <= 5 : !1, Y = d && typeof g == "number" ? `${re(g)} %` : "", v = d && typeof g == "number" ? g > 0 ? "positive" : g < 0 ? "negative" : "neutral" : "neutral";
  $ ? _.innerHTML = `
      <td>Summe</td>
      <td class="align-right">${h}</td>
      <td class="align-right">${C}</td>
      <td class="align-right">${D}</td>
      <td class="align-right gain-pct-cell">${H}</td>
    ` : _.innerHTML = `
      <td>Summe</td>
      <td class="align-right">${h}</td>
      <td class="align-right">${P}</td>
      <td class="align-right">${C}</td>
      <td class="align-right">${w}</td>
      <td class="align-right">${N}</td>
      <td class="align-right">${D}</td>
      <td class="align-right">${H}</td>
    `;
  const x = _.cells.item($ ? 3 : 6);
  x && (x.dataset.gainPct = Y || "—", x.dataset.gainSign = v), _.dataset.positionCount = String(Math.round(a)), _.dataset.currentValue = d ? String(i) : "", _.dataset.purchaseSum = d ? String(o) : "", _.dataset.dayChange = d && u ? String(s) : "", _.dataset.dayChangePct = d && u && typeof m == "number" ? String(m) : "", _.dataset.gainAbs = d ? String(l) : "", _.dataset.gainPct = d && typeof g == "number" ? String(g) : "", _.dataset.hasValue = d ? "true" : "false", _.dataset.fxUnavailable = f ? "true" : "false";
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
  const i = (f, d) => {
    const g = a.querySelector("tbody");
    if (!g) return;
    const m = Array.from(g.querySelectorAll("tr")).filter((b) => !b.classList.contains("footer-row")), _ = g.querySelector("tr.footer-row"), h = (b) => {
      if (b == null) return 0;
      const S = b.replace(/\u00A0/g, " ").replace(/[%€]/g, "").replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, ""), P = Number.parseFloat(S);
      return Number.isFinite(P) ? P : 0;
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
      }[f], w = b.cells.item(C), N = S.cells.item(C);
      let D = "";
      if (w) {
        const I = w.textContent;
        typeof I == "string" && (D = I.trim());
      }
      let H = "";
      if (N) {
        const I = N.textContent;
        typeof I == "string" && (H = I.trim());
      }
      const A = (I, F) => {
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
        const I = A(w, D), F = A(N, H);
        E = I - F;
      }
      return d === "asc" ? E : -E;
    }), a.querySelectorAll("thead th.sort-active").forEach((b) => {
      b.classList.remove("sort-active", "dir-asc", "dir-desc");
    });
    const y = a.querySelector(`thead th[data-sort-key="${f}"]`);
    y && y.classList.add("sort-active", d === "asc" ? "dir-asc" : "dir-desc"), m.forEach((b) => g.appendChild(b)), _ && g.appendChild(_);
  }, o = r.dataset.sortKey, l = r.dataset.sortDir, s = a.dataset.defaultSort, c = a.dataset.defaultDir, u = Lt(o) ? o : Lt(s) ? s : "name", p = Mt(l) ? l : Mt(c) ? c : "asc";
  i(u, p), a.addEventListener("click", (f) => {
    const d = f.target;
    if (!(d instanceof Element))
      return;
    const g = d.closest("th[data-sort-key]");
    if (!g || !a.contains(g)) return;
    const m = g.getAttribute("data-sort-key");
    if (!Lt(m))
      return;
    let _ = "asc";
    r.dataset.sortKey === m && (_ = (Mt(r.dataset.sortDir) ? r.dataset.sortDir : "asc") === "asc" ? "desc" : "asc"), r.dataset.sortKey = m, r.dataset.sortDir = _, i(m, _);
  });
}
async function wo(e, t, n) {
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
      const i = await wr(
        gt,
        ht,
        e
      );
      if (i.error) {
        const l = typeof i.error == "string" ? i.error : String(i.error);
        r.innerHTML = `<div class="error">${l} <button class="retry-pos" data-portfolio="${e}">Erneut laden</button></div>`;
        return;
      }
      const o = Ft(
        Array.isArray(i.positions) ? i.positions : []
      );
      dt(e, o), ft(e, o), r.innerHTML = Ye(o);
      try {
        Xe(n, e);
      } catch (l) {
        console.warn("attachPortfolioToggleHandler: Sort-Init (Lazy) fehlgeschlagen:", l);
      }
      try {
        Ge(n, e);
      } catch (l) {
        console.warn("reloadPortfolioPositions: Security-Listener konnte nicht gebunden werden:", l);
      }
    } catch (i) {
      const o = i instanceof Error ? i.message : String(i);
      r.innerHTML = `<div class="error">Fehler: ${o} <button class="retry-pos" data-portfolio="${e}">Retry</button></div>`;
    }
  }
}
async function Co(e, t, n = 3e3, r = 50) {
  const a = performance.now();
  return new Promise((i) => {
    const o = () => {
      const l = e.querySelector(t);
      if (l) {
        i(l);
        return;
      }
      if (performance.now() - a > n) {
        i(null);
        return;
      }
      setTimeout(o, r);
    };
    o();
  });
}
function vn(e) {
  const n = (typeof e.__ppReaderAttachToken == "number" ? e.__ppReaderAttachToken : 0) + 1;
  e.__ppReaderAttachToken = n, e.__ppReaderAttachInProgress = !0, (async () => {
    try {
      const r = await Co(e, ".portfolio-table");
      if (n !== e.__ppReaderAttachToken)
        return;
      if (!r) {
        console.warn("attachPortfolioToggleHandler: .portfolio-table nicht gefunden (Timeout)");
        return;
      }
      if (r.querySelectorAll(".portfolio-toggle").length === 0 && console.debug("attachPortfolioToggleHandler: Noch keine Buttons – evtl. Recovery später"), r.__ppReaderPortfolioToggleBound)
        return;
      r.__ppReaderPortfolioToggleBound = !0, console.debug("attachPortfolioToggleHandler: Listener registriert"), r.addEventListener("click", (i) => {
        (async () => {
          try {
            const o = i.target;
            if (!(o instanceof Element))
              return;
            const l = o.closest(".retry-pos");
            if (l && r.contains(l)) {
              const d = l.getAttribute("data-portfolio");
              if (d) {
                const m = e.querySelector(
                  `.portfolio-details[data-portfolio="${d}"]`
                )?.querySelector(".positions-container");
                await wo(d, m ?? null, e);
              }
              return;
            }
            const s = o.closest(".portfolio-toggle");
            if (!s || !r.contains(s)) return;
            const c = s.getAttribute("data-portfolio");
            if (!c) return;
            const u = e.querySelector(
              `.portfolio-details[data-portfolio="${c}"]`
            );
            if (!u) return;
            const p = s.querySelector(".caret");
            if (u.classList.contains("hidden")) {
              u.classList.remove("hidden"), s.classList.add("expanded"), s.setAttribute("aria-expanded", "true"), p && (p.textContent = "▼"), mt.add(c);
              try {
                bn(e, c);
              } catch (d) {
                console.warn("attachPortfolioToggleHandler: Pending-Flush fehlgeschlagen:", d);
              }
              if (xt(c)) {
                const d = u.querySelector(".positions-container");
                if (d) {
                  d.innerHTML = Ye(
                    Er(c)
                  ), Xe(e, c);
                  try {
                    Ge(e, c);
                  } catch (g) {
                    console.warn("attachPortfolioToggleHandler: Security-Listener (Cache) Fehler:", g);
                  }
                }
              } else {
                const d = u.querySelector(".positions-container");
                d && (d.innerHTML = '<div class="loading">Lade Positionen...</div>');
                try {
                  const g = await wr(
                    gt,
                    ht,
                    c
                  );
                  if (g.error) {
                    const _ = typeof g.error == "string" ? g.error : String(g.error);
                    d && (d.innerHTML = `<div class="error">${_} <button class="retry-pos" data-portfolio="${c}">Erneut laden</button></div>`);
                    return;
                  }
                  const m = Ft(
                    Array.isArray(g.positions) ? g.positions : []
                  );
                  if (dt(c, m), ft(
                    c,
                    m
                  ), d) {
                    d.innerHTML = Ye(m);
                    try {
                      Xe(e, c);
                    } catch (_) {
                      console.warn("attachPortfolioToggleHandler: Sort-Init (Lazy) fehlgeschlagen:", _);
                    }
                    try {
                      Ge(e, c);
                    } catch (_) {
                      console.warn("attachPortfolioToggleHandler: Security-Listener konnte nicht gebunden werden:", _);
                    }
                  }
                } catch (g) {
                  const m = g instanceof Error ? g.message : String(g), _ = u.querySelector(".positions-container");
                  _ && (_.innerHTML = `<div class="error">Fehler beim Laden: ${m} <button class="retry-pos" data-portfolio="${c}">Retry</button></div>`), console.error("Fehler beim Lazy Load für", c, g);
                }
              }
            } else
              u.classList.add("hidden"), s.classList.remove("expanded"), s.setAttribute("aria-expanded", "false"), p && (p.textContent = "▶"), mt.delete(c);
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
function No(e) {
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
  const r = await ii(t, n);
  Dr(r.accounts);
  const a = Mr(), i = await si(t, n);
  Ti(i.portfolios);
  const o = Ui();
  let l = "";
  try {
    l = await oi(t, n);
  } catch {
    l = "";
  }
  const s = a.reduce(
    (A, E) => A + (typeof E.balance == "number" && Number.isFinite(E.balance) ? E.balance : 0),
    0
  ), c = o.some((A) => A.fx_unavailable), u = a.some((A) => A.fx_unavailable && (A.balance == null || !Number.isFinite(A.balance))), p = o.reduce((A, E) => E.hasValue && typeof E.current_value == "number" && Number.isFinite(E.current_value) ? A + E.current_value : A, 0), f = s + p, d = "Teilw. fehlende FX-Kurse – Gesamtvermögen abweichend", m = o.some((A) => A.hasValue && typeof A.current_value == "number" && Number.isFinite(A.current_value)) || a.some((A) => typeof A.balance == "number" && Number.isFinite(A.balance)) ? `${re(f)}&nbsp;€` : `<span class="missing-value" role="note" aria-label="${d}" title="${d}">—</span>`, _ = c || u ? `<span class="total-wealth-note">${d}</span>` : "", h = `
    <div class="header-meta-row">
      💰 Gesamtvermögen: <strong class="total-wealth-value">${m}</strong>${_}
    </div>
  `, y = dn("Übersicht", h), b = Br(o), S = a.filter((A) => (A.currency_code ?? "EUR") === "EUR"), P = a.filter((A) => (A.currency_code ?? "EUR") !== "EUR"), w = P.some((A) => A.fx_unavailable) ? `
        <p class="table-note" role="note">
          <span class="table-note__icon" aria-hidden="true">⚠️</span>
          <span>Wechselkurse konnten nicht geladen werden. EUR-Werte werden derzeit nicht angezeigt.</span>
        </p>
      ` : "", N = `
    <div class="card">
      <h2>Liquidität</h2>
      <div class="scroll-container account-table">
        ${$e(
    S.map((A) => ({
      name: pt(A.name, On(A.badges), {
        containerClass: "account-name",
        labelClass: "account-name__label"
      }),
      balance: A.balance ?? null
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
          ${$e(
    P.map((A) => {
      const E = A.orig_balance, F = typeof E == "number" && Number.isFinite(E) ? `${E.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}&nbsp;${A.currency_code ?? ""}` : "";
      return {
        name: pt(A.name, On(A.badges), {
          containerClass: "account-name",
          labelClass: "account-name__label"
        }),
        fx_display: F,
        balance: A.balance ?? null
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
        ${w}
      </div>` : ""}
  `, D = `
    <div class="card footer-card">
      <div class="meta">
        <div class="last-file-update">
          📂 Letzte Aktualisierung der Datei: <strong>${l || "Unbekannt"}</strong>
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
  return Eo(e, o), H;
}
function Eo(e, t) {
  if (!e)
    return;
  const n = () => {
    try {
      const a = e, i = a.querySelector(".portfolio-table");
      i && i.querySelectorAll(".portfolio-toggle").length === 0 && (console.debug("Recovery: Tabelle ohne Buttons – erneuter Aufbau"), i.innerHTML = Br(t)), vn(e), No(e), mt.forEach((o) => {
        try {
          xt(o) && (Xe(e, o), Ge(e, o));
        } catch (l) {
          console.warn("Init-Sortierung für expandiertes Depot fehlgeschlagen:", o, l);
        }
      });
      try {
        jr(a);
      } catch (o) {
        console.warn("renderDashboard: Footer-Summe konnte nicht aktualisiert werden:", o);
      }
      try {
        ao(e);
      } catch (o) {
        console.warn("renderDashboard: Pending-Positions konnten nicht angewendet werden:", o);
      }
      console.debug("renderDashboard: portfolio-toggle Buttons:", a.querySelectorAll(".portfolio-toggle").length);
    } catch (a) {
      console.error("renderDashboard: Fehler bei Recovery/Listener", a);
    }
  }, r = typeof requestAnimationFrame == "function" ? (a) => requestAnimationFrame(a) : (a) => setTimeout(a, 0);
  r(() => r(n));
}
yi({
  renderPositionsTable: (e) => So(e),
  applyGainPctMetadata: Or,
  attachSecurityDetailListener: Ge,
  attachPortfolioPositionsSorting: Xe,
  updatePortfolioFooter: (e) => {
    e && jr(e);
  }
});
const xo = "http://www.w3.org/2000/svg", Ne = 640, Ee = 260, qe = { top: 12, right: 16, bottom: 24, left: 16 }, We = "var(--pp-reader-chart-line, #3f51b5)", Gt = "var(--pp-reader-chart-area, rgba(63, 81, 181, 0.12))", Yn = "0.75rem", Yr = "var(--pp-reader-chart-baseline, rgba(96, 125, 139, 0.75))", Gr = "6 4", Fo = 1440 * 60 * 1e3;
function Do(e) {
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
function $o(e) {
  return typeof e == "string" ? e : typeof e == "number" && Number.isFinite(e) ? e.toString() : e instanceof Date && Number.isFinite(e.getTime()) ? e.toISOString() : "";
}
function Q(e) {
  return `${String(e)}px`;
}
function ae(e, t = {}) {
  const n = document.createElementNS(xo, e);
  return Object.entries(t).forEach(([r, a]) => {
    const i = Do(a);
    i != null && n.setAttribute(r, i);
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
    const r = t.date, a = $o(r);
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
function ne(e, t, n) {
  return !Number.isFinite(e) || e < t ? t : e > n ? n : e;
}
function To(e, t) {
  if (e.length === 0)
    return "";
  const n = [];
  e.forEach((o, l) => {
    const s = l === 0 ? "M" : "L", c = o.x.toFixed(2), u = o.y.toFixed(2);
    n.push(`${s}${c} ${u}`);
  });
  const r = e[0], i = `L${e[e.length - 1].x.toFixed(2)} ${t.toFixed(2)} L${r.x.toFixed(2)} ${t.toFixed(2)} Z`;
  return `${n.join(" ")} ${i}`;
}
function ko(e) {
  if (e.length === 0)
    return "";
  const t = [];
  return e.forEach((n, r) => {
    const a = r === 0 ? "M" : "L", i = n.x.toFixed(2), o = n.y.toFixed(2);
    t.push(`${a}${i} ${o}`);
  }), t.join(" ");
}
function Ro(e) {
  const { baselineLine: t, baseline: n } = e;
  if (!t)
    return;
  const r = n?.color ?? Yr, a = n?.dashArray ?? Gr;
  t.setAttribute("stroke", r), t.setAttribute("stroke-dasharray", a);
}
function Ht(e) {
  const { baselineLine: t, baseline: n, range: r, margin: a, width: i } = e;
  if (!t)
    return;
  const o = n?.value;
  if (!r || o == null || !Number.isFinite(o)) {
    t.style.opacity = "0";
    return;
  }
  const { minY: l, maxY: s, boundedHeight: c } = r, u = Number.isFinite(l) ? l : o, f = (Number.isFinite(s) ? s : u + 1) - u, d = f === 0 ? 0.5 : (o - u) / f, g = ne(d, 0, 1), m = Math.max(c, 0), _ = a.top + (1 - g) * m, h = Math.max(i - a.left - a.right, 0), y = a.left, b = a.left + h;
  t.setAttribute("x1", y.toFixed(2)), t.setAttribute("x2", b.toFixed(2)), t.setAttribute("y1", _.toFixed(2)), t.setAttribute("y2", _.toFixed(2)), t.style.opacity = "1";
}
function Lo(e, t, n) {
  const { width: r, height: a, margin: i } = t, { xAccessor: o, yAccessor: l } = n;
  if (e.length === 0)
    return { points: [], range: null };
  const s = e.map((F, $) => {
    const Y = o(F, $), v = l(F, $), x = Xr(Y, $), R = yt(v, Number.NaN);
    return Number.isFinite(R) ? {
      index: $,
      data: F,
      xValue: x,
      yValue: R
    } : null;
  }).filter((F) => !!F);
  if (s.length === 0)
    return { points: [], range: null };
  const c = s.reduce((F, $) => Math.min(F, $.xValue), s[0].xValue), u = s.reduce((F, $) => Math.max(F, $.xValue), s[0].xValue), p = s.reduce((F, $) => Math.min(F, $.yValue), s[0].yValue), f = s.reduce((F, $) => Math.max(F, $.yValue), s[0].yValue), d = Math.max(r - i.left - i.right, 1), g = Math.max(a - i.top - i.bottom, 1), m = Number.isFinite(c) ? c : 0, _ = Number.isFinite(u) ? u : m + 1, h = Number.isFinite(p) ? p : 0, y = Number.isFinite(f) ? f : h + 1, b = yt(t.baseline?.value, null), S = b != null && Number.isFinite(b) ? Math.min(h, b) : h, P = b != null && Number.isFinite(b) ? Math.max(y, b) : y, C = Math.max(
    2,
    Math.min(
      6,
      Math.round(
        Math.max(a - i.top - i.bottom, 0) / 60
      ) || 4
    )
  ), { niceMin: w, niceMax: N } = qo(
    S,
    P,
    C
  ), D = Number.isFinite(w) ? w : h, H = Number.isFinite(N) ? N : y, A = _ - m || 1, E = H - D || 1;
  return {
    points: s.map((F) => {
      const $ = A === 0 ? 0.5 : (F.xValue - m) / A, Y = E === 0 ? 0.5 : (F.yValue - D) / E, v = i.left + $ * d, x = i.top + (1 - Y) * g;
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
  const { markerLayer: t, markerOverlay: n, markers: r, range: a, margin: i, markerTooltip: o } = e;
  if (e.markerPositions = [], ct(e), !t || !n)
    return;
  for (; t.firstChild; )
    t.removeChild(t.firstChild);
  for (; n.firstChild; )
    n.removeChild(n.firstChild);
  if (!a || !Array.isArray(r) || r.length === 0)
    return;
  const l = a.maxX - a.minX || 1, s = a.maxY - a.minY || 1;
  r.forEach((c, u) => {
    const p = Xr(c.x, u), f = yt(c.y, Number.NaN), d = Number(f);
    if (!Number.isFinite(p) || !Number.isFinite(d))
      return;
    const g = l === 0 ? 0.5 : ne((p - a.minX) / l, 0, 1), m = s === 0 ? 0.5 : ne((d - a.minY) / s, 0, 1), _ = i.left + g * a.boundedWidth, h = i.top + (1 - m) * a.boundedHeight, y = ae("g", {
      class: "line-chart-marker",
      transform: `translate(${_.toFixed(2)} ${h.toFixed(2)})`,
      "data-marker-id": c.id
    }), b = ae("circle", {
      r: 5,
      fill: c.color || e.color,
      stroke: "#fff",
      "stroke-width": 2,
      opacity: 0.95
    });
    y.appendChild(b), t.appendChild(y), e.markerPositions.push({
      marker: c,
      x: _,
      y: h
    });
  }), o && (o.style.opacity = "0", o.style.visibility = "hidden");
}
function aa(e, t, n, r) {
  e.width = Number.isFinite(t) ? Number(t) : Ne, e.height = Number.isFinite(n) ? Number(n) : Ee, e.margin = {
    top: Number.isFinite(r?.top) ? Number(r?.top) : qe.top,
    right: Number.isFinite(r?.right) ? Number(r?.right) : qe.right,
    bottom: Number.isFinite(r?.bottom) ? Number(r?.bottom) : qe.bottom,
    left: Number.isFinite(r?.left) ? Number(r?.left) : qe.left
  };
}
function Mo(e, t) {
  const n = e.xFormatter(t.xValue, t.data, t.index), r = e.yFormatter(t.yValue, t.data, t.index);
  return e.tooltipRenderer({
    point: t,
    xFormatted: n,
    yFormatted: r,
    data: t.data,
    index: t.index
  });
}
function Ho(e, t, n, r = null) {
  const { tooltip: a, width: i, margin: o, height: l } = e;
  if (!a)
    return;
  const s = r && Number.isFinite(r.scaleX) && r.scaleX > 0 ? r.scaleX : 1, c = r && Number.isFinite(r.scaleY) && r.scaleY > 0 ? r.scaleY : 1, u = l - o.bottom;
  a.style.visibility = "visible", a.style.opacity = "1";
  const p = a.offsetWidth || 0, f = a.offsetHeight || 0, d = t.x * s, g = ne(
    d - p / 2,
    o.left * s,
    (i - o.right) * s - p
  ), m = Math.max(u * c - f, 0), _ = 12, y = (Number.isFinite(n) ? ne(n ?? 0, o.top, u) : t.y) * c;
  let b = y - f - _;
  b < o.top * c && (b = y + _), b = ne(b, 0, m);
  const S = Q(Math.round(g)), P = Q(Math.round(b));
  a.style.transform = `translate(${S}, ${P})`;
}
function Xt(e) {
  const { tooltip: t, focusLine: n, focusCircle: r } = e;
  t && (t.style.opacity = "0", t.style.visibility = "hidden"), n && (n.style.opacity = "0"), r && (r.style.opacity = "0");
}
function Io(e, t) {
  const { marker: n } = t, r = e.xFormatter(t.marker.x, n, -1), a = e.yFormatter(t.marker.y, n, -1);
  return e.markerTooltipRenderer({
    marker: n,
    xFormatted: r,
    yFormatted: a
  });
}
function zo(e, t, n, r = null) {
  const { markerTooltip: a, width: i, margin: o, height: l, tooltip: s } = e;
  if (!a)
    return;
  const c = r && Number.isFinite(r.scaleX) && r.scaleX > 0 ? r.scaleX : 1, u = r && Number.isFinite(r.scaleY) && r.scaleY > 0 ? r.scaleY : 1, p = l - o.bottom;
  a.style.visibility = "visible", a.style.opacity = "1";
  const f = a.offsetWidth || 0, d = a.offsetHeight || 0, g = t.x * c, m = ne(
    g - f / 2,
    o.left * c,
    (i - o.right) * c - f
  ), _ = Math.max(p * u - d, 0), h = 10, y = s?.getBoundingClientRect(), b = e.svg?.getBoundingClientRect(), S = y && b ? y.top - b.top : null, P = y && b ? y.bottom - b.top : null, w = (Number.isFinite(n) ? ne(n ?? t.y, o.top, p) : t.y) * u;
  let N;
  S != null && P != null ? S <= w ? N = S - d - h : N = P + h : (N = w - d - h, N < o.top * u && (N = w + h)), N = ne(N, 0, _);
  const D = Q(Math.round(m)), H = Q(Math.round(N));
  a.style.transform = `translate(${D}, ${H})`;
}
function ct(e) {
  const { markerTooltip: t } = e;
  t && (t.style.opacity = "0", t.style.visibility = "hidden");
}
function Vo(e, t, n) {
  let a = null, i = 576;
  for (const o of e.markerPositions) {
    const l = o.x - t, s = o.y - n, c = l * l + s * s;
    c <= i && (a = o, i = c);
  }
  return a;
}
function Uo(e, t) {
  if (t.handlersAttached || !t.overlay)
    return;
  const n = (a) => {
    if (t.points.length === 0 || !t.svg) {
      Xt(t), ct(t);
      return;
    }
    const i = t.svg.getBoundingClientRect(), o = t.width || Ne, l = t.height || Ee, s = i.width && Number.isFinite(i.width) && Number.isFinite(o) && o > 0 ? i.width / o : 1, c = i.height && Number.isFinite(i.height) && Number.isFinite(l) && l > 0 ? i.height / l : 1, u = s > 0 ? 1 / s : 1, p = c > 0 ? 1 / c : 1, f = (a.clientX - i.left) * u, d = (a.clientY - i.top) * p, g = {
      scaleX: s,
      scaleY: c
    };
    let m = t.points[0], _ = Math.abs(f - m.x);
    for (let y = 1; y < t.points.length; y += 1) {
      const b = t.points[y], S = Math.abs(f - b.x);
      S < _ && (_ = S, m = b);
    }
    t.focusCircle && (t.focusCircle.setAttribute("cx", m.x.toFixed(2)), t.focusCircle.setAttribute("cy", m.y.toFixed(2)), t.focusCircle.style.opacity = "1"), t.focusLine && (t.focusLine.setAttribute("x1", m.x.toFixed(2)), t.focusLine.setAttribute("x2", m.x.toFixed(2)), t.focusLine.setAttribute("y1", t.margin.top.toFixed(2)), t.focusLine.setAttribute(
      "y2",
      (t.height - t.margin.bottom).toFixed(2)
    ), t.focusLine.style.opacity = "1"), t.tooltip && (t.tooltip.innerHTML = Mo(t, m), Ho(t, m, d, g));
    const h = Vo(t, f, d);
    h && t.markerTooltip ? (t.markerTooltip.innerHTML = Io(t, h), zo(t, h, d, g)) : ct(t);
  }, r = () => {
    Xt(t), ct(t);
  };
  t.overlay.addEventListener("pointermove", n), t.overlay.addEventListener("pointerenter", n), t.overlay.addEventListener("pointerleave", r), t.handlersAttached = !0, t.handlePointerMove = n, t.handlePointerLeave = r, e.addEventListener("pointercancel", r);
}
function ia(e, t = {}) {
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
  }), i = ae("line", {
    class: "line-chart-baseline",
    stroke: Yr,
    "stroke-width": 1,
    "stroke-dasharray": Gr,
    opacity: 0
  }), o = ae("path", {
    class: "line-chart-path",
    fill: "none",
    stroke: We,
    "stroke-width": 2,
    "stroke-linecap": "round",
    "stroke-linejoin": "round"
  }), l = ae("line", {
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
  }), c = ae("g", {
    class: "line-chart-markers"
  }), u = ae("rect", {
    class: "line-chart-overlay",
    fill: "transparent",
    x: 0,
    y: 0,
    width: Ne,
    height: Ee
  });
  r.appendChild(a), r.appendChild(i), r.appendChild(o), r.appendChild(l), r.appendChild(s), r.appendChild(c), r.appendChild(u), n.appendChild(r);
  const p = document.createElement("div");
  p.className = "chart-tooltip", p.style.position = "absolute", p.style.top = "0", p.style.left = "0", p.style.pointerEvents = "none", p.style.opacity = "0", p.style.visibility = "hidden", n.appendChild(p);
  const f = document.createElement("div");
  f.className = "line-chart-marker-overlay", f.style.position = "absolute", f.style.top = "0", f.style.left = "0", f.style.width = "100%", f.style.height = "100%", f.style.pointerEvents = "none", f.style.overflow = "visible", f.style.zIndex = "2", n.appendChild(f);
  const d = document.createElement("div");
  d.className = "chart-tooltip chart-tooltip--marker", d.style.position = "absolute", d.style.top = "0", d.style.left = "0", d.style.pointerEvents = "none", d.style.opacity = "0", d.style.visibility = "hidden", n.appendChild(d), e.appendChild(n);
  const g = ra(n);
  if (g.svg = r, g.areaPath = a, g.linePath = o, g.baselineLine = i, g.focusLine = l, g.focusCircle = s, g.overlay = u, g.tooltip = p, g.markerOverlay = f, g.markerLayer = c, g.markerTooltip = d, g.xAccessor = t.xAccessor ?? Zr, g.yAccessor = t.yAccessor ?? Jr, g.xFormatter = t.xFormatter ?? Qr, g.yFormatter = t.yFormatter ?? ea, g.tooltipRenderer = t.tooltipRenderer ?? ta, g.markerTooltipRenderer = t.markerTooltipRenderer ?? na, g.color = t.color ?? We, g.areaColor = t.areaColor ?? Gt, g.baseline = t.baseline ?? null, g.handlersAttached = !1, g.markers = Array.isArray(t.markers) ? t.markers.slice() : [], !g.xAxis) {
    const m = document.createElement("div");
    m.className = "line-chart-axis line-chart-axis-x", m.style.position = "absolute", m.style.left = "0", m.style.right = "0", m.style.bottom = "0", m.style.pointerEvents = "none", m.style.fontSize = Yn, m.style.color = "var(--secondary-text-color)", m.style.display = "block", n.appendChild(m), g.xAxis = m;
  }
  if (!g.yAxis) {
    const m = document.createElement("div");
    m.className = "line-chart-axis line-chart-axis-y", m.style.position = "absolute", m.style.top = "0", m.style.bottom = "0", m.style.left = "0", m.style.pointerEvents = "none", m.style.fontSize = Yn, m.style.color = "var(--secondary-text-color)", m.style.display = "block", n.appendChild(m), g.yAxis = m;
  }
  return aa(g, t.width, t.height, t.margin), o.setAttribute("stroke", g.color), l.setAttribute("stroke", g.color), s.setAttribute("stroke", g.color), a.setAttribute("fill", g.areaColor), Sn(n, t), Uo(n, g), n;
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
  t.xAccessor && (n.xAccessor = t.xAccessor), t.yAccessor && (n.yAccessor = t.yAccessor), t.xFormatter && (n.xFormatter = t.xFormatter), t.yFormatter && (n.yFormatter = t.yFormatter), t.tooltipRenderer && (n.tooltipRenderer = t.tooltipRenderer), t.markerTooltipRenderer && (n.markerTooltipRenderer = t.markerTooltipRenderer), t.color && (n.color = t.color, n.linePath.setAttribute("stroke", n.color), n.focusLine && n.focusLine.setAttribute("stroke", n.color), n.focusCircle && n.focusCircle.setAttribute("stroke", n.color)), t.areaColor && (n.areaColor = t.areaColor, n.areaPath && n.areaPath.setAttribute("fill", n.areaColor)), Object.prototype.hasOwnProperty.call(t, "baseline") && (n.baseline = t.baseline ?? null), Array.isArray(t.markers) && (n.markers = t.markers.slice()), Ro(n), aa(n, t.width, t.height, t.margin);
  const { width: r, height: a } = n;
  n.svg.setAttribute("width", String(r)), n.svg.setAttribute("height", String(a)), n.svg.setAttribute("viewBox", `0 0 ${String(r)} ${String(a)}`), n.overlay.setAttribute("x", "0"), n.overlay.setAttribute("y", "0"), n.overlay.setAttribute("width", Math.max(r, 0).toFixed(2)), n.overlay.setAttribute("height", Math.max(a, 0).toFixed(2)), Array.isArray(t.series) && (n.series = Array.from(t.series));
  const { points: i, range: o } = Lo(n.series, n, {
    xAccessor: n.xAccessor,
    yAccessor: n.yAccessor
  });
  if (n.points = i, n.range = o, i.length === 0) {
    n.linePath.setAttribute("d", ""), n.areaPath && n.areaPath.setAttribute("d", ""), Xt(n), It(n), zt(n), Ht(n);
    return;
  }
  if (i.length === 1) {
    const s = i[0], c = Math.max(
      0.5,
      Math.min(4, Math.max(n.width - n.margin.left - n.margin.right, 1) * 0.01)
    ), u = `M${s.x.toFixed(2)} ${s.y.toFixed(2)} h${c.toFixed(2)}`;
    n.linePath.setAttribute("d", u), n.areaPath && n.areaPath.setAttribute("d", ""), n.focusCircle && (n.focusCircle.setAttribute("cx", s.x.toFixed(2)), n.focusCircle.setAttribute("cy", s.y.toFixed(2)), n.focusCircle.style.opacity = "1"), n.focusLine && (n.focusLine.style.opacity = "0"), zt(n), Ht(n), It(n);
    return;
  }
  const l = ko(i);
  if (n.linePath.setAttribute("d", l), n.areaPath && o) {
    const s = n.margin.top + o.boundedHeight, c = To(i, s);
    n.areaPath.setAttribute("d", c);
  }
  zt(n), Ht(n), It(n);
}
function zt(e) {
  const { xAxis: t, yAxis: n, range: r, margin: a, height: i, yFormatter: o } = e;
  if (!t || !n)
    return;
  if (!r) {
    t.innerHTML = "", n.innerHTML = "";
    return;
  }
  const { minX: l, maxX: s, minY: c, maxY: u, boundedWidth: p, boundedHeight: f } = r, d = Number.isFinite(l) && Number.isFinite(s) && s >= l, g = Number.isFinite(c) && Number.isFinite(u) && u >= c, m = Math.max(p, 0), _ = Math.max(f, 0);
  if (t.style.left = Q(a.left), t.style.width = Q(m), t.style.top = Q(i - a.bottom + 6), t.innerHTML = "", d && m > 0) {
    const y = (s - l) / Fo, b = Math.max(2, Math.min(6, Math.round(m / 140) || 4));
    Wo(e, l, s, b, y).forEach(({ positionRatio: P, label: C }) => {
      const w = document.createElement("div");
      w.className = "line-chart-axis-tick line-chart-axis-tick-x", w.style.position = "absolute", w.style.bottom = "0";
      const N = ne(P, 0, 1);
      w.style.left = Q(N * m);
      let D = "-50%", H = "center";
      N <= 1e-3 ? (D = "0", H = "left", w.style.marginLeft = "2px") : N >= 0.999 && (D = "-100%", H = "right", w.style.marginRight = "2px"), w.style.transform = `translateX(${D})`, w.style.textAlign = H, w.textContent = C, t.appendChild(w);
    });
  }
  n.style.top = Q(a.top), n.style.height = Q(_);
  const h = Math.max(a.left - 6, 0);
  if (n.style.left = "0", n.style.width = Q(Math.max(h, 0)), n.innerHTML = "", g && _ > 0) {
    const y = Math.max(2, Math.min(6, Math.round(_ / 60) || 4)), b = Oo(c, u, y), S = o;
    b.forEach(({ value: P, positionRatio: C }) => {
      const w = document.createElement("div");
      w.className = "line-chart-axis-tick line-chart-axis-tick-y", w.style.position = "absolute", w.style.left = "0";
      const D = (1 - ne(C, 0, 1)) * _;
      w.style.top = Q(D), w.textContent = S(P, null, -1), n.appendChild(w);
    });
  }
}
function qo(e, t, n = 4) {
  if (!Number.isFinite(e) || !Number.isFinite(t))
    return {
      niceMin: e,
      niceMax: t
    };
  const r = Math.max(2, n);
  if (t === e) {
    const c = Zt(Math.abs(e) || 1);
    return {
      niceMin: e - c,
      niceMax: t + c
    };
  }
  const i = (t - e) / (r - 1), o = Zt(i), l = Math.floor(e / o) * o, s = Math.ceil(t / o) * o;
  return l === s ? {
    niceMin: e,
    niceMax: t + o
  } : {
    niceMin: l,
    niceMax: s
  };
}
function Wo(e, t, n, r, a) {
  if (!Number.isFinite(t) || !Number.isFinite(n) || n < t)
    return [];
  if (!Number.isFinite(a) || a <= 0)
    return [
      {
        positionRatio: 0.5,
        label: Gn(e, t, a || 0)
      }
    ];
  const i = Math.max(2, r), o = [], l = n - t;
  for (let s = 0; s < i; s += 1) {
    const c = i === 1 ? 0.5 : s / (i - 1), u = t + c * l;
    o.push({
      positionRatio: c,
      label: Gn(e, u, a)
    });
  }
  return o;
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
function Oo(e, t, n) {
  if (!Number.isFinite(e) || !Number.isFinite(t))
    return [];
  if (t === e)
    return [
      {
        value: e,
        positionRatio: 0.5
      }
    ];
  const r = t - e, a = Math.max(2, n), i = r / (a - 1), o = Zt(i), l = Math.floor(e / o) * o, s = Math.ceil(t / o) * o, c = [];
  for (let u = l; u <= s + o / 2; u += o) {
    const p = (u - e) / (t - e);
    c.push({
      value: u,
      positionRatio: ne(p, 0, 1)
    });
  }
  return c.length > a + 2 ? c.filter((u, p) => p % 2 === 0) : c;
}
function Zt(e) {
  if (!Number.isFinite(e) || e === 0)
    return 1;
  const t = Math.floor(Math.log10(Math.abs(e))), n = Math.abs(e) / 10 ** t;
  let r;
  return n <= 1 ? r = 1 : n <= 2 ? r = 2 : n <= 5 ? r = 5 : r = 10, r * 10 ** t;
}
let ye = {
  status: "idle",
  error: null,
  data: null,
  selection: null,
  lastUpdated: null
}, Xn = null;
function Bo(e) {
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
function jo(e) {
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
function Ko(e) {
  const t = Jt(e.date ?? null), n = jo(e.range ?? null);
  if (t && n)
    throw new Error("loadDailyWealth: date und range können nicht gleichzeitig gesetzt werden");
  if (!t && !n)
    throw new Error("loadDailyWealth: entweder date oder range erforderlich");
  const r = e.scopes ?? {}, a = Zn(r.accounts), i = Zn(r.portfolios), o = {};
  t && (o.date = t), n && (o.range = n);
  const l = e.include_slices ?? e.includeSlices ?? void 0, s = e.include_scopes ?? e.includeScopes ?? void 0;
  return l !== void 0 && (o.includeSlices = l), s !== void 0 && (o.includeScopes = s), (a.length || i.length) && (o.scopes = {}, a.length && (o.scopes.accounts = a), i.length && (o.scopes.portfolios = i)), typeof e.limit == "number" && Number.isFinite(e.limit) && e.limit > 0 && (o.limit = e.limit), typeof e.offset == "number" && Number.isFinite(e.offset) && e.offset >= 0 && (o.offset = e.offset), o;
}
function Yo(e) {
  const t = e.date ?? "", n = e.range ? `${e.range.start}..${e.range.end}` : "", r = e.scopes?.accounts ?? [], a = e.scopes?.portfolios ?? [], i = JSON.stringify({ accounts: r, portfolios: a }), o = e.includeSlices ? "1" : "0", l = e.includeScopes ? "1" : "0", s = e.limit ?? "", c = e.offset ?? "";
  return [t, n, i, o, l, s, c].join("::");
}
function Go(e) {
  return { ...e };
}
function Jn(e) {
  return { ...e };
}
function Xo(e) {
  if (e)
    return {
      accounts: e.accounts.map(Jn),
      portfolios: e.portfolios.map(Jn)
    };
}
function Zo(e) {
  if (!e)
    return null;
  const t = Xo(e.slices);
  return {
    range: { ...e.range },
    records: e.records.map(Go),
    ...t ? { slices: t } : {}
  };
}
function Jo(e) {
  if (!e)
    return null;
  const t = {};
  return e.date && (t.date = e.date), e.range && (t.range = { ...e.range }), e.scopes && (t.scopes = {
    ...e.scopes.accounts ? { accounts: [...e.scopes.accounts] } : {},
    ...e.scopes.portfolios ? { portfolios: [...e.scopes.portfolios] } : {}
  }), e.includeSlices !== void 0 && (t.includeSlices = e.includeSlices), e.includeScopes !== void 0 && (t.includeScopes = e.includeScopes), e.limit !== void 0 && (t.limit = e.limit), e.offset !== void 0 && (t.offset = e.offset), t;
}
function Vt(e) {
  ye = {
    ...ye,
    ...e
  };
}
function Qt() {
  return {
    status: ye.status,
    error: ye.error,
    lastUpdated: ye.lastUpdated,
    data: Zo(ye.data),
    selection: Jo(ye.selection)
  };
}
async function Qo(e, t, n = {}) {
  const r = Ko(n), a = Yo(r);
  if (ye.data && !n.force && Xn === a)
    return Qt();
  Vt({
    status: "loading",
    error: null,
    selection: r
  });
  try {
    const i = await ui(e, t, r);
    Xn = a, Vt({
      status: "loaded",
      error: null,
      data: i,
      selection: r,
      lastUpdated: Date.now()
    });
  } catch (i) {
    Vt({
      status: "error",
      error: Bo(i),
      selection: r,
      lastUpdated: Date.now()
    });
  }
  return Qt();
}
const es = 30;
let oa = null, en = "range", tn = null;
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
  const t = e.some((i) => i.fx_coverage_ratio != null && i.fx_coverage_ratio < 1), n = e.some((i) => i.price_coverage_ratio != null && i.price_coverage_ratio < 1), r = e.some((i) => i.stale_price), a = [];
  return t && a.push('<span class="meta-badge meta-badge--warning" title="Wechselkurse fehlen teilweise">FX-Abdeckung</span>'), n && a.push('<span class="meta-badge meta-badge--warning" title="Preisdaten unvollständig">Preisabdeckung</span>'), r && a.push('<span class="meta-badge meta-badge--neutral" title="Letzte Kurse sind veraltet">Stale Kurse</span>'), a.length ? `<span class="meta-badges">${a.join("")}</span>` : '<span class="meta-badge meta-badge--positive">Volle Abdeckung</span>';
}
function sa(e) {
  return `${re(e)}&nbsp;€`;
}
function he(e, t) {
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
  const r = e.querySelector("#analyse-total-wealth"), a = e.querySelector("#analyse-coverage"), i = e.querySelector("#analyse-selection-label");
  if (!r || !a || !i)
    return;
  if (i.textContent = t, !n.length) {
    r.innerHTML = "—", a.innerHTML = "";
    return;
  }
  const o = n[n.length - 1];
  r.innerHTML = sa(o.total_wealth_eur), a.innerHTML = rs(n);
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
  const a = (o, l, s = "", c = "") => `
    <div class="metric-row ${s}" ${c ? `id="${c}"` : ""}>
      <span class="metric-label">${o}</span>
      <span class="metric-value">${typeof l == "number" ? sa(l) : l}</span>
    </div>`, i = `
    <div class="metrics-section">
      <h3>Performance-Berechnung</h3>
      ${a("Anfangswert", r.startValue, "", "perf-startValue")}
      ${a("Kurserfolge (Gesamt)", r.marketGain, "sub-header")}
      ${a("&nbsp;&nbsp;↳ Realisiert", r.realizedGains, "indent")}
      ${a("&nbsp;&nbsp;↳ Nicht realisiert (inkl. FX)", r.unrealizedGains, "indent")}
      ${a("Dividenden", r.dividends)}
      ${a("Zinsen", r.interest)}
      ${a("Gebühren", r.fees)}
      ${a("Steuern", r.taxes)}
      ${a("Performanceneutrale Bew.", r.neutral + r.netTransfers)}
      ${a("Endwert", r.endValue, "highlight", "perf-endValue")}
    </div>
  `;
  n.innerHTML = i;
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
    r.forEach((i) => {
      const o = _t(a, i.scope_id);
      o && t.add(o);
    });
  };
  n(e.accounts, "account"), n(e.portfolios, "portfolio"), ue.size === 0 ? t.forEach((r) => ue.add(r)) : Array.from(ue).forEach((r) => {
    t.has(r) || ue.delete(r);
  });
}
function is(e, t) {
  const n = e.querySelector(".analyse-scope-filters");
  if (!n)
    return;
  const r = n.cloneNode(!1);
  n.replaceWith(r), r.innerHTML = "";
  const a = t ? t.accounts.length > 0 : !1, i = t ? t.portfolios.length > 0 : !1;
  if (!t || !a && !i) {
    r.innerHTML = '<p class="table-note" role="note"><span class="table-note__icon" aria-hidden="true">ℹ️</span><span>Keine Slices verfügbar.</span></p>';
    return;
  }
  const o = (l, s, c) => {
    const u = /* @__PURE__ */ new Map();
    if (s.forEach((f) => {
      const d = _t(c, f.scope_id);
      d && !u.has(d) && u.set(d, f);
    }), u.size === 0)
      return "";
    const p = Array.from(u.values()).map((f) => {
      const d = _t(c, f.scope_id);
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
    return `<div class="scope-group"><div class="scope-title">${l}</div>${p}</div>`;
  };
  r.innerHTML = `
    ${o("Konten", t.accounts, "account")}
    ${o("Depots", t.portfolios, "portfolio")}
  `, r.addEventListener("change", (l) => {
    const s = l.target?.closest('input[type="checkbox"][data-scope-key]');
    if (!s || !s.dataset.scopeKey)
      return;
    const { scopeKey: c } = s.dataset;
    if (!c)
      return;
    s.checked ? ue.add(c) : ue.delete(c);
    const u = e.closest("#analyse-chart-card");
    u && tn && ca(u, tn);
  });
}
function os(e) {
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
    points: e.records.map((o) => ({
      date: o.date,
      value: o.total_wealth_eur
    }))
  }, r = [], a = /* @__PURE__ */ new Map(), i = (o, l) => {
    o.forEach((s) => {
      const c = _t(l, s.scope_id);
      c && (a.has(c) || a.set(c, /* @__PURE__ */ new Map()), a.get(c)?.set(s.date, s));
    });
  };
  return e.slices && (i(e.slices.accounts, "account"), i(e.slices.portfolios, "portfolio")), a.forEach((o, l) => {
    if (!ue.has(l))
      return;
    const s = t.shift() ?? "#607d8b", c = l.startsWith("account:"), u = l.split(":")[1] ?? "", f = `${c ? "Konto" : "Depot"} ${u}`.trim(), d = o.values().next(), m = (d.done ? void 0 : d.value)?.scope_name ?? f;
    r.push({
      key: l,
      label: m,
      color: s,
      points: e.records.map((_) => {
        const h = o.get(_.date);
        return !h || !Number.isFinite(h.total_wealth_eur) ? null : { date: _.date, value: h.total_wealth_eur };
      }).filter((_) => !!_)
    });
  }), [n, ...r];
}
function cs(e, t) {
  const n = e.__chartState, r = e.querySelector("svg");
  if (!n || !n.range || !n.margin || !r)
    return;
  const { range: a, margin: i } = n;
  r.querySelectorAll(".analyse-slice-series").forEach((o) => {
    o.remove();
  }), t.filter((o) => o.key !== "total").forEach((o) => {
    const l = o.points.map((u, p) => {
      const f = os(u.date);
      if (f == null || !Number.isFinite(u.value))
        return null;
      const d = a.maxX === a.minX ? 0.5 : (f - a.minX) / (a.maxX - a.minX), g = a.maxY === a.minY ? 0.5 : (u.value - a.minY) / (a.maxY - a.minY), m = i.left + d * a.boundedWidth, _ = i.top + (1 - g) * a.boundedHeight;
      return `${p === 0 ? "M" : "L"}${String(m)},${String(_)}`;
    }).filter(Boolean).join(" ");
    if (!l)
      return;
    const s = document.createElementNS("http://www.w3.org/2000/svg", "g");
    s.setAttribute("class", "analyse-slice-series");
    const c = document.createElementNS("http://www.w3.org/2000/svg", "path");
    c.setAttribute("d", l), c.setAttribute("fill", "none"), c.setAttribute("stroke", o.color), c.setAttribute("stroke-width", "2"), c.setAttribute("stroke-linejoin", "round"), c.setAttribute("stroke-linecap", "round"), s.appendChild(c), r.appendChild(s);
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
  const i = {
    series: a.points,
    xAccessor: (s) => s.date,
    yAccessor: (s) => s.value,
    xFormatter: (s) => {
      const c = new Date(s);
      return Number.isFinite(c.getTime()) ? c.toLocaleDateString("de-DE") : "";
    },
    yFormatter: (s) => re(s),
    color: a.color,
    areaColor: "rgba(44, 62, 80, 0.12)"
  }, o = n;
  let l = o;
  !o.__chartState || !n.querySelector("svg") ? (n.innerHTML = "", l = ia(n, i)) : (Sn(o, i), l = o), l && cs(l, r);
}
function ls(e) {
  if (!e.length)
    return null;
  const t = e[0]?.total_wealth_eur ?? 0, n = e[e.length - 1]?.total_wealth_eur ?? 0, r = he(e, "dividends_eur"), a = he(e, "interest_eur"), i = r + a, o = -Math.abs(he(e, "fees_eur")), l = -Math.abs(he(e, "taxes_eur")), s = he(e, "inbound_transfers_eur") - he(e, "outbound_transfers_eur"), c = he(e, "performance_neutral_movements"), u = n - t - i - o - l - s - c, p = he(e, "realized_gains_eur"), f = u - p;
  return {
    startValue: t,
    endValue: n,
    marketGain: u,
    realizedGains: p,
    unrealizedGains: f,
    dividends: r,
    interest: a,
    ertraege: i,
    fees: o,
    taxes: l,
    netTransfers: s,
    neutral: c
  };
}
function nt(e) {
  const n = e.querySelector('input[name="analyse-range-mode"]:checked')?.value === "date" ? "date" : "range";
  en = n;
  const r = e.querySelector("#analyse-date-single"), a = e.querySelector("#analyse-date-start"), i = e.querySelector("#analyse-date-end"), o = (c) => {
    if (!c)
      return null;
    const u = c.trim();
    return u.length === 10 ? u : null;
  };
  if (n === "date") {
    let c = o(r?.value);
    if (!c) {
      const u = o(a?.value) ?? (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
      c = u, r && (r.value = u);
    }
    return { date: c, includeSlices: !0, includeScopes: !0 };
  }
  let l = o(a?.value), s = o(i?.value);
  if (!l || !s) {
    const c = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    l || (l = c), s || (s = c), a && !a.value && (a.value = l), i && !i.value && (i.value = s);
  }
  return !l || !s ? null : l > s ? { range: { start: s, end: l }, includeSlices: !0, includeScopes: !0 } : { range: { start: l, end: s }, includeSlices: !0, includeScopes: !0 };
}
function rt(e, t) {
  const n = t.date ? "date" : "range", r = e.querySelector('input[name="analyse-range-mode"][value="date"]'), a = e.querySelector('input[name="analyse-range-mode"][value="range"]');
  r && a && (r.checked = n === "date", a.checked = n === "range");
  const i = e.querySelector("#analyse-date-single"), o = e.querySelector("#analyse-date-start"), l = e.querySelector("#analyse-date-end");
  i && t.date && (i.value = t.date), o && l && t.range && (o.value = t.range.start, l.value = t.range.end);
  const s = e.querySelector(".analyse-range-fields"), c = e.querySelector(".analyse-single-field");
  s && c && (n === "date" ? (s.style.display = "none", c.style.display = "") : (s.style.display = "", c.style.display = "none"));
}
function nr(e) {
  return e.date ? `Tag: ${e.date}` : e.range ? `Zeitraum: ${e.range.start} – ${e.range.end}` : "";
}
async function at(e, t, n, r, a) {
  tt(e, "loading");
  const i = await Qo(n, r, a);
  if (i.status === "error") {
    if (tt(e, "error", i.error ?? void 0), t) {
      const l = t.querySelector(".line-chart-container");
      l && l.replaceChildren();
    }
    return;
  }
  const o = i.data;
  if (!o || !Array.isArray(o.records) || o.records.length === 0) {
    if (er(e, nr(a), []), tr(e, []), tt(e, "loaded", "Keine Daten für den gewählten Zeitraum."), t) {
      const l = t.querySelector(".line-chart-container");
      l && l.replaceChildren();
    }
    return;
  }
  oa = a, tn = o, as(o.slices), er(e, nr(a), o.records), tr(e, o.records), t && (is(t, o.slices), ca(t, o)), tt(e, "loaded");
}
function us(e, t, n, r) {
  const a = e.querySelector("#analyse-range-apply"), i = e.querySelectorAll('input[name="analyse-range-mode"]'), o = oa ?? Qt().selection ?? ns();
  rt(e, o);
  const l = () => {
    const c = nt(e);
    c && rt(e, c);
  };
  i.forEach((c) => {
    c.addEventListener("change", () => {
      l();
      const u = nt(e);
      u && Ut(() => {
        rt(e, u), at(e, t, n, r, u);
      });
    });
  }), a && a.addEventListener("click", () => {
    const c = nt(e) ?? o;
    rt(e, c), Ut(() => {
      at(e, t, n, r, c);
    });
  }), e.querySelectorAll('input[type="date"]').forEach((c) => {
    c.addEventListener("change", () => {
      const u = nt(e);
      u && Ut(() => {
        at(e, t, n, r, u);
      });
    });
  }), at(e, t, n, r, o);
}
function ds(e, t, n) {
  const a = dn("Analyse", `
    <div class="header-meta-row">
      <span>Vermögensverlauf &amp; Cashflows (Backdating)</span>
    </div>
  `), i = `
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
  `, o = `
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
    ${i}
    ${a.outerHTML}
    ${o}
    
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
    const c = e.querySelector("#analyse-range-card"), u = e.querySelector("#analyse-chart-card");
    c && us(c, u, t, n);
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
}, _s = /* @__PURE__ */ new Set([0, 2]), bs = /* @__PURE__ */ new Set([1, 3]), vs = "var(--pp-reader-chart-marker-buy, #2e7d32)", Ss = "var(--pp-reader-chart-marker-sell, #c0392b)", rr = "{TICKER}", Ps = "https://chatgpt.com/", Wt = {
  aggregation: "Aggregationsdaten",
  totals: "Kaufsummen",
  eur_total: "EUR-Kaufsumme"
}, xe = /* @__PURE__ */ new Map(), lt = /* @__PURE__ */ new Map(), Ze = /* @__PURE__ */ new Map(), Fe = /* @__PURE__ */ new Map(), ua = "pp-reader:portfolio-positions-updated", Be = /* @__PURE__ */ new Map();
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
function ws(e, t) {
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
function ir(e) {
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
function Ae(e) {
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
  if (ie(n) && ie(r)) {
    const l = n / r;
    if (ie(l))
      return l;
  }
  const a = Me(e.average_cost), i = M(a?.native) ?? M(a?.security), o = M(a?.account) ?? M(a?.eur);
  if (ie(i) && ie(o)) {
    const l = i / o;
    if (ie(l))
      return l;
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
  const n = Re(t instanceof Date ? t : /* @__PURE__ */ new Date()), r = ys[e], a = ir(n), i = {};
  if (a != null && (i.end_date = a), Number.isFinite(r) && r > 0) {
    const o = new Date(n.getTime());
    o.setUTCDate(o.getUTCDate() - (r - 1));
    const l = ir(o);
    l != null && (i.start_date = l);
  }
  return i;
}
function Pn(e) {
  if (!e)
    return null;
  if (e instanceof Date)
    return Number.isNaN(e.getTime()) ? null : new Date(e.getTime());
  if (typeof e == "number" && Number.isFinite(e)) {
    const t = Math.trunc(e);
    if (t >= 1e6 && t <= 99999999) {
      const n = Math.floor(t / 1e4), r = Math.floor(t % 1e4 / 100), a = t % 100, i = new Date(Date.UTC(n, r - 1, a));
      return Number.isNaN(i.getTime()) ? null : i;
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
        const i = new Date(Date.UTC(n, r, a));
        if (!Number.isNaN(i.getTime()))
          return i;
      }
    }
  }
  return null;
}
function $s(e) {
  const t = Pn(e);
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
      const i = M(t.close_raw);
      i != null && (r = i / 1e8);
    }
    return r == null ? null : {
      date: Pn(t.date) ?? t.date,
      close: r
    };
  }).filter((t) => !!t) : [];
}
function Pt(e, t, n = null) {
  if (!Array.isArray(e))
    return [];
  const r = [], a = Ae(t), i = a || "EUR", o = Ds(n);
  return e.forEach((l, s) => {
    const c = typeof l.type == "number" ? l.type : Number(l.type), u = _s.has(c), p = bs.has(c);
    if (!u && !p)
      return;
    const f = $s(l.date);
    let d = M(l.price);
    if (!f || d == null)
      return;
    const g = Ae(l.currency_code), m = a ?? g ?? i;
    g && a && g !== a && ie(o) && (d *= o);
    const _ = M(l.shares), h = M(l.net_price_eur), y = u ? "Kauf" : "Verkauf", b = _ != null ? `${Cn(_)} @ ` : "", S = `${y} ${b}${fe(d)} ${m}`, P = p && h != null ? `${S} (netto ${fe(h)} EUR)` : S, C = u ? vs : Ss, w = typeof l.uuid == "string" && l.uuid.trim() || `${y}-${f.getTime().toString()}-${s.toString()}`;
    r.push({
      id: w,
      x: f.getTime(),
      y: d,
      color: C,
      label: P,
      payload: {
        type: y,
        currency: m,
        transactionCurrency: g,
        shares: _,
        price: d,
        netPriceEur: h,
        date: f.toISOString(),
        portfolio: l.portfolio
      }
    });
  }), r;
}
function An(e) {
  const t = M(e?.last_price_native) ?? M(e?.last_price?.native) ?? null;
  if (k(t))
    return t;
  if (Ae(e?.currency_code) === "EUR") {
    const r = M(e?.last_price_eur);
    if (k(r))
      return r;
  }
  return null;
}
function Ts(e) {
  if (!e)
    return null;
  const n = e.last_price_fetched_at, r = St(n);
  if (r != null)
    return r;
  const i = e.last_price?.fetched_at;
  return St(i) ?? null;
}
function an(e, t) {
  let n = [];
  Array.isArray(e) && (n = e.map((c) => ({
    ...c
  })));
  const r = n.slice(), a = An(t);
  if (!k(a))
    return r;
  const i = Ts(t) ?? Date.now(), o = new Date(i);
  if (Number.isNaN(o.getTime()))
    return r;
  const l = nn(Re(o));
  let s = null;
  for (let c = r.length - 1; c >= 0; c -= 1) {
    const u = r[c], p = Pn(u.date);
    if (!p)
      continue;
    const f = nn(Re(p));
    if (s == null && (s = f), f === l)
      return u.close !== a && (r[c] = { ...u, close: a }), r;
    if (f < l)
      break;
  }
  return s != null && s > l || r.push({
    date: o,
    close: a
  }), r;
}
function k(e) {
  return typeof e == "number" && Number.isFinite(e);
}
function ie(e) {
  return typeof e == "number" && Number.isFinite(e) && e > 0;
}
function je(e, t, n) {
  if (!k(e) || !k(t))
    return !1;
  const r = Math.abs(e - t), a = Math.max(Math.abs(e), Math.abs(t), 1);
  return r <= a * 1e-4;
}
function ks(e, t) {
  return !k(t) || t === 0 || !k(e) ? null : bi((e - t) / t * 100);
}
function _a(e, t) {
  if (e.length === 0)
    return { priceChange: null, priceChangePct: null };
  const n = e[0], r = M(n.close);
  if (!k(r) || r === 0)
    return { priceChange: null, priceChangePct: null };
  const a = e[e.length - 1], i = M(a.close), o = M(t) ?? i;
  if (!k(o))
    return { priceChange: null, priceChangePct: null };
  const l = o - r, s = Object.is(l, -0) ? 0 : l, c = ks(o, r);
  return { priceChange: s, priceChangePct: c };
}
function wn(e, t) {
  if (!k(e) || e === 0)
    return "neutral";
  const n = 0.5 / Math.pow(10, t);
  return Math.abs(e) < n ? "neutral" : e > 0 ? "positive" : "negative";
}
function Rs(e, t) {
  if (!k(e))
    return '<span class="value neutral">—</span>';
  const n = fe(e);
  if (n === "—")
    return '<span class="value neutral">—</span>';
  const r = wn(e, bt.max), a = t ? `&nbsp;${t}` : "";
  return `<span class="value ${r}">${n}${a}</span>`;
}
function Ls(e) {
  return k(e) ? `<span class="value ${wn(e, 2)} value--percentage">${re(e)}&nbsp;%</span>` : '<span class="value neutral">—</span>';
}
function ba(e, t, n, r) {
  const a = e, i = a.length > 0 ? a : "Zeitraum";
  return `
    <div class="security-info-bar" data-range="${a}">
      <div class="security-info-item">
        <span class="label">Preisänderung (${i})</span>
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
  return `<span class="${wn(e, bt.max)}">${n}${r}</span>`;
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
function zs(e) {
  return `
    <div class="news-prompt-container">
      <button
        type="button"
        class="news-prompt-button"
        data-symbol="${Sa(e)}"
      >
        Copy prompt &amp; open ChatGPT
      </button>
    </div>
  `;
}
async function Vs(e) {
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
  const r = Me(e?.average_cost), a = r?.account ?? (k(t) ? t : M(t));
  if (!k(a))
    return null;
  const i = e?.account_currency_code ?? e?.account_currency;
  if (typeof i == "string" && i.trim())
    return i.trim().toUpperCase();
  const o = Ae(e?.currency_code) ?? "", l = r?.security ?? r?.native ?? (k(n) ? n : M(n)), s = hn(e?.aggregation);
  if (o && k(l) && je(a, l))
    return o;
  const c = M(s?.purchase_total_security) ?? M(e?.purchase_total_security), u = M(s?.purchase_total_account) ?? M(e?.purchase_total_account);
  let p = null;
  if (k(c) && c !== 0 && k(u) && (p = u / c), r?.source === "eur_total")
    return "EUR";
  const d = r?.eur;
  if (k(d) && je(a, d))
    return "EUR";
  const g = M(e?.purchase_value_eur);
  return k(g) ? "EUR" : p != null && je(p, 1) ? o || null : o === "EUR" ? "EUR" : o || "EUR";
}
function or(e) {
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
  for (const i of n) {
    const o = t?.[i], l = St(o);
    if (l != null)
      return l;
  }
  const r = [];
  t && "last_price_fetched_at" in t && r.push(t.last_price_fetched_at);
  const a = e?.last_price;
  a && typeof a == "object" && r.push(a.fetched_at), t && "last_price_date" in t && r.push(t.last_price_date);
  for (const i of r) {
    const o = St(i);
    if (o != null)
      return o;
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
  const n = Ae(e.currency_code) ?? "", r = Me(e.average_cost);
  if (!r || !n)
    return null;
  const a = r.native ?? r.security ?? null;
  let o = r.account ?? r.eur ?? null, l = Ae(t) ?? "";
  if (ie(r.eur) && (!l || l === n) && (o = r.eur, l = "EUR"), !n || !l || n === l || !ie(a) || !ie(o))
    return null;
  const s = o / a;
  if (!Number.isFinite(s) || s <= 0)
    return null;
  const c = or(s);
  if (!c)
    return null;
  let u = null;
  if (s > 0) {
    const y = 1 / s;
    Number.isFinite(y) && y > 0 && (u = or(y));
  }
  const p = Ws(e), f = Os(p), d = [`FX-Kurs (Kauf): 1 ${n} = ${c} ${l}`];
  u && d.push(`1 ${l} = ${u} ${n}`);
  const g = [], m = r.source, _ = m in Wt ? Wt[m] : Wt.aggregation;
  if (g.push(`Quelle: ${_}`), k(r.coverage_ratio)) {
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
  return k(n) ? n : null;
}
function js(e) {
  if (!e)
    return '<div class="meta-error">Keine Snapshot-Daten verfügbar.</div>';
  const t = e.currency_code || "EUR", n = e.total_holdings_precise ?? e.total_holdings, r = Cn(n), a = e.last_price_native ?? e.last_price?.native ?? e.last_price_eur, i = fe(a), o = i === "—" ? null : `${i}${`&nbsp;${t}`}`, l = M(e.market_value_eur) ?? M(e.current_value_eur) ?? null, s = Me(e.average_cost), c = s?.native ?? s?.security ?? null, u = s?.eur ?? null, f = s?.account ?? null ?? u, d = ve(e.performance), g = d?.day_change ?? null, m = g?.price_change_native ?? null, _ = g?.price_change_eur ?? null, h = k(m) ? m : _, y = k(m) ? t : "EUR", b = (T, z = "") => {
    const W = ["value"];
    return z && W.push(...z.split(" ").filter(Boolean)), `<span class="${W.join(" ")}">${T}</span>`;
  }, S = (T = "") => {
    const z = ["value--missing"];
    return T && z.push(T), b("—", z.join(" "));
  }, P = (T, z = "") => {
    if (!k(T))
      return S(z);
    const W = ["value--gain"];
    return z && W.push(z), b(Za(T), W.join(" "));
  }, C = (T, z = "") => {
    if (!k(T))
      return S(z);
    const W = ["value--gain-percentage"];
    return z && W.push(z), b(Ja(T), W.join(" "));
  }, w = o ? b(o, "value--price") : S("value--price"), N = r === "—" ? S("value--holdings") : b(r, "value--holdings"), D = k(l) ? b(`${re(l)}&nbsp;€`, "value--market-value") : S("value--market-value"), H = k(h) ? b(
    Hs(h, y),
    "value--gain value--absolute"
  ) : S("value--absolute"), A = C(
    g?.change_pct,
    "value--percentage"
  ), E = P(
    d?.total_change_eur,
    "value--absolute"
  ), I = C(
    d?.total_change_pct,
    "value--percentage"
  ), F = qs(
    e,
    f,
    c
  ), $ = Bs(
    e,
    F
  ), Y = $ ? ` title="${Sa($)}"` : "", v = [], x = k(u);
  k(c) ? v.push(
    b(
      `${fe(c)}${`&nbsp;${t}`}`,
      "value--average value--average-native"
    )
  ) : v.push(
    S("value--average value--average-native")
  );
  let R = null, j = null;
  return x && (t !== "EUR" || !k(c) || !je(u, c)) ? (R = u, j = "EUR") : k(f) && F && (F !== t || !je(f, c ?? NaN)) && (R = f, j = F), R != null && k(R) && v.push(
    b(
      `${fe(R)}${j ? `&nbsp;${j}` : ""}`,
      "value--average value--average-eur"
    )
  ), `
    <div class="security-meta-grid security-meta-grid--expanded">
      <div class="security-meta-item security-meta-item--price">
        <span class="label">Letzter Preis</span>
        <div class="value-group">${w}</div>
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
          ${A}
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
function Pa(e) {
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
  const i = e.clientWidth || e.offsetWidth || 0, o = i > 0 ? i : 640, l = Math.min(Math.max(Math.floor(o * 0.5), 240), 440), s = (n || "").toUpperCase() || "EUR", c = k(r) ? r : null, u = Math.max(48, Math.min(72, Math.round(o * 0.075))), p = Math.max(28, Math.min(56, Math.round(o * 0.05))), f = Math.max(40, Math.min(64, Math.round(l * 0.14)));
  return {
    width: o,
    height: l,
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
      const h = g.payload ?? {}, y = ma(h.type), b = M(h.shares), S = b != null ? Cn(b) : null, P = Ae(h.currency) ?? s, C = [];
      y && C.push(y), S && C.push(`${S} Stück`), m && C.push(`am ${m}`);
      const w = C.join(" ").trim() || (typeof g.label == "string" ? g.label : m), N = typeof _ == "string" && _.trim() ? _.trim() : fe(h.price), D = N ? `${N}${P ? `&nbsp;${P}` : ""}` : P;
      return `
      <div class="chart-tooltip-date">${w}</div>
      <div class="chart-tooltip-value">${D}</div>
    `;
    },
    baseline: c != null ? {
      value: c
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
    e.innerHTML = "", a = ia(e, r), a && cr.set(e, a);
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
  const i = e.querySelector(".security-info-bar");
  if (!i || !i.parentElement)
    return;
  const o = document.createElement("div");
  o.innerHTML = ba(t, n, r, a).trim();
  const l = o.firstElementChild;
  l && i.parentElement.replaceChild(l, i);
}
function ur(e, t, n, r, a = {}) {
  const i = e.querySelector(".security-detail-placeholder");
  if (i && (i.innerHTML = `
    <h2>Historie</h2>
    ${va(t, n)}
  `, n.status === "loaded" && Array.isArray(r) && r.length)) {
    const o = i.querySelector(".history-chart");
    o && requestAnimationFrame(() => {
      Gs(o, r, a);
    });
  }
}
function Zs(e) {
  const {
    root: t,
    hass: n,
    panelConfig: r,
    securityUuid: a,
    snapshot: i,
    initialRange: o,
    initialHistory: l,
    initialHistoryState: s
  } = e;
  setTimeout(() => {
    const c = t.querySelector(".security-range-selector");
    if (!c)
      return;
    const u = da(a), p = fa(a), f = sr(i);
    Array.isArray(l) && s.status !== "error" && u.set(o, l), Es(a), ar(a, o), lr(c, o);
    const g = an(
      l,
      i
    );
    let m = s;
    m.status !== "error" && (m = g.length ? { status: "loaded" } : { status: "empty" }), ur(
      t,
      o,
      m,
      g,
      {
        currency: i?.currency_code,
        baseline: f,
        markers: p.get(o) ?? []
      }
    );
    const _ = async (h) => {
      if (h === ha(a))
        return;
      const y = c.querySelector(
        `.security-range-button[data-range="${h}"]`
      );
      y && (y.disabled = !0, y.classList.add("loading"));
      let b = u.get(h) ?? null, S = p.get(h) ?? null, P = null, C = [];
      if (b)
        P = b.length ? { status: "loaded" } : { status: "empty" };
      else
        try {
          const E = vt(h), I = await ut(
            n,
            r,
            a,
            E
          );
          b = rn(I.prices), S = Pt(
            I.transactions,
            i?.currency_code,
            i
          ), u.set(h, b), S = Array.isArray(S) ? S : [], p.set(h, S), P = b.length ? { status: "loaded" } : { status: "empty" };
        } catch (E) {
          console.error("Range-Wechsel: Historie konnte nicht geladen werden", E), b = [], S = [], P = {
            status: "error",
            message: Pa(E) || "Die historischen Daten konnten aufgrund eines Fehlers nicht geladen werden."
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
          S = Pt(
            I.transactions,
            i?.currency_code,
            i
          ), S = Array.isArray(S) ? S : [], p.set(h, S);
        } catch (E) {
          console.error("Range-Wechsel: Transaktionsmarker konnten nicht geladen werden", E), S = [];
        }
      C = an(b, i), P.status !== "error" && (P = C.length ? { status: "loaded" } : { status: "empty" });
      const w = An(i), { priceChange: N, priceChangePct: D } = _a(
        C,
        w
      ), H = Array.isArray(S) ? S : [];
      ar(a, h), lr(c, h), Xs(
        t,
        h,
        N,
        D,
        i?.currency_code
      );
      const A = sr(i);
      ur(
        t,
        h,
        P,
        C,
        {
          currency: i?.currency_code,
          baseline: A,
          markers: H
        }
      );
    };
    c.addEventListener("click", (h) => {
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
  let i = null, o = !1;
  const l = async () => {
    try {
      i = await fi(n, r);
    } catch (s) {
      o = !0, console.warn("News-Prompt: Prefetch fehlgeschlagen", s);
    }
  };
  l(), setTimeout(() => {
    const s = t.querySelector(".news-prompt-button");
    if (!s)
      return;
    const c = (p) => {
      const f = (i?.placeholder || rr).trim() || rr, d = (i?.prompt_template || "").trim(), g = (i?.link || "").trim() || Ps;
      return { body: d ? d.includes(f) ? d.split(f).join(p) : `${d}

Ticker: ${p}` : `Ticker: ${p}`, link: g };
    }, u = async () => {
      const p = (s.dataset.symbol || a || "").trim();
      if (!p) {
        console.warn("News-Prompt: Kein Ticker verfügbar");
        return;
      }
      if (s.classList.contains("loading"))
        return;
      s.disabled = !0, s.classList.add("loading");
      const f = s.textContent;
      try {
        const { body: d, link: g } = c(p), m = await Vs(d);
        m ? s.textContent = "✅ Copied! Opening..." : console.warn("News-Prompt: Clipboard unavailable – prompt could not be copied"), m && await new Promise((_) => setTimeout(_, 800)), Us(g), !i && !o && l();
      } catch (d) {
        console.error("News-Prompt: Kopiervorgang fehlgeschlagen", d);
      } finally {
        s.classList.remove("loading"), s.disabled = !1, f && setTimeout(() => {
          s.textContent = f;
        }, 2e3);
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
  let i = null, o = null;
  try {
    const A = await di(
      t,
      n,
      r
    ), E = A.snapshot;
    i = E && typeof E == "object" ? E : A;
  } catch (A) {
    console.error("renderSecurityDetail: Snapshot konnte nicht geladen werden", A), o = ya(A);
  }
  const l = i || a, s = !!(a && !i), c = (l?.source ?? "") === "cache";
  r && ws(r, l ?? null);
  const u = l && (s || c) ? As({ fallbackUsed: s, flaggedAsCache: c }) : "", p = l?.name || "Wertpapierdetails", f = dn(p, "", { includeMeta: !1 });
  f.classList.add("security-detail-header");
  const d = Ks(l);
  if (o)
    return `
      ${f.outerHTML}
      ${d}
      ${u}
      <div class="card error-card">
        <h2>Fehler beim Laden</h2>
        <p>${o}</p>
      </div>
    `;
  const g = ha(r), m = da(r), _ = fa(r);
  let h = m.has(g) ? m.get(g) ?? null : null, y = { status: "empty" }, b = _.has(g) ? _.get(g) ?? null : null;
  if (Array.isArray(h))
    y = h.length ? { status: "loaded" } : { status: "empty" };
  else {
    h = [];
    try {
      const A = vt(g), E = await ut(
        t,
        n,
        r,
        A
      );
      h = rn(E.prices), b = Pt(
        E.transactions,
        l?.currency_code,
        l
      ), m.set(g, h), b = Array.isArray(b) ? b : [], _.set(g, b), y = h.length ? { status: "loaded" } : { status: "empty" };
    } catch (A) {
      console.error(
        "renderSecurityDetail: Historie konnte nicht geladen werden",
        A
      ), y = {
        status: "error",
        message: Pa(A) || "Die historischen Daten konnten aufgrund eines Fehlers nicht geladen werden."
      };
    }
  }
  if (!Array.isArray(b))
    try {
      const A = vt(g), E = await ut(
        t,
        n,
        r,
        A
      ), I = rn(E.prices);
      b = Pt(
        E.transactions,
        l?.currency_code,
        l
      ), m.set(g, I), b = Array.isArray(b) ? b : [], _.set(g, b), h = I, y = h.length ? { status: "loaded" } : { status: "empty" };
    } catch (A) {
      console.error(
        "renderSecurityDetail: Transaktionsmarker konnten nicht geladen werden",
        A
      ), b = [];
    }
  const S = an(
    h,
    l
  );
  y.status !== "error" && (y = S.length ? { status: "loaded" } : { status: "empty" });
  const P = Is(l, r), C = zs(P), w = An(l), { priceChange: N, priceChangePct: D } = _a(
    S,
    w
  ), H = ba(
    g,
    N,
    D,
    l?.currency_code
  );
  return Zs({
    root: e,
    hass: t,
    panelConfig: n,
    securityUuid: r,
    snapshot: l,
    initialRange: g,
    initialHistory: h,
    initialHistoryState: y
  }), Js({
    root: e,
    hass: t,
    panelConfig: n,
    tickerSymbol: P
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
    render: (r, a, i) => Qs(r, a, i, n),
    cleanup: () => {
      Fs(n);
    }
  }));
}
const tc = Xa, on = "pp-reader-sticky-anchor", At = "overview", nc = "analyse", sn = "security:", rc = [
  { key: At, title: "Dashboard", render: Kr },
  { key: nc, title: "Analyse", render: ds }
], Le = /* @__PURE__ */ new Map(), Je = [], wt = /* @__PURE__ */ new Map();
let cn = null, Ot = !1, De = null, q = 0, Bt = null;
function Ct(e) {
  return typeof e == "object" && e !== null;
}
function Aa(e) {
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
function ic(e) {
  return e === "accounts" || e === "last_file_update" || e === "portfolio_values" || e === "portfolio_positions";
}
function dr(e) {
  const t = e.portfolio_uuid;
  if (typeof t == "string" && t)
    return t;
  const n = e.portfolioUuid;
  return typeof n == "string" && n ? n : null;
}
function oc(e) {
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
function wa(e) {
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
  const a = le(), i = fr(e);
  if (i === q) {
    e > q && cc();
    return;
  }
  Ca();
  const o = q >= 0 && q < a.length ? a[q] : null, l = o ? Nn(o.key) : null;
  let s = i;
  if (l) {
    const c = i >= 0 && i < a.length ? a[i] : null;
    if (c && c.key === At && hc(l, { suppressRender: !0 })) {
      const f = le().findIndex((d) => d.key === At);
      s = f >= 0 ? f : 0;
    }
  }
  if (!Ot) {
    Ot = !0;
    try {
      q = fr(s);
      const c = q;
      await Fa(t, n, r), gc(c);
    } catch (c) {
      console.error("navigateToPage: Fehler beim Rendern des Tabs", c);
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
    const a = wt.get(n);
    a && a !== e && Na(a);
  }
  const r = {
    ...t,
    key: e
  };
  Le.set(e, r), n && wt.set(n, e), Je.includes(e) || Je.push(e);
}
function Na(e) {
  if (!e)
    return;
  const t = Le.get(e);
  if (t && typeof t.cleanup == "function")
    try {
      const a = t.cleanup({ key: e });
      Aa(a) && a.catch((i) => {
        console.error(
          "unregisterDetailTab: Fehler beim asynchronen cleanup",
          i
        );
      });
    } catch (a) {
      console.error("unregisterDetailTab: Fehler beim Ausführen von cleanup", a);
    }
  Le.delete(e);
  const n = Je.indexOf(e);
  n >= 0 && Je.splice(n, 1);
  const r = Nn(e);
  r && wt.get(r) === e && wt.delete(r);
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
  for (const t of hi())
    if (t.isConnected)
      return t;
  const e = /* @__PURE__ */ new Set();
  for (const t of mi())
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
      const i = cn(e);
      i && typeof i.render == "function" ? (dc(t, i), n = pr(t)) : console.error("openSecurityDetail: Factory lieferte ungültigen Descriptor", i);
    } catch (i) {
      console.error("openSecurityDetail: Fehler beim Erzeugen des Tab-Descriptors", i);
    }
  if (!n)
    return console.warn(`openSecurityDetail: Kein Detail-Tab für ${e} verfügbar`), !1;
  Ca();
  let a = le().findIndex((i) => i.key === t);
  return a === -1 && (a = le().findIndex((o) => o.key === t), a === -1) ? (console.error("openSecurityDetail: Tab nach Registrierung nicht auffindbar"), !1) : (q = a, De = null, ln(), !0);
}
function hc(e, t = {}) {
  if (!e)
    return console.error("closeSecurityDetail: Ungültige securityUuid", e), !1;
  const { suppressRender: n = !1 } = t, r = Ea(e);
  if (!fc(r))
    return !1;
  const i = le().findIndex((s) => s.key === r), o = i === q;
  Na(r);
  const l = le();
  if (!l.length)
    return q = 0, n || ln(), !0;
  if (De = e, o) {
    const s = l.findIndex((c) => c.key === At);
    s >= 0 ? q = s : q = Math.min(Math.max(i - 1, 0), l.length - 1);
  } else q >= l.length && (q = Math.max(0, l.length - 1));
  return n || ln(), !0;
}
async function Fa(e, t, n) {
  let r = n;
  r || (r = wa(t ? t.panels : null));
  const a = le();
  q >= a.length && (q = Math.max(0, a.length - 1));
  const i = lc(q);
  if (!i) {
    console.error("renderTab: Kein gültiger Tab oder keine render-Methode gefunden!");
    return;
  }
  let o;
  try {
    o = await i.render(e, t, r);
  } catch (u) {
    console.error("renderTab: Fehler beim Rendern des Tabs:", u), e.innerHTML = `<div class="card"><h2>Fehler</h2><pre>${ac(u)}</pre></div>`;
    return;
  }
  e.innerHTML = o ?? "", i.render === Kr && vn(e);
  const s = await new Promise((u) => {
    const p = window.setInterval(() => {
      const f = e.querySelector(".header-card");
      f && (clearInterval(p), u(f));
    }, 50);
  });
  let c = e.querySelector(`#${on}`);
  if (!c) {
    c = document.createElement("div"), c.id = on;
    const u = s.parentNode;
    u && "insertBefore" in u && u.insertBefore(c, s);
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
  const a = r.querySelector("#nav-left"), i = r.querySelector("#nav-right");
  if (!a || !i) {
    console.error("Navigationspfeile nicht gefunden!");
    return;
  }
  a.addEventListener("click", () => {
    Nt(-1, e, t, n);
  }), i.addEventListener("click", () => {
    Nt(1, e, t, n);
  }), bc(r);
}
function bc(e) {
  const t = e.querySelector("#nav-left"), n = e.querySelector("#nav-right");
  if (t && (q === 0 ? (t.disabled = !0, t.classList.add("disabled")) : (t.disabled = !1, t.classList.remove("disabled"))), n) {
    const r = le(), i = !(q === r.length - 1) || !!De;
    n.disabled = !i, n.classList.toggle("disabled", !i);
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
    this._panel || (this._panel = wa(this._hass.panels ?? null));
    const t = Tn(this._hass, this._panel);
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
      n.map(async (i) => {
        try {
          const o = await t.subscribeEvents(
            this._handleBusEvent.bind(this),
            i
          );
          typeof o == "function" ? (r.push(o), console.debug("PPReaderDashboard: subscribed to", i)) : console.error(
            "PPReaderDashboard: subscribeEvents lieferte kein Unsubscribe-Func für",
            i,
            o
          );
        } catch (o) {
          console.error("PPReaderDashboard: Fehler bei subscribeEvents für", i, o);
        }
      })
    ).then(() => {
      this._unsubscribeEvents = () => {
        r.forEach((i) => {
          try {
            i();
          } catch {
          }
        }), console.debug("PPReaderDashboard: alle Event-Subscriptions entfernt");
      };
    }).catch((i) => {
      console.error("PPReaderDashboard: Fehler beim Registrieren der Events", i);
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
    const n = Tn(this._hass, this._panel);
    if (!n)
      return;
    const r = t.data;
    if (!ic(r.data_type) || r.entry_id && r.entry_id !== n)
      return;
    const a = sc(r.data_type, r.data);
    a && (this._queueUpdate(a.type, a.data), this._doRender(a.type, a.data));
  }
  _doRender(t, n) {
    switch (t) {
      case "accounts":
        io(
          n,
          this._root
        );
        break;
      case "last_file_update":
        ho(
          n,
          this._root
        );
        break;
      case "portfolio_values":
        co(
          n,
          this._root
        );
        break;
      case "portfolio_positions":
        fo(
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
    t === "portfolio_positions" && (a.portfolioUuid = oc(
      r
    ));
    let i = -1;
    t === "portfolio_positions" && a.portfolioUuid ? i = this._pendingUpdates.findIndex(
      (o) => o.type === t && o.portfolioUuid === a.portfolioUuid
    ) : i = this._pendingUpdates.findIndex((o) => o.type === t), i >= 0 ? this._pendingUpdates[i] = a : this._pendingUpdates.push(a), this._hasNewData = !0;
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
    if (Aa(n)) {
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
  fo as handlePortfolioPositionsUpdate,
  fc as hasDetailTab,
  xa as openSecurityDetail,
  Cc as reapplyPositionsSort,
  Sc as registerDashboardElement,
  dc as registerDetailTab,
  Ac as registerPanelHost,
  pc as setSecurityDetailTabFactory,
  Pc as unregisterDashboardElement,
  Na as unregisterDetailTab,
  wc as unregisterPanelHost,
  jr as updatePortfolioFooterFromDom
};
<<<<<<<< HEAD:custom_components/pp_reader/www/pp_reader_dashboard/js/dashboard.zlhjJD-c.js
//# sourceMappingURL=dashboard.zlhjJD-c.js.map
========
//# sourceMappingURL=dashboard.DJ9qDQ89.js.map
>>>>>>>> 79c310a5 (feat: Implement FIFO accounting for holdings, introduce neutral movements, and update dashboard components.):custom_components/pp_reader/www/pp_reader_dashboard/js/dashboard.DJ9qDQ89.js
