const mongoose = require('mongoose');

const PhotoSchema = new mongoose.Schema({
    imageUrl: { type: String, required: true },
    publicId: { type: String, required: true },
    eventId: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
    selected: { type: Boolean, default: false }
});

module.exports = mongoose.model('Photo', PhotoSchema);
