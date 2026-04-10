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
        sendError(403, "No tiene permiso para ver estos gastos");
    }
    
    try {
        $stmt = $pdo->prepare("SELECT * FROM gastos WHERE usuarioId = ? ORDER BY fecha DESC");
        $stmt->execute([$userId]);
        $gastos = $stmt->fetchAll();
        
        foreach ($gastos as &$g) {
            $g['monto'] = (float)$g['monto'];
        }
        
        header('Content-Type: application/json');
        echo json_encode(["success" => true, "gastos" => $gastos]);
    } catch (Exception $e) {
        sendError(500, "Error al obtener gastos", $e->getMessage());
    }
} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (!authorizeUser($userPayload, $data['usuarioId'])) {
        sendError(403, "No tiene permiso para realizar registros en esta cuenta");
    }
    
    try {
        $stmt = $pdo->prepare("
            INSERT INTO gastos (usuarioId, descripcion, monto, moneda, categoria, fecha) 
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $data['usuarioId'],
            $data['descripcion'],
            $data['monto'],
            $data['moneda'],
            $data['categoria'] ?? null,
            $data['fecha']
        ]);
        
        echo json_encode(["success" => true, "message" => "Gasto registrado correctamente", "id" => $pdo->lastInsertId()]);
    } catch (Exception $e) {
        sendError(500, "Error al registrar gasto", $e->getMessage());
    }
} else {
    sendError(405, "Método no permitido");
}
?>
