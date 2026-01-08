from pydantic import BaseModel, EmailStr
from typing import Optional

class Empresa(BaseModel):
    id: int
    nombre: str
    rut: str
    giro: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[EmailStr] = None
    direccion: Optional[str] = None
