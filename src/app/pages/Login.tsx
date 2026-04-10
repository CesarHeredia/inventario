import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { LogIn } from "lucide-react";
import { toast } from "sonner";
import * as api from "../../utils/api";

export function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    usuario: "",
    contraseña: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Llamar a la API de login
    api.login(formData.usuario, formData.contraseña)
      .then(response => {
        if (response.success) {
          const user = response.user;
          // Store current user session
          sessionStorage.setItem('currentUser', JSON.stringify({
            id: user.id || user.usuario,
            usuario: user.usuario,
            nombre: user.nombre,
            apellido: user.apellido,
            correo: user.correo,
            nombreEmpresa: user.nombreEmpresa,
            fechaNacimiento: user.fechaNacimiento || null,
            rol: user.tipoUsuario || user.rol || 'jefe',
            limiteProductos: user.limiteProductos || 20,
            limiteServicios: user.limiteServicios || 10,
            limiteCombos: user.limiteCombos || 5,
            fechaExpiracion: user.fechaExpiracion || null,
            jefeId: user.jefeId || null,
          }));
          
          toast.success(`¡Bienvenido, ${user.nombre}!`);
          if (user.rol === 'trabajador') {
            navigate('/ventas');
          } else if (user.rol === 'admin') {
            navigate('/admin-panel');
          } else {
            navigate('/dashboard');
          }
        }
      })
      .catch(error => {
        console.error('Error en login:', error);
        toast.error('Usuario o contraseña incorrectos');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md shadow-xl border-2 border-blue-600">
        <CardHeader className="space-y-1 text-center border-b-4 border-blue-600 bg-white pb-6">
          <CardTitle className="text-3xl font-bold text-gray-900">INVENTORIA</CardTitle>
          <CardDescription className="text-gray-600 font-medium">
            Sistema de Inventario y Contabilidad
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 bg-white">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="usuario" className="text-gray-800 font-bold text-sm">Usuario</Label>
              <Input
                id="usuario"
                type="text"
                placeholder="Ingresa tu usuario"
                className="border-2 border-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 transition-all h-11"
                value={formData.usuario}
                onChange={(e) => setFormData({ ...formData, usuario: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contraseña" className="text-gray-800 font-bold text-sm">Contraseña</Label>
              <Input
                id="contraseña"
                type="password"
                placeholder="Ingresa tu contraseña"
                className="border-2 border-gray-400 focus:border-green-600 focus:ring-2 focus:ring-green-200 transition-all h-11"
                value={formData.contraseña}
                onChange={(e) => setFormData({ ...formData, contraseña: e.target.value })}
                required
              />
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 text-base shadow-md border-2 border-blue-700 hover:border-blue-800 transition-all" disabled={loading}>
              <LogIn className="mr-2 h-5 w-5" />
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>

            <div className="text-center pt-2">
              <Link to="/recover" className="text-sm text-gray-600 hover:text-blue-600 font-bold hover:underline">
                ¿Olvidé mi usuario o contraseña?
              </Link>
            </div>
          </form>

          <div className="mt-6 text-center border-t-2 border-gray-200 pt-4">
            <p className="text-sm text-gray-700 font-medium">
              ¿No tienes cuenta?{' '}
              <Link to="/register" className="text-blue-600 hover:text-blue-700 font-bold hover:underline">
                Regístrate aquí
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}