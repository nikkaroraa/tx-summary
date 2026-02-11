import { formatEther } from 'viem';
import type { DecodedTx, Transfer } from './decoder.js';

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
  // Look for a pattern: user sends token A, receives token B
  const fromLower = from.toLowerCase();
  
  const sent = transfers.find(t => t.from.toLowerCase() === fromLower);
  const received = transfers.find(t => t.to.toLowerCase() === fromLower);
  
  if (sent && received && sent.token !== received.token) {
    return { out: sent, in: received };
  }
  
  return null;
}

export function summarize(decoded: DecodedTx): string {
  const { from, to, value, functionName, contractName, isContractCreation, status, transfers } = decoded;
  
  // Status prefix for failed txs
  const statusPrefix = status === 'failed' ? '❌ FAILED: ' : '';
  
  // Contract creation
  if (isContractCreation) {
    return `${statusPrefix}Deployed new contract`;
  }
  
  // Native ETH transfer (no data)
  if ((!functionName || functionName === 'native transfer') && value > 0n) {
    const ethAmount = formatAmount(formatEther(value), 'ETH');
    return `${statusPrefix}Sent ${ethAmount} → ${formatAddress(to!)}`;
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
      const transfer = transfers[0];
      if (transfer) {
        return `${statusPrefix}Approved ${transfer.tokenSymbol} for ${contractName || formatAddress(to!)}`;
      }
      return `${statusPrefix}Approved token for ${contractName || formatAddress(to!)}`;
    }
    
    // WETH wrap/unwrap
    case 'deposit': {
      if (value > 0n) {
        const ethAmount = formatAmount(formatEther(value), 'ETH');
        return `${statusPrefix}Wrapped ${ethAmount} → WETH`;
      }
      break;
    }
    case 'withdraw': {
      const transfer = transfers.find(t => t.tokenSymbol === 'WETH');
      if (transfer) {
        return `${statusPrefix}Unwrapped ${formatAmount(transfer.amount, 'WETH')} → ETH`;
      }
      break;
    }
    
    // Aave
    case 'supply': {
      const transfer = transfers.find(t => t.to.toLowerCase() !== from.toLowerCase());
      if (transfer) {
        return `${statusPrefix}Supplied ${formatAmount(transfer.amount, transfer.tokenSymbol)} to Aave`;
      }
      return `${statusPrefix}Supplied to Aave`;
    }
    case 'borrow': {
      const transfer = transfers.find(t => t.to.toLowerCase() === from.toLowerCase());
      if (transfer) {
        return `${statusPrefix}Borrowed ${formatAmount(transfer.amount, transfer.tokenSymbol)} from Aave`;
      }
      return `${statusPrefix}Borrowed from Aave`;
    }
    case 'repay': {
      const transfer = transfers.find(t => t.from.toLowerCase() === from.toLowerCase());
      if (transfer) {
        return `${statusPrefix}Repaid ${formatAmount(transfer.amount, transfer.tokenSymbol)} to Aave`;
      }
      return `${statusPrefix}Repaid Aave loan`;
    }
    
    // Transfers
    case 'transfer':
    case 'transferFrom': {
      const transfer = transfers[0];
      if (transfer) {
        return `${statusPrefix}Sent ${formatAmount(transfer.amount, transfer.tokenSymbol)} → ${formatAddress(transfer.to)}`;
      }
      break;
    }
    
    // NFT transfers
    case 'safeTransferFrom': {
      return `${statusPrefix}Transferred NFT → ${formatAddress(to!)}`;
    }
    
    // Uniswap multicall / execute
    case 'multicall':
    case 'execute': {
      // Re-check for swap pattern in case it wasn't caught earlier
      const swapPattern = identifySwap(transfers, from);
      if (swapPattern) {
        const inAmt = formatAmount(swapPattern.in.amount, swapPattern.in.tokenSymbol);
        const outAmt = formatAmount(swapPattern.out.amount, swapPattern.out.tokenSymbol);
        return `${statusPrefix}Swapped ${outAmt} → ${inAmt} via ${contractName || 'Uniswap'}`;
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
