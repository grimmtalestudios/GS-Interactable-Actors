declare namespace foundry {
    namespace utils {
        function getProperty(object: object, key: string): unknown;
        function expandObject(object: object): Record<string, unknown>;
        function parseHTML(html: string): HTMLElement;
    }

    namespace helpers {
        namespace media {
            const ImageHelper: { hasImageExtension(src: string): boolean };
        }
    }

    namespace documents {
        const TokenDocument: {
            prototype: TokenDocument & {
                _onUpdateBaseActor(this: TokenDocument, update?: ActorUpdate, options?: object): void
            }
        };
    }

    namespace applications {
        const instances: Map<string, {
            element?: HTMLElement;
            actor?: Actor | null
        }>;

        namespace api {
            const ApplicationV2: any;
            function HandlebarsApplicationMixin(base: any): any;
        }
        namespace apps {
            const FilePicker: {
                implementation: new (options: object) => { browse(): Promise<unknown> }
            };
        }

        namespace ux {
            const FormDataExtended: new (form: HTMLFormElement) => { object: Record<string, unknown> };
            const TextEditor: {
                implementation: {
                    enrichHTML(content: string, options?: object): Promise<string>
                }
            };
        }

        namespace handlebars {
            function loadTemplates(paths: string[]): Promise<unknown>;
            function renderTemplate(path: string, data: object): Promise<string>;
        }
    }
}

interface Math {
    clamp(value: number, min: number, max: number): number;
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

type TokenUpdate = Record<string, unknown> & { _id: string };

interface Scene {
    tokens: {
        contents: TokenDocument[];
        filter(test: (tokenDoc: TokenDocument) => boolean): TokenDocument[];
        map<T>(transform: (tokenDoc: TokenDocument) => T): T[]
    };
    updateEmbeddedDocuments(type: string, updates: object[], options?: object): Promise<unknown>;
}

interface ActorUpdate {
    flags?: Record<string, Record<string, unknown> | undefined>;
    [key: string]: unknown;
}

interface User {
    isGM: boolean;
    character?: Actor | null;
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

interface HitPoints {
    value?: number;
    max?: number | null;
    effectiveMax?: number;
}

interface D20Roll {
    total: number;
    isCritical: boolean;
    isFumble: boolean;
    d20?: {
        results: {
            result: number;
            active?: boolean
        }[]
    };
}

interface AttackTarget {
    uuid?: string;
    ac?: number | null;
}

interface ChatMessage {
    blind: boolean;
    whisper: string[];
    rolls: unknown[];
    flags: {
        dnd5e?: {
            roll?: { type?: string };
            targets?: AttackTarget[]
        }
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
    prototypeToken?: {
        disposition?: number;
        texture?: { src?: string | null }
    };
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
            hp?: HitPoints;
            ac?: { value?: number };
            movement?: Record<string, number | string | boolean | undefined> & {
                units?: string;
                hover?: boolean
            }
        }
    };
    getFlag(scope: string, key: string): unknown;
    getRollData(): Record<string, unknown>;
    update(data: object, options?: object): Promise<unknown>;
    canUserModify(user: User, action: string): boolean;
    flags: Record<string, Record<string, unknown> | undefined>;
    setFlag(scope: string, key: string, value: unknown): Promise<unknown>;
    unsetFlag(scope: string, key: string): Promise<unknown>;
}

interface TokenDocument {
    id: string;
    name: string;
    actor: Actor | null;
    baseActor: Actor | null;
    disposition?: number;
    sort: number;
    elevation: number;
    isOwner: boolean;
    actorLink: boolean;
    actorId: string | null;
    parent: Scene | null;
    texture: { src: string | null };
    ring: {
        enabled: boolean;
        subject: { texture: string | null }
    };
    flags: Record<string, Record<string, unknown> | undefined>;
    delta: { toObject(): { flags?: object } } | null;
    update(data: object, options?: object): Promise<unknown>;
    getFlag(scope: string, key: string): unknown;
    setFlag(scope: string, key: string, value: unknown): Promise<unknown>;
    _onRelatedUpdate(update: object, options: object): void;
}

interface Item {
    id: string;
    uuid: string;
    name: string;
    img: string;
    type: string;
    parent: Actor | null;
    getRollData(): Record<string, unknown>;
    system: {
        level?: number;
        description?: {
            value?: string | null;
            chat?: string | null
        };
        activities?: {
            contents: { activation?: { type?: string } }[]
        }
    };
}

interface Point {
    x: number;
    y: number;
}

interface Token {
    actor: Actor | null;
    document: TokenDocument;
    visible: boolean;
    isTargeted: boolean;
    bounds: { contains(x: number, y: number): boolean };
    setTarget(isTargeted: boolean, options: { releaseOthers: boolean }): void;
}

interface ContextMenuEntry {
    name: string;
    icon: string;
    condition: () => boolean;
    callback: (target: HTMLElement) => void;
}

interface TokenHud {
    object: Token;
}

declare function fromUuidSync(uuid: string): Actor | null;

declare const canvas: {
    tokens: { placeables: Token[] };
    canvasCoordinatesFromClient(point: Point): Point;
};

declare const CONFIG: {
    Dice: {
        D20Roll: new (...args: any[]) => D20Roll
    };
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
        bloodied?: { threshold?: number };
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
    actors: Iterable<Actor> & {
        get(id: string): Actor | undefined
    };
    scenes: Iterable<Scene>;
    settings: {
        get(namespace: string, key: string): unknown;
        set(namespace: string, key: string, value: unknown): Promise<unknown>;
        settings: Map<string, {
            namespace: string;
            key: string
        }>;
        storage: Map<string, {
            find(test: (setting: {
                key: string;
                value: unknown
            }) => boolean): { value: unknown } | undefined
        }>
    };
    i18n: {
        localize(key: string): string;
        format(key: string, data?: Record<string, unknown>): string
    };
    user: User;
};

declare const Actor: {
    implementation: {
        updateDocuments(updates: object[]): Promise<unknown>
    }
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

declare const CONST: {
    TOKEN_DISPOSITIONS: {
        FRIENDLY: number
    }
};

declare const ChatMessage: {
    implementation: {
        create(data: object): Promise<unknown>
    }
};

declare const Hooks: {
    once(hook: string, fn: (...args: any[]) => void): number;
    on(hook: string, fn: (...args: any[]) => void): number;
    callAll(hook: string, ...args: any[]): boolean;
};

declare const ui: {
    notifications: {
        info(message: string): void;
        warn(message: string): void
    };
};
