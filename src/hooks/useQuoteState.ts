import { useMemo, useState } from "react";
import {
  COSTO_BASE,
  IVA_RATE,
  PRODUCTOS,
  type ProductoKey,
} from "@/lib/vialux/constants";

export type QuoteState = {
  cliente: string;
  empresa: string;
  telefono: string;
  cp: string;
  municipio: string;
  estadoNombre: string;
  producto: ProductoKey;
  cantidad: number;
  requiereFactura: boolean;
  precioEspecialOn: boolean;
  precioEspecial: number;
  notas: string;
  revision: number;
  folioPadre: string | null;
  incluyeFlete: boolean;
  fletePaqueteria: string;
  fleteModalidad: "ENTREGA A DOMICILIO" | "OCURRE";
  fleteCosto: number;
};

export const initialQuote: QuoteState = {
  cliente: "",
  empresa: "",
  telefono: "",
  cp: "",
  municipio: "",
  estadoNombre: "",
  producto: "boya_clavos",
  cantidad: 0,
  requiereFactura: true,
  precioEspecialOn: false,
  precioEspecial: 0,
  notas: "",
  revision: 0,
  folioPadre: null,
  incluyeFlete: false,
  fletePaqueteria: "",
  fleteModalidad: "ENTREGA A DOMICILIO",
  fleteCosto: 0,
};

export function useQuoteState(initial: QuoteState = initialQuote) {
  const [state, setState] = useState<QuoteState>(initial);

  const update = <K extends keyof QuoteState>(key: K, value: QuoteState[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  const reset = () => setState(initialQuote);

  const calc = useMemo(() => {
    const producto = PRODUCTOS[state.producto];
    const listPrice = state.requiereFactura ? producto.conFactura : producto.sinFactura;
    const precioUnitario =
      state.precioEspecialOn && state.precioEspecial > 0
        ? state.precioEspecial
        : listPrice;
    const subtotalProducto = precioUnitario * (state.cantidad || 0);
    const subtotalFlete = state.incluyeFlete ? state.fleteCosto || 0 : 0;
    const subtotalGeneral = subtotalProducto + subtotalFlete;
    const iva = state.requiereFactura ? subtotalGeneral * IVA_RATE : 0;
    const total = subtotalGeneral + iva;
    const margen =
      precioUnitario > 0 ? ((precioUnitario - COSTO_BASE) / precioUnitario) * 100 : 0;
    return {
      producto,
      listPrice,
      precioUnitario,
      subtotalProducto,
      subtotalFlete,
      subtotalGeneral,
      iva,
      total,
      margen,
    };
  }, [state]);

  return { state, setState, update, reset, calc };
}
