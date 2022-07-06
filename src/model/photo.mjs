import mongoose from "mongoose";

const pointSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['Point'],
        required: true
    },
    coordinates: {
        type: [Number],
        index: { type: '2dsphere', sparse: false },
        required: true
    }
});

const schema = new mongoose.Schema({
    tripRefId: {
        type: String,
        required: true,
        index: true,
    },
    location: {
        type: pointSchema,
        index: '2dsphere',
        required: true,
    },
    cameraLocation: {
        type: pointSchema
    },
    shootingDirection: {
        type: Number
    },
    cameraDirection: {
        type: String
    },
    batchNo: {
        type: Number,
        default: 0,
        index: true,
    },
    cameraId: {
        type: String,
    },
    filename: {
        type: String,
        unique: true
    },
    lowResMatrix: [[Number]],
    mediumResMatrix: [[Number]],
    highResMatrix: [[Number]],
    lowResPath: String,
    mediumResPath: String,
    highResPath: String,
    status: {
        type: String,
        enum: ['New', 'Processed'],
        default: 'New',
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    capturedAt: {
        type: Date,
    },
    sampling: {
        type: Boolean,
        default: false
    },
    isUsedIn3dModelGen: {
        type: Boolean,
        default: false
    }
});
schema.index({tripRefId: 1, batchNo: 1});

export default schema;
