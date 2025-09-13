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
    if (searchParams.get('accountIDs')) params.set('accountIDs', searchParams.get('accountIDs')!);

    // Try different possible Beeper API URLs (23373 is the current default)
    const possibleUrls = [
      `http://localhost:23373/v0/search-chats?${params}`,
      `http://127.0.0.1:23373/v0/search-chats?${params}`,
      `http://localhost:7777/v0/search-chats?${params}`,
      `http://127.0.0.1:7777/v0/search-chats?${params}`
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
