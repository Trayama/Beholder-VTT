export type LogLevel = "debug" | "info" | "warn" | "error";

const PREFIX = "[Beholder VTT]";

function format(level: LogLevel, message: string): string {
  return `${PREFIX} ${level.toUpperCase()} ${new Date().toISOString()} — ${message}`;
}

export const logger = {
  debug(message: string, details?: unknown): void {
    if (details === undefined) console.debug(format("debug", message));
    else console.debug(format("debug", message), details);
  },
  info(message: string, details?: unknown): void {
    if (details === undefined) console.info(format("info", message));
    else console.info(format("info", message), details);
  },
  warn(message: string, details?: unknown): void {
    if (details === undefined) console.warn(format("warn", message));
    else console.warn(format("warn", message), details);
  },
  error(message: string, error?: unknown): void {
    if (error === undefined) console.error(format("error", message));
    else console.error(format("error", message), error);
  },
};
