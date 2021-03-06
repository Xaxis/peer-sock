# peer-sock

Version 1.0.0

## Summary

WebRTC and socket.io framework for easily managing p2p data channel communications.

Simply put, peer-sock allows you to make peer-to-peer data channel communications over the web using [WebRTC](http://www.w3.org/TR/webrtc/)
and [socket.io](http://http://socket.io/).

## Author

Wil Neeley ( [@wilneeley](http://twitter.com/wilneeley) / [github.com](https://github.com/Xaxis) )

## Build/Install

1. `git clone` the repo into your project directory.
2. Make sure [node](https://nodejs.org/) and [npm](https://www.npmjs.com/) are installed.
3. Run `npm install` in your project root.
4. Run `nodemon` or `node server.js`
5. Go to your local web server's path where peer-sock is located (e.g. `localhost/peer-sock/test/test.html`).
6. Open your browsers console log and open up another instance of `test.html`.
7. Modify away to meet your project's data channel needs.

It's worth noting that this implementation of peer-sock uses socket.io for its signaling channel (the bit that 
exchanges communication details) before forming the peer-to-peer connection. `peer-sock.js` allows its signaling channel
implementation to be fully overriden.

### Usage

While peer-sock contains a number of useful methods for forming and managing WebRTC connections their are two methods in
particular that act as the data channel "sugar". 

#### Step 1

To get started building a p2p data channel communication you first create a new PeerSock object. The `socket` 
parameter is the only required configuration option. This is the socket resource created by socket.io.

```javascript
// Create socket.io resource
var socket = io.connect('//localhost:9222');

// Configure new PeerSock object
var PS = PeerSock({
  socket: socket
});
```

There are further parameters that allow you to fully configure and override default WebRTC PeerConnection and 
DataChannel options and event handlers (see more on that below).

#### Step 2

Next we need to initialize our data channel and define how we handle messages received from any connecting peers.

```javascript
PS.newListeningChannel({
  channel_id: 'channel_1',
  onMessage: function(c) {
    console.log(c.data);

    // Send a message back
    c.channel.send(JSON.stringify({
      msg: 'Hello YOURSELF!'
    }));
  }
});
```

We define the name of our data channel and a callback which allows you to respond on the data channel. This method is
responsible for setting up much of the "under-the-hood" WebRTC PeerConnection details.

#### Step 3

And last we start communicating over the data channel.

```javascript
PS.startListeningChannel({
  channel_id: 'channel_1',
  client_id: self.client_id,        // Client socket id from server    
  peer_id: peer.peer_id             // Peer socket id from server
});
```

The `startListeningChannel` method requires the `channel_id` or name of the data channel to use and the peer and client
socket ids (provided by socket.io and our server.js backend). Calling this method will establish a peer connection and
build the data channel. Once the channel is created you can send data to a peer using the `sendOnChannel` method.

```javascript
setTimeout(function() {
  PS.sendOnChannel('channel_1', JSON.stringify({msg: 'Hello Peer!'}));
}, 2000);
```

Note that sending with `sendOnChannel` requires that the channel has been initialized and has a `readyState` property
value of `open`. A better way to send on the data channel with a guarantee that it's ready is to do the following:

```javascript
PS.startListeningChannel({
  channel_id: 'channel_1',
  client_id: self.client_id,
  peer_id: peer.peer_id

  // Send message to peer
  onOpen: function(c) {
  
    // Send first message to peer
    c.channel.send(JSON.stringify({
      msg: 'Hello Peer!'
    }));
  },
  
  // Handle response from peer
  onMessage: function(c) {
    console.log(c.data);
  }
});
```

The `onOpen` callback is where we send any data we want to the peer we're connecting to. The `onMessage` callback 
defines what we do when/if the peer responds over a given data channel. The `startListeningChannel` method can 
additionally be passed `onClose` and `onError` event handlers.

### Advanced Usage

Coming soon.

## Examples

See `test/test.html`.

