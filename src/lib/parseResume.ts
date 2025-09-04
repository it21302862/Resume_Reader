"use server";

import fs from "fs";
import path from "path";
import pdfParsePromise from "pdf-parse/lib/pdf-parse.js";

function normalizeWhitespace(text: string): string {
  return text
    .replace(/[\t\r]+/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Resolve the absolute path of a resume file.
 * - If filePath is given, check /public/cvs/{id}.pdf, or resolve absolute path.
 * - If not provided, fallback to /public/resume.pdf.
 */
function resolveResumePath(filePath?: string): string {
  if (filePath) {
    // If absolute path → use it
    if (path.isAbsolute(filePath)) return filePath;

    // If just an ID (like "cv123") → map to public/cvs/{id}.pdf
    const cvsPath = path.join(process.cwd(), "public", "cvs", `${filePath}.pdf`);
    if (fs.existsSync(cvsPath)) return cvsPath;

    // Otherwise treat it as a relative path
    return path.join(process.cwd(), filePath);
  }

  // Default fallback → public/resume.pdf
  return path.join(process.cwd(), "public", "resume.pdf");
}

/**
 * Parse a resume from disk and return its normalized text.
 */
export async function parseResume(filePath?: string) {
  const absPath = resolveResumePath(filePath);
  console.log("[parseResume] Looking for resume at:", absPath);

  if (!fs.existsSync(absPath)) {
    throw new Error(`Resume file not found: ${absPath}`);
  }

  const dataBuffer = fs.readFileSync(absPath);
  const pdfParseModule = await pdfParsePromise;
  const pdfParseFn = pdfParseModule.default || pdfParseModule;
  const data = await pdfParseFn(dataBuffer);

  return normalizeWhitespace(data.text || "");
}
