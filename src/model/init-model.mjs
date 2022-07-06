import Survey from './survey.mjs';
import Trip from "./trip.mjs";
import Photo from "./photo.mjs";
import User from "./user.mjs";
import Signboard from "./signboard.mjs";
import SignboardImage from "./signboard-image.mjs";
import Building from './building.mjs';
import Team from './team.mjs';
import GroupedSignboard from './grouped-signboards.mjs';

export default function initModel(conn) {
    conn.model('Survey', Survey);
    conn.model('Trip', Trip);
    conn.model('Photo', Photo);
    conn.model('User', User);
    conn.model('Signboard', Signboard);
    conn.model('SignboardImage', SignboardImage);
    conn.model('Building', Building);
    conn.model('Team', Team);
    conn.model('GroupedSignboard', GroupedSignboard);
}