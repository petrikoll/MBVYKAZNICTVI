import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../google-apps-script-clients-api.js', import.meta.url), 'utf8');
const projectConfigSource = readFileSync(new URL('../src/config/projectConfig.js', import.meta.url), 'utf8');

function createContext() {
  const context = vm.createContext({});
  vm.runInContext(source, context);
  return context;
}

function driveUrl(kind, id) {
  return kind === 'folder'
    ? `https://drive.google.com/drive/folders/${id}`
    : `https://docs.google.com/document/d/${id}/edit`;
}

test('clean Drive inventory produces no audit findings', () => {
  const context = createContext();
  const folderId = 'folder0000000000000000000001';
  const fileId = 'document00000000000000000001';
  const clients = [{
    klient_id: 'KLIENT-0001',
    drive_folder_url: driveUrl('folder', folderId)
  }];
  const records = [{
    entity_type: 'vykon',
    record_id: 'VYKON-0001',
    klient_id: 'KLIENT-0001',
    dokument_text: 'Text zapisu',
    document_url: driveUrl('file', fileId),
    status: 'Platny'
  }];
  const inventory = {
    root_folder_id: 'root000000000000000000000001',
    folders: [{
      id: folderId,
      url: driveUrl('folder', folderId),
      name: 'KLIENT-0001 - Prijmeni - Jmeno',
      parent_ids: ['root000000000000000000000001'],
      direct_root_child: true
    }],
    files: [{
      id: fileId,
      url: driveUrl('file', fileId),
      name: '2026-08-04 - KLIENT-0001 - VYKON-0001',
      mime_type: 'application/vnd.google-apps.document',
      parent_ids: [folderId]
    }],
    folder_access: { [folderId]: true },
    file_access: { [fileId]: true },
    folder_errors: {},
    file_errors: {}
  };

  const report = context.analyzeDriveConsistency_(clients, records, inventory);

  assert.equal(report.summary.issue_count, 0);
  assert.equal(report.summary.expected_documents, 1);
  assert.equal(report.summary.destructive_changes, false);
});

test('audit finds orphan folders, duplicate folders and missing documents without repairing them', () => {
  const context = createContext();
  const rootId = 'root000000000000000000000001';
  const folder1 = 'folder0000000000000000000001';
  const folder1Duplicate = 'folder0000000000000000000002';
  const orphanFolder = 'folder0000000000000000000003';
  const document1 = 'document00000000000000000001';
  const document1Duplicate = 'document00000000000000000002';
  const clients = [
    { klient_id: 'KLIENT-0001', drive_folder_url: driveUrl('folder', folder1) },
    { klient_id: 'KLIENT-0002', drive_folder_url: '' }
  ];
  const records = [
    {
      entity_type: 'vykon', record_id: 'VYKON-0001', klient_id: 'KLIENT-0001',
      dokument_text: 'Text', document_url: driveUrl('file', document1), status: 'Platny'
    },
    {
      entity_type: 'vykon', record_id: 'VYKON-0002', klient_id: 'KLIENT-0002',
      dokument_text: 'Text', document_url: '', status: 'Platny'
    }
  ];
  const inventory = {
    root_folder_id: rootId,
    folders: [
      { id: folder1, url: driveUrl('folder', folder1), name: 'KLIENT-0001 - A', parent_ids: [rootId], direct_root_child: true },
      { id: folder1Duplicate, url: driveUrl('folder', folder1Duplicate), name: 'KLIENT-0001 - B', parent_ids: [rootId], direct_root_child: true },
      { id: orphanFolder, url: driveUrl('folder', orphanFolder), name: 'KLIENT-9999 - C', parent_ids: [rootId], direct_root_child: true }
    ],
    files: [
      { id: document1, url: driveUrl('file', document1), name: 'KLIENT-0001 - VYKON-0001', parent_ids: [folder1] },
      { id: document1Duplicate, url: driveUrl('file', document1Duplicate), name: 'KLIENT-0001 - VYKON-0001 - kopie', parent_ids: [folder1Duplicate] }
    ],
    folder_access: { [folder1]: true, [folder1Duplicate]: true, [orphanFolder]: true },
    file_access: { [document1]: true, [document1Duplicate]: true },
    folder_errors: {},
    file_errors: {}
  };

  const report = context.analyzeDriveConsistency_(clients, records, inventory);
  const codes = new Set(report.issues.map((issue) => issue.code));

  assert.ok(codes.has('CLIENT_FOLDER_ORPHAN'));
  assert.ok(codes.has('CLIENT_FOLDER_DUPLICATE'));
  assert.ok(codes.has('CLIENT_FOLDER_LINK_MISSING'));
  assert.ok(codes.has('DOCUMENT_DUPLICATE'));
  assert.ok(codes.has('DOCUMENT_MISSING'));
  assert.equal(report.summary.destructive_changes, false);
});

test('stale document URL is recoverable when exactly one matching document exists', () => {
  const context = createContext();
  const rootId = 'root000000000000000000000001';
  const folderId = 'folder0000000000000000000001';
  const staleId = 'document00000000000000000000';
  const foundId = 'document00000000000000000001';
  const clients = [{ klient_id: 'KLIENT-0001', drive_folder_url: driveUrl('folder', folderId) }];
  const records = [{
    entity_type: 'case_management', record_id: 'SETKANI-0001', klient_id: 'KLIENT-0001',
    dokument_text: 'Text', document_url: driveUrl('file', staleId), status: 'Platny'
  }];
  const inventory = {
    root_folder_id: rootId,
    folders: [{ id: folderId, url: driveUrl('folder', folderId), name: 'KLIENT-0001 - A', parent_ids: [rootId], direct_root_child: true }],
    files: [{ id: foundId, url: driveUrl('file', foundId), name: 'KLIENT-0001 - SETKANI-0001', parent_ids: [folderId] }],
    folder_access: { [folderId]: true },
    file_access: { [staleId]: false, [foundId]: true },
    folder_errors: {},
    file_errors: { [staleId]: 'File not found' }
  };

  const report = context.analyzeDriveConsistency_(clients, records, inventory);
  const finding = report.issues.find((issue) => issue.code === 'DOCUMENT_LINK_STALE_RECOVERABLE');

  assert.ok(finding);
  assert.equal(finding.entity_id, 'SETKANI-0001');
  assert.equal(finding.found_url, driveUrl('file', foundId));
});

test('folder with correct client id but another person name is rejected', () => {
  const context = createContext();
  const rootId = 'root000000000000000000000001';
  const folderId = 'folder0000000000000000000001';
  const clients = [{
    klient_id: 'KLIENT-0018',
    jmeno: 'František',
    prijmeni: 'Král',
    drive_folder_url: driveUrl('folder', folderId)
  }];
  const inventory = {
    root_folder_id: rootId,
    folders: [{
      id: folderId,
      url: driveUrl('folder', folderId),
      name: 'KLIENT-0018 - Laštovica - Petr',
      parent_ids: [rootId],
      direct_root_child: true
    }],
    files: [],
    folder_access: { [folderId]: true },
    file_access: {},
    folder_errors: {},
    file_errors: {}
  };

  const report = context.analyzeDriveConsistency_(clients, [], inventory);
  const mismatches = report.issues.filter((issue) => issue.code === 'CLIENT_FOLDER_NAME_MISMATCH');

  assert.equal(mismatches.length, 2);
  assert.equal(context.folderMatchesClientIdentity_('KLIENT-0018 - Král - František', clients[0]), true);
  assert.equal(context.folderMatchesClientIdentity_('KLIENT-0018 - Laštovica - Petr', clients[0]), false);
});

test('folder label is canonical only in surname-first order', () => {
  const context = createContext();
  const client = { klient_id: 'KLIENT-0018', jmeno: 'František', prijmeni: 'Král' };

  assert.equal(context.buildClientFolderName_(client), 'KLIENT-0018 - Král František');
  assert.equal(context.clientFolderHasCanonicalLabel_('KLIENT-0018 - Král František', client), true);
  assert.equal(context.clientFolderHasCanonicalLabel_('KLIENT-0018 - František Král', client), false);
  assert.equal(context.clientFolderHasCanonicalLabel_('KLIENT-0018 - Král - František', client), false);
});

test('record id matching respects token boundaries', () => {
  const context = createContext();

  assert.equal(context.auditNameContainsId_('zapis - VYKON-0001 - klient', 'VYKON-0001'), true);
  assert.equal(context.auditNameContainsId_('zapis - VYKON-00010 - klient', 'VYKON-0001'), false);
  assert.deepEqual(
    Array.from(context.extractAuditRecordIds_('VYKON-0001 a SETKANI-0002 a VYKON-0001')),
    ['VYKON-0001', 'SETKANI-0002']
  );
});

test('audit implementation does not contain Drive deletion or move operations', () => {
  const auditSection = source.match(/function auditDriveConsistency\(\)[\s\S]*?function repairDriveConsistencyAfterBackup\(/)?.[0] || '';

  assert.ok(auditSection);
  assert.doesNotMatch(auditSection, /\.setTrashed\s*\(/);
  assert.doesNotMatch(auditSection, /\.moveTo\s*\(/);
  assert.doesNotMatch(auditSection, /\.setName\s*\(/);
});

test('repair accepts recoverable audit findings and rejects missing data', () => {
  const context = createContext();
  const clients = [{ klient_id: 'KLIENT-0001' }];
  const records = [];
  const inventory = { files: [], file_access: {} };

  assert.doesNotThrow(() => context.assertDriveRepairReportIsSafe_({
    issues: [
      { code: 'CLIENT_FOLDER_DUPLICATE', entity_id: 'KLIENT-0001' },
      { code: 'CLIENT_FOLDER_NAME_MISMATCH', entity_id: 'KLIENT-0001' },
      { code: 'DOCUMENT_DUPLICATE', entity_id: 'VYKON-0001' },
      { code: 'DOCUMENT_WRONG_FOLDER', entity_id: 'VYKON-0001' }
    ]
  }, clients, records, inventory));

  assert.throws(() => context.assertDriveRepairReportIsSafe_({
    issues: [{ code: 'DOCUMENT_MISSING', entity_id: 'VYKON-0001' }]
  }, clients, records, inventory), /OPRAVA ZASTAVENA/);
});

test('repair implementation only quarantines and never trashes Drive items', () => {
  const repairSection = source.match(/function repairDriveConsistencyAfterBackup\(\)[\s\S]*?function getSheetForRead_\(/)?.[0] || '';

  assert.ok(repairSection);
  assert.match(repairSection, /\.moveTo\s*\(/);
  assert.doesNotMatch(repairSection, /\.setTrashed\s*\(/);
});

test('document retry reuses one exact Google Doc and refuses ambiguous copies', () => {
  const context = createContext();
  const makeFile = (id, name, mime = 'application/vnd.google-apps.document') => ({
    getId: () => id,
    getName: () => name,
    getMimeType: () => mime
  });
  const files = [
    makeFile('one', '2026-08-04 - VYKON-0001'),
    makeFile('other', '2026-08-04 - VYKON-00010'),
    makeFile('pdf', 'VYKON-0001', 'application/pdf')
  ];
  const folder = {
    getFiles: () => {
      let index = 0;
      return { hasNext: () => index < files.length, next: () => files[index++] };
    }
  };

  assert.deepEqual(
    Array.from(context.findRecordDocumentsInFolder_(folder, 'VYKON-0001')).map((file) => file.getId()),
    ['one']
  );

  const upsertSource = source.match(/function upsertClientRecordDocument_\([\s\S]*?function getClientDocumentContext_\(/)?.[0] || '';
  assert.match(upsertSource, /existing\.length > 1/);
  assert.match(upsertSource, /DUPLICATE_DOCUMENT/);
});

test('legacy parallel Drive upload is disabled', () => {
  assert.match(projectConfigSource, /const GOOGLE_DRIVE_UPLOAD_URL = '';/);
  assert.doesNotMatch(projectConfigSource, /VITE_GOOGLE_DRIVE_UPLOAD_URL\s*\|\|/);
});

test('repair requires an accessible successful backup newer than 24 hours', () => {
  const context = createContext();
  context.normalizeBackupStatus_ = (status) => status;
  context.DriveApp = { getFileById: () => ({ getName: () => 'backup.zip' }) };

  context.readBackupStatus_ = () => ({
    state: 'success',
    finishedAt: new Date().toISOString(),
    fileId: 'backup-file',
    fileUrl: 'https://drive.google.com/file/d/backup-file'
  });
  assert.doesNotThrow(() => context.assertRecentSuccessfulBackupForDriveRepair_());

  context.readBackupStatus_ = () => ({
    state: 'success',
    finishedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
    fileId: 'old-backup'
  });
  assert.throws(() => context.assertRecentSuccessfulBackupForDriveRepair_(), /OPRAVA ZASTAVENA/);
});

test('folder repair moves only noncanonical client folders to quarantine', () => {
  const context = createContext();
  const moved = [];
  const logs = [];
  context.DriveApp = {
    getFolderById: (id) => ({
      moveTo: () => moved.push(id),
      getUrl: () => `https://drive.google.com/drive/folders/${id}`
    })
  };
  const clients = [{
    klient_id: 'KLIENT-0001',
    drive_folder_url: driveUrl('folder', 'folder0000000000000000000001')
  }];
  const inventory = {
    folders: [
      { id: 'folder0000000000000000000001', name: 'KLIENT-0001 - spravna', direct_root_child: true, url: 'canonical' },
      { id: 'folder0000000000000000000002', name: 'KLIENT-0001 - kopie', direct_root_child: true, url: 'duplicate' },
      { id: 'folder0000000000000000000003', name: 'KLIENT-9999 - stara', direct_root_child: true, url: 'orphan' },
      { id: 'folder0000000000000000000004', name: 'Technicka slozka', direct_root_child: true, url: 'technical' }
    ]
  };

  context.quarantineNonCanonicalClientFolders_(clients, inventory, {}, (...args) => logs.push(args));

  assert.deepEqual(moved, [
    'folder0000000000000000000002',
    'folder0000000000000000000003'
  ]);
  assert.equal(logs.length, 2);
});

test('targeted KLIENT-0018 repair only collects linked active files', () => {
  const context = createContext();
  const client = {
    klient_id: 'KLIENT-0018',
    monitoring_list_url: driveUrl('file', 'monitoring00000000000000000001')
  };
  const performances = [
    { klient_id: 'KLIENT-0018', document_url: driveUrl('file', 'document00000000000000000001'), status: 'Platný' },
    { klient_id: 'KLIENT-0018', document_url: driveUrl('file', 'document00000000000000000002'), status: 'Smazaný' },
    { klient_id: 'KLIENT-0019', document_url: driveUrl('file', 'document00000000000000000003'), status: 'Platný' }
  ];
  const meetings = [
    { klient_id: 'KLIENT-0018', document_url: driveUrl('file', 'document00000000000000000001'), status: 'Platný' },
    { klient_id: 'KLIENT-0018', document_url: driveUrl('file', 'document00000000000000000004'), status: 'Platný' }
  ];

  assert.deepEqual(
    Array.from(context.collectClientLinkedDriveUrls_(client, performances, meetings)),
    [
      driveUrl('file', 'monitoring00000000000000000001'),
      driveUrl('file', 'document00000000000000000001'),
      driveUrl('file', 'document00000000000000000004')
    ]
  );
});

test('targeted KLIENT-0018 repair requires backup, checks exact identity and never deletes', () => {
  const repairSection = source.match(/function repairClient0018FolderAfterNameMismatch\(\)[\s\S]*?function collectClientLinkedDriveUrls_\(/)?.[0] || '';

  assert.ok(repairSection);
  assert.match(repairSection, /assertRecentSuccessfulBackupForDriveRepair_/);
  assert.match(repairSection, /client\.jmeno/);
  assert.match(repairSection, /client\.prijmeni/);
  assert.match(repairSection, /moveTo\s*\(/);
  assert.doesNotMatch(repairSection, /setTrashed\s*\(/);
});

test('name and folder normalization is guarded by backup and exact known values', () => {
  const repairSection = source.match(/function normalizeClientNamesAndFoldersAfterBackup\(\)[\s\S]*?function repairClient0018FolderAfterNameMismatch\(/)?.[0] || '';

  assert.ok(repairSection);
  assert.match(repairSection, /assertRecentSuccessfulBackupForDriveRepair_/);
  assert.match(repairSection, /KLIENT-0004/);
  assert.match(repairSection, /currentFirstName === 'hubacova'/);
  assert.match(repairSection, /currentLastName === 'milada'/);
  assert.match(repairSection, /repairDriveConsistencyAfterBackup/);
  assert.doesNotMatch(repairSection, /setTrashed\s*\(/);
});
