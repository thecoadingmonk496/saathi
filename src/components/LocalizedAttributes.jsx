import { useEffect } from 'react';
import { supportedLanguages } from '../utils/translations';
import { translateInterfaceText } from './LocalizedText';
import { useUser } from '../context/UserContext';

const attributes = ['placeholder', 'title', 'aria-label', 'aria-description', 'alt'];
const originals = new WeakMap();
const textOriginals = new WeakMap();
const ignoredTextTags = new Set(['code', 'pre', 'script', 'style', 'textarea']);

export default function LocalizedAttributes() {
  const { preferredLanguage } = useUser();

  useEffect(() => {
    const language = preferredLanguage || 'English';
    const bcp47 = supportedLanguages.find((item) => item.name === language)?.bcp47 || 'en-IN';
    document.documentElement.lang = bcp47;

    const localizeElement = (element) => {
      if (!(element instanceof Element)) return;
      let records = originals.get(element);

      attributes.forEach((attribute) => {
        if (!element.hasAttribute(attribute)) return;
        const current = element.getAttribute(attribute);
        if (!records) {
          records = new Map();
          originals.set(element, records);
        }

        let record = records.get(attribute);
        if (!record || current !== record.localized) {
          record = { source: current, localized: current };
          records.set(attribute, record);
        }

        const localized = translateInterfaceText(record.source, language);
        record.localized = localized;
        if (localized !== current) element.setAttribute(attribute, localized);
      });
    };

    const localizeText = (textNode) => {
      const parent = textNode.parentElement;
      if (!parent || ignoredTextTags.has(parent.tagName.toLowerCase()) || parent.closest('[data-no-translate]')) return;

      const current = textNode.data;
      let record = textOriginals.get(textNode);
      if (!record || current !== record.localized) {
        record = { source: current, localized: current };
        textOriginals.set(textNode, record);
      }

      const localized = translateInterfaceText(record.source, language);
      record.localized = localized;
      if (localized !== current) textNode.data = localized;
    };

    const scan = (node) => {
      if (node instanceof Text) {
        localizeText(node);
        return;
      }
      if (node instanceof Element) {
        localizeElement(node);
        node.querySelectorAll('[placeholder], [title], [aria-label], [aria-description], [alt]').forEach(localizeElement);
        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) localizeText(walker.currentNode);
      }
    };

    const root = document.getElementById('root');
    if (!root) return undefined;
    scan(root);

    const observer = new MutationObserver((records) => {
      records.forEach((record) => {
        if (record.type === 'attributes') {
          localizeElement(record.target);
        } else if (record.type === 'characterData') {
          localizeText(record.target);
        } else {
          record.addedNodes.forEach(scan);
        }
      });
    });
    observer.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: attributes,
    });

    return () => observer.disconnect();
  }, [preferredLanguage]);

  return null;
}
