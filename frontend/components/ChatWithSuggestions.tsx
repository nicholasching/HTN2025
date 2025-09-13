'use client';

import React, { useState } from 'react';
import SuggestionSidebar from './SuggestionSidebar';
import SuggestionToggle from './SuggestionToggle';

interface ChatWithSuggestionsProps {
  chatId: string;
  accountId: string;
  accessToken: string;
  cohereApiKey: string;
  children: React.ReactNode;
}

export default function ChatWithSuggestions({
  chatId,
  accountId,
  accessToken,
  cohereApiKey,
  children
}: ChatWithSuggestionsProps) {
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarVisible(!isSidebarVisible);
  };

  return (
    <div className="relative h-full">
      {/* Main chat content */}
      <div className={`transition-all duration-300 ${isSidebarVisible ? 'mr-80' : 'mr-0'}`}>
        {children}
      </div>

      {/* Suggestion Toggle Button */}
      <SuggestionToggle 
        isVisible={isSidebarVisible}
        onToggle={toggleSidebar}
      />

      {/* Suggestion Sidebar */}
      <SuggestionSidebar
        chatId={chatId}
        accountId={accountId}
        accessToken={accessToken}
        cohereApiKey={cohereApiKey}
        isVisible={isSidebarVisible}
        onToggle={toggleSidebar}
      />
    </div>
  );
}
