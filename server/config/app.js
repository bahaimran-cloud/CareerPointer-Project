require('dotenv').config();
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

let mongoose = require('mongoose');
let DB = require('./db');

//ADDED FOR USER AUTHENTICATION
let session = require('express-session');
let passport = require('passport');
passportLocal = require('passport-local'); 
let localStrategy = passportLocal.Strategy;
let flash = require('connect-flash');
let cors = require('cors');
var app = express();

// Configure CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

let userModel = require('../models/user');
let User = userModel.User;

var indexRouter = require('../routes/index');
var usersRouter = require('../routes/users');
let ApplicationRouter = require('../routes/JobApplication');

// Test the DB connection
mongoose.connect(process.env.MONGODB_URI || DB.URI);
let mongoDB = mongoose.connection;
mongoDB.on('error', console.error.bind(console, 'Connection Error'));
mongoDB.once('open', ()=>{
  console.log('Connected to MongoDB...');
});

app.use(session({
  secret: process.env.SESSION_SECRET || "SomeSecretString",
  saveUninitialized: false,
  resave: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production' && process.env.USE_HTTPS === 'true',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true
  }
}));

//initialize flash
app.use(flash());

//serialize and deserialize the user info
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Google OAuth Strategy
const GoogleStrategy = require('passport-google-oauth20').Strategy;
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:3000/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ email: profile.emails[0].value });
      if (!user) {
        user = await User.create({
          username: profile.emails[0].value,
          email: profile.emails[0].value,
          displayName: profile.displayName,
          avatar: profile.photos[0]?.value || '/content/images/default-avatar.png',
          oauthProvider: 'google'
        });
      }
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
));

// GitHub OAuth Strategy
const GitHubStrategy = require('passport-github2').Strategy;
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.GITHUB_CALLBACK_URL || "http://localhost:3000/auth/github/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails && profile.emails[0] 
        ? profile.emails[0].value 
        : `${profile.username}@github.local`;
      
      let user = await User.findOne({ email: email });
      if (!user) {
        user = await User.create({
          username: profile.username,
          email: email,
          displayName: profile.displayName || profile.username,
          avatar: profile.photos && profile.photos[0] 
            ? profile.photos[0].value 
            : '/content/images/default-avatar.png',
          oauthProvider: 'github'
        });
      }
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
));

// Discord OAuth Strategy
const DiscordStrategy = require('passport-discord').Strategy;
passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.DISCORD_CALLBACK_URL || "http://localhost:3000/auth/discord/callback",
    scope: ['identify', 'email']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ email: profile.email });
      if (!user) {
        user = await User.create({
          username: profile.username,
          email: profile.email,
          displayName: profile.username,
          avatar: profile.avatar 
            ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
            : '/content/images/default-avatar.png',
          oauthProvider: 'discord'
        });
      }
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
));

//initialize passport
app.use(passport.initialize());
app.use(passport.session());

// expose auth info to views (for navbar avatar/display name)
app.use((req, res, next) => {
  res.locals.displayName = req.user ? req.user.displayName : '';
  res.locals.userAvatar = req.user && req.user.avatar
    ? req.user.avatar
    : '/content/images/default-avatar.png';
  next();
});

// view engine setup
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../../public')));
app.use(express.static(path.join(__dirname, '../../node_modules')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/applications', ApplicationRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error', {title: 'Error'});
});

module.exports = app;