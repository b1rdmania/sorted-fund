import React from 'react'
import ReactDOM from 'react-dom/client'
import { PrivyProvider } from '@privy-io/react-auth'
import App from './App'

// Sonic testnet chain config
const sonicTestnet = {
  id: 14601,
  name: 'Sonic Testnet',
  network: 'sonic-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Sonic',
    symbol: 'S',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.testnet.soniclabs.com'],
    },
    public: {
      http: ['https://rpc.testnet.soniclabs.com'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Sonic Explorer',
      url: 'https://testnet.sonicscan.org',
    },
  },
  testnet: true,
}

const PRIVY_APP_ID = 'cml40ylts00dpk20ccec1902m'

ReactDOM.createRoot(document.getElementById('privy-login')).render(
  <React.StrictMode>
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ['email', 'wallet', 'google'],
        appearance: {
          theme: 'dark',
          accentColor: '#22c55e',
          logo: 'https://sorted.fund/assets/img/sorted-mark.svg',
        },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
        defaultChain: sonicTestnet,
        supportedChains: [sonicTestnet],
      }}
    >
      <App />
    </PrivyProvider>
  </React.StrictMode>
)
