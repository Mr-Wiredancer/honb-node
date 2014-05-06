var express = require('express');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var util = require('util');

var routes = require('./routes/index');
var users = require('./routes/users');

var TOKEN = 'DXHACKERS';
var nochat = require('nochat')
    , WechatMessage = nochat.WechatMessage
    , wechatAuth = nochat.wechatAuth
    , wechatHelper = nochat.wechatHelper;

var app = express()
   , APPID = 'wx536ca9a0d796f541'
   , APPSECRET = '1dccd67b37964c19952eca8d46d25aa5'
   , ISMENUSET = false
   , requestify = require('requestify');

var MENUDATA = {
    button: [
        {
            type: 'click',
            name: '门店位置',
            key: "LOCATION"
        },
        {
            type: 'view',
            name: '新品展示',
            url: 'http://item-displaying.herokuapp.com'
        },
        {
            type: 'click',
            name: '会员卡',
            key: 'MEMBERSHIP'
        }
    ]
};

 //定时更新Access Token
var updateAccessToken = function(){
  requestify.get('https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid='+APPID+'&secret='+APPSECRET).then(function(response){
      var token = response.getBody()['access_token'];
      if (token){
        app.set('ACCESSTOKEN', token);

        if (!ISMENUSET){
          //set menu
          requestify.post('https://api.weixin.qq.com/cgi-bin/menu/create?access_token='+token, MENUDATA).then(function(res){
            //TODO: do nothing for now
            ISMENUSET = true;
          });
        }
      }
      console.log("TOKEN: "+token);
  });
};

 app.set('ACCESSTOKEN', '');
 updateAccessToken();
 setInterval(updateAccessToken, 7100*1000);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');


app.use(favicon());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);

app.get('/weixin', wechatAuth(TOKEN));

app.post('/weixin', [wechatHelper(APPID, APPSECRET, TOKEN)], function(req, res){
    req.wechatMessage.sendResponseMessage(req, res, 'text', util.format('%j', req.wechatMessage));
});

/// catch 404 and forwarding to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
