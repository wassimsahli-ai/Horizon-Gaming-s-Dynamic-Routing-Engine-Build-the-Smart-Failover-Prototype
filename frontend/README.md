# Horizon Gaming — Smart Payment Routing Engine

A smart payment routing engine built with Node.js, Express, React, and Socket.IO. The system simulates multiple payment processors, routes payment requests, handles technical failures, and provides a real-time monitoring dashboard.

## Overview

This project demonstrates how a payment routing system can select payment processors, handle processor availability, and automatically fail over when a technical error occurs.

**This is a simulation for demonstration and testing purposes. No real payments are processed.**

## Features

- **Smart Payment Routing:** Routes payment requests to available simulated processors.
- **Automatic Failover:** Attempts another processor when a technical failure occurs.
- **Processor Management:** Mark processors as healthy or unavailable.
- **Timeout Simulation:** Simulate technical timeouts to test failover behavior.
- **Payment Simulation:** Demonstrate approved and declined payment scenarios.
- **Real-Time Dashboard:** Monitor processor status, payment transactions, and performance metrics.
- **Live Updates:** Uses Socket.IO to push updates to the dashboard.
- **Performance Metrics:** Displays processor attempts, approval rates, and average response times.

## Tech Stack

### Backend

- Node.js
- Express
- Socket.IO

### Frontend

- React
- Vite
- CSS

## Architecture

The application consists of two main components:

- **Backend:** Exposes REST API endpoints, simulates payment processors, manages routing and failover, and broadcasts updates.
- **Frontend:** Provides a dashboard for submitting payments, managing processors, and monitoring transactions in real time.

## Project Structure

```text
horizon-routing-engine/
├── backend/
│   ├── processors.js
│   ├── router.js
│   └── server.js
├── frontend/
│   └── src/
│       ├── App.jsx
│       ├── App.css
│       └── index.css
├── .gitignore
└── README.md
```

_Note: The structure above highlights the main files; additional configuration and dependency files may exist in the repository._

## Getting Started

### Prerequisites

- Node.js and npm
- Git

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/horizon-routing-engine.git
cd horizon-routing-engine
```

Replace `YOUR_USERNAME` with your GitHub username.

### 2. Install dependencies

Install the backend and frontend dependencies in their respective directories:

```bash
cd backend
npm install
```

```bash
cd ../frontend
npm install
```

### 3. Start the backend

From the backend directory, run the command configured in your project. If the entry point is `server.js`, use:

```bash
node server.js
```

The backend is expected to run at:

```text
http://localhost:3001
```

### 4. Start the frontend

Open a second terminal:

```bash
cd H:\Desktop\GAMING\horizon-routing-engine\frontend
npm run dev
```

Open the Vite URL displayed in the terminal. In the current development setup, it is:

```text
http://localhost:5173
```

## API Endpoints

The following endpoints are available in the current implementation:

| Method | Endpoint                               | Purpose                        |
| ------ | -------------------------------------- | ------------------------------ |
| GET    | `/api/health`                          | Check backend health           |
| GET    | `/api/processors`                      | Retrieve processor information |
| GET    | `/api/transactions`                    | Retrieve transaction history   |
| POST   | `/api/payments`                        | Submit a simulated payment     |
| PATCH  | `/api/processors/:id/status`           | Change processor availability  |
| PATCH  | `/api/processors/:id/simulate-timeout` | Simulate a processor timeout   |

Example: mark Processor A as healthy:

```json
{
  "isDown": false
}
```

Send this JSON body to `PATCH /api/processors/A/status`.

## Demonstration Scenarios

### 1. Successful Payment

Submit a payment and observe the processor's response and the resulting transaction.

### 2. Business Decline

Simulate a declined payment and verify that the result is represented correctly. A business decline should be distinguished from a technical failure.

### 3. Technical Timeout and Failover

Simulate a timeout on Processor A and submit a payment. Verify that the engine attempts another available processor and records the final result.

### 4. Processor Availability

Mark a processor as unavailable and verify that the routing engine uses an eligible alternative when one is available.

### 5. Real-Time Monitoring

Observe processor status, transaction history, and performance metrics as the application processes simulated payments.

## Configuration and Security

- Do not commit `.env` files, API keys, passwords, or other secrets.
- Keep `node_modules/` and generated build files out of version control.
- Use environment variables for configurable values when supported by the implementation.
- Use simulated data only; this project is not connected to real payment providers.

## Limitations

This project is a technical demonstration. Processor behavior, payment responses, and failures are simulated. Persistent storage, production payment integrations, and production-grade security should not be assumed unless implemented separately.

## License

No license has been specified. All rights are reserved by default unless a license is added to the repository.
wassimsahli-ai