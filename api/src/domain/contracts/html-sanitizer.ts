import sanitizeHtmlLib from 'sanitize-html';

const VARIABLE_TOKEN_PREFIX = '__fortify_VAR_';
const VARIABLE_TOKEN_SUFFIX = '__';

const ALLOWED_TAGS = [
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'div',
  'span',
  'hr',
  'br',
  'ul',
  'ol',
  'li',
  'strong',
  'em',
  'img',
  'style',
];

const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  '*': ['class', 'style'],
  div: ['data-signature-key'],
  img: ['src', 'alt', 'width', 'height'],
  td: ['colspan', 'rowspan'],
  th: ['colspan', 'rowspan'],
};

const ALLOWED_STYLES: sanitizeHtmlLib.IOptions['allowedStyles'] = {
  '*': {
    'font-size': [/^[\d.]+(px|pt|em|rem|%)$/],
    'font-weight': [/^(normal|bold|[1-9]00)$/],
    'font-family': [/^[a-zA-Z0-9 ,\-'"()]+$/],
    color: [/^#[0-9a-fA-F]{3,8}$/, /^rgb\([\d, %]+\)$/],
    'background-color': [/^#[0-9a-fA-F]{3,8}$/, /^rgb\([\d, %]+\)$/],
    'text-align': [/^(left|right|center|justify)$/],
    margin: [/^[\d.]+(px|pt|em|rem|%)(\s+[\d.]+(px|pt|em|rem|%)){0,3}$/],
    padding: [/^[\d.]+(px|pt|em|rem|%)(\s+[\d.]+(px|pt|em|rem|%)){0,3}$/],
    border: [/^[\d.]+(px|pt)\s+(solid|dashed|dotted)\s+#[0-9a-fA-F]{3,8}$/],
    width: [/^[\d.]+(px|pt|em|rem|%)$/],
    'max-width': [/^[\d.]+(px|pt|em|rem|%)$/],
  },
};

function escapeVariableTokens(html: string): { html: string; variables: Map<string, string> } {
  const variables = new Map<string, string>();
  let index = 0;
  const escaped = html.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_match, key: string) => {
    const token = `${VARIABLE_TOKEN_PREFIX}${index++}${VARIABLE_TOKEN_SUFFIX}`;
    variables.set(token, `{{${key}}}`);
    return token;
  });
  return { html: escaped, variables };
}

function restoreVariableTokens(html: string, variables: Map<string, string>): string {
  let result = html;
  for (const [token, original] of variables) {
    result = result.replaceAll(token, original);
  }
  return result;
}

function scrubDangerousUrls(html: string): string {
  return html
    .replace(/javascript:/gi, 'blocked:')
    .replace(/data:text\/html/gi, 'blocked:text/html');
}

export function sanitizeHtml(html: string): string {
  const scrubbed = scrubDangerousUrls(html);
  const { html: withTokens, variables } = escapeVariableTokens(scrubbed);

  const sanitized = sanitizeHtmlLib(withTokens, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedStyles: ALLOWED_STYLES,
    disallowedTagsMode: 'discard',
    allowVulnerableTags: true,
    enforceHtmlBoundary: true,
    transformTags: {
      img: (_tagName, attribs) => {
        const src = attribs.src ?? '';
        if (src && !/^https?:\/\//i.test(src) && !/^data:image\/(png|jpeg|jpg|gif|webp);base64,/i.test(src)) {
          return { tagName: 'span', attribs: { class: 'blocked-image' } };
        }
        const safeAttribs: Record<string, string> = { src, alt: attribs.alt ?? '' };
        return { tagName: 'img', attribs: safeAttribs };
      },
    } as sanitizeHtmlLib.IOptions['transformTags'],
  });

  return restoreVariableTokens(sanitized, variables);
}
