const globals = require("globals");

const unicorn = require("eslint-plugin-unicorn");
const sonarjs = require("eslint-plugin-sonarjs");
const stylistic = require("@stylistic/eslint-plugin-js");
const htmlESLint = require("@html-eslint/eslint-plugin");
const html = require("eslint-plugin-html");

const tsParser = require("@typescript-eslint/parser");

const linterOptions = {
	reportUnusedDisableDirectives: "error"
}
const global = {
	...globals.browser
}

const rules = {
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
	"no-implicit-coercion": [2, {
		string: false
	}],
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
	"no-undef": [2, {
		typeof: true
	}],
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
	"no-shadow": [1, {
		builtinGlobals: false
	}],
	"no-self-compare": 2,
	"no-regex-spaces": 1,
	"no-constant-binary-expression": 2,
	"no-sequences": 2,
	"no-irregular-whitespace": [2, {
		skipRegExps: true
	}],
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
	"@stylistic/no-mixed-operators": [2, {
		groups: [["*", "/"], ["+", "-"]]
	}],
	"@stylistic/no-extra-semi": 1,
	"@stylistic/no-multi-spaces": 1,
	"@stylistic/no-mixed-spaces-and-tabs": 2,
	"@stylistic/no-floating-decimal": 2,
	"@stylistic/no-whitespace-before-property": 2,
	"@stylistic/no-trailing-spaces": 1,
	"@stylistic/max-statements-per-line": 1,
	"@stylistic/max-len": [1, {
		code: 200
	}],
	"@stylistic/quote-props": [2, "as-needed"],
	"@stylistic/quotes": [1, "double", {
		avoidEscape: false
	}],
	"@stylistic/padded-blocks": [2, "never"],
	"@stylistic/rest-spread-spacing": 2,
	"@stylistic/semi": 1,
	"@stylistic/space-before-blocks": [2, "never"],
	"@stylistic/space-before-function-paren": [2, {
		named: "never",
		anonymous: "never",
		asyncArrow: "always"
	}],
	"@stylistic/space-in-parens": 2,
	"@stylistic/space-unary-ops": 2,
	"@stylistic/yield-star-spacing": 2,

	"unicorn/error-message": 2,
	"unicorn/new-for-builtins": 2,
	"unicorn/consistent-empty-array-spread": 2,
	"unicorn/consistent-destructuring": 2,
	"unicorn/consistent-function-scoping": 2,
	"unicorn/no-array-method-this-argument": 2,
	"unicorn/no-lonely-if": 1,
	"unicorn/no-invalid-fetch-options": 2,
	"unicorn/no-instanceof-array": 2,
	"unicorn/no-magic-array-flat-depth": 2,
	"unicorn/no-nested-ternary": 2,
	"unicorn/no-new-buffer": 2,
	"unicorn/no-console-spaces": 2,
	"unicorn/no-for-loop": 2,
	"unicorn/no-useless-undefined": 2,
	"unicorn/no-unreadable-iife": 2,
	"unicorn/no-unnecessary-await": 2,
	"unicorn/no-unreadable-array-destructuring": 2,
	"unicorn/no-useless-switch-case": 2,
	"unicorn/no-typeof-undefined": 2,
	"unicorn/no-useless-fallback-in-spread": 2,
	"unicorn/no-useless-length-check": 2,
	"unicorn/no-useless-spread": 2,
	"unicorn/no-useless-promise-resolve-reject": 2,
	"unicorn/no-zero-fractions": 2,
	"unicorn/prefer-array-find": 1,
	"unicorn/prefer-array-index-of": 1,
	"unicorn/prefer-includes": 1,
	"unicorn/prefer-logical-operator-over-ternary": 1,
	"unicorn/prefer-date-now": 1,
	"unicorn/prefer-default-parameters": 1,
	"unicorn/prefer-array-some": 1,
	"unicorn/prefer-blob-reading-methods": 1,
	"unicorn/prefer-at": 1,
	"unicorn/prefer-optional-catch-binding": 1,
	"unicorn/prefer-regexp-test": 1,
	"unicorn/prefer-set-has": 1,
	"unicorn/prefer-set-size": 1,
	"unicorn/prefer-keyboard-event-key": 1,
	"unicorn/prefer-negative-index": 1,
	"unicorn/prefer-node-protocol": 1,
	"unicorn/prefer-number-properties": [1, {
		checkInfinity: true
	}],
	"unicorn/prefer-prototype-methods": 1,
	"unicorn/prefer-string-trim-start-end": 1,
	"unicorn/prefer-string-starts-ends-with": 1,
	"unicorn/prefer-structured-clone": 1,
	"unicorn/throw-new-error": 2,
	"unicorn/require-number-to-fixed-digits-argument": 2,
	"unicorn/switch-case-braces": [1, "avoid"],
	"unicorn/text-encoding-identifier-case": 2,
	"unicorn/no-await-in-promise-methods": 2,
	"unicorn/no-single-promise-in-promise-methods": 2,
	"unicorn/no-negation-in-equality-check": 2,
	"unicorn/no-length-as-slice-end": 2,

	"sonarjs/no-extra-arguments": 2,
	"sonarjs/no-empty-collection": 2,
	"sonarjs/no-element-overwrite": 2,
	"sonarjs/no-use-of-empty-return-value": 2,
	"sonarjs/no-all-duplicated-branches": 2,
	"sonarjs/no-ignored-return": 2,
	"sonarjs/no-identical-expressions": 2,
	"sonarjs/no-one-iteration-loop": 2,
	"sonarjs/non-existent-operator": 2,
	"sonarjs/no-redundant-boolean": 2,
	"sonarjs/no-unused-collection": 1,
	"sonarjs/prefer-immediate-return": 2,
	"sonarjs/no-inverted-boolean-check": 2,
	"sonarjs/no-redundant-jump": 2,
	"sonarjs/no-same-line-conditional": 2,
	"sonarjs/prefer-object-literal": 2,
	"sonarjs/no-collection-size-mischeck": 2,
	"sonarjs/prefer-while": 2,
	"sonarjs/no-gratuitous-expressions": 2,
	"sonarjs/no-duplicated-branches": 2
}

module.exports = [
	{
		linterOptions,
		languageOptions: {
			parser: tsParser,
			globals: global
		},
		files: ["webpage/*.ts"],
		ignores: ["!*.js", "!*.ts"],
		plugins: {
			unicorn,
			sonarjs,
			"@stylistic": stylistic
		},
		rules
	},{
		linterOptions,
		languageOptions: {
			parser: tsParser,
			globals: globals.node
		},
		files: ["*.js", "*.ts"],
		plugins: {
			unicorn,
			sonarjs,
			"@stylistic": stylistic
		},
		rules
	},{
		linterOptions,
		languageOptions: {
			globals: global,
			parser: require("@html-eslint/parser")
		},
		files: ["**/*.html"],
		plugins: {
			unicorn,
			sonarjs,
			"@stylistic": stylistic,
			"@html-eslint": htmlESLint,
			html
		},
		settings: {
			"html/html-extensions": [".html"]
		},
		rules: {
			...rules,

			"@html-eslint/require-meta-charset": 2,
			"@html-eslint/require-button-type": 2,
			"@html-eslint/no-restricted-attrs": 2,
			"@html-eslint/no-multiple-h1": 1,
			"@html-eslint/require-meta-description": 1,
			"@html-eslint/no-skip-heading-levels": 2,
			"@html-eslint/require-frame-title": 2,
			"@html-eslint/no-non-scalable-viewport": 2,
			"@html-eslint/no-positive-tabindex": 2,
			"@html-eslint/require-meta-viewport": 2,
			"@html-eslint/no-abstract-roles": 2,
			"@html-eslint/no-aria-hidden-body": 2,
			"@html-eslint/no-accesskey-attrs": 2,
			"@html-eslint/no-multiple-empty-lines": 2,
			"@html-eslint/no-trailing-spaces": 2,
			"@html-eslint/indent": [1, "tab"],
			"@html-eslint/no-duplicate-attrs": 2,
			"@html-eslint/no-inline-styles": 1,
			"@html-eslint/no-duplicate-id": 2,
			"@html-eslint/no-script-style-type": 2,
			"@html-eslint/require-li-container": 2,
			"@html-eslint/require-closing-tags": 2,
			"@html-eslint/require-doctype": 2,
			"@html-eslint/require-lang": 2,
			"@html-eslint/require-title": 2,
			"@html-eslint/no-extra-spacing-attrs": 2,
			"@html-eslint/quotes": 2,
			"@html-eslint/require-img-alt": 1
		}
	}
]
