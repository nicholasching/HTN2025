# VAPI Instagram Messaging Setup Guide

This guide will help you set up VAPI to work with your Instagram messaging through Beeper integration.

## Prerequisites

1. **Beeper Desktop** installed and configured
2. **Instagram account** connected to Beeper
3. **VAPI account** (sign up at https://vapi.ai)
4. **Existing Instagram conversations** in Beeper (the system can only send to existing contacts)

## Step 1: Configure Environment Variables

Add these variables to your `.env.local` file:

```env
# VAPI Configuration
VAPI_API_KEY=your_vapi_api_key_here
VAPI_ASSISTANT_ID=your_assistant_id_here
VAPI_WEBHOOK_URL=your_webhook_url_here

# Beeper Configuration (if not already set)
NEXT_PUBLIC_BEEPER_ACCESS_TOKEN=your_beeper_token_here
```

## Step 2: Get Your Beeper Access Token

1. Open Beeper Desktop
2. Go to Settings → Advanced → Desktop API
3. Enable Desktop API
4. Copy the access token
5. Add it to your `.env.local` file

## Step 3: Set Up VAPI Assistant

1. Go to https://dashboard.vapi.ai
2. Create a new Assistant with these settings:

### Basic Configuration
- **Name**: Instagram Messenger
- **Voice**: Choose your preferred voice
- **Language**: English

### System Message
```
You are a voice assistant that helps users send Instagram messages through Beeper. 

When a user says something like "text Emily on Instagram" or "message John on IG", you should:
1. Parse the command to extract the recipient name and platform
2. If no message content is provided, ask "What would you like to text [name]?"
3. Once you have both recipient and message, send the message through the webhook

You can handle these voice patterns:
- "text [name] on instagram [message]"
- "message [name] on ig [message]" 
- "send [name] on instagram [message]"
- "instagram message [name] [message]"

Be conversational and helpful. Confirm successful sends and provide helpful error messages.
```

### Functions (Add this function)
```json
{
  "name": "send_instagram_message",
  "description": "Send a message to someone on Instagram through Beeper",
  "parameters": {
    "type": "object",
    "properties": {
      "recipient": {
        "type": "string",
        "description": "The name of the person to message"
      },
      "message": {
        "type": "string", 
        "description": "The message content to send"
      }
    },
    "required": ["recipient", "message"]
  }
}
```

## Step 4: Configure Webhook

### For Local Development
1. Install ngrok: `npm install -g ngrok`
2. Run your Next.js app: `npm run dev`
3. In another terminal: `ngrok http 3000`
4. Copy the https URL (e.g., `https://abc123.ngrok.io`)
5. Set webhook URL: `https://abc123.ngrok.io/api/vapi-webhook`

### For Production
Deploy your app and use: `https://your-domain.com/api/vapi-webhook`

## Step 5: Test the Integration

1. **Start your development server**:
   ```bash
   npm run dev
   ```

2. **Start ngrok** (for local testing):
   ```bash
   ngrok http 3000
   ```

3. **Update your VAPI assistant** with the ngrok webhook URL

4. **Test voice commands**:
   - "Hey VAPI, text Emily on Instagram"
   - "Message John on IG saying hey what's up"
   - "Send Sarah on Instagram: are we still on for tonight?"

## Supported Voice Commands

The system recognizes these patterns:

- `"text [name] on instagram [optional message]"`
- `"message [name] on ig [optional message]"`  
- `"send [name] on instagram [optional message]"`
- `"instagram text [name] [optional message]"`

## Troubleshooting

### Common Issues

1. **"No Instagram chat found"**
   - Make sure you have an existing conversation with that person in Beeper
   - Check that Instagram is properly connected to Beeper
   - Try using the exact name as it appears in Beeper

2. **Webhook not receiving calls**
   - Verify ngrok is running and URL is correct
   - Check that webhook URL in VAPI dashboard matches your ngrok URL
   - Ensure your Next.js server is running

3. **Beeper connection issues**
   - Verify Beeper Desktop API is enabled
   - Check that access token is correct in `.env.local`
   - Make sure Beeper Desktop is running

### Testing the Webhook Directly

You can test the webhook endpoint directly:

```bash
curl -X POST http://localhost:3000/api/vapi-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "transcript",
    "transcript": {
      "text": "text emily on instagram hey how are you",
      "user": "user"
    }
  }'
```

## Security Notes

- Keep your API keys secure and never commit them to version control
- The `.env.local` file is already gitignored
- Consider using environment-specific configurations for production

## Next Steps

Once everything is working:
1. Deploy your app to a permanent URL
2. Update VAPI webhook to use production URL
3. Consider adding more voice command patterns
4. Add support for other messaging platforms through Beeper
