from fastapi import APIRouter, HTTPException
from typing import List
from pathlib import Path
from app.models.empresa import Empresa
from app.utils import load_json, save_json, DATA_DIR

router = APIRouter(prefix="/empresas", tags=["Empresas"])

EMPRESAS_FILE = DATA_DIR / "empresas.json"

def next_id(items: list[dict]) -> int:
    return (max((i.get("id", 0) for i in items), default=0) + 1)

@router.get("/", response_model=List[Empresa])
def listar_empresas():
    return load_json(EMPRESAS_FILE, default=[])

@router.get("/{empresa_id}", response_model=Empresa)
def obtener_empresa(empresa_id: int):
    empresas = load_json(EMPRESAS_FILE, default=[])
    for e in empresas:
        if e["id"] == empresa_id:
            return e
    raise HTTPException(status_code=404, detail="Empresa no encontrada")

@router.post("/", response_model=Empresa, status_code=201)
def crear_empresa(empresa: Empresa):
    empresas = load_json(EMPRESAS_FILE, default=[])
    # Validación simple de RUT duplicado
    if any(e.get("rut") == empresa.rut for e in empresas):
        raise HTTPException(status_code=409, detail="Ya existe una empresa con ese RUT")

    data = empresa.model_dump()
    # Forzamos id correlativo (si te mandan uno, lo ignoramos para evitar colisiones)
    data["id"] = next_id(empresas)
    empresas.append(data)
    save_json(EMPRESAS_FILE, empresas)
    return data

@router.put("/{empresa_id}", response_model=Empresa)
def actualizar_empresa(empresa_id: int, empresa: Empresa):
    empresas = load_json(EMPRESAS_FILE, default=[])
    for idx, e in enumerate(empresas):
        if e["id"] == empresa_id:
            data = empresa.model_dump()
            data["id"] = empresa_id
            empresas[idx] = data
            save_json(EMPRESAS_FILE, empresas)
            return data
    raise HTTPException(status_code=404, detail="Empresa no encontrada")

@router.delete("/{empresa_id}", response_model=Empresa)
def eliminar_empresa(empresa_id: int):
    empresas = load_json(EMPRESAS_FILE, default=[])
    for idx, e in enumerate(empresas):
        if e["id"] == empresa_id:
            eliminado = empresas.pop(idx)
            save_json(EMPRESAS_FILE, empresas)
            return eliminado
    raise HTTPException(status_code=404, detail="Empresa no encontrada")
