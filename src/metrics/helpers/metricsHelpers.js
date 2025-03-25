const config = require("../../config");

const sourceAttribute = {
  key: "source",
  value: { stringValue: config.grafana.source },
};

const isApiRequest = (req) => {
  return (
    req.method !== "OPTIONS" && req.baseUrl && req.baseUrl.startsWith("/api")
  );
};

module.exports = {
  sourceAttribute,
  isApiRequest,
};