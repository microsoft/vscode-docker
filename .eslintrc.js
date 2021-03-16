module.exports = {
    "env": {
        "es6": true,
        "node": true
    },
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "project": "tsconfig.json",
        "sourceType": "module"
    },
    "plugins": [
        "@typescript-eslint",
        "import",
        "unicorn"
    ],
    "rules": {
        "@typescript-eslint/adjacent-overload-signatures": "error",
        "@typescript-eslint/array-type": "error",
        "@typescript-eslint/await-thenable": "error",
        "@typescript-eslint/ban-types": "error",
        "@typescript-eslint/consistent-type-assertions": "off",
        "@typescript-eslint/consistent-type-definitions": "off",
        "@typescript-eslint/explicit-member-accessibility": [
            "error",
            {
                "accessibility": "explicit"
            }
        ],
        "@typescript-eslint/indent": [
            "error",
            4,
            {
                "CallExpression": {
                    "arguments": "first"
                },
                "FunctionDeclaration": {
                    "parameters": "first"
                },
                "FunctionExpression": {
                    "parameters": "first"
                },
                "SwitchCase": 1
            }
        ],
        "@typescript-eslint/interface-name-prefix": "off",
        "@typescript-eslint/member-delimiter-style": [
            "off",
            "error",
            {
                "multiline": {
                    "delimiter": "semi",
                    "requireLast": true
                },
                "singleline": {
                    "delimiter": "semi",
                    "requireLast": false
                }
            }
        ],
        "@typescript-eslint/member-ordering": "off",
        "@typescript-eslint/no-empty-function": "off",
        "@typescript-eslint/no-empty-interface": "error",
        "@typescript-eslint/no-explicit-any": "error",
        "@typescript-eslint/no-extraneous-class": "error",
        "@typescript-eslint/no-floating-promises": "error",
        "@typescript-eslint/no-for-in-array": "error",
        "@typescript-eslint/no-inferrable-types": "off",
        "@typescript-eslint/no-misused-new": "error",
        "@typescript-eslint/no-namespace": "off",
        "@typescript-eslint/no-non-null-assertion": "error",
        "@typescript-eslint/no-param-reassign": "off",
        "@typescript-eslint/no-parameter-properties": "off",
        "@typescript-eslint/no-require-imports": "off",
        "@typescript-eslint/no-this-alias": "error",
        "@typescript-eslint/no-unnecessary-qualifier": "error",
        "@typescript-eslint/no-unnecessary-type-arguments": "error",
        "@typescript-eslint/no-unnecessary-type-assertion": "error",
        "@typescript-eslint/no-use-before-declare": "off",
        "@typescript-eslint/no-var-requires": "error",
        "@typescript-eslint/prefer-for-of": "error",
        "@typescript-eslint/prefer-function-type": "error",
        "@typescript-eslint/prefer-namespace-keyword": "off",
        "@typescript-eslint/promise-function-async": "error",
        "@typescript-eslint/quotes": [
            "off",
            "single"
        ],
        "@typescript-eslint/restrict-plus-operands": "off",
        "@typescript-eslint/semi": [
            "off",
            "always"
        ],
        "@typescript-eslint/strict-boolean-expressions": [
            "off",
            {
                "allowNullable": true
            }
        ],
        "@typescript-eslint/triple-slash-reference": "error",
        "@typescript-eslint/type-annotation-spacing": "off",
        "@typescript-eslint/unified-signatures": "error",
        "arrow-parens": [
            "off",
            "as-needed"
        ],
        "camelcase": "error",
        "capitalized-comments": "off",
        "comma-dangle": "off",
        "complexity": "error",
        "constructor-super": "error",
        "curly": "error",
        "default-case": "error",
        "dot-notation": "error",
        "eol-last": "off",
        "eqeqeq": [
            "error",
            "smart"
        ],
        "guard-for-in": "error",
        "id-blacklist": [
            "error",
            "any",
            "number",
            "string",
            "Boolean",
            "boolean",
        ],
        "id-match": "error",
        "import/no-default-export": "off",
        "import/no-deprecated": "off",
        "import/no-extraneous-dependencies": "error",
        "import/no-internal-modules": "off",
        "import/no-unassigned-import": "error",
        "import/order": "off",
        "linebreak-style": "off",
        "max-classes-per-file": [
            "off",
            3
        ],
        "max-len": [
            "off",
            {
                "code": 140
            }
        ],
        "max-lines": "off",
        "new-parens": "error",
        "newline-per-chained-call": "off",
        "no-bitwise": "error",
        "no-caller": "error",
        "no-cond-assign": "error",
        "no-console": [
            "off",
            {
                "allow": [
                    "dirxml",
                    "warn",
                    "error",
                    "dir",
                    "timeLog",
                    "assert",
                    "clear",
                    "count",
                    "countReset",
                    "group",
                    "groupCollapsed",
                    "groupEnd",
                    "table",
                    "Console",
                    "markTimeline",
                    "profile",
                    "profileEnd",
                    "timeline",
                    "timelineEnd",
                    "timeStamp",
                    "context"
                ]
            }
        ],
        "no-constant-condition": "error",
        "no-control-regex": "error",
        "no-debugger": "error",
        "no-duplicate-case": "error",
        "no-duplicate-imports": "off",
        "no-empty": "off",
        "no-eval": "error",
        "no-extra-bind": "error",
        "no-extra-semi": "error",
        "no-fallthrough": "off",
        "no-invalid-regexp": "error",
        "no-invalid-this": "error",
        "no-irregular-whitespace": "error",
        "no-magic-numbers": "off",
        "no-multi-str": "off",
        "no-multiple-empty-lines": "error",
        "no-new-func": "error",
        "no-new-wrappers": "error",
        "no-null/no-null": "off",
        "no-octal": "error",
        "no-octal-escape": "error",
        "no-redeclare": "error",
        "no-regex-spaces": "error",
        "no-restricted-syntax": [
            "error",
            "ForInStatement"
        ],
        "no-return-await": "off",
        "no-sequences": "error",
        "no-shadow": "off",
        "@typescript-eslint/no-shadow": ["error"],
        "no-sparse-arrays": "error",
        "no-template-curly-in-string": "error",
        "no-throw-literal": "error",
        "no-trailing-spaces": "error",
        "no-undef-init": "error",
        "no-underscore-dangle": "off",
        "no-unsafe-finally": "error",
        "no-unused-expressions": "error",
        "no-unused-labels": "error",
        "no-var": "error",
        "no-void": "off",
        "object-shorthand": "off",
        "one-var": [
            "off",
            "never"
        ],
        "padding-line-between-statements": [
            "off",
            "error",
            {
                "blankLine": "always",
                "prev": "*",
                "next": "return"
            }
        ],
        "prefer-arrow/prefer-arrow-functions": "off",
        "prefer-const": "off",
        "prefer-object-spread": "error",
        "prefer-readonly": "off",
        "prefer-template": "off",
        "quote-props": [
            "off",
            "as-needed"
        ],
        "radix": "error",
        "space-before-function-paren": "off",
        "space-in-parens": [
            "error",
            "never"
        ],
        "spaced-comment": [
            "error",
            "always",
            {
                "exceptions": ["-"]
            }
        ],
        "unicorn/filename-case": [
            "error",
            {
                cases: {
                    "camelCase": true,
                    // CONSIDER: Enforce a single case (e.g. camelCase).
                    "pascalCase": true
                }
            }
        ],
        "use-isnan": "error",
        "valid-typeof": "off",
        "yoda": "off"
    }
};
