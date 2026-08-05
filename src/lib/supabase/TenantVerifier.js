import { WorkspaceRepository } from "../../repositories/WorkspaceRepository.js";

/**
 * Tenant and Workspace Configuration Verifier
 * Validates that tenant and workspace configurations align with Supabase schema
 */
export class TenantVerifier {
  constructor(options = {}) {
    this.tenantContext = options.tenantContext;
    this.verificationResults = null;
  }

  /**
   * Verify tenant and workspace configurations
   */
  async verify() {
    const results = {
      timestamp: new Date().toISOString(),
      tenantContext: this.tenantContext,
      checks: {},
      overallStatus: "pending",
    };

    try {
      // Check 1: Validate tenant context structure
      results.checks.tenantContextStructure = this.validateTenantContextStructure();

      // Check 2: Verify workspace repository compatibility
      results.checks.workspaceCompatibility = this.validateWorkspaceCompatibility();

      // Check 3: Validate data scope values
      results.checks.dataScopeValidation = this.validateDataScope();

      // Check 4: Check tenant ID format
      results.checks.tenantIdFormat = this.validateTenantIdFormat();

      // Check 5: Verify workspace member structure
      results.checks.workspaceMemberStructure = this.validateWorkspaceMemberStructure();

      // Determine overall status
      const allPassed = Object.values(results.checks).every(check => check.status === "pass");
      results.overallStatus = allPassed ? "pass" : "fail";

      this.verificationResults = results;
      return results;
    } catch (error) {
      results.overallStatus = "error";
      results.error = error.message;
      this.verificationResults = results;
      return results;
    }
  }

  /**
   * Validate tenant context structure
   */
  validateTenantContextStructure() {
    const requiredFields = ["tenant_id", "data_scope"];
    const optionalFields = ["workspace_id", "workspace_label", "customer_id", "module"];

    const result = {
      status: "pass",
      message: "",
      details: {},
    };

    if (!this.tenantContext) {
      result.status = "fail";
      result.message = "Tenant context is missing";
      return result;
    }

    const missingFields = requiredFields.filter(field => !this.tenantContext[field]);
    if (missingFields.length > 0) {
      result.status = "fail";
      result.message = `Missing required fields: ${missingFields.join(", ")}`;
      result.details.missingFields = missingFields;
      return result;
    }

    const presentOptionalFields = optionalFields.filter(field => this.tenantContext[field]);
    result.details.presentOptionalFields = presentOptionalFields;
    result.message = "Tenant context structure is valid";

    return result;
  }

  /**
   * Validate workspace repository compatibility
   */
  validateWorkspaceCompatibility() {
    const result = {
      status: "pass",
      message: "",
      details: {},
    };

    try {
      // Test workspace repository functions
      const workspaces = WorkspaceRepository.listWorkspaces();
      result.details.workspaceCount = workspaces.length;

      if (workspaces.length === 0) {
        result.status = "warning";
        result.message = "No workspaces found in repository";
        return result;
      }

      // Check if workspaces have required Supabase fields
      const firstWorkspace = workspaces[0];
      const requiredFields = ["id", "customerId", "businessName", "settings"];
      const missingFields = requiredFields.filter(field => !firstWorkspace[field]);

      if (missingFields.length > 0) {
        result.status = "fail";
        result.message = `Workspace missing required fields: ${missingFields.join(", ")}`;
        result.details.missingFields = missingFields;
        return result;
      }

      // Check settings structure
      if (!firstWorkspace.settings || !firstWorkspace.settings.tenantId) {
        result.status = "fail";
        result.message = "Workspace settings missing tenantId";
        return result;
      }

      result.message = "Workspace repository is compatible";
      return result;
    } catch (error) {
      result.status = "error";
      result.message = error.message;
      return result;
    }
  }

  /**
   * Validate data scope values
   */
  validateDataScope() {
    const validDataScopes = ["own_business", "real_tenant", "demo_sandbox"];

    const result = {
      status: "pass",
      message: "",
      details: {},
    };

    if (!this.tenantContext || !this.tenantContext.data_scope) {
      result.status = "fail";
      result.message = "Data scope is missing from tenant context";
      return result;
    }

    const dataScope = this.tenantContext.data_scope;
    result.details.currentDataScope = dataScope;

    if (!validDataScopes.includes(dataScope)) {
      result.status = "fail";
      result.message = `Invalid data scope: ${dataScope}. Valid values: ${validDataScopes.join(", ")}`;
      result.details.validDataScopes = validDataScopes;
      return result;
    }

    result.message = `Data scope '${dataScope}' is valid`;
    return result;
  }

  /**
   * Validate tenant ID format
   */
  validateTenantIdFormat() {
    const result = {
      status: "pass",
      message: "",
      details: {},
    };

    if (!this.tenantContext || !this.tenantContext.tenant_id) {
      result.status = "fail";
      result.message = "Tenant ID is missing from tenant context";
      return result;
    }

    const tenantId = this.tenantContext.tenant_id;
    result.details.tenantId = tenantId;
    result.details.tenantIdLength = tenantId.length;

    // Check if it's a valid UUID or a reasonable string identifier
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUUID = uuidRegex.test(tenantId);

    // Also allow reasonable string identifiers (alphanumeric with hyphens/underscores)
    const stringIdRegex = /^[a-zA-Z0-9_-]{3,50}$/;
    const isStringId = stringIdRegex.test(tenantId);

    if (!isUUID && !isStringId) {
      result.status = "warning";
      result.message = "Tenant ID format is non-standard but acceptable";
      result.details.isUUID = isUUID;
      result.details.isStringId = isStringId;
      return result;
    }

    result.details.isUUID = isUUID;
    result.details.isStringId = isStringId;
    result.message = `Tenant ID format is valid (${isUUID ? "UUID" : "string identifier"})`;
    return result;
  }

  /**
   * Validate workspace member structure
   */
  validateWorkspaceMemberStructure() {
    const result = {
      status: "pass",
      message: "",
      details: {},
    };

    try {
      const currentWorkspace = WorkspaceRepository.getCurrentWorkspace();

      if (!currentWorkspace) {
        result.status = "warning";
        result.message = "No current workspace loaded";
        return result;
      }

      result.details.currentWorkspace = {
        id: currentWorkspace.id,
        businessName: currentWorkspace.businessName,
        module: currentWorkspace.module,
      };

      // Check if workspace has tenant context
      const workspaceContext = WorkspaceRepository.getCurrentWorkspaceContext();

      if (!workspaceContext) {
        result.status = "fail";
        result.message = "Current workspace has no tenant context";
        return result;
      }

      result.details.workspaceContext = workspaceContext;

      // Verify workspace context matches provided tenant context
      if (workspaceContext.tenant_id !== this.tenantContext.tenant_id) {
        result.status = "warning";
        result.message = "Workspace tenant ID differs from provided tenant context";
        result.details.workspaceTenantId = workspaceContext.tenant_id;
        result.details.providedTenantId = this.tenantContext.tenant_id;
        return result;
      }

      if (workspaceContext.data_scope !== this.tenantContext.data_scope) {
        result.status = "warning";
        result.message = "Workspace data scope differs from provided tenant context";
        result.details.workspaceDataScope = workspaceContext.data_scope;
        result.details.providedDataScope = this.tenantContext.data_scope;
        return result;
      }

      result.message = "Workspace member structure is valid";
      return result;
    } catch (error) {
      result.status = "error";
      result.message = error.message;
      return result;
    }
  }

  /**
   * Get verification report
   */
  getVerificationReport() {
    if (!this.verificationResults) {
      throw new Error("No verification results available. Run verify() first.");
    }

    return this.verificationResults;
  }

  /**
   * Export verification report
   */
  exportReport(format = "json") {
    if (!this.verificationResults) {
      throw new Error("No verification results available. Run verify() first.");
    }

    if (format === "json") {
      return JSON.stringify(this.verificationResults, null, 2);
    }

    if (format === "summary") {
      return this.formatSummaryReport();
    }

    throw new Error(`Unsupported export format: ${format}`);
  }

  /**
   * Format human-readable summary report
   */
  formatSummaryReport() {
    const report = this.verificationResults;

    let text = `Tenant and Workspace Verification Report\n`;
    text += `Generated: ${report.timestamp}\n`;
    text += `Overall Status: ${report.overallStatus.toUpperCase()}\n\n`;

    text += `Tenant Context:\n`;
    text += `- Tenant ID: ${report.tenantContext?.tenant_id || "N/A"}\n`;
    text += `- Data Scope: ${report.tenantContext?.data_scope || "N/A"}\n`;
    text += `- Workspace ID: ${report.tenantContext?.workspace_id || "N/A"}\n\n`;

    text += `Verification Checks:\n`;
    for (const [checkName, checkResult] of Object.entries(report.checks)) {
      const statusIcon = checkResult.status === "pass" ? "✓" : checkResult.status === "warning" ? "⚠" : checkResult.status === "error" ? "✗" : "✗";
      text += `${statusIcon} ${checkName}: ${checkResult.status.toUpperCase()}\n`;
      text += `  ${checkResult.message}\n`;

      if (Object.keys(checkResult.details || {}).length > 0) {
        text += `  Details: ${JSON.stringify(checkResult.details, null, 2)}\n`;
      }
      text += `\n`;
    }

    return text;
  }

  /**
   * Fix common configuration issues
   */
  async autoFix() {
    const fixes = [];

    try {
      // Fix 1: Normalize tenant context field names
      if (this.tenantContext) {
        const normalizedContext = {
          tenant_id: this.tenantContext.tenant_id || this.tenantContext.tenantId,
          data_scope: this.tenantContext.data_scope || this.tenantContext.dataScope,
          workspace_id: this.tenantContext.workspace_id || this.tenantContext.workspaceId,
          workspace_label: this.tenantContext.workspace_label || this.tenantContext.workspaceLabel,
          customer_id: this.tenantContext.customer_id || this.tenantContext.customerId,
          module: this.tenantContext.module,
        };

        if (JSON.stringify(normalizedContext) !== JSON.stringify(this.tenantContext)) {
          fixes.push({
            action: "normalized_tenant_context",
            description: "Normalized tenant context field names",
            before: this.tenantContext,
            after: normalizedContext,
          });
          this.tenantContext = normalizedContext;
        }
      }

      // Fix 2: Load and sync current workspace
      const currentWorkspaceId = WorkspaceRepository.getPersistedWorkspaceId();
      if (currentWorkspaceId) {
        const loadedWorkspace = WorkspaceRepository.loadWorkspace(currentWorkspaceId);
        if (loadedWorkspace) {
          fixes.push({
            action: "synced_workspace",
            description: "Synced current workspace from repository",
            workspaceId: currentWorkspaceId,
          });
        }
      }

      return {
        success: true,
        fixes,
        message: `Applied ${fixes.length} automatic fixes`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: "Auto-fix failed",
      };
    }
  }
}

/**
 * Factory function to create tenant verifier
 */
export function createTenantVerifier(tenantContext) {
  return new TenantVerifier({ tenantContext });
}

/**
 * Quick verification utility
 */
export async function quickVerify(tenantContext) {
  const verifier = createTenantVerifier(tenantContext);
  const results = await verifier.verify();

  if (results.overallStatus !== "pass") {
    // Try auto-fix
    const fixResult = await verifier.autoFix();
    if (fixResult.success) {
      // Re-verify after fixes
      return await verifier.verify();
    }
  }

  return results;
}
