export interface LogEntry {
  id: string;
  type: "info" | "warn" | "error" | "perf";
  module: string;
  message: string;
  timestamp: Date;
  details?: any;
}

type LogListener = (entry: LogEntry) => void;
const listeners = new Set<LogListener>();

export const logBuffer: LogEntry[] = [];

export function subscribeToLogs(listener: LogListener) {
  listeners.add(listener);
  // Emit all current buffered entries to the subscriber initially
  logBuffer.forEach(entry => listener(entry));

  return () => {
    listeners.delete(listener);
  };
}

export function clearLogBuffer() {
  logBuffer.length = 0;
  listeners.forEach(listener => {
    // Notify listeners with empty state or triggering clear event if needed
  });
}

function emitLog(entry: LogEntry) {
  logBuffer.push(entry);
  if (logBuffer.length > 200) {
    logBuffer.shift(); // Cap buffer size at 200
  }
  listeners.forEach((listener) => {
    try {
      listener(entry);
    } catch (e) {
      // ignore
    }
  });
}

const isDev = process.env.NODE_ENV === "development";

export const devLogger = {
  info(module: string, message: string, details?: any) {
    const entry: LogEntry = {
      id: Math.random().toString(),
      type: "info",
      module,
      message,
      timestamp: new Date(),
      details,
    };
    emitLog(entry);

    if (isDev) {
      if (typeof window !== "undefined") {
        console.log(
          `%c[${module}]%c ${message}`,
          "background: #10B981; color: white; padding: 2px 5px; border-radius: 4px; font-weight: bold;",
          "color: inherit;",
          details !== undefined ? details : ""
        );
      } else {
        console.log(`\x1b[42m\x1b[30m[${module}]\x1b[0m ${message}`, details !== undefined ? details : "");
      }
    }
  },

  warn(module: string, message: string, details?: any) {
    const entry: LogEntry = {
      id: Math.random().toString(),
      type: "warn",
      module,
      message,
      timestamp: new Date(),
      details,
    };
    emitLog(entry);

    if (isDev) {
      if (typeof window !== "undefined") {
        console.warn(
          `%c[${module}]%c ${message}`,
          "background: #F59E0B; color: black; padding: 2px 5px; border-radius: 4px; font-weight: bold;",
          "color: inherit;",
          details !== undefined ? details : ""
        );
      } else {
        console.warn(`\x1b[43m\x1b[30m[${module}]\x1b[0m ${message}`, details !== undefined ? details : "");
      }
    }
  },

  error(module: string, message: string, details?: any) {
    const entry: LogEntry = {
      id: Math.random().toString(),
      type: "error",
      module,
      message,
      timestamp: new Date(),
      details,
    };
    emitLog(entry);

    if (isDev) {
      if (typeof window !== "undefined") {
        console.error(
          `%c[${module}]%c ${message}`,
          "background: #EF4444; color: white; padding: 2px 5px; border-radius: 4px; font-weight: bold;",
          "color: inherit;",
          details !== undefined ? details : ""
        );
      } else {
        console.error(`\x1b[41m\x1b[37m[${module}]\x1b[0m ${message}`, details !== undefined ? details : "");
      }
    }
  },

  perf(module: string, label: string, durationMs: number, details?: any) {
    const entry: LogEntry = {
      id: Math.random().toString(),
      type: "perf",
      module,
      message: `${label} took ${durationMs.toFixed(2)}ms`,
      timestamp: new Date(),
      details,
    };
    emitLog(entry);

    if (isDev) {
      if (typeof window !== "undefined") {
        console.log(
          `%c[PERF - ${module}]%c ${label} took %c${durationMs.toFixed(2)}ms`,
          "background: #6366F1; color: white; padding: 2px 5px; border-radius: 4px; font-weight: bold;",
          "color: inherit;",
          "color: #818CF8; font-weight: bold;",
          details !== undefined ? details : ""
        );
      } else {
        console.log(
          `\x1b[45m\x1b[37m[PERF - ${module}]\x1b[0m ${label} took \x1b[1m\x1b[35m${durationMs.toFixed(
            2
          )}ms\x1b[0m`,
          details !== undefined ? details : ""
        );
      }
    }
  },
};
