// @ts-check
import html from '@html-eslint/eslint-plugin';
import htmlParser, { TEMPLATE_ENGINE_SYNTAX } from '@html-eslint/parser';
import stylistic from '@stylistic/eslint-plugin';
import tseslint from 'typescript-eslint';
import gs from './eslint.rules.mjs';

const BREAK_AFTER_TWO = {
    multiline: true,
    minProperties: 2,
    consistent: true
};

export default [
    {
        ignores: ['node_modules/**', 'scripts/**']
    },
    {
        files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
        languageOptions: {
            parser: tseslint.parser,
            sourceType: 'module'
        },
        plugins: {
            '@stylistic': stylistic,
            gs
        },
        rules: {
            curly: ['error', 'all'],
            camelcase: ['error', {
                properties: 'never',
                ignoreDestructuring: true,
                ignoreImports: true,
                ignoreGlobals: true
            }],
            'new-cap': ['error', { capIsNew: false }],
            'gs/filename-case': 'error',
            'gs/import-case': 'error',
            '@stylistic/brace-style': ['error', '1tbs', { allowSingleLine: false }],
            '@stylistic/object-curly-newline': ['error', {
                ObjectExpression: BREAK_AFTER_TWO,
                TSTypeLiteral: BREAK_AFTER_TWO,
                TSInterfaceBody: BREAK_AFTER_TWO
            }],
            '@stylistic/object-property-newline': 'error',
            '@stylistic/indent': ['error', 4, { SwitchCase: 1 }],
            '@stylistic/no-tabs': 'error',
            '@stylistic/max-len': ['warn', {
                code: 120,
                ignoreUrls: true
            }],
            '@stylistic/no-trailing-spaces': 'error',
            '@stylistic/max-statements-per-line': ['error', { max: 1 }],
            '@stylistic/eol-last': ['error', 'always'],
            '@stylistic/semi': ['error', 'always'],
            '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
            '@stylistic/lines-around-comment': ['error', {
                beforeLineComment: true,
                beforeBlockComment: true
            }],
            '@stylistic/padding-line-between-statements': ['error', {
                blankLine: 'always',
                prev: '*',
                next: 'return'
            }]
        }
    },
    {
        files: ['**/*.hbs'],
        plugins: {
            '@html-eslint': html,
            gs
        },
        languageOptions: {
            parser: htmlParser,
            parserOptions: { templateEngineSyntax: TEMPLATE_ENGINE_SYNTAX.HANDLEBAR_EXTENDED }
        },
        rules: {
            'gs/filename-case': 'error',
            '@html-eslint/require-closing-tags': ['error', { selfClosing: 'always' }],
            '@html-eslint/no-trailing-spaces': 'error'
        }
    }
];
