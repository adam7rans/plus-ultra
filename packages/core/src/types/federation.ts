import type { AssetType } from './assets.js'

export type FederationRelationshipStatus = 'contact' | 'allied' | 'distrusted'

export interface FederationRelationship {
  channelId: string           // [tribeIdA, tribeIdB].sort().join(':')
  myTribeId: string
  otherTribeId: string
  otherTribeName: string
  otherTribeLocation: string
  otherTribePub: string
  otherTribeEpub: string
  status: FederationRelationshipStatus
  initiatedBy: string         // diplomat pubkey who added the contact
  initiatedAt: number
  updatedAt: number
}

export interface FederatedMessage {
  id: string
  channelId: string
  fromTribeId: string
  fromTribeName: string
  senderPub: string
  senderName: string
  type: 'text' | 'intel'
  content: string             // decrypted plaintext
  sentAt: number
}

export interface TradeItem {
  asset: AssetType
  amount: number
}

export type TradeStatus =
  | 'pending'
  | 'countered'
  | 'accepted'
  | 'rejected'
  | 'pending_fulfillment'
  | 'fulfilled'

export interface FederatedTradeProposal {
  id: string
  channelId: string
  fromTribeId: string
  toTribeId: string
  fromTribeName: string
  toTribeName: string
  offer: TradeItem[]          // what fromTribe gives
  request: TradeItem[]        // what fromTribe wants (toTribe gives)
  message: string
  proposedBy: string          // diplomat pubkey
  proposedAt: number
  status: TradeStatus
  respondedAt?: number
  respondedBy?: string
  counterOffer?: { offer: TradeItem[]; request: TradeItem[] }
  lastRespondedByTribeId?: string   // whose turn it is to act
  fromFulfilled?: boolean
  toFulfilled?: boolean
}

export interface FederatedAlert {
  id: string
  channelId: string
  fromTribeId: string
  fromTribeName: string
  alertType: string
  message: string
  sentAt: number
}
