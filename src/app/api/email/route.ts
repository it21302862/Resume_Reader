import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import nodemailer from 'nodemailer';

const emailSchema = z.object({
  recipient: z.string().email().max(255),
  subject: z.string().min(1).max(120),
  body: z.string().min(1).max(10_000),
});

// Simple in-memory rate limiter per IP
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;
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

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const json = await req.json();
    const { recipient, subject, body } = emailSchema.parse(json);

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_PORT === '465',
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
      to: recipient,
      subject,
      text: body,
      html: `<p>${body}</p>`,
    };

    await transporter.sendMail(mailOptions);

    const res = NextResponse.json({ message: 'Email sent successfully' }, { status: 200 });
    res.headers.set('Cache-Control', 'no-store');
    res.headers.set('X-Content-Type-Options', 'nosniff');
    res.headers.set('Referrer-Policy', 'no-referrer');
    return res;
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    if (error instanceof Error) {
      console.error('Email error:', error.message);
    } else {
      console.error('Unknown error:', error);
    }

    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
