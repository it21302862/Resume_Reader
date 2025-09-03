import "dotenv/config"; // ensure .env is loaded
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import axios from "axios";
import { parseResume } from "@/lib/parseResume";
import { resolveCvPath } from "@/lib/cv";

const chatSchema = z.object({
  question: z.string().min(1).max(500),
  resumeId: z.string().optional(),
});

// Rate limiter (per IP, 20 req/min)
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;
const ipToRequests: Map<string, { count: number; windowStart: number }> =
  new Map();

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
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { question, resumeId } = chatSchema.parse(body);

    // Resolve resume path
    const resolved = resumeId ? resolveCvPath(resumeId) : null;
    const resumePath =
      resolved || process.env.RESUME_PATH || "./public/resume.pdf";

    let resumeText = "";
    try {
      console.log("[chat] Looking for resume at:", resumePath);
      resumeText = await parseResume(resumePath);
    } catch (e) {
      return NextResponse.json(
        {
          error:
            "Resume not found or unreadable. Upload a CV at /cv or set RESUME_PATH to an existing PDF.",
        },
        { status: 400 }
      );
    }

    // Build the prompt
    const prompt = `
You are an expert career assistant. Analyze the following resume and answer the user's question with precision, clearly, and in a professional tone.

Resume:
${resumeText}

Instructions:
- Answer in full sentences.
- Highlight roles, companies, skills, and achievements when relevant.
- If the question asks for lists (e.g., skills, responsibilities), format them as bullet points.
- If information is missing from the resume, say "Not specified in resume."
- Keep answers concise but informative.

Question: ${question}`;

    // Validate env vars
    const apiUrl =
      process.env.LLM_API_URL ||
      "https://api.groq.com/openai/v1/chat/completions";
    const apiKey = process.env.LLM_API_KEY;
    if (!apiKey) {
      console.error("[chat] Missing LLM_API_KEY in environment");
      return NextResponse.json(
        { error: "Server misconfiguration: API key missing" },
        { status: 500 }
      );
    }

    // Call LLM API
    const response = await axios.post(
      apiUrl,
      {
        model: "llama-3.3-70b-versatile", // Groq model
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 256,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 25_000,
      }
    );

    const answer = response.data?.choices?.[0]?.message?.content?.trim() ?? "";

    if (!answer) {
      return NextResponse.json(
        { error: "No answer from model" },
        { status: 502 }
      );
    }

    // Secure headers
    const res = NextResponse.json({ answer }, { status: 200 });
    res.headers.set("Cache-Control", "no-store");
    res.headers.set("X-Content-Type-Options", "nosniff");
    res.headers.set("Referrer-Policy", "no-referrer");
    return res;
  } catch (error: any) {
    console.error(
      "[chat] Error:",
      error?.response?.data || error?.message || error
    );
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
