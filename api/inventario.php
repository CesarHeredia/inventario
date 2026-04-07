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
            INSERT INTO inventario (usuarioId, nombre, tipo, unidadMedida, cantidad, costoBolivares, precioVentaDolares, tasaDolar) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $data['usuarioId'],
            $data['nombre'],
            $data['tipo'],
            $data['unidadMedida'],
            $data['cantidad'],
            $data['costoBolivares'],
            $data['precioVentaDolares'] ?? null,
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
        $stmt = $pdo->prepare("UPDATE inventario SET cantidad = ? WHERE id = ?");
        $stmt->execute([$data['cantidad'], $id]);
        
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
