// api/tiktok-registro.js
//
// Events API de TikTok: cuando alguien crea su cuenta, el servidor le avisa
// a TikTok "Completar registro" directamente, sin depender del navegador
// (el píxel del navegador puede fallar por bloqueadores o por el celular).
// Lo llama la app justo después del registro (correo o Google).
//
// Seguridad: solo se envía si el user_id existe en Supabase y la cuenta se
// creó hace menos de 1 hora. El correo nunca sale en texto: va cifrado
// (SHA-256), como pide TikTok. El mismo event_id que usa el píxel del
// navegador evita que TikTok lo cuente dos veces.
//
// Variables en Vercel: TIKTOK_EVENTS_TOKEN (token de Events API, lo genera
// Jonah en TikTok Ads Manager → Gerente de eventos → píxel → Settings) y,
// solo para probar, TIKTOK_TEST_EVENT_CODE (el código TEST… de "Test events").

import { createHash } from 'node:crypto';
import { getSupabase } from './_lib/push.js';

const PIXEL = 'DAJMS3JC77UES9751Q2G';
const API = 'https://business-api.tiktok.com/open_api/v1.3/event/track/';
const UNA_HORA = 60 * 60 * 1000;
const sha256 = (t) => createHash('sha256').update(String(t).trim().toLowerCase()).digest('hex');
const texto = (v, max) => (typeof v === 'string' ? v.slice(0, max) : undefined);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  const token = process.env.TIKTOK_EVENTS_TOKEN;
  if (!token) return res.status(200).json({ ok: false, motivo: 'falta TIKTOK_EVENTS_TOKEN' });

  const { user_id, ttclid, ttp, url, referrer } = req.body || {};
  if (typeof user_id !== 'string' || !/^[0-9a-f-]{36}$/i.test(user_id)) return res.status(400).json({ error: 'Faltan datos' });

  try {
    const supabase = getSupabase();
    const { data } = await supabase.auth.admin.getUserById(user_id);
    const user = data?.user;
    if (!user) return res.status(404).json({ error: 'No existe' });
    if (Date.now() - new Date(user.created_at).getTime() > UNA_HORA) return res.status(200).json({ ok: false, motivo: 'cuenta antigua' });

    const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || undefined;
    const cuerpo = {
      event_source: 'web',
      event_source_id: PIXEL,
      data: [{
        event: 'CompleteRegistration',
        event_time: Math.floor(Date.now() / 1000),
        event_id: `reg_${user_id}`,
        user: {
          email: user.email ? sha256(user.email) : undefined,
          external_id: sha256(user_id),
          ttclid: texto(ttclid, 300),
          ttp: texto(ttp, 300),
          ip,
          user_agent: texto(req.headers['user-agent'], 500),
        },
        page: { url: texto(url, 500), referrer: texto(referrer, 500) },
      }],
    };
    if (process.env.TIKTOK_TEST_EVENT_CODE) cuerpo.test_event_code = process.env.TIKTOK_TEST_EVENT_CODE;

    const r = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Access-Token': token },
      body: JSON.stringify(cuerpo),
    });
    const respuesta = await r.json().catch(() => ({}));
    if (respuesta?.code !== 0) console.error('TikTok Events API:', r.status, JSON.stringify(respuesta).slice(0, 300));
    return res.status(200).json({ ok: respuesta?.code === 0, code: respuesta?.code, message: respuesta?.message });
  } catch (e) {
    console.error('Error en tiktok-registro:', e);
    return res.status(500).json({ ok: false, error: 'No se pudo avisar a TikTok' });
  }
}
