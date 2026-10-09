
import { useCallback, useEffect, useState } from "react";
import { io } from "socket.io-client";
import "./App.css";

const API = "https://horizon-gaming-s-dynamic-routing-engine.onrender.com";
const socket = io(API, { autoConnect: false });

function money(amount, currency) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function App() {
  const [processors, setProcessors] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({
    amount: "25",
    currency: "BRL",
    customerId: "PLAYER-1001",
    paymentMethod: "credit_card",
  });

  const refresh = useCallback(async () => {
    try {
      const [pRes, tRes] = await Promise.all([
        fetch(`${API}/api/processors`),
        fetch(`${API}/api/transactions`),
      ]);
      if (!pRes.ok || !tRes.ok) throw new Error("API unavailable");
      setProcessors(await pRes.json());
      setTransactions(await tRes.json());
      setNotice("");
    } catch {
      setNotice("Backend unavailable. Check that port 3001 is running.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    socket.connect();
    socket.on("processors:update", setProcessors);
    socket.on("transactions:init", setTransactions);
    socket.on("transaction:update", (transaction) => {
      setTransactions((current) => [
        transaction,
        ...current.filter(
          (item) => item.transactionId !== transaction.transactionId
        ),
      ].slice(0, 100));
    });
    return () => {
      socket.off("processors:update");
      socket.off("transactions:init");
      socket.off("transaction:update");
      socket.disconnect();
    };
  }, [refresh]);

  const total = transactions.length;
  const approved = transactions.filter((t) => t.status === "approved").length;
  const approvalRate = total ? ((approved / total) * 100).toFixed(1) : "0.0";
  const failovers = transactions.filter((t) => t.failoverOccurred).length;

  async function toggleProcessor(processor) {
    try {
      const response = await fetch(
        `${API}/api/processors/${processor.id}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isDown: !processor.isDown }),
        }
      );
      if (!response.ok) throw new Error();
      await refresh();
    } catch {
      setNotice("Could not update processor status.");
    }
  }

  async function simulateTimeout(processor) {
    try {
      const response = await fetch(
        `${API}/api/processors/${processor.id}/simulate-timeout`,
        { method: "PATCH" }
      );
      if (!response.ok) throw new Error();
      setNotice(`Next attempt on Processor ${processor.id} will timeout.`);
    } catch {
      setNotice("Could not simulate timeout.");
    }
  }

  async function submitPayment(event) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(`${API}/api/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(form.amount),
          currency: form.currency,
          customerId: form.customerId.trim(),
          paymentMethod: form.paymentMethod,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Payment failed");
      setTransactions((current) => [
        data,
        ...current.filter((t) => t.transactionId !== data.transactionId),
      ].slice(0, 100));
      await refresh();
      setNotice(
        `Payment ${data.status.toUpperCase()} — ${data.attempts.length} attempt(s).`
      );
    } catch (error) {
      setNotice(error.message || "Unable to submit payment.");
    } finally {
      setBusy(false);
    }
  }

  async function generateDemo() {
    setBusy(true);
    setNotice("Generating 20 demo payments...");
    const methods = ["credit_card", "debit_card", "local_wallet"];
    const currencies = ["BRL", "MXN", "COP"];
    try {
      const results = await Promise.all(
        Array.from({ length: 20 }, (_, i) =>
          fetch(`${API}/api/payments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              amount: Number((5 + Math.random() * 195).toFixed(2)),
              currency: currencies[i % currencies.length],
              customerId: `DEMO-${Date.now()}-${i}`,
              paymentMethod: methods[i % methods.length],
            }),
          })
        )
      );
      const failed = results.filter((response) => !response.ok).length;
      await refresh();
      setNotice(
        failed
          ? `Demo complete. ${failed} request(s) failed validation.`
          : "20 demo payment requests completed."
      );
    } catch {
      setNotice("Demo generation failed. Check the backend.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">H</div>
          <div>
            <div className="brand-title">HORIZON<span>PAY</span></div>
            <div className="brand-subtitle">SMART PAYMENT ROUTING</div>
          </div>
        </div>
        <div className="live-indicator"><span /> SIMULATION ENVIRONMENT</div>
      </header>

      <section className="page-heading">
        <div>
          <p className="eyebrow">PAYMENTS INFRASTRUCTURE</p>
          <h1>Routing <span>Overview</span></h1>
          <p className="subtitle">Monitor processor health, payment outcomes and automatic failover.</p>
        </div>
        <button className="secondary-button" onClick={refresh}>↻ Refresh data</button>
      </section>

      {notice && <div className="notice">{notice}</div>}

      <section className="stats-grid">
        <Stat label="TOTAL TRANSACTIONS" value={total} note="Loaded transaction history" />
        <Stat label="APPROVAL RATE" value={`${approvalRate}%`} note={`${approved} approved payments`} />
        <Stat label="AUTOMATIC FAILOVERS" value={failovers} note="Transactions with fallback" />
        <Stat
          label="ACTIVE PROCESSORS"
          value={processors.filter((p) => !p.isDown).length}
          note={`of ${processors.length} configured processors`}
        />
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div><p className="eyebrow">PROCESSOR NETWORK</p><h2>Processor health</h2></div>
          <span className="muted">{processors.length} gateways configured</span>
        </div>
        {loading ? <p className="muted">Loading processors...</p> : (
          <div className="processor-grid">
            {processors.map((p) => (
              <article className={`processor-card ${p.status}`} key={p.id}>
                <div className="processor-top">
                  <div className="processor-icon">{p.id}</div>
                  <span className={`status-pill ${p.status}`}>
                    <span className="status-dot" /> {p.status}
                  </span>
                </div>
                <h3>{p.name}</h3>
                <p className="processor-desc">Simulated payment gateway</p>
                <div className="processor-metrics">
                  <Metric label="Approval rate" value={`${p.approvalRate}%`} />
                  <Metric label="Avg. response" value={`${p.averageResponseTime} ms`} />
                  <Metric label="Total attempts" value={p.totalAttempts} />
                </div>
                <div className="processor-actions">
                  <button
                    className={p.isDown ? "success-button" : "danger-button"}
                    onClick={() => toggleProcessor(p)}
                  >
                    {p.isDown ? "Mark healthy" : "Mark down"}
                  </button>
                  <button className="text-button" onClick={() => simulateTimeout(p)}>
                    Test timeout
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="lower-grid">
        <div className="panel payment-panel">
          <div className="section-heading compact">
            <div><p className="eyebrow">SANDBOX</p><h2>Simulate a payment</h2></div>
          </div>
          <form onSubmit={submitPayment} className="payment-form">
            <label>Amount
              <input
                type="number" min="0.01" step="0.01" required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </label>
            <div className="form-row">
              <label>Currency
                <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                  <option value="BRL">BRL</option><option value="MXN">MXN</option><option value="COP">COP</option>
                </select>
              </label>
              <label>Payment method
                <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
                  <option value="credit_card">Credit card</option>
                  <option value="debit_card">Debit card</option>
                  <option value="local_wallet">Local wallet</option>
                </select>
              </label>
            </div>
            <label>Customer ID
              <input required value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} />
            </label>
            <button className="primary-button" disabled={busy}>
              {busy ? "Processing..." : "▶  Route payment"}
            </button>
            <button type="button" className="secondary-button full-width" disabled={busy} onClick={generateDemo}>
              Generate 20 demo payments
            </button>
            <p className="form-note">Simulation only. No real money is moved.</p>
          </form>
        </div>

        <div className="panel transactions-panel">
          <div className="section-heading compact">
            <div><p className="eyebrow">LIVE ACTIVITY</p><h2>Recent transactions</h2></div>
            <span className="count-badge">{transactions.length}</span>
          </div>
          {transactions.length === 0 ? (
            <div className="empty-state">No transactions yet. Run a payment to see activity here.</div>
          ) : (
            <div className="transaction-list">
              {transactions.slice(0, 12).map((t) => (
                <article className="transaction-row" key={t.transactionId}>
                  <div className="transaction-symbol">{t.status === "approved" ? "✓" : t.status === "declined" ? "!" : "×"}</div>
                  <div className="transaction-main">
                    <div className="transaction-title">
                      <strong>{t.customerId}</strong>
                      <span className={`result-text ${t.status}`}>{t.status}</span>
                    </div>
                    <div className="transaction-meta">
                      {t.transactionId.slice(0, 8)} · {t.finalProcessor ? `Processor ${t.finalProcessor}` : "No final processor"}
                      {t.failoverOccurred && <span className="failover-tag">FAILOVER</span>}
                    </div>
                    <div className="attempts">
                      {(t.attempts || []).map((a, i) => (
                        <span className={`attempt ${a.status}`} key={`${a.processorId}-${i}`}>
                          {a.processorId}: {a.status}{a.responseTime ? ` · ${a.responseTime}ms` : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="transaction-amount">{money(t.amount, t.currency)}</div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
      <footer>HorizonPay Routing Engine <span>·</span> Demo mode <span>·</span> All processors are simulated</footer>
    </main>
  );
}

function Stat({ label, value, note }) {
  return <article className="stat-card"><p>{label}</p><div className="stat-value">{value}</div><span>{note}</span></article>;
}
function Metric({ label, value }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}

export default App;
