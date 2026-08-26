import { useState } from "react";

const fontLink = document.createElement("link");
fontLink.href = "https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap";
fontLink.rel = "stylesheet";
document.head.appendChild(fontLink);

const C = {
  bg:          "#f5f2ec",
  card:        "#ffffff",
  cardGreen:   "#eef4ee",
  green:       "#4a7a49",
  greenLight:  "#c8d8c7",
  greenMid:    "#7aaa79",
  greenBorder: "#c8d8c7",
  greenSubtle: "#f0f6f0",
  text:        "#1a1a1a",
  textMuted:   "#5a6e5a",
  textDim:     "#9aaa9a",
  border:      "#e4ddd4",
  danger:      "#b8543f",
};

const syne = { fontFamily: "Syne, sans-serif" };
const ibm  = { fontFamily: "'IBM Plex Sans', sans-serif" };

const businessCategories = [
  "Retail", "Wholesale", "Manufacturing", "Food & Beverage",
  "Services", "E-commerce", "Distribution", "Other",
];

const businessTypes = [
  "Sole Proprietorship", "Partnership", "Private Limited",
  "LLP", "Public Limited", "Other",
];

const steps = ["Business Info", "Location & Contact", "Legal & Tax"];

function Field({ label, required, hint, error, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{
        display: "block", fontSize: 11, fontWeight: 600, color: C.textMuted,
        letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 8,
      }}>
        {label} {required && <span style={{ color: C.danger }}>*</span>}
      </label>
      {children}
      {hint && !error && (
        <div style={{ fontSize: 11, color: C.textDim, marginTop: 6 }}>{hint}</div>
      )}
      {error && (
        <div style={{ fontSize: 11, color: C.danger, marginTop: 6, fontWeight: 500 }}>{error}</div>
      )}
    </div>
  );
}

const inputStyle = (hasError) => ({
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: `1px solid ${hasError ? C.danger : C.border}`,
  background: C.bg,
  fontSize: 13,
  color: C.text,
  fontFamily: "'IBM Plex Sans', sans-serif",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color .15s",
});

export default function BRegisterBusinessPage({ user, onSubmit, onBack }) {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    businessName: "",
    businessType: "",
    category: "",
    yearEstablished: "",
    employeeCount: "",
    description: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
    phone: "",
    email: user?.email || "",
    website: "",
    gstin: "",
    pan: "",
    registrationNumber: "",
    gstCertificateName: "",
  });
  const [gstCertificateFile, setGstCertificateFile] = useState(null);
  const [fileError, setFileError] = useState("");

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isValidType = ["application/pdf", "image/jpeg", "image/png"].includes(file.type);
    const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB

    if (!isValidType) {
      setFileError("Please upload a PDF, JPG, or PNG file.");
      return;
    }
    if (!isValidSize) {
      setFileError("File must be under 5MB.");
      return;
    }

    setFileError("");
    setGstCertificateFile(file);
    setForm((f) => ({ ...f, gstCertificateName: file.name }));
  };

  const removeFile = () => {
    setGstCertificateFile(null);
    setForm((f) => ({ ...f, gstCertificateName: "" }));
    setFileError("");
  };

  const update = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (errors[key]) setErrors((er) => ({ ...er, [key]: null }));
  };

  const requiredByStep = [
    ["businessName", "businessType", "category"],
    ["addressLine1", "city", "state", "pincode", "phone", "email"],
    ["registrationNumber"],
  ];

  const validateStep = () => {
    const req = requiredByStep[step];
    const newErrors = {};
    req.forEach((k) => {
      if (!form[k] || !form[k].trim()) newErrors[k] = "This field is required";
    });
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) {
      newErrors.email = "Enter a valid email address";
    }
    if (form.pincode && !/^\d{4,8}$/.test(form.pincode)) {
      newErrors.pincode = "Enter a valid postal code";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (step < steps.length - 1) {
      setStep(step + 1);
      return;
    }
    // Final step: hand the collected data back to the parent (App.jsx),
    // which saves it via businessStore.js
    onSubmit?.(form);
    setSubmitted(true);
  };

  const handleBack = () => {
    if (step === 0) {
      onBack?.();
      return;
    }
    setErrors({});
    setStep((s) => Math.max(0, s - 1));
  };

  if (submitted) {
    return (
      <div style={{ ...ibm, background: C.bg, minHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
        <div style={{
          background: C.card, borderRadius: 16, padding: "48px 40px", maxWidth: 460,
          textAlign: "center", border: `1px solid ${C.border}`, boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%", background: C.green, color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26,
            margin: "0 auto 20px", boxShadow: "0 4px 16px rgba(74,122,73,0.25)",
          }}>✓</div>
          <div style={{ ...syne, fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 10 }}>
            Business Registered
          </div>
          <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.6, marginBottom: 24 }}>
            <strong style={{ color: C.text }}>{form.businessName}</strong> has been submitted for verification.
            We'll notify you at {form.email} once it's approved.
          </div>
          <button
            onClick={() => onBack ? onBack() : (setSubmitted(false), setStep(0))}
            style={{
              background: C.green, color: "#fff", border: "none", borderRadius: 10,
              padding: "12px 24px", fontSize: 13, fontWeight: 600, cursor: "pointer",
              fontFamily: "'IBM Plex Sans', sans-serif", width: "100%",
              boxShadow: "0 4px 16px rgba(74,122,73,0.2)",
            }}
          >
            Continue →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...ibm, background: C.bg, minHeight: "100%", padding: 40 }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>

        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ width: 3, height: 28, background: C.green, borderRadius: 2 }}></div>
            <h1 style={{ ...syne, margin: 0, fontSize: 26, fontWeight: 800, color: C.text, letterSpacing: "0.5px" }}>
              Register Your Business
            </h1>
          </div>
          <p style={{ margin: "0 0 0 13px", color: C.textDim, fontSize: 12, letterSpacing: "0.5px" }}>
            Tell us about your business · Step {step + 1} of {steps.length}
          </p>
        </div>

        {/* Step progress */}
        <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
          {steps.map((s, i) => (
            <div key={s} style={{ flex: 1 }}>
              <div style={{
                height: 4, borderRadius: 4, marginBottom: 8,
                background: i <= step ? C.green : "#eee8e0",
                transition: "background .2s",
              }} />
              <div style={{
                fontSize: 11, fontWeight: i === step ? 700 : 500,
                color: i === step ? C.text : C.textDim,
              }}>{s}</div>
            </div>
          ))}
        </div>

        <div style={{
          background: C.card, borderRadius: 12, padding: "28px",
          border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}>

          {step === 0 && (
            <>
              <Field label="Business Name" required error={errors.businessName}>
                <input style={inputStyle(errors.businessName)} placeholder="e.g. Greenfield Traders"
                  value={form.businessName} onChange={update("businessName")} />
              </Field>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Field label="Business Type" required error={errors.businessType}>
                  <select style={inputStyle(errors.businessType)} value={form.businessType} onChange={update("businessType")}>
                    <option value="">Select type</option>
                    {businessTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Category" required error={errors.category}>
                  <select style={inputStyle(errors.category)} value={form.category} onChange={update("category")}>
                    <option value="">Select category</option>
                    {businessCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Field label="Year Established" hint="Optional">
                  <input style={inputStyle(false)} placeholder="e.g. 2019" value={form.yearEstablished} onChange={update("yearEstablished")} />
                </Field>
                <Field label="Employee Count" hint="Optional">
                  <input style={inputStyle(false)} placeholder="e.g. 12" value={form.employeeCount} onChange={update("employeeCount")} />
                </Field>
              </div>

              <Field label="Description" hint="A short summary of what your business does">
                <textarea style={{ ...inputStyle(false), resize: "vertical", minHeight: 80, fontFamily: "'IBM Plex Sans', sans-serif" }}
                  placeholder="We supply..." value={form.description} onChange={update("description")} />
              </Field>
            </>
          )}

          {step === 1 && (
            <>
              <Field label="Address Line 1" required error={errors.addressLine1}>
                <input style={inputStyle(errors.addressLine1)} placeholder="Street address" value={form.addressLine1} onChange={update("addressLine1")} />
              </Field>
              <Field label="Address Line 2" hint="Optional">
                <input style={inputStyle(false)} placeholder="Apartment, suite, unit" value={form.addressLine2} onChange={update("addressLine2")} />
              </Field>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Field label="City" required error={errors.city}>
                  <input style={inputStyle(errors.city)} value={form.city} onChange={update("city")} />
                </Field>
                <Field label="State" required error={errors.state}>
                  <input style={inputStyle(errors.state)} value={form.state} onChange={update("state")} />
                </Field>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Field label="Postal Code" required error={errors.pincode}>
                  <input style={inputStyle(errors.pincode)} value={form.pincode} onChange={update("pincode")} />
                </Field>
                <Field label="Country">
                  <input style={inputStyle(false)} value={form.country} onChange={update("country")} />
                </Field>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Field label="Phone Number" required error={errors.phone}>
                  <input style={inputStyle(errors.phone)} placeholder="+91" value={form.phone} onChange={update("phone")} />
                </Field>
                <Field label="Business Email" required error={errors.email}>
                  <input style={inputStyle(errors.email)} placeholder="you@business.com" value={form.email} onChange={update("email")} />
                </Field>
              </div>

              <Field label="Website" hint="Optional">
                <input style={inputStyle(false)} placeholder="https://" value={form.website} onChange={update("website")} />
              </Field>
            </>
          )}

          {step === 2 && (
            <>
              <Field label="Business Registration Number" required error={errors.registrationNumber}
                hint="e.g. CIN, LLPIN, or local registration ID">
                <input style={inputStyle(errors.registrationNumber)} value={form.registrationNumber} onChange={update("registrationNumber")} />
              </Field>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Field label="GSTIN" hint="Optional">
                  <input style={inputStyle(false)} value={form.gstin} onChange={update("gstin")} />
                </Field>
                <Field label="PAN" hint="Optional">
                  <input style={inputStyle(false)} value={form.pan} onChange={update("pan")} />
                </Field>
              </div>

              <Field label="GST Certificate" hint={!fileError ? "Upload a PDF or image (max 5MB) — speeds up verification" : undefined} error={fileError}>
                {!gstCertificateFile ? (
                  <label style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    border: `1.5px dashed ${fileError ? C.danger : C.greenBorder}`, borderRadius: 10,
                    padding: "18px 14px", cursor: "pointer", background: C.cardGreen,
                    fontSize: 13, color: C.green, fontWeight: 600,
                  }}>
                    <span style={{ fontSize: 16 }}>⇪</span> Choose File to Upload
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                      style={{ display: "none" }}
                    />
                  </label>
                ) : (
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    border: `1px solid ${C.greenBorder}`, borderRadius: 10, padding: "12px 16px",
                    background: C.cardGreen,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <span style={{ fontSize: 16, color: C.green }}>📄</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 260 }}>
                          {gstCertificateFile.name}
                        </div>
                        <div style={{ fontSize: 11, color: C.textDim }}>
                          {(gstCertificateFile.size / 1024).toFixed(0)} KB
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeFile}
                      style={{
                        background: "transparent", border: "none", color: C.danger,
                        fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0,
                      }}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </Field>

              <div style={{
                background: C.cardGreen, border: `1px solid ${C.greenBorder}`, borderRadius: 10,
                padding: "14px 16px", fontSize: 12, color: C.textMuted, lineHeight: 1.6, marginTop: 8,
              }}>
                By submitting, you confirm that the details provided are accurate. Your business will be
                reviewed before it's activated on the platform.
              </div>
            </>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
            <button
              onClick={handleBack}
              style={{
                padding: "12px 22px", borderRadius: 10, border: `1px solid ${C.border}`,
                background: "transparent", color: C.text,
                fontSize: 13, fontWeight: 600, cursor: "pointer",
                fontFamily: "'IBM Plex Sans', sans-serif",
              }}
            >
              Back
            </button>
            <button
              onClick={handleNext}
              style={{
                padding: "12px 26px", borderRadius: 10, border: "none",
                background: C.green, color: "#fff", fontSize: 13, fontWeight: 600,
                cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif",
                boxShadow: "0 4px 16px rgba(74,122,73,0.2)",
              }}
            >
              {step === steps.length - 1 ? "Submit Registration" : "Continue"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}