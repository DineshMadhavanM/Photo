const express = require('express');
const router = express.Router();
const { upload } = require('../config/cloudinary');
const Photo = require('../models/Photo');

const User = require('../models/User');

// Upload Photos (Admin Only)
router.post('/upload', upload.array('photos', 100), async (req, res) => {
    try {
        // Auth and Admin check
        if (!req.session.userId) return res.status(401).json({ message: 'Unauthorized' });
        
        const user = await User.findById(req.session.userId);
        if (!user || user.email !== 'kit27.ad17@gmail.com') {
            return res.status(403).json({ message: 'Access denied. Only the admin can upload photos.' });
        }

        const { eventId } = req.body;
        const photos = req.files.map(file => ({
            imageUrl: file.path,
            publicId: file.filename,
            eventId: eventId
        }));

        const savedPhotos = await Photo.insertMany(photos);
        res.status(201).json(savedPhotos);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Upload failed' });
    }
});

// Get Photos for Event
router.get('/:eventId', async (req, res) => {
    try {
        const photos = await Photo.find({ eventId: req.params.eventId }).sort({ uploadedAt: -1 });
        res.json(photos);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Select/Unselect Photo
router.post('/select', async (req, res) => {
    try {
        const { photoId, selected } = req.body;
        const photo = await Photo.findByIdAndUpdate(photoId, { selected }, { new: true });
        res.json(photo);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get Selected Photos
router.get('/selected/:eventId', async (req, res) => {
    try {
        const photos = await Photo.find({ eventId: req.params.eventId, selected: true });
        res.json(photos);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
