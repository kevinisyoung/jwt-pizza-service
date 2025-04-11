const { isApiRequest } = require("../metrics/helpers/metricsHelpers");

class Logger {
  constructor(config) {
    this.config = config;
    this.failedLogs = [];
    this.maxCachedLogs = 100; // Maximum number of logs to cache if services are down
    this.isServiceDown = {
      factory: false,
      grafana: false
    };
    console.log("Logger initialized with config:", config);
  }

  httpLogger = (req, res, next) => {
    console.log("HTTP Logger invoked for path:", req.path);
    let send = res.send;
    res.send = (resBody) => {
      console.log("Modifying response for path:", req.path);
      if (isApiRequest(req)) {
        console.log("API request detected. Logging data...");
        const logData = {
          authorized: !!req.headers.authorization,
          path: req.path,
          method: req.method,
          statusCode: res.statusCode,
          reqBody: JSON.stringify(req.body),
          resBody: JSON.stringify(resBody),
        };
        const level = this.statusToLogLevel(res.statusCode);
        console.log("Log level determined:", level);
        this.log(level, "http", logData);
      }

      res.send = send;
      console.log("Sending response body:", resBody);
      return res.send(resBody);
    };

    next();
  };

  dbLogger(query) {
    console.log("Database logger invoked with query:", query);
    this.log("info", "db", query);
  }

  factoryLogger(orderInfo) {
    console.log("Factory logger invoked with order info:", orderInfo);
    this.log("info", "factory", orderInfo);
  }

  unhandledErrorLogger(err) {
    console.log("Unhandled error logger invoked with error:", err);
    this.log("error", "unhandledError", {
      message: err.message,
      status: err.statusCode,
    });
  }

  log(level, type, logData) {
    console.log("Logging data with level:", level, "and type:", type);
    const labels = {
      component: this.config.grafanaSource,
      level: level,
      type: type,
    };
    
    // Get current timestamp
    const timestamp = this.nowString();
    const sanitizedData = this.sanitize(logData);
    const values = [timestamp, sanitizedData];
    const logEvent = { streams: [{ stream: labels, values: [values] }] };

    console.log("Prepared log event:", logEvent);
    
    // If we've got too many cached logs, remove oldest ones
    if (this.failedLogs.length > this.maxCachedLogs) {
      this.failedLogs = this.failedLogs.slice(-this.maxCachedLogs);
    }
    
    // Try to send the log, and also retry cached logs
    this.sendLogToGrafana(logEvent)
      .then(() => {
        // If successful and we have cached logs, try to send a cached log
        if (this.failedLogs.length > 0 && !this.isServiceDown.grafana && !this.isServiceDown.factory) {
          const cachedLog = this.failedLogs.shift();
          return this.sendLogToGrafana(cachedLog);
        }
      })
      .catch((error) => {
        // If failed, cache this log for retry later
        console.log(`Failed to send log, caching for retry. Error: ${error.message}`);
        this.failedLogs.push(logEvent);
      });
  }

  statusToLogLevel(statusCode) {
    console.log("Determining log level for status code:", statusCode);
    if (statusCode >= 500) return "error";
    if (statusCode >= 400) return "warn";
    return "info";
  }

  nowString() {
    const now = (Math.floor(Date.now()) * 1000000).toString();
    console.log("Current timestamp in nanoseconds:", now);
    return now;
  }

  sanitize(logData) {
    console.log("Sanitizing log data...");
    logData = JSON.stringify(logData);
    logData = logData.replace(
      /\\*"password\\*":\s*\\*"[^"]*\\*"/g,
      '\\"password\\": \\"*****\\"'
    );
    logData = logData.replace(
      /\\password\\=\s*\\"[^"]*\\"/g,
      '\\"password\\": \\"*****\\"'
    );
    logData = logData.replace(
      /\\*"token\\*":\s*\\*"[^"]*\\*"/g,
      '\\"token\\": \\"*****\\"'
    );
    logData = logData.replace(
      /\\token\\=\s*\\"[^"]*\\"/g,
      '\\"token\\": \\"*****\\"'
    );
    console.log("Sanitized log data:", logData);
    return logData;
  }

  async sendLogToGrafana(event) {
    console.log("Sending log to factory");
    // Log to factory
    try {
      const res = await fetch(`${this.config.factory.url}/api/log`, {
        method: "POST",
        body: {
          apiKey: this.config.factory.apiKey,
          event: event,
        },
        // Add a timeout to prevent hanging connections
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      if (!res.ok) {
        console.log("Failed to send log to factory");
        this.isServiceDown.factory = true;
      } else {
        console.log("Log sent to factory successfully");
        this.isServiceDown.factory = false;
      }
    } catch (error) {
      this.isServiceDown.factory = true;
      console.log(`Error sending log to factory: ${error.name === 'TimeoutError' ? 'Connection timeout' : error.message}`);
    }

    // Log to Grafana
    const body = JSON.stringify(event);
    console.log("Sending log to Grafana with body:", body);
    try {
      const res = await fetch(this.config.logging.url, {
        method: "post",
        body: body,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.logging.apiKey}`,
        },
        // Add a timeout to prevent hanging connections
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      if (!res.ok) {
        console.log("Failed to send log to Grafana");
        this.isServiceDown.grafana = true;
      } else {
        console.log("Log sent to Grafana successfully");
        this.isServiceDown.grafana = false;
      }
    } catch (error) {
      this.isServiceDown.grafana = true;
      console.log(`Error sending log to Grafana: ${error.name === 'TimeoutError' ? 'Connection timeout' : error.message}`);
    }
  }
}
module.exports = Logger;