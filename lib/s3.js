
import { S3Client, ListObjectsV2Command, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const REGION = process.env.AWS_REGION || 'us-east-2';
const BUCKET_NAME = process.env.AWS_BUCKET_NAME || 'einflix';

// Initialize S3 Client
// Credentials are automatically loaded from process.env.AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
const s3Client = new S3Client({
    region: REGION,
});

/**
 * Lists contents of a "folder" in S3 (using prefix).
 * Mimics the structure expected by Einflix frontend.
 */
export async function listBucketContents(prefix = '') {
    // S3 prefixes should end with / to be treated as folders, unless it's root
    let s3Prefix = prefix;
    if (s3Prefix && !s3Prefix.endsWith('/')) {
        s3Prefix += '/';
    }
    // If root, prefix is empty string
    if (s3Prefix === '/') s3Prefix = '';

    const command = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: s3Prefix,
        Delimiter: '/' // Important to group subfolders
    });

    try {
        const response = await s3Client.send(command);

        const items = [];

        // 1. Process "CommonPrefixes" (Subfolders)
        if (response.CommonPrefixes) {
            for (const p of response.CommonPrefixes) {
                // Remove trailing slash for display name
                const name = p.Prefix.replace(s3Prefix, '').slice(0, -1);
                items.push({
                    id: p.Prefix, // S3 ID is the full Key/Prefix
                    title: name,
                    type: 'folder',
                    mimeType: 'application/vnd.google-apps.folder',
                    thumbnail: null, // S3 folders don't have thumbnails usually
                    original: null,
                    preview: `/api/drive/list?id=${encodeURIComponent(p.Prefix)}` // Recursive call
                });
            }
        }

        // 2. Process "Contents" (Files)
        if (response.Contents) {
            for (const file of response.Contents) {
                // Skip the folder placeholder object itself
                if (file.Key === s3Prefix) continue;

                const name = file.Key.replace(s3Prefix, '');
                const ext = name.split('.').pop().toLowerCase();

                let type = 'file';
                let mimeType = 'application/octet-stream';

                // Basic MIME guessing
                if (['mp4', 'mkv', 'webm', 'avi', 'mov'].includes(ext)) {
                    type = 'video';
                    mimeType = `video/${ext}`;
                } else if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
                    type = 'image';
                    mimeType = `image/${ext}`;
                } else if (['pdf', 'cbr', 'cbz'].includes(ext)) {
                    type = 'pdf';
                    mimeType = 'application/pdf';
                }

                // Use raw Key as ID. Routes will encrypt it.
                const safeId = file.Key;

                items.push({
                    id: safeId, // Used for routing
                    title: name,
                    type: type,
                    mimeType: mimeType,
                    size: file.Size,
                    lastModified: file.LastModified,
                    thumbnail: (type === 'video' || type === 'image') ? `/api/poster/${safeId}` : null,
                    original: (type !== 'folder') ? `/api/stream/${safeId}` : null,
                    preview: (type === 'folder')
                        ? `/api/drive/list?id=${encodeURIComponent(safeId)}`
                        : `/api/stream/${encodeURIComponent(safeId)}`
                });
            }
        }

        return items;

    } catch (error) {
        console.error("❌ [S3 Lib] List Error:", error);
        throw error;
    }
}

/**
 * Generates a presigned URL for streaming or viewing a file.
 * Valid for 1 hour by default.
 */
export async function getS3PresignedUrl(key, expiresIn = 3600) {
    try {
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key
        });
        // Create the signed URL
        const url = await getSignedUrl(s3Client, command, { expiresIn });
        return url;
    } catch (error) {
        console.error("❌ [S3 Lib] Presigned URL Error:", error);
        return null;
    }
}

/**
 * Gets metadata for a file (size, type check).
 */
export async function getS3FileMeta(key) {
    try {
        const command = new HeadObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key
        });
        const response = await s3Client.send(command);
        return {
            size: response.ContentLength,
            mimeType: response.ContentType,
            lastModified: response.LastModified
        };
    } catch (error) {
        console.error("❌ [S3 Lib] Meta Error:", error);
        return null;
    }
}

export { s3Client, BUCKET_NAME };
