import { Client } from '@elastic/elasticsearch';
import dotenv from 'dotenv';
import { WALLET_TX_INDEX_MAPPING, WALLET_SUMMARY_INDEX_MAPPING } from '../types/wallet';

dotenv.config();

const ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';

export const esClient = new Client({
  node: ELASTICSEARCH_URL,
});

export const WALLET_TX_INDEX = 'wallet-transactions';
export const WALLET_SUMMARY_INDEX = 'wallet-summaries';

/** Ensure index exists with correct mappings, or update mappings if index already exists */
async function ensureIndex(index: string, config: { mappings: any; settings: any }) {
  try {
    const exists = await esClient.indices.exists({ index });
    if (!exists) {
      await esClient.indices.create({ index, body: config });
      console.log(`Created index: ${index}`);
    } else {
      // Update mappings on existing index to pick up new fields
      await esClient.indices.putMapping({ index, body: config.mappings });
      console.log(`Updated mappings for: ${index}`);
    }
  } catch (error) {
    console.error(`Failed to ensure index ${index}:`, error);
  }
}

// Test connection and ensure indices
export async function testConnection(): Promise<boolean> {
  try {
    const health = await esClient.cluster.health();
    console.log('Elasticsearch connection successful:', health.status);

    // Ensure indices have correct mappings
    await ensureIndex(WALLET_TX_INDEX, WALLET_TX_INDEX_MAPPING);
    await ensureIndex(WALLET_SUMMARY_INDEX, WALLET_SUMMARY_INDEX_MAPPING);

    return true;
  } catch (error) {
    console.error('Failed to connect to Elasticsearch:', error);
    return false;
  }
}
