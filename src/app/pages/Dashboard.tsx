import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { 
  LogOut, 
  Package, 
  ShoppingCart, 
  DollarSign, 
  TrendingUp,
  Users,
  FileText,
  Database as DatabaseIcon,
  User as UserIcon,
  UserCog,
  Tag,
  Star,
  Layers,
  CreditCard
} from "lucide-react";
import { toast } from "sonner";
import { DolarPriceWidget } from "../components/DolarPriceWidget";
import { useDolarPrice } from "../hooks/useDolarPrice";
import * as api from "../../utils/api";

interface User {
  usuario: string;
  nombre: string;
  apellido: string;
  correo: string;
  nombreEmpresa: string;
  rol: 'admin' | 'jefe' | 'subjefe' | 'trabajador';
  tipoUsuario?: 'admin' | 'jefe' | 'subjefe' | 'trabajador';
  fechaExpiracion?: string;
  jefeId?: string;
}

interface Product {
  id: string;
  nombre: string;
  descripcion: string;
  cantidad: number;
  precioCompra: number;
  precioVenta?: number;
  categoria: string;
  tipo: 'venta' | 'servicio';
  fechaRegistro: string;
}

interface Service {
  id: string;
  nombre: string;
  descripcion: string;
  costo: number;
  precioVenta: number;
  categoria: string;
  cantidadPrestados: number;
  fechaRegistro: string;
  productosUsados: {
    productoId: string;
    productoNombre: string;
    cantidad: number;
  }[];
}

export function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalServices, setTotalServices] = useState(0);
  const [totalVentasBs, setTotalVentasBs] = useState(0);
  const [totalVentasUsd, setTotalVentasUsd] = useState(0);
  const [totalGastos, setTotalGastos] = useState(0);
  const [totalInventarioValue, setTotalInventarioValue] = useState(0); // Sale value in USD
  const [totalInventarioCost, setTotalInventarioCost] = useState(0); // Investment in Bs
  const [totalPromociones, setTotalPromociones] = useState(0);
  const [totalOfertas, setTotalOfertas] = useState(0);
  const { price: dolarPrice } = useDolarPrice(60000);

  useEffect(() => {
    const storedUser = sessionStorage.getItem('currentUser');
    if (!storedUser) {
      navigate('/login');
      return;
    }
    
    const parsedUser = JSON.parse(storedUser);
    
    // Inicializar estado inmediatamente para evitar pantalla en blanco
    setUser(parsedUser);

    if (parsedUser.rol === 'admin') {
      navigate('/admin-panel');
      return;
    }

    const syncProfile = async () => {
      try {
        // Usar getUsuarioById en lugar de getAllUsuarios para evitar 403 (No admin)
        const res = await api.getUsuarioById(parsedUser.id);
        if (res.success && res.user) {
          const dbUser = res.user;
          const updated = { 
            ...parsedUser, 
            ...dbUser, 
            rol: dbUser.tipoUsuario || 'jefe',
            limiteProductos: Number(dbUser.limiteProductos),
            limiteServicios: Number(dbUser.limiteServicios),
            limiteCombos: Number(dbUser.limiteCombos)
          };
          sessionStorage.setItem('currentUser', JSON.stringify(updated));
          setUser(updated);
        }
      } catch (e) { 
        // Sync failed silently
      }
    };
    syncProfile();
    
    const userRole = parsedUser.rol || parsedUser.tipoUsuario;
    const ownerId = String((userRole === 'trabajador' || userRole === 'subjefe') ? parsedUser.jefeId : parsedUser.id || '');

    // Cargar Inventario
    api.getInventario(ownerId).then(res => {
      if (res.success) {
        setTotalProducts(res.productos.length);
        
        let saleValueUsd = 0;
        let investmentBs = 0;
        const currentSafePrice = dolarPrice || 1;

        res.productos.forEach((p: any) => {
          const qty = parseFloat(p.cantidad) || 0;
          const cost = parseFloat(p.costoBolivares) || 0;
          const price = parseFloat(p.precioVentaDolares) || 0;
          const mCompra = p.monedaCompra || 'Bs';
          const mVenta = p.monedaVenta || '$';

          // Calculo de Inversión (Costo)
          if (mCompra === 'Bs') investmentBs += (qty * cost);
          else investmentBs += (qty * (cost * currentSafePrice));

          // Calculo de Valor de Venta
          if (mVenta === '$') saleValueUsd += (qty * price);
          else saleValueUsd += (qty * (price / currentSafePrice));
        });

        setTotalInventarioValue(saleValueUsd);
        setTotalInventarioCost(investmentBs);
      }
    });

    // Cargar Servicios
    api.getServicios(ownerId).then(res => {
      if (res.success) {
        setTotalServices(res.servicios.length);
      }
    });

    // Cargar Ventas
    api.getVentas(ownerId).then(res => {
      if (res.success) {
        let sumBs = 0;
        let sumUsd = 0;
        const currentSafeDolarPrice = dolarPrice || 1;
        
        res.ventas.forEach((venta: any) => {
          const total = parseFloat(venta.total) || 0;
          // Asumimos que total en DB está en la moneda de la venta. 
          // Si no hay campo 'moneda' en DB 'ventas', asumimos Dólares o Bolívares según lógica.
          // En database_schema.sql, la tabla 'ventas' no tiene columna 'moneda'.
          // Asumiremos que el 'total' es el monto final en la moneda que se guardó.
          // Por simplicidad, trataremos todo como USD si no se especifica.
          sumUsd += total;
          sumBs += total * currentSafeDolarPrice;
        });
        setTotalVentasBs(sumBs);
        setTotalVentasUsd(sumUsd);
      }
    });

    // Cargar Gastos
    api.getGastos(ownerId).then(res => {
      if (res.success) {
        const total = res.gastos.reduce((acc: number, gasto: any) => acc + (parseFloat(gasto.monto) || 0), 0);
        setTotalGastos(total);
      }
    });

    // Cargar Promociones
    api.getPromociones(ownerId).then(res => {
      if (res.success) {
        setTotalPromociones(res.promociones.length);
        setTotalOfertas(res.promociones.filter((p: any) => p.activo).length);
      }
    });
  }, [navigate, dolarPrice]);

  const handleLogout = () => {
    sessionStorage.removeItem('currentUser');
    toast.success('Sesión cerrada exitosamente');
    navigate('/login');
  };

  if (!user) {
    return null;
  }

  const formatPrice = (price: number) => {
    if (isNaN(price) || price === undefined || price === null) return "0,00";
    return new Intl.NumberFormat('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const modules = [
    {
      title: "Inventario",
      description: "Gestiona tus productos y stock",
      icon: Package,
      color: "bg-gradient-to-br from-blue-500 to-blue-600",
      hoverColor: "hover:from-blue-600 hover:to-blue-700",
      stats: `${totalProducts} producto${totalProducts !== 1 ? 's' : ''}`,
      borderColor: "border-blue-500",
    },
    {
      title: "Ventas",
      description: "Registra y consulta ventas",
      icon: ShoppingCart,
      color: "bg-gradient-to-br from-green-500 to-emerald-600",
      hoverColor: "hover:from-green-600 hover:to-emerald-700",
      stats: `Bs ${formatPrice(totalVentasBs + (totalVentasUsd * dolarPrice))}`,
      borderColor: "border-green-500",
    },
    {
      title: "Servicios",
      description: "Gestiona tus servicios",
      icon: Users,
      color: "bg-gradient-to-br from-purple-500 to-violet-600",
      hoverColor: "hover:from-purple-600 hover:to-violet-700",
      stats: `${totalServices} servicio${totalServices !== 1 ? 's' : ''}`,
      borderColor: "border-purple-500",
    },
    {
      title: "Producción",
      description: "Gestiona lotes y materiales",
      icon: Layers,
      color: "bg-gradient-to-br from-indigo-500 to-indigo-600",
      hoverColor: "hover:from-indigo-600 hover:to-indigo-700",
      stats: "Historial de producción",
      borderColor: "border-indigo-500",
      path: "/produccion"
    },
    {
      title: "Gastos",
      description: "Registra gastos de la empresa",
      icon: DollarSign,
      color: "bg-gradient-to-br from-red-500 to-rose-600",
      hoverColor: "hover:from-red-600 hover:to-rose-700",
      stats: `Bs ${formatPrice(totalGastos)}`,
      borderColor: "border-red-500",
    },
    {
      title: "Reportes",
      description: "Consulta y exporta informes",
      icon: FileText,
      color: "bg-gradient-to-br from-indigo-500 to-blue-600",
      hoverColor: "hover:from-indigo-600 hover:to-blue-700",
      stats: "Ver reportes",
      borderColor: "border-indigo-500",
    },
    {
      title: "Ofertas",
      description: "Descuentos individuales",
      icon: Tag,
      color: "bg-gradient-to-br from-pink-500 to-rose-600",
      hoverColor: "hover:from-pink-600 hover:to-rose-700",
      stats: `${totalOfertas} oferta${totalOfertas !== 1 ? 's' : ''} activa${totalOfertas !== 1 ? 's' : ''}`,
      borderColor: "border-pink-500",
    },
    {
      title: "Promociones",
      description: "Combos y Paquetes",
      icon: Layers,
      color: "bg-gradient-to-br from-indigo-500 to-blue-600",
      hoverColor: "hover:from-indigo-600 hover:to-blue-700",
      stats: `${totalPromociones} combo${totalPromociones !== 1 ? 's' : ''}`,
      borderColor: "border-indigo-500",
    },
    {
      title: "Suscripción",
      description: "Aumenta tus límites",
      icon: CreditCard,
      color: "bg-gradient-to-br from-purple-600 to-pink-700",
      hoverColor: "hover:from-purple-700 hover:to-pink-800",
      stats: "Mejorar plan",
      borderColor: "border-purple-600",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b-4 border-blue-600 shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">INVENTORIA</h1>
                <p className="text-sm text-gray-600 font-semibold">{user.nombreEmpresa}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Precio del Dólar */}
              <Card className="border-2 border-green-600 bg-green-50 shadow-md">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-xs font-bold text-green-800">Tasa del Día</p>
                      <p className="text-base font-bold text-green-900">Bs {formatPrice(dolarPrice)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* User Menu Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="bg-blue-600 hover:bg-blue-700 text-white border-2 border-blue-700 font-bold h-10 w-10 p-0 rounded-full shadow-md">
                    <UserIcon className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 border-2 border-gray-100 shadow-xl rounded-2xl p-2">
                  <DropdownMenuLabel className="font-bold p-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">{user.nombre} {user.apellido}</span>
                      <span className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">{user.rol || 'jefe'}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-gray-100" />
                  <DropdownMenuItem onClick={() => navigate('/perfil')} className="rounded-xl cursor-pointer py-2.5">
                    <UserIcon className="mr-2 h-4 w-4 text-blue-500" /> Perfil
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/trabajadores')} className="rounded-xl cursor-pointer py-2.5">
                    <UserCog className="mr-2 h-4 w-4 text-purple-500" /> Trabajadores
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-gray-100" />
                  <DropdownMenuItem onClick={() => { sessionStorage.removeItem('currentUser'); navigate('/login'); }} className="text-red-600 rounded-xl cursor-pointer py-2.5">
                    <LogOut className="mr-2 h-4 w-4" /> Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Bienvenido, {user.nombre}
          </h2>
          <p className="text-gray-600">
            Sistema de gestión de inventario y contabilidad para {user.nombreEmpresa}
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-2 border-blue-500 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b-2 border-blue-500">
              <CardTitle className="text-sm font-bold">
                Total Inventario
              </CardTitle>
              <Package className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-black text-blue-800 uppercase tracking-tighter">Inversión (Costo)</p>
                  <p className="text-lg font-bold text-blue-700 leading-none">Bs {formatPrice(totalInventarioCost)}</p>
                  <p className="text-[10px] text-gray-500 font-bold">$ {formatPrice(totalInventarioCost / dolarPrice)}</p>
                </div>
                <div className="border-t border-blue-100 pt-2">
                  <p className="text-xs font-black text-green-800 uppercase tracking-tighter">Valor de Venta</p>
                  <p className="text-lg font-bold text-green-700 leading-none">$ {formatPrice(totalInventarioValue)}</p>
                  <p className="text-[10px] text-gray-500 font-bold">Bs {formatPrice(totalInventarioValue * dolarPrice)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-500 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b-2 border-green-500">
              <CardTitle className="text-sm font-bold">
                Ventas del Mes
              </CardTitle>
              <DollarSign className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-xl sm:text-2xl font-bold text-green-600">Bs {formatPrice(totalVentasBs + (totalVentasUsd * dolarPrice))}</div>
              <p className="text-sm text-gray-600 font-bold mt-1">
                $ {formatPrice((totalVentasBs / dolarPrice) + totalVentasUsd)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-500 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b-2 border-purple-500">
              <CardTitle className="text-sm font-bold">
                Total de Servicios
              </CardTitle>
              <Users className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-purple-600">{totalServices} servicios</div>
            </CardContent>
          </Card>
        </div>

        {/* Modules Grid */}
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-4 border-l-4 border-blue-600 pl-3">Módulos del Sistema</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((module, index) => {
              const Icon = module.icon;
              return (
                <Card 
                  key={index} 
                  className={`hover:shadow-xl transition-all cursor-pointer border-2 ${module.borderColor} hover:scale-105`}
                  onClick={() => {
                    if (module.path) {
                      navigate(module.path);
                    } else if (module.title === "Inventario") {
                      navigate('/inventario');
                    } else if (module.title === "Servicios") {
                      navigate('/servicios');
                    } else if (module.title === "Ventas") {
                      navigate('/ventas');
                    } else if (module.title === "Gastos") {
                      navigate('/gastos');
                    } else if (module.title === "Reportes") {
                      navigate('/database');
                    } else if (module.title === "Promociones") {
                      navigate('/promociones');
                    } else if (module.title === "Ofertas") {
                      navigate('/ofertas');
                    } else if (module.title === "Suscripción") {
                      navigate('/suscripcion');
                    } else {
                      toast.info(`Módulo "${module.title}" próximamente`);
                    }
                  }}
                >
                  <CardHeader className={`border-b-2 ${module.borderColor}`}>
                    <div className="flex items-center gap-3">
                      <div className={`${module.color} ${module.hoverColor} p-3 rounded-lg border-2 ${module.borderColor}`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold">{module.title}</CardTitle>
                        <CardDescription className="text-sm font-semibold">
                          {module.stats}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <p className="text-sm text-gray-700 font-medium">{module.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

      </main>
    </div>
  );
}