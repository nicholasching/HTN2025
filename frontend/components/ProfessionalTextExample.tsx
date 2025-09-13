'use client';

import { useState } from 'react';
import ProfessionalTextWidget from './ProfessionalTextWidget';

export default function ProfessionalTextExample() {
  const [sentMessages, setSentMessages] = useState<string[]>([]);

  const handleSendMessage = (message: string) => {
    setSentMessages(prev => [...prev, message]);
    console.log('Message sent:', message);
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-gray-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-white">Professional Text Widget Demo</h1>
          <p className="text-gray-400">Type casual text and convert it to professional format</p>
        </div>

        {/* Widget Demo */}
        <div className="bg-[#1a1a1a] border border-gray-800/50 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Try the Widget</h2>
          <ProfessionalTextWidget
            onSend={handleSendMessage}
            placeholder="Type something casual like 'hey can u help me with this thing?'"
            className="w-full"
          />
          <div className="mt-3 text-xs text-gray-400">
            💡 Tip: Type your message and click the 💼 button to see the professional version
          </div>
        </div>

        {/* Sent Messages Display */}
        {sentMessages.length > 0 && (
          <div className="bg-[#1a1a1a] border border-gray-800/50 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Sent Messages</h2>
            <div className="space-y-3">
              {sentMessages.map((message, index) => (
                <div
                  key={index}
                  className="p-3 bg-gray-800/50 border border-gray-700/50 rounded-lg text-sm text-gray-300"
                >
                  <div className="text-xs text-gray-500 mb-1">Message #{index + 1}</div>
                  {message}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Usage Examples */}
        <div className="bg-[#1a1a1a] border border-gray-800/50 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Example Transformations</h2>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-2">Casual Input</h3>
                <div className="p-3 bg-gray-800/50 rounded text-sm text-gray-400">
                  "hey can u help me with this thing? its kinda urgent lol"
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-blue-300 mb-2">Professional Output</h3>
                <div className="p-3 bg-blue-900/20 border border-blue-700/50 rounded text-sm text-white">
                  "Hello, I would appreciate your assistance with this matter. It is somewhat time-sensitive."
                </div>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-2">Casual Input</h3>
                <div className="p-3 bg-gray-800/50 rounded text-sm text-gray-400">
                  "thanks for the meeting today, it was pretty good. lets do this!"
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-blue-300 mb-2">Professional Output</h3>
                <div className="p-3 bg-blue-900/20 border border-blue-700/50 rounded text-sm text-white">
                  "Thank you for the productive meeting today. I look forward to moving forward with this initiative."
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Integration Instructions */}
        <div className="bg-[#1a1a1a] border border-gray-800/50 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">How to Use</h2>
          <div className="space-y-3 text-sm text-gray-300">
            <div className="flex items-start gap-3">
              <span className="text-blue-400 font-mono">1.</span>
              <span>Type your casual or informal text in the input field</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-blue-400 font-mono">2.</span>
              <span>Click the 💼 button or press Enter to convert to professional format</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-blue-400 font-mono">3.</span>
              <span>Review both the original and professional versions in the popup</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-blue-400 font-mono">4.</span>
              <span>Choose to send either the original or professional version</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
