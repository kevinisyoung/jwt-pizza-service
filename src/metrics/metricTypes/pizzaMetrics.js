const { sourceAttribute } = require("../helpers/metricsHelpers");

const pizzaMetrics = {
  purchase: { success: 0, fail: 0 },
  pizza: { success: 0, fail: 0 },
  revenue: { success: 0, fail: 0 },
};

const trackPizzaSuccess = (count, revenue) => {
  pizzaMetrics.purchase.success += 1;
  pizzaMetrics.pizza.success += count;
  pizzaMetrics.revenue.success += revenue;
};

const trackPizzaFail = (count, revenue) => {
  pizzaMetrics.purchase.fail += 1;
  pizzaMetrics.pizza.fail += count;
  pizzaMetrics.revenue.fail += revenue;
};

const getPizzaMetrics = () => {
  return {
    metrics: Object.entries(pizzaMetrics).map(([metric, obj]) => ({
      name: metric,
      unit: "1",
      sum: {
        dataPoints: Object.entries(obj).map(([status, value]) => ({
          asDouble: value,
          timeUnixNano: Date.now() * 1000000,
          attributes: [
            sourceAttribute,
            {
              key: "status",
              value: { stringValue: status },
            },
          ],
        })),
        aggregationTemporality: "AGGREGATION_TEMPORALITY_CUMULATIVE",
        isMonotonic: true,
      },
    })),
  };
};

module.exports = {
  trackPizzaSuccess,
  trackPizzaFail,
  getPizzaMetrics,
};