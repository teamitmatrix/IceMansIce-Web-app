const dal = require("../dal/MongoDAL");
const logger = require("../utils/logger");
const config = require("../config");

/**
 * Process a payment
 */
async function processPayment(paymentData) {
  try {
    const { customerId, invoiceId, amount, method, reference, receivedAt } =
      paymentData;

    // Validate required fields
    if (!customerId || !amount || !method) {
      throw new Error("Customer ID, amount, and method are required");
    }

    // Validate amount
    if (amount <= 0) {
      throw new Error("Payment amount must be greater than zero");
    }

    // Validate customer exists
    const customer = await dal.getCustomerById(customerId);
    if (!customer) {
      throw new Error("Customer not found");
    }

    // Validate invoice if provided
    if (invoiceId) {
      const invoice = await dal.getInvoiceById(invoiceId);
      if (!invoice) {
        throw new Error("Invoice not found");
      }

      // Check if invoice is already paid
      if (invoice.status === "paid") {
        throw new Error("Invoice is already paid");
      }
    }

    // Process payment based on method
    let paymentResult;
    switch (method.toLowerCase()) {
      case "cash":
        paymentResult = await processCashPayment(paymentData);
        break;
      case "card":
        paymentResult = await processCardPayment(paymentData);
        break;
      case "ach":
        paymentResult = await processACHPayment(paymentData);
        break;
      case "charge_account":
        paymentResult = await processChargeAccountPayment(paymentData);
        break;
      default:
        throw new Error(`Unsupported payment method: ${method}`);
    }

    // Create payment record
    const payment = await dal.createPayment({
      customerId,
      invoiceId,
      amount,
      method,
      reference: reference || paymentResult.reference,
      receivedAt: receivedAt || new Date(),
      status: paymentResult.status,
      transactionId: paymentResult.transactionId,
      metadata: paymentResult.metadata,
    });

    // Update customer balance
    await updateCustomerBalance(customerId, amount);

    // Update invoice status if applicable
    if (invoiceId) {
      await updateInvoiceStatus(invoiceId, amount);
    }

    logger.info(
      `Payment processed successfully: ${payment._id} for customer ${customerId}`
    );

    return payment;
  } catch (error) {
    logger.error("Error processing payment:", error);
    throw error;
  }
}

/**
 * Process cash payment
 */
async function processCashPayment(paymentData) {
  // Cash payments are always successful
  return {
    status: "completed",
    reference: `CASH-${Date.now()}`,
    transactionId: `CASH-${Date.now()}`,
    metadata: {
      method: "cash",
      processedAt: new Date(),
    },
  };
}

/**
 * Process card payment
 */
async function processCardPayment(paymentData) {
  try {
    // This would integrate with a real payment processor
    // For now, simulate a successful payment
    const { amount, reference } = paymentData;

    // Simulate payment processing delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Simulate random failures (5% failure rate for demo)
    if (Math.random() < 0.05) {
      throw new Error("Card payment declined");
    }

    return {
      status: "completed",
      reference: reference || `CARD-${Date.now()}`,
      transactionId: `TXN-${Date.now()}`,
      metadata: {
        method: "card",
        processor: config.payment.provider,
        processedAt: new Date(),
        amount: amount,
      },
    };
  } catch (error) {
    logger.error("Card payment processing error:", error);
    throw error;
  }
}

/**
 * Process ACH payment
 */
async function processACHPayment(paymentData) {
  try {
    const { amount, reference } = paymentData;

    // Simulate ACH processing delay
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Simulate random failures (3% failure rate for demo)
    if (Math.random() < 0.03) {
      throw new Error("ACH payment failed");
    }

    return {
      status: "pending", // ACH payments are typically pending initially
      reference: reference || `ACH-${Date.now()}`,
      transactionId: `ACH-${Date.now()}`,
      metadata: {
        method: "ach",
        processedAt: new Date(),
        amount: amount,
        estimatedSettlement: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
      },
    };
  } catch (error) {
    logger.error("ACH payment processing error:", error);
    throw error;
  }
}

/**
 * Process charge account payment
 */
async function processChargeAccountPayment(paymentData) {
  try {
    const { customerId, amount, reference } = paymentData;

    // Get customer's current balance
    const customer = await dal.getCustomerById(customerId);
    if (!customer) {
      throw new Error("Customer not found");
    }

    // Check if customer has sufficient credit
    if (customer.balance < amount) {
      throw new Error("Insufficient credit available");
    }

    return {
      status: "completed",
      reference: reference || `CHARGE-${Date.now()}`,
      transactionId: `CHARGE-${Date.now()}`,
      metadata: {
        method: "charge_account",
        processedAt: new Date(),
        previousBalance: customer.balance,
        newBalance: customer.balance - amount,
      },
    };
  } catch (error) {
    logger.error("Charge account payment processing error:", error);
    throw error;
  }
}

/**
 * Update customer balance
 */
async function updateCustomerBalance(customerId, amount) {
  try {
    const customer = await dal.getCustomerById(customerId);
    if (!customer) {
      throw new Error("Customer not found");
    }

    const newBalance = Math.max(0, customer.balance - amount);

    await dal.updateCustomer(customerId, {
      balance: newBalance,
      lastPaymentDate: new Date(),
      lastPaymentAmount: amount,
    });

    logger.info(
      `Customer ${customerId} balance updated: ${customer.balance} -> ${newBalance}`
    );
  } catch (error) {
    logger.error("Error updating customer balance:", error);
    throw error;
  }
}

/**
 * Update invoice status
 */
async function updateInvoiceStatus(invoiceId, paymentAmount) {
  try {
    const invoice = await dal.getInvoiceById(invoiceId);
    if (!invoice) {
      throw new Error("Invoice not found");
    }

    const remainingAmount = invoice.total - invoice.paidAmount - paymentAmount;
    let newStatus = invoice.status;

    if (remainingAmount <= 0) {
      newStatus = "paid";
    } else if (invoice.paidAmount === 0 && paymentAmount > 0) {
      newStatus = "partially_paid";
    }

    await dal.updateInvoice(invoiceId, {
      paidAmount: invoice.paidAmount + paymentAmount,
      status: newStatus,
      lastPaymentDate: new Date(),
    });

    logger.info(
      `Invoice ${invoiceId} status updated: ${invoice.status} -> ${newStatus}`
    );
  } catch (error) {
    logger.error("Error updating invoice status:", error);
    throw error;
  }
}

/**
 * Get payment methods
 */
function getPaymentMethods() {
  return [
    {
      id: "cash",
      name: "Cash",
      description: "Cash payment",
      requiresProcessing: false,
      settlementTime: "immediate",
    },
    {
      id: "card",
      name: "Credit/Debit Card",
      description: "Card payment via payment processor",
      requiresProcessing: true,
      settlementTime: "1-3 business days",
    },
    {
      id: "ach",
      name: "ACH Transfer",
      description: "Automated Clearing House transfer",
      requiresProcessing: true,
      settlementTime: "2-3 business days",
    },
    {
      id: "charge_account",
      name: "Charge Account",
      description: "Charge to customer account",
      requiresProcessing: false,
      settlementTime: "immediate",
    },
  ];
}

/**
 * Validate payment method
 */
function validatePaymentMethod(method) {
  const validMethods = getPaymentMethods().map((m) => m.id);
  return validMethods.includes(method.toLowerCase());
}

/**
 * Get payment status
 */
function getPaymentStatuses() {
  return [
    {
      id: "pending",
      name: "Pending",
      description: "Payment is being processed",
    },
    {
      id: "completed",
      name: "Completed",
      description: "Payment has been successfully processed",
    },
    {
      id: "failed",
      name: "Failed",
      description: "Payment processing failed",
    },
    {
      id: "cancelled",
      name: "Cancelled",
      description: "Payment was cancelled",
    },
    {
      id: "refunded",
      name: "Refunded",
      description: "Payment has been refunded",
    },
  ];
}

module.exports = {
  processPayment,
  processCashPayment,
  processCardPayment,
  processACHPayment,
  processChargeAccountPayment,
  updateCustomerBalance,
  updateInvoiceStatus,
  getPaymentMethods,
  validatePaymentMethod,
  getPaymentStatuses,
};
