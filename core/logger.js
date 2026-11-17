const PREFIX = "[Beholder VTT]";
function format(level, message) {
    return `${PREFIX} ${level.toUpperCase()} ${new Date().toISOString()} — ${message}`;
}
export const logger = {
    debug(message, details) {
        if (details === undefined)
            console.debug(format("debug", message));
        else
            console.debug(format("debug", message), details);
    },
    info(message, details) {
        if (details === undefined)
            console.info(format("info", message));
        else
            console.info(format("info", message), details);
    },
    warn(message, details) {
        if (details === undefined)
            console.warn(format("warn", message));
        else
            console.warn(format("warn", message), details);
    },
    error(message, error) {
        if (error === undefined)
            console.error(format("error", message));
        else
            console.error(format("error", message), error);
    },
};
//# sourceMappingURL=logger.js.map