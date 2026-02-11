# tx-summary

Summarize blockchain transactions in plain English.

```bash
$ npx tx-summary 0x1234...abcd
→ "Swapped 1.5 ETH → 2,847 USDC via Uniswap V3"
```

## Installation

```bash
npm install -g tx-summary
# or use directly
npx tx-summary <hash>
```

## Usage

```bash
# Basic usage (defaults to Ethereum mainnet)
tx-summary 0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060

# Specify chain
tx-summary 0x... --chain katana

# Custom RPC
tx-summary 0x... --rpc https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY

# Verbose output (includes block, status, explorer link)
tx-summary 0x... --verbose

# JSON output (for scripting)
tx-summary 0x... --json
```

## Supported Chains

| Chain    | RPC                              |
|----------|----------------------------------|
| ethereum | Public Llama RPC (default)       |
| katana   | https://rpc.katana.network       |

## What It Detects

- **Transfers**: ETH and ERC20 token transfers
- **Swaps**: Uniswap V2/V3, 1inch, and other DEX swaps
- **Approvals**: Token approvals
- **WETH**: Wrap/unwrap operations
- **Aave**: Supply, borrow, repay operations
- **NFTs**: NFT transfers
- **Contract deployments**

## Programmatic API

```typescript
import { summarizeTx } from 'tx-summary';

const result = await summarizeTx('0x1234...', { chain: 'ethereum' });
console.log(result.summary);
// → "Swapped 1.5 ETH → 2,847 USDC via Uniswap V3"
```

## Example Outputs

```
Sent 1.50 ETH → 0x1234…5678
Swapped 500.00 USDC → 0.25 ETH via Uniswap V3
Approved USDC for Uniswap V3 Router
Wrapped 2.00 ETH → WETH
Supplied 1,000.00 USDC to Aave
Borrowed 0.50 ETH from Aave
Deployed new contract
❌ FAILED: Swapped 100.00 USDC → 0.05 ETH via 1inch Router
```

## License

MIT
