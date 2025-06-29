import React from 'react';
import GooglePayButton from '@google-pay/button-react';
import { useGooglePay } from '../hooks/useGooglePay';

interface GooglePayButtonProps {
  planId: string;
  amount: number;
  onSuccess: () => void;
  onError: (error: string) => void;
}

const GooglePayButtonComponent: React.FC<GooglePayButtonProps> = ({ 
  planId, 
  amount, 
  onSuccess, 
  onError 
}) => {
  const { processPayment, loading } = useGooglePay();
  const merchantId = import.meta.env.VITE_MERCHANT_ID || '';

  const handlePaymentSuccess = async (paymentData: any) => {
    try {
      const result = await processPayment(paymentData, planId, amount);
      if (result?.success) {
        onSuccess();
      } else {
        onError('Payment processing failed');
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Payment processing failed');
    }
  };

  if (!merchantId) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
        Google Pay merchant ID is not configured. Please add VITE_MERCHANT_ID to your environment variables.
      </div>
    );
  }

  return (
    <div className={loading ? 'opacity-50 pointer-events-none' : ''}>
      <GooglePayButton
        environment="TEST"
        paymentRequest={{
          apiVersion: 2,
          apiVersionMinor: 0,
          allowedPaymentMethods: [
            {
              type: 'CARD',
              parameters: {
                allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
                allowedCardNetworks: ['MASTERCARD', 'VISA'],
              },
              tokenizationSpecification: {
                type: 'PAYMENT_GATEWAY',
                parameters: {
                  gateway: 'example',
                  gatewayMerchantId: merchantId,
                },
              },
            },
          ],
          merchantInfo: {
            merchantId: merchantId,
            merchantName: 'Chatizia Pro',
          },
          transactionInfo: {
            totalPriceStatus: 'FINAL',
            totalPriceLabel: 'Total',
            totalPrice: amount.toFixed(2),
            currencyCode: 'USD',
            countryCode: 'US',
          },
          callbackIntents: ['PAYMENT_AUTHORIZATION'],
        }}
        onLoadPaymentData={handlePaymentSuccess}
        onError={(error) => onError(error.message || 'Google Pay error')}
        buttonType="subscribe"
        buttonColor="black"
        buttonSizeMode="fill"
      />
    </div>
  );
};

export default GooglePayButtonComponent;