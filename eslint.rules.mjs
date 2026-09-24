import fs from 'node:fs';
import path from 'node:path';

const CAMEL = /^[a-z][a-zA-Z0-9]*$/;
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CODE = /\.(?:js|mjs|cjs|ts|mts|cts)$/;

function segmentsOf(file) {
    return file.replace(/\.[^.]+$/, '').split('.');
}

function onDiskName(dir, source) {
    const segments = source.split('/');
    let current = dir;

    for (let i = 0; i < segments.length; i += 1) {
        const segment = segments[i];

        if (segment === '' || segment === '.' || segment === '..') {
            current = path.resolve(current, segment);
            continue;
        }

        let entries;

        try {
            entries = fs.readdirSync(current);
        } catch {
            return null;
        }

        const last = i === segments.length - 1;
        const wanted = last ? [segment, segment.replace(/\.js$/, '.ts'), segment.replace(/\.mjs$/, '.mts')] : [segment];

        if (wanted.some((name) => entries.includes(name))) {
            current = path.join(current, segment);
            continue;
        }

        return entries.find((entry) => wanted.some((name) => entry.toLowerCase() === name.toLowerCase())) || null;
    }

    return null;
}

const filenameCase = {
    meta: {
        type: 'problem',
        schema: []
    },
    create(context) {
        return {
            Program(node) {
                const file = path.basename(context.filename);

                if (file === '<input>' || file === '<text>') {
                    return;
                }

                const pattern = CODE.test(file) ? CAMEL : KEBAB;

                if (segmentsOf(file).every((segment) => pattern.test(segment))) {
                    return;
                }

                context.report({
                    node,
                    loc: {
                        line: 1,
                        column: 0
                    },
                    message: `File name '${file}' should be ${pattern === CAMEL ? 'camelCase' : 'kebab-case'}`
                });
            }
        };
    }
};

const importCase = {
    meta: {
        type: 'problem',
        schema: []
    },
    create(context) {
        const dir = path.dirname(context.filename);
        const check = (node) => {
            const source = node.source && node.source.value;

            if (typeof source !== 'string' || !source.startsWith('.')) {
                return;
            }

            const actual = onDiskName(dir, source);

            if (actual) {
                context.report({
                    node: node.source,
                    message: `Import '${source}' does not match the file on disk: '${actual}'`
                });
            }
        };

        return {
            ImportDeclaration: check,
            ExportNamedDeclaration: check,
            ExportAllDeclaration: check,
            ImportExpression: check
        };
    }
};

export default {
    rules: {
        'filename-case': filenameCase,
        'import-case': importCase
    }
};
