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

const MarkdownComponents = {
  h1: ({ node, ...props }: any) => <Title order={1} {...props} />,
  h2: ({ node, ...props }: any) => <Title order={2} {...props} />,
  h3: ({ node, ...props }: any) => <Title order={3} {...props} />,
  h4: ({ node, ...props }: any) => <Title order={4} {...props} />,
  h5: ({ node, ...props }: any) => <Title order={5} {...props} />,
  h6: ({ node, ...props }: any) => <Title order={6} {...props} />,
  p: ({ node, ...props }: any) => <Text mb="sm" {...props} />,
  ul: ({ node, ...props }: any) => <List withPadding {...props} />,
  ol: ({ node, ...props }: any) => (
    <List type="ordered" withPadding {...props} />
  ),
  li: ({ node, ...props }: any) => <ListItem {...props} />,
  code: ({ inline, className, children, ...props }: any) => (
    // inline ? (
    //   <Code {...props}>{children}</Code>
    // ) : (
    //   <Code block {...props}>
    //     {children}
    //   </Code>
    // ),
    <Text
      style={{
        background: 'rgba(0, 0, 0, 0.05)',
        padding: '2px 4px',
        display: 'inline',
        borderRadius: "4px",
        fontFamily: 'monospace'
      }}
      {...props}
    >
      {children}
    </Text>
  ),
  blockquote: ({ node, ...props }: any) => <Blockquote {...props} />,
  a: ({ node, ...props }: any) => <Anchor {...props} />,
  strong: ({ node, ...props }: any) => <Text span fw={700} {...props} />,
  em: ({ node, ...props }: any) => <Text span fs="italic" {...props} />,
  del: ({ node, ...props }: any) => <Text span td="line-through" {...props} />,
  hr: () => <hr style={{ margin: '1em 0' }} />,
  img: ({ node, ...props }: any) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img style={{ maxWidth: '100%' }} {...props} alt={props.alt} />
  ),
}

export const CustomMarkdown: React.FC<CustomMarkdownProps> = ({ children }) => (
  <Markdown components={MarkdownComponents}>{children}</Markdown>
)
