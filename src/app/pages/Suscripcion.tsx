import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { 
  ArrowLeft, 
  CreditCard, 
  Check, 
  Upload, 
  Calendar, 
  Package, 
  Briefcase, 
  Star,
  Clock,
  Zap,
  DollarSign,
  User as UserIcon,
  UserCog,
  LogOut,
  ChevronRight,
  Plus,
  Phone,
  Building2,
  Fingerprint
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

interface Plan {
  id: number;
  nombre: string;
  precioUSD: number;
  extraProductos: number;
  extraServicios: number;
  extraCombos: number;
  color: string;
  gradient: string;
  classes: {
    border: string;
    ring: string;
    bg: string;
    bgHover: string;
  };
}

export function Suscripcion() {
  const navigate = useNavigate();
  const { price: dolarPrice } = useDolarPrice(60000);
  const [user, setUser] = useState<User | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const planes: Plan[] = [
    {
      id: 1,
      nombre: "Plan Emprendedor",
      precioUSD: 5,
      extraProductos: 10,
      extraServicios: 5,
      extraCombos: 0,
      color: "blue",
      gradient: "from-blue-500 to-indigo-600",
      classes: { border: "border-blue-500", ring: "ring-blue-500/10", bg: "bg-blue-500", bgHover: "hover:bg-blue-600" }
    },
    {
      id: 2,
      nombre: "Plan Negocio",
      precioUSD: 10,
      extraProductos: 25,
      extraServicios: 20,
      extraCombos: 15,
      color: "purple",
      gradient: "from-purple-500 to-pink-600",
      classes: { border: "border-purple-500", ring: "ring-purple-500/10", bg: "bg-purple-500", bgHover: "hover:bg-purple-600" }
    },
    {
      id: 3,
      nombre: "Plan Premium",
      precioUSD: 20,
      extraProductos: 60,
      extraServicios: 50,
      extraCombos: 40,
      color: "amber",
      gradient: "from-amber-400 to-orange-600",
      classes: { border: "border-amber-500", ring: "ring-amber-500/10", bg: "bg-amber-500", bgHover: "hover:bg-amber-600" }
    }
  ];

  useEffect(() => {
    const currentUser = sessionStorage.getItem('currentUser');
    if (currentUser) {
      setUser(JSON.parse(currentUser));
    } else {
      navigate('/login');
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setComprobante(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleEnviarPago = () => {
    if (!selectedPlan || !comprobante) {
      toast.error("Por favor selecciona un plan y sube el comprobante de pago");
      return;
    }

    setIsUploading(true);
    
    // Simular envío a base de datos
    setTimeout(() => {
      const solicitud = {
        id: Date.now().toString(),
        usuarioId: user?.usuario,
        nombreUsuario: `${user?.nombre} ${user?.apellido}`,
        empresa: user?.nombreEmpresa,
        planId: selectedPlan.id,
        planNombre: selectedPlan.nombre,
        montoUSD: selectedPlan.precioUSD,
        montoBS: selectedPlan.precioUSD * dolarPrice,
        comprobante: previewUrl, // En un sistema real sería el path del archivo subido
        fecha: new Date().toISOString(),
        status: 'pendiente'
      };

      const solicitudesActuales = JSON.parse(localStorage.getItem('solicitudesPago') || '[]');
      localStorage.setItem('solicitudesPago', JSON.stringify([...solicitudesActuales, solicitud]));

      setIsUploading(false);
      toast.success("Comprobante enviado exitosamente. El administrador revisará tu pago pronto.");
      setSelectedPlan(null);
      setComprobante(null);
      setPreviewUrl(null);
    }, 2000);
  };

  if (!user) return null;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Contrato Vitalicio (Limitado)";
    return new Date(dateStr).toLocaleDateString('es-VE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const remainingDays = user.fechaExpiracion 
    ? Math.ceil((new Date(user.fechaExpiracion).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header Premium */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4 gap-3">
            <div className="flex-1 flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="hover:bg-gray-100 h-10 w-10 p-0 rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-200">
                  <CreditCard className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="font-black text-xl tracking-tight text-gray-900">Membresía & Límites</h1>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{user.nombreEmpresa}</p>
                </div>
              </div>
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
                    <span className="text-sm">{user.nombre} {user.apellido}</span>
                    <span className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">{user.rol}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/perfil')} className="rounded-xl cursor-pointer py-2.5">
                  <UserIcon className="mr-2 h-4 w-4 text-blue-500" /> Perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/trabajadores')} className="rounded-xl cursor-pointer py-2.5">
                  <UserCog className="mr-2 h-4 w-4 text-purple-500" /> Trabajadores
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { sessionStorage.removeItem('currentUser'); navigate('/login'); }} className="text-red-600 rounded-xl cursor-pointer py-2.5">
                  <LogOut className="mr-2 h-4 w-4" /> Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Current Status Card */}
        <div className="mb-12 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 to-purple-600/10 blur-3xl -z-10 rounded-full h-full w-full opacity-50"></div>
          <Card className="border-0 shadow-2xl rounded-[2rem] overflow-hidden bg-white/40 backdrop-blur-xl border border-white/40">
            <div className="grid grid-cols-1 lg:grid-cols-3">
              <div className="bg-gradient-to-br from-indigo-600 to-purple-800 p-8 text-white flex flex-col justify-center">
                <p className="text-indigo-200 text-xs font-black uppercase tracking-widest mb-2 text-center lg:text-left">Estado de Licencia</p>
                <div className="flex flex-col items-center lg:items-start">
                  <h2 className="text-4xl font-black mb-1">
                    {user.fechaExpiracion ? (remainingDays > 0 ? `${remainingDays} días` : 'Expirada') : 'Limitada'}
                  </h2>
                  <p className="text-sm font-medium text-indigo-100/80 mb-6 italic text-center lg:text-left">
                    {user.fechaExpiracion ? `Vence el ${formatDate(user.fechaExpiracion)}` : 'Sube de plan para aumentar tus capacidades'}
                  </p>
                  <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full border border-white/20">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase">Siguiente Renovación</span>
                  </div>
                </div>
              </div>

              <div className="col-span-2 p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: "Productos", current: 20, max: user.limiteProductos || 20, icon: Package, bgLight: "bg-blue-50", textClass: "text-blue-600" },
                  { label: "Servicios", current: 10, max: user.limiteServicios || 10, icon: Briefcase, bgLight: "bg-purple-50", textClass: "text-purple-600" },
                  { label: "Combos", current: 5, max: user.limiteCombos || 5, icon: Star, bgLight: "bg-amber-50", textClass: "text-amber-600" }
                ].map((stat, i) => (
                  <div key={i} className="flex flex-col gap-3 p-4 rounded-2xl bg-white shadow-sm border border-gray-50">
                    <div className="flex items-center justify-between">
                      <div className={`p-2 rounded-lg ${stat.bgLight} ${stat.textClass}`}>
                        <stat.icon className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] font-black italic text-gray-300 uppercase letter-spacing-1">Capacidad</span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-bold uppercase">{stat.label}</p>
                      <p className="text-2xl font-black text-gray-900">{stat.max}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Plan Selection */}
        <div className="space-y-12">
          <div className="text-center space-y-2">
            <h3 className="text-3xl font-black text-gray-900 tracking-tight">Mejora tu Inventario</h3>
            <p className="text-gray-500 max-w-xl mx-auto">Selecciona uno de nuestros planes mensuales para expandir tus límites y llevar tu negocio al siguiente nivel.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {planes.map((plan) => (
              <Card 
                key={plan.id}
                className={`relative border-2 transition-all duration-300 overflow-hidden cursor-pointer group ${
                  selectedPlan?.id === plan.id 
                    ? `${plan.classes.border} shadow-2xl scale-[1.03] ring-4 ${plan.classes.ring}` 
                    : 'border-gray-100 hover:border-gray-300 hover:shadow-xl'
                } rounded-[2rem]`}
                onClick={() => setSelectedPlan(plan)}
              >
                {selectedPlan?.id === plan.id && (
                  <div className={`absolute top-4 right-4 ${plan.classes.bg} text-white p-1 rounded-full z-10 animate-in zoom-in-0`}>
                    <Check className="h-5 w-5" />
                  </div>
                )}
                
                <CardHeader className={`bg-gradient-to-br ${plan.gradient} text-white p-8`}>
                  <div className="space-y-4">
                    <h4 className="font-black text-xl uppercase tracking-tighter opacity-90">{plan.nombre}</h4>
                    <div className="flex items-baseline">
                      <span className="text-5xl font-black">$ {plan.precioUSD}</span>
                      <span className="text-sm font-bold opacity-70 ml-2">/ mensual</span>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg inline-block">
                      <p className="text-[10px] font-black uppercase tracking-widest">
                        Coste Estimado: Bs {(plan.precioUSD * dolarPrice).toLocaleString('es-VE')}
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-8 space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-green-500"></div>
                      <p className="text-sm font-bold text-gray-700">+{plan.extraProductos} Productos</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-green-500"></div>
                      <p className="text-sm font-bold text-gray-700">+{plan.extraServicios} Servicios</p>
                    </div>
                    {plan.extraCombos > 0 && (
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-green-500"></div>
                        <p className="text-sm font-bold text-gray-700">+{plan.extraCombos} Combos</p>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-indigo-500"></div>
                      <p className="text-sm font-bold text-gray-700">Soporte Prioritario</p>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="p-8 pt-0">
                  <Button 
                    className={`w-full h-12 rounded-xl font-bold transition-all ${
                      selectedPlan?.id === plan.id 
                        ? `${plan.classes.bg} ${plan.classes.bgHover} text-white` 
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                    }`}
                  >
                    {selectedPlan?.id === plan.id ? 'Seleccionado' : 'Elegir Plan'}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>

        {/* Upload Proof */}
        {selectedPlan && (
          <div className="mt-20 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-10 duration-500">
            <Card className="border-0 shadow-2xl rounded-[2.5rem] overflow-hidden">
              <div className={`h-2 bg-gradient-to-r ${selectedPlan.gradient}`}></div>
              <CardHeader className="p-8 text-center pb-0">
                <div className="mx-auto bg-gray-50 h-16 w-16 rounded-2xl flex items-center justify-center mb-4 border border-gray-100 shadow-sm">
                  <Upload className="h-8 w-8 text-indigo-600" />
                </div>
                <CardTitle className="text-2xl font-black">Confirmar Pago</CardTitle>
                <CardDescription className="text-base font-medium">
                  Has seleccionado el <strong>{selectedPlan.nombre}</strong>. Por favor sube una captura de pantalla de tu comprobante de pago móvil o transferencia.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
                  {/* Left Column: Payment Details */}
                  <div className="bg-indigo-50/50 rounded-[2.5rem] p-8 border border-indigo-100 flex flex-col justify-between gap-6 shadow-inner">
                    <div>
                      <h5 className="font-black text-xl text-indigo-900 uppercase tracking-tighter mb-6 flex items-center gap-2">
                        <div className="h-8 w-1 bg-indigo-500 rounded-full"></div>
                        Datos Pago Móvil
                      </h5>
                      
                      <div className="space-y-5">
                        <div className="flex items-center gap-4 bg-white/60 p-4 rounded-2xl border border-white/80 shadow-sm">
                          <div className="bg-indigo-100 p-2.5 rounded-xl text-indigo-600">
                            <Fingerprint className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Cédula</p>
                            <p className="font-black text-indigo-900 text-lg">V-29.776.883</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 bg-white/60 p-4 rounded-2xl border border-white/80 shadow-sm">
                          <div className="bg-indigo-100 p-2.5 rounded-xl text-indigo-600">
                            <Building2 className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Banco</p>
                            <p className="font-black text-indigo-900 text-lg uppercase">Bancamiga</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 bg-white/60 p-4 rounded-2xl border border-white/80 shadow-sm">
                          <div className="bg-indigo-100 p-2.5 rounded-xl text-indigo-600">
                            <Phone className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Teléfono</p>
                            <p className="font-black text-indigo-900 text-lg">0414-365.52.37</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/40 p-4 rounded-2xl border border-white/60 flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                      <p className="text-[10px] font-bold text-indigo-900/60 uppercase tracking-wider">Aprobación Inmediata tras validación</p>
                    </div>
                  </div>

                  {/* Right Column: Upload */}
                  <div className="flex flex-col gap-4">
                    <p className="text-sm font-black text-gray-400 uppercase tracking-widest px-2">Sube tu Comprobante</p>
                    <div 
                      className={`flex-1 border-4 border-dashed rounded-[2.5rem] p-8 flex flex-col items-center justify-center transition-all cursor-pointer min-h-[300px] ${
                        previewUrl ? 'border-green-300 bg-green-50/30' : 'border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30'
                      }`}
                      onClick={() => document.getElementById('comprobante')?.click()}
                    >
                      <input 
                        type="file" 
                        id="comprobante" 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleFileChange}
                      />
                      
                      {previewUrl ? (
                        <div className="flex flex-col items-center gap-6 animate-in zoom-in-50 duration-300">
                          <div className="relative">
                            <img src={previewUrl} alt="Preview" className="h-44 w-auto rounded-[2rem] shadow-2xl border-4 border-white object-cover" />
                            <div className="absolute -bottom-3 -right-3 bg-green-500 text-white p-2 rounded-full shadow-lg">
                              <Check className="h-4 w-4" />
                            </div>
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-black text-green-600 uppercase tracking-widest">¡Imagen Listada!</p>
                            <Button variant="link" className="text-xs font-bold text-gray-400 uppercase px-0 h-auto mt-1">Cambiar archivo</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-6">
                          <div className="h-16 w-16 rounded-[1.5rem] bg-white shadow-xl flex items-center justify-center border border-gray-50">
                            <Plus className="h-8 w-8 text-indigo-300" />
                          </div>
                          <div className="text-center space-y-1">
                            <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Click para Subir</p>
                            <p className="text-[10px] font-bold text-gray-300 uppercase letter-spacing-1 italic">JPG, PNG o Screenshot</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50/50 border border-amber-100/50 p-5 rounded-3xl flex gap-4 backdrop-blur-sm">
                   <div className="bg-amber-100 p-2 rounded-xl h-fit">
                    <Zap className="h-5 w-5 text-amber-600 flex-shrink-0" />
                   </div>
                   <p className="text-xs text-amber-900/70 font-bold leading-relaxed">
                     Tu solicitud será revisada por nuestro equipo en un plazo máximo de 24 horas. 
                     <span className="block mt-1 text-amber-600">Por favor asegúrate de que el número de referencia sea claramente visible en la imagen.</span>
                   </p>
                </div>
              </CardContent>

              <CardFooter className="p-8 pt-0 flex flex-col gap-4">
                <Button 
                  onClick={handleEnviarPago} 
                  disabled={isUploading || !comprobante}
                  className="w-full h-14 bg-gray-900 hover:bg-black text-white rounded-2xl text-lg font-black shadow-xl disabled:opacity-50 flex items-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Procesando...
                    </>
                  ) : (
                    <>
                      Enviar Comprobante
                      <ChevronRight className="h-5 w-5" />
                    </>
                  )}
                </Button>
                <Button variant="ghost" onClick={() => setSelectedPlan(null)} className="font-bold text-gray-400 hover:text-gray-600">
                  Cancelar selección
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
