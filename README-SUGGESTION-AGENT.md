# 💡 Suggestion Agent

A powerful AI agent that helps users be more thoughtful, engaging, and remember context without scrolling back through months of messages.

## Features

### 🎯 Talking Points Extraction
- Automatically analyzes chat history using Cohere AI
- Extracts key details about the other person's life:
  - **Pets** (names, types, health, behavior)
  - **Hobbies** (activities, skill level, frequency)
  - **Shows/Movies/Books** (what they're watching/reading, opinions)
  - **Projects** (work projects, personal projects, goals)
  - **Sports Teams** (teams they support, recent games)
  - **Interests** (general interests, passions, collections)
  - **Work** (job, company, challenges, achievements)
  - **Family** (family members, relationships, events)
  - **Other** (travel, health, life events)

### 💬 Conversation Starters
- Generates natural, personalized conversation starters
- Avoids generic phrases like "How are you?"
- Ties into previously mentioned details
- Categories:
  - **Follow-up**: Following up on something they mentioned
  - **Check-in**: Checking on their wellbeing/situation
  - **Interest-based**: Starting conversation about their interests
  - **Casual**: Light, friendly conversation

### 📝 Context Surfacing
- Shows summary of when important topics were last mentioned
- Includes date/time context
- Displays in collapsible "Past Context" panel
- Prioritizes by importance and recency

### ⏰ Future Reminders
- Stores recurring themes and important follow-ups
- Creates reminders based on conversation patterns
- "Remember This" panel for easy access
- Suggests optimal check-in frequencies

## Quick Start

### 1. Wrap Your Chat Component

```tsx
import ChatWithSuggestions from '@/components/ChatWithSuggestions';

function MyApp() {
  return (
    <ChatWithSuggestions
      chatId="your-chat-id"
      accountId="your-account-id"
      accessToken="your-beeper-token"
      cohereApiKey="your-cohere-key"
    >
      <YourExistingChatComponent />
    </ChatWithSuggestions>
  );
}
```

### 2. Use the Agent Directly

```typescript
import { generateSuggestions } from '@/lib/agents/suggestion';

const suggestions = await generateSuggestions({
  chatId: 'chat-123',
  accountId: 'account-456',
  accessToken: 'your-beeper-token',
  cohereApiKey: 'your-cohere-key',
  limit: 200 // optional, defaults to 200
});

console.log(suggestions.talkingPoints);
console.log(suggestions.conversationStarters);
```

### 3. API Endpoint

```bash
POST /api/suggestions
Content-Type: application/json

{
  "chatId": "chat-123",
  "accountId": "account-456",
  "accessToken": "your-beeper-token",
  "cohereApiKey": "your-cohere-key",
  "limit": 200
}
```

## Components

### `SuggestionSidebar`
Main sidebar component with four panels:
- **Topics**: Talking points with categories and importance
- **Starters**: Conversation starter suggestions
- **Context**: Past context with time indicators
- **Reminders**: Future reminders and recurring themes

### `SuggestionToggle`
Floating action button to show/hide the sidebar with notification indicator.

### `ChatWithSuggestions`
Wrapper component that adds suggestion functionality to any chat interface.

### `SuggestionExample`
Complete demo component showing configuration and usage.

## Configuration

### Required Environment Variables
- **Beeper Access Token**: For fetching chat messages
- **Cohere API Key**: For AI analysis and generation

### Optional Parameters
- `limit`: Number of messages to analyze (default: 200)
- Message history depth for context analysis

## Types

```typescript
interface TalkingPoint {
  category: 'pet' | 'hobby' | 'show' | 'project' | 'sports_team' | 'interest' | 'work' | 'family' | 'other';
  topic: string;
  details: string;
  lastMentioned: string;
  frequency: number;
  importance: 'high' | 'medium' | 'low';
}

interface ConversationStarter {
  text: string;
  category: 'follow_up' | 'check_in' | 'interest_based' | 'casual';
  relatedTopic?: string;
  confidence: number;
}

interface ContextItem {
  topic: string;
  lastMention: string;
  timeAgo: string;
  summary: string;
  importance: 'high' | 'medium' | 'low';
}

interface FutureReminder {
  topic: string;
  category: string;
  nextCheckIn: string;
  notes: string;
  recurring: boolean;
}
```

## AI Processing Flow

1. **Message Fetching**: Uses Beeper Desktop API to get chat history
2. **Context Analysis**: Sends messages to Cohere AI for analysis
3. **Talking Points Extraction**: AI identifies key personal details
4. **Conversation Generation**: AI creates personalized starters
5. **Context Mapping**: System organizes information by time and importance
6. **Reminder Creation**: System identifies recurring themes for follow-up

## UI Features

- **Responsive Design**: Works on desktop and mobile
- **Real-time Updates**: Refresh button to get latest suggestions
- **Visual Indicators**: Icons, colors, and badges for easy scanning
- **Collapsible Panels**: Organized tabs for different suggestion types
- **Performance Metrics**: Shows processing time and message count

## Integration Examples

### With Existing Chat App
```tsx
// Replace your existing chat wrapper
<div className="chat-container">
  <ChatWithSuggestions {...suggestionProps}>
    <ExistingChatInterface />
  </ChatWithSuggestions>
</div>
```

### Custom Implementation
```tsx
import { SuggestionSidebar } from '@/components/SuggestionSidebar';

function CustomChat() {
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  return (
    <div className="relative">
      <ChatInterface />
      <button onClick={() => setShowSuggestions(!showSuggestions)}>
        💡 Suggestions
      </button>
      <SuggestionSidebar 
        isVisible={showSuggestions}
        onToggle={() => setShowSuggestions(!showSuggestions)}
        {...otherProps}
      />
    </div>
  );
}
```

## Error Handling

The agent includes comprehensive error handling:
- **API Failures**: Graceful fallbacks when Beeper or Cohere APIs are unavailable
- **Invalid Responses**: JSON parsing fallbacks for malformed AI responses
- **Missing Data**: Handles empty chat histories and missing message fields
- **Rate Limiting**: Respects API limits with appropriate error messages

## Performance Considerations

- **Message Limiting**: Analyzes last 200 messages by default (configurable)
- **Context Truncation**: Limits message context to 3000 characters for AI processing
- **Caching**: Consider implementing caching for frequently accessed chats
- **Async Processing**: All AI operations are non-blocking

## Future Enhancements

- **Local Storage**: Cache suggestions between sessions
- **Push Notifications**: Alert when it's time to check in on topics
- **Export Features**: Save talking points and reminders
- **Integration Webhooks**: Auto-update when new messages arrive
- **Multi-language Support**: Analyze chats in different languages
- **Custom Categories**: Allow users to define their own talking point categories
