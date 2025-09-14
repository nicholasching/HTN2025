'use client';

import { useState, useEffect } from 'react';

interface SettingsPageProps {
  isOpen: boolean;
  onClose: () => void;
  selectedChat?: string;
  chatName?: string;
  agentInstructionsMap: Record<string, string>;
  onUpdateAgentInstructions: (chatId: string, instructions: string) => void;
  onDeleteAgentInstructions: (chatId: string) => void;
  flirtIntensity: 'mild' | 'medium' | 'hot';
  onUpdateFlirtIntensity: (intensity: 'mild' | 'medium' | 'hot') => void;
  responseLength: 'short' | 'medium' | 'long';
  onUpdateResponseLength: (length: 'short' | 'medium' | 'long') => void;
  customContext: string;
  onUpdateCustomContext: (context: string) => void;
}

export default function SettingsPage({
  isOpen,
  onClose,
  selectedChat,
  chatName,
  agentInstructionsMap,
  onUpdateAgentInstructions,
  onDeleteAgentInstructions,
  flirtIntensity,
  onUpdateFlirtIntensity,
  responseLength,
  onUpdateResponseLength,
  customContext,
  onUpdateCustomContext
}: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<'agents' | 'flirting'>('agents');
  const [newInstructions, setNewInstructions] = useState('');
  const [editingChat, setEditingChat] = useState<string | null>(null);

  useEffect(() => {
    if (selectedChat && agentInstructionsMap[selectedChat]) {
      setNewInstructions(agentInstructionsMap[selectedChat]);
      setEditingChat(selectedChat);
    } else {
      setNewInstructions('');
      setEditingChat(null);
    }
  }, [selectedChat, agentInstructionsMap]);

  const handleSaveInstructions = () => {
    if (selectedChat && newInstructions.trim()) {
      onUpdateAgentInstructions(selectedChat, newInstructions.trim());
      setNewInstructions('');
      setEditingChat(null);
    }
  };

  const handleEditInstructions = (chatId: string) => {
    setEditingChat(chatId);
    setNewInstructions(agentInstructionsMap[chatId] || '');
  };

  const handleDeleteInstructions = (chatId: string) => {
    onDeleteAgentInstructions(chatId);
    if (editingChat === chatId) {
      setEditingChat(null);
      setNewInstructions('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] rounded-xl border border-gray-800/50 w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">⚙️</span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Settings</h2>
              <p className="text-sm text-gray-400">Configure AI agents and preferences</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-800/50">
          <button
            onClick={() => setActiveTab('agents')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'agents'
                ? 'text-white border-b-2 border-purple-500 bg-purple-500/10'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            🤖 AI Agents
          </button>
          <button
            onClick={() => setActiveTab('flirting')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'flirting'
                ? 'text-white border-b-2 border-pink-500 bg-pink-500/10'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            💕 Flirting Settings
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {activeTab === 'agents' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">AI Agent Instructions</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Configure AI agents for specific chats. The AI will automatically respond to messages based on your instructions.
                </p>

                {/* Current Chat Instructions */}
                {selectedChat && (
                  <div className="mb-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-white">
                        Current Chat: {chatName || 'Selected Chat'}
                      </h4>
                      {agentInstructionsMap[selectedChat] && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditInstructions(selectedChat)}
                            className="px-3 py-1.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs hover:bg-blue-600/30 transition-colors"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDeleteInstructions(selectedChat)}
                            className="px-3 py-1.5 bg-red-600/20 text-red-400 border border-red-500/30 rounded-lg text-xs hover:bg-red-600/30 transition-colors"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      )}
                    </div>

                    {editingChat === selectedChat ? (
                      <div className="space-y-3">
                        <textarea
                          value={newInstructions}
                          onChange={(e) => setNewInstructions(e.target.value)}
                          placeholder="Enter detailed instructions for the AI agent..."
                          className="w-full h-32 px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 resize-none"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveInstructions}
                            disabled={!newInstructions.trim()}
                            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
                          >
                            Save Instructions
                          </button>
                          <button
                            onClick={() => {
                              setEditingChat(null);
                              setNewInstructions('');
                            }}
                            className="px-4 py-2 bg-gray-600/50 text-white rounded-lg hover:bg-gray-500/50 focus:outline-none transition-all text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : agentInstructionsMap[selectedChat] ? (
                      <div className="p-3 bg-gray-700/30 rounded-lg">
                        <div className="text-sm text-gray-300 leading-relaxed">
                          {agentInstructionsMap[selectedChat]}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400 italic">
                        No instructions configured for this chat.
                      </div>
                    )}
                  </div>
                )}

                {/* All Chats */}
                <div>
                  <h4 className="text-sm font-medium text-white mb-3">All Configured Chats</h4>
                  {Object.keys(agentInstructionsMap).length === 0 ? (
                    <div className="text-sm text-gray-400 italic">
                      No AI agents configured yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(agentInstructionsMap).map(([chatId, instructions]) => (
                        <div key={chatId} className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-300">
                              Chat ID: {chatId.substring(0, 8)}...
                            </span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditInstructions(chatId)}
                                className="px-2 py-1 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded text-xs hover:bg-blue-600/30 transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteInstructions(chatId)}
                                className="px-2 py-1 bg-red-600/20 text-red-400 border border-red-500/30 rounded text-xs hover:bg-red-600/30 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                          <div className="text-xs text-gray-400 leading-relaxed">
                            {instructions.length > 100 
                              ? `${instructions.substring(0, 100)}...` 
                              : instructions
                            }
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'flirting' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Flirting Preferences</h3>
                <p className="text-sm text-gray-400 mb-6">
                  Customize how the AI generates flirty responses and suggestions.
                </p>

                {/* Flirt Intensity */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Flirt Intensity
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">😊</span>
                    <div className="flex-1 flex gap-1">
                      {(['mild', 'medium', 'hot'] as const).map((intensity) => (
                        <button
                          key={intensity}
                          onClick={() => onUpdateFlirtIntensity(intensity)}
                          className={`flex-1 px-4 py-3 text-sm rounded-lg transition-all ${
                            flirtIntensity === intensity
                              ? intensity === 'mild' ? 'bg-green-600 text-white shadow-lg shadow-green-500/30' :
                                intensity === 'medium' ? 'bg-yellow-600 text-white shadow-lg shadow-yellow-500/30' :
                                'bg-red-600 text-white shadow-lg shadow-red-500/30'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          {intensity.charAt(0).toUpperCase() + intensity.slice(1)}
                        </button>
                      ))}
                    </div>
                    <span className="text-sm text-gray-500">🔥</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {flirtIntensity === 'mild' && 'Normal conversation - friendly and neutral'}
                    {flirtIntensity === 'medium' && 'Friendly & warm - light compliments and interest'}
                    {flirtIntensity === 'hot' && 'Talking to your crush - confident and flirty'}
                  </div>
                </div>

                {/* Response Length */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Response Length
                  </label>
                  <div className="flex gap-2">
                    {(['short', 'medium', 'long'] as const).map((length) => (
                      <button
                        key={length}
                        onClick={() => onUpdateResponseLength(length)}
                        className={`px-4 py-2 text-sm rounded-lg transition-all ${
                          responseLength === length
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {length.charAt(0).toUpperCase() + length.slice(1)}
                      </button>
                    ))}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {responseLength === 'short' && '1 sentence, 10-20 words max'}
                    {responseLength === 'medium' && '1-2 sentences, 20-40 words'}
                    {responseLength === 'long' && '2-3 sentences, 40-80 words'}
                  </div>
                </div>

                {/* Custom Context */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Custom Context (optional)
                  </label>
                  <textarea
                    value={customContext}
                    onChange={(e) => onUpdateCustomContext(e.target.value)}
                    placeholder="e.g., 'Be more playful', 'Reference our shared interest in music', 'Keep it casual'"
                    className="w-full h-24 px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 resize-none"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    This context will be added to all flirty suggestions to personalize the AI's responses.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-800/50">
          <div className="text-xs text-gray-500">
            Settings are automatically saved
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
