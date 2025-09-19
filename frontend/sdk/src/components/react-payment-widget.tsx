// React component - only available if React is installed
let React: any;
let useEffect: any;
let useRef: any;
let useState: any;

try {
  React = require('react');
  useEffect = React.useEffect;
  useRef = React.useRef;
  useState = React.useState;
} catch (e) {
  // React not available
}

import { 
  PaymentWidgetConfig, 
  PaymentIntent, 
  PaymentEventHandler,
  WidgetState 
} from '../types';
import { PaymentWidget } from './payment-widget';
import { APIClient } from '../core/api-client';

interface ReactPaymentWidgetProps extends Omit<PaymentWidgetConfig, 'container'> {
  onSuccess?: PaymentEventHandler;
  onError?: (error: Error) => void;
  onCancel?: () => void;
  className?: string;
  style?: any;
}

export const ReactPaymentWidget: any = ({
  paymentIntent,
  onSuccess,
  onError,
  onCancel,
  theme,
  locale,
  className,
  style,
  ...config
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<PaymentWidget | null>(null);
  const [state, setState] = useState<WidgetState | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create API client (you'll need to pass the config)
    const apiClient = new APIClient({
      publicKey: 'pk_test_your_key_here', // This should come from props
      environment: 'test',
    });

    // Create widget
    const widget = new PaymentWidget({
      container: containerRef.current,
      paymentIntent,
      onSuccess,
      onError,
      onCancel,
      theme,
      locale,
      ...config,
    }, apiClient);

    widgetRef.current = widget;

    // Listen for state changes
    const updateState = () => {
      setState(widget.getState());
    };

    // Set up polling for state updates
    const interval = setInterval(updateState, 100);

    return () => {
      clearInterval(interval);
      widget.destroy();
    };
  }, [paymentIntent, onSuccess, onError, onCancel, theme, locale]);

  if (!React) {
    return null;
  }

  return React.createElement('div', {
    ref: containerRef,
    className: className,
    style: style
  });
};

// Hook for using PMT Gateway
export const usePMTGateway = (config: { publicKey: string; environment?: 'test' | 'live' }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createPaymentIntent = async (request: {
    amount: number;
    currency: string;
    crypto_currency?: 'dot' | 'dot-stablecoin';
    metadata?: Record<string, any>;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const apiClient = new APIClient({
        publicKey: config.publicKey,
        environment: config.environment || 'test',
      });

      const result = await apiClient.createPaymentIntent(request);
      return result;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createPaymentIntent,
    isLoading,
    error,
  };
};
