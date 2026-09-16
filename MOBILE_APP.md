# DP Creation — mobile app (Capacitor)

The Angular app (`angular-app/`) is wrapped with [Capacitor](https://capacitorjs.com)
so the exact same code ships as a real Android app (Play Store) and iOS app (App
Store), alongside the existing website. There is no separate mobile codebase —
`angular-app/android/` and `angular-app/ios/` are thin native shells that load the
same Angular build and talk to the same Render API.

## What's already done

- `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/ios`,
  `@capacitor/app` installed; `angular-app/capacitor.config.ts` created
  (`appId: com.dpcreation.app`, `appName: DP Creation`).
- `angular-app/android/` and `angular-app/ios/` — the native projects, generated
  and committed. `applicationId` / `PRODUCT_BUNDLE_IDENTIFIER` are both
  `com.dpcreation.app`, version `1.0` (build `1`).
- App icon + splash screen regenerated in the current blue theme (a "DP" mark on
  the `#378add → #0c447c` gradient) and pushed into the PWA manifest, the
  Android `mipmap`/`drawable` resources, and the iOS asset catalog — all from
  one source pair in `angular-app/assets/` (`icon.png` 1024×1024, `splash.png`
  2732×2732). Regenerate with `npm run cap:assets` after changing either file.
- Android hardware back button wired up (`angular-app/src/app/app.ts`) — steps
  back through app history instead of exiting the app outright.
- Server CORS (`server/src/env.ts` reads `CORS_ORIGINS`) now allows the native
  shell's WebView origins — `capacitor://localhost` (iOS) and `https://localhost`
  (Android, per `androidScheme: 'https'` in the Capacitor config) — alongside
  the existing web origins. Already deployed to the live Render service and
  recorded in `render.yaml` for future redeploys from scratch.
- The app always talks to the live Render API (`environment.production.ts`),
  in the browser and inside the installed app alike — there's no bundled
  backend, so there's nothing to point at "localhost" inside the native shell.

## Everyday workflow

After any change to the Angular app that you want to test in the native shell:

```bash
cd angular-app
npm run cap:android   # builds, syncs, opens the project in Android Studio
npm run cap:ios       # builds, syncs, opens the project in Xcode
```

(`npm run cap:sync` alone just builds + syncs, without opening an IDE.)

## What you need to install (your machine, one-time)

**Android** — free, no account needed to just build/test:
1. Install [Android Studio](https://developer.android.com/studio).
2. Open it once so it finishes installing the Android SDK + an emulator image.
3. `cd angular-app && npm run cap:android` — this opens the project. Pick a
   device (emulator or a phone over USB with Developer Mode + USB debugging
   on) and hit Run.

**iOS** — needs a Mac (you have one) and is free to build/test on your own
device or the simulator, but publishing needs a paid account (below):
1. Install Xcode from the App Store (several GB, takes a while). The Command
   Line Tools alone (already on this machine) aren't enough to build/run an app.
2. `cd angular-app && npm run cap:ios` — opens the project in Xcode. Pick a
   simulator or a plugged-in iPhone (with your Apple ID added under
   Xcode → Settings → Accounts) and hit Run.

## Publishing to the stores

### Android — Google Play

1. Create a [Google Play Console](https://play.google.com/console) account —
   **$25, one-time**.
2. In Android Studio: **Build → Generate Signed Bundle/APK → Android App
   Bundle**. First time, create a new keystore (`Create new...`) and **back
   the `.jks` file and its passwords up somewhere safe outside this repo** —
   losing it means you can never update the app again under the same listing.
3. Upload the resulting `.aab` in Play Console → your app → **Production**
   (or **Internal testing** first, to try it privately before a public
   release) → Create release.
4. Fill in the store listing (screenshots, short/full description, content
   rating questionnaire, **privacy policy URL — required**, see below).
5. Submit for review (usually hours to a couple of days).

### iOS — Apple App Store

1. Enroll in the [Apple Developer Program](https://developer.apple.com/programs/)
   — **$99/year**.
2. In Xcode: set your Team under **Signing & Capabilities**, then
   **Product → Archive**.
3. From the Organizer window, **Distribute App → App Store Connect → Upload**.
4. In [App Store Connect](https://appstoreconnect.apple.com), create the app
   listing (screenshots per device size, description, **privacy policy URL —
   required**, and Apple's App Privacy questionnaire — declare that you
   collect a phone number and PIN for account creation).
5. Submit for review (typically 1-3 days; first submissions sometimes take
   longer).

### Privacy policy (required by both stores)

Both stores require a public privacy policy URL before they'll accept the
app, because it collects a phone number and a PIN (hashed on the server —
see `server/src/pin.ts` — but the store review doesn't know that unless the
policy says so). I can draft one and publish it as a page with its own URL —
just say so and give me a contact email to put on it (and a business address,
if you want one listed — not required for either store).

### After the first release

- **Version bumps**: Android — `android/app/build.gradle`
  (`versionCode`, bump every release; `versionName`, the user-visible
  "1.0", "1.1", ...). iOS — the same two numbers live in Xcode under
  **Target → General** (`Version` / `Build`), or directly in
  `ios/App/App.xcodeproj/project.pbxproj` (`MARKETING_VERSION` /
  `CURRENT_PROJECT_VERSION`).
- **Re-branding the icon/splash**: replace `angular-app/assets/icon.png`
  (1024×1024, no transparency) and/or `splash.png` (2732×2732), then
  `npm run cap:assets` followed by `npm run cap:sync`.
- **The Render API is on the free plan**, which sleeps after ~15 minutes idle
  and takes ~50 seconds to wake on the next request. That's a rougher
  experience inside an installed app than on a website (people expect an app
  to open instantly) — worth moving to a paid Render plan (or pinging
  `GET /api/health` on a schedule to keep it warm) before a real public
  launch.
