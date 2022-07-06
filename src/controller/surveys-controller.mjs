import {createSurvey, searchSurveys, getSurvey, updateSurvey, deleteSurvey} from "../logic/surveys-logic.mjs";
import sanitize from "mongo-sanitize";
export default class SurveysController {

    static async createSurvey(ctx) {
        const survey = ctx.request.body;
        Object.keys(survey).forEach((key, index) => {
            survey[key] = sanitize(survey[key]);
        });
        const surveySaved = await createSurvey(survey);
        ctx.body = surveySaved;
    }

    static async getSurvey(ctx) {
        const surveyId = ctx.params.id;
        const survey = await getSurvey(surveyId);
        ctx.body = survey;
    }

    static async searchSurveys(ctx) {
        const { needBoundaryPoints } = ctx.query;
        const surveys = await searchSurveys(needBoundaryPoints);
        ctx.body = surveys;
    }

    static async updateSurvey(ctx) {
        const surveyId = ctx.params.id;
        const body = ctx.request.body;
        const updatedSurvey = await updateSurvey(surveyId, body);
        ctx.body = updatedSurvey;
    }

    static async deleteSurvey(ctx){
        const surveyId = ctx.params.id;
        const deletedSurveyId = await deleteSurvey(surveyId);
        ctx.body = deletedSurveyId;
    }
}