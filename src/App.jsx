import React, { useState, useRef } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'https://cngserver.onrender.com/api';

const App = () => {
  const pdfRef = useRef(null);

  const initialCriteria = [
    "Access to the right person.",
    "Contactability (Ease to get hold of).",
    "Responsiveness to queries raised.",
    "Involvement and helpfulness of staff.",
    "Cooperation and technical support.",
    "Involvement as a strategic partner.",
    "Understanding of the needs of our organisation.",
    "Administrative systems regarding credits.",
    "Response to breakdowns.",
    "Value in services provided.",
    "Availability of stock.",
    "Accuracy of delivery.",
    "Delivery lead times (VGN).",
    "Technical information available re the most suitable service to use (VGN).",
    "Technical information available re how to use a product (NGV).",
    "Product specification available (NGV).",
    "Alignment to our business/situational needs.",
    "Anticipation of our future needs.",
    "Service provided by the sales team (VGN).",
    "Service provided by the technical team (NGV).",
    "Technical support.",
    "Clearly communicates how CNG will do business with us.",
    "Handling conflicts of interest.",
    "Attitude of credit control personnel.",
    "Problem solving attitude.",
    "Problem solving capability.",
    "Market leadership demonstrated – i.e., setting the pace.",
    "Innovation: Use of remote monitoring technology to assist service delivery.",
    "Being proactive.",
    "Reliability and dependability.",
    "Delivery on-time on major projects.",
    "Delivery on day-to-day issues.",
    "Honesty during negotiation.",
    "Frequency of visits to us.",
    "Communication relating to how the equipment operates.",
    "Services offered (VGN).",
    "Products offered (NGV).",
    "Ability to meet our sustainability goals.",
    "Pricing competitiveness.",
    "Pricing structure / Payment terms."
  ];

  const [activeSection, setActiveSection] = useState(1);

  const [criteriaRows, setCriteriaRows] = useState(
    initialCriteria.map((text, i) => ({
      id: i + 1,
      criterion: text,
      actual: '',
      expected: '',
      competitor: '',
      importance: ''
    }))
  );

  const [competitors, setCompetitors] = useState([
    { rank: 'CNG-', name: '' },
    { rank: '', name: '' },
    { rank: '', name: '' },
    { rank: '', name: '' },
    { rank: '', name: '' }
  ]);

  const [formData, setFormData] = useState({
    cngRanking: '',
    businessName: '',
    contactNumber: '',
    email: '',
    jobFunction: '',
    jobFunctionOther: '',
    relationship: '',
    relationshipOther: '',
    recommendScore: '',
    recommendReason: '',
    afterSalesImportance: '',
    strengths: [],
    strengthsOther: '',
    weaknesses: [],
    weaknessesOther: '',
    recommendations: [],
    recommendationsOther: '',
    safetyRecommendations: [],
    safetyRecommendationsOther: '',
    magazines: [],
    magazinesOther: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [trackingCode, setTrackingCode] = useState('');
  const [submitError, setSubmitError] = useState('');

  const handleCriteriaChange = (id, field, value) => {
    setCriteriaRows(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxGroup = (groupName, value) => {
    setFormData(prev => {
      const current = prev[groupName] || [];
      if (current.includes(value)) {
        return { ...prev, [groupName]: current.filter(v => v !== value) };
      } else {
        return { ...prev, [groupName]: [...current, value] };
      }
    });
  };

  const handleCompetitorChange = (index, field, value) => {
    setCompetitors(prev => prev.map((comp, i) => i === index ? { ...comp, [field]: value } : comp));
  };

  const handleSubmit = async () => {
    if (submitting || submitted) return;
    setSubmitting(true);
    setSubmitError('');

    try {
      const payload = {
        criteriaRows: criteriaRows.map(row => ({
          id: row.id,
          criterion: row.criterion,
          actual: row.actual,
          expected: row.expected,
          competitor: row.competitor,
          importance: row.importance
        })),
        competitors: competitors.map(comp => ({
          rank: comp.rank,
          name: comp.name
        })),
        formData: {
          cngRanking: formData.cngRanking,
          businessName: formData.businessName,
          contactNumber: formData.contactNumber,
          email: formData.email,
          jobFunction: formData.jobFunction,
          jobFunctionOther: formData.jobFunctionOther,
          relationship: formData.relationship,
          relationshipOther: formData.relationshipOther,
          recommendScore: formData.recommendScore,
          recommendReason: formData.recommendReason,
          afterSalesImportance: formData.afterSalesImportance,
          strengths: formData.strengths,
          strengthsOther: formData.strengthsOther,
          weaknesses: formData.weaknesses,
          weaknessesOther: formData.weaknessesOther,
          recommendations: formData.recommendations,
          recommendationsOther: formData.recommendationsOther,
          safetyRecommendations: formData.safetyRecommendations,
          safetyRecommendationsOther: formData.safetyRecommendationsOther,
          magazines: formData.magazines,
          magazinesOther: formData.magazinesOther
        }
      };

      const response = await axios.post(`${API_URL}/surveys`, payload, {
        validateStatus: (status) => status >= 200 && status < 300,
      });

      if (response.data?.success === true && response.data?.trackingCode) {
        setTrackingCode(response.data.trackingCode);
        if (response.data?.emailSent === false) {
          setSubmitError(response.data?.emailMessage || 'The survey was saved, but the email notification could not be delivered.');
        }
        setSubmitted(true);
      } else {
        throw new Error(response.data?.message || 'The server did not confirm that the email was sent.');
      }
    } catch (error) {
      console.error('Submission error:', error);
      if (error.response) {
        setSubmitError(error.response.data.message || 'Failed to submit survey. Please try again.');
      } else if (error.request) {
        setSubmitError('Unable to connect to the server. Please check your internet connection and try again.');
      } else {
        setSubmitError(error.message || 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const sections = [
    { id: 1, label: 'Matrix 1-15' },
    { id: 2, label: 'Matrix 16-30' },
    { id: 3, label: 'Matrix 31-40' },
    { id: 4, label: 'Competitive' },
    { id: 5, label: 'Questions' }
  ];

  const getSectionStatus = (sectionId) => {
    if (sectionId < activeSection) return 'completed';
    if (sectionId === activeSection) return 'active';
    return 'pending';
  };

  const renderRadioScale = (id, field, values) => (
    <div className="cng-radio-group">
      {values.map(v => (
        <label key={v} className={`cng-radio-label ${['L', 'M', 'H'].includes(String(v)) ? 'cng-importance-label' : ''}`}>
          <input
            type="radio"
            checked={criteriaRows.find(r => r.id === id)?.[field] === v}
            onChange={() => handleCriteriaChange(id, field, v)}
          />
          <span>{v}</span>
        </label>
      ))}
    </div>
  );

  const renderMatrixTable = (rows) => (
    <div style={{ overflowX: 'auto' }}>
      <table className="cng-comp-table">
        <thead>
          <tr>
            <th style={{ width: '30px' }}>#</th>
            <th style={{ textAlign: 'left' }}>EVALUATION CRITERIA</th>
            <th style={{ minWidth: '130px' }}>ACTUAL (CNG)</th>
            <th style={{ minWidth: '130px' }}>EXPECTED</th>
            <th style={{ minWidth: '130px' }}>BEST COMPETITOR</th>
            <th style={{ minWidth: '90px' }}>IMPORTANCE</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f8f9fa' }}>
              <td style={{ textAlign: 'center', fontWeight: 700, fontSize: '0.8rem', color: '#222', padding: '8px 4px' }}>{row.id}</td>
              <td style={{ textAlign: 'left', fontSize: '0.8rem', color: '#222', lineHeight: 1.3, padding: '8px 6px' }}>{row.criterion}</td>
              <td style={{ padding: '6px 4px' }}>{renderRadioScale(row.id, 'actual', [1, 2, 3, 4, 5])}</td>
              <td style={{ padding: '6px 4px' }}>{renderRadioScale(row.id, 'expected', [1, 2, 3, 4, 5])}</td>
              <td style={{ padding: '6px 4px' }}>{renderRadioScale(row.id, 'competitor', [1, 2, 3, 4, 5])}</td>
              <td style={{ padding: '6px 4px' }}>{renderRadioScale(row.id, 'importance', ['L', 'M', 'H'])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="cng-app">
      <div className="cng-container">
        {/* BRANDING HEADER */}
        <header className="cng-header">
          <div className="cng-logo-container">
            <img
              src="/logo.png"
              alt="CNG Holdings"
              className="cng-logo"
            />
            <div className="cng-company-name">CNG Holdings</div>
          </div>
          <div className="cng-divider" />
          <div className="cng-form-title">Customer Satisfaction Survey 2026</div>
        </header>

        <div className="cng-header-spacing" />

        {/* SUBMIT ERROR */}
        {submitError && (
          <div className="cng-submit-alert error">
            {submitError}
          </div>
        )}

        {/* SUCCESS MESSAGE */}
        {submitted && (
          <div className="cng-success-message">
            <h2>✓ Survey Submitted Successfully</h2>
            <p>Your tracking number is:</p>
            <div className="tracking-code">{trackingCode}</div>
            <p>Thank you for completing the survey.</p>
            <p style={{ fontSize: '0.85rem', color: '#888', marginTop: '12px' }}>
              Your responses have been securely submitted and the PDF email has been accepted by Gmail for delivery.
            </p>
          </div>
        )}

        {!submitted && (
          <>
            {/* PROGRESS BAR */}
            <div className="cng-progress-bar">
              <div className="cng-progress-steps">
                {sections.map((section, idx) => (
                  <div key={section.id} className="cng-progress-step">
                    {idx < sections.length - 1 && (
                      <div className={`cng-progress-connector ${getSectionStatus(section.id) === 'completed' ? 'completed' : getSectionStatus(section.id) === 'active' ? 'active' : ''}`} />
                    )}
                    <div className={`cng-progress-dot ${getSectionStatus(section.id)}`} />
                    <div className={`cng-progress-label ${getSectionStatus(section.id)}`}>
                      {section.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* INTRO */}
            <div className="cng-intro-box">
              <span className="cng-confidential-badge">Strictly Confidential</span>
              <p>
                This survey is to provide CNG Holdings (Pty) Ltd (CNG) with a picture of how it rates as an organisation. It has 4 sections and completion should take 20 minutes. Please be objective.
              </p>
              <p>
                Your responses will be anonymous and kept confidential by <strong>Rob Daniel Associates (Pty) Ltd</strong>, the consultancy conducting this survey. Consolidated survey results will enable CNG to identify what it does well and areas requiring improvement.
              </p>
              <p>
                Please complete the questionnaire by clicking on the buttons that reflect your responses, type comments where requested, and then click Submit Survey to automatically submit your responses. Should you have any queries, please contact Rob Daniel on <strong>082-444-5440</strong>
              </p>
            </div>

            {/* SECTION 1 - MATRIX 1-15 */}
            <div ref={pdfRef}>
              <div className="cng-card">
                <div className="cng-card-header">
                  <div className="cng-card-number">1</div>
                  <div>
                    <div className="cng-card-title">Section 1 of 4: Performance & Importance Matrix</div>
                    <div className="cng-card-subtitle">Items 1 - 15</div>
                  </div>
                </div>
                <div className="cng-info-row">
                  <div className="cng-section-subtitle">
                    Scale: 1 (Poor) - 2 (Below Average) - 3 (Average) - 4 (Above Average) - 5 (Excellent) | Importance: L (Low), M (Medium), H (High)
                  </div>
                </div>
                {renderMatrixTable(criteriaRows.slice(0, 15))}
              </div>

              {/* SECTION 1 - MATRIX 16-30 */}
              <div className="cng-card">
                <div className="cng-card-header">
                  <div className="cng-card-number">2</div>
                  <div>
                    <div className="cng-card-title">Section 1 of 4: Performance & Importance Matrix</div>
                    <div className="cng-card-subtitle">Items 16 - 30</div>
                  </div>
                </div>
                <div className="cng-info-row">
                  <div className="cng-section-subtitle">
                    Scale: 1 (Poor) - 2 (Below Average) - 3 (Average) - 4 (Above Average) - 5 (Excellent) | Importance: L (Low), M (Medium), H (High)
                  </div>
                </div>
                {renderMatrixTable(criteriaRows.slice(15, 30))}
              </div>

              {/* SECTION 1 - MATRIX 31-40 */}
              <div className="cng-card">
                <div className="cng-card-header">
                  <div className="cng-card-number">3</div>
                  <div>
                    <div className="cng-card-title">Section 1 of 4: Performance & Importance Matrix</div>
                    <div className="cng-card-subtitle">Items 31 - 40</div>
                  </div>
                </div>
                <div className="cng-info-row">
                  <div className="cng-section-subtitle">
                    Scale: 1 (Poor) - 2 (Below Average) - 3 (Average) - 4 (Above Average) - 5 (Excellent) | Importance: L (Low), M (Medium), H (High)
                  </div>
                </div>
                {renderMatrixTable(criteriaRows.slice(30, 40))}
              </div>

              {/* SECTION 2 - COMPETITIVE LANDSCAPE */}
              <div className="cng-card">
                <div className="cng-card-header">
                  <div className="cng-card-number" style={{ background: 'var(--cng-orange)' }}>4</div>
                  <div>
                    <div className="cng-card-title">Section 2 of 4: Competitive Landscape</div>
                    <div className="cng-card-subtitle">Rank CNG against alternative market competitors (Rank 1 = Highest Peer Performance)</div>
                  </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="cng-comp-table">
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', width: '280px' }}>COMPETITOR / PEER ORGANISATION NAME</th>
                        <th style={{ textAlign: 'left' }}>YOUR RANKING OF THIS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {competitors.map((comp, idx) => (
                        <tr key={idx}>
                          <td>
                            <input
                              type="text"
                              className="cng-input"
                              style={{ textAlign: 'center', fontWeight: 600 }}
                              placeholder=""
                              value={comp.rank}
                              onChange={(e) => handleCompetitorChange(idx, 'rank', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="cng-input"
                              placeholder="Enter competitor name"
                              value={comp.name}
                              onChange={(e) => handleCompetitorChange(idx, 'name', e.target.value)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION 3 - GENERAL QUESTIONS */}
              <div className="cng-card">
                <div className="cng-card-header">
                  <div className="cng-card-number" style={{ background: 'var(--cng-orange)' }}>5</div>
                  <div>
                    <div className="cng-card-title">Section 3 of 4: General Configuration Questions</div>
                  </div>
                </div>

                <div className="cng-field">
                  <label className="cng-label">1. Which Function best matches your job function?</label>
                  <div className="cng-checkbox-grid">
                    {['Owner/Director', 'General Management', 'Manufacturing/Operations', 'Technical', 'Quality', 'Purchasing/Procurement'].map(opt => (
                      <label key={opt} className="cng-checkbox-label">
                        <input type="radio" name="jobFunction" value={opt} checked={formData.jobFunction === opt} onChange={handleFormChange} />
                        {opt}
                      </label>
                    ))}
                  </div>
                  <input type="text" name="jobFunctionOther" className="cng-input" style={{ marginTop: '8px' }} placeholder="Other function (Specify)" value={formData.jobFunctionOther} onChange={handleFormChange} />
                </div>

                <div className="cng-field">
                  <label className="cng-label">2. Which descriptor best matches your current operating relationship with CNG?</label>
                  <div className="cng-checkbox-grid">
                    {['Strong business partner', 'Trusted technical adviser', 'Good supplier', 'Vendor/Supplier', "Don't know"].map(opt => (
                      <label key={opt} className="cng-checkbox-label">
                        <input type="radio" name="relationship" value={opt} checked={formData.relationship === opt} onChange={handleFormChange} />
                        {opt}
                      </label>
                    ))}
                  </div>
                  <input type="text" name="relationshipOther" className="cng-input" style={{ marginTop: '8px' }} placeholder="Other relationship terms" value={formData.relationshipOther} onChange={handleFormChange} />
                </div>

                <div className="cng-field">
                  <label className="cng-label">3. When taking deliveries from CNG, How important is after sales service?</label>
                  <div className="cng-checkbox-grid">
                    {['High Importance', 'Medium Importance', 'Low Importance'].map(opt => (
                      <label key={opt} className="cng-checkbox-label">
                        <input type="radio" name="afterSalesImportance" value={opt} checked={formData.afterSalesImportance === opt} onChange={handleFormChange} />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* SECTION 4 - STRATEGIC INSIGHTS */}
              <div className="cng-card">
                <div className="cng-card-header">
                  <div className="cng-card-number" style={{ background: 'var(--cng-orange)' }}>6</div>
                  <div>
                    <div className="cng-card-title">Section 4 of 4: Strategic Insights & Feedback</div>
                  </div>
                </div>

                <div className="cng-field">
                  <label className="cng-label">1. Select all matching descriptors representing organizational STRENGTHS of CNG:</label>
                  <div className="cng-checkbox-grid">
                    {['Reliable Supply and Service Delivery', 'Service Delivery', 'Strong Technical Support', 'Innovation', 'Environmental Benefits', 'Operational Benefits', 'Responsive and Professional Team', 'Valuable Business Partnership'].map(str => (
                      <label key={str} className="cng-checkbox-label">
                        <input type="checkbox" checked={formData.strengths.includes(str)} onChange={() => handleCheckboxGroup('strengths', str)} />
                        {str}
                      </label>
                    ))}
                  </div>
                  <input type="text" name="strengthsOther" className="cng-input" style={{ marginTop: '8px' }} placeholder="Specify other core strengths" value={formData.strengthsOther} onChange={handleFormChange} />
                </div>

                <div className="cng-field">
                  <label className="cng-label">2. Select identified weaknesses or improvement areas for CNG operations:</label>
                  <div className="cng-checkbox-grid">
                    {['Pricing Competitiveness', 'Pricing Flexibility', 'Maintenance Response Times', 'Communication', 'Proactive engagement', 'Operational Reliability', 'Supply Availability', 'Business Continuity'].map(wk => (
                      <label key={wk} className="cng-checkbox-label">
                        <input type="checkbox" checked={formData.weaknesses.includes(wk)} onChange={() => handleCheckboxGroup('weaknesses', wk)} />
                        {wk}
                      </label>
                    ))}
                  </div>
                  <input type="text" name="weaknessesOther" className="cng-input" style={{ marginTop: '8px' }} placeholder="Specify other core weaknesses" value={formData.weaknessesOther} onChange={handleFormChange} />
                </div>

                <div className="cng-field">
                  <label className="cng-label">3. What recommendations do you have for CNG to improve?</label>
                  <div className="cng-checkbox-grid">
                    {['Commercial Pricing Flexibility', 'Improved Communication and Transparency on gas developments', 'Operational Efficiency and Capacity Enhancements', 'Sustainability Initiatives', 'Market Expansion and Accessibility', 'Product Development Initiatives'].map(rec => (
                      <label key={rec} className="cng-checkbox-label">
                        <input type="checkbox" checked={formData.recommendations.includes(rec)} onChange={() => handleCheckboxGroup('recommendations', rec)} />
                        {rec}
                      </label>
                    ))}
                  </div>
                  <input type="text" name="recommendationsOther" className="cng-input" style={{ marginTop: '8px' }} placeholder="Other growth suggestions" value={formData.recommendationsOther} onChange={handleFormChange} />
                </div>

                <div className="cng-field">
                  <label className="cng-label">4. Choose anyone or more of the recommendations for improving the communication, training, or management of safety at your site?</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {['Refresher safety training for site personnel', 'More visible safety signage and operating instructions', 'Periodic toolbox talks or safety awareness sessions', 'Increased engagement with VGN technical personnel during safety site visits', 'No improvements required – current communication and safety management are satisfactory'].map(saf => (
                      <label key={saf} className="cng-checkbox-label">
                        <input type="checkbox" checked={formData.safetyRecommendations.includes(saf)} onChange={() => handleCheckboxGroup('safetyRecommendations', saf)} />
                        {saf}
                      </label>
                    ))}
                  </div>
                  <input type="text" name="safetyRecommendationsOther" className="cng-input" style={{ marginTop: '8px' }} placeholder="Other safety infrastructure observations" value={formData.safetyRecommendationsOther} onChange={handleFormChange} />
                </div>

                <div className="cng-field">
                  <label className="cng-label">5. Which of the following magazines do you read?</label>
                  <div className="cng-checkbox-grid">
                    {['Creamer Media Engineering News', 'Mining Weekly', 'Food Business Africa'].map(mag => (
                      <label key={mag} className="cng-checkbox-label">
                        <input type="checkbox" checked={formData.magazines.includes(mag)} onChange={() => handleCheckboxGroup('magazines', mag)} />
                        {mag}
                      </label>
                    ))}
                  </div>
                  <input type="text" name="magazinesOther" className="cng-input" style={{ marginTop: '8px' }} placeholder="Other professional publications read" value={formData.magazinesOther} onChange={handleFormChange} />
                </div>

                <div className="cng-field">
                  <label className="cng-label">6. Based on your experience with the installation and its safety management, how likely are you to recommend CNG as an energy solution to another business? (Scale 1=Not Likely - 10=Extremely Likely)</label>
                  <div className="cng-scale">
                    {[...Array(10).keys()].map(num => (
                      <label key={num + 1} className="cng-scale-item">
                        <input type="radio" name="recommendScore" value={num + 1} checked={formData.recommendScore === String(num + 1)} onChange={handleFormChange} />
                        <strong>{num + 1}</strong>
                      </label>
                    ))}
                  </div>
                  <input type="text" name="recommendReason" className="cng-input" style={{ marginTop: '8px' }} placeholder="Primary rationale for recommendation index score" value={formData.recommendReason} onChange={handleFormChange} />
                </div>
              </div>

              {/* CONTACT INFORMATION */}
              <div className="cng-card">
                <div className="cng-card-header">
                  <div className="cng-card-number" style={{ background: 'var(--cng-orange)' }}>7</div>
                  <div>
                    <div className="cng-card-title">Contact Information</div>
                    <div className="cng-card-subtitle">For Tracking Purposes Only</div>
                  </div>
                </div>
                <div className="cng-contact-box">
                  <div className="cng-contact-grid">
                    <div className="cng-field" style={{ marginBottom: 0 }}>
                      <label className="cng-label">Name / Company Name:</label>
                      <input type="text" name="businessName" className="cng-input" placeholder="Enter your name or company name" value={formData.businessName} onChange={handleFormChange} />
                    </div>
                    <div className="cng-field" style={{ marginBottom: 0 }}>
                      <label className="cng-label">Email Address:</label>
                      <input type="email" name="email" className="cng-input" placeholder="Enter your email address" value={formData.email} onChange={handleFormChange} />
                    </div>
                  </div>
                </div>
              </div>

              {/* THANK YOU */}
              <div className="cng-card">
                <div className="cng-thank-you">
                  <h2>Thank You for Your Insights</h2>
                  <p>Responses secured & protected with total data anonymity by Rob Daniel Associates</p>
                </div>
                <div className="cng-submit-note">
                  Survey Completed. Please click Submit Survey to automatically submit your responses.
                </div>
              </div>

              {/* SUBMIT BUTTON */}
              <div className="cng-action-bar" style={{ marginTop: '12px' }}>
                <button
                  className="cng-btn cng-btn-primary"
                  onClick={handleSubmit}
                  disabled={submitting || submitted}
                  style={{ padding: '16px 48px', fontSize: '1.1rem' }}
                >
                  {submitting ? (
                    <>
                      <span className="cng-spinner"></span>
                      Submitting Survey...
                    </>
                  ) : submitted ? (
                    '✓ Submitted'
                  ) : (
                    'Submit Survey'
                  )}
                </button>
              </div>
            </div>
          </>
        )}

        {/* FOOTER */}
        <footer className="cng-footer">
          <p>© CNG Holdings</p>
        </footer>
      </div>
    </div>
  );
};

export default App;