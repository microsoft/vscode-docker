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
        "@typescript-eslint/tslint",
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
        "no-shadow": [
            "error",
            {
                "hoist": "all"
            }
        ],
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
        "yoda": "off",
        "@typescript-eslint/tslint/config": [
            "error",
            {
                "rules": {
                    "chai-prefer-contains-to-index-of": true,
                    "chai-vague-errors": true,
                    "encoding": true,
                    "export-name": true,
                    "import-spacing": true,
                    "informative-docs": true,
                    "insecure-random": true,
                    "jquery-deferred-must-complete": true,
                    "jsdoc-format": true,
                    "match-default-export-name": true,
                    "max-func-body-length": [
                        true,
                        100,
                        {
                            "ignore-parameters-to-function-regex": "^describe$"
                        }
                    ],
                    "mocha-avoid-only": true,
                    "mocha-no-side-effect-code": true,
                    "mocha-unneeded-done": true,
                    "no-cookies": true,
                    "no-delete-expression": true,
                    "no-disable-auto-sanitization": true,
                    "no-document-domain": true,
                    "no-document-write": true,
                    "no-dynamic-delete": true,
                    "no-exec-script": true,
                    "no-function-expression": true,
                    "no-http-string": [
                        true,
                        "http://www.example.com/?.*",
                        "http://localhost:?.*"
                    ],
                    "no-inner-html": true,
                    "no-jquery-raw-elements": true,
                    "no-redundant-jsdoc": true,
                    "no-reference-import": true,
                    "no-string-based-set-immediate": true,
                    "no-string-based-set-interval": true,
                    "no-string-based-set-timeout": true,
                    "no-typeof-undefined": true,
                    "no-unnecessary-callback-wrapper": true,
                    "no-unnecessary-field-initialization": true,
                    "no-unnecessary-override": true,
                    "no-unsafe-any": true,
                    "no-unsupported-browser-code": true,
                    "no-useless-files": true,
                    "no-with-statement": true,
                    "non-literal-fs-path": true,
                    "non-literal-require": true,
                    "number-literal-format": true,
                    "one-line": [
                        true,
                        "check-open-brace",
                        "check-catch",
                        "check-else",
                        "check-whitespace"
                    ],
                    "ordered-imports": true, // CONSIDER: Switching to import/order
                    "possible-timing-attack": true,
                    "prefer-array-literal": true,
                    "prefer-method-signature": true,
                    "prefer-while": true,
                    "promise-must-complete": true,
                    "react-a11y-anchors": true,
                    "react-a11y-aria-unsupported-elements": true,
                    "react-a11y-event-has-role": true,
                    "react-a11y-image-button-has-alt": true,
                    "react-a11y-img-has-alt": true,
                    "react-a11y-input-elements": true,
                    "react-a11y-lang": true,
                    "react-a11y-meta": true,
                    "react-a11y-no-onchange": true,
                    "react-a11y-props": true,
                    "react-a11y-proptypes": true,
                    "react-a11y-required": true,
                    "react-a11y-role": true,
                    "react-a11y-role-has-required-aria-props": true,
                    "react-a11y-role-supports-aria-props": true,
                    "react-a11y-tabindex-no-positive": true,
                    "react-a11y-titles": true,
                    "react-anchor-blank-noopener": true,
                    "react-iframe-missing-sandbox": true,
                    "react-no-dangerous-html": true,
                    "react-this-binding-issue": true,
                    "react-unused-props-and-state": true,
                    "switch-final-break": true,
                    "typedef": [
                        true,
                        "call-signature",
                        "parameter",
                        "property-declaration",
                        "member-variable-declaration"
                    ],
                    "underscore-consistent-invocation": true,
                    "use-named-parameter": true,
                    "use-simple-attributes": true,
                    "whitespace": [
                        true,
                        "check-branch",
                        "check-decl",
                        "check-operator",
                        "check-separator",
                        "check-type"
                    ]
                },
                "rulesDirectory": ["node_modules/tslint-microsoft-contrib"]
            }
        ]
    }
};
