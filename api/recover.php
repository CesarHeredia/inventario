<?php
require_once 'db.php';

$data = json_decode(file_get_contents("php://input"), true);

if (!$data || !isset($data['action'])) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Acción no especificada"]);
    exit();
}

$action = $data['action'];

switch ($action) {
    case 'send_code':
        $correo = $data['correo'] ?? '';
        if (empty($correo)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Correo requerido"]);
            exit();
        }

        // Verificar si el correo existe
        $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE correo = ?");
        $stmt->execute([$correo]);
        $user = $stmt->fetch();

        if (!$user) {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "El correo no está registrado"]);
            exit();
        }

        // Generar código de 6 dígitos
        $codigo = str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);
        $expiracion = date('Y-m-d H:i:s', strtotime('+15 minutes'));

        // Guardar código
        $stmt = $pdo->prepare("INSERT INTO recuperacion_codigos (correo, codigo, expiracion) VALUES (?, ?, ?)");
        $stmt->execute([$correo, $codigo, $expiracion]);

        // Enviar correo real
        $asunto = "Codigo de Recuperacion - Inventoria";
        $mensaje = "Hola,\n\nHas solicitado recuperar tu acceso a Inventoria.\n\n"
                 . "Tu codigo de verificacion es: $codigo\n\n"
                 . "Este codigo expirara en 15 minutos.\n\n"
                 . "Si no solicitaste este cambio, puedes ignorar este correo.\n\n"
                 . "Saludos,\nEl equipo de Inventoria";
        $cabeceras = "From: soporte@inventoria.com\r\n" .
                     "Reply-To: soporte@inventoria.com\r\n" .
                     "X-Mailer: PHP/" . phpversion();

        // Intentamos enviar el correo (el @ es para evitar errores fatales si mail() falla)
        $mailSent = @mail($correo, $asunto, $mensaje, $cabeceras);

        // Retornamos el código en la respuesta para facilitar la prueba (en prod se enviaría por mail)
        echo json_encode([
            "success" => true, 
            "message" => "Código generado correctamente. Revisa tu correo.",
            "mail_status" => $mailSent ? "Garantizado (si SMTP está ok)" : "Fallo en servidor de correo",
            "debug_code" => $codigo // SOLO PARA DESARROLLO/PRUEBAS
        ]);
        break;

    case 'verify_code':
        $correo = $data['correo'] ?? '';
        $codigo = $data['codigo'] ?? '';

        if (empty($correo) || empty($codigo)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Correo y código requeridos"]);
            exit();
        }

        $stmt = $pdo->prepare("
            SELECT id FROM recuperacion_codigos 
            WHERE correo = ? AND codigo = ? AND usado = 0 AND expiracion > NOW()
            ORDER BY fecha_creacion DESC LIMIT 1
        ");
        $stmt->execute([$correo, $codigo]);
        $record = $stmt->fetch();

        if ($record) {
            echo json_encode(["success" => true, "message" => "Código verificado correctamente"]);
        } else {
            http_response_code(401);
            echo json_encode(["success" => false, "message" => "Código inválido o expirado"]);
        }
        break;

    case 'reset_credentials':
        $correo = $data['correo'] ?? '';
        $codigo = $data['codigo'] ?? '';
        $type = $data['type'] ?? ''; // 'usuario' o 'contraseña'
        $newValue = $data['newValue'] ?? '';

        if (empty($correo) || empty($codigo) || empty($type) || empty($newValue)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Datos incompletos"]);
            exit();
        }

        // Volver a verificar el código antes de resetear
        $stmt = $pdo->prepare("
            SELECT id FROM recuperacion_codigos 
            WHERE correo = ? AND codigo = ? AND usado = 0 AND expiracion > NOW()
            ORDER BY fecha_creacion DESC LIMIT 1
        ");
        $stmt->execute([$correo, $codigo]);
        $record = $stmt->fetch();

        if (!$record) {
            http_response_code(401);
            echo json_encode(["success" => false, "message" => "Sesión de recuperación inválida"]);
            exit();
        }

        if ($type === 'contraseña') {
            $hashed = password_hash($newValue, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("UPDATE usuarios SET contraseña = ? WHERE correo = ?");
            $stmt->execute([$hashed, $correo]);
        } else if ($type === 'usuario') {
            // Verificar que el nuevo usuario no exista
            $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE usuario = ?");
            $stmt->execute([$newValue]);
            if ($stmt->fetch()) {
                http_response_code(409);
                echo json_encode(["success" => false, "message" => "El nombre de usuario ya está en uso"]);
                exit();
            }
            $stmt = $pdo->prepare("UPDATE usuarios SET usuario = ? WHERE correo = ?");
            $stmt->execute([$newValue, $correo]);
        }

        // Marcar código como usado
        $stmt = $pdo->prepare("UPDATE recuperacion_codigos SET usado = 1 WHERE id = ?");
        $stmt->execute([$record['id']]);

        echo json_encode(["success" => true, "message" => "Credenciales actualizadas correctamente"]);
        break;

    default:
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Acción no válida"]);
        break;
}
?>
