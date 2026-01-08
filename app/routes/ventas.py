from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import datetime
from app.models.venta import Venta
from app.utils import load_json, save_json, DATA_DIR
from app.models.compra import CompraRequest, CompraResponse


router = APIRouter(prefix="/ventas", tags=["Ventas"])

VENTAS_FILE = DATA_DIR / "ventas.json"
PRODUCTOS_FILE = DATA_DIR / "productos.json"
EMPRESAS_FILE = DATA_DIR / "empresas.json"

def next_id(items: list[dict]) -> int:
    return (max((i.get("id", 0) for i in items), default=0) + 1)

def get_producto(producto_id: int) -> dict:
    productos = load_json(PRODUCTOS_FILE, default=[])
    for p in productos:
        if p["id"] == producto_id:
            return p
    raise HTTPException(status_code=404, detail="Producto no encontrado")

def save_producto(updated: dict) -> None:
    productos = load_json(PRODUCTOS_FILE, default=[])
    for idx, p in enumerate(productos):
        if p["id"] == updated["id"]:
            productos[idx] = updated
            save_json(PRODUCTOS_FILE, productos)
            return
    raise HTTPException(status_code=404, detail="Producto no encontrado al actualizar")

def empresa_existe(empresa_id: int) -> bool:
    empresas = load_json(EMPRESAS_FILE, default=[])
    return any(e["id"] == empresa_id for e in empresas)

@router.get("/", response_model=List[Venta])
def listar_ventas(
    empresa_id: Optional[int] = Query(default=None),
    producto_id: Optional[int] = Query(default=None),
    desde: Optional[str] = Query(default=None, description="ISO date-time"),
    hasta: Optional[str] = Query(default=None, description="ISO date-time"),
):
    ventas = load_json(VENTAS_FILE, default=[])
    out = ventas

    if empresa_id is not None:
        out = [v for v in out if v.get("empresa_id") == empresa_id]
    if producto_id is not None:
        out = [v for v in out if v.get("producto_id") == producto_id]

    if desde:
        d = datetime.fromisoformat(desde)
        out = [v for v in out if datetime.fromisoformat(v["fecha"]) >= d]
    if hasta:
        h = datetime.fromisoformat(hasta)
        out = [v for v in out if datetime.fromisoformat(v["fecha"]) <= h]

    return out

@router.post("/", response_model=Venta, status_code=201)
def crear_venta(venta: Venta):
    # Validar empresa
    if not empresa_existe(venta.empresa_id):
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    # Validar producto y stock
    producto = get_producto(venta.producto_id)
    if venta.cantidad <= 0:
        raise HTTPException(status_code=400, detail="La cantidad debe ser mayor a 0")
    if producto["stock"] < venta.cantidad:
        raise HTTPException(status_code=409, detail="Stock insuficiente")

    # Calcular total en base al precio actual del producto
    total = float(producto["precio"]) * int(venta.cantidad)

    # Persistir venta con id correlativo y fecha actual si viene vacía
    ventas = load_json(VENTAS_FILE, default=[])
    data = venta.model_dump()
    data["id"] = next_id(ventas)
    data["total"] = total
    # Si el cliente manda fecha, la respetamos; si no, ponemos now()
    if not data.get("fecha"):
        data["fecha"] = datetime.utcnow().isoformat()
    else:
        # Pydantic nos deja datetime; serializamos a ISO
        if isinstance(data["fecha"], datetime):
            data["fecha"] = data["fecha"].isoformat()

    ventas.append(data)
    save_json(VENTAS_FILE, ventas)

    # Descontar stock
    producto["stock"] = int(producto["stock"]) - int(venta.cantidad)
    save_producto(producto)

    return data

@router.get("/empresas/{empresa_id}/historial", response_model=List[Venta])
def historial_por_empresa(empresa_id: int):
    if not empresa_existe(empresa_id):
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    ventas = load_json(VENTAS_FILE, default=[])
    historial = [v for v in ventas if v.get("empresa_id") == empresa_id]
    if not historial:
        raise HTTPException(status_code=404, detail="No se encontraron ventas para esta empresa")
    return historial

@router.post("/compra", response_model=CompraResponse, status_code=201)
def crear_compra_multiple(req: CompraRequest):
    # Validar empresa
    if not empresa_existe(req.empresa_id):
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    if not req.items:
        raise HTTPException(status_code=400, detail="La compra debe incluir al menos 1 producto")

    # Cargar data
    ventas = load_json(VENTAS_FILE, default=[])

    # Generar compra_id correlativo (independiente de venta id)
    compra_id = max((v.get("compra_id", 0) or 0 for v in ventas), default=0) + 1

    # Pre-cargar productos y validar stock completo antes de descontar
    productos = load_json(PRODUCTOS_FILE, default=[])
    prod_by_id = {p["id"]: p for p in productos}

    # Validaciones
    for item in req.items:
        if item.producto_id not in prod_by_id:
            raise HTTPException(status_code=404, detail=f"Producto no encontrado: {item.producto_id}")
        if prod_by_id[item.producto_id]["stock"] < item.cantidad:
            raise HTTPException(
                status_code=409,
                detail=f"Stock insuficiente para producto {item.producto_id}"
            )

    # Si pasa validación, crear líneas (ventas) y descontar stock
    fecha = (req.fecha or datetime.utcnow())
    total_compra = 0.0
    total_items = 0
    lineas_creadas = 0

    def next_venta_id() -> int:
        return (max((i.get("id", 0) for i in ventas), default=0) + 1)

    for item in req.items:
        producto = prod_by_id[item.producto_id]
        precio = float(producto["precio"])
        total_linea = precio * int(item.cantidad)

        venta_linea = {
            "id": next_venta_id(),
            "compra_id": compra_id,
            "producto_id": item.producto_id,
            "empresa_id": req.empresa_id,
            "cantidad": int(item.cantidad),
            "total": float(total_linea),
            "fecha": fecha.isoformat(),
        }
        ventas.append(venta_linea)

        # Descontar stock
        producto["stock"] = int(producto["stock"]) - int(item.cantidad)

        total_compra += float(total_linea)
        total_items += int(item.cantidad)
        lineas_creadas += 1

    # Guardar ventas
    save_json(VENTAS_FILE, ventas)

    # Guardar productos actualizados (productos.json completo)
    save_json(PRODUCTOS_FILE, list(prod_by_id.values()))

    return {
        "compra_id": compra_id,
        "empresa_id": req.empresa_id,
        "total_compra": total_compra,
        "total_items": total_items,
        "lineas_creadas": lineas_creadas,
        "fecha": fecha,
    }
