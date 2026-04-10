-- =====================================================
-- INVENTORIA - Base de Datos MySQL
-- Para usar con WAMP Server y phpMyAdmin
-- =====================================================

-- Crear base de datos
CREATE DATABASE IF NOT EXISTS inventoria_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE inventoria_db;

-- =====================================================
-- TABLA: usuarios
-- Almacena todos los tipos de usuarios (admin, jefe, trabajador)
-- =====================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario VARCHAR(100) UNIQUE NOT NULL,
  contraseña VARCHAR(255) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  correo VARCHAR(255) NOT NULL,
  nombreEmpresa VARCHAR(255) NOT NULL,
  fechaNacimiento DATE NULL,
  tipoUsuario ENUM('admin', 'jefe', 'subjefe', 'trabajador') DEFAULT 'jefe',
  jefeId INT NULL,
  activo TINYINT(1) DEFAULT 1,
  
  -- Campos de Suscripción y Límites
  limiteProductos INT DEFAULT 20,
  limiteServicios INT DEFAULT 10,
  limiteCombos INT DEFAULT 5,
  fechaExpiracion DATE NULL,
  comprobantePago VARCHAR(255) NULL, -- Ruta o ID del comprobante
  pagoVerificado TINYINT(1) DEFAULT 0,
  
  fechaRegistro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_usuario (usuario),
  INDEX idx_tipo (tipoUsuario),
  INDEX idx_jefe (jefeId),
  FOREIGN KEY (jefeId) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar usuario admin por defecto
INSERT INTO usuarios (usuario, contraseña, nombre, apellido, correo, nombreEmpresa, tipoUsuario, activo)
VALUES ('admin', 'admin123', 'Administrador', 'Sistema', 'admin@inventoria.com', 'INVENTORIA - Sistema', 'admin', 1)
ON DUPLICATE KEY UPDATE usuario=usuario;

-- =====================================================
-- TABLA: inventario
-- Almacena productos y servicios del inventario
-- =====================================================
CREATE TABLE IF NOT EXISTS inventario (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuarioId INT NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  tipo ENUM('venta', 'servicio') NOT NULL,
  unidadMedida ENUM('unidad', 'paquete', 'kilo') DEFAULT 'unidad',
  cantidad DECIMAL(10, 2) DEFAULT 0,
  costoBolivares DECIMAL(15, 2) NOT NULL,
  precioVentaDolares DECIMAL(15, 2) NULL,
  tasaDolar DECIMAL(10, 2) NOT NULL,
  fechaCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fechaActualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_usuario (usuarioId),
  INDEX idx_tipo (tipo),
  FOREIGN KEY (usuarioId) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLA: ventas
-- Registra todas las ventas realizadas
-- =====================================================
CREATE TABLE IF NOT EXISTS ventas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuarioId INT NOT NULL,
  producto VARCHAR(255) NOT NULL,
  cantidad DECIMAL(10, 2) NOT NULL,
  precioUnitario DECIMAL(15, 2) NOT NULL,
  subtotal DECIMAL(15, 2) NOT NULL,
  iva DECIMAL(15, 2) NOT NULL,
  total DECIMAL(15, 2) NOT NULL,
  metodoPago VARCHAR(50) NULL,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_usuario (usuarioId),
  INDEX idx_fecha (fecha),
  FOREIGN KEY (usuarioId) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLA: servicios
-- Registra todos los servicios prestados
-- =====================================================
CREATE TABLE IF NOT EXISTS servicios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuarioId INT NOT NULL,
  nombreServicio VARCHAR(255) NOT NULL,
  cliente VARCHAR(255) NULL,
  costoBolivares DECIMAL(15, 2) NOT NULL,
  descripcion TEXT NULL,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_usuario (usuarioId),
  INDEX idx_fecha (fecha),
  FOREIGN KEY (usuarioId) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLA: gastos
-- Registra todos los gastos de la empresa
-- =====================================================
CREATE TABLE IF NOT EXISTS gastos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuarioId INT NOT NULL,
  descripcion VARCHAR(255) NOT NULL,
  monto DECIMAL(15, 2) NOT NULL,
  moneda ENUM('bolivares', 'dolares') DEFAULT 'bolivares',
  categoria VARCHAR(100) NULL,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_usuario (usuarioId),
  INDEX idx_fecha (fecha),
  INDEX idx_moneda (moneda),
  FOREIGN KEY (usuarioId) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLA: tasa_dolar (opcional)
-- Almacena el historial de tasas del dólar
-- =====================================================
CREATE TABLE IF NOT EXISTS tasa_dolar (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tasa DECIMAL(10, 2) NOT NULL,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_fecha (fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLA: promociones
-- Almacena ofertas y promociones (2x1, descuentos, etc.)
-- =====================================================
CREATE TABLE IF NOT EXISTS promociones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuarioId INT NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  tipoOferta ENUM('2x1', 'descuento_porcentual', 'precio_fijo') NOT NULL,
  valor DECIMAL(10, 2) DEFAULT 0, -- Porcentaje o precio fijo
  itemId VARCHAR(100) NOT NULL, -- ID del producto o servicio (puede ser del inventario o servicio)
  tipoItem ENUM('producto', 'servicio') NOT NULL,
  activo TINYINT(1) DEFAULT 1,
  fechaInicio DATE NULL,
  fechaFin DATE NULL,
  fechaCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_usuario (usuarioId),
  INDEX idx_activo (activo),
  FOREIGN KEY (usuarioId) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLA: producciones
-- Registra el historial de producciones por lote
-- =====================================================
CREATE TABLE IF NOT EXISTS producciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuarioId INT NOT NULL,
  detalles JSON NOT NULL, -- Almacena items producidos e insumos usados
  costoTotal DECIMAL(15, 2) DEFAULT 0,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_usuario (usuarioId),
  INDEX idx_fecha (fecha),
  FOREIGN KEY (usuarioId) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
