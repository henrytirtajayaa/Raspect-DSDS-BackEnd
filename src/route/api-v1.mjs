import Router from 'koa-router';
import compose from 'koa-compose';
import Oas3 from 'koa-oas3';
import config from 'config';
import jwt from 'koa-jwt';
import SurveysController from "../controller/surveys-controller.mjs";
import TripsController from "../controller/trips-controller.mjs";
import permissionCheckMiddleware from "../middleware/permission-check.mjs";
import AuthController from "../controller/auth-controller.mjs";
import SignboardsController from "../controller/signboards-controller.mjs";
import CommonController from "../controller/common-controller.mjs";
import UsersController from "../controller/users-controller.mjs"
import BuildingsController from "../controller/buildings-controller.mjs";
import PerformanceController from "../controller/performance-controller.mjs";
import TeamController from "../controller/team-controller.mjs";

export default async () => {
  const prefix = '/dsds/api/v1';
  const router = new Router({
    prefix,
  });
  const oasMiddleware = await Oas3.oas({
    file: `${process.cwd()}/api_spec/openapi-v1.yaml`,
    endpoint: `${prefix}/openapi.json`,
    uiEndpoint: `${prefix}/openapi.html`,
    validatePaths: [prefix],
    validateResponse: true,
    errorHandler: (error, ctx) =>  {
      throw error;
    },
  });

  // Full system requires authentication
  router.use(jwt({ secret: config.get('auth.jwtSecret') }).unless({ path: [/^\/dsds\/api\/v1\/login/, /^\/dsds\/api\/v1\/refresh-access-token/, /^\/dsds\/api\/v1\/forget-password/, /^\/dsds\/api\/v1\/reset-password/, /^\/dsds\/api\/v1\/contact-us/] }));

  // Survey
  router.post('/surveys', permissionCheckMiddleware('SURVEY'), SurveysController.createSurvey);
  router.get('/surveys/:id', permissionCheckMiddleware('SURVEY'), SurveysController.getSurvey);
  router.get('/surveys', permissionCheckMiddleware('SURVEY'), SurveysController.searchSurveys);
  router.put('/surveys/:id', permissionCheckMiddleware('SURVEY'), SurveysController.updateSurvey);
  router.delete('/surveys/:id', permissionCheckMiddleware('SURVEY'), SurveysController.deleteSurvey);

  // Trip
  router.get('/trips', permissionCheckMiddleware('SEARCH_TRIP'), TripsController.searchTrips);
  router.post('/trips', permissionCheckMiddleware('CREATE_TRIP'), TripsController.createTrip);
  router.get('/trips/latest', permissionCheckMiddleware('READ_TRIP'), TripsController.getLatestTrips);
  router.get('/trips/:id', permissionCheckMiddleware('READ_TRIP'), TripsController.getTrip);
  router.patch('/trips/:id', permissionCheckMiddleware('UPDATE_TRIP'), TripsController.updateTripStatus);
  router.post('/trips/:id', permissionCheckMiddleware('UPDATE_TRIP'), TripsController.updateTrip);

  // Trip photos
  router.post('/trips/:id/photos', permissionCheckMiddleware('ASSIGN_TRIP_IMAGE'), TripsController.assignTripImages);
  router.get('/trips/:id/photos', permissionCheckMiddleware('SEARCH_TRIP_IMAGE'), TripsController.searchTripImages);
  router.delete('/trips/:id/photos', permissionCheckMiddleware('UPDATE_TRIP'), TripsController.deleteTripImages);
  router.get('/trips/:id/photos/status', permissionCheckMiddleware('ASSIGN_TRIP_IMAGE'), TripsController.getPhotoProcessingStatus);
  router.get('/trips/:id/photo/:filename/export', permissionCheckMiddleware('EXPORT_IMAGE'), TripsController.exportImage);
  router.get('/trips/:id/photo/:filename/group-id/:groupid', permissionCheckMiddleware('EXPORT_IMAGE'), TripsController.getLidarImagePath);
  router.get('/trips/:id/photo/:filename/all-prediction', permissionCheckMiddleware('EXPORT_IMAGE'), TripsController.getAllPredictionImagePath);

  // Pending signboard
  router.post('/signboards/pending', permissionCheckMiddleware('CREATE_SIGNBOARDS'), SignboardsController.registerSuspectedMissingSignboard);
  router.post('/signboards/run-evaluate-workflow', permissionCheckMiddleware('RUN_WORKFLOW'), SignboardsController.runEvaluateAnnotations);
  router.post('/signboards/pending/filter', permissionCheckMiddleware('READ_SIGNBOARDS'), SignboardsController.getPendingSignboards);
  router.post('/signboards/pending/status', permissionCheckMiddleware('READ_SIGNBOARDS'), SignboardsController.getPendingSignboardStatus);

  // Signboard
  router.post('/signboards', permissionCheckMiddleware('CREATE_SIGNBOARDS'), SignboardsController.createSignboards);
  router.get('/signboards', permissionCheckMiddleware('SEARCH_SIGNBOARDS'), SignboardsController.searchSignboards);
  router.post('/signboards/delete', permissionCheckMiddleware('DELETE_SIGNBOARDS'), SignboardsController.deleteSignboards);
  router.get('/signboards/filter', permissionCheckMiddleware('READ_SIGNBOARDS'), SignboardsController.filterSignboardsByField);
  router.post('/signboards/filter', permissionCheckMiddleware('READ_SIGNBOARDS'), SignboardsController.filterSignboards);
  router.get('/signboards/buildings', permissionCheckMiddleware('READ_BUILDINGS'), SignboardsController.getBuildings);
  router.post('/signboards/export-list', permissionCheckMiddleware('EXPORT_SIGNBOARD_LIST'), SignboardsController.exportSignboardList);
  router.post('/signboards/export', permissionCheckMiddleware('EXPORT_SIGNBOARD_IMAGES'), SignboardsController.exportImages);
  router.post('/signboards/grouped', permissionCheckMiddleware('GET_GROUPED_SIGNBOARDS'), SignboardsController.getGroupedSignboards);
  router.get('/signboards/distribute/trip/:id', permissionCheckMiddleware('UPDATE_SIGNBOARDS'), SignboardsController.distributeSignboardsByTripId);
  router.get('/signboards/distribute/survey/:id', permissionCheckMiddleware('UPDATE_SIGNBOARDS'), SignboardsController.distributeSignboardsBySurveyId);
  router.get('/signboards/:id', permissionCheckMiddleware('READ_SIGNBOARDS'), SignboardsController.getSignboardInfo);
  router.put('/signboards', permissionCheckMiddleware('UPDATE_SIGNBOARDS'), SignboardsController.bulkUpdateSignboards);
  router.put('/signboards/images', permissionCheckMiddleware('UPDATE_SIGNBOARDS'), SignboardsController.bulkUpdateSignboardImages);
  router.put('/signboards/:id', permissionCheckMiddleware('UPDATE_SIGNBOARDS'), SignboardsController.updateSignboard);
  router.get('/signboards/:id/images', permissionCheckMiddleware('READ_SIGNBOARD_IMAGES'), SignboardsController.searchSignboardImages);
  router.patch('/signboards/:id/image/:imageid', permissionCheckMiddleware('UPDATE_SIGNBOARDS'), SignboardsController.updateDefectAnnotation);
  router.delete('/signboards/grouped/trips/:id', permissionCheckMiddleware('DELETE_GROUPED_SIGNBOARDS'), SignboardsController.deleteGroupedSignboards);

  // routes for common use
  router.get('/districts', CommonController.getDistricts);

  // Building
  router.post('/buildings', permissionCheckMiddleware('CREATE_BUILDINGS'), BuildingsController.createBuildings);
  router.get('/buildings/filter', permissionCheckMiddleware('GET_BUILDINGS'), BuildingsController.filterBuildings);
  router.get('/buildings/:id', permissionCheckMiddleware('GET_BUILDINGS'), BuildingsController.getBuilding);
  
  // Authentication
  router.post('/login', AuthController.webLogin);
  router.post('/logout', AuthController.webLogout);
  router.post('/refresh-access-token', AuthController.refreshAccessToken);
  router.post('/forget-password', AuthController.forgetPassword);
  router.post('/reset-password', AuthController.resetPassword);
  router.post('/contact-us', AuthController.contactUs);

  // Users
  router.post('/user', permissionCheckMiddleware('USER'), UsersController.createUser);
  router.get('/user', permissionCheckMiddleware('USER'), UsersController.getUsers);
  router.get('/user/filter', permissionCheckMiddleware('USER'), UsersController.filterUsers);
  router.get('/user/:id', permissionCheckMiddleware('USER'), UsersController.getUserInfo);
  router.post('/user/:id', permissionCheckMiddleware('USER'), UsersController.updateUser);
  router.delete('/user/:id', permissionCheckMiddleware('USER'), UsersController.deleteUser);

  // Preset
  router.get('/user/:id/filter', permissionCheckMiddleware('FILTER'), UsersController.getFilters);
  router.post('/user/:id/filter', permissionCheckMiddleware('FILTER'), UsersController.addFilter);
  router.patch('/user/:id/filter/:filterid', permissionCheckMiddleware('FILTER'), UsersController.updateFilter);
  router.delete('/user/:id/filter/:filterid', permissionCheckMiddleware('FILTER'), UsersController.removeFilter);
  
  // Performance
  router.post('/performance', permissionCheckMiddleware('READ_PERFORMANCE'), PerformanceController.getSignboardStatistics);

  // Team
  router.post('/teams', permissionCheckMiddleware('TEAM'), TeamController.createTeam);
  router.get('/teams', permissionCheckMiddleware('TEAM'), TeamController.getAllTeams);
  router.get('/teams/:id', permissionCheckMiddleware('TEAM'), TeamController.getTeam);
  router.delete('/teams/:id', permissionCheckMiddleware('TEAM'), TeamController.deleteTeam);
  router.put('/teams', permissionCheckMiddleware('TEAM'), TeamController.updateTeams);

  const routes = router.routes();

  return compose([
    // oasMiddleware,
    routes,
  ]);
};
