/**
 * postMessages.ts
 * 
 * Function to send messages to Beeper chats via API route
 */

export interface MessageSendParams {
  chatID: string;
  text?: string;
  replyToMessageID?: string;
}

export interface MessageSendResponse {
  success: boolean;
  error?: string;
  chatID: string;
  pendingMessageID: string;
  messageID?: string; // Some networks may return messageID instead of pendingMessageID
}

/**
 * Send a message to a specific chat via API route
 * 
 * @param messageParams - Message parameters (chatID, text, optional replyToMessageID)
 * @param accessToken - Required access token
 * @returns Promise<MessageSendResponse> - Response with success status and message ID
 */
export async function sendMessage(
  messageParams: MessageSendParams,
  accessToken: string
): Promise<MessageSendResponse> {
  if (!accessToken) {
    throw new Error('Access token is required.');
  }

  if (!messageParams.chatID) {
    throw new Error('Chat ID is required.');
  }

  if (!messageParams.text?.trim()) {
    throw new Error('Message text is required.');
  }

  try {
    console.log(`📤 Sending message to chat: ${messageParams.chatID}`);
    console.log(`Message: "${messageParams.text}"`);
    
    const response = await fetch('http://localhost:3000/api/beeper/send-message', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messageParams),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    
    console.log(`✅ Message sent successfully!`);
    console.log(`Response:`, result);
    
    // Handle different response formats
    if (result.pendingMessageID) {
      console.log(`Pending Message ID: ${result.pendingMessageID}`);
    } else if (result.messageID) {
      console.log(`Message ID: ${result.messageID}`);
    } else if (result.success) {
      console.log(`Success flag received: ${result.success}`);
    } else {
      console.warn(`⚠️ Unexpected response format:`, result);
    }
    
    return result;
  } catch (error) {
    console.error(`Failed to send message:`, error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/**
 * Send a reply to a specific message
 * 
 * @param chatID - The chat ID to send the reply to
 * @param replyToMessageID - The message ID to reply to
 * @param text - The reply text
 * @param accessToken - Required access token
 * @returns Promise<MessageSendResponse> - Response with success status and message ID
 */
export async function sendReply(
  chatID: string,
  replyToMessageID: string,
  text: string,
  accessToken: string
): Promise<MessageSendResponse> {
  return sendMessage({
    chatID,
    text,
    replyToMessageID
  }, accessToken);
}
