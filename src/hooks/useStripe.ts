import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export const useStripe = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const createCheckoutSession = async (priceId: string) => {
    if (!user) {
      setError('You must be logged in to upgrade');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // Call our serverless function to create a checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          userId: user.id,
          email: user.email,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create checkout session');
      }

      const { sessionId, url } = await response.json();
      
      // Redirect to Checkout
      window.location.href = url;
      
      return { sessionId, url };
    } catch (err) {
      console.error('Error creating checkout session:', err);
      setError(err instanceof Error ? err.message : 'Failed to create checkout session');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const createPortalSession = async () => {
    if (!user) {
      setError('You must be logged in to manage your subscription');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // Call our serverless function to create a customer portal session
      const response = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create portal session');
      }

      const { url } = await response.json();
      
      // Redirect to Customer Portal
      window.location.href = url;
      
      return { url };
    } catch (err) {
      console.error('Error creating portal session:', err);
      setError(err instanceof Error ? err.message : 'Failed to create portal session');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateSubscriptionStatus = async (status: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({ subscription_status: status })
        .eq('id', user.id);

      if (error) throw error;
    } catch (err) {
      console.error('Error updating subscription status:', err);
    }
  };

  return {
    createCheckoutSession,
    createPortalSession,
    updateSubscriptionStatus,
    loading,
    error,
  };
};