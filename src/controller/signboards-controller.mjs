import moment from "moment";
import {updateDefectAnnotation, registerSuspectedMissingSignboard, getPendingSignboards, getGroupedSignboards, deleteGroupedSignboards} from "../logic/annotation-logic.mjs"
import {createSignboardsWithImages, searchSignboards, getSignboardInfo, searchSignboardImages, getPendingSignboardStatus, filterSignboards, filterSignboardsByField, updateSignboard, exportSignboardList, deleteSignboardsBySignboardIds, deleteSignboardImagesBySignboardIds, deleteSignboardsNImagesByTripId, distributeSignboardsByTripId, distributeSignboardsBySurveyId, bulkUpdateSignboards, bulkUpdateSignboardImages, exportImages} from "../logic/signboards-logic.mjs";
import {getBuildings} from '../utils/grpc-utils.mjs';
import {runWorkflow} from '../utils/graphql-utils.mjs';
import _ from 'lodash';
export default class SignboardsController {
    static async searchSignboards(ctx) {
        const query  = ctx.request.query;
        if(query.boundary){
            query.boundary = JSON.parse(query.boundary)
        }
        const result = await searchSignboards(query);
        ctx.body = result;
    }

    static async getSignboardInfo(ctx){
        const signboardId = ctx.params.id;
        const signboardIds = _.split(signboardId, ',');

        const signboards = await getSignboardInfo(signboardIds);
        ctx.body = signboards;
    }

    static async filterSignboardsByField(ctx) {
        let query = ctx.request.query;
        for(const field in query){
            query[field] = JSON.parse(query[field])
        }
        const signboards = await filterSignboardsByField(query);
        ctx.body = signboards;
    }

    static async filterSignboards(ctx) {
        const filterParams = ctx.request.body;
        const result = await filterSignboards(filterParams);
        ctx.body = result;
    }

    static async createSignboards(ctx) {
        const signboards = ctx.request.body;
        const signboardsSaved = await createSignboardsWithImages(signboards);
        ctx.body = signboardsSaved;
    }

    static async searchSignboardImages(ctx) {
        const signboardId = ctx.params.id;
        const signboardImages = await searchSignboardImages(signboardId);
        ctx.body = signboardImages;
    }

    static async getBuildings(ctx) {
        const {long, lat, precision} = ctx.request.query;
        ctx.body = await getBuildings(lat, long, precision);
    }

    static async updateSignboard(ctx) {
        const signboardId = ctx.params.id;
        const updateParams = ctx.request.body;
        const post = (ctx.state.user.post) ? ctx.state.user.post : ctx.state.user.staffId;
        const updatedSignboard = await updateSignboard(post, signboardId, updateParams);
        ctx.body = updatedSignboard;
    }

    static async bulkUpdateSignboards(ctx) {
        const signboards = ctx.request.body;
        const updatedSignboards = await bulkUpdateSignboards(signboards);
        ctx.body = updatedSignboards;
    }

    static async bulkUpdateSignboardImages(ctx) {
        const signboardImages = ctx.request.body;
        const updatedSignboardImages = await bulkUpdateSignboardImages(signboardImages);
        ctx.body = updatedSignboardImages;
    }

    static async updateDefectAnnotation(ctx){
        const signboardId = ctx.params.id;
        const imageId = ctx.params.imageid;
        const updateParams = ctx.request.body;
        const post = (ctx.state.user.post) ? ctx.state.user.post : ctx.state.user.staffId;
        ctx.body = await updateDefectAnnotation(post, signboardId, imageId, updateParams);
    }

    static async exportSignboardList(ctx){
        const exportParams = ctx.request.body;
        await exportSignboardList(ctx, exportParams);
    }

    static async registerSuspectedMissingSignboard(ctx){
        const {tripRefId, photoId, annotation} = ctx.request.body;
        const user = ctx.state.user;
        ctx.body = await registerSuspectedMissingSignboard(user, tripRefId, photoId, annotation);
    }

    static async getPendingSignboards(ctx){
        const signboardIds = ctx.request.body;
        ctx.body = await getPendingSignboards(signboardIds);
    }

    static async getPendingSignboardStatus(ctx){
        const filterParams = ctx.request.body;
        ctx.body = await getPendingSignboardStatus(filterParams);
    }

    static async deleteSignboards(ctx){
        const {deleteSignboardIds, tripRefId} = ctx.request.body;
        if(tripRefId){
            ctx.body = await deleteSignboardsNImagesByTripId(tripRefId);
        } else {
            await deleteSignboardImagesBySignboardIds(deleteSignboardIds);
            ctx.body = await deleteSignboardsBySignboardIds(deleteSignboardIds);
        }
    }

    static async getGroupedSignboards(ctx){
        const groupIds = ctx.request.body;
        ctx.body = await getGroupedSignboards(groupIds);
    }

    static async deleteGroupedSignboards(ctx){
        const tripId = ctx.params.id;
        const result = await deleteGroupedSignboards(tripId);
        ctx.body = result;
    }

    static async runEvaluateAnnotations(ctx){
        const body = ctx.request.body;
        ctx.body = await runWorkflow("evaluate-manual-signboard-annotation", body);
    }

    static async distributeSignboardsByTripId(ctx){
        const tripRefId = ctx.params.id;
        ctx.body = await distributeSignboardsByTripId(tripRefId);
    }

    static async distributeSignboardsBySurveyId(ctx){
        const surveyId = ctx.params.id;
        ctx.body = await distributeSignboardsBySurveyId(surveyId);
    }

    static async exportImages(ctx){
        const signboardIds = ctx.request.body;
        await exportImages(ctx, signboardIds);
    }
}