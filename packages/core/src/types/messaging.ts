export type MessageType = 'text' | 'voice' | 'photo'

export interface Message {
  id: string
  tribeId: string
  channelId: string     // 'tribe-wide' | 'dm:<pubkeyA>-<pubkeyB>' sorted alphabetically
  senderId: string      // sender's pubkey
  type: MessageType
  content: string       // text content, or base64 data for voice/photo
  mimeType?: string     // 'audio/webm' | 'image/jpeg' etc
  sentAt: number        // unix timestamp
  deliveredAt?: number
  sig: string           // Gun SEA signature
}

export interface QueuedMessage {
  message: Message
  queuedAt: number
  attempts: number
}
