import BeeperDesktop from '@beeper/desktop-api';

interface BeeperChat {
  id: string;
  name?: string;
  bridge: string;
  participants?: Array<{
    displayName?: string;
    userID: string;
  }>;
}

export class BeeperClient {
  private client: BeeperDesktop;

  constructor() {
    this.client = new BeeperDesktop({
      accessToken: process.env.NEXT_PUBLIC_BEEPER_ACCESS_TOKEN
    });
  }

  async sendDiscordMessage(recipient: string, message: string): Promise<void> {
    try {
      console.log(`🔍 Searching for Discord chat with: ${recipient}`);
      
      // Check if access token is available
      if (!process.env.NEXT_PUBLIC_BEEPER_ACCESS_TOKEN) {
        throw new Error('Beeper access token not configured. Please set NEXT_PUBLIC_BEEPER_ACCESS_TOKEN in your environment.');
      }

      // Search for Discord chats
      const chatResults = await this.client.chats.search({
        includeMuted: true,
        limit: 100
      });
      
      console.log(`📋 Found ${chatResults.items.length} total chats`);
      
      // Filter Discord chats for debugging
      const discordChats = chatResults.items.filter((chat: any) => chat.bridge === 'discord');
      console.log(`💬 Found ${discordChats.length} Discord chats:`, 
        discordChats.map((chat: any) => ({ 
          id: chat.id, 
          name: chat.name, 
          participants: Array.isArray(chat.participants) ? chat.participants.map((p: any) => p.displayName) : []
        }))
      );
      
      // Find Discord chat with the recipient
      const discordChat = chatResults.items.find((chat: any) => 
        chat.bridge === 'discord' && 
        (chat.name?.toLowerCase().includes(recipient.toLowerCase()) ||
         chat.participants?.some((p: any) => p.displayName?.toLowerCase().includes(recipient.toLowerCase())))
      );

      if (!discordChat) {
        const availableContacts = discordChats.map((chat: any) => 
          chat.name || (Array.isArray(chat.participants) ? chat.participants.map((p: any) => p.displayName).join(', ') : 'Unknown')
        ).join(', ');
        
        throw new Error(`No Discord chat found with "${recipient}". Available contacts: ${availableContacts || 'None'}. Make sure you have an existing Discord conversation with this person.`);
      }

      console.log(`✅ Found Discord chat:`, { 
        id: (discordChat as any).id, 
        name: (discordChat as any).name,
        participants: Array.isArray((discordChat as any).participants) ? (discordChat as any).participants.map((p: any) => p.displayName) : []
      });

      // Send the message
      await this.client.messages.send({
        chatID: discordChat.id,
        text: message
      });

      console.log(`✅ Message sent to ${recipient} on Discord: ${message}`);
    } catch (error) {
      console.error('❌ Error sending Discord message:', error);
      throw error;
    }
  }

  async sendInstagramMessage(recipient: string, message: string): Promise<void> {
    try {
      console.log(`🔍 Searching for Instagram chat with: ${recipient}`);
      
      // Check if access token is available
      if (!process.env.NEXT_PUBLIC_BEEPER_ACCESS_TOKEN) {
        throw new Error('Beeper access token not configured. Please set NEXT_PUBLIC_BEEPER_ACCESS_TOKEN in your environment.');
      }

      // Search for Instagram chats
      const chatResults = await this.client.chats.search({
        includeMuted: true,
        limit: 100
      });
      
      console.log(`📋 Found ${chatResults.items.length} total chats`);
      
      // Filter Instagram chats for debugging
      const instagramChats = chatResults.items.filter((chat: any) => chat.bridge === 'instagram');
      console.log(`📱 Found ${instagramChats.length} Instagram chats:`, 
        instagramChats.map((chat: any) => ({ 
          id: chat.id, 
          name: chat.name, 
          participants: Array.isArray(chat.participants) ? chat.participants.map((p: any) => p.displayName) : []
        }))
      );
      
      // Find Instagram chat with the recipient
      const instagramChat = chatResults.items.find((chat: any) => 
        chat.bridge === 'instagram' && 
        (chat.name?.toLowerCase().includes(recipient.toLowerCase()) ||
         chat.participants?.some((p: any) => p.displayName?.toLowerCase().includes(recipient.toLowerCase())))
      );

      if (!instagramChat) {
        const availableContacts = instagramChats.map((chat: any) => 
          chat.name || (Array.isArray(chat.participants) ? chat.participants.map((p: any) => p.displayName).join(', ') : 'Unknown')
        ).join(', ');
        
        throw new Error(`No Instagram chat found with "${recipient}". Available contacts: ${availableContacts || 'None'}. Make sure you have an existing Instagram conversation with this person.`);
      }

      console.log(`✅ Found Instagram chat:`, { 
        id: (instagramChat as any).id, 
        name: (instagramChat as any).name,
        participants: Array.isArray((instagramChat as any).participants) ? (instagramChat as any).participants.map((p: any) => p.displayName) : []
      });

      // Send the message
      await this.client.messages.send({
        chatID: instagramChat.id,
        text: message
      });

      console.log(`✅ Message sent to ${recipient} on Instagram: ${message}`);
    } catch (error) {
      console.error('❌ Error sending Instagram message:', error);
      throw error;
    }
  }

  async getInstagramChats(): Promise<any[]> {
    try {
      const chatResults = await this.client.chats.search({
        includeMuted: true,
        limit: 100
      });
      
      return chatResults.items.filter((chat: any) => chat.bridge === 'instagram');
    } catch (error) {
      console.error('Error getting Instagram chats:', error);
      throw error;
    }
  }

  async getDiscordChats(): Promise<any[]> {
    try {
      const chatResults = await this.client.chats.search({
        includeMuted: true,
        limit: 100
      });
      
      return chatResults.items.filter((chat: any) => chat.bridge === 'discord');
    } catch (error) {
      console.error('Error getting Discord chats:', error);
      throw error;
    }
  }

  async findContact(name: string, platform: 'instagram' | 'discord' = 'instagram'): Promise<any | null> {
    try {
      const chatResults = await this.client.chats.search({
        includeMuted: true,
        limit: 100
      });
      
      return chatResults.items.find((chat: any) => 
        chat.bridge === platform && 
        (chat.name?.toLowerCase().includes(name.toLowerCase()) ||
         chat.participants?.some((p: any) => p.displayName?.toLowerCase().includes(name.toLowerCase())))
      ) || null;
    } catch (error) {
      console.error('Error finding contact:', error);
      return null;
    }
  }
}
