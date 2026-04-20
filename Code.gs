// ============================================================
// Presenter Availability System — Google Apps Script Backend
// Paste this entire file into your Apps Script editor
// ============================================================

const SHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const params = e.parameter || {};
  const postData = e.postData ? JSON.parse(e.postData.contents || '{}') : {};
  const data = Object.assign({}, params, postData);
  const action = data.action;

  try {
    let result;
    switch (action) {
      case 'getPresenters':     result = getPresenters(); break;
      case 'savePresenter':     result = savePresenter(data); break;
      case 'updatePresenter':   result = updatePresenter(data); break;
      case 'deletePresenter':   result = deletePresenter(data); break;
      case 'getAvailability':   result = getAvailability(data); break;
      case 'getAllAvailability': result = getAllAvailability(); break;
      case 'upsertAvailability': result = upsertAvailability(data); break;
      case 'getBrands':         result = getBrands(); break;
      case 'saveBrand':         result = saveBrand(data); break;
      case 'deleteBrand':       result = deleteBrand(data); break;
      case 'initData':          result = initData(data); break;
      default: result = { error: 'Unknown action: ' + action };
    }
    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

function jsonResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ── Sheet helpers ─────────────────────────────────────────
function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  }).filter(r => r.Id || r.id); // skip empty rows
}

function nextId(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return 1;
  const ids = data.slice(1).map(r => Number(r[0])).filter(n => !isNaN(n) && n > 0);
  return ids.length > 0 ? Math.max(...ids) + 1 : 1;
}

// ── Presenters ────────────────────────────────────────────
function getPresenters() {
  const sheet = getSheet('Presenters');
  const rows = sheetToObjects(sheet);
  return rows.map(r => ({
    id: r.Id, name: r.Name, pin: r.Pin,
    brands: r.Brands ? r.Brands.split('|').filter(Boolean) : [],
    updatedAt: r.UpdatedAt || ''
  }));
}

function savePresenter(data) {
  const sheet = getSheet('Presenters');
  // Ensure headers
  const headers = sheet.getRange(1,1,1,5).getValues()[0];
  if (!headers[0]) sheet.getRange(1,1,1,5).setValues([['Id','Name','Pin','Brands','UpdatedAt']]);
  
  const id = nextId(sheet);
  const brands = Array.isArray(data.brands) ? data.brands.join('|') : (data.brands || '');
  sheet.appendRow([id, data.name, data.pin, brands, new Date().toISOString()]);
  return { success: true, id };
}

function updatePresenter(data) {
  const sheet = getSheet('Presenters');
  const allData = sheet.getDataRange().getValues();
  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][0]) === String(data.id)) {
      if (data.name !== undefined) sheet.getRange(i+1, 2).setValue(data.name);
      if (data.pin !== undefined) sheet.getRange(i+1, 3).setValue(data.pin);
      if (data.brands !== undefined) {
        const brands = Array.isArray(data.brands) ? data.brands.join('|') : data.brands;
        sheet.getRange(i+1, 4).setValue(brands);
      }
      sheet.getRange(i+1, 5).setValue(new Date().toISOString());
      return { success: true };
    }
  }
  return { error: 'Presenter not found' };
}

function deletePresenter(data) {
  const sheet = getSheet('Presenters');
  const allData = sheet.getDataRange().getValues();
  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][0]) === String(data.id)) {
      sheet.deleteRow(i+1);
      return { success: true };
    }
  }
  return { error: 'Not found' };
}

// ── Availability ──────────────────────────────────────────
function getAvailability(data) {
  const sheet = getSheet('Availability');
  const rows = sheetToObjects(sheet);
  return rows
    .filter(r => !data.presenterId || String(r.PresenterId) === String(data.presenterId))
    .map(r => ({
      id: r.Id, presenterId: r.PresenterId, presenterName: r.PresenterName,
      date: r.Date, slots: r.Slots ? JSON.parse(r.Slots) : [], note: r.Note || '',
      updatedAt: r.UpdatedAt || ''
    }));
}

function getAllAvailability() {
  const sheet = getSheet('Availability');
  const rows = sheetToObjects(sheet);
  return rows.map(r => ({
    id: r.Id, presenterId: r.PresenterId, presenterName: r.PresenterName,
    date: r.Date, slots: r.Slots ? JSON.parse(r.Slots) : [], note: r.Note || '',
    updatedAt: r.UpdatedAt || ''
  }));
}

function upsertAvailability(data) {
  const sheet = getSheet('Availability');
  // Ensure headers
  const headers = sheet.getRange(1,1,1,7).getValues()[0];
  if (!headers[0]) sheet.getRange(1,1,1,7).setValues([['Id','PresenterId','PresenterName','Date','Slots','Note','UpdatedAt']]);
  
  const slots = Array.isArray(data.slots) ? data.slots : JSON.parse(data.slots || '[]');
  const slotsStr = JSON.stringify(slots);
  const allData = sheet.getDataRange().getValues();
  
  // Find existing row for this presenter+date
  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][1]) === String(data.presenterId) && allData[i][3] === data.date) {
      if (slots.length === 0) {
        sheet.deleteRow(i+1);
        return { success: true, deleted: true };
      }
      sheet.getRange(i+1, 5).setValue(slotsStr);
      sheet.getRange(i+1, 6).setValue(data.note || '');
      sheet.getRange(i+1, 7).setValue(new Date().toISOString());
      return { success: true, updated: true };
    }
  }
  
  if (slots.length === 0) return { success: true, skipped: true };
  const id = nextId(sheet);
  sheet.appendRow([id, data.presenterId, data.presenterName, data.date, slotsStr, data.note || '', new Date().toISOString()]);
  return { success: true, created: true, id };
}

// ── Brands ────────────────────────────────────────────────
function getBrands() {
  const sheet = getSheet('Brands');
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  return data.slice(1).map(r => r[0]).filter(Boolean).sort();
}

function saveBrand(data) {
  const sheet = getSheet('Brands');
  const headers = sheet.getRange(1,1,1,1).getValues()[0];
  if (!headers[0]) sheet.getRange(1,1).setValue('Name');
  
  // Check duplicate
  const existing = getBrands();
  if (existing.includes(data.name)) return { error: 'Brand already exists' };
  sheet.appendRow([data.name]);
  return { success: true };
}

function deleteBrand(data) {
  const sheet = getSheet('Brands');
  const allData = sheet.getDataRange().getValues();
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][0] === data.name) {
      sheet.deleteRow(i+1);
      return { success: true };
    }
  }
  return { error: 'Brand not found' };
}

// ── Init data (run once to seed presenters) ───────────────
function initData(data) {
  const presenters = data.presenters;
  if (!presenters) return { error: 'No presenters provided' };
  
  const sheet = getSheet('Presenters');
  sheet.clearContents();
  sheet.getRange(1,1,1,5).setValues([['Id','Name','Pin','Brands','UpdatedAt']]);
  
  const rows = presenters.map(p => [
    p.id, p.name, p.pin,
    Array.isArray(p.brands) ? p.brands.join('|') : (p.brands || ''),
    new Date().toISOString()
  ]);
  if (rows.length > 0) sheet.getRange(2, 1, rows.length, 5).setValues(rows);

  // Init Brands sheet with unique brands
  const brandsSheet = getSheet('Brands');
  brandsSheet.clearContents();
  brandsSheet.getRange(1,1).setValue('Name');
  const allBrands = new Set();
  presenters.forEach(p => {
    (Array.isArray(p.brands) ? p.brands : []).forEach(b => { if(b) allBrands.add(b); });
  });
  const brandRows = [...allBrands].sort().map(b => [b]);
  if (brandRows.length > 0) brandsSheet.getRange(2, 1, brandRows.length, 1).setValues(brandRows);

  // Init Availability sheet headers
  const avSheet = getSheet('Availability');
  avSheet.clearContents();
  avSheet.getRange(1,1,1,7).setValues([['Id','PresenterId','PresenterName','Date','Slots','Note','UpdatedAt']]);

  return { success: true, presenters: rows.length, brands: allBrands.size };
}
