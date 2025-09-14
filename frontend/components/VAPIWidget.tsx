'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    vapiSDK: any;
  }
}

export default function VAPIWidget() {
  useEffect(() => {
    // Load VAPI SDK
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/gh/VapiAI/html-script-tag@latest/dist/assets/index.js';
    script.onload = () => {
      if (window.vapiSDK) {
        window.vapiSDK.run({
          apiKey: process.env.NEXT_PUBLIC_VAPI_API_KEY,
          assistant: process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID,
          config: {
            transcriber: {
              provider: 'deepgram',
              model: 'nova-2',
              language: 'en'
            }
          }
        });
      }
    };
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  // Don't render any custom button - let VAPI SDK create its own green call button
  return null;
}
