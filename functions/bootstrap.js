'use strict';

module.exports = Object.assign(
  {},
  require('./user-onboarding'),
  require('./tenant-domain-config'),
  require('./ops-leads-domain'),
  require('./product-ops-leads-domain'),
  require('./ops-advisor-inbox'),
  require('./cobros-reconciliation-domain'),
  require('./product-operational-domain'),
  require('./product-insurer-credentials'),
  require('./recurring-insurance-import'),
  require('./index'),
  require('./bank-accounts')
);
