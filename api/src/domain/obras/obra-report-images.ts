import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '../../core/database/prisma.js';

const uploadDir = process.env.UPLOAD_DIR ?? './uploads';

export function uploadIdFromPhotoUrl(url: string): string | null {
  const m = url.match(/\/uploads\/([^/?#]+)(?:\/file)?/);
  return m?.[1] ?? null;
}

export async function resolvePhotoDataUris(
  photoUrls: string[],
  companyId: string,
): Promise<{ url: string; dataUri: string | null }[]> {
  const results: { url: string; dataUri: string | null }[] = [];

  for (const url of photoUrls) {
    const uploadId = uploadIdFromPhotoUrl(url);
    if (!uploadId) {
      results.push({ url, dataUri: null });
      continue;
    }

    const upload = await prisma.upload.findFirst({
      where: { id: uploadId, companyId },
    });

    if (!upload || !fs.existsSync(upload.path)) {
      results.push({ url, dataUri: null });
      continue;
    }

    const buffer = fs.readFileSync(upload.path);
    const mime = upload.mimeType || 'image/jpeg';
    results.push({
      url,
      dataUri: `data:${mime};base64,${buffer.toString('base64')}`,
    });
  }

  return results;
}

export function safeUploadFilename(filename: string): string {
  return path.basename(filename);
}
