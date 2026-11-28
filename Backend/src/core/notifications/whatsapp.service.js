import { logger } from '../../utils/logger.js';

/**
 * WhatsApp Cloud API (Meta) sender.
 *
 * Settings are read from process.env on every call so values saved from the
 * admin Env Management page apply without a restart:
 *   WHATSAPP_ENABLED          'true' to send anything
 *   WHATSAPP_ACCESS_TOKEN     permanent system-user token
 *   WHATSAPP_PHONE_NUMBER_ID  sender phone number id (not the phone number)
 *   WHATSAPP_API_VERSION      Graph API version, default v21.0
 *   WHATSAPP_TEMPLATE_LANG    template language code, default en
 *   WHATSAPP_ADMIN_NUMBERS    comma separated support/admin numbers
 *
 * Business-initiated messages must use a Meta-approved template. When no
 * template name is given the message goes out as plain text, which Meta only
 * delivers inside a 24h window after the recipient last messaged the business.
 */

const env = (key, fallback = '') => String(process.env[key] ?? fallback).trim();

export const isWhatsappEnabled = () =>
    env('WHATSAPP_ENABLED') === 'true' && !!env('WHATSAPP_ACCESS_TOKEN') && !!env('WHATSAPP_PHONE_NUMBER_ID');

/** Digits-only number with country code, as the Cloud API expects (e.g. 919876543210). */
export const toWhatsappNumber = (phone, countryCode = '+91') => {
    const digits = String(phone || '').replace(/\D/g, '');
    if (!digits) return '';
    if (digits.length === 10) {
        const cc = String(countryCode || '+91').replace(/\D/g, '') || '91';
        return `${cc}${digits}`;
    }
    if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
    return digits;
};

export const getAdminWhatsappNumbers = () =>
    env('WHATSAPP_ADMIN_NUMBERS')
        .split(',')
        .map((n) => toWhatsappNumber(n))
        .filter(Boolean);

// Template parameters may not contain newlines, tabs or more than 4 spaces in a row.
const toTemplateParam = (value) => {
    const text = String(value ?? '').replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim();
    return text || '-';
};

const postMessage = async (body) => {
    const url = `https://graph.facebook.com/${env('WHATSAPP_API_VERSION', 'v21.0')}/${env('WHATSAPP_PHONE_NUMBER_ID')}/messages`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${env('WHATSAPP_ACCESS_TOKEN')}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ messaging_product: 'whatsapp', ...body }),
        signal: AbortSignal.timeout(15000)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data?.error?.message || `WhatsApp API responded ${res.status}`);
    }
    return data;
};

/**
 * Send one message. Never throws; returns { ok, skipped?, error? } so callers
 * on payment paths can fire and forget.
 *
 * @param {object} opts
 * @param {string} opts.to         recipient number (any format)
 * @param {string} [opts.template] approved template name
 * @param {Array}  [opts.params]   body parameters for {{1}}, {{2}}, ...
 * @param {string} opts.text       plain-text fallback when no template is set
 */
export const sendWhatsappMessage = async ({ to, template, params = [], text }) => {
    if (!isWhatsappEnabled()) return { ok: false, skipped: true };
    const recipient = toWhatsappNumber(to);
    if (!recipient) return { ok: false, skipped: true };

    try {
        const body = template
            ? {
                to: recipient,
                type: 'template',
                template: {
                    name: template,
                    language: { code: env('WHATSAPP_TEMPLATE_LANG', 'en') },
                    ...(params.length && {
                        components: [{
                            type: 'body',
                            parameters: params.map((p) => ({ type: 'text', text: toTemplateParam(p) }))
                        }]
                    })
                }
            }
            : { to: recipient, type: 'text', text: { preview_url: false, body: String(text || '').slice(0, 4096) } };

        const data = await postMessage(body);
        return { ok: true, id: data?.messages?.[0]?.id };
    } catch (error) {
        logger.warn(`WhatsApp send to ${recipient} failed: ${error.message}`);
        return { ok: false, error: error.message };
    }
};
