const PDFDocument = require('pdfkit');
const { db } = require("../configs/db");
const { v4: uuidv4 } = require("uuid");
const documentService = require("./document.service");

const generateCertificate = async (userData, propertyId, propertyData) => {
    return new Promise((resolve, reject) => {
        // 1. Verify ownership (security check)
        const query = `SELECT id, registry_number, display_name FROM property WHERE id = ? AND owner_user_id = ?`;
        
        db.query(query, [propertyId, userData.id], async (err, results) => {
            if (err) return reject(err);
            if (results.length === 0) return reject(new Error("Propriedade não encontrada ou não pertence ao usuário."));

            const sqlProperty = results[0];
            
            // Merge SQL data with passed Mongo data
            const finalData = {
                ...propertyData,
                registry_number: sqlProperty.registry_number,
                display_name: sqlProperty.display_name || propertyData.display_name
            };

            try {
                // 2. Generate PDF
                const doc = new PDFDocument({ margin: 50 });
                let buffers = [];
                doc.on('data', buffers.push.bind(buffers));
                
                doc.on('end', async () => {
                    const pdfData = Buffer.concat(buffers);

                    try {
                        // 3. Save to Document Table
                        const docName = `Certificado_${finalData.display_name || finalData.registry_number}.pdf`;
                        
                        const newDoc = await documentService.create({
                            name: docName,
                            mime_type: 'application/pdf',
                            content: pdfData
                        });

                        // 4. Upsert Certificate Record (Insert or Update if exists)
                        const certId = uuidv4();
                        const issueDate = new Date();
                        const expiryDate = new Date();
                        expiryDate.setFullYear(expiryDate.getFullYear() + 1); 

                        const certNumber = `CERT-${Date.now()}`; // Simple number generation

                        const upsertCertQuery = `
                            INSERT INTO certificate (id, property_id, document_id, type, number, issuer, issue_date, expiry_date, status, notes)
                            VALUES (?, ?, ?, 'ownership', ?, 'Rural CAR', ?, ?, 'valid', 'Certificado de Propriedade')
                            ON DUPLICATE KEY UPDATE
                                document_id = VALUES(document_id),
                                number = VALUES(number),
                                issue_date = VALUES(issue_date),
                                expiry_date = VALUES(expiry_date),
                                status = 'valid';
                        `;
                        
                        await new Promise((res, rej) => {
                            db.query(upsertCertQuery, [
                                certId, 
                                propertyId, 
                                newDoc.id, 
                                certNumber, 
                                issueDate, 
                                expiryDate
                            ],(err) => {
                                if (err) rej(err);
                                else res({ certificateId: certId, documentId: newDoc.id });
                            });
                        });

                        resolve({ success: true, certificateId: certId, url: `/documents/${newDoc.id}` });

                    } catch (e) {
                        reject(e);
                    }
                });

                // --- PDF CONTENT ---
                
                // Helper to format CPF
                const formatCPF = (cpf) => {
                    if (!cpf) return 'N/A';
                    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
                };

                // Header
                doc.fontSize(24).font('Helvetica-Bold').text('CERTIFICADO DE PROPRIEDADE', { align: 'center' });
                doc.moveDown();
                doc.fontSize(12).font('Helvetica').text('Este documento certifica o registro da propriedade abaixo descrita no sistema Rural CAR.', { align: 'center' });
                doc.moveDown(2);

                // Box Drawing Logic
                const boxX = 50;
                const boxWidth = 500;
                // We will draw the box after calculating height or just use a fixed large box?
                // Let's draw a large box for now, or two separate boxes? User asked for sections.
                // Let's keep one large box for simplicity but organize content inside.
                
                let y = 160;
                const xLabel = 70;
                const xValue = 220; // Increased spacing for value

                // --- Owner Details ---
                doc.fontSize(14).font('Helvetica-Bold').text('Detalhes do Proprietário:', 70, y);
                y += 30;

                const addField = (label, value) => {
                    doc.font('Helvetica-Bold').text(label + ':', xLabel, y);
                    doc.font('Helvetica').text(value || 'N/A', xValue, y);
                    y += 25;
                };

                addField('Nome', userData.name);
                addField('CPF', formatCPF(userData.cpf));
                addField('E-mail', userData.email);

                y += 20; // Extra spacing between sections

                // --- Property Details ---
                doc.fontSize(14).font('Helvetica-Bold').text('Detalhes da Propriedade:', 70, y);
                y += 30;

                addField('Nome', finalData.display_name);
                addField('Matrícula', finalData.registry_number);
                
                y += 15; // Extra spacing

                addField('Município', finalData.municipio);
                addField('Estado', finalData.cod_estado);
                addField('Área', finalData.area);
                addField('Perímetro', finalData.perimeter);
                
                y += 10;
                doc.font('Helvetica-Bold').fillColor('blue').text('Plus Code:', xLabel, y);
                doc.font('Helvetica').text(finalData.plusCode || 'N/A', xValue, y);
                doc.fillColor('black');

                // Draw the box around the content
                const boxHeight = y - 140; // Approximate height
                doc.rect(boxX, 150, boxWidth, boxHeight + 20).stroke();

                // Footer
                doc.fontSize(10).text(`Emitido em: ${new Date().toLocaleString('pt-BR')}`, 50, 700, { align: 'center' });
                doc.text(`ID do Certificado: ${uuidv4()}`, { align: 'center' });

                doc.end();

            } catch (error) {
                reject(error);
            }
        });
    });
};

const getCertificateByProperty = (propertyId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT c.*, d.name as doc_name 
            FROM certificate c
            JOIN document d ON c.document_id = d.id
            WHERE c.property_id = ? AND c.status = 'valid'
            ORDER BY c.issue_date DESC
            LIMIT 1
        `;
        db.query(query, [propertyId], (err, results) => {
            if (err) return reject(err);
            resolve(results[0]);
        });
    });
};

const getCertificatesByUser = (userId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT c.id, c.number, c.issue_date, c.expiry_date, c.status, 
                   p.display_name as property_name, p.registry_number,
                   d.id as document_id
            FROM certificate c
            JOIN property p ON c.property_id = p.id
            JOIN document d ON c.document_id = d.id
            WHERE p.owner_user_id = ? AND c.status = 'valid'
            ORDER BY c.issue_date DESC
        `;
        db.query(query, [userId], (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};

const revokeCertificate = (certificateId, userId) => {
    return new Promise((resolve, reject) => {
        // First verify ownership via property
        const verifyQuery = `
            SELECT c.id 
            FROM certificate c
            JOIN property p ON c.property_id = p.id
            WHERE c.id = ? AND p.owner_user_id = ?
        `;

        db.query(verifyQuery, [certificateId, userId], (err, results) => {
            if (err) return reject(err);
            if (results.length === 0) return reject(new Error("Certificado não encontrado ou permissão negada."));

            const updateQuery = `UPDATE certificate SET status = 'revoked' WHERE id = ?`;
            db.query(updateQuery, [certificateId], (err) => {
                if (err) return reject(err);
                resolve({ success: true });
            });
        });
    });
};

module.exports = {
    generateCertificate,
    getCertificateByProperty,
    getCertificatesByUser,
    revokeCertificate
};
