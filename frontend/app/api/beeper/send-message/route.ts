import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const accessToken = request.headers.get('authorization')?.replace('Bearer ', '');
  
  if (!accessToken) {
    return NextResponse.json({ error: 'No access token provided' }, { status: 401 });
  }

  try {
    const body = await request.json();
    
    if (!body.chatID) {
      return NextResponse.json({ error: 'chatID is required' }, { status: 400 });
    }

    if (!body.text?.trim()) {
      return NextResponse.json({ error: 'Message text is required' }, { status: 400 });
    }

    // Log the chat ID format for debugging
    console.log(`📝 Chat ID format check:`, {
      chatID: body.chatID,
      startsWithExclamation: body.chatID.startsWith('!'),
      containsColon: body.chatID.includes(':'),
      length: body.chatID.length
    });

    // Try different possible Beeper API URLs (23373 is the current default)
    const possibleUrls = [
      'http://localhost:23373/v0/send-message',
      'http://127.0.0.1:23373/v0/send-message',
      'http://localhost:7777/v0/send-message',
      'http://127.0.0.1:7777/v0/send-message'
    ];

    let response;
    let lastError;

    for (const url of possibleUrls) {
      try {
        console.log(`Trying to send message via: ${url}`);
        console.log(`Message data:`, { 
          chatID: body.chatID, 
          text: body.text?.substring(0, 50) + '...',
          hasReply: !!body.replyToMessageID 
        });
        
        const requestBody = {
          chatID: body.chatID,
          text: body.text,
          ...(body.replyToMessageID && { replyToMessageID: body.replyToMessageID })
        };
        
        console.log(`Full request body:`, JSON.stringify(requestBody, null, 2));
        
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        console.log(`Response status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Message sent successfully via ${url}`);
          console.log(`Response data:`, data);
          
          // Validate the response has expected fields
          if (!data.pendingMessageID && !data.messageID) {
            console.warn(`⚠️ Response missing pendingMessageID/messageID:`, data);
            // Still return the response as it might be valid for this network
          }
          
          return NextResponse.json(data);
        } else {
          const errorText = await response.text();
          console.log(`❌ Failed to send via ${url}: ${response.status} ${response.statusText}`);
          console.log(`Error response body:`, errorText);
          
          // Try to parse error as JSON for better debugging
          try {
            const errorJson = JSON.parse(errorText);
            console.log(`Parsed error:`, errorJson);
            
            // Check for specific error types
            if (errorJson.error?.includes('not found') || errorJson.error?.includes('invalid')) {
              console.error(`🚫 Chat ID might be invalid or not accessible: ${body.chatID}`);
            }
            if (errorJson.error?.includes('permission') || errorJson.error?.includes('forbidden')) {
              console.error(`🚫 Permission issue - might not be able to send to this chat type`);
            }
          } catch {
            console.log(`Raw error text:`, errorText);
          }
        }
      } catch (error) {
        console.log(`Failed to connect to ${url}:`, error);
        lastError = error;
        continue;
      }
    }

    // If all URLs failed
    return NextResponse.json({ 
      error: 'Could not send message via Beeper Desktop API on any port',
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
