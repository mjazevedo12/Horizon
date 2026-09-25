/**
 * Boavista Horizon — Google Apps Script para gravar leads numa Google Sheet.
 *
 * Como usar:
 * 1. Criar (ou abrir) a Google Sheet de leads → Extensões → Apps Script.
 * 2. Colar este código e guardar.
 * 3. Implementar → Nova implementação → Tipo: Aplicação Web
 *    - Executar como: Eu
 *    - Quem tem acesso: Qualquer pessoa
 * 4. Copiar o URL da aplicação web e colá-lo no Netlify, na variável APPS_SCRIPT_URL.
 *
 * A primeira linha da folha é criada automaticamente com os cabeçalhos abaixo.
 * Se já tiver uma folha modelo, basta que os cabeçalhos da linha 1 coincidam com
 * os nomes da coluna "Cabeçalho" em COLUNAS (a ordem das colunas pode ser outra).
 */

var NOME_FOLHA = 'Leads';

var COLUNAS = [
  // [Cabeçalho na folha, campo enviado pelo site]
  ['Data do pedido', 'data_pedido'],
  ['Empreendimento', 'empreendimento'],
  ['Nome', 'nome'],
  ['Email', 'email'],
  ['Telefone', 'telefone'],
  ['Residência', 'residencia'],
  ['Pretendo', 'pretendo'],
  ['Data de visita', 'data_visita'],
  ['Contacto preferencial', 'contacto_preferencial'],
  ['Mensagem', 'mensagem'],
  ['Consentimento', 'consentimento'],
  ['Idioma', 'idioma'],
  ['Origem', 'origem'],
  ['UTM Source', 'utm_source'],
  ['UTM Medium', 'utm_medium'],
  ['UTM Campaign', 'utm_campaign'],
  ['UTM Term', 'utm_term'],
  ['UTM Content', 'utm_content'],
  ['GCLID', 'gclid'],
  ['GBRAID', 'gbraid'],
  ['WBRAID', 'wbraid'],
  ['FBCLID', 'fbclid'],
  ['Referrer', 'referrer'],
  ['Página de entrada', 'landing'],
  ['Estado', ''],           // para a equipa preencher (Novo, Contactado, Visita, ...)
  ['Responsável', '']
];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var data = JSON.parse(e.postData.contents || '{}');
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(NOME_FOLHA) || ss.insertSheet(NOME_FOLHA);

    if (sh.getLastRow() === 0) {
      sh.appendRow(COLUNAS.map(function (c) { return c[0]; }));
      sh.setFrozenRows(1);
    }

    var header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var map = {};
    COLUNAS.forEach(function (c) { map[c[0]] = c[1]; });

    var row = header.map(function (h) {
      var key = map[h];
      if (!key) return h === 'Estado' ? 'Novo' : '';
      var v = data[key] == null ? '' : String(data[key]);
      // evita que o Sheets interprete números de telefone como fórmulas ou números
      if (key === 'telefone' || /^[=+\-@]/.test(v)) v = "'" + v;
      return v;
    });
    sh.appendRow(row);

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
