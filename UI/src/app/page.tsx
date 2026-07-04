"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { AppState, LineItem } from "@/lib/types";
import {
  generateId,
  generateDocNumber,
  incrementCounter,
  formatDate,
  formatCurrency,
  cleanPhone,
  computeTotals,
  defaultState,
} from "@/lib/utils";

export default function Home() {
  const [state, setState] = useState<AppState>(defaultState);
  const [loaded, setLoaded] = useState(false);
  const [mobileTab, setMobileTab] = useState<"form" | "preview">("form");
  const previewRef = useRef<HTMLDivElement>(null);

  // --- localStorage ---
  useEffect(() => {
    const draft = localStorage.getItem("chapisho_draft");
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setState((prev) => ({ ...prev, ...parsed }));
      } catch {
        /* ignore */
      }
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem("chapisho_draft", JSON.stringify(state));
    }
  }, [state, loaded]);

  // --- helpers ---
  const updateField = useCallback(
    <K extends keyof AppState>(key: K, value: AppState[K]) => {
      setState((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleDocTypeChange = useCallback((docType: AppState["docType"]) => {
    const newDocNumber = generateDocNumber(docType);
    const notes =
      docType === "Bei-Kadirio"
        ? "Bei hii ni ya makadirio pekee kulingana na mahitaji yako na inaweza kubadilika kulingana na soko au makubaliano."
        : "Asante kwa kufanya biashara nasi. Malipo yote yafanyike ndani ya siku zilizopangwa kwenye ankara hii.";
    setState((prev) => ({
      ...prev,
      docType,
      docNumber: newDocNumber,
      additionalNotes: notes,
    }));
  }, []);

  // --- logo ---
  const handleLogoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      alert("Faili ni kubwa mno! Tafadhali weka nembo isiyozidi 1MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setState((prev) => ({ ...prev, logoBase64: reader.result as string }));
    };
    reader.readAsDataURL(file);
  }, []);

  const removeLogo = useCallback(() => {
    setState((prev) => ({ ...prev, logoBase64: "" }));
  }, []);

  // --- line items ---
  const addItem = useCallback(() => {
    setState((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { id: generateId(), description: "", qty: 1, price: 0 },
      ],
    }));
  }, []);

  const removeItem = useCallback((id: string) => {
    setState((prev) => {
      if (prev.items.length <= 1) {
        return {
          ...prev,
          items: [{ id: generateId(), description: "", qty: 1, price: 0 }],
        };
      }
      return { ...prev, items: prev.items.filter((i) => i.id !== id) };
    });
  }, []);

  const updateItem = useCallback(
    (id: string, field: keyof LineItem, value: string | number) => {
      setState((prev) => ({
        ...prev,
        items: prev.items.map((item) =>
          item.id === id
            ? {
                ...item,
                [field]:
                  field === "description"
                    ? (value as string)
                    : typeof value === "string"
                    ? parseFloat(value) || 0
                    : value,
              }
            : item
        ),
      }));
    },
    []
  );

  // --- validation ---
  const runValidation = useCallback((): boolean => {
    let valid = true;
    const required = [
      { key: "myName" as const, id: "err-my-name" },
      { key: "myPhone" as const, id: "err-my-phone" },
      { key: "clientName" as const, id: "err-client-name" },
      { key: "clientPhone" as const, id: "err-client-phone" },
    ];
    required.forEach(({ key, id }) => {
      const el = document.getElementById(id);
      if (!state[key].trim()) {
        el?.style.setProperty("display", "flex");
        valid = false;
      } else {
        el?.style.setProperty("display", "none");
      }
    });
    const hasItems = state.items.some(
      (item) => item.description.trim() !== ""
    );
    if (!hasItems) {
      alert(
        "Tafadhali ongeza angalau bidhaa/huduma moja yenye maelezo kabla ya kuendelea."
      );
      valid = false;
    }
    return valid;
  }, [state]);

  // --- PDF ---
  const generatePDF = useCallback(
    (callback?: () => void) => {
      if (!previewRef.current) return;

      import("html2pdf.js").then((html2pdf) => {
        const element = previewRef.current!;
        const filename = `${state.docNumber || "ankara"}.pdf`;
        const opt = {
          margin: [10, 10, 10, 10],
          filename,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, letterRendering: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        };

        if (callback) {
          html2pdf
            .default()
            .set(opt)
            .from(element)
            .toPdf()
            .get("pdf")
            .then((pdf: any) => {
              pdf.save(filename);
              callback();
            });
        } else {
          html2pdf.default().set(opt).from(element).save();
        }
        incrementCounter();
        setState((prev) => ({
          ...prev,
          docNumber: generateDocNumber(prev.docType),
        }));
      });
    },
    [state.docNumber, state.docType]
  );

  const handleDownload = useCallback(() => {
    if (!runValidation()) return;
    generatePDF();
  }, [runValidation, generatePDF]);

  const handleWhatsApp = useCallback(() => {
    if (!runValidation()) return;
    const totals = computeTotals(state);
    let phone = cleanPhone(state.clientPhone);
    const term = state.docType === "Ankara" ? "ankara" : "bei-kadirio";
    const text = `Habari ${state.clientName}, hii ni ${term} yako namba ${state.docNumber} yenye jumla ya ${formatCurrency(
      totals.grandTotal
    )}. Tafadhali pakua faili la PDF lililoambatanishwa hapa.`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

    generatePDF(() => {
      setTimeout(() => window.open(url, "_blank"), 500);
    });
  }, [runValidation, generatePDF, state]);

  // --- reset ---
  const handleReset = useCallback(() => {
    if (
      !confirm(
        "Una uhakika unataka kufuta taarifa zote na kuanza upya? Kazi yako ya sasa haitahifadhiwa tena."
      )
    )
      return;
    localStorage.removeItem("chapisho_draft");
    setState(defaultState());
  }, []);

  // --- totals ---
  const totals = computeTotals(state);
  const items = state.items;
  const validItems = items.filter((i) => i.description.trim() !== "");

  // --- render ---
  return (
    <div className="app-container">
      <header>
        <div>
          <h1>Chapisho</h1>
          <p>Tengeneza Ankara Bila Malipo</p>
        </div>
        <button className="btn btn-secondary" onClick={handleReset}>
          Anza Upya
        </button>
      </header>

      {/* Mobile tabs */}
      <div className="mobile-tabs">
        <button
          className={`mobile-tab-btn ${mobileTab === "form" ? "active" : ""}`}
          onClick={() => setMobileTab("form")}
        >
          Hariri Ankara
        </button>
        <button
          className={`mobile-tab-btn ${mobileTab === "preview" ? "active" : ""}`}
          onClick={() => setMobileTab("preview")}
        >
          Hakiki Hati
        </button>
      </div>

      <div className="main-grid">
        {/* LEFT COLUMN — Form */}
        <div
          className={`form-wrapper tab-content ${mobileTab === "form" ? "active" : ""}`}
        >
          {/* Doc type selector */}
          <div className="doc-selector">
            <button
              className={state.docType === "Ankara" ? "active" : ""}
              onClick={() => handleDocTypeChange("Ankara")}
            >
              Ankara (Invoice)
            </button>
            <button
              className={state.docType === "Bei-Kadirio" ? "active" : ""}
              onClick={() => handleDocTypeChange("Bei-Kadirio")}
            >
              Bei-Kadirio (Quote)
            </button>
          </div>

          {/* Seller info */}
          <div className="form-section">
            <h2>Taarifa Zangu (Muuzaji)</h2>
            <div className="form-group">
              <label htmlFor="my-name">
                Jina la Biashara au Jina Lako <span>*</span>
              </label>
              <input
                id="my-name"
                type="text"
                placeholder="Mf. Kipaji Tech & Construction"
                value={state.myName}
                onChange={(e) => updateField("myName", e.target.value)}
              />
              <div
                id="err-my-name"
                className="validation-error-text"
                style={{ display: "none" }}
              >
                ⚠ Tafadhali jaza jina la biashara yako.
              </div>
            </div>
            <div className="grid-columns">
              <div className="form-group">
                <label htmlFor="my-phone">
                  Nambari ya Simu <span>*</span>
                </label>
                <input
                  id="my-phone"
                  type="tel"
                  placeholder="Mf. 0712345678"
                  value={state.myPhone}
                  onChange={(e) => updateField("myPhone", e.target.value)}
                />
                <div
                  id="err-my-phone"
                  className="validation-error-text"
                  style={{ display: "none" }}
                >
                  ⚠ Tafadhali jaza namba yako ya simu.
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="my-email">Barua Pepe (Email)</label>
                <input
                  id="my-email"
                  type="email"
                  placeholder="Mf. info@kipaji.co.tz"
                  value={state.myEmail}
                  onChange={(e) => updateField("myEmail", e.target.value)}
                />
              </div>
            </div>
            <div className="form-group" style={{ marginTop: 16 }}>
              <label htmlFor="my-address">Anwani ya Makazi</label>
              <textarea
                id="my-address"
                rows={2}
                placeholder="Mf. Ghorofa ya 3, Jengo la Samora, Posta, Dar es Salaam"
                value={state.myAddress}
                onChange={(e) => updateField("myAddress", e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginTop: 16 }}>
              <label>Nembo ya Biashara</label>
              <div className="logo-uploader">
                <div
                  className="logo-thumbnail"
                  style={
                    state.logoBase64
                      ? {
                          backgroundImage: `url(${state.logoBase64})`,
                          backgroundSize: "contain",
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "center",
                        }
                      : undefined
                  }
                >
                  {!state.logoBase64 && <span>Hakuna</span>}
                </div>
                <div style={{ display: "flex", gap: 8, flexDirection: "column" }}>
                  <div className="file-input-wrapper">
                    <button className="btn btn-secondary" type="button">
                      Weka Nembo
                    </button>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                    />
                  </div>
                  {state.logoBase64 && (
                    <button
                      className="btn btn-danger"
                      type="button"
                      onClick={removeLogo}
                      style={{ padding: "6px 12px", fontSize: 12 }}
                    >
                      Futa Nembo
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Customer info */}
          <div className="form-section">
            <h2>Taarifa za Mteja</h2>
            <div className="form-group">
              <label htmlFor="client-name">
                Jina la Mteja (Mtu au Kampuni) <span>*</span>
              </label>
              <input
                id="client-name"
                type="text"
                placeholder="Mf. Bakhresa Group au Juma Hamisi"
                value={state.clientName}
                onChange={(e) => updateField("clientName", e.target.value)}
              />
              <div
                id="err-client-name"
                className="validation-error-text"
                style={{ display: "none" }}
              >
                ⚠ Tafadhali jaza jina la mteja wetu.
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="client-phone">
                Nambari ya Simu ya Mteja <span>*</span>
              </label>
              <input
                id="client-phone"
                type="tel"
                placeholder="Mf. 255712345678"
                value={state.clientPhone}
                onChange={(e) => updateField("clientPhone", e.target.value)}
              />
              <div
                id="err-client-phone"
                className="validation-error-text"
                style={{ display: "none" }}
              >
                ⚠ Tafadhali jaza nambari ya simu ya mteja.
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="client-address">Anwani ya Mteja</label>
              <textarea
                id="client-address"
                rows={2}
                placeholder="Mf. Plot 14, Barabara ya Bagamoyo, Mikocheni B"
                value={state.clientAddress}
                onChange={(e) => updateField("clientAddress", e.target.value)}
              />
            </div>
          </div>

          {/* Document meta */}
          <div className="form-section">
            <h2>Maelezo ya Hati</h2>
            <div className="grid-columns">
              <div className="form-group">
                <label htmlFor="doc-number">Nambari ya Hati</label>
                <input
                  id="doc-number"
                  type="text"
                  value={state.docNumber}
                  onChange={(e) => updateField("docNumber", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="doc-currency">Sarafu ya Hati</label>
                <input
                  id="doc-currency"
                  type="text"
                  value="TZS (Shilingi ya Tanzania)"
                  readOnly
                />
              </div>
            </div>
            <div className="grid-columns" style={{ marginTop: 16 }}>
              <div className="form-group">
                <label htmlFor="date-issue">Tarehe ya Kutolewa</label>
                <input
                  id="date-issue"
                  type="date"
                  value={state.dateIssue}
                  onChange={(e) => updateField("dateIssue", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="date-due">
                  {state.docType === "Bei-Kadirio"
                    ? "Mwisho wa Maisha ya Ofa"
                    : "Tarehe ya Mwisho wa Malipo"}
                </label>
                <input
                  id="date-due"
                  type="date"
                  value={state.dateDue}
                  onChange={(e) => updateField("dateDue", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Line items */}
          <div className="form-section">
            <h2>Bidhaa na Huduma</h2>
            <div className="items-header">
              <div>Maelezo</div>
              <div>Idadi</div>
              <div>Bei kwa Moja (TZS)</div>
              <div style={{ textAlign: "right" }}>Jumla Kuu</div>
              <div></div>
            </div>
            <div id="dynamic-items-container">
              {items.map((item) => (
                <div className="item-row" key={item.id}>
                  <div>
                    <label>Maelezo ya Huduma/Bidhaa</label>
                    <input
                      type="text"
                      className="item-row-desc-input"
                      placeholder="Mf. Kutengeneza Tovuti"
                      value={item.description}
                      onChange={(e) =>
                        updateItem(item.id, "description", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label>Idadi</label>
                    <input
                      type="number"
                      min={1}
                      placeholder="1"
                      value={item.qty}
                      onChange={(e) =>
                        updateItem(item.id, "qty", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label>Bei kwa Moja (TZS)</label>
                    <input
                      type="number"
                      min={0}
                      placeholder="150000"
                      value={item.price}
                      onChange={(e) =>
                        updateItem(item.id, "price", e.target.value)
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addItem();
                        }
                      }}
                    />
                  </div>
                  <div className="row-total-display">
                    {formatCurrency(item.qty * item.price)}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <button
                      className="btn btn-danger"
                      type="button"
                      onClick={() => removeItem(item.id)}
                      title="Futa Bidhaa Hii"
                      style={
                        items.length <= 1
                          ? { opacity: 0.3, cursor: "not-allowed" }
                          : undefined
                      }
                      disabled={items.length <= 1}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {validItems.length === 0 && (
              <div className="empty-table-warning">
                Ongeza angalau bidhaa au huduma moja kabla ya kuendelea.
              </div>
            )}
            <button
              className="btn btn-secondary btn-full"
              onClick={addItem}
            >
              + Ongeza Bidhaa/Huduma
            </button>
          </div>

          {/* Totals & tax */}
          <div className="form-section">
            <h2>Kodi (VAT) na Punguzo</h2>
            <div className="vat-toggle-container">
              <input
                type="checkbox"
                id="vat-checkbox-toggle"
                checked={state.vatEnabled}
                onChange={(e) => updateField("vatEnabled", e.target.checked)}
              />
              <label
                htmlFor="vat-checkbox-toggle"
                style={{ marginBottom: 0 }}
              >
                Ongeza Kodi ya VAT ya Tanzania (18%)
              </label>
            </div>
            <div className="grid-columns">
              <div className="form-group">
                <label htmlFor="discount-input">Kiasi cha Punguzo</label>
                <input
                  id="discount-input"
                  type="number"
                  min={0}
                  value={state.discountValue}
                  onChange={(e) =>
                    updateField("discountValue", parseFloat(e.target.value) || 0)
                  }
                />
              </div>
              <div className="form-group">
                <label htmlFor="discount-type-select">Aina ya Punguzo</label>
                <select
                  id="discount-type-select"
                  value={state.discountType}
                  onChange={(e) =>
                    updateField(
                      "discountType",
                      e.target.value as "FIXED" | "PERCENT"
                    )
                  }
                >
                  <option value="FIXED">TZS (Kiasi Maalumu)</option>
                  <option value="PERCENT">% (Asilimia)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Additional notes */}
          <div className="form-section">
            <h2>Maelezo ya Ziada & Masharti ya Malipo</h2>
            <textarea
              rows={3}
              placeholder="Mf. Malipo yafanyike kupitia akaunti ya Benki au huduma za Simu..."
              value={state.additionalNotes}
              onChange={(e) =>
                updateField("additionalNotes", e.target.value)
              }
            />
          </div>

          {/* Desktop action buttons */}
          <div className="desktop-actions-panel">
            <div className="grid-columns">
              <button className="btn btn-primary" onClick={handleDownload}>
                ⬇ Pakua PDF
              </button>
              <button className="btn btn-primary" onClick={handleWhatsApp}>
                📤 Tuma kwa WhatsApp
              </button>
            </div>
            <div className="action-subtext" style={{ marginTop: 12 }}>
              Tafadhali pakua kwanza nakala ya PDF kwenye kifaa chako, kisha
              WhatsApp itafunguka moja kwa moja ili uweze kumuambatanishia mteja
              faili hilo kirahisi.
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN — Live Preview */}
        <div
          className={`preview-sticky tab-content ${mobileTab === "preview" ? "active" : ""}`}
        >
          <div className="preview-pane" ref={previewRef}>
            <div className="preview-inner">
              <div>
                {/* Header */}
                <div className="preview-doc-header">
                  <div>
                    {state.logoBase64 && (
                      <div className="preview-logo-space">
                        <img src={state.logoBase64} alt="Nembo" />
                      </div>
                    )}
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 800,
                        textTransform: "uppercase",
                      }}
                    >
                      {state.myName || "MUUZAJI WA HUDUMA"}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "#5C5C5C",
                        marginTop: 2,
                      }}
                    >
                      {state.myPhone ? `Simu: ${state.myPhone}` : "Simu: --"}
                    </div>
                    <div style={{ fontSize: 13, color: "#5C5C5C" }}>
                      {state.myEmail || ""}
                    </div>
                    <div
                      className="preview-address-block"
                      style={{
                        fontSize: 13,
                        color: "#5C5C5C",
                        marginTop: 4,
                      }}
                    >
                      {state.myAddress || ""}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="preview-title">
                      {state.docType === "Ankara" ? "ANKARA" : "BEI-KADIRIO"}
                    </div>
                    <table
                      className="preview-meta-table"
                      style={{ marginLeft: "auto" }}
                    >
                      <tbody>
                        <tr>
                          <td>Nambari:</td>
                          <td>{state.docNumber || "--"}</td>
                        </tr>
                        <tr>
                          <td>Tarehe:</td>
                          <td>
                            {state.dateIssue
                              ? formatDate(state.dateIssue)
                              : "--"}
                          </td>
                        </tr>
                        <tr>
                          <td>
                            {state.docType === "Bei-Kadirio"
                              ? "Ofa Mwisho:"
                              : "Ilipewe Kabla:"}
                          </td>
                          <td>
                            {state.dateDue
                              ? formatDate(state.dateDue)
                              : "--"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Address split */}
                <div className="preview-split">
                  <div>
                    <div className="preview-split-title">Mteja</div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      {state.clientName || "---"}
                    </div>
                    <div style={{ marginTop: 2 }}>
                      {state.clientPhone
                        ? `Simu: ${state.clientPhone}`
                        : "Simu: ---"}
                    </div>
                    <div
                      className="preview-address-block"
                      style={{ marginTop: 4, color: "#5C5C5C" }}
                    >
                      {state.clientAddress || ""}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }} />
                </div>

                {/* Items table */}
                <table className="preview-table">
                  <thead>
                    <tr>
                      <th style={{ width: "50%" }}>Maelezo</th>
                      <th className="num" style={{ width: "10%" }}>
                        Idadi
                      </th>
                      <th className="num" style={{ width: "20%" }}>
                        Kimoja (TZS)
                      </th>
                      <th className="num" style={{ width: "20%" }}>
                        Jumla (TZS)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {validItems.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          style={{
                            textAlign: "center",
                            color: "#A0A0A0",
                            padding: 20,
                          }}
                        >
                          Hakuna bidhaa iliyowekwa bado.
                        </td>
                      </tr>
                    ) : (
                      validItems.map((item) => (
                        <tr key={item.id}>
                          <td>{item.description}</td>
                          <td className="num">{item.qty}</td>
                          <td className="num">
                            {Math.round(item.price).toLocaleString("en-US")}
                          </td>
                          <td className="num">
                            {Math.round(
                              item.qty * item.price
                            ).toLocaleString("en-US")}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {/* Totals */}
                <table className="preview-totals-table">
                  <tbody>
                    <tr>
                      <td>Jumla Ndogo:</td>
                      <td>{formatCurrency(totals.subtotal)}</td>
                    </tr>
                    {totals.discountAmount > 0 && (
                      <tr>
                        <td>Punguzo:</td>
                        <td>
                          - {formatCurrency(totals.discountAmount)}
                        </td>
                      </tr>
                    )}
                    {state.vatEnabled && (
                      <tr>
                        <td>VAT (18%):</td>
                        <td>{formatCurrency(totals.vatAmount)}</td>
                      </tr>
                    )}
                    <tr className="total-highlight">
                      <td>Jumla Kuu:</td>
                      <td>{formatCurrency(totals.grandTotal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div>
                <div className="preview-notes-section">
                  {state.additionalNotes ||
                    "Hakuna maelezo ya ziada yaliyowekwa."}
                </div>
                <div className="preview-brand-tag">
                  Taarifa zako hazihifadhiwi popote — zinabaki kwenye kifaa
                  chako pekee.
                  <br />
                  Imetengenezwa kwa Chapisho
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky action bar */}
      <div className="sticky-action-bar">
        <div className="sticky-buttons">
          <button className="btn btn-primary" onClick={handleDownload}>
            ⬇ Pakua PDF
          </button>
          <button className="btn btn-primary" onClick={handleWhatsApp}>
            📤 WhatsApp
          </button>
        </div>
        <div className="action-subtext">
          Tutapakua PDF kwanza, kisha kufungua WhatsApp — ambatanisha faili
          hilo kwenye ujumbe.
        </div>
      </div>
    </div>
  );
}
