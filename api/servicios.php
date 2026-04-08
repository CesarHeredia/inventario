<?php
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $userId = $_GET['userId'] ?? null;
    if (!$userId) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "userId es requerido"]);
        exit();
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
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Error al obtener servicios: " . $e->getMessage()]);
    }
} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    try {
        $pdo->beginTransaction();
        // Si es una producción por lote (múltiples servicios y/o insumos)
        if (isset($data['batch']) && $data['batch'] === true) {
            // 1. Insertar o actualizar cada servicio producido
            if (isset($data['servicios']) && is_array($data['servicios'])) {
                foreach ($data['servicios'] as $svc) {
                    // Buscar si el servicio ya existe para este usuario
                    $stmtCheck = $pdo->prepare("SELECT id, cantidad FROM servicios WHERE usuarioId = ? AND nombreServicio = ?");
                    $stmtCheck->execute([$data['usuarioId'], $svc['nombreServicio']]);
                    $existing = $stmtCheck->fetch();

                    if ($existing) {
                        // Actualizar cantidad y otros campos
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
                        // Crear nuevo
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

            // ... (rest of batch logic)
            // 2. Descontar insumos del inventario
            if (isset($data['insumos']) && is_array($data['insumos'])) {
                $stmtInventario = $pdo->prepare("UPDATE inventario SET cantidad = cantidad - ? WHERE id = ?");
                foreach ($data['insumos'] as $insumo) {
                    $stmtInventario->execute([
                        $insumo['cantidad'],
                        $insumo['productoId']
                    ]);
                }
            }

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
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Error al registrar: " . $e->getMessage()]);
    }
} elseif ($method === 'PUT') {
    $data = json_decode(file_get_contents("php://input"), true);
    $id = $_GET['id'] ?? $data['id'] ?? null;

    if (!$id) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "ID de servicio requerido"]);
        exit();
    }

    try {
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
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Error al actualizar servicio: " . $e->getMessage()]);
    }
} elseif ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;

    if (!$id) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "ID de servicio requerido"]);
        exit();
    }

    try {
        $stmt = $pdo->prepare("DELETE FROM servicios WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(["success" => true, "message" => "Servicio eliminado correctamente"]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Error al eliminar servicio: " . $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Método no permitido"]);
}
?>
