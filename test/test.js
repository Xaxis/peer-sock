(function() {

  // Build socket, register ready, receive client registration confirmation
  var socket = io.connect('//localhost:9222');
  socket.emit('register', {ready: true});

  // PeerSocket object placeholder
  var PS1 = null;

  // Socket is ready
  socket.on('ready', function( self ) {

    // STEP 1: Configure a new PeerSock object
    PS1 = PeerSock({
      socket: socket,
      debug: false
    });

    // STEP 2: Initialize new peer connection w/ data channel
    PS1.newListeningChannel({
      channel_id: 'channel_1',

      // Handle message from peer
      onMessage: function(c) {
        console.log(c.data);

        // Send a message back
        c.channel.send(JSON.stringify({
          msg: 'Right back at ya channel 1!'
        }));
      }
    });

    // Server notifies of new peers and sends their id
    socket.on('peer', function( peer ) {
      if (self.client_id != peer.peer_id) {

        // STEP 3: Begin communications
        PS1.startListeningChannel({
          channel_id: 'channel_1',
          client_id: self.client_id,
          peer_id: peer.peer_id,

          // Send message to peer
          onOpen: function(c) {

            // Send first message to peer
            c.channel.send(JSON.stringify({
              msg: 'Hello Peer channel 1!'
            }));
          },

          // Handle response from peer
          onMessage: function(c) {
            console.log(c.data);
          }
        });

        // Send another message a few seconds later
        setTimeout(function() {
          //PS1.sendOnChannel('channel_1', JSON.stringify({msg: 'test'}));
        }, 3000);

      }
    });
  });

}());


