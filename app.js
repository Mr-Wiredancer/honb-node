var express = require('express');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var util = require('util');

var routes = require('./routes/index');
var users = require('./routes/users');

var SHOPS = [
  {
    x: 113.31745, y:23.13436,
    title: 'HonB天河店',
    addr: '广州市天河区'
  },
  {
    x: 113.45632, y:23.09639,
    title: 'HonB黄埔店',
    addr: '广州市黄埔区'
  },
  {
    x: 113.892, y: 22.56052,
    title: 'HonB宝安店',
    addr: '深圳市宝安区'
  },
  {
    x: 113.93732, y: 22.48694,
    title: 'HonB蛇口店',
    addr: '深圳市蛇口区'
  },
  {
    x: 113.74643, y: 23.01631,
    title: 'HonB东莞店',
    addr: '东莞市'
  }
];

var usersRequested = {};

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

var getShops = function(x, y){
    var shops = [{
       "title":"HonB门店，总有一个在你身边",
       "description":"抠鼻屎",
       "picurl":"https://encrypted-tbn3.gstatic.com/images?q=tbn:ANd9GcTIdQiHqKv2zU383NrKsvOJdDV_sjizpcdyQDd50NNrg_juiHo0"
    }];

    var newCopy = SHOPS.slice();
    newCopy.sort(function(loca, locb){
      var result1 = Math.pow(loca.x-x, 2) + Math.pow(loca.y - y, 2)
        , result2 = Math.pow(locb.x-x, 2) + Math.pow(locb.y - y, 2);

      return result1-result2;
    });

    for (var i = 0; i<newCopy.length; i++){
      shops.push({
        'title': newCopy[i].title, 
        'url': util.format("http://apis.map.qq.com/uri/v1/marker?marker=coord:%d,%d;title:%s;addr:%s&coord_type=1", newCopy[i].x, newCopy[i].y, newCopy[i].title, newCopy[i].addr)
      });
    }

    return shops;
}

app.use('/', routes);
app.use('/users', users);

app.get('/weixin', wechatAuth(TOKEN));

app.post('/weixin', [wechatHelper(APPID, APPSECRET, TOKEN)], function(req, res){
  var msg = req.wechatMessage;

  if (msg.isClickEvent() && msg.EventKey === 'LOCATION'){
    msg.sendResponseMessage(req, res, 'text', {
      content: '要搜索你附近的HonB门店，请在微信右下角点击［＋］后发送［位置］给我吧～'
    });
  } else if(msg.isLocation()){
    var x = parseFloat(msg['Location_Y']), y = parseFloat(msg['Location_X']); //腾讯地图跟微信的坐标信息貌似反过来了
    //TODO:
    msg.sendResponseMessage(req, res, 'news',
      getShops(x, y)
    );
  } 

  res.send('');
  // req.wechatMessage.sendResponseMessage(req, res, 'text', {content:util.format('%j', req.wechatMessage)});
  
})

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
