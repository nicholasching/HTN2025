'use client';

import React, { useState } from 'react';
import ChatWithSuggestions from './ChatWithSuggestions';

export default function SuggestionExample() {
  // Example configuration - replace with actual values
  const [config, setConfig] = useState({
    chatId: 'example-chat-id',
    accountId: 'example-account-id',
    accessToken: '',
    cohereApiKey: ''
  });

  const [showDemo, setShowDemo] = useState(false);

  const handleConfigChange = (field: string, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            💡 Suggestion Agent Demo
          </h1>
          
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chat ID
                </label>
                <input
                  type="text"
                  value={config.chatId}
                  onChange={(e) => handleConfigChange('chatId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter chat ID from Beeper"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account ID
                </label>
                <input
                  type="text"
                  value={config.accountId}
                  onChange={(e) => handleConfigChange('accountId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter account ID from Beeper"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Access Token
                </label>
                <input
                  type="password"
                  value={config.accessToken}
                  onChange={(e) => handleConfigChange('accessToken', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter Beeper access token"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cohere API Key
                </label>
                <input
                  type="password"
                  value={config.cohereApiKey}
                  onChange={(e) => handleConfigChange('cohereApiKey', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter Cohere API key"
                />
              </div>
            </div>
            
            <button
              onClick={() => setShowDemo(!showDemo)}
              disabled={!config.chatId || !config.accountId || !config.accessToken || !config.cohereApiKey}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {showDemo ? 'Hide Demo' : 'Show Demo'}
            </button>
          </div>

          {/* Features Overview */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">🎯 Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold">1</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Talking Points Extraction</h3>
                    <p className="text-sm text-gray-600">
                      Automatically extracts key details about pets, hobbies, shows, projects, and interests from chat history.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 font-semibold">2</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Conversation Starters</h3>
                    <p className="text-sm text-gray-600">
                      Generates natural, personalized conversation starters based on chat history and context.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <span className="text-yellow-600 font-semibold">3</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Context Surfacing</h3>
                    <p className="text-sm text-gray-600">
                      Shows when important topics were last mentioned with time context.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-semibold">4</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Future Reminders</h3>
                    <p className="text-sm text-gray-600">
                      Creates reminders for recurring themes and important follow-ups.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Demo Interface */}
          {showDemo && (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b">
                <h2 className="text-xl font-semibold">Demo Chat Interface</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Click the lightbulb icon in the top-right to open the suggestion sidebar
                </p>
              </div>
              
              <ChatWithSuggestions
                chatId={config.chatId}
                accountId={config.accountId}
                accessToken={config.accessToken}
                cohereApiKey={config.cohereApiKey}
              >
                <div className="p-6 h-96 bg-gray-50">
                  <div className="bg-white rounded-lg p-4 h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-4xl mb-4">💬</div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Chat Interface Placeholder
                      </h3>
                      <p className="text-gray-600 max-w-md">
                        This is where your actual chat interface would go. 
                        The suggestion agent works alongside any chat UI.
                      </p>
                      <div className="mt-4 text-sm text-gray-500">
                        Click the 💡 button to see suggestions for this chat
                      </div>
                    </div>
                  </div>
                </div>
              </ChatWithSuggestions>
            </div>
          )}

          {/* Usage Instructions */}
          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <h2 className="text-xl font-semibold mb-4">📖 Usage Instructions</h2>
            <div className="prose max-w-none">
              <h3 className="text-lg font-medium mb-2">1. Integration</h3>
              <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-x-auto mb-4">
{`import ChatWithSuggestions from '@/components/ChatWithSuggestions';

// Wrap your existing chat component
<ChatWithSuggestions
  chatId="your-chat-id"
  accountId="your-account-id" 
  accessToken="your-beeper-token"
  cohereApiKey="your-cohere-key"
>
  <YourExistingChatComponent />
</ChatWithSuggestions>`}
              </pre>

              <h3 className="text-lg font-medium mb-2">2. Direct Agent Usage</h3>
              <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-x-auto mb-4">
{`import { generateSuggestions } from '@/lib/agents/suggestion';

const suggestions = await generateSuggestions({
  chatId: 'chat-123',
  accountId: 'account-456', 
  accessToken: 'your-token',
  cohereApiKey: 'your-key',
  limit: 200 // optional
});`}
              </pre>

              <h3 className="text-lg font-medium mb-2">3. API Endpoint</h3>
              <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-x-auto">
{`POST /api/suggestions
{
  "chatId": "chat-123",
  "accountId": "account-456",
  "accessToken": "your-token", 
  "cohereApiKey": "your-key",
  "limit": 200
}`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
