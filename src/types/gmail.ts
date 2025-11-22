export interface GmailMessage {
  id: string
  threadId: string
}

export interface GmailMessageDetail {
  id: string
  subject: string
  date: string
  from: string
  snippet: string
}

export interface GmailSearchResponse {
  messages?: GmailMessage[]
  nextPageToken?: string
  resultSizeEstimate?: number
}

export interface GmailMessageResponse {
  id: string
  threadId: string
  labelIds: string[]
  snippet: string
  payload: {
    headers: Array<{
      name: string
      value: string
    }>
  }
  internalDate: string
  raw?: string
}