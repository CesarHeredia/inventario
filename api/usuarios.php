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
    $reqId = $_GET['id'] ?? null;
    $reqUser = $_GET['usuario'] ?? null;

    // RESTRICCIÓN DE SEGURIDAD: Solo el admin puede listar todos o ver a otros
    if ($userPayload['rol'] !== 'admin') {
        $isSelfId = ($reqId && (string)$reqId === (string)$userPayload['id']);
        $isSelfUser = ($reqUser && (string)$reqUser === (string)$userPayload['usuario']);

        if (!$isSelfId && !$isSelfUser) {
            sendError(403, "Acceso denegado: Solo el administrador puede ver otros perfiles");
        }
    }

    try {
        if ($reqId) {
            $stmt = $pdo->prepare("SELECT id, usuario, nombre, apellido, correo, nombreEmpresa, fechaNacimiento, tipoUsuario, activo, limiteProductos, limiteServicios, limiteCombos, fechaExpiracion FROM usuarios WHERE id = ?");
            $stmt->execute([$reqId]);
            $user = $stmt->fetch();
            echo json_encode(["success" => true, "user" => $user]);
        } elseif ($reqUser) {
            $stmt = $pdo->prepare("SELECT id, usuario, nombre, apellido, correo, nombreEmpresa, fechaNacimiento, tipoUsuario, activo, limiteProductos, limiteServicios, limiteCombos, fechaExpiracion FROM usuarios WHERE usuario = ?");
            $stmt->execute([$reqUser]);
            $user = $stmt->fetch();
            echo json_encode(["success" => true, "user" => $user]);
        } else {
            // Listar todos (Solo admin llegó aquí sin parámetros)
            $stmt = $pdo->query("SELECT id, usuario, nombre, apellido, correo, nombreEmpresa, fechaNacimiento, tipoUsuario, activo, limiteProductos, limiteServicios, limiteCombos, fechaExpiracion FROM usuarios");
            $users = $stmt->fetchAll();
            echo json_encode(["success" => true, "users" => $users]);
        }
    } catch (Exception $e) {
        sendError(500, "Error al obtener usuario(s)", $e->getMessage());
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
