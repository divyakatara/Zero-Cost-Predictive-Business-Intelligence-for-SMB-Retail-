import { useEffect, useState } from "react";
import { fetchJson } from "./api";
import {
  AccountCard, ChangePasswordCard, Notice, PageHeader, SecurityInfoCard,
  SettingsCard, SettingsGrid, SettingsRow, TabBar,
} from "./SettingsParts";

const ibm = { fontFamily: "'IBM Plex Sans', sans-serif" };

const tabs = ["Supplier Profile", "Account", "Security"];

function SupplierProfileTab({ supplierId }) {
  const [supplier, setSupplier] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(supplierId));

  useEffect(() => {
    if (!supplierId) return;
    fetchJson("/suppliers/")
      .then((rows) => {
        const match = rows.find((row) => row.supplier_id === supplierId);
        if (match) setSupplier(match);
        else setError(`No supplier record matches ${supplierId}.`);
      })
      .catch(() => setError("Could not load your supplier record."))
      .finally(() => setLoading(false));
  }, [supplierId]);

  if (!supplierId) {
    return <Notice>This account is not linked to a supplier ID, so there is no supplier record to show.</Notice>;
  }

  return (
    <SettingsGrid>
      <SettingsCard title="Supplier Details" subtitle="From the supplier records in the ERP dataset">
        {error && <Notice>{error}</Notice>}
        <SettingsRow label="Supplier ID" value={supplierId} />
        <SettingsRow label="Name" value={loading ? "Loading…" : supplier?.supplier_name} />
        <SettingsRow label="Location" value={supplier?.location} />
        <SettingsRow label="Contact number" value={supplier?.contact_number} />
        <SettingsRow label="Branch" value={supplier?.branch_id} />
      </SettingsCard>
      <SettingsCard title="Performance Snapshot" subtitle="How retailers see you when ranking suppliers">
        <SettingsRow label="Rating" value={supplier?.rating != null ? `${supplier.rating} / 5` : ""} />
        <SettingsRow label="Lead time" value={supplier?.lead_time_days != null ? `${supplier.lead_time_days} days` : ""} />
        <SettingsRow label="Supply risk score" value={supplier?.supplier_risk_score} />
        <SettingsRow label="Stock status" value={supplier?.stock_status} />
      </SettingsCard>
    </SettingsGrid>
  );
}

export default function SSettingsPage({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState("Supplier Profile");

  return (
    <div style={{ ...ibm }}>
      <PageHeader title="Settings" subtitle="Your supplier profile, account and security" />
      <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {activeTab === "Supplier Profile" && <SupplierProfileTab supplierId={user?.supplier_id} />}

      {activeTab === "Account" && (
        <SettingsGrid>
          <AccountCard onLogout={onLogout} extraRows={<SettingsRow label="Supplier ID" value={user?.supplier_id} />} />
        </SettingsGrid>
      )}

      {activeTab === "Security" && (
        <SettingsGrid>
          <ChangePasswordCard />
          <SecurityInfoCard />
        </SettingsGrid>
      )}
    </div>
  );
}
