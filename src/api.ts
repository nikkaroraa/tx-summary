import { type Hex, formatEther, formatUnits } from 'viem';
import { getClient } from './chains.js';
import { decodeTx, type Transfer, type NFTTransfer } from './decoder.js';
import { summarize } from './summarizer.js';

export interface SummarizeOptions {
  chain?: string;
  rpc?: string;
}

export interface SummaryResult {
  hash: string;
  summary: string;
  from: string;
  to: string | null;
  status: 'success' | 'failed' | 'pending';
  blockNumber: bigint | null;
  timestamp: number | null;
  value: string;
  gasUsed: string | null;
  gasCost: string | null;
  functionName: string | null;
  contractName: string | null;
  transfers: Transfer[];
  nftTransfers: NFTTransfer[];
  nonce: number;
}

/**
 * Summarize a transaction in plain English
 */
export async function summarizeTx(
  txHash: string,
  options: SummarizeOptions = {}
): Promise<SummaryResult> {
  const chain = options.chain || 'ethereum';
  const client = getClient(chain, options.rpc);

  const hash = txHash as Hex;

  // Fetch transaction and receipt in parallel
  const [tx, receipt] = await Promise.all([
    client.getTransaction({ hash }),
    client.getTransactionReceipt({ hash }).catch(() => undefined),
  ]);

  if (!tx) {
    throw new Error(`Transaction not found: ${txHash}`);
  }

  const decoded = decodeTx(
    {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: tx.value,
      input: tx.input,
      gasPrice: tx.gasPrice,
    },
    receipt
  );

  const summary = summarize(decoded);

  // Fetch block for timestamp
  let timestamp: number | null = null;
  if (tx.blockNumber) {
    try {
      const block = await client.getBlock({ blockNumber: tx.blockNumber });
      timestamp = Number(block.timestamp);
    } catch {}
  }

  // Calculate gas cost
  const gasUsed = receipt?.gasUsed ?? null;
  const effectiveGasPrice = receipt?.effectiveGasPrice ?? tx.gasPrice ?? null;
  const gasCost = gasUsed && effectiveGasPrice ? gasUsed * effectiveGasPrice : null;

  return {
    hash: tx.hash,
    summary,
    from: tx.from,
    to: tx.to,
    status: decoded.status,
    blockNumber: tx.blockNumber,
    timestamp,
    value: formatEther(tx.value),
    gasUsed: gasUsed?.toString() ?? null,
    gasCost: gasCost ? formatEther(gasCost) : null,
    functionName: decoded.functionName,
    contractName: decoded.contractName,
    transfers: decoded.transfers,
    nftTransfers: decoded.nftTransfers,
    nonce: tx.nonce,
  };
}
