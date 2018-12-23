var socketio = require("socket.io");
var io;
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};

exports.listen = function(server){
	io = socketio.listen(server);//设置socket.io服务器搭载在已有的http服务器上
	io.set('log level',1);
	io.sockets.on("connection",function(socket){
		guestNumber = assignGuestName(socket,guestNumber,nickNames,namesUsed);//创建用户名
		joinRoom(socket,"Lobby");//连接之后默认进入房间lobby
		handleMessageBroadcasting(socket,nickNames);
		handleNameChangeAttempts(socket,nickNames,namesUsed);
		handleRoomJoining(socket);
		socket.on("rooms",function(){
			socket.emit("rooms",io.sockets.manager.rooms);//获取可用的房间io.socket.manager.rooms
		})
		handleClientDisconnection(socket,nickNames,namesUsed)
	})
}

function assignGuestName(socket, guestNumber, nickNames, namesUsed) {
  var name = 'Guest' + guestNumber;
  nickNames[socket.id] = name;
  socket.emit('nameResult', {
    success: true,
    name: name
  });
  namesUsed.push(name);
  return guestNumber + 1;
}

function joinRoom(socket, room) {
  socket.join(room);
  currentRoom[socket.id] = room;
  socket.emit('joinResult', {room: room});
  socket.broadcast.to(room).emit('message', {
    text: nickNames[socket.id] + ' has joined ' + room + '.'
  });

  var usersInRoom = io.sockets.clients(room);//获取当前在这个房间内的用户 
  if (usersInRoom.length > 1) {
    var usersInRoomSummary = 'Users currently in ' + room + ': ';
    for (var index in usersInRoom) {
      var userSocketId = usersInRoom[index].id;
      if (userSocketId != socket.id) {
        if (index > 0) {
          usersInRoomSummary += ', ';
        }
        usersInRoomSummary += nickNames[userSocketId];
      }
    }
    usersInRoomSummary += '.';
    socket.emit('message', {text: usersInRoomSummary});
  }
}

function handleMessageBroadcasting(socket){
	//发送消息广播
	socket.on("message",function(message){
		console.log("4/")
		socket.broadcast.to(message.room).emit("message",{
			text:nickNames[socket.id]+":"+message.text
		})
	})
}

function handleRoomJoining(socket){
	socket.on("join",function(room){
		socket.leave(currentRoom[socket.id]);
		joinRoom(socket,room.newRoom)
	})
}

function handleClientDisconnection(socket){
	socket.on("disconnect",function(){
		var nameIndex = nickNames[socket.id];
		namesUsed.splice(nameIndex,1);
		delete nickNames[socket.id];
	})
}

//改名
function handleNameChangeAttempts(socket,nickNames,nameUsed){
	socket.on("nameAttempt",function(name){
		if(name.indexOf("Guest") == 0){
			socket.emit("nameResult",{
				success:false,
				message:'Names cannot begin with Guest'
			})
		}else{
			if(namesUsed.indexOf(name)==-1){
				var previousName = nickNames[socket.id];
				var previousNameIndex = namesUsed.indexOf(previousName);
				namesUsed.push(name);
				namesUsed.splice(previousNameIndex,1);
				nickNames[socket.id] = name;
				socket.emit("nameResult",{
					success:true,
					name:name
				});
			}else{
				socket.emit("nameResult",{
					success:false,
					message:"That name is already in use."
				})
			}
		}
	})
}

