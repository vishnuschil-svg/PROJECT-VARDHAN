import { useMemo, useState } from "react";
import AdminLayout from "../../components/platform-admin/AdminLayout";
import Badge from "../../components/common/Badge";
import {
  DEFAULT_ROLES,
  PERMISSION_GROUPS,
  ROLE_SCOPE_VARIANTS,
  canManageRole,
  canRoleAccessRealData,
  countRolePermissions,
  getVisibleRoles,
} from "../../config/roleAccess";
import { isPlatformOwner } from "../../config/erpModules";
import { useAuth } from "../../hooks/useAuth";
import "./RolesPermissions.css";

function RolesPermissions() {
  const { profile, role } = useAuth();
  const canManagePlatformRoles = isPlatformOwner(profile, role);
  const [roles, setRoles] = useState(DEFAULT_ROLES);

  const visibleRoles = useMemo(
    () => getVisibleRoles(roles, canManagePlatformRoles),
    [canManagePlatformRoles, roles]
  );

  const summary = useMemo(
    () => ({
      total: visibleRoles.length,
      platform: visibleRoles.filter((item) => item.scope === "platform").length,
      tenant: visibleRoles.filter((item) => item.scope === "tenant").length,
      demo: visibleRoles.filter((item) => item.scope === "demo").length,
    }),
    [visibleRoles]
  );

  const togglePermission = (roleId, permissionId) => {
    setRoles((currentRoles) =>
      currentRoles.map((item) => {
        if (item.id !== roleId || !canManageRole(item, canManagePlatformRoles)) {
          return item;
        }

        return {
          ...item,
          permissions: {
            ...item.permissions,
            [permissionId]: !item.permissions?.[permissionId],
          },
        };
      })
    );
  };

  return (
    <AdminLayout
      title="Roles & Permissions"
      subtitle="Manage default roles and role-wise permission groups"
    >
      <div className="roles-summary-grid">
        <div className="roles-summary-card">
          <span>Visible Roles</span>
          <strong>{summary.total}</strong>
        </div>
        <div className="roles-summary-card">
          <span>Platform Roles</span>
          <strong>{summary.platform}</strong>
        </div>
        <div className="roles-summary-card">
          <span>Tenant Roles</span>
          <strong>{summary.tenant}</strong>
        </div>
        <div className="roles-summary-card">
          <span>Demo Roles</span>
          <strong>{summary.demo}</strong>
        </div>
      </div>

      <div className="roles-security-note">
        <strong>
          {canManagePlatformRoles ? "Platform Owner access" : "Tenant Admin access"}
        </strong>
        <span>
          Demo Customer permissions are sandbox-only and must not expose real
          business data.
        </span>
      </div>

      <section className="roles-panel">
        <div className="roles-panel-header">
          <h2>Role List</h2>
          <p>Default roles for platform and tenant-level access control.</p>
        </div>

        <div className="roles-list">
          {visibleRoles.map((item) => (
            <div key={item.id} className="role-card">
              <div className="role-header">
                <div className="role-icon">{item.name.slice(0, 2).toUpperCase()}</div>
                <div className="role-info">
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                </div>
              </div>

              <div className="role-meta">
                <Badge
                  label={item.scope}
                  variant={ROLE_SCOPE_VARIANTS[item.scope] || "default"}
                  size="small"
                />
                <Badge
                  label={`${countRolePermissions(item)} Permissions`}
                  variant="info"
                  size="small"
                />
                <Badge
                  label={canRoleAccessRealData(item) ? "Real Data Allowed" : "Demo Only"}
                  variant={canRoleAccessRealData(item) ? "success" : "warning"}
                  size="small"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="roles-panel">
        <div className="roles-panel-header">
          <h2>Permission Matrix</h2>
          <p>Toggle tenant-level role permissions without changing UI routes.</p>
        </div>

        <div className="permission-matrix">
          <table className="matrix-table">
            <thead>
              <tr>
                <th>Permission Group</th>
                {visibleRoles.map((item) => (
                  <th key={item.id}>{item.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_GROUPS.map((permission) => (
                <tr key={permission.id}>
                  <td className="feature-name">{permission.label}</td>
                  {visibleRoles.map((item) => {
                    const manageable = canManageRole(item, canManagePlatformRoles);
                    const checked = Boolean(item.permissions?.[permission.id]);

                    return (
                      <td key={`${item.id}-${permission.id}`}>
                        <label className="permission-toggle">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={!manageable}
                            onChange={() => togglePermission(item.id, permission.id)}
                          />
                          <span>{checked ? "Allowed" : "Denied"}</span>
                        </label>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminLayout>
  );
}

export default RolesPermissions;
