import { useState, useEffect } from 'react';

interface DolarData {
  price: number;
  lastUpdate: string;
  source: string;
  loading: boolean;
  error: string | null;
}

export function useDolarPrice(autoUpdateInterval = 60000) { // Default: actualizar cada 60 segundos
  const [dolarData, setDolarData] = useState<DolarData>({
    price: 0,
    lastUpdate: '',
    source: '',
    loading: true,
    error: null,
  });

  const fetchDolarPrice = async () => {
    try {
      setDolarData(prev => ({ ...prev, loading: true, error: null }));

      // Intentar con múltiples APIs
      const apis = [
        'https://ve.dolarapi.com/v1/dolares/oficial',
        'https://pydolarve.org/api/v1/dollar?page=bcv',
      ];
      
      let priceObtained = false;
      let vesRate = 0;
      let sourceName = '';

      for (const apiUrl of apis) {
        try {
          const response = await fetch(apiUrl);
          if (!response.ok) continue;

          const data = await response.json();
          // Manejar diferentes formatos de respuesta
          const price = data.promedio || data.price || data.valor || 0;
          
          if (price > 0) {
            vesRate = price;
            sourceName = apiUrl.includes('dolarapi') ? 'DolarApi Oficial (BCV)' : 'PyDolarVe (BCV)';
            priceObtained = true;
            break;
          }
        } catch (apiError) {
          continue;
        }
      }

      if (!priceObtained) {
        throw new Error('Error al obtener la tasa de cambio');
      }

      setDolarData({
        price: vesRate,
        lastUpdate: new Date().toLocaleString('es-VE', {
          timeZone: 'America/Caracas',
          dateStyle: 'short',
          timeStyle: 'short'
        }),
        source: sourceName,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error fetching dolar price:', error);
      
      // Fallback: usar un valor simulado si la API falla
      setDolarData({
        price: 36.50, // Valor de ejemplo
        lastUpdate: new Date().toLocaleString('es-VE', {
          timeZone: 'America/Caracas',
          dateStyle: 'short',
          timeStyle: 'short'
        }),
        source: 'Valor de referencia',
        loading: false,
        error: 'No se pudo conectar con la API. Mostrando valor de referencia.',
      });
    }
  };

  useEffect(() => {
    // Cargar inmediatamente
    fetchDolarPrice();

    // Configurar actualización automática
    const interval = setInterval(() => {
      fetchDolarPrice();
    }, autoUpdateInterval);

    // Limpiar intervalo al desmontar
    return () => clearInterval(interval);
  }, [autoUpdateInterval]);

  return { ...dolarData, refresh: fetchDolarPrice };
}
