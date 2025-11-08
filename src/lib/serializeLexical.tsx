import React from 'react'

interface LexicalNode {
  type: string
  version: number
  [key: string]: unknown
}

interface LexicalRoot {
  root: {
    type: string
    children: LexicalNode[]
    direction: ('ltr' | 'rtl') | null
    format: 'left' | 'start' | 'center' | 'right' | 'end' | 'justify' | ''
    indent: number
    version: number
  }
  [key: string]: unknown
}

/**
 * Safely serialize Lexical rich text to React components
 */
export function serializeLexical(content: unknown): React.ReactNode {
  if (!content || typeof content !== 'object') {
    return null
  }

  const lexicalContent = content as LexicalRoot

  if (!lexicalContent.root || !Array.isArray(lexicalContent.root.children)) {
    return null
  }

  return (
    <>
      {lexicalContent.root.children.map((node, index) => (
        <SerializeNode key={index} node={node} />
      ))}
    </>
  )
}

function SerializeNode({ node }: { node: LexicalNode }): React.ReactNode {
  const nodeAny = node as Record<string, unknown>

  // Paragraph
  if (node.type === 'paragraph') {
    const children = nodeAny.children as LexicalNode[] | undefined
    return (
      <p>
        {children?.map((child, index) => (
          <SerializeNode key={index} node={child} />
        ))}
      </p>
    )
  }

  // Heading
  if (node.type === 'heading') {
    const children = nodeAny.children as LexicalNode[] | undefined
    const tag = (nodeAny.tag as string | undefined) || 'h2'

    const content = children?.map((child, index) => <SerializeNode key={index} node={child} />)

    switch (tag) {
      case 'h1':
        return <h1>{content}</h1>
      case 'h2':
        return <h2>{content}</h2>
      case 'h3':
        return <h3>{content}</h3>
      case 'h4':
        return <h4>{content}</h4>
      case 'h5':
        return <h5>{content}</h5>
      case 'h6':
        return <h6>{content}</h6>
      default:
        return <h2>{content}</h2>
    }
  }

  // Text
  if (node.type === 'text') {
    const text = nodeAny.text as string | undefined
    const format = nodeAny.format as number | undefined

    if (!text) return null

    let element: React.ReactNode = text

    // Bold (format & 1)
    if (format && format & 1) {
      element = <strong>{element}</strong>
    }

    // Italic (format & 2)
    if (format && format & 2) {
      element = <em>{element}</em>
    }

    // Underline (format & 8)
    if (format && format & 8) {
      element = <u>{element}</u>
    }

    // Strikethrough (format & 4)
    if (format && format & 4) {
      element = <s>{element}</s>
    }

    return element
  }

  // Link
  if (node.type === 'link') {
    const children = nodeAny.children as LexicalNode[] | undefined
    const url = nodeAny.url as string | undefined
    const rel = nodeAny.rel as string | undefined
    const target = nodeAny.target as string | undefined

    return (
      <a href={url} rel={rel || undefined} target={target || undefined}>
        {children?.map((child, index) => (
          <SerializeNode key={index} node={child} />
        ))}
      </a>
    )
  }

  // List
  if (node.type === 'list') {
    const children = nodeAny.children as LexicalNode[] | undefined
    const listType = nodeAny.listType as string | undefined
    const Tag = listType === 'number' ? 'ol' : 'ul'

    return (
      <Tag>
        {children?.map((child, index) => (
          <SerializeNode key={index} node={child} />
        ))}
      </Tag>
    )
  }

  // List item
  if (node.type === 'listitem') {
    const children = nodeAny.children as LexicalNode[] | undefined

    return (
      <li>
        {children?.map((child, index) => (
          <SerializeNode key={index} node={child} />
        ))}
      </li>
    )
  }

  // Quote
  if (node.type === 'quote') {
    const children = nodeAny.children as LexicalNode[] | undefined

    return (
      <blockquote>
        {children?.map((child, index) => (
          <SerializeNode key={index} node={child} />
        ))}
      </blockquote>
    )
  }

  // Fallback for unknown types
  return null
}
