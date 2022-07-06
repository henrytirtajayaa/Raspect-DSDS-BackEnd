import {getSignboardStatistics} from '../logic/performance-logic.mjs';

export default class PerformanceController {
    static async getSignboardStatistics(ctx){
        const {surveyId, startTime , endTime} = ctx.request.body;
        ctx.body = await getSignboardStatistics(surveyId, startTime, endTime);
    }
}
