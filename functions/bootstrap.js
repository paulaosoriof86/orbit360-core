'use strict';

module.exports = Object.assign(
  {},
  require('./user-onboarding'),
  require('./tenant-domain-config'),
  require('./ops-leads-domain'),
  require('./ops-advisor-inbox'),
  require('./cobros-reconciliation-domain'),
  require('./recurring-insurance-import'),
  require('./index'),
  require('./bank-accounts')
);
