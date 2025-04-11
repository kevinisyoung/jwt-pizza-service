const { sourceAttribute, isApiRequest } = require("../helpers/metricsHelpers");

let latencies = [];

const latencyMetrics = (req, res, next) => {
  const start = process.hrtime();

  res.on("finish", () => {
    if (!isApiRequest(req)) return;

    const diff = process.hrtime(start);
    const durationMs = diff[0] * 1000 + diff[1] / 1e6;

    const factoryCall = req.baseUrl === "/api/order" && req.method === "POST";

    latencies.push({
      timestamp: Date.now() * 1000000,
      latency: durationMs,
      type: factoryCall ? "factory" : "service",
    });
  });

  next();
};


const trackLatency = (req, res, next) => {
  const start = process.hrtime();

  res.on("finish", () => {
    if (!isApiRequest(req)) return;

    const diff = process.hrtime(start);
    const durationMs = diff[0] * 1000 + diff[1] / 1e6;

    const factoryCall = req.baseUrl === "/api/order" && req.method === "POST";

    latencies.push({
      timestamp: Date.now() * 1000000,
      latency: durationMs,
      type: factoryCall ? "factory" : "service",
    });
  });

  next();
};

const getLatencyMetrics = () => {
  if (!latencies.length) return { metrics: [] };

  const metrics = {
    metrics: [
      {
        name: "latency",
        unit: "ms",
        gauge: {
          dataPoints: latencies.map(({ timestamp, latency, type }) => ({
            asDouble: latency,
            timeUnixNano: timestamp,
            attributes: [
              sourceAttribute,
              {
                key: "request_type",
                value: { stringValue: type },
              },
            ],
          })),
        },
      },
    ],
  };

  latencies = [];

  return metrics;
};

module.exports = {
  latencyMetrics,
  getLatencyMetrics,
};