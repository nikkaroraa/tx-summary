#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { summarizeTx } from './api.js';
import { getExplorerUrl, CHAINS } from './chains.js';

const program = new Command();

program
  .name('tx-summary')
  .description('Summarize blockchain transactions in plain English')
  .version('1.0.0')
  .argument('<hash>', 'Transaction hash to summarize')
  .option('-c, --chain <name>', 'Chain name (ethereum, katana)', 'ethereum')
  .option('-r, --rpc <url>', 'Custom RPC URL')
  .option('-v, --verbose', 'Show detailed output')
  .option('-j, --json', 'Output as JSON')
  .action(async (hash: string, options) => {
    try {
      // Validate hash format
      if (!hash.startsWith('0x') || hash.length !== 66) {
        console.error(chalk.red('Error: Invalid transaction hash format'));
        console.error(chalk.gray('Expected: 0x followed by 64 hex characters'));
        process.exit(1);
      }

      // Validate chain
      if (!CHAINS[options.chain.toLowerCase()]) {
        console.error(chalk.red(`Error: Unknown chain "${options.chain}"`));
        console.error(chalk.gray(`Supported chains: ${Object.keys(CHAINS).join(', ')}`));
        process.exit(1);
      }

      if (options.verbose && !options.json) {
        console.log(chalk.gray(`Fetching tx from ${options.chain}...`));
      }

      const result = await summarizeTx(hash, {
        chain: options.chain,
        rpc: options.rpc,
      });

      if (options.json) {
        console.log(JSON.stringify({
          ...result,
          blockNumber: result.blockNumber?.toString(),
          transfers: result.transfers.map(t => ({
            token: t.token,
            symbol: t.tokenSymbol,
            from: t.from,
            to: t.to,
            amount: t.amount,
          })),
          nftTransfers: result.nftTransfers.map(n => ({
            contract: n.contract,
            name: n.contractName,
            tokenId: n.tokenId,
            from: n.from,
            to: n.to,
            standard: n.standard,
          })),
        }, null, 2));
        return;
      }

      // Status color
      const statusColor = result.status === 'success'
        ? chalk.green
        : result.status === 'failed'
          ? chalk.red
          : chalk.yellow;

      // Main output
      console.log();
      console.log(chalk.bold(result.summary));

      if (options.verbose) {
        console.log();
        console.log(chalk.gray('─'.repeat(50)));
        console.log(chalk.gray('Hash:     ') + chalk.cyan(result.hash));
        console.log(chalk.gray('From:     ') + result.from);
        console.log(chalk.gray('To:       ') + (result.to || chalk.italic('Contract Creation')));
        console.log(chalk.gray('Status:   ') + statusColor(result.status));
        if (result.value !== '0') {
          console.log(chalk.gray('Value:    ') + result.value + ' ETH');
        }
        if (result.blockNumber) {
          console.log(chalk.gray('Block:    ') + result.blockNumber.toString());
        }
        if (result.timestamp) {
          console.log(chalk.gray('Time:     ') + new Date(result.timestamp * 1000).toISOString());
        }
        console.log(chalk.gray('Nonce:    ') + result.nonce);
        if (result.gasCost) {
          console.log(chalk.gray('Gas cost: ') + result.gasCost + ' ETH' + (result.gasUsed ? chalk.gray(` (${result.gasUsed} gas)`) : ''));
        }
        if (result.functionName && result.functionName !== 'native transfer') {
          console.log(chalk.gray('Function: ') + result.functionName + (result.contractName ? chalk.gray(` on ${result.contractName}`) : ''));
        }

        // Show token transfers
        if (result.transfers.length > 0) {
          console.log();
          console.log(chalk.gray('Token Transfers:'));
          for (const t of result.transfers) {
            const amt = parseFloat(t.amount);
            const fmtAmt = amt < 0.0001 ? '<0.0001' : amt < 1 ? amt.toFixed(4) : amt < 1000 ? amt.toFixed(2) : amt.toLocaleString('en-US', { maximumFractionDigits: 2 });
            console.log(chalk.gray('  ') + `${fmtAmt} ${t.tokenSymbol}  ${t.from.slice(0,8)}… → ${t.to.slice(0,8)}…`);
          }
        }

        // Show NFT transfers
        if (result.nftTransfers.length > 0) {
          console.log();
          console.log(chalk.gray('NFT Transfers:'));
          for (const n of result.nftTransfers) {
            const name = n.contractName || n.contract.slice(0, 10) + '…';
            console.log(chalk.gray('  ') + `${name} #${n.tokenId}  ${n.from.slice(0,8)}… → ${n.to.slice(0,8)}…`);
          }
        }

        const explorerUrl = getExplorerUrl(options.chain, hash);
        if (explorerUrl) {
          console.log();
          console.log(chalk.gray('Explorer: ') + chalk.blue.underline(explorerUrl));
        }
      }
      console.log();

    } catch (error) {
      if (error instanceof Error) {
        console.error(chalk.red('Error:'), error.message);
      } else {
        console.error(chalk.red('Error:'), error);
      }
      process.exit(1);
    }
  });

program.parse();
