import { http, createPublicClient, type Chain } from 'viem';
import { mainnet } from 'viem/chains';

// Katana chain definition
export const katana: Chain = {
  id: 17777,
  name: 'Katana',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['https://rpc.katana.network'] },
  },
  blockExplorers: {
    default: { name: 'Katana Explorer', url: 'https://explorer.katana.network' },
  },
};

// Chain registry with fallback RPCs
export const CHAINS: Record<string, { chain: Chain; rpcs: string[] }> = {
  ethereum: {
    chain: mainnet,
    rpcs: [
      'https://eth.llamarpc.com',
      'https://rpc.ankr.com/eth',
      'https://ethereum.publicnode.com',
    ],
  },
  mainnet: {
    chain: mainnet,
    rpcs: [
      'https://eth.llamarpc.com',
      'https://rpc.ankr.com/eth',
      'https://ethereum.publicnode.com',
    ],
  },
  katana: {
    chain: katana,
    rpcs: ['https://rpc.katana.network'],
  },
};

export function getClient(chainName: string, customRpc?: string) {
  const chainConfig = CHAINS[chainName.toLowerCase()];
  if (!chainConfig) {
    throw new Error(`Unknown chain: ${chainName}. Supported: ${Object.keys(CHAINS).join(', ')}`);
  }

  const rpcUrl = customRpc || chainConfig.rpcs[0];

  return createPublicClient({
    chain: chainConfig.chain,
    transport: http(rpcUrl),
  });
}

export function getExplorerUrl(chainName: string, txHash: string): string {
  const chainConfig = CHAINS[chainName.toLowerCase()];
  if (!chainConfig?.chain.blockExplorers?.default) {
    return '';
  }
  return `${chainConfig.chain.blockExplorers.default.url}/tx/${txHash}`;
}
