import axios from 'axios';
import { WebhookPayload } from '../types';
import { createLogger } from './logger';

const logger = createLogger('WebhookClient');

export async function sendWebhook(payload: WebhookPayload): Promise<void> {
  try {
    const webhookUrl = process.env.USELVI_WEBHOOK_URL;
    if (!webhookUrl) {
      logger.warn('USELVI_WEBHOOK_URL is not defined');
      return;
    }

    await axios.post(webhookUrl, payload, {
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    logger.info(`Webhook sent successfully for event: ${payload.event}`);
  } catch (error) {
    logger.error(`Failed to send webhook`, error);
  }
}
