# Beeper API Tests

This directory contains test scripts for interacting with the Beeper Desktop API in both Python and TypeScript.

## Setup

### TypeScript Version (Recommended)

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Setup Access Token**:
   
   **Option A: Using .env file (Recommended)**
   ```bash
   # Copy the example file
   cp env.example .env
   
   # Edit .env and add your access token
   # BEEPER_ACCESS_TOKEN=your_access_token_here
   ```
   
   **Option B: Environment variable**
   ```bash
   export BEEPER_ACCESS_TOKEN="your_access_token_here"
   ```

3. **Get Access Token**:
   - Open Beeper Desktop application
   - Go to Settings → Advanced → Desktop API
   - Generate or copy your access token

### Python Version

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Enable Beeper Desktop API**:
   - Open Beeper Desktop application
   - Go to Settings → Advanced → Desktop API
   - Enable the Desktop API (usually runs on port 23373)

## Running Tests

### fetchMessages.ts (TypeScript - Official Client)

Uses the official `@beeper/desktop-api` client library for robust message fetching.

**Basic Usage**:
```bash
# Using .env file (recommended)
npm run dev

# With access token as argument (overrides .env)
npm run dev YOUR_ACCESS_TOKEN

# Build and run compiled version
npm run build
node dist/fetchMessages.js

# With ts-node directly
npx ts-node fetchMessages.ts
```

### fetchMessages.py (Python - Direct API)

Tests the message search functionality using direct HTTP requests.

**Basic Usage**:
```bash
python fetchMessages.py
```

**With Custom API URL**:
```bash
python fetchMessages.py http://localhost:8080
```

## Features

### TypeScript Version Features:
- **Official Client**: Uses `@beeper/desktop-api` for reliable API access
- **Automatic Pagination**: Seamlessly fetches all results using async iterators
- **Comprehensive Tests**: 9 different search scenarios including:
  - Recent messages
  - Keyword search ("hello")
  - Time-based filtering (last 24 hours)
  - Sender filtering (me/others)
  - Chat type filtering (group/single)
  - Media type filtering
  - Message length filtering
- **Robust Error Handling**: Graceful handling of API errors and connection issues
- **Access Token Support**: Secure authentication using access tokens
- **TypeScript Safety**: Full type checking and IntelliSense support

### Python Version Features:
- **Direct API Access**: Raw HTTP requests to `/v0/search-messages` endpoint
- **Parameter Testing**: Tests all API parameters (query, dateAfter, chatType, etc.)
- **Error Handling**: Connection and timeout error handling
- **Custom Endpoints**: Support for custom API URLs
- **Response Parsing**: Handles the full API response format with cursors

**Example TypeScript Output**:
```
Beeper Desktop API Message Fetcher Test (TypeScript)
============================================================

Testing basic connectivity...
✓ Successfully connected to Beeper Desktop API

================================================================================
TEST: Recent Messages (No Query)
================================================================================
Search options: {}

Fetching messages (max: 10)...

--- Message 1 ---
Message ID: msg-123
Chat: Family Group (ID: chat-456)
Sender: John Doe
Time: 9/13/2025, 2:30:25 PM
Content: Hey everyone, how's it going?
============================================================

Total messages processed: 10
```

## Troubleshooting

If you encounter connection issues:

1. **Check Beeper Desktop**: Make sure the Beeper Desktop app is running
2. **API Settings**: Verify the Desktop API is enabled in Beeper settings
3. **Port**: Default port is 7777, but check your Beeper settings
4. **Firewall**: Ensure no firewall is blocking localhost connections
5. **URL**: Try different URLs if using a custom setup

## API Reference

Based on the official Beeper Desktop API documentation:
https://developers.beeper.com/desktop-api-reference/resources/messages/methods/search
