// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import html from "@html-eslint/eslint-plugin";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.stylisticTypeChecked,
  html.configs["flat/recommended"],
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    files: ["**/*.ts", "**/*.html"],
    rules: {
      "array-callback-return": 2,
      "block-scoped-var": 2,
      "default-case-last": 2,
      "default-param-last": 1,
      "dot-notation": 1,
      "func-name-matching": 2,
      "func-style": 0,
      "no-array-constructor": 2,
      "no-compare-neg-zero": 2,
      "no-const-assign": 2,
      "no-constructor-return": 2,
      "no-dupe-args": 1,
      "no-dupe-keys": 2,
      "no-duplicate-case": 2,
      "no-div-regex": 2,
      "no-eq-null": 2,
      "no-extra-boolean-cast": 2,
      "no-extra-bind": 2,
      "no-extend-native": 2,
      "no-empty-pattern": 2,
      "no-duplicate-imports": 2,
      "no-fallthrough": 2,
      "no-func-assign": 2,
      "no-import-assign": 2,
      "no-invalid-regexp": 2,
      "no-invalid-this": 2,
      "no-implicit-coercion": [
        2,
        {
          string: false,
        },
      ],
      "no-implied-eval": 2,
      "no-loss-of-precision": 2,
      "no-multi-assign": 1,
      "no-negated-condition": 1,
      "no-new-native-nonconstructor": 2,
      "no-new-object": 2,
      "no-obj-calls": 2,
      "no-self-assign": 2,
      "no-unreachable": 1,
      "no-unreachable-loop": 1,
      "no-unsafe-finally": 2,
      "no-unused-vars": 1,
      "no-useless-computed-key": 2,
      "no-useless-rename": 1,
      "no-useless-escape": 1,
      "no-unused-expressions": 1,
      "no-useless-return": 1,
      "no-useless-call": 2,
      "no-use-before-define": 0,
      "no-useless-concat": 1,
      "no-useless-backreference": 1,
      "no-useless-catch": 1,
      "no-unneeded-ternary": 1,
      "no-undef": [
        2,
        {
          typeof: true,
        },
      ],
      "no-undef-init": 2,
      "no-useless-constructor": 1,
      "no-redeclare": 1,
      "no-shadow-restricted-names": 2,
      "no-empty-static-block": 1,
      "no-throw-literal": 2,
      "no-template-curly-in-string": 1,
      "no-unsafe-optional-chaining": 2,
      "no-unmodified-loop-condition": 1,
      "no-promise-executor-return": 2,
      "no-warning-comments": 1,
      "no-var": 1,
      "no-new-func": 2,
      "no-new-wrappers": 2,
      "no-multi-str": 2,
      "no-shadow": [
        1,
        {
          builtinGlobals: false,
        },
      ],
      "no-self-compare": 2,
      "no-regex-spaces": 1,
      "no-constant-binary-expression": 2,
      "no-sequences": 2,
      "no-irregular-whitespace": [
        2,
        {
          skipRegExps: true,
        },
      ],
      "no-constant-condition": 1,
      "no-unsafe-negation": 2,
      "no-lone-blocks": 2,
      "object-shorthand": 1,
      "prefer-arrow-callback": 1,
      "prefer-const": 1,
      "use-isnan": 1,
      "valid-typeof": 2,
      yoda: 2,

      "@stylistic/array-bracket-spacing": 2,
      "@stylistic/arrow-parens": [2, "as-needed"],
      "@stylistic/arrow-spacing": [2, { before: false, after: false }],
      "@stylistic/block-spacing": [2, "never"],
      "@stylistic/brace-style": 1,
      "@stylistic/comma-style": 2,
      "@stylistic/computed-property-spacing": 2,
      "@stylistic/dot-location": [2, "property"],
      "@stylistic/function-call-spacing": 2,
      "@stylistic/generator-star-spacing": 2,
      "@stylistic/key-spacing": 2,
      "@stylistic/indent": [1, "tab"],
      "@stylistic/keyword-spacing": [1, { before: false, after: false }],
      "@stylistic/new-parens": 2,
      "@stylistic/no-mixed-operators": [
        2,
        {
          groups: [
            ["*", "/"],
            ["+", "-"],
          ],
        },
      ],
      "@stylistic/no-extra-semi": 1,
      "@stylistic/no-multi-spaces": 1,
      "@stylistic/no-mixed-spaces-and-tabs": 2,
      "@stylistic/no-floating-decimal": 2,
      "@stylistic/no-whitespace-before-property": 2,
      "@stylistic/no-trailing-spaces": 1,
      "@stylistic/max-statements-per-line": 1,
      "@stylistic/max-len": [
        1,
        {
          code: 200,
        },
      ],
      "@stylistic/quote-props": [2, "as-needed"],
      "@stylistic/quotes": [
        1,
        "double",
        {
          avoidEscape: false,
        },
      ],
      "@stylistic/padded-blocks": [2, "never"],
      "@stylistic/rest-spread-spacing": 2,
      "@stylistic/semi": 1,
      "@stylistic/space-before-blocks": [2, "never"],
      "@stylistic/space-before-function-paren": [
        2,
        {
          named: "never",
          anonymous: "never",
          asyncArrow: "always",
        },
      ],
      "@stylistic/space-in-parens": 2,
      "@stylistic/space-unary-ops": 2,
      "@stylistic/yield-star-spacing": 2,
    },
  }
);
