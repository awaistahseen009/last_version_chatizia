import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js';
import Stripe from 'npm:stripe';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') || '';
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
});

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
    // Get the signature from the headers
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return new Response('Webhook signature missing', { status: 400 });
    }

    // Get the raw body
    const body = await req.text();

    // Verify the webhook signature
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return new Response(`Webhook signature verification failed: ${err.message}`, { status: 400 });
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        
        // Extract the customer ID and metadata
        const customerId = session.customer;
        const userId = session.metadata?.userId;
        const priceId = session.metadata?.priceId;
        
        if (!userId) {
          console.error('No user ID in session metadata');
          return new Response('No user ID in session metadata', { status: 400 });
        }

        // Determine subscription level based on price ID
        let subscriptionStatus = 'free';
        if (priceId) {
          if (priceId.includes('pro')) {
            subscriptionStatus = 'pro';
          } else if (priceId.includes('enterprise')) {
            subscriptionStatus = 'enterprise';
          }
        }

        // Update user subscription status
        const { error: updateError } = await supabase
          .from('users')
          .update({ 
            subscription_status: subscriptionStatus,
            // Store Stripe customer ID for future reference
            stripe_customer_id: customerId
          })
          .eq('id', userId);

        if (updateError) {
          console.error('Error updating user subscription:', updateError);
          return new Response(`Error updating user subscription: ${updateError.message}`, { status: 500 });
        }

        break;
      }
      
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        
        // Get the price ID from the subscription
        const priceId = subscription.items.data[0]?.price.id;
        
        // Determine subscription level based on price ID
        let subscriptionStatus = 'free';
        if (priceId) {
          if (priceId.includes('pro')) {
            subscriptionStatus = 'pro';
          } else if (priceId.includes('enterprise')) {
            subscriptionStatus = 'enterprise';
          }
        }

        // Get user by Stripe customer ID
        const { data: users, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('stripe_customer_id', customerId);

        if (userError || !users || users.length === 0) {
          console.error('Error finding user by customer ID:', userError || 'No user found');
          return new Response('Error finding user', { status: 500 });
        }

        const userId = users[0].id;

        // Update user subscription status
        const { error: updateError } = await supabase
          .from('users')
          .update({ subscription_status: subscriptionStatus })
          .eq('id', userId);

        if (updateError) {
          console.error('Error updating user subscription:', updateError);
          return new Response(`Error updating user subscription: ${updateError.message}`, { status: 500 });
        }

        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        
        // Get user by Stripe customer ID
        const { data: users, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('stripe_customer_id', customerId);

        if (userError || !users || users.length === 0) {
          console.error('Error finding user by customer ID:', userError || 'No user found');
          return new Response('Error finding user', { status: 500 });
        }

        const userId = users[0].id;

        // Update user subscription status to free
        const { error: updateError } = await supabase
          .from('users')
          .update({ subscription_status: 'free' })
          .eq('id', userId);

        if (updateError) {
          console.error('Error updating user subscription:', updateError);
          return new Response(`Error updating user subscription: ${updateError.message}`, { status: 500 });
        }

        break;
      }
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    console.error(`Error processing webhook: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, {
      status: 400,
      headers: corsHeaders,
    });
  }
});