interface GrimmtaleLogger {
    error(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    info(...args: unknown[]): void;
    debug(...args: unknown[]): void;
}

declare const Grimmtale: {
    createLogger(moduleId: string): GrimmtaleLogger;
};
