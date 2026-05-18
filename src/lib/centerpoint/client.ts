export const CP_BASE = "https://api.centerpointconnect.io/centerpoint";

export function getCpToken(): string {
  const key = process.env.CENTERPOINT_API_KEY;
  if (!key) throw new Error("CENTERPOINT_API_KEY is not set");
  return key;
}

export function cpReadHeaders() {
  return {
    Accept: "application/json",
    Authorization: getCpToken(),
  };
}

export function cpJsonHeaders() {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: getCpToken(),
  };
}
