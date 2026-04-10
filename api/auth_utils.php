<?php
// auth_utils.php - Utilidades de seguridad y JWT
// Definir una clave secreta fuerte. En producción, esto debería estar en una variable de entorno.
define('JWT_SECRET', 'Super-Secret-Key-Change-This-For-Production-123456');

function base64UrlEncode($data) {
    return str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($data));
}

function createJWT($payload) {
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    
    // Añadimos tiempo de expiración (ej: 24 horas)
    $payload['exp'] = time() + (24 * 60 * 60);
    $payload['iat'] = time();

    $base64UrlHeader = base64UrlEncode($header);
    $base64UrlPayload = base64UrlEncode(json_encode($payload));

    $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, JWT_SECRET, true);
    $base64UrlSignature = base64UrlEncode($signature);

    return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
}

function verifyJWT($token) {
    if (!$token) return null;
    
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;

    list($header, $payload, $signature) = $parts;

    // Verificar firma
    $validSignature = hash_hmac('sha256', $header . "." . $payload, JWT_SECRET, true);
    $validSignatureB64 = base64UrlEncode($validSignature);

    if ($signature !== $validSignatureB64) {
        return null; // Firma inválida
    }

    $decodedPayload = json_decode(base64_decode($payload), true);
    
    // Verificar expiración
    if (isset($decodedPayload['exp']) && $decodedPayload['exp'] < time()) {
        return null; // Token expirado
    }

    return $decodedPayload;
}

function getBearerToken() {
    $headers = getallheaders();
    if (isset($headers['Authorization'])) {
        if (preg_match('/Bearer\s(\S+)/', $headers['Authorization'], $matches)) {
            return $matches[1];
        }
    }
    return null;
}

/**
 * Verifica si el usuario autenticado tiene permiso para acceder a los datos de un dueño específico.
 * @param array $user El payload del JWT verificado
 * @param string $requestedOwnerId El ID del dueño que se intenta consultar
 * @return bool
 */
function authorizeUser($user, $requestedOwnerId) {
    if (!$user) return false;
    
    $authedId = (string)$user['id'];
    $authedJefeId = isset($user['jefeId']) ? (string)$user['jefeId'] : null;
    $authedRol = $user['rol'] ?? $user['tipoUsuario'] ?? 'jefe';

    // 1. El dueño puede ver sus propios datos
    if ($authedId === (string)$requestedOwnerId) return true;

    // 2. Un trabajador/subjefe puede ver los datos de su jefe si pidió el ID de su jefe
    if (($authedRol === 'trabajador' || $authedRol === 'subjefe') && $authedJefeId === (string)$requestedOwnerId) {
        return true;
    }

    // 3. El jefe puede ver los datos registrados por sus trabajadores (normalmente guardados bajo el jefeId)
    // Pero la lógica actual suele guardar todo bajo el ID del jefe.
    
    return false;
}

/**
 * Función centralizada para enviar respuestas de error seguras
 */
function sendError($code, $message, $logMessage = null) {
    http_response_code($code);
    header('Content-Type: application/json');
    
    // En producción, logeamos el $logMessage en el servidor pero no lo enviamos al cliente
    if ($logMessage) {
        error_log("Security Error [$code]: " . $logMessage);
    }
    
    echo json_encode(["success" => false, "message" => $message]);
    exit();
}
?>
