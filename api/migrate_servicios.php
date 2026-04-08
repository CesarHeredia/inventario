<?php
require_once 'db.php';

try {
    // Verificar si la columna 'cantidad' ya existe
    $stmt = $pdo->query("SHOW COLUMNS FROM servicios LIKE 'cantidad'");
    if (!$stmt->fetch()) {
        $pdo->exec("ALTER TABLE servicios ADD COLUMN cantidad INT DEFAULT 0 AFTER tasaDolar");
        echo "Columna 'cantidad' añadida exitosamente a la tabla 'servicios'.";
    } else {
        echo "La columna 'cantidad' ya existe.";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
