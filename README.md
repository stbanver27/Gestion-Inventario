# 📦 Sistema de Gestión de Inventario y Ventas

Sistema web para la gestión de **empresas, productos, inventario y ventas**, con soporte para **ventas simples y compras múltiples**, **dashboard**, **reportes**.

Proyecto desarrollado con **FastAPI + HTML/CSS/JS**, orientado a un despliegue sencillo.

---

## 🚀 Funcionalidades principales


### 🏢 Empresas
- Crear, editar y eliminar empresas
- Datos básicos: nombre, RUT, giro, contacto

### 📦 Productos e Inventario
- CRUD de productos
- Control de stock automático
- Validación de stock antes de vender
- Alertas de stock bajo en dashboard

### 💰 Ventas
- Venta simple (1 producto)
- Compra múltiple (carrito con varios productos)
- Descuento automático de inventario
- Historial de ventas con filtros

### 📊 Dashboard
- KPIs:
  - Total empresas
  - Total productos
  - Stock total
  - Ventas acumuladas
- Gráficos:
  - Ventas por día
  - Top productos por ingresos

### 📈 Reportes
- Flujo de caja por rango de fechas
- Ventas totales
- Ganancias estimadas
- Productos vendidos

---

## 🛠️ Tecnologías utilizadas

### Backend
- **Python 3.11**
- **FastAPI**
- Persistencia en **archivos JSON**

### Frontend
- **HTML5**
- **CSS**
- **JavaScript (Vanilla)**
- **Chart.js**

---

## 📁 Estructura del proyecto

app/
├── main.py
├── routes/
│ ├── empresas.py
│ ├── productos.py
│ ├── ventas.py
│ ├── reportes.py
├── models/
├── utils.py
├── data/
│ ├── users.json
│ ├── empresas.json
│ ├── productos.json
│ ├── ventas.json
static/
├── index.html
├── app.js
├── styles.css
README.md
requirements.txt


### pip install -r requirements.txt
### uvicorn app.main:app --reload

### 🌐 Acceso a la aplicación http://127.0.0.1:8000/static/index.html



---

✨ Autor

Desarrollado por Esteban Vergara
