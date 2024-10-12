// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config(); // Correctly import and configure dotenv

import createError from 'http-errors';
import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import cors from 'cors';

// Import your routers
import indexRouter from './routes/index.js';
import usersRouter from './routes/users.js';
import testApi from './routes/testApi.js';
import signupRouter from './routes/signup.js';
import loginRouter from './routes/login.js';
import encryptFileRouter from './routes/encryptFile.js';
import encryptTextRouter from './routes/encryptText.js';
import decryptRouter from './routes/decrypt.js';
import dataListRouter from './routes/getDataList.js';

// Import Firebase
import { initializeApp } from 'firebase/app';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);

const app = express();

// Middleware setup
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  cors({
    origin: 'https://filecloak.vercel.app', // Allow requests from your React app
  })
);

// Define routes
app.use('/', indexRouter);
app.use('/api/users', usersRouter);
app.use('/api/testApi', testApi);
app.use('/api/signup', signupRouter);
app.use('/api/login', loginRouter);
app.use('/api/encryptfile', encryptFileRouter);
app.use('/api/encrypttext', encryptTextRouter);
app.use('/api/decrypt', decryptRouter);
app.use('/api/datalist', dataListRouter);

// Catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// Error handler
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  
  res.status(err.status || 500);
  res.json({ error: res.locals.message }); // Send JSON response for error
});

// Export the app for use in server.js or index.mjs
export default app;
