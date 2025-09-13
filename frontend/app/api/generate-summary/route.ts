import { NextRequest, NextResponse } from 'next/server';

interface MessageContext {
  sender: string;
  message: string;
  timestamp?: string | number;
  isUnread?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const { 
      messages, 
      chatName, 
      unreadCount 
    }: { 
      messages: MessageContext[], 
      chatName: string,
      unreadCount: number 
    } = await request.json();

    const apiKey = process.env.NEXT_PUBLIC_COHERE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Cohere API key not configured' },
        { status: 500 }
      );
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages provided' },
        { status: 400 }
      );
    }

    // Filter to only unread messages if there are unread messages
    const messagesToSummarize = unreadCount > 0 
      ? messages.filter(msg => msg.isUnread)
      : messages.slice(-10); // Last 10 messages if no unread

    if (messagesToSummarize.length === 0) {
      return NextResponse.json({
        summary: "No new messages to summarize.",
        unreadCount: 0
      });
    }

    // Build the conversation context
    const conversationHistory = messagesToSummarize
      .map(msg => `${msg.sender}: ${msg.message}`)
      .join('\n');

    // Create a prompt for generating chat summaries
    const prompt = `You are an AI assistant that creates concise, helpful summaries of chat conversations. Based on the following conversation from "${chatName}", create a brief summary that captures the key points and recent activity.

Conversation:
${conversationHistory}

Guidelines:
- Create a concise summary (1-2 sentences, max 50 words)
- Focus on the main topics discussed
- Highlight any important information, decisions, or requests
- Use a neutral, informative tone
- If there are unread messages, emphasize what's new
- Don't include personal details or sensitive information
- Make it useful for someone catching up on the conversation

Generate a brief summary:`;

    // Use Cohere's REST API with longer timeout
    const response = await fetch('https://api.cohere.ai/v1/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(30000), // 30 second timeout
      body: JSON.stringify({
        model: 'command',
        prompt: prompt,
        max_tokens: 80,
        temperature: 0.3,
        k: 0,
        stop_sequences: ['\n\n'],
        return_likelihoods: 'NONE'
      }),
    });

    if (!response.ok) {
      throw new Error(`Cohere API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.generations || data.generations.length === 0) {
      return NextResponse.json(
        { error: 'No summary generated from Cohere' },
        { status: 500 }
      );
    }

    const summary = data.generations[0].text.trim();

    return NextResponse.json({
      summary: summary,
      unreadCount: unreadCount,
      messageCount: messagesToSummarize.length
    });

  } catch (error) {
    console.error('Error generating chat summary:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to generate summary',
        details: 'Check server logs for more information'
      },
      { status: 500 }
    );
  }
}
