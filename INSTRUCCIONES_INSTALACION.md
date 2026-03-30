# 📘 INSTRUCCIONES DE INSTALACIÓN Y CONFIGURACIÓN
## Sistema INVENTORIA - Control de Inventario y Contabilidad

---

## 📋 TABLA DE CONTENIDO
1. [Ejecutar la Aplicación Localmente](#1-ejecutar-la-aplicación-localmente)
2. [Instalar WampServer](#2-instalar-wampserver)
3. [Configurar la Base de Datos](#3-configurar-la-base-de-datos)
4. [Conectar la Aplicación con MySQL](#4-conectar-la-aplicación-con-mysql)
5. [Migrar Datos de localStorage a MySQL](#5-migrar-datos-de-localstorage-a-mysql)
6. [Solución de Problemas](#6-solución-de-problemas)

---

## 1️⃣ EJECUTAR LA APLICACIÓN LOCALMENTE

### **Requisitos Previos:**
- ✅ Node.js versión 16 o superior
- ✅ npm (viene con Node.js)
- ✅ Un editor de código (VS Code recomendado)

### **Pasos:**

**1. Descargar Node.js:**
```
🔗 https://nodejs.org/
📦 Descarga la versión LTS (Long Term Support)
```

**2. Verificar instalación:**
```bash
# Abre CMD o Terminal y ejecuta:
node --version
npm --version
```

**3. Navegar a la carpeta del proyecto:**
```bash
cd ruta/donde/guardaste/el/proyecto
```

**4. Instalar dependencias:**
```bash
npm install
```

**5. Ejecutar la aplicación:**
```bash
npm run dev
```

**6. Abrir en el navegador:**
```
🌐 http://localhost:5173
```

### **Comandos Útiles:**
```bash
npm run dev          # Ejecutar en modo desarrollo
npm run build        # Compilar para producción
npm run preview      # Vista previa de producción
```

---

## 2️⃣ INSTALAR WAMPSERVER

### **Paso 1: Descargar WampServer**

**🔗 Sitio oficial:** https://www.wampserver.com/en/

**Versiones disponibles:**
- Windows 64-bit (recomendado para sistemas modernos)
- Windows 32-bit (para sistemas antiguos)

### **Paso 2: Instalación**

1. **Ejecutar el instalador**
   - Doble clic en el archivo descargado
   - Aceptar el UAC (Control de Cuentas de Usuario)

2. **Seleccionar ruta de instalación**
   - Por defecto: `C:\wamp64\`
   - ⚠️ **Importante:** No uses rutas con espacios

3. **Configurar navegador predeterminado**
   - Selecciona tu navegador favorito (Chrome, Firefox, etc.)

4. **Configurar editor de texto**
   - Selecciona Notepad, VS Code o tu editor preferido

5. **Finalizar instalación**
   - Marcar "Launch WampServer Now"
   - Clic en "Finish"

### **Paso 3: Verificar que WampServer funciona**

1. **Buscar el ícono en la bandeja del sistema (junto al reloj)**
   - 🔴 Rojo = Servicios detenidos
   - 🟠 Naranja = Algunos servicios funcionando
   - 🟢 Verde = Todo funciona correctamente

2. **Si está en rojo/naranja:**
   - Clic derecho en el ícono
   - Selecciona "Start All Services"

3. **Verificar en el navegador:**
   ```
   🌐 http://localhost
   ```
   Deberías ver la página de inicio de WampServer

### **Paso 4: Acceder a phpMyAdmin**

```
🌐 http://localhost/phpmyadmin
```

**Credenciales por defecto:**
- **Usuario:** `root`
- **Contraseña:** (dejar en blanco)

---

## 3️⃣ CONFIGURAR LA BASE DE DATOS

### **Opción A: Usando phpMyAdmin (Interfaz Gráfica)**

1. **Abrir phpMyAdmin:**
   ```
   http://localhost/phpmyadmin
   ```

2. **Crear la base de datos:**
   - Clic en la pestaña "Bases de datos"
   - Nombre: `inventoria_db`
   - Cotejamiento: `utf8mb4_unicode_ci`
   - Clic en "Crear"

3. **Importar el esquema:**
   - Selecciona la base de datos `inventoria_db`
   - Clic en la pestaña "Importar"
   - Clic en "Seleccionar archivo"
   - Busca y selecciona el archivo `database_schema.sql`
   - Clic en "Continuar" al final de la página

4. **Verificar las tablas:**
   - Deberías ver 9 tablas creadas:
     - ✅ usuarios
     - ✅ trabajadores
     - ✅ productos
     - ✅ servicios
     - ✅ servicios_productos
     - ✅ ventas
     - ✅ ventas_items
     - ✅ gastos

### **Opción B: Usando SQL directo**

1. **Abrir phpMyAdmin**

2. **Ir a la pestaña "SQL"**

3. **Copiar y pegar TODO el contenido de `database_schema.sql`**

4. **Clic en "Continuar"**

### **Verificar que funcionó:**

```sql
-- Ejecuta esta consulta en phpMyAdmin:
SHOW TABLES;

-- Deberías ver todas las tablas listadas
```

---

## 4️⃣ CONECTAR LA APLICACIÓN CON MYSQL

### **Paso 1: Instalar dependencias de MySQL**

```bash
npm install mysql2
```

### **Paso 2: Crear archivo de configuración**

Crea un archivo llamado `db.config.js` en la raíz del proyecto:

```javascript
// db.config.js
export const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '', // Dejar vacío si no configuraste contraseña
  database: 'inventoria_db',
  port: 3306,
  charset: 'utf8mb4'
};
```

### **Paso 3: Crear un Backend API**

**Necesitarás crear un servidor backend con Node.js + Express:**

```bash
# Instalar dependencias del backend
npm install express cors body-parser mysql2
```

**Crear archivo `server.js`:**

```javascript
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const { dbConfig } = require('./db.config');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Crear pool de conexiones
const pool = mysql.createPool(dbConfig);

// ==========================================
// RUTAS DE USUARIOS
// ==========================================

// Registrar usuario
app.post('/api/usuarios/register', async (req, res) => {
  try {
    const { usuario, contraseña, nombre, apellido, correo, nombreEmpresa, fechaNacimiento } = req.body;
    
    const [result] = await pool.query(
      'INSERT INTO usuarios (usuario, contraseña, nombre, apellido, correo, nombreEmpresa, fechaNacimiento) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [usuario, contraseña, nombre, apellido, correo, nombreEmpresa, fechaNacimiento]
    );
    
    res.json({ success: true, id: result.insertId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Login
app.post('/api/usuarios/login', async (req, res) => {
  try {
    const { usuario, contraseña } = req.body;
    
    const [rows] = await pool.query(
      'SELECT * FROM usuarios WHERE usuario = ? AND contraseña = ? AND activo = TRUE',
      [usuario, contraseña]
    );
    
    if (rows.length > 0) {
      const user = rows[0];
      delete user.contraseña; // No enviar contraseña al frontend
      res.json({ success: true, user });
    } else {
      res.status(401).json({ success: false, error: 'Credenciales inválidas' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// RUTAS DE PRODUCTOS
// ==========================================

// Obtener todos los productos
app.get('/api/productos', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM productos ORDER BY fechaRegistro DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear producto
app.post('/api/productos', async (req, res) => {
  try {
    const { nombre, descripcion, categoria, tipo, cantidad, unidadMedida, precioCompra, monedaCompra, precioVenta, monedaVenta } = req.body;
    
    const [result] = await pool.query(
      'INSERT INTO productos (nombre, descripcion, categoria, tipo, cantidad, unidadMedida, precioCompra, monedaCompra, precioVenta, monedaVenta) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [nombre, descripcion, categoria, tipo, cantidad, unidadMedida, precioCompra, monedaCompra, precioVenta, monedaVenta]
    );
    
    res.json({ success: true, id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar producto
app.put('/api/productos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, categoria, tipo, cantidad, unidadMedida, precioCompra, monedaCompra, precioVenta, monedaVenta } = req.body;
    
    await pool.query(
      'UPDATE productos SET nombre=?, descripcion=?, categoria=?, tipo=?, cantidad=?, unidadMedida=?, precioCompra=?, monedaCompra=?, precioVenta=?, monedaVenta=? WHERE id=?',
      [nombre, descripcion, categoria, tipo, cantidad, unidadMedida, precioCompra, monedaCompra, precioVenta, monedaVenta, id]
    );
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar producto
app.delete('/api/productos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM productos WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// RUTAS DE VENTAS
// ==========================================

// Registrar venta
app.post('/api/ventas', async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { cliente, items, subtotal, iva, total, metodoPago, referencia, usuario, tasaDolar } = req.body;
    const totalBolivares = total * tasaDolar;
    
    // Insertar venta
    const [ventaResult] = await connection.query(
      'INSERT INTO ventas (clienteNombre, clienteTelefono, clienteDocumento, subtotal, iva, total, metodoPago, referencia, usuario, tasaDolar, totalBolivares) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [cliente.nombre, cliente.telefono, cliente.documento, subtotal, iva, total, metodoPago, referencia, usuario, tasaDolar, totalBolivares]
    );
    
    const ventaId = ventaResult.insertId;
    
    // Insertar items de la venta
    for (const item of items) {
      await connection.query(
        'INSERT INTO ventas_items (ventaId, nombre, tipo, cantidad, precioUnitario, subtotal, originalId) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [ventaId, item.nombre, item.tipo, item.cantidad, item.precioUnitario, item.subtotal, item.originalId]
      );
      
      // Actualizar stock si es producto
      if (item.tipo === 'producto') {
        await connection.query(
          'UPDATE productos SET cantidad = cantidad - ? WHERE id = ?',
          [item.cantidad, item.originalId]
        );
      }
    }
    
    await connection.commit();
    res.json({ success: true, ventaId });
    
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// Obtener todas las ventas
app.get('/api/ventas', async (req, res) => {
  try {
    const [ventas] = await pool.query('SELECT * FROM ventas ORDER BY fecha DESC');
    
    // Obtener items de cada venta
    for (let venta of ventas) {
      const [items] = await pool.query('SELECT * FROM ventas_items WHERE ventaId = ?', [venta.id]);
      venta.items = items;
    }
    
    res.json(ventas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// RUTAS DE GASTOS
// ==========================================

// Registrar gasto
app.post('/api/gastos', async (req, res) => {
  try {
    const { descripcion, monto, usuario, tasaDolar } = req.body;
    
    const [result] = await pool.query(
      'INSERT INTO gastos (descripcion, monto, usuario, tasaDolar) VALUES (?, ?, ?, ?)',
      [descripcion, monto, usuario, tasaDolar]
    );
    
    res.json({ success: true, id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener todos los gastos
app.get('/api/gastos', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM gastos ORDER BY fecha DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// INICIAR SERVIDOR
// ==========================================

app.listen(PORT, () => {
  console.log(`🚀 Servidor backend ejecutándose en http://localhost:${PORT}`);
  console.log(`📊 Conectado a MySQL en ${dbConfig.host}`);
});
```

### **Paso 4: Ejecutar el backend**

```bash
node server.js
```

Deberías ver:
```
🚀 Servidor backend ejecutándose en http://localhost:3001
📊 Conectado a MySQL en localhost
```

---

## 5️⃣ MIGRAR DATOS DE LOCALSTORAGE A MYSQL

### **Script de migración:**

Crea un archivo `migrate_localStorage_to_MySQL.html` y ábrelo en el navegador:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Migración de Datos</title>
</head>
<body>
    <h1>Migración localStorage → MySQL</h1>
    <button onclick="migrarDatos()">Iniciar Migración</button>
    <div id="resultado"></div>

    <script>
        async function migrarDatos() {
            const resultado = document.getElementById('resultado');
            resultado.innerHTML = '<p>Migrando datos...</p>';

            try {
                // Migrar productos
                const productos = JSON.parse(localStorage.getItem('products') || '[]');
                for (const producto of productos) {
                    await fetch('http://localhost:3001/api/productos', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(producto)
                    });
                }

                // Migrar ventas
                const ventas = JSON.parse(localStorage.getItem('ventas') || '[]');
                for (const venta of ventas) {
                    await fetch('http://localhost:3001/api/ventas', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(venta)
                    });
                }

                // Migrar gastos
                const gastos = JSON.parse(localStorage.getItem('gastos') || '[]');
                for (const gasto of gastos) {
                    await fetch('http://localhost:3001/api/gastos', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(gasto)
                    });
                }

                resultado.innerHTML = '<p style="color: green;">✅ ¡Migración completada exitosamente!</p>';
            } catch (error) {
                resultado.innerHTML = `<p style="color: red;">❌ Error: ${error.message}</p>`;
            }
        }
    </script>
</body>
</html>
```

---

## 6️⃣ SOLUCIÓN DE PROBLEMAS

### **🔴 WampServer está en rojo**

**Problema:** Apache o MySQL no inician

**Soluciones:**
1. **Puerto 80 ocupado:**
   ```
   - Clic derecho en ícono WampServer
   - Apache → httpd.conf
   - Buscar "Listen 80"
   - Cambiar a "Listen 8080"
   - Guardar y reiniciar
   - Ahora usa: http://localhost:8080
   ```

2. **Puerto 3306 ocupado (MySQL):**
   ```
   - Verificar si MySQL ya está instalado
   - Detener otros servicios MySQL
   - Servicios de Windows (Win+R → services.msc)
   - Buscar "MySQL" y detener
   ```

3. **Falta Microsoft Visual C++:**
   ```
   🔗 Descargar desde:
   https://www.microsoft.com/es-es/download/details.aspx?id=48145
   ```

### **❌ Error "Access Denied" en phpMyAdmin**

**Solución:**
```sql
-- En la consola MySQL de WampServer:
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '';
FLUSH PRIVILEGES;
```

### **🌐 Error de CORS en el frontend**

**Solución:**
Asegúrate de que el backend tiene habilitado CORS:
```javascript
const cors = require('cors');
app.use(cors());
```

### **📦 Error "Cannot find module"**

**Solución:**
```bash
rm -rf node_modules
rm package-lock.json
npm install
```

---

## ✅ CHECKLIST FINAL

Marca cada paso completado:

- [ ] Node.js instalado y verificado
- [ ] Dependencias del proyecto instaladas (`npm install`)
- [ ] Aplicación ejecutándose en `http://localhost:5173`
- [ ] WampServer instalado
- [ ] WampServer con ícono VERDE
- [ ] phpMyAdmin accesible
- [ ] Base de datos `inventoria_db` creada
- [ ] Tablas importadas correctamente
- [ ] Backend `server.js` creado
- [ ] Backend ejecutándose en `http://localhost:3001`
- [ ] Datos migrados de localStorage a MySQL (opcional)

---

## 📞 SOPORTE

Si necesitas ayuda adicional, verifica:

1. **Logs de errores en la consola del navegador** (F12)
2. **Logs del backend** (terminal donde ejecutas `node server.js`)
3. **Logs de MySQL** en WampServer

---

**¡Éxito con tu proyecto INVENTORIA!** 🚀
