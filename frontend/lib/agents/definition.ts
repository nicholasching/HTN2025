/**
 * Definition Agent
 * 
 * Analyzes messages from Beeper chats to define business terms, slang, memes, 
 * and cultural references using Cohere AI
 */

import { CohereClient } from 'cohere-ai';

// Types for the agent
export interface DefinitionRequest {
  accountId: string;
  chatId: string;
  limit?: number;
  terms?: string[]; // Optional specific terms to define
  accessToken: string;
  cohereApiKey: string;
}

export interface DefinitionResult {
  term: string;
  definition: string;
  context: string;
  category: 'business' | 'slang' | 'meme' | 'cultural_reference' | 'technical' | 'other';
  confidence: number;
  examples?: string[];
  relatedLinks?: string[];
  source: 'message_context' | 'ai_knowledge';
}

export interface DefinitionResponse {
  definitions: DefinitionResult[];
  messageCount: number;
  chatInfo: {
    chatId: string;
    accountId: string;
    chatName?: string;
  };
  processingTime: number;
}

/**
 * Fetch messages from Beeper API using the library functions directly
 */
async function fetchMessagesFromAPI(
  accountId: string,
  chatId: string,
  limit: number,
  accessToken: string
): Promise<any[]> {
  try {
    // Import the fetchMessages function from the beeper library
    const { fetchMessages } = await import('@/lib/beeper');
    
    const messages = await fetchMessages(chatId, limit, accessToken);
    return messages || [];
  } catch (error) {
    console.error('Error fetching messages from Beeper:', error);
    
    // Return empty array instead of throwing error to allow fallback definitions
    console.warn('Falling back to definitions without message context');
    return [];
  }
}

/**
 * Extract potential terms and phrases from messages
 */
function extractTermsFromMessages(messages: any[]): string[] {
  const terms = new Set<string>();
  const patterns = [
    // Business acronyms (2-5 uppercase letters)
    /\b[A-Z]{2,5}\b/g,
    // Hashtags
    /#\w+/g,
    // @mentions
    /@\w+/g,
    // Quoted phrases
    /"([^"]+)"/g,
    // Words in ALL CAPS (potential emphasis/slang)
    /\b[A-Z]{3,}\b/g,
    // Common slang patterns (words ending in common slang suffixes)
    /\b\w+(?:ing|ed|er|est|ly|tion|sion)\b/g,
  ];

  messages.forEach(message => {
    const text = message.text || message.content || '';
    
    patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach((match: string) => {
          // Clean up the match
          const cleaned = match.replace(/['"#@]/g, '').trim();
          if (cleaned.length > 2 && cleaned.length < 50) {
            terms.add(cleaned);
          }
        });
      }
    });

    // Also look for potential technical terms or unusual words
    const words = text.split(/\s+/);
    words.forEach((word: string) => {
      const cleaned = word.replace(/[^\w]/g, '');
      // Add words that might be technical terms or proper nouns
      if (cleaned.length > 3 && /^[A-Z]/.test(cleaned)) {
        terms.add(cleaned);
      }
    });
  });

  return Array.from(terms).slice(0, 50); // Limit to 50 terms to avoid API limits
}

/**
 * Simple fallback definitions for common terms
 */
const fallbackDefinitions: Record<string, DefinitionResult> = {
  'api': {
    term: 'API',
    definition: 'Application Programming Interface - a set of protocols and tools for building software applications',
    context: 'Used in software development to allow different applications to communicate',
    category: 'technical',
    confidence: 0.9,
    source: 'ai_knowledge'
  },
  'ui': {
    term: 'UI',
    definition: 'User Interface - the visual elements and controls that users interact with in software',
    context: 'Frontend development and design',
    category: 'technical',
    confidence: 0.9,
    source: 'ai_knowledge'
  },
  'lol': {
    term: 'LOL',
    definition: 'Laugh Out Loud - expressing amusement or laughter',
    context: 'Common internet slang',
    category: 'slang',
    confidence: 0.95,
    source: 'ai_knowledge'
  }
};

/**
 * Use Cohere to analyze and define terms
 */
async function defineTermsWithCohere(
  terms: string[],
  messageContext: string,
  cohereApiKey: string
): Promise<DefinitionResult[]> {
  // Check for fallback definitions first
  const results: DefinitionResult[] = [];
  const termsToQuery: string[] = [];
  
  for (const term of terms) {
    const fallback = fallbackDefinitions[term.toLowerCase()];
    if (fallback) {
      results.push(fallback);
    } else {
      termsToQuery.push(term);
    }
  }
  
  // If we have fallback results and no terms left to query, return early
  if (termsToQuery.length === 0) {
    return results;
  }

  const cohere = new CohereClient({
    token: cohereApiKey,
    timeout: 30000, // 30 second timeout
  });

  const prompt = `You are a contextual definition assistant. Your job is to define terms based on how they are used in the specific message context provided.

CRITICAL: Always analyze the surrounding words and context to determine the most appropriate definition.

Term to define: ${termsToQuery.join(', ')}

Full message where the term appears: "${messageContext}"

Context analysis instructions:
1. Look at the words surrounding the term (before and after)
2. Identify the topic/domain of the conversation (tech, casual, business, etc.)
3. Consider what the term most likely means in THIS specific context
4. Choose the definition that makes the most sense given the surrounding words

Examples of contextual definitions:
- "Windsurf" in "Windsurf messed up my code" → AI coding assistant (because of "code" context)
- "Windsurf" in "went windsurfing at the beach" → water sport (because of "beach" context)
- "HTN" in "how many hackers at HTN?" → "Hack The North" (because of "hackers" context)
- "sus" in "that's so sus" → internet slang for "suspicious" (casual conversation context)
- "API" in "check the API docs" → "Application Programming Interface" (technical documentation context)

For the term "${termsToQuery.join(', ')}", analyze the message context and provide:
- A definition that fits the specific context of this message
- The category (business, slang, meme, cultural_reference, technical, company, other)
- Confidence level (0-1) based on how clear the context makes the meaning
- Explanation of how the surrounding words influenced your definition choice

Respond in JSON format:
{
  "definitions": [
    {
      "term": "${termsToQuery.join(', ')}",
      "definition": "Definition that fits this specific message context",
      "context": "Explanation of how surrounding words like 'code', 'agent', etc. indicate this meaning",
      "category": "technical",
      "confidence": 0.9,
      "examples": ["usage example 1", "usage example 2"],
      "relatedLinks": ["https://example.com"],
      "source": "message_context"
    }
  ]
}`;

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
    
    // Try to parse JSON response
    try {
      const parsed = JSON.parse(responseText);
      const cohereResults = parsed.definitions || [];
      return [...results, ...cohereResults];
    } catch (parseError) {
      // If JSON parsing fails, try to extract definitions manually
      console.warn('Failed to parse JSON response, attempting manual extraction');
      const extractedResults = extractDefinitionsFromText(responseText, termsToQuery);
      return [...results, ...extractedResults];
    }
  } catch (error) {
    console.error('Cohere API error:', error);
    // Return fallback results even if Cohere fails
    return results;
  }
}

/**
 * Fallback function to extract definitions from non-JSON response
 */
function extractDefinitionsFromText(text: string, terms: string[]): DefinitionResult[] {
  const definitions: DefinitionResult[] = [];
  
  terms.forEach(term => {
    // Simple pattern matching to extract definitions
    const termRegex = new RegExp(`${term}[:\\-]?\\s*([^\\n]+)`, 'i');
    const match = text.match(termRegex);
    
    if (match) {
      definitions.push({
        term,
        definition: match[1].trim(),
        context: 'Extracted from AI response',
        category: 'other',
        confidence: 0.7,
        source: 'ai_knowledge'
      });
    }
  });

  return definitions;
}

/**
 * Main function to define terms and phrases from chat messages
 */
export async function defineTermsAndPhrases(request: DefinitionRequest): Promise<DefinitionResponse> {
  const startTime = Date.now();
  
  try {
    // 1. Fetch messages from Beeper API (optional - fallback definitions work without messages)
    const messages = await fetchMessagesFromAPI(
      request.accountId,
      request.chatId,
      request.limit || 50,
      request.accessToken
    );


    // 2. Extract terms from messages or use provided terms
    const termsToDefine = request.terms && request.terms.length > 0 
      ? request.terms 
      : extractTermsFromMessages(messages);

    if (termsToDefine.length === 0) {
      return {
        definitions: [],
        messageCount: messages.length,
        chatInfo: {
          chatId: request.chatId,
          accountId: request.accountId,
        },
        processingTime: Date.now() - startTime
      };
    }

    // 3. Prepare message context for Cohere
    const messageContext = messages
      .slice(0, 20) // Use last 20 messages for context
      .map(msg => `${msg.sender?.displayName || 'User'}: ${msg.text || msg.content || ''}`)
      .join('\n')
      .substring(0, 3000); // Limit context length

    // 4. Use Cohere to define terms
    const definitions = await defineTermsWithCohere(
      termsToDefine,
      messageContext,
      request.cohereApiKey
    );

    // 5. Get chat info if available
    const firstMessage = messages[0];
    const chatName = firstMessage?.chatName || `Chat ${request.chatId}`;

    return {
      definitions,
      messageCount: messages.length,
      chatInfo: {
        chatId: request.chatId,
        accountId: request.accountId,
        chatName,
      },
      processingTime: Date.now() - startTime
    };

  } catch (error) {
    console.error('Definition agent error:', error);
    throw error;
  }
}
