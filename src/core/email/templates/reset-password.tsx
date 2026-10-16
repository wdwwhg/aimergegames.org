import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from '@react-email/components';

export function ResetPassword({
  appName,
  name,
  url,
}: {
  appName: string;
  name?: string;
  url: string;
}) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{`Reset your ${appName} password`}</Preview>
      <Body
        style={{
          backgroundColor: '#f6f9fc',
          fontFamily: 'Arial, sans-serif',
          color: '#24352b',
        }}
      >
        <Container
          style={{
            maxWidth: 560,
            padding: '32px 24px',
            backgroundColor: '#ffffff',
          }}
        >
          <Heading>Reset your password</Heading>
          <Text>{name ? `Hi ${name},` : 'Hi,'}</Text>
          <Text>
            You requested a password reset for {appName}. Use the button below
            to choose a new password.
          </Text>
          <Button
            href={url}
            style={{
              backgroundColor: '#237b53',
              color: '#ffffff',
              padding: '14px 20px',
              borderRadius: 8,
            }}
          >
            Reset password
          </Button>
          <Text>
            This link expires in 1 hour. If you did not request this, you can
            safely ignore this email.
          </Text>
          <Text>
            If the button does not work, copy this link into your browser:
          </Text>
          <Link href={url}>{url}</Link>
        </Container>
      </Body>
    </Html>
  );
}
