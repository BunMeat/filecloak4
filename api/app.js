require('dotenv').config();
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const cors = require('cors');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var testApi = require('./routes/testApi');
var signupRouter = require('./routes/signup');
var loginRouter = require('./routes/login');
var encryptFileRouter = require('./routes/encryptFile');
var encryptTextRouter = require('./routes/encryptText');
var decryptRouter = require('./routes/decrypt');
var dataListRouter = require('./routes/getDataList')
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors({
  origin: 'http://localhost:3000', // Allow requests from your React app
}));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/testApi', testApi);
app.use('/signup', signupRouter);
app.use('/login', loginRouter);
app.use('/encryptfile', encryptFileRouter);
app.use('/encrypttext', encryptTextRouter);
app.use('/decrypt', decryptRouter);
app.use('/datalist', dataListRouter);

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
  res.render('error');
});

const PORT = 4000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;