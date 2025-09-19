import axios from 'axios';
import { config } from '@/config';
import logger from './logger';

export interface PriceData {
  currency: string;
  price: string;
  lastUpdated: Date;
}

export interface CoinGeckoResponse {
  polkadot: {
    usd: number;
    eur: number;
    gbp: number;
    jpy: number;
  };
}

class PriceService {
  private cache: Map<string, PriceData> = new Map();
  private lastUpdate: Date = new Date(0);
  private updateInterval: number = config.priceUpdateInterval;

  constructor() {
    // Start periodic price updates
    this.startPriceUpdates();
  }

  private async startPriceUpdates(): Promise<void> {
    // Initial price fetch
    await this.updatePrices();
    
    // Set up interval for periodic updates
    setInterval(async () => {
      try {
        await this.updatePrices();
      } catch (error) {
        logger.error('Failed to update prices:', error);
      }
    }, this.updateInterval);
  }

  private async updatePrices(): Promise<void> {
    try {
      const response = await axios.get<CoinGeckoResponse>(
        'https://api.coingecko.com/api/v3/simple/price',
        {
          params: {
            ids: 'polkadot',
            vs_currencies: 'usd,eur,gbp,jpy',
            include_24hr_change: false,
          },
          headers: {
            'x-cg-demo-api-key': config.coingeckoApiKey,
          },
          timeout: 10000,
        }
      );

      const polkadotData = response.data.polkadot;
      const now = new Date();

      // Update cache with new prices
      Object.entries(polkadotData).forEach(([currency, price]) => {
        this.cache.set(currency, {
          currency,
          price: price.toString(),
          lastUpdated: now,
        });
      });

      this.lastUpdate = now;
      logger.info('Prices updated successfully', { 
        currencies: Object.keys(polkadotData),
        timestamp: now.toISOString()
      });

    } catch (error) {
      logger.error('Failed to fetch prices from CoinGecko:', error);
      throw new Error('Price update failed');
    }
  }

  public getPrice(currency: string): string | null {
    const priceData = this.cache.get(currency.toLowerCase());
    
    if (!priceData) {
      logger.warn(`No price data found for currency: ${currency}`);
      return null;
    }

    // Check if price is stale (older than 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (priceData.lastUpdated < fiveMinutesAgo) {
      logger.warn(`Price data is stale for currency: ${currency}`, {
        lastUpdated: priceData.lastUpdated,
        age: Date.now() - priceData.lastUpdated.getTime()
      });
    }

    return priceData.price;
  }

  public convertFiatToDOT(amount: number, fiatCurrency: string): string {
    const price = this.getPrice(fiatCurrency);
    
    if (!price) {
      throw new Error(`Unable to get price for currency: ${fiatCurrency}`);
    }

    const priceNumber = parseFloat(price);
    if (isNaN(priceNumber) || priceNumber <= 0) {
      throw new Error(`Invalid price data for currency: ${fiatCurrency}`);
    }

    const dotAmount = amount / priceNumber;
    
    // Round to 8 decimal places (DOT has 10 decimal places, but we'll use 8 for precision)
    return dotAmount.toFixed(8);
  }

  public convertDOTToFiat(dotAmount: string, fiatCurrency: string): number {
    const price = this.getPrice(fiatCurrency);
    
    if (!price) {
      throw new Error(`Unable to get price for currency: ${fiatCurrency}`);
    }

    const priceNumber = parseFloat(price);
    const dotNumber = parseFloat(dotAmount);
    
    if (isNaN(priceNumber) || priceNumber <= 0) {
      throw new Error(`Invalid price data for currency: ${fiatCurrency}`);
    }
    
    if (isNaN(dotNumber) || dotNumber < 0) {
      throw new Error(`Invalid DOT amount: ${dotAmount}`);
    }

    return dotNumber * priceNumber;
  }

  public getLastUpdateTime(): Date {
    return this.lastUpdate;
  }

  public isPriceStale(currency: string, maxAgeMinutes: number = 5): boolean {
    const priceData = this.cache.get(currency.toLowerCase());
    
    if (!priceData) {
      return true;
    }

    const maxAge = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
    return priceData.lastUpdated < maxAge;
  }

  public getAllPrices(): Map<string, PriceData> {
    return new Map(this.cache);
  }
}

// Export singleton instance
export const priceService = new PriceService();

// Utility functions
export function formatDOTAmount(amount: string): string {
  const num = parseFloat(amount);
  if (isNaN(num)) {
    throw new Error('Invalid DOT amount');
  }
  
  // Format with up to 8 decimal places, removing trailing zeros
  return num.toFixed(8).replace(/\.?0+$/, '');
}

export function validateDOTAmount(amount: string): boolean {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0 && num <= 1000000; // Max 1M DOT
}

export function validateFiatAmount(amount: number, currency: string): boolean {
  if (amount <= 0 || amount > 99999999) { // Max $999,999.99
    return false;
  }
  
  // Currency-specific validation
  switch (currency.toLowerCase()) {
    case 'jpy':
      return Number.isInteger(amount); // JPY doesn't have decimal places
    case 'usd':
    case 'eur':
    case 'gbp':
      return amount * 100 === Math.floor(amount * 100); // Max 2 decimal places
    default:
      return false;
  }
}
