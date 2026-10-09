
const { randomUUID } = require("crypto");
const { processors, processPayment } = require("./processors");

const transactions = [];
const MAX_ATTEMPTS = 3;

async function routePayment(payment) {
  const transaction = {
    transactionId: payment.transactionId || randomUUID(),
    amount: payment.amount,
    currency: payment.currency,
    customerId: payment.customerId,
    paymentMethod: payment.paymentMethod,
    status: "processing",
    attempts: [],
    failoverOccurred: false,
    createdAt: new Date().toISOString(),
  };

  transactions.unshift(transaction);

  // A, B, C are tried in priority order.
  const candidates = processors
    .filter((processor) => !processor.isDown)
    .slice(0, MAX_ATTEMPTS);

  if (candidates.length === 0) {
    transaction.status = "failed";
    transaction.reason = "NO_AVAILABLE_PROCESSOR";
    return transaction;
  }

  for (const processor of candidates) {
    const attempt = {
      processorId: processor.id,
      startedAt: new Date().toISOString(),
    };

    try {
      const result = await processPayment(processor);

      attempt.status = result.status;
      attempt.responseTime = result.responseTime;
      transaction.attempts.push(attempt);

      transaction.finalProcessor = processor.id;

      if (result.status === "approved") {
        transaction.status = "approved";
      } else {
        transaction.status = "declined";
      }

      // Stop after any definitive response.
      break;
    } catch (error) {
      attempt.status = "error";
      attempt.reason = error.message;
      transaction.attempts.push(attempt);

      transaction.failoverOccurred = true;
      transaction.reason = error.message;

      // Technical error: continue to the next processor.
    }
  }

  if (transaction.status === "processing") {
    transaction.status = "failed";
  }

  transaction.completedAt = new Date().toISOString();

  return transaction;
}

module.exports = {
  routePayment,
  transactions,
};
