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
  Search,
  Edit,
  Trash2,
  Users,
  Building2,
  Save,
  X,
  Package,
  User as UserIcon,
  UserCog,
  LogOut,
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

interface Service {
  id: string;
  nombre: string;
  descripcion: string;
  costo: number; // Costo en Bs
  precioVenta: number; // Precio de venta en $
  categoria: string;
  cantidadPrestados: number; // Cantidad de veces que se ha prestado el servicio
  fechaRegistro: string;
  productosUsados: ProductoUsado[]; // Productos del inventario que se usan en este servicio
  oferta?: {
    tipo: '2x1' | 'descuento' | 'precio_fijo';
    valor: number;
    activa: boolean;
  };
  usuarioId: string; // ID del Jefe dueño
}

interface ProductoUsado {
  productoId: string;
  productoNombre: string;
  cantidad: number; // Cantidad del producto que se usa por cada servicio
}

interface Product {
  id: string;
  nombre: string;
  descripcion: string;
  cantidad: number;
  unidadMedida?: 'unidad' | 'paquete' | 'kilo';
  monedaCompra?: '$' | 'Bs';
  precioCompra: number;
  monedaVenta?: '$' | 'Bs';
  precioVenta?: number;
  categoria: string;
  tipo: 'venta' | 'servicio';
  fechaRegistro: string;
  usuarioId: string; // ID del Jefe dueño
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

export function Servicios() {
  const navigate = useNavigate();
  const { price: dolarPrice } = useDolarPrice(60000);
  const [user, setUser] = useState<User | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [productQuantity, setProductQuantity] = useState("");
  const [usaInventario, setUsaInventario] = useState(false);
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    costo: "",
    precioVenta: "",
    categoria: "",
    productosUsados: [] as ProductoUsado[],
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (!storedUser) {
      navigate('/login');
      return;
    }
    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);
    const ownerId = String(parsedUser.rol === 'trabajador' ? parsedUser.jefeId : parsedUser.id || '');

    // Cargar servicios de MySQL
    api.getServicios(ownerId).then(res => {
      if (res.success) {
        setServices(res.servicios.map((s: any) => ({
          id: String(s.id),
          nombre: s.nombreServicio,
          descripcion: s.descripcion || "",
          costo: parseFloat(s.costoBolivares),
          precioVenta: (parseFloat(s.costoBolivares) * 1.5) / dolarPrice, // Valor por defecto si no hay precio de venta en DB
          categoria: s.categoria || "Gral",
          cantidadPrestados: 0,
          fechaRegistro: s.fecha,
          productosUsados: [],
          usuarioId: String(s.usuarioId)
        })));
      }
    });

    // Cargar productos de MySQL
    api.getInventario(ownerId).then(res => {
      if (res.success) {
        setProducts(res.productos.map((p: any) => ({
          ...p, id: String(p.id), cantidad: parseFloat(p.cantidad), precioCompra: parseFloat(p.costoBolivares)
        })));
      }
    });
  }, [navigate, dolarPrice]);

  const refreshServices = () => {
    const ownerId = String(user?.rol === 'trabajador' ? user?.jefeId : user?.id || '');
    api.getServicios(ownerId).then(res => {
      if (res.success) {
        setServices(res.servicios.map((s: any) => ({
          id: String(s.id), nombre: s.nombreServicio, descripcion: s.descripcion || "",
          costo: parseFloat(s.costoBolivares), precioVenta: 10, categoria: s.categoria || "Gral",
          cantidadPrestados: 0, fechaRegistro: s.fecha, productosUsados: [],
          usuarioId: String(s.usuarioId)
        })));
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // VALIDACIÓN DE LÍMITES
    if (!editingService) {
      const currentLimit = user?.limiteServicios || 10;
      if (services.length >= currentLimit) {
        toast.error(`Has alcanzado el límite de ${currentLimit} servicios. ¡Mejora tu plan para agregar más!`);
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
    if (!checkDigits(formData.precioVenta)) {
      toast.error("El precio de venta no puede superar los 7 dígitos");
      return;
    }

    const costoFinal = usaInventario 
       ? formData.productosUsados.reduce((acc, pu) => {
           const product = products.find(p => p.id === pu.productoId);
           return acc + (product ? (product.precioCompra * pu.cantidad) : 0);
         }, 0)
       : 0;

    const ownerId = String(user?.rol === 'trabajador' ? user?.jefeId : user?.id || '');
    
    if (editingService) {
        api.updateServicio(editingService.id, {
            nombreServicio: formData.nombre,
            descripcion: formData.descripcion,
            costoBolivares: costoFinal,
            categoria: formData.categoria
        })
        .then(() => {
            toast.success('Servicio actualizado exitosamente');
            refreshServices();
        })
        .catch(() => toast.error('Error al actualizar servicio'));
    } else {
        api.addServicio({
            usuarioId: ownerId,
            nombreServicio: formData.nombre,
            costoBolivares: costoFinal,
            fecha: new Date().toISOString(),
            descripcion: formData.descripcion
        })
        .then(() => {
            toast.success('Servicio agregado exitosamente');
            refreshServices();
        })
        .catch(() => toast.error('Error al agregar servicio'));
    }

    resetForm();
    setIsDialogOpen(false);
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    
    // Si tiene productos, significa que sí usaba inventario
    const hasInventory = service.productosUsados && service.productosUsados.length > 0;
    setUsaInventario(hasInventory);
    
    setFormData({
      nombre: service.nombre,
      descripcion: service.descripcion,
      costo: service.costo.toString(),
      precioVenta: service.precioVenta.toString(),
      categoria: service.categoria,
      productosUsados: service.productosUsados || [],
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de eliminar este servicio?')) {
      api.deleteServicio(id)
        .then(() => {
          toast.success('Servicio eliminado');
          refreshServices();
        })
        .catch(() => toast.error('Error al eliminar servicio'));
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: "",
      descripcion: "",
      costo: "",
      precioVenta: "",
      categoria: "",
      productosUsados: [] as ProductoUsado[],
    });
    setEditingService(null);
    setSelectedProductId("");
    setProductQuantity("");
    setUsaInventario(false);
  };

  const filteredServices = services.filter(service =>
    service.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.categoria.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categoriasUnicas = Array.from(new Set(services.map(s => s.categoria).filter(Boolean)));

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const totalServices = services.length;
  const totalPrestados = services.reduce((acc, s) => acc + s.cantidadPrestados, 0);
  const totalIngresos = services.reduce((acc, s) => acc + (s.cantidadPrestados * s.precioVenta), 0);

  const materialProducts = products.filter(p => p.tipo === 'servicio');

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex items-center py-3 sm:py-4 gap-2">
            <div className="flex-1 flex items-center gap-2 sm:gap-3 min-w-0">
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="flex-shrink-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="bg-gradient-to-br from-purple-500 to-violet-600 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="font-semibold text-base sm:text-lg truncate">Servicios</h1>
                  <p className="text-xs sm:text-sm text-gray-500 truncate">{user.nombreEmpresa}</p>
                </div>
              </div>
            </div>
            <div className="flex-1 hidden md:flex justify-center">

            </div>
            <div className="flex-1 flex justify-end">
              <Button onClick={() => {
                resetForm();
                setIsDialogOpen(true);
              }} size="sm" className="text-xs sm:text-sm">
                <Plus className="mr-0 sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Agregar Servicio</span>
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
              <CardTitle className="text-sm font-medium">Total Servicios</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalServices}</div>
              <p className="text-xs text-muted-foreground">
                Servicios registrados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Servicios Prestados</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPrestados}</div>
              <p className="text-xs text-muted-foreground">
                Total de prestaciones
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$ {formatPrice(totalIngresos)}</div>
              <p className="text-xs text-muted-foreground">
                Bs {formatPrice(totalIngresos * dolarPrice)}
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

        {/* Services Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Servicios</CardTitle>
            <CardDescription>
              Gestiona tus servicios ofrecidos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredServices.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No hay servicios
                </h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm ? 'No se encontraron servicios con ese criterio de búsqueda' : 'Comienza agregando tu primer servicio'}
                </p>
                {!searchTerm && (
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar Servicio
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
                      <TableHead className="text-right">Costo</TableHead>
                      <TableHead className="text-right">Precio Venta</TableHead>
                      <TableHead className="text-right">Veces Prestado</TableHead>
                      <TableHead className="text-right">Ingresos Totales</TableHead>
                      <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredServices.map((service) => (
                      <TableRow key={service.id}>
                        <TableCell className="font-medium">{service.nombre}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{service.categoria}</div>
                            <div className="text-sm text-gray-500">{service.descripcion}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">Bs {formatPrice(service.costo)}</TableCell>
                        <TableCell className="text-right">
                          <div>
                            <div className="font-medium">$ {formatPrice(service.precioVenta)}</div>
                            <div className="text-xs text-gray-500">Bs {formatPrice(service.precioVenta * dolarPrice)}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{service.cantidadPrestados}</TableCell>
                        <TableCell className="text-right font-medium">
                          <div>
                            <div className="font-medium">$ {formatPrice(service.cantidadPrestados * service.precioVenta)}</div>
                            <div className="text-xs text-gray-500">Bs {formatPrice(service.cantidadPrestados * service.precioVenta * dolarPrice)}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(service)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(service.id)}
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

        {/* Nueva sección para Materiales/Servicios del Inventario */}
        <Card className="mt-8 border-blue-200 bg-blue-50/30">
          <CardHeader>
            <CardTitle className="text-blue-900 flex items-center gap-2">
              <Package className="h-5 w-5" />
              Materiales y Servicios Simples (del Inventario)
            </CardTitle>
            <CardDescription>
              Materiales registrados en el inventario para ser usados en servicios
            </CardDescription>
          </CardHeader>
          <CardContent>
            {materialProducts.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4 italic">
                No hay materiales registrados como "Servicio" en el inventario.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {materialProducts.map((product) => (
                  <div key={product.id} className="bg-white border border-blue-100 rounded-lg p-3 shadow-sm flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">{product.nombre}</h4>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{product.descripcion}</p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-blue-50 flex items-center justify-between text-xs">
                      <span className="text-blue-700 font-semibold px-2 py-0.5 bg-blue-100 rounded">
                        {product.cantidad} {product.unidadMedida}{product.cantidad !== 1 ? 's' : ''}
                      </span>
                      <span className="text-gray-600">
                        Costo: Bs {formatPrice(product.precioCompra)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Add/Edit Service Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[95vw] max-w-7xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingService ? 'Editar Servicio' : 'Agregar Nuevo Servicio'}
            </DialogTitle>
            <DialogDescription>
              {editingService ? 'Modifica los datos del servicio' : 'Completa los datos del nuevo servicio'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre del Servicio *</Label>
                <Input
                  id="nombre"
                  placeholder="Consultoría, Mantenimiento, etc."
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                  maxLength={20}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoria">Categoría *</Label>
                <Input
                  id="categoria"
                  list="categorias-servicios"
                  placeholder="Tecnología, Construcción, etc."
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  required
                  maxLength={20}
                />
                <datalist id="categorias-servicios">
                  {categoriasUnicas.map((cat, index) => (
                    <option key={index} value={cat} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Input
                  id="descripcion"
                  placeholder="Descripción detallada del servicio"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  maxLength={20}
                />
              </div>

              {/* Dynamic Toggle Row */}
              <div className="flex items-center space-x-2 bg-blue-50 border border-blue-200 p-3 rounded-lg">
                <input 
                  type="checkbox" 
                  id="usaInventario" 
                  checked={usaInventario} 
                  onChange={(e) => {
                     setUsaInventario(e.target.checked);
                     if (!e.target.checked) setFormData({...formData, productosUsados: [], costo: "0"});
                  }} 
                  className="h-4 w-4"
                />
                <Label htmlFor="usaInventario" className="font-semibold text-blue-900 cursor-pointer">
                  ¿Este servicio utiliza objetos y materiales del inventario?
                </Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {usaInventario && (
                  <div className="space-y-2">
                    <Label htmlFor="costo">Costo Total de Materiales (Bs)</Label>
                    <Input
                      id="costo"
                      type="number"
                      placeholder="Auto-calculado"
                      value={formData.productosUsados.reduce((acc, pu) => {
                        const product = products.find(p => p.id === pu.productoId);
                        return acc + (product ? (product.precioCompra * pu.cantidad) : 0);
                      }, 0).toFixed(2)}
                      readOnly
                      className="bg-gray-100 font-bold border-gray-300 pointer-events-none"
                    />
                    <p className="text-xs text-green-600 font-semibold">Costo se auto-calcula con la lista inferior</p>
                  </div>
                )}
                
                <div className={`space-y-2 ${!usaInventario ? 'col-span-2' : ''}`}>
                  <Label htmlFor="precioVenta">Precio de Venta a cobrar ($) *</Label>
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
                        target.value = target.value.slice(0, 7);
                      }
                    }}
                    required
                  />
                  <p className="text-xs text-gray-500">Precio puro facturado al cliente final</p>
                </div>
              </div>

              {/* Mostrar cálculo de margen */}
              {(((usaInventario ? formData.productosUsados.reduce((acc, pu) => {
                 const product = products.find(p => p.id === pu.productoId);
                 return acc + (product ? (product.precioCompra * pu.cantidad) : 0);
               }, 0) : 0) || formData.precioVenta)) && parseFloat(formData.precioVenta) > 0 ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-900">
                    <strong>Margen de ganancia:</strong> {' '}
                    {usaInventario ? 
                      (((parseFloat(formData.precioVenta) * dolarPrice - formData.productosUsados.reduce((acc, pu) => {
                        const product = products.find(p => p.id === pu.productoId);
                        return acc + (product ? (product.precioCompra * pu.cantidad) : 0);
                      }, 0)) / (parseFloat(formData.precioVenta) * dolarPrice)) * 100).toFixed(2) 
                    : 100}%
                    {' | '}
                    <strong>Ganancia por servicio:</strong> Bs {formatPrice((parseFloat(formData.precioVenta) * dolarPrice) - (usaInventario ? formData.productosUsados.reduce((acc, pu) => {
                      const product = products.find(p => p.id === pu.productoId);
                      return acc + (product ? (product.precioCompra * pu.cantidad) : 0);
                    }, 0) : 0))}
                  </p>
                </div>
              ) : null}

              {/* Sección para agregar productos usados */}
              {usaInventario && (
              <div className="space-y-3">
                <Label>Productos del Inventario Usados en el Servicio</Label>
                <p className="text-xs text-gray-500">
                  Agrega los productos que se usan cada vez que prestas este servicio
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="md:col-span-7">
                    <Label htmlFor="selectProducto" className="text-xs">Producto</Label>
                    <Select
                      value={selectedProductId}
                      onValueChange={(value) => setSelectedProductId(value)}
                    >
                      <SelectTrigger id="selectProducto" className="w-full">
                        <SelectValue placeholder="Selecciona un producto" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.length === 0 ? (
                          <div className="p-2 text-sm text-gray-500">
                            No hay productos en el inventario
                          </div>
                        ) : (
                          products.map(product => (
                            <SelectItem key={product.id} value={product.id}>
                              <div className="flex items-center gap-2">
                                <Package className="h-3 w-3" />
                                {product.nombre} - Coste en Bs {formatPrice(product.precioCompra)} {product.unidadMedida === 'unidad' ? 'x Pieza' : ''}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-3">
                    <Label htmlFor="cantidadProducto" className="text-xs">Cantidad</Label>
                    <Input
                      id="cantidadProducto"
                      type="number"
                      min="1"
                      step="1"
                      value={productQuantity}
                      onChange={(e) => setProductQuantity(e.target.value)}
                      onInput={(e) => {
                        const target = e.target as HTMLInputElement;
                        if (target.value.replace(/[^0-9]/g, '').length > 7) {
                          target.value = target.value.slice(0, 7);
                        }
                      }}
                      placeholder="0"
                      className="w-full"
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="md:col-span-2 w-full"
                    disabled={!selectedProductId || !productQuantity}
                    onClick={() => {
                      const product = products.find(p => p.id === selectedProductId);
                      if (product && productQuantity && parseInt(productQuantity) > 0) {
                        if (parseInt(productQuantity) > product.cantidad) {
                          toast.error(`Stock insuficiente. Solo hay ${product.cantidad} disponible(s) en inventario`);
                          return;
                        }

                        // Verificar si el producto ya está en la lista
                        const existingProduct = formData.productosUsados.find(
                          p => p.productoId === selectedProductId
                        );
                        
                        if (existingProduct) {
                          toast.error('Este producto ya está agregado');
                          return;
                        }

                        const newProductUsado: ProductoUsado = {
                          productoId: product.id,
                          productoNombre: product.nombre,
                          cantidad: parseInt(productQuantity, 10),
                        };
                        setFormData({
                          ...formData,
                          productosUsados: [...formData.productosUsados, newProductUsado],
                        });
                        setSelectedProductId("");
                        setProductQuantity("");
                        toast.success('Producto agregado');
                      }
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar
                  </Button>
                </div>

                {/* Lista de productos usados */}
                {formData.productosUsados.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <Label className="text-sm">Materiales Agregados:</Label>
                    <div className="space-y-2">
                      {formData.productosUsados.map((productUsado, index) => {
                        const product = products.find(p => p.id === productUsado.productoId);
                        const costoTotal = product ? product.precioCompra * productUsado.cantidad : 0;
                        
                        return (
                          <div 
                            key={index}
                            className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3"
                          >
                            <div className="flex items-center gap-3">
                              <div className="bg-blue-500 p-2 rounded">
                                <Package className="h-4 w-4 text-white" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{productUsado.productoNombre}</p>
                                <p className="text-xs text-gray-600">
                                  Usará {productUsado.cantidad} piezas por servicio
                                  {product && ` • Absorbe un costo de: Bs ${formatPrice(costoTotal)}`}
                                </p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const updatedProductos = formData.productosUsados.filter((_, i) => i !== index);
                                setFormData({
                                  ...formData,
                                  productosUsados: updatedProductos,
                                });
                                toast.success('Producto removido');
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
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
                {editingService ? 'Actualizar' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}