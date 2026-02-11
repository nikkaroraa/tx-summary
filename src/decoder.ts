import { 
  decodeFunctionData, 
  formatEther, 
  formatUnits,
  type Hex,
  type TransactionReceipt,
  type Log,
  parseAbi,
} from 'viem';

// Common function selectors (4byte signatures)
const KNOWN_SELECTORS: Record<string, { name: string; signature: string }> = {
  // ERC20
  '0xa9059cbb': { name: 'transfer', signature: 'transfer(address,uint256)' },
  '0x23b872dd': { name: 'transferFrom', signature: 'transferFrom(address,address,uint256)' },
  '0x095ea7b3': { name: 'approve', signature: 'approve(address,uint256)' },
  
  // Uniswap V2 Router
  '0x7ff36ab5': { name: 'swapExactETHForTokens', signature: 'swapExactETHForTokens(uint256,address[],address,uint256)' },
  '0x18cbafe5': { name: 'swapExactTokensForETH', signature: 'swapExactTokensForETH(uint256,uint256,address[],address,uint256)' },
  '0x38ed1739': { name: 'swapExactTokensForTokens', signature: 'swapExactTokensForTokens(uint256,uint256,address[],address,uint256)' },
  
  // Uniswap V3 Router
  '0x04e45aaf': { name: 'exactInputSingle', signature: 'exactInputSingle((address,address,uint24,address,uint256,uint256,uint160))' },
  '0xb858183f': { name: 'exactInput', signature: 'exactInput((bytes,address,uint256,uint256))' },
  '0x5ae401dc': { name: 'multicall', signature: 'multicall(uint256,bytes[])' },
  '0xac9650d8': { name: 'multicall', signature: 'multicall(bytes[])' },
  
  // Uniswap Universal Router
  '0x3593564c': { name: 'execute', signature: 'execute(bytes,bytes[],uint256)' },
  '0x24856bc3': { name: 'execute', signature: 'execute(bytes,bytes[])' },
  
  // WETH
  '0xd0e30db0': { name: 'deposit', signature: 'deposit()' },
  '0x2e1a7d4d': { name: 'withdraw', signature: 'withdraw(uint256)' },
  
  // Aave
  '0x617ba037': { name: 'supply', signature: 'supply(address,uint256,address,uint16)' },
  '0x69328dec': { name: 'withdraw', signature: 'withdraw(address,uint256,address)' },
  '0xa415bcad': { name: 'borrow', signature: 'borrow(address,uint256,uint256,uint16,address)' },
  '0x573ade81': { name: 'repay', signature: 'repay(address,uint256,uint256,address)' },
  
  // NFT
  '0x42842e0e': { name: 'safeTransferFrom', signature: 'safeTransferFrom(address,address,uint256)' },
  '0xb88d4fde': { name: 'safeTransferFrom', signature: 'safeTransferFrom(address,address,uint256,bytes)' },
  
  // Common
  '0x': { name: 'native transfer', signature: '' },
};

// Known contract names
const KNOWN_CONTRACTS: Record<string, string> = {
  // Uniswap
  '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': 'Uniswap V2 Router',
  '0xe592427a0aece92de3edee1f18e0157c05861564': 'Uniswap V3 Router',
  '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45': 'Uniswap V3 Router 2',
  '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad': 'Uniswap Universal Router',
  '0xc36442b4a4522e871399cd717abdd847ab11fe88': 'Uniswap V3 NFT Manager',
  
  // Aave
  '0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2': 'Aave V3 Pool',
  '0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9': 'Aave V2 Pool',
  
  // WETH
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'WETH',
  
  // 1inch
  '0x1111111254eeb25477b68fb85ed929f73a960582': '1inch Router',
  
  // OpenSea
  '0x00000000000000adc04c56bf30ac9d3c0aaf14dc': 'OpenSea Seaport',
};

// Known tokens
const KNOWN_TOKENS: Record<string, { symbol: string; decimals: number }> = {
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': { symbol: 'WETH', decimals: 18 },
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': { symbol: 'USDC', decimals: 6 },
  '0xdac17f958d2ee523a2206206994597c13d831ec7': { symbol: 'USDT', decimals: 6 },
  '0x6b175474e89094c44da98b954eedeac495271d0f': { symbol: 'DAI', decimals: 18 },
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': { symbol: 'WBTC', decimals: 8 },
  '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0': { symbol: 'wstETH', decimals: 18 },
  '0xae78736cd615f374d3085123a210448e74fc6393': { symbol: 'rETH', decimals: 18 },
  '0x514910771af9ca656af840dff83e8264ecf986ca': { symbol: 'LINK', decimals: 18 },
  '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': { symbol: 'UNI', decimals: 18 },
  '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9': { symbol: 'AAVE', decimals: 18 },
};

// Transfer event topic
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

export interface DecodedTx {
  hash: string;
  from: string;
  to: string | null;
  value: bigint;
  functionName: string | null;
  functionSignature: string | null;
  contractName: string | null;
  isContractCreation: boolean;
  status: 'success' | 'failed' | 'pending';
  transfers: Transfer[];
  gasUsed: bigint | null;
  gasPrice: bigint | null;
}

export interface Transfer {
  token: string;
  tokenSymbol: string;
  from: string;
  to: string;
  amount: string;
  rawAmount: bigint;
}

function getTokenInfo(address: string): { symbol: string; decimals: number } {
  const normalized = address.toLowerCase();
  return KNOWN_TOKENS[normalized] || { symbol: address.slice(0, 6) + '…', decimals: 18 };
}

function getContractName(address: string): string | null {
  return KNOWN_CONTRACTS[address.toLowerCase()] || null;
}

function decodeSelector(data: Hex): { name: string; signature: string } | null {
  if (!data || data === '0x' || data.length < 10) {
    return data === '0x' || !data ? KNOWN_SELECTORS['0x'] : null;
  }
  const selector = data.slice(0, 10).toLowerCase() as Hex;
  return KNOWN_SELECTORS[selector] || null;
}

export function parseTransfers(logs: Log[]): Transfer[] {
  const transfers: Transfer[] = [];
  
  for (const log of logs) {
    // Check for ERC20 Transfer event
    if (log.topics[0] === TRANSFER_TOPIC && log.topics.length >= 3) {
      const from = '0x' + log.topics[1]?.slice(26);
      const to = '0x' + log.topics[2]?.slice(26);
      const amount = log.data && log.data !== '0x' ? BigInt(log.data) : 0n;
      
      const tokenInfo = getTokenInfo(log.address);
      
      transfers.push({
        token: log.address,
        tokenSymbol: tokenInfo.symbol,
        from,
        to,
        amount: formatUnits(amount, tokenInfo.decimals),
        rawAmount: amount,
      });
    }
  }
  
  return transfers;
}

export function decodeTx(
  tx: {
    hash: Hex;
    from: Hex;
    to: Hex | null;
    value: bigint;
    input: Hex;
    gasPrice?: bigint;
  },
  receipt?: TransactionReceipt
): DecodedTx {
  const selectorInfo = decodeSelector(tx.input);
  const contractName = tx.to ? getContractName(tx.to) : null;
  
  const transfers = receipt ? parseTransfers(receipt.logs) : [];
  
  return {
    hash: tx.hash,
    from: tx.from,
    to: tx.to,
    value: tx.value,
    functionName: selectorInfo?.name || null,
    functionSignature: selectorInfo?.signature || null,
    contractName,
    isContractCreation: !tx.to,
    status: receipt ? (receipt.status === 'success' ? 'success' : 'failed') : 'pending',
    transfers,
    gasUsed: receipt?.gasUsed || null,
    gasPrice: tx.gasPrice || null,
  };
}
