'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global application error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: '#F8FAFC', color: '#0F172A' }}>
        <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', boxSizing: 'border-box' }}>
          <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center', background: '#FFFFFF', padding: '40px 32px', borderRadius: '16px', boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.08)' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#EF4444', display: 'block', marginBottom: '12px' }}>
              Application Error
            </span>
            <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 16px 0', lineHeight: 1.2 }}>
              Something went wrong
            </h1>
            <p style={{ fontSize: '15px', color: '#64748B', lineHeight: 1.6, margin: '0 0 28px 0' }}>
              An error occurred while loading Arozao. Please refresh the page or return to the home page.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => reset()}
                style={{
                  backgroundColor: '#D97706',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 20px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Try Again
              </button>
              <Link
                href="/"
                style={{
                  backgroundColor: '#F1F5F9',
                  color: '#334155',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  padding: '12px 20px',
                  fontSize: '14px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                Return to Homepage
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
