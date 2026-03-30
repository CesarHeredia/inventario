import { useDolarPrice } from "../hooks/useDolarPrice";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { TrendingUp, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";

interface DolarPriceWidgetProps {
  updateInterval?: number; // en milisegundos
}

export function DolarPriceWidget({ updateInterval = 60000 }: DolarPriceWidgetProps) {
  const { price, lastUpdate, source, loading, error, refresh } = useDolarPrice(updateInterval);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  return (
    <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-600" />
          <CardTitle className="text-lg text-green-900">
            Precio del Dólar (USD)
          </CardTitle>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={refresh}
          disabled={loading}
          className="h-8 w-8 p-0"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {loading && !price ? (
          <div className="space-y-2">
            <div className="h-10 w-32 bg-green-200 animate-pulse rounded"></div>
            <div className="h-4 w-40 bg-green-100 animate-pulse rounded"></div>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-green-900">
                  Bs {formatPrice(price)}
                </span>
                <span className="text-sm text-green-700">VES</span>
              </div>
              <CardDescription className="text-green-700">
                1 USD = Bs {formatPrice(price)}
              </CardDescription>
            </div>
            
            <div className="mt-3 pt-3 border-t border-green-200">
              <div className="flex items-center justify-between text-xs text-green-700">
                <span>Fuente: {source}</span>
                <span>Actualizado: {lastUpdate}</span>
              </div>
              {error && (
                <div className="mt-2 flex items-start gap-1 text-xs text-amber-700 bg-amber-50 p-2 rounded">
                  <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <div className="mt-2 text-xs text-green-600">
                🔄 Actualización automática cada {updateInterval / 1000} segundos
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
