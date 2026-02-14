/**
 * Initialize Elasticsearch indices for wallet analysis
 * Run this before using the app: npm run init-index
 */

import { esClient, WALLET_TX_INDEX, WALLET_SUMMARY_INDEX } from '../src/config/elasticsearch';
import { WALLET_TX_INDEX_MAPPING, WALLET_SUMMARY_INDEX_MAPPING } from '../src/types/wallet';

async function initIndices() {
  try {
    console.log('Connecting to Elasticsearch...');

    // Initialize wallet-transactions index
    const txExists = await esClient.indices.exists({ index: WALLET_TX_INDEX });
    if (txExists) {
      console.log(`Index "${WALLET_TX_INDEX}" already exists. Deleting...`);
      await esClient.indices.delete({ index: WALLET_TX_INDEX });
    }

    console.log(`Creating index "${WALLET_TX_INDEX}" with mapping...`);
    await esClient.indices.create({
      index: WALLET_TX_INDEX,
      body: WALLET_TX_INDEX_MAPPING,
    });
    console.log(`Index "${WALLET_TX_INDEX}" created successfully!`);

    // Initialize wallet-summaries index
    const summaryExists = await esClient.indices.exists({ index: WALLET_SUMMARY_INDEX });
    if (summaryExists) {
      console.log(`Index "${WALLET_SUMMARY_INDEX}" already exists. Deleting...`);
      await esClient.indices.delete({ index: WALLET_SUMMARY_INDEX });
    }

    console.log(`Creating index "${WALLET_SUMMARY_INDEX}" with mapping...`);
    await esClient.indices.create({
      index: WALLET_SUMMARY_INDEX,
      body: WALLET_SUMMARY_INDEX_MAPPING,
    });
    console.log(`Index "${WALLET_SUMMARY_INDEX}" created successfully!`);

    // Verify health
    const health = await esClient.cluster.health({ index: `${WALLET_TX_INDEX},${WALLET_SUMMARY_INDEX}` });
    console.log(`\nCluster health: ${health.status}`);

    console.log('\nAll indices initialized successfully!');
  } catch (error) {
    console.error('Error initializing indices:', error);
    process.exit(1);
  } finally {
    await esClient.close();
  }
}

initIndices();
