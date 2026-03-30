import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import * as api from "../../utils/api";

export function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    usuario: "",
    correo: "",
    contraseña: "",
    nombreEmpresa: "",
    fechaNacimiento: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validar contraseña
    if (formData.contraseña.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      setLoading(false);
      return;
    }

    // Validar mayoría de edad
    if (!formData.fechaNacimiento) {
      toast.error('La fecha de nacimiento es requerida');
      setLoading(false);
      return;
    }

    const birthDate = new Date(formData.fechaNacimiento);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    if (age < 18) {
      toast.error('Debes ser mayor de 18 años para registrarte');
      setLoading(false);
      return;
    }

    // Validar nombre y apellido (longitud y no números)
    const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    if (formData.nombre.length > 20 || formData.apellido.length > 20) {
      toast.error('El nombre y apellido no pueden superar los 20 caracteres');
      setLoading(false);
      return;
    }

    if (!nameRegex.test(formData.nombre) || !nameRegex.test(formData.apellido)) {
      toast.error('El nombre y apellido no pueden contener números ni caracteres especiales');
      setLoading(false);
      return;
    }

    // Validar usuario y correo (longitud)
    if (formData.usuario.length > 20) {
      toast.error('El usuario no puede superar los 20 caracteres');
      setLoading(false);
      return;
    }

    if (formData.correo.length > 40) {
      toast.error('El correo no puede superar los 40 caracteres');
      setLoading(false);
      return;
    }

    if (formData.nombreEmpresa.length > 50) {
      toast.error('El nombre de la empresa no puede superar los 50 caracteres');
      setLoading(false);
      return;
    }

    // Llamar a la API de registro
    api.register({
      ...formData,
      rol: 'jefe',
      limiteProductos: 20,
      limiteServicios: 10,
      limiteCombos: 5
    })
      .then(response => {
        if (response.success) {
          toast.success('¡Registro exitoso! Ahora puedes iniciar sesión');
          navigate('/login');
        }
      })
      .catch(error => {
        toast.error(error.message || 'El usuario o correo ya están registrados');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-2xl shadow-xl border-2 border-green-600">
        <CardHeader className="space-y-1 text-center border-b-4 border-green-600 bg-white pb-6">
          <CardTitle className="text-3xl font-bold text-gray-900">INVENTORIA</CardTitle>
          <CardDescription className="text-gray-600 font-medium">
            Registra tu empresa y comienza a gestionar tu inventario y contabilidad
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 bg-white">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombre" className="text-gray-800 font-bold text-sm">Nombre</Label>
                <Input
                  id="nombre"
                  type="text"
                  placeholder="Tu nombre"
                  className="border-2 border-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 transition-all h-11"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                  maxLength={20}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="apellido" className="text-gray-800 font-bold text-sm">Apellido</Label>
                <Input
                  id="apellido"
                  type="text"
                  placeholder="Tu apellido"
                  className="border-2 border-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 transition-all h-11"
                  value={formData.apellido}
                  onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                  required
                  maxLength={20}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="usuario" className="text-gray-800 font-bold text-sm">Usuario</Label>
                <Input
                  id="usuario"
                  type="text"
                  placeholder="Nombre de usuario"
                  className="border-2 border-gray-400 focus:border-purple-600 focus:ring-2 focus:ring-purple-200 transition-all h-11"
                  value={formData.usuario}
                  onChange={(e) => setFormData({ ...formData, usuario: e.target.value })}
                  required
                  maxLength={20}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="correo" className="text-gray-800 font-bold text-sm">Correo Electrónico</Label>
                <Input
                  id="correo"
                  type="email"
                  placeholder="tu@email.com"
                  className="border-2 border-gray-400 focus:border-purple-600 focus:ring-2 focus:ring-purple-200 transition-all h-11"
                  value={formData.correo}
                  onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                  required
                  maxLength={40}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contraseña" className="text-gray-800 font-bold text-sm">Contraseña</Label>
                <Input
                  id="contraseña"
                  type="password"
                  placeholder="Crea una contraseña segura"
                  className="border-2 border-gray-400 focus:border-orange-600 focus:ring-2 focus:ring-orange-200 transition-all h-11"
                  value={formData.contraseña}
                  onChange={(e) => setFormData({ ...formData, contraseña: e.target.value })}
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fechaNacimiento" className="text-gray-800 font-bold text-sm">Fecha de Nacimiento</Label>
                <Input
                  id="fechaNacimiento"
                  type="date"
                  className="border-2 border-gray-400 focus:border-orange-600 focus:ring-2 focus:ring-orange-200 transition-all h-11"
                  value={formData.fechaNacimiento}
                  onChange={(e) => setFormData({ ...formData, fechaNacimiento: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nombreEmpresa" className="text-gray-800 font-bold text-sm">Nombre de la Empresa</Label>
              <Input
                id="nombreEmpresa"
                type="text"
                placeholder="Nombre de tu empresa"
                className="border-2 border-gray-400 focus:border-green-600 focus:ring-2 focus:ring-green-200 transition-all h-11"
                value={formData.nombreEmpresa}
                onChange={(e) => setFormData({ ...formData, nombreEmpresa: e.target.value })}
                required
                maxLength={50}
              />
            </div>

            <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-6 text-base shadow-md border-2 border-green-700 hover:border-green-800 transition-all" disabled={loading}>
              <UserPlus className="mr-2 h-5 w-5" />
              {loading ? 'Registrando...' : 'Crear Cuenta'}
            </Button>
          </form>

          <div className="mt-6 text-center border-t-2 border-gray-200 pt-4">
            <p className="text-sm text-gray-700 font-medium">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="text-green-600 hover:text-green-700 font-bold hover:underline">
                Inicia sesión aquí
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}