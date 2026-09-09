'use client';

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en-GB">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          padding: 24,
          background: '#F7FAFC',
          color: '#12212E',
          fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        }}
      >
        <div
          style={{
            maxWidth: '26rem',
            background: '#FFFFFF',
            border: '1px solid #E5EBF1',
            borderRadius: 12,
            padding: 28,
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: '1.375rem', margin: '0 0 8px' }}>Proper CRM has stopped</h1>
          <p style={{ color: '#6B7B8C', margin: '0 0 20px', lineHeight: 1.6 }}>
            Something went badly wrong. Reload and you should be straight back where you were.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              height: '3.5rem',
              width: '100%',
              borderRadius: 10,
              border: 'none',
              background: '#1E88E5',
              color: '#FFFFFF',
              fontWeight: 600,
              fontSize: '1.125rem',
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
