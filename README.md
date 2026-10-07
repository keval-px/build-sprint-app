# Checkout Health

A Shopify demo app for reviewing checkout sessions, alerts, and recorded completion events. Built with TypeScript, Shopify Polaris, and Convex.

## Run locally

```sh
npm ci
npm run dev
```

The connected app needs your own Convex project and Shopify development app settings. Copy `shopify.app.example.toml` to `shopify.app.toml` and configure your app. Keep credentials in local environment settings; they are not included in this repository. The current implementation targets the `build-sprint-demo.myshopify.com` development store.

## Checks

```sh
npm test
npm run build
```

## Deploy

With your Convex deployment configured:

```sh
npm run deploy
```

Deployment uses Convex static hosting. Pushing to GitHub does not deploy the app.

## Data

The dashboard uses controlled demo checkout evidence. Test orders do not represent real revenue or prove a recovery effect. Public demo results and authenticated Shopify records are kept separate.

This repository contains a snapshot of the current app source. Local credentials, design reference uploads, and earlier local Git history are excluded.
