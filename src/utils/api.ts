/// <reference types="vite/client" />
// Utilidad para hacer llamadas a la API del servidor
const isProduction = import.meta.env.PROD;
const API_BASE_URL = isProduction 
  ? '/api' 
  : `http://localhost/www/django/clinica_moya/inventario/api`;

// Helper para hacer peticiones
async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
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
  return fetchAPI('/usuarios', { method: 'GET' });
}

export async function getUsuarioById(id: string) {
  return fetchAPI(`/usuarios/${id}`, { method: 'GET' });
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
  return fetchAPI(`/inventario/${userId}`, { method: 'GET' });
}

export async function addProducto(productoData: {
  usuarioId: string;
  nombre: string;
  tipo: 'venta' | 'servicio';
  unidadMedida: 'unidad' | 'paquete' | 'kilo';
  cantidad: number;
  costoBolivares: number;
  precioVentaDolares?: number;
  tasaDolar: number;
}) {
  return fetchAPI('/inventario', {
    method: 'POST',
    body: JSON.stringify(productoData),
  });
}

export async function updateProducto(id: string, cantidad: number) {
  return fetchAPI(`/inventario/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ cantidad }),
  });
}

export async function deleteProducto(id: string) {
  return fetchAPI(`/inventario/${id}`, {
    method: 'DELETE',
  });
}

// ==================== VENTAS API ====================

export async function getVentas(userId: string) {
  return fetchAPI(`/ventas/${userId}`, { method: 'GET' });
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
  return fetchAPI('/ventas', {
    method: 'POST',
    body: JSON.stringify(ventaData),
  });
}

// ==================== SERVICIOS API ====================

export async function getServicios(userId: string) {
  return fetchAPI(`/servicios/${userId}`, { method: 'GET' });
}

export async function addServicio(servicioData: {
  usuarioId: string;
  nombreServicio: string;
  cliente?: string;
  costoBolivares: number;
  fecha: string;
  descripcion?: string;
}) {
  return fetchAPI('/servicios', {
    method: 'POST',
    body: JSON.stringify(servicioData),
  });
}

// ==================== GASTOS API ====================

export async function getGastos(userId: string) {
  return fetchAPI(`/gastos/${userId}`, { method: 'GET' });
}

export async function addGasto(gastoData: {
  usuarioId: string;
  descripcion: string;
  monto: number;
  moneda: 'bolivares' | 'dolares';
  categoria?: string;
  fecha: string;
}) {
  return fetchAPI('/gastos', {
    method: 'POST',
    body: JSON.stringify(gastoData),
  });
}
// ==================== PROMOCIONES API ====================

export async function getPromociones(usuarioId: string) {
  return fetchAPI(`/promociones.php?usuarioId=${usuarioId}`, { method: 'GET' });
}

export async function createPromoción(promocionData: {
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
