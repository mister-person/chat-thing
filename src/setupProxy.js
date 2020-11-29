const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  console.log("asdf");
  app.use(
    '/chat',
    createProxyMiddleware({
      ws: true,
      target: 'http://localhost:3001',
      changeOrigin: true,
    })
  );
};
