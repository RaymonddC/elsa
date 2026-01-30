/**
 * Initialize Elasticsearch index with proper mapping
 * Run this before generating logs
 */

import { esClient, LOG_INDEX } from '../src/config/elasticsearch';
import { LOG_INDEX_MAPPING } from '../src/types/log';

async function initIndex() {
  try {
    console.log('Connecting to Elasticsearch...');

    // Check if index exists
    const indexExists = await esClient.indices.exists({ index: LOG_INDEX });

    if (indexExists) {
      console.log(`Index "${LOG_INDEX}" already exists. Deleting...`);
      await esClient.indices.delete({ index: LOG_INDEX });
    }

    // Create index with mapping
    console.log(`Creating index "${LOG_INDEX}" with mapping...`);
    await esClient.indices.create({
      index: LOG_INDEX,
      body: LOG_INDEX_MAPPING,
    });

    console.log('Index created successfully!');

    // Verify index health
    const health = await esClient.cluster.health({ index: LOG_INDEX });
    console.log(`Index health: ${health.status}`);

    // Show index info
    const indexInfo = await esClient.indices.get({ index: LOG_INDEX });
    console.log('\nIndex mapping created:');
    console.log(JSON.stringify(indexInfo[LOG_INDEX].mappings, null, 2));

  } catch (error) {
    console.error('Error initializing index:', error);
    process.exit(1);
  } finally {
    await esClient.close();
  }
}

initIndex();
