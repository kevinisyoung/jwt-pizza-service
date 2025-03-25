const configImport = require("../../config");
// Handle both ES module (with default) and CommonJS formats
const config = configImport.__esModule ? configImport.default : configImport;

console.log("config:", config);
console.log("config.grafana:", config.grafana);
console.log("config.grafana.source:", config.grafana.source);

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