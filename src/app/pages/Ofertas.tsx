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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import {
  ArrowLeft,
  Plus,
  Tag,
  Trash2,
  Edit,
  Search,
  Package,
  Briefcase,
  CheckCircle,
  XCircle,
  LogOut,
  User as UserIcon,
  UserCog,
  Percent,
  Zap,
  Settings2
} from "lucide-react";
import { toast } from "sonner";

interface Oferta {
  tipo: 'descuento';
  valor: number;
  activa: boolean;
}

interface Item {
  id: string;
  nombre: string;
  categoria: string;
  precioVenta: number;
  tipo: 'venta' | 'servicio';
  oferta?: Oferta;
  usuarioId: string; // ID del Jefe dueño
}

interface User {
  id?: string;
  usuario: string;
  nombre: string;
  apellido: string;
  nombreEmpresa: string;
  rol: 'admin' | 'jefe' | 'trabajador';
  jefeId?: string;
}

export function Ofertas() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Item[]>([]);
  const [services, setServices] = useState<Item[]>([]);
  
  // Dialog states
  const [isOfferDialogOpen, setIsOfferDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  
  // Search states
  const [searchTerm, setSearchTerm] = useState("");
  
  // Form states
  const [formData, setFormData] = useState<Oferta>({
    tipo: 'descuento',
    valor: 0,
    activa: true,
  });

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
    if (!storedUser) {
      navigate('/login');
      return;
    }
    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);
    const ownerId = String(parsedUser.rol === 'trabajador' ? parsedUser.jefeId : parsedUser.id || '');

    // Cargar productos (Filtrados por dueño o huérfanos)
    const savedProducts = localStorage.getItem('products');
    if (savedProducts) {
      const allProducts = JSON.parse(savedProducts);
      setProducts(allProducts.filter((p: any) => String(p.usuarioId) === ownerId));
    }
    
    // Cargar servicios (Filtrados por dueño o huérfanos)
    const savedServices = localStorage.getItem('services');
    if (savedServices) {
      const allServices = JSON.parse(savedServices);
      setServices(allServices.filter((s: any) => String(s.usuarioId) === ownerId));
    }
  };

  const saveItems = (updatedItems: Item[], type: 'venta' | 'servicio') => {
    const key = type === 'venta' ? 'products' : 'services';
    const allItems = JSON.parse(localStorage.getItem(key) || '[]');
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const ownerId = String(currentUser.rol === 'trabajador' ? currentUser.jefeId : currentUser.id || '');

    const filteredOthers = allItems.filter((i: any) => String(i.usuarioId) !== ownerId);
    localStorage.setItem(key, JSON.stringify([...filteredOthers, ...updatedItems]));
    
    if (type === 'venta') setProducts(updatedItems);
    else setServices(updatedItems);
  };

  const handleOpenOfferDialog = (item: Item) => {
    setSelectedItem(item);
    if (item.oferta) {
      setFormData({
        tipo: 'descuento',
        valor: item.oferta.valor,
        activa: item.oferta.activa,
      });
    } else {
      setFormData({
        tipo: 'descuento',
        valor: 0,
        activa: true,
      });
    }
    setIsOfferDialogOpen(true);
  };

  const handleSaveOffer = () => {
    if (!selectedItem) return;

    const updatedItem = {
      ...selectedItem,
      oferta: { ...formData }
    };

    const currentItems = selectedItem.tipo === 'venta' ? products : services;
    const updatedItems = currentItems.map(item => item.id === selectedItem.id ? updatedItem : item);
    
    saveItems(updatedItems, selectedItem.tipo);

    toast.success(`Oferta configurada para ${selectedItem.nombre}`);
    setIsOfferDialogOpen(false);
  };

  const handleToggleOffer = (item: Item) => {
    if (!item.oferta) return;

    const updatedItem = {
      ...item,
      oferta: { ...item.oferta, activa: !item.oferta.activa }
    };

    const currentItems = item.tipo === 'venta' ? products : services;
    const updatedItems = currentItems.map(i => i.id === item.id ? updatedItem : i);
    
    saveItems(updatedItems, item.tipo);

    toast.success(`Oferta ${!item.oferta.activa ? 'activada' : 'desactivada'} para ${item.nombre}`);
  };

  const handleRemoveOffer = (item: Item) => {
    if (confirm(`¿Eliminar la oferta de ${item.nombre}?`)) {
      const { oferta, ...rest } = item;
      const itemWithoutOffer: Item = { ...rest };
      
      const currentItems = item.tipo === 'venta' ? products : services;
      const updatedItems = currentItems.map(i => i.id === item.id ? itemWithoutOffer : i);
      
      saveItems(updatedItems, item.tipo);
      toast.info('Oferta eliminada');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  if (!user) return null;

  const filterItems = (list: Item[]) => list.filter(item => 
    item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.categoria.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                <div className="bg-gradient-to-br from-pink-500 to-rose-600 p-2 rounded-lg text-white">
                  <Percent className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="font-bold text-lg">Ofertas Individuales</h1>
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
                <DropdownMenuLabel className="font-bold">
                  {user.nombre} {user.apellido}
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
        <div className="mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Buscar por nombre o categoría..." 
              className="pl-10 h-11"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-4">
             <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
                <Zap className="h-8 w-8 text-rose-500" />
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase">Items en Oferta</p>
                  <p className="text-xl font-bold">{[...products, ...services].filter(i => i.oferta?.activa).length}</p>
                </div>
             </div>
          </div>
        </div>

        <Tabs defaultValue="productos" className="space-y-6">
          <TabsList className="bg-white border text-gray-500 p-1 h-12">
            <TabsTrigger value="productos" className="px-6 data-[state=active]:text-rose-600 data-[state=active]:bg-rose-50 h-10">
              <Package className="mr-2 h-4 w-4" /> Productos
            </TabsTrigger>
            <TabsTrigger value="servicios" className="px-6 data-[state=active]:text-purple-600 data-[state=active]:bg-purple-50 h-10">
              <Briefcase className="mr-2 h-4 w-4" /> Servicios
            </TabsTrigger>
          </TabsList>

          <TabsContent value="productos">
            <ItemTable 
              items={filterItems(products)} 
              onManageOffer={handleOpenOfferDialog} 
              onToggleOffer={handleToggleOffer}
              onRemoveOffer={handleRemoveOffer}
              formatPrice={formatPrice}
            />
          </TabsContent>

          <TabsContent value="servicios">
            <ItemTable 
              items={filterItems(services)} 
              onManageOffer={handleOpenOfferDialog} 
              onToggleOffer={handleToggleOffer}
              onRemoveOffer={handleRemoveOffer}
              formatPrice={formatPrice}
            />
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={isOfferDialogOpen} onOpenChange={setIsOfferDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configurar Oferta</DialogTitle>
            <DialogDescription>
              Establece un descuento para <strong>{selectedItem?.nombre}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="valor">
                Porcentaje de Descuento (%)
              </Label>
              <Input 
                id="valor"
                type="number"
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: parseFloat(e.target.value) || 0 })}
                onInput={(e) => {
                  if (e.currentTarget.value.length > 100) {
                    e.currentTarget.value = e.currentTarget.value.slice(0, 100);
                  }
                }}
                placeholder="0"
                className="h-11 border-rose-200 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <input 
                type="checkbox" 
                id="activa" 
                checked={formData.activa} 
                onChange={(e) => setFormData({ ...formData, activa: e.target.checked })}
                className="w-4 h-4 accent-rose-600"
              />
              <Label htmlFor="activa" className="font-bold cursor-pointer">Descuento activo ahora mismo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOfferDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveOffer} className="bg-rose-600 hover:bg-rose-700">Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ItemTable({ 
  items, 
  onManageOffer, 
  onToggleOffer,
  onRemoveOffer,
  formatPrice
}: { 
  items: Item[], 
  onManageOffer: (item: Item) => void,
  onToggleOffer: (item: Item) => void,
  onRemoveOffer: (item: Item) => void,
  formatPrice: (p: number) => string
}) {
  return (
    <Card className="border-gray-200">
      <Table>
        <TableHeader className="bg-gray-50">
          <TableRow>
            <TableHead className="font-bold text-gray-700">Nombre</TableHead>
            <TableHead className="font-bold text-gray-700">Categoría</TableHead>
            <TableHead className="font-bold text-gray-700">Precio Base</TableHead>
            <TableHead className="font-bold text-gray-700 text-center">Oferta Actual</TableHead>
            <TableHead className="text-right font-bold text-gray-700">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-10 text-gray-500 italic">No se encontraron items</TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow key={item.id} className="hover:bg-gray-50/50 transition-colors">
                <TableCell className="font-bold text-gray-900">{item.nombre}</TableCell>
                <TableCell><span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-medium">{item.categoria}</span></TableCell>
                <TableCell className="font-medium">$ {formatPrice(item.precioVenta)}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-2">
                    {item.oferta ? (
                      <>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          !item.oferta.activa ? 'bg-gray-100 text-gray-400' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {item.oferta.valor}% Off
                        </span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 hover:bg-white" 
                          onClick={() => onToggleOffer(item)}
                        >
                          {item.oferta.activa ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-gray-300" />}
                        </Button>
                      </>
                    ) : (
                      <span className="text-gray-400 italic text-xs">Sin oferta activa</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => onManageOffer(item)} className="h-9 hover:border-rose-400 hover:text-rose-600">
                      <Settings2 className="mr-2 h-4 w-4" /> Oferta
                    </Button>
                    {item.oferta && (
                      <Button variant="ghost" size="sm" onClick={() => onRemoveOffer(item)} className="h-9 text-gray-400 hover:text-red-500 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
