// Boavista Horizon — recebe o formulário e reencaminha para o Google Apps Script.
// O URL do Apps Script fica na variável de ambiente APPS_SCRIPT_URL do Netlify
// (Site configuration → Environment variables). Nunca colocar o URL no HTML.
//
// O Apps Script responde ao POST com um redirect 302; o fetch do Node segue-o
// do lado do servidor, o que evita o erro de CORS que acontece no browser.

const REQUIRED = ['nome', 'email', 'telefone'];

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'method_not_allowed' }) };
  }

  const url = process.env.APPS_SCRIPT_URL;
  if (!url) {
    console.error('APPS_SCRIPT_URL não está definido nas variáveis de ambiente do Netlify.');
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: 'missing_config' }) };
  }

  let data;
  try { data = JSON.parse(event.body || '{}'); }
  catch (e) { return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'invalid_json' }) }; }

  // Anti-spam (campo escondido) — responde "ok" para não dar pistas ao bot.
  if (data.website) return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };

  for (const k of REQUIRED) {
    if (!data[k] || String(data[k]).trim() === '') {
      return { statusCode: 422, headers, body: JSON.stringify({ ok: false, error: 'missing_' + k }) };
    }
  }

  // Limita o tamanho de cada campo e junta dados do servidor.
  const clean = {};
  for (const [k, v] of Object.entries(data)) clean[k] = String(v == null ? '' : v).slice(0, 2000);
  clean.ip_pais = event.headers['x-country'] || '';
  clean.user_agent = (event.headers['user-agent'] || '').slice(0, 300);

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(clean),
      redirect: 'follow'
    });
    const text = await r.text();
    let json = {};
    try { json = JSON.parse(text); } catch (e) { json = { raw: text.slice(0, 200) }; }
    if (!r.ok || json.ok === false) {
      console.error('Apps Script respondeu com erro', r.status, text.slice(0, 300));
      return { statusCode: 502, headers, body: JSON.stringify({ ok: false, error: 'upstream' }) };
    }
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('Falha ao contactar o Apps Script', err);
    return { statusCode: 502, headers, body: JSON.stringify({ ok: false, error: 'upstream' }) };
  }
};
