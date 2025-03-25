const configImport = require("../../config");
// Handle both ES module (with default) and CommonJS formats
const config = configImport.__esModule ? configImport.default : configImport;

const freak_dude_1 = config;
const freak_dude_2 = config.grafana;
const freak_dude_3 = config.grafana.source;
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