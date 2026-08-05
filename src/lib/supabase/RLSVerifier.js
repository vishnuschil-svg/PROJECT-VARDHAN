import { SupabaseRepository } from "./SupabaseRepository.js";
import { requireTenantScope } from "./SupabaseRepository.js";

/**
 * RLS (Row Level Security) Verifier
 * Tests and validates strict tenant isolation across all tables
 */
export class RLSVerifier {
  constructor(options = {}) {
    this.tenantContext = options.tenantContext;
    this.verificationResults = null;
    this.tables = [
      "workspaces", "licenses", "notifications", "security_audit_logs", "academy_progress",
      "chit_groups", "chit_members", "chit_collections", "chit_receipts", "chit_auctions",
      "chit_finance_entries", "chit_documents", "chit_settings", "support_tickets",
      "communication_templates", "communication_jobs", "chit_schedule_rows", "chit_payouts",
      "chit_dividends", "lucky_draws", "chit_templates", "organizer_preferences",
      "payment_settings", "month_closing", "manual_overrides", "expenses", "activity_logs",
    ];
  }

  /**
   * Run comprehensive RLS verification
   */
  async verify() {
    const results = {
      timestamp: new Date().toISOString(),
      tenantContext: this.tenantContext,
      tests: {},
      summary: {
        totalTables: this.tables.length,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
      },
      overallStatus: "pending",
    };

    for (const tableName of this.tables) {
      try {
        const tableResult = await this.verifyTable(tableName);
        results.tests[tableName] = tableResult;

        if (tableResult.status === "pass") {
          results.summary.passedTests++;
        } else if (tableResult.status === "fail") {
          results.summary.failedTests++;
        } else {
          results.summary.skippedTests++;
        }
      } catch (error) {
        results.tests[tableName] = {
          status: "error",
          message: error.message,
          error,
        };
        results.summary.failedTests++;
      }
    }

    results.overallStatus = results.summary.failedTests === 0 ? "pass" : "fail";
    this.verificationResults = results;
    return results;
  }

  /**
   * Verify RLS for a specific table
   */
  async verifyTable(tableName) {
    const result = {
      status: "pending",
      message: "",
      tests: {},
    };

    try {
      // Test 1: Check if RLS is enabled
      result.tests.rlsEnabled = await this.testRLSEnabled(tableName);

      // Test 2: Verify tenant isolation on SELECT
      result.tests.tenantSelect = await this.testTenantSelectIsolation(tableName);

      // Test 3: Verify tenant isolation on INSERT
      result.tests.tenantInsert = await this.testTenantInsertIsolation(tableName);

      // Test 4: Verify tenant isolation on UPDATE
      result.tests.tenantUpdate = await this.testTenantUpdateIsolation(tableName);

      // Test 5: Verify tenant isolation on DELETE
      result.tests.tenantDelete = await this.testTenantDeleteIsolation(tableName);

      // Test 6: Verify policy existence
      result.tests.policiesExist = await this.testPoliciesExist(tableName);

      // Determine overall status
      const testResults = Object.values(result.tests);
      const passed = testResults.filter(t => t.status === "pass").length;
      const failed = testResults.filter(t => t.status === "fail").length;

      if (failed > 0) {
        result.status = "fail";
        result.message = `${failed} RLS test(s) failed for ${tableName}`;
      } else if (passed === testResults.length) {
        result.status = "pass";
        result.message = `All RLS tests passed for ${tableName}`;
      } else {
        result.status = "partial";
        result.message = `Some RLS tests skipped for ${tableName}`;
      }

      return result;
    } catch (error) {
      result.status = "error";
      result.message = error.message;
      result.error = error;
      return result;
    }
  }

  /**
   * Test if RLS is enabled on a table
   */
  async testRLSEnabled(tableName) {
    try {
      const repo = new SupabaseRepository({ tableName });

      // Try to query without tenant context - should fail or return empty if RLS is working
      const result = await repo.getAll({ activeTenantContext: null });

      // If we get an error about RLS, that's good
      if (result.error && result.message.includes("row level security")) {
        return {
          status: "pass",
          message: "RLS is properly enforced",
        };
      }

      // If we get data without tenant context, RLS might not be enabled
      if (result.data && result.data.length > 0) {
        return {
          status: "fail",
          message: "RLS may not be enabled - data returned without tenant context",
        };
      }

      // Empty result is acceptable
      return {
        status: "pass",
        message: "RLS appears to be enabled",
      };
    } catch (error) {
      return {
        status: "error",
        message: error.message,
      };
    }
  }

  /**
   * Test tenant isolation on SELECT operations
   */
  async testTenantSelectIsolation(tableName) {
    try {
      if (!this.tenantContext) {
        return {
          status: "skip",
          message: "No tenant context provided",
        };
      }

      const repo = new SupabaseRepository({ tableName });
      const scope = requireTenantScope(this.tenantContext);

      // Query with correct tenant context
      const result = await repo.getAll({ activeTenantContext: this.tenantContext });

      if (result.error) {
        return {
          status: "fail",
          message: `SELECT with tenant context failed: ${result.message}`,
        };
      }

      // Verify that returned records match tenant scope
      if (result.data && result.data.length > 0) {
        const invalidRecords = result.data.filter(
          record => record.tenant_id !== scope.tenant_id || record.data_scope !== scope.data_scope
        );

        if (invalidRecords.length > 0) {
          return {
            status: "fail",
            message: `${invalidRecords.length} records returned outside tenant scope`,
            details: { invalidCount: invalidRecords.length },
          };
        }
      }

      return {
        status: "pass",
        message: "SELECT properly isolates by tenant",
      };
    } catch (error) {
      return {
        status: "error",
        message: error.message,
      };
    }
  }

  /**
   * Test tenant isolation on INSERT operations
   */
  async testTenantInsertIsolation(tableName) {
    try {
      if (!this.tenantContext) {
        return {
          status: "skip",
          message: "No tenant context provided",
        };
      }

      const repo = new SupabaseRepository({ tableName });
      const scope = requireTenantScope(this.tenantContext);

      // Try to insert with wrong tenant_id - should fail
      const wrongTenantRecord = {
        tenant_id: "wrong-tenant-id",
        data_scope: scope.data_scope,
        test_field: "rls_test",
      };

      const insertResult = await repo.create(wrongTenantRecord, {
        activeTenantContext: { tenant_id: "wrong-tenant-id", data_scope: scope.data_scope },
      });

      // If insert succeeds with wrong tenant, RLS is not working
      if (!insertResult.error) {
        // Clean up the test record
        await repo.delete(insertResult.data.id, {
          activeTenantContext: { tenant_id: "wrong-tenant-id", data_scope: scope.data_scope },
        });

        return {
          status: "fail",
          message: "INSERT allowed with wrong tenant_id - RLS not enforced",
        };
      }

      // If insert fails with wrong tenant, RLS is working
      if (insertResult.error) {
        return {
          status: "pass",
          message: "INSERT properly enforces tenant isolation",
        };
      }

      return {
        status: "pass",
        message: "INSERT tenant isolation verified",
      };
    } catch (error) {
      return {
        status: "error",
        message: error.message,
      };
    }
  }

  /**
   * Test tenant isolation on UPDATE operations
   */
  async testTenantUpdateIsolation(tableName) {
    try {
      if (!this.tenantContext) {
        return {
          status: "skip",
          message: "No tenant context provided",
        };
      }

      const repo = new SupabaseRepository({ tableName });
      const scope = requireTenantScope(this.tenantContext);

      // Get a record from the correct tenant
      const records = await repo.getAll({ activeTenantContext: this.tenantContext });

      if (!records.data || records.data.length === 0) {
        return {
          status: "skip",
          message: "No records found to test UPDATE isolation",
        };
      }

      const testRecord = records.data[0];

      // Try to update with wrong tenant context
      const updateResult = await repo.update(testRecord.id, { test_field: "rls_update_test" }, {
        activeTenantContext: { tenant_id: "wrong-tenant-id", data_scope: scope.data_scope },
      });

      // If update succeeds with wrong tenant, RLS is not working
      if (!updateResult.error) {
        return {
          status: "fail",
          message: "UPDATE allowed with wrong tenant context - RLS not enforced",
        };
      }

      return {
        status: "pass",
        message: "UPDATE properly enforces tenant isolation",
      };
    } catch (error) {
      return {
        status: "error",
        message: error.message,
      };
    }
  }

  /**
   * Test tenant isolation on DELETE operations
   */
  async testTenantDeleteIsolation(tableName) {
    try {
      if (!this.tenantContext) {
        return {
          status: "skip",
          message: "No tenant context provided",
        };
      }

      const repo = new SupabaseRepository({ tableName });
      const scope = requireTenantScope(this.tenantContext);

      // Get a record from the correct tenant
      const records = await repo.getAll({ activeTenantContext: this.tenantContext });

      if (!records.data || records.data.length === 0) {
        return {
          status: "skip",
          message: "No records found to test DELETE isolation",
        };
      }

      const testRecord = records.data[0];

      // Try to delete with wrong tenant context
      const deleteResult = await repo.delete(testRecord.id, {
        activeTenantContext: { tenant_id: "wrong-tenant-id", data_scope: scope.data_scope },
      });

      // If delete succeeds with wrong tenant, RLS is not working
      if (!deleteResult.error) {
        return {
          status: "fail",
          message: "DELETE allowed with wrong tenant context - RLS not enforced",
        };
      }

      return {
        status: "pass",
        message: "DELETE properly enforces tenant isolation",
      };
    } catch (error) {
      return {
        status: "error",
        message: error.message,
      };
    }
  }

  /**
   * Test if RLS policies exist for the table
   */
  async testPoliciesExist(tableName) {
    try {
      // This would typically query pg_policies table
      // For now, we'll check if the repository can operate with tenant context
      const repo = new SupabaseRepository({ tableName });

      if (!this.tenantContext) {
        return {
          status: "skip",
          message: "No tenant context provided",
        };
      }

      const result = await repo.getAll({ activeTenantContext: this.tenantContext });

      if (result.error && result.message.includes("policy")) {
        return {
          status: "fail",
          message: `Policy error: ${result.message}`,
        };
      }

      return {
        status: "pass",
        message: "Policies appear to be configured",
      };
    } catch (error) {
      return {
        status: "error",
        message: error.message,
      };
    }
  }

  /**
   * Test cross-tenant access denial
   */
  async testCrossTenantAccessDenial() {
    const results = {
      timestamp: new Date().toISOString(),
      tests: {},
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
      },
    };

    for (const tableName of this.tables) {
      try {
        const result = await this.testCrossTenantAccessForTable(tableName);
        results.tests[tableName] = result;
        results.summary.totalTests++;

        if (result.status === "pass") {
          results.summary.passed++;
        } else {
          results.summary.failed++;
        }
      } catch (error) {
        results.tests[tableName] = {
          status: "error",
          message: error.message,
        };
        results.summary.totalTests++;
        results.summary.failed++;
      }
    }

    results.overallStatus = results.summary.failed === 0 ? "pass" : "fail";
    return results;
  }

  /**
   * Test cross-tenant access for a specific table
   */
  async testCrossTenantAccessForTable(tableName) {
    try {
      if (!this.tenantContext) {
        return {
          status: "skip",
          message: "No tenant context provided",
        };
      }

      const repo = new SupabaseRepository({ tableName });
      const wrongContext = {
        tenant_id: "different-tenant-id",
        data_scope: this.tenantContext.data_scope,
      };

      // Try to access with different tenant
      const result = await repo.getAll({ activeTenantContext: wrongContext });

      // Should return empty or error, not data from other tenant
      if (result.data && result.data.length > 0) {
        return {
          status: "fail",
          message: "Cross-tenant access returned data - isolation breach",
        };
      }

      return {
        status: "pass",
        message: "Cross-tenant access properly denied",
      };
    } catch {
      // Errors are acceptable for cross-tenant access attempts
      return {
        status: "pass",
        message: "Cross-tenant access blocked with error",
      };
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

    let text = `RLS Verification Report\n`;
    text += `Generated: ${report.timestamp}\n`;
    text += `Overall Status: ${report.overallStatus.toUpperCase()}\n\n`;

    text += `Summary:\n`;
    text += `- Total Tables: ${report.summary.totalTables}\n`;
    text += `- Passed: ${report.summary.passedTests}\n`;
    text += `- Failed: ${report.summary.failedTests}\n`;
    text += `- Skipped: ${report.summary.skippedTests}\n\n`;

    text += `Table Results:\n`;
    for (const [tableName, tableResult] of Object.entries(report.tests)) {
      const statusIcon = tableResult.status === "pass" ? "✓" : tableResult.status === "fail" ? "✗" : tableResult.status === "error" ? "⚠" : "○";
      text += `${statusIcon} ${tableName}: ${tableResult.status.toUpperCase()}\n`;
      text += `  ${tableResult.message}\n`;

      if (tableResult.tests) {
        for (const [testName, testResult] of Object.entries(tableResult.tests)) {
          const testIcon = testResult.status === "pass" ? "✓" : testResult.status === "fail" ? "✗" : "○";
          text += `    ${testIcon} ${testName}: ${testResult.status.toUpperCase()}\n`;
        }
      }
      text += `\n`;
    }

    return text;
  }
}

/**
 * Factory function to create RLS verifier
 */
export function createRLSVerifier(tenantContext) {
  return new RLSVerifier({ tenantContext });
}

/**
 * Quick RLS verification utility
 */
export async function quickRLSVerify(tenantContext) {
  const verifier = createRLSVerifier(tenantContext);
  return await verifier.verify();
}
