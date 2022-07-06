import mongoose from "mongoose";

const groupedSignboardsSchema = new mongoose.Schema({
    groupId: {
        type: String,
        index: true,
        required: true
    },
    type: {
        type: String,
        enum: ['Feature'],
        required: true
    },
    tripId: String,
    geometry: Map,
    properties: Map,
    detectionType: {
        type: String,
        enum: ["manual", "auto"],
        default: "auto"
    },
    status: {
        type: String,
        enum: ["deleted", "active"],
        default: "active"
    },
    boundingBoxModified: {
        type: Boolean,
        default: false
    }
});

export default groupedSignboardsSchema;
