import getConnection from "../model/connection-factory.mjs";

export async function createSurvey(surveyInput){
    const db = await getConnection();
    const Survey = db.model('Survey');
    const survey = new Survey(surveyInput);
    await survey.save();
    return survey.toObject();
}

export async function getSurvey(surveyId){
    const db = await getConnection();
    const Trip = db.model('Trip');
    const Survey = db.model('Survey');
    let survey = await Survey.findOne({
        surveyId: surveyId
    });
    let trips = await Trip.find({
        surveyId
    },{
        refId: 1
    });
    trips = trips.map(trip => {
        return trip.refId;
    });
    survey = survey.toObject();
    survey.tripIds = trips;
    return survey;
}

export async function searchSurveys(needBoundaryPoints = false){
    const db = await getConnection();
    const Survey = db.model('Survey');
    let projection = {
        "surveyId": "$surveyId",
        "signbaordCount": {
            $size: "$signboards"
        },
        "createdAt": 1
    }
    if(needBoundaryPoints){
        projection.boundaryPoints = 1;
    }
    return await Survey.aggregate([
        {
            $lookup: {
                from: 'signboards', 
                localField: 'surveyId', 
                foreignField: 'surveyId', 
                as: 'signboards'
            }
        },{
            $project: projection
        }
    ]);
}

export async function updateSurvey(surveyId, body){
    const db = await getConnection();
    const Survey = db.model('Survey');
    const survey = await Survey.findOneAndUpdate({
      surveyId
    },{
      $set: body
    },{
      new: true
    });
    return survey.toObject();
}

export async function deleteSurvey(surveyId){
    const db = await getConnection();
    const Survey = db.model('Survey');
    await Survey.deleteOne({
        surveyId
    });
    return surveyId;
}