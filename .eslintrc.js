module.exports = {
    root: true,
    env: {
        browser: true,
        es6: true,
    },
    parser: "vue-eslint-parser",
    parserOptions: {
        parser: "babel-eslint",
        ecmaVersion: 5,
        sourceType: "module",
    },
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/eslint-recommended",
        "plugin:@typescript-eslint/recommended",
    ],
    plugins: ["@typescript-eslint"],
    rules: {
        "func-names": 0,
        "no-nested-ternary": 0,
        "max-len": 0,
        "arrow-parens": ["error", "always"],
        "no-underscore-dangle": 0,
        "comma-dangle": [
            "error",
            {
                arrays: "always-multiline",
                objects: "always-multiline",
                imports: "always-multiline",
                exports: "always-multiline",
                functions: "never",
            },
        ],
        "no-use-before-define": ["error", "nofunc"],
        "no-empty": ["error", { allowEmptyCatch: true }],
        "no-mixed-operators": ["error", { allowSamePrecedence: true }],
        indent: ["error", 4, { flatTernaryExpressions: true, SwitchCase: 1 }],
        "@typescript-eslint/no-explicit-any": "warn",
        "@typescript-eslint/ban-ts-comment": "off",
    },
    overrides: [
        {
            files: ["**/*.ts", "**/*.tsx"],
            parser: "@typescript-eslint/parser",
            parserOptions: {
                ecmaVersion: 2020,
                sourceType: "module",
            },
        },
    ],
};
