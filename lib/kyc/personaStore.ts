type PersonaRecord = {
  country?: string;
  status: "pending" | "verified";
  updatedAt: string;
};

const globalStore = globalThis as typeof globalThis & {
  privateStocksPersonaKyc?: Map<string, PersonaRecord>;
};

export const personaKycStore = globalStore.privateStocksPersonaKyc ?? new Map<string, PersonaRecord>();
globalStore.privateStocksPersonaKyc = personaKycStore;

export function normalizeAddress(address: string) {
  return address.trim().toLowerCase();
}

export function getPersonaStatus(address: string) {
  return personaKycStore.get(normalizeAddress(address));
}

export function setPersonaStatus(address: string, record: Omit<PersonaRecord, "updatedAt">) {
  const next = { ...record, updatedAt: new Date().toISOString() };
  personaKycStore.set(normalizeAddress(address), next);
  return next;
}
