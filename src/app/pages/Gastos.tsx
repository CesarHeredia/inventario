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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
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
  Trash2,
  DollarSign,
  Receipt,
  Calendar,
  User as UserIcon,
  UserCog,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";
import { useDolarPrice } from "../hooks/useDolarPrice";
import * as api from "../../utils/api";


interface Gasto {
  id: string;
  descripcion: string;
  monto: number;
  moneda: 'bolivares' | 'dolares';
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

export function Gastos() {
  const navigate = useNavigate();
  const { price: dolarPrice } = useDolarPrice(60000);
  const [user, setUser] = useState<User | null>(null);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [isAddGastoDialogOpen, setIsAddGastoDialogOpen] = useState(false);
  
  const [gastoForm, setGastoForm] = useState({
    descripcion: "",
    monto: "",
    moneda: "bolivares" as 'bolivares' | 'dolares',
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

    // Cargar gastos de MySQL
    api.getGastos(ownerId).then(res => {
      if (res.success) {
        setGastos(res.gastos.map((g: any) => ({
          ...g, id: String(g.id), monto: parseFloat(g.monto), tasaDolar: dolarPrice, usuario: parsedUser.usuario
        })));
      }
    });
  }, [navigate]);

  const refreshGastos = () => {
    const ownerId = String(user?.rol === 'trabajador' ? user?.jefeId : user?.id || '');
    api.getGastos(ownerId).then(res => {
      if (res.success) {
        setGastos(res.gastos.map((g: any) => ({
          ...g, id: String(g.id), monto: parseFloat(g.monto), tasaDolar: dolarPrice, usuario: user?.usuario || ''
        })));
      }
    });
  };

  const handleAddGasto = (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones de longitud y dígitos
    if (gastoForm.descripcion.length > 40) {
      toast.error('La descripción no puede superar los 40 caracteres');
      return;
    }

    if (gastoForm.monto.replace(/[^0-9]/g, '').length > 7) {
      toast.error('El monto no puede superar los 7 dígitos');
      return;
    }

    const ownerId = String((user?.rol === 'trabajador' || user?.rol === 'subjefe') ? user?.jefeId : user?.id || '');
    
    api.addGasto({
      usuarioId: ownerId,
      descripcion: gastoForm.descripcion,
      monto: parseFloat(gastoForm.monto),
      moneda: gastoForm.moneda,
      fecha: new Date().toISOString()
    })
    .then(() => {
        toast.success('Gasto registrado exitosamente');
        refreshGastos();
        setGastoForm({ descripcion: "", monto: "", moneda: "bolivares" });
        setIsAddGastoDialogOpen(false);
    })
    .catch(() => toast.error('Error al registrar gasto'));
  };

  const handleDeleteGasto = (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este gasto?')) {
      return;
    }

    api.deleteGasto(id)
        .then(() => {
            toast.success('Gasto eliminado');
            refreshGastos();
        })
        .catch(() => toast.error('Error al eliminar gasto'));
  };

  const totalGastos = gastos.reduce((acc, g) => acc + (g.moneda === 'dolares' ? g.monto * g.tasaDolar : g.monto), 0);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

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
                <div className="bg-gradient-to-br from-red-500 to-rose-600 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="font-semibold text-base sm:text-lg truncate">Gastos</h1>
                  <p className="text-xs sm:text-sm text-gray-500 truncate">{user.nombreEmpresa}</p>
                </div>
              </div>
            </div>
            <div className="flex-1 hidden md:flex justify-center">

            </div>
            <div className="flex-1 flex justify-end">
              <Button onClick={() => setIsAddGastoDialogOpen(true)} size="sm" className="text-xs sm:text-sm">
                <Plus className="mr-0 sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Registrar Gasto</span>
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
        {/* Stats Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Gastos
              </CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">Bs {formatPrice(totalGastos)}</div>
              <p className="text-xs text-muted-foreground">
                Equivalente: $ {formatPrice(totalGastos / dolarPrice)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Cantidad de Gastos
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{gastos.length}</div>
              <p className="text-xs text-muted-foreground">
                Registros totales
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Promedio por Gasto
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                Bs {formatPrice(gastos.length > 0 ? totalGastos / gastos.length : 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Por registro
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabla de Gastos */}
        <Card>
          <CardHeader>
            <CardTitle>Registro de Gastos</CardTitle>
            <CardDescription>
              Historial completo de gastos de la empresa
            </CardDescription>
          </CardHeader>
          <CardContent>
            {gastos.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No hay gastos registrados
                </h3>
                <p className="text-gray-500 mb-6">
                  Comienza registrando el primer gasto de tu empresa
                </p>
                <Button onClick={() => setIsAddGastoDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Registrar Primer Gasto
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead className="text-right">Monto Original</TableHead>
                      <TableHead className="text-right">Total (Bs)</TableHead>
                      <TableHead className="text-right">Total ($)</TableHead>
                      <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gastos.map((gasto) => (
                      <TableRow key={gasto.id}>
                        <TableCell>
                          {new Date(gasto.fecha).toLocaleDateString('es-VE', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </TableCell>
                        <TableCell className="font-medium">
                          {gasto.descripcion}
                        </TableCell>
                        <TableCell>
                          {gasto.usuario}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {gasto.moneda === 'bolivares' ? 'Bs' : '$'} {formatPrice(gasto.monto)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-red-600">
                          Bs {formatPrice(gasto.moneda === 'dolares' ? gasto.monto * gasto.tasaDolar : gasto.monto)}
                        </TableCell>
                        <TableCell className="text-right text-gray-600">
                          $ {formatPrice(gasto.moneda === 'bolivares' ? gasto.monto / gasto.tasaDolar : gasto.monto)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteGasto(gasto.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
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

      {/* Dialog: Agregar Gasto */}
      <Dialog open={isAddGastoDialogOpen} onOpenChange={setIsAddGastoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Nuevo Gasto</DialogTitle>
            <DialogDescription>
              Agrega un gasto de la empresa al registro
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddGasto}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción del Gasto *</Label>
                <Input
                  id="descripcion"
                  placeholder="Ej: Pago de servicios, Compra de materiales, etc."
                  value={gastoForm.descripcion}
                  onChange={(e) => setGastoForm({ ...gastoForm, descripcion: e.target.value })}
                  required
                  maxLength={40}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Moneda *</Label>
                  <Select 
                    value={gastoForm.moneda} 
                    onValueChange={(val: any) => setGastoForm({ ...gastoForm, moneda: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bolivares">Bolívares (Bs)</SelectItem>
                      <SelectItem value="dolares">Dólares ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monto">Monto *</Label>
                  <Input
                    id="monto"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={gastoForm.monto}
                    onChange={(e) => setGastoForm({ ...gastoForm, monto: e.target.value })}
                    onInput={(e) => {
                      const target = e.target as HTMLInputElement;
                      if (target.value.replace(/[^0-9]/g, '').length > 7) {
                        target.value = target.value.slice(0, 7);
                      }
                    }}
                    required
                  />
                </div>
              </div>

              {gastoForm.monto && (
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <p className="text-sm font-medium text-gray-700">Equivalencia aproximada:</p>
                  <p className="text-lg font-bold text-blue-700">
                    {gastoForm.moneda === 'bolivares' 
                      ? `$ ${formatPrice(parseFloat(gastoForm.monto) / dolarPrice)}`
                      : `Bs ${formatPrice(parseFloat(gastoForm.monto) * dolarPrice)}`
                    }
                  </p>
                  <p className="text-[10px] text-gray-500 mt-1 italic">
                    Usando tasa de hoy: 1$ = Bs {formatPrice(dolarPrice)}
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsAddGastoDialogOpen(false);
                  setGastoForm({ descripcion: "", monto: "", moneda: "bolivares" });
                }}
              >
                Cancelar
              </Button>
              <Button type="submit">
                <Plus className="mr-2 h-4 w-4" />
                Registrar Gasto
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}