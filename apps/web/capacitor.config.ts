import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.bspass.app',
  appName: 'BS-PASS',
  webDir: 'public',
  server: {
    url: 'https://web-mu-eight-3mnghq5p7b.vercel.app',
    cleartext: false,
  },
}

export default config
