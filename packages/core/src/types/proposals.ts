export type ProposalScope = 'operational' | 'major'
export type ProposalStatus = 'open' | 'closed' | 'withdrawn'
export type ProposalOutcome = 'passed' | 'failed' | 'withdrawn'
export type VoteChoice = 'yes' | 'no' | 'abstain'

export interface Proposal {
  id: string
  tribeId: string
  title: string
  body: string
  scope: ProposalScope        // only meaningful for hybrid; always set (Gun drops undefined fields)
  createdBy: string           // member pubkey
  createdAt: number
  closesAt: number            // computed from proposalDuration(tribe) at creation time
  status: ProposalStatus
  outcome: ProposalOutcome | 'none'  // 'none' while open (Gun drops undefined fields)
  closedAt: number            // 0 while open
  closedBy: string            // '' while open
}

export interface Vote {
  proposalId: string
  tribeId: string
  memberPub: string
  choice: VoteChoice
  castAt: number
}

export interface ProposalComment {
  id: string
  proposalId: string
  tribeId: string
  authorPub: string
  body: string
  postedAt: number
}
