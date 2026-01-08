from pydantic import BaseModel, Field

class Producto(BaseModel):
    id: int
    nombre: str
    precio: float = Field(ge=0)
    stock: int = Field(ge=0)
    costo: float = Field(ge=0)
    categoria: str
