---
title: Expand Katana Protocol Support (Yearn V3, Morpho, SushiSwap, 0xTrails)
type: feat
status: completed
date: 2026-02-17
---

# Expand Katana Protocol Support

Add/enhance support for four Katana ecosystem protocols: Yearn V3, Morpho (enhanced), SushiSwap (verified), and 0xTrails checkout.

## Acceptance Criteria

### 1. Yearn V3 Vault Detection

- [x] Add ERC4626 function selectors to `KNOWN_SELECTORS` in `src/decoder.ts`:
  - `deposit(uint256,address)` — `0x6e553f65`
  - `withdraw(uint256,address,address)` — `0xb460af94`
  - `mint(uint256,address)` — `0x94bf804d`
  - `redeem(uint256,address,address)` — `0xba087652`
- [x] Add Yearn V3 Katana contracts to `KNOWN_CONTRACTS`:
  - `0x4671394A28FF147cfcBc9c2b1aab9d3883597417` — Yearn Role Manager
  - `0x1f399808fE52d0E960CAB84b6b54d5707ab27c8a` — Yearn Accountant
  - `0x770D0d1Fb036483Ed4AbB6d53c1C88fb277D812F` — Yearn VaultFactory
  - `0xD377919FA87120584B21279a491F82D5265A139c` — Yearn TokenizedStrategy
  - `0x1112dbCF805682e828606f74AB717abf4b4FD8DE` — Yearn 4626 Router
  - `0xd40ecF29e001c76Dcc4cC0D9cd50520CE845B038` — Yearn V3 Registry
- [x] Add summarizer cases in `src/summarizer.ts` for `deposit`/`withdraw`/`mint`/`redeem`:
  - Disambiguate from WETH `deposit` (different selector — no collision)
  - Use `contractName?.includes('Yearn')` to attribute to Yearn
  - Example outputs:
    - `"Deposited 1,000.00 USDC to Yearn Vault"`
    - `"Withdrew 500.00 DAI from Yearn Vault"`
    - `"Redeemed 100 shares from Yearn Vault"`

### 2. Morpho Enhancement

- [x] Update Katana contract names to match official docs:
  - `0xd3f39505...` — rename to `MetaMorpho V1.1 Factory` (currently `MetaMorpho Factory`)
  - `0xa8c5e23c...` — rename to `Morpho Bundler3` (currently `Morpho Bundler`)
- [x] Add ERC4626 vault detection for MetaMorpho vaults:
  - MetaMorpho vaults use same ERC4626 `deposit`/`withdraw`/`mint`/`redeem` selectors as Yearn
  - Summarizer disambiguates via `contractName?.includes('MetaMorpho')` or `contractName?.includes('Morpho')`
  - Example: `"Deposited 1,000.00 USDC to MetaMorpho Vault"`
- [x] Add `createMarket` selector for Morpho market creation events

### 3. SushiSwap — Verify & Confirm

- [x] Verify existing Katana SushiSwap addresses match official docs (they do — confirmed):
  - V2Factory: `0x72D111b4...`
  - V2Router: `0x69cC3499...`
  - V3Factory: `0x203e8740...`
  - V3PositionManager: `0x2659C608...`
  - V3SwapRouter: `0x4e1d81A3...`
- [x] No code changes needed — existing support is complete for swaps via RouteProcessor + V2/V3

### 4. 0xTrails Checkout Integration

- [x] 0xTrails (by Sequence) is an **intent-based off-chain orchestration protocol** — it does NOT have traditional on-chain contracts
- [x] On-chain footprint is standard token transfers/approvals/swaps routed through existing DEX/bridge infra
- [x] **Approach:** Detect Trails transactions by identifying the Trails intent executor contract (address TBD — not yet public)
- [x] **For now:** Add a placeholder comment in `KNOWN_CONTRACTS` for future Trails contract addresses
- [x] **Follow-up:** Once Trails publishes executor contract addresses, add detection for:
  - Intent execution transactions
  - Cross-chain payment settlements
  - Example output: `"Paid 50.00 USDC via Trails Checkout"`

## Context

### Architecture

All changes go in two files:
- **`src/decoder.ts`** — Add selectors (lines ~10-109), contracts (lines ~112-299), tokens (lines ~302-381)
- **`src/summarizer.ts`** — Add cases in the `switch (functionName)` block (lines ~110-378)

### Key Collision to Handle

Both Yearn V3 and MetaMorpho vaults use ERC4626 selectors (`deposit`, `withdraw`, `mint`, `redeem`). The summarizer must disambiguate by checking `contractName`:
1. Check `contractName?.includes('Yearn')` → "Yearn Vault"
2. Check `contractName?.includes('Morpho')` or `contractName?.includes('MetaMorpho')` → "MetaMorpho Vault"
3. Fallback → "Vault" (generic ERC4626)

### No Tests Exist

The project has no test suite. All changes will need manual verification against real Katana transactions.

## References

- [Yearn V3 Contracts](https://docs.yearn.fi/developers/addresses/v3-contracts) — Katana chain ID `747474`
- [Katana Contract Addresses](https://docs.katana.network/katana/technical-reference/contract-addresses/)
- [0xTrails Docs](https://docs.trails.build/intro) — Intent-based checkout by Sequence
- [Yearn V3 Tech Spec](https://github.com/yearn/yearn-vaults-v3/blob/master/TECH_SPEC.md)
