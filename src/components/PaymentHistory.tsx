import React, { useState } from 'react';
import { Download, CheckCircle, AlertCircle, RefreshCw, Clock, RotateCcw, MoreVertical, FileText, Printer } from 'lucide-react';
import { usePaymentHistory, PaymentTransaction } from '../hooks/usePaymentHistory';

const PaymentHistory: React.FC = () => {
  const { transactions, loading, error, refetch } = usePaymentHistory();
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'refunded':
        return <RotateCcw className="w-4 h-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const getPaymentMethodName = (method: string) => {
    switch (method) {
      case 'google_pay':
        return 'Google Pay';
      case 'credit_card':
        return 'Credit Card';
      case 'paypal':
        return 'PayPal';
      default:
        return method;
    }
  };

  const getPlanName = (planId: string) => {
    switch (planId) {
      case 'free':
        return 'Free Plan';
      case 'pro':
        return 'Pro Plan';
      case 'enterprise':
        return 'Enterprise Plan';
      default:
        return planId;
    }
  };

  const toggleDropdown = (id: string) => {
    setActiveDropdown(activeDropdown === id ? null : id);
  };

  const handleDownloadInvoice = (transaction: PaymentTransaction) => {
    // Generate invoice data
    const invoiceData = {
      invoiceNumber: `INV-${transaction.transaction_id.substring(0, 8)}`,
      date: formatDate(transaction.created_at),
      customer: {
        name: 'Customer',
        email: 'customer@example.com',
      },
      items: [
        {
          description: `${getPlanName(transaction.plan_id)} Subscription`,
          amount: transaction.amount,
        }
      ],
      total: transaction.amount,
      currency: transaction.currency,
      paymentMethod: getPaymentMethodName(transaction.payment_method),
      status: transaction.status
    };

    // Create a simple invoice HTML
    const invoiceHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice #${invoiceData.invoiceNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
          .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, .15); }
          .invoice-box table { width: 100%; line-height: inherit; text-align: left; }
          .invoice-box table td { padding: 5px; vertical-align: top; }
          .invoice-box table tr td:nth-child(2) { text-align: right; }
          .invoice-box table tr.top table td { padding-bottom: 20px; }
          .invoice-box table tr.top table td.title { font-size: 45px; line-height: 45px; color: #333; }
          .invoice-box table tr.information table td { padding-bottom: 40px; }
          .invoice-box table tr.heading td { background: #eee; border-bottom: 1px solid #ddd; font-weight: bold; }
          .invoice-box table tr.details td { padding-bottom: 20px; }
          .invoice-box table tr.item td { border-bottom: 1px solid #eee; }
          .invoice-box table tr.item.last td { border-bottom: none; }
          .invoice-box table tr.total td:nth-child(2) { border-top: 2px solid #eee; font-weight: bold; }
          .status { padding: 5px 10px; border-radius: 20px; font-size: 12px; display: inline-block; }
          .status.completed { background: #d1fae5; color: #047857; }
          .status.pending { background: #fef3c7; color: #92400e; }
          .status.failed { background: #fee2e2; color: #b91c1c; }
          .status.refunded { background: #dbeafe; color: #1e40af; }
          @media only print { body { -webkit-print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <table cellpadding="0" cellspacing="0">
            <tr class="top">
              <td colspan="2">
                <table>
                  <tr>
                    <td class="title">
                      Chatizia Pro
                    </td>
                    <td>
                      Invoice #: ${invoiceData.invoiceNumber}<br>
                      Created: ${invoiceData.date}<br>
                      Status: <span class="status ${transaction.status}">${transaction.status}</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
            <tr class="information">
              <td colspan="2">
                <table>
                  <tr>
                    <td>
                      Chatizia Pro, Inc.<br>
                      123 AI Street<br>
                      San Francisco, CA 94103
                    </td>
                    <td>
                      ${invoiceData.customer.name}<br>
                      ${invoiceData.customer.email}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
            <tr class="heading">
              <td>Payment Method</td>
              <td></td>
            </tr>
            
            <tr class="details">
              <td>${invoiceData.paymentMethod}</td>
              <td></td>
            </tr>
            
            <tr class="heading">
              <td>Item</td>
              <td>Price</td>
            </tr>
            
            ${invoiceData.items.map((item, index) => `
              <tr class="item ${index === invoiceData.items.length - 1 ? 'last' : ''}">
                <td>${item.description}</td>
                <td>${invoiceData.currency} ${item.amount.toFixed(2)}</td>
              </tr>
            `).join('')}
            
            <tr class="total">
              <td></td>
              <td>Total: ${invoiceData.currency} ${invoiceData.total.toFixed(2)}</td>
            </tr>
          </table>
          
          <div style="margin-top: 40px; text-align: center; color: #888; font-size: 12px;">
            <p>Thank you for your business!</p>
            <p>This is a computer-generated invoice and does not require a signature.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Create a blob and download
    const blob = new Blob([invoiceHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${invoiceData.invoiceNumber}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setActiveDropdown(null);
  };

  const handlePrintInvoice = (transaction: PaymentTransaction) => {
    // Similar to download but opens in a new window for printing
    const invoiceNumber = `INV-${transaction.transaction_id.substring(0, 8)}`;
    const date = formatDate(transaction.created_at);
    const planName = getPlanName(transaction.plan_id);
    const paymentMethod = getPaymentMethodName(transaction.payment_method);
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Invoice #${invoiceNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
            .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, .15); }
            .invoice-box table { width: 100%; line-height: inherit; text-align: left; }
            .invoice-box table td { padding: 5px; vertical-align: top; }
            .invoice-box table tr td:nth-child(2) { text-align: right; }
            .invoice-box table tr.top table td { padding-bottom: 20px; }
            .invoice-box table tr.top table td.title { font-size: 45px; line-height: 45px; color: #333; }
            .invoice-box table tr.information table td { padding-bottom: 40px; }
            .invoice-box table tr.heading td { background: #eee; border-bottom: 1px solid #ddd; font-weight: bold; }
            .invoice-box table tr.details td { padding-bottom: 20px; }
            .invoice-box table tr.item td { border-bottom: 1px solid #eee; }
            .invoice-box table tr.item.last td { border-bottom: none; }
            .invoice-box table tr.total td:nth-child(2) { border-top: 2px solid #eee; font-weight: bold; }
            .status { padding: 5px 10px; border-radius: 20px; font-size: 12px; display: inline-block; }
            .status.completed { background: #d1fae5; color: #047857; }
            .status.pending { background: #fef3c7; color: #92400e; }
            .status.failed { background: #fee2e2; color: #b91c1c; }
            .status.refunded { background: #dbeafe; color: #1e40af; }
            @media print { body { -webkit-print-color-adjust: exact; } .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="invoice-box">
            <table cellpadding="0" cellspacing="0">
              <tr class="top">
                <td colspan="2">
                  <table>
                    <tr>
                      <td class="title">
                        Chatizia Pro
                      </td>
                      <td>
                        Invoice #: ${invoiceNumber}<br>
                        Created: ${date}<br>
                        Status: <span class="status ${transaction.status}">${transaction.status}</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <tr class="information">
                <td colspan="2">
                  <table>
                    <tr>
                      <td>
                        Chatizia Pro, Inc.<br>
                        123 AI Street<br>
                        San Francisco, CA 94103
                      </td>
                      <td>
                        Customer<br>
                        customer@example.com
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <tr class="heading">
                <td>Payment Method</td>
                <td></td>
              </tr>
              
              <tr class="details">
                <td>${paymentMethod}</td>
                <td></td>
              </tr>
              
              <tr class="heading">
                <td>Item</td>
                <td>Price</td>
              </tr>
              
              <tr class="item last">
                <td>${planName} Subscription</td>
                <td>${transaction.currency} ${transaction.amount.toFixed(2)}</td>
              </tr>
              
              <tr class="total">
                <td></td>
                <td>Total: ${transaction.currency} ${transaction.amount.toFixed(2)}</td>
              </tr>
            </table>
            
            <div style="margin-top: 40px; text-align: center; color: #888; font-size: 12px;">
              <p>Thank you for your business!</p>
              <p>This is a computer-generated invoice and does not require a signature.</p>
            </div>
            
            <div class="no-print" style="margin-top: 30px; text-align: center;">
              <button onclick="window.print()" style="padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 5px; cursor: pointer;">
                Print Invoice
              </button>
            </div>
          </div>
          <script>
            // Auto-print
            setTimeout(() => window.print(), 500);
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
    
    setActiveDropdown(null);
  };

  const handleDownloadAllInvoices = () => {
    // Create a zip file with all invoices
    // For simplicity, we'll just download them one by one
    transactions.forEach((transaction) => {
      setTimeout(() => {
        handleDownloadInvoice(transaction);
      }, 300); // Small delay between downloads
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <div>
            <p className="font-medium text-red-800">Error loading payment history</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 border border-slate-200 rounded-lg">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Download className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-medium text-slate-800 mb-2">No payment history</h3>
        <p className="text-slate-500">You haven't made any payments yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">Payment History</h2>
        <div className="flex items-center space-x-3">
          <button
            id="download-all-invoices-btn"
            onClick={handleDownloadAllInvoices}
            className="flex items-center space-x-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download All Invoices</span>
          </button>
          <button
            onClick={() => refetch()}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Invoice
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Payment Method
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Plan
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {transactions.map((transaction) => (
              <tr key={transaction.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                  INV-{transaction.transaction_id.substring(0, 8)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                  {formatDate(transaction.created_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">
                  {transaction.currency} {transaction.amount.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                  {getPaymentMethodName(transaction.payment_method)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                  {getPlanName(transaction.plan_id)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-1">
                    {getStatusIcon(transaction.status)}
                    <span className={`text-xs font-medium capitalize ${
                      transaction.status === 'completed' ? 'text-green-600' :
                      transaction.status === 'pending' ? 'text-yellow-600' :
                      transaction.status === 'failed' ? 'text-red-600' :
                      'text-blue-600'
                    }`}>
                      {transaction.status}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm relative">
                  <button 
                    onClick={() => toggleDropdown(transaction.id)}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  
                  {activeDropdown === transaction.id && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-slate-200">
                      <div className="py-1">
                        <button
                          onClick={() => handleDownloadInvoice(transaction)}
                          className="flex items-center space-x-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 w-full text-left"
                        >
                          <FileText className="w-4 h-4" />
                          <span>Download Invoice</span>
                        </button>
                        <button
                          onClick={() => handlePrintInvoice(transaction)}
                          className="flex items-center space-x-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 w-full text-left"
                        >
                          <Printer className="w-4 h-4" />
                          <span>Print Invoice</span>
                        </button>
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PaymentHistory;