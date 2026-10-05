# UIArc migration

The host app now uses Next.js 16.3.8, React 19, and Node.js 22. Run `nvm use`, then `npm ci`. The exported project scaffold retains its existing Next.js 14 / React 18 versions.

## Interface

Official free UIArc registry sources live in `src/components/arc`. Foundation CSS is imported once in the root layout, before application overrides. `components.json` registers `@uiarc` and the existing `@/*` alias. UIArc component styling uses CSS modules; Tailwind remains available for layout.

The conversion controller is in `src/hooks/use-conversion.ts`. Presentation components live in `src/components/site`. Sanity fields and fallback copy are in `src/lib/landing-content.ts`; page revalidation remains 60 seconds.

System is the initial theme. A small head script applies the selected theme before paint. Only the System/Light/Dark choice is saved under `site2nextjs_theme`; System continues following device changes. Geist Sans and Geist Mono are bundled and self-hosted. The hero uses a neutral palette, and reduced motion uses the static CSS background without mounting WebGL.

GitHub tokens stay in React memory. Legacy stored tokens are removed even when a stored job is malformed. Dialogs and drawers use Radix focus handling through UIArc. The preview remains `sandbox="allow-scripts"` and cannot inherit the host's theme. Loading reports estimated activity with an indeterminate progress bar.

## Verification

- `npm run test:all`: pipeline, 10 security suites, and Sanity/fallback content checks.
- `npx tsc --noEmit`: strict type checking.
- `npm run lint`: explicit ESLint command. Registry-vendored UIArc sources are excluded; application code and tests are checked. Existing backend `any`/unused-symbol warnings remain warnings. The download fallback intentionally uses full navigation to a binary API response.
- `npm run build`: production build.
- `npx playwright install chromium`, then `npm run test:browser`: 20 browser cases, including mocked conversion/GitHub export, settings, failures, restoration, expired jobs, ZIP and server download fallback, clipboard feedback, focus restoration, mobile drawer, FAQ, isolated preview, and both themes at 390/768/1440px. GitHub tests create no repositories or commits.

Baseline Next.js 14 pipeline/security tests, TypeScript, and production build passed before migration. Final local checks and all 20 browser cases passed. The Next.js 16 filesystem tracing annotations exclude runtime-generated asset paths from build-time project tracing while explicitly retaining public assets.

## Rollout

Use the feature branch preview in the existing `site2nextjs` Vercel project. Node.js is pinned to 22.x both in package.json and project settings. Review and validate the preview before merging.

Previous production deployment retained for rollback:

- ID: `dpl_9VzgiDnW4WjGS9cKjySXGHNxPavE`
- URL: `https://site2nextjs-cm5iszpjq-surajkale69420-5900s-projects.vercel.app`

No production alias is promoted by this migration branch. No paid UIArc components, new hosting project, public API schema changes, or generated-site styling changes are included.
