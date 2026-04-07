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
        $stmt = $pdo->prepare("SELECT * FROM servicios WHERE usuarioId = ? ORDER BY fecha DESC");
        $stmt->execute([$userId]);
        $servicios = $stmt->fetchAll();
        
        foreach ($servicios as &$s) {
            $s['costoBolivares'] = (float)$s['costoBolivares'];
        }
        
        header('Content-Type: application/json');
        echo json_encode(["success" => true, "servicios" => $servicios]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Error al obtener servicios: " . $e->getMessage()]);
    }
} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    try {
        $stmt = $pdo->prepare("
            INSERT INTO servicios (usuarioId, nombreServicio, cliente, costoBolivares, descripcion, fecha) 
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $data['usuarioId'],
            $data['nombreServicio'],
            $data['cliente'] ?? null,
            $data['costoBolivares'],
            $data['descripcion'] ?? null,
            $data['fecha']
        ]);
        
        echo json_encode(["success" => true, "message" => "Servicio registrado correctamente", "id" => $pdo->lastInsertId()]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Error al registrar servicio: " . $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Método no permitido"]);
}
?>
