from pydantic import BaseModel
from datetime import datetime

class ReporteFlujoCaja(BaseModel):
    fecha_inicio: datetime
    fecha_fin: datetime
    ventas_totales: float
    ganancias_totales: float
    productos_vendidos: int
