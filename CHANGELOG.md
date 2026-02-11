# Changelog

## [1.0.0] - 2026-02-11

### Added
- Initial release
- CLI with `--chain`, `--rpc`, `--verbose`, `--json` flags
- Programmatic API: `summarizeTx()`, `decodeTx()`, `getClient()`
- Ethereum mainnet + Katana chain support

### Detection
- ERC20 transfers with proper decimals
- Token approvals
- Swaps via 20+ DEX routers
- Aave/Compound/Spark lending actions
- WETH wrap/unwrap
- ERC721/ERC1155 NFT transfers
- NFT marketplace trades (OpenSea, Blur, etc.)
- Liquidity add/remove
- Contract deployments

### Registry
- 100+ known contract names
- 50+ token symbols with decimals
- Popular NFT collection names
