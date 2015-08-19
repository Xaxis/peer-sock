# peer-sock

## Summary

WebRTC and socket.io framework for easily managing p2p data channel communications.

Simply put, peer-sock allows you to make peer-to-peer data channel communications over the web. Using WebRTC and 
[socket.io](http://http://socket.io/) you can build your own p2p app rapidly.

## Author

Wil Neeley ( [@wilneeley](http://twitter.com/wilneeley) / [github.com](https://github.com/Xaxis) )

## Build/Install

1. `git clone` the repo into your project directory.
2. Make sure [node](https://nodejs.org/) and [npm](https://www.npmjs.com/) are installed.
3. Run `npm install` in your project root.
4. Run `nodemon` or `node server.js`
5. Go to your local web server's path where peer-sock is located (e.g. `localhost/peer-sock/test/test.html`).
6. Open your browsers console log and open up another instance of `test.html`.
7. Modify away to meet your projects needs.

It's worth noting that this implementation of peer-sock uses socket.io for its signaling channel (the bit that 
exchanges communication details) before forming the peer-to-peer connection. `peer-sock.js` allows its signaling channel
implementation to be fully overriden.

### Usage

While `peer-sock` contains a number of useful methods for forming and managing WebRTC connections their are two methods
that act as the data channel "sugar".

#### Step 1

To get started building a p2p data channel communication you first create a new PeerSock object. The `socket` 
parameter is the only required configuration option. This is the socket resource created by socket.io.

```javascript
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
  client_id: self.client_id,
  peer_id: peer.peer_id,

  // Send message to peer
  send: function(c) {

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

The `startListeningChannel` method requires the `channel_id` or name of the data channel to use, the peer and client
socket ids (provided by socket.io and our server.js backend), and a couple of callbacks to get started.

The `send` callback is where we send any data we want to the peer we're connecting to (though you don't have to send 
anything to connect and form the data channel). The `onMessage` callback defines what we do when/if the peer responds
over a given data channel.

## Examples

See `test/test.html`.

