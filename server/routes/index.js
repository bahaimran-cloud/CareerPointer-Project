var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Career Pointer' });
});

router.get('/aboutus', function(req, res, next) {
  res.render('about', { title: 'Career Pointer - About Us' });
});

router.get('/contact', function(req, res, next) {
  res.render('contact', { title: 'Career Pointer - Contact Us' });
});

module.exports = router;
