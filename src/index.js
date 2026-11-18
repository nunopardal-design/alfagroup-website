/**
 * Alfa Group contact endpoint for Cloudflare Workers.
 * No recipient or sender address is stored in public source code.
 * The approved HTML submits a same-origin POST to /contact.
 */
const MAX_BODY_BYTES = 16000;
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const EMAIL_RE = /^[^\s@\r\n<>]+@[^\s@\r\n<>]+\.[^\s@\r\n<>]+$/;

function reply(ok, status = 200) {
  return new Response(JSON.stringify({ ok }), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  });
}

function clean(value, limit, multiline = false) {
  const text = String(value ?? '').trim().slice(0, limit + 1);
  if (text.length > limit) return null;
  return multiline ? text.replace(/\u0000/g, '') : text.replace(/[\r\n\t\u0000]+/g, ' ');
}

async function contact(request, env) {
  if (request.method !== 'POST') return reply(false, 405);
  const origin = request.headers.get('Origin');
  const targetOrigin = new URL(request.url).origin;
  if (origin && origin !== targetOrigin) return reply(false, 403);
  if (request.headers.get('Sec-Fetch-Site') === 'cross-site') return reply(false, 403);

  const type = (request.headers.get('Content-Type') || '').toLowerCase();
  if (!type.startsWith('multipart/form-data;') && !type.startsWith('application/x-www-form-urlencoded')) {
    return reply(false, 415);
  }
  const len = Number(request.headers.get('Content-Length') || 0);
  if (len > MAX_BODY_BYTES) return reply(false, 413);

  let data;
  try {
    const buffer = await request.arrayBuffer();
    if (buffer.byteLength > MAX_BODY_BYTES) return reply(false, 413);
    const formRequest = new Request(request.url, {
      method: 'POST', headers: { 'Content-Type': type }, body: buffer
    });
    data = await formRequest.formData();
  } catch (_) {
    return reply(false, 400);
  }

  // Honeypot: a dummy success prevents confirming detection to spammers.
  if (String(data.get('website') || '').trim()) return reply(true);

  const time = Number(data.get('t'));
  const age = Date.now() - time;
  if (!Number.isFinite(time) || time <= 0 || age < 3000 || age > MAX_AGE_MS) return reply(false, 422);

  const name = clean(data.get('name'), 120);
  const company = clean(data.get('company'), 160);
  const email = clean(data.get('email'), 200);
  const wechat = clean(data.get('wechat'), 80);
  const message = clean(data.get('message'), 4000, true);
  if ([name, company, email, wechat, message].some(v => v === null)) return reply(false, 422);
  if (!name || !EMAIL_RE.test(email) || !message) return reply(false, 422);

  if (env.CONTACT_LIMIT) {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const result = await env.CONTACT_LIMIT.limit({ key: 'contact:' + ip });
    if (!result.success) return reply(false, 429);
  }

  const to = String(env.TO_EMAIL || '').trim();
  const from = String(env.FROM_EMAIL || '').trim();
  if (!env.EMAIL || !EMAIL_RE.test(to) || !EMAIL_RE.test(from) ||
      !from.toLowerCase().endsWith('@alfagroup.pt')) return reply(false, 503);

  const body = [
    'New message from the Alfa Group contact form', '',
    'Name: ' + name,
    'Company: ' + (company || 'Not provided'),
    'Email: ' + email,
    'WeChat ID: ' + (wechat || 'Not provided'),
    'Sent: ' + new Date().toISOString(), '', 'Message:', message,
  ].join('\n');

  try {
    await env.EMAIL.send({
      to, from, replyTo: email,
      subject: 'Alfa Group website contact',
      text: body,
    });
    return reply(true);
  } catch (error) {
    // Never log visitor messages, addresses or credentials.
    console.error('Email send failed', error && typeof error === 'object' ? error.name : 'error');
    return reply(false, 502);
  }
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === '/contact' || path === '/contact.php') return contact(request, env);
    return env.ASSETS.fetch(request);
  },
};
