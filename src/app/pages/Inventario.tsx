import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { 
  Package, 
  Plus, 
  ArrowLeft, 
  Search, 
  Edit, 
  Trash2, 
  Building2, 
  X, 
  LogOut, 
  User as UserIcon, 
  UserCog, 
  Save as SaveIcon, 
  DollarSign, 
  TrendingUp,
  History,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Filter,
  Calendar,
  ListOrdered,
  ShoppingCart,
  Briefcase
} from "lucide-react";
import { Separator } from "../components/ui/separator";
import { toast } from "sonner";
import { useDolarPrice } from "../hooks/useDolarPrice";
import * as api from "../../utils/api";

interface Product {
  id: string;
  nombre: string;
  descripcion: string;
  cantidad: number;
  unidadMedida: 'unidad' | 'paquete' | 'kilo';
  precioCompra: number;
  monedaCompra: '$' | 'Bs';
  precioVenta?: number;
  monedaVenta?: '$' | 'Bs';
  categoria: string;
  tipo: 'venta' | 'servicio';
  fechaRegistro: string;
  usuarioId: string; // ID del Jefe dueño
  oferta?: {
    tipo: '2x1' | 'descuento' | 'precio_fijo';
    valor: number;
    activa: boolean;
  };
}

interface User {
  id?: string;
  usuario: string;
  nombre: string;
  apellido: string;
  nombreEmpresa: string;
  rol: 'admin' | 'jefe' | 'subjefe' | 'trabajador';
  tipoUsuario?: 'jefe' | 'subjefe' | 'trabajador';
  limiteProductos: number;
  limiteServicios: number;
  limiteCombos: number;
  fechaExpiracion?: string;
  jefeId?: string;
}

export function Inventario() {
  const navigate = useNavigate();
  const { price: dolarPrice } = useDolarPrice(60000); // Actualiza cada 60 segundos
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isNewProduct, setIsNewProduct] = useState(true);
  const [selectedExistingProduct, setSelectedExistingProduct] = useState<string>("");
  
  // Package math state
  const [unidadesPorPaquete, setUnidadesPorPaquete] = useState("");
  const [cantidadPaquetes, setCantidadPaquetes] = useState("");
  const [precioPaquete, setPrecioPaquete] = useState("");
  // Navigation and Tabs
  const [activeTab, setActiveTab] = useState<'lista' | 'historial'>('lista');
  
  // History State
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [isHistorialLoading, setIsHistorialLoading] = useState(false);

  // Loss Dialog State
  const [isLossDialogOpen, setIsLossDialogOpen] = useState(false);
  const [lossData, setLossData] = useState({
    productoId: "",
    cantidad: "",
    descripcion: ""
  });

  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    cantidad: "",
    cantidadAgregar: "",
    precioCompra: "",
    precioVenta: "",
    categoria: "",
    tipo: 'venta' as 'venta' | 'servicio',
    unidadMedida: 'unidad' as 'unidad' | 'paquete' | 'kilo',
    monedaCompra: 'Bs' as '$' | 'Bs',
    monedaVenta: '$' as '$' | 'Bs'
  });
  useEffect(() => {
    const storedUser = sessionStorage.getItem('currentUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    if (user) {
      refreshInventory();
      refreshMovimientos();
    }
  }, [user]);

  const refreshInventory = () => {
    const ownerId = String((user?.rol === 'trabajador' || user?.rol === 'subjefe') ? user?.jefeId : user?.id || '');
    if (!ownerId) return;
    
    api.getInventario(ownerId)
      .then(response => {
        if (response.success) {
          const mappedProducts = response.productos.map((p: any) => ({
            id: String(p.id),
            nombre: p.nombre,
            descripcion: p.descripcion || "",
            cantidad: parseFloat(p.cantidad),
            unidadMedida: p.unidadMedida,
            precioCompra: parseFloat(p.costoBolivares),
            monedaCompra: p.monedaCompra || 'Bs',
            precioVenta: p.precioVentaDolares ? parseFloat(p.precioVentaDolares) : undefined,
            monedaVenta: p.monedaVenta || '$',
            categoria: p.categoria || "General",
            tipo: p.tipo,
            fechaRegistro: p.fechaCreacion,
            usuarioId: String(p.usuarioId)
          }));
          setProducts(mappedProducts);
        }
      });
  };

  const refreshMovimientos = () => {
    const ownerId = String((user?.rol === 'trabajador' || user?.rol === 'subjefe') ? user?.jefeId : user?.id || '');
    if (!ownerId) return;

    setIsHistorialLoading(true);
    api.getMovimientos(ownerId)
      .then(res => {
        if (res.success) setMovimientos(res.movimientos);
      })
      .finally(() => setIsHistorialLoading(false));
  };

  useEffect(() => {
    if (activeTab === 'historial') {
      refreshMovimientos();
    }
  }, [activeTab]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isNewProduct && selectedExistingProduct) {
      const existingProduct = products.find(p => p.id === selectedExistingProduct);
      if (existingProduct) {
        let totalToAdd = 0;
        
        if (formData.unidadMedida === 'paquete') {
          const cPaq = parseFloat(cantidadPaquetes || "0");
          const uPaq = parseFloat(unidadesPorPaquete || "1");
          totalToAdd = cPaq * uPaq;
        } else {
          totalToAdd = parseFloat(formData.cantidadAgregar || "0");
        }

        // Validar que totalToAdd no sea absurdo o NaN
        if (isNaN(totalToAdd) || totalToAdd <= 0) {
          toast.error("Por favor ingresa una cantidad válida");
          return;
        }

        const newCantidad = existingProduct.cantidad + totalToAdd;
        api.updateProducto(existingProduct.id, { cantidad: newCantidad })
          .then(() => {
            toast.success(`Stock actualizado exitosamente para ${existingProduct.nombre}`);
            refreshInventory();
            resetForm();
            setIsDialogOpen(false);
          })
          .catch(() => toast.error("Error al actualizar stock"));
        
        return;
      }
    }

    // VALIDACIÓN DE LÍMITES
    if (isNewProduct && !editingProduct) {
      const currentLimit = user?.limiteProductos || 20;
      if (products.length >= currentLimit) {
        toast.error(`Has alcanzado el límite de ${currentLimit} productos. ¡Mejora tu plan para agregar más!`);
        return;
      }
    }

    // Validaciones de longitud
    if (formData.nombre.length > 100 || formData.categoria.length > 100 || formData.descripcion.length > 100) {
      toast.error("Nombre, categoría y descripción no pueden superar los 100 caracteres");
      return;
    }

    // Validaciones de dígitos (7 máx)
    const checkDigits = (val: string) => val.replace(/[^0-9]/g, '').length <= 7;
    if (!checkDigits(formData.cantidad) || !checkDigits(formData.precioCompra) || !checkDigits(formData.precioVenta)) {
      toast.error("Cantidad, costo y precio de venta no pueden superar los 7 dígitos");
      return;
    }

    let finalCantidad = parseFloat(formData.cantidad || "0");
    let finalPrecioCompra = parseFloat(formData.precioCompra || "0");
    let finalUnidadMedida = formData.unidadMedida;

    // Si seleccionó paquete desde la Vista, convertimos la matemática del paquete para insertarlo como unidades individuales reales
    if (formData.unidadMedida === 'paquete' && (isNewProduct || editingProduct)) {
      const pCompra = parseFloat(precioPaquete || "0");
      const cPaq = parseFloat(cantidadPaquetes || "0");
      const uPaq = parseFloat(unidadesPorPaquete || "1");

      finalCantidad = cPaq * uPaq;
      finalPrecioCompra = pCompra / uPaq;
      finalUnidadMedida = "unidad"; // Se fuerza a unidad para que pueda ser consumido por piezas
    }

    const userRole = user?.rol || user?.tipoUsuario;
    const ownerId = String((userRole === 'trabajador' || userRole === 'subjefe') ? user?.jefeId : user?.id || '');
    if (editingProduct) {
        api.updateProducto(editingProduct.id, {
            update_all: true,
            nombre: formData.nombre,
            descripcion: formData.descripcion,
            categoria: formData.categoria,
            tipo: formData.tipo,
            unidadMedida: finalUnidadMedida,
            cantidad: finalCantidad,
            costoBolivares: finalPrecioCompra,
            monedaCompra: formData.monedaCompra,
            precioVentaDolares: formData.tipo === 'venta' && formData.precioVenta ? parseFloat(formData.precioVenta) : undefined,
            monedaVenta: formData.monedaVenta,
            tasaDolar: dolarPrice
        })
            .then(() => {
                toast.success('Producto actualizado exitosamente');
                refreshInventory();
            })
            .catch(() => toast.error('Error al actualizar producto'));
    } else {
        api.addProducto({
            usuarioId: ownerId,
            nombre: formData.nombre,
            descripcion: formData.descripcion,
            categoria: formData.categoria,
            tipo: formData.tipo as 'venta' | 'servicio',
            unidadMedida: finalUnidadMedida as 'unit' | 'paquete' | 'kilo',
            cantidad: finalCantidad,
            costoBolivares: finalPrecioCompra,
            monedaCompra: formData.monedaCompra,
            precioVentaDolares: formData.tipo === 'venta' && formData.precioVenta ? parseFloat(formData.precioVenta) : undefined,
            monedaVenta: formData.monedaVenta,
            tasaDolar: dolarPrice
        })
        .then(() => {
            toast.success('Producto agregado exitosamente');
            refreshInventory();
        })
        .catch(() => toast.error('Error al agregar producto'));
    }

    resetForm();
    setIsDialogOpen(false);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      nombre: product.nombre,
      descripcion: product.descripcion,
      cantidad: product.cantidad.toString(),
      cantidadAgregar: "",
      precioCompra: product.precioCompra.toString(),
      precioVenta: product.precioVenta ? product.precioVenta.toString() : "",
      categoria: product.categoria,
      tipo: product.tipo,
      unidadMedida: product.unidadMedida,
      monedaCompra: product.monedaCompra,
      monedaVenta: product.monedaVenta || '$'
    });
    setIsDialogOpen(true);
    setIsNewProduct(false);
  };

  const handleRegisterLoss = async () => {
    if (!lossData.productoId || !lossData.cantidad || !lossData.descripcion) {
      toast.error("Por favor complete todos los campos");
      return;
    }

    const product = products.find(p => p.id === lossData.productoId);
    if (!product) return;

    const qty = parseFloat(lossData.cantidad);
    if (qty > product.cantidad) {
      toast.error(`No puedes registrar una pérdida mayor al stock disponible (${product.cantidad})`);
      return;
    }

    const userRole = user?.rol || user?.tipoUsuario;
    const ownerId = String((userRole === 'trabajador' || userRole === 'subjefe') ? user?.jefeId : user?.id || '');

    try {
      const res = await api.addMovimiento({
        usuarioId: ownerId,
        productoId: product.id,
        productoNombre: product.nombre,
        tipo: 'perdida',
        cantidad: qty,
        precioCompra: product.precioCompra,
        moneda: product.monedaCompra,
        descripcion: lossData.descripcion
      });

      if (res.success) {
        toast.success("Pérdida registrada correctamente");
        setIsLossDialogOpen(false);
        setLossData({ productoId: "", cantidad: "", descripcion: "" });
        refreshInventory();
        refreshMovimientos();
      } else {
        toast.error(res.message || "Error al registrar la pérdida");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error de conexión");
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de eliminar este producto?')) {
      api.deleteProducto(id)
        .then(() => {
          toast.success('Producto eliminado');
          refreshInventory();
        })
        .catch(() => toast.error('Error al eliminar producto'));
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: "",
      descripcion: "",
      cantidad: "",
      cantidadAgregar: "",
      precioCompra: "",
      precioVenta: "",
      categoria: "",
      tipo: 'venta' as 'venta' | 'servicio',
      unidadMedida: 'unidad' as 'unidad' | 'paquete' | 'kilo',
      monedaCompra: 'Bs' as '$' | 'Bs',
      monedaVenta: '$' as '$' | 'Bs'
    });
    setUnidadesPorPaquete("");
    setCantidadPaquetes("");
    setPrecioPaquete("");
    setEditingProduct(null);
    setIsNewProduct(true);
    setSelectedExistingProduct("");
  };

  const handleExistingProductChange = (productId: string) => {
    setSelectedExistingProduct(productId);
    const product = products.find(p => p.id === productId);
    if (product) {
      setFormData({
        nombre: product.nombre,
        descripcion: product.descripcion,
        cantidad: product.cantidad.toString(),
        cantidadAgregar: "",
        precioCompra: product.precioCompra.toString(),
        precioVenta: product.precioVenta ? product.precioVenta.toString() : "",
        categoria: product.categoria,
        tipo: product.tipo,
        unidadMedida: product.unidadMedida,
        monedaCompra: product.monedaCompra,
        monedaVenta: product.monedaVenta || '$'
      });
      // Resetear estados de paquete para la nueva selección
      setUnidadesPorPaquete("");
      setCantidadPaquetes("");
      setPrecioPaquete("");
    }
  };

  const filteredProducts = products.filter(product =>
    product.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.categoria.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categoriasUnicas = Array.from(new Set(products.map(p => p.categoria).filter(Boolean)));

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  // Cálculo de totales según moneda y tasa del día
  const totalInventoryValueUsd = products.reduce((acc, p) => {
    const qty = p.cantidad;
    const price = p.precioVenta || 0;
    if (p.monedaVenta === '$') return acc + (qty * price);
    return acc + (qty * (price / dolarPrice));
  }, 0);

  const totalInventoryCostBs = products.reduce((acc, p) => {
    const qty = p.cantidad;
    const cost = p.precioCompra;
    if (p.monedaCompra === 'Bs') return acc + (qty * cost);
    return acc + (qty * (cost * dolarPrice));
  }, 0);

  const totalProducts = products.length;
  const totalItems = products.reduce((acc, p) => acc + p.cantidad, 0);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/dashboard')}
                className="hover:bg-blue-50"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2">
                <div className="bg-blue-600 p-2 rounded-lg text-white">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 leading-tight">Inventario de Productos</h1>
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{user.nombreEmpresa}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 flex justify-end items-center gap-2">
              <div className="bg-white border-2 border-indigo-100 p-1 rounded-xl flex items-center shadow-sm mr-4">
                <Button 
                  variant={activeTab === 'lista' ? 'default' : 'ghost'} 
                  size="sm" 
                  onClick={() => setActiveTab('lista')}
                  className={`rounded-lg transition-all ${activeTab === 'lista' ? 'bg-indigo-600 shadow-md' : 'text-indigo-600 hover:bg-indigo-50'}`}
                >
                  <Package className="mr-2 h-4 w-4" />
                  Lista
                </Button>
                <Button 
                  variant={activeTab === 'historial' ? 'default' : 'ghost'} 
                  size="sm" 
                  onClick={() => setActiveTab('historial')}
                  className={`rounded-lg transition-all ${activeTab === 'historial' ? 'bg-indigo-600 shadow-md' : 'text-indigo-600 hover:bg-indigo-50'}`}
                >
                  <History className="mr-2 h-4 w-4" />
                  Historial
                </Button>
              </div>

              <Button 
                onClick={() => setIsLossDialogOpen(true)} 
                variant="outline" 
                size="sm" 
                className="border-2 border-red-200 text-red-600 hover:bg-red-50 font-bold hidden md:flex"
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                Registrar Pérdida
              </Button>

              <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} size="sm" className="bg-indigo-600 hover:bg-indigo-700 shadow-md">
                <Plus className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Agregar Producto</span>
                <span className="sm:hidden">Nuevo</span>
              </Button>

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-2 border-blue-500 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b">
              <CardTitle className="text-sm font-bold text-blue-700">Inversión (Costo Total)</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-xl font-bold text-blue-900">Bs {formatPrice(totalInventoryCostBs)}</div>
              <p className="text-xs text-gray-500 font-semibold">
                Equiv. a: $ {formatPrice(totalInventoryCostBs / dolarPrice)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-500 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b">
              <CardTitle className="text-sm font-bold text-green-700">Valor de Venta Total</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-xl font-bold text-green-900">$ {formatPrice(totalInventoryValueUsd)}</div>
              <p className="text-xs text-gray-500 font-semibold">
                Equiv. a: Bs {formatPrice(totalInventoryValueUsd * dolarPrice)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-orange-500 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b">
              <CardTitle className="text-sm font-bold text-orange-700">Total Unidades</CardTitle>
              <Package className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-orange-900">{totalItems}</div>
              <p className="text-xs text-gray-500 font-semibold">
                Productos en stock
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre o categoría..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Main Content Area */}
        <div className="space-y-6">
          {activeTab === 'lista' ? (
            <>
              {/* Products Table */}
              <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm">
                <CardHeader className="border-b border-gray-100 pb-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <CardTitle className="text-xl font-black text-gray-900">Existencias Disponibles</CardTitle>
                      <CardDescription className="font-medium text-gray-500">Monitoriza y gestiona el stock físico de tu negocio</CardDescription>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full uppercase tracking-widest">
                      <ListOrdered className="h-4 w-4" /> {filteredProducts.length} Items encontrados
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {filteredProducts.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-gray-200">
                        <Package className="h-10 w-10 text-gray-300" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">No se encontraron productos</h3>
                      <p className="text-gray-500 max-w-xs mx-auto mt-1">Intenta con otros términos de búsqueda o agrega un nuevo producto.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-gray-100">
                      <Table>
                        <TableHeader className="bg-gray-50/50">
                          <TableRow className="hover:bg-transparent border-b border-gray-100">
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-gray-500 py-4">Producto / Categoría</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-gray-500 text-right py-4">Cantidad / Stock</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-gray-500 text-right py-4">P. Compra</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-gray-500 text-right py-4">P. Venta</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-gray-500 text-right py-4">Inversión Total</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-gray-500 text-center py-4">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredProducts.map((product) => (
                            <TableRow key={product.id} className="group hover:bg-blue-50/30 transition-colors border-b border-gray-50">
                              <TableCell className="py-4">
                                <div className="flex items-center gap-3">
                                  <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                    <Package className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <div className="font-bold text-gray-900 uppercase text-xs">{product.nombre}</div>
                                    <div className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter">{product.categoria}</div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-right py-4">
                                <div className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-black uppercase ${product.cantidad <= 5 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-green-100 text-green-700'}`}>
                                  {product.cantidad} {product.unidadMedida}s
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-medium py-4 text-xs">
                                {product.monedaCompra} {formatPrice(product.precioCompra)}
                              </TableCell>
                              <TableCell className="text-right font-bold text-green-600 py-4 text-xs">
                                {product.monedaVenta || '$'} {formatPrice(product.precioVenta || 0)}
                              </TableCell>
                              <TableCell className="text-right py-4">
                                <div className="font-black text-indigo-700 text-xs">
                                  {product.monedaCompra} {formatPrice(product.cantidad * product.precioCompra)}
                                </div>
                                <div className="text-[9px] font-bold text-gray-400">
                                  $ {formatPrice((product.cantidad * product.precioCompra) / (product.monedaCompra === 'Bs' ? dolarPrice : 1))}
                                </div>
                              </TableCell>
                              <TableCell className="text-center py-4">
                                <div className="flex justify-center gap-1">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 w-8 p-0 rounded-full hover:bg-indigo-600 hover:text-white transition-all"
                                    onClick={() => handleEdit(product)}
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 w-8 p-0 rounded-full hover:bg-red-600 hover:text-white transition-all"
                                    onClick={() => handleDelete(product.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            /* History View */
            <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-gray-100 pb-4">
                <div className="flex justify-between items-end">
                  <div>
                    <CardTitle className="text-xl font-black text-gray-900">Historial de Movimientos</CardTitle>
                    <CardDescription className="font-medium text-gray-500">Trazabilidad completa de cada cambio en tu stock</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={refreshMovimientos} disabled={isHistorialLoading}>
                    <History className={`h-4 w-4 mr-2 ${isHistorialLoading ? 'animate-spin' : ''}`} />
                    Actualizar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {isHistorialLoading ? (
                  <div className="py-20 text-center space-y-4">
                     <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
                     <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Cargando Trazabilidad...</p>
                  </div>
                ) : movimientos.length === 0 ? (
                  <div className="py-20 text-center">
                    <History className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                    <p className="text-gray-400 font-bold uppercase text-xs">No hay movimientos registrados aún</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <Table>
                      <TableHeader className="bg-gray-50/50">
                        <TableRow className="hover:bg-transparent border-b border-gray-100">
                          <TableHead className="font-black text-[10px] uppercase tracking-widest text-gray-500 py-4">Fecha / Hora</TableHead>
                          <TableHead className="font-black text-[10px] uppercase tracking-widest text-gray-500 py-4">Actividad</TableHead>
                          <TableHead className="font-black text-[10px] uppercase tracking-widest text-gray-500 py-4">Producto</TableHead>
                          <TableHead className="font-black text-[10px] uppercase tracking-widest text-gray-500 text-right py-4">Cantidad</TableHead>
                          <TableHead className="font-black text-[10px] uppercase tracking-widest text-gray-500 py-4">Detalles / Razón</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {movimientos.map((mov) => {
                          const getTipoDetails = (tipo: string) => {
                            switch(tipo) {
                              case 'entrada': return { label: 'Entrada', color: 'bg-green-100 text-green-700', icon: <ArrowUpRight className="h-3 w-3" /> };
                              case 'venta': return { label: 'Venta', color: 'bg-blue-100 text-blue-700', icon: <ShoppingCart className="h-3 w-3" /> };
                              case 'perdida': return { label: 'Pérdida', color: 'bg-red-100 text-red-700', icon: <AlertTriangle className="h-3 w-3" /> };
                              case 'consumo_servicio': return { label: 'Consumo Serv.', color: 'bg-purple-100 text-purple-700', icon: <Briefcase className="h-3 w-3" /> };
                              case 'consumo_produccion': return { label: 'Consumo Prod.', color: 'bg-orange-100 text-orange-700', icon: <SaveIcon className="h-3 w-3" /> };
                              default: return { label: tipo, color: 'bg-gray-100 text-gray-700', icon: <Package className="h-3 w-3" /> };
                            }
                          };
                          const details = getTipoDetails(mov.tipo);
                          return (
                            <TableRow key={mov.id} className="hover:bg-gray-50/50 border-b border-gray-50">
                              <TableCell className="py-4">
                                <div className="text-[10px] font-bold text-gray-500 flex items-center gap-2">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(mov.fecha).toLocaleString('es-VE')}
                                </div>
                              </TableCell>
                              <TableCell className="py-4">
                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${details.color}`}>
                                  {details.icon}
                                  {details.label}
                                </div>
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="font-bold text-gray-900 text-xs uppercase">{mov.productoNombre}</div>
                              </TableCell>
                              <TableCell className="text-right py-4">
                                <div className={`font-black text-xs ${mov.tipo === 'entrada' ? 'text-green-600' : 'text-red-500'}`}>
                                  {mov.tipo === 'entrada' ? '+' : '-'}{mov.cantidad}
                                </div>
                                <div className="text-[9px] font-bold text-gray-400 italic">
                                  {mov.moneda} {formatPrice(mov.precioCompra)} c/u
                                </div>
                              </TableCell>
                              <TableCell className="py-4">
                                <p className="text-[10px] text-gray-600 font-medium italic max-w-xs">{mov.descripcion || '-'}</p>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Agregar Producto Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden border-none shadow-2xl bg-white">
          <div className="bg-blue-600 px-8 py-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Package className="h-24 w-24 rotate-12" />
            </div>
            <DialogTitle className="text-2xl font-black flex items-center gap-3 uppercase tracking-tight">
              {editingProduct ? <Edit className="h-6 w-6" /> : (isNewProduct ? <Plus className="h-6 w-6" /> : <TrendingUp className="h-6 w-6" />)}
              {editingProduct ? 'Editar Producto' : (isNewProduct ? 'Nuevo Producto' : 'Reponer Stock')}
            </DialogTitle>
            <DialogDescription className="text-blue-100 font-medium mt-1">
              {editingProduct ? 'Modifica los datos del producto seleccionado' : (isNewProduct ? 'Añade un nuevo ítem a tu catálogo de inventario' : 'Registra la entrada de nueva mercancía')}
            </DialogDescription>
          </div>

          <form onSubmit={handleSubmit} className="p-8">
            <div className="grid gap-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {/* Selección de Producto (Solo si es reponer stock) */}
              {!isNewProduct && !editingProduct && (
                <div className="space-y-3">
                  <Label className="text-[11px] font-black text-blue-900 uppercase tracking-widest flex items-center gap-2">
                    <Search className="h-3 w-3" /> 1. Selecciona el producto a reponer
                  </Label>
                  <select
                    className="w-full h-12 px-4 bg-blue-50 border-2 border-blue-100 rounded-xl focus:border-blue-500 focus:ring-0 transition-all font-bold text-blue-900"
                    value={selectedExistingProduct}
                    onChange={(e) => handleExistingProductChange(e.target.value)}
                  >
                    <option value="">Buscar en el inventario...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre} (Stock: {p.cantidad} {p.unidadMedida}s)</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Información Básica */}
              {(isNewProduct || editingProduct || selectedExistingProduct) && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nombre">Nombre del Producto *</Label>
                      <Input
                        id="nombre"
                        placeholder="Ej: Pintura de Labios"
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        required
                        maxLength={100}
                        disabled={!isNewProduct && !editingProduct}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="categoria">Categoría *</Label>
                      <Input
                        id="categoria"
                        placeholder="Ej: Cosméticos"
                        value={formData.categoria}
                        onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                        required
                        maxLength={100}
                        disabled={!isNewProduct && !editingProduct}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="descripcion">Descripción (Opcional)</Label>
                    <Input
                      id="descripcion"
                      placeholder="Descripción detallada del producto"
                      value={formData.descripcion}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      maxLength={100}
                      disabled={!isNewProduct && !editingProduct}
                    />
                  </div>

                  {/* Campos para agregar stock a producto existente */}
                  {!isNewProduct && !editingProduct && selectedExistingProduct && (
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-5 space-y-4 shadow-inner mt-2">
                      <div className="flex justify-between items-center border-b border-blue-100 pb-2">
                        <h3 className="font-black text-blue-900 uppercase text-xs tracking-wider">Actualizar Inventario</h3>
                        <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">
                          {formData.nombre}
                        </Badge>
                      </div>

                      {formData.unidadMedida === 'paquete' ? (
                        <div className="space-y-4">
                          <div className="bg-white p-4 rounded-lg border border-blue-200 space-y-3">
                            <Label className="text-xs font-black text-blue-800 uppercase block">1. Especificar Contenido del Paquete</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                placeholder="Ej: 24"
                                value={unidadesPorPaquete}
                                onChange={(e) => setUnidadesPorPaquete(e.target.value)}
                                className="h-10 border-blue-300 focus:ring-blue-500 font-bold"
                                required
                              />
                              <span className="text-xs font-bold text-gray-500">unidades / paquete</span>
                            </div>
                          </div>

                          <div className="bg-white p-4 rounded-lg border border-purple-200">
                            <Label className="text-xs font-black text-purple-800 uppercase block">2. ¿Cuántos Paquetes vas a agregar?</Label>
                            <Input
                              type="number"
                              placeholder="Ej: 5"
                              value={cantidadPaquetes}
                              onChange={(e) => setCantidadPaquetes(e.target.value)}
                              className="h-10 border-purple-300 focus:ring-purple-500 font-bold text-lg"
                              required
                            />
                          </div>

                          <div className="bg-purple-600 p-4 rounded-lg text-white shadow-lg">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[10px] font-black uppercase opacity-80">Nuevas Unidades a sumar</span>
                              <span className="text-sm font-bold bg-white/20 px-2 rounded">
                                + {(parseFloat(cantidadPaquetes || "0") * parseFloat(unidadesPorPaquete || "1"))} uds
                              </span>
                            </div>
                            <div className="flex justify-between items-end border-t border-white/20 pt-2 mt-1">
                              <span className="text-xs font-black uppercase tracking-wider">TOTAL FINAL EN UNIDADES</span>
                              <span className="text-2xl font-black">
                                {(parseFloat(formData.cantidad || "0") + (parseFloat(cantidadPaquetes || "0") * parseFloat(unidadesPorPaquete || "1")))}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="bg-white p-4 rounded-lg border border-blue-200">
                            <Label className="text-xs font-black text-blue-800 uppercase block mb-2">
                              {formData.unidadMedida === 'kilo' ? 'Kilos a Comprar / Agregar *' : 'Unidades a Comprar / Agregar *'}
                            </Label>
                            <div className="flex items-center gap-3">
                              <Input
                                type="number"
                                placeholder="0"
                                value={formData.cantidadAgregar}
                                onChange={(e) => setFormData({ ...formData, cantidadAgregar: e.target.value })}
                                className="h-12 text-2xl border-blue-300 focus:ring-blue-500 font-black text-blue-900"
                                required
                              />
                              <span className="text-sm font-bold text-gray-400 uppercase">{formData.unidadMedida === 'kilo' ? 'kg' : 'uds'}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Campos para producto nuevo o edición */}
                  {(isNewProduct || editingProduct) && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="unidadMedida">Modo de Ingreso *</Label>
                        <select
                          id="unidadMedida"
                          value={formData.unidadMedida}
                          onChange={(e) => setFormData({ ...formData, unidadMedida: e.target.value as 'unidad' | 'paquete' | 'kilo' })}
                          required
                          className="w-full px-3 py-2 border border-blue-300 bg-blue-50 text-blue-900 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                        >
                          <option value="unidad">Por Unidad</option>
                          <option value="paquete">Comprado por Paquete</option>
                          <option value="kilo">Kilo</option>
                        </select>
                      </div>

                      {formData.unidadMedida === 'paquete' ? (
                        <div className="grid grid-cols-2 gap-4 bg-orange-50 p-4 border border-orange-200 rounded-lg">
                          <div className="space-y-2">
                            <Label htmlFor="cantidadPaquetes" className="text-orange-900">Cant. Paquetes *</Label>
                            <Input
                              id="cantidadPaquetes"
                              type="number"
                              placeholder="Ej: 5"
                              value={cantidadPaquetes}
                              onChange={(e) => setCantidadPaquetes(e.target.value)}
                              className="border-orange-300"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="unidadesPorPaquete" className="text-orange-900">Unidades/Paquete *</Label>
                            <Input
                              id="unidadesPorPaquete"
                              type="number"
                              placeholder="Ej: 24"
                              value={unidadesPorPaquete}
                              onChange={(e) => setUnidadesPorPaquete(e.target.value)}
                              className="border-orange-300"
                              required
                            />
                          </div>
                          <div className="col-span-2 text-xs font-bold text-orange-900 pt-2 border-t border-orange-200">
                            = Stock total: {(parseFloat(cantidadPaquetes || "0") * parseFloat(unidadesPorPaquete || "0"))} unidades.
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Label htmlFor="cantidad">Cantidad *</Label>
                          <Input
                            id="cantidad"
                            type="number"
                            placeholder="10"
                            value={formData.cantidad}
                            onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                            required
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="precioCompra">Costo *</Label>
                          <div className="flex gap-2">
                            <Input
                              id="precioCompra"
                              type="number"
                              step="0.01"
                              placeholder="100.00"
                              value={formData.unidadMedida === 'paquete' ? precioPaquete : formData.precioCompra}
                              onChange={(e) => {
                                if(formData.unidadMedida === 'paquete') setPrecioPaquete(e.target.value);
                                else setFormData({ ...formData, precioCompra: e.target.value });
                              }}
                              required
                              className="flex-1"
                            />
                            <Select value={formData.monedaCompra} onValueChange={(v: any) => setFormData({...formData, monedaCompra: v})}>
                              <SelectTrigger className="w-[80px]"><SelectValue /></SelectTrigger>
                              <SelectContent><SelectItem value="Bs">Bs</SelectItem><SelectItem value="$">$</SelectItem></SelectContent>
                            </Select>
                          </div>
                        </div>
                        {formData.tipo === 'venta' && (
                          <div className="space-y-2">
                            <Label htmlFor="precioVenta">P. Venta (Unidad) *</Label>
                            <div className="flex gap-2">
                              <Input
                                id="precioVenta"
                                type="number"
                                step="0.01"
                                placeholder="10.00"
                                value={formData.precioVenta}
                                onChange={(e) => setFormData({ ...formData, precioVenta: e.target.value })}
                                required
                                className="flex-1"
                              />
                              <Select value={formData.monedaVenta} onValueChange={(v: any) => setFormData({...formData, monedaVenta: v})}>
                                <SelectTrigger className="w-[80px]"><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="$">$</SelectItem><SelectItem value="Bs">Bs</SelectItem></SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
            <DialogFooter className="mt-8">
              <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                <SaveIcon className="mr-2 h-4 w-4" />
                {editingProduct ? 'Actualizar' : (isNewProduct ? 'Guardar' : 'Agregar Stock')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Registrar Pérdida Dialog */}
      <Dialog open={isLossDialogOpen} onOpenChange={setIsLossDialogOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-red-600 px-6 py-4 text-white">
            <DialogTitle className="text-xl font-black flex items-center gap-2 uppercase tracking-tight">
              <AlertTriangle className="h-5 w-5" /> Registrar Baja / Pérdida
            </DialogTitle>
            <DialogDescription className="text-red-100 text-xs font-medium">
              Elimina stock defectuoso, vencido o extraviado para mantener tus cuentas reales.
            </DialogDescription>
          </div>
          
          <div className="p-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-[11px] font-black text-gray-500 uppercase tracking-widest">1. Seleccionar Producto</Label>
              <select
                className="w-full h-11 px-4 py-2 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-red-500 focus:ring-0 transition-all text-sm font-bold text-gray-800"
                value={lossData.productoId}
                onChange={(e) => setLossData({...lossData, productoId: e.target.value})}
              >
                <option value="">Buscar producto...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre} (Stock: {p.cantidad})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[11px] font-black text-gray-500 uppercase tracking-widest">2. Cantidad Perdida</Label>
                <Input 
                  type="number" 
                  placeholder="0.00"
                  className="h-11 border-2 border-gray-100 rounded-xl focus:border-red-500 font-black text-lg"
                  value={lossData.cantidad}
                  onChange={(e) => setLossData({...lossData, cantidad: e.target.value})}
                />
              </div>
              <div className="bg-red-50 rounded-xl p-3 flex flex-col justify-center items-center border border-red-100">
                <p className="text-[9px] font-black text-red-700 uppercase">Stock Final</p>
                <p className="text-xl font-black text-red-900 border-t border-red-200 w-full text-center mt-1">
                  {(() => {
                    const p = products.find(prod => prod.id === lossData.productoId);
                    if (!p) return '0.00';
                    const final = p.cantidad - parseFloat(lossData.cantidad || '0');
                    return isNaN(final) ? p.cantidad : final.toFixed(2);
                  })()}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-black text-gray-500 uppercase tracking-widest">3. Razón de la Pérdida</Label>
              <Input 
                placeholder="Ej: Producto vencido, daño en transporte, etc..."
                className="h-11 border-2 border-gray-100 rounded-xl focus:border-red-500 font-medium"
                value={lossData.descripcion}
                onChange={(e) => setLossData({...lossData, descripcion: e.target.value})}
              />
            </div>
          </div>

          <DialogFooter className="bg-gray-50 p-4 border-t border-gray-100">
            <Button variant="ghost" onClick={() => setIsLossDialogOpen(false)} className="font-bold text-gray-500">
              Cancelar
            </Button>
            <Button onClick={handleRegisterLoss} className="bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest shadow-lg shadow-red-200">
              Confirmar Baja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}