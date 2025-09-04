import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

const CV_DIR = path.join(process.cwd(), 'public', 'cvs');
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

// Simple in-memory rate limiter per IP
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;
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

async function generateThumbnail(pdfPath: string, outputPath: string): Promise<boolean> {
  try {
    // Skip thumbnail generation on Vercel/production to avoid native deps
    if (process.env.VERCEL === '1' || process.env.DISABLE_THUMBNAIL === '1') {
      return false;
    }
    // Lazy import pdf2pic to avoid bundling gm during build
    const { fromPath } = await import('pdf2pic');
    const convert = fromPath(pdfPath, {
      density: 100,
      saveFilename: path.parse(outputPath).name,
      savePath: path.dirname(outputPath),
      format: 'png',
      width: 200,
      height: 280,
    });

    await convert(1, { responseType: 'image' }); // we don't need the result, so just await
    return fs.existsSync(outputPath);
  } catch (error: unknown) {
    console.error('Thumbnail generation failed:', error);
    return false;
  }
}

async function sendNotificationEmail(userEmail: string, cvName: string) {
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('Email not configured, skipping notification');
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: Number(process.env.EMAIL_PORT) === 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
    });

    const mailOptions = {
      from: `"MCP Server" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: `CV Processed: ${cvName}`,
      text: `Your CV "${cvName}" has been successfully processed and is ready for chat!`,
      html: `
        <h2>CV Processed Successfully!</h2>
        <p>Your CV "<strong>${cvName}</strong>" has been successfully processed and is ready for chat.</p>
        <p>You can now ask questions about your CV using our AI chat feature.</p>
        <p>Best regards,<br>MCP Server</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Notification email sent to ${userEmail}`);
  } catch (error: unknown) {
    console.error('Failed to send notification email:', error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    const name = (formData.get('name') as string) || '';
    const userEmail = (formData.get('email') as string) || '';

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }
    if (!name.trim()) return NextResponse.json({ error: 'Missing name' }, { status: 400 });
    if (!userEmail.trim()) return NextResponse.json({ error: 'Missing email address' }, { status: 400 });

    if (file.type !== 'application/pdf') return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 415 });
    if (file.size > MAX_SIZE_BYTES) return NextResponse.json({ error: 'File too large' }, { status: 413 });

    const safeId = name.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) || 'cv';
    const buffer = Buffer.from(await file.arrayBuffer());

    ensureDir();
    const outPath = path.join(CV_DIR, `${safeId}.pdf`);
    fs.writeFileSync(outPath, buffer);

    // Generate thumbnail
    const thumbnailPath = path.join(CV_DIR, `${safeId}.png`);
    const thumbnailGenerated = await generateThumbnail(outPath, thumbnailPath);

    // Store metadata
    const metadataPath = path.join(CV_DIR, `${safeId}.json`);
    fs.writeFileSync(metadataPath, JSON.stringify({
      email: userEmail,
      uploadedAt: new Date().toISOString(),
      hasThumbnail: thumbnailGenerated,
    }));

    // Send notification email
    await sendNotificationEmail(userEmail, `${safeId}.pdf`);

    const res = NextResponse.json({ id: safeId, name: `${safeId}.pdf`, hasThumbnail: thumbnailGenerated }, { status: 201 });
    res.headers.set('Cache-Control', 'no-store');
    res.headers.set('X-Content-Type-Options', 'nosniff');
    res.headers.set('Referrer-Policy', 'no-referrer');
    return res;

  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error('Upload error:', err.message);
    } else {
      console.error('Upload error:', err);
    }
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
