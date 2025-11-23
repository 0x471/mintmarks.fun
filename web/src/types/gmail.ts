export interface GmailMessageDetail {
  id: string;
  subject: string;
  date: string;
  from: string;
  snippet: string;
}

export interface GmailMessage {
  id: string;
  threadId: string;
}

export interface GmailSearchResponse {
  messages: GmailMessage[];
  nextPageToken?: string;
  resultSizeEstimate: number;
}

export interface GmailHeader {
  name: string;
  value: string;
}

export interface GmailMessageResponse {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: {
    headers: GmailHeader[];
  };
  internalDate: string;
  raw?: string;
}
