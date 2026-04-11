import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { 
  ArrowLeft, 
  User as UserIcon,
  LogOut,
  UserCog,
  UserPlus,
  Shield,
  UserX,
  UserCheck,
  Mail,
  Lock,
  Crown,
  Ban,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../components/ui/badge";
import * as api from "../../utils/api";

interface User {
  id?: string;
  usuario: string;
  nombre: string;
  apellido: string;
  correo: string;
  nombreEmpresa: string;
  rol: 'admin' | 'jefe' | 'subjefe' | 'trabajador';
}

interface Trabajador {
  id: string;
  nombre: string;
  apellido: string;
  usuario: string;
  correo: string;
  contraseña: string;
  propietario: string;
  rol: 'trabajador' | 'subjefe';
  activo: boolean;
  fechaCreacion: string;
}

export function Trabajadores() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    usuario: "",
    correo: "",
    contraseña: "",
  });

  useEffect(() => {
    const currentUser = sessionStorage.getItem('currentUser');
    if (currentUser) {
      const userData = JSON.parse(currentUser);
      setUser(userData);
      
      // Eliminar los datos basura de la memoria local
      localStorage.removeItem('trabajadores');
      
      loadTrabajadores(String(userData.jefeId || userData.id));
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const loadTrabajadores = async (jefeId: string) => {
    try {
      const data = await api.getTrabajadores(jefeId);
      setTrabajadores(data);
    } catch (error) {
      toast.error('Error al cargar trabajadores desde la base de datos');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('currentUser');
    toast.success('Sesión cerrada exitosamente');
    navigate('/login');
  };

  const handleCreateTrabajador = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nombre || !formData.apellido || !formData.usuario || !formData.correo || !formData.contraseña) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    try {
      const currentUserData = JSON.parse(sessionStorage.getItem('currentUser')!);
      const companyId = String(currentUserData.jefeId || currentUserData.id);
      
      await api.createTrabajador({
        usuario: formData.usuario,
        contraseña: formData.contraseña,
        nombre: formData.nombre,
        apellido: formData.apellido,
        correo: formData.correo,
        jefeId: companyId,
        nombreEmpresa: currentUserData.nombreEmpresa
      });
      
      toast.success('Trabajador creado exitosamente');
      setFormData({ nombre: "", apellido: "", usuario: "", correo: "", contraseña: "" });
      setIsDialogOpen(false);
      loadTrabajadores(companyId);
      
    } catch (error: any) {
      toast.error(error.message || 'Error al crear trabajador');
    }
  };

  const toggleRol = async (trabajadorId: string) => {
    const trabajador = trabajadores.find(t => String(t.id) === String(trabajadorId));
    if (!trabajador) return;
    
    const newRol = trabajador.rol === 'trabajador' ? 'subjefe' : 'trabajador';
    const parsedUser = JSON.parse(sessionStorage.getItem('currentUser')!);
    const ownerId = String((parsedUser.rol === 'trabajador' || parsedUser.rol === 'subjefe') ? parsedUser.jefeId : parsedUser.id || '');
    try {
      await api.updateTrabajadorRol(trabajadorId, newRol);
      toast.success(`${trabajador.nombre} ahora es ${newRol === 'subjefe' ? 'Subjefe' : 'Trabajador'}`);
      
      const userData = JSON.parse(localStorage.getItem('currentUser')!);
      loadTrabajadores(String(userData.jefeId || userData.id));
    } catch (e) {
      toast.error('Error al cambiar el rol');
    }
  };

  const toggleEstado = async (trabajadorId: string) => {
    const trabajador = trabajadores.find(t => String(t.id) === String(trabajadorId));
    if (!trabajador) return;

    const newEstado = !trabajador.activo;
    try {
      await api.updateTrabajadorEstado(trabajadorId, newEstado);
      toast.success(`Cuenta de ${trabajador.nombre} ${newEstado ? 'activada' : 'desactivada'}`);
      
      const userData = JSON.parse(localStorage.getItem('currentUser')!);
      loadTrabajadores(String(userData.jefeId || userData.id));
    } catch (e) {
      toast.error('Error al cambiar el estado');
    }
  };

  if (!user) {
    return null;
  }

  const trabajadoresActivos = trabajadores.filter(t => t.activo).length;
  const subjefes = trabajadores.filter(t => t.rol === 'subjefe').length;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b-4 border-blue-600 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">INVENTORIA</h1>
                <p className="text-sm text-gray-600 font-semibold">{user.nombreEmpresa}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* User Menu Dropdown */}
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
        {/* Back Button */}
        <Button
          onClick={() => navigate('/dashboard')}
          variant="outline"
          className="mb-6 border-2 border-gray-400 hover:border-blue-600 font-semibold"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al Dashboard
        </Button>

        {/* Header Section */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Gestión de Trabajadores
            </h2>
            <p className="text-gray-600 font-medium">
              Administra los trabajadores de {user.nombreEmpresa}
            </p>
          </div>
          
          {/* Create Worker Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700 text-white border-2 border-green-700 font-bold">
                <UserPlus className="mr-2 h-5 w-5" />
                Crear Trabajador
              </Button>
            </DialogTrigger>
            <DialogContent className="border-2 border-green-600 max-w-2xl">
              <DialogHeader className="border-b-2 border-green-600 pb-4">
                <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <UserPlus className="h-6 w-6 text-green-600" />
                  Crear Nueva Cuenta de Trabajador
                </DialogTitle>
                <DialogDescription className="text-gray-600 font-medium">
                  Esta cuenta estará vinculada a tu empresa y tendrás control total sobre ella
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleCreateTrabajador} className="space-y-4 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre" className="text-gray-800 font-bold text-sm">
                      Nombre
                    </Label>
                    <Input
                      id="nombre"
                      type="text"
                      placeholder="Nombre del trabajador"
                      className="border-2 border-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 transition-all h-11"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="apellido" className="text-gray-800 font-bold text-sm">
                      Apellido
                    </Label>
                    <Input
                      id="apellido"
                      type="text"
                      placeholder="Apellido del trabajador"
                      className="border-2 border-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 transition-all h-11"
                      value={formData.apellido}
                      onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="usuario" className="text-gray-800 font-bold text-sm">
                      Usuario
                    </Label>
                    <Input
                      id="usuario"
                      type="text"
                      placeholder="Nombre de usuario único"
                      className="border-2 border-gray-400 focus:border-purple-600 focus:ring-2 focus:ring-purple-200 transition-all h-11"
                      value={formData.usuario}
                      onChange={(e) => setFormData({ ...formData, usuario: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="correo" className="text-gray-800 font-bold text-sm">
                      Correo Electrónico
                    </Label>
                    <Input
                      id="correo"
                      type="email"
                      placeholder="correo@ejemplo.com"
                      className="border-2 border-gray-400 focus:border-purple-600 focus:ring-2 focus:ring-purple-200 transition-all h-11"
                      value={formData.correo}
                      onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="contraseña" className="text-gray-800 font-bold text-sm">
                      Contraseña
                    </Label>
                    <Input
                      id="contraseña"
                      type="password"
                      placeholder="Contraseña para la cuenta"
                      className="border-2 border-gray-400 focus:border-orange-600 focus:ring-2 focus:ring-orange-200 transition-all h-11"
                      value={formData.contraseña}
                      onChange={(e) => setFormData({ ...formData, contraseña: e.target.value })}
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t-2 border-gray-200">
                  <Button
                    type="submit"
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white border-2 border-green-700 font-bold py-6"
                  >
                    <UserPlus className="mr-2 h-5 w-5" />
                    Crear Trabajador
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setIsDialogOpen(false)}
                    variant="outline"
                    className="flex-1 bg-gray-200 hover:bg-gray-300 border-2 border-gray-400 font-bold py-6"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-2 border-purple-500 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b-2 border-purple-500">
              <CardTitle className="text-sm font-bold">Total Trabajadores</CardTitle>
              <UserCog className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-purple-600">{trabajadores.length}</div>
              <p className="text-xs text-gray-600 font-medium mt-1">
                Cuentas registradas
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-500 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b-2 border-green-500">
              <CardTitle className="text-sm font-bold">Activos</CardTitle>
              <UserCheck className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">{trabajadoresActivos}</div>
              <p className="text-xs text-gray-600 font-medium mt-1">
                Trabajadores activos
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-orange-500 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b-2 border-orange-500">
              <CardTitle className="text-sm font-bold">Subjefes</CardTitle>
              <Crown className="h-5 w-5 text-orange-600" />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-orange-600">{subjefes}</div>
              <p className="text-xs text-gray-600 font-medium mt-1">
                Con permisos especiales
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Trabajadores List */}
        <Card className="border-2 border-blue-600 shadow-xl">
          <CardHeader className="border-b-4 border-blue-600">
            <CardTitle className="text-2xl font-bold text-gray-900">
              Lista de Trabajadores
            </CardTitle>
            <CardDescription className="text-gray-600 font-medium">
              Gestiona los permisos y estado de cada trabajador
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {trabajadores.length === 0 ? (
              <div className="text-center py-12">
                <UserX className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  No hay trabajadores registrados
                </h3>
                <p className="text-gray-600 mb-4">
                  Comienza creando tu primer trabajador
                </p>
                <Button
                  onClick={() => setIsDialogOpen(true)}
                  className="bg-green-600 hover:bg-green-700 text-white border-2 border-green-700 font-bold"
                >
                  <UserPlus className="mr-2 h-5 w-5" />
                  Crear Primer Trabajador
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {trabajadores.map((trabajador) => (
                  <Card
                    key={trabajador.id}
                    className={`border-2 ${
                      trabajador.activo ? 'border-green-400 bg-white' : 'border-gray-400 bg-gray-50'
                    } transition-all`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          {/* Avatar */}
                          <div
                            className={`${
                              trabajador.rol === 'subjefe'
                                ? 'bg-orange-600 border-orange-700'
                                : 'bg-blue-600 border-blue-700'
                            } p-3 rounded-full border-4`}
                          >
                            {trabajador.rol === 'subjefe' ? (
                              <Crown className="h-6 w-6 text-white" />
                            ) : (
                              <User className="h-6 w-6 text-white" />
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-lg font-bold text-gray-900">
                                {trabajador.nombre} {trabajador.apellido}
                              </h4>
                              <Badge
                                variant={trabajador.rol === 'subjefe' ? 'default' : 'secondary'}
                                className={`${
                                  trabajador.rol === 'subjefe'
                                    ? 'bg-orange-600 hover:bg-orange-700 border-2 border-orange-700'
                                    : 'bg-blue-600 hover:bg-blue-700 border-2 border-blue-700'
                                } font-bold`}
                              >
                                {trabajador.rol === 'subjefe' ? 'SUBJEFE' : 'TRABAJADOR'}
                              </Badge>
                              {!trabajador.activo && (
                                <Badge
                                  variant="destructive"
                                  className="bg-red-600 border-2 border-red-700 font-bold"
                                >
                                  DESACTIVADO
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span className="flex items-center gap-1 font-semibold">
                                <User className="h-4 w-4" />
                                {trabajador.usuario}
                              </span>
                              <span className="flex items-center gap-1 font-semibold">
                                <Mail className="h-4 w-4" />
                                {trabajador.correo}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Creado: {new Date(trabajador.fechaCreacion).toLocaleDateString('es-VE', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => toggleRol(String(trabajador.id))}
                            variant="outline"
                            className={`${
                              trabajador.rol === 'subjefe'
                                ? 'bg-blue-50 hover:bg-blue-100 border-2 border-blue-600 text-blue-700'
                                : 'bg-orange-50 hover:bg-orange-100 border-2 border-orange-600 text-orange-700'
                            } font-bold`}
                            disabled={!trabajador.activo}
                          >
                            {trabajador.rol === 'subjefe' ? (
                              <>
                                <User className="mr-2 h-4 w-4" />
                                Hacer Trabajador
                              </>
                            ) : (
                              <>
                                <Crown className="mr-2 h-4 w-4" />
                                Hacer Subjefe
                              </>
                            )}
                          </Button>

                          <Button
                            onClick={() => toggleEstado(String(trabajador.id))}
                            variant="outline"
                            className={`${
                              trabajador.activo
                                ? 'bg-red-50 hover:bg-red-100 border-2 border-red-600 text-red-700'
                                : 'bg-green-50 hover:bg-green-100 border-2 border-green-600 text-green-700'
                            } font-bold`}
                          >
                            {trabajador.activo ? (
                              <>
                                <Ban className="mr-2 h-4 w-4" />
                                Desactivar
                              </>
                            ) : (
                              <>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Activar
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>


      </main>
    </div>
  );
}