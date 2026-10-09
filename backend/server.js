
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const {
  processors,
  getProcessorMetrics,
} = require("./processors");

const { routePayment, transactions } = require("./router");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/processors", (req, res) => {
  res.json(processors.map(getProcessorMetrics));
});

app.get("/api/transactions", (req, res) => {
  res.json(transactions.slice(0, 100));
});

app.post("/api/payments", async (req, res) => {
  const { amount, currency, customerId, paymentMethod } =
    req.body;

  if (
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !["BRL", "MXN", "COP"].includes(currency) ||
    typeof customerId !== "string" ||
    !customerId.trim() ||
    !["credit_card", "debit_card", "local_wallet"].includes(
      paymentMethod
    )
  ) {
    return res.status(400).json({
      error: "Invalid payment request",
    });
  }

  try {
    const transaction = await routePayment(req.body);

    io.emit("transaction:update", transaction);
    io.emit(
      "processors:update",
      processors.map(getProcessorMetrics)
    );

    res.json(transaction);
  } catch (error) {
    res.status(500).json({
      error: "Payment routing failed",
    });
  }
});

app.patch("/api/processors/:id/status", (req, res) => {
  const processor = processors.find(
    (item) => item.id === req.params.id
  );

  if (!processor) {
    return res.status(404).json({
      error: "Processor not found",
    });
  }

  if (typeof req.body.isDown !== "boolean") {
    return res.status(400).json({
      error: "isDown must be a boolean",
    });
  }

  processor.isDown = req.body.isDown;

  const metrics = processors.map(getProcessorMetrics);

  io.emit("processors:update", metrics);

  res.json(getProcessorMetrics(processor));
});

app.patch("/api/processors/:id/simulate-timeout", (req, res) => {
  const processor = processors.find(
    (item) => item.id === req.params.id
  );

  if (!processor) {
    return res.status(404).json({
      error: "Processor not found",
    });
  }

  processor.simulateTimeout = true;

  res.json({
    message: `Next attempt on Processor ${processor.id} will timeout`,
    processorId: processor.id,
    simulateTimeout: true,
  });
});

io.on("connection", (socket) => {
  socket.emit(
    "processors:update",
    processors.map(getProcessorMetrics)
  );
  socket.emit("transactions:init", transactions.slice(0, 100));
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
