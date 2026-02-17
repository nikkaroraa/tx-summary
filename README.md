# tx-summary

> Summarize blockchain transactions in plain English

```bash
npx tx-summary 0x1234...abcd
# → "Swapped 1.50 ETH → 2,847.00 USDC via Uniswap V3"
```

## Installation

```bash
# Use directly with npx (no install needed)
npx tx-summary <hash>

# Or install globally
npm install -g tx-summary
```

## Usage

```bash
# Basic usage (defaults to Ethereum mainnet)
tx-summary 0x1234...abcd

# Specify chain
tx-summary 0x... --chain katana

# Custom RPC (recommended for production)
tx-summary 0x... --rpc https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY

# Verbose output (includes block, status, explorer link)
tx-summary 0x... --verbose

# JSON output (for scripting)
tx-summary 0x... --json
```

## Supported Chains

| Chain      | Default RPC                |
|------------|----------------------------|
| `ethereum` | Public Llama RPC           |
| `mainnet`  | Public Llama RPC           |
| `katana`   | https://rpc.katana.network |

### Katana First-Class Support 🔥

tx-summary has deep integration with the Katana DeFi ecosystem:

**Protocols:**
- **Sushi** - V2/V3 routers, RouteProcessor swaps
- **Morpho** - Supply, borrow, repay, liquidate, flash loans, MetaMorpho vaults
- **Yearn V3** - ERC4626 vault deposits, withdrawals, mints, redeems
- **Vault Bridge** - Cross-chain token converters
- **Agglayer** - Unified bridge
- **0xTrails** - Intent-based checkout (coming soon)

**Tokens:**
- Native: KAT, AUSD (Agora USD)
- Bridged: WETH, WBTC, USDC, USDT, USDS (vb tokens)
- Staking: wstETH, weETH, jitoSOL
- Universal: uSOL, uSUI, uADA, uXRP

```bash
# Example Katana usage
tx-summary 0x... --chain katana
→ "Supplied 1,000.00 USDC to Morpho"
→ "Swapped 100.00 USDC → 0.04 ETH via Sushi RouteProcessor"
→ "Deposited 1,000.00 USDC to Yearn Vault"
→ "Deposited 500.00 DAI to MetaMorpho Vault"
```

## What It Detects

### DeFi
- **Swaps** - Uniswap V2/V3, 1inch, 0x, Cowswap, Curve, Balancer, SushiSwap, Paraswap
- **Liquidity** - Add/remove LP positions
- **Lending** - Aave, Compound, Spark: supply, borrow, repay, liquidate, flash loans
- **WETH** - Wrap/unwrap operations

### Tokens
- **Transfers** - ETH and ERC20 sends with proper decimals
- **Approvals** - Token approvals with contract names
- **Permit2** - Signature-based approvals

### NFTs
- **ERC721** - Single NFT transfers, mints, sales
- **ERC1155** - Multi-token transfers
- **Marketplaces** - OpenSea, Blur, LooksRare, X2Y2, Sudoswap

### Other
- **Contract deployments**
- **Bridge transactions**
- **ENS registrations**

## Example Outputs

```
Sent 1.50 ETH → 0x1234…5678
Swapped 500.00 USDC → 0.25 ETH via Uniswap V3
Swapped 1.00 ETH → 2,847.00 USDC via 1inch V5 Router
Approved USDC for Uniswap Universal Router
Wrapped 2.00 ETH → WETH
Supplied 1,000.00 USDC to Aave
Borrowed 0.50 ETH from Aave
Repaid 500.00 DAI to Aave
Minted Bored Ape Yacht Club #1234
Bought Azuki #5678 for 15.00 ETH on OpenSea
Transferred CryptoPunks #9999 → 0xabc…def
Deployed new contract
Added WETH/USDC liquidity to Uniswap V2 Router
❌ FAILED: Swapped 100.00 USDC → 0.05 ETH via 0x Exchange Proxy
```

## Programmatic API

```typescript
import { summarizeTx, getClient, decodeTx } from 'tx-summary';

// Simple summary
const result = await summarizeTx('0x1234...', { chain: 'ethereum' });
console.log(result.summary);
// → "Swapped 1.50 ETH → 2,847.00 USDC via Uniswap V3"

// Full result
console.log(result);
// {
//   hash: '0x1234...',
//   summary: 'Swapped 1.50 ETH → 2,847.00 USDC via Uniswap V3',
//   from: '0xabc...',
//   to: '0xdef...',
//   status: 'success',
//   blockNumber: 12345678n
// }

// Low-level: get decoded transaction data
const client = getClient('ethereum');
const tx = await client.getTransaction({ hash: '0x1234...' });
const receipt = await client.getTransactionReceipt({ hash: '0x1234...' });
const decoded = decodeTx(tx, receipt);
console.log(decoded.transfers);    // ERC20 transfers
console.log(decoded.nftTransfers); // NFT transfers
console.log(decoded.contractName); // Known contract name if recognized
```

## Known Contracts

tx-summary recognizes 100+ contracts including:

**Ethereum Mainnet:**
- **DEXes**: Uniswap V2/V3, SushiSwap, 1inch, 0x, Cowswap, Curve, Balancer, Paraswap, KyberSwap
- **Lending**: Aave V2/V3, Compound V3, Spark, Morpho Blue
- **Staking**: Lido, Rocket Pool, Frax, Coinbase
- **NFT**: OpenSea, Blur, LooksRare, X2Y2, Sudoswap
- **Bridges**: Across, Stargate, Hop, Arbitrum, Optimism, Polygon, zkSync
- **Other**: ENS, Permit2, Gnosis Safe

**Katana Network:**
- **DEXes**: Sushi V2/V3, RouteProcessor, RedSnwapper
- **Lending**: Morpho Blue, MetaMorpho, Bundler3
- **Vaults**: Yearn V3 (VaultFactory, TokenizedStrategy, 4626 Router)
- **Bridges**: Vault Bridge, Unified Bridge, Token Converters

## Known Tokens

50+ tokens with correct symbols and decimals:

- Stablecoins: USDC, USDT, DAI, FRAX, LUSD, etc.
- ETH derivatives: WETH, stETH, wstETH, rETH, cbETH, frxETH
- DeFi: UNI, AAVE, COMP, MKR, CRV, LDO, etc.

## Environment Variables

```bash
# Optional: Set default RPC
export TX_SUMMARY_RPC=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
```

## License

MIT
