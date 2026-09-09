import { clone, validateStage } from './stage.js';

const PREFIX = 'JO1.';

function bytesToBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function encodeStage(stage) {
  const valid = clone(validateStage(clone(stage)));
  const json = JSON.stringify(valid);
  const base64 = bytesToBase64(new TextEncoder().encode(json))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/g, '');
  return PREFIX + base64;
}

export function decodeStage(code) {
  if (typeof code !== 'string' || !code.trim().startsWith(PREFIX)) {
    throw new Error('共有コードが正しくありません');
  }
  const body = code.trim().slice(PREFIX.length).replaceAll('-', '+').replaceAll('_', '/');
  const padded = body + '='.repeat((4 - body.length % 4) % 4);
  let json;
  try {
    json = new TextDecoder().decode(base64ToBytes(padded));
  } catch {
    throw new Error('共有コードを読み取れません');
  }
  let stage;
  try {
    stage = JSON.parse(json);
  } catch {
    throw new Error('共有コードを読み取れません');
  }
  return clone(validateStage(stage));
}
