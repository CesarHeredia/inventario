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
    $userId = $_GET['userId'] ?? null;
    if (!$userId) sendError(400, "userId es requerido");
    
    if (!authorizeUser($userPayload, $userId)) {
        sendError(403, "No tiene permiso para ver estos servicios");
    }
    
    try {
        $stmt = $pdo->prepare("SELECT * FROM servicios WHERE usuarioId = ? ORDER BY fecha DESC");
        $stmt->execute([$userId]);
        $servicios = $stmt->fetchAll();
        
        foreach ($servicios as &$s) {
            $s['costoBolivares'] = (float)$s['costoBolivares'];
            $s['precioVenta'] = (float)$s['precioVenta'];
            $s['cantidad'] = (int)($s['cantidad'] ?? 0);
        }
        
        header('Content-Type: application/json');
        echo json_encode(["success" => true, "servicios" => $servicios]);
    } catch (Exception $e) {
        sendError(500, "Error al obtener servicios", $e->getMessage());
    }
} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (!authorizeUser($userPayload, $data['usuarioId'])) {
        sendError(403, "No tiene permiso para realizar registros en esta cuenta");
    }
    
    try {
        $pdo->beginTransaction();
        // Si es una producción por lote (múltiples servicios y/o insumos)
        if (isset($data['batch']) && $data['batch'] === true) {
            // 1. Insertar o actualizar cada servicio producido
            if (isset($data['servicios']) && is_array($data['servicios'])) {
                foreach ($data['servicios'] as $svc) {
                    $stmtCheck = $pdo->prepare("SELECT id, cantidad FROM servicios WHERE usuarioId = ? AND nombreServicio = ?");
                    $stmtCheck->execute([$data['usuarioId'], $svc['nombreServicio']]);
                    $existing = $stmtCheck->fetch();

                    if ($existing) {
                        $stmtUpdate = $pdo->prepare("
                            UPDATE servicios SET 
                            cantidad = cantidad + ?, 
                            precioVenta = ?, 
                            monedaVenta = ?, 
                            tasaDolar = ?, 
                            descripcion = ?,
                            fecha = ?
                            WHERE id = ?
                        ");
                        $stmtUpdate->execute([
                            $svc['cantidad'],
                            $svc['precioVenta'] ?? 0,
                            $svc['monedaVenta'] ?? '$',
                            $svc['tasaDolar'] ?? 0,
                            $svc['descripcion'] ?? null,
                            $svc['fecha'] ?? date('Y-m-d H:i:s'),
                            $existing['id']
                        ]);
                    } else {
                        $stmtInsert = $pdo->prepare("
                            INSERT INTO servicios (usuarioId, nombreServicio, categoria, cliente, costoBolivares, precioVenta, monedaVenta, tasaDolar, cantidad, descripcion, fecha) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ");
                        $stmtInsert->execute([
                            $data['usuarioId'],
                            $svc['nombreServicio'],
                            $svc['categoria'] ?? 'General',
                            $svc['cliente'] ?? null,
                            $svc['costoBolivares'],
                            $svc['precioVenta'] ?? 0,
                            $svc['monedaVenta'] ?? '$',
                            $svc['tasaDolar'] ?? 0,
                            $svc['cantidad'],
                            $svc['descripcion'] ?? null,
                            $svc['fecha'] ?? date('Y-m-d H:i:s')
                        ]);
                    }
                }
            }

            // 2. Descontar insumos del inventario (CON VERIFICACIÓN DE DUEÑO ADICIONAL)
            if (isset($data['insumos']) && is_array($data['insumos'])) {
                $stmtInventario = $pdo->prepare("UPDATE inventario SET cantidad = cantidad - ? WHERE id = ? AND usuarioId = ?");
                foreach ($data['insumos'] as $insumo) {
                    $stmtInventario->execute([
                        $insumo['cantidad'],
                        $insumo['productoId'],
                        $data['usuarioId'] // El id del dueño del lote
                    ]);
                }
            }

            // 3. Registrar en el historial de producciones
            $stmtHistorial = $pdo->prepare("INSERT INTO producciones (usuarioId, detalles, costoTotal, fecha) VALUES (?, ?, ?, ?)");
            $detallesJSON = json_encode([
                "servicios" => $data['servicios'],
                "insumos" => $data['insumos'] ?? []
            ]);
            
            $costoTotal = $data['costoTotal'] ?? 0;

            $stmtHistorial->execute([
                $data['usuarioId'],
                $detallesJSON,
                $costoTotal,
                date('Y-m-d H:i:s')
            ]);

            $pdo->commit();
            echo json_encode(["success" => true, "message" => "Lote de producción registrado correctamente"]);
        } else {
            // Comportamiento normal (un solo servicio)
            $stmt = $pdo->prepare("
                INSERT INTO servicios (usuarioId, nombreServicio, categoria, cliente, costoBolivares, precioVenta, monedaVenta, tasaDolar, cantidad, descripcion, fecha) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $data['usuarioId'],
                $data['nombreServicio'],
                $data['categoria'] ?? 'General',
                $data['cliente'] ?? null,
                $data['costoBolivares'],
                $data['precioVenta'] ?? 0,
                $data['monedaVenta'] ?? '$',
                $data['tasaDolar'] ?? 0,
                $data['cantidad'] ?? 1,
                $data['descripcion'] ?? null,
                $data['fecha']
            ]);
            
            $pdo->commit();
            echo json_encode(["success" => true, "message" => "Servicio registrado correctamente", "id" => $pdo->lastInsertId()]);
        }
    } catch (Exception $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        sendError(500, "Error en el servidor", $e->getMessage());
    }
} elseif ($method === 'PUT') {
    $data = json_decode(file_get_contents("php://input"), true);
    $id = $_GET['id'] ?? $data['id'] ?? null;
    if (!$id) sendError(400, "ID de servicio requerido");

    try {
        $stmtCheck = $pdo->prepare("SELECT usuarioId FROM servicios WHERE id = ?");
        $stmtCheck->execute([$id]);
        $service = $stmtCheck->fetch();

        if (!$service || !authorizeUser($userPayload, $service['usuarioId'])) {
            sendError(403, "No tiene permiso para modificar este servicio");
        }

        $stmt = $pdo->prepare("
            UPDATE servicios SET 
            nombreServicio = ?, 
            categoria = ?, 
            costoBolivares = ?, 
            precioVenta = ?, 
            monedaVenta = ?, 
            tasaDolar = ?, 
            cantidad = ?,
            descripcion = ? 
            WHERE id = ?
        ");
        $stmt->execute([
            $data['nombreServicio'],
            $data['categoria'] ?? 'General',
            $data['costoBolivares'],
            $data['precioVenta'] ?? 0,
            $data['monedaVenta'] ?? '$',
            $data['tasaDolar'] ?? 0,
            $data['cantidad'] ?? 0,
            $data['descripcion'] ?? null,
            $id
        ]);

        echo json_encode(["success" => true, "message" => "Servicio actualizado correctamente"]);
    } catch (Exception $e) {
        sendError(500, "Error al actualizar servicio", $e->getMessage());
    }
} elseif ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if (!$id) sendError(400, "ID de servicio requerido");

    try {
        $stmtCheck = $pdo->prepare("SELECT usuarioId FROM servicios WHERE id = ?");
        $stmtCheck->execute([$id]);
        $service = $stmtCheck->fetch();

        if (!$service || !authorizeUser($userPayload, $service['usuarioId'])) {
            sendError(403, "No tiene permiso para eliminar este servicio");
        }

        $stmt = $pdo->prepare("DELETE FROM servicios WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(["success" => true, "message" => "Servicio eliminado correctamente"]);
    } catch (Exception $e) {
        sendError(500, "Error al eliminar servicio", $e->getMessage());
    }
    sendError(405, "Método no permitido");
}
