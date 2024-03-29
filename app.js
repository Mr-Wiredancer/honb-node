var express = require('express');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var util = require('util');

var WAITERS = {};

var routes = require('./routes/index');
var users = require('./routes/users');

var SHOPS = [
  {
    y: 113.31745, z:23.13436,
    title: 'HonB天河店',
    addr: '广州市天河区'
  },
  {
    y: 113.45632, x:23.09639,
    title: 'HonB黄埔店',
    addr: '广州市黄埔区'
  },
  {
    y: 113.892, x: 22.56052,
    title: 'HonB宝安店',
    addr: '深圳市宝安区'
  },
  {
    y: 113.93732, x: 22.48694,
    title: 'HonB蛇口店',
    addr: '深圳市蛇口区'
  },
  {
    y: 113.74643, x: 23.01631,
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
            name: '会员卡',
            "sub_button": [
              {
                type: 'click',
                name: '我的会员卡',
                key: 'INFO'
              },
              {
                type: 'view',
                name: '爱心计划',
                url: 'http://dx-honb.herokuapp.com/counter'
              },
              {
                type: 'view',
                name: '测试oauth',
                url: 'https://open.weixin.qq.com/connect/oauth2/authorize?appid='+APPID+'&redirect_uri='+encodeURIComponent('http://dx-honb.herokuapp.com/code')+'&response_type=code&scope=snsapi_base&state=a#wechat_redirect'
              }

            ]
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
        // 'url': util.format("http://apis.map.qq.com/uri/v1/marker?marker=coord:%d,%d;title:%s;addr:%s&coord_type=1", newCopy[i].x, newCopy[i].y, newCopy[i].title, newCopy[i].addr)
        'url': util.format("http://api.map.baidu.com/marker?location=%d,%d&title=%s&content=%s&output=html&src=东西科技|honb助手", newCopy[i].x, newCopy[i].y, newCopy[i].title, newCopy[i].addr)
      });
    }

    return shops;
}

var parse = function(content){
  var re = /^(.+)(\/|\uFF0F)(.+)$/g;
  var result = re.exec(content);
  return result? [result[1], result[3]] : null;
};

var requestBind = function(openid, memberid, phoneno, success, failure){
  //TODO: dummy
  success();
};

var checkBind = function(openid, success, failure){
  //TODO: dummy
  failure();
}

app.use('/', routes);
app.use('/users', users);
app.get('/counter', function(req, res){
  res.render('counter', {});
});

app.get('/code', function(req, res){
  console.log(req.query);
  requestify.get('https://api.weixin.qq.com/sns/oauth2/access_token?appid='+ APPID+'&secret='+APPSECRET+'&code='+req.query.code+'&grant_type=authorization_code').then(function(response){
      console.log(response.getBody());

  });
  res.send();
});

app.get('/weixin', wechatAuth(TOKEN));

app.post('/weixin', [wechatHelper(APPID, APPSECRET, TOKEN)], function(req, res){
  var msg = req.wechatMessage;

  if ( (msg.isScanAfterSubscribeEvent() && msg.EventKey === '1') || (msg.isScanBeforeSubscribeEvent() && msg.EventKey === 'qrscene_1')){
    //TODO: 爱心计划


  } else if( msg.isText() && WAITERS[msg.FromUserName]){
    var result = parse(msg.Content);
    if (!result){
      msg.sendResponseMessage(req, res, 'text', {
        'content': '您输入的格式不对。正确的格式应该是:\n会员卡号/手机号码'
      });
    }else{
      var openid = msg.FromUserName
        , memberid = result[0]
        , cellno = result[1];

      requestBind(openid, memberid, cellno, function(){
        //TODO: SUCESS CALLBACK
        msg.sendResponseMessage(req, res, 'text', {
          'content': '你的微信号已经成功绑定红贝缇会员卡！'
        });

        delete WAITERS[msg.FromUserName];
      }, function(){
        //TODO: FAIL CALLBACK

      });

    }
  } else if ( msg.isClickEvent() && msg.EventKey==='INFO' ){
    checkBind(msg.FromUserName, function(){
      //TODO: SUCCESS


    }, function(){
      //FAILURE
      msg.sendResponseMessage(req, res, 'text', {
        'content':'您还未绑定红贝缇会员卡，请输入您的红贝缇会员卡号和手机来绑定，中间用"/"隔开。例如: 1234567890/15914233333'
      });
      WAITERS[msg.FromUserName] = 1;


    });

      
  } else if (msg.isClickEvent() && msg.EventKey === 'LOCATION'){
  //   msg.sendResponseMessage(req, res, 'text', {
  //     content: '要搜索你附近的HonB门店，请在微信右下角点击［＋］后发送［位置］给我吧～'
  //   });
  // } else if(msg.isLocation()){
    // var x = parseFloat(msg['Location_Y']), y = parseFloat(msg['Location_X']); //腾讯地图跟微信的坐标信息貌似反过来了
    //TODO:
    console.log(util.format("%j", getShops(22, 113)));

    msg.sendResponseMessage(req, res, 'news',
      getShops(22, 113)
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

app.listen(80);

module.exports = app;
