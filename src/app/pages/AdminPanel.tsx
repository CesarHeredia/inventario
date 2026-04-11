import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { 
  ArrowLeft, 
  Users, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  UserPlus, 
  Building2,
  Calendar,
  Package,
  Briefcase,
  Star,
  Search,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Layers,
  LogOut,
  User as UserIcon,
  UserCog,
  Plus
} from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { toast } from "sonner";

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
}

interface SolicitudPago {
  id: string;
  usuarioId: string;
  nombreUsuario: string;
  empresa: string;
  planId: number;
  planNombre: string;
  montoUSD: number;
  montoBS: number;
  comprobante: string;
  fecha: string;
  status: 'pendiente' | 'aprobado' | 'rechazado';
}

export function AdminPanel() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [solicitudes, setSolicitudes] = useState<SolicitudPago[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedJefes, setExpandedJefes] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
    if (currentUser && currentUser.rol === 'admin') {
      setUser(currentUser);
      loadData();
    } else {
      toast.error("Acceso denegado. Se requiere cuenta de administrador.");
      navigate('/dashboard');
    }
  }, []);

  const loadData = async () => {
    try {
      const resp = await fetch('/api/usuarios.php');
      const data = await resp.json();
      if (data.success) {
        const mappedUsers = data.users.map((u: any) => ({
          ...u,
          rol: u.tipoUsuario || 'jefe'
        }));
        setUsers(mappedUsers);
      }
    } catch (error) {
       toast.error("No se pudieron cargar los usuarios de la base de datos");
    }

    const savedSolicitudes = JSON.parse(localStorage.getItem('solicitudesPago') || '[]');
    setSolicitudes(savedSolicitudes);
  };

  const toggleJefe = (jefeId: string) => {
    setExpandedJefes(prev => 
      prev.includes(jefeId) ? prev.filter(id => id !== jefeId) : [...prev, jefeId]
    );
  };

  const handleApprove = async (solicitud: SolicitudPago) => {
    const targetUser = users.find((u: any) => 
      String(u.usuario).trim().toLowerCase() === String(solicitud.usuarioId).trim().toLowerCase()
    );

    if (!targetUser) {
      toast.error(`Error: Usuario "@${solicitud.usuarioId}" no encontrado en la base de datos`);
      return;
    }

    // Definir bonos de planes
    const planBonuses: {[key: number]: any} = {
      1: { p: 10, s: 5, c: 0 },
      2: { p: 25, s: 20, c: 15 },
      3: { p: 60, s: 50, c: 40 }
    };

    const bonus = planBonuses[solicitud.planId];
    
    // Calcular nueva fecha de expiración (acumulativa 30 días)
    const currentExpiry = targetUser.fechaExpiracion ? new Date(targetUser.fechaExpiracion) : new Date();
    if (currentExpiry < new Date()) {
      currentExpiry.setTime(new Date().getTime());
    }
    currentExpiry.setDate(currentExpiry.getDate() + 30);

    const newLimits = {
      usuario: targetUser.usuario,
      limiteProductos: (Number(targetUser.limiteProductos) || 20) + bonus.p,
      limiteServicios: (Number(targetUser.limiteServicios) || 10) + bonus.s,
      limiteCombos: (Number(targetUser.limiteCombos) || 5) + bonus.c,
      fechaExpiracion: currentExpiry.toISOString().slice(0, 19).replace('T', ' ') // Formato MySQL
    };

    try {
      const resp = await fetch('/api/usuarios.php', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLimits)
      });
      
      const data = await resp.json();
      
      if (data.success) {
        setUsers(prev => prev.map(u => u.usuario === targetUser.usuario ? { ...u, ...newLimits } : u));
        
        const updatedSolicitudes: SolicitudPago[] = solicitudes.map(s => s.id === solicitud.id ? { ...s, status: 'aprobado' as const } : s);
        localStorage.setItem('solicitudesPago', JSON.stringify(updatedSolicitudes));
        setSolicitudes(updatedSolicitudes);

        toast.success(`Pago aprobado y guardado en base de datos. Límites aumentados para ${solicitud.empresa}`);
      } else {
        toast.error("Error al guardar cambios en el servidor: " + data.message);
      }
    } catch (error) {
      toast.error("Error crítico al persistir los cambios en la base de datos");
    }
  };

  const handleReject = (solicitud: SolicitudPago) => {
    // Las solicitudes por ahora están en LC, actualizamos a rechazado
    const updatedSolicitudes: SolicitudPago[] = solicitudes.map(s => s.id === solicitud.id ? { ...s, status: 'rechazado' as const } : s);
    localStorage.setItem('solicitudesPago', JSON.stringify(updatedSolicitudes));
    setSolicitudes(updatedSolicitudes);
    toast.error(`Solicitud de @${solicitud.usuarioId} rechazada.`);
  };

  const filteredJefes = users.filter(u => u.rol === 'jefe' && (
    u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.nombreEmpresa.toLowerCase().includes(searchTerm.toLowerCase())
  ));

  const getTrabajadores = (jefeUsuario: string) => {
    return users.filter(u => u.rol === 'trabajador' && (u as any).jefePadre === jefeUsuario);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 leading-tight">Control Maestro</h1>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Validación de Pagos y Licencias</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
           <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-gray-900">{user.nombre} {user.apellido}</p>
              <p className="text-[10px] font-black text-indigo-600 uppercase">Super Administrador</p>
           </div>
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
                    <span className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">Administrador</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-100" />
                <DropdownMenuSeparator className="bg-gray-100" />
                <DropdownMenuItem onClick={() => { sessionStorage.removeItem('currentUser'); navigate('/login'); }} className="text-red-600 rounded-xl cursor-pointer py-2.5">
                  <LogOut className="mr-2 h-4 w-4" /> Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        <div className="mb-10">
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Bienvenido de nuevo</h2>
          <p className="text-gray-500 font-medium">Gestiona las membresías y supervisa las cuentas activas en la plataforma.</p>
        </div>

        <Tabs defaultValue="solicitudes" className="space-y-8">
          <TabsList className="bg-white border border-gray-200 p-1 rounded-2xl h-14 w-fit shadow-sm">
            <TabsTrigger value="solicitudes" className="px-8 rounded-xl font-bold data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
               <Layers className="h-4 w-4 mr-2" /> Pagos Pendientes 
               <span className="ml-2 bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full ring-2 ring-white">
                 {solicitudes.filter(s => s.status === 'pendiente').length}
               </span>
            </TabsTrigger>
            <TabsTrigger value="cuentas" className="px-8 rounded-xl font-bold data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
               <Users className="h-4 w-4 mr-2" /> Listado de Empresas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="solicitudes">
            <div className="grid grid-cols-1 gap-6">
              {solicitudes.filter(s => s.status === 'pendiente').length === 0 ? (
                <Card className="border-0 shadow-xl rounded-[2.5rem] p-20 text-center bg-white">
                  <div className="bg-gray-50 h-24 w-24 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300">
                    <CheckCircle2 className="h-12 w-12" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-2">¡Todo al día!</h3>
                  <p className="text-gray-500 font-medium">No hay comprobantes de pago pendientes de revisión en este momento.</p>
                </Card>
              ) : (
                <Card className="border-0 shadow-xl rounded-[2.5rem] overflow-hidden bg-white">
                   <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                      <div>
                        <CardTitle className="text-2xl font-black text-gray-900">Validación de Comprobantes</CardTitle>
                        <CardDescription className="text-base font-medium">Revisa las transferencias y activa los planes solicitados.</CardDescription>
                      </div>
                      <div className="bg-rose-100 text-rose-600 px-4 py-2 rounded-2xl font-black text-xs uppercase tracking-widest">
                        {solicitudes.filter(s => s.status === 'pendiente').length} Pendientes
                      </div>
                   </div>
                   <div className="p-0 overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-gray-50/50">
                          <TableRow className="hover:bg-transparent border-0">
                            <TableHead className="font-black text-[10px] uppercase tracking-widest py-6 px-8">Dueño / Empresa</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest py-6">Plan Solicitado</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest py-6">Inversión</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest py-6">Imagen Pago</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest py-6 text-right px-8">Gestión</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {solicitudes.filter(s => s.status === 'pendiente').map((sol) => (
                            <TableRow key={sol.id} className="group hover:bg-indigo-50/30 transition-colors border-b border-gray-50">
                              <TableCell className="px-8 py-6">
                                <div>
                                  <p className="font-black text-gray-900 text-base">{sol.nombreUsuario}</p>
                                  <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">{sol.empresa}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase ring-2 ring-white shadow-sm">
                                  {sol.planNombre}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="font-black">
                                  <p className="text-green-600">$ {sol.montoUSD}</p>
                                  <p className="text-gray-300 text-[10px] font-bold">Bs {sol.montoBS.toLocaleString()}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => setSelectedImage(sol.comprobante)} 
                                  className="rounded-xl font-bold bg-gray-50 hover:bg-white border hover:border-indigo-200 transition-all group-hover:shadow-md"
                                >
                                  <Eye className="h-4 w-4 mr-2 text-indigo-500" /> Ver Recibo
                                </Button>
                              </TableCell>
                              <TableCell className="text-right px-8">
                                <div className="flex items-center justify-end gap-2">
                                  <Button 
                                    onClick={() => handleReject(sol)}
                                    variant="outline"
                                    className="border-rose-100 text-rose-500 hover:bg-rose-50 font-black rounded-xl"
                                  >
                                    <XCircle className="h-4 w-4 mr-2" /> Rechazar
                                  </Button>
                                  <Button 
                                    onClick={() => handleApprove(sol)} 
                                    className="bg-gray-900 hover:bg-green-600 text-white font-black rounded-xl shadow-lg transition-all transform hover:scale-105 active:scale-95"
                                  >
                                    <ShieldCheck className="h-4 w-4 mr-2" /> Confirmar Pago
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                   </div>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="cuentas">
            <div className="space-y-6">
               <div className="relative max-w-md">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                 <input 
                   placeholder="Buscar por usuario o empresa..." 
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="w-full h-14 pl-12 pr-4 bg-white border border-gray-200 rounded-[1.25rem] shadow-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-gray-900"
                 />
               </div>

               <div className="grid grid-cols-1 gap-4">
                  {filteredJefes.map((jefe) => {
                    const trabajadores = getTrabajadores(jefe.usuario);
                    const isExpanded = expandedJefes.includes(jefe.usuario);
                    const daysLeft = jefe.fechaExpiracion 
                      ? Math.ceil((new Date(jefe.fechaExpiracion).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                      : 0;

                    return (
                      <Card key={jefe.usuario} className="border-0 shadow-md rounded-3xl overflow-hidden hover:shadow-lg transition-shadow bg-white">
                          <div className="p-8 flex flex-wrap items-center justify-between gap-8 cursor-pointer group" onClick={() => toggleJefe(jefe.usuario)}>
                             <div className="flex items-center gap-6 min-w-[350px]">
                                <div className="h-16 w-16 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl flex items-center justify-center text-white shadow-xl group-hover:scale-105 transition-transform">
                                   <Building2 className="h-8 w-8" />
                                </div>
                                <div>
                                   <h4 className="text-xl font-black text-gray-900 tracking-tight">{jefe.nombreEmpresa}</h4>
                                   <p className="text-sm font-bold text-indigo-600/80">{jefe.nombre} {jefe.apellido} <span className="text-gray-300 mx-1">|</span> <span className="text-gray-400">@{jefe.usuario}</span></p>
                                </div>
                             </div>

                             <div className="flex flex-1 items-center justify-end gap-12">
                                <div className="text-right">
                                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Capacidad Activa</p>
                                   <div className="flex gap-4 text-gray-700 font-bold text-xs">
                                      <div className="flex items-center gap-1.5"><Package className="h-4 w-4 text-blue-500" /> {jefe.limiteProductos || 20}</div>
                                      <div className="flex items-center gap-1.5"><Briefcase className="h-4 w-4 text-purple-500" /> {jefe.limiteServicios || 10}</div>
                                      <div className="flex items-center gap-1.5"><Star className="h-4 w-4 text-amber-500" /> {jefe.limiteCombos || 5}</div>
                                   </div>
                                </div>

                                <div className="min-w-[160px]">
                                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Estado Licencia</p>
                                   <div className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 ${
                                     daysLeft > 0 ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'
                                   }`}>
                                      <Calendar className="h-3.5 w-3.5" />
                                      {daysLeft > 0 ? `${daysLeft} días` : 'Expirada'}
                                   </div>
                                </div>
                             </div>

                             <div className="flex items-center">
                                <Button variant="ghost" className="h-12 w-12 p-0 rounded-2xl bg-gray-50 hover:bg-indigo-50 transition-colors">
                                   {isExpanded ? <ChevronDown className="h-6 w-6 text-indigo-600" /> : <ChevronRight className="h-6 w-6 text-gray-400" />}
                                </Button>
                             </div>
                          </div>

                        {isExpanded && (
                          <div className="bg-gray-50/50 border-t border-gray-100 p-6 animate-in slide-in-from-top-4 duration-300">
                             <div className="space-y-3">
                                <h5 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                                   <Users className="h-3 w-3" /> Equipo de {jefe.nombreEmpresa}
                                </h5>
                                {trabajadores.length === 0 ? (
                                  <p className="text-sm text-gray-400 italic py-2">Este jefe aún no ha creado subcuentas.</p>
                                ) : (
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {trabajadores.map(trab => (
                                      <div key={trab.usuario} className="bg-white border border-gray-200 p-4 rounded-2xl flex items-center gap-3 shadow-sm">
                                         <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
                                            {trab.nombre[0]}{trab.apellido[0]}
                                         </div>
                                         <div>
                                            <p className="text-sm font-bold text-gray-900">{trab.nombre} {trab.apellido}</p>
                                            <p className="text-xs text-gray-500">{trab.usuario}</p>
                                         </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                             </div>
                          </div>
                        )}
                      </Card>
                    );
                  })}
               </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Image Preview Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-3xl border-0 shadow-2xl rounded-3xl p-2 bg-gray-900/10 backdrop-blur-xl">
          <DialogHeader className="p-4 sr-only">
            <DialogTitle>Comprobante de Pago</DialogTitle>
            <DialogDescription>Vista ampliada del comprobante</DialogDescription>
          </DialogHeader>
          {selectedImage && (
            <div className="relative group">
               <img src={selectedImage} alt="Comprobante Full" className="w-full h-auto max-h-[80vh] object-contain rounded-2xl shadow-2xl" />
               <Button 
                variant="ghost" 
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full h-10 w-10 p-0 shadow-lg"
               >
                 <XCircle className="h-6 w-6" />
               </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
