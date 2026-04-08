<?php
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $jefeId = $_GET['jefeId'] ?? null;
    if (!$jefeId) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "jefeId es requerido"]);
        exit();
    }
    
    $stmt = $pdo->prepare("SELECT id, usuario, nombre, apellido, correo, tipoUsuario as rol, activo, fechaRegistro as fechaCreacion FROM usuarios WHERE jefeId = ?");
    $stmt->execute([$jefeId]);
    $trabajadores = $stmt->fetchAll();
    
    foreach ($trabajadores as &$t) {
        $t['activo'] = (bool)$t['activo'];
    }
    
    echo json_encode($trabajadores);
}
elseif ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE usuario = ? OR correo = ?");
    $stmt->execute([$data['usuario'], $data['correo']]);
    if ($stmt->fetch()) {
        http_response_code(409);
        echo json_encode(["success" => false, "message" => "El usuario o correo ya están registrados"]);
        exit();
    }
    
    $hashed_password = password_hash($data['contraseña'], PASSWORD_DEFAULT);
    $tipoUsuario = 'trabajador';
    $activo = 1;
    
    $stmt = $pdo->prepare("
        INSERT INTO usuarios (usuario, contraseña, nombre, apellido, correo, nombreEmpresa, tipoUsuario, jefeId, activo) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    
    try {
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
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Error al crear trabajador: " . $e->getMessage()]);
    }
}
elseif ($method === 'PUT') {
    $data = json_decode(file_get_contents("php://input"), true);
    $action = $data['action'] ?? '';
    $id = $data['id'] ?? null;
    
    if (!$id) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "id es requerido"]);
        exit();
    }
    
    if ($action === 'estado') {
        $activo = $data['activo'] ? 1 : 0;
        $stmt = $pdo->prepare("UPDATE usuarios SET activo = ? WHERE id = ?");
        $stmt->execute([$activo, $id]);
        echo json_encode(["success" => true, "message" => "Estado actualizado"]);
    } elseif ($action === 'rol') {
        $rol = $data['rol'];
        if (!in_array($rol, ['trabajador', 'jefe', 'subjefe'])) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Rol inválido"]);
            exit();
        }
        $stmt = $pdo->prepare("UPDATE usuarios SET tipoUsuario = ? WHERE id = ?");
        $stmt->execute([$rol, $id]);
        echo json_encode(["success" => true, "message" => "Rol actualizado"]);
    } else {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Acción inválida"]);
    }
} else {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Método no permitido"]);
}
?>
