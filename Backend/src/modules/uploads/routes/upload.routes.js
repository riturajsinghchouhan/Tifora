import express from 'express';
import { upload } from '../../../middleware/upload.js';
import { uploadFileBuffer, uploadImageBuffer, uploadVideoBuffer } from '../../../services/upload.service.js';

const router = express.Router();

// POST /v1/uploads/image
router.post('/image', upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({
                success: false,
                message: 'No file provided'
            });
        }

        let folder = typeof req.body?.folder === 'string' && req.body.folder.trim()
            ? req.body.folder.trim()
            : 'uploads';

        // Legacy appzeto removal and mapping categories to foods
        folder = folder.replace(/^appzeto\//, '');
        if (folder === 'categories') folder = 'foods';

        const url = await uploadImageBuffer(req.file.buffer, folder);

        return res.status(200).json({
            success: true,
            message: 'Image uploaded successfully',
            data: {
                url,
                publicId: null
            }
        });
    } catch (error) {
        next(error);
    }
});

// POST /v1/uploads/file
router.post('/file', upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({
                success: false,
                message: 'No file provided'
            });
        }

        const mimeType = String(req.file.mimetype || '').toLowerCase();
        const originalName = String(req.file.originalname || '').toLowerCase();
        const isPdf = mimeType === 'application/pdf' || originalName.endsWith('.pdf');
        if (!isPdf) {
            return res.status(400).json({
                success: false,
                message: 'Only PDF files are allowed'
            });
        }

        let folder = typeof req.body?.folder === 'string' && req.body.folder.trim()
            ? req.body.folder.trim()
            : 'uploads';

        folder = folder.replace(/^appzeto\//, '');

        const url = await uploadFileBuffer(req.file.buffer, folder, {
            fileName: req.file.originalname || 'menu.pdf',
            format: 'pdf'
        });

        return res.status(200).json({
            success: true,
            message: 'File uploaded successfully',
            data: {
                url,
                publicId: null
            }
        });
    } catch (error) {
        next(error);
    }
});

// POST /v1/uploads/video
router.post('/video', upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({
                success: false,
                message: 'No file provided'
            });
        }

        const mimeType = String(req.file.mimetype || '').toLowerCase();
        if (!mimeType.startsWith('video/')) {
            return res.status(400).json({
                success: false,
                message: 'Only video files are allowed'
            });
        }

        let folder = typeof req.body?.folder === 'string' && req.body.folder.trim()
            ? req.body.folder.trim()
            : 'uploads/videos';

        folder = folder.replace(/^appzeto\//, '');

        const url = await uploadVideoBuffer(req.file.buffer, folder);

        return res.status(200).json({
            success: true,
            message: 'Video uploaded successfully',
            data: {
                url,
                publicId: null
            }
        });
    } catch (error) {
        next(error);
    }
});

export default router;

