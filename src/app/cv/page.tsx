'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type CvItem = { 
  id: string; 
  name: string; 
  size: number; 
  mtimeMs: number; 
  hasThumbnail?: boolean;
  email?: string;
  uploadedAt?: string;
};

export default function CvLibraryPage() {
  const router = useRouter();
  const [items, setItems] = useState<CvItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const formatted = useMemo(() =>
    items.map((i) => ({
      ...i,
      sizeMb: (i.size / (1024 * 1024)).toFixed(2),
      date: new Date(i.mtimeMs).toLocaleString(),
    })), [items]
  );

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/cv/list');
      const data = await res.json();
      setItems(data.items || []);
    } catch (e) {
      setError('Failed to load CVs');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function handleUpload() {
    if (!file) { setError('Select a PDF file.'); return; }
    if (!name.trim()) { setError('Enter a short name.'); return; }
    if (!email.trim()) { setError('Enter your email address.'); return; }

    setError('');
    setUploading(true);
    const form = new FormData();
    form.append('file', file);
    form.append('name', name.trim());
    form.append('email', email.trim());

    try {
      const res = await fetch('/api/cv/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setName('');
      setEmail('');
      setFile(null);
      // Immediately use the uploaded CV in chat
      router.push(`/?cv=${data.id || ''}`);
    } catch (e: any) {
      setError(e.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="relative min-h-dvh">
      <div className="bg-blur" />
      <main className="relative z-10 mx-auto max-w-4xl px-4 py-10 sm:py-14">
        <header className="mb-8 sm:mb-12 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-800">Your CV Library</h1>
          <p className="mt-2 text-slate-600">Upload PDFs and get notified when they're processed.</p>
        </header>

        {/* Upload Section */}
        <section className="card p-5 sm:p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-3">Upload a new CV</h2>
          <div className="grid gap-3">
            <input
              className="input"
              placeholder="Short name (e.g., 2025-Data-Engineer)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="input"
              type="email"
              placeholder="Your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="input"
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <button
              className="btn btn-success"
              disabled={uploading}
              onClick={handleUpload}
            >
              {uploading ? 'Uploading...' : 'Upload & Process'}
            </button>
          </div>
          {error && <p className="mt-2 text-red-600">{error}</p>}
          <p className="mt-2 text-sm text-slate-600">
            You'll receive an email notification when your CV is processed and ready for chat.
          </p>
        </section>

        {/* Saved CVs Section */}
        <section className="card p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-3">Saved CVs</h2>
          {loading ? (
            <p>Loading...</p>
          ) : formatted.length === 0 ? (
            <p className="text-slate-600">No CVs yet. Upload one above.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {formatted.map((cv) => (
                <div key={cv.id} className="card p-4 flex flex-col gap-3">
                  {/* Thumbnail Preview */}
                  <div className="flex justify-center">
                    {cv.hasThumbnail ? (
                      <img
                        src={`/cvs/${cv.id}.png`}
                        alt={`${cv.name} preview`}
                        className="w-32 h-44 object-cover border border-slate-200 rounded shadow-sm"
                      />
                    ) : (
                      <div className="w-32 h-44 bg-slate-100 border border-slate-200 rounded flex items-center justify-center">
                        <span className="text-slate-400 text-xs">No preview</span>
                      </div>
                    )}
                  </div>

                  {/* CV Info */}
                  <div className="flex-1 text-center">
                    <p className="font-semibold text-slate-800 text-sm">{cv.name}</p>
                    <p className="text-xs text-slate-600">{cv.sizeMb} MB · {cv.date}</p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Link
                      href={`/?cv=${cv.id}`}
                      className="btn btn-primary flex-1 text-center text-sm"
                    >
                      Use in chat
                    </Link>
                    <a
                      href={`/cvs/${cv.id}.pdf`}
                      target="_blank"
                      className="btn flex-1 text-sm"
                      style={{ background: 'white', border: '1px solid rgba(148,163,184,.4)' }}
                    >
                      Preview
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <footer className="mt-10 text-center text-sm text-slate-500">
          Tip: You'll get email notifications when CVs are processed.
        </footer>
      </main>
    </div>
  );
}
