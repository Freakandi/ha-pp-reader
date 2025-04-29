# stock_info.py

import requests

def get_stock_info(symbol):
    url = f"https://query1.finance.yahoo.com/v7/finance/quote?symbols={symbol}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                      "AppleWebKit/537.36 (KHTML, like Gecko) "
                      "Chrome/124.0.0.0 Safari/537.36"
    }
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        data = response.json()

        result = data['quoteResponse']['result'][0]

        stock_data = {
            "Symbol": result.get("symbol", "N/A"),
            "Short Name": result.get("shortName", "N/A"),
            "Long Name": result.get("longName", "N/A"),
            "Current Price": result.get("regularMarketPrice", "N/A"),
            "Previous Close": result.get("regularMarketPreviousClose", "N/A"),
            "Market Cap": result.get("marketCap", "N/A"),
            "Currency": result.get("currency", "N/A"),
            "52 Week High": result.get("fiftyTwoWeekHigh", "N/A"),
            "52 Week Low": result.get("fiftyTwoWeekLow", "N/A"),
            "Dividend Yield": result.get("dividendYield", "N/A"),
            "Trailing P/E": result.get("trailingPE", "N/A"),
            "Forward P/E": result.get("forwardPE", "N/A"),
        }

        print("\nAktieninformationen:")
        for key, value in stock_data.items():
            print(f"{key}: {value}")

    except Exception as e:
        print(f"Fehler beim Abrufen der Daten: {e}")

if __name__ == "__main__":
    symbol = input("Bitte gib das Aktiensymbol ein (z.B. HEN.DE): ").strip()
    get_stock_info(symbol)
