/**
 * Fix Elasticsearch Index Mappings
 * 
 * Deletes and recreates indices with correct mappings.
 * WARNING: This will delete all existing data in these indices!
 * 
 * Run: npx tsx scripts/fix_indices.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import { esClient } from '../src/config/elasticsearch';
import { WALLET_TX_INDEX, WALLET_SUMMARY_INDEX } from '../src/config/elasticsearch';
import { WALLET_TX_INDEX_MAPPING, WALLET_SUMMARY_INDEX_MAPPING } from '../src/types/wallet';
import { CHAT_HISTORY_INDEX, CHAT_HISTORY_INDEX_MAPPING } from '../src/types/auth';

async function recreateIndex(indexName: string, mapping: any) {
    console.log(`\n--- ${indexName} ---`);
    
    try {
        const exists = await esClient.indices.exists({ index: indexName });
        if (exists) {
            // Count docs
            try {
                const count = await esClient.count({ index: indexName });
                console.log(`  Document count: ${count.count}`);
            } catch { 
                console.log(`  (could not count docs)`);
            }
            
            // Delete index
            console.log(`  Deleting index...`);
            await esClient.indices.delete({ index: indexName });
            console.log(`  Deleted.`);
        } else {
            console.log(`  Index does not exist yet.`);
        }
        
        // Create with correct mapping (try with settings first, then without for serverless)
        console.log(`  Creating with correct mappings...`);
        try {
            await esClient.indices.create({ index: indexName, body: mapping });
        } catch (createErr: any) {
            // Serverless may reject certain settings
            console.log(`  Retrying without settings (serverless mode)...`);
            await esClient.indices.create({ index: indexName, body: { mappings: mapping.mappings } });
        }
        console.log(`  Created successfully!`);
        
        // Verify
        const newMapping = await esClient.indices.getMapping({ index: indexName });
        const fields = Object.keys(newMapping[indexName]?.mappings?.properties || {});
        console.log(`  Verified fields: ${fields.join(', ')}`);
        
    } catch (error: any) {
        console.error(`  ERROR: ${error.message}`);
    }
}

async function main() {
    console.log('='.repeat(60));
    console.log('Fix Elasticsearch Index Mappings');
    console.log('='.repeat(60));
    
    // Test connection (use _info or simple index check instead of _cluster/health for serverless)
    try {
        // Serverless doesn't support _cluster/health, use a simple info call
        const info = await esClient.info();
        console.log(`ES cluster: ${info.cluster_name} (${info.version.number})`);
    } catch (infoErr: any) {
        // If _info also fails, try a simple index list as connection test
        try {
            await esClient.indices.exists({ index: 'test-connection-check' });
            console.log('ES connection: OK (serverless mode)');
        } catch (error) {
            console.error('Cannot connect to Elasticsearch:', error);
            process.exit(1);
        }
    }
    
    // Recreate wallet indices
    await recreateIndex(WALLET_TX_INDEX, WALLET_TX_INDEX_MAPPING);
    await recreateIndex(WALLET_SUMMARY_INDEX, WALLET_SUMMARY_INDEX_MAPPING);
    
    // Recreate chat history index (WARNING: clears chat history)
    const args = process.argv.slice(2);
    if (args.includes('--include-chats')) {
        await recreateIndex(CHAT_HISTORY_INDEX, CHAT_HISTORY_INDEX_MAPPING);
    } else {
        console.log(`\n--- ${CHAT_HISTORY_INDEX} ---`);
        console.log(`  Skipped (use --include-chats flag to also recreate chat history)`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('Done! You can now re-fetch wallet data.');
    console.log('='.repeat(60));
}

main().catch(err => {
    console.error('Failed:', err);
    process.exit(1);
});
