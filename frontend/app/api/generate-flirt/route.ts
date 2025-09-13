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
    
    // Create a prompt for generating flirting responses
    const prompt = shouldSuggestPickupLine 
      ? `You are a clever AI wingman who knows when to deploy the perfect pickup line. Based on the conversation context, craft a witty, context-appropriate pickup line that feels natural and ties into what's been discussed. Make it smooth, not cheesy.

Conversation context:
${conversationHistory}

Guidelines:
- Create a pickup line that's directly relevant to the conversation topic
- Make it clever and witty, not generic or cheesy
- Ensure it feels natural given the conversation flow
- ${lengthGuidelines[responseLength]}
- Be charming and confident but not arrogant
- Make it memorable and smile-worthy

IMPORTANT: Output ONLY the suggested pickup line. Do not add any explanations, clarifications, or commentary in parentheses. Do not explain your reasoning or add meta-commentary.

Generate a single context-aware pickup line:`
      : `You are a subtle and sophisticated AI wingman helping someone play the "slow game" in flirting. Your goal is to keep conversations flowing naturally while building attraction gradually. Based on the following conversation context, suggest a response that's subtly flirtatious but primarily focused on continuing the conversation.

Conversation context:
${conversationHistory}

Guidelines:
- Be subtle and sophisticated, not obvious or pushy
- Focus on keeping the conversation going with genuine interest
- Use light teasing, curiosity, and intrigue rather than direct compliments
- Ask engaging questions or make observations that invite responses
- Build connection through shared interests or playful banter
- ${lengthGuidelines[responseLength]}
- Be respectful and considerate
- Be authentic and show genuine curiosity about them
- Avoid being too forward - play the long game

IMPORTANT: Output ONLY the suggested response. Do not add any explanations, clarifications, or commentary in parentheses. Do not explain your reasoning or add meta-commentary.

Generate a single subtle, conversation-continuing response:`;

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
