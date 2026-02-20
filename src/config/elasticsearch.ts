import { Client } from '@elastic/elasticsearch';
import dotenv from 'dotenv';
import { WALLET_TX_INDEX_MAPPING, WALLET_SUMMARY_INDEX_MAPPING } from '../types/wallet';

dotenv.config();

const ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';

export const esClient = new Client({
  node: ELASTICSEARCH_URL,
    auth: {
        apiKey: process.env.ELASTIC_API_KEY || '',
    },
});

export const WALLET_TX_INDEX = 'wallet-transactions';
export const WALLET_SUMMARY_INDEX = 'wallet-summaries';

/** Ensure index exists with correct mappings, or update mappings if index already exists */
async function ensureIndex(index: string, config: { mappings: any; settings: any }) {
  try {
    const exists = await esClient.indices.exists({ index });
    if (!exists) {
      // For serverless, some settings (like number_of_shards) may not be supported
      try {
        await esClient.indices.create({ index, body: config });
      } catch (createErr: any) {
        // If settings fail in serverless, try without settings
        if (createErr?.message?.includes('settings') || createErr?.meta?.statusCode === 400) {
          console.log(`Retrying index creation for ${index} without settings (serverless mode)...`);
          await esClient.indices.create({ index, body: { mappings: config.mappings } });
        } else {
          throw createErr;
        }
      }
      console.log(`Created index: ${index}`);
    } else {
      // Update mappings on existing index to pick up new fields
      try {
        await esClient.indices.putMapping({ index, body: config.mappings });
        console.log(`Updated mappings for: ${index}`);
      } catch (mapErr: any) {
        // putMapping may fail if field types conflict; log but don't crash
        console.warn(`Could not update mappings for ${index}: ${mapErr?.message?.substring(0, 200)}`);
      }
    }
  } catch (error) {
    console.error(`Failed to ensure index ${index}:`, error);
  }
}

// Test connection and ensure indices
export async function testConnection(): Promise<boolean> {
  try {
    // Try standard cluster health first, fall back to info() for serverless
    try {
      const health = await esClient.cluster.health();
      console.log('Elasticsearch connection successful:', health.status);
    } catch (healthErr: any) {
      if (healthErr?.meta?.statusCode === 410) {
        // Serverless mode - _cluster/health not available
        const info = await esClient.info();
        console.log('Elasticsearch (serverless) connection successful:', info.version.number);
      } else {
        throw healthErr;
      }
    }

    // Ensure indices have correct mappings
    await ensureIndex(WALLET_TX_INDEX, WALLET_TX_INDEX_MAPPING);
    await ensureIndex(WALLET_SUMMARY_INDEX, WALLET_SUMMARY_INDEX_MAPPING);

    return true;
  } catch (error) {
    console.error('Failed to connect to Elasticsearch:', error);
    return false;
  }
}
