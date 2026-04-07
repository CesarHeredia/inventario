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
        $stmt = $pdo->prepare("SELECT * FROM gastos WHERE usuarioId = ? ORDER BY fecha DESC");
        $stmt->execute([$userId]);
        $gastos = $stmt->fetchAll();
        
        foreach ($gastos as &$g) {
            $g['monto'] = (float)$g['monto'];
        }
        
        header('Content-Type: application/json');
        echo json_encode(["success" => true, "gastos" => $gastos]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Error al obtener gastos: " . $e->getMessage()]);
    }
} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
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
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Error al registrar gasto: " . $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Método no permitido"]);
}
?>
