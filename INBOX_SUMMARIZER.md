# InboxSummarizer Implementation

This document describes the InboxSummarizer system that provides iMessage-style catch-up summaries for unread messages using the Cohere API.

## Overview

The InboxSummarizer processes unread messages from multiple chat sources and provides:
- Concise notification briefs (≤140 chars)
- Detailed message digests with importance/urgency scoring
- VIP contact prioritization
- Action suggestions and due dates
- Suggested replies

## Architecture

### Components

1. **API Route** (`/api/beeper/summarize`)
   - Handles POST requests with threads and VIP contacts
   - Integrates with Cohere API using `command-r-plus` model
   - Returns structured JSON response

2. **Utility Functions** (`lib/beeper/summarizeMessages.ts`)
   - Converts Beeper messages to thread format
   - Handles VIP contact matching
   - Manages API calls and error handling

3. **React Components**
   - `InboxSummarizer`: Core summarization display component
   - `InboxSummarizerExample`: Full-featured example with configuration

### Data Flow

```
Beeper Messages → Thread Conversion → Cohere API → Structured Summary → React UI
```

## Setup Instructions

### 1. Environment Configuration

Create `.env.local` in the frontend directory:

```bash
# Beeper Desktop API
NEXT_PUBLIC_BEEPER_ACCESS_TOKEN=your_beeper_token_here

# Cohere API
COHERE_API_KEY=your_cohere_api_key_here
```

### 2. Get API Keys

**Beeper Desktop API:**
1. Open Beeper Desktop
2. Go to Settings → Advanced → Desktop API
3. Copy your access token

**Cohere API:**
1. Visit [Cohere Dashboard](https://dashboard.cohere.ai/)
2. Create an account and get your API key
3. Ensure you have credits for the `command-r-plus` model

### 3. Install Dependencies

```bash
cd frontend
npm install cohere-ai
```

## Usage

### Basic Usage

```tsx
import InboxSummarizer from '@/components/InboxSummarizer';

<InboxSummarizer
  accessToken="your_beeper_token"
  chatIds={["chat1", "chat2"]}
  vipContacts={["John Doe", "jane@example.com"]}
  autoRefresh={true}
  refreshInterval={60000}
/>
```

### Advanced Usage with Chat Loading

```tsx
import InboxSummarizerExample from '@/components/InboxSummarizerExample';

<InboxSummarizerExample />
```

## API Reference

### SummarizeRequest

```typescript
interface SummarizeRequest {
  contacts_vip: string[];  // Array of VIP contact names/emails/phones
  threads: Thread[];       // Array of message threads
}

interface Thread {
  id: string;              // Unique thread identifier
  chat_title?: string;     // Optional chat name
  sender: string;          // Sender name or number
  channel: string;         // Channel type (sms, imessage, email, slack, other)
  timestampISO: string;   // ISO timestamp
  text: string;           // Message content
}
```

### SummarizeResponse

```typescript
interface SummarizeResponse {
  notification_brief: string;  // ≤140 char summary
  digest: DigestResponse;      // Detailed breakdown
}

interface DigestResponse {
  total: number;           // Total message count
  urgent_count: number;   // Number of urgent messages
  items: DigestItem[];    // Individual message summaries
}

interface DigestItem {
  id: string;
  sender: string;
  vip: boolean;            // Is sender a VIP contact?
  channel: string;
  timestamp_local: string; // Localized timestamp
  importance: 0|1|2|3;    // Importance score (0=none, 3=high)
  urgency: 'none'|'low'|'medium'|'high';
  summary: string;         // ≤20 word summary
  key_facts: string[];    // Quoted facts from message
  action_type: 'none'|'reply'|'read'|'schedule'|'escalate'|'file';
  due_at: string|null;    // ISO date if deadline exists
  suggested_reply: string; // ≤120 char suggested response
}
```

## Scoring System

### Importance (0-3)
- **0**: None - Low priority messages
- **1**: Low - General messages
- **2**: Medium - Important but not critical
- **3**: High - VIP contacts or high-impact messages

### Urgency
- **none**: No time sensitivity
- **low**: Some time sensitivity
- **medium**: Moderate urgency
- **high**: Deadlines, approvals, blockers, time-sensitive

### Action Types
- **none**: No action required
- **reply**: Response needed
- **read**: Just needs to be read
- **schedule**: Scheduling required
- **escalate**: Needs escalation
- **file**: File/organize

## Customization

### System Prompt

The system prompt can be modified in `/api/beeper/summarize/route.ts` to:
- Change scoring criteria
- Adjust output format
- Add custom rules
- Modify timezone settings

### VIP Contact Matching

VIP contact matching is fuzzy and case-insensitive:
- Partial name matching
- Email domain matching
- Phone number matching

### Channel Detection

Channel types are detected based on chat ID patterns:
- `sms` - SMS messages
- `imessage` - iMessage conversations
- `email` - Email threads
- `slack` - Slack channels
- `other` - Default fallback

## Error Handling

The system handles:
- Missing API keys
- Network failures
- Invalid message formats
- Cohere API errors
- Empty message sets

## Performance Considerations

- Messages are limited to 10 per chat by default
- Cohere API calls are rate-limited
- Auto-refresh can be disabled to reduce API usage
- Caching can be implemented for frequently accessed summaries

## Security

- API keys are stored server-side only
- Access tokens are passed securely
- No message content is logged
- VIP contacts are processed locally

## Troubleshooting

### Common Issues

1. **"Cohere API key not configured"**
   - Ensure `COHERE_API_KEY` is set in `.env.local`
   - Restart the development server

2. **"Could not connect to Beeper Desktop API"**
   - Verify Beeper Desktop is running
   - Check the access token is correct
   - Ensure API is enabled in Beeper settings

3. **Empty summaries**
   - Check that chat IDs are valid
   - Verify messages exist in selected chats
   - Ensure Cohere API has sufficient credits

### Debug Mode

Enable debug logging by setting:
```bash
NODE_ENV=development
```

This will show detailed API calls and responses in the console.

## Future Enhancements

- Message filtering by date range
- Custom scoring rules
- Integration with calendar systems
- Push notifications for urgent messages
- Message threading and context
- Multi-language support
- Custom action types
- Integration with task management systems
