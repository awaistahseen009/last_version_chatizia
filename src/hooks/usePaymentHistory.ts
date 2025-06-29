import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export interface PaymentTransaction {
  id: string;
  transaction_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  plan_id: string;
  created_at: string;
  metadata?: {
    paymentMethod?: string;
    cardNetwork?: string;
    cardDetails?: string;
    billingPlan?: string;
    billingCycle?: string;
    subscriptionEndDate?: string;
    [key: string]: any;
  };
}

export const usePaymentHistory = () => {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchTransactions = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (err) {
      console.error('Error fetching payment history:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch payment history');
    } finally {
      setLoading(false);
    }
  };

  // Generate a PDF invoice for a transaction
  const generateInvoice = async (transaction: PaymentTransaction) => {
    try {
      // In a real implementation, you would generate a PDF here
      // For this demo, we'll just return the transaction ID
      return transaction.transaction_id;
    } catch (err) {
      console.error('Error generating invoice:', err);
      throw new Error('Failed to generate invoice');
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [user?.id]);

  return {
    transactions,
    loading,
    error,
    refetch: fetchTransactions,
    generateInvoice
  };
};