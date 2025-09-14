import { NextRequest, NextResponse } from 'next/server';
import { BeeperClient } from '../../../lib/beeper-client';

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🚀 VAPI Webhook received:', JSON.stringify(body, null, 2));
    
    // Handle direct API request from VAPI (not wrapped in webhook format)
    if (body.platform && body.contact && body.text) {
      console.log('📧 Direct API request detected:', { platform: body.platform, contact: body.contact, text: body.text });
      
      const beeperClient = new BeeperClient();
      
      try {
        if (body.platform === 'instagram') {
          await beeperClient.sendInstagramMessage(body.contact, body.text);
          return NextResponse.json({
            success: true,
            message: `Message sent to ${body.contact} on Instagram: "${body.text}"`
          });
        } else if (body.platform === 'discord') {
          await beeperClient.sendDiscordMessage(body.contact, body.text);
          return NextResponse.json({
            success: true,
            message: `Message sent to ${body.contact} on Discord: "${body.text}"`
          });
        } else {
          return NextResponse.json({
            success: false,
            error: `${body.platform} is not supported yet. Currently available: Instagram, Discord.`
          }, { status: 400 });
        }
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
            
            const beeperClient = new BeeperClient();
            
            try {
              if (platform === 'instagram') {
                await beeperClient.sendInstagramMessage(recipient, message);
                return NextResponse.json({
                  message: {
                    type: 'function_result',
                    content: JSON.stringify({
                      success: true,
                      message: `Message sent to ${recipient} on Instagram: "${message}"`
                    })
                  }
                });
              } else if (platform === 'discord') {
                await beeperClient.sendDiscordMessage(recipient, message);
                return NextResponse.json({
                  message: {
                    type: 'function_result',
                    content: JSON.stringify({
                      success: true,
                      message: `Message sent to ${recipient} on Discord: "${message}"`
                    })
                  }
                });
              } else {
                return NextResponse.json({
                  message: {
                    type: 'function_result',
                    content: JSON.stringify({
                      success: false,
                      error: `${platform} is not supported yet. Currently available: Instagram, Discord.`
                    })
                  }
                });
              }
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

            // Send message through Beeper
            try {
              const beeperClient = new BeeperClient();
              await beeperClient.sendInstagramMessage(command.recipient, command.message);
              
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
                  content: `Failed to send message to ${command.recipient}. Make sure they're in your Instagram contacts.`
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
