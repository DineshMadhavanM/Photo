const express = require('express');
const router = express.Router();
const Event = require('../models/Event');

// Middleware to check auth
const auth = (req, res, next) => {
    if (!req.session.userId) return res.status(401).json({ message: 'Unauthorized' });
    next();
};

// Create Event
router.post('/', auth, async (req, res) => {
    try {
        const { eventName } = req.body;
        const eventId = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        const newEvent = new Event({
            eventName,
            eventId,
            createdBy: req.session.userId
        });

        await newEvent.save();
        res.status(201).json(newEvent);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get User Events
router.get('/', auth, async (req, res) => {
    try {
        const events = await Event.find({ createdBy: req.session.userId }).sort({ createdAt: -1 });
        res.json(events);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get Event by ID (Public)
router.get('/:eventId', async (req, res) => {
    try {
        const event = await Event.findOne({ eventId: req.params.eventId });
        if (!event) return res.status(404).json({ message: 'Event not found' });
        res.json(event);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

const Photo = require('../models/Photo');
const { cloudinary } = require('../config/cloudinary');

// Delete Event (Admin Only)
router.delete('/:eventId', auth, async (req, res) => {
    try {
        const event = await Event.findOne({ eventId: req.params.eventId });
        if (!event) return res.status(404).json({ message: 'Event not found' });

        // Security check: Only the creator (admin) can delete
        if (event.createdBy.toString() !== req.session.userId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        // 1. Find all photos for this event
        const photos = await Photo.find({ eventId: req.params.eventId });

        // 2. Delete images from Cloudinary
        for (const photo of photos) {
            await cloudinary.uploader.destroy(photo.publicId);
        }

        // 3. Delete from MongoDB
        await Photo.deleteMany({ eventId: req.params.eventId });
        await Event.deleteOne({ eventId: req.params.eventId });

        res.json({ message: 'Event and all photos deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
