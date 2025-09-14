import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { message, instructions, contextMessages, latestSender, hasIntroduced, lastBotMessage } = await request.json();

    if (!message || !instructions) {
      return NextResponse.json(
        { error: 'Message and instructions are required' },
        { status: 400 }
      );
    }

    // Check if Cohere API key is available
    const cohereApiKey = process.env.COHERE_API_KEY || process.env.NEXT_PUBLIC_COHERE_API_KEY;
    if (!cohereApiKey) {
      return NextResponse.json(
        { error: 'Cohere API key not configured' },
        { status: 500 }
      );
    }

    // Prepare the prompt for Cohere with enhanced context handling
    let prompt = `You are an AI assistant that responds to messages based on specific instructions. 

Instructions: ${instructions}

${contextMessages ? `CONVERSATION HISTORY (for context only):
${contextMessages}

` : ''}CURRENT MESSAGE TO RESPOND TO: ${message}
${latestSender ? `(This message is from: ${latestSender})` : ''}

${hasIntroduced ? `CONVERSATION CONTEXT: You have already introduced yourself in this conversation. Do NOT repeat your introduction or mention who you are again.` : ''}
${lastBotMessage ? `YOUR LAST MESSAGE: "${lastBotMessage}" - Do NOT repeat this message or similar content.` : ''}

IMPORTANT RESPONSE GUIDELINES:
- Respond ONLY to the current message above, not to the conversation history
- Do NOT introduce yourself or mention that you're an AI assistant
- Do NOT repeat information from previous messages unless directly relevant
- Do NOT repeat your last message or similar content
- Keep your response natural and conversational
- Match the tone and style of the conversation
- Be helpful and engaging without being repetitive
- If you're not confident you can provide a good answer, respond with "I'm not sure how to respond to this. Please let me know if you need any clarification."

Respond in a natural, conversational tone that matches the context. Keep responses concise but helpful.`;

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
        max_tokens: 200,
        temperature: 0.7,
        stop_sequences: ['Human:', 'Assistant:'],
      }),
    });

    if (!cohereResponse.ok) {
      const errorData = await cohereResponse.json();
      console.error('Cohere API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to generate response from Cohere API' },
        { status: 500 }
      );
    }

    const cohereData = await cohereResponse.json();
    const generatedText = cohereData.generations?.[0]?.text?.trim() || '';

    // Calculate confidence based on response quality
    let confidence = 0.8; // Default confidence
    
    // Lower confidence if response indicates uncertainty
    if (generatedText.toLowerCase().includes("i'm not sure") || 
        generatedText.toLowerCase().includes("i don't know") ||
        generatedText.toLowerCase().includes("i can't") ||
        generatedText.toLowerCase().includes("unable to")) {
      confidence = 0.3;
    }
    
    // Higher confidence for longer, more detailed responses
    if (generatedText.length > 50) {
      confidence = Math.min(0.9, confidence + 0.1);
    }

    return NextResponse.json({
      response: generatedText,
      confidence: confidence,
    });

  } catch (error) {
    console.error('Error generating AI response:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
