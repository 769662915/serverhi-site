import { SKIP, visit } from 'unist-util-visit';

function containsAddressText(node) {
  return node.type === 'text' ? node.value.includes('@') : node.children?.some(containsAddressText);
}

// Cloudflare otherwise turns text such as SSH destinations into email-decoding links.
export default function preserveLiteralAddresses() {
  return (tree) => {
    visit(tree, 'element', (node, index, parent) => {
      if (!parent || index === undefined) return;
      const code = node.tagName === 'pre' || node.tagName === 'code';
      const linkedAddress = node.tagName === 'a' && String(node.properties.href).startsWith('mailto:');
      if (!linkedAddress && !(code && containsAddressText(node))) return;
      parent.children.splice(index, 1,
        { type: 'comment', value: 'email_off' },
        node,
        { type: 'comment', value: '/email_off' },
      );
      return [SKIP, index + 3];
    });
  };
}
