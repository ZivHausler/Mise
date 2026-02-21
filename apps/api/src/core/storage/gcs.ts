import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { env } from '../../config/env.js';

export const LOCAL_UPLOAD_DIR = join(process.cwd(), 'uploads');

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export function isLocalStorage(): boolean {
  return !env.GCS_BUCKET_NAME;
}

export async function generateSignedUploadUrl(
  storeId: number,
  mimeType: string,
): Promise<{ uploadUrl: string; publicUrl: string; filePath: string }> {
  const sid = String(storeId);
  const ext = MIME_TO_EXT[mimeType] ?? 'jpg';
  const filename = `${randomUUID()}.${ext}`;
  const filePath = `${sid}/temp/${filename}`;

  if (isLocalStorage()) {
    const dir = join(LOCAL_UPLOAD_DIR, sid, 'temp');
    await fs.mkdir(dir, { recursive: true });
    const uploadUrl = `/uploads/put/${filePath}`;
    const publicUrl = `/uploads/${filePath}`;
    return { uploadUrl, publicUrl, filePath };
  }

  const { Storage } = await import('@google-cloud/storage');
  const storage = new Storage({ projectId: env.GCS_PROJECT_ID });
  const bucket = storage.bucket(env.GCS_BUCKET_NAME);
  const file = bucket.file(filePath);

  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + 60 * 60 * 1000,
    contentType: mimeType,
  });

  const publicUrl = `https://storage.googleapis.com/${env.GCS_BUCKET_NAME}/${filePath}`;
  return { uploadUrl: url, publicUrl, filePath };
}

export function isTempUrl(url: string): boolean {
  return url.includes('/temp/');
}

export function isManagedUrl(url: string): boolean {
  if (isLocalStorage()) return url.startsWith('/uploads/');
  return url.includes(`storage.googleapis.com/${env.GCS_BUCKET_NAME}`);
}

export function isGcsUrl(url: string): boolean {
  return url.includes('storage.googleapis.com');
}

export function validateStoreOwnership(url: string, storeId: number): boolean {
  return url.includes(`/${storeId}/`);
}

export async function movePhotosToRecipe(
  storeId: number,
  recipeId: string,
  photoUrls: string[],
): Promise<string[]> {
  const sid = String(storeId);
  const finalUrls: string[] = [];

  for (const url of photoUrls) {
    if (!isTempUrl(url)) {
      finalUrls.push(url);
      continue;
    }

    const filename = url.split('/').pop()!;
    const destPath = `${sid}/recipes/${recipeId}/${filename}`;

    if (isLocalStorage()) {
      const srcFile = join(LOCAL_UPLOAD_DIR, sid, 'temp', filename);
      const destDir = join(LOCAL_UPLOAD_DIR, sid, 'recipes', recipeId);
      await fs.mkdir(destDir, { recursive: true });
      const destFile = join(destDir, filename);
      await fs.copyFile(srcFile, destFile);
      await fs.unlink(srcFile).catch(() => {});
      finalUrls.push(`/uploads/${destPath}`);
    } else {
      const { Storage } = await import('@google-cloud/storage');
      const storage = new Storage({ projectId: env.GCS_PROJECT_ID });
      const bucket = storage.bucket(env.GCS_BUCKET_NAME);
      const srcPath = `${sid}/temp/${filename}`;
      await bucket.file(srcPath).copy(bucket.file(destPath));
      await bucket.file(srcPath).delete().catch(() => {});
      finalUrls.push(`https://storage.googleapis.com/${env.GCS_BUCKET_NAME}/${destPath}`);
    }
  }

  return finalUrls;
}

export async function deleteImage(url: string): Promise<void> {
  if (!isManagedUrl(url)) return;

  if (isLocalStorage()) {
    const relativePath = url.replace('/uploads/', '');
    const filePath = join(LOCAL_UPLOAD_DIR, relativePath);
    await fs.unlink(filePath).catch(() => {});
    return;
  }

  const { Storage } = await import('@google-cloud/storage');
  const storage = new Storage({ projectId: env.GCS_PROJECT_ID });
  const bucket = storage.bucket(env.GCS_BUCKET_NAME);
  const filePath = url.replace(`https://storage.googleapis.com/${env.GCS_BUCKET_NAME}/`, '');
  await bucket.file(filePath).delete().catch(() => {});
}

export async function deleteRecipeImages(storeId: number, recipeId: string): Promise<void> {
  const sid = String(storeId);
  const prefix = `${sid}/recipes/${recipeId}/`;

  if (isLocalStorage()) {
    const dir = join(LOCAL_UPLOAD_DIR, sid, 'recipes', recipeId);
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
    return;
  }

  const { Storage } = await import('@google-cloud/storage');
  const storage = new Storage({ projectId: env.GCS_PROJECT_ID });
  const bucket = storage.bucket(env.GCS_BUCKET_NAME);
  await bucket.deleteFiles({ prefix }).catch(() => {});
}

export async function handleLocalUpload(filePath: string, body: Buffer): Promise<void> {
  const fullPath = join(LOCAL_UPLOAD_DIR, filePath);
  await fs.mkdir(dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, body);
}
