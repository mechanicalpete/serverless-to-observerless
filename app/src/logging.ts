import * as winston from 'winston';

export const logger = winston.createLogger({
    levels: winston.config.syslog.levels,
    level: 'debug',
    transports: [
        new winston.transports.Console(),
    ]
});
