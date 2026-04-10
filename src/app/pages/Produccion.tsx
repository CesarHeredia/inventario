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
    const existingService = services.find(s => s.nombre.toLowerCase() === selectedBatchService.toLowerCase());
    const serviceName = existingService ? existingService.nombre : selectedBatchService;
    const serviceCategory = batchCategory || (existingService ? existingService.categoria : 'General');
    
    if (serviceName && batchServiceQuantity) {
      const qty = parseInt(batchServiceQuantity);
      let price = 0;
      if (batchPriceMode === 'unique') {
        price = parseFloat(batchSpecificPrice) || 0;
      } else {
        price = parseFloat(batchGlobalPrice) || 0;
      }

      setBatchProducedItems([...batchProducedItems, { 
        id: existingService ? existingService.id : `new-${Date.now()}`, 
        nombre: serviceName, 
        categoria: serviceCategory,
        cantidad: qty, 
        costo: existingService ? existingService.costo : 0,
        precioVenta: price,
        monedaVenta: batchCurrency
      }]);
      setSelectedBatchService("");
      setBatchCategory("");
      setBatchServiceQuantity("1");
      setBatchSpecificPrice("");
      toast.success('Servicio añadido al lote');
    }
  };

  const handleAddInsumoToBatch = () => {
    const product = products.find(p => p.id === selectedBatchInsumo);
    if (product && batchInsumoQuantity) {
      const qty = parseFloat(batchInsumoQuantity);
      if (qty > product.cantidad) {
        toast.error(`Stock insuficiente. Solo hay ${product.cantidad} disponible`);
        return;
      }
      setBatchInsumos([...batchInsumos, { 
        productoId: product.id, 
        nombre: product.nombre, 
        cantidad: qty 
      }]);
      setSelectedBatchInsumo("");
      setBatchInsumoQuantity("");
      toast.success('Insumo añadido al lote');
    }
  };

  const handleSaveBatch = async () => {
    if (batchProducedItems.length === 0) {
      toast.error('Debes agregar al menos un servicio producido');
      return;
    }

    const ownerId = String((user?.rol === 'trabajador' || user?.rol === 'subjefe') ? user?.jefeId : user?.id || '');
    
    // Calculo de costo total para el historial
    const totalCost = batchInsumos.reduce((acc, i) => {
        const p = products.find(prod => prod.id === i.productoId);
        if (!p) return acc;
        const costInBs = p.monedaCompra === 'Bs' ? p.precioCompra : p.precioCompra * dolarPrice;
        return acc + (costInBs * i.cantidad);
    }, 0);

    const groupedProducedItems: any[] = [];
    batchProducedItems.forEach(item => {
      const finalPrice = batchPriceMode === 'unique' ? parseFloat(batchGlobalPrice) : item.precioVenta;
      groupedProducedItems.push({
        nombreServicio: item.nombre,
        categoria: item.categoria,
        costoBolivares: item.costo,
        precioVenta: finalPrice,
        monedaVenta: batchCurrency,
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
      insumos: batchInsumos.map(i => ({ productoId: i.productoId, cantidad: i.cantidad })),
      costoTotal: totalCost
    };

    try {
      await api.addBatchServicio(batchData);
      toast.success('Lote de producción guardado correctamente');
      setIsBatchDialogOpen(false);
      resetBatchForm();
      refreshData();
    } catch (error) {
      toast.error('Error al guardar el lote de producción');
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
  };

  const filteredProductions = productions.filter(p => {
    const details = p.detalles;
    const names = details.servicios.map(s => s.nombreServicio).join(" ").toLowerCase();
    return names.includes(searchTerm.toLowerCase()) || p.fecha.includes(searchTerm);
  });

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-100 pb-12">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/dashboard')}
                className="hover:bg-indigo-50 hover:text-indigo-600"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-indigo-900 flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Producción
                </h1>
                <p className="text-xs text-indigo-500 font-semibold uppercase">{user.nombreEmpresa}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => {
                  resetBatchForm();
                  setIsBatchDialogOpen(true);
                }} 
                className="bg-indigo-600 hover:bg-indigo-700"
                size="sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nueva Producción
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-9 w-9 p-0 rounded-full border-2 border-indigo-200">
                    <UserIcon className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/perfil')}>Perfil</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    sessionStorage.removeItem('currentUser');
                    navigate('/login');
                  }}>Cerrar Sesión</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Table Context */}
      <main className="max-w-7xl mx-auto px-4 mt-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-none shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase opacity-80">Total Producciones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black">{productions.length}</div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm border-2 border-indigo-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase text-gray-400">Items Producidos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-indigo-900">
                {productions.reduce((acc, p) => acc + p.detalles.servicios.reduce((sAcc: any, s: any) => sAcc + parseInt(s.cantidad), 0), 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* History Table */}
        <Card className="shadow-lg border-t-4 border-indigo-600">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-indigo-600" />
                Historial de Lotes
              </CardTitle>
              <CardDescription>Registro cronológico de todas las producciones realizadas</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Buscar por lote o fecha..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col items-center py-12 gap-3">
                <div className="h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-indigo-600 font-bold animate-pulse">Cargando historial...</p>
              </div>
            ) : filteredProductions.length === 0 ? (
              <div className="text-center py-12">
                <Layers className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No se han encontrado producciones.</p>
              </div>
            ) : (
              <div className="rounded-md border border-gray-100 overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="font-bold">Fecha / ID</TableHead>
                      <TableHead className="font-bold">Items Producidos</TableHead>
                      <TableHead className="font-bold">Insumos Usados</TableHead>
                      <TableHead className="font-bold text-right">Costo Total</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProductions.map((p) => (
                      <TableRow key={p.id} className="hover:bg-indigo-50/30 transition-colors">
                        <TableCell>
                          <div className="font-bold text-indigo-900">{new Date(p.fecha).toLocaleDateString()}</div>
                          <div className="text-[10px] text-gray-400 tracking-tighter">ID: #{p.id}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {p.detalles.servicios.map((s, idx) => (
                              <span key={idx} className="bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                                {s.cantidad}x {s.nombreServicio}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-gray-600">
                             {p.detalles.insumos.length} materiales diferentes
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-black text-indigo-600">Bs {formatPrice(p.costoTotal)}</div>
                          <div className="text-[10px] text-gray-400">$ {(p.costoTotal / dolarPrice).toFixed(2)}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => setSelectedProduction(p)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
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

      {/* Details View Dialog */}
      <Dialog open={!!selectedProduction} onOpenChange={() => setSelectedProduction(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-indigo-900 flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Detalles de Producción #{selectedProduction?.id}
            </DialogTitle>
            <DialogDescription>Realizada el {selectedProduction && new Date(selectedProduction.fecha).toLocaleString()}</DialogDescription>
          </DialogHeader>
          
          {selectedProduction && (
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <h4 className="font-black text-xs uppercase text-indigo-600 flex items-center gap-2">
                  <Package className="h-3 w-3" /> Items Creados
                </h4>
                <div className="bg-indigo-50 rounded-lg p-3 space-y-1">
                  {selectedProduction.detalles.servicios.map((s, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="font-bold text-indigo-900">{s.nombreServicio}</span>
                      <span className="font-black">x{s.cantidad}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-black text-xs uppercase text-blue-600 flex items-center gap-2">
                  <Layers className="h-3 w-3" /> Materiales Consumidos
                </h4>
                <div className="bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto border border-dashed border-blue-200">
                  {selectedProduction.detalles.insumos.length > 0 ? (
                    selectedProduction.detalles.insumos.map((ins, i) => (
                      <div key={i} className="flex justify-between text-xs py-1 border-b border-gray-100 last:border-0">
                        <span className="text-gray-600">{ins.nombre || `ID: ${ins.productoId}`}</span>
                        <span className="font-bold">x{ins.cantidad}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400 italic">No se reportaron insumos.</p>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t flex justify-between items-center">
                <span className="font-bold text-indigo-900">Inversión Final:</span>
                <span className="text-xl font-black text-indigo-600">Bs {formatPrice(selectedProduction.costoTotal)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Production Batch Dialog (The "Nueva Producción" Tool) */}
      <Dialog open={isBatchDialogOpen} onOpenChange={setIsBatchDialogOpen}>
        <DialogContent className="sm:max-w-[75vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-700">
              <Layers className="h-6 w-6" />
              Nueva Producción por Lote
            </DialogTitle>
            <DialogDescription>
              Crea stock para servicios descontando automáticamente los insumos usados del inventario.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            {/* Produced Items */}
            <div className="space-y-4 border-r pr-0 md:pr-4 border-gray-200">
              <h3 className="font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
                <Package className="h-4 w-4 text-indigo-600" />
                1. ¿Qué se produjo en este lote?
              </h3>
              
              <div className="bg-gray-100 p-3 rounded-lg border border-gray-300 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-gray-500">Moneda de Venta</Label>
                    <select 
                      className="w-full h-9 px-2 rounded-md border text-sm bg-white"
                      value={batchCurrency}
                      onChange={(e) => setBatchCurrency(e.target.value as 'Bs' | '$')}
                    >
                      <option value="$">Dólares ($)</option>
                      <option value="Bs">Bolívares (Bs)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-gray-500">Modo de Precio</Label>
                    <select 
                      className="w-full h-9 px-2 rounded-md border text-sm bg-white"
                      value={batchPriceMode}
                      onChange={(e) => setBatchPriceMode(e.target.value as 'unique' | 'individual')}
                    >
                      <option value="individual">Precio único para todo el lote</option>
                      <option value="unique">Precio específico por item</option>
                    </select>
                  </div>
                </div>

                {batchPriceMode === 'individual' && (
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-gray-500">Precio de Venta</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                        {batchCurrency === 'Bs' ? 'Bs' : '$'}
                      </span>
                      <Input 
                        type="number" 
                        placeholder="0.00"
                        value={batchGlobalPrice}
                        onChange={(e) => setBatchGlobalPrice(e.target.value)}
                        className="pl-8 h-9"
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 items-end bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs font-bold">Seleccionar Servicio</Label>
                  <Input
                    placeholder="Escriba o busque..."
                    list="prod-services-list"
                    value={selectedBatchService}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedBatchService(val);
                      const existing = services.find(s => s.nombre.toLowerCase() === val.toLowerCase());
                      if (existing) setBatchCategory(existing.categoria);
                    }}
                    className="h-9 bg-white"
                  />
                  <datalist id="prod-services-list">
                    {services.map(s => (
                      <option key={s.id} value={s.nombre}>Stock actual: {s.cantidad}</option>
                    ))}
                  </datalist>
                </div>
                <div className="w-16 space-y-1">
                  <Label className="text-xs font-bold text-center block">Cant.</Label>
                  <Input 
                    type="number" 
                    value={batchServiceQuantity} 
                    onChange={(e) => setBatchServiceQuantity(e.target.value)} 
                    className="h-9 text-center bg-white"
                  />
                </div>
                
                {batchPriceMode === 'unique' && (
                  <div className="w-24 space-y-1">
                    <Label className="text-xs font-bold text-center block">Precio</Label>
                    <div className="relative">
                      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold">
                        {batchCurrency}
                      </span>
                      <Input 
                        type="number" 
                        placeholder="0.00"
                        value={batchSpecificPrice} 
                        onChange={(e) => setBatchSpecificPrice(e.target.value)} 
                        className="h-9 text-xs pl-6 bg-white"
                      />
                    </div>
                  </div>
                )}

                <Button onClick={handleAddServiceToBatch} size="sm" className="h-9 bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* List of Added Items */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {batchProducedItems.map((item, idx) => (
                  <div key={idx} className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm flex justify-between items-center">
                    <div>
                      <div className="font-bold text-indigo-900">{item.nombre}</div>
                      <div className="text-[10px] text-gray-500 uppercase">
                        Cant: {item.cantidad} • Ctd: {item.costo > 0 ? `Bs ${formatPrice(item.costo)}` : 'N/A'}
                        {batchPriceMode === 'unique' && ` • Precio: ${batchCurrency} ${item.precioVenta}`}
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 text-red-500 hover:bg-red-50"
                      onClick={() => setBatchProducedItems(batchProducedItems.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Insumos */}
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
                <Package className="h-4 w-4 text-emerald-600" />
                2. ¿Qué insumos se gastaron?
              </h3>

              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Material / Producto</Label>
                  <select
                    className="w-full px-3 py-2 border rounded-md text-sm"
                    value={selectedBatchInsumo}
                    onChange={(e) => setSelectedBatchInsumo(e.target.value)}
                  >
                    <option value="">Seleccionar...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre} ({p.cantidad} en stock)</option>
                    ))}
                  </select>
                </div>
                <div className="w-20 space-y-1">
                  <Label className="text-xs">Cant.</Label>
                  <Input 
                    type="number" 
                    value={batchInsumoQuantity} 
                    onChange={(e) => setBatchInsumoQuantity(e.target.value)} 
                    className="h-9"
                  />
                </div>
                <Button onClick={handleAddInsumoToBatch} size="sm" className="h-9 bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="bg-emerald-50 rounded-lg p-3 space-y-2 border border-emerald-100 min-h-[100px]">
                {batchInsumos.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <span className="font-medium text-emerald-900">{item.cantidad} de {item.nombre}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 p-0 text-red-500"
                      onClick={() => setBatchInsumos(batchInsumos.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
              
              <Card className="bg-indigo-900 text-white border-none shadow-lg mt-4">
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between items-center border-b border-indigo-800 pb-2">
                    <span className="text-xs font-bold uppercase opacity-70">Inversión Estimada (Insumos)</span>
                    <Package className="h-4 w-4 opacity-50" />
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xl font-black">Bs {formatPrice(batchInsumos.reduce((acc, i) => {
                          const p = products.find(prod => prod.id === i.productoId);
                          if (!p) return acc;
                          const costInBs = p.monedaCompra === 'Bs' ? p.precioCompra : p.precioCompra * dolarPrice;
                          return acc + (costInBs * i.cantidad);
                      }, 0))}</p>
                      <p className="text-[10px] opacity-70">Sujeto a cambios por tasa del día</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold opacity-90">$ {formatPrice(batchInsumos.reduce((acc, i) => {
                          const p = products.find(prod => prod.id === i.productoId);
                          if (!p) return acc;
                          const costInUsd = p.monedaCompra === '$' ? p.precioCompra : p.precioCompra / dolarPrice;
                          return acc + (costInUsd * i.cantidad);
                      }, 0))}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <DialogFooter className="bg-gray-50 -mx-6 -mb-6 p-6 rounded-b-lg">
            <Button variant="outline" onClick={() => setIsBatchDialogOpen(false)}>
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button onClick={handleSaveBatch} className="bg-indigo-600 hover:bg-indigo-700 shadow-md">
              <Save className="mr-2 h-4 w-4" />
              Finalizar Registro de Lote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
