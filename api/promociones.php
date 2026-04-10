<?php
require_once 'db.php';

// Verificar autenticación global
$token = getBearerToken();
$userPayload = verifyJWT($token);
if (!$userPayload) {
    sendError(401, "Sesión inválida o expirada");
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $usuarioId = $_GET['usuarioId'] ?? null;
    if (!$usuarioId) sendError(400, "usuarioId es requerido");
    
    if (!authorizeUser($userPayload, $usuarioId)) {
        sendError(403, "No tiene permiso para ver estas promociones");
    }
    
    try {
        $stmt = $pdo->prepare("SELECT * FROM promociones WHERE usuarioId = ?");
        $stmt->execute([$usuarioId]);
        $promociones = $stmt->fetchAll();
        
        foreach ($promociones as &$p) {
            $p['activo'] = (bool)$p['activo'];
            $p['valor'] = (float)$p['valor'];
        }
        
        header('Content-Type: application/json');
        echo json_encode($promociones);
    } catch (Exception $e) {
        sendError(500, "Error al obtener promociones", $e->getMessage());
    }
}
elseif ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (!authorizeUser($userPayload, $data['usuarioId'])) {
        sendError(403, "No tiene permiso para crear promociones en esta cuenta");
    }
    
    try {
        $stmt = $pdo->prepare("
            INSERT INTO promociones (usuarioId, nombre, tipoOferta, valor, itemId, tipoItem, activo, fechaInicio, fechaFin) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
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
        sendError(500, "Error al crear promoción", $e->getMessage());
    }
}
elseif ($method === 'PUT') {
    $data = json_decode(file_get_contents("php://input"), true);
    $id = $data['id'] ?? null;
    if (!$id) sendError(400, "id es requerido");
    
    try {
        // Verificar propiedad
        $stmtCheck = $pdo->prepare("SELECT usuarioId FROM promociones WHERE id = ?");
        $stmtCheck->execute([$id]);
        $promo = $stmtCheck->fetch();
        
        if (!$promo || !authorizeUser($userPayload, $promo['usuarioId'])) {
            sendError(403, "No tiene permiso para modificar esta promoción");
        }

        $fields = [];
        $params = [];
        
        if (isset($data['nombre'])) { $fields[] = "nombre = ?"; $params[] = $data['nombre']; }
        if (isset($data['tipoOferta'])) { $fields[] = "tipoOferta = ?"; $params[] = $data['tipoOferta']; }
        if (isset($data['valor'])) { $fields[] = "valor = ?"; $params[] = $data['valor']; }
        if (isset($data['activo'])) { $fields[] = "activo = ?"; $params[] = $data['activo'] ? 1 : 0; }
        if (isset($data['fechaInicio'])) { $fields[] = "fechaInicio = ?"; $params[] = $data['fechaInicio']; }
        if (isset($data['fechaFin'])) { $fields[] = "fechaFin = ?"; $params[] = $data['fechaFin']; }
        
        if (empty($fields)) sendError(400, "No hay campos para actualizar");
        
        $params[] = $id;
        $sql = "UPDATE promociones SET " . implode(", ", $fields) . " WHERE id = ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        echo json_encode(["success" => true, "message" => "Promoción actualizada"]);
    } catch (Exception $e) {
        sendError(500, "Error al actualizar promoción", $e->getMessage());
    }
}
elseif ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if (!$id) {
        $data = json_decode(file_get_contents("php://input"), true);
        $id = $data['id'] ?? null;
    }
    if (!$id) sendError(400, "id es requerido");
    
    try {
        // Verificar propiedad
        $stmtCheck = $pdo->prepare("SELECT usuarioId FROM promociones WHERE id = ?");
        $stmtCheck->execute([$id]);
        $promo = $stmtCheck->fetch();
        
        if (!$promo || !authorizeUser($userPayload, $promo['usuarioId'])) {
            sendError(403, "No tiene permiso para eliminar esta promoción");
        }

        $stmt = $pdo->prepare("DELETE FROM promociones WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(["success" => true, "message" => "Promoción eliminada"]);
    } catch (Exception $e) {
        sendError(500, "Error al eliminar promoción", $e->getMessage());
    }
}
else {
    sendError(405, "Método no permitido");
}
?>
