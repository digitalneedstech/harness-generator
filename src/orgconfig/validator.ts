import type { OrgConfig } from "../types.js";

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export function validateOrgConfig(config: OrgConfig): ValidationResult {
  const errors: string[] = [];

  // Validate testing policy
  if (config.policies?.testing?.minimum_coverage !== undefined) {
    const coverage = config.policies.testing.minimum_coverage;
    if (typeof coverage !== "number") {
      errors.push("policies.testing.minimum_coverage must be a number");
    } else if (coverage < 0 || coverage > 100) {
      errors.push("policies.testing.minimum_coverage must be between 0 and 100");
    }
  }

  // Validate API design policy
  if (config.policies?.api_design?.authentication?.method !== undefined) {
    const method = config.policies.api_design.authentication.method;
    const validMethods = ["oauth2", "jwt", "api-key", "basic"];
    if (!validMethods.includes(method)) {
      errors.push(
        `policies.api_design.authentication.method must be one of: ${validMethods.join(", ")}`
      );
    }
  }

  // Validate custom policies
  if (config.policies?.custom) {
    if (!Array.isArray(config.policies.custom)) {
      errors.push("policies.custom must be an array");
    } else {
      for (let i = 0; i < config.policies.custom.length; i++) {
        const policy = config.policies.custom[i];
        if (!policy.policy_name) {
          errors.push(`policies.custom[${i}]: policy_name is required`);
        }
        if (!policy.wiki_file) {
          errors.push(`policies.custom[${i}]: wiki_file is required`);
        }
      }
    }
  }

  // Validate stacks
  if (config.stacks) {
    for (const stackName of Object.keys(config.stacks)) {
      if (!/^[a-z0-9-]+$/.test(stackName)) {
        errors.push(`stacks: stack name "${stackName}" must match pattern ^[a-z0-9-]+$`);
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true };
}

export function validateOrgConfigStrict(config: OrgConfig): void {
  const result = validateOrgConfig(config);
  if (!result.valid) {
    throw new Error(`Org config validation failed:\n${result.errors?.join("\n")}`);
  }
}
