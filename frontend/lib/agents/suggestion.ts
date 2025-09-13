/**
 * Suggestion Agent
 * 
 * Helps users be thoughtful, engaging, and remember context without scrolling back through months of messages.
 * Features: Talking Points Extraction, Conversation Starters, Context Surfacing, Future Reminders
 */

import { CohereClient } from 'cohere-ai';
import { fetchMessages, Message } from '@/lib/beeper';

// Types for the suggestion agent
export interface SuggestionRequest {
  accountId: string;
  chatId: string;
  limit?: number;
  accessToken: string;
  cohereApiKey: string;
}

export interface TalkingPoint {
  category: 'pet' | 'hobby' | 'show' | 'project' | 'sports_team' | 'interest' | 'work' | 'family' | 'other';
  topic: string;
  details: string;
  lastMentioned: string;
  frequency: number;
  importance: 'high' | 'medium' | 'low';
}

export interface ConversationStarter {
  text: string;
  category: 'follow_up' | 'check_in' | 'interest_based' | 'casual';
  relatedTopic?: string;
  confidence: number;
}

export interface ContextItem {
  topic: string;
  lastMention: string;
  timeAgo: string;
  summary: string;
  importance: 'high' | 'medium' | 'low';
}

export interface FutureReminder {
  topic: string;
  category: string;
  nextCheckIn: string;
  notes: string;
  recurring: boolean;
}

export interface SuggestionResponse {
  talkingPoints: TalkingPoint[];
  conversationStarters: ConversationStarter[];
  pastContext: ContextItem[];
  futureReminders: FutureReminder[];
  chatInfo: {
    chatId: string;
    accountId: string;
    chatName?: string;
    participantCount: number;
  };
  processingTime: number;
}

/**
 * Fetch and analyze chat messages for suggestions
 */
async function fetchChatHistory(
  accountId: string,
  chatId: string,
  limit: number,
  accessToken: string
): Promise<Message[]> {
  try {
    const messages = await fetchMessages(chatId, limit, accessToken);
    return messages || [];
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return [];
  }
}

/**
 * Extract talking points using Cohere AI
 */
async function extractTalkingPoints(
  messages: Message[],
  cohereApiKey: string
): Promise<TalkingPoint[]> {
  if (messages.length === 0) return [];

  const cohere = new CohereClient({
    token: cohereApiKey,
  });

  // Prepare message context
  const messageContext = messages
    .slice(0, 100) // Use last 100 messages for analysis
    .map(msg => {
      const sender = msg.sender?.displayName || 'User';
      const text = msg.text || '';
      const timestamp = msg.timestamp ? new Date(typeof msg.timestamp === 'number' ? msg.timestamp * 1000 : msg.timestamp).toISOString() : '';
      return `[${timestamp}] ${sender}: ${text}`;
    })
    .join('\n');

  const prompt = `Analyze this chat conversation and extract key talking points about the other person's life. Focus on personal details that would help someone be more thoughtful and engaging in future conversations.

Chat Messages:
${messageContext}

Extract talking points in these categories:
- Pets (names, types, health, behavior)
- Hobbies (activities they enjoy, skill level, frequency)
- Shows/Movies/Books (what they're watching/reading, opinions)
- Projects (work projects, personal projects, goals)
- Sports Teams (teams they support, recent games)
- Interests (general interests, passions, collections)
- Work (job, company, challenges, achievements)
- Family (family members, relationships, events)
- Other (travel, health, life events, etc.)

For each talking point, determine:
1. How recently it was mentioned
2. How frequently it comes up
3. How important it seems to the person

Respond in JSON format:
{
  "talkingPoints": [
    {
      "category": "pet",
      "topic": "Dog named Max",
      "details": "Golden retriever, 3 years old, recently had surgery on his leg",
      "lastMentioned": "2025-01-10T15:30:00Z",
      "frequency": 8,
      "importance": "high"
    }
  ]
}

Only include topics that are clearly about the OTHER person (not the current user). Be specific and include relevant details.`;

  try {
    const response = await cohere.generate({
      model: 'command',
      prompt: prompt,
      maxTokens: 2000,
      temperature: 0.3,
      k: 0,
      stopSequences: [],
      returnLikelihoods: 'NONE'
    });

    const responseText = response.generations[0].text.trim();
    
    try {
      const parsed = JSON.parse(responseText);
      return parsed.talkingPoints || [];
    } catch (parseError) {
      console.warn('Failed to parse talking points JSON, attempting manual extraction');
      return extractTalkingPointsFromText(responseText);
    }
  } catch (error) {
    console.error('Cohere API error for talking points:', error);
    return [];
  }
}

/**
 * Generate conversation starters using Cohere AI
 */
async function generateConversationStarters(
  talkingPoints: TalkingPoint[],
  messages: Message[],
  cohereApiKey: string
): Promise<ConversationStarter[]> {
  if (talkingPoints.length === 0) return [];

  const cohere = new CohereClient({
    token: cohereApiKey,
  });

  // Get recent message context for conversation flow
  const recentMessages = messages.slice(0, 10);
  const lastMessageTime = recentMessages[0]?.timestamp;
  const timeSinceLastMessage = lastMessageTime ? 
    Date.now() - (typeof lastMessageTime === 'number' ? lastMessageTime * 1000 : new Date(lastMessageTime).getTime()) : 0;
  
  const hoursAgo = Math.floor(timeSinceLastMessage / (1000 * 60 * 60));

  const talkingPointsSummary = talkingPoints
    .slice(0, 10) // Top 10 most relevant
    .map(tp => `${tp.category}: ${tp.topic} - ${tp.details} (last mentioned: ${tp.lastMentioned})`)
    .join('\n');

  const prompt = `Generate natural, thoughtful conversation starters based on this person's interests and recent chat history.

Talking Points About This Person:
${talkingPointsSummary}

Time since last message: ${hoursAgo} hours ago

Generate conversation starters that are:
1. Natural and non-generic (avoid "How are you?")
2. Tied to specific details from their life
3. Appropriate for the time gap since last message
4. Engaging and show you remember/care about their interests

Categories:
- follow_up: Following up on something they mentioned
- check_in: Checking on their wellbeing/situation
- interest_based: Starting conversation about their interests
- casual: Light, friendly conversation

Respond in JSON format:
{
  "conversationStarters": [
    {
      "text": "How's Max doing after his leg surgery?",
      "category": "follow_up",
      "relatedTopic": "Dog named Max",
      "confidence": 0.9
    },
    {
      "text": "Did you catch the latest episode of that show you were binge-watching?",
      "category": "interest_based",
      "relatedTopic": "TV shows",
      "confidence": 0.8
    }
  ]
}

Generate 5-8 diverse starters with high confidence scores.`;

  try {
    const response = await cohere.generate({
      model: 'command',
      prompt: prompt,
      maxTokens: 1500,
      temperature: 0.4,
      k: 0,
      stopSequences: [],
      returnLikelihoods: 'NONE'
    });

    const responseText = response.generations[0].text.trim();
    
    try {
      const parsed = JSON.parse(responseText);
      return parsed.conversationStarters || [];
    } catch (parseError) {
      console.warn('Failed to parse conversation starters JSON');
      return [];
    }
  } catch (error) {
    console.error('Cohere API error for conversation starters:', error);
    return [];
  }
}

/**
 * Extract past context and important mentions
 */
function extractPastContext(messages: Message[], talkingPoints: TalkingPoint[]): ContextItem[] {
  const contextItems: ContextItem[] = [];
  
  // Group messages by time periods
  const now = Date.now();
  const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);

  talkingPoints.forEach(tp => {
    const lastMentionTime = new Date(tp.lastMentioned).getTime();
    let timeAgo = '';
    
    if (lastMentionTime > oneWeekAgo) {
      const days = Math.floor((now - lastMentionTime) / (24 * 60 * 60 * 1000));
      timeAgo = days === 0 ? 'Today' : `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (lastMentionTime > oneMonthAgo) {
      const weeks = Math.floor((now - lastMentionTime) / (7 * 24 * 60 * 60 * 1000));
      timeAgo = `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else {
      const months = Math.floor((now - lastMentionTime) / (30 * 24 * 60 * 60 * 1000));
      timeAgo = `${months} month${months > 1 ? 's' : ''} ago`;
    }

    contextItems.push({
      topic: tp.topic,
      lastMention: tp.lastMentioned,
      timeAgo,
      summary: tp.details,
      importance: tp.importance
    });
  });

  return contextItems.sort((a, b) => {
    // Sort by importance, then by recency
    const importanceOrder = { high: 3, medium: 2, low: 1 };
    if (importanceOrder[a.importance] !== importanceOrder[b.importance]) {
      return importanceOrder[b.importance] - importanceOrder[a.importance];
    }
    return new Date(b.lastMention).getTime() - new Date(a.lastMention).getTime();
  });
}

/**
 * Generate future reminders based on recurring themes
 */
function generateFutureReminders(talkingPoints: TalkingPoint[]): FutureReminder[] {
  const reminders: FutureReminder[] = [];
  
  talkingPoints.forEach(tp => {
    if (tp.frequency > 3 && tp.importance !== 'low') {
      let nextCheckIn = '';
      let recurring = true;
      
      switch (tp.category) {
        case 'pet':
          nextCheckIn = 'Weekly';
          break;
        case 'project':
        case 'work':
          nextCheckIn = 'Bi-weekly';
          break;
        case 'hobby':
        case 'sports_team':
          nextCheckIn = 'Monthly';
          break;
        case 'show':
          nextCheckIn = 'When new episodes air';
          recurring = false;
          break;
        default:
          nextCheckIn = 'Monthly';
      }

      reminders.push({
        topic: tp.topic,
        category: tp.category,
        nextCheckIn,
        notes: `Remember to ask about: ${tp.details}`,
        recurring
      });
    }
  });

  return reminders;
}

/**
 * Fallback function to extract talking points from non-JSON response
 */
function extractTalkingPointsFromText(text: string): TalkingPoint[] {
  const talkingPoints: TalkingPoint[] = [];
  
  // Simple pattern matching for common talking point patterns
  const patterns = [
    /pet[s]?[:\-\s]+([^.\n]+)/gi,
    /hobby[:\-\s]+([^.\n]+)/gi,
    /project[s]?[:\-\s]+([^.\n]+)/gi,
    /interest[s]?[:\-\s]+([^.\n]+)/gi,
  ];

  patterns.forEach((pattern, index) => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const categories: TalkingPoint['category'][] = ['pet', 'hobby', 'project', 'interest'];
        talkingPoints.push({
          category: categories[index] || 'other',
          topic: match.replace(pattern, '$1').trim(),
          details: match.trim(),
          lastMentioned: new Date().toISOString(),
          frequency: 1,
          importance: 'medium'
        });
      });
    }
  });

  return talkingPoints;
}

/**
 * Main function to generate suggestions for a chat
 */
export async function generateSuggestions(request: SuggestionRequest): Promise<SuggestionResponse> {
  const startTime = Date.now();
  
  try {
    // 1. Fetch chat messages
    const messages = await fetchChatHistory(
      request.accountId,
      request.chatId,
      request.limit || 200,
      request.accessToken
    );

    if (messages.length === 0) {
      return {
        talkingPoints: [],
        conversationStarters: [],
        pastContext: [],
        futureReminders: [],
        chatInfo: {
          chatId: request.chatId,
          accountId: request.accountId,
          participantCount: 0,
        },
        processingTime: Date.now() - startTime
      };
    }

    // 2. Extract talking points using AI
    const talkingPoints = await extractTalkingPoints(messages, request.cohereApiKey);

    // 3. Generate conversation starters
    const conversationStarters = await generateConversationStarters(
      talkingPoints, 
      messages, 
      request.cohereApiKey
    );

    // 4. Extract past context
    const pastContext = extractPastContext(messages, talkingPoints);

    // 5. Generate future reminders
    const futureReminders = generateFutureReminders(talkingPoints);

    // 6. Get chat info
    const participantNames = new Set(
      messages.map(msg => msg.sender?.displayName).filter(Boolean)
    );

    return {
      talkingPoints,
      conversationStarters,
      pastContext,
      futureReminders,
      chatInfo: {
        chatId: request.chatId,
        accountId: request.accountId,
        chatName: `Chat with ${Array.from(participantNames).join(', ')}`,
        participantCount: participantNames.size,
      },
      processingTime: Date.now() - startTime
    };

  } catch (error) {
    console.error('Suggestion agent error:', error);
    throw error;
  }
}
