declare namespace foundry {
    namespace documents {
        const TokenDocument: {
            prototype: TokenDocument & {
                _onUpdateBaseActor(this: TokenDocument, update?: ActorUpdate, options?: object): void
            }
        };
    }

    namespace applications {
        namespace api {
            const ApplicationV2: any;
            function HandlebarsApplicationMixin(base: any): any;
        }
        namespace ux {
            const TextEditor: {
                implementation: {
                    enrichHTML(content: string, options?: object): Promise<string>
                }
            };
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

interface ActorUpdate {
    flags?: Record<string, Record<string, unknown> | undefined>;
    [key: string]: unknown;
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
    items: {
        filter(test: (item: Item) => boolean): Item[]
    };
    itemTypes: Record<string, Item[] | undefined>;
    system: {
        traits?: {
            size?: string;
            dr?: ActorTrait;
            di?: ActorTrait;
            dv?: ActorTrait;
            ci?: ActorTrait;
            armorProf?: ActorTrait;
            weaponProf?: ActorTrait;
            languages?: ActorTrait
        };
        details?: {
            type?: string | {
                value?: string;
                subtype?: string;
                custom?: string
            };
            biography?: {
                value?: string;
                public?: string
            };
            [field: string]: unknown
        };
        abilities?: Record<string, {
            value?: number;
            mod?: number;
            proficient?: number;
            save?: number | { value?: number }
        } | undefined>;
        skills?: Record<string, {
            value?: number;
            total?: number
        } | undefined>;
        tools?: Record<string, { value?: number } | undefined>;
        attributes?: {
            movement?: Record<string, number | string | boolean | undefined> & {
                units?: string;
                hover?: boolean
            }
        }
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
    _onRelatedUpdate(update: object, options: object): void;
}

interface Item {
    id: string;
    uuid: string;
    name: string;
    img: string;
    type: string;
    parent: Actor | null;
    system: {
        level?: number;
        description?: {
            value?: string;
            chat?: string
        };
        activities?: {
            contents: { activation?: { type?: string } }[]
        }
    };
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
        itemProperties: Record<string, SystemConfigEntry | undefined>;
        creatureTypes: Record<string, SystemConfigEntry | undefined>;
        abilities: Record<string, {
            label?: string;
            abbreviation?: string
        }>;
        skills: Record<string, { label?: string } | undefined>;
        spellLevels: Record<number, string | undefined>;
        actorSizes: Record<string, SystemConfigEntry | undefined>;
        movementTypes: Record<string, {
            label?: string;
            hidden?: boolean
        }>;
        movementUnits: Record<string, string | {
            label?: string;
            abbreviation?: string
        } | undefined>
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

declare const dnd5e: {
    documents: {
        Trait: {
            keyLabel(key: string, options: { trait: string }): string
        }
    }
};

declare const libWrapper: {
    register(packageId: string, target: string, fn: (...args: any[]) => unknown, type: string): void
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
