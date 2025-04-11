const { isApiRequest } = require("../metrics/helpers/metricsHelpers");

class Logger {
  constructor(config) {
    this.config = config;
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
    const values = [this.nowString(), this.sanitize(logData)];
    const logEvent = { streams: [{ stream: labels, values: [values] }] };

    console.log("Prepared log event:", logEvent);
    this.sendLogToGrafana(logEvent);
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
    const res = await fetch(`${this.config.factory.url}/api/log`, {
      method: "POST",
      body: {
        apiKey: this.config.factory.apiKey,
        event: event,
      },
    });
    if (!res.ok) {
      console.log("Failed to send log to factory");
    } else {
      console.log("Log sent to factory successfully");
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
      });
      if (!res.ok) {
        console.log("Failed to send log to Grafana");
      } else {
        console.log("Log sent to Grafana successfully");
      }
    } catch (error) {
      console.log("Error sending log to Grafana:", error);
    }
  }
}
module.exports = Logger;