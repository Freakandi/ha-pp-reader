# stock_info_yfinance.py

import yfinance as yf

def get_stock_info(symbol):
    stock = yf.Ticker(symbol)

    info = stock.info

    stock_data = {
        "Symbol": info.get("symbol", "N/A"),
        "Short Name": info.get("shortName", "N/A"),
        "Long Name": info.get("longName", "N/A"),
        "Current Price": info.get("regularMarketPrice", "N/A"),
        "Previous Close": info.get("regularMarketPreviousClose", "N/A"),
        "Market Cap": info.get("marketCap", "N/A"),
        "Currency": info.get("currency", "N/A"),
        "52 Week High": info.get("fiftyTwoWeekHigh", "N/A"),
        "52 Week Low": info.get("fiftyTwoWeekLow", "N/A"),
        "Dividend Yield": info.get("dividendYield", "N/A"),
        "Trailing P/E": info.get("trailingPE", "N/A"),
        "Forward P/E": info.get("forwardPE", "N/A"),
    }

    print("\nAktieninformationen:")
    for key, value in stock_data.items():
        print(f"{key}: {value}")

if __name__ == "__main__":
    symbol = input("Bitte gib das Aktiensymbol ein (z.B. HEN.DE): ").strip()
    get_stock_info(symbol)
