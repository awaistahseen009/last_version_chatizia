import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useNotificationContext } from '../contexts/NotificationContext';

export interface GooglePaymentData {
  apiVersion: number;
  apiVersionMinor: number;
  paymentMethodData: {
    description: string;
    info: {
      billingAddress: {
        address1: string;
        address2: string;
        address3: string;
        administrativeArea: string;
        countryCode: string;
        locality: string;
        postalCode: string;
        sortingCode: string;
      };
      cardDetails: string;
      cardNetwork: string;
    };
    tokenizationData: {
      token: string;
      type: string;
    };
    type: string;
  };
}

export const useGooglePay = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { addNotification } = useNotificationContext();

  const processPayment = async (paymentData: GooglePaymentData, planId: string, amount: number) => {
    if (!user) {
      setError('You must be logged in to upgrade');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // In a real implementation, you would call a serverless function to process the payment
      // For this demo, we'll simulate a successful payment
      console.log('Processing payment:', { paymentData, planId, amount });
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate a transaction ID
      const transactionId = `gp_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      
      // Calculate subscription end date (30 days from now)
      const subscriptionEndDate = new Date();
      subscriptionEndDate.setDate(subscriptionEndDate.getDate() + 30);
      
      // Update user subscription status
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          subscription_status: planId,
          subscription_end_date: subscriptionEndDate.toISOString()
        })
        .eq('id', user.id);

      if (updateError) throw updateError;
      
      // Record the transaction
      const { error: transactionError } = await supabase
        .from('payment_transactions')
        .insert([
          {
            user_id: user.id,
            transaction_id: transactionId,
            amount: amount,
            currency: 'USD',
            payment_method: 'google_pay',
            status: 'completed',
            plan_id: planId,
            metadata: {
              paymentMethod: 'google_pay',
              cardNetwork: paymentData.paymentMethodData?.info?.cardNetwork || 'Unknown',
              cardDetails: paymentData.paymentMethodData?.info?.cardDetails || 'Unknown',
              billingPlan: planId,
              billingCycle: 'monthly',
              subscriptionEndDate: subscriptionEndDate.toISOString()
            }
          }
        ]);

      if (transactionError) throw transactionError;
      
      // Add notification
      addNotification({
        title: 'Payment Successful',
        message: `Your payment for the ${planId.charAt(0).toUpperCase() + planId.slice(1)} Plan was successful.`,
        type: 'payment'
      });
      
      return { success: true, transactionId };
    } catch (err) {
      console.error('Error processing payment:', err);
      setError(err instanceof Error ? err.message : 'Failed to process payment');
      
      // Add notification for failed payment
      addNotification({
        title: 'Payment Failed',
        message: 'There was an issue processing your payment. Please try again.',
        type: 'payment'
      });
      
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const updateSubscriptionStatus = async (status: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          subscription_status: status,
          subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
        })
        .eq('id', user.id);

      if (error) throw error;
      
      // Add notification
      addNotification({
        title: 'Subscription Updated',
        message: `Your subscription has been updated to ${status.charAt(0).toUpperCase() + status.slice(1)} Plan.`,
        type: 'payment'
      });
    } catch (err) {
      console.error('Error updating subscription status:', err);
      
      // Add notification for failed update
      addNotification({
        title: 'Subscription Update Failed',
        message: 'There was an issue updating your subscription. Please try again.',
        type: 'payment'
      });
    }
  };

  return {
    processPayment,
    updateSubscriptionStatus,
    loading,
    error,
  };
};