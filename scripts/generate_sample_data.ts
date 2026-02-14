/**
 * Generate sample wallet data for demo purposes
 *
 * Fetches real data from blockchain.info for a well-known address
 * and indexes it into Elasticsearch.
 */

import { esClient, WALLET_TX_INDEX, WALLET_SUMMARY_INDEX } from '../src/config/elasticsearch';
import { fetchWalletFromBlockchain, satoshiToBTC } from '../src/services/blockchain';
import { WALLET_TX_INDEX_MAPPING, WALLET_SUMMARY_INDEX_MAPPING } from '../src/types/wallet';

// Satoshi Nakamoto's genesis address (well-known, many transactions)
const SAMPLE_ADDRESS = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';

async function generateSampleData() {
  console.log('Fetching sample wallet data from blockchain.info...');
  console.log(`Address: ${SAMPLE_ADDRESS}\n`);

  // Ensure indices exist
  for (const [index, mapping] of [
    [WALLET_TX_INDEX, WALLET_TX_INDEX_MAPPING],
    [WALLET_SUMMARY_INDEX, WALLET_SUMMARY_INDEX_MAPPING],
  ] as const) {
    const exists = await esClient.indices.exists({ index });
    if (!exists) {
      await esClient.indices.create({ index, body: mapping });
      console.log(`Created index: ${index}`);
    }
  }

  // Fetch from blockchain.info
  const data = await fetchWalletFromBlockchain(SAMPLE_ADDRESS, 50, 0);

  console.log(`Fetched ${data.txs.length} transactions`);
  console.log(`Balance: ${satoshiToBTC(data.final_balance)} BTC`);
  console.log(`Total received: ${satoshiToBTC(data.total_received)} BTC`);
  console.log(`Total sent: ${satoshiToBTC(data.total_sent)} BTC`);

  // Transform and index transactions
  const transactions = data.txs.map((tx) => {
    const isIncoming = tx.result > 0;
    return {
      tx_hash: tx.hash,
      address: SAMPLE_ADDRESS,
      time: new Date(tx.time * 1000).toISOString(),
      direction: isIncoming ? 'incoming' : 'outgoing',
      value_btc: satoshiToBTC(Math.abs(tx.result)),
      fee_btc: satoshiToBTC(tx.fee),
      input_count: tx.inputs.length,
      output_count: tx.out.length,
      input_addresses: tx.inputs
        .map((i: any) => i.prev_out?.addr)
        .filter(Boolean)
        .slice(0, 10),
      output_addresses: tx.out
        .map((o: any) => o.addr)
        .filter(Boolean)
        .slice(0, 10),
      block_height: tx.block_height,
    };
  });

  if (transactions.length > 0) {
    const bulkBody = transactions.flatMap((tx) => [
      { index: { _index: WALLET_TX_INDEX, _id: `${tx.address}_${tx.tx_hash}` } },
      tx,
    ]);

    const bulkResponse = await esClient.bulk({ body: bulkBody, refresh: true });

    if (bulkResponse.errors) {
      console.error('Bulk indexing had errors');
    } else {
      console.log(`Indexed ${transactions.length} transactions`);
    }
  }

  // Create wallet summary
  const summary = {
    address: SAMPLE_ADDRESS,
    n_tx: data.n_tx,
    total_received_btc: satoshiToBTC(data.total_received),
    total_sent_btc: satoshiToBTC(data.total_sent),
    final_balance_btc: satoshiToBTC(data.final_balance),
    first_seen: transactions.length > 0
      ? transactions.reduce((min, tx) => tx.time < min ? tx.time : min, transactions[0].time)
      : new Date().toISOString(),
    last_seen: transactions.length > 0
      ? transactions.reduce((max, tx) => tx.time > max ? tx.time : max, transactions[0].time)
      : new Date().toISOString(),
    last_updated: new Date().toISOString(),
  };

  await esClient.index({
    index: WALLET_SUMMARY_INDEX,
    id: SAMPLE_ADDRESS,
    body: summary,
    refresh: true,
  });

  console.log('\nWallet summary indexed');
  console.log('\nDone! Sample data is ready for analysis.');
}

async function main() {
  try {
    await generateSampleData();
  } catch (error) {
    console.error('Error generating sample data:', error);
    process.exit(1);
  } finally {
    await esClient.close();
  }
}

main();
