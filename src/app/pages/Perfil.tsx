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
  ArrowLeft, 
  Save, 
  User,
  Mail,
  Building2,
  Calendar,
  UserCircle,
  LogOut,
  UserCog,
  Edit,
  X,
} from "lucide-react";
import { toast } from "sonner";


interface User {
  id?: string;
  usuario: string;
  nombre: string;
  apellido: string;
  correo: string;
  nombreEmpresa: string;
  fechaNacimiento: string;
  contraseña: string;
  rol: 'admin' | 'jefe' | 'subjefe' | 'trabajador';
  limiteProductos: number;
  limiteServicios: number;
  limiteCombos: number;
  fechaExpiracion?: string;
}

export function Perfil() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    usuario: "",
    correo: "",
    nombreEmpresa: "",
    fechaNacimiento: "",
    contraseña: "",
  });

  useEffect(() => {
    const currentUser = sessionStorage.getItem('currentUser');
    if (currentUser) {
      const userData = JSON.parse(currentUser);
      setUser(userData);
      setFormData({
        nombre: userData.nombre,
        apellido: userData.apellido,
        usuario: userData.usuario,
        correo: userData.correo,
        nombreEmpresa: userData.nombreEmpresa,
        fechaNacimiento: userData.fechaNacimiento || "",
        contraseña: userData.contraseña,
      });
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem('currentUser');
    toast.success('Sesión cerrada exitosamente');
    navigate('/login');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nombre || !formData.apellido || !formData.usuario || !formData.correo || !formData.nombreEmpresa) {
      toast.error('Por favor completa todos los campos obligatorios');
      return;
    }

    // Actualizar el usuario actual en localStorage
    const updatedUser = {
      ...user,
      ...formData,
    } as User;
    
    sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));
    
    // Actualizar también en la lista de usuarios registrados
    const users = localStorage.getItem('usuarios');
    if (users) {
      const usersList = JSON.parse(users);
      const userIndex = usersList.findIndex((u: User) => u.usuario === user?.usuario);
      if (userIndex !== -1) {
        usersList[userIndex] = updatedUser;
        localStorage.setItem('usuarios', JSON.stringify(usersList));
      }
    }
    
    setUser(updatedUser);
    setIsEditing(false);
    toast.success('Perfil actualizado exitosamente');
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        nombre: user.nombre,
        apellido: user.apellido,
        usuario: user.usuario,
        correo: user.correo,
        nombreEmpresa: user.nombreEmpresa,
        fechaNacimiento: user.fechaNacimiento || "",
        contraseña: user.contraseña,
      });
    }
    setIsEditing(false);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b-4 border-blue-600 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <div className="border-4 border-blue-600 p-2 rounded-xl bg-blue-50">

              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">INVENTORIA</h1>
                <p className="text-sm text-gray-600 font-semibold">{user.nombreEmpresa}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* User Menu Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="bg-blue-600 hover:bg-blue-700 text-white border-2 border-blue-700 font-bold h-12 w-12 p-0 rounded-full"
                  >
                    <User className="h-6 w-6" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 border-2 border-gray-300" align="end">
                  <DropdownMenuLabel className="font-bold text-gray-900">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-bold">{user.nombre} {user.apellido}</p>
                      <p className="text-xs font-normal text-gray-600">{user.correo}</p>
                      <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Rol: {user.rol}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-gray-300" />
                  <DropdownMenuItem 
                    className="cursor-pointer font-semibold hover:bg-blue-50"
                    onClick={() => navigate('/perfil')}
                  >
                    <User className="mr-2 h-4 w-4 text-blue-600" />
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
                    onClick={handleLogout}
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
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Button
          onClick={() => navigate('/dashboard')}
          variant="outline"
          className="mb-6 border-2 border-gray-400 hover:border-blue-600 font-semibold"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al Dashboard
        </Button>

        {/* Profile Card */}
        <Card className="border-2 border-blue-600 shadow-xl">
          <CardHeader className="border-b-4 border-blue-600 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-blue-600 p-4 rounded-full border-4 border-blue-700">
                  <UserCircle className="h-12 w-12 text-white" />
                </div>
                <div>
                  <CardTitle className="text-3xl font-bold text-gray-900">Mi Perfil</CardTitle>
                  <CardDescription className="text-gray-600 font-medium">
                    Visualiza y edita tu información personal
                  </CardDescription>
                </div>
              </div>
              {!isEditing && (
                <Button
                  onClick={() => setIsEditing(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white border-2 border-blue-700 font-bold"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Editar Perfil
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="pt-6 bg-white">
            {!isEditing ? (
              // Vista de solo lectura
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-gray-600 font-bold text-sm">
                      <User className="h-4 w-4 text-blue-600" />
                      <Label>Nombre</Label>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg border-2 border-gray-300">
                      <p className="text-gray-900 font-semibold">{user.nombre}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-gray-600 font-bold text-sm">
                      <User className="h-4 w-4 text-blue-600" />
                      <Label>Apellido</Label>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg border-2 border-gray-300">
                      <p className="text-gray-900 font-semibold">{user.apellido}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-gray-600 font-bold text-sm">
                      <UserCircle className="h-4 w-4 text-purple-600" />
                      <Label>Usuario</Label>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg border-2 border-gray-300">
                      <p className="text-gray-900 font-semibold">{user.usuario}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-gray-600 font-bold text-sm">
                      <Mail className="h-4 w-4 text-green-600" />
                      <Label>Correo Electrónico</Label>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg border-2 border-gray-300">
                      <p className="text-gray-900 font-semibold">{user.correo}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-gray-600 font-bold text-sm">
                      <Building2 className="h-4 w-4 text-orange-600" />
                      <Label>Nombre de la Empresa</Label>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg border-2 border-gray-300">
                      <p className="text-gray-900 font-semibold">{user.nombreEmpresa}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-gray-600 font-bold text-sm">
                      <Calendar className="h-4 w-4 text-red-600" />
                      <Label>Fecha de Nacimiento</Label>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg border-2 border-gray-300">
                      <p className="text-gray-900 font-semibold">
                        {user.fechaNacimiento 
                          ? new Date(user.fechaNacimiento).toLocaleDateString('es-VE', {
                              timeZone: 'UTC',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })
                          : 'No registrada'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Vista de edición
              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="nombre" className="text-gray-800 font-bold text-sm flex items-center gap-2">
                      <User className="h-4 w-4 text-blue-600" />
                      Nombre
                    </Label>
                    <Input
                      id="nombre"
                      type="text"
                      placeholder="Tu nombre"
                      className="border-2 border-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 transition-all h-11"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="apellido" className="text-gray-800 font-bold text-sm flex items-center gap-2">
                      <User className="h-4 w-4 text-blue-600" />
                      Apellido
                    </Label>
                    <Input
                      id="apellido"
                      type="text"
                      placeholder="Tu apellido"
                      className="border-2 border-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 transition-all h-11"
                      value={formData.apellido}
                      onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="usuario" className="text-gray-800 font-bold text-sm flex items-center gap-2">
                      <UserCircle className="h-4 w-4 text-purple-600" />
                      Usuario
                    </Label>
                    <Input
                      id="usuario"
                      type="text"
                      placeholder="Nombre de usuario"
                      className="border-2 border-gray-400 focus:border-purple-600 focus:ring-2 focus:ring-purple-200 transition-all h-11"
                      value={formData.usuario}
                      onChange={(e) => setFormData({ ...formData, usuario: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="correo" className="text-gray-800 font-bold text-sm flex items-center gap-2">
                      <Mail className="h-4 w-4 text-green-600" />
                      Correo Electrónico
                    </Label>
                    <Input
                      id="correo"
                      type="email"
                      placeholder="tu@email.com"
                      className="border-2 border-gray-400 focus:border-green-600 focus:ring-2 focus:ring-green-200 transition-all h-11"
                      value={formData.correo}
                      onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nombreEmpresa" className="text-gray-800 font-bold text-sm flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-orange-600" />
                      Nombre de la Empresa
                    </Label>
                    <Input
                      id="nombreEmpresa"
                      type="text"
                      placeholder="Nombre de tu empresa"
                      className="border-2 border-gray-400 focus:border-orange-600 focus:ring-2 focus:ring-orange-200 transition-all h-11"
                      value={formData.nombreEmpresa}
                      onChange={(e) => setFormData({ ...formData, nombreEmpresa: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fechaNacimiento" className="text-gray-800 font-bold text-sm flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-red-600" />
                      Fecha de Nacimiento
                    </Label>
                    <Input
                      id="fechaNacimiento"
                      type="date"
                      className="border-2 border-gray-400 focus:border-red-600 focus:ring-2 focus:ring-red-200 transition-all h-11"
                      value={formData.fechaNacimiento}
                      onChange={(e) => setFormData({ ...formData, fechaNacimiento: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4 border-t-2 border-gray-200">
                  <Button
                    type="submit"
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white border-2 border-green-700 font-bold py-6 text-base"
                  >
                    <Save className="mr-2 h-5 w-5" />
                    Guardar Cambios
                  </Button>
                  <Button
                    type="button"
                    onClick={handleCancel}
                    variant="outline"
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 border-2 border-gray-400 font-bold py-6 text-base"
                  >
                    <X className="mr-2 h-5 w-5" />
                    Cancelar
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

      </main>
    </div>
  );
}
