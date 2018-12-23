var http = require("http");
var fs = require("fs");
var path = require("path");
var mime = require("mime");
var cache = {};

//response代表请求http servser 的res
function send404(response){
	response.writeHead(404,{'Content-Type':'text/plain'})
	response.write('Error 404:resourse not found');
	response.end();
}
//返回文件
function sendFile(response,filePath,fileContents){
	//获取filePath的目的是为了知道这个文件类型是什么
	response.writeHead(200,{'content-type':mime.lookup(path.basename(filePath))});
	response.end(fileContents);
}

//提供静态文件服务
function serveStatic(response,cache,absPath){
	if(cache[absPath]){
		sendFile(response,absPath,cache[absPath]);
	}else{
		fs.exists(absPath,function(exists){
			if(exists){
				fs.readFile(absPath,function(err,data){
					if(err){
						send404(response);
					}else{
						cache[absPath] = data;
						sendFile(response,absPath,data);
					}
				})
			}else{
				send404(response)
			}
		})
	}
}

var server = http.createServer(function(request,response,next){
	var filePath = "";
	if(request.url=="/"){
		filePath = "./public/index.html"
	}else{
		filePath = "./public"+request.url;
	}
	serveStatic(response,cache,filePath);
})


server.listen(3000,function(){
	console.log("server listening on port 3000")
});

var chatServer = require('./lib/chat_server');
chatServer.listen(server);
