# ⚡ INICIO RÁPIDO - INVENTORIA

## 🎯 Cómo abrir la aplicación en 3 minutos

### **OPCIÓN 1: Usar solo con localStorage (SIN base de datos)**

```bash
# 1. Abre una terminal en la carpeta del proyecto
cd ruta/del/proyecto

# 2. Instala las dependencias (solo la primera vez)
npm install

# 3. Ejecuta la aplicación
npm run dev

# 4. Abre tu navegador en:
http://localhost:5173
```

✅ **¡Listo!** La aplicación funcionará guardando datos en el navegador.

---

### **OPCIÓN 2: Con WampServer y MySQL**

#### **Paso 1: Instalar WampServer**
1. Descarga: https://www.wampserver.com/en/
2. Instala y espera que el ícono se ponga VERDE 🟢
3. Abre: `http://localhost/phpmyadmin`

#### **Paso 2: Crear la base de datos**
1. En phpMyAdmin, ve a "Bases de datos"
2. Nombre: `inventoria_db`
3. Clic en "Crear"
4. Clic en "Importar"
5. Selecciona el archivo `database_schema.sql`
6. Clic en "Continuar"

#### **Paso 3: Ejecutar la aplicación**
```bash
npm install
npm run dev
```

---

## 📁 Archivos importantes incluidos

| Archivo | Descripción |
|---------|-------------|
| `database_schema.sql` | Script SQL completo para crear todas las tablas |
| `INSTRUCCIONES_INSTALACION.md` | Guía detallada paso a paso |
| `INICIO_RAPIDO.md` | Este archivo (guía rápida) |

---

## 🔑 Credenciales por defecto

### **phpMyAdmin:**
- **Usuario:** `root`
- **Contraseña:** *(dejar en blanco)*

### **Usuario de ejemplo en la app:**
- **Usuario:** `admin`
- **Contraseña:** `admin123`

---

## 🆘 Problemas comunes

### ❌ "WampServer está en rojo/naranja"
**Solución:** Cambia el puerto de Apache
1. Clic derecho en ícono WampServer
2. Apache → httpd.conf
3. Busca `Listen 80` y cámbialo a `Listen 8080`
4. Reinicia WampServer
5. Ahora usa: `http://localhost:8080/phpmyadmin`

### ❌ "npm: command not found"
**Solución:** Instala Node.js desde https://nodejs.org/

### ❌ "Error al importar database_schema.sql"
**Solución:** 
1. Abre phpMyAdmin
2. Ve a la pestaña "SQL"
3. Copia y pega TODO el contenido del archivo
4. Clic en "Continuar"

---

## 📊 Estado actual del proyecto

✅ **Funcionando con localStorage:**
- Autenticación completa
- Inventario con productos y servicios
- Sistema de ventas con IVA 16%
- Registro de gastos
- Dashboard con estadísticas
- Reportes completos
- Gestión de trabajadores
- Selectores de moneda ($ y Bs)

⏳ **Para implementar:**
- Conexión con MySQL (backend)
- API REST con Express
- Migración de datos

---

## 🎨 Características principales

✨ **Módulos del sistema:**
- 📦 **Inventario** - Gestión de productos con monedas $ y Bs
- 🛒 **Ventas** - POS completo con IVA 16%
- 👥 **Servicios** - Servicios compuestos por productos
- 💵 **Gastos** - Control de gastos en Bs
- 📊 **Reportes** - Visualización de todos los datos
- 👤 **Perfil** - Gestión de usuario
- 👷 **Trabajadores** - Administración de empleados

✨ **Funcionalidades especiales:**
- Tasa del dólar actualizada automáticamente
- Conversión automática Bs ↔ $
- Cálculo de IVA del 16%
- Métodos de pago múltiples
- Reembolsos de ventas
- Stock en tiempo real
- Búsqueda y filtros

---

## 🚀 Próximos pasos recomendados

1. **Ejecutar la aplicación localmente** con `npm run dev`
2. **Familiarizarte con la interfaz** registrando un usuario
3. **Instalar WampServer** cuando quieras persistencia real
4. **Crear la base de datos** con el archivo SQL incluido
5. **Desarrollar el backend** (opcional, para producción)

---

## 💡 Consejos

- ✅ Usa **localStorage** para desarrollo y pruebas
- ✅ Usa **MySQL** para producción y datos reales
- ✅ Haz **backups regulares** usando el botón "Exportar" en Reportes
- ✅ La tasa del dólar se actualiza automáticamente desde una API
- ✅ Todos los precios de venta se calculan en **dólares ($)**
- ✅ Todos los costos se manejan en **bolívares (Bs)**

---

**¿Necesitas ayuda?** Consulta el archivo `INSTRUCCIONES_INSTALACION.md` para una guía completa.

**¡A inventariar! 🎉**
