import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CV_DIR = path.join(process.cwd(), 'public', 'cvs');

// In-memory rate limiter
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 60;
const ipToRequests: Map<string, { count: number; windowStart: number }> = new Map();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = ipToRequests.get(ip);
  if (!record) {
    ipToRequests.set(ip, { count: 1, windowStart: now });
    return false;
  }
  if (now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
    record.count = 1;
    record.windowStart = now;
    return false;
  }
  record.count += 1;
  ipToRequests.set(ip, record);
  return record.count > RATE_LIMIT_MAX;
}

function ensureDir() {
  if (!fs.existsSync(CV_DIR)) fs.mkdirSync(CV_DIR, { recursive: true });
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  ensureDir();

  const files = fs.readdirSync(CV_DIR).filter((f) => f.toLowerCase().endsWith('.pdf'));

  const items = files
    .map((file) => {
      const id = path.parse(file).name;
      const fullPath = path.join(CV_DIR, file);
      const stat = fs.statSync(fullPath);

      // Check for thumbnail
      const thumbnailPath = path.join(CV_DIR, `${id}.png`);
      const hasThumbnail = fs.existsSync(thumbnailPath);

      // Metadata
      const metadataPath = path.join(CV_DIR, `${id}.json`);
      let metadata: Record<string, unknown> = {};
      if (fs.existsSync(metadataPath)) {
        try {
          metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        } catch (e) {
          console.error('Failed to parse metadata for', id, e);
        }
      }

      return {
        id,
        name: file,
        size: stat.size,
        mtimeMs: stat.mtimeMs,
        hasThumbnail,
        ...metadata,
      };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  return NextResponse.json({ items });
}
