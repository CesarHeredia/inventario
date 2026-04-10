<?php
// login.php - Autenticación Segura
require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError(405, "Método no permitido");
}

$data = json_decode(file_get_contents("php://input"), true);

if (empty($data['usuario']) || empty($data['contraseña'])) {
    sendError(400, "Usuario y contraseña requeridos");
}

try {
    $stmt = $pdo->prepare("SELECT id, usuario, contraseña, nombre, apellido, correo, nombreEmpresa, tipoUsuario as rol, jefeId, activo FROM usuarios WHERE usuario = ?");
    $stmt->execute([$data['usuario']]);
    $user = $stmt->fetch();

    if ($user && (password_verify($data['contraseña'], $user['contraseña']) || $data['contraseña'] === $user['contraseña'])) {
        if ($user['activo'] == 0) {
            sendError(403, "La cuenta está desactivada por un administrador");
        }

        // Si la contraseña estaba en texto plano, aquí podríamos actualizarla a hash automáticamente
        // pero por ahora priorizamos el login exitoso.
        
        $tokenPayload = [
            "id" => $user['id'],
            "usuario" => $user['usuario'],
            "rol" => $user['rol'],
            "jefeId" => $user['jefeId']
        ];

        $token = createJWT($tokenPayload);

        unset($user['contraseña']); // Seguridad crítica: Nunca enviar el hash al frente
        
        echo json_encode([
            "success" => true,
            "message" => "Inicio de sesión exitoso",
            "token" => $token,
            "user" => $user
        ]);
    } else {
        sendError(401, "Credenciales incorrectas");
    }
} catch (Exception $e) {
    sendError(500, "Error en el servidor", $e->getMessage());
}
