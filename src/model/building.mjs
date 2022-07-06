import mongoose from 'mongoose';

const schema = new mongoose.Schema({
    structId: {
        type: Number,
        unique: true,
        required: true
    },
    areaCode: String,
    englishAddress: String,
    englishStreetName: String,
    englishAreaName: String,
    fileRef: String,
    lon: Number,
    lat: Number
});

export default schema;