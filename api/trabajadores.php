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
    $jefeId = $_GET['jefeId'] ?? null;
    if (!$jefeId) sendError(400, "jefeId es requerido");
    
    // Solo el jefe o sus propios trabajadores/subjefes pueden ver la lista
    if (!authorizeUser($userPayload, $jefeId)) {
        sendError(403, "No tiene permiso para ver esta lista de trabajadores");
    }
    
    try {
        $stmt = $pdo->prepare("SELECT id, usuario, nombre, apellido, correo, tipoUsuario as rol, activo, fechaRegistro as fechaCreacion FROM usuarios WHERE jefeId = ?");
        $stmt->execute([$jefeId]);
        $trabajadores = $stmt->fetchAll();
        
        foreach ($trabajadores as &$t) {
            $t['activo'] = (bool)$t['activo'];
        }
        
        header('Content-Type: application/json');
        echo json_encode($trabajadores);
    } catch (Exception $e) {
        sendError(500, "Error al obtener trabajadores", $e->getMessage());
    }
}
elseif ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    // Solo el JEFE puede crear trabajadores
    if ((string)$userPayload['id'] !== (string)$data['jefeId']) {
        sendError(403, "Solo el dueño de la cuenta puede registrar trabajadores");
    }
    
    try {
        $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE usuario = ? OR correo = ?");
        $stmt->execute([$data['usuario'], $data['correo']]);
        if ($stmt->fetch()) {
            sendError(409, "El usuario o correo ya están registrados");
        }
        
        $hashed_password = password_hash($data['contraseña'], PASSWORD_DEFAULT);
        $tipoUsuario = 'trabajador';
        $activo = 1;
        
        $stmt = $pdo->prepare("
            INSERT INTO usuarios (usuario, contraseña, nombre, apellido, correo, nombreEmpresa, tipoUsuario, jefeId, activo) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $data['usuario'],
            $hashed_password,
            $data['nombre'],
            $data['apellido'],
            $data['correo'],
            $data['nombreEmpresa'],
            $tipoUsuario,
            $data['jefeId'],
            $activo
        ]);
        
        $userId = $pdo->lastInsertId();
        
        echo json_encode([
            "success" => true,
            "message" => "Trabajador creado exitosamente",
            "trabajador" => [
                "id" => $userId,
                "usuario" => $data['usuario'],
                "nombre" => $data['nombre'],
                "apellido" => $data['apellido'],
                "correo" => $data['correo'],
                "rol" => $tipoUsuario,
                "activo" => true,
                "fechaCreacion" => date('c')
            ]
        ]);
    } catch (Exception $e) {
        sendError(500, "Error al crear trabajador", $e->getMessage());
    }
}
elseif ($method === 'PUT') {
    $data = json_decode(file_get_contents("php://input"), true);
    $action = $data['action'] ?? '';
    $id = $data['id'] ?? null;
    
    if (!$id) sendError(400, "id es requerido");
    
    try {
        // Verificar que el trabajador a editar pertenezca al jefe que está logueado
        $stmtCheck = $pdo->prepare("SELECT jefeId FROM usuarios WHERE id = ?");
        $stmtCheck->execute([$id]);
        $worker = $stmtCheck->fetch();
        
        if (!$worker || (string)$worker['jefeId'] !== (string)$userPayload['id']) {
            sendError(403, "No tiene permiso para modificar este trabajador");
        }

        if ($action === 'estado') {
            $activo = $data['activo'] ? 1 : 0;
            $stmt = $pdo->prepare("UPDATE usuarios SET activo = ? WHERE id = ?");
            $stmt->execute([$activo, $id]);
            echo json_encode(["success" => true, "message" => "Estado actualizado"]);
        } elseif ($action === 'rol') {
            $rol = $data['rol'];
            if (!in_array($rol, ['trabajador', 'jefe', 'subjefe'])) {
                sendError(400, "Rol inválido");
            }
            $stmt = $pdo->prepare("UPDATE usuarios SET tipoUsuario = ? WHERE id = ?");
            $stmt->execute([$rol, $id]);
            echo json_encode(["success" => true, "message" => "Rol actualizado"]);
        } else {
            sendError(400, "Acción inválida");
        }
    } catch (Exception $e) {
        sendError(500, "Error al actualizar trabajador", $e->getMessage());
    }
} else {
    sendError(405, "Método no permitido");
}
