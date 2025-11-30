var _i = Object.defineProperty;
var yi = (e, t, n) => t in e ? _i(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : e[t] = n;
var G = (e, t, n) => yi(e, typeof t != "symbol" ? t + "" : t, n);
function ln(e, t) {
  try {
    t();
  } catch (n) {
    console.warn(`addSwipeEvents: ${e} handler threw`, n);
  }
}
function bi(e, t, n) {
  let r = null;
  const i = (l) => {
    l < -50 ? ln("left", t) : l > 50 && ln("right", n);
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
function L(e, t, n = void 0, r = void 0) {
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
    const g = typeof c == "number" ? c : o(c);
    return Number.isFinite(g) ? g.toLocaleString("de-DE", {
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
          const f = d.day_change;
          if (f && typeof f == "object") {
            const p = e === "day_change_pct" ? f.change_pct : f.value_change_eur ?? f.price_change_eur;
            typeof p == "number" && (t = p);
          }
        } else {
          const f = d[e];
          typeof f == "number" && (t = f);
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
function ve(e, t, n = [], r = {}) {
  const { sortable: i = !1, defaultSort: o } = r, a = (o == null ? void 0 : o.key) ?? "", s = (o == null ? void 0 : o.dir) === "desc" ? "desc" : "asc", c = (m) => {
    if (m == null)
      return "";
    let _ = "";
    if (typeof m == "string")
      _ = m;
    else if (typeof m == "number" && Number.isFinite(m))
      _ = m.toString();
    else if (typeof m == "boolean")
      _ = m ? "true" : "false";
    else if (m instanceof Date && Number.isFinite(m.getTime()))
      _ = m.toISOString();
    else
      return "";
    return _.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  };
  let l = "<table><thead><tr>";
  t.forEach((m) => {
    const _ = m.align === "right" ? ' class="align-right"' : "";
    i && m.key ? l += `<th${_} data-sort-key="${m.key}">${m.label}</th>` : l += `<th${_}>${m.label}</th>`;
  }), l += "</tr></thead><tbody>", e.forEach((m) => {
    l += "<tr>", t.forEach((_) => {
      const b = _.align === "right" ? ' class="align-right"' : "";
      l += `<td${b}>${L(_.key, m[_.key], m)}</td>`;
    }), l += "</tr>";
  });
  const u = {}, g = {};
  t.forEach((m) => {
    if (n.includes(m.key)) {
      const _ = e.reduce(
        (b, S) => {
          let P = S[m.key];
          if ((m.key === "gain_abs" || m.key === "gain_pct") && (typeof P != "number" || !Number.isFinite(P))) {
            const N = S.performance;
            if (typeof N == "object" && N !== null) {
              const A = N[m.key];
              typeof A == "number" && (P = A);
            }
          } else if ((m.key === "day_change_abs" || m.key === "day_change_pct") && (typeof P != "number" || !Number.isFinite(P))) {
            const N = S.performance;
            if (typeof N == "object" && N !== null) {
              const A = N.day_change;
              if (A && typeof A == "object") {
                const $ = m.key === "day_change_pct" ? A.change_pct : A.value_change_eur ?? A.price_change_eur;
                typeof $ == "number" && (P = $);
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
      _.hasValue ? (u[m.key] = _.total, g[m.key] = { hasValue: !0 }) : (u[m.key] = null, g[m.key] = { hasValue: !1 });
    }
  });
  const d = u.gain_abs ?? null;
  if (d != null) {
    const m = u.purchase_value ?? null;
    if (m != null && m > 0)
      u.gain_pct = d / m * 100;
    else {
      const _ = u.current_value ?? null;
      _ != null && _ !== 0 && (u.gain_pct = d / (_ - d) * 100);
    }
  }
  const f = u.day_change_abs ?? null;
  if (f != null) {
    const m = u.current_value ?? null;
    if (m != null) {
      const _ = m - f;
      _ && (u.day_change_pct = f / _ * 100, g.day_change_pct = { hasValue: !0 });
    }
  }
  const p = Number.isFinite(u.gain_pct ?? NaN) ? u.gain_pct : null;
  let h = "", y = "neutral";
  if (p != null && (h = `${ae(p)} %`, p > 0 ? y = "positive" : p < 0 && (y = "negative")), l += '<tr class="footer-row">', t.forEach((m, _) => {
    const b = m.align === "right" ? ' class="align-right"' : "";
    if (_ === 0) {
      l += `<td${b}>Summe</td>`;
      return;
    }
    if (u[m.key] != null) {
      let P = "";
      m.key === "gain_abs" && h && (P = ` data-gain-pct="${c(h)}" data-gain-sign="${c(y)}"`), l += `<td${b}${P}>${L(m.key, u[m.key], void 0, g[m.key])}</td>`;
      return;
    }
    if (m.key === "gain_pct" && u.gain_pct != null) {
      l += `<td${b}>${L("gain_pct", u.gain_pct, void 0, g[m.key])}</td>`;
      return;
    }
    const S = g[m.key] ?? { hasValue: !1 };
    l += `<td${b}>${L(m.key, null, void 0, S)}</td>`;
  }), l += "</tr>", l += "</tbody></table>", i)
    try {
      const m = document.createElement("template");
      m.innerHTML = l.trim();
      const _ = m.content.querySelector("table");
      if (_)
        return _.classList.add("sortable-table"), a && (_.dataset.defaultSort = a, _.dataset.defaultDir = s), _.outerHTML;
    } catch (m) {
      console.warn("makeTable(sortable): Injection fehlgeschlagen:", m);
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
function ae(e, t = 2, n = 2) {
  return (Number.isNaN(e) ? 0 : e).toLocaleString("de-DE", {
    minimumFractionDigits: t,
    maximumFractionDigits: n
  });
}
function vi(e) {
  const t = Number.isNaN(e) ? 0 : e;
  return `<span class="${Ot(t, 2)}">${ae(t)}&nbsp;€</span>`;
}
function Si(e) {
  const t = Number.isNaN(e) ? 0 : e;
  return `<span class="${Ot(t, 2)}">${ae(t)}&nbsp;%</span>`;
}
function In(e, t, n = "asc", r = !1) {
  if (!e)
    return [];
  const i = e.querySelector("tbody");
  if (!i)
    return [];
  const o = i.querySelector("tr.footer-row"), a = Array.from(i.querySelectorAll("tr")).filter((u) => u !== o);
  let s = -1;
  if (r) {
    const g = {
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
    typeof g == "number" && (s = g);
  } else {
    const u = Array.from(e.querySelectorAll("thead th"));
    for (let g = 0; g < u.length; g++)
      if (u[g].getAttribute("data-sort-key") === t) {
        s = g;
        break;
      }
  }
  if (s < 0)
    return a;
  const c = (u) => {
    const g = u.replace(/\u00A0/g, " ").replace(/[%€]/g, "").replace(/\./g, "").replace(/,/g, ".").replace(/[^\d.-]/g, "").trim();
    if (!g) return NaN;
    const d = parseFloat(g);
    return Number.isFinite(d) ? d : NaN;
  };
  a.sort((u, g) => {
    const d = u.cells.item(s), f = g.cells.item(s), p = ((d == null ? void 0 : d.textContent) ?? "").trim(), h = ((f == null ? void 0 : f.textContent) ?? "").trim(), y = c(p), m = c(h);
    let _;
    const b = /[0-9]/.test(p) || /[0-9]/.test(h);
    return !Number.isNaN(y) && !Number.isNaN(m) && b ? _ = y - m : _ = p.localeCompare(h, "de", { sensitivity: "base" }), n === "asc" ? _ : -_;
  }), a.forEach((u) => i.appendChild(u)), o && i.appendChild(o), e.querySelectorAll("thead th.sort-active").forEach((u) => {
    u.classList.remove("sort-active", "dir-asc", "dir-desc");
  });
  const l = e.querySelector(`thead th[data-sort-key="${t}"]`);
  return l && l.classList.add("sort-active", n === "asc" ? "dir-asc" : "dir-desc"), a;
}
function se(e) {
  return typeof e == "object" && e !== null;
}
function B(e) {
  return typeof e == "string" ? e : null;
}
function ze(e) {
  return e === null ? null : B(e);
}
function H(e) {
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
  const t = H(e);
  if (t == null)
    return null;
  const n = Math.trunc(t);
  return Number.isFinite(n) ? n : null;
}
function je(e) {
  return se(e) ? { ...e } : null;
}
function Un(e) {
  return se(e) ? { ...e } : null;
}
function Vn(e) {
  return typeof e == "boolean" ? e : void 0;
}
function Pi(e) {
  if (!se(e))
    return null;
  const t = B(e.name), n = B(e.currency_code), r = H(e.orig_balance);
  if (!t || !n || r == null)
    return null;
  const i = e.balance === null ? null : H(e.balance), o = {
    uuid: B(e.uuid) ?? void 0,
    name: t,
    currency_code: n,
    orig_balance: r,
    balance: i ?? null
  }, a = H(e.fx_rate);
  a != null && (o.fx_rate = a);
  const s = B(e.fx_rate_source);
  s && (o.fx_rate_source = s);
  const c = B(e.fx_rate_timestamp);
  c && (o.fx_rate_timestamp = c);
  const l = H(e.coverage_ratio);
  l != null && (o.coverage_ratio = l);
  const u = B(e.provenance);
  u && (o.provenance = u);
  const g = ze(e.metric_run_uuid);
  g !== null && (o.metric_run_uuid = g);
  const d = Vn(e.fx_unavailable);
  return typeof d == "boolean" && (o.fx_unavailable = d), o;
}
function zn(e) {
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
  if (!se(e))
    return null;
  const t = e.aggregation, n = B(e.security_uuid), r = B(e.name), i = H(e.current_holdings), o = H(e.purchase_value_eur) ?? (se(t) ? H(t.purchase_value_eur) ?? H(t.purchase_total_account) ?? H(t.account_currency_total) : null) ?? H(e.purchase_value), a = H(e.current_value);
  if (!n || !r || i == null || o == null || a == null)
    return null;
  const s = {
    portfolio_uuid: B(e.portfolio_uuid) ?? void 0,
    security_uuid: n,
    name: r,
    ticker_symbol: B(e.ticker_symbol),
    currency_code: B(e.currency_code),
    current_holdings: i,
    purchase_value: o,
    current_value: a,
    average_cost: je(e.average_cost),
    performance: je(e.performance),
    aggregation: je(e.aggregation),
    data_state: Un(e.data_state)
  }, c = H(e.coverage_ratio);
  c != null && (s.coverage_ratio = c);
  const l = B(e.provenance);
  l && (s.provenance = l);
  const u = ze(e.metric_run_uuid);
  u !== null && (s.metric_run_uuid = u);
  const g = H(e.last_price_native);
  g != null && (s.last_price_native = g);
  const d = H(e.last_price_eur);
  d != null && (s.last_price_eur = d);
  const f = H(e.last_close_native);
  f != null && (s.last_close_native = f);
  const p = H(e.last_close_eur);
  return p != null && (s.last_close_eur = p), s;
}
function qn(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = Ai(n);
    r && t.push(r);
  }
  return t;
}
function On(e) {
  if (!se(e))
    return null;
  const t = B(e.name), n = H(e.current_value ?? e.value);
  if (!t || n == null)
    return null;
  const i = H(
    e.purchase_sum ?? e.purchase_value_eur ?? e.purchase_value ?? e.purchaseSum
  ) ?? 0, o = {
    uuid: B(e.uuid) ?? void 0,
    name: t,
    current_value: n,
    purchase_value: i,
    purchase_sum: i,
    day_change_abs: H(
      (e == null ? void 0 : e.day_change_abs) ?? (e == null ? void 0 : e.day_change_eur)
    ) ?? void 0,
    day_change_pct: H(e == null ? void 0 : e.day_change_pct) ?? void 0,
    position_count: un(e.position_count ?? e.count) ?? void 0,
    missing_value_positions: un(e.missing_value_positions) ?? void 0,
    has_current_value: Vn(e.has_current_value),
    performance: je(e.performance),
    coverage_ratio: H(e.coverage_ratio) ?? void 0,
    provenance: B(e.provenance) ?? void 0,
    metric_run_uuid: ze(e.metric_run_uuid) ?? void 0,
    data_state: Un(e.data_state)
  };
  return Array.isArray(e.positions) && (o.positions = qn(e.positions)), o;
}
function Bn(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = On(n);
    r && t.push(r);
  }
  return t;
}
function Wn(e) {
  if (!se(e))
    return null;
  const t = { ...e }, n = ze(e.metric_run_uuid);
  n !== null ? t.metric_run_uuid = n : delete t.metric_run_uuid;
  const r = H(e.coverage_ratio);
  r != null ? t.coverage_ratio = r : delete t.coverage_ratio;
  const i = B(e.provenance);
  i ? t.provenance = i : delete t.provenance;
  const o = B(e.generated_at ?? e.snapshot_generated_at);
  return o ? t.generated_at = o : delete t.generated_at, t;
}
function Ni(e) {
  if (!se(e))
    return null;
  const t = { ...e }, n = Wn(e.normalized_payload);
  return n ? t.normalized_payload = n : "normalized_payload" in t && delete t.normalized_payload, t;
}
function jn(e) {
  if (!se(e))
    return null;
  const t = B(e.generated_at);
  if (!t)
    return null;
  const n = ze(e.metric_run_uuid), r = zn(e.accounts), i = Bn(e.portfolios), o = Ni(e.diagnostics), a = {
    generated_at: t,
    metric_run_uuid: n,
    accounts: r,
    portfolios: i
  };
  return o && (a.diagnostics = o), a;
}
function dn(e) {
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
function fn(e, t) {
  if (typeof e == "string")
    return e;
  throw new Error(`mapPositionSnapshotToRecord: fehlendes ${t}`);
}
function ht(e, t) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  throw new Error(`mapPositionSnapshotToRecord: fehlendes ${t}`);
}
function Fi(e) {
  const t = fn(e.security_uuid, "security_uuid"), n = fn(e.name, "name"), r = ht(e.current_holdings, "current_holdings"), i = ht(e.purchase_value, "purchase_value"), o = ht(e.current_value, "current_value"), a = {
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
    const g = e.panels, d = g.ppreader ?? g.pp_reader ?? Object.values(g).find(
      (f) => (f == null ? void 0 : f.webcomponent_name) === "pp-reader-panel"
    );
    n = ((s = d == null ? void 0 : d.config) == null ? void 0 : s.entry_id) ?? (d == null ? void 0 : d.entry_id) ?? ((u = (l = (c = d == null ? void 0 : d.config) == null ? void 0 : c._panel_custom) == null ? void 0 : l.config) == null ? void 0 : u.entry_id) ?? void 0;
  }
  return n ?? void 0;
}
function gn(e, t) {
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
  }), i = zn(r.accounts), o = jn(r.normalized_payload);
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
  }), i = Bn(r.portfolios), o = jn(r.normalized_payload);
  return {
    portfolios: i,
    normalized_payload: o
  };
}
async function Kn(e, t, n) {
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
  }), a = qn(i.positions).map(Fi), s = Wn(i.normalized_payload), c = {
    portfolio_uuid: dn(i.portfolio_uuid) ?? n,
    positions: a
  };
  typeof i.error == "string" && (c.error = i.error);
  const l = Ei(i.coverage_ratio);
  l !== void 0 && (c.coverage_ratio = l);
  const u = dn(i.provenance);
  u && (c.provenance = u);
  const g = wi(i.metric_run_uuid);
  return g !== void 0 && (c.metric_run_uuid = g), s && (c.normalized_payload = s), c;
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
async function Ri(e, t) {
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
async function Ze(e, t, n, r = {}) {
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
  const g = s ?? l;
  g != null && (o.end_date = g);
  const d = await e.connection.sendMessagePromise(o);
  return Array.isArray(d.prices) || (d.prices = []), Array.isArray(d.transactions) || (d.transactions = []), d;
}
const Bt = /* @__PURE__ */ new Set(), Wt = /* @__PURE__ */ new Set(), Gn = {}, Ti = [
  "renderPositionsTable",
  "applyGainPctMetadata",
  "attachSecurityDetailListener",
  "attachPortfolioPositionsSorting",
  "updatePortfolioFooter"
];
function $i(e, t) {
  typeof t == "function" && (Gn[e] = t);
}
function ys(e) {
  e && Bt.add(e);
}
function bs(e) {
  e && Bt.delete(e);
}
function Li() {
  return Bt;
}
function vs(e) {
  e && Wt.add(e);
}
function Ss(e) {
  e && Wt.delete(e);
}
function Mi() {
  return Wt;
}
function Hi(e) {
  for (const t of Ti)
    $i(t, e[t]);
}
function jt() {
  return Gn;
}
const Ii = 2;
function ie(e) {
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
        const d = s.split(","), f = ((t = d[d.length - 1]) == null ? void 0 : t.length) ?? 0, p = d.slice(0, -1).join(""), h = p.replace(/[+-]/g, "").length, y = d.length > 2, m = /^[-+]?0$/.test(p);
        s = y || f === 0 || f === 3 && h > 0 && h <= 3 && !m ? s.replace(/,/g, "") : s.replace(",", ".");
      }
    else l && c && a > o ? s = s.replace(/,/g, "") : l && s.length - a - 1 === 3 && /\d{4,}/.test(s.replace(/\./g, "")) && (s = s.replace(/\./g, ""));
    if (s === "-" || s === "+")
      return null;
    const u = Number.parseFloat(s);
    if (Number.isFinite(u))
      return u;
    const g = Number.parseFloat(i.replace(",", "."));
    if (Number.isFinite(g))
      return g;
  }
  return null;
}
function ft(e, { decimals: t = Ii, fallback: n = null } = {}) {
  const r = ie(e);
  if (r == null)
    return n ?? null;
  const i = 10 ** t, o = Math.round(r * i) / i;
  return Object.is(o, -0) ? 0 : o;
}
function pn(e, t = {}) {
  return ft(e, t);
}
function Ui(e, t = {}) {
  return ft(e, t);
}
const Vi = /^[+-]?(?:\d+\.?\d*|\d*\.?\d+)(?:[eE][+-]?\d+)?$/, te = (e) => {
  if (typeof e == "number")
    return Number.isFinite(e) ? e : null;
  if (typeof e == "string") {
    const t = e.trim();
    if (!t || !Vi.test(t))
      return null;
    const n = Number(t);
    if (Number.isFinite(n))
      return n;
  }
  return null;
}, Yn = (e) => {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t || null;
};
function zi(e) {
  const t = e && typeof e == "object" ? e : null;
  if (!t)
    return null;
  const n = te(t.price_change_native), r = te(t.price_change_eur), i = te(t.change_pct), o = te(t.value_change_eur);
  if (n == null && r == null && i == null && o == null)
    return null;
  const a = Yn(t.source) ?? "derived", s = te(t.coverage_ratio) ?? null;
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
  const n = te(t.gain_abs), r = te(t.gain_pct), i = te(t.total_change_eur), o = te(t.total_change_pct);
  if (n == null || r == null || i == null || o == null)
    return null;
  const a = Yn(t.source) ?? "derived", s = te(t.coverage_ratio) ?? null, c = zi(t.day_change);
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
function I(e) {
  if (e === null)
    return null;
  const t = ie(e);
  return Number.isFinite(t ?? NaN) ? t : null;
}
function qi(e) {
  if (!e || typeof e != "object")
    return !1;
  const t = e;
  return typeof t.security_uuid == "string" && typeof t.name == "string" && typeof t.current_holdings == "number" && typeof t.purchase_value == "number" && typeof t.current_value == "number";
}
function qe(e) {
  const t = { ...e };
  return e.average_cost && typeof e.average_cost == "object" && (t.average_cost = { ...e.average_cost }), e.performance && typeof e.performance == "object" && (t.performance = { ...e.performance }), e.aggregation && typeof e.aggregation == "object" && (t.aggregation = { ...e.aggregation }), e.data_state && typeof e.data_state == "object" && (t.data_state = { ...e.data_state }), t;
}
function Oi(e, t) {
  const n = e ? qe(e) : {};
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
function Kt(e, t) {
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
  }).map(qe);
  ue.set(e, i);
}
function Gt(e) {
  return e ? ue.has(e) : !1;
}
function Xn(e) {
  if (!e)
    return [];
  const t = ue.get(e);
  return t ? t.map(qe) : [];
}
function Bi() {
  ue.clear();
}
function Wi() {
  return new Map(
    Array.from(ue.entries(), ([e, t]) => [
      e,
      t.map(qe)
    ])
  );
}
function Oe(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e, n = I(t.native), r = I(t.security), i = I(t.account), o = I(t.eur), a = I(t.coverage_ratio);
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
function Zn(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e, n = I(t.total_holdings), r = I(t.positive_holdings), i = I(t.purchase_value_eur), o = I(t.purchase_total_security) ?? I(t.security_currency_total), a = I(t.purchase_total_account) ?? I(t.account_currency_total);
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
  const t = qi(e) ? qe(e) : e, n = le(t.security_uuid), r = le(t.name), i = ie(t.current_holdings), o = pn(t.current_value), a = Zn(t.aggregation), s = t.aggregation && typeof t.aggregation == "object" ? t.aggregation : null, c = I(t.purchase_value_eur) ?? I(s == null ? void 0 : s.purchase_value_eur) ?? I(s == null ? void 0 : s.purchase_total_account) ?? I(s == null ? void 0 : s.account_currency_total) ?? pn(t.purchase_value);
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
  }, u = Oe(t.average_cost);
  u && (l.average_cost = u), a && (l.aggregation = a);
  const g = ge(t.performance);
  if (g)
    l.performance = g, l.gain_abs = typeof g.gain_abs == "number" ? g.gain_abs : null, l.gain_pct = typeof g.gain_pct == "number" ? g.gain_pct : null;
  else {
    const b = I(t.gain_abs), S = I(t.gain_pct);
    b !== null && (l.gain_abs = b), S !== null && (l.gain_pct = S);
  }
  "coverage_ratio" in t && (l.coverage_ratio = I(t.coverage_ratio));
  const d = le(t.provenance);
  d && (l.provenance = d);
  const f = le(t.metric_run_uuid);
  (f || t.metric_run_uuid === null) && (l.metric_run_uuid = f ?? null);
  const p = I(t.last_price_native);
  p !== null && (l.last_price_native = p);
  const h = I(t.last_price_eur);
  h !== null && (l.last_price_eur = h);
  const y = I(t.last_close_native);
  y !== null && (l.last_close_native = y);
  const m = I(t.last_close_eur);
  m !== null && (l.last_close_eur = m);
  const _ = t.data_state && typeof t.data_state == "object" ? { ...t.data_state } : void 0;
  return _ && (l.data_state = _), l;
}
function gt(e) {
  if (!Array.isArray(e))
    return [];
  const t = [];
  for (const n of e) {
    const r = ji(n);
    r && t.push(r);
  }
  return t;
}
let Jn = [];
const de = /* @__PURE__ */ new Map();
function Ke(e) {
  return typeof e == "string" && e.length > 0 ? e : void 0;
}
function Ki(e) {
  return e === null ? null : Ke(e);
}
function Gi(e) {
  return typeof e == "number" && Number.isFinite(e) ? e : void 0;
}
function me(e) {
  return e === null ? null : Gi(e);
}
function mn(e) {
  if (!(typeof e != "number" || !Number.isFinite(e)))
    return Math.trunc(e);
}
function ne(e) {
  if (!(!e || typeof e != "object"))
    return { ...e };
}
function $e(e) {
  const t = { ...e };
  return t.average_cost = ne(e.average_cost), t.performance = ne(e.performance), t.aggregation = ne(e.aggregation), t.data_state = ne(e.data_state), t;
}
function Yt(e) {
  const t = { ...e };
  return t.performance = ne(e.performance), t.data_state = ne(e.data_state), Array.isArray(e.positions) && (t.positions = e.positions.map($e)), t;
}
function Qn(e) {
  if (!e || typeof e != "object")
    return null;
  const t = Ke(e.uuid);
  if (!t)
    return null;
  const n = { uuid: t }, r = Ke(e.name);
  r && (n.name = r);
  const i = me(e.current_value);
  i !== void 0 && (n.current_value = i);
  const o = me(e.purchase_sum) ?? me(e.purchase_value_eur) ?? me(e.purchase_value);
  o !== void 0 && (n.purchase_value = o, n.purchase_sum = o);
  const a = me(e.day_change_abs);
  a !== void 0 && (n.day_change_abs = a);
  const s = me(e.day_change_pct);
  s !== void 0 && (n.day_change_pct = s);
  const c = mn(e.position_count);
  c !== void 0 && (n.position_count = c);
  const l = mn(e.missing_value_positions);
  l !== void 0 && (n.missing_value_positions = l), typeof e.has_current_value == "boolean" && (n.has_current_value = e.has_current_value);
  const u = me(e.coverage_ratio);
  u !== void 0 && (n.coverage_ratio = u);
  const g = Ke(e.provenance);
  g && (n.provenance = g), "metric_run_uuid" in e && (n.metric_run_uuid = Ki(e.metric_run_uuid));
  const d = ne(e.performance);
  d && (n.performance = d);
  const f = ne(e.data_state);
  if (f && (n.data_state = f), Array.isArray(e.positions)) {
    const p = e.positions.filter(
      (h) => !!h
    );
    p.length && (n.positions = p.map($e));
  }
  return n;
}
function Yi(e, t) {
  const n = {
    ...e,
    ...t
  };
  return !t.performance && e.performance && (n.performance = ne(e.performance)), !t.data_state && e.data_state && (n.data_state = ne(e.data_state)), !t.positions && e.positions && (n.positions = e.positions.map($e)), n;
}
function er(e) {
  Jn = (e ?? []).map((n) => ({ ...n }));
}
function Xi() {
  return Jn.map((e) => ({ ...e }));
}
function Zi(e) {
  de.clear();
  const t = e ?? [];
  for (const n of t) {
    const r = Qn(n);
    r && de.set(r.uuid, Yt(r));
  }
}
function Ji(e) {
  const t = e ?? [];
  for (const n of t) {
    const r = Qn(n);
    if (!r)
      continue;
    const i = de.get(r.uuid), o = i ? Yi(i, r) : Yt(r);
    de.set(o.uuid, o);
  }
}
function Xt(e, t) {
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
    const u = c ? $e(c) : {};
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
    ].forEach((f) => {
      l[f] !== void 0 && (u[f] = l[f]);
    });
    const d = (f) => {
      const p = l[f];
      if (p && typeof p == "object") {
        const h = c && c[f] && typeof c[f] == "object" ? c[f] : {};
        u[f] = { ...h, ...p };
      } else p !== void 0 && (u[f] = p);
    };
    return d("performance"), d("aggregation"), d("average_cost"), d("data_state"), u;
  }, i = Array.isArray(n.positions) ? n.positions : [], o = new Map(
    i.filter((c) => c.security_uuid).map((c) => [c.security_uuid, c])
  ), a = t.filter((c) => !!c).map((c) => {
    const l = c.security_uuid ? o.get(c.security_uuid) : void 0;
    return r(l, c);
  }).map($e), s = {
    ...n,
    positions: a
  };
  de.set(e, s);
}
function Qi() {
  return Array.from(de.values(), (e) => Yt(e));
}
function tr() {
  return {
    accounts: Xi(),
    portfolios: Qi()
  };
}
const eo = "unknown-account";
function Y(e) {
  return typeof e != "number" || !Number.isFinite(e) ? null : e;
}
function hn(e) {
  const t = Y(e);
  return t == null ? 0 : Math.trunc(t);
}
function J(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t.length > 0 ? t : null;
}
function nr(e, t) {
  return J(e) ?? t;
}
function Zt(e) {
  return e == null || !Number.isFinite(e) ? null : e < 0 ? 0 : e > 1 ? 1 : e;
}
function to(e) {
  const t = Math.abs(e % 1) > 0.01;
  return e.toLocaleString("de-DE", {
    minimumFractionDigits: t ? 1 : 0,
    maximumFractionDigits: 1
  });
}
function rr(e, t) {
  const n = Zt(e);
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
function ir(e) {
  return e.split(/[\s_-]+/).filter(Boolean).map(
    (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
  ).join(" ");
}
function or(e) {
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
  const t = J(e);
  if (!t)
    return null;
  const n = ro(t);
  return n || ir(t);
}
function ro(e) {
  const t = e.trim();
  if (!t.startsWith("{") && !t.startsWith("["))
    return null;
  try {
    const n = JSON.parse(t), r = io(n), i = n && typeof n == "object" ? J(
      n.provider ?? n.source
    ) : null;
    if (r.length && i)
      return `${ir(i)} (${r.join(", ")})`;
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
  const t = J(e.uuid) ?? `${eo}-${e.name ?? "0"}`, n = nr(e.name, "Unbenanntes Konto"), r = J(e.currency_code), i = Y(e.balance), o = Y(e.orig_balance), a = "coverage_ratio" in e ? Zt(Y(e.coverage_ratio)) : null, s = J(e.provenance), c = J(e.metric_run_uuid), l = e.fx_unavailable === !0, u = Y(e.fx_rate), g = J(e.fx_rate_source), d = J(e.fx_rate_timestamp), f = [], p = rr(a, "account");
  p && f.push(p);
  const h = or(s);
  h && f.push(h);
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
    fx_rate_source: g,
    fx_rate_timestamp: d,
    badges: f
  }, m = typeof c == "string" ? c : null;
  return y.metric_run_uuid = m, y;
}
function ao(e) {
  if (!e)
    return null;
  const t = J(e.uuid);
  if (!t)
    return null;
  const n = nr(e.name, "Unbenanntes Depot"), r = hn(e.position_count), i = hn(e.missing_value_positions), o = Y(e.current_value), a = Y(e.purchase_sum) ?? Y(e == null ? void 0 : e.purchase_value_eur) ?? Y(e.purchase_value) ?? 0, s = Y(e.day_change_abs) ?? null, c = Y(e.day_change_pct) ?? null, l = ge(e.performance), u = (l == null ? void 0 : l.gain_abs) ?? null, g = (l == null ? void 0 : l.gain_pct) ?? null, d = (l == null ? void 0 : l.day_change) ?? null;
  let f = s ?? ((d == null ? void 0 : d.value_change_eur) != null ? Y(d.value_change_eur) : null), p = c ?? ((d == null ? void 0 : d.change_pct) != null ? Y(d.change_pct) : null);
  if (f == null && p != null && o != null) {
    const D = o / (1 + p / 100);
    D && (f = o - D);
  }
  if (p == null && f != null && o != null) {
    const D = o - f;
    D && (p = f / D * 100);
  }
  const h = o != null, y = e.has_current_value === !1 || !h, m = "coverage_ratio" in e ? Zt(Y(e.coverage_ratio)) : null, _ = J(e.provenance), b = J(e.metric_run_uuid), S = [], P = rr(m, "portfolio");
  P && S.push(P);
  const N = or(_);
  N && S.push(N);
  const A = {
    uuid: t,
    name: n,
    position_count: r,
    current_value: o,
    purchase_sum: a,
    day_change_abs: f ?? null,
    day_change_pct: p ?? null,
    gain_abs: u,
    gain_pct: g,
    hasValue: h,
    fx_unavailable: y || i > 0,
    missing_value_positions: i,
    performance: l,
    coverage_ratio: m,
    provenance: _,
    metric_run_uuid: null,
    badges: S
  }, $ = typeof b == "string" ? b : null;
  return A.metric_run_uuid = $, A;
}
function ar() {
  const { accounts: e } = tr();
  return e.map(oo).filter((t) => !!t);
}
function so() {
  const { portfolios: e } = tr();
  return e.map(ao).filter((t) => !!t);
}
function Le(e) {
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
function sr(e, t = {}) {
  if (!e || e.length === 0)
    return "";
  const n = ["meta-badges", t.containerClass].filter(Boolean).join(" "), r = e.map((i) => {
    const o = `meta-badge--${i.tone}`, a = i.description ? ` title="${Le(i.description)}"` : "";
    return `<span class="meta-badge ${o}"${a}>${Le(
      i.label
    )}</span>`;
  }).join("");
  return `<span class="${n}">${r}</span>`;
}
function Je(e, t, n = {}) {
  const r = sr(t, n);
  if (!r)
    return Le(e);
  const i = n.labelClass ?? "name-with-badges__label";
  return `<span class="${["name-with-badges", n.containerClass].filter(Boolean).join(" ")}"><span class="${i}">${Le(
    e
  )}</span>${r}</span>`;
}
function cr(e, t, n, r) {
  e[t] = {
    previous: n,
    current: r
  };
}
const oe = /* @__PURE__ */ new Map(), Ge = /* @__PURE__ */ new Map();
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
function Ae(e) {
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
  return e === null ? null : Ae(e);
}
function _n(e) {
  return ge(e.performance);
}
const go = 500, po = 10, mo = "pp-reader:portfolio-positions-updated", ho = "pp-reader:diagnostics", _t = /* @__PURE__ */ new Map(), lr = [
  "coverage_ratio",
  "provenance",
  "metric_run_uuid",
  "generated_at"
], Dt = /* @__PURE__ */ new Map();
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
function yt(e) {
  if (e !== void 0)
    return fo(e);
}
function Jt(e, t, n, r) {
  const i = {}, o = yo(e);
  o !== void 0 && (i.coverage_ratio = o);
  const a = yt(t);
  a !== void 0 && (i.provenance = a);
  const s = yt(n);
  s !== void 0 && (i.metric_run_uuid = s);
  const c = yt(r);
  return c !== void 0 && (i.generated_at = c), Object.keys(i).length > 0 ? i : null;
}
function bo(e, t) {
  const n = {};
  let r = !1;
  for (const i of lr) {
    const o = e == null ? void 0 : e[i], a = t[i];
    o !== a && (cr(n, i, o, a), r = !0);
  }
  return r ? n : null;
}
function vo(e) {
  const t = {};
  let n = !1;
  for (const r of lr) {
    const i = e[r];
    i !== void 0 && (cr(t, r, i, void 0), n = !0);
  }
  return n ? t : null;
}
function yn(e) {
  if (Object.keys(e.changed).length) {
    try {
      console.debug("pp-reader:diagnostics", e);
    } catch {
    }
    if (!(typeof window > "u" || typeof window.dispatchEvent != "function"))
      try {
        window.dispatchEvent(new CustomEvent(ho, { detail: e }));
      } catch (t) {
        console.warn("updateConfigsWS: Diagnostics-Event konnte nicht gesendet werden", t);
      }
  }
}
function Qt(e, t, n, r) {
  const i = _o(e, n), o = _t.get(i);
  if (!r) {
    if (!o)
      return;
    _t.delete(i);
    const s = vo(o);
    if (!s)
      return;
    yn({
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
  a && (_t.set(i, { ...r }), yn({
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
      const n = Ae(t.uuid);
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
function Po(e) {
  if (!(!e || e.length === 0))
    for (const t of e) {
      const n = Ae(t.uuid);
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
function Ao(e, t) {
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
function No(e, t) {
  return `<div class="error">${co(e)} <button class="retry-pos" data-portfolio="${t}">Erneut laden</button></div>`;
}
function wo(e, t, n) {
  const r = e.querySelector("table.sortable-positions");
  if (!r) return;
  const i = e.dataset.sortKey || r.dataset.defaultSort || "name", a = (e.dataset.sortDir || r.dataset.defaultDir || "asc") === "desc" ? "desc" : "asc";
  e.dataset.sortKey = i, e.dataset.sortDir = a;
  try {
    In(r, i, a, !0);
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
function ur(e, t, n, r) {
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
  return o.innerHTML = $o(n), a && (o.dataset.sortKey = a), s && (o.dataset.sortDir = s), wo(o, e, t), { applied: !0 };
}
function en(e, t) {
  const n = oe.get(t);
  if (!n) return !1;
  const r = ur(
    e,
    t,
    n.positions,
    n.error
  );
  return r.applied && oe.delete(t), r.applied;
}
function Eo(e) {
  let t = !1;
  for (const [n] of oe)
    en(e, n) && (t = !0);
  return t;
}
function dr(e, t) {
  const n = Ge.get(t) ?? {
    attempts: 0,
    timer: null
  };
  n.timer || (n.timer = setTimeout(() => {
    n.timer = null, n.attempts += 1;
    const r = en(e, t);
    r || n.attempts >= po ? (Ge.delete(t), r || oe.delete(t)) : dr(e, t);
  }, go), Ge.set(t, n));
}
function Fo(e, t) {
  console.log("updateConfigsWS: Kontodaten-Update erhalten:", e);
  const n = Array.isArray(e) ? e : [];
  if (er(n), So(n), !t)
    return;
  const r = ar();
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
  fr(r, o, t);
}
function Co(e, t) {
  const n = t.querySelector(".account-table"), r = t.querySelector(".fx-account-table"), i = e.filter((a) => (a.currency_code || "EUR") === "EUR"), o = e.filter((a) => (a.currency_code || "EUR") !== "EUR");
  if (n) {
    const a = i.map((s) => ({
      name: Je(s.name, s.badges, {
        containerClass: "account-name",
        labelClass: "account-name__label"
      }),
      balance: s.balance ?? null
    }));
    n.innerHTML = ve(
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
      const c = s.orig_balance, l = typeof c == "number" && Number.isFinite(c), u = Ae(s.currency_code), g = l ? c.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) : null, d = g ? u ? `${g} ${u}` : g : "";
      return {
        name: Je(s.name, s.badges, {
          containerClass: "account-name",
          labelClass: "account-name__label"
        }),
        fx_display: d,
        balance: s.balance ?? null
      };
    });
    r.innerHTML = ve(
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
    const r = On(n);
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
  const o = (g) => {
    if (typeof Intl < "u")
      try {
        const f = typeof navigator < "u" && navigator.language ? navigator.language : "de-DE";
        return new Intl.NumberFormat(f, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(g);
      } catch {
      }
    return (ft(g, { fallback: 0 }) ?? 0).toFixed(2).replace(".", ",");
  }, a = /* @__PURE__ */ new Map();
  i.querySelectorAll("tr.portfolio-row").forEach((g) => {
    const d = g.dataset.portfolio;
    d && a.set(d, g);
  });
  let c = 0;
  const l = (g) => {
    const d = typeof g == "number" && Number.isFinite(g) ? g : 0;
    try {
      return d.toLocaleString("de-DE");
    } catch {
      return d.toString();
    }
  }, u = /* @__PURE__ */ new Map();
  for (const g of n) {
    const d = Ae(g.uuid);
    d && u.set(d, g);
  }
  for (const [g, d] of u.entries()) {
    const f = a.get(g);
    if (!f || f.cells.length < 3)
      continue;
    const p = f.cells.item(1), h = f.cells.item(2), y = f.cells.item(3), m = f.cells.item(4);
    if (!p || !h)
      continue;
    const _ = typeof d.position_count == "number" && Number.isFinite(d.position_count) ? d.position_count : 0, b = typeof d.current_value == "number" && Number.isFinite(d.current_value) ? d.current_value : null, S = ge(d.performance), P = typeof (S == null ? void 0 : S.gain_abs) == "number" ? S.gain_abs : null, N = typeof (S == null ? void 0 : S.gain_pct) == "number" ? S.gain_pct : null, A = typeof d.purchase_sum == "number" && Number.isFinite(d.purchase_sum) ? d.purchase_sum : typeof d.purchase_value == "number" && Number.isFinite(d.purchase_value) ? d.purchase_value : null, $ = bt(h.textContent);
    bt(p.textContent) !== _ && (p.textContent = l(_));
    const C = b !== null, k = {
      fx_unavailable: f.dataset.fxUnavailable === "true",
      current_value: b,
      performance: S
    }, T = { hasValue: C }, x = L("current_value", k.current_value, k, T), w = b ?? 0;
    if ((Math.abs($ - w) >= 5e-3 || h.innerHTML !== x) && (h.innerHTML = x, f.classList.add("flash-update"), setTimeout(() => {
      f.classList.remove("flash-update");
    }, 800)), y) {
      const E = L("gain_abs", P, k, T);
      y.innerHTML = E;
      const v = typeof N == "number" && Number.isFinite(N) ? N : null;
      y.dataset.gainPct = v != null ? `${o(v)} %` : "—", y.dataset.gainSign = v != null ? v > 0 ? "positive" : v < 0 ? "negative" : "neutral" : "neutral";
    }
    m && (m.innerHTML = L("gain_pct", N, k, T)), f.dataset.positionCount = _.toString(), f.dataset.currentValue = C ? w.toString() : "", f.dataset.purchaseSum = A != null ? A.toString() : "", f.dataset.gainAbs = P != null ? P.toString() : "", f.dataset.gainPct = N != null ? N.toString() : "", f.dataset.coverageRatio = typeof d.coverage_ratio == "number" && Number.isFinite(d.coverage_ratio) ? d.coverage_ratio.toString() : "", f.dataset.provenance = typeof d.provenance == "string" ? d.provenance : "", f.dataset.metricRunUuid = typeof d.metric_run_uuid == "string" ? d.metric_run_uuid : "", c += 1;
  }
  if (c === 0)
    console.debug("handlePortfolioUpdate: Keine passenden Zeilen gefunden / keine Änderungen.");
  else {
    const g = c.toLocaleString("de-DE");
    console.debug(`handlePortfolioUpdate: ${g} Zeile(n) gepatcht.`);
  }
  try {
    Lo(r);
  } catch (g) {
    console.warn("handlePortfolioUpdate: Fehler bei Summen-Neuberechnung:", g);
  }
  try {
    const g = (...m) => {
      for (const _ of m) {
        if (!_) continue;
        const b = t.querySelector(_);
        if (b) return b;
      }
      return null;
    }, d = g(
      ".account-table table",
      ".accounts-eur-table table",
      ".accounts-table table"
    ), f = g(
      ".fx-account-table table",
      ".accounts-fx-table table"
    ), p = (m, _) => {
      if (!m) return [];
      const b = m.querySelectorAll("tbody tr.account-row");
      return (b.length ? Array.from(b) : Array.from(m.querySelectorAll("tbody tr:not(.footer-row)"))).map((P) => {
        const N = _ ? P.cells.item(2) : P.cells.item(1);
        return { balance: bt(N == null ? void 0 : N.textContent) };
      });
    }, h = [
      ...p(d, !1),
      ...p(f, !0)
    ], y = Array.from(
      r.querySelectorAll("tbody tr.portfolio-row")
    ).map((m) => {
      const _ = m.dataset.currentValue, b = m.dataset.purchaseSum, S = _ ? Number.parseFloat(_) : Number.NaN, P = b ? Number.parseFloat(b) : Number.NaN;
      return {
        current_value: Number.isFinite(S) ? S : 0,
        purchase_sum: Number.isFinite(P) ? P : 0
      };
    });
    fr(h, y, t);
  } catch (g) {
    console.warn("handlePortfolioUpdate: Fehler bei Total-Neuberechnung:", g);
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
function kt(e) {
  Dt.delete(e);
}
function bn(e) {
  return typeof e != "number" || !Number.isInteger(e) || e <= 0 ? null : e;
}
function Ro(e, t, n, r) {
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
function vn(e, t) {
  const n = ko(e);
  if (!n)
    return console.warn("handlePortfolioPositionsUpdate: Ungültiges Update:", e), !1;
  const r = e == null ? void 0 : e.error, i = bn(e == null ? void 0 : e.chunk_index), o = bn(e == null ? void 0 : e.chunk_count), a = gt((e == null ? void 0 : e.positions) ?? []);
  r && kt(n);
  const s = r ? a : Ro(n, i, o, a);
  if (!r && s === null)
    return !0;
  const c = r ? a : s ?? [];
  Ao(n, e), r || (Kt(n, c), Xt(n, c));
  const l = ur(t, n, c, r);
  if (l.applied ? oe.delete(n) : (oe.set(n, { positions: a, error: r }), l.reason !== "hidden" && dr(t, n)), !r && a.length > 0) {
    const u = Array.from(
      new Set(
        a.map((g) => g.security_uuid).filter((g) => typeof g == "string" && g.length > 0)
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
      } catch (g) {
        console.warn(
          "handlePortfolioPositionsUpdate: Dispatch des Portfolio-Events fehlgeschlagen",
          g
        );
      }
  }
  return !0;
}
function To(e, t) {
  if (Array.isArray(e)) {
    let n = !1;
    for (const r of e)
      vn(r, t) && (n = !0);
    !n && e.length && console.warn("handlePortfolioPositionsUpdate: Kein gültiges Element im Array:", e);
    return;
  }
  vn(e, t);
}
function $o(e) {
  const { renderPositionsTable: t, applyGainPctMetadata: n } = jt();
  try {
    if (typeof t == "function")
      return t(e);
  } catch {
  }
  if (e.length === 0)
    return '<div class="no-positions">Keine Positionen vorhanden.</div>';
  const r = e.map((o) => {
    const a = _n(o);
    return {
      name: o.name,
      current_holdings: o.current_holdings,
      purchase_value: o.purchase_value,
      current_value: o.current_value,
      performance: a
    };
  }), i = ve(
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
      s.forEach((g, d) => {
        const f = c[d];
        f && (g.setAttribute("data-sort-key", f), g.classList.add("sortable-col"));
      }), a.querySelectorAll("tbody tr").forEach((g, d) => {
        if (g.classList.contains("footer-row"))
          return;
        const f = e[d];
        f.security_uuid && (g.dataset.security = f.security_uuid), g.classList.add("position-row");
      }), a.dataset.defaultSort = "name", a.dataset.defaultDir = "asc";
      const u = n;
      if (u)
        try {
          u(a);
        } catch (g) {
          console.warn("renderPositionsTableInline: applyGainPctMetadata failed", g);
        }
      else
        a.querySelectorAll("tbody tr").forEach((d, f) => {
          if (d.classList.contains("footer-row"))
            return;
          const p = d.cells.item(4);
          if (!p)
            return;
          const h = e[f], y = _n(h), m = typeof (y == null ? void 0 : y.gain_pct) == "number" && Number.isFinite(y.gain_pct) ? y.gain_pct : null, _ = m != null ? `${m.toLocaleString("de-DE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })} %` : "—", b = m == null ? "neutral" : m > 0 ? "positive" : m < 0 ? "negative" : "neutral";
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
  var m;
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
  s || (s = document.createElement("tr"), s.className = "footer-row", (m = e.querySelector("tbody")) == null || m.appendChild(s));
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
  }, u = { hasValue: o }, g = L("current_value", l.current_value, l, u), d = o ? i.sumGainAbs : null, f = o ? a : null, p = L("gain_abs", d, l, u), h = L("gain_pct", f, l, u);
  s.innerHTML = `
    <td>Summe</td>
    <td class="align-right">${c}</td>
    <td class="align-right">${g}</td>
    <td class="align-right">${p}</td>
    <td class="align-right">${h}</td>
  `;
  const y = s.cells.item(3);
  y && (y.dataset.gainPct = o && typeof a == "number" ? `${Rt(a)} %` : "—", y.dataset.gainSign = o && typeof a == "number" ? a > 0 ? "positive" : a < 0 ? "negative" : "neutral" : "neutral"), s.dataset.positionCount = Math.round(i.sumPositions).toString(), s.dataset.currentValue = o ? i.sumCurrent.toString() : "", s.dataset.purchaseSum = o ? i.sumPurchase.toString() : "", s.dataset.gainAbs = o ? i.sumGainAbs.toString() : "", s.dataset.gainPct = o && typeof a == "number" ? a.toString() : "", s.dataset.hasValue = o ? "true" : "false", s.dataset.fxUnavailable = i.fxUnavailable || !o ? "true" : "false";
}
function Sn(e) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  if (typeof e == "string") {
    const t = Number.parseFloat(e);
    return Number.isFinite(t) ? t : 0;
  }
  return 0;
}
function Rt(e) {
  return (ft(e, { fallback: 0 }) ?? 0).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
function fr(e, t, n) {
  const r = n ?? document, o = (Array.isArray(e) ? e : []).reduce((g, d) => {
    const f = d.balance ?? d.current_value ?? d.value, p = Sn(f);
    return g + p;
  }, 0), s = (Array.isArray(t) ? t : []).reduce((g, d) => {
    const f = d.current_value ?? d.value, p = Sn(f);
    return g + p;
  }, 0), c = o + s, l = r.querySelector("#headerMeta");
  if (!l) {
    console.warn("updateTotalWealth: #headerMeta nicht gefunden.");
    return;
  }
  const u = l.querySelector("strong") || l.querySelector(".total-wealth-value");
  u ? u.textContent = `${Rt(c)} €` : l.textContent = `💰 Gesamtvermögen: ${Rt(c)} €`, l.dataset.totalWealthEur = c.toString();
}
function Mo(e, t) {
  const n = typeof e == "string" ? e : e == null ? void 0 : e.last_file_update, r = Ae(n) ?? "";
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
  e.dataset.sortKey = n, e.dataset.sortDir = i, In(t, n, i, !0);
}
const As = {
  getPortfolioPositionsCacheSnapshot: Wi,
  clearPortfolioPositionsCache: Bi,
  getPendingUpdateCount() {
    return oe.size;
  },
  queuePendingUpdate(e, t, n) {
    oe.set(e, { positions: t, error: n });
  },
  clearPendingUpdates() {
    oe.clear(), Ge.clear();
  }
};
function bt(e) {
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
function vt(e) {
  return Ho.includes(e);
}
function St(e) {
  return e === "asc" || e === "desc";
}
let Qe = null, et = null;
const Pn = { min: 2, max: 6 };
function we(e) {
  return ie(e);
}
function Io(e) {
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
function An(e, t, n = null) {
  for (const r of t) {
    const i = Uo(e[r]);
    if (i)
      return i;
  }
  return n;
}
function Nn(e, t) {
  return Io(e) ? `${e.toLocaleString("de-DE", {
    minimumFractionDigits: Pn.min,
    maximumFractionDigits: Pn.max
  })}${t ? ` ${t}` : ""}` : null;
}
function Vo(e) {
  const t = e, n = e.average_cost ?? null, r = e.aggregation ?? null, i = An(t, [
    "security_currency_code",
    "security_currency",
    "native_currency_code",
    "native_currency"
  ], e.currency_code ?? null), o = An(t, [
    "account_currency_code",
    "account_currency",
    "purchase_currency_code",
    "currency_code"
  ], i === "EUR" ? "EUR" : null) ?? (i === "EUR" ? "EUR" : null) ?? "EUR", a = we(n == null ? void 0 : n.native), s = we(n == null ? void 0 : n.security), c = we(n == null ? void 0 : n.account), l = we(n == null ? void 0 : n.eur), u = s ?? a, g = l ?? (o === "EUR" ? c : null), d = i ?? o ?? "EUR", f = d === "EUR";
  let p, h;
  f ? (p = "EUR", h = g ?? u ?? c ?? null) : u != null ? (p = d, h = u) : c != null ? (p = o, h = c) : (p = "EUR", h = g ?? null);
  const y = Nn(h, p), m = f ? null : Nn(g, "EUR"), _ = !!m && m !== y, b = [], S = [];
  y ? (b.push(
    `<span class="purchase-price purchase-price--primary">${y}</span>`
  ), S.push(y.replace(/\u00A0/g, " "))) : (b.push('<span class="missing-value" role="note" aria-label="Kein Kaufpreis verfügbar" title="Kein Kaufpreis verfügbar">—</span>'), S.push("Kein Kaufpreis verfügbar")), _ && m && (b.push(
    `<span class="purchase-price purchase-price--secondary">${m}</span>`
  ), S.push(m.replace(/\u00A0/g, " ")));
  const P = b.join("<br>"), N = we(r == null ? void 0 : r.purchase_value_eur) ?? 0, A = S.join(", ");
  return { markup: P, sortValue: N, ariaLabel: A };
}
function zo(e) {
  const t = ie(e.current_holdings);
  if (t == null)
    return { value: null, pct: null };
  const n = ie(e.last_price_eur), r = ie(e.last_close_eur);
  let i = null, o = null;
  if (n != null && r != null) {
    i = (n - r) * t;
    const g = r * t;
    g && (o = i / g * 100);
  }
  const a = ge(e.performance), s = (a == null ? void 0 : a.day_change) ?? null;
  if (i == null && (s == null ? void 0 : s.price_change_eur) != null && (i = s.price_change_eur * t), o == null && (s == null ? void 0 : s.change_pct) != null && (o = s.change_pct), i == null && o != null) {
    const u = ie(e.current_value);
    if (u != null) {
      const g = u / (1 + o / 100);
      g && (i = u - g);
    }
  }
  const c = i != null && Number.isFinite(i) ? Math.round(i * 100) / 100 : null, l = o != null && Number.isFinite(o) ? Math.round(o * 100) / 100 : null;
  return { value: c, pct: l };
}
const tt = /* @__PURE__ */ new Set();
function gr(e) {
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
function Me(e) {
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
  }), r = ve(n, t, ["purchase_value", "current_value", "day_change_abs", "gain_abs"]);
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
        const u = e[l], g = typeof u.security_uuid == "string" ? u.security_uuid : null;
        g && (c.dataset.security = g), c.classList.add("position-row");
        const d = c.cells.item(2);
        if (d) {
          const { markup: h, sortValue: y, ariaLabel: m } = Vo(u);
          d.innerHTML = h, d.dataset.sortValue = String(y), m ? d.setAttribute("aria-label", m) : d.removeAttribute("aria-label");
        }
        const f = c.cells.item(7);
        if (f) {
          const h = ge(u.performance), y = typeof (h == null ? void 0 : h.gain_pct) == "number" && Number.isFinite(h.gain_pct) ? h.gain_pct : null, m = y != null ? `${y.toLocaleString("de-DE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })} %` : "—", _ = y == null ? "neutral" : y > 0 ? "positive" : y < 0 ? "negative" : "neutral";
          f.dataset.gainPct = m, f.dataset.gainSign = _;
        }
        const p = c.cells.item(8);
        p && p.classList.add("gain-pct-cell");
      }), o.dataset.defaultSort = "name", o.dataset.defaultDir = "asc", gr(o), o.outerHTML;
    }
  } catch (i) {
    console.warn("renderPositionsTable: Konnte Sortier-Metadaten nicht injizieren:", i);
  }
  return r;
}
function qo(e) {
  const t = gt(e ?? []);
  return Me(t);
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
        Gr(c) || console.warn("attachSecurityDetailDelegation: Detail-Tab konnte nicht geöffnet werden für", c);
      } catch (l) {
        console.error("attachSecurityDetailDelegation: Fehler beim Öffnen des Detail-Tabs", l);
      }
  })));
}
function He(e, t) {
  Oo(e, t);
}
function pr(e) {
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
    const F = Number.isFinite(v.position_count) ? v.position_count : 0, q = Number.isFinite(v.purchase_sum) ? v.purchase_sum : 0, W = v.hasValue && typeof v.current_value == "number" && Number.isFinite(v.current_value) ? v.current_value : null, K = W !== null, V = v.performance, j = typeof v.gain_abs == "number" ? v.gain_abs : typeof (V == null ? void 0 : V.gain_abs) == "number" ? V.gain_abs : null, O = typeof v.gain_pct == "number" ? v.gain_pct : typeof (V == null ? void 0 : V.gain_pct) == "number" ? V.gain_pct : null, ce = V && typeof V == "object" ? V.day_change : null, Be = typeof v.day_change_abs == "number" ? v.day_change_abs : ce && typeof ce == "object" ? ce.value_change_eur ?? ce.price_change_eur : null, We = typeof v.day_change_pct == "number" ? v.day_change_pct : ce && typeof ce == "object" && typeof ce.change_pct == "number" ? ce.change_pct : null, Xr = v.fx_unavailable && K, Zr = typeof v.coverage_ratio == "number" && Number.isFinite(v.coverage_ratio) ? v.coverage_ratio : "", Jr = typeof v.provenance == "string" ? v.provenance : "", Qr = typeof v.metric_run_uuid == "string" ? v.metric_run_uuid : "", Ne = tt.has(v.uuid), ei = Ne ? "portfolio-toggle expanded" : "portfolio-toggle", sn = `portfolio-details-${v.uuid}`, X = {
      fx_unavailable: v.fx_unavailable,
      purchase_value: q,
      current_value: W,
      day_change_abs: Be,
      day_change_pct: We,
      gain_abs: j,
      gain_pct: O
    }, he = { hasValue: K }, ti = L("purchase_value", X.purchase_value, X, he), ni = L("current_value", X.current_value, X, he), ri = L("day_change_abs", X.day_change_abs, X, he), ii = L("day_change_pct", X.day_change_pct, X, he), oi = L("gain_abs", X.gain_abs, X, he), ai = L("gain_pct", X.gain_pct, X, he), cn = K && typeof O == "number" && Number.isFinite(O) ? `${ae(O)} %` : "", si = K && typeof O == "number" && Number.isFinite(O) ? O > 0 ? "positive" : O < 0 ? "negative" : "neutral" : "", ci = K && typeof W == "number" && Number.isFinite(W) ? W : "", li = K && typeof j == "number" && Number.isFinite(j) ? j : "", ui = K && typeof O == "number" && Number.isFinite(O) ? O : "", di = K && typeof Be == "number" && Number.isFinite(Be) ? Be : "", fi = K && typeof We == "number" && Number.isFinite(We) ? We : "", gi = String(F);
    let mt = "";
    cn && (mt = ` data-gain-pct="${t(cn)}" data-gain-sign="${t(si)}"`), Xr && (mt += ' data-partial="true"'), n += `<tr class="portfolio-row"
                  data-portfolio="${v.uuid}"
                  data-position-count="${gi}"
                  data-current-value="${t(ci)}"
                  data-purchase-sum="${t(q)}"
                  data-day-change="${t(di)}"
                  data-day-change-pct="${t(fi)}"
                  data-gain-abs="${t(li)}"
                data-gain-pct="${t(ui)}"
                data-has-value="${K ? "true" : "false"}"
                data-fx-unavailable="${v.fx_unavailable ? "true" : "false"}"
                data-coverage-ratio="${t(Zr)}"
                data-provenance="${t(Jr)}"
                data-metric-run-uuid="${t(Qr)}">`;
    const pi = Le(v.name), mi = sr(v.badges, { containerClass: "portfolio-badges" });
    n += `<td>
        <button type="button"
                class="${ei}"
                data-portfolio="${v.uuid}"
                aria-expanded="${Ne ? "true" : "false"}"
                aria-controls="${sn}">
          <span class="caret">${Ne ? "▼" : "▶"}</span>
          <span class="portfolio-name">${pi}</span>${mi}
        </button>
      </td>`;
    const hi = F.toLocaleString("de-DE");
    n += `<td class="align-right">${hi}</td>`, n += `<td class="align-right">${ti}</td>`, n += `<td class="align-right">${ni}</td>`, n += `<td class="align-right">${ri}</td>`, n += `<td class="align-right">${ii}</td>`, n += `<td class="align-right"${mt}>${oi}</td>`, n += `<td class="align-right gain-pct-cell">${ai}</td>`, n += "</tr>", n += `<tr class="portfolio-details${Ne ? "" : " hidden"}"
                data-portfolio="${v.uuid}"
                id="${sn}"
                role="region"
                aria-label="Positionen für ${v.name}">
      <td colspan="${r.length}">
        <div class="positions-container">${Ne ? Gt(v.uuid) ? Me(Xn(v.uuid)) : '<div class="loading">Lade Positionen...</div>' : ""}</div>
      </td>
    </tr>`;
  });
  const i = e.filter((v) => typeof v.current_value == "number" && Number.isFinite(v.current_value)), o = e.reduce((v, F) => v + (Number.isFinite(F.position_count) ? F.position_count : 0), 0), a = i.reduce((v, F) => typeof F.current_value == "number" && Number.isFinite(F.current_value) ? v + F.current_value : v, 0), s = i.reduce((v, F) => typeof F.purchase_sum == "number" && Number.isFinite(F.purchase_sum) ? v + F.purchase_sum : v, 0), c = i.map((v) => {
    if (typeof v.day_change_abs == "number")
      return v.day_change_abs;
    const F = v.performance && typeof v.performance == "object" ? v.performance.day_change : null;
    if (F && typeof F == "object") {
      const q = F.value_change_eur;
      if (typeof q == "number" && Number.isFinite(q))
        return q;
    }
    return null;
  }).filter((v) => typeof v == "number" && Number.isFinite(v)), l = c.reduce((v, F) => v + F, 0), u = i.reduce((v, F) => {
    var K;
    if (typeof ((K = F.performance) == null ? void 0 : K.gain_abs) == "number" && Number.isFinite(F.performance.gain_abs))
      return v + F.performance.gain_abs;
    const q = typeof F.current_value == "number" && Number.isFinite(F.current_value) ? F.current_value : 0, W = typeof F.purchase_sum == "number" && Number.isFinite(F.purchase_sum) ? F.purchase_sum : 0;
    return v + (q - W);
  }, 0), g = i.length > 0, d = i.length !== e.length, f = c.length > 0, p = f && g && a !== 0 ? (() => {
    const v = a - l;
    return v ? l / v * 100 : null;
  })() : null, h = g && s > 0 ? u / s * 100 : null, y = {
    fx_unavailable: d,
    purchase_value: g ? s : null,
    current_value: g ? a : null,
    day_change_abs: f ? l : null,
    day_change_pct: f ? p : null,
    gain_abs: g ? u : null,
    gain_pct: g ? h : null
  }, m = { hasValue: g }, _ = { hasValue: f }, b = L("purchase_value", y.purchase_value, y, m), S = L("current_value", y.current_value, y, m), P = L("day_change_abs", y.day_change_abs, y, _), N = L("day_change_pct", y.day_change_pct, y, _), A = L("gain_abs", y.gain_abs, y, m), $ = L("gain_pct", y.gain_pct, y, m);
  let D = "";
  if (g && typeof h == "number" && Number.isFinite(h)) {
    const v = `${ae(h)} %`, F = h > 0 ? "positive" : h < 0 ? "negative" : "neutral";
    D = ` data-gain-pct="${t(v)}" data-gain-sign="${t(F)}"`;
  }
  d && (D += ' data-partial="true"');
  const C = String(Math.round(o)), k = g ? String(a) : "", T = g ? String(s) : "", x = f ? String(l) : "", w = f && typeof p == "number" && Number.isFinite(p) ? String(p) : "", E = g ? String(u) : "", M = g && typeof h == "number" && Number.isFinite(h) ? String(h) : "";
  return n += `<tr class="footer-row"
      data-position-count="${C}"
      data-current-value="${t(k)}"
      data-purchase-sum="${t(T)}"
      data-day-change="${t(x)}"
      data-day-change-pct="${t(w)}"
      data-gain-abs="${t(E)}"
      data-gain-pct="${t(M)}"
      data-has-value="${g ? "true" : "false"}"
      data-fx-unavailable="${d ? "true" : "false"}">
      <td>Summe</td>
      <td class="align-right">${Math.round(o).toLocaleString("de-DE")}</td>
    <td class="align-right">${b}</td>
    <td class="align-right">${S}</td>
    <td class="align-right">${P}</td>
    <td class="align-right">${N}</td>
    <td class="align-right"${D}>${A}</td>
    <td class="align-right gain-pct-cell">${$}</td>
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
function Ee(e) {
  if (e === void 0)
    return null;
  const t = Number(e);
  return Number.isFinite(t) ? t : null;
}
function mr(e) {
  var T;
  const t = Bo(e);
  if (!t)
    return;
  const n = t.tBodies.item(0);
  if (!n)
    return;
  const r = Array.from(n.querySelectorAll("tr.portfolio-row"));
  if (!r.length)
    return;
  let i = 0, o = 0, a = 0, s = 0, c = 0, l = !1, u = !1, g = !0, d = !1;
  for (const x of r) {
    const w = Ee(x.dataset.positionCount);
    w != null && (i += w), x.dataset.fxUnavailable === "true" && (d = !0);
    const E = x.dataset.hasValue;
    if (!!(E === "false" || E === "0" || E === "" || E == null)) {
      g = !1;
      continue;
    }
    l = !0;
    const v = Ee(x.dataset.currentValue), F = Ee(x.dataset.gainAbs), q = Ee(x.dataset.purchaseSum), W = Ee((T = x.dataset) == null ? void 0 : T.dayChange);
    if (v == null || F == null || q == null) {
      g = !1;
      continue;
    }
    o += v, s += F, a += q, W != null && (c += W, u = !0);
  }
  const f = l && g, p = f && a > 0 ? s / a * 100 : null, h = u && f && o !== 0 ? (() => {
    const x = o - c;
    return x ? c / x * 100 : null;
  })() : null;
  let y = Array.from(n.children).find(
    (x) => x instanceof HTMLTableRowElement && x.classList.contains("footer-row")
  );
  y || (y = document.createElement("tr"), y.classList.add("footer-row"), n.appendChild(y));
  const m = Math.round(i).toLocaleString("de-DE"), _ = {
    fx_unavailable: d || !f,
    purchase_value: f ? a : null,
    current_value: f ? o : null,
    day_change_abs: u && f ? c : null,
    day_change_pct: u && f ? h : null,
    gain_abs: f ? s : null,
    gain_pct: f ? p : null
  }, b = { hasValue: f }, S = { hasValue: u && f }, P = L("purchase_value", _.purchase_value, _, b), N = L("current_value", _.current_value, _, b), A = L("day_change_abs", _.day_change_abs, _, S), $ = L("day_change_pct", _.day_change_pct, _, S), D = L("gain_abs", _.gain_abs, _, b), C = L("gain_pct", _.gain_pct, _, b);
  y.innerHTML = `
      <td>Summe</td>
      <td class="align-right">${m}</td>
      <td class="align-right">${P}</td>
      <td class="align-right">${N}</td>
      <td class="align-right">${A}</td>
      <td class="align-right">${$}</td>
      <td class="align-right">${D}</td>
      <td class="align-right">${C}</td>
    `;
  const k = y.cells.item(6);
  k && (k.dataset.gainPct = f && typeof p == "number" ? `${ae(p)} %` : "—", k.dataset.gainSign = f && typeof p == "number" ? p > 0 ? "positive" : p < 0 ? "negative" : "neutral" : "neutral"), y.dataset.positionCount = String(Math.round(i)), y.dataset.currentValue = f ? String(o) : "", y.dataset.purchaseSum = f ? String(a) : "", y.dataset.dayChange = f && u ? String(c) : "", y.dataset.dayChangePct = f && u && typeof h == "number" ? String(h) : "", y.dataset.gainAbs = f ? String(s) : "", y.dataset.gainPct = f && typeof p == "number" ? String(p) : "", y.dataset.hasValue = f ? "true" : "false", y.dataset.fxUnavailable = d ? "true" : "false";
}
function Ie(e, t) {
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
  const o = (d, f) => {
    const p = i.querySelector("tbody");
    if (!p) return;
    const h = Array.from(p.querySelectorAll("tr")).filter((b) => !b.classList.contains("footer-row")), y = p.querySelector("tr.footer-row"), m = (b) => {
      if (b == null) return 0;
      const S = b.replace(/\u00A0/g, " ").replace(/[%€]/g, "").replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, ""), P = Number.parseFloat(S);
      return Number.isFinite(P) ? P : 0;
    };
    h.sort((b, S) => {
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
      }[d], A = b.cells.item(N), $ = S.cells.item(N);
      let D = "";
      if (A) {
        const x = A.textContent;
        typeof x == "string" && (D = x.trim());
      }
      let C = "";
      if ($) {
        const x = $.textContent;
        typeof x == "string" && (C = x.trim());
      }
      const k = (x, w) => {
        const E = x ? x.dataset.sortValue : void 0;
        if (E != null && E !== "") {
          const M = Number(E);
          if (Number.isFinite(M))
            return M;
        }
        return m(w);
      };
      let T;
      if (d === "name")
        T = D.localeCompare(C, "de", { sensitivity: "base" });
      else {
        const x = k(A, D), w = k($, C);
        T = x - w;
      }
      return f === "asc" ? T : -T;
    }), i.querySelectorAll("thead th.sort-active").forEach((b) => {
      b.classList.remove("sort-active", "dir-asc", "dir-desc");
    });
    const _ = i.querySelector(`thead th[data-sort-key="${d}"]`);
    _ && _.classList.add("sort-active", f === "asc" ? "dir-asc" : "dir-desc"), h.forEach((b) => p.appendChild(b)), y && p.appendChild(y);
  }, a = r.dataset.sortKey, s = r.dataset.sortDir, c = i.dataset.defaultSort, l = i.dataset.defaultDir, u = vt(a) ? a : vt(c) ? c : "name", g = St(s) ? s : St(l) ? l : "asc";
  o(u, g), i.addEventListener("click", (d) => {
    const f = d.target;
    if (!(f instanceof Element))
      return;
    const p = f.closest("th[data-sort-key]");
    if (!p || !i.contains(p)) return;
    const h = p.getAttribute("data-sort-key");
    if (!vt(h))
      return;
    let y = "asc";
    r.dataset.sortKey === h && (y = (St(r.dataset.sortDir) ? r.dataset.sortDir : "asc") === "asc" ? "desc" : "asc"), r.dataset.sortKey = h, r.dataset.sortDir = y, o(h, y);
  });
}
async function Wo(e, t, n) {
  if (!e || !Qe || !et) return;
  const r = t || n.querySelector(
    `.portfolio-details[data-portfolio="${e}"] .positions-container`
  );
  if (!r)
    return;
  const i = r.closest(".portfolio-details");
  if (!(i && i.classList.contains("hidden"))) {
    r.innerHTML = '<div class="loading">Neu laden...</div>';
    try {
      const o = await Kn(
        Qe,
        et,
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
      Kt(e, a), Xt(e, a), r.innerHTML = Me(a);
      try {
        Ie(n, e);
      } catch (s) {
        console.warn("attachPortfolioToggleHandler: Sort-Init (Lazy) fehlgeschlagen:", s);
      }
      try {
        He(n, e);
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
function tn(e) {
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
              const f = s.getAttribute("data-portfolio");
              if (f) {
                const p = e.querySelector(
                  `.portfolio-details[data-portfolio="${f}"]`
                ), h = p == null ? void 0 : p.querySelector(".positions-container");
                await Wo(f, h ?? null, e);
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
            const g = c.querySelector(".caret");
            if (u.classList.contains("hidden")) {
              u.classList.remove("hidden"), c.classList.add("expanded"), c.setAttribute("aria-expanded", "true"), g && (g.textContent = "▼"), tt.add(l);
              try {
                en(e, l);
              } catch (f) {
                console.warn("attachPortfolioToggleHandler: Pending-Flush fehlgeschlagen:", f);
              }
              if (Gt(l)) {
                const f = u.querySelector(".positions-container");
                if (f) {
                  f.innerHTML = Me(
                    Xn(l)
                  ), Ie(e, l);
                  try {
                    He(e, l);
                  } catch (p) {
                    console.warn("attachPortfolioToggleHandler: Security-Listener (Cache) Fehler:", p);
                  }
                }
              } else {
                const f = u.querySelector(".positions-container");
                f && (f.innerHTML = '<div class="loading">Lade Positionen...</div>');
                try {
                  const p = await Kn(
                    Qe,
                    et,
                    l
                  );
                  if (p.error) {
                    const y = typeof p.error == "string" ? p.error : String(p.error);
                    f && (f.innerHTML = `<div class="error">${y} <button class="retry-pos" data-portfolio="${l}">Erneut laden</button></div>`);
                    return;
                  }
                  const h = gt(
                    Array.isArray(p.positions) ? p.positions : []
                  );
                  if (Kt(l, h), Xt(
                    l,
                    h
                  ), f) {
                    f.innerHTML = Me(h);
                    try {
                      Ie(e, l);
                    } catch (y) {
                      console.warn("attachPortfolioToggleHandler: Sort-Init (Lazy) fehlgeschlagen:", y);
                    }
                    try {
                      He(e, l);
                    } catch (y) {
                      console.warn("attachPortfolioToggleHandler: Security-Listener konnte nicht gebunden werden:", y);
                    }
                  }
                } catch (p) {
                  const h = p instanceof Error ? p.message : String(p), y = u.querySelector(".positions-container");
                  y && (y.innerHTML = `<div class="error">Fehler beim Laden: ${h} <button class="retry-pos" data-portfolio="${l}">Retry</button></div>`), console.error("Fehler beim Lazy Load für", l, p);
                }
              }
            } else
              u.classList.add("hidden"), c.classList.remove("expanded"), c.setAttribute("aria-expanded", "false"), g && (g.textContent = "▶"), tt.delete(l);
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
async function hr(e, t, n) {
  var k, T, x;
  Qe = t ?? null, et = n ?? null, console.debug(
    "renderDashboard: start – panelConfig:",
    n == null ? void 0 : n.config,
    "derived entry_id?",
    (x = (T = (k = n == null ? void 0 : n.config) == null ? void 0 : k._panel_custom) == null ? void 0 : T.config) == null ? void 0 : x.entry_id
  );
  const r = await Ci(t, n);
  er(r.accounts);
  const i = ar(), o = await Di(t, n);
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
  ), l = a.some((w) => w.fx_unavailable), u = i.some((w) => w.fx_unavailable && (w.balance == null || !Number.isFinite(w.balance))), g = a.reduce((w, E) => E.hasValue && typeof E.current_value == "number" && Number.isFinite(E.current_value) ? w + E.current_value : w, 0), d = c + g, f = "Teilw. fehlende FX-Kurse – Gesamtvermögen abweichend", h = a.some((w) => w.hasValue && typeof w.current_value == "number" && Number.isFinite(w.current_value)) || i.some((w) => typeof w.balance == "number" && Number.isFinite(w.balance)) ? `${ae(d)}&nbsp;€` : `<span class="missing-value" role="note" aria-label="${f}" title="${f}">—</span>`, y = l || u ? `<span class="total-wealth-note">${f}</span>` : "", m = `
    <div class="header-meta-row">
      💰 Gesamtvermögen: <strong class="total-wealth-value">${h}</strong>${y}
    </div>
  `, _ = xt("Übersicht", m), b = pr(a), S = i.filter((w) => (w.currency_code ?? "EUR") === "EUR"), P = i.filter((w) => (w.currency_code ?? "EUR") !== "EUR"), A = P.some((w) => w.fx_unavailable) ? `
        <p class="table-note" role="note">
          <span class="table-note__icon" aria-hidden="true">⚠️</span>
          <span>Wechselkurse konnten nicht geladen werden. EUR-Werte werden derzeit nicht angezeigt.</span>
        </p>
      ` : "", $ = `
    <div class="card">
      <h2>Liquidität</h2>
      <div class="scroll-container account-table">
        ${ve(
    S.map((w) => ({
      name: Je(w.name, w.badges, {
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
          ${ve(
    P.map((w) => {
      const E = w.orig_balance, v = typeof E == "number" && Number.isFinite(E) ? `${E.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}&nbsp;${w.currency_code ?? ""}` : "";
      return {
        name: Je(w.name, w.badges, {
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
  `, D = `
    <div class="card footer-card">
      <div class="meta">
        <div class="last-file-update">
          📂 Letzte Aktualisierung der Datei: <strong>${s || "Unbekannt"}</strong>
        </div>
      </div>
    </div>
  `, C = `
    ${_.outerHTML}
    <div class="card">
      <h2>Investment</h2>
      <div class="scroll-container portfolio-table">
        ${b}
      </div>
    </div>
    ${$}
    ${D}
  `;
  return Go(e, a), C;
}
function Go(e, t) {
  if (!e)
    return;
  const n = () => {
    try {
      const i = e, o = i.querySelector(".portfolio-table");
      o && o.querySelectorAll(".portfolio-toggle").length === 0 && (console.debug("Recovery: Tabelle ohne Buttons – erneuter Aufbau"), o.innerHTML = pr(t)), tn(e), Ko(e), tt.forEach((a) => {
        try {
          Gt(a) && (Ie(e, a), He(e, a));
        } catch (s) {
          console.warn("Init-Sortierung für expandiertes Depot fehlgeschlagen:", a, s);
        }
      });
      try {
        mr(i);
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
  applyGainPctMetadata: gr,
  attachSecurityDetailListener: He,
  attachPortfolioPositionsSorting: Ie,
  updatePortfolioFooter: (e) => {
    e && mr(e);
  }
});
const Yo = "http://www.w3.org/2000/svg", De = 640, ke = 260, Ce = { top: 12, right: 16, bottom: 24, left: 16 }, xe = "var(--pp-reader-chart-line, #3f51b5)", Tt = "var(--pp-reader-chart-area, rgba(63, 81, 181, 0.12))", wn = "0.75rem", _r = "var(--pp-reader-chart-baseline, rgba(96, 125, 139, 0.75))", yr = "6 4", Xo = 24 * 60 * 60 * 1e3;
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
function Z(e) {
  return `${String(e)}px`;
}
function ee(e, t = {}) {
  const n = document.createElementNS(Yo, e);
  return Object.entries(t).forEach(([r, i]) => {
    const o = Zo(i);
    o != null && n.setAttribute(r, o);
  }), n;
}
function nt(e, t = null) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  if (typeof e == "string" && e.trim() !== "") {
    const n = Number.parseFloat(e);
    if (Number.isFinite(n))
      return n;
  }
  return t;
}
function br(e, t) {
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
const vr = (e) => {
  if (e && typeof e == "object" && "date" in e)
    return e.date;
}, Sr = (e) => {
  if (e && typeof e == "object" && "close" in e)
    return e.close;
}, Pr = (e, t, n) => {
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
}, Ar = (e, t, n) => (Number.isFinite(e) ? e : nt(e, 0) ?? 0).toLocaleString("de-DE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
}), Nr = ({ xFormatted: e, yFormatted: t }) => `
    <div class="chart-tooltip-date">${e}</div>
    <div class="chart-tooltip-value">${t}&nbsp;€</div>
  `, wr = ({
  marker: e,
  xFormatted: t,
  yFormatted: n
}) => `
    <div class="chart-tooltip-date">${(typeof e.label == "string" ? e.label : null) || t}</div>
    <div class="chart-tooltip-value">${n}</div>
  `;
function Er(e) {
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
    width: De,
    height: ke,
    margin: { ...Ce },
    series: [],
    points: [],
    range: null,
    xAccessor: vr,
    yAccessor: Sr,
    xFormatter: Pr,
    yFormatter: Ar,
    tooltipRenderer: Nr,
    markerTooltipRenderer: wr,
    color: xe,
    areaColor: Tt,
    baseline: null,
    handlersAttached: !1,
    markers: [],
    markerPositions: []
  }), e.__chartState;
}
function Q(e, t, n) {
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
  const r = (n == null ? void 0 : n.color) ?? _r, i = (n == null ? void 0 : n.dashArray) ?? yr;
  t.setAttribute("stroke", r), t.setAttribute("stroke-dasharray", i);
}
function Pt(e) {
  const { baselineLine: t, baseline: n, range: r, margin: i, width: o } = e;
  if (!t)
    return;
  const a = n == null ? void 0 : n.value;
  if (!r || a == null || !Number.isFinite(a)) {
    t.style.opacity = "0";
    return;
  }
  const { minY: s, maxY: c, boundedHeight: l } = r, u = Number.isFinite(s) ? s : a, d = (Number.isFinite(c) ? c : u + 1) - u, f = d === 0 ? 0.5 : (a - u) / d, p = Q(f, 0, 1), h = Math.max(l, 0), y = i.top + (1 - p) * h, m = Math.max(o - i.left - i.right, 0), _ = i.left, b = i.left + m;
  t.setAttribute("x1", _.toFixed(2)), t.setAttribute("x2", b.toFixed(2)), t.setAttribute("y1", y.toFixed(2)), t.setAttribute("y2", y.toFixed(2)), t.style.opacity = "1";
}
function na(e, t, n) {
  var w;
  const { width: r, height: i, margin: o } = t, { xAccessor: a, yAccessor: s } = n;
  if (e.length === 0)
    return { points: [], range: null };
  const c = e.map((E, M) => {
    const v = a(E, M), F = s(E, M), q = br(v, M), W = nt(F, Number.NaN);
    return Number.isFinite(W) ? {
      index: M,
      data: E,
      xValue: q,
      yValue: W
    } : null;
  }).filter((E) => !!E);
  if (c.length === 0)
    return { points: [], range: null };
  const l = c.reduce((E, M) => Math.min(E, M.xValue), c[0].xValue), u = c.reduce((E, M) => Math.max(E, M.xValue), c[0].xValue), g = c.reduce((E, M) => Math.min(E, M.yValue), c[0].yValue), d = c.reduce((E, M) => Math.max(E, M.yValue), c[0].yValue), f = Math.max(r - o.left - o.right, 1), p = Math.max(i - o.top - o.bottom, 1), h = Number.isFinite(l) ? l : 0, y = Number.isFinite(u) ? u : h + 1, m = Number.isFinite(g) ? g : 0, _ = Number.isFinite(d) ? d : m + 1, b = nt((w = t.baseline) == null ? void 0 : w.value, null), S = b != null && Number.isFinite(b) ? Math.min(m, b) : m, P = b != null && Number.isFinite(b) ? Math.max(_, b) : _, N = Math.max(
    2,
    Math.min(
      6,
      Math.round(
        Math.max(i - o.top - o.bottom, 0) / 60
      ) || 4
    )
  ), { niceMin: A, niceMax: $ } = ua(
    S,
    P,
    N
  ), D = Number.isFinite(A) ? A : m, C = Number.isFinite($) ? $ : _, k = y - h || 1, T = C - D || 1;
  return {
    points: c.map((E) => {
      const M = k === 0 ? 0.5 : (E.xValue - h) / k, v = T === 0 ? 0.5 : (E.yValue - D) / T, F = o.left + M * f, q = o.top + (1 - v) * p;
      return {
        ...E,
        x: F,
        y: q
      };
    }),
    range: {
      minX: h,
      maxX: y,
      minY: D,
      maxY: C,
      boundedWidth: f,
      boundedHeight: p
    }
  };
}
function At(e) {
  const { markerLayer: t, markerOverlay: n, markers: r, range: i, margin: o, markerTooltip: a } = e;
  if (e.markerPositions = [], Ye(e), !t || !n)
    return;
  for (; t.firstChild; )
    t.removeChild(t.firstChild);
  for (; n.firstChild; )
    n.removeChild(n.firstChild);
  if (!i || !Array.isArray(r) || r.length === 0)
    return;
  const s = i.maxX - i.minX || 1, c = i.maxY - i.minY || 1;
  r.forEach((l, u) => {
    const g = br(l.x, u), d = nt(l.y, Number.NaN), f = Number(d);
    if (!Number.isFinite(g) || !Number.isFinite(f))
      return;
    const p = s === 0 ? 0.5 : Q((g - i.minX) / s, 0, 1), h = c === 0 ? 0.5 : Q((f - i.minY) / c, 0, 1), y = o.left + p * i.boundedWidth, m = o.top + (1 - h) * i.boundedHeight, _ = ee("g", {
      class: "line-chart-marker",
      transform: `translate(${y.toFixed(2)} ${m.toFixed(2)})`,
      "data-marker-id": l.id
    }), b = ee("circle", {
      r: 5,
      fill: l.color || e.color,
      stroke: "#fff",
      "stroke-width": 2,
      opacity: 0.95
    });
    _.appendChild(b), t.appendChild(_), e.markerPositions.push({
      marker: l,
      x: y,
      y: m
    });
  }), a && (a.style.opacity = "0", a.style.visibility = "hidden");
}
function Fr(e, t, n, r) {
  e.width = Number.isFinite(t) ? Number(t) : De, e.height = Number.isFinite(n) ? Number(n) : ke, e.margin = {
    top: Number.isFinite(r == null ? void 0 : r.top) ? Number(r == null ? void 0 : r.top) : Ce.top,
    right: Number.isFinite(r == null ? void 0 : r.right) ? Number(r == null ? void 0 : r.right) : Ce.right,
    bottom: Number.isFinite(r == null ? void 0 : r.bottom) ? Number(r == null ? void 0 : r.bottom) : Ce.bottom,
    left: Number.isFinite(r == null ? void 0 : r.left) ? Number(r == null ? void 0 : r.left) : Ce.left
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
  const c = r.offsetWidth || 0, l = r.offsetHeight || 0, u = Q(t.x - c / 2, o.left, i - o.right - c), g = Math.max(s - l, 0), d = 12, f = Number.isFinite(n) ? Q(n ?? 0, o.top, s) : t.y;
  let p = f - l - d;
  p < o.top && (p = f + d), p = Q(p, 0, g);
  const h = Z(Math.round(u)), y = Z(Math.round(p));
  r.style.transform = `translate(${h}, ${y})`;
}
function $t(e) {
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
  const l = r.offsetWidth || 0, u = r.offsetHeight || 0, g = Q(t.x - l / 2, o.left, i - o.right - l), d = Math.max(c - u, 0), f = 10, p = s == null ? void 0 : s.getBoundingClientRect(), h = (N = e.svg) == null ? void 0 : N.getBoundingClientRect(), y = p && h ? p.top - h.top : null, m = p && h ? p.bottom - h.top : null, _ = Number.isFinite(n) ? Q(n ?? t.y, o.top, c) : t.y;
  let b;
  y != null && m != null ? y <= _ ? b = y - u - f : b = m + f : (b = _ - u - f, b < o.top && (b = _ + f)), b = Q(b, 0, d);
  const S = Z(Math.round(g)), P = Z(Math.round(b));
  r.style.transform = `translate(${S}, ${P})`;
}
function Ye(e) {
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
      $t(t), Ye(t);
      return;
    }
    const o = t.svg.getBoundingClientRect(), a = i.clientX - o.left, s = i.clientY - o.top;
    let c = t.points[0], l = Math.abs(a - c.x);
    for (let g = 1; g < t.points.length; g += 1) {
      const d = t.points[g], f = Math.abs(a - d.x);
      f < l && (l = f, c = d);
    }
    t.focusCircle && (t.focusCircle.setAttribute("cx", c.x.toFixed(2)), t.focusCircle.setAttribute("cy", c.y.toFixed(2)), t.focusCircle.style.opacity = "1"), t.focusLine && (t.focusLine.setAttribute("x1", c.x.toFixed(2)), t.focusLine.setAttribute("x2", c.x.toFixed(2)), t.focusLine.setAttribute("y1", t.margin.top.toFixed(2)), t.focusLine.setAttribute(
      "y2",
      (t.height - t.margin.bottom).toFixed(2)
    ), t.focusLine.style.opacity = "1"), t.tooltip && (t.tooltip.innerHTML = ra(t, c), ia(t, c, s));
    const u = sa(t, a, s);
    u && t.markerTooltip ? (t.markerTooltip.innerHTML = oa(t, u), aa(t, u, s)) : Ye(t);
  }, r = () => {
    $t(t), Ye(t);
  };
  t.overlay.addEventListener("pointermove", n), t.overlay.addEventListener("pointerenter", n), t.overlay.addEventListener("pointerleave", r), t.handlersAttached = !0, t.handlePointerMove = n, t.handlePointerLeave = r, e.addEventListener("pointercancel", r);
}
function la(e, t = {}) {
  const n = document.createElement("div");
  n.className = "line-chart-container", n.dataset.chartType = "line", n.style.position = "relative";
  const r = ee("svg", {
    width: De,
    height: ke,
    viewBox: `0 0 ${String(De)} ${String(ke)}`,
    role: "img",
    "aria-hidden": "true",
    focusable: "false"
  });
  r.classList.add("line-chart-svg");
  const i = ee("path", {
    class: "line-chart-area",
    fill: Tt,
    stroke: "none"
  }), o = ee("line", {
    class: "line-chart-baseline",
    stroke: _r,
    "stroke-width": 1,
    "stroke-dasharray": yr,
    opacity: 0
  }), a = ee("path", {
    class: "line-chart-path",
    fill: "none",
    stroke: xe,
    "stroke-width": 2,
    "stroke-linecap": "round",
    "stroke-linejoin": "round"
  }), s = ee("line", {
    class: "line-chart-focus-line",
    stroke: xe,
    "stroke-width": 1,
    "stroke-dasharray": "4 4",
    opacity: 0
  }), c = ee("circle", {
    class: "line-chart-focus-circle",
    r: 4,
    fill: "#fff",
    stroke: xe,
    "stroke-width": 2,
    opacity: 0
  }), l = ee("g", {
    class: "line-chart-markers"
  }), u = ee("rect", {
    class: "line-chart-overlay",
    fill: "transparent",
    x: 0,
    y: 0,
    width: De,
    height: ke
  });
  r.appendChild(i), r.appendChild(o), r.appendChild(a), r.appendChild(s), r.appendChild(c), r.appendChild(l), r.appendChild(u), n.appendChild(r);
  const g = document.createElement("div");
  g.className = "chart-tooltip", g.style.position = "absolute", g.style.top = "0", g.style.left = "0", g.style.pointerEvents = "none", g.style.opacity = "0", g.style.visibility = "hidden", n.appendChild(g);
  const d = document.createElement("div");
  d.className = "line-chart-marker-overlay", d.style.position = "absolute", d.style.top = "0", d.style.left = "0", d.style.width = "100%", d.style.height = "100%", d.style.pointerEvents = "none", d.style.overflow = "visible", d.style.zIndex = "2", n.appendChild(d);
  const f = document.createElement("div");
  f.className = "chart-tooltip chart-tooltip--marker", f.style.position = "absolute", f.style.top = "0", f.style.left = "0", f.style.pointerEvents = "none", f.style.opacity = "0", f.style.visibility = "hidden", n.appendChild(f), e.appendChild(n);
  const p = Er(n);
  if (p.svg = r, p.areaPath = i, p.linePath = a, p.baselineLine = o, p.focusLine = s, p.focusCircle = c, p.overlay = u, p.tooltip = g, p.markerOverlay = d, p.markerLayer = l, p.markerTooltip = f, p.xAccessor = t.xAccessor ?? vr, p.yAccessor = t.yAccessor ?? Sr, p.xFormatter = t.xFormatter ?? Pr, p.yFormatter = t.yFormatter ?? Ar, p.tooltipRenderer = t.tooltipRenderer ?? Nr, p.markerTooltipRenderer = t.markerTooltipRenderer ?? wr, p.color = t.color ?? xe, p.areaColor = t.areaColor ?? Tt, p.baseline = t.baseline ?? null, p.handlersAttached = !1, p.markers = Array.isArray(t.markers) ? t.markers.slice() : [], !p.xAxis) {
    const h = document.createElement("div");
    h.className = "line-chart-axis line-chart-axis-x", h.style.position = "absolute", h.style.left = "0", h.style.right = "0", h.style.bottom = "0", h.style.pointerEvents = "none", h.style.fontSize = wn, h.style.color = "var(--secondary-text-color)", h.style.display = "block", n.appendChild(h), p.xAxis = h;
  }
  if (!p.yAxis) {
    const h = document.createElement("div");
    h.className = "line-chart-axis line-chart-axis-y", h.style.position = "absolute", h.style.top = "0", h.style.bottom = "0", h.style.left = "0", h.style.pointerEvents = "none", h.style.fontSize = wn, h.style.color = "var(--secondary-text-color)", h.style.display = "block", n.appendChild(h), p.yAxis = h;
  }
  return Fr(p, t.width, t.height, t.margin), a.setAttribute("stroke", p.color), s.setAttribute("stroke", p.color), c.setAttribute("stroke", p.color), i.setAttribute("fill", p.areaColor), Cr(n, t), ca(n, p), n;
}
function Cr(e, t = {}) {
  if (!e) {
    console.error("updateLineChart: container element is required");
    return;
  }
  const n = Er(e);
  if (!n.svg || !n.linePath || !n.overlay) {
    console.error("updateLineChart: chart was not initialised with renderLineChart");
    return;
  }
  t.xAccessor && (n.xAccessor = t.xAccessor), t.yAccessor && (n.yAccessor = t.yAccessor), t.xFormatter && (n.xFormatter = t.xFormatter), t.yFormatter && (n.yFormatter = t.yFormatter), t.tooltipRenderer && (n.tooltipRenderer = t.tooltipRenderer), t.markerTooltipRenderer && (n.markerTooltipRenderer = t.markerTooltipRenderer), t.color && (n.color = t.color, n.linePath.setAttribute("stroke", n.color), n.focusLine && n.focusLine.setAttribute("stroke", n.color), n.focusCircle && n.focusCircle.setAttribute("stroke", n.color)), t.areaColor && (n.areaColor = t.areaColor, n.areaPath && n.areaPath.setAttribute("fill", n.areaColor)), Object.prototype.hasOwnProperty.call(t, "baseline") && (n.baseline = t.baseline ?? null), Array.isArray(t.markers) && (n.markers = t.markers.slice()), ta(n), Fr(n, t.width, t.height, t.margin);
  const { width: r, height: i } = n;
  n.svg.setAttribute("width", String(r)), n.svg.setAttribute("height", String(i)), n.svg.setAttribute("viewBox", `0 0 ${String(r)} ${String(i)}`), n.overlay.setAttribute("x", "0"), n.overlay.setAttribute("y", "0"), n.overlay.setAttribute("width", Math.max(r, 0).toFixed(2)), n.overlay.setAttribute("height", Math.max(i, 0).toFixed(2)), Array.isArray(t.series) && (n.series = Array.from(t.series));
  const { points: o, range: a } = na(n.series, n, {
    xAccessor: n.xAccessor,
    yAccessor: n.yAccessor
  });
  if (n.points = o, n.range = a, o.length === 0) {
    n.linePath.setAttribute("d", ""), n.areaPath && n.areaPath.setAttribute("d", ""), $t(n), At(n), Nt(n), Pt(n);
    return;
  }
  if (o.length === 1) {
    const c = o[0], l = Math.max(
      0.5,
      Math.min(4, Math.max(n.width - n.margin.left - n.margin.right, 1) * 0.01)
    ), u = `M${c.x.toFixed(2)} ${c.y.toFixed(2)} h${l.toFixed(2)}`;
    n.linePath.setAttribute("d", u), n.areaPath && n.areaPath.setAttribute("d", ""), n.focusCircle && (n.focusCircle.setAttribute("cx", c.x.toFixed(2)), n.focusCircle.setAttribute("cy", c.y.toFixed(2)), n.focusCircle.style.opacity = "1"), n.focusLine && (n.focusLine.style.opacity = "0"), Nt(n), Pt(n), At(n);
    return;
  }
  const s = ea(o);
  if (n.linePath.setAttribute("d", s), n.areaPath && a) {
    const c = n.margin.top + a.boundedHeight, l = Qo(o, c);
    n.areaPath.setAttribute("d", l);
  }
  Nt(n), Pt(n), At(n);
}
function Nt(e) {
  const { xAxis: t, yAxis: n, range: r, margin: i, height: o, yFormatter: a } = e;
  if (!t || !n)
    return;
  if (!r) {
    t.innerHTML = "", n.innerHTML = "";
    return;
  }
  const { minX: s, maxX: c, minY: l, maxY: u, boundedWidth: g, boundedHeight: d } = r, f = Number.isFinite(s) && Number.isFinite(c) && c >= s, p = Number.isFinite(l) && Number.isFinite(u) && u >= l, h = Math.max(g, 0), y = Math.max(d, 0);
  if (t.style.left = Z(i.left), t.style.width = Z(h), t.style.top = Z(o - i.bottom + 6), t.innerHTML = "", f && h > 0) {
    const _ = (c - s) / Xo, b = Math.max(2, Math.min(6, Math.round(h / 140) || 4));
    da(e, s, c, b, _).forEach(({ positionRatio: P, label: N }) => {
      const A = document.createElement("div");
      A.className = "line-chart-axis-tick line-chart-axis-tick-x", A.style.position = "absolute", A.style.bottom = "0";
      const $ = Q(P, 0, 1);
      A.style.left = Z($ * h);
      let D = "-50%", C = "center";
      $ <= 1e-3 ? (D = "0", C = "left", A.style.marginLeft = "2px") : $ >= 0.999 && (D = "-100%", C = "right", A.style.marginRight = "2px"), A.style.transform = `translateX(${D})`, A.style.textAlign = C, A.textContent = N, t.appendChild(A);
    });
  }
  n.style.top = Z(i.top), n.style.height = Z(y);
  const m = Math.max(i.left - 6, 0);
  if (n.style.left = "0", n.style.width = Z(Math.max(m, 0)), n.innerHTML = "", p && y > 0) {
    const _ = Math.max(2, Math.min(6, Math.round(y / 60) || 4)), b = fa(l, u, _), S = a;
    b.forEach(({ value: P, positionRatio: N }) => {
      const A = document.createElement("div");
      A.className = "line-chart-axis-tick line-chart-axis-tick-y", A.style.position = "absolute", A.style.left = "0";
      const D = (1 - Q(N, 0, 1)) * y;
      A.style.top = Z(D), A.textContent = S(P, null, -1), n.appendChild(A);
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
function da(e, t, n, r, i) {
  if (!Number.isFinite(t) || !Number.isFinite(n) || n < t)
    return [];
  if (!Number.isFinite(i) || i <= 0)
    return [
      {
        positionRatio: 0.5,
        label: En(e, t, i || 0)
      }
    ];
  const o = Math.max(2, r), a = [], s = n - t;
  for (let c = 0; c < o; c += 1) {
    const l = o === 1 ? 0.5 : c / (o - 1), u = t + l * s;
    a.push({
      positionRatio: l,
      label: En(e, u, i)
    });
  }
  return a;
}
function En(e, t, n) {
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
  const r = t - e, i = Math.max(2, n), o = r / (i - 1), a = Lt(o), s = Math.floor(e / a) * a, c = Math.ceil(t / a) * a, l = [];
  for (let u = s; u <= c + a / 2; u += a) {
    const g = (u - e) / (t - e);
    l.push({
      value: u,
      positionRatio: Q(g, 0, 1)
    });
  }
  return l.length > i + 2 ? l.filter((u, g) => g % 2 === 0) : l;
}
function Lt(e) {
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
function ma(e) {
  if (!pa(e))
    return !1;
  const t = e;
  return typeof t.portfolioUuid != "string" ? !1 : ga(t.securityUuids);
}
function ha(e) {
  return e instanceof CustomEvent ? ma(e.detail) : !1;
}
const wt = { min: 0, max: 6 }, rt = { min: 2, max: 4 }, _a = "1Y", xr = [
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
}, ba = /* @__PURE__ */ new Set([0, 2]), va = /* @__PURE__ */ new Set([1, 3]), Sa = "var(--pp-reader-chart-marker-buy, #2e7d32)", Pa = "var(--pp-reader-chart-marker-sell, #c0392b)", Et = {
  aggregation: "Aggregationsdaten",
  totals: "Kaufsummen",
  eur_total: "EUR-Kaufsumme"
}, _e = /* @__PURE__ */ new Map(), Xe = /* @__PURE__ */ new Map(), Ue = /* @__PURE__ */ new Map(), ye = /* @__PURE__ */ new Map(), Dr = "pp-reader:portfolio-positions-updated", Re = /* @__PURE__ */ new Map();
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
      Ue.set(e, t);
      return;
    }
    Ue.delete(e);
  }
}
function wa(e) {
  if (!e || typeof window > "u")
    return null;
  if (Ue.has(e)) {
    const t = Ue.get(e) || null;
    if (t)
      return t;
  }
  return null;
}
function kr(e) {
  return _e.has(e) || _e.set(e, /* @__PURE__ */ new Map()), _e.get(e);
}
function Rr(e) {
  return ye.has(e) || ye.set(e, /* @__PURE__ */ new Map()), ye.get(e);
}
function Tr(e) {
  if (e) {
    if (_e.has(e)) {
      try {
        const t = _e.get(e);
        t && t.clear();
      } catch (t) {
        console.warn("invalidateHistoryCache: Konnte Cache nicht leeren", e, t);
      }
      _e.delete(e);
    }
    if (ye.has(e)) {
      try {
        const t = ye.get(e);
        t == null || t.clear();
      } catch (t) {
        console.warn("invalidateHistoryCache: Konnte Marker-Cache nicht leeren", e, t);
      }
      ye.delete(e);
    }
  }
}
function $r(e) {
  e && Ue.delete(e);
}
function Ea(e, t) {
  if (!e || !t)
    return;
  const n = t.securityUuids;
  (Array.isArray(n) ? n : []).includes(e) && (Tr(e), $r(e));
}
function Fa(e) {
  if (!e || Re.has(e))
    return;
  const t = (n) => {
    ha(n) && Ea(e, n.detail);
  };
  try {
    window.addEventListener(Dr, t), Re.set(e, t);
  } catch (n) {
    console.error("ensureLiveUpdateSubscription: Registrierung fehlgeschlagen", n);
  }
}
function Ca(e) {
  if (!e || !Re.has(e))
    return;
  const t = Re.get(e);
  try {
    t && window.removeEventListener(Dr, t);
  } catch (n) {
    console.error("removeLiveUpdateSubscription: Entfernen des Listeners fehlgeschlagen", n);
  }
  Re.delete(e);
}
function xa(e) {
  e && (Ca(e), Tr(e), $r(e));
}
function Fn(e, t) {
  if (!Xe.has(e)) {
    Xe.set(e, { activeRange: t });
    return;
  }
  const n = Xe.get(e);
  n && (n.activeRange = t);
}
function Lr(e) {
  var t;
  return ((t = Xe.get(e)) == null ? void 0 : t.activeRange) ?? _a;
}
function Mt(e) {
  const t = Date.UTC(
    e.getUTCFullYear(),
    e.getUTCMonth(),
    e.getUTCDate()
  );
  return Math.floor(t / 864e5);
}
function Se(e) {
  const t = new Date(e.getTime());
  return t.setUTCHours(0, 0, 0, 0), t;
}
function Cn(e) {
  return !(e instanceof Date) || Number.isNaN(e.getTime()) ? null : Mt(Se(e));
}
function z(e) {
  return ie(e);
}
function Da(e) {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t || null;
}
function it(e) {
  const t = Da(e);
  return t ? t.toUpperCase() : null;
}
function Mr(e, t = "Unbekannter Fehler") {
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
function ot(e, t) {
  const n = Se(t instanceof Date ? t : /* @__PURE__ */ new Date()), r = ya[e], i = Cn(n), o = {};
  if (i != null && (o.end_date = i), Number.isFinite(r) && r > 0) {
    const a = new Date(n.getTime());
    a.setUTCDate(a.getUTCDate() - (r - 1));
    const s = Cn(a);
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
      return Number.isNaN(n.getTime()) ? null : Se(n);
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
          return Se(r);
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
function at(e) {
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
    let r = z(t.close);
    if (r == null) {
      const o = z(t.close_raw);
      o != null && (r = o / 1e8);
    }
    return r == null ? null : {
      date: nn(t.date) ?? t.date,
      close: r
    };
  }).filter((t) => !!t) : [];
}
function st(e, t) {
  if (!Array.isArray(e))
    return [];
  const n = [], r = (t || "").toUpperCase() || "EUR";
  return e.forEach((i, o) => {
    const a = typeof i.type == "number" ? i.type : Number(i.type), s = ba.has(a), c = va.has(a);
    if (!s && !c)
      return;
    const l = ka(i.date), u = z(i.price);
    if (!l || u == null)
      return;
    const g = typeof i.currency_code == "string" && i.currency_code.trim() ? i.currency_code.toUpperCase() : r, d = z(i.shares), f = z(i.net_price_eur), p = s ? "Kauf" : "Verkauf", h = d != null ? `${Vr(d)} @ ` : "", y = `${p} ${h}${fe(u)} ${g}`, m = c && f != null ? `${y} (netto ${fe(f)} EUR)` : y, _ = s ? Sa : Pa, b = typeof i.uuid == "string" && i.uuid.trim() || `${p}-${l.getTime()}-${o}`;
    n.push({
      id: b,
      x: l.getTime(),
      y: u,
      color: _,
      label: m,
      payload: {
        type: p,
        currency: g,
        shares: d,
        price: u,
        netPriceEur: f,
        date: l.toISOString(),
        portfolio: i.portfolio
      }
    });
  }), n;
}
function rn(e) {
  var r;
  const t = z(e == null ? void 0 : e.last_price_native) ?? z((r = e == null ? void 0 : e.last_price) == null ? void 0 : r.native) ?? null;
  if (R(t))
    return t;
  if (it(e == null ? void 0 : e.currency_code) === "EUR") {
    const i = z(e == null ? void 0 : e.last_price_eur);
    if (R(i))
      return i;
  }
  return null;
}
function Ra(e) {
  if (!e)
    return null;
  const n = e.last_price_fetched_at, r = at(n);
  if (r != null)
    return r;
  const i = e.last_price, o = i == null ? void 0 : i.fetched_at;
  return at(o) ?? null;
}
function It(e, t) {
  let n = [];
  Array.isArray(e) && (n = e.map((l) => ({
    ...l
  })));
  const r = n.slice(), i = rn(t);
  if (!R(i))
    return r;
  const o = Ra(t) ?? Date.now(), a = new Date(o);
  if (Number.isNaN(a.getTime()))
    return r;
  const s = Mt(Se(a));
  let c = null;
  for (let l = r.length - 1; l >= 0; l -= 1) {
    const u = r[l], g = nn(u.date);
    if (!g)
      continue;
    const d = Mt(Se(g));
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
function R(e) {
  return typeof e == "number" && Number.isFinite(e);
}
function Ft(e) {
  return typeof e == "number" && Number.isFinite(e) && e > 0;
}
function Te(e, t, n) {
  if (!R(e) || !R(t))
    return !1;
  const r = Math.abs(e - t), i = Math.max(Math.abs(e), Math.abs(t), 1);
  return r <= i * 1e-4;
}
function Ta(e, t) {
  return !R(t) || t === 0 || !R(e) ? null : Ui((e - t) / t * 100);
}
function Hr(e, t) {
  if (e.length === 0)
    return { priceChange: null, priceChangePct: null };
  const n = e[0], r = z(n.close);
  if (!R(r) || r === 0)
    return { priceChange: null, priceChangePct: null };
  const i = e[e.length - 1], o = z(i.close), a = z(t) ?? o;
  if (!R(a))
    return { priceChange: null, priceChangePct: null };
  const s = a - r, c = Object.is(s, -0) ? 0 : s, l = Ta(a, r);
  return { priceChange: c, priceChangePct: l };
}
function on(e, t) {
  if (!R(e) || e === 0)
    return "neutral";
  const n = 0.5 / Math.pow(10, t);
  return Math.abs(e) < n ? "neutral" : e > 0 ? "positive" : "negative";
}
function $a(e, t) {
  if (!R(e))
    return '<span class="value neutral">—</span>';
  const n = fe(e);
  if (n === "—")
    return '<span class="value neutral">—</span>';
  const r = on(e, rt.max), i = t ? `&nbsp;${t}` : "";
  return `<span class="value ${r}">${n}${i}</span>`;
}
function La(e) {
  return R(e) ? `<span class="value ${on(e, 2)} value--percentage">${ae(e)}&nbsp;%</span>` : '<span class="value neutral">—</span>';
}
function Ir(e, t, n, r) {
  const i = e, o = i.length > 0 ? i : "Zeitraum";
  return `
    <div class="security-info-bar" data-range="${i}">
      <div class="security-info-item">
        <span class="label">Preisänderung (${o})</span>
        <div class="value-row">
          ${$a(t, r)}
          ${La(n)}
        </div>
      </div>
    </div>
  `;
}
function Ma(e) {
  return `
    <div class="security-range-selector" role="group" aria-label="Zeitraum">
      ${xr.map((n) => `
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
function Ur(e, t = { status: "empty" }) {
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
      const r = Mr(
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
function Vr(e) {
  const t = z(e);
  if (t == null)
    return "—";
  const n = Math.abs(t % 1) > 0, r = n ? 2 : wt.min, i = n ? wt.max : wt.min;
  return t.toLocaleString("de-DE", {
    minimumFractionDigits: r,
    maximumFractionDigits: i
  });
}
function fe(e) {
  const t = z(e);
  return t == null ? "—" : t.toLocaleString("de-DE", {
    minimumFractionDigits: rt.min,
    maximumFractionDigits: rt.max
  });
}
function Ha(e, t) {
  const n = fe(e), r = `&nbsp;${t}`;
  return `<span class="${on(e, rt.max)}">${n}${r}</span>`;
}
function zr(e) {
  return e == null ? "" : (typeof e == "string" ? e : String(e)).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function Ia(e, t) {
  const n = e == null ? void 0 : e.ticker_symbol;
  if (typeof n == "string" && n.trim())
    return n.trim();
  const r = typeof (e == null ? void 0 : e.name) == "string" ? e.name.trim() : "";
  return r || (typeof t == "string" ? t : "");
}
function Ua(e) {
  return `
    <div class="news-prompt-container">
      <button
        type="button"
        class="news-prompt-button"
        data-symbol="${zr(e)}"
      >
        Check recent news via ChatGPT
      </button>
    </div>
  `;
}
async function Va(e) {
  var n;
  if (typeof navigator < "u" && ((n = navigator.clipboard) != null && n.writeText)) {
    await navigator.clipboard.writeText(e);
    return;
  }
  const t = document.createElement("textarea");
  t.value = e, t.setAttribute("readonly", ""), t.style.position = "absolute", t.style.left = "-9999px", document.body.appendChild(t), t.select();
  try {
    document.execCommand("copy");
  } finally {
    document.body.removeChild(t);
  }
}
function za(e, t, n) {
  const r = Oe(e == null ? void 0 : e.average_cost), i = (r == null ? void 0 : r.account) ?? (R(t) ? t : z(t));
  if (!R(i))
    return null;
  const o = (e == null ? void 0 : e.account_currency_code) ?? (e == null ? void 0 : e.account_currency);
  if (typeof o == "string" && o.trim())
    return o.trim().toUpperCase();
  const a = it(e == null ? void 0 : e.currency_code) ?? "", s = (r == null ? void 0 : r.security) ?? (r == null ? void 0 : r.native) ?? (R(n) ? n : z(n)), c = Zn(e == null ? void 0 : e.aggregation);
  if (a && R(s) && Te(i, s))
    return a;
  const l = z(c == null ? void 0 : c.purchase_total_security) ?? z(e == null ? void 0 : e.purchase_total_security), u = z(c == null ? void 0 : c.purchase_total_account) ?? z(e == null ? void 0 : e.purchase_total_account);
  let g = null;
  if (R(l) && l !== 0 && R(u) && (g = u / l), (r == null ? void 0 : r.source) === "eur_total")
    return "EUR";
  const f = r == null ? void 0 : r.eur;
  if (R(f) && Te(i, f))
    return "EUR";
  const p = z(e == null ? void 0 : e.purchase_value_eur);
  return R(p) ? "EUR" : g != null && Te(g, 1) ? a || null : a === "EUR" ? "EUR" : a || "EUR";
}
function xn(e) {
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
    const a = t == null ? void 0 : t[o], s = at(a);
    if (s != null)
      return s;
  }
  const r = [];
  t && "last_price_fetched_at" in t && r.push(t.last_price_fetched_at);
  const i = e == null ? void 0 : e.last_price;
  i && typeof i == "object" && r.push(i.fetched_at), t && "last_price_date" in t && r.push(t.last_price_date);
  for (const o of r) {
    const a = at(o);
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
  const n = it(e.currency_code) ?? "", r = Oe(e.average_cost);
  if (!r || !n)
    return null;
  const i = r.native ?? r.security ?? null;
  let a = r.account ?? r.eur ?? null, s = it(t) ?? "";
  if (Ft(r.eur) && (!s || s === n) && (a = r.eur, s = "EUR"), !n || !s || n === s || !Ft(i) || !Ft(a))
    return null;
  const c = a / i;
  if (!Number.isFinite(c) || c <= 0)
    return null;
  const l = xn(c);
  if (!l)
    return null;
  let u = null;
  if (c > 0) {
    const _ = 1 / c;
    Number.isFinite(_) && _ > 0 && (u = xn(_));
  }
  const g = qa(e), d = Oa(g), f = [`FX-Kurs (Kauf): 1 ${n} = ${l} ${s}`];
  u && f.push(`1 ${s} = ${u} ${n}`);
  const p = [], h = r.source, y = h in Et ? Et[h] : Et.aggregation;
  if (p.push(`Quelle: ${y}`), R(r.coverage_ratio)) {
    const _ = Math.min(Math.max(r.coverage_ratio * 100, 0), 100);
    p.push(
      `Abdeckung: ${_.toLocaleString("de-DE", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      })}%`
    );
  }
  p.length && f.push(...p);
  const m = d ?? "Datum unbekannt";
  return `${f.join(" · ")} (Stand: ${m})`;
}
function Dn(e) {
  if (!e)
    return null;
  const t = Oe(e.average_cost), n = (t == null ? void 0 : t.native) ?? (t == null ? void 0 : t.security) ?? null;
  return R(n) ? n : null;
}
function kn(e) {
  var K;
  if (!e)
    return '<div class="meta-error">Keine Snapshot-Daten verfügbar.</div>';
  const t = e.currency_code || "EUR", n = e.total_holdings_precise ?? e.total_holdings, r = Vr(n), i = e.last_price_native ?? ((K = e.last_price) == null ? void 0 : K.native) ?? e.last_price_eur, o = fe(i), a = o === "—" ? null : `${o}${`&nbsp;${t}`}`, s = z(e.market_value_eur) ?? z(e.current_value_eur) ?? null, c = Oe(e.average_cost), l = (c == null ? void 0 : c.native) ?? (c == null ? void 0 : c.security) ?? null, u = (c == null ? void 0 : c.eur) ?? null, d = (c == null ? void 0 : c.account) ?? null ?? u, f = ge(e.performance), p = (f == null ? void 0 : f.day_change) ?? null, h = (p == null ? void 0 : p.price_change_native) ?? null, y = (p == null ? void 0 : p.price_change_eur) ?? null, m = R(h) ? h : y, _ = R(h) ? t : "EUR", b = (V, j = "") => {
    const O = ["value"];
    return j && O.push(...j.split(" ").filter(Boolean)), `<span class="${O.join(" ")}">${V}</span>`;
  }, S = (V = "") => {
    const j = ["value--missing"];
    return V && j.push(V), b("—", j.join(" "));
  }, P = (V, j = "") => {
    if (!R(V))
      return S(j);
    const O = ["value--gain"];
    return j && O.push(j), b(vi(V), O.join(" "));
  }, N = (V, j = "") => {
    if (!R(V))
      return S(j);
    const O = ["value--gain-percentage"];
    return j && O.push(j), b(Si(V), O.join(" "));
  }, A = a ? b(a, "value--price") : S("value--price"), $ = r === "—" ? S("value--holdings") : b(r, "value--holdings"), D = R(s) ? b(`${ae(s)}&nbsp;€`, "value--market-value") : S("value--market-value"), C = R(m) ? b(
    Ha(m, _),
    "value--gain value--absolute"
  ) : S("value--absolute"), k = N(
    p == null ? void 0 : p.change_pct,
    "value--percentage"
  ), T = P(
    f == null ? void 0 : f.total_change_eur,
    "value--absolute"
  ), x = N(
    f == null ? void 0 : f.total_change_pct,
    "value--percentage"
  ), w = za(
    e,
    d,
    l
  ), E = Ba(
    e,
    w
  ), M = E ? ` title="${zr(E)}"` : "", v = [], F = R(u);
  R(l) ? v.push(
    b(
      `${fe(l)}${`&nbsp;${t}`}`,
      "value--average value--average-native"
    )
  ) : v.push(
    S("value--average value--average-native")
  );
  let q = null, W = null;
  return F && (t !== "EUR" || !R(l) || !Te(u, l)) ? (q = u, W = "EUR") : R(d) && w && (w !== t || !Te(d, l ?? NaN)) && (q = d, W = w), q != null && R(q) && v.push(
    b(
      `${fe(q)}${W ? `&nbsp;${W}` : ""}`,
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
        <div class="value-group"${M}>
          ${v.join("")}
        </div>
      </div>
      <div class="security-meta-item security-meta-item--day-change">
        <span class="label">Tagesänderung</span>
        <div class="value-group">
          ${C}
          ${k}
        </div>
      </div>
      <div class="security-meta-item security-meta-item--total-change">
        <span class="label">Gesamtänderung</span>
        <div class="value-group">
          ${T}
          ${x}
        </div>
      </div>
      <div class="security-meta-item security-meta-item--holdings">
        <span class="label">Bestand</span>
        <div class="value-group">${$}</div>
      </div>
      <div class="security-meta-item security-meta-item--market-value">
        <span class="label">Marktwert (EUR)</span>
        <div class="value-group">${D}</div>
      </div>
    </div>
  `;
}
function qr(e) {
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
  const o = e.clientWidth || e.offsetWidth || 0, a = o > 0 ? o : 640, s = Math.min(Math.max(Math.floor(a * 0.5), 240), 440), c = (n || "").toUpperCase() || "EUR", l = R(r) ? r : null, u = Math.max(48, Math.min(72, Math.round(a * 0.075))), g = Math.max(28, Math.min(56, Math.round(a * 0.05))), d = Math.max(40, Math.min(64, Math.round(s * 0.14)));
  return {
    width: a,
    height: s,
    margin: {
      top: 18,
      right: g,
      bottom: d,
      left: u
    },
    series: t,
    yFormatter: (f) => fe(f),
    tooltipRenderer: ({ xFormatted: f, yFormatted: p }) => `
      <div class="chart-tooltip-date">${f}</div>
      <div class="chart-tooltip-value">${p}&nbsp;${c}</div>
    `,
    baseline: l != null ? {
      value: l
    } : null,
    markers: Array.isArray(i) ? i : []
  };
}
const Rn = /* @__PURE__ */ new WeakMap();
function ja(e, t, n = {}) {
  if (t.length === 0)
    return;
  const r = Wa(e, t, n);
  let i = Rn.get(e) ?? null;
  if (!i || !e.contains(i)) {
    e.innerHTML = "", i = la(e, r), i && Rn.set(e, i);
    return;
  }
  Cr(i, r);
}
function Tn(e, t) {
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
  a.innerHTML = Ir(t, n, r, i).trim();
  const s = a.firstElementChild;
  s && o.parentElement.replaceChild(s, o);
}
function $n(e, t, n, r, i = {}) {
  const o = e.querySelector(".security-detail-placeholder");
  if (o && (o.innerHTML = `
    <h2>Historie</h2>
    ${Ur(t, n)}
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
    const u = kr(i), g = Rr(i), d = Dn(o);
    Array.isArray(s) && c.status !== "error" && u.set(a, s), Fa(i), Fn(i, a), Tn(l, a);
    const p = It(
      s,
      o
    );
    let h = c;
    h.status !== "error" && (h = p.length ? { status: "loaded" } : { status: "empty" }), $n(
      t,
      a,
      h,
      p,
      {
        currency: o == null ? void 0 : o.currency_code,
        baseline: d,
        markers: g.get(a) ?? []
      }
    );
    const y = async (m) => {
      if (m === Lr(i))
        return;
      const _ = l.querySelector(
        `.security-range-button[data-range="${m}"]`
      );
      _ && (_.disabled = !0, _.classList.add("loading"));
      let b = u.get(m) ?? null, S = g.get(m) ?? null, P = null, N = [];
      if (b)
        P = b.length ? { status: "loaded" } : { status: "empty" };
      else
        try {
          const T = ot(m), x = await Ze(
            n,
            r,
            i,
            T
          );
          b = Ht(x.prices), S = st(
            x.transactions,
            o == null ? void 0 : o.currency_code
          ), u.set(m, b), g.set(m, S || []), P = b.length ? { status: "loaded" } : { status: "empty" };
        } catch (T) {
          console.error("Range-Wechsel: Historie konnte nicht geladen werden", T), b = [], S = [], P = {
            status: "error",
            message: qr(T) || "Die historischen Daten konnten aufgrund eines Fehlers nicht geladen werden."
          };
        }
      if (!Array.isArray(S))
        try {
          const T = ot(m), x = await Ze(
            n,
            r,
            i,
            T
          );
          S = st(
            x.transactions,
            o == null ? void 0 : o.currency_code
          ), g.set(m, S || []);
        } catch (T) {
          console.error("Range-Wechsel: Transaktionsmarker konnten nicht geladen werden", T), S = [];
        }
      N = It(b, o), P.status !== "error" && (P = N.length ? { status: "loaded" } : { status: "empty" });
      const A = rn(o), { priceChange: $, priceChangePct: D } = Hr(
        N,
        A
      ), C = Array.isArray(S) ? S : [];
      Fn(i, m), Tn(l, m), Ka(
        t,
        m,
        $,
        D,
        o == null ? void 0 : o.currency_code
      );
      const k = Dn(o);
      $n(
        t,
        m,
        P,
        N,
        {
          currency: o == null ? void 0 : o.currency_code,
          baseline: k,
          markers: C
        }
      );
    };
    l.addEventListener("click", (m) => {
      var S;
      const _ = (S = m.target) == null ? void 0 : S.closest(".security-range-button");
      if (!_ || _.disabled)
        return;
      const { range: b } = _.dataset;
      !b || !xr.includes(b) || y(b);
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
          const c = await Ri(n, r), l = (c.placeholder || "").trim() || "{TICKER}", u = (c.prompt_template || "").trim(), g = u ? l && u.includes(l) ? u.split(l).join(s) : `${u}

Ticker: ${s}` : `Ticker: ${s}`;
          if (await Va(g), c.link)
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
    const C = await ki(
      t,
      n,
      r
    ), k = C.snapshot;
    o = k && typeof k == "object" ? k : C;
  } catch (C) {
    console.error("renderSecurityDetail: Snapshot konnte nicht geladen werden", C), a = Mr(C);
  }
  const s = o || i, c = !!(i && !o), l = ((s == null ? void 0 : s.source) ?? "") === "cache";
  r && Na(r, s ?? null);
  const u = s && (c || l) ? Aa({ fallbackUsed: c, flaggedAsCache: l }) : "", g = (s == null ? void 0 : s.name) || "Wertpapierdetails";
  if (a) {
    const C = xt(
      g,
      kn(s)
    );
    return C.classList.add("security-detail-header"), `
      ${C.outerHTML}
      ${u}
      <div class="card error-card">
        <h2>Fehler beim Laden</h2>
        <p>${a}</p>
      </div>
    `;
  }
  const d = Lr(r), f = kr(r), p = Rr(r);
  let h = f.has(d) ? f.get(d) ?? null : null, y = { status: "empty" }, m = p.has(d) ? p.get(d) ?? null : null;
  if (Array.isArray(h))
    y = h.length ? { status: "loaded" } : { status: "empty" };
  else {
    h = [];
    try {
      const C = ot(d), k = await Ze(
        t,
        n,
        r,
        C
      );
      h = Ht(k.prices), m = st(
        k.transactions,
        s == null ? void 0 : s.currency_code
      ), f.set(d, h), p.set(d, m || []), y = h.length ? { status: "loaded" } : { status: "empty" };
    } catch (C) {
      console.error(
        "renderSecurityDetail: Historie konnte nicht geladen werden",
        C
      ), y = {
        status: "error",
        message: qr(C) || "Die historischen Daten konnten aufgrund eines Fehlers nicht geladen werden."
      };
    }
  }
  if (!Array.isArray(m))
    try {
      const C = ot(d), k = await Ze(
        t,
        n,
        r,
        C
      ), T = Ht(k.prices);
      m = st(
        k.transactions,
        s == null ? void 0 : s.currency_code
      ), f.set(d, T), p.set(d, m || []), h = T, y = h.length ? { status: "loaded" } : { status: "empty" };
    } catch (C) {
      console.error(
        "renderSecurityDetail: Transaktionsmarker konnten nicht geladen werden",
        C
      ), m = [];
    }
  const _ = It(
    h,
    s
  );
  y.status !== "error" && (y = _.length ? { status: "loaded" } : { status: "empty" });
  const b = xt(
    g,
    kn(s)
  );
  b.classList.add("security-detail-header");
  const S = Ia(s, r), P = Ua(S), N = rn(s), { priceChange: A, priceChangePct: $ } = Hr(
    _,
    N
  ), D = Ir(
    d,
    A,
    $,
    s == null ? void 0 : s.currency_code
  );
  return Ga({
    root: e,
    hass: t,
    panelConfig: n,
    securityUuid: r,
    snapshot: s,
    initialRange: d,
    initialHistory: h,
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
    ${D}
    ${Ma(d)}
    <div class="card security-detail-placeholder">
      <h2>Historie</h2>
      ${Ur(d, y)}
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
const Ja = bi, Ut = "pp-reader-sticky-anchor", ct = "overview", Vt = "security:", Qa = [
  { key: ct, title: "Dashboard", render: hr }
], Pe = /* @__PURE__ */ new Map(), Ve = [], lt = /* @__PURE__ */ new Map();
let zt = null, Ct = !1, be = null, U = 0, Fe = null;
function ut(e) {
  return typeof e == "object" && e !== null;
}
function Or(e) {
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
function Ln(e) {
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
      if (ut(t)) {
        const n = Ln(t);
        if (n)
          return n;
      }
    return null;
  }
  return ut(e) ? Ln(e) : null;
}
function rs(e, t) {
  switch (e) {
    case "accounts":
      return {
        type: e,
        data: Array.isArray(t) ? t : null
      };
    case "last_file_update":
      return typeof t == "string" ? { type: e, data: t } : ut(t) ? { type: e, data: t } : { type: e, data: null };
    case "portfolio_values":
      return Array.isArray(t) ? { type: e, data: t } : { type: e, data: null };
    case "portfolio_positions":
      return Array.isArray(t) ? { type: e, data: t } : ut(t) ? { type: e, data: t } : { type: e, data: null };
    default:
      return null;
  }
}
function an(e) {
  return typeof e != "string" || !e.startsWith(Vt) ? null : e.slice(Vt.length) || null;
}
function is() {
  if (!be)
    return !1;
  const e = Gr(be);
  return e || (be = null), e;
}
function re() {
  const e = Ve.map((t) => Pe.get(t)).filter((t) => !!t);
  return [...Qa, ...e];
}
function os(e) {
  const t = re();
  return e < 0 || e >= t.length ? null : t[e];
}
function Br(e) {
  if (!e)
    return null;
  const t = e, n = t.ppreader ?? t.pp_reader;
  return n || (Object.values(t).find((i) => !i || typeof i != "object" ? !1 : i.webcomponent_name === "pp-reader-panel") ?? null);
}
function Wr() {
  try {
    const e = pt();
    e && typeof e.rememberScrollPosition == "function" && e.rememberScrollPosition();
  } catch (e) {
    console.warn("rememberCurrentPageScroll: konnte Scroll-Position nicht sichern", e);
  }
}
function Mn(e) {
  const t = re();
  return !t.length || e < 0 ? 0 : e >= t.length ? t.length - 1 : e;
}
async function as(e, t, n, r) {
  const i = re(), o = Mn(e);
  if (o === U) {
    e > U && is();
    return;
  }
  Wr();
  const a = U >= 0 && U < i.length ? i[U] : null, s = a ? an(a.key) : null;
  let c = o;
  if (s) {
    const l = o >= 0 && o < i.length ? i[o] : null;
    if (l && l.key === ct && ds(s, { suppressRender: !0 })) {
      const d = re().findIndex((f) => f.key === ct);
      c = d >= 0 ? d : 0;
    }
  }
  if (!Ct) {
    Ct = !0;
    try {
      U = Mn(c);
      const l = U;
      await Yr(t, n, r), us(l);
    } catch (l) {
      console.error("navigateToPage: Fehler beim Rendern des Tabs", l);
    } finally {
      Ct = !1;
    }
  }
}
function dt(e, t, n, r) {
  as(U + e, t, n, r);
}
function ss(e, t) {
  if (!e || !t || typeof t.render != "function") {
    console.error("registerDetailTab: Ungültiger Tab-Descriptor", e, t);
    return;
  }
  const n = an(e);
  if (n) {
    const i = lt.get(n);
    i && i !== e && jr(i);
  }
  const r = {
    ...t,
    key: e
  };
  Pe.set(e, r), n && lt.set(n, e), Ve.includes(e) || Ve.push(e);
}
function jr(e) {
  if (!e)
    return;
  const t = Pe.get(e);
  if (t && typeof t.cleanup == "function")
    try {
      const i = t.cleanup({ key: e });
      Or(i) && i.catch((o) => {
        console.error(
          "unregisterDetailTab: Fehler beim asynchronen cleanup",
          o
        );
      });
    } catch (i) {
      console.error("unregisterDetailTab: Fehler beim Ausführen von cleanup", i);
    }
  Pe.delete(e);
  const n = Ve.indexOf(e);
  n >= 0 && Ve.splice(n, 1);
  const r = an(e);
  r && lt.get(r) === e && lt.delete(r);
}
function cs(e) {
  return Pe.has(e);
}
function Hn(e) {
  return Pe.get(e) ?? null;
}
function ls(e) {
  if (e != null && typeof e != "function") {
    console.error("setSecurityDetailTabFactory: Erwartet Funktion oder null", e);
    return;
  }
  zt = e ?? null;
}
function Kr(e) {
  return `${Vt}${e}`;
}
function pt() {
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
function qt() {
  const e = pt();
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
  findDashboardElement: pt
};
function us(e) {
  const t = pt();
  if (t && typeof t.handleExternalRender == "function")
    try {
      t.handleExternalRender(e);
    } catch (n) {
      console.warn("notifyExternalRender: Fehler beim Synchronisieren des Dashboards", n);
    }
}
function Gr(e) {
  if (!e)
    return console.error("openSecurityDetail: Ungültige securityUuid", e), !1;
  const t = Kr(e);
  let n = Hn(t);
  if (!n && typeof zt == "function")
    try {
      const o = zt(e);
      o && typeof o.render == "function" ? (ss(t, o), n = Hn(t)) : console.error("openSecurityDetail: Factory lieferte ungültigen Descriptor", o);
    } catch (o) {
      console.error("openSecurityDetail: Fehler beim Erzeugen des Tab-Descriptors", o);
    }
  if (!n)
    return console.warn(`openSecurityDetail: Kein Detail-Tab für ${e} verfügbar`), !1;
  Wr();
  let i = re().findIndex((o) => o.key === t);
  return i === -1 && (i = re().findIndex((a) => a.key === t), i === -1) ? (console.error("openSecurityDetail: Tab nach Registrierung nicht auffindbar"), !1) : (U = i, be = null, qt(), !0);
}
function ds(e, t = {}) {
  if (!e)
    return console.error("closeSecurityDetail: Ungültige securityUuid", e), !1;
  const { suppressRender: n = !1 } = t, r = Kr(e);
  if (!cs(r))
    return !1;
  const o = re().findIndex((c) => c.key === r), a = o === U;
  jr(r);
  const s = re();
  if (!s.length)
    return U = 0, n || qt(), !0;
  if (be = e, a) {
    const c = s.findIndex((l) => l.key === ct);
    c >= 0 ? U = c : U = Math.min(Math.max(o - 1, 0), s.length - 1);
  } else U >= s.length && (U = Math.max(0, s.length - 1));
  return n || qt(), !0;
}
async function Yr(e, t, n) {
  let r = n;
  r || (r = Br(t ? t.panels : null));
  const i = re();
  U >= i.length && (U = Math.max(0, i.length - 1));
  const o = os(U);
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
  e.innerHTML = a ?? "", o.render === hr && tn(e);
  const c = await new Promise((u) => {
    const g = window.setInterval(() => {
      const d = e.querySelector(".header-card");
      d && (clearInterval(g), u(d));
    }, 50);
  });
  let l = e.querySelector(`#${Ut}`);
  if (!l) {
    l = document.createElement("div"), l.id = Ut;
    const u = c.parentNode;
    u && "insertBefore" in u && u.insertBefore(l, c);
  }
  ps(e, t, n), gs(e, t, n), fs(e);
}
function fs(e) {
  const t = e.querySelector(".header-card"), n = e.querySelector(`#${Ut}`);
  if (!t || !n) {
    console.error("Fehlende Elemente für das Scrollverhalten: headerCard oder anchor.");
    return;
  }
  Fe == null || Fe.disconnect(), Fe = new IntersectionObserver(
    ([r]) => {
      r.isIntersecting ? t.classList.remove("sticky") : t.classList.add("sticky");
    },
    {
      root: null,
      rootMargin: "0px 0px 0px 0px",
      threshold: 0
    }
  ), Fe.observe(n);
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
      dt(1, e, t, n);
    },
    () => {
      dt(-1, e, t, n);
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
    dt(-1, e, t, n);
  }), o.addEventListener("click", () => {
    dt(1, e, t, n);
  }), ms(r);
}
function ms(e) {
  const t = e.querySelector("#nav-left"), n = e.querySelector("#nav-right");
  if (t && (U === 0 ? (t.disabled = !0, t.classList.add("disabled")) : (t.disabled = !1, t.classList.remove("disabled"))), n) {
    const r = re(), o = !(U === r.length - 1) || !!be;
    n.disabled = !o, n.classList.toggle("disabled", !o);
  }
}
class hs extends HTMLElement {
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
    this._panel || (this._panel = Br(this._hass.panels ?? null));
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
        To(
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
  rememberScrollPosition(n = U) {
    const r = Number.isInteger(n) ? n : U;
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
    const n = U;
    if (!this._hasNewData && this._panel === this._lastPanel && this._narrow === this._lastNarrow && this._route === this._lastRoute && this._lastPage === n)
      return;
    this._lastPage != null && (this._scrollPositions[this._lastPage] = this._root.scrollTop);
    const r = Yr(this._root, this._hass, this._panel);
    if (Or(r)) {
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
customElements.get("pp-reader-dashboard") || customElements.define("pp-reader-dashboard", hs);
console.log("PPReader dashboard module v20250914b geladen");
Za({
  setSecurityDetailTabFactory: ls
});
export {
  Ns as __TEST_ONLY_DASHBOARD,
  As as __TEST_ONLY__,
  ds as closeSecurityDetail,
  en as flushPendingPositions,
  Hn as getDetailTabDescriptor,
  To as handlePortfolioPositionsUpdate,
  cs as hasDetailTab,
  Gr as openSecurityDetail,
  Ps as reapplyPositionsSort,
  ys as registerDashboardElement,
  ss as registerDetailTab,
  vs as registerPanelHost,
  ls as setSecurityDetailTabFactory,
  bs as unregisterDashboardElement,
  jr as unregisterDetailTab,
  Ss as unregisterPanelHost,
  mr as updatePortfolioFooterFromDom
};
//# sourceMappingURL=dashboard.D3hotdyQ.js.map
