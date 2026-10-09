
const processors = [
  {
    id: "A",
    name: "Processor A",
    successRate: 0.95,
    latencyMs: 200,
    isDown: false,
    totalAttempts: 0,
    approved: 0,
    declined: 0,
    technicalFailures: 0,
    totalResponseTime: 0,
    responseCount: 0,
    simulateTimeout: false
  },
  {
    id: "B",
    name: "Processor B",
    successRate: 0.88,
    latencyMs: 150,
    isDown: false,
    totalAttempts: 0,
    approved: 0,
    declined: 0,
    technicalFailures: 0,
    totalResponseTime: 0,
    responseCount: 0,
    simulateTimeout: false
  },
  {
    id: "C",
    name: "Processor C",
    successRate: 0.70,
    latencyMs: 500,
    isDown: false,
    totalAttempts: 0,
    approved: 0,
    declined: 0,
    technicalFailures: 0,
    totalResponseTime: 0,
    responseCount: 0,
    simulateTimeout: false
  },
];

const wait = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function processPayment(processor) {
  processor.totalAttempts++;

  
if (processor.isDown) {
  processor.technicalFailures++;
  throw new Error("PROCESSOR_DOWN");
}

// Forced timeout for testing failover
if (processor.simulateTimeout) {
  processor.simulateTimeout = false;
  processor.technicalFailures++;
  throw new Error("PROCESSOR_TIMEOUT");
}


  const startedAt = Date.now();

  await wait(processor.latencyMs);

  // Simulate a technical timeout (3%).
  if (Math.random() < 0.03) {
    processor.technicalFailures++;
    throw new Error("PROCESSOR_TIMEOUT");
  }

  const responseTime = Date.now() - startedAt;

  processor.totalResponseTime += responseTime;
  processor.responseCount++;

  if (Math.random() < processor.successRate) {
    processor.approved++;

    return {
      status: "approved",
      processorId: processor.id,
      responseTime,
    };
  }

  // An issuer decline is not a technical failure.
  processor.declined++;

  return {
    status: "declined",
    processorId: processor.id,
    responseTime,
  };
}

function getProcessorMetrics(processor) {
  const completed = processor.approved + processor.declined;

  const failureRate =
    processor.totalAttempts === 0
      ? 0
      : processor.technicalFailures / processor.totalAttempts;

  let status = "healthy";

  if (processor.isDown) {
    status = "down";
  } else if (
    processor.totalAttempts >= 5 &&
    failureRate >= 0.5
  ) {
    status = "degraded";
  }

  return {
    id: processor.id,
    name: processor.name,
    status,
    isDown: processor.isDown,
    totalAttempts: processor.totalAttempts,
    approvalRate:
      completed === 0
        ? 0
        : Number(
            ((processor.approved / completed) * 100).toFixed(2)
          ),
    averageResponseTime:
      processor.responseCount === 0
        ? 0
        : Math.round(
            processor.totalResponseTime /
              processor.responseCount
          ),
  };
}

module.exports = {
  processors,
  processPayment,
  getProcessorMetrics,
};
