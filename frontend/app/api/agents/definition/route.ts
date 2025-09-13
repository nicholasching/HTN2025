import { NextRequest, NextResponse } from 'next/server';
import { defineTermsAndPhrases } from '@/lib/agents/definition';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId, chatId, limit = 50, terms } = body;

    // Validate required parameters
    if (!accountId || !chatId) {
      return NextResponse.json(
        { error: 'accountId and chatId are required' },
        { status: 400 }
      );
    }

    // Get access token from headers
    const accessToken = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!accessToken) {
      return NextResponse.json(
        { error: 'No access token provided' },
        { status: 401 }
      );
    }

    // Get Cohere API key from headers or environment
    const cohereApiKey = request.headers.get('x-cohere-api-key') || process.env.NEXT_PUBLIC_COHERE_API_KEY;
    if (!cohereApiKey) {
      return NextResponse.json(
        { error: 'Cohere API key is required' },
        { status: 401 }
      );
    }

    // Call the definition agent
    const result = await defineTermsAndPhrases({
      accountId,
      chatId,
      limit,
      terms,
      accessToken,
      cohereApiKey
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('Definition agent error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
