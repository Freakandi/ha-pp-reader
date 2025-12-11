function kn(e, t) {
  try {
    t();
  } catch (n) {
    console.warn(`addSwipeEvents: ${e} handler threw`, n);
  }
}
function Za(e, t, n) {
  let r = null;
  const a = (l) => {
    l < -50 ? kn("left", t) : l > 50 && kn("right", n);
  }, i = (l) => {
    l.touches.length === 1 && (r = l.touches[0].clientX);
  }, o = (l) => {
    if (r === null)
      return;
    if (l.changedTouches.length === 0) {
      r = null;
      return;
    }
    const u = l.changedTouches[0];
    a(u.clientX - r), r = null;
  }, s = (l) => {
    r = l.clientX;
  }, c = (l) => {
    r !== null && (a(l.clientX - r), r = null);
  };
  e.addEventListener("touchstart", i, { passive: !0 }), e.addEventListener("touchend", o, { passive: !0 }), e.addEventListener("mousedown", s), e.addEventListener("mouseup", c);
}
const dn = (e, t) => {
  if (!Number.isFinite(e) || e === 0)
    return "neutral";
  const n = 0.5 / Math.pow(10, t);
  return Math.abs(e) < n ? "neutral" : e > 0 ? "positive" : "negative";
};
function D(e, t, n = void 0, r = void 0) {
  let a = null;
  const i = (c) => {
    if (typeof c == "number")
      return c;
    if (typeof c == "string" && c.trim() !== "") {
      const l = c.replace(/\s+/g, "").replace(/[^0-9,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."), u = Number.parseFloat(l);
      return Number.isNaN(u) ? Number.NaN : u;
    }
    return Number.NaN;
  }, o = (c, l = 2, u = 2) => {
    const d = typeof c == "number" ? c : i(c);
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
    const c = n?.fx_unavailable === !0 ? "Wechselkurs nicht verfügbar – EUR-Wert unbekannt" : "";
    if (t == null || r?.hasValue === !1)
      return s(c);
    const l = typeof t == "number" ? t : i(t);
    if (!Number.isFinite(l))
      return s(c);
    const u = e.endsWith("pct") ? "%" : "€";
    return a = o(l) + `&nbsp;${u}`, `<span class="${dn(l, 2)}">${a}</span>`;
  } else if (e === "position_count") {
    const c = typeof t == "number" ? t : i(t);
    if (!Number.isFinite(c))
      return s();
    a = c.toLocaleString("de-DE");
  } else if (["balance", "current_value", "purchase_value"].includes(e)) {
    const c = typeof t == "number" ? t : i(t);
    if (!Number.isFinite(c))
      return n?.fx_unavailable ? s("Wechselkurs nicht verfügbar – EUR-Wert unbekannt") : (r && r.hasValue === !1, s());
    a = o(c) + "&nbsp;€";
  } else if (e === "current_holdings") {
    const c = typeof t == "number" ? t : i(t);
    if (!Number.isFinite(c))
      return s();
    const l = Math.abs(c % 1) > 0;
    a = c.toLocaleString("de-DE", {
      minimumFractionDigits: l ? 2 : 0,
      maximumFractionDigits: 4
    });
  } else {
    let c = "";
    typeof t == "string" ? c = t : typeof t == "number" && Number.isFinite(t) ? c = t.toString() : typeof t == "boolean" ? c = t ? "true" : "false" : t instanceof Date && Number.isFinite(t.getTime()) && (c = t.toISOString()), a = c, a && (/<|&lt;|&gt;/.test(a) || (a.length > 60 && (a = a.slice(0, 59) + "…"), a.startsWith("Kontostand ") ? a = a.substring(11) : a.startsWith("Depotwert ") && (a = a.substring(10))));
  }
  return typeof a != "string" || a === "" ? s() : a;
}
function je(e, t, n = [], r = {}) {
  const { sortable: a = !1, defaultSort: i } = r, o = i?.key ?? "", s = i?.dir === "desc" ? "desc" : "asc", c = (h) => {
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
      const _ = y.align === "right" ? ' class="align-right"' : "";
      l += `<td${_}>${D(y.key, h[y.key], h)}</td>`;
    }), l += "</tr>";
  });
  const u = {}, d = {};
  t.forEach((h) => {
    if (n.includes(h.key)) {
      const y = e.reduce(
        (_, S) => {
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
                const E = h.key === "day_change_pct" ? A.change_pct : A.value_change_eur ?? A.price_change_eur;
                typeof E == "number" && (w = E);
              }
            }
          }
          if (typeof w == "number" && Number.isFinite(w)) {
            const C = w;
            _.total += C, _.hasValue = !0;
          }
          return _;
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
  let m = "", b = "neutral";
  if (g != null && (m = `${re(g)} %`, g > 0 ? b = "positive" : g < 0 && (b = "negative")), l += '<tr class="footer-row">', t.forEach((h, y) => {
    const _ = h.align === "right" ? ' class="align-right"' : "";
    if (y === 0) {
      l += `<td${_}>Summe</td>`;
      return;
    }
    if (u[h.key] != null) {
      let w = "";
      h.key === "gain_abs" && m && (w = ` data-gain-pct="${c(m)}" data-gain-sign="${c(b)}"`), l += `<td${_}${w}>${D(h.key, u[h.key], void 0, d[h.key])}</td>`;
      return;
    }
    if (h.key === "gain_pct" && u.gain_pct != null) {
      l += `<td${_}>${D("gain_pct", u.gain_pct, void 0, d[h.key])}</td>`;
      return;
    }
    const S = d[h.key] ?? { hasValue: !1 };
    l += `<td${_}>${D(h.key, null, void 0, S)}</td>`;
  }), l += "</tr>", l += "</tbody></table>", a)
    try {
      const h = document.createElement("template");
      h.innerHTML = l.trim();
      const y = h.content.querySelector("table");
      if (y)
        return y.classList.add("sortable-table"), o && (y.dataset.defaultSort = o, y.dataset.defaultDir = s), y.outerHTML;
    } catch (h) {
      console.warn("makeTable(sortable): Injection fehlgeschlagen:", h);
    }
  return l;
}
function fn(e, t, n = {}) {
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
function Ja(e) {
  const t = Number.isNaN(e) ? 0 : e;
  return `<span class="${dn(t, 2)}">${re(t)}&nbsp;€</span>`;
}
function Qa(e) {
  const t = Number.isNaN(e) ? 0 : e;
  return `<span class="${dn(t, 2)}">${re(t)}&nbsp;%</span>`;
}
function mr(e, t, n = "asc", r = !1) {
  if (!e)
    return [];
  const a = e.querySelector("tbody");
  if (!a)
    return [];
  const i = a.querySelector("tr.footer-row"), o = Array.from(a.querySelectorAll("tr")).filter((u) => u !== i);
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
    return o;
  const c = (u) => {
    const d = u.replace(/\u00A0/g, " ").replace(/[%€]/g, "").replace(/\./g, "").replace(/,/g, ".").replace(/[^\d.-]/g, "").trim();
    if (!d) return NaN;
    const p = parseFloat(d);
    return Number.isFinite(p) ? p : NaN;
  };
  o.sort((u, d) => {
    const p = u.cells.item(s), f = d.cells.item(s), g = (p?.textContent ?? "").trim(), m = (f?.textContent ?? "").trim(), b = c(g), h = c(m);
    let y;
    const _ = /[0-9]/.test(g) || /[0-9]/.test(m);
    return !Number.isNaN(b) && !Number.isNaN(h) && _ ? y = b - h : y = g.localeCompare(m, "de", { sensitivity: "base" }), n === "asc" ? y : -y;
  }), o.forEach((u) => a.appendChild(u)), i && a.appendChild(i), e.querySelectorAll("thead th.sort-active").forEach((u) => {
    u.classList.remove("sort-active", "dir-asc", "dir-desc");
  });
  const l = e.querySelector(`thead th[data-sort-key="${t}"]`);
  return l && l.classList.add("sort-active", n === "asc" ? "dir-asc" : "dir-desc"), o;
}
function he(e) {
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
function Tn(e) {
  const t = z(e);
  if (t == null)
    return null;
  const n = Math.trunc(t);
  return Number.isFinite(n) ? n : null;
}
function ot(e) {
  return he(e) ? { ...e } : null;
}
function yr(e) {
  return he(e) ? { ...e } : null;
}
function _r(e) {
  return typeof e == "boolean" ? e : void 0;
}
function ei(e) {
  if (!he(e))
    return null;
  const t = O(e.name), n = O(e.currency_code), r = z(e.orig_balance);
  if (!t || !n || r == null)
    return null;
  const a = e.balance === null ? null : z(e.balance), i = {
    uuid: O(e.uuid) ?? void 0,
    name: t,
    currency_code: n,
    orig_balance: r,
    balance: a ?? null
  }, o = z(e.fx_rate);
  o != null && (i.fx_rate = o);
  const s = O(e.fx_rate_source);
  s && (i.fx_rate_source = s);
  const c = O(e.fx_rate_timestamp);
  c && (i.fx_rate_timestamp = c);
  const l = z(e.coverage_ratio);
  l != null && (i.coverage_ratio = l);
  const u = O(e.provenance);
  u && (i.provenance = u);
  const d = et(e.metric_run_uuid);
  d !== null && (i.metric_run_uuid = d);
  const p = _r(e.fx_unavailable);
  return typeof p == "boolean" && (i.fx_unavailable = p), i;
}
function br(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = ei(n);
    r && t.push(r);
  }
  return t;
}
function ti(e) {
  if (!he(e))
    return null;
  const t = e.aggregation, n = O(e.security_uuid), r = O(e.name), a = z(e.current_holdings), i = z(e.purchase_value_eur) ?? (he(t) ? z(t.purchase_value_eur) ?? z(t.purchase_total_account) ?? z(t.account_currency_total) : null) ?? z(e.purchase_value), o = z(e.current_value);
  if (!n || !r || a == null || i == null || o == null)
    return null;
  const s = {
    portfolio_uuid: O(e.portfolio_uuid) ?? void 0,
    security_uuid: n,
    name: r,
    ticker_symbol: O(e.ticker_symbol),
    currency_code: O(e.currency_code),
    current_holdings: a,
    purchase_value: i,
    current_value: o,
    average_cost: ot(e.average_cost),
    performance: ot(e.performance),
    aggregation: ot(e.aggregation),
    data_state: yr(e.data_state)
  }, c = z(e.coverage_ratio);
  c != null && (s.coverage_ratio = c);
  const l = O(e.provenance);
  l && (s.provenance = l);
  const u = et(e.metric_run_uuid);
  u !== null && (s.metric_run_uuid = u);
  const d = z(e.last_price_native);
  d != null && (s.last_price_native = d);
  const p = z(e.last_price_eur);
  p != null && (s.last_price_eur = p);
  const f = z(e.last_close_native);
  f != null && (s.last_close_native = f);
  const g = z(e.last_close_eur);
  return g != null && (s.last_close_eur = g), s;
}
function vr(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = ti(n);
    r && t.push(r);
  }
  return t;
}
function Sr(e) {
  if (!he(e))
    return null;
  const t = O(e.name), n = z(e.current_value ?? e.value);
  if (!t || n == null)
    return null;
  const a = z(
    e.purchase_sum ?? e.purchase_value_eur ?? e.purchase_value ?? e.purchaseSum
  ) ?? 0, i = {
    uuid: O(e.uuid) ?? void 0,
    name: t,
    current_value: n,
    purchase_value: a,
    purchase_sum: a,
    day_change_abs: z(e.day_change_abs) ?? z(e.day_change_eur) ?? void 0,
    day_change_pct: z(e.day_change_pct) ?? void 0,
    position_count: Tn(e.position_count ?? e.count) ?? void 0,
    missing_value_positions: Tn(e.missing_value_positions) ?? void 0,
    has_current_value: _r(e.has_current_value),
    performance: ot(e.performance),
    coverage_ratio: z(e.coverage_ratio) ?? void 0,
    provenance: O(e.provenance) ?? void 0,
    metric_run_uuid: et(e.metric_run_uuid) ?? void 0,
    data_state: yr(e.data_state)
  };
  return Array.isArray(e.positions) && (i.positions = vr(e.positions)), i;
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
  if (!he(e))
    return null;
  const t = { ...e }, n = et(e.metric_run_uuid);
  n !== null ? t.metric_run_uuid = n : delete t.metric_run_uuid;
  const r = z(e.coverage_ratio);
  r != null ? t.coverage_ratio = r : delete t.coverage_ratio;
  const a = O(e.provenance);
  a ? t.provenance = a : delete t.provenance;
  const i = O(e.generated_at ?? e.snapshot_generated_at);
  return i ? t.generated_at = i : delete t.generated_at, t;
}
function ni(e) {
  if (!he(e))
    return null;
  const t = { ...e }, n = Pr(e.normalized_payload);
  return n ? t.normalized_payload = n : "normalized_payload" in t && delete t.normalized_payload, t;
}
function Ar(e) {
  if (!he(e))
    return null;
  const t = O(e.generated_at);
  if (!t)
    return null;
  const n = et(e.metric_run_uuid), r = br(e.accounts), a = wr(e.portfolios), i = ni(e.diagnostics), o = {
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
function ri(e) {
  if (typeof e == "string")
    return e;
  if (e === null)
    return null;
}
function ai(e) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
}
function Rn(e, t) {
  if (typeof e == "string")
    return e;
  throw new Error(`mapPositionSnapshotToRecord: fehlendes ${t}`);
}
function kt(e, t) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  throw new Error(`mapPositionSnapshotToRecord: fehlendes ${t}`);
}
function ii(e) {
  const t = Rn(e.security_uuid, "security_uuid"), n = Rn(e.name, "name"), r = kt(e.current_holdings, "current_holdings"), a = kt(e.purchase_value, "purchase_value"), i = kt(e.current_value, "current_value"), o = {
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
function me(e, t) {
  let n = t?.config?.entry_id ?? t?.entry_id ?? t?.config?._panel_custom?.config?.entry_id ?? void 0;
  if (!n && e?.panels) {
    const r = e.panels, a = r.ppreader ?? r.pp_reader ?? Object.values(r).find(
      (i) => i?.webcomponent_name === "pp-reader-panel"
    );
    n = a?.config?.entry_id ?? a?.entry_id ?? a?.config?._panel_custom?.config?.entry_id ?? void 0;
  }
  return n ?? void 0;
}
function Ln(e, t) {
  return me(e, t);
}
async function oi(e, t) {
  if (!e)
    throw new Error("fetchAccountsWS: fehlendes hass");
  const n = me(e, t);
  if (!n)
    throw new Error("fetchAccountsWS: fehlendes entry_id");
  const r = await e.connection.sendMessagePromise({
    type: "pp_reader/get_accounts",
    entry_id: n
  }), a = br(r.accounts), i = Ar(r.normalized_payload);
  return {
    accounts: a,
    normalized_payload: i
  };
}
async function si(e, t) {
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
  const a = r.last_file_update;
  return typeof a == "string" ? a : "";
}
async function ci(e, t) {
  if (!e)
    throw new Error("fetchPortfoliosWS: fehlendes hass");
  const n = me(e, t);
  if (!n)
    throw new Error("fetchPortfoliosWS: fehlendes entry_id");
  const r = await e.connection.sendMessagePromise({
    type: "pp_reader/get_portfolio_data",
    entry_id: n
  }), a = wr(r.portfolios), i = Ar(r.normalized_payload);
  return {
    portfolios: a,
    normalized_payload: i
  };
}
function li(e, t, n) {
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
  }, i = te(e.scope_name);
  return i && (a.scope_name = i), a;
}
function ui(e) {
  if (!e || typeof e != "object")
    return;
  const t = e, n = Array.isArray(t.accounts) ? t.accounts : [], r = Array.isArray(t.portfolios) ? t.portfolios : [], a = n.map((o) => o && typeof o == "object" ? Hn(o) : null).filter((o) => !!o), i = r.map((o) => o && typeof o == "object" ? Hn(o) : null).filter((o) => !!o);
  if (!(a.length === 0 && i.length === 0))
    return { accounts: a, portfolios: i };
}
async function di(e, t, n) {
  if (!e)
    throw new Error("fetchDailyWealthWS: fehlendes hass");
  const r = me(e, t);
  if (!r)
    throw new Error("fetchDailyWealthWS: fehlendes entry_id");
  const { date: a, range: i, includeSlices: o, includeScopes: s, scopes: c, limit: l, offset: u } = n, d = te(a), p = i && typeof i == "object" ? {
    start: te(i.start) ?? "",
    end: te(i.end) ?? ""
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
  o !== void 0 && (f.include_slices = o), s !== void 0 && (f.include_scopes = s), (Array.isArray(c?.accounts) || Array.isArray(c?.portfolios)) && (f.scopes = {}, Array.isArray(c.accounts) && (f.scopes.accounts = c.accounts.filter((_) => typeof _ == "string" && _.length > 0)), Array.isArray(c.portfolios) && (f.scopes.portfolios = c.portfolios.filter(
    (_) => typeof _ == "string" && _.length > 0
  ))), typeof l == "number" && Number.isFinite(l) && l > 0 && (f.limit = l), typeof u == "number" && Number.isFinite(u) && u >= 0 && (f.offset = u);
  const g = await e.connection.sendMessagePromise(f), m = li(g.range, d, p), h = (Array.isArray(g.records) ? g.records : []).map((_) => _ && typeof _ == "object" ? Cr(_) : null).filter((_) => !!_), y = ui(g.slices);
  return {
    range: m,
    records: h,
    ...y ? { slices: y } : {}
  };
}
async function Nr(e, t, n) {
  if (!e)
    throw new Error("fetchPortfolioPositionsWS: fehlendes hass");
  const r = me(e, t);
  if (!r)
    throw new Error("fetchPortfolioPositionsWS: fehlendes entry_id");
  if (!n)
    throw new Error("fetchPortfolioPositionsWS: fehlendes portfolio_uuid");
  const a = await e.connection.sendMessagePromise({
    type: "pp_reader/get_portfolio_positions",
    entry_id: r,
    portfolio_uuid: n
  }), o = vr(a.positions).map(ii), s = Pr(a.normalized_payload), c = {
    portfolio_uuid: te(a.portfolio_uuid) ?? n,
    positions: o
  };
  typeof a.error == "string" && (c.error = a.error);
  const l = ai(a.coverage_ratio);
  l !== void 0 && (c.coverage_ratio = l);
  const u = te(a.provenance);
  u && (c.provenance = u);
  const d = ri(a.metric_run_uuid);
  return d !== void 0 && (c.metric_run_uuid = d), s && (c.normalized_payload = s), c;
}
async function fi(e, t, n) {
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
async function pi(e, t) {
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
async function dt(e, t, n, r = {}) {
  if (!e)
    throw new Error("fetchSecurityHistoryWS: fehlendes hass");
  const a = me(e, t);
  if (!a)
    throw new Error("fetchSecurityHistoryWS: fehlendes entry_id");
  if (!n)
    throw new Error("fetchSecurityHistoryWS: fehlendes securityUuid");
  const i = {
    type: "pp_reader/get_security_history",
    entry_id: a,
    security_uuid: n
  }, { startDate: o, endDate: s, start_date: c, end_date: l } = r || {}, u = o ?? c;
  u != null && (i.start_date = u);
  const d = s ?? l;
  d != null && (i.end_date = d);
  const p = await e.connection.sendMessagePromise(i);
  return Array.isArray(p.prices) || (p.prices = []), Array.isArray(p.transactions) || (p.transactions = []), p;
}
const pn = /* @__PURE__ */ new Set(), gn = /* @__PURE__ */ new Set(), Er = {}, gi = [
  "renderPositionsTable",
  "applyGainPctMetadata",
  "attachSecurityDetailListener",
  "attachPortfolioPositionsSorting",
  "updatePortfolioFooter"
];
function hi(e, t) {
  typeof t == "function" && (Er[e] = t);
}
function wc(e) {
  e && pn.add(e);
}
function Pc(e) {
  e && pn.delete(e);
}
function mi() {
  return pn;
}
function Ac(e) {
  e && gn.add(e);
}
function Cc(e) {
  e && gn.delete(e);
}
function yi() {
  return gn;
}
function _i(e) {
  for (const t of gi)
    hi(t, e[t]);
}
function hn() {
  return Er;
}
const bi = 2;
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
    const a = r.lastIndexOf(","), i = r.lastIndexOf(".");
    let o = r;
    const s = a !== -1, c = i !== -1;
    if (s && (!c || a > i))
      if (c)
        o = o.replace(/\./g, "").replace(",", ".");
      else {
        const d = o.split(","), p = d[d.length - 1]?.length ?? 0, f = d.slice(0, -1).join(""), g = f.replace(/[+-]/g, "").length, m = d.length > 2, b = /^[-+]?0$/.test(f);
        o = m || p === 0 || p === 3 && g > 0 && g <= 3 && !b ? o.replace(/,/g, "") : o.replace(",", ".");
      }
    else c && s && i > a ? o = o.replace(/,/g, "") : c && o.length - i - 1 === 3 && /\d{4,}/.test(o.replace(/\./g, "")) && (o = o.replace(/\./g, ""));
    if (o === "-" || o === "+")
      return null;
    const l = Number.parseFloat(o);
    if (Number.isFinite(l))
      return l;
    const u = Number.parseFloat(r.replace(",", "."));
    if (Number.isFinite(u))
      return u;
  }
  return null;
}
function Et(e, { decimals: t = bi, fallback: n = null } = {}) {
  const r = fe(e);
  if (r == null)
    return n ?? null;
  const a = 10 ** t, i = Math.round(r * a) / a;
  return Object.is(i, -0) ? 0 : i;
}
function In(e, t = {}) {
  return Et(e, t);
}
function vi(e, t = {}) {
  return Et(e, t);
}
const Si = /^[+-]?(?:\d+\.?\d*|\d*\.?\d+)(?:[eE][+-]?\d+)?$/, se = (e) => {
  if (typeof e == "number")
    return Number.isFinite(e) ? e : null;
  if (typeof e == "string") {
    const t = e.trim();
    if (!t || !Si.test(t))
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
function wi(e) {
  const t = e && typeof e == "object" ? e : null;
  if (!t)
    return null;
  const n = se(t.price_change_native), r = se(t.price_change_eur), a = se(t.change_pct), i = se(t.value_change_eur);
  if (n == null && r == null && a == null && i == null)
    return null;
  const o = xr(t.source) ?? "derived", s = se(t.coverage_ratio) ?? null;
  return {
    price_change_native: n,
    price_change_eur: r,
    change_pct: a,
    value_change_eur: i ?? null,
    source: o,
    coverage_ratio: s
  };
}
function Ae(e) {
  const t = e && typeof e == "object" ? e : null;
  if (!t)
    return null;
  const n = se(t.gain_abs), r = se(t.gain_pct), a = se(t.total_change_eur), i = se(t.total_change_pct);
  if (n == null || r == null || a == null || i == null)
    return null;
  const o = xr(t.source) ?? "derived", s = se(t.coverage_ratio) ?? null, c = wi(t.day_change);
  return {
    gain_abs: n,
    gain_pct: r,
    total_change_eur: a,
    total_change_pct: i,
    source: o,
    coverage_ratio: s,
    day_change: c
  };
}
const be = /* @__PURE__ */ new Map();
function ye(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t.length > 0 ? t : null;
}
function U(e) {
  if (e === null)
    return null;
  const t = fe(e);
  return Number.isFinite(t ?? NaN) ? t : null;
}
function Pi(e) {
  if (!e || typeof e != "object")
    return !1;
  const t = e;
  return typeof t.security_uuid == "string" && typeof t.name == "string" && typeof t.current_holdings == "number" && typeof t.purchase_value == "number" && typeof t.current_value == "number";
}
function ke(e) {
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
function Ci(e, t) {
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
  ], a = (c, l, u) => {
    const d = l[u];
    d !== void 0 && (c[u] = d);
  };
  r.forEach((c) => {
    a(n, t, c);
  });
  const i = (c) => {
    const l = t[c];
    if (l && typeof l == "object") {
      const u = e && e[c] && typeof e[c] == "object" ? e[c] : {};
      n[c] = {
        ...u,
        ...l
      };
    } else l !== void 0 && (n[c] = l);
  }, o = t.performance, s = e && e.performance && typeof e.performance == "object" ? e.performance : void 0;
  return o !== void 0 && (n.performance = Ai(s, o, [
    "gain_pct",
    "total_change_pct"
  ])), i("aggregation"), i("average_cost"), i("data_state"), n;
}
function ft(e, t) {
  if (!e)
    return [];
  if (!Array.isArray(t))
    return be.delete(e), [];
  if (t.length === 0)
    return be.set(e, []), [];
  const n = be.get(e) ?? [], r = new Map(
    n.filter((i) => i.security_uuid).map((i) => [i.security_uuid, i])
  ), a = t.filter((i) => !!i).map((i) => {
    const o = i.security_uuid ?? "", s = o ? r.get(o) : void 0;
    return Ci(s, i);
  }).map(ke);
  return be.set(e, a), a.map(ke);
}
function xt(e) {
  return e ? be.has(e) : !1;
}
function Fr(e) {
  if (!e)
    return [];
  const t = be.get(e);
  return t ? t.map(ke) : [];
}
function Ni() {
  be.clear();
}
function Ei() {
  return new Map(
    Array.from(be.entries(), ([e, t]) => [
      e,
      t.map(ke)
    ])
  );
}
function Le(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e, n = U(t.native), r = U(t.security), a = U(t.account), i = U(t.eur), o = U(t.coverage_ratio);
  if (n == null && r == null && a == null && i == null && o == null)
    return null;
  const s = ye(t.source);
  return {
    native: n,
    security: r,
    account: a,
    eur: i,
    source: s === "totals" || s === "eur_total" ? s : "aggregation",
    coverage_ratio: o
  };
}
function mn(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e, n = U(t.total_holdings), r = U(t.positive_holdings), a = U(t.purchase_value_eur), i = U(t.purchase_total_security) ?? U(t.security_currency_total), o = U(t.purchase_total_account) ?? U(t.account_currency_total);
  let s = 0;
  if (typeof t.purchase_value_cents == "number")
    s = Number.isFinite(t.purchase_value_cents) ? Math.trunc(t.purchase_value_cents) : 0;
  else if (typeof t.purchase_value_cents == "string") {
    const l = Number.parseInt(t.purchase_value_cents, 10);
    Number.isFinite(l) && (s = l);
  }
  return n != null || r != null || a != null || i != null || o != null || s !== 0 ? {
    total_holdings: n ?? 0,
    positive_holdings: r ?? 0,
    purchase_value_cents: s,
    purchase_value_eur: a ?? 0,
    security_currency_total: i ?? 0,
    account_currency_total: o ?? 0,
    purchase_total_security: i ?? 0,
    purchase_total_account: o ?? 0
  } : null;
}
function xi(e) {
  if (!e || typeof e != "object")
    return null;
  const t = Pi(e) ? ke(e) : e, n = ye(t.security_uuid), r = ye(t.name), a = fe(t.current_holdings), i = In(t.current_value), o = mn(t.aggregation), s = t.aggregation && typeof t.aggregation == "object" ? t.aggregation : null, c = U(t.purchase_value_eur) ?? U(s?.purchase_value_eur) ?? U(s?.purchase_total_account) ?? U(s?.account_currency_total) ?? In(t.purchase_value);
  if (!n || !r || a == null || c == null || i == null)
    return null;
  const l = {
    security_uuid: n,
    name: r,
    portfolio_uuid: ye(t.portfolio_uuid) ?? ye(t.portfolioUuid) ?? void 0,
    currency_code: ye(t.currency_code),
    current_holdings: a,
    purchase_value: c,
    current_value: i
  }, u = Le(t.average_cost);
  u && (l.average_cost = u), o && (l.aggregation = o);
  const d = Ae(t.performance);
  if (d)
    l.performance = d, l.gain_abs = typeof d.gain_abs == "number" ? d.gain_abs : null, l.gain_pct = typeof d.gain_pct == "number" ? d.gain_pct : null;
  else {
    const _ = U(t.gain_abs), S = U(t.gain_pct);
    _ !== null && (l.gain_abs = _), S !== null && (l.gain_pct = S);
  }
  "coverage_ratio" in t && (l.coverage_ratio = U(t.coverage_ratio));
  const p = ye(t.provenance);
  p && (l.provenance = p);
  const f = ye(t.metric_run_uuid);
  (f || t.metric_run_uuid === null) && (l.metric_run_uuid = f ?? null);
  const g = U(t.last_price_native);
  g !== null && (l.last_price_native = g);
  const m = U(t.last_price_eur);
  m !== null && (l.last_price_eur = m);
  const b = U(t.last_close_native);
  b !== null && (l.last_close_native = b);
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
    const r = xi(n);
    r && t.push(r);
  }
  return t;
}
let Dr = [];
const ve = /* @__PURE__ */ new Map();
function st(e) {
  return typeof e == "string" && e.length > 0 ? e : void 0;
}
function Fi(e) {
  return e === null ? null : st(e);
}
function Di(e) {
  return typeof e == "number" && Number.isFinite(e) ? e : void 0;
}
function we(e) {
  return e === null ? null : Di(e);
}
function Vn(e) {
  if (!(typeof e != "number" || !Number.isFinite(e)))
    return Math.trunc(e);
}
function ce(e) {
  if (!(!e || typeof e != "object"))
    return { ...e };
}
function Ye(e) {
  const t = { ...e };
  return t.average_cost = ce(e.average_cost), t.performance = ce(e.performance), t.aggregation = ce(e.aggregation), t.data_state = ce(e.data_state), t;
}
function yn(e) {
  const t = { ...e };
  return t.performance = ce(e.performance), t.data_state = ce(e.data_state), Array.isArray(e.positions) && (t.positions = e.positions.map(Ye)), t;
}
function $r(e) {
  if (!e || typeof e != "object")
    return null;
  const t = st(e.uuid);
  if (!t)
    return null;
  const n = { uuid: t }, r = st(e.name);
  r && (n.name = r);
  const a = we(e.current_value);
  a !== void 0 && (n.current_value = a);
  const i = we(e.purchase_sum) ?? we(e.purchase_value_eur) ?? we(e.purchase_value);
  i !== void 0 && (n.purchase_value = i, n.purchase_sum = i);
  const o = we(e.day_change_abs);
  o !== void 0 && (n.day_change_abs = o);
  const s = we(e.day_change_pct);
  s !== void 0 && (n.day_change_pct = s);
  const c = Vn(e.position_count);
  c !== void 0 && (n.position_count = c);
  const l = Vn(e.missing_value_positions);
  l !== void 0 && (n.missing_value_positions = l), typeof e.has_current_value == "boolean" && (n.has_current_value = e.has_current_value);
  const u = we(e.coverage_ratio);
  u !== void 0 && (n.coverage_ratio = u);
  const d = st(e.provenance);
  d && (n.provenance = d), "metric_run_uuid" in e && (n.metric_run_uuid = Fi(e.metric_run_uuid));
  const p = ce(e.performance);
  p && (n.performance = p);
  const f = ce(e.data_state);
  if (f && (n.data_state = f), Array.isArray(e.positions)) {
    const g = e.positions.filter(
      (m) => !!m
    );
    g.length && (n.positions = g.map(Ye));
  }
  return n;
}
function $i(e, t) {
  const n = {
    ...e,
    ...t
  };
  return !t.performance && e.performance && (n.performance = ce(e.performance)), !t.data_state && e.data_state && (n.data_state = ce(e.data_state)), !t.positions && e.positions && (n.positions = e.positions.map(Ye)), n;
}
function kr(e) {
  Dr = (e ?? []).map((n) => ({ ...n }));
}
function ki() {
  return Dr.map((e) => ({ ...e }));
}
function Ti(e) {
  ve.clear();
  const t = e ?? [];
  for (const n of t) {
    const r = $r(n);
    r && ve.set(r.uuid, yn(r));
  }
}
function Ri(e) {
  const t = e ?? [];
  for (const n of t) {
    const r = $r(n);
    if (!r)
      continue;
    const a = ve.get(r.uuid), i = a ? $i(a, r) : yn(r);
    ve.set(i.uuid, i);
  }
}
function pt(e, t) {
  if (!e)
    return;
  const n = ve.get(e);
  if (!n)
    return;
  if (!Array.isArray(t) || t.length === 0) {
    const c = { ...n };
    delete c.positions, ve.set(e, c);
    return;
  }
  const r = (c, l) => {
    const u = c ? Ye(c) : {}, d = u;
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
      const b = l[g], h = c && c[g] && typeof c[g] == "object" ? c[g] : void 0;
      if (!b || typeof b != "object") {
        b !== void 0 && (d[g] = b);
        return;
      }
      const y = {
        ...h ?? {},
        ...b
      };
      m.forEach((_) => {
        const S = h?.[_];
        S != null && (y[_] = S);
      }), d[g] = y;
    };
    return f("performance", ["gain_pct", "total_change_pct"]), f("aggregation"), f("average_cost"), f("data_state"), u;
  }, a = Array.isArray(n.positions) ? n.positions : [], i = new Map(
    a.filter((c) => c.security_uuid).map((c) => [c.security_uuid, c])
  ), o = t.filter((c) => !!c).map((c) => {
    const l = c.security_uuid ? i.get(c.security_uuid) : void 0;
    return r(l, c);
  }).map(Ye), s = {
    ...n,
    positions: o
  };
  ve.set(e, s);
}
function Li() {
  return Array.from(ve.values(), (e) => yn(e));
}
function Tr() {
  return {
    accounts: ki(),
    portfolios: Li()
  };
}
const Mi = "unknown-account";
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
function Rr(e, t) {
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
  const t = Hi(e);
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
function Hi(e) {
  const t = ee(e);
  if (!t)
    return null;
  const n = Ii(t);
  return n || Mr(t);
}
function Ii(e) {
  const t = e.trim();
  if (!t.startsWith("{") && !t.startsWith("["))
    return null;
  try {
    const n = JSON.parse(t), r = Vi(n), a = n && typeof n == "object" ? ee(
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
function Vi(e) {
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
  const t = ee(e.uuid) ?? `${Mi}-${e.name ?? "0"}`, n = Rr(e.name, "Unbenanntes Konto"), r = ee(e.currency_code), a = X(e.balance), i = X(e.orig_balance), o = "coverage_ratio" in e ? Lr(X(e.coverage_ratio)) : null, s = ee(e.provenance), c = ee(e.metric_run_uuid), l = e.fx_unavailable === !0, u = X(e.fx_rate), d = ee(e.fx_rate_source), p = ee(e.fx_rate_timestamp), f = [], g = Hr(s);
  g && f.push(g);
  const m = {
    uuid: t,
    name: n,
    currency_code: r,
    balance: a,
    orig_balance: i,
    fx_unavailable: l,
    coverage_ratio: o,
    provenance: s,
    metric_run_uuid: null,
    fx_rate: u,
    fx_rate_source: d,
    fx_rate_timestamp: p,
    badges: f
  }, b = typeof c == "string" ? c : null;
  return m.metric_run_uuid = b, m;
}
function Ui(e) {
  if (!e)
    return null;
  const t = ee(e.uuid);
  if (!t)
    return null;
  const n = Rr(e.name, "Unbenanntes Depot"), r = zn(e.position_count), a = zn(e.missing_value_positions), i = X(e.current_value), o = X(e.purchase_sum) ?? X(e.purchase_value_eur) ?? X(e.purchase_value) ?? 0, s = X(e.day_change_abs) ?? null, c = X(e.day_change_pct) ?? null, l = Ae(e.performance), u = l?.gain_abs ?? null, d = l?.gain_pct ?? null, p = l?.day_change ?? null;
  let f = s ?? (p?.value_change_eur != null ? X(p.value_change_eur) : null), g = c ?? (p?.change_pct != null ? X(p.change_pct) : null);
  if (f == null && g != null && i != null) {
    const E = i / (1 + g / 100);
    E && (f = i - E);
  }
  if (g == null && f != null && i != null) {
    const E = i - f;
    E && (g = f / E * 100);
  }
  const m = i != null, b = e.has_current_value === !1 || !m, h = "coverage_ratio" in e ? Lr(X(e.coverage_ratio)) : null, y = ee(e.provenance), _ = ee(e.metric_run_uuid), S = [], w = Hr(y);
  w && S.push(w);
  const C = {
    uuid: t,
    name: n,
    position_count: r,
    current_value: i,
    purchase_sum: o,
    day_change_abs: f ?? null,
    day_change_pct: g ?? null,
    gain_abs: u,
    gain_pct: d,
    hasValue: m,
    fx_unavailable: b || a > 0,
    missing_value_positions: a,
    performance: l,
    coverage_ratio: h,
    provenance: y,
    metric_run_uuid: null,
    badges: S
  }, A = typeof _ == "string" ? _ : null;
  return C.metric_run_uuid = A, C;
}
function Ir() {
  const { accounts: e } = Tr();
  return e.map(zi).filter((t) => !!t);
}
function qi() {
  const { portfolios: e } = Tr();
  return e.map(Ui).filter((t) => !!t);
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
function Vr(e, t = {}) {
  if (!e || e.length === 0)
    return "";
  const n = ["meta-badges", t.containerClass].filter(Boolean).join(" "), r = e.map((a) => {
    const i = `meta-badge--${a.tone}`, o = a.description ? ` title="${pe(a.description)}"` : "";
    return `<span class="meta-badge ${i}"${o}>${pe(
      a.label
    )}</span>`;
  }).join("");
  return `<span class="${n}">${r}</span>`;
}
function gt(e, t, n = {}) {
  const r = Vr(t, n);
  if (!r)
    return pe(e);
  const a = n.labelClass ?? "name-with-badges__label";
  return `<span class="${["name-with-badges", n.containerClass].filter(Boolean).join(" ")}"><span class="${a}">${pe(
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
function Wi(e) {
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
function Ne(e) {
  return typeof e == "number" && Number.isFinite(e) ? e : void 0;
}
function Oi(e) {
  return e === null ? null : Ne(e);
}
function Bi(e) {
  return e === null ? null : Me(e);
}
function Un(e) {
  return (e ?? []).filter(
    (t) => !t.key.endsWith("-coverage") && !t.key.startsWith("provenance-")
  );
}
function qn(e) {
  return Ae(e.performance);
}
const Ki = 500, ji = 10, Yi = "pp-reader:portfolio-positions-updated", Gi = "pp-reader:diagnostics", Tt = /* @__PURE__ */ new Map(), Ur = [
  "coverage_ratio",
  "provenance",
  "metric_run_uuid",
  "generated_at"
], jt = /* @__PURE__ */ new Map();
function Xi(e, t) {
  return `${e}:${t}`;
}
function Zi(e) {
  if (e === void 0)
    return;
  if (e === null)
    return null;
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  const t = Oi(e);
  if (t === null)
    return null;
  if (typeof t == "number" && Number.isFinite(t))
    return t;
}
function Rt(e) {
  if (e !== void 0)
    return Bi(e);
}
function _n(e, t, n, r) {
  const a = {}, i = Zi(e);
  i !== void 0 && (a.coverage_ratio = i);
  const o = Rt(t);
  o !== void 0 && (a.provenance = o);
  const s = Rt(n);
  s !== void 0 && (a.metric_run_uuid = s);
  const c = Rt(r);
  return c !== void 0 && (a.generated_at = c), Object.keys(a).length > 0 ? a : null;
}
function Ji(e, t) {
  const n = {};
  let r = !1;
  for (const a of Ur) {
    const i = e?.[a], o = t[a];
    i !== o && (zr(n, a, i, o), r = !0);
  }
  return r ? n : null;
}
function Qi(e) {
  const t = {};
  let n = !1;
  for (const r of Ur) {
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
        window.dispatchEvent(new CustomEvent(Gi, { detail: e }));
      } catch (t) {
        console.warn("updateConfigsWS: Diagnostics-Event konnte nicht gesendet werden", t);
      }
  }
}
function bn(e, t, n, r) {
  const a = Xi(e, n), i = Tt.get(a);
  if (!r) {
    if (!i)
      return;
    Tt.delete(a);
    const s = Qi(i);
    if (!s)
      return;
    Wn({
      kind: e,
      uuid: n,
      source: t,
      changed: s,
      snapshot: {},
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    return;
  }
  const o = Ji(i, r);
  o && (Tt.set(a, { ...r }), Wn({
    kind: e,
    uuid: n,
    source: t,
    changed: o,
    snapshot: { ...r },
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  }));
}
function eo(e) {
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
function to(e) {
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
function no(e, t) {
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
function ro(e, t) {
  return `<div class="error">${Wi(e)} <button class="retry-pos" data-portfolio="${t}">Erneut laden</button></div>`;
}
function ao(e, t, n) {
  const r = e.querySelector("table.sortable-positions");
  if (!r) return;
  const a = e.dataset.sortKey || r.dataset.defaultSort || "name", o = (e.dataset.sortDir || r.dataset.defaultDir || "asc") === "desc" ? "desc" : "asc";
  e.dataset.sortKey = a, e.dataset.sortDir = o;
  try {
    mr(r, a, o, !0);
  } catch (l) {
    console.warn("restoreSortAndInit: sortTableRows Fehler:", l);
  }
  const { attachPortfolioPositionsSorting: s, attachSecurityDetailListener: c } = hn();
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
function qr(e, t, n, r) {
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
    return i.innerHTML = ro(r, t), { applied: !0 };
  const o = i.dataset.sortKey, s = i.dataset.sortDir;
  return i.innerHTML = go(n), o && (i.dataset.sortKey = o), s && (i.dataset.sortDir = s), ao(i, e, t), { applied: !0 };
}
function vn(e, t) {
  const n = le.get(t);
  if (!n) return !1;
  const r = qr(
    e,
    t,
    n.positions,
    n.error
  );
  return r.applied && le.delete(t), r.applied;
}
function io(e) {
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
    r || n.attempts >= ji ? (Oe.delete(t), r || le.delete(t)) : Wr(e, t);
  }, Ki), Oe.set(t, n));
}
function oo(e, t) {
  console.log("updateConfigsWS: Kontodaten-Update erhalten:", e);
  const n = Array.isArray(e) ? e : [];
  if (kr(n), eo(n), !t)
    return;
  const r = Ir();
  so(r, t);
  const a = t.querySelector(".portfolio-table table"), i = a ? Array.from(
    a.querySelectorAll("tbody tr.portfolio-row")
  ).map((o) => {
    const s = o.dataset.currentValue, c = s ? Number.parseFloat(s) : Number.NaN;
    if (Number.isFinite(c))
      return {
        current_value: c
      };
    const l = o.cells.item(3), u = ct(l?.textContent);
    return {
      current_value: Number.isFinite(u) ? u : 0
    };
  }) : [];
  Or(r, i, t);
}
function so(e, t) {
  const n = t.querySelector(".account-table"), r = t.querySelector(".fx-account-table"), a = e.filter((o) => (o.currency_code || "EUR") === "EUR"), i = e.filter((o) => (o.currency_code || "EUR") !== "EUR");
  if (n) {
    const o = a.map((s) => ({
      name: gt(s.name, Un(s.badges), {
        containerClass: "account-name",
        labelClass: "account-name__label"
      }),
      balance: s.balance ?? null
    }));
    n.innerHTML = je(
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
    const o = i.map((s) => {
      const c = s.orig_balance, l = typeof c == "number" && Number.isFinite(c), u = Me(s.currency_code), d = l ? c.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) : null, p = d ? u ? `${d} ${u}` : d : "";
      return {
        name: gt(s.name, Un(s.badges), {
          containerClass: "account-name",
          labelClass: "account-name__label"
        }),
        fx_display: p,
        balance: s.balance ?? null
      };
    });
    r.innerHTML = je(
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
function co(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = Sr(n);
    r && t.push(r);
  }
  return t;
}
function lo(e, t) {
  if (!Array.isArray(e)) {
    console.warn("handlePortfolioUpdate: Update ist kein Array:", e);
    return;
  }
  try {
    console.debug("handlePortfolioUpdate: payload=", e);
  } catch {
  }
  const n = co(e);
  if (n.length && Ri(n), to(n), !t)
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
  const i = (d) => {
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
  }, o = /* @__PURE__ */ new Map();
  a.querySelectorAll("tr.portfolio-row").forEach((d) => {
    const p = d.dataset.portfolio;
    p && o.set(p, d);
  });
  let c = 0;
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
    const f = o.get(d);
    if (!f)
      continue;
    f.cells.length < 8 && console.warn("handlePortfolioUpdate: Unerwartetes Spaltenlayout", f.cells.length);
    const g = f.cells.item(1), m = f.cells.item(2), b = f.cells.item(3), h = f.cells.item(4), y = f.cells.item(5), _ = f.cells.item(6), S = f.cells.item(7);
    if (!g || !m || !b)
      continue;
    const w = typeof p.position_count == "number" && Number.isFinite(p.position_count) ? p.position_count : 0, C = typeof p.current_value == "number" && Number.isFinite(p.current_value) ? p.current_value : null, A = Ae(p.performance), E = typeof A?.gain_abs == "number" ? A.gain_abs : null, $ = typeof A?.gain_pct == "number" ? A.gain_pct : null, M = typeof p.purchase_sum == "number" && Number.isFinite(p.purchase_sum) ? p.purchase_sum : typeof p.purchase_value == "number" && Number.isFinite(p.purchase_value) ? p.purchase_value : null, P = A?.day_change ?? null, N = Ne(p.day_change_abs) ?? Ne(P?.value_change_eur) ?? Ne(P?.price_change_eur), H = Ne(p.day_change_pct) ?? Ne(P?.change_pct);
    let F = N ?? null, k = H ?? null;
    if (F == null && k != null && C != null) {
      const j = C / (1 + k / 100);
      j && (F = C - j);
    }
    if (k == null && F != null && C != null) {
      const j = C - F;
      j && (k = F / j * 100);
    }
    const Y = typeof p.missing_value_positions == "number" && Number.isFinite(p.missing_value_positions) ? p.missing_value_positions : 0, v = C !== null, x = p.has_current_value === !1 || Y > 0 || !v, L = ct(b.textContent);
    ct(g.textContent) !== w && (g.textContent = l(w));
    const T = {
      fx_unavailable: x,
      current_value: C,
      performance: A
    }, V = { hasValue: v }, W = D("purchase_value", M, T, V);
    m.innerHTML !== W && (m.innerHTML = W);
    const B = D("current_value", T.current_value, T, V), G = typeof C == "number" ? C : 0;
    if ((Math.abs(L - G) >= 5e-3 || b.innerHTML !== B) && (b.innerHTML = B, f.classList.add("flash-update"), setTimeout(() => {
      f.classList.remove("flash-update");
    }, 800)), h && (h.innerHTML = D("day_change_abs", F, T, V)), y && (y.innerHTML = D("day_change_pct", k, T, V)), _) {
      const j = D("gain_abs", E, T, V);
      _.innerHTML = j;
      const Se = typeof $ == "number" && Number.isFinite($) ? $ : null;
      _.dataset.gainPct = Se != null ? `${i(Se)} %` : "—", _.dataset.gainSign = Se != null ? Se > 0 ? "positive" : Se < 0 ? "negative" : "neutral" : "neutral";
    }
    S && (S.innerHTML = D("gain_pct", $, T, V)), f.dataset.positionCount = w.toString(), f.dataset.purchaseSum = M != null ? M.toString() : "", f.dataset.currentValue = v ? G.toString() : "", f.dataset.dayChange = v && F != null ? F.toString() : "", f.dataset.dayChangePct = v && k != null ? k.toString() : "", f.dataset.gainAbs = E != null ? E.toString() : "", f.dataset.gainPct = $ != null ? $.toString() : "", f.dataset.hasValue = v ? "true" : "false", f.dataset.fxUnavailable = x ? "true" : "false", f.dataset.coverageRatio = typeof p.coverage_ratio == "number" && Number.isFinite(p.coverage_ratio) ? p.coverage_ratio.toString() : "", f.dataset.provenance = typeof p.provenance == "string" ? p.provenance : "", f.dataset.metricRunUuid = typeof p.metric_run_uuid == "string" ? p.metric_run_uuid : "", c += 1;
  }
  if (c === 0)
    console.debug("handlePortfolioUpdate: Keine passenden Zeilen gefunden / keine Änderungen.");
  else {
    const d = c.toLocaleString("de-DE");
    console.debug(`handlePortfolioUpdate: ${d} Zeile(n) gepatcht.`);
  }
  try {
    ho(r);
  } catch (d) {
    console.warn("handlePortfolioUpdate: Fehler bei Summen-Neuberechnung:", d);
  }
  try {
    const d = (...h) => {
      for (const y of h) {
        if (!y) continue;
        const _ = t.querySelector(y);
        if (_) return _;
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
      const _ = h.querySelectorAll("tbody tr.account-row");
      return (_.length ? Array.from(_) : Array.from(h.querySelectorAll("tbody tr:not(.footer-row)"))).map((w) => {
        const C = y ? w.cells.item(2) : w.cells.item(1);
        return { balance: ct(C?.textContent) };
      });
    }, m = [
      ...g(p, !1),
      ...g(f, !0)
    ], b = Array.from(
      r.querySelectorAll("tbody tr.portfolio-row")
    ).map((h) => {
      const y = h.dataset.currentValue, _ = h.dataset.purchaseSum, S = y ? Number.parseFloat(y) : Number.NaN, w = _ ? Number.parseFloat(_) : Number.NaN;
      return {
        current_value: Number.isFinite(S) ? S : 0,
        purchase_sum: Number.isFinite(w) ? w : 0
      };
    });
    Or(m, b, t);
  } catch (d) {
    console.warn("handlePortfolioUpdate: Fehler bei Total-Neuberechnung:", d);
  }
}
function uo(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e.portfolio_uuid;
  if (typeof t == "string" && t)
    return t;
  const n = e.portfolioUuid;
  return typeof n == "string" && n ? n : null;
}
function Yt(e) {
  jt.delete(e);
}
function On(e) {
  return typeof e != "number" || !Number.isInteger(e) || e <= 0 ? null : e;
}
function fo(e, t, n, r) {
  if (!n || n <= 1 || !t)
    return Yt(e), r;
  const a = n, i = jt.get(e) ?? { expected: a, chunks: /* @__PURE__ */ new Map() };
  if (i.expected !== a && (i.chunks.clear(), i.expected = a), i.chunks.set(t, r), jt.set(e, i), i.chunks.size < a)
    return null;
  const o = [];
  for (let s = 1; s <= a; s += 1) {
    const c = i.chunks.get(s);
    c && Array.isArray(c) && o.push(...c);
  }
  return Yt(e), o;
}
function Bn(e, t) {
  const n = uo(e);
  if (!n)
    return console.warn("handlePortfolioPositionsUpdate: Ungültiges Update:", e), !1;
  const r = e?.error, a = On(e?.chunk_index), i = On(e?.chunk_count), o = Ft(e?.positions ?? []);
  r && Yt(n);
  const s = r ? o : fo(n, a, i, o);
  if (!r && s === null)
    return !0;
  const c = r ? o : s ?? [];
  no(n, e);
  const l = xt(n);
  let u = c;
  if (!r && l) {
    const p = ft(n, c);
    pt(n, p), u = p;
  }
  const d = qr(t, n, u, r);
  if (d.applied) {
    if (le.delete(n), !r && !l) {
      const p = ft(n, u);
      pt(n, p);
    }
  } else
    r || d.reason !== "hidden" || l ? (le.set(n, { positions: u, error: r }), Wr(t, n)) : (le.delete(n), Oe.delete(n));
  if (!r && o.length > 0) {
    const p = Array.from(
      new Set(
        o.map((f) => f.security_uuid).filter((f) => typeof f == "string" && f.length > 0)
      )
    );
    if (p.length && typeof window < "u")
      try {
        window.dispatchEvent(
          new CustomEvent(
            Yi,
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
function po(e, t) {
  if (Array.isArray(e)) {
    let n = !1;
    for (const r of e)
      Bn(r, t) && (n = !0);
    !n && e.length && console.warn("handlePortfolioPositionsUpdate: Kein gültiges Element im Array:", e);
    return;
  }
  Bn(e, t);
}
function go(e) {
  const { renderPositionsTable: t, applyGainPctMetadata: n } = hn();
  try {
    if (typeof t == "function")
      return t(e);
  } catch {
  }
  if (e.length === 0)
    return '<div class="no-positions">Keine Positionen vorhanden.</div>';
  const r = e.map((i) => {
    const o = qn(i);
    return {
      name: i.name,
      current_holdings: i.current_holdings,
      purchase_value: i.purchase_value,
      current_value: i.current_value,
      performance: o
    };
  }), a = je(
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
      const s = o.querySelectorAll("thead th"), c = ["name", "current_holdings", "purchase_value", "current_value", "gain_abs", "gain_pct"];
      s.forEach((d, p) => {
        const f = c[p];
        f && (d.setAttribute("data-sort-key", f), d.classList.add("sortable-col"));
      }), o.querySelectorAll("tbody tr").forEach((d, p) => {
        if (d.classList.contains("footer-row"))
          return;
        const f = e[p];
        f.security_uuid && (d.dataset.security = f.security_uuid), d.classList.add("position-row");
      }), o.dataset.defaultSort = "name", o.dataset.defaultDir = "asc";
      const u = n;
      if (u)
        try {
          u(o);
        } catch (d) {
          console.warn("renderPositionsTableInline: applyGainPctMetadata failed", d);
        }
      else
        o.querySelectorAll("tbody tr").forEach((p, f) => {
          if (p.classList.contains("footer-row"))
            return;
          const g = p.cells.item(4);
          if (!g)
            return;
          const m = e[f], b = qn(m), h = typeof b?.gain_pct == "number" && Number.isFinite(b.gain_pct) ? b.gain_pct : null, y = h != null ? `${h.toLocaleString("de-DE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })} %` : "—", _ = h == null ? "neutral" : h > 0 ? "positive" : h < 0 ? "negative" : "neutral";
          g.dataset.gainPct = y, g.dataset.gainSign = _;
        });
      return o.outerHTML;
    }
  } catch (i) {
    console.warn("renderPositionsTableInline: Sortier-Metadaten Injection fehlgeschlagen:", i);
  }
  return a;
}
function ho(e) {
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
      const _ = r(y.dataset.positionCount);
      if (_ != null && (h.sumPositions += _), y.dataset.fxUnavailable === "true" && (h.fxUnavailable = !0), y.dataset.hasValue !== "true")
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
  ), i = a.valueRows > 0 && a.incompleteRows === 0, o = i && a.sumPurchase > 0 ? a.sumGainAbs / a.sumPurchase * 100 : null;
  let s = e.querySelector("tr.footer-row");
  s || (s = document.createElement("tr"), s.className = "footer-row", e.querySelector("tbody")?.appendChild(s));
  const c = Math.round(a.sumPositions).toLocaleString("de-DE"), l = {
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
  }, u = { hasValue: i }, d = D("current_value", l.current_value, l, u), p = i ? a.sumGainAbs : null, f = i ? o : null, g = D("gain_abs", p, l, u), m = D("gain_pct", f, l, u);
  s.innerHTML = `
    <td>Summe</td>
    <td class="align-right">${c}</td>
    <td class="align-right">${d}</td>
    <td class="align-right">${g}</td>
    <td class="align-right">${m}</td>
  `;
  const b = s.cells.item(3);
  b && (b.dataset.gainPct = i && typeof o == "number" ? `${Gt(o)} %` : "—", b.dataset.gainSign = i && typeof o == "number" ? o > 0 ? "positive" : o < 0 ? "negative" : "neutral" : "neutral"), s.dataset.positionCount = Math.round(a.sumPositions).toString(), s.dataset.currentValue = i ? a.sumCurrent.toString() : "", s.dataset.purchaseSum = i ? a.sumPurchase.toString() : "", s.dataset.gainAbs = i ? a.sumGainAbs.toString() : "", s.dataset.gainPct = i && typeof o == "number" ? o.toString() : "", s.dataset.hasValue = i ? "true" : "false", s.dataset.fxUnavailable = a.fxUnavailable || !i ? "true" : "false";
}
function Kn(e) {
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
  const r = n ?? document, i = (Array.isArray(e) ? e : []).reduce((d, p) => {
    const f = p.balance ?? p.current_value ?? p.value, g = Kn(f);
    return d + g;
  }, 0), s = (Array.isArray(t) ? t : []).reduce((d, p) => {
    const f = p.current_value ?? p.value, g = Kn(f);
    return d + g;
  }, 0), c = i + s, l = r.querySelector("#headerMeta");
  if (!l) {
    console.warn("updateTotalWealth: #headerMeta nicht gefunden.");
    return;
  }
  const u = l.querySelector("strong") || l.querySelector(".total-wealth-value");
  u ? u.textContent = `${Gt(c)} €` : l.textContent = `💰 Gesamtvermögen: ${Gt(c)} €`, l.dataset.totalWealthEur = c.toString();
}
function mo(e, t) {
  const n = typeof e == "string" ? e : e?.last_file_update, r = Me(n) ?? "";
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
  getPortfolioPositionsCacheSnapshot: Ei,
  clearPortfolioPositionsCache: Ni,
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
const yo = [
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
  return yo.includes(e);
}
function Mt(e) {
  return e === "asc" || e === "desc";
}
function Br(e) {
  return (e ?? []).filter((t) => !t.key.endsWith("-coverage"));
}
function jn(e) {
  return Br(e).filter(
    (t) => !t.key.startsWith("provenance-")
  );
}
let ht = null, mt = null;
const Yn = { min: 2, max: 6 };
function Ve(e) {
  return fe(e);
}
function _o(e) {
  return typeof e == "number" && Number.isFinite(e);
}
function bo(e) {
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
    const a = bo(e[r]);
    if (a)
      return a;
  }
  return n;
}
function Xn(e, t) {
  return _o(e) ? `${e.toLocaleString("de-DE", {
    minimumFractionDigits: Yn.min,
    maximumFractionDigits: Yn.max
  })}${t ? ` ${t}` : ""}` : null;
}
function vo(e) {
  const t = e, n = e.average_cost ?? null, r = e.aggregation ?? null, a = Gn(t, [
    "security_currency_code",
    "security_currency",
    "native_currency_code",
    "native_currency"
  ], e.currency_code ?? null), i = Gn(
    t,
    [
      "account_currency_code",
      "account_currency",
      "purchase_currency_code",
      "currency_code"
    ],
    a === "EUR" ? "EUR" : null
  ) ?? "EUR", o = Ve(n?.native), s = Ve(n?.security), c = Ve(n?.account), l = Ve(n?.eur), u = s ?? o, d = l ?? (i === "EUR" ? c : null), p = a ?? i, f = p === "EUR";
  let g, m;
  f ? (g = "EUR", m = d ?? u ?? c ?? null) : u != null ? (g = p, m = u) : c != null ? (g = i, m = c) : (g = "EUR", m = d ?? null);
  const b = Xn(m, g), h = f ? null : Xn(d, "EUR"), y = !!h && h !== b, _ = [], S = [];
  b ? (_.push(
    `<span class="purchase-price purchase-price--primary">${b}</span>`
  ), S.push(b.replace(/\u00A0/g, " "))) : (_.push('<span class="missing-value" role="note" aria-label="Kein Kaufpreis verfügbar" title="Kein Kaufpreis verfügbar">—</span>'), S.push("Kein Kaufpreis verfügbar")), y && h && (_.push(
    `<span class="purchase-price purchase-price--secondary">${h}</span>`
  ), S.push(h.replace(/\u00A0/g, " ")));
  const w = _.join("<br>"), C = Ve(r?.purchase_value_eur) ?? 0, A = S.join(", ");
  return { markup: w, sortValue: C, ariaLabel: A };
}
function So(e) {
  const t = fe(e.current_holdings);
  if (t == null)
    return { value: null, pct: null };
  const n = fe(e.last_price_eur), r = fe(e.last_close_eur);
  let a = null, i = null;
  if (n != null && r != null) {
    a = (n - r) * t;
    const d = r * t;
    d && (i = a / d * 100);
  }
  const s = Ae(e.performance)?.day_change ?? null;
  if (a == null && s?.price_change_eur != null && (a = s.price_change_eur * t), i == null && s?.change_pct != null && (i = s.change_pct), a == null && i != null) {
    const u = fe(e.current_value);
    if (u != null) {
      const d = u / (1 + i / 100);
      d && (a = u - d);
    }
  }
  const c = a != null && Number.isFinite(a) ? Math.round(a * 100) / 100 : null, l = i != null && Number.isFinite(i) ? Math.round(i * 100) / 100 : null;
  return { value: c, pct: l };
}
const yt = /* @__PURE__ */ new Set();
function wo(e) {
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
function Ge(e) {
  if (e.length === 0)
    return '<div class="no-positions">Keine Positionen vorhanden.</div>';
  const t = [
    { key: "name", label: "Wertpapier", sortKey: "name" },
    { key: "current_holdings", label: "Bestand", align: "right", sortKey: "current_holdings" },
    { key: "average_price", label: "Ø Kaufpreis", align: "right", sortKey: "average_price" },
    { key: "purchase_value", label: "Kaufpreis (EUR)", align: "right", sortKey: "purchase_value" },
    { key: "current_value", label: "Aktueller Wert", align: "right", sortKey: "current_value" },
    { key: "day_change_abs", label: "Heute +/-", align: "right", sortKey: "day_change_abs" },
    { key: "day_change_pct", label: "Heute %", align: "right", sortKey: "day_change_pct" },
    { key: "gain_abs", label: "Gesamt +/-", align: "right", sortKey: "gain_abs" },
    { key: "gain_pct", label: "Gesamt %", align: "right", sortKey: "gain_pct" }
  ];
  let n = '<table class="sortable-positions" data-default-sort="name" data-default-dir="asc"><thead><tr>';
  t.forEach((m) => {
    const b = m.align === "right" ? ' class="align-right sortable-col"' : ' class="sortable-col"';
    n += `<th${b} data-sort-key="${m.sortKey}">${m.label}</th>`;
  }), n += "</tr></thead><tbody>";
  const r = {
    purchase_value: 0,
    current_value: 0,
    day_change_abs: 0,
    gain_abs: 0
  }, a = {
    purchase_value: 0,
    current_value: 0,
    day_change_abs: 0,
    gain_abs: 0
  }, i = (m) => {
    if (typeof m == "number" && Number.isFinite(m)) return m;
    if (typeof m == "string") {
      const b = parseFloat(m);
      return Number.isFinite(b) ? b : null;
    }
    return null;
  };
  for (const m of e) {
    const b = Ae(m.performance), h = So(m), y = i(m.purchase_value), _ = i(m.current_value), S = h.value, w = typeof b?.gain_abs == "number" ? b.gain_abs : null;
    y !== null && (r.purchase_value += y, a.purchase_value++), _ !== null && (r.current_value += _, a.current_value++), S !== null && (r.day_change_abs += S, a.day_change_abs++), w !== null && (r.gain_abs += w, a.gain_abs++);
    const C = typeof m.security_uuid == "string" ? m.security_uuid : "";
    n += `<tr class="position-row" data-security="${pe(C)}">`;
    const A = typeof m.name == "string" ? m.name : typeof m.name == "number" ? String(m.name) : "";
    n += `<td>${D("name", A)}</td>`, n += `<td class="align-right">${D("current_holdings", m.current_holdings)}</td>`;
    const { markup: E, sortValue: $, ariaLabel: M } = vo(m), P = M ? ` aria-label="${pe(M)}"` : "";
    n += `<td class="align-right" data-sort-value="${String($)}"${P}>${E}</td>`, n += `<td class="align-right">${D("purchase_value", y, m)}</td>`, n += `<td class="align-right">${D("current_value", _, m)}</td>`, n += `<td class="align-right">${D("day_change_abs", S, m)}</td>`, n += `<td class="align-right">${D("day_change_pct", h.pct, m)}</td>`;
    const N = typeof b?.gain_pct == "number" ? b.gain_pct : null;
    let H = "—", F = "neutral";
    N != null && (H = `${N.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`, F = N > 0 ? "positive" : N < 0 ? "negative" : "neutral");
    const k = ` data-gain-pct="${pe(H)}" data-gain-sign="${F}"`;
    n += `<td class="align-right"${k}>${D("gain_abs", w, m)}</td>`, n += `<td class="align-right gain-pct-cell">${D("gain_pct", N, m)}</td>`, n += "</tr>";
  }
  n += '<tr class="footer-row"><td>Summe</td><td class="align-right"></td><td class="align-right"></td>';
  const o = a.purchase_value > 0 ? r.purchase_value : null;
  n += `<td class="align-right">${D("purchase_value", o, void 0, { hasValue: a.purchase_value > 0 })}</td>`;
  const s = a.current_value > 0 ? r.current_value : null;
  n += `<td class="align-right">${D("current_value", s, void 0, { hasValue: a.current_value > 0 })}</td>`;
  const c = a.day_change_abs > 0 ? r.day_change_abs : null;
  n += `<td class="align-right">${D("day_change_abs", c, void 0, { hasValue: a.day_change_abs > 0 })}</td>`;
  let l = null;
  if (c !== null && s !== null) {
    const m = s - c;
    m && (l = c / m * 100);
  }
  n += `<td class="align-right">${D("day_change_pct", l, void 0, { hasValue: l !== null })}</td>`;
  const u = a.gain_abs > 0 ? r.gain_abs : null;
  let d = null;
  u !== null && (o !== null && o > 0 ? d = u / o * 100 : s !== null && s !== 0 && (d = u / (s - u) * 100));
  let p = "—", f = "neutral";
  d != null && (p = `${re(d)} %`, f = d > 0 ? "positive" : d < 0 ? "negative" : "neutral");
  const g = ` data-gain-pct="${pe(p)}" data-gain-sign="${f}"`;
  return n += `<td class="align-right"${g}>${D("gain_abs", u, void 0, { hasValue: a.gain_abs > 0 })}</td>`, n += `<td class="align-right gain-pct-cell">${D("gain_pct", d, void 0, { hasValue: d !== null })}</td>`, n += "</tr></tbody></table>", n;
}
function Po(e) {
  const t = Ft(e ?? []);
  return Ge(t);
}
function Ao(e, t) {
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
    const s = i.closest("tr[data-security]");
    if (!s || !r.contains(s))
      return;
    const c = s.getAttribute("data-security");
    if (c)
      try {
        Fa(c) || console.warn("attachSecurityDetailDelegation: Detail-Tab konnte nicht geöffnet werden für", c);
      } catch (l) {
        console.error("attachSecurityDetailDelegation: Fehler beim Öffnen des Detail-Tabs", l);
      }
  })));
}
function Xe(e, t) {
  Ao(e, t);
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
    const x = Number.isFinite(v.position_count) ? v.position_count : 0, L = Number.isFinite(v.purchase_sum) ? v.purchase_sum : 0, K = v.hasValue && typeof v.current_value == "number" && Number.isFinite(v.current_value) ? v.current_value : null, T = K !== null, V = v.performance, W = typeof v.gain_abs == "number" ? v.gain_abs : typeof V?.gain_abs == "number" ? V.gain_abs : null, B = typeof v.gain_pct == "number" ? v.gain_pct : typeof V?.gain_pct == "number" ? V.gain_pct : null, G = V && typeof V == "object" ? V.day_change : null, j = typeof v.day_change_abs == "number" ? v.day_change_abs : G && typeof G == "object" ? G.value_change_eur ?? G.price_change_eur : null, He = typeof v.day_change_pct == "number" ? v.day_change_pct : G && typeof G == "object" && typeof G.change_pct == "number" ? G.change_pct : null, Se = v.fx_unavailable && T, $a = typeof v.coverage_ratio == "number" && Number.isFinite(v.coverage_ratio) ? v.coverage_ratio : "", ka = typeof v.provenance == "string" ? v.provenance : "", Ta = typeof v.metric_run_uuid == "string" ? v.metric_run_uuid : "", Ie = yt.has(v.uuid), Ra = Ie ? "portfolio-toggle expanded" : "portfolio-toggle", Dn = `portfolio-details-${v.uuid}`, J = {
      fx_unavailable: v.fx_unavailable,
      purchase_value: L,
      current_value: K,
      day_change_abs: j,
      day_change_pct: He,
      gain_abs: W,
      gain_pct: B
    }, Ce = { hasValue: T }, La = D("purchase_value", J.purchase_value, J, Ce), Ma = D("current_value", J.current_value, J, Ce), Ha = D("day_change_abs", J.day_change_abs, J, Ce), Ia = D("day_change_pct", J.day_change_pct, J, Ce), Va = D("gain_abs", J.gain_abs, J, Ce), za = D("gain_pct", J.gain_pct, J, Ce), $n = T && typeof B == "number" && Number.isFinite(B) ? `${re(B)} %` : "", Ua = T && typeof B == "number" && Number.isFinite(B) ? B > 0 ? "positive" : B < 0 ? "negative" : "neutral" : "", qa = T && typeof K == "number" && Number.isFinite(K) ? K : "", Wa = T && typeof W == "number" && Number.isFinite(W) ? W : "", Oa = T && typeof B == "number" && Number.isFinite(B) ? B : "", Ba = T && typeof j == "number" && Number.isFinite(j) ? j : "", Ka = T && typeof He == "number" && Number.isFinite(He) ? He : "", ja = String(x);
    let $t = "";
    $n && ($t = ` data-gain-pct="${t($n)}" data-gain-sign="${t(Ua)}"`), Se && ($t += ' data-partial="true"'), n += `<tr class="portfolio-row"
                  data-portfolio="${v.uuid}"
                  data-position-count="${ja}"
                  data-current-value="${t(qa)}"
                  data-purchase-sum="${t(L)}"
                  data-day-change="${t(Ba)}"
                  data-day-change-pct="${t(Ka)}"
                  data-gain-abs="${t(Wa)}"
                data-gain-pct="${t(Oa)}"
                data-has-value="${T ? "true" : "false"}"
                data-fx-unavailable="${v.fx_unavailable ? "true" : "false"}"
                data-coverage-ratio="${t($a)}"
                data-provenance="${t(ka)}"
                data-metric-run-uuid="${t(Ta)}">`;
    const Ya = pe(v.name), Ga = Vr(Br(v.badges), {
      containerClass: "portfolio-badges"
    });
    n += `<td>
        <button type="button"
                class="${Ra}"
                data-portfolio="${v.uuid}"
                aria-expanded="${Ie ? "true" : "false"}"
                aria-controls="${Dn}">
          <span class="caret">${Ie ? "▼" : "▶"}</span>
          <span class="portfolio-name">${Ya}</span>${Ga}
        </button>
      </td>`;
    const Xa = x.toLocaleString("de-DE");
    n += `<td class="align-right">${Xa}</td>`, n += `<td class="align-right">${La}</td>`, n += `<td class="align-right">${Ma}</td>`, n += `<td class="align-right">${Ha}</td>`, n += `<td class="align-right">${Ia}</td>`, n += `<td class="align-right"${$t}>${Va}</td>`, n += `<td class="align-right gain-pct-cell">${za}</td>`, n += "</tr>", n += `<tr class="portfolio-details${Ie ? "" : " hidden"}"
                data-portfolio="${v.uuid}"
                id="${Dn}"
                role="region"
                aria-label="Positionen für ${v.name}">
      <td colspan="${r.length.toString()}">
        <div class="positions-container">${Ie ? xt(v.uuid) ? Ge(Fr(v.uuid)) : '<div class="loading">Lade Positionen...</div>' : ""}</div>
      </td>
    </tr>`;
  });
  const a = e.filter((v) => typeof v.current_value == "number" && Number.isFinite(v.current_value)), i = e.reduce((v, x) => v + (Number.isFinite(x.position_count) ? x.position_count : 0), 0), o = a.reduce((v, x) => typeof x.current_value == "number" && Number.isFinite(x.current_value) ? v + x.current_value : v, 0), s = a.reduce((v, x) => typeof x.purchase_sum == "number" && Number.isFinite(x.purchase_sum) ? v + x.purchase_sum : v, 0), c = a.map((v) => {
    if (typeof v.day_change_abs == "number")
      return v.day_change_abs;
    const x = v.performance && typeof v.performance == "object" ? v.performance.day_change : null;
    if (x && typeof x == "object") {
      const L = x.value_change_eur;
      if (typeof L == "number" && Number.isFinite(L))
        return L;
    }
    return null;
  }).filter((v) => typeof v == "number" && Number.isFinite(v)), l = c.reduce((v, x) => v + x, 0), u = a.reduce((v, x) => {
    if (typeof x.performance?.gain_abs == "number" && Number.isFinite(x.performance.gain_abs))
      return v + x.performance.gain_abs;
    const L = typeof x.current_value == "number" && Number.isFinite(x.current_value) ? x.current_value : 0, K = typeof x.purchase_sum == "number" && Number.isFinite(x.purchase_sum) ? x.purchase_sum : 0;
    return v + (L - K);
  }, 0), d = a.length > 0, p = a.length !== e.length, f = c.length > 0, g = f && d && o !== 0 ? (() => {
    const v = o - l;
    return v ? l / v * 100 : null;
  })() : null, m = d && s > 0 ? u / s * 100 : null, b = {
    fx_unavailable: p,
    purchase_value: d ? s : null,
    current_value: d ? o : null,
    day_change_abs: f ? l : null,
    day_change_pct: f ? g : null,
    gain_abs: d ? u : null,
    gain_pct: d ? m : null
  }, h = { hasValue: d }, y = { hasValue: f }, _ = D("purchase_value", b.purchase_value, b, h), S = D("current_value", b.current_value, b, h), w = D("day_change_abs", b.day_change_abs, b, y), C = D("day_change_pct", b.day_change_pct, b, y), A = D("gain_abs", b.gain_abs, b, h), E = D("gain_pct", b.gain_pct, b, h);
  let $ = "";
  if (d && typeof m == "number" && Number.isFinite(m)) {
    const v = `${re(m)} %`, x = m > 0 ? "positive" : m < 0 ? "negative" : "neutral";
    $ = ` data-gain-pct="${t(v)}" data-gain-sign="${t(x)}"`;
  }
  p && ($ += ' data-partial="true"');
  const M = String(Math.round(i)), P = d ? String(o) : "", N = d ? String(s) : "", H = f ? String(l) : "", F = f && typeof g == "number" && Number.isFinite(g) ? String(g) : "", k = d ? String(u) : "", Y = d && typeof m == "number" && Number.isFinite(m) ? String(m) : "";
  return n += `<tr class="footer-row"
      data-position-count="${M}"
      data-current-value="${t(P)}"
      data-purchase-sum="${t(N)}"
      data-day-change="${t(H)}"
      data-day-change-pct="${t(F)}"
      data-gain-abs="${t(k)}"
      data-gain-pct="${t(Y)}"
      data-has-value="${d ? "true" : "false"}"
      data-fx-unavailable="${p ? "true" : "false"}">
      <td>Summe</td>
      <td class="align-right">${Math.round(i).toLocaleString("de-DE")}</td>
    <td class="align-right">${_}</td>
    <td class="align-right">${S}</td>
    <td class="align-right">${w}</td>
    <td class="align-right">${C}</td>
    <td class="align-right"${$}>${A}</td>
    <td class="align-right gain-pct-cell">${E}</td>
  </tr>`, n += "</tbody></table>", n;
}
function Co(e) {
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
function jr(e) {
  const t = Co(e);
  if (!t)
    return;
  const n = t.tBodies.item(0);
  if (!n)
    return;
  const r = Array.from(n.querySelectorAll("tr.portfolio-row"));
  if (!r.length)
    return;
  let a = 0, i = 0, o = 0, s = 0, c = 0, l = !1, u = !1, d = !0, p = !1;
  for (const L of r) {
    const K = ze(L.dataset.positionCount);
    K != null && (a += K), L.dataset.fxUnavailable === "true" && (p = !0);
    const T = L.dataset.hasValue;
    if (!!(T === "false" || T === "0" || T === "" || T == null)) {
      d = !1;
      continue;
    }
    l = !0;
    const W = ze(L.dataset.currentValue), B = ze(L.dataset.gainAbs), G = ze(L.dataset.purchaseSum), j = ze(L.dataset.dayChange);
    if (W == null || B == null || G == null) {
      d = !1;
      continue;
    }
    i += W, s += B, o += G, j != null && (c += j, u = !0);
  }
  const f = l && d, g = f && o > 0 ? s / o * 100 : null, m = u && f && i !== 0 ? (() => {
    const L = i - c;
    return L ? c / L * 100 : null;
  })() : null;
  let b = Array.from(n.children).find(
    (L) => L instanceof HTMLTableRowElement && L.classList.contains("footer-row")
  );
  b || (b = document.createElement("tr"), b.classList.add("footer-row"), n.appendChild(b));
  const h = Math.round(a).toLocaleString("de-DE"), y = {
    fx_unavailable: p || !f,
    purchase_value: f ? o : null,
    current_value: f ? i : null,
    day_change_abs: u && f ? c : null,
    day_change_pct: u && f ? m : null,
    gain_abs: f ? s : null,
    gain_pct: f ? g : null
  }, _ = { hasValue: f }, S = { hasValue: u && f }, w = D("purchase_value", y.purchase_value, y, _), C = D("current_value", y.current_value, y, _), A = D("day_change_abs", y.day_change_abs, y, S), E = D("day_change_pct", y.day_change_pct, y, S), $ = D("gain_abs", y.gain_abs, y, _), M = D("gain_pct", y.gain_pct, y, _), P = t.tHead ? t.tHead.rows.item(0) : null, N = P ? P.cells.length : 0, H = b.cells.length, F = N || H, k = F > 0 ? F <= 5 : !1, Y = f && typeof g == "number" ? `${re(g)} %` : "", v = f && typeof g == "number" ? g > 0 ? "positive" : g < 0 ? "negative" : "neutral" : "neutral";
  k ? b.innerHTML = `
      <td>Summe</td>
      <td class="align-right">${h}</td>
      <td class="align-right">${C}</td>
      <td class="align-right">${$}</td>
      <td class="align-right gain-pct-cell">${M}</td>
    ` : b.innerHTML = `
      <td>Summe</td>
      <td class="align-right">${h}</td>
      <td class="align-right">${w}</td>
      <td class="align-right">${C}</td>
      <td class="align-right">${A}</td>
      <td class="align-right">${E}</td>
      <td class="align-right">${$}</td>
      <td class="align-right">${M}</td>
    `;
  const x = b.cells.item(k ? 3 : 6);
  x && (x.dataset.gainPct = Y || "—", x.dataset.gainSign = v), b.dataset.positionCount = String(Math.round(a)), b.dataset.currentValue = f ? String(i) : "", b.dataset.purchaseSum = f ? String(o) : "", b.dataset.dayChange = f && u ? String(c) : "", b.dataset.dayChangePct = f && u && typeof m == "number" ? String(m) : "", b.dataset.gainAbs = f ? String(s) : "", b.dataset.gainPct = f && typeof g == "number" ? String(g) : "", b.dataset.hasValue = f ? "true" : "false", b.dataset.fxUnavailable = p ? "true" : "false";
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
  const i = (p, f) => {
    const g = a.querySelector("tbody");
    if (!g) return;
    const m = Array.from(g.querySelectorAll("tr")).filter((_) => !_.classList.contains("footer-row")), b = g.querySelector("tr.footer-row"), h = (_) => {
      if (_ == null) return 0;
      const S = _.replace(/\u00A0/g, " ").replace(/[%€]/g, "").replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, ""), w = Number.parseFloat(S);
      return Number.isFinite(w) ? w : 0;
    };
    m.sort((_, S) => {
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
      }[p], A = _.cells.item(C), E = S.cells.item(C);
      let $ = "";
      if (A) {
        const H = A.textContent;
        typeof H == "string" && ($ = H.trim());
      }
      let M = "";
      if (E) {
        const H = E.textContent;
        typeof H == "string" && (M = H.trim());
      }
      const P = (H, F) => {
        const k = H ? H.dataset.sortValue : void 0;
        if (k != null && k !== "") {
          const Y = Number(k);
          if (Number.isFinite(Y))
            return Y;
        }
        return h(F);
      };
      let N;
      if (p === "name")
        N = $.localeCompare(M, "de", { sensitivity: "base" });
      else {
        const H = P(A, $), F = P(E, M);
        N = H - F;
      }
      return f === "asc" ? N : -N;
    }), a.querySelectorAll("thead th.sort-active").forEach((_) => {
      _.classList.remove("sort-active", "dir-asc", "dir-desc");
    });
    const y = a.querySelector(`thead th[data-sort-key="${p}"]`);
    y && y.classList.add("sort-active", f === "asc" ? "dir-asc" : "dir-desc"), m.forEach((_) => g.appendChild(_)), b && g.appendChild(b);
  }, o = r.dataset.sortKey, s = r.dataset.sortDir, c = a.dataset.defaultSort, l = a.dataset.defaultDir, u = Lt(o) ? o : Lt(c) ? c : "name", d = Mt(s) ? s : Mt(l) ? l : "asc";
  i(u, d), a.addEventListener("click", (p) => {
    const f = p.target;
    if (!(f instanceof Element))
      return;
    const g = f.closest("th[data-sort-key]");
    if (!g || !a.contains(g)) return;
    const m = g.getAttribute("data-sort-key");
    if (!Lt(m))
      return;
    let b = "asc";
    r.dataset.sortKey === m && (b = (Mt(r.dataset.sortDir) ? r.dataset.sortDir : "asc") === "asc" ? "desc" : "asc"), r.dataset.sortKey = m, r.dataset.sortDir = b, i(m, b);
  });
}
async function No(e, t, n) {
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
      const i = await Nr(
        ht,
        mt,
        e
      );
      if (i.error) {
        const s = typeof i.error == "string" ? i.error : String(i.error);
        r.innerHTML = `<div class="error">${s} <button class="retry-pos" data-portfolio="${e}">Erneut laden</button></div>`;
        return;
      }
      const o = Ft(
        Array.isArray(i.positions) ? i.positions : []
      );
      ft(e, o), pt(e, o), r.innerHTML = Ge(o);
      try {
        Ze(n, e);
      } catch (s) {
        console.warn("attachPortfolioToggleHandler: Sort-Init (Lazy) fehlgeschlagen:", s);
      }
      try {
        Xe(n, e);
      } catch (s) {
        console.warn("reloadPortfolioPositions: Security-Listener konnte nicht gebunden werden:", s);
      }
    } catch (i) {
      const o = i instanceof Error ? i.message : String(i);
      r.innerHTML = `<div class="error">Fehler: ${o} <button class="retry-pos" data-portfolio="${e}">Retry</button></div>`;
    }
  }
}
async function Eo(e, t, n = 3e3, r = 50) {
  const a = performance.now();
  return new Promise((i) => {
    const o = () => {
      const s = e.querySelector(t);
      if (s) {
        i(s);
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
function Sn(e) {
  const n = (typeof e.__ppReaderAttachToken == "number" ? e.__ppReaderAttachToken : 0) + 1;
  e.__ppReaderAttachToken = n, e.__ppReaderAttachInProgress = !0, (async () => {
    try {
      const r = await Eo(e, ".portfolio-table");
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
            const s = o.closest(".retry-pos");
            if (s && r.contains(s)) {
              const f = s.getAttribute("data-portfolio");
              if (f) {
                const m = e.querySelector(
                  `.portfolio-details[data-portfolio="${f}"]`
                )?.querySelector(".positions-container");
                await No(f, m ?? null, e);
              }
              return;
            }
            const c = o.closest(".portfolio-toggle");
            if (!c || !r.contains(c)) return;
            const l = c.getAttribute("data-portfolio");
            if (!l) return;
            const u = e.querySelector(
              `.portfolio-details[data-portfolio="${l}"]`
            );
            if (!u) return;
            const d = c.querySelector(".caret");
            if (u.classList.contains("hidden")) {
              u.classList.remove("hidden"), c.classList.add("expanded"), c.setAttribute("aria-expanded", "true"), d && (d.textContent = "▼"), yt.add(l);
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
                    const b = typeof g.error == "string" ? g.error : String(g.error);
                    f && (f.innerHTML = `<div class="error">${b} <button class="retry-pos" data-portfolio="${l}">Erneut laden</button></div>`);
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
                    } catch (b) {
                      console.warn("attachPortfolioToggleHandler: Sort-Init (Lazy) fehlgeschlagen:", b);
                    }
                    try {
                      Xe(e, l);
                    } catch (b) {
                      console.warn("attachPortfolioToggleHandler: Security-Listener konnte nicht gebunden werden:", b);
                    }
                  }
                } catch (g) {
                  const m = g instanceof Error ? g.message : String(g), b = u.querySelector(".positions-container");
                  b && (b.innerHTML = `<div class="error">Fehler beim Laden: ${m} <button class="retry-pos" data-portfolio="${l}">Retry</button></div>`), console.error("Fehler beim Lazy Load für", l, g);
                }
              }
            } else
              u.classList.add("hidden"), c.classList.remove("expanded"), c.setAttribute("aria-expanded", "false"), d && (d.textContent = "▶"), yt.delete(l);
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
function xo(e) {
  const t = e.querySelector(".expandable-portfolio-table");
  t && (t.__ppReaderPortfolioFallbackBound || (t.__ppReaderPortfolioFallbackBound = !0, t.addEventListener("click", (n) => {
    const r = n.target;
    !(r instanceof Element) || !r.closest(".portfolio-toggle") || e.querySelector(".portfolio-table")?.__ppReaderPortfolioToggleBound || (console.debug("Fallback-Listener aktiv – re-attach Hauptlistener"), Sn(e));
  })));
}
async function Yr(e, t, n) {
  ht = t ?? null, mt = n ?? null, console.debug(
    "renderDashboard: start – panelConfig:",
    n?.config,
    "derived entry_id?",
    n?.config?._panel_custom?.config?.entry_id
  );
  const r = await oi(t, n);
  kr(r.accounts);
  const a = Ir(), i = await ci(t, n);
  Ti(i.portfolios);
  const o = qi();
  let s = "";
  try {
    s = await si(t, n);
  } catch {
    s = "";
  }
  const c = a.reduce(
    (P, N) => P + (typeof N.balance == "number" && Number.isFinite(N.balance) ? N.balance : 0),
    0
  ), l = o.some((P) => P.fx_unavailable), u = a.some((P) => P.fx_unavailable && (P.balance == null || !Number.isFinite(P.balance))), d = o.reduce((P, N) => N.hasValue && typeof N.current_value == "number" && Number.isFinite(N.current_value) ? P + N.current_value : P, 0), p = c + d, f = "Teilw. fehlende FX-Kurse – Gesamtvermögen abweichend", m = o.some((P) => P.hasValue && typeof P.current_value == "number" && Number.isFinite(P.current_value)) || a.some((P) => typeof P.balance == "number" && Number.isFinite(P.balance)) ? `${re(p)}&nbsp;€` : `<span class="missing-value" role="note" aria-label="${f}" title="${f}">—</span>`, b = l || u ? `<span class="total-wealth-note">${f}</span>` : "", h = `
    <div class="header-meta-row">
      💰 Gesamtvermögen: <strong class="total-wealth-value">${m}</strong>${b}
    </div>
  `, y = fn("Übersicht", h), _ = Kr(o), S = a.filter((P) => (P.currency_code ?? "EUR") === "EUR"), w = a.filter((P) => (P.currency_code ?? "EUR") !== "EUR"), A = w.some((P) => P.fx_unavailable) ? `
        <p class="table-note" role="note">
          <span class="table-note__icon" aria-hidden="true">⚠️</span>
          <span>Wechselkurse konnten nicht geladen werden. EUR-Werte werden derzeit nicht angezeigt.</span>
        </p>
      ` : "", E = `
    <div class="card">
      <h2>Liquidität</h2>
      <div class="scroll-container account-table">
        ${je(
    S.map((P) => ({
      name: gt(P.name, jn(P.badges), {
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
          ${je(
    w.map((P) => {
      const N = P.orig_balance, F = typeof N == "number" && Number.isFinite(N) ? `${N.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}&nbsp;${P.currency_code ?? ""}` : "";
      return {
        name: gt(P.name, jn(P.badges), {
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
  `, $ = `
    <div class="card footer-card">
      <div class="meta">
        <div class="last-file-update">
          📂 Letzte Aktualisierung der Datei: <strong>${s || "Unbekannt"}</strong>
        </div>
      </div>
    </div>
  `, M = `
    ${y.outerHTML}
    <div class="card">
      <h2>Investment</h2>
      <div class="scroll-container portfolio-table">
        ${_}
      </div>
    </div>
    ${E}
    ${$}
  `;
  return Fo(e, o), M;
}
function Fo(e, t) {
  if (!e)
    return;
  const n = () => {
    try {
      const a = e, i = a.querySelector(".portfolio-table");
      i && i.querySelectorAll(".portfolio-toggle").length === 0 && (console.debug("Recovery: Tabelle ohne Buttons – erneuter Aufbau"), i.innerHTML = Kr(t)), Sn(e), xo(e), yt.forEach((o) => {
        try {
          xt(o) && (Ze(e, o), Xe(e, o));
        } catch (s) {
          console.warn("Init-Sortierung für expandiertes Depot fehlgeschlagen:", o, s);
        }
      });
      try {
        jr(a);
      } catch (o) {
        console.warn("renderDashboard: Footer-Summe konnte nicht aktualisiert werden:", o);
      }
      try {
        io(e);
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
_i({
  renderPositionsTable: (e) => Po(e),
  applyGainPctMetadata: wo,
  attachSecurityDetailListener: Xe,
  attachPortfolioPositionsSorting: Ze,
  updatePortfolioFooter: (e) => {
    e && jr(e);
  }
});
let _e = {
  status: "idle",
  error: null,
  data: null,
  selection: null,
  lastUpdated: null
}, Zn = null;
function Do(e) {
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
function $o(e) {
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
function ko(e) {
  const t = Xt(e.date ?? null), n = $o(e.range ?? null);
  if (t && n)
    throw new Error("loadDailyWealth: date und range können nicht gleichzeitig gesetzt werden");
  if (!t && !n)
    throw new Error("loadDailyWealth: entweder date oder range erforderlich");
  const r = e.scopes ?? {}, a = Jn(r.accounts), i = Jn(r.portfolios), o = {};
  t && (o.date = t), n && (o.range = n);
  const s = e.include_slices ?? e.includeSlices ?? void 0, c = e.include_scopes ?? e.includeScopes ?? void 0;
  return s !== void 0 && (o.includeSlices = s), c !== void 0 && (o.includeScopes = c), (a.length || i.length) && (o.scopes = {}, a.length && (o.scopes.accounts = a), i.length && (o.scopes.portfolios = i)), typeof e.limit == "number" && Number.isFinite(e.limit) && e.limit > 0 && (o.limit = e.limit), typeof e.offset == "number" && Number.isFinite(e.offset) && e.offset >= 0 && (o.offset = e.offset), o;
}
function To(e) {
  const t = e.date ?? "", n = e.range ? `${e.range.start}..${e.range.end}` : "", r = e.scopes?.accounts ?? [], a = e.scopes?.portfolios ?? [], i = JSON.stringify({ accounts: r, portfolios: a }), o = e.includeSlices ? "1" : "0", s = e.includeScopes ? "1" : "0", c = e.limit ?? "", l = e.offset ?? "";
  return [t, n, i, o, s, c, l].join("::");
}
function Ro(e) {
  return { ...e };
}
function Qn(e) {
  return { ...e };
}
function Lo(e) {
  if (e)
    return {
      accounts: e.accounts.map(Qn),
      portfolios: e.portfolios.map(Qn)
    };
}
function Mo(e) {
  if (!e)
    return null;
  const t = Lo(e.slices);
  return {
    range: { ...e.range },
    records: e.records.map(Ro),
    ...t ? { slices: t } : {}
  };
}
function Ho(e) {
  if (!e)
    return null;
  const t = {};
  return e.date && (t.date = e.date), e.range && (t.range = { ...e.range }), e.scopes && (t.scopes = {
    ...e.scopes.accounts ? { accounts: [...e.scopes.accounts] } : {},
    ...e.scopes.portfolios ? { portfolios: [...e.scopes.portfolios] } : {}
  }), e.includeSlices !== void 0 && (t.includeSlices = e.includeSlices), e.includeScopes !== void 0 && (t.includeScopes = e.includeScopes), e.limit !== void 0 && (t.limit = e.limit), e.offset !== void 0 && (t.offset = e.offset), t;
}
function Ht(e) {
  _e = {
    ..._e,
    ...e
  };
}
function Zt() {
  return {
    status: _e.status,
    error: _e.error,
    lastUpdated: _e.lastUpdated,
    data: Mo(_e.data),
    selection: Ho(_e.selection)
  };
}
async function Io(e, t, n = {}) {
  const r = ko(n), a = To(r);
  if (_e.data && !n.force && Zn === a)
    return Zt();
  Ht({
    status: "loading",
    error: null,
    selection: r
  });
  try {
    const i = await di(e, t, r);
    Zn = a, Ht({
      status: "loaded",
      error: null,
      data: i,
      selection: r,
      lastUpdated: Date.now()
    });
  } catch (i) {
    Ht({
      status: "error",
      error: Do(i),
      selection: r,
      lastUpdated: Date.now()
    });
  }
  return Zt();
}
const Vo = "http://www.w3.org/2000/svg", Ee = 640, xe = 260, qe = { top: 12, right: 16, bottom: 24, left: 16 }, We = "var(--pp-reader-chart-line, #3f51b5)", Jt = "var(--pp-reader-chart-area, rgba(63, 81, 181, 0.12))", er = "0.75rem", Gr = "var(--pp-reader-chart-baseline, rgba(96, 125, 139, 0.75))", Xr = "6 4", zo = 1440 * 60 * 1e3;
function Uo(e) {
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
function qo(e) {
  return typeof e == "string" ? e : typeof e == "number" && Number.isFinite(e) ? e.toString() : e instanceof Date && Number.isFinite(e.getTime()) ? e.toISOString() : "";
}
function Q(e) {
  return `${String(e)}px`;
}
function ie(e, t = {}) {
  const n = document.createElementNS(Vo, e);
  return Object.entries(t).forEach(([r, a]) => {
    const i = Uo(a);
    i != null && n.setAttribute(r, i);
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
function Zr(e, t) {
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
const Jr = (e) => {
  if (e && typeof e == "object" && "date" in e)
    return e.date;
}, Qr = (e) => {
  if (e && typeof e == "object" && "close" in e)
    return e.close;
}, ea = (e, t, n) => {
  if (Number.isFinite(e)) {
    const r = new Date(e);
    if (!Number.isNaN(r.getTime()))
      return r.toLocaleDateString("de-DE");
  }
  if (t && typeof t == "object" && "date" in t) {
    const r = t.date, a = qo(r);
    if (a)
      return a;
  }
  return Number.isFinite(e) ? e.toString() : "";
}, ta = (e, t, n) => (Number.isFinite(e) ? e : _t(e, 0) ?? 0).toLocaleString("de-DE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
}), na = ({ xFormatted: e, yFormatted: t }) => `
    <div class="chart-tooltip-date">${e}</div>
    <div class="chart-tooltip-value">${t}&nbsp;€</div>
  `, ra = ({
  marker: e,
  xFormatted: t,
  yFormatted: n
}) => `
    <div class="chart-tooltip-date">${(typeof e.label == "string" ? e.label : null) || t}</div>
    <div class="chart-tooltip-value">${n}</div>
  `;
function aa(e) {
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
    width: Ee,
    height: xe,
    margin: { ...qe },
    series: [],
    points: [],
    range: null,
    xAccessor: Jr,
    yAccessor: Qr,
    xFormatter: ea,
    yFormatter: ta,
    tooltipRenderer: na,
    markerTooltipRenderer: ra,
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
function Wo(e, t) {
  if (e.length === 0)
    return "";
  const n = [];
  e.forEach((o, s) => {
    const c = s === 0 ? "M" : "L", l = o.x.toFixed(2), u = o.y.toFixed(2);
    n.push(`${c}${l} ${u}`);
  });
  const r = e[0], i = `L${e[e.length - 1].x.toFixed(2)} ${t.toFixed(2)} L${r.x.toFixed(2)} ${t.toFixed(2)} Z`;
  return `${n.join(" ")} ${i}`;
}
function Oo(e) {
  if (e.length === 0)
    return "";
  const t = [];
  return e.forEach((n, r) => {
    const a = r === 0 ? "M" : "L", i = n.x.toFixed(2), o = n.y.toFixed(2);
    t.push(`${a}${i} ${o}`);
  }), t.join(" ");
}
function Bo(e) {
  const { baselineLine: t, baseline: n } = e;
  if (!t)
    return;
  const r = n?.color ?? Gr, a = n?.dashArray ?? Xr;
  t.setAttribute("stroke", r), t.setAttribute("stroke-dasharray", a);
}
function It(e) {
  const { baselineLine: t, baseline: n, range: r, margin: a, width: i } = e;
  if (!t)
    return;
  const o = n?.value;
  if (!r || o == null || !Number.isFinite(o)) {
    t.style.opacity = "0";
    return;
  }
  const { minY: s, maxY: c, boundedHeight: l } = r, u = Number.isFinite(s) ? s : o, p = (Number.isFinite(c) ? c : u + 1) - u, f = p === 0 ? 0.5 : (o - u) / p, g = ne(f, 0, 1), m = Math.max(l, 0), b = a.top + (1 - g) * m, h = Math.max(i - a.left - a.right, 0), y = a.left, _ = a.left + h;
  t.setAttribute("x1", y.toFixed(2)), t.setAttribute("x2", _.toFixed(2)), t.setAttribute("y1", b.toFixed(2)), t.setAttribute("y2", b.toFixed(2)), t.style.opacity = "1";
}
function Ko(e, t, n) {
  const { width: r, height: a, margin: i } = t, { xAccessor: o, yAccessor: s } = n;
  if (e.length === 0)
    return { points: [], range: null };
  const c = e.map((F, k) => {
    const Y = o(F, k), v = s(F, k), x = Zr(Y, k), L = _t(v, Number.NaN);
    return Number.isFinite(L) ? {
      index: k,
      data: F,
      xValue: x,
      yValue: L
    } : null;
  }).filter((F) => !!F);
  if (c.length === 0)
    return { points: [], range: null };
  const l = c.reduce((F, k) => Math.min(F, k.xValue), c[0].xValue), u = c.reduce((F, k) => Math.max(F, k.xValue), c[0].xValue), d = c.reduce((F, k) => Math.min(F, k.yValue), c[0].yValue), p = c.reduce((F, k) => Math.max(F, k.yValue), c[0].yValue), f = Math.max(r - i.left - i.right, 1), g = Math.max(a - i.top - i.bottom, 1), m = Number.isFinite(l) ? l : 0, b = Number.isFinite(u) ? u : m + 1, h = Number.isFinite(d) ? d : 0, y = Number.isFinite(p) ? p : h + 1, _ = _t(t.baseline?.value, null), S = _ != null && Number.isFinite(_) ? Math.min(h, _) : h, w = _ != null && Number.isFinite(_) ? Math.max(y, _) : y, C = Math.max(
    2,
    Math.min(
      6,
      Math.round(
        Math.max(a - i.top - i.bottom, 0) / 60
      ) || 4
    )
  ), { niceMin: A, niceMax: E } = Qo(
    S,
    w,
    C
  ), $ = Number.isFinite(A) ? A : h, M = Number.isFinite(E) ? E : y, P = b - m || 1, N = M - $ || 1;
  return {
    points: c.map((F) => {
      const k = P === 0 ? 0.5 : (F.xValue - m) / P, Y = N === 0 ? 0.5 : (F.yValue - $) / N, v = i.left + k * f, x = i.top + (1 - Y) * g;
      return {
        ...F,
        x: v,
        y: x
      };
    }),
    range: {
      minX: m,
      maxX: b,
      minY: $,
      maxY: M,
      boundedWidth: f,
      boundedHeight: g
    }
  };
}
function Vt(e) {
  const { markerLayer: t, markerOverlay: n, markers: r, range: a, margin: i, markerTooltip: o } = e;
  if (e.markerPositions = [], lt(e), !t || !n)
    return;
  for (; t.firstChild; )
    t.removeChild(t.firstChild);
  for (; n.firstChild; )
    n.removeChild(n.firstChild);
  if (!a || !Array.isArray(r) || r.length === 0)
    return;
  const s = a.maxX - a.minX || 1, c = a.maxY - a.minY || 1;
  r.forEach((l, u) => {
    const d = Zr(l.x, u), p = _t(l.y, Number.NaN), f = Number(p);
    if (!Number.isFinite(d) || !Number.isFinite(f))
      return;
    const g = s === 0 ? 0.5 : ne((d - a.minX) / s, 0, 1), m = c === 0 ? 0.5 : ne((f - a.minY) / c, 0, 1), b = i.left + g * a.boundedWidth, h = i.top + (1 - m) * a.boundedHeight, y = ie("g", {
      class: "line-chart-marker",
      transform: `translate(${b.toFixed(2)} ${h.toFixed(2)})`,
      "data-marker-id": l.id
    }), _ = ie("circle", {
      r: 5,
      fill: l.color || e.color,
      stroke: "#fff",
      "stroke-width": 2,
      opacity: 0.95
    });
    y.appendChild(_), t.appendChild(y), e.markerPositions.push({
      marker: l,
      x: b,
      y: h
    });
  }), o && (o.style.opacity = "0", o.style.visibility = "hidden");
}
function ia(e, t, n, r) {
  e.width = Number.isFinite(t) ? Number(t) : Ee, e.height = Number.isFinite(n) ? Number(n) : xe, e.margin = {
    top: Number.isFinite(r?.top) ? Number(r?.top) : qe.top,
    right: Number.isFinite(r?.right) ? Number(r?.right) : qe.right,
    bottom: Number.isFinite(r?.bottom) ? Number(r?.bottom) : qe.bottom,
    left: Number.isFinite(r?.left) ? Number(r?.left) : qe.left
  };
}
function jo(e, t) {
  const n = e.xFormatter(t.xValue, t.data, t.index), r = e.yFormatter(t.yValue, t.data, t.index);
  return e.tooltipRenderer({
    point: t,
    xFormatted: n,
    yFormatted: r,
    data: t.data,
    index: t.index
  });
}
function Yo(e, t, n, r = null) {
  const { tooltip: a, width: i, margin: o, height: s } = e;
  if (!a)
    return;
  const c = r && Number.isFinite(r.scaleX) && r.scaleX > 0 ? r.scaleX : 1, l = r && Number.isFinite(r.scaleY) && r.scaleY > 0 ? r.scaleY : 1, u = s - o.bottom;
  a.style.visibility = "visible", a.style.opacity = "1";
  const d = a.offsetWidth || 0, p = a.offsetHeight || 0, f = t.x * c, g = ne(
    f - d / 2,
    o.left * c,
    (i - o.right) * c - d
  ), m = Math.max(u * l - p, 0), b = 12, y = (Number.isFinite(n) ? ne(n ?? 0, o.top, u) : t.y) * l;
  let _ = y - p - b;
  _ < o.top * l && (_ = y + b), _ = ne(_, 0, m);
  const S = Q(Math.round(g)), w = Q(Math.round(_));
  a.style.transform = `translate(${S}, ${w})`;
}
function Qt(e) {
  const { tooltip: t, focusLine: n, focusCircle: r } = e;
  t && (t.style.opacity = "0", t.style.visibility = "hidden"), n && (n.style.opacity = "0"), r && (r.style.opacity = "0");
}
function Go(e, t) {
  const { marker: n } = t, r = e.xFormatter(t.marker.x, n, -1), a = e.yFormatter(t.marker.y, n, -1);
  return e.markerTooltipRenderer({
    marker: n,
    xFormatted: r,
    yFormatted: a
  });
}
function Xo(e, t, n, r = null) {
  const { markerTooltip: a, width: i, margin: o, height: s, tooltip: c } = e;
  if (!a)
    return;
  const l = r && Number.isFinite(r.scaleX) && r.scaleX > 0 ? r.scaleX : 1, u = r && Number.isFinite(r.scaleY) && r.scaleY > 0 ? r.scaleY : 1, d = s - o.bottom;
  a.style.visibility = "visible", a.style.opacity = "1";
  const p = a.offsetWidth || 0, f = a.offsetHeight || 0, g = t.x * l, m = ne(
    g - p / 2,
    o.left * l,
    (i - o.right) * l - p
  ), b = Math.max(d * u - f, 0), h = 10, y = c?.getBoundingClientRect(), _ = e.svg?.getBoundingClientRect(), S = y && _ ? y.top - _.top : null, w = y && _ ? y.bottom - _.top : null, A = (Number.isFinite(n) ? ne(n ?? t.y, o.top, d) : t.y) * u;
  let E;
  S != null && w != null ? S <= A ? E = S - f - h : E = w + h : (E = A - f - h, E < o.top * u && (E = A + h)), E = ne(E, 0, b);
  const $ = Q(Math.round(m)), M = Q(Math.round(E));
  a.style.transform = `translate(${$}, ${M})`;
}
function lt(e) {
  const { markerTooltip: t } = e;
  t && (t.style.opacity = "0", t.style.visibility = "hidden");
}
function Zo(e, t, n) {
  let a = null, i = 576;
  for (const o of e.markerPositions) {
    const s = o.x - t, c = o.y - n, l = s * s + c * c;
    l <= i && (a = o, i = l);
  }
  return a;
}
function Jo(e, t) {
  if (t.handlersAttached || !t.overlay)
    return;
  const n = (a) => {
    if (t.points.length === 0 || !t.svg) {
      Qt(t), lt(t);
      return;
    }
    const i = t.svg.getBoundingClientRect(), o = t.width || Ee, s = t.height || xe, c = i.width && Number.isFinite(i.width) && Number.isFinite(o) && o > 0 ? i.width / o : 1, l = i.height && Number.isFinite(i.height) && Number.isFinite(s) && s > 0 ? i.height / s : 1, u = c > 0 ? 1 / c : 1, d = l > 0 ? 1 / l : 1, p = (a.clientX - i.left) * u, f = (a.clientY - i.top) * d, g = {
      scaleX: c,
      scaleY: l
    };
    let m = t.points[0], b = Math.abs(p - m.x);
    for (let y = 1; y < t.points.length; y += 1) {
      const _ = t.points[y], S = Math.abs(p - _.x);
      S < b && (b = S, m = _);
    }
    t.focusCircle && (t.focusCircle.setAttribute("cx", m.x.toFixed(2)), t.focusCircle.setAttribute("cy", m.y.toFixed(2)), t.focusCircle.style.opacity = "1"), t.focusLine && (t.focusLine.setAttribute("x1", m.x.toFixed(2)), t.focusLine.setAttribute("x2", m.x.toFixed(2)), t.focusLine.setAttribute("y1", t.margin.top.toFixed(2)), t.focusLine.setAttribute(
      "y2",
      (t.height - t.margin.bottom).toFixed(2)
    ), t.focusLine.style.opacity = "1"), t.tooltip && (t.tooltip.innerHTML = jo(t, m), Yo(t, m, f, g));
    const h = Zo(t, p, f);
    h && t.markerTooltip ? (t.markerTooltip.innerHTML = Go(t, h), Xo(t, h, f, g)) : lt(t);
  }, r = () => {
    Qt(t), lt(t);
  };
  t.overlay.addEventListener("pointermove", n), t.overlay.addEventListener("pointerenter", n), t.overlay.addEventListener("pointerleave", r), t.handlersAttached = !0, t.handlePointerMove = n, t.handlePointerLeave = r, e.addEventListener("pointercancel", r);
}
function oa(e, t = {}) {
  const n = document.createElement("div");
  n.className = "line-chart-container", n.dataset.chartType = "line", n.style.position = "relative";
  const r = ie("svg", {
    width: Ee,
    height: xe,
    viewBox: `0 0 ${String(Ee)} ${String(xe)}`,
    role: "img",
    "aria-hidden": "true",
    focusable: "false"
  });
  r.classList.add("line-chart-svg");
  const a = ie("path", {
    class: "line-chart-area",
    fill: Jt,
    stroke: "none"
  }), i = ie("line", {
    class: "line-chart-baseline",
    stroke: Gr,
    "stroke-width": 1,
    "stroke-dasharray": Xr,
    opacity: 0
  }), o = ie("path", {
    class: "line-chart-path",
    fill: "none",
    stroke: We,
    "stroke-width": 2,
    "stroke-linecap": "round",
    "stroke-linejoin": "round"
  }), s = ie("line", {
    class: "line-chart-focus-line",
    stroke: We,
    "stroke-width": 1,
    "stroke-dasharray": "4 4",
    opacity: 0
  }), c = ie("circle", {
    class: "line-chart-focus-circle",
    r: 4,
    fill: "#fff",
    stroke: We,
    "stroke-width": 2,
    opacity: 0
  }), l = ie("g", {
    class: "line-chart-markers"
  }), u = ie("rect", {
    class: "line-chart-overlay",
    fill: "transparent",
    x: 0,
    y: 0,
    width: Ee,
    height: xe
  });
  r.appendChild(a), r.appendChild(i), r.appendChild(o), r.appendChild(s), r.appendChild(c), r.appendChild(l), r.appendChild(u), n.appendChild(r);
  const d = document.createElement("div");
  d.className = "chart-tooltip", d.style.position = "absolute", d.style.top = "0", d.style.left = "0", d.style.pointerEvents = "none", d.style.opacity = "0", d.style.visibility = "hidden", n.appendChild(d);
  const p = document.createElement("div");
  p.className = "line-chart-marker-overlay", p.style.position = "absolute", p.style.top = "0", p.style.left = "0", p.style.width = "100%", p.style.height = "100%", p.style.pointerEvents = "none", p.style.overflow = "visible", p.style.zIndex = "2", n.appendChild(p);
  const f = document.createElement("div");
  f.className = "chart-tooltip chart-tooltip--marker", f.style.position = "absolute", f.style.top = "0", f.style.left = "0", f.style.pointerEvents = "none", f.style.opacity = "0", f.style.visibility = "hidden", n.appendChild(f), e.appendChild(n);
  const g = aa(n);
  if (g.svg = r, g.areaPath = a, g.linePath = o, g.baselineLine = i, g.focusLine = s, g.focusCircle = c, g.overlay = u, g.tooltip = d, g.markerOverlay = p, g.markerLayer = l, g.markerTooltip = f, g.xAccessor = t.xAccessor ?? Jr, g.yAccessor = t.yAccessor ?? Qr, g.xFormatter = t.xFormatter ?? ea, g.yFormatter = t.yFormatter ?? ta, g.tooltipRenderer = t.tooltipRenderer ?? na, g.markerTooltipRenderer = t.markerTooltipRenderer ?? ra, g.color = t.color ?? We, g.areaColor = t.areaColor ?? Jt, g.baseline = t.baseline ?? null, g.handlersAttached = !1, g.markers = Array.isArray(t.markers) ? t.markers.slice() : [], !g.xAxis) {
    const m = document.createElement("div");
    m.className = "line-chart-axis line-chart-axis-x", m.style.position = "absolute", m.style.left = "0", m.style.right = "0", m.style.bottom = "0", m.style.pointerEvents = "none", m.style.fontSize = er, m.style.color = "var(--secondary-text-color)", m.style.display = "block", n.appendChild(m), g.xAxis = m;
  }
  if (!g.yAxis) {
    const m = document.createElement("div");
    m.className = "line-chart-axis line-chart-axis-y", m.style.position = "absolute", m.style.top = "0", m.style.bottom = "0", m.style.left = "0", m.style.pointerEvents = "none", m.style.fontSize = er, m.style.color = "var(--secondary-text-color)", m.style.display = "block", n.appendChild(m), g.yAxis = m;
  }
  return ia(g, t.width, t.height, t.margin), o.setAttribute("stroke", g.color), s.setAttribute("stroke", g.color), c.setAttribute("stroke", g.color), a.setAttribute("fill", g.areaColor), wn(n, t), Jo(n, g), n;
}
function wn(e, t = {}) {
  if (!e) {
    console.error("updateLineChart: container element is required");
    return;
  }
  const n = aa(e);
  if (!n.svg || !n.linePath || !n.overlay) {
    console.error("updateLineChart: chart was not initialised with renderLineChart");
    return;
  }
  t.xAccessor && (n.xAccessor = t.xAccessor), t.yAccessor && (n.yAccessor = t.yAccessor), t.xFormatter && (n.xFormatter = t.xFormatter), t.yFormatter && (n.yFormatter = t.yFormatter), t.tooltipRenderer && (n.tooltipRenderer = t.tooltipRenderer), t.markerTooltipRenderer && (n.markerTooltipRenderer = t.markerTooltipRenderer), t.color && (n.color = t.color, n.linePath.setAttribute("stroke", n.color), n.focusLine && n.focusLine.setAttribute("stroke", n.color), n.focusCircle && n.focusCircle.setAttribute("stroke", n.color)), t.areaColor && (n.areaColor = t.areaColor, n.areaPath && n.areaPath.setAttribute("fill", n.areaColor)), Object.prototype.hasOwnProperty.call(t, "baseline") && (n.baseline = t.baseline ?? null), Array.isArray(t.markers) && (n.markers = t.markers.slice()), Bo(n), ia(n, t.width, t.height, t.margin);
  const { width: r, height: a } = n;
  n.svg.setAttribute("width", String(r)), n.svg.setAttribute("height", String(a)), n.svg.setAttribute("viewBox", `0 0 ${String(r)} ${String(a)}`), n.overlay.setAttribute("x", "0"), n.overlay.setAttribute("y", "0"), n.overlay.setAttribute("width", Math.max(r, 0).toFixed(2)), n.overlay.setAttribute("height", Math.max(a, 0).toFixed(2)), Array.isArray(t.series) && (n.series = Array.from(t.series));
  const { points: i, range: o } = Ko(n.series, n, {
    xAccessor: n.xAccessor,
    yAccessor: n.yAccessor
  });
  if (n.points = i, n.range = o, i.length === 0) {
    n.linePath.setAttribute("d", ""), n.areaPath && n.areaPath.setAttribute("d", ""), Qt(n), Vt(n), zt(n), It(n);
    return;
  }
  if (i.length === 1) {
    const c = i[0], l = Math.max(
      0.5,
      Math.min(4, Math.max(n.width - n.margin.left - n.margin.right, 1) * 0.01)
    ), u = `M${c.x.toFixed(2)} ${c.y.toFixed(2)} h${l.toFixed(2)}`;
    n.linePath.setAttribute("d", u), n.areaPath && n.areaPath.setAttribute("d", ""), n.focusCircle && (n.focusCircle.setAttribute("cx", c.x.toFixed(2)), n.focusCircle.setAttribute("cy", c.y.toFixed(2)), n.focusCircle.style.opacity = "1"), n.focusLine && (n.focusLine.style.opacity = "0"), zt(n), It(n), Vt(n);
    return;
  }
  const s = Oo(i);
  if (n.linePath.setAttribute("d", s), n.areaPath && o) {
    const c = n.margin.top + o.boundedHeight, l = Wo(i, c);
    n.areaPath.setAttribute("d", l);
  }
  zt(n), It(n), Vt(n);
}
function zt(e) {
  const { xAxis: t, yAxis: n, range: r, margin: a, height: i, yFormatter: o } = e;
  if (!t || !n)
    return;
  if (!r) {
    t.innerHTML = "", n.innerHTML = "";
    return;
  }
  const { minX: s, maxX: c, minY: l, maxY: u, boundedWidth: d, boundedHeight: p } = r, f = Number.isFinite(s) && Number.isFinite(c) && c >= s, g = Number.isFinite(l) && Number.isFinite(u) && u >= l, m = Math.max(d, 0), b = Math.max(p, 0);
  if (t.style.left = Q(a.left), t.style.width = Q(m), t.style.top = Q(i - a.bottom + 6), t.innerHTML = "", f && m > 0) {
    const y = (c - s) / zo, _ = Math.max(2, Math.min(6, Math.round(m / 140) || 4));
    es(e, s, c, _, y).forEach(({ positionRatio: w, label: C }) => {
      const A = document.createElement("div");
      A.className = "line-chart-axis-tick line-chart-axis-tick-x", A.style.position = "absolute", A.style.bottom = "0";
      const E = ne(w, 0, 1);
      A.style.left = Q(E * m);
      let $ = "-50%", M = "center";
      E <= 1e-3 ? ($ = "0", M = "left", A.style.marginLeft = "2px") : E >= 0.999 && ($ = "-100%", M = "right", A.style.marginRight = "2px"), A.style.transform = `translateX(${$})`, A.style.textAlign = M, A.textContent = C, t.appendChild(A);
    });
  }
  n.style.top = Q(a.top), n.style.height = Q(b);
  const h = Math.max(a.left - 6, 0);
  if (n.style.left = "0", n.style.width = Q(Math.max(h, 0)), n.innerHTML = "", g && b > 0) {
    const y = Math.max(2, Math.min(6, Math.round(b / 60) || 4)), _ = ts(l, u, y), S = o;
    _.forEach(({ value: w, positionRatio: C }) => {
      const A = document.createElement("div");
      A.className = "line-chart-axis-tick line-chart-axis-tick-y", A.style.position = "absolute", A.style.left = "0";
      const $ = (1 - ne(C, 0, 1)) * b;
      A.style.top = Q($), A.textContent = S(w, null, -1), n.appendChild(A);
    });
  }
}
function Qo(e, t, n = 4) {
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
  const i = (t - e) / (r - 1), o = en(i), s = Math.floor(e / o) * o, c = Math.ceil(t / o) * o;
  return s === c ? {
    niceMin: e,
    niceMax: t + o
  } : {
    niceMin: s,
    niceMax: c
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
  const i = Math.max(2, r), o = [], s = n - t;
  for (let c = 0; c < i; c += 1) {
    const l = i === 1 ? 0.5 : c / (i - 1), u = t + l * s;
    o.push({
      positionRatio: l,
      label: tr(e, u, a)
    });
  }
  return o;
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
  const r = t - e, a = Math.max(2, n), i = r / (a - 1), o = en(i), s = Math.floor(e / o) * o, c = Math.ceil(t / o) * o, l = [];
  for (let u = s; u <= c + o / 2; u += o) {
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
let sa = null, tn = "range", nn = null;
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
function ca(e) {
  if (!e.length)
    return "";
  const t = e.some((i) => i.fx_coverage_ratio != null && i.fx_coverage_ratio < 1), n = e.some((i) => i.price_coverage_ratio != null && i.price_coverage_ratio < 1), r = e.some((i) => i.stale_price), a = [];
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
  const r = e.querySelector("#analyse-total-wealth"), a = e.querySelector("#analyse-coverage"), i = e.querySelector("#analyse-selection-label");
  if (!r || !a || !i)
    return;
  if (i.textContent = t, !n.length) {
    r.innerHTML = "—", a.innerHTML = "";
    return;
  }
  const o = n[n.length - 1];
  r.innerHTML = Pn(o.total_wealth_eur), a.innerHTML = ca(n);
}
function ar(e, t) {
  const n = {
    dividends: Z(t, "dividends_eur"),
    interest: Z(t, "interest_eur"),
    inbound: Z(t, "inbound_transfers_eur"),
    outbound: Z(t, "outbound_transfers_eur"),
    fees: Z(t, "fees_eur"),
    taxes: Z(t, "taxes_eur")
  }, r = (a, i) => {
    const o = e.querySelector(`#${a}`);
    o && (o.innerHTML = Pn(i));
  };
  r("cashflow-dividends", n.dividends), r("cashflow-interest", n.interest), r("cashflow-inbound", n.inbound), r("cashflow-outbound", -Math.abs(n.outbound)), r("cashflow-fees", -Math.abs(n.fees)), r("cashflow-taxes", -Math.abs(n.taxes));
}
function Ut(e, t = 200) {
  tt != null && window.clearTimeout(tt), tt = window.setTimeout(() => {
    tt = null, e();
  }, t);
}
function An(e, t) {
  return !e || !t ? null : `${e}:${t}`;
}
function is(e) {
  if (!e) {
    de.clear();
    return;
  }
  const t = /* @__PURE__ */ new Set(), n = (r, a) => {
    r.forEach((i) => {
      const o = An(a, i.scope_id);
      o && t.add(o);
    });
  };
  n(e.accounts, "account"), n(e.portfolios, "portfolio"), de.size === 0 ? t.forEach((r) => de.add(r)) : Array.from(de).forEach((r) => {
    t.has(r) || de.delete(r);
  });
}
function os(e, t) {
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
  const o = (s, c, l) => {
    if (!c.length)
      return "";
    const u = c.map((d) => {
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
    return `<div class="scope-group"><div class="scope-title">${s}</div>${u}</div>`;
  };
  r.innerHTML = `
    ${o("Konten", t.accounts, "account")}
    ${o("Depots", t.portfolios, "portfolio")}
  `, r.addEventListener("change", (s) => {
    const c = s.target?.closest('input[type="checkbox"][data-scope-key]');
    if (!c || !c.dataset.scopeKey)
      return;
    const { scopeKey: l } = c.dataset;
    if (!l)
      return;
    c.checked ? de.add(l) : de.delete(l);
    const u = e.closest("#analyse-chart-card");
    u && nn && la(u, nn);
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
    points: e.records.map((o) => ({
      date: o.date,
      value: o.total_wealth_eur
    }))
  }, r = [], a = /* @__PURE__ */ new Map(), i = (o, s) => {
    o.forEach((c) => {
      const l = An(s, c.scope_id);
      l && (a.has(l) || a.set(l, /* @__PURE__ */ new Map()), a.get(l)?.set(c.date, c));
    });
  };
  return e.slices && (i(e.slices.accounts, "account"), i(e.slices.portfolios, "portfolio")), a.forEach((o, s) => {
    if (!de.has(s))
      return;
    const c = t.shift() ?? "#607d8b", l = s.startsWith("account:"), u = s.split(":")[1] ?? "", p = `${l ? "Konto" : "Depot"} ${u}`.trim(), f = o.values().next(), m = (f.done ? void 0 : f.value)?.scope_name ?? p;
    r.push({
      key: s,
      label: m,
      color: c,
      points: e.records.map((b) => {
        const h = o.get(b.date);
        return !h || !Number.isFinite(h.total_wealth_eur) ? null : { date: b.date, value: h.total_wealth_eur };
      }).filter((b) => !!b)
    });
  }), [n, ...r];
}
function ls(e, t) {
  const n = e.__chartState, r = e.querySelector("svg");
  if (!n || !n.range || !n.margin || !r)
    return;
  const { range: a, margin: i } = n;
  r.querySelectorAll(".analyse-slice-series").forEach((o) => {
    o.remove();
  }), t.filter((o) => o.key !== "total").forEach((o) => {
    const s = o.points.map((u, d) => {
      const p = ss(u.date);
      if (p == null || !Number.isFinite(u.value))
        return null;
      const f = a.maxX === a.minX ? 0.5 : (p - a.minX) / (a.maxX - a.minX), g = a.maxY === a.minY ? 0.5 : (u.value - a.minY) / (a.maxY - a.minY), m = i.left + f * a.boundedWidth, b = i.top + (1 - g) * a.boundedHeight;
      return `${d === 0 ? "M" : "L"}${String(m)},${String(b)}`;
    }).filter(Boolean).join(" ");
    if (!s)
      return;
    const c = document.createElementNS("http://www.w3.org/2000/svg", "g");
    c.setAttribute("class", "analyse-slice-series");
    const l = document.createElementNS("http://www.w3.org/2000/svg", "path");
    l.setAttribute("d", s), l.setAttribute("fill", "none"), l.setAttribute("stroke", o.color), l.setAttribute("stroke-width", "2"), l.setAttribute("stroke-linejoin", "round"), l.setAttribute("stroke-linecap", "round"), c.appendChild(l), r.appendChild(c);
  });
}
function la(e, t) {
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
  const i = {
    series: a.points,
    xAccessor: (c) => c.date,
    yAccessor: (c) => c.value,
    xFormatter: (c) => {
      const l = new Date(c);
      return Number.isFinite(l.getTime()) ? l.toLocaleDateString("de-DE") : "";
    },
    yFormatter: (c) => re(c),
    color: a.color,
    areaColor: "rgba(44, 62, 80, 0.12)"
  }, o = n;
  let s = o;
  !o.__chartState || !n.querySelector("svg") ? (n.innerHTML = "", s = oa(n, i)) : (wn(o, i), s = o), s && ls(s, r);
}
function us(e) {
  if (!e.length)
    return null;
  const t = e[0]?.total_wealth_eur ?? 0, n = e[e.length - 1]?.total_wealth_eur ?? 0, r = Z(e, "dividends_eur") + Z(e, "interest_eur"), a = -Math.abs(Z(e, "fees_eur")), i = -Math.abs(Z(e, "taxes_eur")), o = Z(e, "inbound_transfers_eur") - Z(e, "outbound_transfers_eur"), s = Z(e, "performance_neutral_movements"), c = n - t - r - a - i - o - s;
  return {
    startValue: t,
    endValue: n,
    marketGain: c,
    ertraege: r,
    fees: a,
    taxes: i,
    netTransfers: o,
    neutral: s
  };
}
function qt(e, t, n) {
  const r = e.querySelector("#perf-selection-label"), a = e.querySelector("#perf-coverage"), i = e.querySelector("#perf-note");
  if (r && (r.textContent = t), a && (a.innerHTML = ca(n)), !n.length) {
    i && (i.textContent = "Keine Daten für den gewählten Zeitraum."), ["startValue", "endValue", "marketGain", "ertraege", "fees", "taxes", "netTransfers", "neutral"].forEach((c) => {
      const l = e.querySelector(`#perf-${c}`);
      l && (l.innerHTML = "—");
    });
    return;
  }
  i && (i.textContent = "");
  const o = us(n);
  if (!o)
    return;
  const s = (c, l) => {
    const u = e.querySelector(`#perf-${c}`);
    u && (u.innerHTML = Pn(l));
  };
  s("startValue", o.startValue), s("endValue", o.endValue), s("marketGain", o.marketGain), s("ertraege", o.ertraege), s("fees", o.fees), s("taxes", o.taxes), s("netTransfers", o.netTransfers), s("neutral", o.neutral);
}
function rt(e) {
  const n = e.querySelector('input[name="analyse-range-mode"]:checked')?.value === "date" ? "date" : "range";
  tn = n;
  const r = e.querySelector("#analyse-date-single"), a = e.querySelector("#analyse-date-start"), i = e.querySelector("#analyse-date-end"), o = (l) => {
    if (!l)
      return null;
    const u = l.trim();
    return u.length === 10 ? u : null;
  };
  if (n === "date") {
    const l = o(r?.value);
    return l ? { date: l, includeSlices: !0, includeScopes: !0 } : null;
  }
  const s = o(a?.value), c = o(i?.value);
  return !s || !c ? null : s > c ? { range: { start: c, end: s }, includeSlices: !0, includeScopes: !0 } : { range: { start: s, end: c }, includeSlices: !0, includeScopes: !0 };
}
function at(e, t) {
  const n = t.date ? "date" : "range", r = e.querySelector('input[name="analyse-range-mode"][value="date"]'), a = e.querySelector('input[name="analyse-range-mode"][value="range"]');
  r && a && (r.checked = n === "date", a.checked = n === "range");
  const i = e.querySelector("#analyse-date-single"), o = e.querySelector("#analyse-date-start"), s = e.querySelector("#analyse-date-end");
  i && t.date && (i.value = t.date), o && s && t.range && (o.value = t.range.start, s.value = t.range.end);
  const c = e.querySelector(".analyse-range-fields"), l = e.querySelector(".analyse-single-field");
  c && l && (n === "date" ? (c.style.display = "none", l.style.display = "") : (c.style.display = "", l.style.display = "none"));
}
function Ue(e) {
  return e.date ? `Tag: ${e.date}` : e.range ? `Zeitraum: ${e.range.start} – ${e.range.end}` : "";
}
async function it(e, t, n, r, a, i) {
  nt(e, "loading");
  const o = await Io(r, a, i);
  if (o.status === "error") {
    if (nt(e, "error", o.error ?? void 0), t && qt(t, Ue(i), []), n) {
      const c = n.querySelector(".line-chart-container");
      c && c.replaceChildren();
    }
    return;
  }
  const s = o.data;
  if (!s || !Array.isArray(s.records) || s.records.length === 0) {
    if (rr(e, Ue(i), []), ar(e, []), nt(e, "loaded", "Keine Daten für den gewählten Zeitraum."), t && qt(t, Ue(i), []), n) {
      const c = n.querySelector(".line-chart-container");
      c && c.replaceChildren();
    }
    return;
  }
  sa = i, nn = s, is(s.slices), rr(e, Ue(i), s.records), ar(e, s.records), t && qt(t, Ue(i), s.records), n && (os(n, s.slices), la(n, s)), nt(e, "loaded");
}
function ds(e, t, n, r, a) {
  const i = e.querySelector("#analyse-range-apply"), o = e.querySelectorAll('input[name="analyse-range-mode"]'), s = sa ?? Zt().selection ?? as();
  at(e, s);
  const c = () => {
    const u = rt(e);
    u && at(e, u);
  };
  o.forEach((u) => {
    u.addEventListener("change", () => {
      c();
      const d = rt(e);
      d && Ut(() => {
        at(e, d), it(e, t, n, r, a, d);
      });
    });
  }), i && i.addEventListener("click", () => {
    const u = rt(e) ?? s;
    at(e, u), Ut(() => {
      it(e, t, n, r, a, u);
    });
  }), e.querySelectorAll('input[type="date"]').forEach((u) => {
    u.addEventListener("change", () => {
      const d = rt(e);
      d && Ut(() => {
        it(e, t, n, r, a, d);
      });
    });
  }), it(e, t, n, r, a, s);
}
function fs(e, t, n) {
  const a = fn("Analyse", `
    <div class="header-meta-row">
      <span>Vermögensverlauf &amp; Cashflows (Backdating)</span>
    </div>
  `), i = `
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
  `, c = `
    ${a.outerHTML}
    ${i}
    
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
  }, 0), c;
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
const Wt = { min: 0, max: 6 }, bt = { min: 2, max: 4 }, ys = "1Y", ua = [
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
}, bs = /* @__PURE__ */ new Set([0, 2]), vs = /* @__PURE__ */ new Set([1, 3]), Ss = "var(--pp-reader-chart-marker-buy, #2e7d32)", ws = "var(--pp-reader-chart-marker-sell, #c0392b)", ir = "{TICKER}", Ps = "https://chatgpt.com/", Ot = {
  aggregation: "Aggregationsdaten",
  totals: "Kaufsummen",
  eur_total: "EUR-Kaufsumme"
}, Fe = /* @__PURE__ */ new Map(), ut = /* @__PURE__ */ new Map(), Je = /* @__PURE__ */ new Map(), De = /* @__PURE__ */ new Map(), da = "pp-reader:portfolio-positions-updated", Be = /* @__PURE__ */ new Map();
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
function fa(e) {
  return Fe.has(e) || Fe.set(e, /* @__PURE__ */ new Map()), Fe.get(e);
}
function pa(e) {
  return De.has(e) || De.set(e, /* @__PURE__ */ new Map()), De.get(e);
}
function ga(e) {
  if (e) {
    if (Fe.has(e)) {
      try {
        const t = Fe.get(e);
        t && t.clear();
      } catch (t) {
        console.warn("invalidateHistoryCache: Konnte Cache nicht leeren", e, t);
      }
      Fe.delete(e);
    }
    if (De.has(e)) {
      try {
        De.get(e)?.clear();
      } catch (t) {
        console.warn("invalidateHistoryCache: Konnte Marker-Cache nicht leeren", e, t);
      }
      De.delete(e);
    }
  }
}
function ha(e) {
  e && Je.delete(e);
}
function Es(e, t) {
  if (!e || !t)
    return;
  const n = t.securityUuids;
  (Array.isArray(n) ? n : []).includes(e) && (ga(e), ha(e));
}
function xs(e) {
  if (!e || Be.has(e))
    return;
  const t = (n) => {
    ms(n) && Es(e, n.detail);
  };
  try {
    window.addEventListener(da, t), Be.set(e, t);
  } catch (n) {
    console.error("ensureLiveUpdateSubscription: Registrierung fehlgeschlagen", n);
  }
}
function Fs(e) {
  if (!e || !Be.has(e))
    return;
  const t = Be.get(e);
  try {
    t && window.removeEventListener(da, t);
  } catch (n) {
    console.error("removeLiveUpdateSubscription: Entfernen des Listeners fehlgeschlagen", n);
  }
  Be.delete(e);
}
function Ds(e) {
  e && (Fs(e), ga(e), ha(e));
}
function or(e, t) {
  if (!ut.has(e)) {
    ut.set(e, { activeRange: t });
    return;
  }
  const n = ut.get(e);
  n && (n.activeRange = t);
}
function ma(e) {
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
function Te(e) {
  const t = new Date(e.getTime());
  return t.setUTCHours(0, 0, 0, 0), t;
}
function sr(e) {
  return !(e instanceof Date) || Number.isNaN(e.getTime()) ? null : rn(Te(e));
}
function I(e) {
  return fe(e);
}
function ya(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t || null;
}
function Pe(e) {
  const t = ya(e);
  return t ? t.toUpperCase() : null;
}
function $s(e) {
  if (!e)
    return null;
  const t = mn(e.aggregation), n = I(t?.purchase_total_security) ?? (t ? I(
    t.security_currency_total
  ) : null), r = I(t?.purchase_total_account) ?? (t ? I(
    t.account_currency_total
  ) : null);
  if (oe(n) && oe(r)) {
    const s = n / r;
    if (oe(s))
      return s;
  }
  const a = Le(e.average_cost), i = I(a?.native) ?? I(a?.security), o = I(a?.account) ?? I(a?.eur);
  if (oe(i) && oe(o)) {
    const s = i / o;
    if (oe(s))
      return s;
  }
  return null;
}
function _a(e, t = "Unbekannter Fehler") {
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
  const n = Te(t instanceof Date ? t : /* @__PURE__ */ new Date()), r = _s[e], a = sr(n), i = {};
  if (a != null && (i.end_date = a), Number.isFinite(r) && r > 0) {
    const o = new Date(n.getTime());
    o.setUTCDate(o.getUTCDate() - (r - 1));
    const s = sr(o);
    s != null && (i.start_date = s);
  }
  return i;
}
function Cn(e) {
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
      return Number.isNaN(n.getTime()) ? null : Te(n);
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
          return Te(r);
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
    let r = I(t.close);
    if (r == null) {
      const i = I(t.close_raw);
      i != null && (r = i / 1e8);
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
  const r = [], a = Pe(t), i = a || "EUR", o = $s(n);
  return e.forEach((s, c) => {
    const l = typeof s.type == "number" ? s.type : Number(s.type), u = bs.has(l), d = vs.has(l);
    if (!u && !d)
      return;
    const p = ks(s.date);
    let f = I(s.price);
    if (!p || f == null)
      return;
    const g = Pe(s.currency_code), m = a ?? g ?? i;
    g && a && g !== a && oe(o) && (f *= o);
    const b = I(s.shares), h = I(s.net_price_eur), y = u ? "Kauf" : "Verkauf", _ = b != null ? `${xn(b)} @ ` : "", S = `${y} ${_}${ge(f)} ${m}`, w = d && h != null ? `${S} (netto ${ge(h)} EUR)` : S, C = u ? Ss : ws, A = typeof s.uuid == "string" && s.uuid.trim() || `${y}-${p.getTime().toString()}-${c.toString()}`;
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
        shares: b,
        price: f,
        netPriceEur: h,
        date: p.toISOString(),
        portfolio: s.portfolio
      }
    });
  }), r;
}
function Nn(e) {
  const t = I(e?.last_price_native) ?? I(e?.last_price?.native) ?? null;
  if (R(t))
    return t;
  if (Pe(e?.currency_code) === "EUR") {
    const r = I(e?.last_price_eur);
    if (R(r))
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
function on(e, t) {
  let n = [];
  Array.isArray(e) && (n = e.map((l) => ({
    ...l
  })));
  const r = n.slice(), a = Nn(t);
  if (!R(a))
    return r;
  const i = Ts(t) ?? Date.now(), o = new Date(i);
  if (Number.isNaN(o.getTime()))
    return r;
  const s = rn(Te(o));
  let c = null;
  for (let l = r.length - 1; l >= 0; l -= 1) {
    const u = r[l], d = Cn(u.date);
    if (!d)
      continue;
    const p = rn(Te(d));
    if (c == null && (c = p), p === s)
      return u.close !== a && (r[l] = { ...u, close: a }), r;
    if (p < s)
      break;
  }
  return c != null && c > s || r.push({
    date: o,
    close: a
  }), r;
}
function R(e) {
  return typeof e == "number" && Number.isFinite(e);
}
function oe(e) {
  return typeof e == "number" && Number.isFinite(e) && e > 0;
}
function Ke(e, t, n) {
  if (!R(e) || !R(t))
    return !1;
  const r = Math.abs(e - t), a = Math.max(Math.abs(e), Math.abs(t), 1);
  return r <= a * 1e-4;
}
function Rs(e, t) {
  return !R(t) || t === 0 || !R(e) ? null : vi((e - t) / t * 100);
}
function ba(e, t) {
  if (e.length === 0)
    return { priceChange: null, priceChangePct: null };
  const n = e[0], r = I(n.close);
  if (!R(r) || r === 0)
    return { priceChange: null, priceChangePct: null };
  const a = e[e.length - 1], i = I(a.close), o = I(t) ?? i;
  if (!R(o))
    return { priceChange: null, priceChangePct: null };
  const s = o - r, c = Object.is(s, -0) ? 0 : s, l = Rs(o, r);
  return { priceChange: c, priceChangePct: l };
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
  const n = ge(e);
  if (n === "—")
    return '<span class="value neutral">—</span>';
  const r = En(e, bt.max), a = t ? `&nbsp;${t}` : "";
  return `<span class="value ${r}">${n}${a}</span>`;
}
function Ms(e) {
  return R(e) ? `<span class="value ${En(e, 2)} value--percentage">${re(e)}&nbsp;%</span>` : '<span class="value neutral">—</span>';
}
function va(e, t, n, r) {
  const a = e, i = a.length > 0 ? a : "Zeitraum";
  return `
    <div class="security-info-bar" data-range="${a}">
      <div class="security-info-item">
        <span class="label">Preisänderung (${i})</span>
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
      ${ua.map((n) => `
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
function Sa(e, t = { status: "empty" }) {
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
      const r = _a(
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
  const t = I(e);
  if (t == null)
    return "—";
  const n = Math.abs(t % 1) > 0, r = n ? 2 : Wt.min, a = n ? Wt.max : Wt.min;
  return t.toLocaleString("de-DE", {
    minimumFractionDigits: r,
    maximumFractionDigits: a
  });
}
function ge(e) {
  const t = I(e);
  return t == null ? "—" : t.toLocaleString("de-DE", {
    minimumFractionDigits: bt.min,
    maximumFractionDigits: bt.max
  });
}
function Is(e, t) {
  const n = ge(e), r = `&nbsp;${t}`;
  return `<span class="${En(e, bt.max)}">${n}${r}</span>`;
}
function wa(e) {
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
        data-symbol="${wa(e)}"
      >
        Check recent news via ChatGPT
      </button>
    </div>
  `;
}
async function Us(e) {
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
function qs(e) {
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
  const r = Le(e?.average_cost), a = r?.account ?? (R(t) ? t : I(t));
  if (!R(a))
    return null;
  const i = e?.account_currency_code ?? e?.account_currency;
  if (typeof i == "string" && i.trim())
    return i.trim().toUpperCase();
  const o = Pe(e?.currency_code) ?? "", s = r?.security ?? r?.native ?? (R(n) ? n : I(n)), c = mn(e?.aggregation);
  if (o && R(s) && Ke(a, s))
    return o;
  const l = I(c?.purchase_total_security) ?? I(e?.purchase_total_security), u = I(c?.purchase_total_account) ?? I(e?.purchase_total_account);
  let d = null;
  if (R(l) && l !== 0 && R(u) && (d = u / l), r?.source === "eur_total")
    return "EUR";
  const f = r?.eur;
  if (R(f) && Ke(a, f))
    return "EUR";
  const g = I(e?.purchase_value_eur);
  return R(g) ? "EUR" : d != null && Ke(d, 1) ? o || null : o === "EUR" ? "EUR" : o || "EUR";
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
  for (const i of n) {
    const o = t?.[i], s = St(o);
    if (s != null)
      return s;
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
function Ks(e, t) {
  if (!e)
    return null;
  const n = Pe(e.currency_code) ?? "", r = Le(e.average_cost);
  if (!r || !n)
    return null;
  const a = r.native ?? r.security ?? null;
  let o = r.account ?? r.eur ?? null, s = Pe(t) ?? "";
  if (oe(r.eur) && (!s || s === n) && (o = r.eur, s = "EUR"), !n || !s || n === s || !oe(a) || !oe(o))
    return null;
  const c = o / a;
  if (!Number.isFinite(c) || c <= 0)
    return null;
  const l = cr(c);
  if (!l)
    return null;
  let u = null;
  if (c > 0) {
    const y = 1 / c;
    Number.isFinite(y) && y > 0 && (u = cr(y));
  }
  const d = Os(e), p = Bs(d), f = [`FX-Kurs (Kauf): 1 ${n} = ${l} ${s}`];
  u && f.push(`1 ${s} = ${u} ${n}`);
  const g = [], m = r.source, b = m in Ot ? Ot[m] : Ot.aggregation;
  if (g.push(`Quelle: ${b}`), R(r.coverage_ratio)) {
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
function js(e) {
  if (!e)
    return '<div class="meta-error">Keine Snapshot-Daten verfügbar.</div>';
  const t = e.currency_code || "EUR", n = e.total_holdings_precise ?? e.total_holdings, r = xn(n), a = e.last_price_native ?? e.last_price?.native ?? e.last_price_eur, i = ge(a), o = i === "—" ? null : `${i}${`&nbsp;${t}`}`, s = I(e.market_value_eur) ?? I(e.current_value_eur) ?? null, c = Le(e.average_cost), l = c?.native ?? c?.security ?? null, u = c?.eur ?? null, p = c?.account ?? null ?? u, f = Ae(e.performance), g = f?.day_change ?? null, m = g?.price_change_native ?? null, b = g?.price_change_eur ?? null, h = R(m) ? m : b, y = R(m) ? t : "EUR", _ = (T, V = "") => {
    const W = ["value"];
    return V && W.push(...V.split(" ").filter(Boolean)), `<span class="${W.join(" ")}">${T}</span>`;
  }, S = (T = "") => {
    const V = ["value--missing"];
    return T && V.push(T), _("—", V.join(" "));
  }, w = (T, V = "") => {
    if (!R(T))
      return S(V);
    const W = ["value--gain"];
    return V && W.push(V), _(Ja(T), W.join(" "));
  }, C = (T, V = "") => {
    if (!R(T))
      return S(V);
    const W = ["value--gain-percentage"];
    return V && W.push(V), _(Qa(T), W.join(" "));
  }, A = o ? _(o, "value--price") : S("value--price"), E = r === "—" ? S("value--holdings") : _(r, "value--holdings"), $ = R(s) ? _(`${re(s)}&nbsp;€`, "value--market-value") : S("value--market-value"), M = R(h) ? _(
    Is(h, y),
    "value--gain value--absolute"
  ) : S("value--absolute"), P = C(
    g?.change_pct,
    "value--percentage"
  ), N = w(
    f?.total_change_eur,
    "value--absolute"
  ), H = C(
    f?.total_change_pct,
    "value--percentage"
  ), F = Ws(
    e,
    p,
    l
  ), k = Ks(
    e,
    F
  ), Y = k ? ` title="${wa(k)}"` : "", v = [], x = R(u);
  R(l) ? v.push(
    _(
      `${ge(l)}${`&nbsp;${t}`}`,
      "value--average value--average-native"
    )
  ) : v.push(
    S("value--average value--average-native")
  );
  let L = null, K = null;
  return x && (t !== "EUR" || !R(l) || !Ke(u, l)) ? (L = u, K = "EUR") : R(p) && F && (F !== t || !Ke(p, l ?? NaN)) && (L = p, K = F), L != null && R(L) && v.push(
    _(
      `${ge(L)}${K ? `&nbsp;${K}` : ""}`,
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
          ${M}
          ${P}
        </div>
      </div>
      <div class="security-meta-item security-meta-item--total-change">
        <span class="label">Gesamtänderung</span>
        <div class="value-group">
          ${N}
          ${H}
        </div>
      </div>
      <div class="security-meta-item security-meta-item--holdings">
        <span class="label">Bestand</span>
        <div class="value-group">${E}</div>
      </div>
      <div class="security-meta-item security-meta-item--market-value">
        <span class="label">Marktwert (EUR)</span>
        <div class="value-group">${$}</div>
      </div>
    </div>
  `;
}
function Ys(e) {
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
function Gs(e, t, {
  currency: n,
  baseline: r,
  markers: a
} = {}) {
  const i = e.clientWidth || e.offsetWidth || 0, o = i > 0 ? i : 640, s = Math.min(Math.max(Math.floor(o * 0.5), 240), 440), c = (n || "").toUpperCase() || "EUR", l = R(r) ? r : null, u = Math.max(48, Math.min(72, Math.round(o * 0.075))), d = Math.max(28, Math.min(56, Math.round(o * 0.05))), p = Math.max(40, Math.min(64, Math.round(s * 0.14)));
  return {
    width: o,
    height: s,
    margin: {
      top: 18,
      right: d,
      bottom: p,
      left: u
    },
    series: t,
    yFormatter: (g) => ge(g),
    tooltipRenderer: ({ xFormatted: g, yFormatted: m }) => `
      <div class="chart-tooltip-date">${g}</div>
      <div class="chart-tooltip-value">${m}&nbsp;${c}</div>
    `,
    markerTooltipRenderer: ({
      marker: g,
      xFormatted: m,
      yFormatted: b
    }) => {
      const h = g.payload ?? {}, y = ya(h.type), _ = I(h.shares), S = _ != null ? xn(_) : null, w = Pe(h.currency) ?? c, C = [];
      y && C.push(y), S && C.push(`${S} Stück`), m && C.push(`am ${m}`);
      const A = C.join(" ").trim() || (typeof g.label == "string" ? g.label : m), E = typeof b == "string" && b.trim() ? b.trim() : ge(h.price), $ = E ? `${E}${w ? `&nbsp;${w}` : ""}` : w;
      return `
      <div class="chart-tooltip-date">${A}</div>
      <div class="chart-tooltip-value">${$}</div>
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
    e.innerHTML = "", a = oa(e, r), a && ur.set(e, a);
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
  const i = e.querySelector(".security-info-bar");
  if (!i || !i.parentElement)
    return;
  const o = document.createElement("div");
  o.innerHTML = va(t, n, r, a).trim();
  const s = o.firstElementChild;
  s && i.parentElement.replaceChild(s, i);
}
function fr(e, t, n, r, a = {}) {
  const i = e.querySelector(".security-detail-placeholder");
  if (i && (i.innerHTML = `
    <h2>Historie</h2>
    ${Sa(t, n)}
  `, n.status === "loaded" && Array.isArray(r) && r.length)) {
    const o = i.querySelector(".history-chart");
    o && requestAnimationFrame(() => {
      Xs(o, r, a);
    });
  }
}
function Js(e) {
  const {
    root: t,
    hass: n,
    panelConfig: r,
    securityUuid: a,
    snapshot: i,
    initialRange: o,
    initialHistory: s,
    initialHistoryState: c
  } = e;
  setTimeout(() => {
    const l = t.querySelector(".security-range-selector");
    if (!l)
      return;
    const u = fa(a), d = pa(a), p = lr(i);
    Array.isArray(s) && c.status !== "error" && u.set(o, s), xs(a), or(a, o), dr(l, o);
    const g = on(
      s,
      i
    );
    let m = c;
    m.status !== "error" && (m = g.length ? { status: "loaded" } : { status: "empty" }), fr(
      t,
      o,
      m,
      g,
      {
        currency: i?.currency_code,
        baseline: p,
        markers: d.get(o) ?? []
      }
    );
    const b = async (h) => {
      if (h === ma(a))
        return;
      const y = l.querySelector(
        `.security-range-button[data-range="${h}"]`
      );
      y && (y.disabled = !0, y.classList.add("loading"));
      let _ = u.get(h) ?? null, S = d.get(h) ?? null, w = null, C = [];
      if (_)
        w = _.length ? { status: "loaded" } : { status: "empty" };
      else
        try {
          const N = vt(h), H = await dt(
            n,
            r,
            a,
            N
          );
          _ = an(H.prices), S = wt(
            H.transactions,
            i?.currency_code,
            i
          ), u.set(h, _), S = Array.isArray(S) ? S : [], d.set(h, S), w = _.length ? { status: "loaded" } : { status: "empty" };
        } catch (N) {
          console.error("Range-Wechsel: Historie konnte nicht geladen werden", N), _ = [], S = [], w = {
            status: "error",
            message: Pa(N) || "Die historischen Daten konnten aufgrund eines Fehlers nicht geladen werden."
          };
        }
      if (!Array.isArray(S))
        try {
          const N = vt(h), H = await dt(
            n,
            r,
            a,
            N
          );
          S = wt(
            H.transactions,
            i?.currency_code,
            i
          ), S = Array.isArray(S) ? S : [], d.set(h, S);
        } catch (N) {
          console.error("Range-Wechsel: Transaktionsmarker konnten nicht geladen werden", N), S = [];
        }
      C = on(_, i), w.status !== "error" && (w = C.length ? { status: "loaded" } : { status: "empty" });
      const A = Nn(i), { priceChange: E, priceChangePct: $ } = ba(
        C,
        A
      ), M = Array.isArray(S) ? S : [];
      or(a, h), dr(l, h), Zs(
        t,
        h,
        E,
        $,
        i?.currency_code
      );
      const P = lr(i);
      fr(
        t,
        h,
        w,
        C,
        {
          currency: i?.currency_code,
          baseline: P,
          markers: M
        }
      );
    };
    l.addEventListener("click", (h) => {
      const y = h.target?.closest(".security-range-button");
      if (!y || y.disabled)
        return;
      const { range: _ } = y.dataset;
      !_ || !ua.includes(_) || b(_);
    });
  }, 0);
}
function Qs(e) {
  const { root: t, hass: n, panelConfig: r, tickerSymbol: a } = e;
  let i = null, o = !1;
  const s = async () => {
    try {
      i = await pi(n, r);
    } catch (c) {
      o = !0, console.warn("News-Prompt: Prefetch fehlgeschlagen", c);
    }
  };
  s(), setTimeout(() => {
    const c = t.querySelector(".news-prompt-button");
    if (!c)
      return;
    const l = (d) => {
      const p = (i?.placeholder || ir).trim() || ir, f = (i?.prompt_template || "").trim(), g = (i?.link || "").trim() || Ps;
      return { body: f ? f.includes(p) ? f.split(p).join(d) : `${f}

Ticker: ${d}` : `Ticker: ${d}`, link: g };
    }, u = async () => {
      const d = (c.dataset.symbol || a || "").trim();
      if (!d) {
        console.warn("News-Prompt: Kein Ticker verfügbar");
        return;
      }
      if (!c.classList.contains("loading")) {
        c.disabled = !0, c.classList.add("loading");
        try {
          const { body: p, link: f } = l(d);
          await Us(p) || console.warn("News-Prompt: Clipboard unavailable – prompt could not be copied"), qs(f), !i && !o && s();
        } catch (p) {
          console.error("News-Prompt: Kopiervorgang fehlgeschlagen", p);
        } finally {
          c.classList.remove("loading"), c.disabled = !1;
        }
      }
    };
    c.addEventListener("click", () => {
      u();
    });
  }, 0);
}
async function ec(e, t, n, r) {
  if (!r)
    return console.error("renderSecurityDetail: securityUuid fehlt"), '<div class="card"><h2>Fehler</h2><p>Kein Wertpapier angegeben.</p></div>';
  const a = Ns(r);
  let i = null, o = null;
  try {
    const P = await fi(
      t,
      n,
      r
    ), N = P.snapshot;
    i = N && typeof N == "object" ? N : P;
  } catch (P) {
    console.error("renderSecurityDetail: Snapshot konnte nicht geladen werden", P), o = _a(P);
  }
  const s = i || a, c = !!(a && !i), l = (s?.source ?? "") === "cache";
  r && Cs(r, s ?? null);
  const u = s && (c || l) ? As({ fallbackUsed: c, flaggedAsCache: l }) : "", d = s?.name || "Wertpapierdetails", p = fn(d, "", { includeMeta: !1 });
  p.classList.add("security-detail-header");
  const f = Ys(s);
  if (o)
    return `
      ${p.outerHTML}
      ${f}
      ${u}
      <div class="card error-card">
        <h2>Fehler beim Laden</h2>
        <p>${o}</p>
      </div>
    `;
  const g = ma(r), m = fa(r), b = pa(r);
  let h = m.has(g) ? m.get(g) ?? null : null, y = { status: "empty" }, _ = b.has(g) ? b.get(g) ?? null : null;
  if (Array.isArray(h))
    y = h.length ? { status: "loaded" } : { status: "empty" };
  else {
    h = [];
    try {
      const P = vt(g), N = await dt(
        t,
        n,
        r,
        P
      );
      h = an(N.prices), _ = wt(
        N.transactions,
        s?.currency_code,
        s
      ), m.set(g, h), _ = Array.isArray(_) ? _ : [], b.set(g, _), y = h.length ? { status: "loaded" } : { status: "empty" };
    } catch (P) {
      console.error(
        "renderSecurityDetail: Historie konnte nicht geladen werden",
        P
      ), y = {
        status: "error",
        message: Pa(P) || "Die historischen Daten konnten aufgrund eines Fehlers nicht geladen werden."
      };
    }
  }
  if (!Array.isArray(_))
    try {
      const P = vt(g), N = await dt(
        t,
        n,
        r,
        P
      ), H = an(N.prices);
      _ = wt(
        N.transactions,
        s?.currency_code,
        s
      ), m.set(g, H), _ = Array.isArray(_) ? _ : [], b.set(g, _), h = H, y = h.length ? { status: "loaded" } : { status: "empty" };
    } catch (P) {
      console.error(
        "renderSecurityDetail: Transaktionsmarker konnten nicht geladen werden",
        P
      ), _ = [];
    }
  const S = on(
    h,
    s
  );
  y.status !== "error" && (y = S.length ? { status: "loaded" } : { status: "empty" });
  const w = Vs(s, r), C = zs(w), A = Nn(s), { priceChange: E, priceChangePct: $ } = ba(
    S,
    A
  ), M = va(
    g,
    E,
    $,
    s?.currency_code
  );
  return Js({
    root: e,
    hass: t,
    panelConfig: n,
    securityUuid: r,
    snapshot: s,
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
    ${M}
    ${Hs(g)}
    <div class="card security-detail-placeholder">
      <h2>Historie</h2>
      ${Sa(g, y)}
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
    render: (r, a, i) => ec(r, a, i, n),
    cleanup: () => {
      Ds(n);
    }
  }));
}
const nc = Za, sn = "pp-reader-sticky-anchor", Pt = "overview", rc = "analyse", cn = "security:", ac = [
  { key: Pt, title: "Dashboard", render: Yr },
  { key: rc, title: "Analyse", render: fs }
], Re = /* @__PURE__ */ new Map(), Qe = [], At = /* @__PURE__ */ new Map();
let ln = null, Bt = !1, $e = null, q = 0, Kt = null;
function Ct(e) {
  return typeof e == "object" && e !== null;
}
function Aa(e) {
  return typeof e == "object" && e !== null && typeof e.then == "function";
}
function ic(e) {
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
  if (!$e)
    return !1;
  const e = Fa($e);
  return e || ($e = null), e;
}
function ue() {
  const e = Qe.map((t) => Re.get(t)).filter((t) => !!t);
  return [...ac, ...e];
}
function uc(e) {
  const t = ue();
  return e < 0 || e >= t.length ? null : t[e];
}
function Ca(e) {
  if (!e)
    return null;
  const t = e, n = t.ppreader ?? t.pp_reader;
  return n || (Object.values(t).find((a) => !a || typeof a != "object" ? !1 : a.webcomponent_name === "pp-reader-panel") ?? null);
}
function Na() {
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
  const a = ue(), i = gr(e);
  if (i === q) {
    e > q && lc();
    return;
  }
  Na();
  const o = q >= 0 && q < a.length ? a[q] : null, s = o ? Fn(o.key) : null;
  let c = i;
  if (s) {
    const l = i >= 0 && i < a.length ? a[i] : null;
    if (l && l.key === Pt && mc(s, { suppressRender: !0 })) {
      const p = ue().findIndex((f) => f.key === Pt);
      c = p >= 0 ? p : 0;
    }
  }
  if (!Bt) {
    Bt = !0;
    try {
      q = gr(c);
      const l = q;
      await Da(t, n, r), hc(l);
    } catch (l) {
      console.error("navigateToPage: Fehler beim Rendern des Tabs", l);
    } finally {
      Bt = !1;
    }
  }
}
function Nt(e, t, n, r) {
  dc(q + e, t, n, r);
}
function fc(e, t) {
  if (!e || !t || typeof t.render != "function") {
    console.error("registerDetailTab: Ungültiger Tab-Descriptor", e, t);
    return;
  }
  const n = Fn(e);
  if (n) {
    const a = At.get(n);
    a && a !== e && Ea(a);
  }
  const r = {
    ...t,
    key: e
  };
  Re.set(e, r), n && At.set(n, e), Qe.includes(e) || Qe.push(e);
}
function Ea(e) {
  if (!e)
    return;
  const t = Re.get(e);
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
  Re.delete(e);
  const n = Qe.indexOf(e);
  n >= 0 && Qe.splice(n, 1);
  const r = Fn(e);
  r && At.get(r) === e && At.delete(r);
}
function pc(e) {
  return Re.has(e);
}
function hr(e) {
  return Re.get(e) ?? null;
}
function gc(e) {
  if (e != null && typeof e != "function") {
    console.error("setSecurityDetailTabFactory: Erwartet Funktion oder null", e);
    return;
  }
  ln = e ?? null;
}
function xa(e) {
  return `${cn}${e}`;
}
function Dt() {
  for (const t of mi())
    if (t.isConnected)
      return t;
  const e = /* @__PURE__ */ new Set();
  for (const t of yi())
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
function Fa(e) {
  if (!e)
    return console.error("openSecurityDetail: Ungültige securityUuid", e), !1;
  const t = xa(e);
  let n = hr(t);
  if (!n && typeof ln == "function")
    try {
      const i = ln(e);
      i && typeof i.render == "function" ? (fc(t, i), n = hr(t)) : console.error("openSecurityDetail: Factory lieferte ungültigen Descriptor", i);
    } catch (i) {
      console.error("openSecurityDetail: Fehler beim Erzeugen des Tab-Descriptors", i);
    }
  if (!n)
    return console.warn(`openSecurityDetail: Kein Detail-Tab für ${e} verfügbar`), !1;
  Na();
  let a = ue().findIndex((i) => i.key === t);
  return a === -1 && (a = ue().findIndex((o) => o.key === t), a === -1) ? (console.error("openSecurityDetail: Tab nach Registrierung nicht auffindbar"), !1) : (q = a, $e = null, un(), !0);
}
function mc(e, t = {}) {
  if (!e)
    return console.error("closeSecurityDetail: Ungültige securityUuid", e), !1;
  const { suppressRender: n = !1 } = t, r = xa(e);
  if (!pc(r))
    return !1;
  const i = ue().findIndex((c) => c.key === r), o = i === q;
  Ea(r);
  const s = ue();
  if (!s.length)
    return q = 0, n || un(), !0;
  if ($e = e, o) {
    const c = s.findIndex((l) => l.key === Pt);
    c >= 0 ? q = c : q = Math.min(Math.max(i - 1, 0), s.length - 1);
  } else q >= s.length && (q = Math.max(0, s.length - 1));
  return n || un(), !0;
}
async function Da(e, t, n) {
  let r = n;
  r || (r = Ca(t ? t.panels : null));
  const a = ue();
  q >= a.length && (q = Math.max(0, a.length - 1));
  const i = uc(q);
  if (!i) {
    console.error("renderTab: Kein gültiger Tab oder keine render-Methode gefunden!");
    return;
  }
  let o;
  try {
    o = await i.render(e, t, r);
  } catch (u) {
    console.error("renderTab: Fehler beim Rendern des Tabs:", u), e.innerHTML = `<div class="card"><h2>Fehler</h2><pre>${ic(u)}</pre></div>`;
    return;
  }
  e.innerHTML = o ?? "", i.render === Yr && Sn(e);
  const c = await new Promise((u) => {
    const d = window.setInterval(() => {
      const p = e.querySelector(".header-card");
      p && (clearInterval(d), u(p));
    }, 50);
  });
  let l = e.querySelector(`#${sn}`);
  if (!l) {
    l = document.createElement("div"), l.id = sn;
    const u = c.parentNode;
    u && "insertBefore" in u && u.insertBefore(l, c);
  }
  bc(e, t, n), _c(e, t, n), yc(e);
}
function yc(e) {
  const t = e.querySelector(".header-card"), n = e.querySelector(`#${sn}`);
  if (!t || !n) {
    console.error("Fehlende Elemente für das Scrollverhalten: headerCard oder anchor.");
    return;
  }
  Kt?.disconnect(), Kt = new IntersectionObserver(
    ([r]) => {
      r.isIntersecting ? t.classList.remove("sticky") : t.classList.add("sticky");
    },
    {
      root: null,
      rootMargin: "0px 0px 0px 0px",
      threshold: 0
    }
  ), Kt.observe(n);
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
  const a = r.querySelector("#nav-left"), i = r.querySelector("#nav-right");
  if (!a || !i) {
    console.error("Navigationspfeile nicht gefunden!");
    return;
  }
  a.addEventListener("click", () => {
    Nt(-1, e, t, n);
  }), i.addEventListener("click", () => {
    Nt(1, e, t, n);
  }), vc(r);
}
function vc(e) {
  const t = e.querySelector("#nav-left"), n = e.querySelector("#nav-right");
  if (t && (q === 0 ? (t.disabled = !0, t.classList.add("disabled")) : (t.disabled = !1, t.classList.remove("disabled"))), n) {
    const r = ue(), i = !(q === r.length - 1) || !!$e;
    n.disabled = !i, n.classList.toggle("disabled", !i);
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
    this._panel || (this._panel = Ca(this._hass.panels ?? null));
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
    const n = Ln(this._hass, this._panel);
    if (!n)
      return;
    const r = t.data;
    if (!oc(r.data_type) || r.entry_id && r.entry_id !== n)
      return;
    const a = cc(r.data_type, r.data);
    a && (this._queueUpdate(a.type, a.data), this._doRender(a.type, a.data));
  }
  _doRender(t, n) {
    switch (t) {
      case "accounts":
        oo(
          n,
          this._root
        );
        break;
      case "last_file_update":
        mo(
          n,
          this._root
        );
        break;
      case "portfolio_values":
        lo(
          n,
          this._root
        );
        break;
      case "portfolio_positions":
        po(
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
    const n = Da(this._root, this._hass, this._panel);
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
  po as handlePortfolioPositionsUpdate,
  pc as hasDetailTab,
  Fa as openSecurityDetail,
  Nc as reapplyPositionsSort,
  wc as registerDashboardElement,
  fc as registerDetailTab,
  Ac as registerPanelHost,
  gc as setSecurityDetailTabFactory,
  Pc as unregisterDashboardElement,
  Ea as unregisterDetailTab,
  Cc as unregisterPanelHost,
  jr as updatePortfolioFooterFromDom
};
//# sourceMappingURL=dashboard.BujnritE.js.map
