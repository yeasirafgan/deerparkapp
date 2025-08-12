'use client';

import { useEffect, useRef } from 'react';
import React from 'react';
import { usePathname } from 'next/navigation';

const VapiAssistant = () => {
  const pathname = usePathname();
  const scriptRef = useRef(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    // Only run on timesheet page and make sure window is defined
    if (typeof window !== 'undefined' && pathname === '/timesheet' && !isInitializedRef.current) {
      const script = document.createElement('script');
      script.src = "https://cdn.jsdelivr.net/gh/VapiAI/html-script-tag@latest/dist/assets/index.js";
      script.defer = true;
      script.async = true;
      scriptRef.current = script;
      isInitializedRef.current = true;

      script.onload = () => {
        if (window.vapiSDK && !window.vapiSDK.isInitialized) {
          window.vapiSDK.run({
            apiKey: process.env.NEXT_PUBLIC_VAPI_API_KEY,
            assistant: process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID,
            config: {}
          });
          window.vapiSDK.isInitialized = true;
        }
      };

      script.onerror = () => {
        console.error('Failed to load Vapi SDK');
        isInitializedRef.current = false;
      };

      document.body.appendChild(script);

      return () => {
        // Clean up the script when component unmounts or pathname changes
        if (scriptRef.current && document.body.contains(scriptRef.current)) {
          document.body.removeChild(scriptRef.current);
        }
        
        // Clean up Vapi SDK if it exists
        if (window.vapiSDK && window.vapiSDK.destroy) {
          window.vapiSDK.destroy();
          window.vapiSDK.isInitialized = false;
        }
        
        isInitializedRef.current = false;
        scriptRef.current = null;
      };
    }
  }, [pathname]);

  // Only render on timesheet page
  if (pathname !== '/timesheet') return null;
  
  // Return a container div for the assistant with fixed positioning
  return (
    <div className="fixed bottom-4 right-4 z-[9999]">
      {/* The Vapi Assistant will be mounted here */}
    </div>
  );
};

export default React.memo(VapiAssistant);