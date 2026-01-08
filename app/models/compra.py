from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class CompraItem(BaseModel):
    producto_id: int
    cantidad: int = Field(gt=0)

class CompraRequest(BaseModel):
    empresa_id: int
    items: List[CompraItem]
    fecha: Optional[datetime] = None

class CompraResponse(BaseModel):
    compra_id: int
    empresa_id: int
    total_compra: float
    total_items: int
    lineas_creadas: int
    fecha: datetime
