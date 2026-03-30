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
  const [activeTab, setActiveTab] = useState<'resumen' | 'usuarios' | 'productos' | 'servicios' | 'ventas' | 'gastos' | 'combos'>('resumen');
  const [showPasswords, setShowPasswords] = useState(false);
  const { price: dolarPrice } = useDolarPrice(60000);
  
  // Data states
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [servicios, setServicios] = useState<any[]>([]);
  const [ventas, setVentas] = useState<any[]>([]);
  const [gastos, setGastos] = useState<any[]>([]);
  const [combos, setCombos] = useState<any[]>([]);

  useEffect(() => {
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
      setUser(JSON.parse(currentUser));
    }
    loadAllData();
  }, []);

  const loadAllData = async () => {
    const storedUser = localStorage.getItem('currentUser');
    if (!storedUser) return;
    const parsedUser = JSON.parse(storedUser);
    const ownerId = String(parsedUser.rol === 'trabajador' ? parsedUser.jefeId : parsedUser.id || '');

    // Cargar usuarios desde la API
    try {
      const usersData = await api.getAllUsuarios();
      if (usersData && Array.isArray(usersData)) {
        // El Jefe solo ve a sus trabajadores
        if (parsedUser.rol === 'jefe') {
          setUsuarios(usersData.filter((u: any) => String(u.jefeId) === String(parsedUser.id)));
        } else if (parsedUser.rol === 'trabajador') {
          setUsuarios(usersData.filter((u: any) => String(u.jefeId) === String(parsedUser.jefeId) || String(u.id) === String(parsedUser.id)));
        } else {
          setUsuarios(usersData); // Admin ve todos
        }
      }
    } catch (error) {
      console.error("Error al cargar usuarios:", error);
      const localUsers = localStorage.getItem('users');
      if (localUsers) {
        const parsed = JSON.parse(localUsers);
        if (parsedUser.rol === 'jefe') {
          setUsuarios(parsed.filter((u: any) => String(u.jefeId) === String(parsedUser.id)));
        } else if (parsedUser.rol === 'trabajador') {
          setUsuarios(parsed.filter((u: any) => String(u.jefeId) === String(parsedUser.jefeId) || String(u.id) === String(parsedUser.id)));
        } else {
          setUsuarios(parsed);
        }
      }
    }

    // Cargar otros datos (Filtrados por dueño o huérfanos - STRING)
    const productsData = localStorage.getItem('products');
    if (productsData) {
      const all = JSON.parse(productsData);
      setProductos(all.filter((i: any) => String(i.usuarioId) === ownerId));
    }

    const servicesData = localStorage.getItem('services');
    if (servicesData) {
      const all = JSON.parse(servicesData);
      setServicios(all.filter((i: any) => String(i.usuarioId) === ownerId));
    }

    const salesData = localStorage.getItem('ventas');
    if (salesData) {
      const all = JSON.parse(salesData);
      setVentas(all.filter((i: any) => String(i.usuarioId) === ownerId));
    }

    const expensesData = localStorage.getItem('gastos');
    if (expensesData) {
      const all = JSON.parse(expensesData);
      setGastos(all.filter((i: any) => String(i.usuarioId) === ownerId));
    }

    const savedCombos = localStorage.getItem('combos');
    if (savedCombos) {
      const all = JSON.parse(savedCombos);
      setCombos(all.filter((i: any) => String(i.usuarioId) === ownerId));
    }
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
          Costo_Bs: p.precioCompra,
          Precio_Venta_USD: p.precioVenta || 0,
          Oferta: p.oferta?.activa ? `${p.oferta.valor}% OFF` : 'Ninguna',
          Fecha_Registro: formatDate(p.fechaRegistro)
        }));

        const cleanServices = servicios.map(s => ({
          Nombre: s.nombre,
          Descripción: s.descripcion,
          Costo_Bs: s.costo || 0,
          Precio_Venta_USD: s.precioVenta,
          Oferta: s.oferta?.activa ? `${s.oferta.valor}% OFF` : 'Ninguna',
          Categoría: s.categoria,
          Materiales_Usados: s.productosUsados?.length || 0,
          Fecha_Registro: formatDate(s.fechaRegistro || new Date().toISOString())
        }));

        const cleanCombos = combos.map(c => ({
          Nombre: c.nombre,
          Precio_Combo_USD: c.precioCombo,
          Items: c.items.map((i: any) => `${i.cantidad}x ${i.nombre}`).join(' + '),
          Ahorro_Estimado_USD: c.items.reduce((acc: number, i: any) => acc + (i.precioBase * i.cantidad), 0) - c.precioCombo,
          Estado: c.activa ? 'Activo' : 'Inactivo',
          Fecha: formatDate(c.fecha)
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

        // Crear hojas
        xlsxLib.utils.book_append_sheet(wb, xlsxLib.utils.json_to_sheet(cleanUsers), "Usuarios");
        xlsxLib.utils.book_append_sheet(wb, xlsxLib.utils.json_to_sheet(cleanProducts), "Inventario");
        xlsxLib.utils.book_append_sheet(wb, xlsxLib.utils.json_to_sheet(cleanServices), "Servicios");
        xlsxLib.utils.book_append_sheet(wb, xlsxLib.utils.json_to_sheet(cleanCombos), "Combos");
        xlsxLib.utils.book_append_sheet(wb, xlsxLib.utils.json_to_sheet(cleanVentas), "Ventas");
        xlsxLib.utils.book_append_sheet(wb, xlsxLib.utils.json_to_sheet(cleanGastos), "Gastos");

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
  const ventasBs = ventas.filter(v => v.moneda === 'Bs');
  const ventasUsd = ventas.filter(v => v.moneda !== 'Bs');
  const gastosBs = gastos.filter(g => g.moneda === 'bolivares');
  const gastosUsd = gastos.filter(g => g.moneda === 'dolares');

  const safeDolarPrice = dolarPrice && dolarPrice > 0 ? dolarPrice : 36.5;

  const totalIngresosBs = ventasBs.reduce((sum, v) => sum + (parseFloat(v.total) || 0), 0) + 
                          ventasUsd.reduce((sum, v) => sum + (parseFloat(v.total) || 0), 0) * safeDolarPrice;

  // Calculo real de gasto puro extra para la UI tarjeta central (opcional mantener para info)
  // 1. Gastos Mensuales (Luz, Agua, etc.)
  const totalGastosPurosBs = gastosBs.reduce((sum, g) => sum + (parseFloat(g.monto) || 0), 0) +
                             gastosUsd.reduce((sum, g) => sum + (parseFloat(g.monto) || 0), 0) * safeDolarPrice;
  
  // 2. Inversión en Inventario = SUMA(Stock Actual * Costo de Compra) de todos los productos
  const costoInventarioBs = productos.reduce((sum, p) => {
    const precioCompra = parseFloat(p.precioCompra) || 0;
    const stockActual = parseFloat(p.cantidad) || 0;
    
    // Normalizar detección de moneda
    const esBolivares = p.monedaCompra === 'Bs' || p.monedaCompra === 'bolivares';
    const costoBs = esBolivares ? precioCompra : precioCompra * safeDolarPrice;
    
    return sum + (costoBs * stockActual);
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
                      localStorage.removeItem('currentUser');
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
                  <div className="text-2xl font-black text-green-700">Bs {formatPrice(totalIngresosBs)}</div>
                  <p className="text-sm font-bold text-gray-500 mt-1">$ {formatPrice(totalIngresosBs / dolarPrice)}</p>
                </CardContent>
              </Card>
              
              <Card className="border-2 border-orange-500 shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2 bg-orange-50">
                  <CardTitle className="text-sm font-bold text-orange-900">Total de Costos</CardTitle>
                  <Package className="h-5 w-5 text-orange-600" />
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="text-2xl font-black text-orange-700">Bs {formatPrice(costoInventarioBs)}</div>
                  <p className="text-sm font-bold text-gray-500 mt-1">$ {formatPrice(costoInventarioBs / dolarPrice)}</p>
                  <p className="text-[10px] text-gray-500 mt-2 leading-tight">Total gastado en inventario (Stock actual y vendido)</p>
                </CardContent>
              </Card>

              <Card className="border-2 border-red-500 shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2 bg-red-50">
                  <CardTitle className="text-sm font-bold text-red-900">Total de Gastos</CardTitle>
                  <Receipt className="h-5 w-5 text-red-600" />
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="text-2xl font-black text-red-700">Bs {formatPrice(totalGastosPurosBs)}</div>
                  <p className="text-sm font-bold text-gray-500 mt-1">$ {formatPrice(totalGastosPurosBs / dolarPrice)}</p>
                  <p className="text-[10px] text-gray-500 mt-2 leading-tight">Total proveniente del módulo de Gastos</p>
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
                  <Card className="border-2 border-blue-200 h-full">
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
                              Bs {formatPrice(ventasBs.reduce((acc, v) => acc + (v.total || 0), 0))}
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
                              $ {formatPrice(ventasUsd.reduce((acc, v) => acc + (v.total || 0), 0))}
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
                        <TableHead>P. Venta ($)</TableHead>
                        <TableHead>Oferta</TableHead>
                        <TableHead>Inversión (Bs)</TableHead>
                        <TableHead>Fecha</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productos.map((producto) => {
                        const esBolivares = producto.monedaCompra === 'Bs' || producto.monedaCompra === 'bolivares';
                        const costoUnitarioBs = esBolivares ? (producto.precioCompra || 0) : (producto.precioCompra || 0) * safeDolarPrice;
                        return (
                          <TableRow key={producto.id}>
                            <TableCell className="font-medium text-blue-900">{producto.nombre}</TableCell>
                            <TableCell>{producto.categoria}</TableCell>
                            <TableCell>{producto.cantidad} {producto.unidadMedida}</TableCell>
                            <TableCell>$ {formatPrice(producto.precioVenta || 0)}</TableCell>
                            <TableCell>
                              {producto.oferta?.activa ? (
                                <span className="bg-rose-500 text-white px-2 py-0.5 rounded-full text-[10px] font-black border border-rose-600 shadow-sm animate-pulse">
                                  {producto.oferta.valor}% OFF
                                </span>
                              ) : (
                                <span className="text-gray-300">-</span>
                              )}
                            </TableCell>
                            <TableCell>Bs {formatPrice(costoUnitarioBs * producto.cantidad)}</TableCell>
                            <TableCell className="text-xs text-gray-400">
                              {formatDate(producto.fechaRegistro)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
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
                        <TableHead>Nombre</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead>P. Venta ($)</TableHead>
                        <TableHead>Oferta</TableHead>
                        <TableHead>Costo (Bs)</TableHead>
                        <TableHead>Usos</TableHead>
                        <TableHead>Fecha</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {servicios.map((servicio) => (
                        <TableRow key={servicio.id}>
                          <TableCell className="font-medium text-purple-900">{servicio.nombre}</TableCell>
                          <TableCell className="max-w-xs truncate text-xs text-gray-500 font-medium italic">{servicio.descripcion}</TableCell>
                          <TableCell className="font-bold text-gray-900">$ {formatPrice(servicio.precioVenta)}</TableCell>
                          <TableCell>
                            {servicio.oferta?.activa ? (
                              <span className="bg-rose-500 text-white px-2 py-0.5 rounded-full text-[10px] font-black border border-rose-600 shadow-sm animate-pulse">
                                {servicio.oferta.valor}% OFF
                              </span>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </TableCell>
                          <TableCell>Bs {formatPrice(servicio.costo || 0)}</TableCell>
                          <TableCell className="text-center font-bold">{servicio.cantidadPrestados || 0}</TableCell>
                          <TableCell className="text-[10px] text-gray-400">
                            {formatDate(servicio.fechaRegistro || new Date().toISOString())}
                          </TableCell>
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
                        <TableHead>Cliente</TableHead>
                        <TableHead>Cant. Artículos</TableHead>
                        <TableHead>Moneda</TableHead>
                        <TableHead>Total Neto</TableHead>
                        <TableHead>Método de Cobro</TableHead>
                        <TableHead>Precio Dólar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ventas.map((venta) => {
                        const getMetodoPagoLabel = (metodo: string) => {
                          const labels: { [key: string]: string } = {
                            'efectivo_dolares': 'Efectivo',
                            'efectivo_bolivares': 'Efectivo',
                            'tarjeta_bolivares': 'Punto Venta',
                            'pago_movil_bolivares': 'Pago Móvil',
                          };
                          return labels[metodo] || metodo;
                        };
                        return (
                          <TableRow key={venta.id}>
                            <TableCell className="text-sm">
                              {formatDate(venta.fecha)}
                            </TableCell>
                            <TableCell className="font-medium text-gray-700">{venta.cliente?.nombre || 'General'}</TableCell>
                            <TableCell className="text-center font-bold">{venta.items?.length || 0}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded text-xs font-bold ${venta.moneda === '$' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                                {venta.moneda === '$' ? 'Dólares ($)' : 'Bolívares (Bs)'}
                              </span>
                            </TableCell>
                            <TableCell className={`font-black ${venta.moneda === '$' ? 'text-green-700' : 'text-blue-700'}`}>
                              {venta.moneda === '$' ? '$' : 'Bs'} {formatPrice(venta.total)}
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">{getMetodoPagoLabel(venta.metodoPago)}</TableCell>
                            <TableCell className="text-xs text-gray-500 font-medium">Bs {formatPrice(venta.tasaDolar)}</TableCell>
                          </TableRow>
                        );
                      })}
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
                        <TableHead>Monto (Bs)</TableHead>
                        <TableHead>Monto ($)</TableHead>
                        <TableHead>Usuario</TableHead>
                        <TableHead>Tasa Bs/$</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gastos.map((gasto) => (
                        <TableRow key={gasto.id}>
                          <TableCell className="text-sm">
                            {formatDate(gasto.fecha)}
                          </TableCell>
                          <TableCell className="max-w-xs">{gasto.descripcion}</TableCell>
                          <TableCell>Bs {formatPrice(gasto.monto)}</TableCell>
                          <TableCell>$ {formatPrice(gasto.monto / gasto.tasaDolar)}</TableCell>
                          <TableCell>{gasto.usuario}</TableCell>
                          <TableCell>{formatPrice(gasto.tasaDolar)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}

            {/* Combos Table */}
            {activeTab === 'combos' && (
              <div className="overflow-x-auto">
                {combos.length === 0 ? (
                  <div className="text-center py-8">
                    <Layers className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500">No hay combos registrados</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre del Combo</TableHead>
                        <TableHead>Contenido</TableHead>
                        <TableHead className="text-right">Precio ($)</TableHead>
                        <TableHead className="text-right">Ahorro ($)</TableHead>
                        <TableHead className="text-center">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {combos.map((combo, index) => {
                        const regPrice = combo.items.reduce((acc: number, i: any) => acc + (i.precioBase * i.cantidad), 0);
                        const ahorro = regPrice - combo.precioCombo;
                        return (
                          <TableRow key={index}>
                            <TableCell className="font-bold text-blue-900">{combo.nombre}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {combo.items.map((it: any, idx: number) => (
                                  <span key={idx} className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                                    {it.cantidad}x {it.nombre}
                                  </span>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-black text-green-700">$ {formatPrice(combo.precioCombo)}</TableCell>
                            <TableCell className="text-right text-rose-600 font-medium">$ {formatPrice(ahorro)}</TableCell>
                            <TableCell className="text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${combo.activa ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                                {combo.activa ? 'ACTIVO' : 'INACTIVO'}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
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