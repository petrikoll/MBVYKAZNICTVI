function buildClientSelectionPool({
  clients = [],
  accessibleClients = [],
  selectedClientId = '',
  mainView = 'clients',
  showAllClients = false
} = {}) {
  if (mainView === 'clients' && showAllClients) return clients;

  const selectedClient = clients.find((client) => client.id === selectedClientId);
  if (!selectedClient || accessibleClients.some((client) => client.id === selectedClientId)) {
    return accessibleClients;
  }

  return [selectedClient, ...accessibleClients];
}

export { buildClientSelectionPool };
