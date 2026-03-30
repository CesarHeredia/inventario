<?php
require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Método no permitido"]);
    exit();
}

$data = json_decode(file_get_contents("php://input"), true);

if (!$data) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Datos inválidos"]);
    exit();
}

// Validar que no falten campos
$required_fields = ['usuario', 'contraseña', 'nombre', 'apellido', 'correo', 'nombreEmpresa', 'fechaNacimiento'];
foreach ($required_fields as $field) {
    if (empty($data[$field])) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "El campo $field es requerido"]);
        exit();
    }
}

// Validar longitud de contraseña
if (strlen($data['contraseña']) < 6) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "La contraseña debe tener al menos 6 caracteres"]);
    exit();
}

// Validar mayoría de edad (18 años)
$fechaNacimiento = new DateTime($data['fechaNacimiento']);
$hoy = new DateTime();
$edad = $hoy->diff($fechaNacimiento)->y;

if ($edad < 18) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Debes ser mayor de 18 años para registrarte"]);
    exit();
}

// Validar longitud y contenido de nombre y apellido
if (strlen($data['nombre']) > 20 || strlen($data['apellido']) > 20) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "El nombre y apellido no pueden superar los 20 caracteres"]);
    exit();
}

if (preg_match('/[0-9]/', $data['nombre']) || preg_match('/[0-9]/', $data['apellido'])) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "El nombre y apellido no pueden contener números"]);
    exit();
}

// Validar longitud de usuario y correo
if (strlen($data['usuario']) > 20) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "El nombre de usuario no puede superar los 20 caracteres"]);
    exit();
}

if (strlen($data['correo']) > 40) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "El correo electrónico no puede superar los 40 caracteres"]);
    exit();
}

if (strlen($data['nombreEmpresa']) > 50) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "El nombre de la empresa no puede superar los 50 caracteres"]);
    exit();
}

try {
    // Comprobar si el usuario o el correo ya existen
    $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE usuario = ? OR correo = ?");
    $stmt->execute([$data['usuario'], $data['correo']]);
    if ($stmt->fetch()) {
        http_response_code(409);
        echo json_encode(["success" => false, "message" => "El usuario o correo ya están registrados"]);
        exit();
    }

    // Hashear la contraseña para seguridad
    $hashed_password = password_hash($data['contraseña'], PASSWORD_DEFAULT);
    $tipoUsuario = 'jefe'; // Asignamos siempre rol de jefe por defecto al registrarse
    $activo = 1;

    $stmt = $pdo->prepare("
        INSERT INTO usuarios (usuario, contraseña, nombre, apellido, correo, nombreEmpresa, fechaNacimiento, tipoUsuario, activo) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    $stmt->execute([
        $data['usuario'],
        $hashed_password,
        $data['nombre'],
        $data['apellido'],
        $data['correo'],
        $data['nombreEmpresa'],
        $data['fechaNacimiento'],
        $tipoUsuario,
        $activo
    ]);

    $userId = $pdo->lastInsertId();

    echo json_encode([
        "success" => true, 
        "message" => "Usuario registrado correctamente",
        "user" => [
            "id" => $userId,
            "usuario" => $data['usuario'],
            "tipoUsuario" => $tipoUsuario
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error al registrar en la base de datos: " . $e->getMessage()]);
}
?>
