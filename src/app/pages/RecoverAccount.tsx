import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { ArrowLeft, Mail, Key, User as UserIcon, CheckCircle2, AlertCircle, ShieldCheck, Save } from "lucide-react";
import { toast } from "sonner";
import * as api from "../../utils/api";

type Step = 'select-type' | 'enter-email' | 'enter-code' | 'reset-value' | 'success';

export function RecoverAccount() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('select-type');
  const [loading, setLoading] = useState(false);
  const [recoveryType, setRecoveryType] = useState<'usuario' | 'contraseña' | null>(null);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newValue, setNewValue] = useState("");
  const [confirmValue, setConfirmValue] = useState("");
  const [debugCode, setDebugCode] = useState("");

  const handleSendCode = async () => {
    setLoading(true);
    try {
      const res = await api.sendRecoveryCode(email);
      if (res.success) {
        toast.success("Código enviado exitosamente");
        if (res.debug_code) setDebugCode(res.debug_code);
        setStep('enter-code');
      }
    } catch (error: any) {
      toast.error(error.message || "Error al enviar código");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setLoading(true);
    try {
      const res = await api.verifyRecoveryCode(email, code);
      if (res.success) {
        toast.success("Código verificado");
        setStep('reset-value');
      }
    } catch (error: any) {
      toast.error(error.message || "Código inválido o expirado");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (recoveryType === 'contraseña' && newValue !== confirmValue) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    if (newValue.length < 4) {
      toast.error("Debe tener al menos 4 caracteres");
      return;
    }

    setLoading(true);
    try {
      const res = await api.resetCredentials({
        correo: email,
        codigo: code,
        type: recoveryType!,
        newValue
      });
      if (res.success) {
        toast.success("Cambio realizado exitosamente");
        setStep('success');
      }
    } catch (error: any) {
      toast.error(error.message || "Error al actualizar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md shadow-lg border-2 border-blue-600">
        <CardHeader className="bg-white border-b-4 border-blue-600">
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" onClick={() => step === 'select-type' ? navigate('/login') : setStep('select-type')} className="p-0 h-8 w-8">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <CardTitle className="text-xl font-bold">Recuperar Cuenta</CardTitle>
          </div>
          <CardDescription className="text-gray-600 font-medium">
            Sigue los pasos para restablecer tu acceso
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-8 space-y-6">
          {step === 'select-type' && (
            <div className="grid gap-4">
              <Button 
                variant="outline" 
                className="h-24 flex flex-col gap-2 border-2 hover:border-blue-600 hover:bg-blue-50 group"
                onClick={() => { setRecoveryType('usuario'); setStep('enter-email'); }}
              >
                <UserIcon className="h-8 w-8 text-gray-400 group-hover:text-blue-600" />
                <span className="font-bold text-gray-700">Olvidé mi Usuario</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-24 flex flex-col gap-2 border-2 hover:border-blue-600 hover:bg-blue-50 group"
                onClick={() => { setRecoveryType('contraseña'); setStep('enter-email'); }}
              >
                <Key className="h-8 w-8 text-gray-400 group-hover:text-blue-600" />
                <span className="font-bold text-gray-700">Olvidé mi Contraseña</span>
              </Button>
            </div>
          )}

          {step === 'enter-email' && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg flex gap-3 border border-blue-200">
                <Mail className="h-6 w-6 text-blue-600 shrink-0" />
                <p className="text-sm text-blue-800">
                  Ingresa el correo electrónico asociado a tu cuenta para recibir el código de validación.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="font-bold">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ejemplo@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-2 h-12"
                  autoFocus
                />
              </div>
              <Button className="w-full bg-blue-600 h-12 font-bold text-lg" disabled={loading || !email} onClick={handleSendCode}>
                {loading ? "Verificando..." : "Continuar"}
              </Button>
            </div>
          )}

          {step === 'enter-code' && (
            <div className="space-y-4">
              <div className="bg-orange-50 p-4 rounded-lg flex gap-3 border border-orange-200">
                <ShieldCheck className="h-6 w-6 text-orange-600 shrink-0" />
                <p className="text-sm text-orange-800">
                  Hemos generado un código de 6 dígitos. Por favor, ingrésalo a continuación.
                </p>
              </div>
              <div className="space-y-2 text-center">
                <Label htmlFor="code" className="font-bold">Código de Verificación</Label>
                <Input
                  id="code"
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  className="text-center text-3xl font-black tracking-widest h-16 border-2 border-blue-600"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  autoFocus
                />
                {debugCode && (
                  <p className="text-xs text-red-500 font-bold mt-2 bg-red-50 p-1 rounded inline-block">
                    PROBANDO: {debugCode}
                  </p>
                )}
              </div>
              <Button className="w-full bg-blue-600 h-12 font-bold text-lg" disabled={loading || code.length < 6} onClick={handleVerifyCode}>
                {loading ? "Validando..." : "Verificar Código"}
              </Button>
            </div>
          )}

          {step === 'reset-value' && (
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg flex gap-3 border border-green-200">
                <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
                <p className="text-sm text-green-800">
                  Código verificado. Ahora puedes establecer tu {recoveryType === 'usuario' ? 'nuevo nombre de usuario' : 'nueva contraseña'}.
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newValue" className="font-bold">
                    {recoveryType === 'usuario' ? 'Nuevo Usuario' : 'Nueva Contraseña'}
                  </Label>
                  <Input
                    id="newValue"
                    type={recoveryType === 'usuario' ? 'text' : 'password'}
                    placeholder={recoveryType === 'usuario' ? 'Ingresa el nuevo usuario' : 'Mínimo 4 caracteres'}
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    className="border-2 h-12"
                  />
                </div>

                {recoveryType === 'contraseña' && (
                  <div className="space-y-2">
                    <Label htmlFor="confirmValue" className="font-bold">Confirmar Nueva Contraseña</Label>
                    <Input
                      id="confirmValue"
                      type="password"
                      placeholder="Repite la contraseña"
                      value={confirmValue}
                      onChange={(e) => setConfirmValue(e.target.value)}
                      className="border-2 h-12"
                    />
                  </div>
                )}
              </div>

              <Button className="w-full bg-green-600 h-12 font-bold text-lg" disabled={loading || !newValue} onClick={handleReset}>
                <Save className="mr-2 h-5 w-5" />
                {loading ? "Guardando..." : "Actualizar"}
              </Button>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-6 space-y-6">
              <div className="bg-green-100 h-20 w-20 rounded-full flex items-center justify-center mx-auto border-4 border-green-600">
                <ShieldCheck className="h-10 w-10 text-green-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-gray-900">¡Listo!</h3>
                <p className="text-gray-600 font-medium">
                  Tu {recoveryType === 'usuario' ? 'usuario' : 'contraseña'} ha sido actualizado con éxito. Ya puedes iniciar sesión.
                </p>
              </div>
              <Button className="w-full bg-blue-600 h-12 font-bold text-lg" onClick={() => navigate('/login')}>
                Ir al Login
              </Button>
            </div>
          )}
        </CardContent>

        <CardFooter className="bg-gray-50 border-t-2 py-4 flex justify-center">
          <p className="text-xs text-gray-500 font-semibold flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Sistema de Seguridad Protegido
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
