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
    $userId = $_GET['userId'] ?? null;
    if (!$userId) sendError(400, "userId es requerido");
    
    if (!authorizeUser($userPayload, $userId)) {
        sendError(403, "No tiene permiso para ver estas ventas");
    }
    
    try {
        $stmt = $pdo->prepare("SELECT * FROM ventas WHERE usuarioId = ? ORDER BY fecha DESC");
        $stmt->execute([$userId]);
        $ventas = $stmt->fetchAll();
        
        foreach ($ventas as &$v) {
            $v['cantidad'] = (float)$v['cantidad'];
            $v['precioUnitario'] = (float)$v['precioUnitario'];
            $v['subtotal'] = (float)$v['subtotal'];
            $v['iva'] = (float)$v['iva'];
            $v['total'] = (float)$v['total'];
        }
        
        header('Content-Type: application/json');
        echo json_encode(["success" => true, "ventas" => $ventas]);
    } catch (Exception $e) {
        sendError(500, "Error al obtener ventas", $e->getMessage());
    }
} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (!authorizeUser($userPayload, $data['usuarioId'])) {
        sendError(403, "No tiene permiso para realizar registros en esta cuenta");
    }
    
    try {
        $stmt = $pdo->prepare("
            INSERT INTO ventas (usuarioId, producto, cantidad, precioUnitario, subtotal, iva, total, metodoPago, fecha) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $data['usuarioId'],
            $data['producto'],
            $data['cantidad'],
            $data['precioUnitario'],
            $data['subtotal'],
            $data['iva'],
            $data['total'],
            $data['metodoPago'] ?? null,
            $data['fecha']
        ]);
        
        echo json_encode(["success" => true, "message" => "Venta registrada correctamente", "id" => $pdo->lastInsertId()]);
    } catch (Exception $e) {
        sendError(500, "Error al registrar venta", $e->getMessage());
    }
} else {
    sendError(405, "Método no permitido");
}
?>
