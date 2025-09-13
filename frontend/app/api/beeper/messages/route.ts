import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const accessToken = request.headers.get('authorization')?.replace('Bearer ', '');
  const { searchParams } = new URL(request.url);
  
  if (!accessToken) {
    return NextResponse.json({ error: 'No access token provided' }, { status: 401 });
  }

  try {
    // Build query parameters
    const params = new URLSearchParams();
    if (searchParams.get('limit')) params.set('limit', searchParams.get('limit')!);
    if (searchParams.get('chatIDs')) params.set('chatIDs', searchParams.get('chatIDs')!);
    if (searchParams.get('cursor')) params.set('cursor', searchParams.get('cursor')!);
    if (searchParams.get('direction')) params.set('direction', searchParams.get('direction')!);
    if (searchParams.get('accountIDs')) params.set('accountIDs', searchParams.get('accountIDs')!);
    if (searchParams.get('chatType')) params.set('chatType', searchParams.get('chatType')!);
    if (searchParams.get('dateAfter')) params.set('dateAfter', searchParams.get('dateAfter')!);
    if (searchParams.get('dateBefore')) params.set('dateBefore', searchParams.get('dateBefore')!);
    if (searchParams.get('excludeLowPriority')) params.set('excludeLowPriority', searchParams.get('excludeLowPriority')!);
    if (searchParams.get('includeMuted')) params.set('includeMuted', searchParams.get('includeMuted')!);
    if (searchParams.get('mediaTypes')) params.set('mediaTypes', searchParams.get('mediaTypes')!);
    if (searchParams.get('query')) params.set('query', searchParams.get('query')!);
    if (searchParams.get('sender')) params.set('sender', searchParams.get('sender')!);

    // Try different possible Beeper API URLs (23373 is the current default)
    const possibleUrls = [
      `http://localhost:23373/v0/search-messages?${params}`,
      `http://127.0.0.1:23373/v0/search-messages?${params}`,
      `http://localhost:7777/v0/search-messages?${params}`,
      `http://127.0.0.1:7777/v0/search-messages?${params}`
    ];

    let response;
    let lastError;

    for (const url of possibleUrls) {
      try {
        console.log(`Trying Beeper API at: ${url}`);
        response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          return NextResponse.json(data);
        }
      } catch (error) {
        console.log(`Failed to connect to ${url}:`, error);
        lastError = error;
        continue;
      }
    }

    // If all URLs failed
    return NextResponse.json({ 
      error: 'Could not connect to Beeper Desktop API on any port',
      details: 'Make sure Beeper Desktop is running with API enabled',
      lastError: lastError instanceof Error ? lastError.message : String(lastError)
    }, { status: 503 });

  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
