import AdmZip from 'adm-zip';

const escapeXml = (value) => String(value ?? '')
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const paragraph = (text, {
  bold = false,
  size = 22,
  spacingAfter = 100,
  spacingBefore = 0,
  keepNext = false,
  color = '1F2937'
} = {}) => {
  const lines = String(text ?? '').split(/\r?\n/);
  const runs = lines.map((line, index) => `${index ? '<w:r><w:br/></w:r>' : ''}<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Arial"/>${bold ? '<w:b/>' : ''}<w:color w:val="${color}"/><w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r>`).join('');
  return `<w:p><w:pPr>${keepNext ? '<w:keepNext/>' : ''}<w:spacing w:before="${spacingBefore}" w:after="${spacingAfter}"/></w:pPr>${runs}</w:p>`;
};

const normalizeRows = (rows) => (Array.isArray(rows) ? rows : [])
  .map((row) => Array.isArray(row) ? row : Array.isArray(row?.cells) ? row.cells : [row?.label, row?.value])
  .map((row) => row.map((cell) => String(cell ?? '').trim()))
  .filter((row) => row.some(Boolean));

const calculateColumnWidths = (rows, totalWidth) => {
  const columnCount = Math.max(1, ...rows.map((row) => row.length));
  const weights = Array.from({ length: columnCount }, (_, columnIndex) => {
    const longest = Math.max(8, ...rows.map((row) => String(row[columnIndex] || '').length));
    return Math.min(longest, 38);
  });
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  const widths = weights.map((weight) => Math.max(700, Math.floor(totalWidth * weight / totalWeight)));
  widths[widths.length - 1] += totalWidth - widths.reduce((sum, value) => sum + value, 0);
  return widths;
};

const tableCell = (value, width, { header = false } = {}) => `<w:tc>
  <w:tcPr><w:tcW w:w="${width}" w:type="dxa"/><w:vAlign w:val="center"/>${header ? '<w:shd w:fill="1D4ED8"/>' : ''}<w:tcMar><w:top w:w="100" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar></w:tcPr>
  ${paragraph(value || (header ? '' : 'Neuvedeno'), { bold: header, color: header ? 'FFFFFF' : '1F2937', size: 18, spacingAfter: 0 })}
</w:tc>`;

const tableBlock = (inputRows, { headerRows = 0, totalWidth = 9200 } = {}) => {
  const rows = normalizeRows(inputRows);
  if (!rows.length) return '';
  const columnCount = Math.max(...rows.map((row) => row.length));
  const widths = calculateColumnWidths(rows, totalWidth);
  const normalized = rows.map((row) => Array.from({ length: columnCount }, (_, index) => row[index] || ''));
  return `<w:tbl>
    <w:tblPr><w:tblW w:w="${totalWidth}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="94A3B8"/><w:left w:val="single" w:sz="4" w:color="94A3B8"/><w:bottom w:val="single" w:sz="4" w:color="94A3B8"/><w:right w:val="single" w:sz="4" w:color="94A3B8"/><w:insideH w:val="single" w:sz="4" w:color="CBD5E1"/><w:insideV w:val="single" w:sz="4" w:color="CBD5E1"/></w:tblBorders></w:tblPr>
    <w:tblGrid>${widths.map((width) => `<w:gridCol w:w="${width}"/>`).join('')}</w:tblGrid>
    ${normalized.map((row, rowIndex) => `<w:tr><w:trPr><w:cantSplit/>${rowIndex < headerRows ? '<w:tblHeader/>' : ''}</w:trPr>${row.map((cell, columnIndex) => tableCell(cell, widths[columnIndex], { header: rowIndex < headerRows })).join('')}</w:tr>`).join('')}
  </w:tbl>${paragraph('', { size: 4, spacingAfter: 80 })}`;
};

const planBlocks = (payload) => [
  { type: 'heading', level: 2, text: 'Identifikace klienta' },
  { type: 'paragraph', text: payload.clientIdentification || 'Neuvedeno' },
  { type: 'heading', level: 2, text: 'Výchozí situace' },
  { type: 'paragraph', text: payload.currentSituation || 'Neuvedeno' },
  { type: 'heading', level: 2, text: 'Silné stránky a zdroje' },
  { type: 'paragraph', text: payload.strengthsResources || 'Neuvedeno' },
  { type: 'heading', level: 2, text: 'Identifikované bariéry' },
  { type: 'paragraph', text: payload.barriers || 'Neuvedeno' },
  { type: 'heading', level: 2, text: 'Hlavní cíl' },
  { type: 'paragraph', text: payload.mainGoal || 'Neuvedeno' },
  { type: 'heading', level: 2, text: 'Dílčí cíle' },
  { type: 'paragraph', text: payload.subGoals || 'Neuvedeno' },
  { type: 'heading', level: 2, text: 'Plánované kroky' },
  { type: 'paragraph', text: payload.plannedSteps || 'Neuvedeno' },
  { type: 'heading', level: 2, text: 'Zapojení dalších služeb' },
  { type: 'paragraph', text: payload.otherServices || 'Neuvedeno' },
  { type: 'heading', level: 2, text: 'Vyhodnocení a aktualizace' },
  { type: 'paragraph', text: payload.evaluationUpdates || 'Neuvedeno' },
  { type: 'table', headerRows: 0, rows: [
    ['Datum plánu', payload.planDate || 'Neuvedeno'],
    ['Pracovník', payload.workerSignature || 'Neuvedeno']
  ] },
  { type: 'heading', level: 2, text: 'Podpisy' },
  { type: 'table', headerRows: 0, rows: [
    ['Místo', 'Datum'],
    ['Podpis klienta', 'Podpis pracovníka']
  ] }
];

const normalizeDocumentPayload = (payload) => {
  const isPlan = payload.documentType === 'plan' || payload.clientIdentification || payload.currentSituation || payload.plannedSteps;
  if (isPlan) {
    return {
      title: String(payload.title || 'Individuální plán osobního rozvoje'),
      blocks: planBlocks(payload),
      orientation: 'portrait'
    };
  }
  if (Array.isArray(payload.blocks)) {
    return {
      title: String(payload.title || 'Záznam aktivity'),
      blocks: payload.blocks,
      orientation: payload.orientation === 'landscape' ? 'landscape' : 'portrait'
    };
  }
  const rows = Array.isArray(payload.rows) ? payload.rows.filter((row) => row && row.label) : [];
  const text = String(payload.text || '').trim();
  return {
    title: String(payload.title || 'Záznam aktivity'),
    orientation: 'portrait',
    blocks: [
      ...(rows.length ? [{ type: 'table', rows, headerRows: 0 }] : []),
      ...(text ? [
        { type: 'heading', level: 2, text: 'Výstup dokumentu' },
        { type: 'paragraph', text }
      ] : [])
    ]
  };
};

const blockToXml = (block, totalWidth) => {
  if (!block || typeof block !== 'object') return '';
  if (block.type === 'table') return tableBlock(block.rows, { headerRows: Number(block.headerRows || 0), totalWidth });
  if (block.type === 'heading') {
    const level = Math.max(2, Math.min(4, Number(block.level || 2)));
    const sizes = { 2: 26, 3: 22, 4: 20 };
    return paragraph(block.text, { bold: true, size: sizes[level], spacingBefore: 120, spacingAfter: 70, keepNext: true, color: '111827' });
  }
  if (block.type === 'pageBreak') return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
  return paragraph(block.text, { size: 20, spacingAfter: 100 });
};

function buildRecordDocx(payload = {}) {
  const normalized = normalizeDocumentPayload(payload);
  const landscape = normalized.orientation === 'landscape';
  const totalWidth = landscape ? 15100 : 9200;
  const pageSize = landscape ? '<w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/>' : '<w:pgSz w:w="11906" w:h="16838"/>';
  const pageMargins = landscape
    ? '<w:pgMar w:top="850" w:right="850" w:bottom="850" w:left="850" w:header="500" w:footer="500" w:gutter="0"/>'
    : '<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/>';
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraph(normalized.title, { bold: true, size: 34, spacingAfter: 180, color: '111827' })}
    ${normalized.blocks.map((block) => blockToXml(block, totalWidth)).join('')}
    <w:sectPr>${pageSize}${pageMargins}</w:sectPr>
  </w:body>
</w:document>`;

  const zip = new AdmZip();
  zip.addFile('[Content_Types].xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`, 'utf8'));
  zip.addFile('_rels/.rels', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`, 'utf8'));
  zip.addFile('word/document.xml', Buffer.from(documentXml, 'utf8'));
  return zip.toBuffer();
}

function readJsonBody(request, limit = 10_000_000) {
  return new Promise((resolve, reject) => {
    let body = '';
    let rejected = false;
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      if (rejected) return;
      body += chunk;
      if (body.length > limit) {
        rejected = true;
        body = '';
        reject(new Error('Požadavek je příliš velký.'));
      }
    });
    request.on('end', () => {
      if (rejected) return;
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { reject(new Error('Neplatná data exportu.')); }
    });
    request.on('error', reject);
  });
}

async function handleDocxExportRequest(request, response) {
  try {
    const payload = await readJsonBody(request);
    const buffer = buildRecordDocx(payload);
    const filename = String(payload.filename || 'zaznam.docx').replace(/[^a-zA-Z0-9._-]/g, '-');
    response.writeHead(200, {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename.endsWith('.docx') ? filename : `${filename}.docx`}"`,
      'Cache-Control': 'no-store, private',
      'Content-Length': buffer.length
    });
    response.end(buffer);
  } catch (error) {
    response.writeHead(400, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, private'
    });
    response.end(JSON.stringify({ error: error.message || 'Export DOCX selhal.' }));
  }
}

export { buildRecordDocx, handleDocxExportRequest };
