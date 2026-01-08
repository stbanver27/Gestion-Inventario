// app/static/app.js
// Requisitos:
// - Si usas dashboard con Chart.js, en index.html debe existir: <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
// - Este JS asume que existen los IDs del HTML que hemos creado (dashboard, empresas, productos, ventas, compras múltiples, reportes).

// =======================
// ===== Helpers =========
// =======================
const $ = (id) => document.getElementById(id);

function base() {
  const v = $("baseUrl")?.value?.trim() ?? "";
  return v ? v.replace(/\/$/, "") : ""; // vacío = mismo origen
}

function showMsg(el, text, ok = true) {
  if (!el) return;
  el.classList.remove("hidden");
  el.classList.toggle("ok", ok);
  el.classList.toggle("err", !ok);
  el.textContent = text;
}

function clearMsg(el) {
  if (!el) return;
  el.classList.add("hidden");
  el.textContent = "";
  el.classList.remove("ok", "err");
}

async function api(path, options = {}) {
  const url = base() + path;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  let data = null;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) data = await res.json();
  else data = await res.text();

  if (!res.ok) {
    const msg =
      (data && data.detail) ? data.detail :
      (typeof data === "string" ? data : "Error");
    throw new Error(msg);
  }
  return data;
}

function toMoney(n) {
  const x = Number(n || 0);
  return x.toLocaleString("es-CL", { style: "currency", currency: "CLP" });
}

// =======================
// ===== Tabs ============
// =======================
document.querySelectorAll(".tabbtn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    document.querySelectorAll(".tabbtn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    const tab = btn.dataset.tab;
    document.querySelectorAll(".tab").forEach((s) => s.classList.add("hidden"));
    const section = $("tab-" + tab);
    if (section) section.classList.remove("hidden");

    if (tab === "dashboard") await loadDashboard();
    if (tab === "empresas") await loadEmpresas();
    if (tab === "productos") await loadProductos();

    // IMPORTANTÍSIMO: al entrar a Ventas, cargamos selects de ventas + compras múltiples
    if (tab === "ventas") {
      await loadVentasInit();
      await initComprasMultiples();
    }

    if (tab === "reportes") {
      // presetReportDates();
    }
  });
});

// ✅ CAMBIO PEDIDO: al cambiar Día/Semana/Mes recalcula el dashboard
$("ventasPeriodo")?.addEventListener("change", async () => {
  await loadDashboard();
});

// =======================
// ===== Ping ============
// =======================
$("btnPing")?.addEventListener("click", async () => {
  const g = $("globalMsg");
  clearMsg(g);
  try {
    await api("/empresas/");
    showMsg(g, "OK: Conexión a API funcionando.", true);
  } catch (e) {
    showMsg(g, `Error: ${e.message}`, false);
  }
});

// =======================
// ===== EMPRESAS ========
// =======================
$("btnEmpLimpiar")?.addEventListener("click", () => {
  ["emp_id", "emp_nombre", "emp_rut", "emp_giro", "emp_telefono", "emp_email", "emp_direccion"]
    .forEach((id) => { if ($(id)) $(id).value = ""; });
  clearMsg($("empMsg"));
});

$("btnEmpRefrescar")?.addEventListener("click", loadEmpresas);

$("btnEmpGuardar")?.addEventListener("click", async () => {
  const msg = $("empMsg");
  clearMsg(msg);

  const id = $("emp_id")?.value?.trim() ?? "";
  const payload = {
    id: id ? Number(id) : 0,
    nombre: $("emp_nombre")?.value?.trim() ?? "",
    rut: $("emp_rut")?.value?.trim() ?? "",
    giro: ($("emp_giro")?.value?.trim() || null),
    telefono: ($("emp_telefono")?.value?.trim() || null),
    email: ($("emp_email")?.value?.trim() || null),
    direccion: ($("emp_direccion")?.value?.trim() || null),
  };

  if (!payload.nombre || !payload.rut) {
    showMsg(msg, "Nombre y RUT son obligatorios.", false);
    return;
  }

  try {
    if (!id) {
      const created = await api("/empresas/", { method: "POST", body: JSON.stringify(payload) });
      showMsg(msg, `Empresa creada (ID ${created.id}).`, true);
    } else {
      const updated = await api(`/empresas/${Number(id)}`, { method: "PUT", body: JSON.stringify(payload) });
      showMsg(msg, `Empresa actualizada (ID ${updated.id}).`, true);
    }
    await loadEmpresas();
    await loadVentasInit();
    await initComprasMultiples();
    await loadDashboard();
  } catch (e) {
    showMsg(msg, `Error: ${e.message}`, false);
  }
});

async function loadEmpresas() {
  const tbody = $("empTable");
  if (!tbody) return;
  tbody.innerHTML = "";
  clearMsg($("empMsg"));

  try {
    const empresas = await api("/empresas/");
    if (!empresas.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="muted">Sin empresas aún.</td></tr>`;
      return;
    }

    for (const e of empresas) {
      const contacto = [e.email, e.telefono].filter(Boolean).join(" • ") || "-";
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${e.id}</td>
        <td>${e.nombre}</td>
        <td>${e.rut}</td>
        <td>${contacto}</td>
        <td>
          <div class="actions">
            <button class="btn btn--ghost" data-act="edit" data-id="${e.id}">Editar</button>
            <button class="btn btn--danger" data-act="del" data-id="${e.id}">Eliminar</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    }

    tbody.querySelectorAll("button").forEach((b) => {
      b.addEventListener("click", async () => {
        const act = b.dataset.act;
        const id = Number(b.dataset.id);

        if (act === "edit") {
          const e = await api(`/empresas/${id}`);
          $("emp_id").value = e.id;
          $("emp_nombre").value = e.nombre || "";
          $("emp_rut").value = e.rut || "";
          $("emp_giro").value = e.giro || "";
          $("emp_telefono").value = e.telefono || "";
          $("emp_email").value = e.email || "";
          $("emp_direccion").value = e.direccion || "";
          showMsg($("empMsg"), "Empresa cargada para edición.", true);
        }

        if (act === "del") {
          if (!confirm(`¿Eliminar empresa ID ${id}?`)) return;
          try {
            await api(`/empresas/${id}`, { method: "DELETE" });
            showMsg($("empMsg"), `Empresa ID ${id} eliminada.`, true);
            await loadEmpresas();
            await loadVentasInit();
            await initComprasMultiples();
            await loadDashboard();
          } catch (e) {
            showMsg($("empMsg"), `Error: ${e.message}`, false);
          }
        }
      });
    });

  } catch (e) {
    showMsg($("empMsg"), `Error cargando empresas: ${e.message}`, false);
  }
}

// =======================
// ===== PRODUCTOS =======
// =======================
$("btnProdLimpiar")?.addEventListener("click", () => {
  ["prod_id", "prod_nombre", "prod_categoria", "prod_precio", "prod_costo", "prod_stock"]
    .forEach((id) => { if ($(id)) $(id).value = ""; });
  clearMsg($("prodMsg"));
});

$("btnProdRefrescar")?.addEventListener("click", loadProductos);

$("btnProdGuardar")?.addEventListener("click", async () => {
  const msg = $("prodMsg");
  clearMsg(msg);

  const id = $("prod_id")?.value?.trim() ?? "";
  const payload = {
    id: id ? Number(id) : 0,
    nombre: $("prod_nombre")?.value?.trim() ?? "",
    categoria: $("prod_categoria")?.value?.trim() ?? "",
    precio: Number($("prod_precio")?.value || 0),
    costo: Number($("prod_costo")?.value || 0),
    stock: Number($("prod_stock")?.value || 0),
  };

  if (!payload.nombre || !payload.categoria) {
    showMsg(msg, "Nombre y categoría son obligatorios.", false);
    return;
  }

  try {
    if (!id) {
      const created = await api("/productos/", { method: "POST", body: JSON.stringify(payload) });
      showMsg(msg, `Producto creado (ID ${created.id}).`, true);
    } else {
      const updated = await api(`/productos/${Number(id)}`, { method: "PUT", body: JSON.stringify(payload) });
      showMsg(msg, `Producto actualizado (ID ${updated.id}).`, true);
    }
    await loadProductos();
    await loadVentasInit();
    await initComprasMultiples();
    await loadDashboard();
  } catch (e) {
    showMsg(msg, `Error: ${e.message}`, false);
  }
});

async function loadProductos() {
  const tbody = $("prodTable");
  if (!tbody) return;

  tbody.innerHTML = "";
  clearMsg($("prodMsg"));

  try {
    const productos = await api("/productos/");
    if (!productos.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="muted">Sin productos aún.</td></tr>`;
      return;
    }

    for (const p of productos) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${p.id}</td>
        <td>${p.nombre}</td>
        <td>${p.categoria}</td>
        <td>${toMoney(p.precio)}</td>
        <td>${p.stock}</td>
        <td>
          <div class="actions">
            <button class="btn btn--ghost" data-act="edit" data-id="${p.id}">Editar</button>
            <button class="btn btn--danger" data-act="del" data-id="${p.id}">Eliminar</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    }

    tbody.querySelectorAll("button").forEach((b) => {
      b.addEventListener("click", async () => {
        const act = b.dataset.act;
        const id = Number(b.dataset.id);

        if (act === "edit") {
          const p = await api(`/productos/${id}`);
          $("prod_id").value = p.id;
          $("prod_nombre").value = p.nombre || "";
          $("prod_categoria").value = p.categoria || "";
          $("prod_precio").value = p.precio ?? 0;
          $("prod_costo").value = p.costo ?? 0;
          $("prod_stock").value = p.stock ?? 0;
          showMsg($("prodMsg"), "Producto cargado para edición.", true);
        }

        if (act === "del") {
          if (!confirm(`¿Eliminar producto ID ${id}?`)) return;
          try {
            await api(`/productos/${id}`, { method: "DELETE" });
            showMsg($("prodMsg"), `Producto ID ${id} eliminado.`, true);
            await loadProductos();
            await loadVentasInit();
            await initComprasMultiples();
            await loadDashboard();
          } catch (e) {
            showMsg($("prodMsg"), `Error: ${e.message}`, false);
          }
        }
      });
    });

  } catch (e) {
    showMsg($("prodMsg"), `Error cargando productos: ${e.message}`, false);
  }
}

// =======================
// ===== VENTAS (simple) =
// =======================
$("btnVentaRefrescar")?.addEventListener("click", async () => {
  await loadVentasInit();
  await initComprasMultiples();
});

$("btnVentasBuscar")?.addEventListener("click", loadVentasList);

$("btnVentaCrear")?.addEventListener("click", async () => {
  const msg = $("ventaMsg");
  clearMsg(msg);

  const empresa_id = Number($("venta_empresa")?.value || 0);
  const producto_id = Number($("venta_producto")?.value || 0);
  const cantidad = Number($("venta_cantidad")?.value || 0);

  if (!empresa_id || !producto_id || !cantidad) {
    showMsg(msg, "Selecciona empresa, producto y cantidad.", false);
    return;
  }

  const payload = {
    id: 0,
    compra_id: null,
    producto_id,
    empresa_id,
    cantidad,
    total: 0,
    fecha: new Date().toISOString(),
  };

  try {
    const created = await api("/ventas/", { method: "POST", body: JSON.stringify(payload) });
    showMsg(msg, `Venta registrada (ID ${created.id}) por ${toMoney(created.total)}.`, true);
    await loadProductos();
    await loadVentasList();
    await initComprasMultiples();
    await loadDashboard();
  } catch (e) {
    showMsg(msg, `Error: ${e.message}`, false);
  }
});

async function loadVentasInit() {
  if (!$("venta_empresa") || !$("venta_producto")) return;

  const msg = $("ventaMsg");
  if (msg) clearMsg(msg);

  try {
    const [empresas, productos] = await Promise.all([api("/empresas/"), api("/productos/")]);

    const se = $("venta_empresa");
    const sp = $("venta_producto");
    se.innerHTML = empresas.length ? "" : `<option value="">(sin empresas)</option>`;
    sp.innerHTML = productos.length ? "" : `<option value="">(sin productos)</option>`;

    for (const e of empresas) {
      const opt = document.createElement("option");
      opt.value = e.id;
      opt.textContent = `${e.id} — ${e.nombre}`;
      se.appendChild(opt);
    }
    for (const p of productos) {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = `${p.id} — ${p.nombre} (stock ${p.stock})`;
      sp.appendChild(opt);
    }

    const fe = $("f_empresa");
    const fp = $("f_producto");
    if (fe) fe.innerHTML = `<option value="">(todas)</option>`;
    if (fp) fp.innerHTML = `<option value="">(todos)</option>`;

    if (fe) {
      for (const e of empresas) {
        const opt = document.createElement("option");
        opt.value = e.id;
        opt.textContent = `${e.id} — ${e.nombre}`;
        fe.appendChild(opt);
      }
    }

    if (fp) {
      for (const p of productos) {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = `${p.id} — ${p.nombre}`;
        fp.appendChild(opt);
      }
    }

    await loadVentasList();
  } catch (e) {
    showMsg(msg, `Error preparando ventas: ${e.message}`, false);
  }
}

async function loadVentasList() {
  const tbody = $("ventasTable");
  if (!tbody) return;
  tbody.innerHTML = "";

  let empresas = [], productos = [];
  try {
    [empresas, productos] = await Promise.all([api("/empresas/"), api("/productos/")]);
  } catch {}

  const empById = Object.fromEntries(empresas.map((e) => [e.id, e.nombre]));
  const prodById = Object.fromEntries(productos.map((p) => [p.id, p.nombre]));

  const params = new URLSearchParams();
  const empresa_id = $("f_empresa")?.value?.trim() ?? "";
  const producto_id = $("f_producto")?.value?.trim() ?? "";
  const desde = $("f_desde")?.value?.trim() ?? "";
  const hasta = $("f_hasta")?.value?.trim() ?? "";

  if (empresa_id) params.set("empresa_id", empresa_id);
  if (producto_id) params.set("producto_id", producto_id);
  if (desde) params.set("desde", desde);
  if (hasta) params.set("hasta", hasta);

  try {
    const ventas = await api("/ventas/?" + params.toString());

    if (!ventas.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="muted">Sin ventas para el filtro actual.</td></tr>`;
      return;
    }

    for (const v of ventas) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${v.id}</td>
        <td>${empById[v.empresa_id] ?? ("ID " + v.empresa_id)}</td>
        <td>${prodById[v.producto_id] ?? ("ID " + v.producto_id)}</td>
        <td>${v.cantidad}</td>
        <td>${toMoney(v.total)}</td>
        <td>${String(v.fecha).replace("T", " ").slice(0, 19)}</td>
      `;
      tbody.appendChild(tr);
    }
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" class="muted">Error cargando ventas: ${e.message}</td></tr>`;
  }
}

// =======================
// ===== REPORTES =========
// =======================
$("btnReporte")?.addEventListener("click", async () => {
  const out = $("repOut");
  clearMsg(out);

  const desdeLocal = $("r_desde")?.value?.trim() ?? "";
  const hastaLocal = $("r_hasta")?.value?.trim() ?? "";

  if (!desdeLocal || !hastaLocal) {
    showMsg(out, "Selecciona fecha/hora 'desde' y 'hasta'.", false);
    return;
  }

  const desdeISO = new Date(desdeLocal).toISOString();
  const hastaISO = new Date(hastaLocal).toISOString();

  try {
    const r = await api(
      `/reportes/flujo_caja?desde=${encodeURIComponent(desdeISO)}&hasta=${encodeURIComponent(hastaISO)}`
    );

    showMsg(
      out,
      `Rango (UTC): ${r.fecha_inicio} → ${r.fecha_fin}\n` +
      `Ventas totales: ${toMoney(r.ventas_totales)}\n` +
      `Ganancias totales: ${toMoney(r.ganancias_totales)}\n` +
      `Productos vendidos: ${r.productos_vendidos}`,
      true
    );
  } catch (e) {
    showMsg(out, `Error: ${e.message}`, false);
  }
});

// =======================
// ===== DASHBOARD ========
// =======================
let chartVentasDia = null;
let chartTopProductos = null;

const LOW_STOCK_THRESHOLD = 3;

$("btnDashRefresh")?.addEventListener("click", loadDashboard);

// ===== Helpers fechas para selector Día/Semana/Mes
function pad2(n) { return String(n).padStart(2, "0"); }

function isoDateOnly(d) {
  const year = d.getFullYear();
  const month = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${year}-${month}-${day}`;
}

function lastNDaysLabels(n) {
  const labels = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    labels.push(isoDateOnly(d));
  }
  return labels;
}

function getISOWeekKey(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${pad2(weekNo)}`;
}

function monthKey(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

function lastNWeeksLabels(n) {
  const out = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - (i * 7));
    out.push(getISOWeekKey(d));
  }
  return [...new Set(out)];
}

function lastNMonthsLabels(n) {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(monthKey(d));
  }
  return out;
}

function renderVentasChartByPeriodo(ventas, periodo) {
  const title = $("ventasChartTitle");

  if (periodo === "semana") {
    if (title) title.textContent = "Ventas por semana (últimas 8 semanas)";
    const labels = lastNWeeksLabels(8);
    const map = Object.fromEntries(labels.map((l) => [l, 0]));
    for (const v of ventas) {
      const d = new Date(v.fecha);
      const key = getISOWeekKey(d);
      if (map[key] !== undefined) map[key] += Number(v.total || 0);
    }
    renderChartVentasDia(labels, labels.map((l) => map[l]));
    return;
  }

  if (periodo === "mes") {
    if (title) title.textContent = "Ventas por mes (últimos 12 meses)";
    const labels = lastNMonthsLabels(12);
    const map = Object.fromEntries(labels.map((l) => [l, 0]));
    for (const v of ventas) {
      const d = new Date(v.fecha);
      const key = monthKey(d);
      if (map[key] !== undefined) map[key] += Number(v.total || 0);
    }
    renderChartVentasDia(labels, labels.map((l) => map[l]));
    return;
  }

  if (title) title.textContent = "Ventas por día (últimos 14 días)";
  const labels = lastNDaysLabels(14);
  const map = Object.fromEntries(labels.map((l) => [l, 0]));
  for (const v of ventas) {
    const day = String(v.fecha).slice(0, 10);
    if (map[day] !== undefined) map[day] += Number(v.total || 0);
  }
  renderChartVentasDia(labels, labels.map((l) => map[l]));
}

async function loadDashboard() {
  if (!$("kpi_empresas") || !$("chartVentasDia")) return;

  const msg = $("dashMsg");
  if (msg) clearMsg(msg);

  try {
    const [empresas, productos, ventas] = await Promise.all([
      api("/empresas/"),
      api("/productos/"),
      api("/ventas/"),
    ]);

    $("kpi_empresas").textContent = empresas.length;
    $("kpi_productos").textContent = productos.length;

    const stockTotal = productos.reduce((acc, p) => acc + Number(p.stock || 0), 0);
    $("kpi_stock_total").textContent = stockTotal.toLocaleString("es-CL");

    const ventasTotal = ventas.reduce((acc, v) => acc + Number(v.total || 0), 0);
    $("kpi_ventas_total").textContent = toMoney(ventasTotal);

    const prodById = Object.fromEntries(productos.map((p) => [p.id, p.nombre]));

    const periodo = $("ventasPeriodo")?.value || "dia";
    renderVentasChartByPeriodo(ventas, periodo);

    const ingresosPorProducto = {};
    for (const v of ventas) {
      const pid = v.producto_id;
      ingresosPorProducto[pid] = (ingresosPorProducto[pid] || 0) + Number(v.total || 0);
    }
    const topProd = Object.entries(ingresosPorProducto)
      .map(([pid, total]) => ({ pid: Number(pid), total: Number(total) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    renderChartTopProductos(
      topProd.map((x) => prodById[x.pid] ?? `Producto ${x.pid}`),
      topProd.map((x) => x.total)
    );

    $("lowStockThresholdLabel").textContent = LOW_STOCK_THRESHOLD;
    const low = productos
      .filter((p) => Number(p.stock || 0) <= LOW_STOCK_THRESHOLD)
      .sort((a, b) => Number(a.stock || 0) - Number(b.stock || 0));

    const lowBody = $("lowStockTable");
    if (lowBody) {
      lowBody.innerHTML = low.length
        ? low.map((p) => `
          <tr>
            <td>${p.nombre}</td>
            <td>${p.stock}</td>
            <td>${toMoney(p.precio)}</td>
          </tr>
        `).join("")
        : `<tr><td colspan="3" class="muted">Sin alertas (stock > ${LOW_STOCK_THRESHOLD}).</td></tr>`;
    }

    if (msg) showMsg(msg, "Dashboard actualizado.", true);
  } catch (e) {
    if (msg) showMsg(msg, `Error dashboard: ${e.message}`, false);
  }
}

function renderChartVentasDia(labels, data) {
  const canvas = $("chartVentasDia");
  if (!canvas || typeof Chart === "undefined") return;

  const ctx = canvas.getContext("2d");
  if (chartVentasDia) chartVentasDia.destroy();

  chartVentasDia = new Chart(ctx, {
    type: "line",
    data: { labels, datasets: [{ label: "Ventas (CLP)", data }] },
    options: {
      responsive: true,
      plugins: { legend: { display: true } },
      scales: { y: { ticks: { callback: (v) => Number(v).toLocaleString("es-CL") } } },
    },
  });
}

function renderChartTopProductos(labels, data) {
  const canvas = $("chartTopProductos");
  if (!canvas || typeof Chart === "undefined") return;

  const ctx = canvas.getContext("2d");
  if (chartTopProductos) chartTopProductos.destroy();

  chartTopProductos = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets: [{ label: "Ingresos (CLP)", data }] },
    options: {
      responsive: true,
      plugins: { legend: { display: true } },
      scales: { y: { ticks: { callback: (v) => Number(v).toLocaleString("es-CL") } } },
    },
  });
}

// =======================
// ===== COMPRAS MÚLTIPLES (carrito)
// =======================
let carrito = []; // [{producto_id, nombre, precio, cantidad}]

function renderCarrito() {
  const tbody = $("carritoTable");
  if (!tbody) return;

  tbody.innerHTML = "";
  let total = 0;

  if (!carrito.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="muted">Carrito vacío.</td></tr>`;
    if ($("carritoTotal")) $("carritoTotal").textContent = toMoney(0);
    return;
  }

  carrito.forEach((item, idx) => {
    const subtotal = item.precio * item.cantidad;
    total += subtotal;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.nombre}</td>
      <td>${item.cantidad}</td>
      <td>${toMoney(item.precio)}</td>
      <td>${toMoney(subtotal)}</td>
      <td>
        <button class="btn btn--ghost btn--danger" data-idx="${idx}" title="Quitar">✕</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  if ($("carritoTotal")) $("carritoTotal").textContent = toMoney(total);

  tbody.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.idx);
      carrito.splice(idx, 1);
      renderCarrito();
    });
  });
}

async function initComprasMultiples() {
  if (!$("compra_empresa") || !$("compra_producto")) return;

  try {
    const [empresas, productos] = await Promise.all([
      api("/empresas/"),
      api("/productos/"),
    ]);

    $("compra_empresa").innerHTML = empresas.length
      ? empresas.map((e) => `<option value="${e.id}">${e.nombre}</option>`).join("")
      : `<option value="">(sin empresas)</option>`;

    const productosDisponibles = productos.filter((p) => Number(p.stock || 0) > 0);
    $("compra_producto").innerHTML = productosDisponibles.length
      ? productosDisponibles
          .map((p) => `<option value="${p.id}">${p.nombre} (stock ${p.stock})</option>`)
          .join("")
      : `<option value="">(sin productos con stock)</option>`;

    clearMsg($("compraMsg"));
    renderCarrito();
  } catch (e) {
    showMsg($("compraMsg"), `Error cargando compras múltiples: ${e.message}`, false);
  }
}

$("btnAgregarCarrito")?.addEventListener("click", async () => {
  const msg = $("compraMsg");
  clearMsg(msg);

  const producto_id = Number($("compra_producto")?.value || 0);
  const cantidad = Number($("compra_cantidad")?.value || 0);

  if (!producto_id) {
    showMsg(msg, "Selecciona un producto.", false);
    return;
  }
  if (cantidad <= 0) {
    showMsg(msg, "Cantidad inválida.", false);
    return;
  }

  try {
    const productos = await api("/productos/");
    const prod = productos.find((p) => p.id === producto_id);
    if (!prod) {
      showMsg(msg, "Producto no encontrado.", false);
      return;
    }
    if (Number(prod.stock) < cantidad) {
      showMsg(msg, `Stock insuficiente. Stock actual: ${prod.stock}`, false);
      return;
    }

    const existente = carrito.find((i) => i.producto_id === producto_id);
    if (existente) {
      const nuevaCantidad = existente.cantidad + cantidad;
      if (Number(prod.stock) < nuevaCantidad) {
        showMsg(msg, `Stock insuficiente para acumular. Stock: ${prod.stock}`, false);
        return;
      }
      existente.cantidad = nuevaCantidad;
    } else {
      carrito.push({
        producto_id,
        nombre: prod.nombre,
        precio: Number(prod.precio),
        cantidad,
      });
    }

    renderCarrito();
    showMsg(msg, "Producto agregado al carrito.", true);
  } catch (e) {
    showMsg(msg, `Error: ${e.message}`, false);
  }
});

$("btnVaciarCarrito")?.addEventListener("click", () => {
  const msg = $("compraMsg");
  clearMsg(msg);

  if (!confirm("¿Vaciar carrito?")) return;
  carrito = [];
  renderCarrito();
  showMsg(msg, "Carrito vacío.", true);
});

$("btnConfirmarCompra")?.addEventListener("click", async () => {
  const msg = $("compraMsg");
  clearMsg(msg);

  const empresa_id = Number($("compra_empresa")?.value || 0);
  if (!empresa_id || !carrito.length) {
    showMsg(msg, "Selecciona empresa y agrega productos al carrito.", false);
    return;
  }

  const payload = {
    empresa_id,
    items: carrito.map((i) => ({ producto_id: i.producto_id, cantidad: i.cantidad })),
  };

  try {
    const r = await api("/ventas/compra", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    showMsg(
      msg,
      `Compra registrada ✅ (ID ${r.compra_id})\nTotal: ${toMoney(r.total_compra)}\nLíneas: ${r.lineas_creadas}`,
      true
    );

    carrito = [];
    renderCarrito();

    await loadProductos();
    await loadVentasList();
    await initComprasMultiples();
    await loadDashboard();
  } catch (e) {
    showMsg(msg, `Error: ${e.message}`, false);
  }
});

// =======================
// ✅ IMPORTAR EXCEL (CORREGIDO para evitar 422 desde HTML)
// =======================
function normalizeFastAPIDetail(detail) {
  // FastAPI 422 suele venir como array de {loc,msg,type}
  if (!detail) return "Error desconocido";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => {
      const loc = Array.isArray(d.loc) ? d.loc.join(".") : "";
      return `${loc}: ${d.msg}`;
    }).join(" | ");
  }
  try { return JSON.stringify(detail); } catch { return String(detail); }
}

function initExcelImport() {
  const btn = $("btnImportExcel");
  const msg = $("importMsg");
  const fileInput = $("prodExcel");

  if (!btn || !fileInput) return;

  btn.addEventListener("click", async (ev) => {
    ev.preventDefault(); // por si el botón cae dentro de algo tipo form
    ev.stopPropagation();

    clearMsg(msg);

    const f = fileInput.files?.[0];
    if (!f) {
      showMsg(msg, "Selecciona un archivo .xlsx", false);
      return;
    }

    if (!f.name.toLowerCase().endsWith(".xlsx")) {
      showMsg(msg, "El archivo debe ser .xlsx", false);
      return;
    }

    const form = new FormData();
    // ✅ EL NOMBRE DEL CAMPO DEBE SER EXACTAMENTE "file"
    form.append("file", f, f.name);

    try {
      showMsg(msg, "Importando... ⏳", true);

      const url = (base() || "") + "/productos/importar_excel";

      const res = await fetch(url, {
        method: "POST",
        body: form,
        // NO pongas Content-Type aquí (el navegador lo setea con boundary)
      });

      const ct = res.headers.get("content-type") || "";
      const data = ct.includes("application/json") ? await res.json() : await res.text();

      if (!res.ok) {
        // muestra detalle real
        const detail = (data && data.detail) ? normalizeFastAPIDetail(data.detail) : (typeof data === "string" ? data : "Error");
        throw new Error(detail);
      }

      showMsg(
        msg,
        `Importación OK ✅\nCreados: ${data.creados}\nActualizados: ${data.actualizados}\nErrores: ${data.total_errores}`,
        true
      );

      await loadProductos();
      await loadDashboard();
    } catch (e) {
      showMsg(msg, `Error: ${e.message}`, false);
      console.error(e);
    }
  });
}

// =======================
// ===== Boot ============
// =======================
(async function init() {
  await loadDashboard();
  await loadEmpresas();
  await loadProductos();

  await loadVentasInit();
  await initComprasMultiples();

  renderCarrito();

  // ✅ inicializa import excel (sin depender de DOMContentLoaded)
  initExcelImport();
})();
