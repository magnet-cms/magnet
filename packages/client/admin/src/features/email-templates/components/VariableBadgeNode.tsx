'use client'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  DecoratorNode,
  type EditorConfig,
  type LexicalEditor,
  type LexicalNode,
  type SerializedLexicalNode,
  type Spread,
  TextNode,
} from 'lexical'
import { useEffect } from 'react'

// ============================================================================
// Types
// ============================================================================

type SerializedVariableBadgeNode = Spread<{ variableName: string }, SerializedLexicalNode>

// Regex: matches {{ word }} — simple variable names only, no Handlebars helpers.
// No global flag by design: the transform plugin processes one match per pass.
// Lexical re-queues transforms on nodes produced by splitText, so nodes with
// multiple variables (e.g. "{{ a }} {{ b }}") are converted across successive
// transform passes — this is the standard Lexical multi-pass transform pattern.
const VARIABLE_REGEX = /\{\{\s*(\w+)\s*\}\}/

// ============================================================================
// Badge component rendered inside the editor
// ============================================================================

function VariableBadge({ variableName }: { variableName: string }) {
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded bg-primary/10 text-primary text-xs font-mono border border-primary/20 mx-0.5 select-none"
      contentEditable={false}
    >
      {'{{ '}
      {variableName}
      {' }}'}
    </span>
  )
}

// ============================================================================
// VariableBadgeNode — Lexical DecoratorNode
// ============================================================================

export class VariableBadgeNode extends DecoratorNode<React.ReactNode> {
  __variableName: string

  static getType(): string {
    return 'variable-badge'
  }

  static clone(node: VariableBadgeNode): VariableBadgeNode {
    return new VariableBadgeNode(node.__variableName, node.__key)
  }

  constructor(variableName: string, key?: string) {
    super(key)
    this.__variableName = variableName
  }

  createDOM(_config: EditorConfig): HTMLElement {
    return document.createElement('span')
  }

  updateDOM(): boolean {
    return false
  }

  /**
   * When exporting to HTML (e.g. $generateHtmlFromNodes), output `{{ variableName }}`
   * as plain text inside a span so the HTML body stays Handlebars-compatible.
   */
  exportDOM(): { element: HTMLElement } {
    const span = document.createElement('span')
    span.textContent = `{{ ${this.__variableName} }}`
    return { element: span }
  }

  static importJSON(serialized: SerializedVariableBadgeNode): VariableBadgeNode {
    return $createVariableBadgeNode(serialized.variableName)
  }

  exportJSON(): SerializedVariableBadgeNode {
    return {
      ...super.exportJSON(),
      type: 'variable-badge',
      variableName: this.__variableName,
      version: 1,
    }
  }

  isInline(): boolean {
    return true
  }

  isKeyboardSelectable(): boolean {
    return false
  }

  getVariableName(): string {
    return this.__variableName
  }

  decorate(_editor: LexicalEditor, _config: EditorConfig): React.ReactNode {
    return <VariableBadge variableName={this.__variableName} />
  }
}

// ============================================================================
// Helpers
// ============================================================================

export function $createVariableBadgeNode(variableName: string): VariableBadgeNode {
  return new VariableBadgeNode(variableName)
}

export function $isVariableBadgeNode(
  node: LexicalNode | null | undefined,
): node is VariableBadgeNode {
  return node instanceof VariableBadgeNode
}

// ============================================================================
// Transform plugin — converts typed/pasted {{ var }} text to badge nodes
// ============================================================================

export function VariableBadgeTransformPlugin(): null {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    return editor.registerNodeTransform(TextNode, (node: TextNode) => {
      // Skip nodes being merged/normalized by Lexical internally (prevents error #14)
      if (!node.isSimpleText()) return

      const text = node.getTextContent()
      const match = VARIABLE_REGEX.exec(text)
      if (!match || !match[1]) return

      const variableName = match[1]
      const start = match.index
      const end = start + match[0].length

      if (start !== 0) {
        // Split prefix as plain text; trailing portion re-transformed next pass
        node.splitText(start)
        return
      }

      // match starts at position 0
      if (end !== text.length) {
        // Split off trailing text, then replace current node
        node.splitText(end)
      }
      node.replace($createVariableBadgeNode(variableName))
    })
  }, [editor])

  return null
}
