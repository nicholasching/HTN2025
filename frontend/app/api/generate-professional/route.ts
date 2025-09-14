import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { text }: { text: string } = await request.json();

    const apiKey = process.env.NEXT_PUBLIC_COHERE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Cohere API key not configured' },
        { status: 500 }
      );
    }

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'No text provided' },
        { status: 400 }
      );
    }

    // Create a prompt for converting text to professional format
    const prompt = `Rewrite this text in professional language. Keep it SHORT and natural:

"${text.trim()}"

Make it:
- Professional but not overly formal
- Same length or shorter than original
- Remove profanity
- Keep the core meaning
- Don't add extra politeness or questions

Professional version:`;

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
        temperature: 0.2,
        k: 0,
        stop_sequences: ['\n\n', 'Original:', 'Make it:'],
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

    let professionalText = data.generations[0].text.trim();
    
    // Clean up any remaining quotes or unwanted characters
    professionalText = professionalText.replace(/^["']|["']$/g, '').trim();
    
    // If empty or just punctuation, provide a fallback
    if (!professionalText || professionalText.length < 3) {
      professionalText = text.trim().replace(/fuck(ing|ed)?/gi, 'messed up').replace(/stupid/gi, 'confused');
    }

    return NextResponse.json({
      originalText: text.trim(),
      professionalText: professionalText
    });

  } catch (error) {
    console.error('Error generating professional text:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to generate professional text',
        details: 'Check server logs for more information'
      },
      { status: 500 }
    );
  }
}
