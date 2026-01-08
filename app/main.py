from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from pathlib import Path

from app.routes import empresas, productos, ventas, reportes, importacion

app = FastAPI(title="API Gestión Inventario (Empresas)")

STATIC_DIR = Path(__file__).resolve().parent / "static"  

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/static/index.html")

app.include_router(empresas.router)
app.include_router(productos.router)
app.include_router(ventas.router)
app.include_router(reportes.router)
app.include_router(importacion.router)