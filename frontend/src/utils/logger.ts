type LogLevel = 'DEBUG' | 'INFO' | 'ERROR';

const LOG_LEVELS: Record<LogLevel, number> = {
    DEBUG: 0,
    INFO: 1,
    ERROR: 2,
};

// Global log level, can be set via environment variable at build time or via window object
const currentLogLevel: LogLevel = (import.meta.env.VITE_LOG_LEVEL || 'INFO').toUpperCase() as LogLevel;
const currentLevelValue = LOG_LEVELS[currentLogLevel] ?? 1;

export const logger = {
    debug: (...args: any[]) => {
        if (currentLevelValue <= LOG_LEVELS.DEBUG) {
            console.debug('[DEBUG]', ...args);
        }
    },
    info: (...args: any[]) => {
        if (currentLevelValue <= LOG_LEVELS.INFO) {
            console.info('[INFO]', ...args);
        }
    },
    error: (...args: any[]) => {
        if (currentLevelValue <= LOG_LEVELS.ERROR) {
            console.error('[ERROR]', ...args);
        }
    },
};

export default logger;
