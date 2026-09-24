declare namespace foundry {
    namespace applications {
        namespace api {
            const ApplicationV2: any;
            function HandlebarsApplicationMixin(base: any): any;
        }
        namespace handlebars {
            function loadTemplates(paths: string[]): Promise<unknown>;
        }
    }
}

interface FoundryModule {
    id: string;
    title: string;
    version: string;
    active: boolean;
    api?: unknown;
}

interface Actor {
    id: string;
    uuid: string;
    name: string;
    img: string;
    type: string;
    isToken: boolean;
    isOwner: boolean;
    token: TokenDocument | null;
    getFlag(scope: string, key: string): unknown;
}

interface TokenDocument {
    id: string;
    name: string;
    actor: Actor | null;
    baseActor: Actor | null;
}

interface Token {
    actor: Actor | null;
    document: TokenDocument;
}

interface TokenHud {
    object: Token;
}

declare const game: {
    modules: {
        get(id: string): FoundryModule | undefined
    };
    actors: {
        get(id: string): Actor | undefined
    };
    i18n: {
        localize(key: string): string;
        format(key: string, data?: Record<string, unknown>): string
    };
    user: {
        isGM: boolean;
        name: string
    };
};

declare const Hooks: {
    once(hook: string, fn: (...args: any[]) => void): number;
    on(hook: string, fn: (...args: any[]) => void): number;
    off(hook: string, id: number): void;
    callAll(hook: string, ...args: any[]): boolean;
};

declare const ui: {
    notifications: {
        info(message: string): void;
        warn(message: string): void;
        error(message: string): void
    };
};
