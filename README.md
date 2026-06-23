# Decode Encode

Decode Encode is a local-first Vite + React + TypeScript app for everyday developer encoding, decoding, formatting, and hashing tasks.

## Local-first behavior

All processing happens in the browser with native web APIs where possible. The app does not include a backend, server API, database, or analytics integration. After the static assets load, your input remains on your device and transformations run locally.

## Available tools

- **Base64 encode/decode**: Converts UTF-8 text to and from Base64.
- **JWT decode/inspect**: Decodes JWT headers and payloads for inspection without verifying signatures.
- **URL encode/decode**: Encodes and decodes URL component strings.
- **JSON formatter/minifier**: Pretty-prints or compacts valid JSON.
- **SHA-256 hash generator**: Uses the Web Crypto API to generate SHA-256 hashes.

## Development commands

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## GitHub Pages deployment

This project is configured for a repository GitHub Pages site at `/decode-encode/` via `base: '/decode-encode/'` in `vite.config.ts`.

### GitHub Actions deployment

The repository includes a GitHub Actions workflow at `.github/workflows/deploy.yml` that builds the app, uploads `dist/`, and deploys it with the official GitHub Pages actions whenever changes are pushed to `main`. You can also run the workflow manually from the Actions tab.

1. In GitHub, open **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Confirm `vite.config.ts` has the correct `base` value:
   - Use `/decode-encode/` for a project page like `https://USER.github.io/decode-encode/`.
   - Use `/` for a user or organization root page like `https://USER.github.io/`.
4. Push to `main`, or manually run the **Deploy to GitHub Pages** workflow.

### Manual deployment

If you prefer publishing from your local machine instead of GitHub Actions, run:

```bash
npm run deploy
```

The manual deploy script builds the app and publishes `dist/` with the `gh-pages` package. For the automated workflow, GitHub Pages must be enabled with **GitHub Actions** as the deployment source.
