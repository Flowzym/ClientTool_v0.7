// Temporary augmentation until zod.ts includes these fields.
declare namespace Domain {
  interface Client {
    amsAdvisor?: string | null;
    isPinned?: boolean;
    angebot?: "BAM" | "LL/B+" | "BwB" | "NB";
  }
}
export {};
