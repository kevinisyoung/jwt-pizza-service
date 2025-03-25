const { sourceAttribute } = require("../helpers/metricsHelpers");

const attempts = {
  success: 0,
  fail: 0,
};

const trackAuthSuccess = () => {
  attempts.success += 1;
};

const trackAuthFail = () => {
  attempts.fail += 1;
};

const getAuthMetrics = () => {
  console.log("within getAuthMetrics")
  return {
    metrics: Object.entries(attempts).map(([status, value]) => ({
      name: "auth_attempts",
      unit: "1",
      sum: {
        dataPoints: [
          {
            asInt: value,
            timeUnixNano: Date.now() * 1000000,
            attributes: [
              sourceAttribute,
              {
                key: "status",
                value: { stringValue: status },
              },
            ],
          },
        ],
        aggregationTemporality: "AGGREGATION_TEMPORALITY_CUMULATIVE",
        isMonotonic: true,
      },
    })),
  };
};

module.exports = {
  trackAuthSuccess,
  trackAuthFail,
  getAuthMetrics,
};