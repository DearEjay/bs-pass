import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.bspass.app',
  appName: 'BS-PASS',
  webDir: 'public',
  server: {
    url: 'http://localhost:3000',
    cleartext: true,
  },
}

export default config
