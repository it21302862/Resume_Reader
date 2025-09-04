'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function HomeClient({ selectedCv = '' }: { selectedCv?: string }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    setAnswer('');
  }, [selectedCv]);

  const handleChat = async () => {
    if (!question.trim()) {
      setAnswer('Please enter a question.');
      return;
    }
    setChatLoading(true);
    setAnswer('');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, resumeId: selectedCv || undefined }),
      });
      const data = await res.json();
      setAnswer(data.answer || data.error || 'No answer');
    } catch (_error) {
      setAnswer('Error occurred');
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="relative min-h-dvh">
      <div className="bg-blur" />
      <main className="relative z-10 mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <header className="mb-8 sm:mb-12 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-800">
            Model Context Protocol Playground
          </h1>
          <p className="mt-2 text-slate-600">Chat about your CV with AI assistance.</p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <Link
              href="/cv"
              className="btn bg-gradient-to-r from-blue-500 to-green-500 text-white border border-transparent hover:from-blue-600 hover:to-green-600 transition-all"
            >
              Manage CVs
            </Link>
            {selectedCv && (
              <span className="rounded-full bg-white/70 px-3 py-1 text-sm text-slate-700 border border-slate-200/70">
                Using CV: {selectedCv}
              </span>
            )}
          </div>
        </header>

        <section className="card p-5 sm:p-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-3">Chat about CV</h2>
          <div className="space-y-3">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., What was my last role?"
              className="input"
            />
            <button
              onClick={handleChat}
              disabled={chatLoading}
              className="btn btn-primary w-full sm:w-auto"
            >
              {chatLoading ? 'Asking...' : 'Ask'}
            </button>
            {answer && (
              <div className="mt-2 rounded-md border border-slate-200/60 bg-white/70 p-3 text-slate-800">
                <span className="font-medium">Answer: </span>
                {answer}
              </div>
            )}
          </div>
        </section>

        <footer className="mt-10 text-center text-sm text-slate-500">
          Built with Next.js — Secure by default
        </footer>
      </main>
    </div>
  );
}
