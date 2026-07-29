import crypto from 'node:crypto';
import { Router } from 'express';
import Razorpay from 'razorpay';
import { config } from '../config.js';
import { plans } from '../data/seed.js';
import { createOrder, getOrder, setUserPlan, updateOrder } from '../store.js';
import { requireAuth } from '../auth.js';

const router = Router();

const razorpay = config.razorpay.enabled
  ? new Razorpay({ key_id: config.razorpay.keyId, key_secret: config.razorpay.keySecret })
  : null;

router.get('/plans', (_req, res) => {
  res.json({ items: plans, live: Boolean(razorpay), keyId: config.razorpay.keyId || null });
});

/**
 * Creates a Razorpay order for the chosen plan. Without Razorpay keys a
 * simulated order is issued instead so the checkout flow stays exercisable
 * end to end; the response flags which mode produced it.
 */
router.post('/order', requireAuth, async (req, res, next) => {
  try {
    const plan = plans.find((p) => p.id === req.body?.planId);
    if (!plan) return res.status(400).json({ error: 'Choose a valid membership plan.' });

    const receipt = `ea_${Date.now().toString(36)}`;

    if (razorpay) {
      const order = await razorpay.orders.create({
        amount: plan.amount,
        currency: plan.currency,
        receipt,
        notes: { plan_id: plan.id, user_id: req.user.sub },
      });

      await createOrder({
        id: order.id,
        user_id: req.user.sub,
        plan_id: plan.id,
        amount: plan.amount,
        currency: plan.currency,
        status: 'created',
        payment_id: null,
      });

      return res.json({ mode: 'live', keyId: config.razorpay.keyId, order, plan });
    }

    const order = {
      id: `order_sim_${crypto.randomBytes(8).toString('hex')}`,
      amount: plan.amount,
      currency: plan.currency,
      receipt,
      status: 'created',
    };
    await createOrder({
      ...order,
      user_id: req.user.sub,
      plan_id: plan.id,
      payment_id: null,
    });

    res.json({ mode: 'simulated', keyId: null, order, plan });
  } catch (err) {
    next(err);
  }
});

/**
 * Verifies the Razorpay checkout signature and activates the membership.
 * In simulated mode the signature check is skipped and the order is marked
 * paid directly.
 */
router.post('/verify', requireAuth, async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    if (!razorpay_order_id) return res.status(400).json({ error: 'Missing order id.' });

    const order = await getOrder(razorpay_order_id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    if (order.user_id !== req.user.sub) {
      return res.status(403).json({ error: 'This order belongs to another account.' });
    }

    if (razorpay) {
      const expected = crypto
        .createHmac('sha256', config.razorpay.keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      const a = Buffer.from(expected);
      const b = Buffer.from(String(razorpay_signature || ''));
      const valid = a.length === b.length && crypto.timingSafeEqual(a, b);

      if (!valid) {
        await updateOrder(order.id, { status: 'failed' });
        return res.status(400).json({ error: 'Payment signature verification failed.' });
      }
    }

    const paid = await updateOrder(order.id, {
      status: 'paid',
      payment_id: razorpay_payment_id || `pay_sim_${crypto.randomBytes(6).toString('hex')}`,
    });
    await setUserPlan(req.user.sub, order.plan_id);

    res.json({ status: 'paid', order: paid, planId: order.plan_id });
  } catch (err) {
    next(err);
  }
});

export default router;
