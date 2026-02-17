import { formatEther, formatUnits } from 'viem';
import type { DecodedTx, Transfer, NFTTransfer } from './decoder.js';
import { getTokenInfo } from './decoder.js';

function formatAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatAmount(amount: string, symbol: string): string {
  const num = parseFloat(amount);
  if (num === 0) return `0 ${symbol}`;
  if (num < 0.0001) return `<0.0001 ${symbol}`;
  if (num < 1) return `${num.toFixed(4)} ${symbol}`;
  if (num < 1000) return `${num.toFixed(2)} ${symbol}`;
  if (num < 1_000_000) return `${(num / 1000).toFixed(2)}K ${symbol}`;
  return `${(num / 1_000_000).toFixed(2)}M ${symbol}`;
}

function identifySwap(transfers: Transfer[], from: string): { in: Transfer; out: Transfer } | null {
  const fromLower = from.toLowerCase();
  
  const sent = transfers.find(t => t.from.toLowerCase() === fromLower);
  const received = transfers.find(t => t.to.toLowerCase() === fromLower);
  
  if (sent && received && sent.token.toLowerCase() !== received.token.toLowerCase()) {
    return { out: sent, in: received };
  }
  
  return null;
}

function summarizeNFTTransfer(nft: NFTTransfer, from: string, to: string | null): string {
  const collectionName = nft.contractName || formatAddress(nft.contract);
  const isMint = nft.from.toLowerCase() === '0x0000000000000000000000000000000000000000';
  const isBurn = nft.to.toLowerCase() === '0x0000000000000000000000000000000000000000';
  
  if (isMint) {
    return `Minted ${collectionName} #${nft.tokenId}`;
  }
  if (isBurn) {
    return `Burned ${collectionName} #${nft.tokenId}`;
  }
  
  // Check if user is sender or receiver
  const userIsSender = nft.from.toLowerCase() === from.toLowerCase();
  const userIsReceiver = nft.to.toLowerCase() === from.toLowerCase();
  
  if (userIsReceiver && !userIsSender) {
    return `Received ${collectionName} #${nft.tokenId}`;
  }
  
  if (nft.standard === 'ERC1155' && nft.amount > 1n) {
    return `Transferred ${nft.amount.toString()}x ${collectionName} #${nft.tokenId} → ${formatAddress(nft.to)}`;
  }
  
  return `Transferred ${collectionName} #${nft.tokenId} → ${formatAddress(nft.to)}`;
}

export function summarize(decoded: DecodedTx): string {
  const { from, to, value, functionName, contractName, isContractCreation, status, transfers, nftTransfers } = decoded;
  
  // Status prefix for failed txs
  const statusPrefix = status === 'failed' ? '❌ FAILED: ' : '';
  
  // Contract creation
  if (isContractCreation) {
    return `${statusPrefix}Deployed new contract`;
  }
  
  // NFT transfers take priority (except for swaps)
  if (nftTransfers.length > 0 && functionName !== 'execute' && functionName !== 'multicall') {
    // Check for NFT purchase (has ETH value or token transfer + NFT received)
    const nftReceived = nftTransfers.find(n => n.to.toLowerCase() === from.toLowerCase());
    
    if (nftReceived && (value > 0n || transfers.some(t => t.from.toLowerCase() === from.toLowerCase()))) {
      const collection = nftReceived.contractName || formatAddress(nftReceived.contract);
      if (value > 0n) {
        return `${statusPrefix}Bought ${collection} #${nftReceived.tokenId} for ${formatAmount(formatEther(value), 'ETH')}`;
      }
      const payment = transfers.find(t => t.from.toLowerCase() === from.toLowerCase());
      if (payment) {
        return `${statusPrefix}Bought ${collection} #${nftReceived.tokenId} for ${formatAmount(payment.amount, payment.tokenSymbol)}`;
      }
    }
    
    // Simple NFT transfer
    if (nftTransfers.length === 1) {
      return `${statusPrefix}${summarizeNFTTransfer(nftTransfers[0], from, to)}`;
    }
    
    // Multiple NFT transfers
    return `${statusPrefix}Transferred ${nftTransfers.length} NFTs`;
  }
  
  // Native ETH transfer (no data)
  if ((!functionName || functionName === 'native transfer') && value > 0n) {
    const ethAmount = formatAmount(formatEther(value), 'ETH');
    return `${statusPrefix}Sent ${ethAmount} → ${formatAddress(to!)}`;
  }
  
  // ERC4626 vault operations (detect before swap — vault deposits look like swaps)
  if (functionName === 'deposit' || functionName === 'mint' || functionName === 'redeem' || functionName === 'withdraw') {
    const ZERO = '0x0000000000000000000000000000000000000000';
    const fromLower = from.toLowerCase();
    const minted = transfers.find(t => t.from.toLowerCase() === ZERO && t.to.toLowerCase() === fromLower);
    const burned = transfers.find(t => t.to.toLowerCase() === ZERO && t.from.toLowerCase() === fromLower);
    const isVaultDeposit = (functionName === 'deposit' || functionName === 'mint') && minted;
    const isVaultWithdraw = (functionName === 'withdraw' || functionName === 'redeem') && burned;

    if (isVaultDeposit) {
      const deposited = transfers.find(t => t.from.toLowerCase() === fromLower && t.to.toLowerCase() !== ZERO);
      const vaultName = contractName || 'vault';
      // ERC4626 shares use same decimals as underlying asset
      const underlyingDecimals = deposited ? getTokenInfo(deposited.token).decimals : 18;
      const sharesFormatted = formatAmount(formatUnits(minted.rawAmount, underlyingDecimals), 'shares');
      if (deposited) {
        return `${statusPrefix}Deposited ${formatAmount(deposited.amount, deposited.tokenSymbol)} to ${vaultName} → received ${sharesFormatted}`;
      }
      return `${statusPrefix}Deposited to ${vaultName} → received ${sharesFormatted}`;
    }

    if (isVaultWithdraw) {
      const received = transfers.find(t => t.to.toLowerCase() === fromLower && t.from.toLowerCase() !== ZERO);
      const vaultName = contractName || 'vault';
      const underlyingDecimals = received ? getTokenInfo(received.token).decimals : 18;
      const burnedFormatted = formatAmount(formatUnits(burned.rawAmount, underlyingDecimals), 'shares');
      if (received) {
        return `${statusPrefix}Withdrew ${formatAmount(received.amount, received.tokenSymbol)} from ${vaultName} (burned ${burnedFormatted})`;
      }
      return `${statusPrefix}Withdrew from ${vaultName} (burned ${burnedFormatted})`;
    }
  }

  // Check for swap patterns
  const swap = identifySwap(transfers, from);
  if (swap) {
    const inAmt = formatAmount(swap.in.amount, swap.in.tokenSymbol);
    const outAmt = formatAmount(swap.out.amount, swap.out.tokenSymbol);
    const via = contractName || 'DEX';
    return `${statusPrefix}Swapped ${outAmt} → ${inAmt} via ${via}`;
  }
  
  // Specific function handlers
  switch (functionName) {
    // Approvals
    case 'approve': {
      const targetName = contractName || formatAddress(to!);
      // Try to find which token from the tx target
      if (transfers.length > 0) {
        return `${statusPrefix}Approved ${transfers[0].tokenSymbol} for ${targetName}`;
      }
      return `${statusPrefix}Approved token for ${targetName}`;
    }
    
    case 'setApprovalForAll': {
      const targetName = contractName || formatAddress(to!);
      return `${statusPrefix}Approved all NFTs for ${targetName}`;
    }
    
    // WETH wrap/unwrap + ERC4626 vault deposit/withdraw
    case 'deposit': {
      if (value > 0n && (contractName === 'WETH' || to?.toLowerCase() === '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2')) {
        const ethAmount = formatAmount(formatEther(value), 'ETH');
        return `${statusPrefix}Wrapped ${ethAmount} → WETH`;
      }
      // ERC4626 vault deposit (Yearn V3, MetaMorpho)
      const depositVault = contractName?.includes('Yearn') ? 'Yearn Vault' :
                           contractName?.includes('MetaMorpho') ? 'MetaMorpho Vault' :
                           contractName?.includes('Morpho') ? 'Morpho Vault' : null;
      if (depositVault) {
        const transfer = transfers.find(t => t.from.toLowerCase() === from.toLowerCase());
        if (transfer) {
          return `${statusPrefix}Deposited ${formatAmount(transfer.amount, transfer.tokenSymbol)} to ${depositVault}`;
        }
        return `${statusPrefix}Deposited to ${depositVault}`;
      }
      break;
    }
    case 'withdraw': {
      if (contractName === 'WETH' || to?.toLowerCase() === '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2') {
        const transfer = transfers.find(t => t.tokenSymbol === 'WETH');
        if (transfer) {
          return `${statusPrefix}Unwrapped ${formatAmount(transfer.amount, 'WETH')} → ETH`;
        }
        return `${statusPrefix}Unwrapped WETH → ETH`;
      }
      // ERC4626 vault withdraw (Yearn V3, MetaMorpho)
      const withdrawVault = contractName?.includes('Yearn') ? 'Yearn Vault' :
                            contractName?.includes('MetaMorpho') ? 'MetaMorpho Vault' :
                            contractName?.includes('Morpho') ? 'Morpho Vault' : null;
      if (withdrawVault) {
        const transfer = transfers.find(t => t.to.toLowerCase() === from.toLowerCase());
        if (transfer) {
          return `${statusPrefix}Withdrew ${formatAmount(transfer.amount, transfer.tokenSymbol)} from ${withdrawVault}`;
        }
        return `${statusPrefix}Withdrew from ${withdrawVault}`;
      }
      break;
    }
    
    // ERC4626 vault mint/redeem (Yearn V3, MetaMorpho)
    case 'mint': {
      const mintVault = contractName?.includes('Yearn') ? 'Yearn Vault' :
                        contractName?.includes('MetaMorpho') ? 'MetaMorpho Vault' :
                        contractName?.includes('Morpho') ? 'Morpho Vault' : null;
      if (mintVault) {
        const transfer = transfers.find(t => t.from.toLowerCase() === from.toLowerCase());
        if (transfer) {
          return `${statusPrefix}Deposited ${formatAmount(transfer.amount, transfer.tokenSymbol)} to ${mintVault}`;
        }
        return `${statusPrefix}Minted shares from ${mintVault}`;
      }
      break;
    }

    case 'redeem': {
      const redeemVault = contractName?.includes('Yearn') ? 'Yearn Vault' :
                          contractName?.includes('MetaMorpho') ? 'MetaMorpho Vault' :
                          contractName?.includes('Morpho') ? 'Morpho Vault' : null;
      if (redeemVault) {
        const transfer = transfers.find(t => t.to.toLowerCase() === from.toLowerCase());
        if (transfer) {
          return `${statusPrefix}Redeemed ${formatAmount(transfer.amount, transfer.tokenSymbol)} from ${redeemVault}`;
        }
        return `${statusPrefix}Redeemed shares from ${redeemVault}`;
      }
      break;
    }

    // Morpho market creation
    case 'createMarket': {
      return `${statusPrefix}Created new Morpho market`;
    }

    // Aave / Morpho / Lending
    case 'supply':
    case 'supplyCollateral': {
      const protocol = contractName?.includes('Morpho') ? 'Morpho' :
                       contractName?.includes('MetaMorpho') ? 'Morpho' :
                       contractName?.includes('Aave') ? 'Aave' : 
                       contractName?.includes('Compound') ? 'Compound' : 
                       contractName?.includes('Spark') ? 'Spark' : 
                       contractName || 'lending protocol';
      const transfer = transfers.find(t => t.from.toLowerCase() === from.toLowerCase());
      if (transfer) {
        return `${statusPrefix}Supplied ${formatAmount(transfer.amount, transfer.tokenSymbol)} to ${protocol}`;
      }
      return `${statusPrefix}Supplied to ${protocol}`;
    }
    
    case 'borrow': {
      const protocol = contractName?.includes('Morpho') ? 'Morpho' :
                       contractName?.includes('MetaMorpho') ? 'Morpho' :
                       contractName?.includes('Aave') ? 'Aave' : 
                       contractName?.includes('Compound') ? 'Compound' : 
                       contractName?.includes('Spark') ? 'Spark' : 
                       contractName || 'lending protocol';
      const transfer = transfers.find(t => t.to.toLowerCase() === from.toLowerCase());
      if (transfer) {
        return `${statusPrefix}Borrowed ${formatAmount(transfer.amount, transfer.tokenSymbol)} from ${protocol}`;
      }
      return `${statusPrefix}Borrowed from ${protocol}`;
    }
    
    case 'repay': {
      const protocol = contractName?.includes('Morpho') ? 'Morpho' :
                       contractName?.includes('MetaMorpho') ? 'Morpho' :
                       contractName?.includes('Aave') ? 'Aave' : 
                       contractName?.includes('Compound') ? 'Compound' : 
                       contractName?.includes('Spark') ? 'Spark' : 
                       contractName || 'lending protocol';
      const transfer = transfers.find(t => t.from.toLowerCase() === from.toLowerCase());
      if (transfer) {
        return `${statusPrefix}Repaid ${formatAmount(transfer.amount, transfer.tokenSymbol)} to ${protocol}`;
      }
      return `${statusPrefix}Repaid ${protocol} loan`;
    }
    
    case 'withdrawCollateral': {
      const protocol = contractName?.includes('Morpho') ? 'Morpho' : contractName || 'lending protocol';
      const transfer = transfers.find(t => t.to.toLowerCase() === from.toLowerCase());
      if (transfer) {
        return `${statusPrefix}Withdrew ${formatAmount(transfer.amount, transfer.tokenSymbol)} collateral from ${protocol}`;
      }
      return `${statusPrefix}Withdrew collateral from ${protocol}`;
    }
    
    case 'liquidate':
    case 'liquidationCall': {
      const protocol = contractName?.includes('Morpho') ? 'Morpho' : contractName || 'lending protocol';
      return `${statusPrefix}Liquidated position on ${protocol}`;
    }
    
    case 'flashLoan': {
      const protocol = contractName?.includes('Morpho') ? 'Morpho' : contractName || 'lending protocol';
      return `${statusPrefix}Executed flash loan on ${protocol}`;
    }
    
    // Sushi RouteProcessor
    case 'processRoute':
    case 'transferValueAndprocessRoute': {
      const swapPattern = identifySwap(transfers, from);
      if (swapPattern) {
        const inAmt = formatAmount(swapPattern.in.amount, swapPattern.in.tokenSymbol);
        const outAmt = formatAmount(swapPattern.out.amount, swapPattern.out.tokenSymbol);
        return `${statusPrefix}Swapped ${outAmt} → ${inAmt} via ${contractName || 'Sushi'}`;
      }
      return `${statusPrefix}Swapped via ${contractName || 'Sushi'}`;
    }
    
    // Transfers
    case 'transfer': {
      const transfer = transfers[0];
      if (transfer) {
        return `${statusPrefix}Sent ${formatAmount(transfer.amount, transfer.tokenSymbol)} → ${formatAddress(transfer.to)}`;
      }
      break;
    }
    
    case 'transferFrom': {
      const transfer = transfers[0];
      if (transfer) {
        // Check if this is a token transfer or NFT
        if (nftTransfers.length > 0) {
          return `${statusPrefix}${summarizeNFTTransfer(nftTransfers[0], from, to)}`;
        }
        return `${statusPrefix}Sent ${formatAmount(transfer.amount, transfer.tokenSymbol)} → ${formatAddress(transfer.to)}`;
      }
      break;
    }
    
    // NFT transfers
    case 'safeTransferFrom': {
      if (nftTransfers.length > 0) {
        return `${statusPrefix}${summarizeNFTTransfer(nftTransfers[0], from, to)}`;
      }
      return `${statusPrefix}Transferred NFT`;
    }
    
    case 'safeBatchTransferFrom': {
      if (nftTransfers.length > 0) {
        return `${statusPrefix}Transferred ${nftTransfers.length} NFTs`;
      }
      return `${statusPrefix}Batch transferred NFTs`;
    }
    
    // OpenSea / NFT Marketplace
    case 'fulfillBasicOrder':
    case 'fulfillOrder':
    case 'fulfillAdvancedOrder': {
      if (nftTransfers.length > 0) {
        const nftReceived = nftTransfers.find(n => n.to.toLowerCase() === from.toLowerCase());
        if (nftReceived) {
          const collection = nftReceived.contractName || formatAddress(nftReceived.contract);
          if (value > 0n) {
            return `${statusPrefix}Bought ${collection} #${nftReceived.tokenId} for ${formatAmount(formatEther(value), 'ETH')} on OpenSea`;
          }
        }
      }
      return `${statusPrefix}Executed trade on OpenSea`;
    }
    
    // Liquidity
    case 'addLiquidity':
    case 'addLiquidityETH': {
      const dex = contractName || 'DEX';
      if (transfers.length >= 2) {
        return `${statusPrefix}Added ${transfers[0].tokenSymbol}/${transfers[1].tokenSymbol} liquidity to ${dex}`;
      }
      return `${statusPrefix}Added liquidity to ${dex}`;
    }
    
    case 'removeLiquidity':
    case 'removeLiquidityETH': {
      const dex = contractName || 'DEX';
      if (transfers.length >= 2) {
        return `${statusPrefix}Removed ${transfers[0].tokenSymbol}/${transfers[1].tokenSymbol} liquidity from ${dex}`;
      }
      return `${statusPrefix}Removed liquidity from ${dex}`;
    }
    
    // Uniswap/DEX multicall / execute
    case 'multicall':
    case 'execute': {
      // Re-check for swap pattern in case it wasn't caught earlier
      const swapPattern = identifySwap(transfers, from);
      if (swapPattern) {
        const inAmt = formatAmount(swapPattern.in.amount, swapPattern.in.tokenSymbol);
        const outAmt = formatAmount(swapPattern.out.amount, swapPattern.out.tokenSymbol);
        return `${statusPrefix}Swapped ${outAmt} → ${inAmt} via ${contractName || 'DEX'}`;
      }
      
      // Check for NFT trades in execute
      if (nftTransfers.length > 0) {
        const nftReceived = nftTransfers.find(n => n.to.toLowerCase() === from.toLowerCase());
        if (nftReceived && (value > 0n || transfers.some(t => t.from.toLowerCase() === from.toLowerCase()))) {
          const collection = nftReceived.contractName || formatAddress(nftReceived.contract);
          if (value > 0n) {
            return `${statusPrefix}Bought ${collection} #${nftReceived.tokenId} for ${formatAmount(formatEther(value), 'ETH')}`;
          }
        }
      }
      
      // Check for multiple transfers
      if (transfers.length > 0) {
        const received = transfers.filter(t => t.to.toLowerCase() === from.toLowerCase());
        if (received.length > 0) {
          const r = received[0];
          return `${statusPrefix}Received ${formatAmount(r.amount, r.tokenSymbol)} via ${contractName || 'router'}`;
        }
      }
      break;
    }
    
    // Swaps
    case 'swapExactETHForTokens':
    case 'swapETHForExactTokens': {
      const received = transfers.find(t => t.to.toLowerCase() === from.toLowerCase());
      if (received && value > 0n) {
        return `${statusPrefix}Swapped ${formatAmount(formatEther(value), 'ETH')} → ${formatAmount(received.amount, received.tokenSymbol)} via ${contractName || 'DEX'}`;
      }
      break;
    }
    
    case 'swapExactTokensForETH':
    case 'swapTokensForExactETH': {
      const sent = transfers.find(t => t.from.toLowerCase() === from.toLowerCase());
      if (sent) {
        const ethReceived = transfers.find(t => t.tokenSymbol === 'WETH' && t.to.toLowerCase() === from.toLowerCase());
        if (ethReceived) {
          return `${statusPrefix}Swapped ${formatAmount(sent.amount, sent.tokenSymbol)} → ${formatAmount(ethReceived.amount, 'ETH')} via ${contractName || 'DEX'}`;
        }
      }
      break;
    }
    
    case 'swapExactTokensForTokens':
    case 'exactInputSingle':
    case 'exactInput':
    case 'exactOutputSingle':
    case 'exactOutput':
    case 'swap':
    case 'uniswapV3Swap':
    case 'unoswap': {
      const swapPattern = identifySwap(transfers, from);
      if (swapPattern) {
        const inAmt = formatAmount(swapPattern.in.amount, swapPattern.in.tokenSymbol);
        const outAmt = formatAmount(swapPattern.out.amount, swapPattern.out.tokenSymbol);
        return `${statusPrefix}Swapped ${outAmt} → ${inAmt} via ${contractName || 'DEX'}`;
      }
      break;
    }
    
    // Bridge
    case 'depositETH':
    case 'bridgeETH': {
      if (value > 0n) {
        return `${statusPrefix}Bridged ${formatAmount(formatEther(value), 'ETH')} via ${contractName || 'bridge'}`;
      }
      break;
    }
    
    // Permit2
    case 'permit':
    case 'permitTransferFrom': {
      return `${statusPrefix}Signed permit for ${contractName || formatAddress(to!)}`;
    }
  }
  
  // Fallback: describe based on transfers
  if (transfers.length > 0) {
    const sent = transfers.filter(t => t.from.toLowerCase() === from.toLowerCase());
    const received = transfers.filter(t => t.to.toLowerCase() === from.toLowerCase());
    
    if (sent.length > 0 && received.length > 0) {
      const s = sent[0];
      const r = received[0];
      return `${statusPrefix}Exchanged ${formatAmount(s.amount, s.tokenSymbol)} for ${formatAmount(r.amount, r.tokenSymbol)}`;
    }
    
    if (sent.length > 0) {
      const s = sent[0];
      return `${statusPrefix}Sent ${formatAmount(s.amount, s.tokenSymbol)} → ${formatAddress(s.to)}`;
    }
    
    if (received.length > 0) {
      const r = received[0];
      return `${statusPrefix}Received ${formatAmount(r.amount, r.tokenSymbol)} from ${formatAddress(r.from)}`;
    }
  }
  
  // Generic fallback
  if (functionName && contractName) {
    return `${statusPrefix}Called ${functionName}() on ${contractName}`;
  }
  
  if (functionName) {
    return `${statusPrefix}Called ${functionName}() on ${formatAddress(to!)}`;
  }
  
  if (value > 0n) {
    return `${statusPrefix}Sent ${formatAmount(formatEther(value), 'ETH')} → ${formatAddress(to!)}`;
  }
  
  return `${statusPrefix}Interacted with ${contractName || formatAddress(to!)}`;
}
