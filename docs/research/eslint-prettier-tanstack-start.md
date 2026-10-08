# ESLint + Prettier for a TanStack Start / Vercel / Neon / Clerk / Tailwind app (strict, AI-agent-proof)

Research date: **2026-10-08**. Every version number below comes from the npm registry on that date (`npm view <pkg> version`). Every claim links to the source that owns it. Anything I could not confirm against a primary source is marked **UNVERIFIED**.

> **Stack changes since this was written (2026-10-08):**
> - Auth moved from Clerk to Neon Auth. The Clerk notes below no longer apply; no Neon lint plugin exists.
> - No ORM has been chosen. The `eslint-plugin-drizzle` lines (install, config, ignores) apply only if Drizzle is picked, and that choice needs an ADR. Leave them out until then.

Method: I read official docs (eslint.org, typescript-eslint.io, prettier.io, tanstack.com, react.dev, typescriptlang.org, devblogs.microsoft.com, biomejs.dev, oxc.rs, pnpm.io, vite.dev). I also downloaded the published npm tarballs with `npm pack` (no install) and read their source. That is how rule names, preset contents, and peer ranges were checked. **None of the configs below have been executed** (the brief did not allow installs). Run them once and fix anything that breaks before relying on them.

---

## TL;DR recommendation

1. **Use ESLint 10 (flat config) with typed linting, plus Prettier 3 for formatting.** Don't use Biome or oxlint as the main tool yet. Neither can currently run the TanStack Query/Router rules or React's compiler-backed hooks rules, and Biome's type-aware rules are still incomplete (see [Alternatives](#alternatives-considered-and-why-not)).
2. **Pin TypeScript 6 for linting and use TypeScript 7 for `tsc`.** typescript-eslint 8.71.1 declares `typescript >=4.8.4 <6.1.0` ([package.json](https://github.com/typescript-eslint/typescript-eslint/blob/main/packages/typescript-eslint/package.json)). TS 7.0 "does not ship with an API", and Microsoft says to install it side by side via npm aliases "for utilities that still need some programmatic access to the compiler (such as typescript-eslint)" ([TS 7.0 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6.0)). If you install `typescript@latest` (7.0.2) on its own, the typed-linting setup breaks ([typescript-eslint#12518](https://github.com/typescript-eslint/typescript-eslint/issues/12518)).
3. **Rule stack:**
   - `@eslint/js` recommended
   - `typescript-eslint` **`strictTypeChecked` + `stylisticTypeChecked`**, using `projectService`
   - `eslint-plugin-react-hooks` 7 (React's compiler-backed rules)
   - `@eslint-react/eslint-plugin` `strict-type-checked`, with the rules that duplicate react-hooks turned off
   - `eslint-plugin-jsx-a11y`
   - TanStack's official `@tanstack/eslint-plugin-router` and `@tanstack/eslint-plugin-query`
   - `eslint-plugin-import-x` (cycles, extraneous deps, order)
   - `eslint-plugin-unicorn` `unopinionated`
   - `eslint-plugin-better-tailwindcss` (correctness rules only)
   - `eslint-plugin-drizzle` (`delete`/`update` without `.where()`)
   - `@eslint-community/eslint-plugin-eslint-comments` (no blanket disables)
   - `eslint-config-prettier/flat` **last**
4. **Prettier:** use the defaults plus `prettier-plugin-tailwindcss` with `tailwindStylesheet`. Don't use `eslint-plugin-prettier`; Prettier itself says such plugins are "generally not recommended" ([Prettier docs](https://prettier.io/docs/integrating-with-linters)). Run `prettier --check` in CI instead.
5. **tsconfig:** start from the TanStack Start scaffold and add `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noImplicitReturns`, `noPropertyAccessFromIndexSignature`, `erasableSyntaxOnly`, `isolatedModules`. **Keep `verbatimModuleSyntax: false`**: TanStack Start warns it "can result in server bundles leaking into client bundles" ([TanStack Start docs](https://tanstack.com/start/latest/docs/framework/react/build-from-scratch)). Use `@typescript-eslint/consistent-type-imports` to get type-import hygiene instead.
6. **One gate for agents:** `pnpm check` = `tsc` (TS 7) + `eslint --max-warnings 0` + `prettier --check .`. Use pnpm, because two plugins still have stale ESLint peer ranges (see [Open questions](#open-questions--unverified)).

---

## What TanStack itself ships (verified from source)

### Official TanStack ESLint packages

| Package | Version (2026-10-08) | Rules | Flat config |
|---|---|---|---|
| [`@tanstack/eslint-plugin-router`](https://tanstack.com/router/latest/docs/eslint/eslint-plugin-router) | 1.162.0 | `create-route-property-order` (warn), `route-param-names` (error) | `pluginRouter.configs['flat/recommended']` |
| [`@tanstack/eslint-plugin-query`](https://tanstack.com/query/latest/docs/eslint/eslint-plugin-query) | 5.104.1 | `exhaustive-deps`, `no-rest-destructuring` (warn), `stable-query-client`, `no-unstable-deps`, `infinite-query-property-order`, `no-void-query-fn`, `mutation-property-order`; `recommended-strict` adds `prefer-query-options` | `pluginQuery.configs['flat/recommended']` / `['flat/recommended-strict']` |
| [`@tanstack/eslint-plugin-start`](https://tanstack.com/start/latest/docs/eslint/eslint-plugin-start) | 0.1.0 | `no-client-code-in-server-component`, `no-async-client-component` (Server Components boundary rules) | `pluginStart.configs['flat/recommended']` |
| [`@tanstack/eslint-config`](https://www.npmjs.com/package/@tanstack/eslint-config) | 0.4.0 | Shared config used by TanStack's own repos (see below) | `tanstackConfig` array |

Notes:
- **Router docs are behind the package.** The docs page lists only `create-route-property-order` ([docs](https://tanstack.com/router/latest/docs/eslint/eslint-plugin-router)). The 1.162.0 tarball's `src/index.ts` also enables `route-param-names` ("Ensure route param names are valid JavaScript identifiers") in `flat/recommended`.
- **Why property order matters:** "For the following functions, the property order of the passed in object matters due to type inference" ([create-route-property-order](https://tanstack.com/router/latest/docs/eslint/create-route-property-order)). The required order is `params`/`validateSearch` → `loaderDeps`/… → `context` → `beforeLoad` → `loader` → the rest. An LLM won't know this, and getting it wrong silently breaks inference.
- **TanStack Router documents an `only-throw-error` exception.** `@typescript-eslint/only-throw-error` (on in `strict-type-checked`) flags `throw redirect()` and `throw notFound()`. TanStack says to "allow `redirect` and `notFound` as throwable objects" by allowlisting `Redirect` and `NotFoundError` from `@tanstack/router-core` ([TanStack Router ESLint docs](https://tanstack.com/router/latest/docs/eslint/eslint-plugin-router)). The types confirm the reason: in `@tanstack/router-core@1.171.34`, `Redirect = Response & {...}` and `NotFoundError` is a plain object type. Neither is an `Error`.
- **Query plugin source is in the tarball** (`src/index.ts`), which is where the rule-to-preset mapping above comes from. The docs page does not show that mapping.
- **`@tanstack/eslint-plugin-start` peer range is `eslint ^8.57.0 || ^9.0.0`** (npm). It does not cover ESLint 10, and the rules only matter if you use Start's Server Components helpers (`renderServerComponent`, `createCompositeComponent`). I left it commented out in the config.

### What the official scaffold generates today

- The documented create command is `npx @tanstack/cli@latest create`. You are "prompted to choose your package manager and optional add-ons like Tailwind CSS and ESLint" ([Quick start](https://tanstack.com/start/latest/docs/framework/react/quick-start)).
- Source of `@tanstack/cli@0.71.1` → `@tanstack/create@0.70.1` (`dist/ui-prompts.js`, `selectToolchain`): the **"Select toolchain" prompt defaults to "None"**. The options are **ESLint** ("ESLint + Prettier toolchain support") and **Biome**. You can also pass `--toolchain <eslint|biome>` or `--no-toolchain`.
- The **ESLint toolchain** template (`dist/frameworks/react/toolchains/eslint/`) writes:
  - `eslint.config.js` = `...tanstackConfig` with `import/no-cycle`, `import/order`, `sort-imports`, `@typescript-eslint/array-type`, `@typescript-eslint/require-await`, `pnpm/json-enforce-catalog` turned **off**
  - `prettier.config.js` = `{ semi: false, singleQuote: true, trailingComma: "all" }`
  - `.prettierignore` = the three lockfiles
  - devDeps `@tanstack/eslint-config@latest`, **`eslint@^9.20.0`**, `prettier@^3.8.1`
  - scripts `lint: "eslint"`, `format: "prettier --write . && eslint --fix"`, `check: "prettier --check ."`
- The **Biome toolchain** template writes `biome.json` with `recommended: true`, tab indentation, double quotes, and organize-imports, and pins `@biomejs/biome@2.4.5`.
- The scaffold's `tsconfig.json.ejs` has `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `noUncheckedSideEffectImports`, `moduleResolution: "bundler"`, `types: ["vite/client"]`, paths `#/*` and `@/*`. It sets **`verbatimModuleSyntax` to `false` whenever Start is enabled** (`addOnEnabled['start'] ? 'false' : 'true'`).
- **What `@tanstack/eslint-config@0.4.0` actually contains** (`src/*.ts`): about 45 core JS correctness rules, a small set of typescript-eslint rules (`consistent-type-imports`, `no-unnecessary-condition`, `ban-ts-comment`, `naming-convention` for type parameters, etc.), `import-x` rules (`order`, `no-duplicates`, `no-commonjs`, …), `node/prefer-node-protocol`, and `@stylistic/spaced-comment`. It parses with `project: true`, not `projectService`. It has **no React, hooks, a11y, `no-floating-promises`, or `no-misused-promises` rules**. It is a library-repo config, not a strict app config. **Conclusion: use TanStack's plugins, not TanStack's shared config.**

---

## Copy-paste files

### 1. Install (pnpm, versions current as of 2026-10-08)

```bash
# TypeScript: TS 6 under the name `typescript` (what typescript-eslint imports),
# TS 7 under an alias so `tsc` is the fast native compiler.
# Recipe from https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6.0
pnpm add -D typescript@npm:@typescript/typescript6@^6.0.2 @typescript/native@npm:typescript@^7.0.2

pnpm add -D \
  eslint@10.12.0 \
  @eslint/js@10.0.1 \
  typescript-eslint@8.71.1 \
  globals@17.13.0 \
  eslint-plugin-react-hooks@7.1.1 \
  @eslint-react/eslint-plugin@5.24.9 \
  eslint-plugin-jsx-a11y@6.10.2 \
  @tanstack/eslint-plugin-router@1.162.0 \
  @tanstack/eslint-plugin-query@5.104.1 \
  eslint-plugin-import-x@4.17.1 \
  eslint-import-resolver-typescript@4.4.5 \
  eslint-plugin-unicorn@77.0.0 \
  eslint-plugin-better-tailwindcss@4.9.0 \
  eslint-plugin-drizzle@0.2.3 \
  @eslint-community/eslint-plugin-eslint-comments@4.8.1 \
  eslint-config-prettier@10.1.8 \
  prettier@3.9.9 \
  prettier-plugin-tailwindcss@0.8.1
```

Pin exact versions, at least for `typescript-eslint`. Its `strict-type-checked` preset "is not considered 'stable' under Semantic Versioning", and its rules and options "may change outside of major version updates" ([typescript-eslint configs](https://typescript-eslint.io/users/configs)).

Peer-range caveats (from `npm view <pkg> peerDependencies`):
- `eslint-plugin-jsx-a11y@6.10.2` declares `eslint ^3 … || ^9` and hasn't been published since 2024-10-26. ESLint 10 support is tracked in the open issue [jsx-a11y#1075](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/issues/1075). pnpm's `strictPeerDependencies` "Default: **false**" ([pnpm docs](https://pnpm.io/settings/peer-dependencies)), so pnpm warns instead of failing. To silence the warning, add this to `pnpm-workspace.yaml`:

  ```yaml
  peerDependencyRules:
    allowedVersions:
      eslint: "10"
  ```
- With npm instead of pnpm, the same mismatch produces `ERESOLVE` (as reported in [typescript-eslint#12518](https://github.com/typescript-eslint/typescript-eslint/issues/12518) for the TS case), so you'd need `--legacy-peer-deps`. That is why I recommend pnpm.
- Node: `eslint-plugin-unicorn@77` needs `node >=22` and `eslint >=10.4`. `@eslint-react/eslint-plugin@5` needs `node >=22.0.0` and its README says "ESLint: 10.3.0" minimum. Run lint on Node 22+ (24 is the current LTS per the [ESLint v10 release post](https://eslint.org/blog/2026/02/eslint-v10.0.0-released/)).

### 2. `eslint.config.js`

I chose plain `.js` with `// @ts-check`, as the TanStack scaffold does. An `eslint.config.ts` would need `jiti` (>= 2.2.0) on Node, or an experimental flag ([ESLint docs](https://eslint.org/docs/latest/use/configure/configuration-files)).

```js
// @ts-check
import { fileURLToPath } from 'node:url'

import eslintJs from '@eslint/js'
import eslintComments from '@eslint-community/eslint-plugin-eslint-comments/configs'
import eslintReact from '@eslint-react/eslint-plugin'
import pluginQuery from '@tanstack/eslint-plugin-query'
import pluginRouter from '@tanstack/eslint-plugin-router'
// import pluginStart from '@tanstack/eslint-plugin-start' // only if you use Start Server Components; peer range is still eslint ^9
import eslintConfigPrettier from 'eslint-config-prettier/flat'
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript'
import betterTailwind from 'eslint-plugin-better-tailwindcss'
import drizzle from 'eslint-plugin-drizzle'
import { importX } from 'eslint-plugin-import-x'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'
import unicorn from 'eslint-plugin-unicorn'
import { defineConfig, globalIgnores, includeIgnoreFile } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const gitignorePath = fileURLToPath(new URL('.gitignore', import.meta.url))

export default defineConfig([
  includeIgnoreFile(gitignorePath, { gitignoreResolution: true }),
  globalIgnores([
    'src/routeTree.gen.ts', // generated by TanStack Router
    '.output/**',
    '.vercel/**',
    '.nitro/**',
    '.tanstack/**',
    'dist/**',
    'drizzle/**', // drizzle-kit generated migrations
  ]),

  {
    name: 'app/linter-options',
    linterOptions: {
      reportUnusedDisableDirectives: 'error', // default is "warn"
      reportUnusedInlineConfigs: 'error', // default is "off"
    },
  },

  // Plain JS (config files): no type information, no type-aware plugins.
  {
    name: 'app/javascript',
    files: ['**/*.{js,mjs,cjs}'],
    extends: [eslintJs.configs.recommended],
    languageOptions: { globals: globals.node },
  },

  // Application TypeScript: everything type-aware lives here.
  {
    name: 'app/typescript',
    files: ['**/*.{ts,tsx}'],
    extends: [
      eslintJs.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      eslintReact.configs['strict-type-checked'],
      reactHooks.configs.flat.recommended,
      jsxA11y.flatConfigs.recommended,
      unicorn.configs.unopinionated,
      pluginRouter.configs['flat/recommended'],
      pluginQuery.configs['flat/recommended-strict'],
      // pluginStart.configs['flat/recommended'],
      betterTailwind.configs.correctness,
      eslintComments.recommended,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'import-x': importX,
      drizzle,
    },
    settings: {
      'import-x/resolver-next': [createTypeScriptImportResolver({ alwaysTryTypes: true })],
      'import-x/internal-regex': '^(#|@)/', // scaffold aliases "#/*" and "@/*"
      'better-tailwindcss': {
        entryPoint: 'src/styles.css', // Tailwind v4 CSS entry (TanStack scaffold path)
      },
    },
    rules: {
      // ---- typescript-eslint: tighten beyond strict-type-checked ----
      '@typescript-eslint/switch-exhaustiveness-check': ['error', { requireDefaultForNonUnion: true }],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/no-unsafe-type-assertion': 'error',
      '@typescript-eslint/strict-boolean-expressions': [
        'error',
        { allowNullableBoolean: true, allowNullableString: true, allowNumber: false },
      ],
      '@typescript-eslint/require-array-sort-compare': ['error', { ignoreStringArrays: true }],
      '@typescript-eslint/promise-function-async': 'error',
      // ---- typescript-eslint: loosen where strict is noisy for React ----
      // NOTE: passing options replaces the preset's options object, so repeat the strict values.
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        {
          allowAny: false,
          allowBoolean: false,
          allowNever: false,
          allowNullish: false,
          allowRegExp: false,
          allowNumber: true,
        },
      ],
      '@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
      // ---- TanStack Router: redirect()/notFound() are thrown by design ----
      '@typescript-eslint/only-throw-error': [
        'error',
        {
          allow: [
            { from: 'package', package: '@tanstack/router-core', name: 'Redirect' },
            { from: 'package', package: '@tanstack/router-core', name: 'NotFoundError' },
          ],
        },
      ],

      // ---- React: keep react-hooks (React team, compiler-backed) as the source of truth ----
      // Turn off @eslint-react rules that duplicate eslint-plugin-react-hooks.
      '@eslint-react/rules-of-hooks': 'off',
      '@eslint-react/exhaustive-deps': 'off',
      '@eslint-react/error-boundaries': 'off',
      '@eslint-react/set-state-in-effect': 'off',
      '@eslint-react/set-state-in-render': 'off',
      '@eslint-react/unsupported-syntax': 'off',
      '@eslint-react/use-memo': 'off',
      '@eslint-react/globals': 'off',
      '@eslint-react/immutability': 'off',
      '@eslint-react/purity': 'off',
      '@eslint-react/refs': 'off',
      '@eslint-react/static-components': 'off',
      'react-hooks/exhaustive-deps': 'error', // preset default is "warn"

      // ---- imports (import-x). TS already covers named/namespace/default/no-unresolved. ----
      'import-x/no-cycle': 'error',
      'import-x/no-self-import': 'error',
      'import-x/no-useless-path-segments': 'error',
      'import-x/no-duplicates': 'error',
      'import-x/no-mutable-exports': 'error',
      'import-x/first': 'error',
      'import-x/newline-after-import': 'error',
      'import-x/consistent-type-specifier-style': ['error', 'prefer-top-level'],
      'import-x/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: [
            '**/*.config.{js,ts}',
            '**/*.{test,spec}.{ts,tsx}',
            'drizzle.config.ts',
          ],
        },
      ],
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'type'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],

      // ---- Drizzle: never run an unscoped DELETE/UPDATE ----
      'drizzle/enforce-delete-with-where': ['error', { drizzleObjectName: ['db', 'tx'] }],
      'drizzle/enforce-update-with-where': ['error', { drizzleObjectName: ['db', 'tx'] }],

      // ---- Tailwind v4: catch v3-era classes an LLM remembers ----
      'better-tailwindcss/no-deprecated-classes': 'error',

      // ---- disable comments must explain themselves ----
      '@eslint-community/eslint-comments/require-description': 'error',
      '@eslint-community/eslint-comments/no-unused-disable': 'error',

      // ---- core ----
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-param-reassign': 'error',
      'object-shorthand': 'error',
    },
  },

  // Must be last among rule-setting configs: turns off formatting rules Prettier owns.
  eslintConfigPrettier,

  // Re-enable `curly` after eslint-config-prettier ("all" is Prettier-safe per its README).
  { name: 'app/after-prettier', rules: { curly: ['error', 'all'] } },
])
```

`package.json` scripts:

```jsonc
{
  "scripts": {
    "typecheck": "tsc --noEmit",           // TS 7 native `tsc` from the @typescript/native alias
    "lint": "eslint --max-warnings 0",
    "lint:fix": "eslint --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "check": "pnpm typecheck && pnpm lint && pnpm format:check"
  }
}
```

### 3. `prettier.config.js`

```js
// @ts-check

/** @type {import('prettier').Config & import('prettier-plugin-tailwindcss').PluginOptions} */
const config = {
  // Same three options the TanStack scaffold writes; they also match the
  // route generator's defaults (quoteStyle "single", semicolons false), so
  // generator-created route files don't churn on the first format.
  semi: false,
  singleQuote: true,
  trailingComma: 'all',

  plugins: ['prettier-plugin-tailwindcss'], // must be the LAST plugin if you add others
  tailwindStylesheet: './src/styles.css', // Tailwind v4 entry; resolved relative to this file
  tailwindFunctions: ['cn', 'clsx', 'cva', 'twMerge'],
}

export default config
```

### 4. `.prettierignore`

```gitignore
# Prettier already skips VCS dirs and node_modules, and follows .gitignore.
pnpm-lock.yaml
package-lock.json
yarn.lock

# Generated
src/routeTree.gen.ts
drizzle/meta/

# Build / deploy output
.output/
.vercel/
.nitro/
.tanstack/
dist/
coverage/
```

### 5. `tsconfig.json`

```jsonc
{
  "include": ["**/*.ts", "**/*.tsx"],
  "compilerOptions": {
    // --- from the TanStack Start scaffold ---
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "types": ["vite/client"],           // TS 7 defaults `types` to [] - must be explicit
    "paths": { "#/*": ["./src/*"], "@/*": ["./src/*"] },
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "skipLibCheck": true,
    "verbatimModuleSyntax": false,      // TanStack Start: true can leak server code into client bundles
    "isolatedModules": true,            // Vite: "Should be set to true"

    // --- strictness ---
    "strict": true,                      // default true since TS 6.0, kept explicit
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,  // see Open questions: library-typing friction is UNVERIFIED
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noUncheckedSideEffectImports": true,
    "erasableSyntaxOnly": true,          // bans enums/namespaces/parameter properties
    "forceConsistentCasingInFileNames": true,
    "allowUnreachableCode": false,
    "allowUnusedLabels": false
  }
}
```

---

## Rationale, by group (and why each helps AI-written code)

### ESLint 10, flat config, `defineConfig`
- ESLint 10 "completely removed" eslintrc. It looks up `eslint.config.*` starting from each linted file's directory. It also removed `context.getFilename()`/`getSourceCode()`, which breaks older plugins ([ESLint v10.0.0 release](https://eslint.org/blog/2026/02/eslint-v10.0.0-released/)). Latest is **10.12.0**. The 9.x line (9.39.5) is tagged `maintenance` on npm.
- `defineConfig`, `globalIgnores`, and `includeIgnoreFile` all come from `eslint/config`. `includeIgnoreFile(path, { gitignoreResolution: true })` interprets patterns relative to the `.gitignore` ([ESLint ignore docs](https://eslint.org/docs/latest/use/configure/ignore)).
- `tseslint.config()` "was deprecated in favor of ESLint core's" `defineConfig` ([typescript-eslint package docs](https://typescript-eslint.io/packages/typescript-eslint)).
- `reportUnusedDisableDirectives` "defaults to `"warn"`" and `reportUnusedInlineConfigs` "defaults to `"off"`" ([ESLint rule config docs](https://eslint.org/docs/latest/use/configure/rules)). Both are raised to `error` here. **AI angle:** agents add `eslint-disable` to get green. Making stale or blanket disables fail, together with `eslint-comments/require-description`, `no-unlimited-disable` (in its `recommended`), and unicorn's `no-abusive-eslint-disable` (in `unopinionated`), forces each suppression to be specific and justified.

### typescript-eslint: `strictTypeChecked` + `stylisticTypeChecked`, typed via `projectService`
- `strict-type-checked` "Contains all of `recommended`, `recommended-type-checked`, and `strict`, along with additional strict rules that require type information". typescript-eslint suggests it "only if a nontrivial percentage of its developers are highly proficient in TypeScript" ([configs](https://typescript-eslint.io/users/configs)). An AI agent fits that profile and is far less bothered by strict feedback than a human, so take the strict tier.
- `projectService: true` is the recommended typed-linting setup ([typed linting](https://typescript-eslint.io/getting-started/typed-linting)). `tsconfigRootDir: import.meta.dirname` is the parser docs' workaround for edge cases ([parser docs](https://typescript-eslint.io/packages/parser)).
- Type-aware configs are scoped to `**/*.{ts,tsx}`. JS config files get only `@eslint/js`, so they don't need a tsconfig entry. That's simpler than `disableTypeChecked`, which only turns off typescript-eslint's own typed rules (it sets `projectService: false`; see `disable-type-checked.js` in the 8.71.1 tarball) and would leave `@eslint-react`'s typed rules running.
- Rules that matter most for LLM output. Everything below was confirmed in the 8.71.1 `strict-type-checked.js` unless marked "added":
  - [`no-floating-promises`](https://typescript-eslint.io/rules/no-floating-promises) and [`no-misused-promises`](https://typescript-eslint.io/rules/no-misused-promises): un-awaited `router.invalidate()`, `navigate()`, `queryClient.invalidateQueries()`, or Drizzle calls, and async handlers in void slots. This is the most common class of LLM async bug. I kept `checksVoidReturn.attributes` on (its default). Turning it off "Disables checking an asynchronous function passed as a JSX attribute"; relax it if `onClick={async …}` noise is too much.
  - [`no-unnecessary-condition`](https://typescript-eslint.io/rules/no-unnecessary-condition): catches defensive `?.`/`??` on non-nullable values, a hallmark of generated code. It reads `noUncheckedIndexedAccess` from your tsconfig.
  - `no-unsafe-*` family plus `no-explicit-any`: stops `any` from leaking through `JSON.parse`, `fetch().json()`, or untyped catch variables.
  - **Added** [`no-unsafe-type-assertion`](https://typescript-eslint.io/rules/no-unsafe-type-assertion) ("Disallow type assertions that narrow a type"): models silence type errors with `as Foo`. This forces a real narrowing or a schema parse instead.
  - **Added** [`switch-exhaustiveness-check`](https://typescript-eslint.io/rules/switch-exhaustiveness-check): not in any preset (absent from `strict-type-checked.js`). Its defaults are `allowDefaultCaseForExhaustiveSwitch: true`, `considerDefaultExhaustiveForUnions: false`, `requireDefaultForNonUnion: false`. When you add a union member, every switch that doesn't handle it fails to lint.
  - **Added** [`consistent-type-imports`](https://typescript-eslint.io/rules/consistent-type-imports) plus `no-import-type-side-effects` plus `import-x/consistent-type-specifier-style: prefer-top-level`. The defaults are `prefer: 'type-imports'` and `fixStyle: 'separate-type-imports'`. typescript-eslint warns that this rule plus `verbatimModuleSyntax` "can lead to conflicting and/or duplicate reports". That's moot here, because TanStack Start wants `verbatimModuleSyntax` off, so the lint rule is how we keep imports type-clean.
  - **Added** [`strict-boolean-expressions`](https://typescript-eslint.io/rules/strict-boolean-expressions) with `allowNumber: false`: catches `if (items.length)`-style coercions and `0`-renders. Its defaults are `allowString: true`, `allowNumber: true`, `allowNullableObject: true`, other nullable variants `false`. I relaxed nullable booleans and strings, which are common and low-risk.
  - [`only-throw-error`](https://typescript-eslint.io/rules/only-throw-error): kept, with the TanStack allowlist (see above).
  - [`restrict-template-expressions`](https://typescript-eslint.io/rules/restrict-template-expressions): strict sets every `allow*` to `false`. The rule's own defaults are looser (`allowAny/Boolean/Nullish/RegExp/Number: true`), so **overriding with `{ allowNumber: true }` alone would silently loosen the others**. The config repeats them all.
  - [`no-confusing-void-expression`](https://typescript-eslint.io/rules/no-confusing-void-expression) with `ignoreArrowShorthand: true`, so `onClick={() => setOpen(true)}` stays legal.
  - `@typescript-eslint/dot-notation` (stylistic-type-checked) automatically respects `noPropertyAccessFromIndexSignature` (source: `dot-notation.js` checks the compiler option), so the two don't fight.
- Considered and rejected: `explicit-module-boundary-types` and `explicit-function-return-type`. TanStack's API is built on inference (`createFileRoute(...)({ loader })`, `createServerFn().handler(...)`, `queryOptions`), and forced annotations push agents to write wrong, widened types. This is a judgment call, not a sourced fact.

### React: `eslint-plugin-react-hooks` 7 + `@eslint-react/eslint-plugin` 5
- `eslint-plugin-react-hooks@7.1.1` is React's own plugin. Flat setup is `reactHooks.configs.flat.recommended`, and `recommended-latest` adds experimental rules ([README in tarball / npm](https://www.npmjs.com/package/eslint-plugin-react-hooks)). It ships the React Compiler-derived rules (`purity`, `refs`, `immutability`, `set-state-in-effect`, `set-state-in-render`, `static-components`, `globals`, `error-boundaries`, `use-memo`, `unsupported-syntax`, `incompatible-library`, `preserve-manual-memoization`, `config`, `gating`) on top of `rules-of-hooks` and `exhaustive-deps`. It "can be used without adopting the compiler" ([react.dev](https://react.dev/reference/eslint-plugin-react-hooks)). Its peer range includes `^10.0.0`.
  - Discrepancy: react.dev still lists `component-hook-factories`, but in 7.1.1 that key is `makeDeprecatedRule('7.1.0')`. In the source, `recommended-latest` adds only `void-use-memo`.
  - **AI angle:** LLMs routinely write impure renders, `setState` in effects, and components defined inside components. These rules are the authoritative check for that, and they also make code safe to adopt the compiler later (the scaffold has a `compiler` add-on).
- `@eslint-react/eslint-plugin@5.24.9` covers what react-hooks doesn't: JSX, DOM, Web API leak detection, and the type-aware [`no-leaked-conditional-rendering`](https://eslint-react.xyz/docs/presets), which catches `{count && <X/>}` rendering `0`. Its presets are `recommended`, `strict`, `recommended-typescript`, `recommended-type-checked`, `strict-typescript`, `strict-type-checked`, and `disable-*`/`off`. In the source, `strict-type-checked` = `strict` + `no-leaked-conditional-rendering: error` + `no-unused-props: warn`.
  - It also re-implements the hooks rules. Its migration guide maps 12 of them as equivalents, and says 4 (`config`, `gating`, `incompatible-library`, `preserve-manual-memoization`) "do not have equivalents" ([migration guide](https://eslint-react.xyz/docs/migrating-from-eslint-plugin-react-hooks)). Several of its versions are marked "🧪 Partial, experimental". So I keep React's plugin for hooks and turn off the 12 duplicate `@eslint-react/*` rules by name. All 12 names were verified in the 5.24.9 `dist/index.js`.
- `eslint-plugin-jsx-a11y` (`jsxA11y.flatConfigs.recommended`; [README](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y)) is the standard a11y AST checker. See the ESLint 10 caveat in Open questions.

### TanStack Router / Query plugins
- Router `flat/recommended` and Query `flat/recommended-strict`, as described above. **AI angle:** `exhaustive-deps` for query keys, `stable-query-client` (no `new QueryClient()` in render), `no-rest-destructuring`, `no-void-query-fn`, and the property-order rules all encode TanStack-specific inference rules that a model trained on older or other libraries gets wrong.

### Imports: `eslint-plugin-import-x`
- `import-x` is a fork of `eslint-plugin-import` that uses `get-tsconfig` and a Rust resolver (`unrs-resolver`) ([README](https://github.com/un-ts/eslint-plugin-import-x)). TanStack's own shared config uses it. Version 4.17.1 declares ESLint `^10.0.0`. The original `eslint-plugin-import@2.32.0` stops at `^9` and was last published 2025-06-20 (npm).
- Flat resolver: `'import-x/resolver-next': [createTypeScriptImportResolver(...)]` ([import-x README](https://github.com/un-ts/eslint-plugin-import-x#import-xresolver-next), [resolver README](https://github.com/import-js/eslint-import-resolver-typescript)).
- I don't extend `import-x` `recommended`, because it enables `no-unresolved`, `named`, `namespace`, `default`, and `no-named-as-default-member`. typescript-eslint says "do not use" these, "as TypeScript provides the same checks as part of standard type checking" ([performance docs](https://typescript-eslint.io/troubleshooting/typed-linting/performance)).
- `import-x/no-cycle` has no TypeScript equivalent. typescript-eslint suggests running it "only … at CI/push time" if it gets slow ([same page](https://typescript-eslint.io/troubleshooting/typed-linting/performance)). **AI angle:** agents create circular imports (route ↔ component ↔ server util) and phantom dependencies; `no-cycle` and `no-extraneous-dependencies` stop both.
- Import sorting lives in ESLint (`import-x/order`, autofixable) rather than a Prettier plugin, so there is one sorting authority. TanStack's scaffold turns `import/order` off; I turn it on deliberately because deterministic order keeps agent diffs minimal.

### `eslint-plugin-unicorn` `unopinionated`
- v77 exports `recommended`, `unopinionated`, and `all` (source: `index.js`). `unopinionated` contains only rules with `recommended: 'unopinionated'`.
- I picked it over `recommended` because `recommended` adds opinionated rules that clash with this stack:
  - `filename-case` (`recommended: true`) versus TanStack route filenames like `$postId.tsx` and `__root.tsx`. **UNVERIFIED** whether it actually flags them.
  - `no-null` versus React/Drizzle `null` usage.
- Note: `prevent-abbreviations` and `no-array-for-each` no longer exist in v77 (the latter appears as `no-for-each`). Older blog configs referencing them will error.

### Tailwind v4
- `eslint-plugin-better-tailwindcss@4.9.0` has `correctness` (`no-unknown-classes`, `no-conflicting-classes`, `no-concatenated-classes`) and `stylistic` (ordering, line-wrapping) configs ([README](https://github.com/schoero/eslint-plugin-better-tailwindcss)). For Tailwind v4, set `settings['better-tailwindcss'].entryPoint` to the CSS entry ([settings docs](https://github.com/schoero/eslint-plugin-better-tailwindcss/blob/main/docs/settings/settings.md)). The TanStack scaffold's stylesheet is `src/styles.css` (template `src/styles.css.ejs`).
- **I use only `correctness` + `no-deprecated-classes`**, and leave class ordering to `prettier-plugin-tailwindcss` (Tailwind Labs' official plugin) so the two tools never fight. **AI angle:** models trained mostly on Tailwind v3 emit removed or renamed classes and invent utilities. `no-deprecated-classes` (tw4-only) and `no-unknown-classes` catch both.
- `eslint-plugin-tailwindcss@4.4.0` now advertises "Made for Tailwind CSS v4" and peers `eslint ^9 || ^10`, `tailwindcss ^4` (npm). It's a viable alternative; I preferred better-tailwindcss for its clean correctness/stylistic split.

### Drizzle / Neon / Clerk / Vercel
- `eslint-plugin-drizzle@0.2.3` (by the Drizzle team) has two rules, `enforce-delete-with-where` and `enforce-update-with-where`, with `drizzleObjectName` to avoid false positives on non-Drizzle `.delete()` ([Drizzle docs](https://orm.drizzle.team/docs/eslint-plugin)). The docs and the package's `configs` only show **legacy** eslintrc format (`plugins: ['drizzle']`), so in flat config you register `plugins: { drizzle }` and set the rules yourself. **AI angle:** an unscoped `db.delete(users)` against a Neon production branch is the most expensive single-line mistake an agent can make.
- **Clerk:** `@clerk/eslint-plugin@0.2.0` exists, but it is experimental and its only rule targets Next.js App Router (`@clerk/eslint-plugin/next`, `require-auth-protection`) ([npm](https://www.npmjs.com/package/@clerk/eslint-plugin)). **Not applicable to TanStack Start.**
- **Neon / Vercel:** no official ESLint plugins found (`@neondatabase/eslint-plugin` returns 404 on npm). For server/client separation, rely on TanStack Start's **import protection**. It is "enabled by default", restricts `*.server.*`/`*.client.*` files, and makes production builds "fail the build" ([import protection](https://tanstack.com/start/latest/docs/framework/react/guide/import-protection)). Note the page labels it experimental.

### Prettier
- Prettier's option philosophy: "Option requests aren't accepted anymore" ([option philosophy](https://prettier.io/docs/option-philosophy)). So keep options minimal.
- Current defaults: `printWidth 80`, `semi true`, `singleQuote false`, `trailingComma "all"`, `objectWrap "preserve"` (since 3.5.0), `arrowParens "always"`, `endOfLine "lf"` ([options](https://prettier.io/docs/options)).
- I set only the three options the TanStack scaffold writes. They agree with the router generator's defaults (`quoteStyle` single, `semicolons` false) for files it creates ([file-based routing API](https://tanstack.com/router/v1/docs/api/file-based-routing)).
- `eslint-config-prettier`: use `eslint-config-prettier/flat`, placed after the configs it overrides. It turns off conflicting `@stylistic`, `react`, and `unicorn` rules (`unicorn/empty-brace-spaces`, `no-nested-ternary`, `number-literal-case`) ([README](https://github.com/prettier/eslint-config-prettier)). `curly` is a "special rule" it disables, and the README shows `"curly": ["error", "all"]` as Prettier-compatible, so it is re-enabled after.
- `eslint-plugin-prettier`: no. Prettier lists red squiggles, slowness, and indirection ([Prettier docs](https://prettier.io/docs/integrating-with-linters)). typescript-eslint adds that it makes "each file … parsed twice" and recommends `prettier --check` in CI ([performance docs](https://typescript-eslint.io/troubleshooting/typed-linting/performance)).
- `prettier-plugin-tailwindcss@0.8.1`: for v4 "you must specify your CSS file entry point" via `tailwindStylesheet`, resolved relative to the Prettier config. Use `tailwindFunctions` for `cn`/`clsx`/`cva`. It "*must* be loaded last" among Prettier plugins ([README](https://github.com/tailwindlabs/prettier-plugin-tailwindcss)).
- `.prettierignore`: Prettier skips VCS dirs and `node_modules`, and "will also follow rules specified in the '.gitignore' file" ([ignore docs](https://prettier.io/docs/ignore)). TanStack says "You should ignore the path of your generated route tree file from your linter and formatter" ([file-based routing API](https://tanstack.com/router/v1/docs/api/file-based-routing)).

### TypeScript compiler flags
- TS 6.0 made **`strict` default to `true`** and `noUncheckedSideEffectImports` default to `true` ([TS 6.0 notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html)).
- TS 7.0 adopts those defaults, adds `types` → `[]`, and makes `baseUrl`, `moduleResolution node`, `target es5`, and others hard errors ([TS 7.0 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)). The scaffold's tsconfig already avoids all of those.
- Flags beyond `strict`, which "is equivalent to enabling all of the strict mode family options" (`noImplicitAny`, `strictNullChecks`, `useUnknownInCatchVariables`, …) ([tsconfig reference](https://www.typescriptlang.org/tsconfig/#strict)):
  - [`noUncheckedIndexedAccess`](https://www.typescriptlang.org/tsconfig/#noUncheckedIndexedAccess): "add `undefined` to any un-declared field". **AI angle:** models assume `rows[0]` exists. Combined with strict's `no-non-null-assertion`, they have to handle the empty case.
  - [`exactOptionalPropertyTypes`](https://www.typescriptlang.org/tsconfig/#exactOptionalPropertyTypes), [`noImplicitOverride`](https://www.typescriptlang.org/tsconfig/#noImplicitOverride), [`noImplicitReturns`](https://www.typescriptlang.org/tsconfig/#noImplicitReturns), [`noPropertyAccessFromIndexSignature`](https://www.typescriptlang.org/tsconfig/#noPropertyAccessFromIndexSignature), [`allowUnreachableCode`/`allowUnusedLabels: false`](https://www.typescriptlang.org/tsconfig/#allowUnreachableCode) (turns the editor hints into errors).
  - [`erasableSyntaxOnly`](https://www.typescriptlang.org/tsconfig/#erasableSyntaxOnly): "error on most TypeScript-specific constructs that have runtime behavior". This stops agents reaching for `enum`/`namespace`.
  - [`isolatedModules`](https://www.typescriptlang.org/tsconfig/#isolatedModules): Vite says it "Should be set to `true`" ([Vite features](https://vite.dev/guide/features)).
  - **`verbatimModuleSyntax: false`** per TanStack Start (see TL;DR).
- `noUnusedLocals`/`noUnusedParameters` (scaffold) overlap with `@typescript-eslint/no-unused-vars` (strict). The duplicate reports are harmless. Remove one side if the noise bothers you.

---

## Alternatives considered (and why not)

- **Biome 2.5.15.** It's a real option: the TanStack CLI offers it as one of two toolchains. Biome has "type-aware linting rules that doesn't rely on the TypeScript compiler", but its `noFloatingPromises` "can detect floating promises in about 75% of the cases that would be detected by using `typescript-eslint`" (self-described as preliminary) ([Biome v2 blog](https://biomejs.dev/blog/biome-v2/)). The rule is still in **nursery**: "experimental and the behavior can change at any time" ([rule page](https://biomejs.dev/linter/rules/no-floating-promises/)). It also has no equivalent of the TanStack Router/Query plugins or React's compiler-backed rules (**UNVERIFIED** that none exists via GritQL plugins; I found none). For a "maximally strict for AI" goal, that coverage gap decides it.
- **oxlint 1.87.0.** Type-aware linting via `oxlint-tsgolint` "supports 59 out of 61 type-aware rules from typescript-eslint", but "TypeScript 7.0+ is required" ([oxlint type-aware](https://oxc.rs/docs/guide/usage/linter/type-aware.html)). JS plugins (ESLint-compatible) are "currently in alpha", and don't yet support "Lint rules that rely on TypeScript type-awareness" ([JS plugins](https://oxc.rs/docs/guide/usage/linter/js-plugins.html)). It's credible as a fast pre-pass later. `eslint-plugin-oxlint@1.87.0` exists for hybrid setups, but I didn't verify its docs. Interesting asymmetry: oxlint needs TS ≥ 7 while typescript-eslint needs TS < 6.1. **Revisit when TS 7.1 ships its API** (Microsoft expects "TypeScript 7.1 to ship with a new (and different) API") ([TS 7.0 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)).
- **`eslint-plugin-react` 7.37.5 (legacy).** Its peer range is `eslint ^3 … || ^9.7`, with no ESLint 10, and it was last published 2025-04-03 (npm). ESLint 10 removed the `context.getFilename()`/`getSourceCode()` APIs ([ESLint v10 post](https://eslint.org/blog/2026/02/eslint-v10.0.0-released/)). **UNVERIFIED** which of its rules still call them. `@eslint-react` covers the same ground with typed rules and ESLint 10 support.
- **`@tanstack/eslint-config` as the base.** It's a library-repo config (see above): no React/a11y/promise rules, `project: true`, and the scaffold pins ESLint 9. I borrowed its ideas (`consistent-type-imports`, `no-unnecessary-condition`, import hygiene) inside a stricter stack.
- **`eslint-plugin-perfectionist` 5.12.1.** It has `sort-imports`, `sort-jsx-props`, `sort-union-types`, and more (verified in the tarball). It's a fine replacement for `import-x/order` if you want broader sorting. Don't run both import sorters.
- **Prettier import-sort plugins** (`@ianvs/prettier-plugin-sort-imports@4.7.1`). They're compatible with `prettier-plugin-tailwindcss` (listed in its README), but that would make two sorting authorities. Pick one; I picked ESLint.
- **`eslint-plugin-jsx-a11y-x@0.2.0`** (es-tooling). A drop-in replacement that declares `eslint ^9 || ^10` and uses `configs.recommended` with rule prefix `jsx-a11y-x/` ([README](https://github.com/es-tooling/eslint-plugin-jsx-a11y-x)). It has a single maintainer. It's the fallback if the original jsx-a11y breaks on ESLint 10.

---

## Open questions / UNVERIFIED

1. **Nothing here has been executed.** I wasn't allowed to install, so the config is assembled from documented APIs and tarball source. Run `pnpm lint` once on the scaffold and expect small fixes (for example, preset objects that typed `defineConfig` rejects).
2. **`eslint-plugin-jsx-a11y` on ESLint 10: UNVERIFIED at runtime.** The peer range stops at `^9`, and [issue #1075](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/issues/1075) is open. A grep of its `lib/` found no calls to the ESLint-10-removed `context.get*()` methods, but its dependencies (`jsx-ast-utils` etc.) weren't checked.
3. **`@tanstack/eslint-plugin-start` on ESLint 10: UNVERIFIED.** Peer is `^8.57 || ^9`. The source grep found no removed APIs.
4. **`eslint-plugin-drizzle` on ESLint 10 / flat config: UNVERIFIED at runtime.** Peer `>=8`, rule source uses only `context.report`, and it ships only legacy configs.
5. **`only-throw-error` `{ from: 'package', package: '@tanstack/router-core' }` under pnpm.** `router-core` is a transitive dependency of `@tanstack/react-router`. Whether typescript-eslint's package matcher resolves it in pnpm's isolated layout is **UNVERIFIED**. The config is copied from TanStack's docs.
6. **`exactOptionalPropertyTypes` / `erasableSyntaxOnly` compatibility** with TanStack Router/Start, Clerk, and Drizzle typings and with the generated `routeTree.gen.ts`: **UNVERIFIED**. If `tsc` reports errors that aren't yours, turn off `exactOptionalPropertyTypes` first.
7. **Why `verbatimModuleSyntax` leaks server code** isn't explained in TanStack's docs, only asserted. Treat it as a hard constraint anyway.
8. **unicorn `filename-case` vs TanStack route filenames** (why I avoided `recommended`): **UNVERIFIED**.
9. **typescript-eslint support for TS 7**: no committed date. It depends on the TS 7.1 API ([typescript-eslint#10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940), [TS 7.0 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)). Re-check the `typescript` peer range on each typescript-eslint upgrade.
10. **Typed-lint performance** with `strictTypeChecked` + `no-cycle` + `@eslint-react` typed rules on a large codebase hasn't been measured. If it gets slow, move `import-x/no-cycle` to CI only, as typescript-eslint suggests.
11. **Docs drift spotted:** the TanStack Router docs list one rule while the package ships two (`route-param-names`). react.dev lists `component-hook-factories`, which the 7.1.x plugin has deprecated. Prefer package source over docs when they disagree.
