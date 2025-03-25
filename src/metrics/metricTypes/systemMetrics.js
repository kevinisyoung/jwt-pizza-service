const os = require("os");
const { sourceAttribute } = require("../helpers/metricsHelpers");

function getCpuUsagePercentage() {
  const cpuUsage = os.loadavg()[0] / os.cpus().length;
  return cpuUsage.toFixed(2) * 100;
}

function getMemoryUsagePercentage() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsage = (usedMemory / totalMemory) * 100;
  return memoryUsage.toFixed(2);
}

const getSystemMetrics = () => {
  return {
    metrics: [
      { name: "cpu", value: getCpuUsagePercentage() },
      { name: "memory", value: getMemoryUsagePercentage() },
    ].map((metric) => ({
      name: metric.name,
      unit: "%",
      gauge: {
        dataPoints: [
          {
            asDouble: metric.value,
            timeUnixNano: Date.now() * 1000000,
            attributes: [sourceAttribute],
          },
        ],
      },
    })),
  };
};

module.exports = {
  getSystemMetrics,
};