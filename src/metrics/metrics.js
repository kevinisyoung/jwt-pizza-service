const os = require('os');


const configImport = require('../config.js');
const config = configImport.__esModule ? configImport.default : configImport;

const { getActiveUserMetrics } = require("./metricTypes/activeUserMetrics");
const { getAuthMetrics } = require("./metricTypes/authMetrics");
const { getHttpMetrics } = require("./metricTypes/httpMetrics");
const { getLatencyMetrics } = require("./metricTypes/latencyMetrics");
const { getPizzaMetrics } = require("./metricTypes/pizzaMetrics");
const { getSystemMetrics } = require("./metricTypes/systemMetrics");

const sendMetrics = async () => {
  console.log("within sendMetrics")
  try {
    const metrics = {
      resourceMetrics: [
        {
          scopeMetrics: [
            getHttpMetrics(),
            getSystemMetrics(),
            await getActiveUserMetrics(),
            getAuthMetrics(),
            getPizzaMetrics(),
            getLatencyMetrics(),
          ],
        },
      ],
    };

    const response = await fetch(config.metrics.url, {
      method: "POST",
      body: JSON.stringify(metrics),
      headers: {
        Authorization: `Bearer ${config.metrics.apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.error("Failed to push metrics data to Grafana", response.status, response.statusText);
    }
  } catch (error) {
    if (error.name === 'TimeoutError') {
      console.error("Timeout error when sending metrics to Grafana");
    } else if (error.name === 'TypeError' && error.message.includes('fetch failed')) {
      console.error("Network error when connecting to Grafana");
    } else {
      console.error("Error pushing metrics:", error.message);
    }
  }
};

const periodicallySendMetrics = () => {
  // Initial delay to allow application to fully initialize
  setTimeout(() => {
    // Send metrics once immediately
    sendMetrics().catch(err => console.error("Error in initial metrics send:", err.message));
    
    // Then set up the interval
    setInterval(() => {
      sendMetrics().catch(err => console.error("Error in periodic metrics send:", err.message));
    }, 10000); // Increased to 10 seconds to reduce server load
  }, 3000); // Wait 3 seconds after startup
};

module.exports = {
  periodicallySendMetrics,
};