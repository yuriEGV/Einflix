import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];
const KEY_PATH = 'C:\\einflix\\Einflix\\service-account.json';
const FOLDER_IDS = [
    '1wmbIvFhe4uVuJR6AlSPF4KsDV7u8qP89', // Super Agente 86
    '13Me72rswN3ibQeooq8VFH5wUIRBItT95'  // Mi Bella Genio
];

async function test() {
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: KEY_PATH,
            scopes: SCOPES,
        });
        const drive = google.drive({ version: 'v3', auth });

        for (const FOLDER_ID of FOLDER_IDS) {
            console.log(`\n--- Testing access to folder: ${FOLDER_ID} ---`);

            try {
                const meta = await drive.files.get({
                    fileId: FOLDER_ID,
                    fields: 'name, mimeType, capabilities, trashed',
                    supportsAllDrives: true
                });
                console.log(`Folder Name: ${meta.data.name} (${meta.data.mimeType})`);
                console.log(`Capabilities: ${JSON.stringify(meta.data.capabilities)}`);
                console.log(`Trashed: ${meta.data.trashed}`);
            } catch (e) {
                console.error(`❌ Could not get folder meta: ${e.message}`);
            }

            const res = await drive.files.list({
                q: `'${FOLDER_ID}' in parents and trashed = false`,
                fields: 'files(id, name, mimeType)',
                supportsAllDrives: true,
                includeItemsFromAllDrives: true
            });

            console.log(`Result: Found ${res.data.files.length} files.`);
            res.data.files.forEach(f => console.log(`- ${f.name} (${f.id})`));
        }

    } catch (err) {
        console.error('❌ Error testing drive access:', err.message);
        if (err.errors) console.error(JSON.stringify(err.errors, null, 2));
    }
}

test();
