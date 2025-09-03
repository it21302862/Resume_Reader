import fs from 'fs';
import path from 'path';

const CV_DIR = path.join(process.cwd(), 'public', 'cvs');

function ensureCvDir() {
	if (!fs.existsSync(CV_DIR)) {
		fs.mkdirSync(CV_DIR, { recursive: true });
	}
}

export type CvItem = { id: string; name: string; path: string; size: number; mtimeMs: number };

export function listCvs(): CvItem[] {
	ensureCvDir();
	const files = fs.readdirSync(CV_DIR).filter((f) => f.toLowerCase().endsWith('.pdf'));
	return files
		.map((file) => {
			const full = path.join(CV_DIR, file);
			const stat = fs.statSync(full);
			return {
				id: path.parse(file).name,
				name: file,
				path: full,
				size: stat.size,
				mtimeMs: stat.mtimeMs,
			};
		})
		.sort((a, b) => b.mtimeMs - a.mtimeMs);
}

export function resolveCvPath(cvId: string): string | null {
  const absPath = path.join(process.cwd(), 'public', 'cvs', `${cvId}.pdf`);
  if (fs.existsSync(absPath)) return absPath;
  return null;
}

export function getCvPublicUrl(id: string): string {
	const safe = id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
	return `/cvs/${safe}.pdf`;
} 