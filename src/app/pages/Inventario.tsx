import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
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
import { Package, Plus, ArrowLeft, Edit, Trash2, DollarSign, Building2, Search, Save, X, User as UserIcon, UserCog, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useDolarPrice } from "../hooks/useDolarPrice";

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
  rol: 'admin' | 'jefe' | 'trabajador';
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
    // Cargar productos del localStorage
    // Determinar el dueño de la data (el Jefe actual)
    const storedUser = localStorage.getItem('currentUser');
    if (!storedUser) {
      navigate('/login');
      return;
    }
    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);
    const ownerId = String(parsedUser.rol === 'trabajador' ? parsedUser.jefeId : parsedUser.id || '');

    const savedProducts = localStorage.getItem('products');
    if (savedProducts) {
      const allProducts = JSON.parse(savedProducts);
      // AISLAMIENTO ESTRICTO: Solo lo propio
      const userProducts = allProducts.filter((p: any) => 
        String(p.usuarioId) === ownerId
      );
      
      // Migrar productos antiguos (Se les setea usuarioId con ownerId al cargarlos localmente)
      const migratedProducts = userProducts.map((product: Product) => ({
        ...product,
        unidadMedida: product.unidadMedida || 'unidad',
        monedaCompra: product.monedaCompra || 'Bs',
        monedaVenta: product.monedaVenta || '$',
        usuarioId: String(product.usuarioId || ownerId)
      }));
      setProducts(migratedProducts);
    }
  }, [navigate]);

  const saveProducts = (updatedProducts: Product[]) => {
    setProducts(updatedProducts);
    
    // Al guardar en localStorage, debemos persistir TODO, pero manteniendo el usuarioId
    const allProducts = JSON.parse(localStorage.getItem('products') || '[]');
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const ownerId = String(currentUser.rol === 'trabajador' ? currentUser.jefeId : currentUser.id || '');

    // Reemplazar solo los del usuario actual en la lista global
    const filteredOthers = allProducts.filter((p: any) => String(p.usuarioId) !== ownerId);
    localStorage.setItem('products', JSON.stringify([...filteredOthers, ...updatedProducts]));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isNewProduct && selectedExistingProduct) {
      // Agregar stock a producto existente
      const existingProduct = products.find(p => p.id === selectedExistingProduct);
      if (existingProduct) {
        // Validar cantidad agregar (max 7 dígitos)
        if (formData.cantidadAgregar.replace(/[^0-9]/g, '').length > 7) {
          toast.error("La cantidad no puede superar los 7 dígitos");
          return;
        }

        const updatedProduct: Product = {
          ...existingProduct,
          cantidad: existingProduct.cantidad + parseFloat(formData.cantidadAgregar || "0"),
          precioCompra: formData.precioCompra ? parseFloat(formData.precioCompra) : existingProduct.precioCompra,
          precioVenta: formData.precioVenta ? parseFloat(formData.precioVenta) : existingProduct.precioVenta,
          usuarioId: existingProduct.usuarioId // Mantener el dueño
        };
        const updatedProducts = products.map(p => p.id === selectedExistingProduct ? updatedProduct : p);
        saveProducts(updatedProducts);
        toast.success(`Se agregaron ${formData.cantidadAgregar} unidades a ${existingProduct.nombre}`);
        resetForm();
        setIsDialogOpen(false);
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

    const ownerId = String(user?.rol === 'trabajador' ? user?.jefeId : user?.id || '');
    const productData: Product = {
      id: editingProduct?.id || Date.now().toString(),
      nombre: formData.nombre,
      descripcion: formData.descripcion,
      cantidad: finalCantidad,
      unidadMedida: finalUnidadMedida as 'unidad' | 'paquete' | 'kilo',
      precioCompra: finalPrecioCompra,
      monedaCompra: formData.monedaCompra as '$' | 'Bs',
      precioVenta: formData.tipo === 'venta' && formData.precioVenta ? parseFloat(formData.precioVenta) : undefined,
      monedaVenta: formData.tipo === 'venta' && formData.monedaVenta ? formData.monedaVenta as '$' | 'Bs' : undefined,
      categoria: formData.categoria,
      tipo: formData.tipo as 'venta' | 'servicio',
      fechaRegistro: editingProduct?.fechaRegistro || new Date().toISOString(),
      oferta: editingProduct?.oferta,
      usuarioId: String(editingProduct?.usuarioId || ownerId), // DUEÑO (String)
    };

    let updatedProducts;
    if (editingProduct) {
      // Actualizar producto existente desde el modo edición
      updatedProducts = products.map(p => p.id === editingProduct.id ? productData : p);
      toast.success('Producto actualizado exitosamente');
    } else {
      // Agregar nuevo producto
      updatedProducts = [...products, productData];
      toast.success('Producto agregado exitosamente');
    }

    saveProducts(updatedProducts);
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
      const updatedProducts = products.filter(p => p.id !== id);
      saveProducts(updatedProducts);
      toast.success('Producto eliminado');
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

  const totalInventoryValue = products.reduce((acc, p) => acc + (p.cantidad * (p.precioVenta || 0)), 0);
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
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProducts}</div>
              <p className="text-xs text-muted-foreground">
                Productos únicos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Unidades</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalItems}</div>
              <p className="text-xs text-muted-foreground">
                Unidades en stock
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$ {formatPrice(totalInventoryValue)}</div>
              <p className="text-xs text-muted-foreground">
                Valor del inventario
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
                    disabled={!isNewProduct && !editingProduct}
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
                    disabled={!isNewProduct && !editingProduct}
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
                  disabled={!isNewProduct && !editingProduct}
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
                  disabled={!isNewProduct && !editingProduct}
                />
              </div>

              {/* Campos para agregar stock a producto existente */}
              {!isNewProduct && !editingProduct && selectedExistingProduct && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-blue-900">Agregar Stock</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cantidadAgregar">Cantidad a Agregar *</Label>
                      <Input
                        id="cantidadAgregar"
                        type="number"
                        min="1"
                        step="1"
                        placeholder="5"
                        value={formData.cantidadAgregar}
                        onChange={(e) => setFormData({ ...formData, cantidadAgregar: e.target.value })}
                        onInput={(e) => {
                          const target = e.target as HTMLInputElement;
                          if (target.value.replace(/[^0-9]/g, '').length > 7) {
                            target.value = target.value.slice(0, 7);
                          }
                        }}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Stock Actual</Label>
                      <div className="px-3 py-2 bg-white border border-gray-300 rounded-md">
                        {formData.cantidad} {formData.unidadMedida}{parseInt(formData.cantidad || "0") !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-blue-900 font-medium">
                    Nuevo Total: {parseInt(formData.cantidad || "0") + parseInt(formData.cantidadAgregar || "0")} {formData.unidadMedida}{(parseInt(formData.cantidad || "0") + parseInt(formData.cantidadAgregar || "0")) !== 1 ? 's' : ''}
                  </div>
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
                        className="flex-1"
                      />
                      <Select 
                        value={formData.monedaCompra} 
                        onValueChange={(value: '$' | 'Bs') => setFormData({ ...formData, monedaCompra: value })}
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
                        className="flex-1"
                      />
                      <Select 
                        value={formData.monedaVenta} 
                        onValueChange={(value: '$' | 'Bs') => setFormData({ ...formData, monedaVenta: value })}
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
                      className="flex-1"
                    />
                    <Select 
                      value={formData.monedaCompra} 
                      onValueChange={(value: '$' | 'Bs') => setFormData({ ...formData, monedaCompra: value })}
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