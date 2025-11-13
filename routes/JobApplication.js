let express = require('express');
let router = express.Router();
let mongoose = require('mongoose');
let Application = require('../models/JobApplication');

router.get('/', (async (req, res, next) => {
    try {
        const applications = await Application.find({});
        //console.log(applications);
        res.render('JobApplication', {title: 'Job Applications', applications: applications});
    } catch (err) {
        console.error(err);
        //res.render
    }
}));

module.exports = router;