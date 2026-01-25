import sanitizeHtml from "sanitize-html";

/**
 * SafeHtml component - Server-side HTML sanitization using sanitize-html library
 *
 * Security: Uses sanitize-html library with strict allowlist configuration
 * to prevent XSS attacks while preserving safe formatting.
 */

const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "br",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "code",
    "pre",
    "blockquote",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "ul",
    "ol",
    "li",
    "a",
    "img",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "hr",
    "div",
    "span",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height"],
    "*": ["class"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  // Add safety attributes to links
  transformTags: {
    a: (tagName, attribs) => {
      // Add security attributes to external links
      if (attribs.href && attribs.href.startsWith("http")) {
        return {
          tagName,
          attribs: {
            ...attribs,
            target: "_blank",
            rel: "noopener noreferrer",
          },
        };
      }
      return { tagName, attribs };
    },
  },
};

interface SafeHtmlProps {
  html: string;
  className?: string;
}

export function SafeHtml({ html, className }: SafeHtmlProps) {
  // Sanitize HTML using sanitize-html library with strict configuration
  const sanitized = sanitizeHtml(html, sanitizeOptions);

  return (
    <div
      className={className}
      // Content sanitized by sanitize-html library with strict allowlist
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
