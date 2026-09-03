const CONFIG = {
  spreadsheetId: '1q12w3YJ1CaEaJJEWq54y4Q-NLvuqc5qZ1SbVV8sFZh0',
  sheetName: 'Klienti',
  partnerSheetName: 'Akteri_site',
  performanceSheetName: 'Vykony_KA1',
  meetingSheetName: 'Case_management_zapisy',
  networkMeetingSheetName: 'Schuzky_site',
  educationSheetName: 'Vzdelavani',
  supervisionSheetName: 'Supervize',
  statisticsSheetName: 'Statistiky',
  individualPlanSheetName: 'Individualni_plany',
  headerRow: 1,
  clientFoldersRootId: '1ZmYVNPm_ckRLCgWxpU2LXDkAYK1pM9ZX',
  deletedClientsArchiveName: 'SMAZANI KLIENTI - ARCHIV',
  clientFoldersRootName: 'Klientské složky - Moravský Beroun',
  backupFolderId: '',
  backupFolderName: 'Zálohy - Moravský Beroun',
  backupRetentionCount: 12,
  monitoringTemplateFileId: '1xCGjTEJX0mo1aqXjGZqVBVEBxv2whubZqJ1-_jBk1w4',
  projectName: 'Podpora sociální práce v Moravském Berouně II',
  projectCode: 'CZ.03.02.01/00/25_106/0006125',
  beneficiaryName: 'Město Moravský Beroun',
  timeZone: 'Europe/Prague'
};

const READ_CACHE_VERSION_ = 'read-v2-gzip';
const SPREADSHEET_ID_PROPERTY_ = 'SPREADSHEET_ID';
const READ_CACHE_ENCODING_ = 'gzip-base64url-v1';
const READ_CACHE_TTL_SECONDS_ = 21600;
const READ_CACHE_CHUNK_SIZE_ = 85000;
const READ_CACHE_MAX_CHUNKS_ = 40;
const BOOTSTRAP_FAST_READ_ACTIONS_ = [
  'listClients', 'listPerformances', 'listMeetings', 'listPartners'
];
const BOOTSTRAP_AUXILIARY_READ_ACTIONS_ = [
  'listNetworkMeetings', 'listEducation', 'listSupervision', 'listStatistics'
];
const RECORD_DOCUMENT_QUEUE_PROPERTY_ = 'record-document-queue-v1';
const RECORD_DOCUMENT_STATUS_PROPERTY_ = 'record-document-status-v1';
const RECORD_DOCUMENT_TRIGGER_HANDLER_ = 'runQueuedRecordDocuments';
const RECORD_DOCUMENT_MAX_ATTEMPTS_ = 3;
const RECORD_DOCUMENT_BATCH_SIZE_ = 4;
const CLIENT_MUTATION_RESULT_PREFIX_ = 'client-mutation-v1:';
const CLIENT_MUTATION_RESULT_TTL_MS_ = 24 * 60 * 60 * 1000;
const CLIENT_MUTATION_PROCESSING_TTL_MS_ = 10 * 60 * 1000;
const DRIVE_AUDIT_SHEET_NAME_ = 'Audit_Drive';
const DRIVE_REPAIR_LOG_SHEET_NAME_ = 'Drive_Repair_Log';
const DRIVE_REPAIR_BACKUP_MAX_AGE_MS_ = 24 * 60 * 60 * 1000;
const DRIVE_AUDIT_HEADERS_ = [
  'zavaznost', 'kod', 'typ_objektu', 'objekt_id', 'klient_id',
  'doporuceny_postup', 'referencni_url', 'nalezene_url', 'podrobnosti'
];
const MUTATION_READ_ACTIONS_ = {
  saveClient: ['listClients'],
  deleteClient: ['listClients', 'listIndividualPlans', 'listPerformances', 'listMeetings', 'listStatistics'],
  updateClientKeyWorker: ['listClients'],
  ensureClientFolder: ['listClients'],
  savePartner: ['listPartners'],
  deletePartner: ['listPartners'],
  saveIndividualPlan: ['listIndividualPlans'],
  deleteIndividualPlan: ['listIndividualPlans'],
  savePerformance: ['listPerformances', 'listStatistics'],
  deletePerformance: ['listPerformances', 'listStatistics'],
  saveMeeting: ['listMeetings'],
  deleteMeeting: ['listMeetings'],
  saveNetworkMeeting: ['listNetworkMeetings'],
  deleteNetworkMeeting: ['listNetworkMeetings'],
  saveEducation: ['listEducation'],
  deleteEducation: ['listEducation'],
  saveSupervision: ['listSupervision'],
  deleteSupervision: ['listSupervision'],
  retryRecordDocument: ['listPerformances', 'listMeetings']
};
const IDEMPOTENT_MUTATION_ACTIONS_ = new Set([
  'saveClient', 'deleteClient', 'updateClientKeyWorker',
  'savePartner', 'deletePartner',
  'saveIndividualPlan', 'deleteIndividualPlan',
  'savePerformance', 'deletePerformance',
  'saveMeeting', 'deleteMeeting',
  'saveNetworkMeeting', 'deleteNetworkMeeting',
  'saveEducation', 'deleteEducation',
  'saveSupervision', 'deleteSupervision'
]);
const MUTATION_ENTITY_CONFIG_ = {
  updateClientKeyWorker: { sheetName: CONFIG.sheetName, idHeader: 'klient_id', responseKey: 'client' },
  savePartner: { sheetName: CONFIG.partnerSheetName, idHeader: 'partner_id', responseKey: 'partner' },
  deletePartner: { sheetName: CONFIG.partnerSheetName, idHeader: 'partner_id', deleted: true },
  saveIndividualPlan: { sheetName: CONFIG.individualPlanSheetName, idHeader: 'plan_id', responseKey: 'individualPlan' },
  deleteIndividualPlan: { sheetName: CONFIG.individualPlanSheetName, idHeader: 'plan_id', deleted: true },
  savePerformance: { sheetName: CONFIG.performanceSheetName, idHeader: 'vykon_id', responseKey: 'performance' },
  deletePerformance: { sheetName: CONFIG.performanceSheetName, idHeader: 'vykon_id', deleted: true },
  saveMeeting: { sheetName: CONFIG.meetingSheetName, idHeader: 'meeting_id', responseKey: 'meeting' },
  deleteMeeting: { sheetName: CONFIG.meetingSheetName, idHeader: 'meeting_id', deleted: true },
  saveNetworkMeeting: { sheetName: CONFIG.networkMeetingSheetName, idHeader: 'schuzka_site_id', responseKey: 'networkMeeting' },
  deleteNetworkMeeting: { sheetName: CONFIG.networkMeetingSheetName, idHeader: 'schuzka_site_id', deleted: true },
  saveEducation: { sheetName: CONFIG.educationSheetName, idHeader: 'vzdelavani_id', responseKey: 'education' },
  deleteEducation: { sheetName: CONFIG.educationSheetName, idHeader: 'vzdelavani_id', deleted: true },
  saveSupervision: { sheetName: CONFIG.supervisionSheetName, idHeader: 'sepervize_id', responseKey: 'supervision' },
  deleteSupervision: { sheetName: CONFIG.supervisionSheetName, idHeader: 'sepervize_id', deleted: true }
};
const SHEET_READ_ACTIONS_ = {};
SHEET_READ_ACTIONS_[CONFIG.sheetName] = ['listClients'];
SHEET_READ_ACTIONS_[CONFIG.partnerSheetName] = ['listPartners'];
SHEET_READ_ACTIONS_[CONFIG.individualPlanSheetName] = ['listIndividualPlans'];
SHEET_READ_ACTIONS_[CONFIG.performanceSheetName] = ['listPerformances', 'listStatistics'];
SHEET_READ_ACTIONS_[CONFIG.meetingSheetName] = ['listMeetings'];
SHEET_READ_ACTIONS_[CONFIG.networkMeetingSheetName] = ['listNetworkMeetings'];
SHEET_READ_ACTIONS_[CONFIG.educationSheetName] = ['listEducation'];
SHEET_READ_ACTIONS_[CONFIG.supervisionSheetName] = ['listSupervision'];
SHEET_READ_ACTIONS_[CONFIG.statisticsSheetName] = ['listStatistics'];

function normalizeClientMutationRequestId_(value) {
  const requestId = String(value || '').trim();
  return /^[A-Za-z0-9_-]{16,128}$/.test(requestId) ? requestId : '';
}

function clientMutationPropertyKey_(requestId) {
  return CLIENT_MUTATION_RESULT_PREFIX_ + requestId;
}

function cleanupClientMutationResults_(properties, nowMs) {
  const allProperties = properties.getProperties();
  Object.keys(allProperties).forEach(function(key) {
    if (key.indexOf(CLIENT_MUTATION_RESULT_PREFIX_) !== 0) return;
    try {
      const stored = JSON.parse(allProperties[key] || '{}');
      const completedAtMs = Date.parse(stored.completed_at || '');
      const maxAgeMs = stored.state === 'processing'
        ? CLIENT_MUTATION_PROCESSING_TTL_MS_
        : CLIENT_MUTATION_RESULT_TTL_MS_;
      if (!completedAtMs || nowMs - completedAtMs > maxAgeMs) {
        properties.deleteProperty(key);
      }
    } catch (error) {
      properties.deleteProperty(key);
    }
  });
}

function readStoredClientMutationResult_(requestId) {
  const normalizedRequestId = normalizeClientMutationRequestId_(requestId);
  if (!normalizedRequestId) return null;
  const properties = PropertiesService.getScriptProperties();
  const key = clientMutationPropertyKey_(normalizedRequestId);
  const raw = properties.getProperty(key);
  if (!raw) return null;
  try {
    const stored = JSON.parse(raw);
    const completedAtMs = Date.parse(stored.completed_at || '');
    const maxAgeMs = stored.state === 'processing'
      ? CLIENT_MUTATION_PROCESSING_TTL_MS_
      : CLIENT_MUTATION_RESULT_TTL_MS_;
    if (!completedAtMs || Date.now() - completedAtMs > maxAgeMs) {
      properties.deleteProperty(key);
      return null;
    }
    return stored;
  } catch (error) {
    properties.deleteProperty(key);
    return null;
  }
}

function storeClientMutationResult_(requestId, action, result) {
  const normalizedRequestId = normalizeClientMutationRequestId_(requestId);
  if (!normalizedRequestId || !isIdempotentMutationAction_(action)) return;
  const properties = PropertiesService.getScriptProperties();
  const now = new Date();
  cleanupClientMutationResults_(properties, now.getTime());
  const existing = readStoredClientMutationResult_(normalizedRequestId);
  properties.setProperty(clientMutationPropertyKey_(normalizedRequestId), JSON.stringify(Object.assign({
    request_id: normalizedRequestId,
    action: action,
    state: 'completed',
    fingerprint: existing && existing.fingerprint || '',
    completed_at: now.toISOString()
  }, result || {})));
}

function startClientMutation_(requestId, action, fingerprint) {
  const normalizedRequestId = normalizeClientMutationRequestId_(requestId);
  if (!normalizedRequestId || !isIdempotentMutationAction_(action)) return null;
  const existing = readStoredClientMutationResult_(normalizedRequestId);
  if (existing) return existing;
  const properties = PropertiesService.getScriptProperties();
  const now = new Date();
  cleanupClientMutationResults_(properties, now.getTime());
  properties.setProperty(clientMutationPropertyKey_(normalizedRequestId), JSON.stringify({
    request_id: normalizedRequestId,
    action: action,
    state: 'processing',
    fingerprint: String(fingerprint || ''),
    completed_at: now.toISOString()
  }));
  return null;
}

function storeClientDeletionProgress_(requestId, clientId, progress) {
  const normalizedRequestId = normalizeClientMutationRequestId_(requestId);
  if (!normalizedRequestId) return;
  const existing = readStoredClientMutationResult_(normalizedRequestId);
  if (existing && existing.action && existing.action !== 'deleteClient') return;
  const safeProgress = progress || {};
  const retryPending = safeProgress.phase === 'retry_pending';
  const properties = PropertiesService.getScriptProperties();
  properties.setProperty(clientMutationPropertyKey_(normalizedRequestId), JSON.stringify({
    request_id: normalizedRequestId,
    action: 'deleteClient',
    state: 'processing',
    fingerprint: existing && existing.fingerprint || '',
    klient_id: String(clientId || existing && existing.klient_id || ''),
    phase: String(retryPending
      ? existing && existing.phase || 'retry_pending'
      : safeProgress.phase || existing && existing.phase || 'processing'),
    retry_pending: retryPending,
    code: String(safeProgress.code || ''),
    completed_at: new Date().toISOString()
  }));
}

function storeClientMutationFailure_(requestId, action, error) {
  const normalizedRequestId = normalizeClientMutationRequestId_(requestId);
  if (!normalizedRequestId || !isIdempotentMutationAction_(action)) return;
  const existing = readStoredClientMutationResult_(normalizedRequestId);
  if (existing && existing.action !== action) return;
  if (existing && existing.state === 'completed') return;
  const properties = PropertiesService.getScriptProperties();
  const now = new Date();
  cleanupClientMutationResults_(properties, now.getTime());
  properties.setProperty(clientMutationPropertyKey_(normalizedRequestId), JSON.stringify({
    request_id: normalizedRequestId,
    action: action,
    state: 'failed',
    fingerprint: existing && existing.fingerprint || '',
    code: error && error.code ? String(error.code) : '',
    error: action === 'saveClient'
      ? 'Zalozeni klienta selhalo.'
      : action === 'deleteClient'
        ? 'Smazani klienta selhalo.'
        : 'Datovou operaci se nepodarilo dokoncit.',
    completed_at: now.toISOString()
  }));
}

function findClientForMutationResult_(clientId) {
  const id = String(clientId || '').trim();
  if (!id) return null;
  const sheet = getSpreadsheet_().getSheetByName(CONFIG.sheetName);
  if (!sheet) return null;
  const headers = getHeaders_(sheet);
  const idColumn = headers.indexOf('klient_id') + 1;
  if (!idColumn) return null;
  const rows = findClientRows_(sheet, idColumn, id);
  if (rows.length !== 1) return null;
  return rowToObject_(headers, sheet.getRange(rows[0], 1, 1, headers.length).getValues()[0]);
}

function findMutationEntityForResult_(action, entityId) {
  const config = MUTATION_ENTITY_CONFIG_[action];
  const id = String(entityId || '').trim();
  if (!config || !id) return null;
  if (config.sheetName === CONFIG.sheetName && config.idHeader === 'klient_id') {
    return findClientForMutationResult_(id);
  }
  const sheet = getSpreadsheet_().getSheetByName(config.sheetName);
  if (!sheet) return null;
  const headers = getHeaders_(sheet);
  const idColumn = headers.indexOf(config.idHeader) + 1;
  if (!idColumn) return null;
  const row = findRowById_(sheet, idColumn, id);
  if (!row) return null;
  return rowToObject_(headers, sheet.getRange(row, 1, 1, headers.length).getValues()[0]);
}

function getClientMutationResult_(requestId) {
  const normalizedRequestId = normalizeClientMutationRequestId_(requestId);
  if (!normalizedRequestId) throw new Error('Missing or invalid request_id');
  const stored = readStoredClientMutationResult_(normalizedRequestId);
  if (!stored) return { request_id: normalizedRequestId, state: 'pending' };
  const result = Object.assign({}, stored);
  if (result.state === 'completed' && result.action === 'saveClient' && result.klient_id) {
    result.client = findClientForMutationResult_(result.klient_id);
    if (!result.client) {
      result.state = 'failed';
      result.code = 'NOT_FOUND';
      result.error = 'Ulozeny klient nebyl pri kontrole nalezen.';
    }
  }
  const entityConfig = MUTATION_ENTITY_CONFIG_[result.action];
  if (result.state === 'completed' && entityConfig && result.entity_id) {
    const entity = findMutationEntityForResult_(result.action, result.entity_id);
    const entityDeleted = entity && normalizeDuplicateText_(entity.status).startsWith('smaz');
    const valid = entityConfig.deleted ? entityDeleted : entity && !entityDeleted;
    if (!valid) {
      result.state = 'failed';
      result.code = 'NOT_FOUND';
      result.error = entityConfig.deleted
        ? 'Smazani zaznamu nebylo pri kontrole potvrzeno.'
        : 'Ulozeny zaznam nebyl pri kontrole nalezen.';
    } else if (entityConfig.responseKey) {
      result[entityConfig.responseKey] = entity;
    } else {
      result.deleted = true;
    }
  }
  return result;
}

function getMutationResult_(requestId) {
  return getClientMutationResult_(requestId);
}

function doGet(e) {
  try {
    assertToken_(e.parameter.token);
    if (e.parameter.action === 'bootstrap') {
      return json_(buildBootstrapPayload_());
    }
    if (e.parameter.action === 'bootstrapFast') {
      return json_(readCachedDataset_(
        'bootstrapFast',
        () => buildBootstrapPayload_(BOOTSTRAP_FAST_READ_ACTIONS_),
        (payload) => !payload.errors || payload.errors.length === 0
      ));
    }
    if (e.parameter.action === 'bootstrapCore') {
      return json_(readCachedDataset_(
        'bootstrapFast',
        () => buildBootstrapPayload_(BOOTSTRAP_FAST_READ_ACTIONS_),
        (payload) => !payload.errors || payload.errors.length === 0
      ));
    }
    if (e.parameter.action === 'bootstrapAuxiliary') {
      return json_(readCachedDataset_(
        'bootstrapAuxiliary',
        () => buildBootstrapPayload_(BOOTSTRAP_AUXILIARY_READ_ACTIONS_),
        (payload) => !payload.errors || payload.errors.length === 0
      ));
    }
    if (e.parameter.action === 'listClients') {
      return json_({ ok: true, clients: readCachedDataset_('listClients', () => listClients_()) });
    }
    if (e.parameter.action === 'verifyClientDeletion') {
      return json_({ ok: true, deletion: verifyClientDeletion_(e.parameter.klient_id) });
    }
    if (e.parameter.action === 'getClientMutationResult') {
      return json_({ ok: true, mutation: getClientMutationResult_(e.parameter.request_id) });
    }
    if (e.parameter.action === 'getMutationResult') {
      return json_({ ok: true, mutation: getMutationResult_(e.parameter.request_id) });
    }
    if (e.parameter.action === 'listClientDirectory') {
      const clients = readCachedDataset_('listClients', () => listClients_());
      return json_({ ok: true, clients: buildClientDirectory_(clients) });
    }
    if (e.parameter.action === 'listClientFolderFiles') {
      return json_({ ok: true, folder: listClientFolderFiles_(e.parameter.klient_id) });
    }
    if (e.parameter.action === 'getClientFolderFilePreview') {
      return json_({
        ok: true,
        preview: getClientFolderFilePreview_(e.parameter.klient_id, e.parameter.file_id)
      });
    }
    if (e.parameter.action === 'listPartners') {
      return json_({ ok: true, partners: readCachedDataset_('listPartners', () => listPartners_()) });
    }
    if (e.parameter.action === 'listIndividualPlans') {
      return json_({
        ok: true,
        individualPlans: readCachedDataset_('listIndividualPlans', () => listIndividualPlans_())
      });
    }
    if (e.parameter.action === 'listPerformances') {
      return json_({ ok: true, performances: readCachedDataset_('listPerformances', () => listPerformances_()) });
    }
    if (e.parameter.action === 'listMeetings') {
      return json_({ ok: true, meetings: readCachedDataset_('listMeetings', () => listMeetings_()) });
    }
    if (e.parameter.action === 'listNetworkMeetings') {
      return json_({ ok: true, networkMeetings: readCachedDataset_('listNetworkMeetings', () => listNetworkMeetings_()) });
    }
    if (e.parameter.action === 'listEducation') {
      return json_({ ok: true, education: readCachedDataset_('listEducation', () => listEducation_()) });
    }
    if (e.parameter.action === 'listSupervision') {
      return json_({ ok: true, supervision: readCachedDataset_('listSupervision', () => listSupervision_()) });
    }
    if (e.parameter.action === 'listStatistics') {
      return json_({ ok: true, statistics: readCachedDataset_('listStatistics', () => listStatistics_()) });
    }
    if (e.parameter.action === 'getBackupStatus') {
      return json_({ ok: true, backup: getBackupStatus_() });
    }
    if (e.parameter.action === 'getRecordDocumentStatus') {
      return json_({
        ok: true,
        document: getRecordDocumentStatus_(e.parameter.record_type, e.parameter.record_id)
      });
    }
    return json_({ ok: false, error: 'Unknown action' });
  } catch (error) {
    return json_({ ok: false, error: String(error.message || error) });
  }
}

function buildMutationReplayResponse_(requestId) {
  const mutation = getMutationResult_(requestId);
  if (mutation.state === 'failed') {
    return {
      ok: false,
      code: mutation.code || '',
      error: mutation.error || 'Datovou operaci se nepodarilo potvrdit.',
      mutation: mutation
    };
  }
  if (mutation.state !== 'completed') {
    return {
      ok: false,
      code: 'MUTATION_PENDING',
      error: 'Operace se stejnym request_id se stale overuje.',
      mutation: mutation
    };
  }

  const response = { ok: true, mutation: mutation, replayed: true };
  if (mutation.action === 'saveClient') response.client = mutation.client;
  if (mutation.action === 'deleteClient') response.deletion = mutation.deletion;
  const config = MUTATION_ENTITY_CONFIG_[mutation.action];
  if (config && config.responseKey) response[config.responseKey] = mutation[config.responseKey];
  return response;
}

function storeEntityMutationResult_(requestId, action, entityId) {
  storeClientMutationResult_(requestId, action, { entity_id: String(entityId || '') });
}

function doPost(e) {
  let lock = null;
  let lockAcquired = false;
  let requestedAction = '';
  let clientMutationRequestId = '';
  try {
    const payload = JSON.parse(e.postData.contents || '{}');
    assertToken_(payload.token);
    requestedAction = String(payload.action || '');
    clientMutationRequestId = normalizeClientMutationRequestId_(payload.request_id);
    lock = LockService.getScriptLock();
    lock.waitLock(30000);
    lockAcquired = true;

    if (clientMutationRequestId && isIdempotentMutationAction_(requestedAction)) {
      const fingerprint = mutationFingerprint_(payload);
      const existingMutation = startClientMutation_(clientMutationRequestId, requestedAction, fingerprint);
      if (existingMutation) {
        if (existingMutation.action !== requestedAction) {
          const error = new Error('request_id byl pouzit pro jinou operaci.');
          error.code = 'IDEMPOTENCY_KEY_REUSE';
          throw error;
        }
        if (existingMutation.fingerprint && existingMutation.fingerprint !== fingerprint) {
          const error = new Error('request_id byl pouzit s jinym obsahem.');
          error.code = 'IDEMPOTENCY_KEY_REUSE';
          throw error;
        }
        // Mazani klienta je saga nad nekolika listy a Diskem. Pokud predchozi
        // beh skoncil timeoutem mezi kroky, po ziskani globalniho zamku je
        // bezpecne pokracovat: jednotlive kroky jsou idempotentni.
        const resumableClientDeletion = requestedAction === 'deleteClient'
          && existingMutation.state === 'processing';
        if (!resumableClientDeletion) {
          return json_(buildMutationReplayResponse_(clientMutationRequestId));
        }
      }
    }

    if (payload.action === 'saveClient') {
      const client = saveClient_(payload.client || {});
      storeClientMutationResult_(clientMutationRequestId, requestedAction, { klient_id: String(client.klient_id || '') });
      return json_({ ok: true, client, request_id: clientMutationRequestId });
    }

    if (payload.action === 'deleteClient') {
      const deletion = deleteClient_(
        payload.client || {},
        payload.requested_by_name || payload.requested_by || '',
        function(progress) {
          storeClientDeletionProgress_(
            clientMutationRequestId,
            String(payload.client && payload.client.klient_id || ''),
            progress
          );
        }
      );
      storeClientMutationResult_(clientMutationRequestId, requestedAction, {
        klient_id: String(deletion.klient_id || payload.client && payload.client.klient_id || ''),
        deletion: {
          deleted: deletion.deleted === true,
          already_deleted: deletion.already_deleted === true,
          performances: Number(deletion.performances || 0),
          meetings: Number(deletion.meetings || 0),
          individual_plans: Number(deletion.individual_plans || 0)
        }
      });
      return json_({ ok: true, deletion, request_id: clientMutationRequestId });
    }

    if (payload.action === 'updateClientKeyWorker') {
      const client = updateClientKeyWorker_(payload.client || {});
      storeEntityMutationResult_(clientMutationRequestId, requestedAction, client.klient_id);
      return json_({ ok: true, client });
    }

    if (payload.action === 'savePartner') {
      const partner = savePartner_(payload.partner || {});
      storeEntityMutationResult_(clientMutationRequestId, requestedAction, partner.partner_id);
      return json_({ ok: true, partner });
    }

    if (payload.action === 'saveIndividualPlan') {
      const individualPlan = saveIndividualPlan_(payload.individualPlan || {});
      storeEntityMutationResult_(clientMutationRequestId, requestedAction, individualPlan.plan_id);
      return json_({ ok: true, individualPlan });
    }

    if (payload.action === 'deleteIndividualPlan') {
      deleteRecord_(CONFIG.individualPlanSheetName, 'plan_id', payload.id, payload.expected_updated_at, payload.updated_by);
      storeEntityMutationResult_(clientMutationRequestId, requestedAction, payload.id);
      return json_({ ok: true });
    }

    if (payload.action === 'savePerformance') {
      const performance = savePerformance_(payload.performance || {});
      storeEntityMutationResult_(clientMutationRequestId, requestedAction, performance.vykon_id);
      return json_({ ok: true, performance });
    }

    if (payload.action === 'saveMeeting') {
      const meeting = saveMeeting_(payload.meeting || {});
      storeEntityMutationResult_(clientMutationRequestId, requestedAction, meeting.meeting_id);
      return json_({ ok: true, meeting });
    }

    if (payload.action === 'deletePerformance') {
      deleteRecord_(CONFIG.performanceSheetName, 'vykon_id', payload.id, payload.expected_updated_at, payload.updated_by);
      deactivatePerformanceStatistics_(payload.id);
      cancelRecordDocument_('performance', payload.id);
      storeEntityMutationResult_(clientMutationRequestId, requestedAction, payload.id);
      return json_({ ok: true });
    }

    if (payload.action === 'deleteMeeting') {
      deleteRecord_(CONFIG.meetingSheetName, 'meeting_id', payload.id, payload.expected_updated_at, payload.updated_by);
      cancelRecordDocument_('meeting', payload.id);
      storeEntityMutationResult_(clientMutationRequestId, requestedAction, payload.id);
      return json_({ ok: true });
    }

    if (payload.action === 'deletePartner') {
      deleteRecord_(CONFIG.partnerSheetName, 'partner_id', payload.id, payload.expected_updated_at, payload.updated_by);
      storeEntityMutationResult_(clientMutationRequestId, requestedAction, payload.id);
      return json_({ ok: true });
    }

    if (payload.action === 'deleteNetworkMeeting') {
      deleteRecord_(CONFIG.networkMeetingSheetName, 'schuzka_site_id', payload.id, payload.expected_updated_at, payload.updated_by);
      storeEntityMutationResult_(clientMutationRequestId, requestedAction, payload.id);
      return json_({ ok: true });
    }

    if (payload.action === 'saveNetworkMeeting') {
      const networkMeeting = saveNetworkMeeting_(payload.networkMeeting || {});
      storeEntityMutationResult_(clientMutationRequestId, requestedAction, networkMeeting.schuzka_site_id);
      return json_({ ok: true, networkMeeting });
    }

    if (payload.action === 'saveEducation') {
      const education = saveEducation_(payload.education || {});
      storeEntityMutationResult_(clientMutationRequestId, requestedAction, education.vzdelavani_id);
      return json_({ ok: true, education });
    }

    if (payload.action === 'deleteEducation') {
      deleteRecord_(CONFIG.educationSheetName, 'vzdelavani_id', payload.id, payload.expected_updated_at, payload.updated_by);
      storeEntityMutationResult_(clientMutationRequestId, requestedAction, payload.id);
      return json_({ ok: true });
    }

    if (payload.action === 'saveSupervision') {
      const supervision = saveSupervision_(payload.supervision || {});
      storeEntityMutationResult_(clientMutationRequestId, requestedAction, supervision.sepervize_id);
      return json_({ ok: true, supervision });
    }

    if (payload.action === 'deleteSupervision') {
      deleteRecord_(CONFIG.supervisionSheetName, 'sepervize_id', payload.id, payload.expected_updated_at, payload.updated_by);
      storeEntityMutationResult_(clientMutationRequestId, requestedAction, payload.id);
      return json_({ ok: true });
    }

    if (payload.action === 'ensureClientFolder') {
      const client = ensureClientFolder_(payload.klient_id);
      return json_({ ok: true, client });
    }

    if (payload.action === 'retryRecordDocument') {
      const document = queueRecordDocument_(payload.record_type, payload.record_id, { resetAttempts: true });
      return json_({ ok: true, document });
    }

    if (payload.action === 'startFullBackup') {
      const requestedBy = payload.requested_by_name || payload.requested_by;
      assertBackupManager_(requestedBy);
      return json_({ ok: true, backup: queueFullBackup_(requestedBy || '') });
    }

    if (payload.action === 'installWeeklyBackup') {
      assertBackupManager_(payload.requested_by_name || payload.requested_by);
      return json_({ ok: true, backup: installWeeklyBackupTrigger_() });
    }

    return json_({ ok: false, error: 'Unknown action' });
  } catch (error) {
    console.error('doPost ' + (requestedAction || 'unknown') + ' failed: ' + String(error && (error.stack || error.message || error)));
    if (
      clientMutationRequestId
      && isIdempotentMutationAction_(requestedAction)
      && !lockAcquired
    ) {
      return json_({
        ok: false,
        code: 'MUTATION_PENDING',
        error: 'Operace klienta ceka na dokonceni predchoziho zapisu. Zkuste stejny pozadavek znovu.',
        request_id: clientMutationRequestId
      });
    }
    try {
      if (requestedAction === 'deleteClient' && clientMutationRequestId) {
        storeClientDeletionProgress_(
          clientMutationRequestId,
          '',
          { phase: 'retry_pending', code: error && error.code ? String(error.code) : '' }
        );
      } else {
        storeClientMutationFailure_(clientMutationRequestId, requestedAction, error);
      }
    } catch (mutationTrackingError) {
      console.error('doPost mutation tracking failed: ' + String(mutationTrackingError.message || mutationTrackingError));
    }
    return json_({ ok: false, code: error && error.code ? String(error.code) : '', error: String(error.message || error) });
  } finally {
    try {
      if (requestedAction) invalidateReadActions_(MUTATION_READ_ACTIONS_[requestedAction] || []);
    } catch (invalidationError) {
      console.error('doPost cache invalidation failed: ' + String(invalidationError.message || invalidationError));
    }
    try {
      if (lockAcquired && lock) lock.releaseLock();
    } catch (lockError) {
      console.error('doPost lock release failed: ' + String(lockError.message || lockError));
    }
  }
}

function authorizeOnce() {
  authorizeBackupTriggers();
  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  spreadsheet.getName();
  configureWriteSheetFormats_(spreadsheet);
  if (CONFIG.monitoringTemplateFileId) DriveApp.getFileById(CONFIG.monitoringTemplateFileId).getName();
  const parent = getClientFolderParent_();
  const testFolder = parent.createFolder('__opravneni_test__');
  const testFile = SpreadsheetApp.create('__opravneni_test_mon_list__');
  DriveApp.getFileById(testFile.getId()).moveTo(testFolder);
  testFolder.setTrashed(true);
  const testDoc = DocumentApp.create('__opravneni_test_zapis__');
  DriveApp.getFileById(testDoc.getId()).setTrashed(true);
  UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + CONFIG.spreadsheetId + '?fields=id', {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  });
}

// Spusťte jednou ručně v editoru Apps Scriptu po přidání zálohování.
// Google následně zobrazí dialog pro oprávnění ke správě časových triggerů.
function authorizeBackupTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  Logger.log('Oprávnění pro automatické zálohy je aktivní. Počet triggerů: ' + triggers.length);
  return triggers.length;
}

function getSpreadsheet_() {
  const spreadsheetId = String(
    PropertiesService.getScriptProperties().getProperty(SPREADSHEET_ID_PROPERTY_)
      || CONFIG.spreadsheetId
      || ''
  ).trim();
  return spreadsheetId
    ? SpreadsheetApp.openById(spreadsheetId)
    : SpreadsheetApp.getActive();
}

// Bezpecny audit klientskych slozek a dokumentu. Funkce pouze cte zdrojove
// listy a Google Drive; vysledek zapisuje do pomocneho listu Audit_Drive.
// Zadny soubor ani slozku nemaze, nepresouva ani neprejmenovava.
function auditDriveConsistency() {
  const spreadsheet = getSpreadsheet_();
  const clients = readDriveAuditRows_(spreadsheet, CONFIG.sheetName)
    .filter(function(client) { return !isDriveAuditDeleted_(client.status); });
  const performances = readDriveAuditRows_(spreadsheet, CONFIG.performanceSheetName);
  const meetings = readDriveAuditRows_(spreadsheet, CONFIG.meetingSheetName);
  const records = buildDriveAuditRecords_(performances, meetings);
  const inventory = collectDriveAuditInventory_(clients, records);
  const report = analyzeDriveConsistency_(clients, records, inventory);
  writeDriveAuditReport_(spreadsheet, report);
  Logger.log(JSON.stringify(report.summary, null, 2));
  return report.summary;
}

function readDriveAuditRows_(spreadsheet, sheetName) {
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) return [];
  const headers = getHeaders_(sheet);
  const rowCount = Math.max(sheet.getLastRow() - CONFIG.headerRow, 0);
  if (!headers.length || !rowCount) return [];
  return sheet
    .getRange(CONFIG.headerRow + 1, 1, rowCount, headers.length)
    .getValues()
    .map(function(row) { return rowToObject_(headers, row); });
}

function buildDriveAuditRecords_(performances, meetings) {
  const records = [];
  (performances || []).forEach(function(record) {
    const id = String(record.vykon_id || '').trim();
    if (!id) return;
    records.push(Object.assign({}, record, {
      entity_type: 'vykon',
      record_id: id
    }));
  });
  (meetings || []).forEach(function(record) {
    const id = String(record.meeting_id || '').trim();
    if (!id) return;
    records.push(Object.assign({}, record, {
      entity_type: 'case_management',
      record_id: id
    }));
  });
  return records;
}

function collectDriveAuditInventory_(clients, records) {
  const root = getClientFolderParent_();
  const rootId = root.getId();
  const foldersById = {};
  const filesById = {};
  const folderAccess = {};
  const fileAccess = {};
  const folderErrors = {};
  const fileErrors = {};

  function rememberFile(file, parentId) {
    const id = file.getId();
    if (!filesById[id]) {
      filesById[id] = {
        id,
        url: file.getUrl(),
        name: file.getName(),
        mime_type: file.getMimeType(),
        parent_ids: []
      };
    }
    if (parentId && filesById[id].parent_ids.indexOf(parentId) === -1) {
      filesById[id].parent_ids.push(parentId);
    }
    fileAccess[id] = true;
    return filesById[id];
  }

  function rememberFolder(folder, isDirectRootChild) {
    const id = folder.getId();
    if (!foldersById[id]) {
      foldersById[id] = {
        id,
        url: folder.getUrl(),
        name: folder.getName(),
        parent_ids: getDriveParentIds_(folder),
        direct_root_child: Boolean(isDirectRootChild)
      };
    } else if (isDirectRootChild) {
      foldersById[id].direct_root_child = true;
    }
    folderAccess[id] = true;

    if (!foldersById[id].files_scanned) {
      foldersById[id].files_scanned = true;
      try {
        const files = folder.getFiles();
        while (files.hasNext()) rememberFile(files.next(), id);
      } catch (error) {
        foldersById[id].scan_error = String(error.message || error);
      }
    }
    return foldersById[id];
  }

  const rootFolders = root.getFolders();
  while (rootFolders.hasNext()) rememberFolder(rootFolders.next(), true);

  (clients || []).forEach(function(client) {
    const id = extractDriveId_(client.drive_folder_url);
    if (!id || foldersById[id] || folderAccess[id] === false) return;
    try {
      rememberFolder(DriveApp.getFolderById(id), false);
    } catch (error) {
      folderAccess[id] = false;
      folderErrors[id] = String(error.message || error);
    }
  });

  (records || []).forEach(function(record) {
    const id = extractDriveId_(record.document_url);
    if (!id || filesById[id] || fileAccess[id] === false) return;
    try {
      const file = DriveApp.getFileById(id);
      const parentIds = getDriveParentIds_(file);
      rememberFile(file, '');
      filesById[id].parent_ids = parentIds;
    } catch (error) {
      fileAccess[id] = false;
      fileErrors[id] = String(error.message || error);
    }
  });

  return {
    root_folder_id: rootId,
    folders: Object.keys(foldersById).map(function(id) { return foldersById[id]; }),
    files: Object.keys(filesById).map(function(id) { return filesById[id]; }),
    folder_access: folderAccess,
    file_access: fileAccess,
    folder_errors: folderErrors,
    file_errors: fileErrors
  };
}

function getDriveParentIds_(item) {
  const ids = [];
  try {
    const parents = item.getParents();
    while (parents.hasNext()) ids.push(parents.next().getId());
  } catch (error) {
    return ids;
  }
  return ids;
}

function analyzeDriveConsistency_(clients, records, inventory) {
  const issues = [];
  const clientById = {};
  const recordById = {};
  const folderById = {};
  const fileById = {};
  const rootFoldersByClientId = {};
  const expectedRecords = [];

  function addIssue(severity, code, entityType, entityId, clientId, action, referenceUrl, foundUrl, details) {
    issues.push({
      severity,
      code,
      entity_type: entityType || '',
      entity_id: entityId || '',
      client_id: clientId || '',
      recommended_action: action || '',
      reference_url: referenceUrl || '',
      found_url: foundUrl || '',
      details: details || ''
    });
  }

  (clients || []).forEach(function(client) {
    const id = String(client.klient_id || '').trim();
    if (id && !isDriveAuditDeleted_(client.status)) clientById[id] = client;
  });
  (records || []).forEach(function(record) {
    const id = String(record.record_id || '').trim();
    if (id) recordById[id] = record;
    if (id && record.klient_id && String(record.dokument_text || '').trim() && !isDriveAuditDeleted_(record.status)) {
      expectedRecords.push(record);
    }
  });
  (inventory.folders || []).forEach(function(folder) { folderById[folder.id] = folder; });
  (inventory.files || []).forEach(function(file) { fileById[file.id] = file; });

  (inventory.folders || []).filter(function(folder) {
    return folder.direct_root_child;
  }).forEach(function(folder) {
    const detectedId = extractAuditEntityId_(folder.name, 'KLIENT');
    if (!detectedId || !clientById[detectedId]) {
      addIssue(
        'VAROVANI', 'CLIENT_FOLDER_ORPHAN', 'slozka_klienta', folder.id, detectedId,
        'Po rucni kontrole presunout do karanteny; zatim nemazat.', '', folder.url,
        'Slozka v korenove slozce nema odpovidajiciho klienta v listu Klienti. Nazev: ' + folder.name
      );
      return;
    }
    if (!folderMatchesClientIdentity_(folder.name, clientById[detectedId])) {
      addIssue(
        'CHYBA', 'CLIENT_FOLDER_NAME_MISMATCH', 'slozka_klienta', folder.id, detectedId,
        'Slozku nepouzivat automaticky. Vytvorit spravnou slozku podle ID a jmena klienta a tuto presunout do karanteny.',
        String(clientById[detectedId].drive_folder_url || ''), folder.url,
        'Slozka obsahuje spravne klient ID, ale neodpovida jmenu klienta v listu Klienti. Nazev: ' + folder.name
      );
      return;
    }
    rootFoldersByClientId[detectedId] = rootFoldersByClientId[detectedId] || [];
    rootFoldersByClientId[detectedId].push(folder);
  });

  Object.keys(clientById).forEach(function(clientId) {
    const client = clientById[clientId];
    const folderUrl = String(client.drive_folder_url || '').trim();
    const canonicalId = extractDriveId_(folderUrl);
    const candidates = rootFoldersByClientId[clientId] || [];

    if (!canonicalId) {
      addIssue(
        'CHYBA', 'CLIENT_FOLDER_LINK_MISSING', 'klient', clientId, clientId,
        candidates.length === 1
          ? 'Zapsat URL nalezene slozky ke klientovi.'
          : 'Vytvorit slozku funkci ensureClientFolder az po kontrole auditu.',
        '', candidates.length === 1 ? candidates[0].url : '',
        candidates.length ? 'Pocet slozek se shodnym klient ID: ' + candidates.length : 'Klient nema ulozeny odkaz na slozku.'
      );
    } else if (inventory.folder_access[canonicalId] === false || !folderById[canonicalId]) {
      addIssue(
        'CHYBA', 'CLIENT_FOLDER_UNAVAILABLE', 'klient', clientId, clientId,
        'Overit kos a opravneni. Novou slozku vytvorit az po vylouceni existujici kopie.',
        folderUrl, candidates.length === 1 ? candidates[0].url : '',
        inventory.folder_errors[canonicalId] || 'Slozku nelze otevrit.'
      );
    } else {
      const canonical = folderById[canonicalId];
      if (canonical.parent_ids.indexOf(inventory.root_folder_id) === -1) {
        addIssue(
          'VAROVANI', 'CLIENT_FOLDER_OUTSIDE_ROOT', 'klient', clientId, clientId,
          'Po kontrole presunout kanonickou slozku do korenove klientské slozky.',
          folderUrl, canonical.url, 'Kanonicka slozka neni primo v nastavenem koreni.'
        );
      }
      const detectedId = extractAuditEntityId_(canonical.name, 'KLIENT');
      if (detectedId && detectedId !== clientId) {
        addIssue(
          'CHYBA', 'CLIENT_FOLDER_ID_MISMATCH', 'klient', clientId, clientId,
          'Neupravovat automaticky; overit, komu slozka patri.', folderUrl, canonical.url,
          'Nazev odkazovane slozky obsahuje klient ID ' + detectedId + '.'
        );
      } else if (!folderMatchesClientIdentity_(canonical.name, client)) {
        addIssue(
          'CHYBA', 'CLIENT_FOLDER_NAME_MISMATCH', 'klient', clientId, clientId,
          'Vytvorit spravnou slozku podle ID a jmena klienta; propojene dokumenty presunout a tuto slozku dat do karanteny.',
          folderUrl, canonical.url,
          'Odkazovana slozka ma ID klienta, ale je pojmenovana po jine osobe. Nazev: ' + canonical.name
        );
      } else if (!clientFolderHasCanonicalLabel_(canonical.name, client)) {
        addIssue(
          'VAROVANI', 'CLIENT_FOLDER_LABEL_MISMATCH', 'klient', clientId, clientId,
          'Prejmenovat slozku na jednotny format Prijmeni Jmeno. ID ani odkaz slozky se nemeni.',
          folderUrl, canonical.url,
          'Aktualni nazev: ' + canonical.name + '. Ocekavany nazev: ' + buildClientFolderName_(client) + '.'
        );
      }
    }

    if (candidates.length > 1) {
      addIssue(
        'CHYBA', 'CLIENT_FOLDER_DUPLICATE', 'klient', clientId, clientId,
        'Ponechat slozku z drive_folder_url; ostatni po kontrole presunout do karanteny.',
        folderUrl, candidates.map(function(folder) { return folder.url; }).join('\n'),
        'Nalezeno klientskych slozek: ' + candidates.length
      );
    }
  });

  expectedRecords.forEach(function(record) {
    const recordId = String(record.record_id);
    const clientId = String(record.klient_id || '').trim();
    const documentUrl = String(record.document_url || '').trim();
    const documentId = extractDriveId_(documentUrl);
    const clientFolderId = extractDriveId_(clientById[clientId] && clientById[clientId].drive_folder_url);
    const candidates = (inventory.files || []).filter(function(file) {
      return auditNameContainsId_(file.name, recordId);
    });

    if (!clientById[clientId]) {
      addIssue(
        'CHYBA', 'RECORD_CLIENT_MISSING', record.entity_type, recordId, clientId,
        'Neopravovat dokument; nejprve obnovit nebo spravne priradit klienta.',
        documentUrl, '', 'Zaznam odkazuje na klienta, ktery neni v listu Klienti.'
      );
      return;
    }

    if (!documentId) {
      if (candidates.length === 1) {
        addIssue(
          'CHYBA', 'DOCUMENT_LINK_MISSING_RECOVERABLE', record.entity_type, recordId, clientId,
          'Po kontrole zapsat URL nalezeneho dokumentu do document_url.',
          '', candidates[0].url, 'Dokument existuje, ale zaznam na nej neodkazuje.'
        );
      } else {
        addIssue(
          'CHYBA', 'DOCUMENT_MISSING', record.entity_type, recordId, clientId,
          'Po kontrole znovu zaradit zaznam do fronty dokumentu.',
          '', candidates.map(function(file) { return file.url; }).join('\n'),
          candidates.length ? 'Odkaz chybi a nalezeno je vice moznych dokumentu.' : 'Odkaz i dokument chybi.'
        );
      }
    } else if (inventory.file_access[documentId] === false || !fileById[documentId]) {
      addIssue(
        'CHYBA', candidates.length ? 'DOCUMENT_LINK_STALE_RECOVERABLE' : 'DOCUMENT_MISSING',
        record.entity_type, recordId, clientId,
        candidates.length === 1
          ? 'Po kontrole nahradit nefunkcni odkaz URL nalezeneho dokumentu.'
          : 'Overit kos a opravneni; pote dokument znovu zaradit do fronty.',
        documentUrl, candidates.map(function(file) { return file.url; }).join('\n'),
        inventory.file_errors[documentId] || 'Dokument z odkazu nelze otevrit.'
      );
    } else {
      const canonicalFile = fileById[documentId];
      if (clientFolderId && canonicalFile.parent_ids.indexOf(clientFolderId) === -1) {
        addIssue(
          'VAROVANI', 'DOCUMENT_WRONG_FOLDER', record.entity_type, recordId, clientId,
          'Po kontrole presunout dokument do kanonicke slozky klienta.',
          documentUrl, canonicalFile.url, 'Dokument neni ulozen v klientske slozce z drive_folder_url.'
        );
      }
    }

    if (candidates.length > 1) {
      addIssue(
        'CHYBA', 'DOCUMENT_DUPLICATE', record.entity_type, recordId, clientId,
        'Ponechat dokument z document_url; ostatni po kontrole presunout do karanteny.',
        documentUrl, candidates.map(function(file) { return file.url; }).join('\n'),
        'Pocet dokumentu obsahujicich stejne ID zaznamu: ' + candidates.length
      );
    }
  });

  const orphanDocumentKeys = {};
  (inventory.files || []).forEach(function(file) {
    extractAuditRecordIds_(file.name).forEach(function(recordId) {
      const key = file.id + ':' + recordId;
      if (recordById[recordId] || orphanDocumentKeys[key]) return;
      orphanDocumentKeys[key] = true;
      addIssue(
        'VAROVANI', 'DOCUMENT_WITHOUT_RECORD', 'dokument', recordId, '',
        'Overit historii zaznamu; pokud byl smazan, presunout dokument do karanteny.',
        '', file.url, 'Nazev dokumentu obsahuje ID, ktere neni ve zdrojovych listech.'
      );
    });
  });

  const byCode = {};
  issues.forEach(function(issue) { byCode[issue.code] = (byCode[issue.code] || 0) + 1; });
  return {
    generated_at: new Date(),
    issues,
    summary: {
      generated_at: new Date().toISOString(),
      clients: Object.keys(clientById).length,
      expected_documents: expectedRecords.length,
      scanned_folders: (inventory.folders || []).length,
      scanned_files: (inventory.files || []).length,
      issue_count: issues.length,
      by_code: byCode,
      report_sheet: DRIVE_AUDIT_SHEET_NAME_,
      destructive_changes: false
    }
  };
}

function isDriveAuditDeleted_(status) {
  return normalizeDuplicateText_(status).indexOf('smaz') === 0;
}

function extractAuditEntityId_(name, prefix) {
  const safePrefix = String(prefix || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = String(name || '').match(new RegExp('(?:^|[^A-Z0-9])(' + safePrefix + '-\\d+)(?=$|[^A-Z0-9])', 'i'));
  return match ? match[1].toUpperCase() : '';
}

function extractAuditRecordIds_(name) {
  const matches = String(name || '').toUpperCase().match(/(?:VYKON|SETKANI)-\d+/g) || [];
  return matches.filter(function(id, index) { return matches.indexOf(id) === index; });
}

function auditNameContainsId_(name, id) {
  const escaped = String(id || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!escaped) return false;
  return new RegExp('(?:^|[^A-Z0-9])' + escaped + '(?=$|[^A-Z0-9])', 'i').test(String(name || ''));
}

function folderMatchesClientIdentity_(folderName, client) {
  const clientId = String(client && client.klient_id || '').trim().toUpperCase();
  if (!clientId || extractAuditEntityId_(folderName, 'KLIENT') !== clientId) return false;

  const identityParts = [client && client.jmeno, client && client.prijmeni]
    .map(function(value) { return normalizeDuplicateText_(value); })
    .filter(Boolean);
  if (!identityParts.length) return true;

  const normalizedFolderName = ' ' + normalizeDuplicateText_(folderName)
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() + ' ';
  return identityParts.every(function(part) {
    const normalizedPart = part.replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
    return normalizedPart && normalizedFolderName.indexOf(' ' + normalizedPart + ' ') !== -1;
  });
}

function clientFolderHasCanonicalLabel_(folderName, client) {
  const hasName = String(client && client.jmeno || '').trim() || String(client && client.prijmeni || '').trim();
  if (!hasName) return true;
  return String(folderName || '').trim() === buildClientFolderName_(client);
}

function writeDriveAuditReport_(spreadsheet, report) {
  let sheet = spreadsheet.getSheetByName(DRIVE_AUDIT_SHEET_NAME_);
  if (!sheet) sheet = spreadsheet.insertSheet(DRIVE_AUDIT_SHEET_NAME_);
  sheet.clear();

  const generated = Utilities.formatDate(report.generated_at, CONFIG.timeZone, 'yyyy-MM-dd HH:mm:ss');
  sheet.getRange(1, 1, 1, 4).setValues([[
    'AUDIT GOOGLE DRIVE - POUZE NAHLED',
    'Vytvoreno', generated,
    'Nalezeno problemu: ' + report.issues.length
  ]]);
  sheet.getRange(2, 1).setValue('Tento list nic nemaze ani nepresouva. Opravy se musi spustit samostatne az po kontrole.');
  sheet.getRange(4, 1, 1, DRIVE_AUDIT_HEADERS_.length).setValues([DRIVE_AUDIT_HEADERS_]);

  const rows = report.issues.map(function(issue) {
    return [
      issue.severity,
      issue.code,
      issue.entity_type,
      issue.entity_id,
      issue.client_id,
      issue.recommended_action,
      issue.reference_url,
      issue.found_url,
      issue.details
    ];
  });
  if (!rows.length) {
    rows.push(['INFO', 'BEZ_PROBLEMU', '', '', '', 'Neni potreba zasah.', '', '', 'Audit nenalezl nesrovnalosti.']);
  }
  sheet.getRange(5, 1, rows.length, DRIVE_AUDIT_HEADERS_.length).setValues(rows);
  sheet.setFrozenRows(4);
  sheet.getRange(1, 1, 1, 4).setFontWeight('bold');
  sheet.getRange(4, 1, 1, DRIVE_AUDIT_HEADERS_.length).setFontWeight('bold');
  sheet.autoResizeColumns(1, DRIVE_AUDIT_HEADERS_.length);
  sheet.setColumnWidth(6, 360);
  sheet.setColumnWidth(7, 280);
  sheet.setColumnWidth(8, 280);
  sheet.setColumnWidth(9, 420);
}

// Kontrolovana oprava po schvalenem auditu. Funkce nic nemaze. Vsechny
// nadbytecne polozky presouva do nove karanteny vedle klientskych slozek a
// kazdy krok zapisuje do Drive_Repair_Log. Vyžaduje uspesnou zalohu max. 24 h.
function repairDriveConsistencyAfterBackup() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  const spreadsheet = getSpreadsheet_();
  const runId = Utilities.formatDate(new Date(), CONFIG.timeZone, 'yyyyMMdd-HHmmss');
  const logger = createDriveRepairLogger_(spreadsheet, runId);

  try {
    const backup = assertRecentSuccessfulBackupForDriveRepair_();
    logger('START', 'repair', 'oprava', runId, backup.fileUrl || '', '', 'Zahajena oprava po overene zaloze.');

    let clients = readDriveAuditRows_(spreadsheet, CONFIG.sheetName)
      .filter(function(client) { return !isDriveAuditDeleted_(client.status); });
    const performances = readDriveAuditRows_(spreadsheet, CONFIG.performanceSheetName);
    const meetings = readDriveAuditRows_(spreadsheet, CONFIG.meetingSheetName);
    const records = buildDriveAuditRecords_(performances, meetings);
    let inventory = collectDriveAuditInventory_(clients, records);
    const beforeReport = analyzeDriveConsistency_(clients, records, inventory);
    assertDriveRepairReportIsSafe_(beforeReport, clients, records, inventory);

    const quarantine = createDriveRepairQuarantine_(runId);
    logger('OK', 'create_quarantine', 'karantena', runId, '', quarantine.root.getUrl(), 'Karantena byla vytvorena.');

    repairClientFolderLinks_(spreadsheet, clients, inventory, logger);
    clients = readDriveAuditRows_(spreadsheet, CONFIG.sheetName)
      .filter(function(client) { return !isDriveAuditDeleted_(client.status); });

    repairRecordDocuments_(spreadsheet, clients, records, inventory, quarantine.documents, logger);
    quarantineNonCanonicalClientFolders_(clients, inventory, quarantine.folders, logger);

    invalidateReadActions_(['listClients', 'listPerformances', 'listMeetings']);

    const freshClients = readDriveAuditRows_(spreadsheet, CONFIG.sheetName)
      .filter(function(client) { return !isDriveAuditDeleted_(client.status); });
    const freshPerformances = readDriveAuditRows_(spreadsheet, CONFIG.performanceSheetName);
    const freshMeetings = readDriveAuditRows_(spreadsheet, CONFIG.meetingSheetName);
    const freshRecords = buildDriveAuditRecords_(freshPerformances, freshMeetings);
    inventory = collectDriveAuditInventory_(freshClients, freshRecords);
    const afterReport = analyzeDriveConsistency_(freshClients, freshRecords, inventory);
    writeDriveAuditReport_(spreadsheet, afterReport);

    logger(
      'DONE', 'repair', 'oprava', runId, '', '',
      'Oprava dokoncena. Pocet nalezu pred/po: ' + beforeReport.summary.issue_count + '/' + afterReport.summary.issue_count + '.'
    );
    return {
      ok: true,
      run_id: runId,
      quarantine_url: quarantine.root.getUrl(),
      issues_before: beforeReport.summary.issue_count,
      issues_after: afterReport.summary.issue_count,
      log_sheet: DRIVE_REPAIR_LOG_SHEET_NAME_,
      deleted_items: 0
    };
  } catch (error) {
    logger('ERROR', 'repair', 'oprava', runId, '', '', String(error.message || error));
    throw error;
  } finally {
    lock.releaseLock();
  }
}

// Jednorazove sjednoti zdrojova pole klienta KLIENT-0004 a nasledne spusti
// kontrolovanou opravu slozek. V aplikaci i na Disku se pak pouziva poradi
// Prijmeni Jmeno. Funkce vyzaduje cerstvou kompletni zalohu a nic nemaze.
function normalizeClientNamesAndFoldersAfterBackup() {
  assertRecentSuccessfulBackupForDriveRepair_();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  const spreadsheet = getSpreadsheet_();
  const runId = Utilities.formatDate(new Date(), CONFIG.timeZone, 'yyyyMMdd-HHmmss') + '-JMENA';
  const logger = createDriveRepairLogger_(spreadsheet, runId);

  try {
    const sheet = spreadsheet.getSheetByName(CONFIG.sheetName);
    if (!sheet) throw new Error('OPRAVA ZASTAVENA: Chybi list ' + CONFIG.sheetName + '.');
    const headers = getHeaders_(sheet);
    const idColumn = headers.indexOf('klient_id') + 1;
    const firstNameColumn = headers.indexOf('jmeno') + 1;
    const lastNameColumn = headers.indexOf('prijmeni') + 1;
    if (!idColumn || !firstNameColumn || !lastNameColumn) {
      throw new Error('OPRAVA ZASTAVENA: V listu Klienti chybi klient_id, jmeno nebo prijmeni.');
    }

    const rows = findClientRows_(sheet, idColumn, 'KLIENT-0004');
    if (rows.length !== 1) {
      throw new Error('OPRAVA ZASTAVENA: KLIENT-0004 musi mit prave jeden radek. Nalezeno: ' + rows.length + '.');
    }
    const rowNumber = rows[0];
    const values = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
    const client = rowToObject_(headers, values);
    const currentFirstName = normalizeDuplicateText_(client.jmeno);
    const currentLastName = normalizeDuplicateText_(client.prijmeni);
    const alreadyCorrect = currentFirstName === 'milada' && currentLastName === 'hubacova';
    const knownSwappedState = currentFirstName === 'hubacova' && currentLastName === 'milada';
    if (!alreadyCorrect && !knownSwappedState) {
      throw new Error('OPRAVA ZASTAVENA: KLIENT-0004 nema ocekavane hodnoty Milada/Hubacova ani jejich prohozene poradi.');
    }

    if (knownSwappedState) {
      sheet.getRange(rowNumber, firstNameColumn).setValue('Milada');
      sheet.getRange(rowNumber, lastNameColumn).setValue('Hubačová');
      const updatedAtColumn = headers.indexOf('updated_at') + 1;
      const updatedByColumn = headers.indexOf('updated_by') + 1;
      if (updatedAtColumn) sheet.getRange(rowNumber, updatedAtColumn).setValue(new Date());
      if (updatedByColumn) sheet.getRange(rowNumber, updatedByColumn).setValue('oprava poradi jmena');
      logger('OK', 'normalize_client_name_columns', 'klient', 'KLIENT-0004', 'Hubačová | Milada', 'Milada | Hubačová', 'Opraven vyznam sloupcu jmeno a prijmeni. Zobrazeni zustava Prijmeni Jmeno.', 'KLIENT-0004');
      invalidateReadActions_(['listClients']);
    } else {
      logger('OK', 'normalize_client_name_columns', 'klient', 'KLIENT-0004', 'Milada | Hubačová', 'Milada | Hubačová', 'Zdrojova pole uz byla ve spravnem poradi.', 'KLIENT-0004');
    }
  } catch (error) {
    logger('ERROR', 'normalize_client_name_columns', 'klient', 'KLIENT-0004', '', '', String(error.message || error), 'KLIENT-0004');
    throw error;
  } finally {
    lock.releaseLock();
  }

  return repairDriveConsistencyAfterBackup();
}

// Jednorazova bezpecna naprava incidentu, kdy byla slozka fiktivniho klienta
// Laštovica omylem prirazena skutecnemu klientovi KLIENT-0018. Funkce vyzaduje
// cerstvou kompletni zalohu, nic nemaze a presouva pouze soubory, na ktere
// odkazuji radky KLIENT-0018 v hlavni tabulce.
function repairClient0018FolderAfterNameMismatch() {
  const clientId = 'KLIENT-0018';
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  const spreadsheet = getSpreadsheet_();
  const runId = Utilities.formatDate(new Date(), CONFIG.timeZone, 'yyyyMMdd-HHmmss') + '-KLIENT-0018';
  const logger = createDriveRepairLogger_(spreadsheet, runId);

  try {
    const backup = assertRecentSuccessfulBackupForDriveRepair_();
    logger('START', 'repair_client_folder_identity', 'klient', clientId, backup.fileUrl || '', '', 'Zahajena cilena oprava po overene zaloze.', clientId);

    const activeClients = readDriveAuditRows_(spreadsheet, CONFIG.sheetName)
      .filter(function(client) { return !isDriveAuditDeleted_(client.status); });
    const matches = activeClients.filter(function(client) {
      return String(client.klient_id || '').trim() === clientId;
    });
    if (matches.length !== 1) {
      throw new Error('OPRAVA ZASTAVENA: V listu Klienti musi byt prave jeden aktivni radek ' + clientId + '. Nalezeno: ' + matches.length + '.');
    }

    const client = matches[0];
    if (normalizeDuplicateText_(client.jmeno) !== 'frantisek' || normalizeDuplicateText_(client.prijmeni) !== 'kral') {
      throw new Error('OPRAVA ZASTAVENA: ' + clientId + ' neni Frantisek Kral. Zadna data nebyla presunuta.');
    }

    const currentUrl = String(client.drive_folder_url || '').trim();
    const currentId = extractDriveId_(currentUrl);
    if (!currentId) throw new Error('OPRAVA ZASTAVENA: ' + clientId + ' nema platny odkaz na soucasnou slozku.');
    const currentFolder = DriveApp.getFolderById(currentId);
    if (folderMatchesClientIdentity_(currentFolder.getName(), client)) {
      logger('DONE', 'repair_client_folder_identity', 'klient', clientId, currentUrl, currentUrl, 'Slozka uz odpovida ID i jmenu klienta; nebyla nutna zadna zmena.', clientId);
      return { ok: true, already_correct: true, client_id: clientId, folder_url: currentUrl, moved_files: 0, deleted_items: 0 };
    }

    const performances = readDriveAuditRows_(spreadsheet, CONFIG.performanceSheetName);
    const meetings = readDriveAuditRows_(spreadsheet, CONFIG.meetingSheetName);
    const linkedUrls = collectClientLinkedDriveUrls_(client, performances, meetings);
    const linkedFiles = linkedUrls.map(function(url) {
      const id = extractDriveId_(url);
      if (!id) throw new Error('OPRAVA ZASTAVENA: Propojeny soubor ma neplatne URL: ' + url);
      try {
        return { id: id, url: url, file: DriveApp.getFileById(id) };
      } catch (error) {
        throw new Error('OPRAVA ZASTAVENA: Propojeny soubor neni dostupny: ' + url);
      }
    });

    const root = getClientFolderParent_();
    const matchingFolders = [];
    const rootFolders = root.getFolders();
    while (rootFolders.hasNext()) {
      const folder = rootFolders.next();
      if (folderMatchesClientIdentity_(folder.getName(), client)) matchingFolders.push(folder);
    }
    if (matchingFolders.length > 1) {
      throw new Error('OPRAVA ZASTAVENA: Pro ' + clientId + ' existuje vice slozek odpovidajicich ID i jmenu.');
    }

    const quarantine = createDriveRepairQuarantine_(runId);
    const targetFolder = matchingFolders.length === 1
      ? matchingFolders[0]
      : root.createFolder(buildClientFolderName_(client));
    const targetId = targetFolder.getId();
    const targetUrl = targetFolder.getUrl();
    logger(
      'OK', matchingFolders.length ? 'reuse_correct_client_folder' : 'create_correct_client_folder',
      'slozka_klienta', targetId, currentUrl, targetUrl,
      matchingFolders.length ? 'Použita existujici slozka odpovidajici ID i jmenu klienta.' : 'Vytvorena slozka odpovidajici ID i jmenu klienta.',
      clientId
    );

    let movedFiles = 0;
    linkedFiles.forEach(function(item) {
      if (getDriveParentIds_(item.file).indexOf(targetId) !== -1) return;
      item.file.moveTo(targetFolder);
      movedFiles += 1;
      logger('OK', 'move_linked_client_file', 'soubor', item.id, item.url, item.file.getUrl(), 'Presunut pouze soubor propojeny s radkem klienta.', clientId);
    });

    updateDriveRepairUrl_(spreadsheet, CONFIG.sheetName, 'klient_id', clientId, 'drive_folder_url', targetUrl);
    logger('OK', 'repair_client_folder_link', 'klient', clientId, currentUrl, targetUrl, 'Odkaz klienta zmenen na slozku odpovidajici ID i jmenu.', clientId);

    const usedByAnotherClient = activeClients.some(function(otherClient) {
      return String(otherClient.klient_id || '').trim() !== clientId
        && extractDriveId_(otherClient.drive_folder_url) === currentId;
    });
    let archivedOldFolder = false;
    if (currentId !== targetId && !usedByAnotherClient) {
      currentFolder.moveTo(quarantine.folders);
      archivedOldFolder = true;
      logger('OK', 'quarantine_wrong_identity_folder', 'slozka_klienta', currentId, currentUrl, currentFolder.getUrl(), 'Puvodni slozka s cizim jmenem presunuta do karanteny; nic nebylo smazano.', clientId);
    } else if (usedByAnotherClient) {
      logger('WARNING', 'keep_shared_folder', 'slozka_klienta', currentId, currentUrl, currentUrl, 'Puvodni slozka zustala na miste, protoze na ni odkazuje jiny aktivni klient.', clientId);
    }

    invalidateReadActions_(['listClients', 'listPerformances', 'listMeetings']);
    const freshClients = readDriveAuditRows_(spreadsheet, CONFIG.sheetName)
      .filter(function(item) { return !isDriveAuditDeleted_(item.status); });
    const freshPerformances = readDriveAuditRows_(spreadsheet, CONFIG.performanceSheetName);
    const freshMeetings = readDriveAuditRows_(spreadsheet, CONFIG.meetingSheetName);
    const freshRecords = buildDriveAuditRecords_(freshPerformances, freshMeetings);
    const freshInventory = collectDriveAuditInventory_(freshClients, freshRecords);
    const report = analyzeDriveConsistency_(freshClients, freshRecords, freshInventory);
    writeDriveAuditReport_(spreadsheet, report);

    logger('DONE', 'repair_client_folder_identity', 'klient', clientId, currentUrl, targetUrl, 'Cilena oprava dokoncena. Presunuto propojenych souboru: ' + movedFiles + '. Nalezu po oprave: ' + report.summary.issue_count + '.', clientId);
    return {
      ok: true,
      client_id: clientId,
      folder_url: targetUrl,
      quarantine_url: quarantine.root.getUrl(),
      moved_files: movedFiles,
      archived_old_folder: archivedOldFolder,
      issues_after: report.summary.issue_count,
      deleted_items: 0
    };
  } catch (error) {
    logger('ERROR', 'repair_client_folder_identity', 'klient', clientId, '', '', String(error.message || error), clientId);
    throw error;
  } finally {
    lock.releaseLock();
  }
}

function collectClientLinkedDriveUrls_(client, performances, meetings) {
  const clientId = String(client && client.klient_id || '').trim();
  const urls = [];
  const seen = {};
  function remember(url) {
    const normalized = String(url || '').trim();
    const id = extractDriveId_(normalized);
    if (!normalized || !id || seen[id]) return;
    seen[id] = true;
    urls.push(normalized);
  }

  remember(client && client.monitoring_list_url);
  [performances || [], meetings || []].forEach(function(rows) {
    rows.forEach(function(record) {
      if (String(record.klient_id || '').trim() !== clientId || isDriveAuditDeleted_(record.status)) return;
      remember(record.document_url);
    });
  });
  return urls;
}

function assertRecentSuccessfulBackupForDriveRepair_() {
  const status = normalizeBackupStatus_(readBackupStatus_(), new Date());
  const finishedAt = new Date(status.finishedAt || '').getTime();
  const age = Date.now() - finishedAt;
  if (status.state !== 'success' || !Number.isFinite(finishedAt) || age < 0 || age > DRIVE_REPAIR_BACKUP_MAX_AGE_MS_) {
    throw new Error('OPRAVA ZASTAVENA: Nejdrive vytvorte uspesnou kompletni zalohu. Zaloha nesmi byt starsi nez 24 hodin.');
  }
  if (!status.fileId) throw new Error('OPRAVA ZASTAVENA: Posledni zaloha nema ulozene ID souboru. Vytvorte novou kompletni zalohu.');
  try {
    DriveApp.getFileById(status.fileId).getName();
  } catch (error) {
    throw new Error('OPRAVA ZASTAVENA: Soubor posledni zalohy neni dostupny. Vytvorte novou kompletni zalohu.');
  }
  return status;
}

function assertDriveRepairReportIsSafe_(report, clients, records, inventory) {
  const allowedCodes = {
    CLIENT_FOLDER_ORPHAN: true,
    CLIENT_FOLDER_DUPLICATE: true,
    CLIENT_FOLDER_LINK_MISSING: true,
    CLIENT_FOLDER_ID_MISMATCH: true,
    CLIENT_FOLDER_NAME_MISMATCH: true,
    CLIENT_FOLDER_LABEL_MISMATCH: true,
    CLIENT_FOLDER_OUTSIDE_ROOT: true,
    DOCUMENT_DUPLICATE: true,
    DOCUMENT_WRONG_FOLDER: true,
    DOCUMENT_WITHOUT_RECORD: true,
    DOCUMENT_LINK_MISSING_RECOVERABLE: true,
    DOCUMENT_LINK_STALE_RECOVERABLE: true
  };
  const blocked = (report.issues || []).filter(function(issue) { return !allowedCodes[issue.code]; });
  if (blocked.length) {
    throw new Error('OPRAVA ZASTAVENA: Audit obsahuje nejednoznacne nalezy: ' + blocked.map(function(issue) {
      return issue.code + (issue.entity_id ? ' ' + issue.entity_id : '');
    }).join(', '));
  }

  const clientIds = {};
  (clients || []).forEach(function(client) {
    const id = String(client.klient_id || '').trim();
    if (id) clientIds[id] = true;
  });
  (records || []).filter(function(record) {
    return record.record_id && record.klient_id && String(record.dokument_text || '').trim() && !isDriveAuditDeleted_(record.status);
  }).forEach(function(record) {
    if (!clientIds[String(record.klient_id)]) {
      throw new Error('OPRAVA ZASTAVENA: Zaznam ' + record.record_id + ' nema platneho klienta.');
    }
    const documentId = extractDriveId_(record.document_url);
    const candidates = (inventory.files || []).filter(function(file) {
      return auditNameContainsId_(file.name, record.record_id);
    });
    const canonicalAvailable = documentId && inventory.file_access[documentId] !== false
      && (inventory.files || []).some(function(file) { return file.id === documentId; });
    if (!canonicalAvailable && candidates.length !== 1) {
      throw new Error('OPRAVA ZASTAVENA: Pro ' + record.record_id + ' nelze jednoznacne urcit spravny dokument.');
    }
  });
}

function createDriveRepairQuarantine_(runId) {
  const clientRoot = getClientFolderParent_();
  const parents = clientRoot.getParents();
  const parent = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
  const root = parent.createFolder('KARANTENA - oprava Drive ' + runId);
  return {
    root,
    folders: root.createFolder('Klientske slozky'),
    documents: root.createFolder('Dokumenty')
  };
}

function createDriveRepairLogger_(spreadsheet, runId) {
  let sheet = spreadsheet.getSheetByName(DRIVE_REPAIR_LOG_SHEET_NAME_);
  const headers = [
    'run_id', 'cas', 'stav', 'akce', 'typ_objektu', 'objekt_id', 'klient_id',
    'puvodni_url', 'nove_url', 'podrobnosti'
  ];
  if (!sheet) sheet = spreadsheet.insertSheet(DRIVE_REPAIR_LOG_SHEET_NAME_);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  return function(status, action, entityType, entityId, sourceUrl, targetUrl, details, clientId) {
    const row = [[
      runId,
      new Date(),
      status || '',
      action || '',
      entityType || '',
      entityId || '',
      clientId || '',
      sourceUrl || '',
      targetUrl || '',
      details || ''
    ]];
    sheet.getRange(sheet.getLastRow() + 1, 1, 1, headers.length).setValues(row);
  };
}

function repairClientFolderLinks_(spreadsheet, clients, inventory, logger) {
  const root = getClientFolderParent_();
  const foldersById = {};
  const rootCandidates = {};
  (inventory.folders || []).forEach(function(folder) {
    foldersById[folder.id] = folder;
    if (!folder.direct_root_child) return;
    const clientId = extractAuditEntityId_(folder.name, 'KLIENT');
    if (!clientId) return;
    const matchingClient = (clients || []).find(function(client) {
      return String(client.klient_id || '').trim() === clientId;
    });
    if (!matchingClient || !folderMatchesClientIdentity_(folder.name, matchingClient)) return;
    rootCandidates[clientId] = rootCandidates[clientId] || [];
    rootCandidates[clientId].push(folder);
  });

  (clients || []).forEach(function(client) {
    const clientId = String(client.klient_id || '').trim();
    if (!clientId) return;
    const currentUrl = String(client.drive_folder_url || '').trim();
    const currentId = extractDriveId_(currentUrl);
    const currentFolder = currentId && foldersById[currentId];
    const detectedId = currentFolder ? extractAuditEntityId_(currentFolder.name, 'KLIENT') : '';
    const currentIdentityMatches = currentFolder && folderMatchesClientIdentity_(currentFolder.name, client);
    const exactCandidates = rootCandidates[clientId] || [];
    let targetFolder = null;
    let reason = '';

    if (!currentId) {
      if (exactCandidates.length > 1) {
        throw new Error('OPRAVA ZASTAVENA: Klient ' + clientId + ' nema odkaz a ma vice moznych slozek.');
      }
      if (exactCandidates.length === 1) {
        targetFolder = DriveApp.getFolderById(exactCandidates[0].id);
        reason = 'Doplnen existujici odkaz na slozku.';
      } else {
        targetFolder = root.createFolder(buildClientFolderName_(client));
        reason = 'Vytvorena chybejici klientska slozka.';
      }
    } else if (currentFolder && (!detectedId || detectedId !== clientId || !currentIdentityMatches)) {
      if (exactCandidates.length > 1) {
        throw new Error('OPRAVA ZASTAVENA: Klient ' + clientId + ' ma chybny odkaz nebo jmeno slozky a vice moznych spravnych slozek.');
      }
      targetFolder = exactCandidates.length === 1
        ? DriveApp.getFolderById(exactCandidates[0].id)
        : root.createFolder(buildClientFolderName_(client));
      reason = exactCandidates.length === 1
        ? 'Chybny odkaz nebo jmeno slozky nahrazeny existujici spravnou slozkou.'
        : 'Chybny odkaz nebo jmeno slozky nahrazeny novou spravnou slozkou.';
    } else if (currentFolder && currentFolder.parent_ids.indexOf(inventory.root_folder_id) === -1) {
      targetFolder = DriveApp.getFolderById(currentId);
      targetFolder.moveTo(root);
      reason = 'Kanonicka slozka presunuta do nastaveneho korene.';
    } else if (currentFolder && !clientFolderHasCanonicalLabel_(currentFolder.name, client)) {
      targetFolder = DriveApp.getFolderById(currentId);
      reason = 'Slozka prejmenovana na jednotny format Prijmeni Jmeno.';
    }

    if (!targetFolder) return;
    const expectedFolderName = buildClientFolderName_(client);
    if (targetFolder.getName() !== expectedFolderName) targetFolder.setName(expectedFolderName);
    const targetUrl = targetFolder.getUrl();
    updateDriveRepairUrl_(spreadsheet, CONFIG.sheetName, 'klient_id', clientId, 'drive_folder_url', targetUrl);
    client.drive_folder_url = targetUrl;
    logger('OK', 'repair_client_folder_link', 'klient', clientId, currentUrl, targetUrl, reason, clientId);
  });
}

function repairRecordDocuments_(spreadsheet, clients, records, inventory, quarantineFolder, logger) {
  const clientById = {};
  const recordById = {};
  const filesById = {};
  const movedFileIds = {};
  (clients || []).forEach(function(client) {
    const id = String(client.klient_id || '').trim();
    if (id) clientById[id] = client;
  });
  (records || []).forEach(function(record) {
    if (record.record_id) recordById[String(record.record_id)] = record;
  });
  (inventory.files || []).forEach(function(file) { filesById[file.id] = file; });

  (records || []).filter(function(record) {
    return record.record_id && record.klient_id && String(record.dokument_text || '').trim() && !isDriveAuditDeleted_(record.status);
  }).forEach(function(record) {
    const recordId = String(record.record_id);
    const clientId = String(record.klient_id);
    const currentUrl = String(record.document_url || '').trim();
    const currentId = extractDriveId_(currentUrl);
    const candidates = (inventory.files || []).filter(function(file) {
      return auditNameContainsId_(file.name, recordId);
    });
    let canonical = currentId && filesById[currentId] && inventory.file_access[currentId] !== false
      ? filesById[currentId]
      : null;

    if (!canonical) {
      if (candidates.length !== 1) throw new Error('OPRAVA ZASTAVENA: Dokument ' + recordId + ' neni jednoznacny.');
      canonical = candidates[0];
      updateDriveRepairUrl_(
        spreadsheet,
        record.entity_type === 'vykon' ? CONFIG.performanceSheetName : CONFIG.meetingSheetName,
        record.entity_type === 'vykon' ? 'vykon_id' : 'meeting_id',
        recordId,
        'document_url',
        canonical.url
      );
      record.document_url = canonical.url;
      logger('OK', 'repair_document_link', record.entity_type, recordId, currentUrl, canonical.url, 'Opraven chybejici nebo nefunkcni odkaz.', clientId);
    }

    const clientFolderId = extractDriveId_(clientById[clientId] && clientById[clientId].drive_folder_url);
    if (!clientFolderId) throw new Error('OPRAVA ZASTAVENA: Klient ' + clientId + ' nema cilovou slozku.');
    if (canonical.parent_ids.indexOf(clientFolderId) === -1) {
      const file = DriveApp.getFileById(canonical.id);
      const sourceParents = canonical.parent_ids.join(',');
      file.moveTo(DriveApp.getFolderById(clientFolderId));
      canonical.parent_ids = [clientFolderId];
      logger('OK', 'move_document_to_client', record.entity_type, recordId, sourceParents, file.getUrl(), 'Dokument presunut do kanonicke slozky klienta.', clientId);
    }

    candidates.forEach(function(candidate) {
      if (candidate.id === canonical.id || movedFileIds[candidate.id]) return;
      const file = DriveApp.getFileById(candidate.id);
      file.moveTo(quarantineFolder);
      movedFileIds[candidate.id] = true;
      logger('OK', 'quarantine_duplicate_document', record.entity_type, recordId, candidate.url, file.getUrl(), 'Nadbytecna kopie presunuta do karanteny.', clientId);
    });
  });

  (inventory.files || []).forEach(function(fileInfo) {
    if (movedFileIds[fileInfo.id]) return;
    const orphanIds = extractAuditRecordIds_(fileInfo.name).filter(function(recordId) { return !recordById[recordId]; });
    if (!orphanIds.length) return;
    const file = DriveApp.getFileById(fileInfo.id);
    file.moveTo(quarantineFolder);
    movedFileIds[fileInfo.id] = true;
    logger('OK', 'quarantine_document_without_record', 'dokument', orphanIds.join(';'), fileInfo.url, file.getUrl(), 'Dokument bez zdrojoveho zaznamu presunut do karanteny.');
  });
}

function quarantineNonCanonicalClientFolders_(clients, inventory, quarantineFolder, logger) {
  const activeClientIds = {};
  const canonicalFolderIds = {};
  (clients || []).forEach(function(client) {
    const clientId = String(client.klient_id || '').trim();
    if (clientId) activeClientIds[clientId] = true;
    const folderId = extractDriveId_(client.drive_folder_url);
    if (folderId) canonicalFolderIds[folderId] = clientId;
  });

  (inventory.folders || []).filter(function(folder) {
    return folder.direct_root_child && !canonicalFolderIds[folder.id];
  }).forEach(function(folderInfo) {
    const detectedClientId = extractAuditEntityId_(folderInfo.name, 'KLIENT');
    if (!detectedClientId && !/^KLIENT-/i.test(String(folderInfo.name || ''))) return;
    const reason = activeClientIds[detectedClientId]
      ? 'Nadbytecna klientska slozka presunuta do karanteny.'
      : 'Slozka bez existujiciho klienta presunuta do karanteny.';
    const folder = DriveApp.getFolderById(folderInfo.id);
    folder.moveTo(quarantineFolder);
    logger('OK', 'quarantine_client_folder', 'slozka_klienta', folderInfo.id, folderInfo.url, folder.getUrl(), reason, detectedClientId);
  });
}

function updateDriveRepairUrl_(spreadsheet, sheetName, idHeader, id, urlHeader, url) {
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) throw new Error('Chybi list ' + sheetName + '.');
  const headers = getHeaders_(sheet);
  const idColumn = headers.indexOf(idHeader) + 1;
  const urlColumn = headers.indexOf(urlHeader) + 1;
  if (!idColumn || !urlColumn) throw new Error('Chybi sloupec ' + idHeader + ' nebo ' + urlHeader + ' v listu ' + sheetName + '.');
  const row = findRowById_(sheet, idColumn, id);
  if (!row) throw new Error('Nelze najit ' + id + ' v listu ' + sheetName + '.');
  sheet.getRange(row, urlColumn).setValue(url);
}

function getSheetForRead_(sheetName, spreadsheet) {
  return (spreadsheet || getSpreadsheet_()).getSheetByName(sheetName);
}

function readCacheBaseKey_(action) {
  return READ_CACHE_VERSION_ + ':' + action;
}

function readCacheGeneration_(cache, action) {
  return cache.get(readCacheBaseKey_(action) + ':generation') || '';
}

function getCachedDataset_(action) {
  try {
    const cache = CacheService.getScriptCache();
    const baseKey = readCacheBaseKey_(action);
    const metaRaw = cache.get(baseKey + ':meta');
    if (!metaRaw) return null;
    const meta = JSON.parse(metaRaw);
    if (String(meta.generation || '') !== readCacheGeneration_(cache, action)) return null;
    const count = Number(meta && meta.count);
    if (!Number.isInteger(count) || count < 1 || count > READ_CACHE_MAX_CHUNKS_) return null;
    const keys = Array.from({ length: count }, (_, index) => baseKey + ':' + index);
    const chunks = cache.getAll(keys);
    if (!chunks || keys.some((key) => typeof chunks[key] !== 'string')) return null;
    const encoded = keys.map((key) => chunks[key]).join('');
    const encodedBytes = Utilities.base64DecodeWebSafe(encoded);
    const json = meta.encoding === READ_CACHE_ENCODING_
      ? Utilities.ungzip(Utilities.newBlob(encodedBytes)).getDataAsString('UTF-8')
      : Utilities.newBlob(encodedBytes).getDataAsString('UTF-8');
    return JSON.parse(json);
  } catch (error) {
    console.warn('Read cache miss for ' + action + ': ' + String(error.message || error));
    return null;
  }
}

function putCachedDataset_(action, value, generation) {
  try {
    const cache = CacheService.getScriptCache();
    const baseKey = readCacheBaseKey_(action);
    const compressed = Utilities.gzip(Utilities.newBlob(JSON.stringify(value), 'application/json'));
    const encoded = Utilities.base64EncodeWebSafe(compressed.getBytes());
    const chunks = [];
    for (let offset = 0; offset < encoded.length; offset += READ_CACHE_CHUNK_SIZE_) {
      chunks.push(encoded.slice(offset, offset + READ_CACHE_CHUNK_SIZE_));
    }
    if (chunks.length === 0) chunks.push('');
    if (chunks.length > READ_CACHE_MAX_CHUNKS_) return;
    const entries = {};
    chunks.forEach((chunk, index) => {
      entries[baseKey + ':' + index] = chunk;
    });
    entries[baseKey + ':meta'] = JSON.stringify({
      count: chunks.length,
      cachedAt: Date.now(),
      generation: generation || '',
      encoding: READ_CACHE_ENCODING_
    });
    cache.putAll(entries, READ_CACHE_TTL_SECONDS_);
  } catch (error) {
    console.warn('Read cache write skipped for ' + action + ': ' + String(error.message || error));
  }
}

function readCachedDataset_(action, loader, shouldCache) {
  const cached = getCachedDataset_(action);
  if (cached !== null) return cached;
  let generationBefore = '';
  try {
    generationBefore = readCacheGeneration_(CacheService.getScriptCache(), action);
  } catch {
    // Bez cache pokračuje načtení přímo ze Sheetu.
  }
  const value = loader();
  let generationAfter = generationBefore;
  try {
    generationAfter = readCacheGeneration_(CacheService.getScriptCache(), action);
  } catch {
    // Bez cache se výsledek pouze vrátí volajícímu.
  }
  const cacheable = typeof shouldCache !== 'function' || shouldCache(value);
  if (generationBefore === generationAfter && cacheable) {
    putCachedDataset_(action, value, generationAfter);
  }
  return value;
}

function expandReadInvalidationActions_(actions) {
  const expanded = {};
  (actions || []).forEach((action) => {
    expanded[action] = true;
    if (BOOTSTRAP_FAST_READ_ACTIONS_.includes(action)) {
      expanded.bootstrapFast = true;
    }
    if (BOOTSTRAP_AUXILIARY_READ_ACTIONS_.includes(action)) {
      expanded.bootstrapAuxiliary = true;
    }
  });
  return Object.keys(expanded);
}

function isIdempotentMutationAction_(action) {
  return IDEMPOTENT_MUTATION_ACTIONS_.has(String(action || ''));
}

function canonicalMutationValue_(value) {
  if (Array.isArray(value)) return value.map(canonicalMutationValue_);
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value).sort().reduce(function(result, key) {
    if (key === 'token' || key === 'request_id') return result;
    result[key] = canonicalMutationValue_(value[key]);
    return result;
  }, {});
}

function mutationFingerprint_(payload) {
  const text = JSON.stringify(canonicalMutationValue_(payload || {}));
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return text.length.toString(36) + '-' + (hash >>> 0).toString(16).padStart(8, '0');
}

function invalidateReadActions_(actions) {
  actions = expandReadInvalidationActions_(actions);
  if (!actions || actions.length === 0) return;
  try {
    const cache = CacheService.getScriptCache();
    const keysToRemove = [];
    actions.forEach((action) => {
      const baseKey = readCacheBaseKey_(action);
      cache.put(baseKey + ':generation', Utilities.getUuid(), READ_CACHE_TTL_SECONDS_);
      const metaKey = baseKey + ':meta';
      keysToRemove.push(metaKey);
      const metaRaw = cache.get(metaKey);
      if (!metaRaw) return;
      try {
        const count = Number(JSON.parse(metaRaw).count);
        if (Number.isInteger(count) && count > 0) {
          for (let index = 0; index < count; index += 1) keysToRemove.push(baseKey + ':' + index);
        }
      } catch {
        // Poškozená metadata stačí odstranit; osiřelé bloky samy vyprší.
      }
    });
    for (let offset = 0; offset < keysToRemove.length; offset += 80) {
      cache.removeAll(keysToRemove.slice(offset, offset + 80));
    }
  } catch (error) {
    console.warn('Read cache invalidation skipped: ' + String(error.message || error));
  }
}

const INDIVIDUAL_PLAN_HEADERS_ = [
  'plan_id', 'klient_id', 'popis_situace',
  'cile_json', 'zaverecne_vyhodnoceni', 'accepted_plan_text', 'pocet_minut', 'status', 'created_at', 'created_by', 'updated_at', 'updated_by'
];

const PERFORMANCE_SPECIFIC_HEADERS_ = [
  'misto_depistaze', 'zpusob_kontaktu', 'zajem_o_spolupraci', 'zapis_fyzicky_podepsan_zalozen',
  'hlavni_zjistene_oblasti', 'rizika', 'zdroje_klienta', 'potreby_klienta',
  'poskytnute_informace', 'doporuceny_postup', 'misto_vykonu', 'ucel_navstevy',
  'kam_doprovod', 'ucel_doprovodu', 'vysledek_doprovodu',
  'typ_krize', 'mira_akutnosti', 'prijata_opatreni', 'predani_navazne_pomoci', 'kontaktovana_navazna_sluzba',
  'duvod_vyhodnoceni_ukonceni', 'dosazeny_posun', 'nedoresene_oblasti', 'doporuceni'
];

const PERFORMANCE_HEADERS_ = [
  'vykon_id', 'klient_id', 'datum', 'cas_od', 'cas_do', 'pocet_hodin', 'pracovnik',
  'typ_podpory', 'tema_podpory', 'specificka_pole_json',
  ...PERFORMANCE_SPECIFIC_HEADERS_,
  'forma_poskytovani', 'cil_ip_id', 'cil_ip', 'popis', 'vysledek',
  'dalsi_krok', 'dokument_text', 'document_url', 'document_error', 'status', 'created_at', 'created_by', 'updated_at', 'updated_by'
];
const STATISTICS_HEADERS_ = [
  'statistika_id', 'zdrojovy_zaznam_id', 'client_id', 'client_name', 'datum', 'obdobi', 'typ_statistiky',
  'kod', 'skupina', 'nazev', 'hodnota_text', 'status', 'created_at', 'created_by', 'updated_at', 'updated_by'
];
const KU_SUPPORT_STAT_TYPE_ = 'FORMA_POMOCI_KU';
const KU_SUPPORT_DEFAULT_CODE_ = 'NONE';
const KU_SUPPORT_TYPES_ = [
  { code: 'DAVKY_SUPERDAVKA', group: 'Dávky', name: 'Dávka státní sociální pomoci – superdávka' },
  { code: 'DAVKY_MIMORADNA_OKAMZITA_POMOC', group: 'Dávky', name: 'Mimořádná okamžitá pomoc' },
  { code: 'DAVKY_PRISPEVEK_NA_PECI', group: 'Dávky', name: 'Příspěvek na péči' },
  { code: 'DAVKY_PRISPEVEK_NA_MOBILITU', group: 'Dávky', name: 'Příspěvek na mobilitu' },
  { code: 'DAVKY_JINE', group: 'Dávky', name: 'Jiné' },
  { code: 'DUCHODY_STAROBNI_DUCHOD', group: 'Důchody a pojištění', name: 'Starobní důchod' },
  { code: 'DUCHODY_INVALIDNI_DUCHOD', group: 'Důchody a pojištění', name: 'Invalidní důchod' },
  { code: 'DUCHODY_DUCHODOVE_POJISTENI', group: 'Důchody a pojištění', name: 'Důchodové pojištění' },
  { code: 'BYDLENI_SOCIALNI_OBECNI_BYT', group: 'Bydlení', name: 'Sociální nebo obecní byt' },
  { code: 'BYDLENI_JINE_RESENI', group: 'Bydlení', name: 'Jiné řešení bydlení' },
  { code: 'ZDRAVOTNI_KOMPENZACNI_POMUCKY', group: 'Zdravotní a kompenzační podpora', name: 'Kompenzační pomůcky' },
  { code: 'ZDRAVOTNI_ZTP_TP', group: 'Zdravotní a kompenzační podpora', name: 'ZTP, TP' },
  { code: 'ZDRAVOTNI_PREVOZOVA_SLUZBA', group: 'Zdravotní a kompenzační podpora', name: 'Převozová služba' },
  { code: 'ZDRAVOTNI_POBYTOVA_SLUZBA_LDN', group: 'Zdravotní a kompenzační podpora', name: 'Pobytová služba / LDN' },
  { code: 'ZDRAVOTNI_HOSPIC_PALIATIVNI_PECE', group: 'Zdravotní a kompenzační podpora', name: 'Hospic / paliativní péče' },
  { code: 'SOCIALNI_SLUZBY_PECOVATELSKA', group: 'Sociální služby', name: 'Pečovatelská služba' },
  { code: 'SOCIALNI_SLUZBY_SAS_RODINY', group: 'Sociální služby', name: 'SAS pro rodiny s dětmi' },
  { code: 'SOCIALNI_SLUZBY_RANA_PECE', group: 'Sociální služby', name: 'Raná péče' },
  { code: 'SOCIALNI_SLUZBY_CDZ', group: 'Sociální služby', name: 'Centrum duševního zdraví' },
  { code: 'SOCIALNI_SLUZBY_DLUHOVA_PORADNA', group: 'Sociální služby', name: 'Dluhová poradna' },
  { code: 'SOCIALNI_SLUZBY_OBCANSKO_PRAVNI_PORADNA', group: 'Sociální služby', name: 'Občansko-právní poradna' },
  { code: 'MATERIALNI_POTRAVINOVA_POMOC', group: 'Materiální a humanitární pomoc', name: 'Potravinová pomoc' },
  { code: 'MATERIALNI_OSACENI', group: 'Materiální a humanitární pomoc', name: 'Ošacení' },
  { code: 'MATERIALNI_HUMANITARNI_POMOC_UA', group: 'Materiální a humanitární pomoc', name: 'Humanitární pomoc UA' },
  { code: 'RODINA_OSPOD', group: 'Rodina, děti a ochrana práv', name: 'OSPOD' },
  { code: 'RODINA_SKOLNI_DOCHAZKA', group: 'Rodina, děti a ochrana práv', name: 'Školní docházka / podnět ZŠ nebo MŠ' },
  { code: 'RODINA_RODINNE_PRAVO', group: 'Rodina, děti a ochrana práv', name: 'Rodinné právo' },
  { code: 'RODINA_OMEZENI_SVEPRAVNOSTI', group: 'Rodina, děti a ochrana práv', name: 'Omezení svéprávnosti' },
  { code: 'OSTATNI_JINE', group: 'Ostatní', name: 'Jiné' }
];


const KA1_SUPPORT_TYPE_OPTIONS_ = [
  'Depist\u00e1\u017e',
  'Soci\u00e1ln\u00ed \u0161et\u0159en\u00ed / mapov\u00e1n\u00ed situace',
  'Z\u00e1kladn\u00ed soci\u00e1ln\u00ed poradenstv\u00ed',
  'Ter\u00e9nn\u00ed soci\u00e1ln\u00ed pr\u00e1ce',
  'Doprovod klienta',
  'Odborné sociální poradenství',
  'Krizov\u00e1 intervence',
  'Vyhodnocen\u00ed spolupr\u00e1ce / ukon\u010den\u00ed podpory'
];

const KA1_SUPPORT_AREA_OPTIONS_ = [
  'bydlen\u00ed', 'finance/dluhy', 'zam\u011bstn\u00e1n\u00ed', 'rodina', 'zdrav\u00ed',
  'bezpe\u010d\u00ed', 'vzd\u011bl\u00e1n\u00ed', 'slu\u017eby', 'pr\u00e1va/povinnosti', 'jin\u00e9'
];

const KA1_SERVICE_FORM_OPTIONS_ = ['ambulantn\u00ed', 'ter\u00e9nn\u00ed', 'Telefonn\u00ed'];
const WORKER_OPTIONS_ = ['Lea Ledecká, Dis.', 'Bc. Josef Jakubec', 'Mgr. Radka Vysloužilová'];

const YES_NO_OPTIONS_ = ['Ano', 'Ne'];

function syncKa01SheetStructure() {
  let sheet = getOrCreateSheet_(CONFIG.performanceSheetName, PERFORMANCE_HEADERS_);
  let headers = getHeaders_(sheet);
  for (let index = headers.length - 1; index >= 0; index -= 1) {
    if (!PERFORMANCE_HEADERS_.includes(headers[index])) sheet.deleteColumn(index + 1);
  }
  sheet = getOrCreateSheet_(CONFIG.performanceSheetName, PERFORMANCE_HEADERS_);
  headers = getHeaders_(sheet);
  setColumnListValidation_(sheet, headers, 'typ_podpory', KA1_SUPPORT_TYPE_OPTIONS_);
  setColumnListValidation_(sheet, headers, 'tema_podpory', KA1_SUPPORT_AREA_OPTIONS_);
  setColumnListValidation_(sheet, headers, 'forma_poskytovani', KA1_SERVICE_FORM_OPTIONS_);
  return {
    sheetName: sheet.getName(),
    headerCount: headers.length,
    expectedHeaderCount: PERFORMANCE_HEADERS_.length
  };
}

function setColumnListValidation_(sheet, headers, header, values) {
  const column = headers.indexOf(header) + 1;
  if (!column) throw new Error('Missing column for validation: ' + header);
  const rowCount = Math.max(sheet.getMaxRows() - CONFIG.headerRow, 1);
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(values, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(CONFIG.headerRow + 1, column, rowCount, 1).setDataValidation(rule);
}

// Formaty a validace patri do jednorazove udrzby struktury, ne do kazdeho zapisu.
// Funkci lze po nasazeni spustit rucne; authorizeOnce ji vola automaticky.
function configureWriteSheetFormats() {
  return configureWriteSheetFormats_(getSpreadsheet_());
}

function configureWriteSheetFormats_(spreadsheet) {
  const clientSheet = spreadsheet.getSheetByName(CONFIG.sheetName);
  if (!clientSheet) throw new Error('Missing sheet: ' + CONFIG.sheetName);
  const clientHeaders = ensureHeaders_(clientSheet, ['klicovy_pracovnik', 'rodina']);
  setColumnListValidation_(clientSheet, clientHeaders, 'klicovy_pracovnik', WORKER_OPTIONS_);
  setColumnListValidation_(clientSheet, clientHeaders, 'rodina', YES_NO_OPTIONS_);
  setClientDateFormats_(clientSheet, clientHeaders);

  const performanceSheet = getOrCreateSheet_(CONFIG.performanceSheetName, PERFORMANCE_HEADERS_, spreadsheet);
  setSheetDateFormats_(performanceSheet, getHeaders_(performanceSheet), ['datum']);

  const meetingSheet = getOrCreateSheet_(CONFIG.meetingSheetName, MEETING_HEADERS_, spreadsheet);
  setSheetDateFormats_(meetingSheet, getHeaders_(meetingSheet), ['datum']);

  const networkMeetingSheet = getOrCreateSheet_(CONFIG.networkMeetingSheetName, NETWORK_MEETING_HEADERS_, spreadsheet);
  setSheetDateFormats_(networkMeetingSheet, getHeaders_(networkMeetingSheet), ['datum']);

  const partnerSheet = spreadsheet.getSheetByName(CONFIG.partnerSheetName);
  if (partnerSheet) setSheetDateFormats_(partnerSheet, getHeaders_(partnerSheet), ['datum_zapojeni']);

  const educationSheet = getOrCreateSheet_(CONFIG.educationSheetName, EDUCATION_HEADERS_, spreadsheet);
  const educationHeaders = getHeaders_(educationSheet);
  ['jmeno_pracovnika', 'jmeno_pracovnika1', 'jmeno_pracovnika2', 'jmeno_pracovnika3'].forEach((header) => {
    setColumnListValidation_(educationSheet, educationHeaders, header, WORKER_OPTIONS_);
  });
  setSheetDateFormats_(educationSheet, educationHeaders, ['datum']);

  const supervisionSheet = getOrCreateSheet_(CONFIG.supervisionSheetName, SUPERVISION_HEADERS_, spreadsheet);
  const supervisionHeaders = getHeaders_(supervisionSheet);
  setColumnListValidation_(supervisionSheet, supervisionHeaders, 'typ_supervize', SUPERVISION_TYPE_OPTIONS_);
  setSheetDateFormats_(supervisionSheet, supervisionHeaders, ['datum']);

  const statisticsSheet = getOrCreateSheet_(CONFIG.statisticsSheetName, STATISTICS_HEADERS_, spreadsheet);
  setSheetDateFormats_(statisticsSheet, getHeaders_(statisticsSheet), ['datum']);

  return {
    ok: true,
    sheets: [
      clientSheet.getName(), performanceSheet.getName(), meetingSheet.getName(), networkMeetingSheet.getName(),
      ...(partnerSheet ? [partnerSheet.getName()] : []),
      educationSheet.getName(), supervisionSheet.getName(), statisticsSheet.getName()
    ]
  };
}
const MEETING_HEADERS_ = [
  'meeting_id', 'klient_id', 'case_management_id', 'datum', 'cas_od', 'cas_do', 'pocet_hodin', 'pracovnik',
  'typ_podpory', 'tema_podpory', 'forma_poskytovani', 'cil_ip_id', 'cil_ip', 'partner_ids', 'partneri', 'ucastnici', 'pocet_akteru',
  'popis', 'vysledek', 'dalsi_krok', 'dokument_text', 'document_url', 'document_error', 'status', 'created_at', 'created_by', 'updated_at', 'updated_by'
];
const NETWORK_MEETING_HEADERS_ = [
  'schuzka_site_id', 'datum', 'cas_od', 'cas_do', 'typ_schuzky', 'misto', 'pracovnik',
  'partner_ids', 'rt_clenove', 'dalsi_osoby', 'partneri', 'obsah_jednani', 'vystup', 'dalsi_kroky', 'dokument_text',
  'status', 'created_at', 'created_by', 'updated_at', 'updated_by'
];
const EDUCATION_HEADERS_ = [
  'vzdelavani_id', 'datum', 'pocet_hodin', 'nazev_vzdelavani', 'cislo_akreditace', 'jmeno_pracovnika',
  'jmeno_pracovnika1', 'jmeno_pracovnika2', 'jmeno_pracovnika3',
  'status', 'created_at', 'created_by', 'updated_at', 'updated_by'
];
const SUPERVISION_HEADERS_ = [
  'sepervize_id', 'datum', 'pocet_hodin', 'typ_supervize', 'jmeno_pracovnika1', 'jmeno_pracovnika2', 'jmeno_pracovnika3',
  'status', 'created_at', 'created_by', 'updated_at', 'updated_by'
];
const SUPERVISION_TYPE_OPTIONS_ = ['individuální', 'skupinová'];

const CLIENT_DATE_HEADERS_ = [
  'datum_narozeni',
  'datum_vstupu_do_projektu',
  'datum_vystupu_z_projektu',
  'case_management_od'
];

function toSheetDateValue_(value) {
  if (!value || value instanceof Date) return value || '';
  const text = String(value).trim();
  const normalized = normalizeDateString_(text);
  if (!normalized) {
    const error = new Error('Neplatne datum: ' + text + '. Pouzijte format RRRR-MM-DD nebo D.M.RRRR.');
    error.code = 'VALIDATION';
    throw error;
  }
  const parts = normalized.split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
}

function normalizeDateString_(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/);
  const czechMatch = text.match(/^(\d{1,2})[.\/]\s*(\d{1,2})[.\/]\s*(\d{4})\.?$/);
  const year = Number(isoMatch ? isoMatch[1] : czechMatch && czechMatch[3]);
  const month = Number(isoMatch ? isoMatch[2] : czechMatch && czechMatch[2]);
  const day = Number(isoMatch ? isoMatch[3] : czechMatch && czechMatch[1]);
  if (!year || !month || !day) return '';
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() + 1 !== month || check.getUTCDate() !== day) return '';
  return String(year).padStart(4, '0') + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
}

function mapSheetWriteValues_(headers, normalized, dateHeaders) {
  const dateHeaderSet = new Set(dateHeaders || []);
  return headers.map(function(header) {
    return dateHeaderSet.has(header) ? toSheetDateValue_(normalized[header]) : normalized[header] ?? '';
  });
}

function setClientDateFormats_(sheet, headers) {
  setSheetDateFormats_(sheet, headers, CLIENT_DATE_HEADERS_);
}

function setSheetDateFormats_(sheet, headers, dateHeaders) {
  (dateHeaders || []).forEach((header) => {
    const column = headers.indexOf(header) + 1;
    if (column) {
      sheet.getRange(CONFIG.headerRow + 1, column, Math.max(sheet.getMaxRows() - CONFIG.headerRow, 1), 1).setNumberFormat('dd.MM.yyyy');
    }
  });
}

function listClients_(spreadsheet) {
  const sheet = getSheetForRead_(CONFIG.sheetName, spreadsheet);
  if (!sheet) throw new Error('Missing sheet: ' + CONFIG.sheetName);
  const headers = getHeaders_(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow <= CONFIG.headerRow) return [];

  return sheet
    .getRange(CONFIG.headerRow + 1, 1, lastRow - CONFIG.headerRow, headers.length)
    .getValues()
    .filter((row) => row.some((cell) => cell !== ''))
    .map((row) => rowToObject_(headers, row))
    .filter((client) => !normalizeDuplicateText_(client.status).startsWith('smaz'));
}

const CLIENT_FILE_PREVIEW_MAX_BYTES_ = 4 * 1024 * 1024;
const CLIENT_FILE_PREVIEW_MAX_TEXT_LENGTH_ = 200000;
const CLIENT_FILE_PREVIEW_MAX_SHEETS_ = 6;
const CLIENT_FILE_PREVIEW_MAX_ROWS_ = 100;
const CLIENT_FILE_PREVIEW_MAX_COLUMNS_ = 30;

function isDirectChildFolder_(folder, parentId) {
  const expectedParentId = String(parentId || '').trim();
  if (!folder || !expectedParentId) return false;
  const parents = folder.getParents();
  while (parents.hasNext()) {
    if (parents.next().getId() === expectedParentId) return true;
  }
  return false;
}

function getClientFolderForBrowse_(clientId) {
  const id = String(clientId || '').trim();
  if (!id) throw new Error('Chybi klient_id.');

  const sheet = getSpreadsheet_().getSheetByName(CONFIG.sheetName);
  if (!sheet) throw new Error('Missing sheet: ' + CONFIG.sheetName);
  const headers = getHeaders_(sheet);
  const idColumn = headers.indexOf('klient_id') + 1;
  if (!idColumn) throw new Error('Missing klient_id column');
  const matchingRows = findClientRows_(sheet, idColumn, id);
  if (matchingRows.length !== 1) {
    throw new Error(matchingRows.length > 1
      ? 'Klient ma duplicitni zaznam; slozku nelze bezpecne zobrazit.'
      : 'Klient nebyl nalezen.');
  }

  const client = rowToObject_(
    headers,
    sheet.getRange(matchingRows[0], 1, 1, headers.length).getValues()[0]
  );
  if (normalizeDuplicateText_(client.status).startsWith('smaz')) {
    throw new Error('Slozku smazaneho klienta nelze zobrazit.');
  }

  const root = getClientFolderParent_();
  const linkedFolderId = extractDriveId_(client.drive_folder_url);
  let folder = null;
  if (linkedFolderId) {
    try {
      const linkedFolder = DriveApp.getFolderById(linkedFolderId);
      if (
        folderMatchesClientIdentity_(linkedFolder.getName(), client)
        && isDirectChildFolder_(linkedFolder, root.getId())
      ) folder = linkedFolder;
    } catch (error) {
      // Neplatny nebo zastaraly odkaz se bez zapisu dohleda podle klient_id.
    }
  }
  if (!folder) folder = findUniqueClientFolderById_(root, id);
  if (!folder) throw new Error('Slozka klienta nebyla nalezena.');
  if (!folderMatchesClientIdentity_(folder.getName(), client)) {
    throw new Error('Slozka neodpovida vybranemu klientovi. Nahled byl z bezpecnostnich duvodu zablokovan.');
  }
  return { client: client, folder: folder };
}

function clientFolderFileMetadata_(file) {
  const mimeType = String(file.getMimeType() || '');
  return {
    id: file.getId(),
    name: file.getName(),
    mimeType: mimeType,
    size: Number(file.getSize() || 0),
    updatedAt: file.getLastUpdated() ? file.getLastUpdated().toISOString() : '',
    url: file.getUrl(),
    previewable: mimeType === 'application/vnd.google-apps.document'
      || mimeType === 'application/vnd.google-apps.spreadsheet'
      || mimeType === 'application/pdf'
      || mimeType.indexOf('image/') === 0
      || mimeType.indexOf('text/') === 0
  };
}

function listClientFolderFiles_(clientId) {
  const context = getClientFolderForBrowse_(clientId);
  const files = [];
  const iterator = context.folder.getFiles();
  while (iterator.hasNext()) files.push(clientFolderFileMetadata_(iterator.next()));
  files.sort(function(left, right) {
    return String(right.updatedAt || '').localeCompare(String(left.updatedAt || ''))
      || String(left.name || '').localeCompare(String(right.name || ''), 'cs');
  });
  return {
    clientId: String(clientId || '').trim(),
    name: context.folder.getName(),
    url: context.folder.getUrl(),
    files: files
  };
}

function findClientFolderFile_(folder, fileId) {
  const id = String(fileId || '').trim();
  if (!id) throw new Error('Chybi file_id.');
  const files = folder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    if (file.getId() === id) return file;
  }
  throw new Error('Dokument nepatri do slozky vybraneho klienta. Nahled byl zablokovan.');
}

function blobPreviewData_(blob, mimeType) {
  const bytes = blob.getBytes();
  if (bytes.length > CLIENT_FILE_PREVIEW_MAX_BYTES_) {
    return {
      type: 'unavailable',
      message: 'Dokument je pro nahled v aplikaci prilis velky.'
    };
  }
  return {
    type: mimeType === 'application/pdf' ? 'pdf' : 'image',
    dataUrl: 'data:' + mimeType + ';base64,' + Utilities.base64Encode(bytes)
  };
}

function getClientFolderFilePreview_(clientId, fileId) {
  const context = getClientFolderForBrowse_(clientId);
  const file = findClientFolderFile_(context.folder, fileId);
  const metadata = clientFolderFileMetadata_(file);
  const mimeType = metadata.mimeType;
  let content;

  if (mimeType === 'application/vnd.google-apps.document') {
    try {
      content = blobPreviewData_(file.getAs('application/pdf'), 'application/pdf');
    } catch (error) {
      const text = String(DocumentApp.openById(file.getId()).getBody().getText() || '');
      content = {
        type: 'text',
        text: text.slice(0, CLIENT_FILE_PREVIEW_MAX_TEXT_LENGTH_),
        truncated: text.length > CLIENT_FILE_PREVIEW_MAX_TEXT_LENGTH_
      };
    }
  } else if (mimeType === 'application/vnd.google-apps.spreadsheet') {
    const workbook = SpreadsheetApp.openById(file.getId());
    content = {
      type: 'tables',
      tables: workbook.getSheets().slice(0, CLIENT_FILE_PREVIEW_MAX_SHEETS_).map(function(sheet) {
        const rowCount = Math.min(Math.max(sheet.getLastRow(), 1), CLIENT_FILE_PREVIEW_MAX_ROWS_);
        const columnCount = Math.min(Math.max(sheet.getLastColumn(), 1), CLIENT_FILE_PREVIEW_MAX_COLUMNS_);
        return {
          name: sheet.getName(),
          rows: sheet.getRange(1, 1, rowCount, columnCount).getDisplayValues(),
          truncated: sheet.getLastRow() > rowCount || sheet.getLastColumn() > columnCount
        };
      })
    };
  } else if (mimeType === 'application/pdf') {
    content = blobPreviewData_(file.getBlob(), 'application/pdf');
  } else if (mimeType.indexOf('image/') === 0) {
    content = blobPreviewData_(file.getBlob(), mimeType);
  } else if (mimeType.indexOf('text/') === 0) {
    const text = String(file.getBlob().getDataAsString('UTF-8') || '');
    content = {
      type: 'text',
      text: text.slice(0, CLIENT_FILE_PREVIEW_MAX_TEXT_LENGTH_),
      truncated: text.length > CLIENT_FILE_PREVIEW_MAX_TEXT_LENGTH_
    };
  } else {
    content = {
      type: 'unavailable',
      message: 'Tento typ souboru zatim nema nahled v aplikaci.'
    };
  }

  return Object.assign({}, metadata, content);
}

// Prime autoritativni kontrola jednoho radku. Zamerne nevyuziva CacheService,
// aby po nejasne odpovedi mazani nerozhodovala zastarala kopie seznamu.
function verifyClientDeletion_(clientId) {
  const id = String(clientId || '').trim();
  if (!id) throw new Error('Missing klient_id');
  const sheet = getSpreadsheet_().getSheetByName(CONFIG.sheetName);
  if (!sheet) throw new Error('Missing sheet: ' + CONFIG.sheetName);
  const headers = getHeaders_(sheet);
  const idColumn = headers.indexOf('klient_id') + 1;
  if (!idColumn) throw new Error('Missing klient_id column');
  const matchingRows = findClientRows_(sheet, idColumn, id);
  if (matchingRows.length !== 1) {
    return {
      klient_id: id,
      found: matchingRows.length > 0,
      duplicate: matchingRows.length > 1,
      deleted: false
    };
  }
  const values = sheet.getRange(matchingRows[0], 1, 1, headers.length).getValues()[0];
  const client = rowToObject_(headers, values);
  return {
    klient_id: id,
    found: true,
    duplicate: false,
    deleted: normalizeDuplicateText_(client.status).startsWith('smaz'),
    inactive: normalizeDuplicateText_(client.stav_klienta).startsWith('neaktiv'),
    status: String(client.status || ''),
    client_status: String(client.stav_klienta || ''),
    updated_at: String(client.updated_at || '')
  };
}

function saveClient_(client) {
  const sheet = getSpreadsheet_().getSheetByName(CONFIG.sheetName);
  if (!sheet) throw new Error('Missing sheet: ' + CONFIG.sheetName);
  const headers = ensureHeaders_(sheet, ['klicovy_pracovnik', 'rodina', 'address_mode']);
  const klientIdColumn = headers.indexOf('klient_id') + 1;
  if (!klientIdColumn) throw new Error('Missing klient_id column');

  const now = new Date();
  const incoming = Object.assign({}, client);
  incoming.klient_id = String(incoming.klient_id || '').trim();
  const existingRow = incoming.klient_id ? findClientRow_(sheet, klientIdColumn, incoming.klient_id) : null;
  if (incoming.klient_id && !existingRow) {
    throw new Error('Klienta s ID ' + incoming.klient_id + ' nelze najit. Ulozeni zastaveno, aby nedoslo k prepsani jineho klienta.');
  }

  const duplicateIdRows = incoming.klient_id ? findClientRows_(sheet, klientIdColumn, incoming.klient_id) : [];
  if (duplicateIdRows.length > 1) {
    throw new Error('V listu Klienti existuje duplicitni klient_id ' + incoming.klient_id + '. Ulozeni zastaveno, nejdrive oprav duplicitni radky.');
  }

  const duplicateRow = findDuplicateClientRow_(sheet, headers, incoming, existingRow);
  if (duplicateRow) {
    throw new Error('Klient uz v registru existuje na radku ' + duplicateRow + '. Ulozeni zastaveno, aby nevznikla duplicita nebo prepsani jineho klienta.');
  }

  incoming.klient_id = incoming.klient_id || nextClientId_(sheet, klientIdColumn);
  const existing = existingRow
    ? rowToObject_(headers, sheet.getRange(existingRow, 1, 1, headers.length).getValues()[0])
    : {};
  if (existingRow) assertRecordCanBeUpdated_(incoming.klient_id, existingRow, existing, 'Klient');
  assertExpectedVersion_(existing, incoming.expected_updated_at, 'Klienta ' + incoming.klient_id);
  delete incoming.expected_updated_at;
  const normalized = Object.assign({}, existing, incoming);
  normalized.updated_at = now;
  normalized.updated_by = incoming.updated_by || existing.updated_by || '';
  normalized.created_at = existing.created_at || incoming.created_at || now;
  normalized.created_by = existing.created_by || incoming.created_by || '';

  const targetRow = existingRow || sheet.getLastRow() + 1;
  const values = mapSheetWriteValues_(headers, normalized, CLIENT_DATE_HEADERS_);
  sheet.getRange(targetRow, 1, 1, headers.length).setValues([values]);

  return rowToObject_(headers, values);
}

function updateClientKeyWorker_(client) {
  const sheet = getSpreadsheet_().getSheetByName(CONFIG.sheetName);
  if (!sheet) throw new Error('Missing sheet: ' + CONFIG.sheetName);
  const headers = getHeaders_(sheet);
  const idColumn = headers.indexOf('klient_id') + 1;
  const workerColumn = headers.indexOf('klicovy_pracovnik') + 1;
  if (!idColumn || !workerColumn) throw new Error('Chybi sloupec klient_id nebo klicovy_pracovnik.');

  const clientId = String(client.klient_id || '').trim();
  if (!clientId) throw new Error('Missing klient_id');
  const matchingRows = findClientRows_(sheet, idColumn, clientId);
  if (matchingRows.length !== 1) {
    const error = new Error(matchingRows.length
      ? 'V listu Klienti existuje duplicitni klient_id ' + clientId + '.'
      : 'Klienta s ID ' + clientId + ' nelze najit.');
    error.code = matchingRows.length ? 'DUPLICATE' : 'NOT_FOUND';
    throw error;
  }

  const targetRow = matchingRows[0];
  const values = sheet.getRange(targetRow, 1, 1, headers.length).getValues()[0];
  const existing = rowToObject_(headers, values);
  assertRecordCanBeUpdated_(clientId, targetRow, existing, 'Klient');
  assertExpectedVersion_(existing, client.expected_updated_at, 'Klienta ' + clientId);

  const nextWorker = String(client.klicovy_pracovnik || '').trim();
  if (nextWorker && WORKER_OPTIONS_.indexOf(nextWorker) === -1) {
    const error = new Error('Neznamy klicovy pracovnik: ' + nextWorker);
    error.code = 'VALIDATION';
    throw error;
  }

  values[workerColumn - 1] = nextWorker;
  const updatedAtColumn = headers.indexOf('updated_at') + 1;
  const updatedByColumn = headers.indexOf('updated_by') + 1;
  if (updatedAtColumn) values[updatedAtColumn - 1] = new Date();
  if (updatedByColumn) values[updatedByColumn - 1] = client.updated_by || existing.updated_by || '';
  sheet.getRange(targetRow, 1, 1, headers.length).setValues([values]);
  return rowToObject_(headers, values);
}

function listPartners_(spreadsheet) {
  const sheet = (spreadsheet || getSpreadsheet_()).getSheetByName(CONFIG.partnerSheetName);
  if (!sheet) throw new Error('Missing sheet: ' + CONFIG.partnerSheetName);
  const headers = getHeaders_(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow <= CONFIG.headerRow) return [];

  return sheet
    .getRange(CONFIG.headerRow + 1, 1, lastRow - CONFIG.headerRow, headers.length)
    .getValues()
    .filter((row) => row.some((cell) => cell !== ''))
    .map((row) => rowToObject_(headers, row));
}

function savePartner_(partner) {
  const sheet = getSpreadsheet_().getSheetByName(CONFIG.partnerSheetName);
  if (!sheet) throw new Error('Missing sheet: ' + CONFIG.partnerSheetName);
  let headers = getHeaders_(sheet);
  ensureHeader_(sheet, headers, 'kontaktni_osoby_json');
  headers = getHeaders_(sheet);
  const partnerIdColumn = headers.indexOf('partner_id') + 1;
  if (!partnerIdColumn) throw new Error('Missing partner_id column');

  const now = new Date();
  let normalized = Object.assign({}, partner);
  normalized.nazev_subjektu = String(normalized.nazev_subjektu || '').trim();
  if (!normalized.nazev_subjektu) {
    const error = new Error('Chybi nazev subjektu. Ulozeni bylo zastaveno.');
    error.code = 'VALIDATION';
    throw error;
  }
  const incomingPartnerId = String(normalized.partner_id || '').trim();
  const existingRow = incomingPartnerId ? findPartnerRow_(sheet, partnerIdColumn, incomingPartnerId) : null;
  if (incomingPartnerId && !existingRow) {
    const error = new Error('Partnera s ID ' + incomingPartnerId + ' nelze najit. Ulozeni bylo zastaveno.');
    error.code = 'NOT_FOUND';
    throw error;
  }

  const nameMatches = findActivePartnerRowsByName_(
    sheet,
    headers,
    normalized.nazev_subjektu,
    existingRow
  );
  if (nameMatches.length) {
    if (!existingRow) {
      const incomingKey = buildRecordDuplicateKey_(normalized, 'partner_id');
      const idempotentMatch = nameMatches.find((match) => (
        buildRecordDuplicateKey_(match.record, 'partner_id') === incomingKey
      ));
      if (idempotentMatch) return idempotentMatch.record;
    }
    const error = new Error(
      'Subjekt ' + String(normalized.nazev_subjektu || '').trim()
      + ' uz v registru existuje. Obnovte data a upravte existujiciho aktera.'
    );
    error.code = 'DUPLICATE';
    throw error;
  }

  const existing = existingRow
    ? rowToObject_(headers, sheet.getRange(existingRow, 1, 1, headers.length).getValues()[0])
    : {};
  if (existingRow && normalizeDuplicateText_(existing.status).startsWith('smaz')) {
    const error = new Error('Partner ' + incomingPartnerId + ' je smazany a nelze jej upravit. Obnovte data.');
    error.code = 'CONFLICT';
    throw error;
  }
  assertExpectedVersion_(existing, normalized.expected_updated_at, 'Partnera ' + incomingPartnerId);
  delete normalized.expected_updated_at;
  normalized = Object.assign({}, existing, normalized);
  normalized.partner_id = normalized.partner_id || nextPartnerId_(sheet, partnerIdColumn);
  normalized.updated_at = now;
  normalized.updated_by = normalized.updated_by || '';
  normalized.created_at = existing.created_at || normalized.created_at || now;
  normalized.created_by = existing.created_by || normalized.created_by || '';

  const targetRow = existingRow || sheet.getLastRow() + 1;
  const values = mapSheetWriteValues_(headers, normalized, ['datum_zapojeni']);
  sheet.getRange(targetRow, 1, 1, headers.length).setValues([values]);

  return rowToObject_(headers, values);
}


function getIndividualPlanSheet_(spreadsheetOverride) {
  const spreadsheet = spreadsheetOverride || getSpreadsheet_();
  const existing = spreadsheet.getSheetByName(CONFIG.individualPlanSheetName);

  if (existing) {
    let headers = getHeaders_(existing);
    const legacySituationIndex = headers.indexOf('silne_stranky_limity');
    const situationIndex = headers.indexOf('popis_situace');

    if (legacySituationIndex >= 0) {
      if (situationIndex < 0) {
        existing.getRange(CONFIG.headerRow, legacySituationIndex + 1).setValue('popis_situace');
      } else {
        existing.deleteColumn(legacySituationIndex + 1);
      }
    }

    headers = getHeaders_(existing);
    const legacyBarriersIndex = headers.indexOf('identifikovane_bariery_potreby');
    if (legacyBarriersIndex >= 0) existing.deleteColumn(legacyBarriersIndex + 1);
  }

  return getOrCreateSheet_(CONFIG.individualPlanSheetName, INDIVIDUAL_PLAN_HEADERS_, spreadsheet);
}

function listIndividualPlans_(spreadsheet) {
  const sheet = getSheetForRead_(CONFIG.individualPlanSheetName, spreadsheet);
  if (!sheet) return [];
  const headers = getHeaders_(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow <= CONFIG.headerRow) return [];

  return sheet
    .getRange(CONFIG.headerRow + 1, 1, lastRow - CONFIG.headerRow, headers.length)
    .getValues()
    .filter((row) => row.some((cell) => cell !== ''))
    .map((row) => rowToObject_(headers, row));
}

function saveIndividualPlan_(individualPlan) {
  const sheet = getIndividualPlanSheet_();
  const headers = getHeaders_(sheet);
  const idColumn = headers.indexOf('plan_id') + 1;
  if (!idColumn) throw new Error('Missing plan_id column');

  const now = new Date();
  let normalized = Object.assign({}, individualPlan);
  const incomingPlanId = String(normalized.plan_id || '').trim();
  const clientId = String(normalized.klient_id || '').trim();
  if (!clientId) throw new Error('Individualni plan musi byt prirazen ke klientovi.');

  const existingRow = incomingPlanId ? findRowById_(sheet, idColumn, incomingPlanId) : null;
  const existing = existingRow
    ? rowToObject_(headers, sheet.getRange(existingRow, 1, 1, headers.length).getValues()[0])
    : {};
  assertRecordCanBeUpdated_(incomingPlanId, existingRow, existing, 'Individualni plan');
  assertRecordClientBinding_(existing, clientId, 'Individualni plan ' + incomingPlanId);
  assertExpectedVersion_(existing, normalized.expected_updated_at, 'Individualni plan ' + incomingPlanId);
  delete normalized.expected_updated_at;
  normalized = Object.assign({}, existing, normalized);
  if (!existingRow) {
    const exactDuplicateRow = findDuplicateRecordRow_(sheet, headers, normalized, 'plan_id');
    if (exactDuplicateRow) {
      return rowToObject_(headers, sheet.getRange(exactDuplicateRow, 1, 1, headers.length).getValues()[0]);
    }
  }

  const clientPlanRow = findRowByHeaderValue_(sheet, headers, 'klient_id', clientId, existingRow);
  if (clientPlanRow) {
    throw new Error('Klient uz ma individualni plan na radku ' + clientPlanRow + '. Druhy plan nebyl vytvoren.');
  }

  normalized.plan_id = normalized.plan_id || nextPrefixedId_(sheet, idColumn, 'PLAN');
  normalized.klient_id = clientId;
  normalized.updated_at = now;
  normalized.updated_by = normalized.updated_by || '';
  normalized.created_at = existing.created_at || normalized.created_at || now;
  normalized.created_by = existing.created_by || normalized.created_by || '';

  const targetRow = existingRow || sheet.getLastRow() + 1;
  const values = headers.map((header) => normalized[header] ?? '');
  sheet.getRange(targetRow, 1, 1, headers.length).setValues([values]);

  return rowToObject_(headers, values);
}

function listPerformances_(spreadsheet) {
  const sheet = getSheetForRead_(CONFIG.performanceSheetName, spreadsheet);
  if (!sheet) return [];
  const headers = getHeaders_(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow <= CONFIG.headerRow) return [];

  return sheet
    .getRange(CONFIG.headerRow + 1, 1, lastRow - CONFIG.headerRow, headers.length)
    .getValues()
    .filter((row) => row.some((cell) => cell !== ''))
    .map((row) => rowToObject_(headers, row));
}

function savePerformance_(performance) {
  const sheet = getOrCreateSheet_(CONFIG.performanceSheetName, PERFORMANCE_HEADERS_);
  const headers = getHeaders_(sheet);
  const idColumn = headers.indexOf('vykon_id') + 1;
  if (!idColumn) throw new Error('Missing vykon_id column');

  const now = new Date();
  let normalized = Object.assign({}, performance);
  const incomingPerformanceId = String(normalized.vykon_id || '').trim();
  normalized.vykon_id = normalized.vykon_id || nextPrefixedId_(sheet, idColumn, 'VYKON');
  normalized.updated_at = now;
  normalized.updated_by = normalized.updated_by || '';
  normalized.created_at = normalized.created_at || now;
  normalized.created_by = normalized.created_by || '';

  const existingRow = findRowById_(sheet, idColumn, normalized.vykon_id);
  const existing = existingRow
    ? rowToObject_(headers, sheet.getRange(existingRow, 1, 1, headers.length).getValues()[0])
    : {};
  assertRecordCanBeUpdated_(incomingPerformanceId, existingRow, existing, 'Vykon');
  assertRecordClientBinding_(existing, normalized.klient_id, 'Vykon ' + normalized.vykon_id);
  assertExpectedVersion_(existing, normalized.expected_updated_at, 'Vykon ' + normalized.vykon_id);
  delete normalized.expected_updated_at;
  normalized = Object.assign({}, existing, normalized);
  if (!String(normalized.klient_id || '').trim()) throw new Error('Vykon musi byt prirazen ke klientovi.');
  normalized.created_at = existing.created_at || normalized.created_at || now;
  normalized.created_by = existing.created_by || normalized.created_by || '';
  const duplicateRow = existingRow ? null : findDuplicateRecordRow_(sheet, headers, normalized, 'vykon_id');
  if (duplicateRow && !existingRow) {
    const duplicate = rowToObject_(headers, sheet.getRange(duplicateRow, 1, 1, headers.length).getValues()[0]);
    return finalizePerformanceAfterSheetCommit_(Object.assign({}, duplicate, {
      specificka_pole_json: normalized.specificka_pole_json || duplicate.specificka_pole_json
    }));
  }

  // Technicke sloupce dokumentu nesmi prazdny formular prepsat.
  normalized.document_url = normalized.document_url || existing.document_url || '';
  normalized.document_error = '';

  const targetRow = existingRow || sheet.getLastRow() + 1;
  const values = mapSheetWriteValues_(headers, normalized, ['datum']);
  sheet.getRange(targetRow, 1, 1, headers.length).setValues([values]);
  return finalizePerformanceAfterSheetCommit_(rowToObject_(headers, values));
}

function finalizePerformanceAfterSheetCommit_(saved) {
  let statisticsState = 'updated';
  try {
    upsertPerformanceStatistics_(saved);
  } catch (error) {
    statisticsState = 'repair_pending';
    console.error('Performance statistics update remains pending: ' + String(error.message || error));
  }
  const documentState = queueRecordDocumentAfterSheetCommit_('performance', saved);
  return Object.assign({}, saved, {
    sheet_committed: true,
    statistics_state: statisticsState,
    document_pending: documentState.pending,
    document_state: documentState.state,
    document_warning: documentState.warning
  });
}

function listStatistics_(spreadsheet) {
  const sheet = getSheetForRead_(CONFIG.statisticsSheetName, spreadsheet);
  if (!sheet) return [];
  const headers = getHeaders_(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow <= CONFIG.headerRow) return [];

  return sheet
    .getRange(CONFIG.headerRow + 1, 1, lastRow - CONFIG.headerRow, headers.length)
    .getValues()
    .filter((row) => row.some((cell) => cell !== ''))
    .map((row) => rowToObject_(headers, row));
}


function getKuSupportTypeCode_(performance, payload) {
  const candidates = [
    payload.kuSupportTypeCode,
    payload.typ_podpory_ku_kod,
    payload.ku_support_type_code,
    payload.supportSpecific && payload.supportSpecific.kuSupportTypeCode,
    payload.supportSpecific && payload.supportSpecific.typ_podpory_ku_kod,
    performance.kuSupportTypeCode,
    performance.typ_podpory_ku_kod,
    performance.ku_support_type_code
  ];
  for (const candidate of candidates) {
    const value = String(candidate || '').trim();
    if (value) return value;
  }
  return '';
}

function getKuSupportTypeLabel_(performance, payload) {
  const candidates = [
    payload.kuSupportTypeLabel,
    payload.typ_podpory_ku_text,
    payload.hodnota_text,
    performance.kuSupportTypeLabel,
    performance.typ_podpory_ku_text,
    performance.hodnota_text
  ];
  for (const candidate of candidates) {
    const value = String(candidate || '').trim();
    if (value) return value;
  }
  return '';
}

function upsertPerformanceStatistics_(performance) {
  const payload = parseJsonObject_(performance.specificka_pole_json);
  const selectedCode = getKuSupportTypeCode_(performance, payload);
  const sheet = getOrCreateSheet_(CONFIG.statisticsSheetName, STATISTICS_HEADERS_);
  const headers = getHeaders_(sheet);
  const sourceId = String(performance.vykon_id || '').trim();
  if (!sourceId) return;

  const existingRow = findStatisticRow_(sheet, headers, sourceId, KU_SUPPORT_STAT_TYPE_);
  const isDefault = !selectedCode || selectedCode === KU_SUPPORT_DEFAULT_CODE_;
  if (isDefault) {
    if (existingRow) updateStatisticStatus_(sheet, headers, existingRow, 'Ne');
    return;
  }

  const type = KU_SUPPORT_TYPES_.find((item) => item.code === selectedCode) || {
    code: selectedCode,
    group: 'Ostatní',
    name: getKuSupportTypeLabel_(performance, payload) || selectedCode
  };
  const now = new Date();
  const idColumn = headers.indexOf('statistika_id') + 1;
  if (!idColumn) throw new Error('Missing statistika_id column');
  const existing = existingRow
    ? rowToObject_(headers, sheet.getRange(existingRow, 1, 1, headers.length).getValues()[0])
    : {};
  const clientId = String(performance.klient_id || performance.client_id || '').trim();
  const date = formatDateValue_(performance.datum || payload.date || '');
  const normalized = Object.assign({}, existing, {
    statistika_id: existing.statistika_id || nextPrefixedId_(sheet, idColumn, 'STAT'),
    zdrojovy_zaznam_id: sourceId,
    client_id: clientId,
    client_name: getClientNameById_(clientId),
    datum: date,
    obdobi: buildStatisticsPeriod_(date),
    typ_statistiky: KU_SUPPORT_STAT_TYPE_,
    kod: type.code,
    skupina: type.group,
    nazev: type.name,
    hodnota_text: type.group ? type.group + ' / ' + type.name : type.name,
    // Sloupec status na existujicim listu Statistiky ma validaci Ano/Ne.
    status: 'Ano',
    created_at: existing.created_at || now,
    created_by: existing.created_by || performance.created_by || performance.updated_by || '',
    updated_at: now,
    updated_by: performance.updated_by || performance.created_by || ''
  });

  const targetRow = existingRow || sheet.getLastRow() + 1;
  sheet.getRange(targetRow, 1, 1, headers.length).setValues([mapSheetWriteValues_(headers, normalized, ['datum'])]);
}

function parseJsonObject_(value) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    return {};
  }
}

function findStatisticRow_(sheet, headers, sourceId, statisticType) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= CONFIG.headerRow) return null;
  const values = sheet.getRange(CONFIG.headerRow + 1, 1, lastRow - CONFIG.headerRow, headers.length).getValues();
  const index = values.findIndex((row) => {
    const item = rowToObject_(headers, row);
    return String(item.zdrojovy_zaznam_id || '').trim() === sourceId &&
      String(item.typ_statistiky || '').trim() === statisticType;
  });
  return index === -1 ? null : CONFIG.headerRow + 1 + index;
}

function updateStatisticStatus_(sheet, headers, rowNumber, status) {
  const statusColumn = headers.indexOf('status') + 1;
  const updatedAtColumn = headers.indexOf('updated_at') + 1;
  if (!statusColumn) throw new Error('Missing status column in Statistiky');
  sheet.getRange(rowNumber, statusColumn).setValue(status);
  if (updatedAtColumn) sheet.getRange(rowNumber, updatedAtColumn).setValue(new Date());
}

function deactivatePerformanceStatistics_(performanceId) {
  const sourceId = String(performanceId || '').trim();
  if (!sourceId) return;
  const sheet = getOrCreateSheet_(CONFIG.statisticsSheetName, STATISTICS_HEADERS_);
  const headers = getHeaders_(sheet);
  const rowNumber = findStatisticRow_(sheet, headers, sourceId, KU_SUPPORT_STAT_TYPE_);
  if (rowNumber) updateStatisticStatus_(sheet, headers, rowNumber, 'Ne');
}

function buildStatisticsPeriod_(dateValue) {
  const date = formatDateValue_(dateValue);
  return date ? date.slice(0, 7) : '';
}

function getClientNameById_(clientId) {
  if (!clientId) return '';
  const sheet = getSpreadsheet_().getSheetByName(CONFIG.sheetName);
  if (!sheet) return '';
  const headers = getHeaders_(sheet);
  const idColumn = headers.indexOf('klient_id') + 1;
  if (!idColumn) return '';
  const targetRow = findClientRow_(sheet, idColumn, clientId);
  if (!targetRow) return '';
  const client = rowToObject_(headers, sheet.getRange(targetRow, 1, 1, headers.length).getValues()[0]);
  return [client.jmeno, client.prijmeni].filter(Boolean).join(' ').trim();
}

function listMeetings_(spreadsheet) {
  const sheet = getSheetForRead_(CONFIG.meetingSheetName, spreadsheet);
  if (!sheet) return [];
  const headers = getHeaders_(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow <= CONFIG.headerRow) return [];

  return sheet
    .getRange(CONFIG.headerRow + 1, 1, lastRow - CONFIG.headerRow, headers.length)
    .getValues()
    .filter((row) => row.some((cell) => cell !== ''))
    .map((row) => rowToObject_(headers, row));
}

function deleteRecord_(sheetName, idHeader, id, expectedUpdatedAt, updatedBy) {
  if (!id) throw new Error('Missing id');
  const sheet = getOrCreateSheet_(sheetName, []);
  let headers = getHeaders_(sheet);
  ensureHeader_(sheet, headers, 'status');
  ensureHeader_(sheet, getHeaders_(sheet), 'updated_at');
  ensureHeader_(sheet, getHeaders_(sheet), 'updated_by');
  headers = getHeaders_(sheet);
  const idColumn = headers.indexOf(idHeader) + 1;
  if (!idColumn) throw new Error('Missing ' + idHeader + ' column');
  const targetRow = findRowById_(sheet, idColumn, id);
  if (!targetRow) throw new Error('Record not found: ' + id);
  const existing = rowToObject_(headers, sheet.getRange(targetRow, 1, 1, headers.length).getValues()[0]);
  if (normalizeDuplicateText_(existing.status).startsWith('smaz')) return existing;
  assertExpectedVersion_(existing, expectedUpdatedAt, 'Zaznam ' + id);
  const updated = Object.assign({}, existing, {
    status: 'Smazan\u00fd',
    updated_at: new Date(),
    updated_by: updatedBy || existing.updated_by || ''
  });
  sheet.getRange(targetRow, headers.indexOf('status') + 1).setValue(updated.status);
  sheet.getRange(targetRow, headers.indexOf('updated_at') + 1).setValue(updated.updated_at);
  sheet.getRange(targetRow, headers.indexOf('updated_by') + 1).setValue(updated.updated_by);
  return updated;
}

function deleteClient_(request, requestedBy, reportProgress) {
  const progress = typeof reportProgress === 'function' ? reportProgress : function() {};
  assertClientDeletionManager_(requestedBy);
  const spreadsheet = getSpreadsheet_();
  const sheet = spreadsheet.getSheetByName(CONFIG.sheetName);
  if (!sheet) throw new Error('Missing sheet: ' + CONFIG.sheetName);

  let headers = ensureHeaders_(sheet, [
    'status', 'stav_pred_smazanim', 'deleted_at', 'deleted_by', 'updated_at', 'updated_by'
  ]);
  const idColumn = headers.indexOf('klient_id') + 1;
  if (!idColumn) throw new Error('Missing klient_id column');
  const clientId = String(request.klient_id || request.id || '').trim();
  if (!clientId) throw new Error('Missing klient_id');
  const matchingRows = findClientRows_(sheet, idColumn, clientId);
  if (matchingRows.length !== 1) {
    const error = new Error(matchingRows.length
      ? 'V listu Klienti existuje duplicitni klient_id ' + clientId + '.'
      : 'Klienta s ID ' + clientId + ' nelze najit.');
    error.code = matchingRows.length ? 'DUPLICATE' : 'NOT_FOUND';
    throw error;
  }

  const targetRow = matchingRows[0];
  const clientValues = sheet.getRange(targetRow, 1, 1, headers.length).getValues()[0];
  const existing = rowToObject_(headers, clientValues);
  const alreadyDeleted = normalizeDuplicateText_(existing.status).startsWith('smaz');
  if (!alreadyDeleted) assertExpectedVersion_(existing, request.expected_updated_at, 'Klienta ' + clientId);
  progress({ phase: 'validated' });

  const now = new Date();
  const actor = String(requestedBy || '').trim();
  const performances = softDeleteClientRows_(
    spreadsheet, CONFIG.performanceSheetName, 'vykon_id', clientId, now, actor
  );
  progress({ phase: 'performances_deleted' });
  const meetings = softDeleteClientRows_(
    spreadsheet, CONFIG.meetingSheetName, 'meeting_id', clientId, now, actor
  );
  progress({ phase: 'meetings_deleted' });
  const plans = softDeleteClientRows_(
    spreadsheet, CONFIG.individualPlanSheetName, 'plan_id', clientId, now, actor
  );
  progress({ phase: 'plans_deleted' });

  // Statistiky a dokumentova fronta jsou pomocne oblasti. Jejich chyba nesmi
  // prerusit hlavni soft-delete klienta a zanechat jej v napul smazanem stavu.
  const cleanupWarnings = [];
  performances.ids.forEach(function(id) {
    try {
      deactivatePerformanceStatistics_(id);
    } catch (error) {
      cleanupWarnings.push('Statistiku vykonu ' + id + ' se nepodarilo deaktivovat: ' + String(error.message || error));
    }
    try {
      cancelRecordDocument_('performance', id);
    } catch (error) {
      cleanupWarnings.push('Frontu dokumentu vykonu ' + id + ' se nepodarilo zrusit: ' + String(error.message || error));
    }
  });
  meetings.ids.forEach(function(id) {
    try {
      cancelRecordDocument_('meeting', id);
    } catch (error) {
      cleanupWarnings.push('Frontu dokumentu zaznamu ' + id + ' se nepodarilo zrusit: ' + String(error.message || error));
    }
  });
  progress({ phase: 'derived_cleanup_attempted' });

  if (!alreadyDeleted) {
    const previousStatusColumn = headers.indexOf('stav_pred_smazanim');
    const clientStatusColumn = headers.indexOf('stav_klienta');
    const statusColumn = headers.indexOf('status');
    const deletedAtColumn = headers.indexOf('deleted_at');
    const deletedByColumn = headers.indexOf('deleted_by');
    const updatedAtColumn = headers.indexOf('updated_at');
    const updatedByColumn = headers.indexOf('updated_by');
    if (previousStatusColumn !== -1 && !clientValues[previousStatusColumn]) {
      clientValues[previousStatusColumn] = existing.stav_klienta || '';
    }
    if (clientStatusColumn !== -1) clientValues[clientStatusColumn] = 'Neaktivn\u00ed';
    if (statusColumn !== -1) clientValues[statusColumn] = 'Smazan\u00fd';
    if (deletedAtColumn !== -1) clientValues[deletedAtColumn] = now;
    if (deletedByColumn !== -1) clientValues[deletedByColumn] = actor;
    if (updatedAtColumn !== -1) clientValues[updatedAtColumn] = now;
    if (updatedByColumn !== -1) clientValues[updatedByColumn] = actor;
    sheet.getRange(targetRow, 1, 1, headers.length).setValues([clientValues]);
  }
  progress({ phase: 'client_deleted' });

  const archive = archiveDeletedClientFolder_(existing.drive_folder_url, clientId);
  if (archive.warning) cleanupWarnings.push(archive.warning);
  progress({ phase: 'archive_attempted' });
  return {
    klient_id: clientId,
    deleted: true,
    already_deleted: alreadyDeleted,
    performances: performances.count,
    meetings: meetings.count,
    individual_plans: plans.count,
    archived_folder_url: archive.url || '',
    archive_warning: cleanupWarnings.join(' ')
  };
}

function assertClientDeletionManager_(worker) {
  if (normalizeDuplicateText_(worker) !== normalizeDuplicateText_('Mgr. Radka Vyslou\u017eilov\u00e1')) {
    const error = new Error('Smazat celeho klienta muze pouze Mgr. Radka Vyslouzilova.');
    error.code = 'FORBIDDEN';
    throw error;
  }
}

function softDeleteClientRows_(spreadsheet, sheetName, idHeader, clientId, now, updatedBy) {
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) return { count: 0, ids: [] };
  let headers = ensureHeaders_(sheet, ['status', 'deleted_at', 'deleted_by', 'updated_at', 'updated_by']);
  const clientColumn = headers.indexOf('klient_id') + 1;
  const idColumn = headers.indexOf(idHeader) + 1;
  if (!clientColumn || !idColumn) return { count: 0, ids: [] };
  const rowCount = Math.max(sheet.getLastRow() - CONFIG.headerRow, 0);
  if (!rowCount) return { count: 0, ids: [] };
  const rows = sheet.getRange(CONFIG.headerRow + 1, 1, rowCount, headers.length).getValues();
  const ids = [];
  const rowsToDelete = [];

  rows.forEach(function(values, index) {
    if (String(values[clientColumn - 1] || '').trim() !== clientId) return;
    const id = String(values[idColumn - 1] || '').trim();
    if (id) ids.push(id);
    const statusIndex = headers.indexOf('status');
    if (normalizeDuplicateText_(values[statusIndex]).startsWith('smaz')) return;
    rowsToDelete.push(CONFIG.headerRow + 1 + index);
  });

  // Nezapisovat zpet cely radek. Starsi zaznam muze obsahovat hodnotu, ktera
  // uz neodpovida dnesnimu overeni dat v nekterem vecnem sloupci (napr. Ano/Ne).
  // Prepis celeho radku by pak shodil smazani klienta, prestoze tyto hodnoty
  // s mazanim nesouviseji. Menime proto pouze technicke sloupce a zapisujeme je
  // hromadne pres RangeList.
  setRowsColumnValue_(sheet, rowsToDelete, headers.indexOf('status') + 1, 'Smazan\u00fd');
  setRowsColumnValue_(sheet, rowsToDelete, headers.indexOf('deleted_at') + 1, now);
  setRowsColumnValue_(sheet, rowsToDelete, headers.indexOf('deleted_by') + 1, updatedBy || '');
  setRowsColumnValue_(sheet, rowsToDelete, headers.indexOf('updated_at') + 1, now);
  setRowsColumnValue_(sheet, rowsToDelete, headers.indexOf('updated_by') + 1, updatedBy || '');

  return { count: ids.length, changed: rowsToDelete.length, ids };
}

function setRowsColumnValue_(sheet, rowNumbers, columnNumber, value) {
  if (!sheet || !rowNumbers.length || columnNumber < 1) return;
  const columnLabel = columnNumberToLabel_(columnNumber);
  sheet.getRangeList(rowNumbers.map(function(rowNumber) {
    return columnLabel + rowNumber;
  })).setValue(value);
}

function columnNumberToLabel_(columnNumber) {
  let number = Number(columnNumber) || 0;
  let label = '';
  while (number > 0) {
    const remainder = (number - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    number = Math.floor((number - 1) / 26);
  }
  return label;
}

function findUniqueClientFolderById_(root, clientId) {
  const normalizedId = String(clientId || '').trim().toUpperCase();
  if (!root || !normalizedId) return null;
  const folders = root.getFolders();
  const matches = [];
  while (folders.hasNext()) {
    const folder = folders.next();
    const name = String(folder.getName() || '').trim().toUpperCase();
    if (name === normalizedId || name.indexOf(normalizedId + ' ') === 0) matches.push(folder);
  }
  if (matches.length > 1) {
    throw new Error('Pro ' + normalizedId + ' existuje vice klientskych slozek; automaticky presun byl zastaven.');
  }
  return matches.length === 1 ? matches[0] : null;
}

function archiveDeletedClientFolder_(folderUrl, clientId) {
  const folderId = extractDriveId_(folderUrl);
  try {
    let folder = null;
    if (folderId) {
      try {
        folder = DriveApp.getFolderById(folderId);
      } catch (folderError) {
        // Chybejici nebo zastaraly odkaz se nahradi bezpecnym dohledanim podle klient_id.
      }
    }
    if (!folder) folder = findUniqueClientFolderById_(getClientFolderParent_(), clientId);
    if (!folder) {
      return {
        url: String(folderUrl || ''),
        warning: 'Klient byl vyrazen z aplikace, ale jeho slozku se nepodarilo dohledat podle ' + String(clientId || 'klient_id') + '.'
      };
    }
    const archive = getDeletedClientsArchiveFolder_();
    folder.moveTo(archive);
    return { url: folder.getUrl(), warning: '' };
  } catch (error) {
    return {
      url: String(folderUrl || ''),
      warning: 'Klient byl vyrazen z aplikace, ale jeho slozku se nepodarilo presunout do archivu: ' + String(error.message || error)
    };
  }
}

// Jednorazove bezpecne dokonci drivejsi napul provedene smazani fiktivniho
// klienta KLIENT-0053. Funkce je idempotentni a pred zapisem overi presne ID i jmeno.
function finishLastovica0053DeletionAfterPartialFailure() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = getSpreadsheet_().getSheetByName(CONFIG.sheetName);
    if (!sheet) throw new Error('Missing sheet: ' + CONFIG.sheetName);
    const headers = getHeaders_(sheet);
    const idColumn = headers.indexOf('klient_id') + 1;
    if (!idColumn) throw new Error('Missing klient_id column');
    const rows = findClientRows_(sheet, idColumn, 'KLIENT-0053');
    if (rows.length !== 1) throw new Error('KLIENT-0053 musi mit prave jeden radek. Nalezeno: ' + rows.length + '.');
    const client = rowToObject_(headers, sheet.getRange(rows[0], 1, 1, headers.length).getValues()[0]);
    const normalizedName = normalizeDuplicateText_([client.jmeno, client.prijmeni].filter(Boolean).join(' '));
    if (normalizedName !== 'petr lastovica' && normalizedName !== 'lastovica petr') {
      throw new Error('Dokonceni zastaveno: KLIENT-0053 neni Petr Lastovica.');
    }
    const result = deleteClient_({
      klient_id: 'KLIENT-0053',
      expected_updated_at: client.updated_at
    }, 'Mgr. Radka Vyslouzilova');
    console.log(JSON.stringify(result, null, 2));
    return result;
  } finally {
    lock.releaseLock();
  }
}

function getDeletedClientsArchiveFolder_() {
  const clientRoot = getClientFolderParent_();
  const parents = clientRoot.getParents();
  const parent = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
  const existing = parent.getFoldersByName(CONFIG.deletedClientsArchiveName);
  return existing.hasNext() ? existing.next() : parent.createFolder(CONFIG.deletedClientsArchiveName);
}

// Rucni uprava v Google Sheetu take zmeni verzi radku. Programove zapisy z API
// tento trigger nespousteji a nastavuji updated_at primo v save funkci.
function onEdit(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  const watchedSheets = [
    CONFIG.sheetName,
    CONFIG.partnerSheetName,
    CONFIG.individualPlanSheetName,
    CONFIG.performanceSheetName,
    CONFIG.meetingSheetName,
    CONFIG.networkMeetingSheetName,
    CONFIG.educationSheetName,
    CONFIG.supervisionSheetName,
    CONFIG.statisticsSheetName
  ];
  if (!watchedSheets.includes(sheet.getName())) return;
  const readActions = SHEET_READ_ACTIONS_[sheet.getName()] || [];
  if (e.range.getRow() <= CONFIG.headerRow) {
    invalidateReadActions_(readActions);
    return;
  }

  try {
    const headers = getHeaders_(sheet);
    const updatedAtColumn = headers.indexOf('updated_at') + 1;
    if (!updatedAtColumn) return;
    const firstRow = Math.max(e.range.getRow(), CONFIG.headerRow + 1);
    const rowCount = e.range.getNumRows();
    const now = new Date();
    sheet.getRange(firstRow, updatedAtColumn, rowCount, 1).setValues(
      Array.from({ length: rowCount }, () => [now])
    );

    const updatedByColumn = headers.indexOf('updated_by') + 1;
    const editor = e.user && typeof e.user.getEmail === 'function' ? e.user.getEmail() : '';
    if (updatedByColumn && editor) {
      sheet.getRange(firstRow, updatedByColumn, rowCount, 1).setValues(
        Array.from({ length: rowCount }, () => [editor])
      );
    }
    SpreadsheetApp.flush();
  } finally {
    // Cache se smi zneplatnit az po zapsani nove verze radku. Jinak muze
    // soubezne cteni ulozit vecne novy radek se starym updated_at.
    invalidateReadActions_(readActions);
  }
}

function buildBootstrapPayload_(requestedActions) {
  let spreadsheet = null;
  const sharedSpreadsheet = () => {
    if (!spreadsheet) spreadsheet = getSpreadsheet_();
    return spreadsheet;
  };
  const errors = [];
  const load = (action, fallback, loader) => {
    try {
      return readCachedDataset_(action, () => loader(sharedSpreadsheet()));
    } catch (error) {
      errors.push({ action: action, error: String(error.message || error) });
      return fallback;
    }
  };

  const definitions = [
    ['listClients', 'clients', (book) => listClients_(book)],
    ['listPerformances', 'performances', (book) => listPerformances_(book)],
    ['listMeetings', 'meetings', (book) => listMeetings_(book)],
    ['listIndividualPlans', 'individualPlans', (book) => listIndividualPlans_(book)],
    ['listNetworkMeetings', 'networkMeetings', (book) => listNetworkMeetings_(book)],
    ['listPartners', 'partners', (book) => listPartners_(book)],
    ['listEducation', 'education', (book) => listEducation_(book)],
    ['listSupervision', 'supervision', (book) => listSupervision_(book)],
    ['listStatistics', 'statistics', (book) => listStatistics_(book)]
  ];
  const selected = Array.isArray(requestedActions) && requestedActions.length
    ? new Set(requestedActions)
    : new Set(definitions.map((definition) => definition[0]));
  const payload = { ok: true, errors: errors };
  definitions.forEach(([action, property, loader]) => {
    if (selected.has(action)) payload[property] = load(action, [], loader);
  });
  return payload;
}

function buildClientDirectory_(clients) {
  return (clients || []).map((client) => ({
    klient_id: client.klient_id || '',
    jmeno: client.jmeno || '',
    prijmeni: client.prijmeni || '',
    stav_klienta: client.stav_klienta || client.status || '',
    klicovy_pracovnik: client.klicovy_pracovnik || '',
    updated_at: client.updated_at || ''
  }));
}

// Spustte jednou rucne po vlozeni kodu do samostatneho Apps Script projektu.
// U projektu navazaneho primo na tabulku je jednoduchy onEdit aktivni automaticky.
function installSpreadsheetEditTrigger() {
  const existing = ScriptApp.getProjectTriggers().find((trigger) => (
    trigger.getHandlerFunction() === 'onEdit'
    && trigger.getEventType() === ScriptApp.EventType.ON_EDIT
  ));
  if (existing) return 'Trigger onEdit uz je nainstalovany.';

  ScriptApp.newTrigger('onEdit')
    .forSpreadsheet(CONFIG.spreadsheetId)
    .onEdit()
    .create();
  return 'Trigger onEdit byl nainstalovany.';
}

function saveMeeting_(meeting) {
  const sheet = getOrCreateSheet_(CONFIG.meetingSheetName, MEETING_HEADERS_);
  const headers = getHeaders_(sheet);
  const idColumn = headers.indexOf('meeting_id') + 1;
  if (!idColumn) throw new Error('Missing meeting_id column');

  const now = new Date();
  let normalized = Object.assign({}, meeting);
  const incomingMeetingId = String(normalized.meeting_id || '').trim();
  normalized.meeting_id = normalized.meeting_id || nextPrefixedId_(sheet, idColumn, 'SETKANI');
  normalized.updated_at = now;
  normalized.updated_by = normalized.updated_by || '';

  const existingRow = findRowById_(sheet, idColumn, normalized.meeting_id);
  const existing = existingRow
    ? rowToObject_(headers, sheet.getRange(existingRow, 1, 1, headers.length).getValues()[0])
    : {};
  assertRecordCanBeUpdated_(incomingMeetingId, existingRow, existing, 'Setkani');
  assertRecordClientBinding_(existing, normalized.klient_id, 'Setkani ' + normalized.meeting_id);
  assertExpectedVersion_(existing, normalized.expected_updated_at, 'Setkani ' + normalized.meeting_id);
  delete normalized.expected_updated_at;
  normalized = Object.assign({}, existing, normalized);
  if (!String(normalized.klient_id || '').trim()) throw new Error('Setkani musi byt prirazeno ke klientovi.');
  normalized.created_at = existing.created_at || normalized.created_at || now;
  normalized.created_by = existing.created_by || normalized.created_by || '';
  const duplicateRow = existingRow ? null : findDuplicateRecordRow_(sheet, headers, normalized, 'meeting_id');
  if (duplicateRow && !existingRow) {
    return finalizeMeetingAfterSheetCommit_(
      rowToObject_(headers, sheet.getRange(duplicateRow, 1, 1, headers.length).getValues()[0])
    );
  }

  normalized.document_url = normalized.document_url || existing.document_url || '';
  normalized.document_error = '';

  const targetRow = existingRow || sheet.getLastRow() + 1;
  const values = mapSheetWriteValues_(headers, normalized, ['datum']);
  sheet.getRange(targetRow, 1, 1, headers.length).setValues([values]);
  return finalizeMeetingAfterSheetCommit_(rowToObject_(headers, values));
}

function finalizeMeetingAfterSheetCommit_(saved) {
  const documentState = queueRecordDocumentAfterSheetCommit_('meeting', saved);
  return Object.assign({}, saved, {
    sheet_committed: true,
    document_pending: documentState.pending,
    document_state: documentState.state,
    document_warning: documentState.warning
  });
}

function listNetworkMeetings_(spreadsheet) {
  const sheet = getSheetForRead_(CONFIG.networkMeetingSheetName, spreadsheet);
  if (!sheet) return [];
  const headers = getHeaders_(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow <= CONFIG.headerRow) return [];

  const range = sheet.getRange(CONFIG.headerRow + 1, 1, lastRow - CONFIG.headerRow, headers.length);
  const values = range.getValues();
  const displayValues = range.getDisplayValues();
  return values
    .map((row, index) => ({ row: row, displayRow: displayValues[index] }))
    .filter((item) => item.row.some((cell) => cell !== ''))
    .map((item) => rowToObject_(headers, item.row, item.displayRow));
}

function saveNetworkMeeting_(networkMeeting) {
  const sheet = getOrCreateSheet_(CONFIG.networkMeetingSheetName, NETWORK_MEETING_HEADERS_);
  const headers = getHeaders_(sheet);
  const meetingIdColumn = headers.indexOf('schuzka_site_id') + 1;
  if (!meetingIdColumn) throw new Error('Missing schuzka_site_id column');

  const now = new Date();
  let normalized = Object.assign({}, networkMeeting);
  const incomingMeetingId = String(normalized.schuzka_site_id || '').trim();
  const existingRow = incomingMeetingId ? findNetworkMeetingRow_(sheet, meetingIdColumn, incomingMeetingId) : null;
  const existing = existingRow
    ? rowToObject_(headers, sheet.getRange(existingRow, 1, 1, headers.length).getValues()[0])
    : {};
  assertRecordCanBeUpdated_(incomingMeetingId, existingRow, existing, 'Schuzka site');
  if (!incomingMeetingId) {
    const duplicateRow = findDuplicateRecordRow_(sheet, headers, normalized, 'schuzka_site_id');
    if (duplicateRow) {
      const duplicateRange = sheet.getRange(duplicateRow, 1, 1, headers.length);
      return rowToObject_(headers, duplicateRange.getValues()[0], duplicateRange.getDisplayValues()[0]);
    }
  }
  assertExpectedVersion_(existing, normalized.expected_updated_at, 'Schuzku site ' + incomingMeetingId);
  delete normalized.expected_updated_at;
  normalized = Object.assign({}, existing, normalized);
  normalized.schuzka_site_id = normalized.schuzka_site_id || nextNetworkMeetingId_(sheet, meetingIdColumn);
  normalized.updated_at = now;
  normalized.updated_by = normalized.updated_by || '';
  normalized.created_at = existing.created_at || normalized.created_at || now;
  normalized.created_by = existing.created_by || normalized.created_by || '';

  const targetRow = existingRow || sheet.getLastRow() + 1;
  const values = mapSheetWriteValues_(headers, normalized, ['datum']);
  const savedRange = sheet.getRange(targetRow, 1, 1, headers.length);
  savedRange.setValues([values]);

  return rowToObject_(headers, values);
}

function listEducation_(spreadsheet) {
  const sheet = getSheetForRead_(CONFIG.educationSheetName, spreadsheet);
  if (!sheet) return [];
  const headers = getHeaders_(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow <= CONFIG.headerRow) return [];

  const range = sheet.getRange(CONFIG.headerRow + 1, 1, lastRow - CONFIG.headerRow, headers.length);
  const values = range.getValues();
  const displayValues = range.getDisplayValues();
  return values
    .map((row, index) => ({ row: row, displayRow: displayValues[index] }))
    .filter((item) => item.row.some((cell) => cell !== ''))
    .map((item) => rowToObject_(headers, item.row, item.displayRow));
}

function saveEducation_(education) {
  const sheet = getOrCreateSheet_(CONFIG.educationSheetName, EDUCATION_HEADERS_);
  const headers = getHeaders_(sheet);
  const educationIdColumn = headers.indexOf('vzdelavani_id') + 1;
  if (!educationIdColumn) throw new Error('Missing vzdelavani_id column');

  const now = new Date();
  let normalized = Object.assign({}, education);
  const incomingEducationId = String(normalized.vzdelavani_id || '').trim();
  normalized.vzdelavani_id = normalized.vzdelavani_id || nextPrefixedId_(sheet, educationIdColumn, 'VZDELAVANI');
  normalized.jmeno_pracovnika = normalized.jmeno_pracovnika || normalized.jmeno_pracovnika1 || '';
  normalized.jmeno_pracovnika1 = normalized.jmeno_pracovnika1 || normalized.jmeno_pracovnika || '';
  normalized.updated_at = now;
  normalized.updated_by = normalized.updated_by || '';
  normalized.created_at = normalized.created_at || now;
  normalized.created_by = normalized.created_by || '';
  normalized.status = normalized.status || 'Platn\u00fd';

  const existingRow = findRowById_(sheet, educationIdColumn, normalized.vzdelavani_id);
  const existing = existingRow
    ? rowToObject_(headers, sheet.getRange(existingRow, 1, 1, headers.length).getValues()[0])
    : {};
  assertRecordCanBeUpdated_(incomingEducationId, existingRow, existing, 'Vzdelavani');
  assertExpectedVersion_(existing, normalized.expected_updated_at, 'Vzdelavani ' + normalized.vzdelavani_id);
  delete normalized.expected_updated_at;
  normalized = Object.assign({}, existing, normalized);
  normalized.created_at = existing.created_at || normalized.created_at || now;
  normalized.created_by = existing.created_by || normalized.created_by || '';
  const duplicateRow = incomingEducationId ? null : findDuplicateRecordRow_(sheet, headers, normalized, 'vzdelavani_id');
  if (duplicateRow && !existingRow) return rowToObject_(headers, sheet.getRange(duplicateRow, 1, 1, headers.length).getValues()[0]);

  const targetRow = existingRow || sheet.getLastRow() + 1;
  const values = mapSheetWriteValues_(headers, normalized, ['datum']);
  const savedRange = sheet.getRange(targetRow, 1, 1, headers.length);
  savedRange.setValues([values]);

  return rowToObject_(headers, values);
}

function listSupervision_(spreadsheet) {
  const sheet = getSheetForRead_(CONFIG.supervisionSheetName, spreadsheet);
  if (!sheet) return [];
  const headers = getHeaders_(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow <= CONFIG.headerRow) return [];

  const range = sheet.getRange(CONFIG.headerRow + 1, 1, lastRow - CONFIG.headerRow, headers.length);
  const values = range.getValues();
  const displayValues = range.getDisplayValues();
  return values
    .map((row, index) => ({ row: row, displayRow: displayValues[index] }))
    .filter((item) => item.row.some((cell) => cell !== ''))
    .map((item) => rowToObject_(headers, item.row, item.displayRow));
}

function saveSupervision_(supervision) {
  const sheet = getOrCreateSheet_(CONFIG.supervisionSheetName, SUPERVISION_HEADERS_);
  const headers = getHeaders_(sheet);
  const supervisionIdColumn = headers.indexOf('sepervize_id') + 1;
  if (!supervisionIdColumn) throw new Error('Missing sepervize_id column');

  const now = new Date();
  let normalized = Object.assign({}, supervision);
  const incomingSupervisionId = String(normalized.sepervize_id || '').trim();
  normalized.sepervize_id = normalized.sepervize_id || nextPrefixedId_(sheet, supervisionIdColumn, 'SUPERVIZE');

  const existingRow = findRowById_(sheet, supervisionIdColumn, normalized.sepervize_id);
  const existing = existingRow
    ? rowToObject_(headers, sheet.getRange(existingRow, 1, 1, headers.length).getValues()[0])
    : {};
  assertRecordCanBeUpdated_(incomingSupervisionId, existingRow, existing, 'Supervize');
  assertExpectedVersion_(existing, normalized.expected_updated_at, 'Supervizi ' + normalized.sepervize_id);
  delete normalized.expected_updated_at;
  normalized = Object.assign({}, existing, normalized);
  normalized.updated_at = now;
  normalized.updated_by = normalized.updated_by || '';
  normalized.created_at = existing.created_at || normalized.created_at || now;
  normalized.created_by = existing.created_by || normalized.created_by || '';
  normalized.status = normalized.status || 'Platn\u00fd';
  const duplicateRow = incomingSupervisionId ? null : findDuplicateRecordRow_(sheet, headers, normalized, 'sepervize_id');
  if (duplicateRow && !existingRow) return rowToObject_(headers, sheet.getRange(duplicateRow, 1, 1, headers.length).getValues()[0]);

  const targetRow = existingRow || sheet.getLastRow() + 1;
  const values = mapSheetWriteValues_(headers, normalized, ['datum']);
  const savedRange = sheet.getRange(targetRow, 1, 1, headers.length);
  savedRange.setValues([values]);

  return rowToObject_(headers, values);
}

function normalizeRecordDocumentType_(recordType) {
  const value = String(recordType || '').trim().toLowerCase();
  return value === 'performance' || value === 'meeting' ? value : '';
}

function recordDocumentKey_(recordType, recordId) {
  const type = normalizeRecordDocumentType_(recordType);
  const id = String(recordId || '').trim();
  if (!type || !id) throw new Error('Chybi typ nebo ID dokumentu zaznamu.');
  return type + ':' + id;
}

function readJsonProperty_(key, fallback) {
  try {
    const raw = PropertiesService.getScriptProperties().getProperty(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.warn('Invalid script property ' + key + ': ' + String(error.message || error));
    return fallback;
  }
}

function writeJsonProperty_(key, value) {
  PropertiesService.getScriptProperties().setProperty(key, JSON.stringify(value));
}

function readRecordDocumentStatuses_() {
  const statuses = readJsonProperty_(RECORD_DOCUMENT_STATUS_PROPERTY_, {});
  return statuses && typeof statuses === 'object' && !Array.isArray(statuses) ? statuses : {};
}

function writeRecordDocumentStatus_(key, patch) {
  const statusLock = LockService.getUserLock();
  statusLock.waitLock(30000);
  try {
    const statuses = readRecordDocumentStatuses_();
    statuses[key] = Object.assign({}, statuses[key] || {}, patch || {}, { updatedAt: new Date().toISOString() });
    const orderedKeys = Object.keys(statuses).sort((left, right) => (
      String(statuses[right].updatedAt || '').localeCompare(String(statuses[left].updatedAt || ''))
    ));
    orderedKeys.slice(120).forEach((oldKey) => delete statuses[oldKey]);
    writeJsonProperty_(RECORD_DOCUMENT_STATUS_PROPERTY_, statuses);
    return statuses[key];
  } finally {
    statusLock.releaseLock();
  }
}

function getRecordDocumentStatus_(recordType, recordId) {
  const key = recordDocumentKey_(recordType, recordId);
  const status = readRecordDocumentStatuses_()[key];
  const currentStatus = status || {
    key: key,
    recordType: normalizeRecordDocumentType_(recordType),
    recordId: String(recordId || '').trim(),
    state: 'unknown'
  };
  if (currentStatus.state !== 'ready') return currentStatus;

  try {
    const descriptor = getRecordDocumentDescriptor_(recordType);
    const snapshot = readRecordDocumentRow_(descriptor, recordId);
    return Object.assign({}, currentStatus, readClientFolderState_(snapshot.record.klient_id));
  } catch (error) {
    console.warn('Client folder state could not be attached to document status: ' + String(error.message || error));
    return currentStatus;
  }
}

function readRecordDocumentQueue_() {
  const queue = readJsonProperty_(RECORD_DOCUMENT_QUEUE_PROPERTY_, []);
  return Array.isArray(queue) ? queue : [];
}

function ensureRecordDocumentTrigger_(delayMs) {
  const exists = ScriptApp.getProjectTriggers().some((trigger) => (
    trigger.getHandlerFunction() === RECORD_DOCUMENT_TRIGGER_HANDLER_
  ));
  if (!exists) {
    ScriptApp.newTrigger(RECORD_DOCUMENT_TRIGGER_HANDLER_)
      .timeBased()
      .after(Math.max(Number(delayMs) || 1000, 1000))
      .create();
  }
}

function queueRecordDocument_(recordType, recordId, options) {
  const settings = options || {};
  const type = normalizeRecordDocumentType_(recordType);
  const id = String(recordId || '').trim();
  const key = recordDocumentKey_(type, id);
  const queue = readRecordDocumentQueue_();
  const existingIndex = queue.findIndex((job) => job && job.key === key);
  const existing = existingIndex >= 0 ? queue[existingIndex] : {};
  const attempts = settings.resetAttempts
    ? 0
    : Number.isFinite(Number(settings.attempts)) ? Number(settings.attempts) : Number(existing.attempts) || 0;
  const job = {
    key: key,
    recordType: type,
    recordId: id,
    attempts: attempts,
    requestedAt: new Date().toISOString(),
    notBefore: Number(settings.notBefore) || Date.now()
  };
  if (existingIndex >= 0) queue[existingIndex] = job;
  else queue.push(job);
  writeJsonProperty_(RECORD_DOCUMENT_QUEUE_PROPERTY_, queue);
  let status = writeRecordDocumentStatus_(key, {
    key: key,
    recordType: type,
    recordId: id,
    state: 'queued',
    attempts: attempts,
    error: settings.error ? String(settings.error) : ''
  });
  try {
    ensureRecordDocumentTrigger_(Math.max(job.notBefore - Date.now(), 1000));
  } catch (triggerError) {
    console.error('Document trigger could not be scheduled: ' + String(triggerError.message || triggerError));
    status = writeRecordDocumentStatus_(key, {
      state: 'queued',
      error: 'Dokument ceka ve fronte; chybi opravneni ke spusteni fronty.'
    });
  }
  return status;
}

function queueRecordDocumentAfterSheetCommit_(recordType, record) {
  const descriptor = getRecordDocumentDescriptor_(recordType);
  const recordId = String(record && record[descriptor.idHeader] || '').trim();
  const needsDocument = Boolean(
    recordId
    && String(record && record.klient_id || '').trim()
    && String(record && record.dokument_text || '').trim()
    && !normalizeDuplicateText_(record && record.status).startsWith('smaz')
  );
  if (!needsDocument) {
    return { pending: false, state: record && record.document_url ? 'ready' : 'not_required', warning: '' };
  }

  try {
    queueRecordDocument_(descriptor.type, recordId);
    return { pending: true, state: 'queued', warning: '' };
  } catch (error) {
    console.error('Document queue registration remains pending: ' + String(error.message || error));
    try {
      writeRecordDocumentStatus_(recordDocumentKey_(descriptor.type, recordId), {
        key: recordDocumentKey_(descriptor.type, recordId),
        recordType: descriptor.type,
        recordId: recordId,
        state: 'queue_error',
        attempts: 0,
        error: 'Zapis je ulozen; dokument ceka na opakovane zarazeni do fronty.'
      });
    } catch (statusError) {
      console.warn('Pending document status could not be written: ' + String(statusError.message || statusError));
    }
    return {
      pending: true,
      state: 'queue_error',
      warning: 'Zapis je ulozen; dokument se zaradi do fronty opakovane.'
    };
  }
}

function reconcileMissingRecordDocumentJobs_(maxJobs) {
  let remaining = Math.max(Number(maxJobs) || RECORD_DOCUMENT_BATCH_SIZE_, 1);
  const queuedKeys = new Set(readRecordDocumentQueue_().map((job) => String(job && job.key || '')));
  const descriptors = [getRecordDocumentDescriptor_('performance'), getRecordDocumentDescriptor_('meeting')];
  let queued = 0;

  descriptors.some((descriptor) => {
    if (remaining <= 0) return true;
    const sheet = getSpreadsheet_().getSheetByName(descriptor.sheetName);
    if (!sheet || sheet.getLastRow() <= CONFIG.headerRow) return false;
    const headers = getHeaders_(sheet);
    const values = sheet
      .getRange(CONFIG.headerRow + 1, 1, sheet.getLastRow() - CONFIG.headerRow, headers.length)
      .getValues();
    values.some((row) => {
      if (remaining <= 0) return true;
      const record = rowToObject_(headers, row);
      const recordId = String(record[descriptor.idHeader] || '').trim();
      const key = recordId ? recordDocumentKey_(descriptor.type, recordId) : '';
      const missingDocument = Boolean(
        recordId
        && String(record.klient_id || '').trim()
        && String(record.dokument_text || '').trim()
        && !String(record.document_url || '').trim()
        && !normalizeDuplicateText_(record.status).startsWith('smaz')
      );
      if (!missingDocument || queuedKeys.has(key)) return false;
      try {
        queueRecordDocument_(descriptor.type, recordId);
        queuedKeys.add(key);
        queued += 1;
        remaining -= 1;
      } catch (error) {
        console.warn('Missing document could not be requeued: ' + String(error.message || error));
      }
      return false;
    });
    return remaining <= 0;
  });
  return queued;
}

function queueRecordDocumentWithLock_(recordType, recordId, options) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return queueRecordDocument_(recordType, recordId, options);
  } finally {
    lock.releaseLock();
  }
}

function cancelRecordDocument_(recordType, recordId) {
  const key = recordDocumentKey_(recordType, recordId);
  const queue = readRecordDocumentQueue_().filter((job) => !job || job.key !== key);
  writeJsonProperty_(RECORD_DOCUMENT_QUEUE_PROPERTY_, queue);
  return writeRecordDocumentStatus_(key, {
    key: key,
    recordType: normalizeRecordDocumentType_(recordType),
    recordId: String(recordId || '').trim(),
    state: 'cancelled',
    error: ''
  });
}

function takeReadyRecordDocumentJob_() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const queue = readRecordDocumentQueue_();
    const now = Date.now();
    const index = queue.findIndex((job) => !Number(job.notBefore) || Number(job.notBefore) <= now);
    if (index < 0) return null;
    const job = queue.splice(index, 1)[0];
    writeJsonProperty_(RECORD_DOCUMENT_QUEUE_PROPERTY_, queue);
    return job;
  } finally {
    lock.releaseLock();
  }
}

function getRecordDocumentDescriptor_(recordType) {
  const type = normalizeRecordDocumentType_(recordType);
  if (type === 'performance') {
    return {
      type: type,
      sheetName: CONFIG.performanceSheetName,
      idHeader: 'vykon_id',
      readAction: 'listPerformances',
      activityName: 'KA1-Individu\u00e1ln\u00ed podpora',
      fallbackRecordType: 'Z\u00e1pis v\u00fdkonu'
    };
  }
  if (type === 'meeting') {
    return {
      type: type,
      sheetName: CONFIG.meetingSheetName,
      idHeader: 'meeting_id',
      readAction: 'listMeetings',
      activityName: 'KA2-Case management',
      fallbackRecordType: 'Z\u00e1pis case managementu'
    };
  }
  throw new Error('Neznamy typ dokumentu zaznamu.');
}

function readRecordDocumentRow_(descriptor, recordId) {
  const sheet = getSpreadsheet_().getSheetByName(descriptor.sheetName);
  if (!sheet) throw new Error('Missing sheet: ' + descriptor.sheetName);
  const headers = getHeaders_(sheet);
  const idColumn = headers.indexOf(descriptor.idHeader) + 1;
  if (!idColumn) throw new Error('Missing id column: ' + descriptor.idHeader);
  const targetRow = findRowById_(sheet, idColumn, recordId);
  if (!targetRow) {
    const error = new Error('Zaznam ' + recordId + ' nelze najit.');
    error.code = 'NOT_FOUND';
    throw error;
  }
  const values = sheet.getRange(targetRow, 1, 1, headers.length).getValues()[0];
  return { sheet: sheet, headers: headers, targetRow: targetRow, record: rowToObject_(headers, values) };
}

function writeRecordDocumentResult_(descriptor, recordId, documentUrl, documentError) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const current = readRecordDocumentRow_(descriptor, recordId);
    if (normalizeDuplicateText_(current.record.status).startsWith('smaz')) {
      const error = new Error('Zaznam byl smazan; dokument se nepripojuje.');
      error.code = 'NOT_FOUND';
      throw error;
    }
    const urlColumn = current.headers.indexOf('document_url') + 1;
    const errorColumn = current.headers.indexOf('document_error') + 1;
    if (urlColumn && documentUrl !== undefined) current.sheet.getRange(current.targetRow, urlColumn).setValue(documentUrl || '');
    if (errorColumn && documentError !== undefined) current.sheet.getRange(current.targetRow, errorColumn).setValue(documentError || '');
    invalidateReadActions_([descriptor.readAction]);
    return current.record;
  } finally {
    lock.releaseLock();
  }
}

function processRecordDocumentJob_(job) {
  const descriptor = getRecordDocumentDescriptor_(job.recordType);
  const key = recordDocumentKey_(job.recordType, job.recordId);
  writeRecordDocumentStatus_(key, {
    key: key,
    recordType: descriptor.type,
    recordId: job.recordId,
    state: 'processing',
    attempts: Number(job.attempts) || 0,
    error: ''
  });

  const snapshot = readRecordDocumentRow_(descriptor, job.recordId);
  if (normalizeDuplicateText_(snapshot.record.status).startsWith('smaz')) {
    throw new Error('Zaznam byl smazan; dokument se nevytvari.');
  }
  const snapshotVersion = versionToken_(snapshot.record.updated_at);
  const documentUrl = upsertClientRecordDocument_(
    snapshot.record,
    descriptor.activityName,
    snapshot.record.typ_podpory || descriptor.fallbackRecordType,
    snapshot.record.document_url
  );
  const current = writeRecordDocumentResult_(descriptor, job.recordId, documentUrl, '');
  const changedDuringGeneration = versionToken_(current.updated_at) !== snapshotVersion;
  const status = writeRecordDocumentStatus_(key, {
    state: changedDuringGeneration ? 'queued' : 'ready',
    attempts: Number(job.attempts) || 0,
    documentUrl: documentUrl || '',
    error: ''
  });
  if (changedDuringGeneration) {
    queueRecordDocumentWithLock_(descriptor.type, job.recordId, { resetAttempts: true });
  }
  return status;
}

function requeueFailedRecordDocument_(job, error) {
  const attempts = (Number(job.attempts) || 0) + 1;
  const message = String(error && (error.message || error) || 'Neznama chyba dokumentu.');
  const descriptor = getRecordDocumentDescriptor_(job.recordType);
  if (/smazan/i.test(message) || (error && error.code === 'NOT_FOUND')) {
    return writeRecordDocumentStatus_(recordDocumentKey_(job.recordType, job.recordId), {
      state: 'cancelled',
      attempts: attempts,
      documentUrl: '',
      error: message
    });
  }
  try {
    writeRecordDocumentResult_(descriptor, job.recordId, undefined, message);
  } catch (writeError) {
    console.warn('Document error could not be written: ' + String(writeError.message || writeError));
  }
  if (attempts < RECORD_DOCUMENT_MAX_ATTEMPTS_) {
    return queueRecordDocumentWithLock_(job.recordType, job.recordId, {
      attempts: attempts,
      error: message,
      notBefore: Date.now() + attempts * 15000
    });
  }
  return writeRecordDocumentStatus_(recordDocumentKey_(job.recordType, job.recordId), {
    state: 'error',
    attempts: attempts,
    documentUrl: '',
    error: message
  });
}

function runQueuedRecordDocuments() {
  deleteTriggersByHandler_(RECORD_DOCUMENT_TRIGGER_HANDLER_);
  try {
    reconcileMissingRecordDocumentJobs_(RECORD_DOCUMENT_BATCH_SIZE_);
  } catch (reconcileError) {
    console.warn('Missing document reconciliation skipped: ' + String(reconcileError.message || reconcileError));
  }
  for (let index = 0; index < RECORD_DOCUMENT_BATCH_SIZE_; index += 1) {
    const job = takeReadyRecordDocumentJob_();
    if (!job) break;
    try {
      processRecordDocumentJob_(job);
    } catch (error) {
      console.error('Record document job failed: ' + String(error.message || error));
      requeueFailedRecordDocument_(job, error);
    }
  }
  const remaining = readRecordDocumentQueue_();
  if (remaining.length) {
    const nextAt = remaining.reduce((earliest, job) => Math.min(earliest, Number(job.notBefore) || Date.now()), Infinity);
    ensureRecordDocumentTrigger_(Math.max(nextAt - Date.now(), 1000));
  }
}

function upsertClientRecordDocument_(record, activityName, recordType, currentUrl) {
  if (!record.klient_id || !record.dokument_text) return currentUrl || '';

  const clientContext = getClientDocumentContext_(record.klient_id);
  const title = buildRecordDocumentTitle_(record, activityName, recordType);
  const currentId = extractDriveId_(currentUrl);
  let doc;

  if (currentId) {
    try {
      doc = DocumentApp.openById(currentId);
      doc.setName(title);
      DriveApp.getFileById(currentId).moveTo(clientContext.folder);
    } catch (error) {
      doc = null;
    }
  }

  if (!doc) {
    const existing = findRecordDocumentsInFolder_(clientContext.folder, record.vykon_id || record.meeting_id);
    if (existing.length > 1) {
      throw new Error('DUPLICATE_DOCUMENT: Pro zaznam ' + (record.vykon_id || record.meeting_id) + ' existuje vice dokumentu. Spustte audit Drive.');
    }
    if (existing.length === 1) doc = DocumentApp.openById(existing[0].getId());
  }

  if (!doc) {
    doc = DocumentApp.create(title);
    DriveApp.getFileById(doc.getId()).moveTo(clientContext.folder);
  }

  fillRecordDocument_(doc, clientContext.client, record, activityName, recordType);
  return doc.getUrl();
}

function findRecordDocumentsInFolder_(folder, recordId) {
  const id = String(recordId || '').trim();
  if (!id) return [];
  const matches = [];
  const files = folder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    if (file.getMimeType() !== 'application/vnd.google-apps.document') continue;
    if (auditNameContainsId_(file.getName(), id)) matches.push(file);
  }
  return matches;
}

function getClientDocumentContext_(klientId) {
  const client = ensureClientFolder_(klientId);
  const folderId = extractDriveId_(client.drive_folder_url);
  if (!folderId) throw new Error('Klientska slozka nebyla po priprave nalezena.');
  return { client: client, folder: DriveApp.getFolderById(folderId) };
}

function readClientFolderState_(klientId) {
  const clientId = String(klientId || '').trim();
  if (!clientId) return { clientId: '', clientFolderUrl: '', monitoringListUrl: '' };

  const sheet = getSpreadsheet_().getSheetByName(CONFIG.sheetName);
  const headers = getHeaders_(sheet);
  const klientIdColumn = headers.indexOf('klient_id') + 1;
  if (!klientIdColumn) throw new Error('Missing klient_id column');
  const targetRow = findClientRow_(sheet, klientIdColumn, clientId);
  if (!targetRow) throw new Error('Client not found: ' + clientId);
  const client = rowToObject_(headers, sheet.getRange(targetRow, 1, 1, headers.length).getValues()[0]);
  return {
    clientId: clientId,
    clientFolderUrl: String(client.drive_folder_url || ''),
    monitoringListUrl: String(client.monitoring_list_url || '')
  };
}

function buildRecordDocumentTitle_(record, activityName, recordType) {
  const date = formatDateValue_(record.datum) || Utilities.formatDate(new Date(), CONFIG.timeZone, 'yyyy-MM-dd');
  const id = record.vykon_id || record.meeting_id || 'zaznam';
  return sanitizeFileName_([date, record.klient_id, activityName, recordType, id].filter(Boolean).join(' - '));
}

function fillRecordDocument_(doc, client, record, activityName, recordType) {
  const body = doc.getBody();
  body.clear();
  body.appendParagraph(activityName).setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph(recordType || 'Z\u00e1pis').setHeading(DocumentApp.ParagraphHeading.HEADING2);

  const meta = [
    ['Projekt', 'Podpora soci\u00e1ln\u00ed pr\u00e1ce v Moravsk\u00e9m Beroun\u011b II.'],
    ['Klient ID', record.klient_id || ''],
    ['Klient', [client.jmeno, client.prijmeni].filter(Boolean).join(' ')],
    ['Datum', formatDateValue_(record.datum)],
    ['\u010cas', [record.cas_od, record.cas_do].filter(Boolean).join(' - ')],
    ['Po\u010det hodin', record.pocet_hodin || ''],
    ['Pracovn\u00edk', record.pracovnik || ''],
    ['Stav', record.status || 'Platn\u00fd']
  ].filter(function(row) { return row[1] !== ''; });

  const table = body.appendTable(meta);
  for (let i = 0; i < table.getNumRows(); i++) {
    table.getRow(i).getCell(0).editAsText().setBold(true);
  }

  body.appendParagraph('Text z\u00e1pisu').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  String(record.dokument_text || '').split('\n').forEach(function(line) {
    body.appendParagraph(line || ' ');
  });
  doc.saveAndClose();
}

function ensureClientFolder_(klientId) {
  if (!klientId) throw new Error('Missing klient_id');

  const sheet = getSpreadsheet_().getSheetByName(CONFIG.sheetName);
  let headers = getHeaders_(sheet);
  const klientIdColumn = headers.indexOf('klient_id') + 1;
  const folderUrlColumn = ensureHeader_(sheet, headers, 'drive_folder_url');
  headers = getHeaders_(sheet);
  const monitoringUrlColumn = ensureHeader_(sheet, headers, 'monitoring_list_url');
  headers = getHeaders_(sheet);

  const targetRow = findClientRow_(sheet, klientIdColumn, klientId);
  if (!targetRow) throw new Error('Client not found: ' + klientId);

  const row = rowToObject_(headers, sheet.getRange(targetRow, 1, 1, headers.length).getValues()[0]);
  const folder = getOrCreateClientFolder_(row, sheet.getRange(targetRow, folderUrlColumn).getValue());
  const monitoringList = getOrCreateMonitoringList_(folder, row, sheet.getRange(targetRow, monitoringUrlColumn).getValue());

  const refreshedHeaders = getHeaders_(sheet);
  sheet.getRange(targetRow, refreshedHeaders.indexOf('drive_folder_url') + 1).setValue(folder.getUrl());
  sheet.getRange(targetRow, refreshedHeaders.indexOf('monitoring_list_url') + 1).setValue(monitoringList.getUrl());
  invalidateReadActions_(['listClients']);

  return rowToObject_(refreshedHeaders, sheet.getRange(targetRow, 1, 1, refreshedHeaders.length).getValues()[0]);
}

function getOrCreateClientFolder_(client, currentUrl) {
  const currentId = extractDriveId_(currentUrl);
  if (currentId) {
    try {
      return DriveApp.getFolderById(currentId);
    } catch (error) {
      // Když byla složka mezitím smazána nebo není dostupná, vytvoří se nová.
    }
  }

  const root = getClientFolderParent_();
  const existingFolder = findUniqueClientFolderById_(root, client && client.klient_id);
  return existingFolder || root.createFolder(buildClientFolderName_(client));
}

function getOrCreateMonitoringList_(folder, client, currentUrl) {
  const currentId = extractDriveId_(currentUrl);
  if (currentId) {
    try {
      const existing = SpreadsheetApp.openById(currentId);
      if (findMonitoringSheet_(existing)) {
        fillMonitoringList_(existing, client);
        return existing;
      }
    } catch (error) {
      // Nedostupny nebo smazany soubor se nahradi novou kopii sablony.
    }
  }

  return copyMonitoringTemplate_(folder, client);
}

function copyMonitoringTemplate_(folder, client) {
  if (!CONFIG.monitoringTemplateFileId) throw new Error('Není nastaveno ID šablony MON listu.');

  let template;
  try {
    template = DriveApp.getFileById(CONFIG.monitoringTemplateFileId);
  } catch (error) {
    throw new Error('Šablona MON listu není dostupná účtu, pod kterým je Apps Script nasazen. Nasdílejte soubor ' + CONFIG.monitoringTemplateFileId + ' tomuto účtu.');
  }

  const clientName = [client.jmeno, client.prijmeni].filter(Boolean).join(' ').trim() || client.klient_id || 'Klient';
  const targetName = sanitizeFileName_('MON list - ' + clientName);
  const copy = template.makeCopy(targetName, folder);
  copy.setDescription(JSON.stringify({
    projectName: CONFIG.projectName,
    projectCode: CONFIG.projectCode,
    generatedFromTemplateId: CONFIG.monitoringTemplateFileId
  }, null, 2));

  const spreadsheet = SpreadsheetApp.openById(copy.getId());
  fillMonitoringList_(spreadsheet, client);
  return spreadsheet;
}

function fillMonitoringList_(spreadsheet, client) {
  const sheet = findMonitoringSheet_(spreadsheet);
  if (!sheet) throw new Error('Zkopírovaná šablona neobsahuje list Monitorovací list.');

  const directValues = {
    C3: CONFIG.projectCode || "",
    C4: CONFIG.projectName || "",
    C5: CONFIG.beneficiaryName || "",
    C7: client.jmeno || "",
    C8: client.prijmeni || "",
    C9: formatDateValue_(client.datum_narozeni),
    C11: client.ulice || "",
    C12: client.mesto || "",
    C13: client.cislo_popisne || "",
    C14: client.psc || "",
    C15: [client.email, client.datova_schranka].filter(Boolean).join(' / '),
    C16: client.telefon || "",
    C17: client.spadove_mesto || "",
    C18: client.pohlavi || "",
    C19: client.postaveni_na_trhu_prace || "",
    C20: client.dosazene_vzdelani || "",
    C21: client.znevyhodneni || ""
  };

  Object.keys(directValues).forEach(function(cell) {
    sheet.getRange(cell).setValue(directValues[cell]);
  });

  const replacements = buildMonitoringReplacements_(client);
  spreadsheet.getSheets().forEach(function(targetSheet) {
    Object.keys(replacements).forEach(function(placeholder) {
      targetSheet.createTextFinder(placeholder).matchCase(true).replaceAllWith(replacements[placeholder] || "");
    });
  });
  SpreadsheetApp.flush();
}

function buildMonitoringReplacements_(client) {
  const address = [client.ulice, client.cislo_popisne].filter(Boolean).join(' ').trim();
  const addressLine = [address, client.psc, client.mesto].filter(Boolean).join(', ');
  return {
    '{{PROJECT_NAME}}': CONFIG.projectName || '',
    '{{PROJECT_CODE}}': CONFIG.projectCode || '',
    '{{BENEFICIARY_NAME}}': CONFIG.beneficiaryName || '',
    '{{CLIENT_NAME}}': [client.jmeno, client.prijmeni].filter(Boolean).join(' '),
    '{{CLIENT_ID}}': client.klient_id || '',
    '{{CLIENT_FIRST_NAME}}': client.jmeno || '',
    '{{CLIENT_LAST_NAME}}': client.prijmeni || '',
    '{{CLIENT_BIRTH_DATE}}': formatDateValue_(client.datum_narozeni),
    '{{CLIENT_ADDRESS}}': addressLine,
    '{{CLIENT_STREET}}': client.ulice || '',
    '{{CLIENT_CITY}}': client.mesto || '',
    '{{CLIENT_POSTAL_CODE}}': client.psc || '',
    '{{CLIENT_HOUSE_NUMBER}}': client.cislo_popisne || '',
    '{{CLIENT_GENDER}}': client.pohlavi || '',
    '{{CLIENT_LABOUR_STATUS}}': client.postaveni_na_trhu_prace || '',
    '{{CLIENT_EDUCATION}}': client.dosazene_vzdelani || '',
    '{{CLIENT_DISADVANTAGE}}': client.znevyhodneni || '',
    '{{CLIENT_PHONE}}': client.telefon || '',
    '{{CLIENT_EMAIL}}': client.email || ''
  };
}

function findMonitoringSheet_(spreadsheet) {
  const sheets = spreadsheet.getSheets();
  for (let index = 0; index < sheets.length; index += 1) {
    const candidate = sheets[index];
    const header = String(candidate.getRange('B1').getDisplayValue() || '').toLowerCase();
    if (header.includes('monitorovaci list') || header.includes('monitorovací list')) return candidate;
  }
  return null;
}

function getClientFolderParent_() {
  if (CONFIG.clientFoldersRootId) return DriveApp.getFolderById(CONFIG.clientFoldersRootId);

  const existing = DriveApp.getFoldersByName(CONFIG.clientFoldersRootName);
  return existing.hasNext() ? existing.next() : DriveApp.createFolder(CONFIG.clientFoldersRootName);
}

const BACKUP_STATUS_PROPERTY_ = 'FULL_BACKUP_STATUS_V1';
const BACKUP_QUEUED_HANDLER_ = 'runQueuedFullBackup';
const BACKUP_WEEKLY_HANDLER_ = 'runScheduledFullBackup';
const BACKUP_STALE_AFTER_MS_ = 15 * 60 * 1000;
const BACKUP_SAFE_RUNTIME_MS_ = 5 * 60 * 1000;
const BACKUP_PROGRESS_INTERVAL_MS_ = 3000;

function queueFullBackup_(requestedBy) {
  const current = normalizeBackupStatus_(readBackupStatus_(), new Date());
  if (current.state === 'queued' || current.state === 'running') return current;

  deleteTriggersByHandler_(BACKUP_QUEUED_HANDLER_);
  const status = {
    state: 'queued',
    source: 'manual',
    requestedBy: String(requestedBy || '').trim(),
    requestedAt: new Date().toISOString(),
    message: 'Záloha čeká na spuštění.'
  };
  writeBackupStatus_(status);
  if (!hasTrigger_(BACKUP_WEEKLY_HANDLER_)) installWeeklyBackupTrigger_();
  ScriptApp.newTrigger(BACKUP_QUEUED_HANDLER_).timeBased().after(1000).create();
  return Object.assign({}, status, { weeklyEnabled: hasTrigger_(BACKUP_WEEKLY_HANDLER_) });
}

function assertBackupManager_(worker) {
  const normalizedWorker = normalizeDuplicateText_(worker);
  const allowedWorkers = ['Mgr. Radka Vysloužilová', 'Odborný garant', 'Odborný garant projektu', 'Garant projektu']
    .map(normalizeDuplicateText_);
  if (!allowedWorkers.includes(normalizedWorker)) {
    throw new Error('Kompletni zalohu muze spravovat pouze Mgr. Radka Vyslouzilova.');
  }
}

function runQueuedFullBackup() {
  deleteTriggersByHandler_(BACKUP_QUEUED_HANDLER_);
  runFullBackupJob_('manual');
}

function runScheduledFullBackup() {
  runFullBackupJob_('scheduled');
}

function runFullBackupJob_(source) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  const startedAt = new Date();
  const runtime = {
    source: source || 'manual',
    startedAt: startedAt,
    startedAtMs: startedAt.getTime(),
    lastProgressAtMs: 0,
    processedFiles: 0
  };
  try {
    updateBackupProgress_(runtime, 'Připravuji export tabulky a klientských složek.', true);
    const result = createFullBackup_(runtime);
    writeBackupStatus_(Object.assign({
      state: 'success',
      source: source || 'manual',
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      message: 'Kompletní záloha byla vytvořena.'
    }, result));
  } catch (error) {
    writeBackupStatus_({
      state: 'error',
      source: source || 'manual',
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      message: String(error && error.message || error)
    });
    throw error;
  } finally {
    lock.releaseLock();
  }
}

function createFullBackup_(runtime) {
  const generatedAt = new Date();
  const zipName = buildBackupFileName_(generatedAt);
  const blobs = [];
  const usedArchivePaths = {};
  const manifest = {
    schemaVersion: 1,
    generatedAt: generatedAt.toISOString(),
    projectName: CONFIG.projectName,
    projectCode: CONFIG.projectCode,
    spreadsheetId: CONFIG.spreadsheetId,
    clientFoldersRootId: CONFIG.clientFoldersRootId,
    files: [],
    errors: []
  };

  const spreadsheetFile = DriveApp.getFileById(CONFIG.spreadsheetId);
  addFileToBackup_(spreadsheetFile, 'hlavni-tabulka', blobs, manifest, usedArchivePaths, runtime);

  const clientRoot = getClientFolderParent_();
  collectFolderForBackup_(clientRoot, 'klientske-slozky', blobs, manifest, usedArchivePaths, runtime);

  manifest.fileCount = manifest.files.length;
  manifest.errorCount = manifest.errors.length;
  blobs.push(Utilities.newBlob(JSON.stringify(manifest, null, 2), 'application/json', 'manifest.json'));

  if (manifest.errors.length) {
    throw new Error('Záloha nebyla vytvořena kompletně. Počet chyb při exportu: ' + manifest.errors.length + '.');
  }

  assertBackupRuntime_(runtime);
  updateBackupProgress_(runtime, 'Vytvářím výsledný ZIP archiv.', true);
  const zipBlob = Utilities.zip(blobs, zipName);
  const backupFolder = getBackupFolder_();
  const backupFile = backupFolder.createFile(zipBlob);
  backupFile.setDescription(JSON.stringify({
    projectName: CONFIG.projectName,
    projectCode: CONFIG.projectCode,
    generatedAt: generatedAt.toISOString(),
    fileCount: manifest.fileCount
  }));
  pruneOldBackups_(backupFolder, backupFile.getId());

  return {
    fileId: backupFile.getId(),
    fileName: backupFile.getName(),
    fileUrl: backupFile.getUrl(),
    downloadUrl: 'https://drive.google.com/uc?export=download&id=' + backupFile.getId(),
    fileCount: manifest.fileCount,
    errorCount: 0
  };
}

function collectFolderForBackup_(folder, path, blobs, manifest, usedArchivePaths, runtime) {
  assertBackupRuntime_(runtime);
  const files = folder.getFiles();
  while (files.hasNext()) addFileToBackup_(files.next(), path, blobs, manifest, usedArchivePaths, runtime);

  const folders = folder.getFolders();
  while (folders.hasNext()) {
    assertBackupRuntime_(runtime);
    const child = folders.next();
    collectFolderForBackup_(child, path + '/' + sanitizeBackupPathPart_(child.getName()), blobs, manifest, usedArchivePaths, runtime);
  }
}

function addFileToBackup_(file, path, blobs, manifest, usedArchivePaths, runtime) {
  assertBackupRuntime_(runtime);
  const originalName = file.getName();
  try {
    const spec = backupExportSpec_(file.getMimeType(), originalName);
    const blob = spec.exportMimeType
      ? exportGoogleFileBlob_(file.getId(), spec.exportMimeType)
      : file.getBlob();
    const requestedName = path + '/' + spec.fileName;
    const targetName = uniqueBackupArchivePath_(requestedName, usedArchivePaths || {});
    blob.setName(targetName);
    blobs.push(blob);
    manifest.files.push({
      id: file.getId(),
      sourceName: originalName,
      archivePath: targetName,
      sourceMimeType: file.getMimeType(),
      exportedMimeType: spec.exportMimeType || file.getMimeType(),
      updatedAt: file.getLastUpdated().toISOString()
    });
  } catch (error) {
    manifest.errors.push({
      id: file.getId(),
      name: originalName,
      path: path,
      error: String(error && error.message || error)
    });
  } finally {
    if (runtime) {
      runtime.processedFiles = Number(runtime.processedFiles || 0) + 1;
      updateBackupProgress_(runtime, 'Probíhá export tabulky a klientských složek.', false);
    }
  }
}

function assertBackupRuntime_(runtime) {
  if (!runtime || !runtime.startedAtMs) return;
  if (Date.now() - runtime.startedAtMs < BACKUP_SAFE_RUNTIME_MS_) return;
  throw new Error('Záloha překročila bezpečný časový limit. Nebyl vytvořen neúplný archiv; spusťte ji prosím znovu.');
}

function updateBackupProgress_(runtime, message, force) {
  if (!runtime) return;
  const now = new Date();
  if (!force && now.getTime() - Number(runtime.lastProgressAtMs || 0) < BACKUP_PROGRESS_INTERVAL_MS_) return;
  runtime.lastProgressAtMs = now.getTime();
  writeBackupStatus_({
    state: 'running',
    source: runtime.source || 'manual',
    startedAt: runtime.startedAt.toISOString(),
    heartbeatAt: now.toISOString(),
    processedFiles: Number(runtime.processedFiles || 0),
    message: message || 'Probíhá vytváření kompletní zálohy.'
  });
}

function uniqueBackupArchivePath_(requestedPath, usedArchivePaths) {
  const used = usedArchivePaths || {};
  const normalizedPath = String(requestedPath || 'soubor').toLowerCase();
  if (!used[normalizedPath]) {
    used[normalizedPath] = true;
    return requestedPath;
  }

  const slashIndex = requestedPath.lastIndexOf('/');
  const dotIndex = requestedPath.lastIndexOf('.');
  const hasExtension = dotIndex > slashIndex + 1;
  const base = hasExtension ? requestedPath.slice(0, dotIndex) : requestedPath;
  const extension = hasExtension ? requestedPath.slice(dotIndex) : '';
  let suffix = 2;
  let candidate;
  do {
    candidate = base + '-' + suffix + extension;
    suffix += 1;
  } while (used[candidate.toLowerCase()]);
  used[candidate.toLowerCase()] = true;
  return candidate;
}

function backupExportSpec_(mimeType, originalName) {
  const nativeExports = {
    'application/vnd.google-apps.document': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.docx'],
    'application/vnd.google-apps.spreadsheet': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.xlsx'],
    'application/vnd.google-apps.presentation': ['application/vnd.openxmlformats-officedocument.presentationml.presentation', '.pptx'],
    'application/vnd.google-apps.drawing': ['application/pdf', '.pdf']
  };
  const exportInfo = nativeExports[mimeType];
  const safeName = sanitizeBackupPathPart_(originalName || 'soubor');
  if (!exportInfo) return { exportMimeType: '', fileName: safeName };
  const extension = exportInfo[1];
  const fileName = safeName.toLowerCase().endsWith(extension) ? safeName : safeName + extension;
  return { exportMimeType: exportInfo[0], fileName: fileName };
}

function exportGoogleFileBlob_(fileId, mimeType) {
  const url = 'https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(fileId) + '/export?mimeType=' + encodeURIComponent(mimeType);
  const response = UrlFetchApp.fetch(url, {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  });
  const status = response.getResponseCode();
  if (status < 200 || status >= 300) throw new Error('Export z Google Drive selhal se stavem ' + status + '.');
  return response.getBlob();
}

function getBackupFolder_() {
  if (CONFIG.backupFolderId) return DriveApp.getFolderById(CONFIG.backupFolderId);
  const clientRoot = getClientFolderParent_();
  const parents = clientRoot.getParents();
  const parent = parents.hasNext() ? parents.next() : null;
  const existing = parent ? parent.getFoldersByName(CONFIG.backupFolderName) : DriveApp.getFoldersByName(CONFIG.backupFolderName);
  if (existing.hasNext()) return existing.next();
  return parent ? parent.createFolder(CONFIG.backupFolderName) : DriveApp.createFolder(CONFIG.backupFolderName);
}

function pruneOldBackups_(folder, keepFileId) {
  const backups = [];
  const files = folder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    if (file.getName().indexOf('kompletni-zaloha-') === 0) backups.push(file);
  }
  backups.sort(function(left, right) { return right.getDateCreated().getTime() - left.getDateCreated().getTime(); });
  backups.slice(Math.max(Number(CONFIG.backupRetentionCount) || 12, 1)).forEach(function(file) {
    if (file.getId() !== keepFileId) file.setTrashed(true);
  });
}

function installWeeklyBackupTrigger_() {
  deleteTriggersByHandler_(BACKUP_WEEKLY_HANDLER_);
  ScriptApp.newTrigger(BACKUP_WEEKLY_HANDLER_)
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.SUNDAY)
    .atHour(2)
    .create();
  return getBackupStatus_();
}

function getBackupStatus_() {
  const rawStatus = readBackupStatus_();
  const status = normalizeBackupStatus_(rawStatus, new Date());
  if (status.stale && !rawStatus.stale) writeBackupStatus_(status);
  try {
    status.weeklyEnabled = hasTrigger_(BACKUP_WEEKLY_HANDLER_);
  } catch (error) {
    if (!isTriggerAuthorizationError_(error)) throw error;
    status.weeklyEnabled = false;
    status.authorizationRequired = true;
    status.state = 'authorization_required';
    status.message = 'Automatické zálohy čekají na jednorázové povolení v Apps Scriptu. Spusťte funkci authorizeBackupTriggers a potvrďte oprávnění.';
  }
  status.retentionCount = Number(CONFIG.backupRetentionCount) || 12;
  return status;
}

function normalizeBackupStatus_(status, now) {
  const next = Object.assign({}, status || {});
  if (next.state !== 'queued' && next.state !== 'running') return next;
  const referenceValue = next.heartbeatAt || next.startedAt || next.requestedAt;
  const referenceTime = new Date(referenceValue || '').getTime();
  const nowTime = (now instanceof Date ? now : new Date(now || Date.now())).getTime();
  if (Number.isFinite(referenceTime) && Number.isFinite(nowTime) && nowTime - referenceTime <= BACKUP_STALE_AFTER_MS_) return next;
  return Object.assign({}, next, {
    state: 'error',
    stale: true,
    finishedAt: new Date(nowTime).toISOString(),
    message: 'Předchozí záloha se ve stanoveném čase nedokončila. Je možné ji spustit znovu.'
  });
}

function readBackupStatus_() {
  const raw = PropertiesService.getScriptProperties().getProperty(BACKUP_STATUS_PROPERTY_);
  if (!raw) return { state: 'idle', message: 'Záloha zatím nebyla vytvořena.' };
  try {
    return JSON.parse(raw);
  } catch (error) {
    return { state: 'error', message: 'Stav poslední zálohy nelze načíst.' };
  }
}

function writeBackupStatus_(status) {
  PropertiesService.getScriptProperties().setProperty(BACKUP_STATUS_PROPERTY_, JSON.stringify(status || {}));
}

function hasTrigger_(handler) {
  return getProjectTriggers_().some(function(trigger) {
    return trigger.getHandlerFunction() === handler;
  });
}

function deleteTriggersByHandler_(handler) {
  getProjectTriggers_().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === handler) ScriptApp.deleteTrigger(trigger);
  });
}

function getProjectTriggers_() {
  try {
    return ScriptApp.getProjectTriggers();
  } catch (error) {
    if (isTriggerAuthorizationError_(error)) {
      throw new Error('[TRIGGER_AUTH_REQUIRED] Nejdříve v editoru Apps Scriptu spusťte funkci authorizeBackupTriggers a potvrďte požadovaná oprávnění.');
    }
    throw error;
  }
}

function isTriggerAuthorizationError_(error) {
  const message = String(error && (error.message || error));
  return message.indexOf('[TRIGGER_AUTH_REQUIRED]') !== -1
    || message.indexOf('ScriptApp.getProjectTriggers') !== -1
    || message.indexOf('script.scriptapp') !== -1;
}

function buildBackupFileName_(date) {
  return 'kompletni-zaloha-' + Utilities.formatDate(date || new Date(), CONFIG.timeZone, 'yyyy-MM-dd-HHmmss') + '.zip';
}

function sanitizeBackupPathPart_(value) {
  return sanitizeFileName_(value).replace(/\.+$/g, '').slice(0, 180) || 'soubor';
}

function buildClientFolderName_(client) {
  const displayName = [client.prijmeni, client.jmeno].filter(Boolean).join(' ').trim();
  return sanitizeFileName_([client.klient_id, displayName].filter(Boolean).join(' - '));
}

function sanitizeFileName_(value) {
  return String(value || 'Klient').replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim();
}

function extractDriveId_(url) {
  const match = String(url || '').match(/[-\w]{25,}/);
  return match ? match[0] : '';
}

function formatDateValue_(value) {
  if (!value) return '';
  if (value instanceof Date) return Utilities.formatDate(value, CONFIG.timeZone, 'yyyy-MM-dd');
  return normalizeDateString_(value) || String(value).trim();
}

function ensureHeader_(sheet, headers, header) {
  const existingIndex = headers.indexOf(header);
  if (existingIndex !== -1) return existingIndex + 1;

  const nextColumn = headers.length + 1;
  if (sheet.getMaxColumns() < nextColumn) sheet.insertColumnAfter(sheet.getMaxColumns());
  sheet.getRange(CONFIG.headerRow, nextColumn).setValue(header);
  return nextColumn;
}

function ensureHeaders_(sheet, requiredHeaders, currentHeadersOverride) {
  const currentHeaders = Array.isArray(currentHeadersOverride) ? currentHeadersOverride : getHeaders_(sheet);
  const missingHeaders = requiredHeaders.filter((header) => !currentHeaders.includes(header));
  if (missingHeaders.length === 0) return currentHeaders;

  const firstNewColumn = currentHeaders.length + 1;
  const requiredColumnCount = currentHeaders.length + missingHeaders.length;
  if (sheet.getMaxColumns() < requiredColumnCount) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), requiredColumnCount - sheet.getMaxColumns());
  }
  sheet.getRange(CONFIG.headerRow, firstNewColumn, 1, missingHeaders.length).setValues([missingHeaders]);
  return currentHeaders.concat(missingHeaders);
}

function getOrCreateSheet_(sheetName, headers, spreadsheetOverride) {
  const spreadsheet = spreadsheetOverride || getSpreadsheet_();
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
    sheet.getRange(CONFIG.headerRow, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(CONFIG.headerRow);
    return sheet;
  }

  const currentHeaders = getHeaders_(sheet);
  if (currentHeaders.length === 0) {
    sheet.getRange(CONFIG.headerRow, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(CONFIG.headerRow);
    return sheet;
  }

  ensureHeaders_(sheet, headers, currentHeaders);
  return sheet;
}

function getHeaders_(sheet) {
  const lastColumn = sheet.getLastColumn();
  if (lastColumn < 1) return [];
  return sheet.getRange(CONFIG.headerRow, 1, 1, lastColumn).getValues()[0].filter(Boolean);
}

function rowToObject_(headers, row, displayRow) {
  return headers.reduce((acc, header, index) => {
    const value = row[index];
    if (header === 'cas_od' || header === 'cas_do') {
      if (displayRow && displayRow[index]) {
        acc[header] = displayRow[index];
      } else if (value instanceof Date) {
        acc[header] = Utilities.formatDate(value, CONFIG.timeZone, 'HH:mm');
      } else {
        acc[header] = value;
      }
    } else if ((header === 'created_at' || header === 'updated_at' || header === 'deleted_at') && value instanceof Date) {
      acc[header] = value.toISOString();
    } else if (value instanceof Date) {
      acc[header] = Utilities.formatDate(value, CONFIG.timeZone, 'yyyy-MM-dd');
    } else {
      acc[header] = value;
    }
    return acc;
  }, {});
}

function versionToken_(value) {
  if (value instanceof Date) return String(value.getTime());
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  const text = String(value == null ? '' : value).trim();
  if (!text) return '';
  const numeric = Number(text);
  if (Number.isFinite(numeric) && /^\d+$/.test(text)) return String(numeric);
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? text : String(parsed.getTime());
}

function assertExpectedVersion_(existing, expectedUpdatedAt, recordLabel) {
  const expected = versionToken_(expectedUpdatedAt);
  const current = versionToken_(existing && existing.updated_at);
  if (!current) return;
  if (current && current === expected) return;
  const error = new Error(
    'CONFLICT: ' + (recordLabel || 'Zaznam') + ' mezitim upravil jiny uzivatel. Obnovte data a zmenu provedte znovu.'
  );
  error.code = 'CONFLICT';
  throw error;
}

function assertRecordCanBeUpdated_(incomingId, existingRow, existing, recordLabel) {
  const id = String(incomingId || '').trim();
  if (!id) return;
  if (!existingRow) {
    const error = new Error((recordLabel || 'Zaznam') + ' s ID ' + id + ' nelze najit. Obnovte data.');
    error.code = 'NOT_FOUND';
    throw error;
  }
  if (normalizeDuplicateText_(existing && existing.status).startsWith('smaz')) {
    const error = new Error((recordLabel || 'Zaznam') + ' ' + id + ' je smazany a nelze jej upravit. Obnovte data.');
    error.code = 'CONFLICT';
    throw error;
  }
}

function assertRecordClientBinding_(existing, incomingClientId, recordLabel) {
  const currentClientId = String(existing && existing.klient_id || '').trim();
  const requestedClientId = String(incomingClientId || '').trim();
  if (!currentClientId || !requestedClientId || currentClientId === requestedClientId) return;
  const error = new Error(
    (recordLabel || 'Zaznam') + ' je ulozen u klienta ' + currentClientId
    + '. Pri uprave nelze vazbu zmenit na ' + requestedClientId + '. Vytvorte novy zaznam u spravneho klienta.'
  );
  error.code = 'CLIENT_BINDING_CONFLICT';
  throw error;
}


function normalizeDuplicateText_(value) {
  return String(value == null ? '' : value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function findDuplicateClientRow_(sheet, headers, incoming, excludedRow) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= CONFIG.headerRow) return null;

  const incomingFirstName = normalizeDuplicateText_(incoming.jmeno);
  const incomingLastName = normalizeDuplicateText_(incoming.prijmeni);
  if (!incomingFirstName || !incomingLastName) return null;

  const incomingBirthDate = formatDateValue_(incoming.datum_narozeni || '');
  const values = sheet.getRange(CONFIG.headerRow + 1, 1, lastRow - CONFIG.headerRow, headers.length).getValues();

  const index = values.findIndex((row, index) => {
    const sheetRow = CONFIG.headerRow + 1 + index;
    if (excludedRow && sheetRow === excludedRow) return false;
    const existing = rowToObject_(headers, row);
    if (normalizeDuplicateText_(existing.status).startsWith('smaz')) return false;
    if (normalizeDuplicateText_(existing.jmeno) !== incomingFirstName) return false;
    if (normalizeDuplicateText_(existing.prijmeni) !== incomingLastName) return false;

    const existingBirthDate = formatDateValue_(existing.datum_narozeni || '');
    if (incomingBirthDate && existingBirthDate) return incomingBirthDate === existingBirthDate;

    return true;
  });

  return index === -1 ? null : CONFIG.headerRow + 1 + index;
}

function buildRecordDuplicateKey_(record, idHeader) {
  const ignoredHeaders = [idHeader, 'expected_updated_at', 'document_url', 'document_error', 'status', 'created_at', 'created_by', 'updated_at', 'updated_by'];
  const object = Object.assign({}, record);
  ignoredHeaders.forEach((header) => delete object[header]);
  return JSON.stringify(Object.keys(object).sort().reduce((acc, key) => {
    let value = object[key];
    if (value instanceof Date) value = formatDateValue_(value);
    const normalized = normalizeDuplicateText_(value);
    if (normalized !== '') acc[key] = normalized;
    return acc;
  }, {}));
}

function findDuplicateRecordRow_(sheet, headers, incoming, idHeader) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= CONFIG.headerRow) return null;
  const incomingKey = buildRecordDuplicateKey_(incoming, idHeader);
  const values = sheet.getRange(CONFIG.headerRow + 1, 1, lastRow - CONFIG.headerRow, headers.length).getValues();
  const index = values.findIndex((row) => {
    const existing = rowToObject_(headers, row);
    if (normalizeDuplicateText_(existing.status).startsWith('smaz')) return false;
    return buildRecordDuplicateKey_(existing, idHeader) === incomingKey;
  });
  return index === -1 ? null : CONFIG.headerRow + 1 + index;
}

function findClientRow_(sheet, klientIdColumn, klientId) {
  const rows = findClientRows_(sheet, klientIdColumn, klientId);
  return rows[0] || null;
}

function findClientRows_(sheet, klientIdColumn, klientId) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= CONFIG.headerRow) return [];
  const targetId = String(klientId || '').trim();
  if (!targetId) return [];
  const values = sheet.getRange(CONFIG.headerRow + 1, klientIdColumn, lastRow - CONFIG.headerRow, 1).getValues();
  return values.reduce((rows, row, index) => {
    if (String(row[0] || '').trim() === targetId) rows.push(CONFIG.headerRow + 1 + index);
    return rows;
  }, []);
}

function nextClientId_(sheet, klientIdColumn) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= CONFIG.headerRow) return 'KLIENT-0001';
  const values = sheet.getRange(CONFIG.headerRow + 1, klientIdColumn, lastRow - CONFIG.headerRow, 1).getValues().flat();
  const max = values.reduce((highest, value) => {
    const number = Number(String(value || '').replace('KLIENT-', ''));
    return Number.isFinite(number) ? Math.max(highest, number) : highest;
  }, 0);
  return `KLIENT-${String(max + 1).padStart(4, '0')}`;
}

function findPartnerRow_(sheet, partnerIdColumn, partnerId) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= CONFIG.headerRow) return null;
  const targetId = String(partnerId || '').trim();
  if (!targetId) return null;
  const values = sheet.getRange(CONFIG.headerRow + 1, partnerIdColumn, lastRow - CONFIG.headerRow, 1).getValues();
  const index = values.findIndex((row) => String(row[0] || '').trim() === targetId);
  return index === -1 ? null : CONFIG.headerRow + 1 + index;
}

function findActivePartnerRowsByName_(sheet, headers, partnerName, excludedRow) {
  const normalizedName = normalizeDuplicateText_(partnerName);
  const lastRow = sheet.getLastRow();
  if (!normalizedName || lastRow <= CONFIG.headerRow) return [];

  const values = sheet.getRange(
    CONFIG.headerRow + 1,
    1,
    lastRow - CONFIG.headerRow,
    headers.length
  ).getValues();

  return values.reduce((matches, row, index) => {
    const rowNumber = CONFIG.headerRow + 1 + index;
    if (excludedRow && rowNumber === excludedRow) return matches;
    const record = rowToObject_(headers, row);
    if (normalizeDuplicateText_(record.status).startsWith('smaz')) return matches;
    const existingName = record.nazev_subjektu || record.subjekt || record.name;
    if (normalizeDuplicateText_(existingName) !== normalizedName) return matches;
    matches.push({ rowNumber: rowNumber, record: record });
    return matches;
  }, []);
}

function nextPartnerId_(sheet, partnerIdColumn) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= CONFIG.headerRow) return 'PARTNER-0001';
  const values = sheet.getRange(CONFIG.headerRow + 1, partnerIdColumn, lastRow - CONFIG.headerRow, 1).getValues().flat();
  const max = values.reduce((highest, value) => {
    const number = Number(String(value || '').replace('PARTNER-', ''));
    return Number.isFinite(number) ? Math.max(highest, number) : highest;
  }, 0);
  return `PARTNER-${String(max + 1).padStart(4, '0')}`;
}


function findNetworkMeetingRow_(sheet, meetingIdColumn, meetingId) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= CONFIG.headerRow) return null;
  const values = sheet.getRange(CONFIG.headerRow + 1, meetingIdColumn, lastRow - CONFIG.headerRow, 1).getValues();
  const index = values.findIndex((row) => row[0] === meetingId);
  return index === -1 ? null : CONFIG.headerRow + 1 + index;
}

function nextNetworkMeetingId_(sheet, meetingIdColumn) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= CONFIG.headerRow) return 'SCHUZKA-SITE-0001';
  const values = sheet.getRange(CONFIG.headerRow + 1, meetingIdColumn, lastRow - CONFIG.headerRow, 1).getValues().flat();
  const max = values.reduce((highest, value) => {
    const number = Number(String(value || '').replace('SCHUZKA-SITE-', ''));
    return Number.isFinite(number) ? Math.max(highest, number) : highest;
  }, 0);
  return `SCHUZKA-SITE-${String(max + 1).padStart(4, '0')}`;
}

function findRowById_(sheet, idColumn, id) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= CONFIG.headerRow) return null;
  const values = sheet.getRange(CONFIG.headerRow + 1, idColumn, lastRow - CONFIG.headerRow, 1).getValues();
  const index = values.findIndex((row) => row[0] === id);
  return index === -1 ? null : CONFIG.headerRow + 1 + index;
}

function nextPrefixedId_(sheet, idColumn, prefix) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= CONFIG.headerRow) return prefix + '-0001';
  const values = sheet.getRange(CONFIG.headerRow + 1, idColumn, lastRow - CONFIG.headerRow, 1).getValues().flat();
  const max = values.reduce((highest, value) => {
    const number = Number(String(value || '').replace(prefix + '-', ''));
    return Number.isFinite(number) ? Math.max(highest, number) : highest;
  }, 0);
  return prefix + '-' + String(max + 1).padStart(4, '0');
}

function assertToken_(token) {
  const expectedToken = PropertiesService.getScriptProperties().getProperty('CLIENTS_API_TOKEN');
  if (!expectedToken) throw new Error('CLIENTS_API_TOKEN is not configured in Script Properties');
  if (token !== expectedToken) throw new Error('Invalid token');
}

function findRowByHeaderValue_(sheet, headers, headerName, value, excludedRow) {
  const column = headers.indexOf(headerName) + 1;
  if (!column) throw new Error('Missing ' + headerName + ' column');
  const lastRow = sheet.getLastRow();
  if (lastRow <= CONFIG.headerRow) return null;
  const targetValue = String(value == null ? '' : value).trim();
  if (!targetValue) return null;
  const values = sheet.getRange(CONFIG.headerRow + 1, column, lastRow - CONFIG.headerRow, 1).getValues();
  const index = values.findIndex((row, index) => {
    const sheetRow = CONFIG.headerRow + 1 + index;
    return sheetRow !== excludedRow && String(row[0] == null ? '' : row[0]).trim() === targetValue;
  });
  return index === -1 ? null : CONFIG.headerRow + 1 + index;
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
