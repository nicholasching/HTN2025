import { NextRequest, NextResponse } from 'next/server';
import { generateSuggestions, SuggestionRequest } from '@/lib/agents/suggestion';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const { chatId, accountId, accessToken, cohereApiKey } = body;
    
    if (!chatId || !accountId || !accessToken || !cohereApiKey) {
      return NextResponse.json(
        { error: 'Missing required fields: chatId, accountId, accessToken, cohereApiKey' },
        { status: 400 }
      );
    }

    // Prepare request for suggestion agent
    const suggestionRequest: SuggestionRequest = {
      chatId,
      accountId,
      accessToken,
      cohereApiKey,
      limit: body.limit || 200
    };

    // Generate suggestions
    const suggestions = await generateSuggestions(suggestionRequest);

    return NextResponse.json(suggestions);

  } catch (error) {
    console.error('Suggestions API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate suggestions',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to generate suggestions.' },
    { status: 405 }
  );
}
