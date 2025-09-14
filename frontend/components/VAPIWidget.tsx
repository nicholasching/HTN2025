'use client';

import { useEffect, useState } from 'react';

declare global {
  interface Window {
    vapiSDK: any;
  }
}

interface VAPIWidgetProps {
  className?: string;
}

export default function VAPIWidget({ className = "" }: VAPIWidgetProps) {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isSDKReady, setIsSDKReady] = useState(false);
  const [vapiInstance, setVapiInstance] = useState<any>(null);

  useEffect(() => {
    console.log('VAPIWidget useEffect running...');
    console.log('Environment variables:', {
      apiKey: process.env.NEXT_PUBLIC_VAPI_API_KEY ? 'Present' : 'Missing',
      assistant: process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID ? 'Present' : 'Missing'
    });

    // Load VAPI SDK
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/gh/VapiAI/html-script-tag@latest/dist/assets/index.js';
    script.onload = () => {
      console.log('VAPI script loaded');
      console.log('window.vapiSDK:', window.vapiSDK);
      
      if (window.vapiSDK) {
        console.log('Initializing VAPI SDK...');
        
        try {
          // Initialize VAPI SDK without auto-creating the default button
          const vapiInstance = window.vapiSDK.run({
            apiKey: process.env.NEXT_PUBLIC_VAPI_API_KEY,
            assistant: process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID,
            config: {
              transcriber: {
                provider: 'deepgram',
                model: 'nova-2',
                language: 'en'
              },
              // Disable the default button
              showDefaultButton: false
            }
          });

          console.log('VAPI instance created:', vapiInstance);
          console.log('Instance type:', typeof vapiInstance);
          console.log('Available methods:', Object.getOwnPropertyNames(vapiInstance));
          console.log('Instance prototype:', Object.getPrototypeOf(vapiInstance));

          // Store the VAPI instance both globally and in state
          (window as any).vapiInstance = vapiInstance;
          setVapiInstance(vapiInstance);
          setIsSDKReady(true);

          // Listen for call state changes using the VAPI instance events
          if (vapiInstance && vapiInstance.on) {
            console.log('Using VAPI instance events');
            vapiInstance.on('call-start', () => {
              console.log('VAPI call started');
              setIsCallActive(true);
            });
            vapiInstance.on('call-end', () => {
              console.log('VAPI call ended');
              setIsCallActive(false);
            });
          } else {
            console.log('Using window events as fallback');
            // Fallback to window events if instance events don't work
            window.addEventListener('vapi-call-start', () => {
              console.log('VAPI call started (window event)');
              setIsCallActive(true);
            });
            window.addEventListener('vapi-call-end', () => {
              console.log('VAPI call ended (window event)');
              setIsCallActive(false);
            });
          }
        } catch (error) {
          console.error('Error initializing VAPI SDK:', error);
        }
      } else {
        console.error('window.vapiSDK not available after script load');
      }
    };
    
    script.onerror = (error) => {
      console.error('Error loading VAPI script:', error);
    };
    
    document.head.appendChild(script);

    // Hide any default VAPI buttons that might appear
    const hideDefaultButtons = () => {
      const defaultButtons = document.querySelectorAll('[data-vapi-widget]');
      defaultButtons.forEach(button => {
        (button as HTMLElement).style.display = 'none';
      });
    };

    // Check for default buttons periodically
    const interval = setInterval(hideDefaultButtons, 100);

    return () => {
      clearInterval(interval);
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  const handleCallClick = () => {
    console.log('=== CALL BUTTON CLICKED ===');
    console.log('isCallActive:', isCallActive);
    console.log('isSDKReady:', isSDKReady);
    console.log('vapiInstance from state:', vapiInstance);
    console.log('vapiInstance from window:', (window as any).vapiInstance);
    console.log('window.vapiSDK:', window.vapiSDK);
    
    if (!isSDKReady) {
      console.error('VAPI SDK not ready');
      return;
    }

    // Try multiple approaches to get the VAPI instance
    let instance = vapiInstance || (window as any).vapiInstance;
    
    // If no instance, try to get it from window.vapiSDK directly
    if (!instance && window.vapiSDK) {
      console.log('Trying to get instance from window.vapiSDK directly');
      // Check if vapiSDK has methods directly
      if (window.vapiSDK.start && window.vapiSDK.stop) {
        instance = window.vapiSDK;
        console.log('Using window.vapiSDK directly as instance');
      }
    }

    if (!instance) {
      console.error('No VAPI instance available anywhere');
      console.log('Available on window.vapiSDK:', Object.getOwnPropertyNames(window.vapiSDK || {}));
      return;
    }

    console.log('Using instance:', instance);
    console.log('Instance methods:', Object.getOwnPropertyNames(instance));

    try {
      if (isCallActive) {
        console.log('Stopping call...');
        if (typeof instance.stop === 'function') {
          instance.stop();
        } else if (typeof instance.end === 'function') {
          instance.end();
        } else if (typeof instance.hangup === 'function') {
          instance.hangup();
        } else {
          console.error('No stop/end/hangup method found on instance');
        }
      } else {
        console.log('Starting call...');
        console.log('Assistant ID:', process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID);
        
        if (typeof instance.start === 'function') {
          // Pass the assistant ID when starting the call
          instance.start(process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID);
        } else if (typeof instance.call === 'function') {
          instance.call(process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID);
        } else {
          console.error('No start/call method found on instance');
        }
      }
    } catch (error) {
      console.error('Error with VAPI call:', error);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCallClick}
      disabled={!isSDKReady}
      className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg transition-all hover:scale-110 ${
        !isSDKReady
          ? 'bg-gray-500 cursor-not-allowed'
          : isCallActive
          ? 'bg-green-500 shadow-lg shadow-green-500/30'
          : 'bg-gray-700 hover:bg-gray-600'
      } ${className}`}
      title={!isSDKReady ? "VAPI SDK loading..." : "AI Voice Assistant - Click to start/stop call"}
    >
      <svg 
        className="w-6 h-6 text-white" 
        fill="currentColor" 
        viewBox="0 0 24 24"
      >
        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
      </svg>
    </button>
  );
}
