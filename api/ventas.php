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
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Error al obtener ventas: " . $e->getMessage()]);
    }
} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
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
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Error al registrar venta: " . $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Método no permitido"]);
}
?>
