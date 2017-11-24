const wiki = require("wikijs").default;
const http = require("http");

function requestHandler(request, response) {
//   console.log(request.url.slice(1)));
   wiki().page(request.url.slice(1)).then(function(page) {
      page.html().then(function(res) {
	 response.end(res);
      });
   }).catch(function() {
      response.end('No page found');
   });
}


const server = http.createServer(requestHandler);

server.listen(8181, function(err) {
   if (err) {
      console.log(err)
   }
   console.log('listening...');
});
