// lib/generateID.ts

import crypto from "crypto";

export function generateMasterPolicyId(): string {
  return `WAS-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

export function generatePolicyId(): string {
  return `WAS-P-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}