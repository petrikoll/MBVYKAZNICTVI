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
