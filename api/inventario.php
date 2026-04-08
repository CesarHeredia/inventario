<?php
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $userId = $_GET['userId'] ?? null;
    if (!$userId) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "userId es requerido"]);
        exit();
    }
    
    try {
        $stmt = $pdo->prepare("SELECT * FROM inventario WHERE usuarioId = ? ORDER BY fechaCreacion DESC");
        $stmt->execute([$userId]);
        $productos = $stmt->fetchAll();
        
        // Convertir tipos numéricos
        foreach ($productos as &$p) {
            $p['cantidad'] = (float)$p['cantidad'];
            $p['costoBolivares'] = (float)$p['costoBolivares'];
            $p['precioVentaDolares'] = $p['precioVentaDolares'] ? (float)$p['precioVentaDolares'] : null;
            $p['tasaDolar'] = (float)$p['tasaDolar'];
            // Asegurar que las monedas tengan valores por defecto si son nulas
            $p['monedaCompra'] = $p['monedaCompra'] ?? 'Bs';
            $p['monedaVenta'] = $p['monedaVenta'] ?? '$';
        }
        
        header('Content-Type: application/json');
        echo json_encode(["success" => true, "productos" => $productos]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Error al obtener inventario: " . $e->getMessage()]);
    }
} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    try {
        $stmt = $pdo->prepare("
            INSERT INTO inventario (usuarioId, nombre, descripcion, categoria, tipo, unidadMedida, cantidad, costoBolivares, monedaCompra, precioVentaDolares, monedaVenta, tasaDolar) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $data['usuarioId'],
            $data['nombre'],
            $data['descripcion'] ?? null,
            $data['categoria'] ?? 'General',
            $data['tipo'],
            $data['unidadMedida'],
            $data['cantidad'],
            $data['costoBolivares'],
            $data['monedaCompra'] ?? 'Bs',
            $data['precioVentaDolares'] ?? null,
            $data['monedaVenta'] ?? '$',
            $data['tasaDolar']
        ]);
        
        echo json_encode(["success" => true, "message" => "Producto agregado correctamente", "id" => $pdo->lastInsertId()]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Error al agregar producto: " . $e->getMessage()]);
    }
} elseif ($method === 'PUT') {
    $data = json_decode(file_get_contents("php://input"), true);
    $id = $_GET['id'] ?? $data['id'] ?? null;
    
    if (!$id) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "ID de producto requerido"]);
        exit();
    }
    
    try {
        // Soporte para actualización parcial o completa
        if (isset($data['update_all']) && $data['update_all'] === true) {
            $stmt = $pdo->prepare("
                UPDATE inventario SET 
                nombre = ?, 
                descripcion = ?, 
                categoria = ?, 
                tipo = ?, 
                unidadMedida = ?, 
                cantidad = ?, 
                costoBolivares = ?, 
                monedaCompra = ?, 
                precioVentaDolares = ?, 
                monedaVenta = ?, 
                tasaDolar = ? 
                WHERE id = ?
            ");
            $stmt->execute([
                $data['nombre'],
                $data['descripcion'] ?? null,
                $data['categoria'] ?? 'General',
                $data['tipo'],
                $data['unidadMedida'],
                $data['cantidad'],
                $data['costoBolivares'],
                $data['monedaCompra'] ?? 'Bs',
                $data['precioVentaDolares'] ?? null,
                $data['monedaVenta'] ?? '$',
                $data['tasaDolar'],
                $id
            ]);
        } else {
            // Mantener retrocompatibilidad con actualización de solo cantidad
            $stmt = $pdo->prepare("UPDATE inventario SET cantidad = ? WHERE id = ?");
            $stmt->execute([$data['cantidad'], $id]);
        }
        
        echo json_encode(["success" => true, "message" => "Producto actualizado correctamente"]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Error al actualizar producto: " . $e->getMessage()]);
    }
} elseif ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    
    if (!$id) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "ID de producto requerido"]);
        exit();
    }
    
    try {
        $stmt = $pdo->prepare("DELETE FROM inventario WHERE id = ?");
        $stmt->execute([$id]);
        
        echo json_encode(["success" => true, "message" => "Producto eliminado correctamente"]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Error al eliminar producto: " . $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Método no permitido"]);
}
?>
