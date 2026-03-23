import express from "express"
import { addInstitutionDetails, registerInstitutionRequest } from "../controllers/institute.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const institutionRoute=express.Router();




// institutionRoute.get('/allInstitutions',getAllInstitions);


institutionRoute.post('/reqForInstitution',verifyToken,registerInstitutionRequest);
institutionRoute.post('/addInstitute',verifyToken,addInstitutionDetails);



export default institutionRoute;