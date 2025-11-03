import { Container, Loader } from '@mantine/core'

export default function Loading() {
  return (
    <Container size={420} my={40}>
      <Loader size="xl" style={{ margin: '0 auto', display: 'block' }} />
    </Container>
  )
}
