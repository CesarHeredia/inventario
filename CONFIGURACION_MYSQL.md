# 📘 CONFIGURACIÓN DE MYSQL CON WAMP SERVER

## 🔧 **Paso 1: Instalar WAMP Server**

1. Descarga WAMP Server desde: https://www.wampserver.com/
2. Instala WAMP Server en tu computadora
3. Inicia WAMP Server (el ícono debe estar verde)

---

## 🗄️ **Paso 2: Crear la Base de Datos en phpMyAdmin**

### **Acceder a phpMyAdmin:**
1. Abre tu navegador
2. Ve a: `http://localhost/phpmyadmin`
3. Usuario: `root`
4. Contraseña: (dejar vacío por defecto)

### **Importar el Schema:**
1. En phpMyAdmin, haz clic en la pestaña **"SQL"**
2. Abre el archivo `/database_schema.sql` que está en la raíz del proyecto
3. Copia todo el contenido del archivo
4. Pégalo en el campo de texto de phpMyAdmin
5. Haz clic en **"Continuar"** o **"Ejecutar"**

✅ **Esto creará:**
- Base de datos: `inventoria_db`
- Tablas: `usuarios`, `inventario`, `ventas`, `servicios`, `gastos`, `tasa_dolar`
- Usuario admin por defecto (usuario: `admin`, contraseña: `admin123`)

---

## ⚙️ **Paso 3: Configurar Variables de Entorno**

### **Crear archivo `.env` en la raíz del proyecto:**

```env
# Configuración MySQL para WAMP Server
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=inventoria_db
```

**Notas importantes:**
- `MYSQL_HOST`: Siempre es `localhost` si WAMP está en tu computadora
- `MYSQL_PORT`: Por defecto es `3306`
- `MYSQL_USER`: Por defecto es `root`
- `MYSQL_PASSWORD`: Por defecto está vacío en WAMP
- `MYSQL_DATABASE`: Es `inventoria_db` (creada por el script SQL)

---

## 🚀 **Paso 4: Verificar la Conexión**

### **Desde phpMyAdmin:**
1. Ve a `http://localhost/phpmyadmin`
2. En el panel izquierdo, busca la base de datos `inventoria_db`
3. Haz clic en ella
4. Deberías ver las 6 tablas creadas:
   - ✅ usuarios
   - ✅ inventario
   - ✅ ventas
   - ✅ servicios
   - ✅ gastos
   - ✅ tasa_dolar

5. Haz clic en la tabla `usuarios`
6. Deberías ver 1 registro: el usuario **admin**

---

## 📊 **Estructura de las Tablas**

### **1. usuarios**
- Almacena: Admin, Jefes y Trabajadores
- Campos principales: `id`, `usuario`, `contraseña`, `tipoUsuario`, `jefeId`

### **2. inventario**
- Almacena: Productos y servicios
- Campos principales: `id`, `nombre`, `tipo`, `cantidad`, `costoBolivares`, `precioVentaDolares`

### **3. ventas**
- Almacena: Todas las ventas realizadas
- Campos principales: `id`, `producto`, `cantidad`, `total`, `fecha`

### **4. servicios**
- Almacena: Servicios prestados
- Campos principales: `id`, `nombreServicio`, `cliente`, `costoBolivares`

### **5. gastos**
- Almacena: Gastos de la empresa
- Campos principales: `id`, `descripcion`, `monto`, `moneda`, `categoria`

### **6. tasa_dolar**
- Almacena: Historial de tasas del dólar
- Campos principales: `id`, `tasa`, `fecha`

---

## 🔐 **Tipos de Usuario**

### **1. Admin**
- Usuario: `admin`
- Contraseña: `admin123`
- Puede ver todas las cuentas del sistema

### **2. Jefe**
- Se crea al registrarse normalmente
- Tiene su propia empresa e inventario
- Puede crear trabajadores

### **3. Trabajador**
- Lo crea el jefe desde la página "Trabajadores"
- Está ligado al jefe (`jefeId`)
- Comparte el inventario con su jefe

---

## 🧪 **Probar la Conexión**

### **Opción 1: Desde el navegador**
1. Inicia tu aplicación
2. Ve a la página de login
3. Intenta iniciar sesión con:
   - Usuario: `admin`
   - Contraseña: `admin123`

### **Opción 2: Desde phpMyAdmin**
1. Ve a la tabla `usuarios`
2. Haz clic en "Insertar"
3. Crea un usuario de prueba manualmente
4. Intenta iniciar sesión con ese usuario

---

## ❗ **Solución de Problemas**

### **Error: "No se puede conectar a MySQL"**
✅ Verifica que WAMP Server esté iniciado (ícono verde)
✅ Verifica que MySQL esté corriendo en el puerto 3306
✅ Revisa las variables de entorno en el archivo `.env`

### **Error: "Base de datos no existe"**
✅ Ve a phpMyAdmin y ejecuta el script SQL de nuevo
✅ Verifica que la base de datos se llame exactamente `inventoria_db`

### **Error: "Tabla no existe"**
✅ Ejecuta el script SQL completo
✅ Verifica que todas las tablas se hayan creado correctamente

### **No puedo acceder a phpMyAdmin**
✅ Verifica que WAMP Server esté corriendo
✅ Intenta acceder a: `http://localhost:8080/phpmyadmin` (algunos usan puerto 8080)
✅ Reinicia WAMP Server

---

## 📝 **Comandos SQL Útiles**

### **Ver todas las bases de datos:**
```sql
SHOW DATABASES;
```

### **Ver todas las tablas:**
```sql
USE inventoria_db;
SHOW TABLES;
```

### **Ver estructura de una tabla:**
```sql
DESCRIBE usuarios;
```

### **Ver todos los usuarios:**
```sql
SELECT * FROM usuarios;
```

### **Eliminar todos los datos (CUIDADO):**
```sql
TRUNCATE TABLE ventas;
TRUNCATE TABLE servicios;
TRUNCATE TABLE gastos;
TRUNCATE TABLE inventario;
-- NO eliminar usuarios porque tiene el admin
```

---

## 🎯 **Próximos Pasos**

1. ✅ Instalar WAMP Server
2. ✅ Importar el schema SQL en phpMyAdmin
3. ✅ Configurar variables de entorno
4. ✅ Probar la conexión con el usuario admin
5. ⏭️ Actualizar el frontend para usar la API en lugar de localStorage

---

## 📞 **Soporte**

Si tienes problemas con la configuración:
1. Verifica que WAMP esté corriendo (ícono verde)
2. Revisa los logs de MySQL en WAMP
3. Asegúrate de que el puerto 3306 no esté bloqueado por el firewall
