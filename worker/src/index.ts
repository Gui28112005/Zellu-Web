import webpush from 'web-push'

type WorkerEnv = Env & {
  APP_URL: string
  PREMIUM_PRICE?: string
  LITE_PRICE?: string
  FROTA_PRICE?: string
  EMPRESARIAL_PRICE?: string
  EBOOK_BUNDLE_PRICE?: string
  LIFETIME_PERSONAL_PRICE?: string
  MP_ACCESS_TOKEN: string
  MP_WEBHOOK_SECRET: string
  FIREBASE_API_KEY: string
  VAPID_PUBLIC_KEY: string
  VAPID_PRIVATE_KEY: string
}

type PaidPlan = 'LITE' | 'FROTA' | 'EMPRESARIAL'

interface ReminderSync {
  id: string
  veiculoId: string
  veiculoNome: string
  titulo: string
  dataLimite: string
  horaAviso?: string
  tipo: string
}

interface PushSubscriptionPayload {
  endpoint: string
  expirationTime?: number | null
  keys?: {
    auth: string
    p256dh: string
  }
}

interface AuthenticatedUser {
  uid: string
  email: string
}

interface SubscriptionRow {
  user_id: string
  email: string
  plan: string
  status: string
  provider_subscription_id: string | null
  checkout_url: string | null
  next_payment_at: string | null
}

interface EbookPurchaseRow {
  user_id: string
  email: string
  product_id: string
  status: string
  provider_preference_id: string | null
  provider_payment_id: string | null
  checkout_url: string | null
  amount: number | null
}

interface MercadoPagoSubscription {
  id: string
  status: string
  init_point?: string
  external_reference?: string
  payer_email?: string
  next_payment_date?: string
}

interface MercadoPagoPreference {
  id: string
  init_point?: string
}

interface MercadoPagoPayment {
  id: number | string
  status: string
  external_reference?: string
  transaction_amount?: number
  payer?: { email?: string }
}

interface MercadoPagoWebhookBody {
  action?: string
  date_created?: string
  data?: { id?: string | number }
  type?: string
}

interface CheckoutRequestBody {
  plan?: string
  returnPath?: string
}

const ALLOWED_ORIGINS = [
  'https://zelluapp.com.br',
  'https://www.zelluapp.com.br',
  'http://localhost:5173',
  'http://localhost:5174',
  'https://zellu-web.vercel.app'
]

const EBOOK_BUNDLE_ID = 'ebook_bundle'
const EBOOK_BUNDLE_TITLE = 'Pacote Zellu Biblioteca - 4 e-books automotivos'
const LIFETIME_PERSONAL_ID = 'lifetime_personal'
const LIFETIME_PERSONAL_TITLE = 'Zellu Pessoal Vitalicio'

function cors(request: Request): HeadersInit {
  const origin = request.headers.get('Origin') ?? ''
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Vary': 'Origin',
  }
}

function json(data: unknown, request: Request, status = 200): Response {
  return Response.json(data, {
    status,
    headers: cors(request),
  })
}

function saoPauloDateParts(offsetDays = 0): { date: string; hour: number; minute: number } {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + offsetDays)

  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return {
    date: `${get('day')}/${get('month')}/${get('year')}`,
    hour: Number(get('hour')),
    minute: Number(get('minute')),
  }
}

function minutesFromTime(time?: string): number {
  const [hour = '8', minute = '0'] = (time || '08:00').split(':')
  return Number(hour) * 60 + Number(minute)
}

async function authenticateFirebase(request: Request, env: WorkerEnv): Promise<AuthenticatedUser | null> {
  const authorization = request.headers.get('Authorization')
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : ''
  if (!token) return null

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(env.FIREBASE_API_KEY)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token }),
    },
  )

  if (!response.ok) return null

  const payload = await response.json<{ users?: Array<{ localId?: string; email?: string }> }>()
  const user = payload.users?.[0]
  return user?.localId && user.email ? { uid: user.localId, email: user.email } : null
}

async function getSubscription(env: WorkerEnv, userId: string): Promise<SubscriptionRow | null> {
  return env.DB.prepare(
    `SELECT user_id, email, plan, status, provider_subscription_id, checkout_url, next_payment_at
     FROM subscriptions WHERE user_id = ?`,
  )
    .bind(userId)
    .first<SubscriptionRow>()
}

async function getEbookPurchase(env: WorkerEnv, userId: string): Promise<EbookPurchaseRow | null> {
  return env.DB.prepare(
    `SELECT user_id, email, product_id, status, provider_preference_id,
            provider_payment_id, checkout_url, amount
     FROM ebook_purchases WHERE user_id = ? AND product_id = ?`,
  )
    .bind(userId, EBOOK_BUNDLE_ID)
    .first<EbookPurchaseRow>()
}

function isPaidPlan(plan: string): plan is PaidPlan {
  return plan === 'LITE' || plan === 'FROTA' || plan === 'EMPRESARIAL'
}

function planPrice(env: WorkerEnv, plan: PaidPlan): number {
  const prices: Record<PaidPlan, string | undefined> = {
    LITE: env.LITE_PRICE ?? '10.50',
    FROTA: env.FROTA_PRICE ?? env.PREMIUM_PRICE ?? '29.90',
    EMPRESARIAL: env.EMPRESARIAL_PRICE ?? '59.90',
  }
  return Number(prices[plan])
}

function ebookBundlePrice(env: WorkerEnv): number {
  return Number(env.EBOOK_BUNDLE_PRICE ?? '19.90')
}

function lifetimePersonalPrice(env: WorkerEnv): number {
  return Number(env.LIFETIME_PERSONAL_PRICE ?? '49.90')
}

function planReason(plan: PaidPlan): string {
  if (plan === 'LITE') return 'Zellu Lite'
  if (plan === 'EMPRESARIAL') return 'Zellu Empresarial'
  return 'Zellu Frota'
}

function parseExternalReference(reference?: string): { userId: string; plan: PaidPlan } | null {
  if (!reference) return null
  const [userId, plan = 'FROTA'] = reference.split(':')
  if (!userId || !isPaidPlan(plan)) return null
  return { userId, plan }
}

function parseEbookReference(reference?: string): { userId: string; productId: string } | null {
  if (!reference) return null
  const [productId, userId] = reference.split(':')
  if (productId !== EBOOK_BUNDLE_ID || !userId) return null
  return { userId, productId }
}

function parseLifetimeReference(reference?: string): { userId: string; productId: string } | null {
  if (!reference) return null
  const [productId, userId] = reference.split(':')
  if (productId !== LIFETIME_PERSONAL_ID || !userId) return null
  return { userId, productId }
}

function publicSubscription(row: SubscriptionRow | null) {
  const active = row?.status === 'ACTIVE' && !!row.plan && row.plan !== 'FREE'
  return {
    active,
    plan: active ? row.plan : 'FREE',
    status: row?.status ?? 'INACTIVE',
    nextPaymentAt: row?.next_payment_at ?? null,
  }
}

function publicEbookPurchase(row: EbookPurchaseRow | null) {
  const active = row?.status === 'ACTIVE'
  return {
    active,
    status: row?.status ?? 'INACTIVE',
    productId: row?.product_id ?? EBOOK_BUNDLE_ID,
  }
}

async function mercadoPagoRequest<T>(env: WorkerEnv, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`https://api.mercadopago.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.MP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  const payload = await response.json<T & { message?: string }>()
  if (!response.ok) {
    throw new Error(payload.message ?? `Mercado Pago respondeu ${response.status}`)
  }
  return payload
}

async function createCheckout(request: Request, env: WorkerEnv): Promise<Response> {
  const user = await authenticateFirebase(request, env)
  if (!user) return json({ error: 'Não autenticado' }, request, 401)

  const body = (await request.json<CheckoutRequestBody>().catch(() => ({}))) as CheckoutRequestBody
  const requestedPlan = body.plan
  if (!requestedPlan || !isPaidPlan(requestedPlan)) {
    return json({ error: 'Informe um plano valido para continuar.' }, request, 400)
  }

  const existing = await getSubscription(env, user.uid)
  if (existing?.status === 'ACTIVE' && existing.plan === requestedPlan) {
    return json({ active: true, plan: requestedPlan }, request)
  }
  if (existing?.status === 'ACTIVE' && existing.plan !== requestedPlan) {
    return json({ error: 'Cancele o plano atual antes de trocar de plano.' }, request, 409)
  }
  const price = planPrice(env, requestedPlan)
  if (!Number.isFinite(price) || price <= 0) {
    return json({ error: 'Preço do plano não configurado' }, request, 503)
  }

  const appUrl = env.APP_URL.replace(/\/$/, '')
  const returnPath = body.returnPath === '/premium' ? '/premium' : '/planos'
  const subscription = await mercadoPagoRequest<MercadoPagoSubscription>(env, '/preapproval', {
    method: 'POST',
    headers: { 'X-Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify({
      reason: planReason(requestedPlan),
      external_reference: `${user.uid}:${requestedPlan}`,
      payer_email: user.email,
      back_url: `${appUrl}${returnPath}?pagamento=retorno`,
      status: 'pending',
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: price,
        currency_id: 'BRL',
      },
    }),
  })

  if (!subscription.id || !subscription.init_point) {
    throw new Error('Mercado Pago não retornou o checkout')
  }

  const now = new Date().toISOString()
  await env.DB.prepare(
    `INSERT INTO subscriptions (
       user_id, email, plan, status, provider, provider_subscription_id,
       checkout_url, next_payment_at, created_at, updated_at
     ) VALUES (?, ?, ?, 'PENDING', 'mercadopago', ?, ?, NULL, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       email = excluded.email,
       plan = excluded.plan,
       status = 'PENDING',
       provider_subscription_id = excluded.provider_subscription_id,
       checkout_url = excluded.checkout_url,
       next_payment_at = NULL,
       updated_at = excluded.updated_at`,
  )
    .bind(user.uid, user.email, requestedPlan, subscription.id, subscription.init_point, now, now)
    .run()

  return json({ checkoutUrl: subscription.init_point }, request, 201)
}

async function createEbookCheckout(request: Request, env: WorkerEnv): Promise<Response> {
  const user = await authenticateFirebase(request, env)
  if (!user) return json({ error: 'Nao autenticado' }, request, 401)

  const existing = await getEbookPurchase(env, user.uid)
  if (existing?.status === 'ACTIVE') {
    return json({ active: true, productId: EBOOK_BUNDLE_ID }, request)
  }

  const price = ebookBundlePrice(env)
  if (!Number.isFinite(price) || price <= 0) {
    return json({ error: 'Preco dos e-books nao configurado' }, request, 503)
  }

  const appUrl = env.APP_URL.replace(/\/$/, '')
  const workerUrl = new URL(request.url).origin
  const preference = await mercadoPagoRequest<MercadoPagoPreference>(env, '/checkout/preferences', {
    method: 'POST',
    headers: { 'X-Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify({
      external_reference: `${EBOOK_BUNDLE_ID}:${user.uid}`,
      notification_url: `${workerUrl}/payments/webhook`,
      payer: { email: user.email },
      back_urls: {
        success: `${appUrl}/biblioteca?ebook=retorno`,
        pending: `${appUrl}/biblioteca?ebook=retorno`,
        failure: `${appUrl}/biblioteca?ebook=erro`,
      },
      auto_return: 'approved',
      items: [
        {
          id: EBOOK_BUNDLE_ID,
          title: EBOOK_BUNDLE_TITLE,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: price,
        },
      ],
    }),
  })

  if (!preference.id || !preference.init_point) {
    throw new Error('Mercado Pago nao retornou o checkout dos e-books')
  }

  const now = new Date().toISOString()
  await env.DB.prepare(
    `INSERT INTO ebook_purchases (
       user_id, email, product_id, status, provider, provider_preference_id,
       provider_payment_id, checkout_url, amount, created_at, updated_at
     ) VALUES (?, ?, ?, 'PENDING', 'mercadopago', ?, NULL, ?, ?, ?, ?)
     ON CONFLICT(user_id, product_id) DO UPDATE SET
       email = excluded.email,
       status = 'PENDING',
       provider_preference_id = excluded.provider_preference_id,
       provider_payment_id = NULL,
       checkout_url = excluded.checkout_url,
       amount = excluded.amount,
       updated_at = excluded.updated_at`,
  )
    .bind(user.uid, user.email, EBOOK_BUNDLE_ID, preference.id, preference.init_point, price, now, now)
    .run()

  return json({ checkoutUrl: preference.init_point }, request, 201)
}

async function createLifetimeCheckout(request: Request, env: WorkerEnv): Promise<Response> {
  const user = await authenticateFirebase(request, env)
  if (!user) return json({ error: 'Nao autenticado' }, request, 401)

  const existing = await getSubscription(env, user.uid)
  if (existing?.status === 'ACTIVE' && existing.plan !== 'FREE') {
    return json({ active: true, plan: existing.plan }, request)
  }

  const price = lifetimePersonalPrice(env)
  if (!Number.isFinite(price) || price <= 0) {
    return json({ error: 'Preco do vitalicio nao configurado' }, request, 503)
  }

  const appUrl = env.APP_URL.replace(/\/$/, '')
  const workerUrl = new URL(request.url).origin
  const preference = await mercadoPagoRequest<MercadoPagoPreference>(env, '/checkout/preferences', {
    method: 'POST',
    headers: { 'X-Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify({
      external_reference: `${LIFETIME_PERSONAL_ID}:${user.uid}`,
      notification_url: `${workerUrl}/payments/webhook`,
      payer: { email: user.email },
      back_urls: {
        success: `${appUrl}/premium?pagamento=retorno`,
        pending: `${appUrl}/premium?pagamento=retorno`,
        failure: `${appUrl}/premium?pagamento=erro`,
      },
      auto_return: 'approved',
      items: [
        {
          id: LIFETIME_PERSONAL_ID,
          title: LIFETIME_PERSONAL_TITLE,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: price,
        },
      ],
    }),
  })

  if (!preference.id || !preference.init_point) {
    throw new Error('Mercado Pago nao retornou o checkout do vitalicio')
  }

  const now = new Date().toISOString()
  await env.DB.prepare(
    `INSERT INTO subscriptions (
       user_id, email, plan, status, provider, provider_subscription_id,
       checkout_url, next_payment_at, created_at, updated_at
     ) VALUES (?, ?, 'LITE', 'PENDING', 'mercadopago_lifetime', NULL, ?, NULL, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       email = excluded.email,
       plan = 'LITE',
       status = 'PENDING',
       provider = 'mercadopago_lifetime',
       provider_subscription_id = NULL,
       checkout_url = excluded.checkout_url,
       next_payment_at = NULL,
       updated_at = excluded.updated_at`,
  )
    .bind(user.uid, user.email, preference.init_point, now, now)
    .run()

  return json({ checkoutUrl: preference.init_point }, request, 201)
}

async function subscriptionStatus(request: Request, env: WorkerEnv): Promise<Response> {
  const user = await authenticateFirebase(request, env)
  if (!user) return json({ error: 'Não autenticado' }, request, 401)
  return json(publicSubscription(await getSubscription(env, user.uid)), request)
}

async function ebookPurchaseStatus(request: Request, env: WorkerEnv): Promise<Response> {
  const user = await authenticateFirebase(request, env)
  if (!user) return json({ error: 'Nao autenticado' }, request, 401)
  return json(publicEbookPurchase(await getEbookPurchase(env, user.uid)), request)
}

async function cancelSubscription(request: Request, env: WorkerEnv): Promise<Response> {
  const user = await authenticateFirebase(request, env)
  if (!user) return json({ error: 'Não autenticado' }, request, 401)

  const existing = await getSubscription(env, user.uid)
  if (!existing?.provider_subscription_id) {
    return json({ error: 'Assinatura não encontrada' }, request, 404)
  }

  await mercadoPagoRequest<MercadoPagoSubscription>(
    env,
    `/preapproval/${encodeURIComponent(existing.provider_subscription_id)}`,
    { method: 'PUT', body: JSON.stringify({ status: 'cancelled' }) },
  )

  await env.DB.prepare(
    `UPDATE subscriptions
     SET plan = 'FREE', status = 'CANCELLED', checkout_url = NULL, updated_at = ?
     WHERE user_id = ?`,
  )
    .bind(new Date().toISOString(), user.uid)
    .run()

  return json(
    { active: false, plan: 'FREE', status: 'CANCELLED', nextPaymentAt: null },
    request,
  )
}

function parseSignature(header: string): { timestamp: string; signature: string } | null {
  const parts = new Map(
    header.split(',').map((part) => {
      const [key, value] = part.trim().split('=')
      return [key, value] as const
    }),
  )
  const timestamp = parts.get('ts')
  const signature = parts.get('v1')
  return timestamp && signature ? { timestamp, signature } : null
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function constantTimeEqual(first: string, second: string): boolean {
  if (first.length !== second.length) return false
  let difference = 0
  for (let index = 0; index < first.length; index += 1) {
    difference |= first.charCodeAt(index) ^ second.charCodeAt(index)
  }
  return difference === 0
}

async function validateWebhookSignature(
  request: Request,
  env: WorkerEnv,
  dataId: string,
): Promise<boolean> {
  const signatureHeader = request.headers.get('x-signature') ?? ''
  const requestId = request.headers.get('x-request-id') ?? ''
  const parsed = parseSignature(signatureHeader)
  if (!parsed || !requestId || !dataId) return false

  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${parsed.timestamp};`
  const expected = await hmacHex(env.MP_WEBHOOK_SECRET, manifest)
  return constantTimeEqual(expected, parsed.signature.toLowerCase())
}

function mercadoPagoStatus(status: string, paidPlan: PaidPlan): { plan: 'FREE' | PaidPlan; status: string } {
  if (status === 'authorized') return { plan: paidPlan, status: 'ACTIVE' }
  if (status === 'cancelled') return { plan: 'FREE', status: 'CANCELLED' }
  if (status === 'paused') return { plan: 'FREE', status: 'PAUSED' }
  return { plan: 'FREE', status: 'PENDING' }
}

async function handlePaymentWebhook(
  request: Request,
  env: WorkerEnv,
  dataId: string,
  requestId: string,
): Promise<Response> {
  const processed = await env.DB.prepare('SELECT event_id FROM webhook_events WHERE event_id = ?')
    .bind(requestId)
    .first<{ event_id: string }>()
  if (processed) return json({ ok: true, duplicate: true }, request)

  const payment = await mercadoPagoRequest<MercadoPagoPayment>(
    env,
    `/v1/payments/${encodeURIComponent(dataId)}`,
  )
  const lifetimeReference = parseLifetimeReference(payment.external_reference)
  if (lifetimeReference) {
    const status = payment.status === 'approved'
      ? 'ACTIVE'
      : payment.status === 'rejected' || payment.status === 'cancelled'
        ? 'REJECTED'
        : 'PENDING'
    const now = new Date().toISOString()

    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO subscriptions (
           user_id, email, plan, status, provider, provider_subscription_id,
           checkout_url, next_payment_at, created_at, updated_at
         ) VALUES (?, ?, ?, ?, 'mercadopago_lifetime', NULL, NULL, NULL, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
           email = excluded.email,
           plan = excluded.plan,
           status = excluded.status,
           provider = 'mercadopago_lifetime',
           provider_subscription_id = NULL,
           checkout_url = NULL,
           next_payment_at = NULL,
           updated_at = excluded.updated_at`,
      ).bind(
        lifetimeReference.userId,
        payment.payer?.email ?? 'email-nao-informado@zellu.app',
        status === 'ACTIVE' ? 'LITE' : 'FREE',
        status,
        now,
        now,
      ),
      env.DB.prepare(
        `INSERT OR IGNORE INTO webhook_events (event_id, provider, received_at)
         VALUES (?, 'mercadopago', ?)`,
      ).bind(requestId, now),
    ])

    console.log(JSON.stringify({ event: 'mercadopago_lifetime_payment', paymentId: payment.id, status }))
    return json({ ok: true }, request)
  }

  const reference = parseEbookReference(payment.external_reference)
  if (!reference) {
    console.log(JSON.stringify({ event: 'mercadopago_payment_ignored', paymentId: payment.id }))
    return json({ ok: true, ignored: true }, request)
  }

  const status = payment.status === 'approved'
    ? 'ACTIVE'
    : payment.status === 'rejected' || payment.status === 'cancelled'
      ? 'REJECTED'
      : 'PENDING'
  const now = new Date().toISOString()

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO ebook_purchases (
         user_id, email, product_id, status, provider, provider_preference_id,
         provider_payment_id, checkout_url, amount, created_at, updated_at
       ) VALUES (?, ?, ?, ?, 'mercadopago', NULL, ?, NULL, ?, ?, ?)
       ON CONFLICT(user_id, product_id) DO UPDATE SET
         email = excluded.email,
         status = excluded.status,
         provider_payment_id = excluded.provider_payment_id,
         checkout_url = NULL,
         amount = excluded.amount,
         updated_at = excluded.updated_at`,
    ).bind(
      reference.userId,
      payment.payer?.email ?? 'email-nao-informado@zellu.app',
      reference.productId,
      status,
      String(payment.id),
      payment.transaction_amount ?? ebookBundlePrice(env),
      now,
      now,
    ),
    env.DB.prepare(
      `INSERT OR IGNORE INTO webhook_events (event_id, provider, received_at)
       VALUES (?, 'mercadopago', ?)`,
    ).bind(requestId, now),
  ])

  console.log(JSON.stringify({ event: 'mercadopago_ebook_payment', paymentId: payment.id, status }))
  return json({ ok: true }, request)
}

async function handleWebhook(request: Request, env: WorkerEnv): Promise<Response> {
  const body = await request.json<MercadoPagoWebhookBody>()
  const url = new URL(request.url)
  const dataId = String(url.searchParams.get('data.id') ?? body.data?.id ?? '')

  if (!(await validateWebhookSignature(request, env, dataId))) {
    return json({ error: 'Assinatura do webhook inválida' }, request, 401)
  }

  const eventType = body.type ?? url.searchParams.get('type') ?? ''
  if (eventType === 'payment') {
    return handlePaymentWebhook(request, env, dataId, request.headers.get('x-request-id') ?? '')
  }

  if (eventType !== 'subscription_preapproval') {
    console.log(JSON.stringify({ event: 'mercadopago_webhook_ignored', type: eventType }))
    return json({ ok: true, ignored: true }, request)
  }

  const requestId = request.headers.get('x-request-id') ?? ''
  const processed = await env.DB.prepare('SELECT event_id FROM webhook_events WHERE event_id = ?')
    .bind(requestId)
    .first<{ event_id: string }>()
  if (processed) return json({ ok: true, duplicate: true }, request)

  const subscription = await mercadoPagoRequest<MercadoPagoSubscription>(
    env,
    `/preapproval/${encodeURIComponent(dataId)}`,
  )
  const reference = parseExternalReference(subscription.external_reference)
  const userId = reference?.userId
  const paidPlan = reference?.plan ?? 'FROTA'
  if (!userId) return json({ error: 'Assinatura sem usuário vinculado' }, request, 422)

  const mapped = mercadoPagoStatus(subscription.status, paidPlan)
  const now = new Date().toISOString()
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO subscriptions (
         user_id, email, plan, status, provider, provider_subscription_id,
         checkout_url, next_payment_at, created_at, updated_at
       ) VALUES (?, ?, ?, ?, 'mercadopago', ?, NULL, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         email = excluded.email,
         plan = excluded.plan,
         status = excluded.status,
         provider_subscription_id = excluded.provider_subscription_id,
         checkout_url = NULL,
         next_payment_at = excluded.next_payment_at,
         updated_at = excluded.updated_at`,
    ).bind(
      userId,
      subscription.payer_email ?? 'email-nao-informado@zellu.app',
      mapped.plan,
      mapped.status,
      subscription.id,
      subscription.next_payment_date ?? null,
      now,
      now,
    ),
    env.DB.prepare(
      `INSERT OR IGNORE INTO webhook_events (event_id, provider, received_at)
       VALUES (?, 'mercadopago', ?)`,
    ).bind(requestId, now),
  ])

  console.log(JSON.stringify({ event: 'mercadopago_webhook', subscriptionId: subscription.id, status: mapped.status }))
  return json({ ok: true }, request)
}

async function handleHttp(request: Request, env: WorkerEnv): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors(request) })
  }

  const url = new URL(request.url)

  if (url.pathname === '/payments/checkout' && request.method === 'POST') {
    return createCheckout(request, env)
  }
  if (url.pathname === '/payments/ebooks/checkout' && request.method === 'POST') {
    return createEbookCheckout(request, env)
  }
  if (url.pathname === '/payments/lifetime/checkout' && request.method === 'POST') {
    return createLifetimeCheckout(request, env)
  }
  if (url.pathname === '/payments/ebooks/status' && request.method === 'GET') {
    return ebookPurchaseStatus(request, env)
  }
  if (url.pathname === '/payments/subscription' && request.method === 'GET') {
    return subscriptionStatus(request, env)
  }
  if (url.pathname === '/payments/cancel' && request.method === 'POST') {
    return cancelSubscription(request, env)
  }
  if (url.pathname === '/payments/webhook' && request.method === 'POST') {
    return handleWebhook(request, env)
  }

  if (url.pathname === '/vapid-public-key' && request.method === 'GET') {
    return json({ key: env.VAPID_PUBLIC_KEY }, request)
  }

  if (url.pathname === '/subscribe' && request.method === 'POST') {
    const { userId, subscription } = await request.json<{
      userId: string
      subscription: PushSubscriptionPayload
    }>()
    if (!userId || !subscription) return json({ error: 'invalid' }, request, 400)
    await env.SUBSCRIPTIONS.put(`sub:${userId}`, JSON.stringify(subscription))
    return json({ ok: true }, request)
  }

  if (url.pathname === '/subscribe' && request.method === 'DELETE') {
    const { userId } = await request.json<{ userId: string }>()
    await env.SUBSCRIPTIONS.delete(`sub:${userId}`)
    return json({ ok: true }, request)
  }

  if (url.pathname === '/push-test' && request.method === 'POST') {
    const user = await authenticateFirebase(request, env)
    if (!user) return json({ error: 'unauthorized' }, request, 401)

    const subscriptionRaw = await env.SUBSCRIPTIONS.get(`sub:${user.uid}`)
    if (!subscriptionRaw) return json({ error: 'no_subscription' }, request, 404)

    webpush.setVapidDetails(
      'mailto:ola@zelluapp.com.br',
      env.VAPID_PUBLIC_KEY,
      env.VAPID_PRIVATE_KEY,
    )

    try {
      await webpush.sendNotification(
        JSON.parse(subscriptionRaw) as webpush.PushSubscription,
        JSON.stringify({
          title: 'Teste de notificação do Zellu',
          body: 'Se isso apareceu, o push está funcionando nesse aparelho. 🚀',
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: `push-test:${user.uid}:${Date.now()}`,
          data: {},
        }),
      )
      return json({ ok: true }, request)
    } catch (error: unknown) {
      if ((error as { statusCode?: number }).statusCode === 410) {
        await env.SUBSCRIPTIONS.delete(`sub:${user.uid}`)
      }
      return json({ error: 'push_failed' }, request, 500)
    }
  }

  if (url.pathname === '/reminder' && request.method === 'POST') {
    const { userId, reminder } = await request.json<{ userId: string; reminder: ReminderSync }>()
    if (!userId || !reminder?.id) return json({ error: 'invalid' }, request, 400)

    const existingRaw = await env.REMINDERS.get(`rem:${userId}:${reminder.id}`)
    const existing = existingRaw ? JSON.parse(existingRaw) as ReminderSync : null
    const scheduleChanged =
      !existing ||
      existing.dataLimite !== reminder.dataLimite ||
      existing.horaAviso !== reminder.horaAviso

    await env.REMINDERS.put(`rem:${userId}:${reminder.id}`, JSON.stringify(reminder))

    if (scheduleChanged) {
      await env.REMINDERS.delete(`sent:${userId}:${reminder.id}:${saoPauloDateParts().date}`)
    }

    return json({ ok: true }, request)
  }

  if (url.pathname.startsWith('/reminder/') && request.method === 'DELETE') {
    const reminderId = url.pathname.split('/')[2]
    const { userId } = await request.json<{ userId: string }>()
    await env.REMINDERS.delete(`rem:${userId}:${reminderId}`)
    return json({ ok: true }, request)
  }

  return json({ error: 'not found' }, request, 404)
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    try {
      return await handleHttp(request, env)
    } catch (error: unknown) {
      console.error(JSON.stringify({ event: 'request_error', message: error instanceof Error ? error.message : 'unknown' }))
      return json({ error: 'Não foi possível concluir a operação' }, request, 500)
    }
  },

  async scheduled(_controller: ScheduledController, env: WorkerEnv): Promise<void> {
    webpush.setVapidDetails(
      'mailto:ola@zelluapp.com.br',
      env.VAPID_PUBLIC_KEY,
      env.VAPID_PRIVATE_KEY,
    )

    const now = saoPauloDateParts()
    const today = now.date
    const currentMinutes = now.hour * 60 + now.minute
    const { keys } = await env.REMINDERS.list({ prefix: 'rem:' })

    for (const { name } of keys) {
      const raw = await env.REMINDERS.get(name)
      if (!raw) continue

      const reminder = JSON.parse(raw) as ReminderSync
      if (!reminder.dataLimite || reminder.dataLimite !== today) {
        continue
      }

      if (currentMinutes < minutesFromTime(reminder.horaAviso)) {
        continue
      }

      const userId = name.split(':')[1]
      const sentKey = `sent:${userId}:${reminder.id}:${today}`
      const alreadySent = await env.REMINDERS.get(sentKey)
      if (alreadySent) continue

      const subscriptionRaw = await env.SUBSCRIPTIONS.get(`sub:${userId}`)
      if (!subscriptionRaw) continue

      try {
        await webpush.sendNotification(
          JSON.parse(subscriptionRaw) as webpush.PushSubscription,
          JSON.stringify({
            title: `Aviso do Zellu — ${reminder.veiculoNome}`,
            body: reminder.titulo,
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            tag: reminder.id,
            data: { veiculoId: reminder.veiculoId },
          }),
        )
        await env.REMINDERS.put(sentKey, '1', { expirationTtl: 60 * 60 * 24 * 7 })
      } catch (error: unknown) {
        if ((error as { statusCode?: number }).statusCode === 410) {
          await env.SUBSCRIPTIONS.delete(`sub:${userId}`)
        }
      }
    }
  },
} satisfies ExportedHandler<WorkerEnv>
