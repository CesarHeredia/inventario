# 🚀 MIGRACIÓN COMPLETA A MYSQL - INVENTORIA

## ✅ **CAMBIOS REALIZADOS**

### **1. Backend Creado** ✅
- **Archivo:** `/supabase/functions/server/mysql.tsx`
  - Conexión a MySQL usando Deno
  - Funciones helper: `getConnection()`, `executeQuery()`, `query()`

- **Archivo:** `/supabase/functions/server/index.tsx`
  - API REST completa con Hono
  - Rutas para: Auth, Usuarios, Trabajadores, Inventario, Ventas, Servicios, Gastos

### **2. Base de Datos MySQL** ✅
- **Archivo:** `/database_schema.sql`
  - Script SQL completo para crear todas las tablas
  - Usuario admin predefinido
  - 6 tablas: usuarios, inventario, ventas, servicios, gastos, tasa_dolar

### **3. Frontend Actualizado** ✅
- **Archivo:** `/src/utils/api.ts`
  - Funciones para llamar a la API
  - Reemplaza todo el código de localStorage

- **Login.tsx** - Ahora usa `api.login()`
- **Register.tsx** - Ahora usa `api.register()`

### **4. Sistema de 3 Tipos de Usuario** ✅
- **Admin:** Usuario predefinido (admin/admin123)
- **Jefe:** Se crea al registrarse normalmente
- **Trabajador:** Lo crea el jefe, ligado a su cuenta

---

## 📋 **PASOS PARA CONFIGURAR**

### **Paso 1: Instalar WAMP Server**
1. Descarga: https://www.wampserver.com/
2. Instala WAMP Server
3. Inicia WAMP (ícono debe estar verde)

### **Paso 2: Crear Base de Datos**
1. Ve a: `http://localhost/phpmyadmin`
2. Haz clic en la pestaña **"SQL"**
3. Copia TODO el contenido de `/database_schema.sql`
4. Pégalo y haz clic en **"Ejecutar"**

### **Paso 3: Configurar Variables de Entorno**
Crea un archivo `.env` en la raíz del proyecto:

```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=inventoria_db
```

### **Paso 4: Verificar en phpMyAdmin**
1. Ve a `http://localhost/phpmyadmin`
2. Haz clic en `inventoria_db`
3. Deberías ver 6 tablas
4. Haz clic en `usuarios` - debe haber 1 registro (admin)

### **Paso 5: Probar la Aplicación**
1. Inicia la aplicación
2. Ve a Login
3. Intenta iniciar sesión:
   - Usuario: `admin`
   - Contraseña: `admin123`

---

## 🗄️ **ESTRUCTURA DE LA BASE DE DATOS**

### **Tabla: usuarios**
```sql
- id (INT, AUTO_INCREMENT, PRIMARY KEY)
- usuario (VARCHAR, UNIQUE)
- contraseña (VARCHAR)
- nombre (VARCHAR)
- apellido (VARCHAR)
- correo (VARCHAR)
- nombreEmpresa (VARCHAR)
- fechaNacimiento (DATE)
- tipoUsuario (ENUM: 'admin', 'jefe', 'trabajador')
- jefeId (INT, FOREIGN KEY a usuarios.id)
- activo (TINYINT)
- fechaRegistro (TIMESTAMP)
```

### **Tabla: inventario**
```sql
- id (INT, AUTO_INCREMENT, PRIMARY KEY)
- usuarioId (INT, FOREIGN KEY)
- nombre (VARCHAR)
- tipo (ENUM: 'venta', 'servicio')
- unidadMedida (ENUM: 'unidad', 'paquete', 'kilo')
- cantidad (DECIMAL)
- costoBolivares (DECIMAL)
- precioVentaDolares (DECIMAL)
- tasaDolar (DECIMAL)
- fechaCreacion (TIMESTAMP)
- fechaActualizacion (TIMESTAMP)
```

### **Tabla: ventas**
```sql
- id (INT, AUTO_INCREMENT, PRIMARY KEY)
- usuarioId (INT, FOREIGN KEY)
- producto (VARCHAR)
- cantidad (DECIMAL)
- precioUnitario (DECIMAL)
- subtotal (DECIMAL)
- iva (DECIMAL)
- total (DECIMAL)
- metodoPago (VARCHAR)
- fecha (TIMESTAMP)
```

### **Tabla: servicios**
```sql
- id (INT, AUTO_INCREMENT, PRIMARY KEY)
- usuarioId (INT, FOREIGN KEY)
- nombreServicio (VARCHAR)
- cliente (VARCHAR)
- costoBolivares (DECIMAL)
- descripcion (TEXT)
- fecha (TIMESTAMP)
```

### **Tabla: gastos**
```sql
- id (INT, AUTO_INCREMENT, PRIMARY KEY)
- usuarioId (INT, FOREIGN KEY)
- descripcion (VARCHAR)
- monto (DECIMAL)
- moneda (ENUM: 'bolivares', 'dolares')
- categoria (VARCHAR)
- fecha (TIMESTAMP)
```

---

## 🔌 **RUTAS DE LA API**

### **Auth**
- `POST /auth/login` - Iniciar sesión
- `POST /auth/register` - Registrar nuevo jefe

### **Usuarios**
- `GET /usuarios` - Obtener todos los usuarios (admin)
- `GET /usuarios/:id` - Obtener usuario por ID

### **Trabajadores**
- `GET /trabajadores/:jefeId` - Obtener trabajadores de un jefe
- `POST /trabajadores` - Crear trabajador
- `PUT /trabajadores/:id/estado` - Activar/Desactivar trabajador

### **Inventario**
- `GET /inventario/:userId` - Obtener inventario
- `POST /inventario` - Agregar producto
- `PUT /inventario/:id` - Actualizar producto
- `DELETE /inventario/:id` - Eliminar producto

### **Ventas**
- `GET /ventas/:userId` - Obtener ventas
- `POST /ventas` - Registrar venta

### **Servicios**
- `GET /servicios/:userId` - Obtener servicios
- `POST /servicios` - Registrar servicio

### **Gastos**
- `GET /gastos/:userId` - Obtener gastos
- `POST /gastos` - Registrar gasto

---

## 🔄 **MIGRACIÓN DE DATOS (si ya tienes datos en localStorage)**

Si ya tienes datos en localStorage y quieres migrarlos a MySQL:

### **1. Exportar datos de localStorage:**
Abre la consola del navegador (F12) y ejecuta:

```javascript
// Exportar usuarios
console.log(JSON.stringify(localStorage.getItem('users')));

// Exportar inventario
console.log(JSON.stringify(localStorage.getItem('inventario')));

// Exportar ventas
console.log(JSON.stringify(localStorage.getItem('ventas')));

// Exportar servicios
console.log(JSON.stringify(localStorage.getItem('servicios')));

// Exportar gastos
console.log(JSON.stringify(localStorage.getItem('gastos')));
```

### **2. Insertar en MySQL:**
Usa phpMyAdmin para insertar los datos manualmente o crea un script.

---

## ⚠️ **IMPORTANTE**

### **localStorage vs MySQL:**
- ❌ **localStorage eliminado** de Login y Register
- ✅ **Ahora usa la API MySQL** para autenticación
- ⚠️ **sessionStorage** sigue usando `localStorage.setItem('currentUser')` para mantener la sesión en el navegador

### **Próximos archivos a actualizar:**
Para completar la migración, actualiza estos archivos para que usen la API:

- [ ] `/src/app/pages/Trabajadores.tsx` - Usar `api.createTrabajador()`
- [ ] `/src/app/pages/Inventario.tsx` - Usar `api.getInventario()`, `api.addProducto()`
- [ ] `/src/app/pages/Ventas.tsx` - Usar `api.getVentas()`, `api.addVenta()`
- [ ] `/src/app/pages/Servicios.tsx` - Usar `api.getServicios()`, `api.addServicio()`
- [ ] `/src/app/pages/Gastos.tsx` - Usar `api.getGastos()`, `api.addGasto()`
- [ ] `/src/app/pages/Dashboard.tsx` - Cargar datos desde la API
- [ ] `/src/app/pages/Reportes.tsx` - Cargar datos desde la API

---

## 🧪 **TESTING**

### **Probar Login:**
```bash
curl -X POST http://localhost:8080/functions/v1/make-server-d2eb6dda/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usuario":"admin","contraseña":"admin123"}'
```

### **Probar Register:**
```bash
curl -X POST http://localhost:8080/functions/v1/make-server-d2eb6dda/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "usuario":"testuser",
    "contraseña":"test123",
    "nombre":"Test",
    "apellido":"User",
    "correo":"test@test.com",
    "nombreEmpresa":"Test Company",
    "fechaNacimiento":"1990-01-01"
  }'
```

---

## 📊 **VENTAJAS DE MYSQL**

✅ **Persistencia real** - Los datos no se pierden al limpiar el navegador
✅ **Múltiples dispositivos** - Acceso desde cualquier lugar
✅ **Seguridad** - Contraseñas y datos protegidos en el servidor
✅ **Escalabilidad** - Soporte para miles de usuarios
✅ **Backup** - Fácil hacer respaldos de la base de datos
✅ **Relaciones** - Foreign keys mantienen la integridad de datos
✅ **Multi-usuario** - Varios usuarios pueden trabajar simultáneamente

---

## 🎯 **RESUMEN**

1. ✅ Backend creado con Hono y MySQL
2. ✅ Base de datos con 6 tablas
3. ✅ API REST completa
4. ✅ Login y Register usando MySQL
5. ✅ Sistema de 3 tipos de usuario
6. ⏭️ Siguiente: Actualizar páginas de Inventario, Ventas, etc.

---

**¿Necesitas ayuda?** Revisa el archivo `/CONFIGURACION_MYSQL.md` para instrucciones detalladas.
