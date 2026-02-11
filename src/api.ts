import { type Hex } from 'viem';
import { getClient } from './chains.js';
import { decodeTx } from './decoder.js';
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

  return {
    hash: tx.hash,
    summary,
    from: tx.from,
    to: tx.to,
    status: decoded.status,
    blockNumber: tx.blockNumber,
  };
}
