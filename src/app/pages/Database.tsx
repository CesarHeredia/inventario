import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  ArrowLeft,
  Database as DatabaseIcon,
  Download,

  Eye,
  EyeOff,
  Users,
  Package,
  Briefcase,
  ShoppingCart,
  Receipt,
  User as UserIcon,
  UserCog,
  LogOut,
  TrendingUp,
  TrendingDown,
  Activity,
  ListOrdered,
  DollarSign,
  Layers
} from "lucide-react";
import { toast } from "sonner";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LineChart, Line 
} from 'recharts';
import { useDolarPrice } from "../hooks/useDolarPrice";
import * as api from "../../utils/api";

interface User {
  id?: string;
  usuario: string;
  nombre: string;
  apellido: string;
  nombreEmpresa: string;
  rol: 'admin' | 'jefe' | 'trabajador';
  jefeId?: string;
}

export function Database() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'resumen' | 'usuarios' | 'productos' | 'servicios' | 'ventas' | 'gastos' | 'combos' | 'produccion'>('resumen');
  const [showPasswords, setShowPasswords] = useState(false);
  const { price: dolarPrice } = useDolarPrice(60000);
  
  // Data states
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [servicios, setServicios] = useState<any[]>([]);
  const [ventas, setVentas] = useState<any[]>([]);
  const [gastos, setGastos] = useState<any[]>([]);
  const [combos, setCombos] = useState<any[]>([]);
  const [producciones, setProducciones] = useState<any[]>([]);

  useEffect(() => {
    const currentUser = sessionStorage.getItem('currentUser');
    if (currentUser) {
      setUser(JSON.parse(currentUser));
    }
    loadAllData();
  }, []);

  const loadAllData = async () => {
    const storedUser = sessionStorage.getItem('currentUser');
    if (!storedUser) return;
    const parsedUser = JSON.parse(storedUser);
    const ownerId = String(parsedUser.rol === 'trabajador' ? parsedUser.jefeId : parsedUser.id || '');

    // 1. Usuarios (Jefe ve sus trabajadores)
    try {
      if (parsedUser.rol === 'jefe') {
        const workers = await api.getTrabajadores(parsedUser.id);
        if (Array.isArray(workers)) setUsuarios(workers);
      } else if (parsedUser.rol === 'admin') {
        const allUsers = await api.getAllUsuarios();
        if (Array.isArray(allUsers)) setUsuarios(allUsers);
      }
    } catch (e) { console.error("Error cargando usuarios", e); }

    // 2. Inventario
    try {
      const inv = await api.getInventario(ownerId);
      if (inv.success) setProductos(inv.productos);
    } catch (e) { console.error("Error cargando inventario", e); }

    // 3. Servicios
    try {
      const serv = await api.getServicios(ownerId);
      if (serv.success) setServicios(serv.servicios);
    } catch (e) { console.error("Error cargando servicios", e); }

    // 4. Ventas
    try {
      const v = await api.getVentas(ownerId);
      if (v.success) setVentas(v.ventas);
    } catch (e) { console.error("Error cargando ventas", e); }

    // 5. Gastos
    try {
      const g = await api.getGastos(ownerId);
      if (Array.isArray(g)) setGastos(g);
      else if (g.success) setGastos(g.gastos);
    } catch (e) { console.error("Error cargando gastos", e); }

    // 6. Combos/Promociones
    try {
      const p = await api.getPromociones(ownerId);
      if (p.success) setCombos(p.promociones);
    } catch (e) { console.error("Error cargando promociones", e); }

    // 7. Producciones
    try {
      const prodRes = await api.getProducciones(ownerId);
      if (prodRes.success) setProducciones(prodRes.producciones);
    } catch (e) { console.error("Error cargando producciones", e); }
  };

  const exportData = () => {
    try {
      const XLSX = (window as any).XLSX || import('xlsx').then(m => m);
      
      // Función para ejecutar la exportación cuando la librería esté lista
      const executeExport = (xlsxLib: any) => {
        const wb = xlsxLib.utils.book_new();

        // Limpiar y aplanar datos para Excel
        const cleanUsers = usuarios.map(u => ({
          Usuario: u.usuario,
          Nombre: u.nombre,
          Apellido: u.apellido,
          Correo: u.correo,
          Empresa: u.nombreEmpresa,
          Fecha_Nacimiento: u.fechaNacimiento || ''
        }));

        const cleanProducts = productos.map(p => ({
          Nombre: p.nombre,
          Categoría: p.categoria,
          Tipo: p.tipo,
          Cantidad: p.cantidad,
          Unidad: p.unidadMedida,
          Costo: p.costoBolivares,
          Moneda_Costo: p.monedaCompra || 'Bs',
          Precio_Venta_USD: p.precioVentaDolares || 0,
          Moneda_Venta: p.monedaVenta || '$',
          Fecha_Registro: formatDate(p.fechaCreacion)
        }));

        const cleanServices = servicios.map(s => ({
          Nombre: s.nombreServicio,
          Costo: s.costoBolivares || 0,
          Venta: s.precioVenta || 0,
          Moneda_Venta: s.monedaVenta || '$',
          Categoría: s.categoria,
          Fecha: formatDate(s.fecha)
        }));

        const cleanCombos = combos.map(c => ({
          Nombre: c.nombre,
          Items: c.items?.map((i: any) => `${i.cantidad}x ${i.nombre}`).join(' + ') || '',
          Estado: c.activo ? 'Activo' : 'Inactivo',
          FechaInicio: c.fechaInicio,
          FechaFin: c.fechaFin
        }));

        const cleanVentas = ventas.map(v => ({
          Fecha: formatDate(v.fecha),
          Cliente: v.cliente?.nombre || 'General',
          Total: v.total,
          Moneda: v.moneda,
          Método_Pago: v.metodoPago,
          Tasa_Dólar: v.tasaDolar,
          Items: v.items?.map((i: any) => `${i.nombre} (${i.cantidad})`).join(', ')
        }));

        const cleanGastos = gastos.map(g => ({
          Fecha: formatDate(g.fecha),
          Descripción: g.descripcion,
          Monto: g.monto,
          Moneda: g.moneda,
          Categoría: g.categoria || '',
          Usuario: g.usuario
        }));

        const cleanProducciones = producciones.map(p => ({
          Fecha: formatDate(p.fecha),
          Servicio: p.servicioNombre,
          Cantidad: p.cantidadProducida,
          Insumos: p.insumosConsumidos?.map((i: any) => `${i.nombre} (${i.cantidad})`).join(', ') || ''
        }));

        // Crear hojas
        xlsxLib.utils.book_append_sheet(wb, xlsxLib.utils.json_to_sheet(cleanUsers), "Usuarios");
        xlsxLib.utils.book_append_sheet(wb, xlsxLib.utils.json_to_sheet(cleanProducts), "Inventario");
        xlsxLib.utils.book_append_sheet(wb, xlsxLib.utils.json_to_sheet(cleanServices), "Servicios");
        xlsxLib.utils.book_append_sheet(wb, xlsxLib.utils.json_to_sheet(cleanCombos), "Combos");
        xlsxLib.utils.book_append_sheet(wb, xlsxLib.utils.json_to_sheet(cleanVentas), "Ventas");
        xlsxLib.utils.book_append_sheet(wb, xlsxLib.utils.json_to_sheet(cleanGastos), "Gastos");
        xlsxLib.utils.book_append_sheet(wb, xlsxLib.utils.json_to_sheet(cleanProducciones), "Producciones");

        // Guardar archivo
        xlsxLib.writeFile(wb, `Reporte_Inventoria_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success('Reporte Excel generado exitosamente');
      };

      // Cargar dinámicamente o usar si ya está importado
      import('xlsx').then(xlsx => {
        executeExport(xlsx);
      }).catch(err => {
        toast.error('Error al cargar la librería de exportación');
        console.error(err);
      });

    } catch (error) {
      toast.error('Error al generar el archivo Excel');
      console.error(error);
    }
  };



  const formatPrice = (price: number) => {
    if (isNaN(price) || price === undefined || price === null) return "0,00";
    return new Intl.NumberFormat('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!user) {
    return null;
  }

  // --- Analíticas Computadas (Resumen) ---
  const safeDolarPrice = dolarPrice && dolarPrice > 0 ? dolarPrice : 60;

  // 1. Ingresos Reales (Ventas en Bs y $)
  const totalIngresosBsValue = ventas.reduce((sum, v) => {
    const total = parseFloat(v.total) || 0;
    const tasa = parseFloat(v.tasaDolar) || safeDolarPrice;
    return sum + (v.moneda === 'Bs' ? total : total * tasa);
  }, 0);

  // 2. Gastos Puros (Módulo Gastos)
  const totalGastosPurosBs = gastos.reduce((sum, g) => {
    const monto = parseFloat(g.monto) || 0;
    const esBs = g.moneda === 'bolivares' || g.moneda === 'Bs';
    return sum + (esBs ? monto : monto * safeDolarPrice);
  }, 0);
  
  // 3. Inversión en Inventario (Costo de Stock Actual)
  const costoInventarioBs = productos.reduce((sum, p) => {
    const cost = parseFloat(p.costoBolivares) || 0;
    const qty = parseFloat(p.cantidad) || 0;
    const esBs = p.monedaCompra === 'Bs' || !p.monedaCompra;
    const costInBs = esBs ? cost : cost * safeDolarPrice;
    return sum + (costInBs * qty);
  }, 0);
  
  const totalEgresosBs = totalGastosPurosBs + costoInventarioBs;

  // Calculo de Ganancia Neta Pura: (Ingresos - Costos) EXCLUSIVAMENTE de Productos y Servicios con Inventario
  let gananciaNetaBs = 0;
  ventas.forEach(venta => {
    const tasa = venta.tasaDolar || dolarPrice;
    
    venta.items?.forEach((item: any) => {
      // Ingreso de este item en la venta transformado a Bolívares
      const itemSubtotal = item.subtotal || (item.precioUnitario * item.cantidad) || (item.precio * item.cantidad) || 0;
      const ingresoItemBs = itemSubtotal * tasa;

      if (item.tipo === 'producto') {
        // Productos siempre suman a la ganancia neta
        const prod = productos.find(p => p.id === item.originalId);
        let costoItemBs = 0;
        if (prod) {
          const costoUdBs = prod.monedaCompra === 'Bs' ? prod.precioCompra : (prod.precioCompra * tasa);
          costoItemBs = costoUdBs * item.cantidad;
        }
        gananciaNetaBs += (ingresoItemBs - costoItemBs);

      } else if (item.tipo === 'servicio') {
        const serv = servicios.find(s => s.id === item.originalId);
        // Según lo solicitado: incluir Servicios en la ganancia neta SOLO SI usan inventario
        if (serv && serv.productosUsados && serv.productosUsados.length > 0) {
          const costoServBs = (serv.costo || 0) * tasa;
          const costoTotalServBs = costoServBs * item.cantidad;
          gananciaNetaBs += (ingresoItemBs - costoTotalServBs);
        }
        // Si no usa inventario, NO SUMA NINGÚN TIPO DE GANANCIA a la métrica.
      }
    });
  });

  const getTopProducts = () => {
    const counts: Record<string, { nombre: string, cantidad: number, ingresos: number }> = {};
    ventas.forEach(v => {
      v.items?.forEach((item: any) => {
        if (!counts[item.nombre]) {
          counts[item.nombre] = { nombre: item.nombre, cantidad: 0, ingresos: 0 };
        }
        const itemPrice = item.precioUnitario || item.precio || 0;
        counts[item.nombre].cantidad += (item.cantidad || 0);
        counts[item.nombre].ingresos += (itemPrice * (item.cantidad || 0)) * (v.moneda === 'Bs' ? 1 : (v.tasaDolar || safeDolarPrice));
      });
    });
    return Object.values(counts)
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10);
  };
  const topProducts = getTopProducts();

  const getGraphData = () => {
    const map = new Map();
    for(let i=6; i>=0; i--){
      const d = new Date();
      d.setDate(d.getDate() - i);
      map.set(d.toISOString().split('T')[0], { fecha: d.toLocaleDateString('es-VE', {weekday: 'short', day:'numeric'}), Ingresos: 0, Gastos: 0 });
    }
    ventas.forEach(v => {
      const dateStr = new Date(v.fecha).toISOString().split('T')[0];
      if(map.has(dateStr)) {
        const entry = map.get(dateStr);
        entry.Ingresos += v.moneda === 'Bs' ? v.total : (v.total * (v.tasaDolar || dolarPrice));
      }
    });
    gastos.forEach(g => {
      const dateStr = new Date(g.fecha).toISOString().split('T')[0];
      if(map.has(dateStr)) {
        const entry = map.get(dateStr);
        entry.Gastos += g.moneda === 'bolivares' ? g.monto : (g.monto * (g.tasaDolar || dolarPrice));
      }
    });
    productos.forEach(p => {
      if(p.fechaRegistro) {
        const dateStr = new Date(p.fechaRegistro).toISOString().split('T')[0];
        if(map.has(dateStr)) {
          const entry = map.get(dateStr);
          entry.Gastos += (p.precioCompra || 0) * (p.cantidad || 0);
        }
      }
    });
    return Array.from(map.values());
  };
  const graphData = getGraphData();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center py-3 sm:py-4 gap-2">
            <div className="flex-1 flex items-center gap-2 sm:gap-3 min-w-0 w-full sm:w-auto">
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="flex-shrink-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                  <DatabaseIcon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="font-semibold text-base sm:text-lg truncate">Reportes</h1>
                  <p className="text-xs sm:text-sm text-gray-500 truncate">{user.nombreEmpresa}</p>
                </div>
              </div>
            </div>
            <div className="flex-1 hidden md:flex justify-center">

            </div>
            <div className="flex-1 flex justify-end gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={exportData} size="sm" className="text-xs sm:text-sm flex-1 sm:flex-none">
                <Download className="mr-0 sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Exportar</span>
                <span className="sm:hidden">Export</span>
              </Button>


              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="bg-blue-600 hover:bg-blue-700 text-white border-2 border-blue-700 font-bold h-9 w-9 p-0 rounded-full flex-shrink-0 ml-2"
                  >
                    <UserIcon className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 border-2 border-gray-300">
                  <DropdownMenuLabel className="font-bold text-gray-900">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-bold">{user.nombre} {user.apellido}</p>
                      <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Rol: {user.rol || 'jefe'}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-gray-300" />
                  <DropdownMenuItem 
                    className="cursor-pointer font-semibold hover:bg-blue-50"
                    onClick={() => navigate('/perfil')}
                  >
                    <UserIcon className="mr-2 h-4 w-4 text-blue-600" />
                    <span>Perfil</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="cursor-pointer font-semibold hover:bg-purple-50"
                    onClick={() => navigate('/trabajadores')}
                  >
                    <UserCog className="mr-2 h-4 w-4 text-purple-600" />
                    <span>Trabajadores</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-gray-300" />
                  <DropdownMenuItem 
                    className="cursor-pointer font-semibold hover:bg-red-50 text-red-600"
                    onClick={() => {
                      sessionStorage.removeItem('currentUser');
                      toast.success('Sesión cerrada exitosamente');
                      navigate('/login');
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Cerrar Sesión</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <Card 
            className={`cursor-pointer transition-all ${activeTab === 'resumen' ? 'ring-2 ring-blue-500 bg-blue-50/50' : ''}`}
            onClick={() => setActiveTab('resumen')}
          >
            <CardHeader className="pb-3 p-4">
              <CardTitle className="text-xs font-bold text-blue-800 flex items-center justify-between">
                <span>Resumen</span>
                <Activity className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
          </Card>
          <Card 
            className={`cursor-pointer transition-all ${activeTab === 'usuarios' ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setActiveTab('usuarios')}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Usuarios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usuarios.length}</div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all ${activeTab === 'productos' ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setActiveTab('productos')}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4" />
                Productos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{productos.length}</div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all ${activeTab === 'servicios' ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setActiveTab('servicios')}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Servicios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{servicios.length}</div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all ${activeTab === 'ventas' ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setActiveTab('ventas')}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Ventas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ventas.length}</div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all ${activeTab === 'gastos' ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setActiveTab('gastos')}
          >
            <CardHeader className="pb-3 p-4">
              <CardTitle className="text-xs font-bold flex items-center justify-between">
                <span>Gastos</span>
                <Receipt className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
          </Card>

          <Card 
            className={`cursor-pointer transition-all ${activeTab === 'combos' ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setActiveTab('combos')}
          >
            <CardHeader className="pb-3 p-4">
              <CardTitle className="text-xs font-bold flex items-center justify-between">
                <span>Combos</span>
                <Layers className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{combos.length}</div>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-all ${activeTab === 'produccion' ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setActiveTab('produccion')}
          >
            <CardHeader className="pb-3 p-4">
              <CardTitle className="text-xs font-bold flex items-center justify-between">
                <span>Producción</span>
                <Save className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{producciones.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* CONTENIDO PRINCIPAL: RESUMEN ANALÍTICO vs TABLAS CRUD */}
        {activeTab === 'resumen' ? (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-gray-200 pb-2">Analítica y Ganancias</h2>
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-2 border-green-500 shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2 bg-green-50">
                  <CardTitle className="text-sm font-bold text-green-900">Total Ingresos (Ventas)</CardTitle>
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="text-2xl font-black text-green-700">Bs {formatPrice(totalIngresosBsValue)}</div>
                  <p className="text-sm font-bold text-gray-500 mt-1">$ {formatPrice(totalIngresosBsValue / safeDolarPrice)}</p>
                </CardContent>
              </Card>
              
              <Card className="border-2 border-orange-500 shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2 bg-orange-50">
                  <CardTitle className="text-sm font-bold text-orange-900">Inversión (Stock)</CardTitle>
                  <Package className="h-5 w-5 text-orange-600" />
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="text-2xl font-black text-orange-700">Bs {formatPrice(costoInventarioBs)}</div>
                  <p className="text-sm font-bold text-gray-500 mt-1">$ {formatPrice(costoInventarioBs / safeDolarPrice)}</p>
                  <p className="text-[10px] text-gray-500 mt-2 leading-tight">Valor total en inventario a costo de compra</p>
                </CardContent>
              </Card>

              <Card className="border-2 border-red-500 shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2 bg-red-50">
                  <CardTitle className="text-sm font-bold text-red-900">Total de Gastos</CardTitle>
                  <Receipt className="h-5 w-5 text-red-600" />
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="text-2xl font-black text-red-700">Bs {formatPrice(totalGastosPurosBs)}</div>
                  <p className="text-sm font-bold text-gray-500 mt-1">$ {formatPrice(totalGastosPurosBs / safeDolarPrice)}</p>
                  <p className="text-[10px] text-gray-500 mt-2 leading-tight">Total acumulado del módulo de Gastos</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Vistas Tabulares Compactas */}
              <div className="space-y-6">
                <Card className="border-2 border-gray-200">
                  <CardHeader className="bg-gray-50 border-b-2 border-gray-200">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <ListOrdered className="h-5 w-5 text-blue-600" />
                      Top 10 Productos Más Vendidos
                    </CardTitle>
                    <CardDescription>Ranking absoluto basado en la frecuencia de salidas</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead className="text-right">Unidades Vendidas</TableHead>
                          <TableHead className="text-right">Aporte (Bs)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topProducts.length === 0 ? (
                          <TableRow><TableCell colSpan={3} className="text-center py-4">No hay data suficiente</TableCell></TableRow>
                        ) : (
                          topProducts.map((p, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium text-blue-900 truncate max-w-xs">{idx + 1}. {p.nombre}</TableCell>
                              <TableCell className="text-right font-bold">{p.cantidad}</TableCell>
                              <TableCell className="text-right text-gray-600">Bs {formatPrice(p.ingresos)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 gap-6">
                <Card className="border-2 border-blue-200">
                  <CardHeader className="bg-blue-50 border-b-2 border-blue-200">
                    <CardTitle className="text-lg font-bold flex items-center gap-2 text-blue-900">
                      <Receipt className="h-5 w-5" />
                      Desglose de Ventas por Moneda
                    </CardTitle>
                    <CardDescription>Total cobrado sumado por dólares y bolívares</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-gray-500">Total liquidado en Bolívares</p>
                          <p className="text-3xl font-black text-blue-700">
                            Bs {formatPrice(ventas.filter(v => v.moneda === 'Bs').reduce((acc, v) => acc + (parseFloat(v.total) || 0), 0))}
                          </p>
                        </div>
                        <div className="bg-blue-100 p-3 rounded-full">
                          <Activity className="h-6 w-6 text-blue-600" />
                        </div>
                      </div>
                      <div className="border-t-2 border-gray-100"></div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-gray-500">Total liquidado en Dólares</p>
                          <p className="text-3xl font-black text-green-700">
                            $ {formatPrice(ventas.filter(v => v.moneda !== 'Bs').reduce((acc, v) => acc + (parseFloat(v.total) || 0), 0))}
                          </p>
                        </div>
                        <div className="bg-green-100 p-3 rounded-full">
                          <DollarSign className="h-6 w-6 text-green-600" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                </div>
              </div>

              {/* Graphic Performance */}
              <Card className="border-2 border-gray-200 lg:h-full">
                <CardHeader className="border-b-2 border-gray-200 bg-white">
                  <CardTitle className="text-lg font-bold">Rendimiento Últimos 7 Días (Bs)</CardTitle>
                  <CardDescription>Ingresos de ventas vs Gastos + Costo Inventario</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 min-h-96">
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={graphData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="fecha" tick={{fontSize: 12}} />
                      <YAxis tick={{fontSize: 12}} tickFormatter={(value) => `${value >= 1000 ? (value/1000).toFixed(1)+'k' : value}`} />
                      <RechartsTooltip formatter={(value: number) => `Bs ${formatPrice(value)}`} />
                      <Legend wrapperStyle={{paddingTop: '20px'}} />
                      <Bar dataKey="Ingresos" fill="#16a34a" radius={[4, 4, 0, 0]} name="Ventas (Bs)" />
                      <Bar dataKey="Gastos" fill="#dc2626" radius={[4, 4, 0, 0]} name="Egresos (Bs)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>
                {activeTab === 'usuarios' && 'Usuarios Registrados'}
                {activeTab === 'productos' && 'Productos en Inventario'}
                {activeTab === 'servicios' && 'Servicios Disponibles'}
                {activeTab === 'ventas' && 'Ventas Realizadas'}
                {activeTab === 'gastos' && 'Gastos Registrados'}
                {activeTab === 'combos' && 'Combos y Promociones'}
                {activeTab === 'produccion' && 'Historial de Producción'}
              </span>
              {activeTab === 'usuarios' && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowPasswords(!showPasswords)}
                >
                  {showPasswords ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                  {showPasswords ? 'Ocultar' : 'Mostrar'} Contraseñas
                </Button>
              )}
            </CardTitle>
            <CardDescription>
              Datos almacenados en localStorage del navegador
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Usuarios Table */}
            {activeTab === 'usuarios' && (
              <div className="overflow-x-auto">
                {usuarios.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500">No hay usuarios registrados</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuario</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Apellido</TableHead>
                        <TableHead>Correo</TableHead>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Fecha Nacimiento</TableHead>
                        {showPasswords && <TableHead>Contraseña</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usuarios.map((usuario, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{usuario.usuario}</TableCell>
                          <TableCell>{usuario.nombre}</TableCell>
                          <TableCell>{usuario.apellido}</TableCell>
                          <TableCell>{usuario.correo}</TableCell>
                          <TableCell>{usuario.nombreEmpresa}</TableCell>
                          <TableCell>
                            {usuario.fechaNacimiento 
                              ? new Date(usuario.fechaNacimiento).toLocaleDateString('es-VE')
                              : '-'
                            }
                          </TableCell>
                          {showPasswords && (
                            <TableCell className="font-mono text-sm">{usuario.contraseña}</TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}

            {/* Productos Table */}
            {activeTab === 'productos' && (
              <div className="overflow-x-auto">
                {productos.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500">No hay productos registrados</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Categoría</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Costo</TableHead>
                        <TableHead>Precio Venta</TableHead>
                        <TableHead>Registro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productos.map((producto, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{producto.nombre}</TableCell>
                          <TableCell>{producto.categoria}</TableCell>
                          <TableCell>{producto.cantidad} {producto.unidadMedida}</TableCell>
                          <TableCell>{producto.monedaCompra || 'Bs'} {formatPrice(producto.costoBolivares)}</TableCell>
                          <TableCell>{producto.monedaVenta || '$'} {formatPrice(producto.precioVentaDolares)}</TableCell>
                          <TableCell>{formatDate(producto.fechaCreacion)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}

            {/* Servicios Table */}
            {activeTab === 'servicios' && (
              <div className="overflow-x-auto">
                {servicios.length === 0 ? (
                  <div className="text-center py-8">
                    <Briefcase className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500">No hay servicios registrados</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Servicio</TableHead>
                        <TableHead>Categoría</TableHead>
                        <TableHead>Costo</TableHead>
                        <TableHead>Precio Venta</TableHead>
                        <TableHead>Fecha</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {servicios.map((servicio, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{servicio.nombreServicio}</TableCell>
                          <TableCell>{servicio.categoria || 'General'}</TableCell>
                          <TableCell>Bs {formatPrice(servicio.costoBolivares)}</TableCell>
                          <TableCell>{servicio.monedaVenta || '$'} {formatPrice(servicio.precioVenta)}</TableCell>
                          <TableCell>{formatDate(servicio.fecha)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}

            {/* Ventas Table */}
            {activeTab === 'ventas' && (
              <div className="overflow-x-auto">
                {ventas.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500">No hay ventas registradas</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Ítem</TableHead>
                        <TableHead>Cant.</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Pago</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ventas.map((venta, index) => (
                        <TableRow key={index}>
                          <TableCell>{formatDate(venta.fecha)}</TableCell>
                          <TableCell className="font-medium">{venta.producto}</TableCell>
                          <TableCell>{venta.cantidad}</TableCell>
                          <TableCell>{venta.moneda === 'Bs' ? 'Bs' : '$'} {formatPrice(venta.total)}</TableCell>
                          <TableCell>{venta.metodoPago || 'Efectivo'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}

            {/* Gastos Table */}
            {activeTab === 'gastos' && (
              <div className="overflow-x-auto">
                {gastos.length === 0 ? (
                  <div className="text-center py-8">
                    <Receipt className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500">No hay gastos registrados</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Categoría</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gastos.map((gasto, index) => (
                        <TableRow key={index}>
                          <TableCell>{formatDate(gasto.fecha)}</TableCell>
                          <TableCell className="font-medium">{gasto.descripcion}</TableCell>
                          <TableCell>{gasto.moneda === 'dolares' ? '$' : 'Bs'} {formatPrice(gasto.monto)}</TableCell>
                          <TableCell>{gasto.categoria || 'General'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}

            {/* Producciones Table */}
            {activeTab === 'produccion' && (
              <div className="overflow-x-auto">
                {producciones.length === 0 ? (
                  <div className="text-center py-8">
                    <Save className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500">No hay registros de producción</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Servicio Producido</TableHead>
                        <TableHead>Cant.</TableHead>
                        <TableHead>Materiales Consumidos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {producciones.map((prod, index) => (
                        <TableRow key={index}>
                          <TableCell className="text-xs">{formatDate(prod.fecha)}</TableCell>
                          <TableCell className="font-bold text-blue-900">{prod.servicioNombre}</TableCell>
                          <TableCell>
                            <span className="bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full text-xs">
                              +{prod.cantidadProducida}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {prod.insumosConsumidos?.map((it: any, idx: number) => (
                                <span key={idx} className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-100 italic">
                                  {it.cantidad}x {it.nombre}
                                </span>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        )}

      </main>
    </div>
  );
}