# Farcaster Mini App Host

A Next.js application for hosting and testing Farcaster Mini Apps in a web environment. This project provides a development host that allows you to load and interact with Farcaster mini apps using the Farcaster Mini App Host SDK.

## Features

- **Farcaster Authentication**: Sign in with Farcaster using Neynar's Sign In With Neynar (SIWN)
- **Mini App Hosting**: Load and display Farcaster mini apps in a draggable iframe window
- **Auth Address Management**: Generate and manage auth addresses for mini app authentication
- **QR Code Approval**: Display QR codes for auth address approval via Farcaster mobile app
- **Full SDK Support**: Implements the complete Farcaster Mini App Host SDK capabilities

## Run it!

```bash
npm run dev

npm run build
```

## Resources

#### Farcaster:
**User/ Client Context:**
- MINI APP CONTEXT:https://miniapps.farcaster.xyz/docs/sdk/context#context
- USER CONTEXT: https://miniapps.farcaster.xyz/docs/sdk/context#user
- CLIENT CONTEXT: https://miniapps.farcaster.xyz/docs/sdk/context#client

**Mini App Host SDK**
- NPMJS: https://www.npmjs.com/package/@farcaster/miniapp-host
- EXAMPLES: https://github.com/farcasterxyz/miniapps/tree/main/packages/miniapp-host

**Quick Auth**
- QUICK AUTH: https://miniapps.farcaster.xyz/docs/sdk/quick-auth/get-token
- AUTH SERVER: https://github.com/farcasterxyz/protocol/discussions/231
- AUTH ADDRESS: https://github.com/farcasterxyz/protocol/discussions/225
- Sign in With Farcaster: https://github.com/farcasterxyz/protocol/discussions/110

#### NEYNAR:
**Initial login**
- SIWN: https://docs.neynar.com/docs/how-to-let-users-connect-farcaster-accounts-with-write-access-for-free-using-sign-in-with-neynar-siwn

**Host Miniapps Overview**
- Host Mini Apps: https://docs.neynar.com/docs/app-host-overview

**For SIWF:**
- Auth Address Signature Generation: https://docs.neynar.com/docs/auth-address-signature-generation

- Registering Auth API: https://docs.neynar.com/reference/register-signed-key-for-developer-managed-auth-address





