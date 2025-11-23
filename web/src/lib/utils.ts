import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Adapted from mintmarks_circuits/scripts/utils.js for browser use

import { Buffer } from "buffer";

// Get the index and length of a header field
// Skips DKIM-Signature headers to avoid finding fields inside the h= list
export function getConstrainedHeaderSequence(
  headers: Buffer,
  fieldName: string
): { index: string; length: string } {
  const headerStr = headers.toString();

  // Debug: Log header string for troubleshooting (only in dev)
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    console.log(`[getConstrainedHeaderSequence] Looking for header: "${fieldName}"`);
    console.log(`[getConstrainedHeaderSequence] Headers length: ${headerStr.length}`);
  }

  // Build regex for case-insensitive header field
  // Try multiple patterns to handle different email formats
  const patterns = [
    // Standard pattern: "Date: value"
    new RegExp(
      `[${fieldName[0].toUpperCase()}${fieldName[0].toLowerCase()}]${fieldName
        .slice(1)
        .toLowerCase()}:.*?(?=\\r?\\n(?![\\t ]))`,
      'g'
    ),
    // Pattern with optional whitespace: "Date : value" or "Date:value"
    new RegExp(
      `[${fieldName[0].toUpperCase()}${fieldName[0].toLowerCase()}]${fieldName
        .slice(1)
        .toLowerCase()}\\s*:.*?(?=\\r?\\n(?![\\t ]))`,
      'g'
    ),
  ];

  // Find all DKIM-Signature header ranges to skip them
  const dkimRanges: Array<{ start: number; end: number }> = [];
  const dkimRegex = /DKIM-Signature:.*?(?=\r?\n(?![\t ]))/gs;
  let dkimMatch;
  while ((dkimMatch = dkimRegex.exec(headerStr)) !== null) {
    dkimRanges.push({
      start: dkimMatch.index,
      end: dkimMatch.index + dkimMatch[0].length,
    });
  }

  // Try each pattern
  for (const regex of patterns) {
    // Reset regex lastIndex
    regex.lastIndex = 0;
    
    const matches = [...headerStr.matchAll(regex)];
    for (const match of matches) {
      const matchStart = match.index!;

      // Check if this match is inside a DKIM-Signature header
      const insideDkim = dkimRanges.some(
        (range) => matchStart >= range.start && matchStart <= range.end
      );

      if (!insideDkim) {
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
          console.log(`[getConstrainedHeaderSequence] Found "${fieldName}" at index ${matchStart}, length ${match[0].length}`);
        }
        return {
          index: matchStart.toString(),
          length: match[0].length.toString(),
        };
      }
    }
  }

  // If not found, provide helpful error message
  const availableHeaders = headerStr
    .split(/\r?\n/)
    .slice(0, 20)
    .map((line, idx) => `${idx}: ${line.substring(0, 80)}`)
    .join('\n');
  
  throw new Error(
    `Header field "${fieldName}" not found outside DKIM headers.\n` +
    `Available headers (first 20 lines):\n${availableHeaders}`
  );
}

// Get the sequence for just the header value (after "fieldname:")
// Note: DKIM canonicalized headers are lowercase with no space after colon
export function getHeaderValueSequence(
  headerSequence: { index: string; length: string },
  fieldName: string
): { index: string; length: string } {
  const headerIndex = parseInt(headerSequence.index);
  const headerLength = parseInt(headerSequence.length);

  // Canonicalized headers are lowercase with no space: "fieldname:value"
  const prefixLength = fieldName.length + 1; // "fieldname:" = name + ":"

  // Value starts after "fieldname:"
  const valueIndex = headerIndex + prefixLength;

  // Value length is total length minus prefix
  const valueLength = headerLength - prefixLength;

  return {
    index: valueIndex.toString(),
    length: valueLength.toString(),
  };
}

// Extract event name from subject line
// Luma emails have subject like "Thanks for joining <Event Name>"
export function getEventNameSequence(
  headers: Buffer,
  subjectValueSequence: { index: string; length: string }
): { index: string; length: string } {
  const valueIndex = parseInt(subjectValueSequence.index);
  const valueLength = parseInt(subjectValueSequence.length);

  // Extract the subject value bytes
  const subjectValue = headers.slice(valueIndex, valueIndex + valueLength).toString();

  // Look for "Thanks for joining " prefix
  const prefix = 'Thanks for joining ';
  const prefixIndex = subjectValue.indexOf(prefix);

  if (prefixIndex !== -1) {
    // Event name starts after the prefix
    const eventNameOffset = prefixIndex + prefix.length;
    const eventNameIndex = valueIndex + eventNameOffset;
    const eventNameLength = valueLength - eventNameOffset;

    return {
      index: eventNameIndex.toString(),
      length: eventNameLength.toString(),
    };
  }

  // fallback: use entire subject value as event name
  return subjectValueSequence;
}

import type { GmailMessageDetail } from '../types/gmail';
import { emailFilterConfig, type EmailSource } from '../config/emailFilters';

/**
 * Determines the source of an email ('luma', 'substack', or 'other')
 * based on the 'from' address and the domains defined in the filter configuration.
 * @param email The email detail object.
 * @returns The source of the email.
 */
export const getEmailSource = (email: GmailMessageDetail): EmailSource | 'other' => {
  const from = email.from.toLowerCase();
  for (const source in emailFilterConfig) {
    const config = emailFilterConfig[source as EmailSource];
    if (config.apiQuery.domains.some(domain => from.includes(domain))) {
      return source as EmailSource;
    }
  }
  return 'other';
};

  