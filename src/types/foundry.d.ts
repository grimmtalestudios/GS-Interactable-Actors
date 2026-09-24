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

type SystemConfigEntry = string | {
    label?: string;
    name?: string
};

interface ActorTrait {
    value?: Iterable<string>;
    custom?: string;
    bypasses?: Iterable<string>;
}

interface User {
    id: string;
    isGM: boolean;
    name: string;
}

interface DamageMarks {
    resistance?: boolean;
    immunity?: boolean;
    vulnerability?: boolean;
}

interface DamageDescription {
    type?: string;
    active?: {
        type?: DamageMarks;
        all?: DamageMarks
    };
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
    system: {
        traits?: Partial<Record<string, ActorTrait>>
    };
    getFlag(scope: string, key: string): unknown;
    update(data: object, options?: object): Promise<unknown>;
    canUserModify(user: User, action: string): boolean;
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

declare const CONFIG: {
    DND5E: {
        damageTypes: Record<string, SystemConfigEntry | undefined>;
        healingTypes: Record<string, SystemConfigEntry | undefined>;
        conditionTypes: Record<string, SystemConfigEntry | undefined>;
        itemProperties: Record<string, SystemConfigEntry | undefined>
    }
};

declare const game: {
    modules: {
        get(id: string): FoundryModule | undefined
    };
    actors: {
        get(id: string): Actor | undefined
    };
    users: {
        filter(test: (user: User) => boolean): User[]
    };
    settings: {
        get(namespace: string, key: string): unknown
    };
    i18n: {
        localize(key: string): string;
        format(key: string, data?: Record<string, unknown>): string
    };
    user: User;
};

declare const ChatMessage: {
    implementation: {
        create(data: object): Promise<unknown>
    }
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
