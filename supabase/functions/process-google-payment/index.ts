import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse the request body
    const { paymentData, userId, email, planId, amount } = await req.json();

    if (!paymentData || !userId || !email || !planId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, subscription_status')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // In a real implementation, you would:
    // 1. Validate the payment with Google Pay API
    // 2. Process the payment with your payment processor
    // 3. Store transaction details in your database

    // For this demo, we'll simulate a successful payment
    const transactionId = `gp_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    
    // Calculate subscription end date (30 days for monthly, 365 days for yearly)
    const isYearly = amount > 50; // Simple heuristic to determine if yearly plan
    const daysToAdd = isYearly ? 365 : 30;
    const subscriptionEndDate = new Date();
    subscriptionEndDate.setDate(subscriptionEndDate.getDate() + daysToAdd);
    
    // Update the user's subscription status
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        subscription_status: planId,
        subscription_end_date: subscriptionEndDate.toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Failed to update subscription status', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare metadata for the transaction
    const metadata = {
      paymentMethod: 'google_pay',
      cardNetwork: paymentData.paymentMethodData?.info?.cardNetwork || 'Unknown',
      cardDetails: paymentData.paymentMethodData?.info?.cardDetails || 'Unknown',
      billingPlan: planId,
      billingCycle: isYearly ? 'yearly' : 'monthly',
      subscriptionEndDate: subscriptionEndDate.toISOString()
    };

    // Record the transaction
    const { error: transactionError } = await supabase
      .from('payment_transactions')
      .insert([
        {
          user_id: userId,
          transaction_id: transactionId,
          amount: amount,
          currency: 'USD',
          payment_method: 'google_pay',
          status: 'completed',
          plan_id: planId,
          metadata: metadata
        }
      ]);

    if (transactionError) {
      console.error('Error recording transaction:', transactionError);
      // Continue anyway since the subscription was updated
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        transactionId,
        subscriptionEndDate: subscriptionEndDate.toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error(`Error processing Google Pay payment: ${err.message}`);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});