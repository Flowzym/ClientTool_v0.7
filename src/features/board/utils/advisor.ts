export type ClientAdvisor = {
  amsAdvisor?: string | null;
  amsAgentFirstName?: string | null;
  amsAgentLastName?: string | null;
};

export function computeAdvisor(c: ClientAdvisor): string {
  const manual = (c.amsAdvisor ?? "").trim();
  if (manual) return manual;
  const first = (c.amsAgentFirstName ?? "").trim();
  const last = (c.amsAgentLastName ?? "").trim();
  return [first, last].filter(Boolean).join(" ").trim();
}