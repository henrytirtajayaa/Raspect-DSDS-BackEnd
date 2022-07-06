import {ROLES} from "./role.mjs";

const DEFAULT_PERMISSION = [
    "SURVEY",
    "SEARCH_TRIP",
    "READ_TRIP",
    "SEARCH_TRIP_IMAGE",
    "CREATE_SIGNBOARDS",
    "READ_SIGNBOARDS",
    "SEARCH_SIGNBOARDS",
    "READ_SIGNBOARD_IMAGES",
    "READ_BUILDINGS",
    "UPDATE_SIGNBOARDS",
    "CREATE_BUILDINGS",
    "FILTER",
    "GET_BUILDINGS",
    "EXPORT_SIGNBOARD_LIST",
    "READ_PERFORMANCE",
    "EXPORT_IMAGE"
];

const permission = {
    [ROLES.ROLE_STANDARD]: DEFAULT_PERMISSION,
    [ROLES.ROLE_SUPERVISOR]: DEFAULT_PERMISSION,
    [ROLES.ROLE_ADMIN]: [...DEFAULT_PERMISSION, 
        "USER",
        "TEAM",
        "RUN_WORKFLOW"
    ],
    [ROLES.ROLE_SUPER_ADMIN]: [...DEFAULT_PERMISSION, 
        "USER",
        "TEAM",
        "RUN_WORKFLOW"
    ],
    [ROLES.ROLE_API]: [
        'CREATE_TRIP',
        'UPDATE_TRIP',
        'ASSIGN_TRIP_IMAGE',
        'CREATE_SIGNBOARDS',
        'CREATE_BUILDINGS',
        "READ_PERFORMANCE",
        "GET_GROUPED_SIGNBOARDS",
        "DELETE_GROUPED_SIGNBOARDS",
        "SURVEY"
    ]
}

export default permission;
