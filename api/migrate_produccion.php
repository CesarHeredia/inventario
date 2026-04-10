<?php
require_once 'db.php';

try {
    $sql = "CREATE TABLE IF NOT EXISTS producciones (
      id INT AUTO_INCREMENT PRIMARY KEY,
      usuarioId INT NOT NULL,
      detalles JSON NOT NULL,
      costoTotal DECIMAL(15, 2) DEFAULT 0,
      fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_usuario (usuarioId),
      INDEX idx_fecha (fecha),
      FOREIGN KEY (usuarioId) REFERENCES usuarios(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
    
    $pdo->exec($sql);
    echo "Tabla 'producciones' creada exitosamente o ya existía.";
} catch (Exception $e) {
    http_response_code(500);
    echo "Error al crear la tabla: " . $e->getMessage();
}
