/**
 * Utility functions for extracting header sequences from email headers
 * Based on zkemail/zkemail.nr/js utils but adapted for Mintmarks-specific fields
 */

/**
 * Get the index and length of a header field (case-insensitive, constrained to actual header)
 * Skips DKIM-Signature headers to avoid finding fields inside the h= list
 *
 * @param {Buffer} headers - Email headers buffer
 * @param {string} fieldName - Header field name to find (e.g., 'date', 'subject')
 * @returns {{index: string, length: string}} Sequence with index and length as strings
 */
export function getConstrainedHeaderSequence(headers, fieldName) {
  const headerStr = headers.toString();

  // Build regex for case-insensitive header field
  const regex = new RegExp(
    `[${fieldName[0].toUpperCase()}${fieldName[0].toLowerCase()}]${fieldName.slice(1).toLowerCase()}:.*?(?=\\r?\\n(?![\\t ]))`
  );

  // Find all DKIM-Signature header ranges to skip them
  const dkimRanges = [];
  const dkimRegex = /DKIM-Signature:.*?(?=\r?\n(?![\t ]))/gs;
  let dkimMatch;
  while ((dkimMatch = dkimRegex.exec(headerStr)) !== null) {
    dkimRanges.push({
      start: dkimMatch.index,
      end: dkimMatch.index + dkimMatch[0].length
    });
  }

  // Find the header field outside DKIM ranges
  const matches = [...headerStr.matchAll(new RegExp(regex, 'g'))];
  for (const match of matches) {
    const matchStart = match.index;
    const matchEnd = matchStart + match[0].length;

    // Check if this match is inside a DKIM-Signature header
    const insideDkim = dkimRanges.some(
      range => matchStart >= range.start && matchStart <= range.end
    );

    if (!insideDkim) {
      return {
        index: matchStart.toString(),
        length: match[0].length.toString()
      };
    }
  }

  throw new Error(`Header field "${fieldName}" not found outside DKIM headers`);
}

/**
 * Get the sequence for just the header value (after "fieldname:")
 * Note: DKIM canonicalized headers are lowercase with no space after colon
 *
 * @param {Buffer} headers - Email headers buffer
 * @param {{index: string, length: string}} headerSequence - The full header field sequence
 * @param {string} fieldName - Header field name (to calculate prefix length)
 * @returns {{index: string, length: string}} Sequence for just the value part
 */
export function getHeaderValueSequence(headers, headerSequence, fieldName) {
  const headerIndex = parseInt(headerSequence.index);
  const headerLength = parseInt(headerSequence.length);

  // Canonicalized headers are lowercase with no space: "fieldname:value"
  // Note: The regex lookahead (?=\r?\n) stops before the \r\n, so no trailing bytes are included
  const prefixLength = fieldName.length + 1; // "fieldname:" = name + ":"

  // Value starts after "fieldname:"
  const valueIndex = headerIndex + prefixLength;

  // Value length is total length minus prefix (no trailing bytes in regex match)
  const valueLength = headerLength - prefixLength;

  return {
    index: valueIndex.toString(),
    length: valueLength.toString()
  };
}

/**
 * Extract event name from subject line
 * Luma emails have subject like "Thanks for joining <Event Name>"
 *
 * @param {Buffer} headers - Email headers buffer
 * @param {{index: string, length: string}} subjectValueSequence - Subject value sequence
 * @returns {{index: string, length: string}} Sequence for the event name
 */
export function getEventNameSequence(headers, subjectValueSequence) {
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
      length: eventNameLength.toString()
    };
  }

  // Fallback: use entire subject value as event name
  return subjectValueSequence;
}

/**
 * Decode BoundedVec<u8, N> from witness return values
 * BoundedVec from Noir is returned as an object with storage and len fields
 */
export function decodeBoundedVec(boundedVec) {
  // Check if it's an object with storage and len (Noir BoundedVec structure)
  if (boundedVec && typeof boundedVec === 'object' && 'storage' in boundedVec && 'len' in boundedVec) {
    const length = parseInt(boundedVec.len);
    const storage = boundedVec.storage;

    if (!Array.isArray(storage) || length === 0) {
      return '';
    }

    const bytes = storage.slice(0, length);
    return Buffer.from(bytes.map(b => parseInt(b))).toString('utf-8');
  }

  // Fallback: try array format where first element is length
  if (Array.isArray(boundedVec) && boundedVec.length > 0) {
    const length = parseInt(boundedVec[0]);
    const bytes = boundedVec.slice(1, length + 1);
    return Buffer.from(bytes.map(b => parseInt(b))).toString('utf-8');
  }

  return '';
}
