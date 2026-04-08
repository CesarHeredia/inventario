import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  ArrowLeft,
  Plus,
  ShoppingCart,
  Trash2,
  DollarSign,
  User as UserIcon,
  Building2,
  CreditCard,
  Smartphone,
  Banknote,
  Save,
  X,
  RotateCcw,
  Package,
  Search,
  LogOut,
  Tag,
  Star,
  Layers,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useDolarPrice } from "../hooks/useDolarPrice";
import * as api from "../../utils/api";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

interface Product {
  id: string;
  nombre: string;
  descripcion: string;
  cantidad: number;
  unidadMedida: 'unidad' | 'paquete' | 'kilo';
  precioCompra: number;
  precioVenta?: number;
  categoria: string;
  tipo: 'venta' | 'servicio';
  fechaRegistro: string;
  oferta?: {
    tipo: '2x1' | 'descuento' | 'precio_fijo';
    valor: number;
    activa: boolean;
  };
}

interface Service {
  id: string;
  nombre: string;
  descripcion: string;
  costo: number;
  precioVenta: number;
  categoria: string;
  cantidad: number;
  fechaRegistro: string;
  productosUsados: {
    productoId: string;
    productoNombre: string;
    cantidad: number;
  }[];
  oferta?: {
    tipo: '2x1' | 'descuento' | 'precio_fijo';
    valor: number;
    activa: boolean;
  };
}

interface CartItem {
  id: string;
  nombre: string;
  tipo: 'producto' | 'servicio' | 'combo';
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  originalId: string; // ID del producto/servicio original o combo
}

interface Combo {
  id: string;
  nombre: string;
  items: {
    id: string;
    nombre: string;
    tipo: 'venta' | 'servicio';
    cantidad: number;
    precioBase: number;
  }[];
  precioCombo: number;
  activa: boolean;
}

interface Sale {
  id: string;
  items: CartItem[];
  subtotal: number;
  iva: number;
  total: number;
  moneda?: '$' | 'Bs';
  metodoPago: 'efectivo_dolares' | 'efectivo_bolivares' | 'tarjeta_bolivares' | 'pago_movil_bolivares';
  cliente?: {
    nombre?: string;
    telefono?: string;
    email?: string;
  };
  fecha: string;
  usuario: string;
  tasaDolar: number;
  usuarioId: string; // ID del Jefe dueño
}

interface User {
  id?: string;
  usuario: string;
  nombre: string;
  apellido: string;
  nombreEmpresa: string;
  rol: 'admin' | 'jefe' | 'subjefe' | 'trabajador';
  jefeId?: string;
}

export function Ventas() {
  const navigate = useNavigate();
  const { price: dolarPrice } = useDolarPrice(60000);
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [comboSearch, setComboSearch] = useState("");
  
  // Dialog states
  const [isAddServiceDialogOpen, setIsAddServiceDialogOpen] = useState(false);
  const [isCheckoutDialogOpen, setIsCheckoutDialogOpen] = useState(false);
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  
  // Form states
  const [serviceForm, setServiceForm] = useState({
    descripcion: "",
    precio: "",
  });
  
  const [checkoutForm, setCheckoutForm] = useState({
    clienteNombre: "",
    clienteTelefono: "",
    clienteEmail: "",
    metodoPago: 'efectivo_dolares' as 'efectivo_dolares' | 'efectivo_bolivares' | 'tarjeta_bolivares' | 'pago_movil_bolivares',
  });

  const [selectedSaleForRefund, setSelectedSaleForRefund] = useState<Sale | null>(null);

  // Search states
  const [productSearch, setProductSearch] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (!storedUser) {
      navigate('/login');
      return;
    }
    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);
    const ownerId = String((parsedUser.rol === 'trabajador' || parsedUser.rol === 'subjefe') ? parsedUser.jefeId : parsedUser.id || '');

    // Cargar productos de MySQL
    api.getInventario(ownerId).then(res => {
      if (res.success) {
        setProducts(res.productos.filter((p: any) => p.tipo === 'venta' && parseFloat(p.cantidad) > 0).map((p: any) => ({
          ...p,
          id: String(p.id),
          cantidad: parseFloat(p.cantidad),
          precioVenta: p.precioVentaDolares ? parseFloat(p.precioVentaDolares) : 0,
          usuarioId: String(p.usuarioId)
        })));
      }
    });

    // Cargar servicios de MySQL
    api.getServicios(ownerId).then(res => {
      if (res.success) {
        setServices(res.servicios.map((s: any) => {
          let price = parseFloat(s.precioVenta) || 0;
          
          // Si el precio está en Bs, lo convertimos a $ para el estado interno de Ventas.tsx
          if (s.monedaVenta === 'Bs' && dolarPrice > 0) {
            price = price / dolarPrice;
          }
          
          return {
            ...s,
            id: String(s.id),
            nombre: s.nombreServicio,
            precioVenta: price,
            usuarioId: String(s.usuarioId)
          };
        }));
      }
    });

    // Cargar ventas de MySQL
    api.getVentas(ownerId).then(res => {
      if (res.success) {
        setSales(res.ventas.map((v: any) => ({
          ...v,
          id: String(v.id),
          total: parseFloat(v.total),
          usuarioId: String(v.usuarioId)
        })));
      }
    });

    // Cargar combos de localStorage (no hay tabla MySQL para esto aún)
    const savedCombos = localStorage.getItem('combos');
    if (savedCombos) {
      const allCombos = JSON.parse(savedCombos);
      setCombos(allCombos.filter((c: any) => String(c.usuarioId) === ownerId && c.activa));
    }
  }, [navigate, dolarPrice]);

  const refreshData = () => {
    const ownerId = String((user?.rol === 'trabajador' || user?.rol === 'subjefe') ? user?.jefeId : user?.id || '');
    api.getInventario(ownerId).then(res => {
        if (res.success) {
            setProducts(res.productos.filter((p: any) => p.tipo === 'venta' && parseFloat(p.cantidad) > 0).map((p: any) => ({
                ...p, id: String(p.id), cantidad: parseFloat(p.cantidad), precioVenta: p.precioVentaDolares ? parseFloat(p.precioVentaDolares) : 0
            })));
        }
    });
    api.getServicios(ownerId).then(res => {
        if (res.success) {
            setServices(res.servicios.map((s: any) => ({
                id: String(s.id),
                nombre: s.nombreServicio,
                descripcion: s.descripcion || "",
                costo: parseFloat(s.costoBolivares),
                precioVenta: s.precioVenta ? parseFloat(s.precioVenta) : 0,
                categoria: s.categoria || "Gral",
                cantidad: parseInt(s.cantidad || 0),
                fechaRegistro: s.fecha,
                productosUsados: []
            })));
        }
    });
    api.getVentas(ownerId).then(res => {
        if (res.success) {
            setSales(res.ventas.map((v: any) => ({ ...v, id: String(v.id), total: parseFloat(v.total) })));
        }
    });
  };

  const addProductToCart = (product: Product) => {
    const existingItem = cart.find(item => item.originalId === product.id && item.tipo === 'producto');
    
    if (existingItem) {
      // Verificar que no exceda el stock
      if (existingItem.cantidad + 1 > product.cantidad) {
        toast.error('No hay suficiente stock disponible');
        return;
      }
      setCart(cart.map(item => 
        item.id === existingItem.id 
          ? calculateItemTotal({ ...item, cantidad: item.cantidad + 1 })
          : item
      ));
    } else {
      const newItem: CartItem = calculateItemTotal({
        id: `cart-${Date.now()}-${Math.random()}`,
        nombre: product.nombre,
        tipo: 'producto',
        cantidad: 1,
        precioUnitario: product.precioVenta || 0,
        subtotal: product.precioVenta || 0,
        originalId: product.id,
      });
      setCart([...cart, newItem]);
    }
    toast.success(`${product.nombre} agregado al carrito`);
  };

  const addServiceToCart = (service: Service) => {
    const existingItem = cart.find(item => item.originalId === service.id && item.tipo === 'servicio');
    
    if (existingItem) {
      setCart(cart.map(item => 
        item.id === existingItem.id 
          ? calculateItemTotal({ ...item, cantidad: item.cantidad + 1 })
          : item
      ));
    } else {
      const newItem: CartItem = calculateItemTotal({
        id: `cart-${Date.now()}-${Math.random()}`,
        nombre: service.nombre,
        tipo: 'servicio',
        cantidad: 1,
        precioUnitario: service.precioVenta,
        subtotal: service.precioVenta,
        originalId: service.id,
      });
      setCart([...cart, newItem]);
    }
    toast.success(`${service.nombre} añadido al carrito`);
  };

  const addComboToCart = (combo: Combo) => {
    const existingItem = cart.find(item => item.originalId === combo.id && item.tipo === 'combo');
    
    let newCart;
    if (existingItem) {
      newCart = cart.map(item => 
        (item.originalId === combo.id && item.tipo === 'combo')
          ? { ...item, cantidad: item.cantidad + 1, subtotal: (item.cantidad + 1) * item.precioUnitario }
          : item
      );
    } else {
      const newItem: CartItem = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        nombre: `[COMBO] ${combo.nombre}`,
        tipo: 'combo',
        cantidad: 1,
        precioUnitario: combo.precioCombo,
        subtotal: combo.precioCombo,
        originalId: combo.id
      };
      newCart = [...cart, newItem];
    }
    
    setCart(newCart);
    toast.success(`Combo ${combo.nombre} añadido`);
  };

  const handleAddQuickService = (e: React.FormEvent) => {
    e.preventDefault();
    
    const quickService: CartItem = {
      id: `cart-${Date.now()}-${Math.random()}`,
      nombre: serviceForm.descripcion,
      tipo: 'servicio',
      cantidad: 1,
      precioUnitario: parseFloat(serviceForm.precio),
      subtotal: parseFloat(serviceForm.precio),
      originalId: `quick-${Date.now()}`,
    };
    
    setCart([...cart, quickService]);
    toast.success('Servicio agregado al carrito');
    setServiceForm({ descripcion: "", precio: "" });
    setIsAddServiceDialogOpen(false);
  };

  const updateCartItemQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeFromCart(itemId);
      return;
    }

    const item = cart.find(i => i.id === itemId);
    if (item && item.tipo === 'producto') {
      // Verificar stock Producto
      const product = products.find(p => p.id === item.originalId);
      if (product && newQuantity > product.cantidad) {
        toast.error('No hay suficiente stock de producto disponible');
        return;
      }
    } else if (item && item.tipo === 'servicio') {
      // Verificar stock Servicio
      const service = services.find(s => s.id === item.originalId);
      if (service && newQuantity > service.cantidad) {
        toast.error('No hay suficiente stock de servicio disponible');
        return;
      }
    }

    setCart(cart.map(item => 
      item.id === itemId 
        ? calculateItemTotal({ ...item, cantidad: newQuantity })
        : item
    ));
  };

  // Helper function to calculate totals with promotions
  const calculateItemTotal = (item: CartItem): CartItem => {
    if (item.tipo === 'combo') {
      return { ...item, subtotal: item.cantidad * item.precioUnitario };
    }

    const originalItem = item.tipo === 'producto' 
      ? products.find(p => p.id === item.originalId)
      : services.find(s => s.id === item.originalId);

    const oferta = originalItem?.oferta;
    
    if (!oferta || !oferta.activa) {
      return { ...item, subtotal: item.cantidad * item.precioUnitario };
    }

    let subtotal = 0;
    if (oferta.tipo === '2x1') {
      const freeItems = Math.floor(item.cantidad / 2);
      const paidQuantity = item.cantidad - freeItems;
      subtotal = paidQuantity * item.precioUnitario;
    } else if (oferta.tipo === 'descuento') {
      const discountedPrice = item.precioUnitario * (1 - (oferta.valor / 100));
      subtotal = item.cantidad * discountedPrice;
    } else if (oferta.tipo === 'precio_fijo') {
      subtotal = item.cantidad * oferta.valor;
    } else {
      subtotal = item.cantidad * item.precioUnitario;
    }

    return { ...item, subtotal };
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId));
    toast.success('Producto eliminado del carrito');
  };

  const clearCart = () => {
    setCart([]);
    toast.success('Carrito vaciado');
  };

  const handleProcessSale = (e: React.FormEvent) => {
    e.preventDefault();

    if (!checkoutForm.metodoPago) {
      toast.error('Selecciona un método de pago');
      return;
    }

    const appliesIVA = checkoutForm.metodoPago === 'tarjeta_bolivares';
    const ownerId = String((user?.rol === 'trabajador' || user?.rol === 'subjefe') ? user?.jefeId : user?.id || '');
    
    // Registrar cada producto vendido individualmente en la tabla de ventas
    const salePromises = cart.map(item => {
      const itemSubtotal = item.subtotal;
      const itemIva = appliesIVA ? itemSubtotal * 0.16 : 0;
      const itemTotal = itemSubtotal + itemIva;
      
      return api.addVenta({
        usuarioId: ownerId,
        producto: item.nombre,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        subtotal: itemSubtotal,
        iva: itemIva,
        total: itemTotal,
        metodoPago: checkoutForm.metodoPago,
        fecha: new Date().toISOString()
      });
    });

    Promise.all(salePromises).then(() => {
      // Actualizar inventario (restar stock en la base de datos)
      const updatePromises: Promise<any>[] = [];
      cart.forEach(item => {
        if (item.tipo === 'producto') {
          const product = products.find(p => p.id === item.originalId);
          if (product) {
            const newCantidad = product.cantidad - item.cantidad;
            updatePromises.push(api.updateProducto(product.id, { cantidad: newCantidad }));
          }
        } else if (item.tipo === 'servicio') {
          const service = services.find(s => s.id === item.originalId);
          if (service) {
            const newCantidad = service.cantidad - item.cantidad;
            updatePromises.push(api.updateServicio(service.id, { ...service, cantidad: newCantidad }));
          }
        }
      });

      return Promise.all(updatePromises);
    }).then(() => {
      toast.success('Venta procesada exitosamente');
      refreshData();
      setCart([]);
      setCheckoutForm({
        clienteNombre: "",
        clienteTelefono: "",
        clienteEmail: "",
        metodoPago: 'efectivo_dolares' as any,
      });
      setIsCheckoutDialogOpen(false);
    }).catch(error => {
      console.error("Error al procesar venta:", error);
      toast.error('Error al procesar la venta en el servidor');
    });
  };

  const handleRefund = (sale: Sale) => {
    if (!confirm('¿Estás seguro de realizar este reembolso? Se restaurará el inventario.')) {
      return;
    }

    // Restaurar el inventario para productos
    const updatePromises = sale.items.map(item => {
      if (item.tipo === 'producto') {
        const product = products.find(p => p.id === item.originalId);
        if (product) {
          const newCantidad = product.cantidad + item.cantidad;
          return api.updateProducto(product.id, newCantidad);
        }
      }
      return Promise.resolve();
    });

    Promise.all(updatePromises)
      .then(() => {
        toast.success('Reembolso procesado exitosamente');
        refreshData();
        setIsRefundDialogOpen(false);
        setSelectedSaleForRefund(null);
      })
      .catch(error => {
        console.error("Error al procesar reembolso:", error);
        toast.error('Error al procesar el reembolso');
      });
  };

  const cartTotal = cart.reduce((acc, item) => acc + item.subtotal, 0);
  const cartTotalBs = cartTotal * dolarPrice;

  const formatPrice = (price: number) => {
    if (isNaN(price) || price === undefined || price === null) return "0,00";
    return new Intl.NumberFormat('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const getMetodoPagoLabel = (metodo: string) => {
    const labels: { [key: string]: string } = {
      'efectivo_dolares': 'Efectivo en $',
      'efectivo_bolivares': 'Efectivo en Bs',
      'tarjeta_bolivares': 'Tarjeta Bs',
      'pago_movil_bolivares': 'Pago Móvil Bs',
    };
    return labels[metodo] || metodo;
  };

  const getMetodoPagoIcon = (metodo: string) => {
    switch(metodo) {
      case 'efectivo_dolares':
        return <DollarSign className="h-4 w-4" />;
      case 'efectivo_bolivares':
        return <Banknote className="h-4 w-4" />;
      case 'tarjeta_bolivares':
        return <CreditCard className="h-4 w-4" />;
      case 'pago_movil_bolivares':
        return <Smartphone className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center py-3 sm:py-4 gap-2">
            <div className="flex-1 flex items-center gap-2 sm:gap-3 min-w-0 w-full sm:w-auto">
              {user.rol !== 'trabajador' && (
                <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="flex-shrink-0">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                  <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="font-semibold text-base sm:text-lg truncate">Ventas</h1>
                  <p className="text-xs sm:text-sm text-gray-500 truncate">{user.nombreEmpresa}</p>
                </div>
              </div>
            </div>
            <div className="flex-1 hidden md:flex justify-center">

            </div>
            <div className="flex-1 flex justify-end gap-2 w-full sm:w-auto">
              <Button 
                variant="outline" 
                onClick={() => setIsRefundDialogOpen(true)}
                disabled={sales.length === 0}
                size="sm"
                className="text-xs sm:text-sm flex-1 sm:flex-none"
              >
                <RotateCcw className="mr-0 sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Reembolso</span>
                <span className="sm:hidden">Reemb.</span>
              </Button>
              <Button onClick={() => setIsAddServiceDialogOpen(true)} size="sm" className="text-xs sm:text-sm flex-1 sm:flex-none">
                <Plus className="mr-0 sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Servicio Rápido</span>
                <span className="sm:hidden">Servicio</span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="bg-blue-600 hover:bg-blue-700 text-white border-2 border-blue-700 font-bold h-9 w-9 p-0 rounded-full flex-shrink-0 ml-2 sm:ml-4"
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Productos y Servicios */}
          <div className="lg:col-span-2 space-y-6">
            {/* Productos */}
            <Card>
              <CardHeader>
                <CardTitle>Productos Disponibles</CardTitle>
                <CardDescription>
                  Selecciona productos para agregar a la venta
                </CardDescription>
                {/* Buscador de productos */}
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Buscar productos..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {products.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500">No hay productos disponibles para venta</p>
                  </div>
                ) : (
                  <>
                    {products.filter(product => 
                      product.nombre.toLowerCase().includes(productSearch.toLowerCase()) ||
                      product.descripcion.toLowerCase().includes(productSearch.toLowerCase()) ||
                      product.categoria.toLowerCase().includes(productSearch.toLowerCase())
                    ).length === 0 ? (
                      <div className="text-center py-8">
                        <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-gray-500">No se encontraron productos</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {products
                          .filter(product => 
                            product.nombre.toLowerCase().includes(productSearch.toLowerCase()) ||
                            product.descripcion.toLowerCase().includes(productSearch.toLowerCase()) ||
                            product.categoria.toLowerCase().includes(productSearch.toLowerCase())
                          )
                          .map((product) => (
                          <div
                            key={product.id}
                            className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors cursor-pointer"
                            onClick={() => addProductToCart(product)}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h3 className="font-semibold text-gray-900">{product.nombre}</h3>
                                <p className="text-sm text-gray-500">{product.categoria}</p>
                                {product.oferta?.activa && product.oferta.tipo === 'descuento' && (
                                  <span className="ml-2 text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full font-bold">
                                    {product.oferta.valor}% OFF
                                  </span>
                                )}
                              </div>
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                {product.cantidad} {product.unidadMedida}{product.cantidad !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-3">{product.descripcion}</p>
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-lg font-bold text-green-600">$ {formatPrice(product.precioVenta || 0)}</p>
                                <p className="text-xs text-gray-500">Bs {formatPrice((product.precioVenta || 0) * dolarPrice)}</p>
                              </div>
                              <Button size="sm" onClick={() => addProductToCart(product)}>
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Promociones (Combos) */}
            <Card className="border-indigo-200 bg-indigo-50/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-indigo-600" />
                  Promociones y Combos
                </CardTitle>
                <CardDescription>
                  Paquetes especiales con descuento
                </CardDescription>
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Buscar combos..."
                    value={comboSearch}
                    onChange={(e) => setComboSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {combos.length === 0 ? (
                  <div className="text-center py-8">
                    <Layers className="mx-auto h-10 w-10 text-gray-300 mb-4" />
                    <p className="text-gray-400 text-sm">No hay combos promocionales activos</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {combos
                      .filter(c => c.nombre.toLowerCase().includes(comboSearch.toLowerCase()))
                      .map((combo) => (
                      <div
                        key={combo.id}
                        className="bg-white border-2 border-indigo-100 rounded-xl p-4 hover:border-indigo-500 transition-all cursor-pointer shadow-sm relative overflow-hidden group"
                        onClick={() => addComboToCart(combo)}
                      >
                        <div className="absolute top-0 right-0 bg-indigo-600 text-white px-2 py-1 text-[10px] font-bold uppercase rounded-bl-lg">
                          Combo
                        </div>
                        <h3 className="font-bold text-indigo-900 group-hover:text-indigo-600 transition-colors uppercase text-sm mb-2">{combo.nombre}</h3>
                        <div className="space-y-1 mb-3">
                          {combo.items.map((it, idx) => (
                            <p key={idx} className="text-[10px] text-gray-500 flex items-center gap-1">
                              <CheckCircle className="h-2.5 w-2.5 text-green-500" /> {it.cantidad}x {it.nombre}
                            </p>
                          ))}
                        </div>
                        <div className="flex justify-between items-center mt-2 border-t pt-2 border-indigo-50">
                          <div>
                            <p className="text-lg font-black text-indigo-700">$ {formatPrice(combo.precioCombo)}</p>
                            <p className="text-[10px] text-gray-400 line-through">Reg. $ {formatPrice(combo.items.reduce((acc, i) => acc + (i.precioBase * i.cantidad), 0))}</p>
                          </div>
                          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 h-8 w-8 p-0">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Servicios */}
            <Card>
              <CardHeader>
                <CardTitle>Servicios Disponibles</CardTitle>
                <CardDescription>
                  Servicios predefinidos
                </CardDescription>
                {/* Buscador de servicios */}
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Buscar servicios..."
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {services.length === 0 ? (
                  <div className="text-center py-8">
                    <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500">No hay servicios disponibles</p>
                  </div>
                ) : (
                  <>
                    {services.filter(service => 
                      service.nombre.toLowerCase().includes(serviceSearch.toLowerCase()) ||
                      service.descripcion.toLowerCase().includes(serviceSearch.toLowerCase())
                    ).length === 0 ? (
                      <div className="text-center py-8">
                        <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-gray-500">No se encontraron servicios</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {services
                          .filter(service => 
                            service.nombre.toLowerCase().includes(serviceSearch.toLowerCase()) ||
                            service.descripcion.toLowerCase().includes(serviceSearch.toLowerCase())
                          )
                          .map((service) => (
                          <div
                            key={service.id}
                            className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors cursor-pointer"
                            onClick={() => {
                              if (service.cantidad <= 0) {
                                toast.error('No hay stock disponible de este servicio');
                                return;
                              }
                              addServiceToCart(service);
                            }}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h3 className="font-semibold text-gray-900">{service.nombre}</h3>
                                <div className="text-[10px] uppercase font-bold text-blue-600">Disp: {service.cantidad} unid.</div>
                              </div>
                              {service.oferta?.activa && service.oferta.tipo === 'descuento' && (
                                <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full font-bold">
                                  {service.oferta.valor}% OFF
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-3">{service.descripcion}</p>
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-lg font-bold text-green-600">$ {formatPrice(service.precioVenta)}</p>
                                <p className="text-xs text-gray-500">Bs {formatPrice(service.precioVenta * dolarPrice)}</p>
                              </div>
                              <Button 
                                size="sm" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (service.cantidad <= 0) {
                                    toast.error('No hay stock disponible de este servicio');
                                    return;
                                  }
                                  addServiceToCart(service);
                                }}
                                disabled={service.cantidad <= 0}
                                className={service.cantidad <= 0 ? 'opacity-50 grayscale' : ''}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Historial de Ventas */}
            <Card>
              <CardHeader>
                <CardTitle>Historial de Ventas</CardTitle>
                <CardDescription>
                  Registro de las ventas realizadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {sales.length === 0 ? (
                  <div className="text-center py-8">
                    <RotateCcw className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500">No hay ventas registradas</p>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto pr-2 space-y-3">
                    {sales.slice().reverse().map((sale) => (
                      <div key={sale.id} className="border border-gray-200 rounded-lg p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:border-blue-500 transition-colors gap-2">
                        <div>
                          <p className="font-semibold text-sm">
                            {new Date(sale.fecha).toLocaleDateString('es-VE', {
                              day: '2-digit', month: '2-digit', year: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                          <div className="text-xs text-gray-500 flex flex-col mt-1">
                            <span>Usuario: <span className="font-medium text-gray-700">{sale.usuario || 'N/A'}</span></span>
                            <span>Cliente: <span className="font-medium text-gray-700">{sale.cliente?.nombre || 'General'}</span></span>
                            <span className="flex items-center gap-1 mt-1">
                              Método: {getMetodoPagoIcon(sale.metodoPago)} <span className="font-medium text-gray-700">{getMetodoPagoLabel(sale.metodoPago)}</span>
                            </span>
                          </div>
                        </div>
                        <div className="text-left sm:text-right">
                          {sale.moneda === 'Bs' ? (
                            <>
                              <p className="text-sm font-bold text-green-600">Bs {formatPrice(sale.total)}</p>
                              <p className="text-xs text-gray-500">$ {formatPrice(sale.total / sale.tasaDolar)}</p>
                            </>
                          ) : (
                            <>
                              <p className="text-sm font-bold text-green-600">$ {formatPrice(sale.total)}</p>
                              <p className="text-xs text-gray-500">Bs {formatPrice(sale.total * sale.tasaDolar)}</p>
                            </>
                          )}
                          <p className="text-xs font-medium text-blue-600 mt-1">{sale.items.length} item(s)</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Carrito */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Carrito de Venta</span>
                  {cart.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearCart}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </CardTitle>
                <CardDescription>
                  {cart.length} {cart.length === 1 ? 'item' : 'items'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {cart.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500">El carrito está vacío</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                      {cart.map((item) => (
                        <div key={item.id} className="border border-gray-200 rounded-lg p-3">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <h4 className="font-semibold text-sm">{item.nombre}</h4>
                              <p className="text-xs text-gray-500">
                                {item.tipo === 'producto' ? 'Producto' : 'Servicio'}
                              </p>
                              {(()=>{
                                const original = item.tipo === 'producto' 
                                  ? products.find(p => p.id === item.originalId)
                                  : services.find(s => s.id === item.originalId);
                                
                                if (original?.oferta?.activa) {
                                  return (
                                    <div className="mt-1">
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-100 text-pink-700">
                                        <Tag className="h-3 w-3" />
                                        Oferta: {original.oferta.tipo === '2x1' ? '2x1' : original.oferta.tipo === 'descuento' ? `${original.oferta.valor}%` : `$ ${original.oferta.valor}`}
                                      </span>
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFromCart(item.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateCartItemQuantity(item.id, item.cantidad - 1)}
                              >
                                -
                              </Button>
                              <span className="text-sm font-medium w-8 text-center">{item.cantidad}</span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateCartItemQuantity(item.id, item.cantidad + 1)}
                              >
                                +
                              </Button>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold">$ {formatPrice(item.subtotal)}</p>
                              <p className="text-xs text-gray-500">Bs {formatPrice(item.subtotal * dolarPrice)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-gray-200 pt-4 space-y-2">
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Subtotal:</span>
                          <span>$ {formatPrice(cartTotal)}</span>
                        </div>
                      </div>
                      <div className="border-t border-gray-200 pt-2"></div>
                      <p className="text-xs text-gray-500 text-center italic mb-2">
                        IVA aplicado según método de pago en checkout
                      </p>
                      <div className="flex justify-between items-center text-lg font-bold">
                        <span>Total Ref:</span>
                        <div className="text-right">
                          <p className="text-green-600">$ {formatPrice(cartTotal)}</p>
                          <p className="text-sm text-gray-500 font-normal">Bs {formatPrice(cartTotal * dolarPrice)}</p>
                        </div>
                      </div>
                      <Button 
                        className="w-full" 
                        size="lg"
                        onClick={() => setIsCheckoutDialogOpen(true)}
                      >
                        <Save className="mr-2 h-4 w-4" />
                        Procesar Venta
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Dialog: Agregar Servicio Rápido */}
      <Dialog open={isAddServiceDialogOpen} onOpenChange={setIsAddServiceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Servicio Rápido</DialogTitle>
            <DialogDescription>
              Agrega un servicio personalizado a la venta actual
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddQuickService}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción del Servicio *</Label>
                <Input
                  id="descripcion"
                  placeholder="Ej: Instalación de sistema"
                  value={serviceForm.descripcion}
                  onChange={(e) => setServiceForm({ ...serviceForm, descripcion: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="precio">Precio ($) *</Label>
                <Input
                  id="precio"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="50.00"
                  value={serviceForm.precio}
                  onChange={(e) => setServiceForm({ ...serviceForm, precio: e.target.value })}
                  required
                />
                {serviceForm.precio && (
                  <p className="text-sm text-gray-500">
                    Equivalente: Bs {formatPrice(parseFloat(serviceForm.precio) * dolarPrice)}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsAddServiceDialogOpen(false);
                  setServiceForm({ descripcion: "", precio: "" });
                }}
              >
                Cancelar
              </Button>
              <Button type="submit">
                <Plus className="mr-2 h-4 w-4" />
                Agregar al Carrito
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Checkout */}
      <Dialog open={isCheckoutDialogOpen} onOpenChange={setIsCheckoutDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Finalizar Venta</DialogTitle>
            <DialogDescription>
              Completa los datos de la venta
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleProcessSale}>
            <div className="grid gap-4 py-4">
              {/* Datos del Cliente (Opcionales) */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <UserIcon className="h-4 w-4 text-blue-600" />
                  <h3 className="font-semibold text-blue-900">Datos del Cliente (Opcional)</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="clienteNombre">Nombre</Label>
                    <Input
                      id="clienteNombre"
                      placeholder="Juan Pérez"
                      value={checkoutForm.clienteNombre}
                      onChange={(e) => setCheckoutForm({ ...checkoutForm, clienteNombre: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clienteTelefono">Teléfono</Label>
                    <Input
                      id="clienteTelefono"
                      placeholder="0414-1234567"
                      value={checkoutForm.clienteTelefono}
                      onChange={(e) => setCheckoutForm({ ...checkoutForm, clienteTelefono: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="clienteEmail">Email</Label>
                    <Input
                      id="clienteEmail"
                      type="email"
                      placeholder="cliente@email.com"
                      value={checkoutForm.clienteEmail}
                      onChange={(e) => setCheckoutForm({ ...checkoutForm, clienteEmail: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Método de Pago */}
              <div className="space-y-2">
                <Label htmlFor="metodoPago">Método de Pago *</Label>
                <select
                  id="metodoPago"
                  value={checkoutForm.metodoPago}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, metodoPago: e.target.value as any })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="efectivo_dolares">💵 Efectivo en $</option>
                  <option value="efectivo_bolivares">💵 Efectivo en Bs</option>
                  <option value="tarjeta_bolivares">💳 Tarjeta Bs</option>
                  <option value="pago_movil_bolivares">📱 Pago Móvil Bs</option>
                </select>
              </div>

              {/* Resumen de la Venta */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold mb-3">Resumen de la Venta</h3>
                <div className="space-y-2 mb-3">
                  {cart.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>{item.nombre} x{item.cantidad}</span>
                      <span className="font-medium">$ {formatPrice(item.subtotal)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-300 pt-3 space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal:</span>
                    <span>$ {formatPrice(cartTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>IVA (16%):</span>
                    <span>{checkoutForm.metodoPago === 'tarjeta_bolivares' ? `$ ${formatPrice(cartTotal * 0.16)}` : 'Exento'}</span>
                  </div>
                  <div className="border-t border-gray-300 pt-2"></div>
                  {(()=>{
                    const appliesIVA = checkoutForm.metodoPago === 'tarjeta_bolivares';
                    const iva = appliesIVA ? cartTotal * 0.16 : 0;
                    const finalUsd = cartTotal + iva;
                    return (
                      <div className="flex justify-between items-center text-lg font-bold">
                        <span>Total:</span>
                        <div className="text-right">
                          <p className="text-green-600">$ {formatPrice(finalUsd)}</p>
                          <p className="text-sm text-gray-500 font-normal">Bs {formatPrice(finalUsd * dolarPrice)}</p>
                        </div>
                      </div>
                    )
                  })()}
                  <p className="text-xs text-gray-500 mt-2">
                    Tasa: 1$ = Bs {formatPrice(dolarPrice)}
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsCheckoutDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                <Save className="mr-2 h-4 w-4" />
                Confirmar Venta
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Reembolsos */}
      <Dialog open={isRefundDialogOpen} onOpenChange={setIsRefundDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gestión de Reembolsos</DialogTitle>
            <DialogDescription>
              Selecciona una venta para procesar el reembolso
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {sales.length === 0 ? (
              <div className="text-center py-8">
                <RotateCcw className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500">No hay ventas registradas</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Método Pago</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-center">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>
                        {new Date(sale.fecha).toLocaleDateString('es-VE', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell>
                        {sale.cliente?.nombre || 'Sin nombre'}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {sale.items.map((item, idx) => (
                            <div key={idx}>
                              {item.nombre} x{item.cantidad}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getMetodoPagoIcon(sale.metodoPago)}
                          <span className="text-sm">{getMetodoPagoLabel(sale.metodoPago)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {sale.moneda === 'Bs' ? (
                          <div>
                            <p>Bs {formatPrice(sale.total)}</p>
                            <p className="text-xs text-gray-500">$ {formatPrice(sale.total / sale.tasaDolar)}</p>
                          </div>
                        ) : (
                          <div>
                            <p>$ {formatPrice(sale.total)}</p>
                            <p className="text-xs text-gray-500">Bs {formatPrice(sale.total * sale.tasaDolar)}</p>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedSaleForRefund(sale);
                            handleRefund(sale);
                          }}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Reembolsar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRefundDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}