const LOG_LEVELS: Record<string, number> = { error: 0, warn: 1, info: 2, debug: 3 };
const VALID_LEVELS = Object.keys(LOG_LEVELS);

function getCurrentLevel(): string {
  const envLevel = process.env.LOG_LEVEL;
  if (envLevel && VALID_LEVELS.includes(envLevel)) {
    return envLevel;
  }
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

const currentLevel = getCurrentLevel();

function formatMessage(level: string, context: string, message: string, meta?: any): string {
  const timestamp = new Date().toISOString();
  const baseMessage = `[${timestamp}] [${level.toUpperCase()}] [${context}] ${message}`;
  
  if (meta && Object.keys(meta).length > 0) {
    return `${baseMessage} ${JSON.stringify(meta)}`;
  }
  return baseMessage;
}

function shouldLog(level: string): boolean {
  const levelValue = LOG_LEVELS[level];
  const currentLevelValue = LOG_LEVELS[currentLevel];
  return levelValue !== undefined && currentLevelValue !== undefined && levelValue <= currentLevelValue;
}

export function createLogger(context: string) {
  return {
    error(message: string, errorOrMeta?: any) {
      if (shouldLog('error')) {
        const meta = errorOrMeta instanceof Error 
          ? { error: errorOrMeta.message, stack: errorOrMeta.stack }
          : errorOrMeta;
        console.error(formatMessage('error', context, message, meta));
      }
    },

    warn(message: string, meta?: any) {
      if (shouldLog('warn')) {
        console.warn(formatMessage('warn', context, message, meta));
      }
    },

    info(message: string, meta?: any) {
      if (shouldLog('info')) {
        console.log(formatMessage('info', context, message, meta));
      }
    },

    debug(message: string, meta?: any) {
      if (shouldLog('debug')) {
        console.log(formatMessage('debug', context, message, meta));
      }
    }
  };
}
