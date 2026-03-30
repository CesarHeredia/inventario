import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
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
  ArrowLeft,
  Plus,
  Tag,
  Trash2,
  Edit,
  Search,
  Package,
  Briefcase,
  Layers,
  ShoppingBag,
  CheckCircle,
  XCircle,
  LogOut,
  User as UserIcon,
  UserCog,
  Star,
  Zap
} from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

interface ComboItem {
  id: string;
  nombre: string;
  tipo: 'venta' | 'servicio';
  cantidad: number;
  precioBase: number;
}

interface Combo {
  id: string;
  nombre: string;
  items: ComboItem[];
  precioCombo: number;
  activa: boolean;
  fechaCreacion: string;
  usuarioId: string; // ID del Jefe dueño
}

interface Product {
  id: string;
  nombre: string;
  precioVenta: number;
  categoria: string;
  usuarioId: string;
}

interface Service {
  id: string;
  nombre: string;
  precioVenta: number;
  categoria: string;
  usuarioId: string;
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

export function Promociones() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  
  // Dialog states
  const [isComboDialogOpen, setIsComboDialogOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState<Combo | null>(null);
  
  // Form states
  const [comboName, setComboName] = useState("");
  const [comboPrice, setComboPrice] = useState("");
  const [selectedItems, setSelectedItems] = useState<ComboItem[]>([]);
  
  // Selector states
  const [selectedType, setSelectedType] = useState<'venta' | 'servicio'>('venta');
  const [selectedItemId, setSelectedItemId] = useState("");
  const [itemQuantity, setItemQuantity] = useState("1");

  useEffect(() => {
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
      setUser(JSON.parse(currentUser));
      loadData();
    } else {
      navigate('/login');
    }
  }, []);

  const loadData = () => {
    const storedUser = localStorage.getItem('currentUser');
    const parsedUser = JSON.parse(storedUser || '{}');
    const ownerId = String(parsedUser.rol === 'trabajador' ? parsedUser.jefeId : parsedUser.id || '');

    const savedProducts = localStorage.getItem('products');
    if (savedProducts) {
      const allProducts = JSON.parse(savedProducts);
      setProducts(allProducts.filter((p: any) => String(p.usuarioId) === ownerId));
    }
    
    const savedServices = localStorage.getItem('services');
    if (savedServices) {
      const allServices = JSON.parse(savedServices);
      setServices(allServices.filter((s: any) => String(s.usuarioId) === ownerId));
    }
    
    const savedCombos = localStorage.getItem('combos');
    if (savedCombos) {
      const allCombos = JSON.parse(savedCombos);
      setCombos(allCombos.filter((c: any) => String(c.usuarioId) === ownerId));
    }
  };

  const saveCombos = (updatedCombos: Combo[]) => {
    setCombos(updatedCombos);
    const allCombos = JSON.parse(localStorage.getItem('combos') || '[]');
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const ownerId = String(currentUser.rol === 'trabajador' ? currentUser.jefeId : currentUser.id || '');

    const filteredOthers = allCombos.filter((c: any) => String(c.usuarioId) !== ownerId);
    localStorage.setItem('combos', JSON.stringify([...filteredOthers, ...updatedCombos]));
  };

  const handleAddItemToCombo = () => {
    if (!selectedItemId) return;

    const item = selectedType === 'venta' 
      ? products.find(p => p.id === selectedItemId)
      : services.find(s => s.id === selectedItemId);
      
    if (!item) return;

    const existing = selectedItems.find(i => i.id === selectedItemId && i.tipo === selectedType);
    if (existing) {
      toast.error("Este item ya está en el combo");
      return;
    }

    const newItem: ComboItem = {
      id: item.id,
      nombre: item.nombre,
      tipo: selectedType,
      cantidad: parseInt(itemQuantity) || 1,
      precioBase: item.precioVenta || 0
    };

    setSelectedItems([...selectedItems, newItem]);
    setSelectedItemId("");
    setItemQuantity("1");
    toast.success("Item añadido al combo");
  };

  const handleRemoveItemFromCombo = (id: string, tipo: string) => {
    setSelectedItems(selectedItems.filter(i => !(i.id === id && i.tipo === tipo)));
  };

  const handleUpdateItemQuantity = (id: string, tipo: string, newQty: number) => {
    if (newQty < 1) return;
    setSelectedItems(selectedItems.map(item => 
      (item.id === id && item.tipo === tipo) ? { ...item, cantidad: newQty } : item
    ));
  };

  const handleSaveCombo = () => {
    if (!comboName || !comboPrice || selectedItems.length === 0) {
      toast.error("Completa todos los campos y añade al menos un item");
      return;
    }

    const ownerId = String(user?.rol === 'trabajador' ? user?.jefeId : user?.id || '');
    const newCombo: Combo = {
      id: editingCombo?.id || Date.now().toString(),
      nombre: comboName,
      items: selectedItems,
      precioCombo: parseFloat(comboPrice),
      activa: editingCombo ? editingCombo.activa : true,
      fechaCreacion: editingCombo?.fechaCreacion || new Date().toISOString(),
      usuarioId: String(editingCombo?.usuarioId || ownerId), // DUEÑO (String)
    };

    let updatedCombos;
    if (editingCombo) {
      updatedCombos = combos.map(c => c.id === editingCombo.id ? newCombo : c);
      toast.success("Combo actualizado exitosamente");
    } else {
      // VALIDACIÓN DE LÍMITES PARA NUEVOS COMBOS
      const currentLimit = user?.limiteCombos || 5;
      if (combos.length >= currentLimit) {
        toast.error(`Has alcanzado el límite de ${currentLimit} combos. ¡Mejora tu plan para agregar más!`);
        return;
      }
      updatedCombos = [...combos, newCombo];
      toast.success("¡Nuevo combo creado!");
    }

    saveCombos(updatedCombos);
    setIsComboDialogOpen(false);
    resetForm();
  };

  const handleDeleteCombo = (id: string) => {
    if (confirm("¿Estás seguro de eliminar este combo?")) {
      const updated = combos.filter(c => c.id !== id);
      saveCombos(updated);
      toast.success("Combo eliminado");
    }
  };

  const handleToggleCombo = (combo: Combo) => {
    const updated = combos.map(c => c.id === combo.id ? { ...c, activa: !c.activa } : c);
    saveCombos(updated);
    toast.success(`Combo ${!combo.activa ? 'activado' : 'desactivado'}`);
  };

  const resetForm = () => {
    setComboName("");
    setComboPrice("");
    setSelectedItems([]);
    setEditingCombo(null);
    setSelectedItemId("");
    setItemQuantity("1");
  };

  const handleEditCombo = (combo: Combo) => {
    setEditingCombo(combo);
    setComboName(combo.nombre);
    setComboPrice(combo.precioCombo.toString());
    setSelectedItems(combo.items);
    setIsComboDialogOpen(true);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const totalBasePrice = selectedItems.reduce((acc, item) => acc + (item.precioBase * item.cantidad), 0);
  const savings = totalBasePrice - (parseFloat(comboPrice) || 0);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4 gap-3">
            <div className="flex-1 flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-2 rounded-lg text-white">
                  <Star className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="font-bold text-lg">Promociones y Combos</h1>
                  <p className="text-sm text-gray-500">{user.nombreEmpresa}</p>
                </div>
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="bg-blue-600 hover:bg-blue-700 text-white border-2 border-blue-700 font-bold h-10 w-10 p-0 rounded-full">
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
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/perfil')}><UserIcon className="mr-2 h-4 w-4" /> Perfil</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/trabajadores')}><UserCog className="mr-2 h-4 w-4" /> Trabajadores</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { localStorage.removeItem('currentUser'); navigate('/login'); }} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" /> Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Gestión de Combos</h2>
            <p className="text-gray-500 italic">Crea paquetes atractivos para tus clientes</p>
          </div>
          <Button 
            onClick={() => { 
              const currentLimit = user?.limiteCombos || 5;
              if (combos.length >= currentLimit) {
                toast.error(`Has alcanzado el límite de ${currentLimit} combos. ¡Mejora tu plan para agregar más!`);
                return;
              }
              resetForm(); 
              setIsComboDialogOpen(true); 
            }} 
            className="bg-indigo-600 hover:bg-indigo-700 h-11 px-6 font-bold shadow-lg shadow-indigo-100"
          >
            <Plus className="mr-2 h-5 w-5" /> Nuevo Combo
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {combos.length === 0 ? (
            <div className="col-span-full bg-white border-2 border-dashed border-gray-200 rounded-2xl py-20 text-center">
              <ShoppingBag className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No hay combos creados</h3>
              <p className="text-gray-500 mt-1">Empieza creando tu primer paquete promocional</p>
            </div>
          ) : (
            combos.map((combo) => (
              <Card key={combo.id} className={`overflow-hidden border-2 transition-all hover:shadow-xl ${combo.activa ? 'border-indigo-100' : 'border-gray-100 opacity-75 grayscale'}`}>
                <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 pb-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${combo.activa ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-500'}`}>
                        <Star className="h-4 w-4" />
                      </div>
                      <CardTitle className="text-lg font-bold truncate max-w-[150px]">{combo.nombre}</CardTitle>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleToggleCombo(combo)}>
                        {combo.activa ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-gray-400" />}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEditCombo(combo)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:text-red-500" onClick={() => handleDeleteCombo(combo.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Contenido del Combo:</p>
                    <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                      {combo.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm py-1 border-b border-gray-50 last:border-0">
                          <span className="text-gray-600 truncate mr-2 flex items-center gap-1">
                            {item.tipo === 'venta' ? <Package className="h-3 w-3 inline text-blue-500" /> : <Briefcase className="h-3 w-3 inline text-purple-500" />}
                            {item.cantidad}x {item.nombre}
                          </span>
                          <span className="text-gray-400">$ {formatPrice(item.precioBase)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-4 border-t border-gray-100 flex flex-col gap-1">
                       <div className="flex justify-between items-center">
                          <p className="text-xs text-gray-500 font-medium">Precio Regular:</p>
                          <p className="text-xs text-gray-400 line-through">$ {formatPrice(combo.items.reduce((acc, i) => acc + (i.precioBase * i.cantidad), 0))}</p>
                       </div>
                       <div className="flex justify-between items-end">
                          <p className="font-bold text-gray-900">Precio Combo:</p>
                          <p className="text-2xl font-black text-indigo-600">$ {formatPrice(combo.precioCombo)}</p>
                       </div>
                       <div className="mt-2 py-1 bg-green-50 rounded text-center">
                          <p className="text-[10px] font-bold text-green-700 uppercase">Ahorro: $ {formatPrice(combo.items.reduce((acc, i) => acc + (i.precioBase * i.cantidad), 0) - combo.precioCombo)}</p>
                       </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>

      <Dialog open={isComboDialogOpen} onOpenChange={setIsComboDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
               <Layers className="h-6 w-6 text-indigo-600" />
               {editingCombo ? 'Editar Combo Promocional' : 'Crear Nuevo Combo'}
            </DialogTitle>
            <DialogDescription>
              Configura un paquete de productos y servicios con un precio especial único.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-6">
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="comboName" className="font-bold">Nombre del Combo *</Label>
                  <Input 
                    id="comboName" 
                    placeholder="Ej: Pack Bienvenida, Combo Verano..." 
                    value={comboName}
                    onChange={(e) => setComboName(e.target.value)}
                    maxLength={100}
                    className="h-11 border-gray-300 focus:ring-indigo-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="comboPrice" className="font-bold text-indigo-700">Precio Total del Combo ($) *</Label>
                  <div className="relative">
                    <Star className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-400" />
                    <Input 
                      id="comboPrice" 
                      type="number"
                      placeholder="0.00" 
                      value={comboPrice}
                      onChange={(e) => setComboPrice(e.target.value)}
                      onInput={(e) => {
                        if (e.currentTarget.value.length > 100) {
                          e.currentTarget.value = e.currentTarget.value.slice(0, 100);
                        }
                      }}
                      className="h-12 pl-10 text-lg font-black bg-indigo-50/50 border-indigo-200 text-indigo-700"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border-2 border-dashed border-gray-200 space-y-4">
                <h3 className="font-bold text-sm text-gray-700 flex items-center gap-2">
                   <Plus className="h-4 w-4" /> Añadir items al combo:
                </h3>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex gap-2">
                    <Button 
                      variant={selectedType === 'venta' ? 'default' : 'outline'} 
                      onClick={() => { setSelectedType('venta'); setSelectedItemId(""); }}
                      className="flex-1"
                    >
                      <Package className="mr-2 h-4 w-4" /> Productos
                    </Button>
                    <Button 
                      variant={selectedType === 'servicio' ? 'default' : 'outline'} 
                      onClick={() => { setSelectedType('servicio'); setSelectedItemId(""); }}
                      className="flex-1"
                    >
                      <Briefcase className="mr-2 h-4 w-4" /> Servicios
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder={`Selecciona un ${selectedType === 'venta' ? 'producto' : 'servicio'}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {(selectedType === 'venta' ? products : services).map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.nombre} - ${formatPrice(item.precioVenta)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2">
                    <div className="w-1/3">
                      <Input 
                        type="number" 
                        value={itemQuantity} 
                        onChange={(e) => setItemQuantity(e.target.value)}
                        min="1"
                        className="h-11"
                      />
                    </div>
                    <Button onClick={handleAddItemToCombo} disabled={!selectedItemId} className="flex-1 h-11 bg-gray-900">
                      Añadir al combo
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 flex flex-col h-[400px]">
              <div className="p-4 bg-gray-50 border-b border-gray-100 rounded-t-xl">
                 <h3 className="font-bold text-gray-900 flex items-center justify-between">
                    Resumen del Combo
                    <span className="text-xs font-normal text-gray-500">{selectedItems.length} items agregados</span>
                 </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {selectedItems.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 italic text-sm">
                    <Zap className="h-8 w-8 mb-2 opacity-20" />
                    No has añadido items todavía
                  </div>
                ) : (
                  selectedItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-white border border-gray-100 rounded-lg group hover:border-indigo-200 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded ${item.tipo === 'venta' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                           {item.tipo === 'venta' ? <Package className="h-4 w-4" /> : <Briefcase className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-gray-900">{item.nombre}</p>
                          <div className="flex items-center gap-2 mt-1">
                             <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={() => handleUpdateItemQuantity(item.id, item.tipo, item.cantidad - 1)}>
                               <Plus className="h-3 w-3 rotate-45" />
                             </Button>
                             <span className="text-xs font-bold w-4 text-center">{item.cantidad}</span>
                             <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={() => handleUpdateItemQuantity(item.id, item.tipo, item.cantidad + 1)}>
                               <Plus className="h-3 w-3" />
                             </Button>
                             <span className="text-[10px] text-gray-400 ml-1">• $ {formatPrice(item.precioBase * item.cantidad)}</span>
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500" onClick={() => handleRemoveItemFromCombo(item.id, item.tipo)}>
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
              <div className="p-4 bg-indigo-50 border-t border-indigo-100 rounded-b-xl space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-indigo-900">Valor real del mercado:</span>
                  <span className="font-medium text-indigo-900">$ {formatPrice(totalBasePrice)}</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span className="font-black text-indigo-900">Total Combo:</span>
                  <span className="font-black text-indigo-900">$ {formatPrice(parseFloat(comboPrice) || 0)}</span>
                </div>
                {savings > 0 && (
                  <div className="flex justify-center pt-1">
                    <span className="text-[10px] font-bold bg-green-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                      ¡AHORRO DE $ {formatPrice(savings)}!
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-gray-100 pt-6">
            <Button variant="outline" onClick={() => setIsComboDialogOpen(false)} className="h-11 px-8">Cancelar</Button>
            <Button onClick={handleSaveCombo} className="bg-indigo-600 hover:bg-indigo-700 h-11 px-10 font-bold">
              {editingCombo ? 'Actualizar Combo' : 'Crear y Publicar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
