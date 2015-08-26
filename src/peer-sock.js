/**
 * PeerSock is a library for WebRTC data channel management.
 * See documentation: https://github.com/Xaxis/peer-sock
 *
 * @param options {Object}
 * @param options.debug {Boolean}                   Debugging flag
 * @param options.rtc_config {Object}               Peer connection configuration
 * @param options.rtc_options {Object}              Peer connection options
 * @param options.rtc_handlers {Object}             Peer connection event handlers
 * @param options.dc_config {Object}                Data channel configuration
 * @param options.dc_handlers {Object}              Data channel event handlers
 * @param options.signal.send {Function}            Signaling channel send method
 * @param options.signal.onmessage {Function}       Signaling channel message listener
 * @param options.errorHandler {Function}           Generic error handler
 * @returns {*|Object|void}
 */
var PeerSock = function peerSock( options ) {
  options = options || {};
  options.rtc_handlers = options.rtc_handlers || {};
  options.dc_handlers = options.dc_handlers || {};
  options.signal = options.signal || {};
  return Object.assign(Object.create({}), {

    // PeerConnection object (one per PeerSock object)
    pc: null,

    // Reference to created data channels
    channels: {},

    // Debuf flag
    debug: options.debug || false,

    // Shims
    PeerConnection: window.mozRTCPeerConnection || window.webkitRTCPeerConnection || window.RTCPeerConnection,
    IceCandidate: window.mozRTCIceCandidate || window.RTCIceCandidate || window.RTCIceCandidate,
    SessionDescription: window.mozRTCSessionDescription || window.RTCSessionDescription,
    getUserMedia: navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia,

    // RTCConfiguration
    rtc_config: options.rtc_config || {
      iceServers: [
        {url: "stun:23.21.150.121"},
        {url: "stun:stun.l.google.com:19302"}
      ]
    },

    // RTC Options
    rtc_options: options.rtc_options || {
      optional: [
        {DtlsSrtpKeyAgreement: true}
      ]
    },

    // RTC Default Handlers
    rtc_handlers: {
      onaddstream: options.rtc_handlers.onaddstream || function(e) {
        if (this.PeerSock.debug) console.log('PeerSock.rtc_handlers.onaddstream::', e);
      },
      ondatachannel: options.rtc_handlers.ondatachannel || function(e) {
        if (this.PeerSock.debug) console.log('PeerSock.rtc_handlers.ondatachannel::', e);
      },
      onicecandidate: options.rtc_handlers.onicecandidate || function(e) {
        if (this.PeerSock.debug) console.log('PeerSock.rtc_handlers.onicecandidate::', e);
        if (e.candidate == null) return;
        var
          self          = this,
          candidate     = e.candidate,
          client_id     = this.PeerSock.client_id,
          peer_id       = this.PeerSock.peer_id,
          signal_id     = 'PeerSock_IceCandidate' + client_id + peer_id;

        // Listen for and then set ice candidates from peer
        this.PeerSock.signal.onmessage(signal_id, function(candidateMessage) {
          self.PeerSock.pc.addIceCandidate(new self.PeerSock.IceCandidate(candidateMessage.message));
        });

        // Send ice candidate to peer
        this.PeerSock.signal.send(signal_id, peer_id, client_id, {
          candidate: candidate.candidate,
          sdpMLineIndex: candidate.sdpMLineIndex
        });


        // Nullify handler
        this.onicecandidate = null;
      },
      oniceconnectionstatechange: options.rtc_handlers.oniceconnectionstatechange || function(e) {
        if (this.PeerSock.debug) console.log('PeerSock.rtc_handlers.oniceconnectionstatechange::', e);
      },
      onidentityresult: options.rtc_handlers.onidentityresult || function(e) {
        if (this.PeerSock.debug) console.log('PeerSock.rtc_handlers.onidentityresult::', e);
      },
      onidpassertionerror: options.rtc_handlers.onidpassertionerror || function(e) {
        if (this.PeerSock.debug) console.log('PeerSock.rtc_handlers.onidpassertionerror::', e);
      },
      onidpvalidationerror: options.rtc_handlers.onidpvalidationerror || function(e) {
        if (this.PeerSock.debug) console.log('PeerSock.rtc_handlers.onidpvalidationerror::', e);
      },
      onnegotiationneeded: options.rtc_handlers.onnegotiationneeded || function(e) {
        if (this.PeerSock.debug) console.log('PeerSock.rtc_handlers.onnegotiationneeded::', e);
      },
      onpeeridentity: options.rtc_handlers.onpeeridentity || function(e) {
        if (this.PeerSock.debug) console.log('PeerSock.rtc_handlers.onpeeridentity::', e);
      },
      onremovestream: options.rtc_handlers.onremovestream || function(e) {
        if (this.PeerSock.debug) console.log('PeerSock.rtc_handlers.onremovestream::', e);
      },
      onsignalstatechange: options.rtc_handlers.onsignalstatechange || function(e) {
        if (this.PeerSock.debug) console.log('PeerSock.rtc_handlers.onsignalstatechange::', e);
      }
    },

    // DC Configuration
    dc_config: options.dc_config || {
      ordered: true,
      reliable: true
    },

    // DC Handlers
    dc_handlers: {
      onopen: options.dc_handlers.onopen || function(e) {
        if (this.PeerSock.debug) console.log('PeerSock.dc_handlers.onopen::', e);
      },
      onerror: options.dc_handlers.onerror || function(e) {
        if (this.PeerSock.debug) console.log('PeerSock.dc_handlers.onerror::', e);
      },
      onmessage: options.dc_handlers.onmessage || function(e) {
        if (this.PeerSock.debug) console.log('PeerSock.dc_handlers.onmessage::', e);
      },
      onclose: options.dc_handlers.onclose || function(e) {
        if (this.PeerSock.debug) console.log('PeerSock.dc_handlers.onclose::', e);
      }
    },

    // Signaling
    signal: {
      socket: options.socket,

      /**
       * Sends a message to a target peer handler.
       *
       * @param handler_id {String}   Listening handler name to target set with 'onmessage'
       * @param peer_id {String}      Target peer to send message to
       * @param client_id {String}    The id of the sending client
       * @param message {Object}      The message object to send
       */
      send: options.signal.send || function( handler_id, peer_id, client_id, message ) {
        this.socket.emit('MessageToPeer', {
          handler_id: handler_id,
          peer_id: peer_id,
          client_id: client_id,
          message: message
        });
      },

      /**
       * Receives a message from a peer listening on a handler.
       *
       * @param handler {String}      The name of the handler
       * @param callback {Function}   The callback to execute
       */
      onmessage: options.signal.onmessage || function( handler, callback ) {
        this.socket.on(handler, function(message) {
          callback(message);
        })
      }
    },

    /**
     * Generic overridable error handler.
     *
     * @param err {String}        Message to log
     */
    errorHandler: options.errorHandler || function( err ) {
      console.log(err);
    },

    /**
     * Creates a new peer connection object and attaches event handlers while updating the PeerSock's internal
     * reference with the newly created peer connection object.
     *
     * @param options {Object}
     * @param options.rtc_config {Object}       RTC configuration overrides
     * @param options.rtc_options {Object}      RTC options overrides
     * @param options.rtc_handlers {Object}     RTC event handler overrides
     * @returns {Object}
     */
    newPeerConnection: function( options ) {
      options = options || {};
      var
        pc              = new this.PeerConnection(options.rtc_config || this.rtc_config, options.rtc_options || this.rtc_options),
        handlers        = options.rtc_handlers || {},
        rtc_handlers    = {};

      // Override default handlers and set handler on connection object
      for (var handler in this.rtc_handlers) {
        rtc_handlers[handler] = handlers[handler] || this.rtc_handlers[handler];
        pc[handler] = rtc_handlers[handler];
      }

      // Add PeerSock reference to peer connection object
      pc.PeerSock = this;

      return this.pc = pc;
    },


    /**
     * Creates a new data channel on an existing connection object and attaches event handlers while adding a reference
     * to the data channel on the PeerSock objects data channel object.
     *
     * @param options {Object}
     * @param options.channel_id {String}       Identity string (arbitrary channel name)
     * @param options.connection {Object}       Peer connection object to use
     * @param options.dc_handlers {Object}      DataChannel event handler overrides
     * @returns {Object}
     */
    newDataChannel: function( options ) {
      var
        self            = this,
        pc              = options.connection || this.pc,
        handlers        = options.dc_handlers || {},
        dc_handlers     = {},

      // Generate unique channel id
        id              = function() {
          var id_gen = Math.floor(Math.random() * (10000 - 1));
          if (id_gen in self.channels) {
            id();
          } else {
            return id_gen;
          }
        }(),

      // Create data channel and store reference
        channel         = this.channels[options.channel_id] = {
          channel: pc.createDataChannel(id, this.dc_config)
        };

      // Extend default handlers
      for (var handler in this.dc_handlers) {
        dc_handlers[handler] = handlers[handler] || this.dc_handlers[handler];
        channel.channel[handler] = dc_handlers[handler];
      }

      // Add PeerSock reference to data channel object
      channel.channel.PeerSock = this;

      return this.getDataChannel(options.channel_id);
    },

    /**
     * Returns a data channel stored on the PeerSock.channels object.
     *
     * @param channel_id {String}       The channel name the channel was created with.
     * @returns {*}
     */
    getDataChannel: function( channel_id ) {
      return this.channels[channel_id];
    },

    /**
     * A wrapper around peer connection object's setRemoteDescription.
     *
     * @param pc {Object}               Peer connection object to use
     * @param sdp {Object}              SDP message object to use
     * @param callback {Function}       Callback to execute
     */
    setRemoteDescription: function( pc, sdp, callback ) {
      pc.setRemoteDescription(new this.SessionDescription(sdp), function() {
        if (callback) callback(pc, sdp);
      }, this.errorHandler);
    },

    /**
     * A wrapper around peer connection object's createClientOffer.
     *
     * @param pc {Object}               Peer connection object to use
     * @param callback {Function}       Callback to execute
     */
    createClientOffer: function( pc, callback ) {
      var
        self        = this;
      pc.createOffer(function(offer) {
        pc.setLocalDescription(offer, function() {
          if (callback) callback(offer);
        }, self.errorHandler);
      }, this.errorHandler);
    },

    /**
     * A wrapper around peer connection object's answerPeerOffer.
     *
     * @param pc {Object}               Peer connection object to use
     * @param offer {Object}            SDP offer object
     * @param callback {Function}       Callback to execute
     */
    answerPeerOffer: function( pc, offer, callback ) {
      var
        self        = this;
      pc.setRemoteDescription(new this.SessionDescription(offer), function() {
        pc.createAnswer(function(answer) {
          pc.setLocalDescription(answer);
          if (callback) callback(answer);
        }, self.errorHandler);
      }, this.errorHandler);
    },

    /**
     * Handles connection negotiation and creates a new connection while defining a data channel event listener.
     *
     * @param options {Object}
     * @param options.channel_id {String}         Identity string (arbitrary channel name)
     * @param options.onMessage {Function}        Callback to execute on data channel's onmessage event
     */
    newListeningChannel: function( options ) {
      var
        self        = this;

      // Peers listen for offers/answers
      this.signal.onmessage(options.channel_id, function(message) {

        // SDP description
        var sdp = message.message;

        // Respond to offers
        if (sdp.type == 'offer') {

          // Build a peer connection w/ dc listener
          self.newPeerConnection({
            rtc_handlers: {
              ondatachannel: function(e) {

                // Attach channel message handler
                e.channel.onmessage = function(o) {
                  if (options.onMessage) {
                    options.onMessage.call(this, {
                      channel: e.channel,
                      message: message,
                      data: o.data
                    });
                  }
                };
              }
            }
          });

          // Reference socket ids (reverse for inverse signaling)
          self.client_id = message.peer_id;
          self.peer_id = message.client_id;

          // Send peer answer
          self.answerPeerOffer(self.pc, sdp, function(answer) {
            self.signal.send(options.channel_id, message.peer_id, message.client_id, answer);
          });
        }

        // Set remote description with answer
        else if (sdp.type == 'answer') {
          self.setRemoteDescription(self.pc, sdp);
        }
      });
    },

    /**
     * Creates a corresponding data channel and sends an initial message to peer while defining how to respond to any
     * messages sent back.
     *
     * @param options {Object}
     * @param options.channel_id {String}       The channel id to use to create data channel
     * @param options.client_id {String}        Socket id of the client
     * @param options.peer_id {String}          Socket id of the peer
     */
    startListeningChannel: function( options ) {
      var
        self        = this,
        init        = this.pc ? true : false,
        identity    = function() {};

      // Create peer connection
      if (!init) this.newPeerConnection();

      // Create datachannel
      this.newDataChannel({
        channel_id: options.channel_id,
        connection: self.pc,
        dc_handlers: {
          onopen: function(e) {
            (options.onOpen || identity).call(this, {
              channel: self.getDataChannel(options.channel_id).channel,
              event: e
            });
          },
          onmessage: function(e) {
            (options.onMessage || identity).call(this, {
              channel: self.getDataChannel(options.channel_id).channel,
              data: e.data,
              event: e
            });
          },
          onclose: function(e) {
            (options.onClose || identity).call(this, {
              channel: self.getDataChannel(options.channel_id).channel,
              event: e
            });
          },
          onerror: function(e) {
            (options.onError || identity).call(this, {
              channel: self.getDataChannel(options.channel_id).channel,
              event: e
            });
          }
        }
      });

      // Send connection offer to peer & reference socket ids
      this.client_id = options.client_id;
      this.peer_id = options.peer_id;

      // Send peer offer
      if (!init) {
        this.createClientOffer(this.pc, function(offer) {
          self.signal.send(options.channel_id, options.peer_id, options.client_id, offer);
        });
      }
    },

    /**
     * Sends data on a previously established data channel
     * @param channel_id {String}       The id of the channel to send on
     * @param data {Data}               The data to send to peer
     */
    sendOnChannel: function( channel_id, data ) {
      var
        channel       = this.getDataChannel(channel_id).channel;

      // Send data on open channel
      if (channel.readyState == 'open') {
        channel.send(data);
      }
    }
  });
};
