(function() {

  // Build socket, register ready, receive client registration confirmation
  var socket = io.connect('//localhost:9222');
  socket.emit('register', {ready: true});

  // Socket is ready
  socket.on('ready', function( self ) {

    // Create a PeerSock object
    var PS = PeerSock({
      socket: socket,
      debug: false
    });

    // Initialize new peer connection w/ data channel
    // onMessage is used to receive peer data and additionally send data back on the same channel
    PS.newListeningChannel({
      client_id: self.client_id,
      channel_id: 'channel_1',
      onMessage: function(c) {
        console.log(c.data);

        // Send message back to peer
        c.channel.send(JSON.stringify({
          msg: 'Hello Peer YOURSELF!'
        }));
      }
    });

    // Listen for new peers
    socket.on('peer', function( peer ) {
      if (self.client_id != peer.peer_id) {

        // ...
        PS.startListeningChannel({
          channel_id: 'channel_1',
          client_id: self.client_id,
          peer_id: peer.peer_id,
          onOpen: function(c) {

            // Send first message to peer
            c.channel.send(JSON.stringify({
              msg: 'Hello Peer!'
            }));
          },
          onMessage: function(c) {
            console.log(c.data);
          }
        });
      }
    });
  });

}());


