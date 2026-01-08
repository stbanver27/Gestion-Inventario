from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class Venta(BaseModel):
    id: int
    compra_id: Optional[int] = None 
    producto_id: int
    empresa_id: int
    cantidad: int = Field(gt=0)
    total: float = Field(ge=0)
    fecha: datetime
