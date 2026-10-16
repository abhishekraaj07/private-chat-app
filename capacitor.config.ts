import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nexus.messenger',
  appName: 'NEXUS',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
