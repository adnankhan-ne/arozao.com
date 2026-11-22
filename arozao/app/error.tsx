'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error captured:', error);
  }, [error]);

  return (
    <main className="site-content" style={{ textAlign: 'center', padding: '80px 24px' }}>
      <div style={{ maxWidth: 540, margin: '0 auto' }}>
        <span
          style={{
            fontSize: '12px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: '#EF4444',
            display: 'block',
            marginBottom: '12px',
          }}
        >
          Something went wrong
        </span>
        <h1
          style={{
            fontSize: '32px',
            fontWeight: 800,
            color: 'var(--color-text-primary, #1C1A2B)',
            marginBottom: '16px',
            lineHeight: 1.2,
          }}
        >
          Unexpected Application Error
        </h1>
        <p
          style={{
            fontSize: '15px',
            color: 'var(--color-text-secondary, #54506B)',
            lineHeight: 1.6,
            marginBottom: '32px',
          }}
        >
          We encountered an unexpected issue while loading this page. You can try refreshing or returning to the storefront.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => reset()}
            className="button button-primary"
            style={{
              padding: '12px 24px',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
          <Link
            href="/"
            className="button button-secondary"
            style={{
              padding: '12px 24px',
              fontWeight: 600,
              fontSize: '14px',
            }}
          >
            Return to Homepage
          </Link>
        </div>
      </div>
    </main>
  );
}
