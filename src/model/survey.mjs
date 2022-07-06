import mongoose from "mongoose";

const lineStringSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['LineString'],
        required: true
    },
    coordinates: {
        index: { type: '2dsphere', sparse: false },
        type: [[Number]], // Array of arrays of arrays of numbers
        required: true
    }
});

const schema = new mongoose.Schema({
    surveyId: {
        type: String,
        required: true,
        unique: true
    },
    name: String,
    sampleSize: {
        type: Number,
        default: 10
    },
    boundaryPoints: {
        type: lineStringSchema,
        index: '2dsphere'
    },
    teamIds: [mongoose.Schema.Types.ObjectId],
    distributionOption: {
        type: String,
        default: "defective",
        enum: ['defective', 'all']
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default schema;
