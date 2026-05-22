import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import type { Express } from 'express';
import { createApp } from '../../app.js';
import { getDb, initDb } from '../../db/index.js';
import { recordModelFailure } from '../../services/router.js';

async function request(app: Express, method: string, path: string, body?: any) {
  const server = app.listen(0);
  const addr = server.address() as any;
  const url = `http://127.0.0.1:${addr.port}${path}`;

  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);
  server.close();
  return { status: res.status, body: data };
}

describe('Fallback API', () => {
  let app: Express;

  beforeAll(() => {
    process.env.ENCRYPTION_KEY = '0'.repeat(64);
    initDb(':memory:');
    app = createApp();
  });

  beforeEach(() => {
    const db = getDb();
    db.prepare('DELETE FROM api_keys').run();
    db.prepare('DELETE FROM requests').run();
    db.prepare('DELETE FROM model_runtime_health').run();
  });

  it('GET /api/fallback returns fallback chain', async () => {
    const { status, body } = await request(app, 'GET', '/api/fallback');
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    // Should be sorted by priority
    for (let i = 1; i < body.length; i++) {
      expect(body[i].priority).toBeGreaterThanOrEqual(body[i - 1].priority);
    }
  });

  it('GET /api/fallback entries have expected fields', async () => {
    const { body } = await request(app, 'GET', '/api/fallback');
    const first = body[0];
    expect(first).toHaveProperty('modelDbId');
    expect(first).toHaveProperty('priority');
    expect(first).toHaveProperty('enabled');
    expect(first).toHaveProperty('platform');
    expect(first).toHaveProperty('displayName');
    expect(first).toHaveProperty('providerDisplayName');
    expect(first).toHaveProperty('intelligenceRank');
    expect(first).toHaveProperty('baseBudget');
    expect(first).toHaveProperty('effectiveBudget');
    expect(first).toHaveProperty('keyCount');
    expect(first).toHaveProperty('runtimeStatus');
    expect(first).toHaveProperty('runtimeBlockedUntil');
    expect(first).toHaveProperty('lastErrorCategory');
    expect(first).toHaveProperty('failureCount');
  });

  it('PUT /api/fallback updates order', async () => {
    const { body: original } = await request(app, 'GET', '/api/fallback');

    // Reverse the order
    const reversed = original.map((e: any, i: number) => ({
      modelDbId: e.modelDbId,
      priority: original.length - i,
      enabled: e.enabled,
    }));

    const { status } = await request(app, 'PUT', '/api/fallback', reversed);
    expect(status).toBe(200);

    // Verify order changed
    const { body: after } = await request(app, 'GET', '/api/fallback');
    expect(after[0].modelDbId).toBe(original[original.length - 1].modelDbId);

    // Restore original order
    const restore = original.map((e: any, i: number) => ({
      modelDbId: e.modelDbId,
      priority: i + 1,
      enabled: e.enabled,
    }));
    await request(app, 'PUT', '/api/fallback', restore);
  });

  it('POST /api/fallback/sort/intelligence sorts by intelligence', async () => {
    const { status } = await request(app, 'POST', '/api/fallback/sort/intelligence');
    expect(status).toBe(200);

    const { body } = await request(app, 'GET', '/api/fallback');
    // Should be sorted ascending by intelligence rank
    for (let i = 1; i < body.length; i++) {
      expect(body[i].intelligenceRank).toBeGreaterThanOrEqual(body[i - 1].intelligenceRank);
    }
  });

  it('POST /api/fallback/sort/speed sorts by speed', async () => {
    const { status } = await request(app, 'POST', '/api/fallback/sort/speed');
    expect(status).toBe(200);

    const { body } = await request(app, 'GET', '/api/fallback');
    // Should be sorted ascending by speed rank
    for (let i = 1; i < body.length; i++) {
      expect(body[i].speedRank).toBeGreaterThanOrEqual(body[i - 1].speedRank);
    }
  });

  it('POST /api/fallback/sort/invalid returns 400', async () => {
    const { status } = await request(app, 'POST', '/api/fallback/sort/invalid');
    expect(status).toBe(400);
  });

  it('PATCH /api/fallback/:modelDbId toggles a model immediately', async () => {
    const { body: original } = await request(app, 'GET', '/api/fallback');
    const target = original.find((entry: any) => entry.enabled);
    expect(target).toBeDefined();

    const { status, body } = await request(app, 'PATCH', `/api/fallback/${target.modelDbId}`, {
      enabled: false,
    });
    expect(status).toBe(200);
    expect(body).toMatchObject({ success: true, modelDbId: target.modelDbId, enabled: false });

    const { body: afterDisable } = await request(app, 'GET', '/api/fallback');
    expect(afterDisable.find((entry: any) => entry.modelDbId === target.modelDbId).enabled).toBe(false);

    await request(app, 'PATCH', `/api/fallback/${target.modelDbId}`, { enabled: true });
  });

  it('POST /api/fallback/:modelDbId/retry clears runtime quarantine', async () => {
    const { body: original } = await request(app, 'GET', '/api/fallback');
    const target = original.find((entry: any) => entry.platform === 'openrouter') ?? original[0];
    expect(target).toBeDefined();

    recordModelFailure(target.modelDbId, 'model_unavailable', 'OpenRouter API error 404: Provider returned error');

    const { body: quarantined } = await request(app, 'GET', '/api/fallback');
    const before = quarantined.find((entry: any) => entry.modelDbId === target.modelDbId);
    expect(before).toMatchObject({
      providerDisplayName: expect.any(String),
      runtimeStatus: 'unavailable',
      lastErrorCategory: 'model_unavailable',
      lastError: 'OpenRouter API error 404: Provider returned error',
      failureCount: 1,
    });
    expect(before.runtimeBlockedUntil).toBeTruthy();

    const { status, body } = await request(app, 'POST', `/api/fallback/${target.modelDbId}/retry`);
    expect(status).toBe(200);
    expect(body).toMatchObject({ success: true, modelDbId: target.modelDbId });

    const { body: cleared } = await request(app, 'GET', '/api/fallback');
    const after = cleared.find((entry: any) => entry.modelDbId === target.modelDbId);
    expect(after).toMatchObject({
      runtimeStatus: 'healthy',
      runtimeBlockedUntil: null,
      lastErrorCategory: null,
      lastError: null,
      failureCount: 0,
    });
  });

  it('POST /api/fallback/:modelDbId/retry requires confirmation for zero-quota quarantine', async () => {
    const { body: original } = await request(app, 'GET', '/api/fallback');
    const target = original.find((entry: any) => entry.platform === 'google') ?? original[0];
    expect(target).toBeDefined();

    recordModelFailure(
      target.modelDbId,
      'zero_quota',
      'Provider API error 429: Quota exceeded for metric requests, limit: 0, model: test-model',
    );

    const { body: quarantined } = await request(app, 'GET', '/api/fallback');
    const before = quarantined.find((entry: any) => entry.modelDbId === target.modelDbId);
    expect(before).toMatchObject({
      runtimeStatus: 'unavailable',
      lastErrorCategory: 'zero_quota',
      requiresConfirmation: true,
    });

    const rejected = await request(app, 'POST', `/api/fallback/${target.modelDbId}/retry`);
    expect(rejected.status).toBe(409);
    expect(rejected.body).toMatchObject({
      error: {
        code: 'confirmation_required',
      },
      requiresConfirmation: true,
    });

    const { body: stillQuarantined } = await request(app, 'GET', '/api/fallback');
    expect(stillQuarantined.find((entry: any) => entry.modelDbId === target.modelDbId)).toMatchObject({
      runtimeStatus: 'unavailable',
      lastErrorCategory: 'zero_quota',
      requiresConfirmation: true,
    });

    const confirmed = await request(app, 'POST', `/api/fallback/${target.modelDbId}/retry`, { confirm: true });
    expect(confirmed.status).toBe(200);
    expect(confirmed.body).toMatchObject({ success: true, modelDbId: target.modelDbId });

    const { body: cleared } = await request(app, 'GET', '/api/fallback');
    expect(cleared.find((entry: any) => entry.modelDbId === target.modelDbId)).toMatchObject({
      runtimeStatus: 'healthy',
      lastErrorCategory: null,
      requiresConfirmation: false,
    });
  });

  it('GET /api/fallback/token-usage multiplies model budget by routable key count', async () => {
    await request(app, 'POST', '/api/keys', {
      platform: 'google',
      key: 'google_account_a_key',
      label: 'account-a',
    });
    await request(app, 'POST', '/api/keys', {
      platform: 'google',
      key: 'google_account_b_key',
      label: 'account-b',
    });
    const { body: invalidKey } = await request(app, 'POST', '/api/keys', {
      platform: 'google',
      key: 'google_invalid_key',
      label: 'invalid',
    });
    getDb().prepare("UPDATE api_keys SET status = 'invalid' WHERE id = ?").run(invalidKey.id);

    const { status, body } = await request(app, 'GET', '/api/fallback/token-usage');

    expect(status).toBe(200);
    const googleModel = body.models.find((m: any) => m.platform === 'google');
    expect(googleModel).toMatchObject({
      platform: 'google',
      keyCount: 2,
    });
    expect(googleModel.baseBudget).toBeGreaterThan(0);
    expect(googleModel.effectiveBudget).toBe(googleModel.baseBudget * 2);
    expect(googleModel.budget).toBe(googleModel.effectiveBudget);
    expect(body.totalBudget).toBeGreaterThanOrEqual(googleModel.effectiveBudget);
  });
});
