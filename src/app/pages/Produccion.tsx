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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Package,
  Plus,
  ArrowLeft,
  Search,
  Users,
  Save,
  X,
  Trash2,
  Layers,
  Calendar,
  DollarSign,
  ChevronDown,
  Eye,
  LogOut,
  User as UserIcon,
  UserCog
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
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
import { Separator } from "../components/ui/separator";

interface Production {
  id: string;
  usuarioId: string;
  detalles: {
    servicios: any[];
    insumos: any[];
  };
  costoTotal: number;
  fecha: string;
}

export function Produccion() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const { price: dolarPrice } = useDolarPrice(60000);
  const [productions, setProductions] = useState<Production[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Data helpers
  const [products, setProducts] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);

  // Dialog state
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false);
  const [selectedProduction, setSelectedProduction] = useState<Production | null>(null);

  // Batch Form State (Copied from Servicios.tsx)
  const [batchProducedItems, setBatchProducedItems] = useState<any[]>([]);
  const [batchInsumos, setBatchInsumos] = useState<any[]>([]);
  const [selectedBatchInsumo, setSelectedBatchInsumo] = useState("");
  const [batchInsumoQuantity, setBatchInsumoQuantity] = useState("");
  const [selectedBatchService, setSelectedBatchService] = useState("");
  const [batchCategory, setBatchCategory] = useState("");
  const [batchServiceQuantity, setBatchServiceQuantity] = useState("1");
  const [batchGlobalPrice, setBatchGlobalPrice] = useState("");
  const [batchPriceMode, setBatchPriceMode] = useState<'unique' | 'individual'>('individual');
  const [batchPriceType, setBatchPriceType] = useState<'unitario' | 'total'>('unitario');
  const [batchSpecificPrice, setBatchSpecificPrice] = useState("");
  const [batchCurrency, setBatchCurrency] = useState<'Bs' | '$'>('$');

  useEffect(() => {
    const currentUser = sessionStorage.getItem('currentUser');
    if (!currentUser) {
      navigate('/login');
      return;
    }
    const parsedUser = JSON.parse(currentUser);
    setUser(parsedUser);
    refreshData(parsedUser);
  }, [navigate]);

  const refreshData = async (currentUser = user) => {
    if (!currentUser) return;
    setIsLoading(true);
    const ownerId = String((currentUser.rol === 'trabajador' || currentUser.rol === 'subjefe') ? currentUser.jefeId : currentUser.id || '');
    
    try {
      const [prodRes, invRes, servRes] = await Promise.all([
        api.getProducciones(ownerId),
        api.getInventario(ownerId),
        api.getServicios(ownerId)
      ]);

      if (prodRes.success) setProductions(prodRes.producciones);
      if (invRes.success) {
        setProducts(invRes.productos.map((p: any) => ({
          ...p,
          id: String(p.id),
          cantidad: parseFloat(p.cantidad),
          precioCompra: parseFloat(p.costoBolivares),
          monedaCompra: p.monedaCompra || 'Bs'
        })));
      }
      if (servRes.success) {
        setServices(servRes.servicios.map((s: any) => ({
          id: String(s.id),
          nombre: s.nombreServicio,
          categoria: s.categoria || "General",
          costo: parseFloat(s.costoBolivares),
          precioVenta: parseFloat(s.precioVenta),
          cantidad: parseInt(s.cantidad || 0)
        })));
      }
    } catch (error) {
      toast.error("Error al cargar datos");
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  // Batch logic
  const handleAddServiceToBatch = () => {
    // 1. Validar nombre único en este lote (case-insensitive)
    const normalizedName = selectedBatchService.trim().toLowerCase();
    const existingIndex = batchProducedItems.findIndex(item => item.nombre.toLowerCase() === normalizedName);
    
    const existingService = services.find(s => s.nombre.toLowerCase() === normalizedName);
    const serviceName = selectedBatchService.trim();
    const serviceCategory = batchCategory || (existingService ? existingService.categoria : 'General');
    
    if (serviceName && batchServiceQuantity) {
      const qty = parseFloat(batchServiceQuantity);
      if (qty <= 0) {
        toast.error('La cantidad debe ser mayor a 0');
        return;
      }

      let price = 0;
      if (batchPriceMode === 'unique') {
        price = parseFloat(batchSpecificPrice) || 0;
      } else {
        price = parseFloat(batchGlobalPrice) || 0;
      }

      const newItem = { 
        id: existingService ? existingService.id : `new-${Date.now()}`, 
        nombre: serviceName, 
        categoria: serviceCategory,
        cantidad: qty, 
        costo: existingService ? existingService.costo : 0,
        precioVenta: price,
        monedaVenta: batchCurrency,
        precioEsTotal: batchPriceType === 'total'
      };

      if (existingIndex !== -1) {
        // Actualizar el existente sumando cantidad y actualizando precio
        const updatedItems = [...batchProducedItems];
        updatedItems[existingIndex] = {
            ...updatedItems[existingIndex],
            cantidad: updatedItems[existingIndex].cantidad + qty,
            precioVenta: price // Tomar el precio más reciente
        };
        setBatchProducedItems(updatedItems);
        toast.info(`Se han sumado ${qty} unidades a "${serviceName}"`);
      } else {
        setBatchProducedItems([...batchProducedItems, newItem]);
        toast.success('Producto añadido a la lista de producción');
      }

      setSelectedBatchService("");
      setBatchCategory("");
      setBatchServiceQuantity("1");
      setBatchSpecificPrice("");
    }
  };

  const handleAddInsumoToBatch = () => {
    const product = products.find(p => p.id === selectedBatchInsumo);
    if (product && batchInsumoQuantity) {
      const qty = parseFloat(batchInsumoQuantity);
      if (qty <= 0) {
        toast.error('La cantidad debe ser mayor a 0');
        return;
      }

      // Validar stock disponible
      const currentInBatch = batchInsumos.filter(i => i.productoId === product.id).reduce((sum, i) => sum + i.cantidad, 0);
      if ((qty + currentInBatch) > product.cantidad) {
        toast.error(`Stock insuficiente en inventario (Disponible: ${product.cantidad})`);
        return;
      }

      const existingInsumoIndex = batchInsumos.findIndex(i => i.productoId === product.id);
      
      if (existingInsumoIndex !== -1) {
        const updatedInsumos = [...batchInsumos];
        updatedInsumos[existingInsumoIndex].cantidad += qty;
        setBatchInsumos(updatedInsumos);
        toast.info(`Se han sumado ${qty} unidades de "${product.nombre}"`);
      } else {
        setBatchInsumos([...batchInsumos, { 
          productoId: product.id, 
          nombre: product.nombre, 
          cantidad: qty 
        }]);
        toast.success('Insumo añadido');
      }
      setSelectedBatchInsumo("");
      setBatchInsumoQuantity("");
    }
  };

  const handleSaveBatch = async () => {
    if (batchProducedItems.length === 0) {
      toast.error('Debes agregar al menos un ítem producido');
      return;
    }

    const ownerId = String((user?.rol === 'trabajador' || user?.rol === 'subjefe') ? user?.jefeId : user?.id || '');
    
    // Calculo de costo total (Inversión)
    const totalCostBs = batchInsumos.reduce((acc, i) => {
        const p = products.find(prod => prod.id === i.productoId);
        if (!p) return acc;
        const costInBs = p.monedaCompra === 'Bs' ? p.precioCompra : p.precioCompra * dolarPrice;
        return acc + (costInBs * i.cantidad);
    }, 0);

    const groupedProducedItems: any[] = [];
    batchProducedItems.forEach(item => {
      // Calcular precio unitario final para la base de datos si se puso el total
      let finalUnitPrice = item.precioVenta;
      if (item.precioEsTotal) {
        finalUnitPrice = item.precioVenta / item.cantidad;
      }

      groupedProducedItems.push({
        nombreServicio: item.nombre,
        categoria: item.categoria,
        costoBolivares: 0, // El costo se maneja a nivel de lote/insumos
        precioVenta: finalUnitPrice,
        monedaVenta: item.monedaVenta,
        tasaDolar: dolarPrice,
        cantidad: item.cantidad,
        descripcion: `Producción en lote (${item.cantidad} unidades) el ${new Date().toLocaleDateString()}`,
        fecha: new Date().toISOString()
      });
    });

    const batchData = {
      usuarioId: ownerId,
      batch: true,
      servicios: groupedProducedItems,
      insumos: batchInsumos.map(i => ({ productoId: i.productoId, cantidad: i.cantidad, nombre: i.nombre })),
      costoTotal: totalCostBs
    };

    try {
      await api.addBatchServicio(batchData);
      
      // LOG MOVIMIENTOS DE INSUMOS
      const movementPromises = batchInsumos.map(i => {
        const p = products.find(prod => prod.id === i.productoId);
        return api.addMovimiento({
          usuarioId: ownerId,
          productoId: i.productoId,
          productoNombre: i.nombre,
          tipo: 'consumo_produccion',
          cantidad: i.cantidad,
          precioCompra: p?.precioCompra || 0,
          moneda: p?.monedaCompra || 'Bs',
          descripcion: `Consumo para lote de producción`
        });
      });
      await Promise.all(movementPromises);

      toast.success('Producción registrada y stock actualizado');
      setIsBatchDialogOpen(false);
      resetBatchForm();
      refreshData();
    } catch (error) {
      toast.error('Error al guardar la producción');
    }
  };

  const resetBatchForm = () => {
    setBatchProducedItems([]);
    setBatchInsumos([]);
    setBatchGlobalPrice("");
    setBatchSpecificPrice("");
    setSelectedBatchInsumo("");
    setBatchInsumoQuantity("");
    setSelectedBatchService("");
    setBatchPriceType('unitario');
  };

  // Cálculos dinámicos
  const totalCostBs = batchInsumos.reduce((acc, i) => {
    const p = products.find(prod => prod.id === i.productoId);
    if (!p) return acc;
    const costInBs = p.monedaCompra === 'Bs' ? p.precioCompra : p.precioCompra * dolarPrice;
    return acc + (costInBs * i.cantidad);
  }, 0);

  const totalRevenueBs = batchProducedItems.reduce((acc, item) => {
    const price = item.precioVenta;
    const qty = item.cantidad;
    const isBs = item.monedaVenta === 'Bs';
    const subtotalBs = item.precioEsTotal 
      ? (isBs ? price : price * dolarPrice)
      : (isBs ? price * qty : (price * qty) * dolarPrice);
    return acc + subtotalBs;
  }, 0);

  const totalProfitBs = totalRevenueBs - totalCostBs;

  const filteredProductions = productions.filter(p => {
    const details = p.detalles;
    const names = details.servicios.map((s:any) => s.nombreServicio).join(" ").toLowerCase();
    return names.includes(searchTerm.toLowerCase()) || p.fecha.includes(searchTerm);
  });

  // Lista de nombres anteriores
  const previousNames = Array.from(new Set(services.map(s => s.nombre)));

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/dashboard')}
                className="hover:bg-indigo-50"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2">
                <div className="bg-indigo-600 p-2 rounded-lg">
                  <Layers className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-gray-900 leading-tight">Módulo de Producción</h1>
                  <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">{user.nombreEmpresa}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                onClick={() => {
                  resetBatchForm();
                  setIsBatchDialogOpen(true);
                }} 
                className="bg-indigo-600 hover:bg-indigo-700 shadow-md font-bold"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nueva Producción
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

      {/* Stats Context */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white border-none shadow-sm ring-1 ring-gray-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Historial de Lotes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-gray-900">{productions.length}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-none shadow-sm ring-1 ring-gray-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Items Generados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-indigo-600">
                {productions.reduce((acc, p) => acc + (p.detalles.servicios?.length || 0), 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* History Table */}
        <Card className="shadow-lg border-none ring-1 ring-gray-200">
          <CardHeader className="flex flex-row items-center justify-between bg-gray-50/50 border-b">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-indigo-600" />
                Registros de Producción
              </CardTitle>
              <CardDescription className="text-xs font-medium">Historial completo de lotes producidos</CardDescription>
            </div>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Buscar por descripción o fecha..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10 bg-white border-gray-200"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex flex-col items-center py-24 gap-4">
                <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-indigo-600 font-bold animate-pulse text-sm">Sincronizando producción...</p>
              </div>
            ) : filteredProductions.length === 0 ? (
              <div className="text-center py-24">
                <div className="bg-gray-100 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Layers className="h-8 w-8 text-gray-300" />
                </div>
                <p className="text-gray-500 font-bold">No se encontraron registros de producción</p>
                <p className="text-xs text-gray-400 mt-1">Crea tu primer lote usando el botón superior</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-gray-50/80">
                  <TableRow className="border-b border-gray-100">
                    <TableHead className="font-black text-[10px] uppercase tracking-wider text-gray-500 py-4">Fecha y Referencia</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-wider text-gray-500 py-4">Resultado de la Producción</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-wider text-gray-500 py-4">Materiales Utilizados</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-wider text-gray-500 py-4 text-right">Inversión Lote</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-wider text-gray-500 py-4 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProductions.map((p) => (
                    <TableRow key={p.id} className="hover:bg-indigo-50/20 transition-all border-b border-gray-50 last:border-0 group">
                      <TableCell className="py-4">
                        <div className="font-bold text-gray-900">{new Date(p.fecha).toLocaleDateString()}</div>
                        <div className="text-[10px] text-gray-400 font-mono">LOTE #{p.id.toString().padStart(5, '0')}</div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {p.detalles.servicios?.map((s:any, idx:number) => (
                            <div key={idx} className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md border border-indigo-100">
                              <span className="font-black text-xs">{s.cantidad}x</span>
                              <span className="text-[11px] font-bold">{s.nombreServicio}</span>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2">
                           <div className="bg-gray-100 p-1.5 rounded-md">
                             <Package className="h-4 w-4 text-gray-500" />
                           </div>
                           <span className="text-xs font-bold text-gray-600">
                             {p.detalles.insumos?.length || 0} Materiales consumidos
                           </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-right">
                        <div className="font-black text-indigo-600 text-sm">Bs {formatPrice(p.costoTotal)}</div>
                        <div className="text-[10px] text-gray-400 font-bold">$ {(p.costoTotal / dolarPrice).toFixed(2)}</div>
                      </TableCell>
                      <TableCell className="py-4 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-9 w-9 p-0 rounded-full hover:bg-indigo-600 hover:text-white transition-colors"
                          onClick={() => setSelectedProduction(p)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Nueva Producción Dialog (REDESISEÑO COMPLETO) */}
      <Dialog open={isBatchDialogOpen} onOpenChange={setIsBatchDialogOpen}>
        <DialogContent className="sm:max-w-[1000px] h-[90vh] flex flex-col p-0 overflow-hidden bg-white border-none shadow-2xl">
          <div className="px-8 py-6 bg-indigo-600 text-white shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-black text-white flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-xl">
                    <Save className="h-6 w-6 text-white" />
                  </div>
                  Nueva Producción por Lote
                </DialogTitle>
                <DialogDescription className="text-indigo-100 mt-1 font-medium">
                  Configura productos, precios y consumo de inventario en una sola operación.
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              
              {/* LADO IZQUIERDO: PRODUCTOS GENERADOS / PRECIOS */}
              <div className="flex flex-col space-y-8 h-full">
                <div className="flex items-center gap-3 mb-2">
                   <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-sm ring-4 ring-indigo-50">1</div>
                   <h3 className="font-black text-gray-900 uppercase tracking-tight">Identidad y Precios</h3>
                </div>

                <Card className="border-2 border-indigo-50 shadow-sm bg-indigo-50/10">
                  <CardContent className="pt-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[11px] font-black text-indigo-900 uppercase tracking-widest">Tipo de Precio</Label>
                        <div className="flex gap-2 p-1 bg-white rounded-lg border border-indigo-100">
                          <Button 
                            type="button" 
                            variant={batchPriceType === 'unitario' ? 'default' : 'ghost'} 
                            size="sm"
                            className={`flex-1 text-[10px] font-black uppercase tracking-tighter h-8 ${batchPriceType === 'unitario' ? 'bg-indigo-600' : 'text-gray-400'}`}
                            onClick={() => setBatchPriceType('unitario')}
                          >
                            Unitario
                          </Button>
                          <Button 
                            type="button" 
                            variant={batchPriceType === 'total' ? 'default' : 'ghost'} 
                            size="sm"
                            className={`flex-1 text-[10px] font-black uppercase tracking-tighter h-8 ${batchPriceType === 'total' ? 'bg-indigo-600' : 'text-gray-400'}`}
                            onClick={() => setBatchPriceType('total')}
                          >
                            Total Lote
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[11px] font-black text-indigo-900 uppercase tracking-widest">Moneda Principal</Label>
                        <div className="flex gap-2 p-1 bg-white rounded-lg border border-indigo-100">
                          <Button 
                            type="button" 
                            variant={batchCurrency === '$' ? 'default' : 'ghost'} 
                            size="sm"
                            className={`flex-1 text-[10px] font-black uppercase h-8 ${batchCurrency === '$' ? 'bg-indigo-600' : 'text-gray-400'}`}
                            onClick={() => setBatchCurrency('$')}
                          >
                            Dólares ($)
                          </Button>
                          <Button 
                            type="button" 
                            variant={batchCurrency === 'Bs' ? 'default' : 'ghost'} 
                            size="sm"
                            className={`flex-1 text-[10px] font-black uppercase h-8 ${batchCurrency === 'Bs' ? 'bg-indigo-600' : 'text-gray-400'}`}
                            onClick={() => setBatchCurrency('Bs')}
                          >
                            Bolívares (Bs)
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[11px] font-black text-indigo-900 uppercase tracking-widest">Precio de Venta Predefinido</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-indigo-400 text-xs">
                          {batchCurrency}
                        </span>
                        <Input 
                          type="number" 
                          placeholder="0.00"
                          value={batchGlobalPrice}
                          onChange={(e) => setBatchGlobalPrice(e.target.value)}
                          className="pl-9 h-11 border-indigo-100 bg-white font-black text-indigo-900 focus:ring-indigo-200"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="bg-white p-6 rounded-2xl border-2 border-gray-100 shadow-sm space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-7 space-y-2">
                      <Label className="text-[10px] font-black text-gray-400 uppercase">Nombre de Producción</Label>
                      <Input
                        placeholder="Ej: Pan Sobado, Pizza Familiar..."
                        list="prev-names"
                        value={selectedBatchService}
                        onChange={(e) => setSelectedBatchService(e.target.value)}
                        className="h-11 border-gray-200 focus:border-indigo-300"
                      />
                      <datalist id="prev-names">
                        {previousNames.map((n, i) => <option key={i} value={n} />)}
                      </datalist>
                    </div>
                    <div className="md:col-span-3 space-y-2">
                      <Label className="text-[10px] font-black text-gray-400 uppercase text-center block">Cantidad</Label>
                      <Input 
                        type="number" 
                        value={batchServiceQuantity} 
                        onChange={(e) => setBatchServiceQuantity(e.target.value)} 
                        className="h-11 text-center font-black text-gray-900 border-gray-200"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Button onClick={handleAddServiceToBatch} className="h-11 w-full bg-indigo-600 hover:bg-indigo-700 shadow-lg">
                        <Plus className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    {batchProducedItems.length === 0 ? (
                      <div className="py-12 border-2 border-dashed border-gray-100 rounded-xl flex flex-col items-center justify-center gap-2">
                         <div className="text-gray-300 font-bold text-xs uppercase tracking-tighter">No hay ítems agregados a esta producción</div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {batchProducedItems.map((item, idx) => (
                          <div key={idx} className="group bg-indigo-50/40 hover:bg-indigo-50 p-4 rounded-xl border border-indigo-100 transition-all flex justify-between items-center relative overflow-hidden">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>
                            <div>
                              <div className="font-black text-indigo-900 uppercase tracking-tight text-xs">{item.nombre}</div>
                              <div className="text-[10px] font-bold text-gray-500 flex items-center gap-2 mt-0.5">
                                <span className="bg-indigo-600 text-white px-1.5 py-0.5 rounded text-[8px] font-black">{item.cantidad} UNIDADES</span>
                                <span>PARA VENDER A: {item.monedaVenta} {formatPrice(item.precioVenta)} {item.precioEsTotal ? '(TOTAL)' : '(UNIDAD)'}</span>
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-full"
                              onClick={() => setBatchProducedItems(batchProducedItems.filter((_, i) => i !== idx))}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* GANANCIA PROYECTADA */}
                <Card className="border-none shadow-xl bg-gradient-to-br from-green-600 to-emerald-700 text-white overflow-hidden mt-auto">
                   <div className="px-6 py-8 flex flex-col items-center justify-center text-center relative">
                      <div className="absolute top-4 right-4 text-white/10 rotate-12 scale-150">
                        <DollarSign className="h-24 w-24" />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-green-100 mb-1">Ganancia Bruta Proyectada</p>
                      <h2 className="text-4xl font-black mb-1 drop-shadow-md">Bs {formatPrice(totalProfitBs)}</h2>
                      <p className="text-sm font-bold text-green-50/80">
                        ≈ $ {formatPrice(totalProfitBs / dolarPrice || 0)}
                      </p>
                      <p className="text-[9px] font-medium text-green-200/60 mt-4 leading-tight">
                        Calculado si se vende el 100% al precio fijado menos costos de insumos
                      </p>
                   </div>
                </Card>
              </div>

              {/* LADO DERECHO: INSUMOS / MATERIALES */}
              <div className="flex flex-col space-y-8 h-full">
                 <div className="flex items-center gap-3 mb-2">
                   <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-black text-sm ring-4 ring-emerald-50">2</div>
                   <h3 className="font-black text-gray-900 uppercase tracking-tight">Consumo de Inventario</h3>
                </div>

                <div className="bg-white p-6 rounded-2xl border-2 border-gray-100 shadow-sm space-y-5">
                   <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black text-gray-400 uppercase">Material / Insumo del Inventario</Label>
                        <Select
                          value={selectedBatchInsumo}
                          onValueChange={setSelectedBatchInsumo}
                        >
                          <SelectTrigger className="h-11 border-gray-200 font-bold bg-white">
                            <SelectValue placeholder="Seleccionar material..." />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {products.map(p => (
                              <SelectItem key={p.id} value={p.id}>
                                <div className="flex flex-col items-start gap-0.5">
                                  <span className="font-bold text-gray-900">{p.nombre}</span>
                                  <span className="text-[10px] text-gray-400">STOCK DISPONIBLE: {p.cantidad} (Costo: {p.monedaCompra} {formatPrice(p.precioCompra)})</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-12 gap-3 items-end">
                        <div className="col-span-12 md:col-span-8 space-y-2">
                          <Label className="text-[10px] font-black text-gray-400 uppercase">Cantidad a Utilizar</Label>
                          <Input 
                            type="number" 
                            placeholder="0.00"
                            value={batchInsumoQuantity} 
                            onChange={(e) => setBatchInsumoQuantity(e.target.value)} 
                            className="h-11 font-black text-gray-900 border-gray-200"
                          />
                        </div>
                        <div className="col-span-12 md:col-span-4">
                          <Button 
                            onClick={handleAddInsumoToBatch} 
                            disabled={!selectedBatchInsumo || !batchInsumoQuantity}
                            className="h-11 w-full bg-emerald-600 hover:bg-emerald-700 shadow-lg font-bold"
                          >
                            <Plus className="mr-2 h-4 w-4" /> Material
                          </Button>
                        </div>
                      </div>
                   </div>

                   <Separator className="bg-gray-50" />

                   <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                      {batchInsumos.length === 0 ? (
                        <div className="py-20 border-2 border-dashed border-gray-50 rounded-xl flex flex-col items-center justify-center gap-3">
                           <div className="h-12 w-12 bg-gray-50 rounded-full flex items-center justify-center">
                             <Package className="h-6 w-6 text-gray-200" />
                           </div>
                           <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest text-center">Indica los materiales consumidos<br/>del inventario para este lote</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {batchInsumos.map((item, idx) => (
                            <div key={idx} className="group bg-white rounded-xl p-4 border border-gray-100 hover:border-emerald-200 transition-all flex justify-between items-center shadow-sm">
                              <div className="flex items-center gap-3">
                                 <div className="bg-emerald-50 p-2 rounded-lg group-hover:bg-emerald-500 transition-colors">
                                   <Package className="h-4 w-4 text-emerald-600 group-hover:text-white transition-colors" />
                                 </div>
                                 <div>
                                   <div className="font-bold text-gray-900 text-md">{item.nombre}</div>
                                   <div className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter">CONSUMO: {item.cantidad} UNIDADES</div>
                                 </div>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 text-red-300 hover:text-red-500 hover:bg-red-50"
                                onClick={() => setBatchInsumos(batchInsumos.filter((_, i) => i !== idx))}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                   </div>
                </div>

                {/* COSTO TOTAL INSUMOS */}
                <Card className="border-none shadow-xl bg-gray-900 text-white overflow-hidden ring-1 ring-white/10 mt-auto">
                   <div className="px-6 py-6 flex flex-col items-center justify-center text-center relative h-full">
                      <div className="absolute inset-0 bg-blue-600/5 opacity-50 blur-3xl rounded-full translate-y-12"></div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-1">Inversión Total en Materiales</p>
                      <h2 className="text-3xl font-black mb-1">Bs {formatPrice(totalCostBs)}</h2>
                      <p className="text-xs font-bold text-gray-400">
                        ≈ $ {formatPrice(totalCostBs / dolarPrice || 0)}
                      </p>
                      <div className="mt-4 flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Sincronizado con Inventario</span>
                      </div>
                   </div>
                </Card>
              </div>
            </div>
          </div>

          <DialogFooter className="bg-white border-t p-6 shrink-0 shadow-inner flex flex-col-reverse sm:flex-row gap-3">
            <Button variant="outline" size="lg" onClick={() => setIsBatchDialogOpen(false)} className="font-bold border-2 h-12">
              <X className="mr-2 h-4 w-4" />
              Cancelar Registro
            </Button>
            <Button 
                onClick={handleSaveBatch} 
                className="bg-indigo-600 hover:bg-indigo-700 shadow-xl font-black text-md h-12 px-10 border-b-4 border-indigo-950 active:border-b-0 active:translate-y-1 transition-all"
            >
              <Save className="mr-2 h-5 w-5" />
              Finalizar Registro de Lote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
