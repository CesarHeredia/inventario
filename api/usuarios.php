<?php
require_once 'db.php';

// Verificar autenticación global
$token = getBearerToken();
$userPayload = verifyJWT($token);
if (!$userPayload) {
    sendError(401, "Sesión inválida o expirada");
}

// RESTRICCIÓN DE SEGURIDAD: Solo el administrador puede acceder a esta API
if ($userPayload['rol'] !== 'admin') {
    sendError(403, "Acceso denegado: Se requieren permisos de administrador");
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        $stmt = $pdo->query("SELECT id, usuario, nombre, apellido, correo, nombreEmpresa, fechaNacimiento, tipoUsuario, activo, limiteProductos, limiteServicios, limiteCombos, fechaExpiracion FROM usuarios");
        $users = $stmt->fetchAll();
        header('Content-Type: application/json');
        echo json_encode(["success" => true, "users" => $users]);
    } catch (Exception $e) {
        sendError(500, "Error al listar usuarios", $e->getMessage());
    }
} elseif ($method === 'PUT') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (empty($data['usuario'])) {
        sendError(400, "Identificador de usuario faltante");
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
        sendError(500, "Error al actualizar", $e->getMessage());
    }
} else {
    sendError(405, "Método no permitido");
}
?>
