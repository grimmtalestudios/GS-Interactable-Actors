interface GrimmtaleLogger {
    error(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    info(...args: unknown[]): void;
    debug(...args: unknown[]): void;
}

interface GrimmtaleTheme {
    apply(app: { element: HTMLElement }): void;
}

declare const Grimmtale: {
    createLogger(moduleId: string): GrimmtaleLogger;
    createTheme(moduleId: string): GrimmtaleTheme;
    footerContext(moduleId: string): {
        footer: string;
        website: string
    };
    quietCloseButton(root: ParentNode): void;
};
