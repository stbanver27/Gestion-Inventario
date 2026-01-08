from fastapi import APIRouter, HTTPException, Query
from datetime import datetime
from app.utils import load_json, DATA_DIR

router = APIRouter(prefix="/reportes", tags=["Reportes"])

VENTAS_FILE = DATA_DIR / "ventas.json"
PRODUCTOS_FILE = DATA_DIR / "productos.json"

def parse_iso(dt_str: str) -> datetime:
    """
    Acepta ISO 8601 estándar y también strings con 'Z' (UTC),
    por ejemplo: 2026-01-01T03:00:00.000Z
    """
    s = (dt_str or "").strip()
    if not s:
        raise ValueError("Fecha vacía")
    if s.endswith("Z"):
        s = s.replace("Z", "+00:00")
    return datetime.fromisoformat(s)

@router.get("/flujo_caja")
def flujo_caja(
    desde: str = Query(..., description="ISO date-time, ej: 2026-01-01T00:00:00"),
    hasta: str = Query(..., description="ISO date-time, ej: 2026-01-31T23:59:59"),
):
    try:
        fecha_inicio = parse_iso(desde)
        fecha_fin = parse_iso(hasta)
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de fecha inválido. Usa ISO 8601.")

    if fecha_fin < fecha_inicio:
        raise HTTPException(status_code=400, detail="'hasta' debe ser mayor o igual a 'desde'")

    ventas = load_json(VENTAS_FILE, default=[])
    productos = load_json(PRODUCTOS_FILE, default=[])

    # Índice por id
    prod_by_id = {p["id"]: p for p in productos}

    ventas_totales = 0.0
    ganancias_totales = 0.0
    productos_vendidos = 0

    for v in ventas:
        fecha_raw = v.get("fecha")
        if not fecha_raw:
            continue

        try:
            fv = parse_iso(fecha_raw)
        except ValueError:
            # si hay registros viejos con fecha mala, los ignoramos
            continue

        # comparar (si alguno trae tzinfo y otro no, normalizamos quitando tzinfo)
        # para no caer en: "can't compare offset-naive and offset-aware"
        if (fv.tzinfo is not None) != (fecha_inicio.tzinfo is not None):
            fv = fv.replace(tzinfo=None)
            fi = fecha_inicio.replace(tzinfo=None)
            ff = fecha_fin.replace(tzinfo=None)
        else:
            fi = fecha_inicio
            ff = fecha_fin

        if fi <= fv <= ff:
            total = float(v.get("total", 0.0) or 0.0)
            cantidad = int(v.get("cantidad", 0) or 0)

            ventas_totales += total
            productos_vendidos += cantidad

            producto = prod_by_id.get(v.get("producto_id"))
            if producto:
                precio = float(producto.get("precio", 0.0) or 0.0)
                costo = float(producto.get("costo", 0.0) or 0.0)
                ganancias_totales += (precio - costo) * cantidad

    return {
        "fecha_inicio": fecha_inicio.isoformat(),
        "fecha_fin": fecha_fin.isoformat(),
        "ventas_totales": ventas_totales,
        "ganancias_totales": ganancias_totales,
        "productos_vendidos": productos_vendidos,
    }
