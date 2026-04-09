<?php
require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Método no permitido"]);
    exit();
}

$data = json_decode(file_get_contents("php://input"), true);

if (empty($data['usuario']) || empty($data['contraseña'])) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Usuario y contraseña requeridos"]);
    exit();
}

try {
    $stmt = $pdo->prepare("SELECT *, tipoUsuario as rol FROM usuarios WHERE usuario = ?");
    $stmt->execute([$data['usuario']]);
    $user = $stmt->fetch();

    if ($user && ($data['contraseña'] === $user['contraseña'] || password_verify($data['contraseña'], $user['contraseña']))) {
        if ($user['activo'] == 0) {
            http_response_code(403);
            echo json_encode(["success" => false, "message" => "La cuenta está desactivada por un administrador"]);
            exit();
        }

        unset($user['contraseña']); // No devolver la contraseña al frontend
        
        echo json_encode([
            "success" => true,
            "message" => "Inicio de sesión exitoso",
            "token" => "dummy-jwt-token-" . $user['id'], // En una app real usaríamos JWT verdadero
            "user" => $user
        ]);
    } else {
        http_response_code(401);
        echo json_encode(["success" => false, "message" => "Credenciales incorrectas"]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error en el login: " . $e->getMessage()]);
}
?>
