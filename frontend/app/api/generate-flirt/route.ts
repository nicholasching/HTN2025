import { NextRequest, NextResponse } from 'next/server';

interface MessageContext {
  sender: string;
  message: string;
}

type ResponseLength = 'short' | 'medium' | 'long';

export async function POST(request: NextRequest) {
  try {
    const { context, responseLength = 'medium' }: { context: MessageContext[], responseLength?: ResponseLength } = await request.json();

    const apiKey = process.env.NEXT_PUBLIC_COHERE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Cohere API key not configured' },
        { status: 500 }
      );
    }

    if (!context || context.length === 0) {
      return NextResponse.json(
        { error: 'No chat context provided' },
        { status: 400 }
      );
    }

    // Check if this is a custom prompt from SimpleWingman (sent as a single System message)
    const isCustomPrompt = context.length === 1 && context[0].sender === 'System';
    
    if (isCustomPrompt) {
      // Use the custom prompt directly
      const prompt = context[0].message + '\n\nIMPORTANT: Output ONLY the suggested response. Do not add any explanations, clarifications, commentary in parentheses, HTML tags, or meta-commentary.';
      
      // Use Cohere's REST API directly
      const response = await fetch('https://api.cohere.ai/v1/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'command',
          prompt: prompt,
          max_tokens: 100,
          temperature: 0.8,
          k: 0,
          stop_sequences: ['\n\n', '<em>', '</em>', '(', ')', 'Text him', 'Text her', 'Send:', 'Reply:', 'Message:'],
          return_likelihoods: 'NONE'
        }),
      });

      if (!response.ok) {
        throw new Error(`Cohere API error: ${response.status}`);
      }

      const data = await response.json();
      const suggestion = data.generations[0].text.trim();

      return NextResponse.json({
        suggestion: suggestion,
        context: context.length
      });
    }

    // Build the conversation context for default behavior
    const conversationHistory = context
      .map(msg => `${msg.sender}: ${msg.message}`)
      .join('\n');

    // Create length-specific guidelines
    const lengthGuidelines = {
      short: 'Keep it very brief and punchy (1 sentence, 10-20 words max)',
      medium: 'Keep it concise but engaging (1-2 sentences, 20-40 words)',
      long: 'Make it more detailed and expressive (2-3 sentences, 40-80 words)'
    };

    // Analyze conversation context to determine if pickup line is appropriate
    const shouldSuggestPickupLine = Math.random() < 0.3 && context.length >= 3; // 30% chance if conversation has depth
    
    // Create a prompt for generating flirting responses focused on romantic attraction
    const prompt = shouldSuggestPickupLine 
      ? `You are a clever AI wingman who creates context-aware pickup lines that build romantic attraction. Craft a witty, conversation-relevant pickup line that shows romantic interest.

CONVERSATION CONTEXT:
${conversationHistory}

PICKUP LINE GUIDELINES:
- Make it directly relevant to what's been discussed
- Show romantic interest and attraction
- Be clever and memorable, not cheesy
- Create a moment of romantic tension
- ${lengthGuidelines[responseLength]}
- Be confident and charming
- Make them smile and feel special

IMPORTANT: Output ONLY the pickup line. No explanations or commentary.

Generate a romantic, context-aware pickup line:`
      : `You are an AI wingman focused on building romantic attraction and chemistry. Generate responses that create romantic interest and sexual tension while keeping the conversation flowing.

CONVERSATION CONTEXT:
${conversationHistory}

FLIRTING GUIDELINES:
- Build romantic attraction and chemistry
- Show genuine romantic interest in the other person
- Use playful teasing, compliments, and romantic undertones
- Create sexual tension and romantic anticipation
- ${lengthGuidelines[responseLength]}
- Be charming, confident, and engaging
- Focus on making them feel desired and special
- Avoid being too aggressive or inappropriate

IMPORTANT: Output ONLY the flirty response. No explanations or commentary.

Generate a romantic, attraction-building response:`;

    // Use Cohere's REST API directly
    const response = await fetch('https://api.cohere.ai/v1/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'command',
        prompt: prompt,
        max_tokens: 100,
        temperature: 0.8,
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
        { error: 'No response generated from Cohere' },
        { status: 500 }
      );
    }

    const suggestion = data.generations[0].text.trim();

    return NextResponse.json({
      suggestion: suggestion,
      context: context.length
    });

  } catch (error) {
    console.error('Error generating flirting suggestion:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to generate suggestion',
        details: 'Check server logs for more information'
      },
      { status: 500 }
    );
  }
}
