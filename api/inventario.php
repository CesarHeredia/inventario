<?php
require_once 'db.php';

// Verificar autenticación global
$token = getBearerToken();
$userPayload = verifyJWT($token);
if (!$userPayload) {
    sendError(401, "Sesión inválida o expirada. Por favor, inicie sesión nuevamente.");
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $userId = $_GET['userId'] ?? null;
    if (!$userId) sendError(400, "userId es requerido");
    
    // Verificar autorización: ¿El usuario tiene permiso para ver estos datos?
    if (!authorizeUser($userPayload, $userId)) {
        sendError(403, "No tiene permiso para acceder a estos datos");
    }
    
    try {
        $stmt = $pdo->prepare("SELECT * FROM inventario WHERE usuarioId = ? ORDER BY fechaCreacion DESC");
        $stmt->execute([$userId]);
        $productos = $stmt->fetchAll();
        
        foreach ($productos as &$p) {
            $p['cantidad'] = (float)$p['cantidad'];
            $p['costoBolivares'] = (float)$p['costoBolivares'];
            $p['precioVentaDolares'] = $p['precioVentaDolares'] ? (float)$p['precioVentaDolares'] : null;
            $p['tasaDolar'] = (float)$p['tasaDolar'];
            $p['monedaCompra'] = $p['monedaCompra'] ?? 'Bs';
            $p['monedaVenta'] = $p['monedaVenta'] ?? '$';
        }
        
        header('Content-Type: application/json');
        echo json_encode(["success" => true, "productos" => $productos]);
    } catch (Exception $e) {
        sendError(500, "Error al obtener inventario", $e->getMessage());
    }
} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    // Verificar autorización para el usuarioId que intenta crear
    if (!authorizeUser($userPayload, $data['usuarioId'])) {
        sendError(403, "No tiene permiso para realizar registros en esta cuenta");
    }
    
    try {
        $stmt = $pdo->prepare("
            INSERT INTO inventario (usuarioId, nombre, descripcion, categoria, tipo, unidadMedida, cantidad, costoBolivares, monedaCompra, precioVentaDolares, monedaVenta, tasaDolar) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $data['usuarioId'],
            $data['nombre'],
            $data['descripcion'] ?? null,
            $data['categoria'] ?? 'General',
            $data['tipo'],
            $data['unidadMedida'],
            $data['cantidad'],
            $data['costoBolivares'],
            $data['monedaCompra'] ?? 'Bs',
            $data['precioVentaDolares'] ?? null,
            $data['monedaVenta'] ?? '$',
            $data['tasaDolar']
        ]);
        
        echo json_encode(["success" => true, "message" => "Producto agregado correctamente", "id" => $pdo->lastInsertId()]);
    } catch (Exception $e) {
        sendError(500, "Error al agregar producto", $e->getMessage());
    }
} elseif ($method === 'PUT') {
    $data = json_decode(file_get_contents("php://input"), true);
    $id = $_GET['id'] ?? $data['id'] ?? null;
    
    if (!$id) sendError(400, "ID de producto requerido");
    
    try {
        // Primero verificar a quién pertenece el producto
        $stmtCheck = $pdo->prepare("SELECT usuarioId FROM inventario WHERE id = ?");
        $stmtCheck->execute([$id]);
        $product = $stmtCheck->fetch();
        
        if (!$product || !authorizeUser($userPayload, $product['usuarioId'])) {
            sendError(403, "No tiene permiso para modificar este producto");
        }

        if (isset($data['update_all']) && $data['update_all'] === true) {
            $stmt = $pdo->prepare("
                UPDATE inventario SET 
                nombre = ?, 
                descripcion = ?, 
                categoria = ?, 
                tipo = ?, 
                unidadMedida = ?, 
                cantidad = ?, 
                costoBolivares = ?, 
                monedaCompra = ?, 
                precioVentaDolares = ?, 
                monedaVenta = ?, 
                tasaDolar = ? 
                WHERE id = ?
            ");
            $stmt->execute([
                $data['nombre'],
                $data['descripcion'] ?? null,
                $data['categoria'] ?? 'General',
                $data['tipo'],
                $data['unidadMedida'],
                $data['cantidad'],
                $data['costoBolivares'],
                $data['monedaCompra'] ?? 'Bs',
                $data['precioVentaDolares'] ?? null,
                $data['monedaVenta'] ?? '$',
                $data['tasaDolar'],
                $id
            ]);
        } else {
            // Actualización atómica de cantidad si es lo único que llega
            $stmt = $pdo->prepare("UPDATE inventario SET cantidad = ? WHERE id = ?");
            $stmt->execute([$data['cantidad'], $id]);
        }
        
        echo json_encode(["success" => true, "message" => "Producto actualizado correctamente"]);
    } catch (Exception $e) {
        sendError(500, "Error al actualizar producto", $e->getMessage());
    }
} elseif ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if (!$id) sendError(400, "ID de producto requerido");
    
    try {
        $stmtCheck = $pdo->prepare("SELECT usuarioId FROM inventario WHERE id = ?");
        $stmtCheck->execute([$id]);
        $product = $stmtCheck->fetch();
        
        if (!$product || !authorizeUser($userPayload, $product['usuarioId'])) {
            sendError(403, "No tiene permiso para eliminar este producto");
        }

        $stmt = $pdo->prepare("DELETE FROM inventario WHERE id = ?");
        $stmt->execute([$id]);
        
        echo json_encode(["success" => true, "message" => "Producto eliminado correctamente"]);
    } catch (Exception $e) {
        sendError(500, "Error al eliminar producto", $e->getMessage());
    }
} else {
    sendError(405, "Método no permitido");
}
