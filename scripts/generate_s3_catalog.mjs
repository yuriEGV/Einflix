import { listBucketContents } from '../lib/s3.js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
    try {
        console.log("Listing S3 contents to help generate your catalog...");
        const files = await listBucketContents('');

        console.log("\n--- SUGGESTED CATALOG ENTRIES (Copy to your .txt files) ---\n");

        files.forEach(file => {
            if (file.type === 'folder') return;
            const entry = `s3://${file.id} | ${file.title} | S3_CONTENT | https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400 | S3 Hosted Content`;
            console.log(entry);
        });

    } catch (e) {
        console.error("Error listing S3 contents:", e);
    }
}

main();
