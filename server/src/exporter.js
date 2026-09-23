// Branded biodata exports: CSV, Excel (.xlsx) and PDF.
//
// The admin picks a dataset (registered members or directory profiles), the
// rows and the columns; this module turns that into a file. Excel and PDF
// carry the logo from server/assets, so a sheet forwarded to a family looks
// like it came from us.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.resolve(__dirname, '../assets');
const LOGO = path.join(ASSETS, 'logo-360.png');
const LOGO_MARK = path.join(ASSETS, 'logo-mark.png');
const WEB_PUBLIC = path.resolve(__dirname, '../../web/public');

const BRAND = {
  name: 'EverAfter Matrimony',
  burgundy: '#6B0020',
  pink: '#F4A7C0',
  blush: '#FDF1F5',
  ink: '#2A1A1F',
  muted: '#7A6A70',
};

// ------------------------------------------------------------- columns ---

const d = (key) => (row) => row.details?.[key];
const yesNo = (v) => (v ? 'Yes' : 'No');
const cap = (v) => (v ? String(v).charAt(0).toUpperCase() + String(v).slice(1) : v);
const STATUS_LABEL = { approved: 'Approved', pending: 'Pending', rejected: 'Rejected' };
const date = (v) => (v ? new Date(v).toISOString().slice(0, 10) : '');

function ageFromDob(dob) {
  if (!dob) return '';
  const t = new Date(dob).getTime();
  if (Number.isNaN(t)) return '';
  return Math.floor((Date.now() - t) / (365.25 * 24 * 3600 * 1000));
}

/** Column catalogue per dataset: [key, label, getter, group]. */
const COLUMNS = {
  members: [
    ['name', 'Full Name', (u) => `${u.first_name || ''} ${u.last_name || ''}`.trim(), 'Basic'],
    ['email', 'Email', (u) => u.email, 'Basic'],
    ['phone', 'Phone', (u) => u.phone, 'Basic'],
    ['gender', 'Gender', (u) => cap(u.gender), 'Basic'],
    ['dob', 'Date of Birth', (u) => u.dob, 'Basic'],
    ['age', 'Age', (u) => ageFromDob(u.dob), 'Basic'],
    ['profile_for', 'Profile For', (u) => cap(u.profile_for), 'Basic'],
    ['height_cm', 'Height (cm)', d('heightCm'), 'Personal'],
    ['weight_kg', 'Weight (kg)', d('weightKg'), 'Personal'],
    ['marital_status', 'Marital Status', d('maritalStatus'), 'Personal'],
    ['diet', 'Diet', d('diet'), 'Personal'],
    ['smoking', 'Smoking', d('smoking'), 'Personal'],
    ['drinking', 'Drinking', d('drinking'), 'Personal'],
    ['mother_tongue', 'Mother Tongue', d('motherTongue'), 'Religion'],
    ['religion', 'Religion', d('religion'), 'Religion'],
    ['community', 'Community / Caste', d('community'), 'Religion'],
    ['gothram', 'Gothram', d('gothram'), 'Religion'],
    ['manglik', 'Manglik', d('manglik'), 'Religion'],
    ['rashi', 'Rashi', d('rashi'), 'Religion'],
    ['nakshatra', 'Nakshatra', d('nakshatra'), 'Religion'],
    ['city', 'City', d('city'), 'Location'],
    ['state', 'State', d('state'), 'Location'],
    ['country', 'Country', d('country'), 'Location'],
    ['address', 'Address', d('address'), 'Location'],
    ['pincode', 'PIN Code', d('pincode'), 'Location'],
    ['highest_education', 'Education', d('highestEducation'), 'Career'],
    ['college', 'College', d('college'), 'Career'],
    ['occupation', 'Occupation', d('occupation'), 'Career'],
    ['employer', 'Employer', d('employer'), 'Career'],
    ['annual_income', 'Annual Income', d('annualIncome'), 'Career'],
    ['father_name', "Father's Name", d('fatherName'), 'Family'],
    ['father_occupation', "Father's Occupation", d('fatherOccupation'), 'Family'],
    ['father_email', "Father's Email", d('fatherEmail'), 'Family'],
    ['mother_name', "Mother's Name", d('motherName'), 'Family'],
    ['mother_occupation', "Mother's Occupation", d('motherOccupation'), 'Family'],
    ['mother_email', "Mother's Email", d('motherEmail'), 'Family'],
    ['siblings', 'Siblings', d('siblings'), 'Family'],
    ['family_type', 'Family Type', d('familyType'), 'Family'],
    ['family_status', 'Family Status', d('familyStatus'), 'Family'],
    ['family_values', 'Family Values', d('familyValues'), 'Family'],
    ['reference_name', 'Reference Name', d('referenceName'), 'Reference'],
    ['reference_phone', 'Reference Phone', d('referencePhone'), 'Reference'],
    ['referred_by', 'Reference Relation', d('referredBy'), 'Reference'],
    ['about_me', 'About', d('aboutMe'), 'About'],
    ['partner_expectations', 'Partner Expectations', d('partnerExpectations'), 'About'],
    ['plan_id', 'Membership Plan', (u) => u.plan_id || 'Free', 'Account'],
    ['photo_count', 'Photos', (u) => (u.photos || []).length, 'Account'],
    ['created_at', 'Joined On', (u) => date(u.created_at), 'Account'],
  ],
  profiles: [
    ['name', 'Full Name', (p) => p.name, 'Basic'],
    ['age', 'Age', (p) => p.age, 'Basic'],
    ['gender', 'Gender', (p) => cap(p.gender), 'Basic'],
    ['dob', 'Date of Birth', d('dob'), 'Basic'],
    ['status', 'Status', (p) => STATUS_LABEL[p.status || 'approved'], 'Basic'],
    ['verified', 'Verified', (p) => yesNo(p.verified), 'Basic'],
    ['phone', 'Contact Phone', d('phone'), 'Basic'],
    ['email', 'Contact Email', d('email'), 'Basic'],
    ['height_cm', 'Height (cm)', (p) => p.height_cm, 'Personal'],
    ['weight_kg', 'Weight (kg)', d('weightKg'), 'Personal'],
    ['complexion', 'Complexion', d('complexion'), 'Personal'],
    ['marital_status', 'Marital Status', (p) => p.marital_status, 'Personal'],
    ['diet', 'Diet', (p) => p.diet, 'Personal'],
    ['mother_tongue', 'Mother Tongue', (p) => p.mother_tongue, 'Religion'],
    ['religion', 'Religion', (p) => p.religion, 'Religion'],
    ['community', 'Community / Caste', (p) => p.community, 'Religion'],
    ['gothram', 'Gothram', d('gothram'), 'Religion'],
    ['manglik', 'Manglik', d('manglik'), 'Religion'],
    ['rashi', 'Rashi', d('rashi'), 'Religion'],
    ['nakshatra', 'Nakshatra', d('nakshatra'), 'Religion'],
    ['time_of_birth', 'Time of Birth', d('timeOfBirth'), 'Religion'],
    ['place_of_birth', 'Place of Birth', d('placeOfBirth'), 'Religion'],
    ['location', 'Location', (p) => p.location, 'Location'],
    ['address', 'Address', d('address'), 'Location'],
    ['education', 'Education', (p) => p.education, 'Career'],
    ['education_level', 'Education Level', (p) => p.education_level, 'Career'],
    ['profession', 'Profession', (p) => p.profession, 'Career'],
    ['employer', 'Employer', d('employer'), 'Career'],
    ['annual_income', 'Annual Income', d('annualIncome'), 'Career'],
    ['father_name', "Father's Name", d('fatherName'), 'Family'],
    ['father_occupation', "Father's Occupation", d('fatherOccupation'), 'Family'],
    ['mother_name', "Mother's Name", d('motherName'), 'Family'],
    ['mother_occupation', "Mother's Occupation", d('motherOccupation'), 'Family'],
    ['siblings', 'Siblings', d('siblings'), 'Family'],
    ['family_type', 'Family Type', d('familyType'), 'Family'],
    ['family_status', 'Family Status', d('familyStatus'), 'Family'],
    ['family_values', 'Family Values', d('familyValues'), 'Family'],
    ['reference_name', 'Reference Name', d('referenceName'), 'Reference'],
    ['reference_phone', 'Reference Phone', d('referencePhone'), 'Reference'],
    ['referred_by', 'Reference Relation', d('referredBy'), 'Reference'],
    ['about', 'About', (p) => p.about, 'About'],
    ['partner_expectations', 'Partner Expectations', d('partnerExpectations'), 'About'],
    ['source', 'Added Via', (p) => (p.source === 'biodata' ? 'Biodata PDF' : 'Manual entry'), 'Record'],
    ['created_by', 'Added By', (p) => p.created_by, 'Record'],
    ['created_at', 'Added On', (p) => date(p.created_at), 'Record'],
  ],
};

export const DEFAULT_COLUMNS = {
  members: ['name', 'email', 'phone', 'gender', 'age', 'religion', 'community', 'city', 'occupation', 'reference_name', 'reference_phone'],
  profiles: ['name', 'age', 'gender', 'religion', 'community', 'location', 'profession', 'education', 'status'],
};

/** Public catalogue for the column picker. */
export function columnCatalog() {
  const out = {};
  for (const [dataset, cols] of Object.entries(COLUMNS)) {
    out[dataset] = cols.map(([key, label, , group]) => ({ key, label, group }));
  }
  return { columns: out, defaults: DEFAULT_COLUMNS };
}

/** Resolves requested column keys (in the admin's order) to definitions. */
export function resolveColumns(dataset, keys) {
  const all = COLUMNS[dataset];
  if (!all) return [];
  const byKey = new Map(all.map((c) => [c[0], c]));
  const picked = (keys?.length ? keys : DEFAULT_COLUMNS[dataset])
    .map((k) => byKey.get(k))
    .filter(Boolean);
  return picked.map(([key, label, get]) => ({ key, label, get }));
}

const cell = (col, row) => {
  const v = col.get(row);
  return v === null || v === undefined ? '' : String(v);
};

// ----------------------------------------------------------------- CSV ---

export function toCsv(rows, columns) {
  const esc = (s) => (/[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const lines = [columns.map((c) => esc(c.label)).join(',')];
  for (const row of rows) lines.push(columns.map((c) => esc(cell(c, row))).join(','));
  return Buffer.from('﻿' + lines.join('\r\n'), 'utf8'); // BOM so Excel reads UTF-8
}

// --------------------------------------------------------------- Excel ---

export async function toXlsx(rows, columns, { title }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = BRAND.name;
  wb.created = new Date();
  const ws = wb.addWorksheet('Biodata', {
    views: [{ state: 'frozen', ySplit: 6 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  const lastCol = Math.max(columns.length, 4);
  const argb = (hex) => 'FF' + hex.replace('#', '').toUpperCase();

  // Branding band: logo on the left, title + meta beside it.
  for (let r = 1; r <= 4; r++) {
    for (let c = 1; c <= lastCol; c++) {
      ws.getCell(r, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(BRAND.blush) } };
    }
  }
  if (fs.existsSync(LOGO)) {
    const img = wb.addImage({ filename: LOGO, extension: 'png' });
    ws.addImage(img, { tl: { col: 0.15, row: 0.15 }, ext: { width: 72, height: 72 } });
  }
  ws.mergeCells(1, 2, 2, lastCol);
  const t = ws.getCell(1, 2);
  t.value = `${BRAND.name} — ${title}`;
  t.font = { name: 'Calibri', size: 16, bold: true, color: { argb: argb(BRAND.burgundy) } };
  t.alignment = { vertical: 'middle' };
  ws.mergeCells(3, 2, 4, lastCol);
  const m = ws.getCell(3, 2);
  m.value = `${rows.length} record${rows.length === 1 ? '' : 's'} · Generated ${new Date().toLocaleString('en-IN')} · Confidential`;
  m.font = { name: 'Calibri', size: 10, italic: true, color: { argb: argb(BRAND.muted) } };
  m.alignment = { vertical: 'top' };
  ws.getRow(1).height = 22;
  ws.getRow(2).height = 22;
  ws.getColumn(1).width = 14;

  // Header row.
  const headerRow = ws.getRow(6);
  columns.forEach((c, i) => {
    const h = headerRow.getCell(i + 1);
    h.value = c.label;
    h.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    h.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(BRAND.burgundy) } };
    h.alignment = { vertical: 'middle', wrapText: true };
    h.border = { bottom: { style: 'thin', color: { argb: argb(BRAND.pink) } } };
  });
  headerRow.height = 24;

  rows.forEach((row, ri) => {
    const r = ws.getRow(7 + ri);
    columns.forEach((c, ci) => {
      const x = r.getCell(ci + 1);
      const v = c.get(row);
      x.value = typeof v === 'number' ? v : v === null || v === undefined ? '' : String(v);
      x.alignment = { vertical: 'top', wrapText: true };
      if (ri % 2 === 1) {
        x.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(BRAND.blush) } };
      }
    });
  });

  columns.forEach((c, i) => {
    const longest = Math.max(
      c.label.length,
      ...rows.slice(0, 200).map((row) => cell(c, row).length)
    );
    ws.getColumn(i + 1).width = Math.min(48, Math.max(i === 0 ? 14 : 10, longest + 2));
  });

  if (rows.length) {
    ws.autoFilter = { from: { row: 6, column: 1 }, to: { row: 6 + rows.length, column: columns.length } };
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}

// ----------------------------------------------------------------- PDF ---

function collect(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

function brandHeader(doc, { title, subtitle }) {
  const { left, right } = doc.page.margins;
  const width = doc.page.width - left - right;
  const top = 28;
  doc.save().rect(0, 0, doc.page.width, 86).fill(BRAND.blush).restore();
  if (fs.existsSync(LOGO)) doc.image(LOGO, left, top - 10, { width: 62, height: 62 });
  doc.fillColor(BRAND.burgundy).font('Helvetica-Bold').fontSize(17).text(BRAND.name, left + 74, top, { width: width - 74 });
  doc.fillColor(BRAND.ink).font('Helvetica').fontSize(10.5).text(title, left + 74, top + 22, { width: width - 74 });
  if (subtitle) {
    doc.fillColor(BRAND.muted).fontSize(8.5).text(subtitle, left + 74, top + 37, { width: width - 74 });
  }
  doc.save().moveTo(0, 86).lineTo(doc.page.width, 86).lineWidth(2).strokeColor(BRAND.pink).stroke().restore();
  doc.y = 104;
}

function pageFooters(doc) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const bottom = doc.page.height - 30;
    const { left, right } = doc.page.margins;
    // Writing below the bottom margin would make pdfkit add a page; lift it.
    const saved = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.fillColor(BRAND.muted).font('Helvetica').fontSize(8)
      .text(`${BRAND.name} · Confidential biodata — do not share without consent`, left, bottom, {
        width: doc.page.width - left - right, align: 'left', lineBreak: false,
      })
      .text(`Page ${i - range.start + 1} of ${range.count}`, left, bottom, {
        width: doc.page.width - left - right, align: 'right', lineBreak: false,
      });
    doc.page.margins.bottom = saved;
  }
}

/** Landscape table — every selected column across, one row per record. */
async function pdfTable(rows, columns, { title }) {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 32, bufferPages: true });
  const done = collect(doc);
  const subtitle = `${rows.length} record${rows.length === 1 ? '' : 's'} · Generated ${new Date().toLocaleString('en-IN')}`;
  brandHeader(doc, { title, subtitle });

  const left = doc.page.margins.left;
  const width = doc.page.width - left - doc.page.margins.right;
  const fontSize = columns.length > 12 ? 6.5 : columns.length > 8 ? 7.5 : 8.5;

  // Column widths from measured text: every column first gets room for its
  // longest single word (so "Female" never breaks as "Femal/e"), then the
  // spare width goes to columns in proportion to how much more they'd like.
  const pad = 3;
  const sample = rows.slice(0, 150);
  const measure = (text, bold) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(fontSize);
    return doc.widthOfString(text || '');
  };
  const longestWord = (text, bold) =>
    Math.max(0, ...String(text || '').split(/\s+/).map((w) => measure(w, bold)));
  const minW = columns.map((c) =>
    Math.max(longestWord(c.label, true), ...sample.map((r) => longestWord(cell(c, r)))) + pad * 2 + 1
  );
  const natural = columns.map((c, i) =>
    Math.max(minW[i], Math.min(220, Math.max(measure(c.label, true), ...sample.map((r) => measure(cell(c, r)))) + pad * 2 + 1))
  );
  const sumMin = minW.reduce((a, b) => a + b, 0);
  const sumNatural = natural.reduce((a, b) => a + b, 0);
  let widths;
  if (sumNatural <= width) {
    widths = natural.map((w) => (w / sumNatural) * width);
  } else if (sumMin >= width) {
    widths = minW.map((w) => (w / sumMin) * width); // very many columns: shrink evenly
  } else {
    const spare = width - sumMin;
    const want = natural.map((n, i) => n - minW[i]);
    const sumWant = want.reduce((a, b) => a + b, 0) || 1;
    widths = minW.map((m, i) => m + (want[i] / sumWant) * spare);
  }

  const drawHeader = () => {
    doc.font('Helvetica-Bold').fontSize(fontSize);
    const h = Math.max(...columns.map((c, i) => doc.heightOfString(c.label, { width: widths[i] - pad * 2 }))) + pad * 2;
    doc.save().rect(left, doc.y, width, h).fill(BRAND.burgundy).restore();
    let x = left;
    const y = doc.y;
    columns.forEach((c, i) => {
      doc.fillColor('#FFFFFF').text(c.label, x + pad, y + pad, { width: widths[i] - pad * 2 });
      x += widths[i];
    });
    doc.y = y + h;
  };

  drawHeader();
  doc.font('Helvetica').fontSize(fontSize);
  rows.forEach((row, ri) => {
    const values = columns.map((c) => cell(c, row));
    const h = Math.max(...values.map((v, i) => doc.heightOfString(v || ' ', { width: widths[i] - pad * 2 }))) + pad * 2;
    if (doc.y + h > doc.page.height - doc.page.margins.bottom - 20) {
      doc.addPage();
      brandHeader(doc, { title, subtitle });
      drawHeader();
      doc.font('Helvetica').fontSize(fontSize);
    }
    const y = doc.y;
    if (ri % 2 === 1) doc.save().rect(left, y, width, h).fill(BRAND.blush).restore();
    let x = left;
    values.forEach((v, i) => {
      doc.fillColor(BRAND.ink).text(v, x + pad, y + pad, { width: widths[i] - pad * 2 });
      x += widths[i];
    });
    doc.save().moveTo(left, y + h).lineTo(left + width, y + h).lineWidth(0.4).strokeColor('#E8D5DC').stroke().restore();
    doc.y = y + h;
  });

  if (!rows.length) doc.fillColor(BRAND.muted).fontSize(11).text('No records selected.', left, doc.y + 20);
  pageFooters(doc);
  doc.end();
  return done;
}

/** Resolves a stored photo reference to a local file pdfkit can embed. */
function localPhoto(ref, uploadsRoot) {
  if (!ref || /^https?:\/\//.test(ref)) return null;
  const candidates = ref.startsWith('/uploads/')
    ? [path.join(uploadsRoot, ref.replace('/uploads/', ''))]
    : [path.join(WEB_PUBLIC, ref.replace(/^\//, ''))];
  const file = candidates.find((f) => {
    const resolved = path.resolve(f);
    return (resolved.startsWith(path.resolve(uploadsRoot)) || resolved.startsWith(WEB_PUBLIC)) && fs.existsSync(resolved);
  });
  // pdfkit embeds JPEG and PNG only.
  return file && /\.(jpe?g|png)$/i.test(file) ? file : null;
}

/** Portrait "biodata sheet" — one person per page, like a printed biodata. */
async function pdfSheets(rows, columns, { title, nameOf, photoOf, uploadsRoot }) {
  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
  const done = collect(doc);
  const left = doc.page.margins.left;
  const width = doc.page.width - left - doc.page.margins.right;

  rows.forEach((row, index) => {
    if (index > 0) doc.addPage();
    brandHeader(doc, { title, subtitle: `Biodata ${index + 1} of ${rows.length}` });

    const photo = localPhoto(photoOf(row), uploadsRoot);
    const nameTop = doc.y + 4;
    const textWidth = photo ? width - 120 : width;
    doc.fillColor(BRAND.burgundy).font('Helvetica-Bold').fontSize(20).text(nameOf(row) || '—', left, nameTop, { width: textWidth });
    doc.moveDown(0.2);
    if (fs.existsSync(LOGO_MARK)) {
      doc.image(LOGO_MARK, left, doc.y + 2, { width: 14 });
      doc.fillColor(BRAND.muted).font('Helvetica').fontSize(9).text('Matrimonial Biodata', left + 18, doc.y + 3);
    }
    if (photo) {
      try {
        doc.save().roundedRect(left + width - 108, nameTop - 4, 108, 128, 8).clip();
        doc.image(photo, left + width - 108, nameTop - 4, { cover: [108, 128], align: 'center', valign: 'center' });
        doc.restore();
      } catch {
        doc.restore();
      }
    }
    doc.y = Math.max(doc.y + 16, photo ? nameTop + 136 : 0);

    const labelW = 150;
    columns.forEach((c, i) => {
      const v = cell(c, row);
      doc.font('Helvetica').fontSize(10);
      const h = Math.max(18, doc.heightOfString(v || '—', { width: width - labelW - 12 }) + 8);
      if (doc.y + h > doc.page.height - doc.page.margins.bottom - 20) {
        doc.addPage();
        brandHeader(doc, { title, subtitle: `${nameOf(row)} (continued)` });
      }
      const y = doc.y;
      if (i % 2 === 0) doc.save().rect(left, y, width, h).fill(BRAND.blush).restore();
      doc.fillColor(BRAND.muted).font('Helvetica-Bold').fontSize(9).text(c.label.toUpperCase(), left + 8, y + 5, { width: labelW - 8 });
      doc.fillColor(BRAND.ink).font('Helvetica').fontSize(10).text(v || '—', left + labelW, y + 4, { width: width - labelW - 12 });
      doc.y = y + h;
    });
  });

  if (!rows.length) {
    brandHeader(doc, { title });
    doc.fillColor(BRAND.muted).fontSize(11).text('No records selected.');
  }
  pageFooters(doc);
  doc.end();
  return done;
}

export async function toPdf(rows, columns, opts) {
  return opts.layout === 'sheets' ? pdfSheets(rows, columns, opts) : pdfTable(rows, columns, opts);
}
