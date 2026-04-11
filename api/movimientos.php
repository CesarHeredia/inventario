<?php
require_once 'db.php';

// Verificar autenticación global
$token = getBearerToken();
$userPayload = verifyJWT($token);
if (!$userPayload) {
    sendError(401, "Sesión inválida o expirada.");
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $userId = $_GET['userId'] ?? null;
    if (!$userId) sendError(400, "userId es requerido");
    
    if (!authorizeUser($userPayload, $userId)) {
        sendError(403, "No tiene permiso");
    }
    
    try {
        $stmt = $pdo->prepare("SELECT * FROM movimientos_inventario WHERE usuarioId = ? ORDER BY fecha DESC");
        $stmt->execute([$userId]);
        $movimientos = $stmt->fetchAll();
        
        foreach ($movimientos as &$m) {
            $m['cantidad'] = (float)$m['cantidad'];
            $m['precioCompra'] = (float)$m['precioCompra'];
            $m['precioVenta'] = (float)$m['precioVenta'];
        }
        
        echo json_encode(["success" => true, "movimientos" => $movimientos]);
    } catch (Exception $e) {
        sendError(500, "Error al obtener movimientos", $e->getMessage());
    }
} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (!authorizeUser($userPayload, $data['usuarioId'])) {
        sendError(403, "No tiene permiso");
    }
    
    try {
        $pdo->beginTransaction();

        // 1. Registrar el movimiento
        $stmt = $pdo->prepare("
            INSERT INTO movimientos_inventario (usuarioId, productoId, productoNombre, tipo, cantidad, precioCompra, precioVenta, moneda, descripcion) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $data['usuarioId'],
            $data['productoId'] ?? null,
            $data['productoNombre'],
            $data['tipo'], // 'entrada', 'venta', 'consumo_servicio', 'consumo_produccion', 'perdida'
            $data['cantidad'],
            $data['precioCompra'] ?? 0,
            $data['precioVenta'] ?? 0,
            $data['moneda'] ?? 'Bs',
            $data['descripcion'] ?? null
        ]);

        // 2. Si es una PERDIDA, descontar del inventario automáticamente
        if ($data['tipo'] === 'perdida' && isset($data['productoId'])) {
            $stmtUpdate = $pdo->prepare("UPDATE inventario SET cantidad = cantidad - ? WHERE id = ?");
            $stmtUpdate->execute([$data['cantidad'], $data['productoId']]);
        }
        
        $pdo->commit();
        echo json_encode(["success" => true, "message" => "Movimiento registrado"]);
    } catch (Exception $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        sendError(500, "Error al registrar movimiento", $e->getMessage());
    }
}
