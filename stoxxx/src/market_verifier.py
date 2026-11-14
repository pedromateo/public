import logging
from typing import Dict, Any, Optional, List
import yfinance as yf

logger = logging.getLogger(__name__)

# Mapeo de tickers estándar para índices y valores comunes en consultorios españoles
INDEX_TICKERS = {
    "IBEX 35": "^IBEX",
    "DAX": "^GDAXI",
    "DAX 40": "^GDAXI",
    "S&P 500": "^GSPC",
    "Nasdaq 100": "^NDX",
    "Nasdaq": "^IXIC",
    "Euro Stoxx 50": "^STOXX50E"
}

KNOWN_EQUITY_TICKERS = {
    "Acciona": "ANA.MC",
    "Iberdrola": "IBE.MC",
    "Banco Santander": "SAN.MC",
    "Santander": "SAN.MC",
    "BBVA": "BBVA.MC",
    "CaixaBank": "CABK.MC",
    "Telefónica": "TEF.MC",
    "Telefonica": "TEF.MC",
    "Repsol": "REP.MC",
    "Fluidra": "FDR.MC",
    "Endesa": "ELE.MC",
    "Inditex": "ITX.MC",
    "Cellnex": "CLNX.MC",
    "Grifols": "GRF.MC",
    "Rovi": "ROVI.MC",
    "ACS": "ACS.MC",
    "Logista": "LOG.MC",
    "Nvidia": "NVDA",
    "ASML": "ASML",
    "Apple": "AAPL",
    "Microsoft": "MSFT",
    "AMD": "AMD",
    "Broadcom": "AVGO"
}

class MarketDataVerifier:
    """Verificador de cotizaciones y datos de mercado en tiempo real vía Yahoo Finance."""

    @staticmethod
    def get_quote(symbol: str) -> Optional[Dict[str, Any]]:
        """Obtiene la cotización actual, moneda y variación porcentual de un símbolo."""
        try:
            ticker = yf.Ticker(symbol)
            fast_info = ticker.fast_info
            price = getattr(fast_info, "last_price", None)
            currency = getattr(fast_info, "currency", "")
            prev = getattr(fast_info, "previous_close", None)

            if price is None:
                return None

            change_pct = ((price - prev) / prev * 100.0) if prev and prev > 0 else 0.0

            return {
                "symbol": symbol,
                "price": round(float(price), 2),
                "currency": currency,
                "change_pct": round(float(change_pct), 2),
                "formatted": f"{price:,.2f} {currency}".replace(",", "X").replace(".", ",").replace("X", ".")
            }
        except Exception as e:
            logger.debug(f"Error verificando cotización para {symbol}: {e}")
            return None

    @classmethod
    def enrich_report_data(cls, report_data: Dict[str, Any]) -> Dict[str, Any]:
        """Enriquece el informe con cotizaciones reales verificadas de índices y empresas."""
        # 1. Verificar Índices
        indices = report_data.get("sentimiento_macro", {}).get("indices", [])
        for idx in indices:
            nombre = idx.get("nombre", "")
            symbol = INDEX_TICKERS.get(nombre)
            if not symbol:
                for k, s in INDEX_TICKERS.items():
                    if k.lower() in nombre.lower():
                        symbol = s
                        break

            if symbol:
                quote = cls.get_quote(symbol)
                if quote:
                    idx["precio_actual"] = quote["formatted"]
                    idx["variacion_dia"] = f"{quote['change_pct']:+.2f}%"

        # 2. Verificar Empresas Nacionales e Internacionales
        empresas_dict = report_data.get("analisis_empresas", {})
        for block in ["nacionales", "internacionales"]:
            comp_list = empresas_dict.get(block, [])
            for comp in comp_list:
                ticker = comp.get("ticker", "").strip()
                nombre = comp.get("nombre", "").strip()

                # Resolver ticker si no está o es genérico
                if not ticker or "." not in ticker and block == "nacionales":
                    ticker = KNOWN_EQUITY_TICKERS.get(nombre, ticker)
                    if ticker:
                        comp["ticker"] = ticker

                if ticker:
                    quote = cls.get_quote(ticker)
                    if quote:
                        comp["precio_actual"] = quote["formatted"]
                        comp["variacion_dia"] = f"{quote['change_pct']:+.2f}%"

        report_data["cotizaciones_verificadas"] = True
        return report_data
