import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'DCS-Times',
  webDir: 'dist',
  plugins: {
    StatusBar: {
      overlaysWebView: false,
      style: "DARK",
      backgroundColor: "#ffffff",
    },
  },
};

export default config;
