// Utility functions for the PMT Gateway SDK

export const formatCurrency = (amount: number, currency: string): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
};

export const formatDOTAmount = (amount: string | number): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return num.toFixed(4);
};

export const truncateAddress = (address: string, startLength = 6, endLength = 4): string => {
  if (address.length <= startLength + endLength) {
    return address;
  }
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
};

export const isValidPolkadotAddress = (address: string): boolean => {
  // Basic validation for Polkadot address format
  return /^[1-9A-HJ-NP-Za-km-z]{47,48}$/.test(address);
};

export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

export const isWalletAvailable = (walletId: string): boolean => {
  if (typeof window === 'undefined') return false;
  
  switch (walletId) {
    case 'polkadot-js':
      return !!(window as any).injectedWeb3?.['polkadot-js'];
    case 'talisman':
      return !!(window as any).injectedWeb3?.['talisman'];
    case 'subwallet':
      return !!(window as any).injectedWeb3?.['subwallet'];
    case 'nova-wallet':
      return !!(window as any).injectedWeb3?.['nova-wallet'];
    default:
      return false;
  }
};

export const getWalletIcon = (walletId: string): string => {
  const icons: Record<string, string> = {
    'polkadot-js': '🔗',
    'talisman': '⚡',
    'subwallet': '🔷',
    'nova-wallet': '📱',
  };
  return icons[walletId] || '💳';
};

export const getWalletName = (walletId: string): string => {
  const names: Record<string, string> = {
    'polkadot-js': 'Polkadot.js',
    'talisman': 'Talisman',
    'subwallet': 'SubWallet',
    'nova-wallet': 'Nova Wallet',
  };
  return names[walletId] || 'Unknown Wallet';
};

export const createPaymentWidgetElement = (config: {
  container: string | HTMLElement;
  paymentIntent: string | any;
  onSuccess?: (event: any) => void;
  onError?: (error: Error) => void;
  onCancel?: () => void;
  theme?: any;
}): HTMLElement => {
  const container = typeof config.container === 'string' 
    ? document.querySelector(config.container) as HTMLElement
    : config.container;

  if (!container) {
    throw new Error('Container element not found');
  }

  // Create a simple payment widget element
  const widget = document.createElement('div');
  widget.className = 'pmt-payment-widget';
  widget.innerHTML = `
    <div style="
      padding: 20px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      background: white;
      text-align: center;
    ">
      <h3>Payment Widget</h3>
      <p>This is a placeholder for the payment widget.</p>
      <p>Payment Intent: ${config.paymentIntent}</p>
    </div>
  `;

  container.appendChild(widget);
  return widget;
};
