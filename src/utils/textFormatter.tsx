import React from 'react';

/**
 * Strips trailing punctuation from a matched URL.
 * E.g. "https://example.com." -> url: "https://example.com", trailing: "."
 * Handles: . , ; : ! ? ) ] } " ' >
 */
export function splitUrlAndTrailingPunctuation(rawUrl: string): { url: string; trailing: string } {
  let url = rawUrl;
  let trailing = '';

  // Trailing punctuation characters that shouldn't be part of the URL unless matched with open brackets
  const trailingRegex = /[.,;:!?)}"'\]>]+$/;
  const match = url.match(trailingRegex);

  if (match) {
    const trailingCandidate = match[0];
    // Check balanced parentheses: if URL has an unclosed '(', keep ')'
    const openParens = (url.slice(0, -trailingCandidate.length).match(/\(/g) || []).length;
    const closeParens = (url.slice(0, -trailingCandidate.length).match(/\)/g) || []).length;

    if (trailingCandidate.endsWith(')') && openParens > closeParens) {
      // Parens might be part of the URL (e.g. Wikipedia URL)
      // Only trim if it's strictly trailing after parens are balanced
      const trimmed = trailingCandidate.slice(0, -1);
      url = url.slice(0, url.length - trimmed.length);
      trailing = trimmed;
    } else {
      url = url.slice(0, url.length - trailingCandidate.length);
      trailing = trailingCandidate;
    }
  }

  return { url, trailing };
}

/**
 * Validates whether a URL has a strictly safe web protocol (http or https).
 * Rejects javascript:, data:, vbscript:, file:, etc.
 */
export function isSafeWebUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Highlights search matches within a plain text string.
 */
function highlightText(text: string, query?: string, keyPrefix = 'txt'): React.ReactNode {
  if (!query || !query.trim() || !text) return text;
  const clean = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${clean})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={`${keyPrefix}-mark-${i}`} className="bg-sky-500/30 text-sky-200 rounded px-0.5 font-medium">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

/**
 * Parses normal text (outside inline code) for safe URLs.
 * Wraps URLs in <a target="_blank" rel="noopener noreferrer">.
 */
function formatLinksAndText(text: string, query?: string, keyPrefix = 'link-block'): React.ReactNode {
  if (!text) return null;

  // Regex to detect potential URLs starting with http:// or https://
  const urlPattern = /(https?:\/\/[^\s<>"'`]+)/g;
  const parts = text.split(urlPattern);

  return (
    <>
      {parts.map((part, index) => {
        if (!part) return null;

        if (urlPattern.test(part)) {
          // Reset lastIndex for regex testing
          urlPattern.lastIndex = 0;
          const { url, trailing } = splitUrlAndTrailingPunctuation(part);

          if (isSafeWebUrl(url)) {
            return (
              <React.Fragment key={`${keyPrefix}-${index}`}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[#38BDF8] hover:text-[#7dd3fc] underline underline-offset-2 decoration-[#38BDF8]/40 hover:decoration-[#38BDF8] transition-colors break-all"
                  title={`Open external link: ${url}`}
                >
                  {highlightText(url, query, `${keyPrefix}-url-${index}`)}
                </a>
                {trailing ? highlightText(trailing, query, `${keyPrefix}-tr-${index}`) : null}
              </React.Fragment>
            );
          }
        }

        return (
          <React.Fragment key={`${keyPrefix}-${index}`}>
            {highlightText(part, query, `${keyPrefix}-txt-${index}`)}
          </React.Fragment>
        );
      })}
    </>
  );
}

/**
 * Main Message Formatter:
 * 1. Parses inline code delimited by backticks (`code`)
 * 2. Parses safe clickable URLs (http/https) in text
 * 3. Applies search term highlights
 * 4. Strictly protects against XSS (no dangerouslySetInnerHTML, purely React JSX nodes)
 */
export function renderFormattedMessageText(text: string, query?: string): React.ReactNode {
  if (!text) return '';

  // Regex to split by backtick code: `...`
  // Matches text surrounded by single backticks that does not contain another backtick or newline
  const inlineCodePattern = /(`[^`\n]+`)/g;
  const segments = text.split(inlineCodePattern);

  return (
    <>
      {segments.map((segment, idx) => {
        if (!segment) return null;

        if (segment.startsWith('`') && segment.endsWith('`') && segment.length >= 2) {
          const codeContent = segment.slice(1, -1);
          return (
            <code
              key={`code-${idx}`}
              className="px-1.5 py-0.5 mx-0.5 rounded bg-[#161B22] border border-[#1F242D] font-mono text-[11px] sm:text-xs text-cyan-300 select-text break-words"
            >
              {highlightText(codeContent, query, `code-val-${idx}`)}
            </code>
          );
        }

        return (
          <React.Fragment key={`seg-${idx}`}>
            {formatLinksAndText(segment, query, `seg-links-${idx}`)}
          </React.Fragment>
        );
      })}
    </>
  );
}
