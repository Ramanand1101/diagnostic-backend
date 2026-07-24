'use client';
import { Toaster, ToastBar, toast } from 'react-hot-toast';

export default function ToasterWithClose() {
  return (
    <Toaster position="top-right" toastOptions={{ duration: 4000 }}>
      {(t) => (
        <ToastBar toast={t}>
          {({ icon, message }) => (
            <>
              {icon}
              {message}
              <button
                onClick={() => toast.dismiss(t.id)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#9ca3af', fontSize: '14px', lineHeight: 1,
                  padding: '0 2px 0 4px', flexShrink: 0,
                }}
                aria-label="Close"
              >✕</button>
            </>
          )}
        </ToastBar>
      )}
    </Toaster>
  );
}
