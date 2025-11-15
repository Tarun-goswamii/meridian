import React from 'react'
import Markdown from 'react-markdown'
import {
  Text,
  Title,
  List,
  ListItem,
  Blockquote,
  Anchor,
} from '@mantine/core'

type CustomMarkdownProps = {
  children: string
}

const textFontSize = 'xs' // for regular text, list, blockquote, etc

const MarkdownComponents = {
  h1: ({ node, ...props }: any) => <Title order={1} mb="xs" {...props} />,
  h2: ({ node, ...props }: any) => <Title order={2} mb="xs" {...props} />,
  h3: ({ node, ...props }: any) => <Title order={3} mb="xs" {...props} />,
  h4: ({ node, ...props }: any) => <Title order={4} mb="xs" {...props} />,
  h5: ({ node, ...props }: any) => <Title order={5} mb="xs" {...props} />,
  h6: ({ node, ...props }: any) => <Title order={6} mb="xs" {...props} />,
  p: ({ node, ...props }: any) => (
    <Text size={textFontSize} mb="sm" {...props} />
  ),
  ul: ({ node, ...props }: any) => (
    <List
      withPadding
      size={textFontSize}
      style={{ fontSize: 'var(--mantine-font-size-sm)' }}
      {...props}
    />
  ),
  ol: ({ node, ...props }: any) => (
    <List
      type="ordered"
      withPadding
      size={textFontSize}
      style={{ fontSize: 'var(--mantine-font-size-sm)' }}
      {...props}
    />
  ),
  li: ({ node, ...props }: any) => (
    <ListItem style={{ fontSize: 'var(--mantine-font-size-sm)' }} {...props} />
  ),
  code: ({ inline, className, children, ...props }: any) => (
    <Text
      size={textFontSize}
      style={{
        background: 'rgba(0, 0, 0, 0.05)',
        padding: '2px 4px',
        display: 'inline',
        borderRadius: '4px',
        fontFamily: 'monospace',
        fontSize: '13px',
      }}
      {...props}
    >
      {children}
    </Text>
  ),
  blockquote: ({ node, ...props }: any) => (
    <Blockquote
      style={{ fontSize: 'var(--mantine-font-size-sm)' }}
      {...props}
    />
  ),
  a: ({ node, ...props }: any) => <Anchor size={textFontSize} {...props} />,
  strong: ({ node, ...props }: any) => (
    <Text span size={textFontSize} fw={700} {...props} />
  ),
  em: ({ node, ...props }: any) => (
    <Text span size={textFontSize} fs="italic" {...props} />
  ),
  del: ({ node, ...props }: any) => (
    <Text span size={textFontSize} td="line-through" {...props} />
  ),
  hr: () => <hr style={{ margin: '1em 0' }} />,
  img: ({ node, ...props }: any) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img style={{ maxWidth: '100%' }} {...props} alt={props.alt} />
  ),
}

export const CustomMarkdown: React.FC<CustomMarkdownProps> = ({ children }) => (
  <Markdown components={MarkdownComponents}>{children}</Markdown>
)
