<?php
/**
 * ARCHIVO DE CONFIGURACIÓN PARA EL SERVIDOR ONLINE
 * 
 * INSTRUCCIONES:
 * 1. Renombra este archivo a 'db.php' al subirlo al servidor.
 * 2. Reemplaza los valores con los que te dio tu Hosting.
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$host = 'CAMBIAR_POR_HOST_DB'; // Ej: sql123.infinityfree.com
$dbname = 'CAMBIAR_POR_NOMBRE_DB'; // Ej: if0_1234567_inventoria
$username = 'CAMBIAR_POR_USUARIO_DB'; // Ej: if0_1234567
$password = 'CAMBIAR_POR_PASSWORD_DB'; // Tu contraseña de hosting

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error de conexión online: " . $e->getMessage()]);
    exit();
}
?>
