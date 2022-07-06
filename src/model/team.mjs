import mongoose from "mongoose";

const teamSchema = new mongoose.Schema({
    seniorPro: String,
    caseOfficer: String,
    caseAssistant: String,
    lastModifiedBy: String
},{
    timestamps: true
});

export default teamSchema;