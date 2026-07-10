import React, { useState, useRef } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://cngserver-resend.up.railway.app/api';

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

  // Submission state
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

  const saveProgress = () => {
    localStorage.setItem('cng_survey_2026', JSON.stringify({ criteriaRows, competitors, formData }));
    alert('✓ Progress saved safely onto your browser storage.');
  };

  const loadProgress = () => {
    const saved = localStorage.getItem('cng_survey_2026');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.criteriaRows) setCriteriaRows(parsed.criteriaRows);
      if (parsed.competitors) setCompetitors(parsed.competitors);
      if (parsed.formData) setFormData(parsed.formData);
      alert('✓ Progress loaded successfully.');
    } else {
      alert('No saved progress found.');
    }
  };

  /**
   * Submit survey to backend automatically.
   * Backend will:
   * 1. Generate unique tracking code
   * 2. Generate PDF
   * 3. Save to MongoDB
   * 4. Email the PDF
   */
  const handleSubmit = async () => {
    // Prevent double submission
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

  return (
    <div className="survey-app" style={{ background: '#f4f5f7', padding: '24px 0', fontFamily: 'sans-serif' }}>
      <style>{`
        .survey-container { width: 840px; margin: 0 auto; background: white; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
        .survey-header { background: #b30015; padding: 20px; color: white; border-bottom: 4px solid #111; }
        .pdf-page-block { min-height: 1120px; box-sizing: border-box; padding: 20px 18px; border-bottom: 1px dashed #ccc; position: relative; page-break-inside: avoid; page-break-after: always; }
        .section-title { font-size: 13px; font-weight: bold; color: #111; margin-bottom: 8px; background: #f8f9fa; padding: 6px; border-left: 4px solid #b30015; text-transform: uppercase; letter-spacing: 0.5px; }
        .survey-table { width: 100%; border-collapse: collapse; font-size: 10px; table-layout: fixed; }
        .survey-table th { background: #111; color: white; padding: 6px 2px; font-weight: 600; text-align: center; font-size: 9px; }
        .survey-table td { padding: 4px 2px; border-bottom: 1px solid #eee; text-align: center; vertical-align: middle; }
        .criterion-text { text-align: left !important; font-weight: 500; color: #222; font-size: 10px; line-height: 1.3; white-space: normal; word-wrap: break-word; padding-right: 4px !important; }
        .radio-cell-group { display: flex; gap: 1px; justify-content: center; align-items: center; }
        .radio-lbl { display: flex; align-items: center; gap: 1px; cursor: pointer; font-size: 9px; color: #333; margin: 0; padding: 1px; }
        .radio-lbl input { margin: 0 1px 0 0; transform: scale(0.85); }
        .action-bar { display: flex; gap: 12px; margin-bottom: 20px; justify-content: flex-end; width: 840px; margin: 0 auto 20px auto; }
        .btn { padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; border: none; font-size: 13px; transition: opacity 0.2s; }
        .btn:hover { opacity: 0.9; }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-primary { background: #b30015; color: white; }
        .btn-secondary { background: #6c757d; color: white; }
        .form-group { margin-bottom: 10px; }
        .form-label { display: block; font-weight: 600; font-size: 11px; margin-bottom: 5px; color: #111; line-height: 1.3; }
        .options-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
        .option-check-label { display: flex; align-items: center; gap: 4px; font-size: 10px; cursor: pointer; padding: 4px; background: #f9f9f9; border-radius: 3px; border: 1px solid #f0f0f0; }
        .text-input-field { width: 100%; padding: 5px; border: 1px solid #ccc; border-radius: 3px; box-sizing: border-box; font-size: 11px; background: #fff; vertical-align: top; }
        .scale-flex { display: flex; justify-content: space-between; background: #f8f9fa; padding: 6px; border-radius: 3px; border: 1px solid #eee; }
        .scale-item { display: flex; flex-direction: column; align-items: center; gap: 1px; font-size: 9px; cursor: pointer; }
        .confidential-badge { background: #fff3cd; color: #856404; padding: 5px 10px; border-radius: 4px; font-size: 10px; font-weight: bold; border: 1px solid #ffeeba; display: inline-block; }
        .intro-p-text { font-size: 11px; line-height: 1.4; color: #222; margin: 0 0 6px 0; text-align: justify; }
        .spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-radius: 50%; border-top-color: #fff; animation: spin 0.6s linear infinite; margin-right: 8px; vertical-align: middle; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .success-message { text-align: center; padding: 40px 20px; background: #f0fff4; border: 2px solid #28a745; border-radius: 8px; margin: 20px 0; }
        .success-message h2 { color: #28a745; margin: 0 0 10px 0; font-size: 22px; }
        .success-message .tracking-code { font-size: 28px; font-weight: bold; color: #b30015; margin: 15px 0; letter-spacing: 2px; }
        .success-message p { color: #555; font-size: 14px; margin: 5px 0; }
        .error-message { text-align: center; padding: 20px; background: #fff5f5; border: 1px solid #f56565; border-radius: 8px; margin: 20px 0; color: #c53030; }
      `}</style>

      {submitError && (
        <div className="error-message" style={{ width: '840px', margin: '0 auto 20px auto' }}>
          {submitError}
        </div>
      )}

      {submitted && (
        <div className="success-message" style={{ width: '840px', margin: '0 auto 20px auto' }}>
          <h2>✓ Survey Submitted Successfully</h2>
          <p>Your tracking number is:</p>
          <div className="tracking-code">{trackingCode}</div>
          <p>Thank you for completing the survey.</p>
          <p style={{ fontSize: '12px', color: '#888', marginTop: '15px' }}>
            Your responses have been securely submitted and the PDF email has been accepted by Gmail for delivery.
          </p>
        </div>
      )}

      <div ref={pdfRef} className="survey-container">
        
        {/* PAGE 1: Header + Intro + Matrix Items 1-15 */}
        <div className="pdf-page-block">
          <div className="survey-header" style={{ marginBottom: '12px', padding: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: '0 0 3px 0', fontSize: '10px', letterSpacing: '1.5px', opacity: 0.9, fontWeight: 'bold' }}>CUSTOMER SATISFACTION INDEX SURVEY 2026</p>
                <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', letterSpacing: '-0.5px' }}>CNG HOLDINGS</h1>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="confidential-badge" style={{ marginBottom: '4px' }}>Strictly Confidential</div>
                
              </div>
            </div>
          </div>

          <div style={{ background: '#fdf3f4', borderLeft: '4px solid #b30015', padding: '10px 14px', borderRadius: '3px', marginBottom: '15px' }}>
            <p className="intro-p-text">This survey is to provide CNG Holdings (Pty) Ltd (CNG) with a picture of how it rates as an organisation. It has 4 sections and completion should take 20 minutes. Please be objective.</p>
            <p className="intro-p-text">Your responses will be anonymous and kept confidential by <strong>Rob Daniel Associates (Pty) Ltd</strong>, the consultancy conducting this survey. Consolidated survey results will enable CNG to identify what it does well and areas requiring improvement.</p>
                <p className="intro-p-text">Please complete the questionnaire by clicking on the buttons that reflect your responses, type comments where requested, and then click Submit Survey to automatically submit your responses. Should you have any queries, please contact Rob Daniel on <strong>082-444-5440</strong></p>
          </div>

          <div className="section-title">SECTION 1 OF 4: THE PERFORMANCE & IMPORTANCE MATRIX (Items 1 - 15)</div>
          <p style={{ fontSize: '9px', color: '#666', margin: '0 0 8px 0' }}>Scale: 1 (Poor) 2 (Below Average) 3 (Average) 4 (Above Average) 5 (Excellent) | Importance: L (Low), M (Medium), H (High)</p>
          
          <table className="survey-table">
            <thead>
              <tr>
                <th style={{ width: '25px' }}>#</th>
                <th style={{ width: '260px', textAlign: 'left' }}>EVALUATION CRITERIA</th>
                <th style={{ width: '125px' }}>ACTUAL (CNG)</th>
                <th style={{ width: '125px' }}>EXPECTED</th>
                <th style={{ width: '125px' }}>BEST COMPETITOR</th>
                <th style={{ width: '85px' }}>IMPORTANCE</th>
              </tr>
            </thead>
            <tbody>
              {criteriaRows.slice(0, 15).map((row, idx) => (
                <tr key={row.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                  <td>{row.id}</td>
                  <td className="criterion-text">{row.criterion}</td>
                  <td><div className="radio-cell-group">{[1,2,3,4,5].map(v => (<label key={v} className="radio-lbl"><input type="radio" checked={row.actual === v} onChange={() => handleCriteriaChange(row.id, 'actual', v)} />{v}</label>))}</div></td>
                  <td><div className="radio-cell-group">{[1,2,3,4,5].map(v => (<label key={v} className="radio-lbl"><input type="radio" checked={row.expected === v} onChange={() => handleCriteriaChange(row.id, 'expected', v)} />{v}</label>))}</div></td>
                  <td><div className="radio-cell-group">{[1,2,3,4,5].map(v => (<label key={v} className="radio-lbl"><input type="radio" checked={row.competitor === v} onChange={() => handleCriteriaChange(row.id, 'competitor', v)} />{v}</label>))}</div></td>
                  <td><div className="radio-cell-group">{['L','M','H'].map(v => (<label key={v} className="radio-lbl" style={{ fontWeight: 'bold' }}><input type="radio" checked={row.importance === v} onChange={() => handleCriteriaChange(row.id, 'importance', v)} />{v}</label>))}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ textAlign: 'right', fontSize: '9px', color: '#999', marginTop: '10px' }}>Page 1 of 5</div>
          <div style={{ textAlign: 'center', fontSize: '10px', color: '#999', fontStyle: 'italic', marginTop: '4px', fontWeight: '500' }}>↓ Scroll down to complete ↓</div>
        </div>

        {/* PAGE 2: Matrix Items 16-30 */}
        <div className="pdf-page-block">
          <div className="section-title" style={{ marginTop: '8px' }}>SECTION 1 OF 4: THE PERFORMANCE & IMPORTANCE MATRIX (Items 16 - 30)</div>
          <table className="survey-table">
            <thead>
              <tr>
                <th style={{ width: '25px' }}>#</th>
                <th style={{ width: '260px', textAlign: 'left' }}>EVALUATION CRITERIA</th>
                <th style={{ width: '125px' }}>ACTUAL (CNG)</th>
                <th style={{ width: '125px' }}>EXPECTED</th>
                <th style={{ width: '125px' }}>BEST COMPETITOR</th>
                <th style={{ width: '85px' }}>IMPORTANCE</th>
              </tr>
            </thead>
            <tbody>
              {criteriaRows.slice(15, 30).map((row, idx) => (
                <tr key={row.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                  <td>{row.id}</td>
                  <td className="criterion-text">{row.criterion}</td>
                  <td><div className="radio-cell-group">{[1,2,3,4,5].map(v => (<label key={v} className="radio-lbl"><input type="radio" checked={row.actual === v} onChange={() => handleCriteriaChange(row.id, 'actual', v)} />{v}</label>))}</div></td>
                  <td><div className="radio-cell-group">{[1,2,3,4,5].map(v => (<label key={v} className="radio-lbl"><input type="radio" checked={row.expected === v} onChange={() => handleCriteriaChange(row.id, 'expected', v)} />{v}</label>))}</div></td>
                  <td><div className="radio-cell-group">{[1,2,3,4,5].map(v => (<label key={v} className="radio-lbl"><input type="radio" checked={row.competitor === v} onChange={() => handleCriteriaChange(row.id, 'competitor', v)} />{v}</label>))}</div></td>
                  <td><div className="radio-cell-group">{['L','M','H'].map(v => (<label key={v} className="radio-lbl" style={{ fontWeight: 'bold' }}><input type="radio" checked={row.importance === v} onChange={() => handleCriteriaChange(row.id, 'importance', v)} />{v}</label>))}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ textAlign: 'right', fontSize: '9px', color: '#999', marginTop: '10px' }}>Page 2 of 5</div>
          <div style={{ textAlign: 'center', fontSize: '10px', color: '#999', fontStyle: 'italic', marginTop: '4px', fontWeight: '500' }}>↓ Scroll down to complete ↓</div>
        </div>

        {/* PAGE 3: Matrix Items 31-40 + Section 2 Competitive Landscape */}
        <div className="pdf-page-block">
          <div className="section-title" style={{ marginTop: '8px' }}>SECTION 1 OF 4: THE PERFORMANCE & IMPORTANCE MATRIX (Items 31 - 40)</div>
          <table className="survey-table" style={{ marginBottom: '12px' }}>
            <thead>
              <tr>
                <th style={{ width: '25px' }}>#</th>
                <th style={{ width: '260px', textAlign: 'left' }}>EVALUATION CRITERIA</th>
                <th style={{ width: '125px' }}>ACTUAL (CNG)</th>
                <th style={{ width: '125px' }}>EXPECTED</th>
                <th style={{ width: '125px' }}>BEST COMPETITOR</th>
                <th style={{ width: '85px' }}>IMPORTANCE</th>
              </tr>
            </thead>
            <tbody>
              {criteriaRows.slice(30, 40).map((row, idx) => (
                <tr key={row.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                  <td>{row.id}</td>
                  <td className="criterion-text">{row.criterion}</td>
                  <td><div className="radio-cell-group">{[1,2,3,4,5].map(v => (<label key={v} className="radio-lbl"><input type="radio" checked={row.actual === v} onChange={() => handleCriteriaChange(row.id, 'actual', v)} />{v}</label>))}</div></td>
                  <td><div className="radio-cell-group">{[1,2,3,4,5].map(v => (<label key={v} className="radio-lbl"><input type="radio" checked={row.expected === v} onChange={() => handleCriteriaChange(row.id, 'expected', v)} />{v}</label>))}</div></td>
                  <td><div className="radio-cell-group">{[1,2,3,4,5].map(v => (<label key={v} className="radio-lbl"><input type="radio" checked={row.competitor === v} onChange={() => handleCriteriaChange(row.id, 'competitor', v)} />{v}</label>))}</div></td>
                  <td><div className="radio-cell-group">{['L','M','H'].map(v => (<label key={v} className="radio-lbl" style={{ fontWeight: 'bold' }}><input type="radio" checked={row.importance === v} onChange={() => handleCriteriaChange(row.id, 'importance', v)} />{v}</label>))}</div></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="section-title" style={{ marginTop: '8px' }}>SECTION 2 OF 4: COMPETITIVE LANDSCAPE</div>
          <p style={{ fontSize: '10px', color: '#444', marginBottom: '8px' }}>Rank CNG against alternative market competitors (Rank 1 = Highest Peer Performance).</p>
          <table className="survey-table">
            <thead>
              <tr>
                <th style={{ width: '300px' }}>COMPETITOR / PEER ORGANISATION NAME</th>
                <th style={{ textAlign: 'left', paddingLeft: '8px' }}>YOUR RANKING OF THIS</th>
              </tr>
            </thead>
            <tbody>
              {competitors.map((comp, idx) => (
                <tr key={idx}>
                  <td><input type="text" className="text-input-field" style={{ padding: '8px', textAlign: 'center', fontSize: '13px' }} placeholder="" value={comp.rank} onChange={(e) => handleCompetitorChange(idx, 'rank', e.target.value)} /></td>
                  <td><input type="text" className="text-input-field" style={{ padding: '8px', fontSize: '13px' }} placeholder="" value={comp.name} onChange={(e) => handleCompetitorChange(idx, 'name', e.target.value)} /></td>
                </tr>
              ))}
              
            </tbody>
          </table>
          <div style={{ textAlign: 'right', fontSize: '9px', color: '#999', marginTop: '10px' }}>Page 3 of 5</div>
          <div style={{ textAlign: 'center', fontSize: '10px', color: '#999', fontStyle: 'italic', marginTop: '4px', fontWeight: '500' }}>↓ Scroll down to complete ↓</div>
        </div>

        {/* PAGE 4: Section 3 General Questions */}
        <div className="pdf-page-block">
          <div className="section-title" style={{ marginTop: '8px' }}>SECTION 3 OF 4: GENERAL CONFIGURATION QUESTIONS</div>
          
          <div className="form-group">
            <label className="form-label">1. Which Function best matches your job function?</label>
            <div className="options-grid">
              {['Owner/Director', 'General Management', 'Manufacturing/Operations', 'Technical', 'Quality', 'Purchasing/Procurement'].map(opt => (
                <label key={opt} className="option-check-label">
                  <input type="radio" name="jobFunction" value={opt} checked={formData.jobFunction === opt} onChange={handleFormChange} /> {opt}
                </label>
              ))}
            </div>
            <input type="text" name="jobFunctionOther" className="text-input-field" style={{ marginTop: '4px', padding: '8px', fontSize: '13px' }} placeholder="Other function (Specify)" value={formData.jobFunctionOther} onChange={handleFormChange} />
          </div>

          <div className="form-group" style={{ marginTop: '8px' }}>
            <label className="form-label">2. Which descriptor best matches your current operating relationshionship with CNG?</label>
            <div className="options-grid">
              {['Strong business partner', 'Trusted technical adviser', 'Good supplier', 'Vendor/Supplier', "Don't know"].map(opt => (
                <label key={opt} className="option-check-label">
                  <input type="radio" name="relationship" value={opt} checked={formData.relationship === opt} onChange={handleFormChange} /> {opt}
                </label>
              ))}
            </div>
            <input type="text" name="relationshipOther" className="text-input-field" style={{ marginTop: '4px', padding: '8px', fontSize: '13px' }} placeholder="Other relationship terms" value={formData.relationshipOther} onChange={handleFormChange} />
          </div>

          <div className="form-group" style={{ marginTop: '8px' }}>
            <label className="form-label">3. When taking deliveries from CNG, How important is after sales service? </label>
            <div className="options-grid">
              {['High Importance', 'Medium Importance', 'Low Importance'].map(opt => (
                <label key={opt} className="option-check-label">
                  <input type="radio" name="afterSalesImportance" value={opt} checked={formData.afterSalesImportance === opt} onChange={handleFormChange} /> {opt}
                </label>
              ))}
            </div>
          </div>

          
          <div style={{ textAlign: 'right', fontSize: '9px', color: '#999', marginTop: '10px' }}>Page 4 of 5</div>
          <div style={{ textAlign: 'center', fontSize: '10px', color: '#999', fontStyle: 'italic', marginTop: '4px', fontWeight: '500' }}>↓ Scroll down to complete ↓</div>
        </div>

        {/* PAGE 5: Section 4 Strategic Insights + Sign-off */}
        <div className="pdf-page-block">
          <div className="section-title" style={{ marginTop: '8px' }}>SECTION 4 OF 4: STRATEGIC INSIGHTS & FEEDBACK</div>

          <div className="form-group" style={{ marginTop: '6px' }}>
            <label className="form-label">1. Select all matching descriptors representing organizational STRENGTHS of CNG:</label>
            <div className="options-grid">
              {['Reliable Supply and Service Delivery', 'Service Delivery', 'Strong Technical Support', 'Innovation', 'Environmental Benefits', 'Operational Benefits', 'Responsive and Professional Team', 'Valuable Business Partnership'].map(str => (
                <label key={str} className="option-check-label">
                  <input type="checkbox" checked={formData.strengths.includes(str)} onChange={() => handleCheckboxGroup('strengths', str)} /> {str}
                </label>
              ))}
            </div>
            <input type="text" name="strengthsOther" className="text-input-field" style={{ marginTop: '3px', padding: '8px', fontSize: '13px' }} placeholder="Specify other core strengths" value={formData.strengthsOther} onChange={handleFormChange} />
          </div>

          <div className="form-group" style={{ marginTop: '6px' }}>
            <label className="form-label">2. Select identified weaknesses or improvement areas for CNG operations:</label>
            <div className="options-grid">
              {['Pricing Competitiveness', 'Pricing Flexibility', 'Maintenance Response Times', 'Communication', 'Proactive engagement', 'Operational Reliability', 'Supply Availability', 'Business Continuity'].map(wk => (
                <label key={wk} className="option-check-label">
                  <input type="checkbox" checked={formData.weaknesses.includes(wk)} onChange={() => handleCheckboxGroup('weaknesses', wk)} /> {wk}
                </label>
              ))}
            </div>
            <input type="text" name="weaknessesOther" className="text-input-field" style={{ marginTop: '3px', padding: '8px', fontSize: '13px' }} placeholder="Specify other core weaknesses" value={formData.weaknessesOther} onChange={handleFormChange} />
          </div>

          <div className="form-group" style={{ marginTop: '6px' }}>
            <label className="form-label">3. What recommendations do you have for CNG to improve?</label>
            <div className="options-grid">
              {['Commercial Pricing Flexibility', 'Improved Communication and Transparency on gas developments', 'Operational Efficiency and Capacity Enhancements', 'Sustainability Initiatives', 'Market Expansion and Accessibility', 'Product Development Initiatives'].map(rec => (
                <label key={rec} className="option-check-label">
                  <input type="checkbox" checked={formData.recommendations.includes(rec)} onChange={() => handleCheckboxGroup('recommendations', rec)} /> {rec}
                </label>
              ))}
            </div>
            <input type="text" name="recommendationsOther" className="text-input-field" style={{ marginTop: '3px', padding: '8px', fontSize: '13px' }} placeholder="Other growth suggestions" value={formData.recommendationsOther} onChange={handleFormChange} />
          </div>

          <div className="form-group" style={{ marginTop: '6px' }}>
            <label className="form-label">4. Choose anyone or more of the recommendations for improving the communication,training, or management of safety at your site?:</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '3px' }}>
              {['Refresher safety training for site personnel', 'More visible safety signage and operating instructions', 'Periodic toolbox talks or safety awareness sessions', 'Increased engagement with VGN technical personnel during safety site visits', 'No improvements required – current communication and safety management are satisfactory'].map(saf => (
                <label key={saf} className="option-check-label" style={{ fontSize: '9px', padding: '3px' }}>
                  <input type="checkbox" checked={formData.safetyRecommendations.includes(saf)} onChange={() => handleCheckboxGroup('safetyRecommendations', saf)} /> {saf}
                </label>
              ))}
            </div>
            <input type="text" name="safetyRecommendationsOther" className="text-input-field" style={{ marginTop: '3px', padding: '8px', fontSize: '13px' }} placeholder="Other safety infrastructure observations" value={formData.safetyRecommendationsOther} onChange={handleFormChange} />
          </div>

          <div className="form-group" style={{ marginTop: '6px' }}>
            <label className="form-label">5. Which of the fllowing magazines do you read? :</label>
            <div className="options-grid">
              {['Creamer Media Engineering News', 'Mining Weekly', 'Food Business Africa'].map(mag => (
                <label key={mag} className="option-check-label">
                  <input type="checkbox" checked={formData.magazines.includes(mag)} onChange={() => handleCheckboxGroup('magazines', mag)} /> {mag}
                </label>
              ))}
            </div>
            <input type="text" name="magazinesOther" className="text-input-field" style={{ marginTop: '3px', padding: '8px', fontSize: '13px' }} placeholder="Other professional publications read" value={formData.magazinesOther} onChange={handleFormChange} />
          </div>

          <div className="form-group" style={{ marginTop: '15px' }}>
            <label className="form-label">6. Based on your experience with the installation and its safety management ,how likely are you to recommend CNG as an energy solution to another business? (Scale 1=Not Likely - 10=Extremely Likely)</label>
            <div className="scale-flex">
              {[...Array(10).keys()].map(num => (
                <label key={num + 1} className="scale-item">
                  <input type="radio" name="recommendScore" value={num + 1} checked={formData.recommendScore === String(num + 1)} onChange={handleFormChange} />
                  <strong>{num + 1}</strong>
                </label>
              ))}
            </div>
            <input type="text" name="recommendReason" className="text-input-field" style={{ marginTop: '5px', padding: '8px', fontSize: '13px' }} placeholder="Primary rationale for recommendation index score" value={formData.recommendReason} onChange={handleFormChange} />
          </div>

          <div style={{ textAlign: 'center', padding: '12px 0 4px 0', borderTop: '2px solid #111', color: '#b30015', marginTop: '12px' }}>
            <h2 style={{ letterSpacing: '2px', margin: 0, fontSize: '16px', fontWeight: '800' }}>THANK YOU FOR YOUR INSIGHTS</h2>
            <p style={{ color: '#666', fontSize: '9px', marginTop: '2px', textTransform: 'uppercase' }}>RESPONSES SECURED & PROTECTED WITH TOTAL DATA ANONYMITY BY ROB DANIEL ASSOCIATES</p>
          </div>
          <div style={{ textAlign: 'right', fontSize: '9px', color: '#999', marginTop: '10px' }}>Page 5 of 5</div>

          <div id="pdf-submit-message" style={{ textAlign: 'center', fontSize: '15px', color: '#0f0101', fontStyle: 'italic', marginTop: '4px', fontWeight: '500' }}>Survey Completed, Please click Submit Survey to automatically submit your responses.</div>
        </div>

        <div style={{ textAlign: 'center', padding: '12px 0', borderTop: '2px solid #111', marginTop: '15px', background: '#f8f9fa' }}>
          <p style={{ margin: 0, fontSize: '9px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Digital Form Designed by Smartmat Technologies Pty/Ltd | 067 551 6320
          </p>
        </div>

      </div>

      {/* Name/Business name, Contact number, and Email fields before submit */}
      <div style={{ width: '840px', margin: '0 auto 20px auto', padding: '16px', background: '#f0f0f0', borderRadius: '4px', border: '1px solid #ddd', boxSizing: 'border-box' }}>
        <div className="form-group" style={{ marginBottom: '12px' }}>
          <label className="form-label" style={{ fontSize: '13px' }}>Enter your e-mail address and your Business name separate by ; </label>
          <input type="text" name="businessName" className="text-input-field" style={{ padding: '10px', fontSize: '14px' }} placeholder="Enter your e-mail address and business name separated by ;" value={formData.businessName} onChange={handleFormChange} />
        </div>
        
      </div>

      <div className="action-bar" style={{ justifyContent: 'center', marginTop: '20px' }}>
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={submitting || submitted}
          style={{ padding: '14px 40px', fontSize: '16px' }}
        >
          {submitting ? (
            <>
              <span className="spinner"></span>
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
  );
};

export default App;

