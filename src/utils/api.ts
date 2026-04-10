/// <reference types="vite/client" />
// Utilidad para hacer llamadas a la API del servidor
const isProduction = import.meta.env.PROD;
const API_BASE_URL = isProduction 
  ? '/api' 
  : `http://localhost/www/django/clinica_moya/inventario/inventario/api`;

// Helper para hacer peticiones
async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = sessionStorage.getItem('token');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Error en la petición');
  }
  
  return data;
}

// ==================== AUTH API ====================

export async function login(usuario: string, contraseña: string) {
  return fetchAPI('/login.php', {
    method: 'POST',
    body: JSON.stringify({ usuario, contraseña }),
  });
}

export async function register(userData: {
  usuario: string;
  contraseña: string;
  nombre: string;
  apellido: string;
  correo: string;
  nombreEmpresa: string;
  fechaNacimiento: string;
  rol?: 'admin' | 'jefe' | 'trabajador';
  limiteProductos?: number;
  limiteServicios?: number;
  limiteCombos?: number;
}) {
  return fetchAPI('/register.php', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
}

// ==================== USUARIOS API ====================

export async function getAllUsuarios() {
  return fetchAPI('/usuarios.php', { method: 'GET' });
}

export async function getUsuarioById(id: string) {
  return fetchAPI(`/usuarios.php?id=${id}`, { method: 'GET' });
}

// ==================== TRABAJADORES API ====================

export async function getTrabajadores(jefeId: string) {
  return fetchAPI(`/trabajadores.php?jefeId=${jefeId}`, { method: 'GET' });
}

export async function createTrabajador(trabajadorData: {
  usuario: string;
  contraseña: string;
  nombre: string;
  apellido: string;
  correo: string;
  jefeId: string;
  nombreEmpresa: string;
}) {
  return fetchAPI('/trabajadores.php', {
    method: 'POST',
    body: JSON.stringify(trabajadorData),
  });
}

export async function updateTrabajadorEstado(id: string, activo: boolean) {
  return fetchAPI(`/trabajadores.php`, {
    method: 'PUT',
    body: JSON.stringify({ action: 'estado', id, activo }),
  });
}

export async function updateTrabajadorRol(id: string, rol: string) {
  return fetchAPI(`/trabajadores.php`, {
    method: 'PUT',
    body: JSON.stringify({ action: 'rol', id, rol }),
  });
}

// ==================== INVENTARIO API ====================

export async function getInventario(userId: string) {
  return fetchAPI(`/inventario.php?userId=${userId}`, { method: 'GET' });
}

export async function addProducto(productoData: {
  usuarioId: string;
  nombre: string;
  descripcion?: string;
  categoria?: string;
  tipo: 'venta' | 'servicio';
  unidadMedida: 'unit' | 'paquete' | 'kilo';
  cantidad: number;
  costoBolivares: number;
  monedaCompra?: 'Bs' | '$';
  precioVentaDolares?: number;
  monedaVenta?: 'Bs' | '$';
  tasaDolar: number;
}) {
  return fetchAPI('/inventario.php', {
    method: 'POST',
    body: JSON.stringify(productoData),
  });
}

export async function updateProducto(id: string, productoData: any) {
  return fetchAPI(`/inventario.php?id=${id}`, {
    method: 'PUT',
    body: JSON.stringify(productoData),
  });
}

export async function deleteProducto(id: string) {
  return fetchAPI(`/inventario.php?id=${id}`, {
    method: 'DELETE',
  });
}

// ==================== VENTAS API ====================

export async function getVentas(userId: string) {
  return fetchAPI(`/ventas.php?userId=${userId}`, { method: 'GET' });
}

export async function addVenta(ventaData: {
  usuarioId: string;
  producto: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  iva: number;
  total: number;
  metodoPago?: string;
  fecha: string;
}) {
  return fetchAPI('/ventas.php', {
    method: 'POST',
    body: JSON.stringify(ventaData),
  });
}

// ==================== SERVICIOS API ====================

export async function getServicios(userId: string) {
  return fetchAPI(`/servicios.php?userId=${userId}`, { method: 'GET' });
}

export async function addServicio(servicioData: {
  usuarioId: string;
  nombreServicio: string;
  categoria?: string;
  cliente?: string;
  costoBolivares: number;
  precioVenta?: number;
  monedaVenta?: 'Bs' | '$';
  tasaDolar?: number;
  cantidad?: number;
  fecha: string;
  descripcion?: string;
}) {
  return fetchAPI('/servicios.php', {
    method: 'POST',
    body: JSON.stringify(servicioData),
  });
}

export async function addBatchServicio(batchData: {
  usuarioId: string;
  batch: boolean;
  servicios: Array<{
    nombreServicio: string;
    costoBolivares: number;
    precioVenta: number;
    monedaVenta: 'Bs' | '$';
    tasaDolar: number;
    cantidad?: number;
    descripcion?: string;
    fecha?: string;
  }>;
  insumos: Array<{
    productoId: string;
    cantidad: number;
  }>;
}) {
  return fetchAPI('/servicios.php', {
    method: 'POST',
    body: JSON.stringify(batchData),
  });
}

export async function updateServicio(id: string, data: any) {
  return fetchAPI(`/servicios.php?id=${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteServicio(id: string) {
  return fetchAPI(`/servicios.php?id=${id}`, {
    method: 'DELETE',
  });
}

// ==================== GASTOS API ====================

export async function getGastos(userId: string) {
  return fetchAPI(`/gastos.php?userId=${userId}`, { method: 'GET' });
}

export async function addGasto(gastoData: {
  usuarioId: string;
  descripcion: string;
  monto: number;
  moneda: 'bolivares' | 'dolares';
  categoria?: string;
  fecha: string;
}) {
  return fetchAPI('/gastos.php', {
    method: 'POST',
    body: JSON.stringify(gastoData),
  });
}

export async function deleteGasto(id: string) {
  return fetchAPI(`/gastos.php?id=${id}`, {
    method: 'DELETE',
  });
}
// ==================== PROMOCIONES API ====================

export async function getPromociones(usuarioId: string) {
  return fetchAPI(`/promociones.php?usuarioId=${usuarioId}`, { method: 'GET' });
}

export async function createPromocion(promocionData: {
  usuarioId: string;
  nombre: string;
  tipoOferta: '2x1' | 'descuento_porcentual' | 'precio_fijo';
  valor?: number;
  itemId: string;
  tipoItem: 'producto' | 'servicio';
  activo: boolean;
  fechaInicio?: string;
  fechaFin?: string;
}) {
  return fetchAPI('/promociones.php', {
    method: 'POST',
    body: JSON.stringify(promocionData),
  });
}

export async function updatePromocion(data: {
  id: string;
  nombre?: string;
  tipoOferta?: '2x1' | 'descuento_porcentual' | 'precio_fijo';
  valor?: number;
  activo?: boolean;
  fechaInicio?: string;
  fechaFin?: string;
}) {
  return fetchAPI('/promociones.php', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deletePromocion(id: string) {
  return fetchAPI(`/promociones.php`, {
    method: 'DELETE',
    body: JSON.stringify({ id }),
  });
}

// ==================== REUPERACION API ====================

export async function sendRecoveryCode(correo: string) {
  return fetchAPI('/recover.php', {
    method: 'POST',
    body: JSON.stringify({ action: 'send_code', correo }),
  });
}

export async function verifyRecoveryCode(correo: string, codigo: string) {
  return fetchAPI('/recover.php', {
    method: 'POST',
    body: JSON.stringify({ action: 'verify_code', correo, codigo }),
  });
}

export async function resetCredentials(data: {
  correo: string;
  codigo: string;
  type: 'usuario' | 'contraseña';
  newValue: string;
}) {
  return fetchAPI('/recover.php', {
    method: 'POST',
    body: JSON.stringify({ ...data, action: 'reset_credentials' }),
  });
}
