import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface SubscriptionData {
  subscribed: boolean;
  productId: string | null;
  subscriptionEnd: string | null;
}

interface UseSubscriptionReturn {
  subscription: SubscriptionData | null;
  isPremium: boolean;
  isLoading: boolean;
  error: Error | null;
  checkSubscription: () => Promise<void>;
  createCheckout: () => Promise<void>;
  openCustomerPortal: () => Promise<void>;
}

export function useSubscription(): UseSubscriptionReturn {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const checkSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fnError } = await supabase.functions.invoke('check-subscription');

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setSubscription({
        subscribed: data.subscribed,
        productId: data.product_id,
        subscriptionEnd: data.subscription_end,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to check subscription');
      setError(error);
      console.error('Subscription check error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const createCheckout = useCallback(async () => {
    if (!user) {
      toast.error('Você precisa estar logado para assinar');
      return;
    }

    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-checkout');

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create checkout');
      toast.error('Erro ao criar sessão de pagamento');
      console.error('Checkout error:', error);
    }
  }, [user]);

  const openCustomerPortal = useCallback(async () => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return;
    }

    try {
      const { data, error: fnError } = await supabase.functions.invoke('customer-portal');

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to open portal');
      toast.error('Erro ao abrir portal de assinatura');
      console.error('Portal error:', error);
    }
  }, [user]);

  // Initial check on mount
  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Polling every 60 seconds
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      checkSubscription();
    }, 60000);

    return () => clearInterval(interval);
  }, [user, checkSubscription]);

  return {
    subscription,
    isPremium: subscription?.subscribed ?? false,
    isLoading,
    error,
    checkSubscription,
    createCheckout,
    openCustomerPortal,
  };
}
