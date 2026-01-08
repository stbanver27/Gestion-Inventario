from fastapi import APIRouter, HTTPException
from typing import List
from app.models.producto import Producto
from app.utils import load_json, save_json, DATA_DIR

router = APIRouter(prefix="/productos", tags=["Productos"])

PRODUCTOS_FILE = DATA_DIR / "productos.json"

def next_id(items: list[dict]) -> int:
    return (max((i.get("id", 0) for i in items), default=0) + 1)

@router.get("/", response_model=List[Producto])
def listar_productos():
    return load_json(PRODUCTOS_FILE, default=[])

@router.get("/{producto_id}", response_model=Producto)
def obtener_producto(producto_id: int):
    productos = load_json(PRODUCTOS_FILE, default=[])
    for p in productos:
        if p["id"] == producto_id:
            return p
    raise HTTPException(status_code=404, detail="Producto no encontrado")

@router.post("/", response_model=Producto, status_code=201)
def crear_producto(producto: Producto):
    productos = load_json(PRODUCTOS_FILE, default=[])
    data = producto.model_dump()
    data["id"] = next_id(productos)
    productos.append(data)
    save_json(PRODUCTOS_FILE, productos)
    return data

@router.put("/{producto_id}", response_model=Producto)
def actualizar_producto(producto_id: int, producto: Producto):
    productos = load_json(PRODUCTOS_FILE, default=[])
    for idx, p in enumerate(productos):
        if p["id"] == producto_id:
            data = producto.model_dump()
            data["id"] = producto_id
            productos[idx] = data
            save_json(PRODUCTOS_FILE, productos)
            return data
    raise HTTPException(status_code=404, detail="Producto no encontrado")

@router.delete("/{producto_id}", response_model=Producto)
def eliminar_producto(producto_id: int):
    productos = load_json(PRODUCTOS_FILE, default=[])
    for idx, p in enumerate(productos):
        if p["id"] == producto_id:
            eliminado = productos.pop(idx)
            save_json(PRODUCTOS_FILE, productos)
            return eliminado
    raise HTTPException(status_code=404, detail="Producto no encontrado")
