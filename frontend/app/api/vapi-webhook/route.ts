import { NextRequest, NextResponse } from 'next/server';
import { sendMessage } from '@/lib/beeper/postMessages';
import { fetchAllChats } from '@/lib/beeper';

interface VAPIWebhookPayload {
  type: string;
  call?: {
    id: string;
    status: string;
  };
  transcript?: {
    text: string;
    user: string;
  };
  message?: {
    type: string;
    content: string;
    role: string;
  };
}

interface SendMessageParams {
  platform: 'instagram' | 'discord' | 'slack' | 'linkedin' | 'messenger' | 'whatsapp' | 'sms';
  contact: string;
  text: string;
}

interface ParsedCommand {
  action: 'text' | 'message' | 'send';
  recipient: string;
  platform: 'instagram' | 'ig';
  message?: string;
}

function parseVoiceCommand(transcript: string): ParsedCommand | null {
  const text = transcript.toLowerCase().trim();
  
  // Patterns to match voice commands
  const patterns = [
    /(?:text|message|send)\s+(\w+)\s+on\s+(instagram|ig)(?:\s+(.+))?/,
    /(?:text|message|send)\s+(.+?)\s+on\s+(instagram|ig)(?:\s+saying\s+(.+))?/,
    /(?:instagram|ig)\s+(?:text|message|send)\s+(\w+)(?:\s+(.+))?/
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const [, recipient, platform, message] = match;
      return {
        action: 'text',
        recipient: recipient.trim(),
        platform: platform as 'instagram' | 'ig',
        message: message?.trim()
      };
    }
  }

  return null;
}

// Helper function to find chat ID for a contact on a specific platform
async function findChatForContact(contactName: string, platform: string, accessToken: string): Promise<string | null> {
  try {
    console.log(`🔍 Searching for ${platform} chat with: ${contactName}`);
    
    // Fetch chats using the same backend as the rest of the app
    // We need to get all chats since we don't have a specific accountID
    const chats = await fetchAllChats(accessToken, { limit: 200, includeMuted: true });
    
    // Filter chats by platform (accountID) - handle platform account name variations
    let accountName = platform;
    if (platform === 'discord') {
      accountName = 'discordgo'; // Discord account is named 'discordgo' in Beeper
    } else if (platform === 'instagram') {
      accountName = 'instagramgo'; // Instagram account is named 'instagramgo' in Beeper
    }
    
    const platformChats = chats.filter((chat: any) => chat.accountID === accountName);
    console.log(`📱 Found ${platformChats.length} ${platform} chats (accountID: ${accountName})`);
    
    // Debug: Show all available accountIDs if no chats found
    if (platformChats.length === 0) {
      const availableAccounts = [...new Set(chats.map((chat: any) => chat.accountID))];
      console.log(`🔍 Available accountIDs:`, availableAccounts);
    }
    
    // Find chat matching the contact name
    const matchingChat = platformChats.find((chat: any) => {
      // Check chat title/name
      if (chat.title?.toLowerCase().includes(contactName.toLowerCase()) || 
          chat.name?.toLowerCase().includes(contactName.toLowerCase())) {
        return true;
      }
      
      // Check participants (participants.items is the actual array)
      if (chat.participants?.items) {
        return chat.participants.items.some((p: any) => 
          p.displayName?.toLowerCase().includes(contactName.toLowerCase()) ||
          p.name?.toLowerCase().includes(contactName.toLowerCase())
        );
      }
      
      return false;
    });

    if (matchingChat) {
      console.log(`✅ Found ${platform} chat:`, { id: matchingChat.id, name: matchingChat.name });
      return matchingChat.id;
    }

    // List available contacts for debugging
    const availableContacts = platformChats.map((chat: any) => 
      chat.name || chat.participants?.map((p: any) => p.displayName).join(', ') || 'Unknown'
    ).join(', ');
    
    console.log(`❌ No ${platform} chat found for "${contactName}". Available: ${availableContacts}`);
    return null;
  } catch (error) {
    console.error(`Error finding ${platform} chat:`, error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🚀 VAPI Webhook received:', JSON.stringify(body, null, 2));
    
    // Handle direct API request from VAPI (not wrapped in webhook format)
    if (body.platform && body.contact && body.text) {
      console.log('📧 Direct API request detected:', { platform: body.platform, contact: body.contact, text: body.text });
      
      try {
        const accessToken = process.env.NEXT_PUBLIC_BEEPER_ACCESS_TOKEN;
        if (!accessToken) {
          throw new Error('Beeper access token not configured');
        }

        // Find the chat for the contact on the specified platform
        const chatID = await findChatForContact(body.contact, body.platform, accessToken);
        
        if (!chatID) {
          throw new Error(`No ${body.platform} chat found with "${body.contact}". Make sure you have an existing conversation.`);
        }

        // Send message using the same backend as the rest of the app
        await sendMessage({ chatID, text: body.text }, accessToken);
        
        return NextResponse.json({
          success: true,
          message: `Message sent to ${body.contact} on ${body.platform}: "${body.text}"`
        });
      } catch (error) {
        console.error(`Error sending ${body.platform} message:`, error);
        return NextResponse.json({
          success: false,
          error: `Failed to send message to ${body.contact}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }, { status: 500 });
      }
    }
    
    // Handle VAPI webhook format
    const payload: VAPIWebhookPayload = body;
    console.log('📋 Payload type:', payload.type);
    console.log('💬 Message:', payload.message);

    // Handle different VAPI event types
    switch (payload.type) {
      case 'function-call':
        // Handle the function call
        if (payload.message?.type === 'function_call') {
          const functionCall = JSON.parse(payload.message.content);
          console.log('🔧 Function call received:', functionCall);
          
          // Handle both sendMessage and send_instagram_message function names
          if (functionCall.name === 'sendMessage' || functionCall.name === 'send_instagram_message') {
            let recipient: string;
            let message: string;
            let platform: string = 'instagram';
            
            // Handle different parameter formats
            if (functionCall.name === 'send_instagram_message') {
              // VAPI format: recipient, message
              recipient = functionCall.parameters.recipient;
              message = functionCall.parameters.message;
            } else {
              // Original format: contact, text, platform
              const params: SendMessageParams = functionCall.parameters;
              recipient = params.contact;
              message = params.text;
              platform = params.platform || 'instagram';
            }
            
            console.log('📧 Sending message:', { recipient, message, platform });
            
            try {
              const accessToken = process.env.NEXT_PUBLIC_BEEPER_ACCESS_TOKEN;
              if (!accessToken) {
                throw new Error('Beeper access token not configured');
              }

              // Find the chat for the contact on the specified platform
              const chatID = await findChatForContact(recipient, platform, accessToken);
              
              if (!chatID) {
                throw new Error(`No ${platform} chat found with "${recipient}". Make sure you have an existing conversation.`);
              }

              // Send message using the same backend as the rest of the app
              await sendMessage({ chatID, text: message }, accessToken);
              
              return NextResponse.json({
                message: {
                  type: 'function_result',
                  content: JSON.stringify({
                    success: true,
                    message: `Message sent to ${recipient} on ${platform}: "${message}"`
                  })
                }
              });
            } catch (error) {
              console.error(`Error sending ${platform} message:`, error);
              return NextResponse.json({
                message: {
                  type: 'function_result',
                  content: JSON.stringify({
                    success: false,
                    error: `Failed to send message to ${recipient}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`
                  })
                }
              });
            }
          } else {
            console.log('❌ Unknown function:', functionCall.name);
            return NextResponse.json({
              message: {
                type: 'function_result',
                content: JSON.stringify({
                  success: false,
                  error: `Unknown function: ${functionCall.name}`
                })
              }
            });
          }
        }
        break;

      case 'transcript':
        if (payload.transcript?.text) {
          const command = parseVoiceCommand(payload.transcript.text);
          
          if (command) {
            console.log('Parsed command:', command);
            
            // If no message provided, ask for it
            if (!command.message) {
              return NextResponse.json({
                message: {
                  type: 'request',
                  content: `What would you like to text ${command.recipient} on Instagram?`
                }
              });
            }

            // Send message through Beeper using same backend as rest of app
            try {
              const accessToken = process.env.NEXT_PUBLIC_BEEPER_ACCESS_TOKEN;
              if (!accessToken) {
                throw new Error('Beeper access token not configured');
              }

              const chatID = await findChatForContact(command.recipient, 'instagram', accessToken);
              
              if (!chatID) {
                throw new Error(`No Instagram chat found with "${command.recipient}". Make sure you have an existing conversation.`);
              }

              await sendMessage({ chatID, text: command.message }, accessToken);
              
              return NextResponse.json({
                message: {
                  type: 'success',
                  content: `Message sent to ${command.recipient} on Instagram: "${command.message}"`
                }
              });
            } catch (error) {
              console.error('Error sending Instagram message:', error);
              return NextResponse.json({
                message: {
                  type: 'error',
                  content: `Failed to send message to ${command.recipient}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`
                }
              });
            }
          }
        }
        break;

      case 'function-call':
        // Handle function calls if needed
        break;

      case 'call-start':
        return NextResponse.json({
          message: {
            type: 'greeting',
            content: 'Hi! I can help you send Instagram messages. Just say "text [name] on Instagram" and I\'ll help you send a message.'
          }
        });

      case 'call-end':
        console.log('Call ended');
        break;

      default:
        console.log('Unhandled VAPI event type:', payload.type);
    }

    return NextResponse.json({ status: 'received' });

  } catch (error) {
    console.error('Error processing VAPI webhook:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to process webhook',
        message: {
          type: 'error',
          content: 'Sorry, I had trouble processing that request. Please try again.'
        }
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    status: 'VAPI webhook endpoint active',
    supportedCommands: [
      'text [name] on instagram [message]',
      'message [name] on ig [message]',
      'send [name] on instagram [message]'
    ]
  });
}
