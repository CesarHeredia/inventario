<?php
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $usuarioId = $_GET['usuarioId'] ?? null;
    if (!$usuarioId) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "usuarioId es requerido"]);
        exit();
    }
    
    $stmt = $pdo->prepare("SELECT * FROM promociones WHERE usuarioId = ?");
    $stmt->execute([$usuarioId]);
    $promociones = $stmt->fetchAll();
    
    foreach ($promociones as &$p) {
        $p['activo'] = (bool)$p['activo'];
        $p['valor'] = (float)$p['valor'];
    }
    
    echo json_encode($promociones);
}
elseif ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    $stmt = $pdo->prepare("
        INSERT INTO promociones (usuarioId, nombre, tipoOferta, valor, itemId, tipoItem, activo, fechaInicio, fechaFin) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    
    try {
        $stmt->execute([
            $data['usuarioId'],
            $data['nombre'],
            $data['tipoOferta'],
            $data['valor'] ?? 0,
            $data['itemId'],
            $data['tipoItem'],
            $data['activo'] ? 1 : 0,
            $data['fechaInicio'] ?? null,
            $data['fechaFin'] ?? null
        ]);
        
        echo json_encode([
            "success" => true,
            "message" => "Promoción creada exitosamente",
            "id" => $pdo->lastInsertId()
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Error al crear promoción: " . $e->getMessage()]);
    }
}
elseif ($method === 'PUT') {
    $data = json_decode(file_get_contents("php://input"), true);
    $id = $data['id'] ?? null;
    
    if (!$id) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "id es requerido"]);
        exit();
    }
    
    $fields = [];
    $params = [];
    
    if (isset($data['nombre'])) { $fields[] = "nombre = ?"; $params[] = $data['nombre']; }
    if (isset($data['tipoOferta'])) { $fields[] = "tipoOferta = ?"; $params[] = $data['tipoOferta']; }
    if (isset($data['valor'])) { $fields[] = "valor = ?"; $params[] = $data['valor']; }
    if (isset($data['activo'])) { $fields[] = "activo = ?"; $params[] = $data['activo'] ? 1 : 0; }
    if (isset($data['fechaInicio'])) { $fields[] = "fechaInicio = ?"; $params[] = $data['fechaInicio']; }
    if (isset($data['fechaFin'])) { $fields[] = "fechaFin = ?"; $params[] = $data['fechaFin']; }
    
    if (empty($fields)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "No hay campos para actualizar"]);
        exit();
    }
    
    $params[] = $id;
    $sql = "UPDATE promociones SET " . implode(", ", $fields) . " WHERE id = ?";
    
    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        echo json_encode(["success" => true, "message" => "Promoción actualizada"]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Error al actualizar promoción: " . $e->getMessage()]);
    }
}
elseif ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if (!$id) {
        $data = json_decode(file_get_contents("php://input"), true);
        $id = $data['id'] ?? null;
    }
    
    if (!$id) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "id es requerido"]);
        exit();
    }
    
    try {
        $stmt = $pdo->prepare("DELETE FROM promociones WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(["success" => true, "message" => "Promoción eliminada"]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Error al eliminar promoción: " . $e->getMessage()]);
    }
}
else {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Método no permitido"]);
}
?>
