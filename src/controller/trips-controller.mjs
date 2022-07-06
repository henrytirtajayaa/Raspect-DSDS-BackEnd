import moment from "moment";
import {createTrip, searchTrips, getTrip, updateTripPointsAndStatus, updateTrip, getLatestTrips} from "../logic/trips-logic.mjs";
import {createTripPhotos, searchTripPhotos, resizePhotos, getPhotoProcessingStatus, deleteTripImages, exportImage, getLidarImagePath, getAllPredictionImagePath} from "../logic/photos-logic.mjs";
import sanitize from "mongo-sanitize";

function formatDate(input) {
    if (input.startTime) input.startTime = moment(input.startTime).toISOString();
    if (input.endTime) input.endTime = moment(input.endTime).toISOString();
    if (input.createdAt) input.createdAt = moment(input.createdAt).toISOString();
    return input;
}

export default class TripsController {
    static async searchTrips(ctx) {
        const {boundary, startDate, endDate} = ctx.request.query;
        const trips = await searchTrips(boundary, startDate, endDate);
        ctx.body = trips.map(formatDate);
    }

    static async createTrip(ctx) {
        const trip = ctx.request.body;
        Object.keys(trip).forEach((key, index) => {
            trip[key] = sanitize(trip[key]);
        });
        const tripSaved = await createTrip(trip);
        ctx.body = formatDate(tripSaved);
    }

    static async getTrip(ctx) {
        const tripId = ctx.params.id;
        const trip = await getTrip(tripId)
        ctx.body = formatDate(trip);
    }

    static async updateTripStatus(ctx) {
        const tripUpdateRequest = ctx.request.body;
        const updatedTrip = await updateTripPointsAndStatus(tripUpdateRequest);
        ctx.body = formatDate(updatedTrip);
    }

    static async updateTrip(ctx){
        const tripId = ctx.params.id;
        const body = ctx.request.body;
        const updatedTrip = await updateTrip(tripId, body);
        ctx.body = formatDate(updatedTrip);
    }

    static async assignTripImages(ctx) {
        const tripId = ctx.params.id;
        const photos = ctx.request.body;
        photos.forEach((photo) => {
            photo.tripRefId = tripId;
        })
        const savedPhotos = await createTripPhotos(photos);
        ctx.body = savedPhotos.map(formatDate);
        resizePhotos(savedPhotos);
    }

    static async getPhotoProcessingStatus(ctx){
        const tripId = ctx.params.id;
        ctx.body = await getPhotoProcessingStatus(tripId);
    }

    static async searchTripImages(ctx) {
        const tripId = ctx.params.id;
        const coordinates = ctx.query.coordinates;
        const location = (coordinates) ? JSON.parse(coordinates) : null;
        const batchObj = ctx.query.batch;
        const batch = (batchObj) ? JSON.parse(batchObj) : null;
        const result = await searchTripPhotos(tripId, location, batch);
        if(result.photos) result.photos = result.photos.map(formatDate);
        ctx.body = result;
    }

    static async deleteTripImages(ctx){
        const tripId = ctx.params.id;
        const result = await deleteTripImages(tripId);
        ctx.body = result;
    }

    static async getLatestTrips(ctx){
        ctx.body = await getLatestTrips();
    }

    static async exportImage(ctx){
        const tripRefId = ctx.params.id;
        const filename = ctx.params.filename;
        await exportImage(ctx, tripRefId, filename);
    }

    static async getLidarImagePath(ctx){
        const filename = ctx.params.filename;
        const groupId = ctx.params.groupid;
        ctx.body = await getLidarImagePath(filename, groupId);
    }

    static async getAllPredictionImagePath(ctx){
        const tripId = ctx.params.id;
        const filename = ctx.params.filename;
        ctx.body = await getAllPredictionImagePath(tripId, filename);
    }
}
