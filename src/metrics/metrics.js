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
    });

    if (!response.ok) {
      console.error("Failed to push metrics data to Grafana", response);
    }
  } catch (error) {
    console.error("Error pushing metrics:", error);
  }
};

const periodicallySendMetrics = () => {
  setInterval(sendMetrics, 5000);
};

module.exports = {
  periodicallySendMetrics,
};