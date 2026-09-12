# Getting the app onto real phones

Fastest path: internal distribution via EAS Build — an installable Android
APK your team sideloads directly, and an iOS build distributed through
TestFlight. No app store review needed for either.

## One-time setup

1. Create a free account at expo.dev, then from `mobile/`:
   ```bash
   npx eas login
   npx eas init   # links this project to your Expo account, sets extra.eas.projectId in app.json
   ```
2. For iOS you'll also need an Apple Developer Program membership ($99/yr) —
   EAS will prompt for your Apple ID and handle certificates/provisioning
   profiles automatically the first time you build.
3. Android needs no paid account for sideloading an APK. A Google Play
   Console account ($25 one-time) is only needed later, for a public Play
   Store listing.

## Build it

```bash
# Android - produces a downloadable .apk link to send your team directly
npx eas build --profile preview --platform android

# iOS - produces a build EAS can submit straight to TestFlight
npx eas build --profile preview --platform ios
npx eas submit --platform ios   # sends the build to TestFlight
```

Update `app.json` → `expo.extra.apiBaseUrl` to your production backend URL
(from the root `README.md` production deployment section) before building.

## Going public later

When you're ready for real App Store / Play Store listings:
```bash
npx eas build --profile production --platform android
npx eas build --profile production --platform ios
npx eas submit --platform android
npx eas submit --platform ios
```
Apple's review is typically 1-3 days; Google's is usually faster. Both
require store listing assets (screenshots, description, privacy policy URL)
that aren't part of this repo.

See `WIDGETS.md` for the separate, still-open work on native home-screen
widgets.
