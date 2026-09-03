import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPartnerStats } from '../src/lib/projectUtils.js';

test('nově zapojený aktér se započítá podle registru i bez samostatné aktivity', () => {
  const [partner] = buildPartnerStats({
    partners: [{
      id: 'partner-1',
      payload: {
        name: 'Nový partner',
        networkOrigin: 'nově zapojený',
        joinedNetworkDate: '2026-07-15'
      }
    }],
    records: [],
    projectStartDate: '2026-07-01',
    referenceDate: '2026-08-01'
  });

  assert.equal(partner.isNewInProject, true);
  assert.equal(partner.isActiveInProject, false);
});

test('aktér s budoucím datem se před zapojením do dashboardu nezapočítá', () => {
  const [partner] = buildPartnerStats({
    partners: [{
      id: 'partner-1',
      payload: {
        name: 'Budoucí partner',
        networkOrigin: 'nově zapojený',
        joinedNetworkDate: '2026-09-01'
      }
    }],
    projectStartDate: '2026-07-01',
    referenceDate: '2026-08-01'
  });

  assert.equal(partner.isNewInProject, false);
});

test('budoucí aktivita nezvýší aktivitu partnera ani ukazatel posledních 90 dní', () => {
  const [partner] = buildPartnerStats({
    partners: [{ id: 'partner-1', payload: { name: 'Budoucí partner' } }],
    records: [{
      id: 'future-activity',
      entityType: 'network_activities',
      activityDate: '2026-10-01',
      payload: { partnerIds: ['partner-1'] }
    }],
    projectStartDate: '2026-07-01',
    referenceDate: '2026-09-03'
  });

  assert.equal(partner.totalActivityCount, 0);
  assert.equal(partner.isActiveInProject, false);
  assert.equal(partner.isActiveLast90Days, false);
});

test('aktivita se spáruje s jednoznačným aktérem také podle názvu', () => {
  const [partner] = buildPartnerStats({
    partners: [{ id: 'partner-1', payload: { name: 'Úřad práce Moravský Beroun' } }],
    records: [{
      id: 'named-activity',
      entityType: 'network_activities',
      activityDate: '2026-08-20',
      payload: {
        selectedPartnerIds: [],
        partnerIds: [],
        partnerNames: ['Urad prace Moravsky Beroun']
      }
    }],
    projectStartDate: '2026-07-01',
    referenceDate: '2026-09-03'
  });

  assert.equal(partner.totalActivityCount, 1);
  assert.equal(partner.isActiveInProject, true);
  assert.equal(partner.isActiveLast90Days, true);
});

test('prázdné selectedPartnerIds nezastíní starší partnerIds', () => {
  const [partner] = buildPartnerStats({
    partners: [{ id: 'partner-1', payload: { name: 'Partner s ID' } }],
    records: [{
      id: 'id-activity',
      entityType: 'network_activities',
      activityDate: '2026-08-20',
      payload: { selectedPartnerIds: [], partnerIds: ['partner-1'] }
    }],
    projectStartDate: '2026-07-01',
    referenceDate: '2026-09-03'
  });

  assert.equal(partner.totalActivityCount, 1);
});
