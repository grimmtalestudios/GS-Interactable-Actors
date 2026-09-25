interface GrimmtaleLogger {
    error(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    info(...args: unknown[]): void;
}

interface GrimmtaleTheme {
    apply(app: { element: HTMLElement }): void;
    applyTo(element: HTMLElement): void;
    applyToOverlay(element: HTMLElement): void;
}

declare const Grimmtale: {
    bindFrame(app: { element: HTMLElement }, theme: GrimmtaleTheme): void;
    bindInputMode(root: HTMLElement): void;
    createLocalizer(prefix: string): (key: string, data?: Record<string, unknown>) => string;
    createLogger(moduleId: string): GrimmtaleLogger;
    createTheme(moduleId: string): GrimmtaleTheme;
    callPeer(moduleId: string, names: string | string[], args?: unknown[], fallback?: unknown): unknown;
    footerContext(moduleId: string): {
        footer: string;
        website: string
    };
    injectOnce(container: HTMLElement, markerClass: string, build: () => HTMLElement): HTMLElement;
    isPrimaryGM(): boolean;
    gmIds(): string[];
    registerSettings(moduleId: string, l10nPrefix: string, definitions: Record<string, object>): void;
    publishApi(moduleId: string, api: object, options: { gameAlias: string }): unknown;
};
