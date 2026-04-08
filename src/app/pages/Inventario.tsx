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
import { Package, Plus, ArrowLeft, Search, Edit, Trash2, Building2, X, LogOut, User as UserIcon, UserCog, Save, DollarSign, TrendingUp } from "lucide-react";
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
    const storedUser = localStorage.getItem('currentUser');
    if (!storedUser) {
      navigate('/login');
      return;
    }
    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);
    const ownerId = String((parsedUser.rol === 'trabajador' || parsedUser.rol === 'subjefe') ? parsedUser.jefeId : parsedUser.id || '');

    // Cargar productos de la base de datos MySQL
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
      })
      .catch(error => {
        console.error("Error al cargar inventario:", error);
        toast.error("Error al conectar con la base de datos");
        
        // Fallback a localStorage si falla la API (opcional, mejor no para evitar confusiones)
        const savedProducts = localStorage.getItem('products');
        if (savedProducts) {
          const allProducts = JSON.parse(savedProducts);
          const userProducts = allProducts.filter((p: any) => String(p.usuarioId) === ownerId);
          setProducts(userProducts);
        }
      });
  }, [navigate]);

  const refreshInventory = () => {
    const ownerId = String((user?.rol === 'trabajador' || user?.rol === 'subjefe') ? user?.jefeId : user?.id || '');
    api.getInventario(ownerId).then(response => {
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
    if (formData.nombre.length > 20 || formData.categoria.length > 20 || formData.descripcion.length > 20) {
      toast.error("Nombre, categoría y descripción no pueden superar los 20 caracteres");
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

    const ownerId = String((user?.rol === 'trabajador' || user?.rol === 'subjefe') ? user?.jefeId : user?.id || '');
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
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4 gap-3">
            <div className="flex-1 flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-2 rounded-lg">
                  <Package className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="font-semibold text-lg">Inventario</h1>
                  <p className="text-sm text-gray-500">{user.nombreEmpresa}</p>
                </div>
              </div>
            </div>
            <div className="flex-1 flex justify-end gap-2">
              <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Agregar Producto</span>
                <span className="sm:hidden">Nuevo</span>
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
                      <p className="text-xs font-normal text-gray-600">Rol: {user.rol || 'jefe'}</p>
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

        {/* Products Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Productos</CardTitle>
            <CardDescription>
              Gestiona tu inventario de productos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No hay productos
                </h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm ? 'No se encontraron productos con ese criterio de búsqueda' : 'Comienza agregando tu primer producto al inventario'}
                </p>
                {!searchTerm && (
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar Producto
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Precio Compra</TableHead>
                      <TableHead className="text-right">Precio Venta</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                      <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.nombre}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{product.categoria}</div>
                            <div className="text-sm text-gray-500">{product.descripcion}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{product.cantidad} {product.unidadMedida}{product.cantidad !== 1 ? 's' : ''}</TableCell>
                        <TableCell className="text-right">{product.monedaCompra} {formatPrice(product.precioCompra)}</TableCell>
                        <TableCell className="text-right">
                          {product.tipo === 'venta' ? (
                            <div>
                              <div className="font-medium">{product.monedaVenta} {formatPrice(product.precioVenta || 0)}</div>
                              <div className="text-xs text-gray-500">{product.monedaCompra} {formatPrice((product.precioVenta || 0) * dolarPrice)}</div>
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {product.tipo === 'venta' ? (
                            <div>
                              <div className="font-medium">{product.monedaVenta} {formatPrice(product.cantidad * (product.precioVenta || 0))}</div>
                              <div className="text-xs text-gray-500">{product.monedaCompra} {formatPrice(product.cantidad * (product.precioVenta || 0) * dolarPrice)}</div>
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(product)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(product.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
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
      </main>

      {/* Add/Edit Product Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Editar Producto' : 'Agregar Nuevo Producto'}
            </DialogTitle>
            <DialogDescription>
              {editingProduct ? 'Modifica los datos del producto' : 'Completa los datos del nuevo producto'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              {/* Solo mostrar selector de producto si NO estamos editando */}
              {!editingProduct && (
                <div className="space-y-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <Label>¿Es un producto nuevo o existente?</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="productType"
                        checked={isNewProduct}
                        onChange={() => {
                          setIsNewProduct(true);
                          setSelectedExistingProduct("");
                          resetForm();
                        }}
                        className="w-4 h-4"
                      />
                      <span>Producto Nuevo</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="productType"
                        checked={!isNewProduct}
                        onChange={() => setIsNewProduct(false)}
                        disabled={products.length === 0}
                        className="w-4 h-4"
                      />
                      <span>Producto Existente</span>
                    </label>
                  </div>
                  
                  {!isNewProduct && (
                    <div className="mt-3">
                      <Label htmlFor="existingProduct">Seleccionar Producto *</Label>
                      <select
                        id="existingProduct"
                        value={selectedExistingProduct}
                        onChange={(e) => handleExistingProductChange(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1"
                      >
                        <option value="">-- Selecciona un producto --</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.nombre} - {product.categoria} (Stock actual: {product.cantidad})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {(isNewProduct || editingProduct) && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="categoria">Categoría *</Label>
                      <Input
                        id="categoria"
                        list="categorias-inventario"
                        placeholder="Electrónica, Ropa, etc."
                        value={formData.categoria}
                        onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                        required
                        maxLength={20}
                      />
                      <datalist id="categorias-inventario">
                        {categoriasUnicas.map((cat, index) => (
                          <option key={index} value={cat} />
                        ))}
                      </datalist>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tipo">Tipo *</Label>
                      <select
                        id="tipo"
                        value={formData.tipo}
                        onChange={(e) => setFormData({ ...formData, tipo: e.target.value as 'venta' | 'servicio' })}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="venta">Venta</option>
                        <option value="servicio">Servicio</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre del Producto *</Label>
                    <Input
                      id="nombre"
                      placeholder="Laptop HP"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      required
                      maxLength={20}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="descripcion">Descripción</Label>
                    <Input
                      id="descripcion"
                      placeholder="Descripción detallada del producto"
                      value={formData.descripcion}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      maxLength={20}
                    />
                  </div>
                </>
              )}

              {/* Campos para agregar stock a producto existente */}
              {!isNewProduct && !editingProduct && selectedExistingProduct && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-5 space-y-4 shadow-inner">
                  <div className="flex justify-between items-center border-b border-blue-100 pb-2">
                    <h3 className="font-black text-blue-900 uppercase text-xs tracking-wider">Actualizar Inventario</h3>
                    <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">
                      {formData.nombre}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-3 rounded border border-blue-100">
                      <Label className="text-[10px] text-gray-500 uppercase font-bold">Stock Actual</Label>
                      <div className="text-xl font-black text-blue-900">
                        {formData.cantidad} <span className="text-xs font-medium text-gray-500 uppercase">{formData.unidadMedida}s</span>
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded border border-blue-100">
                      <Label className="text-[10px] text-gray-500 uppercase font-bold">Costo Actual (Bruto)</Label>
                      <div className="text-xl font-black text-green-700">
                        {formData.monedaCompra} {formatPrice(parseFloat(formData.precioCompra || "0"))}
                      </div>
                    </div>
                  </div>

                  {formData.unidadMedida === 'paquete' ? (
                    <div className="space-y-4">
                      <div className="bg-white p-4 rounded-lg border border-blue-200 space-y-3">
                        <div className="space-y-1">
                          <Label className="text-xs font-black text-blue-800 uppercase">1. Especificar Contenido del Paquete</Label>
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

                        {unidadesPorPaquete && parseFloat(unidadesPorPaquete) > 0 && (
                          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-dashed border-blue-100">
                            <div className="text-center">
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Paquetes Actuales</p>
                              <p className="text-lg font-black text-purple-700">
                                {(parseFloat(formData.cantidad || "0") / parseFloat(unidadesPorPaquete)).toFixed(2)}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Unidades Actuales</p>
                              <p className="text-lg font-black text-blue-700">{formData.cantidad}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="bg-white p-4 rounded-lg border border-purple-200">
                        <Label className="text-xs font-black text-purple-800 uppercase">2. ¿Cuántos Paquetes vas a agregar?</Label>
                        <Input
                          type="number"
                          placeholder="Ej: 5"
                          value={cantidadPaquetes}
                          onChange={(e) => setCantidadPaquetes(e.target.value)}
                          className="h-10 border-purple-300 focus:ring-purple-500 font-bold text-lg"
                          required
                        />
                      </div>

                      <div className="bg-purple-600 p-4 rounded-lg text-white shadow-lg transform hover:scale-[1.01] transition-transform">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-black uppercase opacity-80 letter-spacing-widest">Nuevas Unidades a sumar</span>
                          <span className="text-sm font-bold bg-white/20 px-2 rounded">
                            + {(parseFloat(cantidadPaquetes || "0") * parseFloat(unidadesPorPaquete || "0"))} uds
                          </span>
                        </div>
                        <div className="flex justify-between items-end border-t border-white/20 pt-2 mt-1">
                          <span className="text-xs font-black uppercase tracking-wider">TOTAL FINAL EN UNIDADES</span>
                          <span className="text-2xl font-black">
                            {(parseFloat(formData.cantidad || "0") + (parseFloat(cantidadPaquetes || "0") * parseFloat(unidadesPorPaquete || "0")))}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-white p-4 rounded-lg border border-blue-200">
                        <Label className="text-xs font-black text-blue-800 uppercase tracking-wider mb-2 block">
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

                      <div className="bg-blue-600 p-4 rounded-lg text-white shadow-lg">
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-[10px] font-black uppercase opacity-70 mb-1">Stock Final Estimado</p>
                            <p className="text-2xl font-black">
                              {(parseFloat(formData.cantidad || "0") + parseFloat(formData.cantidadAgregar || "0"))}
                              <span className="text-sm font-medium ml-2 opacity-80 uppercase">{formData.unidadMedida === 'kilo' ? 'kg' : 'uds'}</span>
                            </p>
                          </div>
                          <TrendingUp className="h-8 w-8 opacity-20" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Campos normales para producto nuevo o edición */}
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
                      <option value="paquete">Comprado por Paquete (múltiples unides adentro)</option>
                      <option value="kilo">Kilo</option>
                    </select>
                  </div>

                  {formData.unidadMedida === 'paquete' ? (
                    <div className="grid grid-cols-2 gap-4 bg-orange-50 p-4 border border-orange-200 rounded-lg">
                      <div className="space-y-2">
                        <Label htmlFor="cantidadPaquetes" className="text-orange-900">Paquetes vendidos *</Label>
                        <Input
                          id="cantidadPaquetes"
                          type="number"
                          min="0"
                          step="1"
                          placeholder="Ej: 5"
                          value={cantidadPaquetes}
                          onChange={(e) => setCantidadPaquetes(e.target.value)}
                          onInput={(e) => {
                            const target = e.target as HTMLInputElement;
                            if (target.value.replace(/[^0-9]/g, '').length > 7) {
                              target.value = target.value.slice(0, 7);
                            }
                          }}
                          className="border-orange-300"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="unidadesPorPaquete" className="text-orange-900">Unidades por paquete *</Label>
                        <Input
                          id="unidadesPorPaquete"
                          type="number"
                          min="1"
                          step="1"
                          placeholder="Ej: 24"
                          value={unidadesPorPaquete}
                          onChange={(e) => setUnidadesPorPaquete(e.target.value)}
                          onInput={(e) => {
                            const target = e.target as HTMLInputElement;
                            if (target.value.replace(/[^0-9]/g, '').length > 7) {
                              target.value = target.value.slice(0, 7);
                            }
                          }}
                          className="border-orange-300"
                          required
                        />
                      </div>
                      <div className="col-span-2 text-sm font-bold text-orange-900 pt-2 border-t border-orange-200">
                        = El inventario guardará un stock de: {(parseFloat(cantidadPaquetes || "0") * parseFloat(unidadesPorPaquete || "0"))} unidades individuales.
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="cantidad">Cantidad *</Label>
                      <Input
                        id="cantidad"
                        type="number"
                        min="0"
                        step="1"
                        placeholder="10"
                        value={formData.cantidad}
                        onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                        onInput={(e) => {
                          const target = e.target as HTMLInputElement;
                          if (target.value.replace(/[^0-9]/g, '').length > 7) {
                            target.value = target.value.slice(0, 7);
                          }
                        }}
                        required
                      />
                    </div>
                  )}
                </>
              )}

              {/* Precios - diferentes campos según el tipo */}
              {formData.tipo === 'venta' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="precioCompra">{formData.unidadMedida === 'paquete' ? 'Costo del PAQUETE Completo *' : 'Costo Unitario *'}</Label>
                    <div className="flex gap-2">
                      <Input
                        id="precioCompra"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="100.00"
                        value={formData.unidadMedida === 'paquete' ? precioPaquete : formData.precioCompra}
                        onChange={(e) => {
                          if(formData.unidadMedida === 'paquete') setPrecioPaquete(e.target.value);
                          else setFormData({ ...formData, precioCompra: e.target.value });
                        }}
                        onInput={(e) => {
                          const target = e.target as HTMLInputElement;
                          if (target.value.replace(/[^0-9]/g, '').length > 7) {
                            target.value = target.value.slice(0, 7);
                          }
                        }}
                        required
                        disabled={!isNewProduct && !editingProduct}
                        className="flex-1"
                      />
                      <Select 
                        value={formData.monedaCompra} 
                        onValueChange={(value: '$' | 'Bs') => setFormData({ ...formData, monedaCompra: value })}
                        disabled={!isNewProduct && !editingProduct}
                      >
                        <SelectTrigger className="w-[90px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Bs">Bs</SelectItem>
                          <SelectItem value="$">$</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="precioVenta">Precio de Venta (Por unidad) *</Label>
                    <div className="flex gap-2">
                      <Input
                        id="precioVenta"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="10.00"
                        value={formData.precioVenta}
                        onChange={(e) => setFormData({ ...formData, precioVenta: e.target.value })}
                        onInput={(e) => {
                          const target = e.target as HTMLInputElement;
                          if (target.value.replace(/[^0-9]/g, '').length > 7) {
                            target.value = target.value.slice(0, -1);
                          }
                        }}
                        required
                        disabled={!isNewProduct && !editingProduct}
                        className="flex-1"
                      />
                      <Select 
                        value={formData.monedaVenta} 
                        onValueChange={(value: '$' | 'Bs') => setFormData({ ...formData, monedaVenta: value })}
                        disabled={!isNewProduct && !editingProduct}
                      >
                        <SelectTrigger className="w-[90px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="$">$</SelectItem>
                          <SelectItem value="Bs">Bs</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="precioCompra">{formData.unidadMedida === 'paquete' ? 'Costo del PAQUETE Completo *' : 'Costo Unitario *'}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="precioCompra"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="100.00"
                      value={formData.unidadMedida === 'paquete' ? precioPaquete : formData.precioCompra}
                      onChange={(e) => {
                          if(formData.unidadMedida === 'paquete') setPrecioPaquete(e.target.value);
                          else setFormData({ ...formData, precioCompra: e.target.value });
                      }}
                      required
                      disabled={!isNewProduct && !editingProduct}
                      className="flex-1"
                    />
                    <Select 
                      value={formData.monedaCompra} 
                      onValueChange={(value: '$' | 'Bs') => setFormData({ ...formData, monedaCompra: value })}
                      disabled={!isNewProduct && !editingProduct}
                    >
                      <SelectTrigger className="w-[90px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Bs">Bs</SelectItem>
                        <SelectItem value="$">$</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-sm text-gray-500">Para servicios solo se registra el costo del objeto (material)</p>
                </div>
              )}

              {/* Mostrar cálculo de margen solo para ventas */}
              {formData.tipo === 'venta' && formData.precioCompra && formData.precioVenta && parseFloat(formData.precioVenta) > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-900">
                    <strong>Margen de ganancia:</strong> {' '}
                    {(((parseFloat(formData.precioVenta) - parseFloat(formData.precioCompra)) / parseFloat(formData.precioVenta)) * 100).toFixed(2)}%
                    {' | '}
                    <strong>Ganancia por unidad:</strong> {formData.monedaCompra} {formatPrice(parseFloat(formData.precioVenta) - parseFloat(formData.precioCompra))}
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsDialogOpen(false);
                  resetForm();
                }}
              >
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
              <Button type="submit">
                <Save className="mr-2 h-4 w-4" />
                {editingProduct ? 'Actualizar' : (isNewProduct ? 'Guardar' : 'Agregar Stock')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}