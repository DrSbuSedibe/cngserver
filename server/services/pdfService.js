const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generate a professional PDF for the survey submission using PDFKit.
 * 
 * @param {Object} surveyData - The complete survey data
 * @param {string} trackingCode - The unique tracking code
 * @returns {string} - The file path of the generated PDF
 */
const generatePDF = async (surveyData, trackingCode) => {
  const { criteriaRows, competitors, formData } = surveyData;
  const submittedDate = new Date().toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Ensure uploads/pdfs directory exists
  const pdfDir = path.join(__dirname, '..', 'uploads', 'pdfs');
  if (!fs.existsSync(pdfDir)) {
    fs.mkdirSync(pdfDir, { recursive: true });
  }

  const filename = `${trackingCode}.pdf`;
  const filePath = path.join(pdfDir, filename);

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 25, bottom: 25, left: 30, right: 30 },
        info: {
          Title: `Customer Satisfaction Survey - ${trackingCode}`,
          Author: 'CNG Holdings',
          Subject: 'Customer Satisfaction Index Survey 2026',
        },
      });

      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      // Colors
      const RED = '#b30015';
      const DARK = '#111111';
      const GRAY = '#666666';

      // ===== HEADER HELPERS =====
      
      // Full header for page 1 only
      const addFullHeader = () => {
        doc.save();
        doc.rect(30, 12, doc.page.width - 60, 30).fill(RED);
        doc.fillColor('#ffffff')
          .fontSize(7)
          .font('Helvetica-Bold')
          .text('CUSTOMER SATISFACTION INDEX SURVEY 2026', 40, 18, { width: 300 });
        doc.fontSize(12)
          .text('CNG HOLDINGS', 40, 27, { width: 300 });
        
        doc.fontSize(6)
          .font('Helvetica')
          .text(`Tracking: ${trackingCode}`, doc.page.width - 170, 18, { width: 130, align: 'right' });
        doc.text(`Date: ${submittedDate}`, doc.page.width - 170, 25, { width: 130, align: 'right' });

        doc.fillColor('#856404');
        doc.fontSize(6)
          .font('Helvetica-Bold')
          .text('Strictly Confidential', doc.page.width - 170, 32, { width: 130, align: 'right' });
        
        doc.restore();
      };

      // Minimal header for pages 2+
      const addMinimalHeader = () => {
        doc.save();
        doc.rect(30, 12, doc.page.width - 60, 18).fill(RED);
        doc.fillColor('#ffffff')
          .fontSize(6)
          .font('Helvetica-Bold')
          .text('CUSTOMER SATISFACTION INDEX SURVEY 2026', 40, 16, { width: 300 });
        doc.fontSize(6)
          .font('Helvetica')
          .text(`Tracking: ${trackingCode}`, doc.page.width - 170, 16, { width: 130, align: 'right' });
        doc.restore();
      };

      // ===== FOOTER HELPER =====
      const addFooter = (pageNum, totalPages, isLastPage) => {
        // Footer is intentionally empty - no page numbers or branding
      };

      // ===== PAGE BREAK HELPER =====
      // Adds a new page only if we're past the top area (has actual content)
      const addPageIfNeeded = () => {
        if (yPos > 100) {
          addFooter(pageNum, 5, false);
          doc.addPage();
          pageNum++;
          addMinimalHeader();
          yPos = 40;
          return true;
        }
        return false;
      };

      // Track pages
      let pageNum = 1;

      // ===== PAGE 1: HEADER + INTRO + SECTION 1 (Items 1-15) =====
      addFullHeader();

      // Intro box
      doc.rect(30, 48, doc.page.width - 60, 35).fill('#fdf3f4');
      doc.fillColor(DARK)
        .fontSize(6.5)
        .font('Helvetica')
        .text('This survey is to provide CNG Holdings (Pty) Ltd (CNG) with a picture of how it rates as an organisation. It has 4 sections and completion should take 20 minutes. Please be objective.', 40, 51, { width: doc.page.width - 80 });
      doc.text('Your responses will be anonymous and kept confidential by Rob Daniel Associates (Pty) Ltd, the consultancy conducting this survey.', 40, 62, { width: doc.page.width - 80 });
      doc.text('Consolidated survey results will enable CNG to identify what it does well and areas requiring improvement.', 40, 72, { width: doc.page.width - 80 });

      // Section 1 title
      let yPos = 92;
      doc.fillColor(RED)
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('SECTION 1 OF 4: THE PERFORMANCE & IMPORTANCE MATRIX (Items 1 - 15)', 30, yPos);
      
      yPos += 10;
      doc.fillColor(GRAY)
        .fontSize(6)
        .font('Helvetica')
        .text('Scale: 1 (Poor) 2 (Below Average) 3 (Average) 4 (Above Average) 5 (Excellent) | Importance: L (Low), M (Medium), H (High)', 30, yPos);

      // Table setup
      yPos += 9;
      const colWidths = [16, 175, 52, 52, 52, 43];
      const colHeaders = ['#', 'EVALUATION CRITERIA', 'ACTUAL (CNG)', 'EXPECTED', 'BEST COMPETITOR', 'IMPORTANCE'];
      const rowHeight = 13;

      // Draw table header
      doc.rect(30, yPos, doc.page.width - 60, 13).fill(DARK);
      doc.fillColor('#ffffff')
        .fontSize(6)
        .font('Helvetica-Bold');
      
      let xPos = 32;
      colHeaders.forEach((header, idx) => {
        doc.text(header, xPos, yPos + 3, { width: colWidths[idx], align: idx === 0 ? 'center' : idx === 1 ? 'left' : 'center' });
        xPos += colWidths[idx];
      });

      yPos += 13;

      // Draw criteria rows (1-15)
      criteriaRows.slice(0, 15).forEach((row, idx) => {
        if (yPos + rowHeight + 3 > doc.page.height - 25) {
          addFooter(pageNum, 5, false);
          doc.addPage();
          pageNum++;
          addMinimalHeader();
          yPos = 40;

          // Redraw header row
          doc.rect(30, yPos, doc.page.width - 60, 12).fill(DARK);
          doc.fillColor('#ffffff').fontSize(6).font('Helvetica-Bold');
          let hx = 32;
          colHeaders.forEach((header, hidx) => {
            doc.text(header, hx, yPos + 3, { width: colWidths[hidx], align: hidx === 0 ? 'center' : hidx === 1 ? 'left' : 'center' });
            hx += colWidths[hidx];
          });
          yPos += 12;
        }

        if (idx % 2 === 0) {
          doc.rect(30, yPos, doc.page.width - 60, rowHeight).fill('#f9f9f9');
        }

        doc.fillColor(DARK)
          .fontSize(6)
          .font('Helvetica');
        
        let rx = 32;
        doc.text(String(row.id), rx, yPos + 2, { width: colWidths[0], align: 'center' });
        rx += colWidths[0];
        doc.font('Helvetica-Bold').text(row.criterion, rx, yPos + 2, { width: colWidths[1] });
        rx += colWidths[1];
        doc.font('Helvetica').text(row.actual || '-', rx, yPos + 2, { width: colWidths[2], align: 'center' });
        rx += colWidths[2];
        doc.text(row.expected || '-', rx, yPos + 2, { width: colWidths[3], align: 'center' });
        rx += colWidths[3];
        doc.text(row.competitor || '-', rx, yPos + 2, { width: colWidths[4], align: 'center' });
        rx += colWidths[4];
        doc.text(row.importance || '-', rx, yPos + 2, { width: colWidths[5], align: 'center' });

        yPos += rowHeight;
      });

      // ===== SECTION 1 (Items 16-30) - continues on same or new page =====
      addPageIfNeeded();

      doc.fillColor(RED)
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('SECTION 1 OF 4: THE PERFORMANCE & IMPORTANCE MATRIX (Items 16 - 30)', 30, yPos);

      yPos += 10;

      // Redraw table header
      doc.rect(30, yPos, doc.page.width - 60, 12).fill(DARK);
      doc.fillColor('#ffffff').fontSize(6).font('Helvetica-Bold');
      let hx2 = 32;
      colHeaders.forEach((header, hidx) => {
        doc.text(header, hx2, yPos + 3, { width: colWidths[hidx], align: hidx === 0 ? 'center' : hidx === 1 ? 'left' : 'center' });
        hx2 += colWidths[hidx];
      });
      yPos += 12;

      criteriaRows.slice(15, 30).forEach((row, idx) => {
        if (yPos + rowHeight + 3 > doc.page.height - 25) {
          addFooter(pageNum, 5, false);
          doc.addPage();
          pageNum++;
          addMinimalHeader();
          yPos = 40;

          doc.rect(30, yPos, doc.page.width - 60, 12).fill(DARK);
          doc.fillColor('#ffffff').fontSize(6).font('Helvetica-Bold');
          let hx3 = 32;
          colHeaders.forEach((header, hidx3) => {
            doc.text(header, hx3, yPos + 3, { width: colWidths[hidx3], align: hidx3 === 0 ? 'center' : hidx3 === 1 ? 'left' : 'center' });
            hx3 += colWidths[hidx3];
          });
          yPos += 12;
        }

        if (idx % 2 === 0) {
          doc.rect(30, yPos, doc.page.width - 60, rowHeight).fill('#f9f9f9');
        }

        doc.fillColor(DARK).fontSize(6).font('Helvetica');
        let rx = 32;
        doc.text(String(row.id), rx, yPos + 2, { width: colWidths[0], align: 'center' });
        rx += colWidths[0];
        doc.font('Helvetica-Bold').text(row.criterion, rx, yPos + 2, { width: colWidths[1] });
        rx += colWidths[1];
        doc.font('Helvetica').text(row.actual || '-', rx, yPos + 2, { width: colWidths[2], align: 'center' });
        rx += colWidths[2];
        doc.text(row.expected || '-', rx, yPos + 2, { width: colWidths[3], align: 'center' });
        rx += colWidths[3];
        doc.text(row.competitor || '-', rx, yPos + 2, { width: colWidths[4], align: 'center' });
        rx += colWidths[4];
        doc.text(row.importance || '-', rx, yPos + 2, { width: colWidths[5], align: 'center' });

        yPos += rowHeight;
      });

      // ===== SECTION 1 (Items 31-40) + SECTION 2 =====
      addPageIfNeeded();

      doc.fillColor(RED)
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('SECTION 1 OF 4: THE PERFORMANCE & IMPORTANCE MATRIX (Items 31 - 40)', 30, yPos);

      yPos += 10;

      doc.rect(30, yPos, doc.page.width - 60, 12).fill(DARK);
      doc.fillColor('#ffffff').fontSize(6).font('Helvetica-Bold');
      let hx4 = 32;
      colHeaders.forEach((header, hidx4) => {
        doc.text(header, hx4, yPos + 3, { width: colWidths[hidx4], align: hidx4 === 0 ? 'center' : hidx4 === 1 ? 'left' : 'center' });
        hx4 += colWidths[hidx4];
      });
      yPos += 12;

      criteriaRows.slice(30, 40).forEach((row, idx) => {
        if (yPos + rowHeight + 3 > doc.page.height - 25) {
          addFooter(pageNum, 5, false);
          doc.addPage();
          pageNum++;
          addMinimalHeader();
          yPos = 40;

          doc.rect(30, yPos, doc.page.width - 60, 12).fill(DARK);
          doc.fillColor('#ffffff').fontSize(6).font('Helvetica-Bold');
          let hx5 = 32;
          colHeaders.forEach((header, hidx5) => {
            doc.text(header, hx5, yPos + 3, { width: colWidths[hidx5], align: hidx5 === 0 ? 'center' : hidx5 === 1 ? 'left' : 'center' });
            hx5 += colWidths[hidx5];
          });
          yPos += 12;
        }

        if (idx % 2 === 0) {
          doc.rect(30, yPos, doc.page.width - 60, rowHeight).fill('#f9f9f9');
        }

        doc.fillColor(DARK).fontSize(6).font('Helvetica');
        let rx = 32;
        doc.text(String(row.id), rx, yPos + 2, { width: colWidths[0], align: 'center' });
        rx += colWidths[0];
        doc.font('Helvetica-Bold').text(row.criterion, rx, yPos + 2, { width: colWidths[1] });
        rx += colWidths[1];
        doc.font('Helvetica').text(row.actual || '-', rx, yPos + 2, { width: colWidths[2], align: 'center' });
        rx += colWidths[2];
        doc.text(row.expected || '-', rx, yPos + 2, { width: colWidths[3], align: 'center' });
        rx += colWidths[3];
        doc.text(row.competitor || '-', rx, yPos + 2, { width: colWidths[4], align: 'center' });
        rx += colWidths[4];
        doc.text(row.importance || '-', rx, yPos + 2, { width: colWidths[5], align: 'center' });

        yPos += rowHeight;
      });

      // Section 2: Competitive Landscape
      yPos += 8;
      doc.fillColor(RED)
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('SECTION 2 OF 4: COMPETITIVE LANDSCAPE', 30, yPos);
      
      yPos += 10;
      doc.fillColor(GRAY)
        .fontSize(6)
        .font('Helvetica')
        .text('Rank CNG against alternative market competitors (Rank 1 = Highest Peer Performance).', 30, yPos);
      
      yPos += 9;

      // Competitor table header
      if (yPos + 14 * (competitors.length + 1) > doc.page.height - 25) {
        addFooter(pageNum, 5, false);
        doc.addPage();
        pageNum++;
        addMinimalHeader();
        yPos = 40;
      }

      doc.rect(30, yPos, doc.page.width - 60, 12).fill(DARK);
      doc.fillColor('#ffffff').fontSize(6).font('Helvetica-Bold');
      doc.text('COMPETITOR / PEER ORGANISATION NAME', 32, yPos + 3, { width: 280 });
      doc.text('YOUR RANKING OF THIS', 312, yPos + 3, { width: 100 });

      yPos += 12;

      competitors.forEach((comp, idx) => {
        if (yPos + 13 > doc.page.height - 25) {
          addFooter(pageNum, 5, false);
          doc.addPage();
          pageNum++;
          addMinimalHeader();
          yPos = 40;
        }

        doc.fillColor(DARK).fontSize(6).font('Helvetica');
        doc.text(comp.name || '-', 32, yPos + 2, { width: 280 });
        doc.text(comp.rank || '-', 312, yPos + 2, { width: 100, align: 'center' });
        yPos += 12;
      });

      // ===== SECTION 3 =====
      addPageIfNeeded();

      doc.fillColor(RED)
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('SECTION 3 OF 4: GENERAL CONFIGURATION QUESTIONS', 30, yPos);

      yPos += 15;

      // Question printer
      const printQuestion = (question, answer, otherField, qNum) => {
        if (yPos + 35 > doc.page.height - 25) {
          addFooter(pageNum, 5, false);
          doc.addPage();
          pageNum++;
          addMinimalHeader();
          yPos = 40;
        }

        doc.fillColor(DARK).fontSize(7).font('Helvetica-Bold');
        doc.text(`${qNum}. ${question}`, 30, yPos);
        yPos += 11;
        doc.font('Helvetica').fontSize(7);
        
        const answerText = answer || 'Not specified';
        doc.text(`Answer: ${answerText}`, 40, yPos);
        yPos += 10;

        if (otherField) {
          doc.text(`Other: ${otherField}`, 40, yPos);
          yPos += 10;
        }

        yPos += 5;
      };

      printQuestion('Which Function best matches your job function?', formData.jobFunction, formData.jobFunctionOther, '1');
      printQuestion('Which descriptor best matches your current operating relationship with CNG?', formData.relationship, formData.relationshipOther, '2');
      printQuestion('When taking deliveries from CNG, How important is after sales service?', formData.afterSalesImportance, null, '3');

      // ===== SECTION 4 =====
      addPageIfNeeded();

      doc.fillColor(RED)
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('SECTION 4 OF 4: STRATEGIC INSIGHTS & FEEDBACK', 30, yPos);

      yPos += 15;

      // Compact multi-line answer printer
      const printCompactAnswer = (question, answerArr, otherAnswer, qNum) => {
        const answerText = answerArr && answerArr.length > 0 ? answerArr.join(', ') : 'None selected';
        const estLines = Math.ceil(answerText.length / 85);
        const estSpace = 14 + (estLines * 8) + (otherAnswer ? 8 : 0) + 6;

        if (yPos + estSpace > doc.page.height - 30) {
          addFooter(pageNum, 5, false);
          doc.addPage();
          pageNum++;
          addMinimalHeader();
          yPos = 40;
        }

        doc.fillColor(DARK).fontSize(7).font('Helvetica-Bold');
        doc.text(`${qNum}. ${question}`, 30, yPos);
        yPos += 11;
        
        doc.font('Helvetica').fontSize(6);
        doc.text(`Answer: ${answerText}`, 40, yPos, { width: doc.page.width - 70 });
        const textHeight = doc.heightOfString(`Answer: ${answerText}`, { width: doc.page.width - 70 });
        yPos += Math.max(10, textHeight + 2);

        if (otherAnswer) {
          doc.text(`Other: ${otherAnswer}`, 40, yPos, { width: doc.page.width - 70 });
          const otherHeight = doc.heightOfString(`Other: ${otherAnswer}`, { width: doc.page.width - 70 });
          yPos += Math.max(10, otherHeight + 2);
        }

        yPos += 5;
        return yPos;
      };

      yPos = printCompactAnswer('Select all matching descriptors representing organisational STRENGTHS of CNG:', formData.strengths, formData.strengthsOther, '1');
      yPos = printCompactAnswer('Select identified weaknesses or improvement areas for CNG operations:', formData.weaknesses, formData.weaknessesOther, '2');
      yPos = printCompactAnswer('What recommendations do you have for CNG to improve?', formData.recommendations, formData.recommendationsOther, '3');
      yPos = printCompactAnswer('Choose anyone or more recommendations for improving safety:', formData.safetyRecommendations, formData.safetyRecommendationsOther, '4');
      yPos = printCompactAnswer('Which of the following magazines do you read?', formData.magazines, formData.magazinesOther, '5');

      // Question 6
      if (yPos + 30 > doc.page.height - 30) {
        addFooter(pageNum, 5, false);
        doc.addPage();
        pageNum++;
        addMinimalHeader();
        yPos = 40;
      }

      yPos += 3;
      doc.fillColor(DARK).fontSize(7).font('Helvetica-Bold');
      doc.text('6. How likely are you to recommend CNG as an energy solution?', 30, yPos);
      yPos += 11;
      doc.font('Helvetica').fontSize(7);
      doc.text(`Score (1-10): ${formData.recommendScore || 'Not specified'}`, 40, yPos);
      yPos += 10;
      if (formData.recommendReason) {
        doc.text(`Reason: ${formData.recommendReason}`, 40, yPos, { width: doc.page.width - 70 });
        const reasonHeight = doc.heightOfString(`Reason: ${formData.recommendReason}`, { width: doc.page.width - 70 });
        yPos += Math.max(10, reasonHeight + 2);
      }

      // Business Name
      if (yPos + 25 > doc.page.height - 30) {
        addFooter(pageNum, 5, false);
        doc.addPage();
        pageNum++;
        addMinimalHeader();
        yPos = 40;
      }

      yPos += 3;
      doc.fillColor(DARK).fontSize(7).font('Helvetica-Bold');
      doc.text('Name / Business Name:', 30, yPos);
      yPos += 11;
      doc.font('Helvetica').fontSize(7);
      doc.text(formData.businessName || 'Not specified', 40, yPos);
      yPos += 12;

      // Closing line
      yPos = Math.max(yPos + 10, doc.page.height - 60);
      doc.rect(30, yPos, doc.page.width - 60, 1).fill(RED);
      yPos += 8;
      doc.fillColor(RED)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('THANK YOU FOR YOUR INSIGHTS', 30, yPos, { width: doc.page.width - 60, align: 'center' });
      yPos += 12;
      doc.fillColor(GRAY)
        .fontSize(6)
        .font('Helvetica')
        .text('Responses secured & protected with total data anonymity by Rob Daniel Associates', 30, yPos, { width: doc.page.width - 60, align: 'center' });

      // Last page footer with "Generated by SmartMat Technologies"
      addFooter(pageNum, 5, true);

      // ===== FINALIZE: No footer/page numbers needed =====

      // Finalize PDF
      doc.end();

      writeStream.on('finish', () => {
        resolve(filePath);
      });

      writeStream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { generatePDF };