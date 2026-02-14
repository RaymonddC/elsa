import { Client } from '@elastic/elasticsearch';
import dotenv from 'dotenv';

dotenv.config();

const ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';

export const esClient = new Client({
  node: ELASTICSEARCH_URL,
});

export const WALLET_TX_INDEX = 'wallet-transactions';
export const WALLET_SUMMARY_INDEX = 'wallet-summaries';

// Test connection
export async function testConnection(): Promise<boolean> {
  try {
    const health = await esClient.cluster.health();
    console.log('Elasticsearch connection successful:', health.status);
    return true;
  } catch (error) {
    console.error('Failed to connect to Elasticsearch:', error);
    return false;
  }
}
