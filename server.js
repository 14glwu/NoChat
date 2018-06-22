var express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    users = [];     //存连接到该服务器的用户名称
    session = require('express-session');
    cookieParser = require('cookie-parser');

//specify the html we will use
app.use('/', express.static(__dirname + '/www'));
//下面几行，用户长时间没操控页面，要刷新页面，从而导致他掉线（服务器中删除这个user），但目前还没做出来
app.use(cookieParser());
app.use(session({
     secret: '12345',
     name: 'connect.sid',
     cookie: {maxAge: 30000 },
     resave: false,
     saveUninitialized: true,
}));
app.use(function (req, res, next) {
    console.log(req.session.cookie);
});


server.listen(8090);
//server.listen(process.env.PORT || 3000);//publish to heroku
//server.listen(process.env.OPENSHIFT_NODEJS_PORT || 3000);//publish to openshift

//socket部分
io.sockets.on('connection', function(socket) {  //此处回调的socket是指当前连接到服务器的那个客户端
     //昵称设置
    socket.on('login', function(nickname) {
        if (users.indexOf(nickname) > -1) {
            socket.emit('nickExisted');
        } else {
            //socket.userIndex = users.length;
            socket.nickname = nickname;         //将其作为一个属性存到当前socket变量中
            users.push(nickname);               //将这个昵称压入users数组
            socket.emit('loginSuccess');        //通知前端登陆成功，前端接收到这个成功消息后将灰色遮罩层移除显示聊天界面。
            //向所有连接到服务器的客户端发送当前登陆用户的昵称 
            //io表示服务器整个socket连接，所以代码io.sockets.emit('foo')表示所有人都可以收到该事件,最后一个参数'login'表示这个人是登录，不是离开
            io.sockets.emit('system', nickname, users.length, 'login');
        };
    });
    //断开连接的事件
    socket.on('disconnect', function() {
        if (socket.nickname != null) {
            users.splice(users.indexOf(socket.nickname), 1);
            socket.broadcast.emit('system', socket.nickname, users.length, 'logout');   //通知除自己以外的所有人
        }
    });
    //new message get
    socket.on('postMsg', function(msg, color) {
        socket.broadcast.emit('newMsg', socket.nickname, msg, color);
    });
    //接收用户发来的图片
    socket.on('img', function(imgData, color) {
         //通过一个newImg事件分发到除自己外的每个用户
        socket.broadcast.emit('newImg', socket.nickname, imgData, color);
    });
});
