const { DB } = require("../../database/database");
const { sourceAttribute } = require("../helpers/metricsHelpers");

const getActiveUserMetrics = async () => {
  return {
    metrics: [
      {
        name: "active_users",
        unit: "1",
        gauge: {
          dataPoints: [
            {
              asInt: await DB.countLoggedInUsers(),
              timeUnixNano: Date.now() * 1000000,
              attributes: [sourceAttribute],
            },
          ],
        },
      },
    ],
  };
};

module.exports = {
  getActiveUserMetrics,
};