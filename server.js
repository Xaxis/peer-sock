var
  _                   = require('lodash'),
  io                  = require('socket.io'),
  express             = require('express'),
  port                = 9222,
  app                 = express(),
  hosts               = {},
  server              = null;

// Trust X-Forwarded-* header fields
app.enable('trust proxy');

// Initialize server & socket.io
server = app.listen(port);
io = io.listen(server, {log: false});

// Connection handlers
io.sockets.on('connection', function(socket) {

  /**
   * Listen on request to register a client.
   */
  socket.on('register', function(msg) {

    // Register peer client as ready
    if (msg.ready && !(socket.id in hosts)) {
      hosts[socket.id] = {
        socket: socket,
        client_id: socket.id
      };

      // Build registration object
      hosts[socket.id].init = {
        client_id: socket.id
      };

      // Send registration to client
      socket.emit('ready', hosts[socket.id].init);
    }

    // Alert new peers
    for (var socket_id in hosts) {
      hosts[socket_id].socket.emit('peer', {peer_id: socket.id});
    }
  });

  /**
   * Listen on request to deregister client.
   */
  socket.on('disconnect', function() {
    delete hosts[socket.id];
  });

  /**
   * Listen on request to send data message to target peer.
   *
   * @param messageObject {Object}
   * @param messageObject.peer_id     Socket ID of target peer to send message to
   * @param messageObject.client_id   Socket ID of peer sending the message
   * @param messageObject.handler_id  Name of listening 'onmessage' callback
   */
  socket.on('MessageToPeer', function( messageObject ) {
    var
      target_peer   = null,
      handler       = messageObject.handler_id;

    if (messageObject.peer_id in hosts) {
      target_peer = hosts[messageObject.peer_id].socket;
      target_peer.emit(handler, _.extend(messageObject, {
        client_id: messageObject.peer_id,
        peer_id: messageObject.client_id
      }));
    }
  });

});
