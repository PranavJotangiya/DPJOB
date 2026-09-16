import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dpcreation.app',
  appName: 'DP Creation',
  webDir: 'dist/angular-app/browser',
  server: {
    // The app always talks to the live Render API, in dev and in the
    // installed app alike — there is no bundled backend to point at
    // localhost, so androidScheme/iosScheme just need to be valid origins
    // the server's CORS allowlist can recognize (see server/src/index.ts).
    androidScheme: 'https',
  },
};

export default config;
