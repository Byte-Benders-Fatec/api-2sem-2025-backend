const certificateService = require('../services/certificate.service');

const generate = async (req, res) => {
    try {
        const userData = {
            id: req.user.id,
            name: req.user.name,
            email: req.user.email,
            cpf: req.user.cpf
        };

        const { propertyId, propertyData } = req.body;

        if (!propertyId) {
            return res.status(400).json({ error: 'Property ID is required' });
        }

        const result = await certificateService.generateCertificate(userData, propertyId, propertyData || {});
        res.status(201).json(result);
    } catch (error) {
        console.error('Error generating certificate:', error);
        res.status(500).json({ error: 'Failed to generate certificate', details: error.message });
    }
};

const getByProperty = async (req, res) => {
    try {
        const { propertyId } = req.params;
        const certificate = await certificateService.getCertificateByProperty(propertyId);
        
        if (!certificate) {
            return res.status(404).json({ message: 'No valid certificate found for this property' });
        }

        res.json(certificate);
    } catch (error) {
        console.error('Error fetching certificate:', error);
        res.status(500).json({ error: 'Failed to fetch certificate' });
    }
};

module.exports = {
    generate,
    getByProperty
};
