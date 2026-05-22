import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import type { Express } from 'express';
import { createApp } from '../../app.js';
import { initDb, getDb } from '../../db/index.js';

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
  return { status: res.status, body: data, headers: res.headers };
}

describe('Realtime sessions proxy route', () => {
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a Google Gemini Live ephemeral realtime session', async () => {
    await request(app, 'POST', '/api/keys', {
      platform: 'google',
      key: 'google_realtime_test_key',
      label: 'realtime',
    });

    const origFetch = global.fetch;
    let providerBody: any = null;

    vi.spyOn(global, 'fetch').mockImplementation(async (url, init) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      if (urlStr.includes('generativelanguage.googleapis.com/v1alpha/auth_tokens')) {
        providerBody = JSON.parse((init as any).body);
        return {
          ok: true,
          json: () => Promise.resolve({
            name: 'authTokens/test-realtime-token',
            expireTime: '2026-05-21T12:00:00Z',
          }),
        } as any;
      }

      return origFetch(url, init);
    });

    const { status, body, headers } = await request(app, 'POST', '/v1/realtime/sessions', {
      model: 'auto',
      instructions: 'You are concise.',
      voice: 'alloy',
      response_modalities: ['AUDIO'],
      input_audio_transcription: true,
      output_audio_transcription: true,
      temperature: 0.7,
    });

    expect(status).toBe(200);
    expect(headers.get('X-Routed-Via')).toContain('google/gemini-2.5-flash-native-audio-preview-12-2025');
    expect(body.object).toBe('realtime.session');
    expect(body.provider).toBe('google');
    expect(body.model).toBe('gemini-2.5-flash-native-audio-preview-12-2025');
    expect(body.client_secret.value).toBe('authTokens/test-realtime-token');
    expect(body.connect_url).toContain('BidiGenerateContentConstrained');
    expect(body.connect_url).toContain('access_token=authTokens%2Ftest-realtime-token');
    expect(body.config.response_modalities).toEqual(['AUDIO']);
    expect(body.config.input_audio_transcription).toBe(true);
    expect(body.config.output_audio_transcription).toBe(true);

    expect(providerBody.uses).toBe(1);
    expect(providerBody.bidiGenerateContentSetup.model).toBe('models/gemini-2.5-flash-native-audio-preview-12-2025');
    expect(providerBody.bidiGenerateContentSetup.systemInstruction.parts[0].text).toBe('You are concise.');
    expect(providerBody.bidiGenerateContentSetup.generationConfig.responseModalities).toEqual(['AUDIO']);
    expect(providerBody.bidiGenerateContentSetup.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName).toBe('Kore');
  });

  it('rejects an explicit non-realtime model', async () => {
    const { status, body } = await request(app, 'POST', '/v1/realtime/sessions', {
      model: 'mistral-large-latest',
      response_modalities: ['AUDIO'],
    });

    expect(status).toBe(400);
    expect(body.error.code).toBe('model_not_found');
    expect(body.error.message).toContain('does not support realtime audio');
  });
});
