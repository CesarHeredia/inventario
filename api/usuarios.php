<?php
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        $stmt = $pdo->query("SELECT id, usuario, nombre, apellido, correo, nombreEmpresa, fechaNacimiento, tipoUsuario, activo, limiteProductos, limiteServicios, limiteCombos, fechaExpiracion FROM usuarios");
        $users = $stmt->fetchAll();
        header('Content-Type: application/json');
        echo json_encode(["success" => true, "users" => $users]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Error al listar usuarios: " . $e->getMessage()]);
    }
} elseif ($method === 'PUT') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (empty($data['usuario'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Identificador de usuario faltante"]);
        exit;
    }

    try {
        $stmt = $pdo->prepare("
            UPDATE usuarios 
            SET limiteProductos = ?, 
                limiteServicios = ?, 
                limiteCombos = ?, 
                fechaExpiracion = ? 
            WHERE usuario = ?
        ");
        
        $stmt->execute([
            $data['limiteProductos'],
            $data['limiteServicios'],
            $data['limiteCombos'],
            $data['fechaExpiracion'],
            $data['usuario']
        ]);

        header('Content-Type: application/json');
        echo json_encode(["success" => true, "message" => "Usuario actualizado correctamente"]);
    } catch (Exception $e) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(["success" => false, "message" => "Error al actualizar: " . $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Método no permitido"]);
}
?>
