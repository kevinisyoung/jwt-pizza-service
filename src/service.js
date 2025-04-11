const express = require('express');
const { authRouter, setAuthUser } = require('./routes/authRouter.js');
const orderRouter = require('./routes/orderRouter.js');
const franchiseRouter = require('./routes/franchiseRouter.js');
const version = require('./version.json');
const configImport = require('./config.js');
// Handle both ES module (with default) and CommonJS formats
const { periodicallySendMetrics } = require('./metrics/metrics.js');
const { trackLatency } = require('./metrics/metricTypes/latencyMetrics.js');
const config = configImport.__esModule ? configImport.default : configImport;
const { latencyMetrics } = require("./metrics/metricTypes/latencyMetrics.js");
const { httpMetrics } = require("./metrics/metricTypes/httpMetrics.js");
const Logger = require("./logging/logger.js");

// Function to check external service health
const checkExternalServices = async () => {
  console.log("Checking external services health...");
  
  // Array to store service status
  const serviceStatus = {};
  
  // Check factory service
  try {
    const factoryRes = await fetch(`${config.factory.url}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    serviceStatus.factory = factoryRes.ok ? 'OK' : `Error: ${factoryRes.status}`;
  } catch (error) {
    serviceStatus.factory = `Connection Error: ${error.name === 'TimeoutError' ? 'timeout' : error.message}`;
    console.warn(`⚠️ Factory service (${config.factory.url}) is not responding: ${error.message}`);
  }
  
  // Check Grafana metrics
  try {
    const metricsRes = await fetch(`${new URL(config.metrics.url).origin}/api/v1/query?query=up`, {
      headers: {
        Authorization: `Bearer ${config.metrics.apiKey}`,
      },
      signal: AbortSignal.timeout(3000),
    });
    serviceStatus.metrics = metricsRes.ok ? 'OK' : `Error: ${metricsRes.status}`;
  } catch (error) {
    serviceStatus.metrics = `Connection Error: ${error.name === 'TimeoutError' ? 'timeout' : error.message}`;
    console.warn(`⚠️ Metrics service (${new URL(config.metrics.url).origin}) is not responding: ${error.message}`);
  }
  
  // Check Grafana logging
  try {
    const logsRes = await fetch(`${new URL(config.logging.url).origin}/ready`, {
      signal: AbortSignal.timeout(3000),
    });
    serviceStatus.logging = logsRes.ok ? 'OK' : `Error: ${logsRes.status}`;
  } catch (error) {
    serviceStatus.logging = `Connection Error: ${error.name === 'TimeoutError' ? 'timeout' : error.message}`;
    console.warn(`⚠️ Logging service (${new URL(config.logging.url).origin}) is not responding: ${error.message}`);
  }
  
  console.log("External service health status:", serviceStatus);
  return serviceStatus;
};

const app = express();
app.use(express.json());
const logger = new Logger(config);
app.use(logger.httpLogger);
app.use(latencyMetrics);
app.use(httpMetrics);
app.use(setAuthUser);
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  next();
});

// Check external services health on startup
checkExternalServices().catch(err => console.error("Failed to check external services:", err.message));

periodicallySendMetrics();

const apiRouter = express.Router();
app.use('/api', apiRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/order', orderRouter);
apiRouter.use('/franchise', franchiseRouter);

// Add health check endpoint
app.get('/health', async (req, res) => {
  try {
    const serviceStatus = await checkExternalServices();
    res.json({
      status: 'up',
      version: version.version,
      externalServices: serviceStatus
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

apiRouter.use('/docs', (req, res) => {
  res.json({
    version: version.version,
    endpoints: [...authRouter.endpoints, ...orderRouter.endpoints, ...franchiseRouter.endpoints],
    config: { 
      factory: config.factory?.url || 'Not configured', 
      db: config.db?.connection?.host || 'Not configured' 
    },
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'welcome to JWT Pizza',
    version: version.version,
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    message: 'unknown endpoint',
  });
});

// Default error handler for all exceptions and errors.
app.use((err, req, res, next) => {
  res.status(err.statusCode ?? 500).json({ message: err.message, stack: err.stack });
  logger.unhandledErrorLogger(err);
  next();
});

module.exports = app;
