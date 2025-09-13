import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { messages, chatName, options } = await request.json();
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    const cohereApiKey = process.env.NEXT_PUBLIC_COHERE_API_KEY;
    if (!cohereApiKey) {
      return NextResponse.json({ 
        error: 'Cohere API key not configured',
        details: 'Please set COHERE_API_KEY in your environment variables'
      }, { status: 500 });
    }

    // Prepare the conversation text
    const conversationText = messages.join('\n');
    const chatContext = chatName ? ` in the chat "${chatName}"` : '';
    
    // Create different prompts based on summary type
    let prompt: string;
    const summaryType = options?.summaryType || 'recent';
    
    if (summaryType === 'unread') {
      prompt = `Please provide a brief, conversational summary of these unread messages${chatContext}. Focus on what's new and important that the user needs to catch up on. Keep it concise and highlight key updates or requests:

${conversationText}

Unread Summary:`;
    } else {
      prompt = `Please provide a brief, conversational summary of this recent chat conversation${chatContext}. Focus on the main topics discussed and key points. Keep it concise and natural, like an iMessage-style preview:

${conversationText}

Summary:`;
    }

    // Call Cohere API
    const cohereResponse = await fetch('https://api.cohere.ai/v1/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cohereApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'command',
        prompt: prompt,
        max_tokens: options?.maxLength || 150,
        temperature: 0.3,
        k: 0,
        stop_sequences: ['\n\n'],
        return_likelihoods: 'NONE',
      }),
    });

    if (!cohereResponse.ok) {
      const errorData = await cohereResponse.text();
      console.error('Cohere API error:', errorData);
      return NextResponse.json({ 
        error: 'Failed to generate summary',
        details: 'Cohere API request failed'
      }, { status: 500 });
    }

    const cohereData = await cohereResponse.json();
    
    if (!cohereData.generations || cohereData.generations.length === 0) {
      return NextResponse.json({ 
        error: 'No summary generated',
        details: 'Cohere API returned no results'
      }, { status: 500 });
    }

    const summary = cohereData.generations[0].text.trim();

    return NextResponse.json({
      summary,
      messageCount: messages.length,
      generatedAt: new Date().toISOString(),
      summaryType: summaryType,
    });

  } catch (error) {
    console.error('Summary generation error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
