<?php
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];
$token = getBearerToken();
$userPayload = verifyJWT($token);

if (!$userPayload) {
    sendError(401, "No autorizado");
}

if ($method === 'GET') {
    $userId = $_GET['userId'] ?? null;
    if (!$userId) {
        sendError(400, "ID de usuario requerido");
    }

    if (!authorizeUser($userPayload, $userId)) {
        sendError(403, "No tiene permiso para ver estos datos");
    }

    try {
        $stmt = $pdo->prepare("SELECT * FROM producciones WHERE usuarioId = ? ORDER BY fecha DESC");
        $stmt->execute([$userId]);
        $producciones = $stmt->fetchAll();

        // Decodificar el JSON de detalles para que el front lo reciba como objeto
        foreach ($producciones as &$prod) {
            $prod['detalles'] = json_decode($prod['detalles']);
        }

        echo json_encode(["success" => true, "producciones" => $producciones]);
    } catch (Exception $e) {
        sendError(500, "Error en el servidor", $e->getMessage());
    }
} else {
    sendError(405, "Método no permitido");
}
