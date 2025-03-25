const configImport = require("../../config");
// Handle both ES module (with default) and CommonJS formats
const config = configImport.__esModule ? configImport.default : configImport;


const sourceAttribute = {
  key: "source",
  value: { stringValue: config.metrics.source },
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