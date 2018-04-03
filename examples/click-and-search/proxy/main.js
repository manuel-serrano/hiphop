const wiki = require("wikijs").default;
// const http = require("http");

// function requestHandler(request, response) {
//    console.log(request.url, request.url.slice(1));
//    wiki().page(request.url.slice(1)).then(function(page) {
//       page.html().then(function(res) {
// 	 response.end(res);
//       });
//    }).catch(function() {
//       response.end('Page not found');
//    });
// }

// const server = http.createServer(requestHandler);

// server.listen(8181, function(err) {
//    if (err) {
//       console.log(err)
//    }
//    console.log('listening...');
// });


const express = require('express');
const app = express();

app.get('/:word', (req, res) => {
   res.setHeader('Content-Type', 'text/plain');
   setTimeout(() => res.end('foo'), 50);
   // wiki().page(req.params.word).then(function(page) {
   //    page.html().then(function(result) {
   // 	 res.end(result);
   //    });
   // }).catch(function() {
   //    res.end('Page not found');
   // });
});

app.listen(8181);
