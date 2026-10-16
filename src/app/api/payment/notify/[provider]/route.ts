import { NextResponse } from 'next/server';

import { isWebhookIgnored } from '@/core/payment/types';
import { handleWebhook } from '@/modules/payment/service';
import { respErr, respOk } from '@/lib/resp';

// Ack a webhook the provider should consider delivered.
function ackSuccess(provider: string) {
  // Alipay expects plain text "success"
  if (provider === 'alipay') {
    return new NextResponse('success', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  // WeChat expects JSON { code, message }
  if (provider === 'wechat') {
    return NextResponse.json({ code: 'SUCCESS', message: 'OK' });
  }

  return respOk();
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;

  try {
    const event = await handleWebhook({ req, provider });

    console.log(`Payment event [${provider}]: ${event.eventType}`);

    return ackSuccess(provider);
  } catch (error: any) {
    // Authentic event we don't process — ack it so the provider stops
    // redelivering. Not a failure.
    if (isWebhookIgnored(error)) {
      console.log(`Webhook ignored [${provider}]: ${error.message}`);
      return ackSuccess(provider);
    }

    console.error('webhook error:', error);

    // Real failure: answer non-2xx so the provider retries. Returning 200 here
    // makes Stripe/Creem/PayPal mark the delivery as succeeded, silently
    // dropping renewals, credit grants and subscription status syncs.
    if (provider === 'alipay') {
      // Alipay retries whenever the body isn't "success"; it requires 200.
      return new NextResponse('fail', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    if (provider === 'wechat') {
      return NextResponse.json(
        { code: 'FAIL', message: error.message || 'Webhook failed' },
        { status: 500 }
      );
    }

    return respErr(error.message || 'Webhook handling failed', { status: 500 });
  }
}
